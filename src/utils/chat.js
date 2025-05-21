import { MODULE_SHORT } from "../module/const.js";
import { MODULE_MIDI } from "../module/integration.js";
import { TEMPLATE } from "../module/templates.js";
import { ActivityUtility } from "./activity.js";
import { CoreUtility } from "./core.js";
import { DialogUtility } from "./dialog.js";
import { LogUtility } from "./log.js";
import { RenderUtility } from "./render.js";
import { ROLL_STATE, ROLL_TYPE, RollUtility } from "./roll.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

/**
 * Enumerable of identifiers for different message types that can be made.
 * @enum {String}
 */
export const MESSAGE_TYPE = {
    ROLL: "roll",
    USAGE: "usage",
}

/**
 * Utility class to handle binding chat cards for use by the module.
 */
export class ChatUtility {
    /**
     * Process a given chat message, adding module content and events to it.
     * Does nothing if the message is not the correct type.
     * @param {ChatMessage} message The chat message to process.
     * @param {JQuery} html The object data for the chat message.
     */
    static async processChatMessage(message, html) {
        if (!message || !html) {
            return;
        }

        if (!message.flags || Object.keys(message.flags).length === 0) {
            return;
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_VANILLA_ENABLED) && !message.flags[MODULE_SHORT]) {
            _processVanillaMessage(message);
            await $(html).addClass("rsr-hide");
        }

        if (!message.flags[MODULE_SHORT] || !message.flags[MODULE_SHORT].quickRoll) {
            return;
        }

        const type = ChatUtility.getMessageType(message);

        // Hide the message if we haven't yet finished processing RSR content
        if (!message.flags[MODULE_SHORT].processed) {
            await $(html).addClass("rsr-hide");

            if (type == ROLL_TYPE.ACTIVITY && message.isAuthor)
            {
                if (CoreUtility.hasModule(MODULE_MIDI)) {
                    const activityType = ChatUtility.getActivityType(message);
                    if (activityType == ROLL_TYPE.ATTACK || activityType == ROLL_TYPE.ABILITY_SAVE) {
                        message.flags[MODULE_SHORT].processed = true;
                    } else {
                        ActivityUtility.runActivityActions(message);
                    }  
                } else {
                    ActivityUtility.runActivityActions(message);
                }                
            }

            return;
        }

        if (game.dice3d && game.dice3d.isEnabled() && message._dice3danimating)
        {
            await $(html).addClass("rsr-hide");
            await game.dice3d.waitFor3DAnimationByMessageID(message.id);
        }

        const content = $(html).find('.message-content');

        if (content.length === 0) {
            await $(html).removeClass("rsr-hide");
            ui.chat.scrollBottom();
            return;
        }
        
        // This will force dual rolls on non-item messages, since this is the only place we can catch this before it is displayed.
        if (message.isAuthor && SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_ROLL_MULTIROLL) && !ChatUtility.isMessageMultiRoll(message)) {
            await _enforceDualRolls(message);

            if (message.flags[MODULE_SHORT].dual) {
                ChatUtility.updateChatMessage(message, {
                    flags: message.flags,
                    rolls: message.rolls
                });

                return;
            }
        }

        await _injectContent(message, type, content);

        if (SettingsUtility.getSettingValue(SETTING_NAMES.OVERLAY_BUTTONS_ENABLED)) {
            // Setup hover buttons when the message is actually hovered(for optimisation).
            let hoverSetupComplete = false;
            content.hover(async () => {
                if (!hoverSetupComplete) {
                    LogUtility.log("Injecting overlay hover buttons")
                    hoverSetupComplete = true;
                    await _injectOverlayButtons(message, content);
                    _onOverlayHover(message, content);
                }
            });
        }

        if (message.flags[MODULE_SHORT].processed) {
            await $(html).removeClass("rsr-hide");
        }
        
        ui.chat.scrollBottom();
    }

    /**
     * Updates a given chat message, saving changes to the database.
     * @param {ChatMessage} message The chat message to update.
     * @param {Object} update The object data for the message update.
     */
    static async updateChatMessage(message, update = {}, context = {}) {
        if (message instanceof ChatMessage) {
            await message.update(update, context);
        }
    }

    static getMessageType(message) {
        return message.flags.dnd5e?.messageType === MESSAGE_TYPE.USAGE 
            ? ROLL_TYPE.ACTIVITY 
            : message.flags.dnd5e?.messageType === MESSAGE_TYPE.ROLL 
                ? (message.flags.dnd5e?.roll?.type ??  null)
                : null;
    }

    static getActivityType(message) {
        return message.flags.dnd5e?.activity.type;
    }

    static getActorFromMessage(message) {
        let actor = null;
        if (message.speaker.token) {
            const token = game.scenes.get(message.speaker.scene).tokens.get(message.speaker.token);
            actor = token?.actor;
        } else if (message.speaker.actor) {
            actor = game.actors.get(message.speaker.actor);
        }

        return actor;
    }

    static isMessageMultiRoll(message) {
        return (message.flags[MODULE_SHORT].advantage || message.flags[MODULE_SHORT].disadvantage || message.flags[MODULE_SHORT].dual
            || (message.rolls[0] instanceof CONFIG.Dice.D20Roll && message.rolls[0].options.advantageMode !== CONFIG.Dice.D20Roll.ADV_MODE.NORMAL)) ?? false;
    }

    static isMessageCritical(message) {
        return message.flags[MODULE_SHORT].isCritical ?? false;
    }
}

/**
 * Handles hover begin events on the given html/jquery object.
 * @param {ChatMessage} message The chat message to process.
 * @param {JQuery} html The object to handle hover begin events for.
 * @private
 */
function _onOverlayHover(message, html) {
    const hasPermission = game.user.isGM || message?.isAuthor;
    const isItem =  message.flags.dnd5e?.use !== undefined;

    html.find('.rsr-overlay').show();
    html.find('.rsr-overlay-multiroll').toggle(hasPermission && !ChatUtility.isMessageMultiRoll(message));
    html.find('.rsr-overlay-crit').toggle(hasPermission && isItem && !ChatUtility.isMessageCritical(message));
}

/**
 * Handles hover end events on the given html/jquery object.
 * @param {JQuery} html The object to handle hover end events for.
 * @private
 */
function _onOverlayHoverEnd(html) {
    html.find(".rsr-overlay").attr("style", "display: none;");
}

/**
 * Handles hover begin events on the given html/jquery object.
 * @param {ChatMessage} message The chat message to process.
 * @param {JQuery} html The object to handle hover begin events for.
 * @private
 */
function _onTooltipHover(message, html) {
    const controlled = SettingsUtility._applyDamageToSelected && canvas?.tokens?.controlled?.length > 0;
    const targeted = SettingsUtility._applyDamageToTargeted && game?.user?.targets?.size > 0;

    if (controlled || targeted) {
        html.find('.rsr-damage-buttons').show();
        html.find('.rsr-damage-buttons').removeAttr("style");
    }
}

/**
 * Handles hover end events on the given html/jquery object.
 * @param {JQuery} html The object to handle hover end events for.
 * @private
 */
function _onTooltipHoverEnd(html) {
    html.find(".rsr-damage-buttons").attr("style", "display: none;height: 0px");
}

function _onDamageHover(message, html) {
    const controlled = SettingsUtility._applyDamageToSelected && canvas?.tokens?.controlled?.length > 0;
    const targeted = SettingsUtility._applyDamageToTargeted && game?.user?.targets?.size > 0;

    if (controlled || targeted) {
        html.find('.rsr-damage-buttons-xl').show();
    }
}

function _onDamageHoverEnd(html) {
    html.find(".rsr-damage-buttons-xl").attr("style", "display: none;");
}

/**
 * Adds all manual action button event handlers to a chat card.
 * Note that the actual buttons are created during rendering and not added here.
 * @param {ChatMessage} message The chat message to process.
 * @param {JQuery} html The object to add button handlers to.
 */
function _setupCardListeners(message, html) {
    if (SettingsUtility.getSettingValue(SETTING_NAMES.MANUAL_DAMAGE_MODE) > 0) {
        html.find('.card-buttons').find(`[data-action='rsr-${ROLL_TYPE.DAMAGE}']`).click(async event => {
            await _processDamageButtonEvent(message, event);
        });
    }
    
    if (SettingsUtility.getSettingValue(SETTING_NAMES.DAMAGE_BUTTONS_ENABLED)) {
        html.find('.rsr-damage-buttons button').click(async event => {
            await _processApplyButtonEvent(message, event);
        });

        html.find('.rsr-damage-buttons-xl button').click(async event => {
            await _processApplyTotalButtonEvent(message, event);
        });
    }

    html.find(`[data-action='rsr-${ROLL_TYPE.CONCENTRATION}']`).click(async event => {
        await _processBreakConcentrationButtonEvent(message, event);
    });
}

function _processVanillaMessage(message) {
    message.flags[MODULE_SHORT] = {};
    message.flags[MODULE_SHORT].quickRoll = true;
    message.flags[MODULE_SHORT].processed = true;
    message.flags[MODULE_SHORT].useConfig = false;
}

async function _enforceDualRolls(message) {
    let dual = false;

    for (let i = 0; i < message.rolls.length; i++) {
        if (message.rolls[i] instanceof CONFIG.Dice.D20Roll) {
            message.rolls[i] = await RollUtility.ensureMultiRoll(message.rolls[i]);
            dual = true;
        }
    }

    message.flags[MODULE_SHORT].dual = dual;
}

async function _injectContent(message, type, html) {
    LogUtility.log("Injecting content into chat message");
    const parent = message.getOriginatingMessage();
    message.flags[MODULE_SHORT].displayChallenge = parent?.shouldDisplayChallenge ?? message.shouldDisplayChallenge;
    message.flags[MODULE_SHORT].displayAttackResult = game.user.isGM || (game.settings.get("dnd5e", "attackRollVisibility") !== "none");

    switch (type) {     
        case ROLL_TYPE.DAMAGE:
            // Handle damage enrichers
            if (!message.flags.dnd5e?.item?.id) {
                const enricher = html.find('.dice-roll');
                
                html.parent().find('.flavor-text').text('');
                html.prepend('<div class="dnd5e2 chat-card"></div>');
                html.find('.chat-card').append(enricher);                        

                message.flags[MODULE_SHORT].renderDamage = true;
                message.flags[MODULE_SHORT].isCritical = message.rolls[0]?.isCritical;

                await _injectDamageRoll(message, enricher);

                if (SettingsUtility.getSettingValue(SETTING_NAMES.DAMAGE_BUTTONS_ENABLED)) {                
                    await _injectApplyDamageButtons(message, html);
                }
                enricher.remove();
                break;
            }
        case ROLL_TYPE.ATTACK:
            if (parent && parent.flags[MODULE_SHORT] && message.isAuthor) {
                if (type === ROLL_TYPE.ATTACK) {
                    parent.flags[MODULE_SHORT].renderAttack = true;
                    parent.flags.dnd5e.roll = message.flags.dnd5e?.roll;
                    parent.flags.dnd5e.originatingMessage = parent.id;
                    game.dnd5e.registry.messages.track(parent);
                }

                if (type === ROLL_TYPE.DAMAGE) {
                    parent.flags[MODULE_SHORT].renderDamage = true;
                    parent.flags[MODULE_SHORT].isCritical = message.rolls[0]?.isCritical;
                    parent.flags[MODULE_SHORT].isHealing = message.flags.dnd5e.activity.type === "heal";
                }
                
                // if (game.dice3d && game.dice3d.isEnabled()) {
                //     await CoreUtility.waitUntil(() => !message._dice3danimating);
                // }

                parent.flags[MODULE_SHORT].quickRoll = true;                
                parent.rolls.push(...message.rolls);

                ChatUtility.updateChatMessage(parent, {
                    flags: parent.flags,
                    rolls: parent.rolls,
                    flavor: "vanilla",
                });

                message.flags[MODULE_SHORT].processed = false;
                message.delete();
                return;
            }
            break;
        case ROLL_TYPE.SKILL:
        case ROLL_TYPE.ABILITY_SAVE:
        case ROLL_TYPE.ABILITY_TEST:
        case ROLL_TYPE.DEATH_SAVE:
        case ROLL_TYPE.TOOL:
            if (!message.isContentVisible) {
                return;
            }

            const roll = message.rolls[0];
            roll.options.displayChallenge = message.flags[MODULE_SHORT].displayChallenge;
            roll.options.forceSuccess = message.flags.dnd5e?.roll?.forceSuccess;

            const render = await RenderUtility.render(TEMPLATE.MULTIROLL, { roll, key: type })
            html.find('.dice-total').replaceWith(render);
            html.find('.dice-tooltip').prepend(html.find('.dice-formula'));

            if (message.flags[MODULE_SHORT].isConcentration)
            {
                await _injectBreakConcentrationButton(message, html)
            }
            break;
        case ROLL_TYPE.ACTIVITY:
            if (!message.isContentVisible) {
                return;
            }

            const actions = html.find('.card-buttons');
            
            // Remove any redundant dice roll elements that were added forcefully by dnd5e system
            html.find('.dice-roll').remove();

            if (message.flags[MODULE_SHORT].renderAttack || message.flags[MODULE_SHORT].renderAttack === false) {
                actions.find(`[data-action=rollAttack]`).remove();
                await _injectAttackRoll(message, actions);

                html.find('.rsr-section-attack').append(html.find('.supplement'));
                html.find('.supplement').removeClass('supplement').addClass('rsr-supplement');
            }
            
            if (message.flags[MODULE_SHORT].manualDamage || message.flags[MODULE_SHORT].renderDamage) {
                actions.find(`[data-action=rollDamage]`).remove();
                actions.find(`[data-action=rollHealing]`).remove();
            }

            if (message.flags[MODULE_SHORT].manualDamage) {
                await _injectDamageButton(message, actions);
            }

            if (message.flags[MODULE_SHORT].renderDamage) {
                await _injectDamageRoll(message, actions);
            }

            if (message.flags[MODULE_SHORT].renderFormula) {
                actions.find(`[data-action=rollFormula]`).remove();
                await _injectFormulaRoll(message, actions);
            }

            if (SettingsUtility.getSettingValue(SETTING_NAMES.DAMAGE_BUTTONS_ENABLED)) {
                await _injectApplyDamageButtons(message, html);
            }

            html.find('.dnd5e2.chat-card').not('.activation-card').remove();
            break;
        default:
            break;
    }

    //_setupRerollDice(html);
    _setupCardListeners(message, html);
}

async function _injectAttackRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const roll = message.rolls.find(r => r instanceof CONFIG.Dice.D20Roll);

    if (!roll) return;
    
    RollUtility.resetRollGetters(roll);

    roll.options.displayChallenge = message.flags[MODULE_SHORT].displayAttackResult;
    roll.options.hideFinalAttack = SettingsUtility.getSettingValue(SETTING_NAMES.HIDE_FINAL_RESULT_ENABLED) && !game.actors.get(message.speaker.actor)?.isOwner;

    const render = await RenderUtility.render(TEMPLATE.MULTIROLL, { roll, key: ROLL_TYPE.ATTACK });
    const chatData = await roll.toMessage({}, { create: false });
    const rollHTML = $(await new ChatMessage5e(chatData).renderHTML()).find('.dice-roll');
    rollHTML.find('.dice-total').replaceWith(render);
    rollHTML.find('.dice-tooltip').prepend(rollHTML.find('.dice-formula'));

    if (roll.options.hideFinalAttack) {
        rollHTML.find('.dice-tooltip').find('.tooltip-part.constant').remove();
        rollHTML.find('.dice-formula').text("1d20 + " + CoreUtility.localize(`${MODULE_SHORT}.chat.hide`));
    }    

    const ammo = message.getAssociatedActor().items.get(message.flags[MODULE_SHORT].ammunition)?.name;

    const sectionHTML = $(await RenderUtility.render(TEMPLATE.SECTION,
    {
        section: `rsr-section-${ROLL_TYPE.ATTACK}`,
        title: CoreUtility.localize("DND5E.Attack"),
        icon: "<dnd5e-icon src=\"systems/dnd5e/icons/svg/trait-weapon-proficiencies.svg\"></dnd5e-icon>",
        subtitle: ammo ? `${CoreUtility.localize("DND5E.Item.Property.Ammunition")} - ${ammo}` : undefined
    }));
    
    $(sectionHTML).append(rollHTML);
    sectionHTML.insertBefore(html);
}

async function _injectFormulaRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const roll = message.rolls.find(r => r instanceof CONFIG.Dice.BasicRoll);

    if (!roll) return;

    const chatData = await roll.toMessage({}, { create: false });
    const rollHTML = $(await new ChatMessage5e(chatData).renderHTML()).find('.dice-roll');
    rollHTML.find('.dice-tooltip').prepend(rollHTML.find('.dice-formula'));

    const sectionHTML = $(await RenderUtility.render(TEMPLATE.SECTION,
    {
        section: `rsr-section-${ROLL_TYPE.FORMULA}`,
        title: message.flags[MODULE_SHORT].formulaName ?? CoreUtility.localize("DND5E.OtherFormula"),
        icon: "<i class=\"fas fa-dice\"></i>"
    }));
    
    $(sectionHTML).append(rollHTML);
    sectionHTML.insertBefore(html);

}

async function _injectDamageRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const rolls = message.rolls.filter(r => r instanceof CONFIG.Dice.DamageRoll);

    if (!rolls || rolls.length === 0) return;

    const chatData = await CONFIG.Dice.DamageRoll.toMessage(rolls, {}, { create: false });
    const rollHTML = $(await new ChatMessage5e(chatData).renderHTML()).find('.dice-roll');
    rollHTML.find('.dice-tooltip').prepend(rollHTML.find('.dice-formula'));
    rollHTML.find('.dice-result').addClass('rsr-damage');

    const header = message.flags[MODULE_SHORT].isHealing
        ? {            
            section: `rsr-section-${ROLL_TYPE.DAMAGE}`,
            title: CoreUtility.localize("DND5E.Healing"),
            icon: "<dnd5e-icon src=\"systems/dnd5e/icons/svg/damage/healing.svg\"></dnd5e-icon>"
        } 
        : {
            section: `rsr-section-${ROLL_TYPE.DAMAGE}`,
            title: `${CoreUtility.localize("DND5E.Damage")} ${message.flags[MODULE_SHORT].versatile ? "(" + CoreUtility.localize("DND5E.Versatile") + ")": ""}`,
            icon: "<i class=\"fas fa-burst\"></i>",
            subtitle: message.flags[MODULE_SHORT].isCritical ? `${CoreUtility.localize("DND5E.CriticalHit")}!` : undefined,
            critical: message.flags[MODULE_SHORT].isCritical
        }

    const sectionHTML = $(await RenderUtility.render(TEMPLATE.SECTION, header));
    
    $(sectionHTML).append(rollHTML);
    sectionHTML.insertBefore(html);
}

async function _injectDamageButton(message, html) {
    const button = message.flags[MODULE_SHORT].isHealing
        ? {
            title: CoreUtility.localize("DND5E.Healing"),
            icon: "<dnd5e-icon src=\"systems/dnd5e/icons/svg/damage/healing.svg\"></dnd5e-icon>"
        } 
        : {
            title: CoreUtility.localize("DND5E.Damage"),
            icon: "<i class=\"fas fa-burst\"></i>"
        }

    const render = await RenderUtility.render(TEMPLATE.BUTTON, 
    { 
        action: ROLL_TYPE.DAMAGE,
        ...button
    });

    html.prepend($(render));
}

async function _injectBreakConcentrationButton(message, html) {
    const button = {
        title: CoreUtility.localize("DND5E.ConcentrationBreak"),
        icon: "<i class=\"fas fa-xmark\"></i>"
    }

    const render = await RenderUtility.render(TEMPLATE.BUTTON, 
    { 
        action: ROLL_TYPE.CONCENTRATION,
        ...button
    });

    html.append($(render).addClass('rsr-concentration-buttons'));
}

/**
 * Adds buttons to a chat card for applying rolled damage/healing to tokens.
 * @param {ChatMessage} message The chat message for which content is being injected.
 * @param {JQuery} html The object to add overlay buttons to.
 * @private
 */
async function _injectApplyDamageButtons(message, html) {
    const render = await RenderUtility.render(TEMPLATE.DAMAGE_BUTTONS, {});

    const tooltip = html.find('.rsr-damage .dice-tooltip .tooltip-part');

    if (tooltip.length > 1) {
        tooltip.append($(render));
    }

    const total = html.find('.rsr-damage');
    const renderXL = $(render);
    renderXL.removeClass('rsr-damage-buttons');
    renderXL.addClass('rsr-damage-buttons-xl');
    renderXL.find('.rsr-indicator').remove();
    total.append(renderXL);

    if (!SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_SHOW_BUTTONS)) {
        // Enable Hover Events (to show/hide the elements).
        tooltip.each((i, el) => {        
            $(el).find('.rsr-damage-buttons').attr("style", "display: none;height: 0px");
            $(el).hover(_onTooltipHover.bind(this, message, $(el)), _onTooltipHoverEnd.bind(this, $(el)));
        })

        _onDamageHoverEnd(total);
        total.hover(_onDamageHover.bind(this, message, total), _onDamageHoverEnd.bind(this, total));
    }
}

/**
 * Adds all overlay buttons to a chat card.
 * @param {ChatMessage} message The chat message for which content is being injected.
 * @param {JQuery} html The object to add overlay buttons to.
 * @private
 */
async function _injectOverlayButtons(message, html) {
    await _injectOverlayRetroButtons(message, html);
    await _injectOverlayHeaderButtons(message, html);    
    
    // Enable Hover Events (to show/hide the elements).
    _onOverlayHoverEnd(html);
    html.hover(_onOverlayHover.bind(this, message, html), _onOverlayHoverEnd.bind(this, html));
}


/**
 * Adds overlay buttons to a chat card for retroactively making a roll into a multi roll or a crit.
 * @param {ChatMessage} message The chat message for which content is being injected.
 * @param {JQuery} html The object to add overlay buttons to.
 * @private
 */
async function _injectOverlayRetroButtons(message, html) {
    const overlayMultiRoll = await RenderUtility.render(TEMPLATE.OVERLAY_MULTIROLL, {});

    html.find('.rsr-multiroll .dice-total').append($(overlayMultiRoll));

    // Handle clicking the multi-roll overlay buttons
    html.find(".rsr-overlay-multiroll div").click(async event => {
        await _processRetroAdvButtonEvent(message, event);
    });
    
    const overlayCrit = await RenderUtility.render(TEMPLATE.OVERLAY_CRIT, {});

    html.find('.rsr-damage .dice-total').append($(overlayCrit));

    // Handle clicking the multi-roll overlay buttons
    html.find(".rsr-overlay-crit div").click(async event => {
        await _processRetroCritButtonEvent(message, event);
    });
}

 /**
 * Adds overlay buttons to a chat card header for quick-repeating a roll.
 * @param {ChatMessage} message The chat message for which content is being injected.
 * @param {JQuery} html The object to add overlay buttons to.
 * @private
 */
 async function _injectOverlayHeaderButtons(message, html) {

 }

/**
 * Processes and handles a manual damage button click event.
 * @param {ChatMessage} message The chat message for which an event is being processed.
 * @param {Event} event The originating event of the button click.
 * @private
 */
async function _processDamageButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    message.flags[MODULE_SHORT].manualDamage = false
    message.flags[MODULE_SHORT].renderDamage = true;  

    await ActivityUtility.runActivityAction(message, ROLL_TYPE.DAMAGE);
}

async function _processBreakConcentrationButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const actor = ChatUtility.getActorFromMessage(message);

    if (actor) {
        const ActiveEffect5e = CONFIG.ActiveEffect.documentClass;
        ActiveEffect5e._manageConcentration(event, actor);
    }
}

/**
 * Processes and handles an apply damage/healing/temphp button click event.
 * @param {ChatMessage} message The chat message for which an event is being processed.
 * @param {Event} event The originating event of the button click.
 * @private
 */
async function _processApplyButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const action = button.dataset.action;
    const multiplier = button.dataset.multiplier;
    const dice = $(button).closest('.tooltip-part').find('.dice');

    if (action !== "rsr-apply-damage" && action !== "rsr-apply-temp") {
        return;
    }

    const targets = CoreUtility.getCurrentTargets();

    if (targets.size === 0) {
        return;
    }

    const isTempHP = action === "rsr-apply-temp";
    const damage = _getApplyDamage(message, dice, multiplier);

    await Promise.all(Array.from(targets).map(async t => {
        const target = t.actor;        
        return isTempHP ? await target.applyTempHP(damage.value) : await target.applyDamage([ damage ], { multiplier });
    }));

    setTimeout(() => {
        if (canvas.hud.token._displayState && canvas.hud.token._displayState !== 0) {
            canvas.hud.token.render();
        }
    }, 50);
}

async function _processApplyTotalButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const action = button.dataset.action;
    const multiplier = Number(button.dataset.multiplier);

    if (action !== "rsr-apply-damage" && action !== "rsr-apply-temp") {
        return;
    }

    const targets = CoreUtility.getCurrentTargets();

    if (targets.size === 0) {
        return;
    }
    
    const isTempHP = action === "rsr-apply-temp";
    const damages = [];

    const children = $(button).closest('.dice-roll').find('.rsr-damage .dice-tooltip .tooltip-part .dice');

    children.each((i, el) => {
        damages.push(_getApplyDamage(message, $(el), multiplier));
    })

    await Promise.all(Array.from(targets).map(async t => {
        const target = t.actor;        
        return isTempHP 
            ? await target.applyTempHP(damages.reduce((accumulator, currentValue) => accumulator + currentValue.value, 0)) 
            : await target.applyDamage(damages, { multiplier: Math.abs(multiplier) });
    }));

    setTimeout(() => {
        if (canvas.hud.token._displayState && canvas.hud.token._displayState !== 0) {
            canvas.hud.token.render();
        }
    }, 50);
}

function _getApplyDamage(message, dice, multiplier) {
    const total = dice.find('.total')
    const value = parseInt(total.find('.value').text());
    const type = total.find('.label').text().toLowerCase();

    const properties = new Set(message.rolls.find(r => r instanceof CONFIG.Dice.DamageRoll)?.options?.properties ?? []);
    return { value: value, type: multiplier < 0 ? 'healing' : type, properties: properties };
}

/**
 * Processes and handles a retroactive advantage/disadvantage button click event.
 * @param {ChatMessage} message The chat message for which an event is being processed.
 * @param {Event} event The originating event of the button click.
 * @private
 */
async function _processRetroAdvButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const action = button.dataset.action;
    const state = button.dataset.state;
    const key = $(button).closest('.rsr-multiroll')[0].dataset.key;

    if (action === "rsr-retro") {
        if (SettingsUtility.getSettingValue(SETTING_NAMES.CONFIRM_RETRO_ADV)) {        
            const dialogOptions = {
                width: 100,
                top: event ? event.clientY - 50 : null,
                left: window.innerWidth - 510
            }
    
            const target = state === ROLL_STATE.ADV ? CoreUtility.localize("DND5E.Advantage") : CoreUtility.localize("DND5E.Disadvantage");
            const confirmed = await DialogUtility.getConfirmDialog(CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroAdv`, { target }), dialogOptions);
    
            if (!confirmed) return;
        }
        
        message.flags[MODULE_SHORT].advantage = state === ROLL_STATE.ADV;
        message.flags[MODULE_SHORT].disadvantage = state === ROLL_STATE.DIS;

        const roll = message.rolls.find(r => r instanceof CONFIG.Dice.D20Roll);
        await RollUtility.upgradeRoll(roll, state);

        if (key !== ROLL_TYPE.ATTACK && key !== ROLL_TYPE.TOOL_CHECK) {
            message.flavor += message.rolls[0].hasAdvantage 
                ? ` (${CoreUtility.localize("DND5E.Advantage")})` 
                : ` (${CoreUtility.localize("DND5E.Disadvantage")})`;
        }

        ChatUtility.updateChatMessage(message, { 
            flags: message.flags,
            rolls: message.rolls,
            flavor: message.flavor
        });

        if (!game.dice3d || !game.dice3d.isEnabled()) {
            CoreUtility.playRollSound();
        }
    }
}

/**
 * Processes and handles a retroactive critical roll button click event.
 * @param {ChatMessage} message The chat message for which an event is being processed.
 * @param {Event} event The originating event of the button click.
 * @private
 */
async function _processRetroCritButtonEvent(message, event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const action = button.dataset.action;

    if (action === "rsr-retro") {
        if (SettingsUtility.getSettingValue(SETTING_NAMES.CONFIRM_RETRO_CRIT)) {        
            const dialogOptions = {
                width: 100,
                top: event ? event.clientY - 50 : null,
                left: window.innerWidth - 510
            }
    
            const confirmed = await DialogUtility.getConfirmDialog(CoreUtility.localize(`${MODULE_SHORT}.chat.prompts.retroCrit`), dialogOptions);
    
            if (!confirmed) return;
        }
        
        message.flags[MODULE_SHORT].isCritical = true;

        const original = message.rolls;

        const rolls = message.rolls.filter(r => r instanceof CONFIG.Dice.DamageRoll);
        const crits = await ActivityUtility.getDamageFromMessage(message);

        if (CoreUtility.hasModule(MODULE_MIDI)) {
            message.rolls = original;
        }

        for (let i = 0; i < rolls.length; i++) {
            const baseRoll = rolls[i];
            const critRoll = crits[i]

            for (const [j, term] of baseRoll.terms.entries()) {
                if (!(term instanceof foundry.dice.terms.Die)) {
                    continue;
                }

                critRoll.terms[j].results.splice(0, term.results.length, ...term.results);
            }

            RollUtility.resetRollGetters(critRoll);
            message.rolls[message.rolls.indexOf(baseRoll)] = critRoll;
        }

        await CoreUtility.tryRollDice3D(crits);

        ChatUtility.updateChatMessage(message, {
            flags: message.flags,
            rolls: message.rolls
        });

        if (!game.dice3d || !game.dice3d.isEnabled()) {
            CoreUtility.playRollSound();
        }
    }
}

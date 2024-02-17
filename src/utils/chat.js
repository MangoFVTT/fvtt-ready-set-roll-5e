import { MODULE_SHORT } from "../module/const.js";
import { MODULE_DSN } from "../module/integration.js";
import { TEMPLATE } from "../module/templates.js";
import { CoreUtility } from "./core.js";
import { ITEM_TYPE, ItemUtility } from "./item.js";
import { LogUtility } from "./log.js";
import { RenderUtility } from "./render.js";
import { ROLL_STATE, ROLL_TYPE, RollUtility } from "./roll.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

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
            $(html).addClass("rsr-hide");
        }

        if (!message.flags[MODULE_SHORT] || !message.flags[MODULE_SHORT].quickRoll) {
            return;
        }

        const type = ChatUtility.getMessageType(message);

        // Hide the message if we haven't yet finished processing RSR content
        if (!message.flags[MODULE_SHORT].processed) {
            $(html).addClass("rsr-hide");
        }

        const content = $(html).find('.message-content');

        if (content.length === 0) {
            return;
        }
        
        // This will force dual rolls on non-item messages, since this is the only place we can catch this before it is displayed.
        if (SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_ROLL_MULTIROLL) && !ChatUtility.isMessageMultiRoll(message)) {
            await _enforceDualRolls(message);
            return;
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
            $(html).removeClass("rsr-hide");
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
        return message.flags.dnd5e?.roll?.type ?? (message.flags.dnd5e?.use ? ROLL_TYPE.ITEM : null);
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

    html.find('.rsr-overlay').show();
    html.find('.rsr-overlay-multiroll').toggle(hasPermission && !ChatUtility.isMessageMultiRoll(message));
    html.find('.rsr-overlay-crit').toggle(hasPermission && !ChatUtility.isMessageCritical(message));
}

/**
 * Handles hover end events on the given html/jquery object.
 * @param {JQuery} html The object to handle hover end events for.
 * @private
 */
function _onOverlayHoverEnd(html) {
    html.find(".rsr-overlay").attr("style", "display: none;");
}

function _onTooltipHover(message, html) {
    const hasPermission = game.user.isGM || message?.isAuthor;
    const controlled = SettingsUtility._applyDamageToSelected && canvas?.tokens?.controlled?.length > 0;
    const targeted = SettingsUtility._applyDamageToTargeted && game?.user?.targets?.size > 0;

    if (hasPermission && (controlled || targeted)) {
        html.find('.rsr-damage-buttons').show();
        html.find('.rsr-damage-buttons').removeAttr("style");
        html.parent()[0].style.height = `${html.parent()[0].scrollHeight}px`
    }
}

/**
 * Handles hover end events on the given html/jquery object.
 * @param {JQuery} html The object to handle hover end events for.
 * @private
 */
function _onTooltipHoverEnd(html) {
    html.find(".rsr-damage-buttons").attr("style", "display: none;height: 0px");

    if (html.parent()[0].style.height !== '0px') {        
        html.parent().removeAttr("style");
        html.parent()[0].style.height = `${html.parent()[0].scrollHeight}px`
    }
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
}

function _processVanillaMessage(message) {
    message.flags[MODULE_SHORT] = {};
    message.flags[MODULE_SHORT].quickRoll = true;
    message.flags[MODULE_SHORT].processed = true;
    message.flags[MODULE_SHORT].useConfig = false;
}

async function _enforceDualRolls(message) {
    if (message.rolls.length === 0) {
        return;
    }

    for (let i = 0; i < message.rolls.length; i++) {
        if (message.rolls[i] instanceof CONFIG.Dice.D20Roll) {
            message.rolls[i] = await RollUtility.ensureMultiRoll(message.rolls[i]);            
        }
    }

    message.flags[MODULE_SHORT].dual = true;

    await ChatUtility.updateChatMessage(message, { 
        flags: message.flags,
        rolls: message.rolls
    });
}

async function _injectContent(message, type, html) {
    LogUtility.log("Injecting content into chat message");
    const parent = game.messages.get(message.flags.dnd5e?.originatingMessage);

    switch (type) {        
        case ROLL_TYPE.ATTACK:
        case ROLL_TYPE.DAMAGE:
        case ROLL_TYPE.TOOL:
            if (parent && message.isOwner) {
                if (type === ROLL_TYPE.ATTACK) {
                    parent.flags[MODULE_SHORT].renderAttack = true;
                }

                if (type === ROLL_TYPE.DAMAGE) {
                    // Skip if damage enricher
                    if (!message.flags.dnd5e?.roll.itemId) {
                        return;
                    }

                    parent.flags[MODULE_SHORT].renderDamage = true;
                    parent.flags[MODULE_SHORT].versatile = message.flags.dnd5e.roll.versatile ?? false;
                    parent.flags[MODULE_SHORT].isCritical = message.rolls[0]?.isCritical;
                }
                
                if (type === ROLL_TYPE.TOOL) {
                    parent.flags[MODULE_SHORT].renderToolCheck = true;                     
                }
                
                if (game.dice3d) {
                    await CoreUtility.waitUntil(() => !message._dice3danimating);
                }

                parent.flags[MODULE_SHORT].quickRoll = true;
                parent.rolls.push(...message.rolls);

                ChatUtility.updateChatMessage(parent, {
                    flags: parent.flags,
                    rolls: parent.rolls,
                });

                message.flags[MODULE_SHORT].processed = false;
                message.delete();
                return;
            }
        case ROLL_TYPE.SKILL:
        case ROLL_TYPE.ABILITY_SAVE:
        case ROLL_TYPE.ABILITY_TEST:
        case ROLL_TYPE.DEATH_SAVE:
            if (!message.isContentVisible) {
                return;
            }

            const roll = message.rolls[0];
            const render = await RenderUtility.render(TEMPLATE.MULTIROLL, { roll, key: type })
            html.find('.dice-total').replaceWith(render);
            html.find('.dice-tooltip').prepend(html.find('.dice-formula'));
            break;
        case ROLL_TYPE.ITEM:
            const actions = html.find('.card-buttons');

            // Remove any redundant dice roll elements that were added forcefully by dnd5e system
            html.find('.dice-roll').remove();

            if (!CoreUtility.isVisible(message)) {
                const ChatMessage5e = CONFIG.ChatMessage.documentClass;
                const chatData = await (new Roll("0d0")).toMessage({}, {
                    rollMode: game.settings.get("core", "rollMode"),
                    create: false 
                });
                const rollHTML = await new ChatMessage5e(chatData).getHTML();
                html.parent().find('.message-header').replaceWith(rollHTML.find('.message-header'));
                html.replaceWith(rollHTML.find('.message-content'));
                return;
            }

            if (message.flags[MODULE_SHORT].hideSave) {                
                actions.find(`[data-action='${ROLL_TYPE.ABILITY_SAVE}']`).remove();
            }

            if (message.flags[MODULE_SHORT].hideCheck) {                
                actions.find(`[data-action='${ROLL_TYPE.ABILITY_CHECK}']`).remove();
            }

            if (message.flags[MODULE_SHORT].hideProperties) {                
                html.find('.card-footer').remove();
            }

            if (message.flags[MODULE_SHORT].renderAttack || message.flags[MODULE_SHORT].renderAttack === false) {
                actions.find(`[data-action='${ROLL_TYPE.ATTACK}']`).remove();
                await _injectAttackRoll(message, actions);
            }
            
            if (message.flags[MODULE_SHORT].manualDamage || message.flags[MODULE_SHORT].renderDamage) {                
                actions.find(`[data-action='${ROLL_TYPE.DAMAGE}']`).remove();
                actions.find(`[data-action='${ROLL_TYPE.VERSATILE}']`).remove();
            }

            if (message.flags[MODULE_SHORT].manualDamage) {
                await _injectDamageButton(message, actions);
            }

            if (message.flags[MODULE_SHORT].renderDamage) {
                await _injectDamageRoll(message, actions);
            }

            if (SettingsUtility.getSettingValue(SETTING_NAMES.DAMAGE_BUTTONS_ENABLED)) {                
                await _injectApplyDamageButtons(message, html);
            }

            if (message.flags[MODULE_SHORT].renderToolCheck) {
                actions.find(`[data-action='${ROLL_TYPE.TOOL_CHECK}']`).remove();
                await _injectToolCheckRoll(message, actions);
            }

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

    const render = await RenderUtility.render(TEMPLATE.MULTIROLL, { roll, key: ROLL_TYPE.ATTACK });
    const chatData = await roll.toMessage({}, { create: false });   
    const rollHTML = (await new ChatMessage5e(chatData).getHTML()).find('.dice-roll');    
    rollHTML.find('.dice-total').replaceWith(render);
    rollHTML.find('.dice-tooltip').prepend(rollHTML.find('.dice-formula'));

    const ammo = message.flags[MODULE_SHORT].consume;

    const sectionHTML = $(await RenderUtility.render(TEMPLATE.SECTION,
    {
        section: `rsr-section-${ROLL_TYPE.ATTACK}`,
        title: CoreUtility.localize("DND5E.Attack"),
        icon: "<dnd5e-icon src=\"systems/dnd5e/icons/svg/trait-weapon-proficiencies.svg\"></dnd5e-icon>",
        subtitle: ammo ? `${CoreUtility.localize("DND5E.ConsumableAmmo")} - ${ammo}` : undefined
    }));
    
    $(sectionHTML).append(rollHTML);
    sectionHTML.insertBefore(html);

    // Remove and re-add enrichers for hit/miss indication
    const card = html.closest('.chat-message');
    card.find('.evaluation').remove();
    message._enrichAttackTargets(card[0]);
}

async function _injectToolCheckRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const roll = message.rolls.find(r => r instanceof CONFIG.Dice.D20Roll);

    if (!roll) return;

    RollUtility.resetRollGetters(roll);

    const render = await RenderUtility.render(TEMPLATE.MULTIROLL, { roll, key: ROLL_TYPE.TOOL_CHECK });
    const chatData = await roll.toMessage({}, { create: false });
    const rollHTML = (await new ChatMessage5e(chatData).getHTML()).find('.dice-roll');
    rollHTML.find('.dice-total').replaceWith(render);
    rollHTML.find('.dice-tooltip').prepend(rollHTML.find('.dice-formula'));

    const sectionHTML = $(await RenderUtility.render(TEMPLATE.SECTION,
    {       
        section: `rsr-section-${ROLL_TYPE.TOOL}`,
        title: CoreUtility.localize("DND5E.UseItem", { item: message.flags[MODULE_SHORT].name ?? CoreUtility.localize("ITEM.TypeTool") }),
        icon: "<i class=\"fas fa-hammer\"></i>",
    }));
    
    $(sectionHTML).append(rollHTML);
    sectionHTML.insertBefore(html);
}

async function _injectDamageRoll(message, html) {
    const ChatMessage5e = CONFIG.ChatMessage.documentClass;
    const rolls = message.rolls.filter(r => r instanceof CONFIG.Dice.DamageRoll);

    if (!rolls || rolls.length === 0) return;

    const chatData = await CONFIG.Dice.DamageRoll.toMessage(rolls, {}, { create: false });
    const rollHTML = (await new ChatMessage5e(chatData).getHTML()).find('.dice-roll');
    rollHTML.find('.dice-tooltip').prepend(rollHTML.find('.dice-formula'));
    rollHTML.find('.dice-result').addClass('rsr-damage');

    if (message.flags[MODULE_SHORT].context) {
        const tooltip = rollHTML.find('.dice-tooltip .tooltip-part')

        await tooltip.each(async (i, el) => {
            if (message.flags[MODULE_SHORT].context[i] && message.flags[MODULE_SHORT].context[i] !== "") {
                const contextHTML = await RenderUtility.render(TEMPLATE.CONTEXT, { context: message.flags[MODULE_SHORT].context[i]});
                $(el).prepend(contextHTML);
            }
        });
    }

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
    })

    html.prepend($(render));
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
    tooltip.append($(render));

    const total = html.find('.rsr-damage');
    const renderXL = $(render);
    renderXL.removeClass('rsr-damage-buttons');
    renderXL.addClass('rsr-damage-buttons-xl');
    renderXL.find('.rsr-indicator').remove();
    total.append(renderXL);

    if (!SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_SHOW_BUTTONS)) {
        // Enable Hover Events (to show/hide the elements).
        tooltip.each((i, el) => {        
            $(el).find(".rsr-damage-buttons").attr("style", "display: none;height: 0px");
            $(el).hover(_onTooltipHover.bind(this, message, $(el)), _onTooltipHoverEnd.bind(this, $(el)));
        })
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

    await ItemUtility.runItemAction(null, message, ROLL_TYPE.DAMAGE);
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

    if (action !== "rsr-apply-damage" && action !== "rsr-apply-temp") {
        return;
    }

    const targets = CoreUtility.getCurrentTargets();

    if (targets.size === 0) {
        return;
    }

    const isTempHP = action === "rsr-apply-temp";
    const damage = _getApplyDamage(message, button);

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
    const multiplier = button.dataset.multiplier;

    if (action !== "rsr-apply-damage" && action !== "rsr-apply-temp") {
        return;
    }

    const targets = CoreUtility.getCurrentTargets();

    if (targets.size === 0) {
        return;
    }
    
    const isTempHP = action === "rsr-apply-temp";
    const damages = [];

    const children = $(button).closest('.dice-roll')
        .find(`.rsr-damage .dice-tooltip .tooltip-part .rsr-damage-buttons button[data-action="${action}"][data-multiplier="${multiplier}"]`);

    children.each((i, el) => {
        damages.push(_getApplyDamage(message, el));
    })

    await Promise.all(Array.from(targets).map(async t => {
        const target = t.actor;        
        return isTempHP 
            ? await target.applyTempHP(damages.reduce((accumulator, currentValue) => accumulator + currentValue.value, 0)) 
            : await target.applyDamage(damages, { multiplier });
    }));

    setTimeout(() => {
        if (canvas.hud.token._displayState && canvas.hud.token._displayState !== 0) {
            canvas.hud.token.render();
        }
    }, 50);
}

function _getApplyDamage(message, button) {    
    const multiplier = button.dataset.multiplier;
    const dice = $(button).parent().siblings().find('.total')
    const value = parseInt(dice.find('.value').text());
    const type = dice.find('.label').text().toLowerCase();

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

        if (!game.dice3d) {
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
        message.flags[MODULE_SHORT].isCritical = true;

        const rolls = message.rolls.filter(r => r instanceof CONFIG.Dice.DamageRoll);
        const crits = await ItemUtility.getDamageFromCard(message);

        for (let i = 0; i < rolls.length; i++) {
            const baseRoll = rolls[i];
            const critRoll = crits[i]

            for (const [j, term] of baseRoll.terms.entries()) {
                if (!(term instanceof Die)) {
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

        if (!game.dice3d) {
            CoreUtility.playRollSound();
        }
    }
}
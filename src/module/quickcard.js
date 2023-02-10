import { CoreUtility } from "../utils/core.js";
import { LogUtility } from "../utils/log.js";
import { FIELD_TYPE, RenderUtility } from "../utils/render.js";
import { SettingsUtility, SETTING_NAMES } from "../utils/settings.js";
import { MODULE_SHORT } from "./const.js";
import { QuickRoll } from "./quickroll.js";

/**
 * Class that parses a base system card into a module card, with functionality for adding overlay card elements.
 */
export class QuickCard {
    _applyDamageToTargeted;
    _applyDamageToSelected;
    _applyEffectsToTargeted;
    _applyEffectsToSelected;

    constructor (message, html) {
        const applyDamageOption = SettingsUtility.getSettingValue(SETTING_NAMES.APPLY_DAMAGE_TO);
        this._applyDamageToTargeted = applyDamageOption === 1 || applyDamageOption === 2;
        this._applyDamageToSelected = applyDamageOption === 0 || applyDamageOption === 2;

        if (CoreUtility.hasDAE())
        {
            const applyEffectsOption = SettingsUtility.getSettingValue(SETTING_NAMES.APPLY_EFFECTS_TO);
            this._applyEffectsToTargeted = applyEffectsOption === 1 || applyEffectsOption === 2;
            this._applyEffectsToSelected = applyEffectsOption === 0 || applyEffectsOption === 2;
        }

        this.updateBinding(message, html);
    }

    get message() {
		return game.messages.get(this.id);
	}

    /**
	 * Inflates an existing chat message, adding runtime elements and events to it. Does nothing if the message is not the correct type.
	 * @param {ChatMessage} message The chat message to inflate.
	 * @param {JQuery} html The object data for the chat message.
	 */
    async updateBinding(message, html) {
        this.roll = await QuickRoll.fromMessage(message);
        this.speaker = game.actors.get(message.speaker.actor);
        this.id = message.id;

        // Hide Save DCs
        if (!(this.roll?.hasPermission ?? false)) {
            html.find(".hideSave").text(CoreUtility.localize(`${MODULE_SHORT}.chat.hide`));
        }

        this._setupActionButtons(html);

        if (SettingsUtility.getSettingValue(SETTING_NAMES.OVERLAY_BUTTONS_ENABLED)) {
            // Setup hover buttons when the message is actually hovered(for optimisation).
            let hoverSetupComplete = false;
            html.hover(async () => {
                if (!hoverSetupComplete) {
                    hoverSetupComplete = true;
                    await this._setupOverlayButtons(html);
                    this._onHover(html);
                    LogUtility.log("Initialised quick card hover buttons.")
                }
            })
        }
    }

    /**
     * Handles hover begin events on the given html/jquery object.
     * @param {JQuery} html The object to handle hover begin events for.
     * @private
     */
    _onHover(html) {
		const hasPermission = this.roll?.hasPermission ?? false;
        const hasRolledCrit = this.roll?.hasRolledCrit ?? false;
        const isMultiRoll = this.roll?.params?.isMultiRoll ?? true;

		const controlled = this._applyDamageToSelected && canvas?.tokens?.controlled?.length > 0;
        const targeted = this._applyDamageToTargeted && game?.user?.targets?.size > 0;

		html.find(".die-result-overlay-rsr").show();

		// Apply Damage / Augment Crit
		html.find('.multiroll-overlay-rsr').toggle(hasPermission && !isMultiRoll);
		html.find('.crit-button').toggle(hasPermission && !hasRolledCrit);
		html.find('.apply-damage-buttons').toggle(controlled || targeted);
		html.find('.apply-temphp-buttons').toggle(controlled || targeted);
	}

    /**
     * Handles hover end events on the given html/jquery object.
     * @param {JQuery} html The object to handle hover end events for.
     * @private
     */
	_onHoverEnd(html) {
		html.find(".die-result-overlay-rsr").attr("style", "display: none;");
	}

    /**
     * Adds all manual action button event handlers to a chat card.
     * Note that the actual buttons are created during rendering and not added here.
     * @param {JQuery} html The object to add button handlers to.
     */
    _setupActionButtons(html) {        
        if (SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_MANUAL_DAMAGE)) {
            html.find(".rsr-damage-buttons button").click(async evt => {
                await this._processDamageButtonEvent(evt);
            });
        }

        if (CoreUtility.hasDAE() && SettingsUtility.getSettingValue(SETTING_NAMES.APPLY_EFFECTS_ENABLED)) {
            html.find(".rsr-effects-buttons button").click(async evt => {
                await this._processEffectsButtonEvent(evt);
            });
        }
        
        LogUtility.log("Initialised quick card action buttons.")
    }

    /**
     * Adds all overlay buttons to a chat card.
     * @param {JQuery} html The object to add overlay buttons to.
     * @private
     */
    async _setupOverlayButtons(html) {
        await this._setupMultiRollOverlayButtons(html);
        await this._setupDamageOverlayButtons(html);

        // Enable Hover Events (to show/hide the elements).
		this._onHoverEnd(html);
		html.hover(this._onHover.bind(this, html), this._onHoverEnd.bind(this, html));
    }

    /**
     * Adds overlay buttons to a chat card for retroactively making a roll into a multi roll.
     * @param {JQuery} html The object to add overlay buttons to.
     * @private
     */
    async _setupMultiRollOverlayButtons(html) {
        const template = await RenderUtility.renderOverlayMultiRoll();
        const fields = this.roll?.fields ?? [];

        fields.forEach((field, i) => {
            if (field[0] === FIELD_TYPE.CHECK || field[0] === FIELD_TYPE.ATTACK) {
                const element = html.find(`.rsr-dual[data-id=${i}] .dice-row.rsr-totals`);
                element.append($(template));
            }
        });        

        // Handle clicking the multi-roll overlay buttons
        html.find(".multiroll-overlay-rsr button").click(async evt => {
            await this._processRetroButtonEvent(evt);
        });
    }

    /**
     * Adds overlay buttons to a chat card for rolling crit damage, or applying rolled damage/healing to tokens.
     * @param {JQuery} html The object to add overlay buttons to.
     * @private
     */
    async _setupDamageOverlayButtons(html) {
        const template = await RenderUtility.renderOverlayDamage();
        const elements = html.find('.dice-total .rsr-base-die, .dice-total .rsr-extra-die').parents('.dice-row').toArray();

        elements.forEach(element => {
            element = $(element);
            element.append($(template));
        });

        // Handle applying damage/healing via overlay button click events.
		html.find('.apply-damage-buttons button').click(async evt => {
			await this._processApplyButtonEvent(evt, false);
        });
        html.find('.apply-temphp-buttons button').click(async evt => {
			await this._processApplyButtonEvent(evt, true);
        });

        // Handle rolling crit damage
        html.find('.crit-button button').click(async evt => {
			await this._processCritButtonEvent(evt);
        });
    }

    /**
     * Processes and handles a manual damage button click event.
     * @param {Event} event The originating event of the button click.
     * @private
     */
    async _processDamageButtonEvent(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const id = $(button).parents(".rsr-damage-buttons").attr('data-id');
        const action = button.dataset.action;

        if (action === "damage-rsr") {
            if (await this.roll.upgradeToDamageRoll(id)) {
                this._updateQuickCard();
            }
        }
    }

    /**
     * Processes and handles an apply effects button click event.
     * @param {Event} event The originating event of the button click.
     * @private
     */
    async _processEffectsButtonEvent(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const action = button.dataset.rsr;

        if (action === "effects-rsr") {
            const selectTokens = this._applyEffectsToSelected ? canvas.tokens.controlled : [];
            const targetTokens = this._applyEffectsToTargeted ? game.user.targets : [];
            const targets = new Set([...selectTokens, ...targetTokens]);

            window.DAE.doEffects(this.roll.item, true, targets, {
                effectsToApply: this.roll.effectsToApply
            });
        }
    }

    /**
     * Processes and handles a retroactive advantage/disadvantage button click event.
     * @param {Event} event The originating event of the button click.
     * @private
     */
    async _processRetroButtonEvent(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const id = $(button).parents(".rsr-dual").attr('data-id');
        const action = button.dataset.action;

        if (action === "retroroll") {
            const state = button.dataset.state;
            if (await this.roll.upgradeToMultiRoll(id, state)) {
                this._updateQuickCard();
            }
        }
    }

    /**
     * Processes and handles a retroactive crit button click event.
     * @param {Event} event The originating event of the button click.
     * @private
     */
    async _processCritButtonEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const button = event.currentTarget;
        const id = $(button).parents(".rsr-dual").attr('data-id');

        if (await this.roll.upgradeToCrit(id)) {
            this._updateQuickCard();
        }
    }

    /**
     * Processes and handles an apply damage/healing/temphp button click event.
     * @param {Event} event The originating event of the button click. 
     * @param {Boolean} isTempHP Flag that indicates if the value should be applied as damage/healing, or as temporary hp.
     * @private
     */
    async _processApplyButtonEvent(event, isTempHP = false) {
        event.preventDefault();
        event.stopPropagation();

        // Retrieve the proper damage thats supposed to be applied via this set of buttons.
        const modifier = $(event.target).closest("button").attr('data-modifier');
        const damageElement = $(event.target.parentNode.parentNode.parentNode.parentNode);
        let damage = damageElement.find('.rsr-base-die').text();

        if (damageElement.find('.rsr-extra-die').length > 0) {
            const crit = damageElement.find('.rsr-extra-die').text();
            const dialogPosition = {
                x: event.originalEvent.screenX,
                y: event.originalEvent.screenY
            };

            damage = await this._resolveCritDamage(Number(damage), Number(crit), dialogPosition);
        }

        const selectTokens = this._applyDamageToSelected ? canvas.tokens.controlled : [];
        const targetTokens = this._applyDamageToTargeted ? game.user.targets : [];
        const targets = new Set([...selectTokens, ...targetTokens]);

        await Promise.all(Array.from(targets).map( t => {
            const target = t.actor;
            return isTempHP ? target.applyTempHP(damage) : target.applyDamage(damage, modifier);
        }));

        setTimeout(() => {
            if (canvas.hud.token._displayState && canvas.hud.token._displayState !== 0) {
                canvas.hud.token.render();
            }
        }, 50);
    }   

    /**
     * Displays a prompt allowing the user to choose if they want to apply critical damage in a field or not.
     * @param {Number} damage The value of the base damage of a field.
     * @param {Number} crit The value of the crit damage of a field.
     * @param {Object} position A vector indicating the position of the originating event.
     * @returns {Promise<Number>|Number} The resolved final damage value depending on the user's choices.
     * @private
     */
    async _resolveCritDamage(damage, crit, position) {
		if (damage && crit) {
            if (SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_APPLY_CRIT)) {
                return damage + crit;
            }
            else {
                return await new Promise(async (resolve, reject) => {
                    const options = {
                        left: position.x,
                        top: position.y,
                        width: 100
                    };
    
                    const data = {
                        title: CoreUtility.localize(`${MODULE_SHORT}.chat.critPrompt.title`),
                        content: "",
                        buttons: {
                            one: {
                                icon: '<i class="fas fa-check"></i>',
                                label: CoreUtility.localize(`${MODULE_SHORT}.chat.critPrompt.yes`),
                                callback: () => { resolve(damage + crit); }
                            },
                            two: {
                                icon: '<i class="fas fa-times"></i>',
                                label: CoreUtility.localize(`${MODULE_SHORT}.chat.critPrompt.no`),
                                callback: () => { resolve(damage); }
                            }
                        },
                        default: "two"
                    }
    
                    new Dialog(data, options).render(true);
                });
            }
		}

		return damage || crit;
	}

    /**
     * Updates the contents of the quick card with the new setup of quick roll fields.
     */
    async _updateQuickCard() {
        const update = await this.roll.toMessageUpdate();
        this.message.update(update, { diff: true });
    }
}
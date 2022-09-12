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
    constructor (message, html) {
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
    updateBinding(message, html) {
        this.roll = QuickRoll.fromMessage(message);
        this.speaker = game.actors.get(message.speaker.actor);
        this.id = message.id;

        // Setup hover buttons when the message is actually hovered(for optimisation).
        let hoverSetupComplete = false;
        html.hover(async () => {
            if (!hoverSetupComplete) {
                hoverSetupComplete = true;
                await this._setupOverlayButtons(html);
                this._onHover(html);
                LogUtility.log("Hover buttons for quick card initialised.")
            }
        })
    }

    /**
     * Handles hover begin events on the given html/jquery object.
     * @param {JQuery} html The object to handle hover begin events for.
     * @private
     */
    _onHover(html) {
		const hasPermission = this.roll?.hasPermission ?? false;
        const isCrit = this.roll?.isCrit ?? true;
        const isMultiRoll = this.roll?.isMultiRoll ?? true;

		html.find(".die-result-overlay-br").show();

		// Apply Damage / Augment Crit
		const controlled = canvas?.tokens?.controlled?.length > 0;
		html.find('.multiroll-overlay-br').toggle(hasPermission && !isMultiRoll);
		html.find('.crit-button').toggle(hasPermission && !isCrit);
		html.find('.apply-damage-buttons').toggle(controlled);
		html.find('.apply-temphp-buttons').toggle(controlled);
	}

    /**
     * Handles hover end events on the given html/jquery object.
     * @param {JQuery} html The object to handle hover end events for.
     * @private
     */
	_onHoverEnd(html) {
		html.find(".die-result-overlay-br").attr("style", "display: none;");
	}

    /**
     * Adds overlay buttons to a chat card for applying damage/temphp or retroactive advantage/disadvantage/crit.
     * @param {JQuery} html The object to add overlay buttons to.
     */
    async _setupOverlayButtons(html) {
        await this._setupMultiRollOverlayButtons(html);
        await this._setupDamageOverlayButtons(html);

        // Enable Hover Events (to show/hide the elements).
		this._onHoverEnd(html);
		html.hover(this._onHover.bind(this, html), this._onHoverEnd.bind(this, html));
    }

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
        html.find(".multiroll-overlay-br button").click(async evt => {
            await this._processRetroButtonEvent(evt);
        });
    }

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
    }

    async _processRetroButtonEvent(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const id = $(button).parents(".rsr-dual").attr('data-id');
        const action = button.dataset.action;

        if (action === "retroroll") {
            const state = button.dataset.state;
            if (await this.roll.upgradeToMultiRoll(id, state)) {
                const update = await this.roll.toMessageUpdate();
                this.message.update(update, { diff: true });
            }
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

        await Promise.all(canvas.tokens.controlled.map( t => {
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
     * @returns {Number} The resolved final damage value depending on the user's choices.
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
}
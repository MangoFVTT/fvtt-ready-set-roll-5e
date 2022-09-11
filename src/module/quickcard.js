import { CoreUtility } from "../utils/core.js";
import { LogUtility } from "../utils/log.js";
import { RenderUtility } from "../utils/render.js";
import { MODULE_SHORT } from "./const.js";
import { QuickRoll } from "./quickroll.js";

export class QuickCard {
    constructor (message, html) {
        this.updateBinding(message, html);
    }

    get message() {
		return game.messages.get(this.id);
	}

    updateBinding(message, html) {
        console.log(message);

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

    async _setupOverlayButtons(html) {
        const template = await RenderUtility.renderOverlayDamage();
        const elements = html.find('.dice-total .rsr-base-die, .dice-total .rsr-extra-die').parents('.dice-row').toArray();

        elements.forEach(element => {
            element = $(element);
            element.append($(template));
        });

        // Handle applying damage/healing via overlay button click events.
		html.find('.apply-damage-buttons button').click(async evt => {
			await this._processApplyEvent(evt, false);
        });
        html.find('.apply-temphp-buttons button').click(async evt => {
			await this._processApplyEvent(evt, true);
        });

        // Enable Hover Events (to show/hide the elements).
		this._onHoverEnd(html);
		html.hover(this._onHover.bind(this, html), this._onHoverEnd.bind(this, html));
    }

    /**
     * Handles hover begin events on the given html/jquery object.
     * @param {JQuery} html The object to handle hover begin events for.
     * @private
     */
    _onHover(html) {
		const hasPermission = this.roll.hasPermission;
		html.find(".die-result-overlay-br").show();

		// Apply Damage / Augment Crit
		const controlled = canvas?.tokens?.controlled?.length > 0;
		html.find('.multiroll-overlay-br').toggle(hasPermission);
		html.find('.crit-button').toggle(hasPermission);
		html.find('.apply-damage-buttons').toggle(controlled);
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
     * Processes and handles an apply damage/healing/temphp button click event.
     * @param {Event} event The originating event of the button click. 
     * @param {Boolean} isTempHP Flag that indicates if the value should be applied as damage/healing, or as temporary hp.
     * @private
     */
    async _processApplyEvent(event, isTempHP = false) {
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

		return damage || crit;
	}
}
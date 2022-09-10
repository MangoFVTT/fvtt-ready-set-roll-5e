import { LogUtility } from "../utils/log.js";
import { RenderUtility } from "../utils/render.js";

export class QuickCard {
    constructor (message, html) {
        this.updateBinding(message, html);
    }

    get message() {
		return game.messages.get(this.id);
	}

    updateBinding(message, html) {
        console.log(message);

        this.id = message.id;
        this.roll = message.quickRoll;
        this.speaker = game.actors.get(message.speaker.actor);

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

        // Enable Hover Events (to show/hide the elements)
		this._onHoverEnd(html);
		html.hover(this._onHover.bind(this, html), this._onHoverEnd.bind(this, html));
    }

    _onHover(html) {
		const hasPermission = this.roll.hasPermission;
		html.find(".die-result-overlay-br").show();

		// Apply Damage / Augment Crit
		const controlled = canvas?.tokens.controlled.length > 0;
		html.find('.multiroll-overlay-br').toggle(hasPermission);
		html.find('.crit-button').toggle(hasPermission);
		html.find('.apply-damage-buttons').toggle(controlled);
	}

	_onHoverEnd(html) {
		html.find(".die-result-overlay-br").attr("style", "display: none;");
	}
}
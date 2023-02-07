import { MODULE_NAME, MODULE_SHORT } from "../module/const.js";
import { LogUtility } from "./log.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";

/**
 * Utility class with core functions for general use.
 */
export class CoreUtility {
    /**
     * Gets the module version for this module.
     * @returns The module version string.
     */
    static getVersion() {
        return game.modules.get(MODULE_NAME).version;
    }

    /**
     * Shorthand for both game.i18n.format() and game.i18n.localize() depending on whether data is supplied or not.
     * @param {String} key The key string to localize for.
     * @param {object?} data Optional data that if given will do a i18n.format() instead.
     * @returns {String} A localized string (with formatting if needed).
     */
    static localize(key, data = null) {
        if (data) {
            return game.i18n.format(key, data);
        }

        return game.i18n.localize(key);
    }

    /**
     * Checks an event for advantage/disadvantage modifier keys.
     * @param {object} event Event data to check.
     * @returns {number} An advantage mode: -1 is disadvantage, 0 is normal, 1 is advantage. 
     */
    static eventToAdvantage(event = {}) {
        const mode = SettingsUtility.getSettingValue(SETTING_NAMES.ROLL_MODIFIER_MODE);

        switch(mode) {
            case 0:
                return event.shiftKey ? 1 : (event.ctrlKey || event.metaKey ? -1 : 0);
            case 1:
                return event.shiftKey ? -1 : (event.ctrlKey || event.metaKey ? 1 : 0);
            default:
                return 0;
        }
    }

    /**
     * Checks an event for alternate roll modifier key (if the relevant setting is enabled).
     * @param {object} event Event data to check.
     * @returns {Boolean} If the roll should be an alternate one. 
     */
    static eventToAltRoll(event = {}) {
        const altRollEnabled = SettingsUtility.getSettingValue(SETTING_NAMES.ALT_ROLL_ENABLED);

        return event.altKey && altRollEnabled;
    }

    /**
     * Checks a given data object to determine if it is an item or an actor.
     * @param {object} dataObject 
     * @returns {Item | Actor} A tuple containing an item and its actor if given an item, or just the actor otherwise.
     */
    static resolveActorOrItem(dataObject) {
		if (!dataObject) {
            LogUtility.logError("Cannot resolve a null data object as an Actor or an Item.", { ui: false });
			return {};
		}

		if (dataObject instanceof Item) {
			return { item: dataObject, actor: dataObject?.actor };
		}        
        
        if (dataObject instanceof Actor) {
			return { actor: dataObject };
		}

        LogUtility.logError("Failed to resolve data object as an Actor or an Item.", { ui: false });
        return {};
	}

    /**
     * Lock variable to prevent multiple roll sounds from playing simultaneously.
     * This comes into play when rolling multiple quick rolls at a go, since otherwise the sound is deafening.
     * @private
     */
    static _lockRollSound = false;

    /**
     * Gets the default configured dice sound from Foundry VTT config.
     * @returns 
     */
    static getRollSound() {
        let sound = undefined;

        if (!CoreUtility._lockRollSound && SettingsUtility.getSettingValue(SETTING_NAMES.DICE_SOUNDS_ENABLED)) {
            CoreUtility._lockRollSound = true;
            setTimeout(() => CoreUtility._lockRollSound = false, 300);
            
            sound = CONFIG.sounds.dice;
        }

        return { sound }
    }

    /**
     * Gets data about whispers and roll mode for use in rendering messages.
     * @param {*} rollMode 
     * @returns A data package with the current roll mode 
     */
    static getWhisperData(rollMode = null) {
		let whisper = undefined;
		let blind = null;

		rollMode = rollMode || game.settings.get("core", "rollMode");

        if (["gmroll", "blindroll"].includes(rollMode)) {
            whisper = ChatMessage.getWhisperRecipients("GM");
        }

        if (rollMode === "blindroll") {
            blind = true;
        } 
        else if (rollMode === "selfroll") {
            whisper = [game.user.id];
        } 

		return { rollMode, whisper, blind }
	}

    /**
	 * Returns the image to represent the actor. The result depends on selected settings.
	 * @param {Actor} actor
	 */
	static getActorImage(actor) {
		if (!actor) {
            LogUtility.logWarning("Attempted to get an image for a null actor.", { ui: false });
            return null;
        }

		const actorImage = (actor.img && !actor.img.includes("*")) ? actor.img : null;
		const tokenImage = actor.prototypeToken?.texture?.src ? actor.prototypeToken.texture.src : null;

		switch(SettingsUtility.getSettingValue(SETTING_NAMES.DEFAULT_ROLL_ART)) {
			case "actor":
				return actorImage || tokenImage;
			case "token":
				return tokenImage || actorImage;
		}
	}

    /**
     * Retrieves the instance of an actor for the given ID, if possible.
     * Prefer token actors over game.actors to avoid consumables and spells being wrongly depleted.
     * @param {String} id The ID of the actor to attempt to retrieve.
     * @returns {Object} The actor object with the given ID.
     */
	static getActorById(id) {
		let actor = canvas.tokens.placeables.find(t => t.actor?.id === id)?.actor;
		if (!actor) actor = game.actors.get(id);

		return actor;
	}

	/**
     * Retrieves the instance of an actor for the given name, if possible.
     * Prefer token actors over game.actors to avoid consumables and spells being wrongly depleted.
     * @param {String} name The name of the actor to attempt to retrieve.
     * @returns {Object} The actor object with the given name.
     */
	static getActorByName(name) {
		let actor = canvas.tokens.placeables.find(p => p.name === name)?.actor;
		if (!actor) actor = game.actors.find(e => e.name === name);

		return actor;
	}

    /**
     * Ensures that a parameter container has the correct default parameters and values.
     * @param {Object} params The parameter data container to ensure with default parameters.
     * @returns {Object} The ensured parameter data container.
     */
    static ensureQuickRollParams(params) {
        params = foundry.utils.mergeObject(foundry.utils.duplicate(CONFIG[MODULE_SHORT].defaultQuickRollParams), params || {});

        params.isCrit = params.forceCrit || (params.isCrit ?? false);
		params.isFumble = params.forceFumble || (params.isFumble ?? false);
        params.isMultiRoll = params.forceMultiRoll || (params.isMultiRoll ?? false);

        return params;
    }

    /**
     * Attempts to roll 3D dice if the relevant module (Dice So Nice) is installed.
     * @param {Roll} roll The roll object to roll 3D dice for.
     * @returns {Promise<Boolean>} Whether or not 3D dice were actually rolled.
     */
    static async tryRollDice3D(roll) {
        const hasDice = roll.dice.length > 0;

		if (game.dice3d && hasDice) {
			const whisperData = CoreUtility.getWhisperData();
			await game.dice3d.showForRoll(roll, game.user, true, whisperData.whisper, whisperData.blind || false, null, whisperData.speaker);
		}       

		return game.dice3d && hasDice;
    }

    static hasDAE() {
        return game.modules.get("dae")?.active;
    }
}


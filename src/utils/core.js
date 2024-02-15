import { MODULE_NAME, MODULE_SHORT } from "../module/const.js";
import { ITEM_TYPE } from "./item.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

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
                return event.shiftKey ? CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE 
                    : (event.ctrlKey || event.metaKey ? CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE : CONFIG.Dice.D20Roll.ADV_MODE.NORMAL);
            case 1:
                return event.shiftKey ? CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE
                    : (event.ctrlKey || event.metaKey ? CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE  : CONFIG.Dice.D20Roll.ADV_MODE.NORMAL);
            default:
                return CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
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
     * Attempts to roll 3D dice if the relevant module (Dice So Nice) is installed.
     * @param {Roll} rolls The roll objects to roll 3D dice for.
     * @returns {Promise<Boolean>} Whether or not 3D dice were actually rolled.
     */
    static async tryRollDice3D(rolls, messageID = null) {
        rolls = Array.isArray(rolls) ? rolls : [ rolls ];

        const promises = [];
        let hasDice = false;

		rolls.forEach(roll => {            
            hasDice ||= roll.dice.length > 0;

            if (game.dice3d && hasDice) {
                const whisperData = CoreUtility.getWhisperData();
                promises.push(Promise.resolve(game.dice3d.showForRoll(roll, game.user, true, whisperData.whisper, whisperData.blind || false, messageID, whisperData.speaker)));
            }
		});

		await Promise.all(promises);

		return game.dice3d && hasDice;
    }

    /**
     * Checks if a given module name exists and is active in Foundry.
     * @param {String} name The name of the module to check if active. 
     * @returns 
     */
    static hasModule(name) {
        return game.modules.get(name)?.active;
    }

    static isVisible(chatData) {
        const whisper = chatData.whisper || [];
        const isBlind = whisper.length && chatData.blind;

        if ( whisper.length ) {
            return whisper.includes(game.user.id) || (chatData.user.isSelf && !isBlind);
        } 

        return true;
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

    static playRollSound() {
        AudioHelper.play({src: CONFIG.sounds.dice });
    }

    static async waitUntil(condition) {
        const poll = resolve => {
            if (condition()) resolve();
            else setTimeout(_ => poll(resolve), 100);
        }

        return new Promise(poll);
    }
}
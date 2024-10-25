import { MODULE_NAME, MODULE_SHORT } from "../module/const.js";
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
     * Determines if a roll should be quick rolled or bypassed depending on core DND5e key modifiers.
     * @param {Object} config The usage config passed in with the roll hook, which contains keyboard events.
     * @returns {Boolean, Boolean, Boolean} Flags indicating if the roll should fast forward, has advantage, and has disadvantage respectively.
     */
    static processKeyModifiers(config = {}) {
        const {isFF, advantageMode} = CONFIG.Dice.D20Roll.determineAdvantageMode({ 
            event: config.event,
            advantage: config.advantage,
            disadvantage: config.disadvantage 
        });

        if (isFF && advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.NORMAL) {
            return { fastForward: false, advantage: false, disadvantage: false}
        }

        return { 
            fastForward: true,
            advantage: advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE,
            disadvantage: advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE 
        }
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

            if (game.dice3d && game.dice3d.isEnabled() && hasDice) {
                const whisperData = CoreUtility.getWhisperData();
                promises.push(Promise.resolve(game.dice3d.showForRoll(roll, game.user, true, whisperData.whisper, whisperData.blind || false, messageID, whisperData.speaker)));
            }
		});

		await Promise.all(promises);

		return game.dice3d && game.dice3d.isEnabled() && hasDice;
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

    static isIterable(obj) {
        // checks for null and undefined
        if (obj == null) {
            return false;
        }

        return typeof obj[Symbol.iterator] === 'function';
    }

    /**
     * Gets data about whispers and roll mode for use in rendering messages.
     * @param {*} rollMode 
     * @returns {Object} A data package with the current roll mode.
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
     * Gets the current set of tokens that are selected or targeted (or both) depending on the chosen setting.
     * @returns {Set} A set of tokens that the module considers as current targets.
     */
    static getCurrentTargets() {
        let selectTokens = SettingsUtility._applyDamageToSelected ? canvas.tokens.controlled : [];
        let targetTokens = SettingsUtility._applyDamageToTargeted ? game.user.targets : [];

        if (SettingsUtility._prioritiseDamageSelected && selectTokens.length > 0) {
            targetTokens = [];
        }

        if (SettingsUtility._prioritiseDamageTargeted && targetTokens.size > 0) {
            selectTokens = [];
        }

        return new Set([...selectTokens, ...targetTokens]);
    }

    /**
     * Gets the default configured dice sound from Foundry VTT config.
     * @returns {Object} A data package with the sound data to play when rolling.
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
     * Plays the default roll sound from the audio helper.
     */
    static playRollSound() {
        foundry.audio.AudioHelper.play({src: CONFIG.sounds.dice }, true);
    }

    /**
     * Asynchronous polling of a specific condition that ends when the condition is met.
     * @param {Function} condition The condition function to poll.
     * @returns {Promise} A promise that waits until the condition is met.
     */
    static async waitUntil(condition) {
        const poll = resolve => {
            if (condition()) resolve();
            else setTimeout(_ => poll(resolve), 10);
        }

        return new Promise(poll);
    }

    /**
     * Asynchronous polling of a specific condition that ends when the condition is no longer met.
     * @param {Function} condition The condition function to poll.
     * @returns {Promise} A promise that waits while the condition is met.
     */
    static async waitWhile(condition) {
        const poll = resolve => {
            if (condition()) setTimeout(_ => poll(resolve), 10);
            else resolve();
        }

        return new Promise(poll);
    }
}
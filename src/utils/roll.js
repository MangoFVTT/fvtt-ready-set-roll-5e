import { MODULE_SHORT } from "../module/const.js";
import { CoreUtility } from "./core.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

/**
 * Enumerable of identifiers for different roll types that can be made.
 * @enum {String}
 */
export const ROLL_TYPE = {
    SKILL: "skill",
    ABILITY_TEST: "ability",
    ABILITY_SAVE: "save",
    DEATH_SAVE: "death",
    TOOL: "tool",
    ITEM: "item",
    ATTACK: "attack",
    DAMAGE: "damage",
    VERSATILE: "versatile",
    OTHER: "formula",
    ABILITY_CHECK: "abilityCheck",
    TOOL_CHECK: "toolCheck"
}

/**
 * Enumerable of identifiers for roll states (advantage or disadvantage).
 * @enum {String}
 */
export const ROLL_STATE = {
    ADV: "kh",
    DIS: "kl",
    DUAL: "dual",
    SINGLE: "single"
}

/**
 * Enumerable of identifiers for crit result types.
 * @enum {String}
 */
export const CRIT_TYPE = {
    MIXED: "mixed",
    SUCCESS: "success",
    FAILURE: "failure"
}

/**
 * Utility class for functions related to making specific rolls.
 */
export class RollUtility {
    static processActorRoll(config) {
        const advMode = CoreUtility.eventToAdvantage(config?.event);

        // For actor rolls, the alternate item roll setting doesn't matter for ignoring quick roll, only the alt key.
        const ignore = config.event?.altKey ?? false;

        config.fastForward = !ignore;
        config.advantage ??= advMode === CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
        config.disadvantage ??= advMode === CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;

        config.messageData[`flags.${MODULE_SHORT}`] = { 
            quickRoll: SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_VANILLA_ENABLED) || !ignore,
            processed: true
        };
    }

    static processItemRoll(options) {
        const advMode = CoreUtility.eventToAdvantage(window.event);
        const altRoll = CoreUtility.eventToAltRoll(window.event)

        // For item rolls, check the alternate item roll setting to see if the alt key should ignore quick roll.
        const ignore = (window.event.altKey && !altRoll) ?? false;

        options.fastForward = !ignore;
        options.advantage ??= advMode === CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
        options.disadvantage ??= advMode === CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;

        options.flags[MODULE_SHORT] = { 
            quickRoll: !ignore,
            advantage: options.advantage,
            disadvantage: options.disadvantage,
            altRoll: altRoll && !ignore
        };
    }

    /**
     * Checks if the roll needs to be forced to multi roll and returns the updated roll if needed.
     * @param {Roll} roll The roll to check.
     * @returns {Promise<Roll>} The version of the roll with multi roll enforced if needed, or the original roll otherwise.
     */
    static async ensureMultiRoll(roll) {
        if (!roll) {
			LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.rollIsNullOrUndefined`));
            return null;
        }

        if (!(roll.hasAdvantage || roll.hasDisadvantage)) {
            const forcedDiceCount = roll.options.elvenAccuracy ? 3 : 2;
            const d20BaseTerm = roll.terms.find(d => d.faces === 20);
            const d20Additional = new Roll(`${forcedDiceCount - d20BaseTerm.number}d20${d20BaseTerm.modifiers.join('')}`).evaluate({ async: false });

            await CoreUtility.tryRollDice3D(d20Additional);

            const d20Forced = new Die({
                number: forcedDiceCount,
                faces: 20,
                results: [...d20BaseTerm.results, ...d20Additional.dice[0].results],
                modifiers: d20BaseTerm.modifiers
            });

            roll.terms[roll.terms.indexOf(d20BaseTerm)] = d20Forced;

            RollUtility.resetRollGetters(roll);
        }

        return roll;
    }

    /**
     * Upgrades a roll into a multi roll with the given target state (advantage/disadvantage).
     * @param {Roll} roll The roll to upgrade.
     * @param {ROLL_STATE} targetState The target state of the roll.
     * @returns {Promise<Roll>} The upgraded multi roll from the provided roll.
     */
    static async upgradeRoll(roll, targetState) {
        if (!roll) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.rollIsNullOrUndefined`));
            return null;
        }

		if (targetState !== ROLL_STATE.ADV && targetState !== ROLL_STATE.DIS) {
			LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectTargetState`, { state: targetState }));
			return roll;
		}

        if (targetState === ROLL_STATE.DIS) {
            roll.options.elvenAccuracy = false;
        }

        const upgradedRoll = await RollUtility.ensureMultiRoll(roll);
        
        const d20BaseTerm = upgradedRoll.terms.find(d => d.faces === 20);
        d20BaseTerm.keep(targetState);
        d20BaseTerm.modifiers.push(targetState);
        
        upgradedRoll.options.advantageMode = targetState === ROLL_STATE.ADV 
            ? CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE 
            : CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;

        RollUtility.resetRollGetters(upgradedRoll);
        return upgradedRoll;
    }

    static resetRollGetters(roll) {
        roll._total = roll._evaluateTotal();
        roll.resetFormula();
    }

    /**
     * Processes a set of dice results to check what type of critical was rolled (for showing colour in chat card).
     * @param {Die} die A die term to process into a crit type.
     * @param {Number} options.critThreshold The threshold above which a result is considered a crit.
     * @param {Number} options.fumbleThreshold The threshold below which a result is considered a crit.
     * @returns {CRIT_TYPE} The type of crit for the die term.
     */
    static getCritTypeForDie(die, options = {}) {
        if (!die) return null;

        const { crit, fumble } = _countCritsFumbles(die, options)		

        return _getCritResult(crit, fumble);
    }
}

function _getCritResult(crit, fumble)
{
    if (crit > 0 && fumble > 0) {
        return CRIT_TYPE.MIXED;
    }
    
    if (crit > 0) {
        return CRIT_TYPE.SUCCESS;
    }
    
    if (fumble > 0) {
        return CRIT_TYPE.FAILURE;
    }
}

function _countCritsFumbles(die, options)
{
    let crit = 0;
    let fumble = 0;

    if (die && die.faces > 1) {
        let { critThreshold, fumbleThreshold, targetValue, ignoreDiscarded } = options

        critThreshold = critThreshold ?? die.options.critical ?? die.faces;
        fumbleThreshold = fumbleThreshold ?? die.options.fumble ?? 1;

        for (const result of die.results) {
            if (result.rerolled || (result.discarded && ignoreDiscarded)) {
                continue;
            }

            if (result.result >= targetValue || result.result >= critThreshold) {
                crit += 1;
            } else if (result.result < targetValue || result.result <= fumbleThreshold) {
                fumble += 1;
            }
        }
    }

    return { crit, fumble }
}
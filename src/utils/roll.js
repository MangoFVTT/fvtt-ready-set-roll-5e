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
    ACTIVITY: "activity",
    CHECK: "check",
    ATTACK: "attack",
    DAMAGE: "damage",
    VERSATILE: "versatile",
    OTHER: "formula",
    CONCENTRATION: "concentration",
    HEALING: "healing",
    FORMULA: "roll"
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
    static processRoll(config, dialog, message) {
        if (message.data.flags[MODULE_SHORT]?.processed) return;

        const keys = {
            normal: CoreUtility.areKeysPressed(config.event, "skipDialogNormal"),
            advantage: CoreUtility.areKeysPressed(config.event, "skipDialogAdvantage"),
            disadvantage: CoreUtility.areKeysPressed(config.event, "skipDialogDisadvantage")
        };

        dialog.configure ??= keys.normal || (config.vanilla ?? false);

        if (config.isConcentration) {
            config.flavor = `${CoreUtility.localize("DND5E.ToolPromptTitle", { tool: CoreUtility.localize("DND5E.Concentration") })}`;
        }

        message.data.flags[MODULE_SHORT] = { 
            quickRoll: SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_VANILLA_ENABLED) || !(dialog.configure ?? true),
            advantage: keys.advantage,
            disadvantage: keys.disadvantage,
            isConcentration: config.isConcentration,
            processed: true
        };
    }

    static processActivity(usageConfig, dialogConfig, messageConfig) {
        const keys = {
            normal: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogNormal"),
            advantage: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogAdvantage"),
            disadvantage: CoreUtility.areKeysPressed(usageConfig.event, "skipDialogDisadvantage")
        };

        const fastForward = !(keys.normal || (usageConfig.vanilla ?? false))
        dialogConfig.configure = usageConfig.hasOwnProperty('spell')
            || (usageConfig.scaling !== undefined && usageConfig.scaling !== false)
            || messageConfig.data?.flags?.dnd5e?.activity?.type === 'order' 
            || !fastForward;

        messageConfig.data.flags[MODULE_SHORT] = { 
            quickRoll: fastForward,
            advantage: keys.advantage,
            disadvantage: keys.disadvantage,
            processed: !fastForward
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
            const d20Additional = await new Roll(`${forcedDiceCount - d20BaseTerm.number}d20${d20BaseTerm.modifiers.join('')}`).evaluate();

            await CoreUtility.tryRollDice3D(d20Additional);

            const d20Forced = new foundry.dice.terms.Die({
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
        let { critThreshold, fumbleThreshold, target, ignoreDiscarded, displayChallenge, forceSuccess } = options

        if (forceSuccess) {
            return { crit: 1, fumble: 0 };
        }

        critThreshold = critThreshold ?? die.options.criticalSuccess ?? die.faces;
        fumbleThreshold = fumbleThreshold ?? die.options.criticalFailure ?? 1;

        for (const result of die.results) {
            if (result.rerolled || (result.discarded && ignoreDiscarded)) {
                continue;
            }
            
            if ((displayChallenge && result.result >= target) || result.result >= critThreshold) {
                crit += 1;
            } else if ((displayChallenge && result.result < target) || result.result <= fumbleThreshold) {
                fumble += 1;
            }
        }
    }

    return { crit, fumble }
}
import { MODULE_SHORT } from "../module/const.js";
import { FIELD_TYPE } from "./render.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { QuickRoll } from "../module/quickroll.js";

/**
 * A list of different roll types that can be made.
 */
export const ROLL_TYPE = {
    SKILL: "skill",
    ABILITY_TEST: "check",
    ABILITY_SAVE: "save",
}

/**
 * A list of crit result types.
 */
export const CRIT_TYPE = {
    MIXED: "mixed",
    SUCCESS: "success",
    FAILURE: "failure"
}

export class RollUtility {
    /**
     * Makes a roll with advantage/disadvantage determined by pressed modifier keys in the triggering event.
     * @param {function} wrapper The roll wrapper to call.
     * @param {any} options Option data for the triggering event.
     * @param {string} id The identifier of the roll (eg. ability name/skill name/etc).
     * @param {boolean} bypass Is true if the quick roll should be bypassed and a default roll dialog used.
     * @returns {Promise<Roll>} The roll result of the wrapper.
     */
    static async rollWrapper(wrapper, options, id, bypass = false) {
        const advMode = CoreUtility.eventToAdvantage(options.event);

        return await wrapper.call(this, id, {
            fastForward: !bypass,
            chatMessage: bypass,
            advantage: advMode > 0,
            disadvantage: advMode < 0
        })
    }

    /**
     * Rolls a skill check from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called. 
     * @param {string} skillId The id of the skill being rolled.
     * @param {Roll} roll The roll object that was made for the check.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollSkill(actor, skillId, roll) {
        if (!(skillId in CONFIG.DND5E.skills)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Skill", label: skillId, dictionary: "CONFIG.DND5E.skills" }));
            return null;
		}

        const title = CoreUtility.localize(CONFIG.DND5E.skills[skillId]);

        return await getActorRoll(actor, title, roll, ROLL_TYPE.SKILL);
    }    

    /**
     * Rolls an ability test from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called. 
     * @param {string} ability The id of the ability being rolled.
     * @param {Roll} roll The roll object that was made for the check.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollAbilityTest(actor, ability, roll) {
        if (!(ability in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: ability, dictionary: "CONFIG.DND5E.abilities" }));
            return null;
		}

        const title = `${CoreUtility.localize(CONFIG.DND5E.abilities[ability])} ${CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.ABILITY_TEST}`)}`;

        return await getActorRoll(actor, title, roll, ROLL_TYPE.ABILITY_TEST);
    }

    /**
     * Rolls an ability save from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called. 
     * @param {string} ability The id of the ability being rolled.
     * @param {Roll} roll The roll object that was made for the check.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollAbilitySave(actor, ability, roll) {
        if (!(ability in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: ability, dictionary: "CONFIG.DND5E.abilities" }));
            return null;
        }

        const title = `${CoreUtility.localize(CONFIG.DND5E.abilities[ability])} ${CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.ABILITY_SAVE}`)}`;

        return await getActorRoll(actor, title, roll, ROLL_TYPE.ABILITY_SAVE);
    }

    /**
     * Processes a set of dice results to check what type of critical was rolled (for showing colour in chat card).
     * @param {Die} die A die term to process into a crit type.
     * @param {*} critThreshold The threshold above which a result is considered a crit.
     * @param {*} fumbleThreshold The threshold below which a result is considered a crit.
     * @returns {CRIT_TYPE} The type of crit for the die term.
     */
    static getCritType(die, critThreshold, fumbleThreshold) {
        if (!die) return null;

		let crit = 0;
		let fumble = 0;

        if (die.faces > 1) {
            for (const result of die.results) {
                if (result.result >= (critThreshold || die.faces)) {
                    crit += 1;
                } else if (result.result <= (fumbleThreshold || 1)) {
                    fumble += 1;
                }
            }
        }

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
}

/**
 * Gets an actor-based quick roll (skill, ability, or save).
 * @param {Actor} actor The actor object from which the roll is being generated.
 * @param {string} title The label to show on the header of the chat card.
 * @param {string} roll The roll being quick rolled.
 * @param {string} rollType The type (as a string identifier) of the roll being quick rolled.
 * @param {boolean} [createMessage=true] Whether the roll should immediately output to chat as a message.
 * @returns {Promise<QuickRoll>} The created actor quick roll.
 */
async function getActorRoll(actor, title, roll, rollType, createMessage = true) {
    const hasAdvantage = roll.hasAdvantage;
    const hasDisadvantage = roll.hasDisadvantage;
    
    console.log(roll);

    const quickroll = new QuickRoll(
        actor,
        { hasAdvantage, hasDisadvantage },
        [
            [FIELD_TYPE.HEADER, { title }],
            [FIELD_TYPE.CHECK, { roll, rollType }]
        ]
    );

    await quickroll.toMessage({ createMessage });
    return quickroll;
}
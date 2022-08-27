import { MODULE_SHORT } from "../module/const.js";
import { FIELD_TYPE } from "./render.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { QuickRoll } from "../module/quickroll.js";

export const ROLL_TYPE = {
    SKILL: "skill",
    ABILITY_TEST: "check",
    ABILITY_SAVE: "save",
}

export const CRIT_TYPE = {
    MIXED: "mixed",
    SUCCESS: "success",
    FAILURE: "failure"
}

export class RollUtility {
    static async roll(roll, options, id) {
        const { advantage, disadvantage } = CoreUtility.eventToAdvantage(options.event);

        return await roll.call(this, id, {
            ...options,
            fastForward: true,
            chatMessage: false,
            advantage: advantage,
            disadvantage: disadvantage
        })
    }

    static async rollSkill(actor, skillId, roll) {
        if (!(skillId in CONFIG.DND5E.skills)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Skill", label: skillId, dictionary: "CONFIG.DND5E.skills" }));
            return null;
		}

        const title = CoreUtility.localize(CONFIG.DND5E.skills[skillId]);

        return await getActorRoll(actor, title, roll, ROLL_TYPE.SKILL);
    }    

    static async rollAbilityTest(actor, ability, roll) {
        if (!(ability in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: ability, dictionary: "CONFIG.DND5E.abilities" }));
            return null;
		}

        const title = `${CoreUtility.localize(CONFIG.DND5E.abilities[ability])} ${CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.ABILITY_TEST}`)}`;

        return await getActorRoll(actor, title, roll, ROLL_TYPE.ABILITY_TEST);
    }

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
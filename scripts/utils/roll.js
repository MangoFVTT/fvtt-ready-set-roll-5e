import { FIELD_TYPE } from "./render.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { QuickRoll } from "../module/quickroll.js";

export const ROLL_TYPE = {
    SKILL: "skill"
}

export class RollUtility {
    static async rollSkill(actor, skillId, roll) {
        if (!(skillId in CONFIG.DND5E.skills)) {
			LogUtility.logError(`Skill ${skillId} does not exist. Valid values can be found in CONFIG.DND5E.skills`);
		}

        const title = CoreUtility.localize(CONFIG.DND5E.skills[skillId]);

        return getActorRoll(actor, title, roll, ROLL_TYPE.SKILL);
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
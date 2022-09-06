import { MODULE_SHORT } from "../module/const.js";
import { FIELD_TYPE } from "./render.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { QuickRoll } from "../module/quickroll.js";
import { ItemUtility, ITEM_TYPE } from "./item.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";

/**
 * A list of different roll types that can be made.
 */
export const ROLL_TYPE = {
    SKILL: "skill",
    ABILITY_TEST: "check",
    ABILITY_SAVE: "save",
    ITEM: "item",
    ATTACK: "attack",
    DAMAGE: "damage",
    HEALING: "healing",
    OTHER: "other"
}

/**
 * A list of crit result types.
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
    /**
     * Calls the wrapped Actor roll with advantage/disadvantage determined by pressed modifier keys in the triggering event.
     * @param {Actor} caller The calling object of the wrapper.
     * @param {function} wrapper The roll wrapper to call.
     * @param {any} options Option data for the triggering event.
     * @param {string} id The identifier of the roll (eg. ability name/skill name/etc).
     * @param {boolean} bypass Is true if the quick roll should be bypassed and a default roll dialog used.
     * @returns {Promise<Roll>} The roll result of the wrapper.
     */
    static async rollActorWrapper(caller, wrapper, options, id, bypass = false) {
        const advMode = CoreUtility.eventToAdvantage(options.event);

        return await wrapper.call(caller, id, {
            fastForward: !bypass,
            chatMessage: bypass,
            advantage: advMode > 0,
            disadvantage: advMode < 0
        });
    }

    /**
     * Calls the wrapped Item roll with advantage/disadvantage/alternate determined by pressed modifier keys in the triggering event.
     * @param {Item} caller The calling object of the wrapper.
     * @param {function} wrapper The roll wrapper to call.
     * @param {any} options Option data for the triggering event.
     * @param {string} id The identifier of the roll (eg. ability name/skill name/etc).
     * @param {boolean} bypass Is true if the quick roll should be bypassed and a default roll dialog used.
     * @returns {Promise<ChatData>} The roll result of the wrapper.
     */
    static async rollItemWrapper(caller, wrapper, options, bypass = false) {
        // We can ignore the item if it is not one of the types that requires a quick roll.
        if (bypass || !CONFIG[`${MODULE_SHORT}`].validItemTypes.includes(caller?.type)) {
            return await wrapper.call(caller, {}, { ignore: true });
        }

        const isAltRoll = CoreUtility.eventToAltRoll(options?.event);
        const advMode = CoreUtility.eventToAdvantage(options?.event);
        const config = ItemUtility.getRollConfigFromItem(caller, isAltRoll)

        // Handle quantity when uses are not consumed
        // While the rest can be handled by Item._getUsageUpdates(), this one thing cannot
        if (config.consumeQuantity && !config.consumeUsage) {  
            if (caller.system.quantity === 0) {
                ui.notifications.warn(CoreUtility.localize("DND5E.ItemNoUses", {name: caller.name})); 
                return;  
            }

            config.consumeQuantity = false;

            const itemUpdates = {};
			itemUpdates["system.quantity"] = Math.max(0, caller.system.quantity - 1);            
            await caller.update(itemUpdates);
        }

        return await wrapper.call(caller, config, {
            configureDialog: caller?.type === ITEM_TYPE.SPELL ? true : false,
            createMessage: false,
            advMode,
            isAltRoll,
            spellLevel: caller?.system?.level
        });
    }

    /**
     * Rolls a skill check from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called. 
     * @param {string} skillId The id of the skill being rolled.
     * @param {Roll} roll The roll object that was made for the check.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollSkill(actor, skillId, roll) {
        LogUtility.log(`Quick rolling skill check from Actor '${actor.name}'`);

        if (!(skillId in CONFIG.DND5E.skills)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Skill", label: skillId, dictionary: "CONFIG.DND5E.skills" }));
            return null;
		}

        const skill = CONFIG.DND5E.skills[skillId];
        let title = CoreUtility.localize(skill.label);
        title += SettingsUtility.getSettingValue(SETTING_NAMES.SHOW_SKILL_ABILITIES) ? ` (${CONFIG.DND5E.abilities[skill.ability]})` : "";

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
        LogUtility.log(`Quick rolling ability test from Actor '${actor.name}'`);

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
        LogUtility.log(`Quick rolling ability save from Actor '${actor.name}'`);

        if (!(ability in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: ability, dictionary: "CONFIG.DND5E.abilities" }));
            return null;
        }

        const title = `${CoreUtility.localize(CONFIG.DND5E.abilities[ability])} ${CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.ABILITY_SAVE}`)}`;

        return await getActorRoll(actor, title, roll, ROLL_TYPE.ABILITY_SAVE);
    }

    /**
     * Rolls a single usage from a given item.
     * @param {Item} item The item to roll.
     * @param {*} params A set of parameters for rolling the Item.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollItem(item, params) {
        LogUtility.log(`Quick rolling Item '${item.name}'`);

        params = params ?? {};
        params.slotLevel = item.system.level;
        item.system.level = params.spellLevel ?? item.system.level;

        return await getItemRoll(item, params, ROLL_TYPE.ITEM)
    }

    /**
     * Processes a set of dice results to check what type of critical was rolled (for showing colour in chat card).
     * @param {Die} die A die term to process into a crit type.
     * @param {*} critThreshold The threshold above which a result is considered a crit.
     * @param {*} fumbleThreshold The threshold below which a result is considered a crit.
     * @returns {CRIT_TYPE} The type of crit for the die term.
     */
    static getCritTypeForDie(die, critThreshold, fumbleThreshold) {
        if (!die) return null;

        const { crit, fumble } = countCritsFumbles(die, critThreshold, fumbleThreshold)		

        return getCritResult(crit, fumble);
    }

    /**
     * Processes a set of dice results to check what type of critical was rolled (for showing colour in chat card).
     * @param {Roll} roll A die term to process into a crit type.
     * @param {*} critThreshold The threshold above which a result is considered a crit.
     * @param {*} fumbleThreshold The threshold below which a result is considered a crit.
     * @returns {CRIT_TYPE} The type of crit for the die term.
     */
    static getCritTypeForRoll(roll, critThreshold, fumbleThreshold) {
        if (!roll) return null;

		let totalCrit = 0;
		let totalFumble = 0;

        for (const die of roll.dice) {			
            const { crit, fumble } = countCritsFumbles(die, critThreshold, fumbleThreshold)
            totalCrit += crit;
            totalFumble += fumble;
		}

        return getCritResult(totalCrit, totalFumble);
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
    if (!actor instanceof Actor) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.objectNotExpectedType`, { type: "Actor" }));
        return null;
    }

    if (rollType !== ROLL_TYPE.SKILL && rollType !== ROLL_TYPE.ABILITY_SAVE && rollType !== ROLL_TYPE.ABILITY_TEST) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectRollType`, { function: "Actor", type: rollType }));
        return null;
    }

    const quickroll = new QuickRoll(
        actor,
        { 
            hasAdvantage: roll.hasAdvantage,
            hasDisadvantage: roll.hasDisadvantage,
            isCrit: roll.isCritical,
            isFumble: roll.isFumble
        },
        [
            [FIELD_TYPE.HEADER, { title }],
            [FIELD_TYPE.CHECK, { roll, rollType }]
        ]
    );

    await quickroll.toMessage({ createMessage });
    return quickroll;
}

async function getItemRoll(item, params, rollType, createMessage = true) {
    if (!item instanceof Item) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.objectNotExpectedType`, { type: "Item" }));
        return null;
    }

    if (rollType !== ROLL_TYPE.ITEM) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectRollType`, { function: "Item", type: rollType }));
        return null;
    }

    const quickroll = new QuickRoll(
        item,
        { 
            hasAdvantage: params?.advMode > 0 ?? false,
            hasDisadvantage: params?.advMode < 0 ?? false
        },
        [
            [FIELD_TYPE.HEADER, { title: item.name, slotLevel: params?.slotLevel }],
            ...await ItemUtility.getFieldsFromItem(item, params)
        ]
    );

    await quickroll.toMessage({ createMessage });
    return quickroll;
}

function getCritResult(crit, fumble)
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

function countCritsFumbles(die, critThreshold, fumbleThreshold)
{
    let crit = 0;
    let fumble = 0;

    if (die.faces > 1) {
        for (const result of die.results) {
            if (result.rerolled) {
                continue;
            }

            if (result.result >= (critThreshold || die.faces)) {
                crit += 1;
            } else if (result.result <= (fumbleThreshold || 1)) {
                fumble += 1;
            }
        }
    }

    return { crit, fumble }
}
import { MODULE_NAME } from "../module/const.js";
import { CoreUtility } from "./core.js";
import { HooksUtility } from "./hooks.js";
import { LogUtility } from "./log.js";
import { RollUtility } from "./roll.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";

export class PatchingUtility {
    /**
     * Patches actor sheet rolls: skills, ability checks, and ability saves.
     */
    static patchActors() {
        LogUtility.log("Patching Actor Rolls");
        const actorPrototype = "CONFIG.Actor.documentClass.prototype";

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_SKILL_ENABLED)) {
            libWrapper.register(MODULE_NAME, `${actorPrototype}.rollSkill`, actorRollSkill, "MIXED");
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ABILITY_ENABLED)) {
            libWrapper.register(MODULE_NAME, `${actorPrototype}.rollAbilityTest`, actorRollAbilityTest, "MIXED");
            libWrapper.register(MODULE_NAME, `${actorPrototype}.rollAbilitySave`, actorRollAbilitySave, "MIXED");
        }
    }

    /**
     * Patches item rolls: weapons, features, tools, spells, etc.
     */
    static patchItems() {
        LogUtility.log("Patching Item Rolls");
        const itemPrototype = "CONFIG.Item.documentClass.prototype";

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) {            
            HooksUtility.registerItemHooks();
            libWrapper.register(MODULE_NAME, `${itemPrototype}.use`, itemUse, "MIXED");
        }
    }
}

/**
 * Patch function for rolling an Actor skill.
 * @param {function} wrapper The original wrapper for the function.
 * @param {string} skillId The id of the skill being rolled.
 * @param {*} options Options for processing the roll.
 * @returns {Promise<Roll>} The generated roll for the Actor skill.
 */
async function actorRollSkill(wrapper, skillId, options) {
    const { roll, ignore } = await actorProcessWrapper(this, wrapper, options, skillId);

    return ignore ? roll : RollUtility.rollSkill(this, skillId, roll);
}

/**
 * Patch function for rolling an Actor ability test.
 * @param {function} wrapper The original wrapper for the function.
 * @param {string} skillId The id of the ability being rolled.
 * @param {*} options Options for processing the roll.
 * @returns {Promise<Roll>} The generated roll for the Actor ability test.
 */
async function actorRollAbilityTest(wrapper, ability, options) {
    const { roll, ignore } = await actorProcessWrapper(this, wrapper, options, ability);

    return ignore ? roll : RollUtility.rollAbilityTest(this, ability, roll);
}

/**
 * Patch function for rolling an Actor ability save.
 * @param {function} wrapper The original wrapper for the function.
 * @param {string} skillId The id of the ability being rolled.
 * @param {*} options Options for processing the roll.
 * @returns {Promise<Roll>} The generated roll for the Actor ability save.
 */
async function actorRollAbilitySave(wrapper, ability, options) {
    const { roll, ignore } = await actorProcessWrapper(this, wrapper, options, ability);

    return ignore ? roll : RollUtility.rollAbilitySave(this, ability, roll);
}

/**
 * Patch function for rolling an Item usage.
 * @param {function} wrapper The original wrapper for the function.
 * @param {*} options Options for processing the item usage.
 * @returns {Promise<ChatMessage|object|void>} The generated chat data for the Item usage.
 */
async function itemUse(wrapper, options) {
    options = foundry.utils.mergeObject({ event: window.event }, options, { recursive: false });

    //TO-DO: generate roll config from set flags in sheet, see item.mjs -> use()
    //idea is to get flags from sheet and change config to let the system handle all consumption/etc.
    return await itemProcessWrapper(this, wrapper, undefined, options);
}

/**
 * Process the wrapper for an Actor roll and bypass quick rolling if necessary.
 * @param {Actor} caller The calling object of the wrapper.
 * @param {function} wrapper The original wrapper to process.
 * @param {*} options Options for processing the wrapper.
 * @param {string} id The associated id of the Actor roll (eg. skill id).
 * @returns {Promise<Roll>} The processed roll data from the wrapper.
 */
async function actorProcessWrapper(caller, wrapper, options, id) {
    if (options?.chatMessage === false || options?.vanilla) {
        return { roll: wrapper.call(caller, skillId, options), ignore: true };
    }

    // For actor rolls, the alternate item roll setting doesn't matter for ignoring quick roll, only the alt key.
    const ignore = options?.event?.altKey ?? false;
    return { roll: await RollUtility.rollActorWrapper(caller, wrapper, options, id, ignore), ignore };
}

/**
 * Process the wrapper for an Item roll and bypass quick rolling if necessary.
 * @param {Item} caller The calling object of the wrapper.
 * @param {function} wrapper The original wrapper to process.
 * @param {*} config Configuration for processing the item.
 * @param {*} options Options for processing the wrapper.
 * @returns {Promise<ChatMessage>} The processed chat data for the wrapper.
 */
async function itemProcessWrapper(caller, wrapper, config, options) {
    if (options?.chatMessage === false || options?.vanilla) {
		return wrapper.call(caller, options);
	}

    // For item rolls, check the alternate item roll setting to see if the alt key should ignore quick roll.
    const ignore = (options?.event?.altKey && !CoreUtility.eventToAltRoll(options?.event)) ?? false;
    return await RollUtility.rollItemWrapper(caller, wrapper, config, options, ignore);
}
import { MODULE_NAME } from "../module/const.js";
import { LogUtility } from "./log.js";
import { RollUtility } from "./roll.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";

export class PatchingUtility {
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

    static patchItems() {
        LogUtility.log("Patching Item Rolls");
        const itemPrototype = "CONFIG.Item.documentClass.prototype";

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) {
            libWrapper.register(MODULE_NAME, `${itemPrototype}.roll`, itemRoll, "OVERRIDE");
            libWrapper.register(MODULE_NAME, `${itemPrototype}.rollAttack`, itemRollAttack, "OVERRIDE");
            libWrapper.register(MODULE_NAME, `${itemPrototype}.rollToolCheck`, itemRollToolCheck, "OVERRIDE");
        }
    }
}

async function actorProcessWrapper(original, options, id) {
    if (options?.chatMessage === false || options?.vanilla) {
        return { roll: original.call(this, skillId, options), ignore: true };
    }

    // For actor rolls, the alternate item roll setting doesn't matter for ignoring quick roll, only the alt key.
    const ignore = options?.event?.altKey ?? false;
    return { roll: await RollUtility.rollWrapper(original, options, id, ignore), ignore };
}

async function actorRollSkill(original, skillId, options) {
    const { roll, ignore } = await actorProcessWrapper(original, options, skillId);

    return ignore ? roll : RollUtility.rollSkill(this, skillId, roll);
}

async function actorRollAbilityTest(original, ability, options) {
    const { roll, ignore } = await actorProcessWrapper(original, options, ability);

    return ignore ? roll : RollUtility.rollAbilityTest(this, ability, roll);
}

async function actorRollAbilitySave(original, ability, options) {
    const { roll, ignore } = await actorProcessWrapper(original, options, ability);

    return ignore ? roll : RollUtility.rollAbilitySave(this, ability, roll);
}

async function itemRoll(defaultRoll, options) {
    console.log("item roll");
}

async function itemRollAttack(defaultRoll, options) {
    console.log("item attack");
}

async function itemRollToolCheck(defaultRoll, options) {
    console.log("item tool");
}
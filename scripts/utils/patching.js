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

        }
    }
}

async function actorRollSkill(original, skillId, options) {
    if (options?.chatMessage === false || options?.vanilla) {
        return original.call(this, skillId, options);
    }

    const roll = await RollUtility.roll(original, options, skillId);

    return RollUtility.rollSkill(this, skillId, roll);
}

async function actorRollAbilityTest(original, ability, options) {
    if (options?.chatMessage === false || options?.vanilla) {
        return original.call(this, ability, options);
    }

    const roll = await RollUtility.roll(original, options, ability);

    return RollUtility.rollAbilityTest(this, ability, roll);
}

async function actorRollAbilitySave(original, ability, options) {
    if (options?.chatMessage === false || options?.vanilla) {
        return original.call(this, ability, options);
    }

    const roll = await RollUtility.roll(original, options, ability);

    return RollUtility.rollAbilitySave(this, ability, roll);
}
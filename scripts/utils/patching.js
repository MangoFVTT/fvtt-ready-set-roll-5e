import { MODULE_NAME } from "../data/const.js";
import { CoreUtility } from "./core.js";
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

}

function actorRollAbilityTest(original, ability, options) {
}

function actorRollAbilitySave(original, ability, options) {
}
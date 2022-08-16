import { MODULE_NAME, MODULE_SHORT } from "../module/const.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";

export const SETTING_NAMES = {
    ROLL_MODIFIER_MODE: "rollModifierMode",
    QUICK_SKILL_ENABLED: "enableSkillQuickRoll",
    QUICK_ABILITY_ENABLED: "enableAbilityQuickRoll",
    QUICK_ITEM_ENABLED: "enableItemQuickRoll",
    ALT_ROLL_ENABLED: "enableAltQuickRoll"
}

export class SettingsUtility {
    static registerSettings() {
        LogUtility.log("Registering Settings");

        game.settings.register(MODULE_NAME, SETTING_NAMES.QUICK_ABILITY_ENABLED, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_ABILITY_ENABLED}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_ABILITY_ENABLED}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.QUICK_SKILL_ENABLED, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_SKILL_ENABLED}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_SKILL_ENABLED}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.QUICK_ITEM_ENABLED, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_ITEM_ENABLED}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_ITEM_ENABLED}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ROLL_MODIFIER_MODE, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ROLL_MODIFIER_MODE}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ROLL_MODIFIER_MODE}.hint`),
			scope: "client",
			config: true,
			default: 1,
			type: Number,
			choices: {
				1: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.ROLL_MODIFIER_MODE}.shiftAdv`),
				2: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.ROLL_MODIFIER_MODE}.ctrlAdv`)
			}
		});

        game.settings.register(MODULE_NAME, SETTING_NAMES.ALT_ROLL_ENABLED, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ALT_ROLL_ENABLED}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ALT_ROLL_ENABLED}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: false,
        });
    }
    
    static getSettingValue(settingKey) {
        return game.settings.get(MODULE_NAME, settingKey);
    }
}

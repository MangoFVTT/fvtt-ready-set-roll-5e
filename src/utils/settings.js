import { MODULE_NAME, MODULE_SHORT } from "../module/const.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";

/**
 * Enumerable of identifiers for setting names.
 * @enum {string}
 */
export const SETTING_NAMES = {
    ROLL_MODIFIER_MODE: "rollModifierMode",
    QUICK_SKILL_ENABLED: "enableSkillQuickRoll",
    QUICK_ABILITY_ENABLED: "enableAbilityQuickRoll",
    QUICK_ITEM_ENABLED: "enableItemQuickRoll",
    ALT_ROLL_ENABLED: "enableAltQuickRoll",
    PLACEMENT_ROLL_TITLE: "placementRollTitle",
    PLACEMENT_DAMAGE_TITLE: "placementDamageTitle",
    PLACEMENT_DAMAGE_CONTEXT: "placementDamageContext",
    PLACEMENT_DAMAGE_TYPE: "placementDamageType",
    CONTEXT_REPLACE_TITLE: "contextReplacesTitle",
    CONTEXT_REPLACE_DAMAGE: "contextReplacesDamage",
    D20_ICONS_ENABLED: "d20IconsEnabled",
    DEFAULT_ROLL_ART: "defaultRollArt",
    HIDE_SAVE_DC: "hideSaveDC",
    SHOW_SKILL_ABILITIES: "showSkillAbilities"
}

/**
 * Utility class for registry of module settings and retrieval of setting data.
 */
export class SettingsUtility {
    /**
     * Registers all necessary module settings.
     */
    static registerSettings() {
        LogUtility.log("Registering module settings");

        game.settings.register(MODULE_NAME, SETTING_NAMES.ROLL_MODIFIER_MODE, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ROLL_MODIFIER_MODE}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ROLL_MODIFIER_MODE}.hint`),
			scope: "client",
			config: true,
			default: 0,
			type: Number,
			choices: {
				0: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.ROLL_MODIFIER_MODE}.shiftAdv`),
				1: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.ROLL_MODIFIER_MODE}.ctrlAdv`)
			}
		});

        game.settings.register(MODULE_NAME, SETTING_NAMES.QUICK_ABILITY_ENABLED, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_ABILITY_ENABLED}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_ABILITY_ENABLED}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.QUICK_SKILL_ENABLED, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_SKILL_ENABLED}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_SKILL_ENABLED}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.QUICK_ITEM_ENABLED, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_ITEM_ENABLED}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.QUICK_ITEM_ENABLED}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.ALT_ROLL_ENABLED, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ALT_ROLL_ENABLED}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ALT_ROLL_ENABLED}.hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: false,
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.PLACEMENT_ROLL_TITLE, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.PLACEMENT_ROLL_TITLE}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.PLACEMENT_ROLL_TITLE}.hint`),
			scope: "world",
			config: true,
			type: Number,
			default: 1,
			choices: {
				0: CoreUtility.localize(`${MODULE_SHORT}.choices.placement.0`),
				1: CoreUtility.localize(`${MODULE_SHORT}.choices.placement.1`)
			}
		});

		const placementOptions = [
            SETTING_NAMES.PLACEMENT_DAMAGE_TITLE,
            SETTING_NAMES.PLACEMENT_DAMAGE_CONTEXT,
            SETTING_NAMES.PLACEMENT_DAMAGE_TYPE
        ];

        placementOptions.forEach(placementOption => {
            game.settings.register(MODULE_NAME, placementOption, {
                name: CoreUtility.localize(`${MODULE_SHORT}.settings.${placementOption}.name`),
                hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${placementOption}.hint`),
                scope: "world",
                config: true,
                type: Number,
                default: 1,
                choices: {
                    0: CoreUtility.localize(`${MODULE_SHORT}.choices.placement.0`),
                    1: CoreUtility.localize(`${MODULE_SHORT}.choices.placement.1`),
                    2: CoreUtility.localize(`${MODULE_SHORT}.choices.placement.2`),
                    3: CoreUtility.localize(`${MODULE_SHORT}.choices.placement.3`)
                }
            });
        });

        const contextOptions = [
            SETTING_NAMES.CONTEXT_REPLACE_TITLE,
            SETTING_NAMES.CONTEXT_REPLACE_DAMAGE
        ];

		contextOptions.forEach(contextOption => {
			game.settings.register(MODULE_NAME, contextOption, {
				name: CoreUtility.localize(`${MODULE_SHORT}.settings.${contextOption}.name`),
				hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${contextOption}.hint`),
				scope: "world",
				config: true,
				type: Boolean,
				default: false
			});
		});

        game.settings.register(MODULE_NAME, SETTING_NAMES.D20_ICONS_ENABLED, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.D20_ICONS_ENABLED}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.D20_ICONS_ENABLED}.hint`),
			scope: "world",
			config: true,
			type: Boolean,
			default: true
		});

        game.settings.register(MODULE_NAME, SETTING_NAMES.SHOW_SKILL_ABILITIES, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_SKILL_ABILITIES}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_SKILL_ABILITIES}.hint`),
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
            requiresReload: true
		});

        game.settings.register(MODULE_NAME, SETTING_NAMES.DEFAULT_ROLL_ART, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.DEFAULT_ROLL_ART}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.DEFAULT_ROLL_ART}.hint`),
			scope: "world",
			config: true,
			default: "actor",
			type: String,
			choices: {
				"actor": CoreUtility.localize("Actor"),
				"token": CoreUtility.localize("Token")
			}
		});

        // game.settings.register(MODULE_NAME, SETTING_NAMES.HIDE_SAVE_DC, {
		// 	name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.HIDE_SAVE_DC}.name`),
		// 	hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.HIDE_SAVE_DC}.hint`),
		// 	scope: "world",
		// 	config: true,
		// 	type: Number,
		// 	default: 1,
		// 	choices: {
		// 		0: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.HIDE_SAVE_DC}.0`),
		// 		1: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.HIDE_SAVE_DC}.1`),
        //      2: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.HIDE_SAVE_DC}.2`)
		// 	}
		// });
    }
    
    /**
     * Retrieve a specific setting value for the provided key.
     * @param {SETTING_NAMES|string} settingKey The identifier of the setting to retrieve.
     * @returns {string|boolean} The value of the setting as set for the world/client.
     */
    static getSettingValue(settingKey) {
        return game.settings.get(MODULE_NAME, settingKey);
    }
}

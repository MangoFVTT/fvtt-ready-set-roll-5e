import { MODULE_NAME, MODULE_SHORT } from "../module/const.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";

/**
 * Enumerable of identifiers for setting names.
 * @enum {String}
 */
export const SETTING_NAMES = {
    ROLL_MODIFIER_MODE: "rollModifierMode",
    QUICK_SKILL_ENABLED: "enableSkillQuickRoll",
    QUICK_ABILITY_ENABLED: "enableAbilityQuickRoll",
    QUICK_DEATH_ENABLED: "enableDeathQuickRoll",
    QUICK_ITEM_ENABLED: "enableItemQuickRoll",
    ALT_ROLL_ENABLED: "enableAltQuickRoll",
    SITU_ROLL_ENABLED: "enableSituQuickRoll",
    QUICK_ROLL_DESC_ENABLED: "enableQuickRollDesc",
    D20_ICONS_ENABLED: "enableD20Icons",
    DICE_SOUNDS_ENABLED: "enableDiceSounds",
    DICE_REROLL_ENABLED: "enableDiceReroll",
    OVERLAY_BUTTONS_ENABLED: "enableOverlayButtons",
    APPLY_EFFECTS_ENABLED: "enableApplyEffects",
    ALWAYS_APPLY_CRIT: "alwaysApplyCrit",
    APPLY_DAMAGE_MODS: "applyDamageMods",
    APPLY_DAMAGE_TO: "applyDamageTo",
    APPLY_EFFECTS_TO: "applyEffectsTo",
    PLACEMENT_ROLL_TITLE: "placementRollTitle",
    PLACEMENT_DAMAGE_TITLE: "placementDamageTitle",
    PLACEMENT_DAMAGE_CONTEXT: "placementDamageContext",
    PLACEMENT_DAMAGE_TYPE: "placementDamageType",
    CONTEXT_REPLACE_TITLE: "contextReplacesTitle",
    CONTEXT_REPLACE_DAMAGE: "contextReplacesDamage",
    DEFAULT_ROLL_ART: "defaultRollArt",
    HIDE_SAVE_DC: "hideSaveDC",
    SHOW_SKILL_ABILITIES: "showSkillAbilities",
    ALWAYS_ROLL_MULTIROLL: "alwaysRollMulti",
    MANUAL_DAMAGE_MODE: "manualDamageMode"
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

        // QUICK ROLL SETTINGS        
		const quickRollOptions = [
            { name: SETTING_NAMES.QUICK_ABILITY_ENABLED, default: true },
            { name: SETTING_NAMES.QUICK_SKILL_ENABLED, default: true },
            { name: SETTING_NAMES.QUICK_DEATH_ENABLED, default: true },
            { name: SETTING_NAMES.QUICK_ITEM_ENABLED, default: true }
        ];

        quickRollOptions.forEach(option => {
            game.settings.register(MODULE_NAME, option.name, {
                name: CoreUtility.localize(`${MODULE_SHORT}.settings.${option.name}.name`),
                hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${option.name}.hint`),
                scope: "world",
                config: true,
                type: Boolean,
                default: option.default,
                requiresReload: true
            });
        });

        // ADDITIONAL ROLL SETTINGS
        const extraRollOptions = [
            { name: SETTING_NAMES.ALT_ROLL_ENABLED, default: false, scope: "world" },
            { name: SETTING_NAMES.SITU_ROLL_ENABLED, default: false, scope: "world" },
            { name: SETTING_NAMES.QUICK_ROLL_DESC_ENABLED, default: false, scope: "world" },
            { name: SETTING_NAMES.ALWAYS_ROLL_MULTIROLL, default: false, scope: "client"  }
        ];

        extraRollOptions.forEach(option => {
            game.settings.register(MODULE_NAME, option.name, {
                name: CoreUtility.localize(`${MODULE_SHORT}.settings.${option.name}.name`),
                hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${option.name}.hint`),
                scope: option.scope,
                config: true,
                type: Boolean,
                default: option.default,
            });
        });

        game.settings.register(MODULE_NAME, SETTING_NAMES.MANUAL_DAMAGE_MODE, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.MANUAL_DAMAGE_MODE}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.MANUAL_DAMAGE_MODE}.hint`),
            scope: "client",
            config: true,
            type: Number,
            default: 0,
            choices: {
                0: CoreUtility.localize(`${MODULE_SHORT}.choices.manual.0`),
                1: CoreUtility.localize(`${MODULE_SHORT}.choices.manual.1`),
                2: CoreUtility.localize(`${MODULE_SHORT}.choices.manual.2`)
            }
        });

        // CHAT CARD OPTIONS
        const chatCardOptions = [
            { name: SETTING_NAMES.DICE_REROLL_ENABLED, default: true },
            { name: SETTING_NAMES.OVERLAY_BUTTONS_ENABLED, default: true },
            { name: SETTING_NAMES.ALWAYS_APPLY_CRIT, default: true },
            { name: SETTING_NAMES.APPLY_DAMAGE_MODS, default: false },
        ]        

        chatCardOptions.forEach(option => {
            game.settings.register(MODULE_NAME, option.name, {
                name: CoreUtility.localize(`${MODULE_SHORT}.settings.${option.name}.name`),
                hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${option.name}.hint`),
                scope: "world",
                config: true,
                type: Boolean,
                default: option.default,
                requiresReload: true
            });
        });
        
        game.settings.register(MODULE_NAME, SETTING_NAMES.APPLY_DAMAGE_TO, {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.APPLY_DAMAGE_TO}.name`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.APPLY_DAMAGE_TO}.hint`),
            scope: "world",
            config: true,
            type: Number,
            default: 0,
            requiresReload: true,
            choices: {
                0: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.0`),
                1: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.1`),
                2: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.2`),
                3: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.3`),
                4: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.4`)
            }
        });
        
        // EFFECTS OPTIONS
        if (CoreUtility.hasDAE()) {
            game.settings.register(MODULE_NAME, SETTING_NAMES.APPLY_EFFECTS_ENABLED, {
                name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.APPLY_EFFECTS_ENABLED}.name`),
                hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.APPLY_EFFECTS_ENABLED}.hint`),
                scope: "world",
                config: true,
                type: Boolean,
                default: false,
                requiresReload: true
            });        
            
            game.settings.register(MODULE_NAME, SETTING_NAMES.APPLY_EFFECTS_TO, {
                name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.APPLY_EFFECTS_TO}.name`),
                hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.APPLY_EFFECTS_TO}.hint`),
                scope: "world",
                config: true,
                type: Number,
                default: 0,
                requiresReload: true,
                choices: {
                    0: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.0`),
                    1: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.1`),
                    2: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.2`),
                    3: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.3`),
                    4: CoreUtility.localize(`${MODULE_SHORT}.choices.apply.4`)
                }
            });
        }

        // INTERFACE OPTIONS
        game.settings.register(MODULE_NAME, SETTING_NAMES.SHOW_SKILL_ABILITIES, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_SKILL_ABILITIES}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.SHOW_SKILL_ABILITIES}.hint`),
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
            requiresReload: true
		});

        game.settings.register(MODULE_NAME, SETTING_NAMES.D20_ICONS_ENABLED, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.D20_ICONS_ENABLED}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.D20_ICONS_ENABLED}.hint`),
			scope: "world",
			config: true,
			type: Boolean,
			default: true
		});

        game.settings.register(MODULE_NAME, SETTING_NAMES.DICE_SOUNDS_ENABLED, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.DICE_SOUNDS_ENABLED}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.DICE_SOUNDS_ENABLED}.hint`),
			scope: "world",
			config: true,
			type: Boolean,
			default: true
		});
        
        // PLACEMENT OPTIONS
		const placementOptions = [
            SETTING_NAMES.PLACEMENT_DAMAGE_TITLE,
            SETTING_NAMES.PLACEMENT_DAMAGE_CONTEXT,
            SETTING_NAMES.PLACEMENT_DAMAGE_TYPE
        ];

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

        placementOptions.forEach(option => {
            game.settings.register(MODULE_NAME, option, {
                name: CoreUtility.localize(`${MODULE_SHORT}.settings.${option}.name`),
                hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${option}.hint`),
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

        // CONTEXT SETTINGS
        const contextOptions = [
            SETTING_NAMES.CONTEXT_REPLACE_TITLE,
            SETTING_NAMES.CONTEXT_REPLACE_DAMAGE
        ];

		contextOptions.forEach(option => {
			game.settings.register(MODULE_NAME, option, {
				name: CoreUtility.localize(`${MODULE_SHORT}.settings.${option}.name`),
				hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${option}.hint`),
				scope: "world",
				config: true,
				type: Boolean,
				default: false
			});
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

        game.settings.register(MODULE_NAME, SETTING_NAMES.HIDE_SAVE_DC, {
			name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.HIDE_SAVE_DC}.name`),
			hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.HIDE_SAVE_DC}.hint`),
			scope: "world",
			config: true,
			type: Number,
			default: 0,
			choices: {
				0: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.HIDE_SAVE_DC}.0`),
				1: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.HIDE_SAVE_DC}.1`),
                2: CoreUtility.localize(`${MODULE_SHORT}.choices.${SETTING_NAMES.HIDE_SAVE_DC}.2`)
			}
		});
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

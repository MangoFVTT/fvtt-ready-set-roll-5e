import { MODULE_SHORT, MODULE_TITLE } from "../module/const.js";
import { MODULE_DSN } from "../module/integration.js";
import { ChatUtility } from "./chat.js";
import { CoreUtility } from "./core.js";
import { ItemUtility } from "./item.js";
import { LogUtility } from "./log.js";
import { RollUtility } from "./roll.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";
import { SheetUtility } from "./sheet.js";

export const HOOKS_CORE = {
    INIT: "init",
    READY: "ready"
}

export const HOOKS_DND5E = {
    PRE_ROLL_ABILITY_TEST: "dnd5e.preRollAbilityTest",
    PRE_ROLL_ABILITY_SAVE: "dnd5e.preRollAbilitySave",
    PRE_ROLL_DEATH_SAVE: "dnd5e.preRollDeathSave",
    PRE_ROLL_SKILL: "dnd5e.preRollSkill",
    PRE_ROLL_TOOL_CHECK: "dnd5e.preRollToolCheck",
    PRE_ROLL_DAMAGE: "dnd5e.preRollDamage",
    PRE_USE_ITEM: "dnd5e.preUseItem",
    PRE_DISPLAY_CARD: "dnd5e.preDisplayCard",
    DISPLAY_CARD: "dnd5e.displayCard",
    RENDER_CHAT_MESSAGE: "dnd5e.renderChatMessage",    
    RENDER_ITEM_SHEET: "renderItemSheet5e",
    RENDER_ACTOR_SHEET: "renderActorSheet5e",
}

export const HOOKS_INTEGRATION = {
    DSN_ROLL_COMPLETE: "diceSoNiceRollComplete"
}

/**
 * Utility class to handle registering listeners for hooks needed throughout the module.
 */
export class HooksUtility {
    /**
     * Register all necessary hooks for the module as a whole.
     */
    static registerModuleHooks() {
        Hooks.once(HOOKS_CORE.INIT, () => {
            LogUtility.log(`Initialising ${MODULE_TITLE}`);
            
            SettingsUtility.registerSettings();

            HooksUtility.registerRollHooks();
            HooksUtility.registerChatHooks();
        });

        Hooks.on(HOOKS_CORE.READY, () => {
            CONFIG[MODULE_SHORT].combinedDamageTypes = foundry.utils.mergeObject(
                Object.fromEntries(Object.entries(CONFIG.DND5E.damageTypes).map(([k, v]) => [k, v.label])),
                Object.fromEntries(Object.entries(CONFIG.DND5E.healingTypes).map(([k, v]) => [k, v.label])),
                { recursive: false }
            );

            if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) { 
                CONFIG.DND5E.aggregateDamageDisplay = false;
            }

            HooksUtility.registerSheetHooks();
            HooksUtility.registerIntegrationHooks();

            LogUtility.log(`Loaded ${MODULE_TITLE}`);
        });
    }

    /**
     * Register roll specific hooks for module functionality.
     */
    static registerRollHooks() {
        LogUtility.log("Registering roll hooks");

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ABILITY_ENABLED)) { 
            Hooks.on(HOOKS_DND5E.PRE_ROLL_ABILITY_TEST, (actor, config, abilityId) => {
                RollUtility.processActorRoll(config);
                return true;
            });

            Hooks.on(HOOKS_DND5E.PRE_ROLL_ABILITY_SAVE, (actor, config, abilityId) => {
                RollUtility.processActorRoll(config);
                return true;
            });
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_SKILL_ENABLED)) { 
            Hooks.on(HOOKS_DND5E.PRE_ROLL_SKILL, (actor, config, skillId) => {
                RollUtility.processActorRoll(config);
                return true;
            });
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_DEATH_ENABLED)) { 
            Hooks.on(HOOKS_DND5E.PRE_ROLL_DEATH_SAVE, (actor, config) => {
                RollUtility.processActorRoll(config);
                return true;
            });
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_TOOL_ENABLED)) { 
            Hooks.on(HOOKS_DND5E.PRE_ROLL_TOOL_CHECK, (item, config) => {
                RollUtility.processActorRoll(config);
                return true;
            });
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) { 
            Hooks.on(HOOKS_DND5E.PRE_USE_ITEM, (item, config, options) => {               
                if (item && CONFIG[MODULE_SHORT].validItemTypes.includes(item.type)) {                    
                    RollUtility.processItemRoll(options);
                }

                return true;
            });

            Hooks.on(HOOKS_DND5E.PRE_DISPLAY_CARD, async (item, card, options) => {
                ItemUtility.setRenderFlags(item, card);
            });

            Hooks.on(HOOKS_DND5E.PRE_ROLL_DAMAGE, (item, config) => {
                ItemUtility.processItemDamageConfig(item, config);
                return true;
            });
        }
    }

    /**
     * Register chat specific hooks for module functionality.
     */
    static registerChatHooks() {
        LogUtility.log("Registering chat hooks");

        Hooks.on(HOOKS_DND5E.RENDER_CHAT_MESSAGE, (message, html) => {
            ChatUtility.processChatMessage(message, html);
        });
    }

    /**
     * Register sheet specific hooks for module functionality.
     */
    static registerSheetHooks() {
        LogUtility.log("Registering sheet hooks");
        
        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) { 
            Hooks.on(HOOKS_DND5E.RENDER_ITEM_SHEET, (app, html, data) => {
                SheetUtility.setAutoHeightOnSheet(app);
                SheetUtility.addModuleContentToItemSheet(app, html);
            });

            ItemSheet.prototype._onChangeTab = function _onChangeTab(event, tabs, active) {
                SheetUtility.setAutoHeightOnSheet(this);
            }
        }
    }

    static registerIntegrationHooks() {
        LogUtility.log("Registering integration hooks");
    }
}
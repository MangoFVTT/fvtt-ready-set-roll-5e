import { MODULE_SHORT, MODULE_TITLE } from "../module/const.js";
import { MODULE_AA } from "../module/integration.js";
import { ActivityUtility } from "./activity.js";
import { ChatUtility } from "./chat.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { ROLL_TYPE, RollUtility } from "./roll.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

export const HOOKS_CORE = {
    INIT: "init",
    READY: "ready"
}

export const HOOKS_DND5E = {
    PRE_ROLL_ABILITY_CHECK: "dnd5e.preRollAbilityCheckV2",
    PRE_ROLL_SAVING_THROW: "dnd5e.preRollSavingThrowV2",
    PRE_ROLL_SKILL: "dnd5e.preRollSkillV2",
    PRE_ROLL_TOOL_CHECK: "dnd5e.preRollToolV2",
    PRE_ROLL_ATTACK: "dnd5e.preRollAttackV2",
    PRE_ROLL_DAMAGE: "dnd5e.preRollDamageV2",
    PRE_USE_ACTIVITY: "dnd5e.preUseActivity",
    POST_USE_ACTIVITY: "dnd5e.postUseActivity",
    ACTIVITY_CONSUMPTION: "dnd5e.activityConsumption",
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
            
            CONFIG.DND5E.aggregateDamageDisplay = SettingsUtility.getSettingValue(SETTING_NAMES.AGGREGATE_DAMAGE) ?? true;

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
            Hooks.on(HOOKS_DND5E.PRE_ROLL_ABILITY_CHECK, (config, dialog, message) => {
                RollUtility.processRoll(config, dialog, message);
                return true;
            });

            Hooks.on(HOOKS_DND5E.PRE_ROLL_SAVING_THROW, (config, dialog, message) => {
                RollUtility.processRoll(config, dialog, message);
                return true;
            });
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_SKILL_ENABLED)) { 
            Hooks.on(HOOKS_DND5E.PRE_ROLL_SKILL, (config, dialog, message) => {
                RollUtility.processRoll(config, dialog, message);
                return true;
            });
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_TOOL_ENABLED)) { 
            Hooks.on(HOOKS_DND5E.PRE_ROLL_TOOL_CHECK, (config, dialog, message) => {
                RollUtility.processRoll(config, dialog, message);
                return true;
            });
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ACTIVITY_ENABLED)) {
            Hooks.on(HOOKS_DND5E.PRE_USE_ACTIVITY, (activity, usageConfig, dialogConfig, messageConfig) => {
                RollUtility.processActivity(usageConfig, dialogConfig, messageConfig);
                ActivityUtility.setRenderFlags(activity, messageConfig);
                return true;
            });

            Hooks.on(HOOKS_DND5E.POST_USE_ACTIVITY, (activity, usageConfig, results) => {
                return CoreUtility.hasModule(MODULE_AA);
            });

            Hooks.on(HOOKS_DND5E.PRE_ROLL_ATTACK, (config, dialog, message) => {                
                if (!message.data?.flags || !message.data.flags[MODULE_SHORT]?.quickRoll) return true;

                for (const roll of config.rolls) {
                    roll.options.advantage ??= config.advantage;
                    roll.options.disadvantage ??= config.disadvantage; 
                }

                dialog.configure = false;

                return true;
            });

            Hooks.on(HOOKS_DND5E.PRE_ROLL_DAMAGE, (config, dialog, message) => {
                if (!message.data?.flags || !message.data.flags[MODULE_SHORT]?.quickRoll) return true;

                for ( const roll of config.rolls ) {
                    roll.options ??= {};
                    roll.options.isCritical ??= config.isCritical;
                }
        
                dialog.configure = false;

                return true;
            });           

            Hooks.on(HOOKS_DND5E.ACTIVITY_CONSUMPTION, (activity, usageConfig, messageConfig, updates) => {
                if (activity.hasOwnProperty(ROLL_TYPE.ATTACK) && updates.item.length > 0 && messageConfig.data) {
                    const ammo = updates.item.find(i => i["system.quantity"]);
                    if (!ammo) return;
                    messageConfig.data.flags[MODULE_SHORT].ammunition = ammo._id;
                    ammo["system.quantity"]++;
                }
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
    }

    static registerIntegrationHooks() {
        LogUtility.log("Registering integration hooks");
    }
}
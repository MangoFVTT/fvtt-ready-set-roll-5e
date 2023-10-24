import { MODULE_SHORT, MODULE_TITLE } from "../module/const.js";
import { PatchingUtility } from "./patching.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";
import { RollUtility } from "./roll.js";
import { SheetUtility } from "./sheet.js";
import { ItemUtility } from "./item.js";
import { ChatUtility } from "./chat.js";
import { MacroUtility } from "./macro.js";
import { QueryUtility } from "./query.js";

export const HOOKS_CORE = {
    INIT: "init",
    READY: "ready",
    CREATE_ITEM: "createItem",
    RENDER_CHAT_MSG: "renderChatMessage"
}

export const HOOKS_DND5E = {
    USE_ITEM: "dnd5e.useItem",
    PRE_DISPLAY_CARD: "dnd5e.preDisplayCard",
    DISPLAY_CARD: "dnd5e.displayCard",
    PRE_ROLL_SKILL: "dnd5e.preRollSkill",
    PRE_ROLL_TOOL: "dnd5e.preRollToolCheck",
    RENDER_ITEM_SHEET: "renderItemSheet5e",
    RENDER_ACTOR_SHEET: "renderActorSheet5e"
}

export const HOOKS_MODULE = {
    LOADED: `${MODULE_SHORT}.loaded`,
    RENDER: `${MODULE_SHORT}.render`,
    PROCESSED_ROLL: `${MODULE_SHORT}.rollProcessed`
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

            if (!libWrapper.is_fallback && !libWrapper.version_at_least?.(1, 4, 0)) {
                Hooks.once(HOOKS_CORE.READY, () => {
                    const version = "v1.4.0.0";                    
                    LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.libWrapperMinVersion`, { version }));
                });        
                return;
            }

            SettingsUtility.registerSettings();
            PatchingUtility.patchActors();
            PatchingUtility.patchItems();
            PatchingUtility.patchItemSheets();
                        
            HooksUtility.registerChatHooks();
            HooksUtility.registerTestHooks();
        });

        Hooks.on(HOOKS_CORE.READY, () => {
            // Setup specific fixed calls for the module
            window[MODULE_SHORT] = {
                macro: MacroUtility.getMacroList(),
                query: QueryUtility.processQuery
            }

            Hooks.call(HOOKS_MODULE.LOADED);
        });

        Hooks.on(HOOKS_MODULE.LOADED, () => {
            LogUtility.log(`Loaded ${MODULE_TITLE}`);

            CONFIG[MODULE_SHORT].combinedDamageTypes = foundry.utils.mergeObject(
                foundry.utils.duplicate(CONFIG.DND5E.damageTypes),
                foundry.utils.duplicate(CONFIG.DND5E.healingTypes),
                { recursive: false }
            );

            const combinedToolIds = foundry.utils.mergeObject(
                foundry.utils.duplicate(CONFIG.DND5E.toolIds),
                foundry.utils.duplicate(CONFIG.DND5E.vehicleTypes),
                { recursive: false }
            );

            CONFIG[MODULE_SHORT].combinedToolTypes = foundry.utils.mergeObject(
                combinedToolIds,
                foundry.utils.duplicate(CONFIG.DND5E.toolProficiencies),
                { recursive: false }
            );

            if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) { 
                HooksUtility.registerSheetHooks();
                HooksUtility.registerItemHooks();
            }
        });
    }

    static registerTestHooks() {
    }

    /**
     * Register item specific hooks for module functionality.
     */
    static registerItemHooks() {
        Hooks.on(HOOKS_CORE.CREATE_ITEM, (item) => {
            ItemUtility.ensureFlagsOnitem(item);
        });

        Hooks.on(HOOKS_DND5E.USE_ITEM, (item, config, options) => {
            if (!options?.ignore) {
                RollUtility.rollItem(item, foundry.utils.mergeObject(config, options, { recursive: false }));
            }
        });
    }

    /**
     * Register chat specific hooks for module functionality.
     */
    static registerChatHooks() {
        Hooks.on(HOOKS_CORE.RENDER_CHAT_MSG, (message, html, data) => {
            ChatUtility.bindChatCard(message, html);           
        });
    }

    /**
     * Register sheet specific hooks for module functionality.
     */
    static registerSheetHooks() {
        Hooks.on(HOOKS_DND5E.RENDER_ITEM_SHEET, (app, html, data) => {
            SheetUtility.setAutoHeightOnSheet(app);
            SheetUtility.addModuleContentToItemSheet(app, html);
        });

        Hooks.on(HOOKS_DND5E.RENDER_ACTOR_SHEET, (app, html, data) => {
            SheetUtility.addModuleContentToActorSheet(app, html);
        });
    }
}
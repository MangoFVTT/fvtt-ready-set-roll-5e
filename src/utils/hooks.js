import { MODULE_SHORT, MODULE_TITLE } from "../module/const.js";
import { PatchingUtility } from "./patching.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";
import { RollUtility } from "./roll.js";
import { SheetUtility } from "./sheet.js";
import { ItemUtility } from "./item.js";

// A list of module specific hooks that are fired throughout the module.
export const HOOK_LOADED = `${MODULE_SHORT}.loaded`;
export const HOOK_CHAT_MESSAGE = `${MODULE_SHORT}.chatMessage`;
export const HOOK_RENDER = `${MODULE_SHORT}.render`;
export const HOOK_PROCESSED_ROLL = `${MODULE_SHORT}.rollProcessed`;

/**
 * Utility class to handle registering listeners for hooks needed throughout the module.
 */
export class HooksUtility {
    /**
     * Register all necessary hooks for the module as a whole.
     */
    static registerModuleHooks() {
        Hooks.once("init", () => {
            LogUtility.log(`Initialising ${MODULE_TITLE}`);

            if (!libWrapper.is_fallback && !libWrapper.version_at_least?.(1, 4, 0)) {
                Hooks.once("ready", () => {
                    const version = "v1.4.0.0";                    
                    LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.libWrapperMinVersion`, { version }));
                });        
                return;
            }

            SettingsUtility.registerSettings();
            PatchingUtility.patchActors();
            PatchingUtility.patchItems();
            PatchingUtility.patchItemSheets();
        });

        Hooks.on(HOOK_LOADED, () => {          
            LogUtility.log(`Loaded ${MODULE_TITLE}`);
            CONFIG[`${MODULE_SHORT}`].combinedDamageTypes = foundry.utils.mergeObject(
                CONFIG.DND5E.damageTypes,
                CONFIG.DND5E.healingTypes,
                { recursive: false }
            );
            
            HooksUtility.registerChatHooks();

            if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) { 
                HooksUtility.registerSheetHooks();
                HooksUtility.registerItemHooks();
            }
        });

        Hooks.on("ready", () => {
            Hooks.call(HOOK_LOADED);
        });
    }

    /**
     * Register item specific hooks for module functionality.
     */
    static registerItemHooks() {
        Hooks.on("createItem", (item) => {
            ItemUtility.ensureFlagsOnitem(item);
        });

        Hooks.on("dnd5e.useItem", (item, config, options) => {
            if (!options?.ignore) {
                RollUtility.rollItem(item, { ...config, ...options });
            }
        });
    }

    /**
     * Register chat specific hooks for module functionality.
     */
    static registerChatHooks() {

    }

    /**
     * Register sheet specific hooks for module functionality.
     */
    static registerSheetHooks() {
        Hooks.on("renderItemSheet5e", (app, html, data) => {
            SheetUtility.setAutoHeightOnSheet(app);
            SheetUtility.addModuleContentToSheet(app, html);
        });
    }
}
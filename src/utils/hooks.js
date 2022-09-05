import { MODULE_SHORT, MODULE_TITLE } from "../module/const.js";
import { PatchingUtility } from "./patching.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { SettingsUtility } from "./settings.js";
import { RollUtility } from "./roll.js";
import { SheetUtility } from "./sheet.js";
import { ItemUtility } from "./item.js";

export const HOOK_LOADED = `${MODULE_SHORT}.loaded`;
export const HOOK_CHAT_MESSAGE = `${MODULE_SHORT}.chatMessage`;
export const HOOK_RENDER = `${MODULE_SHORT}.render`;
export const HOOK_PROCESSED_ROLL = `${MODULE_SHORT}.rollProcessed`;

export class HooksUtility {
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

        Hooks.on("ready", () => {
            Hooks.call(HOOK_LOADED);
        });

        Hooks.on(HOOK_LOADED, () => {          
            LogUtility.log(`Loaded ${MODULE_TITLE}`);
            CONFIG[`${MODULE_SHORT}`].combinedDamageTypes = foundry.utils.mergeObject(
                CONFIG.DND5E.damageTypes,
                CONFIG.DND5E.healingTypes,
                { recursive: false }
            );

            HooksUtility.registerChatHooks();
            HooksUtility.registerSheetHooks();
        });
    }

    static registerItemHooks() {
        Hooks.on("createItem", (item) => {
            ItemUtility.ensureFlagsOnItem(item);
        });

        Hooks.on("dnd5e.useItem", (item, config, options) => {
            if (!options?.ignore) {
                RollUtility.rollItem(item, { ...config, ...options });
            }
        });
    }

    static registerChatHooks() {

    }

    static registerSheetHooks() {
        Hooks.on("renderItemSheet5e", (app, html, data) => {
            SheetUtility.setAutoHeightOnSheet(app);
            SheetUtility.addModuleContentToSheet(app, html);
        });
    }
}
import { MODULE_TITLE } from "../data/const.js";
import { PatchingUtility } from "./patching.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { SettingsUtility } from "./settings.js";

export class HooksUtility {
    static registerHooks() {
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
        });

        Hooks.on("ready", () => {
            Hooks.call("loadedReadySetRoll5e");
        });

        Hooks.on("loadedReadySetRoll5e", () => {            
            LogUtility.log(`Loaded ${MODULE_TITLE}`);
        });
    }
}
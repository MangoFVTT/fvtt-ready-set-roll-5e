import { MODULE_TITLE } from "./utils/const.js";
import { LogUtility } from "./utils/log.js";
import { SettingsUtility } from "./settings.js";

export class HooksUtility {
    static registerHooks() {
        // Registers all module settings
        Hooks.once("init", () => {
            LogUtility.log(`Initialising ${MODULE_TITLE}`)
            SettingsUtility.registerSettings();
        });

        Hooks.on("ready", () => {
            Hooks.call("loadedReadySetRoll");
        });
    }
}
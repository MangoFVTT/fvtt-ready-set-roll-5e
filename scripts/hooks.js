import { MODULE_NAME } from "./utils/const.js";
import { LogUtility } from "./utils/log.js";
import { SettingsUtility } from "./settings.js";

export class HooksUtility {
    static registerHooks() {
        // Registers all module settings
        Hooks.once("init", () => {
            SettingsUtility.registerSettings();
        });

        // Attaches module to actor sheet
        Hooks.on("renderActorSheet5e", (app, html, data) => {
            const triggeringElement = ".item .item-name h4";
            const buttonContainer = ".item-properties";

            // this timeout allows other modules to modify the sheet before we do
            setTimeout(() => {
                if (game.settings.get(MODULE_NAME, "rollButtonsEnabled")) {
                    LogUtility.log("test");
                    //addItemSheetButtons(app.object, html, data, triggeringElement, buttonContainer)
                }
            }, 0);
        });
    }
}
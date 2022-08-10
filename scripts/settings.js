import { MODULE_NAME, MODULE_SHORT } from "./utils/const.js";
import { CoreUtility } from "./utils/core.js";
import { LogUtility } from "./utils/log.js";

export const SETTING_NAMES = {
    ROLL_BUTTONS_ENABLED: "rollButtonsEnabled"
}

export class SettingsUtility {
    static registerSettings() {
        LogUtility.log("Registering Settings");
        
        game.settings.register(MODULE_NAME, SETTING_NAMES.ROLL_BUTTONS_ENABLED,
        {
            name: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ROLL_BUTTONS_ENABLED}.label`),
            hint: CoreUtility.localize(`${MODULE_SHORT}.settings.${SETTING_NAMES.ROLL_BUTTONS_ENABLED}.hint`),
            scope: "world",
            config: true,
            default: true,
            type: Boolean
        });
    }
    
    static getSettingLocalOrDefault(settingKey) {
       return game.settings.get(MODULE_NAME, settingKey);
    }
}
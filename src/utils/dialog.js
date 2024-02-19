import { CoreUtility } from "./core.js";

/**
 * Utility class for handing configuration dialogs.
 */
export class DialogUtility {
    static getConfirmDialog(title, options) {
        return new Promise(resolve => { 
            const data = {
                title,
                content: "",
                buttons: {
                    yes: {
                        icon: '<i class="fa-solid fa-check"></i>',
                        label: CoreUtility.localize("Yes"),
                        callback: () => { resolve(true); }
                    },
                    no: {
                        icon: '<i class="fa-solid fa-xmark"></i>',
                        label: CoreUtility.localize("No"),
                        callback: () => { resolve(false); }
                    }
                },
                default: "yes"
            }

            new Dialog(data, options).render(true);
        });
    }
}

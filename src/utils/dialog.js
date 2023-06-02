import { LogUtility } from "./log.js";
import { RenderUtility } from "./render.js";

/**
 * Utility class for handing configuration dialogs.
 */
export class DialogUtility {
    static async getBonusFromDialog(groups = []) {
        LogUtility.log(`Retrieving situational bonuses from dialog.`);

        if (groups.length === 0) {
            return;
        }

        const html = await RenderUtility.renderDialogBonus({ groups });
        
        return new Promise((resolve, reject) => {
            new Dialog({
                title: `Configure Situational Bonuses`,
                content: html,
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Confirm',
                        callback: html => resolve(Array.from(html.find('[name="rsr-bonus"]')).map(e => { 
                            return { id: e.id, value: e.value }
                        }))
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel'
                    }
                },
                default: "yes"
            }, {}).render(true);
        });
    }
}
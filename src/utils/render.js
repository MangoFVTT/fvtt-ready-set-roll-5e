import { TEMPLATE } from "../module/templates.js";
import { RollUtility } from "./roll.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

/**
 * Utility class to handle all rendering from provided fields into HTML data.
 */
export class RenderUtility {
    /**
     * Renders a module template for the specified render type.
     * @param {TEMPLATE} template The requested template to render.
     * @param {Object} data Field metadata for rendering.
     * @returns {Promise<String>} The rendered html data for the field. 
     */
    static render(template, data) {
        switch (template) {
            case TEMPLATE.MULTIROLL:
                return _renderMultiRoll(data);
            case TEMPLATE.DAMAGE:
                return _renderDamageRoll(data);
            default:
                return _renderModuleTemplate(template, data)
        }
    }
}

async function _renderMultiRoll(data = {}) {
    const { roll, key } = data;
    const entries = [];

    // Process bonuses beyond the base d20s into a single roll.
    const bonusTerms = roll.terms.slice(1);
    const bonusRoll = (bonusTerms && bonusTerms.length > 0) ? Roll.fromTerms(bonusTerms) : null;

    const d20Rolls = roll.dice.find(d => d.faces === 20);

    for (let i = 0; i < d20Rolls.results.length; i++) {
        let tmpResults = [];
        tmpResults.push(duplicate(d20Rolls.results[i]));

        while (d20Rolls?.results[i]?.rerolled && !d20Rolls?.results[i]?.count) {
            if ((i + 1) >= d20Rolls.results.length) {
                break;
            }

            i++;
            tmpResults.push(duplicate(d20Rolls.results[i]));
        }

        const critOptions = { 
            critThreshold: roll.options.critical,
            fumbleThreshold: roll.options.fumble,
            targetValue: roll.options.targetValue
        };

        // Die terms must have active results or the base roll total of the generated roll is 0.
        // This does not apply to dice that have been rerolled (unless they are replaced by a fixer value eg. for reliable talent).
        tmpResults.forEach(r => {
            r.active = !(r.rerolled && !r.count) ?? true; 
        });

        const baseTerm = new Die({
            number: 1,
            faces: 20,
            results: tmpResults,
            modifiers: d20Rolls.modifiers
        });
        const baseRoll = Roll.fromTerms([baseTerm]);

        entries.push({
			roll: baseRoll,
			total: baseRoll.total + (bonusRoll?.total ?? 0),
			ignored: tmpResults.some(r => r.discarded) ? true : undefined,
			critType: RollUtility.getCritTypeForDie(baseTerm, critOptions),
            d20Result: SettingsUtility.getSettingValue(SETTING_NAMES.D20_ICONS_ENABLED) ? d20Rolls.results[i].result : null
		});
    }

    return _renderModuleTemplate(TEMPLATE.MULTIROLL, { entries, key });
}

async function _renderDamageRoll(data = {}) {
    const { roll } = data;

    return _renderModuleTemplate(TEMPLATE.DAMAGE, { total: roll.total });
}

/**
 * Shortcut function to render a custom template from the templates folder.
 * @param {String} template Name (or sub path) of the template in the templates folder.
 * @param {Object} data The template data to render the template with.
 * @returns {Promise<string>} A rendered html template.
 * @private
 */
function _renderModuleTemplate(template, data) {
    //return renderTemplate(`modules/${MODULE_NAME}/templates/${template}`, data);
    return renderTemplate(`modules/ready-set-roll-5e-v3/templates/${template}`, data);
}
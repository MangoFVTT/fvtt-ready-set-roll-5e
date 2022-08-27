import { CoreUtility } from "./core.js";
import { TEMPLATE } from "../module/templates.js"
import { DEFAULT_IMG, MODULE_NAME } from "../module/const.js";
import { RollUtility } from "./roll.js";

export const FIELD_TYPE = {
    HEADER: 'header',
    CHECK: 'check'
}

export class RenderUtility {
    static async renderFromField(field, metadata) {
        let [fieldType, fieldData] = field;
        fieldData = mergeObject(metadata, fieldData ?? {}, { recursive: false });

        switch (fieldType) {
            case FIELD_TYPE.HEADER:
                return renderHeader(fieldData);
            case FIELD_TYPE.CHECK:
                return await renderMultiRoll(fieldData);
        }
    }

    static renderFullCard(props) {
        return renderModuleTemplate(TEMPLATE.FULL_CARD, props);
    }
}

/**
 * Model data for rendering the header template.
 * @typedef HeaderDataProps
 * @type {object}
 * @property {FIELD_TYPE.HEADER} type
 * @property {number} id
 * @property {string} img image path to show in the box
 * @property {string} title header title text
 */

function renderHeader(renderData = {}) {
    const { id, item, slotLevel } = renderData;
    const actor = renderData?.actor ?? item?.actor;
    const img = renderData.img ?? item?.img ?? CoreUtility.getActorImage(actor);
    let title = renderData.title ?? item?.name ?? actor?.name ?? '';

    if (item?.data.type === "spell" && slotLevel && slotLevel != item.data.data.level) {
        title += ` (${dnd5e.spellLevels[slotLevel]})`;
    }

    return renderModuleTemplate(TEMPLATE.HEADER, {
        id,
        item: { img: img ?? DEFAULT_IMG, name: title },
        slotLevel
    });
}

async function renderMultiRoll(renderData = {}) {
    const { id, roll, isMultiRoll } = renderData;
    console.log(roll);

    const entries = [];

    // Process bonuses beyond the d20s into a single roll.
    const bonusTerms = roll.terms.slice(1);
    const bonusRoll = bonusTerms ? Roll.fromTerms(bonusTerms) : null;

    const d20Rolls = roll.dice.find(d => d.faces === 20);
    for (let i = 0; i < d20Rolls.number; i++) {
        // All results need to be active before creating a die term, otherwise the base roll total of the generated roll is 0.
        let tmpResult = d20Rolls.results[i];
        tmpResult.active = true;

        const baseTerm = new Die({number: 1, faces: 20, results: [tmpResult]});
        const baseRoll = Roll.fromTerms([baseTerm]);

        entries.push({
			roll: baseRoll,
			total: baseRoll.total + (bonusRoll?.total ?? 0),
			ignored: d20Rolls.results[i].discarded ? true : undefined,
			isCrit: roll.isCritical,
			critType: RollUtility.getCritType(baseTerm),
            d20Result: d20Rolls.results[i].result
		});
    }

    // Generate tooltips
    const tooltips = await Promise.all(entries.map(e => e.roll.getTooltip()));
    const bonusTooltip = await bonusRoll?.getTooltip();

    return renderModuleTemplate(TEMPLATE.MULTIROLL, {
        id,
        title: undefined,
        formula: roll.formula,
        entries,
        tooltips,
        bonusTooltip
    });
}

/**
 * Shortcut function to render a custom template from the templates folder.
 * @param {string} template Name (or sub path) of the template in the templates folder.
 * @param {Object} props The props data to render the template with.
 * @returns {Promise<string>} A rendered html template.
 */
function renderModuleTemplate(template, props) {
    return renderTemplate(`modules/${MODULE_NAME}/templates/${template}`, props);
}


import { TEMPLATE } from "../module/templates.js"
import { DEFAULT_IMG, MODULE_NAME, MODULE_SHORT } from "../module/const.js";
import { CoreUtility } from "./core.js";
import { RollUtility, ROLL_TYPE } from "./roll.js";
import { ITEM_TYPE } from "./item.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";

/**
 * A list of different field types that can be provided.
 * @enum {String}
 */
export const FIELD_TYPE = {
    HEADER: 'header',
    FOOTER: 'footer',
    DESCRIPTION: 'description',
    CHECK: 'check',
    ATTACK: 'attack',
    DAMAGE: 'damage',
    SAVE: 'save',
    MANUAL: 'manual',
    EFFECTS: 'effects',
    BLANK: 'blank',
}

/**
 * Utility class to handle all rendering from provided fields into HTML data.
 */
export class RenderUtility {
    /**
     * Handles individual field types and renders the appropriate template.
     * @param {Object} field Data and type for the requested field.
     * @param {Object} metadata Additional metadata for rendering.
     * @returns {Promise<String>|String} The rendered html data for the field. 
     */
    static async renderFromField(field, metadata) {
        let [fieldType, fieldData] = field;
        fieldData = mergeObject(metadata, fieldData ?? {}, { recursive: false });

        switch (fieldType) {
            case FIELD_TYPE.BLANK:
                return _renderBlank(fieldData);
            case FIELD_TYPE.HEADER:
                return _renderHeader(fieldData);
            case FIELD_TYPE.FOOTER:
                return _renderFooter(fieldData);
            case FIELD_TYPE.DESCRIPTION:
                return _renderDescription(fieldData);
            case FIELD_TYPE.SAVE:
                return _renderSaveButton(fieldData);
            case FIELD_TYPE.MANUAL:
                return _renderDamageButton(fieldData);
            case FIELD_TYPE.EFFECTS:
                return _renderEffectsButton(fieldData);
            case FIELD_TYPE.CHECK:
                return _renderMultiRoll(fieldData);
            case FIELD_TYPE.ATTACK:
                return _renderAttackRoll(fieldData);
            case FIELD_TYPE.DAMAGE:
                return _renderDamageRoll(fieldData);
        }
    }

    /**
     * Renders a full module chat card with all the fields provided as props.
     * @param {object} props The necessary render props for the template.
     * @returns {Promise<String>} The rendered html data for the chat card.
     */
    static renderFullCard(props) {
        return _renderModuleTemplate(TEMPLATE.FULL_CARD, props);
    }

    /**
     * Renders a user interface for creating roll configurations, which is added to the item sheet.
     * @param {object} props The necessary render props for the template.
     * @returns {Promise<String>} The rendered html data for the item sheet.
     */
    static renderItemOptions(props) {
        return _renderModuleTemplate(TEMPLATE.OPTIONS, props);
    }

    /**
     * Renders overlay buttons for applying damage from a chat card.
     * @returns {Promise<String>} The rendered html data for the chat card.
     */
    static renderOverlayDamage() {
        return _renderModuleTemplate(TEMPLATE.OVERLAY_DAMAGE, {});
    }    

     /**
     * Renders overlay buttons for retroactively applying advantage/disadvantage/crit to a chat card.
     * @returns {Promise<String>} The rendered html data for the chat card.
     */
    static renderOverlayMultiRoll() {
        return _renderModuleTemplate(TEMPLATE.OVERLAY_MULTIROLL, {});
    }

    /**
     * Renders overlay buttons for repeating a roll from a chat card.
     * @returns {Promise<String>} The rendered html data for the chat card.
     */
    static renderOverlayHeader() {
        return _renderModuleTemplate(TEMPLATE.OVERLAY_HEADER, {});
    }

    /**
     * Renders a user interface for resolving a situational bonus striung.
     * @returns {Promise<String>} The rendered html data for the item sheet.
     */
    static renderDialogBonus(props) {
        return _renderModuleTemplate(TEMPLATE.DIALOG_BONUS, props);
    }
}

function _renderBlank(renderData = {}) {
    const { id, display } = renderData;

    return _renderModuleTemplate(TEMPLATE.BLANK, {
        id,
        display
    });
}

function _renderHeader(renderData = {}) {
    const { id, item, slotLevel } = renderData;
    const actor = renderData?.actor ?? item?.actor;
    const img = renderData.img ?? item?.img ?? CoreUtility.getActorImage(actor);
    const spellLevel = item?.system.level;
    let title = renderData.title ?? item?.name ?? actor?.name ?? '';

    if (item?.type === ITEM_TYPE.SPELL && slotLevel && slotLevel != spellLevel) {
        title += ` (${CONFIG.DND5E.spellLevels[slotLevel]})`;
    }

    if (item?.type === ITEM_TYPE.TOOL) {
        title += ` (${CONFIG.DND5E.abilities[item.system.ability].label})`;
    }

    return _renderModuleTemplate(TEMPLATE.HEADER, {
        id,
        img: img ?? DEFAULT_IMG,
        title: title ?? "Default",
        slotLevel
    });
}

function _renderFooter(renderData = {}) {
    const { properties } = renderData;

    return _renderModuleTemplate(TEMPLATE.FOOTER, {
        properties
    });
}

function _renderDescription(renderData = {}) {
    const { content, isFlavor } = renderData;

    return _renderModuleTemplate(TEMPLATE.DESCRIPTION, {
        content,
        isFlavor
    });
}

function _renderSaveButton(renderData = {}) {
    const { id, ability, dc, hideDC } = renderData;    

    const abilityLabel = CONFIG.DND5E.abilities[ability].label;

    return _renderModuleTemplate(TEMPLATE.SAVE_BUTTON, {
        id,
        ability,
        abilityLabel,
        hideDC,
        dc
    });
}

function _renderDamageButton(renderData = {}) {
    const { id } = renderData;

    return _renderModuleTemplate(TEMPLATE.DAMAGE_BUTTON, {
        id
    });
}

function _renderEffectsButton(renderData = {}) {
    const { id } = renderData;

    return _renderModuleTemplate(TEMPLATE.EFFECTS_BUTTON, {
        id
    });
}

async function _renderMultiRoll(renderData = {}) {
    const { id, roll, title, rollType, rollState } = renderData;
    const entries = [];

    // Process bonuses beyond the base d20s into a single roll.
    const bonusTerms = roll.terms.slice(1);
    const bonusRoll = (bonusTerms && bonusTerms.length > 0) ? Roll.fromTerms(bonusTerms) : null;

    const d20Rolls = roll.dice.find(d => d.faces === 20);

    for (let i = 0; i < d20Rolls.results.length; i++) {
        let tmpResults = [];
        tmpResults.push(d20Rolls.results[i]);

        while (d20Rolls?.results[i]?.rerolled && !d20Rolls?.results[i]?.count) {
            if ((i + 1) >= d20Rolls.results.length) {
                break;
            }

            i++;
            tmpResults.push(d20Rolls.results[i]);
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

    // Generate tooltips (the expandable dice roll information in a chat message).
    const tooltips = await Promise.all(entries.map(e => e.roll.getTooltip()));
    const bonusTooltip = await bonusRoll?.getTooltip();

    return _renderModuleTemplate(TEMPLATE.MULTIROLL, {
        id,
        title,
        formula: roll.formula,
        entries,
        tooltips,
        bonusTooltip,
        rollType,
        rollState,
    });
}

async function _renderAttackRoll(renderData = {}) {
    const { consume } = renderData;

    const title = renderData.title ??
        `${CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.ATTACK}`)} ${consume ? `[${consume.name}]` : ""}`;

    renderData = mergeObject({ title }, renderData ?? {}, { recursive: false });

    return _renderMultiRoll(renderData);
}

async function _renderDamageRoll(renderData = {}) {
    const { id, damageType, baseRoll, critRoll, context, versatile } = renderData;
    
    // If there's no content in the damage roll, silently end rendering the field.
    if (baseRoll?.terms.length === 0 && critRoll?.terms.length === 0) return;

    // Get relevant settings for generating the chat card
    const titlePlacement = SettingsUtility.getSettingValue(SETTING_NAMES.PLACEMENT_DAMAGE_TITLE);
    const typePlacement = SettingsUtility.getSettingValue(SETTING_NAMES.PLACEMENT_DAMAGE_TYPE);
    const contextPlacement = SettingsUtility.getSettingValue(SETTING_NAMES.PLACEMENT_DAMAGE_CONTEXT);
    const replaceTitle = SettingsUtility.getSettingValue(SETTING_NAMES.CONTEXT_REPLACE_TITLE);
    const replaceDamage = SettingsUtility.getSettingValue(SETTING_NAMES.CONTEXT_REPLACE_DAMAGE);

    // Generate damage title and context strings
    const labels = {
        1: [],
        2: [],
        3: []
    };

    let damagePrefix = "";
    let pushedTitle = false;
    
    if (CONFIG.DND5E.healingTypes[damageType]) {
        damagePrefix += CONFIG.DND5E.healingTypes[damageType];
    } else if (CONFIG.DND5E.damageTypes[damageType] || !damageType || damageType === '') {
        damagePrefix += CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.DAMAGE}`);
        damagePrefix += versatile ? ` [${CONFIG.DND5E.weaponProperties.ver}]` : "";
    } else if (damageType === ROLL_TYPE.OTHER) {
        damagePrefix += CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.OTHER}`);
    }

    if (titlePlacement !== 0 && !(replaceTitle && context && titlePlacement == contextPlacement)) {
        labels[titlePlacement].push(damagePrefix);
        pushedTitle = true;
    }

    if (context) {
        if (contextPlacement === titlePlacement && pushedTitle) {
            const titleTmp = labels[contextPlacement][0];
            labels[contextPlacement][0] = (titleTmp ? titleTmp + " " : "") + `(${context})`;
        } else if (contextPlacement !== "0") {
            labels[contextPlacement].push(context);
        }
    }

    const damageString = CONFIG.DND5E.damageTypes[damageType] ?? "";
    if (typePlacement !== "0" && damageString.length > 0 && !(replaceDamage && context && typePlacement == contextPlacement)) {
        labels[typePlacement].push(damageString);
    }

    for (let p in labels) {
        labels[p] = labels[p].join(" - ");
    };

    // Generate tooltips (the expandable dice roll information in a chat message).
    const tooltips = (await Promise.all([
        baseRoll?.getTooltip(),
        critRoll?.getTooltip()
    ])).filter(t => t);

    // Generate a formula string that displays rolled crit damage as well.
    let formula = baseRoll?.formula ?? "";    
    if (baseRoll?.formula && critRoll?.formula) {
        formula = formula.concat(" + ");
    }
    formula += critRoll?.formula ?? "";

    return _renderModuleTemplate(TEMPLATE.DAMAGE, {
        id,        
        damageRollType: ROLL_TYPE.DAMAGE,
        tooltips,
        base: baseRoll ? { roll: baseRoll, total: baseRoll.total, critType: RollUtility.getCritTypeForRoll(baseRoll) } : undefined,
        crit: critRoll ? { roll: critRoll, total: critRoll.total, critType: RollUtility.getCritTypeForRoll(critRoll) } : undefined,
        crittext: CoreUtility.localize(`${MODULE_SHORT}.chat.crit`),
        damagetop: labels[1],
        damagemid: labels[2],
        damagebottom: labels[3],
        formula,
        damageType,
    });
}

/**
 * Shortcut function to render a custom template from the templates folder.
 * @param {String} template Name (or sub path) of the template in the templates folder.
 * @param {Object} props The props data to render the template with.
 * @returns {Promise<string>} A rendered html template.
 * @private
 */
function _renderModuleTemplate(template, props) {
    return renderTemplate(`modules/${MODULE_NAME}/templates/${template}`, props);
}


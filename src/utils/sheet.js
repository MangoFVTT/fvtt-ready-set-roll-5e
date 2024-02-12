import { MODULE_SHORT } from "../module/const.js";
import { TEMPLATE } from "../module/templates.js";
import { CoreUtility } from "./core.js";
import { ITEM_TYPE, ItemUtility } from "./item.js";
import { LogUtility } from "./log.js";
import { RenderUtility } from "./render.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

let _activate = false;

/**
 * Utility class to handle additional sheet functionality for the module.
 */
export class SheetUtility {
    static setAutoHeightOnSheet(sheet) {
        sheet?.setPosition({ height: "auto" })
    }

    /**
     * Adds module content to an item sheet that is being opened.
     * @param {Sheet} sheet The sheet instance of the sheet being constructed.
     * @param {Object} protoHtml The html of the sheet being constructed.
     */
    static async addModuleContentToItemSheet(sheet, protoHtml) {
        const item = sheet?.object;

        if (!item || !item instanceof Item) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.objectNotExpectedType`, { type: "Item" }));
            return;
        }

        if (item.actor && item.actor.permission < 3) {
            return;
        }

        if (!CONFIG[MODULE_SHORT].validItemTypes.includes(item.type)) {
            return;
        }
        
        ItemUtility.refreshFlagsOnItem(item);

        let html = protoHtml;
        if (html[0].localName !== "div") {
            html = $(html[0].parentElement.parentElement);
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) {
            _addItemOptionsTab(html);
            _addDamageContextFields(item, html);
            await _addItemOptions(item, html);
        }        

        // Re-activate roll options tab if needed (after certain events it may be necessary).
        if (_activate) {
            sheet._tabs[0].activate(MODULE_SHORT);
            _activate = false;
        }
        
        if (sheet._tabs[0].active === MODULE_SHORT) {
            SheetUtility.setAutoHeightOnSheet(sheet);
        }
    }
}

/**
 * Adds an item options tab to the provided item sheet.
 * @param {JQuery} html The html data container of the sheet.
 * @private
 */
function _addItemOptionsTab(html) {
    const tabContainer = html.find("form nav.sheet-navigation.tabs");
    const tabTitle = `<a class="item" data-tab="${MODULE_SHORT}">${CoreUtility.localize(`${MODULE_SHORT}.sheet.tab.title`)}</a>`;

    tabContainer.append($(tabTitle));
}

/**
 * Adds roll configuration UI for a specific item sheet.
 * @param {Item} item The item to whom the sheet belongs.
 * @param {JQuery} html The html data container of the sheet.
 * @private
 */
async function _addItemOptions(item, html) {
    const settingsContainer = html.find(".sheet-body");

    const renderData = {
        dnd5e: CONFIG.DND5E,
        altRollEnabled: SettingsUtility.getSettingValue(SETTING_NAMES.ALT_ROLL_ENABLED),
        item,
        flags: item.flags,
        defLabel: CoreUtility.localize(`${MODULE_SHORT}.sheet.tab.section.defaultRoll`),
        altLabel: CoreUtility.localize(`${MODULE_SHORT}.sheet.tab.section.alternateRoll`),
        combinedDamageTypes: CONFIG[MODULE_SHORT].combinedDamageTypes,
        hasDamage: item.hasDamage,
        hasOther: item.system.formula ? true : false,
        isAttack: item.hasAttack,
        isSave: item.hasSave,
        isCheck: item.hasAbilityCheck || item.type === ITEM_TYPE.TOOL,
        isVersatile: item.isVersatile
    }

    const optionsTemplate = await RenderUtility.render(TEMPLATE.OPTIONS, renderData);

    settingsContainer.append(optionsTemplate);

    // Activate the quick roll tab if anything changes in any sub-field.
    // This is necessary because sometimes the sheet will revert to the original tab when re-rendering.
	const newSection = settingsContainer.find(".tab.rsr-item");
	newSection.find("input[type=text]").change(() => { _activate = true; });
	newSection.find("input[type=number]").change(() => { _activate = true; });
	newSection.find("input[type=checkbox]").change(() => {  _activate = true; });
	newSection.find("select").change(() => { _activate = true; });
}

/**
 * Adds context text fields to an item sheet next to all damage fields and the other formula field.
 * @param {Item} item The item to whom the sheet belongs.
 * @param {JQuery} html The html data container of the sheet.
 * @private 
 */
function _addDamageContextFields(item, html) {
    const damageRolls = html.find(".tab.details .damage-parts .damage-part input").toArray();
    const placeholder = `${MODULE_SHORT}.sheet.placeholder.context`;

    damageRolls.forEach((damageRoll, i) => {
        const contextField = $(`<input type="text" name="flags.${MODULE_SHORT}.quickDamage.context.${i}" value="${(item.flags[MODULE_SHORT].quickDamage.context[i] || "")}" placeholder="${CoreUtility.localize(placeholder)}" data-dtype="String" style="margin-left:5px;">`);

        damageRoll.after(contextField[0]);

        // Add event listener to delete context when damage is deleted
        $($($(damageRoll)[0].parentElement).find(`a.delete-damage`)).click(async _ => {
            const contextFlags = Object.values(item.flags[MODULE_SHORT].quickDamage.context);
            contextFlags.splice(i, 1);
            item.update({
                [`flags.${MODULE_SHORT}.quickDamage.context`]: contextFlags,
            });
        });
    });

    // Add context field for Other Formula field
    if (foundry.utils.getProperty(item, `flags.${MODULE_SHORT}.quickOther`)) {
        const otherRoll = html.find(`.tab.details .form-fields input[name="system.formula"]`);
        const otherContextField = $(`<input type="text" name="flags.${MODULE_SHORT}.quickOther.context" value="${(item.flags[MODULE_SHORT].quickOther.context || "")}" placeholder="${CoreUtility.localize(placeholder)}" data-dtype="String" style="margin-left:5px;">`);
        
        if (otherRoll[0]) {
            otherRoll[0].after(otherContextField[0]);
        }
    }
}
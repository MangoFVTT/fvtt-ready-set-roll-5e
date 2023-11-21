import { MODULE_SHORT } from "../module/const.js";
import { CoreUtility } from "./core.js";
import { ItemUtility, ITEM_TYPE } from "./item.js";
import { LogUtility } from "./log.js";
import { RenderUtility } from "./render.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";

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
        
        if  (sheet._tabs[0].active === MODULE_SHORT) {
            SheetUtility.setAutoHeightOnSheet(sheet);
        }
    }

    /**
     * Adds module content to an actor sheet that is being opened.
     * @param {Sheet} sheet The sheet instance of the sheet being constructed.
     * @param {Object} protoHtml The html of the sheet being constructed.
     */
    static async addModuleContentToActorSheet(sheet, protoHtml) {
        const actor = sheet?.object;

        if (!actor || !actor instanceof Actor) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.objectNotExpectedType`, { type: "Actor" }));
            return;
        }

        if (actor.permission < 3) {
            return;
        }

        let html = protoHtml;
        if (html[0].localName !== "div") {
            html = $(html[0].parentElement.parentElement);
        }

        if (SettingsUtility.getSettingValue(SETTING_NAMES.SITU_ROLL_ENABLED)) {
            _addSituRollListeners(actor, html);
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

    const properties = {
        dnd5e: CONFIG.DND5E,
        altRollEnabled: SettingsUtility.getSettingValue(SETTING_NAMES.ALT_ROLL_ENABLED),
        item,
        flags: item.flags,
        defLabel: CoreUtility.localize(`${MODULE_SHORT}.sheet.tab.section.defaultRoll`),
        altLabel: CoreUtility.localize(`${MODULE_SHORT}.sheet.tab.section.alternateRoll`),
        combinedDamageTypes: CONFIG[MODULE_SHORT].combinedDamageTypes,
        hasFlavor: item.system.chatFlavor && item.system.chatFlavor !== "",
        hasDamage: item.hasDamage,
        hasEffects: item.hasEffects,
        hasConsume: item.hasQuantity || item.hasLimitedUses || item.hasResource || item.hasAmmo,
        hasQuantity: item.hasQuantity,
        hasLimitedUses: item.hasLimitedUses,
        hasResource: item.hasResource || item.hasAmmo,
        hasRecharge: item.hasRecharge,
        hasOther: item.system.formula ? true : false,
        isAttack: item.hasAttack,
        isSave: item.hasSave,
        isCheck: item.hasAbilityCheck || item.type === ITEM_TYPE.TOOL,
        isVersatile: item.isVersatile,
        isAreaTarget: item.hasAreaTarget
    }

    const optionsTemplate = await RenderUtility.renderItemOptions(properties);

    settingsContainer.append(optionsTemplate);

    // Activate the quick roll tab if anything changes in any sub-field.
    // This is necessary because sometimes the sheet will revert to the original tab when re-rendering.
	const newSection = settingsContainer.find(".tab.item-rsr5e");
	newSection.find("input[type=text]").change(() => { _activate = true; });
	newSection.find("input[type=number]").change(() => { _activate = true; });
	newSection.find("input[type=checkbox]").change(() => {  _activate = true; });
	newSection.find("select").change(() => { _activate = true; });
}

/**
 * Adds listeners in a number of locations for rolling with a situational bonus dialog.
 * Listeners are only added in the specific location if the relevant quick roll is enabled.
 * @param {Actor} actor The actor for which the listeners are being added.
 * @param {JQuery} html The html of the sheet in which listeners are being added.
 */
function _addSituRollListeners(actor, html) {
    if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_SKILL_ENABLED)) {
        html.find(".skill-name").on("auxclick", evt => {
            if (evt.button !== CONFIG[MODULE_SHORT].situRollMouseButton) {
                return;
            }

            evt.preventDefault();
            const skill = evt.currentTarget.closest("[data-key]").dataset.key;
            return actor.rollSkill(skill, {event: evt});
        });

        html.find(".tool-name").on("auxclick", evt => {
            if (evt.button !== CONFIG[MODULE_SHORT].situRollMouseButton) {
                return;
            }
    
            evt.preventDefault();
            const tool = evt.currentTarget.closest("[data-key]").dataset.key;
            return actor.rollToolCheck(tool, {event: evt});
        });    
    }

    if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ABILITY_ENABLED)) {
        html.find(".ability-name").on("auxclick", evt => {        
            if (evt.button !== CONFIG[MODULE_SHORT].situRollMouseButton) {
                return;
            }

            evt.preventDefault();
            const ability = evt.currentTarget.parentElement.dataset.ability;
            return actor.rollAbility(ability, {event: evt});
        });
    }

    if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_DEATH_ENABLED)) {
        html.find(".rollable[data-action]").on("auxclick", async evt => {
            if (evt.button !== CONFIG[MODULE_SHORT].situRollMouseButton) {
                return;
            }

            evt.preventDefault();
            const button = evt.currentTarget;

            if (button.dataset.action === "rollDeathSave") {
                return actor.rollDeathSave({event: evt});
            }
        });
    }

    if (SettingsUtility.getSettingValue(SETTING_NAMES.QUICK_ITEM_ENABLED)) {
        html.find(".rollable .item-image").on("auxclick", async evt => {
            if (evt.button !== CONFIG[MODULE_SHORT].situRollMouseButton) {
                return;
            }

            evt.preventDefault();
            const itemId = evt.currentTarget.closest(".item").dataset.itemId;
            const item = actor.items.get(itemId);
            return item.use({}, {event: evt});
        });        
    }
}

/**
 * Adds context text fields to an item sheet next to all damage fields and the other formula field.
 * @param {Item} item The item to whom the sheet belongs.
 * @param {JQuery} html The html data container of the sheet.
 * @private 
 */
function _addDamageContextFields(item, html) {
    if (SettingsUtility.getSettingValue(SETTING_NAMES.PLACEMENT_DAMAGE_CONTEXT) === 0) {
        return;
    }

    const damageRolls = html.find(".tab.details .damage-parts .damage-part input").toArray();
    const placeholder = SettingsUtility.getSettingValue(SETTING_NAMES.CONTEXT_REPLACE_DAMAGE) ? `${MODULE_SHORT}.sheet.placeholder.label` : `${MODULE_SHORT}.sheet.placeholder.context`;

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
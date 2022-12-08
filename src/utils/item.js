import { MODULE_SHORT } from "../module/const.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { FIELD_TYPE } from "./render.js";
import { RollUtility, ROLL_TYPE } from "./roll.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";

/**
 * Enumerable of identifiers for different types of dnd5e items.
 * @enum {String}
 */
export const ITEM_TYPE = {
    WEAPON: "weapon",
    EQUIPMENT: "equipment",
    CONSUMABLE: "consumable",
    TOOL: "tool",
    CONTAINER: "backpack",
    LOOT: "loot",
    FEATURE: "feat",
    SPELL: "spell",
    BACKGROUND: "background",
    CLASS: "class",
    ADVENTURINGGEAR: "adventuringgear",
    AMMO: "ammo",
    ARCHETYPEFEATURES: "archetypefeatures",
    ARCHETYPES: "archetypes",
    ARMOR: "armor",
    BACKGROUNDS: "backgrounds",
    BLASTERS: "blasters",
    CLASSES: "classes",
    CLASSFEATURES: "classfeatures",
    CONSUMABLES: "consumables",
    DEPLOYMENTFEATURES: "deploymentfeatures",
    DEPLOYMENTS: "deployments",
    ENHANCEDITEMS: "enhanceditems",
    EXPLOSIVES: "explosives",
    FEATS: "feats",
    FIGHTINGSTYLES: "fightingstyles",
    FIGHTINGMASTERIES: "fightingmasteries",
    GAMINGSETS: "gamingsets",
    IMPLEMENTS: "implements",
    INVOCATIONS: "invocations",
    KITS: "kits",
    LIGHTSABERFORM: "lightsaberform",
    LIGHTWEAPONS: "lightweapons",
    MANEUVERS: "maneuvers",
    MONSTERTRAITS: "monstertraits",
    MODIFICATIONS: "modifications",
    MUSICALINSTRUMENTS: "musicalinstruments",
    SPECIES: "species",
    SPECIESFEATURES: "speciesfeatures",
    STARSHIPACTIONS: "starshipactions",
    STARSHIPARMOR: "starshiparmor",
    STARSHIPEQUIPMENT: "starshipequipment",
    STARSHIPFEATURES: "starshipfeatures",
    STARSHIPMODIFICATIONS: "starshipmodifications",
    STARSHIPS: "starships",
    STARSHIPWEAPONS: "starshipweapons",
    POWER: "power",
    VENTURES: "ventures",
    VIBROWEAPONS: "vibroweapons"
}

/**
 * Utility class to handle setting and retrieving information to/from items.
 */
export class ItemUtility {
    /**
     * Generates a list of the different fields required for this item roll.
     * Will only generate fields that are available and enabled via the roll configuraton flags.
     * @param {Item} item The item from which to retrieve the roll fields.
     * @param {Object} params Addtional parameters for the item roll.
     * @returns {Promies<Array>} A list of fields as specified by the roll configuration.
     */
    static async getFieldsFromItem(item, params) {
        ItemUtility.ensureFlagsOnitem(item);
        ItemUtility.ensureItemParams(item, params);

        const manualDamage = SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_MANUAL_DAMAGE);
        const chatData = await item.getChatData();
        let fields = [];


        if (ItemUtility.getFlagValueFromItem(item, "quickFlavor", params.isAltRoll)) {
            _addFieldFlavor(fields, chatData);
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickDesc", params.isAltRoll)) {
            _addFieldDescription(fields, chatData);
        }

        if (!fields.some(f => f[0] === FIELD_TYPE.DESCRIPTION)) {
            fields.push([FIELD_TYPE.BLANK, { display: false }]);
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickSave", params.isAltRoll)) {
            _addFieldSave(fields, item);
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickAttack", params.isAltRoll)) {
            await _addFieldAttack(fields, item, params);
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickCheck", params.isAltRoll)) {
            await _addFieldAbilityCheck(fields, item, params);
        }

        if (manualDamage) {
            _addFieldDamageButton(fields, item);
        }

        if (params.damageFlags && !manualDamage) {
            await _addFieldDamage(fields, item, params);
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickOther", params.isAltRoll)) {
            await _addFieldOtherFormula(fields, item);
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickFooter", params.isAltRoll)) {
            _addFieldFooter(fields, chatData);
        }

        return fields;
    }

    /**
     * Generates a list of specific fields from this item roll, instead of generating all.
     * Will only generate fields if they are available and enabled via the roll configuraton flags.
     * @param {Item} item The item from which to retrieve the roll fields.
     * @param {Object} params Addtional parameters for the item roll.
     * @param {FIELD_TYPE} filter The list of field types to actually generate.
     * @returns {Promies<Array>} A list of fields requested as specified by the roll configuration.
     */
    static async getSpecificFieldsFromItem(item, params, filter) {
        ItemUtility.ensureFlagsOnitem(item);
        ItemUtility.ensureItemParams(item, params);

        const chatData = await item.getChatData();
        let fields = [];

        for (const type of filter) {
            switch (type) {
                case FIELD_TYPE.DAMAGE:
                    await _addFieldDamage(fields, item, params);
                    break;
            }
        }

        return fields;
    }

    /**
     * Retrieves a roll configuration to pass to the default Foundry VTT item.use().
     * This configuration largely handles what the item will consume, as specified in the roll configuration tab.
     * @param {Item} item The item from which to retrieve the roll configuration.
     * @param {Boolean} isAltRoll Whether to check the alternate roll configuration for the item or not.
     * @returns {Object} A roll configuration in the format necessary for the dnd5e system.
     */
    static getRollConfigFromItem(item, isAltRoll = false) {
        ItemUtility.ensureFlagsOnitem(item);
        ItemUtility.ensureConsumePropertiesOnItem(item);

        const config = {}

        if (item?.hasAreaTarget && item?.flags[MODULE_SHORT].quickTemplate) {
            config.createMeasuredTemplate = item.flags[MODULE_SHORT].quickTemplate[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasQuantity && item?.flags[MODULE_SHORT].consumeQuantity) {
            config.consumeQuantity = item.flags[MODULE_SHORT].consumeQuantity[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasUses && item?.flags[MODULE_SHORT].consumeUses) {
            config.consumeUsage = item.flags[MODULE_SHORT].consumeUses[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasResource && item?.flags[MODULE_SHORT].consumeResource) {
            config.consumeResource = item.flags[MODULE_SHORT].consumeResource[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasRecharge && item?.flags[MODULE_SHORT].consumeRecharge) {
            config.consumeRecharge = item.flags[MODULE_SHORT].consumeRecharge[isAltRoll ? "altValue" : "value"];
        }

        return config;
    }

    /**
     * Gets a specific value for a set module flag from an item.
     * @param {Item} item The item from which to retrieve the flag value.
     * @param {String} flag The identifier of the flag to retrieve.
     * @param {Boolean} isAltRoll Whether to check the alternate roll configuration for the item or not.
     * @returns {Boolean} Whether the flag is set to true or false.
     */
    static getFlagValueFromItem(item, flag, isAltRoll = false) {
        if (item?.flags[MODULE_SHORT][flag]) {
            return item.flags[MODULE_SHORT][flag][isAltRoll ? "altValue" : "value"] ?? false;
        }

        return false;
    }

    /**
     * Gets a specific context field for a given damage field index.
     * @param {Item} item The item from which to retrieve the context value.
     * @param {Number} index The index of the damage field for which to get context.
     * @returns
     */
    static getDamageContextFromItem(item, index) {
        if (item?.flags[MODULE_SHORT].quickDamage) {
            return item.flags[MODULE_SHORT].quickDamage.context[index] ?? undefined;
        }

        return undefined;
    }

    /**
     * Checks the specified item to make sure specific consume booleans exist.
     * These booleans give a quick indication on if the item has that specific consume property.
     * @param {Item} item The item on which to ensure consume properties exist.
     */
    static ensureConsumePropertiesOnItem(item) {
        if (item) {
            // For items with quantity (weapons, tools, consumables...)
            item.hasQuantity = ("quantity" in item.system);
            // For items with "Limited Uses" configured
            item.hasUses = !!(item.system.uses?.value || item.system.uses?.max || item.system.uses?.per);
            // For items with "Resource Consumption" configured
            item.hasResource = !!(item.system.consume?.target);
            // For abilities with "Action Recharge" configured
            item.hasRecharge = !!(item.system.recharge?.value);
        }
    }

    /**
     *
     * @param {Item} item
     * @param {Object} params
     */
    static ensureItemParams(item, params) {
        params = params ?? {};
        params.isAltRoll = params?.isAltRoll ?? false;
        params.damageFlags = ItemUtility.getFlagValueFromItem(item, "quickDamage", params.isAltRoll);
        params.versatile = ItemUtility.getFlagValueFromItem(item, "quickVersatile", params.isAltRoll);
        params.elvenAccuracy = (item.actor?.flags?.sw5e?.elvenAccuracy &&
            CONFIG.SW5E.characterFlags.elvenAccuracy.abilities.includes(item.abilityMod)) || undefined
    }

    /**
     * Checks the specified item to make sure module flags exist on it, and generates them if not.
     * @param {Item} item The item on which to ensure flags exist.
     */
    static ensureFlagsOnitem(item) {
        if (!item || !CONFIG[MODULE_SHORT].validItemTypes.includes(item.type)) {
            return;
        }
        if (item.flags && item.flags[MODULE_SHORT]) {
            return;
        }

        this.refreshFlagsOnItem(item);
    }

    /**
     * Refreshes the stored flags on an item or generates them from default if they don't exist.
     * @param {Item} item The item on which to refresh module flags.
     */
    static refreshFlagsOnItem(item) {
        LogUtility.log(`Refreshing ${MODULE_SHORT} item flags.`);

        if (!item || !CONFIG[MODULE_SHORT].validItemTypes.includes(item.type)) {
            return;
        }

        item.flags = item.flags ?? {};

        const baseFlags = foundry.utils.duplicate(CONFIG[MODULE_SHORT].flags[item.type]);
        let moduleFlags = item.flags[MODULE_SHORT] ?? {};
        moduleFlags = foundry.utils.mergeObject(baseFlags, moduleFlags ?? {});

        // If quickDamage flags should exist, update them based on which damage formulae are available
        if (CONFIG[MODULE_SHORT].flags[item.type].quickDamage) {
            let newQuickDamageValues = [];
            let newQuickDamageAltValues = [];

            // Make quickDamage flags if they don't exist
            if (!moduleFlags.quickDamage) {
                moduleFlags.quickDamage = { type: "Array", value: [], altValue: [] };
            }

            for (let i = 0; i < item.system.damage?.parts.length; i++) {
                newQuickDamageValues[i] = moduleFlags.quickDamage.value[i] ?? true;
                newQuickDamageAltValues[i] = moduleFlags.quickDamage.altValue[i] ?? true;
            }

            moduleFlags.quickDamage.value = newQuickDamageValues;
            moduleFlags.quickDamage.altValue = newQuickDamageAltValues;
        }

        item.flags[MODULE_SHORT] = moduleFlags;

        ItemUtility.ensureConsumePropertiesOnItem(item);
    }
}

/**
 * Gets the given item's targeted item for consuming (generally ammunition).
 * @param {Item} item The item to search for consume targets.
 * @returns The target item to consume.
 * @private
 */
function _getConsumeTargetFromItem(item) {
    if (item.system.consume.type === "ammo") {
        return item.actor.items.get(item.system.consume.target);
    }

    return undefined;
}

/**
 * Adds a render field for item chat flavor.
 * @param {Array} fields The current array of fields to add to.
 * @param {Object} chatData The chat data for the item (from item.getChatData).
 * @private
 */
function _addFieldFlavor(fields, chatData) {
    if (chatData.chatFlavor && chatData.chatFlavor !== "") {
        fields.push([
            FIELD_TYPE.DESCRIPTION,
            {
                content: chatData.chatFlavor,
                isFlavor: true
            }
        ]);
    }
}

/**
 * Adds a render field for item description.
 * @param {Array} fields The current array of fields to add to.
 * @param {Object} chatData The chat data for the item (from item.getChatData).
 * @private
 */
function _addFieldDescription(fields, chatData) {
    if (chatData.description && chatData.description.value !== "" && chatData.description.value !== "<p></p>") {
        fields.push([
            FIELD_TYPE.DESCRIPTION,
            {
                content: chatData.description.value,
                isFlavor: false
            }
        ]);
    }
}

/**
 * Adds a render field for item footer properties.
 * @param {Array} fields The current array of fields to add to.
 * @param {Object} chatData The chat data for the item (from item.getChatData).
 * @private
 */
function _addFieldFooter(fields, chatData) {
    fields.push([
        FIELD_TYPE.FOOTER,
        {
            properties: chatData.properties
        }
    ]);
}

/**
 * Adds a render field for item save DC button.
 * @param {Array} fields The current array of fields to add to.
 * @param {Item} item The item from which to derive the field.
 * @private
 */
function _addFieldSave(fields, item) {
    if (item.hasSave) {
        //const hideDCSetting = SettingsUtility.getSettingValue(SETTING_NAMES.HIDE_SAVE_DC);

        fields.push([
            FIELD_TYPE.SAVE,
            {
                ability: item.system.save.ability,
                dc: item.system.save.dc,
                //hideDC: (hideDCSetting === 2 || (hideDCSetting === 1 && item.actor.type === "npc"))
            }
        ]);
    }
}

/**
 * Adds a render field for manual damage roll button.
 * @param {Array} fields The current array of fields to add to.
 * @param {Item} item The item from which to derive the field.
 * @private
 */
function _addFieldDamageButton(fields, item) {
    if (item.hasDamage) {
        fields.push([
            FIELD_TYPE.MANUAL,
            {
            }
        ]);
    }
}

/**
 * Adds a render field for item attack roll.
 * @param {Array} fields The current array of fields to add to.
 * @param {Item} item The item from which to derive the field.
 * @param {Object} params Additional parameters for the attack roll.
 * @private
 */
async function _addFieldAttack(fields, item, params) {
    if (item.hasAttack) {
        // The dnd5e default attack roll automatically consumes ammo without any option for external configuration.
        // This code will bypass this consumption since we have already consumed or not consumed via the roll config earlier.
        let ammoConsumeBypass = false;
        if (item.system?.consume?.type === "ammo") {
            item.system.consume.type = "rsr5e";
            ammoConsumeBypass = true;
        }

        let roll = await item.rollAttack({
            fastForward: true,
            chatMessage: false,
            advantage: params?.advMode > 0 ?? false,
            disadvantage: params?.advMode < 0 ?? false
        });

        // Reset ammo type to avoid later issues.
        if (ammoConsumeBypass) {
            item.system.consume.type = "ammo";
        }

        // Adds a seperator for UI clarity.
        fields.push([FIELD_TYPE.BLANK, { display: true }]);

        fields.push([
            FIELD_TYPE.ATTACK,
            {
                roll: await RollUtility.ensureMultiRoll(roll, params),
                rollType: ROLL_TYPE.ATTACK,
                consume: _getConsumeTargetFromItem(item)
            }
        ]);
    }
}

/**
 * Adds render fields for item damage rolls and computes critical hits.
 * @param {Array} fields The current array of fields to add to.
 * @param {Item} item The item from which to derive the field.
 * @param {Object} params Additional parameters for the attack roll.
 * @private
 */
async function _addFieldDamage(fields, item, params) {
    if (item.hasDamage) {
        if (item.system.damage.parts.some(p => p[0] === '')) {
            LogUtility.logWarning(CoreUtility.localize(`${MODULE_SHORT}.messages.warning.emptyDamageField`));
            return;
        }

        const roll = await item.rollDamage({
            critical: false,
            versatile: params?.versatile ?? false,
            spellLevel: params?.slotLevel,
            options: {
                fastForward: true,
                chatMessage: false
            }
        });

        let damageTermGroups = [];
        let damageContextGroups = [];
        item.system.damage.parts.forEach((part, i) => {
            const tmpRoll = new CONFIG.Dice.DamageRoll(part[0], item.getRollData()).evaluate({ async: false });
            const partTerms = roll.terms.splice(0, tmpRoll.terms.length);
            roll.terms.shift();

            if (params?.damageFlags[i] ?? true) {
                damageTermGroups.push({ type: part[1], terms: partTerms });
                damageContextGroups.push(ItemUtility.getDamageContextFromItem(item, i));
            }
        });

        if (roll.terms.length > 0) {
            const plus = new OperatorTerm({ operator: "+" }).evaluate({ async: false });
            damageTermGroups[0].terms.push(plus);
            damageTermGroups[0].terms.push(...roll.terms);
        }

        for (const [i, group] of damageTermGroups.entries()) {
            const baseRoll = Roll.fromTerms(group.terms);

            let critRoll = null;
            if (params?.isCrit) {
                critRoll = await RollUtility.getCritRoll(baseRoll, i, item.getRollData(), roll.options);
            }

            fields.push([
                FIELD_TYPE.DAMAGE,
                {
                    damageType: group.type,
                    baseRoll,
                    critRoll,
                    context: damageContextGroups[i],
                    versatile: i !== 0 ? false : params?.versatile ?? false
                }
            ]);
        }
    }
}

/**
 * Adds a render field for item other formula.
 * @param {Array} fields The current array of fields to add to.
 * @param {Item} item The item from which to derive the field.
 * @private
 */
async function _addFieldOtherFormula(fields, item) {
    if (item.system.formula) {
        const otherRoll = await new Roll(item.system.formula, item.getRollData()).roll({ async: true });

        fields.push([
            FIELD_TYPE.DAMAGE,
            {
                damageType: ROLL_TYPE.OTHER,
                baseRoll: otherRoll,
                critRoll: undefined,
                context: item.flags[MODULE_SHORT].quickOther.context ?? undefined,
                versatile: false
            }
        ]);
    }
}

/**
 * Adds a render field for item tool check.
 * @param {Array} fields The current array of fields to add to.
 * @param {Item} item The item from which to derive the field.
 * @param {Object} params Additional parameters for the attack roll.
 * @private
 */
async function _addFieldAbilityCheck(fields, item, params) {
    if (item.type === ITEM_TYPE.TOOL) {
        const roll = await item.rollToolCheck({
            fastForward: true,
            chatMessage: false,
            advantage: params?.advMode > 0 ?? false,
            disadvantage: params?.advMode < 0 ?? false
        });

        fields.push([
            FIELD_TYPE.CHECK,
            {
                roll: await RollUtility.ensureMultiRoll(roll, params),
                rollType: ROLL_TYPE.ITEM
            }
        ]);
    } else if (item.hasAbilityCheck && item.actor) {
        if (!(item.hasAbilityCheck in CONFIG.SW5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: ability, dictionary: "CONFIG.SW5E.abilities" }));
            return;
        }

        const roll = await item.actor.rollAbilityTest(item.hasAbilityCheck, {
            fastForward: true,
            chatMessage: false,
            advantage: params?.advMode > 0 ?? false,
            disadvantage: params?.advMode < 0 ?? false
        });

        // Adds a seperator for UI clarity.
        fields.push([FIELD_TYPE.BLANK, { display: true }]);

        fields.push([
            FIELD_TYPE.ATTACK,
            {
                roll: await RollUtility.ensureMultiRoll(roll, params),
                rollType: ROLL_TYPE.ATTACK,
                title: `Ability Check - ${CONFIG.SW5E.abilities[item.hasAbilityCheck]}`
            }
        ]);
    }
}

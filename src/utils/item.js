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
    CLASS: "class"
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
        
        const manualDamageMode = SettingsUtility.getSettingValue(SETTING_NAMES.MANUAL_DAMAGE_MODE);
        const manualDamage = manualDamageMode === 2 || (manualDamageMode === 1 && item.hasAttack);
        const applyEffects = CoreUtility.hasDAE() && SettingsUtility.getSettingValue(SETTING_NAMES.APPLY_EFFECTS_ENABLED);
        const chatData = await item.getChatData();
        let fields = [];

        if (ItemUtility.getFlagValueFromItem(item, "quickFlavor", params.isAltRoll) && !params?.forceHideDescription) {
            _addFieldFlavor(fields, chatData);
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickDesc", params.isAltRoll) && !params?.forceHideDescription) {
            _addFieldDescription(fields, chatData);
        }

        if (!fields.some(f => f[0] === FIELD_TYPE.DESCRIPTION)) {
            fields.push([FIELD_TYPE.BLANK, { display: false }]);
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickSave", params.isAltRoll)) {
            _addFieldSaveButton(fields, item);
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

        if (params.effectFlags && applyEffects) {
            _addFieldEffectsButton(fields, item, params);
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
        ItemUtility.ensurePropertiesOnItem(item);

        const config = {}

        if (item?.hasAreaTarget && item?.flags[MODULE_SHORT].quickTemplate) { 
            config.createMeasuredTemplate = item.flags[MODULE_SHORT].quickTemplate[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasQuantity && item?.flags[MODULE_SHORT].consumeQuantity) {
            config.consumeQuantity = item.flags[MODULE_SHORT].consumeQuantity[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasLimitedUses && item?.flags[MODULE_SHORT].consumeUses) {
            config.consumeUsage = item.flags[MODULE_SHORT].consumeUses[isAltRoll ? "altValue" : "value"];
        }
        if ((item?.hasResource || item?.hasAmmo) && item?.flags[MODULE_SHORT].consumeResource) {
            config.consumeResource = item.flags[MODULE_SHORT].consumeResource[isAltRoll ? "altValue" : "value"];
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
            const consumeTarget = _getConsumeTargetFromItem(item);

            const itemPartsCount = item.system.damage.parts.length;
            const ammoPartsCount = consumeTarget?.system.damage.parts.length ?? 0;
            
            if (index < itemPartsCount) {
                return item.flags[MODULE_SHORT].quickDamage.context[index];
            }

            if (index < (itemPartsCount + ammoPartsCount)) {
                return consumeTarget?.name;
            }

            return CoreUtility.localize(`${MODULE_SHORT}.chat.bonus.bonus`);
        }

        return undefined;
    }

    /**
     * Checks the specified item to make sure specific consume booleans exist.
     * These booleans give a quick indication on if the item has that specific consume property.
     * @param {Item} item The item on which to ensure consume properties exist.
     */
    static ensurePropertiesOnItem(item) {
        if (!item) {
            return;
        }

        // Spells have their own configuration dialog for consumables, so no ened to use quick roll configuration.
        if (item.type !== ITEM_TYPE.SPELL) {
            // For items with quantity (weapons, tools, consumables...)
            item.hasQuantity = ("quantity" in item.system);
            // For abilities with "Action Recharge" configured
            item.hasRecharge = !!(item.system.recharge?.value);
        }

        if (CoreUtility.hasDAE() && SettingsUtility.getSettingValue(SETTING_NAMES.APPLY_EFFECTS_ENABLED)) {
            // For items with active effects (requires DAE to work, so check for module availability here)
            item.hasEffects = window.DAE && item.collections.effects.filter((effect) => !effect.disabled).length > 0;
        }
    }

    /**
     * Ensure that item parameters are available for the item roll, at least at default values.
     * @param {Item} item 
     * @param {Object} params 
     */
    static ensureItemParams(item, params) {
        params = params ?? {};
        params.isAltRoll = params?.isAltRoll ?? false;
        params.damageFlags = ItemUtility.getFlagValueFromItem(item, "quickDamage", params.isAltRoll);
        params.effectFlags = ItemUtility.getFlagValueFromItem(item, "quickEffects", params.isAltRoll);
        params.versatile = item.isVersatile ? ItemUtility.getFlagValueFromItem(item, "quickVersatile", params.isAltRoll) : false;
        params.elvenAccuracy = (item.actor?.flags?.dnd5e?.elvenAccuracy && 
            CONFIG.DND5E.characterFlags.elvenAccuracy.abilities.includes(item.abilityMod)) || undefined
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

        // If quick damage flags should exist, update them based on which damage formulae are available
        if (CONFIG[MODULE_SHORT].flags[item.type].quickDamage) {
            let newQuickDamageValues = [];
            let newQuickDamageAltValues = [];
            let newQuickDamageContexts = [];

            // Make quick damage flags if they don't exist
            if (!moduleFlags.quickDamage) {
                moduleFlags.quickDamage = { type: "Array", value: [], altValue: [], context: [] };
            }

            for (let i = 0; i < item.system.damage?.parts.length; i++) {
                newQuickDamageValues[i] = moduleFlags.quickDamage.value[i] ?? true;
                newQuickDamageAltValues[i] = moduleFlags.quickDamage.altValue[i] ?? true;
                newQuickDamageContexts[i] = moduleFlags.quickDamage.context[i] ?? "";
            }

            moduleFlags.quickDamage.value = newQuickDamageValues;
            moduleFlags.quickDamage.altValue = newQuickDamageAltValues;
            moduleFlags.quickDamage.context = newQuickDamageContexts;
        }

        // If quick effects flags should exist, update them based on which effects are active
        if (CONFIG[MODULE_SHORT].flags[item.type].quickEffects) {
            let newQuickEffectValues = [];
            let newQuickEffectAltValues = [];
            let newQuickEffectContexts = [];

            if (!moduleFlags.quickEffects) {
                moduleFlags.quickEffects = { type: "Array", value: [], altValue: [], context: [] };
            }

            const activeEffects = item.collections.effects.filter((effect) => !effect.disabled);

            for (let i = 0; i < activeEffects.length; i++) {
                newQuickEffectValues[i] = moduleFlags.quickEffects.value[i] ?? true;
                newQuickEffectAltValues[i] = moduleFlags.quickEffects.altValue[i] ?? true;
                newQuickEffectContexts[i] = activeEffects[i].label;
            }

            moduleFlags.quickEffects.value = newQuickEffectValues;
            moduleFlags.quickEffects.altValue = newQuickEffectAltValues;
            moduleFlags.quickEffects.context = newQuickEffectContexts;
        }

        item.flags[MODULE_SHORT] = moduleFlags;
        
        ItemUtility.ensurePropertiesOnItem(item);
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
        const target = item.actor.items.get(item.system.consume.target);
        ItemUtility.ensureFlagsOnitem(target);
        return target;
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
function _addFieldSaveButton(fields, item) {
    if (item.hasSave) {
        const hideDCSetting = SettingsUtility.getSettingValue(SETTING_NAMES.HIDE_SAVE_DC);

        fields.push([
            FIELD_TYPE.SAVE,
            {
                ability: item.system.save.ability,
                dc: item.system.save.dc,
                hideDC: (hideDCSetting === 2 || (hideDCSetting === 1 && item.actor.type === "npc"))
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
 * Adds a render field for apply active effects button.
 * @param {Array} fields The current array of fields to add to. 
 * @param {Item} item The item from which to derive the field.
 * @private
 */
 function _addFieldEffectsButton(fields, item, params) {    
    ItemUtility.ensurePropertiesOnItem(item);

    if (item.hasEffects) {
        if (!Object.values(params.effectFlags).some(f => f === true)) {
            return;
        }
       
        const activeEffects = item.collections.effects.filter((effect) => !effect.disabled);

        let effectsToApply = [];
        for (let i = 0; i < activeEffects.length; i++) {
            if (params?.effectFlags[i] ?? true) {
                effectsToApply.push(activeEffects[i]._id);
            }
        }

        fields.push([
            FIELD_TYPE.EFFECTS,
            {
                apply: effectsToApply
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
        let ammoConsumeAmount = null;
        if (item.system?.consume?.type === "ammo") {
            ammoConsumeAmount = item.system?.consume?.amount ?? 0;
            item.system.consume.amount = 0;
        }

        const bonuses = params?.bonuses?.filter(b => b.id === ROLL_TYPE.ATTACK).map(b => b.value);

        let roll = await item.rollAttack({
            fastForward: true,
            chatMessage: false,
            advantage: params?.advMode > 0 ?? false,
            disadvantage: params?.advMode < 0 ?? false,
            parts: bonuses
        });

        // Reset ammo to avoid later issues.
        if (ammoConsumeAmount) {
            item.system.consume.amount = ammoConsumeAmount;
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

        // Backup ammo damage so we can temporarily replace with versatile damage if needed.
        const ammoDamageBackup = item._ammo ? foundry.utils.duplicate(item._ammo?.system?.damage) : null;
        if (item._ammo && ItemUtility.getFlagValueFromItem(item._ammo, "quickVersatile", params.isAltRoll)) {
            item._ammo.system.damage.parts[0][0] = item._ammo.system.damage.versatile;
        }
        
        const damageParts = [ ...item.system.damage.parts ];
        if (item._ammo) {
            damageParts.push(...item._ammo.system.damage.parts);
        }

        const bonuses = params?.bonuses?.filter(b => b.id === ROLL_TYPE.DAMAGE && b.value !== '').map(b => b.value);
        if (bonuses && bonuses.length > 0) {
            damageParts.push(...bonuses.map(b => [ b, '' ]));
        }

        const roll = await item.rollDamage({
            critical: false,
            versatile: params?.versatile ?? false,
            spellLevel: params?.slotLevel,
            options: {
                fastForward: true,
                chatMessage: false,
                parts: bonuses
            }
        });

        // Restore ammo damage post rolling.
        if (ammoDamageBackup) {
            _getConsumeTargetFromItem(item).system.damage = ammoDamageBackup;
        }

        let damageTermGroups = [];
        let damageContextGroups = [];
        damageParts.forEach((part, i) => {
            const damagePart = (i === 0 && (params?.versatile ?? false)) ? item.system.damage.versatile : part[0];
            const tmpRoll = new CONFIG.Dice.DamageRoll(damagePart, item.getRollData()).evaluate({ async: false });
            const partTerms = roll.terms.splice(0, tmpRoll.terms.length);
            roll.terms.shift();

            if (params?.damageFlags[i] ?? true) {
                damageTermGroups.push({ type: part[1], terms: partTerms});
                damageContextGroups.push(ItemUtility.getDamageContextFromItem(item, i));
            }
        });

        if (roll.terms.length > 0) {
            const plus = new OperatorTerm({ operator: "+" }).evaluate({ async: false });
            damageTermGroups[0].terms.push(plus);
            damageTermGroups[0].terms.push(...roll.terms);
        }

        for (const [i, group] of damageTermGroups.entries()) {
            let baseRoll = Roll.fromTerms(group.terms);            
            let critRoll = null;

            if (params?.isCrit) {
                baseRoll = await RollUtility.getCritBaseRoll(baseRoll, i, item.getRollData(), roll.options);
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
        const bonuses = params?.bonuses?.filter(b => b.id === ROLL_TYPE.TOOL).map(b => b.value);

        const roll = await item.rollToolCheck({
            fastForward: true,
            chatMessage: false,
            advantage: params?.advMode > 0 ?? false,
            disadvantage: params?.advMode < 0 ?? false,
            parts: bonuses
        });

        fields.push([
            FIELD_TYPE.CHECK,
            {
                roll: await RollUtility.ensureMultiRoll(roll, params),
                rollType: ROLL_TYPE.ITEM
            }
        ]);
    } else if (item.hasAbilityCheck && item.actor) {
        if (!(item.abilityMod in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: item.abilityMod, dictionary: "CONFIG.DND5E.abilities" }));
            return;
		}
        
        const bonuses = params?.bonuses?.filter(b => b.id === ROLL_TYPE.ABILITY_TEST).map(b => b.value);

        const roll = await item.actor.rollAbilityTest(item.abilityMod, {
            fastForward: true,
            chatMessage: false,
            advantage: params?.advMode > 0 ?? false,
            disadvantage: params?.advMode < 0 ?? false,            
            parts: bonuses
        });

        // Adds a seperator for UI clarity.
        fields.push([FIELD_TYPE.BLANK, { display: true }]);

        fields.push([
            FIELD_TYPE.ATTACK,
            {
                roll: await RollUtility.ensureMultiRoll(roll, params),
                rollType: ROLL_TYPE.ATTACK,
                title: `Ability Check - ${CONFIG.DND5E.abilities[item.abilityMod].label}`
            }
        ]);
    }    
}

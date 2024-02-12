import { MODULE_SHORT } from "../module/const.js";
import { ChatUtility } from "./chat.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { ROLL_TYPE, RollUtility } from "./roll.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

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
     * Runs item actions and sets certain render flags depending on the item quick roll config.
     * @param {ChatMessage} card The item card from which to retrieve the item and on which to set flags.
     */
    static async runItemActions(card) {
        if (!card.flags || !card.flags[MODULE_SHORT]) {
            return;
        }
        
        if (!card.flags[MODULE_SHORT].quickRoll) {
            return;
        }

        const item = await _ensureItemFromCard(card);
        ItemUtility.ensureFlagsOnItem(item);

        card.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
        card.flags[MODULE_SHORT].rolls = {}
        card.flags[MODULE_SHORT].name = item.name;
        card.flags[MODULE_SHORT].isHealing = item.isHealing;

        if (!ItemUtility.getFlagValueFromItem(item, "quickFooter", card.flags[MODULE_SHORT].altRoll)) {
            card.flags[MODULE_SHORT].hideProperties = true;
        }

        if (!ItemUtility.getFlagValueFromItem(item, "quickSave", card.flags[MODULE_SHORT].altRoll)) {
            card.flags[MODULE_SHORT].hideSave = true;
        }

        if (!ItemUtility.getFlagValueFromItem(item, "quickCheck", card.flags[MODULE_SHORT].altRoll)) {
            card.flags[MODULE_SHORT].hideCheck = true;
        }

        if (ItemUtility.getFlagValueFromItem(item, "quickAttack", card.flags[MODULE_SHORT].altRoll)) {
            await _addAttackRoll(item, card);
        }
        
        const manualDamageMode = SettingsUtility.getSettingValue(SETTING_NAMES.MANUAL_DAMAGE_MODE);
        card.flags[MODULE_SHORT].manualDamage = item.hasDamage && (manualDamageMode === 2 || (manualDamageMode === 1 && item.hasAttack));

        if (!card.flags[MODULE_SHORT].manualDamage) {
            await _addDamageRoll(item, card);
        }        

        if (item.type === ITEM_TYPE.TOOL) {
            await _addToolCheck(item, card);
        }

        card.flags[MODULE_SHORT].processed = true;

        ChatUtility.updateChatMessage(card, { 
            flags: card.flags,
            type: card.type,
            rolls: card.rolls
        });
    }

    static async runItemAction(card, action) {
        if (!card.flags || !card.flags[MODULE_SHORT]) {
            return;
        }
        
        if (!card.flags[MODULE_SHORT].quickRoll) {
            return;
        }

        const item = await _ensureItemFromCard(card);
        ItemUtility.ensureFlagsOnItem(item);

        switch (action) {
            case ROLL_TYPE.DAMAGE:
                await _addDamageRoll(item, card);
                break;
        }

        ChatUtility.updateChatMessage(card, { flags: card.flags });
    }

    /**
     * Removes roll configs from a damage roll that are not set to roll by the item quick roll config.
     * @param {Item} item The item on to check item flags for.
     * @param {Object} config The roll config data of the damage roll.
     */
    static processItemDamageConfig(item, config) {        
        ItemUtility.ensureFlagsOnItem(item);

        const damageFlags = ItemUtility.getFlagValueFromItem(item, "quickDamage", config.altRoll ?? false)

        const newConfigs = []
        for (let i = 0; i < config.rollConfigs.length; i++) {
            if (damageFlags[i] ?? true) {
                newConfigs.push(config.rollConfigs[i]);
            }
        }

        config.rollConfigs = newConfigs;
    }

    /**
     * Checks the specified item to make sure module flags exist on it, and generates them if not.
     * @param {Item} item The item on which to ensure flags exist.
     */
    static ensureFlagsOnItem(item) {
        if (!item || !CONFIG[MODULE_SHORT].validItemTypes.includes(item.type)) {
            return;
        }
    
        if (item.flags && item.flags[MODULE_SHORT]) {
            return;
        }
    
        ItemUtility.refreshFlagsOnItem(item);
    }

    /**
     * Refreshes the stored flags on an item or generates them from default if they don't exist.
     * @param {Item} item The item on which to refresh module flags.
     */
    static refreshFlagsOnItem(item) {
        if (!item || !CONFIG[MODULE_SHORT].validItemTypes.includes(item.type)) {
            return;
        }

        LogUtility.log(`Refreshing item flags on ${item.name}.`);

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

        item.flags[MODULE_SHORT] = moduleFlags;
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

    static async getAttackFromCard(item, card) {
        item ??= await _ensureItemFromCard(card);

        return item.rollAttack({
            spellLevel: card.flags.dnd5e.use.spellLevel,
            advantage: card.flags[MODULE_SHORT].advantage ?? false,
            disadvantage: card.flags[MODULE_SHORT].disadvantage ?? false,
            fastForward: true,
            chatMessage: false
        })
    }

    static async getDamageFromCard(item, card) {
        item ??= await _ensureItemFromCard(card);

        return item.rollDamage({
            critical: card.flags[MODULE_SHORT].isCritical ?? false,
            spellLevel: card.flags.dnd5e.use.spellLevel,
            versatile: card.flags[MODULE_SHORT].versatile,
            options: {
                fastForward: true,
                chatMessage: false,
                returnMultiple: true,
                altRoll: card.flags[MODULE_SHORT].altRoll
            }
        });
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

            //return CoreUtility.localize(`${MODULE_SHORT}.chat.bonus.bonus`);
        }

        return undefined;
    }
}

async function _ensureItemFromCard(card) {
    const Item5e = CONFIG.Item.documentClass;

    const itemId = card.flags.dnd5e.use.itemId;
    const actor = game.actors.get(card.speaker.actor);
    const storedData = card.getFlag("dnd5e", "itemData");

    return storedData && actor ? await Item5e.create(storedData, { parent: actor, temporary: true }) : actor?.items.get(itemId);
}

async function _addAttackRoll(item, card) {
    if (!item.hasAttack) {
        return;
    }

    let roll = await ItemUtility.getAttackFromCard(item, card);

    if (SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_ROLL_MULTIROLL) && roll.options.advantageMode === 0) {
        roll = await RollUtility.ensureMultiRoll(roll, false);
        card.flags[MODULE_SHORT].dual = true;
    }
    
    card.rolls.push(roll);
    card.flags[MODULE_SHORT].rolls[ROLL_TYPE.ATTACK] = roll;
    card.flags[MODULE_SHORT].isCritical = card.flags[MODULE_SHORT].dual ? false : card.flags[MODULE_SHORT].rolls[ROLL_TYPE.ATTACK].isCritical;
    card.flags[MODULE_SHORT].consume = _getConsumeTargetFromItem(item)?.name;
}

async function _addDamageRoll(item, card) {
    if (!item.hasDamage) {
        return;
    }

    card.flags[MODULE_SHORT].versatile = item.isVersatile ? ItemUtility.getFlagValueFromItem(item, "quickVersatile", card.flags[MODULE_SHORT].altRoll) : false

    const rolls = await ItemUtility.getDamageFromCard(item, card);

    card.rolls.push(...rolls);
    card.flags[MODULE_SHORT].rolls[ROLL_TYPE.DAMAGE] = rolls;
    card.flags[MODULE_SHORT].context = [];

    const damageFlags = ItemUtility.getFlagValueFromItem(item, "quickDamage", card.flags[MODULE_SHORT].altRoll ?? false)

    for (let i = 0; i < Object.keys(damageFlags).length; i++) {
        if (damageFlags[i] ?? true) {
            card.flags[MODULE_SHORT].context.push(ItemUtility.getDamageContextFromItem(item, i));
        }
    }
}

async function _addToolCheck(item, card) {
    if (item.type !== ITEM_TYPE.TOOL) {
        return;
    }

    const roll = await item.rollToolCheck({
        advantage: card.flags[MODULE_SHORT].advantage ?? false,
        disadvantage: card.flags[MODULE_SHORT].disadvantage ?? false,
        fastForward: true,
        chatMessage: false
    })

    card.rolls.push(roll);
    card.flags[MODULE_SHORT].rolls[ROLL_TYPE.TOOL_CHECK] = roll;
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
        return target;
    }

    return undefined;
}
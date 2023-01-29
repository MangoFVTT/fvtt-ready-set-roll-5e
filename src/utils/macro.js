import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { FIELD_TYPE } from "./render.js";
import { MODULE_SHORT } from "../module/const.js";
import { QuickRoll } from "../module/quickroll.js";
import { RollUtility } from "./roll.js";

/**
 * Utility class to handle macro support for the module.
 */
export class MacroUtility {
    /**
     * Retrieve a list of functions that can be called from macro scripts.
     * @returns The list of functions with their macro identifier.
     */
    static getMacroList() {
        return {
            rollItem: _macroRollItem,
            rollDamage: _macroRollDamage
        }
    }
}

/**
 * Execute a macro that rolls a specific Item on a given Actor.
 * @param {String} itemId The name or ID of the Item to roll.
 * @param {String} actorId The name or ID of the Actor that owns the item. If not provided, tries to use the selected Actor.
 * @param {Object} options Additional options for the roll.
 * @returns The result of the Item usage.
 * @private
 */
function _macroRollItem(itemId, actorId, options = {}) {
    LogUtility.log("Executing macro: 'rollItem'");

    if (!itemId) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.itemNotSpecified`));
        return null;
    }

    if (!actorId) {
        actorId = ChatMessage.getSpeaker()?.actor;

        if (!actorId) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.noSelectedActor`));
            return null;
        }
    }

    const actor = CoreUtility.getActorById(actorId) ?? CoreUtility.getActorByName(actorId);     

    if (!actor) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.cannotFindIdentifier`,
            { type: "actor", identifier: actorId }));
        return null;
    }

    const item = actor.items.get(itemId) ?? actor.items.find(i => i.name === itemId);

    if (!item) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.cannotFindIdentifier`,
            { type: "item", identifier: itemId }));
        return null;
    }

    return item.use(options);
}

async function _macroRollDamage(parts, options = {}) {
    LogUtility.log("Executing macro: 'rollDamage'");

    if (!parts) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.damageNotSpecified`));
        return null;
    }

    // Restructure parameter so that it is always an array of damage parts
    // Each damage part is an array of [formula, (optional) damage type]
    if (!Array.isArray(parts)) {
        parts = [ parts ];
    }

    if (!Array.isArray(parts[0])) {
        parts = [ parts ];
    }  

    const actorId = ChatMessage.getSpeaker()?.actor;
    const actor = CoreUtility.getActorById(actorId)
    const rollData = actor?.getRollData();

    const createMessage = options?.createMessage ?? true;
    const isCrit = options?.isCrit ?? false;
    const isFumble = options?.isFumble ?? false;
    const title = options?.title ?? CoreUtility.localize(`${MODULE_SHORT}.chat.damage`);

    let fields = []
    for (const [i, part] of parts.entries()) {
        const formula = part[0];
        const type = part[1] ?? '';

        if (formula === '') continue;

        const baseRoll = await new CONFIG.Dice.DamageRoll(formula, rollData).evaluate({ async: true })
        
        let critRoll = null;
        if (isCrit) {
            critRoll = await RollUtility.getCritRoll(baseRoll, i, rollData, options);
        }

        fields.push([
            FIELD_TYPE.DAMAGE,
            {
                damageType: type,
                baseRoll,
                critRoll
            }
        ]);
    }

    const quickroll = new QuickRoll(
        null,
        { isCrit, isFumble },
        [
            [FIELD_TYPE.HEADER, { title: title, img: options?.img }],
            [FIELD_TYPE.BLANK, { display: false }],
            ...fields
        ]
    );

    await quickroll.toMessage({ createMessage });
    return quickroll;
}
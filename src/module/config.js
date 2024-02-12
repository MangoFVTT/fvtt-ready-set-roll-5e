import { ITEM_TYPE } from "../utils/item.js";
import { MODULE_SHORT } from "./const.js";

/**
 * A set of configuration details that are globally used throughout the module.
 * This currently includes valid item types for roll configuration and default configuration flags.
 */
CONFIG[MODULE_SHORT] = {
    validItemTypes: [
        ITEM_TYPE.WEAPON,
        ITEM_TYPE.SPELL,
        ITEM_TYPE.EQUIPMENT,
        ITEM_TYPE.FEATURE,
        ITEM_TYPE.TOOL,
        ITEM_TYPE.CONSUMABLE
    ],
    flags: {
        weapon: {
			quickFooter: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickCheck: { type: "Boolean", value: true, altValue: true },
			quickVersatile: { type: "Boolean", value: false, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickOther: { type: "Boolean", value: true, altValue: true, context: "" }
        },
        spell: {
            quickFlavor: { type: "Boolean", value: true, altValue: true },
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickAttack: { type: "Boolean", value: true, altValue: true },
            quickSave: { type: "Boolean", value: true, altValue: true },
			quickCheck: { type: "Boolean", value: true, altValue: true },
            quickVersatile: { type: "Boolean", value: false, altValue: false },
            quickDamage: { type: "Array", value: [], altValue: [], context: [] },
            quickOther: { type: "Boolean", value: true, altValue: true, context: "" }
        },
        equipment: {
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickAttack: { type: "Boolean", value: true, altValue: true },
            quickSave: { type: "Boolean", value: true, altValue: true },
			quickCheck: { type: "Boolean", value: true, altValue: true },
            quickDamage: { type: "Array", value: [], altValue: [], context: [] },
            quickOther: { type: "Boolean", value: true, altValue: true, context: "" }
        },
        feat: {
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickAttack: { type: "Boolean", value: true, altValue: true },
            quickSave: { type: "Boolean", value: true, altValue: true },
			quickCheck: { type: "Boolean", value: true, altValue: true },
            quickDamage: { type: "Array", value: [], altValue: [], context: [] },
            quickOther: { type: "Boolean", value: true, altValue: true, context: "" }
        },
        tool: {
            quickFooter: { type: "Boolean", value: true, altValue: true }
        },
        consumable: {
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickAttack: { type: "Boolean", value: true, altValue: true },
            quickSave: { type: "Boolean", value: true, altValue: true },
			quickCheck: { type: "Boolean", value: true, altValue: true },
			quickVersatile: { type: "Boolean", value: false, altValue: true },
            quickDamage: { type: "Array", value: [], altValue: [], context: [] },
            quickOther: { type: "Boolean", value: true, altValue: true, context: "" }
        }
    }
}
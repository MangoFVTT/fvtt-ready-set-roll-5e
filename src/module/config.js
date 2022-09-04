import { ITEM_TYPE } from "../utils/item.js";

// quickDesc: { type: "Boolean", value: true, altValue: true },
// quickFlavor: { type: "Boolean", value: true, altValue: true },
// quickFooter: { type: "Boolean", value: true, altValue: true },
// quickAttack: { type: "Boolean", value: true, altValue: true },
// quickVersatile: { type: "Boolean", value: false, altValue: false },
// quickTemplate: { type: "Boolean", value: true, altValue: true },
// quickSave: { type: "Boolean", value: true, altValue: true },
// quickDamage: { type: "Array", value: [], altValue: [], context: [] },
// quickOther: { type: "Boolean", value: true, altValue: true, context: "" },            
// consumeQuantity: { type: "Boolean", value: true, altValue: true },
// consumeUses: { type: "Boolean", value: true, altValue: true },
// consumeResource: { type: "Boolean", value: true, altValue: true },
// consumeRecharge: { type: "Boolean", value: true, altValue: true }

CONFIG.rsr5e = {
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
			quickDesc: { type: "Boolean", value: false, altValue: false },
			quickFlavor: { type: "Boolean", value: true, altValue: true },
			quickFooter: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickCheck: { type: "Boolean", value: true, altValue: true },
			quickVersatile: { type: "Boolean", value: false, altValue: true },
			quickTemplate: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickOther: { type: "Boolean", value: true, altValue: true, context: "" },            
			consumeQuantity: { type: "Boolean", value: false, altValue: false },
			consumeUses: { type: "Boolean", value: false, altValue: true },
			consumeResource: { type: "Boolean", value: true, altValue: true }
        },
        spell: {
            quickDesc: { type: "Boolean", value: true, altValue: true },
            quickFlavor: { type: "Boolean", value: true, altValue: true },
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickAttack: { type: "Boolean", value: true, altValue: true },
            quickVersatile: { type: "Boolean", value: false, altValue: false },
            quickSave: { type: "Boolean", value: true, altValue: true },
            quickDamage: { type: "Array", value: [], altValue: [], context: [] },
            quickOther: { type: "Boolean", value: true, altValue: true, context: "" }
        },
        equipment: {
            quickDesc: { type: "Boolean", value: true, altValue: true },
            quickFlavor: { type: "Boolean", value: true, altValue: true },
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickAttack: { type: "Boolean", value: true, altValue: true },
            quickTemplate: { type: "Boolean", value: true, altValue: true },
            quickSave: { type: "Boolean", value: true, altValue: true },
            quickDamage: { type: "Array", value: [], altValue: [], context: [] },
            quickOther: { type: "Boolean", value: true, altValue: true, context: "" },            
            consumeQuantity: { type: "Boolean", value: false, altValue: false },
            consumeUses: { type: "Boolean", value: false, altValue: true },
            consumeResource: { type: "Boolean", value: false, altValue: true }
        },
        feature: {
            quickDesc: { type: "Boolean", value: true, altValue: true },
            quickFlavor: { type: "Boolean", value: true, altValue: true },
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickAttack: { type: "Boolean", value: true, altValue: true },
            quickTemplate: { type: "Boolean", value: true, altValue: true },
            quickSave: { type: "Boolean", value: true, altValue: true },
            quickDamage: { type: "Array", value: [], altValue: [], context: [] },
            quickOther: { type: "Boolean", value: true, altValue: true, context: "" },            
            consumeQuantity: { type: "Boolean", value: true, altValue: true },
            consumeUses: { type: "Boolean", value: true, altValue: true },
            consumeResource: { type: "Boolean", value: true, altValue: true },
            consumeRecharge: { type: "Boolean", value: true, altValue: true }
        },
        tool: {
            quickDesc: { type: "Boolean", value: false, altValue: false },
            quickFlavor: { type: "Boolean", value: true, altValue: true },
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickCheck: { type: "Boolean", value: true, altValue: true }
        },
        consumable: {
            quickDesc: { type: "Boolean", value: true, altValue: true },
            quickFlavor: { type: "Boolean", value: true, altValue: true },
            quickFooter: { type: "Boolean", value: true, altValue: true },
            quickAttack: { type: "Boolean", value: true, altValue: true },
            quickTemplate: { type: "Boolean", value: true, altValue: true },
            quickSave: { type: "Boolean", value: true, altValue: true },
            quickDamage: { type: "Array", value: [], altValue: [], context: [] },
            quickOther: { type: "Boolean", value: true, altValue: true, context: "" },            
            consumeQuantity: { type: "Boolean", value: true, altValue: true },
            consumeUses: { type: "Boolean", value: true, altValue: true },
            consumeResource: { type: "Boolean", value: true, altValue: true }
        }
    }
}
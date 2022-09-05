import { MODULE_SHORT } from "../module/const.js";
import { LogUtility } from "./log.js";
import { FIELD_TYPE } from "./render.js";
import { ROLL_TYPE } from "./roll.js";

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

export class ItemUtility {
    static async getFieldsFromItem(item, params) {
        const chatData = await item.getChatData();
        const isAltRoll = params?.isAltRoll ?? false;
        let fields = [];

        if (ItemUtility.getFlagValueFromItem(item, "quickFlavor", isAltRoll)) {
            addFieldFlavor(fields, chatData);
        }
        if (ItemUtility.getFlagValueFromItem(item, "quickDesc", isAltRoll)) {
            addFieldDescription(fields, chatData);
        }
        if (ItemUtility.getFlagValueFromItem(item, "quickSave", isAltRoll)) {
            addFieldSave(fields, item);
        }
        if (ItemUtility.getFlagValueFromItem(item, "quickAttack", isAltRoll)) {
            await addFieldAttack(fields, item, params);
        }
        if (ItemUtility.getFlagValueFromItem(item, "quickCheck", isAltRoll)) {
            await addFieldToolCheck(fields, item, params);
        }
        if (ItemUtility.getFlagValueFromItem(item, "quickDamage", isAltRoll)) {
            await addFieldDamage(fields, item, params);
        }
        if (ItemUtility.getFlagValueFromItem(item, "quickOther", isAltRoll)) {
            await addFieldOtherFormula(fields, item);
        }
        if (ItemUtility.getFlagValueFromItem(item, "quickFooter", isAltRoll)) {
            addFieldFooter(fields, chatData);
        }

        return fields;
    }

    static getConsumeTargetFromItem(item) {
        if (item.system.consume.type === "ammo") {
            return item.actor.items.get(item.system.consume.target);
        }

        return undefined;
    }
    
    static getRollConfigFromItem(item, isAltRoll = false) {
        ItemUtility.ensureConsumePropertiesOnItem(item);

        const config = {}

        if (item?.hasAreaTarget && item?.flags[`${MODULE_SHORT}`].quickTemplate) { 
            config["createMeasuredTemplate"] = item.flags[`${MODULE_SHORT}`].quickTemplate[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasQuantity && item?.flags[`${MODULE_SHORT}`].consumeQuantity) {
            config["consumeQuantity"] = item.flags[`${MODULE_SHORT}`].consumeQuantity[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasUses && item?.flags[`${MODULE_SHORT}`].consumeUses) {
            config["consumeUsage"] = item.flags[`${MODULE_SHORT}`].consumeUses[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasResource && item?.flags[`${MODULE_SHORT}`].consumeResource) {
            config["consumeResource"] = item.flags[`${MODULE_SHORT}`].consumeResource[isAltRoll ? "altValue" : "value"];
        }
        if (item?.hasRecharge && item?.flags[`${MODULE_SHORT}`].consumeRecharge) {
            config["consumeRecharge"] = item.flags[`${MODULE_SHORT}`].consumeRecharge[isAltRoll ? "altValue" : "value"];
        }
        
        return config;
    }   

    static getFlagValueFromItem(item, flag, isAltRoll = false) {
        if (item?.flags[`${MODULE_SHORT}`][flag]) {
            return item.flags[`${MODULE_SHORT}`][flag][isAltRoll ? "altValue" : "value"] ?? false;
        }
        
        return false;
    }

    static ensureFlagsOnItem(item) {
        LogUtility.log("Ensuring item flags for module.");

        if (!item || !CONFIG[`${MODULE_SHORT}`].validItemTypes.includes(item.type)) {
            return;
        }

        item.flags = item.flags ?? {};

        const baseFlags = foundry.utils.duplicate(CONFIG[`${MODULE_SHORT}`].flags[item.type]);
        let moduleFlags = item.flags[`${MODULE_SHORT}`] ?? {};
        moduleFlags = foundry.utils.mergeObject(baseFlags, moduleFlags ?? {});

        // If quickDamage flags should exist, update them based on which damage formulae are available
        if (CONFIG[`${MODULE_SHORT}`].flags[item.type].quickDamage) {
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

        item.flags[`${MODULE_SHORT}`] = moduleFlags;        
        
        ItemUtility.ensureConsumePropertiesOnItem(item);
    }

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
}

function addFieldFlavor(fields, chatData) {
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

function addFieldDescription(fields, chatData) {
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

function addFieldFooter(fields, chatData) {
    fields.push([
        FIELD_TYPE.FOOTER,
        {
            properties: chatData.properties
        }
    ]);
}

function addFieldSave(fields, item) {
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

async function addFieldAttack(fields, item, params) {
    if (item.hasAttack) {
        const roll = await item.rollAttack({
            fastForward: true,
            chatMessage: false,
            advantage: params?.advMode > 0 ?? false,
            disadvantage: params?.advMode < 0 ?? false
        });

        fields.push([
            FIELD_TYPE.ATTACK,
            {
                roll,
                rollType: ROLL_TYPE.ATTACK,
                consume: ItemUtility.getConsumeTargetFromItem(item)
            }
        ]);

        if (params) {
            params.isCrit = params.isCrit || roll.isCritical;
        }
    }
}

async function addFieldDamage(fields, item, params) {
    if (item.hasDamage) {
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
        item.system.damage.parts.forEach(part => {
            const tmpRoll = new Roll(part[0]);
            damageTermGroups.push({ type: part[1], terms: roll.terms.splice(0, tmpRoll.terms.length) });
            roll.terms.shift();
        });

        if (roll.terms.length > 0) damageTermGroups[0].terms.push(...roll.terms);

        for (let i = 0; i < damageTermGroups.length; i++) {
            const group = damageTermGroups[i];
            const baseRoll = Roll.fromTerms(group.terms);

            let critRoll = null;
            if (params?.isCrit) {
                const critTerms = roll.options.multiplyNumeric ? group.terms : group.terms.filter(t => !(t instanceof NumericTerm));
                const firstDie = critTerms.find(t => t instanceof Die);
                const index = critTerms.indexOf(firstDie);

                if (i === 0 && firstDie) {
                    critTerms.splice(index, 1, new Die({
                        number: firstDie.number + roll.options.criticalBonusDice ?? 0,
                        faces: firstDie.faces,
                        results: firstDie.results
                    }));
                }

                critRoll = await Roll.fromTerms(Roll.simplifyTerms(critTerms)).reroll({
                    maximize: roll.options.powerfulCritical,
                    async: true
                });
            }

            fields.push([
                FIELD_TYPE.DAMAGE,
                {
                    damageType: group.type,
                    baseRoll,
                    critRoll,
                    context: undefined,
                    versatile: i !== 0 ? false : params?.versatile ?? false
                }
            ]);
        }
    }
}

async function addFieldOtherFormula(fields, item) {
    if (item.system.formula) {
        const otherRoll = await new Roll(item.system.formula).roll({ async: true });

        fields.push([
            FIELD_TYPE.DAMAGE,
            {
                damageType: ROLL_TYPE.OTHER,
                baseRoll: otherRoll,
                critRoll: undefined,
                context: undefined,
                versatile: false
            }
        ]);
    }
}

async function addFieldToolCheck(fields, item, params) {
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
                roll,
                rollType: ROLL_TYPE.ITEM
            }
        ]);
    }
}
import { FIELD_TYPE } from "./render.js";
import { RollUtility, ROLL_TYPE } from "./roll.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";

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
        //console.log(this.rollAttack());
        //console.log(this.rollDamage());
        //console.log(this.rollFormula());
        //console.log(this.rollToolCheck);
        let fields = [];
        let rollCrit = false;

        console.log(item);

        const chatData = await item.getChatData();

        if (chatData.chatFlavor && chatData.chatFlavor !== "") {
            fields.push([
                FIELD_TYPE.DESCRIPTION,
                {
                    content: chatData.chatFlavor,
                    isFlavor: true
                }
            ]);            
        }

        if (chatData.description && chatData.description.value !== "" && chatData.description.value !== "<p></p>") {
            fields.push([
                FIELD_TYPE.DESCRIPTION,
                {
                    content:chatData.description.value,
                    isFlavor: false
                }
            ]);
        }

        if (item.hasAttack) {
            const roll = await item.rollAttack({ 
                fastForward: true,
                chatMessage: false,
                advantage: params?.advMode > 0 ?? false,
                disadvantage: params?.advMode < 0 ?? false
            });

            rollCrit = roll.isCritical;

            fields.push([
                FIELD_TYPE.ATTACK,
                {
                    roll,
                    rollType: ROLL_TYPE.ATTACK,
                    consume: ItemUtility.getConsumeFromItem(item)        
                }
            ]);
        }

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
                damageTermGroups.push({type: part[1], terms: roll.terms.splice(0, tmpRoll.terms.length)});
                roll.terms.shift();
            });

            if (roll.terms.length > 0) damageTermGroups[0].terms.push(...roll.terms);

            for (let i = 0; i < damageTermGroups.length; i++) {
                const group = damageTermGroups[i];

                const baseRoll = Roll.fromTerms(group.terms);

                let critRoll = null;
                if (rollCrit) {
                    const critTerms = roll.options.multiplyNumeric ? group.terms : group.terms.filter(t => !(t instanceof NumericTerm));

                    const firstDie = critTerms.find(t => t instanceof Die);
                    if (i === 0 && firstDie)
                    {
                       firstDie.number += roll.options.criticalBonusDice ?? 0;
                    }

                    critRoll = await Roll.fromTerms(critTerms).reroll({ maximize: roll.options.powerfulCritical, async: true });
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

        fields.push([
            FIELD_TYPE.FOOTER,
            {
                properties: chatData.properties
            }
        ]);

        return fields;
    }

    static getConsumeFromItem(item) {
        if (item.system.consume.type === "ammo") {
            return item.actor.items.get(item.system.consume.target);
        }

        return undefined;
    }
}
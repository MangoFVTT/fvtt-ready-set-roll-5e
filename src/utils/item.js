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
        let fields = [];

        console.log(item);

        addFieldFlavor(fields, chatData);
        addFieldDescription(fields, chatData);
        addFieldSave(fields, item);
        await addFieldAttack(fields, item, params);
        await addFieldDamage(fields, item, params);
        await addFieldOtherFormula(fields, item);
        await addFieldToolCheck(fields, item, params);
        addFieldFooter(fields, chatData);

        return fields;
    }

    static getConsumeTargetFromItem(item) {
        if (item.system.consume.type === "ammo") {
            return item.actor.items.get(item.system.consume.target);
        }

        return undefined;
    }

    static ensureFlagsOnItem(item) {
        if (!item || !CONFIG.rsr5e.validItemTypes.includes(item.type)) {
            return;
        }

        item.flags = item.flags ?? {};

        const baseFlags = foundry.utils.duplicate(CONFIG.rsr5e.flags[item.type]);
        let moduleFlags = foundry.utils.duplicate(item.flags.rsr5e ?? {});
        moduleFlags = foundry.utils.mergeObject(baseFlags, moduleFlags ?? {});

        // If quickDamage flags should exist, update them based on which damage formulae are available
        if (CONFIG.rsr5e.flags[item.type].quickDamage) {
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

        item.flags.rsr5e = moduleFlags;
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

                if (i === 0 && firstDie) {
                    critTerms[critTerms.indexOf(firstDie)] = new Die({
                        number: firstDie.number + roll.options.criticalBonusDice ?? 0,
                        faces: firstDie.faces,
                        results: firstDie.results
                    });
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
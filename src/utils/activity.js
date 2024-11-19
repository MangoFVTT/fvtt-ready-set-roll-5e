import { MODULE_SHORT } from "../module/const.js";
import { ChatUtility } from "./chat.js";
import { CoreUtility } from "./core.js";
import { ROLL_TYPE } from "./roll.js";
import { SETTING_NAMES, SettingsUtility } from "./settings.js";

/**
 * Utility class to handle quick rolling functionality for activities.
 */
export class ActivityUtility {
    static setRenderFlags(activity, message) {
        if (!message.data.flags || !message.data.flags[MODULE_SHORT]) {
            return;
        }
        
        if (!message.data.flags[MODULE_SHORT].quickRoll) {
            return;
        }        

        const hasAttack = activity.hasOwnProperty(ROLL_TYPE.ATTACK);
        const hasDamage = activity.hasOwnProperty(ROLL_TYPE.DAMAGE);
        const hasHealing = activity.hasOwnProperty(ROLL_TYPE.HEALING);
        const hasFormula = activity.hasOwnProperty(ROLL_TYPE.FORMULA);

        if (hasAttack) {            
            message.data.flags[MODULE_SHORT].renderAttack = true;
        }

        const manualDamageMode = SettingsUtility.getSettingValue(SETTING_NAMES.MANUAL_DAMAGE_MODE);

        if (hasDamage && activity[ROLL_TYPE.DAMAGE]?.parts?.length > 0) {            
            message.data.flags[MODULE_SHORT].manualDamage = (manualDamageMode === 2 || (manualDamageMode === 1 && hasAttack));
            message.data.flags[MODULE_SHORT].renderDamage = !message.data.flags[MODULE_SHORT].manualDamage;
        }

        if (hasHealing) {
            message.data.flags[MODULE_SHORT].isHealing = true;
            message.data.flags[MODULE_SHORT].renderDamage = true; 
        }

        if (hasFormula && activity[ROLL_TYPE.FORMULA]?.formula !== '') {
            message.data.flags[MODULE_SHORT].renderFormula = true;

            if (activity.roll?.name && activity.roll.name !== "") {
                message.data.flags[MODULE_SHORT].formulaName = activity.roll?.name;
            }
        }
    }

    static async runActivityActions(message) {
        if (message.flags[MODULE_SHORT].renderAttack) {
            const attackRolls = await ActivityUtility.getAttackFromMessage(message);
            _injectRollsToMessage(message, attackRolls, CONFIG.Dice.D20Roll);

            message.flags[MODULE_SHORT].isCritical = message.flags[MODULE_SHORT].dual ? false : attackRolls[0].isCritical
        }

        if (message.flags[MODULE_SHORT].renderDamage) {
            const damageRolls = await ActivityUtility.getDamageFromMessage(message);
            _injectRollsToMessage(message, damageRolls, CONFIG.Dice.DamageRoll);
        }

        if (message.flags[MODULE_SHORT].renderFormula) {
            const formulaRolls = await ActivityUtility.getFormulaFromMessage(message);
            _injectRollsToMessage(message, formulaRolls, CONFIG.Dice.BasicRoll);
        }

        message.flags[MODULE_SHORT].processed = true;

        ChatUtility.updateChatMessage(message, { 
            flags: message.flags,
            rolls: message.rolls,
        });
    }    

    static async runActivityAction(message, action) {        
        switch (action) {
            case ROLL_TYPE.DAMAGE:
                const damageRolls = await ActivityUtility.getDamageFromMessage(message);
                _injectRollsToMessage(message, damageRolls, CONFIG.Dice.DamageRoll);
                break;
        }  

        ChatUtility.updateChatMessage(message, { 
            flags: message.flags,
            rolls: message.rolls
        });
    }

    static getAttackFromMessage(message) {
        const activity = message.getAssociatedActivity();

        const usageConfig = { 
            advantage: message.flags[MODULE_SHORT].advantage ?? false,
            disadvantage: message.flags[MODULE_SHORT].disadvantage ?? false,            
            ammunition: message.flags[MODULE_SHORT].ammunition
        }

        const dialogConfig = {
            configure: false
        }

        const messageConfig = {
            create: false,
            data: {
                flags: {}
            }
        }

        messageConfig.data.flags[MODULE_SHORT] = {
            quickRoll: true
        }

        return activity.rollAttack(usageConfig, dialogConfig, messageConfig);
    }

    static getDamageFromMessage(message) {
        const activity = message.getAssociatedActivity();
        const actor = message.getAssociatedActor();
    
        if (message.flags.dnd5e.scaling !== undefined) {
            activity.item.updateSource({ "flags.dnd5e.scaling": message.flags.dnd5e.scaling ?? 0 });
        }

        const usageConfig = {
            isCritical: message.flags[MODULE_SHORT].isCritical ?? false,
            ammunition: actor.items.get(message.flags[MODULE_SHORT].ammunition)
        }

        const dialogConfig = { 
            configure: false 
        }

        const messageConfig = {
            create: false,
            data: {
                flags: {}
            }
        }

        messageConfig.data.flags[MODULE_SHORT] = {
            quickRoll: true
        }
    
        return activity.rollDamage(usageConfig, dialogConfig, messageConfig);
    }

    static getFormulaFromMessage(message) {
        const activity = message.getAssociatedActivity();

        return activity.rollFormula(
        {
        }, 
        { 
            configure: false 
        }, 
        { 
            create: false 
        });
    }
}

function _injectRollsToMessage(message, rolls, cleanType)
{
    if (!message || !CoreUtility.isIterable(rolls)) {
        return;
    }

    if (cleanType) {
        message.rolls = message.rolls.filter(r => !(r instanceof cleanType))
    }

    message.rolls.push(...rolls);
}
import { MODULE_SHORT } from "../module/const.js";
import { FIELD_TYPE } from "./render.js";
import { CoreUtility } from "./core.js";
import { LogUtility } from "./log.js";
import { QuickRoll } from "../module/quickroll.js";
import { ItemUtility, ITEM_TYPE } from "./item.js";
import { SettingsUtility, SETTING_NAMES } from "./settings.js";
import { DialogUtility } from "./dialog.js";

/**
 * Enumerable of identifiers for different roll types that can be made.
 * @enum {String}
 */
export const ROLL_TYPE = {
    SKILL: "skill",
    TOOL: "tool",
    ABILITY_TEST: "check",
    ABILITY_SAVE: "save",
    DEATH_SAVE: "death",
    ITEM: "item",
    ATTACK: "attack",
    DAMAGE: "damage",
    HEALING: "healing",
    OTHER: "other"
}

/**
 * Enumerable of identifiers for roll states (advantage or disadvantage).
 */
export const ROLL_STATE = {
    ADV: "kh",
    DIS: "kl",
    DUAL: "dual",
    SINGLE: "single"
}

/**
 * Enumerable of identifiers for crit result types.
 * @enum {String}
 */
export const CRIT_TYPE = {
    MIXED: "mixed",
    SUCCESS: "success",
    FAILURE: "failure"
}

/**
 * Utility class for functions related to making specific rolls.
 */
export class RollUtility {
    /**
     * Calls the wrapped Actor roll with advantage/disadvantage determined by pressed modifier keys in the triggering event.
     * @param {Actor} caller The calling object of the wrapper.
     * @param {Function} wrapper The roll wrapper to call.
     * @param {Object} options Option data for the triggering event.
     * @param {String} id The identifier of the roll (eg. ability name/skill name/etc).
     * @param {Boolean} bypass Is true if the quick roll should be bypassed and a default roll dialog used.
     * @returns {Promise<Roll>} The roll result of the wrapper.
     */
    static async rollActorWrapper(caller, wrapper, options, id, bypass = false) {
        const advMode = CoreUtility.eventToAdvantage(options.event);        

        const bonuses = [];
        if (options?.event?.button === CONFIG[MODULE_SHORT].situRollMouseButton && !bypass)
        {
            const groups = [
                { label: CoreUtility.localize(`${MODULE_SHORT}.chat.bonus.generic`), id: id ?? "generic" }
            ]

            const values = await DialogUtility.getBonusFromDialog(groups);
            bonuses.push(...values.map(b => b.value));
        }

        const params = {
            fastForward: !bypass,
            chatMessage: bypass,
            advantage: advMode > 0,
            disadvantage: advMode < 0,
            rollMode: options?.rollMode,
            parts: bonuses
        }

        return id ? wrapper.call(caller, id, params) : wrapper.call(caller, params);
    }

    /**
     * Calls the wrapped Item roll with advantage/disadvantage/alternate determined by pressed modifier keys in the triggering event.
     * @param {Item} caller The calling object of the wrapper.
     * @param {Function} wrapper The roll wrapper to call.
     * @param {Object} options Option data for the triggering event.
     * @param {String} id The identifier of the roll (eg. ability name/skill name/etc).
     * @param {Boolean} bypass Is true if the quick roll should be bypassed and a default roll dialog used.
     * @returns {Promise<ChatData>} The roll result of the wrapper.
     */
    static async rollItemWrapper(caller, wrapper, options, bypass = false) {
        // We can ignore the item if it is not one of the types that requires a quick roll.
        if (bypass || !CONFIG[MODULE_SHORT].validItemTypes.includes(caller?.type)) {
            return wrapper.call(caller, {}, { ignore: true });
        }

        const advMode = CoreUtility.eventToAdvantage(options?.event);
        const isAltRoll = CoreUtility.eventToAltRoll(options?.event) || (options?.isAltRoll ?? false);
        
        const config = foundry.utils.mergeObject(options, ItemUtility.getRollConfigFromItem(caller, isAltRoll), { recursive: false });
        const configureDialog = config?.configureDialog ?? (caller?.type === ITEM_TYPE.SPELL ? true : false);

        // Handle quantity when uses are not consumed
        // While the rest can be handled by Item._getUsageUpdates(), this one thing cannot
        if (caller.id && config.consumeQuantity && !config.consumeUsage) {  
            if (caller.system.quantity === 0) {
                ui.notifications.warn(CoreUtility.localize("DND5E.ItemNoUses", {name: caller.name})); 
                return;  
            }

            config.consumeQuantity = false;

            const itemUpdates = {};
			itemUpdates["system.quantity"] = Math.max(0, caller.system.quantity - 1);            
            await caller.update(itemUpdates);
        }

        const bonuses = [];
        if (options?.event?.button === CONFIG[MODULE_SHORT].situRollMouseButton && !bypass)
        {
            const groups = [];

            if (caller.hasAttack) {
                groups.push({ label: CoreUtility.localize(`${MODULE_SHORT}.chat.bonus.attack`), id: ROLL_TYPE.ATTACK });
            }

            if (caller.hasAbilityCheck) {
                groups.push({ label: CoreUtility.localize(`${MODULE_SHORT}.chat.bonus.ability`), id: ROLL_TYPE.ABILITY_TEST });
            }

            if (caller.type === ITEM_TYPE.TOOL) {
                groups.push({ label: CoreUtility.localize(`${MODULE_SHORT}.chat.bonus.tool`), id: ROLL_TYPE.TOOL });
            }

            if (caller.hasDamage && SettingsUtility.getSettingValue(SETTING_NAMES.MANUAL_DAMAGE_MODE) === 0) {
                groups.push({ label: CoreUtility.localize(`${MODULE_SHORT}.chat.bonus.damage`), id: ROLL_TYPE.DAMAGE });
            }

            const values = await DialogUtility.getBonusFromDialog(groups);
            bonuses.push(...values);
        }

        return wrapper.call(caller, config, {
            configureDialog,
            createMessage: false,
            advMode,
            isAltRoll,
            spellLevel: caller?.system?.level,
            rollMode: options?.rollMode,
            bonuses
        });
    }

    /**
     * Rolls a skill check from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called. 
     * @param {String} skillId The id of the skill being rolled.
     * @param {Roll} roll The roll object that was made for the check.
     * @param {Object} options Additional options for rolling a skill.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollSkill(actor, skillId, roll, options = {}) {
        LogUtility.log(`Quick rolling skill check from Actor '${actor.name}'.`);

        if (!(skillId in CONFIG.DND5E.skills)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Skill", label: skillId, dictionary: "CONFIG.DND5E.skills" }));
            return null;
		}

        const skill = CONFIG.DND5E.skills[skillId];
        const abilityId = options.ability || (actor.system?.skills[skillId]?.ability ?? skill.ability);

        if (!(abilityId in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: abilityId, dictionary: "CONFIG.DND5E.abilities" }));
            return null;
		}

        const ability = CONFIG.DND5E.abilities[abilityId];

        const title = `${skill.label}${SettingsUtility.getSettingValue(SETTING_NAMES.SHOW_SKILL_ABILITIES) ? ` (${ability.label})` : ""}`;

        return _getActorRoll(actor, title, roll, ROLL_TYPE.SKILL, options);
    }

    /**
     * Rolls a tool check from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called. 
     * @param {String} toolId The id of the tool being rolled.
     * @param {Roll} roll The roll object that was made for the check.
     * @param {Object} options Additional options for rolling a tool.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollTool(actor, toolId, roll, options = {}) {        
        LogUtility.log(`Quick rolling tool check from Actor '${actor.name}'.`);

        if (!(toolId in CONFIG[MODULE_SHORT].combinedToolTypes)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Tool", label: toolId, dictionary: "CONFIG.DND5E.toolIds, CONFIG.DND5E.toolProficiencies, or CONFIG.DND5E.vehicleTypes" }));
            return null;
		}

        const tool = toolId in CONFIG.DND5E.toolIds 
            ? CoreUtility.getBaseItemIndex(CONFIG.DND5E.toolIds[toolId]) 
            : { name: CONFIG[MODULE_SHORT].combinedToolTypes[toolId] };

        const abilityId = options.ability || (actor.system.tools[toolId]?.ability ?? "int");

        if (!(abilityId in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: abilityId, dictionary: "CONFIG.DND5E.abilities" }));
            return null;
		}

        const ability = CONFIG.DND5E.abilities[abilityId];

        const title = `${tool.name}${SettingsUtility.getSettingValue(SETTING_NAMES.SHOW_SKILL_ABILITIES) ? ` (${ability.label})` : ""}`;
        options.img = tool.img;

        return _getActorRoll(actor, title, roll, ROLL_TYPE.TOOL, options);
    }

    /**
     * Rolls an ability test from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called. 
     * @param {String} abilityId The id of the ability being rolled.
     * @param {Roll} roll The roll object that was made for the check.
     * @param {Object} options Additional options for rolling an ability test.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollAbilityTest(actor, abilityId, roll, options = {}) {
        LogUtility.log(`Quick rolling ability test from Actor '${actor.name}'.`);

        if (!(abilityId in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: abilityId, dictionary: "CONFIG.DND5E.abilities" }));
            return null;
		}
        
        const ability = CONFIG.DND5E.abilities[abilityId];

        const title = `${ability.label} ${CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.ABILITY_TEST}`)}`;

        return _getActorRoll(actor, title, roll, ROLL_TYPE.ABILITY_TEST, options);
    }

    /**
     * Rolls an ability save from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called. 
     * @param {String} abilityId The id of the ability being rolled.
     * @param {Roll} roll The roll object that was made for the check.
     * @param {Object} options Additional options for rolling an ability save.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollAbilitySave(actor, abilityId, roll, options = {}) {
        LogUtility.log(`Quick rolling ability save from Actor '${actor.name}'.`);

        if (!(abilityId in CONFIG.DND5E.abilities)) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.labelNotInDictionary`,
                { type: "Ability", label: abilityId, dictionary: "CONFIG.DND5E.abilities" }));
            return null;
        }

        const ability = CONFIG.DND5E.abilities[abilityId];

        const title = `${ability.label} ${CoreUtility.localize(`${MODULE_SHORT}.chat.${ROLL_TYPE.ABILITY_SAVE}`)}`;

        return _getActorRoll(actor, title, roll, ROLL_TYPE.ABILITY_SAVE, options);
    }

    /**
     * Rolls a death save from a given actor.
     * @param {Actor} actor The actor object from which the roll is being called.
     * @param {Roll} roll The roll object that was made for the check.
     * @param {Object} options Additional options for rolling a death save.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollDeathSave(actor, roll, options = {}) {
        if (!roll) return null;
        
        LogUtility.log(`Quick rolling death save from Actor '${actor.name}'.`);

        const title = roll.options.flavor;

        return _getActorRoll(actor, title, roll, ROLL_TYPE.DEATH_SAVE, options);
    }

    /**
     * Rolls a single usage from a given item.
     * @param {Item} item The item to roll.
     * @param {Object} params A set of parameters for rolling the Item.
     * @param {Boolean} [createMessage=true] Whether the roll should immediately output to chat as a message.
     * @returns {Promise<QuickRoll>} The created quick roll.
     */
    static async rollItem(item, params, createMessage = true) {
        LogUtility.log(`Quick rolling Item '${item.name}'.`);

        params = CoreUtility.ensureQuickRollParams(params);
        params.slotLevel = params.slotLevel ?? item.system.level;
        params.createMessage = createMessage;
        item.system.level = params.spellLevel ?? item.system.level;

        return await _getItemRoll(item, params, ROLL_TYPE.ITEM)
    }

    /**
     * Processes a set of dice results to check what type of critical was rolled (for showing colour in chat card).
     * @param {Die} die A die term to process into a crit type.
     * @param {Number} options.critThreshold The threshold above which a result is considered a crit.
     * @param {Number} options.fumbleThreshold The threshold below which a result is considered a crit.
     * @returns {CRIT_TYPE} The type of crit for the die term.
     */
    static getCritTypeForDie(die, options = {}) {
        if (!die) return null;

        const { crit, fumble } = _countCritsFumbles(die, options)		

        return _getCritResult(crit, fumble);
    }

    /**
     * Processes a set of dice results to check what type of critical was rolled (for showing colour in chat card).
     * @param {Roll} roll A die term to process into a crit type.
     * @param {Number} options.critThreshold The threshold above which a result is considered a crit.
     * @param {Number} options.fumbleThreshold The threshold below which a result is considered a crit.
     * @returns {CRIT_TYPE} The type of crit for the die term.
     */
    static getCritTypeForRoll(roll, options = {}) {
        if (!roll) return null;

		let totalCrit = 0;
		let totalFumble = 0;

        for (const die of roll.dice) {			
            const { crit, fumble } = _countCritsFumbles(die, options)
            totalCrit += crit;
            totalFumble += fumble;
		}

        return _getCritResult(totalCrit, totalFumble);
    }

    /**
     * Upgrades a roll into a multi roll with the given target state (advantage/disadvantage).
     * @param {Roll} roll The roll to upgrade.
     * @param {ROLL_STATE} targetState The target state of the roll.
     * @param {Object} params Additional parameters to consider when upgrading.
     * @returns {Promise<Roll>} The upgraded multi roll from the provided roll.
     */
    static async upgradeRoll(roll, targetState, params = {}) {
        if (!roll) {
            LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.rollIsNullOrUndefined`));
            return null;
        }

		if (targetState !== ROLL_STATE.ADV && targetState !== ROLL_STATE.DIS) {
			LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectTargetState`, { state: targetState }));
			return roll;
		}

        params.forceMultiRoll = true;
        const upgradedRoll = await RollUtility.ensureMultiRoll(roll, params);
        
        const d20BaseTerm = upgradedRoll.terms.find(d => d.faces === 20);
        d20BaseTerm.keep(targetState);
        d20BaseTerm.modifiers.push(targetState);

        return upgradedRoll;
    }

    /**
     * Rerolls a specific die result inside a given term.
     * @param {Die} term The die term containing the die being rerolled.
     * @param {Number} targetDie The index of the specific die of the term being rerolled.
     * @returns 
     */
    static async rerollSpecificDie(term, targetDie) {
        if (!term) {
			LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.termIsNullOrUndefined`));
            return null;
        }

        if (targetDie >= term.results.length) {
			LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectTargetDie`));
            return null;
        }

        const rerolledDie = await new Die({ number: 1, faces: term.faces }).evaluate({ async: true });
        
        term.results[targetDie].rerolled = true;
        term.results[targetDie].active = false;
        term.results.splice(targetDie + 1, 0, foundry.utils.duplicate(rerolledDie.results[0]));

        return term;
    }

    /**
     * Checks if the roll needs to be forced to multi roll and returns the updated roll if needed.
     * @param {Roll} roll The roll to check.
     * @param {Object} params Additional parameters to consider when enforcing, also stores crit type separately to the roll due to incorrect logic in core dnd5e.
     * @returns {Promise<Roll>} The version of the roll with multi roll enforced if needed, or the original roll otherwise.
     */
    static async ensureMultiRoll(roll, params = {}) {
        if (!roll) {
			LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.rollIsNullOrUndefined`));
            return null;
        }

        if ((SettingsUtility.getSettingValue(SETTING_NAMES.ALWAYS_ROLL_MULTIROLL) || params?.forceMultiRoll) && !(roll.hasAdvantage || roll.hasDisadvantage)) {
            params.isMultiRoll = true;

            const forcedDiceCount = params?.elvenAccuracy ? 3 : 2;
            const d20BaseTerm = roll.terms.find(d => d.faces === 20);
            const d20Additional = await new Roll(`${forcedDiceCount - d20BaseTerm.number}d20${d20BaseTerm.modifiers.join('')}`).evaluate({ async: true });

            if (params?.forceMultiRoll) {
                await CoreUtility.tryRollDice3D(d20Additional);
            }

            const d20Forced = new Die({
                number: forcedDiceCount,
                faces: 20,
                results: [...d20BaseTerm.results, ...d20Additional.dice[0].results],
                modifiers: d20BaseTerm.modifiers
            });

            roll.terms[roll.terms.indexOf(d20BaseTerm)] = d20Forced;
        }

        const critOptions = { 
            critThreshold: roll.options.critical,
            fumbleThreshold: roll.options.fumble,
            targetValue: roll.options.targetValue,
            ignoreDiscarded: true 
        };
        const critType = RollUtility.getCritTypeForDie( roll.terms.find(d => d.faces === 20), critOptions);

        params.isCrit = params.isCrit || critType === CRIT_TYPE.SUCCESS;
        params.isFumble = params.isFumble || critType === CRIT_TYPE.FAILURE;
        params.isMultiRoll = params.isMultiRoll || roll.hasAdvantage || roll.hasDisadvantage;

        return roll;
    }

    /**
     * Generates a critical roll from a given base roll.
     * @param {Roll} baseRoll The base roll to roll a crit for.
     * @param {Number} groupIndex The index of the damage group. Some crit options only apply to the first damage group.
     * @param {Object} rollData Roll data for the item to calculate modifiers if needed.
     * @param {Object} options Additional options for rolling critical damage.
     * @returns {Promise<Roll>} The critical roll for the given base.
     */
    static async getCritRoll(baseRoll, groupIndex, rollData, options = {}) {
        const baseTerms = foundry.utils.duplicate(baseRoll.terms);
        const plus = await new OperatorTerm({ operator: "+" }).evaluate({ async: true });

        const critTerms = [];
        baseTerms.forEach(term => {
            let critTerm = RollTerm.fromData(term);
            
            if (critTerm instanceof NumericTerm) {
                critTerm = options.multiplyNumeric ? critTerm : new NumericTerm({ number: 0 }).evaluate({ async: false });
            }

            critTerms.push(critTerm);
        });

        const firstDie = critTerms.find(t => t instanceof Die);

        if (options.criticalBonusDice && options.criticalBonusDice > 0 && groupIndex === 0 && firstDie) {
            const bonusDice = await new Die({ number: options.criticalBonusDice, faces: firstDie.faces }).evaluate({ async: true });

            critTerms.push(plus, bonusDice);
        }

        if (groupIndex === 0 && options.criticalBonusDamage && options.criticalBonusDamage !== "") {
            const bonusDamage = await new CONFIG.Dice.DamageRoll(options.criticalBonusDamage, rollData).evaluate({ async: true });

            critTerms.push(plus, ...bonusDamage.terms);
        }

        // Remove trailing operators to avoid errors.
        while (critTerms.at(-1) instanceof OperatorTerm) {
            critTerms.pop();
        }

        return await Roll.fromTerms(Roll.simplifyTerms(critTerms)).reroll({
            maximize: options.powerfulCritical,
            async: true
        });
    }
}

/**
 * Gets an actor-based quick roll (skill, ability, or save).
 * @param {Actor} actor The actor object from which the roll is being generated.
 * @param {String} title The label to show on the header of the chat card.
 * @param {String} roll The roll being quick rolled.
 * @param {String} rollType The type (as a string identifier) of the roll being quick rolled.
 * @param {Object} options Additional options for rolling an actor roll.
 * @returns {Promise<QuickRoll>} The created actor quick roll.
 * @private
 */
async function _getActorRoll(actor, title, roll, rollType, options = {}) {
    if (!actor instanceof Actor) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.objectNotExpectedType`, { type: "Actor" }));
        return null;
    }

    if (!CONFIG[MODULE_SHORT].validActorRolls.includes(rollType)) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectRollType`, { function: "Actor", type: rollType }));
        return null;
    }

    const params = CoreUtility.ensureQuickRollParams();
    const ensuredRoll = await RollUtility.ensureMultiRoll(roll, params);

    const hasAdvantage = roll.hasAdvantage;
    const hasDisadvantage = roll.hasDisadvantage;
    const isCrit = params?.isCrit ?? false;
    const isFumble = params?.isFumble ?? false;
    const isMultiRoll = params?.isMultiRoll ?? false;

    const quickroll = new QuickRoll(
        actor,
        { hasAdvantage, hasDisadvantage, isCrit, isFumble, isMultiRoll },
        [
            [FIELD_TYPE.HEADER, { title, img: options?.img }],
            [FIELD_TYPE.BLANK, { display: false }],
            [FIELD_TYPE.CHECK, { roll: ensuredRoll, rollType }]
        ]
    );

    await quickroll.toMessage(options);
    return quickroll;
}

/**
 * Gets an item-based quick roll.
 * @param {Item} item The item object from which the roll is being generated.
 * @param {Object} params The combined parameters of the item roll (config and options).
 * @param {String} rollType The type (as a string identifier) of the roll being quick rolled.
 * @returns {Promise<QuickRoll>} The created item quick roll.
 * @private
 */
async function _getItemRoll(item, params, rollType) {
    if (!item instanceof Item) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.objectNotExpectedType`, { type: "Item" }));
        return null;
    }

    if (!CONFIG[MODULE_SHORT].validItemRolls.includes(rollType)) {
        LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectRollType`, { function: "Item", type: rollType }));
        return null;
    }

    const itemFields = await ItemUtility.getFieldsFromItem(item, params);

    const hasAdvantage = params?.advMode > 0 ?? false;
    const hasDisadvantage = params?.advMode < 0 ?? false;
    const isCrit = params?.isCrit ?? false;
    const isFumble = params?.isFumble ?? false;
    const isMultiRoll = params?.isMultiRoll ?? false;
    const isAltRoll = params?.isAltRoll ?? false;
    const elvenAccuracy = params?.elvenAccuracy ?? false;    
    const slotLevel = params?.slotLevel ?? undefined;
    const spellLevel = params?.spellLevel ?? undefined;

    const quickroll = new QuickRoll(
        item,
        { hasAdvantage, hasDisadvantage, isCrit, isFumble, isMultiRoll, isAltRoll, elvenAccuracy, slotLevel, spellLevel },
        [
            [FIELD_TYPE.HEADER, { title: item.name, img: params?.img, slotLevel }],
            ...itemFields
        ]
    );

    await quickroll.toMessage(params);
    return quickroll;
}

function _getCritResult(crit, fumble)
{
    if (crit > 0 && fumble > 0) {
        return CRIT_TYPE.MIXED;
    }
    
    if (crit > 0) {
        return CRIT_TYPE.SUCCESS;
    }
    
    if (fumble > 0) {
        return CRIT_TYPE.FAILURE;
    }
}

function _countCritsFumbles(die, options)
{
    let crit = 0;
    let fumble = 0;

    if (die && die.faces > 1) {
        let { critThreshold, fumbleThreshold, targetValue, ignoreDiscarded } = options

        critThreshold = critThreshold ?? die.options.critical ?? die.faces;
        fumbleThreshold = fumbleThreshold ?? die.options.fumble ?? 1;

        for (const result of die.results) {
            if (result.rerolled || (result.discarded && ignoreDiscarded)) {
                continue;
            }

            if (result.result >= targetValue || result.result >= critThreshold) {
                crit += 1;
            } else if (result.result < targetValue || result.result <= fumbleThreshold) {
                fumble += 1;
            }
        }
    }

    return { crit, fumble }
}
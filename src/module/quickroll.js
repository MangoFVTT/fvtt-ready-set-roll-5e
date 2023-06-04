import { CoreUtility } from "../utils/core.js";
import { HOOKS_DND5E, HOOKS_MODULE } from "../utils/hooks.js";
import { ItemUtility, ITEM_TYPE } from "../utils/item.js";
import { LogUtility } from "../utils/log.js";
import { FIELD_TYPE, RenderUtility } from "../utils/render.js";
import { RollUtility, ROLL_STATE, ROLL_TYPE } from "../utils/roll.js";
import { MODULE_SHORT } from "./const.js";

/**
 * Class that parses a base system roll into a module roll, with functionality for rendering to chat using custom module templates.
 */
export class QuickRoll {
    /**
     * Data id that is auto-incremented. IDs need to be unique for each entry within a card.
     * @private
     */
    _currentId;

    constructor(origin, params, fields) {
		if (origin) {
			const { item, actor } = CoreUtility.resolveActorOrItem(origin);

			if (item) {
				this.item = item;
			} 
			
			if (actor) {
				this.actor = actor;
			}
		}

		this.params = params ?? {};

		this.params.isCrit = this.params.forceCrit || (this.params.isCrit ?? false);
		this.params.isFumble = this.params.forceFumble || (this.params.isFumble ?? false);
        this.params.isMultiRoll = this.params.forceMultiRoll || (this.params.isMultiRoll ?? false);

		this.fields = fields ?? []; // Where requested roll fields are stored, in the order they should be rendered.
		this.templates = []; // Data results from fields, rendered into HTML templates.

		this.processed = false;
	}

	/**
	 * Sets the item associated with this quick roll.
	 * @param {Item} item The item to store in this quick roll.
	 */
	set item(item) {
		this._item = item;
		this.itemId = item?.id;
	}

	/**
	 * Gets the item associated with this quick roll.
	 * @returns {Item} The item stored in this quick roll.
	 */
	get item() {
		return this._item;
	}

	/**
	 * Sets the actor associated with this quick roll.
	 * @param {Actor} actor The actor to store in this quick roll.
	 */
	set actor(actor) {
		this._actor = actor;
		this.actorId = actor?.id;
		this.tokenId = actor?.token ? actor.token.uuid : null;
	}

	/**
	 * Gets the actor associated with this quick roll.
	 * @returns {Actor} The actor stored in this quick roll.
	 */
	get actor() {
		return this._actor;
	}

	/**
	 * Gets if the current user has advanced permissions over the chat card.
	 * @returns {Boolean} True if the user has advanced permissions, false otherwise.
	 */
	get hasPermission() {
		const message = game.messages.get(this.messageId);
		return game.user.isGM || message?.isAuthor;
	}

	get hasRolledCrit() {
		const damageFields = this.fields.filter(field => field[0] === FIELD_TYPE.DAMAGE);
		return damageFields.every(field => field[1]?.critRoll);
	}

	/**
	 * Returns the current roll state of the quick roll.
	 * @returns {ROLL_STATE} The current roll state value.
	 */
	get currentRollState() {
		if (this.params?.hasAdvantage ?? false) {
			return ROLL_STATE.ADV
		}

		if (this.params?.hasDisadvantage ?? false) {
			return ROLL_STATE.DIS
		}

		if (this.params?.isMultiRoll ?? false) {
			return ROLL_STATE.DUAL
		}

		return ROLL_STATE.SINGLE;
	}

	/**
	 * Returns the list of effect IDs to apply.
	 * @returns {Array} An array of string IDs, where each one corresponds to an active effect.
	 */
	get effectsToApply() {
		const effectsFields = this.fields.filter(field => field[0] === FIELD_TYPE.EFFECTS)
		return effectsFields.flatMap(field => field[1].apply);
	}

	/**
	 * Creates a QuickRoll instance from data stored within chat card flags.
	 * Used when needing to recreate chat card module data for existing chat messages.
	 * @param {ChatMessage} message The chat card message data to retrieve a roll instance from.
	 * @returns {Promise<QuickRoll>} A quick roll instance derived from stored message data.
	 */
	static async fromMessage(message) {
		const data = message.flags[MODULE_SHORT];

		// convert JSON string back to objects
		if (typeof(data?.fields[0]) === "string") {
			data.fields = data.fields.map(JSON.parse);
		}

		// Rolls in message data fields are unpacked and must be recreated.
		const fields = CoreUtility.repackQuickRollFields(data?.fields ?? []);

		const roll = new QuickRoll(null, data?.params ?? {}, fields);

		roll.messageId = message.id

		if (data?.tokenId) {
			const token = await fromUuid(data.tokenId);
			roll.actor = token?.actor;
		} else if (data?.actorId) {
			roll.actor = game.actors.get(data.actorId);
		}

		if (data?.itemId) {
			const storedData = message.getFlag("dnd5e", "itemData");
			const Item5e = game.dnd5e.documents.Item5e;

			roll.item = storedData && roll.actor ? await Item5e.create(storedData, { parent: roll.actor, temporary: true }) : roll.actor?.items.get(data.itemId);
		}
		
		return roll;
	}

	/**
	 * Creates and sends (if told to) a chat message to all players (based on whisper config).
	 * @param {Object} param0 Additional message options.
	 * @param {String} param0.rollMode The message roll mode (private/public/blind/etc).
	 * @param {String} param0.createMessage Immediately send the message to chat or only return data.
	 * @returns {Promise<ChatMessage>} The created chat message data.
	 */
    async toMessage({ rollMode = null, createMessage = true } = {}) {
		const item = this.item;
		const actor = this.actor;

		const chatData = {
			user: game.user.id,
			content: await this._render(),
			speaker: ChatMessage.getSpeaker({ item, actor }),
			flags: this._getFlags(),
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			rolls: this._getChatMessageRolls(),
			...CoreUtility.getRollSound(),
			...CoreUtility.getWhisperData(rollMode),
		}

		// Can't store classes in flags, but the fields may contain D20Roll classes, so convert them to JSON strings.
		const flags = chatData.flags[MODULE_SHORT];
		if (flags.fields) {
			flags.fields = flags.fields.map(JSON.stringify);
		}

		if (this.item) {
			Hooks.callAll(HOOKS_DND5E.PRE_DISPLAY_CARD, item, chatData, { createMessage });
		}

		const card = createMessage ? await ChatMessage.create(chatData) : chatData;

		if (createMessage) {
			this.messageId = card.id;
		}

		if (this.item) {
			Hooks.callAll(HOOKS_DND5E.DISPLAY_CARD, item, card);
		}

		return card;
	}

	/**
	 * Creates a message update package to update an existing chat card.
	 * @returns {Promise<Object>} The created update package.
	 */
	async toMessageUpdate() {
		const update = {
			content: await this._render(),
			...flattenObject({ flags: duplicate(this._getFlags()) }),
			...CoreUtility.getRollSound()
		};

		Hooks.callAll(HOOKS_DND5E.PRE_DISPLAY_CARD, this.item, update);

		return update;
	}

	/**
	 * Rerolls a quickroll into a new chat card.
	 * @returns {Boolean} Whether or not the reroll was succesful.
	 */
	async repeatRoll() {
		if (!this.hasPermission || !this.fields || this.fields.length === 0) {
			return false;
		}
		
		// For item rolls, simply reroll the item without any consumes.
		if (this.item) {
			await RollUtility.rollItem(this.item, { 
				forceHideDescription: true,
				slotLevel: this.params?.slotLevel,
				spellLevel: this.params?.spellLevel
			});
			return true;
		}

		// For actor rolls, we don't know the type of actor roll so must reroll the fields directly.
		if (this.actor) {			
			// Rolls in duplicates are unpacked and must be recreated.
			const fields = CoreUtility.repackQuickRollFields(foundry.utils.duplicate(this.fields));
			
			console.log(fields);

			fields.forEach(field => {
				if (CONFIG[MODULE_SHORT].validMultiRollFields.includes(field[0])) {
					field[1].roll = field[1].roll.reroll({ async: false });
				}
			});
	
			const roll = new QuickRoll(this.actor, {}, fields);	
			await roll.toMessage();
			return true;
		}

		return false;
	}

	/**
	 * Upgrades a specific roll in one of the roll fields to a multi roll if possible.
	 * @param {Number} targetId The index of the roll field to upgrade. 
	 * @param {ROLL_STATE} targetState The target state of the upgraded multi roll (advantage or disadvantage);
	 * @returns {Boolean} Whether or not the ugprade was succesful. 
	 */
	async upgradeToMultiRoll(targetId, targetState) {
		const targetField = this.fields[targetId];

		if (!targetField || !targetState || !this.hasPermission || !targetField[1]?.roll) {
			return false;
		}

		if (targetField[0] !== FIELD_TYPE.CHECK && targetField[0] !== FIELD_TYPE.ATTACK) {
			LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectFieldType`, { type: targetField[0] }));
			return false;
		}

		targetField[1].roll = await RollUtility.upgradeRoll(targetField[1].roll, targetState, this.params);
		this.params.isMultiRoll = true;
		this.params.hasAdvantage = targetState == ROLL_STATE.ADV;
		this.params.hasDisadvantage = targetState == ROLL_STATE.DIS;

		return true;
	}

	/**
	 * Upgrades a specific damage roll in one of the damage fields to a crit if possible.
	 * @param {Number} targetId The index of the damage field to upgrade.
	 * @returns {Boolean} Whether or not the ugprade was succesful. 
	 */
	async upgradeToCrit(targetId) {
		const targetField = this.fields[targetId];

		if (!targetField || !this.hasPermission || !targetField[1]?.baseRoll || targetField[1]?.critRoll) {
			return false;
		}

		if (targetField[0] !== FIELD_TYPE.DAMAGE) {
			LogUtility.logError(CoreUtility.localize(`${MODULE_SHORT}.messages.error.incorrectFieldType`, { type: targetField[0] }));
			return false;
		}

		const options = {
			multiplyNumeric: game.settings.get("dnd5e", "criticalDamageModifiers"),
			powerfulCritical: game.settings.get("dnd5e", "criticalDamageMaxDice"),
			criticalBonusDice: this.item?.system.actionType === "mwak" ? (this.actor.getFlag("dnd5e", "meleeCriticalDamageDice") ?? 0) : 0,
			criticalBonusDamage: this.item?.system.critical.damage ?? ""
		}
		
		const damageFields = this.fields.filter(f => f[0] === FIELD_TYPE.DAMAGE);
		targetField[1].critRoll = await RollUtility.getCritRoll(targetField[1].baseRoll, damageFields.indexOf(targetField), this.item?.getRollData(), options);

		await CoreUtility.tryRollDice3D(targetField[1].critRoll);

		return true;
	}

	/**
	 * Upgrades a quick roll that has damage to one with damage actually rolled.
	 * Used for manually rolling damage via chat buttons, if the setting is enabled.
	 * @param {Number} targetId The index of the manual damage button field.
	 * @returns {Boolean} Whether or not the ugprade was succesful. 
	 */
	async upgradeToDamageRoll(targetId) {
		const targetField = this.fields[targetId];

		if (!targetField || !this.hasPermission) {
			return false;
		}

		const newFields = await ItemUtility.getSpecificFieldsFromItem(this.item, this.params, [ FIELD_TYPE.DAMAGE ])

		this.fields.splice(targetId, 1, ...newFields);	
		this.processed = false;	

		const promises = [];
		newFields.forEach(field => {
			if (field[1].baseRoll) {
				promises.push(Promise.resolve(CoreUtility.tryRollDice3D(field[1].baseRoll)));
			}			

			if (field[1].critRoll) {
				promises.push(Promise.resolve(CoreUtility.tryRollDice3D(field[1].critRoll)));
			}
		});

		await Promise.all(promises);

		return true;
	}

	/**
	 * Rerolls a specific die inside a quick roll.
	 * @param {Number} targetId The index of the roll field being rerolled.
	 * @param {Number} targetRoll The index of the specific roll of the field being rerolled.
	 * @param {Number} targetPart The index of the specific part of the roll being rerolled.
	 * @param {Number} targetDie The index of the specific die of the part being rerolled.
	 * @returns {Boolean} Whether or not the reroll was succesful. 
	 */
	async rerollDie(targetId, targetRoll, targetPart, targetDie) {
		const targetField = this.fields[targetId];

		if (!targetField || !this.hasPermission) {
			return false;
		}

		let roll;
		switch (targetField[0]) {
			case FIELD_TYPE.DAMAGE:
				roll = targetRoll === 0 ? targetField[1].baseRoll : targetField[1].critRoll;
				break;
			case FIELD_TYPE.ATTACK:
			case FIELD_TYPE.CHECK:
				roll = targetField[1].roll;
				const dice = roll.terms[0].results.filter(r => r.active);
				targetDie = roll.terms[0].results.indexOf(dice[targetRoll]);
				break;
			default:
				return false;
		}

		if (!roll) {
			return false;
		}		

		const terms = roll.terms;
		const part = terms.filter(t => t instanceof Die)[targetPart];
		const index = terms.indexOf(part);

		terms[index] = await RollUtility.rerollSpecificDie(part, targetDie);

		if (targetField[0] === FIELD_TYPE.DAMAGE) {
			if (targetRoll === 0) {
				targetField[1].baseRoll = Roll.fromTerms(terms);
			} else {
				targetField[1].critRoll = Roll.fromTerms(terms);
			}
		}
		
		return true;
	}

    /**
	 * Renders HTML templates for the provided fields and combines them into a card.
	 * @returns {Promise<string>} Combined HTML chat data for all the roll fields.
	 * @private
	 */
	async _render() {
        if (!this.processed) {
			this._currentId = -1;
			this.templates.length = 0;

            for (const field of this.fields) {
                const metadata = {
                    id: ++this._currentId,
                    item: this.item,
                    actor: this.actor,
                    isCrit: this.params.isCrit,
					isFumble: this.params.isFumble,
                    isMultiRoll: this.params.isMultiRoll,
					rollState: this.currentRollState
                };

                const render = await RenderUtility.renderFromField(field, metadata);
                this.templates.push(render);
            }

			await Hooks.callAll(HOOKS_MODULE.PROCESSED_ROLL, this);
            this.processed = true;
        }

		await Hooks.callAll(HOOKS_MODULE.RENDER, this);

		return RenderUtility.renderFullCard({
			item: this.item,
			actor: this.actor,
			tokenId: this.tokenId,
			isCritical: this.isCrit,
			templates: this.templates
		});
	}

	/**
	 * Allows this roll to be serialized into message flags.
	 * @returns {any} A set of flags to attach to the chat message.
	 * @private
	 */
	_getFlags() {
		const flags = {
			[MODULE_SHORT]: {
				version: CoreUtility.getVersion(),
				actorId: this.actorId,
				itemId: this.itemId,
				tokenId: this.tokenId,
				params: this.params,
				fields: this.fields
			}
		};

		if (this.fields.some(f => f[0] === ROLL_TYPE.ATTACK)) {
			flags["dnd5e.roll.type"] = ROLL_TYPE.ATTACK;
		}

		if (this.itemId) {
			flags["dnd5e.roll.itemId"] = this.itemId;
		}

		// If the item was destroyed in the process of displaying its card, embed the item data in the chat message.
		if (this.item?.type === ITEM_TYPE.CONSUMABLE && !this.actor?.items?.has(this.itemId)) {
			flags["dnd5e.itemData"] = this.item;
		}

		// Allow the roll to popout
		flags["core.canPopout"] = true;

		return flags;
	}

	/**
	 * Function that concatenates all the compounded rolls in a quick roll into a set of roll instances.
	 * Damage rolls go together into a single roll for use with the context menu apply damage, healing, half-damage, etc.
	 * @returns {Roll} A single roll compounding all the damage in the chat card into a single value.
	 * @private
	 */
	_getChatMessageRolls() {
		const rolls = [];
	
        if (this.fields.length === 0) {
            return rolls;
        }
		
		// If we need to add damage that has no die rolls in it, we have to add a safety die with no value.
		// Otherwise, when there is a d20 present, dnd5e will attempt to interpret all this as a d20 roll and error.
		const safety = new Die({ number: 1, faces: 0 }).evaluate({ async: false });
		const plus = new OperatorTerm({ operator: "+" }).evaluate({ async: false });
		const terms = []

		// Concatenate damage rolls into a single roll (for apply damage context menu).
        const damageFields = this.fields.filter(f => f[0] === FIELD_TYPE.DAMAGE).map(f => f[1]);
		
		damageFields.forEach(field => {
			if (field.baseRoll) {
				terms.push(plus);
				terms.push(...field.baseRoll.terms);
			}		

			if (field.critRoll) {
				terms.push(plus);
				terms.push(...field.critRoll.terms);
			}			
		});

		// Damage rolls must be added first into index 0 for applyChatCardDamage() to work.
		if (terms.length !== 0) {
            const damageRoll = Roll.fromTerms(Roll.simplifyTerms(terms));
			damageRoll.terms.unshift(safety, plus);

			rolls.push(damageRoll);
        }

		// Add in d20 rolls.
		const rollFields = this.fields.filter(f => f[0] === FIELD_TYPE.CHECK || f[0] === FIELD_TYPE.ATTACK).map(f => f[1]);

		rollFields.forEach(field => {
			rolls.push(field.roll);
		});

		return rolls;
	}
}


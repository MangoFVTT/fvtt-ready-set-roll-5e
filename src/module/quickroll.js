import { CoreUtility } from "../utils/core.js";
import { HOOKS_MODULE } from "../utils/hooks.js";
import { ITEM_TYPE } from "../utils/item.js";
import { FIELD_TYPE, RenderUtility } from "../utils/render.js";
import { ROLL_TYPE } from "../utils/roll.js";

/**
 * Default quick roll parameters to fill in the parameter list that is passed on to field generation and rendering.
 */
let defaultParams = {
	forceCrit: false,
	forceFumble: false,
    forceMultiRoll: false,
	hasAdvantage: false,
	hasDisadvantage: false
};

/**
 * Class that parses a base system roll into a module roll, with functionality for rendering to chat using custom module templates.
 */
export class QuickRoll {
    /**
     * Data id that is auto-incremented. IDs need to be unique for each entry within a card.
     * @private
     */
    _currentId = -1;

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

		// Merges default parameter array with provided parameters, to have a complete list of parameters.
		this.params = foundry.utils.mergeObject(foundry.utils.duplicate(defaultParams), params || {});		

		this.fields = fields ?? []; // Where requested roll fields are stored, in the order they should be rendered.
		this.templates = []; // Data results from fields, rendered into HTML templates.

		this.isCrit = this.params.forceCrit || (this.params.isCrit ?? false);
		this.isFumble = this.params.forceFumble || (this.params.isFumble ?? false);
        this.isMultiRoll = this.params.forceMultiRoll || this.params.hasAdvantage || this.params.hasDisadvantage

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
	 * Creates and sends a chat message to all players (based on whisper config).
	 * @param {object} param0 Additional message options.
	 * @param {string} param0.rollMode The message roll mode (private/public/blind/etc).
	 * @param {string} param0.createMessage Immediately send the message to chat or only return data.
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
			roll: this._getChatMessageRolls(),
			...CoreUtility.getRollSound(),
			...CoreUtility.getWhisperData(rollMode),
		}

		await Hooks.callAll(HOOKS_MODULE.CHAT_MSG, this, chatData);

		// Send the chat message
		if (createMessage) {
			const message = await ChatMessage.create(chatData);
			this.messageId = message.id;
			return message;
		} else {
			return chatData;
		}
	}

    /**
	 * Renders HTML templates for the provided fields and combines them into a card.
	 * @returns {Promise<string>} Combined HTML chat data for all the roll fields.
	 * @private
	 */
	async _render() {
        if (!this.processed) {
            for (const field of this.fields) {
                const metadata = {
                    id: this._currentId++,
                    item: this.item,
                    actor: this.actor,
                    isCrit: this.isCrit,
					isFumble: this.isFumble,
                    isMultiRoll: this.isMultiRoll
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
			rsr5e: {
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

		// If the item was destroyed in the process of displaying its card embed the item data in the chat message.
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
		let roll = new Roll("1d0").evaluate({ async: false });
	
        if (this.fields.length === 0) {
            return roll;
        }

		// Concatenate damage rolls into a single roll (for apply damage context menu).
        const damageFields = this.fields.filter(f => f[0] === FIELD_TYPE.DAMAGE).map(f => f[1]);
		const plus = new OperatorTerm({ operator: "+" }).evaluate({ async: false });
		const terms = []

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
            roll = Roll.fromTerms(Roll.simplifyTerms(terms));
        }
		
		// Add in dice for all other roll types.
		const rollFields = this.fields.filter(f => f[0] === FIELD_TYPE.CHECK || f[0] === FIELD_TYPE.ATTACK).map(f => f[1]);

		rollFields.forEach(field => {
			roll.terms.push(...field.roll.dice);
		});

		return roll;
	}
}


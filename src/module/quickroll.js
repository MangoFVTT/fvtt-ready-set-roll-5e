import { CoreUtility } from "../utils/core.js";
import { HOOK_CHAT_MESSAGE, HOOK_RENDER } from "../utils/hooks.js";
import { RenderUtility } from "../utils/render.js";

let defaultParams = {
	label: "",
	forceCrit: false,
	forceFumble: false,
    forceMultiRoll: false,
	preset: null,
	properties: true,
	hasAdvantage: false,
	hasDisadvantage: false,
	infoOnly: false,
};

/**
 * Class that parses a base system roll into a module roll, with functionality for rendering to chat using custom module templates.
 */
export class QuickRoll {
    /**
     * Current id that is auto-incremented. IDs need to be unique within a card.
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
        this.properties = []; // Properties for the roll, shown in the card footer.

		this.isCrit = this.params.forceCrit || (this.params.isCrit ?? false);
		this.isFumble = this.params.forceFumble || (this.params.isFumble ?? false);
        this.isMultiRoll = this.params.forceMultiRoll || this.params.hasAdvantage || this.params.hasDisadvantage

		this.processed = false;
	}

	set item(item) {
		this._item = item;
		this.itemId = item?.id;
	}

	get item() {
		return this._item;
	}

	set actor(actor) {
		this._actor = actor;
		this.actorId = actor?.id;
		this.tokenId = actor?.token ? actor.token.uuid : null;
	}

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
			...CoreUtility.getWhisperData(rollMode),

			// If not blank, D&D will try to modify the card...
			roll: new Roll("0").roll({ async: false })
		}

		await Hooks.callAll(HOOK_CHAT_MESSAGE, this, chatData);

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
	 * @returns Combined HTML chat data for all the roll fields.
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
                    isMultiRoll: this.isMultiRoll
                };

                const render = await RenderUtility.renderFromField(field, metadata);
                this.templates.push(render);
            }

            this.processed = true;
        }

		await Hooks.callAll(HOOK_RENDER, this);

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
	 * @returns A set of flags to attach to the chat message.
	 * @private
	 */
	_getFlags() {
		// Transform rolls in fields into formulas when saving into flags
		const fields = this.fields.map((field) => {
			const newField = deepClone(field);
			if (field[1] && 'formula' in field[1] && field[1].formula?.formula) {
				newField[1].formula = field[1].formula.formula;
			}
			return newField;
		});

		const flags = {
			rsr5e: {
				version: CoreUtility.getVersion(),
				actorId: this.actorId,
				itemId: this.itemId,
				tokenId: this.tokenId,
				isCrit: this.isCrit,
				isFumble: this.isFumble,
				properties: this.properties,
				params: this.params,
				fields
			}
		};

		// Allow the roll to popout
		flags["core.canPopout"] = true;

		return flags;
	}
}


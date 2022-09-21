import { QuickCard } from "../module/quickcard.js";
import { LogUtility } from "./log.js";

export class ChatUtility {
    /**
     * Inflates a given chat message, adding runtime elements
     * and events to it. Does nothing if the message is not the correct type.
     * @param {ChatMessage} message
     * @param {JQuery} html
     */
    static bindChatCard(message, html) {
        if (!message || !html) {
            return null;
        }

        const chatCard = html.find('.rsr-full');
        const existingCard = message.quickCard;

        if (chatCard.length === 0) {
            return null;
        }

        if (existingCard) {
            LogUtility.log("Retrieved existing quick card content from message.");
            existingCard.updateBinding(message, chatCard);
            return existingCard;
        }
        else {
            LogUtility.log("Binding new quick card content to message.");
            const newCard = new QuickCard(message, chatCard);
            message.quickCard = newCard;
            return newCard;
        }
    }
}
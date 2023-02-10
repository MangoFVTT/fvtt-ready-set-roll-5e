import { RenderUtility } from "./render.js";

/**
 * The string identifier that declares a query string.
 */
export const QUERY_TAG = "@query"

/**
 * Utility class to handle processing Roll20 style string queries.
 */
export class QueryUtility {
    static async parse(content) {
        if (content.includes(QUERY_TAG)) {
            const regex = new RegExp(`${QUERY_TAG}\\[([^\\]]+)\\]`, "g");
            const matches = [...content.matchAll(regex)];

            const queries = []
            for (const match of matches) {
                const query = match[1];
                queries.push(_getQueryResult(query));
            }

            const results = await Promise.all(queries);
            content = content.replace(regex, () => results.shift());
        }

        return content;
    }

    /**
     * Process a string query into a popup dialog and return the selected result.
     * @param {String} content The string query to process.
     * @returns {Promise<Object>} The selected option from the query popup.
     */
    static async processQuery(content) {
        if (!content.includes('|')) {
            return null;
        }

        return _getQueryResult(content);
    }
}

async function _getQueryResult(query) {
    const options = query.split('|');
    const title = options.shift();
    const isMulti = options.length > 1;

    let values = [];
    if (isMulti) {
        for (const option of options) {
            const split = option.split(",");
            const label = split[0].trim();
            const value = split.length > 1 ? split[1].trim() : label;
            values.push({ label, value });

        }
    } else {
        values = options[0].split(",")[0].trim();
    }

    const html = await RenderUtility.renderQueryDialog({ isMulti, title, values });

    return new Promise((resolve, reject) => {
        setTimeout(function () {
            new Dialog({
                title: "Query",
                content: html,
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Confirm',
                        callback: html => resolve(html.find('[name="rollQuery"]')[0].value)
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel'
                    }
                },
                default: "yes"
            }, options).render(true);
            setTimeout(function() { document.getElementById("rollQuery").focus(); }, 250);
        }, 100);
    });
}
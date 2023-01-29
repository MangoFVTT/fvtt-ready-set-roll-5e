/**
 * Utility class to handle processing Roll20 style string queries.
 */
export class QueryUtility {
    /**
     * Process a string query into a popup dialog and return the selected result.
     * @param {String} content The string query to process.
     * @returns {Promise<Object>} The selected option from the query popup.
     */
    static async processQuery(content) {
        if (content.includes("?{")) {
            while (content.includes("?{")) {
                let query = content.match(/\?{([^}]+)}/)[0];
                let title = query.split("|")[0].replace("?{", "");
                let options = query.replace("?{" + title + "|", "").replace("}", "").split("|");
                let selectOptions = "";
                let option = "";
                let value = "";
                let html = "";			
                var a;
                if (options.length > 1) {
                    for (a = 0; a < options.length; a++) {
                        option = (options[a].includes(",")) ? options[a].split(",")[0].trim() : options[a];
                        value = (options[a].includes(",")) ? options[a].split(",")[1].trim() : options[a];
                        selectOptions += `<option value="${value}">${option}</option>`;
                    }
                    html = `
                        <div class="form-group">
                            <label style='font-weight: bold;'>
                                ${title}
                            </label>
                            <select id="rollQuery" name="rollQuery" style="margin-bottom: 5px;">
                                ${selectOptions}
                            </select>
                        </div>`;
                } else {
                    html = `
                        <div class="form-group">
                            <label style='font-weight: bold;'>
                                ${title}
                            </label>
                            <input id='rollQuery' name='rollQuery' type='text' value='${options[0]}' onfocus='this.select()' style='width: unset; margin-bottom: 5px;'>
                        </div>`;
                }

                const selected = await new Promise((resolve, reject) => {
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
                
                content = content.replace(/\?{([^}]+)}/, selected);			
            }
        }

        return content;
    }
}
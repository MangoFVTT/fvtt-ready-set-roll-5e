import { CoreUtility } from "./core.js";
import { TEMPLATE } from "../module/templates.js"
import { DEFAULT_IMG, MODULE_NAME } from "../module/const.js";

export const FIELD_TYPE = {
    HEADER: 'header',
    CHECK: 'check'
}

export class RenderUtility {
    static async renderFromField(field, metadata) {
        let [fieldType, fieldData] = field;
        fieldData = mergeObject(metadata, fieldData ?? {}, { recursive: false });

        switch (fieldType) {
            case FIELD_TYPE.HEADER:
                return renderHeader(fieldData);
            case FIELD_TYPE.CHECK:
                return null;
        }
    }

    static renderFullCard(props) {
        return renderModuleTemplate(TEMPLATE.FULL_CARD, props);
    }
}

function renderHeader(renderData = {}) {
    const { id, item, slotLevel } = renderData;
    const actor = renderData?.actor ?? item?.actor;
    const img = renderData.img ?? item?.img ?? CoreUtility.getActorImage(actor);
    let title = renderData.title ?? item?.name ?? actor?.name ?? '';

    if (item?.data.type === "spell" && slotLevel && slotLevel != item.data.data.level) {
        title += ` (${dnd5e.spellLevels[slotLevel]})`;
    }

    return renderModuleTemplate(TEMPLATE.HEADER, {
        id,
        item: { img: img ?? DEFAULT_IMG, name: title },
        slotLevel
    });
}

/**
 * Shortcut function to render a custom template from the templates folder.
 * @param {string} template Name (or sub path) of the template in the templates folder.
 * @param {Object} props The props data to render the template with.
 * @returns {Promise<string>} A rendered html template.
 */
function renderModuleTemplate(template, props) {
    return renderTemplate(`modules/${MODULE_NAME}/templates/${template}`, props);
}


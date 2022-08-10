import { MODULE_DEBUG_TAG } from "./const.js";

/**
 * Utility class to handle logging to console with an attached debug tag to identify module logs.
 */
export class LogUtility {
    static log(logString) {
        console.log(processLog(logString));
    }

    static logError(logString) {
        console.error(processLog(logString));
    }

    static logWarning(logString) {
        console.warn(processLog(logString));
    }
}

function processLog(logString) {
    return `${MODULE_DEBUG_TAG} | ${logString}`;
}
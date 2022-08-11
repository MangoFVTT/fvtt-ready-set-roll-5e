import { MODULE_DEBUG_TAG } from "../data/const.js";

/**
 * Utility class to handle logging to console with an attached debug tag to identify module logs.
 */
export class LogUtility {
    /**
     * Sends an info log to the console.
     * @param {string} logString The string to log as an info. 
     */
    static log(logString) {
        console.log(processLog(logString));
    }

    /**
     * Sends an error log to the console and displays an error UI notification.
     * @param {string} logString The string to log as an error. 
     */
    static logError(logString) {
        ui.notifications.error(logString);
        console.error(processLog(logString));
    }

    /**
     * Sends a warning log to the console and displays a warning UI notification.
     * @param {string} logString The string to log as a warning. 
     */
    static logWarning(logString) {
        ui.notifications.warn(logString);
        console.warn(processLog(logString));
    }
}

/**
 * Attaches a debug tag to a string to prep it for console logging.
 * @param {string} logString The string to attach as a debug tag to.
 * @returns A formatted log string with the module debug tag attached.
 */
function processLog(logString) {
    return `${MODULE_DEBUG_TAG} | ${logString}`;
}
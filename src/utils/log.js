import { MODULE_DEBUG_TAG } from "../module/const.js";

/**
 * Utility class to handle logging to console with an attached debug tag to identify module logs.
 */
export class LogUtility {
    /**
     * Sends an info log to the console.
     * @param {String} logString The string to log as an info. 
     */
    static log(logString) {
        console.log(..._processLog(logString));
    }

    /**
     * Sends an error log to the console and displays an error UI notification.
     * @param {String} logString The string to log as an error. 
     */
    static logError(logString, options = {}) {
        if (options.ui ?? true) ui.notifications.error(logString, { console: false });
        if (options.console ?? true) console.error(..._processLog(logString));
    }

    /**
     * Sends a warning log to the console and displays a warning UI notification.
     * @param {String} logString The string to log as a warning. 
     */
    static logWarning(logString, options = {}) {
        if (options.ui ?? true) ui.notifications.warn(logString, { console: false });
        if (options.console ?? true) console.warn(..._processLog(logString));
    }
}

/**
 * Attaches a debug tag to a string to prep it for console logging.
 * @param {String} logString The string to attach as a debug tag to.
 * @returns A formatted log string with the module debug tag attached.
 * @private
 */
function _processLog(logString) {
    return [...MODULE_DEBUG_TAG, logString];
}
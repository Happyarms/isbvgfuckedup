/**
 * Map a transit status state to display properties.
 *
 * Follows the IsSeptaFcked pattern (lib/septa/rr/text.js) of pre-computing
 * CSS class, human-readable message, and emoji for each status state so that
 * templates can render the result directly without further logic.
 */

/** @type {Record<string, { cssClass: string, message: string, emoji: string }>} */
const STATUS_MAP = {
  FUCKED: {
    cssClass: 'status-fucked',
    message: 'Ja, BVG ist gefickt.',
    emoji: '\uD83D\uDD25', // fire
  },
  DEGRADED: {
    cssClass: 'status-degraded',
    message: 'BVG ist ein bisschen gefickt.',
    emoji: '\u26A0\uFE0F', // warning
  },
  FINE: {
    cssClass: 'status-fine',
    message: 'Nein, BVG l\u00E4uft.',
    emoji: '\u2705', // check mark
  },
  UNKNOWN: {
    cssClass: 'status-unknown',
    message: 'Keine Daten verf\u00FCgbar.',
    emoji: '\u2753', // question mark
  },
};

/**
 * Return display properties for the given status state.
 *
 * @param {string} state - One of FUCKED, DEGRADED, FINE, UNKNOWN
 * @returns {{ cssClass: string, message: string, emoji: string }}
 */
export function getStatusText(state) {
  return STATUS_MAP[state] || STATUS_MAP.UNKNOWN;
}

/**
 * Return the CSS class for a given status state.
 *
 * @param {string} state
 * @returns {string}
 */
export function getStatusClass(state) {
  return (STATUS_MAP[state] || STATUS_MAP.UNKNOWN).cssClass;
}

/**
 * Return the human-readable message for a given status state.
 *
 * @param {string} state
 * @returns {string}
 */
export function getMessage(state) {
  return (STATUS_MAP[state] || STATUS_MAP.UNKNOWN).message;
}

/**
 * Return the emoji for a given status state.
 *
 * @param {string} state
 * @returns {string}
 */
export function getEmoji(state) {
  return (STATUS_MAP[state] || STATUS_MAP.UNKNOWN).emoji;
}

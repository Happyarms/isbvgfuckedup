/**
 * Format transit status as speakable voice responses.
 *
 * Follows the STATUS_MAP pattern from status-text.js: each state maps to a
 * pre-computed German sentence.  formatVoiceResponse() assembles that base
 * sentence together with the live metrics and an optional stale-data caveat,
 * then produces both a plain-text field and an SSML-wrapped field with
 * <break> elements for natural pacing between sentences.
 */

/**
 * Base voice sentences keyed by state — same shape as the STATUS_MAP in
 * status-text.js, but carrying the speakable message instead of CSS/emoji.
 *
 * @type {Record<string, { message: string }>}
 */
const VOICE_MAP = {
  FUCKED: {
    message: 'Ja, BVG ist gefickt.',
  },
  DEGRADED: {
    message: 'BVG ist ein bisschen gefickt.',
  },
  FINE: {
    message: 'Nein, BVG l\u00E4uft.',
  },
  UNKNOWN: {
    message: 'Keine Daten verf\u00FCgbar.',
  },
};

/** Appended (text) / appended after a break (SSML) when poller data is stale. */
const STALE_WARNING = 'Hinweis: Diese Daten k\u00F6nnen veraltet sein.';

/**
 * Build the metrics sentence that names total services and disruption
 * percentage.  Only called for states where metrics are meaningful.
 *
 * @param {{ totalServices: number, percentDisrupted: number }} metrics
 * @returns {string}
 */
function buildMetricsText(metrics) {
  return `Von ${metrics.totalServices} Diensten sind ${metrics.percentDisrupted} Prozent betroffen.`;
}

/**
 * Format a poller status object into a voice-ready response.
 *
 * The returned *text* is a plain German sentence suitable for display or as
 * input to a TTS engine.  The returned *ssml* is the same content wrapped in
 * <speak> with <break> elements between sentences for natural pacing.
 *
 * @param {{ state: string, metrics: { totalServices: number, percentDisrupted: number }, stale: boolean }} status
 * @returns {{ text: string, ssml: string, state: string, stale: boolean }}
 */
export function formatVoiceResponse({ state, metrics, stale }) {
  const entry = VOICE_MAP[state] || VOICE_MAP.UNKNOWN;
  const resolvedState = VOICE_MAP[state] ? state : 'UNKNOWN';

  // --- plain text --------------------------------------------------------
  const textParts = [entry.message];

  if (metrics && resolvedState !== 'UNKNOWN') {
    textParts.push(buildMetricsText(metrics));
  }

  if (stale) {
    textParts.push(STALE_WARNING);
  }

  const text = textParts.join(' ');

  // --- SSML (breaks between sentences for natural pacing) ---------------
  const ssmlParts = [entry.message];

  if (metrics && resolvedState !== 'UNKNOWN') {
    ssmlParts.push(`<break time="800ms"/>${buildMetricsText(metrics)}`);
  }

  if (stale) {
    ssmlParts.push(`<break time="500ms"/>${STALE_WARNING}`);
  }

  const ssml = `<speak>${ssmlParts.join(' ')}</speak>`;

  return { text, ssml, state: resolvedState, stale: Boolean(stale) };
}

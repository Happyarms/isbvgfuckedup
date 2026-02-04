/**
 * Voice-assistant route handlers.
 *
 * Two endpoints, both wired to the same poller cache as the main routes:
 *   GET  /                  — universal JSON voice response (Siri Shortcuts).
 *   POST /google-assistant  — Dialogflow CX webhook (Google Assistant).
 *
 * The router is mounted at /api/voice by the parent router in index.js, so
 * the full public paths become /api/voice and /api/voice/google-assistant.
 */

import { Router, json } from 'express';
import { formatVoiceResponse } from '../services/voice-response.js';

/**
 * Create voice route handlers wired to the given poller.
 *
 * All status data is pre-computed by the poller — getStatus() returns
 * instantly from the in-memory cache so no async handling is needed.
 *
 * @param {{ getStatus: Function }} poller
 * @returns {Router}
 */
export function createVoiceRoutes(poller) {
  const router = Router();

  // Body-parser scoped to this router only — server.js has no global one.
  router.use(json());

  /**
   * GET / — Plain voice-status JSON.
   *
   * Consumed by Siri Shortcuts via a URL fetch.  Returns the current
   * transit status formatted for text-to-speech.
   */
  router.get('/', (req, res) => {
    const status = poller.getStatus();
    const voice = formatVoiceResponse(status);

    res.json({
      text:  voice.text,
      ssml:  voice.ssml,
      state: voice.state,
      stale: voice.stale,
    });
  });

  /**
   * POST /google-assistant — Dialogflow CX webhook.
   *
   * Accepts the standard Dialogflow CX fulfillment request body and
   * returns a fulfillmentResponse the platform will speak aloud.
   * A missing or malformed body is treated as an UNKNOWN-state query
   * so that the endpoint never returns a 4xx/5xx to the webhook caller.
   */
  router.post('/google-assistant', (req, res) => {
    const status = poller.getStatus();

    // If the body is missing or not an object, synthesise a minimal
    // UNKNOWN status so that formatVoiceResponse can still produce a
    // well-formed reply without crashing.
    const effectiveStatus =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? status
        : { state: 'UNKNOWN', metrics: null, stale: false };

    const voice = formatVoiceResponse(effectiveStatus);

    res.json({
      fulfillmentResponse: {
        messages: [
          {
            text:   { text: [voice.text] },
            speech: voice.ssml,
          },
        ],
      },
    });
  });

  return router;
}

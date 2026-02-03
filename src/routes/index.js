/**
 * Route handlers.
 *
 * Follows the IsSeptaFcked routes pattern:
 *   - routes/main.js  — render pre-computed status data into a Pug template.
 *   - routes/api-status.js — return JSON with CORS headers.
 *
 * Routes receive the poller via dependency injection so that tests can
 * supply a mock without touching the real BVG API.
 */

import { Router } from 'express';

/**
 * Create route handlers wired to the given poller.
 *
 * All status data is pre-computed by the poller — getStatus() returns
 * instantly from the in-memory cache so no async handling is needed.
 *
 * @param {{ getStatus: Function }} poller
 * @returns {Router}
 */
export function createRoutes(poller) {
  const router = Router();

  /**
   * GET / — Main status page.
   *
   * Reads pre-computed status from the poller cache and passes the
   * display properties directly to index.pug (no logic in the route).
   */
  router.get('/', (req, res) => {
    const status = poller.getStatus();

    const timestamp = status.timestamp
      ? new Date(status.timestamp).toLocaleString('de-DE')
      : null;

    res.render('index', {
      title: 'Ist BVG gefickt?',
      bodyClass: status.text.cssClass,
      statusClass: status.text.cssClass,
      message: status.text.message,
      emoji: status.text.emoji,
      metrics: status.metrics,
      transitBoxes: status.transitBoxes,
      stale: status.stale,
      timestamp,
    });
  });

  /**
   * GET /api/status — JSON API endpoint.
   *
   * Returns the current status as JSON. CORS headers are applied by
   * the middleware in server.js so any origin can consume this endpoint.
   */
  router.get('/api/status', (req, res) => {
    const status = poller.getStatus();

    res.json({
      state: status.state,
      metrics: status.metrics,
      message: status.text.message,
      timestamp: status.timestamp,
      stale: status.stale,
    });
  });

  return router;
}

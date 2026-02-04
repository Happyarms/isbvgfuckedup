/**
 * Integration tests for the Express API.
 *
 * Tests the full request-response cycle using Supertest with a mocked poller.
 * The test app mirrors the real server.js setup (Pug views, CORS middleware,
 * error handler) but substitutes a controlled poller so no real BVG API calls
 * are made.
 *
 * Covers:
 *   - GET /       → 200 HTML with status text
 *   - GET /api/status → 200 JSON with state/metrics/timestamp
 *   - Error-handling middleware
 *   - Concurrent requests
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';

import { createRoutes } from '../../src/routes/index.js';

// ---------------------------------------------------------------------------
// Resolve paths for Pug views & static files
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', '..', 'src');

// ---------------------------------------------------------------------------
// Mock poller factory
// ---------------------------------------------------------------------------

/**
 * Create a mock poller whose getStatus() returns the given status object.
 *
 * @param {object} statusOverrides - Partial status object
 * @returns {{ getStatus: Function }}
 */
function createMockPoller(statusOverrides = {}) {
  const defaults = {
    state: 'FINE',
    metrics: {
      totalServices: 20,
      delayedCount: 1,
      cancelledCount: 0,
      disruptedCount: 1,
      percentDelayed: 5,
      percentCancelled: 0,
      percentDisrupted: 5,
    },
    text: {
      cssClass: 'status-fine',
      message: 'Nein, BVG l\u00E4uft.',
      emoji: '\u2705',
    },
    transitBoxes: {
      bus: { delayed: 0, cancelled: 0 },
      ubahn: { delayed: 0, cancelled: 0 },
      tram: { delayed: 0, cancelled: 0 },
      sbahn: { delayed: 0, cancelled: 0 },
    },
    timestamp: Date.now(),
    stale: false,
  };

  const status = { ...defaults, ...statusOverrides };

  return {
    getStatus: () => ({ ...status }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

/**
 * Build an Express app mirroring server.js setup with a given mock poller.
 *
 * @param {{ getStatus: Function }} poller
 * @returns {express.Application}
 */
function createTestApp(poller) {
  const app = express();

  app.set('view engine', 'pug');
  app.set('views', path.join(srcDir, 'views'));
  app.use(express.static(path.join(srcDir, 'public')));

  // CORS for /api routes (mirrors server.js)
  app.use('/api', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
  });

  app.use(createRoutes(poller));

  // Error-handling middleware (mirrors server.js)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    res.status(status).render('error', {
      title: 'Fehler - Ist BVG gefickt?',
      bodyClass: 'status-unknown',
      errorMessage: err.message,
    });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('API integration', () => {
  // -----------------------------------------------------------------------
  // GET / — Main status page
  // -----------------------------------------------------------------------

  describe('GET /', () => {
    it('returns 200 with HTML content type', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    it('renders the status message in the HTML body', async () => {
      const poller = createMockPoller({
        state: 'FINE',
        text: {
          cssClass: 'status-fine',
          message: 'Nein, BVG l\u00E4uft.',
          emoji: '\u2705',
        },
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.text).toContain('Nein, BVG l\u00E4uft.');
    });

    it('includes the status CSS class on the body element', async () => {
      const poller = createMockPoller({
        state: 'FUCKED',
        text: {
          cssClass: 'status-fucked',
          message: 'Ja, BVG ist gefickt.',
          emoji: '\uD83D\uDD25',
        },
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.text).toContain('status-fucked');
    });

    it('renders metrics when available', async () => {
      const poller = createMockPoller({
        metrics: {
          totalServices: 50,
          delayedCount: 10,
          cancelledCount: 5,
          disruptedCount: 15,
          percentDelayed: 20,
          percentCancelled: 10,
          percentDisrupted: 30,
        },
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.text).toContain('20%');
      expect(res.text).toContain('10%');
      expect(res.text).toContain('50');
    });

    it('includes stale warning when data is stale', async () => {
      const poller = createMockPoller({ stale: true });
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.text).toContain('Daten sind veraltet');
    });

    it('does not include stale warning when data is fresh', async () => {
      const poller = createMockPoller({ stale: false });
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.text).not.toContain('Daten sind veraltet');
    });

    it('renders UNKNOWN state correctly', async () => {
      const poller = createMockPoller({
        state: 'UNKNOWN',
        metrics: {
          totalServices: 0,
          delayedCount: 0,
          cancelledCount: 0,
          disruptedCount: 0,
          percentDelayed: 0,
          percentCancelled: 0,
          percentDisrupted: 0,
        },
        text: {
          cssClass: 'status-unknown',
          message: 'Keine Daten verf\u00FCgbar.',
          emoji: '\u2753',
        },
        timestamp: null,
        stale: true,
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('status-unknown');
      expect(res.text).toContain('Keine Daten verf\u00FCgbar.');
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/status — JSON API endpoint
  // -----------------------------------------------------------------------

  describe('GET /api/status', () => {
    it('returns 200 with JSON content type', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('returns state in the response body', async () => {
      const poller = createMockPoller({ state: 'DEGRADED' });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body.state).toBe('DEGRADED');
    });

    it('returns metrics in the response body', async () => {
      const metrics = {
        totalServices: 30,
        delayedCount: 5,
        cancelledCount: 2,
        disruptedCount: 7,
        percentDelayed: 17,
        percentCancelled: 7,
        percentDisrupted: 23,
      };
      const poller = createMockPoller({ metrics });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body.metrics).toEqual(metrics);
    });

    it('returns timestamp in the response body', async () => {
      const ts = 1706300000000;
      const poller = createMockPoller({ timestamp: ts });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body.timestamp).toBe(ts);
    });

    it('returns stale flag in the response body', async () => {
      const poller = createMockPoller({ stale: true });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body.stale).toBe(true);
    });

    it('returns message in the response body', async () => {
      const poller = createMockPoller({
        text: {
          cssClass: 'status-fucked',
          message: 'Ja, BVG ist gefickt.',
          emoji: '\uD83D\uDD25',
        },
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body.message).toBe('Ja, BVG ist gefickt.');
    });

    it('returns emoji in the response body', async () => {
      const poller = createMockPoller({
        text: {
          cssClass: 'status-fucked',
          message: 'Ja, BVG ist gefickt.',
          emoji: '\uD83D\uDD25',
        },
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body.emoji).toBe('\uD83D\uDD25');
    });

    it('returns cssClass matching the state in the response body', async () => {
      const poller = createMockPoller({
        state: 'FUCKED',
        text: {
          cssClass: 'status-fucked',
          message: 'Ja, BVG ist gefickt.',
          emoji: '\uD83D\uDD25',
        },
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body.cssClass).toBe('status-fucked');
    });

    it('returns transitBoxes with the expected shape', async () => {
      const transitBoxes = {
        bus: { delayed: 2, cancelled: 1 },
        ubahn: { delayed: 0, cancelled: 3 },
        tram: { delayed: 1, cancelled: 0 },
        sbahn: { delayed: 4, cancelled: 2 },
      };
      const poller = createMockPoller({ transitBoxes });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body.transitBoxes).toEqual(transitBoxes);
    });

    it('includes CORS headers', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toBe('GET');
    });

    it('returns complete JSON shape with all expected fields', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.body).toHaveProperty('state');
      expect(res.body).toHaveProperty('metrics');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('emoji');
      expect(res.body).toHaveProperty('cssClass');
      expect(res.body).toHaveProperty('transitBoxes');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('stale');
    });
  });

  // -----------------------------------------------------------------------
  // Error-handling middleware
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('returns 500 and renders error page for route errors', async () => {
      const poller = {
        getStatus: () => {
          throw new Error('Poller exploded');
        },
      };
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('status-unknown');
    });

    it('renders error message in error page', async () => {
      const poller = {
        getStatus: () => {
          throw new Error('Cache corrupted');
        },
      };
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.text).toContain('Cache corrupted');
    });

    it('uses custom status code from error object', async () => {
      const poller = {
        getStatus: () => {
          const err = new Error('Service unavailable');
          err.status = 503;
          throw err;
        },
      };
      const app = createTestApp(poller);

      const res = await request(app).get('/');

      expect(res.status).toBe(503);
    });

    it('returns 404 for unknown routes', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      // Add a 404 handler after routes (like a production app would)
      app.use((req, res) => {
        res.status(404).render('error', {
          title: 'Nicht gefunden',
          bodyClass: 'status-unknown',
          errorMessage: 'Seite nicht gefunden.',
        });
      });

      const res = await request(app).get('/nonexistent-page');

      expect(res.status).toBe(404);
    });

    it('handles JSON API errors gracefully', async () => {
      const poller = {
        getStatus: () => {
          throw new Error('JSON error');
        },
      };
      const app = createTestApp(poller);

      const res = await request(app).get('/api/status');

      expect(res.status).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // Concurrent requests
  // -----------------------------------------------------------------------

  describe('concurrent requests', () => {
    it('handles multiple simultaneous GET / requests', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const responses = await Promise.all([
        request(app).get('/'),
        request(app).get('/'),
        request(app).get('/'),
        request(app).get('/'),
        request(app).get('/'),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.text).toContain('Nein, BVG l\u00E4uft.');
      }
    });

    it('handles multiple simultaneous GET /api/status requests', async () => {
      const poller = createMockPoller({ state: 'FUCKED' });
      const app = createTestApp(poller);

      const responses = await Promise.all([
        request(app).get('/api/status'),
        request(app).get('/api/status'),
        request(app).get('/api/status'),
        request(app).get('/api/status'),
        request(app).get('/api/status'),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.state).toBe('FUCKED');
      }
    });

    it('handles mixed HTML and JSON requests concurrently', async () => {
      const poller = createMockPoller({ state: 'DEGRADED' });
      const app = createTestApp(poller);

      const [htmlRes, jsonRes, htmlRes2, jsonRes2] = await Promise.all([
        request(app).get('/'),
        request(app).get('/api/status'),
        request(app).get('/'),
        request(app).get('/api/status'),
      ]);

      expect(htmlRes.status).toBe(200);
      expect(htmlRes.headers['content-type']).toMatch(/text\/html/);

      expect(jsonRes.status).toBe(200);
      expect(jsonRes.body.state).toBe('DEGRADED');

      expect(htmlRes2.status).toBe(200);
      expect(jsonRes2.body.state).toBe('DEGRADED');
    });

    it('serves consistent data across concurrent requests', async () => {
      const poller = createMockPoller({
        state: 'FINE',
        timestamp: 1706300000000,
      });
      const app = createTestApp(poller);

      const responses = await Promise.all(
        Array.from({ length: 10 }, () => request(app).get('/api/status'))
      );

      const states = responses.map((r) => r.body.state);
      const timestamps = responses.map((r) => r.body.timestamp);

      // All responses should have identical state and timestamp
      expect(new Set(states).size).toBe(1);
      expect(new Set(timestamps).size).toBe(1);
    });
  });
});

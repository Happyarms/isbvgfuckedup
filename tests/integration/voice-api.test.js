/**
 * Integration tests for the Voice API endpoints.
 *
 * Tests the full request-response cycle using Supertest with a mocked poller.
 * The test app mirrors the real server.js setup (Pug views, CORS middleware,
 * error handler) but substitutes a controlled poller so no real BVG API calls
 * are made.
 *
 * Covers:
 *   - GET  /api/voice                  → 200 JSON with text/ssml/state/stale
 *   - POST /api/voice/google-assistant → 200 Dialogflow fulfillment response
 *   - CORS headers on /api/voice
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

describe('Voice API integration', () => {
  // -----------------------------------------------------------------------
  // GET /api/voice — Siri Shortcuts voice-status JSON
  // -----------------------------------------------------------------------

  describe('GET /api/voice', () => {
    it('returns 200 with JSON content type', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('returns state FINE for a healthy system', async () => {
      const poller = createMockPoller({ state: 'FINE' });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.body.state).toBe('FINE');
    });

    it('returns state DEGRADED', async () => {
      const poller = createMockPoller({
        state: 'DEGRADED',
        text: {
          cssClass: 'status-degraded',
          message: 'BVG ist ein bisschen gefickt.',
          emoji: '\u26A0\uFE0F',
        },
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.body.state).toBe('DEGRADED');
    });

    it('returns state FUCKED', async () => {
      const poller = createMockPoller({
        state: 'FUCKED',
        text: {
          cssClass: 'status-fucked',
          message: 'Ja, BVG ist gefickt.',
          emoji: '\uD83D\uDD25',
        },
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.body.state).toBe('FUCKED');
    });

    it('returns state UNKNOWN', async () => {
      const poller = createMockPoller({
        state: 'UNKNOWN',
        metrics: null,
        text: {
          cssClass: 'status-unknown',
          message: 'Keine Daten verf\u00FCgbar.',
          emoji: '\u2753',
        },
        timestamp: null,
        stale: true,
      });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.body.state).toBe('UNKNOWN');
    });

    it('text field is a non-empty string', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(typeof res.body.text).toBe('string');
      expect(res.body.text.length).toBeGreaterThan(0);
    });

    it('ssml field is a non-empty string wrapped in <speak>', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(typeof res.body.ssml).toBe('string');
      expect(res.body.ssml.length).toBeGreaterThan(0);
      expect(res.body.ssml).toMatch(/^<speak>/);
      expect(res.body.ssml).toMatch(/<\/speak>$/);
    });

    it('stale flag is present and false when data is fresh', async () => {
      const poller = createMockPoller({ stale: false });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.body).toHaveProperty('stale');
      expect(res.body.stale).toBe(false);
    });

    it('stale flag is true when data is stale', async () => {
      const poller = createMockPoller({ stale: true });
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.body.stale).toBe(true);
    });

    it('response shape has all expected fields', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.body).toHaveProperty('text');
      expect(res.body).toHaveProperty('ssml');
      expect(res.body).toHaveProperty('state');
      expect(res.body).toHaveProperty('stale');
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/voice/google-assistant — Dialogflow CX webhook
  // -----------------------------------------------------------------------

  describe('POST /api/voice/google-assistant', () => {
    it('returns 200 with valid Dialogflow fulfillment body', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app)
        .post('/api/voice/google-assistant')
        .send({ fulfillmentInfo: { tag: 'bvg-status' } });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('response has fulfillmentResponse.messages array', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app)
        .post('/api/voice/google-assistant')
        .send({ fulfillmentInfo: { tag: 'bvg-status' } });

      expect(res.body).toHaveProperty('fulfillmentResponse');
      expect(res.body.fulfillmentResponse).toHaveProperty('messages');
      expect(Array.isArray(res.body.fulfillmentResponse.messages)).toBe(true);
      expect(res.body.fulfillmentResponse.messages.length).toBeGreaterThan(0);
    });

    it('speech field is present with German text', async () => {
      const poller = createMockPoller({ state: 'FINE' });
      const app = createTestApp(poller);

      const res = await request(app)
        .post('/api/voice/google-assistant')
        .send({ fulfillmentInfo: { tag: 'bvg-status' } });

      const message = res.body.fulfillmentResponse.messages[0];
      expect(typeof message.speech).toBe('string');
      expect(message.speech.length).toBeGreaterThan(0);
      expect(message.speech).toContain('BVG');
    });

    it('handles empty body gracefully with 200 and UNKNOWN state', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      // Express json() initialises req.body to {} when no JSON is sent, so
      // the route's real defensive guard is the !Array.isArray check.  Sending
      // an array exercises that path and produces the UNKNOWN fallback.
      const res = await request(app)
        .post('/api/voice/google-assistant')
        .send([]);

      expect(res.status).toBe(200);

      const message = res.body.fulfillmentResponse.messages[0];
      expect(message.speech).toContain('Keine Daten verf\u00FCgbar');
    });
  });

  // -----------------------------------------------------------------------
  // CORS headers
  // -----------------------------------------------------------------------

  describe('CORS headers', () => {
    it('GET /api/voice has Access-Control-Allow-Origin header', async () => {
      const poller = createMockPoller();
      const app = createTestApp(poller);

      const res = await request(app).get('/api/voice');

      expect(res.headers['access-control-allow-origin']).toBe('*');
    });
  });
});

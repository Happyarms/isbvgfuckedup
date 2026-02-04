/**
 * Unit tests for the patchDOM function in client.js.
 *
 * patchDOM surgically updates the status page DOM in place when fresh data
 * arrives from /api/status — replacing a full-page reload with a sub-
 * millisecond in-place patch.
 *
 * DOM elements patched:
 *   - body className and .status className → data.cssClass
 *   - .status-emoji textContent           → data.emoji
 *   - .status-text textContent            → data.message
 *   - .metric-value[0..2]                 → percentDelayed%, percentCancelled%, totalServices
 *   - {type}-{delayed|cancelled}-count    → data.transitBoxes counts
 *   - .stale-warning                      → created / removed based on data.stale
 *   - .timestamp                          → "Zuletzt aktualisiert: " + de-DE locale date
 *
 * The function should:
 *   - Switch body and .status classes for every known state
 *   - Update emoji and message text
 *   - Update all three metric values
 *   - Update all 8 transit box counts via IDs
 *   - Create the stale warning element when absent and stale=true
 *   - Remove the stale warning element when present and stale=false
 *   - Format timestamp with de-DE locale
 *   - Gracefully skip any DOM element that is missing
 */

import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Extract patchDOM from client.js IIFE
// ---------------------------------------------------------------------------
// patchDOM lives inside an IIFE but only references the global `document` —
// no closures over IIFE-local variables.  Read the source, extract the function
// body via regex, and wrap it in a new Function so it runs against the
// global.document that each test installs.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const clientSource = readFileSync(
  resolve(__dirname, '../src/public/js/client.js'),
  'utf8'
);

const patchDOMMatch = clientSource.match(
  /function patchDOM\(data\) \{([\s\S]*?)\r?\n  \}/
);

if (!patchDOMMatch) {
  throw new Error('Could not extract patchDOM from client.js — check the regex');
}

const patchDOM = new Function('data', patchDOMMatch[1]);

// ---------------------------------------------------------------------------
// Test setup: Create full page DOM fixture
// ---------------------------------------------------------------------------

/**
 * Create a DOM matching the full Pug template output (src/views/index.pug).
 * Individual sections can be excluded to test graceful handling of missing
 * elements (metrics not rendered when totalServices === 0, transit boxes
 * not rendered when transitBoxes is falsy on initial load, etc.).
 *
 * @param {Object}  [options]
 * @param {boolean} [options.includeMetrics=true]       - .metrics section
 * @param {boolean} [options.includeTransitBoxes=true]  - transit boxes with IDs
 * @param {boolean} [options.includeStaleWarning=false] - .stale-warning div
 * @returns {Document} happy-dom document
 */
function createFullPageDOM({
  includeMetrics = true,
  includeTransitBoxes = true,
  includeStaleWarning = false,
} = {}) {
  const window = new Window();
  const document = window.document;

  document.body.className = 'status-fine';
  document.body.innerHTML = `
    <div class="status-container">
      <h1 class="site-title">Ist BVG gefickt?</h1>

      <div class="status status-fine">
        <span class="status-emoji">✅</span>
        <div class="status-text">Alles läuft.</div>
      </div>

      ${includeTransitBoxes ? `
      <div class="transit-boxes">
        <div class="transit-box" data-type="bus">
          <h3>Bus</h3>
          <div>
            <span>Verspätet:</span>
            <span class="count" id="bus-delayed-count">0</span>
          </div>
          <div>
            <span>Ausgefallen:</span>
            <span class="count" id="bus-cancelled-count">0</span>
          </div>
        </div>
        <div class="transit-box" data-type="ubahn">
          <h3>U-Bahn</h3>
          <div>
            <span>Verspätet:</span>
            <span class="count" id="ubahn-delayed-count">0</span>
          </div>
          <div>
            <span>Ausgefallen:</span>
            <span class="count" id="ubahn-cancelled-count">0</span>
          </div>
        </div>
        <div class="transit-box" data-type="tram">
          <h3>Tram</h3>
          <div>
            <span>Verspätet:</span>
            <span class="count" id="tram-delayed-count">0</span>
          </div>
          <div>
            <span>Ausgefallen:</span>
            <span class="count" id="tram-cancelled-count">0</span>
          </div>
        </div>
        <div class="transit-box" data-type="sbahn">
          <h3>S-Bahn</h3>
          <div>
            <span>Verspätet:</span>
            <span class="count" id="sbahn-delayed-count">0</span>
          </div>
          <div>
            <span>Ausgefallen:</span>
            <span class="count" id="sbahn-cancelled-count">0</span>
          </div>
        </div>
      </div>
      ` : ''}

      ${includeMetrics ? `
      <div class="metrics">
        <div class="metric">
          <span class="metric-value">0%</span>
          <span class="metric-label">verspaetet</span>
        </div>
        <div class="metric">
          <span class="metric-value">0%</span>
          <span class="metric-label">ausgefallen</span>
        </div>
        <div class="metric">
          <span class="metric-value">0</span>
          <span class="metric-label">Abfahrten</span>
        </div>
      </div>
      ` : ''}

      ${includeStaleWarning ? '<div class="stale-warning">Daten sind veraltet.</div>' : ''}

      <div class="footer-info">
        <div class="timestamp">Zuletzt aktualisiert: 4.2.2026, 10:30:00</div>
        <div class="refresh-indicator">Automatische Aktualisierung alle 60 Sekunden</div>
      </div>
    </div>
  `;

  return document;
}

// ---------------------------------------------------------------------------
// Body class switching
// ---------------------------------------------------------------------------

describe('patchDOM', () => {
  describe('body class switching', () => {
    it('sets body className to status-fine for FINE state', () => {
      const document = createFullPageDOM();
      document.body.className = 'status-unknown';
      global.document = document;

      patchDOM({ cssClass: 'status-fine' });

      expect(document.body.className).toBe('status-fine');

      delete global.document;
    });

    it('sets body className to status-degraded for DEGRADED state', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ cssClass: 'status-degraded' });

      expect(document.body.className).toBe('status-degraded');

      delete global.document;
    });

    it('sets body className to status-fucked for FUCKED state', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ cssClass: 'status-fucked' });

      expect(document.body.className).toBe('status-fucked');

      delete global.document;
    });

    it('sets body className to status-unknown for UNKNOWN state', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ cssClass: 'status-unknown' });

      expect(document.body.className).toBe('status-unknown');

      delete global.document;
    });

    it('updates .status element className alongside body', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ cssClass: 'status-fucked' });

      expect(document.querySelector('.status').className).toBe('status status-fucked');

      delete global.document;
    });

    it('clears body className when cssClass is missing', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({});

      expect(document.body.className).toBe('');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Status emoji and text
  // ---------------------------------------------------------------------------

  describe('status emoji and text', () => {
    it('updates status emoji', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ emoji: '🔥' });

      expect(document.querySelector('.status-emoji').textContent).toBe('🔥');

      delete global.document;
    });

    it('updates status text message', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ message: 'Alles auf dem Tisch.' });

      expect(document.querySelector('.status-text').textContent).toBe('Alles auf dem Tisch.');

      delete global.document;
    });

    it('updates both emoji and text together', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ emoji: '💀', message: 'Komplett am Arsch.' });

      expect(document.querySelector('.status-emoji').textContent).toBe('💀');
      expect(document.querySelector('.status-text').textContent).toBe('Komplett am Arsch.');

      delete global.document;
    });

    it('clears emoji when emoji field is empty string', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ emoji: '' });

      expect(document.querySelector('.status-emoji').textContent).toBe('');

      delete global.document;
    });

    it('clears message when message field is empty string', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({ message: '' });

      expect(document.querySelector('.status-text').textContent).toBe('');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Metric values
  // ---------------------------------------------------------------------------

  describe('metric values', () => {
    it('updates all three metric values', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({
        metrics: { percentDelayed: 15, percentCancelled: 8, totalServices: 120 },
      });

      const metricValues = document.querySelectorAll('.metric-value');
      expect(metricValues[0].textContent).toBe('15%');
      expect(metricValues[1].textContent).toBe('8%');
      expect(metricValues[2].textContent).toBe('120');

      delete global.document;
    });

    it('displays 0% and 0 for zero metric values', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({
        metrics: { percentDelayed: 0, percentCancelled: 0, totalServices: 0 },
      });

      const metricValues = document.querySelectorAll('.metric-value');
      expect(metricValues[0].textContent).toBe('0%');
      expect(metricValues[1].textContent).toBe('0%');
      expect(metricValues[2].textContent).toBe('0');

      delete global.document;
    });

    it('leaves metrics unchanged when metrics field is missing', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({});

      const metricValues = document.querySelectorAll('.metric-value');
      expect(metricValues[0].textContent).toBe('0%');
      expect(metricValues[1].textContent).toBe('0%');
      expect(metricValues[2].textContent).toBe('0');

      delete global.document;
    });

    it('updates metrics on successive calls', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({
        metrics: { percentDelayed: 5, percentCancelled: 3, totalServices: 80 },
      });

      const metricValues = document.querySelectorAll('.metric-value');
      expect(metricValues[0].textContent).toBe('5%');
      expect(metricValues[1].textContent).toBe('3%');
      expect(metricValues[2].textContent).toBe('80');

      patchDOM({
        metrics: { percentDelayed: 25, percentCancelled: 12, totalServices: 200 },
      });

      expect(metricValues[0].textContent).toBe('25%');
      expect(metricValues[1].textContent).toBe('12%');
      expect(metricValues[2].textContent).toBe('200');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Transit box counts
  // ---------------------------------------------------------------------------

  describe('transit box counts', () => {
    it('updates delayed counts for all transit types', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({
        transitBoxes: {
          bus: { delayed: 5, cancelled: 2 },
          ubahn: { delayed: 3, cancelled: 1 },
          tram: { delayed: 7, cancelled: 4 },
          sbahn: { delayed: 2, cancelled: 0 },
        },
      });

      expect(document.getElementById('bus-delayed-count').textContent).toBe('5');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('3');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('7');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('2');

      delete global.document;
    });

    it('updates cancelled counts for all transit types', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({
        transitBoxes: {
          bus: { delayed: 5, cancelled: 2 },
          ubahn: { delayed: 3, cancelled: 1 },
          tram: { delayed: 7, cancelled: 4 },
          sbahn: { delayed: 2, cancelled: 0 },
        },
      });

      expect(document.getElementById('bus-cancelled-count').textContent).toBe('2');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('1');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('4');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('0');

      delete global.document;
    });

    it('displays "0" for zero and falsy transit counts', () => {
      const document = createFullPageDOM();
      global.document = document;

      patchDOM({
        transitBoxes: {
          bus: { delayed: 0, cancelled: 0 },
          ubahn: { delayed: undefined, cancelled: null },
          tram: {},
          sbahn: { delayed: 3, cancelled: 1 },
        },
      });

      expect(document.getElementById('bus-delayed-count').textContent).toBe('0');
      expect(document.getElementById('bus-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('0');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('3');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('1');

      delete global.document;
    });

    it('leaves counts unchanged when transitBoxes field is missing', () => {
      const document = createFullPageDOM();
      global.document = document;

      document.getElementById('bus-delayed-count').textContent = '99';

      patchDOM({});

      expect(document.getElementById('bus-delayed-count').textContent).toBe('99');

      delete global.document;
    });

    it('skips missing transit types without error', () => {
      const document = createFullPageDOM();
      global.document = document;

      document.getElementById('ubahn-delayed-count').textContent = 'INITIAL';

      patchDOM({
        transitBoxes: {
          bus: { delayed: 5, cancelled: 2 },
          // ubahn is missing
          tram: { delayed: 7, cancelled: 4 },
          sbahn: { delayed: 2, cancelled: 0 },
        },
      });

      expect(document.getElementById('bus-delayed-count').textContent).toBe('5');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('INITIAL');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Stale warning creation
  // ---------------------------------------------------------------------------

  describe('stale warning creation', () => {
    it('creates stale warning when stale=true and element is missing', () => {
      const document = createFullPageDOM({ includeStaleWarning: false });
      global.document = document;

      patchDOM({ stale: true });

      const staleWarning = document.querySelector('.stale-warning');
      expect(staleWarning).not.toBeNull();
      expect(staleWarning.textContent).toBe('Daten sind veraltet.');

      delete global.document;
    });

    it('inserts stale warning as sibling before .footer-info', () => {
      const document = createFullPageDOM({ includeStaleWarning: false });
      global.document = document;

      const footerInfo = document.querySelector('.footer-info');

      patchDOM({ stale: true });

      const staleWarning = document.querySelector('.stale-warning');
      expect(staleWarning).not.toBeNull();
      expect(staleWarning.parentNode).toBe(footerInfo.parentNode);

      delete global.document;
    });

    it('does not duplicate stale warning when already present', () => {
      const document = createFullPageDOM({ includeStaleWarning: true });
      global.document = document;

      patchDOM({ stale: true });

      const warnings = document.querySelectorAll('.stale-warning');
      expect(warnings.length).toBe(1);

      delete global.document;
    });

    it('does not add stale warning when .footer-info is missing', () => {
      const window = new Window();
      const document = window.document;
      document.body.innerHTML = '<div class="status-container"></div>';
      global.document = document;

      patchDOM({ stale: true });

      expect(document.querySelector('.stale-warning')).toBeNull();

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Stale warning removal
  // ---------------------------------------------------------------------------

  describe('stale warning removal', () => {
    it('removes stale warning when stale=false and element is present', () => {
      const document = createFullPageDOM({ includeStaleWarning: true });
      global.document = document;

      patchDOM({ stale: false });

      expect(document.querySelector('.stale-warning')).toBeNull();

      delete global.document;
    });

    it('does not throw when stale=false and warning is already absent', () => {
      const document = createFullPageDOM({ includeStaleWarning: false });
      global.document = document;

      expect(() => {
        patchDOM({ stale: false });
      }).not.toThrow();

      delete global.document;
    });

    it('removes warning that was previously created by patchDOM', () => {
      const document = createFullPageDOM({ includeStaleWarning: false });
      global.document = document;

      // First call: create the warning
      patchDOM({ stale: true });
      expect(document.querySelector('.stale-warning')).not.toBeNull();

      // Second call: remove it
      patchDOM({ stale: false });
      expect(document.querySelector('.stale-warning')).toBeNull();

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Timestamp formatting
  // ---------------------------------------------------------------------------

  describe('timestamp formatting', () => {
    it('updates timestamp with de-DE locale formatted string', () => {
      const document = createFullPageDOM();
      global.document = document;

      const testTimestamp = '2026-02-04T10:30:00.000Z';
      patchDOM({ timestamp: testTimestamp });

      const expected =
        'Zuletzt aktualisiert: ' + new Date(testTimestamp).toLocaleString('de-DE');
      expect(document.querySelector('.timestamp').textContent).toBe(expected);

      delete global.document;
    });

    it('updates timestamp on successive calls', () => {
      const document = createFullPageDOM();
      global.document = document;

      const ts1 = '2026-02-04T10:00:00.000Z';
      patchDOM({ timestamp: ts1 });
      expect(document.querySelector('.timestamp').textContent).toBe(
        'Zuletzt aktualisiert: ' + new Date(ts1).toLocaleString('de-DE')
      );

      const ts2 = '2026-02-04T11:00:00.000Z';
      patchDOM({ timestamp: ts2 });
      expect(document.querySelector('.timestamp').textContent).toBe(
        'Zuletzt aktualisiert: ' + new Date(ts2).toLocaleString('de-DE')
      );

      delete global.document;
    });

    it('leaves timestamp unchanged when timestamp field is missing', () => {
      const document = createFullPageDOM();
      global.document = document;

      const originalText = document.querySelector('.timestamp').textContent;
      patchDOM({});

      expect(document.querySelector('.timestamp').textContent).toBe(originalText);

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Missing DOM elements
  // ---------------------------------------------------------------------------

  describe('missing DOM elements', () => {
    it('does not throw when metrics section is not rendered', () => {
      const document = createFullPageDOM({ includeMetrics: false });
      global.document = document;

      expect(() => {
        patchDOM({
          metrics: { percentDelayed: 10, percentCancelled: 5, totalServices: 50 },
        });
      }).not.toThrow();

      delete global.document;
    });

    it('does not throw when transit boxes are not rendered', () => {
      const document = createFullPageDOM({ includeTransitBoxes: false });
      global.document = document;

      expect(() => {
        patchDOM({
          transitBoxes: {
            bus: { delayed: 1, cancelled: 0 },
            ubahn: { delayed: 0, cancelled: 1 },
            tram: { delayed: 2, cancelled: 0 },
            sbahn: { delayed: 0, cancelled: 0 },
          },
        });
      }).not.toThrow();

      delete global.document;
    });

    it('does not throw on a completely empty DOM', () => {
      const window = new Window();
      const document = window.document;
      document.body.innerHTML = '';
      global.document = document;

      expect(() => {
        patchDOM({
          cssClass: 'status-fine',
          emoji: '✅',
          message: 'OK',
          metrics: { percentDelayed: 0, percentCancelled: 0, totalServices: 0 },
          transitBoxes: {
            bus: { delayed: 0, cancelled: 0 },
            ubahn: { delayed: 0, cancelled: 0 },
            tram: { delayed: 0, cancelled: 0 },
            sbahn: { delayed: 0, cancelled: 0 },
          },
          stale: false,
          timestamp: '2026-02-04T10:00:00.000Z',
        });
      }).not.toThrow();

      delete global.document;
    });

    it('still updates body className even when other elements are missing', () => {
      const window = new Window();
      const document = window.document;
      document.body.innerHTML = '';
      global.document = document;

      patchDOM({ cssClass: 'status-fucked' });

      expect(document.body.className).toBe('status-fucked');

      delete global.document;
    });
  });
});

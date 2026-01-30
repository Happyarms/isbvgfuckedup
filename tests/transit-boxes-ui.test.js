/**
 * Integration tests for updateTransitBoxes DOM manipulation.
 *
 * Tests the updateTransitBoxes() function that updates transit box DOM elements
 * with delayed and cancelled counts for each transit type (bus, ubahn, tram, sbahn).
 *
 * DOM elements tested:
 *   - {type}-delayed-count (e.g., bus-delayed-count)
 *   - {type}-cancelled-count (e.g., bus-cancelled-count)
 *
 * The function should:
 *   - Update textContent of delay/cancel count elements
 *   - Display '0' for zero values (not empty string)
 *   - Handle missing/null data gracefully
 *   - Skip missing DOM elements without error
 */

import { Window } from 'happy-dom';
import { updateTransitBoxes } from '../src/public/js/app.js';

// ---------------------------------------------------------------------------
// Test setup: Create mock DOM environment
// ---------------------------------------------------------------------------

/**
 * Create a DOM with transit box elements.
 *
 * @returns {Document} - DOM document with transit boxes
 */
function createTransitBoxesDOM() {
  const window = new Window();
  const document = window.document;

  document.body.innerHTML = `
    <!DOCTYPE html>
    <html>
      <body>
        <div class="transit-boxes">
          <div class="transit-box" data-type="bus">
            <h3>Bus</h3>
            <div>
              <span>Verspätet:</span>
              <span id="bus-delayed-count"></span>
            </div>
            <div>
              <span>Ausgefallen:</span>
              <span id="bus-cancelled-count"></span>
            </div>
          </div>
          <div class="transit-box" data-type="ubahn">
            <h3>U-Bahn</h3>
            <div>
              <span>Verspätet:</span>
              <span id="ubahn-delayed-count"></span>
            </div>
            <div>
              <span>Ausgefallen:</span>
              <span id="ubahn-cancelled-count"></span>
            </div>
          </div>
          <div class="transit-box" data-type="tram">
            <h3>Tram</h3>
            <div>
              <span>Verspätet:</span>
              <span id="tram-delayed-count"></span>
            </div>
            <div>
              <span>Ausgefallen:</span>
              <span id="tram-cancelled-count"></span>
            </div>
          </div>
          <div class="transit-box" data-type="sbahn">
            <h3>S-Bahn</h3>
            <div>
              <span>Verspätet:</span>
              <span id="sbahn-delayed-count"></span>
            </div>
            <div>
              <span>Ausgefallen:</span>
              <span id="sbahn-cancelled-count"></span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return document;
}

// ---------------------------------------------------------------------------
// DOM element population
// ---------------------------------------------------------------------------

describe('updateTransitBoxes', () => {
  describe('DOM element population', () => {
    it('updates delayed counts for all transit types', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5, cancelled: 2 },
        ubahn: { delayed: 3, cancelled: 1 },
        tram: { delayed: 7, cancelled: 4 },
        sbahn: { delayed: 2, cancelled: 0 },
      };

      updateTransitBoxes(aggregatedData);

      expect(document.getElementById('bus-delayed-count').textContent).toBe('5');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('3');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('7');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('2');

      delete global.document;
    });

    it('updates cancelled counts for all transit types', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5, cancelled: 2 },
        ubahn: { delayed: 3, cancelled: 1 },
        tram: { delayed: 7, cancelled: 4 },
        sbahn: { delayed: 2, cancelled: 0 },
      };

      updateTransitBoxes(aggregatedData);

      expect(document.getElementById('bus-cancelled-count').textContent).toBe('2');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('1');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('4');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('0');

      delete global.document;
    });

    it('updates all 8 count elements correctly (4 delayed + 4 cancelled)', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 10, cancelled: 5 },
        ubahn: { delayed: 8, cancelled: 3 },
        tram: { delayed: 12, cancelled: 6 },
        sbahn: { delayed: 4, cancelled: 2 },
      };

      updateTransitBoxes(aggregatedData);

      // Verify all delayed counts
      expect(document.getElementById('bus-delayed-count').textContent).toBe('10');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('8');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('12');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('4');

      // Verify all cancelled counts
      expect(document.getElementById('bus-cancelled-count').textContent).toBe('5');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('3');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('6');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('2');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Zero value handling
  // ---------------------------------------------------------------------------

  describe('zero value handling', () => {
    it('displays "0" for zero delayed counts', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 0, cancelled: 2 },
        ubahn: { delayed: 0, cancelled: 1 },
        tram: { delayed: 0, cancelled: 4 },
        sbahn: { delayed: 0, cancelled: 0 },
      };

      updateTransitBoxes(aggregatedData);

      expect(document.getElementById('bus-delayed-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('0');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('0');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('0');

      delete global.document;
    });

    it('displays "0" for zero cancelled counts', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5, cancelled: 0 },
        ubahn: { delayed: 3, cancelled: 0 },
        tram: { delayed: 7, cancelled: 0 },
        sbahn: { delayed: 2, cancelled: 0 },
      };

      updateTransitBoxes(aggregatedData);

      expect(document.getElementById('bus-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('0');

      delete global.document;
    });

    it('displays "0" when all counts are zero', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 0, cancelled: 0 },
        ubahn: { delayed: 0, cancelled: 0 },
        tram: { delayed: 0, cancelled: 0 },
        sbahn: { delayed: 0, cancelled: 0 },
      };

      updateTransitBoxes(aggregatedData);

      // Verify all delayed counts are '0'
      expect(document.getElementById('bus-delayed-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('0');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('0');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('0');

      // Verify all cancelled counts are '0'
      expect(document.getElementById('bus-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('0');

      delete global.document;
    });

    it('displays "0" for undefined delayed values', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: undefined, cancelled: 2 },
        ubahn: { delayed: undefined, cancelled: 1 },
        tram: { delayed: undefined, cancelled: 4 },
        sbahn: { delayed: undefined, cancelled: 0 },
      };

      updateTransitBoxes(aggregatedData);

      expect(document.getElementById('bus-delayed-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('0');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('0');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('0');

      delete global.document;
    });

    it('displays "0" for null cancelled values', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5, cancelled: null },
        ubahn: { delayed: 3, cancelled: null },
        tram: { delayed: 7, cancelled: null },
        sbahn: { delayed: 2, cancelled: null },
      };

      updateTransitBoxes(aggregatedData);

      expect(document.getElementById('bus-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('0');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Invalid input handling
  // ---------------------------------------------------------------------------

  describe('invalid input handling', () => {
    it('does not throw error when aggregatedData is null', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      expect(() => {
        updateTransitBoxes(null);
      }).not.toThrow();

      delete global.document;
    });

    it('does not throw error when aggregatedData is undefined', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      expect(() => {
        updateTransitBoxes(undefined);
      }).not.toThrow();

      delete global.document;
    });

    it('does not throw error when aggregatedData is not an object', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      expect(() => {
        updateTransitBoxes('invalid');
      }).not.toThrow();

      expect(() => {
        updateTransitBoxes(123);
      }).not.toThrow();

      expect(() => {
        updateTransitBoxes([]);
      }).not.toThrow();

      delete global.document;
    });

    it('leaves DOM unchanged when aggregatedData is null', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      // Set initial values
      document.getElementById('bus-delayed-count').textContent = '5';
      document.getElementById('bus-cancelled-count').textContent = '2';

      updateTransitBoxes(null);

      // Values should remain unchanged
      expect(document.getElementById('bus-delayed-count').textContent).toBe('5');
      expect(document.getElementById('bus-cancelled-count').textContent).toBe('2');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Missing transit type handling
  // ---------------------------------------------------------------------------

  describe('missing transit type handling', () => {
    it('skips missing transit types without error', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5, cancelled: 2 },
        // ubahn is missing
        tram: { delayed: 7, cancelled: 4 },
        // sbahn is missing
      };

      expect(() => {
        updateTransitBoxes(aggregatedData);
      }).not.toThrow();

      // Verify present types were updated
      expect(document.getElementById('bus-delayed-count').textContent).toBe('5');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('7');

      delete global.document;
    });

    it('does not update elements for missing transit types', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      // Set initial values
      document.getElementById('ubahn-delayed-count').textContent = 'INITIAL';
      document.getElementById('sbahn-cancelled-count').textContent = 'INITIAL';

      const aggregatedData = {
        bus: { delayed: 5, cancelled: 2 },
        tram: { delayed: 7, cancelled: 4 },
      };

      updateTransitBoxes(aggregatedData);

      // Missing types should retain original values
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('INITIAL');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('INITIAL');

      delete global.document;
    });

    it('handles partial data objects (missing delayed or cancelled)', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5 }, // missing cancelled
        ubahn: { cancelled: 1 }, // missing delayed
        tram: {}, // missing both
        sbahn: { delayed: 2, cancelled: 0 },
      };

      updateTransitBoxes(aggregatedData);

      // Should display '0' for missing fields
      expect(document.getElementById('bus-delayed-count').textContent).toBe('5');
      expect(document.getElementById('bus-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('1');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('0');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('0');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Missing DOM elements
  // ---------------------------------------------------------------------------

  describe('missing DOM elements', () => {
    it('does not throw error when delayed element is missing', () => {
      const window = new Window();
      const document = window.document;
      document.body.innerHTML = `
        <span id="bus-cancelled-count"></span>
      `;
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5, cancelled: 2 },
      };

      expect(() => {
        updateTransitBoxes(aggregatedData);
      }).not.toThrow();

      // Cancelled element should still be updated
      expect(document.getElementById('bus-cancelled-count').textContent).toBe('2');

      delete global.document;
    });

    it('does not throw error when cancelled element is missing', () => {
      const window = new Window();
      const document = window.document;
      document.body.innerHTML = `
        <span id="bus-delayed-count"></span>
      `;
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5, cancelled: 2 },
      };

      expect(() => {
        updateTransitBoxes(aggregatedData);
      }).not.toThrow();

      // Delayed element should still be updated
      expect(document.getElementById('bus-delayed-count').textContent).toBe('5');

      delete global.document;
    });

    it('does not throw error when all elements are missing', () => {
      const window = new Window();
      const document = window.document;
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 5, cancelled: 2 },
        ubahn: { delayed: 3, cancelled: 1 },
        tram: { delayed: 7, cancelled: 4 },
        sbahn: { delayed: 2, cancelled: 0 },
      };

      expect(() => {
        updateTransitBoxes(aggregatedData);
      }).not.toThrow();

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Data update scenarios
  // ---------------------------------------------------------------------------

  describe('data update scenarios', () => {
    it('updates counts when called multiple times with different data', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      // First update
      const data1 = {
        bus: { delayed: 5, cancelled: 2 },
        ubahn: { delayed: 3, cancelled: 1 },
        tram: { delayed: 7, cancelled: 4 },
        sbahn: { delayed: 2, cancelled: 0 },
      };

      updateTransitBoxes(data1);

      expect(document.getElementById('bus-delayed-count').textContent).toBe('5');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('1');

      // Second update with different data
      const data2 = {
        bus: { delayed: 10, cancelled: 5 },
        ubahn: { delayed: 8, cancelled: 3 },
        tram: { delayed: 12, cancelled: 6 },
        sbahn: { delayed: 4, cancelled: 2 },
      };

      updateTransitBoxes(data2);

      expect(document.getElementById('bus-delayed-count').textContent).toBe('10');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('3');

      delete global.document;
    });

    it('handles transition from non-zero to zero counts', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      // Initial data with disruptions
      const data1 = {
        bus: { delayed: 5, cancelled: 2 },
        ubahn: { delayed: 3, cancelled: 1 },
        tram: { delayed: 7, cancelled: 4 },
        sbahn: { delayed: 2, cancelled: 0 },
      };

      updateTransitBoxes(data1);

      // Update to all zeros (service is running smoothly)
      const data2 = {
        bus: { delayed: 0, cancelled: 0 },
        ubahn: { delayed: 0, cancelled: 0 },
        tram: { delayed: 0, cancelled: 0 },
        sbahn: { delayed: 0, cancelled: 0 },
      };

      updateTransitBoxes(data2);

      expect(document.getElementById('bus-delayed-count').textContent).toBe('0');
      expect(document.getElementById('bus-cancelled-count').textContent).toBe('0');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('0');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('0');

      delete global.document;
    });

    it('handles large count values', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      const aggregatedData = {
        bus: { delayed: 150, cancelled: 75 },
        ubahn: { delayed: 200, cancelled: 100 },
        tram: { delayed: 999, cancelled: 500 },
        sbahn: { delayed: 1000, cancelled: 250 },
      };

      updateTransitBoxes(aggregatedData);

      expect(document.getElementById('bus-delayed-count').textContent).toBe('150');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('200');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('999');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('1000');

      delete global.document;
    });
  });

  // ---------------------------------------------------------------------------
  // Integration with aggregateDisruptionsByType
  // ---------------------------------------------------------------------------

  describe('integration with aggregateDisruptionsByType', () => {
    it('correctly renders output from aggregateDisruptionsByType', () => {
      const document = createTransitBoxesDOM();
      global.document = document;

      // This is the expected output structure from aggregateDisruptionsByType
      const aggregatedData = {
        bus: { delayed: 3, cancelled: 1 },
        ubahn: { delayed: 2, cancelled: 2 },
        tram: { delayed: 5, cancelled: 3 },
        sbahn: { delayed: 4, cancelled: 1 },
      };

      updateTransitBoxes(aggregatedData);

      // Verify all counts match aggregated data
      expect(document.getElementById('bus-delayed-count').textContent).toBe('3');
      expect(document.getElementById('bus-cancelled-count').textContent).toBe('1');
      expect(document.getElementById('ubahn-delayed-count').textContent).toBe('2');
      expect(document.getElementById('ubahn-cancelled-count').textContent).toBe('2');
      expect(document.getElementById('tram-delayed-count').textContent).toBe('5');
      expect(document.getElementById('tram-cancelled-count').textContent).toBe('3');
      expect(document.getElementById('sbahn-delayed-count').textContent).toBe('4');
      expect(document.getElementById('sbahn-cancelled-count').textContent).toBe('1');

      delete global.document;
    });
  });
});

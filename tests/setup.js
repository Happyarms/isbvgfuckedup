/**
 * Jest Test Setup File
 * Provides shared utilities, mocks, and test helpers for the BVG status test suite.
 */

// Import Jest globals for ES modules
import { jest } from '@jest/globals';
import { Window } from 'happy-dom';

/* ---------- Global DOM Environment ---------- */

// Provide a global DOM environment for tests that use document APIs.
// Mirrors the approach used in transit-boxes-ui.test.js.
const happyWindow = new Window();
globalThis.document = happyWindow.document;
globalThis.window = happyWindow;

/* ---------- Global Test Configuration ---------- */

// Increase timeout for tests that make network requests (if needed)
jest.setTimeout(10000);

/* ---------- DOM Setup Utilities ---------- */

/**
 * Create a mock DOM element with specified attributes.
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Key-value pairs of attributes
 * @returns {HTMLElement} Mock DOM element
 */
export function createMockElement(tag, attributes = {}) {
  const element = document.createElement(tag);
  Object.keys(attributes).forEach((key) => {
    if (key === 'textContent') {
      element.textContent = attributes[key];
    } else if (key === 'innerHTML') {
      element.innerHTML = attributes[key];
    } else {
      element.setAttribute(key, attributes[key]);
    }
  });
  return element;
}

/**
 * Create a mock DOM structure for status display testing.
 * @returns {Object} Object containing references to all mock DOM elements
 */
export function createMockDOM() {
  const mockDOM = {
    loading: createMockElement('div', { id: 'loading', hidden: true }),
    statusAnswer: createMockElement('div', { id: 'status-answer' }),
    statusText: createMockElement('h1', { id: 'status-text' }),
    statusDescription: createMockElement('p', { id: 'status-description' }),
    errorMessage: createMockElement('div', { id: 'error-message', hidden: true }),
    errorText: createMockElement('p', { id: 'error-text' }),
    metrics: createMockElement('div', { id: 'metrics' }),
    delayPct: createMockElement('span', { id: 'delay-pct' }),
    cancelPct: createMockElement('span', { id: 'cancel-pct' }),
    timestampSection: createMockElement('div', { id: 'timestamp-section' }),
    lastUpdated: createMockElement('span', { id: 'last-updated' }),
    refreshIndicator: createMockElement('div', { id: 'refresh-indicator' }),
    disruptions: createMockElement('div', { id: 'disruptions', hidden: true }),
    busAccordionTrigger: createMockElement('button', { id: 'bus-accordion-trigger' }),
    busAccordionPanel: createMockElement('div', { id: 'bus-accordion-panel' }),
    busDisruptionList: createMockElement('div', { id: 'bus-disruption-list' }),
    trainAccordionTrigger: createMockElement('button', { id: 'train-accordion-trigger' }),
    trainAccordionPanel: createMockElement('div', { id: 'train-accordion-panel' }),
    trainDisruptionList: createMockElement('div', { id: 'train-disruption-list' })
  };

  return mockDOM;
}

/* ---------- Mock Data Factories ---------- */

/**
 * Create a mock departure object for testing.
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock departure object
 */
export function createMockDeparture(overrides = {}) {
  const defaults = {
    tripId: 'mock-trip-123',
    direction: 'S+U Alexanderplatz',
    line: {
      type: 'bus',
      id: 'm41',
      name: 'M41',
      mode: 'bus',
      product: 'bus'
    },
    when: new Date().toISOString(),
    plannedWhen: new Date().toISOString(),
    delay: null,
    cancelled: false,
    platform: '1',
    stop: {
      type: 'stop',
      id: '900003201',
      name: 'Berlin Hauptbahnhof'
    }
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock line object for testing.
 * @param {string} product - Product type (bus, tram, subway, suburban, etc.)
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock line object
 */
export function createMockLine(product = 'bus', overrides = {}) {
  const defaults = {
    type: 'line',
    id: 'mock-line-1',
    name: 'Test Line',
    mode: product,
    product: product
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock cancelled departure.
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock cancelled departure
 */
export function createCancelledDeparture(overrides = {}) {
  return createMockDeparture({
    cancelled: true,
    delay: null,
    ...overrides
  });
}

/**
 * Create a mock delayed departure.
 * @param {number} delaySeconds - Delay in seconds
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock delayed departure
 */
export function createDelayedDeparture(delaySeconds, overrides = {}) {
  return createMockDeparture({
    delay: delaySeconds,
    cancelled: false,
    ...overrides
  });
}

/**
 * Generate an array of mock departures for testing.
 * @param {number} total - Total number of departures
 * @param {number} delayed - Number of delayed departures
 * @param {number} cancelled - Number of cancelled departures
 * @returns {Array} Array of mock departure objects
 */
export function generateMockDepartures(total, delayed = 0, cancelled = 0) {
  const departures = [];

  // Add cancelled departures
  for (let i = 0; i < cancelled; i++) {
    departures.push(createCancelledDeparture({
      tripId: `trip-cancelled-${i}`,
      line: createMockLine('bus', { name: `C${i}` })
    }));
  }

  // Add delayed departures (>300 seconds threshold)
  for (let i = 0; i < delayed; i++) {
    departures.push(createDelayedDeparture(360 + i * 60, {
      tripId: `trip-delayed-${i}`,
      line: createMockLine('tram', { name: `D${i}` })
    }));
  }

  // Add on-time departures
  const onTime = total - delayed - cancelled;
  for (let i = 0; i < onTime; i++) {
    departures.push(createMockDeparture({
      tripId: `trip-ontime-${i}`,
      line: createMockLine('subway', { name: `U${i}`, product: 'subway' }),
      delay: 0
    }));
  }

  return departures;
}

/* ---------- Test Assertion Helpers ---------- */

/**
 * Assert that a percentage is approximately equal (within 1%).
 * @param {number} actual - Actual percentage value
 * @param {number} expected - Expected percentage value
 * @param {number} tolerance - Tolerance in percentage points (default 1)
 */
export function expectPercentageClose(actual, expected, tolerance = 1) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

/* ---------- Fetch Mock Utilities ---------- */

/**
 * Create a mock fetch response.
 * @param {*} data - Data to return in the response
 * @param {boolean} ok - Whether the response is successful
 * @param {number} status - HTTP status code
 * @returns {Promise<Response>} Mock fetch response
 */
export function createMockFetchResponse(data, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  });
}

/**
 * Set up a mock fetch that returns departures data.
 * @param {Array} departures - Array of departure objects to return
 */
export function mockFetchDepartures(departures) {
  global.fetch = jest.fn(() =>
    createMockFetchResponse({ departures })
  );
}

/**
 * Set up a mock fetch that fails with an error.
 * @param {string} errorMessage - Error message
 */
export function mockFetchError(errorMessage = 'Network error') {
  global.fetch = jest.fn(() =>
    Promise.reject(new Error(errorMessage))
  );
}

/**
 * Set up a mock fetch that returns a specific HTTP error status.
 * @param {number} status - HTTP status code
 */
export function mockFetchHTTPError(status = 500) {
  global.fetch = jest.fn(() =>
    createMockFetchResponse(null, false, status)
  );
}

/* ---------- Clean up utilities ---------- */

/**
 * Reset all mocks between tests.
 */
export function resetAllMocks() {
  jest.clearAllMocks();
  jest.restoreAllMocks();
}

/**
 * Clean up DOM after tests.
 */
export function cleanupDOM() {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
}

// Reset mocks after each test (global setup)
afterEach(() => {
  resetAllMocks();
});

// Clean up DOM after each test
afterEach(() => {
  cleanupDOM();
});

/* ---------- Export global test utilities ---------- */

export default {
  createMockElement,
  createMockDOM,
  createMockDeparture,
  createMockLine,
  createCancelledDeparture,
  createDelayedDeparture,
  generateMockDepartures,
  expectPercentageClose,
  createMockFetchResponse,
  mockFetchDepartures,
  mockFetchError,
  mockFetchHTTPError,
  resetAllMocks,
  cleanupDOM
};

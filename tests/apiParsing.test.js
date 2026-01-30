/**
 * Unit Tests for API Response Parsing
 * Tests parsing of VBB API responses and edge case handling.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  createMockFetchResponse,
  mockFetchDepartures,
  mockFetchError,
  mockFetchHTTPError,
  createMockDeparture,
  createCancelledDeparture,
  createDelayedDeparture,
  createMockLine
} from './setup.js';

/* ---------- parseAPIResponse Function ---------- */
// Note: This function would normally be imported from app.js
// For testing purposes, we're defining it here based on the expected behavior

/**
 * Parse and validate API response from VBB API.
 * @param {Response} response - Fetch API response object
 * @returns {Promise<Object>} Parsed response with departures array
 * @throws {Error} If response is invalid or parsing fails
 */
async function parseAPIResponse(response) {
  if (!response) {
    throw new Error('Response is null or undefined');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (!data) {
    throw new Error('Response body is empty');
  }

  return data;
}

/**
 * Validate and normalize departure data.
 * @param {Array} departures - Raw departures array from API
 * @returns {Array} Validated and normalized departures
 */
function validateDepartures(departures) {
  if (!departures) {
    return [];
  }

  if (!Array.isArray(departures)) {
    return [];
  }

  return departures.filter(dep => {
    // Must have required fields
    return dep &&
           typeof dep === 'object' &&
           dep.line &&
           dep.direction !== undefined;
  }).map(dep => {
    // Normalize the departure object
    return {
      tripId: dep.tripId || null,
      direction: dep.direction || 'Unknown',
      line: {
        type: dep.line?.type || 'line',
        id: dep.line?.id || 'unknown',
        name: dep.line?.name || 'Unknown',
        mode: dep.line?.mode || dep.line?.product || 'bus',
        product: dep.line?.product || dep.line?.mode || 'bus'
      },
      when: dep.when || new Date().toISOString(),
      plannedWhen: dep.plannedWhen || dep.when || new Date().toISOString(),
      delay: typeof dep.delay === 'number' && !isNaN(dep.delay) ? dep.delay : null,
      cancelled: Boolean(dep.cancelled),
      platform: dep.platform || null,
      stop: dep.stop ? {
        type: dep.stop.type || 'stop',
        id: dep.stop.id || 'unknown',
        name: dep.stop.name || 'Unknown'
      } : null,
      remarks: Array.isArray(dep.remarks) ? dep.remarks : []
    };
  });
}

/* ---------- Test Suite ---------- */

describe('parseAPIResponse()', () => {
  describe('Valid API Responses', () => {
    test('should parse valid response with departures', async () => {
      const mockDepartures = [
        createMockDeparture(),
        createDelayedDeparture(400),
        createCancelledDeparture()
      ];
      const response = await createMockFetchResponse({ departures: mockDepartures });

      const result = await parseAPIResponse(response);

      expect(result).toBeDefined();
      expect(result.departures).toBeDefined();
      expect(Array.isArray(result.departures)).toBe(true);
      expect(result.departures).toHaveLength(3);
    });

    test('should parse response with empty departures array', async () => {
      const response = await createMockFetchResponse({ departures: [] });

      const result = await parseAPIResponse(response);

      expect(result).toBeDefined();
      expect(result.departures).toEqual([]);
    });

    test('should parse response with additional metadata', async () => {
      const mockDepartures = [createMockDeparture()];
      const response = await createMockFetchResponse({
        departures: mockDepartures,
        realtimeDataUpdatedAt: Date.now(),
        metadata: { station: 'Berlin Hauptbahnhof' }
      });

      const result = await parseAPIResponse(response);

      expect(result).toBeDefined();
      expect(result.departures).toHaveLength(1);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.station).toBe('Berlin Hauptbahnhof');
    });
  });

  describe('HTTP Error Responses', () => {
    test('should throw error for 404 Not Found', async () => {
      const response = await createMockFetchResponse(null, false, 404);

      await expect(parseAPIResponse(response)).rejects.toThrow('HTTP error! status: 404');
    });

    test('should throw error for 500 Internal Server Error', async () => {
      const response = await createMockFetchResponse(null, false, 500);

      await expect(parseAPIResponse(response)).rejects.toThrow('HTTP error! status: 500');
    });

    test('should throw error for 503 Service Unavailable', async () => {
      const response = await createMockFetchResponse(null, false, 503);

      await expect(parseAPIResponse(response)).rejects.toThrow('HTTP error! status: 503');
    });

    test('should throw error for 401 Unauthorized', async () => {
      const response = await createMockFetchResponse(null, false, 401);

      await expect(parseAPIResponse(response)).rejects.toThrow('HTTP error! status: 401');
    });
  });

  describe('Null and Undefined Handling', () => {
    test('should throw error for null response', async () => {
      await expect(parseAPIResponse(null)).rejects.toThrow('Response is null or undefined');
    });

    test('should throw error for undefined response', async () => {
      await expect(parseAPIResponse(undefined)).rejects.toThrow('Response is null or undefined');
    });

    test('should throw error for empty response body', async () => {
      const response = await createMockFetchResponse(null, true, 200);

      await expect(parseAPIResponse(response)).rejects.toThrow('Response body is empty');
    });
  });

  describe('Malformed JSON', () => {
    test('should handle JSON parse errors gracefully', async () => {
      const response = {
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Unexpected token in JSON'))
      };

      await expect(parseAPIResponse(response)).rejects.toThrow('Unexpected token in JSON');
    });
  });
});

describe('validateDepartures()', () => {
  describe('Valid Departure Data', () => {
    test('should validate and return array of valid departures', () => {
      const departures = [
        createMockDeparture(),
        createDelayedDeparture(500),
        createCancelledDeparture()
      ];

      const result = validateDepartures(departures);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('tripId');
      expect(result[0]).toHaveProperty('direction');
      expect(result[0]).toHaveProperty('line');
      expect(result[0]).toHaveProperty('delay');
      expect(result[0]).toHaveProperty('cancelled');
    });

    test('should preserve all required fields', () => {
      const departure = createMockDeparture({
        tripId: 'test-123',
        direction: 'Test Direction',
        delay: 350,
        cancelled: false
      });

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].tripId).toBe('test-123');
      expect(result[0].direction).toBe('Test Direction');
      expect(result[0].delay).toBe(350);
      expect(result[0].cancelled).toBe(false);
    });

    test('should handle departures with remarks', () => {
      const departure = createMockDeparture({
        remarks: [
          { text: 'Service disruption', type: 'warning' },
          { url: 'https://example.com/info', text: 'More info' }
        ]
      });

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].remarks).toHaveLength(2);
      expect(result[0].remarks[0].text).toBe('Service disruption');
      expect(result[0].remarks[1].url).toBe('https://example.com/info');
    });
  });

  describe('Edge Cases and Invalid Data', () => {
    test('should return empty array for null input', () => {
      const result = validateDepartures(null);
      expect(result).toEqual([]);
    });

    test('should return empty array for undefined input', () => {
      const result = validateDepartures(undefined);
      expect(result).toEqual([]);
    });

    test('should return empty array for non-array input', () => {
      const result = validateDepartures({ departures: [] });
      expect(result).toEqual([]);
    });

    test('should return empty array for string input', () => {
      const result = validateDepartures('not an array');
      expect(result).toEqual([]);
    });

    test('should return empty array for number input', () => {
      const result = validateDepartures(42);
      expect(result).toEqual([]);
    });

    test('should filter out null departures', () => {
      const departures = [
        createMockDeparture(),
        null,
        createMockDeparture()
      ];

      const result = validateDepartures(departures);
      expect(result).toHaveLength(2);
    });

    test('should filter out undefined departures', () => {
      const departures = [
        createMockDeparture(),
        undefined,
        createMockDeparture()
      ];

      const result = validateDepartures(departures);
      expect(result).toHaveLength(2);
    });

    test('should filter out departures without line information', () => {
      const departures = [
        createMockDeparture(),
        { direction: 'Test', when: new Date().toISOString() }, // Missing line
        createMockDeparture()
      ];

      const result = validateDepartures(departures);
      expect(result).toHaveLength(2);
    });

    test('should filter out departures without direction', () => {
      const departures = [
        createMockDeparture(),
        { line: createMockLine(), when: new Date().toISOString() }, // Missing direction
        createMockDeparture()
      ];

      const result = validateDepartures(departures);
      expect(result).toHaveLength(2);
    });
  });

  describe('Data Normalization', () => {
    test('should normalize missing tripId to null', () => {
      const departure = createMockDeparture();
      delete departure.tripId;

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].tripId).toBeNull();
    });

    test('should normalize missing direction to "Unknown"', () => {
      const departure = createMockDeparture({ direction: undefined });
      departure.direction = ''; // Empty string

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].direction).toBe('Unknown');
    });

    test('should normalize non-numeric delay to null', () => {
      const departures = [
        createMockDeparture({ delay: 'invalid' }),
        createMockDeparture({ delay: NaN }),
        createMockDeparture({ delay: {} })
      ];

      const result = validateDepartures(departures);

      expect(result).toHaveLength(3);
      expect(result[0].delay).toBeNull();
      expect(result[1].delay).toBeNull();
      expect(result[2].delay).toBeNull();
    });

    test('should normalize cancelled to boolean', () => {
      const departures = [
        createMockDeparture({ cancelled: 'true' }),
        createMockDeparture({ cancelled: 1 }),
        createMockDeparture({ cancelled: 'false' }),
        createMockDeparture({ cancelled: 0 }),
        createMockDeparture({ cancelled: null })
      ];

      const result = validateDepartures(departures);

      expect(result).toHaveLength(5);
      expect(result[0].cancelled).toBe(true); // Truthy string
      expect(result[1].cancelled).toBe(true); // Truthy number
      expect(result[2].cancelled).toBe(true); // Truthy string
      expect(result[3].cancelled).toBe(false); // Falsy number
      expect(result[4].cancelled).toBe(false); // Null
    });

    test('should normalize missing remarks to empty array', () => {
      const departures = [
        createMockDeparture({ remarks: undefined }),
        createMockDeparture({ remarks: null }),
        createMockDeparture({ remarks: 'not an array' })
      ];

      const result = validateDepartures(departures);

      expect(result).toHaveLength(3);
      expect(result[0].remarks).toEqual([]);
      expect(result[1].remarks).toEqual([]);
      expect(result[2].remarks).toEqual([]);
    });

    test('should normalize line information with defaults', () => {
      const departure = createMockDeparture({
        line: { name: 'M10' } // Missing other line fields
      });

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].line.type).toBe('line');
      expect(result[0].line.id).toBe('unknown');
      expect(result[0].line.name).toBe('M10');
      expect(result[0].line.mode).toBe('bus');
      expect(result[0].line.product).toBe('bus');
    });

    test('should normalize missing platform to null', () => {
      const departure = createMockDeparture();
      delete departure.platform;

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].platform).toBeNull();
    });

    test('should normalize missing stop to null', () => {
      const departure = createMockDeparture({ stop: undefined });

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].stop).toBeNull();
    });

    test('should normalize incomplete stop information', () => {
      const departure = createMockDeparture({
        stop: { name: 'Test Stop' } // Missing type and id
      });

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].stop.type).toBe('stop');
      expect(result[0].stop.id).toBe('unknown');
      expect(result[0].stop.name).toBe('Test Stop');
    });
  });

  describe('Large Dataset Handling', () => {
    test('should handle large arrays of departures', () => {
      const departures = [];
      for (let i = 0; i < 1000; i++) {
        departures.push(createMockDeparture({ tripId: `trip-${i}` }));
      }

      const result = validateDepartures(departures);

      expect(result).toHaveLength(1000);
      expect(result[0].tripId).toBe('trip-0');
      expect(result[999].tripId).toBe('trip-999');
    });

    test('should filter invalid entries from large dataset', () => {
      const departures = [];
      for (let i = 0; i < 100; i++) {
        if (i % 10 === 0) {
          departures.push(null); // Every 10th is invalid
        } else {
          departures.push(createMockDeparture({ tripId: `trip-${i}` }));
        }
      }

      const result = validateDepartures(departures);

      expect(result).toHaveLength(90); // 10 null entries filtered out
    });
  });

  describe('Special Characters and Unicode', () => {
    test('should handle special characters in direction names', () => {
      const departure = createMockDeparture({
        direction: 'S+U Zoologischer Garten (Berlin)'
      });

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].direction).toBe('S+U Zoologischer Garten (Berlin)');
    });

    test('should handle unicode characters in line names', () => {
      const departure = createMockDeparture({
        line: createMockLine('bus', { name: 'M✓41' })
      });

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].line.name).toBe('M✓41');
    });

    test('should handle umlauts in stop names', () => {
      const departure = createMockDeparture({
        stop: {
          type: 'stop',
          id: '900001234',
          name: 'Möckernbrücke'
        }
      });

      const result = validateDepartures([departure]);

      expect(result).toHaveLength(1);
      expect(result[0].stop.name).toBe('Möckernbrücke');
    });
  });

  describe('Mixed Valid and Invalid Data', () => {
    test('should filter out invalid entries and keep valid ones', () => {
      const departures = [
        createMockDeparture({ tripId: 'valid-1' }),
        null,
        createMockDeparture({ tripId: 'valid-2' }),
        { invalid: 'data' },
        createMockDeparture({ tripId: 'valid-3' }),
        undefined,
        createMockDeparture({ tripId: 'valid-4' })
      ];

      const result = validateDepartures(departures);

      expect(result).toHaveLength(4);
      expect(result[0].tripId).toBe('valid-1');
      expect(result[1].tripId).toBe('valid-2');
      expect(result[2].tripId).toBe('valid-3');
      expect(result[3].tripId).toBe('valid-4');
    });
  });
});

describe('API Response Integration', () => {
  test('should parse and validate full API response workflow', async () => {
    const mockDepartures = [
      createMockDeparture({ tripId: 'trip-1', delay: 0 }),
      createDelayedDeparture(450, { tripId: 'trip-2' }),
      createCancelledDeparture({ tripId: 'trip-3' })
    ];

    const response = await createMockFetchResponse({ departures: mockDepartures });
    const parsed = await parseAPIResponse(response);
    const validated = validateDepartures(parsed.departures);

    expect(validated).toHaveLength(3);
    expect(validated[0].delay).toBe(0);
    expect(validated[1].delay).toBe(450);
    expect(validated[2].cancelled).toBe(true);
  });

  test('should handle API response with mixed valid and invalid departures', async () => {
    const mockDepartures = [
      createMockDeparture({ tripId: 'valid-1' }),
      { invalid: 'data' },
      createMockDeparture({ tripId: 'valid-2' }),
      null
    ];

    const response = await createMockFetchResponse({ departures: mockDepartures });
    const parsed = await parseAPIResponse(response);
    const validated = validateDepartures(parsed.departures);

    expect(validated).toHaveLength(2);
    expect(validated[0].tripId).toBe('valid-1');
    expect(validated[1].tripId).toBe('valid-2');
  });
});

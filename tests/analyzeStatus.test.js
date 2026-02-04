/**
 * Unit Tests for analyzeStatus() Function
 * Tests status calculation logic and disruption classification.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  createMockDeparture,
  createCancelledDeparture,
  createDelayedDeparture,
  generateMockDepartures,
  createMockLine
} from './setup.js';

/* ---------- Configuration Constants ---------- */

const CONFIG = {
  THRESHOLD_DEGRADED: 0.3,
  THRESHOLD_FUCKED: 0.6,
  DELAY_THRESHOLD_SECONDS: 300
};

/* ---------- analyzeStatus Function (from app.js) ---------- */
// Note: This function is extracted from app.js for testing purposes.
// In production, this would be imported from a shared module.

/**
 * Analyze departure data and determine BVG status.
 * @param {Array} departures - Array of departure objects from VBB API
 * @returns {Object} Status result with metrics and disruption details
 */
function analyzeStatus(departures) {
  if (!departures || departures.length === 0) {
    return {
      status: 'unknown',
      delayPct: 0,
      cancelPct: 0,
      total: 0,
      delayedCount: 0,
      cancelledCount: 0,
      cancelled: [],
      delayed: []
    };
  }

  const total = departures.length;
  let cancelledCount = 0;
  let delayedCount = 0;
  const cancelled = [];
  const delayed = [];

  departures.forEach(function (dep) {
    // Extract source URL from remarks if available
    let sourceUrl = null;
    if (dep.remarks && Array.isArray(dep.remarks)) {
      for (let i = 0; i < dep.remarks.length; i++) {
        if (dep.remarks[i].url) {
          sourceUrl = dep.remarks[i].url;
          break;
        }
      }
    }

    if (dep.cancelled) {
      cancelledCount++;
      cancelled.push({
        line: dep.line,
        direction: dep.direction,
        when: dep.when,
        stop: dep.stop,
        sourceUrl: sourceUrl
      });
      return;
    }

    // delay is in seconds; null/undefined/0 means on-time
    const delay = dep.delay;
    if (delay && delay > CONFIG.DELAY_THRESHOLD_SECONDS) {
      delayedCount++;
      delayed.push({
        line: dep.line,
        direction: dep.direction,
        when: dep.when,
        delay: delay,
        stop: dep.stop,
        sourceUrl: sourceUrl
      });
    }
  });

  const delayPct = delayedCount / total;
  const cancelPct = cancelledCount / total;
  const disruptionPct = (delayedCount + cancelledCount) / total;

  let status = 'normal';
  if (disruptionPct >= CONFIG.THRESHOLD_FUCKED) {
    status = 'fucked';
  } else if (disruptionPct >= CONFIG.THRESHOLD_DEGRADED) {
    status = 'degraded';
  }

  return {
    status: status,
    delayPct: delayPct,
    cancelPct: cancelPct,
    total: total,
    delayedCount: delayedCount,
    cancelledCount: cancelledCount,
    cancelled: cancelled,
    delayed: delayed
  };
}

/* ---------- Test Suite ---------- */

describe('analyzeStatus()', () => {
  describe('Normal Status (< 30% disruption)', () => {
    test('should return normal status with no disruptions', () => {
      const departures = generateMockDepartures(100, 0, 0);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('normal');
      expect(result.delayPct).toBe(0);
      expect(result.cancelPct).toBe(0);
      expect(result.total).toBe(100);
      expect(result.delayedCount).toBe(0);
      expect(result.cancelledCount).toBe(0);
    });

    test('should return normal status with < 30% disruptions', () => {
      // 29% disruption (20 delayed + 9 cancelled out of 100)
      const departures = generateMockDepartures(100, 20, 9);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('normal');
      expect(result.total).toBe(100);
      expect(result.delayedCount).toBe(20);
      expect(result.cancelledCount).toBe(9);
      expect(result.delayPct).toBe(0.20);
      expect(result.cancelPct).toBe(0.09);
    });

    test('should return normal status with small delays below threshold', () => {
      // Small delays (< 300 seconds) should not count as disruptions
      const departures = [
        createDelayedDeparture(100), // 100s delay - below threshold
        createDelayedDeparture(200), // 200s delay - below threshold
        createDelayedDeparture(299), // 299s delay - below threshold
        createMockDeparture({ delay: 0 }),
        createMockDeparture({ delay: null })
      ];
      const result = analyzeStatus(departures);

      expect(result.status).toBe('normal');
      expect(result.delayedCount).toBe(0);
      expect(result.delayed).toHaveLength(0);
    });
  });

  describe('Degraded Status (30-60% disruption)', () => {
    test('should return degraded status with 30-60% disruptions', () => {
      // 45% disruption (30 delayed + 15 cancelled out of 100)
      const departures = generateMockDepartures(100, 30, 15);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('degraded');
      expect(result.total).toBe(100);
      expect(result.delayedCount).toBe(30);
      expect(result.cancelledCount).toBe(15);
      expect(result.delayPct).toBe(0.30);
      expect(result.cancelPct).toBe(0.15);
    });

    test('should return degraded status at exactly 30% disruption (lower boundary)', () => {
      // Exactly 30% disruption (30 out of 100)
      const departures = generateMockDepartures(100, 20, 10);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('degraded');
      expect(result.delayedCount + result.cancelledCount).toBe(30);
      expect((result.delayedCount + result.cancelledCount) / result.total).toBe(0.30);
    });

    test('should return degraded status just below 60% disruption', () => {
      // 59% disruption
      const departures = generateMockDepartures(100, 40, 19);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('degraded');
      expect(result.delayedCount + result.cancelledCount).toBe(59);
    });
  });

  describe('Fucked Status (>= 60% disruption)', () => {
    test('should return fucked status with >= 60% disruptions', () => {
      // 70% disruption (50 delayed + 20 cancelled out of 100)
      const departures = generateMockDepartures(100, 50, 20);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('fucked');
      expect(result.total).toBe(100);
      expect(result.delayedCount).toBe(50);
      expect(result.cancelledCount).toBe(20);
      expect(result.delayPct).toBe(0.50);
      expect(result.cancelPct).toBe(0.20);
    });

    test('should return fucked status at exactly 60% disruption (upper boundary)', () => {
      // Exactly 60% disruption (60 out of 100)
      const departures = generateMockDepartures(100, 40, 20);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('fucked');
      expect(result.delayedCount + result.cancelledCount).toBe(60);
      expect((result.delayedCount + result.cancelledCount) / result.total).toBe(0.60);
    });

    test('should return fucked status with all departures cancelled', () => {
      const departures = generateMockDepartures(50, 0, 50);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('fucked');
      expect(result.cancelledCount).toBe(50);
      expect(result.delayedCount).toBe(0);
      expect(result.cancelPct).toBe(1.0);
      expect(result.delayPct).toBe(0);
    });

    test('should return fucked status with all departures delayed', () => {
      const departures = generateMockDepartures(50, 50, 0);
      const result = analyzeStatus(departures);

      expect(result.status).toBe('fucked');
      expect(result.delayedCount).toBe(50);
      expect(result.cancelledCount).toBe(0);
      expect(result.delayPct).toBe(1.0);
      expect(result.cancelPct).toBe(0);
    });
  });

  describe('Empty and Edge Cases', () => {
    test('should return unknown status with empty array', () => {
      const result = analyzeStatus([]);

      expect(result.status).toBe('unknown');
      expect(result.delayPct).toBe(0);
      expect(result.cancelPct).toBe(0);
      expect(result.total).toBe(0);
      expect(result.delayedCount).toBe(0);
      expect(result.cancelledCount).toBe(0);
      expect(result.cancelled).toEqual([]);
      expect(result.delayed).toEqual([]);
    });

    test('should return unknown status with null departures', () => {
      const result = analyzeStatus(null);

      expect(result.status).toBe('unknown');
      expect(result.total).toBe(0);
    });

    test('should return unknown status with undefined departures', () => {
      const result = analyzeStatus(undefined);

      expect(result.status).toBe('unknown');
      expect(result.total).toBe(0);
    });
  });

  describe('Delay Threshold Validation (300 seconds)', () => {
    test('should not count delays at exactly 300 seconds as disruption', () => {
      const departures = [
        createDelayedDeparture(300), // Exactly at threshold
        createMockDeparture({ delay: 0 })
      ];
      const result = analyzeStatus(departures);

      // delay > 300, so exactly 300 should NOT count
      expect(result.delayedCount).toBe(0);
      expect(result.status).toBe('normal');
    });

    test('should count delays at 301 seconds as disruption', () => {
      const departures = [
        createDelayedDeparture(301), // Just above threshold
        createMockDeparture({ delay: 0 })
      ];
      const result = analyzeStatus(departures);

      expect(result.delayedCount).toBe(1);
      expect(result.delayed).toHaveLength(1);
      expect(result.delayed[0].delay).toBe(301);
    });

    test('should count delays significantly above threshold', () => {
      const departures = [
        createDelayedDeparture(600),  // 10 minutes
        createDelayedDeparture(900),  // 15 minutes
        createDelayedDeparture(1800), // 30 minutes
        createMockDeparture({ delay: 0 })
      ];
      const result = analyzeStatus(departures);

      expect(result.delayedCount).toBe(3);
      expect(result.delayed).toHaveLength(3);
    });

    test('should ignore null delays', () => {
      const departures = [
        createMockDeparture({ delay: null }),
        createMockDeparture({ delay: null }),
        createMockDeparture({ delay: 0 })
      ];
      const result = analyzeStatus(departures);

      expect(result.delayedCount).toBe(0);
      expect(result.status).toBe('normal');
    });

    test('should ignore undefined delays', () => {
      const departures = [
        createMockDeparture({ delay: undefined }),
        createMockDeparture({ delay: undefined }),
        createMockDeparture({ delay: 0 })
      ];
      const result = analyzeStatus(departures);

      expect(result.delayedCount).toBe(0);
      expect(result.status).toBe('normal');
    });

    test('should ignore zero delays', () => {
      const departures = [
        createMockDeparture({ delay: 0 }),
        createMockDeparture({ delay: 0 })
      ];
      const result = analyzeStatus(departures);

      expect(result.delayedCount).toBe(0);
      expect(result.status).toBe('normal');
    });
  });

  describe('Mixed Cancelled and Delayed', () => {
    test('should correctly handle mix of cancelled and delayed departures', () => {
      const departures = [
        createCancelledDeparture(),
        createDelayedDeparture(600),
        createCancelledDeparture(),
        createDelayedDeparture(500),
        createMockDeparture({ delay: 0 }),
        createMockDeparture({ delay: 0 })
      ];
      const result = analyzeStatus(departures);

      expect(result.total).toBe(6);
      expect(result.cancelledCount).toBe(2);
      expect(result.delayedCount).toBe(2);
      expect(result.cancelled).toHaveLength(2);
      expect(result.delayed).toHaveLength(2);
    });

    test('should prioritize cancelled status over delay', () => {
      // A departure that is both cancelled and has a delay value
      // should only be counted as cancelled
      const departures = [
        createMockDeparture({ cancelled: true, delay: 600 }),
        createMockDeparture({ delay: 0 })
      ];
      const result = analyzeStatus(departures);

      expect(result.cancelledCount).toBe(1);
      expect(result.delayedCount).toBe(0);
      expect(result.cancelled).toHaveLength(1);
      expect(result.delayed).toHaveLength(0);
    });
  });

  describe('Disruption Details', () => {
    test('should include line information in cancelled disruptions', () => {
      const mockLine = createMockLine('bus', { name: 'M41', id: 'm41' });
      const departures = [
        createCancelledDeparture({
          line: mockLine,
          direction: 'S+U Zoologischer Garten'
        })
      ];
      const result = analyzeStatus(departures);

      expect(result.cancelled).toHaveLength(1);
      expect(result.cancelled[0].line).toEqual(mockLine);
      expect(result.cancelled[0].direction).toBe('S+U Zoologischer Garten');
    });

    test('should include delay information in delayed disruptions', () => {
      const mockLine = createMockLine('tram', { name: 'M10' });
      const departures = [
        createDelayedDeparture(720, {
          line: mockLine,
          direction: 'Hauptbahnhof'
        })
      ];
      const result = analyzeStatus(departures);

      expect(result.delayed).toHaveLength(1);
      expect(result.delayed[0].line).toEqual(mockLine);
      expect(result.delayed[0].direction).toBe('Hauptbahnhof');
      expect(result.delayed[0].delay).toBe(720);
    });

    test('should extract sourceUrl from remarks', () => {
      const departures = [
        createCancelledDeparture({
          remarks: [
            { text: 'Service disruption' },
            { url: 'https://example.com/disruption', text: 'More info' }
          ]
        })
      ];
      const result = analyzeStatus(departures);

      expect(result.cancelled).toHaveLength(1);
      expect(result.cancelled[0].sourceUrl).toBe('https://example.com/disruption');
    });

    test('should handle missing remarks array', () => {
      const departures = [
        createCancelledDeparture({ remarks: undefined })
      ];
      const result = analyzeStatus(departures);

      expect(result.cancelled).toHaveLength(1);
      expect(result.cancelled[0].sourceUrl).toBeNull();
    });

    test('should handle remarks without url', () => {
      const departures = [
        createCancelledDeparture({
          remarks: [
            { text: 'Service disruption', type: 'warning' }
          ]
        })
      ];
      const result = analyzeStatus(departures);

      expect(result.cancelled).toHaveLength(1);
      expect(result.cancelled[0].sourceUrl).toBeNull();
    });
  });

  describe('Percentage Calculations', () => {
    test('should calculate correct percentages', () => {
      const departures = generateMockDepartures(100, 25, 15);
      const result = analyzeStatus(departures);

      expect(result.delayPct).toBe(0.25);
      expect(result.cancelPct).toBe(0.15);
    });

    test('should handle fractional percentages', () => {
      // 3 out of 7 delayed, 2 out of 7 cancelled
      const departures = generateMockDepartures(7, 3, 2);
      const result = analyzeStatus(departures);

      expect(result.delayPct).toBeCloseTo(3 / 7, 5);
      expect(result.cancelPct).toBeCloseTo(2 / 7, 5);
    });
  });
});

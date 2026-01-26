/**
 * Unit tests for the transit-status model.
 *
 * Tests the determineStatus() function that maps an array of HAFAS departures
 * to a status state (FINE, DEGRADED, FUCKED, UNKNOWN) with metrics.
 *
 * Thresholds (from config defaults):
 *   - FINE:     <25% disrupted
 *   - DEGRADED: 25-50% disrupted
 *   - FUCKED:   >50% disrupted
 *   - UNKNOWN:  no data
 *
 * A departure is "disrupted" when cancelled OR delay > 300s (5 min).
 */

import { determineStatus } from '../../src/models/transit-status.js';
import {
  fineDepartures,
  degradedDepartures,
  fuckedDepartures,
  emptyDepartures,
  allCancelledDepartures,
  allOnTimeDepartures,
  boundaryDegradedDepartures,
  boundaryFuckedDepartures,
  nullDelayDepartures,
  singleDeparture,
  singleDelayedDeparture,
  singleCancelledDeparture,
  malformedDepartures,
} from '../fixtures/departures.js';

// ---------------------------------------------------------------------------
// FINE status: <25% disrupted
// ---------------------------------------------------------------------------

describe('determineStatus', () => {
  describe('FINE status (<25% disrupted)', () => {
    it('returns FINE for departures with low disruption ratio', () => {
      const result = determineStatus(fineDepartures);

      expect(result.state).toBe('FINE');
      expect(result.metrics.totalServices).toBe(20);
      expect(result.metrics.disruptedCount).toBe(1);
      expect(result.metrics.percentDisrupted).toBe(5);
    });

    it('returns FINE for all on-time departures (0% disrupted)', () => {
      const result = determineStatus(allOnTimeDepartures);

      expect(result.state).toBe('FINE');
      expect(result.metrics.totalServices).toBe(10);
      expect(result.metrics.delayedCount).toBe(0);
      expect(result.metrics.cancelledCount).toBe(0);
      expect(result.metrics.disruptedCount).toBe(0);
      expect(result.metrics.percentDisrupted).toBe(0);
    });

    it('returns FINE for departures with null delays (no real-time data)', () => {
      const result = determineStatus(nullDelayDepartures);

      expect(result.state).toBe('FINE');
      expect(result.metrics.totalServices).toBe(5);
      expect(result.metrics.delayedCount).toBe(0);
      expect(result.metrics.cancelledCount).toBe(0);
      expect(result.metrics.percentDisrupted).toBe(0);
    });

    it('does not count minor delays (<= 300s) as disrupted', () => {
      const result = determineStatus(fineDepartures);

      // fineDepartures has 2 minor delays (120s, 180s) which should NOT be disrupted
      // Only the 420s delay counts
      expect(result.metrics.delayedCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // DEGRADED status: 25-50% disrupted
  // ---------------------------------------------------------------------------

  describe('DEGRADED status (25-50% disrupted)', () => {
    it('returns DEGRADED for departures with moderate disruption ratio', () => {
      const result = determineStatus(degradedDepartures);

      expect(result.state).toBe('DEGRADED');
      expect(result.metrics.totalServices).toBe(20);
      expect(result.metrics.delayedCount).toBe(5);
      expect(result.metrics.cancelledCount).toBe(2);
      expect(result.metrics.disruptedCount).toBe(7);
      expect(result.metrics.percentDisrupted).toBe(35);
    });

    it('returns DEGRADED at boundary (just above 25%)', () => {
      const result = determineStatus(boundaryDegradedDepartures);

      expect(result.state).toBe('DEGRADED');
      expect(result.metrics.totalServices).toBe(20);
      expect(result.metrics.disruptedCount).toBe(6);
      expect(result.metrics.percentDisrupted).toBe(30);
    });

    it('includes correct delayed and cancelled percentages', () => {
      const result = determineStatus(degradedDepartures);

      expect(result.metrics.percentDelayed).toBe(25);
      expect(result.metrics.percentCancelled).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // FUCKED status: >50% disrupted
  // ---------------------------------------------------------------------------

  describe('FUCKED status (>50% disrupted)', () => {
    it('returns FUCKED for departures with high disruption ratio', () => {
      const result = determineStatus(fuckedDepartures);

      expect(result.state).toBe('FUCKED');
      expect(result.metrics.totalServices).toBe(20);
      expect(result.metrics.delayedCount).toBe(8);
      expect(result.metrics.cancelledCount).toBe(7);
      expect(result.metrics.disruptedCount).toBe(15);
      expect(result.metrics.percentDisrupted).toBe(75);
    });

    it('returns FUCKED at boundary (just above 50%)', () => {
      const result = determineStatus(boundaryFuckedDepartures);

      expect(result.state).toBe('FUCKED');
      expect(result.metrics.totalServices).toBe(20);
      expect(result.metrics.disruptedCount).toBe(11);
      expect(result.metrics.percentDisrupted).toBe(55);
    });

    it('returns FUCKED when all departures are cancelled (100% disrupted)', () => {
      const result = determineStatus(allCancelledDepartures);

      expect(result.state).toBe('FUCKED');
      expect(result.metrics.totalServices).toBe(10);
      expect(result.metrics.delayedCount).toBe(0);
      expect(result.metrics.cancelledCount).toBe(10);
      expect(result.metrics.disruptedCount).toBe(10);
      expect(result.metrics.percentDisrupted).toBe(100);
      expect(result.metrics.percentCancelled).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // UNKNOWN status: no data
  // ---------------------------------------------------------------------------

  describe('UNKNOWN status (no data)', () => {
    it('returns UNKNOWN for empty departures array', () => {
      const result = determineStatus(emptyDepartures);

      expect(result.state).toBe('UNKNOWN');
      expect(result.metrics.totalServices).toBe(0);
      expect(result.metrics.delayedCount).toBe(0);
      expect(result.metrics.cancelledCount).toBe(0);
      expect(result.metrics.disruptedCount).toBe(0);
      expect(result.metrics.percentDelayed).toBe(0);
      expect(result.metrics.percentCancelled).toBe(0);
      expect(result.metrics.percentDisrupted).toBe(0);
    });

    it('returns UNKNOWN for null input', () => {
      const result = determineStatus(null);

      expect(result.state).toBe('UNKNOWN');
      expect(result.metrics.totalServices).toBe(0);
    });

    it('returns UNKNOWN for undefined input', () => {
      const result = determineStatus(undefined);

      expect(result.state).toBe('UNKNOWN');
      expect(result.metrics.totalServices).toBe(0);
    });

    it('returns UNKNOWN for non-array input', () => {
      const result = determineStatus('not-an-array');

      expect(result.state).toBe('UNKNOWN');
      expect(result.metrics.totalServices).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles a single on-time departure as FINE', () => {
      const result = determineStatus(singleDeparture);

      expect(result.state).toBe('FINE');
      expect(result.metrics.totalServices).toBe(1);
      expect(result.metrics.disruptedCount).toBe(0);
      expect(result.metrics.percentDisrupted).toBe(0);
    });

    it('handles a single delayed departure as FUCKED', () => {
      const result = determineStatus(singleDelayedDeparture);

      expect(result.state).toBe('FUCKED');
      expect(result.metrics.totalServices).toBe(1);
      expect(result.metrics.delayedCount).toBe(1);
      expect(result.metrics.disruptedCount).toBe(1);
      expect(result.metrics.percentDisrupted).toBe(100);
    });

    it('handles a single cancelled departure as FUCKED', () => {
      const result = determineStatus(singleCancelledDeparture);

      expect(result.state).toBe('FUCKED');
      expect(result.metrics.totalServices).toBe(1);
      expect(result.metrics.cancelledCount).toBe(1);
      expect(result.metrics.disruptedCount).toBe(1);
      expect(result.metrics.percentDisrupted).toBe(100);
    });

    it('handles malformed departures gracefully', () => {
      const result = determineStatus(malformedDepartures);

      // 4 departures: none cancelled, one has delay=0 (not disrupted),
      // one has delay='not-a-number' (typeof !== 'number', not counted),
      // two have no delay or cancelled fields (not disrupted)
      expect(result.state).toBe('FINE');
      expect(result.metrics.totalServices).toBe(4);
      expect(result.metrics.delayedCount).toBe(0);
      expect(result.metrics.cancelledCount).toBe(0);
    });

    it('returns correct metrics shape for all states', () => {
      const expectedMetricKeys = [
        'totalServices',
        'delayedCount',
        'cancelledCount',
        'disruptedCount',
        'percentDelayed',
        'percentCancelled',
        'percentDisrupted',
      ];

      for (const departures of [fineDepartures, degradedDepartures, fuckedDepartures, emptyDepartures]) {
        const result = determineStatus(departures);
        expect(Object.keys(result.metrics)).toEqual(expect.arrayContaining(expectedMetricKeys));
        expect(Object.keys(result.metrics)).toHaveLength(expectedMetricKeys.length);
      }
    });

    it('correctly distinguishes delayed from cancelled in metrics', () => {
      const result = determineStatus(fuckedDepartures);

      // Delayed + cancelled should equal disrupted
      expect(result.metrics.delayedCount + result.metrics.cancelledCount)
        .toBe(result.metrics.disruptedCount);

      // Percentages should be consistent
      expect(result.metrics.percentDelayed + result.metrics.percentCancelled)
        .toBe(result.metrics.percentDisrupted);
    });

    it('returns percentages as rounded integers', () => {
      const result = determineStatus(degradedDepartures);

      expect(Number.isInteger(result.metrics.percentDelayed)).toBe(true);
      expect(Number.isInteger(result.metrics.percentCancelled)).toBe(true);
      expect(Number.isInteger(result.metrics.percentDisrupted)).toBe(true);
    });
  });
});

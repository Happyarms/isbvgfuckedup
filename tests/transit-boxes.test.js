/**
 * Unit tests for transit-boxes aggregation logic.
 *
 * Tests the aggregateDisruptionsByType() function that groups departures by
 * transit type (bus, ubahn, tram, sbahn) and counts delayed/cancelled services.
 *
 * Classification rules:
 *   - delayed: !cancelled AND delay > 300s
 *   - cancelled: cancelled === true
 *
 * Product type mapping (HAFAS → display):
 *   - 'bus' → bus
 *   - 'subway' → ubahn
 *   - 'tram' → tram
 *   - 'suburban' → sbahn
 */

import { aggregateDisruptionsByType } from '../src/public/js/app.js';
import {
  fineDepartures,
  fuckedDepartures,
  degradedDepartures,
  emptyDepartures,
  allCancelledDepartures,
  allOnTimeDepartures,
  STATIONS,
  LINES,
  makeDeparture,
} from './fixtures/departures.js';

// ---------------------------------------------------------------------------
// Empty and invalid input handling
// ---------------------------------------------------------------------------

describe('aggregateDisruptionsByType', () => {
  describe('empty and invalid input handling', () => {
    it('returns zero counts for empty array', () => {
      const result = aggregateDisruptionsByType(emptyDepartures);

      expect(result).toEqual({
        bus: { delayed: 0, cancelled: 0 },
        ubahn: { delayed: 0, cancelled: 0 },
        tram: { delayed: 0, cancelled: 0 },
        sbahn: { delayed: 0, cancelled: 0 },
      });
    });

    it('returns zero counts for null input', () => {
      const result = aggregateDisruptionsByType(null);

      expect(result).toEqual({
        bus: { delayed: 0, cancelled: 0 },
        ubahn: { delayed: 0, cancelled: 0 },
        tram: { delayed: 0, cancelled: 0 },
        sbahn: { delayed: 0, cancelled: 0 },
      });
    });

    it('returns zero counts for undefined input', () => {
      const result = aggregateDisruptionsByType(undefined);

      expect(result).toEqual({
        bus: { delayed: 0, cancelled: 0 },
        ubahn: { delayed: 0, cancelled: 0 },
        tram: { delayed: 0, cancelled: 0 },
        sbahn: { delayed: 0, cancelled: 0 },
      });
    });

    it('returns zero counts for non-array input', () => {
      const result = aggregateDisruptionsByType('not-an-array');

      expect(result).toEqual({
        bus: { delayed: 0, cancelled: 0 },
        ubahn: { delayed: 0, cancelled: 0 },
        tram: { delayed: 0, cancelled: 0 },
        sbahn: { delayed: 0, cancelled: 0 },
      });
    });

    it('skips departures with missing line data', () => {
      const departures = [
        { delay: 600, cancelled: false },
        { line: null, delay: 600, cancelled: false },
        { line: {}, delay: 600, cancelled: false },
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result).toEqual({
        bus: { delayed: 0, cancelled: 0 },
        ubahn: { delayed: 0, cancelled: 0 },
        tram: { delayed: 0, cancelled: 0 },
        sbahn: { delayed: 0, cancelled: 0 },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Product type mapping
  // ---------------------------------------------------------------------------

  describe('product type mapping', () => {
    it('aggregates bus departures correctly', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Test', delay: 600 }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Test', cancelled: true }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Test', delay: 0 }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.bus).toEqual({ delayed: 1, cancelled: 1 });
      expect(result.ubahn).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.tram).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.sbahn).toEqual({ delayed: 0, cancelled: 0 });
    });

    it('aggregates subway (ubahn) departures correctly', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'Test', delay: 600 }),
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'Test', cancelled: true }),
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'Test', delay: 0 }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.bus).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.ubahn).toEqual({ delayed: 1, cancelled: 1 });
      expect(result.tram).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.sbahn).toEqual({ delayed: 0, cancelled: 0 });
    });

    it('aggregates tram departures correctly', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Test', delay: 600 }),
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Test', cancelled: true }),
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Test', delay: 0 }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.bus).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.ubahn).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.tram).toEqual({ delayed: 1, cancelled: 1 });
      expect(result.sbahn).toEqual({ delayed: 0, cancelled: 0 });
    });

    it('aggregates suburban (sbahn) departures correctly', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 600 }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'Test', cancelled: true }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 0 }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.bus).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.ubahn).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.tram).toEqual({ delayed: 0, cancelled: 0 });
      expect(result.sbahn).toEqual({ delayed: 1, cancelled: 1 });
    });

    it('ignores unknown product types', () => {
      const departures = [
        {
          line: { product: 'ferry' },
          delay: 600,
          cancelled: false,
        },
        {
          line: { product: 'regional' },
          delay: 600,
          cancelled: false,
        },
        {
          line: { product: 'express' },
          cancelled: true,
        },
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result).toEqual({
        bus: { delayed: 0, cancelled: 0 },
        ubahn: { delayed: 0, cancelled: 0 },
        tram: { delayed: 0, cancelled: 0 },
        sbahn: { delayed: 0, cancelled: 0 },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Delay threshold and classification
  // ---------------------------------------------------------------------------

  describe('delay threshold and classification', () => {
    it('does not count delays <= 300s as delayed', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 0 }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 120 }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 300 }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.delayed).toBe(0);
    });

    it('counts delays > 300s as delayed', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 301 }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 600 }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 1200 }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.delayed).toBe(3);
    });

    it('does not count null delays as delayed', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: null }),
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'Test', delay: null }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.delayed).toBe(0);
      expect(result.ubahn.delayed).toBe(0);
    });

    it('does not count non-numeric delays as delayed', () => {
      const departures = [
        { line: { product: 'suburban' }, delay: 'not-a-number', cancelled: false },
        { line: { product: 'bus' }, delay: undefined, cancelled: false },
        { line: { product: 'subway' }, delay: {}, cancelled: false },
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.delayed).toBe(0);
      expect(result.bus.delayed).toBe(0);
      expect(result.ubahn.delayed).toBe(0);
    });

    it('does not count cancelled departures as delayed', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 600, cancelled: true }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.delayed).toBe(0);
      expect(result.sbahn.cancelled).toBe(1);
    });

    it('counts cancelled === true as cancelled', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', cancelled: true }),
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'Test', cancelled: true }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.cancelled).toBe(1);
      expect(result.ubahn.cancelled).toBe(1);
    });

    it('does not count cancelled === false as cancelled', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 600, cancelled: false }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.cancelled).toBe(0);
      expect(result.sbahn.delayed).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Mixed product types (realistic scenarios)
  // ---------------------------------------------------------------------------

  describe('mixed product types (realistic scenarios)', () => {
    it('aggregates fineDepartures correctly', () => {
      const result = aggregateDisruptionsByType(fineDepartures);

      // fineDepartures has 20 departures with 1 delayed S-Bahn
      expect(result.sbahn.delayed).toBeGreaterThan(0);
      expect(result.bus.delayed + result.ubahn.delayed + result.tram.delayed + result.sbahn.delayed).toBe(1);
    });

    it('aggregates degradedDepartures correctly', () => {
      const result = aggregateDisruptionsByType(degradedDepartures);

      // degradedDepartures has 5 delayed + 2 cancelled across multiple types
      const totalDelayed = result.bus.delayed + result.ubahn.delayed + result.tram.delayed + result.sbahn.delayed;
      const totalCancelled = result.bus.cancelled + result.ubahn.cancelled + result.tram.cancelled + result.sbahn.cancelled;

      expect(totalDelayed).toBe(5);
      expect(totalCancelled).toBe(2);
    });

    it('aggregates fuckedDepartures correctly', () => {
      const result = aggregateDisruptionsByType(fuckedDepartures);

      // fuckedDepartures has 8 delayed + 7 cancelled across multiple types
      const totalDelayed = result.bus.delayed + result.ubahn.delayed + result.tram.delayed + result.sbahn.delayed;
      const totalCancelled = result.bus.cancelled + result.ubahn.cancelled + result.tram.cancelled + result.sbahn.cancelled;

      expect(totalDelayed).toBe(8);
      expect(totalCancelled).toBe(7);
    });

    it('returns all zeros for allOnTimeDepartures', () => {
      const result = aggregateDisruptionsByType(allOnTimeDepartures);

      expect(result.bus.delayed).toBe(0);
      expect(result.bus.cancelled).toBe(0);
      expect(result.ubahn.delayed).toBe(0);
      expect(result.ubahn.cancelled).toBe(0);
      expect(result.tram.delayed).toBe(0);
      expect(result.tram.cancelled).toBe(0);
      expect(result.sbahn.delayed).toBe(0);
      expect(result.sbahn.cancelled).toBe(0);
    });

    it('counts only cancelled for allCancelledDepartures', () => {
      const result = aggregateDisruptionsByType(allCancelledDepartures);

      const totalCancelled = result.bus.cancelled + result.ubahn.cancelled + result.tram.cancelled + result.sbahn.cancelled;

      expect(totalCancelled).toBe(10);
      expect(result.bus.delayed).toBe(0);
      expect(result.ubahn.delayed).toBe(0);
      expect(result.tram.delayed).toBe(0);
      expect(result.sbahn.delayed).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple departures per type
  // ---------------------------------------------------------------------------

  describe('multiple departures per type', () => {
    it('correctly sums multiple disruptions for the same transit type', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test 1', delay: 600 }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'Test 2', delay: 720 }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test 3', cancelled: true }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'Test 4', cancelled: true }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test 5', delay: 0 }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.delayed).toBe(2);
      expect(result.sbahn.cancelled).toBe(2);
    });

    it('handles all four transit types in a single aggregation', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Test', delay: 600 }),
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'Test', delay: 720 }),
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Test', cancelled: true }),
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', cancelled: true }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.bus.delayed).toBe(1);
      expect(result.ubahn.delayed).toBe(1);
      expect(result.tram.cancelled).toBe(1);
      expect(result.sbahn.cancelled).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles a single delayed departure', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 600 }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.delayed).toBe(1);
      expect(result.sbahn.cancelled).toBe(0);
    });

    it('handles a single cancelled departure', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'Test', cancelled: true }),
      ];

      const result = aggregateDisruptionsByType(departures);

      expect(result.ubahn.delayed).toBe(0);
      expect(result.ubahn.cancelled).toBe(1);
    });

    it('handles departures with both delay and cancellation', () => {
      const departures = [
        makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 600, cancelled: true }),
      ];

      const result = aggregateDisruptionsByType(departures);

      // Should count as cancelled only, not delayed
      expect(result.sbahn.delayed).toBe(0);
      expect(result.sbahn.cancelled).toBe(1);
    });

    it('handles large numbers of departures efficiently', () => {
      const departures = [];
      for (let i = 0; i < 1000; i++) {
        departures.push(
          makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'Test', delay: 600 })
        );
      }

      const result = aggregateDisruptionsByType(departures);

      expect(result.sbahn.delayed).toBe(1000);
    });
  });

  // ---------------------------------------------------------------------------
  // Result structure validation
  // ---------------------------------------------------------------------------

  describe('result structure validation', () => {
    it('always returns an object with all four transit types', () => {
      const result = aggregateDisruptionsByType([]);

      expect(result).toHaveProperty('bus');
      expect(result).toHaveProperty('ubahn');
      expect(result).toHaveProperty('tram');
      expect(result).toHaveProperty('sbahn');
    });

    it('always returns delayed and cancelled properties for each type', () => {
      const result = aggregateDisruptionsByType([]);

      for (const type of ['bus', 'ubahn', 'tram', 'sbahn']) {
        expect(result[type]).toHaveProperty('delayed');
        expect(result[type]).toHaveProperty('cancelled');
        expect(typeof result[type].delayed).toBe('number');
        expect(typeof result[type].cancelled).toBe('number');
      }
    });

    it('returns non-negative integer counts', () => {
      const result = aggregateDisruptionsByType(fuckedDepartures);

      for (const type of ['bus', 'ubahn', 'tram', 'sbahn']) {
        expect(Number.isInteger(result[type].delayed)).toBe(true);
        expect(Number.isInteger(result[type].cancelled)).toBe(true);
        expect(result[type].delayed).toBeGreaterThanOrEqual(0);
        expect(result[type].cancelled).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

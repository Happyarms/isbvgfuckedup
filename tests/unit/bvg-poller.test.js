/**
 * Unit tests for the BVG poller service.
 *
 * Tests cache initialization (UNKNOWN on startup), staleness detection,
 * error handling (keeps cache on failure), and polling interval behavior.
 * Mocks bvg-client to avoid real API calls.
 *
 * The poller follows the IsSeptaFcked poll-and-cache pattern:
 *   - Primes cache with UNKNOWN on startup
 *   - Fires first poll immediately on start()
 *   - Schedules recurring polls via setInterval
 *   - On error, keeps the previous cache (staleness will handle it)
 */

import { jest } from '@jest/globals';
import { createPoller } from '../../src/services/bvg-poller.js';
import { fineDepartures, fuckedDepartures } from '../fixtures/departures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock BVG client whose getDepartures resolves with given data.
 *
 * @param {Array} departures - Data to resolve with
 * @returns {{ getDepartures: jest.Mock }}
 */
function createMockClient(departures = []) {
  return {
    getDepartures: jest.fn().mockResolvedValue(departures),
  };
}

// Default poller options for tests: single station, fast interval
const TEST_STATION = ['900003201'];
const TEST_INTERVAL = 60000;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BVG Poller', () => {
  // -------------------------------------------------------------------------
  // Cache initialization (UNKNOWN on startup)
  // -------------------------------------------------------------------------

  describe('cache initialization', () => {
    it('starts with UNKNOWN state before any poll', () => {
      const client = createMockClient(fineDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      const status = poller.getStatus();

      expect(status.state).toBe('UNKNOWN');
      expect(status.timestamp).toBeNull();
      expect(status.stale).toBe(true);
    });

    it('includes zero-value metrics on startup', () => {
      const client = createMockClient();
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      const status = poller.getStatus();

      expect(status.metrics.totalServices).toBe(0);
      expect(status.metrics.delayedCount).toBe(0);
      expect(status.metrics.cancelledCount).toBe(0);
      expect(status.metrics.disruptedCount).toBe(0);
    });

    it('includes UNKNOWN text display properties on startup', () => {
      const client = createMockClient();
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      const status = poller.getStatus();

      expect(status.text).toBeDefined();
      expect(status.text.cssClass).toBe('status-unknown');
      expect(status.text.message).toBeTruthy();
    });

    it('returns a shallow copy of the cache (not a reference)', () => {
      const client = createMockClient();
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      const a = poller.getStatus();
      const b = poller.getStatus();

      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });

  // -------------------------------------------------------------------------
  // poll() – successful data fetching
  // -------------------------------------------------------------------------

  describe('poll()', () => {
    it('updates cache with FINE status after polling on-time departures', async () => {
      const client = createMockClient(fineDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      await poller.poll();

      const status = poller.getStatus();
      expect(status.state).toBe('FINE');
      expect(status.timestamp).toBeGreaterThan(0);
      expect(status.stale).toBe(false);
    });

    it('updates cache with FUCKED status after polling disrupted departures', async () => {
      const client = createMockClient(fuckedDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      await poller.poll();

      const status = poller.getStatus();
      expect(status.state).toBe('FUCKED');
      expect(status.stale).toBe(false);
    });

    it('fetches departures from all configured stations', async () => {
      const client = createMockClient([]);
      const stations = ['900003201', '900100003', '900023201'];
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations });

      await poller.poll();

      expect(client.getDepartures).toHaveBeenCalledTimes(3);
      expect(client.getDepartures).toHaveBeenCalledWith('900003201', { results: 30 });
      expect(client.getDepartures).toHaveBeenCalledWith('900100003', { results: 30 });
      expect(client.getDepartures).toHaveBeenCalledWith('900023201', { results: 30 });
    });

    it('aggregates departures from multiple stations', async () => {
      const client = {
        getDepartures: jest.fn()
          .mockResolvedValueOnce(fineDepartures.slice(0, 5))
          .mockResolvedValueOnce(fineDepartures.slice(5, 10)),
      };
      const stations = ['900003201', '900100003'];
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations });

      await poller.poll();

      const status = poller.getStatus();
      expect(status.metrics.totalServices).toBe(10);
    });

    it('includes text display properties after successful poll', async () => {
      const client = createMockClient(fineDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      await poller.poll();

      const status = poller.getStatus();
      expect(status.text).toBeDefined();
      expect(status.text.cssClass).toBe('status-fine');
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('keeps previous cache when poll encounters an unexpected error', async () => {
      const client = createMockClient(fineDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      // First: successful poll to populate cache
      await poller.poll();
      const statusBefore = poller.getStatus();
      expect(statusBefore.state).toBe('FINE');

      // Make getDepartures throw synchronously → triggers outer catch block
      // (stations.map throws before Promise.allSettled is called)
      client.getDepartures.mockImplementation(() => {
        throw new Error('unexpected sync error');
      });

      await poller.poll();

      // Cache preserved from before
      const statusAfter = poller.getStatus();
      expect(statusAfter.state).toBe('FINE');
      expect(statusAfter.timestamp).toBe(statusBefore.timestamp);
    });

    it('handles per-station failures gracefully (partial data)', async () => {
      const client = {
        getDepartures: jest.fn()
          .mockResolvedValueOnce(fineDepartures)
          .mockRejectedValueOnce(new Error('station offline')),
      };
      const stations = ['900003201', '900100003'];
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations });

      await poller.poll();

      const status = poller.getStatus();
      // Should still have data from the first station
      expect(status.metrics.totalServices).toBeGreaterThan(0);
      expect(status.stale).toBe(false);
    });

    it('sets UNKNOWN when all stations fail via Promise.allSettled', async () => {
      const client = {
        getDepartures: jest.fn().mockRejectedValue(new Error('all stations down')),
      };
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      await poller.poll();

      const status = poller.getStatus();
      // All rejected → empty departures → UNKNOWN, but with a timestamp
      expect(status.state).toBe('UNKNOWN');
      expect(status.timestamp).toBeGreaterThan(0);
      expect(status.stale).toBe(false);
    });

    it('never throws from poll() regardless of error type', async () => {
      const client = createMockClient();
      client.getDepartures.mockImplementation(() => {
        throw new Error('catastrophic failure');
      });
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      // poll() should swallow all errors and never reject
      await expect(poller.poll()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Staleness detection
  // -------------------------------------------------------------------------

  describe('staleness detection', () => {
    /** @type {jest.SpyInstance | null} */
    let dateNowSpy = null;

    afterEach(() => {
      if (dateNowSpy) {
        dateNowSpy.mockRestore();
        dateNowSpy = null;
      }
    });

    it('marks status as stale when data exceeds staleness threshold', async () => {
      const client = createMockClient(fineDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      const pollTime = 1_000_000;
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(pollTime);

      await poller.poll();

      // Within threshold — not stale
      const fresh = poller.getStatus();
      expect(fresh.stale).toBe(false);
      expect(fresh.state).toBe('FINE');

      // Advance past staleness threshold (default 300 000 ms)
      dateNowSpy.mockReturnValue(pollTime + 300_001);

      const stale = poller.getStatus();
      expect(stale.stale).toBe(true);
      expect(stale.state).toBe('UNKNOWN');
    });

    it('preserves original timestamp when data becomes stale', async () => {
      const client = createMockClient(fineDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      const pollTime = 1_000_000;
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(pollTime);

      await poller.poll();

      // Advance well past staleness
      dateNowSpy.mockReturnValue(pollTime + 600_000);

      const status = poller.getStatus();
      expect(status.timestamp).toBe(pollTime);
    });

    it('does not mark status as stale when within threshold', async () => {
      const client = createMockClient(fineDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      const pollTime = 1_000_000;
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(pollTime);

      await poller.poll();

      // Just under the threshold
      dateNowSpy.mockReturnValue(pollTime + 299_999);

      const status = poller.getStatus();
      expect(status.stale).toBe(false);
      expect(status.state).toBe('FINE');
    });

    it('returns stale UNKNOWN with correct text properties', async () => {
      const client = createMockClient(fineDepartures);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      const pollTime = 1_000_000;
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(pollTime);

      await poller.poll();

      dateNowSpy.mockReturnValue(pollTime + 400_000);

      const status = poller.getStatus();
      expect(status.text.cssClass).toBe('status-unknown');
    });
  });

  // -------------------------------------------------------------------------
  // Polling interval behavior
  // -------------------------------------------------------------------------

  describe('polling interval behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calls getDepartures immediately on start()', () => {
      const client = createMockClient([]);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      poller.start();

      expect(client.getDepartures).toHaveBeenCalledTimes(1);

      poller.stop();
    });

    it('calls getDepartures again after interval elapses', () => {
      const client = createMockClient([]);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      poller.start();
      expect(client.getDepartures).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(TEST_INTERVAL);

      expect(client.getDepartures).toHaveBeenCalledTimes(2);

      poller.stop();
    });

    it('stops polling after stop() is called', () => {
      const client = createMockClient([]);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      poller.start();
      expect(client.getDepartures).toHaveBeenCalledTimes(1);

      poller.stop();

      jest.advanceTimersByTime(TEST_INTERVAL * 3);

      // No further calls after stop
      expect(client.getDepartures).toHaveBeenCalledTimes(1);
    });

    it('prevents duplicate intervals when start() is called twice', () => {
      const client = createMockClient([]);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      poller.start();
      poller.start(); // second call should be a no-op

      // Only one initial poll, not two
      expect(client.getDepartures).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(TEST_INTERVAL);

      // Only one interval → only one additional call (total 2, not 4)
      expect(client.getDepartures).toHaveBeenCalledTimes(2);

      poller.stop();
    });

    it('resets cache to UNKNOWN on start()', () => {
      const client = createMockClient([]);
      const poller = createPoller({ client, interval: TEST_INTERVAL, stations: TEST_STATION });

      poller.start();

      // Before the async poll resolves, cache is primed to UNKNOWN
      const status = poller.getStatus();
      expect(status.state).toBe('UNKNOWN');
      expect(status.timestamp).toBeNull();

      poller.stop();
    });

    it('uses the configured interval for setInterval', () => {
      const customInterval = 30_000;
      const client = createMockClient([]);
      const poller = createPoller({ client, interval: customInterval, stations: TEST_STATION });

      poller.start();
      expect(client.getDepartures).toHaveBeenCalledTimes(1);

      // Advance less than interval — no new call
      jest.advanceTimersByTime(customInterval - 1);
      expect(client.getDepartures).toHaveBeenCalledTimes(1);

      // Advance to exactly interval — new call
      jest.advanceTimersByTime(1);
      expect(client.getDepartures).toHaveBeenCalledTimes(2);

      poller.stop();
    });
  });
});

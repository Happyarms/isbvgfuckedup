import config from '../config.js';
import { createBvgClient } from './bvg-client.js';
import { determineStatus, aggregateDisruptionsByType } from '../models/transit-status.js';
import { getStatusText } from './status-text.js';

/**
 * Major BVG stations used as a representative sample.
 * IDs are HAFAS station identifiers.
 */
const STATIONS = [
  { id: '900003201', name: 'Berlin Hauptbahnhof' },
  { id: '900100003', name: 'Alexanderplatz' },
  { id: '900023201', name: 'Zoologischer Garten' },
  { id: '900100001', name: 'Friedrichstraße' },
  { id: '900120005', name: 'Ostkreuz' },
];

/**
 * Build an UNKNOWN status object used to prime the cache on startup
 * and returned when data becomes stale.
 *
 * Follows the IsSeptaFcked pattern of never leaving the cache empty
 * so that routes always have something to serve.
 *
 * @returns {object}
 */
function unknownStatus() {
  const { state, metrics } = determineStatus([]);
  const text = getStatusText(state);
  const transitBoxes = aggregateDisruptionsByType([]);
  return {
    state,
    metrics,
    text,
    transitBoxes,
    timestamp: null,
    stale: true,
  };
}

/**
 * Create a BVG poller instance.
 *
 * Follows the IsSeptaFcked poll-and-cache pattern:
 *   boot()  → prime cache with UNKNOWN, fire first poll immediately,
 *             then schedule recurring polls via setInterval.
 *   poll()  → fetch departures from STATIONS, run determineStatus(),
 *             store pre-computed status/metrics/text in memory cache.
 *   stop()  → clear the interval.
 *
 * @param {object} [overrides]
 * @param {object} [overrides.client]   - BVG client (for test injection)
 * @param {number} [overrides.interval] - Poll interval in ms
 * @param {string[]} [overrides.stations] - Station IDs to poll
 * @returns {{ start: Function, stop: Function, getStatus: Function }}
 */
export function createPoller(overrides = {}) {
  const client = overrides.client || createBvgClient();
  const interval = overrides.interval ?? config.refreshInterval;
  const stations = overrides.stations
    ? overrides.stations.map((id) => ({ id, name: id }))
    : STATIONS;

  /** @type {ReturnType<typeof unknownStatus>} */
  let cache = unknownStatus();

  /** @type {ReturnType<typeof setInterval> | null} */
  let timer = null;

  /**
   * Fetch departures from all configured stations, compute status,
   * and update the in-memory cache.
   *
   * On error the previous cache is kept (if not yet stale).
   * Errors are logged but never thrown — the poller must keep running.
   */
  async function poll() {
    try {
      const allDepartures = [];

      // Fetch departures from each station concurrently
      const results = await Promise.allSettled(
        stations.map((station) =>
          client.getDepartures(station.id, { results: 30 })
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allDepartures.push(...result.value);
        }
        // Rejected fetches are silently skipped — partial data is still useful
      }

      const { state, metrics } = determineStatus(allDepartures);
      const text = getStatusText(state);
      const transitBoxes = aggregateDisruptionsByType(allDepartures);

      cache = {
        state,
        metrics,
        text,
        transitBoxes,
        timestamp: Date.now(),
        stale: false,
      };
    } catch (err) {
      // Unexpected error (not per-station — those are caught by allSettled).
      // Keep serving the previous cache; staleness check will handle it.
      if (config.logLevel === 'debug') {
        process.stderr.write(`[bvg-poller] poll error: ${err.message}\n`);
      }
    }
  }

  /**
   * Start the poller.
   *
   * 1. Primes the cache with UNKNOWN (race-condition protection).
   * 2. Fires the first poll immediately.
   * 3. Schedules recurring polls via setInterval.
   */
  function start() {
    // Already running — avoid duplicate intervals
    if (timer !== null) {
      return;
    }

    // Prime cache (already done in createPoller, but explicit for clarity)
    cache = unknownStatus();

    // Fire first poll immediately (don't await — runs in background)
    poll();

    // Schedule recurring polls
    timer = setInterval(poll, interval);

    // Allow the process to exit even if the timer is still active
    if (timer.unref) {
      timer.unref();
    }
  }

  /**
   * Stop the polling loop.
   */
  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  /**
   * Return the current cached status.
   *
   * If the cache timestamp is older than config.stalenessThreshold (default 5 min),
   * the status is overridden to UNKNOWN with stale: true.
   *
   * @returns {object} The pre-computed status object
   */
  function getStatus() {
    // No successful poll yet — return primed UNKNOWN
    if (cache.timestamp === null) {
      return { ...cache };
    }

    const age = Date.now() - cache.timestamp;

    if (age > config.stalenessThreshold) {
      const stale = unknownStatus();
      stale.timestamp = cache.timestamp;
      return stale;
    }

    return { ...cache };
  }

  return { start, stop, getStatus, poll };
}

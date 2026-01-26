import { createClient } from 'hafas-client';
import { profile as bvgProfile } from 'hafas-client/p/bvg/index.js';

/**
 * Default request timeout in milliseconds.
 * @type {number}
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Default number of departure results per request.
 * @type {number}
 */
const DEFAULT_RESULTS = 30;

/**
 * Create a BVG HAFAS client wrapper.
 *
 * Initializes hafas-client with the BVG profile and exposes a
 * `getDepartures(stationId, options)` method that handles timeouts
 * and error normalization.
 *
 * @param {object} [overrides]
 * @param {number} [overrides.timeout] - Request timeout in ms (default 5000)
 * @returns {{ getDepartures: Function }}
 */
export function createBvgClient(overrides = {}) {
  const timeoutMs = overrides.timeout || DEFAULT_TIMEOUT_MS;
  const client = createClient(bvgProfile, 'isbvgfuckedup');

  /**
   * Fetch departures for a station with timeout protection.
   *
   * @param {string} stationId - HAFAS station ID (e.g. '900003201')
   * @param {object} [options]
   * @param {number} [options.results]  - Max number of results (default 30)
   * @param {number} [options.duration] - Look-ahead window in minutes
   * @returns {Promise<Array>} Normalized departure objects
   */
  async function getDepartures(stationId, options = {}) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);

    try {
      const hafasOpts = {
        results: options.results || DEFAULT_RESULTS,
        ...options,
        signal: abort.signal,
      };

      const response = await client.departures(stationId, hafasOpts);

      // hafas-client v6 returns { departures, realtimeDataUpdatedAt }
      const departures = Array.isArray(response.departures)
        ? response.departures
        : Array.isArray(response)
          ? response
          : [];

      return departures.map(normalizeDeparture);
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(
          `BVG API request timed out after ${timeoutMs}ms for station ${stationId}`
        );
        timeoutErr.code = 'ETIMEDOUT';
        throw timeoutErr;
      }
      const wrapped = new Error(
        `BVG API error for station ${stationId}: ${err.message}`
      );
      wrapped.code = err.code || 'EAPI';
      wrapped.cause = err;
      throw wrapped;
    } finally {
      clearTimeout(timer);
    }
  }

  return { getDepartures };
}

/**
 * Normalize a HAFAS departure object to the shape expected by
 * the transit-status model.
 *
 * @param {object} dep - Raw HAFAS departure
 * @returns {{ delay: number|null, cancelled: boolean, when: string|null, plannedWhen: string|null, direction: string|null, line: object|null }}
 */
function normalizeDeparture(dep) {
  return {
    delay: typeof dep.delay === 'number' ? dep.delay : null,
    cancelled: dep.cancelled === true,
    when: dep.when || null,
    plannedWhen: dep.plannedWhen || null,
    direction: dep.direction || null,
    line: dep.line || null,
  };
}

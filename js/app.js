/**
 * Client-side aggregation logic for transit status boxes.
 *
 * This module provides functions to aggregate disruption counts by transit type
 * (Bus, U-Bahn, Tram, S-Bahn) for display in the dashboard status boxes.
 */

/**
 * Default delay threshold in seconds (5 minutes).
 * A departure is considered "delayed" if its delay exceeds this threshold.
 * @type {number}
 */
const DELAY_THRESHOLD = 300;

/**
 * Aggregate disruptions by transit type.
 *
 * Takes an array of HAFAS departure objects and groups them by transit type,
 * counting delayed and cancelled departures for each type.
 *
 * Transit type mapping (HAFAS product to display name):
 *   - 'bus' → Bus
 *   - 'subway' → U-Bahn
 *   - 'tram' → Tram
 *   - 'suburban' → S-Bahn
 *
 * A departure is "delayed" when: !cancelled AND delay > 300s
 * A departure is "cancelled" when: cancelled === true
 *
 * @param {Array} departures - Array of HAFAS departure objects with normalized structure:
 *   { delay: number|null, cancelled: boolean, line: { product: string, ... }, ... }
 * @returns {Object} Aggregated counts by transit type:
 *   {
 *     bus: { delayed: number, cancelled: number },
 *     ubahn: { delayed: number, cancelled: number },
 *     tram: { delayed: number, cancelled: number },
 *     sbahn: { delayed: number, cancelled: number }
 *   }
 */
function aggregateDisruptionsByType(departures) {
  // Initialize result object with zero counts
  const result = {
    bus: { delayed: 0, cancelled: 0 },
    ubahn: { delayed: 0, cancelled: 0 },
    tram: { delayed: 0, cancelled: 0 },
    sbahn: { delayed: 0, cancelled: 0 },
  };

  // Handle empty or invalid input
  if (!Array.isArray(departures) || departures.length === 0) {
    return result;
  }

  // Iterate through all departures and aggregate by type
  for (const departure of departures) {
    // Skip departures with missing or invalid line data
    if (!departure.line || !departure.line.product) {
      continue;
    }

    const product = departure.line.product;
    const isDelayed = !departure.cancelled &&
                      typeof departure.delay === 'number' &&
                      departure.delay > DELAY_THRESHOLD;
    const isCancelled = departure.cancelled === true;

    // Map HAFAS product type to our transit type and update counts
    switch (product) {
      case 'bus':
        if (isDelayed) result.bus.delayed++;
        if (isCancelled) result.bus.cancelled++;
        break;
      case 'subway':
        if (isDelayed) result.ubahn.delayed++;
        if (isCancelled) result.ubahn.cancelled++;
        break;
      case 'tram':
        if (isDelayed) result.tram.delayed++;
        if (isCancelled) result.tram.cancelled++;
        break;
      case 'suburban':
        if (isDelayed) result.sbahn.delayed++;
        if (isCancelled) result.sbahn.cancelled++;
        break;
      // Ignore other product types (regional, express, ferry, etc.)
      default:
        break;
    }
  }

  return result;
}

// CommonJS export for Node.js (used by verification and tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    aggregateDisruptionsByType,
  };
}

// Browser global export for client-side usage
if (typeof window !== 'undefined') {
  window.aggregateDisruptionsByType = aggregateDisruptionsByType;
}

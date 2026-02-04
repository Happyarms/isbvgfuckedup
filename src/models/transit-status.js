import config from '../config.js';

/**
 * Determine the overall transit status from an array of departures.
 *
 * Each departure is expected to follow the HAFAS departure format:
 *   - delay: number|null  (seconds of delay; null means no data)
 *   - cancelled: boolean
 *
 * A departure is "delayed" when its delay exceeds config.thresholds.delay
 * (default 300 s / 5 min). A departure is "disrupted" if it is delayed OR
 * cancelled.
 *
 * Status states:
 *   FUCKED   – more than 50 % of departures are disrupted
 *   DEGRADED – 25-50 % disrupted
 *   FINE     – less than 25 % disrupted
 *   UNKNOWN  – no departure data available
 *
 * @param {Array} departures - Array of HAFAS departure objects
 * @returns {{ state: string, metrics: object }}
 */
export function determineStatus(departures) {
  if (!Array.isArray(departures) || departures.length === 0) {
    return {
      state: 'UNKNOWN',
      metrics: {
        totalServices: 0,
        delayedCount: 0,
        cancelledCount: 0,
        disruptedCount: 0,
        percentDelayed: 0,
        percentCancelled: 0,
        percentDisrupted: 0,
      },
    };
  }

  const { thresholds } = config;
  const totalServices = departures.length;

  const delayedCount = departures.filter(
    (d) => !d.cancelled && typeof d.delay === 'number' && d.delay > thresholds.delay
  ).length;

  const cancelledCount = departures.filter(
    (d) => d.cancelled === true
  ).length;

  const disruptedCount = delayedCount + cancelledCount;
  const disruptionRatio = disruptedCount / totalServices;

  const percentDelayed = Math.round((delayedCount / totalServices) * 100);
  const percentCancelled = Math.round((cancelledCount / totalServices) * 100);
  const percentDisrupted = Math.round(disruptionRatio * 100);

  let state;
  if (disruptionRatio > thresholds.fucked) {
    state = 'FUCKED';
  } else if (disruptionRatio > thresholds.degraded) {
    state = 'DEGRADED';
  } else {
    state = 'FINE';
  }

  return {
    state,
    metrics: {
      totalServices,
      delayedCount,
      cancelledCount,
      disruptedCount,
      percentDelayed,
      percentCancelled,
      percentDisrupted,
    },
  };
}

/**
 * Aggregate disruptions by transit type for the status boxes.
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
 * A departure is "delayed" when: !cancelled AND delay > threshold
 * A departure is "cancelled" when: cancelled === true
 *
 * @param {Array} departures - Array of HAFAS departure objects
 * @returns {Object} Aggregated counts by transit type:
 *   {
 *     bus: { delayed: number, cancelled: number },
 *     ubahn: { delayed: number, cancelled: number },
 *     tram: { delayed: number, cancelled: number },
 *     sbahn: { delayed: number, cancelled: number }
 *   }
 */
export function aggregateDisruptionsByType(departures) {
  const result = {
    bus: { delayed: 0, cancelled: 0 },
    ubahn: { delayed: 0, cancelled: 0 },
    tram: { delayed: 0, cancelled: 0 },
    sbahn: { delayed: 0, cancelled: 0 },
  };

  if (!Array.isArray(departures) || departures.length === 0) {
    return result;
  }

  const { thresholds } = config;

  for (const departure of departures) {
    if (!departure.line || !departure.line.product) {
      continue;
    }

    const product = departure.line.product;
    const isDelayed = !departure.cancelled &&
                      typeof departure.delay === 'number' &&
                      departure.delay > thresholds.delay;
    const isCancelled = departure.cancelled === true;

    switch (product) {
      case 'bus':
        if (isDelayed) {result.bus.delayed++;}
        if (isCancelled) {result.bus.cancelled++;}
        break;
      case 'subway':
        if (isDelayed) {result.ubahn.delayed++;}
        if (isCancelled) {result.ubahn.cancelled++;}
        break;
      case 'tram':
        if (isDelayed) {result.tram.delayed++;}
        if (isCancelled) {result.tram.cancelled++;}
        break;
      case 'suburban':
        if (isDelayed) {result.sbahn.delayed++;}
        if (isCancelled) {result.sbahn.cancelled++;}
        break;
      default:
        break;
    }
  }

  return result;
}

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

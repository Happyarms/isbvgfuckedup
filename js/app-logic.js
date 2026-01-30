/**
 * BVG Status Analysis - Pure Logic Functions
 * Extracted from app.js for testing purposes
 * This module contains only the pure functions without DOM dependencies
 */

/* ---------- Configuration Constants ---------- */

const CONFIG = {
  THRESHOLD_DEGRADED: 0.3,
  THRESHOLD_FUCKED: 0.6,
  DELAY_THRESHOLD_SECONDS: 300
};

/* ---------- Status Analysis ---------- */

/**
 * Analyze departure data and determine BVG status.
 * @param {Array} departures - Array of departure objects from VBB API
 * @returns {Object} Status result with metrics and disruption details
 */
export function analyzeStatus(departures) {
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

  var total = departures.length;
  var cancelledCount = 0;
  var delayedCount = 0;
  var cancelled = [];
  var delayed = [];

  departures.forEach(function (dep) {
    // Extract source URL from remarks if available
    var sourceUrl = null;
    if (dep.remarks && Array.isArray(dep.remarks)) {
      for (var i = 0; i < dep.remarks.length; i++) {
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
    var delay = dep.delay;
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

  var delayPct = delayedCount / total;
  var cancelPct = cancelledCount / total;
  var disruptionPct = (delayedCount + cancelledCount) / total;

  var status = 'normal';
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

/* ---------- UI Helper Functions ---------- */

/**
 * Format a number as a percentage string.
 * @param {number} value - Decimal value (0-1)
 * @returns {string} Formatted percentage (e.g. "42%")
 */
export function formatPct(value) {
  return Math.round(value * 100) + '%';
}

/**
 * Determine if a disruption is a bus (vs train/subway/tram).
 * @param {Object} disruption - Disruption object with line information
 * @returns {boolean} True if the disruption is for a bus line
 */
export function isBusDisruption(disruption) {
  if (!disruption || !disruption.line || !disruption.line.product) {
    return false;
  }
  var product = disruption.line.product.toLowerCase();
  return product === 'bus';
}

/**
 * Determine if a disruption is a tram.
 * @param {Object} disruption - Disruption object with line information
 * @returns {boolean} True if the disruption is for a tram line
 */
export function isTramDisruption(disruption) {
  if (!disruption || !disruption.line || !disruption.line.product) {
    return false;
  }
  var product = disruption.line.product.toLowerCase();
  return product === 'tram';
}

/**
 * Determine if a disruption is a S-Bahn (suburban rail).
 * @param {Object} disruption - Disruption object with line information
 * @returns {boolean} True if the disruption is for a S-Bahn line
 */
export function isSBahnDisruption(disruption) {
  if (!disruption || !disruption.line || !disruption.line.product) {
    return false;
  }
  var product = disruption.line.product.toLowerCase();
  return product === 'suburban';
}

/**
 * Determine if a disruption is a U-Bahn (subway/metro).
 * @param {Object} disruption - Disruption object with line information
 * @returns {boolean} True if the disruption is for a U-Bahn line
 */
export function isUBahnDisruption(disruption) {
  if (!disruption || !disruption.line || !disruption.line.product) {
    return false;
  }
  var product = disruption.line.product.toLowerCase();
  return product === 'subway';
}

/**
 * Determine if a disruption is "other" transit type (ferry, express, regional, or unrecognized).
 * Returns true for null/undefined disruptions and disruptions without product info.
 * @param {Object} disruption - Disruption object with line information
 * @returns {boolean} True if the disruption is for other transit types or unknown
 */
export function isOtherDisruption(disruption) {
  if (!disruption || !disruption.line || !disruption.line.product) {
    return true;
  }
  var product = disruption.line.product.toLowerCase();
  return product !== 'bus' &&
         product !== 'tram' &&
         product !== 'suburban' &&
         product !== 'subway';
}

/**
 * Render a list of disruptions into a DOM container.
 * @param {Array} disruptions - Array of disruption objects (cancelled or delayed)
 * @param {HTMLElement} container - DOM element to render into
 * @param {string} type - Type of disruption: 'cancelled' or 'delayed'
 */
export function renderDisruptions(disruptions, container, type) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!disruptions || disruptions.length === 0) {
    var noDisruptions = document.createElement('p');
    noDisruptions.textContent = 'Keine Störungen';
    noDisruptions.className = 'no-disruptions';
    container.appendChild(noDisruptions);
    return;
  }

  var list = document.createElement('ul');
  list.className = 'disruption-list';

  disruptions.forEach(function (disruption) {
    var item = document.createElement('li');
    item.className = 'disruption-item';

    var lineName = (disruption.line && disruption.line.name) ? disruption.line.name : 'Unknown Line';
    var direction = disruption.direction || 'Unknown Direction';

    var text = lineName + ' → ' + direction;

    if (type === 'cancelled' || disruption.cancelled) {
      text += ' (Ausgefallen)';
    } else if (type === 'delayed' && disruption.delay) {
      var delayMinutes = Math.round(disruption.delay / 60);
      text += ' (+' + delayMinutes + ' min)';
    }

    if (disruption.sourceUrl) {
      var link = document.createElement('a');
      link.href = disruption.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = text;
      item.appendChild(link);
    } else {
      item.textContent = text;
    }

    list.appendChild(item);
  });

  container.appendChild(list);
}

/* ---------- API Parsing Functions ---------- */

/**
 * Parse and validate API response
 * @param {Response} response - Fetch API response object
 * @returns {Promise<Object>} Parsed JSON data
 */
export function parseAPIResponse(response) {
  if (!response) {
    throw new Error('Response is null or undefined');
  }

  if (!response.ok) {
    throw new Error('HTTP error ' + response.status);
  }

  return response.json().then(function(data) {
    if (!data) {
      throw new Error('Empty response body');
    }
    return data;
  });
}

/**
 * Validate and normalize departure data
 * @param {Array} departures - Raw departure data from API
 * @returns {Array} Validated and normalized departures
 */
export function validateDepartures(departures) {
  if (!Array.isArray(departures)) {
    return [];
  }

  return departures.filter(function(dep) {
    // Filter out null/undefined entries
    if (!dep) {
      return false;
    }

    // Must have line information and direction
    if (!dep.line || !dep.direction) {
      return false;
    }

    return true;
  }).map(function(dep) {
    // Normalize fields
    return {
      tripId: dep.tripId || null,
      line: {
        name: (dep.line && dep.line.name) || 'Unknown',
        product: (dep.line && dep.line.product) || 'unknown'
      },
      direction: dep.direction || 'Unknown',
      when: dep.when || null,
      delay: (typeof dep.delay === 'number') ? dep.delay : null,
      cancelled: Boolean(dep.cancelled),
      platform: dep.platform || null,
      stop: dep.stop || null,
      remarks: Array.isArray(dep.remarks) ? dep.remarks : []
    };
  });
}

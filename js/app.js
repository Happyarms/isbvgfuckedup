/* ==========================================================================
   Is BVG Fucked Up? — Client-Side Status Logic
   Fetches real-time departure data from VBB Transport REST API,
   computes disruption status, and updates the DOM.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Configuration ---------- */

  var CONFIG = {
    API_BASE: 'https://v6.vbb.transport.rest',
    STATIONS: [
      { id: '900003201', name: 'Berlin Hauptbahnhof' },
      { id: '900100003', name: 'Alexanderplatz' },
      { id: '900023201', name: 'Zoologischer Garten' },
      { id: '900100001', name: 'Friedrichstrasse' }
    ],
    THRESHOLD_DEGRADED: 0.3,
    THRESHOLD_FUCKED: 0.6,
    DELAY_THRESHOLD_SECONDS: 300,
    REFRESH_INTERVAL_MS: 60000
  };

  /* ---------- DOM References ---------- */

  var dom = {
    loading: document.getElementById('loading'),
    statusAnswer: document.getElementById('status-answer'),
    statusText: document.getElementById('status-text'),
    statusDescription: document.getElementById('status-description'),
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    metrics: document.getElementById('metrics'),
    delayPct: document.getElementById('delay-pct'),
    cancelPct: document.getElementById('cancel-pct'),
    timestampSection: document.getElementById('timestamp-section'),
    lastUpdated: document.getElementById('last-updated'),
    refreshIndicator: document.getElementById('refresh-indicator'),
    disruptions: document.getElementById('disruptions'),
    busAccordionTrigger: document.getElementById('bus-accordion-trigger'),
    busAccordionPanel: document.getElementById('bus-accordion-panel'),
    busDisruptionList: document.getElementById('bus-disruption-list'),
    trainAccordionTrigger: document.getElementById('train-accordion-trigger'),
    trainAccordionPanel: document.getElementById('train-accordion-panel'),
    trainDisruptionList: document.getElementById('train-disruption-list')
  };

  /* ---------- Status Text Mapping ---------- */

  var STATUS_MAP = {
    fucked: {
      text: 'JA!',
      description: 'Die BVG ist gerade ziemlich am Arsch.'
    },
    degraded: {
      text: 'NAJA\u2026',
      description: 'Es gibt merkliche Versp\u00e4tungen und Ausf\u00e4lle.'
    },
    normal: {
      text: 'NEIN',
      description: 'L\u00e4uft gerade alles einigerma\u00dfen.'
    },
    unknown: {
      text: '?',
      description: 'Status konnte nicht ermittelt werden.'
    }
  };

  /* ---------- API Functions ---------- */

  /**
   * Fetch departures for a single station.
   * @param {string} stationId - VBB station ID
   * @returns {Promise<Array>} Array of departure objects
   */
  function fetchDepartures(stationId) {
    var url = CONFIG.API_BASE + '/stops/' + stationId + '/departures?duration=30&results=50';

    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error('API error: ' + response.status);
      }
      return response.json();
    }).then(function (data) {
      return data.departures || data;
    });
  }

  /**
   * Fetch departures from all configured stations in parallel.
   * Uses Promise.allSettled for resilience — partial failures are tolerated.
   * @returns {Promise<Array>} Flattened array of all departure objects
   */
  function fetchAllStations() {
    var promises = CONFIG.STATIONS.map(function (station) {
      return fetchDepartures(station.id);
    });

    return Promise.allSettled(promises).then(function (results) {
      var allDepartures = [];

      results.forEach(function (result) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allDepartures = allDepartures.concat(result.value);
        }
      });

      return allDepartures;
    });
  }

  /* ---------- Status Analysis ---------- */

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

    var total = departures.length;
    var cancelledCount = 0;
    var delayedCount = 0;
    var cancelled = [];
    var delayed = [];

    departures.forEach(function (dep) {
      if (dep.cancelled) {
        cancelledCount++;
        cancelled.push({
          line: dep.line,
          direction: dep.direction,
          when: dep.when,
          stop: dep.stop
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
          stop: dep.stop
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

    // Log disruption details for verification
    console.log('Cancelled departures:', cancelled);
    console.log('Delayed departures:', delayed);

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

  /* ---------- UI Functions ---------- */

  /**
   * Format a number as a percentage string.
   * @param {number} value - Decimal value (0-1)
   * @returns {string} Formatted percentage (e.g. "42%")
   */
  function formatPct(value) {
    return Math.round(value * 100) + '%';
  }

  /**
   * Update the page UI with analysis results.
   * @param {Object} result - Output from analyzeStatus()
   */
  function updateUI(result) {
    var info = STATUS_MAP[result.status] || STATUS_MAP.unknown;

    // Update body class for background color
    document.body.className = 'status-' + result.status;

    // Hide loading and error, show status answer
    dom.loading.hidden = true;
    dom.errorMessage.hidden = true;
    dom.statusAnswer.hidden = false;

    // Update status text
    dom.statusText.textContent = info.text;
    dom.statusDescription.textContent = info.description;

    // Update metrics
    dom.metrics.hidden = false;
    dom.delayPct.textContent = formatPct(result.delayPct);
    dom.cancelPct.textContent = formatPct(result.cancelPct);

    // Update timestamp
    var now = new Date();
    dom.timestampSection.hidden = false;
    dom.lastUpdated.textContent = 'Zuletzt aktualisiert: ' + now.toLocaleString('de-DE');
    dom.lastUpdated.setAttribute('datetime', now.toISOString());

    // Hide refresh indicator
    dom.refreshIndicator.hidden = true;
  }

  /**
   * Show an error message on the page.
   * @param {string} message - Error message to display
   */
  function showError(message) {
    document.body.className = 'status-unknown';

    dom.loading.hidden = true;
    dom.statusAnswer.hidden = true;
    dom.errorMessage.hidden = false;
    dom.errorText.textContent = message || 'Status konnte nicht abgerufen werden.';

    // Keep metrics/timestamp hidden on error (or show stale data)
    dom.refreshIndicator.hidden = true;
  }

  /**
   * Show the loading state.
   */
  function showLoading() {
    dom.loading.hidden = false;
    dom.statusAnswer.hidden = true;
    dom.errorMessage.hidden = true;
    dom.refreshIndicator.hidden = false;
  }

  /**
   * Toggle an accordion panel's visibility and update ARIA states.
   * @param {HTMLElement} trigger - The accordion button element
   * @param {HTMLElement} panel - The accordion panel element to toggle
   */
  function toggleAccordion(trigger, panel) {
    var isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    var newExpandedState = !isExpanded;

    trigger.setAttribute('aria-expanded', String(newExpandedState));
    panel.hidden = !newExpandedState;
  }

  /* ---------- Main Refresh Logic ---------- */

  /**
   * Fetch fresh data, analyze, and update the UI.
   */
  function refreshStatus() {
    showLoading();

    return fetchAllStations()
      .then(function (departures) {
        var result = analyzeStatus(departures);
        updateUI(result);
      })
      .catch(function (error) {
        showError('Fehler beim Abrufen der Daten: ' + error.message);
      });
  }

  /* ---------- Initialization ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    // Set up accordion event listeners
    if (dom.busAccordionTrigger && dom.busAccordionPanel) {
      dom.busAccordionTrigger.addEventListener('click', function () {
        toggleAccordion(dom.busAccordionTrigger, dom.busAccordionPanel);
      });

      dom.busAccordionTrigger.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleAccordion(dom.busAccordionTrigger, dom.busAccordionPanel);
        }
      });
    }

    if (dom.trainAccordionTrigger && dom.trainAccordionPanel) {
      dom.trainAccordionTrigger.addEventListener('click', function () {
        toggleAccordion(dom.trainAccordionTrigger, dom.trainAccordionPanel);
      });

      dom.trainAccordionTrigger.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleAccordion(dom.trainAccordionTrigger, dom.trainAccordionPanel);
        }
      });
    }

    refreshStatus();
    setInterval(refreshStatus, CONFIG.REFRESH_INTERVAL_MS);
  });
})();

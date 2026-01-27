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
   * Determine if a disruption is a bus (vs train/subway/tram).
   * @param {Object} disruption - Disruption object with line information
   * @returns {boolean} True if the disruption is for a bus line
   */
  function isBusDisruption(disruption) {
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
  function isTramDisruption(disruption) {
    if (!disruption || !disruption.line || !disruption.line.product) {
      return false;
    }
    var product = disruption.line.product.toLowerCase();
    return product === 'tram';
  }

  /**
   * Determine if a disruption is a S-Bahn (suburban rail).
   * @param {Object} disruption - Disruption object with line information
   * @returns {boolean} True if the disruption is for a suburban rail line
   */
  function isSBahnDisruption(disruption) {
    if (!disruption || !disruption.line || !disruption.line.product) {
      return false;
    }
    var product = disruption.line.product.toLowerCase();
    return product === 'suburban';
  }

  /**
   * Determine if a disruption is a U-Bahn (subway/metro).
   * @param {Object} disruption - Disruption object with line information
   * @returns {boolean} True if the disruption is for a subway line
   */
  function isUBahnDisruption(disruption) {
    if (!disruption || !disruption.line || !disruption.line.product) {
      return false;
    }
    var product = disruption.line.product.toLowerCase();
    return product === 'subway';
  }

  /**
   * Determine if a disruption is "other" transit type (ferry, express, regional, or null).
   * @param {Object} disruption - Disruption object with line information
   * @returns {boolean} True if the disruption is NOT bus, tram, suburban, or subway
   */
  function isOtherDisruption(disruption) {
    return !isBusDisruption(disruption) &&
           !isTramDisruption(disruption) &&
           !isSBahnDisruption(disruption) &&
           !isUBahnDisruption(disruption);
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

    // Mark cancelled disruptions with type
    var cancelledWithType = (result.cancelled || []).map(function (d) {
      d.type = 'cancelled';
      return d;
    });

    // Mark delayed disruptions with type
    var delayedWithType = (result.delayed || []).map(function (d) {
      d.type = 'delayed';
      return d;
    });

    // Combine all disruptions
    var allDisruptions = cancelledWithType.concat(delayedWithType);

    // Filter by bus and train
    var busDisruptions = allDisruptions.filter(isBusDisruption);
    var trainDisruptions = allDisruptions.filter(function (d) {
      return !isBusDisruption(d);
    });

    // Populate bus accordion
    if (dom.busDisruptionList) {
      renderDisruptions(busDisruptions, dom.busDisruptionList, 'mixed');
    }

    // Populate train accordion
    if (dom.trainDisruptionList) {
      renderDisruptions(trainDisruptions, dom.trainDisruptionList, 'mixed');
    }

    // Show disruptions section if there are any disruptions
    if (dom.disruptions && allDisruptions.length > 0) {
      dom.disruptions.hidden = false;
    }
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

  /**
   * Render disruption list items into a container element.
   * @param {Array} disruptions - Array of disruption objects (cancelled or delayed)
   * @param {HTMLElement} containerElement - Target DOM element to populate
   * @param {string} type - Type of disruptions: 'cancelled', 'delayed', or 'mixed'
   */
  function renderDisruptions(disruptions, containerElement, type) {
    // Clear existing content
    containerElement.innerHTML = '';

    // Handle empty state
    if (!disruptions || disruptions.length === 0) {
      var emptyMessage = document.createElement('p');
      emptyMessage.className = 'disruption-empty';
      emptyMessage.textContent = 'Keine Ausfälle/Verspätungen';
      containerElement.appendChild(emptyMessage);
      return;
    }

    // Create list items for each disruption
    disruptions.forEach(function (disruption) {
      var item = document.createElement('div');
      item.className = 'disruption-item';

      // Line number/name
      var lineElem = document.createElement('div');
      lineElem.className = 'disruption-line';
      var lineName = disruption.line && disruption.line.name ? disruption.line.name : 'Unbekannte Linie';
      lineElem.textContent = lineName;
      item.appendChild(lineElem);

      // Details (direction and delay information)
      var detailsElem = document.createElement('div');
      detailsElem.className = 'disruption-details';

      var detailsText = '';
      if (disruption.direction) {
        detailsText += 'Richtung ' + disruption.direction;
      }

      // Determine disruption type from object or parameter
      var disruptionType = disruption.type || type;

      if (disruptionType === 'delayed' && disruption.delay) {
        var delayMinutes = Math.round(disruption.delay / 60);
        if (detailsText) {
          detailsText += ' — ';
        }
        detailsText += 'Verspätung: ' + delayMinutes + ' Min.';
      } else if (disruptionType === 'cancelled' || !disruption.delay) {
        if (detailsText) {
          detailsText += ' — ';
        }
        detailsText += 'Ausfall';
      }

      detailsElem.textContent = detailsText || 'Keine Details verfügbar';
      item.appendChild(detailsElem);

      // Add source link if available
      if (disruption.sourceUrl) {
        var sourceElem = document.createElement('div');
        sourceElem.className = 'disruption-source';

        var linkElem = document.createElement('a');
        linkElem.href = disruption.sourceUrl;
        linkElem.target = '_blank';
        linkElem.rel = 'noopener noreferrer';
        linkElem.textContent = 'Quelle: BVG Meldung';

        sourceElem.appendChild(linkElem);
        item.appendChild(sourceElem);
      }

      containerElement.appendChild(item);
    });
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

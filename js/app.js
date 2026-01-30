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
    tramAccordionTrigger: document.getElementById('tram-accordion-trigger'),
    tramAccordionPanel: document.getElementById('tram-accordion-panel'),
    tramDisruptionList: document.getElementById('tram-disruption-list'),
    sbahnAccordionTrigger: document.getElementById('sbahn-accordion-trigger'),
    sbahnAccordionPanel: document.getElementById('sbahn-accordion-panel'),
    sbahnDisruptionList: document.getElementById('sbahn-disruption-list'),
    ubahnAccordionTrigger: document.getElementById('ubahn-accordion-trigger'),
    ubahnAccordionPanel: document.getElementById('ubahn-accordion-panel'),
    ubahnDisruptionList: document.getElementById('ubahn-disruption-list'),
    otherAccordionTrigger: document.getElementById('other-accordion-trigger'),
    otherAccordionPanel: document.getElementById('other-accordion-panel'),
    otherDisruptionList: document.getElementById('other-disruption-list'),
    lineFilter: document.getElementById('line-filter'),
    lineSelect: document.getElementById('line-select'),
    filterReset: document.getElementById('filter-reset'),
    activeFilters: document.getElementById('active-filters')
  };

  /* ---------- Application State ---------- */

  var appState = {
    allDepartures: [],
    availableLines: [],
    selectedLines: []
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

    // Filter into 5 categories by vehicle type
    var busDisruptions = allDisruptions.filter(isBusDisruption);
    var tramDisruptions = allDisruptions.filter(isTramDisruption);
    var sbahnDisruptions = allDisruptions.filter(isSBahnDisruption);
    var ubahnDisruptions = allDisruptions.filter(isUBahnDisruption);
    var otherDisruptions = allDisruptions.filter(isOtherDisruption);

    // Populate bus accordion
    if (dom.busDisruptionList) {
      renderDisruptions(busDisruptions, dom.busDisruptionList, 'mixed');
    }

    // Populate tram accordion
    if (dom.tramDisruptionList) {
      renderDisruptions(tramDisruptions, dom.tramDisruptionList, 'mixed');
    }

    // Populate S-Bahn accordion
    if (dom.sbahnDisruptionList) {
      renderDisruptions(sbahnDisruptions, dom.sbahnDisruptionList, 'mixed');
    }

    // Populate U-Bahn accordion
    if (dom.ubahnDisruptionList) {
      renderDisruptions(ubahnDisruptions, dom.ubahnDisruptionList, 'mixed');
    }

    // Populate Sonstige accordion
    if (dom.otherDisruptionList) {
      renderDisruptions(otherDisruptions, dom.otherDisruptionList, 'mixed');
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

  /**
   * Populate the line filter dropdown with available lines from departure data.
   * @param {Array} departures - Array of departure objects
   */
  function populateLineFilter(departures) {
    if (!dom.lineSelect || !window.LineFilter) {
      return;
    }

    // Extract unique line names using the LineFilter module
    var lineNames = window.LineFilter.extractUniqueLines(departures);

    // Store in application state
    appState.availableLines = lineNames;

    // Preserve currently selected lines before clearing
    var previouslySelected = appState.selectedLines || [];

    // Clear existing options
    dom.lineSelect.innerHTML = '';

    // Populate dropdown with line options
    lineNames.forEach(function (lineName) {
      var option = document.createElement('option');
      option.value = lineName;
      option.textContent = lineName;

      // Restore selection if this line was previously selected
      if (previouslySelected.indexOf(lineName) !== -1) {
        option.selected = true;
      }

      dom.lineSelect.appendChild(option);
    });

    // Update appState.selectedLines to only include lines that exist in current data
    // This ensures saved filters are cleaned up if some lines no longer exist
    appState.selectedLines = previouslySelected.filter(function (lineName) {
      return lineNames.indexOf(lineName) !== -1;
    });

    // Show the filter section if we have lines and it's currently hidden
    if (lineNames.length > 0 && dom.lineFilter && dom.lineFilter.hasAttribute('hidden')) {
      dom.lineFilter.removeAttribute('hidden');
    }
  }

  /**
   * Get currently selected lines from the multi-select dropdown.
   * @returns {Array<string>} Array of selected line names
   */
  function getSelectedLines() {
    if (!dom.lineSelect) {
      return [];
    }

    var selected = [];
    var options = dom.lineSelect.options;

    for (var i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }

    return selected;
  }

  /**
   * Render active filter chips in the active-filters container.
   * @param {Array<string>} selectedLines - Array of selected line names
   */
  function renderActiveFilters(selectedLines) {
    if (!dom.activeFilters) {
      return;
    }

    // Clear existing chips
    dom.activeFilters.innerHTML = '';

    // Hide container if no filters active
    if (!selectedLines || selectedLines.length === 0) {
      dom.activeFilters.hidden = true;
      // Announce to screen readers that filters have been cleared
      dom.activeFilters.setAttribute('aria-label', 'Aktive Filter: Keine Filter aktiv');
      return;
    }

    // Show container
    dom.activeFilters.hidden = false;

    // Update aria-label with filter count for screen readers
    var filterCount = selectedLines.length;
    var filterLabel = 'Aktive Filter: ' + filterCount + ' ' +
                      (filterCount === 1 ? 'Linie' : 'Linien') + ' ausgewählt';
    dom.activeFilters.setAttribute('aria-label', filterLabel);

    // Create chip for each selected line
    selectedLines.forEach(function (lineName) {
      var chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.setAttribute('data-line', lineName);

      var label = document.createElement('span');
      label.className = 'filter-chip-label';
      label.textContent = lineName;
      chip.appendChild(label);

      var removeButton = document.createElement('button');
      removeButton.className = 'filter-chip-remove';
      removeButton.type = 'button';
      removeButton.setAttribute('aria-label', 'Filter für ' + lineName + ' entfernen');
      removeButton.textContent = '×';
      chip.appendChild(removeButton);

      dom.activeFilters.appendChild(chip);
    });
  }

  /**
   * Check if localStorage is available and accessible.
   * Handles cases like private browsing mode or disabled storage.
   * @returns {boolean} True if localStorage can be used
   */
  function isLocalStorageAvailable() {
    try {
      var testKey = '__bvg_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate that data is an array of strings.
   * @param {*} data - Data to validate
   * @returns {boolean} True if data is a valid array of strings
   */
  function isValidFilterData(data) {
    if (!Array.isArray(data)) {
      return false;
    }
    // Ensure all elements are strings
    for (var i = 0; i < data.length; i++) {
      if (typeof data[i] !== 'string') {
        return false;
      }
    }
    return true;
  }

  /**
   * Save selected line filters to localStorage.
   * Handles edge cases: localStorage disabled, quota exceeded, private browsing.
   * @param {Array<string>} selectedLines - Array of line names to save
   */
  function saveFiltersToLocalStorage(selectedLines) {
    if (!isLocalStorageAvailable()) {
      return;
    }

    try {
      var data = JSON.stringify(selectedLines || []);
      localStorage.setItem('bvg-line-filters', data);
    } catch (error) {
      // Silently handle localStorage errors (e.g., quota exceeded, private browsing)
      // Clear potentially corrupted data
      try {
        localStorage.removeItem('bvg-line-filters');
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Load selected line filters from localStorage.
   * Handles edge cases: localStorage disabled, corrupt JSON, invalid data types.
   * @returns {Array<string>} Array of saved line names, or empty array if none saved/invalid
   */
  function loadFiltersFromLocalStorage() {
    if (!isLocalStorageAvailable()) {
      return [];
    }

    try {
      var data = localStorage.getItem('bvg-line-filters');
      if (!data) {
        return [];
      }

      var parsed = JSON.parse(data);

      // Validate parsed data is an array of strings
      if (!isValidFilterData(parsed)) {
        // Clear corrupt data
        localStorage.removeItem('bvg-line-filters');
        return [];
      }

      return parsed;
    } catch (error) {
      // Handle invalid JSON or other errors
      try {
        // Clear corrupt data
        localStorage.removeItem('bvg-line-filters');
      } catch (e) {
        // Ignore cleanup errors
      }
      return [];
    }
  }

  /**
   * Apply line filters and update the status display.
   * Filters the stored departures and re-analyzes the status.
   */
  function applyFiltersAndUpdateStatus() {
    if (!window.LineFilter) {
      return;
    }

    // Get currently selected lines
    var selectedLines = getSelectedLines();

    // Store in state
    appState.selectedLines = selectedLines;

    // Save to localStorage
    saveFiltersToLocalStorage(selectedLines);

    // Filter departures using LineFilter module
    var filteredDepartures = window.LineFilter.filterByLines(
      appState.allDepartures,
      selectedLines
    );

    // Analyze filtered data
    var result = analyzeStatus(filteredDepartures);

    // Update UI with filtered results
    updateUI(result);

    // Render active filter chips
    renderActiveFilters(selectedLines);
  }

  /**
   * Reset all line filters and restore full status view.
   */
  function resetFilters() {
    if (!dom.lineSelect) {
      return;
    }

    // Clear all selections in the dropdown
    var options = dom.lineSelect.options;
    for (var i = 0; i < options.length; i++) {
      options[i].selected = false;
    }

    // Clear state
    appState.selectedLines = [];

    // Clear localStorage
    saveFiltersToLocalStorage([]);

    // Reanalyze full dataset
    var result = analyzeStatus(appState.allDepartures);
    updateUI(result);

    // Clear active filter chips
    renderActiveFilters([]);
  }

  /**
   * Remove a specific line from the active filters.
   * @param {string} lineName - Name of the line to remove from filters
   */
  function removeLineFilter(lineName) {
    if (!dom.lineSelect) {
      return;
    }

    // Deselect the option in the dropdown
    var options = dom.lineSelect.options;
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === lineName) {
        options[i].selected = false;
        break;
      }
    }

    // Apply updated filters
    applyFiltersAndUpdateStatus();
  }

  /* ---------- Main Refresh Logic ---------- */

  /**
   * Fetch fresh data, analyze, and update the UI.
   */
  function refreshStatus() {
    showLoading();

    return fetchAllStations()
      .then(function (departures) {
        // Store departures in application state
        appState.allDepartures = departures;

        // Populate line filter dropdown with available lines
        // (preserves any active selections)
        populateLineFilter(departures);

        // Determine which departures to analyze based on active filters
        var departuresToAnalyze = departures;
        if (appState.selectedLines && appState.selectedLines.length > 0 && window.LineFilter) {
          // Apply active filters
          departuresToAnalyze = window.LineFilter.filterByLines(
            departures,
            appState.selectedLines
          );
        }

        // Analyze and update UI with filtered or full dataset
        var result = analyzeStatus(departuresToAnalyze);
        updateUI(result);

        // Update active filter chips to reflect current state
        if (appState.selectedLines && appState.selectedLines.length > 0) {
          renderActiveFilters(appState.selectedLines);
        }
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

    if (dom.tramAccordionTrigger && dom.tramAccordionPanel) {
      dom.tramAccordionTrigger.addEventListener('click', function () {
        toggleAccordion(dom.tramAccordionTrigger, dom.tramAccordionPanel);
      });

      dom.tramAccordionTrigger.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleAccordion(dom.tramAccordionTrigger, dom.tramAccordionPanel);
        }
      });
    }

    if (dom.sbahnAccordionTrigger && dom.sbahnAccordionPanel) {
      dom.sbahnAccordionTrigger.addEventListener('click', function () {
        toggleAccordion(dom.sbahnAccordionTrigger, dom.sbahnAccordionPanel);
      });

      dom.sbahnAccordionTrigger.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleAccordion(dom.sbahnAccordionTrigger, dom.sbahnAccordionPanel);
        }
      });
    }

    if (dom.ubahnAccordionTrigger && dom.ubahnAccordionPanel) {
      dom.ubahnAccordionTrigger.addEventListener('click', function () {
        toggleAccordion(dom.ubahnAccordionTrigger, dom.ubahnAccordionPanel);
      });

      dom.ubahnAccordionTrigger.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleAccordion(dom.ubahnAccordionTrigger, dom.ubahnAccordionPanel);
        }
      });
    }

    if (dom.otherAccordionTrigger && dom.otherAccordionPanel) {
      dom.otherAccordionTrigger.addEventListener('click', function () {
        toggleAccordion(dom.otherAccordionTrigger, dom.otherAccordionPanel);
      });

      dom.otherAccordionTrigger.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleAccordion(dom.otherAccordionTrigger, dom.otherAccordionPanel);
        }
      });
    }

    // Set up line filter event listeners
    if (dom.lineSelect) {
      dom.lineSelect.addEventListener('change', function () {
        applyFiltersAndUpdateStatus();
      });
    }

    if (dom.filterReset) {
      dom.filterReset.addEventListener('click', function () {
        resetFilters();
      });

      dom.filterReset.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          resetFilters();
        }
      });
    }

    // Set up event delegation for filter chip removal (click events)
    if (dom.activeFilters) {
      dom.activeFilters.addEventListener('click', function (event) {
        // Check if clicked element is a remove button
        var removeButton = event.target;
        if (removeButton.classList.contains('filter-chip-remove')) {
          // Find parent chip and get line name
          var chip = removeButton.closest('.filter-chip');
          if (chip) {
            var lineName = chip.getAttribute('data-line');
            if (lineName) {
              removeLineFilter(lineName);
            }
          }
        }
      });

      // Set up event delegation for filter chip removal (keyboard events)
      dom.activeFilters.addEventListener('keydown', function (event) {
        // Check if the focused element is a remove button
        var removeButton = event.target;
        if (removeButton.classList.contains('filter-chip-remove')) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            // Find parent chip and get line name
            var chip = removeButton.closest('.filter-chip');
            if (chip) {
              var lineName = chip.getAttribute('data-line');
              if (lineName) {
                removeLineFilter(lineName);
              }
            }
          }
        }
      });
    }

    // Load saved filters from localStorage
    var savedFilters = loadFiltersFromLocalStorage();
    if (savedFilters && savedFilters.length > 0) {
      appState.selectedLines = savedFilters;
    }

    refreshStatus();
    setInterval(refreshStatus, CONFIG.REFRESH_INTERVAL_MS);
  });

  /* ---------- Exports for Testing ---------- */
  // Export functions for testing in Node.js environment
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = {
        analyzeStatus: analyzeStatus,
        formatPct: formatPct,
        isBusDisruption: isBusDisruption,
        isTramDisruption: isTramDisruption,
        isSBahnDisruption: isSBahnDisruption,
        isUBahnDisruption: isUBahnDisruption,
        isOtherDisruption: isOtherDisruption,
        renderDisruptions: renderDisruptions
      };
    }
  }
})();

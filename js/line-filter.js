/* ==========================================================================
   Line Filtering Logic for BVG Status Monitor
   Pure functions for extracting unique line names and filtering departures.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Line Extraction ---------- */

  /**
   * Extract unique line names from an array of departures.
   * Returns a sorted array of unique line names (e.g., ['Bus 100', 'S1', 'S5', 'U1', 'U8'])
   * @param {Array} departures - Array of departure objects from VBB API
   * @returns {Array<string>} Sorted array of unique line names
   */
  function extractUniqueLines(departures) {
    if (!departures || !Array.isArray(departures) || departures.length === 0) {
      return [];
    }

    var lineNamesSet = {};
    var lineNames = [];

    // Extract line names and deduplicate
    departures.forEach(function (departure) {
      if (departure && departure.line && departure.line.name) {
        var lineName = departure.line.name;
        if (!lineNamesSet[lineName]) {
          lineNamesSet[lineName] = true;
          lineNames.push(lineName);
        }
      }
    });

    // Sort alphabetically
    lineNames.sort();

    return lineNames;
  }

  /* ---------- Filtering ---------- */

  /**
   * Filter departures by selected line names.
   * If selectedLines is empty or not provided, returns all departures.
   * @param {Array} departures - Array of departure objects from VBB API
   * @param {Array<string>} selectedLines - Array of line names to filter by (e.g., ['U8', 'S1'])
   * @returns {Array} Filtered array of departures
   */
  function filterByLines(departures, selectedLines) {
    // Return empty array if departures is invalid
    if (!departures || !Array.isArray(departures)) {
      return [];
    }

    // If no filters selected, return all departures
    if (!selectedLines || !Array.isArray(selectedLines) || selectedLines.length === 0) {
      return departures;
    }

    // Create a set for faster lookup
    var selectedLinesSet = {};
    selectedLines.forEach(function (lineName) {
      selectedLinesSet[lineName] = true;
    });

    // Filter departures by selected lines
    var filtered = [];
    departures.forEach(function (departure) {
      if (departure && departure.line && departure.line.name) {
        var lineName = departure.line.name;
        if (selectedLinesSet[lineName]) {
          filtered.push(departure);
        }
      }
    });

    return filtered;
  }

  /* ---------- Exports ---------- */

  // Export for use in other modules (Node.js/testing) or browser
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      extractUniqueLines: extractUniqueLines,
      filterByLines: filterByLines
    };
  } else {
    // Browser global
    window.LineFilter = {
      extractUniqueLines: extractUniqueLines,
      filterByLines: filterByLines
    };
  }
})();

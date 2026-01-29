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

  /* ---------- Exports ---------- */

  // Export for use in other modules (Node.js/testing) or browser
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      extractUniqueLines: extractUniqueLines
    };
  } else {
    // Browser global
    window.LineFilter = {
      extractUniqueLines: extractUniqueLines
    };
  }
})();

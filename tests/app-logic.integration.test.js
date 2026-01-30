/* ==========================================================================
   Integration Tests for Line Filtering Workflow
   Tests the interaction between line-filter.js and app-logic.js modules
   ========================================================================== */

const { extractUniqueLines, filterByLines } = require('../js/line-filter.js');
const { analyzeStatus } = require('../js/app-logic.js');

describe('Line Filtering Workflow - Integration Tests', function () {
  // Sample test data representing realistic BVG departure data
  var sampleDepartures;

  beforeEach(function () {
    // Reset sample data before each test
    sampleDepartures = [
      {
        tripId: '1',
        line: { name: 'U8', product: 'subway' },
        direction: 'Hermannstraße',
        when: '2024-01-26T15:30:00+01:00',
        delay: 420,
        cancelled: false,
        stop: { name: 'Alexanderplatz' }
      },
      {
        tripId: '2',
        line: { name: 'U8', product: 'subway' },
        direction: 'Wittenau',
        when: '2024-01-26T15:32:00+01:00',
        delay: 120,
        cancelled: false,
        stop: { name: 'Alexanderplatz' }
      },
      {
        tripId: '3',
        line: { name: 'S1', product: 'suburban' },
        direction: 'Oranienburg',
        when: '2024-01-26T15:33:00+01:00',
        delay: 600,
        cancelled: false,
        stop: { name: 'Friedrichstraße' }
      },
      {
        tripId: '4',
        line: { name: 'S5', product: 'suburban' },
        direction: 'Strausberg Nord',
        when: '2024-01-26T15:34:00+01:00',
        delay: null,
        cancelled: false,
        stop: { name: 'Alexanderplatz' }
      },
      {
        tripId: '5',
        line: { name: 'U1', product: 'subway' },
        direction: 'Warschauer Str.',
        when: '2024-01-26T15:35:00+01:00',
        delay: null,
        cancelled: false,
        stop: { name: 'Kottbusser Tor' }
      },
      {
        tripId: '6',
        line: { name: 'U1', product: 'subway' },
        direction: 'Uhlandstr.',
        when: '2024-01-26T15:36:00+01:00',
        delay: null,
        cancelled: true,
        stop: { name: 'Kottbusser Tor' }
      },
      {
        tripId: '7',
        line: { name: 'Bus 100', product: 'bus' },
        direction: 'Zoo',
        when: '2024-01-26T15:37:00+01:00',
        delay: null,
        cancelled: false,
        stop: { name: 'Brandenburger Tor' }
      }
    ];
  });

  describe('Workflow: Select single line', function () {
    it('should filter to U8 line and analyze its status', function () {
      // Step 1: Extract available lines from data
      var availableLines = extractUniqueLines(sampleDepartures);
      expect(availableLines).toContain('U8');

      // Step 2: Filter to single line (U8)
      var filteredDepartures = filterByLines(sampleDepartures, ['U8']);
      expect(filteredDepartures.length).toBe(2);
      expect(filteredDepartures.every(function (d) { return d.line.name === 'U8'; })).toBe(true);

      // Step 3: Analyze status of filtered departures
      var status = analyzeStatus(filteredDepartures);
      expect(status.status).toBe('degraded'); // 1 delayed out of 2 = 50%, above 30% threshold
      expect(status.total).toBe(2);
      expect(status.delayedCount).toBe(1); // Only 1 U8 delayed > 5min
      expect(status.cancelledCount).toBe(0);
    });

    it('should filter to S1 line and detect degraded status', function () {
      // Step 1: Filter to S1 line
      var filteredDepartures = filterByLines(sampleDepartures, ['S1']);
      expect(filteredDepartures.length).toBe(1);

      // Step 2: Analyze status
      var status = analyzeStatus(filteredDepartures);
      expect(status.status).toBe('fucked'); // 1 delayed out of 1 = 100%, above 60% threshold
      expect(status.total).toBe(1);
      expect(status.delayedCount).toBe(1);
      expect(status.delayed[0].line.name).toBe('S1');
    });
  });

  describe('Workflow: Select multiple lines', function () {
    it('should filter to U8 and S1 lines and analyze combined status', function () {
      // Step 1: Filter to multiple lines
      var filteredDepartures = filterByLines(sampleDepartures, ['U8', 'S1']);
      expect(filteredDepartures.length).toBe(3);

      // Verify only selected lines are included
      var lineNames = filteredDepartures.map(function (d) { return d.line.name; });
      expect(lineNames).toContain('U8');
      expect(lineNames).toContain('S1');
      expect(lineNames).not.toContain('U1');
      expect(lineNames).not.toContain('Bus 100');

      // Step 2: Analyze combined status
      var status = analyzeStatus(filteredDepartures);
      expect(status.status).toBe('fucked'); // 2 delayed out of 3 = 67%, above 60% threshold
      expect(status.total).toBe(3);
      expect(status.delayedCount).toBe(2); // 1 U8 + 1 S1
    });

    it('should filter to U1 lines and detect cancelled departure', function () {
      // Step 1: Filter to U1
      var filteredDepartures = filterByLines(sampleDepartures, ['U1']);
      expect(filteredDepartures.length).toBe(2);

      // Step 2: Analyze status
      var status = analyzeStatus(filteredDepartures);
      expect(status.status).toBe('degraded'); // 1 cancelled out of 2 = 50%, above 30% threshold
      expect(status.total).toBe(2);
      expect(status.cancelledCount).toBe(1);
      expect(status.delayedCount).toBe(0);
      expect(status.cancelled.length).toBe(1);
      expect(status.cancelled[0].line.name).toBe('U1');
    });
  });

  describe('Workflow: Reset filters (show all lines)', function () {
    it('should show all departures when no filter is selected', function () {
      // Step 1: Filter with empty selection (reset state)
      var filteredDepartures = filterByLines(sampleDepartures, []);
      expect(filteredDepartures.length).toBe(7);
      expect(filteredDepartures).toEqual(sampleDepartures);

      // Step 2: Analyze status of all lines
      var status = analyzeStatus(filteredDepartures);
      expect(status.total).toBe(7);
      expect(status.delayedCount).toBe(2); // U8 with 7min delay, S1 with 10min delay
      expect(status.cancelledCount).toBe(1); // U1 cancelled
    });

    it('should handle null selection as reset', function () {
      // Null selection should return all departures
      var filteredDepartures = filterByLines(sampleDepartures, null);
      expect(filteredDepartures.length).toBe(7);

      var status = analyzeStatus(filteredDepartures);
      expect(status.total).toBe(7);
    });

    it('should handle undefined selection as reset', function () {
      // Undefined selection should return all departures
      var filteredDepartures = filterByLines(sampleDepartures, undefined);
      expect(filteredDepartures.length).toBe(7);

      var status = analyzeStatus(filteredDepartures);
      expect(status.total).toBe(7);
    });
  });

  describe('Workflow: Filter with no matching departures', function () {
    it('should return empty results when filtering to non-existent line', function () {
      // Step 1: Filter to line that doesn't exist
      var filteredDepartures = filterByLines(sampleDepartures, ['U9', 'S99']);
      expect(filteredDepartures.length).toBe(0);

      // Step 2: Analyze status of empty results
      var status = analyzeStatus(filteredDepartures);
      expect(status.status).toBe('unknown');
      expect(status.total).toBe(0);
      expect(status.delayedCount).toBe(0);
      expect(status.cancelledCount).toBe(0);
      expect(status.delayed).toEqual([]);
      expect(status.cancelled).toEqual([]);
    });

    it('should handle filtering to lines with all normal departures', function () {
      // Step 1: Filter to S5 (no delays, no cancellations)
      var filteredDepartures = filterByLines(sampleDepartures, ['S5']);
      expect(filteredDepartures.length).toBe(1);

      // Step 2: Verify normal status
      var status = analyzeStatus(filteredDepartures);
      expect(status.status).toBe('normal');
      expect(status.total).toBe(1);
      expect(status.delayedCount).toBe(0);
      expect(status.cancelledCount).toBe(0);
    });

    it('should handle filtering to bus line with no disruptions', function () {
      // Step 1: Filter to Bus 100
      var filteredDepartures = filterByLines(sampleDepartures, ['Bus 100']);
      expect(filteredDepartures.length).toBe(1);

      // Step 2: Verify normal status
      var status = analyzeStatus(filteredDepartures);
      expect(status.status).toBe('normal');
      expect(status.delayedCount).toBe(0);
      expect(status.cancelledCount).toBe(0);
    });
  });

  describe('Workflow: localStorage persistence simulation', function () {
    it('should save and restore filter selection', function () {
      // Simulate user workflow

      // Step 1: User loads page, sees all lines
      var availableLines = extractUniqueLines(sampleDepartures);
      expect(availableLines).toEqual(['Bus 100', 'S1', 'S5', 'U1', 'U8']);

      // Step 2: User selects U8 and S1 filters
      var userSelection = ['U8', 'S1'];

      // Simulate save to localStorage (in real app, this would be JSON.stringify)
      var savedFilters = userSelection.slice(); // Clone array

      // Step 3: User reloads page
      // Simulate load from localStorage
      var restoredFilters = savedFilters;

      // Step 4: Verify restored filters match original selection
      expect(restoredFilters).toEqual(['U8', 'S1']);

      // Step 5: Apply restored filters
      var filteredDepartures = filterByLines(sampleDepartures, restoredFilters);
      expect(filteredDepartures.length).toBe(3);

      // Step 6: Verify status is same as before reload
      var status = analyzeStatus(filteredDepartures);
      expect(status.total).toBe(3);
      expect(status.delayedCount).toBe(2);
    });

    it('should handle loading invalid saved filters gracefully', function () {
      // Simulate corrupted or stale saved filters
      var savedFilters = ['U99', 'DeletedLine'];

      // Extract current available lines
      var availableLines = extractUniqueLines(sampleDepartures);

      // Filter out invalid saved lines (what app.js does)
      var validFilters = savedFilters.filter(function (line) {
        return availableLines.indexOf(line) !== -1;
      });

      // Should have no valid filters
      expect(validFilters.length).toBe(0);

      // Apply empty filter (show all)
      var filteredDepartures = filterByLines(sampleDepartures, validFilters);
      expect(filteredDepartures.length).toBe(7);
    });

    it('should handle partial valid filters from localStorage', function () {
      // Saved filters include both valid and invalid lines
      var savedFilters = ['U8', 'U99', 'S1', 'DeletedLine'];

      // Extract current available lines
      var availableLines = extractUniqueLines(sampleDepartures);

      // Filter to valid lines only
      var validFilters = savedFilters.filter(function (line) {
        return availableLines.indexOf(line) !== -1;
      });

      // Should only keep U8 and S1
      expect(validFilters).toEqual(['U8', 'S1']);

      // Apply valid filters
      var filteredDepartures = filterByLines(sampleDepartures, validFilters);
      expect(filteredDepartures.length).toBe(3);

      var status = analyzeStatus(filteredDepartures);
      expect(status.total).toBe(3);
    });
  });

  describe('Workflow: Complex real-world scenarios', function () {
    it('should handle dynamic data updates with active filters', function () {
      // Step 1: Initial state - user filters to U8
      var filteredDepartures = filterByLines(sampleDepartures, ['U8']);
      var initialStatus = analyzeStatus(filteredDepartures);
      expect(initialStatus.total).toBe(2);

      // Step 2: New data arrives (simulate API refresh)
      var updatedDepartures = sampleDepartures.concat([
        {
          tripId: '8',
          line: { name: 'U8', product: 'subway' },
          direction: 'Hermannstraße',
          when: '2024-01-26T15:40:00+01:00',
          delay: null,
          cancelled: false,
          stop: { name: 'Alexanderplatz' }
        }
      ]);

      // Step 3: Reapply same filter to new data
      var newFilteredDepartures = filterByLines(updatedDepartures, ['U8']);
      expect(newFilteredDepartures.length).toBe(3); // One more U8 departure

      // Step 4: Status should update
      var newStatus = analyzeStatus(newFilteredDepartures);
      expect(newStatus.total).toBe(3);
      expect(newStatus.delayedCount).toBe(1); // Still same 1 delayed U8
    });

    it('should handle switching between different filter combinations', function () {
      // Workflow: User tries different filter combinations

      // Filter 1: Only subway lines (U8, U1)
      var subwayDepartures = filterByLines(sampleDepartures, ['U8', 'U1']);
      var subwayStatus = analyzeStatus(subwayDepartures);
      expect(subwayStatus.total).toBe(4);
      expect(subwayStatus.status).toBe('degraded');

      // Filter 2: Only S-Bahn lines (S1, S5)
      var sBahnDepartures = filterByLines(sampleDepartures, ['S1', 'S5']);
      var sBahnStatus = analyzeStatus(sBahnDepartures);
      expect(sBahnStatus.total).toBe(2);
      expect(sBahnStatus.status).toBe('degraded');

      // Filter 3: Mix of subway and S-Bahn (U8, S1)
      var mixedDepartures = filterByLines(sampleDepartures, ['U8', 'S1']);
      var mixedStatus = analyzeStatus(mixedDepartures);
      expect(mixedStatus.total).toBe(3);

      // All filters should maintain data integrity
      expect(subwayDepartures.length + sBahnDepartures.length).toBe(6);
    });

    it('should maintain line extraction accuracy with active filters', function () {
      // Even with active filters, extractUniqueLines should work on any data

      // Step 1: Filter to subset
      var filteredDepartures = filterByLines(sampleDepartures, ['U8', 'S1']);

      // Step 2: Extract lines from filtered data
      var linesInFilteredData = extractUniqueLines(filteredDepartures);
      expect(linesInFilteredData).toEqual(['S1', 'U8']);

      // Step 3: Extract lines from full data
      var linesInFullData = extractUniqueLines(sampleDepartures);
      expect(linesInFullData).toEqual(['Bus 100', 'S1', 'S5', 'U1', 'U8']);

      // Filtered extraction should be subset of full extraction
      linesInFilteredData.forEach(function (line) {
        expect(linesInFullData).toContain(line);
      });
    });
  });

  describe('Workflow: Edge cases and error handling', function () {
    it('should handle empty departures gracefully', function () {
      var emptyDepartures = [];

      // Extract lines from empty data
      var availableLines = extractUniqueLines(emptyDepartures);
      expect(availableLines).toEqual([]);

      // Filter empty data
      var filteredDepartures = filterByLines(emptyDepartures, ['U8']);
      expect(filteredDepartures).toEqual([]);

      // Analyze empty data
      var status = analyzeStatus(filteredDepartures);
      expect(status.status).toBe('unknown');
      expect(status.total).toBe(0);
    });

    it('should handle departures with missing line information', function () {
      var corruptDepartures = [
        { direction: 'Somewhere' }, // No line property
        { line: null }, // line is null
        { line: { product: 'subway' } }, // Missing name
        { line: { name: 'U8', product: 'subway' }, direction: 'Valid' }
      ];

      // Extract should only get U8
      var availableLines = extractUniqueLines(corruptDepartures);
      expect(availableLines).toEqual(['U8']);

      // Filter should only return valid departure
      var filteredDepartures = filterByLines(corruptDepartures, ['U8']);
      expect(filteredDepartures.length).toBe(1);
      expect(filteredDepartures[0].line.name).toBe('U8');
    });

    it('should handle filter selection with case sensitivity', function () {
      var mixedCaseDepartures = [
        { line: { name: 'U8', product: 'subway' }, direction: 'A' },
        { line: { name: 'u8', product: 'subway' }, direction: 'B' }
      ];

      // Extract should get both (case-sensitive)
      var availableLines = extractUniqueLines(mixedCaseDepartures);
      expect(availableLines).toEqual(['U8', 'u8']);

      // Filter with 'U8' should only match uppercase
      var filteredDepartures = filterByLines(mixedCaseDepartures, ['U8']);
      expect(filteredDepartures.length).toBe(1);
      expect(filteredDepartures[0].line.name).toBe('U8');
    });
  });
});

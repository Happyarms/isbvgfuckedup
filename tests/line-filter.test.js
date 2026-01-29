/* ==========================================================================
   Line Filter Tests
   Tests for extractUniqueLines function
   ========================================================================== */

const { extractUniqueLines } = require('../js/line-filter.js');

describe('extractUniqueLines', function () {
  it('should return empty array for null input', function () {
    var result = extractUniqueLines(null);
    expect(result).toEqual([]);
  });

  it('should return empty array for undefined input', function () {
    var result = extractUniqueLines(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty array input', function () {
    var result = extractUniqueLines([]);
    expect(result).toEqual([]);
  });

  it('should extract unique line names from departures', function () {
    var departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' },
      { line: { name: 'U8', product: 'subway' }, direction: 'Wittenau' },
      { line: { name: 'Bus 100', product: 'bus' }, direction: 'Zoo' }
    ];

    var result = extractUniqueLines(departures);
    expect(result).toEqual(['Bus 100', 'S1', 'U8']);
  });

  it('should sort line names alphabetically', function () {
    var departures = [
      { line: { name: 'U8', product: 'subway' } },
      { line: { name: 'Bus 100', product: 'bus' } },
      { line: { name: 'S1', product: 'suburban' } },
      { line: { name: 'U1', product: 'subway' } },
      { line: { name: 'S5', product: 'suburban' } }
    ];

    var result = extractUniqueLines(departures);
    expect(result).toEqual(['Bus 100', 'S1', 'S5', 'U1', 'U8']);
  });

  it('should handle departures without line information', function () {
    var departures = [
      { line: { name: 'U8', product: 'subway' } },
      { direction: 'Nowhere' }, // No line property
      { line: null }, // line is null
      { line: { product: 'bus' } } // line.name is missing
    ];

    var result = extractUniqueLines(departures);
    expect(result).toEqual(['U8']);
  });

  it('should handle all invalid departures', function () {
    var departures = [
      { direction: 'Nowhere' },
      { line: null },
      { line: { product: 'bus' } },
      {}
    ];

    var result = extractUniqueLines(departures);
    expect(result).toEqual([]);
  });

  it('should deduplicate duplicate line names', function () {
    var departures = [
      { line: { name: 'U8', product: 'subway' } },
      { line: { name: 'U8', product: 'subway' } },
      { line: { name: 'U8', product: 'subway' } },
      { line: { name: 'S1', product: 'suburban' } },
      { line: { name: 'S1', product: 'suburban' } }
    ];

    var result = extractUniqueLines(departures);
    expect(result).toEqual(['S1', 'U8']);
  });

  it('should handle real-world departure structure', function () {
    var departures = [
      {
        line: { name: 'U1', product: 'subway' },
        direction: 'Warschauer Str.',
        when: '2024-01-26T15:30:00+01:00',
        delay: 120,
        cancelled: false
      },
      {
        line: { name: 'U1', product: 'subway' },
        direction: 'Uhlandstr.',
        when: '2024-01-26T15:32:00+01:00',
        delay: null,
        cancelled: false
      },
      {
        line: { name: 'S5', product: 'suburban' },
        direction: 'Strausberg Nord',
        when: '2024-01-26T15:35:00+01:00',
        delay: 300,
        cancelled: false
      }
    ];

    var result = extractUniqueLines(departures);
    expect(result).toEqual(['S5', 'U1']);
  });
});

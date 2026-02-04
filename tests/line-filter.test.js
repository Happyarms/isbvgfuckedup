/* ==========================================================================
   Line Filter Tests
   Tests for extractUniqueLines and filterByLines functions
   ========================================================================== */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { extractUniqueLines, filterByLines } = require('../js/line-filter.js');

describe('extractUniqueLines', function () {
  it('should return empty array for null input', function () {
    const result = extractUniqueLines(null);
    expect(result).toEqual([]);
  });

  it('should return empty array for undefined input', function () {
    const result = extractUniqueLines(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty array input', function () {
    const result = extractUniqueLines([]);
    expect(result).toEqual([]);
  });

  it('should extract unique line names from departures', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' },
      { line: { name: 'U8', product: 'subway' }, direction: 'Wittenau' },
      { line: { name: 'Bus 100', product: 'bus' }, direction: 'Zoo' }
    ];

    const result = extractUniqueLines(departures);
    expect(result).toEqual(['Bus 100', 'S1', 'U8']);
  });

  it('should sort line names alphabetically', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' } },
      { line: { name: 'Bus 100', product: 'bus' } },
      { line: { name: 'S1', product: 'suburban' } },
      { line: { name: 'U1', product: 'subway' } },
      { line: { name: 'S5', product: 'suburban' } }
    ];

    const result = extractUniqueLines(departures);
    expect(result).toEqual(['Bus 100', 'S1', 'S5', 'U1', 'U8']);
  });

  it('should handle departures without line information', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' } },
      { direction: 'Nowhere' }, // No line property
      { line: null }, // line is null
      { line: { product: 'bus' } } // line.name is missing
    ];

    const result = extractUniqueLines(departures);
    expect(result).toEqual(['U8']);
  });

  it('should handle all invalid departures', function () {
    const departures = [
      { direction: 'Nowhere' },
      { line: null },
      { line: { product: 'bus' } },
      {}
    ];

    const result = extractUniqueLines(departures);
    expect(result).toEqual([]);
  });

  it('should deduplicate duplicate line names', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' } },
      { line: { name: 'U8', product: 'subway' } },
      { line: { name: 'U8', product: 'subway' } },
      { line: { name: 'S1', product: 'suburban' } },
      { line: { name: 'S1', product: 'suburban' } }
    ];

    const result = extractUniqueLines(departures);
    expect(result).toEqual(['S1', 'U8']);
  });

  it('should handle real-world departure structure', function () {
    const departures = [
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

    const result = extractUniqueLines(departures);
    expect(result).toEqual(['S5', 'U1']);
  });
});

describe('filterByLines', function () {
  it('should return empty array for null departures', function () {
    const result = filterByLines(null, ['U8']);
    expect(result).toEqual([]);
  });

  it('should return empty array for undefined departures', function () {
    const result = filterByLines(undefined, ['U8']);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty array departures', function () {
    const result = filterByLines([], ['U8']);
    expect(result).toEqual([]);
  });

  it('should return all departures when selectedLines is null', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' }
    ];

    const result = filterByLines(departures, null);
    expect(result).toEqual(departures);
  });

  it('should return all departures when selectedLines is undefined', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' }
    ];

    const result = filterByLines(departures, undefined);
    expect(result).toEqual(departures);
  });

  it('should return all departures when selectedLines is empty array', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' }
    ];

    const result = filterByLines(departures, []);
    expect(result).toEqual(departures);
  });

  it('should filter departures by single selected line', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' },
      { line: { name: 'U1', product: 'subway' }, direction: 'Warschauer Str.' }
    ];

    const result = filterByLines(departures, ['U8']);
    expect(result).toEqual([
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' }
    ]);
  });

  it('should filter departures by multiple selected lines', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' },
      { line: { name: 'U1', product: 'subway' }, direction: 'Warschauer Str.' },
      { line: { name: 'Bus 100', product: 'bus' }, direction: 'Zoo' }
    ];

    const result = filterByLines(departures, ['U8', 'S1']);
    expect(result).toEqual([
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' }
    ]);
  });

  it('should return empty array when no departures match selected lines', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' }
    ];

    const result = filterByLines(departures, ['U1', 'S5']);
    expect(result).toEqual([]);
  });

  it('should handle departures without line information', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { direction: 'Nowhere' }, // No line property
      { line: null }, // line is null
      { line: { product: 'bus' } }, // line.name is missing
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' }
    ];

    const result = filterByLines(departures, ['U8', 'S1']);
    expect(result).toEqual([
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' }
    ]);
  });

  it('should preserve departure order when filtering', function () {
    const departures = [
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' },
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'Bus 100', product: 'bus' }, direction: 'Zoo' },
      { line: { name: 'U8', product: 'subway' }, direction: 'Wittenau' }
    ];

    const result = filterByLines(departures, ['U8']);
    expect(result).toEqual([
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'U8', product: 'subway' }, direction: 'Wittenau' }
    ]);
  });

  it('should handle real-world departure structure', function () {
    const departures = [
      {
        line: { name: 'U1', product: 'subway' },
        direction: 'Warschauer Str.',
        when: '2024-01-26T15:30:00+01:00',
        delay: 120,
        cancelled: false
      },
      {
        line: { name: 'U8', product: 'subway' },
        direction: 'Hermannstraße',
        when: '2024-01-26T15:31:00+01:00',
        delay: null,
        cancelled: false
      },
      {
        line: { name: 'S5', product: 'suburban' },
        direction: 'Strausberg Nord',
        when: '2024-01-26T15:35:00+01:00',
        delay: 300,
        cancelled: false
      },
      {
        line: { name: 'U1', product: 'subway' },
        direction: 'Uhlandstr.',
        when: '2024-01-26T15:32:00+01:00',
        delay: null,
        cancelled: false
      }
    ];

    const result = filterByLines(departures, ['U1', 'S5']);
    expect(result).toEqual([
      {
        line: { name: 'U1', product: 'subway' },
        direction: 'Warschauer Str.',
        when: '2024-01-26T15:30:00+01:00',
        delay: 120,
        cancelled: false
      },
      {
        line: { name: 'S5', product: 'suburban' },
        direction: 'Strausberg Nord',
        when: '2024-01-26T15:35:00+01:00',
        delay: 300,
        cancelled: false
      },
      {
        line: { name: 'U1', product: 'subway' },
        direction: 'Uhlandstr.',
        when: '2024-01-26T15:32:00+01:00',
        delay: null,
        cancelled: false
      }
    ]);
  });

  it('should handle case-sensitive line names', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'u8', product: 'subway' }, direction: 'Wittenau' }
    ];

    const result = filterByLines(departures, ['U8']);
    expect(result).toEqual([
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' }
    ]);
  });

  it('should not modify original departures array', function () {
    const departures = [
      { line: { name: 'U8', product: 'subway' }, direction: 'Hermannstraße' },
      { line: { name: 'S1', product: 'suburban' }, direction: 'Oranienburg' }
    ];
    const originalLength = departures.length;
    const originalFirstItem = departures[0];

    filterByLines(departures, ['U8']);

    expect(departures.length).toBe(originalLength);
    expect(departures[0]).toBe(originalFirstItem);
  });
});

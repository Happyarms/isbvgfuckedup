/**
 * Unit Tests for UI Helper Functions
 * Tests formatPct() and type classification functions (isBusDisruption, isTramDisruption, etc.)
 */

import { describe, test, expect } from '@jest/globals';
import {
  createMockLine,
  createMockDeparture
} from './setup.js';

/* ---------- UI Helper Functions (from app.js) ---------- */
// Note: These functions are extracted from app.js for testing purposes.
// In production, these would be imported from a shared module.

/**
 * Format a decimal value as a percentage string.
 * @param {number} value - Decimal value (0-1)
 * @returns {string} Formatted percentage string (e.g., "45%")
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
  const product = disruption.line.product.toLowerCase();
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
  const product = disruption.line.product.toLowerCase();
  return product === 'tram';
}

/**
 * Determine if a disruption is a S-Bahn (suburban rail).
 * @param {Object} disruption - Disruption object with line information
 * @returns {boolean} True if the disruption is for a S-Bahn line
 */
function isSBahnDisruption(disruption) {
  if (!disruption || !disruption.line || !disruption.line.product) {
    return false;
  }
  const product = disruption.line.product.toLowerCase();
  return product === 'suburban';
}

/**
 * Determine if a disruption is a U-Bahn (subway/metro).
 * @param {Object} disruption - Disruption object with line information
 * @returns {boolean} True if the disruption is for a U-Bahn line
 */
function isUBahnDisruption(disruption) {
  if (!disruption || !disruption.line || !disruption.line.product) {
    return false;
  }
  const product = disruption.line.product.toLowerCase();
  return product === 'subway';
}

/**
 * Determine if a disruption is "other" transit type (ferry, express, regional, or null).
 * @param {Object} disruption - Disruption object with line information
 * @returns {boolean} True if the disruption is for other transit types
 */
function isOtherDisruption(disruption) {
  return !isBusDisruption(disruption) &&
         !isTramDisruption(disruption) &&
         !isSBahnDisruption(disruption) &&
         !isUBahnDisruption(disruption);
}

/* ---------- Test Suite ---------- */

describe('formatPct()', () => {
  describe('Basic percentage formatting', () => {
    test('should format 0 as "0%"', () => {
      expect(formatPct(0)).toBe('0%');
    });

    test('should format 1 as "100%"', () => {
      expect(formatPct(1)).toBe('100%');
    });

    test('should format 0.5 as "50%"', () => {
      expect(formatPct(0.5)).toBe('50%');
    });

    test('should format 0.45 as "45%"', () => {
      expect(formatPct(0.45)).toBe('45%');
    });

    test('should format 0.3 as "30%"', () => {
      expect(formatPct(0.3)).toBe('30%');
    });

    test('should format 0.6 as "60%"', () => {
      expect(formatPct(0.6)).toBe('60%');
    });
  });

  describe('Decimal rounding', () => {
    test('should round 0.456 to "46%"', () => {
      expect(formatPct(0.456)).toBe('46%');
    });

    test('should round 0.454 to "45%"', () => {
      expect(formatPct(0.454)).toBe('45%');
    });

    test('should round 0.999 to "100%"', () => {
      expect(formatPct(0.999)).toBe('100%');
    });

    test('should round 0.001 to "0%"', () => {
      expect(formatPct(0.001)).toBe('0%');
    });

    test('should round 0.005 to "1%"', () => {
      expect(formatPct(0.005)).toBe('1%');
    });
  });

  describe('Edge cases', () => {
    test('should handle very small decimals', () => {
      expect(formatPct(0.0001)).toBe('0%');
    });

    test('should handle values close to 1', () => {
      expect(formatPct(0.9999)).toBe('100%');
    });

    test('should handle threshold values (0.3)', () => {
      expect(formatPct(0.3)).toBe('30%');
    });

    test('should handle threshold values (0.6)', () => {
      expect(formatPct(0.6)).toBe('60%');
    });
  });
});

describe('isBusDisruption()', () => {
  describe('Valid bus disruptions', () => {
    test('should return true for bus product', () => {
      const disruption = {
        line: createMockLine('bus'),
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(true);
    });

    test('should handle uppercase BUS product', () => {
      const disruption = {
        line: createMockLine('bus', { product: 'BUS' }),
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(true);
    });

    test('should handle mixed case Bus product', () => {
      const disruption = {
        line: createMockLine('bus', { product: 'Bus' }),
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(true);
    });
  });

  describe('Non-bus disruptions', () => {
    test('should return false for tram product', () => {
      const disruption = {
        line: createMockLine('tram'),
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(false);
    });

    test('should return false for subway product', () => {
      const disruption = {
        line: createMockLine('subway'),
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(false);
    });

    test('should return false for suburban product', () => {
      const disruption = {
        line: createMockLine('suburban'),
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(false);
    });
  });

  describe('Null/undefined handling', () => {
    test('should return false for null disruption', () => {
      expect(isBusDisruption(null)).toBe(false);
    });

    test('should return false for undefined disruption', () => {
      expect(isBusDisruption(undefined)).toBe(false);
    });

    test('should return false for disruption with no line', () => {
      const disruption = {
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(false);
    });

    test('should return false for disruption with null line', () => {
      const disruption = {
        line: null,
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(false);
    });

    test('should return false for disruption with no product', () => {
      const disruption = {
        line: {
          name: 'M41',
          id: 'm41'
        },
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(false);
    });

    test('should return false for disruption with null product', () => {
      const disruption = {
        line: {
          name: 'M41',
          id: 'm41',
          product: null
        },
        direction: 'Test Direction'
      };
      expect(isBusDisruption(disruption)).toBe(false);
    });
  });
});

describe('isTramDisruption()', () => {
  describe('Valid tram disruptions', () => {
    test('should return true for tram product', () => {
      const disruption = {
        line: createMockLine('tram'),
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(true);
    });

    test('should handle uppercase TRAM product', () => {
      const disruption = {
        line: createMockLine('tram', { product: 'TRAM' }),
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(true);
    });

    test('should handle mixed case Tram product', () => {
      const disruption = {
        line: createMockLine('tram', { product: 'Tram' }),
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(true);
    });
  });

  describe('Non-tram disruptions', () => {
    test('should return false for bus product', () => {
      const disruption = {
        line: createMockLine('bus'),
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(false);
    });

    test('should return false for subway product', () => {
      const disruption = {
        line: createMockLine('subway'),
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(false);
    });

    test('should return false for suburban product', () => {
      const disruption = {
        line: createMockLine('suburban'),
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(false);
    });
  });

  describe('Null/undefined handling', () => {
    test('should return false for null disruption', () => {
      expect(isTramDisruption(null)).toBe(false);
    });

    test('should return false for undefined disruption', () => {
      expect(isTramDisruption(undefined)).toBe(false);
    });

    test('should return false for disruption with no line', () => {
      const disruption = {
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(false);
    });

    test('should return false for disruption with null line', () => {
      const disruption = {
        line: null,
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(false);
    });

    test('should return false for disruption with no product', () => {
      const disruption = {
        line: {
          name: 'M10',
          id: 'm10'
        },
        direction: 'Test Direction'
      };
      expect(isTramDisruption(disruption)).toBe(false);
    });
  });
});

describe('isSBahnDisruption()', () => {
  describe('Valid S-Bahn disruptions', () => {
    test('should return true for suburban product', () => {
      const disruption = {
        line: createMockLine('suburban'),
        direction: 'Test Direction'
      };
      expect(isSBahnDisruption(disruption)).toBe(true);
    });

    test('should handle uppercase SUBURBAN product', () => {
      const disruption = {
        line: createMockLine('suburban', { product: 'SUBURBAN' }),
        direction: 'Test Direction'
      };
      expect(isSBahnDisruption(disruption)).toBe(true);
    });

    test('should handle mixed case Suburban product', () => {
      const disruption = {
        line: createMockLine('suburban', { product: 'Suburban' }),
        direction: 'Test Direction'
      };
      expect(isSBahnDisruption(disruption)).toBe(true);
    });
  });

  describe('Non-S-Bahn disruptions', () => {
    test('should return false for bus product', () => {
      const disruption = {
        line: createMockLine('bus'),
        direction: 'Test Direction'
      };
      expect(isSBahnDisruption(disruption)).toBe(false);
    });

    test('should return false for tram product', () => {
      const disruption = {
        line: createMockLine('tram'),
        direction: 'Test Direction'
      };
      expect(isSBahnDisruption(disruption)).toBe(false);
    });

    test('should return false for subway product', () => {
      const disruption = {
        line: createMockLine('subway'),
        direction: 'Test Direction'
      };
      expect(isSBahnDisruption(disruption)).toBe(false);
    });
  });

  describe('Null/undefined handling', () => {
    test('should return false for null disruption', () => {
      expect(isSBahnDisruption(null)).toBe(false);
    });

    test('should return false for undefined disruption', () => {
      expect(isSBahnDisruption(undefined)).toBe(false);
    });

    test('should return false for disruption with no line', () => {
      const disruption = {
        direction: 'Test Direction'
      };
      expect(isSBahnDisruption(disruption)).toBe(false);
    });

    test('should return false for disruption with null line', () => {
      const disruption = {
        line: null,
        direction: 'Test Direction'
      };
      expect(isSBahnDisruption(disruption)).toBe(false);
    });
  });
});

describe('isUBahnDisruption()', () => {
  describe('Valid U-Bahn disruptions', () => {
    test('should return true for subway product', () => {
      const disruption = {
        line: createMockLine('subway'),
        direction: 'Test Direction'
      };
      expect(isUBahnDisruption(disruption)).toBe(true);
    });

    test('should handle uppercase SUBWAY product', () => {
      const disruption = {
        line: createMockLine('subway', { product: 'SUBWAY' }),
        direction: 'Test Direction'
      };
      expect(isUBahnDisruption(disruption)).toBe(true);
    });

    test('should handle mixed case Subway product', () => {
      const disruption = {
        line: createMockLine('subway', { product: 'Subway' }),
        direction: 'Test Direction'
      };
      expect(isUBahnDisruption(disruption)).toBe(true);
    });
  });

  describe('Non-U-Bahn disruptions', () => {
    test('should return false for bus product', () => {
      const disruption = {
        line: createMockLine('bus'),
        direction: 'Test Direction'
      };
      expect(isUBahnDisruption(disruption)).toBe(false);
    });

    test('should return false for tram product', () => {
      const disruption = {
        line: createMockLine('tram'),
        direction: 'Test Direction'
      };
      expect(isUBahnDisruption(disruption)).toBe(false);
    });

    test('should return false for suburban product', () => {
      const disruption = {
        line: createMockLine('suburban'),
        direction: 'Test Direction'
      };
      expect(isUBahnDisruption(disruption)).toBe(false);
    });
  });

  describe('Null/undefined handling', () => {
    test('should return false for null disruption', () => {
      expect(isUBahnDisruption(null)).toBe(false);
    });

    test('should return false for undefined disruption', () => {
      expect(isUBahnDisruption(undefined)).toBe(false);
    });

    test('should return false for disruption with no line', () => {
      const disruption = {
        direction: 'Test Direction'
      };
      expect(isUBahnDisruption(disruption)).toBe(false);
    });

    test('should return false for disruption with null line', () => {
      const disruption = {
        line: null,
        direction: 'Test Direction'
      };
      expect(isUBahnDisruption(disruption)).toBe(false);
    });
  });
});

describe('isOtherDisruption()', () => {
  describe('Other transit types', () => {
    test('should return true for ferry product', () => {
      const disruption = {
        line: createMockLine('ferry'),
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(true);
    });

    test('should return true for express product', () => {
      const disruption = {
        line: createMockLine('express'),
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(true);
    });

    test('should return true for regional product', () => {
      const disruption = {
        line: createMockLine('regional'),
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(true);
    });

    test('should return true for unknown product', () => {
      const disruption = {
        line: createMockLine('unknown'),
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(true);
    });
  });

  describe('Known transit types should return false', () => {
    test('should return false for bus product', () => {
      const disruption = {
        line: createMockLine('bus'),
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(false);
    });

    test('should return false for tram product', () => {
      const disruption = {
        line: createMockLine('tram'),
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(false);
    });

    test('should return false for subway product', () => {
      const disruption = {
        line: createMockLine('subway'),
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(false);
    });

    test('should return false for suburban product', () => {
      const disruption = {
        line: createMockLine('suburban'),
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(false);
    });
  });

  describe('Null/undefined handling', () => {
    test('should return true for null disruption', () => {
      expect(isOtherDisruption(null)).toBe(true);
    });

    test('should return true for undefined disruption', () => {
      expect(isOtherDisruption(undefined)).toBe(true);
    });

    test('should return true for disruption with no line', () => {
      const disruption = {
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(true);
    });

    test('should return true for disruption with null line', () => {
      const disruption = {
        line: null,
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(true);
    });

    test('should return true for disruption with no product', () => {
      const disruption = {
        line: {
          name: 'Test',
          id: 'test'
        },
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(true);
    });

    test('should return true for disruption with null product', () => {
      const disruption = {
        line: {
          name: 'Test',
          id: 'test',
          product: null
        },
        direction: 'Test Direction'
      };
      expect(isOtherDisruption(disruption)).toBe(true);
    });
  });
});

describe('Type classification integration', () => {
  test('each disruption should match exactly one category', () => {
    const products = ['bus', 'tram', 'subway', 'suburban', 'ferry'];

    products.forEach(product => {
      const disruption = {
        line: createMockLine(product),
        direction: 'Test Direction'
      };

      const classifications = [
        isBusDisruption(disruption),
        isTramDisruption(disruption),
        isSBahnDisruption(disruption),
        isUBahnDisruption(disruption),
        isOtherDisruption(disruption)
      ];

      const trueCount = classifications.filter(c => c === true).length;
      expect(trueCount).toBe(1);
    });
  });

  test('null disruption should only match isOtherDisruption', () => {
    expect(isBusDisruption(null)).toBe(false);
    expect(isTramDisruption(null)).toBe(false);
    expect(isSBahnDisruption(null)).toBe(false);
    expect(isUBahnDisruption(null)).toBe(false);
    expect(isOtherDisruption(null)).toBe(true);
  });

  test('disruption with missing product should only match isOtherDisruption', () => {
    const disruption = {
      line: {
        name: 'Test',
        id: 'test'
      },
      direction: 'Test Direction'
    };

    expect(isBusDisruption(disruption)).toBe(false);
    expect(isTramDisruption(disruption)).toBe(false);
    expect(isSBahnDisruption(disruption)).toBe(false);
    expect(isUBahnDisruption(disruption)).toBe(false);
    expect(isOtherDisruption(disruption)).toBe(true);
  });
});

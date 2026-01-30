/**
 * Unit Tests for renderDisruptions() Function
 * Tests HTML rendering of disruption lists (cancelled/delayed departures)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  createMockLine,
  createMockDeparture,
  createMockElement
} from './setup.js';

/* ---------- renderDisruptions() Function ---------- */
// Note: This function is extracted from app.js for testing purposes.
// In production, this would be imported from a shared module.

/**
 * Render a list of disruptions to a container element.
 * Creates HTML list items showing line name, direction, and disruption details.
 *
 * @param {Array} disruptions - Array of disruption objects (departures with cancelled or significant delays)
 * @param {HTMLElement} container - Container element to render disruptions into
 */
function renderDisruptions(disruptions, container) {
  if (!container) {
    return;
  }

  // Clear existing content
  container.innerHTML = '';

  // Handle empty disruptions list
  if (!disruptions || disruptions.length === 0) {
    container.innerHTML = '<p class="no-disruptions">No disruptions to display</p>';
    return;
  }

  // Create list
  const ul = document.createElement('ul');
  ul.className = 'disruption-list';

  disruptions.forEach(disruption => {
    const li = document.createElement('li');
    li.className = 'disruption-item';

    // Extract line name (with fallback)
    const lineName = disruption.line && disruption.line.name
      ? disruption.line.name
      : 'Unknown Line';

    // Extract direction (with fallback)
    const direction = disruption.direction || 'Unknown Direction';

    // Build disruption text
    let disruptionText = '';
    if (disruption.cancelled) {
      disruptionText = 'Cancelled';
      li.classList.add('cancelled');
    } else if (disruption.delay && disruption.delay > 0) {
      const delayMinutes = Math.round(disruption.delay / 60);
      disruptionText = `Delayed ${delayMinutes} min`;
      li.classList.add('delayed');
    }

    // Build content
    li.innerHTML = `
      <strong>${lineName}</strong> → ${direction}
      <span class="disruption-status">${disruptionText}</span>
    `;

    // Add sourceUrl link if available
    if (disruption.sourceUrl) {
      const link = document.createElement('a');
      link.href = disruption.sourceUrl;
      link.className = 'disruption-link';
      link.textContent = 'More info';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.appendChild(document.createTextNode(' '));
      li.appendChild(link);
    }

    ul.appendChild(li);
  });

  container.appendChild(ul);
}

/* ---------- Test Suite ---------- */

describe('renderDisruptions()', () => {
  let container;

  beforeEach(() => {
    // Create a fresh container for each test
    container = createMockElement('div', { id: 'test-container' });
    document.body.appendChild(container);
  });

  describe('Empty and null handling', () => {
    test('should render "no disruptions" message for empty array', () => {
      renderDisruptions([], container);

      expect(container.innerHTML).toContain('No disruptions to display');
      expect(container.querySelector('.no-disruptions')).toBeTruthy();
    });

    test('should render "no disruptions" message for null disruptions', () => {
      renderDisruptions(null, container);

      expect(container.innerHTML).toContain('No disruptions to display');
      expect(container.querySelector('.no-disruptions')).toBeTruthy();
    });

    test('should render "no disruptions" message for undefined disruptions', () => {
      renderDisruptions(undefined, container);

      expect(container.innerHTML).toContain('No disruptions to display');
      expect(container.querySelector('.no-disruptions')).toBeTruthy();
    });

    test('should do nothing if container is null', () => {
      expect(() => {
        renderDisruptions([{ line: createMockLine('bus'), direction: 'Test' }], null);
      }).not.toThrow();
    });

    test('should do nothing if container is undefined', () => {
      expect(() => {
        renderDisruptions([{ line: createMockLine('bus'), direction: 'Test' }], undefined);
      }).not.toThrow();
    });
  });

  describe('Cancelled disruptions', () => {
    test('should render single cancelled disruption', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'S+U Hauptbahnhof',
          cancelled: true,
          delay: null
        }
      ];

      renderDisruptions(disruptions, container);

      const ul = container.querySelector('.disruption-list');
      expect(ul).toBeTruthy();

      const items = ul.querySelectorAll('.disruption-item');
      expect(items.length).toBe(1);

      const item = items[0];
      expect(item.innerHTML).toContain('M41');
      expect(item.innerHTML).toContain('S+U Hauptbahnhof');
      expect(item.innerHTML).toContain('Cancelled');
      expect(item.classList.contains('cancelled')).toBe(true);
    });

    test('should render multiple cancelled disruptions', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'S+U Hauptbahnhof',
          cancelled: true
        },
        {
          line: createMockLine('tram', { name: 'M10' }),
          direction: 'Warschauer Str.',
          cancelled: true
        },
        {
          line: createMockLine('subway', { name: 'U8' }),
          direction: 'Hermannstr.',
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const items = container.querySelectorAll('.disruption-item');
      expect(items.length).toBe(3);

      items.forEach(item => {
        expect(item.innerHTML).toContain('Cancelled');
        expect(item.classList.contains('cancelled')).toBe(true);
      });
    });

    test('should show cancelled status even when delay is present', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Test Direction',
          cancelled: true,
          delay: 600 // Should ignore delay if cancelled
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Cancelled');
      expect(item.innerHTML).not.toContain('Delayed');
    });
  });

  describe('Delayed disruptions', () => {
    test('should render single delayed disruption with delay time', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'S+U Hauptbahnhof',
          cancelled: false,
          delay: 360 // 6 minutes
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('M41');
      expect(item.innerHTML).toContain('S+U Hauptbahnhof');
      expect(item.innerHTML).toContain('Delayed 6 min');
      expect(item.classList.contains('delayed')).toBe(true);
    });

    test('should round delay time correctly (down)', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Test',
          delay: 330 // 5.5 minutes -> rounds to 6
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Delayed 6 min');
    });

    test('should round delay time correctly (up)', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Test',
          delay: 310 // 5.16 minutes -> rounds to 5
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Delayed 5 min');
    });

    test('should handle large delays', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Test',
          delay: 3600 // 60 minutes
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Delayed 60 min');
    });

    test('should handle small delays', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Test',
          delay: 90 // 1.5 minutes -> rounds to 2
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Delayed 2 min');
    });

    test('should not show delay for zero delay', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Test',
          delay: 0
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).not.toContain('Delayed');
    });
  });

  describe('Mixed disruptions', () => {
    test('should render mix of cancelled and delayed disruptions', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Hauptbahnhof',
          cancelled: true
        },
        {
          line: createMockLine('tram', { name: 'M10' }),
          direction: 'Warschauer Str.',
          delay: 420 // 7 minutes
        },
        {
          line: createMockLine('subway', { name: 'U8' }),
          direction: 'Hermannstr.',
          cancelled: true
        },
        {
          line: createMockLine('suburban', { name: 'S5' }),
          direction: 'Strausberg Nord',
          delay: 600 // 10 minutes
        }
      ];

      renderDisruptions(disruptions, container);

      const items = container.querySelectorAll('.disruption-item');
      expect(items.length).toBe(4);

      // Check first item (cancelled)
      expect(items[0].innerHTML).toContain('Cancelled');
      expect(items[0].classList.contains('cancelled')).toBe(true);

      // Check second item (delayed)
      expect(items[1].innerHTML).toContain('Delayed 7 min');
      expect(items[1].classList.contains('delayed')).toBe(true);

      // Check third item (cancelled)
      expect(items[2].innerHTML).toContain('Cancelled');
      expect(items[2].classList.contains('cancelled')).toBe(true);

      // Check fourth item (delayed)
      expect(items[3].innerHTML).toContain('Delayed 10 min');
      expect(items[3].classList.contains('delayed')).toBe(true);
    });
  });

  describe('Missing data handling', () => {
    test('should handle missing direction field', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          // No direction field
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('M41');
      expect(item.innerHTML).toContain('Unknown Direction');
    });

    test('should handle null direction field', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: null,
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Unknown Direction');
    });

    test('should handle empty string direction', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: '',
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Unknown Direction');
    });

    test('should handle missing line name', () => {
      const disruptions = [
        {
          line: {
            id: 'm41',
            product: 'bus'
            // No name field
          },
          direction: 'Test Direction',
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Unknown Line');
      expect(item.innerHTML).toContain('Test Direction');
    });

    test('should handle null line name', () => {
      const disruptions = [
        {
          line: {
            name: null,
            id: 'm41',
            product: 'bus'
          },
          direction: 'Test Direction',
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Unknown Line');
    });

    test('should handle missing line object', () => {
      const disruptions = [
        {
          // No line field
          direction: 'Test Direction',
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Unknown Line');
    });

    test('should handle null line object', () => {
      const disruptions = [
        {
          line: null,
          direction: 'Test Direction',
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const item = container.querySelector('.disruption-item');
      expect(item.innerHTML).toContain('Unknown Line');
    });
  });

  describe('SourceUrl link handling', () => {
    test('should render link when sourceUrl is provided', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Hauptbahnhof',
          cancelled: true,
          sourceUrl: 'https://example.com/disruption-info'
        }
      ];

      renderDisruptions(disruptions, container);

      const link = container.querySelector('.disruption-link');
      expect(link).toBeTruthy();
      expect(link.href).toBe('https://example.com/disruption-info');
      expect(link.textContent).toBe('More info');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    });

    test('should not render link when sourceUrl is missing', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Hauptbahnhof',
          cancelled: true
          // No sourceUrl
        }
      ];

      renderDisruptions(disruptions, container);

      const link = container.querySelector('.disruption-link');
      expect(link).toBeNull();
    });

    test('should not render link when sourceUrl is null', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Hauptbahnhof',
          cancelled: true,
          sourceUrl: null
        }
      ];

      renderDisruptions(disruptions, container);

      const link = container.querySelector('.disruption-link');
      expect(link).toBeNull();
    });

    test('should not render link when sourceUrl is empty string', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Hauptbahnhof',
          cancelled: true,
          sourceUrl: ''
        }
      ];

      renderDisruptions(disruptions, container);

      const link = container.querySelector('.disruption-link');
      expect(link).toBeNull();
    });

    test('should render multiple links for multiple disruptions with sourceUrls', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Hauptbahnhof',
          cancelled: true,
          sourceUrl: 'https://example.com/m41'
        },
        {
          line: createMockLine('tram', { name: 'M10' }),
          direction: 'Warschauer Str.',
          delay: 420,
          sourceUrl: 'https://example.com/m10'
        },
        {
          line: createMockLine('subway', { name: 'U8' }),
          direction: 'Hermannstr.',
          cancelled: true
          // No sourceUrl for this one
        }
      ];

      renderDisruptions(disruptions, container);

      const links = container.querySelectorAll('.disruption-link');
      expect(links.length).toBe(2);
      expect(links[0].href).toBe('https://example.com/m41');
      expect(links[1].href).toBe('https://example.com/m10');
    });
  });

  describe('DOM structure', () => {
    test('should create proper list structure', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Test',
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      const ul = container.querySelector('ul.disruption-list');
      expect(ul).toBeTruthy();

      const li = ul.querySelector('li.disruption-item');
      expect(li).toBeTruthy();
    });

    test('should clear previous content before rendering', () => {
      container.innerHTML = '<p>Previous content</p>';

      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'Test',
          cancelled: true
        }
      ];

      renderDisruptions(disruptions, container);

      expect(container.innerHTML).not.toContain('Previous content');
      expect(container.querySelector('.disruption-list')).toBeTruthy();
    });

    test('should re-render when called multiple times', () => {
      const firstDisruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'First',
          cancelled: true
        }
      ];

      renderDisruptions(firstDisruptions, container);
      expect(container.innerHTML).toContain('M41');
      expect(container.innerHTML).toContain('First');

      const secondDisruptions = [
        {
          line: createMockLine('tram', { name: 'M10' }),
          direction: 'Second',
          delay: 420
        }
      ];

      renderDisruptions(secondDisruptions, container);
      expect(container.innerHTML).not.toContain('M41');
      expect(container.innerHTML).not.toContain('First');
      expect(container.innerHTML).toContain('M10');
      expect(container.innerHTML).toContain('Second');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle realistic disruption scenario', () => {
      const disruptions = [
        {
          line: createMockLine('bus', { name: 'M41' }),
          direction: 'S+U Hauptbahnhof',
          cancelled: true,
          sourceUrl: 'https://bvg.de/m41'
        },
        {
          line: createMockLine('tram', { name: 'M10' }),
          direction: 'Warschauer Str.',
          delay: 480,
          sourceUrl: 'https://bvg.de/m10'
        },
        {
          line: createMockLine('subway', { name: 'U8' }),
          direction: 'Hermannstr.',
          delay: 720
        }
      ];

      renderDisruptions(disruptions, container);

      const items = container.querySelectorAll('.disruption-item');
      expect(items.length).toBe(3);

      // Verify each disruption is rendered correctly
      expect(items[0].innerHTML).toContain('M41');
      expect(items[0].innerHTML).toContain('Cancelled');
      expect(items[0].querySelector('.disruption-link')).toBeTruthy();

      expect(items[1].innerHTML).toContain('M10');
      expect(items[1].innerHTML).toContain('Delayed 8 min');
      expect(items[1].querySelector('.disruption-link')).toBeTruthy();

      expect(items[2].innerHTML).toContain('U8');
      expect(items[2].innerHTML).toContain('Delayed 12 min');
      expect(items[2].querySelector('.disruption-link')).toBeNull();
    });
  });
});

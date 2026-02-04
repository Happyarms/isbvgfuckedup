/**
 * Client-side JavaScript for BVG Status Page.
 *
 * Auto-refreshes status every 60 seconds via fetch('/api/status') and
 * surgically patches only the changed DOM elements — no full page reload.
 * Falls back to window.location.reload() if the fetch fails.
 *
 * Also handles dark mode theme detection and initialization.
 */

(function () {
  'use strict';

  const REFRESH_INTERVAL = 60;
  let secondsRemaining = REFRESH_INTERVAL;
  let timerInterval = null;

  /**
   * Get the user's preferred theme.
   * Checks localStorage first, then falls back to system preference.
   * @returns {string} 'light' or 'dark'
   */
  function getPreferredTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    // Fall back to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    return prefersDark.matches ? 'dark' : 'light';
  }

  /**
   * Apply the theme by setting the data-theme attribute on the html element.
   * @param {string} theme - 'light' or 'dark'
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggleIcon(theme);
  }

  /**
   * Update the theme toggle button icon to reflect the current theme.
   * Shows sun icon in dark mode, moon icon in light mode.
   * @param {string} theme - 'light' or 'dark'
   */
  function updateThemeToggleIcon(theme) {
    const toggleButton = document.querySelector('.theme-toggle');
    if (!toggleButton) {
      return;
    }
    // Show sun when in dark mode (click to go light)
    // Show moon when in light mode (click to go dark)
    toggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  /**
   * Initialize the theme on page load.
   * Called immediately to avoid flash of wrong theme.
   */
  function initTheme() {
    const theme = getPreferredTheme();
    applyTheme(theme);
  }

  /**
   * Toggle between light and dark themes.
   * Saves the preference to localStorage and applies the theme.
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }

  /**
   * Initialize listener for system preference changes.
   * Only updates theme if user hasn't set a manual preference.
   */
  function initSystemPreferenceListener() {
    const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    /**
     * Handle system preference changes.
     * @param {MediaQueryListEvent} e - The media query event
     */
    function handleSystemPreferenceChange(e) {
      // Only apply system preference if user hasn't set a manual preference
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        applyTheme(newTheme);
      }
    }

    // Use addEventListener if available, otherwise use addListener for older browsers
    if (prefersDarkQuery.addEventListener) {
      prefersDarkQuery.addEventListener('change', handleSystemPreferenceChange);
    } else if (prefersDarkQuery.addListener) {
      prefersDarkQuery.addListener(handleSystemPreferenceChange);
    }
  }

  /**
   * Find the refresh indicator element and update its text with the countdown.
   */
  function updateCountdown() {
    const el = document.querySelector('.refresh-indicator');
    if (!el) {
      return;
    }
    el.textContent =
      'Automatische Aktualisierung in ' + secondsRemaining + 's';
  }

  /**
   * Tick the countdown. When it reaches zero, fetch and patch in place.
   */
  function tick() {
    secondsRemaining--;

    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      fetchAndPatch();
      return;
    }

    updateCountdown();
  }

  /**
   * Fetch the latest status from /api/status and patch the DOM in place.
   * Falls back to a full page reload if the fetch or parsing fails.
   * Restarts the countdown timer after a successful patch.
   */
  function fetchAndPatch() {
    fetch('/api/status')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        patchDOM(data);
        startTimer();
      })
      .catch(function () {
        window.location.reload();
      });
  }

  /**
   * Patch the DOM in place with fresh data from the API response.
   * Only the changed elements are updated — no re-render or flicker.
   *
   * @param {Object} data - Parsed JSON from /api/status:
   *   { state, metrics, transitBoxes, message, emoji, cssClass, timestamp, stale }
   */
  function patchDOM(data) {
    // (1) Body className and .status className to the new status CSS class
    document.body.className = data.cssClass || '';
    const statusEl = document.querySelector('.status');
    if (statusEl) {
      statusEl.className = 'status ' + (data.cssClass || '');
    }

    // (2) Status emoji
    const emojiEl = document.querySelector('.status-emoji');
    if (emojiEl) {
      emojiEl.textContent = data.emoji || '';
    }

    // (3) Status text (message)
    const textEl = document.querySelector('.status-text');
    if (textEl) {
      textEl.textContent = data.message || '';
    }

    // (4) Metric values — may not exist if totalServices was 0 on initial render
    const metricValues = document.querySelectorAll('.metric-value');
    if (metricValues.length >= 3 && data.metrics) {
      metricValues[0].textContent = (data.metrics.percentDelayed || 0) + '%';
      metricValues[1].textContent = (data.metrics.percentCancelled || 0) + '%';
      metricValues[2].textContent = String(data.metrics.totalServices || 0);
    }

    // (5) Transit box counts — mirrors app.js updateTransitBoxes() exactly
    const transitTypes = ['bus', 'ubahn', 'tram', 'sbahn'];
    if (data.transitBoxes) {
      for (const type of transitTypes) {
        if (!data.transitBoxes[type]) {
          continue;
        }

        const typeData = data.transitBoxes[type];

        const delayedEl = document.getElementById(type + '-delayed-count');
        if (delayedEl) {
          delayedEl.textContent = String(typeData.delayed || 0);
        }

        const cancelledEl = document.getElementById(type + '-cancelled-count');
        if (cancelledEl) {
          cancelledEl.textContent = String(typeData.cancelled || 0);
        }
      }
    }

    // (6) Stale warning — create before .footer-info if stale and missing; remove if not stale
    const staleWarning = document.querySelector('.stale-warning');
    if (data.stale) {
      if (!staleWarning) {
        const warning = document.createElement('div');
        warning.className = 'stale-warning';
        warning.textContent = 'Daten sind veraltet.';
        const footerInfo = document.querySelector('.footer-info');
        if (footerInfo) {
          footerInfo.parentNode.insertBefore(warning, footerInfo);
        }
      }
    } else {
      if (staleWarning) {
        staleWarning.parentNode.removeChild(staleWarning);
      }
    }

    // (7) Timestamp — formatted as de-DE locale string
    const timestampEl = document.querySelector('.timestamp');
    if (timestampEl && data.timestamp) {
      timestampEl.textContent =
        'Zuletzt aktualisiert: ' + new Date(data.timestamp).toLocaleString('de-DE');
    }
  }

  /**
   * Start the auto-refresh countdown timer.
   */
  function startTimer() {
    secondsRemaining = REFRESH_INTERVAL;
    updateCountdown();
    timerInterval = setInterval(tick, 1000);
  }

  /**
   * Initialize the theme toggle button.
   * Attaches click event listener to toggle theme.
   */
  function initThemeToggle() {
    const toggleButton = document.querySelector('.theme-toggle');
    if (!toggleButton) {
      return;
    }
    toggleButton.addEventListener('click', toggleTheme);
  }

  /* Initialize theme immediately to avoid flash */
  initTheme();

  /* Set up system preference change listener */
  initSystemPreferenceListener();

  /* Kick off timer and initialize theme toggle once the DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      startTimer();
      initThemeToggle();
    });
  } else {
    startTimer();
    initThemeToggle();
  }
})();

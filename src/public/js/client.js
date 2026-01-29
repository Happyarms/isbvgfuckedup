/**
 * Client-side JavaScript for BVG Status Page.
 *
 * Follows the IsSeptaFcked pattern: simple page reload for refresh.
 * Auto-refreshes the page every 60 seconds with a visible countdown.
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
   * Tick the countdown. When it reaches zero, reload the page.
   */
  function tick() {
    secondsRemaining--;

    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      window.location.reload();
      return;
    }

    updateCountdown();
  }

  /**
   * Start the auto-refresh countdown timer.
   */
  function startTimer() {
    secondsRemaining = REFRESH_INTERVAL;
    updateCountdown();
    timerInterval = setInterval(tick, 1000);
  }

  /* Initialize theme immediately to avoid flash */
  initTheme();

  /* Kick off timer once the DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTimer);
  } else {
    startTimer();
  }
})();

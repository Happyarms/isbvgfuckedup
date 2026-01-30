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

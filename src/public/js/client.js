/**
 * Client-side JavaScript for BVG Status Page.
 *
 * Follows the IsSeptaFcked pattern: simple page reload for refresh.
 * Auto-refreshes the page every 60 seconds with a visible countdown.
 */

(function () {
  'use strict';

  const REFRESH_INTERVAL = 60;
  let secondsRemaining = REFRESH_INTERVAL;
  let timerInterval = null;

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

  /* Kick off once the DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTimer);
  } else {
    startTimer();
  }
})();

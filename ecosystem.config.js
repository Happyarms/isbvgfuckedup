/**
 * PM2 Ecosystem Configuration for isbvgfuckedup
 *
 * This configuration file defines PM2 process management settings
 * for the BVG status monitoring Express.js application.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      // Application name (visible in pm2 list)
      name: 'isbvgfuckedup',

      // Entry point - Express server
      script: 'src/server.js',

      // Number of instances (1 = single process, no clustering)
      instances: 1,

      // Execution mode: 'fork' for single instance, 'cluster' for multiple
      exec_mode: 'fork',

      // Auto-restart on crash
      autorestart: true,

      // Disable file watching (not needed in production)
      watch: false,

      // Maximum memory before auto-restart (1GB)
      max_memory_restart: '1G',

      // Environment variables for production
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BVG_API_TYPE: 'vbb',
        REFRESH_INTERVAL: 60000,
        LOG_LEVEL: 'info',
        THRESHOLD_DEGRADED: 0.3,
        THRESHOLD_FUCKED: 0.6,
        DELAY_THRESHOLD: 5,
        STALENESS_THRESHOLD: 10
      },

      // Environment variables for development (pm2 start --env development)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        BVG_API_TYPE: 'vbb',
        REFRESH_INTERVAL: 60000,
        LOG_LEVEL: 'debug',
        THRESHOLD_DEGRADED: 0.3,
        THRESHOLD_FUCKED: 0.6,
        DELAY_THRESHOLD: 5,
        STALENESS_THRESHOLD: 10
      },

      // Logging configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Merge logs from all instances
      merge_logs: true,

      // Minimum uptime before considering app stable (10 seconds)
      min_uptime: '10s',

      // Maximum number of restart attempts before giving up (15 attempts)
      max_restarts: 15,

      // Time window for max_restarts (1 minute)
      restart_delay: 4000,

      // Wait time before force killing app on stop/restart (3 seconds)
      kill_timeout: 3000,

      // Wait for app to be ready before considering it started
      wait_ready: false,

      // Graceful shutdown - listen for SIGINT
      listen_timeout: 3000
    }
  ]
};

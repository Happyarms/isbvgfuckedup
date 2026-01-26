import 'dotenv/config';

/**
 * Centralized configuration module.
 * All environment variable access goes through here with sensible defaults.
 */
const config = {
  /** Server port */
  port: parseInt(process.env.PORT, 10) || 3000,

  /** Environment mode */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** Whether running in production */
  isProduction: process.env.NODE_ENV === 'production',

  /** BVG data source type: 'hafas' or 'rest-api' */
  bvgApiType: process.env.BVG_API_TYPE || 'hafas',

  /** Polling interval in milliseconds */
  refreshInterval: parseInt(process.env.REFRESH_INTERVAL, 10) || 60000,

  /** Log level: debug, info, warn, error */
  logLevel: process.env.LOG_LEVEL || 'info',

  /** Status thresholds (percentage as decimal 0-1) */
  thresholds: {
    /** Disruption ratio above which status is DEGRADED */
    degraded: parseFloat(process.env.THRESHOLD_DEGRADED) || 0.25,
    /** Disruption ratio above which status is FUCKED */
    fucked: parseFloat(process.env.THRESHOLD_FUCKED) || 0.5,
    /** Delay in seconds above which a departure counts as disrupted */
    delay: parseInt(process.env.DELAY_THRESHOLD, 10) || 300,
  },

  /** Staleness threshold in milliseconds - data older than this = UNKNOWN */
  stalenessThreshold: parseInt(process.env.STALENESS_THRESHOLD, 10) || 300000,

  /** Redis URL (only needed if bvgApiType is 'rest-api') */
  redisUrl: process.env.REDIS_URL || null,
};

export default config;

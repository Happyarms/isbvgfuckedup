/**
 * Express application entry point.
 *
 * Follows the IsSeptaFcked web.js boot sequence:
 *   1. Configure Express (Pug, static files, morgan).
 *   2. Mount CORS middleware for /api routes.
 *   3. Mount route handlers.
 *   4. Add error-handling middleware.
 *   5. Start the BVG poller.
 *   6. Listen on PORT.
 *
 * The app is exported so that Supertest can consume it without starting
 * the HTTP server. The poller is started and the server listens only
 * when this file is executed directly (not imported as a module).
 */

import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config.js';
import { createPoller } from './services/bvg-poller.js';
import { createRoutes } from './routes/index.js';

/* ------------------------------------------------------------------ */
/*  Resolve __dirname for ESM                                         */
/* ------------------------------------------------------------------ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ------------------------------------------------------------------ */
/*  Create poller and Express app                                     */
/* ------------------------------------------------------------------ */

const poller = createPoller();
const app = express();

/* ------------------------------------------------------------------ */
/*  Middleware                                                         */
/* ------------------------------------------------------------------ */

// Trust reverse proxy headers (X-Forwarded-For, etc.)
app.enable('trust proxy');

// Pug template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Static files (CSS, client JS)
app.use(express.static(path.join(__dirname, 'public')));

// HTTP request logging
const logFormat = config.isProduction ? 'combined' : 'dev';
app.use(morgan(logFormat));

// CORS headers for API routes (matches IsSeptaFcked middleware pattern)
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

/* ------------------------------------------------------------------ */
/*  Routes                                                            */
/* ------------------------------------------------------------------ */

app.use(createRoutes(poller));

/* ------------------------------------------------------------------ */
/*  Error-handling middleware                                          */
/* ------------------------------------------------------------------ */

/**
 * Catch-all error handler.
 *
 * Renders error.pug with a sanitised message.  In production the
 * original error message is hidden to avoid leaking internals.
 *
 * Express requires all four parameters to recognise this as an
 * error-handling middleware.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const errorMessage = config.isProduction
    ? 'Ein Fehler ist aufgetreten.'
    : err.message;

  res.status(status).render('error', {
    title: 'Fehler - Ist BVG gefickt?',
    bodyClass: 'status-unknown',
    errorMessage,
  });
});

/* ------------------------------------------------------------------ */
/*  Boot (only when executed directly)                                */
/* ------------------------------------------------------------------ */

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  poller.start();

  app.listen(config.port, () => {
    process.stdout.write(
      `[server] Listening on port ${config.port} (${config.nodeEnv})\n`
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Exports (for testing with Supertest)                              */
/* ------------------------------------------------------------------ */

export { app, poller };
export default app;

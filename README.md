# BVG Status Monitor

[![CI Status](https://github.com/Happyarms/isbvgfuckedup/actions/workflows/ci.yml/badge.svg)](https://github.com/Happyarms/isbvgfuckedup/actions/workflows/ci.yml)

A real-time status monitoring application for Berlin's public transportation system (BVG). This Express.js application tracks departure delays and service disruptions using the VBB HAFAS API, providing both a web interface and JSON API endpoint.

## Features

- **Real-time Monitoring**: Tracks BVG departures and delays across the network
- **Status Assessment**: Automatically categorizes service quality based on configurable thresholds:
  - 🟢 Normal operation
  - 🟡 Degraded service (delays affecting 30%+ of departures)
  - 🔴 Severely disrupted (delays affecting 60%+ of departures)
- **Multiple Interfaces**:
  - Web UI with live status dashboard
  - REST API endpoint (`/api/status`) for programmatic access
- **Production-Ready**: Designed for deployment with PM2 process manager and nginx reverse proxy
- **Configurable**: Extensive environment-based configuration for thresholds and refresh intervals

## Prerequisites

- Node.js 18+ (via nvm recommended for production)
- npm (comes with Node.js)

## Quick Start (Local Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/isbvgfuckedup.git
   cd isbvgfuckedup
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Web Interface: http://localhost:3000
   - API Endpoint: http://localhost:3000/api/status

## API Endpoints

### `GET /`
Returns the web interface showing current BVG status with visual indicators.

### `GET /api/status`
Returns JSON response with departure data and service status:

```json
{
  "status": "normal",
  "departures": [...],
  "realtimeDataUpdatedAt": "2024-01-26T19:00:00.000Z",
  "timestamp": "2024-01-26T19:00:05.000Z"
}
```

## Configuration

Environment variables (see `.env.example` for full list):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `BVG_API_TYPE` | BVG API profile type | `vbb` |
| `REFRESH_INTERVAL` | Data refresh interval (ms) | `60000` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `THRESHOLD_DEGRADED` | Degraded status threshold (%) | `0.3` |
| `THRESHOLD_FUCKED` | Critical status threshold (%) | `0.6` |
| `DELAY_THRESHOLD` | Delay threshold (minutes) | `5` |
| `STALENESS_THRESHOLD` | Data staleness threshold (minutes) | `10` |

## Production Deployment

For deploying this application on a Hetzner server (or similar hosting environment) without Docker, please refer to our comprehensive deployment guide:

**📖 [DEPLOYMENT.md](./DEPLOYMENT.md)**

The deployment guide covers:
- Installing Node.js via nvm (no root access required)
- Setting up PM2 process manager for auto-restart and daemonization
- Configuring nginx as a reverse proxy
- SSL/TLS certificate setup with Let's Encrypt
- Troubleshooting common deployment issues
- Production environment configuration

## Development

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm test` - Run test suite with Jest
- `npm run lint` - Check code style with ESLint
- `npm run format` - Format code with Prettier

### Project Structure

```
isbvgfuckedup/
├── src/
│   ├── server.js          # Application entry point
│   ├── config/            # Configuration management
│   ├── services/          # BVG API integration
│   └── views/             # Pug templates
├── tests/                 # Jest test suite
├── .env.example           # Environment variable template
├── ecosystem.config.js    # PM2 process configuration
├── nginx-site.conf        # nginx reverse proxy config
└── DEPLOYMENT.md          # Production deployment guide
```

## Tech Stack

- **Runtime**: Node.js 18+ (ESM modules)
- **Framework**: Express 4.21.2
- **BVG API Client**: hafas-client 6.3.6
- **Templating**: Pug
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier
- **Process Manager**: PM2 (production)
- **Reverse Proxy**: nginx (production)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For deployment issues or questions, consult the [DEPLOYMENT.md](./DEPLOYMENT.md) guide or open an issue on GitHub.

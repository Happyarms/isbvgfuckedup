# Add gzip compression middleware to reduce HTTP response sizes by 60-80%

## Overview

The Express app serves HTML pages (GET /) and JSON API responses (GET /api/status) with no HTTP-level compression. Adding the well-established 'compression' npm package as middleware applies gzip encoding to all text-based responses automatically. For this app's small payloads, even the default compression settings yield substantial percentage reductions.

## Rationale

Every 60-second refresh cycle (or API poll) transfers uncompressed payloads over the wire. The HTML response is ~3-5KB raw; the JSON response is ~200-400B raw. While individually small, these responses are issued repeatedly and frequently — and for mobile commuters, even sub-KB savings compound meaningfully. The compression package is a single-line middleware addition with zero configuration required and proven production stability. It is the lowest-effort, highest-return network optimization available.

---
*This spec was created from ideation and is pending detailed specification.*

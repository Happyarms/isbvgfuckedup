/**
 * Test fixtures with realistic HAFAS departure data for all status states.
 *
 * Each departure object follows the hafas-client response format:
 *   tripId, stop, when, plannedWhen, delay (seconds), cancelled (boolean),
 *   line, direction, platform, plannedPlatform.
 *
 * Status thresholds (from config defaults):
 *   - FINE:     <25% disrupted
 *   - DEGRADED: 25-50% disrupted
 *   - FUCKED:   >50% disrupted
 *   - UNKNOWN:  no data
 *
 * A departure is "disrupted" when cancelled OR delay > 300s (5 min).
 */

// ---------------------------------------------------------------------------
// Helper: build a realistic HAFAS departure object
// ---------------------------------------------------------------------------

const STATIONS = {
  hauptbahnhof: {
    type: 'station',
    id: '900003201',
    name: 'S+U Berlin Hauptbahnhof',
    location: { type: 'location', latitude: 52.525592, longitude: 13.369545 },
    products: { suburban: true, subway: true, tram: true, bus: true, ferry: false, express: true, regional: true },
  },
  alexanderplatz: {
    type: 'station',
    id: '900100003',
    name: 'S+U Alexanderplatz',
    location: { type: 'location', latitude: 52.521508, longitude: 13.411267 },
    products: { suburban: true, subway: true, tram: true, bus: true, ferry: false, express: false, regional: true },
  },
  zoo: {
    type: 'station',
    id: '900023201',
    name: 'S+U Zoologischer Garten',
    location: { type: 'location', latitude: 52.506919, longitude: 13.332711 },
    products: { suburban: true, subway: true, tram: false, bus: true, ferry: false, express: true, regional: true },
  },
  friedrichstr: {
    type: 'station',
    id: '900100001',
    name: 'S+U Friedrichstr.',
    location: { type: 'location', latitude: 52.520268, longitude: 13.387149 },
    products: { suburban: true, subway: true, tram: true, bus: true, ferry: false, express: false, regional: true },
  },
  ostkreuz: {
    type: 'station',
    id: '900120005',
    name: 'S Ostkreuz',
    location: { type: 'location', latitude: 52.502787, longitude: 13.469034 },
    products: { suburban: true, subway: false, tram: false, bus: true, ferry: false, express: false, regional: true },
  },
};

const LINES = {
  s7: {
    type: 'line',
    id: 's7',
    fahrtNr: '12345',
    mode: 'train',
    product: 'suburban',
    public: true,
    name: 'S7',
    symbol: 'S',
    nr: 7,
    metro: false,
    express: false,
    night: false,
    operator: { type: 'operator', id: 's-bahn-berlin-gmbh', name: 'S-Bahn Berlin GmbH' },
  },
  s5: {
    type: 'line',
    id: 's5',
    fahrtNr: '12346',
    mode: 'train',
    product: 'suburban',
    public: true,
    name: 'S5',
    symbol: 'S',
    nr: 5,
    metro: false,
    express: false,
    night: false,
    operator: { type: 'operator', id: 's-bahn-berlin-gmbh', name: 'S-Bahn Berlin GmbH' },
  },
  u2: {
    type: 'line',
    id: 'u2',
    fahrtNr: '22001',
    mode: 'train',
    product: 'subway',
    public: true,
    name: 'U2',
    symbol: 'U',
    nr: 2,
    metro: false,
    express: false,
    night: false,
    operator: { type: 'operator', id: 'bvg', name: 'Berliner Verkehrsbetriebe' },
  },
  u7: {
    type: 'line',
    id: 'u7',
    fahrtNr: '22007',
    mode: 'train',
    product: 'subway',
    public: true,
    name: 'U7',
    symbol: 'U',
    nr: 7,
    metro: false,
    express: false,
    night: false,
    operator: { type: 'operator', id: 'bvg', name: 'Berliner Verkehrsbetriebe' },
  },
  m10: {
    type: 'line',
    id: 'm10',
    fahrtNr: '33010',
    mode: 'train',
    product: 'tram',
    public: true,
    name: 'M10',
    symbol: 'M',
    nr: 10,
    metro: true,
    express: false,
    night: false,
    operator: { type: 'operator', id: 'bvg', name: 'Berliner Verkehrsbetriebe' },
  },
  bus200: {
    type: 'line',
    id: 'bus200',
    fahrtNr: '44200',
    mode: 'bus',
    product: 'bus',
    public: true,
    name: '200',
    symbol: null,
    nr: 200,
    metro: false,
    express: false,
    night: false,
    operator: { type: 'operator', id: 'bvg', name: 'Berliner Verkehrsbetriebe' },
  },
};

let tripCounter = 0;

/**
 * Build a single HAFAS departure object.
 *
 * @param {object} opts
 * @param {object} opts.stop      - Station object from STATIONS
 * @param {object} opts.line      - Line object from LINES
 * @param {string} opts.direction - Destination string
 * @param {number|null} opts.delay - Delay in seconds (null = no real-time data)
 * @param {boolean} [opts.cancelled=false] - Whether the departure is cancelled
 * @param {string} [opts.platform='1'] - Platform number
 * @returns {object} HAFAS departure object
 */
function makeDeparture({ stop, line, direction, delay, cancelled = false, platform = '1' }) {
  tripCounter += 1;
  const base = new Date('2026-01-26T12:00:00+01:00');
  const plannedMs = base.getTime() + tripCounter * 3 * 60 * 1000; // stagger by 3 min
  const plannedWhen = new Date(plannedMs).toISOString();

  let when;
  if (cancelled) {
    when = null;
  } else if (delay !== null && delay !== undefined) {
    when = new Date(plannedMs + delay * 1000).toISOString();
  } else {
    when = plannedWhen;
  }

  return {
    tripId: `1|${10000 + tripCounter}|1|86|26012026`,
    stop,
    when,
    plannedWhen,
    delay: cancelled ? null : (delay ?? null),
    cancelled,
    line,
    direction,
    platform: cancelled ? null : platform,
    plannedPlatform: platform,
  };
}

// ---------------------------------------------------------------------------
// Reset counter before each fixture set to keep tripIds deterministic per set
// ---------------------------------------------------------------------------

function resetCounter() {
  tripCounter = 0;
}

// ---------------------------------------------------------------------------
// FINE departures: <25% disrupted
//   20 departures total, 1 significantly delayed = 5% disrupted
// ---------------------------------------------------------------------------

resetCounter();

export const fineDepartures = [
  // 17 on-time departures (delay = 0 or null)
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '13' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'U Ruhleben', delay: 0, platform: '1' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Rudow', delay: null, platform: '3' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'S+U Warschauer Str.', delay: 0 }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s7, direction: 'S Ahrensfelde', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.u2, direction: 'S+U Pankow', delay: 0, platform: '1' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s7, direction: 'S Potsdam Hbf', delay: null, platform: '4' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s5, direction: 'S Westkreuz', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '7' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '6' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0, platform: 'A' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.bus200, direction: 'Zoologischer Garten', delay: null }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0 }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.m10, direction: 'S+U Warschauer Str.', delay: 0 }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.u2, direction: 'U Ruhleben', delay: 0, platform: '2' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Ahrensfelde', delay: 0, platform: '8' }),

  // 2 minor delays (< 300s threshold, so NOT disrupted)
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Westkreuz', delay: 120, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Clara-Jaschke-Str.', delay: 180 }),

  // 1 significant delay (> 300s) = 1/20 = 5% disrupted → FINE
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s5, direction: 'S Strausberg Nord', delay: 420, platform: '3' }),
];

// ---------------------------------------------------------------------------
// DEGRADED departures: 25-50% disrupted
//   20 departures total, 7 disrupted (5 delayed + 2 cancelled) = 35%
// ---------------------------------------------------------------------------

resetCounter();

export const degradedDepartures = [
  // 12 on-time departures
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '13' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'U Ruhleben', delay: 0, platform: '1' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Rudow', delay: null, platform: '3' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s7, direction: 'S Ahrensfelde', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '4' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s5, direction: 'S Westkreuz', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '7' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0, platform: 'A' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0 }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.bus200, direction: 'Zoologischer Garten', delay: 0 }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '6' }),

  // 1 minor delay (NOT disrupted)
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.m10, direction: 'S+U Warschauer Str.', delay: 240 }),

  // 5 significant delays (> 300s)
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Clara-Jaschke-Str.', delay: 480 }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.u2, direction: 'S+U Pankow', delay: 600, platform: '1' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.u2, direction: 'U Ruhleben', delay: 360, platform: '2' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Ahrensfelde', delay: 540, platform: '8' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Ahrensfelde', delay: 900, platform: '13' }),

  // 2 cancelled
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s5, direction: 'S Strausberg Nord', cancelled: true, platform: '4' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Spandau', cancelled: true, platform: '3' }),
];

// ---------------------------------------------------------------------------
// FUCKED departures: >50% disrupted
//   20 departures total, 15 disrupted (8 delayed + 7 cancelled) = 75%
// ---------------------------------------------------------------------------

resetCounter();

export const fuckedDepartures = [
  // 5 on-time departures
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0, platform: 'A' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.bus200, direction: 'Zoologischer Garten', delay: 0 }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0 }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.m10, direction: 'S+U Warschauer Str.', delay: 60 }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.m10, direction: 'Clara-Jaschke-Str.', delay: 0 }),

  // 8 significant delays (> 300s)
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 720, platform: '13' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Strausberg Nord', delay: 900, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'U Ruhleben', delay: 480, platform: '1' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s7, direction: 'S Ahrensfelde', delay: 1200, platform: '3' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 660, platform: '4' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 540, platform: '7' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s5, direction: 'S Strausberg Nord', delay: 360, platform: '6' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Clara-Jaschke-Str.', delay: 780 }),

  // 7 cancelled
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Rudow', cancelled: true, platform: '3' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.u2, direction: 'S+U Pankow', cancelled: true, platform: '1' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.u2, direction: 'U Ruhleben', cancelled: true, platform: '2' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s5, direction: 'S Westkreuz', cancelled: true, platform: '3' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s5, direction: 'S Strausberg Nord', cancelled: true, platform: '4' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.u7, direction: 'U Rudow', cancelled: true, platform: '2' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Ahrensfelde', cancelled: true, platform: '8' }),
];

// ---------------------------------------------------------------------------
// EMPTY departures: no data → UNKNOWN
// ---------------------------------------------------------------------------

export const emptyDepartures = [];

// ---------------------------------------------------------------------------
// ALL CANCELLED: extreme scenario → 100% disrupted → FUCKED
// ---------------------------------------------------------------------------

resetCounter();

export const allCancelledDepartures = [
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', cancelled: true, platform: '13' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Strausberg Nord', cancelled: true, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'U Ruhleben', cancelled: true, platform: '1' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Rudow', cancelled: true, platform: '3' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s7, direction: 'S Ahrensfelde', cancelled: true, platform: '3' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s7, direction: 'S Potsdam Hbf', cancelled: true, platform: '4' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s5, direction: 'S Westkreuz', cancelled: true, platform: '3' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Potsdam Hbf', cancelled: true, platform: '7' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s5, direction: 'S Strausberg Nord', cancelled: true, platform: '6' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.u2, direction: 'S+U Pankow', cancelled: true, platform: '1' }),
];

// ---------------------------------------------------------------------------
// ALL ON TIME: best-case scenario → 0% disrupted → FINE
// ---------------------------------------------------------------------------

resetCounter();

export const allOnTimeDepartures = [
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '13' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'U Ruhleben', delay: 0, platform: '1' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Rudow', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s7, direction: 'S Ahrensfelde', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '4' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s5, direction: 'S Westkreuz', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '7' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '6' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.u2, direction: 'S+U Pankow', delay: 0, platform: '1' }),
];

// ---------------------------------------------------------------------------
// BOUNDARY: exactly 25% disrupted → above degraded threshold → DEGRADED
//   20 departures, 6 disrupted (5 delayed + 1 cancelled) = 30%
//   Actually for exact 25%: 5 out of 20 = 25%, but threshold is >0.25
//   so exactly 25% is NOT degraded. We need >25%.
//   Use 6/20 = 30% to be clearly in DEGRADED range.
// ---------------------------------------------------------------------------

resetCounter();

export const boundaryDegradedDepartures = [
  // 14 on-time
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '13' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'U Ruhleben', delay: 0, platform: '1' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Rudow', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s7, direction: 'S Ahrensfelde', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s7, direction: 'S Potsdam Hbf', delay: null, platform: '4' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s5, direction: 'S Westkreuz', delay: 0, platform: '3' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '7' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '6' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.u2, direction: 'S+U Pankow', delay: 0, platform: '1' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0, platform: 'A' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.bus200, direction: 'Zoologischer Garten', delay: 0 }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.bus200, direction: 'Michelangelostr.', delay: 120 }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.m10, direction: 'S+U Warschauer Str.', delay: 0 }),

  // 5 significant delays (> 300s)
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Clara-Jaschke-Str.', delay: 480 }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.u2, direction: 'U Ruhleben', delay: 360, platform: '2' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Ahrensfelde', delay: 420, platform: '8' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Ahrensfelde', delay: 600, platform: '13' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s5, direction: 'S Strausberg Nord', delay: 540, platform: '4' }),

  // 1 cancelled
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Spandau', cancelled: true, platform: '3' }),
];

// ---------------------------------------------------------------------------
// BOUNDARY: exactly 50% disrupted → above fucked threshold → FUCKED
//   20 departures, 11 disrupted = 55% (just above 50%)
// ---------------------------------------------------------------------------

resetCounter();

export const boundaryFuckedDepartures = [
  // 9 on-time
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0, platform: 'A' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.bus200, direction: 'Zoologischer Garten', delay: 0 }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.bus200, direction: 'Michelangelostr.', delay: 0 }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.m10, direction: 'S+U Warschauer Str.', delay: 0 }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.m10, direction: 'Clara-Jaschke-Str.', delay: 0 }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s5, direction: 'S Strausberg Nord', delay: 0, platform: '6' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Westkreuz', delay: 120, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'U Ruhleben', delay: 0, platform: '1' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s7, direction: 'S Ahrensfelde', delay: 180, platform: '3' }),

  // 7 significant delays (> 300s)
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 720, platform: '13' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Rudow', delay: 600, platform: '3' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 480, platform: '4' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 540, platform: '7' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.u2, direction: 'S+U Pankow', delay: 900, platform: '1' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.s5, direction: 'S Westkreuz', delay: 360, platform: '3' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Strausberg Nord', delay: 1080, platform: '14' }),

  // 4 cancelled
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.m10, direction: 'Clara-Jaschke-Str.', cancelled: true }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s5, direction: 'S Strausberg Nord', cancelled: true, platform: '4' }),
  makeDeparture({ stop: STATIONS.ostkreuz, line: LINES.s7, direction: 'S Ahrensfelde', cancelled: true, platform: '8' }),
  makeDeparture({ stop: STATIONS.friedrichstr, line: LINES.u2, direction: 'U Ruhleben', cancelled: true, platform: '2' }),
];

// ---------------------------------------------------------------------------
// NULL DELAYS: departures with null delays (no real-time data) → FINE
//   All delays are null, none cancelled → 0% disrupted
// ---------------------------------------------------------------------------

resetCounter();

export const nullDelayDepartures = [
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: null, platform: '13' }),
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s5, direction: 'S Strausberg Nord', delay: null, platform: '14' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u2, direction: 'U Ruhleben', delay: null, platform: '1' }),
  makeDeparture({ stop: STATIONS.alexanderplatz, line: LINES.u7, direction: 'U Rudow', delay: null, platform: '3' }),
  makeDeparture({ stop: STATIONS.zoo, line: LINES.s7, direction: 'S Ahrensfelde', delay: null, platform: '3' }),
];

// ---------------------------------------------------------------------------
// SINGLE departure: edge case with just one departure
// ---------------------------------------------------------------------------

resetCounter();

export const singleDeparture = [
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 0, platform: '13' }),
];

resetCounter();

export const singleDelayedDeparture = [
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', delay: 600, platform: '13' }),
];

resetCounter();

export const singleCancelledDeparture = [
  makeDeparture({ stop: STATIONS.hauptbahnhof, line: LINES.s7, direction: 'S Potsdam Hbf', cancelled: true, platform: '13' }),
];

// ---------------------------------------------------------------------------
// ERROR scenarios: simulate malformed or partial data that the service may
// encounter. These are used by error handling tests.
// ---------------------------------------------------------------------------

/** Simulates an API error response */
export const apiError = new Error('HAFAS request failed: 502 Bad Gateway');
apiError.code = 'HAFAS_502';

/** Simulates a timeout error */
export const timeoutError = new Error('Request timed out after 5000ms');
timeoutError.code = 'ABORT_ERR';

/** Departures with unexpected data shapes (missing fields) */
export const malformedDepartures = [
  { tripId: '1|99901|1|86|26012026' },                     // missing all fields
  { tripId: '1|99902|1|86|26012026', delay: 'not-a-number' }, // wrong type
  { tripId: '1|99903|1|86|26012026', cancelled: null },     // null cancelled
  { tripId: '1|99904|1|86|26012026', delay: 0 },           // minimal valid
];

// ---------------------------------------------------------------------------
// Exported station & line data for use in other test setups
// ---------------------------------------------------------------------------

export { STATIONS, LINES, makeDeparture };

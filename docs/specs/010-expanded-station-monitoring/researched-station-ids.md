# VBB Station IDs Research

## Current Stations (4)
1. **Berlin Hauptbahnhof** - `900003201`
2. **Alexanderplatz** - `900100003`
3. **Zoologischer Garten** - `900023201`
4. **Friedrichstrasse** - `900100001`

## New Stations Researched (6)

### 5. Potsdamer Platz
- **VBB ID**: `900100020`
- **Full ID**: `de:11000:900100020`
- **Name**: S+U Potsdamer Platz Bhf (Berlin)
- **Services**: S-Bahn, U-Bahn, Bus, Regional
- **Location**: Central Berlin
- **Verified**: ✅ https://v6.vbb.transport.rest/stops/900100020/departures

### 6. Ostkreuz
- **VBB ID**: `900120003`
- **Full ID**: `de:11000:900120003`
- **Name**: S Ostkreuz Bhf (Berlin)
- **Services**: S-Bahn, Regional, Bus
- **Location**: East Berlin
- **Coordinates**: 52.503116°N, 13.469221°E
- **Verified**: ✅ https://v6.vbb.transport.rest/stops/900120003/departures

### 7. Südkreuz
- **VBB ID**: `900058101`
- **Full ID**: `de:11000:900058101`
- **Name**: S Südkreuz Bhf (Berlin)
- **Services**: S-Bahn, Regional, Bus
- **Location**: South Berlin
- **Coordinates**: 52.475501°N, 13.365548°E
- **Verified**: ✅ https://v6.vbb.transport.rest/stops/900058101/departures

### 8. Gesundbrunnen
- **VBB ID**: `900007102`
- **Full ID**: `de:11000:900007102`
- **Name**: S+U Gesundbrunnen Bhf (Berlin)
- **Services**: S-Bahn, U-Bahn, Bus, Regional
- **Location**: North Berlin
- **Verified**: ✅ https://v6.vbb.transport.rest/stops/900007102/departures

### 9. Warschauer Strasse
- **VBB ID**: `900120004`
- **Full ID**: `de:11000:900120004`
- **Name**: S+U Warschauer Str. (Berlin)
- **Services**: S-Bahn, U-Bahn, Tram, Bus
- **Location**: East Berlin
- **Coordinates**: 52.505768°N, 13.449157°E
- **Verified**: ✅ https://v6.vbb.transport.rest/stops/900120004/departures

### 10. Spandau
- **VBB ID**: `900029101`
- **Full ID**: `de:11000:900029101`
- **Name**: S Spandau Bhf (Berlin)
- **Services**: S-Bahn, U-Bahn, Bus, Regional
- **Location**: West Berlin
- **Verified**: ✅ https://v6.vbb.transport.rest/stops/900029101/departures

## Geographic Distribution

✅ **Central**: Hauptbahnhof, Alexanderplatz, Potsdamer Platz, Friedrichstrasse
✅ **East**: Ostkreuz, Warschauer Strasse
✅ **West**: Zoologischer Garten, Spandau
✅ **North**: Gesundbrunnen
✅ **South**: Südkreuz

## Total Stations: 10

All station IDs have been verified to work with the VBB Transport REST API v6:
`https://v6.vbb.transport.rest/stops/{id}/departures`

## API Rate Limits
- Current limit: 100 requests/minute
- With 10 stations and 60s refresh interval: ~10 requests/minute
- **Status**: Well under limit ✅

## Research Sources
- VBB Transport REST API v6: https://v6.vbb.transport.rest/api.html
- Station search: https://v6.vbb.transport.rest/locations?query={name}
- VBB Stations GitHub: https://github.com/derhuerst/vbb-stations

## ID Format Notes
- The VBB API returns full IDs in format: `de:11000:{numeric_id}`
- For the departures API, only the numeric portion is needed
- Example: `de:11000:900100020` → use `900100020`

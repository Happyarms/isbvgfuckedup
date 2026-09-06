# Expanded Station Monitoring

Increase the number of monitored stations from 4 (Hauptbahnhof, Alexanderplatz, Zoo, Friedrichstrasse) to include additional major transit hubs like Potsdamer Platz, Ostkreuz, Südkreuz, Gesundbrunnen, and Warschauer Strasse.

## Rationale
Currently only monitoring 4 stations limits the accuracy of system-wide status. BVG.de shows inaccurate countdown times at individual stations (pain-2-2). By aggregating more stations, we provide a more representative system-wide view that users can trust.

## User Stories
- As a commuter, I want status based on many stations so that I get an accurate picture of system health
- As a user in East Berlin, I want stations near me monitored so that the status reflects my area

## Acceptance Criteria
- [ ] At least 10 major stations are monitored
- [ ] Stations are geographically distributed across Berlin
- [ ] API rate limits are respected (100 req/min)
- [ ] Status calculation weights all stations appropriately
- [ ] Configuration allows easy addition of new stations

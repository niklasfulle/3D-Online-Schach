# 3D Online-Schach – Roadmap und GitHub-Backlog

## Ziel

Eine browserbasierte 3D-Schachplattform, bei der der Server die autoritative Instanz für Regeln, Spielzustand und Züge ist.

## Architekturleitlinie

```text
Chess Core → Game Server → Shared State → Client State → Three.js Rendering
```

Three.js ist ausschließlich für Darstellung und Interaktion zuständig. Die Schachregeln bleiben unabhängig vom Frontend und werden serverseitig validiert.

## MVP-Ziel

Zwei Spieler können über einen privaten Game-Code in zwei Browsern eine vollständige Partie spielen.

Der MVP umfasst:

- 3D-Schachbrett und Figuren
- legale Züge und Hervorhebungen
- Schach, Schachmatt und Patt
- Rochade, En Passant und Bauernumwandlung
- Animationen
- private Online-Spielräume
- serverseitige Zugvalidierung
- WebSocket-Synchronisierung
- Reconnect und State-Sync
- Aufgabe und Ergebnisanzeige

Nicht Teil des MVP: Nutzerkonten, Rating, Matchmaking, Chat, Zuschauer, Replays, Stockfish und Skins.

## Meilensteine

### M1 – Projektbasis

Monorepo, TypeScript, React, Vite, Three.js, Server-Grundgerüst, Tests, Linting und Formatierung.

Abschlusskriterien:

- `pnpm build` funktioniert
- `pnpm test` funktioniert
- `pnpm lint` funktioniert
- Client und Server starten lokal

### M2 – 3D-Brett und Interaktion

3D-Brett, Figuren, Kamera, Beleuchtung, Koordinaten-Mapping, Raycasting und Feld-Highlighting.

Abschlusskriterien:

- alle 32 Figuren stehen korrekt
- Felder lassen sich auswählen
- Board-Perspektive kann angepasst werden
- Figuren können visuell bewegt werden

### M3 – Chess Core und lokale Partie

Integration von `chess.js`, Spielzustand, legale Züge, Schachregeln, Animationen, Zugliste und Promotion-UI.

Abschlusskriterien:

- vollständige lokale Partie spielbar
- Rochade, En Passant und Promotion funktionieren
- Schach, Schachmatt, Patt und Remis werden erkannt
- Chess-Core-Tests decken kritische Regeln ab

### M4 – Online-Multiplayer-MVP

Fastify, Socket.IO, Spielräume, Game-Codes, serverseitige Validierung und synchronisierte Züge.

Abschlusskriterien:

- zwei Browser können einer privaten Partie beitreten
- der Server entscheidet über gültige Züge
- illegale oder nicht autorisierte Züge werden abgelehnt
- beide Clients erhalten denselben Spielzustand

### M5 – Spieluhr, Reconnect und Stabilität

Serverautoritative Uhr, Zeitkontrollen, Timeout, Disconnect-Verhalten, Reconnect und vollständiger State-Sync.

Abschlusskriterien:

- mindestens `5+0` und `5+3` funktionieren
- Timeout beendet die Partie korrekt
- Reconnect stellt FEN, Züge und Uhr wieder her
- doppelte oder parallele Zuganfragen verursachen keinen inkonsistenten Zustand

### M6 – Persistenz

PostgreSQL, ORM, gespeicherte Spiele und Züge, Ergebnisse sowie PGN-Export.

Abschlusskriterien:

- abgeschlossene Partien werden gespeichert
- Spielhistorie kann geladen werden
- PGN kann exportiert werden
- Datenbankmigrationen sind reproduzierbar

### M7 – Plattform-Erweiterungen

Nutzerkonten, Lobby, Matchmaking, Rating, Zuschauer, Replays, Analyse und visuelles Polishing.

Dieser Meilenstein startet erst nach einem stabilen MVP.

## Ticket-Reihenfolge

### Grundlage

1. Monorepo und Workspace-Struktur einrichten
2. TypeScript-, Linting-, Formatting- und Test-Tooling einrichten
3. Client mit React, Vite und React Three Fiber starten
4. Server mit Fastify und TypeScript starten
5. Shared-Typen und WebSocket-Event-Verträge definieren

### 3D-Frontend

6. 8×8-Schachbrett rendern
7. `squareToWorld()` und World-to-Square-Mapping implementieren
8. Figuren als GLTF/GLB oder MVP-Platzhalter laden
9. Kamera, Licht und Schatten einrichten
10. Raycasting und Figuren-Auswahl implementieren
11. Legale Zielfelder hervorheben
12. Zug- und Capture-Animationen implementieren

### Chess Core

13. `chess.js` integrieren
14. GameState-, Move-, Square- und Color-Typen definieren
15. FEN- und PGN-Unterstützung ergänzen
16. Lokale Züge ausführen und Zugliste anzeigen
17. Promotion-Dialog implementieren
18. Spielende und Aufgabe behandeln
19. Chess-Core-Regeltests ergänzen

### Multiplayer

20. Spiel erstellen und Game-Code generieren
21. Spiel per Game-Code beitreten
22. Spielerfarben und Spielstatus verwalten
23. `move:request` serverseitig validieren
24. Akzeptierte Züge an beide Clients broadcasten
25. Spielende und Ergebnis synchronisieren
26. Game-Locks oder per-Game-Queue gegen Race Conditions einführen

### Stabilität

27. Serverautoritative Uhr implementieren
28. Timeout und Zeitkontrollen ergänzen
29. Disconnect- und Reconnect-Flow implementieren
30. FEN-, Zuglisten- und Uhr-State beim Reconnect synchronisieren
31. Integrations- und WebSocket-Tests ergänzen

### Persistenz und Zukunft

32. PostgreSQL und ORM einrichten
33. Games und Moves speichern
34. PGN-Export und Spielhistorie ergänzen
35. Nutzerkonten vorbereiten
36. Lobby und Matchmaking vorbereiten

## Technische Entscheidungen

- Frontend: React + TypeScript + Vite
- 3D: Three.js + React Three Fiber + drei
- Regeln: `chess.js`
- Backend: Node.js + TypeScript + Fastify
- Realtime: Socket.IO
- Datenbank: PostgreSQL mit Prisma
- Live-Zustand im MVP: In-Memory
- Später: Redis für Presence, Pub/Sub und skalierte WebSockets
- Deployment: Docker Compose

## Definition of Done für jedes Ticket

- Änderung ist in der passenden Schicht umgesetzt
- relevante Tests sind vorhanden oder aktualisiert
- `pnpm lint`, `pnpm test` und `pnpm build` bleiben grün
- WebSocket- oder Zustandsänderungen sind dokumentiert
- Ticket enthält eine überprüfbare Abschlussbedingung

## Fortschritt

### Abgeschlossen

- M1 – Projektbasis: Monorepo, Tooling, Client-Grundgerüst, Server-Grundgerüst und Shared-Verträge
- M2 – 3D-Brett und Interaktion: Brett, Koordinaten-Mapping, MVP-Figuren, Kamera, Beleuchtung und Raycasting-Auswahl

### In Arbeit

- M3 – Chess Core und lokale Partie: `chess.js`, legale Züge, Sonderregeln, lokale Zugausführung, Aufgabe-UI und Regeltests sind umgesetzt
- M4 – Online-Multiplayer-MVP: GameManager, private Game-Codes, Join-/Farbzuweisung, serverseitige Move-Validierung, Socket.IO-Broadcast, Game-Ende-Events und per-Game-Queue sind umgesetzt
- M5 – Spieluhr, Reconnect und Stabilität: Uhr, Timeout-Events und autorisierter FEN-/Zug-/Clock-State-Sync sind umgesetzt
- M6 – Persistenz: Prisma-Schema, PostgreSQL-Compose-Setup, `.env.example` und zentraler Prisma-Client sind eingerichtet; Game-/Move-Repositories und Migrationen folgen als nächster Schritt

### Als Nächstes

- M6 – Persistenz: PostgreSQL, Spiele/Züge und PGN-Export

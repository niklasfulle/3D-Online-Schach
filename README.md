# 3D Online-Schach

Browserbasierte 3D-Schachplattform mit React, Three.js, Fastify, Socket.IO, PostgreSQL und Prisma.

## Aktueller Stand

Der MVP-Unterbau ist umgesetzt:

- 3D-Schachbrett mit Figuren, Kamera und Auswahl
- lokale Schachregeln mit `chess.js`
- private Online-Spielräume über Game-Codes
- serverseitige Zugvalidierung und Socket.IO-Synchronisierung
- Spieluhr, Timeout, Reconnect und State-Sync
- Prisma-Persistenz für Games, Moves, FEN, Uhrwerte und Ergebnisse
- versionierte PostgreSQL-Initialmigration

PGN-Export und ladbare Spielhistorie sind als nächster Schritt in GitHub-Ticket [#29](https://github.com/niklasfulle/3D-Online-Schach/issues/29) aktiv.

## Voraussetzungen

- Node.js
- pnpm 11
- Docker Desktop für PostgreSQL

## Entwicklung starten

Abhängigkeiten installieren:

```bash
pnpm install
```

PostgreSQL starten:

```bash
docker compose up -d postgres
```

Prisma Client generieren und Migration ausführen:

```bash
pnpm --filter @chess3d/server db:generate
pnpm --filter @chess3d/server exec prisma migrate deploy
```

Danach Client und Server mit den vorhandenen Workspace-Skripten starten:

```bash
pnpm dev
```

Die lokale Datenbankverbindung wird über `DATABASE_URL` konfiguriert. Eine Vorlage liegt in [.env.example](.env.example).

## Qualitätssicherung

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

## Projektstruktur

```text
apps/client              React-, Vite- und 3D-Frontend
apps/server              Fastify-, Socket.IO- und Prisma-Backend
apps/server/prisma       Prisma-Schema und Datenbankmigrationen
packages/chess-core      Schachregeln und Chess-State
packages/shared         Gemeinsame Typen und Verträge
```

Die ausführliche Planung steht in [3d_online_schach_roadmap.md](3d_online_schach_roadmap.md). GitHub-Milestones und Tickets sind die aktive Arbeitsliste.

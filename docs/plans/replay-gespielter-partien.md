# Plan: Replay gespielter Partien

## Ziel

Spieler können eine beendete eigene Partie aus der Spielhistorie in einer
schreibgeschützten Replay-Ansicht erneut durchgehen. Die Ansicht ist direkt
über einen stabilen Link erreichbar und zeigt exakt die gespeicherte Zugfolge.

## Umfang

- Neue, authentifizierte Replay-Ressource für beendete Partien der eigenen
  Spielhistorie.
- Direkte Client-Route `/replay/:code`.
- Ein klar beschrifteter Replay-Einstieg in der Detailansicht einer Partie.
- Navigation zum ersten, vorherigen, nächsten und letzten Zug; die ausgewählte
  SAN-Notation und die dazugehörige Stellung sind sichtbar.
- Vollständig schreibgeschützte Ansicht: keine Züge, kein Chat und keine
  Spielaktionen.
- Deutsche und englische Texte sowie verständliche Lade-, Leer- und
  Fehlerzustände.

## Nicht im Umfang

- Engine-Analyse, Bewertung oder Varianten.
- Teilen eines privaten Replays mit Dritten.
- Bearbeiten der gespeicherten Zugfolge.

## Architektur

Die bisherige persönliche Historienliste enthält bereits die benötigten
Zugdaten. Für Deep Links kommt eine dedizierte Replay-Ressource hinzu, damit
der Server Zugriff, abgeschlossenes Ergebnis und die persistierte Zugfolge
zentral prüft. Der Client lädt diese Ressource für `/replay/:code` und leitet
die FEN-Stellung ausschließlich aus dem Anfangs-FEN und dem gewählten
Speicherzug ab.

## TDD-Schnittstellen

1. **HTTP:** `GET /games/:code/replay` liefert nur einem authentifizierten
   Teilnehmer einer beendeten Partie die Replay-Daten. Nicht angemeldete,
   fremde, unbekannte und noch laufende Partien erhalten einen passenden
   Fehlerstatus.
2. **Client-Route:** Das Öffnen von `/replay/:code` lädt die Replay-Daten;
   die Navigationsaktionen ändern den sichtbaren Zug und die Brettstellung,
   aber senden niemals einen Spielzug.
3. **Historie:** Der Replay-Button der ausgewählten eigenen Partie führt auf
   die direkte Replay-Route und bleibt mit Tastatur und Screenreader eindeutig
   bedienbar.

## Umsetzung in Tickets

1. Geschützte Replay-API und persistierte Zugdaten bereitstellen.
2. Replay-Routing und schreibgeschützte Brettansicht implementieren.
3. Historien-Einstieg, Lokalisierung und Browser-Tests ergänzen.

## Abnahme

- Eine beendete Partie aus `/history` lässt sich per Button öffnen und per
  `/replay/:code` erneut aufrufen.
- Die Zugnavigation zeigt für jeden Schritt die gespeicherte Stellung und
  markiert den aktuellen Zug.
- Die Ansicht kann keine Partie verändern.
- Zugriffe auf fremde oder aktive Partien sind nicht möglich und verständlich
  behandelt.
- Server-, Client- und Browser-Tests decken die drei TDD-Schnittstellen ab.

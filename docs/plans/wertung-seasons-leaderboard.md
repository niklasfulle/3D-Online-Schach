# Ranked-Wertung, achtwöchige Seasons und Leaderboards – Tickets

## Ziel

Ranked-Partien verändern eine nachvollziehbare Glicko-2-Saisonwertung. Jede Season dauert exakt acht Wochen. Das aktuelle Leaderboard zeigt die Platzierung der laufenden Season; beendete Seasons bleiben mit ihrer endgültigen Platzierung abrufbar. Casual- und Fernpartien sind nicht gewertet.

## Fachliche Regeln für die Umsetzung

- Jede Season beginnt an einem Sonntag um 00:00 Uhr in der Zeitzone `Europe/Berlin` und endet acht Kalenderwochen später am Sonntag um 00:00 Uhr. Das Startdatum von Season 1 muss ein Sonntag sein. Die Grenzzeitpunkte werden als UTC-Instants gespeichert; die Intervalle sind halboffen (`start <= zeitpunkt < ende`) und schließen lückenlos aneinander an. Durch Sommerzeitwechsel kann die tatsächliche Dauer von 56 × 24 Stunden abweichen. Die Oberfläche zeigt Beginn und Ende in der Sprache und Zeitzone des Users an.
- Die **Saisonwertung** ist unabhängig von vorherigen Seasons. Vorschlag: Jeder User startet in jeder Season mit 1200 Punkten, RD 350 und Volatilität 0,06. Die erste Season wertet frühere Partien nicht rückwirkend. Diese Reset-Regel ist vor der Implementierung fachlich zu bestätigen; falls stattdessen eine fortlaufende Wertung gewünscht ist, ändern sich Datenmodell und Tickets RW-01/RW-05.
- Eine Ranked-Partie zählt zur Season ihres **unveränderlich gespeicherten Abschlusszeitpunkts**. Läuft sie über die Season-Grenze, zählt sie zur neuen Season. Eine Partie, die genau zum Endzeitpunkt abgeschlossen wird, zählt zur folgenden Season.
- Eine beendete Season erhält eine unveränderliche Abschlussplatzierung. Spätere Requests, Wiederholungen und Server-Neustarts dürfen diese nicht ändern.
- Für eine direkte Rückmeldung wird zunächst jede abgeschlossene Ranked-Partie als eigener Glicko-2-Wertungszeitraum verarbeitet. Die Wahl wird dokumentiert und anhand der Entwicklung geprüft; die Originalbeschreibung empfiehlt größere Wertungszeiträume.
- Vorläufige Platzierung: Nur User mit mindestens einer abgeschlossenen Ranked-Partie der Season erscheinen im Leaderboard. Sortiert wird nach **ungerundeter** Saisonwertung absteigend, bei Gleichstand nach Siegen absteigend und dann nach stabiler User-ID. Die angezeigte Wertung wird gerundet. Kein Aktivitäts- oder Kaufvorteil verändert den Score.
- Die bestehende `User.rating`-Anzeige wird während der Migration aus der aktiven Saisonwertung gespeist; die saisonale Wertung und ihre Ereignisse sind anschließend die maßgebliche Datenquelle.

## Tickets

### RW-01 – Saisonales Wertungsmodell und Migration

- [x] Season mit Beginn, Ende, Status und eindeutiger Reihenfolge speichern; pro User und Season genau einen Wertungsstand mit Rating, RD, Volatilität sowie Partien/Siegen/Remis/Niederlagen.
- [x] Wertungsereignisse mit Partie, Season, User, Ergebnis und Werten vor/nach der Partie speichern; `(gameId, userId)` eindeutig machen.
- [x] Bestehende User ohne Verlust ihrer Profile migrieren; vergangene Partien nicht stillschweigend nachbewerten.
- [x] Die Herkunft der bisher globalen `User.rating`-Anzeige und den Wechsel auf die aktive Saisonwertung festlegen.

**Abnahme:** Schema und Migration sind reproduzierbar; ein User kann mehrere voneinander getrennte Seasons besitzen, aber nur einen Stand je Season. Bestehende Anmeldungen und Profile funktionieren weiter.

### RW-02 – Glicko-2 als reine, getestete Berechnung

- [x] Rating, RD und Volatilität nach der akzeptierten [Glicko-2-Entscheidung](../adr/0002-matchmaking-and-rating.md) berechnen; beide Spieler ausschließlich aus ihren Werten **vor** der Partie aktualisieren.
- [x] Parameter (insbesondere `τ` und Rundung) zentral dokumentieren. RD bei Inaktivität nach einem festgelegten Wertungszeitraum erhöhen, ohne die sichtbare Wertung allein wegen Inaktivität zu ändern.
- [x] Mit dem veröffentlichten Rechenbeispiel von Mark Glickman sowie Sieg, Niederlage und Remis testgetrieben verifizieren.

**Abnahme:** Der Rechenkern benötigt weder Datenbank noch Uhr; dieselben Eingaben ergeben dieselben Ergebnisse. Ungültige und nicht endliche Werte werden abgefangen.

### RW-03 – Verlässlicher, einmaliger Partieabschluss

- [x] Matt, Patt/Remis, Aufgabe und Zeitüberschreitung auf denselben serverseitigen Abschlussweg führen; bei Zeitüberschreitung das Ergebnis dauerhaft speichern.
- [x] `finishedAt` beim ersten Abschluss festschreiben und bei späterem Speichern nicht überschreiben.
- [x] Ergebnis, beide Wertungsänderungen und Ereignisse atomar speichern; doppelte Requests, parallele Abschlusswege und Wiederholung nach Neustart dürfen keine zweite Wertung erzeugen.
- [x] Bei fehlgeschlagener Persistenz einen wiederholbaren, erkennbaren Fehlerzustand statt einer halb gewerteten Partie hinterlassen.

**Abnahme:** Jede abgeschlossene Ranked-Partie hat genau ein Ergebnis, einen Abschlusszeitpunkt und genau zwei Wertungsereignisse. Casual und Fernpartien erzeugen keine Wertungsereignisse.

### RW-04 – Acht-Wochen-Lebenszyklus

- [x] Erste Season mit konfiguriertem Sonntag, 00:00 Uhr `Europe/Berlin`, erzeugen; Folge-Seasons jeweils acht Kalenderwochen später am Sonntag starten. Lokale Grenzen einmalig in UTC-Instants auflösen und speichern. Übergänge müssen nach Prozess-Neustart und bei verspätetem Job nachholbar sein.
- [x] Zuordnung per `finishedAt` und die exakte Grenzsekunde absichern; ein Abschluss und der Season-Wechsel dürfen sich nicht gegenseitig überholen. Sommer- und Winterzeitwechsel mit festen Testdaten prüfen.
- [x] Beim Abschluss alle zugehörigen Wertungsereignisse fertig verarbeiten und die endgültige Rangliste als unveränderlichen Snapshot sichern. Danach die nächste Season aktiv halten.

**Abnahme:** Zu jedem Zeitpunkt ab Start existiert genau eine aktive Season. Jede beginnt lokal am Sonntag um 00:00 Uhr und endet acht Kalenderwochen später am Sonntag um 00:00 Uhr. Eine Partie vor/nach/an der Grenze landet in genau der richtigen Season, auch bei Sommerzeitwechseln. Das Archiv ändert sich nach Abschluss nicht mehr.

### RW-05 – Aktuelles Leaderboard als API

- [x] Geschützte, paginierte Lese-API für Season-Metadaten, Platz, Username, gerundete Wertung, Spiele, Siege, Remis und Niederlagen bereitstellen.
- [x] Stabile Sortierung und eigene Platzierung auch außerhalb der ersten Seite liefern; User ohne gewertete Partie nicht als platzierte Teilnehmer ausgeben.
- [x] Fehlende/noch nicht gestartete Season und leeres Leaderboard verständlich behandeln.

**Abnahme:** Gleichstände, Seitengrenzen und die eigene Platzierung sind deterministisch; die API gibt keine privaten Profildaten preis.

### RW-06 – Vergangene Seasons und Abschlussplatzierungen als API

- [x] Beendete Seasons mit Zeitraum und Teilnehmerzahl auflisten und je Season den unveränderlichen Leaderboard-Snapshot paginiert abrufen.
- [x] Historische Links bleiben stabil; Usernamen und angezeigte Werte entsprechen der beim Abschluss gesicherten Platzierung.
- [x] Ungültige Season-ID, noch laufende Season und leere abgeschlossene Season korrekt behandeln.

**Abnahme:** Ein historisches Leaderboard liefert nach neuen Partien, Folgeseasons und Neustarts dieselben Plätze und Werte.

### RW-07 – Navigation und Leaderboard-Oberfläche

- [x] Einen eigenen Nav-Punkt „Leaderboard“ mit aktueller Season, verbleibender Laufzeit, eigener Position und paginierter Rangliste ergänzen.
- [x] Von dort eine Übersicht vergangener Seasons und eine Detailansicht ihrer Abschlussplatzierungen anbieten; jede Ansicht erhält eine direkte URL.
- [x] Deutsch/Englisch, Lade-/Leer-/Fehlerzustände, mobile Darstellung, Tastaturbedienung und verständliche Tabellenüberschriften ergänzen.

**Abnahme:** Ein User kann vom aktuellen Leaderboard in eine abgeschlossene Season und über einen Direktlink zurückkehren, ohne dass Live-Daten historische Plätze verändern.

### RW-08 – Profil, Verlauf und Kompatibilität

- [x] Die bisher künstlich flache Rating-Historie durch echte Wertungsereignisse der gewählten Season ersetzen; die sichtbare Wertung nach Abschluss aktualisieren.
- [x] In Profil und Spielhistorie saisonale Wertungsänderungen anzeigen; Casual und Fernpartien klar als ungewertet kennzeichnen und Fernpartien statistisch getrennt von Casual behandeln.
- [x] Bestehende Profil-, Freunde- und Auth-Ansichten auf die maßgebliche aktive Saisonwertung umstellen.

**Abnahme:** Eine gewertete Partie erzeugt genau einen nachvollziehbaren Punkt im Verlauf; eine ungewertete Partie verändert weder Wertung noch Kurve.

### RW-09 – Durchgängige TDD-Abnahme und Rollout

- [x] Die kritischen Schnitte **Glicko-2-Berechnung**, **Partieabschluss**, **Season-Grenze**, **Leaderboard-API** und **Client-Navigation** jeweils mit einem fehlschlagenden Verhaltenstest beginnen und dann implementieren.
- [x] Integrationstests für Matt, Remis, Aufgabe, Timeout, doppelte/gleichzeitige Verarbeitung, Neustart, Season-Grenze einschließlich Sommerzeitwechsel, Pagination und Archiv-Unveränderlichkeit ergänzen.
- [x] Migration auf Testdaten, Typecheck, Server-/Client-Tests und Build ausführen; vor Aktivierung einen konkreten Sonntag als Startdatum für Season 1 setzen.

**Abnahme:** Alle genannten Fälle sind grün; die erste Season startet erst zum konfigurierten Zeitpunkt und bisherige Partien bleiben unverändert.

## Reihenfolge und Abhängigkeiten

`RW-01 → RW-02 → RW-03 → RW-04 → RW-05/RW-06 → RW-07/RW-08 → RW-09`

RW-09 begleitet die Umsetzung ab dem ersten Ticket; es ist kein nachträglicher Testblock. RW-05 und RW-06 können nach RW-04 parallel entstehen. Die Reset-Regel und das Startdatum der ersten Season sind vor der Migration bzw. Aktivierung zu bestätigen.

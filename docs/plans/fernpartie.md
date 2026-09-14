# Fernpartie – Tickets und Akzeptanzkriterien

## Ziel

Eine Fernpartie ist eine unbegrenzte Partie zwischen zwei befreundeten Usern. Sie
ist nicht Teil der öffentlichen Lobby und wird ausschließlich über eine Einladung
gestartet.

## Tickets

- [x] FP-01 – Modus `correspondence` in Shared Types und GameManager ergänzen
- [x] FP-02 – Zeitkontrolle deaktivieren und Wartepartien nicht automatisch verfallen lassen
- [x] FP-03 – Fernpartien aus der öffentlichen Lobby ausblenden
- [x] FP-04 – Einladung auf bestätigte Freunde beschränken und Beitritt prüfen
- [x] FP-05 – Zugbenachrichtigung erzeugen, wenn der Gegner nicht in der Partie aktiv ist
- [x] FP-06 – UI, Übersetzungen und Benachrichtigungs-Polling ergänzen
- [x] FP-07 – Kritische Regeln mit TDD absichern

## Akzeptanzkriterien

1. Beide Spieler können beliebig lange zwischen Zügen warten; keine Uhr und kein
   Timeout beendet die Partie.
2. Eine Fernpartie erscheint nicht in der öffentlichen Lobby.
3. Nur ein bestätigter Freund kann eingeladen werden. Ein Nutzer ohne passende
   Einladung erhält beim Beitritt keinen Zugriff.
4. Nach einem Zug erhält der Gegner eine Benachrichtigung, wenn er nicht aktiv im
   Partie-Raum verbunden ist.
5. Ein Zug durch Schachmatt, Patt oder Aufgabe beendet die Partie weiterhin normal.

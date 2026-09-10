# Casual ohne Wertung und Glicko-2 für Ranked

**Status:** accepted

Die Lobby unterscheidet Casual- und Ranked-Partien bereits vor dem Matching. Eine Matchmaking-Warteschlange führt nur Spieler mit gleicher Variante und Zeitkontrolle zusammen; Ranked erweitert die Suche zunächst innerhalb eines Ratingbands und darf dieses Band kontrolliert vergrößern. Casual verändert keine Wertung. Für Ranked wird Glicko-2 gewählt, weil die zusätzliche Ratingunsicherheit neue oder inaktive User besser abbildet als ein reines Elo-Modell; nach außen wird die Wertung als gerundete Zahl angezeigt.

Die Queue kennt die Zustände `queued`, `matched`, `cancelled` und `expired`. Ein Match wird erst nach einer serverseitigen Reservierung beider Spieler als gestartet betrachtet, damit doppelte Zuordnungen und Race Conditions ausgeschlossen bleiben.

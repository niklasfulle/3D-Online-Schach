# 3D Online-Schach Kontext

Dieses Glossar beschreibt die fachlichen Begriffe der Plattform. Es trennt die Identität eines Kontos von der Teilnahme an einer einzelnen Partie und hält die späteren Online-Funktionen sprachlich konsistent.

## Identität und Partie

**User**:
Eine dauerhaft bekannte Plattformidentität mit Profil und optionaler Wertung.
_Avoid_: Account, Spieler

**Gast**:
Eine nicht authentifizierte Person mit nur temporärer Sitzungsidentität.
_Avoid_: anonymer User

**Spieler**:
Eine User- oder Gastidentität, die einer konkreten Partie als Weiß oder Schwarz zugeordnet ist.
_Avoid_: User, Teilnehmerkonto

**Partie**:
Eine einzelne Schachinstanz mit zwei Spielern, Zeitkontrolle, Zügen und Ergebnis.
_Avoid_: Match, Spielrunde

## Plattformbetrieb

**Freund**:
Ein User mit einer angenommenen Freundschaftsbeziehung zu einem anderen User; die Freundesliste zeigt zusätzlich die aktuelle Online-Präsenz.
_Avoid_: Follower

**Freundschaftsanfrage**:
Eine gerichtete, ausstehende Anfrage zwischen zwei Usern, die angenommen, abgelehnt oder vom Absender zurückgezogen werden kann.
_Avoid_: Einladung

**Session**:
Eine serverseitige, zeitlich begrenzte Authentifizierung eines Users über ein HttpOnly-Cookie.
_Avoid_: Login-Token im Browser

**Lobby**:
Die öffentliche Auswahl wartender Partien und ihrer Spielbedingungen.
_Avoid_: Raumliste

**Matchmaking-Warteschlange**:
Eine geordnete Menge von Spielern, die nach Modus, Variante, Zeitkontrolle und Wertungsbereich zusammengeführt werden sollen.
_Avoid_: Lobby

**Casual-Partie**:
Eine Partie ohne Auswirkung auf die Wertung.
_Avoid_: unbewertetes Match

**Ranked-Partie**:
Eine Partie, deren bestätigtes Ergebnis in die Wertung einfließt.
_Avoid_: kompetitives Spiel

**Zuschauer**:
Eine lesende Person einer laufenden oder beendeten Partie ohne Zug- oder Chatberechtigung.
_Avoid_: dritter Spieler

**Replay**:
Eine zeitlich navigierbare Ansicht der bereits gespeicherten Zugfolge einer Partie.
_Avoid_: Historie (Historie bezeichnet die Rohdaten, Replay die Ansicht)

**Analyse**:
Eine von der laufenden Partie getrennte Bewertung einer Stellung durch eine Engine.
_Avoid_: Zughilfe

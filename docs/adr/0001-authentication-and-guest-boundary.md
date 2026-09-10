# Lokale Konten mit klarer Gastgrenze

**Status:** accepted

Für den aktuellen Multiplayer-MVP werden Konten mit Username, optionaler E-Mail-Adresse und einem gesalzenen Passwort-Hash registriert; die Authentifizierung läuft über serverseitige Session-Cookies. Eine spätere OIDC-Anbindung bleibt als Migrationsoption offen, ist aber keine Voraussetzung für Lobby und Freundesliste. Gastpartien erhalten nur eine temporäre Sitzungsidentität und werden nicht automatisch einem später angelegten User zugeordnet. Eine spätere, explizit bestätigte Übernahme kann über einen einmaligen Claim-Token erfolgen.

Damit bleiben Gastpartien ohne Login möglich, während User-Profile, gespeicherte Historie und Wertungen an eine stabile Plattformidentität gebunden werden. Die vorhandene optionale Spielerreferenz in gespeicherten Partien kann beide Fälle abbilden.

# OIDC-basierte Konten mit klarer Gastgrenze

**Status:** accepted

Konten werden künftig über einen provider-agnostischen OIDC-Login und eine serverseitige Session-Cookie-Sitzung authentifiziert; eigene Passwortspeicherung ist für die erste Kontoversion nicht Teil des Produkts. Gastpartien erhalten nur eine temporäre Sitzungsidentität und werden nicht automatisch einem später angelegten User zugeordnet. Eine spätere, explizit bestätigte Übernahme kann über einen einmaligen Claim-Token erfolgen.

Damit bleiben Gastpartien ohne Login möglich, während User-Profile, gespeicherte Historie und Wertungen an eine stabile Plattformidentität gebunden werden. Die vorhandene optionale Spielerreferenz in gespeicherten Partien kann beide Fälle abbilden.

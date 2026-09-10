# Lesende Zuschauer, serverseitige Replays und Engine-Adapter

**Status:** accepted

Zuschauer erhalten ausschließlich einen lesenden Stream aus Partie-Snapshots und Zügen; Zug-Requests werden serverseitig anhand der Spielerrolle abgewiesen. Replays nutzen die persistierte Zugfolge und führen einen eigenen Replay-State mit `ply`, `playing` und `speed`, ohne den Live-Spielzustand zu verändern.

Engine-Analyse wird zunächst hinter einem serverseitigen UCI-Worker-Adapter betrieben. Dadurch bleiben CPU-Limits, Abbruch und Eingabevalidierung unter Serverkontrolle; eine spätere Browser-WASM-Variante bleibt als optionaler lokaler Analysemodus möglich. Stockfish ist GPLv3-lizenziert und wird deshalb nicht ungeprüft in das Frontend gebündelt: Bei Distribution müssen Lizenz und Quellcodepflichten berücksichtigt werden. Grundlage: [offizielles Stockfish-Repository](https://github.com/official-stockfish/Stockfish).

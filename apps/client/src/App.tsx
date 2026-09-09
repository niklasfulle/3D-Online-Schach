import { useState } from 'react';
import { Canvas } from '@react-three/fiber';

import type { Square } from '@chess3d/shared';

import { ChessScene } from './board/ChessScene';

export function App() {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">3D ONLINE-SCHACH</p>
          <h1>Projektbasis steht.</h1>
        </div>
        <span className="status-pill">M1 · Grundgerüst</span>
      </header>
      <section className="scene-card" aria-label="3D-Szenenvorschau">
        <Canvas camera={{ position: [0, 7, 7], fov: 42 }} shadows>
          <color attach="background" args={['#10151f']} />
          <ChessScene selectedSquare={selectedSquare} onSelectSquare={setSelectedSquare} />
        </Canvas>
        <div className="scene-overlay">
          <strong>
            {selectedSquare ? `${selectedSquare} ausgewählt` : '3D-Brett initialisiert'}
          </strong>
          <span>Regelprüfung folgt in M3.</span>
        </div>
      </section>
    </main>
  );
}

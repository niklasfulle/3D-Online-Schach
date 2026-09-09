import { useState } from 'react';
import { Canvas } from '@react-three/fiber';

import { ChessGame, type Move, type PromotionPiece } from '@chess3d/chess-core';
import type { Color, Square } from '@chess3d/shared';

import { ChessScene } from './board/ChessScene';

const PROMOTION_OPTIONS: PromotionPiece[] = ['q', 'r', 'b', 'n'];
const PROMOTION_LABELS: Record<PromotionPiece, string> = {
  q: 'Dame',
  r: 'Turm',
  b: 'Läufer',
  n: 'Springer',
};

function statusLabel(status: ReturnType<ChessGame['getStatus']>) {
  switch (status) {
    case 'check':
      return 'Schach';
    case 'checkmate':
      return 'Schachmatt';
    case 'stalemate':
      return 'Patt';
    case 'draw':
      return 'Remis';
    default:
      return 'Partie läuft';
  }
}

export function App() {
  const [game] = useState(() => new ChessGame());
  const [gameState, setGameState] = useState(() => game.getState());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [moveHistory, setMoveHistory] = useState(() => game.history());
  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const [resignedBy, setResignedBy] = useState<Color | null>(null);

  function resetSelection() {
    setSelectedSquare(null);
    setLegalTargets([]);
  }

  function commitMove(move: Move) {
    game.move(move);
    setGameState(game.getState());
    setMoveHistory(game.history());
    setPromotionMove(null);
    resetSelection();
  }

  function handleSelectSquare(square: Square) {
    if (promotionMove || resignedBy || game.isGameOver()) return;

    if (selectedSquare && legalTargets.includes(square)) {
      const candidate = game.legalMoves(selectedSquare).find((move) => move.to === square);
      if (!candidate) return;

      if (candidate.promotion) {
        setPromotionMove({ from: selectedSquare, to: square });
      } else {
        commitMove({ from: selectedSquare, to: square });
      }
      return;
    }

    const moves = game.legalMoves(square);
    if (moves.length === 0) {
      resetSelection();
      return;
    }

    setSelectedSquare(square);
    setLegalTargets([...new Set(moves.map((move) => move.to))]);
  }

  function handleResign() {
    if (resignedBy || game.isGameOver()) return;
    if (window.confirm('Möchtest du diese Partie wirklich aufgeben?')) {
      setResignedBy(gameState.activeColor);
      resetSelection();
    }
  }

  const turnLabel = gameState.activeColor === 'white' ? 'Weiß' : 'Schwarz';
  const resultLabel = resignedBy
    ? `${resignedBy === 'white' ? 'Weiß' : 'Schwarz'} gibt auf`
    : statusLabel(gameState.status);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">3D ONLINE-SCHACH</p>
          <h1>Lokale Partie</h1>
        </div>
        <span className="status-pill">{resultLabel}</span>
      </header>
      <section className="game-layout">
        <div className="scene-card" aria-label="3D-Schachbrett">
          <Canvas camera={{ position: [0, 9.6, 11.8], fov: 46 }} shadows>
            <color attach="background" args={['#10151f']} />
            <ChessScene
              fen={gameState.fen}
              highlightedSquares={legalTargets}
              lastMove={moveHistory.at(-1)}
              selectedSquare={selectedSquare}
              onSelectSquare={handleSelectSquare}
            />
          </Canvas>
          <div className="scene-overlay">
            <strong>
              {resignedBy || game.isGameOver()
                ? resultLabel
                : selectedSquare
                  ? `${selectedSquare} ausgewählt`
                  : `${turnLabel} am Zug`}
            </strong>
            <span>
              {selectedSquare && !resignedBy && !game.isGameOver()
                ? 'Grüne Felder sind mögliche Ziele.'
                : resignedBy || game.isGameOver()
                  ? 'Die Partie ist beendet.'
                  : 'Wähle eine Figur aus.'}
            </span>
          </div>
        </div>
        <aside className="game-panel" aria-label="Partieinformationen">
          <div className="panel-section">
            <span className="panel-label">Status</span>
            <strong>{resignedBy || game.isGameOver() ? resultLabel : `${turnLabel} am Zug`}</strong>
            <code>{gameState.fen}</code>
            <button
              className="resign-button"
              type="button"
              disabled={Boolean(resignedBy) || game.isGameOver()}
              onClick={handleResign}
            >
              Aufgeben
            </button>
          </div>
          <div className="panel-section move-history">
            <span className="panel-label">Züge</span>
            {moveHistory.length === 0 ? (
              <span className="muted">Noch keine Züge.</span>
            ) : (
              moveHistory.map((move, index) => (
                <div className="move-row" key={`${move.san}-${index}`}>
                  <span>
                    {Math.floor(index / 2) + 1}
                    {index % 2 === 0 ? '.' : '…'}
                  </span>
                  <strong>{move.san}</strong>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
      {promotionMove ? (
        <div className="promotion-dialog" role="dialog" aria-label="Bauernumwandlung">
          <strong>Umwandeln zu</strong>
          <div className="promotion-actions">
            {PROMOTION_OPTIONS.map((promotion) => (
              <button
                key={promotion}
                type="button"
                onClick={() => commitMove({ ...promotionMove, promotion })}
              >
                {PROMOTION_LABELS[promotion]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

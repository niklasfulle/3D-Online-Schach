import { Canvas } from '@react-three/fiber';

import { ChessScene } from '../../board/ChessScene';

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function AuthBoardBackground() {
  return (
    <div className="auth-board-background" aria-hidden="true">
      <Canvas
        camera={{ position: [8.8, 8.2, 11.8], fov: 42 }}
        dpr={[1, 1.5]}
        shadows
      >
        <ChessScene
          fen={STARTING_FEN}
          highlightedSquares={[]}
          selectedSquare={null}
          onSelectSquare={() => undefined}
          interactive={false}
        />
      </Canvas>
      <div className="auth-board-scrim" />
      <div className="auth-board-vignette" />
    </div>
  );
}

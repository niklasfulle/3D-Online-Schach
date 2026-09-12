import { Canvas } from '@react-three/fiber';

import { ChessScene } from '../../board/ChessScene';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function AuthBoardBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[var(--auth-board-surface)]"
      aria-hidden="true"
    >
      <Canvas
        className="pointer-events-none absolute inset-0 !h-full !w-full opacity-[.78]"
        camera={{ position: [8.8, 8.2, 11.8], fov: 42 }}
        dpr={[1, 1.5]}
        shadows
      >
        <ChessScene
          autoOrient={false}
          boardColor="white"
          fen={STARTING_FEN}
          highlightedSquares={[]}
          selectedSquare={null}
          onSelectSquare={() => undefined}
          interactive={false}
        />
      </Canvas>
      <div className="absolute inset-0 bg-[var(--auth-board-overlay)] backdrop-blur-[1px]" />
      <div className="absolute inset-0 bg-[var(--auth-board-vignette)]" />
    </div>
  );
}

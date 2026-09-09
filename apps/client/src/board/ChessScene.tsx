import { OrbitControls } from '@react-three/drei';
import { memo, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';

import type { Square } from '@chess3d/shared';

import { squareToWorld } from './coordinates';

const LIGHT_TILE = '#d8c7a4';
const DARK_TILE = '#6b4f3a';
const SELECTED_TILE = '#4e91d9';
const BOARD_EDGE = 8.35;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface PieceDefinition {
  color: PieceColor;
  square: Square;
  type: PieceType;
}

interface SquareTileProps {
  highlighted: boolean;
  selected: boolean;
  square: Square;
  onSelect: (square: Square) => void;
}

interface PieceProps {
  piece: PieceDefinition;
  onSelect: (square: Square) => void;
}

const BACK_RANK: PieceType[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
];

const STARTING_PIECES: PieceDefinition[] = [
  ...FILES.map((file) => ({
    color: 'white' as const,
    square: `${file}2` as Square,
    type: 'pawn' as const,
  })),
  ...FILES.map((file) => ({
    color: 'black' as const,
    square: `${file}7` as Square,
    type: 'pawn' as const,
  })),
  ...FILES.map((file, index) => ({
    color: 'white' as const,
    square: `${file}1` as Square,
    type: BACK_RANK[index],
  })),
  ...FILES.map((file, index) => ({
    color: 'black' as const,
    square: `${file}8` as Square,
    type: BACK_RANK[index],
  })),
];

const SquareTile = memo(function SquareTile({
  highlighted,
  selected,
  square,
  onSelect,
}: SquareTileProps) {
  const [x, , z] = squareToWorld(square, 0.08);
  const fileIndex = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rankIndex = Number(square[1]) - 1;
  const isLight = (fileIndex + rankIndex) % 2 === 0;

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(square);
  }

  return (
    <mesh position={[x, 0.08, z]} onClick={handleClick} receiveShadow>
      <boxGeometry args={[0.98, 0.16, 0.98]} />
      <meshStandardMaterial
        color={
          selected ? SELECTED_TILE : highlighted ? '#7cbf75' : isLight ? LIGHT_TILE : DARK_TILE
        }
      />
    </mesh>
  );
});

const Piece = memo(function Piece({ piece, onSelect }: PieceProps) {
  const [x, , z] = squareToWorld(piece.square, 0.32);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(piece.square);
  }

  return (
    <group position={[x, 0, z]} onClick={handleClick}>
      <mesh castShadow position={[0, piece.type === 'pawn' ? 0.22 : 0.28, 0]}>
        {piece.type === 'pawn' ? (
          <sphereGeometry args={[0.2, 16, 12]} />
        ) : (
          <cylinderGeometry args={[0.24, 0.3, 0.48, 16]} />
        )}
        <meshStandardMaterial color={piece.color === 'white' ? '#f4ead7' : '#20252d'} />
      </mesh>
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.34, 0.38, 0.12, 16]} />
        <meshStandardMaterial color={piece.color === 'white' ? '#d8c7a4' : '#11151b'} />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial
          color={piece.color === 'white' ? '#201b17' : '#f4ead7'}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
});

export interface ChessSceneProps {
  highlightedSquares: readonly Square[];
  selectedSquare: Square | null;
  onSelectSquare: (square: Square) => void;
}

export function ChessScene({
  highlightedSquares,
  selectedSquare,
  onSelectSquare,
}: ChessSceneProps) {
  const squares = useMemo(
    () => RANKS.flatMap((rank) => FILES.map((file) => `${file}${rank}` as Square)),
    [],
  );

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight
        castShadow
        intensity={2}
        position={[4, 8, 4]}
        shadow-mapSize={[2048, 2048]}
      />
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={5}
        maxDistance={12}
      />
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[BOARD_EDGE, 0.24, BOARD_EDGE]} />
        <meshStandardMaterial color="#2a2020" />
      </mesh>
      {squares.map((square) => (
        <SquareTile
          key={square}
          square={square}
          highlighted={highlightedSquares.includes(square)}
          selected={square === selectedSquare}
          onSelect={onSelectSquare}
        />
      ))}
      {STARTING_PIECES.map((piece) => (
        <Piece key={`${piece.color}-${piece.square}`} piece={piece} onSelect={onSelectSquare} />
      ))}
    </>
  );
}

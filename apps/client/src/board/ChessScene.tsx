import { OrbitControls, useGLTF } from '@react-three/drei';
import { memo, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, type Group } from 'three';

import type { Move } from '@chess3d/chess-core';
import type { Square } from '@chess3d/shared';

import { squareToWorld } from './coordinates';
import { pieceRotationY, piecesFromFen, type PieceDefinition, type PieceType } from './pieces';

const LIGHT_TILE = '#d8c7a4';
const DARK_TILE = '#6b4f3a';
const SELECTED_TILE = '#4e91d9';
const BOARD_EDGE = 8.35;

const MODEL_URLS: Record<PieceType, string> = {
  bishop: '/models/chess/bishop.glb',
  king: '/models/chess/king.glb',
  knight: '/models/chess/knight.glb',
  pawn: '/models/chess/pawn.glb',
  queen: '/models/chess/queen.glb',
  rook: '/models/chess/rook.glb',
};

const PIECE_MATERIALS = {
  white: new MeshStandardMaterial({ color: '#f2e6cf', metalness: 0.08, roughness: 0.3 }),
  black: new MeshStandardMaterial({ color: '#2d3a4d', metalness: 0.16, roughness: 0.24 }),
};

Object.values(MODEL_URLS).forEach((url) => useGLTF.preload(url));

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

interface SquareTileProps {
  highlighted: boolean;
  selected: boolean;
  square: Square;
  onSelect: (square: Square) => void;
}

interface PieceProps {
  animationFrom?: Square;
  piece: PieceDefinition;
  onSelect: (square: Square) => void;
}

interface PieceModelProps {
  color: PieceDefinition['color'];
  type: PieceType;
}

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

const PieceModel = memo(function PieceModel({ color, type }: PieceModelProps) {
  const { scene } = useGLTF(MODEL_URLS[type]);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = PIECE_MATERIALS[color];
      }
    });
    return clone;
  }, [color, scene]);

  return <primitive object={model} />;
});

const Piece = memo(function Piece({ animationFrom, piece, onSelect }: PieceProps) {
  const groupRef = useRef<Group>(null);
  const target = useMemo(() => squareToWorld(piece.square), [piece.square]);
  const start = useMemo(
    () => squareToWorld(animationFrom ?? piece.square),
    [animationFrom, piece.square],
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const progress = 1 - Math.exp(-12 * delta);
    group.position.x += (target[0] - group.position.x) * progress;
    group.position.z += (target[2] - group.position.z) * progress;
  });

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(piece.square);
  }

  return (
    <group
      ref={groupRef}
      position={start}
      rotation={[0, pieceRotationY(piece.type, piece.color), 0]}
      onClick={handleClick}
    >
      <PieceModel color={piece.color} type={piece.type} />
    </group>
  );
});

export interface ChessSceneProps {
  fen: string;
  highlightedSquares: readonly Square[];
  lastMove?: Move;
  selectedSquare: Square | null;
  onSelectSquare: (square: Square) => void;
}

export function ChessScene({
  fen,
  highlightedSquares,
  lastMove,
  selectedSquare,
  onSelectSquare,
}: ChessSceneProps) {
  const squares = useMemo(
    () => RANKS.flatMap((rank) => FILES.map((file) => `${file}${rank}` as Square)),
    [],
  );
  const pieces = useMemo(() => piecesFromFen(fen), [fen]);

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight
        castShadow
        intensity={2}
        position={[4, 8, 4]}
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight color="#8fb7ff" intensity={0.8} position={[-4, 5, -4]} />
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={7}
        maxDistance={18}
        target={[0, 0.35, 0]}
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
      {pieces.map((piece) => (
        <Piece
          key={`${piece.color}-${piece.type}-${piece.square}`}
          animationFrom={lastMove?.to === piece.square ? lastMove.from : undefined}
          piece={piece}
          onSelect={onSelectSquare}
        />
      ))}
    </>
  );
}

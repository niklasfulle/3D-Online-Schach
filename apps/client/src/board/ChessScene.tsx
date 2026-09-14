import { OrbitControls, Text, useGLTF } from '@react-three/drei';
import { memo, useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Box3, MOUSE, Mesh, MeshStandardMaterial, Vector3, type Group } from 'three';

import type { Move } from '@chess3d/chess-core';
import type { Square } from '@chess3d/shared';

import { squareToWorld } from './coordinates';
import {
  pieceFinishForNode,
  pieceRotationY,
  piecesFromFen,
  type PieceColor,
  type PieceDefinition,
  type PieceFinish,
  type PieceType,
} from './pieces';

const LIGHT_TILE = '#d9b994';
const DARK_TILE = '#17191d';
const SELECTED_TILE = '#4e91d9';
const BOARD_EDGE = 8.6;
const BOARD_SURFACE_Y = 0.16;
const BOARD_FRAME_Y = 0.105;
const BOARD_FRAME_HEIGHT = 0.07;
const BOARD_LABEL_Y = BOARD_FRAME_Y + BOARD_FRAME_HEIGHT / 2 + 0.006;
const PAN_LIMIT = 1.5;
const MIN_TARGET_Y = -0.2;
const MAX_TARGET_Y = 1.2;
const PIECE_TARGET_HEIGHTS: Record<PieceType, number> = {
  pawn: 0.76,
  rook: 1.04,
  knight: 1.08,
  bishop: 1.17,
  queen: 1.31,
  king: 1.38,
};
const PIECE_BASE_Y = BOARD_SURFACE_Y + 0.02;

const MODEL_URLS: Record<PieceType, string> = {
  bishop: '/models/chess/blend/bishop.glb',
  king: '/models/chess/blend/king.glb',
  knight: '/models/chess/blend/knight.glb',
  pawn: '/models/chess/blend/pawn.glb',
  queen: '/models/chess/blend/queen.glb',
  rook: '/models/chess/blend/rook.glb',
};

const PIECE_MATERIALS: Record<PieceColor, Record<PieceFinish, MeshStandardMaterial>> = {
  white: {
    body: new MeshStandardMaterial({ color: '#eee3cd', metalness: 0.06, roughness: 0.4 }),
    base: new MeshStandardMaterial({ color: '#c9b99e', metalness: 0.09, roughness: 0.46 }),
    trim: new MeshStandardMaterial({ color: '#c59a57', metalness: 0.72, roughness: 0.28 }),
  },
  black: {
    body: new MeshStandardMaterial({ color: '#111318', metalness: 0.16, roughness: 0.42 }),
    base: new MeshStandardMaterial({ color: '#07090d', metalness: 0.18, roughness: 0.48 }),
    trim: new MeshStandardMaterial({ color: '#bd9252', metalness: 0.7, roughness: 0.3 }),
  },
};

Object.values(MODEL_URLS).forEach((url) => useGLTF.preload(url));

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
type BoardSquare = `${(typeof FILES)[number]}${(typeof RANKS)[number]}`;

const BOARD_LABEL_STYLE = {
  color: '#f4f0e8',
  font: '/fonts/Inter-Regular.woff',
  fontSize: 0.24,
  anchorX: 'center' as const,
  anchorY: 'middle' as const,
};

function BoardCoordinates() {
  const labelOffset = 4.12;

  return (
    <group rotation={[0, 0, 0]}>
      {FILES.map((file, index) => {
        const x = index - 3.5;
        return (
          <group key={`file-${file}`}>
            <Text {...BOARD_LABEL_STYLE} position={[x, BOARD_LABEL_Y, labelOffset]} rotation={[-Math.PI / 2, 0, 0]}>
              {file.toUpperCase()}
            </Text>
            <Text {...BOARD_LABEL_STYLE} position={[x, BOARD_LABEL_Y, -labelOffset]} rotation={[-Math.PI / 2, 0, Math.PI]}>
              {file.toUpperCase()}
            </Text>
          </group>
        );
      })}
      {RANKS.map((rank, index) => {
        const z = 3.5 - index;
        return (
          <group key={`rank-${rank}`}>
            <Text {...BOARD_LABEL_STYLE} position={[-labelOffset, BOARD_LABEL_Y, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
              {rank}
            </Text>
            <Text {...BOARD_LABEL_STYLE} position={[labelOffset, BOARD_LABEL_Y, z]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
              {rank}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

interface SquareTileProps {
  highlighted: boolean;
  interactive: boolean;
  selected: boolean;
  square: Square;
  onSelect: (square: Square) => void;
}

interface PieceProps {
  animationFrom?: Square;
  interactive: boolean;
  piece: PieceDefinition;
  onSelect: (square: Square) => void;
}

interface PieceModelProps {
  color: PieceDefinition['color'];
  type: PieceType;
}

const SquareTile = memo(function SquareTile({
  highlighted,
  interactive,
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
    <mesh position={[x, 0.08, z]} onClick={interactive ? handleClick : undefined} receiveShadow>
      <boxGeometry args={[0.98, 0.16, 0.98]} />
      <meshStandardMaterial color={tileColor(selected, highlighted, isLight)} />
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
        child.material = PIECE_MATERIALS[color][pieceFinishForNode(child.name)];
      }
    });

    clone.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = PIECE_TARGET_HEIGHTS[type] / Math.max(size.y, 0.001);
    clone.scale.setScalar(scale);
    clone.position.set(
      -center.x * scale,
      PIECE_BASE_Y - bounds.min.y * scale,
      -center.z * scale,
    );
    return clone;
  }, [color, scene, type]);

  return (
    <group>
      <primitive object={model} />
    </group>
  );
});

const Piece = memo(function Piece({ animationFrom, interactive, piece, onSelect }: PieceProps) {
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
      onClick={interactive ? handleClick : undefined}
    >
      <PieceModel color={piece.color} type={piece.type} />
    </group>
  );
});

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export type ChessSceneProps = Readonly<{
  autoOrient?: boolean;
  boardColor: 'black' | 'white';
  fen: string;
  highlightedSquares: readonly Square[];
  interactive?: boolean;
  lastMove?: Move;
  selectedSquare: Square | null;
  onSelectSquare: (square: Square) => void;
}>;

function tileColor(selected: boolean, highlighted: boolean, isLight: boolean): string {
  if (selected) return SELECTED_TILE;
  if (highlighted) return '#7cbf75';
  return isLight ? LIGHT_TILE : DARK_TILE;
}

export function ChessScene({
  autoOrient = true,
  boardColor,
  fen,
  highlightedSquares,
  interactive = true,
  lastMove,
  selectedSquare,
  onSelectSquare,
}: ChessSceneProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const squares = useMemo<BoardSquare[]>(() => {
    const result: BoardSquare[] = [];
    for (const rank of RANKS) {
      for (const file of FILES) result.push(`${file}${rank}`);
    }
    return result;
  }, []);
  const pieces = useMemo(() => piecesFromFen(fen), [fen]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!autoOrient || !controls) return;

    camera.position.set(0, 13.5, boardColor === 'black' ? -16.5 : 16.5);
    controls.target.set(0, 0.35, 0);
    controls.update();
  }, [autoOrient, boardColor, camera]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const target = controls.target;
    const nextX = clamp(target.x, -PAN_LIMIT, PAN_LIMIT);
    const nextY = clamp(target.y, MIN_TARGET_Y, MAX_TARGET_Y);
    const nextZ = clamp(target.z, -PAN_LIMIT, PAN_LIMIT);
    const deltaX = nextX - target.x;
    const deltaY = nextY - target.y;
    const deltaZ = nextZ - target.z;

    if (deltaX === 0 && deltaY === 0 && deltaZ === 0) return;

    target.set(nextX, nextY, nextZ);
    camera.position.x += deltaX;
    camera.position.y += deltaY;
    camera.position.z += deltaZ;
    controls.update();
  });

  return (
    <>
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#e5efff', '#7b6146', 0.8]} />
      <directionalLight
        castShadow
        intensity={2.15}
        position={[4, 8, 4]}
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight color="#b4ccf3" intensity={0.45} position={[-4, 5, -4]} />
      <OrbitControls
        ref={controlsRef}
        enabled={interactive}
        enablePan
        mouseButtons={{
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN,
        }}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={9}
        maxDistance={28}
        target={[0, 0.35, 0]}
      />
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[BOARD_EDGE, 0.24, BOARD_EDGE]} />
        <meshStandardMaterial color="#0c0e12" roughness={0.32} />
      </mesh>
      <mesh position={[0, BOARD_FRAME_Y, 0]} receiveShadow>
        <boxGeometry args={[BOARD_EDGE, BOARD_FRAME_HEIGHT, BOARD_EDGE]} />
        <meshStandardMaterial color="#171a20" roughness={0.28} />
      </mesh>
      <BoardCoordinates />
      {squares.map((square) => (
        <SquareTile
          key={square}
          square={square}
          highlighted={highlightedSquares.includes(square)}
          interactive={interactive}
          selected={square === selectedSquare}
          onSelect={onSelectSquare}
        />
      ))}
      {pieces.map((piece) => (
        <Piece
          key={`${piece.color}-${piece.type}-${piece.square}`}
          animationFrom={lastMove?.to === piece.square ? lastMove.from : undefined}
          interactive={interactive}
          piece={piece}
          onSelect={onSelectSquare}
        />
      ))}
    </>
  );
}

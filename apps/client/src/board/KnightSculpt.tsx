import { memo } from 'react';
import { ExtrudeGeometry, MeshStandardMaterial, Shape, SphereGeometry } from 'three';

import type { PieceColor, PieceFinish } from './pieces';

function extrudedProfile(shape: Shape, depth: number): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    steps: 1,
    depth,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(depth / 2, 0, 0);
  return geometry;
}

// The profile faces +Z. Its broad cheek, long muzzle and arched neck stay legible
// when the board is viewed from above or the camera is rotated around it.
const bodyProfile = new Shape();
bodyProfile.moveTo(-0.2, 0.27);
bodyProfile.bezierCurveTo(-0.34, 0.45, -0.35, 0.74, -0.3, 0.99);
bodyProfile.bezierCurveTo(-0.27, 1.12, -0.15, 1.18, -0.02, 1.17);
bodyProfile.bezierCurveTo(0.1, 1.17, 0.18, 1.11, 0.21, 1.04);
bodyProfile.bezierCurveTo(0.29, 0.96, 0.43, 0.85, 0.5, 0.78);
bodyProfile.bezierCurveTo(0.56, 0.72, 0.54, 0.65, 0.48, 0.63);
bodyProfile.bezierCurveTo(0.41, 0.6, 0.35, 0.64, 0.29, 0.68);
bodyProfile.bezierCurveTo(0.21, 0.73, 0.13, 0.73, 0.09, 0.66);
bodyProfile.bezierCurveTo(0.03, 0.57, 0.11, 0.46, 0.22, 0.3);
bodyProfile.quadraticCurveTo(0, 0.23, -0.2, 0.27);
const BODY_GEOMETRY = extrudedProfile(bodyProfile, 0.29);

const maneProfile = new Shape();
maneProfile.moveTo(-0.12, 1.19);
maneProfile.quadraticCurveTo(-0.25, 1.24, -0.3, 1.15);
maneProfile.quadraticCurveTo(-0.37, 1.1, -0.3, 1.05);
maneProfile.quadraticCurveTo(-0.4, 1, -0.32, 0.94);
maneProfile.quadraticCurveTo(-0.43, 0.88, -0.34, 0.82);
maneProfile.quadraticCurveTo(-0.43, 0.75, -0.32, 0.69);
maneProfile.quadraticCurveTo(-0.35, 0.61, -0.22, 0.59);
maneProfile.quadraticCurveTo(-0.2, 0.89, -0.12, 1.19);
const MANE_GEOMETRY = extrudedProfile(maneProfile, 0.32);

const earProfile = new Shape();
earProfile.moveTo(-0.09, 1.12);
earProfile.quadraticCurveTo(-0.02, 1.26, 0.03, 1.37);
earProfile.quadraticCurveTo(0.13, 1.33, 0.1, 1.12);
earProfile.quadraticCurveTo(0.02, 1.09, -0.09, 1.12);
const EAR_GEOMETRY = extrudedProfile(earProfile, 0.07);
const DETAIL_GEOMETRY = new SphereGeometry(1, 12, 8);

const FEATURE_MATERIALS: Record<PieceColor, MeshStandardMaterial> = {
  white: new MeshStandardMaterial({ color: '#433c35', roughness: 0.9 }),
  black: new MeshStandardMaterial({ color: '#c49a58', metalness: 0.25, roughness: 0.55 }),
};

type KnightSculptProps = Readonly<{
  color: PieceColor;
  materials: Record<PieceFinish, MeshStandardMaterial>;
}>;

export const KnightSculpt = memo(function KnightSculpt({ color, materials }: KnightSculptProps) {
  return (
    <group>
      <mesh geometry={BODY_GEOMETRY} material={materials.body} castShadow receiveShadow />
      <mesh geometry={MANE_GEOMETRY} material={materials.base} castShadow />
      <mesh geometry={EAR_GEOMETRY} material={materials.body} position={[-0.09, 0, 0]} castShadow />
      <mesh geometry={EAR_GEOMETRY} material={materials.body} position={[0.09, 0, 0]} castShadow />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh
            geometry={DETAIL_GEOMETRY}
            material={FEATURE_MATERIALS[color]}
            position={[side * 0.176, 1.015, 0.13]}
            scale={[0.016, 0.034, 0.039]}
          />
          <mesh
            geometry={DETAIL_GEOMETRY}
            material={FEATURE_MATERIALS[color]}
            position={[side * 0.174, 0.705, 0.465]}
            scale={[0.014, 0.022, 0.024]}
          />
        </group>
      ))}
    </group>
  );
});

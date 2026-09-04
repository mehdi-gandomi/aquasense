'use client';

import { Canvas } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';

export function ReservoirCanvas({
  children,
}: {
  bloom?: number;
  children: React.ReactNode;
}) {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      camera={{ position: [6, 16, 20], zoom: 46, near: -400, far: 900 }}
      gl={{ antialias: true, alpha: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {children}
      <MapControls
        makeDefault
        enableRotate={false}
        screenSpacePanning
        enableDamping
        dampingFactor={0.14}
        minZoom={22}
        maxZoom={140}
      />
    </Canvas>
  );
}

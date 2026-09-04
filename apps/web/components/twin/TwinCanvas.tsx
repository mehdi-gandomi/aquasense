'use client';

import { Canvas } from '@react-three/fiber';
import { TwinScene } from './TwinScene';

export function TwinCanvas() {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      camera={{ position: [7, 19, 23], zoom: 40, near: -600, far: 1200 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <TwinScene />
    </Canvas>
  );
}

'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLANT_NODES } from '@aquasense/shared';
import { advanceSmoothing } from '@/lib/channels';
import { NodeMesh } from './nodes';

function Turntable({ nodeId }: { nodeId: string }) {
  const group = useRef<THREE.Group>(null);
  const node = PLANT_NODES.find((n) => n.id === nodeId) ?? PLANT_NODES[0];

  useFrame((_, delta) => {
    advanceSmoothing(delta);
    if (group.current) group.current.rotation.y += delta * 0.22;
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#6fb6d4', '#08131f', 0.8]} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} color="#dff0f8" />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#14afc4" />

      <group ref={group}>
        {/* NodeMesh positions by plant coordinates, so re-centre it here. */}
        <group position={[-((node.x - 1200) / 100), 0, -((node.y - 600) / 100)]}>
          <NodeMesh node={node} severity="nominal" selected={false} onSelect={() => {}} />
        </group>
      </group>
    </>
  );
}

function VignetteCanvas({ nodeId }: { nodeId: string }) {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      camera={{ position: [4, 5, 6], zoom: 95, near: -100, far: 200 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Turntable nodeId={nodeId} />
    </Canvas>
  );
}

const LazyVignette = dynamic(() => Promise.resolve(VignetteCanvas), { ssr: false });

/** A small turntable of the stage's primary unit. Mounts only on this route. */
export function StageVignette({ nodeId, label }: { nodeId: string; label: string }) {
  return (
    <div className="slab relative h-[190px] overflow-hidden shadow-brut">
      <div className="absolute inset-0 grid-paper-fine opacity-40" />
      <LazyVignette nodeId={nodeId} />
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t-2 border-line bg-shell-900/85 px-3 py-1.5 backdrop-blur">
        <span className="size-1.5 bg-flow" />
        <span className="label-xs text-slate-300">{label}</span>
        <span className="label-xs ml-auto normal-case tracking-normal">Live geometry</span>
      </div>
    </div>
  );
}

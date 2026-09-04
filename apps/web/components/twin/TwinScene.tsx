'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  PLANT_NODES,
  PLANT_PIPES,
  getNode,
  toWorld,
  type PlantPipe,
} from '@aquasense/shared';
import { advanceSmoothing } from '@/lib/channels';
import { nodeSeverity } from '@/lib/health';
import { useConsole } from '@/stores/useConsole';
import { allAnchors, registerAnchor } from './registry';
import { FlowTube } from './materials';
import { NodeMesh } from './nodes';

const PIPE_STYLE: Record<
  PlantPipe['pathway'],
  { base: string; pulse: string; radius: number; y: number; density: number }
> = {
  liquid: { base: '#0e4a5c', pulse: '#4fd8ea', radius: 0.055, y: 0.13, density: 14 },
  recycle: { base: '#0c3a4d', pulse: '#2f97b5', radius: 0.04, y: 0.1, density: 10 },
  sludge: { base: '#3d3120', pulse: '#9b7b4f', radius: 0.05, y: 0.11, density: 9 },
  gas: { base: '#3b2f55', pulse: '#b79ce8', radius: 0.042, y: 0.62, density: 11 },
};

/** Pull pipe endpoints back to the edge of each unit so tubes don't spear tanks. */
function trimmedPoints(pipe: PlantPipe, y: number): THREE.Vector3[] {
  const raw = [
    [getNode(pipe.from).x, getNode(pipe.from).y] as [number, number],
    ...(pipe.waypoints ?? []),
    [getNode(pipe.to).x, getNode(pipe.to).y] as [number, number],
  ];

  const from = getNode(pipe.from);
  const to = getNode(pipe.to);

  const pull = (
    point: [number, number],
    toward: [number, number],
    halfW: number,
    halfH: number,
  ): [number, number] => {
    const dx = toward[0] - point[0];
    const dy = toward[1] - point[1];
    const len = Math.hypot(dx, dy) || 1;
    const inset = Math.abs(dx) > Math.abs(dy) ? halfW : halfH;
    const k = Math.min(0.92, (inset + 8) / len);
    return [point[0] + dx * k, point[1] + dy * k];
  };

  raw[0] = pull(raw[0], raw[1], from.w / 2, from.h / 2);
  raw[raw.length - 1] = pull(
    raw[raw.length - 1],
    raw[raw.length - 2],
    to.w / 2,
    to.h / 2,
  );

  return raw.map(([x, z]) => {
    const [wx, wz] = toWorld(x, z);
    return new THREE.Vector3(wx, y, wz);
  });
}

function Pipes() {
  const tubes = useMemo(
    () =>
      PLANT_PIPES.map((pipe) => {
        const style = PIPE_STYLE[pipe.pathway];
        return { pipe, style, points: trimmedPoints(pipe, style.y) };
      }),
    [],
  );

  return (
    <group>
      {tubes.map(({ pipe, style, points }) => (
        <FlowTube
          key={pipe.id}
          points={points}
          radius={style.radius}
          baseColor={style.base}
          pulseColor={style.pulse}
          density={style.density}
          flowSensor={pipe.flowSensorId}
          nominalFlow={pipe.pathway === 'liquid' ? 380 : pipe.pathway === 'gas' ? 210 : 45}
        />
      ))}
    </group>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
        <planeGeometry args={[46, 30]} />
        <meshStandardMaterial color="#061422" roughness={1} />
      </mesh>
      <gridHelper args={[46, 46, '#123c58', '#0d2840']} position-y={0} />
    </group>
  );
}

/** Projects registered anchors to screen space and drives channel easing. */
function Projector() {
  const vec = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }, delta) => {
    advanceSmoothing(delta);

    for (const anchor of allAnchors()) {
      const el = anchor.el;
      if (!el) continue;

      vec.copy(anchor.world).project(camera);
      const x = (vec.x * 0.5 + 0.5) * size.width;
      const y = (-vec.y * 0.5 + 0.5) * size.height;

      const offscreen =
        x < -240 || y < -160 || x > size.width + 240 || y > size.height + 160;

      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.style.visibility = offscreen ? 'hidden' : 'visible';
    }
  });

  return null;
}

function Anchors() {
  useEffect(() => {
    for (const node of PLANT_NODES) {
      const [wx, wz] = toWorld(node.x, node.y);
      const lift =
        node.kind === 'digester'
          ? 1.5
          : node.kind === 'gasholder'
            ? 1.1
            : node.kind === 'silo'
              ? 1.05
              : 0.78;
      registerAnchor(node.id, [wx, lift, wz]);
    }
  }, []);

  return null;
}

export function TwinScene() {
  const facilityId = useConsole((s) => s.facilityId);
  const selection = useConsole((s) => s.selection);
  const select = useConsole((s) => s.select);
  const tick = useConsole((s) => s.tick);
  const { camera } = useThree();

  // Frame the whole works on first paint.
  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = 40;
    ortho.updateProjectionMatrix();
  }, [camera]);

  const severities = useMemo(
    () => new Map(PLANT_NODES.map((n) => [n.id, nodeSeverity(facilityId, n.id)])),
    // Recomputed on the throttled console tick rather than every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [facilityId, tick],
  );

  return (
    <>
      <color attach="background" args={['#04101b']} />
      <fog attach="fog" args={['#04101b', 34, 68]} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#5fa8c8', '#08131f', 0.7]} />
      <directionalLight position={[8, 14, 6]} intensity={1.05} color="#cfe9f5" />
      <directionalLight position={[-10, 6, -8]} intensity={0.45} color="#14afc4" />

      <Ground />
      <Pipes />

      {PLANT_NODES.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          severity={severities.get(node.id) ?? 'nominal'}
          selected={selection?.kind === 'node' && selection.id === node.id}
          onSelect={() => select({ kind: 'node', id: node.id })}
        />
      ))}

      <Anchors />
      <Projector />

      <MapControls
        makeDefault
        enableRotate={false}
        screenSpacePanning
        enableDamping
        dampingFactor={0.14}
        minZoom={16}
        maxZoom={190}
      />
    </>
  );
}

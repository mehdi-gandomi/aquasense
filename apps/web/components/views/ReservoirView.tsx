'use client';

import { Suspense, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { assessBloom } from '@aquasense/shared';
import { getDisplay, getValue } from '@/lib/channels';
import { useConsole } from '@/stores/useConsole';

/* ------------------------------------------------------------------ *
 * Reservoir surface. Bloom biomass drives green patch density, so the
 * water body itself communicates risk before you read a single number.
 * ------------------------------------------------------------------ */

const vertex = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(p.x * 1.6 + uTime * 0.8) * 0.06 + cos(p.y * 2.1 - uTime * 0.6) * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uBloom;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 drift = vec2(uTime * 0.012, uTime * -0.008);
    float n = fbm(vUv * 7.0 + drift);
    float patches = smoothstep(0.52 - uBloom * 0.30, 0.78, n);

    vec3 clean = vec3(0.055, 0.196, 0.278);
    vec3 deep  = vec3(0.031, 0.129, 0.196);
    vec3 algae = vec3(0.325, 0.596, 0.318);

    float depth = smoothstep(0.0, 1.0, vUv.y);
    vec3 water = mix(deep, clean, depth);
    vec3 col = mix(water, algae, patches * uBloom);

    // Surface glint
    float glint = pow(max(0.0, sin((vUv.x * 40.0 + vUv.y * 12.0) - uTime * 1.4)), 8.0);
    col += glint * 0.05;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function ReservoirSurface({ bloom }: { bloom: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uBloom: { value: 0.3 } }),
    [],
  );

  useFrame((_, delta) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value += delta;
    const target = Math.min(1, Math.max(0, bloom));
    const current = material.current.uniforms.uBloom.value as number;
    material.current.uniforms.uBloom.value = current + (target - current) * 0.03;
  });

  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[26, 16, 90, 60]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
      />
    </mesh>
  );
}

/** Monitoring buoys bob on the surface at the sampling stations. */
function Buoys() {
  const group = useRef<THREE.Group>(null);

  const positions = useMemo<[number, number][]>(
    () => [
      [-7, -3],
      [-2, 2],
      [4, -4],
      [8, 1.5],
      [1, -1],
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      child.position.y = 0.12 + Math.sin(clock.elapsedTime * 1.3 + i) * 0.05;
    });
  });

  return (
    <group ref={group}>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0.12, z]}>
          <mesh>
            <cylinderGeometry args={[0.14, 0.18, 0.3, 12]} />
            <meshStandardMaterial color="#f2a93b" roughness={0.6} />
          </mesh>
          <mesh position-y={0.32}>
            <cylinderGeometry args={[0.02, 0.02, 0.36, 6]} />
            <meshStandardMaterial color="#8fa8bd" metalness={0.5} />
          </mesh>
          <mesh position-y={0.54}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#4fd8ea" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The upstream works discharging into the reservoir. */
function Outfall() {
  return (
    <group position={[-12.4, 0, 4]}>
      <mesh position-y={0.22}>
        <boxGeometry args={[1.6, 0.44, 1.1]} />
        <meshStandardMaterial color="#153049" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 0.16, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.12, 0.12, 1.2, 12]} />
        <meshStandardMaterial color="#25597f" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[2.2, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.1, 24]} />
        <meshBasicMaterial color="#7fd0e0" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function Shoreline() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.06}>
        <planeGeometry args={[40, 28]} />
        <meshStandardMaterial color="#0b1d18" roughness={1} />
      </mesh>
      {Array.from({ length: 26 }).map((_, i) => {
        const angle = (i / 26) * Math.PI * 2;
        const r = 15 + Math.sin(i * 2.3) * 1.4;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, 0.2, Math.sin(angle) * (r * 0.62)]}
          >
            <coneGeometry args={[0.34, 0.9, 6]} />
            <meshStandardMaterial color="#163b2c" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

function ReservoirScene({ bloom }: { bloom: number }) {
  return (
    <>
      <color attach="background" args={['#04101b']} />
      <fog attach="fog" args={['#04101b', 26, 56]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#7fc4dd', '#08131f', 0.8]} />
      <directionalLight position={[6, 12, 8]} intensity={1} color="#dff0f8" />

      <Shoreline />
      <ReservoirSurface bloom={bloom} />
      <Buoys />
      <Outfall />
    </>
  );
}

const ReservoirCanvas = dynamic(
  () => import('./ReservoirCanvas').then((m) => m.ReservoirCanvas),
  { ssr: false },
);

export function ReservoirView() {
  useConsole((s) => s.tick);

  const assessment = assessBloom({
    chlorophyll: getValue('HR-CHL-01'),
    phycocyanin: getValue('HR-PHY-01'),
    temperature: getValue('HR-TMP-01'),
    totalNitrogen: getValue('HR-TN-01'),
    totalPhosphorus: getValue('HR-TP-01'),
    secchi: getValue('HR-SDD-01'),
    dissolvedOxygen: getValue('HR-DO-01'),
    upstreamNitrogenLoad: getDisplay('EFF-TN-01') * getDisplay('EFF-FLW-01') * 0.024,
  });

  return (
    <div className="absolute inset-0 bg-shell-950">
      <Suspense fallback={null}>
        <ReservoirCanvas bloom={assessment.hazardScore / 100}>
          <ReservoirScene bloom={assessment.hazardScore / 100} />
        </ReservoirCanvas>
      </Suspense>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(4,16,27,0.6) 100%)',
        }}
      />

      <div className="slab pointer-events-none absolute bottom-3 left-3 px-3 py-2 shadow-brut">
        <div className="label-xs mb-1.5">Bloom intensity on surface</div>
        <div className="flex items-center gap-2">
          <span className="label-xs normal-case tracking-normal text-faint/80">Clear</span>
          <div className="h-2.5 w-32 bg-gradient-to-r from-[#08213a] via-[#1d5a5a] to-[#53984f]" />
          <span className="label-xs normal-case tracking-normal text-faint/80">Bloom</span>
        </div>
      </div>
    </div>
  );
}

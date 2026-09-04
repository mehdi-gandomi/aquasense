'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDisplay } from '@/lib/channels';

/* ------------------------------------------------------------------ *
 * Animated water surface.
 * Colour comes from the treatment stage, agitation from live aeration.
 * ------------------------------------------------------------------ */

const waterVertex = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAgitation;

  void main() {
    vUv = uv;
    vec3 p = position;
    float wave =
      sin(p.x * 5.5 + uTime * 1.9) * 0.011 +
      cos(p.y * 7.0 - uTime * 1.4) * 0.011;
    p.z += wave * (0.5 + uAgitation * 1.6);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const waterFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uAgitation;

  void main() {
    float ripple = sin((vUv.x * 26.0 + vUv.y * 16.0) - uTime * 2.1) * 0.5 + 0.5;
    float sheen = pow(ripple, 3.0) * (0.05 + uAgitation * 0.14);

    // Soft vignette so basins read as recessed volumes rather than flat decals.
    vec2 c = vUv - 0.5;
    float edge = 1.0 - smoothstep(0.32, 0.5, max(abs(c.x), abs(c.y)));

    vec3 col = uColor * (0.82 + edge * 0.26) + sheen;
    gl_FragColor = vec4(col, 0.96);
  }
`;

export function WaterSurface({
  width,
  depth,
  color,
  agitationSensor,
  circular = false,
  y = 0,
}: {
  width: number;
  depth: number;
  color: string;
  agitationSensor?: string;
  circular?: boolean;
  y?: number;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uAgitation: { value: 0.2 },
    }),
    [color],
  );

  useFrame((_, delta) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value += delta;
    if (agitationSensor) {
      const raw = getDisplay(agitationSensor);
      material.current.uniforms.uAgitation.value = Math.min(1, Math.max(0, raw / 100));
    }
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y}>
      {circular ? (
        <circleGeometry args={[width / 2, 64]} />
      ) : (
        <planeGeometry args={[width, depth, 24, 24]} />
      )}
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={waterVertex}
        fragmentShader={waterFragment}
        transparent
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ *
 * Flow pipe: a tube with travelling bands whose speed tracks live flow.
 * ------------------------------------------------------------------ */

const pipeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pipeFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uDensity;
  uniform vec3 uBase;
  uniform vec3 uPulse;
  uniform float uOpacity;

  void main() {
    float t = fract(vUv.x * uDensity - uTime * uSpeed);
    float band = smoothstep(0.0, 0.30, t) * smoothstep(1.0, 0.62, t);

    // Shade the underside so the tube reads as a cylinder, not a ribbon.
    float shade = 0.62 + 0.38 * smoothstep(0.0, 1.0, sin(vUv.y * 3.14159));

    vec3 col = mix(uBase, uPulse, band) * shade;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

export function FlowTube({
  points,
  radius,
  baseColor,
  pulseColor,
  flowSensor,
  nominalFlow = 380,
  opacity = 1,
  density = 12,
}: {
  points: THREE.Vector3[];
  radius: number;
  baseColor: string;
  pulseColor: string;
  flowSensor?: string;
  nominalFlow?: number;
  opacity?: number;
  density?: number;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.02);
    return new THREE.TubeGeometry(curve, Math.max(24, points.length * 18), radius, 10, false);
  }, [points, radius]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: Math.random() * 10 },
      uSpeed: { value: 0.35 },
      uDensity: { value: density },
      uBase: { value: new THREE.Color(baseColor) },
      uPulse: { value: new THREE.Color(pulseColor) },
      uOpacity: { value: opacity },
    }),
    [baseColor, pulseColor, opacity, density],
  );

  useFrame((_, delta) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value += delta;
    if (flowSensor) {
      const flow = getDisplay(flowSensor);
      // Idle pipes still shimmer slightly so the plant never looks frozen.
      material.current.uniforms.uSpeed.value = 0.08 + (flow / nominalFlow) * 0.42;
    }
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={pipeVertex}
        fragmentShader={pipeFragment}
        transparent={opacity < 1}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ *
 * Aeration: instanced bubbles rising at a rate set by blower output.
 * ------------------------------------------------------------------ */

export function AerationBubbles({
  width,
  depth,
  count = 110,
  sensorId,
  surfaceY,
}: {
  width: number;
  depth: number;
  count?: number;
  sensorId: string;
  surfaceY: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * width * 0.86,
        z: (Math.random() - 0.5) * depth * 0.8,
        offset: Math.random(),
        speed: 0.35 + Math.random() * 0.5,
        scale: 0.018 + Math.random() * 0.026,
      })),
    [count, width, depth],
  );

  const clock = useRef(0);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    clock.current += delta;

    const blower = getDisplay(sensorId) / 100;
    const rate = Math.max(0.12, blower);
    const rise = 0.42;

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const phase = (seed.offset + clock.current * seed.speed * rate) % 1;
      dummy.position.set(seed.x, surfaceY - rise + phase * rise, seed.z);
      const fade = Math.sin(phase * Math.PI);
      const s = seed.scale * (0.4 + fade) * (0.5 + rate);
      dummy.scale.setScalar(Math.max(0.001, s));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#bdeef7" transparent opacity={0.55} />
    </instancedMesh>
  );
}

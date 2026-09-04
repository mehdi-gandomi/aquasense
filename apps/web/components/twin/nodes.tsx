'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  SEVERITY_COLOR,
  toWorld,
  waterColorAt,
  type PlantNode,
  type Severity,
} from '@aquasense/shared';
import { getDisplay } from '@/lib/channels';
import { AerationBubbles, WaterSurface } from './materials';

const CONCRETE = '#153049';
const CONCRETE_DARK = '#0e2437';
const METAL = '#25597f';
const DECK = '#1b3c58';

/** Slowly rotating bridge over a circular clarifier. */
function ScraperBridge({ radius, speedSensor }: { radius: number; speedSensor?: string }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    const rpm = speedSensor ? getDisplay(speedSensor) : 0.03;
    // Real scrapers turn far too slowly to read on screen, so exaggerate.
    group.current.rotation.y += delta * Math.max(0.05, rpm * 12);
  });

  return (
    <group ref={group}>
      <mesh position-y={0.02}>
        <boxGeometry args={[radius * 2 * 0.94, 0.035, 0.06]} />
        <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position-y={0.09}>
        <boxGeometry args={[0.07, 0.14, 0.07]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[radius * 0.82, 0.05, 0]}>
        <boxGeometry args={[0.09, 0.09, 0.12]} />
        <meshStandardMaterial color="#2f7ba3" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

function CircularTank({
  node,
  radius,
  height,
  waterSensor,
  scraperSensor,
  hasScraper = true,
}: {
  node: PlantNode;
  radius: number;
  height: number;
  waterSensor?: string;
  scraperSensor?: string;
  hasScraper?: boolean;
}) {
  return (
    <group>
      <mesh position-y={height / 2}>
        <cylinderGeometry args={[radius, radius, height, 48, 1, true]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={height + 0.005}>
        <torusGeometry args={[radius, 0.028, 8, 48]} />
        <meshStandardMaterial color={DECK} roughness={0.7} />
      </mesh>
      <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={1} />
      </mesh>

      <group position-y={height * 0.86}>
        <WaterSurface
          width={radius * 2 * 0.97}
          depth={radius * 2 * 0.97}
          color={waterColorAt(node.stage)}
          agitationSensor={waterSensor}
          circular
        />
      </group>

      {hasScraper && (
        <group position-y={height * 0.92}>
          <ScraperBridge radius={radius} speedSensor={scraperSensor} />
        </group>
      )}
    </group>
  );
}

function RectBasin({
  node,
  width,
  depth,
  height,
  aeration,
  agitationSensor,
}: {
  node: PlantNode;
  width: number;
  depth: number;
  height: number;
  aeration?: boolean;
  agitationSensor?: string;
}) {
  const wallT = 0.05;
  return (
    <group>
      <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={1} />
      </mesh>

      {[
        [0, -depth / 2, width, wallT],
        [0, depth / 2, width, wallT],
      ].map(([x, z, w, d], i) => (
        <mesh key={`z${i}`} position={[x, height / 2, z]}>
          <boxGeometry args={[w, height, d]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.92} />
        </mesh>
      ))}
      {[-width / 2, width / 2].map((x, i) => (
        <mesh key={`x${i}`} position={[x, height / 2, 0]}>
          <boxGeometry args={[wallT, height, depth + wallT]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.92} />
        </mesh>
      ))}

      <group position-y={height * 0.82}>
        <WaterSurface
          width={width - wallT * 2}
          depth={depth - wallT * 2}
          color={waterColorAt(node.stage)}
          agitationSensor={agitationSensor}
        />
      </group>

      {aeration && agitationSensor && (
        <AerationBubbles
          width={width}
          depth={depth}
          sensorId={agitationSensor}
          surfaceY={height * 0.82}
        />
      )}
    </group>
  );
}

function Building({
  width,
  depth,
  height,
  accent,
}: {
  width: number;
  depth: number;
  height: number;
  accent?: string;
}) {
  return (
    <group>
      <mesh position-y={height / 2}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.88} />
      </mesh>
      <mesh position-y={height + 0.02}>
        <boxGeometry args={[width * 1.05, 0.04, depth * 1.05]} />
        <meshStandardMaterial color={DECK} roughness={0.7} />
      </mesh>
      {accent && (
        <mesh position={[0, height * 0.55, depth / 2 + 0.001]}>
          <planeGeometry args={[width * 0.7, height * 0.12]} />
          <meshBasicMaterial color={accent} />
        </mesh>
      )}
    </group>
  );
}

function ScreeningChannel({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <group>
      <RectBasin
        node={{ stage: 0.05 } as PlantNode}
        width={width}
        depth={depth}
        height={height}
      />
      {/* Bar screen rakes across the channel. */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh
          key={i}
          position={[-width / 2 + 0.18 + (i * (width - 0.36)) / 6, height * 0.62, 0]}
          rotation-x={0.32}
        >
          <boxGeometry args={[0.025, height * 0.95, depth * 0.86]} />
          <meshStandardMaterial color={METAL} metalness={0.55} roughness={0.42} />
        </mesh>
      ))}
    </group>
  );
}

function FilterBank({ width, depth, height }: { width: number; depth: number; height: number }) {
  const rows = 3;
  return (
    <group>
      <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={1} />
      </mesh>
      {Array.from({ length: rows }).map((_, i) => {
        const z = -depth / 2 + depth / (rows * 2) + (i * depth) / rows;
        return (
          <group key={i} position={[0, 0, z]}>
            <mesh position-y={height / 2}>
              <boxGeometry args={[width * 0.9, height, depth / rows - 0.06]} />
              <meshStandardMaterial color={CONCRETE} roughness={0.9} />
            </mesh>
            <mesh position-y={height + 0.005} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[width * 0.82, depth / rows - 0.12]} />
              <meshStandardMaterial
                color="#7fd0e0"
                transparent
                opacity={0.55}
                roughness={0.25}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** UV channel: banks of lamps glowing under a shallow flow. */
function UvChannel({ width, depth, height }: { width: number; depth: number; height: number }) {
  const lamps = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!lamps.current) return;
    const intensity = getDisplay('UVD-INT-01') / 100;
    const flicker = 0.82 + Math.sin(clock.elapsedTime * 9) * 0.05;
    lamps.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (mat?.color) {
        const v = Math.min(1, intensity * flicker);
        mat.color.setRGB(0.42 * v + 0.1, 0.86 * v + 0.1, 1.0 * v);
      }
    });
  });

  return (
    <group>
      <RectBasin
        node={{ stage: 0.95 } as PlantNode}
        width={width}
        depth={depth}
        height={height}
      />
      <group ref={lamps} position-y={height * 0.7}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh
            key={i}
            position={[-width / 2 + 0.22 + (i * (width - 0.44)) / 4, 0, 0]}
            rotation-x={Math.PI / 2}
          >
            <cylinderGeometry args={[0.022, 0.022, depth * 0.82, 8]} />
            <meshBasicMaterial color="#6fd8ee" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Digester({ radius, height }: { radius: number; height: number }) {
  return (
    <group>
      <mesh position-y={height / 2}>
        <cylinderGeometry args={[radius, radius * 1.04, height, 40]} />
        <meshStandardMaterial color="#1a4160" roughness={0.75} metalness={0.2} />
      </mesh>
      <mesh position-y={height + radius * 0.28}>
        <sphereGeometry args={[radius, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        <meshStandardMaterial color="#20557a" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Insulation banding reads as scale reference. */}
      {[0.3, 0.55, 0.8].map((f) => (
        <mesh key={f} position-y={height * f}>
          <torusGeometry args={[radius * 1.01, 0.018, 6, 40]} />
          <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[radius * 0.7, height * 0.5, radius * 0.7]}>
        <cylinderGeometry args={[0.035, 0.035, height, 8]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function GasHolder({ radius }: { radius: number }) {
  const dome = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!dome.current) return;
    // The membrane holder visibly inflates with stored volume.
    const vol = getDisplay('GAS-VOL-01') / 100;
    const s = 0.62 + vol * 0.42;
    dome.current.scale.set(1, s, 1);
  });

  return (
    <group>
      <mesh position-y={0.06}>
        <cylinderGeometry args={[radius * 1.02, radius * 1.02, 0.12, 36]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.9} />
      </mesh>
      <mesh ref={dome} position-y={0.12}>
        <sphereGeometry args={[radius, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#8f7bc9"
          roughness={0.42}
          metalness={0.12}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
}

function ChpUnit({ width, depth, height }: { width: number; depth: number; height: number }) {
  const stack = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!stack.current) return;
    const power = getDisplay('CHP-PWR-01') / 400;
    const mat = stack.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.16 + Math.abs(Math.sin(clock.elapsedTime * 1.6)) * 0.16 * power;
  });

  return (
    <group>
      <Building width={width} depth={depth} height={height} accent="#9b7cd4" />
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, height + 0.28, -depth * 0.2]}>
          <cylinderGeometry args={[0.05, 0.06, 0.56, 12]} />
          <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh ref={stack} position={[0, height + 0.78, -depth * 0.2]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color="#c9b8f0" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function Silo({ radius, height }: { radius: number; height: number }) {
  return (
    <group>
      <mesh position-y={height * 0.62}>
        <cylinderGeometry args={[radius, radius, height * 0.75, 24]} />
        <meshStandardMaterial color="#4a4034" roughness={0.9} />
      </mesh>
      <mesh position-y={height * 0.14}>
        <coneGeometry args={[radius, height * 0.34, 24]} />
        <meshStandardMaterial color="#3a3229" roughness={0.95} />
      </mesh>
      <mesh position-y={height * 1.02}>
        <coneGeometry args={[radius * 1.06, height * 0.22, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Centrifuge({ width, depth, height }: { width: number; depth: number; height: number }) {
  const drum = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!drum.current) return;
    const rpm = getDisplay('DWT-THR-01');
    drum.current.rotation.x += delta * (1.5 + rpm * 0.4);
  });

  return (
    <group>
      <Building width={width} depth={depth} height={height * 0.6} />
      <mesh ref={drum} position={[0, height * 0.82, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[height * 0.24, height * 0.24, width * 0.72, 20]} />
        <meshStandardMaterial color={METAL} metalness={0.65} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Outfall({ width, depth }: { width: number; depth: number }) {
  return (
    <group>
      <mesh position-y={0.04} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#0d2f3d" roughness={0.9} />
      </mesh>
      <group position-y={0.07}>
        <WaterSurface width={width * 0.9} depth={depth * 0.86} color="#bde9f4" />
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.09, (s * depth) / 2]}>
          <boxGeometry args={[width, 0.16, 0.05]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */

function severityRingColor(severity: Severity) {
  return SEVERITY_COLOR[severity];
}

export function NodeMesh({
  node,
  severity,
  selected,
  onSelect,
}: {
  node: PlantNode;
  severity: Severity;
  selected: boolean;
  onSelect: () => void;
}) {
  const [wx, wz] = toWorld(node.x, node.y);
  const w = node.w / 100;
  const d = node.h / 100;
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const mat = ring.current.material as THREE.MeshBasicMaterial;
    if (severity === 'critical') {
      mat.opacity = 0.45 + Math.sin(clock.elapsedTime * 4.5) * 0.35;
    } else {
      mat.opacity = selected ? 0.9 : severity === 'warning' ? 0.55 : 0.16;
    }
  });

  const alarmed = severity === 'critical' || severity === 'warning';
  const ringColor = selected ? '#14afc4' : alarmed ? severityRingColor(severity) : '#1b4462';

  const body = () => {
    switch (node.kind) {
      case 'intake':
        return <Building width={w * 0.8} depth={d * 0.8} height={0.52} accent="#14afc4" />;
      case 'screening':
        return <ScreeningChannel width={w * 0.86} depth={d * 0.7} height={0.3} />;
      case 'clarifier':
        return (
          <CircularTank
            node={node}
            radius={Math.min(w, d) / 2}
            height={0.34}
            waterSensor={node.id === 'primary' ? undefined : 'BIO-BLW-01'}
            scraperSensor={node.id === 'primary' ? 'PRC-RPM-01' : undefined}
          />
        );
      case 'aeration':
        return (
          <RectBasin
            node={node}
            width={w * 0.9}
            depth={d * 0.82}
            height={0.4}
            aeration
            agitationSensor="BIO-BLW-01"
          />
        );
      case 'reactor':
        return <RectBasin node={node} width={w * 0.86} depth={d * 0.78} height={0.34} />;
      case 'filter':
        return <FilterBank width={w * 0.88} depth={d * 0.82} height={0.3} />;
      case 'uv':
        return <UvChannel width={w * 0.86} depth={d * 0.62} height={0.26} />;
      case 'outfall':
        return <Outfall width={w * 0.92} depth={d * 0.8} />;
      case 'thickener':
        return (
          <CircularTank node={node} radius={Math.min(w, d) / 2} height={0.42} hasScraper />
        );
      case 'digester':
        return <Digester radius={Math.min(w, d) / 2.2} height={0.95} />;
      case 'gasholder':
        return <GasHolder radius={Math.min(w, d) / 2.1} />;
      case 'chp':
        return <ChpUnit width={w * 0.78} depth={d * 0.72} height={0.42} />;
      case 'dewatering':
        return <Centrifuge width={w * 0.78} depth={d * 0.72} height={0.5} />;
      case 'silo':
        return <Silo radius={Math.min(w, d) / 3} height={0.7} />;
      default:
        return <Building width={w * 0.8} depth={d * 0.8} height={0.4} />;
    }
  };

  return (
    <group
      position={[wx, 0, wz]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Site pad grounds each unit and carries its alarm state. */}
      <mesh position-y={0.002} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w * 1.12, d * 1.12]} />
        <meshStandardMaterial color="#0a1c2b" roughness={1} />
      </mesh>

      <mesh ref={ring} position-y={0.006} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[Math.max(w, d) * 0.58, Math.max(w, d) * 0.62, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {body()}
    </group>
  );
}

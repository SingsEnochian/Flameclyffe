import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const FORM_LAYERS = [
  { key: 'core', radius: 1.72, scale: 1.02, position: [0, 0, 0], rotation: [0.18, 0.22, 0], spin: 0.085, color: '#c98755', glow: '#e7c477', opacity: 0.11 },
  { key: 'north', radius: 1.44, scale: 0.94, position: [0.08, 0.32, -0.14], rotation: [0.92, -0.18, 0.68], spin: -0.072, color: '#1a4d3a', glow: '#78eec4', opacity: 0.10 },
  { key: 'east', radius: 1.44, scale: 0.94, position: [0.28, -0.02, 0.16], rotation: [-0.38, 1.18, 1.48], spin: 0.068, color: '#9a5a32', glow: '#e7c477', opacity: 0.095 },
  { key: 'south', radius: 1.44, scale: 0.94, position: [-0.02, -0.34, 0.10], rotation: [1.34, -0.46, 2.52], spin: -0.064, color: '#0f2f25', glow: '#78eec4', opacity: 0.10 },
  { key: 'west', radius: 1.44, scale: 0.94, position: [-0.30, 0.04, -0.16], rotation: [-0.96, -1.12, 3.22], spin: 0.070, color: '#c98755', glow: '#e7c477', opacity: 0.095 },
];

function useTetraEdges(radius) {
  return useMemo(() => {
    const geometry = new THREE.TetrahedronGeometry(radius, 0);
    const edges = new THREE.EdgesGeometry(geometry);
    const position = edges.attributes.position;
    const segments = [];

    for (let index = 0; index < position.count; index += 2) {
      segments.push([
        new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index)),
        new THREE.Vector3(position.getX(index + 1), position.getY(index + 1), position.getZ(index + 1)),
      ]);
    }

    geometry.dispose();
    edges.dispose();
    return segments;
  }, [radius]);
}

function TetraShell({ radius, color, glow, opacity, lineOpacity, invert = false }) {
  const edges = useTetraEdges(radius);
  const rotation = invert ? [Math.PI, 0, 0] : [0, 0, 0];

  return (
    <group rotation={rotation}>
      <mesh castShadow receiveShadow>
        <tetrahedronGeometry args={[radius, 0]} />
        <meshPhysicalMaterial
          color={color}
          emissive={glow}
          emissiveIntensity={0.18}
          roughness={0.18}
          metalness={0.05}
          transparent
          opacity={opacity}
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      {edges.map((points, index) => (
        <Line key={index} points={points} color={glow} lineWidth={1.15} transparent opacity={lineOpacity} />
      ))}
    </group>
  );
}

function MerkabaLayer({ layer, lowMotion, grown }) {
  const ref = useRef();
  const reveal = grown ? 1 : 0.16;
  const targetScale = layer.scale * (grown ? 1 : 0.54);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const scale = lowMotion ? targetScale : THREE.MathUtils.lerp(ref.current.scale.x, targetScale, 0.075);
    ref.current.scale.setScalar(scale);

    if (lowMotion || !grown) return;
    ref.current.rotation.x = layer.rotation[0] + Math.sin(t * 0.16 + layer.spin) * 0.035;
    ref.current.rotation.y = layer.rotation[1] + t * layer.spin;
    ref.current.rotation.z = layer.rotation[2] + Math.cos(t * 0.14 + layer.spin) * 0.035;
  });

  return (
    <group ref={ref} position={layer.position} scale={targetScale} rotation={layer.rotation}>
      <TetraShell radius={layer.radius} color={layer.color} glow={layer.glow} opacity={layer.opacity * reveal} lineOpacity={0.68 * reveal} />
      <TetraShell radius={layer.radius * 0.98} color={layer.key === 'core' ? '#1a4d3a' : '#070c09'} glow={layer.key === 'core' ? '#78eec4' : '#d49b54'} opacity={layer.opacity * 0.9 * reveal} lineOpacity={0.58 * reveal} invert />
    </group>
  );
}

function ConvergenceThreads({ lowMotion, growthStage }) {
  const ref = useRef();
  const threads = useMemo(() => [
    [[-3.25, 0.9, -0.95], [-1.65, 0.32, -0.30], [-0.22, 0.04, -0.08]],
    [[3.25, 0.8, -0.65], [1.62, 0.28, -0.18], [0.24, 0.02, 0.08]],
    [[-2.6, -1.35, 0.55], [-1.24, -0.50, 0.18], [-0.08, -0.18, 0.02]],
    [[2.6, -1.25, 0.72], [1.24, -0.44, 0.26], [0.08, -0.14, 0.06]],
    [[0, 2.85, -0.35], [0, 1.25, -0.12], [0, 0.18, 0]],
  ], []);

  useFrame(({ clock }) => {
    if (!ref.current || lowMotion) return;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.12) * 0.032;
  });

  return (
    <group ref={ref}>
      {threads.slice(0, growthStage).map((points, index) => (
        <Line key={index} points={points} color={index % 2 ? '#c98755' : '#2d7a5f'} lineWidth={0.95} transparent opacity={0.20 + growthStage * 0.025} />
      ))}
    </group>
  );
}

function FieldRings({ lowMotion, growthStage }) {
  const ref = useRef();
  const reveal = Math.min(Math.max(growthStage, 1), 5) / 5;

  useFrame(({ clock }) => {
    if (!ref.current || lowMotion) return;
    ref.current.rotation.y = clock.elapsedTime * 0.035;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.1) * 0.035;
  });

  return (
    <group ref={ref}>
      <mesh rotation={[0.54, 0, 0]}>
        <torusGeometry args={[2.92, 0.012, 12, 96]} />
        <meshBasicMaterial color="#78eec4" transparent opacity={0.06 + reveal * 0.08} />
      </mesh>
      <mesh rotation={[1.22, 0.34, 0.74]}>
        <torusGeometry args={[3.12, 0.01, 12, 96]} />
        <meshBasicMaterial color="#c98755" transparent opacity={0.05 + reveal * 0.07} />
      </mesh>
      <mesh rotation={[0.18, 1.22, 1.42]}>
        <torusGeometry args={[2.72, 0.01, 12, 96]} />
        <meshBasicMaterial color="#e7c477" transparent opacity={0.04 + reveal * 0.06} />
      </mesh>
    </group>
  );
}

function FifthFormScene({ lowMotion = false, growthStage = 1 }) {
  const fieldRef = useRef();
  const clampedGrowthStage = Math.max(1, Math.min(growthStage, FORM_LAYERS.length));

  useFrame(({ clock }) => {
    if (!fieldRef.current || lowMotion) return;
    fieldRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.09) * 0.12;
    fieldRef.current.rotation.x = -0.18 + Math.cos(clock.elapsedTime * 0.08) * 0.032;
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.3, 7.4]} fov={41} />
      <ambientLight intensity={0.14} color="#b9d8c8" />
      <directionalLight castShadow position={[3.8, 5.6, 5.8]} intensity={1.08} color="#e7c477" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-2.8, 1.8, 2.8]} intensity={2.1 + clampedGrowthStage * 0.18} color="#2d7a5f" />
      <pointLight position={[2.4, -1.7, 2.2]} intensity={1.5 + clampedGrowthStage * 0.12} color="#c98755" />
      <spotLight castShadow position={[0, 4.3, 3.2]} angle={0.42} penumbra={0.72} intensity={1.45 + clampedGrowthStage * 0.08} color="#e7c477" />

      <group ref={fieldRef} rotation={[-0.18, 0, 0]}>
        <FieldRings lowMotion={lowMotion} growthStage={clampedGrowthStage} />
        <ConvergenceThreads lowMotion={lowMotion} growthStage={clampedGrowthStage} />
        {FORM_LAYERS.map((layer, index) => <MerkabaLayer key={layer.key} layer={layer} lowMotion={lowMotion} grown={index < clampedGrowthStage} />)}
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.05, 0]} receiveShadow>
        <circleGeometry args={[2.85, 96]} />
        <meshStandardMaterial color="#100c08" emissive="#2d1a0e" emissiveIntensity={0.18 + clampedGrowthStage * 0.018} roughness={0.82} metalness={0.35} transparent opacity={0.62} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.01, 0]}>
        <ringGeometry args={[1.45, 2.85, 96]} />
        <meshBasicMaterial color="#c98755" transparent opacity={0.10 + clampedGrowthStage * 0.012} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

export function FifthFormHearth3D({ anchor, growthStage = 1, pulsing = false, lowMotion = false, onPulse }) {
  return (
    <div className={`fifth-form-hearth fifth-form-hearth-3d anchor-${anchor?.key || 'seed'} growth-${growthStage} ${pulsing ? 'is-pulsing' : ''}`}>
      <button className="hearth-pulse-hitbox" type="button" onClick={onPulse} aria-label={`Pulse the ${anchor?.label || 'seed'} Fifth Form hearth`}>
        <span>Pulse Fifth Form hearth</span>
      </button>
      <Canvas className="hearth-three-canvas" shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <FifthFormScene lowMotion={lowMotion} growthStage={growthStage} />
      </Canvas>
      <span className="hearth-label">
        <strong>{anchor?.tone || 'Seed'}</strong>
        <em>{anchor?.label || 'Unanchored hearth'} · {Math.max(1, Math.min(growthStage, 5))}/5</em>
      </span>
    </div>
  );
}

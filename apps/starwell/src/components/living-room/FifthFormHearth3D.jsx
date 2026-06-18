import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const FORM_LAYERS = [
  { key: 'core', radius: 1.46, scale: 1.0, rotation: [0, 0, 0], spin: 0.18, color: '#d49b54', glow: '#e7c477' },
  { key: 'north', radius: 1.08, scale: 0.86, rotation: [0.74, 0.18, 0.64], spin: -0.16, color: '#2d7a5f', glow: '#78eec4' },
  { key: 'east', radius: 1.08, scale: 0.86, rotation: [-0.36, 1.02, 1.42], spin: 0.14, color: '#bf7442', glow: '#e7c477' },
  { key: 'south', radius: 1.08, scale: 0.86, rotation: [1.28, -0.48, 2.42], spin: -0.13, color: '#1a4d3a', glow: '#78eec4' },
  { key: 'west', radius: 1.08, scale: 0.86, rotation: [-0.92, -1.02, 3.12], spin: 0.15, color: '#c98755', glow: '#e7c477' },
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

function TetraShell({ radius, color, glow, invert = false }) {
  const edges = useTetraEdges(radius);
  const rotation = invert ? [Math.PI, 0, 0] : [0, 0, 0];

  return (
    <group rotation={rotation}>
      <mesh castShadow receiveShadow>
        <tetrahedronGeometry args={[radius, 0]} />
        <meshPhysicalMaterial
          color={color}
          emissive={glow}
          emissiveIntensity={0.08}
          roughness={0.38}
          metalness={0.18}
          transparent
          opacity={0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {edges.map((points, index) => (
        <Line key={index} points={points} color={glow} lineWidth={1.4} transparent opacity={0.58} />
      ))}
    </group>
  );
}

function MerkabaLayer({ layer, lowMotion }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current || lowMotion) return;
    const t = clock.elapsedTime;
    ref.current.rotation.x = layer.rotation[0] + Math.sin(t * 0.18 + layer.spin) * 0.055;
    ref.current.rotation.y = layer.rotation[1] + t * layer.spin;
    ref.current.rotation.z = layer.rotation[2] + Math.cos(t * 0.16 + layer.spin) * 0.055;
  });

  return (
    <group ref={ref} scale={layer.scale} rotation={layer.rotation}>
      <TetraShell radius={layer.radius} color={layer.color} glow={layer.glow} />
      <TetraShell radius={layer.radius} color={layer.key === 'core' ? '#1a4d3a' : '#0f2f25'} glow={layer.key === 'core' ? '#78eec4' : '#d49b54'} invert />
    </group>
  );
}

function ConvergenceThreads({ lowMotion }) {
  const ref = useRef();
  const threads = useMemo(() => [
    [[-3.1, 0.9, -0.8], [-1.4, 0.42, -0.28], [0, 0, 0]],
    [[3.1, 0.8, -0.5], [1.4, 0.32, -0.18], [0, 0, 0]],
    [[-2.6, -1.2, 0.55], [-1.1, -0.42, 0.18], [0, 0, 0]],
    [[2.6, -1.1, 0.65], [1.1, -0.36, 0.24], [0, 0, 0]],
    [[0, 2.65, -0.35], [0, 1.12, -0.12], [0, 0, 0]],
  ], []);

  useFrame(({ clock }) => {
    if (!ref.current || lowMotion) return;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.16) * 0.045;
  });

  return (
    <group ref={ref}>
      {threads.map((points, index) => (
        <Line key={index} points={points} color={index % 2 ? '#d49b54' : '#2d7a5f'} lineWidth={1.1} transparent opacity={0.36} />
      ))}
    </group>
  );
}

function FifthFormScene({ lowMotion = false }) {
  const fieldRef = useRef();

  useFrame(({ clock }) => {
    if (!fieldRef.current || lowMotion) return;
    fieldRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.12) * 0.16;
    fieldRef.current.rotation.x = -0.18 + Math.cos(clock.elapsedTime * 0.10) * 0.04;
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.35, 7.2]} fov={42} />
      <color attach="background" args={['#020604']} />
      <ambientLight intensity={0.24} />
      <directionalLight castShadow position={[3.2, 4.6, 5.4]} intensity={1.1} color="#e7c477" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-2.7, 1.8, 2.8]} intensity={2.3} color="#2d7a5f" />
      <pointLight position={[2.2, -1.8, 2.2]} intensity={1.5} color="#bf7442" />
      <spotLight castShadow position={[0, 4.2, 2.5]} angle={0.44} penumbra={0.64} intensity={1.8} color="#e7c477" />

      <group ref={fieldRef} rotation={[-0.18, 0, 0]}>
        <ConvergenceThreads lowMotion={lowMotion} />
        {FORM_LAYERS.map((layer) => <MerkabaLayer key={layer.key} layer={layer} lowMotion={lowMotion} />)}
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.05, 0]} receiveShadow>
        <circleGeometry args={[2.7, 96]} />
        <meshStandardMaterial color="#100c08" emissive="#2d1a0e" emissiveIntensity={0.22} roughness={0.78} metalness={0.32} transparent opacity={0.82} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.02, 0]}>
        <ringGeometry args={[1.45, 2.75, 96]} />
        <meshBasicMaterial color="#c98755" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

export function FifthFormHearth3D({ anchor, pulsing = false, lowMotion = false, onPulse }) {
  return (
    <div className={`fifth-form-hearth fifth-form-hearth-3d anchor-${anchor?.key || 'seed'} ${pulsing ? 'is-pulsing' : ''}`}>
      <button className="hearth-pulse-hitbox" type="button" onClick={onPulse} aria-label={`Pulse the ${anchor?.label || 'seed'} Fifth Form hearth`}>
        <span>Pulse Fifth Form hearth</span>
      </button>
      <Canvas className="hearth-three-canvas" shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
        <FifthFormScene lowMotion={lowMotion} />
      </Canvas>
      <span className="hearth-label">
        <strong>{anchor?.tone || 'Seed'}</strong>
        <em>{anchor?.label || 'Unanchored hearth'}</em>
      </span>
    </div>
  );
}

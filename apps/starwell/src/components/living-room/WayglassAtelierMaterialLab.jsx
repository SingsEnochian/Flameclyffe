import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

const FINISHES = {
  copper: { label: 'Brushed copper', color: '#bb7952', metalness: 0.9, roughness: 0.28, clearcoat: 0.24 },
  titanium: { label: 'Dark titanium', color: '#64717a', metalness: 0.94, roughness: 0.34, clearcoat: 0.12 },
  glass: { label: 'Smoked glass', color: '#7da9a1', metalness: 0.05, roughness: 0.12, transmission: 0.75, thickness: 0.6, ior: 1.48 },
};
export const ATELIER_FINISHES = FINISHES;

function HarbourObject({ finish }) {
  const material = FINISHES[finish];
  return (
    <group rotation={[0.25, 0.45, 0]}>
      <mesh castShadow receiveShadow>
        <octahedronGeometry args={[1.25, 0]} />
        <meshPhysicalMaterial {...material} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0, 1.24, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <tetrahedronGeometry args={[0.9, 0]} />
        <meshPhysicalMaterial color="#c9a76a" metalness={0.86} roughness={0.22} />
      </mesh>
      <mesh position={[0, -1.24, 0]} rotation={[Math.PI, Math.PI / 4, 0]} castShadow>
        <tetrahedronGeometry args={[0.9, 0]} />
        <meshPhysicalMaterial color="#c9a76a" metalness={0.86} roughness={0.22} />
      </mesh>
    </group>
  );
}

export function WayglassAtelierMaterialLab() {
  const [finish, setFinish] = useState('copper');
  const [quality, setQuality] = useState('balanced');
  const [enabled, setEnabled] = useState(false);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <section aria-label="Wayglass Atelier Three.js material laboratory" style={{ textAlign: 'left' }}>
      <h3>Atelier · Fold Harbour material laboratory</h3>
      <p>Interactive geometry study. Materials are procedural PBR presets, not yet photographic texture scans. No docking state or live provider is connected.</p>
      <div role="group" aria-label="Hull finish">
        {Object.entries(FINISHES).map(([key, value]) => (
          <button key={key} type="button" className="living-toggle" aria-pressed={finish === key} onClick={() => setFinish(key)}>{value.label}</button>
        ))}
      </div>
      <label htmlFor="atelier-quality">Render quality </label>
      <select id="atelier-quality" value={quality} onChange={event => setQuality(event.target.value)}>
        <option value="economy">Economy</option><option value="balanced">Balanced</option><option value="high">High</option>
      </select>
      <button type="button" className="living-toggle" aria-pressed={enabled} onClick={() => setEnabled(value => !value)}>
        {enabled ? 'Stop 3D preview' : 'Start 3D preview'}
      </button>
      <p role="status">Finish: {FINISHES[finish].label}. Quality: {quality}. {enabled ? '3D preview active.' : '3D preview stopped.'}</p>
      {enabled && (
        <div style={{ width: '100%', height: 'min(62vw, 420px)', minHeight: 260, borderRadius: 18, overflow: 'hidden', background: '#07131b' }}>
          <Canvas dpr={quality === 'economy' ? 1 : quality === 'high' ? [1, 2] : [1, 1.5]} gl={{ antialias: quality !== 'economy', powerPreference: quality === 'high' ? 'high-performance' : 'default' }} shadows={quality === 'high'} frameloop="demand" camera={{ position: [3.6, 2.5, 5.5], fov: 42 }} fallback={<p>WebGL unavailable. Material controls remain accessible.</p>}>
            <color attach="background" args={['#07131b']} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 4]} intensity={3} color="#f5d9a2" castShadow={quality === 'high'} />
            <directionalLight position={[-4, 2, -3]} intensity={2} color="#72b7ad" />
            <Suspense fallback={null}><Environment preset="city" /><HarbourObject finish={finish} /></Suspense>
            <OrbitControls enablePan={false} enableDamping={!reducedMotion} minDistance={3.2} maxDistance={11} />
          </Canvas>
        </div>
      )}
      <p><small>Rotate with pointer or touch. Stop the preview to release the WebGL scene. The ordinary room remains usable without 3D.</small></p>
    </section>
  );
}

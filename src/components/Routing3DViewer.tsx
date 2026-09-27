import React, { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { RoutingState, RoutingSegment, RoutingVia, RoutingPin } from '../utils/routingEngine';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  Box, 
  RotateCw, 
  Layers, 
  Compass, 
  Sparkles,
  Info
} from 'lucide-react';

interface Routing3DViewerProps {
  routingState: RoutingState;
  selectedNetId: string | null;
  onSelectNet: (netId: string) => void;
  onInspectElement: (element: { type: 'net' | 'via' | 'pin' | 'macro'; data: any }) => void;
  activeLayers: Record<string, boolean>;
  showVias: boolean;
  showCTSBackbone: boolean;
}

// Coordinate mapping: 2D (540x640) into 3D scene [-6..6, -6..6]
function map2DTo3D(x?: number, y?: number, zOffset: number = 0): [number, number, number] {
  const normX = ((x ?? 270) - 270) / 45;
  const normZ = ((y ?? 320) - 320) / 45;
  return [normX, zOffset, normZ];
}

// Camera Preset Controller
function CameraController({ cameraPreset }: { cameraPreset: 'iso' | 'top' | 'front' | 'exploded' }) {
  const { camera } = useThree();

  React.useEffect(() => {
    if (cameraPreset === 'iso') {
      camera.position.set(11, 10, 12);
      camera.lookAt(0, 0, 0);
    } else if (cameraPreset === 'top') {
      camera.position.set(0, 16, 0.01);
      camera.lookAt(0, 0, 0);
    } else if (cameraPreset === 'front') {
      camera.position.set(0, 4, 15);
      camera.lookAt(0, 0.5, 0);
    } else if (cameraPreset === 'exploded') {
      camera.position.set(13, 8, 10);
      camera.lookAt(0, 2, 0);
    }
  }, [cameraPreset, camera]);

  return null;
}

// 3D Macro IP Block
function Macro3D({
  macro,
  exploded,
  onClick
}: {
  macro: any;
  exploded: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const centerX = macro.x + macro.width / 2;
  const centerY = macro.y + macro.height / 2;
  const [x, , z] = map2DTo3D(centerX, centerY);
  const w3d = Math.max(0.5, macro.width / 45);
  const d3d = Math.max(0.5, macro.height / 45);
  const h3d = 0.55;

  const yPos = exploded ? 0.35 : h3d / 2;

  return (
    <group position={[x, yPos, z]}>
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[w3d, h3d, d3d]} />
        <meshStandardMaterial
          color={hovered ? '#E2E8F0' : '#CBD5E1'}
          roughness={0.3}
          metalness={0.4}
          emissive={hovered ? '#64748B' : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w3d, h3d, d3d)]} />
        <lineBasicMaterial color="#475569" linewidth={1.5} />
      </lineSegments>

      <Text
        position={[0, h3d / 2 + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(0.42, w3d * 0.18)}
        color="#1E293B"
        anchorX="center"
        anchorY="middle"
      >
        {macro.name}
      </Text>
    </group>
  );
}

// 3D Metal Wire Segment
function WireSegment3D({
  segment,
  exploded,
  isSelected,
  onClick
}: {
  segment: RoutingSegment;
  exploded: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  // Layer Elevation in Metal Stack
  const layerElevMap: Record<string, number> = {
    M1: 0.18,
    M2: 0.32,
    M3: 0.46,
    M4: 0.60,
    M5: 0.76,
    M6: 0.94
  };

  const baseElev = layerElevMap[segment.layer] || 0.3;
  const yElev = exploded ? baseElev * 3.2 : baseElev;

  const [p1x, , p1z] = map2DTo3D(segment.from.x, segment.from.y);
  const [p2x, , p2z] = map2DTo3D(segment.to.x, segment.to.y);

  const startPoint: [number, number, number] = [p1x, yElev, p1z];
  const endPoint: [number, number, number] = [p2x, yElev, p2z];

  const vStart = new THREE.Vector3(...startPoint);
  const vEnd = new THREE.Vector3(...endPoint);
  const dist = vStart.distanceTo(vEnd);

  if (dist < 0.04) return null;

  const vMid = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(vEnd, vStart).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

  const wireWidth = Math.max(0.025, segment.width * 0.012);
  const wireColor = isSelected ? '#38BDF8' : '#10B981';

  return (
    <mesh
      position={vMid}
      quaternion={quat}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <cylinderGeometry args={[wireWidth, wireWidth, dist, 6]} />
      <meshStandardMaterial
        color={wireColor}
        emissive={wireColor}
        emissiveIntensity={isSelected ? 1.6 : 0.75}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

// 3D Via Contact (Pink / Magenta Vertical Cylinder connecting layers)
function Via3D({
  via,
  exploded,
  isSelected,
  onClick
}: {
  via: RoutingVia;
  exploded: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [x, , z] = map2DTo3D(via.x, via.y);
  const yPos = exploded ? 1.1 : 0.36;

  return (
    <group position={[x, yPos, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh>
        <cylinderGeometry args={[0.07, 0.07, exploded ? 0.45 : 0.18, 12]} />
        <meshStandardMaterial
          color={isSelected ? '#38BDF8' : '#EC4899'}
          emissive={isSelected ? '#38BDF8' : '#DB2777'}
          emissiveIntensity={isSelected ? 2.0 : 1.2}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// 3D Perimeter Macro Pin (Pink / Magenta Sphere)
function Pin3D({
  pin,
  exploded,
  onClick
}: {
  pin: RoutingPin;
  exploded: boolean;
  onClick: () => void;
}) {
  const [x, , z] = map2DTo3D(pin.x, pin.y);
  const yPos = exploded ? 0.7 : 0.22;

  return (
    <mesh position={[x, yPos, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <sphereGeometry args={[0.08, 10, 10]} />
      <meshStandardMaterial
        color="#EC4899"
        emissive="#BE185D"
        emissiveIntensity={1.4}
        metalness={0.7}
      />
    </mesh>
  );
}

// 3D Silicon Scene Assembly
function Routing3DScene({
  routingState,
  selectedNetId,
  onSelectNet,
  onInspectElement,
  activeLayers,
  showVias,
  showCTSBackbone,
  exploded
}: {
  routingState: RoutingState;
  selectedNetId: string | null;
  onSelectNet: (id: string) => void;
  onInspectElement: (elem: any) => void;
  activeLayers: Record<string, boolean>;
  showVias: boolean;
  showCTSBackbone: boolean;
  exploded: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[10, 18, 10]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 12, -10]} intensity={0.7} />
      <pointLight position={[0, 8, 0]} intensity={1.2} color="#10B981" />

      {/* Silicon Die Substrate */}
      <group position={[0, exploded ? -0.4 : -0.2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[12.6, 0.35, 14.6]} />
          <meshStandardMaterial color="#1E2025" roughness={0.6} metalness={0.3} />
        </mesh>
        <gridHelper args={[14, 14, '#475569', '#334155']} position={[0, 0.22, 0]} />
      </group>

      {/* 4 Corner Macros */}
      {routingState.macros.map((m) => (
        <Macro3D
          key={m.id}
          macro={m}
          exploded={exploded}
          onClick={() => onInspectElement({ type: 'macro', data: m })}
        />
      ))}

      {/* Central Core Area Floor */}
      <group position={[0, exploded ? 0.15 : 0.04, -0.45]}>
        <mesh receiveShadow>
          <boxGeometry args={[3.8, 0.08, 1.9]} />
          <meshStandardMaterial color="#FEF08A" opacity={0.85} transparent />
        </mesh>
        <Text
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.35}
          color="#1E293B"
          anchorX="center"
          anchorY="middle"
        >
          CORE AREA
        </Text>
      </group>

      {/* Stage 4 CTS Clock Tree Backbone Underlay (Orange/Amber) */}
      {showCTSBackbone &&
        routingState.ctsUnderlay.trunks.map((t, idx) => {
          const [p1x, , p1z] = map2DTo3D(t.x1, t.y1);
          const [p2x, , p2z] = map2DTo3D(t.x2, t.y2);
          const yElev = exploded ? 2.5 : 0.65;
          const vStart = new THREE.Vector3(p1x, yElev, p1z);
          const vEnd = new THREE.Vector3(p2x, yElev, p2z);
          const dist = vStart.distanceTo(vEnd);
          if (dist < 0.05) return null;
          const vMid = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);
          const dir = new THREE.Vector3().subVectors(vEnd, vStart).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

          return (
            <mesh key={`cts_${idx}`} position={vMid} quaternion={quat}>
              <cylinderGeometry args={[0.07, 0.07, dist, 8]} />
              <meshStandardMaterial
                color="#F59E0B"
                emissive="#D97706"
                emissiveIntensity={1.2}
                transparent
                opacity={0.7}
              />
            </mesh>
          );
        })}

      {/* Signal Routing Wire Segments (Green) */}
      {routingState.allSegments.map((seg) => {
        if (!activeLayers[seg.layer]) return null;
        const isSelected = selectedNetId === seg.netId;
        return (
          <WireSegment3D
            key={seg.id}
            segment={seg}
            exploded={exploded}
            isSelected={isSelected}
            onClick={() => {
              onSelectNet(seg.netId);
              const parentNet = routingState.nets.find(n => n.id === seg.netId);
              if (parentNet) onInspectElement({ type: 'net', data: parentNet });
            }}
          />
        );
      })}

      {/* Vias (Pink / Magenta contact cuts) */}
      {showVias &&
        routingState.allVias.map((via) => (
          <Via3D
            key={via.id}
            via={via}
            exploded={exploded}
            isSelected={selectedNetId === via.netId}
            onClick={() => onInspectElement({ type: 'via', data: via })}
          />
        ))}

      {/* Macro Perimeter Landing Pins */}
      {routingState.allPins.slice(0, 36).map((pin) => (
        <Pin3D
          key={pin.id}
          pin={pin}
          exploded={exploded}
          onClick={() => onInspectElement({ type: 'pin', data: pin })}
        />
      ))}
    </>
  );
}

export function Routing3DViewer({
  routingState,
  selectedNetId,
  onSelectNet,
  onInspectElement,
  activeLayers,
  showVias,
  showCTSBackbone
}: Routing3DViewerProps) {
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'exploded'>('iso');
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  return (
    <div className="relative w-full h-full min-h-[520px] bg-[#0D0E11] overflow-hidden select-none flex flex-col">
      {/* Floating 3D Toolbar Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider px-2">
          3D Perspective:
        </span>

        <button
          onClick={() => setCameraPreset('iso')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            cameraPreset === 'iso'
              ? 'bg-purple-500 text-white font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Isometric
        </button>

        <button
          onClick={() => setCameraPreset('top')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            cameraPreset === 'top'
              ? 'bg-purple-500 text-white font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Top-Down
        </button>

        <button
          onClick={() => setCameraPreset('front')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            cameraPreset === 'front'
              ? 'bg-purple-500 text-white font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Front
        </button>

        <div className="h-4 w-px bg-white/20 mx-1" />

        {/* Exploded Metal Layers View */}
        <button
          onClick={() => {
            const next = !exploded;
            setExploded(next);
            if (next) setCameraPreset('exploded');
          }}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            exploded
              ? 'bg-cyan-500 text-black font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="Separate Metal Layers (M1–M6) and Vias into 3D Exploded View"
        >
          <Layers size={13} />
          <span>{exploded ? 'Collapse Stack' : 'Explode Metal Stack'}</span>
        </button>

        {/* Auto Rotate Turntable */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded-md border text-xs transition-all ${
            autoRotate
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
          }`}
          title="Toggle Turntable Rotation"
        >
          <RotateCw size={13} className={autoRotate ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Floating 3D Interaction Guide */}
      <div className="absolute bottom-3 left-3 z-10 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-gray-400 flex items-center space-x-2">
        <Compass size={13} className="text-purple-400" />
        <span>Rotate: Left Drag • Pan: Right Drag • Zoom: Scroll • Click any net/via/macro to inspect</span>
      </div>

      {/* Three.js Canvas Container */}
      <div className="flex-1 w-full h-full min-h-[500px] cursor-grab active:cursor-grabbing">
        <ErrorBoundary>
          <Canvas
            camera={{ position: [11, 10, 12], fov: 42 }}
            shadows
            gl={{ antialias: true, alpha: true }}
            className="w-full h-full"
          >
            <Suspense fallback={null}>
              <CameraController cameraPreset={cameraPreset} />
              <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.06}
                autoRotate={autoRotate}
                autoRotateSpeed={1.5}
                minDistance={3}
                maxDistance={35}
                maxPolarAngle={Math.PI / 2 - 0.02}
              />
              <Routing3DScene
                routingState={routingState}
                selectedNetId={selectedNetId}
                onSelectNet={onSelectNet}
                onInspectElement={onInspectElement}
                activeLayers={activeLayers}
                showVias={showVias}
                showCTSBackbone={showCTSBackbone}
                exploded={exploded}
              />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </div>
    </div>
  );
}

import React, { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ClockTreeState, LayoutMacro, ClockBufferNode, ClockSink } from '../utils/clockTreeEngine';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  Box, 
  RotateCw, 
  Layers, 
  Compass, 
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';

interface CTS3DViewerProps {
  ctsState: ClockTreeState;
  selectedElement: {
    type: 'macro' | 'sink' | 'buffer' | 'trunk' | 'clk_pad';
    data: any;
  } | null;
  onSelectElement: (elem: { type: 'macro' | 'sink' | 'buffer' | 'trunk' | 'clk_pad'; data: any } | null) => void;
  showBuffers?: boolean;
  showPlacementMesh?: boolean;
  showPulseAnimation?: boolean;
}

// Coordinate space mapping from 2D SVG canvas (540x640) into 3D scene [-6..6, -6..6]
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

// 3D Animated Clock Wavefront Pulse on Spine Wire
function WavefrontPulse({ 
  from, 
  to, 
  speed = 1.8, 
  color = '#FEF08A' 
}: { 
  from: [number, number, number]; 
  to: [number, number, number]; 
  speed?: number; 
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = (state.clock.elapsedTime * speed) % 1;
    meshRef.current.position.x = from[0] + (to[0] - from[0]) * t;
    meshRef.current.position.y = from[1] + (to[1] - from[1]) * t;
    meshRef.current.position.z = from[2] + (to[2] - from[2]) * t;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.09, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} />
    </mesh>
  );
}

// 3D Macro Component
function Macro3D({
  macro,
  exploded,
  isSelected,
  onClick
}: {
  macro: LayoutMacro;
  exploded: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const centerX = macro.x + macro.width / 2;
  const centerY = macro.y + macro.height / 2;
  const [x, , z] = map2DTo3D(centerX, centerY);
  const w3d = Math.max(0.5, macro.width / 45);
  const d3d = Math.max(0.5, macro.height / 45);
  const h3d = 0.55;

  const yPos = exploded ? 1.4 : h3d / 2;

  return (
    <group position={[x, yPos, z]}>
      {/* Silicon Macro Substrate Box */}
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
          color={isSelected ? '#38BDF8' : hovered ? '#E2E8F0' : '#CBD5E1'}
          roughness={0.25}
          metalness={0.4}
          emissive={isSelected ? '#0284C7' : hovered ? '#94A3B8' : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : hovered ? 0.15 : 0}
        />
      </mesh>

      {/* Wireframe Outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w3d, h3d, d3d)]} />
        <lineBasicMaterial color={isSelected ? '#0284C7' : '#64748B'} linewidth={1.5} />
      </lineSegments>

      {/* Macro Name 3D Text Header */}
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

      {/* Sub-label showing functional type */}
      <Text
        position={[0, h3d / 2 + 0.02, 0.35]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="#475569"
        anchorX="center"
        anchorY="middle"
      >
        {`[${(macro.type || 'IP').toUpperCase()}]`}
      </Text>

      {/* Clock Input Pin Cylinder */}
      <mesh position={[macro.clockPin.x / 45 - centerX / 45, h3d / 2 + 0.08, macro.clockPin.y / 45 - centerY / 45]}>
        <cylinderGeometry args={[0.08, 0.08, 0.16, 16]} />
        <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

// 3D Standard Cell Placement Region
function PlacementArea3D({
  area,
  exploded,
  onSelectSink,
  selectedSinkId
}: {
  area: any;
  exploded: boolean;
  onSelectSink: (sink: ClockSink) => void;
  selectedSinkId?: string;
}) {
  const centerX = area.x + area.width / 2;
  const centerY = area.y + area.height / 2;
  const [x, , z] = map2DTo3D(centerX, centerY);
  const w3d = Math.max(0.4, area.width / 45);
  const d3d = Math.max(0.4, area.height / 45);
  const h3d = 0.15;
  const yPos = exploded ? 0.4 : h3d / 2;

  return (
    <group position={[x, yPos, z]}>
      {/* Hatched placement floor */}
      <mesh receiveShadow>
        <boxGeometry args={[w3d, h3d, d3d]} />
        <meshStandardMaterial
          color="#FEF08A"
          roughness={0.7}
          metalness={0.1}
          transparent
          opacity={0.88}
        />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w3d, h3d, d3d)]} />
        <lineBasicMaterial color="#A16207" />
      </lineSegments>

      {area.label === 'CORE AREA' && (
        <Text
          position={[0, h3d / 2 + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="#1E293B"
          anchorX="center"
          anchorY="middle"
        >
          CORE AREA
        </Text>
      )}

      {/* Individual Flip-Flop Sinks */}
      {area.cells?.map((sink: ClockSink) => {
        const [sx, , sz] = map2DTo3D(sink.x, sink.y);
        const relX = sx - x;
        const relZ = sz - z;
        const isSelected = selectedSinkId === sink.id;

        return (
          <mesh
            key={sink.id}
            position={[relX, h3d / 2 + 0.08, relZ]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSink(sink);
            }}
          >
            <boxGeometry args={[0.16, 0.16, 0.16]} />
            <meshStandardMaterial
              color={isSelected ? '#38BDF8' : '#7C3AED'}
              emissive={isSelected ? '#38BDF8' : '#6D28D9'}
              emissiveIntensity={isSelected ? 1.2 : 0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// 3D Clock Tree Wire Segment
function ClockWire3D({
  wire,
  exploded,
  isSelected,
  showPulse,
  onClick
}: {
  wire: any;
  exploded: boolean;
  isSelected: boolean;
  showPulse: boolean;
  onClick: () => void;
}) {
  const [p1x, , p1z] = map2DTo3D(wire.from?.x, wire.from?.y);
  const [p2x, , p2z] = map2DTo3D(wire.to?.x, wire.to?.y);

  const baseElev = wire.level === 0 ? 0.7 : wire.level === 1 ? 0.55 : wire.level === 2 ? 0.38 : 0.22;
  const yElev = exploded ? baseElev * 2.8 : baseElev;

  const startPoint: [number, number, number] = [p1x, yElev, p1z];
  const endPoint: [number, number, number] = [p2x, yElev, p2z];

  const vStart = new THREE.Vector3(...startPoint);
  const vEnd = new THREE.Vector3(...endPoint);
  const dist = vStart.distanceTo(vEnd);

  // If wire distance is negligible, don't render cylinder to avoid zero/NaN normal
  if (dist < 0.05) return null;

  const vMid = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(vEnd, vStart).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

  const wireRadius = Math.max(0.025, (wire.width || 4) * 0.012);
  const wireColor = isSelected ? '#38BDF8' : wire.color || '#F59E0B';

  return (
    <group>
      <mesh
        position={vMid}
        quaternion={quat}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <cylinderGeometry args={[wireRadius, wireRadius, dist, 8]} />
        <meshStandardMaterial
          color={wireColor}
          emissive={wireColor}
          emissiveIntensity={isSelected ? 1.5 : 0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Pulse Animation */}
      {showPulse && wire.level <= 1 && (
        <WavefrontPulse from={startPoint} to={endPoint} speed={2.2} color="#FEF08A" />
      )}
    </group>
  );
}

// 3D Buffer / Repeater Element
function ClockBuffer3D({
  buf,
  exploded,
  isSelected,
  onClick
}: {
  buf: ClockBufferNode;
  exploded: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [x, , z] = map2DTo3D(buf.x, buf.y);
  const yPos = exploded ? 1.8 : 0.5;

  return (
    <group position={[x, yPos, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.16, 0.28, 4]} />
        <meshStandardMaterial
          color={isSelected ? '#38BDF8' : '#EA580C'}
          emissive={isSelected ? '#38BDF8' : '#EA580C'}
          emissiveIntensity={isSelected ? 1.5 : 0.9}
        />
      </mesh>
    </group>
  );
}

// 3D Silicon Substrate & I/O Ring
function SiliconSubstrate3D({ exploded }: { exploded: boolean }) {
  const yPos = exploded ? -0.4 : -0.2;

  return (
    <group position={[0, yPos, 0]}>
      {/* Silicon Die Wafer Base */}
      <mesh receiveShadow>
        <boxGeometry args={[12.6, 0.35, 14.6]} />
        <meshStandardMaterial color="#1E2025" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* I/O Ring Perimeter Border */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[12.4, 0.05, 14.4]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Ground Grid lines */}
      <gridHelper args={[14, 14, '#475569', '#334155']} position={[0, 0.22, 0]} />
    </group>
  );
}

// 3D Bottom CLK Input Pad
function ClockPad3D({
  pos,
  exploded,
  isSelected,
  onClick
}: {
  pos: { x: number; y: number };
  exploded: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [x, , z] = map2DTo3D(pos.x, pos.y);
  const yPos = exploded ? 0.2 : 0.08;

  return (
    <group position={[x, yPos, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh>
        <boxGeometry args={[0.9, 0.2, 0.5]} />
        <meshStandardMaterial
          color={isSelected ? '#38BDF8' : '#D97706'}
          emissive={isSelected ? '#38BDF8' : '#D97706'}
          emissiveIntensity={1.2}
        />
      </mesh>
      <Text
        position={[0, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
      >
        CLK PAD
      </Text>
    </group>
  );
}

// Main 3D Scene Assembly
function CTS3DScene({
  ctsState,
  exploded,
  selectedElement,
  onSelectElement,
  showBuffers,
  showPlacementMesh,
  showPulseAnimation
}: {
  ctsState: ClockTreeState;
  exploded: boolean;
  selectedElement: any;
  onSelectElement: any;
  showBuffers: boolean;
  showPlacementMesh: boolean;
  showPulseAnimation: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[10, 18, 10]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 12, -10]} intensity={0.7} />
      <pointLight position={[0, 8, 0]} intensity={1.2} color="#F59E0B" />

      {/* Silicon Die Substrate & I/O Ring */}
      <SiliconSubstrate3D exploded={exploded} />

      {/* Macro Blocks in 3D */}
      {ctsState.macros.map((macro) => (
        <Macro3D
          key={macro.id}
          macro={macro}
          exploded={exploded}
          isSelected={selectedElement?.data?.id === macro.id}
          onClick={() => onSelectElement({ type: 'macro', data: macro })}
        />
      ))}

      {/* Standard Cell Core Placement Areas in 3D */}
      {showPlacementMesh &&
        ctsState.placementAreas.map((area) => (
          <PlacementArea3D
            key={area.id}
            area={area}
            exploded={exploded}
            selectedSinkId={selectedElement?.type === 'sink' ? selectedElement.data.id : undefined}
            onSelectSink={(sink) => onSelectElement({ type: 'sink', data: sink })}
          />
        ))}

      {/* Clock Tree Routing Spines & Trunks */}
      {ctsState.clockWires.map((wire) => (
        <ClockWire3D
          key={wire.id}
          wire={wire}
          exploded={exploded}
          isSelected={selectedElement?.data?.id === wire.id}
          showPulse={showPulseAnimation}
          onClick={() => onSelectElement({ type: 'trunk', data: wire })}
        />
      ))}

      {/* Clock Repeaters / Buffers */}
      {showBuffers &&
        ctsState.clockBuffers.map((buf) => (
          <ClockBuffer3D
            key={buf.id}
            buf={buf}
            exploded={exploded}
            isSelected={selectedElement?.data?.id === buf.id}
            onClick={() => onSelectElement({ type: 'buffer', data: buf })}
          />
        ))}

      {/* Primary CLK Input Pad */}
      <ClockPad3D
        pos={ctsState.clkPadPos}
        exploded={exploded}
        isSelected={selectedElement?.type === 'clk_pad'}
        onClick={() =>
          onSelectElement({
            type: 'clk_pad',
            data: {
              location: ctsState.clkPadLocation,
              pos: ctsState.clkPadPos,
              frequencyMhz: ctsState.frequencyMhz
            }
          })
        }
      />
    </>
  );
}

export function CTS3DViewer({
  ctsState,
  selectedElement,
  onSelectElement,
  showBuffers = true,
  showPlacementMesh = true,
  showPulseAnimation = true
}: CTS3DViewerProps) {
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'exploded'>('iso');
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  return (
    <div className="relative w-full h-full min-h-[520px] bg-[#0D0E11] overflow-hidden select-none flex flex-col">
      {/* Floating 3D Toolbar Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider px-2">
          3D Camera:
        </span>

        <button
          onClick={() => setCameraPreset('iso')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            cameraPreset === 'iso'
              ? 'bg-amber-500 text-black font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Isometric
        </button>

        <button
          onClick={() => setCameraPreset('top')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            cameraPreset === 'top'
              ? 'bg-amber-500 text-black font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Top-Down
        </button>

        <button
          onClick={() => setCameraPreset('front')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            cameraPreset === 'front'
              ? 'bg-amber-500 text-black font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Front
        </button>

        <div className="h-4 w-px bg-white/20 mx-1" />

        {/* Exploded Silicon Layers View */}
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
          title="Separate Metal Layers, Clock Spines, and Silicon Substrate into 3D Exploded View"
        >
          <Layers size={13} />
          <span>{exploded ? 'Collapse Stack' : 'Explode Layers'}</span>
        </button>

        {/* Auto Rotate Turntable */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded-md border text-xs transition-all ${
            autoRotate
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
          }`}
          title="Toggle Turntable Rotation"
        >
          <RotateCw size={13} className={autoRotate ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Floating 3D Interaction Guide */}
      <div className="absolute bottom-3 left-3 z-10 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-gray-400 flex items-center space-x-2">
        <Compass size={13} className="text-amber-400" />
        <span>Rotate: Left Drag • Pan: Right Drag • Zoom: Scroll • Click any block to view how it works</span>
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
              <CTS3DScene
                ctsState={ctsState}
                exploded={exploded}
                selectedElement={selectedElement}
                onSelectElement={onSelectElement}
                showBuffers={showBuffers}
                showPlacementMesh={showPlacementMesh}
                showPulseAnimation={showPulseAnimation}
              />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </div>
    </div>
  );
}

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ErrorBoundary } from './ErrorBoundary';
import { StandardCellInfo } from './PlacementCellCircuitView';
import { 
  Box, 
  Layers, 
  RotateCw, 
  Maximize2, 
  Sliders, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Cpu, 
  CheckCircle2, 
  Activity, 
  Play, 
  Pause, 
  Compass, 
  ArrowUp, 
  Camera, 
  Move,
  Info,
  ExternalLink,
  Zap
} from 'lucide-react';

interface Placement3DViewerProps {
  cells: StandardCellInfo[];
  selectedCell: StandardCellInfo | null;
  onSelectCell: (cell: StandardCellInfo | null) => void;
  showFlylinesDefault?: boolean;
  showPdnRailsDefault?: boolean;
  onSwitchTo2D?: () => void;
}

// Camera Preset Controller
function CameraController({ cameraPreset }: { cameraPreset: 'iso' | 'top' | 'front' | 'exploded' }) {
  const { camera } = useThree();

  React.useEffect(() => {
    if (cameraPreset === 'iso') {
      camera.position.set(7, 6.5, 7.5);
      camera.lookAt(0, 0.4, 0);
    } else if (cameraPreset === 'top') {
      camera.position.set(0, 11, 0.01);
      camera.lookAt(0, 0, 0);
    } else if (cameraPreset === 'front') {
      camera.position.set(0, 2.2, 8.5);
      camera.lookAt(0, 1.0, 0);
    } else if (cameraPreset === 'exploded') {
      camera.position.set(8, 5.5, 7);
      camera.lookAt(0, 1.5, 0);
    }
  }, [cameraPreset, camera]);

  return null;
}

// 3D Parabolic Curved Net Flyline between standard cells
function FlylineCurve({
  start,
  end,
  color = '#38bdf8',
  isSelected = false
}: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  isSelected?: boolean;
}) {
  const points = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const midX = (p0.x + p2.x) / 2;
    const midZ = (p0.z + p2.z) / 2;
    const dist = p0.distanceTo(p2);
    const peakY = Math.max(p0.y, p2.y) + Math.min(2.0, Math.max(0.3, dist * 0.32));
    const p1 = new THREE.Vector3(midX, peakY, midZ);

    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    return curve.getPoints(20);
  }, [start, end]);

  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  return (
    <primitive
      object={
        new THREE.Line(
          lineGeo,
          new THREE.LineBasicMaterial({
            color: new THREE.Color(isSelected ? '#38bdf8' : color),
            linewidth: isSelected ? 2 : 1,
            transparent: true,
            opacity: isSelected ? 0.95 : 0.45
          })
        )
      }
    />
  );
}

// 3D Silicon Placement Scene
function Placement3DScene({
  cells,
  selectedCell,
  onSelectCell,
  showFlylines,
  showPdnRails,
  showStrapsAndVias,
  showLabels,
  layerExplode,
  onHoverCell
}: {
  cells: StandardCellInfo[];
  selectedCell: StandardCellInfo | null;
  onSelectCell: (cell: StandardCellInfo | null) => void;
  showFlylines: boolean;
  showPdnRails: boolean;
  showStrapsAndVias: boolean;
  showLabels: boolean;
  layerExplode: number;
  onHoverCell: (info: any) => void;
}) {
  // Coordinate scaling: map 400x320 SVG space to Three.js world space
  const scale = 0.02;
  const dieW = 380 * scale;
  const dieH = 300 * scale;
  const xOrigin = -dieW / 2;
  const zOrigin = -dieH / 2;

  // Layer elevations
  const ySubstrate = 0;
  const yCore = 0.04 * layerExplode;
  const yCells = 0.12 * layerExplode;
  const yM1Rails = 0.28 * layerExplode;
  const yVias = 0.65 * layerExplode;
  const yM6Straps = 1.1 * layerExplode;
  const yFlylines = 0.4 * layerExplode;

  // Cell Row Y positions in SVG coordinates
  const rowPositions = [70, 125, 180, 235];

  // Helper for cell 3D styles
  const getCell3DStyle = (cell: StandardCellInfo, isSelected: boolean) => {
    if (isSelected) {
      return {
        color: '#38bdf8',
        emissive: '#0284c7',
        height: 0.32,
        roughness: 0.15,
        metalness: 0.85
      };
    }
    switch (cell.type) {
      case 'NAND2':
      case 'NOR2':
      case 'AOI22':
        return { color: '#10b981', emissive: '#047857', height: 0.25, roughness: 0.3, metalness: 0.7 };
      case 'DFF':
        return { color: '#8b5cf6', emissive: '#6d28d9', height: 0.28, roughness: 0.3, metalness: 0.75 };
      case 'INV':
        return { color: '#3b82f6', emissive: '#1d4ed8', height: 0.22, roughness: 0.3, metalness: 0.7 };
      case 'CLKBUF':
        return { color: '#f59e0b', emissive: '#b45309', height: 0.26, roughness: 0.25, metalness: 0.85 };
      case 'MUX2':
        return { color: '#ec4899', emissive: '#be185d', height: 0.25, roughness: 0.3, metalness: 0.7 };
      case 'TAPCELL':
      case 'DECAP':
        return { color: '#06b6d4', emissive: '#0e7490', height: 0.18, roughness: 0.3, metalness: 0.8 };
      default:
        return { color: '#64748b', emissive: '#334155', height: 0.2, roughness: 0.4, metalness: 0.6 };
    }
  };

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Silicon Die Substrate Base */}
      <mesh position={[0, ySubstrate - 0.08, 0]} receiveShadow>
        <boxGeometry args={[dieW + 0.8, 0.14, dieH + 0.8]} />
        <meshStandardMaterial color="#0c1017" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Scribe Lanes & Guard Ring */}
      <mesh position={[0, ySubstrate - 0.005, 0]}>
        <boxGeometry args={[dieW + 0.3, 0.015, dieH + 0.3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.5} />
      </mesh>

      {/* 2. Active Core Area */}
      <mesh 
        position={[0, yCore, 0]} 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelectCell(null);
        }}
      >
        <boxGeometry args={[dieW * 0.88, 0.02, dieH * 0.88]} />
        <meshStandardMaterial color="#111827" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Core Boundary Line */}
      <mesh position={[0, yCore + 0.015, 0]}>
        <boxGeometry args={[dieW * 0.88 + 0.05, 0.008, dieH * 0.88 + 0.05]} />
        <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" wireframe={true} />
      </mesh>

      {/* Standard Cell Row Sites */}
      {rowPositions.map((rY, idx) => {
        const rowZ = zOrigin + (rY + 14) * scale;
        return (
          <mesh key={`row_${idx}`} position={[0, yCore + 0.01, rowZ]}>
            <boxGeometry args={[dieW * 0.86, 0.005, 28 * scale]} />
            <meshStandardMaterial 
              color="rgba(148, 163, 184, 0.15)" 
              roughness={0.9} 
              transparent 
              opacity={0.25} 
            />
          </mesh>
        );
      })}

      {/* 3. 3D Standard Cells */}
      {cells.map((cell) => {
        const cx = xOrigin + (cell.x + cell.w / 2) * scale;
        const cz = zOrigin + (cell.y + cell.h / 2) * scale;
        const cw = cell.w * scale;
        const ch = cell.h * scale;
        const isSelected = selectedCell?.id === cell.id;
        const style = getCell3DStyle(cell, isSelected);

        return (
          <group
            key={cell.id}
            position={[cx, yCells + style.height / 2, cz]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectCell(cell);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverCell({
                name: cell.name,
                type: cell.type,
                group: cell.group,
                coords: `X:${cell.x}Âµm, Y:${cell.y}Âµm`,
                dimensions: `${cell.w}Ã—${cell.h}Âµm`,
                delay: `${cell.propagationDelayPs}ps`,
                irDrop: `${cell.irDropMv}mV`
              });
            }}
          >
            {/* Cell Monolith Body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[cw, style.height, ch]} />
              <meshStandardMaterial
                color={style.color}
                emissive={style.emissive}
                roughness={style.roughness}
                metalness={style.metalness}
              />
            </mesh>

            {/* Glowing Neon Outline when Selected */}
            {isSelected && (
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[cw + 0.06, style.height + 0.04, ch + 0.06]} />
                <meshStandardMaterial
                  color="#38bdf8"
                  emissive="#0284c7"
                  wireframe={true}
                  roughness={0.1}
                />
              </mesh>
            )}

            {/* Cell Top Surface / Gate Channel Texture */}
            <mesh position={[0, style.height / 2 + 0.002, 0]}>
              <planeGeometry args={[cw * 0.88, ch * 0.88]} />
              <meshStandardMaterial
                color={isSelected ? '#7dd3fc' : '#ffffff'}
                emissive={isSelected ? '#0369a1' : style.emissive}
                roughness={0.2}
                transparent
                opacity={0.3}
              />
            </mesh>

            {/* Cell Pin Terminals in 3D */}
            {/* Input Pin on Left (-X) */}
            <mesh position={[-cw / 2, 0, 0]}>
              <boxGeometry args={[0.04, 0.04, 0.06]} />
              <meshStandardMaterial color="#10b981" emissive="#047857" metalness={0.9} />
            </mesh>

            {/* Output Pin on Right (+X) */}
            <mesh position={[cw / 2, 0, 0]}>
              <boxGeometry args={[0.04, 0.04, 0.06]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" metalness={0.9} />
            </mesh>

            {/* Power Abutment Contacts (Touching M1 Rails) */}
            {/* Top VDD contact (-Z) */}
            <mesh position={[0, style.height / 2, -ch / 2]}>
              <boxGeometry args={[cw * 0.5, 0.03, 0.04]} />
              <meshStandardMaterial color="#ef4444" emissive="#b91c1c" metalness={0.9} />
            </mesh>

            {/* Bottom VSS contact (+Z) */}
            <mesh position={[0, style.height / 2, ch / 2]}>
              <boxGeometry args={[cw * 0.5, 0.03, 0.04]} />
              <meshStandardMaterial color="#06b6d4" emissive="#0e7490" metalness={0.9} />
            </mesh>

            {/* Floating 3D Text Label */}
            {showLabels && (
              <group position={[0, style.height / 2 + 0.12, 0]}>
                <Text
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={Math.min(0.2, Math.max(0.1, cw * 0.22))}
                  color={isSelected ? '#ffffff' : '#f1f5f9'}
                  anchorX="center"
                  anchorY="middle"
                >
                  {cell.type}
                </Text>
              </group>
            )}

            {/* Active Pointer Marker if selected */}
            {isSelected && (
              <group position={[0, style.height / 2 + 0.45, 0]}>
                <mesh rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.1, 0.22, 16]} />
                  <meshStandardMaterial
                    color="#38bdf8"
                    emissive="#0284c7"
                    roughness={0.1}
                    metalness={0.9}
                  />
                </mesh>
              </group>
            )}
          </group>
        );
      })}

      {/* 4. M1 Power Followpin Rails (PDN Inner Connection!) */}
      {showPdnRails && (
        <group position={[0, yM1Rails, 0]}>
          {rowPositions.map((rY, idx) => {
            const zTop = zOrigin + rY * scale; // VDD Rail
            const zBottom = zOrigin + (rY + 28) * scale; // VSS Rail

            return (
              <group key={`pdn_row_${idx}`}>
                {/* M1 VDD Followpin Rail (Red) */}
                <mesh position={[0, 0, zTop]}>
                  <boxGeometry args={[dieW * 0.86, 0.015, 0.05]} />
                  <meshStandardMaterial color="#ef4444" emissive="#991b1b" roughness={0.2} metalness={0.85} />
                </mesh>

                {/* M1 VSS Followpin Rail (Cyan) */}
                <mesh position={[0, 0, zBottom]}>
                  <boxGeometry args={[dieW * 0.86, 0.015, 0.05]} />
                  <meshStandardMaterial color="#06b6d4" emissive="#0e7490" roughness={0.2} metalness={0.85} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* 5. Vertical M6 Power Straps & Dropping Via Arrays (Interconnection to Power Plan) */}
      {showStrapsAndVias && (
        <group position={[0, 0, 0]}>
          {/* Vertical Straps on M6 */}
          {[-1.8, -0.6, 0.6, 1.8].map((sX, sIdx) => {
            const isVdd = sIdx % 2 === 0;
            return (
              <group key={`strap_${sIdx}`}>
                {/* M6 Vertical Strap */}
                <mesh position={[sX, yM6Straps, 0]}>
                  <boxGeometry args={[0.12, 0.025, dieH * 0.88]} />
                  <meshStandardMaterial 
                    color={isVdd ? '#22c55e' : '#06b6d4'} 
                    emissive={isVdd ? '#15803d' : '#083344'} 
                    roughness={0.2} 
                    metalness={0.9} 
                  />
                </mesh>

                {/* Via Stacks dropping down to M1 Rails */}
                {rowPositions.map((rY, rIdx) => {
                  const zTarget = zOrigin + (isVdd ? rY : rY + 28) * scale;
                  return (
                    <mesh 
                      key={`via_${sIdx}_${rIdx}`} 
                      position={[sX, (yM1Rails + yM6Straps) / 2, zTarget]}
                    >
                      <cylinderGeometry args={[0.03, 0.03, yM6Straps - yM1Rails, 8]} />
                      <meshStandardMaterial color="#fbbf24" emissive="#b45309" metalness={0.9} roughness={0.1} />
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>
      )}

      {/* 6. Dynamic 3D Curved Parabolic Flylines (Nets) */}
      {showFlylines && (
        <group position={[0, yFlylines, 0]}>
          {cells.slice(0, -1).map((cell, idx) => {
            const nextCell = cells[idx + 1];
            if (!nextCell) return null;

            const isSel = selectedCell?.id === cell.id || selectedCell?.id === nextCell.id;
            const p1: [number, number, number] = [
              xOrigin + (cell.x + cell.w) * scale,
              0,
              zOrigin + (cell.y + cell.h / 2) * scale
            ];
            const p2: [number, number, number] = [
              xOrigin + nextCell.x * scale,
              0,
              zOrigin + (nextCell.y + nextCell.h / 2) * scale
            ];

            return (
              <FlylineCurve
                key={`fl_${cell.id}_${nextCell.id}`}
                start={p1}
                end={p2}
                color={cell.color}
                isSelected={isSel}
              />
            );
          })}
        </group>
      )}

      {/* 7. IO Peripheral Pads */}
      {/* CLK PAD (West) */}
      <mesh position={[xOrigin - 0.15, yCore + 0.05, 0]}>
        <boxGeometry args={[0.18, 0.06, 0.5]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} />
      </mesh>

      {/* VDD PAD (North) */}
      <mesh position={[0, yCore + 0.05, zOrigin - 0.15]}>
        <boxGeometry args={[0.6, 0.06, 0.18]} />
        <meshStandardMaterial color="#ef4444" metalness={0.8} />
      </mesh>

      {/* OUT PAD (East) */}
      <mesh position={[-xOrigin + 0.15, yCore + 0.05, 0]}>
        <boxGeometry args={[0.18, 0.06, 0.5]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.8} />
      </mesh>
    </group>
  );
}

export function Placement3DViewer({
  cells,
  selectedCell,
  onSelectCell,
  showFlylinesDefault = true,
  showPdnRailsDefault = true,
  onSwitchTo2D
}: Placement3DViewerProps) {
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'exploded'>('iso');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showFlylines, setShowFlylines] = useState(showFlylinesDefault);
  const [showPdnRails, setShowPdnRails] = useState(showPdnRailsDefault);
  const [showStrapsAndVias, setShowStrapsAndVias] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [layerExplode, setLayerExplode] = useState(1.0);
  const [hoveredCell, setHoveredCell] = useState<any>(null);

  return (
    <div className="w-full h-full flex flex-col bg-[#07090e] text-gray-200 select-none overflow-hidden relative">
      {/* 3D Placement Studio Toolbar Header */}
      <div className="h-10 bg-[#0c1017] border-b border-white/10 px-4 flex items-center justify-between shrink-0 font-mono text-xs z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-bold text-gray-100 flex items-center gap-1.5">
              <Box size={14} className="text-blue-400" />
              <span>3D Silicon Placement Studio</span>
            </span>
          </div>

          <span className="text-gray-600">|</span>

          <span className="text-gray-400">
            Standard Cells: <span className="text-emerald-400 font-bold">{cells.length}</span>
          </span>

          <span className="text-gray-600">|</span>

          <span className="text-gray-400">
            PDN: <span className="text-cyan-400 font-bold">M1 Followpin + M6 Straps</span>
          </span>
        </div>

        {/* Camera Views & Controls */}
        <div className="flex items-center space-x-2">
          {onSwitchTo2D && (
            <button
              onClick={onSwitchTo2D}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded flex items-center space-x-1.5 transition-colors"
              title="Return to 2D CAD Layout"
            >
              <ExternalLink size={12} className="text-blue-400" />
              <span>Back to 2D</span>
            </button>
          )}

          {/* Camera View Presets */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded p-0.5">
            <button
              onClick={() => setCameraPreset('iso')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cameraPreset === 'iso' ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              3D Iso
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cameraPreset === 'top' ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              Top-Down
            </button>
            <button
              onClick={() => setCameraPreset('front')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cameraPreset === 'front' ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              Row Front
            </button>
            <button
              onClick={() => setCameraPreset('exploded')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cameraPreset === 'exploded' ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              Exploded
            </button>
          </div>

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded border transition-colors ${
              autoRotate 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' 
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Toggle Continuous Turntable Rotation"
          >
            <RotateCw size={13} className={autoRotate ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main 3D Viewport with Floating Controls */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#06080d] via-[#090d14] to-[#040609]">
        <ErrorBoundary>
          <Canvas
            shadows
            camera={{ position: [7, 6.5, 7.5], fov: 36 }}
            className="w-full h-full"
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.85} />
            <directionalLight position={[10, 16, 8]} intensity={1.4} castShadow />
            <directionalLight position={[-8, 12, -8]} intensity={0.6} />
            <pointLight position={[0, 3, 0]} intensity={0.8} color="#38bdf8" />

            <CameraController cameraPreset={cameraPreset} />

            <Placement3DScene
              cells={cells}
              selectedCell={selectedCell}
              onSelectCell={onSelectCell}
              showFlylines={showFlylines}
              showPdnRails={showPdnRails}
              showStrapsAndVias={showStrapsAndVias}
              showLabels={showLabels}
              layerExplode={layerExplode}
              onHoverCell={setHoveredCell}
            />

            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={autoRotate}
              autoRotateSpeed={1.0}
              maxDistance={28}
              minDistance={2}
            />
          </Canvas>
        </ErrorBoundary>

        {/* Floating Quick Feature Toggles (Top Left) */}
        <div className="absolute top-3 left-3 bg-[#0f141f]/90 backdrop-blur border border-white/10 rounded-lg p-2 flex flex-col space-y-1.5 text-[11px] font-mono shadow-xl z-20">
          <span className="text-[10px] text-gray-400 uppercase font-bold px-1">Layers & PDN Rails</span>

          <button
            onClick={() => setShowPdnRails(!showPdnRails)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showPdnRails ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/5 text-gray-400'
            }`}
            title="M1 VDD & VSS Standard Cell Power Followpin Rails"
          >
            <span className="flex items-center gap-1.5">
              <Zap size={11} className="text-red-400" />
              <span>M1 Rails</span>
            </span>
            <span className="text-[9px]">{showPdnRails ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowStrapsAndVias(!showStrapsAndVias)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showStrapsAndVias ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-400'
            }`}
            title="M6 Vertical Straps & Power Dropping Vias"
          >
            <span className="flex items-center gap-1.5">
              <Layers size={11} className="text-emerald-400" />
              <span>M6 Straps & Vias</span>
            </span>
            <span className="text-[9px]">{showStrapsAndVias ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowFlylines(!showFlylines)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showFlylines ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-gray-400'
            }`}
            title="Toggle Unrouted Net Flylines"
          >
            <span className="flex items-center gap-1.5">
              <Move size={11} />
              <span>Flylines</span>
            </span>
            <span className="text-[9px]">{showFlylines ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showLabels ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Info size={11} />
              <span>Cell Labels</span>
            </span>
            <span className="text-[9px]">{showLabels ? 'ON' : 'OFF'}</span>
          </button>

          {/* Explode Stack Slider */}
          <div className="pt-1.5 border-t border-white/10 flex flex-col space-y-1">
            <div className="flex justify-between items-center text-[10px] text-gray-400">
              <span>Z-Explode:</span>
              <span className="text-blue-400 font-bold">{layerExplode.toFixed(1)}Ã—</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={layerExplode}
              onChange={(e) => setLayerExplode(parseFloat(e.target.value))}
              className="w-full accent-blue-400 h-1 bg-white/10 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredCell && !selectedCell && (
          <div className="absolute bottom-4 left-4 bg-black/85 backdrop-blur border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 shadow-xl pointer-events-none z-20">
            <div className="text-blue-400 font-bold">{hoveredCell.name}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {hoveredCell.type} â€¢ {hoveredCell.coords} â€¢ Delay: {hoveredCell.delay} â€¢ IR Drop: {hoveredCell.irDrop}
            </div>
          </div>
        )}

        {/* Viewport Footer Legend & Navigation Hint */}
        <div className="absolute bottom-3 right-4 text-[11px] font-mono text-gray-400 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 flex items-center space-x-3 pointer-events-none z-10">
          <span>ðŸ–±ï¸ Left-Click + Drag: Rotate</span>
          <span className="text-gray-600">â€¢</span>
          <span>Right-Click + Drag: Pan</span>
          <span className="text-gray-600">â€¢</span>
          <span>Scroll: Zoom</span>
          <span className="text-gray-600">â€¢</span>
          <span className="text-blue-400 font-bold">Click Cell to Inspect CMOS Circuit</span>
        </div>
      </div>
    </div>
  );
}


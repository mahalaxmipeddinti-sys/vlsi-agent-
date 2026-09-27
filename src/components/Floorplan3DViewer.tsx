import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { FloorplanConfig, MacroBlock, IOPad, MacroOrientation } from '../types/physicalDesign';
import { ErrorBoundary } from './ErrorBoundary';
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
  SplitSquareVertical
} from 'lucide-react';

interface Floorplan3DViewerProps {
  config: FloorplanConfig;
  selectedMacroId: string | null;
  onSelectMacro: (id: string | null) => void;
  showHalosDefault?: boolean;
  showFlylinesDefault?: boolean;
  onSwitchTo2D?: () => void;
}

// Camera Preset Controller
function CameraController({ cameraPreset }: { cameraPreset: 'iso' | 'top' | 'front' | 'exploded' }) {
  const { camera } = useThree();

  React.useEffect(() => {
    if (cameraPreset === 'iso') {
      camera.position.set(10, 9, 10);
      camera.lookAt(0, 0.5, 0);
    } else if (cameraPreset === 'top') {
      camera.position.set(0, 15, 0.01);
      camera.lookAt(0, 0, 0);
    } else if (cameraPreset === 'front') {
      camera.position.set(0, 2.8, 12);
      camera.lookAt(0, 1.2, 0);
    } else if (cameraPreset === 'exploded') {
      camera.position.set(11, 7, 9);
      camera.lookAt(0, 2, 0);
    }
  }, [cameraPreset, camera]);

  return null;
}

// 3D Parabolic Curved Flyline
function FlylineCurve({
  start,
  end,
  color,
  isSelected
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  isSelected: boolean;
}) {
  const points = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const midX = (p0.x + p2.x) / 2;
    const midZ = (p0.z + p2.z) / 2;
    const dist = p0.distanceTo(p2);
    const peakY = Math.max(p0.y, p2.y) + Math.min(2.5, Math.max(0.4, dist * 0.28));
    const p1 = new THREE.Vector3(midX, peakY, midZ);

    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    return curve.getPoints(24);
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

// 3D Gold Wirebond Arch from IO Pad to Package leadframe
function WirebondArch({
  padPos,
  side,
  dieW,
  dieH
}: {
  padPos: [number, number, number];
  side: 'top' | 'bottom' | 'left' | 'right';
  dieW: number;
  dieH: number;
}) {
  const points = useMemo(() => {
    const [px, py, pz] = padPos;
    let targetX = px;
    let targetZ = pz;
    const extend = 0.9;

    if (side === 'top') targetZ -= extend;
    else if (side === 'bottom') targetZ += extend;
    else if (side === 'left') targetX -= extend;
    else targetX += extend;

    const p0 = new THREE.Vector3(px, py, pz);
    const p2 = new THREE.Vector3(targetX, py - 0.25, targetZ);
    const midX = (px + targetX) / 2;
    const midZ = (pz + targetZ) / 2;
    const p1 = new THREE.Vector3(midX, py + 0.45, midZ);

    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    return curve.getPoints(16);
  }, [padPos, side]);

  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  return (
    <primitive
      object={
        new THREE.Line(
          lineGeo,
          new THREE.LineBasicMaterial({
            color: new THREE.Color('#f59e0b'), // Gold Au wire
            linewidth: 1.5,
            transparent: true,
            opacity: 0.75
          })
        )
      }
    />
  );
}

// Main 3D Silicon Floorplan Scene
function Floorplan3DScene({
  config,
  selectedMacroId,
  onSelectMacro,
  showHalos,
  showFlylines,
  showStdCells,
  showWirebonds,
  showLabels,
  layerExplode,
  onHoverInfo
}: {
  config: FloorplanConfig;
  selectedMacroId: string | null;
  onSelectMacro: (id: string | null) => void;
  showHalos: boolean;
  showFlylines: boolean;
  showStdCells: boolean;
  showWirebonds: boolean;
  showLabels: boolean;
  layerExplode: number;
  onHoverInfo: (info: any) => void;
}) {
  // Coordinate scale: 100 µm = 1.0 Three.js unit
  const scale = 0.01;
  const dieW = config.dieWidth * scale;
  const dieH = config.dieHeight * scale;
  const coreW = (config.dieWidth - config.coreMarginLeft - config.coreMarginRight) * scale;
  const coreH = (config.dieHeight - config.coreMarginTop - config.coreMarginBottom) * scale;
  const coreX0 = -dieW / 2 + config.coreMarginLeft * scale;
  const coreY0 = -dieH / 2 + config.coreMarginTop * scale;

  // Layer heights in Z (Y-up in Three.js)
  const ySubstrate = 0;
  const yCoreBase = 0.08 * layerExplode;
  const yStdCells = 0.12 * layerExplode;
  const yMacros = 0.18 * layerExplode;
  const yFlylines = 0.5 * layerExplode;
  const yPads = 0.14 * layerExplode;

  // Macro Color Generator
  const getMacro3DStyle = (type: MacroBlock['type'], isSelected: boolean) => {
    if (isSelected) {
      return {
        color: '#38bdf8',
        emissive: '#0284c7',
        roughness: 0.2,
        metalness: 0.8,
        height: 0.38
      };
    }
    switch (type) {
      case 'sram':
        return {
          color: '#0284c7', // Sapphire Cyan
          emissive: '#0369a1',
          roughness: 0.25,
          metalness: 0.75,
          height: 0.34
        };
      case 'regfile':
        return {
          color: '#8b5cf6', // Violet
          emissive: '#6d28d9',
          roughness: 0.3,
          metalness: 0.7,
          height: 0.3
        };
      case 'alu':
        return {
          color: '#f59e0b', // Amber/Gold
          emissive: '#b45309',
          roughness: 0.3,
          metalness: 0.85,
          height: 0.32
        };
      case 'dsp':
        return {
          color: '#ec4899', // Pink/Ruby
          emissive: '#be185d',
          roughness: 0.25,
          metalness: 0.8,
          height: 0.35
        };
      default:
        return {
          color: '#10b981', // Emerald
          emissive: '#047857',
          roughness: 0.3,
          metalness: 0.7,
          height: 0.28
        };
    }
  };

  // Color helper for IO Pads
  const getPadColor = (type: IOPad['type']) => {
    switch (type) {
      case 'power': return '#ef4444'; // Red (VDD)
      case 'ground': return '#06b6d4'; // Cyan (VSS)
      case 'clock': return '#f59e0b'; // Amber (CLK)
      case 'output': return '#3b82f6'; // Blue
      default: return '#10b981'; // Emerald (Input)
    }
  };

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Silicon Die Substrate (Ground Plate with Chamfered Edges) */}
      <mesh position={[0, ySubstrate - 0.08, 0]} receiveShadow>
        <boxGeometry args={[dieW + 0.6, 0.14, dieH + 0.6]} />
        <meshStandardMaterial 
          color="#0b0f17" 
          roughness={0.7} 
          metalness={0.4} 
        />
      </mesh>

      {/* Scribe Line & Seal Ring Perimeter */}
      <mesh position={[0, ySubstrate - 0.005, 0]}>
        <boxGeometry args={[dieW + 0.2, 0.015, dieH + 0.2]} />
        <meshStandardMaterial 
          color="#1e293b" 
          roughness={0.6} 
          metalness={0.5} 
        />
      </mesh>

      {/* 2. Active Core Area */}
      <mesh 
        position={[coreX0 + coreW / 2, yCoreBase, coreY0 + coreH / 2]} 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelectMacro(null);
        }}
      >
        <boxGeometry args={[coreW, 0.02, coreH]} />
        <meshStandardMaterial 
          color="#111827" 
          roughness={0.8} 
          metalness={0.2} 
        />
      </mesh>

      {/* Core Perimeter Boundary Line */}
      <mesh position={[coreX0 + coreW / 2, yCoreBase + 0.015, coreY0 + coreH / 2]}>
        <boxGeometry args={[coreW + 0.05, 0.008, coreH + 0.05]} />
        <meshStandardMaterial 
          color="#10b981" 
          emissive="#047857"
          wireframe={true}
        />
      </mesh>

      {/* 3. Standard Cell Placement Site Rows Matrix */}
      {showStdCells && (
        <group position={[coreX0 + coreW / 2, yStdCells, coreY0 + coreH / 2]}>
          {Array.from({ length: 24 }).map((_, rIdx) => {
            const zRow = -coreH / 2 + (rIdx + 0.5) * (coreH / 24);
            return (
              <mesh key={`stdcell_row_${rIdx}`} position={[0, 0, zRow]}>
                <boxGeometry args={[coreW * 0.98, 0.005, 0.015]} />
                <meshStandardMaterial 
                  color="rgba(148, 163, 184, 0.2)" 
                  roughness={0.9} 
                  transparent 
                  opacity={0.3} 
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* 4. Hard Macro Blocks in 3D */}
      {config.macros.map((m) => {
        const mx = coreX0 + (m.x + m.width / 2) * scale;
        const my = coreY0 + (m.y + m.height / 2) * scale;
        const mw = m.width * scale;
        const mh = m.height * scale;
        const isSelected = m.id === selectedMacroId;
        const style = getMacro3DStyle(m.type, isSelected);
        const haloWidth = (m.halo || 10) * scale;

        return (
          <group 
            key={m.id} 
            position={[mx, yMacros + style.height / 2, my]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMacro(m.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverInfo({
                id: m.id,
                name: m.name,
                type: m.type.toUpperCase(),
                dimensions: `${m.width}µm × ${m.height}µm`,
                area: `${(m.width * m.height).toLocaleString()} µm²`,
                orientation: m.orientation,
                pins: m.pins.length,
                halo: `${m.halo || 0}µm`
              });
            }}
          >
            {/* 3D Macro Body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[mw, style.height, mh]} />
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
                <boxGeometry args={[mw + 0.08, style.height + 0.06, mh + 0.08]} />
                <meshStandardMaterial 
                  color="#38bdf8" 
                  emissive="#0284c7" 
                  wireframe={true} 
                  roughness={0.1}
                />
              </mesh>
            )}

            {/* Placement Keepout Halo in 3D */}
            {showHalos && (m.halo || 0) > 0 && (
              <mesh position={[0, -style.height / 2 + 0.01, 0]}>
                <boxGeometry args={[mw + haloWidth * 2, 0.02, mh + haloWidth * 2]} />
                <meshStandardMaterial 
                  color="#f59e0b" 
                  emissive="#d97706" 
                  transparent 
                  opacity={isSelected ? 0.35 : 0.18} 
                  roughness={0.5}
                />
              </mesh>
            )}

            {/* Macro Top Surface Grid / Silicon Circuit Texture */}
            <mesh position={[0, style.height / 2 + 0.002, 0]}>
              <planeGeometry args={[mw * 0.94, mh * 0.94]} />
              <meshStandardMaterial 
                color={isSelected ? '#7dd3fc' : '#ffffff'} 
                emissive={isSelected ? '#0369a1' : style.emissive}
                roughness={0.2}
                transparent
                opacity={0.25}
              />
            </mesh>

            {/* Macro Pin Terminals in 3D */}
            {m.pins.map((pin, pIdx) => {
              const pinX = (pin.relX - 0.5) * mw;
              const pinZ = (pin.relY - 0.5) * mh;
              const isClk = pin.type === 'clock';
              const isOut = pin.type === 'output';
              const pinColor = isClk ? '#f59e0b' : isOut ? '#38bdf8' : '#10b981';

              return (
                <mesh 
                  key={`pin_${pIdx}`} 
                  position={[pinX, style.height / 2 + 0.02, pinZ]}
                >
                  <boxGeometry args={[0.06, 0.04, 0.06]} />
                  <meshStandardMaterial 
                    color={pinColor} 
                    emissive={pinColor} 
                    metalness={0.9} 
                    roughness={0.1} 
                  />
                </mesh>
              );
            })}

            {/* Floating 3D Text Label */}
            {showLabels && (
              <group position={[0, style.height / 2 + 0.12, 0]}>
                <Text
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={Math.min(0.24, Math.max(0.12, mw * 0.18))}
                  color={isSelected ? '#ffffff' : '#f1f5f9'}
                  anchorX="center"
                  anchorY="middle"
                >
                  {m.name}
                </Text>
                <Text
                  position={[0, -0.01, 0.16]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={Math.min(0.16, Math.max(0.09, mw * 0.12))}
                  color={isSelected ? '#7dd3fc' : '#94a3b8'}
                  anchorX="center"
                  anchorY="middle"
                >
                  {`${m.type.toUpperCase()} • ${m.width}×${m.height}µm`}
                </Text>
              </group>
            )}

            {/* Active Pointer Marker if selected */}
            {isSelected && (
              <group position={[0, style.height / 2 + 0.55, 0]}>
                <mesh rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.12, 0.28, 16]} />
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

      {/* 5. Peripheral IO Pads & Gold Wirebonds */}
      <group position={[0, yPads, 0]}>
        {config.ioPads.map((pad) => {
          let px = 0;
          let pz = 0;

          if (pad.side === 'top') {
            px = -dieW / 2 + pad.offset * scale;
            pz = -dieH / 2;
          } else if (pad.side === 'bottom') {
            px = -dieW / 2 + pad.offset * scale;
            pz = dieH / 2;
          } else if (pad.side === 'left') {
            px = -dieW / 2;
            pz = -dieH / 2 + pad.offset * scale;
          } else {
            px = dieW / 2;
            pz = -dieH / 2 + pad.offset * scale;
          }

          const padColor = getPadColor(pad.type);

          return (
            <group key={pad.id}>
              {/* Metallic Pad Contact */}
              <mesh 
                position={[px, 0.02, pz]}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onHoverInfo({
                    id: pad.id,
                    name: `IO Pad: ${pad.name}`,
                    type: pad.type.toUpperCase(),
                    side: `${pad.side.toUpperCase()} Edge`,
                    offset: `${pad.offset}µm`,
                    role: 'Chip Boundary Pad'
                  });
                }}
              >
                <boxGeometry args={[0.16, 0.05, 0.16]} />
                <meshStandardMaterial 
                  color={padColor} 
                  metalness={0.85} 
                  roughness={0.2} 
                />
              </mesh>

              {/* Wirebond arching to package leadframe */}
              {showWirebonds && (
                <WirebondArch 
                  padPos={[px, 0.05, pz]} 
                  side={pad.side} 
                  dieW={dieW} 
                  dieH={dieH} 
                />
              )}
            </group>
          );
        })}
      </group>

      {/* 6. Dynamic 3D Parabolic Flightlines (RTL Netlist Connectivity) */}
      {showFlylines && (
        <group position={[0, yFlylines, 0]}>
          {config.macros.map((m) => {
            const mx = coreX0 + (m.x + m.width / 2) * scale;
            const my = coreY0 + (m.y + m.height / 2) * scale;
            const isMacroSelected = m.id === selectedMacroId;

            return m.connectedPadIds.map((padId) => {
              const pad = config.ioPads.find(p => p.id === padId);
              if (!pad) return null;

              let px = 0;
              let pz = 0;
              if (pad.side === 'top') {
                px = -dieW / 2 + pad.offset * scale;
                pz = -dieH / 2;
              } else if (pad.side === 'bottom') {
                px = -dieW / 2 + pad.offset * scale;
                pz = dieH / 2;
              } else if (pad.side === 'left') {
                px = -dieW / 2;
                pz = -dieH / 2 + pad.offset * scale;
              } else {
                px = dieW / 2;
                pz = -dieH / 2 + pad.offset * scale;
              }

              const padColor = getPadColor(pad.type);

              return (
                <FlylineCurve 
                  key={`flyline_${m.id}_${padId}`}
                  start={[px, 0, pz]}
                  end={[mx, 0, my]}
                  color={padColor}
                  isSelected={isMacroSelected}
                />
              );
            });
          })}
        </group>
      )}

      {/* 7. Coordinate Origin Indicator (0,0) µm in 3D */}
      <group position={[-dieW / 2, 0.1, -dieH / 2]}>
        {/* Origin post */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 12]} />
          <meshStandardMaterial color="#ef4444" emissive="#b91c1c" />
        </mesh>
        <Text
          position={[0, 0.4, 0]}
          fontSize={0.18}
          color="#ef4444"
          anchorX="center"
          anchorY="bottom"
        >
          (0,0) ORIGIN
        </Text>
      </group>
    </group>
  );
}

export function Floorplan3DViewer({
  config,
  selectedMacroId,
  onSelectMacro,
  showHalosDefault = true,
  showFlylinesDefault = true,
  onSwitchTo2D
}: Floorplan3DViewerProps) {
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'exploded'>('iso');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showHalos, setShowHalos] = useState(showHalosDefault);
  const [showFlylines, setShowFlylines] = useState(showFlylinesDefault);
  const [showStdCells, setShowStdCells] = useState(true);
  const [showWirebonds, setShowWirebonds] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [layerExplode, setLayerExplode] = useState(1.0);
  const [hoveredInfo, setHoveredInfo] = useState<any>(null);

  const selectedMacro = useMemo(() => {
    return config.macros.find(m => m.id === selectedMacroId);
  }, [config.macros, selectedMacroId]);

  const coreW = config.dieWidth - config.coreMarginLeft - config.coreMarginRight;
  const coreH = config.dieHeight - config.coreMarginTop - config.coreMarginBottom;
  const macroArea = config.macros.reduce((sum, m) => sum + (m.width * m.height), 0);
  const utilization = ((macroArea / (coreW * coreH)) * 100).toFixed(1);

  return (
    <div className="w-full h-full flex flex-col bg-[#07090e] text-gray-200 select-none overflow-hidden relative">
      {/* 3D Silicon Studio Header Toolbar */}
      <div className="h-10 bg-[#0c1017] border-b border-white/10 px-4 flex items-center justify-between shrink-0 font-mono text-xs z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-gray-100 flex items-center gap-1.5">
              <Box size={14} className="text-cyan-400" />
              <span>3D Silicon Floorplan Studio</span>
            </span>
          </div>

          <span className="text-gray-600">|</span>

          <span className="text-gray-400">
            Die: <span className="text-emerald-400 font-bold">{config.dieWidth}µm × {config.dieHeight}µm</span>
          </span>

          <span className="text-gray-600">|</span>

          <span className="text-gray-400">
            Macros: <span className="text-cyan-400 font-bold">{config.macros.length}</span>
          </span>

          <span className="text-gray-600">|</span>

          <span className="text-gray-400">
            Util: <span className="text-amber-400 font-bold">{utilization}%</span>
          </span>
        </div>

        {/* Camera Views & Switches */}
        <div className="flex items-center space-x-2">
          {onSwitchTo2D && (
            <button
              onClick={onSwitchTo2D}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded flex items-center space-x-1.5 transition-colors"
              title="Return to 2D CAD Layout"
            >
              <ExternalLink size={12} className="text-cyan-400" />
              <span>Back to 2D</span>
            </button>
          )}

          {/* Camera View Presets */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded p-0.5">
            <button
              onClick={() => setCameraPreset('iso')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cameraPreset === 'iso' ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' : 'text-gray-400 hover:text-white'
              }`}
              title="Isometric 45° Perspective"
            >
              3D Iso
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cameraPreset === 'top' ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' : 'text-gray-400 hover:text-white'
              }`}
              title="Orthogonal Top-Down View"
            >
              Top-Down
            </button>
            <button
              onClick={() => setCameraPreset('front')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cameraPreset === 'front' ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' : 'text-gray-400 hover:text-white'
              }`}
              title="Front Silhouette View"
            >
              Front
            </button>
            <button
              onClick={() => setCameraPreset('exploded')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cameraPreset === 'exploded' ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' : 'text-gray-400 hover:text-white'
              }`}
              title="Exploded Vertical Stack"
            >
              Exploded
            </button>
          </div>

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded border transition-colors ${
              autoRotate 
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' 
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
        {/* Three.js Canvas */}
        <ErrorBoundary>
          <Canvas
            shadows
            camera={{ position: [10, 9, 10], fov: 38 }}
            className="w-full h-full"
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.85} />
            <directionalLight position={[12, 20, 10]} intensity={1.5} castShadow />
            <directionalLight position={[-10, 15, -10]} intensity={0.6} />
            <pointLight position={[0, 4, 0]} intensity={0.8} color="#38bdf8" />

            <CameraController cameraPreset={cameraPreset} />

            <Floorplan3DScene
              config={config}
              selectedMacroId={selectedMacroId}
              onSelectMacro={onSelectMacro}
              showHalos={showHalos}
              showFlylines={showFlylines}
              showStdCells={showStdCells}
              showWirebonds={showWirebonds}
              showLabels={showLabels}
              layerExplode={layerExplode}
              onHoverInfo={setHoveredInfo}
            />

            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={autoRotate}
              autoRotateSpeed={1.2}
              maxDistance={32}
              minDistance={2}
            />
          </Canvas>
        </ErrorBoundary>

        {/* Floating Quick Feature Toggles (Top Left) */}
        <div className="absolute top-3 left-3 bg-[#0f141f]/90 backdrop-blur border border-white/10 rounded-lg p-2 flex flex-col space-y-1.5 text-[11px] font-mono shadow-xl z-20">
          <span className="text-[10px] text-gray-400 uppercase font-bold px-1">Layers & Vectors</span>

          <button
            onClick={() => setShowHalos(!showHalos)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showHalos ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Layers size={11} />
              <span>3D Halos</span>
            </span>
            <span className="text-[9px]">{showHalos ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowFlylines(!showFlylines)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showFlylines ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Move size={11} />
              <span>Flylines</span>
            </span>
            <span className="text-[9px]">{showFlylines ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowWirebonds(!showWirebonds)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showWirebonds ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-white/5 text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={11} />
              <span>Wirebonds</span>
            </span>
            <span className="text-[9px]">{showWirebonds ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowStdCells(!showStdCells)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showStdCells ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Activity size={11} />
              <span>Cell Rows</span>
            </span>
            <span className="text-[9px]">{showStdCells ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2 py-1 rounded flex items-center justify-between space-x-2 transition-colors ${
              showLabels ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Info size={11} />
              <span>3D Labels</span>
            </span>
            <span className="text-[9px]">{showLabels ? 'ON' : 'OFF'}</span>
          </button>

          {/* Explode Stack Slider */}
          <div className="pt-1.5 border-t border-white/10 flex flex-col space-y-1">
            <div className="flex justify-between items-center text-[10px] text-gray-400">
              <span>Z-Explode:</span>
              <span className="text-cyan-400 font-bold">{layerExplode.toFixed(1)}×</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={layerExplode}
              onChange={(e) => setLayerExplode(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-white/10 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Selected Macro 3D Quick Floating Badge (Top Right) */}
        {selectedMacro && (
          <div className="absolute top-3 right-3 bg-[#0d121c]/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl max-w-xs font-mono text-xs z-20 backdrop-blur">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                <Cpu size={14} />
                <span className="truncate">{selectedMacro.name}</span>
              </div>
              <button
                onClick={() => onSelectMacro(null)}
                className="text-gray-400 hover:text-white p-0.5"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="text-cyan-300 font-bold">{selectedMacro.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dimensions:</span>
                <span>{selectedMacro.width}µm × {selectedMacro.height}µm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Coordinates:</span>
                <span className="text-amber-400">({selectedMacro.x}, {selectedMacro.y}) µm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Orientation:</span>
                <span>{selectedMacro.orientation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Connected IOs:</span>
                <span className="text-emerald-400 font-bold">{selectedMacro.connectedPadIds.length} pads</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-gray-400 flex items-center justify-between">
              <span>Click right panel for full schematic</span>
              <CheckCircle2 size={12} className="text-emerald-400" />
            </div>
          </div>
        )}

        {/* Hover Inspection Tooltip (Bottom Left) */}
        {hoveredInfo && !selectedMacro && (
          <div className="absolute bottom-4 left-4 bg-black/85 backdrop-blur border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 shadow-xl pointer-events-none z-20">
            <div className="text-cyan-400 font-bold">{hoveredInfo.name}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {hoveredInfo.type} • {hoveredInfo.dimensions || hoveredInfo.side || ''}
            </div>
          </div>
        )}

        {/* Interactive Viewport Footer Legend & Navigation Hint */}
        <div className="absolute bottom-3 right-4 text-[11px] font-mono text-gray-400 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 flex items-center space-x-3 pointer-events-none z-10">
          <span>🖱️ Left-Click + Drag: Rotate</span>
          <span className="text-gray-600">•</span>
          <span>Right-Click + Drag: Pan</span>
          <span className="text-gray-600">•</span>
          <span>Scroll: Zoom</span>
          <span className="text-gray-600">•</span>
          <span className="text-cyan-400">Click Any 3D Macro to Inspect</span>
        </div>
      </div>
    </div>
  );
}

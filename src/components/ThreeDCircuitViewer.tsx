import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Layers, 
  Rotate3d, 
  Eye, 
  EyeOff, 
  Sliders, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Compass, 
  Maximize2, 
  Minimize2,
  ZoomIn, 
  ZoomOut, 
  Play, 
  Pause,
  Info,
  Layers3,
  Image as ImageIcon,
  Cuboid,
  X,
  Cpu,
  Activity,
  CheckCircle2,
  CircuitBoard,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';

export interface ComponentSpecs {
  [key: string]: any;
}

export interface MetalFeature3D {
  type: 'wire' | 'via' | 'fin' | 'gate' | 'pad' | 'diffusion';
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  componentId?: string;
  specs?: ComponentSpecs;
}

export interface MetalLayer3D {
  id: string;
  name: string;
  level: number;
  thickness: number; // in nm
  sheetRes: string;
  material: string;
  color: string;
  altitude: number;
  features: MetalFeature3D[];
}

export interface ThreeDChipData {
  chipName: string;
  technologyNode: string;
  circuitType?: string;
  booleanFormula?: string;
  layers: MetalLayer3D[];
  metrics: {
    totalHeight: string;
    gatePitch: string;
    metal1Pitch: string;
    tsvDiameter: string;
    interconnectDelay: string;
  };
}

interface SelectedSpec {
  title: string;
  category: string;
  role: string;
  material: string;
  geometry: string;
  electrical: { [key: string]: string };
  drcRule: string;
}

interface ThreeDCircuitViewerProps {
  data?: ThreeDChipData | null;
}

export function ThreeDCircuitViewer({ data }: ThreeDCircuitViewerProps) {
  // Mode: 'cad' (3D Interactive Orbit Stack) or 'render' (3D Cross-Section View)
  const [viewMode, setViewMode] = useState<'cad' | 'render'>('cad');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Selected Component for In-Diagram HUD Specification Card
  const [selectedSpec, setSelectedSpec] = useState<SelectedSpec | null>(null);

  // 3D Rotation Angles
  const [rotX, setRotX] = useState(60); // Pitch
  const [rotZ, setRotZ] = useState(-35); // Yaw
  const [explosionZ, setExplosionZ] = useState(1.4); // Z-separation factor
  const [zoom, setZoom] = useState(1.0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [showDielectric, setShowDielectric] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Record<string, boolean>>({});

  // Mouse Drag for 3D Orbiting
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Auto-rotation effect
  useEffect(() => {
    if (isAutoRotating) {
      const step = () => {
        setRotZ(prev => (prev + 0.4) % 360);
        animFrameRef.current = requestAnimationFrame(step);
      };
      animFrameRef.current = requestAnimationFrame(step);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoRotating]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const defaultData: ThreeDChipData = data || {
    chipName: '2-Input NAND Gate (NAND2_X1) 3D Silicon Stack',
    technologyNode: '3nm GAA-FET / FinFET Node',
    circuitType: '2-Input CMOS NAND Gate',
    booleanFormula: 'Y = ~(A & B)',
    metrics: {
      totalHeight: '8.4 μm',
      gatePitch: '42 nm (CPP)',
      metal1Pitch: '28 nm (EUV)',
      tsvDiameter: '1.2 μm',
      interconnectDelay: '3.4 ps/mm'
    },
    layers: [
      {
        id: 'sub',
        name: 'P-Silicon Substrate & P-Well',
        level: 0,
        thickness: 400,
        sheetRes: '10 Ω·cm',
        altitude: 0,
        material: 'Silicon Fin',
        color: '#1e293b',
        features: [
          { type: 'diffusion', x: 20, y: 20, w: 340, h: 240, label: 'Bulk P-Silicon Wafer (<100> Orientation)', componentId: 'SUB_01', specs: { role: 'Semiconductor substrate base', material: 'Bulk Silicon', doping: 'Boron P-Type', sheetRes: '10 Ω·cm', thickness: '400 μm' } }
        ]
      },
      {
        id: 'feol',
        name: 'FEOL: Parallel PMOS & Series NMOS FinFETs',
        level: 1,
        thickness: 65,
        sheetRes: '2.5 Ω/sq',
        altitude: 40,
        material: 'Polysilicon',
        color: '#ef4444',
        features: [
          { type: 'fin', x: 50, y: 50, w: 280, h: 20, label: 'PMOS Parallel Fin MP1 (W=1.2μm)', componentId: 'FIN_P1', specs: { role: 'Pulls Y to VDD when Input A=0', type: '3D FinFET Fin', channelLength: '12 nm', finHeight: '45 nm', finWidth: '5 nm', mobility: '140 cm²/V·s', ion: '1.4 mA/μm' } },
          { type: 'fin', x: 50, y: 110, w: 280, h: 20, label: 'PMOS Parallel Fin MP2 (W=1.2μm)', componentId: 'FIN_P2', specs: { role: 'Pulls Y to VDD when Input B=0', type: '3D FinFET Fin', channelLength: '12 nm', finHeight: '45 nm', finWidth: '5 nm', mobility: '140 cm²/V·s', ion: '1.4 mA/μm' } },
          { type: 'fin', x: 50, y: 170, w: 280, h: 20, label: 'NMOS Series Fin MN1+MN2 (W=0.6μm)', componentId: 'FIN_N_SERIES', specs: { role: 'Pulls Y to VSS only when both A=1 and B=1', type: '3D FinFET Fin', channelLength: '12 nm', finHeight: '45 nm', finWidth: '5 nm', mobility: '350 cm²/V·s', ion: '1.9 mA/μm' } },
          { type: 'gate', x: 120, y: 35, w: 24, h: 180, label: 'HKMG Gate A', componentId: 'GATE_A', specs: { role: 'Gate electrode for Input A', signal: 'Input A', type: 'High-K Metal Gate', dielectric: 'HfO2 (EOT 0.75nm)', workFunction: '4.65 eV (TiN/TiAl)', gateCap: '0.85 fF' } },
          { type: 'gate', x: 220, y: 35, w: 24, h: 180, label: 'HKMG Gate B', componentId: 'GATE_B', specs: { role: 'Gate electrode for Input B', signal: 'Input B', type: 'High-K Metal Gate', dielectric: 'HfO2 (EOT 0.75nm)', workFunction: '4.65 eV (TiN/TiAl)', gateCap: '0.85 fF' } }
        ]
      },
      {
        id: 'm1',
        name: 'Metal 1: Local Power & Interconnect Rails (M1)',
        level: 2,
        thickness: 45,
        sheetRes: '0.45 Ω/sq',
        altitude: 85,
        material: 'Cobalt (Co)',
        color: '#3b82f6',
        features: [
          { type: 'wire', x: 30, y: 40, w: 320, h: 18, label: 'VDD Power Rail (M1 Cobalt)', componentId: 'M1_VDD', specs: { role: 'Positive supply voltage rail', voltage: '0.85 V', width: '32 nm', sheetRes: '0.45 Ω/sq', currentMax: '15 mA' } },
          { type: 'wire', x: 110, y: 75, w: 45, h: 90, label: 'Output Net Y (Co Liner)', componentId: 'M1_NET_Y', specs: { role: 'NAND output node', net: 'Y', parasiticC: '1.4 fF', delay: '2.4 ps' } },
          { type: 'wire', x: 210, y: 75, w: 45, h: 90, label: 'Internal Series Node (N_INT)', componentId: 'M1_NODE_INT', specs: { role: 'Intermediate node between MN1 and MN2', net: 'N_INT', delay: '1.2 ps' } },
          { type: 'wire', x: 30, y: 210, w: 320, h: 18, label: 'VSS Ground Rail (M1 Cobalt)', componentId: 'M1_VSS', specs: { role: 'Ground reference rail', voltage: '0.0 V (GND)', width: '32 nm', sheetRes: '0.45 Ω/sq', currentMax: '15 mA' } }
        ]
      },
      {
        id: 'm2',
        name: 'Metal 2: Orthogonal Signal Routing (M2)',
        level: 3,
        thickness: 55,
        sheetRes: '0.22 Ω/sq',
        altitude: 130,
        material: 'Copper (Cu)',
        color: '#10b981',
        features: [
          { type: 'wire', x: 80, y: 25, w: 22, h: 210, label: 'Input A Net (M2 Cu)', componentId: 'M2_A', specs: { role: 'Input A external routing', net: 'A', width: '28 nm', sheetRes: '0.22 Ω/sq', rcDelay: '1.2 ps' } },
          { type: 'wire', x: 180, y: 25, w: 22, h: 210, label: 'Input B Net (M2 Cu)', componentId: 'M2_B', specs: { role: 'Input B external routing', net: 'B', width: '28 nm', sheetRes: '0.22 Ω/sq', rcDelay: '1.2 ps' } },
          { type: 'wire', x: 270, y: 25, w: 22, h: 210, label: 'Output Y Net (M2 Cu)', componentId: 'M2_Y', specs: { role: 'Output Y external routing', net: 'Y (~(A & B))', width: '28 nm', sheetRes: '0.22 Ω/sq', rcDelay: '1.5 ps' } }
        ]
      },
      {
        id: 'm3',
        name: 'Metal 3: Semi-Global Clock & Bus (M3)',
        level: 4,
        thickness: 75,
        sheetRes: '0.12 Ω/sq',
        altitude: 180,
        material: 'Copper (Cu)',
        color: '#a855f7',
        features: [
          { type: 'wire', x: 40, y: 70, w: 300, h: 28, label: 'Clock Trunk 1.2GHz', componentId: 'M3_CLK', specs: { role: 'High-speed clock routing trunk', net: 'CLK', frequency: '1.2 GHz', sheetRes: '0.12 Ω/sq' } },
          { type: 'wire', x: 40, y: 140, w: 300, h: 28, label: 'Reset Signal Net', componentId: 'M3_RST', specs: { role: 'Synchronous reset distribution', net: 'RST', sheetRes: '0.12 Ω/sq' } }
        ]
      },
      {
        id: 'top',
        name: 'Top Metal 7: Global Power Mesh & TSV Bumps',
        level: 5,
        thickness: 160,
        sheetRes: '0.04 Ω/sq',
        altitude: 235,
        material: 'Copper (Cu)',
        color: '#f59e0b',
        features: [
          { type: 'pad', x: 60, y: 55, w: 70, h: 70, label: '3D TSV Microbump 1 (VDD)', componentId: 'TSV_BUMP1', specs: { role: '3D vertical power microbump', diameter: '1.2 μm', height: '1.8 μm', resistance: '0.012 Ω', cap: '6.5 fF' } },
          { type: 'pad', x: 230, y: 55, w: 70, h: 70, label: '3D TSV Microbump 2 (VSS)', componentId: 'TSV_BUMP2', specs: { role: '3D vertical ground microbump', diameter: '1.2 μm', height: '1.8 μm', resistance: '0.012 Ω', cap: '6.5 fF' } },
          { type: 'wire', x: 20, y: 160, w: 340, h: 44, label: 'Global Ultra-Thick VDD Strap (M7)', componentId: 'M7_STRAP', specs: { role: 'Global power delivery mesh strap', thickness: '1.2 μm', width: '340 nm', sheetRes: '0.04 Ω/sq', currentMax: '65 mA' } }
        ]
      }
    ]
  };

  // Set initial selected spec to the first interesting feature
  useEffect(() => {
    if (defaultData && defaultData.layers[1]?.features[0]) {
      const f = defaultData.layers[1].features[0];
      setSelectedSpec({
        title: f.label || '3D FinFET Channel',
        category: 'FEOL Active Transistor',
        role: f.specs?.role || 'Tri-gate conduction channel',
        material: 'Single-Crystal Silicon & High-K Metal Gate',
        geometry: 'Fin Height: 45 nm • Width: 5 nm • Lg: 12 nm',
        electrical: {
          'Drive Current (Ion)': f.specs?.ion || '1.8 mA/μm',
          'Leakage (Ioff)': f.specs?.ioff || '2.0 nA/μm',
          'Threshold Voltage (Vth)': '0.28 V'
        },
        drcRule: 'Contacted Poly Pitch (CPP): 42 nm'
      });
    }
  }, [defaultData.chipName]);

  const toggleLayerVisibility = (id: string) => {
    setHiddenLayerIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setRotZ(prev => prev + dx * 0.5);
      setRotX(prev => Math.min(Math.max(prev - dy * 0.5, 0), 90));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const applyViewPreset = (pitch: number, yaw: number) => {
    setRotX(pitch);
    setRotZ(yaw);
    setIsAutoRotating(false);
  };

  const handleSelectFeature = (layer: MetalLayer3D, feat: MetalFeature3D) => {
    setSelectedSpec({
      title: feat.label || feat.type.toUpperCase(),
      category: layer.name,
      role: feat.specs?.role || `Conduction path in ${layer.name}`,
      material: layer.material,
      geometry: `Thickness: ${layer.thickness} nm • Level: L${layer.level}`,
      electrical: {
        'Sheet Resistance (Rs)': layer.sheetRes,
        ...(feat.specs?.voltage ? { 'Operating Voltage': feat.specs.voltage } : {}),
        ...(feat.specs?.delay ? { 'Propagation Delay': feat.specs.delay } : {}),
        ...(feat.specs?.currentMax ? { 'Max Current': feat.specs.currentMax } : {}),
        ...(feat.specs?.parasiticC ? { 'Parasitic Capacitance': feat.specs.parasiticC } : {})
      },
      drcRule: `Min Pitch for ${layer.name}: 28nm EUV`
    });
  };

  return (
    <div className={`w-full h-full flex flex-col bg-[#0a0d12] text-gray-200 select-none ${isFullscreen ? 'fixed inset-0 z-50 overflow-hidden' : 'overflow-y-auto'}`}>
      
      {/* Top Banner & Control Bar */}
      <div className="p-3 bg-[#111620] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
            <Layers3 size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-100 flex items-center space-x-2">
              <span>{defaultData.chipName}</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono">
                {defaultData.technologyNode}
              </span>
              {defaultData.booleanFormula && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                  {defaultData.booleanFormula}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400">Dynamic 3D Silicon Stack • Click any block in the 3D diagram to view its specifications</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          
          {/* Mode Switcher */}
          <div className="flex items-center bg-black/50 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode('render')}
              className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'render' 
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ImageIcon size={13} />
              <span>3D Cross-Section (Dynamic)</span>
            </button>
            <button
              onClick={() => setViewMode('cad')}
              className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'cad' 
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Cuboid size={13} />
              <span>3D CAD Orbit</span>
            </button>
          </div>

          {/* Preset Angle Views (in CAD mode) */}
          {viewMode === 'cad' && (
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10">
              <span className="text-[10px] text-gray-400 px-1">Angles:</span>
              <button
                onClick={() => applyViewPreset(60, -35)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${rotX === 60 && rotZ === -35 ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-400 hover:text-white'}`}
                title="Isometric 3D Perspective"
              >
                Iso
              </button>
              <button
                onClick={() => applyViewPreset(0, 0)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${rotX === 0 && rotZ === 0 ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-400 hover:text-white'}`}
                title="Top-Down Die Layout"
              >
                Top
              </button>
              <button
                onClick={() => applyViewPreset(90, 0)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${rotX === 90 && rotZ === 0 ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-400 hover:text-white'}`}
                title="Cross-Section Layer View"
              >
                Side
              </button>
              <button
                onClick={() => applyViewPreset(45, -45)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${rotX === 45 && rotZ === -45 ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-400 hover:text-white'}`}
                title="45-Degree Angled"
              >
                45°
              </button>
            </div>
          )}

          {/* CAD Z-Peel Slider */}
          {viewMode === 'cad' && (
            <div className="flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
              <Sliders size={13} className="text-cyan-400" />
              <span className="text-gray-400">Z-Peel:</span>
              <input 
                type="range" 
                min="0.4" 
                max="2.8" 
                step="0.1"
                value={explosionZ} 
                onChange={e => setExplosionZ(parseFloat(e.target.value))}
                className="w-16 accent-cyan-400 cursor-pointer"
              />
              <span className="text-cyan-300 w-8">{explosionZ.toFixed(1)}x</span>
            </div>
          )}

          {/* Auto Rotate Toggle */}
          {viewMode === 'cad' && (
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`px-2.5 py-1.5 rounded-md border transition-all flex items-center space-x-1.5 cursor-pointer ${
                isAutoRotating 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold' 
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
              }`}
              title="Auto-rotate 3D Viewport"
            >
              {isAutoRotating ? <Pause size={13} /> : <Play size={13} />}
              <span>Spin</span>
            </button>
          )}

          {/* Zoom Buttons */}
          <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
              className="p-1 hover:bg-white/10 text-gray-300 rounded cursor-pointer transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] text-cyan-400 px-1 font-mono">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.15, 2.2))}
              className="p-1 hover:bg-white/10 text-gray-300 rounded cursor-pointer transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`px-3 py-1.5 rounded-md border transition-all flex items-center space-x-1.5 cursor-pointer ${
              isFullscreen 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' 
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas with In-Diagram Specification Overlay */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4 p-4 overflow-hidden relative">
        
        {/* VIEW MODE 1: PHOTOREALISTIC 3D SEMICONDUCTOR CROSS-SECTION RENDER WITH DIRECT IN-DIAGRAM HOTSPOTS */}
        {viewMode === 'render' && (
          <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#07090e] border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl group">
            
            {/* 3D Visual Render & Hotspots Area */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-3">
              <div 
                className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                {/* Photorealistic 3D Silicon Stack Render Image */}
                <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 group/img max-w-[840px] w-full">
                  <img 
                    src="/images/chip_3d_render.jpg" 
                    alt="3D FinFET Silicon Stack Photorealistic Cross-Section" 
                    className="w-full h-auto object-cover rounded-2xl drop-shadow-2xl brightness-105 contrast-105"
                  />

                  {/* Gradient Lighting & Edge Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none rounded-2xl" />

                  {/* Top Badge Overlay on 3D Render */}
                  <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15 text-[11px] font-mono flex items-center space-x-2 text-gray-200 shadow-xl pointer-events-none">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span>3D GAA-FET / FinFET Silicon Cross-Section</span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                      {defaultData.chipName}
                    </span>
                  </div>

                  {/* INTERACTIVE HOTSPOT 1: TOP 3D TSV MICROBUMPS & GOLD POWER STRAPS */}
                  <button 
                    onClick={() => handleSelectFeature(defaultData.layers[defaultData.layers.length - 1], defaultData.layers[defaultData.layers.length - 1].features[0])}
                    className="absolute top-[8%] left-[16%] -translate-x-1/2 -translate-y-1/2 z-20 group/hs cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white shadow-lg shadow-amber-500/50"></span>
                      <div className="absolute left-6 whitespace-nowrap bg-black/90 backdrop-blur-md text-amber-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-amber-500/40 shadow-xl opacity-90 group-hover/hs:opacity-100 group-hover/hs:scale-105 transition-all">
                        Top TSV Microbumps (M7)
                      </div>
                    </div>
                  </button>

                  {/* INTERACTIVE HOTSPOT 2: GOLD POWER STRAPS */}
                  <button 
                    onClick={() => handleSelectFeature(defaultData.layers[defaultData.layers.length - 1], defaultData.layers[defaultData.layers.length - 1].features[defaultData.layers[defaultData.layers.length - 1].features.length - 1] || defaultData.layers[defaultData.layers.length - 1].features[0])}
                    className="absolute top-[6%] right-[28%] -translate-x-1/2 -translate-y-1/2 z-20 group/hs cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white shadow-lg shadow-amber-500/50"></span>
                      <div className="absolute right-6 whitespace-nowrap bg-black/90 backdrop-blur-md text-amber-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-amber-500/40 shadow-xl opacity-90 group-hover/hs:opacity-100 group-hover/hs:scale-105 transition-all">
                        Gold Power Delivery Straps
                      </div>
                    </div>
                  </button>

                  {/* INTERACTIVE HOTSPOT 3: MULTI-LAYER COPPER BEOL INTERCONNECTS (M2-M6) */}
                  <button 
                    onClick={() => handleSelectFeature(defaultData.layers[3] || defaultData.layers[2], (defaultData.layers[3] || defaultData.layers[2]).features[0])}
                    className="absolute top-[32%] left-[42%] -translate-x-1/2 -translate-y-1/2 z-20 group/hs cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-white shadow-lg shadow-cyan-500/50"></span>
                      <div className="absolute left-6 whitespace-nowrap bg-black/90 backdrop-blur-md text-cyan-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-cyan-500/40 shadow-xl opacity-90 group-hover/hs:opacity-100 group-hover/hs:scale-105 transition-all">
                        BEOL Copper Routing Mesh (M2-M6)
                      </div>
                    </div>
                  </button>

                  {/* INTERACTIVE HOTSPOT 4: COBALT M1 LOCAL INTERCONNECTS */}
                  <button 
                    onClick={() => handleSelectFeature(defaultData.layers[2], defaultData.layers[2].features[0])}
                    className="absolute top-[48%] left-[34%] -translate-x-1/2 -translate-y-1/2 z-20 group/hs cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/50"></span>
                      <div className="absolute left-6 whitespace-nowrap bg-black/90 backdrop-blur-md text-blue-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-blue-500/40 shadow-xl opacity-90 group-hover/hs:opacity-100 group-hover/hs:scale-105 transition-all">
                        Cobalt M1 Power Rails (VDD/VSS)
                      </div>
                    </div>
                  </button>

                  {/* INTERACTIVE HOTSPOT 5: 3D FINFET & 3nm HKMG ACTIVE GATES */}
                  <button 
                    onClick={() => handleSelectFeature(defaultData.layers[1], defaultData.layers[1].features[0])}
                    className="absolute top-[65%] left-[32%] -translate-x-1/2 -translate-y-1/2 z-20 group/hs cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white shadow-lg shadow-red-500/50"></span>
                      <div className="absolute right-6 whitespace-nowrap bg-black/90 backdrop-blur-md text-red-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-red-500/40 shadow-xl opacity-90 group-hover/hs:opacity-100 group-hover/hs:scale-105 transition-all">
                        3D FinFET Active Fins (3nm HKMG)
                      </div>
                    </div>
                  </button>

                  {/* INTERACTIVE HOTSPOT 6: GAA-FET NANOSHEET STACK */}
                  <button 
                    onClick={() => handleSelectFeature(defaultData.layers[1], defaultData.layers[1].features[defaultData.layers[1].features.length - 1] || defaultData.layers[1].features[0])}
                    className="absolute top-[68%] right-[28%] -translate-x-1/2 -translate-y-1/2 z-20 group/hs cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-lg shadow-emerald-500/50"></span>
                      <div className="absolute left-6 whitespace-nowrap bg-black/90 backdrop-blur-md text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-emerald-500/40 shadow-xl opacity-90 group-hover/hs:opacity-100 group-hover/hs:scale-105 transition-all">
                        GAA-FET Nanosheet Stack
                      </div>
                    </div>
                  </button>

                  {/* INTERACTIVE HOTSPOT 7: BULK SILICON SUBSTRATE */}
                  <button 
                    onClick={() => handleSelectFeature(defaultData.layers[0], defaultData.layers[0].features[0])}
                    className="absolute bottom-[8%] left-[22%] -translate-x-1/2 -translate-y-1/2 z-20 group/hs cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-slate-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-slate-500 border-2 border-white shadow-lg shadow-slate-500/50"></span>
                      <div className="absolute left-6 whitespace-nowrap bg-black/90 backdrop-blur-md text-slate-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-slate-500/40 shadow-xl opacity-90 group-hover/hs:opacity-100 group-hover/hs:scale-105 transition-all">
                        P-Silicon Substrate Base (&lt;100&gt; Si)
                      </div>
                    </div>
                  </button>

                </div>

                {/* IN-DIAGRAM FLOATING SPECIFICATION CARD DIRECTLY ON TOP OF THE 3D CANVAS */}
                {selectedSpec && (
                  <div 
                    className="absolute top-4 right-4 z-40 bg-[#0d121c]/95 backdrop-blur-xl border border-cyan-500/50 p-4 rounded-2xl shadow-2xl font-mono text-xs w-88 text-left pointer-events-auto animate-fadeIn"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
                          <Cpu size={16} />
                        </div>
                        <div>
                          <h4 className="text-white font-bold font-sans text-xs">{selectedSpec.title}</h4>
                          <span className="text-[10px] text-cyan-400">{selectedSpec.category}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedSpec(null)}
                        className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Circuit-Specific Role Description */}
                    <div className="text-[11px] text-gray-200 font-sans leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/5 mb-2.5">
                      {selectedSpec.role}
                    </div>

                    {/* Physical & Electrical Specifications */}
                    <div className="space-y-1 text-[10.5px] bg-black/50 p-2.5 rounded-lg border border-white/10 mb-2">
                      <div className="flex justify-between text-gray-400 border-b border-white/5 pb-1">
                        <span>Material Composition:</span>
                        <span className="text-emerald-400 font-bold">{selectedSpec.material}</span>
                      </div>
                      <div className="flex justify-between text-gray-400 border-b border-white/5 py-1">
                        <span>Geometry & Layer:</span>
                        <span className="text-white font-bold">{selectedSpec.geometry}</span>
                      </div>
                      {Object.entries(selectedSpec.electrical).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-gray-400 border-b border-white/5 py-1">
                          <span>{k}:</span>
                          <span className="text-cyan-300 font-bold">{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* DRC Rules */}
                    <div className="text-[9.5px] text-gray-400 bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-500/30 flex items-start space-x-1 font-sans">
                      <CheckCircle2 size={12} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span><strong className="text-cyan-300">DRC Rule:</strong> {selectedSpec.drcRule}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Quick-Select Bar of Active Circuit Elements */}
            <div className="absolute bottom-3 left-3 right-3 bg-[#111620]/95 backdrop-blur-md border border-white/15 p-2 rounded-xl flex items-center justify-between gap-2 overflow-x-auto text-[11px] font-mono shadow-2xl">
              <div className="flex items-center space-x-2 text-cyan-400 px-2 flex-shrink-0 font-sans font-bold">
                <Sparkles size={14} />
                <span>{defaultData.circuitType || 'Circuit'} Components:</span>
              </div>
              <div className="flex items-center space-x-1.5 overflow-x-auto flex-1">
                {defaultData.layers.flatMap(l => l.features).map((feat, idx) => {
                  const isSel = selectedSpec?.title === (feat.label || feat.type.toUpperCase());
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const layer = defaultData.layers.find(l => l.features.includes(feat)) || defaultData.layers[0];
                        handleSelectFeature(layer, feat);
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                        isSel 
                          ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow' 
                          : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {feat.label || feat.type.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE 2: INTERACTIVE 3D CAD ORBIT CANVAS WITH IN-DIAGRAM COMPONENT CALLOUTS */}
        {viewMode === 'cad' && (
          <div 
            className="flex-1 h-full flex items-center justify-center bg-[#131924]/80 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative cursor-grab active:cursor-grabbing"
            style={{ perspective: '1300px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Top Pitch & Yaw Angle Tracker Badge */}
            <div className="absolute top-3 left-3 z-20 pointer-events-none text-xs text-gray-300 bg-black/80 px-3.5 py-1.5 rounded-lg border border-white/15 font-mono flex items-center space-x-3 backdrop-blur-sm shadow-md">
              <Compass size={14} className="text-cyan-400" />
              <span>Drag to Rotate in 3D</span>
              <span className="text-cyan-400 font-bold">Pitch: {Math.round(rotX)}°</span>
              <span className="text-emerald-400 font-bold">Yaw: {Math.round(rotZ)}°</span>
            </div>

            {/* Hovered Feature Tooltip */}
            {hoveredLabel && (
              <div className="absolute bottom-3 left-3 z-20 pointer-events-none text-xs text-white bg-cyan-950/95 px-3 py-1.5 rounded-lg border border-cyan-500/40 font-mono backdrop-blur-sm shadow-lg flex items-center space-x-2">
                <Zap size={14} className="text-cyan-400" />
                <span>{hoveredLabel}</span>
              </div>
            )}

            {/* IN-DIAGRAM FLOATING SPECIFICATION CARD FOR SELECTED CAD BLOCK */}
            {selectedSpec && (
              <div 
                className="absolute top-14 right-4 z-40 bg-[#0d121c]/95 backdrop-blur-xl border border-amber-500/50 p-4 rounded-2xl shadow-2xl font-mono text-xs w-84 text-left pointer-events-auto animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-2 mb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                      <Zap size={15} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold font-sans text-xs">{selectedSpec.title}</h4>
                      <span className="text-[10px] text-amber-400">{selectedSpec.category}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSpec(null)}
                    className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-[11px] text-gray-200 font-sans leading-relaxed bg-black/40 p-2 rounded-lg border border-white/5 mb-2.5">
                  {selectedSpec.role}
                </p>

                <div className="space-y-1 text-[10.5px] bg-black/50 p-2.5 rounded-lg border border-white/10">
                  <div className="flex justify-between text-gray-400 border-b border-white/5 pb-1">
                    <span>Material:</span>
                    <span className="text-white font-bold">{selectedSpec.material}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 border-b border-white/5 py-1">
                    <span>Geometry:</span>
                    <span className="text-cyan-300 font-bold">{selectedSpec.geometry}</span>
                  </div>
                  {Object.entries(selectedSpec.electrical).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-gray-400 border-b border-white/5 py-1">
                      <span>{k}:</span>
                      <span className="text-amber-300 font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3D Stack Container */}
            <div 
              className="w-[420px] h-[300px] relative transition-transform duration-75 ease-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${zoom})`,
              }}
            >
              {defaultData.layers.map((layer) => {
                if (hiddenLayerIds[layer.id]) return null;
                const isSelected = selectedLayerId === layer.id;
                const zVal = layer.altitude * explosionZ;

                return (
                  <div
                    key={layer.id}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedLayerId(layer.id); 
                    }}
                    className={`absolute inset-0 rounded-2xl transition-all cursor-pointer border ${
                      isSelected 
                        ? 'border-cyan-400 bg-[#162032]/95 ring-2 ring-cyan-500/40 shadow-2xl shadow-cyan-500/25' 
                        : 'border-white/15 bg-[#121824]/85 hover:border-cyan-400/50'
                    }`}
                    style={{
                      transform: `translateZ(${zVal}px)`,
                      boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                      backdropFilter: showDielectric ? 'blur(2px)' : undefined
                    }}
                  >
                    {showDielectric && (
                      <div className="absolute inset-0 bg-cyan-900/10 rounded-2xl pointer-events-none border border-cyan-400/20" />
                    )}

                    <div className="absolute -left-28 top-2 bg-black/85 text-white text-[9px] font-mono px-2 py-0.5 rounded-md border border-white/15 flex items-center space-x-1.5 shadow-md">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                      <span>L{layer.level}: {layer.name.slice(0, 14)}</span>
                    </div>

                    <svg className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id={`grad-${layer.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={layer.color} stopOpacity="0.9" />
                          <stop offset="100%" stopColor={layer.color} stopOpacity="0.6" />
                        </linearGradient>
                      </defs>

                      {layer.features.map((feat, idx) => (
                        <g 
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFeature(layer, feat);
                          }}
                          onMouseEnter={() => setHoveredLabel(`[${layer.name}] ${feat.label || feat.type.toUpperCase()}`)}
                          onMouseLeave={() => setHoveredLabel(null)}
                          className="cursor-pointer"
                        >
                          <rect
                            x={feat.x}
                            y={feat.y}
                            width={feat.w}
                            height={feat.h}
                            rx={feat.type === 'pad' ? 10 : feat.type === 'fin' ? 4 : 3}
                            fill={`url(#grad-${layer.id})`}
                            stroke={selectedSpec?.title === feat.label ? '#f59e0b' : isSelected ? '#38bdf8' : '#ffffff'}
                            strokeWidth={selectedSpec?.title === feat.label ? 2.5 : isSelected ? 1.8 : 0.8}
                            strokeOpacity={0.9}
                            className="transition-all hover:stroke-amber-300 hover:fill-opacity-100"
                          />
                          {feat.label && (
                            <text
                              x={feat.x + feat.w / 2}
                              y={feat.y + feat.h / 2 + 3}
                              fill="#ffffff"
                              fontSize="8"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                              className="pointer-events-none select-none drop-shadow"
                            >
                              {feat.label}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RIGHT SIDE: SILICON STACK CHARACTERISTICS & BEOL LAYER LIST */}
        {!isFullscreen && (
          <div className="w-full xl:w-96 flex flex-col space-y-3.5 text-xs font-sans overflow-y-auto max-h-full flex-shrink-0">
            
            {/* Silicon Stack Metrics */}
            <div className="bg-[#131924] p-4 rounded-xl border border-white/10 space-y-2.5 font-mono text-[11px] flex-shrink-0">
              <h3 className="text-gray-200 font-bold font-sans text-xs border-b border-white/10 pb-2 flex items-center space-x-1.5">
                <Zap size={14} className="text-cyan-400" />
                <span>3D Silicon Stack Characteristics</span>
              </h3>
              <div className="flex justify-between text-gray-400">
                <span>Circuit Logic Type:</span>
                <span className="text-emerald-400 font-bold">{defaultData.circuitType || 'Standard Cell'}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Contacted Poly Pitch (CPP):</span>
                <span className="text-cyan-300 font-bold">{defaultData.metrics.gatePitch}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Metal 1 Track Pitch:</span>
                <span className="text-cyan-400 font-bold">{defaultData.metrics.metal1Pitch}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>3D TSV Microbump Diameter:</span>
                <span className="text-amber-400 font-bold">{defaultData.metrics.tsvDiameter}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>RC Interconnect Delay:</span>
                <span className="text-purple-400 font-bold">{defaultData.metrics.interconnectDelay}</span>
              </div>
            </div>

            {/* Silicon & BEOL Layers List */}
            <div className="bg-[#131924] p-3.5 rounded-xl border border-white/10 space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center space-x-1.5">
                  <Layers size={14} className="text-cyan-400" />
                  <h4 className="text-gray-200 font-bold text-xs">BEOL Layer Stack</h4>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{defaultData.layers.length} Layers</span>
              </div>

              <div className="space-y-1.5">
                {defaultData.layers.slice().reverse().map((layer) => {
                  const isSelected = selectedLayerId === layer.id;
                  const isHidden = hiddenLayerIds[layer.id];

                  return (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`w-full p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer font-mono text-[11px] ${
                        isSelected 
                          ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold' 
                          : isHidden 
                            ? 'bg-black/20 border-white/5 text-gray-600'
                            : 'bg-black/40 border-white/10 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: layer.color }} />
                        <span className="truncate">{layer.name}</span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-[10px] text-gray-400 bg-white/5 px-1 py-0.5 rounded">
                          {layer.thickness}nm
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer.id);
                          }}
                          className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                          title={isHidden ? 'Show Layer' : 'Hide Layer'}
                        >
                          {isHidden ? <EyeOff size={12} className="text-gray-600" /> : <Eye size={12} className="text-cyan-400" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* GDSII Stream File & Physical DRC Card */}
              <div className="mt-4 pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    GDSII Stream File &amp; DRC
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    0 Errors (Clean)
                  </span>
                </div>

                <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 space-y-1.5 text-[11px] font-mono text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stream Standard:</span>
                    <span className="text-white font-bold">GDSII v6.0 (.gds)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Physical Die Area:</span>
                    <span className="text-emerald-400 font-bold">185.4 μm²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">GDSII Layers:</span>
                    <span className="text-cyan-400 font-bold">5 Stream Layers</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Foundry DRC Rulebook:</span>
                    <span className="text-gray-300">3nm GAA-FET Rulebook</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const gdsContent = `HEADER 600\nBGNLIB\nLIBNAME vlsi_studio_chip_gdsii\nUNITS 0.001 1e-9\nBGNSTR\nSTRNAME top_chip_layout\nBOUNDARY LAYER 1 DATATYPE 0 XY 0 0 1000 0 1000 1000 0 1000 0 0\nENDSTR\nENDLIB\n`;
                    const blob = new Blob([gdsContent], { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'vlsi_chip_layout.gds';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold font-mono flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
                >
                  <ArrowUpRight size={14} />
                  <span>📥 Export GDSII Stream File (.gds)</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

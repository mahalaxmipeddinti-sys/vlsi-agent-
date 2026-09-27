import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  Box, 
  Camera, 
  RotateCw, 
  Layers, 
  Info, 
  Sparkles, 
  Cpu, 
  CheckCircle2, 
  Eye, 
  ShieldCheck,
  Maximize2,
  ZoomIn
} from 'lucide-react';

interface IC3DViewerProps {
  icName: string;
  pinCount: number;
  icFullName?: string;
  pins?: Record<string, string>;
}

// Curated high-fidelity 3D renders and macro photography representing physical IC hardware
const IC_3D_RENDER_VIEWS = [
  {
    id: 'studio-macro',
    title: '3D Studio Macro Render',
    subtitle: 'High-resolution raytraced view of DIP encapsulation on circuit substrate',
    badge: '3D Raytraced',
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1400&q=85',
    description: 'Photorealistic macro render of a dual in-line package (DIP) IC seated on a high-density FR4 PCB with illuminated circuit pathways and specular reflections on lead-frame pins.',
    hotspots: [
      { top: '38%', left: '50%', label: 'Laser-Etched Marking', detail: 'Epoxy novolac resin with permanent Nd:YAG laser-etched IC part ID, batch date code, and manufacturer logos.' },
      { top: '22%', left: '46%', label: 'Pin 1 Index Notch', detail: 'Semi-circular mechanical orientation notch ensuring correct PCB socket insertion polarity.' },
      { top: '56%', left: '26%', label: 'Copper Leadframe Pins', detail: 'Through-hole phosphor bronze leads with 100% matte-tin plating for solderability.' },
      { top: '72%', left: '58%', label: 'PCB Ground & Power Plane', detail: 'Low-impedance return current copper layers delivering stable VCC/GND rails.' }
    ]
  },
  {
    id: 'die-cutaway',
    title: 'Silicon Die & Wire-Bond 3D Cutaway',
    subtitle: 'Microscopic internal semiconductor architecture with gold bond wires',
    badge: 'Internal Die X-Ray',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=85',
    description: 'De-encapsulated internal view exposing the micrometric silicon die with VLSI gate diffusion layers, interconnected to external leadframe pins via 25µm 99.99% gold (Au) ultrasonic ball-bonds.',
    hotspots: [
      { top: '48%', left: '49%', label: 'Silicon Microchip Die', detail: 'Active silicon substrate containing thousands of CMOS/TTL transistors fabricated with photolithography.' },
      { top: '36%', left: '38%', label: 'Gold Wire-Bonds (Au)', detail: '25µm diameter ultrasonic thermo-compression wire bonds bridging silicon I/O pads to leadframe fingers.' },
      { top: '64%', left: '62%', label: 'Die Attach Paddle', detail: 'Central copper slug providing mechanical mounting and direct thermal dissipation away from junction.' },
      { top: '28%', left: '60%', label: 'Passivation Layer', detail: 'Silicon nitride (Si3N4) scratch protection and moisture barrier over interconnect metallization.' }
    ]
  },
  {
    id: 'pcb-mount',
    title: 'PCB Socket & Hardware Mount',
    subtitle: 'Physical system integration on multi-layer computing motherboard',
    badge: 'Hardware Integration',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=85',
    description: 'Industrial assembly view showing the IC package inserted into a dual-wipe phosphor bronze socket on a multi-layer development board with bypass decoupling capacitors.',
    hotspots: [
      { top: '42%', left: '48%', label: 'Decoupling Capacitor', detail: '0.1µF MLCC placed in immediate proximity to pin 14 (VCC) to suppress switching transients.' },
      { top: '55%', left: '35%', label: '2.54mm Breadboard Pitch', detail: 'Industry-standard 100-mil pin pitch compatible with breadboards, prototype matrices, and sockets.' },
      { top: '30%', left: '65%', label: 'Dual-Wipe Socket', detail: 'High-reliability machined socket allowing rapid non-destructive chip replacement during testing.' }
    ]
  }
];

// --- Interactive 3D WebGL Mesh Component ---
function ICModel({ icName, pinCount, isRotating }: { icName: string; pinCount: number; isRotating: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const pinsPerSide = Math.max(1, Math.floor(pinCount / 2));
  
  // Dimensions
  const bodyLength = pinsPerSide * 0.85 + 0.6;
  const bodyWidth = 2.4;
  const bodyHeight = 0.75;
  
  useFrame(() => {
    if (groupRef.current && isRotating) {
      groupRef.current.rotation.y += 0.008;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* IC Main Molded Body (Matte Black Epoxy Resin) */}
      <mesh position={[0, bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyWidth, bodyHeight, bodyLength]} />
        <meshStandardMaterial 
          color="#151719" 
          roughness={0.7} 
          metalness={0.15} 
        />
      </mesh>
      
      {/* Top chamfer / mold line highlight */}
      <mesh position={[0, bodyHeight + 0.005, 0]}>
        <boxGeometry args={[bodyWidth - 0.2, 0.01, bodyLength - 0.2]} />
        <meshStandardMaterial color="#1f2328" roughness={0.5} />
      </mesh>

      {/* Pin 1 Orientation Notch (half cylinder cutout indicator) */}
      <mesh position={[0, bodyHeight + 0.01, bodyLength / 2 - 0.25]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.05, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.9} />
      </mesh>

      {/* Pin 1 Dot Marker */}
      <mesh position={[-bodyWidth / 2 + 0.4, bodyHeight + 0.012, bodyLength / 2 - 0.45]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
        <meshStandardMaterial color="#0b0d0e" roughness={0.9} />
      </mesh>

      {/* Laser Etched IC Part ID */}
      <Text
        position={[0, bodyHeight + 0.02, 0.1]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        fontSize={0.48}
        color="#d1d5db"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        {`SN${icName}N`}
      </Text>

      {/* Laser Etched Secondary Info */}
      <Text
        position={[0.45, bodyHeight + 0.02, -0.8]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        fontSize={0.22}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
      >
        {`TI 2420M`}
      </Text>

      {/* Metallic Pins (Leadframe) */}
      {Array.from({ length: pinCount }).map((_, i) => {
        const isLeft = i < pinsPerSide;
        const sideIndex = isLeft ? i : pinCount - 1 - i;
        
        const xPos = isLeft ? -bodyWidth / 2 - 0.25 : bodyWidth / 2 + 0.25;
        const zPos = (bodyLength / 2) - 0.7 - (sideIndex * 0.85);
        
        return (
          <group key={i} position={[xPos, bodyHeight / 2, zPos]}>
            {/* Horizontal shoulder section extending from epoxy */}
            <mesh position={[isLeft ? 0.12 : -0.12, 0, 0]}>
              <boxGeometry args={[0.3, 0.08, 0.32]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.92} roughness={0.18} />
            </mesh>
            {/* Downward bent vertical leg */}
            <mesh position={[isLeft ? -0.05 : 0.05, -0.42, 0]}>
              <boxGeometry args={[0.08, 0.75, 0.24]} />
              <meshStandardMaterial color="#e4e4e7" metalness={0.95} roughness={0.15} />
            </mesh>
            {/* Tapered insertion tip */}
            <mesh position={[isLeft ? -0.05 : 0.05, -0.82, 0]}>
              <boxGeometry args={[0.06, 0.15, 0.16]} />
              <meshStandardMaterial color="#a1a1aa" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        );
      })}

      {/* Substrate / PCB Solder Base */}
      <mesh position={[0, -0.88, 0]} receiveShadow>
        <boxGeometry args={[bodyWidth + 2.2, 0.08, bodyLength + 1.8]} />
        <meshStandardMaterial color="#062817" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Golden PCB Circuit traces */}
      {[-0.8, 0, 0.8].map((offset, idx) => (
        <mesh key={idx} position={[offset, -0.83, 0]}>
          <boxGeometry args={[0.08, 0.01, bodyLength + 1.2]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// --- Procedural 3D Isometric Package Diagram ---
function IsometricPackageDiagram({ icName, pinCount, pins }: { icName: string; pinCount: number; pins?: Record<string, string> }) {
  const pinsPerSide = Math.max(1, Math.floor(pinCount / 2));
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#08090a] overflow-auto">
      <div className="text-center mb-5">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs mb-2">
          <Sparkles size={13} />
          <span>Procedural 3D Package Schematic • DIP-{pinCount}</span>
        </div>
        <h4 className="text-xl font-bold font-mono text-gray-100 tracking-wide">
          {icName} Dual In-Line Package Outline
        </h4>
        <p className="text-xs text-gray-400 font-mono mt-1">
          Exact JEDEC MS-001 BA standard pinout layout with leadframe callouts
        </p>
      </div>

      <div className="relative max-w-xl w-full flex items-center justify-center py-6">
        {/* Isometric projection SVG */}
        <svg viewBox="0 0 540 380" className="w-full max-w-lg drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]">
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22262c" />
              <stop offset="50%" stopColor="#17191d" />
              <stop offset="100%" stopColor="#0d0e11" />
            </linearGradient>
            <linearGradient id="pinMetalGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a1a1aa" />
              <stop offset="50%" stopColor="#f4f4f5" />
              <stop offset="100%" stopColor="#71717a" />
            </linearGradient>
            <linearGradient id="glowBorder" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000000" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* PCB Surface Shadow */}
          <rect x="70" y="70" width="400" height="240" rx="14" fill="#0c120f" stroke="#10b981" strokeWidth="1" strokeOpacity="0.25" />
          
          {/* PCB Traces */}
          <path d="M 90 90 L 140 90 L 170 120" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
          <path d="M 450 290 L 400 290 L 370 260" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
          <circle cx="170" cy="120" r="3" fill="#10b981" fillOpacity="0.5" />
          <circle cx="370" cy="260" r="3" fill="#3b82f6" fillOpacity="0.5" />

          {/* Left Pins (Pin 1 to pinsPerSide) */}
          {Array.from({ length: pinsPerSide }).map((_, i) => {
            const pinNum = i + 1;
            const y = 90 + i * (190 / Math.max(1, pinsPerSide - 1));
            const pinName = pins ? pins[pinNum.toString()] || '' : '';
            return (
              <g key={`pin-left-${pinNum}`} className="group cursor-pointer">
                {/* Pin metal lead */}
                <rect x="110" y={y - 5} width="45" height="10" rx="2" fill="url(#pinMetalGrad)" stroke="#52525b" strokeWidth="0.5" />
                <rect x="95" y={y - 3} width="15" height="6" rx="1" fill="#e4e4e7" />
                {/* Pin number badge */}
                <circle cx="80" cy={y} r="10" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                <text x="80" y={y + 3.5} textAnchor="middle" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  {pinNum}
                </text>
                {/* Pin Name Label */}
                {pinName && (
                  <text x="64" y={y + 3.5} textAnchor="end" fill="#9ca3af" fontSize="10" fontFamily="monospace">
                    {pinName}
                  </text>
                )}
              </g>
            );
          })}

          {/* Right Pins (Pin pinCount down to pinsPerSide + 1) */}
          {Array.from({ length: pinsPerSide }).map((_, i) => {
            const pinNum = pinCount - i;
            const y = 90 + i * (190 / Math.max(1, pinsPerSide - 1));
            const pinName = pins ? pins[pinNum.toString()] || '' : '';
            return (
              <g key={`pin-right-${pinNum}`} className="group cursor-pointer">
                {/* Pin metal lead */}
                <rect x="385" y={y - 5} width="45" height="10" rx="2" fill="url(#pinMetalGrad)" stroke="#52525b" strokeWidth="0.5" />
                <rect x="430" y={y - 3} width="15" height="6" rx="1" fill="#e4e4e7" />
                {/* Pin number badge */}
                <circle cx="460" cy={y} r="10" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                <text x="460" y={y + 3.5} textAnchor="middle" fill="#3b82f6" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  {pinNum}
                </text>
                {/* Pin Name Label */}
                {pinName && (
                  <text x="476" y={y + 3.5} textAnchor="start" fill="#9ca3af" fontSize="10" fontFamily="monospace">
                    {pinName}
                  </text>
                )}
              </g>
            );
          })}

          {/* IC Body 3D Block */}
          <rect 
            x="150" 
            y="75" 
            width="240" 
            height="220" 
            rx="8" 
            fill="url(#bodyGrad)" 
            stroke="#3f3f46" 
            strokeWidth="1.5" 
            filter="url(#shadow)" 
          />

          {/* Top Surface Chamfer Accent */}
          <rect x="156" y="81" width="228" height="208" rx="5" fill="none" stroke="#27272a" strokeWidth="1.2" />

          {/* Pin 1 Orientation Notch (Top Center) */}
          <path d="M 252 75 A 18 18 0 0 1 288 75 Z" fill="#090a0c" stroke="#3f3f46" strokeWidth="1" />

          {/* Pin 1 Datum Dot (Upper Left) */}
          <circle cx="178" cy="100" r="4.5" fill="#0a0a0c" stroke="#52525b" strokeWidth="1" />

          {/* Laser Etched IC Part Number */}
          <text x="270" y="165" textAnchor="middle" fill="#e5e7eb" fontSize="22" fontFamily="monospace" fontWeight="bold" letterSpacing="2">
            SN{icName}N
          </text>
          
          <text x="270" y="190" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontFamily="monospace" letterSpacing="1">
            QUAD 2-INPUT POS-NAND
          </text>

          <text x="270" y="215" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="monospace">
            TI MALAYSIA • 2420M • DIP-{pinCount}
          </text>

          {/* Decorative Laser Etch Logo Badge */}
          <rect x="250" y="235" width="40" height="14" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
          <text x="270" y="245" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            JEDEC
          </text>
        </svg>
      </div>

      {/* Package Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl w-full mt-2 text-xs font-mono">
        <div className="p-2.5 rounded bg-[#121418] border border-white/10 text-center">
          <span className="text-gray-500 block text-[10px]">PACKAGE</span>
          <span className="text-emerald-400 font-bold">PDIP-{pinCount}</span>
        </div>
        <div className="p-2.5 rounded bg-[#121418] border border-white/10 text-center">
          <span className="text-gray-500 block text-[10px]">PIN PITCH</span>
          <span className="text-gray-200">2.54 mm (0.1")</span>
        </div>
        <div className="p-2.5 rounded bg-[#121418] border border-white/10 text-center">
          <span className="text-gray-500 block text-[10px]">ROW SPACING</span>
          <span className="text-gray-200">7.62 mm (0.3")</span>
        </div>
        <div className="p-2.5 rounded bg-[#121418] border border-white/10 text-center">
          <span className="text-gray-500 block text-[10px]">LEAD FINISH</span>
          <span className="text-blue-400 font-bold">Matte Tin</span>
        </div>
      </div>
    </div>
  );
}

// --- Main IC3DViewer Export ---
export function IC3DViewer({ icName, pinCount, icFullName, pins }: IC3DViewerProps) {
  const [viewType, setViewType] = useState<'render' | 'isometric' | 'webgl'>('render');
  const [activeRenderIndex, setActiveRenderIndex] = useState<number>(0);
  const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(true);

  const currentRender = IC_3D_RENDER_VIEWS[activeRenderIndex];

  return (
    <div className="w-full h-full bg-[#0a0a0a] rounded-lg overflow-hidden border border-white/10 flex flex-col relative select-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-white/10 bg-[#121418] gap-3 z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Box size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold font-mono text-gray-100">IC {icName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                3D Physical Package
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                DIP-{pinCount}
              </span>
            </div>
            {icFullName && (
              <p className="text-xs text-gray-400 font-mono truncate max-w-sm sm:max-w-md">
                {icFullName}
              </p>
            )}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-[#1a1c22] p-0.5 rounded-lg border border-white/10 text-xs font-mono">
            <button
              onClick={() => setViewType('render')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${
                viewType === 'render' 
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Camera size={13} />
              <span>3D Render</span>
            </button>
            <button
              onClick={() => setViewType('isometric')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${
                viewType === 'isometric' 
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers size={13} />
              <span>3D Diagram</span>
            </button>
            <button
              onClick={() => setViewType('webgl')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${
                viewType === 'webgl' 
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Box size={13} />
              <span>Interactive 3D</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden bg-[#070809]">
        {/* --- VIEW 1: PHOTOREALISTIC 3D RENDER GALLERY --- */}
        {viewType === 'render' && (
          <div className="w-full h-full flex flex-col md:flex-row overflow-auto">
            {/* Left: Render Image Stage with Hotspots */}
            <div className="flex-1 relative min-h-[360px] md:min-h-full flex items-center justify-center p-4 bg-gradient-to-b from-[#0e1014] to-[#050608] overflow-hidden group">
              {/* The 3D Render Image */}
              <div className="relative max-w-2xl w-full aspect-[16/10] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/15">
                <img
                  src={currentRender.imageUrl}
                  alt={`${icName} 3D Package Render`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Gradient Overlays for High-Tech Studio Contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Top Badge */}
                <div className="absolute top-3 left-3 flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-emerald-400 text-[11px] font-mono border border-emerald-500/40 shadow">
                    {currentRender.badge}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 text-gray-300 text-[10px] font-mono border border-white/10">
                    SN{icName}N • DIP-{pinCount}
                  </span>
                </div>

                {/* Interactive HUD Hotspots */}
                {currentRender.hotspots.map((hotspot, idx) => (
                  <div
                    key={idx}
                    style={{ top: hotspot.top, left: hotspot.left }}
                    onClick={() => setSelectedHotspot(hotspot)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group/spot"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-60"></span>
                      <div className="relative w-5 h-5 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-lg border border-white/40 hover:scale-125 transition-transform">
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      </div>
                      
                      {/* Hover Tooltip */}
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover/spot:flex flex-col bg-[#12141a]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/40 shadow-xl min-w-[160px] z-30 pointer-events-none">
                        <span className="text-xs font-bold text-emerald-400 font-mono">{hotspot.label}</span>
                        <span className="text-[10px] text-gray-300 line-clamp-2">{hotspot.detail}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Bottom Caption Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
                  <div className="bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-white/10 max-w-md">
                    <p className="text-xs font-bold text-gray-200 font-mono mb-0.5">{currentRender.title}</p>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{currentRender.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Camera Angle Switcher & Specs Drawer */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-[#0d0f13] p-5 flex flex-col justify-between space-y-5 overflow-y-auto">
              {/* Angle Selectors */}
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 mb-3 border-b border-white/10 pb-2">
                  <Eye size={14} />
                  <span>3D RENDER PERSPECTIVES</span>
                </div>

                <div className="space-y-2">
                  {IC_3D_RENDER_VIEWS.map((render, idx) => (
                    <button
                      key={render.id}
                      onClick={() => {
                        setActiveRenderIndex(idx);
                        setSelectedHotspot(null);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start space-x-3 cursor-pointer ${
                        activeRenderIndex === idx
                          ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md'
                          : 'bg-[#14171d] border-white/5 hover:border-white/20 hover:bg-[#1a1e26]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 border border-white/15 bg-black">
                        <img 
                          src={render.imageUrl} 
                          alt={render.title} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-mono font-bold truncate ${activeRenderIndex === idx ? 'text-emerald-400' : 'text-gray-200'}`}>
                            {render.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">
                          {render.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Hotspot Detailed Card */}
              {selectedHotspot ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/40 rounded-xl animate-fadeIn">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-400 font-mono flex items-center space-x-1.5">
                      <Sparkles size={13} />
                      <span>{selectedHotspot.label}</span>
                    </span>
                    <button 
                      onClick={() => setSelectedHotspot(null)}
                      className="text-[10px] text-gray-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {selectedHotspot.detail}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-[#13161c] border border-white/10 rounded-xl text-center text-gray-400 text-xs font-mono">
                  <Info size={14} className="mx-auto mb-1 text-emerald-400 opacity-80" />
                  <span>Click glowing markers (1-4) on the render to inspect internal hardware anatomy.</span>
                </div>
              )}

              {/* VLSI Physical Specifications Checklist */}
              <div className="space-y-2 border-t border-white/10 pt-4">
                <div className="text-xs font-mono text-gray-400 font-semibold mb-2">PACKAGE METRICS</div>
                
                <div className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-white/5">
                  <span className="text-gray-500">Form Factor</span>
                  <span className="text-emerald-400">JEDEC MS-001 BA</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-white/5">
                  <span className="text-gray-500">Pin Count</span>
                  <span className="text-gray-200">{pinCount} Through-Hole</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-white/5">
                  <span className="text-gray-500">Lead Pitch</span>
                  <span className="text-gray-200">2.54 mm (100 mil)</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-white/5">
                  <span className="text-gray-500">Encapsulation</span>
                  <span className="text-gray-200">Epoxy Novolac Resin</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono py-1">
                  <span className="text-gray-500">Flammability</span>
                  <span className="text-blue-400">UL 94 V-0 Rated</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 2: PROCEDURAL 3D ISOMETRIC DIAGRAM --- */}
        {viewType === 'isometric' && (
          <IsometricPackageDiagram icName={icName} pinCount={pinCount} pins={pins} />
        )}

        {/* --- VIEW 3: INTERACTIVE 3D WEBGL MODEL (THREE.JS) --- */}
        {viewType === 'webgl' && (
          <div className="w-full h-full relative">
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
              <span className="text-emerald-400 font-mono text-xs bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30 shadow">
                Drag to rotate 360° • Scroll to zoom • Right-click to pan
              </span>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
              <button
                onClick={() => setIsRotating(!isRotating)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono flex items-center space-x-1.5 backdrop-blur-md border transition-all ${
                  isRotating 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' 
                    : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                <RotateCw size={12} className={isRotating ? 'animate-spin' : ''} />
                <span>{isRotating ? 'Auto-Rotating' : 'Paused'}</span>
              </button>
            </div>

            <ErrorBoundary fallback={<IsometricPackageDiagram icName={icName} pinCount={pinCount} pins={pins} />}>
              <Canvas 
                camera={{ position: [5, 4.5, 5], fov: 42 }}
                shadows
                className="w-full h-full"
              >
                <ambientLight intensity={0.65} />
                <directionalLight position={[10, 12, 6]} intensity={1.4} castShadow />
                <directionalLight position={[-10, 8, -6]} intensity={0.6} color="#38bdf8" />
                <directionalLight position={[0, -5, 5]} intensity={0.3} color="#10b981" />
                <ICModel icName={icName} pinCount={pinCount} isRotating={isRotating} />
                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
              </Canvas>
            </ErrorBoundary>

            {/* Bottom Controls Info Strip */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="bg-[#121418]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs font-mono text-gray-400 shadow-xl">
                <span>Rendering: </span>
                <span className="text-emerald-400 font-bold">DIP-{pinCount} Plastic Encapsulation</span>
                <span className="text-gray-500 ml-2">• 100-mil pin pitch</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


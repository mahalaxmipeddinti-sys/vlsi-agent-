import React, { useState } from 'react';
import { FloorplanConfig, PowerPlanConfig } from '../types/physicalDesign';
import { 
  Layers, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Info, 
  ArrowDown, 
  Maximize2, 
  CheckCircle2,
  Cpu,
  Box,
  Compass,
  Sparkles
} from 'lucide-react';

interface SiliconProfile2DViewerProps {
  floorplan: FloorplanConfig;
  powerPlan: PowerPlanConfig;
  selectedElement?: any;
  onSelectElement?: (element: any) => void;
  onSwitchToCad2D?: () => void;
  onSwitchTo3D?: () => void;
}

export function SiliconProfile2DViewer({
  floorplan,
  powerPlan,
  selectedElement,
  onSelectElement,
  onSwitchToCad2D,
  onSwitchTo3D
}: SiliconProfile2DViewerProps) {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [animateCurrent, setAnimateCurrent] = useState(true);

  const isSelected = (keyword: string) => {
    if (!selectedElement || !selectedElement.name) return false;
    return selectedElement.name.toUpperCase().includes(keyword.toUpperCase());
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07080a] text-gray-200 select-none overflow-hidden">
      {/* Professional Sub-header */}
      <div className="px-4 py-2.5 bg-[#0f1117] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <span>2D Silicon Cross-Section Profile (Vertical PDN Hierarchy)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                16nm FinFET Stack
              </span>
            </h3>
            <p className="text-[11px] text-gray-400 font-mono">
              True vertical metal depth profile: C4 Bump → M8/M7 Feeder Trunk → M6/M5 Mesh → Vias → M1 Rails → CMOS Transistors
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            onClick={() => setAnimateCurrent(!animateCurrent)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-all ${
              animateCurrent 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Sparkles size={12} />
            <span>{animateCurrent ? 'Current Flow: Active' : 'Current Flow: Paused'}</span>
          </button>

          {onSwitchToCad2D && (
            <button
              onClick={onSwitchToCad2D}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors flex items-center space-x-1.5"
            >
              <Compass size={13} />
              <span>2D CAD Layout</span>
            </button>
          )}

          {onSwitchTo3D && (
            <button
              onClick={onSwitchTo3D}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 transition-colors flex items-center space-x-1.5"
            >
              <Box size={13} />
              <span>3D Stack View</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2D Cross-Section SVG Viewport */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-[#050608]">
        <svg
          viewBox="0 0 920 620"
          className="w-full h-full max-h-full max-w-5xl object-contain drop-shadow-2xl"
        >
          <defs>
            {/* Glowing neon filters */}
            <filter id="profileGlowGold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="profileGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current animation pulse pattern */}
            <pattern id="currentDash" width="20" height="20" patternUnits="userSpaceOnUse">
              <line x1="10" y1="0" x2="10" y2="20" stroke="#facc15" strokeWidth="2" strokeDasharray="4 4" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="920" height="620" fill="#090a0f" rx="8" stroke="#1f2430" strokeWidth="1" />

          {/* Depth Micron Scale on Left Side */}
          <g transform="translate(60, 40)" fontFamily="monospace" fontSize="9" fill="#64748b" textAnchor="end">
            <line x1="20" y1="20" x2="20" y2="520" stroke="#334155" strokeWidth="1" />
            <text x="12" y="35">Z = 4.2 µm</text>
            <text x="12" y="85">Z = 3.6 µm</text>
            <text x="12" y="160">Z = 2.4 µm</text>
            <text x="12" y="235">Z = 1.6 µm</text>
            <text x="12" y="320">Z = 0.8 µm</text>
            <text x="12" y="400">Z = 0.4 µm</text>
            <text x="12" y="475">Z = 0.0 µm</text>
            <text x="12" y="525">Substrate</text>
          </g>

          {/* ================= 1. C4 FLIP-CHIP SOLDER BUMP / BOND PAD ================= */}
          <g 
            transform="translate(420, 50)" 
            className="cursor-pointer group"
            onClick={() => onSelectElement?.({
              name: 'IO Power Pad (C4 Micro-Bump)',
              layer: 'Top Metal Over-Glass Pad',
              role: 'External chip supply terminal receiving 1.0V nominal VDD from package substrate',
              voltage: '1.0V Nominal'
            })}
            onPointerOver={() => setHoveredLayer('C4 Bump (1.0V Supply Entry)')}
            onPointerOut={() => setHoveredLayer(null)}
          >
            <ellipse 
              cx="0" 
              cy="0" 
              rx="90" 
              ry="26" 
              fill={isSelected('BUMP') || isSelected('PAD') ? '#facc15' : '#e2e8f0'} 
              stroke="#cbd5e1" 
              strokeWidth="2" 
              filter={isSelected('BUMP') || isSelected('PAD') ? 'url(#profileGlowGold)' : 'none'}
            />
            <text x="0" y="4" fill="#000000" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              C4 SOLDER BUMP / IO PAD (1.0V VDD)
            </text>
            <text x="0" y="-30" fill="#facc15" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              EXTERNAL POWER INGRESS
            </text>
          </g>

          {/* Under-Bump Metallization (UBM) */}
          <rect x="360" y="76" width="120" height="12" fill="#94a3b8" rx="2" stroke="#64748b" strokeWidth="1" />

          {/* Passivation Dielectric Layer */}
          <rect x="100" y="88" width="760" height="24" fill="#1e1b4b" stroke="#3730a3" strokeWidth="1" opacity="0.8" />
          <text x="120" y="104" fill="#a5b4fc" fontSize="9" fontFamily="monospace">Passivation Nitride (Si3N4 / Oxide)</text>

          {/* ================= 2. METAL 8 / METAL 7: PAD-TO-CORE FEEDER TRUNK ================= */}
          <g 
            transform="translate(100, 112)" 
            className="cursor-pointer group"
            onClick={() => onSelectElement?.({
              name: 'Pad-to-Core Feeder Trunk (Metal 7/8 Heavy Metal)',
              layer: 'Metal 7 / Metal 8 (Global Top Metal)',
              role: 'Ultra-thick global copper bus distributing high ingress current with minimal IR loss',
              thickness: '1.80 µm',
              sheetResistance: '0.015 Ω/□',
              voltage: '1.0V'
            })}
            onPointerOver={() => setHoveredLayer('M7/M8 Feeder Trunk (Thick Cu)')}
            onPointerOut={() => setHoveredLayer(null)}
          >
            {/* Trunk Body */}
            <rect 
              x="160" 
              y="0" 
              width="520" 
              height="45" 
              rx="4" 
              fill={isSelected('TRUNK') ? '#facc15' : '#b45309'} 
              stroke={isSelected('TRUNK') ? '#facc15' : '#f59e0b'} 
              strokeWidth={isSelected('TRUNK') ? 3 : 1.5}
              filter={isSelected('TRUNK') ? 'url(#profileGlowGold)' : 'none'}
              className="group-hover:fill-amber-500 transition-colors"
            />
            <text x="420" y="24" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              METAL 8 / 7: PAD-TO-CORE FEEDER TRUNK (W = 24 µm, T = 1.8 µm)
            </text>
            <text x="420" y="38" fill="#fef3c7" fontSize="9" fontFamily="monospace" textAnchor="middle">
              Low-R Global Redistribution Conductor (Sheet R = 0.015 Ω/□)
            </text>
            <text x="700" y="26" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold">
              Z: 3.6 µm
            </text>
          </g>

          {/* Inter-Metal Dielectric IMD 7 */}
          <rect x="100" y="157" width="760" height="28" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          <text x="120" y="174" fill="#475569" fontSize="9" fontFamily="monospace">Inter-Metal Dielectric (Low-k Oxide)</text>

          {/* Via 6 / Via 7 Array Plugs */}
          {[260, 340, 420, 500, 580].map((vx, i) => (
            <g key={`via7_${i}`}>
              <rect x={vx - 10} y="157" width="20" height="28" fill="#facc15" stroke="#000" strokeWidth="1" />
              <text x={vx} y="175" fill="#000" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">V6</text>
            </g>
          ))}

          {/* ================= 3. METAL 6: VERTICAL POWER STRAPS ================= */}
          <g 
            transform="translate(100, 185)" 
            className="cursor-pointer group"
            onClick={() => onSelectElement?.({
              name: 'Vertical Power Straps (Metal 6 Grid Array)',
              layer: 'Metal 6 (Top Intermediate Metal)',
              role: 'Vertical backbone stripes dividing current across core columns',
              thickness: '0.75 µm',
              sheetResistance: '0.055 Ω/□',
              voltage: '1.0V (VDD) / 0V (VSS)'
            })}
            onPointerOver={() => setHoveredLayer('M6 Vertical Straps (Green Layer)')}
            onPointerOut={() => setHoveredLayer(null)}
          >
            {/* Vertical Straps seen in cross section */}
            {[180, 280, 380, 480, 580, 680].map((sx, idx) => {
              const isVdd = idx % 2 === 0;
              return (
                <g key={`m6_seg_${idx}`}>
                  <rect 
                    x={sx - 35} 
                    y="0" 
                    width="70" 
                    height="35" 
                    rx="3" 
                    fill={isSelected('M6') || isSelected('VERTICAL') ? '#38bdf8' : (isVdd ? '#15803d' : '#0e7490')} 
                    stroke={isSelected('M6') || isSelected('VERTICAL') ? '#38bdf8' : (isVdd ? '#22c55e' : '#06b6d4')} 
                    strokeWidth={isSelected('M6') || isSelected('VERTICAL') ? 2.5 : 1.5}
                    filter={isSelected('M6') ? 'url(#profileGlowCyan)' : 'none'}
                    className="group-hover:opacity-80 transition-opacity"
                  />
                  <text x={sx} y="18" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    M6_{idx + 1}
                  </text>
                  <text x={sx} y="29" fill={isVdd ? '#bbf7d0' : '#a5f3fc'} fontSize="8" fontFamily="monospace" textAnchor="middle">
                    {isVdd ? 'VDD' : 'VSS'}
                  </text>
                </g>
              );
            })}
            <text x="770" y="22" fill="#4ade80" fontSize="10" fontFamily="monospace" fontWeight="bold">
              M6 (Vertical)
            </text>
          </g>

          {/* Inter-Metal Dielectric IMD 5 */}
          <rect x="100" y="220" width="760" height="28" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />

          {/* Via 5 Tungsten Plugs */}
          {[180, 280, 380, 480, 580, 680].map((vx, i) => (
            <g key={`via5_${i}`}>
              <rect x={vx - 8} y="220" width="16" height="28" fill="#facc15" stroke="#000" strokeWidth="1" />
              <text x={vx} y="238" fill="#000" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">V5</text>
            </g>
          ))}

          {/* ================= 4. METAL 5: HORIZONTAL POWER STRAPS & CORE RINGS ================= */}
          <g 
            transform="translate(100, 248)" 
            className="cursor-pointer group"
            onClick={() => onSelectElement?.({
              name: 'Horizontal Power Straps & Core Rings (Metal 5)',
              layer: 'Metal 5 (Intermediate Orthogonal Metal)',
              role: 'Horizontal mesh stripes crossing M6 straps to form low-impedance 2D lattice',
              thickness: '0.65 µm',
              sheetResistance: '0.065 Ω/□',
              voltage: '1.0V (VDD) / 0V (VSS)'
            })}
            onPointerOver={() => setHoveredLayer('M5 Horizontal Straps & Core Rings (Red Layer)')}
            onPointerOut={() => setHoveredLayer(null)}
          >
            {/* Continuous Horizontal Strip */}
            <rect 
              x="130" 
              y="0" 
              width="600" 
              height="35" 
              rx="3" 
              fill={isSelected('M5') || isSelected('HORIZONTAL') || isSelected('RING') ? '#facc15' : '#991b1b'} 
              stroke={isSelected('M5') || isSelected('HORIZONTAL') || isSelected('RING') ? '#facc15' : '#ef4444'} 
              strokeWidth={isSelected('M5') || isSelected('HORIZONTAL') || isSelected('RING') ? 2.5 : 1.5}
              filter={isSelected('M5') ? 'url(#profileGlowGold)' : 'none'}
              className="group-hover:fill-red-600 transition-colors"
            />
            <text x="430" y="18" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              METAL 5: HORIZONTAL MESH STRAPS & CORE POWER RINGS (T = 0.65 µm)
            </text>
            <text x="430" y="30" fill="#fca5a5" fontSize="8" fontFamily="monospace" textAnchor="middle">
              Continuous East-West Conductors Orthogonal to M6
            </text>
            <text x="750" y="22" fill="#f87171" fontSize="10" fontFamily="monospace" fontWeight="bold">
              M5 (Horiz)
            </text>
          </g>

          {/* Stacked Intermediate Dielectric (M4 -> M3 -> M2) */}
          <rect x="100" y="283" width="760" height="75" fill="#0b0f19" stroke="#1e293b" strokeWidth="1" />
          <text x="120" y="305" fill="#475569" fontSize="9" fontFamily="monospace">Intermediate Dielectrics (M4 / M3 / M2 Signal Routing Tracks)</text>

          {/* Multi-tier Stacked Vias (V4 -> V3 -> V2 -> V1) */}
          {[280, 480].map((vx, i) => (
            <g key={`stack_via_${i}`}>
              <line x1={vx} y1="283" x2={vx} y2="358" stroke="#facc15" strokeWidth="8" strokeDasharray="6 2" />
              <text x={vx + 15} y="325" fill="#facc15" fontSize="8" fontFamily="monospace">Via Stack (V4-V1)</text>
            </g>
          ))}

          {/* ================= 5. METAL 1: STANDARD CELL FOLLOWPIN RAILS ================= */}
          <g 
            transform="translate(100, 358)" 
            className="cursor-pointer group"
            onClick={() => onSelectElement?.({
              name: 'Standard Cell Followpin Rails (Metal 1)',
              layer: 'Metal 1 (Fine-Pitch Local Rail)',
              role: 'Directly contacts PMOS pull-up and NMOS pull-down transistors in each cell row',
              thickness: '0.22 µm',
              sheetResistance: '0.120 Ω/□',
              voltage: '1.0V (VDD) / 0V (VSS)'
            })}
            onPointerOver={() => setHoveredLayer('M1 Standard Cell Power Rails (Cyan Layer)')}
            onPointerOut={() => setHoveredLayer(null)}
          >
            {/* M1 VDD Rail */}
            <rect 
              x="160" 
              y="0" 
              width="240" 
              height="20" 
              rx="2" 
              fill={isSelected('RAIL') || isSelected('M1') ? '#38bdf8' : '#ef4444'} 
              stroke="#fca5a5" 
              strokeWidth="1"
            />
            <text x="280" y="14" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              M1 VDD RAIL (+1.0V)
            </text>

            {/* M1 VSS Rail */}
            <rect 
              x="460" 
              y="0" 
              width="240" 
              height="20" 
              rx="2" 
              fill={isSelected('RAIL') || isSelected('M1') ? '#38bdf8' : '#06b6d4'} 
              stroke="#67e8f9" 
              strokeWidth="1"
            />
            <text x="580" y="14" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              M1 VSS RAIL (0V GROUND)
            </text>

            <text x="750" y="14" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              M1 (Local Rails)
            </text>
          </g>

          {/* Pre-Metal Dielectric (PMD) & Tungsten Contacts (CA) */}
          <rect x="100" y="378" width="760" height="42" fill="#0d1117" stroke="#1f2937" strokeWidth="1" />
          <text x="120" y="396" fill="#6b7280" fontSize="9" fontFamily="monospace">PMD Dielectric & Tungsten Contacts (CA/CP)</text>

          {/* Tungsten Contacts dropping into Source/Drain */}
          {[220, 260, 300, 340, 520, 560, 600, 640].map((cx, i) => (
            <rect key={`contact_${i}`} x={cx - 3} y="378" width="6" height="42" fill="#94a3b8" />
          ))}

          {/* ================= 6. FRONT END OF LINE (FEOL): SILICON TRANSISTORS & WELLS ================= */}
          <g 
            transform="translate(100, 420)" 
            className="cursor-pointer group"
            onClick={() => onSelectElement?.({
              name: 'CMOS Transistor Layer (PMOS / NMOS FinFETs & Well Taps)',
              layer: 'Active Silicon Substrate (FEOL)',
              role: 'Logic gates, ALU macro cells, and latch-up prevention well tap contacts',
              voltage: 'Core Logic Substrate'
            })}
            onPointerOver={() => setHoveredLayer('Silicon Substrate (PMOS, NMOS, N-Well, P-Substrate)')}
            onPointerOut={() => setHoveredLayer(null)}
          >
            {/* Silicon Base Substrate Background */}
            <rect x="0" y="0" width="760" height="110" fill="#111827" stroke="#374151" strokeWidth="1.5" />

            {/* N-Well Diffusion for PMOS Transistors */}
            <rect x="120" y="0" width="300" height="75" fill="#14532d" stroke="#22c55e" strokeWidth="1" opacity="0.6" />
            <text x="270" y="65" fill="#86efac" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              N-WELL DIFFUSION (VDD BIASED)
            </text>

            {/* P-Substrate Diffusion for NMOS Transistors */}
            <rect x="440" y="0" width="300" height="75" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" opacity="0.6" />
            <text x="590" y="65" fill="#c7d2fe" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              P-SUBSTRATE (VSS GROUND BIASED)
            </text>

            {/* PMOS Transistor Channel & Gate */}
            <g transform="translate(240, 0)">
              {/* P+ Source and Drain */}
              <rect x="-35" y="0" width="30" height="20" fill="#ef4444" rx="1" />
              <text x="-20" y="14" fill="#fff" fontSize="8" fontFamily="monospace" textAnchor="middle">P+</text>
              <rect x="15" y="0" width="30" height="20" fill="#ef4444" rx="1" />
              <text x="30" y="14" fill="#fff" fontSize="8" fontFamily="monospace" textAnchor="middle">P+</text>
              {/* High-k Metal Gate (HKMG) */}
              <rect x="-4" y="-8" width="18" height="22" fill="#fbbf24" stroke="#000" strokeWidth="0.5" />
              <text x="5" y="-12" fill="#fde047" fontSize="8" fontFamily="monospace" textAnchor="middle">PMOS Gate</text>
            </g>

            {/* NMOS Transistor Channel & Gate */}
            <g transform="translate(560, 0)">
              {/* N+ Source and Drain */}
              <rect x="-35" y="0" width="30" height="20" fill="#06b6d4" rx="1" />
              <text x="-20" y="14" fill="#fff" fontSize="8" fontFamily="monospace" textAnchor="middle">N+</text>
              <rect x="15" y="0" width="30" height="20" fill="#06b6d4" rx="1" />
              <text x="30" y="14" fill="#fff" fontSize="8" fontFamily="monospace" textAnchor="middle">N+</text>
              {/* High-k Metal Gate (HKMG) */}
              <rect x="-4" y="-8" width="18" height="22" fill="#fbbf24" stroke="#000" strokeWidth="0.5" />
              <text x="5" y="-12" fill="#fde047" fontSize="8" fontFamily="monospace" textAnchor="middle">NMOS Gate</text>
            </g>

            {/* Shallow Trench Isolation (STI) Oxide */}
            <rect x="420" y="0" width="20" height="35" fill="#334155" />
            <text x="430" y="48" fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">STI</text>

            <text x="380" y="95" fill="#e2e8f0" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              BULK SILICON SUBSTRATE (P-TYPE EPI WAFER)
            </text>
          </g>

          {/* ================= CURRENT DELIVERY PATH VECTORS ================= */}
          {animateCurrent && (
            <g pointerEvents="none">
              {/* Flow path lines from bump down through the layers */}
              <path 
                d="M 420 80 L 420 115 L 280 157 L 280 185 L 280 220 L 280 248 L 280 358 L 240 378 L 240 420" 
                fill="none" 
                stroke="#facc15" 
                strokeWidth="2.5" 
                strokeDasharray="6 4"
                className="animate-pulse"
              />
              {/* Downward indicator arrows */}
              <polygon points="420,105 415,95 425,95" fill="#facc15" />
              <polygon points="280,180 275,170 285,170" fill="#facc15" />
              <polygon points="280,240 275,230 285,230" fill="#facc15" />
              <polygon points="280,350 275,340 285,340" fill="#facc15" />
              <polygon points="240,415 235,405 245,405" fill="#facc15" />
            </g>
          )}
        </svg>

        {/* Live Hover Info Floating Badge */}
        {hoveredLayer && (
          <div className="absolute top-4 left-4 bg-[#12141c]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-amber-500/40 text-xs font-mono text-amber-300 shadow-xl pointer-events-none flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Target: {hoveredLayer} (Click to inspect circuit & specs)</span>
          </div>
        )}
      </div>
    </div>
  );
}

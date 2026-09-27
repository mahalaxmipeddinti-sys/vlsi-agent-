import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Layers, 
  Activity, 
  ShieldCheck, 
  Sliders, 
  Cpu, 
  Maximize2, 
  X, 
  Info, 
  CheckCircle2, 
  Play, 
  RotateCw, 
  ArrowRight,
  TrendingDown,
  Box,
  Compass,
  FileCode,
  Flame,
  Radio,
  Clock
} from 'lucide-react';

export interface PdnDetailData {
  title: string;
  category: string;
  layer: string;
  role: string;
  description: string;
  microarchitecture: string;
  electricalModel: string;
  sheetResistance: string;
  maxCurrentDensity: string;
  irDropBudget: string;
  thickness: string;
  width: string;
  equivalentSpice: string;
  inputs: { name: string; type: string; desc: string }[];
  outputs: { name: string; type: string; desc: string }[];
  accentColor: string;
}

export const PDN_KNOWLEDGE_BASE: Record<string, PdnDetailData> = {
  'POWER_RING': {
    title: 'Core Power & Ground Ring (VDD / VSS Closed Loop)',
    category: 'Perimeter Power Grid',
    layer: 'Metal 5 (Horizontal) / Metal 6 (Vertical)',
    role: 'Distributes clean, low-impedance power uniformly around the entire core perimeter, shielding logic from peripheral SSN noise.',
    description: 'The Core Power Ring forms an unbroken closed-loop dual conductor surrounding the entire active core area. It acts as an equidistant low-resistance distribution reservoir, receiving current from peripheral IO pad feeder trunks and dispersing it into the internal orthogonal strap mesh.',
    microarchitecture: 'Constructed from dual parallel rings: an outer ring for VDD (1.0V) and an inner ring for VSS (0V). Ring corners use 45-degree chamfered mitered bends or dense multi-cut via matrices to eliminate electro-migration bottlenecks caused by sharp 90-degree corners.',
    electricalModel: 'Continuous RLC loop network with distributed pad feed taps. Total loop impedance Z_ring(ω) = √(R^2 + (ωL)^2) with localized capacitive bypass.',
    sheetResistance: '0.045 Ω/□ (Cu Damascene)',
    maxCurrentDensity: '1.2 mA/µm (EM limit @ 105°C)',
    irDropBudget: '15 mV max across ring perimeter',
    thickness: '0.85 µm',
    width: '12.0 µm - 24.0 µm',
    equivalentSpice: 'Vdd_ring N1 N2 R=0.015 L=12pH',
    inputs: [
      { name: 'PAD_VDD[3:0]', type: 'Power In', desc: 'Peripheral pad feeder trunk connections (North, South, East, West)' },
      { name: 'PAD_VSS[3:0]', type: 'Ground In', desc: 'Peripheral ground return trunks from ESD ballasted pads' }
    ],
    outputs: [
      { name: 'CORE_VSTRAP_IN', type: 'Mesh Tap', desc: 'Vertical strap feed points into core M6 mesh' },
      { name: 'CORE_HSTRAP_IN', type: 'Mesh Tap', desc: 'Horizontal strap feed points into core M5 mesh' }
    ],
    accentColor: '#ef4444'
  },
  'PAD_TRUNK': {
    title: 'Pad-to-Core Feeder Trunk (Heavy Top Metal Bus)',
    category: 'Primary Power Ingress',
    layer: 'Metal 7 / Metal 8 (Ultra-Thick Redistribution Metal)',
    role: 'Carries external power from peripheral IO pads / C4 solder bumps directly to the internal Core Rings with near-zero IR drop.',
    description: 'Pad-to-Core Feeder Trunks are ultra-wide, low-sheet-resistance copper buses routed on top global metal layers (M7/M8). Because all current entering the chip must pass through these few conductors, they are sized to withstand extreme electromigration (EM) stress and transient in-rush current spikes.',
    microarchitecture: 'Fabricated using thick global metallization (2.5x thickness of intermediate metals). Integrates ESD double-diode clamps, RC-triggered active BigFET power clamps, and redundant via matrices (up to 64 parallel vias) at the core ring landing pad.',
    electricalModel: 'Low-loss transmission line: R_trunk = ρ·L / (W·T) ≈ 0.024 Ω, L_trunk ≈ 35 pH. In parallel with high-speed transient ESD rail clamp.',
    sheetResistance: '0.015 Ω/□ (Ultra-Thick Global Cu)',
    maxCurrentDensity: '2.5 mA/µm (High-temperature EM certified)',
    irDropBudget: '5.0 mV max from bond pad to ring',
    thickness: '1.80 µm',
    width: '10.0 µm - 30.0 µm',
    equivalentSpice: 'R_trunk PAD_PIN RING_NODE 0.024 L=35pH',
    inputs: [
      { name: 'IO_BOND_PAD', type: 'External In', desc: 'Wirebond package pad or C4 flip-chip micro-bump' },
      { name: 'ESD_CLAMP_IN', type: 'Surge Tap', desc: 'Transient voltage suppressor diode line' }
    ],
    outputs: [
      { name: 'RING_FEED_NODE', type: 'High Current', desc: 'Multi-via array connection to M5/M6 core ring' }
    ],
    accentColor: '#f59e0b'
  },
  'STRAP_VERTICAL': {
    title: 'Vertical Power & Ground Straps (M6 Grid Array)',
    category: 'Core Distribution Mesh',
    layer: 'Metal 6 (Top Intermediate Orthogonal Metal)',
    role: 'Runs vertically across the core area to create the primary high-current mesh backbone feeding standard cell rows.',
    description: 'Vertical Straps form the vertical columns of the 2D power mesh. Alternating VDD and VSS straps span from the top core ring to the bottom core ring, ensuring that standard cells in every column have a direct vertical path to the core ring power source.',
    microarchitecture: 'Parallel uniform stripe array pitched at regular intervals (15 µm - 30 µm). At every intersection with horizontal M5 straps, dense multi-cut via arrays (Via 5) bridge the orthogonal metals to form a rigid low-impedance lattice.',
    electricalModel: 'Mesh ladder model: R_v = R_sq * (H_core / W_strap). Current divides symmetrically across parallel strap columns.',
    sheetResistance: '0.055 Ω/□',
    maxCurrentDensity: '1.0 mA/µm',
    irDropBudget: '12 mV across core span',
    thickness: '0.75 µm',
    width: '2.0 µm - 8.0 µm',
    equivalentSpice: 'R_vstrap N_top N_bottom 0.12',
    inputs: [
      { name: 'V_RING_TOP', type: 'Feed In', desc: 'Upper M5/M6 ring connection' },
      { name: 'V_RING_BOT', type: 'Feed In', desc: 'Lower M5/M6 ring connection' }
    ],
    outputs: [
      { name: 'VIA5_M5_GRID', type: 'Orthogonal Tap', desc: 'Via array cross-connects into M5 horizontal straps' }
    ],
    accentColor: '#22c55e'
  },
  'STRAP_HORIZONTAL': {
    title: 'Horizontal Power & Ground Straps (M5 Grid Array)',
    category: 'Core Distribution Mesh',
    layer: 'Metal 5 (Intermediate Orthogonal Metal)',
    role: 'Crosses vertical straps at 90° angles to form a low-impedance mesh and drop current down to M1 standard cell rails.',
    description: 'Horizontal Straps run East-West across the chip. Together with Vertical Straps, they form the 2D Power Mesh grid. By creating a dense web of interconnected parallel paths, any localized power surge draws current from all surrounding nodes simultaneously, dramatically suppressing voltage dips.',
    microarchitecture: 'High-density horizontal copper stripes. Interconnects with M6 above via Via 5, and drops down to M1 standard cell followpin rails below through stacked vias (Via 4, Via 3, Via 2, Via 1).',
    electricalModel: 'Distributed RC mesh node with Kelvin probe sensing. Node equation: ∑(V_adj - V_node)/R_branch = I_cell_draw.',
    sheetResistance: '0.065 Ω/□',
    maxCurrentDensity: '0.9 mA/µm',
    irDropBudget: '10 mV across core span',
    thickness: '0.65 µm',
    width: '2.0 µm - 6.0 µm',
    equivalentSpice: 'R_hstrap N_left N_right 0.15',
    inputs: [
      { name: 'H_RING_WEST', type: 'Feed In', desc: 'Left core ring feeder tap' },
      { name: 'H_RING_EAST', type: 'Feed In', desc: 'Right core ring feeder tap' }
    ],
    outputs: [
      { name: 'DROP_TO_M1', type: 'Via Column', desc: 'Multi-layer via drop to standard cell rails' }
    ],
    accentColor: '#ef4444'
  },
  'FOLLOWPIN_RAIL': {
    title: 'Standard Cell Followpin Rails (M1 VDD / VSS)',
    category: 'Local Cell Power Rails',
    layer: 'Metal 1 (Fine Pitch Local Interconnect)',
    role: 'Directly powers all CMOS transistors, standard cell logic gates (Inverters, NAND, Flip-Flops), and substrate taps.',
    description: 'Standard Cell Rails run horizontally along the top and bottom boundary of every standard cell row on Metal 1. Cells abut directly against these rails: PMOS transistors tap the upper VDD rail, and NMOS transistors tap the lower VSS rail. Integrated tapcells connect to the N-well and P-substrate to prevent CMOS latch-up.',
    microarchitecture: 'Continuous horizontal M1 tracks with height matched to standard cell library height (e.g. 7-track or 9-track cells). Periodically reinforced from above by M5 strap via drops every 4 to 8 cell widths to avoid resistive droop.',
    electricalModel: 'Distributed resistor string with periodic current sinks: ΔV = (I_total · R_rail)/8. Mitigated by on-rail cell decap.',
    sheetResistance: '0.120 Ω/□ (Fine-pitch Cu with barrier layer)',
    maxCurrentDensity: '0.6 mA/µm',
    irDropBudget: '8 mV maximum droop between via taps',
    thickness: '0.22 µm',
    width: '0.18 µm - 0.45 µm',
    equivalentSpice: 'R_rail M1_A M1_B 0.45; C_diff M1_A VSS 0.05pF',
    inputs: [
      { name: 'VIA_DROP_M5_M1', type: 'Strap Feed', desc: 'Upper mesh via column feeding current down' }
    ],
    outputs: [
      { name: 'PMOS_VDD_TAP', type: 'Source Pin', desc: 'Source terminal connection for all PMOS pull-up transistors' },
      { name: 'NMOS_VSS_TAP', type: 'Ground Pin', desc: 'Source terminal connection for all NMOS pull-down transistors' },
      { name: 'WELL_TAPS', type: 'Substrate Bias', desc: 'N-Well (VDD) and P-Substrate (VSS) bias contacts to prevent latch-up' }
    ],
    accentColor: '#06b6d4'
  },
  'VIA_STACK': {
    title: 'Inter-Layer Power Via Array (Multi-Cut Via Matrix)',
    category: 'Vertical Interconnect',
    layer: 'Via 5 / Via 6 / Via 1 - 4 (Tungsten / Cobalt Plugs)',
    role: 'Provides low-resistance, high-reliability vertical current transmission between orthogonal metal layers.',
    description: 'A single via is a major electrical bottleneck and reliability hazard. In modern VLSI PDN design, all layer transitions use 2x2, 3x3, or 4x4 redundant multi-cut via matrices. This cuts effective resistance by N-times and ensures that if a single via suffers voiding or electromigration failure, redundant vias keep current flowing safely.',
    microarchitecture: 'Square refractory metal plugs (Tungsten W or Cobalt Co) encased in Ruthenium / Tantalum Nitride (TaN) diffusion barrier liners. Placed at uniform pitch complying with strict DRC enclosure rules.',
    electricalModel: 'Parallel resistor array: R_matrix = R_single_via / (Rows · Cols). R_single ≈ 1.2 Ω, R_4x4 ≈ 0.075 Ω.',
    sheetResistance: 'N/A (Plug resistance: 0.8 - 1.5 Ω/cut)',
    maxCurrentDensity: '0.4 mA per individual via cut',
    irDropBudget: '2.5 mV across via stack',
    thickness: '0.18 µm per dielectric level',
    width: '0.10 µm x 0.10 µm per cut',
    equivalentSpice: 'R_via_matrix M6_NODE M5_NODE 0.075',
    inputs: [
      { name: 'TOP_METAL_PAD', type: 'Upper Plane', desc: 'Upper metal layer landing pad (e.g. M6)' }
    ],
    outputs: [
      { name: 'BOT_METAL_PAD', type: 'Lower Plane', desc: 'Lower metal layer receiving pad (e.g. M5)' }
    ],
    accentColor: '#eab308'
  },
  'DECAP_CELL': {
    title: 'On-Die Decoupling Capacitor (Decap Cell Array)',
    category: 'Transient Noise Suppression',
    layer: 'Thin-Oxide MOS / MIM Capacitor (Silicon Substrate)',
    role: 'Stores localized electric charge to instantly supply surge current during clock edges, keeping dynamic IR drop under control.',
    description: 'When millions of flip-flops switch simultaneously on the rising clock edge (di/dt spike), the inductive parasitics of the power grid cause localized ground bounce and VDD collapse. Decap cells act as micro-batteries placed in empty floorplan gaps, feeding instantaneous charge before current can arrive from distant bond pads.',
    microarchitecture: 'Constructed from gate-oxide NMOS/PMOS transistors with source and drain tied together, or High-K Metal Gate (HKMG) MIM capacitors. Integrates series gate protection resistors to prevent catastrophic dielectric breakdown from soft-shorts.',
    electricalModel: 'Series RLC branch: C_decap ≈ 25 - 100 fF/cell, ESR ≈ 8 Ω, ESL ≈ 1.5 pH. Controls PDN target impedance Z_target(ω) ≤ ΔV_max / ΔI_max up to GHz frequencies.',
    sheetResistance: 'N/A (C_density: 15 - 25 fF/µm²)',
    maxCurrentDensity: 'Dynamic charge reservoir: 1.5 mA burst',
    irDropBudget: 'Absorbs 45 mV dynamic switching droop',
    thickness: 'Gate dielectric thickness ~1.4 nm',
    width: 'Standard cell pitch (1.2 µm - 4.8 µm)',
    equivalentSpice: 'C_decap VDD VSS 50fF ESR=6 ESL=2pH',
    inputs: [
      { name: 'VDD_RAIL', type: 'Rail Tap', desc: 'M1 VDD followpin connection' },
      { name: 'VSS_RAIL', type: 'Rail Tap', desc: 'M1 VSS ground return connection' }
    ],
    outputs: [
      { name: 'SURGE_CHARGE', type: 'Charge Reserve', desc: 'Instantaneous local high-frequency current injection' }
    ],
    accentColor: '#8b5cf6'
  },
  'MACRO_BLOCK': {
    title: 'Core Functional Macro Block (Arithmetic & Logic Core)',
    category: 'Core Functional Macro',
    layer: 'Silicon Substrate & Dedicated Local M5/M6 Power Ring',
    role: 'High-density computational unit powered by dedicated local power rings, MTCMOS power gating switches, and local decap cells.',
    description: 'Hierarchical macro blocks (such as the Adder/Subtractor Unit, Register Bank, or Boolean Logic Unit) contain hundreds of densely packed transistors. To shield them from grid IR drop and switching noise, they feature dedicated peripheral power rings and localized decoupling capacitance arrays.',
    microarchitecture: 'Multi-layer local datapath with MTCMOS header sleep switches for dynamic leakage suppression during idle cycles. High-speed datapath logic fed by clean low-impedance power mesh.',
    electricalModel: 'Dynamic power sink with MTCMOS sleep switch: P_dyn = α · C_total · Vdd² · f_clk. Local decap buffer suppresses instantaneous di/dt ground bounce.',
    sheetResistance: 'N/A (Standard Cell & Macro Silicon)',
    maxCurrentDensity: '1.8 mA dynamic burst',
    irDropBudget: '20 mV max allowable droop',
    thickness: '0.65 µm',
    width: 'Macro bounding box',
    equivalentSpice: 'X_macro VDD_CORE VSS_CORE MACRO_CELL',
    inputs: [
      { name: 'VDD_MACRO', type: 'Local Ring Feed', desc: 'Dedicated M5/M6 power ring tap' },
      { name: 'SLEEP_CTRL', type: 'Power Gating', desc: 'Active-high sleep mode control for MTCMOS switches' }
    ],
    outputs: [
      { name: 'DATAPATH_OUT', type: 'Logic Bus', desc: 'Computed arithmetic/logic result bus' }
    ],
    accentColor: '#38bdf8'
  }
};

export function getPdnDetail(name: string, layerHint?: string): PdnDetailData {
  const upper = (name || '').toUpperCase();
  if (upper.includes('MACRO') || upper.includes('ADDER') || upper.includes('LOGIC') || upper.includes('REGISTER') || upper.includes('SHIFTER') || upper.includes('ALU')) {
    return PDN_KNOWLEDGE_BASE['MACRO_BLOCK'];
  }
  if (upper.includes('RING')) return PDN_KNOWLEDGE_BASE['POWER_RING'];
  if (upper.includes('TRUNK') || upper.includes('PAD')) return PDN_KNOWLEDGE_BASE['PAD_TRUNK'];
  if (upper.includes('VERTICAL') || upper.includes('VSTRAP') || upper.includes('M6')) return PDN_KNOWLEDGE_BASE['STRAP_VERTICAL'];
  if (upper.includes('HORIZONTAL') || upper.includes('HSTRAP') || upper.includes('M5')) return PDN_KNOWLEDGE_BASE['STRAP_HORIZONTAL'];
  if (upper.includes('RAIL') || upper.includes('FOLLOWPIN') || upper.includes('M1')) return PDN_KNOWLEDGE_BASE['FOLLOWPIN_RAIL'];
  if (upper.includes('VIA')) return PDN_KNOWLEDGE_BASE['VIA_STACK'];
  if (upper.includes('DECAP') || upper.includes('CAPACITOR')) return PDN_KNOWLEDGE_BASE['DECAP_CELL'];

  // Default fallback
  return PDN_KNOWLEDGE_BASE['STRAP_VERTICAL'];
}

// --- Interactive Gate-Level / RLC / Transistor-Level Circuit Schematic Renderer ---
export function InteractivePdnCircuitSchematic({ 
  elementName, 
  layerName,
  isFullscreen = false,
  onOpenFullscreen
}: { 
  elementName: string; 
  layerName?: string;
  isFullscreen?: boolean;
  onOpenFullscreen?: () => void;
}) {
  const detail = useMemo(() => getPdnDetail(elementName, layerName), [elementName, layerName]);
  const [activeSimulationMode, setActiveSimulationMode] = useState<'nominal' | 'surge' | 'ir_drop'>('nominal');
  const [supplyVolts, setSupplyVolts] = useState<number>(1.00);
  const [loadCurrent, setLoadCurrent] = useState<number>(25); // mA

  // Dynamic calculations based on load
  const dynamicDropMv = useMemo(() => {
    const factor = detail.category.includes('Perimeter') ? 0.35 : detail.category.includes('Ingress') ? 0.15 : 0.65;
    return (loadCurrent * factor * (activeSimulationMode === 'surge' ? 2.2 : 1.0)).toFixed(1);
  }, [loadCurrent, detail, activeSimulationMode]);

  const deliveredVoltage = (supplyVolts - parseFloat(dynamicDropMv) / 1000).toFixed(3);

  return (
    <div className={`flex flex-col bg-[#0b0c10] border border-white/10 rounded-xl overflow-hidden ${isFullscreen ? 'h-full' : 'h-[360px]'}`}>
      {/* Schematic Header Controls */}
      <div className="px-3.5 py-2.5 bg-[#14161d] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: detail.accentColor }} />
          <span className="text-xs font-mono font-bold text-gray-100">{detail.title}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
            Internal Electrical Schematic
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          {/* Simulation Condition Mode Toggle */}
          <div className="flex items-center bg-black/60 p-0.5 rounded-md border border-white/10 text-[10px]">
            <button
              onClick={() => setActiveSimulationMode('nominal')}
              className={`px-2 py-0.5 rounded transition-all ${activeSimulationMode === 'nominal' ? 'bg-emerald-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Nominal
            </button>
            <button
              onClick={() => setActiveSimulationMode('surge')}
              className={`px-2 py-0.5 rounded transition-all ${activeSimulationMode === 'surge' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Surge di/dt
            </button>
            <button
              onClick={() => setActiveSimulationMode('ir_drop')}
              className={`px-2 py-0.5 rounded transition-all ${activeSimulationMode === 'ir_drop' ? 'bg-rose-500 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Peak IR
            </button>
          </div>

          {!isFullscreen && onOpenFullscreen && (
            <button
              onClick={onOpenFullscreen}
              className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 border border-white/10 transition-colors"
              title="View in Fullscreen Schematic Modal"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Circuit Canvas */}
      <div className="flex-1 relative bg-[#07080a] flex items-center justify-center p-2 overflow-hidden select-none">
        <svg
          viewBox="0 0 780 440"
          className="w-full h-full max-h-full object-contain"
        >
          <defs>
            {/* Glowing effect filters */}
            <filter id="neonGlowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowGold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid Pattern */}
            <pattern id="pdnSchematicGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.04" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="780" height="440" fill="url(#pdnSchematicGrid)" />

          {/* RENDER SCHEMATIC ACCORDING TO ELEMENT CATEGORY */}
          {detail.category.includes('Perimeter') && (
            // ==================== 1. POWER RING CLOSED LOOP SCHEMATIC ====================
            <g transform="translate(10, 10)">
              {/* Outer VDD Ring Box */}
              <rect x="140" y="50" width="480" height="300" rx="12" fill="none" stroke="#ef4444" strokeWidth="4" filter="url(#neonGlowRed)" />
              {/* Inner VSS Ring Box */}
              <rect x="180" y="90" width="400" height="220" rx="8" fill="none" stroke="#06b6d4" strokeWidth="3" />

              {/* Title Badge */}
              <text x="380" y="35" fill="#f87171" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                CLOSED-LOOP DUAL POWER RING TOPOLOGY (VDD: 1.0V / VSS: 0V)
              </text>

              {/* 4 Feeder Trunks from Peripheral IO Pads */}
              {/* West Feeder */}
              <path d="M 40 200 L 140 200" stroke="#f59e0b" strokeWidth="6" strokeDasharray={activeSimulationMode === 'surge' ? '6 3' : 'none'} />
              <circle cx="40" cy="200" r="10" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              <text x="40" y="235" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">PAD_WEST</text>

              {/* East Feeder */}
              <path d="M 620 200 L 720 200" stroke="#f59e0b" strokeWidth="6" strokeDasharray={activeSimulationMode === 'surge' ? '6 3' : 'none'} />
              <circle cx="720" cy="200" r="10" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              <text x="720" y="235" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">PAD_EAST</text>

              {/* North Feeder */}
              <path d="M 380 0 L 380 50" stroke="#f59e0b" strokeWidth="6" />
              <circle cx="380" cy="0" r="10" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />

              {/* South Feeder */}
              <path d="M 380 350 L 380 400" stroke="#f59e0b" strokeWidth="6" />
              <circle cx="380" cy="400" r="10" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />

              {/* Internal Mesh Straps extending into Core */}
              <line x1="260" y1="50" x2="260" y2="350" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="4 2" />
              <line x1="380" y1="50" x2="380" y2="350" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="4 2" />
              <line x1="500" y1="50" x2="500" y2="350" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="4 2" />

              <line x1="140" y1="150" x2="620" y2="150" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4 2" />
              <line x1="140" y1="250" x2="620" y2="250" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4 2" />

              {/* Via Arrays at intersections */}
              {[[260, 150], [380, 150], [500, 150], [260, 250], [380, 250], [500, 250]].map(([vx, vy], i) => (
                <g key={i}>
                  <rect x={vx - 6} y={vy - 6} width="12" height="12" fill="#facc15" stroke="#000" strokeWidth="1" />
                  <text x={vx} y={vy + 3} fill="#000" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">V5</text>
                </g>
              ))}

              {/* Core Logic Active Area Label */}
              <rect x="280" y="180" width="200" height="40" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
              <text x="380" y="198" fill="#e2e8f0" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                CORE LOGIC ARRAY (ALU)
              </text>
              <text x="380" y="212" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                Supplied via Orthogonal M5/M6 Mesh
              </text>

              {/* Live Voltage Probe Badges */}
              <g transform="translate(145, 60)">
                <rect x="0" y="0" width="110" height="24" rx="4" fill="#000000" stroke="#ef4444" strokeWidth="1" />
                <text x="55" y="16" fill="#fca5a5" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  VDD: {deliveredVoltage} V
                </text>
              </g>
              <g transform="translate(185, 100)">
                <rect x="0" y="0" width="90" height="22" rx="4" fill="#000000" stroke="#06b6d4" strokeWidth="1" />
                <text x="45" y="15" fill="#67e8f9" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  VSS: 0.000 V
                </text>
              </g>
            </g>
          )}

          {detail.category.includes('Ingress') && (
            // ==================== 2. PAD-TO-CORE TRUNK & ESD CLAMP SCHEMATIC ====================
            <g transform="translate(20, 20)">
              {/* External C4/Bond Pad */}
              <g transform="translate(40, 160)">
                <rect x="0" y="0" width="90" height="80" rx="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2.5" />
                <circle cx="45" cy="40" r="22" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" filter="url(#neonGlowGold)" />
                <text x="45" y="44" fill="#000" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">IO PAD</text>
                <text x="45" y="100" fill="#f59e0b" fontSize="10" fontFamily="monospace" textAnchor="middle">1.0V Supply In</text>
              </g>

              {/* Wire to Series Resistor */}
              <line x1="130" y1="200" x2="190" y2="200" stroke="#f59e0b" strokeWidth="5" />

              {/* Series Ballasting Resistor (Zig-zag) */}
              <g transform="translate(190, 200)">
                <path d="M 0 0 L 10 -15 L 25 15 L 40 -15 L 55 15 L 70 -15 L 80 0" fill="none" stroke="#f59e0b" strokeWidth="4" />
                <text x="40" y="-22" fill="#fbbf24" fontSize="10" fontFamily="monospace" textAnchor="middle">R_ballast = 0.024 Ω</text>
              </g>

              {/* Node after resistor */}
              <line x1="270" y1="200" x2="350" y2="200" stroke="#ef4444" strokeWidth="5" />
              <circle cx="350" cy="200" r="5" fill="#ffffff" />

              {/* ESD Rail Clamp Subsystem */}
              <g transform="translate(350, 60)">
                {/* Diode D1 to VDD (Upper) */}
                <line x1="0" y1="140" x2="0" y2="60" stroke="#ef4444" strokeWidth="2.5" />
                <polygon points="-12,60 12,60 0,35" fill="#ef4444" />
                <line x1="-14" y1="35" x2="14" y2="35" stroke="#ef4444" strokeWidth="2.5" />
                <text x="35" y="55" fill="#fca5a5" fontSize="10" fontFamily="monospace">D_ESD (Upper)</text>

                {/* Active RC-Triggered BigFET Clamp */}
                <rect x="-40" y="80" width="80" height="35" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1.5" />
                <text x="0" y="96" fill="#c084fc" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">RC-Triggered</text>
                <text x="0" y="108" fill="#c084fc" fontSize="8" fontFamily="monospace" textAnchor="middle">Active BigFET Clamp</text>

                {/* Diode D2 to Ground (Lower) */}
                <line x1="0" y1="140" x2="0" y2="220" stroke="#06b6d4" strokeWidth="2.5" />
                <polygon points="-12,190 12,190 0,215" fill="#06b6d4" />
                <line x1="-14" y1="215" x2="14" y2="215" stroke="#06b6d4" strokeWidth="2.5" />
                <text x="35" y="210" fill="#67e8f9" fontSize="10" fontFamily="monospace">D_ESD (Substrate)</text>
              </g>

              {/* Heavy Metal 7/8 Feeder Trunk */}
              <line x1="350" y1="200" x2="550" y2="200" stroke="#ef4444" strokeWidth="10" filter="url(#neonGlowRed)" />
              <text x="450" y="180" fill="#f87171" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                M7 / M8 HEAVY COPPER TRUNK (W=24µm)
              </text>
              <text x="450" y="225" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                Sheet Resistance: 0.015 Ω/□ • J_max: 2.5 mA/µm
              </text>

              {/* Multi-cut Via Matrix at Core Ring Landing */}
              <g transform="translate(550, 160)">
                <rect x="0" y="0" width="70" height="80" rx="4" fill="#1e293b" stroke="#facc15" strokeWidth="2" />
                {/* 4x4 Via Array dots */}
                {[15, 30, 45, 60].map((vx) =>
                  [20, 35, 50, 65].map((vy) => (
                    <circle key={`${vx}_${vy}`} cx={vx} cy={vy} r="3" fill="#facc15" stroke="#000" strokeWidth="0.5" />
                  ))
                )}
                <text x="35" y="-10" fill="#facc15" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  16x VIA ARRAY
                </text>
              </g>

              {/* Core Power Ring Connection */}
              <line x1="620" y1="200" x2="720" y2="200" stroke="#22c55e" strokeWidth="8" />
              <text x="670" y="180" fill="#4ade80" fontSize="10" fontFamily="monospace" fontWeight="bold">CORE RING</text>
              <text x="670" y="225" fill="#a7f3d0" fontSize="9" fontFamily="monospace">VDD Node</text>
            </g>
          )}

          {(detail.category.includes('Mesh') || detail.category.includes('Vertical') || detail.category.includes('Horizontal')) && (
            // ==================== 3. ORTHOGONAL MESH LATTICE & VIA CROSSING SCHEMATIC ====================
            <g transform="translate(30, 20)">
              {/* Title Header */}
              <text x="360" y="25" fill="#4ade80" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                ORTHOGONAL M5 (HORIZONTAL) × M6 (VERTICAL) POWER MESH LATTICE
              </text>

              {/* Vertical M6 Straps (Green) */}
              {[140, 280, 420, 560].map((x, idx) => (
                <g key={`vstrap_${idx}`}>
                  <line x1={x} y1="50" x2={x} y2="360" stroke="#22c55e" strokeWidth="8" filter="url(#neonGlowGreen)" />
                  <text x={x} y="45" fill="#4ade80" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    M6_V{idx + 1}
                  </text>
                  <text x={x} y="375" fill="#86efac" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    {idx % 2 === 0 ? 'VDD' : 'VSS'}
                  </text>
                </g>
              ))}

              {/* Horizontal M5 Straps (Red) */}
              {[120, 220, 320].map((y, idx) => (
                <g key={`hstrap_${idx}`}>
                  <line x1="80" y1={y} x2="620" y2={y} stroke="#ef4444" strokeWidth="6" />
                  <text x="50" y={y + 4} fill="#f87171" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    M5_H{idx + 1}
                  </text>
                </g>
              ))}

              {/* Intersecting Via Matrices */}
              {[140, 280, 420, 560].map((x) =>
                [120, 220, 320].map((y) => (
                  <g key={`via_${x}_${y}`}>
                    <rect x={x - 8} y={y - 8} width="16" height="16" fill="#facc15" stroke="#000000" strokeWidth="1.5" />
                    <circle cx={x} cy={y} r="2.5" fill="#000" />
                  </g>
                ))
              )}

              {/* Electrical Distributed Lumped Model Annotation */}
              <g transform="translate(150, 130)">
                <rect x="0" y="0" width="120" height="80" rx="4" fill="#0f172a" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 2" />
                <text x="60" y="18" fill="#93c5fd" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  LUMPED RLC CELL
                </text>
                <text x="60" y="34" fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  R_grid = 0.045 Ω
                </text>
                <text x="60" y="48" fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  L_loop = 18 pH
                </text>
                <text x="60" y="62" fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  C_mutual = 12 fF
                </text>
              </g>

              {/* Current Vector Flow Arrow */}
              <g transform="translate(430, 160)">
                <line x1="0" y1="0" x2="0" y2="40" stroke="#facc15" strokeWidth="3" markerEnd="url(#arrow)" />
                <text x="15" y="25" fill="#fef08a" fontSize="9" fontFamily="monospace">I_load ↓</text>
              </g>
            </g>
          )}

          {detail.category.includes('Local') && (
            // ==================== 4. STANDARD CELL RAILS & CMOS INVERTER SCHEMATIC ====================
            <g transform="translate(20, 20)">
              {/* Upper VDD Rail (M1) */}
              <line x1="40" y1="80" x2="720" y2="80" stroke="#ef4444" strokeWidth="8" filter="url(#neonGlowRed)" />
              <text x="80" y="65" fill="#f87171" fontSize="12" fontFamily="monospace" fontWeight="bold">
                M1 STANDARD CELL VDD RAIL (+1.0V)
              </text>

              {/* Lower VSS Rail (M1) */}
              <line x1="40" y1="320" x2="720" y2="320" stroke="#06b6d4" strokeWidth="8" />
              <text x="80" y="345" fill="#67e8f9" fontSize="12" fontFamily="monospace" fontWeight="bold">
                M1 STANDARD CELL VSS GROUND RAIL (0V)
              </text>

              {/* Standard Cell Inverter Schematic Between Rails */}
              <g transform="translate(260, 100)">
                {/* PMOS Pull-Up Transistor */}
                <line x1="120" y1="-20" x2="120" y2="25" stroke="#ef4444" strokeWidth="3" />
                <rect x="95" y="25" width="50" height="35" rx="4" fill="#1e293b" stroke="#ef4444" strokeWidth="1.5" />
                <circle cx="90" cy="42" r="5" fill="none" stroke="#ef4444" strokeWidth="2" />
                <text x="120" y="47" fill="#fca5a5" fontSize="10" fontFamily="monospace" textAnchor="middle">PMOS</text>

                {/* NMOS Pull-Down Transistor */}
                <rect x="95" y="125" width="50" height="35" rx="4" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5" />
                <line x1="120" y1="160" x2="120" y2="220" stroke="#06b6d4" strokeWidth="3" />
                <text x="120" y="147" fill="#67e8f9" fontSize="10" fontFamily="monospace" textAnchor="middle">NMOS</text>

                {/* Common Drain Output Line */}
                <line x1="120" y1="60" x2="120" y2="125" stroke="#ffffff" strokeWidth="3" />
                <line x1="120" y1="92" x2="220" y2="92" stroke="#ffffff" strokeWidth="2.5" />
                <circle cx="220" cy="92" r="4" fill="#ffffff" />
                <text x="235" y="96" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">Y (Output)</text>

                {/* Common Gate Input Line */}
                <line x1="85" y1="42" x2="40" y2="42" stroke="#e2e8f0" strokeWidth="2" />
                <line x1="95" y1="142" x2="40" y2="142" stroke="#e2e8f0" strokeWidth="2" />
                <line x1="40" y1="42" x2="40" y2="142" stroke="#e2e8f0" strokeWidth="2" />
                <line x1="40" y1="92" x2="-20" y2="92" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx="-20" cy="92" r="4" fill="#e2e8f0" />
                <text x="-55" y="96" fill="#e2e8f0" fontSize="11" fontFamily="monospace" fontWeight="bold">A (In)</text>

                {/* Latch-up Protection Well Taps */}
                <g transform="translate(180, 0)">
                  <rect x="0" y="0" width="80" height="28" rx="4" fill="#14532d" stroke="#4ade80" strokeWidth="1" />
                  <text x="40" y="18" fill="#86efac" fontSize="9" fontFamily="monospace" textAnchor="middle">N-Well Tap</text>
                  <line x1="40" y1="0" x2="40" y2="-20" stroke="#ef4444" strokeWidth="2" />
                </g>
                <g transform="translate(180, 180)">
                  <rect x="0" y="0" width="80" height="28" rx="4" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                  <text x="40" y="18" fill="#c7d2fe" fontSize="9" fontFamily="monospace" textAnchor="middle">P-Sub Tap</text>
                  <line x1="40" y1="28" x2="40" y2="40" stroke="#06b6d4" strokeWidth="2" />
                </g>
              </g>

              {/* Vertical Via Dropper From Upper M5 Strap */}
              <g transform="translate(560, 40)">
                <rect x="0" y="0" width="130" height="50" rx="6" fill="#1e293b" stroke="#facc15" strokeWidth="1.5" />
                <text x="65" y="20" fill="#facc15" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">M5 STRAP DROP</text>
                <text x="65" y="36" fill="#e2e8f0" fontSize="8" fontFamily="monospace" textAnchor="middle">Stacked Via Matrix</text>
                <line x1="65" y1="50" x2="65" y2="80" stroke="#facc15" strokeWidth="3" />
              </g>
            </g>
          )}

          {detail.category.includes('Vertical Interconnect') && (
            // ==================== 5. MULTI-CUT VIA MATRIX SCHEMATIC ====================
            <g transform="translate(30, 20)">
              <text x="360" y="30" fill="#facc15" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                MULTI-CUT REDUNDANT VIA MATRIX (4x4 ARRAY = 16 PARALLEL CUTS)
              </text>

              {/* Upper Metal Landing Pad (M6) */}
              <rect x="120" y="70" width="480" height="60" rx="8" fill="#14532d" stroke="#22c55e" strokeWidth="2.5" />
              <text x="360" y="105" fill="#4ade80" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                UPPER METAL CONDUCTOR (M6 VERTICAL STRAP)
              </text>

              {/* Lower Metal Receiving Pad (M5) */}
              <rect x="120" y="270" width="480" height="60" rx="8" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2.5" />
              <text x="360" y="305" fill="#f87171" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                LOWER METAL CONDUCTOR (M5 HORIZONTAL STRAP)
              </text>

              {/* 4 Parallel Via Column Stacks */}
              {[180, 280, 380, 480].map((vx, i) => (
                <g key={`via_col_${i}`}>
                  <line x1={vx} y1="130" x2={vx} y2="270" stroke="#facc15" strokeWidth="6" strokeDasharray="6 3" />
                  <rect x={vx - 14} y="175" width="28" height="45" rx="4" fill="#000000" stroke="#facc15" strokeWidth="1.5" />
                  <text x={vx} y="195" fill="#facc15" fontSize="8" fontFamily="monospace" textAnchor="middle">Cut #{i + 1}</text>
                  <text x={vx} y="210" fill="#ffffff" fontSize="8" fontFamily="monospace" textAnchor="middle">1.2 Ω</text>
                </g>
              ))}

              {/* Equivalent Parallel Resistance Calculation Box */}
              <g transform="translate(560, 160)">
                <rect x="0" y="0" width="180" height="80" rx="8" fill="#0f172a" stroke="#facc15" strokeWidth="1.5" />
                <text x="90" y="22" fill="#facc15" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  PARALLEL EQUIVALENCE
                </text>
                <text x="90" y="42" fill="#e2e8f0" fontSize="11" fontFamily="monospace" textAnchor="middle">
                  R_total = R_via / N
                </text>
                <text x="90" y="60" fill="#4ade80" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  R_matrix = 0.075 Ω
                </text>
              </g>
            </g>
          )}

          {detail.category.includes('Transient') && (
            // ==================== 6. DECOUPLING CAPACITOR CELL SCHEMATIC ====================
            <g transform="translate(30, 20)">
              <text x="360" y="30" fill="#c084fc" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                ON-DIE THIN-OXIDE DECOUPLING CAPACITOR (DECAP CELL ARCHITECTURE)
              </text>

              {/* VDD Top Rail */}
              <line x1="60" y1="80" x2="660" y2="80" stroke="#ef4444" strokeWidth="6" />
              <text x="100" y="70" fill="#f87171" fontSize="11" fontFamily="monospace" fontWeight="bold">VDD (+1.0V)</text>

              {/* VSS Bottom Rail */}
              <line x1="60" y1="320" x2="660" y2="320" stroke="#06b6d4" strokeWidth="6" />
              <text x="100" y="345" fill="#67e8f9" fontSize="11" fontFamily="monospace" fontWeight="bold">VSS (0V)</text>

              {/* Decap Equivalent RLC Branch */}
              <g transform="translate(240, 100)">
                {/* Series Gate Protection Resistor ESR */}
                <line x1="80" y1="-20" x2="80" y2="20" stroke="#ef4444" strokeWidth="3" />
                <rect x="60" y="20" width="40" height="30" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="80" y="38" fill="#fbbf24" fontSize="8" fontFamily="monospace" textAnchor="middle">ESR</text>

                {/* Parasitic Inductance ESL */}
                <line x1="80" y1="50" x2="80" y2="70" stroke="#e2e8f0" strokeWidth="2" />
                <path d="M 80 70 C 95 75, 95 90, 80 95 C 95 100, 95 115, 80 120" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                <text x="105" y="98" fill="#e2e8f0" fontSize="8" fontFamily="monospace">ESL (2pH)</text>

                {/* Thin-Oxide MOS Capacitor */}
                <line x1="80" y1="120" x2="80" y2="140" stroke="#e2e8f0" strokeWidth="2" />
                <line x1="50" y1="140" x2="110" y2="140" stroke="#c084fc" strokeWidth="4" />
                <line x1="50" y1="152" x2="110" y2="152" stroke="#c084fc" strokeWidth="4" />
                <text x="135" y="150" fill="#d8b4fe" fontSize="10" fontFamily="monospace" fontWeight="bold">C_decap (50fF)</text>

                {/* Return to VSS */}
                <line x1="80" y1="152" x2="80" y2="220" stroke="#06b6d4" strokeWidth="3" />
              </g>

              {/* Transient Switching Waveform Box */}
              <g transform="translate(420, 120)">
                <rect x="0" y="0" width="240" height="150" rx="8" fill="#090d16" stroke="#c084fc" strokeWidth="1" />
                <text x="120" y="22" fill="#d8b4fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  DYNAMIC DROOP SUPPRESSION
                </text>
                {/* Without Decap Curve (Deep Sag) */}
                <path d="M 20 60 Q 60 130 110 65 T 220 60" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 2" />
                <text x="140" y="115" fill="#f87171" fontSize="8" fontFamily="monospace">Without Decap: -140mV</text>

                {/* With Decap Curve (Protected) */}
                <path d="M 20 60 Q 60 80 110 62 T 220 60" fill="none" stroke="#4ade80" strokeWidth="2.5" />
                <text x="140" y="75" fill="#4ade80" fontSize="8" fontFamily="monospace">With Decap: -18mV (Safe)</text>
              </g>
            </g>
          )}
        </svg>

        {/* Live Status Footnote inside schematic */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono bg-black/80 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="text-amber-400 font-bold">Simulated Current Load:</span>
            <input 
              type="range" min="5" max="100" step="5" value={loadCurrent}
              onChange={(e) => setLoadCurrent(parseInt(e.target.value))}
              className="w-20 accent-amber-500 cursor-pointer"
            />
            <span className="text-white font-bold">{loadCurrent} mA</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>Dynamic IR Drop: <strong className="text-rose-400 font-bold">{dynamicDropMv} mV</strong></span>
            <span>Delivered Rail VDD: <strong className="text-emerald-400 font-bold">{deliveredVoltage} V</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Comprehensive Slide-out / Right-Panel Technical Inspector ---
export function PowerCircuitDetailView({
  selectedElement,
  onClearSelection,
  onOpen3DView
}: {
  selectedElement: any;
  onClearSelection: () => void;
  onOpen3DView?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'schematic' | 'specs' | 'stack3d'>('schematic');
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);

  const detail = useMemo(() => {
    if (!selectedElement) return PDN_KNOWLEDGE_BASE['POWER_RING'];
    return getPdnDetail(selectedElement.name, selectedElement.layer);
  }, [selectedElement]);

  if (!selectedElement) {
    return (
      <div className="p-6 text-center text-gray-400 font-mono text-xs flex flex-col items-center justify-center h-full">
        <Zap size={32} className="text-amber-400/50 mb-3 animate-pulse" />
        <h4 className="text-gray-200 font-bold text-sm mb-1">Click Any Block or Conductor</h4>
        <p className="max-w-xs text-gray-400 leading-relaxed">
          Select any Power Ring, Vertical/Horizontal Strap, Pad Trunk, Followpin Rail, or Via Array on the layout or in 3D to inspect internal circuit diagrams and microarchitectural physics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121418] text-gray-200 select-none overflow-hidden">
      {/* Header with Title and Category */}
      <div className="p-4 border-b border-white/10 bg-[#161920] shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span 
            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${detail.accentColor}20`, color: detail.accentColor, border: `1px solid ${detail.accentColor}40` }}
          >
            {detail.category}
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowFullscreenModal(true)}
              className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 border border-white/10 transition-colors"
              title="Maximize Schematic"
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={onClearSelection}
              className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors"
              title="Close Inspector"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
            <span>{detail.title}</span>
          </h3>
          <span className="text-xs text-amber-400 font-mono">{detail.layer}</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-black/40 p-1 rounded-lg border border-white/10 text-xs font-mono">
          <button
            onClick={() => setActiveTab('schematic')}
            className={`flex-1 py-1.5 rounded text-center transition-all ${activeTab === 'schematic' ? 'bg-amber-500 text-black font-bold shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Circuit Schematic
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`flex-1 py-1.5 rounded text-center transition-all ${activeTab === 'specs' ? 'bg-amber-500 text-black font-bold shadow' : 'text-gray-400 hover:text-white'}`}
          >
            PDN Specs & RLC
          </button>
          <button
            onClick={() => setActiveTab('stack3d')}
            className={`flex-1 py-1.5 rounded text-center transition-all ${activeTab === 'stack3d' ? 'bg-amber-500 text-black font-bold shadow' : 'text-gray-400 hover:text-white'}`}
          >
            3D Silicon Level
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {activeTab === 'schematic' && (
          <div className="space-y-4">
            <InteractivePdnCircuitSchematic
              elementName={selectedElement.name}
              layerName={selectedElement.layer}
              onOpenFullscreen={() => setShowFullscreenModal(true)}
            />

            {/* Microarchitecture Role Card */}
            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 space-y-2">
              <span className="text-amber-400 font-bold text-xs uppercase flex items-center space-x-1.5">
                <Info size={13} />
                <span>Functional Role & Silicon Purpose</span>
              </span>
              <p className="text-gray-300 font-sans leading-relaxed text-xs">
                {detail.description}
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-gray-400 text-[10px] block">Sheet Resistance (R_sq)</span>
                <span className="text-white font-bold">{detail.sheetResistance}</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-gray-400 text-[10px] block">Electromigration (J_max)</span>
                <span className="text-emerald-400 font-bold">{detail.maxCurrentDensity}</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-gray-400 text-[10px] block">IR Drop Budget</span>
                <span className="text-amber-400 font-bold">{detail.irDropBudget}</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-gray-400 text-[10px] block">Conductor Thickness</span>
                <span className="text-purple-300 font-bold">{detail.thickness}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'specs' && (
          <div className="space-y-4">
            {/* Electrical SPICE Model */}
            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 space-y-2">
              <span className="text-amber-400 font-bold text-xs uppercase flex items-center space-x-1.5">
                <Activity size={13} />
                <span>Distributed RLC Network Model</span>
              </span>
              <p className="text-gray-300 font-sans text-xs leading-relaxed">
                {detail.electricalModel}
              </p>
              <div className="p-2.5 bg-black/60 rounded-lg border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                <code>{detail.equivalentSpice}</code>
              </div>
            </div>

            {/* Microarchitecture Details */}
            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 space-y-2">
              <span className="text-blue-400 font-bold text-xs uppercase flex items-center space-x-1.5">
                <Cpu size={13} />
                <span>Physical Microarchitecture</span>
              </span>
              <p className="text-gray-300 font-sans text-xs leading-relaxed">
                {detail.microarchitecture}
              </p>
            </div>

            {/* Input & Output Terminals */}
            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 space-y-2.5">
              <span className="text-gray-300 font-bold text-xs uppercase flex items-center space-x-1.5">
                <Layers size={13} className="text-amber-400" />
                <span>Electrical Ports & Interconnects</span>
              </span>
              <div className="space-y-1.5">
                {detail.inputs.map((inp, idx) => (
                  <div key={idx} className="p-2 rounded bg-black/40 border border-white/5 flex items-start justify-between">
                    <div>
                      <span className="font-bold text-emerald-400">{inp.name}</span>
                      <p className="text-[11px] text-gray-400 font-sans">{inp.desc}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      {inp.type}
                    </span>
                  </div>
                ))}
                {detail.outputs.map((out, idx) => (
                  <div key={idx} className="p-2 rounded bg-black/40 border border-white/5 flex items-start justify-between">
                    <div>
                      <span className="font-bold text-amber-400">{out.name}</span>
                      <p className="text-[11px] text-gray-400 font-sans">{out.desc}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                      {out.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stack3d' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-blue-950/40 to-indigo-950/40 rounded-xl border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-400 font-bold text-xs uppercase flex items-center space-x-1.5">
                  <Box size={14} />
                  <span>3D Silicon Stack Layer</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {detail.layer}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-sans leading-relaxed">
                This element resides on <strong>{detail.layer}</strong>. Higher metal layers feature thicker dielectric and larger cross-sections, lowering resistance for chip-wide distribution.
              </p>

              {onOpen3DView && (
                <button
                  onClick={onOpen3DView}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all"
                >
                  <Box size={14} />
                  <span>Inspect in 3D Silicon Stack View</span>
                </button>
              )}
            </div>

            {/* Vertical Stack Elevation Map */}
            <div className="p-3.5 bg-black/50 rounded-xl border border-white/10 space-y-2">
              <span className="text-gray-400 text-xs font-bold block mb-1">Vertical Metal Hierarchy:</span>
              <div className="space-y-1.5 text-[11px]">
                <div className={`p-2 rounded flex justify-between items-center ${detail.layer.includes('Metal 7') || detail.layer.includes('Metal 8') ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'bg-white/5 text-gray-400'}`}>
                  <span>M7/M8: Pad-to-Core Feeder Trunks</span>
                  <span>Z = 3.6 µm</span>
                </div>
                <div className={`p-2 rounded flex justify-between items-center ${detail.layer.includes('Metal 6') ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold' : 'bg-white/5 text-gray-400'}`}>
                  <span>M6: Vertical Mesh Straps</span>
                  <span>Z = 2.4 µm</span>
                </div>
                <div className={`p-2 rounded flex justify-between items-center ${detail.layer.includes('Metal 5') ? 'bg-red-500/20 border border-red-500/40 text-red-300 font-bold' : 'bg-white/5 text-gray-400'}`}>
                  <span>M5: Horizontal Mesh Straps</span>
                  <span>Z = 1.6 µm</span>
                </div>
                <div className={`p-2 rounded flex justify-between items-center ${detail.layer.includes('Metal 1') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'bg-white/5 text-gray-400'}`}>
                  <span>M1: Standard Cell Followpin Rails</span>
                  <span>Z = 0.4 µm</span>
                </div>
                <div className="p-2 rounded bg-white/5 text-gray-500 flex justify-between items-center">
                  <span>Silicon Substrate & Active Diffusion</span>
                  <span>Z = 0.0 µm</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Schematic Modal */}
      {showFullscreenModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121418] border border-white/20 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#161820] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: detail.accentColor }} />
                <div>
                  <h3 className="font-bold text-white text-base font-mono">{detail.title}</h3>
                  <span className="text-xs text-amber-400 font-mono">{detail.layer} • Fullscreen High-Resolution Schematic</span>
                </div>
              </div>
              <button
                onClick={() => setShowFullscreenModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-hidden">
              <InteractivePdnCircuitSchematic
                elementName={selectedElement.name}
                layerName={selectedElement.layer}
                isFullscreen={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

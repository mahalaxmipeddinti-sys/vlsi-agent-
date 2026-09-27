import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  Minimize2, 
  Maximize2, 
  Search, 
  Cpu, 
  Zap, 
  Layers, 
  Info, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface GateDefinition {
  id: string;
  name: string;
  category: 'basic' | 'universal' | 'arithmetic' | 'sequential';
  equation: string;
  cmosTransistors: number;
  description: string;
  vlsiTip: string;
  inputsCount: number;
  truthTable: { a: number; b?: number; y: number }[];
  visualCue: string;
  evaluate: (a: boolean, b: boolean) => boolean;
}

export const VLSI_GATES: GateDefinition[] = [
  {
    id: 'and',
    name: 'AND Gate',
    category: 'basic',
    equation: 'Y = A · B',
    cmosTransistors: 6,
    description: 'Output is HIGH (1) only if ALL inputs are HIGH (1). In all other cases, output is LOW (0).',
    vlsiTip: 'In standard CMOS, an AND gate is built as a NAND gate followed by an Inverter (4T + 2T = 6T). It requires two logic stages.',
    inputsCount: 2,
    truthTable: [
      { a: 0, b: 0, y: 0 },
      { a: 0, b: 1, y: 0 },
      { a: 1, b: 0, y: 0 },
      { a: 1, b: 1, y: 1 },
    ],
    visualCue: 'Flat vertical input edge with a rounded semi-circular output edge.',
    evaluate: (a, b) => a && b,
  },
  {
    id: 'or',
    name: 'OR Gate',
    category: 'basic',
    equation: 'Y = A + B',
    cmosTransistors: 6,
    description: 'Output is HIGH (1) if AT LEAST ONE input is HIGH (1). Output is LOW (0) only when all inputs are 0.',
    vlsiTip: 'Constructed in CMOS as a NOR gate + Inverter (4T + 2T = 6T). Requires two stages of propagation delay.',
    inputsCount: 2,
    truthTable: [
      { a: 0, b: 0, y: 0 },
      { a: 0, b: 1, y: 1 },
      { a: 1, b: 0, y: 1 },
      { a: 1, b: 1, y: 1 },
    ],
    visualCue: 'Curved concave input edge with a pointed, shield-like output nose.',
    evaluate: (a, b) => a || b,
  },
  {
    id: 'not',
    name: 'NOT (Inverter / INV)',
    category: 'basic',
    equation: 'Y = A̅',
    cmosTransistors: 2,
    description: 'Inverts the digital logic level: 0 becomes 1, and 1 becomes 0. Fundamental CMOS gain stage.',
    vlsiTip: 'The fundamental building block of CMOS (1 PMOS pull-up + 1 NMOS pull-down = 2T). Features rail-to-rail voltage swing and zero static power dissipation.',
    inputsCount: 1,
    truthTable: [
      { a: 0, y: 1 },
      { a: 1, y: 0 },
    ],
    visualCue: 'Right-pointing triangle with a small negation bubble on the output apex.',
    evaluate: (a) => !a,
  },
  {
    id: 'nand',
    name: 'NAND Gate',
    category: 'universal',
    equation: 'Y = (A · B)̅',
    cmosTransistors: 4,
    description: 'Negated AND. Output is LOW (0) ONLY when all inputs are 1; otherwise output is HIGH (1). Universal logic gate.',
    vlsiTip: 'The industry-preferred CMOS gate! Only requires 4 transistors in a single stage (2 PMOS parallel, 2 NMOS series). Faster and smaller than an AND gate.',
    inputsCount: 2,
    truthTable: [
      { a: 0, b: 0, y: 1 },
      { a: 0, b: 1, y: 1 },
      { a: 1, b: 0, y: 1 },
      { a: 1, b: 1, y: 0 },
    ],
    visualCue: 'AND gate silhouette with an inversion bubble at the output.',
    evaluate: (a, b) => !(a && b),
  },
  {
    id: 'nor',
    name: 'NOR Gate',
    category: 'universal',
    equation: 'Y = (A + B)̅',
    cmosTransistors: 4,
    description: 'Negated OR. Output is HIGH (1) ONLY when all inputs are 0; otherwise output is LOW (0). Universal logic gate.',
    vlsiTip: 'Single-stage CMOS (2 PMOS series, 2 NMOS parallel). Slower pull-up than NAND because PMOS holes have ~2-3x lower mobility than NMOS electrons.',
    inputsCount: 2,
    truthTable: [
      { a: 0, b: 0, y: 1 },
      { a: 0, b: 1, y: 0 },
      { a: 1, b: 0, y: 0 },
      { a: 1, b: 1, y: 0 },
    ],
    visualCue: 'OR gate silhouette with an inversion bubble at the pointed output.',
    evaluate: (a, b) => !(a || b),
  },
  {
    id: 'xor',
    name: 'XOR Gate',
    category: 'arithmetic',
    equation: 'Y = A ⊕ B = A̅B + AB̅',
    cmosTransistors: 8,
    description: 'Exclusive-OR: Output is HIGH (1) if inputs are DIFFERENT (odd parity). Used extensively in binary adders and parity generators.',
    vlsiTip: 'Core of half adders and full adders (SUM output). Usually synthesized using transmission gates or complex AOI (And-Or-Invert) gates for compactness.',
    inputsCount: 2,
    truthTable: [
      { a: 0, b: 0, y: 0 },
      { a: 0, b: 1, y: 1 },
      { a: 1, b: 0, y: 1 },
      { a: 1, b: 1, y: 0 },
    ],
    visualCue: 'OR gate silhouette with an extra curved line parallel to the input concave back.',
    evaluate: (a, b) => a !== b,
  },
  {
    id: 'xnor',
    name: 'XNOR Gate (Equivalence)',
    category: 'arithmetic',
    equation: 'Y = (A ⊕ B)̅ = AB + A̅B̅',
    cmosTransistors: 8,
    description: 'Exclusive-NOR: Output is HIGH (1) if inputs are IDENTICAL (equality comparator: 00 or 11).',
    vlsiTip: 'Used in bitwise magnitude comparators and parity checkers. Equivalent to XOR followed by an inverter or direct transmission-gate cross-coupling.',
    inputsCount: 2,
    truthTable: [
      { a: 0, b: 0, y: 1 },
      { a: 0, b: 1, y: 0 },
      { a: 1, b: 0, y: 0 },
      { a: 1, b: 1, y: 1 },
    ],
    visualCue: 'XOR gate with an inversion bubble on the output tip.',
    evaluate: (a, b) => a === b,
  },
  {
    id: 'dff',
    name: 'D Flip-Flop (DFF / Register)',
    category: 'sequential',
    equation: 'Q(t+1) = D (on CLK ↑)',
    cmosTransistors: 18,
    description: 'Edge-triggered sequential storage element. Samples input D on the rising clock edge (CLK ↑) and maintains state at Q for the entire clock cycle.',
    vlsiTip: 'Forms the backbone of synchronous digital VLSI pipelining. Governed by Setup Time (t_setup) and Hold Time (t_hold) timing closure constraints.',
    inputsCount: 2, // D and CLK
    truthTable: [
      { a: 0, b: 1, y: 0 },
      { a: 1, b: 1, y: 1 },
    ],
    visualCue: 'Rectangular block with input D, clock wedge (triangle) on the left, and Q output on the right.',
    evaluate: (d) => d,
  },
  {
    id: 'mux',
    name: '2:1 Multiplexer (MUX)',
    category: 'arithmetic',
    equation: 'Y = S̅·D₀ + S·D₁',
    cmosTransistors: 6,
    description: 'Data selector: routes one of two input signals (D0 or D1) to output Y based on select input S.',
    vlsiTip: 'In modern standard cell libraries, 2:1 MUX is implemented via dual complementary CMOS transmission gates (TG) with shared inverter, minimizing propagation delay.',
    inputsCount: 2,
    truthTable: [
      { a: 0, b: 0, y: 0 },
      { a: 1, b: 0, y: 1 },
      { a: 0, b: 1, y: 0 },
      { a: 1, b: 1, y: 1 },
    ],
    visualCue: 'Trapezoidal block with two inputs on wide left edge and one output on narrow right edge.',
    evaluate: (d0, d1) => d0, // Default preview
  },
];

export interface SignalColorDefinition {
  id: string;
  name: string;
  role: string;
  colorSwatch: string;
  borderColor: string;
  textColor: string;
  canvasAppearance: string;
  explanation: string;
  practicalRule: string;
}

export const SIGNAL_COLORS: SignalColorDefinition[] = [
  {
    id: 'input',
    name: 'Primary Input Ports',
    role: 'Circuit Stimulus / Top-Level Input Pins',
    colorSwatch: 'bg-[#064e3b]',
    borderColor: 'border-[#10b981]',
    textColor: 'text-emerald-400',
    canvasAppearance: 'Dark green badge with bright emerald border (source handle on right)',
    explanation: 'Represents external chip package pins, pad inputs, or testbench stimuli driving the core logic. In the simulation panel, inputs can be toggled to verify logic operation.',
    practicalRule: 'Primary inputs are external drivers; they never have upstream gate drivers within this module.'
  },
  {
    id: 'output',
    name: 'Primary Output Ports',
    role: 'Circuit Results / Top-Level Output Pins',
    colorSwatch: 'bg-[#7f1d1d]',
    borderColor: 'border-[#ef4444]',
    textColor: 'text-red-400',
    canvasAppearance: 'Dark red badge with bright crimson border (target handle on left)',
    explanation: 'Represents module output ports observed by downstream systems, pads, or verification testbenches. Sinks the calculated boolean state.',
    practicalRule: 'Outputs connect to primary load capacitances; in physical design they are routed to output buffers or I/O pads.'
  },
  {
    id: 'comb_gate',
    name: 'Combinational Logic Gates',
    role: 'Zero-Memory Boolean Processing',
    colorSwatch: 'bg-[#1e3a8a]',
    borderColor: 'border-[#3b82f6]',
    textColor: 'text-blue-400',
    canvasAppearance: 'Deep cobalt blue silhouettes with electric blue outlines (#3b82f6)',
    explanation: 'Standard digital logic cells (AND, OR, NAND, NOR, XOR, XNOR, NOT, MUX). Output immediately updates upon input transition after cell propagation delay (t_pd).',
    practicalRule: 'Combinational circuits must never contain combinational feedback loops unless intentionally designed as latches or ring oscillators.'
  },
  {
    id: 'seq_element',
    name: 'Sequential Memory (DFF / Reg)',
    role: 'Synchronous State Storage',
    colorSwatch: 'bg-[#7e22ce]',
    borderColor: 'border-[#a855f7]',
    textColor: 'text-purple-400',
    canvasAppearance: 'Royal purple rectangular cell with internal clock wedge and lavender outline',
    explanation: 'Flip-flops and registers that isolate clock domains and define pipeline stages. Synchronized to the system clock posedge, holding state across clock periods.',
    practicalRule: 'Data must be stable for t_setup before clock edge and t_hold after clock edge to avoid metastability.'
  },
  {
    id: 'active_net',
    name: 'Signal Net / Interconnect Wire',
    role: 'Metal Interconnect Routing (M1–M4)',
    colorSwatch: 'bg-[#10b981]',
    borderColor: 'border-[#34d399]',
    textColor: 'text-emerald-300',
    canvasAppearance: 'Orthogonal smoothstep lines with continuous animated green flow pulses',
    explanation: 'Represents physical on-chip metal routing connecting output pins of drivers to input pins of receivers. Animated pulses illustrate logic propagation paths.',
    practicalRule: 'Keep wire lengths short in critical timing paths to reduce wire RC delay and cross-talk noise.'
  },
  {
    id: 'logic_high',
    name: 'Logic High (1 / VDD)',
    role: 'High Potential State (Power Rail)',
    colorSwatch: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-300',
    canvasAppearance: 'Illuminated glowing emerald badge (1)',
    explanation: 'Represents binary true / VDD potential (e.g., 1.8V, 1.2V, 0.9V depending on process node). PMOS pull-up network is conducting.',
    practicalRule: 'Active-high signals represent enabled states or asserted conditions.'
  },
  {
    id: 'logic_low',
    name: 'Logic Low (0 / GND)',
    role: 'Low Potential State (Ground Reference)',
    colorSwatch: 'bg-gray-800',
    borderColor: 'border-gray-600',
    textColor: 'text-gray-400',
    canvasAppearance: 'Dark muted gray badge (0)',
    explanation: 'Represents binary false / 0V ground reference. NMOS pull-down network is conducting to discharge the output load capacitor.',
    practicalRule: 'Clean GND return paths prevent ground bounce and substrate noise injection.'
  },
];

export interface LogicDiagramLegendProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGateForSimulation?: (gateType: string) => void;
}

export function LogicDiagramLegend({ isOpen, onClose }: LogicDiagramLegendProps) {
  const [activeTab, setActiveTab] = useState<'gates' | 'signals' | 'cheatsheet'>('gates');
  const [selectedGateId, setSelectedGateId] = useState<string>('nand');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Interactive gate tester state
  const [simInputA, setSimInputA] = useState<boolean>(true);
  const [simInputB, setSimInputB] = useState<boolean>(false);

  const selectedGate = VLSI_GATES.find((g) => g.id === selectedGateId) || VLSI_GATES[0];

  const filteredGates = VLSI_GATES.filter((gate) => {
    const matchesCategory = categoryFilter === 'all' || gate.category === categoryFilter;
    const matchesSearch = 
      gate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gate.equation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gate.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gate.vlsiTip.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredSignals = SIGNAL_COLORS.filter((sig) => {
    return (
      sig.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sig.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sig.explanation.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate live output for interactive tester
  const liveOutput = selectedGate.evaluate(simInputA, simInputB);

  // Gate SVG renderer helper for crisp standard rendering
  const renderGateSvg = (gateId: string, width = 80, height = 50, stroke = '#3b82f6', fill = '#1e3a8a') => {
    const strokeWidth = 2;
    const t = gateId.toLowerCase();

    let content = null;
    if (t === 'and') {
      content = <path d="M 12,8 L 32,8 A 20,20 0 0,1 32,42 L 12,42 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    } else if (t === 'or') {
      content = <path d="M 10,8 Q 30,8 48,25 Q 30,42 10,42 Q 20,25 10,8 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    } else if (t === 'not') {
      content = (
        <>
          <path d="M 15,8 L 40,25 L 15,42 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="45" cy="25" r="4.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      );
    } else if (t === 'nand') {
      content = (
        <>
          <path d="M 8,8 L 28,8 A 17,17 0 0,1 28,42 L 8,42 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="49" cy="25" r="4.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      );
    } else if (t === 'nor') {
      content = (
        <>
          <path d="M 8,8 Q 28,8 44,25 Q 28,42 8,42 Q 17,25 8,8 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="50" cy="25" r="4.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      );
    } else if (t === 'xor') {
      content = (
        <>
          <path d="M 16,8 Q 34,8 50,25 Q 34,42 16,42 Q 25,25 16,8 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M 10,8 Q 19,25 10,42" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </>
      );
    } else if (t === 'xnor') {
      content = (
        <>
          <path d="M 14,8 Q 32,8 46,25 Q 32,42 14,42 Q 23,25 14,8 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M 8,8 Q 17,25 8,42" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="52" cy="25" r="4.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      );
    } else if (t === 'dff') {
      content = (
        <>
          <rect x="10" y="6" width="46" height="38" fill="#7e22ce" stroke="#a855f7" strokeWidth={strokeWidth} rx="4" />
          <path d="M 10,30 L 18,25 L 10,20" fill="none" stroke="#a855f7" strokeWidth={strokeWidth} />
          <text x="33" y="29" fill="#fff" fontSize="12" textAnchor="middle" fontWeight="bold" fontFamily="monospace">DFF</text>
        </>
      );
    } else if (t === 'mux') {
      content = (
        <>
          <path d="M 12,8 L 48,14 L 48,36 L 12,42 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <text x="30" y="29" fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold" fontFamily="monospace">MUX</text>
        </>
      );
    }

    return (
      <svg width={width} height={height} viewBox="0 0 60 50" className="drop-shadow">
        {content}
      </svg>
    );
  };

  if (!isOpen) return null;

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div 
        id="logic-diagram-legend-minimized"
        className="absolute bottom-6 right-6 z-30 flex items-center space-x-2 bg-[#151619]/90 backdrop-blur-md border border-emerald-500/40 px-3.5 py-2 rounded-full shadow-2xl hover:border-emerald-400 transition-all cursor-pointer group text-xs text-gray-200"
        onClick={() => setIsMinimized(false)}
      >
        <BookOpen size={15} className="text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-semibold text-emerald-400">VLSI Legend & Color Guide</span>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">Active</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="p-1 hover:text-white text-gray-400"
          title="Expand Legend"
        >
          <Maximize2 size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:text-red-400 text-gray-400"
          title="Close Legend"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        id="logic-diagram-legend-overlay"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-4 md:inset-8 z-30 flex flex-col bg-[#0d0f12]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#15181e]/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white font-mono tracking-wide">
                  VLSI Standard Gate Symbols & Signal Color Legend
                </h2>
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  IEEE Std 91-1984
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Essential reference guide for schematic symbols, CMOS transistor topology, and visual net color coding.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search Input */}
            <div className="relative w-48 lg:w-64 hidden sm:block">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gates, rules, colors..."
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Minimize to floating pill"
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Close Legend"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#121418] border-b border-white/10 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('gates')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'gates'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Cpu size={14} />
              <span>Standard Gate Symbols</span>
              <span className="ml-1 text-[10px] opacity-75 bg-white/10 px-1.5 py-0.2 rounded-full">
                {VLSI_GATES.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('signals')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'signals'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Zap size={14} />
              <span>Signal Color Coding</span>
              <span className="ml-1 text-[10px] opacity-75 bg-white/10 px-1.5 py-0.2 rounded-full">
                {SIGNAL_COLORS.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cheatsheet')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'cheatsheet'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Layers size={14} />
              <span>VLSI Student Quick Reference</span>
            </button>
          </div>

          {activeTab === 'gates' && (
            <div className="hidden sm:flex items-center space-x-1 text-[11px]">
              <span className="text-gray-500 mr-1.5">Filter:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'basic', label: 'Basic' },
                { id: 'universal', label: 'Universal (NAND/NOR)' },
                { id: 'arithmetic', label: 'XOR/MUX' },
                { id: 'sequential', label: 'Sequential' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-2 py-1 rounded transition-colors ${
                    categoryFilter === c.id
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'gates' && (
            <div className="h-full flex flex-col lg:flex-row overflow-hidden">
              {/* Gate Grid List */}
              <div className="flex-1 overflow-y-auto p-5 border-r border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredGates.map((gate) => {
                    const isSelected = gate.id === selectedGateId;
                    return (
                      <div
                        key={gate.id}
                        id={`legend-gate-card-${gate.id}`}
                        onClick={() => setSelectedGateId(gate.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                            : 'bg-[#14161b] border-white/10 hover:border-white/20 hover:bg-[#1a1d23]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-14 h-12 bg-black/40 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                              {renderGateSvg(gate.id, 46, 32)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-bold text-white font-mono">{gate.name}</h4>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                                  gate.category === 'universal' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  gate.category === 'sequential' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                  {gate.category}
                                </span>
                              </div>
                              <div className="text-xs font-mono text-emerald-400 mt-0.5">{gate.equation}</div>
                            </div>
                          </div>
                          <div className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 shrink-0">
                            {gate.cmosTransistors}T
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 mt-2.5 line-clamp-2 leading-relaxed">
                          {gate.description}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                          <span className="text-gray-400 italic text-[10px]">
                            {gate.visualCue}
                          </span>
                          <span className="text-emerald-400 flex items-center space-x-1 font-mono text-[10px]">
                            <span>Explore Details</span>
                            <ArrowRight size={10} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Gate Inspector & Live Interactive Simulator */}
              <div className="w-full lg:w-[420px] bg-[#111317] flex flex-col p-5 overflow-y-auto shrink-0 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-emerald-400 tracking-wider">
                      Interactive Gate Inspector
                    </span>
                    <h3 className="text-lg font-bold text-white font-mono">{selectedGate.name}</h3>
                  </div>
                  <div className="text-xs font-mono px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    {selectedGate.equation}
                  </div>
                </div>

                {/* Big Diagram View */}
                <div className="bg-[#0b0c0e] rounded-xl border border-white/10 p-4 flex flex-col items-center justify-center relative">
                  <span className="absolute top-2 left-2 text-[10px] text-gray-500 font-mono">ANSI / IEEE Standard</span>
                  <div className="py-2">
                    {renderGateSvg(selectedGate.id, 120, 70, '#3b82f6', '#1e3a8a')}
                  </div>
                  <div className="text-center text-xs text-gray-400 font-mono mt-1">
                    Shape: <span className="text-gray-200">{selectedGate.visualCue}</span>
                  </div>
                </div>

                {/* Interactive Live Tester */}
                <div className="bg-[#15181e] rounded-xl border border-emerald-500/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5 font-mono">
                      <Sparkles size={13} />
                      <span>Live Logic Evaluator</span>
                    </span>
                    <span className="text-[10px] text-gray-400">Click inputs to toggle</span>
                  </div>

                  <div className="flex items-center justify-center space-x-6 py-2">
                    {/* Inputs */}
                    <div className="flex flex-col space-y-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-emerald-400 w-4 text-right">A:</span>
                        <button
                          onClick={() => setSimInputA(!simInputA)}
                          className={`w-11 h-8 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center ${
                            simInputA
                              ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                              : 'bg-black/60 border border-white/20 text-gray-400 hover:text-white'
                          }`}
                        >
                          {simInputA ? '1 (H)' : '0 (L)'}
                        </button>
                      </div>

                      {selectedGate.inputsCount > 1 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-emerald-400 w-4 text-right">B:</span>
                          <button
                            onClick={() => setSimInputB(!simInputB)}
                            className={`w-11 h-8 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center ${
                              simInputB
                                ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                                : 'bg-black/60 border border-white/20 text-gray-400 hover:text-white'
                            }`}
                          >
                            {simInputB ? '1 (H)' : '0 (L)'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Gate Symbol in Mini */}
                    <div className="w-16 h-12 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center">
                      <span className="text-[11px] font-mono font-bold text-blue-400 uppercase">
                        {selectedGate.id}
                      </span>
                    </div>

                    {/* Output LED */}
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-14 h-10 rounded-lg font-mono text-xs font-bold flex flex-col items-center justify-center transition-all ${
                          liveOutput
                            ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] ring-2 ring-blue-400'
                            : 'bg-black/60 border border-white/20 text-gray-500'
                        }`}
                      >
                        <span className="text-sm">{liveOutput ? '1' : '0'}</span>
                        <span className="text-[8px] opacity-80">{liveOutput ? 'HIGH' : 'LOW'}</span>
                      </div>
                      <span className="text-xs font-mono text-blue-400">Y</span>
                    </div>
                  </div>
                </div>

                {/* Truth Table */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>TRUTH TABLE</span>
                    <span className="text-[10px] text-gray-500">Active Row Highlighted</span>
                  </div>
                  <table className="w-full text-xs font-mono text-center border-collapse bg-black/40 rounded-lg overflow-hidden border border-white/10">
                    <thead>
                      <tr className="bg-[#191c22] text-emerald-400 border-b border-white/10">
                        <th className="p-1.5 border-r border-white/10">Input A</th>
                        {selectedGate.inputsCount > 1 && <th className="p-1.5 border-r border-white/10">Input B</th>}
                        <th className="p-1.5 text-blue-400">Output Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGate.truthTable.map((row, idx) => {
                        const isCurrent = 
                          (row.a === (simInputA ? 1 : 0)) && 
                          (selectedGate.inputsCount === 1 || row.b === (simInputB ? 1 : 0));
                        return (
                          <tr
                            key={idx}
                            className={`border-b border-white/5 transition-colors ${
                              isCurrent ? 'bg-emerald-500/25 font-bold text-white' : 'text-gray-300 hover:bg-white/5'
                            }`}
                          >
                            <td className="p-1.5 border-r border-white/10">{row.a}</td>
                            {selectedGate.inputsCount > 1 && (
                              <td className="p-1.5 border-r border-white/10">{row.b}</td>
                            )}
                            <td className={`p-1.5 ${row.y === 1 ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                              {row.y}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* VLSI & CMOS Engineering Tip */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-semibold font-mono">
                    <Zap size={13} />
                    <span>VLSI Implementation Insight ({selectedGate.cmosTransistors} Transistors)</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    {selectedGate.vlsiTip}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signals' && (
            <div className="h-full overflow-y-auto p-6 space-y-5">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-[#14171d] border border-white/10 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">Logic Diagram Signal Color Architecture</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Standardized color coding allows instant visual discrimination between signal source, logic stage, and clock boundary.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    6 Standard Signal Classes
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSignals.map((sig) => (
                    <div
                      key={sig.id}
                      id={`legend-signal-card-${sig.id}`}
                      className="bg-[#121419] border border-white/10 rounded-xl p-4 space-y-3 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg ${sig.colorSwatch} border ${sig.borderColor} shadow-sm flex items-center justify-center shrink-0`}>
                            <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                          </div>
                          <div>
                            <h4 className={`text-sm font-bold font-mono ${sig.textColor}`}>{sig.name}</h4>
                            <span className="text-[10px] text-gray-400 font-mono">{sig.role}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/40 rounded-lg p-2 border border-white/5 text-[11px] font-mono text-gray-300">
                        <span className="text-gray-500">Appearance: </span>
                        {sig.canvasAppearance}
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed">
                        {sig.explanation}
                      </p>

                      <div className="pt-2 border-t border-white/5 text-[11px] text-amber-300/90 flex items-start space-x-1.5 font-mono">
                        <Info size={12} className="shrink-0 mt-0.5 text-amber-400" />
                        <span>Rule: {sig.practicalRule}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cheatsheet' && (
            <div className="h-full overflow-y-auto p-6 space-y-6">
              <div className="max-w-4xl mx-auto space-y-5">
                {/* De Morgan's Laws */}
                <div className="bg-[#13151b] border border-white/10 rounded-xl p-5 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 size={16} />
                    <h3 className="text-sm font-bold font-mono uppercase">1. De Morgan's Theorems (CMOS Logic Synthesis)</h3>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    De Morgan's laws allow VLSI synthesis compilers to transform positive-logic equations (AND/OR) into inverting CMOS gates (NAND/NOR), saving transistor count and propagation delay:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-black/50 p-3 rounded-lg border border-emerald-500/30 text-xs font-mono space-y-1">
                      <div className="text-emerald-300 font-bold">Theorem 1 (NAND Equivalence)</div>
                      <div className="text-white text-sm bg-white/5 p-2 rounded">(A · B)̅ = A̅ + B̅</div>
                      <div className="text-gray-400 text-[11px]">"A NAND gate is functionally equivalent to an OR gate with inverted inputs."</div>
                    </div>
                    <div className="bg-black/50 p-3 rounded-lg border border-blue-500/30 text-xs font-mono space-y-1">
                      <div className="text-blue-300 font-bold">Theorem 2 (NOR Equivalence)</div>
                      <div className="text-white text-sm bg-white/5 p-2 rounded">(A + B)̅ = A̅ · B̅</div>
                      <div className="text-gray-400 text-[11px]">"A NOR gate is functionally equivalent to an AND gate with inverted inputs."</div>
                    </div>
                  </div>
                </div>

                {/* Inversion Bubble Rule */}
                <div className="bg-[#13151b] border border-white/10 rounded-xl p-5 space-y-3">
                  <div className="flex items-center space-x-2 text-blue-400">
                    <Zap size={16} />
                    <h3 className="text-sm font-bold font-mono uppercase">2. Bubble Pushing & Logic Inversion Convention</h3>
                  </div>
                  <div className="text-xs text-gray-300 space-y-2 leading-relaxed">
                    <p>
                      In VLSI schematic diagrams, a small circular circle/bubble represents an <strong className="text-white">Active-Low signal or Logical Inversion</strong>.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-400 text-[11px]">
                      <li><strong className="text-gray-200">Output Bubble:</strong> The gate's natural boolean result is inverted before driving the net (e.g. AND becomes NAND).</li>
                      <li><strong className="text-gray-200">Input Bubble:</strong> The input signal is complemented before participating in the internal boolean operation.</li>
                      <li><strong className="text-gray-200">Two Cascaded Bubbles Cancel:</strong> An output bubble connected directly to an input bubble cancels out without introducing logic inversion.</li>
                    </ul>
                  </div>
                </div>

                {/* CMOS Standard Cell Transistor Economics */}
                <div className="bg-[#13151b] border border-white/10 rounded-xl p-5 space-y-3">
                  <div className="flex items-center space-x-2 text-purple-400">
                    <Layers size={16} />
                    <h3 className="text-sm font-bold font-mono uppercase">3. Transistor Sizing & Gate Sizing Hierarchy</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono text-left border-collapse border border-white/10 rounded-lg overflow-hidden">
                      <thead className="bg-[#1c1f26] text-gray-300 border-b border-white/10">
                        <tr>
                          <th className="p-2 border-r border-white/10">Standard Cell</th>
                          <th className="p-2 border-r border-white/10">Transistor Count</th>
                          <th className="p-2 border-r border-white/10">Stages</th>
                          <th className="p-2">Logical Effort (g)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        <tr className="hover:bg-white/5">
                          <td className="p-2 border-r border-white/10 text-emerald-400 font-bold">Inverter (INV)</td>
                          <td className="p-2 border-r border-white/10">2 Transistors</td>
                          <td className="p-2 border-r border-white/10">1 stage</td>
                          <td className="p-2 text-blue-400">g = 1.0 (Baseline)</td>
                        </tr>
                        <tr className="hover:bg-white/5">
                          <td className="p-2 border-r border-white/10 text-emerald-400 font-bold">2-Input NAND</td>
                          <td className="p-2 border-r border-white/10">4 Transistors</td>
                          <td className="p-2 border-r border-white/10">1 stage</td>
                          <td className="p-2 text-blue-400">g = 4/3 ≈ 1.33</td>
                        </tr>
                        <tr className="hover:bg-white/5">
                          <td className="p-2 border-r border-white/10 text-emerald-400 font-bold">2-Input NOR</td>
                          <td className="p-2 border-r border-white/10">4 Transistors</td>
                          <td className="p-2 border-r border-white/10">1 stage</td>
                          <td className="p-2 text-blue-400">g = 5/3 ≈ 1.67</td>
                        </tr>
                        <tr className="hover:bg-white/5">
                          <td className="p-2 border-r border-white/10 text-emerald-400 font-bold">2-Input AND</td>
                          <td className="p-2 border-r border-white/10">6 Transistors</td>
                          <td className="p-2 border-r border-white/10">2 stages (NAND+INV)</td>
                          <td className="p-2 text-blue-400">g = (4/3) × 1 = 1.33</td>
                        </tr>
                        <tr className="hover:bg-white/5">
                          <td className="p-2 border-r border-white/10 text-emerald-400 font-bold">2-Input OR</td>
                          <td className="p-2 border-r border-white/10">6 Transistors</td>
                          <td className="p-2 border-r border-white/10">2 stages (NOR+INV)</td>
                          <td className="p-2 text-blue-400">g = (5/3) × 1 = 1.67</td>
                        </tr>
                        <tr className="hover:bg-white/5">
                          <td className="p-2 border-r border-white/10 text-emerald-400 font-bold">2-Input XOR</td>
                          <td className="p-2 border-r border-white/10">8–12 Transistors</td>
                          <td className="p-2 border-r border-white/10">Multi-stage</td>
                          <td className="p-2 text-blue-400">g ≈ 2.0 – 4.0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Flip Flop Timing Rules */}
                <div className="bg-[#13151b] border border-white/10 rounded-xl p-5 space-y-3">
                  <div className="flex items-center space-x-2 text-pink-400">
                    <Info size={16} />
                    <h3 className="text-sm font-bold font-mono uppercase">4. Sequential Timing: Setup & Hold Windows</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="bg-black/50 p-3 rounded-lg border border-white/10">
                      <div className="text-emerald-400 font-bold">Setup Time (t_setup)</div>
                      <div className="text-gray-400 text-[11px] mt-1">
                        Minimum time input D must be stable BEFORE the rising clock edge (CLK ↑). Violations cause metastability.
                      </div>
                    </div>
                    <div className="bg-black/50 p-3 rounded-lg border border-white/10">
                      <div className="text-blue-400 font-bold">Hold Time (t_hold)</div>
                      <div className="text-gray-400 text-[11px] mt-1">
                        Minimum time input D must remain stable AFTER the rising clock edge (CLK ↑). Violations cannot be fixed by lowering clock frequency!
                      </div>
                    </div>
                    <div className="bg-black/50 p-3 rounded-lg border border-white/10">
                      <div className="text-purple-400 font-bold">Clock-to-Q (t_cq)</div>
                      <div className="text-gray-400 text-[11px] mt-1">
                        Delay from the active clock edge until the new stored state appears at output Q.
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

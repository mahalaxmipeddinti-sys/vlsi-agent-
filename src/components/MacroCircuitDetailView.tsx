import React, { useState, useMemo } from 'react';
import { 
  MacroBlock, 
  MacroOrientation 
} from '../types/physicalDesign';
import { 
  Layers, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Database, 
  GitBranch, 
  Cpu, 
  Maximize2, 
  X, 
  Info, 
  CheckCircle2, 
  Play, 
  RotateCw, 
  Sliders, 
  ArrowRight,
  Minimize2,
  Trash2,
  Binary,
  Share2
} from 'lucide-react';

export interface MacroDetailData {
  title: string;
  category: string;
  description: string;
  microarchitecture: string;
  operationMode: string;
  gateCount: number;
  transistorCount: number;
  criticalPathDelay: string;
  dynamicPower: string;
  clockDomain: string;
  inputs: { name: string; width: string; desc: string }[];
  outputs: { name: string; width: string; desc: string }[];
  controlSignals: { name: string; desc: string }[];
  accentColor: string;
}

export const MACRO_KNOWLEDGE_BASE: Record<string, MacroDetailData> = {
  'ADDER_SUB_UNIT': {
    title: '4-Bit Adder / Subtractor Unit (ASU)',
    category: 'Arithmetic Datapath',
    description: 'A high-speed arithmetic core that performs parallel binary addition and two\'s complement subtraction. It incorporates conditional XOR input inverters on the B-operand, a fast ripple/lookahead carry generation chain, and dedicated overflow detection logic.',
    microarchitecture: '4x Cascaded Full Adder (FA) standard cells with XOR inversion pre-stages. In SUB mode (SUB=1), the B inputs are bitwise inverted (~B) and the initial Carry-In (C0) is asserted to 1, implementing standard two\'s complement arithmetic (A + ~B + 1 = A - B).',
    operationMode: 'Synchronous / Combinational with dual mode (ADD: SUB=0, SUB: SUB=1)',
    gateCount: 48,
    transistorCount: 192,
    criticalPathDelay: '0.42 ns (C0 to Cout ripple)',
    dynamicPower: '1.24 mW @ 1.0 GHz',
    clockDomain: 'clk_core (Synchronous)',
    inputs: [
      { name: 'A[3:0]', width: '4-bit', desc: 'Primary operand input vector' },
      { name: 'B[3:0]', width: '4-bit', desc: 'Secondary operand vector (inverted if SUB=1)' },
      { name: 'SUB', width: '1-bit', desc: 'Mode select: 0 = Addition (A+B), 1 = Subtraction (A-B)' }
    ],
    outputs: [
      { name: 'SUM[3:0]', width: '4-bit', desc: 'Computed arithmetic result' },
      { name: 'COUT', width: '1-bit', desc: 'Carry-out flag (unsigned overflow / borrow indicator)' },
      { name: 'OVERFLOW', width: '1-bit', desc: 'Signed overflow flag: V = C3 ⊕ C4' },
      { name: 'ZERO', width: '1-bit', desc: 'Zero result flag: NOR(SUM[3:0])' }
    ],
    controlSignals: [
      { name: 'SUB_CTRL', desc: 'Inverts B vector and sets carry-in C0' },
      { name: 'OVF_EN', desc: 'Gated check for 2\'s complement range violation' }
    ],
    accentColor: '#a855f7' // Purple
  },
  'BOOLEAN_LOGIC_UNIT': {
    title: '4-Bit Bitwise Boolean Logic Unit (BLU)',
    category: 'Bitwise Logic Core',
    description: 'Executes parallel bitwise logic operations across all bit positions of two 4-bit operands. Handles bit masking, field extraction, register clearing, and status bit checking with single-cycle latency.',
    microarchitecture: 'Consists of 4 parallel gate arrays (AND2, OR2, XOR2, INV) computing all logical operations simultaneously, feeding into a 4-to-1 transmission-gate multiplexer tree steered by opcode bits OP[1:0]. Includes a 4-input NOR tree to signal if the output is all-zeros.',
    operationMode: 'Pure Combinational (Single Cycle, zero latency)',
    gateCount: 36,
    transistorCount: 144,
    criticalPathDelay: '0.28 ns (Input to Mux Output)',
    dynamicPower: '0.85 mW @ 1.0 GHz',
    clockDomain: 'clk_core (Combinational)',
    inputs: [
      { name: 'A[3:0]', width: '4-bit', desc: 'Input operand vector A' },
      { name: 'B[3:0]', width: '4-bit', desc: 'Input operand vector B' },
      { name: 'OP[1:0]', width: '2-bit', desc: '00: AND, 01: OR, 10: XOR, 11: NOT A' }
    ],
    outputs: [
      { name: 'OUT[3:0]', width: '4-bit', desc: 'Bitwise logical output result' },
      { name: 'ZERO', width: '1-bit', desc: 'Zero status flag: Active HIGH when all bits are 0' }
    ],
    controlSignals: [
      { name: 'OP[1:0]', desc: 'Function select bus for output multiplexer' }
    ],
    accentColor: '#f59e0b' // Amber/Yellow
  },
  'BARREL_SHIFTER': {
    title: '4-Bit Logarithmic Barrel Shifter',
    category: 'Data Manipulation',
    description: 'A dedicated hardware shifter capable of shifting or rotating a 4-bit data word by any shift amount (0 to 3 bits) in a single clock cycle, eliminating multi-cycle iterative shifting loops.',
    microarchitecture: 'Arranged as a logarithmic 2-stage multiplexer network. Stage 0 performs a conditional 1-bit shift based on shamt[0]; Stage 1 performs a conditional 2-bit shift based on shamt[1]. In arithmetic right shift (ASR) mode, the sign bit A[3] is replicated into vacated MSB positions.',
    operationMode: 'Logical Left (LSL), Logical Right (LSR), Arithmetic Right (ASR)',
    gateCount: 42,
    transistorCount: 168,
    criticalPathDelay: '0.35 ns (Stage 0 + Stage 1 MUX)',
    dynamicPower: '0.98 mW @ 1.0 GHz',
    clockDomain: 'clk_core',
    inputs: [
      { name: 'DATA_IN[3:0]', width: '4-bit', desc: 'Data word to be shifted' },
      { name: 'SHAMT[1:0]', width: '2-bit', desc: 'Shift distance: 0, 1, 2, or 3 bit positions' },
      { name: 'MODE[1:0]', width: '2-bit', desc: '00: LSL, 01: LSR, 10: ASR, 11: ROR' }
    ],
    outputs: [
      { name: 'DATA_OUT[3:0]', width: '4-bit', desc: 'Shifted result vector' },
      { name: 'CARRY_FLAG', width: '1-bit', desc: 'Last bit shifted out of the register' }
    ],
    controlSignals: [
      { name: 'DIR_SEL', desc: 'Left vs Right shift direction control' },
      { name: 'ARITH_SEL', desc: 'Enables sign-bit replication for signed values' }
    ],
    accentColor: '#3b82f6' // Blue
  },
  'REGISTER_BANK': {
    title: '4×4-Bit Dual-Port Register Bank (RegFile)',
    category: 'Sequential Storage',
    description: 'A multi-port SRAM/flip-flop register array providing temporary local operand storage for ALU calculations. Features independent dual read ports (Port A and Port B) for simultaneous operand fetch and a synchronous write port.',
    microarchitecture: 'Composed of 16 positive-edge-triggered D-Flip-Flop storage cells arranged in four 4-bit registers (R0, R1, R2, R3). A 2-to-4 one-hot write address decoder enables writing only to the selected register when Write-Enable (WE) is asserted. Dual 4-to-1 multiplexers route read data to Port A and Port B asynchronously.',
    operationMode: 'Synchronous Write (posedge CLK), Asynchronous Dual Read',
    gateCount: 96,
    transistorCount: 412,
    criticalPathDelay: '0.55 ns (Clock-to-Q + Read MUX)',
    dynamicPower: '2.10 mW @ 1.0 GHz',
    clockDomain: 'clk_core (Synchronous with RST_N)',
    inputs: [
      { name: 'CLK', width: '1-bit', desc: 'Master synchronous clock edge' },
      { name: 'RST_N', width: '1-bit', desc: 'Active-low asynchronous reset' },
      { name: 'W_DATA[3:0]', width: '4-bit', desc: 'Data word to write into target register' },
      { name: 'W_ADDR[1:0]', width: '2-bit', desc: 'Destination register address (00=R0, 01=R1, 10=R2, 11=R3)' },
      { name: 'WE', width: '1-bit', desc: 'Write Enable: Active HIGH on posedge CLK' },
      { name: 'R_ADDR_A[1:0]', width: '2-bit', desc: 'Read Port A address selector' },
      { name: 'R_ADDR_B[1:0]', width: '2-bit', desc: 'Read Port B address selector' }
    ],
    outputs: [
      { name: 'R_DATA_A[3:0]', width: '4-bit', desc: 'Asynchronous read output from Port A' },
      { name: 'R_DATA_B[3:0]', width: '4-bit', desc: 'Asynchronous read output from Port B' }
    ],
    controlSignals: [
      { name: 'WE_GATE', desc: 'Clock gating logic for low dynamic standby power' },
      { name: 'DEC_EN', desc: '2-to-4 address decoder enable line' }
    ],
    accentColor: '#10b981' // Emerald
  },
  'JK_FF_CORE': {
    title: 'Master-Slave J-K Flip-Flop Core Stage',
    category: 'Sequential Storage Core',
    description: 'A robust pulse-triggered master-slave J-K flip-flop cell featuring cross-coupled NAND/NOR gate pairs, asynchronous active-low Preset and Clear overrides, and non-overlapping internal clock steering to prevent race conditions.',
    microarchitecture: 'Consists of a 3-input NAND master latch, a 2-input slave latch, and an internal clock inverter. J and K inputs steer the data during CLK HIGH; output state transitions occur deterministically on the falling edge of the clock signal.',
    operationMode: 'Negative-edge triggered (Falling edge), Asynchronous active-low direct PRE_N / CLR_N',
    gateCount: 8,
    transistorCount: 36,
    criticalPathDelay: '0.24 ns (Clock-to-Q)',
    dynamicPower: '0.45 mW @ 100 MHz',
    clockDomain: 'CLK (Negative Edge)',
    inputs: [
      { name: 'CLK', width: '1-bit', desc: 'Clock trigger input' },
      { name: 'J', width: '1-bit', desc: 'Synchronous data input J (Set)' },
      { name: 'K', width: '1-bit', desc: 'Synchronous data input K (Reset)' },
      { name: 'PRE_N', width: '1-bit', desc: 'Active-low direct asynchronous preset' },
      { name: 'CLR_N', width: '1-bit', desc: 'Active-low direct asynchronous clear' }
    ],
    outputs: [
      { name: 'Q', width: '1-bit', desc: 'True output state' },
      { name: 'Q_N', width: '1-bit', desc: 'Complementary inverted output state' }
    ],
    controlSignals: [
      { name: 'OVERRIDE_PRIORITY', desc: 'Clear/Preset dominates clock edge' }
    ],
    accentColor: '#06b6d4'
  },
  'NAND_GATE': {
    title: 'High-Speed CMOS Dual-Input NAND Unit',
    category: 'Basic Logic Core',
    description: 'A standard-cell optimized 2-input NAND logic gate. Uses two parallel PMOS pull-up transistors connected to VDD and two series NMOS pull-down transistors connected to VSS.',
    microarchitecture: 'Direct static CMOS topology: Y = ~(A & B). Sized with 2:1 PMOS/NMOS aspect ratio for balanced rise/fall propagation delay and maximum noise margins.',
    operationMode: 'Combinational',
    gateCount: 1,
    transistorCount: 4,
    criticalPathDelay: '0.045 ns',
    dynamicPower: '0.08 mW @ 500 MHz',
    clockDomain: 'Pure Combinational (Asynchronous)',
    inputs: [
      { name: 'A', width: '1-bit', desc: 'Primary input A' },
      { name: 'B', width: '1-bit', desc: 'Secondary input B' }
    ],
    outputs: [
      { name: 'Y', width: '1-bit', desc: 'Inverted AND product ~(A & B)' }
    ],
    controlSignals: [],
    accentColor: '#10b981'
  },
  'COUNTER_4BIT_REGS': {
    title: '4-Bit Synchronous Binary Counter Register Bank',
    category: 'Sequential Datapath',
    description: '4 cascaded flip-flop storage elements with common clock distribution and synchronous parallel load/clear circuitry for state counting from 0000 to 1111 (0 to 15).',
    microarchitecture: '4x D-Flip-Flops with toggle enable logic fed by lookahead carry gates. Counts synchronously on the positive clock edge when both ENP and ENT are HIGH.',
    operationMode: 'Synchronous counting with synchronous parallel load',
    gateCount: 28,
    transistorCount: 124,
    criticalPathDelay: '0.32 ns (Clock to Q[3])',
    dynamicPower: '1.15 mW @ 500 MHz',
    clockDomain: 'CLK (Posedge)',
    inputs: [
      { name: 'CLK', width: '1-bit', desc: 'Synchronous clock' },
      { name: 'CLR_N', width: '1-bit', desc: 'Synchronous clear' },
      { name: 'LOAD_N', width: '1-bit', desc: 'Parallel load enable' },
      { name: 'D[3:0]', width: '4-bit', desc: 'Parallel load data' }
    ],
    outputs: [
      { name: 'Q[3:0]', width: '4-bit', desc: '4-bit count vector' }
    ],
    controlSignals: [
      { name: 'ENP', desc: 'Count enable parallel' },
      { name: 'ENT', desc: 'Count enable trickle' }
    ],
    accentColor: '#8b5cf6'
  }
};

export function getMacroDetail(name: string, type?: string): MacroDetailData {
  const upper = name.toUpperCase();
  for (const [key, data] of Object.entries(MACRO_KNOWLEDGE_BASE)) {
    if (upper.includes(key) || key.includes(upper)) {
      return data;
    }
  }

  // Fallbacks by type
  if (type === 'alu' || upper.includes('ADDER')) return MACRO_KNOWLEDGE_BASE['ADDER_SUB_UNIT'];
  if (upper.includes('LOGIC') || upper.includes('BOOL')) return MACRO_KNOWLEDGE_BASE['BOOLEAN_LOGIC_UNIT'];
  if (type === 'shifter' || upper.includes('SHIFT')) return MACRO_KNOWLEDGE_BASE['BARREL_SHIFTER'];
  if (type === 'regfile' || upper.includes('REG') || upper.includes('BANK')) return MACRO_KNOWLEDGE_BASE['REGISTER_BANK'];

  // Generic custom block
  return {
    title: `${name} Physical IP Macro`,
    category: `${type?.toUpperCase() || 'CUSTOM'} IP Block`,
    description: `Synthesized physical macro block ${name} placed within the chip core. Optimized for minimal propagation delay, low power leakage, and strict DRC design rule compliance.`,
    microarchitecture: 'Hierarchical ASIC cell group with standard-cell logic, internal buffered routing tracks, and dedicated clock-gating isolation.',
    operationMode: 'Standard Synchronous ASIC IP core',
    gateCount: 64,
    transistorCount: 256,
    criticalPathDelay: '0.45 ns',
    dynamicPower: '1.45 mW @ 1.0 GHz',
    clockDomain: 'clk_core',
    inputs: [
      { name: 'IN[3:0]', width: '4-bit', desc: 'Primary functional inputs' },
      { name: 'CLK', width: '1-bit', desc: 'System clock net' }
    ],
    outputs: [
      { name: 'OUT[3:0]', width: '4-bit', desc: 'Functional outputs' }
    ],
    controlSignals: [
      { name: 'EN', desc: 'Block enable' }
    ],
    accentColor: '#06b6d4'
  };
}

/**
 * High-definition interactive internal circuit schematics
 */
export function InteractiveCircuitSchematic({ 
  macro, 
  isFullscreen = false 
}: { 
  macro: MacroBlock; 
  isFullscreen?: boolean;
}) {
  const detail = getMacroDetail(macro.name, macro.type);
  const upper = macro.name.toUpperCase();

  // Interactive logic simulation states
  const [valA, setValA] = useState<number>(5); // 0101
  const [valB, setValB] = useState<number>(3); // 0011
  const [subMode, setSubMode] = useState<boolean>(false);
  const [logicOp, setLogicOp] = useState<number>(0); // 0: AND, 1: OR, 2: XOR, 3: NOT
  const [shamt, setShamt] = useState<number>(1);
  const [shiftMode, setShiftMode] = useState<'LSL' | 'LSR' | 'ASR'>('LSL');
  const [regData, setRegData] = useState<number[]>([4, 9, 2, 7]);
  const [readPortA, setReadPortA] = useState<number>(0);
  const [readPortB, setReadPortB] = useState<number>(1);

  // Compute live values
  const adderResult = useMemo(() => {
    const a = valA & 0xF;
    const b = valB & 0xF;
    if (!subMode) {
      const sum = a + b;
      const cout = sum > 15 ? 1 : 0;
      const res = sum & 0xF;
      const ovf = ((a < 8 && b < 8 && res >= 8) || (a >= 8 && b >= 8 && res < 8)) ? 1 : 0;
      return { res, cout, ovf, zero: res === 0 ? 1 : 0 };
    } else {
      const diff = a - b;
      const cout = diff >= 0 ? 1 : 0;
      const res = (diff + 16) & 0xF;
      const ovf = ((a < 8 && b >= 8 && res >= 8) || (a >= 8 && b < 8 && res < 8)) ? 1 : 0;
      return { res, cout, ovf, zero: res === 0 ? 1 : 0 };
    }
  }, [valA, valB, subMode]);

  const logicResult = useMemo(() => {
    const a = valA & 0xF;
    const b = valB & 0xF;
    let res = 0;
    if (logicOp === 0) res = a & b;
    else if (logicOp === 1) res = a | b;
    else if (logicOp === 2) res = a ^ b;
    else res = (~a) & 0xF;
    return { res, zero: res === 0 ? 1 : 0 };
  }, [valA, valB, logicOp]);

  const shifterResult = useMemo(() => {
    const a = valA & 0xF;
    let res = 0;
    if (shiftMode === 'LSL') {
      res = (a << shamt) & 0xF;
    } else if (shiftMode === 'LSR') {
      res = (a >> shamt) & 0xF;
    } else {
      // Arithmetic shift right (sign extend bit 3)
      const sign = (a & 0x8) ? (0xF << (4 - shamt)) & 0xF : 0;
      res = (a >> shamt) | sign;
    }
    return { res };
  }, [valA, shamt, shiftMode]);

  const toBin = (n: number, bits = 4) => (n & ((1 << bits) - 1)).toString(2).padStart(bits, '0');

  // 1. ADDER / SUBTRACTOR SCHEMATIC
  if (upper.includes('ADDER')) {
    return (
      <div className="flex flex-col h-full space-y-3">
        {/* Interactive Controls Bar */}
        <div className="p-2.5 bg-black/40 rounded-lg border border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-mono">A:</span>
            <input 
              type="range" min="0" max="15" value={valA} 
              onChange={e => setValA(parseInt(e.target.value))}
              className="w-20 accent-purple-500"
            />
            <span className="font-mono text-purple-300 font-bold">{valA} ({toBin(valA)})</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-mono">B:</span>
            <input 
              type="range" min="0" max="15" value={valB} 
              onChange={e => setValB(parseInt(e.target.value))}
              className="w-20 accent-purple-500"
            />
            <span className="font-mono text-purple-300 font-bold">{valB} ({toBin(valB)})</span>
          </div>

          <button
            onClick={() => setSubMode(!subMode)}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all border ${
              subMode ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-white/10 text-gray-300 border-white/20'
            }`}
          >
            MODE: {subMode ? 'SUB (A - B)' : 'ADD (A + B)'}
          </button>
        </div>

        {/* Gate-Level Schematic Graphic */}
        <div className={`relative bg-[#0d0e12] rounded-xl border border-purple-500/30 overflow-hidden flex-1 ${isFullscreen ? 'min-h-[480px]' : 'min-h-[260px]'}`}>
          <svg viewBox="0 0 760 380" className="w-full h-full select-none">
            <defs>
              <linearGradient id="adderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.08" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid Backdrop */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
            <rect width="760" height="380" fill="url(#grid)" />

            {/* Subtraction Control Bus Line */}
            <line x1="40" y1="50" x2="680" y2="50" stroke={subMode ? '#ec4899' : '#6b7280'} strokeWidth="2.5" />
            <circle cx="40" cy="50" r="4" fill={subMode ? '#ec4899' : '#6b7280'} />
            <text x="45" y="42" fill={subMode ? '#f472b6' : '#9ca3af'} fontSize="11" fontFamily="monospace" fontWeight="bold">
              SUB_CTRL = {subMode ? '1 (INVERT & C0=1)' : '0 (DIRECT)'}
            </text>

            {/* Carry Ripple Net from right to left (Bit 0 to Bit 3) */}
            <path
              d="M 680 50 L 680 180 L 630 180 M 510 180 L 460 180 M 340 180 L 290 180 M 170 180 L 90 180"
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            {/* Animated Carry Flow */}
            <circle r="3.5" fill="#facc15" filter="url(#neonGlow)">
              <animateMotion
                path="M 680 50 L 680 180 L 90 180"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Render 4 Full Adder Slices (Bit 3, Bit 2, Bit 1, Bit 0) */}
            {[3, 2, 1, 0].map((bit, idx) => {
              const xPos = 170 + (3 - bit) * 170; // 0 is far right, 3 is far left
              const aBit = (valA >> bit) & 1;
              const bBit = (valB >> bit) & 1;
              const xorBit = subMode ? (bBit ^ 1) : bBit;

              return (
                <g key={bit} transform={`translate(${xPos}, 80)`}>
                  {/* Bit Label */}
                  <rect x="-60" y="-15" width="120" height="20" rx="3" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                  <text x="0" y="-1" fill="#c7d2fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    STAGE {bit} (BIT {bit})
                  </text>

                  {/* Input A Line */}
                  <line x1="-35" y1="10" x2="-35" y2="70" stroke="#a855f7" strokeWidth="1.5" />
                  <text x="-40" y="25" fill="#d8b4fe" fontSize="9" fontFamily="monospace" textAnchor="end">A[{bit}]={aBit}</text>

                  {/* Input B Line into XOR gate */}
                  <line x1="30" y1="10" x2="30" y2="35" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="35" y="25" fill="#7dd3fc" fontSize="9" fontFamily="monospace">B[{bit}]={bBit}</text>

                  {/* Tap from SUB_CTRL into XOR */}
                  <line x1="10" y1="-30" x2="10" y2="35" stroke={subMode ? '#ec4899' : '#6b7280'} strokeWidth="1.5" />

                  {/* XOR Gate for Inversion */}
                  <g transform="translate(10, 35)">
                    <rect x="-15" y="0" width="35" height="20" rx="3" fill="#18181b" stroke="#a855f7" strokeWidth="1.2" />
                    <text x="2" y="14" fill="#e9d5ff" fontSize="9" fontFamily="monospace" textAnchor="middle">XOR</text>
                    <line x1="2" y1="20" x2="2" y2="35" stroke="#a855f7" strokeWidth="1.5" />
                    <text x="10" y="32" fill="#c084fc" fontSize="8" fontFamily="monospace">{xorBit}</text>
                  </g>

                  {/* Full Adder Cell Box */}
                  <rect
                    x="-55"
                    y="70"
                    width="110"
                    height="90"
                    rx="6"
                    fill="url(#adderGrad)"
                    stroke="#c084fc"
                    strokeWidth="2"
                    filter="url(#neonGlow)"
                  />
                  <text x="0" y="105" fill="#f3e8ff" fontSize="14" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    FULL ADDER
                  </text>
                  <text x="0" y="125" fill="#a855f7" fontSize="10" fontFamily="monospace" textAnchor="middle">
                    FA_SLICE_{bit}
                  </text>

                  {/* Sum Output Line */}
                  <line x1="0" y1="160" x2="0" y2="220" stroke="#10b981" strokeWidth="2.5" />
                  <circle cx="0" cy="220" r="4" fill="#10b981" />
                  <text x="0" y="238" fill="#34d399" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    SUM[{bit}] = {(adderResult.res >> bit) & 1}
                  </text>

                  {/* Carry In & Carry Out Indicators */}
                  <text x="-48" y="105" fill="#facc15" fontSize="8" fontFamily="monospace">C_OUT</text>
                  <text x="48" y="105" fill="#facc15" fontSize="8" fontFamily="monospace" textAnchor="end">C_IN</text>
                </g>
              );
            })}

            {/* Carry Out Line on Far Left */}
            <g transform="translate(60, 180)">
              <line x1="55" y1="0" x2="0" y2="0" stroke="#facc15" strokeWidth="2.5" />
              <rect x="-50" y="-14" width="50" height="28" rx="4" fill="#854d0e" stroke="#facc15" strokeWidth="1.5" />
              <text x="-25" y="4" fill="#fef08a" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                COUT={adderResult.cout}
              </text>
            </g>

            {/* Overflow Detector XOR Box on Left */}
            <g transform="translate(60, 260)">
              <rect x="-50" y="-12" width="100" height="32" rx="4" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.5" />
              <text x="0" y="8" fill="#fecdd3" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                OVERFLOW = {adderResult.ovf}
              </text>
              <text x="0" y="-18" fill="#fb7185" fontSize="8" fontFamily="monospace" textAnchor="middle">
                V = C3 ⊕ C4
              </text>
            </g>

            {/* Live Result Output Banner */}
            <g transform="translate(380, 345)">
              <rect x="-240" y="-16" width="480" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
              <text x="0" y="5" fill="#a7f3d0" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                RESULT BUS: SUM = {adderResult.res} (4&apos;b{toBin(adderResult.res)}) | ZERO = {adderResult.zero} | COUT = {adderResult.cout}
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 2. BOOLEAN LOGIC UNIT SCHEMATIC
  if (upper.includes('LOGIC') || upper.includes('BOOL')) {
    const opNames = ['AND', 'OR', 'XOR', 'NOT A'];
    return (
      <div className="flex flex-col h-full space-y-3">
        {/* Interactive Controls */}
        <div className="p-2.5 bg-black/40 rounded-lg border border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-mono">A:</span>
            <input 
              type="range" min="0" max="15" value={valA} 
              onChange={e => setValA(parseInt(e.target.value))}
              className="w-20 accent-amber-500"
            />
            <span className="font-mono text-amber-300 font-bold">{valA} ({toBin(valA)})</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-mono">B:</span>
            <input 
              type="range" min="0" max="15" value={valB} 
              onChange={e => setValB(parseInt(e.target.value))}
              className="w-20 accent-amber-500"
            />
            <span className="font-mono text-amber-300 font-bold">{valB} ({toBin(valB)})</span>
          </div>

          {/* Opcode Selector Buttons */}
          <div className="flex items-center space-x-1">
            {opNames.map((name, i) => (
              <button
                key={name}
                onClick={() => setLogicOp(i)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all border ${
                  logicOp === i 
                    ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Schematic Graphic */}
        <div className={`relative bg-[#0d0e12] rounded-xl border border-amber-500/30 overflow-hidden flex-1 ${isFullscreen ? 'min-h-[480px]' : 'min-h-[260px]'}`}>
          <svg viewBox="0 0 760 380" className="w-full h-full select-none">
            {/* Input Buses */}
            <line x1="40" y1="60" x2="160" y2="60" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="35" y="55" fill="#fde68a" fontSize="10" fontFamily="monospace">A[3:0] = {toBin(valA)}</text>

            <line x1="40" y1="120" x2="160" y2="120" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="35" y="115" fill="#fde68a" fontSize="10" fontFamily="monospace">B[3:0] = {toBin(valB)}</text>

            {/* 4 Logic Branches (AND, OR, XOR, NOT) */}
            {[
              { label: '4x AND GATES', y: 60, opIdx: 0, res: valA & valB },
              { label: '4x OR GATES', y: 130, opIdx: 1, res: valA | valB },
              { label: '4x XOR GATES', y: 200, opIdx: 2, res: valA ^ valB },
              { label: '4x NOT INVERTERS', y: 270, opIdx: 3, res: (~valA) & 0xF }
            ].map(gate => {
              const isActive = logicOp === gate.opIdx;
              return (
                <g key={gate.label} transform={`translate(180, ${gate.y})`}>
                  {/* Gate Symbol Box */}
                  <rect
                    x="0"
                    y="-20"
                    width="140"
                    height="40"
                    rx="4"
                    fill={isActive ? '#78350f' : '#1f2937'}
                    stroke={isActive ? '#fbbf24' : '#4b5563'}
                    strokeWidth={isActive ? 2 : 1}
                    className="transition-colors"
                  />
                  <text x="70" y="5" fill={isActive ? '#fff' : '#9ca3af'} fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    {gate.label}
                  </text>
                  <text x="145" y="-5" fill={isActive ? '#fde047' : '#6b7280'} fontSize="9" fontFamily="monospace">
                    {toBin(gate.res)}
                  </text>

                  {/* Wire to Multiplexer */}
                  <path
                    d={`M 140 0 L 380 ${60 + gate.opIdx * 45 - gate.y}`}
                    fill="none"
                    stroke={isActive ? '#f59e0b' : '#374151'}
                    strokeWidth={isActive ? 2.5 : 1}
                  />
                </g>
              );
            })}

            {/* 4-to-1 Multiplexer Stage */}
            <g transform="translate(420, 160)">
              <polygon
                points="0,-80 80,-40 80,40 0,80"
                fill="#292524"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <text x="35" y="5" fill="#fde68a" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                4:1 MUX
              </text>
              <text x="35" y="20" fill="#a8a29e" fontSize="8" fontFamily="monospace" textAnchor="middle">
                OP={toBin(logicOp, 2)}
              </text>

              {/* MUX Output Line */}
              <line x1="80" y1="0" x2="160" y2="0" stroke="#10b981" strokeWidth="3" />
              <circle cx="160" cy="0" r="4" fill="#10b981" />
              <text x="170" y="5" fill="#34d399" fontSize="13" fontWeight="bold" fontFamily="monospace">
                LOGIC_OUT = {logicResult.res} (4&apos;b{toBin(logicResult.res)})
              </text>
            </g>

            {/* Zero-flag NOR tree */}
            <g transform="translate(600, 240)">
              <rect x="0" y="-16" width="90" height="32" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="45" y="4" fill="#7dd3fc" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                ZERO = {logicResult.zero}
              </text>
              <text x="45" y="-20" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                NOR(OUT[3:0])
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 3. BARREL SHIFTER SCHEMATIC
  if (upper.includes('SHIFTER') || upper.includes('SHIFT')) {
    return (
      <div className="flex flex-col h-full space-y-3">
        {/* Interactive Controls */}
        <div className="p-2.5 bg-black/40 rounded-lg border border-blue-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-mono">INPUT:</span>
            <input 
              type="range" min="0" max="15" value={valA} 
              onChange={e => setValA(parseInt(e.target.value))}
              className="w-24 accent-blue-500"
            />
            <span className="font-mono text-blue-300 font-bold">{valA} ({toBin(valA)})</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-mono">SHIFT AMOUNT:</span>
            {[0, 1, 2, 3].map(amt => (
              <button
                key={amt}
                onClick={() => setShamt(amt)}
                className={`w-7 h-7 rounded font-mono text-xs font-bold ${shamt === amt ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-white/5 text-gray-400'}`}
              >
                {amt}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1">
            {(['LSL', 'LSR', 'ASR'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setShiftMode(mode)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${shiftMode === mode ? 'bg-blue-500 text-black' : 'bg-white/5 text-gray-400'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Schematic View */}
        <div className={`relative bg-[#0d0e12] rounded-xl border border-blue-500/30 overflow-hidden flex-1 ${isFullscreen ? 'min-h-[480px]' : 'min-h-[260px]'}`}>
          <svg viewBox="0 0 760 380" className="w-full h-full select-none">
            {/* Input Vector Display */}
            <g transform="translate(60, 180)">
              <rect x="-40" y="-60" width="80" height="120" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="0" y="-35" fill="#7dd3fc" fontSize="10" fontFamily="monospace" textAnchor="middle">DATA IN</text>
              {[3, 2, 1, 0].map(bit => (
                <text key={bit} x="0" y={-10 + (3 - bit) * 25} fill="#fff" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  D{bit}: {(valA >> bit) & 1}
                </text>
              ))}
            </g>

            {/* Stage 0 (Shift 1) */}
            <g transform="translate(260, 180)">
              <rect x="-60" y="-80" width="120" height="160" rx="6" fill="#172554" stroke="#60a5fa" strokeWidth="2" />
              <text x="0" y="-55" fill="#bfdbfe" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                {"STAGE 0 (<< 1)"}
              </text>
              <text x="0" y="-38" fill="#93c5fd" fontSize="9" fontFamily="monospace" textAnchor="middle">
                shamt[0] = {shamt & 1}
              </text>
              <text x="0" y="20" fill="#fff" fontSize="10" fontFamily="monospace" textAnchor="middle">
                4x 2:1 MUX ARRAY
              </text>
            </g>

            {/* Stage 1 (Shift 2) */}
            <g transform="translate(480, 180)">
              <rect x="-60" y="-80" width="120" height="160" rx="6" fill="#172554" stroke="#60a5fa" strokeWidth="2" />
              <text x="0" y="-55" fill="#bfdbfe" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                {"STAGE 1 (<< 2)"}
              </text>
              <text x="0" y="-38" fill="#93c5fd" fontSize="9" fontFamily="monospace" textAnchor="middle">
                shamt[1] = {(shamt >> 1) & 1}
              </text>
              <text x="0" y="20" fill="#fff" fontSize="10" fontFamily="monospace" textAnchor="middle">
                4x 2:1 MUX ARRAY
              </text>
            </g>

            {/* Interconnect lines */}
            <line x1="100" y1="180" x2="200" y2="180" stroke="#3b82f6" strokeWidth="3" />
            <line x1="320" y1="180" x2="420" y2="180" stroke="#3b82f6" strokeWidth="3" />
            <line x1="540" y1="180" x2="630" y2="180" stroke="#10b981" strokeWidth="3.5" />

            {/* Final Output */}
            <g transform="translate(680, 180)">
              <circle cx="0" cy="0" r="5" fill="#10b981" />
              <text x="-40" y="-30" fill="#34d399" fontSize="13" fontWeight="bold" fontFamily="monospace">
                OUT = {shifterResult.res} (4&apos;b{toBin(shifterResult.res)})
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 4. REGISTER BANK SCHEMATIC
  if (upper.includes('REGISTER') || upper.includes('BANK')) {
    return (
      <div className="flex flex-col h-full space-y-3">
        {/* Interactive Controls */}
        <div className="p-2.5 bg-black/40 rounded-lg border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-mono">PORT A SELECT:</span>
            {[0, 1, 2, 3].map(r => (
              <button
                key={r}
                onClick={() => setReadPortA(r)}
                className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${readPortA === r ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-300'}`}
              >
                R{r}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-mono">PORT B SELECT:</span>
            {[0, 1, 2, 3].map(r => (
              <button
                key={r}
                onClick={() => setReadPortB(r)}
                className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${readPortB === r ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-300'}`}
              >
                R{r}
              </button>
            ))}
          </div>
        </div>

        {/* Schematic */}
        <div className={`relative bg-[#0d0e12] rounded-xl border border-emerald-500/30 overflow-hidden flex-1 ${isFullscreen ? 'min-h-[480px]' : 'min-h-[260px]'}`}>
          <svg viewBox="0 0 760 380" className="w-full h-full select-none">
            {/* 4 Register Cells */}
            {[0, 1, 2, 3].map(idx => {
              const y = 50 + idx * 75;
              const isReadA = readPortA === idx;
              const isReadB = readPortB === idx;
              return (
                <g key={idx} transform={`translate(180, ${y})`}>
                  {/* Register Box */}
                  <rect
                    x="0"
                    y="0"
                    width="220"
                    height="55"
                    rx="4"
                    fill={isReadA || isReadB ? '#064e3b' : '#14532d'}
                    stroke={isReadA || isReadB ? '#34d399' : '#15803d'}
                    strokeWidth={isReadA || isReadB ? 2 : 1}
                  />
                  <text x="15" y="25" fill="#a7f3d0" fontSize="12" fontWeight="bold" fontFamily="monospace">
                    REGISTER R{idx}
                  </text>
                  <text x="15" y="42" fill="#6ee7b7" fontSize="10" fontFamily="monospace">
                    Stored Value: {regData[idx]} (4&apos;b{toBin(regData[idx])})
                  </text>

                  {/* Lines to Read Multiplexers */}
                  <line x1="220" y1="28" x2="480" y2={isReadA ? 90 : 250} stroke={isReadA || isReadB ? '#10b981' : '#374151'} strokeWidth="1.5" />
                </g>
              );
            })}

            {/* Read Port A Multiplexer */}
            <g transform="translate(500, 70)">
              <rect x="0" y="0" width="160" height="60" rx="4" fill="#042f2e" stroke="#14b8a6" strokeWidth="1.5" />
              <text x="80" y="25" fill="#5eead4" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                READ PORT A MUX
              </text>
              <text x="80" y="45" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                R_DATA_A: {regData[readPortA]}
              </text>
            </g>

            {/* Read Port B Multiplexer */}
            <g transform="translate(500, 220)">
              <rect x="0" y="0" width="160" height="60" rx="4" fill="#042f2e" stroke="#14b8a6" strokeWidth="1.5" />
              <text x="80" y="25" fill="#5eead4" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                READ PORT B MUX
              </text>
              <text x="80" y="45" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                R_DATA_B: {regData[readPortB]}
              </text>
            </g>

            {/* Write Bus on Left */}
            <g transform="translate(40, 160)">
              <line x1="0" y1="0" x2="140" y2="0" stroke="#f59e0b" strokeWidth="2.5" />
              <text x="0" y="-10" fill="#fde68a" fontSize="10" fontFamily="monospace">WRITE BUS (W_DATA)</text>
              <text x="0" y="20" fill="#9ca3af" fontSize="9" fontFamily="monospace">2:4 ADDR DECODER</text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // Generic block fallback
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-[#0d0e12] rounded-xl border border-white/10">
      <Cpu size={48} className="text-cyan-400 mb-3 opacity-60" />
      <h4 className="text-sm font-bold font-mono text-gray-200 uppercase">{macro.name}</h4>
      <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4 font-mono">
        Internal gate layout and standard cell netlist with synthesized combinational logic paths.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-left font-mono text-xs bg-white/5 p-3 rounded-lg border border-white/10">
        <div><span className="text-gray-500">Area:</span> <span className="text-gray-200">{macro.width * macro.height} µm²</span></div>
        <div><span className="text-gray-500">Halo:</span> <span className="text-gray-200">{macro.halo} µm</span></div>
        <div><span className="text-gray-500">Type:</span> <span className="text-cyan-400">{macro.type.toUpperCase()}</span></div>
        <div><span className="text-gray-500">Orient:</span> <span className="text-gray-200">{macro.orientation}</span></div>
      </div>
    </div>
  );
}

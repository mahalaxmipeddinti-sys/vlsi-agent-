/**
 * VLSI Studio - Comprehensive CMOS Transistor & Circuit Knowledge Base
 * Extracted & Grounded from Authoritative PDF Dataset
 */

export interface TransistorRule {
  parameter: string;
  nmos: string;
  pmos: string;
  notes: string;
}

export const CMOS_TRANSISTOR_RULES: TransistorRule[] = [
  { parameter: 'Substrate', nmos: 'p-type', pmos: 'n-type (n-well)', notes: 'PMOS in n-well, NMOS in p-substrate' },
  { parameter: 'Source Connection', nmos: 'GND (lower potential)', pmos: 'VDD (higher potential)', notes: 'PUN connects to VDD, PDN connects to GND' },
  { parameter: 'Turn-ON Condition', nmos: 'V_GS > V_th (gate HIGH)', pmos: 'V_GS < V_th (gate LOW)', notes: 'Complementary switching' },
  { parameter: 'Conducts Logic', nmos: 'Logic 0 (GND) well', pmos: 'Logic 1 (VDD) well', notes: 'NMOS passes 0 well; PMOS passes 1 well' },
  { parameter: 'Carrier Mobility', nmos: 'Higher (2-3x PMOS)', pmos: 'Lower', notes: 'PMOS width sized 2-3x W_n for equal drive' },
  { parameter: 'Transistor Sizing', nmos: 'Minimum width (W_n)', pmos: '2-3x W_n (for equal drive)', notes: 'Symmetric switching W_p ≈ 2.5 * W_n' },
];

export interface GateTopology {
  id: string;
  name: string;
  category: 'basic' | 'universal' | 'complex' | 'transmission_gate' | 'sequential';
  inputs: string[];
  outputs: string[];
  truthTable: { in: string; out: string }[];
  booleanEq: string;
  transistorCount: number;
  punTopology: string;
  pdnTopology: string;
  delay65nm: string;
  logicalEffortG: number;
  description: string;
  stickDiagramRules: string;
  applications: string[];
}

export const CMOS_GATE_TOPOLOGIES: Record<string, GateTopology> = {
  inverter: {
    id: 'inverter',
    name: 'CMOS Inverter (NOT Gate)',
    category: 'basic',
    inputs: ['A'],
    outputs: ['Y'],
    truthTable: [
      { in: '0', out: '1' },
      { in: '1', out: '0' }
    ],
    booleanEq: 'Y = A\'',
    transistorCount: 2,
    punTopology: '1 PMOS (M1) between VDD and Y',
    pdnTopology: '1 NMOS (M2) between Y and GND',
    delay65nm: 'tpLH ~15-25 ps, tpHL ~10-20 ps, tp_avg ~12-22 ps',
    logicalEffortG: 1.0,
    description: 'Fundamental CMOS building block with 1 PMOS pull-up and 1 NMOS pull-down. Full rail-to-rail swing (0 to VDD), near-zero static power.',
    stickDiagramRules: 'Poly (Red) crosses P-diff (Yellow) & N-diff (Green). Demarcation line (Brown) between n-well and p-sub.',
    applications: ['Signal inversion', 'Buffer (2 series)', 'Logic building block', 'Ring oscillators']
  },
  nand2: {
    id: 'nand2',
    name: 'CMOS 2-Input NAND Gate',
    category: 'universal',
    inputs: ['A', 'B'],
    outputs: ['Y'],
    truthTable: [
      { in: '00', out: '1' },
      { in: '01', out: '1' },
      { in: '10', out: '1' },
      { in: '11', out: '0' }
    ],
    booleanEq: 'Y = (A · B)\'',
    transistorCount: 4,
    punTopology: '2 PMOS (M1, M2) in parallel',
    pdnTopology: '2 NMOS (M3, M4) in series',
    delay65nm: 'tpLH ~20-30 ps (PMOS parallel), tpHL ~25-35 ps (NMOS series)',
    logicalEffortG: 1.33,
    description: 'Industry-preferred CMOS gate. 4 transistors in single stage. NMOS series requires W_n3=W_n4=2*W_n_inv for equal drive.',
    stickDiagramRules: 'Euler path A-B allows shared diffusion for M3/M4, minimizing layout area (~20-30 λ²).',
    applications: ['Universal logic gate', 'AND gate + Inverter', 'SRAM cells', 'Multiplexers', 'Adders']
  },
  nor2: {
    id: 'nor2',
    name: 'CMOS 2-Input NOR Gate',
    category: 'universal',
    inputs: ['A', 'B'],
    outputs: ['Y'],
    truthTable: [
      { in: '00', out: '1' },
      { in: '01', out: '0' },
      { in: '10', out: '0' },
      { in: '11', out: '0' }
    ],
    booleanEq: 'Y = (A + B)\'',
    transistorCount: 4,
    punTopology: '2 PMOS (M1, M2) in series',
    pdnTopology: '2 NMOS (M3, M4) in parallel',
    delay65nm: 'tpLH ~30-45 ps (PMOS series, worst-case), tpHL ~15-25 ps',
    logicalEffortG: 1.67,
    description: 'Dual of NAND gate. PMOS series topology requires 2x width scaling (W_p1=W_p2=2*W_p_inv) to compensate for lower hole mobility.',
    stickDiagramRules: 'Demarcation line separates PMOS series and NMOS parallel diffusion.',
    applications: ['Universal gate', 'OR gate + Inverter', 'De Morgan logic optimization', 'Priority encoders']
  },
  and2: {
    id: 'and2',
    name: 'CMOS 2-Input AND Gate',
    category: 'basic',
    inputs: ['A', 'B'],
    outputs: ['Y'],
    truthTable: [
      { in: '00', out: '0' },
      { in: '01', out: '0' },
      { in: '10', out: '0' },
      { in: '11', out: '1' }
    ],
    booleanEq: 'Y = A · B = ((A · B)\')\'',
    transistorCount: 6,
    punTopology: 'NAND2 + Inverter stage',
    pdnTopology: 'NAND2 + Inverter stage',
    delay65nm: 't_pd_NAND + t_pd_INV (~35-50 ps)',
    logicalEffortG: 1.33,
    description: 'Cannot be built directly in single-stage CMOS. Built as 4T NAND2 followed by 2T Inverter (6T total).',
    stickDiagramRules: 'Two logic stages separated by internal net Y1.',
    applications: ['Logic masking', 'Multiplication circuits', 'Enable signals']
  },
  or2: {
    id: 'or2',
    name: 'CMOS 2-Input OR Gate',
    category: 'basic',
    inputs: ['A', 'B'],
    outputs: ['Y'],
    truthTable: [
      { in: '00', out: '0' },
      { in: '01', out: '1' },
      { in: '10', out: '1' },
      { in: '11', out: '1' }
    ],
    booleanEq: 'Y = A + B = ((A + B)\')\'',
    transistorCount: 6,
    punTopology: 'NOR2 + Inverter stage',
    pdnTopology: 'NOR2 + Inverter stage',
    delay65nm: 't_pd_NOR + t_pd_INV (~45-65 ps)',
    logicalEffortG: 1.67,
    description: 'Built in CMOS as 4T NOR2 followed by 2T Inverter (6T total).',
    stickDiagramRules: 'NOR stage followed by inverter stage.',
    applications: ['Disjunction logic', 'Adder sum generation', 'Interrupt logic']
  },
  xor2_tg: {
    id: 'xor2_tg',
    name: 'Transmission Gate 2-Input XOR',
    category: 'transmission_gate',
    inputs: ['A', 'B'],
    outputs: ['Y'],
    truthTable: [
      { in: '00', out: '0' },
      { in: '01', out: '1' },
      { in: '10', out: '1' },
      { in: '11', out: '0' }
    ],
    booleanEq: 'Y = A ⊕ B = A\'B + AB\'',
    transistorCount: 6,
    punTopology: 'Transmission Gate TG1 (A controls pass B) & TG2 (A\' controls pass B\')',
    pdnTopology: 'Transmission Gate TG1 & TG2',
    delay65nm: 'tp ~25-40 ps',
    logicalEffortG: 2.0,
    description: 'Highly efficient XOR gate built using complementary Transmission Gates (T-Gates). 6-8 transistors vs 12-16 in static gate implementation.',
    stickDiagramRules: 'PMOS and NMOS connected in parallel for bidirectional transmission with full rail-to-rail swing.',
    applications: ['Full Adder Sum generation', 'Comparators', 'Parity generators/checkers', 'Cryptography']
  },
  aoi21: {
    id: 'aoi21',
    name: 'AOI21 Complex Gate',
    category: 'complex',
    inputs: ['A', 'B', 'C'],
    outputs: ['Y'],
    truthTable: [
      { in: '000', out: '1' },
      { in: '001', out: '0' },
      { in: '010', out: '1' },
      { in: '011', out: '0' },
      { in: '100', out: '1' },
      { in: '101', out: '0' },
      { in: '110', out: '0' },
      { in: '111', out: '0' }
    ],
    booleanEq: 'Y = ((A · B) + C)\'',
    transistorCount: 6,
    punTopology: '(A parallel B) in series with C (3 PMOS)',
    pdnTopology: '(A series B) in parallel with C (3 NMOS)',
    delay65nm: 'Single-stage delay (~20-30 ps)',
    logicalEffortG: 1.33,
    description: 'And-Or-Invert 21 gate. 6 transistors vs 8-10 in discrete implementation. 30-50% area savings in ASIC standard cell libraries.',
    stickDiagramRules: 'Single demarcation line, shared diffusion between A and B in PDN.',
    applications: ['Multiplexers', 'Adder carry generation', 'Complex boolean reduction']
  },
  transmission_gate: {
    id: 'transmission_gate',
    name: 'CMOS Transmission Gate (T-Gate)',
    category: 'transmission_gate',
    inputs: ['A', 'CLK', 'CLK\''],
    outputs: ['B'],
    truthTable: [
      { in: 'X,0,1', out: 'Z (high impedance)' },
      { in: '0,1,0', out: '0' },
      { in: '1,1,0', out: '1' }
    ],
    booleanEq: 'A <-> B (when CLK=1, CLK\'=0)',
    transistorCount: 2,
    punTopology: '1 PMOS (controlled by CLK\') in parallel with 1 NMOS (controlled by CLK)',
    pdnTopology: '1 NMOS in parallel with 1 PMOS',
    delay65nm: 'R_on ~1-5 kΩ, full rail-to-rail 0 to VDD swing',
    logicalEffortG: 1.0,
    description: 'Bidirectional switch. NMOS passes 0 well (Vout=0), PMOS passes 1 well (Vout=VDD). Together provides zero voltage degradation.',
    stickDiagramRules: 'Parallel diffusion connection between source A and drain B.',
    applications: ['Multiplexers (2:1 MUX = 6T)', 'Transparent Latches', 'Tri-state buffers', 'Switched-capacitor circuits']
  },
  dff_masterslave: {
    id: 'dff_masterslave',
    name: 'Master-Slave Edge-Triggered D Flip-Flop',
    category: 'sequential',
    inputs: ['D', 'CLK'],
    outputs: ['Q'],
    truthTable: [
      { in: '0, ↑', out: '0' },
      { in: '1, ↑', out: '1' },
      { in: 'X, 0', out: 'Q (hold)' },
      { in: 'X, 1', out: 'Q (hold)' }
    ],
    booleanEq: 'Q(t+1) = D (sampled on rising CLK edge ↑)',
    transistorCount: 20,
    punTopology: '2 Transmission Gate D-Latches (Master + Slave) with inverted clock trees',
    pdnTopology: 'Master samples on CLK=0 (TG1 ON, TG2 OFF); Slave updates on CLK=1 (TG3 ON, TG4 OFF)',
    delay65nm: 't_setup ~10-20 ps, t_hold ~5-10 ps, t_clk-to-Q ~20-35 ps',
    logicalEffortG: 2.0,
    description: 'Backbone of synchronous digital VLSI pipelines. Master latch is transparent when CLK=0; Slave latch updates Q on CLK=1.',
    stickDiagramRules: 'Dual latch layout with central clock inverter pair.',
    applications: ['Pipeline registers', 'Binary counters', 'Synchronous FSM state registers', 'Clock domain crossing synchronizers']
  }
};

export const TIMING_AND_POWER_FORMULAS = {
  elmoreDelay: 't_pd = 0.69 * R_eq * C_L',
  logicalEffort: 'd = f + p = g * h + p (where g = gate effort, h = C_out/C_in, p = parasitic delay)',
  dynamicPower: 'P_dyn = alpha * C_L * VDD^2 * f (alpha = activity factor ~0.1-0.5)',
  staticPower: 'P_static = VDD * I_leakage (Subthreshold + gate oxide leakage)',
  shortCircuitPower: 'P_sc = I_sc * VDD (current during switching when both PMOS & NMOS conduct)',
  setupConstraint: 't_clk_Q + t_pd_comb <= T_clk - t_setup',
  holdConstraint: 't_clk_Q + t_pd_comb >= t_hold',
  maxFrequency: 'f_max = 1 / (t_pd_comb + t_setup + t_clk_Q)',
  metastabilityMtbf: 'MTBF = e^(t_resolution / tau) / (f_data * f_clk)',
  claCarryEquation: 'C_(i+1) = G_i + P_i * C_i (where G_i = A_i * B_i, P_i = A_i ^ B_i)'
};

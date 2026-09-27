export interface DesignRule {
  id: string;
  title: string;
  description: string;
  category: 'methodology' | 'combinational' | 'sequential' | 'constraints' | 'cmos';
}

export const VLSI_DESIGN_RULES: DesignRule[] = [
  // Methodology
  {
    id: 'method_1',
    title: 'Specification',
    description: 'Define functionality, performance, power, area.',
    category: 'methodology'
  },
  {
    id: 'method_2',
    title: 'Architecture',
    description: 'Define system structure, data paths, and control logic.',
    category: 'methodology'
  },
  
  // Combinational
  {
    id: 'comb_1',
    title: 'Specification Analysis',
    description: 'Identify inputs (count, symbols, width) and outputs. Specify behavior via Truth Table.',
    category: 'combinational'
  },
  {
    id: 'comb_2',
    title: 'Truth Table Creation',
    description: 'List all 2^n input combinations in binary counting order. Determine outputs including don\'t cares (X).',
    category: 'combinational'
  },
  {
    id: 'comb_3',
    title: 'Boolean Expression Derivation',
    description: 'Use Sum of Products (SOP) or Product of Sums (POS). Determine minterms or maxterms.',
    category: 'combinational'
  },
  {
    id: 'comb_4',
    title: 'Boolean Simplification',
    description: 'Use Boolean algebra laws, K-maps (for up to 4-6 variables), or Quine-McCluskey (for >6 variables) to simplify expressions.',
    category: 'combinational'
  },
  
  // Sequential
  {
    id: 'seq_1',
    title: 'Define State Machine',
    description: 'Identify distinct states, inputs, and outputs. Choose FSM type (Moore or Mealy).',
    category: 'sequential'
  },
  {
    id: 'seq_2',
    title: 'State Diagram & Table',
    description: 'Draw states as circles, transitions as arrows. List Present State, Next State, and Outputs in a State Table.',
    category: 'sequential'
  },
  {
    id: 'seq_3',
    title: 'State Minimization',
    description: 'Identify and merge equivalent states (same output and transitions) using implication tables.',
    category: 'sequential'
  },
  {
    id: 'seq_4',
    title: 'State Encoding',
    description: 'Choose encoding: Binary (min area), One-hot (fast, simple decode), or Gray (low power).',
    category: 'sequential'
  },
  {
    id: 'seq_5',
    title: 'Flip-Flop Selection',
    description: 'Select D (simplest), JK (toggle/counters), T (binary counters), or SR (basic, avoid invalid state). Use excitation tables.',
    category: 'sequential'
  },
  
  // Constraints
  {
    id: 'const_1',
    title: 'Setup Time Constraint',
    description: 't_clk-Q + t_pd_comb <= T_clk - t_setup. Determines maximum clock frequency.',
    category: 'constraints'
  },
  {
    id: 'const_2',
    title: 'Hold Time Constraint',
    description: 't_clk-Q + t_pd_comb >= t_hold. Violation causes metastability.',
    category: 'constraints'
  },
  {
    id: 'const_3',
    title: 'Power Budget',
    description: 'Dynamic Power = alpha * C * V^2 * f. Static Power = V * I_leakage. Allocate budget to blocks.',
    category: 'constraints'
  },
  
  // CMOS
  {
    id: 'cmos_1',
    title: 'Complementary Structure',
    description: 'Every gate must have a PMOS Pull-Up Network (PUN) and NMOS Pull-Down Network (PDN).',
    category: 'cmos'
  },
  {
    id: 'cmos_2',
    title: 'Duality Principle',
    description: 'PUN and PDN are duals: Series in PDN <-> Parallel in PUN. AND in PDN <-> OR in PUN.',
    category: 'cmos'
  },
  {
    id: 'cmos_3',
    title: 'No Direct AND/OR',
    description: 'CMOS naturally implements inverting logic (NAND, NOR, NOT). AND/OR require an additional inverter stage.',
    category: 'cmos'
  }
];

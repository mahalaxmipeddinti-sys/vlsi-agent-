// Advanced Live Testing, Wafer Sort, and Physical Sign-off Engine for VLSI ASIC Flow

export interface WaferDie {
  id: number;
  row: number;
  col: number;
  xPct: number;
  yPct: number;
  status: 'untested' | 'testing' | 'pass_bin1' | 'pass_bin2' | 'fail_iddq' | 'fail_func' | 'fail_speed';
  fMaxMhz: number;
  iddqUa: number;
  irDropMv: number;
  slackPs: number;
  tempC: number;
}

export interface ShmooPoint {
  vdd: number;
  freqMhz: number;
  status: 'pass' | 'fail' | 'marginal';
  slackPs: number;
  dynamicPowerMw: number;
}

export interface SignoffDrcRule {
  id: string;
  name: string;
  category: 'DRC' | 'LVS' | 'ERC' | 'Antenna' | 'IR_EM';
  deck: string;
  tool: string;
  specLimit: string;
  measured: string;
  status: 'PASS' | 'VIOLATION';
  violationCoord?: { x: number; y: number; layer: string; desc: string };
}

export interface OscilloscopeChannel {
  name: string;
  color: string;
  signalType: 'clk' | 'data' | 'ctrl' | 'out';
  values: number[]; // 0 or 1 samples
}

// Generate circular wafer matrix of dies (300mm diameter approximation)
export function generateWaferDies(gridSize = 11): WaferDie[] {
  const dies: WaferDie[] = [];
  const radius = (gridSize - 1) / 2;
  const center = radius;
  let id = 1;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const dx = c - center;
      const dy = r - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only include dies within circular wafer boundary
      if (dist <= radius + 0.3) {
        // Yield edge effect: outer periphery dies have higher probability of defects
        const edgePenalty = dist / radius;
        const baseFmax = 1050 - Math.round(edgePenalty * 180 + (Math.sin(id * 7) * 40));
        const baseIddq = +(1.8 + Math.pow(edgePenalty, 2) * 5.5 + Math.abs(Math.sin(id * 11) * 3)).toFixed(1);
        const baseSlack = Math.round(280 - edgePenalty * 90);

        dies.push({
          id: id++,
          row: r,
          col: c,
          xPct: (c / (gridSize - 1)) * 82 + 9,
          yPct: (r / (gridSize - 1)) * 82 + 9,
          status: 'untested',
          fMaxMhz: Math.max(650, baseFmax),
          iddqUa: baseIddq,
          irDropMv: +(14.2 + (id % 5) * 1.1).toFixed(1),
          slackPs: baseSlack,
          tempC: 25 + Math.round(edgePenalty * 12)
        });
      }
    }
  }

  return dies;
}

// Generate Shmoo Plot matrix: VDD vs Frequency
export function generateShmooMatrix(vddNominal = 1.0, freqNominalMhz = 800): ShmooPoint[] {
  const vddSteps = [0.65, 0.75, 0.85, 0.95, 1.05, 1.15, 1.25];
  const freqSteps = [300, 500, 700, 900, 1100, 1300, 1500];
  const matrix: ShmooPoint[] = [];

  for (const vdd of vddSteps) {
    for (const freq of freqSteps) {
      // Physical gate delay scaling: Delay ~ Vdd / (Vdd - Vth)^alpha
      // Higher voltage enables higher frequency; at low voltage, high frequency fails
      const maxCapableFreq = Math.round(180 + (vdd - 0.5) * 1650);
      const margin = maxCapableFreq - freq;

      let status: 'pass' | 'fail' | 'marginal' = 'fail';
      let slackPs = 0;

      if (margin > 120) {
        status = 'pass';
        slackPs = Math.round(margin * 0.45);
      } else if (margin >= -40) {
        status = 'marginal';
        slackPs = Math.round(margin * 0.35);
      } else {
        status = 'fail';
        slackPs = Math.round(margin * 0.5);
      }

      // Dynamic power: P = C * V^2 * f
      const dynamicPowerMw = +(0.012 * Math.pow(vdd, 2) * (freq / 100)).toFixed(2);

      matrix.push({
        vdd,
        freqMhz: freq,
        status,
        slackPs,
        dynamicPowerMw
      });
    }
  }

  return matrix;
}

// DUT Live Hardware Logic Evaluator
export function evaluateDutLogic(
  icId: string,
  inputs: Record<string, number>,
  prevOutput: Record<string, number> = {}
): Record<string, number> {
  const normId = (icId || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normId.includes('7476')) {
    // Dual JK Flip-Flop with Active-Low PRE and CLR
    // Active low preset/clear:
    const pre_n = inputs['1PRE_n'] ?? 1;
    const clr_n = inputs['1CLR_n'] ?? 1;
    const j = inputs['1J'] ?? 0;
    const k = inputs['1K'] ?? 0;
    let q = prevOutput['1Q'] ?? 0;

    if (pre_n === 0 && clr_n === 1) {
      q = 1;
    } else if (pre_n === 1 && clr_n === 0) {
      q = 0;
    } else if (pre_n === 0 && clr_n === 0) {
      q = 1; // Unstable standard TTL
    } else {
      // Normal synchronous operation on negative clock transition
      if (j === 0 && k === 0) {
        // Hold
      } else if (j === 0 && k === 1) {
        q = 0;
      } else if (j === 1 && k === 0) {
        q = 1;
      } else if (j === 1 && k === 1) {
        q = q === 1 ? 0 : 1;
      }
    }

    return {
      '1Q': q,
      '1Q_n': q === 1 ? 0 : 1,
      '2Q': inputs['2PRE_n'] === 0 ? 1 : 0,
      '2Q_n': inputs['2PRE_n'] === 0 ? 0 : 1
    };
  }

  if (normId.includes('74151')) {
    // 8-to-1 Multiplexer
    const s0 = inputs['S0'] ?? 0;
    const s1 = inputs['S1'] ?? 0;
    const s2 = inputs['S2'] ?? 0;
    const strobe_n = inputs['STROBE_n'] ?? 0;
    const sel = s0 + (s1 << 1) + (s2 << 2);

    const dValues = [
      inputs['D0'] ?? 1,
      inputs['D1'] ?? 0,
      inputs['D2'] ?? 1,
      inputs['D3'] ?? 1,
      inputs['D4'] ?? 0,
      inputs['D5'] ?? 1,
      inputs['D6'] ?? 0,
      inputs['D7'] ?? 1
    ];

    if (strobe_n === 1) {
      return { Y: 0, W: 1 };
    }
    const val = dValues[sel] ?? 0;
    return { Y: val, W: val === 1 ? 0 : 1 };
  }

  if (normId.includes('7400')) {
    // Quad 2-input NAND
    const a = inputs['1A'] ?? 1;
    const b = inputs['1B'] ?? 1;
    const y = a === 1 && b === 1 ? 0 : 1;
    return { '1Y': y, '2Y': 1, '3Y': 1, '4Y': 1 };
  }

  if (normId.includes('7404')) {
    // Hex Inverter
    const a = inputs['1A'] ?? 1;
    return { '1Y': a === 1 ? 0 : 1, '2Y': 0, '3Y': 1 };
  }

  if (normId.includes('74163')) {
    // 4-bit Synchronous Binary Counter
    let q = (prevOutput['Q'] ?? 0) & 0xf;
    const clr_n = inputs['CLR_n'] ?? 1;
    const load_n = inputs['LOAD_n'] ?? 1;
    const en = (inputs['ENP'] ?? 1) && (inputs['ENT'] ?? 1);

    if (clr_n === 0) {
      q = 0;
    } else if (load_n === 0) {
      q = ((inputs['D0'] ?? 0) | ((inputs['D1'] ?? 0) << 1) | ((inputs['D2'] ?? 0) << 2) | ((inputs['D3'] ?? 0) << 3)) & 0xf;
    } else if (en) {
      q = (q + 1) & 0xf;
    }

    return {
      'Q': q,
      'Q0': q & 1,
      'Q1': (q >> 1) & 1,
      'Q2': (q >> 2) & 1,
      'Q3': (q >> 3) & 1,
      'RCO': q === 15 && (inputs['ENT'] ?? 1) ? 1 : 0
    };
  }

  // Default fallback logic
  const inA = inputs['IN_A'] ?? 1;
  const inB = inputs['IN_B'] ?? 0;
  return { 'OUT_Y': inA ^ inB, 'FLAG_Z': inA & inB };
}

// Default Physical Verification Rules list
export function getInitialSignoffRules(icId: string, compName: string): SignoffDrcRule[] {
  return [
    {
      id: 'rule_drc_space',
      name: 'DRC: Minimum Metal Spacing (M1/M2/M3)',
      category: 'DRC',
      deck: 'SkyWater 130nm / FreePDK45 DRC Deck v3.2',
      tool: 'Magic VLSI / KLayout DRC Engine',
      specLimit: 'M1 Space ≥ 0.14µm • M2 Space ≥ 0.16µm',
      measured: 'Worst Spacing: 0.185µm (Safe margin +15.6%)',
      status: 'PASS'
    },
    {
      id: 'rule_drc_width',
      name: 'DRC: Minimum Wire Width & Via Enclosure',
      category: 'DRC',
      deck: 'TSMC/SkyWater Poly & Metal Density Deck',
      tool: 'KLayout DRC & Density Checker',
      specLimit: 'Via1 Enclosure ≥ 0.05µm • Density: 35-70%',
      measured: 'Via1 Enclosure: 0.072µm • Metal Density: 48.2%',
      status: 'PASS'
    },
    {
      id: 'rule_lvs_match',
      name: 'LVS: Layout Versus Schematic Equivalence',
      category: 'LVS',
      deck: 'SPICE Extracted Netlist vs Synthesized Gate Verilog',
      tool: 'Netgen / Siemens Calibre nmLVS',
      specLimit: '100% Instance, Net, and Port Matching',
      measured: '100.0% Matched • 0 Unmatched Nets • 0 Shorts/Opens',
      status: 'PASS'
    },
    {
      id: 'rule_erc_well',
      name: 'ERC: Substrate & N-Well Tap Spacing',
      category: 'ERC',
      deck: 'Latchup Prevention & Well Tie-off Deck',
      tool: 'Magic ERC Engine',
      specLimit: 'Max Tap Pitch < 30.0µm • 0 Floating Gates',
      measured: 'Max Tap Pitch: 24.5µm • 0 Floating Gates Detected',
      status: 'PASS'
    },
    {
      id: 'rule_antenna',
      name: 'Antenna: Plasma Etching Gate Oxide Ratio',
      category: 'Antenna',
      deck: 'Metal Antenna Accumulation Ratio Rules',
      tool: 'OpenROAD FastRoute Antenna Flow',
      specLimit: 'Cumulative Antenna Ratio < 400.0:1',
      measured: 'Worst Net Antenna Ratio: 172.4:1 (Zero Diodes Needed)',
      status: 'PASS'
    },
    {
      id: 'rule_ir_em',
      name: 'IR Drop & Electromigration (EM) Reliability',
      category: 'IR_EM',
      deck: 'Static & Dynamic PDN Mesh IR-Drop Deck',
      tool: 'OpenROAD PDN Analyzer / Ansys RedHawk',
      specLimit: 'Max IR Drop < 50mV (5% VDD) • EM Jmax < 1.2mA/µm²',
      measured: 'Max IR Drop: 16.8mV (1.68% of 1.0V) • Jmax: 0.42mA/µm²',
      status: 'PASS'
    }
  ];
}

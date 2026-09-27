import { 
  FloorplanConfig, 
  PowerPlanConfig, 
  MacroBlock, 
  IOPad, 
  IRDropNode, 
  PhysicalDRCError 
} from '../types/physicalDesign';
import { parseVerilog } from './verilogParser';

export function createDefaultFloorplan(verilogCode: string, icId?: string, compName?: string): FloorplanConfig {
  const parsed = parseVerilog(verilogCode);
  const normalizedId = (icId || '').toLowerCase().replace(/[^0-9a-z]/g, '');
  const moduleLower = (parsed.moduleName || '').toLowerCase();
  const codeLower = verilogCode.toLowerCase();

  // Determine design category
  const is7476 = normalizedId.includes('7476') || moduleLower.includes('7476') || (codeLower.includes('jk') && codeLower.includes('flip'));
  const is7400 = normalizedId.includes('7400') || moduleLower.includes('7400') || (codeLower.includes('nand') && !codeLower.includes('flip'));
  const is7402 = normalizedId.includes('7402') || moduleLower.includes('7402') || codeLower.includes('nor');
  const is7404 = normalizedId.includes('7404') || moduleLower.includes('7404') || (codeLower.includes('hex') && codeLower.includes('inv'));
  const is7474 = normalizedId.includes('7474') || moduleLower.includes('7474') || (codeLower.includes('dff') || (codeLower.includes('d_flip') && !is7476));
  const is74163 = normalizedId.includes('74163') || normalizedId.includes('74161') || moduleLower.includes('163') || moduleLower.includes('counter') || codeLower.includes('counter');
  const is74138 = normalizedId.includes('74138') || moduleLower.includes('138') || codeLower.includes('decoder');
  const is74151 = normalizedId.includes('74151') || moduleLower.includes('151') || codeLower.includes('mux') || codeLower.includes('multiplexer');
  const is7483 = normalizedId.includes('7483') || normalizedId.includes('74283') || moduleLower.includes('adder') || codeLower.includes('adder');
  const isAlu = normalizedId.includes('alu') || moduleLower.includes('alu') || codeLower.includes('alu');

  // Die Size scaling based on design complexity
  let dieWidth = 800;
  let dieHeight = 800;
  if (is7400 || is7402 || is7404) {
    dieWidth = 520;
    dieHeight = 520;
  } else if (is7476 || is7474) {
    dieWidth = 580;
    dieHeight = 580;
  } else if (is74163 || is74138 || is74151 || is7483) {
    dieWidth = 660;
    dieHeight = 660;
  }

  const coreMarginLeft = 45;
  const coreMarginRight = 45;
  const coreMarginTop = 45;
  const coreMarginBottom = 45;
  const coreWidth = dieWidth - coreMarginLeft - coreMarginRight;
  const coreHeight = dieHeight - coreMarginTop - coreMarginBottom;

  // 1. Generate I/O Pads around perimeter
  const ioPads: IOPad[] = [];
  const padW = 24;
  const padH = 38;

  // Add VDD/VSS Corner & Periphery Pads
  ioPads.push({ id: 'pad_vdd_1', name: 'VDD_1', type: 'power', side: 'top', offset: 40, width: padW, height: padH });
  ioPads.push({ id: 'pad_vss_1', name: 'VSS_1', type: 'ground', side: 'top', offset: dieWidth - 80, width: padW, height: padH });
  ioPads.push({ id: 'pad_vdd_2', name: 'VDD_2', type: 'power', side: 'bottom', offset: 40, width: padW, height: padH });
  ioPads.push({ id: 'pad_vss_2', name: 'VSS_2', type: 'ground', side: 'bottom', offset: dieWidth - 80, width: padW, height: padH });

  // Use parsed inputs & outputs, or standard package pinout if ports are few
  let inputsList = parsed.inputs;
  let outputsList = parsed.outputs;

  if (inputsList.length === 0 && outputsList.length === 0) {
    if (is7476) {
      inputsList = [{ name: '1CLK', width: '' }, { name: '1PRE_N', width: '' }, { name: '1CLR_N', width: '' }, { name: '1J', width: '' }, { name: '1K', width: '' }, { name: '2CLK', width: '' }, { name: '2PRE_N', width: '' }, { name: '2CLR_N', width: '' }, { name: '2J', width: '' }, { name: '2K', width: '' }];
      outputsList = [{ name: '1Q', width: '' }, { name: '1Q_N', width: '' }, { name: '2Q', width: '' }, { name: '2Q_N', width: '' }];
    } else if (is7400) {
      inputsList = [{ name: '1A', width: '' }, { name: '1B', width: '' }, { name: '2A', width: '' }, { name: '2B', width: '' }, { name: '3A', width: '' }, { name: '3B', width: '' }, { name: '4A', width: '' }, { name: '4B', width: '' }];
      outputsList = [{ name: '1Y', width: '' }, { name: '2Y', width: '' }, { name: '3Y', width: '' }, { name: '4Y', width: '' }];
    }
  }

  // Distribute Inputs along Left and Top
  let leftOffset = 80;
  let topOffset = 110;
  inputsList.forEach((inp) => {
    const isClock = inp.name.toLowerCase().includes('clk') || inp.name.toLowerCase().includes('clock');
    const isCtrl = inp.name.toLowerCase().includes('rst') || inp.name.toLowerCase().includes('clr') || inp.name.toLowerCase().includes('pre') || inp.name.toLowerCase().includes('en') || inp.name.toLowerCase().includes('load');
    
    if (isClock || (isCtrl && topOffset < dieWidth - 120)) {
      ioPads.push({
        id: `pad_${inp.name}`,
        name: inp.width ? `${inp.name}${inp.width}` : inp.name,
        type: isClock ? 'clock' : 'input',
        side: 'top',
        offset: topOffset,
        width: padW,
        height: padH
      });
      topOffset += 42;
    } else {
      ioPads.push({
        id: `pad_${inp.name}`,
        name: inp.width ? `${inp.name}${inp.width}` : inp.name,
        type: 'input',
        side: 'left',
        offset: Math.min(leftOffset, dieHeight - 90),
        width: padW,
        height: padH
      });
      leftOffset += 40;
    }
  });

  // Distribute Outputs along Right and Bottom
  let rightOffset = 80;
  let bottomOffset = 110;
  outputsList.forEach((out) => {
    const isFlag = out.name.toLowerCase().includes('flag') || out.name.toLowerCase().includes('zero') || out.name.toLowerCase().includes('carry') || out.name.toLowerCase().includes('rco') || out.name.toLowerCase().includes('err');
    if (isFlag && bottomOffset < dieWidth - 120) {
      ioPads.push({
        id: `pad_${out.name}`,
        name: out.width ? `${out.name}${out.width}` : out.name,
        type: 'output',
        side: 'bottom',
        offset: bottomOffset,
        width: padW,
        height: padH
      });
      bottomOffset += 42;
    } else {
      ioPads.push({
        id: `pad_${out.name}`,
        name: out.width ? `${out.name}${out.width}` : out.name,
        type: 'output',
        side: 'right',
        offset: Math.min(rightOffset, dieHeight - 90),
        width: padW,
        height: padH
      });
      rightOffset += 40;
    }
  });

  // 2. Generate Functional Hierarchical Macros specifically tailored to the active component
  let macros: MacroBlock[] = [];

  if (is7476) {
    macros = [
      {
        id: 'macro_jk1',
        name: 'JK_FF_CORE_1',
        type: 'regfile',
        x: 40,
        y: 40,
        width: 190,
        height: 180,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: '1CLK', relX: 0.5, relY: 0, type: 'clock' },
          { name: '1J', relX: 0, relY: 0.35, type: 'input' },
          { name: '1K', relX: 0, relY: 0.65, type: 'input' },
          { name: '1PRE_N', relX: 0.2, relY: 0, type: 'input' },
          { name: '1CLR_N', relX: 0.8, relY: 0, type: 'input' },
          { name: '1Q', relX: 1, relY: 0.35, type: 'output' },
          { name: '1Q_N', relX: 1, relY: 0.65, type: 'output' }
        ],
        connectedPadIds: ioPads.slice(0, 5).map(p => p.id)
      },
      {
        id: 'macro_jk2',
        name: 'JK_FF_CORE_2',
        type: 'regfile',
        x: coreWidth - 230,
        y: 40,
        width: 190,
        height: 180,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: '2CLK', relX: 0.5, relY: 0, type: 'clock' },
          { name: '2J', relX: 0, relY: 0.35, type: 'input' },
          { name: '2K', relX: 0, relY: 0.65, type: 'input' },
          { name: '2PRE_N', relX: 0.2, relY: 0, type: 'input' },
          { name: '2CLR_N', relX: 0.8, relY: 0, type: 'input' },
          { name: '2Q', relX: 1, relY: 0.35, type: 'output' },
          { name: '2Q_N', relX: 1, relY: 0.65, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_async_ctrl',
        name: 'ASYNC_PRE_CLR_CTRL',
        type: 'custom',
        x: 40,
        y: coreHeight - 220,
        width: 180,
        height: 170,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: 'PRE_RAW', relX: 0, relY: 0.4, type: 'input' },
          { name: 'CLR_RAW', relX: 0, relY: 0.7, type: 'input' },
          { name: 'OVERRIDE_OUT', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_clk_shaper',
        name: 'CLK_PULSE_SHAPER',
        type: 'custom',
        x: coreWidth - 230,
        y: coreHeight - 220,
        width: 180,
        height: 170,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: 'CLK_IN', relX: 0.5, relY: 0, type: 'clock' },
          { name: 'CLK_PULSE', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      }
    ];
  } else if (is7400) {
    macros = [
      {
        id: 'macro_nand1',
        name: 'NAND_GATE_A',
        type: 'custom',
        x: 35,
        y: 35,
        width: 170,
        height: 160,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: '1A', relX: 0, relY: 0.35, type: 'input' },
          { name: '1B', relX: 0, relY: 0.65, type: 'input' },
          { name: '1Y', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_nand2',
        name: 'NAND_GATE_B',
        type: 'custom',
        x: coreWidth - 205,
        y: 35,
        width: 170,
        height: 160,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: '2A', relX: 0, relY: 0.35, type: 'input' },
          { name: '2B', relX: 0, relY: 0.65, type: 'input' },
          { name: '2Y', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_nand3',
        name: 'NAND_GATE_C',
        type: 'custom',
        x: 35,
        y: coreHeight - 195,
        width: 170,
        height: 160,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: '3A', relX: 0, relY: 0.35, type: 'input' },
          { name: '3B', relX: 0, relY: 0.65, type: 'input' },
          { name: '3Y', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_nand4',
        name: 'NAND_GATE_D',
        type: 'custom',
        x: coreWidth - 205,
        y: coreHeight - 195,
        width: 170,
        height: 160,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: '4A', relX: 0, relY: 0.35, type: 'input' },
          { name: '4B', relX: 0, relY: 0.65, type: 'input' },
          { name: '4Y', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      }
    ];
  } else if (is7404) {
    macros = [
      {
        id: 'macro_inv_abc',
        name: 'INV_BANK_A_B_C',
        type: 'custom',
        x: 40,
        y: 40,
        width: 180,
        height: 280,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: '1A', relX: 0, relY: 0.2, type: 'input' },
          { name: '1Y', relX: 1, relY: 0.2, type: 'output' },
          { name: '2A', relX: 0, relY: 0.5, type: 'input' },
          { name: '2Y', relX: 1, relY: 0.5, type: 'output' },
          { name: '3A', relX: 0, relY: 0.8, type: 'input' },
          { name: '3Y', relX: 1, relY: 0.8, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_inv_def',
        name: 'INV_BANK_D_E_F',
        type: 'custom',
        x: coreWidth - 220,
        y: 40,
        width: 180,
        height: 280,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: '4A', relX: 0, relY: 0.2, type: 'input' },
          { name: '4Y', relX: 1, relY: 0.2, type: 'output' },
          { name: '5A', relX: 0, relY: 0.5, type: 'input' },
          { name: '5Y', relX: 1, relY: 0.5, type: 'output' },
          { name: '6A', relX: 0, relY: 0.8, type: 'input' },
          { name: '6Y', relX: 1, relY: 0.8, type: 'output' }
        ],
        connectedPadIds: []
      }
    ];
  } else if (is74163) {
    macros = [
      {
        id: 'macro_counter_regs',
        name: 'COUNTER_4BIT_REGS',
        type: 'regfile',
        x: 45,
        y: 45,
        width: 230,
        height: 210,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'CLK', relX: 0.5, relY: 0, type: 'clock' },
          { name: 'CLR_N', relX: 0.15, relY: 0, type: 'input' },
          { name: 'D[3:0]', relX: 0, relY: 0.5, type: 'input' },
          { name: 'Q[3:0]', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_lookahead_carry',
        name: 'CARRY_LOOKAHEAD_GEN',
        type: 'alu',
        x: coreWidth - 275,
        y: 45,
        width: 230,
        height: 210,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'ENP', relX: 0, relY: 0.3, type: 'input' },
          { name: 'ENT', relX: 0, relY: 0.6, type: 'input' },
          { name: 'Q[3:0]', relX: 0, relY: 0.8, type: 'input' },
          { name: 'RCO', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_sync_load',
        name: 'SYNC_LOAD_MUX_BANK',
        type: 'custom',
        x: 45,
        y: coreHeight - 250,
        width: 230,
        height: 200,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'LOAD_N', relX: 0, relY: 0.5, type: 'input' },
          { name: 'NEXT_COUNT', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_rco_stage',
        name: 'RCO_OUTPUT_STAGE',
        type: 'custom',
        x: coreWidth - 275,
        y: coreHeight - 250,
        width: 230,
        height: 200,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'CARRY_IN', relX: 0, relY: 0.5, type: 'input' },
          { name: 'RCO_PAD', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      }
    ];
  } else if (is74138) {
    macros = [
      {
        id: 'macro_en_matrix',
        name: 'ENABLE_LOGIC_MATRIX',
        type: 'custom',
        x: 45,
        y: 45,
        width: 220,
        height: 210,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'G1', relX: 0, relY: 0.25, type: 'input' },
          { name: 'G2A_N', relX: 0, relY: 0.5, type: 'input' },
          { name: 'G2B_N', relX: 0, relY: 0.75, type: 'input' },
          { name: 'CHIP_EN', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_dec_low',
        name: '3TO8_DECODE_TREE_LOW',
        type: 'custom',
        x: coreWidth - 265,
        y: 45,
        width: 220,
        height: 210,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'A[2:0]', relX: 0, relY: 0.5, type: 'input' },
          { name: 'Y[3:0]_N', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_dec_high',
        name: '3TO8_DECODE_TREE_HIGH',
        type: 'custom',
        x: coreWidth - 265,
        y: coreHeight - 250,
        width: 220,
        height: 200,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'A[2:0]', relX: 0, relY: 0.5, type: 'input' },
          { name: 'Y[7:4]_N', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      }
    ];
  } else if (isAlu) {
    macros = [
      {
        id: 'macro_adder',
        name: 'ADDER_SUB_UNIT',
        type: 'alu',
        x: 60,
        y: 60,
        width: 220,
        height: 180,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'A[3:0]', relX: 0, relY: 0.3, type: 'input' },
          { name: 'B[3:0]', relX: 0, relY: 0.7, type: 'input' },
          { name: 'SUM[3:0]', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: ioPads.slice(0, 3).map(p => p.id)
      },
      {
        id: 'macro_shifter',
        name: 'BARREL_SHIFTER',
        type: 'shifter',
        x: 60,
        y: coreHeight - 250,
        width: 200,
        height: 190,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'IN[3:0]', relX: 0, relY: 0.5, type: 'input' },
          { name: 'OUT[3:0]', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_logic',
        name: 'BOOLEAN_LOGIC_UNIT',
        type: 'custom',
        x: coreWidth - 260,
        y: 60,
        width: 210,
        height: 170,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'A', relX: 0, relY: 0.4, type: 'input' },
          { name: 'B', relX: 0, relY: 0.8, type: 'input' },
          { name: 'LOGIC_OUT', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      },
      {
        id: 'macro_regfile',
        name: 'REGISTER_BANK',
        type: 'regfile',
        x: coreWidth - 280,
        y: coreHeight - 260,
        width: 230,
        height: 220,
        halo: 12,
        orientation: 'R0',
        pins: [
          { name: 'CLK', relX: 0.5, relY: 0, type: 'clock' },
          { name: 'DIN[3:0]', relX: 0, relY: 0.5, type: 'input' },
          { name: 'DOUT[3:0]', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      }
    ];
  } else {
    // Dynamic synthesis of macros based on parsed ports or module functions
    const blockNames = parsed.submodules.length > 0
      ? parsed.submodules.map(s => s.instanceName.toUpperCase())
      : [`${parsed.moduleName.toUpperCase()}_CORE`, 'DATAPATH_MATRIX', 'CONTROL_LOGIC', 'IO_BUFFER_RING'];

    const positions = [
      { x: 45, y: 45, w: 210, h: 180, type: 'alu' as const },
      { x: coreWidth - 255, y: 45, w: 210, h: 180, type: 'control' as const },
      { x: 45, y: coreHeight - 225, w: 210, h: 180, type: 'regfile' as const },
      { x: coreWidth - 255, y: coreHeight - 225, w: 210, h: 180, type: 'sram' as const }
    ];

    macros = blockNames.slice(0, 4).map((name, i) => {
      const pos = positions[i % positions.length];
      return {
        id: `macro_${i}`,
        name,
        type: pos.type,
        x: pos.x,
        y: pos.y,
        width: pos.w,
        height: pos.h,
        halo: 10,
        orientation: 'R0',
        pins: [
          { name: 'IN', relX: 0, relY: 0.5, type: 'input' },
          { name: 'OUT', relX: 1, relY: 0.5, type: 'output' }
        ],
        connectedPadIds: []
      };
    });
  }

  return {
    dieWidth,
    dieHeight,
    coreMarginLeft,
    coreMarginRight,
    coreMarginTop,
    coreMarginBottom,
    targetUtilization: 0.65,
    stdCellRowHeight: 4.0,
    macros,
    ioPads
  };
}

export function createDefaultPowerPlan(floorplan?: FloorplanConfig): PowerPlanConfig {
  const dieW = floorplan ? floorplan.dieWidth : 800;
  const isSmallChip = dieW <= 600;

  return {
    supplyVoltage: 1.0, // 1.0 V
    corePowerNets: { vdd: 'VDD', vss: 'VSS' },
    
    // Power Rings
    enableRings: true,
    ringWidth: isSmallChip ? 10 : 14,
    ringSpacing: isSmallChip ? 4 : 5,
    ringOffset: isSmallChip ? 8 : 10,
    ringLayerH: 'M5',
    ringLayerV: 'M6',

    // Global Power Straps
    enableVStraps: true,
    vStrapWidth: isSmallChip ? 6 : 8,
    vStrapPitch: isSmallChip ? 60 : 80,
    vStrapOffset: isSmallChip ? 25 : 35,
    vStrapLayer: 'M6',

    enableHStraps: true,
    hStrapWidth: isSmallChip ? 6 : 8,
    hStrapPitch: isSmallChip ? 60 : 80,
    hStrapOffset: isSmallChip ? 25 : 35,
    hStrapLayer: 'M7',

    // Standard Cell Rails
    enableRails: true,
    railWidth: 0.9,      // 0.9 µm
    railPitch: 4.0,      // standard cell height
    railLayer: 'M1',

    // Pad-to-Core Feeder Trunks
    enablePadTrunks: true,
    trunkWidth: isSmallChip ? 8 : 10,
    trunkCountPerSide: isSmallChip ? 3 : 4,
    trunkLayer: 'M7',

    // Electrical Specs
    sheetResistanceMohm: 40,
    coreCurrentMa: isSmallChip ? 45 : 150,
    maxIRDropTargetPercent: 5.0
  };
}

// DRC Checker for Floorplan
export function checkFloorplanDRC(fp: FloorplanConfig): PhysicalDRCError[] {
  const errors: PhysicalDRCError[] = [];
  const coreW = fp.dieWidth - fp.coreMarginLeft - fp.coreMarginRight;
  const coreH = fp.dieHeight - fp.coreMarginTop - fp.coreMarginBottom;

  // 1. Out of Bounds Check
  fp.macros.forEach(macro => {
    if (macro.x < 0 || macro.y < 0 || (macro.x + macro.width) > coreW || (macro.y + macro.height) > coreH) {
      errors.push({
        id: `drc_ooc_${macro.id}`,
        type: 'OUT_OF_CORE',
        severity: 'error',
        message: `Macro "${macro.name}" exceeds Core Boundary boundaries (${macro.width}x${macro.height} at [${macro.x}, ${macro.y}] vs Core ${coreW}x${coreH}).`,
        macroIds: [macro.id]
      });
    }
  });

  // 2. Macro Overlap & Halo Violations Check
  for (let i = 0; i < fp.macros.length; i++) {
    for (let j = i + 1; j < fp.macros.length; j++) {
      const m1 = fp.macros[i];
      const m2 = fp.macros[j];

      // Physical Overlap
      const overlapX = Math.max(0, Math.min(m1.x + m1.width, m2.x + m2.width) - Math.max(m1.x, m2.x));
      const overlapY = Math.max(0, Math.min(m1.y + m1.height, m2.y + m2.height) - Math.max(m1.y, m2.y));

      if (overlapX > 0 && overlapY > 0) {
        errors.push({
          id: `drc_ol_${m1.id}_${m2.id}`,
          type: 'MACRO_OVERLAP',
          severity: 'error',
          message: `Fatal DRC Overlap: "${m1.name}" and "${m2.name}" overlap by ${overlapX}µm × ${overlapY}µm.`,
          macroIds: [m1.id, m2.id]
        });
      } else {
        // Halo Clearance Check
        const totalHalo = m1.halo + m2.halo;
        const distX = Math.max(0, Math.max(m1.x, m2.x) - Math.min(m1.x + m1.width, m2.x + m2.width));
        const distY = Math.max(0, Math.max(m1.y, m2.y) - Math.min(m1.y + m1.height, m2.y + m2.height));
        
        if (distX < totalHalo && distY < totalHalo && (distX > 0 || distY > 0)) {
          errors.push({
            id: `drc_halo_${m1.id}_${m2.id}`,
            type: 'HALO_VIOLATION',
            severity: 'warning',
            message: `Placement Halo Warning: Spacing between "${m1.name}" and "${m2.name}" is ${Math.min(distX, distY)}µm (minimum required: ${totalHalo}µm).`,
            macroIds: [m1.id, m2.id]
          });
        }
      }
    }
  }

  // 3. Core Utilization Check
  const totalCoreArea = coreW * coreH;
  const macroArea = fp.macros.reduce((acc, m) => acc + (m.width * m.height), 0);
  const macroUtil = macroArea / totalCoreArea;

  if (macroUtil > 0.65) {
    errors.push({
      id: `drc_util_${Date.now()}`,
      type: 'ROUTABILITY',
      severity: 'warning',
      message: `Macro area utilization is high (${(macroUtil * 100).toFixed(1)}%). Routing channels for standard cells may become congested.`,
    });
  }

  return errors;
}

// Auto Floorplan Optimizer (Arranges macros neatly around corners)
export function autoArrangeMacros(fp: FloorplanConfig): FloorplanConfig {
  const coreW = fp.dieWidth - fp.coreMarginLeft - fp.coreMarginRight;
  const coreH = fp.dieHeight - fp.coreMarginTop - fp.coreMarginBottom;
  const margin = 20;

  const updatedMacros = fp.macros.map((m, index) => {
    let newX = m.x;
    let newY = m.y;

    if (index === 0) {
      // Top-Left
      newX = margin;
      newY = margin;
    } else if (index === 1) {
      // Top-Right
      newX = coreW - m.width - margin;
      newY = margin;
    } else if (index === 2) {
      // Bottom-Left
      newX = margin;
      newY = coreH - m.height - margin;
    } else if (index === 3) {
      // Bottom-Right
      newX = coreW - m.width - margin;
      newY = coreH - m.height - margin;
    } else {
      // Along perimeter
      newX = margin + (index * 40) % (coreW - m.width - margin * 2);
      newY = margin + (index * 60) % (coreH - m.height - margin * 2);
    }

    return {
      ...m,
      x: Math.max(0, Math.min(newX, coreW - m.width)),
      y: Math.max(0, Math.min(newY, coreH - m.height))
    };
  });

  return {
    ...fp,
    macros: updatedMacros
  };
}

// Finite Grid IR-Drop Simulator
export function simulatePowerGrid(fp: FloorplanConfig, pp: PowerPlanConfig): {
  nodes: IRDropNode[];
  maxDropMv: number;
  maxDropPercent: number;
  avgDropMv: number;
  isDrcPass: boolean;
  vStrapCoords: number[];
  hStrapCoords: number[];
} {
  const coreW = fp.dieWidth - fp.coreMarginLeft - fp.coreMarginRight;
  const coreH = fp.dieHeight - fp.coreMarginTop - fp.coreMarginBottom;

  // 1. Calculate Vertical and Horizontal Strap Coordinates
  const vStrapCoords: number[] = [];
  if (pp.enableVStraps && pp.vStrapPitch > 0) {
    for (let x = pp.vStrapOffset; x < coreW; x += pp.vStrapPitch) {
      vStrapCoords.push(x);
    }
  }

  const hStrapCoords: number[] = [];
  if (pp.enableHStraps && pp.hStrapPitch > 0) {
    for (let y = pp.hStrapOffset; y < coreH; y += pp.hStrapPitch) {
      hStrapCoords.push(y);
    }
  }

  // 2. Discretize Core into 20x20 mesh
  const GRID_RES = 20;
  const stepX = coreW / (GRID_RES - 1);
  const stepY = coreH / (GRID_RES - 1);
  const nodes: IRDropNode[] = [];

  let maxDrop = 0;
  let sumDrop = 0;

  // Resistance factor based on sheet resistance and strap density
  const strapDensityX = (vStrapCoords.length * pp.vStrapWidth) / coreW;
  const strapDensityY = (hStrapCoords.length * pp.hStrapWidth) / coreH;
  const meshConductance = (strapDensityX + strapDensityY + 0.05) * 12; // normalized conductance
  const baseResistance = (pp.sheetResistanceMohm / 1000) / (meshConductance + 0.001);

  for (let gy = 0; gy < GRID_RES; gy++) {
    const y = gy * stepY;
    for (let gx = 0; gx < GRID_RES; gx++) {
      const x = gx * stepX;

      // Distance to nearest perimeter ring
      const distToRing = Math.min(x, coreW - x, y, coreH - y);

      // Distance to nearest vertical strap
      let minVStrapDist = coreW;
      for (const sx of vStrapCoords) {
        minVStrapDist = Math.min(minVStrapDist, Math.abs(x - sx));
      }

      // Distance to nearest horizontal strap
      let minHStrapDist = coreH;
      for (const sy of hStrapCoords) {
        minHStrapDist = Math.min(minHStrapDist, Math.abs(y - sy));
      }

      const effectiveStrapDist = Math.min(minVStrapDist, minHStrapDist);

      // Current draw at this location: macros draw more current
      let localCurrentScale = 1.0;
      for (const m of fp.macros) {
        if (x >= m.x && x <= m.x + m.width && y >= m.y && y <= m.y + m.height) {
          localCurrentScale = m.type === 'alu' ? 2.2 : (m.type === 'sram' ? 1.8 : 1.4);
          break;
        }
      }

      // IR Drop formula modeled after 2D Poisson diffusion:
      // Drop increases with distance from core ring, distance to power straps, and local current
      const ringDrop = (distToRing / (coreW * 0.5)) * 0.028;
      const strapDrop = (effectiveStrapDist / 50) * 0.015;
      const dropVolts = Math.min(0.12, (ringDrop + strapDrop) * localCurrentScale * (baseResistance * 15));
      const voltage = Math.max(0.85, pp.supplyVoltage - dropVolts);
      const dropPercent = (dropVolts / pp.supplyVoltage) * 100;
      const currentDensity = (dropVolts / (baseResistance + 0.01)) * 0.8;

      if (dropVolts > maxDrop) {
        maxDrop = dropVolts;
      }
      sumDrop += dropVolts;

      nodes.push({
        x,
        y,
        voltage,
        dropPercent,
        currentDensity
      });
    }
  }

  const maxDropMv = maxDrop * 1000;
  const maxDropPercent = (maxDrop / pp.supplyVoltage) * 100;
  const avgDropMv = (sumDrop / nodes.length) * 1000;
  const isDrcPass = maxDropPercent <= pp.maxIRDropTargetPercent;

  return {
    nodes,
    maxDropMv,
    maxDropPercent,
    avgDropMv,
    isDrcPass,
    vStrapCoords,
    hStrapCoords
  };
}

// TCL / EDA Script Exporters
export function generateOpenRoadFloorplanTcl(fp: FloorplanConfig, pp: PowerPlanConfig): string {
  const coreW = fp.dieWidth - fp.coreMarginLeft - fp.coreMarginRight;
  const coreH = fp.dieHeight - fp.coreMarginTop - fp.coreMarginBottom;

  return `# ==============================================================================
# OpenROAD Floorplan & Power Distribution Network (PDN) Script
# Generated automatically by VLSI Physical Design Studio
# ==============================================================================

# 1. Initialize Floorplan
initialize_floorplan \\
  -die_area "0 0 ${fp.dieWidth} ${fp.dieHeight}" \\
  -core_area "${fp.coreMarginLeft} ${fp.coreMarginBottom} ${fp.dieWidth - fp.coreMarginRight} ${fp.dieHeight - fp.coreMarginTop}" \\
  -site unithd

# 2. Place Hierarchical Macros
${fp.macros.map(m => `place_cell -inst_name "${m.name}" -origin "${fp.coreMarginLeft + m.x} ${fp.coreMarginBottom + m.y}" -orient ${m.orientation}`).join('\n')}

# 3. Apply Placement Halos around Macros
${fp.macros.map(m => `add_macro_halo -inst "${m.name}" -halo_x ${m.halo} -halo_y ${m.halo}`).join('\n')}

# 4. Standard Cell Tracks & Rows
make_tracks
create_voltage_domain -name CORE -power ${pp.corePowerNets.vdd} -ground ${pp.corePowerNets.vss}

# ==============================================================================
# 5. PDN Power Grid Generation (Rings, Straps & Rails)
# ==============================================================================

# Define Core Power Ring
${pp.enableRings ? `define_pdn_grid -name core_ring -voltage_domain CORE
add_pdn_ring -grid core_ring \\
  -layers "${pp.ringLayerH} ${pp.ringLayerV}" \\
  -widths "${pp.ringWidth} ${pp.ringWidth}" \\
  -spacings "${pp.ringSpacing} ${pp.ringSpacing}" \\
  -core_offset "${pp.ringOffset} ${pp.ringOffset}"` : '# Rings disabled'}

# Define Power Straps / Stripes
${pp.enableVStraps ? `add_pdn_stripe -grid core_ring \\
  -layer ${pp.vStrapLayer} \\
  -width ${pp.vStrapWidth} \\
  -pitch ${pp.vStrapPitch} \\
  -offset ${pp.vStrapOffset} \\
  -starts_with POWER` : ''}

${pp.enableHStraps ? `add_pdn_stripe -grid core_ring \\
  -layer ${pp.hStrapLayer} \\
  -width ${pp.hStrapWidth} \\
  -pitch ${pp.hStrapPitch} \\
  -offset ${pp.hStrapOffset} \\
  -starts_with GROUND` : ''}

# Standard Cell Followpin Rails
${pp.enableRails ? `add_pdn_stripe -grid core_ring \\
  -layer ${pp.railLayer} \\
  -width ${pp.railWidth} \\
  -followpins` : ''}

# Connect Vias between layers
add_pdn_connect -grid core_ring -layers "${pp.railLayer} ${pp.vStrapLayer}"
add_pdn_connect -grid core_ring -layers "${pp.vStrapLayer} ${pp.hStrapLayer}"

# Build the Power Grid
pdngen
puts "PDN and Floorplan Generation Completed Successfully!"
`;
}

export function generateInnovusTcl(fp: FloorplanConfig, pp: PowerPlanConfig): string {
  return `# Cadence Innovus Floorplan & Power Planning Script
setDesignMode -process 7

# Initialize Floorplan
floorPlan -site CoreSite -r 1.0 ${fp.targetUtilization} ${fp.coreMarginLeft} ${fp.coreMarginBottom} ${fp.coreMarginRight} ${fp.coreMarginTop}

# Add Power Rings
${pp.enableRings ? `addRing -nets {${pp.corePowerNets.vdd} ${pp.corePowerNets.vss}} \\
  -type core_rings \\
  -layer {top ${pp.ringLayerH} bottom ${pp.ringLayerH} left ${pp.ringLayerV} right ${pp.ringLayerV}} \\
  -width {top ${pp.ringWidth} bottom ${pp.ringWidth} left ${pp.ringWidth} right ${pp.ringWidth}} \\
  -spacing {top ${pp.ringSpacing} bottom ${pp.ringSpacing} left ${pp.ringSpacing} right ${pp.ringSpacing}} \\
  -offset {top ${pp.ringOffset} bottom ${pp.ringOffset} left ${pp.ringOffset} right ${pp.ringOffset}}` : ''}

# Add Global Power Stripes
${pp.enableVStraps ? `addStripe -nets {${pp.corePowerNets.vdd} ${pp.corePowerNets.vss}} \\
  -layer ${pp.vStrapLayer} \\
  -direction vertical \\
  -width ${pp.vStrapWidth} \\
  -spacing ${pp.ringSpacing} \\
  -set_to_set_distance ${pp.vStrapPitch} \\
  -start_offset ${pp.vStrapOffset}` : ''}

# Connect Standard Cell Followpins
${pp.enableRails ? `sroute -connect { corePin } -layerChangeRange { ${pp.railLayer} ${pp.hStrapLayer} } -corePinTarget { firstSlice }` : ''}
`;
}

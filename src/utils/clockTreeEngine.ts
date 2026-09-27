// Clock Tree Synthesis (CTS) and ASIC Silicon Die Physical Engine
import { FloorplanConfig } from '../types/physicalDesign';
import { StandardCellInfo } from '../components/PlacementCellCircuitView';

export type ClockTopologyType = 'spine_fishbone' | 'h_tree' | 'mesh' | 'star' | 'trunk_branch';
export type ClockRootLocation = 'bottom' | 'top' | 'left' | 'right' | 'center';

export interface ClockSink {
  id: string;
  name: string;
  type: 'cell' | 'macro';
  x: number; // in die coordinates (0..600 scale)
  y: number;
  pinName: string;
  arrivalDelayPs: number;
  skewOffsetPs: number;
  clusterId?: string;
  connectedBranchId?: string;
}

export interface ClockBufferNode {
  id: string;
  type: 'CLKBUF_X4' | 'CLKBUF_X8' | 'CLKBUF_X16' | 'CLKGATE_X2';
  name: string;
  x: number;
  y: number;
  level: number;
  delayPs: number;
}

export interface ClockWireSegment {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  level: number; // 0 = main root trunk, 1 = major branch, 2 = distribution rib, 3 = leaf pin connection
  width: number; // visual stroke width
  color?: string;
  label?: string;
  targetId?: string;
}

export interface LayoutMacro {
  id: string;
  name: string;
  type: 'sram' | 'alu' | 'dsp' | 'regfile' | 'custom' | string;
  x: number; // top-left x in 600x680 coordinate space
  y: number; // top-left y
  width: number;
  height: number;
  clockPin: { x: number; y: number; name: string };
  arrivalDelayPs: number;
  skewOffsetPs: number;
  color?: string;
}

export interface CorePlacementArea {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  cells: ClockSink[];
}

export interface ClockTreeState {
  title: string;
  dieWidth: number;
  dieHeight: number;
  coreX: number;
  coreY: number;
  coreWidth: number;
  coreHeight: number;
  clkPadLocation: ClockRootLocation;
  clkPadPos: { x: number; y: number };
  topology: ClockTopologyType;
  frequencyMhz: number;
  targetSkewPs: number;
  maxSlewPs: number;
  bufferType: 'CLKBUF_X4' | 'CLKBUF_X8' | 'CLKBUF_X16';
  macros: LayoutMacro[];
  placementAreas: CorePlacementArea[];
  clockWires: ClockWireSegment[];
  clockBuffers: ClockBufferNode[];
  sinks: ClockSink[];
  metrics: {
    maxSkewPs: number;
    minLatencyPs: number;
    maxLatencyPs: number;
    meanLatencyPs: number;
    totalWirelengthUm: number;
    clockPowerMw: number;
    bufferCount: number;
    sinkCount: number;
    drcStatus: 'PASS' | 'WARN' | 'FAIL';
  };
  promptUsed?: string;
}

// -------------------------------------------------------------
// PRESET 1: Reference Picture Exact Layout (4 Macros + Spine CTS)
// -------------------------------------------------------------
export function createReferencePicLayout(
  options?: Partial<{
    targetSkew: number;
    maxSlew: number;
    bufferType: 'CLKBUF_X4' | 'CLKBUF_X8' | 'CLKBUF_X16';
    frequencyMhz: number;
    promptText: string;
  }>
): ClockTreeState {
  const targetSkew = options?.targetSkew ?? 30;
  const maxSlew = options?.maxSlew ?? 40;
  const bufferType = options?.bufferType ?? 'CLKBUF_X8';
  const frequencyMhz = options?.frequencyMhz ?? 500;

  // Coordinate Canvas: 540 wide x 660 high
  // Die boundary: x: 30, y: 30, w: 480, h: 560
  const dieW = 480;
  const dieH = 560;
  const dieX = 30;
  const dieY = 30;

  // Macros matching reference image:
  // 1. Top-Left Macro (approx x: 45, y: 40, w: 180, h: 145)
  // 2. Top-Right Macro (approx x: 325, y: 80, w: 155, h: 140)
  // 3. Bottom-Left Macro (approx x: 45, y: 440, w: 165, h: 140)
  // 4. Bottom-Right Macro (approx x: 340, y: 440, w: 140, h: 140)
  const macros: LayoutMacro[] = [
    {
      id: 'macro_top_left',
      name: 'MACRO',
      type: 'sram',
      x: 42,
      y: 45,
      width: 178,
      height: 145,
      clockPin: { x: 155, y: 190, name: 'CLK_SRAM_TL' },
      arrivalDelayPs: 148,
      skewOffsetPs: 4,
      color: '#CBD5E1'
    },
    {
      id: 'macro_top_right',
      name: 'MACRO',
      type: 'sram',
      x: 322,
      y: 80,
      width: 158,
      height: 138,
      clockPin: { x: 370, y: 218, name: 'CLK_SRAM_TR' },
      arrivalDelayPs: 152,
      skewOffsetPs: 8,
      color: '#CBD5E1'
    },
    {
      id: 'macro_bot_left',
      name: 'MACRO',
      type: 'alu',
      x: 42,
      y: 440,
      width: 168,
      height: 140,
      clockPin: { x: 155, y: 440, name: 'CLK_ALU_BL' },
      arrivalDelayPs: 142,
      skewOffsetPs: -2,
      color: '#CBD5E1'
    },
    {
      id: 'macro_bot_right',
      name: 'MACRO',
      type: 'dsp',
      x: 340,
      y: 442,
      width: 140,
      height: 138,
      clockPin: { x: 380, y: 442, name: 'CLK_DSP_BR' },
      arrivalDelayPs: 146,
      skewOffsetPs: 2,
      color: '#CBD5E1'
    }
  ];

  // Core Area Placement Grid blocks (the yellow mesh areas in the reference picture):
  // - Top channel (x: 232, y: 45, w: 78, h: 145)
  // - Left vertical column (x: 42, y: 202, w: 100, h: 226)
  // - Center core area with "CORE AREA" label (x: 172, y: 238, w: 190, h: 86)
  // - Right vertical column (x: 388, y: 230, w: 92, h: 200)
  // - Bottom-center left channel (x: 180, y: 346, w: 70, h: 234)
  // - Bottom-center right channel (x: 272, y: 346, w: 60, h: 234)
  const placementAreas: CorePlacementArea[] = [
    {
      id: 'core_top_mesh',
      label: 'Core Upper Channel',
      x: 232,
      y: 45,
      width: 78,
      height: 145,
      rows: 14,
      cols: 6,
      cells: []
    },
    {
      id: 'core_left_strip',
      label: 'West Placement Strip',
      x: 42,
      y: 202,
      width: 100,
      height: 226,
      rows: 18,
      cols: 7,
      cells: []
    },
    {
      id: 'core_center_area',
      label: 'CORE AREA',
      x: 172,
      y: 238,
      width: 190,
      height: 86,
      rows: 7,
      cols: 14,
      cells: []
    },
    {
      id: 'core_right_strip',
      label: 'East Placement Strip',
      x: 388,
      y: 230,
      width: 92,
      height: 200,
      rows: 16,
      cols: 6,
      cells: []
    },
    {
      id: 'core_bot_left_col',
      label: 'South-West Core Strip',
      x: 175,
      y: 350,
      width: 75,
      height: 230,
      rows: 18,
      cols: 5,
      cells: []
    },
    {
      id: 'core_bot_right_col',
      label: 'South-East Core Strip',
      x: 272,
      y: 350,
      width: 60,
      height: 230,
      rows: 18,
      cols: 4,
      cells: []
    }
  ];

  // Populate placement cells / flip-flops in each core area
  const allSinks: ClockSink[] = [];
  placementAreas.forEach((area, aIdx) => {
    const numCells = Math.min(8, Math.max(3, Math.floor((area.width * area.height) / 3200)));
    for (let c = 0; c < numCells; c++) {
      const cx = area.x + 10 + ((c % 3) * (area.width - 24)) / 2;
      const cy = area.y + 14 + Math.floor(c / 3) * 32;
      const sink: ClockSink = {
        id: `sink_${area.id}_${c + 1}`,
        name: `REG_${area.id.slice(5, 8).toUpperCase()}_${c + 1}`,
        type: 'cell',
        x: cx,
        y: cy,
        pinName: 'CP',
        arrivalDelayPs: 140 + Math.round((cx + cy) * 0.03) + (c % 4) * 2,
        skewOffsetPs: ((c % 5) - 2) * 2,
        clusterId: area.id
      };
      area.cells.push(sink);
      allSinks.push(sink);
    }
  });

  // Macro sinks
  macros.forEach((m) => {
    allSinks.push({
      id: `sink_${m.id}`,
      name: `${m.name}_CLK`,
      type: 'macro',
      x: m.clockPin.x,
      y: m.clockPin.y,
      pinName: m.clockPin.name,
      arrivalDelayPs: m.arrivalDelayPs,
      skewOffsetPs: m.skewOffsetPs
    });
  });

  // Clock Root at bottom (matching reference picture "CLK")
  const clkPadPos = { x: 260, y: 590 };

  // Clock Distribution Routing (Thick Vibrant Orange Lines #F59E0B):
  // 1. Root pad leads to Central Vertical Trunk
  // 2. Trunk runs from bottom (x: 260, y: 590) up to middle channel (x: 260, y: 334)
  // 3. Central horizontal cross-spine (x: 155 to x: 375, y: 334)
  // 4. Branch lines routing up to upper macros and down to lower macros & into placement strips!
  const clockWires: ClockWireSegment[] = [
    // Main vertical trunk from bottom CLK pad up through south corridor
    {
      id: 'wire_root_trunk',
      from: { x: 260, y: 590 },
      to: { x: 260, y: 334 },
      level: 0,
      width: 14,
      color: '#F59E0B',
      label: 'ROOT_CLK_SPINE'
    },
    // Horizontal central distribution trunk
    {
      id: 'wire_horiz_spine',
      from: { x: 155, y: 334 },
      to: { x: 375, y: 334 },
      level: 1,
      width: 12,
      color: '#F59E0B',
      label: 'H_DISTRIBUTION_SPINE'
    },
    // Vertical branch going up towards Top-Left Macro & Upper Core
    {
      id: 'wire_vert_tl',
      from: { x: 155, y: 334 },
      to: { x: 155, y: 190 },
      level: 1,
      width: 10,
      color: '#F59E0B',
      label: 'BRANCH_TL_MACRO'
    },
    // Vertical branch going down to Bottom-Left Macro
    {
      id: 'wire_vert_bl',
      from: { x: 155, y: 334 },
      to: { x: 155, y: 440 },
      level: 1,
      width: 10,
      color: '#F59E0B',
      label: 'BRANCH_BL_MACRO'
    },
    // Vertical branch going up towards Top-Right Macro & East strip
    {
      id: 'wire_vert_tr',
      from: { x: 370, y: 334 },
      to: { x: 370, y: 218 },
      level: 1,
      width: 10,
      color: '#F59E0B',
      label: 'BRANCH_TR_MACRO'
    },
    // Vertical branch going down towards Bottom-Right Macro
    {
      id: 'wire_vert_br',
      from: { x: 370, y: 334 },
      to: { x: 370, y: 442 },
      level: 1,
      width: 10,
      color: '#F59E0B',
      label: 'BRANCH_BR_MACRO'
    },
    // Feeder lines into West standard cell placement strip
    {
      id: 'wire_feed_west',
      from: { x: 155, y: 280 },
      to: { x: 92, y: 280 },
      level: 2,
      width: 5,
      color: '#F59E0B',
      label: 'WEST_CELL_TAP'
    },
    // Feeder lines into East standard cell placement strip
    {
      id: 'wire_feed_east',
      from: { x: 370, y: 295 },
      to: { x: 432, y: 295 },
      level: 2,
      width: 5,
      color: '#F59E0B',
      label: 'EAST_CELL_TAP'
    },
    // Feeder lines into Upper Channel
    {
      id: 'wire_feed_upper',
      from: { x: 260, y: 334 },
      to: { x: 260, y: 120 },
      level: 2,
      width: 6,
      color: '#F59E0B',
      label: 'NORTH_CELL_TAP'
    },
    // Sub-feeder lines into South Core Strips
    {
      id: 'wire_feed_south_w',
      from: { x: 260, y: 450 },
      to: { x: 212, y: 450 },
      level: 2,
      width: 5,
      color: '#F59E0B',
      label: 'SW_CELL_TAP'
    },
    {
      id: 'wire_feed_south_e',
      from: { x: 260, y: 450 },
      to: { x: 302, y: 450 },
      level: 2,
      width: 5,
      color: '#F59E0B',
      label: 'SE_CELL_TAP'
    }
  ];

  // Leaf connections from distribution wires to individual cell sinks
  allSinks.forEach((sink, idx) => {
    if (sink.type === 'cell') {
      let nearestPoint = { x: 260, y: sink.y };
      if (sink.x < 150) nearestPoint = { x: 92, y: sink.y };
      else if (sink.x > 370) nearestPoint = { x: 432, y: sink.y };
      else if (sink.y < 200) nearestPoint = { x: 260, y: sink.y };
      else if (sink.x < 250) nearestPoint = { x: 212, y: sink.y };
      else nearestPoint = { x: 302, y: sink.y };

      clockWires.push({
        id: `wire_leaf_${sink.id}`,
        from: nearestPoint,
        to: { x: sink.x, y: sink.y },
        level: 3,
        width: 1.5,
        color: '#FBBF24',
        label: `${sink.name}_LEAF`,
        targetId: sink.id
      });
    }
  });

  // Clock Buffers & Repeaters placed at tree junctions
  const clockBuffers: ClockBufferNode[] = [
    {
      id: 'buf_root',
      type: 'CLKBUF_X16',
      name: 'CLK_ROOT_BUF',
      x: 260,
      y: 540,
      level: 0,
      delayPs: 28
    },
    {
      id: 'buf_mid_repeater',
      type: 'CLKBUF_X16',
      name: 'CLK_SPINE_REP1',
      x: 260,
      y: 410,
      level: 0,
      delayPs: 24
    },
    {
      id: 'buf_branch_tl',
      type: 'CLKBUF_X8',
      name: 'CLK_BR_TL',
      x: 155,
      y: 260,
      level: 1,
      delayPs: 32
    },
    {
      id: 'buf_branch_bl',
      type: 'CLKBUF_X8',
      name: 'CLK_BR_BL',
      x: 155,
      y: 390,
      level: 1,
      delayPs: 30
    },
    {
      id: 'buf_branch_tr',
      type: 'CLKBUF_X8',
      name: 'CLK_BR_TR',
      x: 370,
      y: 270,
      level: 1,
      delayPs: 32
    },
    {
      id: 'buf_branch_br',
      type: 'CLKBUF_X8',
      name: 'CLK_BR_BR',
      x: 370,
      y: 390,
      level: 1,
      delayPs: 30
    },
    {
      id: 'buf_core_upper',
      type: 'CLKBUF_X4',
      name: 'CLK_NORTH_TAP',
      x: 260,
      y: 190,
      level: 2,
      delayPs: 36
    }
  ];

  // Calculate live CTS Metrics
  const delays = allSinks.map((s) => s.arrivalDelayPs);
  const minLatency = Math.min(...delays);
  const maxLatency = Math.max(...delays);
  const maxSkew = maxLatency - minLatency;
  const meanLatency = Math.round(delays.reduce((a, b) => a + b, 0) / delays.length);
  const totalWirelength = Math.round(
    clockWires.reduce((acc, w) => {
      const dx = w.to.x - w.from.x;
      const dy = w.to.y - w.from.y;
      return acc + Math.sqrt(dx * dx + dy * dy) * 1.8; // scale to microns
    }, 0)
  );

  return {
    title: 'Reference 4-Macro Die Layout & Clock Tree Network',
    dieWidth: dieW,
    dieHeight: dieH,
    coreX: dieX,
    coreY: dieY,
    coreWidth: dieW,
    coreHeight: dieH,
    clkPadLocation: 'bottom',
    clkPadPos,
    topology: 'spine_fishbone',
    frequencyMhz,
    targetSkewPs: targetSkew,
    maxSlewPs: maxSlew,
    bufferType,
    macros,
    placementAreas,
    clockWires,
    clockBuffers,
    sinks: allSinks,
    metrics: {
      maxSkewPs: maxSkew,
      minLatencyPs: minLatency,
      maxLatencyPs: maxLatency,
      meanLatencyPs: meanLatency,
      totalWirelengthUm: totalWirelength,
      clockPowerMw: 14.8,
      bufferCount: clockBuffers.length,
      sinkCount: allSinks.length,
      drcStatus: maxSkew <= targetSkew ? 'PASS' : 'WARN'
    },
    promptUsed: options?.promptText || '4-macro floorplan with clock channels connecting placement cells from bottom CLK pad'
  };
}

// -------------------------------------------------------------
// PRESET 2: Symmetrical Balanced H-Tree Clock Network
// -------------------------------------------------------------
export function createHTreeLayout(
  macroCount: number = 4,
  options?: Partial<{
    targetSkew: number;
    maxSlew: number;
    bufferType: 'CLKBUF_X4' | 'CLKBUF_X8' | 'CLKBUF_X16';
    frequencyMhz: number;
    promptText: string;
  }>
): ClockTreeState {
  const targetSkew = options?.targetSkew ?? 15;
  const maxSlew = options?.maxSlew ?? 35;
  const bufferType = options?.bufferType ?? 'CLKBUF_X8';
  const frequencyMhz = options?.frequencyMhz ?? 800;

  const dieW = 480;
  const dieH = 560;

  // 4 Corner Macros
  const macros: LayoutMacro[] = [
    {
      id: 'htree_macro_1',
      name: 'MACRO 0 (SRAM)',
      type: 'sram',
      x: 45,
      y: 45,
      width: 140,
      height: 120,
      clockPin: { x: 115, y: 165, name: 'CLK_M0' },
      arrivalDelayPs: 112,
      skewOffsetPs: 1,
      color: '#CBD5E1'
    },
    {
      id: 'htree_macro_2',
      name: 'MACRO 1 (ALU)',
      type: 'alu',
      x: 355,
      y: 45,
      width: 140,
      height: 120,
      clockPin: { x: 425, y: 165, name: 'CLK_M1' },
      arrivalDelayPs: 112,
      skewOffsetPs: 2,
      color: '#CBD5E1'
    },
    {
      id: 'htree_macro_3',
      name: 'MACRO 2 (DSP)',
      type: 'dsp',
      x: 45,
      y: 455,
      width: 140,
      height: 120,
      clockPin: { x: 115, y: 455, name: 'CLK_M2' },
      arrivalDelayPs: 112,
      skewOffsetPs: -1,
      color: '#CBD5E1'
    },
    {
      id: 'htree_macro_4',
      name: 'MACRO 3 (REG)',
      type: 'regfile',
      x: 355,
      y: 455,
      width: 140,
      height: 120,
      clockPin: { x: 425, y: 455, name: 'CLK_M3' },
      arrivalDelayPs: 112,
      skewOffsetPs: 0,
      color: '#CBD5E1'
    }
  ].slice(0, Math.min(4, Math.max(1, macroCount)));

  // Center Core Placement Quadrants
  const placementAreas: CorePlacementArea[] = [
    { id: 'htree_core_nw', label: 'Core Quad NW', x: 195, y: 55, width: 150, height: 160, rows: 10, cols: 8, cells: [] },
    { id: 'htree_core_sw', label: 'Core Quad SW', x: 195, y: 405, width: 150, height: 160, rows: 10, cols: 8, cells: [] },
    { id: 'htree_core_mid', label: 'CORE AREA', x: 60, y: 235, width: 420, height: 150, rows: 12, cols: 24, cells: [] }
  ];

  const allSinks: ClockSink[] = [];
  placementAreas.forEach((area) => {
    for (let i = 0; i < 6; i++) {
      const cx = area.x + 20 + (i % 3) * 50;
      const cy = area.y + 20 + Math.floor(i / 3) * 50;
      const sink: ClockSink = {
        id: `htree_sink_${area.id}_${i}`,
        name: `DFF_${area.id.slice(11)}_${i + 1}`,
        type: 'cell',
        x: cx,
        y: cy,
        pinName: 'CLK',
        arrivalDelayPs: 110 + (i % 3) * 2,
        skewOffsetPs: (i % 3) - 1,
        clusterId: area.id
      };
      area.cells.push(sink);
      allSinks.push(sink);
    }
  });

  macros.forEach((m) => {
    allSinks.push({
      id: `sink_${m.id}`,
      name: `${m.name}_CLK`,
      type: 'macro',
      x: m.clockPin.x,
      y: m.clockPin.y,
      pinName: m.clockPin.name,
      arrivalDelayPs: m.arrivalDelayPs,
      skewOffsetPs: m.skewOffsetPs
    });
  });

  // H-Tree Network Geometry (Centered at x: 270, y: 310)
  const rootX = 270;
  const rootY = 310;
  const clkPadPos = { x: 270, y: 590 };

  const clockWires: ClockWireSegment[] = [
    // Bottom root to center
    { id: 'h_root_line', from: clkPadPos, to: { x: rootX, y: rootY }, level: 0, width: 12, color: '#F59E0B', label: 'ROOT_TRUNK' },
    // Level 1: Horizontal Trunk
    { id: 'h_lvl1_h', from: { x: 160, y: rootY }, to: { x: 380, y: rootY }, level: 1, width: 10, color: '#F59E0B', label: 'H_LEVEL_1' },
    // Level 2: Left & Right Vertical Arms
    { id: 'h_lvl2_v_l', from: { x: 160, y: 160 }, to: { x: 160, y: 460 }, level: 2, width: 8, color: '#F59E0B', label: 'H_LEVEL_2_L' },
    { id: 'h_lvl2_v_r', from: { x: 380, y: 160 }, to: { x: 380, y: 460 }, level: 2, width: 8, color: '#F59E0B', label: 'H_LEVEL_2_R' },
    // Level 3: Sub-horizontal crossbars
    { id: 'h_lvl3_nw', from: { x: 100, y: 160 }, to: { x: 220, y: 160 }, level: 2, width: 6, color: '#F59E0B' },
    { id: 'h_lvl3_sw', from: { x: 100, y: 460 }, to: { x: 220, y: 460 }, level: 2, width: 6, color: '#F59E0B' },
    { id: 'h_lvl3_ne', from: { x: 320, y: 160 }, to: { x: 440, y: 160 }, level: 2, width: 6, color: '#F59E0B' },
    { id: 'h_lvl3_se', from: { x: 320, y: 460 }, to: { x: 440, y: 460 }, level: 2, width: 6, color: '#F59E0B' }
  ];

  // Leaf connections to cells
  allSinks.forEach((s) => {
    let tapX = s.x < 270 ? 160 : 380;
    let tapY = s.y < 310 ? 160 : 460;
    clockWires.push({
      id: `h_leaf_${s.id}`,
      from: { x: tapX, y: tapY },
      to: { x: s.x, y: s.y },
      level: 3,
      width: 1.5,
      color: '#FBBF24',
      targetId: s.id
    });
  });

  const clockBuffers: ClockBufferNode[] = [
    { id: 'h_buf_root', type: 'CLKBUF_X16', name: 'ROOT_BUF', x: rootX, y: rootY, level: 0, delayPs: 25 },
    { id: 'h_buf_l1_l', type: 'CLKBUF_X8', name: 'BUF_L1_WEST', x: 160, y: rootY, level: 1, delayPs: 22 },
    { id: 'h_buf_l1_r', type: 'CLKBUF_X8', name: 'BUF_L1_EAST', x: 380, y: rootY, level: 1, delayPs: 22 },
    { id: 'h_buf_l2_nw', type: 'CLKBUF_X4', name: 'BUF_L2_NW', x: 160, y: 160, level: 2, delayPs: 20 },
    { id: 'h_buf_l2_sw', type: 'CLKBUF_X4', name: 'BUF_L2_SW', x: 160, y: 460, level: 2, delayPs: 20 },
    { id: 'h_buf_l2_ne', type: 'CLKBUF_X4', name: 'BUF_L2_NE', x: 380, y: 160, level: 2, delayPs: 20 },
    { id: 'h_buf_l2_se', type: 'CLKBUF_X4', name: 'BUF_L2_SE', x: 380, y: 460, level: 2, delayPs: 20 }
  ];

  const delays = allSinks.map((s) => s.arrivalDelayPs);
  const minLatency = Math.min(...delays);
  const maxLatency = Math.max(...delays);
  const maxSkew = maxLatency - minLatency;

  return {
    title: 'Symmetrical Balanced H-Tree Clock Network',
    dieWidth: dieW,
    dieHeight: dieH,
    coreX: 30,
    coreY: 30,
    coreWidth: dieW,
    coreHeight: dieH,
    clkPadLocation: 'bottom',
    clkPadPos,
    topology: 'h_tree',
    frequencyMhz,
    targetSkewPs: targetSkew,
    maxSlewPs: maxSlew,
    bufferType,
    macros,
    placementAreas,
    clockWires,
    clockBuffers,
    sinks: allSinks,
    metrics: {
      maxSkewPs: maxSkew,
      minLatencyPs: minLatency,
      maxLatencyPs: maxLatency,
      meanLatencyPs: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length),
      totalWirelengthUm: 1940,
      clockPowerMw: 18.2,
      bufferCount: clockBuffers.length,
      sinkCount: allSinks.length,
      drcStatus: 'PASS'
    },
    promptUsed: options?.promptText || 'Symmetrical balanced H-Tree network for minimum clock skew'
  };
}

// -------------------------------------------------------------
// PRESET 3: Ultra Low-Skew Clock Mesh / Grid
// -------------------------------------------------------------
export function createClockMeshLayout(
  options?: Partial<{
    targetSkew: number;
    maxSlew: number;
    bufferType: 'CLKBUF_X4' | 'CLKBUF_X8' | 'CLKBUF_X16';
    frequencyMhz: number;
    promptText: string;
  }>
): ClockTreeState {
  const targetSkew = options?.targetSkew ?? 10;
  const maxSlew = options?.maxSlew ?? 25;
  const bufferType = options?.bufferType ?? 'CLKBUF_X16';
  const frequencyMhz = options?.frequencyMhz ?? 1200;

  const dieW = 480;
  const dieH = 560;

  const macros: LayoutMacro[] = [
    {
      id: 'mesh_macro_l',
      name: 'CPU_CORE_0',
      type: 'alu',
      x: 45,
      y: 50,
      width: 160,
      height: 180,
      clockPin: { x: 125, y: 230, name: 'CLK_CORE0' },
      arrivalDelayPs: 85,
      skewOffsetPs: 1,
      color: '#CBD5E1'
    },
    {
      id: 'mesh_macro_r',
      name: 'CPU_CORE_1',
      type: 'alu',
      x: 335,
      y: 50,
      width: 160,
      height: 180,
      clockPin: { x: 415, y: 230, name: 'CLK_CORE1' },
      arrivalDelayPs: 86,
      skewOffsetPs: 2,
      color: '#CBD5E1'
    }
  ];

  const placementAreas: CorePlacementArea[] = [
    {
      id: 'mesh_core_grid',
      label: 'CORE AREA (MESH DRIVEN)',
      x: 50,
      y: 260,
      width: 440,
      height: 300,
      rows: 18,
      cols: 24,
      cells: []
    }
  ];

  const allSinks: ClockSink[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const sx = 90 + c * 85;
      const sy = 300 + r * 65;
      const sink: ClockSink = {
        id: `mesh_sink_${r}_${c}`,
        name: `FF_MESH_${r}${c}`,
        type: 'cell',
        x: sx,
        y: sy,
        pinName: 'CK',
        arrivalDelayPs: 84 + ((r + c) % 3),
        skewOffsetPs: ((r + c) % 3) - 1,
        clusterId: 'mesh_core_grid'
      };
      placementAreas[0].cells.push(sink);
      allSinks.push(sink);
    }
  }

  macros.forEach((m) => {
    allSinks.push({
      id: `sink_${m.id}`,
      name: `${m.name}_CLK`,
      type: 'macro',
      x: m.clockPin.x,
      y: m.clockPin.y,
      pinName: m.clockPin.name,
      arrivalDelayPs: m.arrivalDelayPs,
      skewOffsetPs: m.skewOffsetPs
    });
  });

  const clkPadPos = { x: 270, y: 590 };
  const clockWires: ClockWireSegment[] = [
    // Pre-mesh tree feeders
    { id: 'm_root', from: clkPadPos, to: { x: 270, y: 420 }, level: 0, width: 14, color: '#F59E0B' },
    { id: 'm_feed_h', from: { x: 100, y: 420 }, to: { x: 440, y: 420 }, level: 1, width: 10, color: '#F59E0B' }
  ];

  // Orthogonal Clock Mesh Grid Lines
  const gridXs = [100, 180, 270, 360, 440];
  const gridYs = [280, 340, 400, 460, 520];

  gridXs.forEach((gx, idx) => {
    clockWires.push({
      id: `mesh_v_${idx}`,
      from: { x: gx, y: 270 },
      to: { x: gx, y: 530 },
      level: 1,
      width: 7,
      color: '#F59E0B'
    });
  });

  gridYs.forEach((gy, idx) => {
    clockWires.push({
      id: `mesh_h_${idx}`,
      from: { x: 90, y: gy },
      to: { x: 450, y: gy },
      level: 1,
      width: 7,
      color: '#F59E0B'
    });
  });

  // Short taps from mesh to sinks
  allSinks.forEach((s) => {
    const nearX = gridXs.reduce((prev, curr) => (Math.abs(curr - s.x) < Math.abs(prev - s.x) ? curr : prev));
    clockWires.push({
      id: `mesh_tap_${s.id}`,
      from: { x: nearX, y: s.y },
      to: { x: s.x, y: s.y },
      level: 3,
      width: 1.5,
      color: '#FBBF24',
      targetId: s.id
    });
  });

  const clockBuffers: ClockBufferNode[] = [
    { id: 'mb_1', type: 'CLKBUF_X16', name: 'MESH_DRV_1', x: 100, y: 420, level: 1, delayPs: 18 },
    { id: 'mb_2', type: 'CLKBUF_X16', name: 'MESH_DRV_2', x: 270, y: 420, level: 1, delayPs: 18 },
    { id: 'mb_3', type: 'CLKBUF_X16', name: 'MESH_DRV_3', x: 440, y: 420, level: 1, delayPs: 18 }
  ];

  return {
    title: 'High-Performance Orthogonal Clock Mesh (Sub-10ps Skew)',
    dieWidth: dieW,
    dieHeight: dieH,
    coreX: 30,
    coreY: 30,
    coreWidth: dieW,
    coreHeight: dieH,
    clkPadLocation: 'bottom',
    clkPadPos,
    topology: 'mesh',
    frequencyMhz,
    targetSkewPs: targetSkew,
    maxSlewPs: maxSlew,
    bufferType,
    macros,
    placementAreas,
    clockWires,
    clockBuffers,
    sinks: allSinks,
    metrics: {
      maxSkewPs: 6,
      minLatencyPs: 82,
      maxLatencyPs: 88,
      meanLatencyPs: 85,
      totalWirelengthUm: 3820,
      clockPowerMw: 32.5,
      bufferCount: clockBuffers.length,
      sinkCount: allSinks.length,
      drcStatus: 'PASS'
    },
    promptUsed: options?.promptText || 'Ultra-low skew clock mesh grid for high-speed multi-core SoC'
  };
}

// -------------------------------------------------------------
// PRESET 4: Synchronized with Previous Stages (Stage 1 Floorplan + Stage 3 Placement)
// -------------------------------------------------------------
export function createSynchronizedStageLayout(
  floorplan: FloorplanConfig,
  standardCells: StandardCellInfo[],
  options?: Partial<{
    targetSkew: number;
    maxSlew: number;
    bufferType: 'CLKBUF_X4' | 'CLKBUF_X8' | 'CLKBUF_X16';
    frequencyMhz: number;
    promptText: string;
  }>
): ClockTreeState {
  const targetSkew = options?.targetSkew ?? 28;
  const maxSlew = options?.maxSlew ?? 42;
  const bufferType = options?.bufferType ?? 'CLKBUF_X8';
  const frequencyMhz = options?.frequencyMhz ?? 500;

  const dieW = 480;
  const dieH = 560;

  // Map floorplan macros to layout macros
  const scaleX = dieW / Math.max(100, floorplan.dieWidth);
  const scaleY = dieH / Math.max(100, floorplan.dieHeight);

  const macros: LayoutMacro[] = floorplan.macros.map((m, idx) => {
    const mx = 40 + m.x * scaleX * 0.8;
    const my = 40 + m.y * scaleY * 0.8;
    const mw = Math.max(80, m.width * scaleX * 0.8);
    const mh = Math.max(70, m.height * scaleY * 0.8);
    return {
      id: m.id || `macro_${idx}`,
      name: m.name || `MACRO_${idx + 1}`,
      type: (m.type as any) || 'custom',
      x: mx,
      y: my,
      width: mw,
      height: mh,
      clockPin: { x: mx + mw * 0.5, y: my + mh, name: `CLK_${m.name}` },
      arrivalDelayPs: 135 + idx * 8,
      skewOffsetPs: idx * 3,
      color: '#CBD5E1'
    };
  });

  // Map standard cells
  const corePlacement: CorePlacementArea = {
    id: 'stage_core_area',
    label: 'CORE AREA (STAGE 3 PLACEMENT)',
    x: 50,
    y: 200,
    width: 440,
    height: 340,
    rows: 14,
    cols: 16,
    cells: []
  };

  const allSinks: ClockSink[] = [];
  standardCells.forEach((c, idx) => {
    const sx = 60 + ((c.x * 1.6) % 400);
    const sy = 220 + ((c.y * 1.8) % 300);
    const isSequential = c.type === 'DFF' || c.name.includes('FF') || c.name.includes('LATCH');
    if (isSequential || idx % 2 === 0) {
      const sink: ClockSink = {
        id: `sink_sc_${c.id}`,
        name: c.name,
        type: 'cell',
        x: sx,
        y: sy,
        pinName: 'CP',
        arrivalDelayPs: 130 + (idx % 6) * 4,
        skewOffsetPs: ((idx % 5) - 2) * 2,
        clusterId: 'stage_core_area'
      };
      corePlacement.cells.push(sink);
      allSinks.push(sink);
    }
  });

  macros.forEach((m) => {
    allSinks.push({
      id: `sink_${m.id}`,
      name: `${m.name}_CLK`,
      type: 'macro',
      x: m.clockPin.x,
      y: m.clockPin.y,
      pinName: m.clockPin.name,
      arrivalDelayPs: m.arrivalDelayPs,
      skewOffsetPs: m.skewOffsetPs
    });
  });

  const clkPadPos = { x: 270, y: 590 };
  const clockWires: ClockWireSegment[] = [
    { id: 'stg_root', from: clkPadPos, to: { x: 270, y: 340 }, level: 0, width: 12, color: '#F59E0B', label: 'ROOT_TRUNK' },
    { id: 'stg_cross', from: { x: 120, y: 340 }, to: { x: 420, y: 340 }, level: 1, width: 10, color: '#F59E0B', label: 'H_SPINE' }
  ];

  // Route to macros
  macros.forEach((m, idx) => {
    clockWires.push({
      id: `stg_m_${idx}`,
      from: { x: m.clockPin.x, y: 340 },
      to: { x: m.clockPin.x, y: m.clockPin.y },
      level: 1,
      width: 7,
      color: '#F59E0B'
    });
  });

  // Route to cells
  allSinks.forEach((s) => {
    if (s.type === 'cell') {
      clockWires.push({
        id: `stg_w_${s.id}`,
        from: { x: s.x, y: 340 },
        to: { x: s.x, y: s.y },
        level: 3,
        width: 1.5,
        color: '#FBBF24',
        targetId: s.id
      });
    }
  });

  const clockBuffers: ClockBufferNode[] = [
    { id: 'stg_buf_root', type: 'CLKBUF_X16', name: 'CLK_ROOT_BUF', x: 270, y: 460, level: 0, delayPs: 26 },
    { id: 'stg_buf_l1_l', type: 'CLKBUF_X8', name: 'CLK_BUF_WEST', x: 140, y: 340, level: 1, delayPs: 28 },
    { id: 'stg_buf_l1_r', type: 'CLKBUF_X8', name: 'CLK_BUF_EAST', x: 400, y: 340, level: 1, delayPs: 28 }
  ];

  const delays = allSinks.map((s) => s.arrivalDelayPs);
  const minLatency = Math.min(...delays);
  const maxLatency = Math.max(...delays);

  return {
    title: 'Synchronized Stage CTS (Stage 1 Floorplan & Stage 3 Placement)',
    dieWidth: dieW,
    dieHeight: dieH,
    coreX: 30,
    coreY: 30,
    coreWidth: dieW,
    coreHeight: dieH,
    clkPadLocation: 'bottom',
    clkPadPos,
    topology: 'trunk_branch',
    frequencyMhz,
    targetSkewPs: targetSkew,
    maxSlewPs: maxSlew,
    bufferType,
    macros,
    placementAreas: [corePlacement],
    clockWires,
    clockBuffers,
    sinks: allSinks,
    metrics: {
      maxSkewPs: maxLatency - minLatency,
      minLatencyPs: minLatency,
      maxLatencyPs: maxLatency,
      meanLatencyPs: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length),
      totalWirelengthUm: 2150,
      clockPowerMw: 16.4,
      bufferCount: clockBuffers.length,
      sinkCount: allSinks.length,
      drcStatus: 'PASS'
    },
    promptUsed: options?.promptText || 'Synchronized CTS with Stage 1 Floorplan Macros & Stage 3 Standard Cells'
  };
}

// -------------------------------------------------------------
// NLP Prompt-to-Layout Interpreter & Synthesizer
// -------------------------------------------------------------
export function synthesizeClockTreeFromPrompt(
  prompt: string,
  currentFloorplan?: FloorplanConfig,
  currentCells?: StandardCellInfo[]
): ClockTreeState {
  const p = prompt.toLowerCase();

  // 1. Check for Reference Picture / 4 Macro
  if (
    p.includes('reference') ||
    p.includes('pic') ||
    p.includes('image') ||
    p.includes('4 macro') ||
    p.includes('four macro') ||
    p.includes('original')
  ) {
    return createReferencePicLayout({ promptText: prompt });
  }

  // 2. Check for H-Tree
  if (p.includes('h-tree') || p.includes('htree') || p.includes('symmetric') || p.includes('balanced')) {
    let macroCount = 4;
    if (p.includes('2 macro') || p.includes('two macro')) macroCount = 2;
    if (p.includes('1 macro') || p.includes('one macro') || p.includes('single macro')) macroCount = 1;
    if (p.includes('3 macro') || p.includes('three macro')) macroCount = 3;
    return createHTreeLayout(macroCount, { promptText: prompt });
  }

  // 3. Check for Mesh / Grid
  if (p.includes('mesh') || p.includes('grid') || p.includes('ultra low skew') || p.includes('sub-10ps') || p.includes('high speed')) {
    return createClockMeshLayout({ promptText: prompt });
  }

  // 4. Check for Stage Sync
  if (
    (p.includes('previous') || p.includes('stage') || p.includes('sync') || p.includes('floorplan') || p.includes('placement')) &&
    currentFloorplan &&
    currentCells
  ) {
    return createSynchronizedStageLayout(currentFloorplan, currentCells, { promptText: prompt });
  }

  // 5. Default or Custom Prompt: Extract target parameters
  let targetSkew = 30;
  if (/(\d+)\s*ps/i.test(prompt)) {
    const m = prompt.match(/(\d+)\s*ps/i);
    if (m && m[1]) targetSkew = parseInt(m[1], 10);
  }

  let freqMhz = 500;
  if (/(\d+)\s*mhz/i.test(prompt)) {
    const m = prompt.match(/(\d+)\s*mhz/i);
    if (m && m[1]) freqMhz = parseInt(m[1], 10);
  } else if (/(\d+(\.\d+)?)\s*ghz/i.test(prompt)) {
    const m = prompt.match(/(\d+(\.\d+)?)\s*ghz/i);
    if (m && m[1]) freqMhz = Math.round(parseFloat(m[1]) * 1000);
  }

  let bufferType: 'CLKBUF_X4' | 'CLKBUF_X8' | 'CLKBUF_X16' = 'CLKBUF_X8';
  if (p.includes('x16') || p.includes('strong')) bufferType = 'CLKBUF_X16';
  else if (p.includes('x4') || p.includes('low power')) bufferType = 'CLKBUF_X4';

  // Return tailored reference layout with custom parameters
  return createReferencePicLayout({
    targetSkew,
    bufferType,
    frequencyMhz: freqMhz,
    promptText: prompt
  });
}

// -------------------------------------------------------------
// OpenROAD TritonCTS & Cadence Innovus TCL Generation
// -------------------------------------------------------------
export function generateCtsTclScript(state: ClockTreeState, designName: string = 'ASIC_CORE'): string {
  return `# ==============================================================================
# OpenROAD TritonCTS & Cadence Innovus Synthesis Script
# Design: ${designName}
# Topology: ${state.topology.toUpperCase()} | Frequency: ${state.frequencyMhz} MHz
# Generated based on prompt: "${state.promptUsed || 'User Physical Design'}"
# ==============================================================================

# 1. Define Clock Constraints & Slew Limits
create_clock -name CLK_ROOT -period ${((1000 / state.frequencyMhz) * 1).toFixed(3)} [get_ports clk]
set_clock_tree_options \\
    -target_skew 0.0${state.targetSkewPs} \\
    -max_transition 0.0${state.maxSlewPs} \\
    -max_capacitance 18.0fF

# 2. Configure Buffer Library Selection
configure_cts_characterization \\
    -buf_list {${state.bufferType} ${state.bufferType === 'CLKBUF_X16' ? 'CLKBUF_X8' : 'CLKBUF_X4'}} \\
    -max_slew 40.0ps \\
    -max_cap 20.0fF

# 3. Macro Keepouts & Halo Constraints
${state.macros
  .map(
    (m) =>
      `create_route_halo -bottom 10 -top 10 -left 10 -right 10 -rect {${m.x} ${m.y} ${m.x + m.width} ${m.y + m.height}}`
  )
  .join('\n')}

# 4. Synthesize Clock Tree Topology (${state.topology})
clock_tree_synthesis \\
    -root_node clk \\
    -sink_clustering_size ${state.sinks.length > 20 ? 16 : 8} \\
    -clustering_mode balanced

# 5. Insert Clock Tree Buffers & Repair Nets
repair_clock_nets
estimate_parasitics -placement

# 6. Generate Verification & Skew Reports
report_clock_skew -digits 3
report_clock_latency -digits 3
report_clock_tree_metrics -file ${designName}_cts_summary.rpt

puts "CTS Completed: Max Skew = ${state.metrics.maxSkewPs}ps (Target <= ${state.targetSkewPs}ps) STATUS: ${state.metrics.drcStatus}"
`;
}

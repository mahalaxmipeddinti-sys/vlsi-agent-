// Stage 5: Detailed & Global Routing Engine
// Provides high-fidelity geometry, layer assignment (M1–M6), via contacts, and DRC analytics

export interface RoutingPin {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'input' | 'output' | 'inout' | 'clock';
  ownerId: string;
  ownerType: 'macro' | 'core_cell' | 'io_pad';
  layer: string;
}

export interface RoutingSegment {
  id: string;
  netId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  layer: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';
  direction: 'horizontal' | 'vertical';
  width: number; // in microns
  lengthUm: number;
  resistanceOhm: number;
  capacitanceFf: number;
}

export interface RoutingVia {
  id: string;
  x: number;
  y: number;
  fromLayer: string;
  toLayer: string;
  netId: string;
  resistanceOhm: number;
}

export interface RoutedSignalNet {
  id: string;
  name: string;
  busGroup: string;
  color: string;
  sourcePin: RoutingPin;
  sinkPins: RoutingPin[];
  segments: RoutingSegment[];
  vias: RoutingVia[];
  totalLengthUm: number;
  totalDelayPs: number;
  totalCapacitanceFf: number;
  totalResistanceOhm: number;
  antennaRatio: number;
  isCritical: boolean;
  drcStatus: 'CLEAN' | 'VIOLATION';
}

export interface GCell {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
  horizontalCapacity: number;
  horizontalUsage: number;
  verticalCapacity: number;
  verticalUsage: number;
  congestionScore: number; // 0.0 to 1.5+ (>1.0 indicates routing overflow)
}

export interface RoutingState {
  macros: {
    id: string;
    name: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pins: RoutingPin[];
  }[];
  coreArea: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  };
  placementCorridors: {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  ctsUnderlay: {
    clkPad: { x: number; y: number };
    trunks: { x1: number; y1: number; x2: number; y2: number; width: number }[];
  };
  nets: RoutedSignalNet[];
  allSegments: RoutingSegment[];
  allVias: RoutingVia[];
  allPins: RoutingPin[];
  gCells: GCell[];
  statistics: {
    totalWirelengthMm: number;
    totalViaCount: number;
    totalNets: number;
    routedPercentage: number;
    layerWirelengthMm: Record<string, number>;
    drcShorts: number;
    drcSpacingViolations: number;
    maxAntennaRatio: number;
    antennaThreshold: number;
    worstNetDelayPs: number;
    averageCongestionPercent: number;
    maxCongestionPercent: number;
  };
}

// Generate the complete detailed routing dataset matching the reference image layout
export function generateRoutingState(activeIcId: string = '7476'): RoutingState {
  // 1. Die Dimensions & 4 Corner Macros (matching Stage 4 CTS layout)
  const macros = [
    {
      id: 'macro_top_left',
      name: 'MACRO',
      type: 'ALU / DSP Subsystem',
      x: 35,
      y: 35,
      width: 140,
      height: 135,
      pins: [] as RoutingPin[]
    },
    {
      id: 'macro_top_right',
      name: 'MACRO',
      type: 'SRAM 4KB Cache IP',
      x: 365,
      y: 35,
      width: 140,
      height: 135,
      pins: [] as RoutingPin[]
    },
    {
      id: 'macro_bottom_left',
      name: 'MACRO',
      type: 'Register File IP',
      x: 35,
      y: 470,
      width: 140,
      height: 135,
      pins: [] as RoutingPin[]
    },
    {
      id: 'macro_bottom_right',
      name: 'MACRO',
      type: 'Crypto Engine IP',
      x: 365,
      y: 470,
      width: 140,
      height: 135,
      pins: [] as RoutingPin[]
    }
  ];

  // 2. Central CORE AREA and Placement Mesh Corridors
  const coreArea = {
    x: 185,
    y: 260,
    width: 170,
    height: 85,
    label: 'CORE AREA'
  };

  const placementCorridors = [
    { id: 'corr_north', name: 'North Corridor', x: 185, y: 35, width: 170, height: 215 },
    { id: 'corr_south_w', name: 'South-West Corridor', x: 185, y: 355, width: 80, height: 250 },
    { id: 'corr_south_e', name: 'South-East Corridor', x: 275, y: 355, width: 80, height: 250 },
    { id: 'corr_west', name: 'West Corridor', x: 35, y: 180, width: 140, height: 280 },
    { id: 'corr_east', name: 'East Corridor', x: 365, y: 180, width: 140, height: 280 }
  ];

  // 3. Stage 4 Clock Tree Synthesis (CTS) Backbone Underlay (Orange/Amber)
  const ctsUnderlay = {
    clkPad: { x: 270, y: 620 },
    trunks: [
      // Central vertical clock trunk
      { x1: 270, y1: 620, x2: 270, y2: 240, width: 8 },
      // Horizontal clock spine
      { x1: 130, y1: 280, x2: 410, y2: 280, width: 7 },
      // North vertical feeder
      { x1: 270, y1: 240, x2: 270, y2: 45, width: 6 },
      // West branch feeder
      { x1: 130, y1: 280, x2: 130, y2: 460, width: 5 },
      // East branch feeder
      { x1: 410, y1: 280, x2: 410, y2: 460, width: 5 }
    ]
  };

  const allPins: RoutingPin[] = [];
  const allVias: RoutingVia[] = [];
  const allSegments: RoutingSegment[] = [];
  const nets: RoutedSignalNet[] = [];

  // Helper to create pins
  const addPin = (name: string, x: number, y: number, type: RoutingPin['type'], ownerId: string, layer: string = 'M1'): RoutingPin => {
    const pin: RoutingPin = {
      id: `pin_${ownerId}_${name}_${Math.round(x)}_${Math.round(y)}`,
      name,
      x,
      y,
      type,
      ownerId,
      ownerType: ownerId.startsWith('macro') ? 'macro' : 'core_cell',
      layer
    };
    allPins.push(pin);
    return pin;
  };

  // Helper to create via
  const addVia = (x: number, y: number, fromLayer: string, toLayer: string, netId: string): RoutingVia => {
    const via: RoutingVia = {
      id: `via_${netId}_${Math.round(x)}_${Math.round(y)}`,
      x,
      y,
      fromLayer,
      toLayer,
      netId,
      resistanceOhm: 1.8 // Typical copper contact via resistance
    };
    allVias.push(via);
    return via;
  };

  // Helper to create segment
  const addSegment = (
    netId: string,
    from: { x: number; y: number },
    to: { x: number; y: number },
    layer: RoutingSegment['layer'],
    width: number = 2.5
  ): RoutingSegment => {
    const isHoriz = Math.abs(to.y - from.y) < Math.abs(to.x - from.x);
    const lengthUm = Math.hypot(to.x - from.x, to.y - from.y);

    // Layer-specific sheet resistance and capacitance
    const sheetRes = layer === 'M1' ? 0.12 : layer === 'M2' ? 0.09 : layer === 'M3' ? 0.06 : 0.04;
    const unitCap = 0.18; // fF / um

    const seg: RoutingSegment = {
      id: `seg_${netId}_${layer}_${Math.round(from.x)}_${Math.round(from.y)}`,
      netId,
      from,
      to,
      layer,
      direction: isHoriz ? 'horizontal' : 'vertical',
      width,
      lengthUm,
      resistanceOhm: (lengthUm / width) * sheetRes,
      capacitanceFf: lengthUm * unitCap
    };
    allSegments.push(seg);
    return seg;
  };

  // -------------------------------------------------------------
  // 4. Build Exact Routing Bundles matching the user's reference!
  // -------------------------------------------------------------

  // BUNDLE 1: Bottom-Left Macro Top Edge Pins (Dense row of pink pins & green vertical bus)
  // Pin X positions: 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165 at y = 470
  const blPinXList = [45, 54, 63, 72, 81, 90, 99, 108, 117, 126, 135, 144, 153, 162];
  
  blPinXList.forEach((px, idx) => {
    const netId = `BL_BUS_${idx}`;
    const pStart = addPin(`BL_D${idx}`, px, 470, 'output', 'macro_bottom_left', 'M2');

    // Turn heights into West channel
    const turnY = 290 - idx * 16;
    const coreTargetX = 200 + (idx % 6) * 20;
    const coreTargetY = 270 + (idx % 4) * 18;

    const netSegs: RoutingSegment[] = [];
    const netVias: RoutingVia[] = [];

    // Vertical segment up from macro pin on M3
    netSegs.push(addSegment(netId, { x: px, y: 470 }, { x: px, y: turnY }, 'M3', 2.8));

    // Via at bend
    netVias.push(addVia(px, turnY, 'M3', 'M2', netId));

    // Horizontal segment into core corridor on M2
    netSegs.push(addSegment(netId, { x: px, y: turnY }, { x: coreTargetX, y: turnY }, 'M2', 2.8));

    // Via at entrance to core
    netVias.push(addVia(coreTargetX, turnY, 'M2', 'M1', netId));

    // Small drop into core cell
    netSegs.push(addSegment(netId, { x: coreTargetX, y: turnY }, { x: coreTargetX, y: coreTargetY }, 'M1', 2.5));

    const pEnd = addPin(`CORE_IN_${idx}`, coreTargetX, coreTargetY, 'input', 'core_cell', 'M1');

    const totalLen = netSegs.reduce((acc, s) => acc + s.lengthUm, 0);
    const totalR = netSegs.reduce((acc, s) => acc + s.resistanceOhm, 0) + netVias.length * 1.8;
    const totalC = netSegs.reduce((acc, s) => acc + s.capacitanceFf, 0);
    const delayPs = Math.round(0.38 * totalR * totalC * 0.001 * 10) / 10 + 12;

    nets.push({
      id: netId,
      name: `DATA_BL[${idx}]`,
      busGroup: 'DATA_BL',
      color: '#10B981',
      sourcePin: pStart,
      sinkPins: [pEnd],
      segments: netSegs,
      vias: netVias,
      totalLengthUm: Math.round(totalLen),
      totalDelayPs: delayPs,
      totalCapacitanceFf: Math.round(totalC * 10) / 10,
      totalResistanceOhm: Math.round(totalR * 10) / 10,
      antennaRatio: Math.round(totalLen / 1.2),
      isCritical: idx < 3,
      drcStatus: 'CLEAN'
    });
  });

  // BUNDLE 2: Bottom-Right Macro Pins (Top & Inner Left edge)
  // Pin X positions: 375, 385, 395, 405, 415, 425, 435, 445, 455, 465, 475, 485 at y = 470
  const brPinXList = [375, 385, 395, 405, 415, 425, 435, 445, 455, 465, 475, 485];
  
  brPinXList.forEach((px, idx) => {
    const netId = `BR_BUS_${idx}`;
    const pStart = addPin(`BR_Q${idx}`, px, 470, 'output', 'macro_bottom_right', 'M2');

    // Turn heights in East channel
    const turnY = 295 - idx * 15;
    const coreTargetX = 330 - (idx % 5) * 18;
    const coreTargetY = 275 + (idx % 4) * 16;

    const netSegs: RoutingSegment[] = [];
    const netVias: RoutingVia[] = [];

    // Vertical segment up on M3
    netSegs.push(addSegment(netId, { x: px, y: 470 }, { x: px, y: turnY }, 'M3', 2.8));

    // Via at bend
    netVias.push(addVia(px, turnY, 'M3', 'M2', netId));

    // Horizontal segment turning west into core on M2
    netSegs.push(addSegment(netId, { x: px, y: turnY }, { x: coreTargetX, y: turnY }, 'M2', 2.8));

    // Via into core
    netVias.push(addVia(coreTargetX, turnY, 'M2', 'M1', netId));

    // Drop into core cell
    netSegs.push(addSegment(netId, { x: coreTargetX, y: turnY }, { x: coreTargetX, y: coreTargetY }, 'M1', 2.5));

    const pEnd = addPin(`CORE_BR_${idx}`, coreTargetX, coreTargetY, 'input', 'core_cell', 'M1');

    const totalLen = netSegs.reduce((acc, s) => acc + s.lengthUm, 0);
    const totalR = netSegs.reduce((acc, s) => acc + s.resistanceOhm, 0) + netVias.length * 1.8;
    const totalC = netSegs.reduce((acc, s) => acc + s.capacitanceFf, 0);
    const delayPs = Math.round(0.38 * totalR * totalC * 0.001 * 10) / 10 + 14;

    nets.push({
      id: netId,
      name: `DATA_BR[${idx}]`,
      busGroup: 'DATA_BR',
      color: '#10B981',
      sourcePin: pStart,
      sinkPins: [pEnd],
      segments: netSegs,
      vias: netVias,
      totalLengthUm: Math.round(totalLen),
      totalDelayPs: delayPs,
      totalCapacitanceFf: Math.round(totalC * 10) / 10,
      totalResistanceOhm: Math.round(totalR * 10) / 10,
      antennaRatio: Math.round(totalLen / 1.2),
      isCritical: idx % 2 === 0,
      drcStatus: 'CLEAN'
    });
  });

  // Additional pins on inner edge of Bottom-Right Macro: x = 365, y = 490, 510, 530, 550, 570
  [490, 510, 530, 550, 570].forEach((py, idx) => {
    const netId = `BR_SIDE_${idx}`;
    const pStart = addPin(`BR_SIDE_${idx}`, 365, py, 'inout', 'macro_bottom_right', 'M1');
    const netSegs: RoutingSegment[] = [];
    const netVias: RoutingVia[] = [];

    const dropX = 330 - idx * 12;
    // Horizontal stub into south-east corridor on M2
    netSegs.push(addSegment(netId, { x: 365, y: py }, { x: dropX, y: py }, 'M2', 2.8));
    netVias.push(addVia(dropX, py, 'M2', 'M3', netId));

    // Vertical line connecting to lower south buses
    netSegs.push(addSegment(netId, { x: dropX, y: py }, { x: dropX, y: 590 }, 'M3', 2.8));
    netVias.push(addVia(dropX, 590, 'M3', 'M2', netId));
    netSegs.push(addSegment(netId, { x: dropX, y: 590 }, { x: 260, y: 590 }, 'M2', 2.8));

    const pEnd = addPin(`S_PORT_${idx}`, 260, 590, 'input', 'core_cell', 'M1');

    nets.push({
      id: netId,
      name: `SIDE_PORT[${idx}]`,
      busGroup: 'SIDE_PORTS',
      color: '#10B981',
      sourcePin: pStart,
      sinkPins: [pEnd],
      segments: netSegs,
      vias: netVias,
      totalLengthUm: 190,
      totalDelayPs: 18.4,
      totalCapacitanceFf: 34.2,
      totalResistanceOhm: 12.8,
      antennaRatio: 158,
      isCritical: false,
      drcStatus: 'CLEAN'
    });
  });

  // Additional pins on inner edge of Bottom-Left Macro: x = 175, y = 490, 510, 530, 550, 570
  [490, 510, 530, 550, 570].forEach((py, idx) => {
    const netId = `BL_SIDE_${idx}`;
    const pStart = addPin(`BL_SIDE_${idx}`, 175, py, 'inout', 'macro_bottom_left', 'M1');
    const netSegs: RoutingSegment[] = [];
    const netVias: RoutingVia[] = [];

    const dropX = 205 + idx * 12;
    netSegs.push(addSegment(netId, { x: 175, y: py }, { x: dropX, y: py }, 'M2', 2.8));
    netVias.push(addVia(dropX, py, 'M2', 'M3', netId));
    netSegs.push(addSegment(netId, { x: dropX, y: py }, { x: dropX, y: 590 }, 'M3', 2.8));
    netVias.push(addVia(dropX, 590, 'M3', 'M2', netId));
    netSegs.push(addSegment(netId, { x: dropX, y: 590 }, { x: 250, y: 590 }, 'M2', 2.8));

    const pEnd = addPin(`S_L_PORT_${idx}`, 250, 590, 'input', 'core_cell', 'M1');

    nets.push({
      id: netId,
      name: `BL_SIDE_PORT[${idx}]`,
      busGroup: 'SIDE_PORTS',
      color: '#10B981',
      sourcePin: pStart,
      sinkPins: [pEnd],
      segments: netSegs,
      vias: netVias,
      totalLengthUm: 195,
      totalDelayPs: 18.9,
      totalCapacitanceFf: 35.1,
      totalResistanceOhm: 13.2,
      antennaRatio: 162,
      isCritical: false,
      drcStatus: 'CLEAN'
    });
  });

  // BUNDLE 3: Dense North Corridor Horizontal Mesh (connecting across north channel above Core Area)
  // Matching the dense green horizontal lines with pink vias in the reference image
  const northYTracks = [55, 70, 85, 100, 115, 130, 145, 160, 175, 190, 205, 220];
  northYTracks.forEach((ny, idx) => {
    const netId = `NORTH_BUS_${idx}`;
    const pStart = addPin(`TL_N${idx}`, 185, ny, 'output', 'macro_top_left', 'M2');
    const pEnd = addPin(`TR_N${idx}`, 345, ny, 'input', 'macro_top_right', 'M2');

    const netSegs: RoutingSegment[] = [];
    const netVias: RoutingVia[] = [];

    // Horizontal line spanning across north channel on M2
    netSegs.push(addSegment(netId, { x: 185, y: ny }, { x: 345, y: ny }, 'M2', 2.8));

    // Vertical tap down into CORE AREA on alternating nets
    if (idx % 2 === 0) {
      const tapX = 210 + (idx % 5) * 28;
      netVias.push(addVia(tapX, ny, 'M2', 'M3', netId));
      netSegs.push(addSegment(netId, { x: tapX, y: ny }, { x: tapX, y: 260 }, 'M3', 2.6));
      netVias.push(addVia(tapX, 260, 'M3', 'M1', netId));
    }

    // Top via connection on right
    netVias.push(addVia(345, ny, 'M2', 'M3', netId));

    nets.push({
      id: netId,
      name: `MEM_BUS[${idx}]`,
      busGroup: 'MEM_BUS',
      color: '#10B981',
      sourcePin: pStart,
      sinkPins: [pEnd],
      segments: netSegs,
      vias: netVias,
      totalLengthUm: 160 + (idx % 2 === 0 ? 100 : 0),
      totalDelayPs: 15.2,
      totalCapacitanceFf: 28.8,
      totalResistanceOhm: 9.6,
      antennaRatio: 133,
      isCritical: idx < 4,
      drcStatus: 'CLEAN'
    });
  });

  // BUNDLE 4: Long Vertical Spine Net connecting North to South Corridor (Right side of Core Area)
  // Notice in the reference image: a prominent vertical green routing trunk along x = 325-335 with pink vias
  const spineNetId = 'VERTICAL_BUS_SPINE';
  const spineSegs: RoutingSegment[] = [];
  const spineVias: RoutingVia[] = [];

  const pSpineStart = addPin('NORTH_SYNC_ROOT', 320, 50, 'output', 'core_cell', 'M3');
  spineSegs.push(addSegment(spineNetId, { x: 320, y: 50 }, { x: 320, y: 390 }, 'M3', 3.6));

  // Intermediate taps with vias into Core Area & South
  [120, 190, 240, 280, 340].forEach((tapY) => {
    spineVias.push(addVia(320, tapY, 'M3', 'M2', spineNetId));
    spineSegs.push(addSegment(spineNetId, { x: 320, y: tapY }, { x: 280, y: tapY }, 'M2', 2.6));
    spineVias.push(addVia(280, tapY, 'M2', 'M1', spineNetId));
  });

  const pSpineEnd = addPin('SOUTH_SYNC_DEST', 320, 390, 'input', 'core_cell', 'M3');

  nets.push({
    id: spineNetId,
    name: 'GLOBAL_SYNC_TRUNK',
    busGroup: 'CONTROL',
    color: '#10B981',
    sourcePin: pSpineStart,
    sinkPins: [pSpineEnd],
    segments: spineSegs,
    vias: spineVias,
    totalLengthUm: 490,
    totalDelayPs: 32.1,
    totalCapacitanceFf: 88.2,
    totalResistanceOhm: 26.4,
    antennaRatio: 245,
    isCritical: true,
    drcStatus: 'CLEAN'
  });

  // Assign pins to macros
  macros[0].pins = allPins.filter(p => p.ownerId === 'macro_top_left');
  macros[1].pins = allPins.filter(p => p.ownerId === 'macro_top_right');
  macros[2].pins = allPins.filter(p => p.ownerId === 'macro_bottom_left');
  macros[3].pins = allPins.filter(p => p.ownerId === 'macro_bottom_right');

  // -------------------------------------------------------------
  // 5. Generate Global Routing Grid (G-Cells) & Congestion Heatmap
  // -------------------------------------------------------------
  const gCells: GCell[] = [];
  const gCellCols = 12;
  const gCellRows = 14;
  const dieW = 540;
  const dieH = 640;
  const cellW = dieW / gCellCols;
  const cellH = dieH / gCellRows;

  for (let r = 0; r < gCellRows; r++) {
    for (let c = 0; c < gCellCols; c++) {
      const cx = c * cellW;
      const cy = r * cellH;

      // Check if G-cell overlaps a macro (routing blockage on lower metals)
      const overlapsMacro = macros.some(m =>
        cx + cellW > m.x && cx < m.x + m.width &&
        cy + cellH > m.y && cy < m.y + m.height
      );

      // Routing capacity (macros have 0 lower metal capacity, corridors have 20-30 tracks)
      const baseCap = overlapsMacro ? 4 : 26;
      
      // Calculate wire usage in this G-cell
      const wireCount = allSegments.filter(s => {
        const segMinX = Math.min(s.from.x, s.to.x);
        const segMaxX = Math.max(s.from.x, s.to.x);
        const segMinY = Math.min(s.from.y, s.to.y);
        const segMaxY = Math.max(s.from.y, s.to.y);
        return !(segMaxX < cx || segMinX > cx + cellW || segMaxY < cy || segMinY > cy + cellH);
      }).length;

      const horizUsage = Math.min(baseCap, Math.round(wireCount * 0.55));
      const vertUsage = Math.min(baseCap, Math.round(wireCount * 0.45));
      const totalUsage = horizUsage + vertUsage;
      const totalCap = baseCap * 2;
      const congestionScore = Math.min(1.4, totalUsage / Math.max(1, totalCap * 0.85));

      gCells.push({
        x: cx,
        y: cy,
        width: cellW,
        height: cellH,
        row: r,
        col: c,
        horizontalCapacity: baseCap,
        horizontalUsage: horizUsage,
        verticalCapacity: baseCap,
        verticalUsage: vertUsage,
        congestionScore: Math.round(congestionScore * 100) / 100
      });
    }
  }

  // -------------------------------------------------------------
  // 6. Aggregate Physical Statistics & Metrics
  // -------------------------------------------------------------
  const totalWirelengthUm = allSegments.reduce((sum, s) => sum + s.lengthUm, 0);
  const totalWirelengthMm = Math.round((totalWirelengthUm / 1000) * 100) / 100;

  const layerWirelengthMm: Record<string, number> = {
    M1: 0,
    M2: 0,
    M3: 0,
    M4: 0,
    M5: 0,
    M6: 0
  };

  allSegments.forEach(s => {
    layerWirelengthMm[s.layer] = Math.round(((layerWirelengthMm[s.layer] || 0) + s.lengthUm / 1000) * 100) / 100;
  });

  const congestionScores = gCells.map(g => g.congestionScore);
  const maxCongestion = Math.max(...congestionScores);
  const avgCongestion = congestionScores.reduce((a, b) => a + b, 0) / congestionScores.length;

  return {
    macros,
    coreArea,
    placementCorridors,
    ctsUnderlay,
    nets,
    allSegments,
    allVias,
    allPins,
    gCells,
    statistics: {
      totalWirelengthMm,
      totalViaCount: allVias.length,
      totalNets: nets.length,
      routedPercentage: 100.0,
      layerWirelengthMm,
      drcShorts: 0,
      drcSpacingViolations: 0,
      maxAntennaRatio: Math.max(...nets.map(n => n.antennaRatio)),
      antennaThreshold: 400,
      worstNetDelayPs: Math.max(...nets.map(n => n.totalDelayPs)),
      averageCongestionPercent: Math.round(avgCongestion * 100),
      maxCongestionPercent: Math.round(maxCongestion * 100)
    }
  };
}

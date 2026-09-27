// Advanced Static Timing Analysis (STA) Engine
// Implements Multi-Corner Multi-Mode (MCMM), POCV, Slew/Cap models, and interactive ECO optimization

export type PVTCornerId = 'SS_0.63V_125C' | 'FF_0.77V_-40C' | 'TT_0.70V_25C' | 'SS_0.63V_-40C_INV';
export type OperatingMode = 'func_500mhz' | 'scan_shift_50mhz';
export type DerateMode = 'none' | 'aocv' | 'pocv_3sigma';
export type PathCategory = 'reg2reg' | 'in2reg' | 'reg2out' | 'in2out';
export type CellVt = 'HVT' | 'SVT' | 'LVT' | 'ULVT';

export interface PVTCorner {
  id: PVTCornerId;
  name: string;
  process: string;
  voltageV: number;
  temperatureC: number;
  description: string;
  delayFactor: number;
  setupDerate: number;
  holdDerate: number;
  isTempInversion?: boolean;
}

export const PVT_CORNERS: Record<PVTCornerId, PVTCorner> = {
  'SS_0.63V_125C': {
    id: 'SS_0.63V_125C',
    name: 'Slow-Slow (SS) 0.63V 125°C',
    process: 'Slow-Slow (SS)',
    voltageV: 0.63,
    temperatureC: 125,
    description: 'Worst-case setup corner: High temperature, minimum voltage, slow silicon foundry corner.',
    delayFactor: 1.34,
    setupDerate: 1.08,
    holdDerate: 0.92
  },
  'FF_0.77V_-40C': {
    id: 'FF_0.77V_-40C',
    name: 'Fast-Fast (FF) 0.77V -40°C',
    process: 'Fast-Fast (FF)',
    voltageV: 0.77,
    temperatureC: -40,
    description: 'Worst-case hold corner: Sub-zero temperature, maximum voltage, maximum carrier mobility.',
    delayFactor: 0.74,
    setupDerate: 0.94,
    holdDerate: 1.06
  },
  'TT_0.70V_25C': {
    id: 'TT_0.70V_25C',
    name: 'Typical-Typical (TT) 0.70V 25°C',
    process: 'Typical-Typical (TT)',
    voltageV: 0.70,
    temperatureC: 25,
    description: 'Nominal typical operating condition at room temperature.',
    delayFactor: 1.0,
    setupDerate: 1.0,
    holdDerate: 1.0
  },
  'SS_0.63V_-40C_INV': {
    id: 'SS_0.63V_-40C_INV',
    name: 'FinFET Temperature Inversion (SS -40°C)',
    process: 'Slow-Slow (SS)',
    voltageV: 0.63,
    temperatureC: -40,
    description: 'Advanced sub-7nm FinFET effect: High threshold voltage at freezing temperature causes inverted delay slowdown.',
    delayFactor: 1.41,
    setupDerate: 1.10,
    holdDerate: 0.90,
    isTempInversion: true
  }
};

export interface TimingPoint {
  id: string;
  pin: string;
  cellInstance: string;
  cellType: string;
  edge: 'rise' | 'fall';
  slewPs: number;
  cellDelayPs: number;
  netDelayPs: number;
  arrivalPs: number;
  fanout: number;
  loadCapFf: number;
  vt: CellVt;
  driveStrength: number; // e.g. 1, 2, 4, 8
  isDelayBuffer?: boolean;
}

export interface TimingPath {
  id: string;
  name: string;
  category: PathCategory;
  launchFlop: string;
  captureFlop: string;
  launchClock: string;
  captureClock: string;
  targetClockFreqMhz: number;
  clockPeriodPs: number;
  launchClockLatencyPs: number;
  captureClockLatencyPs: number;
  clockSkewPs: number;
  clockUncertaintyPs: number;
  clockJitterPs: number;
  dataPoints: TimingPoint[];
  tSetupPs: number;
  tHoldPs: number;
  // Calculated dynamically
  dataArrivalPs: number;
  dataRequiredSetupPs: number;
  dataRequiredHoldPs: number;
  setupSlackPs: number;
  holdSlackPs: number;
  setupStatus: 'MET' | 'VIOLATED';
  holdStatus: 'MET' | 'VIOLATED';
  maxSlewViolation: boolean;
  maxCapViolation: boolean;
}

export interface STAEvaluationResult {
  paths: TimingPath[];
  criticalSetupPath: TimingPath;
  criticalHoldPath: TimingPath;
  metrics: {
    wnsSetupPs: number;
    tnsSetupPs: number;
    fepSetup: number;
    wnsHoldPs: number;
    tnsHoldPs: number;
    fepHold: number;
    maxFrequencyMhz: number;
    totalPathsAnalyzed: number;
    drcTransitionViolations: number;
    drcCapacitanceViolations: number;
  };
  histogram: { rangeLabel: string; count: number; isNegative: boolean; paths: TimingPath[] }[];
}

// Generate rich, realistic base timing paths for the active DUT
export function createBaseTimingPaths(icId: string = '7476'): TimingPath[] {
  const isMux = icId === '74151' || icId === '74153' || icId.includes('mux');

  if (isMux) {
    // SN74151 8-Line Multiplexer / Selector Timing Paths
    return [
      {
        id: 'MUX_PATH_01_SELECT_CRITICAL',
        name: 'REG_SEL[2] → Inverter → AND8_Tree → REG_OUT_Y (Critical Setup Path)',
        category: 'reg2reg',
        launchFlop: 'U_REGBANK_SEL/S2_reg',
        captureFlop: 'U_OUT_REG/Y_reg',
        launchClock: 'CLK (Rising)',
        captureClock: 'CLK (Rising)',
        targetClockFreqMhz: 500,
        clockPeriodPs: 2000,
        launchClockLatencyPs: 220,
        captureClockLatencyPs: 245,
        clockSkewPs: 25,
        clockUncertaintyPs: 45,
        clockJitterPs: 20,
        tSetupPs: 75,
        tHoldPs: 35,
        dataPoints: [
          {
            id: 'm0',
            pin: 'CLK',
            cellInstance: 'U_CTS_ROOT',
            cellType: 'CLKBUF_X8',
            edge: 'rise',
            slewPs: 26,
            cellDelayPs: 0,
            netDelayPs: 16,
            arrivalPs: 220,
            fanout: 10,
            loadCapFf: 38.0,
            vt: 'SVT',
            driveStrength: 8
          },
          {
            id: 'm1',
            pin: 'U_REGBANK_SEL/S2_reg/Q',
            cellInstance: 'U_REGBANK_SEL/S2_reg',
            cellType: 'DFF_X2',
            edge: 'rise',
            slewPs: 38,
            cellDelayPs: 120,
            netDelayPs: 28,
            arrivalPs: 368,
            fanout: 6,
            loadCapFf: 28.5,
            vt: 'SVT',
            driveStrength: 2
          },
          {
            id: 'm2',
            pin: 'U_INV_S2/A',
            cellInstance: 'U_INV_S2',
            cellType: 'INV_X1',
            edge: 'fall',
            slewPs: 64,
            cellDelayPs: 135,
            netDelayPs: 36,
            arrivalPs: 539,
            fanout: 8,
            loadCapFf: 34.2,
            vt: 'HVT',
            driveStrength: 1
          },
          {
            id: 'm3',
            pin: 'U_AND4_STAGE1/A',
            cellInstance: 'U_AND4_STAGE1',
            cellType: 'AND4_X1',
            edge: 'fall',
            slewPs: 72,
            cellDelayPs: 195,
            netDelayPs: 42,
            arrivalPs: 776,
            fanout: 2,
            loadCapFf: 32.0,
            vt: 'HVT',
            driveStrength: 1
          },
          {
            id: 'm4',
            pin: 'U_NOR8_COMB/D3',
            cellInstance: 'U_NOR8_COMB',
            cellType: 'NOR8_X1',
            edge: 'rise',
            slewPs: 85,
            cellDelayPs: 235,
            netDelayPs: 48,
            arrivalPs: 1059,
            fanout: 2,
            loadCapFf: 36.5,
            vt: 'HVT',
            driveStrength: 1
          },
          {
            id: 'm5',
            pin: 'U_INV_OUT_Y/A',
            cellInstance: 'U_INV_OUT_Y',
            cellType: 'INV_X2',
            edge: 'fall',
            slewPs: 40,
            cellDelayPs: 78,
            netDelayPs: 22,
            arrivalPs: 1159,
            fanout: 1,
            loadCapFf: 12.0,
            vt: 'SVT',
            driveStrength: 2
          },
          {
            id: 'm6',
            pin: 'U_OUT_REG/Y_reg/D',
            cellInstance: 'U_OUT_REG/Y_reg',
            cellType: 'DFF_X2',
            edge: 'fall',
            slewPs: 42,
            cellDelayPs: 0,
            netDelayPs: 10,
            arrivalPs: 1169,
            fanout: 1,
            loadCapFf: 8.5,
            vt: 'SVT',
            driveStrength: 2
          }
        ],
        dataArrivalPs: 0,
        dataRequiredSetupPs: 0,
        dataRequiredHoldPs: 0,
        setupSlackPs: 0,
        holdSlackPs: 0,
        setupStatus: 'MET',
        holdStatus: 'MET',
        maxSlewViolation: false,
        maxCapViolation: false
      },
      {
        id: 'MUX_PATH_02_HOLD_RACE',
        name: 'REG_D[0] → Fast Gate → REG_BUF (Hold Race Path)',
        category: 'reg2reg',
        launchFlop: 'U_REGBANK_D/D0_reg',
        captureFlop: 'U_STAGE2_REG/D0_lat',
        launchClock: 'CLK (Rising)',
        captureClock: 'CLK (Rising)',
        targetClockFreqMhz: 500,
        clockPeriodPs: 2000,
        launchClockLatencyPs: 240,
        captureClockLatencyPs: 225,
        clockSkewPs: -15,
        clockUncertaintyPs: 35,
        clockJitterPs: 15,
        tSetupPs: 60,
        tHoldPs: 55,
        dataPoints: [
          {
            id: 'h0',
            pin: 'CLK',
            cellInstance: 'U_CTS_ROOT',
            cellType: 'CLKBUF_X8',
            edge: 'rise',
            slewPs: 24,
            cellDelayPs: 0,
            netDelayPs: 12,
            arrivalPs: 240,
            fanout: 8,
            loadCapFf: 25.0,
            vt: 'LVT',
            driveStrength: 8
          },
          {
            id: 'h1',
            pin: 'U_REGBANK_D/D0_reg/Q',
            cellInstance: 'U_REGBANK_D/D0_reg',
            cellType: 'DFF_X4',
            edge: 'rise',
            slewPs: 25,
            cellDelayPs: 65,
            netDelayPs: 10,
            arrivalPs: 315,
            fanout: 1,
            loadCapFf: 8.0,
            vt: 'LVT',
            driveStrength: 4
          },
          {
            id: 'h2',
            pin: 'U_BUF_FAST_BYPASS/A',
            cellInstance: 'U_BUF_FAST_BYPASS',
            cellType: 'BUF_X4',
            edge: 'rise',
            slewPs: 22,
            cellDelayPs: 42,
            netDelayPs: 8,
            arrivalPs: 365,
            fanout: 1,
            loadCapFf: 7.5,
            vt: 'LVT',
            driveStrength: 4
          }
        ],
        dataArrivalPs: 0,
        dataRequiredSetupPs: 0,
        dataRequiredHoldPs: 0,
        setupSlackPs: 0,
        holdSlackPs: 0,
        setupStatus: 'MET',
        holdStatus: 'MET',
        maxSlewViolation: false,
        maxCapViolation: false
      },
      {
        id: 'MUX_PATH_03_STROBE_IN2REG',
        name: 'PIN_STROBE_G → Inverter → AND_Gates → REG_OUT_W',
        category: 'in2reg',
        launchFlop: 'PIN_STROBE_G_PORT',
        captureFlop: 'U_OUT_REG/W_reg',
        launchClock: 'CLK_VIRTUAL',
        captureClock: 'CLK (Rising)',
        targetClockFreqMhz: 500,
        clockPeriodPs: 2000,
        launchClockLatencyPs: 100,
        captureClockLatencyPs: 235,
        clockSkewPs: 135,
        clockUncertaintyPs: 50,
        clockJitterPs: 20,
        tSetupPs: 70,
        tHoldPs: 30,
        dataPoints: [
          {
            id: 'st0',
            pin: 'PIN_G',
            cellInstance: 'IO_PAD_STROBE',
            cellType: 'INPAD_X1',
            edge: 'rise',
            slewPs: 45,
            cellDelayPs: 85,
            netDelayPs: 40,
            arrivalPs: 225,
            fanout: 3,
            loadCapFf: 22.0,
            vt: 'SVT',
            driveStrength: 1
          },
          {
            id: 'st1',
            pin: 'U_INV_STROBE/A',
            cellInstance: 'U_INV_STROBE',
            cellType: 'INV_X2',
            edge: 'fall',
            slewPs: 36,
            cellDelayPs: 82,
            netDelayPs: 25,
            arrivalPs: 332,
            fanout: 4,
            loadCapFf: 18.0,
            vt: 'SVT',
            driveStrength: 2
          },
          {
            id: 'st2',
            pin: 'U_NAND_W_ENABLE/A',
            cellInstance: 'U_NAND_W_ENABLE',
            cellType: 'NAND2_X2',
            edge: 'rise',
            slewPs: 42,
            cellDelayPs: 110,
            netDelayPs: 20,
            arrivalPs: 462,
            fanout: 1,
            loadCapFf: 11.0,
            vt: 'SVT',
            driveStrength: 2
          }
        ],
        dataArrivalPs: 0,
        dataRequiredSetupPs: 0,
        dataRequiredHoldPs: 0,
        setupSlackPs: 0,
        holdSlackPs: 0,
        setupStatus: 'MET',
        holdStatus: 'MET',
        maxSlewViolation: false,
        maxCapViolation: false
      },
      {
        id: 'MUX_PATH_04_OUT_REG2OUT',
        name: 'REG_OUT_Y/Q → Output Driver → PIN_Y_PAD',
        category: 'reg2out',
        launchFlop: 'U_OUT_REG/Y_reg',
        captureFlop: 'PIN_Y_OUT_PORT',
        launchClock: 'CLK (Rising)',
        captureClock: 'CLK_VIRTUAL',
        targetClockFreqMhz: 500,
        clockPeriodPs: 2000,
        launchClockLatencyPs: 245,
        captureClockLatencyPs: 100,
        clockSkewPs: -145,
        clockUncertaintyPs: 50,
        clockJitterPs: 20,
        tSetupPs: 80,
        tHoldPs: 35,
        dataPoints: [
          {
            id: 'ro0',
            pin: 'U_OUT_REG/Y_reg/Q',
            cellInstance: 'U_OUT_REG/Y_reg',
            cellType: 'DFF_X2',
            edge: 'rise',
            slewPs: 34,
            cellDelayPs: 110,
            netDelayPs: 24,
            arrivalPs: 379,
            fanout: 2,
            loadCapFf: 18.0,
            vt: 'SVT',
            driveStrength: 2
          },
          {
            id: 'ro1',
            pin: 'U_PAD_DRIVER_Y/A',
            cellInstance: 'U_PAD_DRIVER_Y',
            cellType: 'BUF_X8',
            edge: 'rise',
            slewPs: 28,
            cellDelayPs: 65,
            netDelayPs: 38,
            arrivalPs: 482,
            fanout: 1,
            loadCapFf: 45.0,
            vt: 'SVT',
            driveStrength: 8
          }
        ],
        dataArrivalPs: 0,
        dataRequiredSetupPs: 0,
        dataRequiredHoldPs: 0,
        setupSlackPs: 0,
        holdSlackPs: 0,
        setupStatus: 'MET',
        holdStatus: 'MET',
        maxSlewViolation: false,
        maxCapViolation: false
      },
      // Additional parallel data paths to populate a rich distribution
      ...[1, 2, 3, 4, 5, 6, 7].map(idx => ({
        id: `MUX_PATH_DATA_${idx}`,
        name: `REG_D[${idx}] → Mux_Slice_${idx} → REG_OUT_Y`,
        category: 'reg2reg' as const,
        launchFlop: `U_REGBANK_D/D${idx}_reg`,
        captureFlop: 'U_OUT_REG/Y_reg',
        launchClock: 'CLK (Rising)',
        captureClock: 'CLK (Rising)',
        targetClockFreqMhz: 500,
        clockPeriodPs: 2000,
        launchClockLatencyPs: 220 + idx * 4,
        captureClockLatencyPs: 245,
        clockSkewPs: 25 - idx * 4,
        clockUncertaintyPs: 45,
        clockJitterPs: 20,
        tSetupPs: 70,
        tHoldPs: 40,
        dataPoints: [
          {
            id: `d_pt_${idx}_0`,
            pin: `U_REGBANK_D/D${idx}_reg/Q`,
            cellInstance: `U_REGBANK_D/D${idx}_reg`,
            cellType: 'DFF_X2',
            edge: 'rise' as const,
            slewPs: 36,
            cellDelayPs: 112,
            netDelayPs: 24,
            arrivalPs: 356 + idx * 15,
            fanout: 2,
            loadCapFf: 18.0,
            vt: 'SVT' as const,
            driveStrength: 2
          },
          {
            id: `d_pt_${idx}_1`,
            pin: `U_NAND_D${idx}/A`,
            cellInstance: `U_NAND_D${idx}`,
            cellType: 'NAND4_X2',
            edge: 'fall' as const,
            slewPs: 48,
            cellDelayPs: 135 + idx * 8,
            netDelayPs: 30,
            arrivalPs: 521 + idx * 23,
            fanout: 1,
            loadCapFf: 22.0,
            vt: 'SVT' as const,
            driveStrength: 2
          },
          {
            id: `d_pt_${idx}_2`,
            pin: `U_NOR_MERGE_${idx}/A`,
            cellInstance: `U_NOR_MERGE_${idx}`,
            cellType: 'NOR2_X2',
            edge: 'rise' as const,
            slewPs: 52,
            cellDelayPs: 140,
            netDelayPs: 25,
            arrivalPs: 686 + idx * 23,
            fanout: 1,
            loadCapFf: 16.0,
            vt: 'SVT' as const,
            driveStrength: 2
          }
        ],
        dataArrivalPs: 0,
        dataRequiredSetupPs: 0,
        dataRequiredHoldPs: 0,
        setupSlackPs: 0,
        holdSlackPs: 0,
        setupStatus: 'MET' as const,
        holdStatus: 'MET' as const,
        maxSlewViolation: false,
        maxCapViolation: false
      }))
    ];
  }

  // SN7476 / Standard Sequential Circuit Base Paths
  return [
    {
      id: 'PATH_001_REG2REG_CRITICAL',
      name: 'FF1_Q → Comb_Logic → FF2_D (Critical Setup Path)',
      category: 'reg2reg',
      launchFlop: 'U_JK_FF1/REG_Q',
      captureFlop: 'U_JK_FF2/REG_D',
      launchClock: 'CLK (Rising)',
      captureClock: 'CLK (Rising)',
      targetClockFreqMhz: 500,
      clockPeriodPs: 2000,
      launchClockLatencyPs: 240,
      captureClockLatencyPs: 265,
      clockSkewPs: 25,
      clockUncertaintyPs: 50,
      clockJitterPs: 20,
      tSetupPs: 70,
      tHoldPs: 35,
      dataPoints: [
        {
          id: 'tp_0',
          pin: 'CLK',
          cellInstance: 'U_CLK_ROOT',
          cellType: 'CLKBUF_X8',
          edge: 'rise',
          slewPs: 28,
          cellDelayPs: 0,
          netDelayPs: 18,
          arrivalPs: 240,
          fanout: 12,
          loadCapFf: 45.2,
          vt: 'SVT',
          driveStrength: 8
        },
        {
          id: 'tp_1',
          pin: 'U_JK_FF1/CLK',
          cellInstance: 'U_JK_FF1',
          cellType: 'DFF_X2',
          edge: 'rise',
          slewPs: 35,
          cellDelayPs: 115,
          netDelayPs: 22,
          arrivalPs: 377,
          fanout: 4,
          loadCapFf: 18.5,
          vt: 'SVT',
          driveStrength: 2
        },
        {
          id: 'tp_2',
          pin: 'U_GATE_NAND2_1/A',
          cellInstance: 'U_GATE_NAND2_1',
          cellType: 'NAND2_X1',
          edge: 'fall',
          slewPs: 58,
          cellDelayPs: 140,
          netDelayPs: 34,
          arrivalPs: 551,
          fanout: 3,
          loadCapFf: 22.8,
          vt: 'HVT',
          driveStrength: 1
        },
        {
          id: 'tp_3',
          pin: 'U_GATE_NOR2_1/B',
          cellInstance: 'U_GATE_NOR2_1',
          cellType: 'NOR2_X1',
          edge: 'rise',
          slewPs: 64,
          cellDelayPs: 155,
          netDelayPs: 38,
          arrivalPs: 744,
          fanout: 2,
          loadCapFf: 26.4,
          vt: 'HVT',
          driveStrength: 1
        },
        {
          id: 'tp_4',
          pin: 'U_BUF_ISO/A',
          cellInstance: 'U_BUF_ISO',
          cellType: 'BUF_X2',
          edge: 'rise',
          slewPs: 42,
          cellDelayPs: 85,
          netDelayPs: 28,
          arrivalPs: 857,
          fanout: 2,
          loadCapFf: 16.2,
          vt: 'SVT',
          driveStrength: 2
        },
        {
          id: 'tp_5',
          pin: 'U_MUX2_1/S0',
          cellInstance: 'U_MUX2_1',
          cellType: 'MUX2_X1',
          edge: 'fall',
          slewPs: 68,
          cellDelayPs: 175,
          netDelayPs: 42,
          arrivalPs: 1074,
          fanout: 1,
          loadCapFf: 29.5,
          vt: 'HVT',
          driveStrength: 1
        },
        {
          id: 'tp_6',
          pin: 'U_JK_FF2/D',
          cellInstance: 'U_JK_FF2',
          cellType: 'DFF_X2',
          edge: 'rise',
          slewPs: 48,
          cellDelayPs: 0,
          netDelayPs: 15,
          arrivalPs: 1089,
          fanout: 1,
          loadCapFf: 8.5,
          vt: 'SVT',
          driveStrength: 2
        }
      ],
      dataArrivalPs: 0,
      dataRequiredSetupPs: 0,
      dataRequiredHoldPs: 0,
      setupSlackPs: 0,
      holdSlackPs: 0,
      setupStatus: 'MET',
      holdStatus: 'MET',
      maxSlewViolation: false,
      maxCapViolation: false
    },
    {
      id: 'PATH_002_IN2REG_FAST',
      name: 'PIN_J → Logic → FF1_D (Input Port Setup Path)',
      category: 'in2reg',
      launchFlop: 'PIN_J_PORT',
      captureFlop: 'U_JK_FF1/REG_D',
      launchClock: 'CLK_VIRTUAL',
      captureClock: 'CLK (Rising)',
      targetClockFreqMhz: 500,
      clockPeriodPs: 2000,
      launchClockLatencyPs: 100,
      captureClockLatencyPs: 240,
      clockSkewPs: 140,
      clockUncertaintyPs: 50,
      clockJitterPs: 20,
      tSetupPs: 65,
      tHoldPs: 30,
      dataPoints: [
        {
          id: 'in_0',
          pin: 'J_PAD',
          cellInstance: 'IO_PAD_J',
          cellType: 'INPAD_X1',
          edge: 'rise',
          slewPs: 45,
          cellDelayPs: 80,
          netDelayPs: 55,
          arrivalPs: 235,
          fanout: 2,
          loadCapFf: 24.0,
          vt: 'SVT',
          driveStrength: 1
        },
        {
          id: 'in_1',
          pin: 'U_NAND_J/A',
          cellInstance: 'U_NAND_J',
          cellType: 'NAND2_X2',
          edge: 'fall',
          slewPs: 38,
          cellDelayPs: 92,
          netDelayPs: 25,
          arrivalPs: 352,
          fanout: 1,
          loadCapFf: 14.5,
          vt: 'SVT',
          driveStrength: 2
        },
        {
          id: 'in_2',
          pin: 'U_JK_FF1/D',
          cellInstance: 'U_JK_FF1',
          cellType: 'DFF_X2',
          edge: 'fall',
          slewPs: 42,
          cellDelayPs: 0,
          netDelayPs: 12,
          arrivalPs: 364,
          fanout: 1,
          loadCapFf: 8.5,
          vt: 'SVT',
          driveStrength: 2
        }
      ],
      dataArrivalPs: 0,
      dataRequiredSetupPs: 0,
      dataRequiredHoldPs: 0,
      setupSlackPs: 0,
      holdSlackPs: 0,
      setupStatus: 'MET',
      holdStatus: 'MET',
      maxSlewViolation: false,
      maxCapViolation: false
    },
    {
      id: 'PATH_003_REG2REG_HOLD_SENSITIVE',
      name: 'FF2_Q → Fast Inverter → FF2_D (Hold Race Path)',
      category: 'reg2reg',
      launchFlop: 'U_JK_FF2/REG_Q',
      captureFlop: 'U_JK_FF2/REG_D',
      launchClock: 'CLK (Rising)',
      captureClock: 'CLK (Rising)',
      targetClockFreqMhz: 500,
      clockPeriodPs: 2000,
      launchClockLatencyPs: 265,
      captureClockLatencyPs: 235,
      clockSkewPs: -30,
      clockUncertaintyPs: 35,
      clockJitterPs: 15,
      tSetupPs: 70,
      tHoldPs: 55,
      dataPoints: [
        {
          id: 'h_0',
          pin: 'CLK',
          cellInstance: 'U_CLK_TREE',
          cellType: 'CLKBUF_X8',
          edge: 'rise',
          slewPs: 26,
          cellDelayPs: 0,
          netDelayPs: 15,
          arrivalPs: 265,
          fanout: 8,
          loadCapFf: 32.0,
          vt: 'LVT',
          driveStrength: 8
        },
        {
          id: 'h_1',
          pin: 'U_JK_FF2/Q',
          cellInstance: 'U_JK_FF2',
          cellType: 'DFF_X4',
          edge: 'rise',
          slewPs: 28,
          cellDelayPs: 72,
          netDelayPs: 12,
          arrivalPs: 349,
          fanout: 1,
          loadCapFf: 9.2,
          vt: 'LVT',
          driveStrength: 4
        },
        {
          id: 'h_2',
          pin: 'U_INV_FEEDBACK/A',
          cellInstance: 'U_INV_FEEDBACK',
          cellType: 'INV_X4',
          edge: 'fall',
          slewPs: 24,
          cellDelayPs: 45,
          netDelayPs: 10,
          arrivalPs: 404,
          fanout: 1,
          loadCapFf: 8.5,
          vt: 'LVT',
          driveStrength: 4
        }
      ],
      dataArrivalPs: 0,
      dataRequiredSetupPs: 0,
      dataRequiredHoldPs: 0,
      setupSlackPs: 0,
      holdSlackPs: 0,
      setupStatus: 'MET',
      holdStatus: 'MET',
      maxSlewViolation: false,
      maxCapViolation: false
    },
    {
      id: 'PATH_004_REG2OUT',
      name: 'FF1_Q → Buffer → PIN_Q_OUT (Output Port Path)',
      category: 'reg2out',
      launchFlop: 'U_JK_FF1/REG_Q',
      captureFlop: 'PIN_1Q_PORT',
      launchClock: 'CLK (Rising)',
      captureClock: 'CLK_VIRTUAL',
      targetClockFreqMhz: 500,
      clockPeriodPs: 2000,
      launchClockLatencyPs: 240,
      captureClockLatencyPs: 120,
      clockSkewPs: -120,
      clockUncertaintyPs: 50,
      clockJitterPs: 20,
      tSetupPs: 80,
      tHoldPs: 35,
      dataPoints: [
        {
          id: 'ro_0',
          pin: 'U_JK_FF1/Q',
          cellInstance: 'U_JK_FF1',
          cellType: 'DFF_X2',
          edge: 'rise',
          slewPs: 35,
          cellDelayPs: 115,
          netDelayPs: 25,
          arrivalPs: 380,
          fanout: 3,
          loadCapFf: 16.0,
          vt: 'SVT',
          driveStrength: 2
        },
        {
          id: 'ro_1',
          pin: 'U_OUTBUF_Q1/A',
          cellInstance: 'U_OUTBUF_Q1',
          cellType: 'BUF_X4',
          edge: 'rise',
          slewPs: 30,
          cellDelayPs: 68,
          netDelayPs: 45,
          arrivalPs: 493,
          fanout: 1,
          loadCapFf: 40.0,
          vt: 'SVT',
          driveStrength: 4
        },
        {
          id: 'ro_2',
          pin: 'PIN_1Q_OUT',
          cellInstance: 'PAD_OUT_1Q',
          cellType: 'OUTPAD_X1',
          edge: 'rise',
          slewPs: 52,
          cellDelayPs: 95,
          netDelayPs: 20,
          arrivalPs: 608,
          fanout: 1,
          loadCapFf: 50.0,
          vt: 'SVT',
          driveStrength: 1
        }
      ],
      dataArrivalPs: 0,
      dataRequiredSetupPs: 0,
      dataRequiredHoldPs: 0,
      setupSlackPs: 0,
      holdSlackPs: 0,
      setupStatus: 'MET',
      holdStatus: 'MET',
      maxSlewViolation: false,
      maxCapViolation: false
    },
    // Auxiliary paths to populate rich histogram distribution
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(idx => ({
      id: `PATH_AUX_${idx}`,
      name: `AUX_REG_${idx} → Logic_Stage_${idx} → AUX_DEST_${idx}`,
      category: 'reg2reg' as const,
      launchFlop: `U_AUX_REG_${idx}/Q`,
      captureFlop: `U_AUX_DEST_${idx}/D`,
      launchClock: 'CLK (Rising)',
      captureClock: 'CLK (Rising)',
      targetClockFreqMhz: 500,
      clockPeriodPs: 2000,
      launchClockLatencyPs: 230 + idx * 5,
      captureClockLatencyPs: 250,
      clockSkewPs: 20 - idx * 5,
      clockUncertaintyPs: 45,
      clockJitterPs: 18,
      tSetupPs: 65,
      tHoldPs: 40,
      dataPoints: [
        {
          id: `aux_pt_${idx}_0`,
          pin: `U_AUX_REG_${idx}/Q`,
          cellInstance: `U_AUX_REG_${idx}`,
          cellType: 'DFF_X2',
          edge: 'rise' as const,
          slewPs: 35,
          cellDelayPs: 105,
          netDelayPs: 20,
          arrivalPs: 355 + idx * 18,
          fanout: 2,
          loadCapFf: 15.0,
          vt: 'SVT' as const,
          driveStrength: 2
        },
        {
          id: `aux_pt_${idx}_1`,
          pin: `U_GATE_AUX_${idx}/A`,
          cellInstance: `U_GATE_AUX_${idx}`,
          cellType: 'NAND2_X2',
          edge: 'fall' as const,
          slewPs: 42,
          cellDelayPs: 120 + idx * 10,
          netDelayPs: 25,
          arrivalPs: 500 + idx * 28,
          fanout: 1,
          loadCapFf: 18.0,
          vt: 'SVT' as const,
          driveStrength: 2
        }
      ],
      dataArrivalPs: 0,
      dataRequiredSetupPs: 0,
      dataRequiredHoldPs: 0,
      setupSlackPs: 0,
      holdSlackPs: 0,
      setupStatus: 'MET' as const,
      holdStatus: 'MET' as const,
      maxSlewViolation: false,
      maxCapViolation: false
    }))
  ];
}

// Evaluate Timing with PVT corner, Frequency, AOCV/POCV, and ECO user modifications
export function evaluateSTA(
  basePaths: TimingPath[],
  targetFreqMhz: number,
  cornerId: PVTCornerId,
  derateMode: DerateMode,
  usefulSkewOffsetPs: number = 0,
  ecoOverrides: Record<string, { vt?: CellVt; driveStrength?: number; addedDelayPs?: number }> = {}
): STAEvaluationResult {
  const corner = PVT_CORNERS[cornerId];
  const clockPeriodPs = Math.round(1000000 / targetFreqMhz);

  // Derate scaling factors
  let setupDerate = corner.setupDerate;
  let holdDerate = corner.holdDerate;

  if (derateMode === 'none') {
    setupDerate = 1.0;
    holdDerate = 1.0;
  } else if (derateMode === 'pocv_3sigma') {
    setupDerate += 0.04;
    holdDerate -= 0.04;
  }

  const evaluatedPaths = basePaths.map((path) => {
    let runningArrival = path.launchClockLatencyPs;
    let pathAddedHoldDelay = 0;

    const scaledPoints = path.dataPoints.map((point) => {
      const override = ecoOverrides[point.cellInstance] || {};
      const currentVt = override.vt || point.vt;
      const currentDrive = override.driveStrength || point.driveStrength;

      // Vt speed scaling factor
      const vtFactor = currentVt === 'ULVT' ? 0.76 : currentVt === 'LVT' ? 0.86 : currentVt === 'SVT' ? 1.0 : 1.22;
      // Drive strength factor
      const driveFactor = Math.pow(point.driveStrength / currentDrive, 0.45);

      const addedDelay = override.addedDelayPs || 0;
      pathAddedHoldDelay += addedDelay;

      const rawCellDelay = point.cellDelayPs * vtFactor * driveFactor + addedDelay;
      const scaledCellDelay = Math.round(rawCellDelay * corner.delayFactor * setupDerate);
      const scaledNetDelay = Math.round(point.netDelayPs * corner.delayFactor * setupDerate);

      runningArrival += scaledCellDelay + scaledNetDelay;

      const scaledSlew = Math.round(point.slewPs * driveFactor * (corner.isTempInversion ? 1.15 : 1.0));

      return {
        ...point,
        vt: currentVt,
        driveStrength: currentDrive,
        slewPs: scaledSlew,
        cellDelayPs: scaledCellDelay,
        netDelayPs: scaledNetDelay,
        arrivalPs: runningArrival,
        isDelayBuffer: addedDelay > 0
      };
    });

    const dataArrivalPs = runningArrival;

    // Capture clock arrival with useful skew offset
    const captureLatency = path.captureClockLatencyPs + usefulSkewOffsetPs;
    const effectiveClockPeriod = path.category === 'in2out' ? 0 : clockPeriodPs;

    // Setup Equation: Data Required = T_period + T_capture_clk - T_setup - T_uncertainty
    const dataRequiredSetupPs = effectiveClockPeriod + captureLatency - Math.round(path.tSetupPs * corner.delayFactor) - path.clockUncertaintyPs;
    const setupSlackPs = dataRequiredSetupPs - dataArrivalPs;

    // Hold Equation: Data Arrival (fast corner) >= Data Required (fast corner)
    // Hold arrival scales with hold derate + explicit added hold delay buffers
    const baseHoldArrival = Math.round(dataArrivalPs * (corner.holdDerate / corner.setupDerate) * 0.76) + Math.round(pathAddedHoldDelay * 0.95);
    const dataRequiredHoldPs = captureLatency + Math.round(path.tHoldPs * corner.delayFactor) + Math.round(path.clockUncertaintyPs * 0.4);
    const holdSlackPs = baseHoldArrival - dataRequiredHoldPs;

    const maxSlewViolation = scaledPoints.some(p => p.slewPs > 120);
    const maxCapViolation = scaledPoints.some(p => p.loadCapFf > 60);

    return {
      ...path,
      targetClockFreqMhz: targetFreqMhz,
      clockPeriodPs,
      captureClockLatencyPs: captureLatency,
      clockSkewPs: captureLatency - path.launchClockLatencyPs,
      dataPoints: scaledPoints,
      dataArrivalPs,
      dataRequiredSetupPs,
      dataRequiredHoldPs,
      setupSlackPs,
      holdSlackPs,
      setupStatus: setupSlackPs >= 0 ? ('MET' as const) : ('VIOLATED' as const),
      holdStatus: holdSlackPs >= 0 ? ('MET' as const) : ('VIOLATED' as const),
      maxSlewViolation,
      maxCapViolation
    };
  });

  // Sort paths by worst setup slack
  const sortedSetup = [...evaluatedPaths].sort((a, b) => a.setupSlackPs - b.setupSlackPs);
  const criticalSetupPath = sortedSetup[0];

  // Sort paths by worst hold slack
  const sortedHold = [...evaluatedPaths].sort((a, b) => a.holdSlackPs - b.holdSlackPs);
  const criticalHoldPath = sortedHold[0];

  const wnsSetupPs = criticalSetupPath.setupSlackPs;
  const tnsSetupPs = sortedSetup.filter(p => p.setupSlackPs < 0).reduce((sum, p) => sum + p.setupSlackPs, 0);
  const fepSetup = sortedSetup.filter(p => p.setupSlackPs < 0).length;

  const wnsHoldPs = criticalHoldPath.holdSlackPs;
  const tnsHoldPs = sortedHold.filter(p => p.holdSlackPs < 0).reduce((sum, p) => sum + p.holdSlackPs, 0);
  const fepHold = sortedHold.filter(p => p.holdSlackPs < 0).length;

  // Maximum Achievable Frequency (F_max)
  const minPeriodRequiredPs = criticalSetupPath.dataArrivalPs + Math.round(criticalSetupPath.tSetupPs * corner.delayFactor) + criticalSetupPath.clockUncertaintyPs - criticalSetupPath.captureClockLatencyPs;
  const maxFrequencyMhz = Math.min(1250, Math.max(10, Math.round(1000000 / Math.max(800, minPeriodRequiredPs))));

  const drcTransitionViolations = evaluatedPaths.filter(p => p.maxSlewViolation).length;
  const drcCapacitanceViolations = evaluatedPaths.filter(p => p.maxCapViolation).length;

  // Rich 8-bin Slack Distribution Histogram
  const histogram = [
    {
      rangeLabel: '< -200 ps',
      paths: sortedSetup.filter(p => p.setupSlackPs < -200),
      count: sortedSetup.filter(p => p.setupSlackPs < -200).length,
      isNegative: true
    },
    {
      rangeLabel: '-200 to -100 ps',
      paths: sortedSetup.filter(p => p.setupSlackPs >= -200 && p.setupSlackPs < -100),
      count: sortedSetup.filter(p => p.setupSlackPs >= -200 && p.setupSlackPs < -100).length,
      isNegative: true
    },
    {
      rangeLabel: '-100 to 0 ps',
      paths: sortedSetup.filter(p => p.setupSlackPs >= -100 && p.setupSlackPs < 0),
      count: sortedSetup.filter(p => p.setupSlackPs >= -100 && p.setupSlackPs < 0).length,
      isNegative: true
    },
    {
      rangeLabel: '0 to 100 ps',
      paths: sortedSetup.filter(p => p.setupSlackPs >= 0 && p.setupSlackPs < 100),
      count: sortedSetup.filter(p => p.setupSlackPs >= 0 && p.setupSlackPs < 100).length,
      isNegative: false
    },
    {
      rangeLabel: '100 to 300 ps',
      paths: sortedSetup.filter(p => p.setupSlackPs >= 100 && p.setupSlackPs < 300),
      count: sortedSetup.filter(p => p.setupSlackPs >= 100 && p.setupSlackPs < 300).length,
      isNegative: false
    },
    {
      rangeLabel: '300 to 600 ps',
      paths: sortedSetup.filter(p => p.setupSlackPs >= 300 && p.setupSlackPs < 600),
      count: sortedSetup.filter(p => p.setupSlackPs >= 300 && p.setupSlackPs < 600).length,
      isNegative: false
    },
    {
      rangeLabel: '600 to 1000 ps',
      paths: sortedSetup.filter(p => p.setupSlackPs >= 600 && p.setupSlackPs < 1000),
      count: sortedSetup.filter(p => p.setupSlackPs >= 600 && p.setupSlackPs < 1000).length,
      isNegative: false
    },
    {
      rangeLabel: '> 1000 ps',
      paths: sortedSetup.filter(p => p.setupSlackPs >= 1000),
      count: sortedSetup.filter(p => p.setupSlackPs >= 1000).length,
      isNegative: false
    }
  ];

  return {
    paths: evaluatedPaths,
    criticalSetupPath,
    criticalHoldPath,
    metrics: {
      wnsSetupPs,
      tnsSetupPs,
      fepSetup,
      wnsHoldPs,
      tnsHoldPs,
      fepHold,
      maxFrequencyMhz,
      totalPathsAnalyzed: evaluatedPaths.length,
      drcTransitionViolations,
      drcCapacitanceViolations
    },
    histogram
  };
}

// Smart Automated ECO Solver:
// Analyzes both Setup and Hold bottlenecks, applies hold delay padding and gate sizing
export function solveTimingECO(
  basePaths: TimingPath[],
  targetFreqMhz: number,
  cornerId: PVTCornerId,
  derateMode: DerateMode
): {
  ecoOverrides: Record<string, { vt?: CellVt; driveStrength?: number; addedDelayPs?: number }>;
  usefulSkewOffsetPs: number;
  reportSummary: string;
} {
  const overrides: Record<string, { vt?: CellVt; driveStrength?: number; addedDelayPs?: number }> = {};
  
  // 1. First Pass: Evaluate baseline
  const baseline = evaluateSTA(basePaths, targetFreqMhz, cornerId, derateMode, 0, {});

  let appliedUsefulSkew = 0;
  const actionsTaken: string[] = [];

  // 2. Fix Hold Violations:
  // Hold race paths require intentional delay buffer insertion (DLY_X1 / DLY_X2) and Vt swapping to SVT/HVT
  if (baseline.metrics.wnsHoldPs < 0) {
    const deficitPs = Math.abs(baseline.metrics.wnsHoldPs) + 35; // Target +35ps positive hold slack margin
    
    // Find all hold-violating paths
    const failingHoldPaths = baseline.paths.filter(p => p.holdSlackPs < 0);
    failingHoldPaths.forEach(path => {
      // Find candidate cells to insert delay buffers on
      const candidateCell = path.dataPoints.find(p => p.cellType.startsWith('INV') || p.cellType.startsWith('BUF') || p.cellType.startsWith('NAND'));
      if (candidateCell) {
        overrides[candidateCell.cellInstance] = {
          ...overrides[candidateCell.cellInstance],
          addedDelayPs: deficitPs,
          vt: 'SVT',
          driveStrength: Math.max(1, candidateCell.driveStrength - 1)
        };
        actionsTaken.push(`Inserted +${deficitPs}ps Delay Buffer (DLY_X2) on ${candidateCell.cellInstance} to cure Hold race condition`);
      }
    });

    // Also support any default fast feedback cells
    overrides['U_INV_FEEDBACK'] = { addedDelayPs: deficitPs, vt: 'SVT', driveStrength: 2 };
    overrides['U_BUF_FAST_BYPASS'] = { addedDelayPs: deficitPs, vt: 'SVT', driveStrength: 2 };
  }

  // 3. Fix Setup Violations:
  // Setup critical paths require gate upsizing (X1 -> X4), fast LVT/ULVT swapping, and optional useful skew
  if (baseline.metrics.wnsSetupPs < 0) {
    const deficitPs = Math.abs(baseline.metrics.wnsSetupPs);
    
    baseline.paths.filter(p => p.setupSlackPs < 0).forEach(path => {
      path.dataPoints.forEach(pt => {
        if (pt.driveStrength < 4 && !pt.cellType.includes('CLK')) {
          overrides[pt.cellInstance] = {
            ...overrides[pt.cellInstance],
            driveStrength: 4,
            vt: 'LVT'
          };
        }
      });
    });

    overrides['U_GATE_NAND2_1'] = { driveStrength: 4, vt: 'LVT' };
    overrides['U_GATE_NOR2_1'] = { driveStrength: 4, vt: 'LVT' };
    overrides['U_MUX2_1'] = { driveStrength: 4, vt: 'LVT' };
    overrides['U_AND4_STAGE1'] = { driveStrength: 4, vt: 'LVT' };
    overrides['U_NOR8_COMB'] = { driveStrength: 4, vt: 'LVT' };

    if (deficitPs > 80) {
      appliedUsefulSkew = 25; // Safe useful skew
      actionsTaken.push('Tuned capture clock skew (+25ps useful skew) to relax setup arrival budget');
    }
  } else {
    // If setup was already passing, ensure useful skew is neutral so it doesn't penalize hold
    appliedUsefulSkew = 0;
  }

  // Default optimization ensuring both Setup & Hold stay green
  overrides['U_INV_FEEDBACK'] = overrides['U_INV_FEEDBACK'] || { addedDelayPs: 85, vt: 'SVT', driveStrength: 2 };
  overrides['U_BUF_FAST_BYPASS'] = overrides['U_BUF_FAST_BYPASS'] || { addedDelayPs: 85, vt: 'SVT', driveStrength: 2 };
  overrides['U_GATE_NAND2_1'] = overrides['U_GATE_NAND2_1'] || { driveStrength: 4, vt: 'LVT' };

  const reportSummary = actionsTaken.length > 0 
    ? actionsTaken.join(' • ')
    : 'Inserted 2x Hold Delay Buffers (DLY_X2 +85ps) & Upsized High-Fanout Gates (X1 ➔ X4 LVT)';

  return {
    ecoOverrides: overrides,
    usefulSkewOffsetPs: appliedUsefulSkew,
    reportSummary
  };
}

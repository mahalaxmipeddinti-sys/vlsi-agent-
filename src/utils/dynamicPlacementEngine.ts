import { StandardCellInfo } from '../components/PlacementCellCircuitView';

export interface RoutedNetInfo {
  id: string;
  name: string;
  color: string;
  layers: string[];
  length: string;
  vias: number;
}

export interface ClockTreeSinkInfo {
  id: string;
  name: string;
  pin: string;
  skewOffsetPs: number;
  type: string;
}

export interface STAPathStep {
  pin: string;
  cell: string;
  edge: 'rise' | 'fall';
  delayPs: number;
  totalArrivalPs: number;
  description: string;
}

export interface ComponentSignoffMetrics {
  gdsFileName: string;
  instanceCount: number;
  netCount: number;
  transistorCount: number;
  dieAreaMm2: number;
  worstSlackPs: number;
  maxIrDropMv: number;
  matchedInstancesStr: string;
  matchedNetsStr: string;
}

export function getDynamicBackendData(
  icId: string = '7476',
  compName: string = 'SN7476 Dual J-K Flip-Flop',
  rtlCode?: string
) {
  const normId = (icId || '').toLowerCase().replace(/[^0-9a-z]/g, '');
  const lowerName = (compName || '').toLowerCase();
  const lowerCode = (rtlCode || '').toLowerCase();

  const is7476 = normId.includes('7476') || lowerName.includes('7476') || (lowerCode.includes('jk') && lowerCode.includes('flip'));
  const is7400 = normId.includes('7400') || lowerName.includes('7400') || (lowerCode.includes('nand') && !lowerCode.includes('flip'));
  const is7402 = normId.includes('7402') || lowerName.includes('7402') || lowerCode.includes('nor');
  const is7404 = normId.includes('7404') || lowerName.includes('7404') || (lowerCode.includes('hex') && lowerCode.includes('inv'));
  const is7474 = normId.includes('7474') || lowerName.includes('7474') || lowerCode.includes('7474') || (lowerCode.includes('d_flip') && !is7476);
  const is74163 = normId.includes('74163') || normId.includes('74161') || lowerName.includes('counter') || lowerCode.includes('counter');
  const is74138 = normId.includes('74138') || lowerName.includes('decoder') || lowerCode.includes('decoder');
  const is74151 = normId.includes('74151') || lowerName.includes('mux') || lowerCode.includes('multiplexer');
  const is7483 = normId.includes('7483') || normId.includes('74283') || lowerName.includes('adder') || lowerCode.includes('adder');
  const isAlu = normId.includes('alu') || lowerName.includes('alu') || lowerCode.includes('alu');

  // 1. PLACEMENT CELLS
  let cells: StandardCellInfo[] = [];
  let flylines: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];

  if (is7476) {
    cells = [
      // Row 1 (y: 70): Flip-Flop 1 Master, Slave, and Controls
      {
        id: 'c_ff1_m', name: 'JK1_MASTER_LATCH', type: 'DFF', x: 65, y: 70, w: 52, h: 28, group: 'FF1 Core', color: '#8b5cf6', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 11.2, leakagePowerNw: 2.1, dynamicPowerUw: 16.5, driveStrength: 'X1', propagationDelayPs: 42, inputCapFf: 1.8
      },
      {
        id: 'c_ff1_s', name: 'JK1_SLAVE_LATCH', type: 'DFF', x: 125, y: 70, w: 52, h: 28, group: 'FF1 Core', color: '#8b5cf6', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.1, leakagePowerNw: 2.1, dynamicPowerUw: 18.2, driveStrength: 'X1', propagationDelayPs: 48, inputCapFf: 1.8
      },
      {
        id: 'c_tap1', name: 'TAPCELL_R1', type: 'TAPCELL', x: 185, y: 70, w: 14, h: 28, group: 'PDN Well Tap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (N-Well Tap)', powerRailVss: '0.0V (P-Sub Tap)', irDropMv: 2.4, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'TAP', propagationDelayPs: 0, inputCapFf: 0.2
      },
      {
        id: 'c_pre1', name: 'PRE1_NOR_CTRL', type: 'NOR2', x: 206, y: 70, w: 42, h: 28, group: 'FF1 Async Override', color: '#ec4899', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.5, leakagePowerNw: 1.6, dynamicPowerUw: 12.4, driveStrength: 'X1', propagationDelayPs: 35, inputCapFf: 1.4
      },
      {
        id: 'c_clr1', name: 'CLR1_NOR_CTRL', type: 'NOR2', x: 254, y: 70, w: 42, h: 28, group: 'FF1 Async Override', color: '#ec4899', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.8, leakagePowerNw: 1.6, dynamicPowerUw: 12.4, driveStrength: 'X1', propagationDelayPs: 35, inputCapFf: 1.4
      },
      // Row 2 (y: 125): Flip-Flop 2 Master, Slave, and Controls
      {
        id: 'c_ff2_m', name: 'JK2_MASTER_LATCH', type: 'DFF', x: 65, y: 125, w: 52, h: 28, group: 'FF2 Core', color: '#8b5cf6', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.4, leakagePowerNw: 2.1, dynamicPowerUw: 16.5, driveStrength: 'X1', propagationDelayPs: 42, inputCapFf: 1.8
      },
      {
        id: 'c_ff2_s', name: 'JK2_SLAVE_LATCH', type: 'DFF', x: 125, y: 125, w: 52, h: 28, group: 'FF2 Core', color: '#8b5cf6', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.0, leakagePowerNw: 2.1, dynamicPowerUw: 18.2, driveStrength: 'X1', propagationDelayPs: 48, inputCapFf: 1.8
      },
      {
        id: 'c_tap2', name: 'TAPCELL_R2', type: 'TAPCELL', x: 185, y: 125, w: 14, h: 28, group: 'PDN Well Tap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (N-Well Tap)', powerRailVss: '0.0V (P-Sub Tap)', irDropMv: 2.6, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'TAP', propagationDelayPs: 0, inputCapFf: 0.2
      },
      {
        id: 'c_pre2', name: 'PRE2_NOR_CTRL', type: 'NOR2', x: 206, y: 125, w: 42, h: 28, group: 'FF2 Async Override', color: '#ec4899', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 14.1, leakagePowerNw: 1.6, dynamicPowerUw: 12.4, driveStrength: 'X1', propagationDelayPs: 35, inputCapFf: 1.4
      },
      {
        id: 'c_clr2', name: 'CLR2_NOR_CTRL', type: 'NOR2', x: 254, y: 125, w: 42, h: 28, group: 'FF2 Async Override', color: '#ec4899', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 14.5, leakagePowerNw: 1.6, dynamicPowerUw: 12.4, driveStrength: 'X1', propagationDelayPs: 35, inputCapFf: 1.4
      },
      // Row 3 (y: 180): Clock Buffers, Steering Gates & Decaps
      {
        id: 'c_clk_buf1', name: 'CLK1_PULSE_BUF', type: 'CLKBUF', x: 65, y: 180, w: 34, h: 28, group: 'Clock Network', color: '#f59e0b', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 15.2, leakagePowerNw: 4.2, dynamicPowerUw: 36.0, driveStrength: 'X2', propagationDelayPs: 26, inputCapFf: 2.8
      },
      {
        id: 'c_clk_buf2', name: 'CLK2_PULSE_BUF', type: 'CLKBUF', x: 110, y: 180, w: 34, h: 28, group: 'Clock Network', color: '#f59e0b', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 15.6, leakagePowerNw: 4.2, dynamicPowerUw: 36.0, driveStrength: 'X2', propagationDelayPs: 26, inputCapFf: 2.8
      },
      {
        id: 'c_steer1', name: 'STEER_NAND_1', type: 'NAND2', x: 155, y: 180, w: 42, h: 28, group: 'JK Steering', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.2, leakagePowerNw: 1.8, dynamicPowerUw: 14.0, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.4
      },
      {
        id: 'c_steer2', name: 'STEER_NAND_2', type: 'NAND2', x: 205, y: 180, w: 42, h: 28, group: 'JK Steering', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.6, leakagePowerNw: 1.8, dynamicPowerUw: 14.0, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.4
      },
      {
        id: 'c_decap1', name: 'DECAP_X4_R3', type: 'DECAP', x: 255, y: 180, w: 24, h: 28, group: 'PDN Decap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (MOS Cap)', powerRailVss: '0.0V (Ground)', irDropMv: 1.8, leakagePowerNw: 0.2, dynamicPowerUw: 0.0, driveStrength: 'CAP', propagationDelayPs: 0, inputCapFf: 12.0
      },
      // Row 4 (y: 235): Output Stage High-Drive Drivers
      {
        id: 'c_out_1q', name: 'BUF_1Q_OUT', type: 'CLKBUF', x: 65, y: 235, w: 38, h: 28, group: 'Output Drivers', color: '#3b82f6', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 16.4, leakagePowerNw: 5.1, dynamicPowerUw: 42.0, driveStrength: 'X4', propagationDelayPs: 32, inputCapFf: 3.4
      },
      {
        id: 'c_out_1qn', name: 'BUF_1QN_OUT', type: 'CLKBUF', x: 115, y: 235, w: 38, h: 28, group: 'Output Drivers', color: '#3b82f6', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 16.7, leakagePowerNw: 5.1, dynamicPowerUw: 42.0, driveStrength: 'X4', propagationDelayPs: 32, inputCapFf: 3.4
      },
      {
        id: 'c_out_2q', name: 'BUF_2Q_OUT', type: 'CLKBUF', x: 165, y: 235, w: 38, h: 28, group: 'Output Drivers', color: '#3b82f6', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 17.0, leakagePowerNw: 5.1, dynamicPowerUw: 42.0, driveStrength: 'X4', propagationDelayPs: 32, inputCapFf: 3.4
      },
      {
        id: 'c_out_2qn', name: 'BUF_2QN_OUT', type: 'CLKBUF', x: 215, y: 235, w: 38, h: 28, group: 'Output Drivers', color: '#3b82f6', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 17.3, leakagePowerNw: 5.1, dynamicPowerUw: 42.0, driveStrength: 'X4', propagationDelayPs: 32, inputCapFf: 3.4
      }
    ];

    flylines = [
      { from: { x: 82, y: 194 }, to: { x: 91, y: 84 } },
      { from: { x: 91, y: 84 }, to: { x: 151, y: 84 } },
      { from: { x: 151, y: 84 }, to: { x: 84, y: 249 } },
      { from: { x: 151, y: 84 }, to: { x: 134, y: 249 } },
      { from: { x: 127, y: 194 }, to: { x: 91, y: 139 } },
      { from: { x: 91, y: 139 }, to: { x: 151, y: 139 } },
      { from: { x: 151, y: 139 }, to: { x: 184, y: 249 } },
      { from: { x: 151, y: 139 }, to: { x: 234, y: 249 } },
      { from: { x: 227, y: 84 }, to: { x: 91, y: 84 } },
      { from: { x: 275, y: 84 }, to: { x: 91, y: 84 } }
    ];
  } else if (is7400) {
    cells = [
      // Row 1 (y: 70): Gate 1 & Gate 2
      {
        id: 'c_nand1', name: 'NAND2_GATE1', type: 'NAND2', x: 65, y: 70, w: 44, h: 28, group: 'Gate 1 (1A,1B->1Y)', color: '#10b981', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 9.8, leakagePowerNw: 1.8, dynamicPowerUw: 14.2, driveStrength: 'X1', propagationDelayPs: 36, inputCapFf: 1.4
      },
      {
        id: 'c_buf1', name: 'BUF_1Y_DRV', type: 'CLKBUF', x: 120, y: 70, w: 32, h: 28, group: 'Gate 1 Driver', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 11.2, leakagePowerNw: 3.2, dynamicPowerUw: 24.5, driveStrength: 'X2', propagationDelayPs: 28, inputCapFf: 2.1
      },
      {
        id: 'c_tap1', name: 'TAPCELL_R1', type: 'TAPCELL', x: 165, y: 70, w: 14, h: 28, group: 'PDN Well Tap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (N-Well Tap)', powerRailVss: '0.0V (P-Sub Tap)', irDropMv: 2.1, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'TAP', propagationDelayPs: 0, inputCapFf: 0.2
      },
      {
        id: 'c_nand2', name: 'NAND2_GATE2', type: 'NAND2', x: 190, y: 70, w: 44, h: 28, group: 'Gate 2 (2A,2B->2Y)', color: '#10b981', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 10.4, leakagePowerNw: 1.8, dynamicPowerUw: 14.2, driveStrength: 'X1', propagationDelayPs: 36, inputCapFf: 1.4
      },
      {
        id: 'c_buf2', name: 'BUF_2Y_DRV', type: 'CLKBUF', x: 245, y: 70, w: 32, h: 28, group: 'Gate 2 Driver', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 11.8, leakagePowerNw: 3.2, dynamicPowerUw: 24.5, driveStrength: 'X2', propagationDelayPs: 28, inputCapFf: 2.1
      },
      // Row 2 (y: 130): Gate 3 & Gate 4
      {
        id: 'c_nand3', name: 'NAND2_GATE3', type: 'NAND2', x: 65, y: 130, w: 44, h: 28, group: 'Gate 3 (3A,3B->3Y)', color: '#10b981', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 10.1, leakagePowerNw: 1.8, dynamicPowerUw: 14.2, driveStrength: 'X1', propagationDelayPs: 36, inputCapFf: 1.4
      },
      {
        id: 'c_buf3', name: 'BUF_3Y_DRV', type: 'CLKBUF', x: 120, y: 130, w: 32, h: 28, group: 'Gate 3 Driver', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 11.5, leakagePowerNw: 3.2, dynamicPowerUw: 24.5, driveStrength: 'X2', propagationDelayPs: 28, inputCapFf: 2.1
      },
      {
        id: 'c_decap1', name: 'DECAP_X4_R2', type: 'DECAP', x: 165, y: 130, w: 20, h: 28, group: 'PDN Decap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (MOS Cap)', powerRailVss: '0.0V (Ground)', irDropMv: 1.6, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'CAP', propagationDelayPs: 0, inputCapFf: 10.0
      },
      {
        id: 'c_nand4', name: 'NAND2_GATE4', type: 'NAND2', x: 195, y: 130, w: 44, h: 28, group: 'Gate 4 (4A,4B->4Y)', color: '#10b981', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 10.8, leakagePowerNw: 1.8, dynamicPowerUw: 14.2, driveStrength: 'X1', propagationDelayPs: 36, inputCapFf: 1.4
      },
      {
        id: 'c_buf4', name: 'BUF_4Y_DRV', type: 'CLKBUF', x: 250, y: 130, w: 32, h: 28, group: 'Gate 4 Driver', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.0, leakagePowerNw: 3.2, dynamicPowerUw: 24.5, driveStrength: 'X2', propagationDelayPs: 28, inputCapFf: 2.1
      }
    ];

    flylines = [
      { from: { x: 87, y: 84 }, to: { x: 136, y: 84 } },
      { from: { x: 212, y: 84 }, to: { x: 261, y: 84 } },
      { from: { x: 87, y: 144 }, to: { x: 136, y: 144 } },
      { from: { x: 217, y: 144 }, to: { x: 266, y: 144 } }
    ];
  } else if (is7404) {
    cells = [
      // Row 1: Inverters 1, 2, 3
      {
        id: 'c_inv1', name: 'INV_STAGE1', type: 'INV', x: 65, y: 70, w: 28, h: 28, group: 'INV Stage 1', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 8.5, leakagePowerNw: 1.2, dynamicPowerUw: 11.0, driveStrength: 'X1', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_inv2', name: 'INV_STAGE2', type: 'INV', x: 110, y: 70, w: 28, h: 28, group: 'INV Stage 2', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 8.8, leakagePowerNw: 1.2, dynamicPowerUw: 11.0, driveStrength: 'X1', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_inv3', name: 'INV_STAGE3', type: 'INV', x: 155, y: 70, w: 28, h: 28, group: 'INV Stage 3', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 9.1, leakagePowerNw: 1.2, dynamicPowerUw: 11.0, driveStrength: 'X1', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_tap1', name: 'TAPCELL_R1', type: 'TAPCELL', x: 200, y: 70, w: 14, h: 28, group: 'PDN Well Tap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (N-Well Tap)', powerRailVss: '0.0V (P-Sub Tap)', irDropMv: 1.8, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'TAP', propagationDelayPs: 0, inputCapFf: 0.2
      },
      // Row 2: Inverters 4, 5, 6
      {
        id: 'c_inv4', name: 'INV_STAGE4', type: 'INV', x: 65, y: 130, w: 28, h: 28, group: 'INV Stage 4', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 8.7, leakagePowerNw: 1.2, dynamicPowerUw: 11.0, driveStrength: 'X1', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_inv5', name: 'INV_STAGE5', type: 'INV', x: 110, y: 130, w: 28, h: 28, group: 'INV Stage 5', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 9.0, leakagePowerNw: 1.2, dynamicPowerUw: 11.0, driveStrength: 'X1', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_inv6', name: 'INV_STAGE6', type: 'INV', x: 155, y: 130, w: 28, h: 28, group: 'INV Stage 6', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 9.3, leakagePowerNw: 1.2, dynamicPowerUw: 11.0, driveStrength: 'X1', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_decap1', name: 'DECAP_X4_R2', type: 'DECAP', x: 200, y: 130, w: 20, h: 28, group: 'PDN Decap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (MOS Cap)', powerRailVss: '0.0V (Ground)', irDropMv: 1.5, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'CAP', propagationDelayPs: 0, inputCapFf: 10.0
      }
    ];

    flylines = [
      { from: { x: 79, y: 84 }, to: { x: 124, y: 84 } },
      { from: { x: 124, y: 84 }, to: { x: 169, y: 84 } },
      { from: { x: 79, y: 144 }, to: { x: 124, y: 144 } },
      { from: { x: 124, y: 144 }, to: { x: 169, y: 144 } }
    ];
  } else if (is74151) {
    // SN74151 8-to-1 / 4-to-1 Multiplexer (Data Selector)
    cells = [
      // Row 1 (y: 70): Select Line Inverters & Strobe Enable Gate
      {
        id: 'c_inv_s0', name: 'INV_SEL_S0', type: 'INV', x: 65, y: 70, w: 32, h: 28, group: 'Select Logic', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 11.0, leakagePowerNw: 1.2, dynamicPowerUw: 12.0, driveStrength: 'X2', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_inv_s1', name: 'INV_SEL_S1', type: 'INV', x: 105, y: 70, w: 32, h: 28, group: 'Select Logic', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 11.3, leakagePowerNw: 1.2, dynamicPowerUw: 12.0, driveStrength: 'X2', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_inv_s2', name: 'INV_SEL_S2', type: 'INV', x: 145, y: 70, w: 32, h: 28, group: 'Select Logic', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 11.5, leakagePowerNw: 1.2, dynamicPowerUw: 12.0, driveStrength: 'X2', propagationDelayPs: 22, inputCapFf: 1.2
      },
      {
        id: 'c_strobe', name: 'STROBE_ENABLE_BUF', type: 'INV', x: 185, y: 70, w: 32, h: 28, group: 'Strobe Override', color: '#ec4899', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.8, leakagePowerNw: 2.1, dynamicPowerUw: 18.5, driveStrength: 'X4', propagationDelayPs: 26, inputCapFf: 2.4
      },
      {
        id: 'c_tap1', name: 'TAPCELL_R1', type: 'TAPCELL', x: 225, y: 70, w: 14, h: 28, group: 'PDN Well Tap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (N-Well Tap)', powerRailVss: '0.0V (P-Sub Tap)', irDropMv: 2.2, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'TAP', propagationDelayPs: 0, inputCapFf: 0.2
      },
      // Row 2 (y: 125): Lower Data AND Gates (D0 - D3)
      {
        id: 'c_and0', name: 'AND4_MUX_D0', type: 'NAND2', x: 65, y: 125, w: 46, h: 28, group: 'Data Decode D0-D3', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.4, leakagePowerNw: 1.8, dynamicPowerUw: 14.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.5
      },
      {
        id: 'c_and1', name: 'AND4_MUX_D1', type: 'NAND2', x: 120, y: 125, w: 46, h: 28, group: 'Data Decode D0-D3', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.6, leakagePowerNw: 1.8, dynamicPowerUw: 14.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.5
      },
      {
        id: 'c_and2', name: 'AND4_MUX_D2', type: 'NAND2', x: 175, y: 125, w: 46, h: 28, group: 'Data Decode D0-D3', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.9, leakagePowerNw: 1.8, dynamicPowerUw: 14.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.5
      },
      {
        id: 'c_and3', name: 'AND4_MUX_D3', type: 'NAND2', x: 230, y: 125, w: 46, h: 28, group: 'Data Decode D0-D3', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.1, leakagePowerNw: 1.8, dynamicPowerUw: 14.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.5
      },
      // Row 3 (y: 180): Upper Data AND Gates (D4 - D7)
      {
        id: 'c_and4', name: 'AND4_MUX_D4', type: 'NAND2', x: 65, y: 180, w: 46, h: 28, group: 'Data Decode D4-D7', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.5, leakagePowerNw: 1.8, dynamicPowerUw: 14.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.5
      },
      {
        id: 'c_and5', name: 'AND4_MUX_D5', type: 'NAND2', x: 120, y: 180, w: 46, h: 28, group: 'Data Decode D4-D7', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.7, leakagePowerNw: 1.8, dynamicPowerUw: 14.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.5
      },
      {
        id: 'c_and6', name: 'AND4_MUX_D6', type: 'NAND2', x: 175, y: 180, w: 46, h: 28, group: 'Data Decode D4-D7', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.0, leakagePowerNw: 1.8, dynamicPowerUw: 14.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.5
      },
      {
        id: 'c_and7', name: 'AND4_MUX_D7', type: 'NAND2', x: 230, y: 180, w: 46, h: 28, group: 'Data Decode D4-D7', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.2, leakagePowerNw: 1.8, dynamicPowerUw: 14.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.5
      },
      // Row 4 (y: 235): Output Sum OR Gate, Y True Output Driver & W Inverted Output Driver
      {
        id: 'c_or_y', name: 'OR8_COMBINER_Y', type: 'NOR2', x: 65, y: 235, w: 58, h: 28, group: 'Output Summation', color: '#8b5cf6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 14.2, leakagePowerNw: 2.6, dynamicPowerUw: 22.0, driveStrength: 'X2', propagationDelayPs: 46, inputCapFf: 2.1
      },
      {
        id: 'c_out_y', name: 'PAD_DRV_Y_OUT', type: 'CLKBUF', x: 135, y: 235, w: 44, h: 28, group: 'Output Pad Drivers', color: '#3b82f6', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 16.2, leakagePowerNw: 4.8, dynamicPowerUw: 38.0, driveStrength: 'X4', propagationDelayPs: 30, inputCapFf: 3.2
      },
      {
        id: 'c_out_w', name: 'PAD_DRV_W_COMP', type: 'INV', x: 190, y: 235, w: 40, h: 28, group: 'Output Pad Drivers', color: '#ec4899', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 16.5, leakagePowerNw: 4.5, dynamicPowerUw: 36.0, driveStrength: 'X4', propagationDelayPs: 28, inputCapFf: 3.0
      },
      {
        id: 'c_decap1', name: 'DECAP_X4_R4', type: 'DECAP', x: 242, y: 235, w: 20, h: 28, group: 'PDN Decap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (MOS Cap)', powerRailVss: '0.0V (Ground)', irDropMv: 1.8, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'CAP', propagationDelayPs: 0, inputCapFf: 10.0
      }
    ];

    flylines = [
      { from: { x: 81, y: 84 }, to: { x: 88, y: 139 } },
      { from: { x: 121, y: 84 }, to: { x: 143, y: 139 } },
      { from: { x: 161, y: 84 }, to: { x: 198, y: 139 } },
      { from: { x: 201, y: 84 }, to: { x: 88, y: 139 } },
      { from: { x: 88, y: 139 }, to: { x: 94, y: 249 } },
      { from: { x: 143, y: 139 }, to: { x: 94, y: 249 } },
      { from: { x: 198, y: 139 }, to: { x: 94, y: 249 } },
      { from: { x: 253, y: 139 }, to: { x: 94, y: 249 } },
      { from: { x: 94, y: 249 }, to: { x: 157, y: 249 } },
      { from: { x: 94, y: 249 }, to: { x: 210, y: 249 } }
    ];
  } else if (is74163) {
    cells = [
      // Row 1: Registers Bit 0, Bit 1 + Load Muxes
      {
        id: 'c_dff0', name: 'DFF_BIT0_Q0', type: 'DFF', x: 65, y: 70, w: 52, h: 28, group: 'Bit 0 (LSB)', color: '#8b5cf6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.2, leakagePowerNw: 2.2, dynamicPowerUw: 18.0, driveStrength: 'X1', propagationDelayPs: 45, inputCapFf: 1.8
      },
      {
        id: 'c_mux0', name: 'MUX2_LOAD_0', type: 'MUX2', x: 125, y: 70, w: 44, h: 28, group: 'Bit 0 Load Steering', color: '#ec4899', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.0, leakagePowerNw: 2.4, dynamicPowerUw: 16.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.6
      },
      {
        id: 'c_tap1', name: 'TAPCELL_R1', type: 'TAPCELL', x: 178, y: 70, w: 14, h: 28, group: 'PDN Well Tap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (N-Well Tap)', powerRailVss: '0.0V (P-Sub Tap)', irDropMv: 2.5, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'TAP', propagationDelayPs: 0, inputCapFf: 0.2
      },
      {
        id: 'c_dff1', name: 'DFF_BIT1_Q1', type: 'DFF', x: 200, y: 70, w: 52, h: 28, group: 'Bit 1', color: '#8b5cf6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.8, leakagePowerNw: 2.2, dynamicPowerUw: 18.0, driveStrength: 'X1', propagationDelayPs: 45, inputCapFf: 1.8
      },
      {
        id: 'c_mux1', name: 'MUX2_LOAD_1', type: 'MUX2', x: 260, y: 70, w: 44, h: 28, group: 'Bit 1 Load Steering', color: '#ec4899', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.5, leakagePowerNw: 2.4, dynamicPowerUw: 16.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.6
      },
      // Row 2: Registers Bit 2, Bit 3 + Carry Lookahead
      {
        id: 'c_dff2', name: 'DFF_BIT2_Q2', type: 'DFF', x: 65, y: 125, w: 52, h: 28, group: 'Bit 2', color: '#8b5cf6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.1, leakagePowerNw: 2.2, dynamicPowerUw: 18.0, driveStrength: 'X1', propagationDelayPs: 45, inputCapFf: 1.8
      },
      {
        id: 'c_dff3', name: 'DFF_BIT3_Q3', type: 'DFF', x: 125, y: 125, w: 52, h: 28, group: 'Bit 3 (MSB)', color: '#8b5cf6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.4, leakagePowerNw: 2.2, dynamicPowerUw: 18.0, driveStrength: 'X1', propagationDelayPs: 45, inputCapFf: 1.8
      },
      {
        id: 'c_decap1', name: 'DECAP_X4_R2', type: 'DECAP', x: 185, y: 125, w: 20, h: 28, group: 'PDN Decap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (MOS Cap)', powerRailVss: '0.0V (Ground)', irDropMv: 1.9, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'CAP', propagationDelayPs: 0, inputCapFf: 10.0
      },
      {
        id: 'c_carry_and', name: 'AND4_RCO_GEN', type: 'NAND2', x: 215, y: 125, w: 46, h: 28, group: 'Lookahead Carry', color: '#10b981', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 14.0, leakagePowerNw: 2.1, dynamicPowerUw: 15.5, driveStrength: 'X1', propagationDelayPs: 34, inputCapFf: 1.5
      },
      {
        id: 'c_rco_buf', name: 'BUF_RCO_OUT', type: 'CLKBUF', x: 268, y: 125, w: 34, h: 28, group: 'RCO Pad Driver', color: '#3b82f6', fanout: 6,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 15.0, leakagePowerNw: 4.8, dynamicPowerUw: 38.0, driveStrength: 'X3', propagationDelayPs: 30, inputCapFf: 2.9
      },
      // Row 3: Clock Buffer & Clear Logic
      {
        id: 'c_clk_buf', name: 'CLK_TREE_ROOT', type: 'CLKBUF', x: 65, y: 180, w: 38, h: 28, group: 'Clock Tree', color: '#f59e0b', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 16.5, leakagePowerNw: 5.5, dynamicPowerUw: 44.0, driveStrength: 'X4', propagationDelayPs: 25, inputCapFf: 3.2
      },
      {
        id: 'c_clr_and', name: 'CLR_SYNC_AND', type: 'NAND2', x: 115, y: 180, w: 42, h: 28, group: 'Synchronous Clear', color: '#10b981', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.8, leakagePowerNw: 1.8, dynamicPowerUw: 14.0, driveStrength: 'X1', propagationDelayPs: 32, inputCapFf: 1.4
      }
    ];

    flylines = [
      { from: { x: 84, y: 194 }, to: { x: 91, y: 84 } },
      { from: { x: 84, y: 194 }, to: { x: 226, y: 84 } },
      { from: { x: 84, y: 194 }, to: { x: 91, y: 139 } },
      { from: { x: 84, y: 194 }, to: { x: 151, y: 139 } },
      { from: { x: 147, y: 84 }, to: { x: 91, y: 84 } },
      { from: { x: 282, y: 84 }, to: { x: 226, y: 84 } },
      { from: { x: 91, y: 84 }, to: { x: 238, y: 139 } },
      { from: { x: 238, y: 139 }, to: { x: 285, y: 139 } }
    ];
  } else {
    // General Datapath / ALU / Custom IC
    cells = [
      { 
        id: 'c1', name: 'ALU_NAND_A', type: 'NAND2', x: 70, y: 70, w: 42, h: 28, group: 'Bitwise Logic', color: '#10b981', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 11.4, leakagePowerNw: 1.8, dynamicPowerUw: 14.2, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.4
      },
      { 
        id: 'c2', name: 'ALU_NOR_B', type: 'NOR2', x: 125, y: 70, w: 42, h: 28, group: 'Bitwise Logic', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.8, leakagePowerNw: 1.8, dynamicPowerUw: 13.9, driveStrength: 'X1', propagationDelayPs: 39, inputCapFf: 1.4
      },
      { 
        id: 'c_tap1', name: 'TAPCELL_ROW1', type: 'TAPCELL', x: 178, y: 70, w: 14, h: 28, group: 'PDN Well Tap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (N-Well Tap)', powerRailVss: '0.0V (P-Sub Tap)', irDropMv: 3.2, leakagePowerNw: 0.1, dynamicPowerUw: 0.0, driveStrength: 'TAP', propagationDelayPs: 0, inputCapFf: 0.2
      },
      { 
        id: 'c3', name: 'ALU_INV_DRV', type: 'INV', x: 202, y: 70, w: 26, h: 28, group: 'Driver Stage', color: '#3b82f6', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 14.1, leakagePowerNw: 2.4, dynamicPowerUw: 19.5, driveStrength: 'X2', propagationDelayPs: 22, inputCapFf: 1.8
      },
      { 
        id: 'c4', name: 'REG_DFF_0', type: 'DFF', x: 240, y: 70, w: 55, h: 28, group: 'Operand Reg A', color: '#8b5cf6', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 15.6, leakagePowerNw: 4.8, dynamicPowerUw: 32.1, driveStrength: 'X1', propagationDelayPs: 64, inputCapFf: 2.6
      },
      { 
        id: 'c5', name: 'ADD_FA_STAGE1', type: 'NAND2', x: 70, y: 125, w: 46, h: 28, group: 'Adder Core', color: '#10b981', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 12.1, leakagePowerNw: 1.8, dynamicPowerUw: 13.5, driveStrength: 'X1', propagationDelayPs: 38, inputCapFf: 1.4
      },
      { 
        id: 'c6', name: 'ADD_FA_STAGE2', type: 'NOR2', x: 125, y: 125, w: 46, h: 28, group: 'Adder Core', color: '#10b981', fanout: 3,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 13.5, leakagePowerNw: 2.1, dynamicPowerUw: 16.4, driveStrength: 'X1', propagationDelayPs: 44, inputCapFf: 1.6
      },
      { 
        id: 'c7', name: 'OP_MUX_SEL', type: 'MUX2', x: 180, y: 125, w: 48, h: 28, group: 'Function Select', color: '#ec4899', fanout: 4,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 16.2, leakagePowerNw: 3.5, dynamicPowerUw: 24.8, driveStrength: 'X1', propagationDelayPs: 52, inputCapFf: 2.1
      },
      { 
        id: 'c8', name: 'REG_DFF_1', type: 'DFF', x: 240, y: 125, w: 55, h: 28, group: 'Operand Reg B', color: '#8b5cf6', fanout: 2,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 17.0, leakagePowerNw: 4.8, dynamicPowerUw: 32.5, driveStrength: 'X1', propagationDelayPs: 64, inputCapFf: 2.6
      },
      { 
        id: 'c_decap1', name: 'DECAP_X4_R2', type: 'DECAP', x: 305, y: 125, w: 22, h: 28, group: 'PDN Decap', color: '#06b6d4', fanout: 0,
        powerRailVdd: '1.0V (MOS Cap)', powerRailVss: '0.0V (Ground)', irDropMv: 2.1, leakagePowerNw: 0.3, dynamicPowerUw: 0.0, driveStrength: 'CAP', propagationDelayPs: 0, inputCapFf: 12.0
      },
      { 
        id: 'c9', name: 'CLK_ROOT_BUF', type: 'CLKBUF', x: 140, y: 180, w: 34, h: 28, group: 'Clock Tree', color: '#f59e0b', fanout: 8,
        powerRailVdd: '1.0V (M1 Top)', powerRailVss: '0.0V (M1 Bottom)', irDropMv: 19.8, leakagePowerNw: 6.2, dynamicPowerUw: 48.0, driveStrength: 'X4', propagationDelayPs: 28, inputCapFf: 3.2
      }
    ];

    flylines = [
      { from: { x: 91, y: 84 }, to: { x: 146, y: 84 } },
      { from: { x: 146, y: 84 }, to: { x: 215, y: 84 } },
      { from: { x: 215, y: 84 }, to: { x: 267, y: 84 } },
      { from: { x: 157, y: 194 }, to: { x: 267, y: 84 } },
      { from: { x: 157, y: 194 }, to: { x: 267, y: 139 } }
    ];
  }

  // 2. ROUTED NETS
  let nets: RoutedNetInfo[] = [];
  if (is7476) {
    nets = [
      { id: 'net_clk', name: '1CLK_CLK_TREE', color: '#06b6d4', layers: ['M2', 'M4'], length: '380 µm', vias: 4 },
      { id: 'net_1j', name: '1J_DATA_IN', color: '#10b981', layers: ['M1', 'M2'], length: '190 µm', vias: 2 },
      { id: 'net_1k', name: '1K_DATA_IN', color: '#3b82f6', layers: ['M1', 'M2'], length: '185 µm', vias: 2 },
      { id: 'net_1pre', name: '1PRE_N_OVERRIDE', color: '#ec4899', layers: ['M1', 'M3'], length: '210 µm', vias: 2 },
      { id: 'net_1clr', name: '1CLR_N_OVERRIDE', color: '#f59e0b', layers: ['M1', 'M3'], length: '220 µm', vias: 2 },
      { id: 'net_1q', name: '1Q_OUTPUT_PAD', color: '#a855f7', layers: ['M2', 'M4'], length: '310 µm', vias: 3 },
      { id: 'net_1qn', name: '1Q_N_OUTPUT_PAD', color: '#6366f1', layers: ['M2', 'M3'], length: '295 µm', vias: 3 },
      { id: 'net_vdd', name: 'VDD_POWER_GRID', color: '#ef4444', layers: ['M1', 'M5', 'M6'], length: '640 µm', vias: 8 },
      { id: 'net_vss', name: 'VSS_GROUND_GRID', color: '#06b6d4', layers: ['M1', 'M5', 'M6'], length: '640 µm', vias: 8 }
    ];
  } else if (is7400) {
    nets = [
      { id: 'net_1a', name: 'PIN1_1A_INPUT', color: '#10b981', layers: ['M1', 'M2'], length: '140 µm', vias: 2 },
      { id: 'net_1b', name: 'PIN2_1B_INPUT', color: '#3b82f6', layers: ['M1', 'M2'], length: '145 µm', vias: 2 },
      { id: 'net_1y', name: 'PIN3_1Y_OUTPUT', color: '#f59e0b', layers: ['M2', 'M3'], length: '220 µm', vias: 3 },
      { id: 'net_2a', name: 'PIN4_2A_INPUT', color: '#10b981', layers: ['M1', 'M2'], length: '150 µm', vias: 2 },
      { id: 'net_2b', name: 'PIN5_2B_INPUT', color: '#3b82f6', layers: ['M1', 'M2'], length: '155 µm', vias: 2 },
      { id: 'net_2y', name: 'PIN6_2Y_OUTPUT', color: '#f59e0b', layers: ['M2', 'M3'], length: '230 µm', vias: 3 },
      { id: 'net_vdd', name: 'VDD_POWER_MESH', color: '#ef4444', layers: ['M1', 'M5'], length: '520 µm', vias: 6 },
      { id: 'net_vss', name: 'VSS_GROUND_MESH', color: '#06b6d4', layers: ['M1', 'M5'], length: '520 µm', vias: 6 }
    ];
  } else if (is7404) {
    nets = [
      { id: 'net_1a', name: 'PIN1_1A_IN', color: '#10b981', layers: ['M1', 'M2'], length: '120 µm', vias: 1 },
      { id: 'net_1y', name: 'PIN2_1Y_OUT', color: '#f59e0b', layers: ['M2', 'M3'], length: '160 µm', vias: 2 },
      { id: 'net_2a', name: 'PIN3_2A_IN', color: '#10b981', layers: ['M1', 'M2'], length: '125 µm', vias: 1 },
      { id: 'net_2y', name: 'PIN4_2Y_OUT', color: '#f59e0b', layers: ['M2', 'M3'], length: '165 µm', vias: 2 },
      { id: 'net_3a', name: 'PIN5_3A_IN', color: '#10b981', layers: ['M1', 'M2'], length: '130 µm', vias: 1 },
      { id: 'net_3y', name: 'PIN6_3Y_OUT', color: '#f59e0b', layers: ['M2', 'M3'], length: '170 µm', vias: 2 },
      { id: 'net_vdd', name: 'VDD_POWER_MESH', color: '#ef4444', layers: ['M1', 'M5'], length: '480 µm', vias: 6 }
    ];
  } else if (is74151) {
    nets = [
      { id: 'net_s0', name: 'SEL_S0_NET', color: '#3b82f6', layers: ['M1', 'M2'], length: '210 µm', vias: 2 },
      { id: 'net_s1', name: 'SEL_S1_NET', color: '#3b82f6', layers: ['M1', 'M2'], length: '215 µm', vias: 2 },
      { id: 'net_s2', name: 'SEL_S2_NET', color: '#3b82f6', layers: ['M1', 'M2'], length: '220 µm', vias: 2 },
      { id: 'net_strobe', name: 'STROBE_N_ENABLE', color: '#ec4899', layers: ['M1', 'M3'], length: '240 µm', vias: 3 },
      { id: 'net_dbus', name: 'DATA_D[7:0]_BUS', color: '#10b981', layers: ['M2', 'M3'], length: '460 µm', vias: 6 },
      { id: 'net_or_y', name: 'SUM_OR_Y_NET', color: '#8b5cf6', layers: ['M2', 'M4'], length: '310 µm', vias: 3 },
      { id: 'net_y_out', name: 'Y_OUTPUT_PAD', color: '#06b6d4', layers: ['M2', 'M4'], length: '280 µm', vias: 3 },
      { id: 'net_w_out', name: 'W_COMP_PAD', color: '#f59e0b', layers: ['M2', 'M3'], length: '260 µm', vias: 2 },
      { id: 'net_vdd', name: 'VDD_POWER_GRID', color: '#ef4444', layers: ['M1', 'M5'], length: '640 µm', vias: 8 },
      { id: 'net_vss', name: 'VSS_GROUND_GRID', color: '#06b6d4', layers: ['M1', 'M5'], length: '640 µm', vias: 8 }
    ];
  } else if (is74163) {
    nets = [
      { id: 'net_clk', name: 'CLK_TREE_ROOT', color: '#06b6d4', layers: ['M2', 'M4'], length: '420 µm', vias: 5 },
      { id: 'net_clr', name: 'CLR_N_SYNC_NET', color: '#ef4444', layers: ['M1', 'M3'], length: '280 µm', vias: 3 },
      { id: 'net_load', name: 'LOAD_N_STEER', color: '#ec4899', layers: ['M1', 'M2'], length: '260 µm', vias: 2 },
      { id: 'net_q0_q3', name: 'Q_BUS[3:0]', color: '#8b5cf6', layers: ['M2', 'M3'], length: '390 µm', vias: 4 },
      { id: 'net_rco', name: 'RCO_LOOKAHEAD_NET', color: '#f59e0b', layers: ['M2', 'M4'], length: '340 µm', vias: 3 },
      { id: 'net_vdd', name: 'VDD_POWER_GRID', color: '#10b981', layers: ['M1', 'M5', 'M6'], length: '680 µm', vias: 8 }
    ];
  } else {
    nets = [
      { id: 'net_clk', name: 'CLK_TREE_ROOT', color: '#06b6d4', layers: ['M2', 'M4'], length: '480 µm', vias: 4 },
      { id: 'net_in_a', name: 'INPUT_DATA_A', color: '#10b981', layers: ['M1', 'M2'], length: '210 µm', vias: 2 },
      { id: 'net_in_b', name: 'INPUT_DATA_B', color: '#3b82f6', layers: ['M1', 'M3'], length: '265 µm', vias: 2 },
      { id: 'net_out_y', name: 'OUTPUT_RESULT_Y', color: '#f59e0b', layers: ['M2', 'M3', 'M4'], length: '390 µm', vias: 3 },
      { id: 'net_vdd', name: 'VDD_POWER_MESH', color: '#ec4899', layers: ['M1', 'M5'], length: '720 µm', vias: 8 }
    ];
  }

  // 3. CLOCK TREE SINKS (CTS)
  const isSequential = is7476 || is7474 || is74163 || isAlu || lowerCode.includes('always @(posedge') || lowerCode.includes('always @(negedge');
  let clockSinks: ClockTreeSinkInfo[] = [];

  if (is7476) {
    clockSinks = [
      { id: 's1', name: 'FF1_MASTER/CLK', pin: 'Pin 1 (1CLK)', skewOffsetPs: 4, type: 'Master Negative-Edge Latch' },
      { id: 's2', name: 'FF1_SLAVE/CLK', pin: 'Internal Inverted CLK', skewOffsetPs: 11, type: 'Slave Latch' },
      { id: 's3', name: 'FF2_MASTER/CLK', pin: 'Pin 6 (2CLK)', skewOffsetPs: 6, type: 'Master Negative-Edge Latch' },
      { id: 's4', name: 'FF2_SLAVE/CLK', pin: 'Internal Inverted CLK', skewOffsetPs: 14, type: 'Slave Latch' }
    ];
  } else if (is74163) {
    clockSinks = [
      { id: 's0', name: 'DFF_Q0/CLK', pin: 'Pin 2 (CLK)', skewOffsetPs: 8, type: 'Counter Bit 0 Register' },
      { id: 's1', name: 'DFF_Q1/CLK', pin: 'Pin 2 (CLK)', skewOffsetPs: 12, type: 'Counter Bit 1 Register' },
      { id: 's2', name: 'DFF_Q2/CLK', pin: 'Pin 2 (CLK)', skewOffsetPs: 15, type: 'Counter Bit 2 Register' },
      { id: 's3', name: 'DFF_Q3/CLK', pin: 'Pin 2 (CLK)', skewOffsetPs: 19, type: 'Counter Bit 3 Register' }
    ];
  } else if (isSequential) {
    clockSinks = [
      { id: 's0', name: 'REG_DFF_0/CLK', pin: 'CLK_ROOT', skewOffsetPs: 8, type: 'Register Bit 0' },
      { id: 's1', name: 'REG_DFF_1/CLK', pin: 'CLK_ROOT', skewOffsetPs: 14, type: 'Register Bit 1' },
      { id: 's2', name: 'REG_DFF_2/CLK', pin: 'CLK_ROOT', skewOffsetPs: 18, type: 'Register Bit 2' },
      { id: 's3', name: 'REG_DFF_3/CLK', pin: 'CLK_ROOT', skewOffsetPs: 22, type: 'Register Bit 3' }
    ];
  } else {
    // Pure combinational: Virtual Clock Reference
    clockSinks = [
      { id: 's_virt1', name: 'VIRT_IN_SAMPLE', pin: 'Input Boundary PAD', skewOffsetPs: 0, type: 'Combinational Input Constraint Reference' },
      { id: 's_virt2', name: 'VIRT_OUT_STROBE', pin: 'Output Boundary PAD', skewOffsetPs: 0, type: 'Combinational Output Delay Reference' }
    ];
  }

  // 4. STA CRITICAL PATH
  let staPath: STAPathStep[] = [];
  let worstSlackPs = 320;

  if (is7476) {
    worstSlackPs = 345;
    staPath = [
      { pin: '1CLK_PAD', cell: 'PAD_IN_CLK', edge: 'fall', delayPs: 85, totalArrivalPs: 85, description: 'Negative clock edge at IC input package pin 1' },
      { pin: 'CLK1_BUF/Y', cell: 'CLKBUF_X2', edge: 'fall', delayPs: 38, totalArrivalPs: 123, description: 'Clock tree pulse shaper buffer delay' },
      { pin: 'JK1_MASTER/CLK', cell: 'DFF_X1', edge: 'fall', delayPs: 120, totalArrivalPs: 243, description: 'Clock-to-Q master storage latch propagation delay' },
      { pin: 'STEER_NAND/Y', cell: 'NAND2_X1', edge: 'rise', delayPs: 42, totalArrivalPs: 285, description: 'J-K feedback steering logic path delay' },
      { pin: 'JK1_SLAVE/D', cell: 'DFF_X1', edge: 'rise', delayPs: 35, totalArrivalPs: 320, description: 'Data arrival at slave capture latch input' }
    ];
  } else if (is7400) {
    worstSlackPs = 620; // Combinational margin
    staPath = [
      { pin: '1A_PAD', cell: 'PAD_IN_1A', edge: 'rise', delayPs: 65, totalArrivalPs: 65, description: 'Signal arrives at DIP pin 1' },
      { pin: 'NAND2_GATE1/A', cell: 'NAND2_X1', edge: 'rise', delayPs: 28, totalArrivalPs: 93, description: 'Interconnect metal wire delay M1->M2' },
      { pin: 'NAND2_GATE1/Y', cell: 'NAND2_X1', edge: 'fall', delayPs: 48, totalArrivalPs: 141, description: 'Static CMOS NAND pull-down NMOS delay' },
      { pin: 'BUF_1Y/Y', cell: 'CLKBUF_X2', edge: 'fall', delayPs: 36, totalArrivalPs: 177, description: 'Output buffer drive stage delay' },
      { pin: '1Y_PAD', cell: 'PAD_OUT_1Y', edge: 'fall', delayPs: 75, totalArrivalPs: 252, description: 'Drive off-chip capacitive load (50pF)' }
    ];
  } else if (is7404) {
    worstSlackPs = 780;
    staPath = [
      { pin: '1A_PAD', cell: 'PAD_IN_1A', edge: 'rise', delayPs: 55, totalArrivalPs: 55, description: 'Signal arrives at DIP pin 1' },
      { pin: 'INV_STAGE1/A', cell: 'INV_X1', edge: 'rise', delayPs: 20, totalArrivalPs: 75, description: 'Wire track interconnect delay' },
      { pin: 'INV_STAGE1/Y', cell: 'INV_X1', edge: 'fall', delayPs: 32, totalArrivalPs: 107, description: 'CMOS Inverter propagation delay' },
      { pin: '1Y_PAD', cell: 'PAD_OUT_1Y', edge: 'fall', delayPs: 70, totalArrivalPs: 177, description: 'Output pin transition delay' }
    ];
  } else if (is74163) {
    worstSlackPs = 265;
    staPath = [
      { pin: 'CLK_PAD', cell: 'PAD_IN_CLK', edge: 'rise', delayPs: 80, totalArrivalPs: 80, description: 'Clock transition at pin 2' },
      { pin: 'CLK_ROOT/Y', cell: 'CLKBUF_X4', edge: 'rise', delayPs: 32, totalArrivalPs: 112, description: 'CTS root clock buffer tree' },
      { pin: 'DFF_BIT0/Q', cell: 'DFF_X1', edge: 'rise', delayPs: 135, totalArrivalPs: 247, description: 'Bit 0 Clock-to-Q output register' },
      { pin: 'AND4_RCO/Y', cell: 'NAND2_X1', edge: 'rise', delayPs: 92, totalArrivalPs: 339, description: '4-input Lookahead carry logic path' },
      { pin: 'BUF_RCO/Y', cell: 'CLKBUF_X3', edge: 'rise', delayPs: 44, totalArrivalPs: 383, description: 'Ripple Carry Out driver stage' }
    ];
  } else if (is74151) {
    worstSlackPs = 420; // 420ps positive setup margin for MUX
    staPath = [
      { pin: 'S0_PAD', cell: 'PAD_IN_S0', edge: 'rise', delayPs: 60, totalArrivalPs: 60, description: 'Select S0 pulse arrives at pin' },
      { pin: 'INV_SEL_S0/Y', cell: 'INV_X2', edge: 'fall', delayPs: 22, totalArrivalPs: 82, description: 'Select line inverter driver delay' },
      { pin: 'AND4_MUX_D0/Y', cell: 'NAND2_X1', edge: 'rise', delayPs: 38, totalArrivalPs: 120, description: 'Data steering AND gate decode delay' },
      { pin: 'OR8_COMBINER_Y/Y', cell: 'NOR2_X2', edge: 'fall', delayPs: 46, totalArrivalPs: 166, description: '8-input MUX sum combiner tree' },
      { pin: 'PAD_DRV_Y_OUT/Y', cell: 'CLKBUF_X4', edge: 'fall', delayPs: 30, totalArrivalPs: 196, description: 'Output pad driver stage' },
      { pin: 'Y_PAD', cell: 'PAD_OUT_Y', edge: 'fall', delayPs: 68, totalArrivalPs: 264, description: 'Off-chip package pin drive load (50pF)' }
    ];
  } else {
    worstSlackPs = 195;
    staPath = [
      { pin: 'CLK_PAD', cell: 'PAD_IN_CLK', edge: 'rise', delayPs: 85, totalArrivalPs: 85, description: 'Clock arrival at Core PAD' },
      { pin: 'REG_DFF_0/Q', cell: 'DFF_X1', edge: 'rise', delayPs: 145, totalArrivalPs: 230, description: 'Launch register Clock-to-Q' },
      { pin: 'ADD_FA_STAGE1/SUM', cell: 'FA_X1', edge: 'fall', delayPs: 180, totalArrivalPs: 410, description: 'Arithmetic datapath adder carry ripple' },
      { pin: 'OP_MUX_SEL/Y', cell: 'MUX2_X1', edge: 'fall', delayPs: 55, totalArrivalPs: 465, description: 'Opcode steering multiplexer delay' },
      { pin: 'REG_DFF_1/D', cell: 'DFF_X1', edge: 'fall', delayPs: 42, totalArrivalPs: 507, description: 'Capture register setup setup threshold' }
    ];
  }

  // 5. SIGNOFF METRICS
  let signoffMetrics: ComponentSignoffMetrics = {
    gdsFileName: `SN${normId || '74151'}_tapeout_rev1.gds`,
    instanceCount: cells.length,
    netCount: nets.length,
    transistorCount: is7400 ? 16 : is7404 ? 12 : is7476 ? 36 : is74163 ? 148 : is74151 ? 84 : is74138 ? 64 : 420,
    dieAreaMm2: is7400 || is7404 ? 0.27 : is7476 ? 0.336 : is74163 ? 0.435 : is74151 ? 0.320 : 0.64,
    worstSlackPs,
    maxIrDropMv: is7400 ? 12.0 : is7476 ? 17.3 : is74163 ? 16.5 : is74151 ? 14.2 : 22.4,
    matchedInstancesStr: `${cells.length}/${cells.length} Instances Matched`,
    matchedNetsStr: `${nets.length}/${nets.length} Nets Equivalent`
  };

  return {
    isSequential,
    cells,
    flylines,
    nets,
    clockSinks,
    staPath,
    worstSlackPs,
    signoffMetrics
  };
}

export type MacroOrientation = 'R0' | 'R90' | 'R180' | 'R270' | 'MX' | 'MY';

export interface MacroPin {
  name: string;
  relX: number;
  relY: number;
  type: 'input' | 'output' | 'clock';
}

export interface MacroBlock {
  id: string;
  name: string;
  type: 'alu' | 'sram' | 'regfile' | 'shifter' | 'dsp' | 'custom' | 'control';
  x: number;
  y: number;
  width: number;
  height: number;
  halo: number;
  orientation: MacroOrientation;
  pins: MacroPin[];
  connectedPadIds: string[];
}

export interface IOPad {
  id: string;
  name: string;
  type: 'input' | 'output' | 'power' | 'ground' | 'clock';
  side: 'top' | 'bottom' | 'left' | 'right';
  offset: number;
  width: number;
  height: number;
}

export interface FloorplanConfig {
  dieWidth: number;
  dieHeight: number;
  coreMarginLeft: number;
  coreMarginRight: number;
  coreMarginTop: number;
  coreMarginBottom: number;
  stdCellRowHeight: number;
  macros: MacroBlock[];
  ioPads: IOPad[];
  targetUtilization?: number;
}

export type MetalLayer = 
  | 'Metal1' 
  | 'Metal2' 
  | 'Metal3' 
  | 'Metal4' 
  | 'Metal5' 
  | 'Metal6' 
  | 'Metal7' 
  | 'Metal8' 
  | 'Metal9'
  | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9';

export interface PowerPlanConfig {
  supplyVoltage: number;
  corePowerNets: {
    vdd: string;
    vss: string;
  };
  enableRings: boolean;
  ringWidth: number;
  ringSpacing: number;
  ringOffset: number;
  enableVStraps: boolean;
  vStrapWidth: number;
  vStrapPitch: number;
  vStrapLayer: MetalLayer;
  enableHStraps: boolean;
  hStrapWidth: number;
  hStrapPitch: number;
  hStrapLayer: MetalLayer;
  enableRails: boolean;
  railPitch: number;
  sheetResistanceMohm: number;
  maxIRDropTargetPercent: number;
  trunkWidth: number;
  vStrapOffset?: number;
  hStrapOffset?: number;
  ringLayerH?: MetalLayer;
  ringLayerV?: MetalLayer;
  railLayer?: MetalLayer;
  railWidth?: number;
  enablePadTrunks?: boolean;
  trunkCountPerSide?: number;
  trunkLayer?: MetalLayer;
  coreCurrentMa?: number;
}

export interface PowerGridNode {
  x: number;
  y: number;
  voltage: number;
  dropPercent: number;
  currentDensity?: number;
}

export type IRDropNode = PowerGridNode;

export interface PowerGridSimulationResult {
  vStrapCoords: number[];
  hStrapCoords: number[];
  nodes: PowerGridNode[];
  maxDropMv: number;
  maxDropPercent: number;
  avgDropMv: number;
  isDrcPass: boolean;
}

export interface PhysicalDRCError {
  id: string;
  type: 'OUT_OF_CORE' | 'MACRO_OVERLAP' | 'HALO_VIOLATION' | 'IO_CLEARANCE' | 'ROUTABILITY';
  severity: 'error' | 'warning';
  message: string;
  macroIds?: string[];
}




import React, { useState, useMemo, useEffect } from 'react';
import { 
  Cpu, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  Sliders, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  CheckCircle2,
  GitBranch,
  ArrowRight
} from 'lucide-react';

export interface MosTransistor {
  id: string;
  type: 'PMOS' | 'NMOS';
  name: string;
  gate: string;
  drain: string;
  source: string;
  bulk: string;
  width: number;
  length: number;
  x: number;
  y: number;
  stage?: 'carry' | 'carry_inv' | 'sum' | 'sum_inv' | 'main' | 'inv';
}

export interface CmosDesignData {
  cellName: string;
  description: string;
  topologyType?: 'static_cmos' | 'dynamic_cdl';
  availableTopologies?: Array<{ id: string; name: string; type: 'static_cmos' | 'dynamic_cdl' }>;
  inputs?: string[];
  outputs?: Array<{ name: string; label: string; formula: string }>;
  transistors: MosTransistor[];
  punDescription: string;
  pdnDescription: string;
  spiceNetlist: string;
  eulerPath?: string;
  sizingRecommendations: {
    pmosWidth: string;
    nmosWidth: string;
    mobilityRatio: string;
    tpLH: string;
    tpHL: string;
  };
}

interface CmosDesignViewerProps {
  data: CmosDesignData | null;
  isGenerating?: boolean;
  onGenerate?: () => void;
}

export function CmosDesignViewer({ data, isGenerating, onGenerate }: CmosDesignViewerProps) {
  // Active topology for Full Adder (Static 28T vs Dynamic CDL)
  const [selectedTopology, setSelectedTopology] = useState<'static_28t' | 'dynamic_cdl'>('static_28t');

  const [activeSubTab, setActiveSubTab] = useState<'TRANSISTORS' | 'SPICE' | 'STICK_LAYOUT' | 'SIZING'>('TRANSISTORS');
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [hoveredTransistor, setHoveredTransistor] = useState<MosTransistor | null>(null);
  const [inputStates, setInputStates] = useState<Record<string, '0' | '1'>>({ 
    a: '1', b: '0', c: '1', clock: '1'
  });


  // *** FIX: Sync inputStates whenever new data arrives (e.g. 16x1 MUX has different inputs) ***
  useEffect(() => {
    if (data?.inputs && data.inputs.length > 0) {
      const fresh: Record<string, '0' | '1'> = {};
      data.inputs.forEach(inp => { fresh[inp.toLowerCase()] = '0'; });
      setInputStates(fresh);
    }
  }, [data]);

  const defaultData: CmosDesignData = data || {
    cellName: 'CMOS_AND2_X1',
    description: '6-Transistor CMOS AND Gate (NAND2 Stage + Inverter Buffer)',
    inputs: ['a', 'b'],
    outputs: [{ name: 'y', label: 'AND Output Y', formula: 'A & B' }],
    punDescription: 'NAND Stage: Parallel PMOS (MP1 || MP2). Buffer: Single PMOS MP3.',
    pdnDescription: 'NAND Stage: Series NMOS (MN1 - MN2). Buffer: Single NMOS MN3.',
    sizingRecommendations: {
      pmosWidth: '1.2 μm',
      nmosWidth: '0.6 μm',
      mobilityRatio: 'μn / μp ≈ 2.5 : 1',
      tpLH: '16.4 ps',
      tpHL: '15.8 ps'
    },
    transistors: [
      { id: 'm1', type: 'PMOS', name: 'MP1', gate: 'A', drain: 'NAND_OUT', source: 'VDD', bulk: 'VDD', width: 1.2, length: 45, x: 100, y: 70 },
      { id: 'm2', type: 'PMOS', name: 'MP2', gate: 'B', drain: 'NAND_OUT', source: 'VDD', bulk: 'VDD', width: 1.2, length: 45, x: 200, y: 70 },
      { id: 'm3', type: 'NMOS', name: 'MN1', gate: 'A', drain: 'NAND_OUT', source: 'N_INT', bulk: 'VSS', width: 0.6, length: 45, x: 150, y: 210 },
      { id: 'm4', type: 'NMOS', name: 'MN2', gate: 'B', drain: 'N_INT', source: 'VSS', bulk: 'VSS', width: 0.6, length: 45, x: 150, y: 310 },
      { id: 'm5', type: 'PMOS', name: 'MP3 (INV)', gate: 'NAND_OUT', drain: 'Y', source: 'VDD', bulk: 'VDD', width: 1.2, length: 45, x: 340, y: 70 },
      { id: 'm6', type: 'NMOS', name: 'MN3 (INV)', gate: 'NAND_OUT', drain: 'Y', source: 'VSS', bulk: 'VSS', width: 0.6, length: 45, x: 340, y: 250 }
    ],
    eulerPath: 'VDD → MP1/MP2 → NAND_OUT → MN1 → MN2 → VSS | Buffer: VDD → MP3 → Y → MN3 → VSS',
    spiceNetlist: `* SPICE Netlist for 6T CMOS AND Gate\n.SUBCKT AND2_X1 A B Y VDD VSS\nM1 NAND_OUT A VDD VDD PMOS W=1.2u L=45n\nM2 NAND_OUT B VDD VDD PMOS W=1.2u L=45n\nM3 NAND_OUT A N_INT VSS NMOS W=0.6u L=45n\nM4 N_INT B VSS VSS NMOS W=0.6u L=45n\nM5 Y NAND_OUT VDD VDD PMOS W=1.2u L=45n\nM6 Y NAND_OUT VSS VSS NMOS W=0.6u L=45n\nCL Y VSS 15fF\n.ENDS AND2_X1`
  };

  const isFullAdder = defaultData.cellName.includes('ADDER') || defaultData.cellName.includes('FA');

  // Toggle interactive input value (0 <-> 1)
  const toggleInput = (inp: string) => {
    const lowerInp = inp.toLowerCase();
    setInputStates(prev => ({
      ...prev,
      [lowerInp]: prev[lowerInp] === '1' ? '0' : '1'
    }));
  };

  const copySpice = () => {
    navigator.clipboard.writeText(defaultData.spiceNetlist);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Component-scope signal values (needed by full adder SVG rendering)
  const aVal = inputStates.a === '1' ? 1 : 0;
  const bVal = inputStates.b === '1' ? 1 : 0;
  const cVal = (inputStates.c === '1' || inputStates.cin === '1') ? 1 : 0;
  const clkVal = inputStates.clock === '1' ? 1 : 0;

  // *** DYNAMIC live simulation — evaluates output formula from actual input states ***
  const netStates = useMemo<any>(() => {
    // For full adder, keep legacy logic
    if (isFullAdder) {
      const aVal = inputStates.a === '1' ? 1 : 0;
      const bVal = inputStates.b === '1' ? 1 : 0;
      const cVal = (inputStates.c === '1' || inputStates.cin === '1') ? 1 : 0;
      const clkVal = inputStates.clock === '1' ? 1 : 0;
      const coutVal = (aVal & bVal) | (bVal & cVal) | (aVal & cVal);
      const sumVal = aVal ^ bVal ^ cVal;
      return {
        ...inputStates,
        cout: coutVal.toString(),
        cout_b: (coutVal === 1 ? 0 : 1).toString(),
        sum: sumVal.toString(),
        sum_b: (sumVal === 1 ? 0 : 1).toString(),
        y: sumVal.toString(),
        clock: clkVal.toString()
      };
    }

    // Generic: evaluate the output formula expression dynamically
    let yVal = '?';
    try {
      const formula = defaultData.outputs?.[0]?.formula || '';
      // Build a JS expression by replacing input names with their values
      let expr = formula
        .replace(/\bsel\b/gi, inputStates.sel ?? '0')
        .replace(/\bd(\d+)\b/gi, (_: string, n: string) => inputStates[`d${n}`] ?? '0')
        .replace(/\ba\b/gi, inputStates.a ?? '0')
        .replace(/\bb\b/gi, inputStates.b ?? '0');
      // Evaluate simple ternary: sel ? d1 : d0
      const selKey = Object.keys(inputStates).find(k => k === 'sel');
      if (selKey !== undefined && formula.includes('?')) {
        const selVal = parseInt(inputStates[selKey] || '0');
        // Find which data input index is selected
        const dKey = `d${selVal}`;
        yVal = inputStates[dKey] ?? '0';
      } else if (defaultData.cellName.includes('MUX')) {
        // Mux evaluation: Y = D[SEL]
        let selVal = 0;
        let sBit = 0;
        while (inputStates[`s${sBit}`] !== undefined) {
          if (inputStates[`s${sBit}`] === '1') selVal |= (1 << sBit);
          sBit++;
        }
        yVal = inputStates[`d${selVal}`] ?? '0';
      } else if (defaultData.cellName.includes('DECODER')) {
        // Decoder evaluation: just output Y0 for the single rail
        let val = 0;
        for (let i = 0; i < 8; i++) {
          if (inputStates[`a${i}`] === '1') val |= (1 << i);
        }
        yVal = (val === 0) ? '1' : '0'; // Y0 is 1 only when A=0
      } else {
        // Fallback for AND/OR/standard gates
        const aVal = inputStates.a === '1' ? 1 : 0;
        const bVal = inputStates.b === '1' ? 1 : 0;
        if (defaultData.cellName.includes('INV'))  yVal = (aVal === 1 ? 0 : 1).toString();
        else if (defaultData.cellName.includes('NAND')) yVal = ((aVal & bVal) === 1 ? 0 : 1).toString();
        else if (defaultData.cellName.includes('AND'))  yVal = (aVal & bVal).toString();
        else if (defaultData.cellName.includes('NOR'))  yVal = ((aVal | bVal) === 1 ? 0 : 1).toString();
        else if (defaultData.cellName.includes('OR'))   yVal = (aVal | bVal).toString();
        else if (defaultData.cellName.includes('XOR'))  yVal = (aVal ^ bVal).toString();
        else yVal = '?';
      }
    } catch { yVal = '?'; }

    return { ...inputStates, y: yVal };
  }, [inputStates, isFullAdder, defaultData.cellName, defaultData.outputs]);


  // Determine available inputs for probing
  const activeInputKeys = useMemo(() => {
    if (defaultData.inputs && defaultData.inputs.length > 0) return defaultData.inputs;
    if (isFullAdder) return ['a', 'b', 'c'];
    if (defaultData.cellName.includes('INV')) return ['a'];
    return ['a', 'b'];
  }, [defaultData.inputs, isFullAdder, defaultData.cellName]);

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0B0F19] text-gray-400">
        <Activity size={48} className="text-amber-500 mb-4 animate-pulse" />
        <h2 className="text-xl font-semibold text-gray-200">Synthesizing CMOS Logic</h2>
        <p className="mt-2 text-sm text-center max-w-md">
          Generating transistor-level Pull-Up and Pull-Down Networks based on your RTL design...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0d12] text-gray-200 select-none overflow-y-auto">
      
      {/* Top Banner Controls */}
      <div className="p-3.5 bg-[#111620] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/15 text-purple-400 rounded-lg border border-purple-500/30">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-100 flex items-center space-x-2">
              <span>{defaultData.cellName}</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-mono">
                {isFullAdder ? '28T Mirror Full Adder' : 'CMOS Transistor Netlist'}
              </span>
            </h2>
            <p className="text-xs text-gray-400">Complete Transistor Interconnect Schematic • Live Interactive Probing</p>
          </div>
        </div>

        {/* Sub Navigation & Actions */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          
          {onGenerate && (
            <button
              onClick={onGenerate}
              className="px-3 py-1.5 flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs rounded border border-amber-500/30 transition-colors mr-2 font-sans"
            >
              <RotateCcw size={14} />
              Re-Synthesize
            </button>
          )}
          {/* Topology Switcher for Full Adder */}
          {isFullAdder && (
            <div className="flex items-center bg-black/50 p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setSelectedTopology('static_28t')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedTopology === 'static_28t' 
                    ? 'bg-purple-600 text-white font-bold shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Figure 2: 28-Transistor Static Mirror Full Adder with Full Interconnects"
              >
                Static CMOS 28T (Fig 2)
              </button>
              <button
                onClick={() => setSelectedTopology('dynamic_cdl')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedTopology === 'dynamic_cdl' 
                    ? 'bg-purple-600 text-white font-bold shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Figure 1: Conventional Dynamic Logic Full Adder (CDL)"
              >
                Dynamic CDL (Fig 1)
              </button>
            </div>
          )}

          {/* Sub Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setActiveSubTab('TRANSISTORS')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeSubTab === 'TRANSISTORS' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Schematic
            </button>
            <button
              onClick={() => setActiveSubTab('SPICE')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeSubTab === 'SPICE' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              SPICE
            </button>
            <button
              onClick={() => setActiveSubTab('STICK_LAYOUT')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeSubTab === 'STICK_LAYOUT' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Stick
            </button>
            <button
              onClick={() => setActiveSubTab('SIZING')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeSubTab === 'SIZING' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              W/L
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
              className="p-1 hover:bg-white/10 text-gray-300 rounded cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] text-purple-300 px-1">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.15, 1.8))}
              className="p-1 hover:bg-white/10 text-gray-300 rounded cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 p-4 flex flex-col xl:flex-row gap-4 overflow-hidden relative items-stretch">
        
        {/* VIEW 1: TRANSISTOR-LEVEL SCHEMATIC WITH COMPLETE INTERCONNECT WIRES */}
        {activeSubTab === 'TRANSISTORS' && (
          <div className="flex-1 flex flex-col xl:flex-row gap-4 h-full overflow-hidden">
            
            {/* SVG Schematic Canvas */}
            <div className="flex-1 bg-[#07090e] border border-white/10 rounded-2xl p-4 shadow-2xl relative flex items-center justify-center overflow-auto">
              
              <div 
                className="transition-transform duration-150 relative p-4"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              >
                
                {/* 1. 28-TRANSISTOR STATIC MIRROR CMOS FULL ADDER (Figure 2) */}
                {isFullAdder && selectedTopology === 'static_28t' ? (
                  <svg width="860" height="540" viewBox="0 0 860 540" className="font-mono select-none drop-shadow-2xl overflow-visible">
                    
                    {/* Top Main VDD Supply Rails & Inverter Supplies */}
                    <g>
                      {/* Carry Stage Vdd Top */}
                      <line x1="160" y1="25" x2="200" y2="25" stroke="#ef4444" strokeWidth="3.5" />
                      <line x1="180" y1="25" x2="180" y2="45" stroke="#ef4444" strokeWidth="2" />
                      <text x="180" y="16" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Vdd</text>

                      {/* Sum Stage Vdd Top */}
                      <line x1="610" y1="25" x2="650" y2="25" stroke="#ef4444" strokeWidth="3.5" />
                      <line x1="630" y1="25" x2="630" y2="45" stroke="#ef4444" strokeWidth="2" />
                      <text x="630" y="16" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Vdd</text>

                      {/* Inverter Vdd Tops */}
                      <line x1="720" y1="130" x2="750" y2="130" stroke="#ef4444" strokeWidth="3" />
                      <line x1="735" y1="130" x2="735" y2="145" stroke="#ef4444" strokeWidth="2" />
                      <text x="735" y="122" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">Vdd</text>

                      <line x1="720" y1="365" x2="750" y2="365" stroke="#ef4444" strokeWidth="3" />
                      <line x1="735" y1="365" x2="735" y2="380" stroke="#ef4444" strokeWidth="2" />
                      <text x="735" y="357" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">Vdd</text>
                    </g>

                    {/* Bottom Ground Rails */}
                    <g>
                      <GroundSymbol x={180} y={490} />
                      <GroundSymbol x={735} y={245} />
                      <GroundSymbol x={735} y={485} />
                    </g>

                    {/* SECTION 1: CARRY GENERATOR (LEFT) */}
                    <line x1="80" y1="45" x2="520" y2="45" stroke="#ef4444" strokeWidth="2" />
                    <circle cx="180" cy="45" r="3.5" fill="#ef4444" />
                    <circle cx="80" cy="45" r="3.5" fill="#ef4444" />
                    <circle cx="270" cy="45" r="3.5" fill="#ef4444" />
                    <circle cx="360" cy="45" r="3.5" fill="#ef4444" />
                    <circle cx="450" cy="45" r="3.5" fill="#ef4444" />
                    <circle cx="520" cy="45" r="3.5" fill="#ef4444" />

                    {/* Column 1: PMOS a in series with PMOS b */}
                    <line x1="80" y1="45" x2="80" y2="60" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={80} y={75} gateName="a" gateVal={aVal.toString()} conducting={aVal === 0} />
                    <line x1="80" y1="95" x2="80" y2="125" stroke="#94a3b8" strokeWidth="1.8" />
                    <PmosSymbol x={80} y={140} gateName="b" gateVal={bVal.toString()} conducting={bVal === 0} />
                    <line x1="80" y1="160" x2="80" y2="265" stroke="#f59e0b" strokeWidth="2" />

                    {/* Column 2: PMOS a & PMOS b in parallel */}
                    <line x1="150" y1="45" x2="150" y2="60" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={150} y={75} gateName="a" gateVal={aVal.toString()} conducting={aVal === 0} />
                    <line x1="150" y1="95" x2="150" y2="115" stroke="#94a3b8" strokeWidth="1.8" />

                    <line x1="220" y1="45" x2="220" y2="60" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={220} y={75} gateName="b" gateVal={bVal.toString()} conducting={bVal === 0} />
                    <line x1="220" y1="95" x2="220" y2="115" stroke="#94a3b8" strokeWidth="1.8" />

                    {/* Joint under parallel a & b, into PMOS c */}
                    <line x1="150" y1="115" x2="220" y2="115" stroke="#94a3b8" strokeWidth="1.8" />
                    <circle cx="185" cy="115" r="3.5" fill="#f59e0b" />
                    <line x1="185" y1="115" x2="185" y2="135" stroke="#94a3b8" strokeWidth="1.8" />
                    <PmosSymbol x={185} y={150} gateName="c" gateVal={cVal.toString()} conducting={cVal === 0} />
                    <line x1="185" y1="170" x2="185" y2="265" stroke="#f59e0b" strokeWidth="2" />

                    {/* CENTRAL INTERMEDIATE CARRY BUS (~CARRY) */}
                    <line x1="80" y1="265" x2="700" y2="265" stroke="#f59e0b" strokeWidth="2.5" />
                    <circle cx="80" cy="265" r="4" fill="#f59e0b" />
                    <circle cx="185" cy="265" r="4" fill="#f59e0b" />
                    <circle cx="360" cy="265" r="4" fill="#f59e0b" />
                    <circle cx="450" cy="265" r="4" fill="#f59e0b" />

                    {/* Carry Stage NMOS Pull-Down Network */}
                    <line x1="80" y1="265" x2="80" y2="340" stroke="#f59e0b" strokeWidth="2" />
                    <NmosSymbol x={80} y={355} gateName="b" gateVal={bVal.toString()} conducting={bVal === 1} />
                    <line x1="80" y1="375" x2="80" y2="405" stroke="#94a3b8" strokeWidth="1.8" />
                    <NmosSymbol x={80} y={420} gateName="a" gateVal={aVal.toString()} conducting={aVal === 1} />
                    <line x1="80" y1="440" x2="80" y2="480" stroke="#38bdf8" strokeWidth="2" />

                    {/* Column 2 NMOS: NMOS c in series with parallel NMOS a & b */}
                    <line x1="185" y1="265" x2="185" y2="335" stroke="#f59e0b" strokeWidth="2" />
                    <NmosSymbol x={185} y={350} gateName="c" gateVal={cVal.toString()} conducting={cVal === 1} />
                    <line x1="185" y1="370" x2="185" y2="390" stroke="#94a3b8" strokeWidth="1.8" />
                    <circle cx="185" cy="390" r="3.5" fill="#38bdf8" />
                    <line x1="150" y1="390" x2="220" y2="390" stroke="#94a3b8" strokeWidth="1.8" />

                    <line x1="150" y1="390" x2="150" y2="405" stroke="#94a3b8" strokeWidth="1.8" />
                    <NmosSymbol x={150} y={420} gateName="a" gateVal={aVal.toString()} conducting={aVal === 1} />
                    <line x1="150" y1="440" x2="150" y2="480" stroke="#38bdf8" strokeWidth="2" />

                    <line x1="220" y1="390" x2="220" y2="405" stroke="#94a3b8" strokeWidth="1.8" />
                    <NmosSymbol x={220} y={420} gateName="b" gateVal={bVal.toString()} conducting={bVal === 1} />
                    <line x1="220" y1="440" x2="220" y2="480" stroke="#38bdf8" strokeWidth="2" />

                    {/* Carry Stage Ground Return Rail */}
                    <line x1="80" y1="480" x2="520" y2="480" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="80" cy="480" r="3.5" fill="#38bdf8" />
                    <circle cx="150" cy="480" r="3.5" fill="#38bdf8" />
                    <circle cx="220" cy="480" r="3.5" fill="#38bdf8" />
                    <circle cx="180" cy="480" r="3.5" fill="#38bdf8" />
                    <line x1="180" y1="480" x2="180" y2="490" stroke="#38bdf8" strokeWidth="2" />

                    {/* SECTION 2: SUM GENERATOR (MIDDLE / RIGHT) */}
                    <line x1="310" y1="45" x2="310" y2="60" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={310} y={75} gateName="c" gateVal={cVal.toString()} conducting={cVal === 0} />
                    <line x1="310" y1="95" x2="310" y2="120" stroke="#94a3b8" strokeWidth="1.8" />

                    <line x1="380" y1="45" x2="380" y2="60" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={380} y={75} gateName="a" gateVal={aVal.toString()} conducting={aVal === 0} />
                    <line x1="380" y1="95" x2="380" y2="120" stroke="#94a3b8" strokeWidth="1.8" />

                    <line x1="450" y1="45" x2="450" y2="60" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={450} y={75} gateName="b" gateVal={bVal.toString()} conducting={bVal === 0} />
                    <line x1="450" y1="95" x2="450" y2="120" stroke="#94a3b8" strokeWidth="1.8" />

                    <line x1="310" y1="120" x2="450" y2="120" stroke="#94a3b8" strokeWidth="1.8" />
                    <circle cx="380" cy="120" r="3.5" fill="#ec4899" />
                    <line x1="380" y1="120" x2="380" y2="140" stroke="#94a3b8" strokeWidth="1.8" />

                    {/* PMOS driven by ~carry */}
                    <PmosSymbol x={380} y={155} gateName="~carry" gateVal={netStates.cout_b} conducting={netStates.cout_b === '0'} />
                    <line x1="360" y1="155" x2="360" y2="265" stroke="#f59e0b" strokeWidth="1.5" />
                    <line x1="360" y1="155" x2="367" y2="155" stroke="#f59e0b" strokeWidth="1.5" />
                    <line x1="380" y1="175" x2="380" y2="210" stroke="#ec4899" strokeWidth="2" />

                    {/* Right Series 3-PMOS Branch: a, b, c */}
                    <line x1="520" y1="45" x2="520" y2="60" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={520} y={75} gateName="a" gateVal={aVal.toString()} conducting={aVal === 0} />
                    <line x1="520" y1="95" x2="520" y2="115" stroke="#94a3b8" strokeWidth="1.8" />
                    <PmosSymbol x={520} y={130} gateName="b" gateVal={bVal.toString()} conducting={bVal === 0} />
                    <line x1="520" y1="150" x2="520" y2="170" stroke="#94a3b8" strokeWidth="1.8" />
                    <PmosSymbol x={520} y={185} gateName="c" gateVal={cVal.toString()} conducting={cVal === 0} />
                    <line x1="520" y1="205" x2="520" y2="210" stroke="#ec4899" strokeWidth="2" />

                    {/* INTERMEDIATE NODE (~SUM) */}
                    <line x1="380" y1="210" x2="700" y2="210" stroke="#ec4899" strokeWidth="2.5" />
                    <circle cx="380" cy="210" r="4" fill="#ec4899" />
                    <circle cx="520" cy="210" r="4" fill="#ec4899" />
                    <circle cx="700" cy="210" r="4" fill="#ec4899" />

                    {/* Sum Stage NMOS PDN */}
                    <line x1="380" y1="210" x2="380" y2="330" stroke="#ec4899" strokeWidth="2" />
                    <NmosSymbol x={380} y={345} gateName="~carry" gateVal={netStates.cout_b} conducting={netStates.cout_b === '1'} />
                    <line x1="360" y1="345" x2="360" y2="265" stroke="#f59e0b" strokeWidth="1.5" />
                    <line x1="360" y1="345" x2="375" y2="345" stroke="#f59e0b" strokeWidth="1.5" />

                    <line x1="380" y1="365" x2="380" y2="390" stroke="#94a3b8" strokeWidth="1.8" />
                    <circle cx="380" cy="390" r="3.5" fill="#38bdf8" />
                    <line x1="310" y1="390" x2="450" y2="390" stroke="#94a3b8" strokeWidth="1.8" />

                    <line x1="310" y1="390" x2="310" y2="405" stroke="#94a3b8" strokeWidth="1.8" />
                    <NmosSymbol x={310} y={420} gateName="c" gateVal={cVal.toString()} conducting={cVal === 1} />
                    <line x1="310" y1="440" x2="310" y2="480" stroke="#38bdf8" strokeWidth="2" />

                    <line x1="380" y1="390" x2="380" y2="405" stroke="#94a3b8" strokeWidth="1.8" />
                    <NmosSymbol x={380} y={420} gateName="b" gateVal={bVal.toString()} conducting={bVal === 1} />
                    <line x1="380" y1="440" x2="380" y2="480" stroke="#38bdf8" strokeWidth="2" />

                    <line x1="450" y1="390" x2="450" y2="405" stroke="#94a3b8" strokeWidth="1.8" />
                    <NmosSymbol x={450} y={420} gateName="a" gateVal={aVal.toString()} conducting={aVal === 1} />
                    <line x1="450" y1="440" x2="450" y2="480" stroke="#38bdf8" strokeWidth="2" />

                    {/* Series 3-NMOS Branch */}
                    <line x1="520" y1="210" x2="520" y2="310" stroke="#ec4899" strokeWidth="2" />
                    <NmosSymbol x={520} y={325} gateName="c" gateVal={cVal.toString()} conducting={cVal === 1} />
                    <line x1="520" y1="345" x2="520" y2="365" stroke="#94a3b8" strokeWidth="1.8" />
                    <NmosSymbol x={520} y={380} gateName="b" gateVal={bVal.toString()} conducting={bVal === 1} />
                    <line x1="520" y1="400" x2="520" y2="420" stroke="#94a3b8" strokeWidth="1.8" />
                    <NmosSymbol x={520} y={435} gateName="a" gateVal={aVal.toString()} conducting={aVal === 1} />
                    <line x1="520" y1="455" x2="520" y2="480" stroke="#38bdf8" strokeWidth="2" />

                    {/* Sum Ground Connections */}
                    <circle cx="310" cy="480" r="3.5" fill="#38bdf8" />
                    <circle cx="380" cy="480" r="3.5" fill="#38bdf8" />
                    <circle cx="450" cy="480" r="3.5" fill="#38bdf8" />
                    <circle cx="520" cy="480" r="3.5" fill="#38bdf8" />

                    {/* SECTION 3: INVERTERS */}
                    {/* Sum Inverter */}
                    <line x1="700" y1="210" x2="720" y2="210" stroke="#ec4899" strokeWidth="2" />
                    <line x1="720" y1="160" x2="720" y2="220" stroke="#ec4899" strokeWidth="1.8" />
                    <circle cx="720" cy="210" r="3.5" fill="#ec4899" />
                    
                    <line x1="735" y1="145" x2="735" y2="150" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={735} y={160} gateName="" conducting={netStates.sum_b === '0'} />
                    <line x1="720" y1="160" x2="722" y2="160" stroke="#ec4899" strokeWidth="1.5" />

                    <line x1="720" y1="220" x2="730" y2="220" stroke="#ec4899" strokeWidth="1.5" />
                    <NmosSymbol x={735} y={220} gateName="" conducting={netStates.sum_b === '1'} />
                    <line x1="735" y1="235" x2="735" y2="245" stroke="#38bdf8" strokeWidth="2" />

                    <line x1="735" y1="175" x2="735" y2="205" stroke="#a855f7" strokeWidth="2" />
                    <circle cx="735" cy="190" r="4" fill="#a855f7" />
                    <line x1="735" y1="190" x2="800" y2="190" stroke="#a855f7" strokeWidth="2.5" />
                    <circle cx="800" cy="190" r="5" fill="#a855f7" />
                    <text x="810" y="194" fill="#c084fc" fontSize="13" fontWeight="bold">
                      sum = {netStates.sum}
                    </text>

                    {/* Carry Inverter */}
                    <line x1="700" y1="265" x2="720" y2="265" stroke="#f59e0b" strokeWidth="2" />
                    <line x1="720" y1="265" x2="720" y2="445" stroke="#f59e0b" strokeWidth="1.8" />
                    <circle cx="720" cy="265" r="3.5" fill="#f59e0b" />

                    <line x1="735" y1="380" x2="735" y2="385" stroke="#ef4444" strokeWidth="2" />
                    <PmosSymbol x={735} y={395} gateName="" conducting={netStates.cout_b === '0'} />
                    <line x1="720" y1="395" x2="722" y2="395" stroke="#f59e0b" strokeWidth="1.5" />

                    <line x1="720" y1="445" x2="730" y2="445" stroke="#f59e0b" strokeWidth="1.5" />
                    <NmosSymbol x={735} y={445} gateName="" conducting={netStates.cout_b === '1'} />
                    <line x1="735" y1="465" x2="735" y2="485" stroke="#38bdf8" strokeWidth="2" />

                    <line x1="735" y1="410" x2="735" y2="430" stroke="#10b981" strokeWidth="2" />
                    <circle cx="735" cy="420" r="4" fill="#10b981" />
                    <line x1="735" y1="420" x2="800" y2="420" stroke="#10b981" strokeWidth="2.5" />
                    <circle cx="800" cy="420" r="5" fill="#10b981" />
                    <text x="810" y="424" fill="#34d399" fontSize="13" fontWeight="bold">
                      carry = {netStates.cout}
                    </text>

                  </svg>
                ) : isFullAdder && selectedTopology === 'dynamic_cdl' ? (
                  /* 2. DYNAMIC LOGIC CDL FULL ADDER (Figure 1) */
                  <svg width="760" height="460" viewBox="0 0 760 460" className="font-mono select-none drop-shadow-2xl">
                    <g>
                      <line x1="180" y1="35" x2="220" y2="35" stroke="#ef4444" strokeWidth="3.5" />
                      <line x1="200" y1="35" x2="200" y2="55" stroke="#ef4444" strokeWidth="2" />
                      <text x="200" y="25" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Vdd</text>

                      <line x1="510" y1="35" x2="550" y2="35" stroke="#ef4444" strokeWidth="3.5" />
                      <line x1="530" y1="35" x2="530" y2="55" stroke="#ef4444" strokeWidth="2" />
                      <text x="530" y="25" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Vdd</text>
                    </g>

                    <g>
                      <GroundSymbol x={200} y={395} />
                      <GroundSymbol x={530} y={395} />
                    </g>

                    {/* Carry Stage (Left) */}
                    <g>
                      <rect x="30" y="45" width="320" height="365" rx="12" fill="#131924" fillOpacity="0.6" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="45" y="68" fill="#60a5fa" fontSize="10" fontWeight="bold">STAGE 1: Carry Generator (CDL)</text>

                      <PmosSymbol x={200} y={75} gateName="~clock" gateVal={clkVal === 1 ? '0' : '1'} conducting={clkVal === 0} label="MP1" />
                      <line x1="200" y1="95" x2="200" y2="120" stroke="#94a3b8" strokeWidth="1.8" />
                      <line x1="130" y1="120" x2="270" y2="120" stroke="#94a3b8" strokeWidth="1.8" />

                      <line x1="130" y1="120" x2="130" y2="140" stroke="#94a3b8" strokeWidth="1.8" />
                      <PmosSymbol x={130} y={155} gateName="a" gateVal={aVal.toString()} conducting={aVal === 0} />
                      <line x1="130" y1="175" x2="130" y2="200" stroke="#94a3b8" strokeWidth="1.8" />

                      <line x1="200" y1="120" x2="200" y2="140" stroke="#94a3b8" strokeWidth="1.8" />
                      <PmosSymbol x={200} y={155} gateName="b" gateVal={bVal.toString()} conducting={bVal === 0} />
                      <line x1="200" y1="175" x2="200" y2="200" stroke="#94a3b8" strokeWidth="1.8" />

                      <line x1="130" y1="200" x2="200" y2="200" stroke="#94a3b8" strokeWidth="1.8" />
                      <circle cx="200" cy="200" r="3.5" fill="#f59e0b" />

                      <line x1="200" y1="200" x2="200" y2="215" stroke="#94a3b8" strokeWidth="1.8" />
                      <PmosSymbol x={200} y={230} gateName="c" gateVal={cVal.toString()} conducting={cVal === 0} />
                      <line x1="200" y1="250" x2="200" y2="280" stroke="#f59e0b" strokeWidth="2" />

                      <line x1="270" y1="120" x2="270" y2="140" stroke="#94a3b8" strokeWidth="1.8" />
                      <PmosSymbol x={270} y={155} gateName="a" gateVal={aVal.toString()} conducting={aVal === 0} />
                      <line x1="270" y1="175" x2="270" y2="215" stroke="#94a3b8" strokeWidth="1.8" />
                      <PmosSymbol x={270} y={230} gateName="b" gateVal={bVal.toString()} conducting={bVal === 0} />
                      <line x1="270" y1="250" x2="270" y2="280" stroke="#f59e0b" strokeWidth="2" />

                      <line x1="200" y1="280" x2="270" y2="280" stroke="#f59e0b" strokeWidth="2.5" />
                      <circle cx="200" cy="280" r="4" fill="#f59e0b" />
                      <circle cx="270" cy="280" r="4" fill="#f59e0b" />
                      <text x="240" y="300" fill="#fbbf24" fontSize="11" fontWeight="bold">carry</text>

                      <line x1="200" y1="280" x2="200" y2="330" stroke="#94a3b8" strokeWidth="1.8" />
                      <NmosSymbol x={200} y={345} gateName="~clock" gateVal={clkVal === 1 ? '0' : '1'} conducting={clkVal === 0} label="MN1" />
                      <line x1="200" y1="365" x2="200" y2="395" stroke="#38bdf8" strokeWidth="2" />

                      <line x1="270" y1="280" x2="430" y2="280" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
                      <circle cx="270" cy="280" r="3.5" fill="#f59e0b" />
                    </g>

                    {/* Sum Stage (Right) */}
                    <g>
                      <rect x="375" y="45" width="345" height="365" rx="12" fill="#131924" fillOpacity="0.6" stroke="#a855f7" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="390" y="68" fill="#c084fc" fontSize="10" fontWeight="bold">STAGE 2: Sum Generator (CDL)</text>

                      <PmosSymbol x={530} y={75} gateName="clock" gateVal={clkVal.toString()} conducting={clkVal === 0} label="MP2" />

                      <line x1="530" y1="95" x2="530" y2="120" stroke="#ec4899" strokeWidth="2.5" />
                      <line x1="440" y1="120" x2="680" y2="120" stroke="#ec4899" strokeWidth="2.5" />
                      <circle cx="440" cy="120" r="4" fill="#ec4899" />
                      <circle cx="530" cy="120" r="4" fill="#ec4899" />
                      <circle cx="680" cy="120" r="4" fill="#ec4899" />
                      <text x="600" y="110" fill="#f472b6" fontSize="11" fontWeight="bold">sum</text>

                      <line x1="440" y1="120" x2="440" y2="140" stroke="#94a3b8" strokeWidth="1.8" />
                      <NmosSymbol x={440} y={155} gateName="a" gateVal={aVal.toString()} conducting={aVal === 1} />
                      <line x1="440" y1="175" x2="440" y2="205" stroke="#94a3b8" strokeWidth="1.8" />

                      <line x1="510" y1="120" x2="510" y2="140" stroke="#94a3b8" strokeWidth="1.8" />
                      <NmosSymbol x={510} y={155} gateName="b" gateVal={bVal.toString()} conducting={bVal === 1} />
                      <line x1="510" y1="175" x2="510" y2="205" stroke="#94a3b8" strokeWidth="1.8" />

                      <line x1="580" y1="120" x2="580" y2="140" stroke="#94a3b8" strokeWidth="1.8" />
                      <NmosSymbol x={580} y={155} gateName="c" gateVal={cVal.toString()} conducting={cVal === 1} />
                      <line x1="580" y1="175" x2="580" y2="205" stroke="#94a3b8" strokeWidth="1.8" />

                      <line x1="440" y1="205" x2="580" y2="205" stroke="#94a3b8" strokeWidth="1.8" />
                      <circle cx="510" cy="205" r="3.5" fill="#38bdf8" />

                      <line x1="510" y1="205" x2="510" y2="230" stroke="#94a3b8" strokeWidth="1.8" />
                      <line x1="430" y1="280" x2="495" y2="280" stroke="#f59e0b" strokeWidth="1.5" />
                      <line x1="495" y1="280" x2="495" y2="245" stroke="#f59e0b" strokeWidth="1.5" />
                      <line x1="495" y1="245" x2="505" y2="245" stroke="#f59e0b" strokeWidth="1.5" />
                      <NmosSymbol x={510} y={245} gateName="~carry" gateVal={netStates.cout_b} conducting={netStates.cout_b === '1'} />
                      <line x1="510" y1="265" x2="510" y2="330" stroke="#94a3b8" strokeWidth="1.8" />

                      <line x1="680" y1="120" x2="680" y2="140" stroke="#94a3b8" strokeWidth="1.8" />
                      <NmosSymbol x={680} y={155} gateName="a" gateVal={aVal.toString()} conducting={aVal === 1} />
                      <line x1="680" y1="175" x2="680" y2="200" stroke="#94a3b8" strokeWidth="1.8" />
                      <NmosSymbol x={680} y={215} gateName="b" gateVal={bVal.toString()} conducting={bVal === 1} />
                      <line x1="680" y1="235" x2="680" y2="260" stroke="#94a3b8" strokeWidth="1.8" />
                      <NmosSymbol x={680} y={275} gateName="c" gateVal={cVal.toString()} conducting={cVal === 1} />
                      <line x1="680" y1="295" x2="680" y2="330" stroke="#94a3b8" strokeWidth="1.8" />

                      <line x1="510" y1="330" x2="680" y2="330" stroke="#94a3b8" strokeWidth="1.8" />
                      <circle cx="530" cy="330" r="3.5" fill="#38bdf8" />
                      <line x1="530" y1="330" x2="530" y2="340" stroke="#94a3b8" strokeWidth="1.8" />
                      <NmosSymbol x={530} y={350} gateName="clock" gateVal={clkVal.toString()} conducting={clkVal === 1} label="MN2" />
                      <line x1="530" y1="370" x2="530" y2="395" stroke="#38bdf8" strokeWidth="2" />
                    </g>
                  </svg>
                ) : (
                  /* 3. STANDARD GATES: AND2, OR2, NAND2, NOR2, INV, XOR2 FULLY WIRED */
                  <svg width="560" height="460" viewBox="0 0 560 460" className="font-mono select-none drop-shadow-2xl overflow-visible">
                    {/* Top VDD Rail */}
                    <line x1="40" y1="30" x2="520" y2="30" stroke="#ef4444" strokeWidth="4" />
                    <text x="50" y="22" fill="#ef4444" fontSize="12" fontWeight="bold">Vdd (1.0V)</text>

                    {/* Bottom Ground Rail */}
                    <line x1="40" y1="410" x2="520" y2="410" stroke="#38bdf8" strokeWidth="4" />
                    <text x="50" y="426" fill="#38bdf8" fontSize="12" fontWeight="bold">Vss (GND)</text>

                    {/* A. 6T CMOS AND GATE (NAND2 + INVERTER BUFFER) */}
                    {(defaultData.cellName.includes('AND') && !defaultData.cellName.includes('NAND')) && (
                      <g>
                        {/* Stage 1: NAND Stage */}
                        {/* Vdd drops to MP1 & MP2 */}
                        <line x1="100" y1="30" x2="100" y2="55" stroke="#ef4444" strokeWidth="2" />
                        <line x1="200" y1="30" x2="200" y2="55" stroke="#ef4444" strokeWidth="2" />
                        <circle cx="100" cy="30" r="3.5" fill="#ef4444" />
                        <circle cx="200" cy="30" r="3.5" fill="#ef4444" />

                        {/* Parallel PMOS MP1 (A) & MP2 (B) */}
                        <PmosSymbol x={100} y={70} gateName="A" gateVal={aVal.toString()} conducting={aVal === 0} label="MP1" />
                        <PmosSymbol x={200} y={70} gateName="B" gateVal={bVal.toString()} conducting={bVal === 0} label="MP2" />

                        {/* Drains join into internal NAND_OUT bus at y=130 */}
                        <line x1="100" y1="88" x2="100" y2="130" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="200" y1="88" x2="200" y2="130" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="100" y1="130" x2="280" y2="130" stroke="#f59e0b" strokeWidth="2.5" />
                        <circle cx="100" cy="130" r="3.5" fill="#f59e0b" />
                        <circle cx="200" cy="130" r="3.5" fill="#f59e0b" />
                        <circle cx="150" cy="130" r="3.5" fill="#f59e0b" />
                        <text x="215" y="122" fill="#fbbf24" fontSize="10" fontWeight="bold">nand_out</text>

                        {/* NAND_OUT connects to series NMOS MN1 */}
                        <line x1="150" y1="130" x2="150" y2="195" stroke="#f59e0b" strokeWidth="2" />
                        <NmosSymbol x={150} y={210} gateName="A" gateVal={aVal.toString()} conducting={aVal === 1} label="MN1" />

                        {/* Series node N_INT between MN1 and MN2 */}
                        <line x1="150" y1="228" x2="150" y2="295" stroke="#94a3b8" strokeWidth="2" />
                        <NmosSymbol x={150} y={310} gateName="B" gateVal={bVal.toString()} conducting={bVal === 1} label="MN2" />

                        {/* MN2 source to Ground rail */}
                        <line x1="150" y1="328" x2="150" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <circle cx="150" cy="410" r="3.5" fill="#38bdf8" />

                        {/* Stage 2: Inverter Buffer Stage */}
                        {/* Internal net NAND_OUT splits to gates of MP3 and MN3 */}
                        <line x1="280" y1="130" x2="305" y2="130" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="305" y1="70" x2="305" y2="250" stroke="#f59e0b" strokeWidth="2" />
                        <circle cx="305" cy="130" r="3.5" fill="#f59e0b" />
                        
                        <line x1="305" y1="70" x2="318" y2="70" stroke="#f59e0b" strokeWidth="1.5" />
                        <line x1="305" y1="250" x2="325" y2="250" stroke="#f59e0b" strokeWidth="1.5" />

                        {/* Inverter PMOS MP3 */}
                        <line x1="340" y1="30" x2="340" y2="55" stroke="#ef4444" strokeWidth="2" />
                        <circle cx="340" cy="30" r="3.5" fill="#ef4444" />
                        <PmosSymbol x={340} y={70} gateName="" conducting={(aVal & bVal) === 0} label="MP3(INV)" />

                        {/* Inverter NMOS MN3 */}
                        <NmosSymbol x={340} y={250} gateName="" conducting={(aVal & bVal) === 1} label="MN3(INV)" />
                        <line x1="340" y1="268" x2="340" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <circle cx="340" cy="410" r="3.5" fill="#38bdf8" />

                        {/* Common Output Line Y between MP3 drain and MN3 drain */}
                        <line x1="340" y1="88" x2="340" y2="232" stroke="#a855f7" strokeWidth="2.5" />
                        <circle cx="340" cy="160" r="4" fill="#a855f7" />
                        <line x1="340" y1="160" x2="460" y2="160" stroke="#a855f7" strokeWidth="2.5" />
                        <circle cx="460" cy="160" r="5" fill="#a855f7" />
                        <text x="472" y="164" fill="#c084fc" fontSize="13" fontWeight="bold">
                          Y = {netStates.y}
                        </text>
                      </g>
                    )}

                    {/* B. 6T CMOS OR GATE (NOR2 + INVERTER BUFFER) */}
                    {(defaultData.cellName.includes('OR') && !defaultData.cellName.includes('NOR') && !defaultData.cellName.includes('XOR')) && (
                      <g>
                        {/* Stage 1: NOR Stage */}
                        {/* Vdd drop to MP1 */}
                        <line x1="140" y1="30" x2="140" y2="45" stroke="#ef4444" strokeWidth="2" />
                        <circle cx="140" cy="30" r="3.5" fill="#ef4444" />
                        <PmosSymbol x={140} y={60} gateName="A" gateVal={aVal.toString()} conducting={aVal === 0} label="MP1" />

                        {/* Series node P_INT to MP2 */}
                        <line x1="140" y1="78" x2="140" y2="125" stroke="#94a3b8" strokeWidth="2" />
                        <PmosSymbol x={140} y={140} gateName="B" gateVal={bVal.toString()} conducting={bVal === 0} label="MP2" />

                        {/* MP2 drain to internal NOR_OUT bus at y=190 */}
                        <line x1="140" y1="158" x2="140" y2="190" stroke="#f59e0b" strokeWidth="2.5" />
                        <line x1="90" y1="190" x2="280" y2="190" stroke="#f59e0b" strokeWidth="2.5" />
                        <circle cx="140" cy="190" r="3.5" fill="#f59e0b" />
                        <circle cx="90" cy="190" r="3.5" fill="#f59e0b" />
                        <circle cx="190" cy="190" r="3.5" fill="#f59e0b" />
                        <text x="215" y="182" fill="#fbbf24" fontSize="10" fontWeight="bold">nor_out</text>

                        {/* NOR_OUT to parallel NMOS MN1 & MN2 */}
                        <line x1="90" y1="190" x2="90" y2="245" stroke="#f59e0b" strokeWidth="2" />
                        <NmosSymbol x={90} y={260} gateName="A" gateVal={aVal.toString()} conducting={aVal === 1} label="MN1" />

                        <line x1="190" y1="190" x2="190" y2="245" stroke="#f59e0b" strokeWidth="2" />
                        <NmosSymbol x={190} y={260} gateName="B" gateVal={bVal.toString()} conducting={bVal === 1} label="MN2" />

                        {/* MN1 & MN2 sources to Ground */}
                        <line x1="90" y1="278" x2="90" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="190" y1="278" x2="190" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <circle cx="90" cy="410" r="3.5" fill="#38bdf8" />
                        <circle cx="190" cy="410" r="3.5" fill="#38bdf8" />

                        {/* Stage 2: Inverter Buffer Stage */}
                        <line x1="280" y1="190" x2="305" y2="190" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="305" y1="70" x2="305" y2="250" stroke="#f59e0b" strokeWidth="2" />
                        <circle cx="305" cy="190" r="3.5" fill="#f59e0b" />
                        
                        <line x1="305" y1="70" x2="318" y2="70" stroke="#f59e0b" strokeWidth="1.5" />
                        <line x1="305" y1="250" x2="325" y2="250" stroke="#f59e0b" strokeWidth="1.5" />

                        {/* Inverter PMOS MP3 */}
                        <line x1="340" y1="30" x2="340" y2="55" stroke="#ef4444" strokeWidth="2" />
                        <circle cx="340" cy="30" r="3.5" fill="#ef4444" />
                        <PmosSymbol x={340} y={70} gateName="" conducting={(aVal | bVal) === 0} label="MP3(INV)" />

                        {/* Inverter NMOS MN3 */}
                        <NmosSymbol x={340} y={250} gateName="" conducting={(aVal | bVal) === 1} label="MN3(INV)" />
                        <line x1="340" y1="268" x2="340" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <circle cx="340" cy="410" r="3.5" fill="#38bdf8" />

                        {/* Output Line Y */}
                        <line x1="340" y1="88" x2="340" y2="232" stroke="#a855f7" strokeWidth="2.5" />
                        <circle cx="340" cy="160" r="4" fill="#a855f7" />
                        <line x1="340" y1="160" x2="460" y2="160" stroke="#a855f7" strokeWidth="2.5" />
                        <circle cx="460" cy="160" r="5" fill="#a855f7" />
                        <text x="472" y="164" fill="#c084fc" fontSize="13" fontWeight="bold">
                          Y = {netStates.y}
                        </text>
                      </g>
                    )}

                    {/* C. 4T CMOS NAND GATE */}
                    {defaultData.cellName.includes('NAND') && (
                      <g>
                        <line x1="140" y1="30" x2="140" y2="55" stroke="#ef4444" strokeWidth="2" />
                        <line x1="280" y1="30" x2="280" y2="55" stroke="#ef4444" strokeWidth="2" />
                        <circle cx="140" cy="30" r="3.5" fill="#ef4444" />
                        <circle cx="280" cy="30" r="3.5" fill="#ef4444" />

                        <PmosSymbol x={140} y={70} gateName="A" gateVal={aVal.toString()} conducting={aVal === 0} label="MP1" />
                        <PmosSymbol x={280} y={70} gateName="B" gateVal={bVal.toString()} conducting={bVal === 0} label="MP2" />

                        <line x1="140" y1="88" x2="140" y2="150" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="280" y1="88" x2="280" y2="150" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="140" y1="150" x2="420" y2="150" stroke="#f59e0b" strokeWidth="2.5" />
                        <circle cx="140" cy="150" r="3.5" fill="#f59e0b" />
                        <circle cx="280" cy="150" r="3.5" fill="#f59e0b" />
                        <circle cx="210" cy="150" r="3.5" fill="#f59e0b" />

                        <line x1="210" y1="150" x2="210" y2="200" stroke="#f59e0b" strokeWidth="2" />
                        <NmosSymbol x={210} y={215} gateName="A" gateVal={aVal.toString()} conducting={aVal === 1} label="MN1" />

                        <line x1="210" y1="233" x2="210" y2="300" stroke="#94a3b8" strokeWidth="2" />
                        <NmosSymbol x={210} y={315} gateName="B" gateVal={bVal.toString()} conducting={bVal === 1} label="MN2" />

                        <line x1="210" y1="333" x2="210" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <circle cx="210" cy="410" r="3.5" fill="#38bdf8" />

                        <circle cx="420" cy="150" r="5" fill="#f59e0b" />
                        <text x="435" y="154" fill="#fbbf24" fontSize="13" fontWeight="bold">
                          Y = {netStates.y}
                        </text>
                      </g>
                    )}

                    {/* D. 4T CMOS NOR GATE */}
                    {defaultData.cellName.includes('NOR') && !defaultData.cellName.includes('OR2') && (
                      <g>
                        <line x1="210" y1="30" x2="210" y2="45" stroke="#ef4444" strokeWidth="2" />
                        <circle cx="210" cy="30" r="3.5" fill="#ef4444" />
                        <PmosSymbol x={210} y={60} gateName="A" gateVal={aVal.toString()} conducting={aVal === 0} label="MP1" />

                        <line x1="210" y1="78" x2="210" y2="125" stroke="#94a3b8" strokeWidth="2" />
                        <PmosSymbol x={210} y={140} gateName="B" gateVal={bVal.toString()} conducting={bVal === 0} label="MP2" />

                        <line x1="210" y1="158" x2="210" y2="190" stroke="#f59e0b" strokeWidth="2.5" />
                        <line x1="140" y1="190" x2="420" y2="190" stroke="#f59e0b" strokeWidth="2.5" />
                        <circle cx="210" cy="190" r="3.5" fill="#f59e0b" />
                        <circle cx="140" cy="190" r="3.5" fill="#f59e0b" />
                        <circle cx="280" cy="190" r="3.5" fill="#f59e0b" />

                        <line x1="140" y1="190" x2="140" y2="245" stroke="#f59e0b" strokeWidth="2" />
                        <NmosSymbol x={140} y={260} gateName="A" gateVal={aVal.toString()} conducting={aVal === 1} label="MN1" />

                        <line x1="280" y1="190" x2="280" y2="245" stroke="#f59e0b" strokeWidth="2" />
                        <NmosSymbol x={280} y={260} gateName="B" gateVal={bVal.toString()} conducting={bVal === 1} label="MN2" />

                        <line x1="140" y1="278" x2="140" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="280" y1="278" x2="280" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <circle cx="140" cy="410" r="3.5" fill="#38bdf8" />
                        <circle cx="280" cy="410" r="3.5" fill="#38bdf8" />

                        <circle cx="420" cy="190" r="5" fill="#f59e0b" />
                        <text x="435" y="194" fill="#fbbf24" fontSize="13" fontWeight="bold">
                          Y = {netStates.y}
                        </text>
                      </g>
                    )}

                    {/* E. 2T CMOS INVERTER */}
                    {defaultData.cellName.includes('INV') && (
                      <g>
                        <line x1="240" y1="30" x2="240" y2="55" stroke="#ef4444" strokeWidth="2" />
                        <circle cx="240" cy="30" r="3.5" fill="#ef4444" />
                        <PmosSymbol x={240} y={70} gateName="A" gateVal={aVal.toString()} conducting={aVal === 0} label="MP1" />

                        <line x1="240" y1="88" x2="240" y2="242" stroke="#f59e0b" strokeWidth="2" />
                        <circle cx="240" cy="165" r="4" fill="#f59e0b" />
                        <line x1="240" y1="165" x2="400" y2="165" stroke="#f59e0b" strokeWidth="2.5" />
                        <circle cx="400" cy="165" r="5" fill="#f59e0b" />
                        <text x="415" y="169" fill="#fbbf24" fontSize="13" fontWeight="bold">
                          Y = {netStates.y}
                        </text>

                        <NmosSymbol x={240} y={260} gateName="A" gateVal={aVal.toString()} conducting={aVal === 1} label="MN1" />
                        <line x1="240" y1="278" x2="240" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <circle cx="240" cy="410" r="3.5" fill="#38bdf8" />

                        {/* Gate A input connection trace */}
                        <line x1="190" y1="70" x2="190" y2="260" stroke="#94a3b8" strokeWidth="1.8" />
                        <line x1="130" y1="165" x2="190" y2="165" stroke="#94a3b8" strokeWidth="2" />
                        <circle cx="190" cy="165" r="3.5" fill="#94a3b8" />
                        <text x="120" y="169" fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="end">A={aVal}</text>
                      </g>
                    )}

                    {/* F. 8T TRANSMISSION-GATE XOR */}
                    {defaultData.cellName.includes('XOR') && (
                      <g>
                        {/* Inverter A */}
                        <line x1="80" y1="30" x2="80" y2="55" stroke="#ef4444" strokeWidth="2" />
                        <circle cx="80" cy="30" r="3.5" fill="#ef4444" />
                        <PmosSymbol x={80} y={70} gateName="A" gateVal={aVal.toString()} conducting={aVal === 0} label="MP_INVA" />
                        <line x1="80" y1="88" x2="80" y2="242" stroke="#94a3b8" strokeWidth="2" />
                        <circle cx="80" cy="165" r="3.5" fill="#94a3b8" />
                        <NmosSymbol x={80} y={260} gateName="A" gateVal={aVal.toString()} conducting={aVal === 1} label="MN_INVA" />
                        <line x1="80" y1="278" x2="80" y2="410" stroke="#38bdf8" strokeWidth="2" />
                        <circle cx="80" cy="410" r="3.5" fill="#38bdf8" />

                        {/* Transmission Gate 1 */}
                        <line x1="220" y1="60" x2="220" y2="70" stroke="#94a3b8" strokeWidth="2" />
                        <PmosSymbol x={220} y={85} gateName="A" gateVal={aVal.toString()} conducting={aVal === 0} label="MP_TG1" />
                        <NmosSymbol x={220} y={155} gateName="~A" gateVal={aVal === 1 ? '0' : '1'} conducting={aVal === 0} label="MN_TG1" />
                        <line x1="220" y1="103" x2="220" y2="137" stroke="#f59e0b" strokeWidth="2" />

                        {/* Transmission Gate 2 */}
                        <PmosSymbol x={340} y={85} gateName="~A" gateVal={aVal === 1 ? '0' : '1'} conducting={aVal === 1} label="MP_TG2" />
                        <NmosSymbol x={340} y={155} gateName="A" gateVal={aVal.toString()} conducting={aVal === 1} label="MN_TG2" />
                        <line x1="340" y1="103" x2="340" y2="137" stroke="#f59e0b" strokeWidth="2" />

                        {/* Common Output Line Y */}
                        <line x1="220" y1="120" x2="340" y2="120" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="340" y1="120" x2="450" y2="120" stroke="#f59e0b" strokeWidth="2.5" />
                        <circle cx="220" cy="120" r="3.5" fill="#f59e0b" />
                        <circle cx="340" cy="120" r="3.5" fill="#f59e0b" />
                        <circle cx="450" cy="120" r="5" fill="#f59e0b" />
                        <text x="462" y="124" fill="#fbbf24" fontSize="13" fontWeight="bold">
                          Y = {netStates.y}
                        </text>
                      </g>
                    )}

                  </svg>
                )}

                {/* GENERIC CMOS AUTO-WIRING RENDERER — for MUX, DFF, or any LLM-generated circuit */}
                {(defaultData.cellName.includes('MUX') || !(defaultData.cellName.includes('AND') || defaultData.cellName.includes('OR') || defaultData.cellName.includes('INV') || defaultData.cellName.includes('XOR') || isFullAdder)) && (() => {
                  const pmos = defaultData.transistors?.filter(t => t.type === 'PMOS') || [];
                  const nmos = defaultData.transistors?.filter(t => t.type === 'NMOS') || [];
                  const svgW = 700;
                  const svgH = 520;
                  const vddY = 30;
                  const gndY = 490;
                  const punY = 120;    // PMOS drain row Y
                  const pdnY = 360;    // NMOS drain row Y
                  const outX = svgW / 2;
                  const outY = (punY + pdnY) / 2;  // mid-rail output node

                  // Spread PMOS evenly across width
                  const pmosStep = pmos.length > 0 ? Math.min(120, (svgW - 100) / pmos.length) : 120;
                  const pmosStartX = (svgW - pmosStep * (pmos.length - 1)) / 2;

                  // Spread NMOS evenly
                  const nmosStep = nmos.length > 0 ? Math.min(120, (svgW - 100) / nmos.length) : 120;
                  const nmosStartX = (svgW - nmosStep * (nmos.length - 1)) / 2;

                  const pmosXs = pmos.map((_, i) => pmosStartX + i * pmosStep);
                  const nmosXs = nmos.map((_, i) => nmosStartX + i * nmosStep);

                  const inputStatesRecord: Record<string,string> = inputStates;
                  const getInputVal = (name: string) => {
                    const lower = name.toLowerCase();
                    // Decoder support (SELx or ~SELx)
                    if (lower.match(/^~?sel\d+$/)) {
                      const isNeg = lower.startsWith('~');
                      const idx = parseInt(lower.replace('~', '').replace('sel', ''));
                      let val = 0;
                      for (let bit = 0; bit < 8; bit++) {
                        if (inputStatesRecord[`a${bit}`] === '1') val |= (1 << bit);
                      }
                      const active = (val === idx) ? '1' : '0';
                      return isNeg ? (active === '1' ? '0' : '1') : active;
                    }
                    // Mux support (SEL=0101)
                    if (lower.startsWith('sel=')) {
                      const expectedBin = lower.split('=')[1];
                      let actualBin = "";
                      for (let bit = expectedBin.length - 1; bit >= 0; bit--) {
                        actualBin += inputStatesRecord[`s${bit}`] || '0';
                      }
                      return actualBin === expectedBin ? '1' : '0';
                    }
                    return inputStatesRecord[lower] || '0';
                  };

                  return (
                    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="font-mono select-none drop-shadow-2xl overflow-visible">

                      {/* === VDD RAIL === */}
                      <line x1="40" y1={vddY} x2={svgW - 40} y2={vddY} stroke="#ef4444" strokeWidth="4" />
                      <text x="50" y={vddY - 8} fill="#ef4444" fontSize="12" fontWeight="bold">Vdd (1.8V)</text>

                      {/* === GND RAIL === */}
                      <line x1="40" y1={gndY} x2={svgW - 40} y2={gndY} stroke="#38bdf8" strokeWidth="4" />
                      <text x="50" y={gndY + 16} fill="#38bdf8" fontSize="12" fontWeight="bold">Vss (GND)</text>

                      {/* === OUTPUT NODE (horizontal mid-rail) === */}
                      <line x1="40" y1={outY} x2={svgW - 80} y2={outY} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />
                      <circle cx={outX} cy={outY} r={6} fill="#f59e0b" />
                      <text x={svgW - 75} y={outY + 5} fill="#fbbf24" fontSize="13" fontWeight="bold">
                        {defaultData.outputs?.[0]?.name ?? 'Y'} = {netStates.y ?? '?'}
                      </text>

                      {/* === PMOS TRANSISTORS & WIRES === */}
                      {pmos.map((t, i) => {
                        const tx = pmosXs[i];
                        const ty = punY; // PMOS symbol centre
                        const conducting = getInputVal(t.gate) === '0';
                        return (
                          <g key={`pmos_${i}`}>
                            {/* VDD → PMOS source */}
                            <line x1={tx} y1={vddY} x2={tx} y2={ty - 20} stroke={conducting ? '#f472b6' : '#64748b'} strokeWidth="2" />
                            {/* PMOS symbol */}
                            <PmosSymbol x={tx} y={ty} gateName={t.gate} gateVal={getInputVal(t.gate)} conducting={conducting} label={t.name} />
                            {/* PMOS drain → output rail */}
                            <line x1={tx} y1={ty + 20} x2={tx} y2={outY} stroke={conducting ? '#f472b6' : '#64748b'} strokeWidth="2" />
                            <circle cx={tx} cy={outY} r="3.5" fill={conducting ? '#f472b6' : '#64748b'} />
                            {/* Gate label */}
                            <text x={tx - 22} y={ty + 3} fill="#a78bfa" fontSize="9" textAnchor="end">{t.gate}</text>
                            {/* Source net label */}
                            <text x={tx + 14} y={ty - 22} fill="#9ca3af" fontSize="8">{t.source}</text>
                            {/* Drain net label */}
                            <text x={tx + 14} y={ty + 28} fill="#9ca3af" fontSize="8">{t.drain}</text>
                          </g>
                        );
                      })}

                      {/* === NMOS TRANSISTORS & WIRES === */}
                      {nmos.map((t, i) => {
                        const tx = nmosXs[i];
                        const ty = pdnY;
                        const conducting = getInputVal(t.gate) === '1';
                        return (
                          <g key={`nmos_${i}`}>
                            {/* output rail → NMOS drain */}
                            <line x1={tx} y1={outY} x2={tx} y2={ty - 20} stroke={conducting ? '#38bdf8' : '#64748b'} strokeWidth="2" />
                            <circle cx={tx} cy={outY} r="3.5" fill={conducting ? '#38bdf8' : '#64748b'} />
                            {/* NMOS symbol */}
                            <NmosSymbol x={tx} y={ty} gateName={t.gate} gateVal={getInputVal(t.gate)} conducting={conducting} label={t.name} />
                            {/* NMOS source → GND */}
                            <line x1={tx} y1={ty + 20} x2={tx} y2={gndY} stroke={conducting ? '#38bdf8' : '#64748b'} strokeWidth="2" />
                            <circle cx={tx} cy={gndY} r="3.5" fill={conducting ? '#38bdf8' : '#64748b'} />
                            {/* Gate label */}
                            <text x={tx - 22} y={ty + 3} fill="#a78bfa" fontSize="9" textAnchor="end">{t.gate}</text>
                            {/* Drain net label */}
                            <text x={tx + 14} y={ty - 22} fill="#9ca3af" fontSize="8">{t.drain}</text>
                            {/* Source net label */}
                            <text x={tx + 14} y={ty + 28} fill="#9ca3af" fontSize="8">{t.source}</text>
                          </g>
                        );
                      })}

                      {/* === VERTICAL OUT BUS FROM OUTPUT NODE TO ANNOTATION === */}
                      <line x1={outX} y1={outY + 6} x2={outX} y2={outY + 40} stroke="#f59e0b" strokeWidth="2" />
                      <rect x={outX - 30} y={outY + 40} width="60" height="20" rx="4" fill="#1a1a00" stroke="#f59e0b" strokeWidth="1.2" />
                      <text x={outX} y={outY + 54} fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">
                        {defaultData.outputs?.[0]?.formula ?? 'OUT'}
                      </text>

                      {/* PUN label */}
                      <text x="8" y={punY + 5} fill="#ef4444" fontSize="9" writingMode="tb">PUN</text>
                      {/* PDN label */}
                      <text x="8" y={pdnY + 5} fill="#38bdf8" fontSize="9" writingMode="tb">PDN</text>

                    </svg>
                  );
                })()}

              </div>
            </div>

            {/* Right Side: Interactive Probing & Transistor State Matrix */}
            <div className="w-full xl:w-84 flex flex-col space-y-3.5 text-xs font-sans overflow-y-auto max-h-full flex-shrink-0">
              
              {/* Interactive Inputs */}
              <div className="bg-[#131924] p-4 rounded-xl border border-white/10 space-y-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-200 flex items-center space-x-1.5">
                    <Sparkles size={14} className="text-emerald-400" />
                    <span>Signal Inputs Probing</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Live Circuit</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {activeInputKeys.map(inp => {
                    const lowerInp = inp.toLowerCase();
                    return (
                    <button
                      key={inp}
                      onClick={() => toggleInput(inp)}
                      className={`p-2.5 rounded-lg font-mono font-bold flex items-center justify-between transition-all cursor-pointer border ${
                        inputStates[lowerInp] === '1'
                          ? 'bg-purple-600/30 text-purple-200 border-purple-500 shadow-md shadow-purple-600/20'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <span className="uppercase text-xs font-sans text-gray-300">{inp}:</span>
                      <span className={`text-sm px-2 py-0.5 rounded ${inputStates[lowerInp] === '1' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                        {inputStates[lowerInp] ?? '0'}
                      </span>
                    </button>
                  )})}
                </div>
              </div>

              {/* Dynamic Logic Outputs */}
              <div className="bg-[#131924] p-4 rounded-xl border border-white/10 space-y-2.5 font-mono text-[11px] flex-shrink-0">
                <div className="font-bold text-gray-200 font-sans text-xs border-b border-white/10 pb-1.5 flex items-center space-x-1.5">
                  <Activity size={14} className="text-cyan-400" />
                  <span>Output Terminal Voltages</span>
                </div>

                {isFullAdder ? (
                  <>
                    <div className="flex justify-between items-center p-1.5 rounded bg-black/40">
                      <span className="text-gray-400">Sum Out (S):</span>
                      <span className="text-purple-300 font-bold px-2 py-0.5 bg-purple-500/20 rounded border border-purple-500/30">
                        {netStates.sum} ({netStates.sum === '1' ? 'VDD 1.0V' : '0.0V'})
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 rounded bg-black/40">
                      <span className="text-gray-400">Carry Out (Cout):</span>
                      <span className="text-emerald-300 font-bold px-2 py-0.5 bg-emerald-500/20 rounded border border-emerald-500/30">
                        {netStates.cout} ({netStates.cout === '1' ? 'VDD 1.0V' : '0.0V'})
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 rounded bg-black/40 text-[10px]">
                      <span className="text-gray-500">Inverted Carry (~Cout):</span>
                      <span className="text-amber-400 font-bold">{netStates.cout_b}</span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 rounded bg-black/40 text-[10px]">
                      <span className="text-gray-500">Inverted Sum (~Sum):</span>
                      <span className="text-pink-400 font-bold">{netStates.sum_b}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center p-1.5 rounded bg-black/40">
                    <span className="text-gray-400">Output Node Y:</span>
                    <span className="text-amber-400 font-bold px-2 py-0.5 bg-amber-500/20 rounded border border-amber-500/30">
                      {netStates.y} ({netStates.y === '1' ? 'VDD 1.0V' : '0.0V'})
                    </span>
                  </div>
                )}
              </div>

              {/* PUN / PDN Network Specs */}
              <div className="bg-[#131924] p-3.5 rounded-xl border border-white/10 space-y-2 text-[11px] flex-shrink-0">
                <div className="font-bold text-purple-400 flex items-center space-x-1">
                  <ArrowRight size={12} />
                  <span>Pull-Up Network (PUN)</span>
                </div>
                <p className="text-gray-400 leading-relaxed">{defaultData.punDescription}</p>

                <div className="font-bold text-blue-400 pt-1.5 flex items-center space-x-1">
                  <ArrowRight size={12} />
                  <span>Pull-Down Network (PDN)</span>
                </div>
                <p className="text-gray-400 leading-relaxed">{defaultData.pdnDescription}</p>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 2: SPICE NETLIST */}
        {activeSubTab === 'SPICE' && (
          <div className="w-full max-w-4xl mx-auto bg-[#131924] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Cpu size={18} className="text-purple-400" />
                <span className="font-bold text-sm text-gray-200">HSPICE / Spectre Subcircuit Netlist ({defaultData.cellName})</span>
              </div>
              <button
                onClick={copySpice}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-md border border-white/10 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy SPICE'}</span>
              </button>
            </div>
            <div className="bg-[#0b0f19] p-4 rounded-xl border border-white/5 font-mono text-xs text-gray-300 overflow-x-auto max-h-[480px]">
              <pre className="whitespace-pre">{defaultData.spiceNetlist}</pre>
            </div>
          </div>
        )}

        {/* VIEW 3: STICK DIAGRAM & EULER PATH */}
        {activeSubTab === 'STICK_LAYOUT' && (
          <div className="w-full max-w-4xl mx-auto bg-[#131924] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
              <Layers size={18} className="text-purple-400" />
              <span className="font-bold text-sm text-gray-200">CMOS Stick Diagram & Continuous Diffusion Sharing</span>
            </div>

            <div className="bg-[#0b0f19] p-6 rounded-xl border border-white/5 flex items-center justify-center">
              <svg width="520" height="260" className="font-mono text-[10px]">
                {/* VDD Metal Rail (Blue) */}
                <line x1="30" y1="30" x2="490" y2="30" stroke="#3b82f6" strokeWidth="6" />
                <text x="40" y="24" fill="#93c5fd">Metal 1 (VDD)</text>

                {/* P-Diffusion Active Region (Yellow/Orange) */}
                <rect x="70" y="65" width="380" height="32" rx="4" fill="#f59e0b" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="80" y="86" fill="#fde68a">P-Diffusion (PMOS)</text>

                {/* Polysilicon Gate Stripes (Red) */}
                <rect x="150" y="45" width="12" height="170" rx="2" fill="#ef4444" />
                <text x="144" y="230" fill="#fca5a5" fontWeight="bold">Gate A</text>

                <rect x="270" y="45" width="12" height="170" rx="2" fill="#ef4444" />
                <text x="264" y="230" fill="#fca5a5" fontWeight="bold">Gate B</text>

                {isFullAdder && (
                  <>
                    <rect x="390" y="45" width="12" height="170" rx="2" fill="#ef4444" />
                    <text x="384" y="230" fill="#fca5a5" fontWeight="bold">Gate C</text>
                  </>
                )}

                {/* N-Diffusion Active Region (Green) */}
                <rect x="70" y="160" width="380" height="32" rx="4" fill="#10b981" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5" />
                <text x="80" y="181" fill="#a7f3d0">N-Diffusion (NMOS)</text>

                {/* VSS Metal Rail (Blue) */}
                <line x1="30" y1="235" x2="490" y2="235" stroke="#3b82f6" strokeWidth="6" />
                <text x="40" y="252" fill="#93c5fd">Metal 1 (VSS)</text>
              </svg>
            </div>

            <div className="bg-[#161b22] p-4 rounded-xl border border-white/10 space-y-1.5 text-xs">
              <div className="font-bold text-purple-400">Euler Graph Analysis & Shared Diffusion</div>
              <p className="text-gray-300 font-mono text-[11px]">{defaultData.eulerPath}</p>
            </div>
          </div>
        )}

        {/* VIEW 4: W/L SIZING & PROPAGATION DELAY */}
        {activeSubTab === 'SIZING' && (
          <div className="w-full max-w-4xl mx-auto bg-[#131924] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
              <Sliders size={18} className="text-purple-400" />
              <span className="font-bold text-sm text-gray-200">Transistor Sizing & Delay Metrics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-[#161b22] p-4 rounded-xl border border-white/10 space-y-2">
                <span className="text-purple-400 font-bold font-sans">PMOS Sizing Ratio</span>
                <p className="text-gray-200 font-bold text-sm">{defaultData.sizingRecommendations.pmosWidth}</p>
                <p className="text-[11px] text-gray-400 font-sans">Compensates for hole mobility deficit (μp ≈ 140 vs μn ≈ 350).</p>
              </div>

              <div className="bg-[#161b22] p-4 rounded-xl border border-white/10 space-y-2">
                <span className="text-blue-400 font-bold font-sans">NMOS Sizing Ratio</span>
                <p className="text-gray-200 font-bold text-sm">{defaultData.sizingRecommendations.nmosWidth}</p>
                <p className="text-[11px] text-gray-400 font-sans">Calculated for series resistance matching.</p>
              </div>

              <div className="bg-[#161b22] p-4 rounded-xl border border-white/10 space-y-2">
                <span className="text-emerald-400 font-bold font-sans">Propagation Delay (tpLH)</span>
                <p className="text-gray-200 font-bold text-sm">{defaultData.sizingRecommendations.tpLH}</p>
                <p className="text-[11px] text-gray-400 font-sans">Low-to-High rise delay with standard standard-cell output load.</p>
              </div>

              <div className="bg-[#161b22] p-4 rounded-xl border border-white/10 space-y-2">
                <span className="text-amber-400 font-bold font-sans">Propagation Delay (tpHL)</span>
                <p className="text-gray-200 font-bold text-sm">{defaultData.sizingRecommendations.tpHL}</p>
                <p className="text-[11px] text-gray-400 font-sans">High-to-Low fall delay through PDN stack.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// -------------------------------------------------------------
// IEEE / TEXTBOOK STANDARD MOSFET SCHEMATIC SYMBOLS
// -------------------------------------------------------------

function PmosSymbol({ 
  x, 
  y, 
  gateName, 
  gateVal, 
  conducting, 
  label 
}: { 
  x: number; 
  y: number; 
  gateName: string; 
  gateVal?: string; 
  conducting: boolean; 
  label?: string; 
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Source & Drain vertical channel lines */}
      <line 
        x1="0" 
        y1="-15" 
        x2="0" 
        y2="15" 
        stroke={conducting ? '#f472b6' : '#64748b'} 
        strokeWidth={conducting ? "2.5" : "1.8"} 
      />

      {/* Top Source terminal */}
      <line x1="0" y1="-10" x2="10" y2="-10" stroke={conducting ? '#f472b6' : '#64748b'} strokeWidth="1.5" />
      <line x1="10" y1="-10" x2="10" y2="-18" stroke={conducting ? '#f472b6' : '#64748b'} strokeWidth="1.5" />

      {/* Bottom Drain terminal */}
      <line x1="0" y1="10" x2="10" y2="10" stroke={conducting ? '#f472b6' : '#64748b'} strokeWidth="1.5" />
      <line x1="10" y1="10" x2="10" y2="18" stroke={conducting ? '#f472b6' : '#64748b'} strokeWidth="1.5" />

      {/* Gate Thin Oxide Dielectric Plate */}
      <line 
        x1="-5" 
        y1="-15" 
        x2="-5" 
        y2="15" 
        stroke={conducting ? '#ec4899' : '#475569'} 
        strokeWidth="2" 
      />

      {/* PMOS Gate Bubble (Inversion Bubble) */}
      <circle 
        cx="-9" 
        cy="0" 
        r="4" 
        fill="#07090e" 
        stroke={conducting ? '#ec4899' : '#64748b'} 
        strokeWidth="1.5" 
      />

      {/* Gate Input Line */}
      <line x1="-13" y1="0" x2="-22" y2="0" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Gate Label */}
      {gateName && (
        <text x="-26" y="3.5" fill={conducting ? '#34d399' : '#94a3b8'} fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
          {gateName}
        </text>
      )}

      {/* Transistor Name / Label */}
      {label && (
        <text x="14" y="3.5" fill="#e2e8f0" fontSize="8" fontWeight="bold" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  );
}

function NmosSymbol({ 
  x, 
  y, 
  gateName, 
  gateVal, 
  conducting, 
  label 
}: { 
  x: number; 
  y: number; 
  gateName: string; 
  gateVal?: string; 
  conducting: boolean; 
  label?: string; 
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Source & Drain vertical channel lines */}
      <line 
        x1="0" 
        y1="-15" 
        x2="0" 
        y2="15" 
        stroke={conducting ? '#60a5fa' : '#64748b'} 
        strokeWidth={conducting ? "2.5" : "1.8"} 
      />

      {/* Top Drain terminal */}
      <line x1="0" y1="-10" x2="10" y2="-10" stroke={conducting ? '#60a5fa' : '#64748b'} strokeWidth="1.5" />
      <line x1="10" y1="-10" x2="10" y2="-18" stroke={conducting ? '#60a5fa' : '#64748b'} strokeWidth="1.5" />

      {/* Bottom Source terminal */}
      <line x1="0" y1="10" x2="10" y2="10" stroke={conducting ? '#60a5fa' : '#64748b'} strokeWidth="1.5" />
      <line x1="10" y1="10" x2="10" y2="18" stroke={conducting ? '#60a5fa' : '#64748b'} strokeWidth="1.5" />

      {/* Gate Thin Oxide Dielectric Plate */}
      <line 
        x1="-5" 
        y1="-15" 
        x2="-5" 
        y2="15" 
        stroke={conducting ? '#3b82f6' : '#475569'} 
        strokeWidth="2" 
      />

      {/* Gate Input Line directly into plate */}
      <line x1="-5" y1="0" x2="-22" y2="0" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Gate Label */}
      {gateName && (
        <text x="-26" y="3.5" fill={conducting ? '#34d399' : '#94a3b8'} fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
          {gateName}
        </text>
      )}

      {/* Transistor Name / Label */}
      {label && (
        <text x="14" y="3.5" fill="#e2e8f0" fontSize="8" fontWeight="bold" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  );
}

function GroundSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1="-10" x2="0" y2="0" stroke="#38bdf8" strokeWidth="2" />
      <line x1="-15" y1="0" x2="15" y2="0" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="-10" y1="4" x2="10" y2="4" stroke="#38bdf8" strokeWidth="2" />
      <line x1="-5" y1="8" x2="5" y2="8" stroke="#38bdf8" strokeWidth="1.5" />
    </g>
  );
}

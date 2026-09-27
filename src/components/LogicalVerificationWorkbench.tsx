import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Activity, 
  Table, 
  Cpu, 
  Sliders, 
  ShieldCheck, 
  Maximize2,
  Target,
  AlertTriangle
} from 'lucide-react';
import { extractParameters } from '../utils/parameterExtractor';
import { TopologicalSimulator, LogicState } from '../services/simulatorService';
import { generateParameterizedGateDiagram } from '../services/generators/ParameterizedGateGenerator';
import { generateParameterizedMuxDiagram } from '../services/generators/ParameterizedMuxGenerator';
import { generateParameterizedArithmeticDiagram } from '../services/generators/ParameterizedArithmeticGenerator';
import { generateParameterizedDecoderDiagram } from '../services/generators/ParameterizedDecoderGenerator';
import { generateParameterizedShifterDiagram } from '../services/generators/ParameterizedShifterGenerator';
import { AdvancedTimingDiagram } from './AdvancedTimingDiagram';
import { InternalLogicViewer } from './InternalLogicViewer';

interface LogicalVerificationWorkbenchProps {
  activeIcId?: string;
  highlightedNodeId?: string | null;
  onNavigateToTab?: (tabId: string, nodeId?: string) => void;
  onSelectCircuit?: (id: string) => void;
}

export function LogicalVerificationWorkbench({
  activeIcId = '',
  highlightedNodeId = null,
  onNavigateToTab,
  onSelectCircuit
}: LogicalVerificationWorkbenchProps) {

  // DFT States
  const [dftScanChain, setDftScanChain] = useState(false);
  const [dftBist, setDftBist] = useState(false);
  const [dftBoundaryScan, setDftBoundaryScan] = useState(false);
  
  // Fault Injection map
  const [faultMap, setFaultMap] = useState<Record<string, 'SA0' | 'SA1'>>({});

  // Parse Graph dynamically
  const graph = useMemo(() => {
    const params = extractParameters(activeIcId);
    let genResult = null;
    const modName = activeIcId.toUpperCase() || 'UNKNOWN';

    if (['and', 'or', 'nand', 'nor', 'xor', 'xnor', 'not', 'buffer'].includes(params.type)) {
      genResult = generateParameterizedGateDiagram(params, modName);
    } else if (['mux', 'demux'].includes(params.type)) {
      genResult = generateParameterizedMuxDiagram(params, modName);
    } else if (['adder', 'subtractor', 'multiplier', 'divider', 'alu', 'comparator'].includes(params.type)) {
      genResult = generateParameterizedArithmeticDiagram(params, modName);
    } else if (['decoder', 'encoder'].includes(params.type)) {
      genResult = generateParameterizedDecoderDiagram(params, modName);
    } else if (['shifter'].includes(params.type)) {
      genResult = generateParameterizedShifterDiagram(params, modName);
    } else {
      genResult = { inputs: ['A', 'B'], outputs: ['Y'], nodes: [], edges: [] };
    }
    
    return genResult;
  }, [activeIcId]);

  // Simulator Instance
  const simulator = useMemo(() => new TopologicalSimulator(graph), [graph]);

  // Inputs State
  const [inputs, setInputs] = useState<Record<string, LogicState>>({});

  // Reset inputs when graph changes
  useEffect(() => {
    const initial: Record<string, LogicState> = {};
    graph.inputs.forEach(i => initial[i] = 0);
    setInputs(initial);
    setFaultMap({});
  }, [graph]);

  // Outputs and Internal State
  const [outputs, setOutputs] = useState<Record<string, LogicState>>({});
  const [internalState, setInternalState] = useState<Record<string, LogicState>>({});

  // History for waveforms
  const [history, setHistory] = useState<Array<{ inputs: Record<string, LogicState>; outputs: Record<string, LogicState>; time: number }>>([]);
  const clockTick = useRef(0);
  const [tickFlag, setTickFlag] = useState(0);

  // Auto-ticking clock for live waveforms
  useEffect(() => {
    const timer = setInterval(() => {
      setTickFlag(f => f + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Re-evaluate whenever inputs or faultMap changes
  useEffect(() => {
    const res = simulator.evaluate(inputs, faultMap);
    setOutputs(res.outputs);
    setInternalState(res.internalState);
    
    setHistory(prev => [
      ...prev.slice(-20), // Keep last 20 ticks for waveform
      { inputs: { ...inputs }, outputs: { ...res.outputs }, time: clockTick.current++ }
    ]);
  }, [inputs, faultMap, simulator, tickFlag]);

  const toggleInput = (key: string) => {
    setInputs(prev => {
      // Toggle logic: 0 -> 1 -> Z -> 0
      const current = prev[key];
      const next = current === 0 ? 1 : current === 1 ? 'Z' : 0;
      return { ...prev, [key]: next };
    });
  };

  const resetInputs = () => {
    const initial: Record<string, LogicState> = {};
    graph.inputs.forEach(i => initial[i] = 0);
    setInputs(initial);
    setFaultMap({});
  };

  const handleInjectFault = (nodeId: string, fault: 'SA0' | 'SA1' | null) => {
    if (fault) {
      setFaultMap(prev => ({ ...prev, [nodeId]: fault }));
    } else {
      setFaultMap(prev => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
    }
  };

  // Convert inputs and outputs to list for AdvancedTimingDiagram
  const timingSignals = useMemo(() => {
    const sigs = [];
    graph.inputs.forEach(i => sigs.push({ name: i, isOutput: false, isBus: false }));
    graph.outputs.forEach(o => sigs.push({ name: o, isOutput: true, isBus: false }));
    return sigs;
  }, [graph]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0F19] text-gray-200 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/10 via-[#0B0F19] to-[#0B0F19] pointer-events-none" />
      
      <div className="flex-1 overflow-y-auto z-10 p-4 space-y-4">
        
        {/* Header */}
        <div className="bg-[#151619] border border-white/10 p-4 rounded-xl shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="text-emerald-400" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Stage 3</span>
                <h2 className="text-xl font-bold text-white">Logical Verification Workbench</h2>
              </div>
              <p className="text-sm text-gray-400 mt-1">Live verification suite: <span className="text-emerald-300 font-medium">Changeable Inputs</span>, <span className="text-blue-300 font-medium">Internal Nodes</span>, and <span className="text-purple-300 font-medium">Advanced Timing</span>.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={resetInputs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors">
              <RotateCcw size={14} />
              Reset Simulation
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300 flex items-center gap-2">
          <Target size={16} />
          <span>Active Device Under Test (DUT): <strong className="text-white">{activeIcId.toUpperCase() || 'UNDEFINED'}</strong> (Dynamically extracted)</span>
        </div>

        <div className="grid grid-cols-12 gap-4">
          
          {/* Inputs Panel */}
          <div className="col-span-12 xl:col-span-3 space-y-4">
            <div className="bg-[#151619] border border-white/10 rounded-xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-2">
                  <Sliders size={16} />
                  Changeable Inputs
                </h3>
              </div>
              
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">Toggle switch to cycle logic state (0 â†’ 1 â†’ Z).</p>

              <div className="space-y-3">
                {graph.inputs.map(inputKey => {
                  const val = inputs[inputKey];
                  const isHigh = val === 1;
                  const isZ = val === 'Z';
                  return (
                  <div key={inputKey} className="flex items-center justify-between p-3 rounded-lg bg-[#0B0F19] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isHigh ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : isZ ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                        {inputKey.toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-sm font-bold ${isHigh ? 'text-emerald-400' : isZ ? 'text-yellow-400' : 'text-gray-500'}`}>{val}</span>
                      <button 
                        onClick={() => toggleInput(inputKey)}
                        className={`w-14 h-6 rounded-full p-0.5 transition-colors relative ${isHigh ? 'bg-emerald-500' : isZ ? 'bg-yellow-500' : 'bg-gray-700'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${isHigh ? 'left-8' : isZ ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {/* Live Outputs Panel */}
            <div className="bg-[#151619] border border-white/10 rounded-xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-2">
                  <Activity size={16} />
                  Live Output State
                </h3>
              </div>
              <div className="space-y-3">
                {graph.outputs.map(outKey => (
                  <div key={outKey} className="flex items-center justify-between p-3 rounded-lg bg-[#0B0F19] border border-white/5 shadow-inner">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{outKey}</div>
                    <div className={`text-xl font-mono font-bold px-3 py-1 rounded-md border ${outputs[outKey] === 1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : outputs[outKey] === 'Z' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {outputs[outKey]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-9 space-y-4">
            
            {/* Visualizer and Simulator area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
              
              <div className="bg-[#151619] border border-white/10 rounded-xl shadow-lg p-1 flex flex-col overflow-hidden relative">
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
                  <h3 className="text-sm font-bold text-gray-300 tracking-wider uppercase flex items-center gap-2">
                    <Cpu size={14} className="text-blue-400" />
                    Internal Logic Schematic
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">1</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div><span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Z</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div><span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">0</span></div>
                  </div>
                </div>
                
                <div className="flex-1 bg-[#0a0d14] relative overflow-hidden">
                  <InternalLogicViewer 
                    graph={graph} 
                    internalState={internalState} 
                    faultMap={faultMap} 
                    highlightedNodeId={highlightedNodeId}
                    onInjectFault={handleInjectFault} 
                    onNavigateToTab={onNavigateToTab}
                  />
                  {dftBoundaryScan && (
                    <div className="absolute inset-4 border-2 border-dashed border-yellow-500/50 rounded-xl pointer-events-none flex items-start justify-end p-2 z-50">
                      <span className="text-xs text-yellow-500 font-bold bg-[#0a0d14] px-2 rounded-full border border-yellow-500/30">JTAG Boundary Scan Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Timing Diagram */}
              <div className="bg-[#151619] border border-white/10 rounded-xl shadow-lg flex flex-col overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
                  <h3 className="text-sm font-bold text-gray-300 tracking-wider uppercase flex items-center gap-2">
                    <Activity size={14} className="text-purple-400" />
                    Advanced Timing Diagram
                  </h3>
                </div>
                
                <div className="flex-1 p-2 bg-[#0a0d14] overflow-hidden">
                  <AdvancedTimingDiagram 
                    history={history}
                    signals={timingSignals}
                    width={800}
                    height={450}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

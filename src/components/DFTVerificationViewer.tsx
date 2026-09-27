import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RotateCcw, 
  Cpu, 
  Layers, 
  Percent, 
  Filter, 
  Sparkles,
  Download,
  Terminal,
  Zap,
  Radio,
  Sliders,
  ArrowRight,
  RefreshCw,
  Eye,
  Crosshair,
  GitCommit,
  Flame,
  Search,
  Check,
  XCircle,
  HelpCircle,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Wrench,
  Repeat,
  Binary,
  Layers3,
  SlidersHorizontal,
  Workflow,
  CheckCircle,
  Info,
  BookOpen,
  Gauge,
  Timer,
  SlidersVertical,
  Plus,
  Compass
} from 'lucide-react';
import {
  CircuitNetlist,
  InjectedFault,
  FaultType,
  FaultMitigationMode,
  PRESET_CIRCUITS,
  simulateCircuitWithFault,
  simulateFaultMitigation,
  synthesizeCircuitFromPrompt,
  generateATPGVectorSuite,
  ATPGPattern,
  simulateBISTSuite,
  simulateIDDQTest,
  simulateAtSpeedDelayTest,
  BISTSimulationResult,
  IDDQSimulationResult,
  AtSpeedDelayResult
} from '../utils/dftFaultEngine';

interface DFTVerificationViewerProps {
  activeIcId?: string;
  activeComponentName?: string;
  activeComponentType?: string;
  activeQuestion?: string;
  onUpdateActiveQuestion?: (newPrompt: string) => void;
}

const FAULT_TYPE_LABELS: Record<FaultType, { name: string; desc: string; badge: string; color: string }> = {
  NONE: { name: 'Fault-Free (Golden)', desc: 'Nominal circuit with 0 defects', badge: 'GOLDEN', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  SA0: { name: 'Stuck-at-0 (SA0)', desc: 'Net permanently tied to Ground (0V)', badge: 'SA0', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  SA1: { name: 'Stuck-at-1 (SA1)', desc: 'Net permanently tied to VDD (1.2V / 5V)', badge: 'SA1', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  BRIDGE_AND: { name: 'Bridging (Wired-AND)', desc: 'Short circuit between two nets (0-dominant)', badge: 'AND-BR', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  BRIDGE_OR: { name: 'Bridging (Wired-OR)', desc: 'Short circuit between two nets (1-dominant)', badge: 'OR-BR', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  DELAY: { name: 'Delay / Transition Fault', desc: 'Slow-to-Rise / Fall violating setup time', badge: 'DELAY', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  OPEN: { name: 'Stuck-Open (Hi-Z)', desc: 'Floating gate trace with dynamic charge hold', badge: 'OPEN', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  SEU: { name: 'Single-Event Upset (SEU)', desc: 'Transient particle strike bit-flip glitch', badge: 'SEU', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
};

const MITIGATION_MODE_INFO: Record<FaultMitigationMode, { name: string; short: string; desc: string; tag: string; color: string }> = {
  HYBRID_AUTO: {
    name: 'Autonomous Hybrid Self-Healing Engine',
    short: 'Auto-Healing',
    desc: 'Dynamically routes defects to TMR, SECDED ECC, or BISR based on detected fault profile.',
    tag: 'INTELLIGENT',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
  },
  TMR: {
    name: 'Triple Modular Redundancy (TMR) + 2-of-3 Voter',
    short: 'TMR Voting',
    desc: '3 Parallel identical logic replicas voting on each output bit to mask single-point faults in real time.',
    tag: 'HARDWARE REDUNDANCY',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'
  },
  SECDED_ECC: {
    name: 'Hamming SECDED (8,4) Codec Auto-Corrector',
    short: 'SECDED ECC',
    desc: 'Syndrome parity matrix calculation that detects double-bit faults and auto-inverts single-bit corrupted outputs.',
    tag: 'INFORMATION REDUNDANCY',
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10'
  },
  SPARE_REROUTE: {
    name: 'Built-In Self-Repair (BISR) Spare Channel Mux',
    short: 'BISR Spare Reroute',
    desc: 'eLatch & MUX rerouting that disconnects defective silicon gates and rewires to redundant spare cells.',
    tag: 'RECONFIGURABLE SPARE',
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10'
  },
  SCRUBBING_FILTER: {
    name: 'Adaptive SEU Scrubbing & Temporal Glitch Filter',
    short: 'SEU Scrubbing',
    desc: 'Razor flip-flop shadow latch dynamic refresh + temporal RC pulse filter for transient glitch suppression.',
    tag: 'TRANSIENT IMMUNITY',
    color: 'text-pink-400 border-pink-500/40 bg-pink-500/10'
  },
  NONE: {
    name: 'Mitigation Disabled (Raw DUT Pass-through)',
    short: 'Unmitigated',
    desc: 'Raw unshielded circuit output. Faults propagate directly into downstream logic.',
    tag: 'NO PROTECTION',
    color: 'text-gray-400 border-gray-700 bg-gray-800/50'
  }
};

export function DFTVerificationViewer({
  activeIcId = '7476',
  activeComponentName = 'SN7476 Dual J-K Flip-Flop',
  activeComponentType = 'Sequential Storage Element',
  activeQuestion = '',
  onUpdateActiveQuestion
}: DFTVerificationViewerProps) {
  // 1. Decoupled Prompt & Circuit State (Not chained to previous stages)
  const [promptInput, setPromptInput] = useState<string>(
    activeQuestion || '1-Bit Full Adder with Carry Lookahead and Scan Chain'
  );
  const [activeCircuit, setActiveCircuit] = useState<CircuitNetlist>(() => {
    if (activeQuestion) {
      return synthesizeCircuitFromPrompt(activeQuestion);
    }
    return PRESET_CIRCUITS.full_adder;
  });

  // 2. Interactive Input Signal Vectors
  const [inputStates, setInputStates] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    activeCircuit.inputs.forEach(p => {
      init[p.id] = p.defaultVal;
    });
    return init;
  });

  // 3. Live Fault Injection State
  const [injectedFault, setInjectedFault] = useState<InjectedFault>({
    id: 'f1',
    type: 'SA0',
    targetNode: activeCircuit.internalNodes[0]?.id || activeCircuit.inputs[0]?.id || 'N_XOR1',
    bridgeNode: activeCircuit.internalNodes[1]?.id || activeCircuit.inputs[1]?.id || 'N_AND1',
    delayNs: 4.5,
    active: true
  });

  // 4. Fault Mitigation State & Mode
  const [mitigationMode, setMitigationMode] = useState<FaultMitigationMode>('TMR');

  // 5. Test Workbench Tab Switcher
  const [activeTestTab, setActiveTestTab] = useState<'atpg' | 'bist' | 'iddq' | 'delay' | 'scan_chain'>('atpg');

  // 6. ATPG & Scan Chain Execution States
  const [isRunningATPG, setIsRunningATPG] = useState(false);
  const [activePatternIdx, setActivePatternIdx] = useState<number | null>(null);
  const [scanMode, setScanMode] = useState<'SHIFT' | 'CAPTURE'>('CAPTURE');
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [faultFilter, setFaultFilter] = useState<'ALL' | 'SA0' | 'SA1'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'schematic' | 'mitigation' | 'd_calculus'>('schematic');

  // 7. Custom Interactive Vector Injector Drawer State
  const [customVectorInput, setCustomVectorInput] = useState<Record<string, number>>({});
  const [showCustomInjector, setShowCustomInjector] = useState(false);

  // Reset inputs when circuit changes
  useEffect(() => {
    const newInputs: Record<string, number> = {};
    activeCircuit.inputs.forEach(p => {
      newInputs[p.id] = p.defaultVal;
    });
    setInputStates(newInputs);
    setCustomVectorInput(newInputs);

    // Update fault target to valid node in new circuit
    const firstInternal = activeCircuit.internalNodes[0]?.id || activeCircuit.inputs[0]?.id || 'A';
    const secondNode = activeCircuit.internalNodes[1]?.id || activeCircuit.inputs[1]?.id || 'B';
    setInjectedFault({
      id: 'f_' + Date.now(),
      type: 'SA0',
      targetNode: firstInternal,
      bridgeNode: secondNode,
      delayNs: 4.5,
      active: true
    });
  }, [activeCircuit]);

  // Handler for custom prompt synthesis
  const handleSynthesizePrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) return;
    const synthesized = synthesizeCircuitFromPrompt(promptInput);
    setActiveCircuit(synthesized);
    if (onUpdateActiveQuestion) {
      onUpdateActiveQuestion(promptInput);
    }
  };

  const handleSelectPreset = (presetKey: string) => {
    const preset = PRESET_CIRCUITS[presetKey];
    if (preset) {
      setActiveCircuit(preset);
      setPromptInput(preset.name);
    }
  };

  // Toggle Input Pin value in live simulation
  const toggleInputPin = (pinId: string) => {
    setInputStates(prev => ({
      ...prev,
      [pinId]: prev[pinId] === 1 ? 0 : 1
    }));
  };

  // Compute live simulation results with fault
  const simResult = useMemo(() => {
    return simulateCircuitWithFault(activeCircuit, inputStates, injectedFault);
  }, [activeCircuit, inputStates, injectedFault]);

  // Compute live fault mitigation & self-repair recovery results
  const mitResult = useMemo(() => {
    return simulateFaultMitigation(activeCircuit, inputStates, injectedFault, mitigationMode);
  }, [activeCircuit, inputStates, injectedFault, mitigationMode]);

  // Compute full ATPG pattern set
  const atpgPatterns = useMemo(() => {
    return generateATPGVectorSuite(activeCircuit);
  }, [activeCircuit]);

  // Compute BIST Simulation Result
  const bistResult: BISTSimulationResult = useMemo(() => {
    return simulateBISTSuite(activeCircuit, injectedFault, 8);
  }, [activeCircuit, injectedFault]);

  // Compute IDDQ Simulation Result
  const iddqResult: IDDQSimulationResult = useMemo(() => {
    return simulateIDDQTest(activeCircuit, injectedFault);
  }, [activeCircuit, injectedFault]);

  // Compute At-Speed Delay Result
  const delayResult: AtSpeedDelayResult = useMemo(() => {
    return simulateAtSpeedDelayTest(activeCircuit, injectedFault);
  }, [activeCircuit, injectedFault]);

  // Calculate live fault coverage
  const totalFaults = atpgPatterns.length;
  const detectedCount = atpgPatterns.filter(p => p.detected).length;
  const coveragePercent = totalFaults > 0 ? ((detectedCount / totalFaults) * 100).toFixed(1) : '100.0';

  // All valid node choices for fault target selection
  const allCircuitNodes = useMemo(() => {
    const nodes = [
      ...(activeCircuit?.inputs || []).map(p => ({ id: p.id, name: `${p.name} (Primary Input)`, type: 'INPUT' })),
      ...(activeCircuit?.internalNodes || []).map(p => ({ id: p.id, name: `${p.name} (Internal Net / Gate)`, type: 'INTERNAL' })),
      ...(activeCircuit?.outputs || []).map(p => ({ id: p.id, name: `${p.name} (Primary Output)`, type: 'OUTPUT' }))
    ];
    return nodes.length > 0 ? nodes : [{ id: 'A', name: 'A (Default Node)', type: 'INPUT' }];
  }, [activeCircuit]);

  // Auto-find and apply the sensitizing test vector for the currently selected fault
  const handleApplySensitizingVector = () => {
    if (!injectedFault.active) return;
    const matchingPat = atpgPatterns.find(p => p.targetNode === injectedFault.targetNode && p.faultType === injectedFault.type);
    if (matchingPat && matchingPat.detected && matchingPat.vector) {
      setInputStates({ ...matchingPat.vector });
    }
  };

  // Quick Random Fault Injector
  const handleInjectRandomFault = () => {
    if (allCircuitNodes.length === 0) return;
    const randomItem = allCircuitNodes[Math.floor(Math.random() * allCircuitNodes.length)];
    const randomNode = randomItem?.id || 'A';
    const faultTypes: FaultType[] = ['SA0', 'SA1', 'BRIDGE_AND', 'DELAY', 'OPEN', 'SEU'];
    const randomType = faultTypes[Math.floor(Math.random() * faultTypes.length)];
    const otherNodes = allCircuitNodes.filter(n => n.id !== randomNode);
    const randomBridge = otherNodes.length > 0 ? otherNodes[Math.floor(Math.random() * otherNodes.length)].id : undefined;

    setInjectedFault({
      id: 'f_' + Date.now(),
      type: randomType,
      targetNode: randomNode,
      bridgeNode: randomBridge,
      delayNs: randomType === 'DELAY' ? 4.8 : undefined,
      active: true
    });
  };

  // Direct injection helper for specific test scenarios
  const handleInjectSpecificTestFault = (nodeId: string, faultType: FaultType, customVec?: Record<string, number>) => {
    setInjectedFault({
      id: 'inj_' + Date.now(),
      type: faultType,
      targetNode: nodeId,
      bridgeNode: allCircuitNodes.find(n => n.id !== nodeId)?.id,
      delayNs: faultType === 'DELAY' ? 4.5 : undefined,
      active: true
    });
    if (customVec) {
      setInputStates({ ...customVec });
    }
  };

  // Run all ATPG patterns sequentially
  const runAllPatterns = () => {
    if (atpgPatterns.length === 0) return;
    setIsRunningATPG(true);
    setActivePatternIdx(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx >= atpgPatterns.length) {
        clearInterval(interval);
        setIsRunningATPG(false);
        setActivePatternIdx(null);
      } else {
        setActivePatternIdx(idx);
        if (atpgPatterns[idx]?.vector) {
          setInputStates({ ...atpgPatterns[idx].vector });
        }
      }
    }, 450);
  };

  const filteredPatterns = atpgPatterns.filter(p => {
    if (faultFilter === 'ALL') return true;
    return p.faultType === faultFilter;
  });

  return (
    <div className="w-full h-full bg-[#0e1013] text-gray-200 overflow-y-auto p-3 sm:p-5 space-y-5">
      
      {/* 1. Prompt-Driven Standalone Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#16181d] to-[#121316] border border-amber-500/25 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Zap size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40">
                  DFT & FAULT INJECTION WORKBENCH
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  DECOUPLED / USER PROMPT MODE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30 flex items-center space-x-1">
                  <ShieldCheck size={11} />
                  <span>5 TEST SUITES & MITIGATION</span>
                </span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {activeCircuit.name}
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeCircuit.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end lg:self-center flex-wrap gap-y-2">
            <button
              onClick={handleInjectRandomFault}
              className="px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Flame size={13} />
              <span>Random Fault Stress</span>
            </button>
            <button
              onClick={runAllPatterns}
              disabled={isRunningATPG}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Play size={13} className={isRunningATPG ? 'animate-spin' : ''} />
              <span>{isRunningATPG ? 'Running ATPG...' : 'Run ATPG Suite'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Prompt Synthesizer Bar */}
        <form onSubmit={handleSynthesizePrompt} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Enter any circuit specification, IC name (7476, 74153, 74181), or boolean equation (e.g. A & B | C ^ D)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 font-mono transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md hover:shadow-amber-500/20 transition-all shrink-0"
          >
            <Sparkles size={14} />
            <span>Synthesize from Prompt</span>
          </button>
        </form>

        {/* Quick Circuit Preset Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
          <span className="text-[10px] font-mono text-gray-400 uppercase shrink-0 mr-1">Presets:</span>
          {Object.entries(PRESET_CIRCUITS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectPreset(key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all border ${
                activeCircuit.id === c.id
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow-sm'
                  : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-gray-200'
              }`}
            >
              {c.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#14161a] border border-white/10 shadow-sm">
          <div className="text-[10px] font-mono text-gray-400 uppercase flex items-center justify-between">
            <span>ATPG Fault Coverage</span>
            <Percent size={12} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{coveragePercent}%</div>
          <div className="text-[10px] text-gray-500 font-mono">{detectedCount} / {totalFaults} Faults Collapsed</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#14161a] border border-white/10 shadow-sm">
          <div className="text-[10px] font-mono text-gray-400 uppercase flex items-center justify-between">
            <span>Injected Fault Model</span>
            <Flame size={12} className="text-red-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono mt-1 truncate">
            {injectedFault.active ? FAULT_TYPE_LABELS[injectedFault.type].badge : 'INACTIVE'}
          </div>
          <div className="text-[10px] text-amber-300 font-mono truncate">
            Target: {injectedFault.targetNode}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#14161a] border border-white/10 shadow-sm">
          <div className="text-[10px] font-mono text-gray-400 uppercase flex items-center justify-between">
            <span>Raw DUT Output</span>
            <Activity size={12} className={simResult.detected ? 'text-red-400' : 'text-emerald-400'} />
          </div>
          <div className={`text-base font-bold font-mono mt-1 flex items-center space-x-1.5 ${
            simResult.detected ? 'text-red-400' : simResult.faultSensitized ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {simResult.detected ? (
              <>
                <XCircle size={16} />
                <span>CORRUPTED (D)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>MATCHES GOLDEN</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            {simResult.detected ? 'Primary output corrupted by fault' : 'No output difference observed'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#14161a] border border-cyan-500/30 bg-cyan-950/20 shadow-sm">
          <div className="text-[10px] font-mono text-cyan-300 uppercase flex items-center justify-between font-bold">
            <span>Mitigation Status</span>
            <ShieldCheck size={14} className="text-cyan-400" />
          </div>
          <div className="text-base font-bold font-mono mt-1 flex items-center space-x-1.5 text-cyan-300">
            {mitigationMode === 'NONE' ? (
              <span className="text-gray-400">OFF (RAW DUT)</span>
            ) : mitResult.isFullyRecovered ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <CheckCircle size={16} />
                <span>100% RECOVERED</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center space-x-1">
                <AlertTriangle size={16} />
                <span>PARTIAL RECOVERY</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-cyan-400/80 font-mono truncate">
            Mode: {MITIGATION_MODE_INFO[mitigationMode].short}
          </div>
        </div>
      </div>

      {/* 3. Main Live Fault Injection & Circuit Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (8 cols): Interactive Circuit Schematic with Live Probes & Mitigation Architecture */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="p-4 rounded-2xl bg-[#14161a] border border-white/10 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2">
                <Crosshair size={16} className="text-amber-400" />
                <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
                  Live Interactive DFT & Mitigation Engine
                </h3>
              </div>

              {/* Sub-view switcher */}
              <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10 text-[11px] font-mono flex-wrap gap-y-1">
                <button
                  onClick={() => setActiveSubTab('schematic')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeSubTab === 'schematic' ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Live Probe Schematic
                </button>
                <button
                  onClick={() => setActiveSubTab('mitigation')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1.5 ${
                    activeSubTab === 'mitigation' ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck size={12} />
                  <span>Fault Mitigation Architecture</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('d_calculus')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeSubTab === 'd_calculus' ? 'bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Roth D-Calculus
                </button>
              </div>
            </div>

            {/* Interactive Primary Inputs Bar */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold">
                  Live Primary Inputs (Click to Toggle):
                </span>
              </div>
              <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                {activeCircuit.inputs.map(pin => {
                  const val = inputStates[pin.id] ?? pin.defaultVal;
                  return (
                    <button
                      key={pin.id}
                      onClick={() => toggleInputPin(pin.id)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all border flex items-center space-x-1.5 ${
                        val === 1
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <span>{pin.name}</span>
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        val === 1 ? 'bg-emerald-500 text-black' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {val}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SubTab 1: SVG Visual Schematic View */}
            {activeSubTab === 'schematic' && (
              <div className="relative bg-[#0b0c0e] rounded-xl border border-white/10 p-3 overflow-x-auto min-h-[360px] flex items-center justify-center">
                <svg
                  viewBox={`0 0 ${activeCircuit.layoutWidth} ${activeCircuit.layoutHeight}`}
                  className="w-full max-w-[680px] h-auto font-mono select-none"
                >
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="#ffffff" fillOpacity="0.04" />
                    </pattern>
                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
                    </marker>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Wire Connections */}
                  {activeCircuit.gates.map((gate) => {
                    const outPin = [
                      ...activeCircuit.internalNodes,
                      ...activeCircuit.outputs
                    ].find(p => p.id === gate.output);

                    const outX = outPin?.x ?? (gate.x + 80);
                    const outY = outPin?.y ?? gate.y;
                    const isFaultOnOutput = injectedFault.active && injectedFault.targetNode === gate.output;
                    const isSensitized = simResult.sensitizedPath.includes(gate.output);

                    return (
                      <g key={'wires_' + gate.id}>
                        {/* Input wires leading into gate */}
                        {gate.inputs.map((inId, iIdx) => {
                          const inPin = [
                            ...activeCircuit.inputs,
                            ...activeCircuit.internalNodes
                          ].find(p => p.id === inId);

                          if (!inPin) return null;
                          const inX = inPin.x ?? 40;
                          const inY = inPin.y ?? 100;
                          const gateInY = gate.y - 12 + iIdx * 16;
                          const isFaultOnInput = injectedFault.active && injectedFault.targetNode === inId;

                          return (
                            <path
                              key={`wire_${inId}_${gate.id}`}
                              d={`M ${inX + 30} ${inY} C ${(inX + gate.x) / 2} ${inY}, ${(inX + gate.x) / 2} ${gateInY}, ${gate.x - 25} ${gateInY}`}
                              fill="none"
                              stroke={
                                isFaultOnInput
                                  ? '#ef4444'
                                  : isSensitized
                                  ? '#f59e0b'
                                  : simResult.faultyValues[inId] === 1
                                  ? '#10b981'
                                  : '#334155'
                              }
                              strokeWidth={isFaultOnInput || isSensitized ? 2.5 : 1.5}
                              strokeDasharray={isFaultOnInput ? '4,2' : undefined}
                            />
                          );
                        })}

                        {/* Output wire from gate */}
                        <path
                          d={`M ${gate.x + 25} ${gate.y} L ${outX - 25} ${outY}`}
                          fill="none"
                          stroke={
                            isFaultOnOutput
                              ? '#ef4444'
                              : isSensitized
                              ? '#f59e0b'
                              : simResult.faultyValues[gate.output] === 1
                              ? '#10b981'
                              : '#334155'
                          }
                          strokeWidth={isFaultOnOutput || isSensitized ? 2.5 : 1.5}
                          strokeDasharray={isFaultOnOutput ? '4,2' : undefined}
                        />
                      </g>
                    );
                  })}

                  {/* Logic Gates */}
                  {activeCircuit.gates.map((gate) => {
                    const isFaultOnGate = injectedFault.active && injectedFault.targetNode === gate.output;
                    const isSensitized = simResult.sensitizedPath.includes(gate.output);

                    return (
                      <g
                        key={gate.id}
                        transform={`translate(${gate.x}, ${gate.y})`}
                        className="cursor-pointer group"
                        onClick={() => {
                          setInjectedFault(prev => ({
                            ...prev,
                            targetNode: gate.output,
                            active: true
                          }));
                        }}
                      >
                        {/* Gate Body Box / Symbol */}
                        <rect
                          x="-28"
                          y="-20"
                          width="56"
                          height="40"
                          rx="8"
                          fill="#181a20"
                          stroke={
                            isFaultOnGate
                              ? '#ef4444'
                              : isSensitized
                              ? '#f59e0b'
                              : '#3b82f6'
                          }
                          strokeWidth={isFaultOnGate ? 2.5 : 1.5}
                          className="transition-colors group-hover:stroke-amber-400"
                        />
                        <text
                          x="0"
                          y="-2"
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          {gate.type}
                        </text>
                        <text
                          x="0"
                          y="12"
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="8"
                        >
                          {gate.label}
                        </text>

                        {/* Fault Icon if injected here */}
                        {isFaultOnGate && (
                          <g transform="translate(18, -18)">
                            <circle r="8" fill="#ef4444" />
                            <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">⚡</text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Primary Inputs Pins */}
                  {activeCircuit.inputs.map((pin) => {
                    const val = simResult.faultyValues[pin.id] ?? 0;
                    const isFault = injectedFault.active && injectedFault.targetNode === pin.id;

                    return (
                      <g
                        key={pin.id}
                        transform={`translate(${pin.x}, ${pin.y})`}
                        className="cursor-pointer group"
                        onClick={() => {
                          setInjectedFault(prev => ({
                            ...prev,
                            targetNode: pin.id,
                            active: true
                          }));
                        }}
                      >
                        <rect
                          x="-25"
                          y="-14"
                          width="50"
                          height="28"
                          rx="6"
                          fill={val === 1 ? '#064e3b' : '#1e293b'}
                          stroke={isFault ? '#ef4444' : val === 1 ? '#10b981' : '#475569'}
                          strokeWidth={isFault ? 2 : 1}
                          className="group-hover:stroke-amber-400 transition-colors"
                        />
                        <text x="0" y="-1" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                          {pin.name}
                        </text>
                        <text x="0" y="9" textAnchor="middle" fill={val === 1 ? '#34d399' : '#94a3b8'} fontSize="8">
                          {val} {isFault ? `[${FAULT_TYPE_LABELS[injectedFault.type].badge}]` : ''}
                        </text>
                      </g>
                    );
                  })}

                  {/* Internal Nodes Probes */}
                  {activeCircuit.internalNodes.map((pin) => {
                    const val = simResult.faultyValues[pin.id] ?? 0;
                    const goodVal = simResult.goodValues[pin.id] ?? 0;
                    const isFault = injectedFault.active && injectedFault.targetNode === pin.id;
                    const isSensitized = simResult.sensitizedPath.includes(pin.id);

                    return (
                      <g
                        key={pin.id}
                        transform={`translate(${pin.x}, ${pin.y})`}
                        className="cursor-pointer group"
                        onClick={() => {
                          setInjectedFault(prev => ({
                            ...prev,
                            targetNode: pin.id,
                            active: true
                          }));
                        }}
                      >
                        <rect
                          x="-24"
                          y="-12"
                          width="48"
                          height="24"
                          rx="5"
                          fill="#13151b"
                          stroke={
                            isFault
                              ? '#ef4444'
                              : isSensitized
                              ? '#f59e0b'
                              : val === 1
                              ? '#10b981'
                              : '#475569'
                          }
                          strokeWidth={isFault || isSensitized ? 2 : 1}
                          className="group-hover:stroke-amber-400 transition-colors"
                        />
                        <text x="0" y="-1" textAnchor="middle" fill="#cbd5e1" fontSize="8" fontWeight="bold">
                          {pin.name}
                        </text>
                        <text x="0" y="8" textAnchor="middle" fill={goodVal !== val ? '#ef4444' : '#64748b'} fontSize="7">
                          G:{goodVal}|F:{val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Primary Outputs Pins */}
                  {activeCircuit.outputs.map((pin) => {
                    const good = simResult.goodValues[pin.id] ?? 0;
                    const faulty = simResult.faultyValues[pin.id] ?? 0;
                    const mismatch = good !== faulty;

                    return (
                      <g
                        key={pin.id}
                        transform={`translate(${pin.x}, ${pin.y})`}
                        className="cursor-pointer group"
                        onClick={() => {
                          setInjectedFault(prev => ({
                            ...prev,
                            targetNode: pin.id,
                            active: true
                          }));
                        }}
                      >
                        <rect
                          x="-30"
                          y="-16"
                          width="60"
                          height="32"
                          rx="6"
                          fill={mismatch ? '#450a0a' : faulty === 1 ? '#064e3b' : '#1e293b'}
                          stroke={mismatch ? '#ef4444' : faulty === 1 ? '#10b981' : '#475569'}
                          strokeWidth={mismatch ? 2.5 : 1}
                          className="group-hover:stroke-amber-400 transition-colors"
                        />
                        <text x="0" y="-3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                          {pin.name}
                        </text>
                        <text x="0" y="9" textAnchor="middle" fill={mismatch ? '#f87171' : '#a7f3d0'} fontSize="8" fontWeight="bold">
                          OUT: {faulty} {mismatch ? `(≠${good})` : ''}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Legend Overlay */}
                <div className="absolute bottom-2 left-2 px-2.5 py-1.5 rounded-lg bg-black/80 border border-white/10 text-[10px] font-mono flex items-center space-x-3 text-gray-400 pointer-events-none">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Logic 1</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
                    <span>Logic 0</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    <span>Sensitized Path</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                    <span>Fault Injected</span>
                  </span>
                </div>
              </div>
            )}

            {/* SubTab 2: Fault Mitigation & Self-Repair Architecture Visualizer */}
            {activeSubTab === 'mitigation' && (
              <div className="p-4 bg-[#0b0c0e] rounded-xl border border-white/10 space-y-4">
                
                {/* Mitigation Mode Selector Toolbar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center space-x-1.5">
                      <Shield size={14} className="text-cyan-400" />
                      <span>Select Fault Mitigation Architecture:</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {MITIGATION_MODE_INFO[mitigationMode].tag}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(MITIGATION_MODE_INFO) as FaultMitigationMode[]).map(modeKey => {
                      const info = MITIGATION_MODE_INFO[modeKey];
                      const isSelected = mitigationMode === modeKey;
                      return (
                        <button
                          key={modeKey}
                          onClick={() => setMitigationMode(modeKey)}
                          className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between ${
                            isSelected
                              ? info.color + ' shadow-md font-bold'
                              : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold truncate">{info.short}</span>
                            {isSelected && <Check size={13} className="shrink-0" />}
                          </div>
                          <span className="text-[9px] text-gray-400 line-clamp-1 mt-1">{info.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic SVG Schematic for Active Mitigation Mechanism */}
                <div className="p-3 bg-[#111317] rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-300 font-mono">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <Workflow size={13} className="text-cyan-400" />
                      <span>{MITIGATION_MODE_INFO[mitigationMode].name}</span>
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {mitResult.isFullyRecovered ? '🛡️ ZERO-ERROR RECOVERY' : '⚠️ PARTIAL RECOVERY'}
                    </span>
                  </div>

                  {/* SVG Topology Diagram based on selected mode */}
                  <div className="relative bg-black/60 rounded-lg p-2 flex items-center justify-center min-h-[220px] overflow-x-auto">
                    {mitigationMode === 'TMR' || mitigationMode === 'HYBRID_AUTO' ? (
                      // TMR 3-Core Voter Topology SVG
                      <svg viewBox="0 0 540 200" className="w-full max-w-[540px] font-mono select-none">
                        {/* Core 1 (DUT - Faulty) */}
                        <g transform="translate(40, 20)">
                          <rect x="0" y="0" width="130" height="40" rx="6" fill="#1e181b" stroke={injectedFault.active ? '#ef4444' : '#10b981'} strokeWidth="1.5" />
                          <text x="65" y="20" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">Core 1 (DUT {injectedFault.active ? 'FAULTY' : 'CLEAN'})</text>
                          <text x="65" y="32" textAnchor="middle" fill="#ef4444" fontSize="8">
                            Output: {Object.values(mitResult.tmrDetails.core1)[0] ?? 0}
                          </text>
                        </g>

                        {/* Core 2 (Replica A) */}
                        <g transform="translate(40, 75)">
                          <rect x="0" y="0" width="130" height="40" rx="6" fill="#12201b" stroke="#10b981" strokeWidth="1.5" />
                          <text x="65" y="20" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">Core 2 (Replica α)</text>
                          <text x="65" y="32" textAnchor="middle" fill="#34d399" fontSize="8">
                            Output: {Object.values(mitResult.tmrDetails.core2)[0] ?? 0} (Golden)
                          </text>
                        </g>

                        {/* Core 3 (Replica B) */}
                        <g transform="translate(40, 130)">
                          <rect x="0" y="0" width="130" height="40" rx="6" fill="#12201b" stroke="#10b981" strokeWidth="1.5" />
                          <text x="65" y="20" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">Core 3 (Replica β)</text>
                          <text x="65" y="32" textAnchor="middle" fill="#34d399" fontSize="8">
                            Output: {Object.values(mitResult.tmrDetails.core3)[0] ?? 0} (Golden)
                          </text>
                        </g>

                        {/* Wires into 2-of-3 Voter */}
                        <path d="M 170 40 L 260 85" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
                        <path d="M 170 95 L 260 95" stroke="#10b981" strokeWidth="2" fill="none" />
                        <path d="M 170 150 L 260 105" stroke="#10b981" strokeWidth="2" fill="none" />

                        {/* 2-of-3 Majority Voter Block */}
                        <g transform="translate(260, 60)">
                          <rect x="0" y="0" width="150" height="70" rx="10" fill="#0f2928" stroke="#06b6d4" strokeWidth="2" />
                          <text x="75" y="25" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">2-of-3 MAJORITY VOTER</text>
                          <text x="75" y="42" textAnchor="middle" fill="#cbd5e1" fontSize="9">V = (A·B) + (B·C) + (A·C)</text>
                          <text x="75" y="58" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="bold">
                            Decision: 2-1 Golden Vote
                          </text>
                        </g>

                        {/* Out wire */}
                        <path d="M 410 95 L 460 95" stroke="#10b981" strokeWidth="2.5" fill="none" markerEnd="url(#arrow)" />

                        {/* Clean Output Pin */}
                        <g transform="translate(460, 75)">
                          <rect x="0" y="0" width="70" height="40" rx="8" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
                          <text x="35" y="18" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">CLEAN OUT</text>
                          <text x="35" y="32" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontWeight="bold">
                            {Object.values(mitResult.mitigatedOutputs)[0] ?? 1} (PASSED)
                          </text>
                        </g>
                      </svg>
                    ) : mitigationMode === 'SECDED_ECC' ? (
                      // SECDED Codec Topology SVG
                      <svg viewBox="0 0 540 180" className="w-full max-w-[540px] font-mono select-none">
                        <g transform="translate(20, 50)">
                          <rect x="0" y="0" width="110" height="60" rx="8" fill="#1e182b" stroke="#a855f7" strokeWidth="1.5" />
                          <text x="55" y="22" textAnchor="middle" fill="#d8b4fe" fontSize="10" fontWeight="bold">DATA BUS (4-Bit)</text>
                          <text x="55" y="42" textAnchor="middle" fill="#fff" fontSize="11">[{mitResult.eccDetails.receivedWord.slice(0, 4).join(', ')}]</text>
                        </g>

                        <path d="M 130 80 L 180 80" stroke="#a855f7" strokeWidth="2" fill="none" />

                        <g transform="translate(180, 40)">
                          <rect x="0" y="0" width="150" height="80" rx="10" fill="#1c1936" stroke="#818cf8" strokeWidth="2" />
                          <text x="75" y="22" textAnchor="middle" fill="#818cf8" fontSize="10" fontWeight="bold">SECDED SYNDROME</text>
                          <text x="75" y="40" textAnchor="middle" fill="#cbd5e1" fontSize="9">Matrix H·vᵀ = S</text>
                          <text x="75" y="58" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold">
                            S = [{mitResult.eccDetails.syndrome.join('')}] (Dec: {mitResult.eccDetails.syndromeDec})
                          </text>
                        </g>

                        <path d="M 330 80 L 380 80" stroke="#10b981" strokeWidth="2" fill="none" />

                        <g transform="translate(380, 50)">
                          <rect x="0" y="0" width="130" height="60" rx="8" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
                          <text x="65" y="22" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">AUTO-CORRECTED</text>
                          <text x="65" y="42" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">
                            [{mitResult.eccDetails.correctedWord.slice(0, 4).join(', ')}] (100% OK)
                          </text>
                        </g>
                      </svg>
                    ) : mitigationMode === 'SPARE_REROUTE' ? (
                      // BISR Spare Redundancy SVG
                      <svg viewBox="0 0 540 180" className="w-full max-w-[540px] font-mono select-none">
                        <g transform="translate(30, 20)">
                          <rect x="0" y="0" width="130" height="40" rx="6" fill="#2d1515" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2" />
                          <text x="65" y="24" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">DEFECTIVE CELL (ISOLATED)</text>
                        </g>

                        <g transform="translate(30, 110)">
                          <rect x="0" y="0" width="130" height="40" rx="6" fill="#12201b" stroke="#10b981" strokeWidth="2" />
                          <text x="65" y="24" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold">SPARE CELL (ACTIVE)</text>
                        </g>

                        <path d="M 160 40 L 260 70" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
                        <path d="M 160 130 L 260 90" stroke="#10b981" strokeWidth="2.5" fill="none" />

                        <g transform="translate(260, 55)">
                          <polygon points="0,0 80,15 80,45 0,60" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                          <text x="40" y="34" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">BISR MUX</text>
                          <text x="40" y="47" textAnchor="middle" fill="#cbd5e1" fontSize="8">SEL = 1 (Spare)</text>
                        </g>

                        <path d="M 340 85 L 420 85" stroke="#10b981" strokeWidth="2.5" fill="none" />

                        <g transform="translate(420, 65)">
                          <rect x="0" y="0" width="100" height="40" rx="8" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
                          <text x="50" y="24" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">RESTORED NET</text>
                        </g>
                      </svg>
                    ) : (
                      // SEU Scrubbing / Pass-through
                      <div className="text-center py-6 space-y-2">
                        <Repeat size={28} className="text-pink-400 mx-auto animate-spin" style={{ animationDuration: '4s' }} />
                        <div className="text-xs font-bold text-white">Adaptive SEU Dynamic Scrubbing & Temporal Pulse Filter</div>
                        <div className="text-[11px] text-gray-400 max-w-md mx-auto">
                          Razor Shadow Latches refresh charge dynamically every clock transition, eliminating single-event particle transients and stuck-open floating potentials.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Telemetry Metrics & Overhead Tradeoffs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-[9px] text-gray-400">SILICON AREA OVERHEAD</div>
                      <div className="font-bold text-amber-300">+{mitResult.metrics.areaOverheadPercent}%</div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-[9px] text-gray-400">DELAY PENALTY</div>
                      <div className="font-bold text-cyan-300">+{mitResult.metrics.delayPenaltyNs} ns</div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-[9px] text-gray-400">POWER OVERHEAD</div>
                      <div className="font-bold text-purple-300">+{mitResult.metrics.powerOverheadPercent}%</div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-[9px] text-gray-400">RELIABILITY (MTBF)</div>
                      <div className="font-bold text-emerald-300">{mitResult.metrics.reliabilityGainMTBF.split(' ')[0]}</div>
                    </div>
                  </div>
                </div>

                {/* Real-time Diagnostics Event Log */}
                <div className="p-3 bg-[#111317] rounded-xl border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-gray-200 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Activity size={13} className="text-emerald-400" />
                      <span>Real-time Fault Recovery Diagnostic Telemetry</span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">4-Stage Pipeline</span>
                  </div>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto font-mono text-[11px]">
                    {mitResult.recoveryLogs.map(log => (
                      <div
                        key={log.id}
                        className={`p-2 rounded-lg border flex items-start justify-between gap-2 ${
                          log.status === 'RECOVERED'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : log.status === 'CRITICAL'
                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                            : log.status === 'WARN'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-black/30 border-white/5 text-gray-400'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 font-bold">
                            {log.stage}
                          </span>
                          <span>{log.message}</span>
                        </div>
                        <span className="text-[9px] text-gray-500 shrink-0">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SubTab 3: Roth D-Calculus Table View */}
            {activeSubTab === 'd_calculus' && (
              <div className="p-3 bg-[#0b0c0e] rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-300 font-bold">
                    Roth D-Algorithm 5-Valued Logic Algebra (0, 1, D, D̄, X):
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Click any node to inject SA0 or SA1
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono border-collapse text-left">
                    <thead className="bg-white/5 text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-white/10">Circuit Node</th>
                        <th className="p-2 border-r border-white/10">Type</th>
                        <th className="p-2 border-r border-white/10">Good Machine</th>
                        <th className="p-2 border-r border-white/10">Faulty Machine</th>
                        <th className="p-2 border-r border-white/10">Roth D-Value</th>
                        <th className="p-2 border-r border-white/10">Status</th>
                        <th className="p-2">Node Quick Inject</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allCircuitNodes.map(node => {
                        const g = simResult.goodValues[node.id] ?? 0;
                        const f = simResult.faultyValues[node.id] ?? 0;
                        const d = simResult.dValues[node.id] ?? '0';
                        const isTarget = injectedFault.active && injectedFault.targetNode === node.id;

                        return (
                          <tr key={node.id} className={isTarget ? 'bg-red-500/10' : 'hover:bg-white/5'}>
                            <td className="p-2 font-bold border-r border-white/5 text-gray-200">{node.name}</td>
                            <td className="p-2 border-r border-white/5 text-gray-400 text-[11px]">{node.type}</td>
                            <td className="p-2 border-r border-white/5 text-emerald-400">{g}</td>
                            <td className="p-2 border-r border-white/5 text-blue-400">{f}</td>
                            <td className="p-2 border-r border-white/5">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                d === 'D' ? 'bg-amber-500/20 text-amber-300' : d === 'D_BAR' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400'
                              }`}>
                                {d === 'D_BAR' ? 'D̄' : d}
                              </span>
                            </td>
                            <td className="p-2 border-r border-white/5">
                              {isTarget ? (
                                <span className="text-red-400 font-bold text-[10px] flex items-center space-x-1">
                                  <Flame size={11} />
                                  <span>FAULT SITE ({injectedFault.type})</span>
                                </span>
                              ) : d === 'D' || d === 'D_BAR' ? (
                                <span className="text-amber-400 text-[10px]">Propagating D</span>
                              ) : (
                                <span className="text-gray-500 text-[10px]">Normal</span>
                              )}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleInjectSpecificTestFault(node.id, 'SA0')}
                                  className="px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[9px] font-bold"
                                >
                                  ⚡ SA0
                                </button>
                                <button
                                  onClick={() => handleInjectSpecificTestFault(node.id, 'SA1')}
                                  className="px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[9px] font-bold"
                                >
                                  ⚡ SA1
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Fault Injection Control Panel & Live Showcase */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Fault Injector Panel */}
          <div className="p-4 rounded-2xl bg-[#14161a] border border-white/10 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center space-x-2">
                <Flame size={16} className="text-red-400" />
                <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
                  Live Fault Injection Panel
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={injectedFault.active}
                  onChange={(e) => setInjectedFault(prev => ({ ...prev, active: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-500"></div>
                <span className="ml-1.5 text-[10px] font-mono text-gray-300">
                  {injectedFault.active ? 'ARMED' : 'OFF'}
                </span>
              </label>
            </div>

            {/* Target Node Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-400 uppercase">Target Net / Node:</label>
              <select
                value={injectedFault.targetNode}
                onChange={(e) => setInjectedFault(prev => ({ ...prev, targetNode: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-red-500/60"
              >
                {allCircuitNodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fault Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-400 uppercase">Fault Model:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['SA0', 'SA1', 'BRIDGE_AND', 'DELAY', 'OPEN', 'SEU'] as FaultType[]).map(fType => (
                  <button
                    key={fType}
                    type="button"
                    onClick={() => setInjectedFault(prev => ({ ...prev, type: fType, active: true }))}
                    className={`p-2 rounded-xl text-left font-mono text-[11px] transition-all border ${
                      injectedFault.type === fType && injectedFault.active
                        ? FAULT_TYPE_LABELS[fType].color + ' font-bold shadow-md'
                        : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold">{FAULT_TYPE_LABELS[fType].badge}</div>
                    <div className="text-[9px] text-gray-500 truncate">{FAULT_TYPE_LABELS[fType].name.split(' (')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bridging Target Selector if Bridge Fault selected */}
            {(injectedFault.type === 'BRIDGE_AND' || injectedFault.type === 'BRIDGE_OR') && (
              <div className="space-y-1.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <label className="text-[10px] font-mono text-amber-300 uppercase font-bold">
                  Bridge Short Partner Net:
                </label>
                <select
                  value={injectedFault.bridgeNode || allCircuitNodes[0]?.id}
                  onChange={(e) => setInjectedFault(prev => ({ ...prev, bridgeNode: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-amber-500/40 text-xs font-mono text-amber-200"
                >
                  {allCircuitNodes
                    .filter(n => n.id !== injectedFault.targetNode)
                    .map(node => (
                      <option key={node.id} value={node.id}>
                        {node.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={handleApplySensitizingVector}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Sparkles size={13} />
                <span>Auto-Sensitize Fault</span>
              </button>
              <button
                type="button"
                onClick={() => setInjectedFault(prev => ({ ...prev, active: false }))}
                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs font-mono transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Tri-Signal Live Verification & Mitigation Showcase Card */}
          <div className="p-4 rounded-2xl bg-[#14161a] border border-white/10 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center space-x-2">
                <Activity size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
                  Live Verification & Mitigation
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                {MITIGATION_MODE_INFO[mitigationMode].short}
              </span>
            </div>

            <div className="space-y-2">
              {activeCircuit.outputs.map(outPin => {
                const good = simResult.goodValues[outPin.id] ?? 0;
                const faulty = simResult.faultyValues[outPin.id] ?? 0;
                const mitVal = mitResult.mitigatedOutputs[outPin.id] ?? good;
                const rawMismatch = good !== faulty;
                const mitMismatch = good !== mitVal;

                return (
                  <div
                    key={outPin.id}
                    className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">{outPin.name}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        !mitMismatch
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {!mitMismatch ? '🛡️ RECOVERED' : '❌ UNMITIGATED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs pt-1">
                      <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                        <div className="text-[9px] text-gray-400">GOLDEN</div>
                        <div className="text-emerald-400 font-bold">{good}</div>
                      </div>
                      <div className={`p-1.5 rounded-lg border ${
                        rawMismatch ? 'bg-red-950/40 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-gray-300'
                      }`}>
                        <div className="text-[9px] text-gray-400">RAW DUT</div>
                        <div className="font-bold">{faulty} {rawMismatch ? '(D)' : ''}</div>
                      </div>
                      <div className={`p-1.5 rounded-lg border ${
                        !mitMismatch ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300' : 'bg-red-950/40 border-red-500/40 text-red-400'
                      }`}>
                        <div className="text-[9px] text-gray-400">MITIGATED</div>
                        <div className="font-bold">{mitVal} {!mitMismatch ? '✓' : '✗'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mitigation summary breakdown */}
            <div className="p-2.5 rounded-xl bg-black/50 border border-cyan-500/20 text-[11px] font-mono space-y-1.5">
              <div className="text-xs text-cyan-300 font-bold flex items-center space-x-1.5">
                <Info size={13} />
                <span>Active Recovery Strategy:</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                {mitResult.faultOvercomeSummary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Multi-Test Workbench with Direct Injection Options for Every Test */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#14161a] border border-white/10 shadow-lg space-y-4">
        
        {/* Test Suite Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center space-x-2">
            <Terminal size={18} className="text-amber-400" />
            <div>
              <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
                DFT Test Benches & Live Injection Suite
              </h3>
              <p className="text-[10px] text-gray-400 font-mono">
                Select any test method below to test and inject fault models directly into the running verification loop.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono overflow-x-auto">
            <button
              onClick={() => setActiveTestTab('atpg')}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold flex items-center space-x-1.5 whitespace-nowrap ${
                activeTestTab === 'atpg' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Binary size={13} />
              <span>ATPG Pattern Suite</span>
            </button>
            <button
              onClick={() => setActiveTestTab('bist')}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold flex items-center space-x-1.5 whitespace-nowrap ${
                activeTestTab === 'bist' ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Cpu size={13} />
              <span>Logic BIST (PRPG/MISR)</span>
            </button>
            <button
              onClick={() => setActiveTestTab('scan_chain')}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold flex items-center space-x-1.5 whitespace-nowrap ${
                activeTestTab === 'scan_chain' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>Scan Chain Stepper</span>
            </button>
            <button
              onClick={() => setActiveTestTab('iddq')}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold flex items-center space-x-1.5 whitespace-nowrap ${
                activeTestTab === 'iddq' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Gauge size={13} />
              <span>IDDQ Leakage Test</span>
            </button>
            <button
              onClick={() => setActiveTestTab('delay')}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold flex items-center space-x-1.5 whitespace-nowrap ${
                activeTestTab === 'delay' ? 'bg-pink-500/25 text-pink-300 border border-pink-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Timer size={13} />
              <span>At-Speed Delay (LOC)</span>
            </button>
          </div>
        </div>

        {/* Test Tab 1: ATPG Pattern Vectors Suite */}
        {activeTestTab === 'atpg' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-400 font-mono uppercase">Filter Patterns:</span>
                {(['ALL', 'SA0', 'SA1'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFaultFilter(f)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                      faultFilter === f ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowCustomInjector(!showCustomInjector)}
                  className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center space-x-1"
                >
                  <Plus size={12} />
                  <span>Custom Vector Injector</span>
                </button>
              </div>
            </div>

            {/* Custom Interactive Vector Builder Drawer */}
            {showCustomInjector && (
              <div className="p-3.5 rounded-xl bg-black/60 border border-cyan-500/30 space-y-3">
                <div className="text-xs font-bold text-cyan-300 font-mono flex items-center justify-between">
                  <span>⚡ Custom Stimulus Vector & Multi-Fault Generator</span>
                  <button onClick={() => setShowCustomInjector(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 block mb-1">Set Input Values:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {activeCircuit.inputs.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setCustomVectorInput(prev => ({ ...prev, [p.id]: prev[p.id] === 1 ? 0 : 1 }))}
                          className="px-2 py-1 rounded bg-white/10 font-mono text-xs text-white hover:bg-cyan-500/20"
                        >
                          {p.name}={customVectorInput[p.id] ?? p.defaultVal}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 block mb-1">Fault Target Node:</label>
                    <select
                      value={injectedFault.targetNode}
                      onChange={(e) => setInjectedFault(prev => ({ ...prev, targetNode: e.target.value }))}
                      className="w-full px-2 py-1 rounded bg-black/50 border border-white/10 text-xs font-mono text-white"
                    >
                      {allCircuitNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setInputStates({ ...customVectorInput });
                        setInjectedFault(prev => ({ ...prev, active: true }));
                      }}
                      className="w-full py-2 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono shadow-md hover:bg-cyan-400 flex items-center justify-center space-x-1"
                    >
                      <Zap size={13} />
                      <span>Inject Custom Vector & Run</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pattern Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead className="bg-white/5 text-gray-400 text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-2 border-r border-white/10">Pat #</th>
                    <th className="px-3 py-2 border-r border-white/10">Fault Target</th>
                    <th className="px-3 py-2 border-r border-white/10">Fault Type</th>
                    <th className="px-3 py-2 border-r border-white/10">Primary Input (PI) Vector</th>
                    <th className="px-3 py-2 border-r border-white/10">Expected Output</th>
                    <th className="px-3 py-2 border-r border-white/10">Faulty Output</th>
                    <th className="px-3 py-2 border-r border-white/10">D-Propagated</th>
                    <th className="px-3 py-2">Test Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPatterns.map((pat, idx) => {
                    const isActive = activePatternIdx === idx || (
                      injectedFault.active && 
                      injectedFault.targetNode === pat.targetNode && 
                      injectedFault.type === pat.faultType
                    );
                    return (
                      <tr
                        key={pat.id}
                        className={`transition-colors ${
                          isActive
                            ? 'bg-amber-500/25 font-bold text-white'
                            : 'hover:bg-white/5 text-gray-300'
                        }`}
                      >
                        <td className="px-3 py-2 border-r border-white/5">#{pat.id}</td>
                        <td className="px-3 py-2 border-r border-white/5 font-sans text-gray-200">{pat.targetNode}</td>
                        <td className="px-3 py-2 border-r border-white/5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pat.faultType === 'SA0' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {pat.faultType}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-r border-white/5 text-cyan-400">{pat.vectorStr}</td>
                        <td className="px-3 py-2 border-r border-white/5 text-emerald-400">{pat.expectedOutput}</td>
                        <td className="px-3 py-2 border-r border-white/5 text-red-400">{pat.actualOutput}</td>
                        <td className="px-3 py-2 border-r border-white/5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pat.detected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-800 text-gray-500'
                          }`}>
                            {pat.detected ? 'DETECTED' : 'UNTESTED'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => {
                              setInputStates({ ...pat.vector });
                              setInjectedFault({
                                id: 'pat_fault_' + pat.id,
                                type: pat.faultType,
                                targetNode: pat.targetNode,
                                delayNs: 4.5,
                                active: true
                              });
                            }}
                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center space-x-1 transition-all"
                          >
                            <Play size={10} />
                            <span>Inject & Test</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Test Tab 2: Logic BIST (PRPG & MISR Signature Analyzer) */}
        {activeTestTab === 'bist' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-purple-500/30 space-y-1">
                <div className="text-[9px] text-gray-400 uppercase">PRPG LFSR Polynomial</div>
                <div className="font-bold text-purple-300">{bistResult.lfsrPolynomial}</div>
                <div className="text-[10px] text-gray-400">Seed: {bistResult.seed} (Galois)</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-purple-500/30 space-y-1">
                <div className="text-[9px] text-gray-400 uppercase">MISR Response Compactor</div>
                <div className="font-bold text-cyan-300">{bistResult.misrPolynomial}</div>
                <div className="text-[10px] text-gray-400">Accumulator: CRC-16 Compacted</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-purple-500/30 space-y-1">
                <div className="text-[9px] text-gray-400 uppercase">BIST Signature Decision</div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Gold: {bistResult.goldenSignature}</span>
                  <span className="text-gray-400">|</span>
                  <span className={bistResult.isSignatureMatched ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    Act: {bistResult.actualSignature}
                  </span>
                </div>
                <div className={`text-[10px] font-bold ${bistResult.isSignatureMatched ? 'text-emerald-400' : 'text-red-400'}`}>
                  {bistResult.passFail === 'PASS' ? '✓ BIST PASSED (NO DEFECTS)' : '❌ BIST DEFECT DETECTED'}
                </div>
              </div>
            </div>

            {/* BIST Step Cycles Table with Live Injection Trigger */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 font-mono">
                  8-Cycle Autonomous PRPG Vector Burst:
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleInjectSpecificTestFault(allCircuitNodes[1]?.id || 'A', 'SA1')}
                    className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-mono font-bold flex items-center space-x-1"
                  >
                    <Flame size={11} />
                    <span>Inject Fault During BIST</span>
                  </button>
                  <button
                    onClick={() => setInjectedFault(prev => ({ ...prev, active: false }))}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-mono"
                  >
                    Reset BIST
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead className="bg-white/5 text-gray-400 text-[10px] uppercase">
                    <tr>
                      <th className="p-2 border-r border-white/10">Clock Cycle</th>
                      <th className="p-2 border-r border-white/10">PRPG Vector</th>
                      <th className="p-2 border-r border-white/10">Golden Response</th>
                      <th className="p-2 border-r border-white/10">DUT Response</th>
                      <th className="p-2 border-r border-white/10">MISR Accumulator</th>
                      <th className="p-2">Cycle Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bistResult.cycleSteps.map(step => (
                      <tr key={step.cycle} className={step.isFaultSensitized ? 'bg-red-500/10' : 'hover:bg-white/5'}>
                        <td className="p-2 border-r border-white/5 font-bold">Clock T{step.cycle}</td>
                        <td className="p-2 border-r border-white/5 text-purple-300">{JSON.stringify(step.prpgPattern)}</td>
                        <td className="p-2 border-r border-white/5 text-emerald-400">{JSON.stringify(step.goodResponse)}</td>
                        <td className="p-2 border-r border-white/5 text-amber-300">{JSON.stringify(step.faultyResponse)}</td>
                        <td className="p-2 border-r border-white/5 text-cyan-300">{step.misrAccumulatorHex}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            !step.isFaultSensitized ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {!step.isFaultSensitized ? 'MATCH' : 'MISR CORRUPTED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Test Tab 3: Scan Chain Stepper */}
        {activeTestTab === 'scan_chain' && (
          <div className="p-4 bg-[#0b0c0e] rounded-xl border border-white/10 space-y-4 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-gray-200">
                Scan Chain Shift & Capture Pipeline Controller
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setScanMode('SHIFT')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                    scanMode === 'SHIFT' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'bg-white/5 text-gray-400'
                  }`}
                >
                  Scan Enable (SE = 1: Shift)
                </button>
                <button
                  onClick={() => setScanMode('CAPTURE')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                    scanMode === 'CAPTURE' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-white/5 text-gray-400'
                  }`}
                >
                  Scan Capture (SE = 0: Capture)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 py-4 overflow-x-auto">
              <div className="px-3 py-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-center text-xs text-cyan-300 shrink-0">
                <div className="text-[9px] text-gray-400">SCAN IN (SI)</div>
                <div className="font-bold">1</div>
              </div>

              <ArrowRight size={16} className="text-gray-500 shrink-0" />

              {(activeCircuit.scanChain || ['FF0', 'FF1', 'FF2']).map((ffName, idx) => {
                const isTarget = injectedFault.active && injectedFault.targetNode === ffName;
                return (
                  <React.Fragment key={ffName}>
                    <div className={`p-3 rounded-xl border text-center transition-all min-w-[100px] shrink-0 ${
                      isTarget
                        ? 'bg-red-500/20 border-red-500/50'
                        : 'bg-[#181a20] border-white/10'
                    }`}>
                      <div className="text-[9px] text-gray-400">SCAN_FF_{idx}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{ffName}</div>
                      <div className="text-[10px] text-cyan-400 mt-1">
                        VAL: {simResult.faultyValues[ffName] ?? (idx % 2)}
                      </div>
                      <button
                        onClick={() => handleInjectSpecificTestFault(ffName, 'SA0')}
                        className="mt-1.5 px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[9px] block w-full"
                      >
                        ⚡ Inject SA0
                      </button>
                    </div>
                    {idx < (activeCircuit.scanChain?.length || 3) - 1 && (
                      <ArrowRight size={16} className="text-gray-500 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}

              <ArrowRight size={16} className="text-gray-500 shrink-0" />

              <div className="px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-center text-xs text-emerald-300 shrink-0">
                <div className="text-[9px] text-gray-400">SCAN OUT (SO)</div>
                <div className="font-bold">{simResult.detected ? 'FAIL (0)' : 'PASS (1)'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Test Tab 4: IDDQ Quiescent Leakage Current Test */}
        {activeTestTab === 'iddq' && (
          <div className="space-y-3 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/30">
                <div className="text-[9px] text-gray-400 uppercase">Nominal Subthreshold Leakage</div>
                <div className="text-lg font-bold text-cyan-300 mt-1">{iddqResult.nominalBaseMicroAmps} µA</div>
                <div className="text-[10px] text-gray-500">Normal CMOS Standby</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/30">
                <div className="text-[9px] text-gray-400 uppercase">Measured IDDQ Current</div>
                <div className={`text-lg font-bold mt-1 ${iddqResult.isIddqViolation ? 'text-red-400' : 'text-emerald-400'}`}>
                  {iddqResult.measuredCurrentMicroAmps} µA
                </div>
                <div className="text-[10px] text-gray-400">Pass Limit: &lt; {iddqResult.thresholdLimitMicroAmps} µA</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/30">
                <div className="text-[9px] text-gray-400 uppercase">IDDQ Test Verdict</div>
                <div className={`text-base font-bold mt-1 ${iddqResult.isIddqViolation ? 'text-red-400' : 'text-emerald-400'}`}>
                  {iddqResult.passFail === 'PASS' ? '✓ IDDQ PASSED' : '❌ IDDQ CRITICAL SPIKE'}
                </div>
                <button
                  onClick={() => handleInjectSpecificTestFault(allCircuitNodes[0]?.id || 'A', 'BRIDGE_AND')}
                  className="mt-1 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold block"
                >
                  ⚡ Inject Short / Bridging Spike
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs space-y-1">
              <div className="text-cyan-300 font-bold">IDDQ Physical Diagnostic:</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                {iddqResult.faultLeakageSummary}
              </p>
            </div>
          </div>
        )}

        {/* Test Tab 5: At-Speed Transition Delay Test */}
        {activeTestTab === 'delay' && (
          <div className="space-y-3 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-pink-500/30">
                <div className="text-[9px] text-gray-400 uppercase">Clock Frequency & Period</div>
                <div className="text-lg font-bold text-pink-300 mt-1">{delayResult.nominalClockFreqMHz} MHz (T = {delayResult.clockPeriodNs} ns)</div>
                <div className="text-[10px] text-gray-500">Launch-Off-Capture (LOC)</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-pink-500/30">
                <div className="text-[9px] text-gray-400 uppercase">Critical Path Arrival & Slack</div>
                <div className={`text-lg font-bold mt-1 ${delayResult.hasTimingViolation ? 'text-red-400' : 'text-emerald-400'}`}>
                  Arrival: {delayResult.dataArrivalNs} ns (Slack: {delayResult.slackNs} ns)
                </div>
                <div className="text-[10px] text-gray-400">Setup Requirement: {delayResult.setupTimeRequirementNs} ns</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-pink-500/30">
                <div className="text-[9px] text-gray-400 uppercase">Timing Verdict</div>
                <div className={`text-base font-bold mt-1 ${delayResult.hasTimingViolation ? 'text-red-400' : 'text-emerald-400'}`}>
                  {delayResult.passFail === 'PASS' ? '✓ AT-SPEED PASS' : '❌ TIMING SETUP VIOLATION'}
                </div>
                <button
                  onClick={() => handleInjectSpecificTestFault(allCircuitNodes[0]?.id || 'A', 'DELAY')}
                  className="mt-1 px-2 py-0.5 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-bold block"
                >
                  ⚡ Inject Delay Defect (+4.5ns)
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs space-y-1">
              <div className="text-pink-300 font-bold">At-Speed Timing Analysis:</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                {delayResult.timingAnalysisSummary}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

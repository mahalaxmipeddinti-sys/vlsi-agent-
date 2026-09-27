import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Download, 
  Copy, 
  RotateCcw, 
  Zap, 
  Info,
  Layers,
  Flame,
  ArrowRight,
  TrendingUp,
  BarChart2,
  Sparkles,
  ShieldCheck,
  Cpu,
  Table,
  Check,
  Plus,
  Play,
  Filter,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  PVT_CORNERS, 
  PVTCornerId, 
  OperatingMode, 
  DerateMode, 
  CellVt, 
  createBaseTimingPaths, 
  evaluateSTA, 
  solveTimingECO,
  TimingPath 
} from '../utils/staEngine';
import { STATimingWaveform } from './STATimingwaveforms';

interface STAViewerProps {
  activeIcId?: string;
  activeComponentName?: string;
  onNavigateToNextStage?: () => void;
}

export function STAViewer({ 
  activeIcId = '7476', 
  activeComponentName = 'SN74151 8-Line to 1-Line Data Selector/Multiplexer',
  onNavigateToNextStage
}: STAViewerProps) {
  // Engine Controls State
  const [selectedCornerId, setSelectedCornerId] = useState<PVTCornerId>('SS_0.63V_125C');
  const [targetFreqMhz, setTargetFreqMhz] = useState<number>(500);
  const [derateMode, setDerateMode] = useState<DerateMode>('pocv_3sigma');
  const [checkType, setCheckType] = useState<'setup' | 'hold'>('setup');
  const [viewTab, setViewTab] = useState<'waveform' | 'path_table' | 'eco_fixer' | 'histogram' | 'mcmm_matrix'>('waveform');

  // Interactive ECO Overrides State
  const [ecoOverrides, setEcoOverrides] = useState<Record<string, { vt?: CellVt; driveStrength?: number; addedDelayPs?: number }>>({});
  const [usefulSkewOffsetPs, setUsefulSkewOffsetPs] = useState<number>(0);
  const [ecoToastMessage, setEcoToastMessage] = useState<string | null>(null);

  // Script Modal
  const [showTclModal, setShowTclModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Path Search & Category Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'reg2reg' | 'in2reg' | 'reg2out'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'violating' | 'passing'>('all');

  // Base timing paths
  const basePaths = useMemo(() => {
    return createBaseTimingPaths(activeIcId);
  }, [activeIcId]);

  // Evaluate STA with current controls and ECO modifications
  const staResult = useMemo(() => {
    return evaluateSTA(
      basePaths,
      targetFreqMhz,
      selectedCornerId,
      derateMode,
      usefulSkewOffsetPs,
      ecoOverrides
    );
  }, [basePaths, targetFreqMhz, selectedCornerId, derateMode, usefulSkewOffsetPs, ecoOverrides]);

  // Selected Path
  const [selectedPathId, setSelectedPathId] = useState<string>(basePaths[0].id);

  const activePath = useMemo(() => {
    return staResult.paths.find(p => p.id === selectedPathId) || staResult.criticalSetupPath;
  }, [staResult, selectedPathId]);

  // Filtered Paths for browser
  const filteredPaths = useMemo(() => {
    return staResult.paths.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.launchFlop.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.captureFlop.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || 
                          (statusFilter === 'violating' && (p.setupSlackPs < 0 || p.holdSlackPs < 0)) ||
                          (statusFilter === 'passing' && (p.setupSlackPs >= 0 && p.holdSlackPs >= 0));
      return matchSearch && matchCat && matchStatus;
    });
  }, [staResult.paths, searchTerm, categoryFilter, statusFilter]);

  // Multi-Corner Signoff Evaluation across all corners
  const mcmmMatrix = useMemo(() => {
    return (Object.keys(PVT_CORNERS) as PVTCornerId[]).map(cornerKey => {
      const res = evaluateSTA(basePaths, targetFreqMhz, cornerKey, derateMode, usefulSkewOffsetPs, ecoOverrides);
      return {
        corner: PVT_CORNERS[cornerKey],
        wnsSetup: res.metrics.wnsSetupPs,
        wnsHold: res.metrics.wnsHoldPs,
        fepSetup: res.metrics.fepSetup,
        fepHold: res.metrics.fepHold,
        fMax: res.metrics.maxFrequencyMhz,
        passed: res.metrics.wnsSetupPs >= 0 && res.metrics.wnsHoldPs >= 0
      };
    });
  }, [basePaths, targetFreqMhz, derateMode, usefulSkewOffsetPs, ecoOverrides]);

  // Reset ECO
  const handleResetEco = () => {
    setEcoOverrides({});
    setUsefulSkewOffsetPs(0);
    setEcoToastMessage('ECO Reset to Baseline');
    setTimeout(() => setEcoToastMessage(null), 3000);
  };

  // Smart Automatic ECO Optimization (cures both Setup and Hold!)
  const handleAutoFixECO = () => {
    const solution = solveTimingECO(basePaths, targetFreqMhz, selectedCornerId, derateMode);
    setEcoOverrides(solution.ecoOverrides);
    setUsefulSkewOffsetPs(solution.usefulSkewOffsetPs);
    setEcoToastMessage(solution.reportSummary);
    setTimeout(() => setEcoToastMessage(null), 6000);
  };

  // Manual Delay Buffer insertion for Hold Fix
  const handleAddHoldBuffer = (cellInstance: string, delayPs: number = 85) => {
    setEcoOverrides(prev => ({
      ...prev,
      [cellInstance]: {
        ...prev[cellInstance],
        addedDelayPs: (prev[cellInstance]?.addedDelayPs || 0) + delayPs
      }
    }));
    setEcoToastMessage(`Inserted +${delayPs}ps DLY_X1 buffer on ${cellInstance}`);
    setTimeout(() => setEcoToastMessage(null), 3500);
  };

  // OpenSTA & PrimeTime TCL Script
  const tclScript = `# Synopsys PrimeTime & OpenSTA Signoff Script for ${activeComponentName}
# Stage 6: Static Timing Analysis with Multi-Corner Multi-Mode (MCMM) & POCV
set DESIGN_NAME "${activeComponentName}"
set CORNER "${selectedCornerId}"
set FREQ_MHZ ${targetFreqMhz}

# 1. Read Technology Libraries & Parasitics
read_liberty -corner $CORNER NangateOpenCellLibrary_${selectedCornerId}.lib
read_spef -corner $CORNER output_routing.spef
read_verilog run_routed.v
link_design $DESIGN_NAME

# 2. Timing Constraints (SDC)
create_clock -name core_clk -period ${(1000000 / targetFreqMhz / 1000).toFixed(3)} [get_ports clk]
set_clock_uncertainty -setup 0.045 [get_clocks core_clk]
set_clock_uncertainty -hold 0.025 [get_clocks core_clk]
set_clock_transition 0.035 [get_clocks core_clk]

# 3. Advanced On-Chip Variation (POCV) Derates
set_timing_derate -early ${(PVT_CORNERS[selectedCornerId].holdDerate).toFixed(2)} -cell_delay
set_timing_derate -late ${(PVT_CORNERS[selectedCornerId].setupDerate).toFixed(2)} -cell_delay

# 4. Generate Comprehensive Timing Reports
report_checks -path_delay max -fields {slew cap input_pins nets fanout} -digits 3 > setup_report.rpt
report_checks -path_delay min -fields {slew cap input_pins nets fanout} -digits 3 > hold_report.rpt
report_worst_slack -max
report_worst_slack -min
report_tns
report_failing_endpoints

puts "=========================================================="
puts "STA Signoff Results: WNS Setup = ${staResult.metrics.wnsSetupPs} ps, WNS Hold = ${staResult.metrics.wnsHoldPs} ps"
puts "Max Frequency achievable: ${staResult.metrics.maxFrequencyMhz} MHz"
puts "=========================================================="`;

  const copyTcl = () => {
    navigator.clipboard.writeText(tclScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isTimingClean = staResult.metrics.wnsSetupPs >= 0 && staResult.metrics.wnsHoldPs >= 0;

  // Maximum bin count for histogram scaling
  const maxBinCount = useMemo(() => {
    return Math.max(1, ...staResult.histogram.map(b => b.count));
  }, [staResult.histogram]);

  return (
    <div className="flex flex-col h-full bg-[#121316] text-gray-200 select-none overflow-hidden">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-white/10 bg-[#15171C] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <Clock size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-bold">
                Backend Flow • Stage 6
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Static Timing Analysis (STA) Studio
              </h2>
            </div>
            <p className="text-[11px] text-gray-400">
              Multi-Corner Multi-Mode (MCMM) timing closure, POCV statistical derating, and interactive ECO optimization for <span className="text-emerald-400 font-semibold">{activeComponentName}</span>
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTclModal(true)}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-200 transition-all flex items-center space-x-1.5"
          >
            <Download size={13} />
            <span>OpenSTA Script</span>
          </button>

          {/* Automatic ECO Button */}
          <button
            onClick={handleAutoFixECO}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-extrabold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(20,184,166,0.4)]"
            title="Auto-insert Hold Delay Buffers and Upsize Setup Gates to close timing"
          >
            <Sparkles size={14} className="text-black" />
            <span>Auto-Apply Timing ECO</span>
          </button>

          {onNavigateToNextStage && (
            <button
              onClick={onNavigateToNextStage}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <span>Next: Sign-off & Tapeout (Stage 7) ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* PVT Corner & Frequency Control Bar */}
      <div className="px-5 py-2.5 bg-[#171920] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* PVT Corner Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">PVT Corner:</span>
          <select
            value={selectedCornerId}
            onChange={(e) => setSelectedCornerId(e.target.value as PVTCornerId)}
            className="bg-black/50 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
          >
            {Object.values(PVT_CORNERS).map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.isTempInversion ? '⚡ [FinFET Inversion]' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Target Frequency Buttons */}
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">Clock Frequency:</span>
          <div className="flex items-center space-x-1.5">
            {[250, 400, 500, 666, 800].map(freq => (
              <button
                key={freq}
                onClick={() => setTargetFreqMhz(freq)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border transition-all ${
                  targetFreqMhz === freq
                    ? 'bg-teal-500 text-black border-teal-400 shadow-sm'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {freq} MHz
              </button>
            ))}
            <span className="text-xs font-mono font-bold text-teal-400 pl-1">
              ({Math.round(1000000 / targetFreqMhz)} ps)
            </span>
          </div>
        </div>

        {/* On-Chip Variation (POCV) Mode */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">Variation Derating:</span>
          <select
            value={derateMode}
            onChange={(e) => setDerateMode(e.target.value as DerateMode)}
            className="bg-black/50 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
          >
            <option value="none">Flat (Nominal)</option>
            <option value="aocv">AOCV (Depth Derated)</option>
            <option value="pocv_3sigma">POCV (3-Sigma Statistical)</option>
          </select>
        </div>
      </div>

      {/* Floating ECO Notification Toast */}
      {ecoToastMessage && (
        <div className="bg-gradient-to-r from-teal-900/90 to-emerald-900/90 border border-teal-400/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center justify-between mx-4 my-2 text-xs animate-in slide-in-from-top-2 duration-200 shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-teal-300 shrink-0" />
            <span className="font-semibold">{ecoToastMessage}</span>
          </div>
          <button onClick={() => setEcoToastMessage(null)} className="text-white/70 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        
        {/* Left 9 Cols: Waveform, Path Table, ECO Engine, Histogram */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-[#0E0F12] border-r border-white/10 overflow-hidden">
          
          {/* Subheader View Tabs */}
          <div className="px-4 py-2 border-b border-white/10 bg-[#14161A] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewTab('waveform')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'waveform'
                    ? 'bg-teal-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Activity size={13} />
                <span>Waveform & Windows</span>
              </button>

              <button
                onClick={() => setViewTab('path_table')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'path_table'
                    ? 'bg-teal-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Table size={13} />
                <span>Node Delay Breakdown</span>
              </button>

              <button
                onClick={() => setViewTab('eco_fixer')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'eco_fixer'
                    ? 'bg-teal-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles size={13} />
                <span>Interactive Timing ECO Fixer</span>
              </button>

              <button
                onClick={() => setViewTab('histogram')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'histogram'
                    ? 'bg-teal-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <BarChart2 size={13} />
                <span>Slack Distribution Histogram</span>
              </button>

              <button
                onClick={() => setViewTab('mcmm_matrix')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'mcmm_matrix'
                    ? 'bg-teal-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShieldCheck size={13} />
                <span>MCMM Signoff Matrix</span>
              </button>
            </div>

            {/* Setup vs Hold Toggle */}
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setCheckType('setup')}
                className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold transition-all ${
                  checkType === 'setup'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Setup Check (Max Delay)
              </button>
              <button
                onClick={() => setCheckType('hold')}
                className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold transition-all ${
                  checkType === 'hold'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Hold Check (Min Delay)
              </button>
            </div>
          </div>

          {/* VIEW TAB 1: INTERACTIVE TIMING WAVEFORM */}
          {viewTab === 'waveform' && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
              {/* Path Selector Bar */}
              <div className="bg-[#15171C] p-3 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-bold text-gray-400 uppercase">Selected Path:</span>
                  <select
                    value={selectedPathId}
                    onChange={(e) => setSelectedPathId(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-teal-500 max-w-[420px]"
                  >
                    {staResult.paths.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.category.toUpperCase()}] {p.name} — Slack: {checkType === 'setup' ? p.setupSlackPs : p.holdSlackPs}ps ({checkType === 'setup' ? p.setupStatus : p.holdStatus})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-gray-400">Launch: {activePath.launchClock}</span>
                  <span className="text-gray-400">➔</span>
                  <span className="text-gray-400">Capture: {activePath.captureClock}</span>
                </div>
              </div>

              {/* Waveform Component */}
              <STATimingWaveform path={activePath} checkType={checkType} />

              {/* Critical Path Schematic Gate Chain */}
              <div className="bg-[#15171C] p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={14} className="text-teal-400" />
                    <span>Topological Gate Chain Diagram ({activePath.dataPoints.length} Stages)</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    Total Arrival: {activePath.dataArrivalPs} ps
                  </span>
                </div>

                {/* Horizontal Gate Diagram */}
                <div className="flex items-center space-x-2 overflow-x-auto py-2 px-1">
                  {activePath.dataPoints.map((pt, idx) => (
                    <React.Fragment key={pt.id}>
                      <div className={`p-2.5 rounded-xl border shrink-0 text-center space-y-1 transition-all ${
                        pt.isDelayBuffer
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-black/50 border-white/10 hover:border-teal-400 text-gray-200'
                      }`}>
                        <div className="text-[10px] text-gray-400 font-mono truncate max-w-[100px]">
                          {pt.cellInstance}
                        </div>
                        <div className="text-xs font-bold text-teal-300 font-mono">
                          {pt.cellType}
                        </div>
                        <div className="flex items-center justify-center space-x-1 text-[9px] font-mono">
                          <span className="text-emerald-400">+{pt.cellDelayPs}ps</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-purple-300">{pt.vt}</span>
                        </div>
                        {pt.isDelayBuffer && (
                          <div className="text-[9px] text-amber-300 font-bold bg-amber-500/20 rounded px-1">
                            HOLD BUFFER
                          </div>
                        )}
                      </div>
                      {idx < activePath.dataPoints.length - 1 && (
                        <div className="flex flex-col items-center shrink-0">
                          <ArrowRight size={13} className="text-gray-500" />
                          <span className="text-[8px] font-mono text-gray-500">+{activePath.dataPoints[idx+1].netDelayPs}ps net</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Endpoint Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#16181D] rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Launch Flip-Flop:</span>
                  <div className="font-mono font-bold text-white text-xs">{activePath.launchFlop}</div>
                  <div className="text-[11px] text-gray-400">Clock Insertion Latency: {activePath.launchClockLatencyPs} ps</div>
                </div>

                <div className="p-3 bg-[#16181D] rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Capture Flip-Flop:</span>
                  <div className="font-mono font-bold text-white text-xs">{activePath.captureFlop}</div>
                  <div className="text-[11px] text-gray-400">Clock Insertion Latency: {activePath.captureClockLatencyPs} ps</div>
                </div>

                <div className="p-3 bg-[#16181D] rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Clock Skew & Jitter:</span>
                  <div className="font-mono font-bold text-cyan-400 text-xs">
                    Skew: {activePath.clockSkewPs > 0 ? `+${activePath.clockSkewPs}` : activePath.clockSkewPs} ps
                  </div>
                  <div className="text-[11px] text-gray-400">Uncertainty Margin: {activePath.clockUncertaintyPs} ps</div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 2: DETAILED CELL-BY-CELL PATH TABLE */}
          {viewTab === 'path_table' && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Table size={14} className="text-teal-400" />
                  <span>Incremental Node Delay Breakdown ({activePath.name})</span>
                </span>
                <div className="flex items-center space-x-2 text-xs">
                  <select
                    value={selectedPathId}
                    onChange={(e) => setSelectedPathId(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                  >
                    {staResult.paths.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#14161C] rounded-2xl border border-white/10 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#191B22] text-gray-400 border-b border-white/10 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Instance / Pin</th>
                      <th className="py-2.5 px-2">Type</th>
                      <th className="py-2.5 px-2">Edge</th>
                      <th className="py-2.5 px-2">Vt</th>
                      <th className="py-2.5 px-2">Slew</th>
                      <th className="py-2.5 px-2">Cell Delay</th>
                      <th className="py-2.5 px-2">Net Delay</th>
                      <th className="py-2.5 px-2">Arrival</th>
                      <th className="py-2.5 px-2">Fanout</th>
                      <th className="py-2.5 px-2">Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {activePath.dataPoints.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3 text-white font-bold">{pt.pin}</td>
                        <td className="py-2 px-2 text-teal-400">{pt.cellType}</td>
                        <td className="py-2 px-2 text-gray-400 uppercase">{pt.edge}</td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            pt.vt === 'ULVT' ? 'bg-purple-500/20 text-purple-300' :
                            pt.vt === 'LVT' ? 'bg-cyan-500/20 text-cyan-300' :
                            pt.vt === 'SVT' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {pt.vt}
                          </span>
                        </td>
                        <td className={`py-2 px-2 ${pt.slewPs > 100 ? 'text-amber-400 font-bold' : 'text-gray-300'}`}>
                          {pt.slewPs} ps
                        </td>
                        <td className="py-2 px-2 text-emerald-400 font-bold">
                          {pt.cellDelayPs} ps {pt.isDelayBuffer ? '(+DLY)' : ''}
                        </td>
                        <td className="py-2 px-2 text-gray-400">{pt.netDelayPs} ps</td>
                        <td className="py-2 px-2 text-white font-bold">{pt.arrivalPs} ps</td>
                        <td className="py-2 px-2 text-gray-400">{pt.fanout}</td>
                        <td className="py-2 px-2 text-gray-400">{pt.loadCapFf} fF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW TAB 3: INTERACTIVE TIMING ECO FIXER */}
          {viewTab === 'eco_fixer' && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
              <div className="bg-[#171920] p-4 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-teal-400" />
                    <span>Interactive Engineering Change Order (ECO) Timing Optimization</span>
                  </h3>
                  <button
                    onClick={handleResetEco}
                    className="px-2.5 py-1 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
                  >
                    Reset ECO to Base
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Interactively upsize cell drive strengths, swap Multi-Vt thresholds (HVT ➔ LVT ➔ ULVT), insert hold delay buffers, or tune clock skew to close timing slack in real time.
                </p>
              </div>

              {/* Useful Clock Skew Tuning Slider */}
              <div className="bg-[#14161C] p-4 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Useful Clock Skew Tuning (Capture Latency Adjustment):</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {usefulSkewOffsetPs > 0 ? `+${usefulSkewOffsetPs}` : usefulSkewOffsetPs} ps
                  </span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="120"
                  step="5"
                  value={usefulSkewOffsetPs}
                  onChange={(e) => setUsefulSkewOffsetPs(parseInt(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>-80 ps (Shift earlier / Hold Help)</span>
                  <span>0 ps (Nominal CTS)</span>
                  <span>+120 ps (Borrow time / Setup Boost)</span>
                </div>
              </div>

              {/* Cell Sizing & Multi-Vt Swapping Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Critical Path Cell Optimization:
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono">
                    Path: {activePath.name}
                  </span>
                </div>

                {activePath.dataPoints.filter(p => !p.cellType.includes('CLKBUF')).map((pt) => {
                  const currentOverride = ecoOverrides[pt.cellInstance] || {};
                  const activeDrive = currentOverride.driveStrength || pt.driveStrength;
                  const activeVt = currentOverride.vt || pt.vt;
                  const addedDelay = currentOverride.addedDelayPs || 0;

                  return (
                    <div key={pt.id} className="p-3 bg-[#15171C] rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white font-mono flex items-center space-x-2">
                          <span>{pt.cellInstance}</span>
                          <span className="text-[10px] text-teal-400">({pt.cellType})</span>
                          {addedDelay > 0 && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                              +{addedDelay}ps DLY Buffer
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Current Delay: <span className="text-emerald-400 font-bold">{pt.cellDelayPs} ps</span> • Slew: {pt.slewPs} ps
                        </div>
                      </div>

                      {/* Drive Strength Sizing Buttons */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Drive:</span>
                        {[1, 2, 4, 8].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              setEcoOverrides(prev => ({
                                ...prev,
                                [pt.cellInstance]: { ...prev[pt.cellInstance], driveStrength: size }
                              }));
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                              activeDrive === size
                                ? 'bg-teal-500 text-black border-teal-400 shadow-sm'
                                : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            X{size}
                          </button>
                        ))}
                      </div>

                      {/* Multi-Vt Selection */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Vt:</span>
                        {(['HVT', 'SVT', 'LVT', 'ULVT'] as CellVt[]).map((vtOption) => (
                          <button
                            key={vtOption}
                            onClick={() => {
                              setEcoOverrides(prev => ({
                                ...prev,
                                [pt.cellInstance]: { ...prev[pt.cellInstance], vt: vtOption }
                              }));
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                              activeVt === vtOption
                                ? 'bg-purple-500 text-white border-purple-400'
                                : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            {vtOption}
                          </button>
                        ))}
                      </div>

                      {/* Quick Hold Delay Buffer Insertion Button */}
                      <button
                        onClick={() => handleAddHoldBuffer(pt.cellInstance, 85)}
                        className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold flex items-center space-x-1 transition-all"
                        title="Add deliberate delay buffer to fix hold timing race"
                      >
                        <Plus size={11} />
                        <span>Insert Hold Buffer</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW TAB 4: SLACK DISTRIBUTION HISTOGRAM (ENHANCED & ROCK-SOLID) */}
          {viewTab === 'histogram' && (
            <div className="flex-1 flex flex-col p-5 overflow-y-auto space-y-4">
              <div className="bg-[#171920] p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart2 size={14} className="text-teal-400" />
                    <span>Design-Wide Slack Distribution Bell Curve</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Statistical histogram across all {staResult.paths.length} evaluated timing paths. Bars to the left of 0 ps indicate setup timing violations.
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-emerald-400 font-bold">{staResult.paths.filter(p => p.setupSlackPs >= 0).length} Passing</span>
                  <span className="text-rose-400 font-bold">{staResult.paths.filter(p => p.setupSlackPs < 0).length} Violating</span>
                </div>
              </div>

              {/* Histogram Visualizer with Explicit Heights */}
              <div className="bg-[#14161C] p-6 rounded-2xl border border-white/10 flex flex-col items-center">
                {/* Visual Chart Area */}
                <div className="w-full max-w-3xl h-64 border-b border-white/20 pb-4 px-2 flex items-end justify-between gap-3">
                  {staResult.histogram.map((bin, idx) => {
                    const ratio = bin.count / maxBinCount;
                    // Minimum visible bar height of 8% if count > 0
                    const barHeightPct = bin.count > 0 ? Math.max(10, Math.round(ratio * 92)) : 3;

                    return (
                      <div
                        key={idx}
                        className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                        onClick={() => {
                          if (bin.paths.length > 0) {
                            setSelectedPathId(bin.paths[0].id);
                            setViewTab('waveform');
                          }
                        }}
                      >
                        {/* Hover Count Badge */}
                        <div className="text-[10px] font-mono font-bold text-white mb-1.5 transition-opacity opacity-70 group-hover:opacity-100">
                          {bin.count}
                        </div>

                        {/* Solid Bar Container with explicit height */}
                        <div className="w-full flex items-end justify-center" style={{ height: `${barHeightPct}%` }}>
                          <div
                            className={`w-full rounded-t-lg transition-all group-hover:brightness-125 shadow-md ${
                              bin.isNegative
                                ? 'bg-gradient-to-t from-rose-600 to-rose-400 border-t border-rose-300'
                                : 'bg-gradient-to-t from-teal-600 to-teal-400 border-t border-teal-300'
                            }`}
                            style={{ height: '100%' }}
                          />
                        </div>

                        {/* X-Axis Range Label */}
                        <div className="mt-2 text-[9px] font-mono text-gray-400 text-center truncate max-w-[80px]">
                          {bin.rangeLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend & Details */}
                <div className="mt-4 flex flex-wrap items-center justify-between w-full max-w-3xl text-xs text-gray-300 font-mono">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-3 h-3 rounded bg-rose-500 shadow-sm" />
                      <span>Violating Slack (&lt; 0 ps)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-3 h-3 rounded bg-teal-500 shadow-sm" />
                      <span>Passing Slack (&ge; 0 ps)</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Click any histogram column to view that path in the Waveform viewer.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 5: MCMM SIGNOFF MATRIX */}
          {viewTab === 'mcmm_matrix' && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
              <div className="bg-[#171920] p-4 rounded-xl border border-white/10">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={14} className="text-teal-400" />
                  <span>Multi-Corner Multi-Mode (MCMM) Signoff Certification</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">
                  For tape-out signoff, the chip must pass both Setup and Hold timing simultaneously across all 4 PVT corners.
                </p>
              </div>

              <div className="bg-[#14161C] rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#191B22] text-gray-400 border-b border-white/10 text-[10px] uppercase">
                    <tr>
                      <th className="py-3 px-4">PVT Corner Condition</th>
                      <th className="py-3 px-3">Setup WNS</th>
                      <th className="py-3 px-3">Hold WNS</th>
                      <th className="py-3 px-3">F_Max</th>
                      <th className="py-3 px-3">Signoff Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {mcmmMatrix.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{item.corner.name}</div>
                          <div className="text-[10px] text-gray-400">{item.corner.description}</div>
                        </td>
                        <td className={`py-3 px-3 font-bold ${item.wnsSetup >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.wnsSetup > 0 ? `+${item.wnsSetup}` : item.wnsSetup} ps
                        </td>
                        <td className={`py-3 px-3 font-bold ${item.wnsHold >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.wnsHold > 0 ? `+${item.wnsHold}` : item.wnsHold} ps
                        </td>
                        <td className="py-3 px-3 text-cyan-400 font-bold">{item.fMax} MHz</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.passed ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}>
                            {item.passed ? 'CERTIFIED PASS' : 'VIOLATED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 3 Cols: Timing Signoff Dashboard Metrics */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col bg-[#141519] border-l border-white/10 p-4 space-y-4 overflow-y-auto">
          
          {/* Signoff Status Header */}
          <div className="bg-[#191B20] rounded-2xl border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                STA Signoff Status
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                isTimingClean ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {isTimingClean ? 'TIMING CLOSED' : 'VIOLATION DETECTED'}
              </span>
            </div>

            <div className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              {isTimingClean ? (
                <>
                  <CheckCircle2 size={20} className="text-emerald-400" />
                  <span>Ready for Tapeout</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={20} className="text-rose-400" />
                  <span>Negative Slack Present</span>
                </>
              )}
            </div>

            <p className="text-[11px] text-gray-400">
              Evaluated under <span className="text-white font-mono">{PVT_CORNERS[selectedCornerId].process}</span> at {targetFreqMhz} MHz with POCV 3-sigma derating.
            </p>
          </div>

          {/* Core Signoff Metrics */}
          <div className="bg-[#191B20] rounded-2xl border border-white/10 p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Activity size={13} className="text-teal-400" />
              <span>Timing Signoff Metrics</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Setup WNS</div>
                <div className={`text-sm font-bold font-mono ${staResult.metrics.wnsSetupPs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {staResult.metrics.wnsSetupPs > 0 ? `+${staResult.metrics.wnsSetupPs}` : staResult.metrics.wnsSetupPs} ps
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Hold WNS</div>
                <div className={`text-sm font-bold font-mono ${staResult.metrics.wnsHoldPs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {staResult.metrics.wnsHoldPs > 0 ? `+${staResult.metrics.wnsHoldPs}` : staResult.metrics.wnsHoldPs} ps
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Setup TNS</div>
                <div className="text-sm font-bold font-mono text-gray-200">
                  {staResult.metrics.tnsSetupPs} ps
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Max Frequency</div>
                <div className="text-sm font-bold font-mono text-cyan-400">
                  {staResult.metrics.maxFrequencyMhz} MHz
                </div>
              </div>
            </div>
          </div>

          {/* Design Rule Checking (DRC) Metrics */}
          <div className="bg-[#191B20] rounded-2xl border border-white/10 p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck size={13} className="text-teal-400" />
              <span>Electrical DRC Checks</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 text-[11px]">Max Transition (&lt;120ps):</span>
                <span className={`font-mono font-bold ${staResult.metrics.drcTransitionViolations === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {staResult.metrics.drcTransitionViolations === 0 ? '0 Violations (PASS)' : `${staResult.metrics.drcTransitionViolations} VIOLATIONS`}
                </span>
              </div>

              <div className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 text-[11px]">Max Capacitance (&lt;60fF):</span>
                <span className={`font-mono font-bold ${staResult.metrics.drcCapacitanceViolations === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {staResult.metrics.drcCapacitanceViolations === 0 ? '0 Violations (PASS)' : `${staResult.metrics.drcCapacitanceViolations} VIOLATIONS`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick ECO Fix Action Banner */}
          <div className="bg-gradient-to-br from-teal-950/40 to-black/60 p-4 rounded-2xl border border-teal-500/30 space-y-2">
            <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-teal-400" />
              <span>Instant ECO Optimization</span>
            </div>
            <p className="text-[11px] text-gray-300">
              One-click optimization: Automatically inserts hold delay buffers on fast race paths and upsizes drive strength on setup-critical gates.
            </p>
            <button
              onClick={handleAutoFixECO}
              className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all mt-1"
            >
              Apply Automatic ECO Timing Fix
            </button>
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showTclModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#16171B] border border-white/10 rounded-2xl max-w-xl w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Download size={16} className="text-teal-400" />
                <span>Synopsys PrimeTime & OpenSTA Signoff Script</span>
              </div>
              <button onClick={() => setShowTclModal(false)} className="text-gray-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
            <pre className="p-3 bg-black/60 rounded-xl border border-white/5 text-[11px] font-mono text-teal-300 overflow-x-auto max-h-72">
              {tclScript}
            </pre>
            <div className="flex justify-end space-x-2">
              <button
                onClick={copyTcl}
                className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-md"
              >
                <Copy size={13} />
                <span>{copied ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

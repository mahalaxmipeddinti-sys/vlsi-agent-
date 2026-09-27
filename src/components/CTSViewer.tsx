import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GitBranch, 
  RotateCcw, 
  Download, 
  Copy, 
  Sparkles, 
  Sliders, 
  Activity, 
  Eye, 
  EyeOff, 
  Zap, 
  Layers, 
  Network, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize2, 
  Minimize2,
  Cpu,
  Box,
  Compass,
  FileCode,
  Flame,
  Clock,
  ArrowRight,
  TrendingDown,
  Info,
  Radio,
  Workflow,
  Search
} from 'lucide-react';
import { FloorplanConfig } from '../types/physicalDesign';
import { StandardCellInfo } from './PlacementCellCircuitView';
import { getDynamicBackendData } from '../utils/dynamicPlacementEngine';
import { 
  ClockTreeState, 
  createReferencePicLayout, 
  createHTreeLayout, 
  createClockMeshLayout, 
  createSynchronizedStageLayout,
  synthesizeClockTreeFromPrompt, 
  generateCtsTclScript,
  ClockSink,
  LayoutMacro,
  ClockBufferNode
} from '../utils/clockTreeEngine';
import { CTS3DViewer } from './CTS3DViewer';
import { BlockWorkingModal } from './BlockWorkingModal';

interface CTSViewerProps {
  activeIcId?: string;
  activeComponentName?: string;
  floorplanConfig?: FloorplanConfig;
  onNavigateToNextStage?: () => void;
  onUpdateFloorplan?: (newConfig: FloorplanConfig) => void;
  initialPrompt?: string;
}

export function CTSViewer({ 
  activeIcId = '7476', 
  activeComponentName = 'SN7476 Dual J-K Flip-Flop',
  floorplanConfig,
  onNavigateToNextStage,
  onUpdateFloorplan,
  initialPrompt
}: CTSViewerProps) {
  // Extract standard cells from stage 3 placement
  const backendData = useMemo(() => {
    return getDynamicBackendData(activeIcId, activeComponentName);
  }, [activeIcId, activeComponentName]);

  // Prompt engine state
  const [promptInput, setPromptInput] = useState(
    initialPrompt || 'Connect 4 corner macros with central trunk clock tree to core placement cells from bottom CLK pad'
  );
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [lastAppliedPrompt, setLastAppliedPrompt] = useState<string>('');

  // Primary Clock Tree State
  const [ctsState, setCtsState] = useState<ClockTreeState>(() => {
    return createReferencePicLayout({
      targetSkew: backendData.isSequential ? 30 : 10,
      maxSlew: 40,
      bufferType: 'CLKBUF_X8',
      frequencyMhz: 500
    });
  });

  // Visualization Tabs: 'die_2d' | 'die_3d' | 'tree_graph' | 'heatmap' | 'waveform'
  const [viewTab, setViewTab] = useState<'die_2d' | 'die_3d' | 'tree_graph' | 'heatmap' | 'waveform'>('die_2d');

  // Layer Toggles
  const [showTrunks, setShowTrunks] = useState(true);
  const [showBranches, setShowBranches] = useState(true);
  const [showBuffers, setShowBuffers] = useState(true);
  const [showLeafConnections, setShowLeafConnections] = useState(true);
  const [showPlacementMesh, setShowPlacementMesh] = useState(true);
  const [showMacros, setShowMacros] = useState(true);
  const [showIoCells, setShowIoCells] = useState(true);
  const [showPulseAnimation, setShowPulseAnimation] = useState(true);

  // Inspection Selection
  const [selectedElement, setSelectedElement] = useState<{
    type: 'macro' | 'sink' | 'buffer' | 'trunk' | 'clk_pad';
    data: any;
  } | null>(null);

  // How It Works Modal
  const [showWorkingModal, setShowWorkingModal] = useState(false);

  // Script Modal
  const [showTclModal, setShowTclModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Zoom & Pan for 2D CAD
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Synchronize when active component changes if in stage sync mode
  useEffect(() => {
    if (floorplanConfig && backendData.cells.length > 0) {
      // Keep prompt option ready
    }
  }, [activeIcId, activeComponentName]);

  // Handle Prompt Submission
  const handleApplyPrompt = (customText?: string) => {
    const text = customText !== undefined ? customText : promptInput;
    if (!text.trim()) return;

    setIsSynthesizing(true);
    setLastAppliedPrompt(text);

    setTimeout(() => {
      const newState = synthesizeClockTreeFromPrompt(text, floorplanConfig, backendData.cells);
      setCtsState(newState);
      setIsSynthesizing(false);
      setSelectedElement(null);
    }, 450);
  };

  // Preset Handlers
  const handleLoadReferencePreset = () => {
    setPromptInput('Reference 4-macro die layout with clock channels connecting placement cells from bottom CLK pad');
    setIsSynthesizing(true);
    setTimeout(() => {
      setCtsState(createReferencePicLayout({ targetSkew: ctsState.targetSkewPs, bufferType: ctsState.bufferType, frequencyMhz: ctsState.frequencyMhz }));
      setIsSynthesizing(false);
      setSelectedElement(null);
    }, 300);
  };

  const handleLoadHTreePreset = () => {
    setPromptInput('Symmetrical balanced H-Tree network for minimum clock skew across 4 macros');
    setIsSynthesizing(true);
    setTimeout(() => {
      setCtsState(createHTreeLayout(4, { targetSkew: 15, bufferType: ctsState.bufferType, frequencyMhz: ctsState.frequencyMhz }));
      setIsSynthesizing(false);
      setSelectedElement(null);
    }, 300);
  };

  const handleLoadMeshPreset = () => {
    setPromptInput('Ultra-low skew orthogonal clock mesh grid for high-speed multi-core layout');
    setIsSynthesizing(true);
    setTimeout(() => {
      setCtsState(createClockMeshLayout({ targetSkew: 8, bufferType: 'CLKBUF_X16', frequencyMhz: 1200 }));
      setIsSynthesizing(false);
      setSelectedElement(null);
    }, 300);
  };

  const handleLoadStageSync = () => {
    if (floorplanConfig && backendData.cells) {
      setPromptInput('Synchronize clock tree directly with Stage 1 Floorplan macros & Stage 3 Placement standard cells');
      setIsSynthesizing(true);
      setTimeout(() => {
        setCtsState(createSynchronizedStageLayout(floorplanConfig, backendData.cells, {
          targetSkew: ctsState.targetSkewPs,
          bufferType: ctsState.bufferType,
          frequencyMhz: ctsState.frequencyMhz
        }));
        setIsSynthesizing(false);
        setSelectedElement(null);
      }, 300);
    }
  };

  // Adjust Constraints Live
  const handleUpdateSkewTarget = (val: number) => {
    setCtsState(prev => ({
      ...prev,
      targetSkewPs: val,
      metrics: {
        ...prev.metrics,
        drcStatus: prev.metrics.maxSkewPs <= val ? 'PASS' : 'WARN'
      }
    }));
  };

  const handleUpdateBufferType = (buf: 'CLKBUF_X4' | 'CLKBUF_X8' | 'CLKBUF_X16') => {
    setCtsState(prev => {
      const delayMult = buf === 'CLKBUF_X16' ? 0.75 : buf === 'CLKBUF_X4' ? 1.25 : 1.0;
      return {
        ...prev,
        bufferType: buf,
        metrics: {
          ...prev.metrics,
          minLatencyPs: Math.round(prev.metrics.minLatencyPs * delayMult),
          maxLatencyPs: Math.round(prev.metrics.maxLatencyPs * delayMult),
          meanLatencyPs: Math.round(prev.metrics.meanLatencyPs * delayMult)
        }
      };
    });
  };

  const handleUpdateFrequency = (freq: number) => {
    setCtsState(prev => ({
      ...prev,
      frequencyMhz: freq,
      metrics: {
        ...prev.metrics,
        clockPowerMw: parseFloat(((prev.metrics.clockPowerMw * freq) / (prev.frequencyMhz || 500)).toFixed(1))
      }
    }));
  };

  const tclScript = useMemo(() => {
    return generateCtsTclScript(ctsState, activeComponentName.replace(/[^a-zA-Z0-9_]/g, '_'));
  }, [ctsState, activeComponentName]);

  const copyTcl = () => {
    navigator.clipboard.writeText(tclScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeIcId}_clock_tree_synthesis.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Color helper for latency heatmap
  const getLatencyColor = (delay: number) => {
    const min = ctsState.metrics.minLatencyPs;
    const max = ctsState.metrics.maxLatencyPs;
    const ratio = max > min ? (delay - min) / (max - min) : 0.5;
    // Green (low latency) -> Yellow (mid) -> Red (high latency)
    if (ratio < 0.5) {
      const r = Math.round(255 * (ratio * 2));
      return `rgb(${r}, 210, 60)`;
    } else {
      const g = Math.round(210 * (1 - (ratio - 0.5) * 2));
      return `rgb(245, ${g}, 40)`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111215] text-gray-200 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER & WORKFLOW BAR */}
      <div className="px-4 py-2.5 border-b border-white/10 bg-[#15171B] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
            <GitBranch size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                Backend Flow • Stage 4
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Clock Tree Synthesis (CTS) Studio
              </h2>
            </div>
            <p className="text-[11px] text-gray-400">
              Symmetrical clock routing channels, standard cell leaf connection & skew minimization for{' '}
              <span className="text-amber-400 font-semibold">{activeComponentName}</span>
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTclModal(true)}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-200 transition-all flex items-center space-x-1.5"
            title="View & copy OpenROAD TritonCTS TCL synthesis script"
          >
            <Download size={13} />
            <span>TCL Script</span>
          </button>

          <button
            onClick={exportSvg}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-200 transition-all flex items-center space-x-1.5"
            title="Export high-resolution vector SVG"
          >
            <Box size={13} />
            <span>Export SVG</span>
          </button>

          {onNavigateToNextStage && (
            <button
              onClick={onNavigateToNextStage}
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
              title="Proceed to Stage 5: Detailed Routing"
            >
              <span>Next: Routing ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. PROMPT-DRIVEN ADJUSTMENT BAR */}
      <div className="px-4 py-2 bg-[#181A1F] border-b border-white/10 shrink-0">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Natural Language Prompt Input */}
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3 text-amber-400">
              <Sparkles size={15} />
            </div>
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyPrompt();
              }}
              placeholder="Describe your clock tree & placement layout (e.g. '4 macros with fishbone clock connecting placement cells', 'H-tree low skew', 'clock mesh')..."
              className="w-full pl-9 pr-24 py-1.5 bg-black/40 border border-white/10 focus:border-amber-400 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all font-mono"
            />
            <button
              onClick={() => handleApplyPrompt()}
              disabled={isSynthesizing}
              className="absolute right-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-bold rounded-md text-[11px] flex items-center space-x-1 transition-all"
            >
              <RotateCcw size={11} className={isSynthesizing ? 'animate-spin' : ''} />
              <span>{isSynthesizing ? 'Synthesizing...' : 'Apply'}</span>
            </button>
          </div>

          {/* Quick Presets matching reference pic and core architectures */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 shrink-0 text-xs">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Presets:</span>
            
            <button
              onClick={handleLoadReferencePreset}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-medium transition-all whitespace-nowrap flex items-center space-x-1"
              title="Loads exact 4-macro die layout with central clock channels matching the reference image"
            >
              <span>🖼️ Reference Pic (4 Macros)</span>
            </button>

            <button
              onClick={handleLoadStageSync}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-md text-[11px] font-medium transition-all whitespace-nowrap flex items-center space-x-1"
              title="Synchronize clock network directly with Stage 1 Floorplan macros & Stage 3 Placement standard cells"
            >
              <span>🔄 Sync Previous Stages</span>
            </button>

            <button
              onClick={handleLoadHTreePreset}
              className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-md text-[11px] font-medium transition-all whitespace-nowrap flex items-center space-x-1"
              title="Symmetrical balanced H-Tree network for minimum clock skew"
            >
              <span>🌲 Symmetrical H-Tree</span>
            </button>

            <button
              onClick={handleLoadMeshPreset}
              className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-md text-[11px] font-medium transition-all whitespace-nowrap flex items-center space-x-1"
              title="High frequency orthogonal clock mesh grid for sub-10ps skew"
            >
              <span>🌐 Clock Mesh Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKBENCH: CANVAS (LEFT/CENTER) + INSPECTION & TUNING (RIGHT) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-0">
        
        {/* LEFT / CENTER VIEWPORT (Cols 1-8 / 9) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-[#0E0F12] border-r border-white/10 relative overflow-hidden">
          
          {/* Subheader: View Tabs & Layer Toggles */}
          <div className="px-4 py-2 border-b border-white/10 bg-[#141518] flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* View Mode Segmented Controls */}
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setViewTab('die_2d')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'die_2d'
                    ? 'bg-amber-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Compass size={13} />
                <span>2D Die (Ref)</span>
              </button>

              <button
                onClick={() => setViewTab('die_3d')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'die_3d'
                    ? 'bg-amber-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Box size={13} />
                <span>3D Silicon Studio</span>
              </button>

              <button
                onClick={() => setViewTab('tree_graph')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'tree_graph'
                    ? 'bg-amber-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Network size={13} />
                <span>Tree Hierarchy</span>
              </button>

              <button
                onClick={() => setViewTab('heatmap')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'heatmap'
                    ? 'bg-amber-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Flame size={13} />
                <span>Skew & Latency Heatmap</span>
              </button>

              <button
                onClick={() => setViewTab('waveform')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'waveform'
                    ? 'bg-amber-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Activity size={13} />
                <span>Clock Pulse Waveforms</span>
              </button>
            </div>

            {/* Quick Layer Visibility Controls */}
            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={() => setShowPulseAnimation(!showPulseAnimation)}
                className={`px-2 py-1 rounded border text-[11px] font-medium flex items-center space-x-1 transition-all ${
                  showPulseAnimation
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 text-gray-500 border-white/5'
                }`}
                title="Toggle animated clock wavefront propagation"
              >
                <Radio size={12} className={showPulseAnimation ? 'animate-pulse text-amber-400' : ''} />
                <span>Clock Pulse Wave</span>
              </button>

              <button
                onClick={() => setShowPlacementMesh(!showPlacementMesh)}
                className={`px-2 py-1 rounded border text-[11px] font-medium transition-all ${
                  showPlacementMesh
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                    : 'bg-black/30 text-gray-500 border-white/5'
                }`}
                title="Toggle Standard Cell Placement Mesh"
              >
                <span>Placement Mesh</span>
              </button>

              <button
                onClick={() => setShowBuffers(!showBuffers)}
                className={`px-2 py-1 rounded border text-[11px] font-medium transition-all ${
                  showBuffers
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 text-gray-500 border-white/5'
                }`}
                title="Toggle Clock Buffers / Repeaters"
              >
                <span>Repeaters</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 pl-2 border-l border-white/10">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
                  className="px-1.5 py-0.5 bg-black/40 hover:bg-black/60 rounded border border-white/10 text-gray-300 text-xs"
                >
                  -
                </button>
                <span className="text-[10px] font-mono text-gray-400 w-8 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
                  className="px-1.5 py-0.5 bg-black/40 hover:bg-black/60 rounded border border-white/10 text-gray-300 text-xs"
                >
                  +
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-1.5 py-0.5 bg-black/40 hover:bg-black/60 rounded border border-white/10 text-gray-400 hover:text-white text-[10px]"
                >
                  1:1
                </button>
              </div>
            </div>
          </div>

          {/* VIEW TAB 1: 2D SILICON DIE (EXACT REFERENCE PIC ARCHITECTURE) */}
          {viewTab === 'die_2d' && (
            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto bg-[#17181C] relative">
              
              {/* Scalable Container matching reference aspect ratio */}
              <div 
                className="w-full max-w-[560px] bg-[#1E2025] rounded-xl border border-white/15 p-4 shadow-2xl relative flex flex-col items-center transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
              >
                {/* 1. Header: "DIE AREA" in bold text (like reference image) */}
                <div className="text-center font-bold tracking-widest text-slate-300 text-base md:text-lg uppercase pb-2 select-none">
                  DIE AREA
                </div>

                {/* 2. Main Die Canvas with I/O Cells and Inside Contents */}
                <div className="relative w-full flex items-stretch">
                  
                  {/* Left Vertical Label: "I/O CELLS" (like reference image) */}
                  <div className="w-8 flex items-center justify-center select-none pr-1">
                    <span 
                      className="font-bold text-slate-400 tracking-wider text-xs md:text-sm uppercase whitespace-nowrap"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      I/O CELLS
                    </span>
                  </div>

                  {/* Silicon Boundary SVG */}
                  <div className="flex-1 relative bg-[#17181C] rounded-lg border border-slate-700/80 overflow-hidden shadow-inner">
                    <svg
                      ref={svgRef}
                      viewBox="0 0 540 640"
                      className="w-full h-auto select-none block"
                    >
                      <defs>
                        {/* Standard Cell Mesh / Hash Pattern (Yellow/Cream hatched grid like reference) */}
                        <pattern id="coreMeshPattern" width="6" height="6" patternUnits="userSpaceOnUse">
                          <rect width="6" height="6" fill="#FDF6B2" />
                          <line x1="0" y1="0" x2="6" y2="0" stroke="#78716C" strokeWidth="0.5" strokeOpacity="0.45" />
                          <line x1="0" y1="0" x2="0" y2="6" stroke="#78716C" strokeWidth="0.5" strokeOpacity="0.45" />
                        </pattern>

                        <pattern id="ioPadPattern" width="16" height="16" patternUnits="userSpaceOnUse">
                          <rect width="16" height="16" fill="#334155" stroke="#475569" strokeWidth="1" />
                        </pattern>

                        {/* Animated Wavefront Glow Filter */}
                        <filter id="clockGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* DIE BACKGROUND */}
                      <rect x="2" y="2" width="536" height="636" fill="#1C1E23" />

                      {/* I/O CELL RING (Border Perimeter Pads) */}
                      {showIoCells && (
                        <g id="io_ring">
                          {/* Outer border line */}
                          <rect x="10" y="10" width="520" height="610" fill="none" stroke="#475569" strokeWidth="2" />
                          {/* Top IO pads */}
                          {Array.from({ length: 18 }).map((_, i) => (
                            <rect key={`io_top_${i}`} x={25 + i * 28} y="11" width="18" height="14" fill="#334155" stroke="#64748B" strokeWidth="0.8" rx="1" />
                          ))}
                          {/* Bottom IO pads */}
                          {Array.from({ length: 18 }).map((_, i) => (
                            <rect key={`io_bot_${i}`} x={25 + i * 28} y="605" width="18" height="14" fill="#334155" stroke="#64748B" strokeWidth="0.8" rx="1" />
                          ))}
                          {/* Left IO pads */}
                          {Array.from({ length: 20 }).map((_, i) => (
                            <rect key={`io_left_${i}`} x="11" y={28 + i * 28} width="14" height="18" fill="#334155" stroke="#64748B" strokeWidth="0.8" rx="1" />
                          ))}
                          {/* Right IO pads */}
                          {Array.from({ length: 20 }).map((_, i) => (
                            <rect key={`io_right_${i}`} x="515" y={28 + i * 28} width="14" height="18" fill="#334155" stroke="#64748B" strokeWidth="0.8" rx="1" />
                          ))}
                        </g>
                      )}

                      {/* CORE AREA PLACEMENT REGIONS (The yellow hatched mesh grids from reference) */}
                      {showPlacementMesh && (
                        <g id="core_placement_areas">
                          {ctsState.placementAreas.map((area) => (
                            <g key={area.id}>
                              {/* Background hatched mesh grid */}
                              <rect
                                x={area.x}
                                y={area.y}
                                width={area.width}
                                height={area.height}
                                fill="url(#coreMeshPattern)"
                                stroke="#78716C"
                                strokeWidth="1.2"
                              />

                              {/* Label if CORE AREA */}
                              {area.label === 'CORE AREA' && (
                                <g>
                                  <rect
                                    x={area.x + area.width * 0.18}
                                    y={area.y + area.height * 0.25}
                                    width={area.width * 0.64}
                                    height={area.height * 0.5}
                                    fill="#F3F4F6"
                                    stroke="#475569"
                                    strokeWidth="1.5"
                                    rx="2"
                                  />
                                  <text
                                    x={area.x + area.width * 0.5}
                                    y={area.y + area.height * 0.58}
                                    fill="#1E293B"
                                    fontSize="14"
                                    fontWeight="800"
                                    textAnchor="middle"
                                    letterSpacing="1"
                                  >
                                    CORE AREA
                                  </text>
                                </g>
                              )}
                            </g>
                          ))}
                        </g>
                      )}

                      {/* CLOCK ROUTING NETWORK (Thick Vibrant Orange Channels #F59E0B like reference) */}
                      {showTrunks && (
                        <g id="clock_network">
                          {/* Major Clock Trunks & Spines */}
                          {ctsState.clockWires
                            .filter((w) => w.level <= 1)
                            .map((wire) => {
                              const isSelected = selectedElement?.data?.id === wire.id;
                              return (
                                <g key={wire.id}>
                                  {/* Wire line */}
                                  <line
                                    x1={wire.from.x}
                                    y1={wire.from.y}
                                    x2={wire.to.x}
                                    y2={wire.to.y}
                                    stroke={wire.color || '#F59E0B'}
                                    strokeWidth={wire.width}
                                    strokeLinecap="square"
                                    onClick={() => setSelectedElement({ type: 'trunk', data: wire })}
                                    className="cursor-pointer hover:opacity-90"
                                  />

                                  {/* Animated Wavefront Pulse */}
                                  {showPulseAnimation && (
                                    <line
                                      x1={wire.from.x}
                                      y1={wire.from.y}
                                      x2={wire.to.x}
                                      y2={wire.to.y}
                                      stroke="#FEF08A"
                                      strokeWidth={Math.max(2, wire.width * 0.35)}
                                      strokeDasharray="10 20"
                                      className="animate-pulse pointer-events-none"
                                    />
                                  )}
                                </g>
                              );
                            })}

                          {/* Secondary Distribution Ribs */}
                          {showBranches &&
                            ctsState.clockWires
                              .filter((w) => w.level === 2)
                              .map((wire) => (
                                <line
                                  key={wire.id}
                                  x1={wire.from.x}
                                  y1={wire.from.y}
                                  x2={wire.to.x}
                                  y2={wire.to.y}
                                  stroke={wire.color || '#F59E0B'}
                                  strokeWidth={wire.width}
                                  strokeLinecap="round"
                                />
                              ))}

                          {/* Leaf Connections to Placement Cells */}
                          {showLeafConnections &&
                            ctsState.clockWires
                              .filter((w) => w.level === 3)
                              .map((wire) => (
                                <line
                                  key={wire.id}
                                  x1={wire.from.x}
                                  y1={wire.from.y}
                                  x2={wire.to.x}
                                  y2={wire.to.y}
                                  stroke="#F59E0B"
                                  strokeWidth="1.4"
                                  strokeDasharray="2 2"
                                  strokeOpacity="0.8"
                                />
                              ))}
                        </g>
                      )}

                      {/* CLOCK BUFFERS / REPEATERS */}
                      {showBuffers && (
                        <g id="clock_buffers">
                          {ctsState.clockBuffers.map((buf) => (
                            <g
                              key={buf.id}
                              onClick={() => {
                                setSelectedElement({ type: 'buffer', data: buf });
                                setShowWorkingModal(true);
                              }}
                              className="cursor-pointer hover:scale-110 transition-transform"
                            >
                              {/* Buffer Triangle icon */}
                              <polygon
                                points={`${buf.x - 7},${buf.y - 6} ${buf.x + 7},${buf.y - 6} ${buf.x},${buf.y + 8}`}
                                fill="#EA580C"
                                stroke="#FFFFFF"
                                strokeWidth="1"
                              />
                            </g>
                          ))}
                        </g>
                      )}

                      {/* MACRO BLOCKS (Large Grey Rectangles like reference) */}
                      {showMacros && (
                        <g id="macros">
                          {ctsState.macros.map((m) => {
                            const isSelected = selectedElement?.data?.id === m.id;
                            return (
                              <g
                                key={m.id}
                                onClick={() => {
                                  setSelectedElement({ type: 'macro', data: m });
                                  setShowWorkingModal(true);
                                }}
                                className="cursor-pointer group"
                              >
                                {/* Macro Body */}
                                <rect
                                  x={m.x}
                                  y={m.y}
                                  width={m.width}
                                  height={m.height}
                                  fill="#D1D5DB"
                                  stroke={isSelected ? '#38BDF8' : '#64748B'}
                                  strokeWidth={isSelected ? 3 : 1.5}
                                  rx="1"
                                  className="transition-all"
                                />

                                {/* Macro Inner Border */}
                                <rect
                                  x={m.x + 4}
                                  y={m.y + 4}
                                  width={m.width - 8}
                                  height={m.height - 8}
                                  fill="none"
                                  stroke="#94A3B8"
                                  strokeWidth="0.8"
                                />

                                {/* Macro Name Header (Clean Bold Text like reference) */}
                                <text
                                  x={m.x + m.width / 2}
                                  y={m.y + m.height / 2 + 6}
                                  fill="#1F2937"
                                  fontSize="20"
                                  fontWeight="900"
                                  textAnchor="middle"
                                  letterSpacing="1.5"
                                  className="select-none pointer-events-none font-bold"
                                >
                                  {m.name}
                                </text>

                                {/* Clock Pin on Macro */}
                                <circle
                                  cx={m.clockPin.x}
                                  cy={m.clockPin.y}
                                  r="4"
                                  fill="#F59E0B"
                                  stroke="#FFFFFF"
                                  strokeWidth="1.2"
                                />
                                <text
                                  x={m.clockPin.x}
                                  y={m.clockPin.y - 6}
                                  fill="#475569"
                                  fontSize="8"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  CLK PIN
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      )}

                      {/* STANDARD CELL SINKS (Registers / DFFs in core rows) */}
                      <g id="cell_sinks">
                        {ctsState.sinks
                          .filter((s) => s.type === 'cell')
                          .map((sink) => {
                            const isSelected = selectedElement?.data?.id === sink.id;
                            return (
                              <g
                                key={sink.id}
                                onClick={() => {
                                  setSelectedElement({ type: 'sink', data: sink });
                                  setShowWorkingModal(true);
                                }}
                                className="cursor-pointer group"
                              >
                                <rect
                                  x={sink.x - 3.5}
                                  y={sink.y - 3.5}
                                  width="7"
                                  height="7"
                                  fill={isSelected ? '#38BDF8' : '#7C3AED'}
                                  stroke="#FFFFFF"
                                  strokeWidth="0.8"
                                  rx="1"
                                />
                              </g>
                            );
                          })}
                      </g>

                      {/* CLOCK ROOT PAD (Bottom "CLK" Pad like reference image) */}
                      <g
                        id="clk_root_pad"
                        onClick={() => {
                          setSelectedElement({
                            type: 'clk_pad',
                            data: {
                              location: ctsState.clkPadLocation,
                              pos: ctsState.clkPadPos,
                              frequencyMhz: ctsState.frequencyMhz
                            }
                          });
                          setShowWorkingModal(true);
                        }}
                        className="cursor-pointer"
                      >
                        <rect
                          x={ctsState.clkPadPos.x - 20}
                          y={ctsState.clkPadPos.y}
                          width="40"
                          height="22"
                          fill="#D97706"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                          rx="2"
                        />
                        <circle cx={ctsState.clkPadPos.x} cy={ctsState.clkPadPos.y + 11} r="4" fill="#FFFFFF" />
                      </g>
                    </svg>
                  </div>
                </div>

                {/* 3. Bottom Section: "CLK" Label and "CLOCK TREE SYNTHESIS" Banner (like reference) */}
                <div className="w-full pt-2 flex flex-col items-center select-none">
                  {/* "CLK" text pointing to pad */}
                  <div className="text-center font-bold text-slate-300 text-sm tracking-wider uppercase mb-1">
                    CLK
                  </div>

                  {/* "CLOCK TREE SYNTHESIS" High-Contrast Orange/Amber Banner */}
                  <div className="w-full bg-[#EA580C] hover:bg-[#F97316] transition-colors rounded-lg py-3 px-4 shadow-lg flex items-center justify-center border border-amber-400/40">
                    <span className="text-white font-extrabold text-lg md:text-xl tracking-wider text-center uppercase drop-shadow-sm font-sans">
                      CLOCK TREE SYNTHESIS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB: 3D INTERACTIVE SILICON DIE STUDIO */}
          {viewTab === 'die_3d' && (
            <div className="flex-1 w-full min-h-[550px] h-full relative overflow-hidden bg-[#0D0E11] flex flex-col">
              <CTS3DViewer
                ctsState={ctsState}
                selectedElement={selectedElement}
                onSelectElement={(elem) => {
                  setSelectedElement(elem);
                  if (elem) setShowWorkingModal(true);
                }}
                showBuffers={showBuffers}
                showPlacementMesh={showPlacementMesh}
                showPulseAnimation={showPulseAnimation}
              />
            </div>
          )}

          {/* VIEW TAB 2: CLOCK TREE GRAPH HIERARCHY */}
          {viewTab === 'tree_graph' && (
            <div className="flex-1 flex flex-col p-6 overflow-auto bg-[#131417]">
              <div className="max-w-3xl mx-auto w-full space-y-6">
                <div className="bg-[#1C1E23] p-4 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Network size={14} className="text-amber-400" />
                      <span>Clock Distribution Hierarchy Graph ({ctsState.topology.toUpperCase()})</span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Root: CLK_PAD (500 MHz)
                    </span>
                  </div>

                  {/* Hierarchical Tree Nodes */}
                  <div className="space-y-4 pt-2">
                    {/* Level 0: Root */}
                    <div className="flex flex-col items-center">
                      <div className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg text-xs shadow-md border border-amber-300 flex items-center gap-1.5">
                        <Radio size={14} />
                        <span>CLK_ROOT [Pad @ Bottom Core]</span>
                      </div>
                      <div className="w-0.5 h-6 bg-amber-500/50" />
                    </div>

                    {/* Level 1: Major Trunks & Buffers */}
                    <div className="flex justify-center gap-8">
                      <div className="flex flex-col items-center">
                        <div className="px-3 py-1.5 bg-[#252830] border border-amber-500/40 rounded-lg text-xs font-semibold text-amber-300 flex items-center gap-1">
                          <Zap size={12} className="text-amber-400" />
                          <span>Spine Trunk West ({ctsState.bufferType})</span>
                        </div>
                        <div className="w-0.5 h-5 bg-white/20" />
                        
                        {/* Sub-branches */}
                        <div className="flex gap-2">
                          <div className="p-2 bg-black/40 rounded border border-white/10 text-[10px] text-gray-300 text-center">
                            <span className="font-bold text-white block">Top-Left Macro</span>
                            <span className="text-amber-400 font-mono">148 ps</span>
                          </div>
                          <div className="p-2 bg-black/40 rounded border border-white/10 text-[10px] text-gray-300 text-center">
                            <span className="font-bold text-white block">Bot-Left Macro</span>
                            <span className="text-amber-400 font-mono">142 ps</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="px-3 py-1.5 bg-[#252830] border border-amber-500/40 rounded-lg text-xs font-semibold text-amber-300 flex items-center gap-1">
                          <Zap size={12} className="text-amber-400" />
                          <span>Spine Trunk East ({ctsState.bufferType})</span>
                        </div>
                        <div className="w-0.5 h-5 bg-white/20" />
                        
                        {/* Sub-branches */}
                        <div className="flex gap-2">
                          <div className="p-2 bg-black/40 rounded border border-white/10 text-[10px] text-gray-300 text-center">
                            <span className="font-bold text-white block">Top-Right Macro</span>
                            <span className="text-amber-400 font-mono">152 ps</span>
                          </div>
                          <div className="p-2 bg-black/40 rounded border border-white/10 text-[10px] text-gray-300 text-center">
                            <span className="font-bold text-white block">Bot-Right Macro</span>
                            <span className="text-amber-400 font-mono">146 ps</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Level 2: Core Area Placement Leaf Sinks */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-[11px] font-bold text-gray-400 uppercase mb-2">
                        Placement Standard Cell Sinks ({ctsState.sinks.length} Sinks Total):
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {ctsState.sinks.slice(0, 8).map((s) => (
                          <div key={s.id} className="p-2 bg-black/30 rounded border border-white/5 flex flex-col">
                            <span className="font-mono font-bold text-white truncate">{s.name}</span>
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                              <span>Arrival:</span>
                              <span className="text-amber-400 font-mono">{s.arrivalDelayPs} ps</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>Skew:</span>
                              <span className="text-emerald-400 font-mono">{s.skewOffsetPs >= 0 ? `+${s.skewOffsetPs}` : s.skewOffsetPs} ps</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 3: SKEW & LATENCY HEATMAP */}
          {viewTab === 'heatmap' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto bg-[#121316]">
              <div className="max-w-md w-full bg-[#1C1E23] p-5 rounded-2xl border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Flame size={16} className="text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Silicon Clock Arrival Time Heatmap
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Max Skew: {ctsState.metrics.maxSkewPs} ps
                  </span>
                </div>

                {/* Heatmap Matrix */}
                <div className="grid grid-cols-4 gap-2.5 p-3 bg-black/50 rounded-xl border border-white/5">
                  {ctsState.sinks.slice(0, 16).map((s, idx) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-lg border border-black/30 flex flex-col items-center justify-center transition-all hover:scale-105"
                      style={{ backgroundColor: getLatencyColor(s.arrivalDelayPs) }}
                    >
                      <span className="text-[10px] font-bold text-black font-mono truncate w-full text-center">
                        {s.name.replace('sink_', '')}
                      </span>
                      <span className="text-xs font-black text-black font-mono">
                        {s.arrivalDelayPs} ps
                      </span>
                    </div>
                  ))}
                </div>

                {/* Color Legend */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Fast Arrival ({ctsState.metrics.minLatencyPs} ps)</span>
                    <span>Slow Arrival ({ctsState.metrics.maxLatencyPs} ps)</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500" />
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 4: TIMING WAVEFORMS & JITTER */}
          {viewTab === 'waveform' && (
            <div className="flex-1 flex flex-col p-6 overflow-auto bg-[#121316]">
              <div className="max-w-2xl mx-auto w-full bg-[#1C1E23] p-5 rounded-2xl border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Activity size={16} className="text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Clock Waveform Edge Skew Comparator
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Period: 2.000 ns (500 MHz)</span>
                </div>

                {/* SVG Digital Waveform Alignment */}
                <div className="p-4 bg-black/60 rounded-xl border border-white/5 space-y-4">
                  {/* Reference Clock at Pad */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400 font-mono">CLK_IN_PAD (Reference Edge 0.0 ps)</span>
                      <span className="text-cyan-400 font-mono">0.0 ps</span>
                    </div>
                    <svg viewBox="0 0 500 24" className="w-full h-6 block">
                      <path d="M 0,20 L 50,20 L 50,4 L 150,4 L 150,20 L 250,20 L 250,4 L 350,4 L 350,20 L 450,20 L 450,4 L 500,4" fill="none" stroke="#38BDF8" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Earliest Sink */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400 font-mono">Earliest Sink ({ctsState.sinks[0]?.name || 'SINK_MIN'})</span>
                      <span className="text-emerald-400 font-mono">+{ctsState.metrics.minLatencyPs} ps</span>
                    </div>
                    <svg viewBox="0 0 500 24" className="w-full h-6 block">
                      <path d="M 0,20 L 68,20 L 68,4 L 168,4 L 168,20 L 268,20 L 268,4 L 368,4 L 368,20 L 468,20 L 468,4 L 500,4" fill="none" stroke="#34D399" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Latest Sink */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400 font-mono">Latest Sink ({ctsState.sinks[ctsState.sinks.length - 1]?.name || 'SINK_MAX'})</span>
                      <span className="text-amber-400 font-mono">+{ctsState.metrics.maxLatencyPs} ps</span>
                    </div>
                    <svg viewBox="0 0 500 24" className="w-full h-6 block">
                      <path d="M 0,20 L 80,20 L 80,4 L 180,4 L 180,20 L 280,20 L 280,4 L 380,4 L 380,20 L 480,20 L 480,4 L 500,4" fill="none" stroke="#FBBF24" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* Skew Slack Analysis */}
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs flex items-center justify-between">
                  <span className="text-gray-300">Clock Skew Spread (Max - Min):</span>
                  <span className="font-mono font-bold text-amber-400">{ctsState.metrics.maxSkewPs} ps</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INSPECTOR & CTS CONSTRAINTS TUNING (Cols 9-12 / 3-4) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col bg-[#15171B] border-t lg:border-t-0 border-white/10 overflow-y-auto p-4 space-y-4">
          
          {/* 1. CTS Performance Summary Cards */}
          <div className="bg-[#1C1E23] rounded-2xl border border-white/10 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-amber-400" />
                <span>CTS Sign-off Metrics</span>
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                ctsState.metrics.drcStatus === 'PASS'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {ctsState.metrics.drcStatus} (Target &le; {ctsState.targetSkewPs}ps)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Max Clock Skew</div>
                <div className="text-base font-bold text-amber-400 font-mono">
                  {ctsState.metrics.maxSkewPs} ps
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Total Clock Buffers</div>
                <div className="text-base font-bold text-white font-mono">
                  {ctsState.clockBuffers.length} Cells
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Min Latency</div>
                <div className="text-xs font-bold text-gray-300 font-mono">
                  {ctsState.metrics.minLatencyPs} ps
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Max Latency</div>
                <div className="text-xs font-bold text-gray-300 font-mono">
                  {ctsState.metrics.maxLatencyPs} ps
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Total Wirelength</div>
                <div className="text-xs font-bold text-gray-300 font-mono">
                  {ctsState.metrics.totalWirelengthUm} µm
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Clock Power</div>
                <div className="text-xs font-bold text-amber-400 font-mono">
                  {ctsState.metrics.clockPowerMw} mW
                </div>
              </div>
            </div>
          </div>

          {/* 2. Interactive Element Inspector */}
          <div className="bg-[#1C1E23] rounded-2xl border border-white/10 p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Info size={13} className="text-amber-400" />
                <span>Element Inspector</span>
              </span>
              {selectedElement && (
                <button
                  onClick={() => setSelectedElement(null)}
                  className="text-[10px] text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </h4>

            {selectedElement ? (
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-[10px] uppercase font-bold text-amber-400">
                    {selectedElement.type.toUpperCase()}
                  </span>
                  <span className="font-mono text-white font-bold">
                    {selectedElement.data?.name || selectedElement.data?.id || 'CLK'}
                  </span>
                </div>

                {selectedElement.type === 'macro' && (
                  <div className="space-y-1 text-gray-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dimensions:</span>
                      <span className="font-mono">{selectedElement.data.width} × {selectedElement.data.height} µm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Clock Pin:</span>
                      <span className="font-mono text-amber-400">{selectedElement.data.clockPin?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Clock Latency:</span>
                      <span className="font-mono">{selectedElement.data.arrivalDelayPs} ps</span>
                    </div>
                  </div>
                )}

                {selectedElement.type === 'sink' && (
                  <div className="space-y-1 text-gray-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pin:</span>
                      <span className="font-mono text-cyan-400">{selectedElement.data.pinName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Arrival Delay:</span>
                      <span className="font-mono text-amber-400">{selectedElement.data.arrivalDelayPs} ps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Skew Offset:</span>
                      <span className="font-mono">{selectedElement.data.skewOffsetPs} ps</span>
                    </div>
                  </div>
                )}

                {selectedElement.type === 'buffer' && (
                  <div className="space-y-1 text-gray-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cell Type:</span>
                      <span className="font-mono text-amber-400">{selectedElement.data.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Internal Delay:</span>
                      <span className="font-mono">{selectedElement.data.delayPs} ps</span>
                    </div>
                  </div>
                )}

                {selectedElement.type === 'trunk' && (
                  <div className="space-y-1 text-gray-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Layer:</span>
                      <span className="font-mono text-amber-400">Metal 5 (Thick Clock Spine)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Width:</span>
                      <span className="font-mono">{selectedElement.data.width} µm</span>
                    </div>
                  </div>
                )}

                {selectedElement.type === 'clk_pad' && (
                  <div className="space-y-1 text-gray-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pad Position:</span>
                      <span className="font-mono text-amber-400">Bottom Core I/O</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Clock Source:</span>
                      <span className="font-mono">500 MHz PLL / Oscillator</span>
                    </div>
                  </div>
                )}

                {/* View How It Works Button */}
                <button
                  onClick={() => setShowWorkingModal(true)}
                  className="w-full mt-2 py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <Sparkles size={13} className="text-amber-400" />
                  <span>How This Block Works ➔</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-[11px] text-gray-500 text-center">
                Click any Macro, Standard Cell, Buffer, or Clock Spine in the layout to inspect detailed timing & parameters.
              </div>
            )}
          </div>

          {/* 3. CTS Constraints Tuning */}
          <div className="bg-[#1C1E23] rounded-2xl border border-white/10 p-4 space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={13} className="text-amber-400" />
              <span>Synthesis Constraints</span>
            </h4>

            {/* Target Skew */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Target Skew Constraint</span>
                <span className="font-mono text-amber-400 font-bold">{ctsState.targetSkewPs} ps</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={ctsState.targetSkewPs}
                onChange={(e) => handleUpdateSkewTarget(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/40 rounded-lg"
              />
            </div>

            {/* Clock Frequency */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Clock Frequency</span>
                <span className="font-mono text-cyan-400 font-bold">{ctsState.frequencyMhz} MHz</span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={ctsState.frequencyMhz}
                onChange={(e) => handleUpdateFrequency(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-black/40 rounded-lg"
              />
            </div>

            {/* Buffer Library Type */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-400">Clock Buffer Cell Drive:</span>
              <div className="grid grid-cols-3 gap-1">
                {(['CLKBUF_X4', 'CLKBUF_X8', 'CLKBUF_X16'] as const).map((buf) => (
                  <button
                    key={buf}
                    onClick={() => handleUpdateBufferType(buf)}
                    className={`py-1 text-[10px] font-mono rounded border transition-all ${
                      ctsState.bufferType === buf
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm'
                        : 'bg-black/30 text-gray-400 border-white/5 hover:border-white/15'
                    }`}
                  >
                    {buf.replace('CLKBUF_', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TCL SCRIPT MODAL */}
      {showTclModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#17191E] border border-white/10 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <FileCode size={18} className="text-amber-400" />
                <span>OpenROAD TritonCTS & Cadence Innovus Script</span>
              </div>
              <button
                onClick={() => setShowTclModal(false)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <pre className="p-3 bg-black/60 rounded-xl border border-white/5 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-[360px]">
              {tclScript}
            </pre>

            <div className="flex justify-end space-x-2">
              <button
                onClick={copyTcl}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-md"
              >
                <Copy size={13} />
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Script'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. HOW IT WORKS INTERACTIVE MODAL ON BLOCK CLICK */}
      {showWorkingModal && selectedElement && (
        <BlockWorkingModal
          element={selectedElement}
          onClose={() => setShowWorkingModal(false)}
          frequencyMhz={ctsState.frequencyMhz}
        />
      )}
    </div>
  );
}

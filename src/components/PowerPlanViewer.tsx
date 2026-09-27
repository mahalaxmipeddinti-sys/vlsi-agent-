import React, { useState, useRef } from 'react';
import { 
  FloorplanConfig, 
  PowerPlanConfig, 
  MetalLayer 
} from '../types/physicalDesign';
import { 
  simulatePowerGrid, 
  generateOpenRoadFloorplanTcl, 
  generateInnovusTcl 
} from '../utils/physicalDesignEngine';
import { PowerPlan3DViewer } from './PowerPlan3DViewer';
import { SiliconProfile2DViewer } from './SiliconProfile2DViewer';
import { PowerCircuitDetailView, getPdnDetail } from './PowerCircuiteDetailView';
import { 
  Zap, 
  Layers, 
  Sliders, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  Copy, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Thermometer,
  Grid,
  Box,
  Maximize2,
  Compass,
  Ruler,
  MousePointer,
  HelpCircle,
  Sparkles,
  Info,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  SplitSquareVertical,
  Crosshair,
  Move
} from 'lucide-react';

interface PowerPlanViewerProps {
  floorplan: FloorplanConfig;
  powerPlan: PowerPlanConfig;
  onChangePowerPlan: (newConfig: PowerPlanConfig) => void;
  activeIcId?: string;
  activeComponentName?: string;
}

export function PowerPlanViewer({ 
  floorplan, 
  powerPlan, 
  onChangePowerPlan,
  activeIcId = '7476',
  activeComponentName = 'SN7476 Dual J-K Flip-Flop'
}: PowerPlanViewerProps) {
  // View mode switcher: Professional 2D CAD layout, 2D Silicon Profile, 3D Silicon Stack, or Split View
  const [viewMode, setViewMode] = useState<'cad2d' | 'profile2d' | '3d' | 'split'>('cad2d');

  // Layer visibility toggles
  const [showRings, setShowRings] = useState(true);
  const [showVStraps, setShowVStraps] = useState(true);
  const [showHStraps, setShowHStraps] = useState(true);
  const [showTrunks, setShowTrunks] = useState(true);
  const [showRails, setShowRails] = useState(true);
  const [showVias, setShowVias] = useState(true);
  const [showMacros, setShowMacros] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showCallouts, setShowCallouts] = useState(true);
  const [activeCadTool, setActiveCadTool] = useState<'select' | 'ruler' | 'probe' | 'pan'>('select');

  // Zoom scale state for professional 2D canvas
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  // Selection & Right Inspector states
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'inspector' | 'settings'>('inspector');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Interactive mouse coordinate tracking
  const [mouseCoord, setMouseCoord] = useState<{ x: number; y: number }>({ x: 1092.834, y: 822.033 });

  // Ruler measurement tool state
  const [rulerPoints, setRulerPoints] = useState<{ x: number; y: number }[]>([]);
  const [measuredDist, setMeasuredDist] = useState<number | null>(null);

  // Script Modal state
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptType, setScriptType] = useState<'openroad' | 'innovus'>('openroad');
  const [copied, setCopied] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Run Real-time Power Grid IR Drop Simulation
  const simulation = simulatePowerGrid(floorplan, powerPlan);

  const coreW = floorplan.dieWidth - floorplan.coreMarginLeft - floorplan.coreMarginRight;
  const coreH = floorplan.dieHeight - floorplan.coreMarginTop - floorplan.coreMarginBottom;

  const handleUpdate = (field: keyof PowerPlanConfig, value: any) => {
    onChangePowerPlan({
      ...powerPlan,
      [field]: value
    });
  };

  const handleSelectElement = (element: any) => {
    setSelectedElement(element);
    setRightPanelTab('inspector');
    setIsRightPanelOpen(true);
  };

  const handleCopyScript = () => {
    const script = scriptType === 'openroad'
      ? generateOpenRoadFloorplanTcl(floorplan, powerPlan)
      : generateInnovusTcl(floorplan, powerPlan);
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mouse move handler on SVG to track exact layout coordinates
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = floorplan.dieWidth / rect.width;
    const scaleY = floorplan.dieHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setMouseCoord({ x, y });

    // If measuring with ruler
    if (rulerPoints.length === 1) {
      const dx = x - rulerPoints[0].x;
      const dy = y - rulerPoints[0].y;
      setMeasuredDist(Math.hypot(dx, dy));
    }
  };

  const handleSvgClick = (e: React.MouseEvent<any>) => {
    if (activeCadTool === 'ruler') {
      if (rulerPoints.length === 0) {
        setRulerPoints([{ x: mouseCoord.x, y: mouseCoord.y }]);
      } else {
        const dx = mouseCoord.x - rulerPoints[0].x;
        const dy = mouseCoord.y - rulerPoints[0].y;
        setMeasuredDist(Math.hypot(dx, dy));
        setRulerPoints([...rulerPoints, { x: mouseCoord.x, y: mouseCoord.y }]);
      }
    }
  };

  const handleCanvasBackgroundClick = (e: React.MouseEvent<any>) => {
    if (activeCadTool === 'ruler') {
      handleSvgClick(e);
    } else {
      // Clear selection to restore full unobstructed 2D view
      setSelectedElement(null);
    }
  };

  // Selection check helper
  const isElementSelected = (keyword: string) => {
    if (!selectedElement || !selectedElement.name) return false;
    return selectedElement.name.toUpperCase().includes(keyword.toUpperCase());
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#08090d] text-gray-200 select-none overflow-hidden">
      {/* Top Banner Toolbar */}
      <div className="p-3 bg-[#111318] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Zap size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100 font-mono">Power Plan Studio (PDN)</h2>
          </div>
          
          <span className="text-xs px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold font-mono flex items-center space-x-1.5">
            <Layers size={12} className="text-cyan-400" />
            <span>{activeComponentName}</span>
          </span>

          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            {powerPlan.corePowerNets.vdd} ({powerPlan.supplyVoltage.toFixed(2)}V) / {powerPlan.corePowerNets.vss} (0V)
          </span>

          {/* IR Drop Status Badge */}
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
            simulation.isDrcPass
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
          }`}>
            {simulation.isDrcPass ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>Max IR Drop: {simulation.maxDropPercent.toFixed(2)}% ({simulation.maxDropMv.toFixed(1)} mV)</span>
          </div>
        </div>

        {/* View Switcher: Professional 2D CAD vs 2D Profile vs 3D Option vs Split */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-black/60 p-1 rounded-lg border border-white/10 text-xs">
            {/* 2D CAD Layout */}
            <button
              onClick={() => setViewMode('cad2d')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                viewMode === 'cad2d'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Professional 2D CAD Physical Layout"
            >
              <Compass size={13} />
              <span>2D CAD Layout</span>
            </button>

            {/* 2D Silicon Profile (Cross-Section) */}
            <button
              onClick={() => setViewMode('profile2d')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'profile2d'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
              title="2D Vertical Silicon Cross-Section Depth Profile"
            >
              <Layers size={13} />
              <span>2D Silicon Profile</span>
            </button>

            {/* 3D Option */}
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === '3d'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-blue-400 hover:text-blue-300'
              }`}
              title="Interactive 3D Silicon Stack View"
            >
              <Box size={13} />
              <span>3D Option</span>
            </button>

            {/* Split View */}
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1.5 rounded-md font-mono text-xs transition-all flex items-center space-x-1 ${
                viewMode === 'split'
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Split View (2D CAD + 3D Option)"
            >
              <SplitSquareVertical size={13} />
              <span className="hidden sm:inline">Split</span>
            </button>
          </div>

          {/* Callouts Overlay Toggle */}
          <button
            onClick={() => setShowCallouts(!showCallouts)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition-colors ${
              showCallouts 
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
            title="Toggle EDA Callouts (Rings, Straps, Pad Trunks)"
          >
            <Sparkles size={13} />
            <span className="hidden md:inline">EDA Callouts</span>
          </button>

          {/* Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border flex items-center space-x-1.5 transition-colors ${
              showHeatmap 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                : 'bg-[#1A1C20] text-gray-400 border-white/10 hover:text-gray-200'
            }`}
          >
            <Thermometer size={13} />
            <span className="hidden md:inline">{showHeatmap ? 'Heatmap On' : 'IR Heatmap'}</span>
          </button>

          {/* Export TCL Script */}
          <button
            onClick={() => setShowScriptModal(true)}
            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors"
          >
            <FileCode size={13} />
            <span>Export TCL</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Viewport Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* 1. 2D Silicon Depth Profile Mode */}
          {viewMode === 'profile2d' && (
            <div className="w-full h-full flex flex-col">
              <SiliconProfile2DViewer
                floorplan={floorplan}
                powerPlan={powerPlan}
                selectedElement={selectedElement}
                onSelectElement={handleSelectElement}
                onSwitchToCad2D={() => setViewMode('cad2d')}
                onSwitchTo3D={() => setViewMode('3d')}
              />
            </div>
          )}

          {/* 2. 3D Silicon Stack Mode (Full or Split) */}
          {(viewMode === '3d' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-white/10' : 'w-full'} h-full flex flex-col`}>
              <PowerPlan3DViewer 
                floorplan={floorplan} 
                powerPlan={powerPlan} 
                selectedElement={selectedElement}
                onSelectElement={handleSelectElement}
                onSwitchTo2D={() => setViewMode('cad2d')}
              />
            </div>
          )}

          {/* 3. Professional 2D CAD Layout Mode (Full or Split) */}
          {(viewMode === 'cad2d' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col h-full overflow-hidden bg-[#06070a]`}>
              {/* Professional Modern EDA Workspace Title Bar */}
              <div className="h-7 bg-[#0d0f15] text-gray-300 px-3 flex items-center justify-between text-[11px] font-mono select-none border-b border-white/10 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-gray-100">Layout: sam_strap_trunk.gds</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400">Lib: 16nm_pdn_tech</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 text-[10px]">
                    DRC CLEAN
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[10px] text-gray-400">
                  <span>Core: {coreW}x{coreH}µm</span>
                  <span>Grid: 0.1 µm</span>
                  <span className="text-amber-400 font-bold">Zoom: {Math.round(zoomScale * 100)}%</span>
                </div>
              </div>

              {/* Professional EDA Coordinates & Status Bar */}
              <div className="h-6 bg-[#131620] text-gray-300 px-3 flex items-center justify-between text-[11px] font-mono select-none border-b border-white/10 shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="text-amber-400 font-bold">X: {mouseCoord.x.toFixed(3)} µm</span>
                  <span className="text-amber-400 font-bold">Y: {mouseCoord.y.toFixed(3)} µm</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-300">
                    {selectedElement ? `Selected: ${selectedElement.name}` : 'Ready • Click any block or callout to inspect internal circuit'}
                  </span>
                </div>
                {measuredDist !== null && (
                  <span className="text-rose-400 font-bold">Ruler: {measuredDist.toFixed(2)} µm</span>
                )}
              </div>

              {/* Professional CAD Body: Left Sleek EDA Tool Panel + Central High-DPI Viewport */}
              <div className="flex-1 flex overflow-hidden relative">
                {/* Modern Dark EDA Tool Palette (Left side) */}
                <div className="w-36 bg-[#0c0e14] border-r border-white/10 p-2 flex flex-col space-y-2 text-[11px] font-mono select-none shrink-0 overflow-y-auto">
                  {/* Zoom Controls Grid */}
                  <div className="p-1.5 bg-black/40 rounded-lg border border-white/10 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Viewport</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button 
                        onClick={() => setZoomScale(prev => Math.min(2.5, prev + 0.2))}
                        className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-200 rounded border border-white/10 flex items-center justify-center transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button 
                        onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.2))}
                        className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-200 rounded border border-white/10 flex items-center justify-center transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <button 
                        onClick={() => setZoomScale(1.0)}
                        className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-200 rounded border border-white/10 flex items-center justify-center text-[9px] font-bold transition-colors"
                        title="Fit 100%"
                      >
                        FIT
                      </button>
                    </div>
                  </div>

                  {/* CAD Tool Buttons */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">EDA Tools</span>
                    <button 
                      onClick={() => setActiveCadTool('select')}
                      className={`w-full p-1.5 rounded border text-left flex items-center space-x-1.5 transition-all ${
                        activeCadTool === 'select' ? 'bg-amber-500 text-black font-bold border-amber-400' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <MousePointer size={12} />
                      <span>Select / Probe</span>
                    </button>

                    <button 
                      onClick={() => { setActiveCadTool('ruler'); setRulerPoints([]); setMeasuredDist(null); }}
                      className={`w-full p-1.5 rounded border text-left flex items-center space-x-1.5 transition-all ${
                        activeCadTool === 'ruler' ? 'bg-amber-500 text-black font-bold border-amber-400' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Ruler size={12} />
                      <span>Measure Caliper</span>
                    </button>

                    <button 
                      onClick={() => { setSelectedElement(null); setRulerPoints([]); setMeasuredDist(null); }}
                      className="w-full p-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-left transition-colors"
                    >
                      <span>Deselect All</span>
                    </button>
                  </div>

                  {/* Professional Layer Palette Swatches */}
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Layer Palette</span>
                    <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                        <span className="text-[10px]">M7/M8 Trunks</span>
                      </span>
                      <input type="checkbox" checked={showTrunks} onChange={(e) => setShowTrunks(e.target.checked)} className="rounded accent-amber-500 w-3 h-3" />
                    </label>

                    <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-[10px]">M6 Vertical</span>
                      </span>
                      <input type="checkbox" checked={showVStraps} onChange={(e) => setShowVStraps(e.target.checked)} className="rounded accent-emerald-500 w-3 h-3" />
                    </label>

                    <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                        <span className="text-[10px]">M5 Horizontal</span>
                      </span>
                      <input type="checkbox" checked={showHStraps} onChange={(e) => setShowHStraps(e.target.checked)} className="rounded accent-red-500 w-3 h-3" />
                    </label>

                    <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                        <span className="text-[10px]">M1 Followpin</span>
                      </span>
                      <input type="checkbox" checked={showRails} onChange={(e) => setShowRails(e.target.checked)} className="rounded accent-cyan-500 w-3 h-3" />
                    </label>

                    <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />
                        <span className="text-[10px]">Via Arrays</span>
                      </span>
                      <input type="checkbox" checked={showVias} onChange={(e) => setShowVias(e.target.checked)} className="rounded accent-amber-500 w-3 h-3" />
                    </label>

                    <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                        <span className="text-[10px]">Macros</span>
                      </span>
                      <input type="checkbox" checked={showMacros} onChange={(e) => setShowMacros(e.target.checked)} className="rounded accent-sky-500 w-3 h-3" />
                    </label>
                  </div>

                  {/* Switch to 2D Profile Quick Action */}
                  <div className="mt-auto pt-2 border-t border-white/10 space-y-1.5">
                    <button
                      onClick={() => setViewMode('profile2d')}
                      className="w-full py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-center text-[10px] font-bold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Layers size={11} />
                      <span>2D Profile View</span>
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      className="w-full py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-center text-[10px] font-bold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Box size={11} />
                      <span>3D Stack View</span>
                    </button>
                  </div>
                </div>

                {/* Central Black CAD Layout Canvas */}
                <div 
                  className="flex-1 bg-black flex items-center justify-center overflow-auto relative p-4 cursor-crosshair"
                  onClick={handleCanvasBackgroundClick}
                >
                  <div 
                    style={{ 
                      transform: `scale(${zoomScale})`, 
                      transformOrigin: 'center center', 
                      transition: 'transform 0.15s ease-out' 
                    }}
                  >
                    <svg
                      ref={svgRef}
                      width={680}
                      height={680}
                      viewBox={`0 0 ${floorplan.dieWidth} ${floorplan.dieHeight}`}
                      className="overflow-visible select-none max-w-[92vw] max-h-[88vh]"
                      onMouseMove={handleSvgMouseMove}
                    >
                      <defs>
                        {/* Selection Neon Pulse Filter */}
                        <filter id="selectionNeonPulse" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="3.5" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>

                        {/* Followpin Standard Cell Rails Pattern */}
                        <pattern id="m1RailsPattern" width="100" height={powerPlan.railPitch * 3} patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="100" y2="0" stroke="#ef4444" strokeWidth={0.8} strokeOpacity={0.4} />
                          <line x1="0" y1={powerPlan.railPitch * 1.5} x2="100" y2={powerPlan.railPitch * 1.5} stroke="#06b6d4" strokeWidth={0.8} strokeOpacity={0.4} />
                        </pattern>
                      </defs>

                      {/* 1. Die Chassis Outline */}
                      <rect
                        x={0}
                        y={0}
                        width={floorplan.dieWidth}
                        height={floorplan.dieHeight}
                        fill="#000000"
                        stroke="#475569"
                        strokeWidth={1.5}
                      />

                      {/* 2. Core Boundary Area */}
                      <rect
                        x={floorplan.coreMarginLeft}
                        y={floorplan.coreMarginTop}
                        width={coreW}
                        height={coreH}
                        fill="#040608"
                        stroke="#22c55e"
                        strokeWidth={1.2}
                        strokeDasharray="4 2"
                      />

                      {/* 2b. Core Macros on Silicon Base */}
                      {showMacros && floorplan.macros.map((m) => {
                        const absX = floorplan.coreMarginLeft + m.x;
                        const absY = floorplan.coreMarginTop + m.y;
                        const isMacSelected = selectedElement && (selectedElement.name === m.name || selectedElement.id === m.id);

                        return (
                          <g
                            key={m.id}
                            transform={`translate(${absX}, ${absY})`}
                            className="cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectElement({
                                id: m.id,
                                name: m.name,
                                type: m.type,
                                layer: 'Core Macro Block',
                                role: `Functional core module (${m.type}) powered via dedicated M5/M6 power ring & local decap cells`,
                                voltage: '1.0V Nominal',
                                width: `${m.width}µm`,
                                height: `${m.height}µm`
                              });
                            }}
                          >
                            <rect
                              x={0}
                              y={0}
                              width={m.width}
                              height={m.height}
                              fill={isMacSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.65)'}
                              stroke={isMacSelected ? '#38bdf8' : '#475569'}
                              strokeWidth={isMacSelected ? 3 : 1.2}
                              rx={4}
                              filter={isMacSelected ? 'url(#selectionNeonPulse)' : 'none'}
                            />
                            <text
                              x={m.width / 2}
                              y={m.height / 2 - 3}
                              fill={isMacSelected ? '#ffffff' : '#cbd5e1'}
                              fontSize={10}
                              fontFamily="monospace"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {m.name}
                            </text>
                            <text
                              x={m.width / 2}
                              y={m.height / 2 + 10}
                              fill="#94a3b8"
                              fontSize={8}
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {m.type}
                            </text>
                          </g>
                        );
                      })}

                      {/* 3. Followpins & Standard Cell Rows */}
                      {showRails && (
                        <g 
                          opacity={isElementSelected('RAIL') || isElementSelected('FOLLOWPIN') ? 1.0 : 0.5}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectElement({
                              name: 'Standard Cell Followpin Rails (M1)',
                              layer: 'Metal 1',
                              role: 'Fine-pitch horizontal rails powering CMOS logic gates along rows',
                              voltage: '1.0V (VDD) / 0V (VSS)'
                            });
                          }}
                        >
                          {Array.from({ length: 42 }).map((_, i) => {
                            const y = floorplan.coreMarginTop + (i * coreH) / 42;
                            return (
                              <line
                                key={`row_${i}`}
                                x1={floorplan.coreMarginLeft}
                                y1={y}
                                x2={floorplan.coreMarginLeft + coreW}
                                y2={y}
                                stroke={isElementSelected('RAIL') ? '#38bdf8' : '#ca8a04'}
                                strokeWidth={isElementSelected('RAIL') ? 1.2 : 0.5}
                              />
                            );
                          })}
                        </g>
                      )}

                      {/* 4. Core Power Rings (Horizontal Red, Vertical Green) */}
                      {showRings && powerPlan.enableRings && (
                        <g>
                          {/* Top Horizontal Ring (Red M5) */}
                          <rect
                            x={floorplan.coreMarginLeft - powerPlan.ringOffset}
                            y={floorplan.coreMarginTop - powerPlan.ringOffset}
                            width={coreW + powerPlan.ringOffset * 2}
                            height={powerPlan.ringWidth}
                            fill="#ef4444"
                            stroke={isElementSelected('Horizontal Core Power Ring') || isElementSelected('POWER_RING') ? '#38bdf8' : 'none'}
                            strokeWidth={isElementSelected('Horizontal Core Power Ring') || isElementSelected('POWER_RING') ? 2 : 0}
                            filter={isElementSelected('Horizontal Core Power Ring') ? 'url(#selectionNeonPulse)' : 'none'}
                            className="cursor-pointer hover:opacity-80"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleSelectElement({ name: 'Horizontal Core Power Ring (VDD)', layer: 'Metal 5', width: `${powerPlan.ringWidth}µm`, voltage: '1.0V' }); 
                            }}
                          />
                          {/* Bottom Horizontal Ring (Red M5) */}
                          <rect
                            x={floorplan.coreMarginLeft - powerPlan.ringOffset}
                            y={floorplan.coreMarginTop + coreH + powerPlan.ringOffset - powerPlan.ringWidth}
                            width={coreW + powerPlan.ringOffset * 2}
                            height={powerPlan.ringWidth}
                            fill="#ef4444"
                            stroke={isElementSelected('Horizontal Core Power Ring') || isElementSelected('POWER_RING') ? '#38bdf8' : 'none'}
                            strokeWidth={isElementSelected('Horizontal Core Power Ring') || isElementSelected('POWER_RING') ? 2 : 0}
                            filter={isElementSelected('Horizontal Core Power Ring') ? 'url(#selectionNeonPulse)' : 'none'}
                            className="cursor-pointer hover:opacity-80"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleSelectElement({ name: 'Horizontal Core Power Ring (VDD)', layer: 'Metal 5', width: `${powerPlan.ringWidth}µm`, voltage: '1.0V' }); 
                            }}
                          />
                          {/* Left Vertical Ring (Green M6) */}
                          <rect
                            x={floorplan.coreMarginLeft - powerPlan.ringOffset}
                            y={floorplan.coreMarginTop - powerPlan.ringOffset}
                            width={powerPlan.ringWidth}
                            height={coreH + powerPlan.ringOffset * 2}
                            fill="#22c55e"
                            stroke={isElementSelected('Vertical Core Power Ring') || isElementSelected('POWER_RING') ? '#38bdf8' : 'none'}
                            strokeWidth={isElementSelected('Vertical Core Power Ring') || isElementSelected('POWER_RING') ? 2 : 0}
                            filter={isElementSelected('Vertical Core Power Ring') ? 'url(#selectionNeonPulse)' : 'none'}
                            className="cursor-pointer hover:opacity-80"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleSelectElement({ name: 'Vertical Core Power Ring (VDD)', layer: 'Metal 6', width: `${powerPlan.ringWidth}µm`, voltage: '1.0V' }); 
                            }}
                          />
                          {/* Right Vertical Ring (Green M6) */}
                          <rect
                            x={floorplan.coreMarginLeft + coreW + powerPlan.ringOffset - powerPlan.ringWidth}
                            y={floorplan.coreMarginTop - powerPlan.ringOffset}
                            width={powerPlan.ringWidth}
                            height={coreH + powerPlan.ringOffset * 2}
                            fill="#22c55e"
                            stroke={isElementSelected('Vertical Core Power Ring') || isElementSelected('POWER_RING') ? '#38bdf8' : 'none'}
                            strokeWidth={isElementSelected('Vertical Core Power Ring') || isElementSelected('POWER_RING') ? 2 : 0}
                            filter={isElementSelected('Vertical Core Power Ring') ? 'url(#selectionNeonPulse)' : 'none'}
                            className="cursor-pointer hover:opacity-80"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleSelectElement({ name: 'Vertical Core Power Ring (VDD)', layer: 'Metal 6', width: `${powerPlan.ringWidth}µm`, voltage: '1.0V' }); 
                            }}
                          />

                          {/* Inner VSS Rings */}
                          <rect
                            x={floorplan.coreMarginLeft - powerPlan.ringOffset + powerPlan.ringWidth + 4}
                            y={floorplan.coreMarginTop - powerPlan.ringOffset + powerPlan.ringWidth + 4}
                            width={coreW + (powerPlan.ringOffset - powerPlan.ringWidth - 4) * 2}
                            height={coreH + (powerPlan.ringOffset - powerPlan.ringWidth - 4) * 2}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth={powerPlan.ringWidth - 4}
                            className="cursor-pointer hover:opacity-80"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleSelectElement({ name: 'Core Power Ring (VSS Ground Loop)', layer: 'Metal 5/6', width: `${powerPlan.ringWidth}µm`, voltage: '0V' }); 
                            }}
                          />
                        </g>
                      )}

                      {/* 5. Vertical Straps (Green M6) */}
                      {showVStraps && powerPlan.enableVStraps && simulation.vStrapCoords.map((x, idx) => {
                        const absX = floorplan.coreMarginLeft + x;
                        const selected = isElementSelected(`Vertical Strap #${idx + 1}`) || isElementSelected('VERTICAL STRAP');
                        return (
                          <line
                            key={`vstrap_${idx}`}
                            x1={absX}
                            y1={floorplan.coreMarginTop}
                            x2={absX}
                            y2={floorplan.coreMarginTop + coreH}
                            stroke={selected ? '#38bdf8' : '#22c55e'}
                            strokeWidth={selected ? powerPlan.vStrapWidth + 3 : powerPlan.vStrapWidth}
                            filter={selected ? 'url(#selectionNeonPulse)' : 'none'}
                            className="cursor-pointer hover:stroke-white transition-all"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleSelectElement({ name: `Vertical Strap #${idx + 1}`, layer: 'M6', width: `${powerPlan.vStrapWidth}µm`, net: idx % 2 === 0 ? 'VDD' : 'VSS' }); 
                            }}
                          />
                        );
                      })}

                      {/* 6. Horizontal Straps (Red M5) */}
                      {showHStraps && powerPlan.enableHStraps && simulation.hStrapCoords.map((y, idx) => {
                        const absY = floorplan.coreMarginTop + y;
                        const selected = isElementSelected(`Horizontal Strap #${idx + 1}`) || isElementSelected('HORIZONTAL STRAP');
                        return (
                          <line
                            key={`hstrap_${idx}`}
                            x1={floorplan.coreMarginLeft}
                            y1={absY}
                            x2={floorplan.coreMarginLeft + coreW}
                            y2={absY}
                            stroke={selected ? '#facc15' : '#ef4444'}
                            strokeWidth={selected ? powerPlan.hStrapWidth + 3 : powerPlan.hStrapWidth}
                            filter={selected ? 'url(#selectionNeonPulse)' : 'none'}
                            className="cursor-pointer hover:stroke-white transition-all"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleSelectElement({ name: `Horizontal Strap #${idx + 1}`, layer: 'M5', width: `${powerPlan.hStrapWidth}µm`, net: idx % 2 === 0 ? 'VDD' : 'VSS' }); 
                            }}
                          />
                        );
                      })}

                      {/* 7. Pad to Core Feeder Trunks */}
                      {showTrunks && (
                        <g>
                          {/* Left Side Pad-to-Core Trunks */}
                          {[-45, -15, 15, 45].map((off, i) => {
                            const y = floorplan.coreMarginTop + coreH / 2 + off;
                            const selected = isElementSelected('Trunk') || isElementSelected('West');
                            return (
                              <g key={`left_trunk_${i}`} onClick={(e) => { e.stopPropagation(); handleSelectElement({ name: `Pad to Core Trunk (West-${i + 1})`, layer: 'M7/M8 Heavy Metal', role: 'Connects peripheral IO power pad to core ring', resistance: '0.024 Ω' }); }}>
                                <line
                                  x1={4}
                                  y1={y}
                                  x2={floorplan.coreMarginLeft - powerPlan.ringOffset}
                                  y2={y}
                                  stroke={selected ? '#facc15' : '#ef4444'}
                                  strokeWidth={powerPlan.trunkWidth || 8}
                                  className="cursor-pointer hover:stroke-yellow-300"
                                />
                                <rect
                                  x={floorplan.coreMarginLeft - powerPlan.ringOffset - 4}
                                  y={y - 4}
                                  width={8}
                                  height={8}
                                  fill="#facc15"
                                  stroke="#000"
                                  strokeWidth={0.5}
                                />
                              </g>
                            );
                          })}

                          {/* Right Side Pad-to-Core Trunks */}
                          {[-45, -15, 15, 45].map((off, i) => {
                            const y = floorplan.coreMarginTop + coreH / 2 + off;
                            const selected = isElementSelected('Trunk') || isElementSelected('East');
                            return (
                              <g key={`right_trunk_${i}`} onClick={(e) => { e.stopPropagation(); handleSelectElement({ name: `Pad to Core Trunk (East-${i + 1})`, layer: 'M7/M8 Heavy Metal', role: 'Connects peripheral IO power pad to core ring', resistance: '0.024 Ω' }); }}>
                                <line
                                  x1={floorplan.coreMarginLeft + coreW + powerPlan.ringOffset}
                                  y1={y}
                                  x2={floorplan.dieWidth - 4}
                                  y2={y}
                                  stroke={selected ? '#facc15' : '#ef4444'}
                                  strokeWidth={powerPlan.trunkWidth || 8}
                                  className="cursor-pointer hover:stroke-yellow-300"
                                />
                                <rect
                                  x={floorplan.coreMarginLeft + coreW + powerPlan.ringOffset - 4}
                                  y={y - 4}
                                  width={8}
                                  height={8}
                                  fill="#facc15"
                                  stroke="#000"
                                  strokeWidth={0.5}
                                />
                              </g>
                            );
                          })}

                          {/* Top Side Pad-to-Core Trunks */}
                          {[-45, -15, 15, 45].map((off, i) => {
                            const x = floorplan.coreMarginLeft + coreW / 2 + off;
                            const selected = isElementSelected('Trunk') || isElementSelected('North');
                            return (
                              <g key={`top_trunk_${i}`} onClick={(e) => { e.stopPropagation(); handleSelectElement({ name: `Pad to Core Trunk (North-${i + 1})`, layer: 'M7/M8 Heavy Metal', role: 'Connects peripheral IO power pad to core ring', resistance: '0.024 Ω' }); }}>
                                <line
                                  x1={x}
                                  y1={4}
                                  x2={x}
                                  y2={floorplan.coreMarginTop - powerPlan.ringOffset}
                                  stroke={selected ? '#facc15' : '#22c55e'}
                                  strokeWidth={powerPlan.trunkWidth || 8}
                                  className="cursor-pointer hover:stroke-yellow-300"
                                />
                                <rect
                                  x={x - 4}
                                  y={floorplan.coreMarginTop - powerPlan.ringOffset - 4}
                                  width={8}
                                  height={8}
                                  fill="#facc15"
                                  stroke="#000"
                                  strokeWidth={0.5}
                                />
                              </g>
                            );
                          })}

                          {/* Bottom Side Pad-to-Core Trunks */}
                          {[-45, -15, 15, 45].map((off, i) => {
                            const x = floorplan.coreMarginLeft + coreW / 2 + off;
                            const selected = isElementSelected('Trunk') || isElementSelected('South');
                            return (
                              <g key={`bottom_trunk_${i}`} onClick={(e) => { e.stopPropagation(); handleSelectElement({ name: `Pad to Core Trunk (South-${i + 1})`, layer: 'M7/M8 Heavy Metal', role: 'Connects peripheral IO power pad to core ring', resistance: '0.024 Ω' }); }}>
                                <line
                                  x1={x}
                                  y1={floorplan.coreMarginTop + coreH + powerPlan.ringOffset}
                                  x2={x}
                                  y2={floorplan.dieHeight - 4}
                                  stroke={selected ? '#facc15' : '#22c55e'}
                                  strokeWidth={powerPlan.trunkWidth || 8}
                                  className="cursor-pointer hover:stroke-yellow-300"
                                />
                                <rect
                                  x={x - 4}
                                  y={floorplan.coreMarginTop + coreH + powerPlan.ringOffset - 4}
                                  width={8}
                                  height={8}
                                  fill="#facc15"
                                  stroke="#000"
                                  strokeWidth={0.5}
                                />
                              </g>
                            );
                          })}
                        </g>
                      )}

                      {/* 8. Via Crossings (Vias connecting straps) */}
                      {showVias && simulation.vStrapCoords.map((vx, vi) => {
                        const isVddV = vi % 2 === 0;
                        return simulation.hStrapCoords.map((hy, hi) => {
                          const isVddH = hi % 2 === 0;
                          if (isVddV !== isVddH) return null;
                          const absX = floorplan.coreMarginLeft + vx;
                          const absY = floorplan.coreMarginTop + hy;
                          return (
                            <rect
                              key={`via_${vi}_${hi}`}
                              x={absX - 2}
                              y={absY - 2}
                              width={4}
                              height={4}
                              fill="#facc15"
                              stroke="#ffffff"
                              strokeWidth={0.5}
                              className="cursor-pointer hover:scale-150 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectElement({
                                  name: 'Inter-Layer Power Via Stack',
                                  layer: 'Via 5 Matrix',
                                  role: 'Multi-cut via array connecting orthogonal M5 and M6 conductors',
                                  resistance: '0.075 Ω'
                                });
                              }}
                            />
                          );
                        });
                      })}

                      {/* 9. PROFESSIONAL EDA ANNOTATION CALLOUTS */}
                      {showCallouts && (
                        <g>
                          {/* Callout 1: "power rings" */}
                          <g 
                            transform={`translate(${floorplan.coreMarginLeft + coreW - 80}, ${floorplan.coreMarginTop - 25})`}
                            className="cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectElement({
                                name: 'Core Power Rings (VDD / VSS Closed Loop)',
                                layer: 'Metal 5 (Horizontal) / Metal 6 (Vertical)',
                                role: 'Dual closed-loop perimeter rings distributing clean power around entire die perimeter',
                                width: `${powerPlan.ringWidth}µm`,
                                voltage: '1.0V / 0V'
                              });
                            }}
                          >
                            <ellipse 
                              cx="0" 
                              cy="0" 
                              rx="38" 
                              ry="16" 
                              fill={isElementSelected('RING') ? 'rgba(56, 189, 248, 0.25)' : 'none'} 
                              stroke={isElementSelected('RING') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={isElementSelected('RING') ? 2.5 : 1.5}
                              filter={isElementSelected('RING') ? 'url(#selectionNeonPulse)' : 'none'}
                              className="group-hover:stroke-yellow-400 group-hover:stroke-2 transition-all"
                            />
                            <line 
                              x1="28" 
                              y1="-8" 
                              x2="68" 
                              y2="-20" 
                              stroke={isElementSelected('RING') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={1.2} 
                              className="group-hover:stroke-yellow-400" 
                            />
                            <rect 
                              x="68" 
                              y="-30" 
                              width="95" 
                              height="20" 
                              fill="#000000" 
                              stroke={isElementSelected('RING') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={isElementSelected('RING') ? 1.5 : 0.8}
                              rx="3"
                              className="group-hover:stroke-yellow-400 group-hover:fill-yellow-950/40 transition-all"
                            />
                            <text 
                              x="115" 
                              y="-16" 
                              fill={isElementSelected('RING') ? '#38bdf8' : '#ffffff'} 
                              fontSize="10" 
                              fontFamily="sans-serif" 
                              fontWeight={isElementSelected('RING') ? 'bold' : 'normal'}
                              textAnchor="middle"
                              className="group-hover:fill-yellow-300"
                            >
                              power rings
                            </text>
                          </g>

                          {/* Callout 2: "vertical and horizontal straps" */}
                          <g 
                            transform={`translate(${floorplan.coreMarginLeft + coreW / 2 - 60}, ${floorplan.coreMarginTop + coreH / 2 - 30})`}
                            className="cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectElement({
                                name: 'Vertical & Horizontal Power Straps (M5/M6 Grid)',
                                layer: 'Metal 5 & Metal 6 Mesh',
                                role: 'Orthogonal low-impedance lattice delivering current from rings to cell rows',
                                width: `${powerPlan.vStrapWidth}µm / ${powerPlan.hStrapWidth}µm`,
                                voltage: '1.0V / 0V'
                              });
                            }}
                          >
                            <ellipse 
                              cx="0" 
                              cy="0" 
                              rx="32" 
                              ry="26" 
                              fill={isElementSelected('STRAP') ? 'rgba(56, 189, 248, 0.25)' : 'none'} 
                              stroke={isElementSelected('STRAP') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={isElementSelected('STRAP') ? 2.5 : 1.5}
                              filter={isElementSelected('STRAP') ? 'url(#selectionNeonPulse)' : 'none'}
                              className="group-hover:stroke-yellow-400 group-hover:stroke-2 transition-all"
                            />
                            <line 
                              x1="18" 
                              y1="-15" 
                              x2="38" 
                              y2="-35" 
                              stroke={isElementSelected('STRAP') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={1.2} 
                              className="group-hover:stroke-yellow-400" 
                            />
                            <rect 
                              x="38" 
                              y="-52" 
                              width="165" 
                              height="30" 
                              fill="#000000" 
                              stroke={isElementSelected('STRAP') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={isElementSelected('STRAP') ? 1.5 : 0.8}
                              rx="3"
                              className="group-hover:stroke-yellow-400 group-hover:fill-yellow-950/40 transition-all"
                            />
                            <text 
                              x="120" 
                              y="-40" 
                              fill={isElementSelected('STRAP') ? '#38bdf8' : '#ffffff'} 
                              fontSize="9" 
                              fontFamily="sans-serif" 
                              fontWeight={isElementSelected('STRAP') ? 'bold' : 'normal'}
                              textAnchor="middle"
                              className="group-hover:fill-yellow-300"
                            >
                              vertical and
                            </text>
                            <text 
                              x="120" 
                              y="-28" 
                              fill={isElementSelected('STRAP') ? '#38bdf8' : '#ffffff'} 
                              fontSize="9" 
                              fontFamily="sans-serif" 
                              fontWeight={isElementSelected('STRAP') ? 'bold' : 'normal'}
                              textAnchor="middle"
                              className="group-hover:fill-yellow-300"
                            >
                              horizontal straps
                            </text>
                          </g>

                          {/* Callout 3: "pad to core trunk" */}
                          <g 
                            transform={`translate(${floorplan.coreMarginLeft - 25}, ${floorplan.coreMarginTop + coreH / 2})`}
                            className="cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectElement({
                                name: 'Pad-to-Core Feeder Trunk (Metal 7/8 Heavy Metal)',
                                layer: 'Metal 7 / Metal 8',
                                role: 'Direct ultra-thick redistribution bus connecting peripheral IO pads to core ring',
                                resistance: '0.024 Ω',
                                voltage: '1.0V'
                              });
                            }}
                          >
                            <ellipse 
                              cx="0" 
                              cy="0" 
                              rx="22" 
                              ry="48" 
                              fill={isElementSelected('TRUNK') ? 'rgba(56, 189, 248, 0.25)' : 'none'} 
                              stroke={isElementSelected('TRUNK') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={isElementSelected('TRUNK') ? 2.5 : 1.5}
                              filter={isElementSelected('TRUNK') ? 'url(#selectionNeonPulse)' : 'none'}
                              className="group-hover:stroke-yellow-400 group-hover:stroke-2 transition-all"
                            />
                            <line 
                              x1="-15" 
                              y1="0" 
                              x2="-65" 
                              y2="0" 
                              stroke={isElementSelected('TRUNK') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={1.2} 
                              className="group-hover:stroke-yellow-400" 
                            />
                            <rect 
                              x="-185" 
                              y="-14" 
                              width="120" 
                              height="26" 
                              fill="#000000" 
                              stroke={isElementSelected('TRUNK') ? '#38bdf8' : '#ffffff'} 
                              strokeWidth={isElementSelected('TRUNK') ? 1.5 : 0.8}
                              rx="3"
                              className="group-hover:stroke-yellow-400 group-hover:fill-yellow-950/40 transition-all"
                            />
                            <text 
                              x="-125" 
                              y="3" 
                              fill={isElementSelected('TRUNK') ? '#38bdf8' : '#ffffff'} 
                              fontSize="10" 
                              fontFamily="sans-serif" 
                              fontWeight={isElementSelected('TRUNK') ? 'bold' : 'normal'}
                              textAnchor="middle"
                              className="group-hover:fill-yellow-300"
                            >
                              pad to core trunk
                            </text>
                          </g>
                        </g>
                      )}

                      {/* 10. Ruler Tool Measuring Line */}
                      {rulerPoints.length > 0 && (
                        <g>
                          <circle cx={rulerPoints[0].x} cy={rulerPoints[0].y} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1} />
                          <line
                            x1={rulerPoints[0].x}
                            y1={rulerPoints[0].y}
                            x2={mouseCoord.x}
                            y2={mouseCoord.y}
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                          />
                          {measuredDist !== null && (
                            <rect
                              x={(rulerPoints[0].x + mouseCoord.x) / 2 - 40}
                              y={(rulerPoints[0].y + mouseCoord.y) / 2 - 12}
                              width={80}
                              height={20}
                              fill="#000"
                              stroke="#ef4444"
                              strokeWidth={1}
                            />
                          )}
                          {measuredDist !== null && (
                            <text
                              x={(rulerPoints[0].x + mouseCoord.x) / 2}
                              y={(rulerPoints[0].y + mouseCoord.y) / 2 + 2}
                              fill="#fff"
                              fontSize="9"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {measuredDist.toFixed(1)} µm
                            </text>
                          )}
                        </g>
                      )}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector & Settings Panel - Slides out when an element is selected */}
        {((selectedElement !== null) || (rightPanelTab === 'settings') || (viewMode === '3d' && isRightPanelOpen)) && (
          <div className="w-[450px] max-w-[48vw] bg-[#121418] border-l border-white/10 flex flex-col h-full overflow-hidden shrink-0 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Panel Header Tabs */}
            <div className="p-2.5 bg-[#171920] border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs font-mono">
                <button
                  onClick={() => setRightPanelTab('inspector')}
                  className={`px-3 py-1 rounded transition-all flex items-center space-x-1.5 ${
                    rightPanelTab === 'inspector'
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap size={13} />
                  <span>Element & Circuit</span>
                </button>
                <button
                  onClick={() => setRightPanelTab('settings')}
                  className={`px-3 py-1 rounded transition-all flex items-center space-x-1.5 ${
                    rightPanelTab === 'settings'
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sliders size={13} />
                  <span>Grid & Sizing</span>
                </button>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setSelectedElement(null)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-mono"
                  title="Close Inspector"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
              {rightPanelTab === 'inspector' ? (
                <PowerCircuitDetailView
                  selectedElement={selectedElement}
                  onClearSelection={() => setSelectedElement(null)}
                  onOpen3DView={() => setViewMode('3d')}
                />
              ) : (
                <div className="h-full overflow-y-auto p-4 space-y-4 font-mono text-xs">
                  {/* Layer Visibility Stack */}
                  <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 space-y-2.5">
                    <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Layers size={13} className="text-emerald-400" />
                      <span>Layer Visibility</span>
                    </h4>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                        <span className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                          <span>Core Rings (VDD / VSS)</span>
                        </span>
                        <input type="checkbox" checked={showRings} onChange={(e) => setShowRings(e.target.checked)} className="rounded accent-emerald-500" />
                      </label>

                      <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                        <span className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                          <span>Pad-to-Core Trunks (M7/M8)</span>
                        </span>
                        <input type="checkbox" checked={showTrunks} onChange={(e) => setShowTrunks(e.target.checked)} className="rounded accent-emerald-500" />
                      </label>

                      <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                        <span className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                          <span>Vertical Straps ({powerPlan.vStrapLayer})</span>
                        </span>
                        <input type="checkbox" checked={showVStraps} onChange={(e) => setShowVStraps(e.target.checked)} className="rounded accent-emerald-500" />
                      </label>

                      <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                        <span className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                          <span>Horizontal Straps ({powerPlan.hStrapLayer})</span>
                        </span>
                        <input type="checkbox" checked={showHStraps} onChange={(e) => setShowHStraps(e.target.checked)} className="rounded accent-emerald-500" />
                      </label>

                      <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                        <span className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                          <span>Standard Cell Rails (M1)</span>
                        </span>
                        <input type="checkbox" checked={showRails} onChange={(e) => setShowRails(e.target.checked)} className="rounded accent-emerald-500" />
                      </label>

                      <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                        <span className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />
                          <span>Vias & Interconnect Array</span>
                        </span>
                        <input type="checkbox" checked={showVias} onChange={(e) => setShowVias(e.target.checked)} className="rounded accent-emerald-500" />
                      </label>

                      <label className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-0.5">
                        <span className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                          <span>Floorplan Macros</span>
                        </span>
                        <input type="checkbox" checked={showMacros} onChange={(e) => setShowMacros(e.target.checked)} className="rounded accent-emerald-500" />
                      </label>
                    </div>
                  </div>

                  {/* IR Drop Quality Metrics */}
                  <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 space-y-2.5">
                    <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Activity size={13} className="text-amber-400" />
                      <span>IR Drop Quality Metrics</span>
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-400">Nominal VDD:</span>
                        <span className="font-mono text-gray-200">{powerPlan.supplyVoltage.toFixed(2)} V</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-400">Peak IR Drop:</span>
                        <span className={`font-mono font-bold ${simulation.isDrcPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {simulation.maxDropMv.toFixed(1)} mV ({simulation.maxDropPercent.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-400">Average IR Drop:</span>
                        <span className="font-mono text-gray-200">{simulation.avgDropMv.toFixed(1)} mV</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Target Threshold:</span>
                        <span className="font-mono text-gray-400">≤ {powerPlan.maxIRDropTargetPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Power Grid Geometry Configuration */}
                  <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 space-y-2.5">
                    <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sliders size={13} className="text-blue-400" />
                      <span>PDN Mesh Sizing Controls</span>
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-gray-400 block mb-1">Core Ring Width (µm)</label>
                        <input
                          type="number"
                          value={powerPlan.ringWidth}
                          onChange={(e) => handleUpdate('ringWidth', parseInt(e.target.value) || 4)}
                          className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 block mb-1">Vertical Strap Pitch (µm)</label>
                        <input
                          type="number"
                          value={powerPlan.vStrapPitch}
                          onChange={(e) => handleUpdate('vStrapPitch', parseInt(e.target.value) || 20)}
                          className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 block mb-1">Horizontal Strap Pitch (µm)</label>
                        <input
                          type="number"
                          value={powerPlan.hStrapPitch}
                          onChange={(e) => handleUpdate('hStrapPitch', parseInt(e.target.value) || 20)}
                          className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 block mb-1">Feeder Trunk Width (µm)</label>
                        <input
                          type="number"
                          value={powerPlan.trunkWidth || 10}
                          onChange={(e) => handleUpdate('trunkWidth', parseInt(e.target.value) || 4)}
                          className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Script Export Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151619] border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode size={18} className="text-amber-400" />
                <h3 className="font-semibold text-gray-200 text-sm font-mono">Export PDN Synthesis TCL Script</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setScriptType('openroad')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${scriptType === 'openroad' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  OpenROAD
                </button>
                <button
                  onClick={() => setScriptType('innovus')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${scriptType === 'innovus' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Cadence Innovus
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <pre className="text-xs font-mono text-gray-300 bg-[#0d0e12] p-4 rounded-lg border border-white/5 overflow-x-auto leading-relaxed">
                {scriptType === 'openroad' 
                  ? generateOpenRoadFloorplanTcl(floorplan, powerPlan)
                  : generateInnovusTcl(floorplan, powerPlan)}
              </pre>
            </div>

            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">Compatible with standard ASIC PDN synthesis</span>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <Copy size={14} />
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-md text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

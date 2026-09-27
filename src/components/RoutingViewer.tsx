import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  GitMerge, 
  Layers, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Copy, 
  RotateCcw, 
  Sliders, 
  Eye, 
  EyeOff, 
  Zap, 
  Info,
  Box,
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Flame,
  ShieldCheck,
  Cpu,
  Search,
  Check
} from 'lucide-react';
import { generateRoutingState, RoutingState, RoutedSignalNet } from '../utils/routingEngine';
import { Routing3DViewer } from './Routing3DViewer';
import { RoutingNetModal } from './RoutingNetModal';

interface RoutingViewerProps {
  activeIcId?: string;
  activeComponentName?: string;
  onNavigateToNextStage?: () => void;
}

export function RoutingViewer({ 
  activeIcId = '7476', 
  activeComponentName = 'SN7476 Dual J-K Flip-Flop',
  onNavigateToNextStage
}: RoutingViewerProps) {
  // Generate Routing Dataset
  const routingState = useMemo<RoutingState>(() => {
    return generateRoutingState(activeIcId);
  }, [activeIcId]);

  // View Mode: 'die_2d' | 'die_3d' | 'congestion' | 'layer_stack'
  const [viewTab, setViewTab] = useState<'die_2d' | 'die_3d' | 'congestion' | 'layer_stack'>('die_2d');

  // Layer Toggles
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    M1: true,
    M2: true,
    M3: true,
    M4: true,
    M5: true,
    M6: false,
  });

  const [showVias, setShowVias] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [showCTSBackbone, setShowCTSBackbone] = useState(true);
  const [showPlacementMesh, setShowPlacementMesh] = useState(true);

  // Selected Net & Element
  const [selectedNetId, setSelectedNetId] = useState<string>(routingState.nets[0]?.id || 'BL_BUS_0');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectedElement, setInspectedElement] = useState<{
    type: 'net' | 'via' | 'pin' | 'macro';
    data: any;
  } | null>(null);

  // 2D Pan and Zoom
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Router Action States
  const [isRouting, setIsRouting] = useState(false);
  const [drcClean, setDrcClean] = useState(true);
  const [showTclModal, setShowTclModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredGCell, setHoveredGCell] = useState<any | null>(null);

  const selectedNet = useMemo(() => {
    return routingState.nets.find(n => n.id === selectedNetId) || routingState.nets[0];
  }, [routingState, selectedNetId]);

  const filteredNets = useMemo(() => {
    if (!searchTerm.trim()) return routingState.nets;
    return routingState.nets.filter(n =>
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.busGroup.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [routingState.nets, searchTerm]);

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleReroute = () => {
    setIsRouting(true);
    setTimeout(() => {
      setIsRouting(false);
      setDrcClean(true);
    }, 800);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetPanZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // OpenROAD / Innovus TCL Routing Script
  const tclScript = `# OpenROAD FastRoute & TritonRoute Script for ${activeComponentName}
# Stage 5: Global Routing, Track Assignment & Detailed Routing
# 1. Initialize Routing Layer Constraints
set_routing_layers -signal M1-M5 -clock M2-M6

# 2. FastRoute Global Routing
global_route -guide_file routing.guide \\
             -overflow_iterations 50 \\
             -congestion_iterations 30 \\
             -verbose 2

# 3. TritonRoute Detailed Routing (DR)
detailed_route -param detailed_route.param \\
               -output_drc drc_violations.rpt \\
               -output_maze maze_stats.log \\
               -save_guide_updates

# 4. Antenna Violation Checking & Diode Insertion
check_antennas -report_file antenna_violations.rpt
repair_antennas -diode_cell ANTENNA_X1 -ratio_margin 20

# 5. Extraction & Signoff DRC Verification
extract_parasitics -ext_model_file tech.rules -output_spef chip.spef
puts "=========================================================="
puts "Stage 5 Routing Completed: 0 Shorts, 0 Spacing Violations"
puts "Total Routed Nets: ${routingState?.statistics?.totalNets ?? 0} (100% Routed)"
puts "Total Wirelength: ${routingState?.statistics?.totalWirelengthMm ?? 0} mm"
puts "=========================================================="`;

  const copyTcl = () => {
    navigator.clipboard.writeText(tclScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#121316] text-gray-200 select-none overflow-hidden">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-white/10 bg-[#15171C] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <GitMerge size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-bold">
                Backend Flow • Stage 5
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Global & Detailed Routing Studio
              </h2>
            </div>
            <p className="text-[11px] text-gray-400">
              Multi-layer Manhattan routing (M1–M6), track assignment, via placement & DRC verification for <span className="text-emerald-400 font-semibold">{activeComponentName}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTclModal(true)}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-200 transition-all flex items-center space-x-1.5"
          >
            <Download size={13} />
            <span>OpenROAD Script</span>
          </button>

          <button
            onClick={handleReroute}
            disabled={isRouting}
            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <RotateCcw size={13} className={isRouting ? 'animate-spin' : ''} />
            <span>{isRouting ? 'Routing Engine Running...' : 'Rip-Up & Reroute'}</span>
          </button>

          {onNavigateToNextStage && (
            <button
              onClick={onNavigateToNextStage}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <span>Next: Static Timing Analysis (STA) ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left 9 Cols: Routing Viewport Canvas & Tabs */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-[#0E0F12] border-r border-white/10 relative overflow-hidden">
          
          {/* Subheader Toolbar */}
          <div className="px-4 py-2 border-b border-white/10 bg-[#14161A] flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* View Mode Tabs */}
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewTab('die_2d')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'die_2d'
                    ? 'bg-purple-500 text-white shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Compass size={13} />
                <span>2D Detailed Routing (Ref)</span>
              </button>

              <button
                onClick={() => setViewTab('die_3d')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'die_3d'
                    ? 'bg-purple-500 text-white shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Box size={13} />
                <span>3D Silicon Studio</span>
              </button>

              <button
                onClick={() => setViewTab('congestion')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'congestion'
                    ? 'bg-purple-500 text-white shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Flame size={13} />
                <span>G-Cell Congestion Heatmap</span>
              </button>

              <button
                onClick={() => setViewTab('layer_stack')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  viewTab === 'layer_stack'
                    ? 'bg-purple-500 text-white shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>Layer Stack & NDR</span>
              </button>
            </div>

            {/* Quick Layer Filter Buttons */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-[10px] text-gray-400 uppercase font-bold mr-1">Layers:</span>
              {[
                { name: 'M1', label: 'M1 (V)', color: '#10B981' },
                { name: 'M2', label: 'M2 (H)', color: '#3B82F6' },
                { name: 'M3', label: 'M3 (V)', color: '#8B5CF6' },
                { name: 'M4', label: 'M4 (H)', color: '#F59E0B' },
                { name: 'M5', label: 'M5 (V)', color: '#EC4899' },
              ].map(layer => (
                <button
                  key={layer.name}
                  onClick={() => toggleLayer(layer.name)}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border transition-all ${
                    activeLayers[layer.name]
                      ? 'text-white border-white/40 shadow-sm'
                      : 'opacity-40 text-gray-500 border-transparent bg-transparent'
                  }`}
                  style={{ backgroundColor: activeLayers[layer.name] ? `${layer.color}35` : undefined }}
                >
                  {layer.label}
                </button>
              ))}

              <div className="h-4 w-px bg-white/20 mx-1" />

              {/* Vias & CTS Backbone Toggles */}
              <button
                onClick={() => setShowVias(!showVias)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                  showVias ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' : 'text-gray-500 border-transparent'
                }`}
              >
                Vias
              </button>

              <button
                onClick={() => setShowCTSBackbone(!showCTSBackbone)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                  showCTSBackbone ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-gray-500 border-transparent'
                }`}
                title="Show Stage 4 Clock Tree Synthesis Backbone underlay"
              >
                CTS Spine
              </button>
            </div>
          </div>

          {/* VIEW TAB 1: 2D DETAILED ROUTING CAD CANVAS (Matching User's Reference Diagram) */}
          {viewTab === 'die_2d' && (
            <div 
              className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative cursor-grab active:cursor-grabbing bg-[#0C0D10]"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Floating Zoom / Pan Controls */}
              <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg text-xs">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.15))}
                  className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
                  className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={resetPanZoom}
                  className="px-2 py-0.5 text-[10px] font-mono text-gray-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                >
                  {Math.round(zoomLevel * 100)}% Reset
                </button>
              </div>

              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-xs">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="font-bold text-emerald-300">Detailed Routing DRC Clean: 0 Shorts • 0 Opens</span>
              </div>

              {/* SVG CAD Canvas Wrapper */}
              <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
                }}
              >
                <svg
                  viewBox="0 0 540 640"
                  className="w-[490px] h-[580px] select-none filter drop-shadow-2xl"
                >
                  <defs>
                    {/* Hatched placement mesh pattern */}
                    <pattern id="placementMesh" width="10" height="10" patternUnits="userSpaceOnUse">
                      <rect width="10" height="10" fill="#FEF08A" fillOpacity="0.88" />
                      <path d="M 0 0 L 10 10 M 10 0 L 0 10" stroke="#CA8A04" strokeWidth="0.6" strokeOpacity="0.5" />
                    </pattern>
                  </defs>

                  {/* 1. Silicon Die Substrate Chassis */}
                  <rect
                    x="15"
                    y="15"
                    width="510"
                    height="610"
                    fill="#15171C"
                    stroke="#334155"
                    strokeWidth="3"
                    rx="12"
                  />

                  {/* 2. Standard Cell Hatched Placement Mesh Regions */}
                  {showPlacementMesh && (
                    <g id="placement_mesh_corridors">
                      {routingState.placementCorridors.map((corr) => (
                        <rect
                          key={corr.id}
                          x={corr.x}
                          y={corr.y}
                          width={corr.width}
                          height={corr.height}
                          fill="url(#placementMesh)"
                          stroke="#A16207"
                          strokeWidth="1.2"
                          rx="4"
                        />
                      ))}
                    </g>
                  )}

                  {/* 3. Stage 4 Clock Tree Backbone (Underlay in Orange/Amber) */}
                  {showCTSBackbone && (
                    <g id="cts_underlay_network" opacity="0.85">
                      {routingState.ctsUnderlay.trunks.map((t, idx) => (
                        <line
                          key={`cts_${idx}`}
                          x1={t.x1}
                          y1={t.y1}
                          x2={t.x2}
                          y2={t.y2}
                          stroke="#F59E0B"
                          strokeWidth={t.width}
                          strokeLinecap="round"
                        />
                      ))}
                    </g>
                  )}

                  {/* 4. 4 Corner Hard Macro Blocks */}
                  {routingState.macros.map((m) => (
                    <g
                      key={m.id}
                      onClick={() => setInspectedElement({ type: 'macro', data: m })}
                      className="cursor-pointer group"
                    >
                      {/* Macro Substrate Body */}
                      <rect
                        x={m.x}
                        y={m.y}
                        width={m.width}
                        height={m.height}
                        fill="#E2E8F0"
                        stroke="#64748B"
                        strokeWidth="2.5"
                        rx="6"
                        className="group-hover:fill-white transition-colors"
                      />

                      {/* "MACRO" Label (Matching user's reference font style) */}
                      <text
                        x={m.x + m.width / 2}
                        y={m.y + m.height / 2 + 8}
                        fill="#334155"
                        fontSize="22"
                        fontWeight="900"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                        letterSpacing="1"
                      >
                        MACRO
                      </text>
                    </g>
                  ))}

                  {/* 5. Central CORE AREA Box */}
                  <g id="core_area_box">
                    <rect
                      x={routingState.coreArea.x}
                      y={routingState.coreArea.y}
                      width={routingState.coreArea.width}
                      height={routingState.coreArea.height}
                      fill="#F1F5F9"
                      stroke="#475569"
                      strokeWidth="2.5"
                      rx="6"
                    />
                    <text
                      x={routingState.coreArea.x + routingState.coreArea.width / 2}
                      y={routingState.coreArea.y + routingState.coreArea.height / 2 + 6}
                      fill="#1E293B"
                      fontSize="17"
                      fontWeight="800"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      letterSpacing="0.8"
                    >
                      CORE AREA
                    </text>
                  </g>

                  {/* 6. GREEN DETAILED ROUTING WIRES (Orthogonal Manhattan Net Tracks) */}
                  <g id="signal_routing_wires">
                    {routingState.allSegments.map((seg) => {
                      if (!activeLayers[seg.layer]) return null;
                      const isSelected = selectedNetId === seg.netId;
                      return (
                        <line
                          key={seg.id}
                          x1={seg.from.x}
                          y1={seg.from.y}
                          x2={seg.to.x}
                          y2={seg.to.y}
                          stroke={isSelected ? '#38BDF8' : '#10B981'}
                          strokeWidth={isSelected ? 4.5 : seg.width}
                          strokeLinecap="round"
                          className="cursor-pointer hover:stroke-cyan-300 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNetId(seg.netId);
                            const net = routingState.nets.find(n => n.id === seg.netId);
                            if (net) setInspectedElement({ type: 'net', data: net });
                          }}
                        />
                      );
                    })}
                  </g>

                  {/* 7. PINK / MAGENTA VIAS (Contact cuts between orthogonal layers) */}
                  {showVias && (
                    <g id="routing_vias">
                      {routingState.allVias.map((via) => {
                        const isSelected = selectedNetId === via.netId;
                        return (
                          <g
                            key={via.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNetId(via.netId);
                              setInspectedElement({ type: 'via', data: via });
                            }}
                            className="cursor-pointer hover:scale-125 transition-transform"
                          >
                            <circle
                              cx={via.x}
                              cy={via.y}
                              r={isSelected ? 4.8 : 3.8}
                              fill="#EC4899"
                              stroke="#831843"
                              strokeWidth="1.2"
                            />
                            <circle
                              cx={via.x}
                              cy={via.y}
                              r="1.2"
                              fill="#FFFFFF"
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* 8. PINK / MAGENTA MACRO PERIMETER LANDING PINS */}
                  {showPins && (
                    <g id="macro_landing_pins">
                      {routingState.allPins.slice(0, 48).map((pin) => (
                        <g
                          key={pin.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedElement({ type: 'pin', data: pin });
                          }}
                          className="cursor-pointer group"
                        >
                          <circle
                            cx={pin.x}
                            cy={pin.y}
                            r="4.2"
                            fill="#F43F5E"
                            stroke="#881337"
                            strokeWidth="1.2"
                            className="group-hover:fill-pink-300 transition-colors"
                          />
                        </g>
                      ))}
                    </g>
                  )}
                </svg>
              </div>
            </div>
          )}

          {/* VIEW TAB 2: 3D INTERACTIVE SILICON STUDIO */}
          {viewTab === 'die_3d' && (
            <div className="flex-1 w-full min-h-[550px] h-full relative overflow-hidden bg-[#0D0E11] flex flex-col">
              <Routing3DViewer
                routingState={routingState}
                selectedNetId={selectedNetId}
                onSelectNet={(netId) => setSelectedNetId(netId)}
                onInspectElement={(elem) => setInspectedElement(elem)}
                activeLayers={activeLayers}
                showVias={showVias}
                showCTSBackbone={showCTSBackbone}
              />
            </div>
          )}

          {/* VIEW TAB 3: GLOBAL ROUTING CONGESTION HEATMAP */}
          {viewTab === 'congestion' && (
            <div className="flex-1 flex flex-col p-6 overflow-auto bg-[#101216]">
              <div className="max-w-4xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between bg-[#191B20] p-4 rounded-xl border border-white/10">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Flame size={14} className="text-amber-400" />
                      <span>Global Routing G-Cell Congestion & Overflow Heatmap</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Coarse $12 \times 14$ Global Routing Cells calculating edge wire demand vs available metal tracks.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-emerald-400 font-bold">0.0% Overflow</span>
                    <span className="text-gray-400">Peak Demand: {routingState.statistics.maxCongestionPercent}%</span>
                  </div>
                </div>

                {/* Heatmap Grid Visualizer */}
                <div className="bg-[#15171C] p-6 rounded-2xl border border-white/10 flex flex-col items-center">
                  <div className="grid grid-cols-12 gap-1 w-full max-w-[560px] aspect-[12/14] bg-black/40 p-2 rounded-xl border border-white/5">
                    {routingState.gCells.map((cell, idx) => {
                      const score = cell.congestionScore;
                      const bgColor = 
                        score > 1.0 ? 'bg-red-500' :
                        score > 0.85 ? 'bg-orange-500' :
                        score > 0.65 ? 'bg-amber-500' :
                        score > 0.40 ? 'bg-emerald-600' :
                        score > 0.15 ? 'bg-emerald-800' : 'bg-slate-900';

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredGCell(cell)}
                          onMouseLeave={() => setHoveredGCell(null)}
                          className={`rounded-sm transition-all cursor-pointer border border-black/30 flex items-center justify-center text-[8px] font-mono text-white/70 hover:scale-125 hover:z-20 hover:border-white shadow-sm ${bgColor}`}
                        >
                          {score > 0.7 ? `${Math.round(score * 100)}%` : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Heatmap Scale Legend */}
                  <div className="mt-4 flex items-center space-x-3 text-[11px] text-gray-400">
                    <span className="font-mono">Usage:</span>
                    <div className="flex items-center space-x-1">
                      <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-white/10"></span>
                      <span>0-15%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-3.5 h-3.5 rounded bg-emerald-800"></span>
                      <span>15-40%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-3.5 h-3.5 rounded bg-emerald-600"></span>
                      <span>40-65%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-3.5 h-3.5 rounded bg-amber-500"></span>
                      <span>65-85%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-3.5 h-3.5 rounded bg-orange-500"></span>
                      <span>85-100%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-3.5 h-3.5 rounded bg-red-500"></span>
                      <span>&gt;100% (Overflow)</span>
                    </div>
                  </div>

                  {/* Hovered G-Cell Tooltip */}
                  {hoveredGCell && (
                    <div className="mt-3 p-3 bg-black/80 rounded-xl border border-white/10 text-xs font-mono text-gray-300 flex items-center space-x-4">
                      <span>G-Cell ({hoveredGCell.col}, {hoveredGCell.row})</span>
                      <span>Horizontal: {hoveredGCell.horizontalUsage}/{hoveredGCell.horizontalCapacity} tracks</span>
                      <span>Vertical: {hoveredGCell.verticalUsage}/{hoveredGCell.verticalCapacity} tracks</span>
                      <span className="text-amber-400 font-bold">Congestion: {Math.round(hoveredGCell.congestionScore * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 4: LAYER STACK & NDR RULES */}
          {viewTab === 'layer_stack' && (
            <div className="flex-1 flex flex-col p-6 overflow-auto bg-[#101216]">
              <div className="max-w-3xl mx-auto w-full space-y-4">
                <div className="bg-[#191B20] p-4 rounded-xl border border-white/10">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} className="text-purple-400" />
                    <span>Multi-Layer Metal Interconnect Hierarchy (M1–M6)</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Alternating Manhattan routing tracks prevent cross-coupling capacitance and facilitate regular via matrix instantiation.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { layer: 'Metal 6', dir: 'Horizontal', pitch: '0.80 µm', res: '0.02 Ω/□', use: 'Top Power Grid (VDD/VSS Straps) & Global Clock Distribution', color: '#06B6D4' },
                    { layer: 'Metal 5', dir: 'Vertical', pitch: '0.40 µm', res: '0.04 Ω/□', use: 'Clock Tree Synthesis (CTS) Backbone & Critical Long Buses', color: '#EC4899' },
                    { layer: 'Metal 4', dir: 'Horizontal', pitch: '0.28 µm', res: '0.06 Ω/□', use: 'Intermediate Inter-Macro Data & Address Buses', color: '#F59E0B' },
                    { layer: 'Metal 3', dir: 'Vertical', pitch: '0.20 µm', res: '0.08 Ω/□', use: 'Channel Routing & Vertical Signal Jumpers', color: '#8B5CF6' },
                    { layer: 'Metal 2', dir: 'Horizontal', pitch: '0.14 µm', res: '0.10 Ω/□', use: 'Standard Cell Row Feeds & Local Signal Interconnects', color: '#3B82F6' },
                    { layer: 'Metal 1', dir: 'Vertical', pitch: '0.14 µm', res: '0.14 Ω/□', use: 'Standard Cell Internal Connections & Input/Output Pin Landing', color: '#10B981' },
                  ].map((m, idx) => (
                    <div key={idx} className="p-3 bg-[#16181D] rounded-xl border border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: m.color }} />
                        <div>
                          <span className="font-bold text-white">{m.layer}</span>
                          <span className="ml-2 font-mono text-[10px] text-gray-400">Direction: {m.dir}</span>
                          <p className="text-[11px] text-gray-300 mt-0.5">{m.use}</p>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className="text-gray-300">Pitch: {m.pitch}</div>
                        <div className="text-gray-500">R: {m.res}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 3 Cols: Routed Net Inspector & Routing Statistics */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col bg-[#141519] border-l border-white/10 p-4 space-y-4 overflow-y-auto">
          
          {/* Net Browser Search */}
          <div className="bg-[#191B20] rounded-2xl border border-white/10 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Activity size={14} className="text-purple-400" />
                <span>Routed Net Browser</span>
              </h3>
              <span className="text-[10px] font-mono text-gray-400">
                {routingState.nets.length} Nets
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter nets (e.g. BL_BUS, MEM)..."
                className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Net List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredNets.map(net => (
                <button
                  key={net.id}
                  onClick={() => setSelectedNetId(net.id)}
                  className={`w-full p-2 rounded-xl text-left transition-all border flex items-center justify-between text-xs ${
                    selectedNetId === net.id
                      ? 'bg-purple-500/20 border-purple-400 text-white font-semibold shadow-sm'
                      : 'bg-black/30 border-white/5 hover:border-white/15 text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: net.color }}></span>
                    <span className="font-mono text-[11px] truncate">{net.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">
                    {net.totalLengthUm} µm
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Net Quick Details */}
          {selectedNet && (
            <div className="bg-[#191B20] rounded-2xl border border-white/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Active Net Details
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                  {selectedNet.drcStatus}
                </span>
              </div>

              <div className="text-sm font-bold text-white font-mono">
                {selectedNet.name}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400">Total Wirelength</div>
                  <div className="text-xs font-bold text-white font-mono">{selectedNet.totalLengthUm} µm</div>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400">Elmore Delay</div>
                  <div className="text-xs font-bold text-amber-400 font-mono">{selectedNet.totalDelayPs} ps</div>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400">Resistance</div>
                  <div className="text-xs font-bold text-gray-200 font-mono">{selectedNet.totalResistanceOhm} Ω</div>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400">Capacitance</div>
                  <div className="text-xs font-bold text-gray-200 font-mono">{selectedNet.totalCapacitanceFf} fF</div>
                </div>
              </div>

              {/* Inspect Button */}
              <button
                onClick={() => setInspectedElement({ type: 'net', data: selectedNet })}
                className="w-full mt-2 py-1.5 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
              >
                <Sparkles size={13} className="text-purple-400" />
                <span>Inspect Physical Net Architecture ➔</span>
              </button>
            </div>
          )}

          {/* Physical Design Metrics */}
          <div className="bg-[#191B20] rounded-2xl border border-white/10 p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Sliders size={13} className="text-purple-400" />
              <span>Routing Quality Metrics</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Total Wirelength</div>
                <div className="text-xs font-bold text-white font-mono">{routingState.statistics.totalWirelengthMm} mm</div>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Via Count</div>
                <div className="text-xs font-bold text-pink-400 font-mono">{routingState.statistics.totalViaCount} Vias</div>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Congestion Overflow</div>
                <div className="text-xs font-bold text-emerald-400 font-mono">0.0% Clean</div>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-gray-400">Antenna Ratio</div>
                <div className="text-xs font-bold text-emerald-400 font-mono">PASS (&lt; 400)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showTclModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#16171B] border border-white/10 rounded-2xl max-w-xl w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Download size={16} className="text-purple-400" />
                <span>OpenROAD Detailed Routing Script</span>
              </div>
              <button onClick={() => setShowTclModal(false)} className="text-gray-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
            <pre className="p-3 bg-black/60 rounded-xl border border-white/5 text-[11px] font-mono text-purple-300 overflow-x-auto max-h-72">
              {tclScript}
            </pre>
            <div className="flex justify-end space-x-2">
              <button
                onClick={copyTcl}
                className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-md"
              >
                <Copy size={13} />
                <span>{copied ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Element Inspector Modal */}
      {inspectedElement && (
        <RoutingNetModal
          element={inspectedElement}
          onClose={() => setInspectedElement(null)}
        />
      )}
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Maximize2, 
  Layers, 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Eye, 
  EyeOff, 
  Download, 
  Copy, 
  RotateCcw,
  Zap,
  Info,
  Box,
  SplitSquareVertical,
  Cpu,
  Move,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  Play
} from 'lucide-react';
import { Placement3DViewer } from './Placement3DViewer';
import { PlacementCellCircuitView, StandardCellInfo } from './PlacementCellCircuitView';
import { getDynamicBackendData } from '../utils/dynamicPlacementEngine';

interface PlacementViewerProps {
  activeIcId?: string;
  activeComponentName?: string;
  onNavigateToNextStage?: () => void;
}

export function PlacementViewer({ 
  activeIcId = '7476', 
  activeComponentName = 'SN7476 Dual J-K Flip-Flop',
  onNavigateToNextStage
}: PlacementViewerProps) {
  // Dynamically generated cells & connections based on active IC
  const backendData = useMemo(() => {
    return getDynamicBackendData(activeIcId, activeComponentName);
  }, [activeIcId, activeComponentName]);

  const cells: StandardCellInfo[] = backendData.cells;
  const flylines = backendData.flylines;

  // Studio View Mode: 'cad2d' | '3d' | 'split'
  const [studioViewMode, setStudioViewMode] = useState<'cad2d' | '3d' | 'split'>('cad2d');

  // Heatmap View Mode inside 2D CAD
  const [cadOverlay, setCadOverlay] = useState<'cells' | 'density' | 'congestion'>('cells');

  // PDN & Layer Toggles
  const [showPdnRails, setShowPdnRails] = useState(true);
  const [showStrapsAndVias, setShowStrapsAndVias] = useState(true);
  const [showFlylines, setShowFlylines] = useState(true);
  const [showCellLabels, setShowCellLabels] = useState(true);
  const [showWellTaps, setShowWellTaps] = useState(true);

  // Optimization & Placement Settings
  const [placementMode, setPlacementMode] = useState<'global' | 'legalized' | 'timing_driven'>('legalized');
  const [targetDensity, setTargetDensity] = useState(72);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showTclModal, setShowTclModal] = useState(false);
  const [showCircuitModal, setShowCircuitModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedCell, setSelectedCell] = useState<StandardCellInfo | null>(cells[0] || null);

  useEffect(() => {
    if (cells && cells.length > 0) {
      setSelectedCell(cells[0]);
    }
  }, [activeIcId, activeComponentName]);

  const handleReoptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
    }, 600);
  };

  const tclScript = `# OpenROAD / Cadence Innovus Standard Cell Placement Script
# Target Design: ${activeComponentName}
# Step 3: Standard Cell Placement with PDN Power Interconnect

# 1. Placement Padding & Site Alignment
set_placement_padding -global -left 2 -right 2
set_site "unit_cell_16nm"

# 2. Global Placement with Wirelength & Timing Optimization
global_placement -density 0.${targetDensity} -timing_driven -wire_length_slack_ratio 0.35

# 3. Power Followpin Rail Abutment & Tap Cell Insertion
add_well_taps -cell TAPCELL_X1 -max_distance 30
add_decap_cells -cells "DECAP_X4 DECAP_X2" -power_net VDD -ground_net VSS

# 4. Detailed Legalization & DRC Check
estimate_parasitics -placement
repair_design
detailed_placement
check_placement -verbose

puts "Placement Complete: 0 Overlaps | Max IR-Drop = 19.8 mV | HPWL = 1.42 mm"`;

  const copyTcl = () => {
    navigator.clipboard.writeText(tclScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-gray-200 select-none overflow-hidden">
      {/* Top Header Toolbar */}
      <div className="px-4 py-2.5 bg-[#12141a] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Layers size={16} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Placement Studio</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                STAGE 3 â€¢ STANDARD CELLS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 size={10} />
                <span>LEGALIZED â€¢ 0 OVERLAPS</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              PDN followpin rails, well-tap anti-latchup, timing-driven placement & 3D silicon inspection
            </p>
          </div>
        </div>

        {/* View Mode Switcher (2D CAD / 3D View / Split) & Actions */}
        <div className="flex items-center space-x-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#090b10] border border-white/10 rounded-lg p-0.5 space-x-0.5">
            <button
              onClick={() => setStudioViewMode('cad2d')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center space-x-1.5 ${
                studioViewMode === 'cad2d'
                  ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="2D CAD Standard Cell Placement"
            >
              <Layers size={13} />
              <span>2D CAD</span>
            </button>

            <button
              onClick={() => setStudioViewMode('3d')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
                studioViewMode === '3d'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-blue-400 hover:text-blue-300'
              }`}
              title="Interactive 3D Silicon Placement Studio"
            >
              <Box size={13} />
              <span>3D View</span>
            </button>

            <button
              onClick={() => setStudioViewMode('split')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center space-x-1 ${
                studioViewMode === 'split'
                  ? 'bg-white/20 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Split View (2D CAD + 3D View Side-by-Side)"
            >
              <SplitSquareVertical size={13} />
              <span className="hidden sm:inline">Split</span>
            </button>
          </div>

          <button
            onClick={() => setShowTclModal(true)}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-gray-300 flex items-center space-x-1 transition-colors"
          >
            <Download size={12} />
            <span>TCL Script</span>
          </button>

          <button
            onClick={handleReoptimize}
            disabled={isOptimizing}
            className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-mono font-semibold flex items-center space-x-1 transition-all"
          >
            <RotateCcw size={12} className={isOptimizing ? 'animate-spin' : ''} />
            <span>{isOptimizing ? 'Legalizing...' : 'Legalize'}</span>
          </button>

          {onNavigateToNextStage && (
            <button
              onClick={onNavigateToNextStage}
              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-semibold flex items-center space-x-1 transition-all"
            >
              <span>Next: CTS âž”</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Body: Viewports + Right Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Central Viewport Area (2D, 3D, or Split) */}
        <div className="flex-1 flex overflow-hidden">
          {/* 1. 3D Silicon Placement Studio (Full or Split) */}
          {(studioViewMode === '3d' || studioViewMode === 'split') && (
            <div className={`${studioViewMode === 'split' ? 'w-1/2 border-r border-white/10' : 'w-full'} h-full flex flex-col`}>
              <Placement3DViewer
                cells={cells}
                selectedCell={selectedCell}
                onSelectCell={setSelectedCell}
                showFlylinesDefault={showFlylines}
                showPdnRailsDefault={showPdnRails}
                onSwitchTo2D={() => setStudioViewMode('cad2d')}
              />
            </div>
          )}

          {/* 2. 2D CAD Standard Cell Layout Viewport (Full or Split) */}
          {(studioViewMode === 'cad2d' || studioViewMode === 'split') && (
            <div className={`${studioViewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col h-full bg-[#07080c] overflow-hidden`}>
              {/* 2D CAD Toolbar: Heatmap, PDN Toggles, Layer Overlays */}
              <div className="h-9 px-3 bg-[#0d0f14] border-b border-white/10 flex items-center justify-between text-xs font-mono shrink-0">
                {/* Overlay Mode Switcher */}
                <div className="flex items-center space-x-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
                  <button
                    onClick={() => setCadOverlay('cells')}
                    className={`px-2 py-0.5 rounded ${cadOverlay === 'cells' ? 'bg-blue-500 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Cells
                  </button>
                  <button
                    onClick={() => setCadOverlay('density')}
                    className={`px-2 py-0.5 rounded ${cadOverlay === 'density' ? 'bg-blue-500 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Density
                  </button>
                  <button
                    onClick={() => setCadOverlay('congestion')}
                    className={`px-2 py-0.5 rounded ${cadOverlay === 'congestion' ? 'bg-blue-500 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Congestion
                  </button>
                </div>

                {/* PDN & Placement Feature Toggles */}
                <div className="flex items-center space-x-3 text-[11px] text-gray-300">
                  <label className="flex items-center space-x-1.5 cursor-pointer" title="M1 VDD & VSS Power Followpin Rails">
                    <input
                      type="checkbox"
                      checked={showPdnRails}
                      onChange={(e) => setShowPdnRails(e.target.checked)}
                      className="rounded bg-black/40 border-white/20 text-red-500 focus:ring-0"
                    />
                    <span className="flex items-center gap-1 text-red-300">
                      <Zap size={11} />
                      <span>M1 Rails</span>
                    </span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer" title="M6 Straps & Vias feeding power down">
                    <input
                      type="checkbox"
                      checked={showStrapsAndVias}
                      onChange={(e) => setShowStrapsAndVias(e.target.checked)}
                      className="rounded bg-black/40 border-white/20 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-emerald-300">M6 Straps</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFlylines}
                      onChange={(e) => setShowFlylines(e.target.checked)}
                      className="rounded bg-black/40 border-white/20 text-blue-500 focus:ring-0"
                    />
                    <span>Flylines</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCellLabels}
                      onChange={(e) => setShowCellLabels(e.target.checked)}
                      className="rounded bg-black/40 border-white/20 text-blue-500 focus:ring-0"
                    />
                    <span>Labels</span>
                  </label>
                </div>
              </div>

              {/* 2D Canvas Area */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-[#090b10]">
                {/* Coordinate Label */}
                <div className="absolute top-2 left-4 text-[10px] font-mono text-gray-500 flex items-center space-x-4 pointer-events-none">
                  <span>(0,0) Âµm ORIGIN</span>
                  <span>CORE: 310Âµm Ã— 230Âµm</span>
                  <span>CELLS: {cells.length}</span>
                  <span>UTIL: {targetDensity}%</span>
                </div>

                {/* SVG Die Canvas */}
                <svg viewBox="0 0 400 320" className="w-full max-w-[560px] h-auto select-none font-mono">
                  {/* Die Base */}
                  <rect x="20" y="20" width="360" height="280" fill="#141518" stroke="#374151" strokeWidth="2" rx="6" />
                  {/* Core Boundary */}
                  <rect x="45" y="45" width="310" height="230" fill="#1a1c22" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4 2" />

                  {/* Standard Cell Rows Sites */}
                  {[70, 125, 180, 235].map((rowY, idx) => (
                    <g key={idx}>
                      <rect x="48" y={rowY} width="304" height="28" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                      <line x1="48" y1={rowY + 28} x2="352" y2={rowY + 28} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.8" />
                    </g>
                  ))}

                  {/* M1 Power Followpin Rails (PDN Interconnect!) */}
                  {showPdnRails && (
                    <g>
                      {[70, 125, 180, 235].map((rowY, idx) => (
                        <g key={`rail_${idx}`}>
                          {/* Top Rail: VDD (Red) */}
                          <line x1="46" y1={rowY} x2="354" y2={rowY} stroke="#ef4444" strokeWidth="2.5" strokeOpacity="0.85" />
                          {/* Bottom Rail: VSS (Cyan) */}
                          <line x1="46" y1={rowY + 28} x2="354" y2={rowY + 28} stroke="#06b6d4" strokeWidth="2.5" strokeOpacity="0.85" />
                        </g>
                      ))}
                    </g>
                  )}

                  {/* M6 Vertical Power Straps & Dropping Vias */}
                  {showStrapsAndVias && (
                    <g>
                      {[110, 190, 270].map((sX, sIdx) => {
                        const isVdd = sIdx % 2 === 0;
                        return (
                          <g key={`v_strap_${sIdx}`}>
                            {/* Vertical Strap Line */}
                            <line 
                              x1={sX} 
                              y1="40" 
                              x2={sX} 
                              y2="280" 
                              stroke={isVdd ? '#22c55e' : '#06b6d4'} 
                              strokeWidth="4" 
                              strokeOpacity="0.5" 
                            />
                            {/* Dropping Vias onto horizontal rails */}
                            {[70, 125, 180, 235].map((rY, rIdx) => (
                              <circle 
                                key={`via_${sIdx}_${rIdx}`} 
                                cx={sX} 
                                cy={isVdd ? rY : rY + 28} 
                                r="2.5" 
                                fill="#fbbf24" 
                                stroke="#78350f" 
                                strokeWidth="0.8" 
                              />
                            ))}
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Density or Congestion Heatmap Overlays */}
                  {cadOverlay === 'density' && (
                    <g opacity="0.65">
                      <rect x="60" y="55" width="120" height="100" fill="#10b981" opacity="0.4" />
                      <rect x="180" y="55" width="150" height="100" fill="#f59e0b" opacity="0.5" />
                      <rect x="60" y="155" width="140" height="100" fill="#3b82f6" opacity="0.4" />
                      <rect x="200" y="155" width="130" height="100" fill="#ef4444" opacity="0.5" />
                    </g>
                  )}

                  {cadOverlay === 'congestion' && (
                    <g opacity="0.55">
                      <rect x="140" y="100" width="100" height="80" fill="#ef4444" />
                      <rect x="80" y="180" width="100" height="70" fill="#f59e0b" />
                      <rect x="220" y="60" width="100" height="90" fill="#10b981" />
                    </g>
                  )}

                  {/* Flylines (Unrouted Nets) */}
                  {showFlylines && cadOverlay === 'cells' && (
                    <g stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6">
                      {flylines.map((fl, i) => (
                        <line key={i} x1={fl.from.x} y1={fl.from.y} x2={fl.to.x} y2={fl.to.y} />
                      ))}
                    </g>
                  )}

                  {/* Standard Cells */}
                  {cells.map((cell) => {
                    const isSelected = selectedCell?.id === cell.id;
                    return (
                      <g 
                        key={cell.id} 
                        onClick={() => setSelectedCell(cell)}
                        className="cursor-pointer transition-transform group"
                      >
                        {/* Cell Body */}
                        <rect
                          x={cell.x}
                          y={cell.y}
                          width={cell.w}
                          height={cell.h}
                          fill={cell.color}
                          fillOpacity={isSelected ? 0.95 : 0.75}
                          stroke={isSelected ? '#38bdf8' : cell.color}
                          strokeWidth={isSelected ? 2.5 : 1}
                          rx="3"
                          className="transition-all"
                        />

                        {/* Top VDD Pin Abutment Notch */}
                        <rect x={cell.x + cell.w / 2 - 3} y={cell.y - 1} width="6" height="3" fill="#ef4444" />
                        {/* Bottom VSS Pin Abutment Notch */}
                        <rect x={cell.x + cell.w / 2 - 3} y={cell.y + cell.h - 2} width="6" height="3" fill="#06b6d4" />

                        {/* Cell Label */}
                        {showCellLabels && (
                          <text
                            x={cell.x + cell.w / 2}
                            y={cell.y + cell.h / 2 + 3}
                            fill="#ffffff"
                            fontSize="7.5"
                            fontWeight="bold"
                            textAnchor="middle"
                            pointerEvents="none"
                          >
                            {cell.type}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* IO Pads at perimeter */}
                  <rect x="25" y="140" width="15" height="40" fill="#f59e0b" rx="2" />
                  <text x="32" y="163" fill="#ffffff" fontSize="6" textAnchor="middle" transform="rotate(-90 32 163)">CLK_PAD</text>

                  <rect x="180" y="25" width="40" height="15" fill="#ef4444" rx="2" />
                  <text x="200" y="35" fill="#ffffff" fontSize="6" textAnchor="middle">VDD_PAD</text>

                  <rect x="360" y="140" width="15" height="40" fill="#3b82f6" rx="2" />
                  <text x="368" y="163" fill="#ffffff" fontSize="6" textAnchor="middle" transform="rotate(90 368 163)">OUT_PAD</text>
                </svg>

                {/* Legend at bottom left */}
                <div className="absolute bottom-3 left-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono flex items-center space-x-3 pointer-events-none">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#10b981]"></span>
                    <span className="text-gray-300">Combinational</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#8b5cf6]"></span>
                    <span className="text-gray-300">Sequential (DFF)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#f59e0b]"></span>
                    <span className="text-gray-300">Clock Buffer</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#06b6d4]"></span>
                    <span className="text-gray-300">Well Tap / Decap</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector & Circuit Detail Panel */}
        <div className="w-[420px] max-w-[45vw] bg-[#12141a] border-l border-white/10 flex flex-col h-full overflow-hidden shrink-0">
          {selectedCell ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Cell Header Banner */}
              <div className="p-3.5 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-transparent to-transparent shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCell.color }} />
                    <span className="font-mono text-sm font-bold text-white">{selectedCell.name}</span>
                  </div>
                  <button
                    onClick={() => setShowCircuitModal(true)}
                    className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-mono font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <Maximize2 size={12} />
                    <span>Expand Circuit</span>
                  </button>
                </div>
                <div className="mt-1 flex items-center space-x-2 text-[11px] font-mono text-gray-400">
                  <span>Type: <strong className="text-gray-200">{selectedCell.type}</strong></span>
                  <span>â€¢</span>
                  <span>Drive: <strong className="text-emerald-400">{selectedCell.driveStrength}</strong></span>
                  <span>â€¢</span>
                  <span>Fanout: <strong className="text-blue-400">{selectedCell.fanout} Pins</strong></span>
                </div>
              </div>

              {/* Embedded Circuit Schematic & PDN Interconnect View */}
              <div className="flex-1 overflow-hidden">
                <PlacementCellCircuitView cell={selectedCell} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 font-mono text-xs">
              <Cpu size={32} className="text-gray-600 mb-2" />
              <span>Select any standard cell or block to inspect its CMOS transistor circuit & PDN connection</span>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Interactive Circuit Schematic Modal */}
      {showCircuitModal && selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <PlacementCellCircuitView
            cell={selectedCell}
            isModal={true}
            onClose={() => setShowCircuitModal(false)}
          />
        </div>
      )}

      {/* TCL Script Modal */}
      {showTclModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#14161d] border border-white/10 rounded-2xl max-w-xl w-full p-4 shadow-2xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Download size={16} className="text-blue-400" />
                <span>OpenROAD / Innovus Standard Cell Placement Script</span>
              </div>
              <button onClick={() => setShowTclModal(false)} className="text-gray-400 hover:text-white text-xs">
                âœ•
              </button>
            </div>
            <pre className="p-3 bg-black/60 rounded-xl border border-white/5 text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
              {tclScript}
            </pre>
            <div className="flex justify-end space-x-2">
              <button
                onClick={copyTcl}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
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



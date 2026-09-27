import React, { useState, useRef } from 'react';
import { 
  FloorplanConfig, 
  MacroBlock, 
  IOPad, 
  PhysicalDRCError, 
  MacroOrientation 
} from '../types/physicalDesign';
import { 
  checkFloorplanDRC, 
  autoArrangeMacros, 
  generateOpenRoadFloorplanTcl, 
  generateInnovusTcl, 
  createDefaultPowerPlan 
} from '../utils/physicalDesignEngine';
import { 
  getMacroDetail, 
  InteractiveCircuitSchematic, 
  MACRO_KNOWLEDGE_BASE 
} from './MacroCircuitDetailView';
import { Floorplan3DViewer } from './Floorplan3DViewer';
import { 
  Maximize2, 
  RotateCw, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Copy, 
  Eye, 
  EyeOff, 
  Layers, 
  Sliders, 
  Plus, 
  Trash2, 
  FileCode, 
  Info,
  Move,
  Cpu,
  Zap,
  Activity,
  Binary,
  ShieldCheck,
  X,
  Box,
  SplitSquareVertical
} from 'lucide-react';

interface FloorplanViewerProps {
  config: FloorplanConfig;
  onChangeConfig: (newConfig: FloorplanConfig) => void;
  onResetToRtl?: () => void;
  activeIcId?: string;
  activeComponentName?: string;
}

export function FloorplanViewer({ 
  config, 
  onChangeConfig, 
  onResetToRtl,
  activeIcId = '7476',
  activeComponentName = 'SN7476 Dual J-K Flip-Flop'
}: FloorplanViewerProps) {
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cad2d' | '3d' | 'split'>('cad2d');
  const [showHalos, setShowHalos] = useState(true);
  const [showFlylines, setShowFlylines] = useState(true);
  const [showStdCellRows, setShowStdCellRows] = useState(true);
  const [showDrcPanel, setShowDrcPanel] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showCircuitModal, setShowCircuitModal] = useState(false);
  const [activeMacroTab, setActiveMacroTab] = useState<'schematic' | 'specs' | 'placement'>('schematic');
  const [scriptType, setScriptType] = useState<'openroad' | 'innovus'>('openroad');
  const [copied, setCopied] = useState(false);

  // Dragging state
  const [draggingMacroId, setDraggingMacroId] = useState<string | null>(null);
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; origX: number; origY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const drcErrors = checkFloorplanDRC(config);
  const hasErrors = drcErrors.some(e => e.severity === 'error');
  const hasWarnings = drcErrors.some(e => e.severity === 'warning');

  const coreW = config.dieWidth - config.coreMarginLeft - config.coreMarginRight;
  const coreH = config.dieHeight - config.coreMarginTop - config.coreMarginBottom;
  const totalCoreArea = coreW * coreH;
  const macroArea = config.macros.reduce((sum, m) => sum + (m.width * m.height), 0);
  const macroUtilizationPercent = ((macroArea / totalCoreArea) * 100);

  const selectedMacro = config.macros.find(m => m.id === selectedMacroId);

  // Drag handling
  const handleMouseDown = (macro: MacroBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMacroId(macro.id);
    setDraggingMacroId(macro.id);
    dragStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      origX: macro.x,
      origY: macro.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingMacroId || !dragStartPos.current || !svgRef.current) return;

    // Compute scale factor of SVG
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = config.dieWidth / rect.width;
    const scaleY = config.dieHeight / rect.height;

    const deltaX = (e.clientX - dragStartPos.current.mouseX) * scaleX;
    const deltaY = (e.clientY - dragStartPos.current.mouseY) * scaleY;

    const newX = Math.round(dragStartPos.current.origX + deltaX);
    const newY = Math.round(dragStartPos.current.origY + deltaY);

    const updatedMacros = config.macros.map(m => {
      if (m.id === draggingMacroId) {
        return {
          ...m,
          x: Math.max(0, Math.min(newX, coreW - m.width)),
          y: Math.max(0, Math.min(newY, coreH - m.height))
        };
      }
      return m;
    });

    onChangeConfig({
      ...config,
      macros: updatedMacros
    });
  };

  const handleMouseUp = () => {
    setDraggingMacroId(null);
    dragStartPos.current = null;
  };

  const handleUpdateSelectedMacro = (field: keyof MacroBlock, value: any) => {
    if (!selectedMacroId) return;
    const updated = config.macros.map(m => {
      if (m.id === selectedMacroId) {
        return { ...m, [field]: value };
      }
      return m;
    });
    onChangeConfig({ ...config, macros: updated });
  };

  const handleAutoArrange = () => {
    const optimized = autoArrangeMacros(config);
    onChangeConfig(optimized);
  };

  const handleAddMacro = () => {
    const newId = `macro_${Date.now()}`;
    const newMacro: MacroBlock = {
      id: newId,
      name: `IP_BLOCK_${config.macros.length + 1}`,
      type: 'custom',
      x: 30,
      y: 30,
      width: 160,
      height: 140,
      halo: 10,
      orientation: 'R0',
      pins: [
        { name: 'IN', relX: 0, relY: 0.5, type: 'input' },
        { name: 'OUT', relX: 1, relY: 0.5, type: 'output' }
      ],
      connectedPadIds: []
    };
    onChangeConfig({
      ...config,
      macros: [...config.macros, newMacro]
    });
    setSelectedMacroId(newId);
  };

  const handleDeleteMacro = (id: string) => {
    onChangeConfig({
      ...config,
      macros: config.macros.filter(m => m.id !== id)
    });
    if (selectedMacroId === id) setSelectedMacroId(null);
  };

  const handleCopyScript = () => {
    const dummyPp = createDefaultPowerPlan();
    const script = scriptType === 'openroad' 
      ? generateOpenRoadFloorplanTcl(config, dummyPp) 
      : generateInnovusTcl(config, dummyPp);
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preset Floorplans
  const handleLoadPreset = (presetKey: string) => {
    if (presetKey === 'riscv') {
      const riscvMacros: MacroBlock[] = [
        {
          id: 'm_icache',
          name: 'I_CACHE_SRAM_8KB',
          type: 'sram',
          x: 40,
          y: 40,
          width: 250,
          height: 220,
          halo: 15,
          orientation: 'R0',
          pins: [{ name: 'CLK', relX: 0.5, relY: 0, type: 'clock' }],
          connectedPadIds: []
        },
        {
          id: 'm_dcache',
          name: 'D_CACHE_SRAM_8KB',
          type: 'sram',
          x: 410,
          y: 40,
          width: 250,
          height: 220,
          halo: 15,
          orientation: 'R0',
          pins: [{ name: 'CLK', relX: 0.5, relY: 0, type: 'clock' }],
          connectedPadIds: []
        },
        {
          id: 'm_regfile',
          name: 'RF_32x32_DUAL_PORT',
          type: 'regfile',
          x: 40,
          y: 380,
          width: 240,
          height: 260,
          halo: 15,
          orientation: 'R0',
          pins: [{ name: 'CLK', relX: 0.5, relY: 0, type: 'clock' }],
          connectedPadIds: []
        },
        {
          id: 'm_alu_mul',
          name: 'RV32M_MUL_DIV_UNIT',
          type: 'alu',
          x: 420,
          y: 400,
          width: 240,
          height: 240,
          halo: 15,
          orientation: 'R0',
          pins: [{ name: 'A', relX: 0, relY: 0.5, type: 'input' }],
          connectedPadIds: []
        }
      ];
      onChangeConfig({
        ...config,
        macros: riscvMacros
      });
    } else if (presetKey === 'systolic') {
      const peMacros: MacroBlock[] = [
        { id: 'pe_00', name: 'PE_ARRAY_QUAD_0', type: 'dsp', x: 50, y: 50, width: 260, height: 260, halo: 12, orientation: 'R0', pins: [], connectedPadIds: [] },
        { id: 'pe_01', name: 'PE_ARRAY_QUAD_1', type: 'dsp', x: 390, y: 50, width: 260, height: 260, halo: 12, orientation: 'R0', pins: [], connectedPadIds: [] },
        { id: 'pe_10', name: 'PE_ARRAY_QUAD_2', type: 'dsp', x: 50, y: 390, width: 260, height: 260, halo: 12, orientation: 'R0', pins: [], connectedPadIds: [] },
        { id: 'pe_11', name: 'WEIGHT_BUFFER_SRAM', type: 'sram', x: 390, y: 390, width: 260, height: 260, halo: 12, orientation: 'R0', pins: [], connectedPadIds: [] }
      ];
      onChangeConfig({
        ...config,
        macros: peMacros
      });
    }
  };

  const getMacroColor = (type: MacroBlock['type']) => {
    switch (type) {
      case 'alu': return { fill: 'rgba(168, 85, 247, 0.15)', stroke: '#a855f7', text: '#c084fc' };
      case 'sram': return { fill: 'rgba(6, 182, 212, 0.15)', stroke: '#06b6d4', text: '#22d3ee' };
      case 'regfile': return { fill: 'rgba(16, 185, 129, 0.15)', stroke: '#10b981', text: '#34d399' };
      case 'shifter': return { fill: 'rgba(99, 102, 241, 0.15)', stroke: '#6366f1', text: '#818cf8' };
      case 'dsp': return { fill: 'rgba(236, 72, 153, 0.15)', stroke: '#ec4899', text: '#f472b6' };
      default: return { fill: 'rgba(245, 158, 11, 0.15)', stroke: '#f59e0b', text: '#fbbf24' };
    }
  };

  const getPadColor = (type: IOPad['type']) => {
    switch (type) {
      case 'power': return '#ef4444'; // Red for VDD
      case 'ground': return '#06b6d4'; // Cyan for VSS
      case 'clock': return '#f59e0b'; // Amber
      case 'output': return '#3b82f6'; // Blue
      default: return '#10b981'; // Emerald for Input
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-gray-200 select-none">
      {/* Top Toolbar */}
      <div className="p-3 bg-[#151619] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Maximize2 size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-gray-100">Floorplan Studio</h2>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold font-mono flex items-center space-x-1.5">
            <Cpu size={12} className="text-cyan-400" />
            <span>{activeComponentName}</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            {config.dieWidth}µm × {config.dieHeight}µm
          </span>

          {/* DRC Status Badge */}
          <button
            onClick={() => setShowDrcPanel(!showDrcPanel)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              hasErrors
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : hasWarnings
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
            {hasErrors ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
            <span>{hasErrors ? `${drcErrors.filter(e => e.severity === 'error').length} DRC Errors` : hasWarnings ? `${drcErrors.length} DRC Warnings` : 'DRC Clean'}</span>
          </button>

          {/* View Mode Switcher (2D CAD / 3D View / Split) */}
          <div className="flex items-center bg-[#0d0e12] border border-white/10 rounded-lg p-0.5 space-x-0.5">
            <button
              onClick={() => setViewMode('cad2d')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center space-x-1.5 ${
                viewMode === 'cad2d'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="2D CAD Floorplan (Interactive Drag & Drop)"
            >
              <Layers size={13} />
              <span>2D CAD</span>
            </button>

            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === '3d'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-cyan-400 hover:text-cyan-300'
              }`}
              title="Interactive 3D Silicon Floorplan Studio"
            >
              <Box size={13} />
              <span>3D View</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center space-x-1 ${
                viewMode === 'split'
                  ? 'bg-white/20 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Split View (2D CAD + 3D View Side-by-Side)"
            >
              <SplitSquareVertical size={13} />
              <span className="hidden sm:inline">Split</span>
            </button>
          </div>
        </div>

        {/* View & Optimization Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <select 
            onChange={(e) => handleLoadPreset(e.target.value)}
            defaultValue=""
            className="bg-[#1A1C20] border border-white/10 rounded px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/40"
          >
            <option value="" disabled>Load Architecture Preset</option>
            <option value="riscv">RISC-V 32I RV32 Core</option>
            <option value="systolic">Systolic Array (AI Accelerator)</option>
          </select>

          {onResetToRtl && (
            <button
              onClick={onResetToRtl}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded text-xs flex items-center space-x-1.5 transition-colors"
              title="Derive Floorplan from RTL"
            >
              <span>Sync from RTL</span>
            </button>
          )}

          <button
            onClick={handleAutoArrange}
            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title="Auto-arrange macros around corners"
          >
            <Sparkles size={13} />
            <span>Auto Floorplan</span>
          </button>

          <button
            onClick={handleAddMacro}
            className="px-2.5 py-1 bg-[#1A1C20] hover:bg-white/10 text-gray-300 border border-white/10 rounded text-xs flex items-center space-x-1 transition-colors"
          >
            <Plus size={13} />
            <span>Add Block</span>
          </button>

          {/* Toggle buttons */}
          <button
            onClick={() => setShowHalos(!showHalos)}
            className={`p-1.5 rounded text-xs border transition-colors ${showHalos ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}
            title="Toggle Placement Halos"
          >
            <Layers size={14} />
          </button>

          <button
            onClick={() => setShowFlylines(!showFlylines)}
            className={`p-1.5 rounded text-xs border transition-colors ${showFlylines ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}
            title="Toggle Flightlines (I/O connectivity)"
          >
            <Move size={14} />
          </button>

          <button
            onClick={() => setShowScriptModal(true)}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded text-xs flex items-center space-x-1.5 transition-colors"
          >
            <FileCode size={13} />
            <span>Export TCL</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Central Layout Viewport (2D CAD, 3D View, or Split View) */}
        <div className="flex-1 flex overflow-hidden">
          {/* 3D Silicon Floorplan View (Full or Split) */}
          {(viewMode === '3d' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-white/10' : 'w-full'} h-full flex flex-col`}>
              <Floorplan3DViewer
                config={config}
                selectedMacroId={selectedMacroId}
                onSelectMacro={setSelectedMacroId}
                showHalosDefault={showHalos}
                showFlylinesDefault={showFlylines}
                onSwitchTo2D={() => setViewMode('cad2d')}
              />
            </div>
          )}

          {/* 2D CAD Layout Canvas (Full or Split) */}
          {(viewMode === 'cad2d' || viewMode === 'split') && (
            <div 
              className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-auto p-6 flex items-center justify-center relative bg-[#0d0e12]`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
          {/* Canvas Container */}
          <div className="relative border border-white/10 rounded-xl bg-[#131418] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6">
            {/* Coordinate Label */}
            <div className="absolute top-2 left-4 text-[10px] font-mono text-gray-500 flex items-center space-x-4">
              <span>(0,0) µm ORIGIN</span>
              <span>CORE: {coreW}µm × {coreH}µm</span>
              <span>UTIL: {macroUtilizationPercent.toFixed(1)}%</span>
            </div>

            {/* SVG Die Canvas */}
            <svg
              ref={svgRef}
              width={560}
              height={560}
              viewBox={`0 0 ${config.dieWidth} ${config.dieHeight}`}
              className="overflow-visible select-none cursor-default"
              onClick={(e) => {
                if (e.target === svgRef.current || (e.target as Element).tagName === 'svg') {
                  setSelectedMacroId(null);
                }
              }}
            >
              <defs>
                {/* Placement Halo Hatch Pattern */}
                <pattern id="haloHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4" />
                </pattern>
                {/* Standard Cell Row Pattern */}
                <pattern id="stdCellRows" width="100" height={config.stdCellRowHeight * 4} patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                </pattern>
                {/* Selected Pulse Glow Filter */}
                <filter id="selectionGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 1. Die Chassis Background */}
              <rect
                x={0}
                y={0}
                width={config.dieWidth}
                height={config.dieHeight}
                fill="#15161b"
                stroke="#374151"
                strokeWidth={2}
                rx={6}
              />

              {/* 2. Core Area */}
              <rect
                x={config.coreMarginLeft}
                y={config.coreMarginTop}
                width={coreW}
                height={coreH}
                fill="#0f1015"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                strokeOpacity={0.7}
              />

              {/* 3. Standard Cell Rows */}
              {showStdCellRows && (
                <rect
                  x={config.coreMarginLeft}
                  y={config.coreMarginTop}
                  width={coreW}
                  height={coreH}
                  fill="url(#stdCellRows)"
                  pointerEvents="none"
                />
              )}

              {/* 4. Flightlines connecting Macros to I/O Pads */}
              {showFlylines && config.macros.map(m => {
                const macroCenterX = config.coreMarginLeft + m.x + m.width / 2;
                const macroCenterY = config.coreMarginTop + m.y + m.height / 2;
                const isSelected = selectedMacroId === m.id;

                return m.connectedPadIds.map(padId => {
                  const pad = config.ioPads.find(p => p.id === padId);
                  if (!pad) return null;

                  let padX = 0;
                  let padY = 0;
                  if (pad.side === 'left') {
                    padX = pad.height / 2;
                    padY = pad.offset;
                  } else if (pad.side === 'right') {
                    padX = config.dieWidth - pad.height / 2;
                    padY = pad.offset;
                  } else if (pad.side === 'top') {
                    padX = pad.offset;
                    padY = pad.height / 2;
                  } else {
                    padX = pad.offset;
                    padY = config.dieHeight - pad.height / 2;
                  }

                  return (
                    <line
                      key={`${m.id}-${pad.id}`}
                      x1={macroCenterX}
                      y1={macroCenterY}
                      x2={padX}
                      y2={padY}
                      stroke={isSelected ? '#38bdf8' : '#10b981'}
                      strokeWidth={isSelected ? 1.8 : 1}
                      strokeOpacity={isSelected ? 0.9 : 0.3}
                      strokeDasharray={isSelected ? 'none' : '3 3'}
                    />
                  );
                });
              })}

              {/* 5. Hierarchical Macros */}
              {config.macros.map((macro) => {
                const colors = getMacroColor(macro.type);
                const isSelected = selectedMacroId === macro.id;
                const isDragging = draggingMacroId === macro.id;
                const absX = config.coreMarginLeft + macro.x;
                const absY = config.coreMarginTop + macro.y;

                return (
                  <g
                    key={macro.id}
                    transform={`translate(${absX}, ${absY})`}
                    className="cursor-pointer group"
                    onMouseDown={(e) => handleMouseDown(macro, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMacroId(macro.id);
                    }}
                  >
                    {/* Placement Halo */}
                    {showHalos && macro.halo > 0 && (
                      <rect
                        x={-macro.halo}
                        y={-macro.halo}
                        width={macro.width + macro.halo * 2}
                        height={macro.height + macro.halo * 2}
                        fill="url(#haloHatch)"
                        stroke={isSelected ? '#38bdf8' : '#f59e0b'}
                        strokeWidth={isSelected ? 1.5 : 1}
                        strokeDasharray="3 3"
                        strokeOpacity={isSelected ? 0.8 : 0.5}
                        rx={3}
                      />
                    )}

                    {/* Macro Body */}
                    <rect
                      x={0}
                      y={0}
                      width={macro.width}
                      height={macro.height}
                      fill={isSelected ? `${colors.stroke}33` : colors.fill}
                      stroke={isSelected ? '#38bdf8' : colors.stroke}
                      strokeWidth={isSelected ? 3 : 1.5}
                      rx={4}
                      filter={isSelected ? 'url(#selectionGlow)' : 'none'}
                      style={{
                        transition: 'stroke 0.2s, stroke-width 0.2s, fill 0.2s'
                      }}
                    />

                    {/* Active Selection Glow Ring & Corner Brackets */}
                    {isSelected && (
                      <g>
                        <rect
                          x={-2}
                          y={-2}
                          width={macro.width + 4}
                          height={macro.height + 4}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={1.5}
                          strokeDasharray="6 3"
                          rx={6}
                        />
                        {/* 4 Corner L-Brackets */}
                        <path
                          d={`M 0 10 L 0 0 L 10 0 M ${macro.width - 10} 0 L ${macro.width} 0 L ${macro.width} 10 M ${macro.width} ${macro.height - 10} L ${macro.width} ${macro.height} L ${macro.width - 10} ${macro.height} M 10 ${macro.height} L 0 ${macro.height} L 0 ${macro.height - 10}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={2.5}
                        />
                        {/* Selected Tag Badge */}
                        <g transform="translate(0, -18)">
                          <rect x="0" y="0" width={Math.min(macro.width, 130)} height="16" rx="3" fill="#0284c7" />
                          <text x={Math.min(macro.width, 130) / 2} y="11" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                            SELECTED • LOGIC
                          </text>
                        </g>
                      </g>
                    )}

                    {/* Macro Orientation Badge */}
                    <rect
                      x={macro.width - 28}
                      y={4}
                      width={24}
                      height={14}
                      fill="#1e2029"
                      rx={2}
                    />
                    <text
                      x={macro.width - 16}
                      y={14}
                      fill="#9ca3af"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {macro.orientation}
                    </text>

                    {/* Macro Name & Type */}
                    <text
                      x={macro.width / 2}
                      y={macro.height / 2 - 8}
                      fill={isSelected ? '#ffffff' : colors.text}
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {macro.name}
                    </text>
                    <text
                      x={macro.width / 2}
                      y={macro.height / 2 + 8}
                      fill="#9ca3af"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {macro.width}µm × {macro.height}µm
                    </text>
                    <text
                      x={macro.width / 2}
                      y={macro.height / 2 + 20}
                      fill="#6b7280"
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      HALO: {macro.halo}µm
                    </text>

                    {/* Macro Pins */}
                    {macro.pins.map((pin, pIdx) => {
                      const pinX = pin.relX * macro.width;
                      const pinY = pin.relY * macro.height;
                      return (
                        <circle
                          key={pIdx}
                          cx={pinX}
                          cy={pinY}
                          r={3.5}
                          fill={pin.type === 'clock' ? '#f59e0b' : pin.type === 'output' ? '#3b82f6' : '#10b981'}
                          stroke="#111827"
                          strokeWidth={1}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* 6. I/O Pad Ring around Perimeter */}
              {config.ioPads.map((pad) => {
                const color = getPadColor(pad.type);
                let x = 0;
                let y = 0;
                let w = pad.width;
                let h = pad.height;

                if (pad.side === 'top') {
                  x = pad.offset - pad.width / 2;
                  y = 4;
                  w = pad.width;
                  h = pad.height;
                } else if (pad.side === 'bottom') {
                  x = pad.offset - pad.width / 2;
                  y = config.dieHeight - pad.height - 4;
                  w = pad.width;
                  h = pad.height;
                } else if (pad.side === 'left') {
                  x = 4;
                  y = pad.offset - pad.width / 2;
                  w = pad.height;
                  h = pad.width;
                } else if (pad.side === 'right') {
                  x = config.dieWidth - pad.height - 4;
                  y = pad.offset - pad.width / 2;
                  w = pad.height;
                  h = pad.width;
                }

                return (
                  <g key={pad.id} className="group cursor-pointer">
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill={color}
                      fillOpacity={0.8}
                      stroke="#ffffff"
                      strokeWidth={0.8}
                      rx={2}
                    />
                    {/* Tooltip on hover */}
                    <title>{`${pad.name} (${pad.type.toUpperCase()}) - ${pad.side} @ ${pad.offset}µm`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>

    {/* Right Inspector & Settings Panel */}
        <div className="w-[440px] max-w-[48vw] bg-[#151619] border-l border-white/10 flex flex-col h-full overflow-hidden shrink-0">
          {/* Selected Macro Inspector */}
          {selectedMacro ? (
            (() => {
              const macroDetail = getMacroDetail(selectedMacro.name, selectedMacro.type);
              const macroColors = getMacroColor(selectedMacro.type);

              return (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Macro Header Banner */}
                  <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3.5 h-3.5 rounded-sm shadow-[0_0_8px]"
                          style={{ backgroundColor: macroColors.stroke, boxShadow: `0 0 10px ${macroColors.stroke}` }}
                        />
                        <span className="font-mono text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {selectedMacro.type.toUpperCase()} IP
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {selectedMacro.width}µm × {selectedMacro.height}µm
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setShowCircuitModal(true)}
                          className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 rounded transition-colors"
                          title="Open Fullscreen Circuit Diagram"
                        >
                          <Maximize2 size={14} />
                        </button>
                        <button
                          onClick={() => setSelectedMacroId(null)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                          title="Close Panel"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-mono text-base font-bold text-white tracking-tight flex items-center space-x-2">
                      <span>{selectedMacro.name}</span>
                    </h3>
                    <p className="text-xs text-gray-400 font-sans mt-0.5">
                      {macroDetail.title}
                    </p>

                    {/* Navigation Tabs */}
                    <div className="flex items-center space-x-1 mt-3 p-1 bg-black/40 rounded-lg border border-white/10 text-xs">
                      <button
                        onClick={() => setActiveMacroTab('schematic')}
                        className={`flex-1 py-1.5 rounded-md font-mono text-[11px] font-medium transition-all flex items-center justify-center space-x-1.5 ${
                          activeMacroTab === 'schematic'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <Activity size={13} />
                        <span>Circuit Diagram</span>
                      </button>
                      <button
                        onClick={() => setActiveMacroTab('specs')}
                        className={`flex-1 py-1.5 rounded-md font-mono text-[11px] font-medium transition-all flex items-center justify-center space-x-1.5 ${
                          activeMacroTab === 'specs'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <Cpu size={13} />
                        <span>Specs & Logic</span>
                      </button>
                      <button
                        onClick={() => setActiveMacroTab('placement')}
                        className={`flex-1 py-1.5 rounded-md font-mono text-[11px] font-medium transition-all flex items-center justify-center space-x-1.5 ${
                          activeMacroTab === 'placement'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <Layers size={13} />
                        <span>Floorplan</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab Body Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* TAB 1: CIRCUIT DIAGRAM */}
                    {activeMacroTab === 'schematic' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-200 uppercase font-mono flex items-center space-x-1.5">
                            <Zap size={14} className="text-amber-400" />
                            <span>Internal Gate-Level Schematic</span>
                          </span>
                          <button
                            onClick={() => setShowCircuitModal(true)}
                            className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                          >
                            <Maximize2 size={12} />
                            <span>Popout</span>
                          </button>
                        </div>

                        {/* Interactive Circuit Schematic View */}
                        <div className="h-[280px]">
                          <InteractiveCircuitSchematic macro={selectedMacro} />
                        </div>

                        {/* Operational Logic Summary */}
                        <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1.5 text-xs">
                          <div className="font-semibold text-gray-200 flex items-center space-x-1.5">
                            <Info size={13} className="text-blue-400" />
                            <span>Gate Architecture & Operation</span>
                          </div>
                          <p className="text-gray-400 text-[11px] leading-relaxed">
                            {macroDetail.microarchitecture}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: SPECS & HARDWARE LOGIC */}
                    {activeMacroTab === 'specs' && (
                      <div className="space-y-4 text-xs">
                        {/* Functional Description */}
                        <div>
                          <h4 className="font-semibold text-gray-200 uppercase tracking-wider text-[11px] mb-1.5 flex items-center space-x-1.5">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span>Functional Overview</span>
                          </h4>
                          <p className="text-gray-400 text-xs leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
                            {macroDetail.description}
                          </p>
                        </div>

                        {/* Performance & Silicon Metrics */}
                        <div>
                          <h4 className="font-semibold text-gray-200 uppercase tracking-wider text-[11px] mb-2 flex items-center space-x-1.5">
                            <Activity size={14} className="text-purple-400" />
                            <span>Hardware Characteristics</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                            <div className="bg-white/[0.03] p-2 rounded border border-white/5">
                              <span className="text-gray-500 text-[10px] block">NAND2 EQUIV GATES</span>
                              <span className="font-bold text-purple-300 text-sm">{macroDetail.gateCount}</span>
                            </div>
                            <div className="bg-white/[0.03] p-2 rounded border border-white/5">
                              <span className="text-gray-500 text-[10px] block">TOTAL TRANSISTORS</span>
                              <span className="font-bold text-purple-300 text-sm">{macroDetail.transistorCount}</span>
                            </div>
                            <div className="bg-white/[0.03] p-2 rounded border border-white/5">
                              <span className="text-gray-500 text-[10px] block">CRITICAL PATH (Tpd)</span>
                              <span className="font-bold text-emerald-300 text-xs">{macroDetail.criticalPathDelay}</span>
                            </div>
                            <div className="bg-white/[0.03] p-2 rounded border border-white/5">
                              <span className="text-gray-500 text-[10px] block">DYNAMIC POWER</span>
                              <span className="font-bold text-amber-300 text-xs">{macroDetail.dynamicPower}</span>
                            </div>
                          </div>
                        </div>

                        {/* Port Interface Netlist */}
                        <div>
                          <h4 className="font-semibold text-gray-200 uppercase tracking-wider text-[11px] mb-2 flex items-center space-x-1.5">
                            <Binary size={14} className="text-cyan-400" />
                            <span>Signal Interface & Ports</span>
                          </h4>
                          <div className="border border-white/10 rounded-lg overflow-hidden">
                            <table className="w-full text-left font-mono text-[11px]">
                              <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                                <tr>
                                  <th className="p-1.5">Port</th>
                                  <th className="p-1.5">Width</th>
                                  <th className="p-1.5">Function</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {macroDetail.inputs.map(inp => (
                                  <tr key={inp.name} className="hover:bg-white/[0.02]">
                                    <td className="p-1.5 text-emerald-400 font-bold">{inp.name}</td>
                                    <td className="p-1.5 text-gray-400">{inp.width}</td>
                                    <td className="p-1.5 text-gray-300 font-sans text-[11px]">{inp.desc}</td>
                                  </tr>
                                ))}
                                {macroDetail.outputs.map(out => (
                                  <tr key={out.name} className="hover:bg-white/[0.02]">
                                    <td className="p-1.5 text-blue-400 font-bold">{out.name}</td>
                                    <td className="p-1.5 text-gray-400">{out.width}</td>
                                    <td className="p-1.5 text-gray-300 font-sans text-[11px]">{out.desc}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: FLOORPLAN & COORDINATES */}
                    {activeMacroTab === 'placement' && (
                      <div className="space-y-4 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-300">Physical Coordinates</span>
                          <button
                            onClick={() => handleDeleteMacro(selectedMacro.id)}
                            className="px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/20 flex items-center space-x-1"
                          >
                            <Trash2 size={13} />
                            <span>Delete Block</span>
                          </button>
                        </div>

                        {/* Coordinates & Dimensions */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-gray-400 block mb-1">X Position (µm)</label>
                            <input
                              type="number"
                              value={selectedMacro.x}
                              onChange={(e) => handleUpdateSelectedMacro('x', parseInt(e.target.value) || 0)}
                              className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1">Y Position (µm)</label>
                            <input
                              type="number"
                              value={selectedMacro.y}
                              onChange={(e) => handleUpdateSelectedMacro('y', parseInt(e.target.value) || 0)}
                              className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1">Width (µm)</label>
                            <input
                              type="number"
                              value={selectedMacro.width}
                              onChange={(e) => handleUpdateSelectedMacro('width', parseInt(e.target.value) || 20)}
                              className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1">Height (µm)</label>
                            <input
                              type="number"
                              value={selectedMacro.height}
                              onChange={(e) => handleUpdateSelectedMacro('height', parseInt(e.target.value) || 20)}
                              className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1">Halo Keepout (µm)</label>
                            <input
                              type="number"
                              value={selectedMacro.halo}
                              onChange={(e) => handleUpdateSelectedMacro('halo', parseInt(e.target.value) || 0)}
                              className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1">Orientation</label>
                            <select
                              value={selectedMacro.orientation}
                              onChange={(e) => handleUpdateSelectedMacro('orientation', e.target.value as MacroOrientation)}
                              className="w-full bg-[#1A1C20] border border-white/10 rounded px-2 py-1 text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50"
                            >
                              <option value="R0">R0 (Default)</option>
                              <option value="R90">R90 (Rot 90°)</option>
                              <option value="R180">R180 (Rot 180°)</option>
                              <option value="R270">R270 (Rot 270°)</option>
                              <option value="MX">MX (Flip X)</option>
                              <option value="MY">MY (Flip Y)</option>
                            </select>
                          </div>
                        </div>

                        {/* Macro Pins Summary */}
                        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-lg space-y-1">
                          <span className="font-semibold text-gray-300 block">Connected IO Pins</span>
                          <span className="text-gray-400 block">
                            {selectedMacro.pins.length} active physical pins routed to standard cell rows and pads.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-6 flex flex-col items-center justify-center text-center h-full space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                <Cpu size={28} />
              </div>
              <h3 className="font-bold text-gray-200 text-sm">Select a Block to Inspect</h3>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Click any macro block on the die canvas (<span className="text-purple-400 font-mono font-bold">ADDER_SUB_UNIT</span>, <span className="text-amber-400 font-mono font-bold">BOOLEAN_LOGIC_UNIT</span>, <span className="text-blue-400 font-mono font-bold">BARREL_SHIFTER</span>, or <span className="text-emerald-400 font-mono font-bold">REGISTER_BANK</span>) to reveal everything about that component and inspect its interactive gate-level circuit diagram.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Interactive Circuit Schematic Modal */}
      {showCircuitModal && selectedMacro && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-white/15 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3.5 h-3.5 rounded-sm"
                  style={{ backgroundColor: getMacroColor(selectedMacro.type).stroke }}
                />
                <div>
                  <h3 className="font-mono text-base font-bold text-white flex items-center space-x-2">
                    <span>{selectedMacro.name}</span>
                    <span className="text-xs font-normal text-gray-400 font-mono">
                      (Gate-Level Circuit Schematic & Live Signal Probing)
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowCircuitModal(false)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <InteractiveCircuitSchematic macro={selectedMacro} isFullscreen={true} />
            </div>

            <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs font-mono text-gray-400">
              <span>Interactive Simulator: Change operands and control flags to observe gate outputs live</span>
              <button
                onClick={() => setShowCircuitModal(false)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors"
              >
                Close Fullscreen View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRC Panel Drawer */}
      {showDrcPanel && (
        <div className="p-4 bg-[#181920] border-t border-white/10 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center space-x-2">
              <AlertTriangle size={14} className={hasErrors ? 'text-rose-400' : 'text-amber-400'} />
              <span>Physical Design DRC Checks ({drcErrors.length})</span>
            </h4>
            <button 
              onClick={() => setShowDrcPanel(false)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Close
            </button>
          </div>
          {drcErrors.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center space-x-2">
              <CheckCircle2 size={14} />
              <span>All Floorplan DRC checks passed! No overlaps, halo conflicts, or out-of-boundary violations.</span>
            </p>
          ) : (
            <div className="space-y-1.5">
              {drcErrors.map((err, i) => (
                <div 
                  key={i} 
                  className={`text-xs p-2 rounded border flex items-center justify-between ${
                    err.severity === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <span>{err.message}</span>
                  <span className="font-mono text-[10px] uppercase opacity-75">{err.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Export TCL Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151619] border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode size={18} className="text-emerald-400" />
                <h3 className="font-semibold text-gray-200 text-sm">Export Physical Design Floorplan Script</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setScriptType('openroad')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${scriptType === 'openroad' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  OpenROAD
                </button>
                <button
                  onClick={() => setScriptType('innovus')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${scriptType === 'innovus' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Cadence Innovus
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <pre className="text-xs font-mono text-gray-300 bg-[#0d0e12] p-4 rounded-lg border border-white/5 overflow-x-auto leading-relaxed">
                {scriptType === 'openroad' 
                  ? generateOpenRoadFloorplanTcl(config, createDefaultPowerPlan())
                  : generateInnovusTcl(config, createDefaultPowerPlan())}
              </pre>
            </div>

            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">Compatible with standard ASIC synthesis flows</span>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors"
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

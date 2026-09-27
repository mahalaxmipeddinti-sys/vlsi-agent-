import React, { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Cpu, Layers, Activity, Eye, Zap } from 'lucide-react';

export interface GateNode {
  id: string;
  type: 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'MUX' | 'DFF' | 'ADDER' | 'BUFFER' | 'CUSTOM';
  label: string;
  x: number;
  y: number;
  inputs: string[];
  outputs: string[];
}

export interface NetWire {
  id: string;
  fromGateId: string;
  fromPort: string;
  toGateId: string;
  toPort: string;
  name: string;
  state?: '0' | '1' | 'X' | 'Z';
}

export interface SchematicData {
  moduleName: string;
  inputs: { name: string; bitWidth?: number }[];
  outputs: { name: string; bitWidth?: number }[];
  gates: GateNode[];
  nets: NetWire[];
}

interface SchematicViewerProps {
  data: SchematicData | null;
}

export function SchematicViewer({ data }: SchematicViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNet, setHoveredNet] = useState<string | null>(null);
  const [selectedGate, setSelectedGate] = useState<GateNode | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'schematic-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  if (!data || !data.gates || data.gates.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1C20] text-gray-400 p-8 space-y-3">
        <Zap size={36} className="text-emerald-500/50 animate-pulse" />
        <p className="text-sm font-medium">Select a circuit or gate to generate the Gate-Level Schematic</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0d1117] relative select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-3 bg-[#161b22]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg text-xs">
        <div className="flex items-center space-x-2 border-r border-white/10 pr-3">
          <Zap size={15} className="text-emerald-400" />
          <span className="font-semibold text-gray-200">{data.moduleName}</span>
          <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full font-mono">
            {data.gates.length} Gates, {data.nets.length} Nets
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => setZoom(prev => Math.min(prev + 0.15, 2.5))}
            className="p-1.5 hover:bg-white/10 text-gray-300 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.4))}
            className="p-1.5 hover:bg-white/10 text-gray-300 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button 
            onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); }}
            className="p-1.5 hover:bg-white/10 text-gray-300 rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
          <span className="text-[11px] font-mono text-gray-400 pl-1">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Main Canvas */}
      <div 
        id="schematic-bg"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg className="w-full h-full">
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#21262d" strokeWidth="0.8" />
            </pattern>
            {/* Net Terminal Marker */}
            <marker id="net-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#10b981" />
            </marker>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Input Ports Left Rail */}
            <g>
              <rect x="0" y="20" width="120" height={data.inputs.length * 45 + 30} rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1" />
              <text x="12" y="42" fill="#8b949e" fontSize="11" fontWeight="bold" letterSpacing="1">PRIMARY INPUTS</text>
              {data.inputs.map((inp, i) => (
                <g key={inp.name} transform={`translate(10, ${60 + i * 45})`}>
                  <rect x="0" y="0" width="100" height="28" rx="4" fill="#0d281e" stroke="#10b981" strokeWidth="1" />
                  <text x="12" y="18" fill="#34d399" fontSize="11" fontFamily="monospace" fontWeight="600">{inp.name}</text>
                  <circle cx="100" cy="14" r="3.5" fill="#10b981" />
                </g>
              ))}
            </g>

            {/* Interconnect Nets */}
            <g>
              {data.nets.map((net) => {
                const fromGate = data.gates.find(g => g.id === net.fromGateId);
                const toGate = data.gates.find(g => g.id === net.toGateId);

                let x1 = 110;
                let y1 = 74;
                if (net.fromGateId.startsWith('IN_')) {
                  const idx = data.inputs.findIndex(inp => `IN_${inp.name}` === net.fromGateId);
                  y1 = 60 + (idx >= 0 ? idx : 0) * 45 + 14;
                } else if (fromGate) {
                  x1 = fromGate.x + 90;
                  y1 = fromGate.y + 35;
                }

                let x2 = 600;
                let y2 = 74;
                if (net.toGateId.startsWith('OUT_')) {
                  const idx = data.outputs.findIndex(out => `OUT_${out.name}` === net.toGateId);
                  x2 = 680;
                  y2 = 60 + (idx >= 0 ? idx : 0) * 45 + 14;
                } else if (toGate) {
                  x2 = toGate.x;
                  const portIdx = toGate.inputs.indexOf(net.toPort);
                  y2 = toGate.y + 20 + (portIdx >= 0 ? portIdx * 25 : 15);
                }

                const isHovered = hoveredNet === net.id || hoveredNet === net.name;
                const midX = (x1 + x2) / 2;

                return (
                  <g 
                    key={net.id}
                    onMouseEnter={() => setHoveredNet(net.id)}
                    onMouseLeave={() => setHoveredNet(null)}
                    className="cursor-pointer"
                  >
                    <path
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={isHovered ? '#38bdf8' : '#10b981'}
                      strokeWidth={isHovered ? 3 : 1.8}
                      strokeLinecap="round"
                    />
                    <text
                      x={midX}
                      y={(y1 + y2) / 2 - 4}
                      fill={isHovered ? '#38bdf8' : '#6ee7b7'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="transition-opacity"
                    >
                      {net.name}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Logic Gates */}
            {data.gates.map((gate) => {
              const isSelected = selectedGate?.id === gate.id;

              return (
                <g 
                  key={gate.id} 
                  transform={`translate(${gate.x}, ${gate.y})`}
                  onClick={() => setSelectedGate(gate)}
                  className="cursor-pointer"
                >
                  {/* Gate Card / IEEE Symbol */}
                  <rect
                    x="0"
                    y="0"
                    width="90"
                    height="70"
                    rx="8"
                    fill={isSelected ? '#1f2937' : '#161b22'}
                    stroke={isSelected ? '#38bdf8' : '#30363d'}
                    strokeWidth={isSelected ? 2 : 1}
                    className="transition-all hover:stroke-emerald-400"
                  />
                  
                  {/* Gate Type Badge */}
                  <rect x="8" y="8" width="74" height="20" rx="4" fill="#21262d" />
                  <text x="45" y="22" fill="#58a6ff" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
                    {gate.type}
                  </text>

                  {/* Gate Instance Label */}
                  <text x="45" y="44" fill="#c9d1d9" fontSize="11" fontFamily="monospace" fontWeight="600" textAnchor="middle">
                    {gate.label}
                  </text>

                  {/* Input Terminals */}
                  {gate.inputs.map((inp, idx) => (
                    <circle key={inp} cx="0" cy={20 + idx * 25} r="3.5" fill="#10b981" />
                  ))}

                  {/* Output Terminal */}
                  <circle cx="90" cy="35" r="3.5" fill="#f87171" />
                </g>
              );
            })}

            {/* Output Ports Right Rail */}
            <g transform="translate(680, 0)">
              <rect x="0" y="20" width="130" height={data.outputs.length * 45 + 30} rx="6" fill="#161b22" stroke="#30363d" strokeWidth="1" />
              <text x="12" y="42" fill="#8b949e" fontSize="11" fontWeight="bold" letterSpacing="1">PRIMARY OUTPUTS</text>
              {data.outputs.map((out, i) => (
                <g key={out.name} transform={`translate(10, ${60 + i * 45})`}>
                  <rect x="0" y="0" width="110" height="28" rx="4" fill="#381010" stroke="#f87171" strokeWidth="1" />
                  <text x="18" y="18" fill="#fca5a5" fontSize="11" fontFamily="monospace" fontWeight="600">{out.name}</text>
                  <circle cx="0" cy="14" r="3.5" fill="#f87171" />
                </g>
              ))}
            </g>
          </g>
        </svg>
      </div>

      {/* Selected Gate / Net Inspector */}
      {selectedGate && (
        <div className="absolute bottom-4 right-4 z-20 w-72 bg-[#161b22]/95 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center space-x-2">
              <Cpu size={15} className="text-emerald-400" />
              <span className="font-semibold text-gray-200">Gate Inspector</span>
            </div>
            <button onClick={() => setSelectedGate(null)} className="text-gray-400 hover:text-white font-bold">×</button>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-gray-400">
              <span>Instance:</span>
              <span className="text-gray-200 font-bold">{selectedGate.label}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Standard Cell:</span>
              <span className="text-emerald-400 font-semibold">{selectedGate.type}_X1</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Fan-In Pins:</span>
              <span className="text-gray-200">{selectedGate.inputs.join(', ') || 'none'}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Fan-Out Pins:</span>
              <span className="text-gray-200">{selectedGate.outputs.join(', ') || 'none'}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Intrinsic Delay:</span>
              <span className="text-blue-400">~12.4 ps</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

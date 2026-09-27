import React, { useState, useMemo } from 'react';
import { Box, Cpu, Info, ArrowRight, ArrowLeft, RefreshCw, Layers, Camera } from 'lucide-react';
import { IC3DViewer } from './IC3DViewer';

export interface Pin {
  name: string;
  width: string;
  pinNumber?: number;
}

export interface PinDiagramData {
  moduleName: string;
  inputs: Pin[];
  outputs: Pin[];
  inouts?: Pin[];
}

interface PinDiagramViewerProps {
  data: any;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function PinDiagramViewer({ data, onGenerate, isGenerating }: PinDiagramViewerProps) {
  const [viewMode, setViewMode] = useState<'package' | 'symbol' | '3d-render'>('package');
  const [hoveredPin, setHoveredPin] = useState<{ name: string; width: string; type: string; pinNumber?: number } | null>(null);

  // Normalize data safely
  const normalizedData = useMemo(() => {
    if (!data) return null;

    const moduleName = data.moduleName || 'top_module';

    const parsePins = (list: any[] = [], defaultPrefix: string) => {
      return list.map((item, idx) => {
        if (typeof item === 'string') {
          return { name: item, width: '', pinNumber: idx + 1 };
        }
        return {
          name: item?.name || item?.port || `${defaultPrefix}_${idx + 1}`,
          width: item?.width || '',
          pinNumber: typeof item?.pinNumber === 'number' ? item.pinNumber : idx + 1
        };
      });
    };

    const inputs = parsePins(data.inputs, 'in');
    const outputs = parsePins(data.outputs, 'out');
    const inouts = parsePins(data.inouts, 'io');

    return { moduleName, inputs, outputs, inouts };
  }, [data]);

  if (!normalizedData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0a]">
        <Cpu size={56} className="text-emerald-500/30 mb-4 animate-pulse" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">No Pin Diagram Generated Yet</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          Generate a physical IC pinout and symbol diagram extracted from the active RTL code.
        </p>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md hover:bg-emerald-500/30 transition-colors flex items-center space-x-2 text-sm font-medium"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Box size={16} />}
            <span>{isGenerating ? 'Extracting Pinout...' : 'Generate Pin Diagram'}</span>
          </button>
        )}
      </div>
    );
  }

  const { moduleName, inputs, outputs, inouts } = normalizedData;
  const allPins = [
    ...inputs.map(p => ({ ...p, type: 'INPUT' })),
    ...outputs.map(p => ({ ...p, type: 'OUTPUT' })),
    ...inouts.map(p => ({ ...p, type: 'INOUT' }))
  ];

  // Dual in-line package distribution
  // Total pin count rounded up to even standard DIP package size (min 8)
  const rawTotal = Math.max(allPins.length + 2, 8); // +2 for VCC & GND
  const dipPinCount = rawTotal % 2 === 0 ? rawTotal : rawTotal + 1;
  const pinsPerSide = dipPinCount / 2;

  // Distribute pins: Left side (1..pinsPerSide), Right side (dipPinCount down to pinsPerSide + 1)
  const leftPins: { pinNumber: number; name: string; width: string; type: string }[] = [];
  const rightPins: { pinNumber: number; name: string; width: string; type: string }[] = [];

  // Populate left side (typically Inputs + GND at bottom)
  for (let i = 1; i <= pinsPerSide; i++) {
    if (i === pinsPerSide) {
      leftPins.push({ pinNumber: i, name: 'GND', width: '', type: 'POWER' });
    } else {
      const pinObj = allPins[i - 1];
      if (pinObj) {
        leftPins.push({ pinNumber: i, name: pinObj.name, width: pinObj.width, type: pinObj.type });
      } else {
        leftPins.push({ pinNumber: i, name: 'NC', width: '', type: 'NC' });
      }
    }
  }

  // Populate right side (typically Outputs, Inouts, + VCC at top/dipPinCount)
  const remainingPins = allPins.slice(pinsPerSide - 1);
  for (let i = dipPinCount; i > pinsPerSide; i--) {
    if (i === dipPinCount) {
      rightPins.unshift({ pinNumber: i, name: 'VCC', width: '', type: 'POWER' });
    } else {
      const pinObj = remainingPins.shift();
      if (pinObj) {
        rightPins.unshift({ pinNumber: i, name: pinObj.name, width: pinObj.width, type: pinObj.type });
      } else {
        rightPins.unshift({ pinNumber: i, name: 'NC', width: '', type: 'NC' });
      }
    }
  }

  const pinsRecord = useMemo(() => {
    const map: Record<string, string> = {};
    leftPins.forEach(p => { map[p.pinNumber.toString()] = p.name; });
    rightPins.forEach(p => { map[p.pinNumber.toString()] = p.name; });
    return map;
  }, [leftPins, rightPins]);

  const getPinBadgeColor = (type: string) => {
    switch (type) {
      case 'INPUT': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'OUTPUT': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'INOUT': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'POWER': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getPinLineColor = (type: string) => {
    switch (type) {
      case 'INPUT': return 'bg-emerald-500/60';
      case 'OUTPUT': return 'bg-blue-500/60';
      case 'INOUT': return 'bg-purple-500/60';
      case 'POWER': return 'bg-amber-500/60';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-gray-200 overflow-hidden select-none">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-white/10 bg-[#151619] gap-4 z-20">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-emerald-500/20 rounded border border-emerald-500/30 text-emerald-400">
            <Box size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-sm text-gray-100">{moduleName}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                DIP-{dipPinCount}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 font-mono">
              {inputs.length} Inputs • {outputs.length} Outputs {inouts.length > 0 ? `• ${inouts.length} Inouts` : ''}
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-[#1A1C20] p-0.5 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('package')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center space-x-1.5 ${
                viewMode === 'package' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Cpu size={14} />
              <span>DIP Package</span>
            </button>
            <button
              onClick={() => setViewMode('symbol')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center space-x-1.5 ${
                viewMode === 'symbol' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers size={14} />
              <span>Logic Symbol</span>
            </button>
            <button
              onClick={() => setViewMode('3d-render')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center space-x-1.5 ${
                viewMode === '3d-render' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Camera size={14} />
              <span>3D Render</span>
            </button>
          </div>

          {onGenerate && (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-gray-400 hover:text-emerald-400 transition-colors"
              title="Re-extract Pin Diagram"
            >
              <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative">
        {viewMode === 'package' ? (
          /* DIP Package Physical View */
          <div className="flex flex-col items-center justify-center my-auto">
            {/* Notch & Orientation marker */}
            <div className="text-xs font-mono text-gray-500 mb-2 flex items-center space-x-1">
              <span>▲ PIN 1 NOTCH ORIENTATION</span>
            </div>

            {/* Package Container */}
            <div className="flex items-center justify-center">
              {/* Left Pins (1 .. N) */}
              <div className="flex flex-col justify-between py-6 space-y-4">
                {leftPins.map((pin) => (
                  <div
                    key={`l-${pin.pinNumber}`}
                    onMouseEnter={() => setHoveredPin(pin)}
                    onMouseLeave={() => setHoveredPin(null)}
                    className="flex items-center justify-end group cursor-pointer"
                  >
                    {/* Signal Label & Width */}
                    <div className="flex flex-col items-end mr-3 font-mono text-xs">
                      <span className={`transition-colors font-semibold ${
                        pin.type === 'INPUT' ? 'text-emerald-400 group-hover:text-emerald-300' :
                        pin.type === 'POWER' ? 'text-amber-400 group-hover:text-amber-300' :
                        pin.type === 'NC' ? 'text-gray-600' : 'text-blue-400 group-hover:text-blue-300'
                      }`}>
                        {pin.name}
                      </span>
                      {pin.width && (
                        <span className="text-[10px] text-gray-500">{pin.width}</span>
                      )}
                    </div>

                    {/* Pin Metal Lead */}
                    <div className="relative flex items-center">
                      <div className={`w-12 h-1.5 rounded-l ${getPinLineColor(pin.type)} transition-all group-hover:h-2 group-hover:brightness-125`} />
                      <span className="absolute -top-4 right-1 text-[10px] font-mono text-gray-500 group-hover:text-gray-300">
                        {pin.pinNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Central Ceramic/Plastic IC Body */}
              <div
                className="w-52 bg-[#121316] border-2 border-white/20 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] relative flex flex-col items-center justify-between py-8 mx-1"
                style={{ minHeight: `${pinsPerSide * 48 + 60}px` }}
              >
                {/* Notch on top edge */}
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-10 h-5 border-b-2 border-l-2 border-r-2 border-white/30 rounded-b-full bg-[#0a0a0a]" />

                {/* Pin 1 Dot Marker */}
                <div className="absolute top-6 left-6 w-3 h-3 rounded-full bg-white/20 border border-white/30" title="Pin 1 Index Dot" />

                {/* Module Branding */}
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <span className="text-xl font-bold font-mono text-gray-200 tracking-widest uppercase">
                    {moduleName}
                  </span>
                  <span className="text-xs font-mono text-emerald-400/80 mt-1">
                    DIP-{dipPinCount} PACKAGE
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono mt-3">
                    AUTONOMOUS VLSI CORE
                  </span>
                </div>

                {/* Package footer */}
                <div className="text-[10px] font-mono text-gray-600">
                  TOP VIEW
                </div>
              </div>

              {/* Right Pins (2N .. N+1) */}
              <div className="flex flex-col justify-between py-6 space-y-4">
                {rightPins.map((pin) => (
                  <div
                    key={`r-${pin.pinNumber}`}
                    onMouseEnter={() => setHoveredPin(pin)}
                    onMouseLeave={() => setHoveredPin(null)}
                    className="flex items-center justify-start group cursor-pointer"
                  >
                    {/* Pin Metal Lead */}
                    <div className="relative flex items-center">
                      <div className={`w-12 h-1.5 rounded-r ${getPinLineColor(pin.type)} transition-all group-hover:h-2 group-hover:brightness-125`} />
                      <span className="absolute -top-4 left-1 text-[10px] font-mono text-gray-500 group-hover:text-gray-300">
                        {pin.pinNumber}
                      </span>
                    </div>

                    {/* Signal Label & Width */}
                    <div className="flex flex-col items-start ml-3 font-mono text-xs">
                      <span className={`transition-colors font-semibold ${
                        pin.type === 'OUTPUT' ? 'text-blue-400 group-hover:text-blue-300' :
                        pin.type === 'POWER' ? 'text-amber-400 group-hover:text-amber-300' :
                        pin.type === 'INOUT' ? 'text-purple-400 group-hover:text-purple-300' :
                        pin.type === 'NC' ? 'text-gray-600' : 'text-emerald-400 group-hover:text-emerald-300'
                      }`}>
                        {pin.name}
                      </span>
                      {pin.width && (
                        <span className="text-[10px] text-gray-500">{pin.width}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Logic Block Symbol View */
          <div className="flex items-center justify-center my-auto">
            {/* Input Port Lines */}
            <div className="flex flex-col justify-around py-6 space-y-5">
              {inputs.map((pin, i) => (
                <div
                  key={`sym-in-${i}`}
                  onMouseEnter={() => setHoveredPin({ ...pin, type: 'INPUT' })}
                  onMouseLeave={() => setHoveredPin(null)}
                  className="flex items-center justify-end group cursor-pointer"
                >
                  <div className="flex flex-col items-end mr-2 font-mono text-xs">
                    <span className="text-emerald-400 group-hover:text-emerald-300 font-semibold">{pin.name}</span>
                    {pin.width && <span className="text-[10px] text-gray-500">{pin.width}</span>}
                  </div>
                  <div className="w-16 h-px bg-emerald-500/60 relative flex items-center">
                    <ArrowRight size={12} className="text-emerald-400 absolute right-0" />
                    {pin.pinNumber && (
                      <span className="absolute -top-3.5 left-2 text-[9px] font-mono text-gray-500">
                        p{pin.pinNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Central Logic Symbol Box */}
            <div
              className="w-64 border-2 border-emerald-500/60 bg-[#151619] rounded-lg shadow-[0_0_35px_rgba(16,185,129,0.15)] flex flex-col justify-between py-6 px-4 relative z-10 mx-2"
              style={{ minHeight: `${Math.max(inputs.length, outputs.length, 3) * 50 + 60}px` }}
            >
              <div className="border-b border-emerald-500/20 pb-3 text-center">
                <span className="font-mono font-bold text-emerald-400 tracking-wider text-base">
                  {moduleName}
                </span>
                <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                  IEEE 91/91a LOGIC SYMBOL
                </div>
              </div>

              {/* Submodule / inout layout if any */}
              {inouts && inouts.length > 0 && (
                <div className="py-4 border-t border-b border-white/5 my-2">
                  <div className="text-[10px] font-mono text-purple-400 mb-1 text-center">BIDIRECTIONAL PORTS</div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {inouts.map((io, idx) => (
                      <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {io.name} {io.width}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center font-mono text-[10px] text-gray-600 pt-2 border-t border-white/5">
                RTL PORT INTERFACE
              </div>
            </div>

            {/* Output Port Lines */}
            <div className="flex flex-col justify-around py-6 space-y-5">
              {outputs.map((pin, i) => (
                <div
                  key={`sym-out-${i}`}
                  onMouseEnter={() => setHoveredPin({ ...pin, type: 'OUTPUT' })}
                  onMouseLeave={() => setHoveredPin(null)}
                  className="flex items-center justify-start group cursor-pointer"
                >
                  <div className="w-16 h-px bg-blue-500/60 relative flex items-center">
                    <ArrowRight size={12} className="text-blue-400 absolute right-0" />
                    {pin.pinNumber && (
                      <span className="absolute -top-3.5 left-2 text-[9px] font-mono text-gray-500">
                        p{pin.pinNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-start ml-2 font-mono text-xs">
                    <span className="text-blue-400 group-hover:text-blue-300 font-semibold">{pin.name}</span>
                    {pin.width && <span className="text-[10px] text-gray-500">{pin.width}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === '3d-render' && (
          <div className="w-full h-full min-h-[520px]">
            <IC3DViewer
              icName={moduleName}
              pinCount={dipPinCount}
              icFullName={`${moduleName} Module Package`}
              pins={pinsRecord}
            />
          </div>
        )}

        {/* Hover / Selected Pin Inspector Card (Bottom-Right overlay) */}
        {hoveredPin && (
          <div className="absolute bottom-6 right-6 bg-[#1A1C20] border border-white/10 rounded-lg p-3.5 shadow-2xl text-xs font-mono max-w-xs z-30 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-200 text-sm">{hoveredPin.name}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPinBadgeColor(hoveredPin.type)}`}>
                {hoveredPin.type}
              </span>
            </div>
            <div className="space-y-1 text-gray-400 text-[11px]">
              {hoveredPin.pinNumber && (
                <div className="flex justify-between">
                  <span>Physical Pin:</span>
                  <span className="text-gray-200">Pin {hoveredPin.pinNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Bus Width:</span>
                <span className="text-gray-200">{hoveredPin.width || '1-bit scalar'}</span>
              </div>
              <div className="flex justify-between">
                <span>Signal Class:</span>
                <span className="text-gray-200">
                  {hoveredPin.name.toLowerCase().includes('clk') ? 'Clock Net' :
                   hoveredPin.name.toLowerCase().includes('rst') ? 'Reset Net' :
                   hoveredPin.type === 'POWER' ? 'Power Rail' : 'Logic Bus'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="px-6 py-2 border-t border-white/10 bg-[#151619] flex flex-wrap items-center justify-between text-xs font-mono text-gray-500 gap-4">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Input</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            <span>Output</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span>Inout</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Power / VCC / GND</span>
          </span>
        </div>
        <div className="flex items-center space-x-1 text-gray-500">
          <Info size={13} />
          <span>Hover pins to inspect signal width & pin assignment</span>
        </div>
      </div>
    </div>
  );
}

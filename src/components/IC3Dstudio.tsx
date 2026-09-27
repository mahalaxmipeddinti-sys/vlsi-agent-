import React, { useState } from 'react';
import { icDatabase, getICData, ICData } from '../data/icDatabase';
import { IC3DViewer } from './IC3DViewer';
import { Box, Camera, Cpu, Sparkles, Layers, ArrowUpRight } from 'lucide-react';

interface IC3DStudioProps {
  onOpenInRtl?: (icName: string, verilogCode: string) => void;
  defaultIC?: string;
}

export function IC3DStudio({ onOpenInRtl, defaultIC = '7400' }: IC3DStudioProps) {
  const [selectedIC, setSelectedIC] = useState<string>(defaultIC);
  
  const icData = getICData(selectedIC) || icDatabase[0];
  const totalPins = Object.keys(icData.pins).length;

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Top Banner & Chip Picker */}
      <div className="px-5 py-3.5 border-b border-white/10 bg-[#151619] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Camera size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold font-mono text-gray-100">3D IC Render & Package Studio</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                Active 3D View
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Photorealistic macro renders, internal silicon die wire-bonds, and 360° interactive models
            </p>
          </div>
        </div>

        {/* Quick Chip Selection Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
          <span className="text-xs font-mono text-gray-400 mr-1.5 flex items-center space-x-1">
            <Cpu size={13} className="text-emerald-400" />
            <span>Select IC:</span>
          </span>
          {icDatabase.map(ic => (
            <button
              key={ic.IC}
              onClick={() => setSelectedIC(ic.IC)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all border ${
                selectedIC === ic.IC
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm font-bold'
                  : 'bg-[#1A1C20] text-gray-400 border-white/10 hover:text-gray-200 hover:border-white/20'
              }`}
            >
              {ic.IC}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Viewport */}
      <div className="flex-1 overflow-hidden p-3 bg-[#070809]">
        <IC3DViewer
          icName={icData.IC}
          pinCount={totalPins}
          icFullName={icData.name}
          pins={icData.pins}
        />
      </div>
    </div>
  );
}

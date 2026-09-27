import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Zap, 
  Activity, 
  Sliders, 
  Play, 
  CheckCircle2, 
  Shield, 
  Layers, 
  ArrowRight,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { CTSBlockInfo } from '../data/ctsBlockData';
import { cn } from '../lib/utils';

interface CTSBlockInspectorModalProps {
  block: CTSBlockInfo | null;
  onClose: () => void;
}

export function CTSBlockInspectorModal({ block, onClose }: CTSBlockInspectorModalProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  if (!block) return null;

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimStep(0);
    const interval = setInterval(() => {
      setSimStep((prev) => {
        if (prev >= block.simulationWaveforms.length - 1) {
          clearInterval(interval);
          setIsSimulating(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
  };

  const currentWave = block.simulationWaveforms[Math.min(simStep, block.simulationWaveforms.length - 1)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#141519] border border-white/15 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 bg-[#181a20] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Cpu size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {block.category}
                </span>
                <span className="text-xs text-gray-400 font-mono">{block.location}</span>
              </div>
              <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
                {block.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Play size={13} className={isSimulating ? 'animate-pulse text-amber-400' : ''} />
              <span>{isSimulating ? 'Simulating Signal...' : 'Simulate Block Action'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {/* Quick Specs Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[10px] text-gray-400">Physical Size</div>
              <div className="font-mono text-cyan-300 font-bold truncate">{block.dimensions}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[10px] text-gray-400">Metal Layer</div>
              <div className="font-mono text-purple-300 font-bold truncate">{block.metalLayer}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[10px] text-gray-400">Dynamic Power</div>
              <div className="font-mono text-amber-300 font-bold truncate">{block.powerDynamic}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[10px] text-gray-400">Clock Role</div>
              <div className="font-mono text-emerald-300 font-bold truncate">{block.clockRole}</div>
            </div>
          </div>

          {/* Overview Description */}
          <p className="text-xs text-gray-300 leading-relaxed bg-[#1b1d24] p-3.5 rounded-2xl border border-white/5">
            {block.description}
          </p>

          {/* Architectural Schematic (How It Works Internally) */}
          <div className="bg-[#0c0d10] p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Layers size={14} className="text-cyan-400" />
                <span>Internal Architecture & Circuit Operation Schematic</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Live Operating Diagram</span>
            </div>

            {/* Render Schematic by Schematic Type */}
            <div className="flex justify-center items-center py-2 min-h-[170px] select-none">
              {block.schematicType === 'sram' && (
                <svg viewBox="0 0 460 160" className="w-full max-w-[480px] h-auto font-mono text-xs">
                  {/* Bitline Precharge */}
                  <rect x="30" y="20" width="80" height="40" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.2" rx="3" />
                  <text x="70" y="38" fill="#c7d2fe" fontSize="7" fontWeight="bold" textAnchor="middle">PRECHARGE</text>
                  <text x="70" y="48" fill="#818cf8" fontSize="6" textAnchor="middle">BL / BLB -&gt; VDD</text>

                  <line x1="110" y1="40" x2="160" y2="40" stroke="#6366f1" strokeWidth="1.5" />
                  
                  {/* 6T SRAM Bitcell Matrix */}
                  <rect x="160" y="15" width="130" height="90" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" rx="4" />
                  <text x="225" y="32" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">6T SRAM BITCELL</text>
                  <text x="225" y="45" fill="#a5b4fc" fontSize="6.5" textAnchor="middle">Cross-Coupled Inverters</text>
                  <circle cx="205" cy="65" r="10" fill="#1e1b4b" stroke="#38bdf8" />
                  <circle cx="245" cy="65" r="10" fill="#1e1b4b" stroke="#38bdf8" />
                  <text x="205" y="68" fill="#ffffff" fontSize="7" textAnchor="middle">Q</text>
                  <text x="245" y="68" fill="#ffffff" fontSize="7" textAnchor="middle">!Q</text>

                  {/* Wordline */}
                  <line x1="160" y1="85" x2="290" y2="85" stroke="#f59e0b" strokeWidth="2" />
                  <text x="225" y="98" fill="#fbbf24" fontSize="6.5" fontWeight="bold" textAnchor="middle">WORDLINE (WL)</text>

                  <line x1="290" y1="50" x2="330" y2="50" stroke="#38bdf8" strokeWidth="1.5" />

                  {/* Sense Amplifier */}
                  <polygon points="330,25 410,50 330,75" fill="#065f46" stroke="#10b981" strokeWidth="1.5" />
                  <text x="355" y="53" fill="#ffffff" fontSize="7" fontWeight="bold">SENSE AMP</text>
                  
                  {/* Clock Strobe */}
                  <line x1="365" y1="95" x2="365" y2="65" stroke="#f59e0b" strokeWidth="2" />
                  <text x="365" y="108" fill="#f59e0b" fontSize="6.5" fontWeight="bold" textAnchor="middle">CLK_STROBE</text>

                  <line x1="410" y1="50" x2="445" y2="50" stroke="#10b981" strokeWidth="2" />
                  <text x="430" y="42" fill="#34d399" fontSize="6.5" fontWeight="bold">DOUT</text>
                </svg>
              )}

              {block.schematicType === 'pll' && (
                <svg viewBox="0 0 460 150" className="w-full max-w-[480px] h-auto font-mono text-xs">
                  {/* PFD */}
                  <rect x="20" y="40" width="70" height="40" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.2" rx="3" />
                  <text x="55" y="58" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">PFD</text>
                  <text x="55" y="68" fill="#a5b4fc" fontSize="6" textAnchor="middle">Phase Det</text>

                  {/* Charge Pump */}
                  <line x1="90" y1="60" x2="125" y2="60" stroke="#818cf8" strokeWidth="1.5" />
                  <rect x="125" y="40" width="70" height="40" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" rx="3" />
                  <text x="160" y="58" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">CHARGE PUMP</text>
                  <text x="160" y="68" fill="#6ee7b7" fontSize="6" textAnchor="middle">UP / DOWN</text>

                  {/* Loop Filter */}
                  <line x1="195" y1="60" x2="230" y2="60" stroke="#10b981" strokeWidth="1.5" />
                  <rect x="230" y="40" width="65" height="40" fill="#78350f" stroke="#f59e0b" strokeWidth="1.2" rx="3" />
                  <text x="262" y="58" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">LOOP FILTER</text>
                  <text x="262" y="68" fill="#fde68a" fontSize="6" textAnchor="middle">RC Low-Pass</text>

                  {/* VCO */}
                  <line x1="295" y1="60" x2="330" y2="60" stroke="#f59e0b" strokeWidth="1.5" />
                  <rect x="330" y="35" width="75" height="50" fill="#831843" stroke="#f43f5e" strokeWidth="1.5" rx="3" />
                  <text x="367" y="56" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">VCO</text>
                  <text x="367" y="68" fill="#fbcfe8" fontSize="6" textAnchor="middle">500 MHz Core</text>

                  {/* Feedback Path */}
                  <path d="M 370 85 L 370 120 L 55 120 L 55 80" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
                  <text x="210" y="132" fill="#38bdf8" fontSize="6.5" textAnchor="middle">1/N FEEDBACK CLOCK</text>
                </svg>
              )}

              {block.schematicType === 'icg' && (
                <svg viewBox="0 0 460 140" className="w-full max-w-[480px] h-auto font-mono text-xs">
                  {/* Negative-Edge Latch */}
                  <rect x="60" y="30" width="110" height="70" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" rx="4" />
                  <text x="115" y="52" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">NEGATIVE LATCH</text>
                  <text x="115" y="65" fill="#a7f3d0" fontSize="6.5" textAnchor="middle">Transparent on CLK=0</text>
                  <text x="115" y="78" fill="#6ee7b7" fontSize="6" textAnchor="middle">Latches on CLK=1</text>

                  {/* Inputs */}
                  <text x="20" y="55" fill="#fde047" fontSize="7" fontWeight="bold">ENABLE</text>
                  <line x1="45" y1="52" x2="60" y2="52" stroke="#fde047" strokeWidth="2" />

                  <text x="20" y="85" fill="#f59e0b" fontSize="7" fontWeight="bold">CLK_IN</text>
                  <line x1="45" y1="82" x2="60" y2="82" stroke="#f59e0b" strokeWidth="2" />

                  {/* Latch output to AND gate */}
                  <line x1="170" y1="55" x2="230" y2="55" stroke="#34d399" strokeWidth="2" />
                  <text x="195" y="47" fill="#34d399" fontSize="6.5">EN_LATCH</text>

                  {/* Direct clock feed to AND gate */}
                  <path d="M 50 82 L 50 110 L 230 110 L 230 75" fill="none" stroke="#f59e0b" strokeWidth="1.8" />

                  {/* AND Gate */}
                  <rect x="230" y="40" width="80" height="50" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" rx="3" />
                  <text x="270" y="65" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">AND GATE</text>

                  {/* Gated Clock Output */}
                  <line x1="310" y1="65" x2="380" y2="65" stroke="#38bdf8" strokeWidth="2.5" />
                  <text x="390" y="68" fill="#38bdf8" fontSize="8" fontWeight="bold">GCLK (Gated Clock)</text>
                  <text x="390" y="80" fill="#10b981" fontSize="6.5">Glitch-Free</text>
                </svg>
              )}

              {block.schematicType === 'buffer' && (
                <svg viewBox="0 0 440 120" className="w-full max-w-[460px] h-auto font-mono text-xs">
                  {/* Stage 1: Inverter 1X */}
                  <polygon points="40,25 90,55 40,85" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="94" cy="55" r="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
                  <text x="60" y="58" fill="#ffffff" fontSize="7" fontWeight="bold">1X</text>

                  <line x1="98" y1="55" x2="140" y2="55" stroke="#38bdf8" strokeWidth="2" />

                  {/* Stage 2: Inverter 4X */}
                  <polygon points="140,20 205,55 140,90" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.8" />
                  <circle cx="210" cy="55" r="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
                  <text x="165" y="58" fill="#ffffff" fontSize="7.5" fontWeight="bold">4X</text>

                  <line x1="215" y1="55" x2="265" y2="55" stroke="#38bdf8" strokeWidth="2.5" />

                  {/* Stage 3: Inverter 16X */}
                  <polygon points="265,12 350,55 265,98" fill="#0f766e" stroke="#14b8a6" strokeWidth="2" />
                  <circle cx="356" cy="55" r="6" fill="#042f2e" stroke="#14b8a6" strokeWidth="1.5" />
                  <text x="300" y="58" fill="#ffffff" fontSize="8.5" fontWeight="bold">16X DRIVER</text>

                  <line x1="362" y1="55" x2="415" y2="55" stroke="#14b8a6" strokeWidth="3" />
                  <text x="420" y="58" fill="#2dd4bf" fontSize="7.5" fontWeight="bold">OUT</text>
                </svg>
              )}

              {block.schematicType === 'dff' && (
                <svg viewBox="0 0 460 130" className="w-full max-w-[480px] h-auto font-mono text-xs">
                  {/* Master Latch */}
                  <rect x="50" y="25" width="120" height="75" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" rx="4" />
                  <text x="110" y="45" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">MASTER LATCH</text>
                  <text x="110" y="58" fill="#a5b4fc" fontSize="6.5" textAnchor="middle">Transparent when CLK=0</text>
                  <text x="70" y="75" fill="#e0e7ff" fontSize="7">D in</text>

                  {/* Intermediate node */}
                  <line x1="170" y1="60" x2="220" y2="60" stroke="#38bdf8" strokeWidth="2" />
                  <text x="195" y="52" fill="#38bdf8" fontSize="6.5" textAnchor="middle">Qm</text>

                  {/* Slave Latch */}
                  <rect x="220" y="25" width="120" height="75" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" rx="4" />
                  <text x="280" y="45" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">SLAVE LATCH</text>
                  <text x="280" y="58" fill="#a5b4fc" fontSize="6.5" textAnchor="middle">Transparent on CLK=1</text>
                  <text x="315" y="75" fill="#e0e7ff" fontSize="7">Q out</text>

                  <line x1="340" y1="60" x2="410" y2="60" stroke="#10b981" strokeWidth="2.5" />
                  <text x="415" y="63" fill="#34d399" fontSize="8" fontWeight="bold">Q</text>
                </svg>
              )}

              {/* Default fallback / other types */}
              {['pad', 'core', 'ndr', 'trunk', 'ioring', 'rom'].includes(block.schematicType) && (
                <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center text-xs font-mono space-y-1">
                  <div className="text-cyan-400 font-bold">Physical Cell Layer: {block.metalLayer}</div>
                  <div className="text-gray-300">Dimensions: {block.dimensions} • Role: {block.clockRole}</div>
                </div>
              )}
            </div>
          </div>

          {/* Step-by-Step "How It Works" Phases */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Step-by-Step Clock Operation Cycle</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {block.howItWorksPhases.map((phase, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-cyan-300 font-bold text-xs">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{phase.action}</span>
                  </div>
                  <div className="text-[10px] text-amber-400 font-semibold">{phase.phase}</div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">{phase.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Electrical & Timing Formulas Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Sliders size={14} className="text-amber-400" />
              <span>Key Electrical Constraints & Timing Metrics</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {block.electricalParams.map((param, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                  <div className="text-[10px] text-gray-400">{param.label}</div>
                  <div className="text-xs font-mono font-bold text-cyan-300">{param.value}</div>
                  {param.formula && (
                    <div className="text-[9px] font-mono text-gray-500 truncate" title={param.formula}>
                      {param.formula}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Simulation Monitor Strip */}
          <div className="p-3 rounded-2xl bg-[#121418] border border-white/10 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">Simulation Status:</span>
              <span className="text-emerald-400 font-bold">{currentWave.stateText}</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="text-gray-400">Time: <strong className="text-white">{currentWave.timePs} ps</strong></span>
              <span className="text-gray-400">CLK: <strong className="text-cyan-400">{currentWave.clockLevel}</strong></span>
              <span className="text-gray-400">Out: <strong className="text-emerald-400">{currentWave.outputLevel}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-[#181a20] flex items-center justify-between shrink-0 text-xs">
          <span className="text-gray-400">Click any other block on the die to inspect its circuitry.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

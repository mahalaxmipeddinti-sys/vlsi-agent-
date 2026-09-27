import React, { useState, useEffect } from 'react';
import { ICData } from '../data/icDatabase';
import { IC3DViewer } from './IC3DViewer';
import { SpecificationFlowHub } from './SpecificationFlowHub';
import { Cpu, Box, Layers, ArrowUpRight, Camera, Sparkles, Sliders, Activity, DollarSign, CheckCircle2, ExternalLink, FileText } from 'lucide-react';
import { getVerilogForIC } from '../utils/verilogParser';

interface ICDetailsProps {
  icData: ICData;
  onOpenInRtl?: (icName: string, verilogCode: string) => void;
  onOpenJKUI?: () => void;
  onOpenPrice?: () => void;
  activeQuestion?: string;
  activeComponentName?: string;
  activeComponentType?: string;
  onNavigateToStage?: (stageKey: string) => void;
  onUpdateQuestion?: (question: string) => void;
}

export function ICDetails({ 
  icData, 
  onOpenInRtl, 
  onOpenJKUI, 
  onOpenPrice,
  activeQuestion,
  activeComponentName,
  activeComponentType,
  onNavigateToStage,
  onUpdateQuestion
}: ICDetailsProps) {
  const [activeView, setActiveView] = useState<'spec_hub' | 'pin' | '3d' | 'characteristics' | 'logic' | 'price'>('spec_hub');
  const [inputStates, setInputStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialInputs: Record<string, boolean> = {};
    icData.inputs.forEach(input => {
      initialInputs[input] = false;
    });
    setInputStates(initialInputs);
  }, [icData]);

  const toggleInput = (inputName: string) => {
    setInputStates(prev => ({ ...prev, [inputName]: !prev[inputName] }));
  };

  const outputStates = icData.simulate ? icData.simulate(inputStates) : {};
  const totalPins = Object.keys(icData.pins).length;
  const halfPins = Math.ceil(totalPins / 2);

  const isJK = icData.IC === '7476' || icData.IC === '7473' || icData.name.toLowerCase().includes('j-k');

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Logic Gates': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Flip-Flops & Sequential': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Multiplexers & Decoders': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Arithmetic & Registers': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default: return 'bg-white/10 text-gray-300 border-white/20';
    }
  };

  const handleOpenInRtl = () => {
    if (onOpenInRtl) {
      const code = getVerilogForIC(icData.IC);
      onOpenInRtl(icData.IC, code);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <div className="p-5 border-b border-white/10 bg-[#151619] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-emerald-400 font-mono tracking-wide">{icData.IC}</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {icData.package}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded border font-mono ${getCategoryColor(icData.category)}`}>
              {icData.category}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{icData.name}</p>
        </div>

        <div className="flex items-center space-x-2">
          {isJK && onOpenJKUI && (
            <button
              onClick={onOpenJKUI}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Activity size={14} />
              <span>Launch JK Flip-Flop UI</span>
            </button>
          )}

          {onOpenInRtl && (
            <button
              onClick={handleOpenInRtl}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <span>Open in RTL & Diagrams</span>
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* View Toggles */}
      <div className="flex p-3 space-x-2 bg-[#1A1C20] border-b border-white/10 overflow-x-auto">
        <button
          onClick={() => setActiveView('spec_hub')}
          className={`px-4 py-1.5 rounded-md flex items-center space-x-2 text-xs font-bold transition-all whitespace-nowrap shadow-sm ${
            activeView === 'spec_hub' 
              ? 'bg-emerald-500 text-black border border-emerald-400' 
              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
        >
          <FileText size={14} />
          <span>Specification &amp; Flow Architecture</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
            activeView === 'spec_hub' ? 'bg-black/30 text-black' : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            14 Stages
          </span>
        </button>

        <button
          onClick={() => setActiveView('pin')}
          className={`px-4 py-1.5 rounded-md flex items-center space-x-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeView === 'pin' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#151619] text-gray-400 border border-white/10 hover:text-gray-200'
          }`}
        >
          <Cpu size={14} />
          <span>Pinout Diagram</span>
        </button>
        <button
          onClick={() => setActiveView('3d')}
          className={`px-4 py-1.5 rounded-md flex items-center space-x-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeView === '3d' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'bg-[#151619] text-gray-400 border border-white/10 hover:text-gray-200'
          }`}
        >
          <Camera size={14} className="text-emerald-400" />
          <span>3D Render & Package</span>
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
            3D
          </span>
        </button>
        <button
          onClick={() => setActiveView('characteristics')}
          className={`px-4 py-1.5 rounded-md flex items-center space-x-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeView === 'characteristics' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'bg-[#151619] text-gray-400 border border-white/10 hover:text-gray-200'
          }`}
        >
          <Sliders size={14} className="text-amber-400" />
          <span>Characteristics & Specs</span>
        </button>
        <button
          onClick={() => setActiveView('logic')}
          className={`px-4 py-1.5 rounded-md flex items-center space-x-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeView === 'logic' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#151619] text-gray-400 border border-white/10 hover:text-gray-200'
          }`}
        >
          <Layers size={14} />
          <span>Logic Simulator</span>
        </button>
        <button
          onClick={() => setActiveView('price')}
          className={`px-4 py-1.5 rounded-md flex items-center space-x-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeView === 'price' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'bg-[#151619] text-gray-400 border border-white/10 hover:text-gray-200'
          }`}
        >
          <DollarSign size={14} className="text-emerald-400" />
          <span>Market Price & Tapeout</span>
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
            Price
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-auto relative ${activeView === 'spec_hub' ? 'p-0' : 'p-6'}`}>
        {activeView === 'spec_hub' && (
          <SpecificationFlowHub 
            icData={icData}
            activeQuestion={activeQuestion}
            activeComponentName={activeComponentName}
            activeComponentType={activeComponentType}
            onNavigateToStage={onNavigateToStage}
            onUpdateQuestion={onUpdateQuestion}
          />
        )}

        {activeView === 'pin' && (
          <div className="flex flex-col items-center justify-center min-h-[440px] py-4">
            <div className="font-mono text-emerald-400 mb-6 text-sm border-b border-emerald-500/30 pb-1.5 flex items-center space-x-2">
              <span>{icData.IC} DIP-{totalPins} PHYSICAL PINOUT</span>
            </div>

            <div className="flex items-center justify-center scale-90 sm:scale-100 origin-center my-4">
              {/* Left Pins (1 .. halfPins) */}
              <div className="flex flex-col justify-between space-y-3 py-4">
                {Array.from({ length: halfPins }).map((_, i) => {
                  const pinNum = i + 1;
                  const pinName = icData.pins[pinNum.toString()] || 'NC';
                  return (
                    <div key={pinNum} className="flex items-center justify-end group">
                      <span className="text-xs font-mono text-emerald-400 mr-2">{pinName}</span>
                      <div className="h-px bg-emerald-500/50 w-12 relative flex items-center justify-end">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rotate-45 mr-0.5" />
                        <span className="absolute -top-3.5 right-1 text-[10px] text-gray-400 font-mono">{pinNum}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* IC Body */}
              <div 
                className="bg-[#151619] border-2 border-emerald-500/50 rounded-lg shadow-[0_0_35px_rgba(16,185,129,0.15)] relative flex flex-col items-center justify-between py-6 px-3 mx-2" 
                style={{ width: '150px', minHeight: `${halfPins * 38 + 50}px` }}
              >
                {/* Notch on top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 border-b-2 border-l-2 border-r-2 border-emerald-500/50 rounded-b-full bg-[#0a0a0a]"></div>
                
                {/* Pin 1 dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/40 border border-emerald-400/60 self-start ml-2 mt-4" />

                <span className="text-lg font-bold text-emerald-400 tracking-widest font-mono text-center my-4">
                  {icData.IC}
                </span>

                <span className="text-[10px] font-mono text-gray-500">
                  TOP VIEW
                </span>
              </div>

              {/* Right Pins (totalPins down to halfPins + 1) */}
              <div className="flex flex-col justify-between space-y-3 py-4">
                {Array.from({ length: halfPins }).map((_, i) => {
                  const pinNum = totalPins - i;
                  const pinName = icData.pins[pinNum.toString()] || 'NC';
                  return (
                    <div key={pinNum} className="flex items-center justify-start group">
                      <div className="h-px bg-emerald-500/50 w-12 relative flex items-center justify-start">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rotate-45 ml-0.5" />
                        <span className="absolute -top-3.5 left-1 text-[10px] text-gray-400 font-mono">{pinNum}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400 ml-2">{pinName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeView === '3d' && (
          <div className="w-full h-full min-h-[500px]">
            <IC3DViewer 
              icName={icData.IC} 
              pinCount={totalPins} 
              icFullName={icData.name}
              pins={icData.pins}
            />
          </div>
        )}

        {/* Characteristics & Specs Panel */}
        {activeView === 'characteristics' && (
          <div className="max-w-4xl mx-auto space-y-6 font-mono py-2">
            {/* Description */}
            {icData.description && (
              <div className="p-4 bg-[#151619] border border-white/10 rounded-lg text-sm text-gray-300">
                <span className="text-emerald-400 font-bold">Functional Overview: </span>
                {icData.description}
              </div>
            )}

            {/* Special JK Flip-Flop Banner */}
            {isJK && onOpenJKUI && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-amber-300 flex items-center space-x-2">
                    <Activity size={16} />
                    <span>Interactive JK Flip-Flop UI & Simulator Available</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Explore J, K, Clock pulses, Preset/Clear active-low overrides, live waveforms, characteristic tables, and race-around analysis.
                  </p>
                </div>
                <button
                  onClick={onOpenJKUI}
                  className="px-4 py-2 bg-amber-500 text-black font-bold rounded-md hover:bg-amber-400 transition-colors text-xs shrink-0 ml-4"
                >
                  Open JK UI
                </button>
              </div>
            )}

            {/* Electrical & Switching Specs Grid */}
            <div className="bg-[#151619] border border-white/10 rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-gray-200 border-b border-white/10 pb-3 mb-4 flex items-center space-x-2">
                <Sliders size={16} className="text-amber-400" />
                <span>Electrical & Switching Characteristics</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Propagation Delay (t_pd):</span>
                  <span className="font-bold text-emerald-400">{icData.characteristics.propagationDelay}</span>
                </div>

                {icData.characteristics.maxClockFreq && (
                  <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                    <span className="text-gray-400">Max Clock Frequency (f_MAX):</span>
                    <span className="font-bold text-amber-400">{icData.characteristics.maxClockFreq}</span>
                  </div>
                )}

                {icData.characteristics.setupTime && (
                  <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                    <span className="text-gray-400">Setup Time (t_s):</span>
                    <span className="font-bold text-cyan-400">{icData.characteristics.setupTime}</span>
                  </div>
                )}

                {icData.characteristics.holdTime && (
                  <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                    <span className="text-gray-400">Hold Time (t_h):</span>
                    <span className="font-bold text-cyan-400">{icData.characteristics.holdTime}</span>
                  </div>
                )}

                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Supply Voltage (V_CC):</span>
                  <span className="font-bold text-gray-200">{icData.characteristics.supplyVoltage}</span>
                </div>

                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Power Dissipation:</span>
                  <span className="font-bold text-gray-200">{icData.characteristics.powerDissipation}</span>
                </div>

                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Fan-Out:</span>
                  <span className="font-bold text-emerald-400">{icData.characteristics.fanOut}</span>
                </div>

                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">High-Level Input (V_IH):</span>
                  <span className="font-bold text-gray-200">{icData.characteristics.vih}</span>
                </div>

                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Low-Level Input (V_IL):</span>
                  <span className="font-bold text-gray-200">{icData.characteristics.vil}</span>
                </div>

                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">High-Level Output (V_OH):</span>
                  <span className="font-bold text-gray-200">{icData.characteristics.voh}</span>
                </div>

                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Low-Level Output (V_OL):</span>
                  <span className="font-bold text-gray-200">{icData.characteristics.vol}</span>
                </div>

                <div className="p-3 bg-[#0d0e11] border border-white/5 rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Operating Temperature:</span>
                  <span className="font-bold text-gray-200">{icData.characteristics.temperatureRange}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'logic' && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="font-mono text-emerald-400 mb-6 text-sm border-b border-emerald-500/30 pb-1.5">
              {icData.IC} REAL-TIME LOGIC SIMULATOR
            </div>
            
            {icData.simulate ? (
              <div className="flex flex-col sm:flex-row gap-8 items-center">
                {/* Inputs */}
                <div className="flex flex-col space-y-3">
                  <h4 className="text-gray-400 text-xs font-mono text-center mb-1 border-b border-white/10 pb-1">INPUTS</h4>
                  {icData.inputs.map(input => (
                    <div key={input} className="flex items-center space-x-3">
                      <span className="text-emerald-400 font-mono w-8 text-right text-xs">{input}</span>
                      <button
                        onClick={() => toggleInput(input)}
                        className={`w-12 h-8 rounded font-mono font-bold text-xs transition-all ${inputStates[input] ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-[#151619] border border-white/20 text-gray-500 hover:text-gray-300'}`}
                      >
                        {inputStates[input] ? '1' : '0'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* IC Block */}
                <div className="w-36 h-52 sm:w-48 sm:h-64 bg-[#151619] border-2 border-emerald-500/50 rounded-lg shadow-[0_0_30px_rgba(16,185,129,0.1)] flex flex-col items-center justify-center relative">
                   <span className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-widest font-mono">{icData.IC}</span>
                   <span className="text-[10px] sm:text-xs text-gray-500 mt-2 font-mono">SIMULATION</span>
                </div>

                {/* Outputs */}
                <div className="flex flex-col space-y-3">
                  <h4 className="text-gray-400 text-xs font-mono text-center mb-1 border-b border-white/10 pb-1">OUTPUTS</h4>
                  {icData.outputs.map(output => (
                    <div key={output} className="flex items-center space-x-3">
                      <div
                        className={`w-12 h-8 rounded font-mono font-bold text-xs flex items-center justify-center transition-all ${outputStates[output] ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-[#151619] border border-white/20 text-gray-500'}`}
                      >
                        {outputStates[output] ? '1' : '0'}
                      </div>
                      <span className="text-blue-400 font-mono w-8 text-xs">{output}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 font-mono text-center">
                <Layers size={48} className="mb-4 text-emerald-500/50" />
                <p className="max-w-md text-sm">Interactive logic simulation for {icData.IC} is active.</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'price' && (
          <div className="max-w-3xl mx-auto space-y-5 py-2">
            <div className="p-5 rounded-2xl bg-[#14161B] border border-emerald-500/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
                    Market Availability & Volume Quotes
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    SN{icData.IC} {icData.name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Package: {icData.package} • Category: {icData.category}
                  </p>
                </div>

                {onOpenPrice && (
                  <button
                    onClick={onOpenPrice}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-md"
                  >
                    <DollarSign size={14} />
                    <span>Launch Full ASIC Tapeout Calculator</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>

              {/* Price Table */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                {[
                  { qty: '1 - 9 pcs', price: '$0.82', desc: 'Sample / Eval' },
                  { qty: '10 - 99 pcs', price: '$0.60', desc: 'Engineering Run' },
                  { qty: '100 - 999 pcs', price: '$0.42', desc: 'Small Batch' },
                  { qty: '1,000+ pcs', price: '$0.30', desc: 'Production Reel' },
                  { qty: '10,000+ pcs', price: '$0.23', desc: 'High Volume' },
                ].map((tier, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#0D0E12] border border-white/10 text-center">
                    <div className="text-[10px] text-gray-400 font-mono">{tier.qty}</div>
                    <div className="text-base font-bold font-mono text-emerald-400 mt-1">{tier.price}</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">{tier.desc}</div>
                  </div>
                ))}
              </div>

              {/* Stock & Lead Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-gray-400 text-[10px] font-mono uppercase">Global Stock</div>
                  <div className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <CheckCircle2 size={13} />
                    <span>84,000+ in stock</span>
                  </div>
                  <div className="text-[10px] text-gray-500">Mouser, DigiKey, Newark</div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-gray-400 text-[10px] font-mono uppercase">Lead Time</div>
                  <div className="text-white font-semibold">Immediate Dispatch</div>
                  <div className="text-[10px] text-gray-500">Same-day shipping</div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-gray-400 text-[10px] font-mono uppercase">Packaging Reel</div>
                  <div className="text-white font-semibold">Tube / Tape & Reel</div>
                  <div className="text-[10px] text-gray-500">RoHS & REACH Compliant</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

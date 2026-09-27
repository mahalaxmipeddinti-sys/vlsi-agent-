import React, { useState } from 'react';
import { 
  FileText, 
  GitMerge, 
  Activity, 
  Code2, 
  FileCheck2, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  Table, 
  Cpu, 
  Maximize2,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

interface FrontEndFlowBoardProps {
  onNavigateToTab: (tabId: string) => void;
  activeStage?: number;
  onSelectStage?: (stage: number) => void;
}

export function FrontEndFlowBoard({ onNavigateToTab }: FrontEndFlowBoardProps) {
  const [selectedStage, setSelectedStage] = useState<number>(3); // Default highlight on stage 3 (Logical Verification)
  const [activeRtlLang, setActiveRtlLang] = useState<'Verilog' | 'VHDL' | 'SystemVerilog'>('Verilog');

  // Interactive Live Changeable Inputs for Stage 3
  const [inputs, setInputs] = useState<{ A: number; B: number; Cin: number }>({ A: 1, B: 0, Cin: 1 });
  const sumOut = (inputs.A ^ inputs.B) ^ inputs.Cin;
  const coutOut = ((inputs.A & inputs.B) | ((inputs.A ^ inputs.B) & inputs.Cin));

  const toggleInput = (key: 'A' | 'B' | 'Cin') => {
    setInputs(prev => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));
  };

  const STAGES = [
    {
      id: 1,
      name: '1. Specification',
      tab: 'icExplorer',
      badge: 'Architecture & I/O',
      detailTitle: 'Basic Info & Functional Behaviour',
      items: ['Basic Info & IC Details', 'I/O Ports & Electrical Ratings', 'Functional Behaviour & Truth Table'],
      icon: <FileText size={16} className="text-cyan-400" />,
      color: 'border-cyan-500/40 text-cyan-300'
    },
    {
      id: 2,
      name: '2. Logical Diagram',
      tab: 'diagram',
      badge: 'Schematic Diagram',
      detailTitle: 'Schematic Diagram',
      items: ['Gate-Level Schematic Diagram', 'RTL Block Interconnects', 'Pinout & Netlist Representation'],
      icon: <GitMerge size={16} className="text-blue-400" />,
      color: 'border-blue-500/40 text-blue-300'
    },
    {
      id: 3,
      name: '3. Logical Verification',
      tab: 'logicalVerification',
      badge: 'Interactive Workbench',
      detailTitle: 'Logical Diagram • Truth Tables • Wave Forms • Changeable Inputs',
      items: ['Logical Diagram', 'Truth Tables', 'Wave Forms', 'Changeable Inputs'],
      icon: <Activity size={16} className="text-emerald-400" />,
      color: 'border-emerald-500/40 text-emerald-300'
    },
    {
      id: 4,
      name: '4. RTL Design',
      tab: 'rtl',
      badge: 'VHDL • Verilog • SystemVerilog',
      detailTitle: 'Multi-Language RTL Synthesis',
      items: ['VHDL', 'Verilog', 'SystemVerilog'],
      icon: <Code2 size={16} className="text-purple-400" />,
      color: 'border-purple-500/40 text-purple-300'
    },
    {
      id: 5,
      name: '5. RTL Verification',
      tab: 'testbench',
      badge: 'Test Benches',
      detailTitle: 'Automated Test Benches',
      items: ['Self-Checking Test Benches', 'Stimulus Generation', 'Functional Coverage Assertions'],
      icon: <FileCheck2 size={16} className="text-teal-400" />,
      color: 'border-teal-500/40 text-teal-300'
    },
    {
      id: 6,
      name: '6. Logic Synthesis',
      tab: 'cmos',
      badge: 'CMOS Logic Ckt',
      detailTitle: 'CMOS Transistor Level Logic Circuit',
      items: ['CMOS Logic Ckt', 'Pull-Up PMOS Network', 'Pull-Down NMOS Network', 'Transistor W/L Ratios'],
      icon: <Zap size={16} className="text-pink-400" />,
      color: 'border-pink-500/40 text-pink-300'
    },
    {
      id: 7,
      name: '7. DFT Verification',
      tab: 'dftVerification',
      badge: 'Test Patterns',
      detailTitle: 'Design For Testability (DFT) & ATPG',
      items: ['ATPG Test Patterns', 'Scan Chain Registers (SE/SI/SO)', '99.2% Stuck-At Fault Coverage'],
      icon: <CheckCircle2 size={16} className="text-amber-400" />,
      color: 'border-amber-500/40 text-amber-300'
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-2">
      {/* Visual Header matching handwritten curly brace "{ front end part" */}
      <div className="flex items-center space-x-3 mb-4 px-2">
        <div className="text-2xl font-serif text-emerald-400 font-light select-none">
          &#123;
        </div>
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
            front end part
          </span>
          <span className="text-xs text-gray-400 ml-2.5">
            VLSI Front-End Chip Design & Verification Flow
          </span>
        </div>
      </div>

      {/* Main Grid: Left Capsule (1-7) & Right Detail Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: The Vertical Rounded Capsule matching "front end part" */}
        <div className="lg:col-span-4 bg-[#18191d] rounded-2xl border-2 border-emerald-500/40 p-3 shadow-xl space-y-2">
          <div className="px-2 py-1 border-b border-white/10 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-300 font-bold uppercase">
              7-Stage Pipeline
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">FLOW</span>
          </div>

          {STAGES.map((stage) => {
            const isSelected = selectedStage === stage.id;
            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group select-none ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md scale-[1.02]'
                    : 'bg-[#141518] border-white/10 hover:border-white/20 text-gray-300 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/5 text-gray-400'}`}>
                    {stage.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate group-hover:text-emerald-300">
                      {stage.name}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {stage.badge}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 text-black font-bold border-emerald-400'
                      : 'bg-white/5 text-gray-500 border-white/10 group-hover:border-emerald-500/30'
                  }`}>
                    ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Area: Connected Interactive Modules based on selected stage */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* STAGE 1: SPECIFICATION */}
          {selectedStage === 1 && (
            <div className="p-5 rounded-2xl bg-[#17181c] border border-cyan-500/40 shadow-lg space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2.5">
                  <FileText className="text-cyan-400" size={18} />
                  <h3 className="text-sm font-bold text-white">1. Specification</h3>
                </div>
                <button
                  onClick={() => onNavigateToTab('icExplorer')}
                  className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <span>Open Full Specs</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <div className="text-xs font-bold text-cyan-300 mb-1">Basic Info</div>
                  <ul className="text-xs text-gray-300 space-y-1 list-disc pl-4">
                    <li>Silicon Technology: CMOS 45nm / TTL Compatible</li>
                    <li>Supply Voltage (VDD): +5.0V / 3.3V Low-Power</li>
                    <li>Operating Temp: -40°C to 125°C</li>
                    <li>Propagation Delay (tpd): 8.5 ns typical</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <div className="text-xs font-bold text-cyan-300 mb-1">I/O & Functional Behaviour</div>
                  <ul className="text-xs text-gray-300 space-y-1 list-disc pl-4">
                    <li>Inputs: A, B (Operands), Cin (Carry In), EN (Enable)</li>
                    <li>Outputs: Sum (S), Cout (Carry Out)</li>
                    <li>Synchronous / Asynchronous reset control</li>
                    <li>Active-high logic with hysteresis inputs</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: LOGICAL DIAGRAM */}
          {selectedStage === 2 && (
            <div className="p-5 rounded-2xl bg-[#17181c] border border-blue-500/40 shadow-lg space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2.5">
                  <GitMerge className="text-blue-400" size={18} />
                  <h3 className="text-sm font-bold text-white">2. Logical Diagram</h3>
                </div>
                <button
                  onClick={() => onNavigateToTab('diagram')}
                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <span>Open Full Schematic</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
                <div className="text-xs font-bold text-blue-300 mb-2">Gate-Level Schematic Diagram</div>
                <div className="py-6 flex items-center justify-center space-x-4 font-mono text-xs text-gray-300">
                  <span className="p-2 rounded bg-white/5 border border-white/10">Input Pins [A, B, Cin]</span>
                  <span>➔</span>
                  <span className="p-2 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300">[XOR1 & AND1 Gates]</span>
                  <span>➔</span>
                  <span className="p-2 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300">[XOR2 & OR1 Gates]</span>
                  <span>➔</span>
                  <span className="p-2 rounded bg-white/5 border border-white/10">Output Pins [Sum, Cout]</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Complete netlist wiring mapped to 7400/ASIC standard cell libraries with gate fan-out calculation.
                </p>
              </div>
            </div>
          )}

          {/* STAGE 3: LOGICAL VERIFICATION (Exact match to handwritten container!) */}
          {selectedStage === 3 && (
            <div className="p-5 rounded-2xl bg-[#17181c] border-2 border-emerald-500/50 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Activity size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>3. Logical Verification Workbench</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        LIVE
                      </span>
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToTab('logicalVerification')}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                >
                  <Maximize2 size={13} />
                  <span>Expand Workbench</span>
                </button>
              </div>

              {/* The 4 sub-boxes requested in the handwritten note:
                  - logical diagram
                  - truth tables
                  - wave forms
                  - changeable inputs
              */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Changeable Inputs */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                      <Sliders size={14} />
                      <span>Changeable Inputs</span>
                    </div>
                    <span className="text-[9px] font-mono text-gray-400">(Tap to toggle)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['A', 'B', 'Cin'] as const).map(pin => {
                      const val = inputs[pin];
                      return (
                        <button
                          key={pin}
                          onClick={() => toggleInput(pin)}
                          className={`p-2 rounded-lg border text-center font-mono text-xs transition-all ${
                            val === 1
                              ? 'bg-emerald-500/25 border-emerald-400 text-white font-bold shadow'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          <div className="text-[10px] text-gray-400">{pin}</div>
                          <div className="text-base font-bold">{val}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-1 text-gray-300 border-t border-white/5">
                    <span>SUM = <strong className="text-blue-400">{sumOut}</strong></span>
                    <span>COUT = <strong className="text-amber-400">{coutOut}</strong></span>
                  </div>
                </div>

                {/* 2. Truth Tables */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                      <Table size={14} />
                      <span>Truth Tables</span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400">Active Row Highlight</span>
                  </div>

                  <div className="overflow-x-auto rounded border border-white/5 max-h-28 text-[11px] font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-white/5 text-gray-400 text-[9px] uppercase">
                        <tr>
                          <th className="px-2 py-0.5">A</th>
                          <th className="px-2 py-0.5">B</th>
                          <th className="px-2 py-0.5">Cin</th>
                          <th className="px-2 py-0.5 text-blue-400">Sum</th>
                          <th className="px-2 py-0.5 text-amber-400">Cout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[
                          [0,0,0,0,0],
                          [0,0,1,1,0],
                          [0,1,0,1,0],
                          [0,1,1,0,1],
                          [1,0,0,1,0],
                          [1,0,1,0,1],
                          [1,1,0,0,1],
                          [1,1,1,1,1]
                        ].map(([a,b,cin,s,c], i) => {
                          const isMatch = a === inputs.A && b === inputs.B && cin === inputs.Cin;
                          return (
                            <tr key={i} className={isMatch ? 'bg-emerald-500/30 font-bold text-white' : 'text-gray-400'}>
                              <td className="px-2 py-0.5">{a}</td>
                              <td className="px-2 py-0.5">{b}</td>
                              <td className="px-2 py-0.5">{cin}</td>
                              <td className="px-2 py-0.5">{s}</td>
                              <td className="px-2 py-0.5">{c}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Logical Diagram Preview */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-400">
                    <Cpu size={14} />
                    <span>Logical Diagram</span>
                  </div>
                  <div className="bg-[#101114] p-2 rounded-lg text-center font-mono text-[10px] text-gray-300">
                    <div className="flex items-center justify-between px-2">
                      <span className={inputs.A ? 'text-emerald-400 font-bold' : 'text-gray-500'}>A({inputs.A})</span>
                      <span className="text-gray-600">─► [XOR1] ─► P({inputs.A ^ inputs.B}) ─►</span>
                      <span className={sumOut ? 'text-blue-400 font-bold' : 'text-gray-500'}>SUM({sumOut})</span>
                    </div>
                    <div className="flex items-center justify-between px-2 mt-1">
                      <span className={inputs.B ? 'text-emerald-400 font-bold' : 'text-gray-500'}>B({inputs.B})</span>
                      <span className="text-gray-600">─► [AND1] ─► G({inputs.A & inputs.B}) ─►</span>
                      <span className={coutOut ? 'text-amber-400 font-bold' : 'text-gray-500'}>COUT({coutOut})</span>
                    </div>
                  </div>
                </div>

                {/* 4. Wave Forms */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-400">
                    <Activity size={14} />
                    <span>Wave Forms</span>
                  </div>
                  <div className="bg-[#101114] p-2 rounded-lg space-y-1 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400">A:</span>
                      <span className="text-gray-400 font-mono tracking-widest">{inputs.A ? '──┐   ┌──' : '  └───┘  '}</span>
                      <span className="text-white">{inputs.A}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400">B:</span>
                      <span className="text-gray-400 font-mono tracking-widest">{inputs.B ? '──┐   ┌──' : '  └───┘  '}</span>
                      <span className="text-white">{inputs.B}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400">SUM:</span>
                      <span className="text-gray-400 font-mono tracking-widest">{sumOut ? '──┐   ┌──' : '  └───┘  '}</span>
                      <span className="text-white">{sumOut}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STAGE 4: RTL DESIGN */}
          {selectedStage === 4 && (
            <div className="p-5 rounded-2xl bg-[#17181c] border border-purple-500/40 shadow-lg space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Code2 className="text-purple-400" size={18} />
                  <h3 className="text-sm font-bold text-white">4. RTL Design</h3>
                </div>

                {/* VHDL, Verilog, SystemVerilog Language Selector */}
                <div className="flex space-x-1 bg-black/40 p-1 rounded-lg border border-white/10">
                  {(['Verilog', 'VHDL', 'SystemVerilog'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setActiveRtlLang(lang)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-colors ${
                        activeRtlLang === lang
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code preview */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-gray-200 space-y-1">
                {activeRtlLang === 'Verilog' && (
                  <pre className="text-emerald-300">
{`module full_adder (
    input  wire A,
    input  wire B,
    input  wire Cin,
    output wire Sum,
    output wire Cout
);
    assign Sum  = A ^ B ^ Cin;
    assign Cout = (A & B) | ((A ^ B) & Cin);
endmodule`}
                  </pre>
                )}

                {activeRtlLang === 'VHDL' && (
                  <pre className="text-purple-300">
{`library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity full_adder is
    Port ( A, B, Cin : in  STD_LOGIC;
           Sum, Cout : out STD_LOGIC);
end full_adder;

architecture Behavioral of full_adder is
begin
    Sum  <= A XOR B XOR Cin;
    Cout <= (A AND B) OR ((A XOR B) AND Cin);
end Behavioral;`}
                  </pre>
                )}

                {activeRtlLang === 'SystemVerilog' && (
                  <pre className="text-cyan-300">
{`interface adder_if (input logic clk);
    logic A, B, Cin, Sum, Cout;
endinterface

module full_adder (
    input  logic A, B, Cin,
    output logic Sum, Cout
);
    always_comb begin
        Sum  = A ^ B ^ Cin;
        Cout = (A & B) | ((A ^ B) & Cin);
    end
endmodule`}
                  </pre>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => onNavigateToTab('rtl')}
                  className="px-3.5 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                >
                  <span>Open Monaco RTL Editor</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 5: RTL VERIFICATION */}
          {selectedStage === 5 && (
            <div className="p-5 rounded-2xl bg-[#17181c] border border-teal-500/40 shadow-lg space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2.5">
                  <FileCheck2 className="text-teal-400" size={18} />
                  <h3 className="text-sm font-bold text-white">5. RTL Verification</h3>
                </div>
                <button
                  onClick={() => onNavigateToTab('testbench')}
                  className="px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <span>Open Testbench</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="text-xs font-bold text-teal-300">Automated Test Benches & Assertions</div>
                <p className="text-xs text-gray-300">
                  Comprehensive testbench applying directed and constrained-random test vectors. Self-checking assertions verify expected output against golden reference models.
                </p>
                <div className="p-2.5 rounded bg-black/60 font-mono text-[11px] text-gray-300">
                  <span className="text-emerald-400">✓ Test Case 1:</span> A=0, B=0, Cin=0 ➔ PASS (Sum=0, Cout=0)<br />
                  <span className="text-emerald-400">✓ Test Case 2:</span> A=1, B=1, Cin=1 ➔ PASS (Sum=1, Cout=1)<br />
                  <span className="text-teal-300">Functional Coverage:</span> 100% of state transitions covered.
                </div>
              </div>
            </div>
          )}

          {/* STAGE 6: LOGIC SYNTHESIS (CMOS Logic Ckt) */}
          {selectedStage === 6 && (
            <div className="p-5 rounded-2xl bg-[#17181c] border border-pink-500/40 shadow-lg space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Zap className="text-pink-400" size={18} />
                  <h3 className="text-sm font-bold text-white">6. Logic Synthesis (CMOS Logic Ckt)</h3>
                </div>
                <button
                  onClick={() => onNavigateToTab('cmos')}
                  className="px-3 py-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <span>Open CMOS Studio</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div className="text-xs font-bold text-pink-300 mb-1">Pull-Up Network (PUN)</div>
                  <p className="text-xs text-gray-400 mb-2">
                    PMOS transistors connecting output to VDD (Power rail). Active when logic inputs evaluate low.
                  </p>
                  <div className="text-[10px] font-mono text-gray-300 bg-white/5 p-2 rounded">
                    PMOS Count: 14 Transistors<br />
                    Channel Width (Wp): 2.5 µm
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div className="text-xs font-bold text-blue-300 mb-1">Pull-Down Network (PDN)</div>
                  <p className="text-xs text-gray-400 mb-2">
                    NMOS transistors connecting output to VSS (Ground). Dual-network topology for zero static power.
                  </p>
                  <div className="text-[10px] font-mono text-gray-300 bg-white/5 p-2 rounded">
                    NMOS Count: 14 Transistors<br />
                    Channel Width (Wn): 1.2 µm
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 7: DFT VERIFICATION (Test Patterns) */}
          {selectedStage === 7 && (
            <div className="p-5 rounded-2xl bg-[#17181c] border border-amber-500/40 shadow-lg space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="text-amber-400" size={18} />
                  <h3 className="text-sm font-bold text-white">7. DFT Verification (Test Patterns)</h3>
                </div>
                <button
                  onClick={() => onNavigateToTab('dftVerification')}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <span>Open DFT Studio</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">Automatic Test Pattern Generation (ATPG)</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">99.2% Fault Coverage</span>
                </div>
                <p className="text-xs text-gray-300">
                  Scan chain insertion converts all sequential storage elements into shift registers during test mode, allowing full observability and controllability of internal gate nodes.
                </p>

                <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
                  <div className="p-2 rounded bg-white/5 border border-white/10">
                    <div className="text-[9px] text-gray-400">Scan In (SI)</div>
                    <div className="text-cyan-400 font-bold">10110</div>
                  </div>
                  <div className="p-2 rounded bg-white/5 border border-white/10">
                    <div className="text-[9px] text-gray-400">Clock Cycles</div>
                    <div className="text-amber-400 font-bold">16 CLK</div>
                  </div>
                  <div className="p-2 rounded bg-white/5 border border-white/10">
                    <div className="text-[9px] text-gray-400">Scan Out (SO)</div>
                    <div className="text-emerald-400 font-bold">01001</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

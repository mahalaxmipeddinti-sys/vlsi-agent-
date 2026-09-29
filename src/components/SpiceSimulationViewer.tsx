import React, { useState } from 'react';
import { Play, FileText, Zap, Activity, Download } from 'lucide-react';

export function SpiceSimulationViewer() {
  const [spiceCode, setSpiceCode] = useState(`* CMOS 2-to-1 Multiplexer SPICE Netlist
* VDD and GND
Vdd VDD 0 1.8V
Vin IN 0 PULSE(0 1.8 0 10p 10p 5n 10n)
Vsel SEL 0 PULSE(0 1.8 0 10p 10p 10n 20n)

* Transistors
M1 OUT IN VDD VDD pmos W=2u L=0.18u
M2 OUT IN GND GND nmos W=1u L=0.18u

* Transient Analysis
.tran 0.1n 30n
.measure tran delay_time trig v(IN) val=0.9 td=0 cross=1 targ v(OUT) val=0.9 td=0 cross=1
.end
`);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<string | null>(null);

  const handleSimulate = () => {
    setIsSimulating(true);
    setResults(null);
    // Mock simulation delay
    setTimeout(() => {
      setResults(`LTspice Simulation Log:
-----------------------------------------
Parsing SPICE netlist...
Circuit: CMOS 2-to-1 Multiplexer

Doing Transient Analysis:
10% ... 
50% ... 
100% ...

Measurement 'delay_time':
delay_time: 1.24ns

Total simulation time: 0.03 seconds.
`);
      setIsSimulating(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#121316] text-gray-200 overflow-hidden">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-white/10 bg-[#16171B] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
            <Activity size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">
                Front End Flow • Stage 8
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight">
                SPICE / LTspice Simulation Workbench
              </h2>
            </div>
            <p className="text-[11px] text-gray-400">
              Interactive LTspice netlist execution and transient analysis
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50"
          >
            {isSimulating ? <Activity className="animate-spin" size={14} /> : <Play size={14} />}
            <span>{isSimulating ? 'Simulating...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden p-5 w-full">
        {/* Left pane: Editor */}
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#1A1C20] shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
              <FileText size={14} />
              <span>SPICE Netlist (.net / .cir)</span>
            </div>
            <button className="text-gray-500 hover:text-gray-300">
              <Download size={14} />
            </button>
          </div>
          <textarea
            value={spiceCode}
            onChange={(e) => setSpiceCode(e.target.value)}
            className="flex-1 bg-transparent text-[13px] p-4 text-emerald-400 font-mono focus:outline-none resize-none whitespace-pre"
            spellCheck="false"
          />
        </div>

        {/* Right pane: Results */}
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#1A1C20] shadow-sm">
          <div className="flex items-center px-4 py-2.5 bg-black/40 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
              <Activity size={14} />
              <span>Simulation Results & Output</span>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto font-mono text-[13px] text-gray-300 whitespace-pre">
            {results || <span className="text-gray-600">Click "Run Simulation" to execute the netlist in LTspice...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  Zap, 
  Activity, 
  ShieldCheck, 
  Maximize2, 
  X, 
  Info, 
  CheckCircle2, 
  Sliders, 
  Cpu, 
  Layers, 
  Play, 
  RotateCw,
  TrendingDown,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export interface StandardCellInfo {
  id: string;
  name: string;
  type: 'NAND2' | 'NOR2' | 'INV' | 'DFF' | 'MUX2' | 'CLKBUF' | 'TAPCELL' | 'DECAP' | 'AOI22';
  x: number;
  y: number;
  w: number;
  h: number;
  group: string;
  color: string;
  fanout: number;
  powerRailVdd: string;
  powerRailVss: string;
  irDropMv: number;
  leakagePowerNw: number;
  dynamicPowerUw: number;
  driveStrength: string;
  propagationDelayPs: number;
  inputCapFf: number;
}

interface PlacementCellCircuitViewProps {
  cell: StandardCellInfo;
  onClose?: () => void;
  isModal?: boolean;
}

export function PlacementCellCircuitView({ cell, onClose, isModal = false }: PlacementCellCircuitViewProps) {
  // Interactive inputs for live logic simulation
  const [inA, setInA] = useState<number>(1);
  const [inB, setInB] = useState<number>(0);
  const [inClk, setInClk] = useState<number>(0);
  const [inD, setInD] = useState<number>(1);
  const [inSel, setInSel] = useState<number>(0);
  const [qState, setQState] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'transistor' | 'logic' | 'pdn' | 'timing'>('transistor');

  // Compute logic output based on cell type
  const computeOutput = () => {
    switch (cell.type) {
      case 'NAND2':
        return inA === 1 && inB === 1 ? 0 : 1;
      case 'NOR2':
        return inA === 0 && inB === 0 ? 1 : 0;
      case 'INV':
        return inA === 1 ? 0 : 1;
      case 'CLKBUF':
        return inA;
      case 'MUX2':
        return inSel === 0 ? inA : inB;
      case 'DFF':
        return qState;
      case 'AOI22':
        return (inA && inB) || (inD && inSel) ? 0 : 1;
      default:
        return 1;
    }
  };

  const outY = computeOutput();

  const handleClockPulse = () => {
    setInClk(1);
    setQState(inD);
    setTimeout(() => {
      setInClk(0);
    }, 400);
  };

  return (
    <div className={`flex flex-col ${isModal ? 'h-[85vh] max-h-[800px] w-full max-w-4xl bg-[#12141a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden' : 'h-full bg-[#13151b] border-l border-white/10'}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-transparent to-transparent flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Cpu size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-white">{cell.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                {cell.type} â€¢ {cell.driveStrength}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                M1 Rail: {cell.powerRailVdd}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Transistor Topology & Power Delivery Network (PDN) Inner Connection
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close Panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 bg-black/30 border-b border-white/5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('transistor')}
            className={`px-3 py-1 rounded-lg font-mono font-medium transition-colors ${
              activeTab === 'transistor'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            CMOS Transistor Schematic
          </button>
          <button
            onClick={() => setActiveTab('pdn')}
            className={`px-3 py-1 rounded-lg font-mono font-medium transition-colors ${
              activeTab === 'pdn'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            PDN Power Rail Interconnect
          </button>
          <button
            onClick={() => setActiveTab('timing')}
            className={`px-3 py-1 rounded-lg font-mono font-medium transition-colors ${
              activeTab === 'timing'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Timing & Electrical Specs
          </button>
        </div>

        {/* Live Simulation Controls */}
        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <span className="text-gray-500">Live Stimulus:</span>
          {cell.type !== 'TAPCELL' && cell.type !== 'DECAP' && (
            <>
              <button
                onClick={() => setInA(inA === 1 ? 0 : 1)}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  inA === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                A = {inA}
              </button>

              {(cell.type === 'NAND2' || cell.type === 'NOR2' || cell.type === 'MUX2' || cell.type === 'AOI22') && (
                <button
                  onClick={() => setInB(inB === 1 ? 0 : 1)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    inB === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  B = {inB}
                </button>
              )}

              {cell.type === 'MUX2' && (
                <button
                  onClick={() => setInSel(inSel === 1 ? 0 : 1)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    inSel === 1 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  SEL = {inSel}
                </button>
              )}

              {cell.type === 'DFF' && (
                <>
                  <button
                    onClick={() => setInD(inD === 1 ? 0 : 1)}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      inD === 1 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    D = {inD}
                  </button>
                  <button
                    onClick={handleClockPulse}
                    className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded flex items-center space-x-1"
                  >
                    <Play size={10} />
                    <span>CLK Pulse</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center">
        {activeTab === 'transistor' && (
          <div className="w-full flex flex-col items-center">
            {/* SVG Transistor Schematic */}
            <div className="w-full max-w-xl bg-[#090b10] border border-white/10 rounded-xl p-4 shadow-xl relative overflow-hidden">
              {/* Background Grid */}
              <div className="absolute top-2 left-3 text-[10px] font-mono text-gray-500">
                PUN (Pull-Up PMOS) / PDN (Pull-Down NMOS) Circuit
              </div>

              <svg viewBox="0 0 460 300" className="w-full h-auto select-none font-mono">
                {/* 1. M1 VDD Power Rail at Top */}
                <g>
                  <rect x="20" y="20" width="420" height="12" fill="#ef4444" rx="2" fillOpacity="0.85" />
                  <text x="230" y="29" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                    TOP M1 POWER RAIL: VDD = {cell.powerRailVdd} (Effective: {(1.0 - cell.irDropMv / 1000).toFixed(3)}V)
                  </text>
                  {/* Abutment Contact */}
                  <rect x="220" y="32" width="20" height="8" fill="#fbbf24" rx="1" />
                  <text x="230" y="38" fill="#000000" fontSize="6" fontWeight="bold" textAnchor="middle">VIA1</text>
                </g>

                {/* 2. M1 VSS Ground Rail at Bottom */}
                <g>
                  <rect x="20" y="268" width="420" height="12" fill="#06b6d4" rx="2" fillOpacity="0.85" />
                  <text x="230" y="277" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                    BOTTOM M1 GROUND RAIL: VSS = {cell.powerRailVss} (0.000V)
                  </text>
                  {/* Abutment Contact */}
                  <rect x="220" y="260" width="20" height="8" fill="#fbbf24" rx="1" />
                  <text x="230" y="266" fill="#000000" fontSize="6" fontWeight="bold" textAnchor="middle">VIA1</text>
                </g>

                {/* NAND2 / NOR2 / INV Transistor Schematics */}
                {cell.type === 'NAND2' && (
                  <g transform="translate(100, 45)">
                    {/* PMOS Transistors in Parallel (Top) */}
                    <line x1="80" y1="0" x2="80" y2="35" stroke="#ef4444" strokeWidth="2" />
                    <line x1="180" y1="0" x2="180" y2="35" stroke="#ef4444" strokeWidth="2" />
                    <line x1="80" y1="15" x2="180" y2="15" stroke="#ef4444" strokeWidth="2" />

                    {/* PMOS 1 (Gate A) */}
                    <rect x="60" y="35" width="40" height="30" rx="3" fill="#1e1b4b" stroke={inA === 0 ? '#10b981' : '#4b5563'} strokeWidth="1.8" />
                    <text x="80" y="52" fill="#c7d2fe" fontSize="8" textAnchor="middle">PMOS A</text>
                    <circle cx="50" cy="50" r="3" fill="#ffffff" />
                    <line x1="20" y1="50" x2="47" y2="50" stroke="#10b981" strokeWidth="1.5" />
                    <text x="12" y="53" fill="#34d399" fontSize="9">A={inA}</text>

                    {/* PMOS 2 (Gate B) */}
                    <rect x="160" y="35" width="40" height="30" rx="3" fill="#1e1b4b" stroke={inB === 0 ? '#10b981' : '#4b5563'} strokeWidth="1.8" />
                    <text x="180" y="52" fill="#c7d2fe" fontSize="8" textAnchor="middle">PMOS B</text>
                    <circle cx="150" cy="50" r="3" fill="#ffffff" />
                    <line x1="120" y1="50" x2="147" y2="50" stroke="#10b981" strokeWidth="1.5" />
                    <text x="112" y="53" fill="#34d399" fontSize="9">B={inB}</text>

                    {/* Output Node Y */}
                    <line x1="80" y1="65" x2="180" y2="65" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="130" y1="65" x2="130" y2="115" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="130" cy="115" r="4" fill="#38bdf8" />
                    <line x1="130" y1="115" x2="230" y2="115" stroke="#38bdf8" strokeWidth="2" />
                    <rect x="230" y="103" width="70" height="24" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="265" y="119" fill="#7dd3fc" fontSize="10" fontWeight="bold" textAnchor="middle">
                      Y = {outY}
                    </text>

                    {/* NMOS Transistors in Series (Bottom) */}
                    <line x1="130" y1="115" x2="130" y2="140" stroke="#06b6d4" strokeWidth="2" />

                    {/* NMOS 1 (Gate A) */}
                    <rect x="110" y="140" width="40" height="28" rx="3" fill="#042f2e" stroke={inA === 1 ? '#10b981' : '#4b5563'} strokeWidth="1.8" />
                    <text x="130" y="157" fill="#a7f3d0" fontSize="8" textAnchor="middle">NMOS A</text>
                    <line x1="50" y1="154" x2="110" y2="154" stroke="#10b981" strokeWidth="1.5" />
                    <text x="42" y="157" fill="#34d399" fontSize="9">A={inA}</text>

                    <line x1="130" y1="168" x2="130" y2="185" stroke="#06b6d4" strokeWidth="2" />

                    {/* NMOS 2 (Gate B) */}
                    <rect x="110" y="185" width="40" height="28" rx="3" fill="#042f2e" stroke={inB === 1 ? '#10b981' : '#4b5563'} strokeWidth="1.8" />
                    <text x="130" y="202" fill="#a7f3d0" fontSize="8" textAnchor="middle">NMOS B</text>
                    <line x1="50" y1="199" x2="110" y2="199" stroke="#10b981" strokeWidth="1.5" />
                    <text x="42" y="202" fill="#34d399" fontSize="9">B={inB}</text>

                    {/* Connection to Ground */}
                    <line x1="130" y1="213" x2="130" y2="225" stroke="#06b6d4" strokeWidth="2" />
                  </g>
                )}

                {cell.type === 'INV' && (
                  <g transform="translate(150, 45)">
                    {/* PMOS at Top */}
                    <line x1="80" y1="0" x2="80" y2="40" stroke="#ef4444" strokeWidth="2" />
                    <rect x="60" y="40" width="40" height="35" rx="3" fill="#1e1b4b" stroke={inA === 0 ? '#10b981' : '#4b5563'} strokeWidth="1.8" />
                    <text x="80" y="60" fill="#c7d2fe" fontSize="9" textAnchor="middle">PMOS</text>
                    <circle cx="50" cy="58" r="3" fill="#ffffff" />
                    <line x1="0" y1="58" x2="47" y2="58" stroke="#10b981" strokeWidth="1.5" />
                    <text x="-15" y="61" fill="#34d399" fontSize="10">A={inA}</text>

                    {/* Output Tap */}
                    <line x1="80" y1="75" x2="80" y2="135" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="80" cy="105" r="4" fill="#38bdf8" />
                    <line x1="80" y1="105" x2="170" y2="105" stroke="#38bdf8" strokeWidth="2" />
                    <rect x="170" y="93" width="70" height="24" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="205" y="109" fill="#7dd3fc" fontSize="10" fontWeight="bold" textAnchor="middle">
                      Y = {outY}
                    </text>

                    {/* NMOS at Bottom */}
                    <rect x="60" y="135" width="40" height="35" rx="3" fill="#042f2e" stroke={inA === 1 ? '#10b981' : '#4b5563'} strokeWidth="1.8" />
                    <text x="80" y="155" fill="#a7f3d0" fontSize="9" textAnchor="middle">NMOS</text>
                    <line x1="0" y1="152" x2="60" y2="152" stroke="#10b981" strokeWidth="1.5" />
                    <line x1="0" y1="58" x2="0" y2="152" stroke="#10b981" strokeWidth="1.5" />

                    <line x1="80" y1="170" x2="80" y2="225" stroke="#06b6d4" strokeWidth="2" />
                  </g>
                )}

                {(cell.type === 'DFF' || cell.type === 'MUX2' || cell.type === 'CLKBUF' || cell.type === 'NOR2' || cell.type === 'AOI22') && (
                  <g transform="translate(100, 50)">
                    {/* Master-Slave Transmission Gate / Logic Gate Structure */}
                    <rect x="30" y="25" width="220" height="150" rx="8" fill="#131722" stroke="#3b82f6" strokeWidth="1.5" />
                    <text x="140" y="50" fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">
                      {cell.type} CMOS GATE TOPOLOGY
                    </text>
                    <text x="140" y="70" fill="#64748b" fontSize="9" textAnchor="middle">
                      Dual Rail Abutment Cell ({cell.w}Âµm Ã— {cell.h}Âµm)
                    </text>

                    {/* VDD Contact Feed */}
                    <line x1="140" y1="-10" x2="140" y2="25" stroke="#ef4444" strokeWidth="2.5" />
                    <circle cx="140" cy="25" r="3" fill="#ef4444" />
                    <text x="148" y="18" fill="#f87171" fontSize="8">VDD Abutment</text>

                    {/* VSS Contact Feed */}
                    <line x1="140" y1="175" x2="140" y2="220" stroke="#06b6d4" strokeWidth="2.5" />
                    <circle cx="140" cy="175" r="3" fill="#06b6d4" />
                    <text x="148" y="195" fill="#38bdf8" fontSize="8">VSS Abutment</text>

                    {/* Inputs */}
                    <line x1="-10" y1="80" x2="30" y2="80" stroke="#10b981" strokeWidth="2" />
                    <text x="-15" y="84" fill="#34d399" fontSize="9" textAnchor="end">D = {inD}</text>

                    <line x1="-10" y1="120" x2="30" y2="120" stroke="#f59e0b" strokeWidth="2" />
                    <text x="-15" y="124" fill="#fbbf24" fontSize="9" textAnchor="end">CLK = {inClk}</text>

                    {/* Outputs */}
                    <line x1="250" y1="80" x2="280" y2="80" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="280" cy="80" r="3" fill="#38bdf8" />
                    <text x="288" y="84" fill="#7dd3fc" fontSize="10" fontWeight="bold">Q = {qState}</text>

                    <line x1="250" y1="120" x2="280" y2="120" stroke="#818cf8" strokeWidth="2" />
                    <circle cx="280" cy="120" r="3" fill="#818cf8" />
                    <text x="288" y="124" fill="#a5b4fc" fontSize="10">QN = {qState === 1 ? 0 : 1}</text>
                  </g>
                )}

                {/* State Indicators */}
                <rect x="30" y="240" width="400" height="20" rx="3" fill="#090a0f" stroke="rgba(255,255,255,0.06)" />
                <text x="40" y="254" fill="#9ca3af" fontSize="9">
                  Propagation: <span className="text-emerald-400 font-bold">{cell.propagationDelayPs} ps</span> | IR Drop: <span className="text-amber-400 font-bold">{cell.irDropMv} mV</span> | Leakage: <span className="text-blue-400 font-bold">{cell.leakagePowerNw} nW</span>
                </text>
              </svg>
            </div>
          </div>
        )}

        {activeTab === 'pdn' && (
          <div className="w-full max-w-xl space-y-4">
            <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Zap size={14} />
                <span>Power Planning Interconnect Architecture</span>
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                This standard cell connects directly to the **M1 Power Followpin Rails** established during the Power Planning stage. Standard cell pins physically abut the continuous horizontal VDD (1.0V) and VSS (0.0V) rails without requiring routing vias.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-400">Power Rail Voltage:</span>
                  <div className="text-sm font-bold font-mono text-emerald-400">{cell.powerRailVdd}</div>
                  <span className="text-[10px] text-gray-500">Nominal 1.0V Supply</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-400">Localized IR-Drop:</span>
                  <div className="text-sm font-bold font-mono text-amber-400">{cell.irDropMv} mV</div>
                  <span className="text-[10px] text-emerald-400">âœ“ Within &lt;30mV DRC Budget</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-400">M6 Vertical Strap Pitch:</span>
                  <div className="text-sm font-bold font-mono text-blue-400">80 Âµm</div>
                  <span className="text-[10px] text-gray-500">Via 5-to-M1 Feeders</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-400">Well Tap Spacing:</span>
                  <div className="text-sm font-bold font-mono text-purple-400">25 Âµm</div>
                  <span className="text-[10px] text-emerald-400">âœ“ Anti-Latchup Enforced</span>
                </div>
              </div>
            </div>

            {/* Well Tap & Decap Integration Note */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-gray-300 space-y-1">
              <span className="font-bold text-blue-300 flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>Substrate Tap & Decoupling Capacitor Interconnection:</span>
              </span>
              <p className="text-[11px] text-gray-400">
                Well tap cells (TAPCELL) bias the N-well to VDD and P-substrate to VSS every 30Âµm to eliminate parasitic SCR latch-up. Decoupling capacitor cells (DECAP) provide instant localized charge to clamp transient $di/dt$ voltage droops during synchronous switching.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'timing' && (
          <div className="w-full max-w-xl space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <span className="text-gray-400 uppercase text-[10px] font-bold">Standard Cell Liberty (.lib) Characterization</span>
              <div className="space-y-1 text-gray-300">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Propagation Delay (t_pd):</span>
                  <span className="font-bold text-emerald-400">{cell.propagationDelayPs} ps</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Input Pin Capacitance (C_in):</span>
                  <span className="font-bold text-blue-400">{cell.inputCapFf} fF</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Dynamic Switching Power (P_dyn):</span>
                  <span className="font-bold text-amber-400">{cell.dynamicPowerUw} ÂµW @ 1 GHz</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Static Subthreshold Leakage (P_leak):</span>
                  <span className="font-bold text-purple-400">{cell.leakagePowerNw} nW</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Drive Strength:</span>
                  <span className="font-bold text-gray-100">{cell.driveStrength} (Standard Fanout: {cell.fanout})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Cell Physical Footprint:</span>
                  <span className="font-bold text-gray-100">{cell.w}Âµm Ã— {cell.h}Âµm = {(cell.w * cell.h).toFixed(1)} ÂµmÂ²</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



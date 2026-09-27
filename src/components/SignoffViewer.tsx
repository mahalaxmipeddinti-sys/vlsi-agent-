import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Copy, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  FileCheck2, 
  Cpu, 
  Layers, 
  Zap, 
  FileCode, 
  Award, 
  Play, 
  Pause, 
  FastForward, 
  Activity, 
  Sliders, 
  RefreshCw, 
  Eye, 
  Radio, 
  Gauge, 
  Terminal, 
  Check, 
  X, 
  ArrowRight, 
  BarChart3, 
  Database, 
  HardDrive, 
  FileText, 
  CheckCheck,
  Layers3,
  Flame,
  Search
} from 'lucide-react';
import { getDynamicBackendData } from '../utils/dynamicPlacementEngine';
import { 
  generateWaferDies, 
  generateShmooMatrix, 
  evaluateDutLogic, 
  getInitialSignoffRules,
  WaferDie,
  ShmooPoint,
  SignoffDrcRule
} from '../utils/signoffLiveEngine';

interface SignoffViewerProps {
  activeIcId?: string;
  activeComponentName?: string;
  onNavigateToFirstStage?: () => void;
  onOpenPrice?: () => void;
  onNavigateToCats?: () => void;
}

export function SignoffViewer({ 
  activeIcId = '7476', 
  activeComponentName = 'SN7476 Dual J-K Flip-Flop',
  onNavigateToFirstStage,
  onOpenPrice,
  onNavigateToCats
}: SignoffViewerProps) {
  // Navigation tabs for the Sign-off and Live Testing Studio (Reordered 1 >> 4: DRC/LVS physical sign-off first, then Wafer Sort post-tapeout)
  const [activeTab, setActiveTab] = useState<'physical_signoff' | 'gds_mask' | 'shmoo_plot' | 'live_ate' | 'bringup_scope'>('physical_signoff');

  // Currency selection: default to 'INR' (Indian Rupees)
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [showPriceEstimatorModal, setShowPriceEstimatorModal] = useState(false);
  const USD_TO_INR = 83.50;

  // Technology Node selection
  const [techNode, setTechNode] = useState<'sky130' | 'tsmc7' | 'freepdk45' | 'intel16'>('sky130');

  // Backend data
  const backendData = useMemo(() => {
    return getDynamicBackendData(activeIcId, activeComponentName);
  }, [activeIcId, activeComponentName]);

  const metrics = backendData.signoffMetrics;

  // -------------------------------------------------------------
  // 1. WAFER SORT & ATE (AUTOMATED TEST EQUIPMENT) LIVE STATE
  // -------------------------------------------------------------
  const [waferDies, setWaferDies] = useState<WaferDie[]>(() => generateWaferDies(11));
  const [isAteTesting, setIsAteTesting] = useState(false);
  const [currentProbeDieIndex, setCurrentProbeDieIndex] = useState<number | null>(null);
  const [selectedDie, setSelectedDie] = useState<WaferDie | null>(null);
  const [testSpeed, setTestSpeed] = useState<'normal' | 'fast' | 'instant'>('normal');
  const [testVectorCount, setTestVectorCount] = useState(12800);
  const [ateTestLog, setAteTestLog] = useState<string[]>([
    'ATE Advantest V93000 Tester Initialized.',
    'Wafer Prober TEL Precio 300mm chuck vacuum: LOCKED.',
    'Cartridge Cantilever probe-card pins: 64-pin fine pitch aligned.',
    'Ready for wafer sort run.'
  ]);

  // Wafer Statistics
  const waferStats = useMemo(() => {
    const total = waferDies.length;
    const tested = waferDies.filter(d => d.status !== 'untested' && d.status !== 'testing');
    const bin1 = waferDies.filter(d => d.status === 'pass_bin1').length;
    const bin2 = waferDies.filter(d => d.status === 'pass_bin2').length;
    const failIddq = waferDies.filter(d => d.status === 'fail_iddq').length;
    const failFunc = waferDies.filter(d => d.status === 'fail_func').length;
    const failSpeed = waferDies.filter(d => d.status === 'fail_speed').length;
    const totalPass = bin1 + bin2;
    const yieldPct = tested.length > 0 ? ((totalPass / tested.length) * 100).toFixed(1) : '0.0';
    
    // Defect density approximation D0 = -ln(Y) / Area
    const dieAreaCm2 = (metrics.dieAreaMm2 || 0.35) / 100;
    const yRatio = totalPass > 0 ? totalPass / tested.length : 1;
    const defectDensity = yRatio > 0 && yRatio < 1 ? (-Math.log(yRatio) / dieAreaCm2).toFixed(2) : '0.04';

    return { total, testedCount: tested.length, bin1, bin2, failIddq, failFunc, failSpeed, totalPass, yieldPct, defectDensity };
  }, [waferDies, metrics.dieAreaMm2]);

  // Live ATE Wafer Stepping loop
  useEffect(() => {
    if (!isAteTesting) return;

    const intervalTime = testSpeed === 'fast' ? 40 : testSpeed === 'normal' ? 120 : 5;
    const interval = setInterval(() => {
      setWaferDies(prev => {
        // Find next untested die
        const nextIdx = prev.findIndex(d => d.status === 'untested');
        if (nextIdx === -1) {
          setIsAteTesting(false);
          setCurrentProbeDieIndex(null);
          setAteTestLog(l => [`[WAFER COMPLETE] All dies probed. Yield: ${waferStats.yieldPct}%.`, ...l.slice(0, 15)]);
          return prev;
        }

        setCurrentProbeDieIndex(nextIdx);
        const updated = [...prev];
        const die = { ...updated[nextIdx] };
        
        // Random defect assignment based on radial position
        const rand = Math.random();
        if (rand < 0.82) {
          die.status = 'pass_bin1'; // High performance prime die
        } else if (rand < 0.93) {
          die.status = 'pass_bin2'; // Standard speed bin
        } else if (rand < 0.96) {
          die.status = 'fail_iddq'; // Quiescent leakage defect
          die.iddqUa = +(die.iddqUa * 8.5).toFixed(1);
        } else if (rand < 0.985) {
          die.status = 'fail_speed'; // Failed at-speed test
          die.fMaxMhz = Math.round(die.fMaxMhz * 0.65);
        } else {
          die.status = 'fail_func'; // Functional stuck-at fault
        }

        updated[nextIdx] = die;
        setSelectedDie(die);

        setAteTestLog(l => [
          `Die #${die.id} (R${die.row} C${die.col}): ${die.status.toUpperCase()} | Fmax: ${die.fMaxMhz}MHz | Iddq: ${die.iddqUa}µA`,
          ...l.slice(0, 12)
        ]);

        return updated;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isAteTesting, testSpeed, waferStats.yieldPct]);

  const handleStartAteTest = () => {
    // Reset untested dies if all already tested
    if (waferDies.every(d => d.status !== 'untested')) {
      setWaferDies(generateWaferDies(11));
    }
    setIsAteTesting(true);
  };

  const handleResetAte = () => {
    setIsAteTesting(false);
    setCurrentProbeDieIndex(null);
    setWaferDies(generateWaferDies(11));
    setSelectedDie(null);
    setAteTestLog(['Wafer prober reset to start. Chuck positioned at Die #1.']);
  };

  // -------------------------------------------------------------
  // 2. LIVE BRING-UP BENCH & OSCILLOSCOPE STATE
  // -------------------------------------------------------------
  const [benchVdd, setBenchVdd] = useState(1.00); // 0.6V to 1.25V
  const [benchFreqMhz, setBenchFreqMhz] = useState(800); // 100 to 1200 MHz
  const [benchTempC, setBenchTempC] = useState(38); // Ambient/Junction Temp
  const [scopeRunning, setScopeRunning] = useState(true);
  const [scopeTimebase, setScopeTimebase] = useState<500 | 1000 | 2000>(500); // ps/div

  // Interactive Pin Stimulus Inputs for DUT
  const [dutInputs, setDutInputs] = useState<Record<string, number>>(() => {
    return {
      '1PRE_n': 1,
      '1CLR_n': 1,
      '1J': 1,
      '1K': 0,
      '2PRE_n': 1,
      '2CLR_n': 1,
      '2J': 0,
      '2K': 1,
      // For Mux 74151
      'S0': 0,
      'S1': 1,
      'S2': 0,
      'STROBE_n': 0,
      // For Gates
      '1A': 1,
      '1B': 1
    };
  });

  const [dutOutputs, setDutOutputs] = useState<Record<string, number>>(() => {
    return evaluateDutLogic(activeIcId, dutInputs);
  });

  // Clock pulse toggle for sequential circuits
  const [clkPulseCount, setClkPulseCount] = useState(0);

  const handleToggleInput = (pinName: string) => {
    const nextVal = dutInputs[pinName] === 1 ? 0 : 1;
    const newInputs = { ...dutInputs, [pinName]: nextVal };
    setDutInputs(newInputs);
    const newOutputs = evaluateDutLogic(activeIcId, newInputs, dutOutputs);
    setDutOutputs(newOutputs);
  };

  const handlePulseClock = () => {
    setClkPulseCount(c => c + 1);
    // Trigger logic transition on clock edge
    const newOutputs = evaluateDutLogic(activeIcId, dutInputs, dutOutputs);
    setDutOutputs(newOutputs);
  };

  // Oscilloscope live canvas rendering
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeTimeRef = useRef(0);

  useEffect(() => {
    if (!scopeRunning) return;
    let animId: number;

    const renderScope = () => {
      const canvas = scopeCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      scopeTimeRef.current += (benchFreqMhz / 250);

      // Dark background
      ctx.fillStyle = '#0B0D11';
      ctx.fillRect(0, 0, w, h);

      // Oscilloscope Grid Lines (8x6 divisions)
      ctx.strokeStyle = '#1F2937';
      ctx.lineWidth = 1;
      const xDiv = w / 10;
      const yDiv = h / 6;

      for (let x = 0; x <= w; x += xDiv) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += yDiv) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center crosshair dotted lines
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = '#374151';
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const t = scopeTimeRef.current;
      const periodPx = 80 * (800 / benchFreqMhz);

      // Helper function to draw digital wave with realistic edge slew and jitter
      const drawChannel = (
        name: string, 
        baseY: number, 
        color: string, 
        val: number | 'clock',
        amplitude = 26
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        for (let x = 0; x < w; x++) {
          let signalLevel = 0;
          if (val === 'clock') {
            const phase = ((x + t) % periodPx) / periodPx;
            // Simulated square wave with 35ps edge slew & jitter
            const raw = phase < 0.5 ? 1 : 0;
            signalLevel = raw;
          } else {
            // Static or slowly modulated input/output with slight noise
            signalLevel = val;
          }

          // Invert logic high/low on canvas Y (higher voltage is higher on screen)
          const yPos = baseY - signalLevel * amplitude;
          if (x === 0) ctx.moveTo(x, yPos);
          else ctx.lineTo(x, yPos);
        }
        ctx.stroke();

        // Channel Tag badge
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(name, 12, baseY - amplitude - 5);
      };

      // CH1: CLK (Yellow)
      drawChannel('CH1: CLK (' + benchFreqMhz + ' MHz)', h * 0.26, '#FBBF24', 'clock', 22);

      // CH2: Primary Input (Cyan)
      const ch2Name = activeIcId.includes('74151') ? `CH2: S0 [${dutInputs['S0']}]` : `CH2: 1J [${dutInputs['1J']}]`;
      const ch2Val = activeIcId.includes('74151') ? dutInputs['S0'] : dutInputs['1J'];
      drawChannel(ch2Name, h * 0.50, '#38BDF8', ch2Val, 22);

      // CH3: Control/Secondary Input (Pink)
      const ch3Name = activeIcId.includes('74151') ? `CH3: STROBE [${dutInputs['STROBE_n']}]` : `CH3: 1K [${dutInputs['1K']}]`;
      const ch3Val = activeIcId.includes('74151') ? dutInputs['STROBE_n'] : dutInputs['1K'];
      drawChannel(ch3Name, h * 0.74, '#F472B6', ch3Val, 22);

      // CH4: Output Q / Y (Emerald)
      const ch4Name = activeIcId.includes('74151') ? `CH4: Y OUT [${dutOutputs['Y'] ?? 0}]` : `CH4: 1Q OUT [${dutOutputs['1Q'] ?? 0}]`;
      const ch4Val = activeIcId.includes('74151') ? (dutOutputs['Y'] ?? 0) : (dutOutputs['1Q'] ?? 0);
      drawChannel(ch4Name, h * 0.95, '#34D399', ch4Val, 22);

      animId = requestAnimationFrame(renderScope);
    };

    animId = requestAnimationFrame(renderScope);
    return () => cancelAnimationFrame(animId);
  }, [scopeRunning, benchFreqMhz, benchVdd, dutInputs, dutOutputs, activeIcId]);

  // Dynamic Bring-up Telemetry calculations
  const benchMetrics = useMemo(() => {
    // Dynamic power P = C * Vdd^2 * f
    const dynPowerMw = +(0.015 * Math.pow(benchVdd, 2) * (benchFreqMhz / 100)).toFixed(2);
    // Leakage increases exponentially with voltage and temperature
    const leakageNw = +(2.4 * Math.exp((benchVdd - 1.0) * 4) * (1 + (benchTempC - 25) * 0.03)).toFixed(1);
    const measuredJitterPs = +(3.2 + (1.25 - benchVdd) * 4.5).toFixed(1);
    const clkToQPs = Math.round(58 + (1.2 - benchVdd) * 45);
    const setupSlackPs = Math.round(310 * (benchVdd / 1.0) - (benchFreqMhz - 800) * 0.35);

    return { dynPowerMw, leakageNw, measuredJitterPs, clkToQPs, setupSlackPs };
  }, [benchVdd, benchFreqMhz, benchTempC]);

  // -------------------------------------------------------------
  // 3. SHMOO PLOT CHARACTERIZATION MATRIX
  // -------------------------------------------------------------
  const shmooMatrix = useMemo(() => {
    return generateShmooMatrix(benchVdd, benchFreqMhz);
  }, [benchVdd, benchFreqMhz]);

  const [selectedShmooPoint, setSelectedShmooPoint] = useState<ShmooPoint | null>(null);

  // -------------------------------------------------------------
  // 4. PHYSICAL VERIFICATION & DRC/LVS AUTO-FIX STATE
  // -------------------------------------------------------------
  const [signoffRules, setSignoffRules] = useState<SignoffDrcRule[]>(() => {
    return getInitialSignoffRules(activeIcId, activeComponentName);
  });
  const [isScanningDrc, setIsScanningDrc] = useState(false);
  const [hasInjectedViolation, setHasInjectedViolation] = useState(false);
  const [drcScanProgress, setDrcScanProgress] = useState(100);
  const [showCertificate, setShowCertificate] = useState(false);

  const hasAnyViolation = useMemo(() => {
    return signoffRules.some(r => r.status === 'VIOLATION');
  }, [signoffRules]);

  const handleRunFullDrcLvsScan = () => {
    setIsScanningDrc(true);
    setDrcScanProgress(0);

    const interval = setInterval(() => {
      setDrcScanProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsScanningDrc(false);
          return 100;
        }
        return p + 20;
      });
    }, 150);
  };

  const handleInjectViolation = (type: 'spacing' | 'antenna' | 'tap') => {
    setHasInjectedViolation(true);
    setSignoffRules(prev => {
      return prev.map(rule => {
        if (type === 'spacing' && rule.id === 'rule_drc_space') {
          return {
            ...rule,
            status: 'VIOLATION',
            measured: 'VIOLATION: M2 Spacing = 0.125µm (< 0.160µm Rule Limit)',
            violationCoord: { x: 142, y: 88, layer: 'Metal 2', desc: 'Spacing violation between Net_1J and Net_CLK' }
          };
        }
        if (type === 'antenna' && rule.id === 'rule_antenna') {
          return {
            ...rule,
            status: 'VIOLATION',
            measured: 'VIOLATION: Net_CLK Antenna Ratio = 512:1 (> 400:1 Spec)',
            violationCoord: { x: 180, y: 140, layer: 'Metal 4', desc: 'Gate oxide damage risk during reactive ion etching' }
          };
        }
        if (type === 'tap' && rule.id === 'rule_erc_well') {
          return {
            ...rule,
            status: 'VIOLATION',
            measured: 'VIOLATION: Floating Substrate Well Tap (> 35µm pitch)',
            violationCoord: { x: 210, y: 70, layer: 'N-Well / Substrate', desc: 'Latch-up risk: Substrate resistance too high' }
          };
        }
        return rule;
      });
    });
  };

  const handleAutoFixDrc = () => {
    setIsScanningDrc(true);
    setTimeout(() => {
      setSignoffRules(getInitialSignoffRules(activeIcId, activeComponentName));
      setHasInjectedViolation(false);
      setIsScanningDrc(false);
    }, 600);
  };

  // -------------------------------------------------------------
  // 5. GDS-II / OASIS MASK DATA STATE
  // -------------------------------------------------------------
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [maskFormat, setMaskFormat] = useState<'GDSII' | 'OASIS'>('GDSII');

  const maskLayers = [
    { num: 1, name: 'P-SUBSTRATE / DEEP P-WELL', color: '#6B7280', tone: 'Dark', polyCount: 840, minFeature: '0.18µm' },
    { num: 2, name: 'N-WELL (PMOS REGIONS)', color: '#3B82F6', tone: 'Clear', polyCount: 420, minFeature: '0.22µm' },
    { num: 3, name: 'ACTIVE / DIFFUSION (OD)', color: '#10B981', tone: 'Clear', polyCount: 1650, minFeature: '0.15µm' },
    { num: 4, name: 'POLY-SILICON GATE (PO)', color: '#EC4899', tone: 'Dark', polyCount: 2240, minFeature: '0.13µm' },
    { num: 5, name: 'CONTACT / VIA0', color: '#F59E0B', tone: 'Clear', polyCount: 4890, minFeature: '0.15µm' },
    { num: 6, name: 'METAL 1 (M1 LOCAL ROUTE)', color: '#06B6D4', tone: 'Dark', polyCount: 3120, minFeature: '0.14µm' },
    { num: 7, name: 'VIA 1 (V1)', color: '#8B5CF6', tone: 'Clear', polyCount: 2150, minFeature: '0.17µm' },
    { num: 8, name: 'METAL 2 (M2 HORIZONTAL)', color: '#3B82F6', tone: 'Dark', polyCount: 2680, minFeature: '0.16µm' },
    { num: 9, name: 'VIA 2 (V2)', color: '#8B5CF6', tone: 'Clear', polyCount: 1420, minFeature: '0.17µm' },
    { num: 10, name: 'METAL 3 (M3 VERTICAL)', color: '#A855F7', tone: 'Dark', polyCount: 2100, minFeature: '0.16µm' },
    { num: 11, name: 'METAL 4 (M4 CTS CLOCK TREE)', color: '#F59E0B', tone: 'Dark', polyCount: 780, minFeature: '0.24µm' },
    { num: 12, name: 'METAL 5/6 (PDN POWER GRID)', color: '#EF4444', tone: 'Dark', polyCount: 540, minFeature: '0.45µm' },
    { num: 13, name: 'PASSIVATION PAD OPENINGS', color: '#10B981', tone: 'Clear', polyCount: 64, minFeature: '45.0µm' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#121316] text-gray-200 overflow-y-auto">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-white/10 bg-[#16171B] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Award size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                Backend Flow • Stage 7 (Final)
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Sign-off, Live Testing & Tapeout Studio
              </h2>
            </div>
            <p className="text-[11px] text-gray-400">
              Live Wafer Sort Prober, ATE Testing, First-Silicon Bring-up & Sign-off Certification for{' '}
              <span className="text-emerald-400 font-semibold">{activeComponentName}</span>
            </p>
          </div>
        </div>

        {/* Foundry & Target Tech Selection */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs">
            <span className="text-gray-400 text-[10px]">PDK:</span>
            <select
              value={techNode}
              onChange={(e) => setTechNode(e.target.value as any)}
              className="bg-transparent text-emerald-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="sky130" className="bg-[#1a1c20]">SkyWater 130nm eFab</option>
              <option value="freepdk45" className="bg-[#1a1c20]">FreePDK 45nm Standard</option>
              <option value="tsmc7" className="bg-[#1a1c20]">TSMC 7nm FinFET HPC</option>
              <option value="intel16" className="bg-[#1a1c20]">Intel 16 FinFET</option>
            </select>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-black/40 border border-white/10 text-xs">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all flex items-center space-x-1 ${
                currency === 'INR' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Display all costs in Indian Rupees (₹ INR @ ₹83.50/$)"
            >
              <span>🇮🇳</span>
              <span>₹ INR</span>
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all flex items-center space-x-1 ${
                currency === 'USD' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Display all costs in US Dollars ($ USD)"
            >
              <span>🇺🇸</span>
              <span>$ USD</span>
            </button>
          </div>

          <button
            onClick={() => onOpenPrice ? onOpenPrice() : setShowPriceEstimatorModal(true)}
            className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg text-xs font-semibold text-emerald-300 transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <span className="font-bold text-amber-400">₹</span>
            <span>Indian Cost & Price View</span>
          </button>

          <button
            onClick={() => setShowCertificate(true)}
            className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-xs font-semibold text-amber-300 transition-all flex items-center space-x-1.5"
          >
            <Award size={13} />
            <span>Sign-off Certificate</span>
          </button>

          {onNavigateToCats && (
            <button
              onClick={onNavigateToCats}
              className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-md"
            >
              <Layers3 size={13} />
              <span>Mask Data Prep (CATS) ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* End-to-End Continuous VLSI Flow Lineage & Connectivity Banner */}
      <div className="px-5 py-2 bg-[#121316] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 overflow-x-auto py-0.5">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 whitespace-nowrap">
            Pipeline Lineage:
          </span>
          <span className="text-gray-400 whitespace-nowrap">1. Floorplan</span>
          <span className="text-gray-600">➔</span>
          <span className="text-gray-400 whitespace-nowrap">2. Power Plan</span>
          <span className="text-gray-600">➔</span>
          <span className="text-gray-400 whitespace-nowrap">3. Placement</span>
          <span className="text-gray-600">➔</span>
          <span className="text-gray-400 whitespace-nowrap">4. CTS</span>
          <span className="text-gray-600">➔</span>
          <span className="text-gray-400 whitespace-nowrap">5. Routing</span>
          <span className="text-gray-600">➔</span>
          <span className="text-gray-400 whitespace-nowrap">6. STA</span>
          <span className="text-gray-600">➔</span>
          <span className="text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 whitespace-nowrap flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>7. Sign-off &amp; Tapeout (Active)</span>
          </span>
        </div>

        <div className="text-[11px] text-gray-400 font-mono flex items-center space-x-2">
          <span>Input: <strong className="text-gray-200">Routed Layout (STA Met: +{backendData.worstSlackPs}ps)</strong></span>
          <span className="text-gray-600">•</span>
          <span>DUT: <strong className="text-cyan-300">{activeComponentName}</strong></span>
        </div>
      </div>

      {/* Mode Navigation Bar (Reordered 1 >> 4: Physical Signoff First, then Post-Fab Wafer Sort) */}
      <div className="px-5 py-2 border-b border-white/10 bg-[#141518] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('physical_signoff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeTab === 'physical_signoff'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={13} />
            <span>1. Live DRC/LVS Verification &amp; Fixer</span>
          </button>

          <button
            onClick={() => setActiveTab('gds_mask')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeTab === 'gds_mask'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCode size={13} />
            <span>2. GDS-II / OASIS Mask Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('shmoo_plot')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeTab === 'shmoo_plot'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 size={13} />
            <span>3. Shmoo Plot (Vdd vs Freq)</span>
          </button>

          <button
            onClick={() => setActiveTab('live_ate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeTab === 'live_ate'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity size={13} />
            <span>4. Live Wafer Sort &amp; ATE Testing</span>
          </button>

          <button
            onClick={() => setActiveTab('bringup_scope')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeTab === 'bringup_scope'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio size={13} />
            <span>5. Silicon Bring-up &amp; Oscilloscope</span>
          </button>
        </div>

        {/* Global Live Signoff Status Indicator */}
        <div className="flex items-center space-x-2">
          {hasAnyViolation ? (
            <div className="px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold font-mono flex items-center space-x-1.5 animate-pulse">
              <AlertTriangle size={13} />
              <span>SIGNOFF VIOLATION DETECTED</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono flex items-center space-x-1.5">
              <CheckCircle2 size={13} />
              <span>100% SIGNOFF READY</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-5 space-y-4 max-w-7xl mx-auto w-full">
        {/* ========================================================= */}
        {/* TAB 1: LIVE WAFER SORT & ATE (AUTOMATED TEST EQUIPMENT)   */}
        {/* ========================================================= */}
        {activeTab === 'live_ate' && (
          <div className="space-y-4">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-white/10 shadow-sm">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Tested Dies</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {waferStats.testedCount} <span className="text-xs text-gray-500">/ {waferStats.total}</span>
                </div>
                <div className="text-[10px] text-cyan-400 mt-1 font-mono">
                  {((waferStats.testedCount / waferStats.total) * 100).toFixed(0)}% Probed
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-emerald-500/30 shadow-sm">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Wafer Yield</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {waferStats.yieldPct}%
                </div>
                <div className="text-[10px] text-emerald-500/80 mt-1 font-mono">
                  {waferStats.totalPass} Good Silicon Dies
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-white/10 shadow-sm">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Defect Density (D0)</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  {waferStats.defectDensity} <span className="text-xs text-gray-500">def/cm²</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-1 font-mono">
                  Murphy Yield Model
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-white/10 shadow-sm">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Binning Split</div>
                <div className="text-sm font-bold font-mono text-white mt-1 flex items-center justify-between">
                  <span className="text-emerald-400">Bin1: {waferStats.bin1}</span>
                  <span className="text-blue-400">Bin2: {waferStats.bin2}</span>
                </div>
                <div className="text-[10px] text-red-400 mt-1 font-mono">
                  Fails: {waferStats.failIddq + waferStats.failFunc + waferStats.failSpeed}
                </div>
              </div>

              <div 
                onClick={() => setShowPriceEstimatorModal(true)}
                className="p-3.5 rounded-2xl bg-[#1A1C20] border border-cyan-500/40 hover:border-cyan-400/80 shadow-sm cursor-pointer transition-all hover:scale-[1.01] group"
                title="Click to view detailed Indian Rupee (₹) & USD Cost Breakdown"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-gray-400 font-mono uppercase flex items-center space-x-1">
                    <span>Est. Good Die Cost</span>
                    {currency === 'INR' && <span className="text-amber-400 font-bold font-sans">₹ (INR)</span>}
                  </div>
                  <div 
                    onClick={(e) => { e.stopPropagation(); setCurrency(c => c === 'INR' ? 'USD' : 'INR'); }}
                    className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] font-mono text-cyan-300 hover:text-white"
                    title="Switch Currency between ₹ INR and $ USD"
                  >
                    <span>{currency === 'INR' ? '₹ INR' : '$ USD'}</span>
                    <span className="text-gray-500">⇄</span>
                  </div>
                </div>

                <div className="text-xl font-bold font-mono text-cyan-400 mt-1 flex items-baseline space-x-1.5">
                  {currency === 'INR' ? (
                    <>
                      <span>₹{((waferStats.totalPass > 0 ? (2850 / waferStats.totalPass) : 32.50) * USD_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[11px] text-gray-400 font-normal">(${waferStats.totalPass > 0 ? (2850 / waferStats.totalPass).toFixed(2) : '32.50'})</span>
                    </>
                  ) : (
                    <>
                      <span>${waferStats.totalPass > 0 ? (2850 / waferStats.totalPass).toFixed(2) : '32.50'}</span>
                      <span className="text-[11px] text-gray-400 font-normal">(₹{((waferStats.totalPass > 0 ? (2850 / waferStats.totalPass) : 32.50) * USD_TO_INR).toLocaleString('en-IN', { maximumFractionDigits: 0 })})</span>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 mt-1 font-mono flex items-center justify-between">
                  <span>
                    {currency === 'INR' 
                      ? `Based on ₹${(2850 * USD_TO_INR).toLocaleString('en-IN')}/wafer fab ($2,850)`
                      : 'Based on $2,850/wafer fab'}
                  </span>
                  <span className="text-cyan-400 group-hover:underline text-[9px]">Breakdown ➔</span>
                </div>
              </div>
            </div>

            {/* Wafer Canvas and ATE Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: 300mm Silicon Wafer Map Visualizer */}
              <div className="lg:col-span-7 p-4 rounded-2xl bg-[#18191D] border border-white/10 flex flex-col items-center justify-between relative overflow-hidden">
                <div className="w-full flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold text-white">300mm Silicon Wafer Die Map</span>
                    <span className="text-gray-500 font-mono text-[11px]">(11x11 Grid • {waferStats.total} Dies)</span>
                  </div>

                  {isAteTesting && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40 animate-pulse">
                      PROBING IN PROGRESS...
                    </span>
                  )}
                </div>

                {/* Circular Wafer Surface */}
                <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-[#1E2026] via-[#2A2D36] to-[#1E2026] border-4 border-gray-600/40 p-5 shadow-2xl flex items-center justify-center my-3">
                  {/* Wafer Notch for orientation (SEM / Fab standard) */}
                  <div className="absolute bottom-0 w-8 h-2.5 bg-black/80 rounded-t-md border-t border-gray-500"></div>

                  {/* Concentric wafer rings */}
                  <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none"></div>
                  <div className="absolute inset-16 rounded-full border border-white/5 pointer-events-none"></div>

                  {/* Dies Grid */}
                  <div className="relative w-full h-full">
                    {waferDies.map((die) => {
                      const isProbing = currentProbeDieIndex !== null && waferDies[currentProbeDieIndex]?.id === die.id;
                      const isSelected = selectedDie?.id === die.id;

                      let bgColor = 'bg-gray-700/60 border-gray-600/40';
                      if (die.status === 'pass_bin1') bgColor = 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300';
                      else if (die.status === 'pass_bin2') bgColor = 'bg-blue-500 hover:bg-blue-400 border-blue-300';
                      else if (die.status === 'fail_iddq') bgColor = 'bg-purple-500 hover:bg-purple-400 border-purple-300';
                      else if (die.status === 'fail_speed') bgColor = 'bg-amber-500 hover:bg-amber-400 border-amber-300';
                      else if (die.status === 'fail_func') bgColor = 'bg-red-500 hover:bg-red-400 border-red-300';

                      return (
                        <div
                          key={die.id}
                          onClick={() => setSelectedDie(die)}
                          style={{
                            left: `${die.xPct}%`,
                            top: `${die.yPct}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                          className={`absolute w-5 h-5 sm:w-6 sm:h-6 rounded-[3px] border cursor-pointer transition-all duration-150 flex items-center justify-center text-[8px] font-mono font-bold text-white shadow-sm ${bgColor} ${
                            isProbing ? 'ring-4 ring-cyan-400 scale-125 z-20 animate-pulse' : ''
                          } ${isSelected ? 'ring-2 ring-white scale-110 z-10' : ''}`}
                          title={`Die #${die.id} (R${die.row}, C${die.col}): ${die.status}`}
                        >
                          {die.id}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Color Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-gray-300 mt-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                    <span>Bin 1 (Prime)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
                    <span>Bin 2 (Std)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500"></span>
                    <span>Fail IDDQ</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
                    <span>Fail Speed</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-red-500"></span>
                    <span>Fail Logic</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-gray-700"></span>
                    <span>Untested</span>
                  </div>
                </div>
              </div>

              {/* Right: ATE Test Controller & Selected Die Telemetry */}
              <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
                {/* Prober Controls */}
                <div className="p-4 rounded-2xl bg-[#18191D] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Cpu size={16} className="text-amber-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        ATE Prober Controls
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">
                      Advantest V93000 / Teradyne UltraFLEX
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleStartAteTest}
                      disabled={isAteTesting}
                      className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md"
                    >
                      <Play size={14} className={isAteTesting ? 'animate-spin' : ''} />
                      <span>{isAteTesting ? 'Testing Wafer...' : 'Run Automated Sort'}</span>
                    </button>

                    <button
                      onClick={handleResetAte}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <RotateCcw size={13} />
                      <span>Reset Wafer Chuck</span>
                    </button>
                  </div>

                  {/* Stepping Speed Slider */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-400 text-[11px]">Probing Speed:</span>
                    <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                      {(['normal', 'fast', 'instant'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setTestSpeed(s)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize transition-all ${
                            testSpeed === s ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected Die Electrical Inspection */}
                <div className="p-4 rounded-2xl bg-[#18191D] border border-white/10 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gauge size={16} className="text-cyan-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Probed Die Telemetry
                      </h4>
                    </div>
                    {selectedDie ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white">
                        Die #{selectedDie.id} (R{selectedDie.row} C{selectedDie.col})
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-mono">Click any die on wafer</span>
                    )}
                  </div>

                  {selectedDie ? (
                    <div className="space-y-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                        <span className="text-gray-400">Sort Bin Status:</span>
                        <span className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] ${
                          selectedDie.status.startsWith('pass') 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}>
                          {selectedDie.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                          <div className="text-[10px] text-gray-500">Max Frequency (Fmax)</div>
                          <div className="text-sm font-bold text-cyan-300">{selectedDie.fMaxMhz} MHz</div>
                        </div>

                        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                          <div className="text-[10px] text-gray-500">IDDQ Quiescent Leakage</div>
                          <div className="text-sm font-bold text-amber-300">{selectedDie.iddqUa} µA</div>
                        </div>

                        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                          <div className="text-[10px] text-gray-500">Worst Setup Slack</div>
                          <div className="text-sm font-bold text-emerald-300">+{selectedDie.slackPs} ps</div>
                        </div>

                        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                          <div className="text-[10px] text-gray-500">Junction Temp (Tj)</div>
                          <div className="text-sm font-bold text-purple-300">{selectedDie.tempC} °C</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-500 font-mono">
                      Run automated sort or click any silicon die on the circular wafer to inspect parametric ATE measurements.
                    </div>
                  )}

                  {/* Live ATE Console Output */}
                  <div className="mt-2 p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[10px] text-emerald-400/90 h-28 overflow-y-auto space-y-0.5">
                    {ateTestLog.map((log, i) => (
                      <div key={i} className="leading-tight">
                        <span className="text-gray-500">&gt; </span>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SILICON BRING-UP BENCH & OSCILLOSCOPE             */}
        {/* ========================================================= */}
        {activeTab === 'bringup_scope' && (
          <div className="space-y-4">
            {/* Top Bench Telemetry Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-cyan-500/30">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Supply Voltage (Vdd)</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                  {benchVdd.toFixed(2)} V
                </div>
                <div className="text-[10px] text-gray-400 mt-1 font-mono">
                  Range: 0.60V - 1.25V
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-amber-500/30">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Master Clock (PLL)</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  {benchFreqMhz} MHz
                </div>
                <div className="text-[10px] text-emerald-400 mt-1 font-mono flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>PLL Phase Locked</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-white/10">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Dynamic Power (Pdyn)</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {benchMetrics.dynPowerMw} mW
                </div>
                <div className="text-[10px] text-gray-400 mt-1 font-mono">
                  Leakage: {benchMetrics.leakageNw} nW
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-white/10">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Clock-to-Q Delay</div>
                <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                  {benchMetrics.clkToQPs} ps
                </div>
                <div className="text-[10px] text-gray-400 mt-1 font-mono">
                  Jitter: ±{benchMetrics.measuredJitterPs} ps
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-emerald-500/30">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Setup Slack Margin</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  +{benchMetrics.setupSlackPs} ps
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">
                  TIMING MET
                </div>
              </div>
            </div>

            {/* Oscilloscope and Bench Stimulus Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: 4-Channel Live Oscilloscope */}
              <div className="lg:col-span-8 p-4 rounded-2xl bg-[#15171C] border border-white/10 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Agilent / Keysight Infiniium 4-Channel Oscilloscope
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setScopeRunning(r => !r)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all ${
                        scopeRunning ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {scopeRunning ? <Pause size={12} /> : <Play size={12} />}
                      <span>{scopeRunning ? 'RUNNING' : 'STOPPED'}</span>
                    </button>
                  </div>
                </div>

                {/* Oscilloscope Screen */}
                <div className="relative rounded-xl border border-gray-700/60 overflow-hidden shadow-inner bg-[#0B0D11]">
                  <canvas
                    ref={scopeCanvasRef}
                    width={720}
                    height={340}
                    className="w-full h-80 block"
                  />

                  {/* Channel Volt/Div Overlays */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono pointer-events-none bg-black/60 px-3 py-1 rounded-lg border border-white/10">
                    <span className="text-yellow-400 font-bold">CH1: 500mV/div</span>
                    <span className="text-sky-400 font-bold">CH2: 500mV/div</span>
                    <span className="text-pink-400 font-bold">CH3: 500mV/div</span>
                    <span className="text-emerald-400 font-bold">CH4: 500mV/div</span>
                    <span className="text-gray-300 font-bold">TB: {scopeTimebase} ps/div</span>
                  </div>
                </div>

                {/* Timebase Control Buttons */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-400 font-mono text-[11px]">Timebase Horiz Scale:</span>
                  <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                    {([500, 1000, 2000] as const).map(tb => (
                      <button
                        key={tb}
                        onClick={() => setScopeTimebase(tb)}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                          scopeTimebase === tb ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {tb} ps/div
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Silicon Stimulation & Knob Controls */}
              <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
                {/* Power & Clock Knobs */}
                <div className="p-4 rounded-2xl bg-[#18191D] border border-white/10 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Sliders size={16} className="text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Lab Bench Power & Clock
                    </h4>
                  </div>

                  {/* Vdd Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Core Supply Vdd:</span>
                      <span className="font-mono font-bold text-cyan-300">{benchVdd.toFixed(2)} V</span>
                    </div>
                    <input
                      type="range"
                      min="0.65"
                      max="1.25"
                      step="0.05"
                      value={benchVdd}
                      onChange={(e) => setBenchVdd(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Freq Slider */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Clock Frequency:</span>
                      <span className="font-mono font-bold text-amber-300">{benchFreqMhz} MHz</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="1400"
                      step="50"
                      value={benchFreqMhz}
                      onChange={(e) => setBenchFreqMhz(parseInt(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Junction Temperature Slider */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Thermal Chamber Tj:</span>
                      <span className="font-mono font-bold text-purple-300">{benchTempC} °C</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="125"
                      step="5"
                      value={benchTempC}
                      onChange={(e) => setBenchTempC(parseInt(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* DUT Interactive Pin Stimulus */}
                <div className="p-4 rounded-2xl bg-[#18191D] border border-white/10 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap size={16} className="text-amber-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Interactive DUT Pin Stimulus
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">LIVE RESPONDING</span>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Click pin buttons to inject live voltage states into the manufactured silicon die:
                  </p>

                  {/* Specific Pin Toggles based on Active IC */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {activeIcId.includes('7476') ? (
                      <>
                        <button
                          onClick={handlePulseClock}
                          className="col-span-2 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow"
                        >
                          <Play size={13} />
                          <span>Pulse Clock CLK1 (Pulse #{clkPulseCount})</span>
                        </button>

                        <button
                          onClick={() => handleToggleInput('1J')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            dutInputs['1J'] === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' : 'bg-black/40 border-white/10 text-gray-400'
                          }`}
                        >
                          1J Input: [{dutInputs['1J']}]
                        </button>

                        <button
                          onClick={() => handleToggleInput('1K')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            dutInputs['1K'] === 1 ? 'bg-pink-500/20 border-pink-500 text-pink-300 font-bold' : 'bg-black/40 border-white/10 text-gray-400'
                          }`}
                        >
                          1K Input: [{dutInputs['1K']}]
                        </button>

                        <button
                          onClick={() => handleToggleInput('1PRE_n')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            dutInputs['1PRE_n'] === 0 ? 'bg-red-500/20 border-red-500 text-red-300 font-bold' : 'bg-black/40 border-white/10 text-gray-300'
                          }`}
                        >
                          1PRE_n (Act-Low): [{dutInputs['1PRE_n']}]
                        </button>

                        <button
                          onClick={() => handleToggleInput('1CLR_n')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            dutInputs['1CLR_n'] === 0 ? 'bg-red-500/20 border-red-500 text-red-300 font-bold' : 'bg-black/40 border-white/10 text-gray-300'
                          }`}
                        >
                          1CLR_n (Act-Low): [{dutInputs['1CLR_n']}]
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleInput('S0')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            dutInputs['S0'] === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' : 'bg-black/40 border-white/10 text-gray-400'
                          }`}
                        >
                          Select S0: [{dutInputs['S0']}]
                        </button>

                        <button
                          onClick={() => handleToggleInput('S1')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            dutInputs['S1'] === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' : 'bg-black/40 border-white/10 text-gray-400'
                          }`}
                        >
                          Select S1: [{dutInputs['S1']}]
                        </button>

                        <button
                          onClick={() => handleToggleInput('S2')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            dutInputs['S2'] === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' : 'bg-black/40 border-white/10 text-gray-400'
                          }`}
                        >
                          Select S2: [{dutInputs['S2']}]
                        </button>

                        <button
                          onClick={() => handleToggleInput('STROBE_n')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            dutInputs['STROBE_n'] === 1 ? 'bg-red-500/20 border-red-500 text-red-300 font-bold' : 'bg-black/40 border-white/10 text-emerald-300'
                          }`}
                        >
                          Strobe G_n: [{dutInputs['STROBE_n']}]
                        </button>
                      </>
                    )}
                  </div>

                  {/* Live Silicon Output Readout */}
                  <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 flex items-center justify-between font-mono text-xs">
                    <span className="text-gray-400">Measured Output State:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-emerald-400 text-sm">
                        {activeIcId.includes('7476') ? `1Q = ${dutOutputs['1Q'] ?? 0} | 1Q_n = ${dutOutputs['1Q_n'] ?? 1}` : `Y = ${dutOutputs['Y'] ?? 0} | W = ${dutOutputs['W'] ?? 1}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SHMOO PLOT (VOLTAGE VS FREQUENCY CHARACTERIZATION) */}
        {/* ========================================================= */}
        {activeTab === 'shmoo_plot' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#18191D] border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Shmoo Operating Envelope Characterization
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Voltage (Vdd) vs Maximum Operating Frequency (Fmax) operating space matrix
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs font-mono">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  <span className="text-gray-300">PASS (Met Timing)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span className="text-gray-300">MARGINAL (Jitter Risk)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-red-500"></span>
                  <span className="text-gray-300">FAIL (Setup Violation)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Shmoo Grid */}
              <div className="lg:col-span-8 p-5 rounded-2xl bg-[#18191D] border border-white/10 overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="text-xs font-mono font-bold text-gray-400 mb-2 flex items-center justify-between">
                    <span>Y-Axis: Core Supply Voltage (Vdd)</span>
                    <span>X-Axis: Operating Clock Frequency (MHz) &rarr;</span>
                  </div>

                  <div className="space-y-2">
                    {[1.25, 1.15, 1.05, 0.95, 0.85, 0.75, 0.65].map(vdd => (
                      <div key={vdd} className="flex items-center space-x-2">
                        <div className="w-16 text-right font-mono text-xs text-gray-400 font-bold shrink-0">
                          {vdd.toFixed(2)} V
                        </div>

                        <div className="flex-1 grid grid-cols-7 gap-2">
                          {[300, 500, 700, 900, 1100, 1300, 1500].map(freq => {
                            const pt = shmooMatrix.find(p => p.vdd === vdd && p.freqMhz === freq);
                            const status = pt?.status || 'fail';
                            const isSelected = selectedShmooPoint?.vdd === vdd && selectedShmooPoint?.freqMhz === freq;

                            let colorClass = 'bg-red-500/80 hover:bg-red-400 border-red-400';
                            if (status === 'pass') colorClass = 'bg-emerald-500/80 hover:bg-emerald-400 border-emerald-400';
                            else if (status === 'marginal') colorClass = 'bg-amber-500/80 hover:bg-amber-400 border-amber-400';

                            return (
                              <button
                                key={freq}
                                onClick={() => pt && setSelectedShmooPoint(pt)}
                                className={`h-10 rounded-xl border flex flex-col items-center justify-center font-mono text-[10px] font-bold text-black transition-all shadow-sm ${colorClass} ${
                                  isSelected ? 'ring-2 ring-white scale-105 z-10' : ''
                                }`}
                              >
                                <span>{status.toUpperCase()}</span>
                                <span className="text-[9px] opacity-80">{pt ? `+${pt.slackPs}ps` : ''}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Frequency Labels Header */}
                  <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-white/10">
                    <div className="w-16 shrink-0"></div>
                    <div className="flex-1 grid grid-cols-7 gap-2 text-center font-mono text-[11px] text-gray-400 font-bold">
                      {[300, 500, 700, 900, 1100, 1300, 1500].map(f => (
                        <div key={f}>{f} MHz</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shmoo Point Inspector */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-[#18191D] border border-white/10 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Search size={16} className="text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Operating Point Inspector
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Click any cell on the Shmoo plot to inspect exact physical timing slack and thermal power.
                  </p>
                </div>

                {selectedShmooPoint ? (
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                      <span className="text-gray-400">Condition:</span>
                      <span className="font-bold text-cyan-300">
                        {selectedShmooPoint.vdd.toFixed(2)}V @ {selectedShmooPoint.freqMhz} MHz
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                      <span className="text-gray-400">Timing Slack:</span>
                      <span className={`font-bold ${
                        selectedShmooPoint.status === 'pass' ? 'text-emerald-400' : selectedShmooPoint.status === 'marginal' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {selectedShmooPoint.slackPs > 0 ? `+${selectedShmooPoint.slackPs} ps (MET)` : `${selectedShmooPoint.slackPs} ps (VIOLATED)`}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                      <span className="text-gray-400">Dynamic Power:</span>
                      <span className="text-white font-bold">{selectedShmooPoint.dynamicPowerMw} mW</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                      <span className="text-gray-400">Silicon Feasibility:</span>
                      <span className={`font-bold uppercase ${
                        selectedShmooPoint.status === 'pass' ? 'text-emerald-400' : selectedShmooPoint.status === 'marginal' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {selectedShmooPoint.status}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono">
                    Select any cell in the 7x7 matrix to view characterization results.
                  </div>
                )}

                <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] text-gray-400">
                  <span className="text-amber-400 font-bold">Engineering Note:</span> The safe operating envelope demonstrates full compliance with Commercial (0°C to 70°C) and Industrial (-40°C to 85°C) specifications.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PHYSICAL SIGNOFF & DRC/LVS AUTO-FIXER               */}
        {/* ========================================================= */}
        {activeTab === 'physical_signoff' && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="p-4 rounded-2xl bg-[#18191D] border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Golden DRC / LVS / ERC / Antenna Sign-off Verification
                  </h3>
                </div>
                <p className="text-xs text-gray-400">
                  Magic VLSI, Netgen SPICE LVS, and KLayout Golden Rule Deck verification
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRunFullDrcLvsScan}
                  disabled={isScanningDrc}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-md"
                >
                  <RotateCcw size={13} className={isScanningDrc ? 'animate-spin' : ''} />
                  <span>{isScanningDrc ? `Scanning (${drcScanProgress}%)...` : 'Re-run Golden Sign-off Deck'}</span>
                </button>

                {hasInjectedViolation && (
                  <button
                    onClick={handleAutoFixDrc}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-md animate-bounce"
                  >
                    <Sparkles size={13} />
                    <span>Run Live Auto-Fix ECO (Clear Violations)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Violation Injection Playground */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={15} className="text-amber-400" />
                <span className="font-bold text-gray-300">Interactive Sign-off Violation Injector:</span>
                <span className="text-gray-500">(Test verification robustness)</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleInjectViolation('spacing')}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-all"
                >
                  + Inject M2 Spacing DRC
                </button>
                <button
                  onClick={() => handleInjectViolation('antenna')}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-all"
                >
                  + Inject Antenna Ratio Spike
                </button>
                <button
                  onClick={() => handleInjectViolation('tap')}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-all"
                >
                  + Inject Floating Substrate Tap
                </button>
              </div>
            </div>

            {/* Signoff Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {signoffRules.map((rule) => {
                const isViolation = rule.status === 'VIOLATION';
                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 shadow-sm ${
                      isViolation
                        ? 'bg-red-950/20 border-red-500/50 ring-1 ring-red-500/30'
                        : 'bg-[#1A1C20] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-2 rounded-xl border shrink-0 ${
                          isViolation ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-black/40 border-white/10 text-emerald-400'
                        }`}>
                          {isViolation ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{rule.name}</h4>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            Tool: {rule.tool} • Limit: {rule.specLimit}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                        isViolation
                          ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {rule.status}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-[11px] font-mono ${
                      isViolation ? 'bg-red-900/30 border-red-500/30 text-red-200' : 'bg-[#111215] border-white/5 text-gray-300'
                    }`}>
                      {rule.measured}
                    </div>

                    {rule.violationCoord && (
                      <div className="p-2 rounded-lg bg-black/60 border border-red-500/40 text-[10px] font-mono text-red-300 flex justify-between items-center">
                        <span>Coord: X={rule.violationCoord.x}, Y={rule.violationCoord.y} ({rule.violationCoord.layer})</span>
                        <span className="text-amber-400 font-bold">DEFECT FLAGGED</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: GDS-II / OASIS MASK INSPECTOR                      */}
        {/* ========================================================= */}
        {activeTab === 'gds_mask' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#18191D] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <FileCode size={18} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    GDS-II / OASIS Binary Stream & Reticle Stack
                  </h3>
                </div>
                <p className="text-xs text-gray-400">
                  Tapeout format: <span className="font-mono font-bold text-cyan-300">GDS-II Stream v6.0</span> • Checksum: <span className="font-mono text-amber-300">0x8F92A1B4</span> • Area: <span className="font-mono text-emerald-300">{metrics.dieAreaMm2} mm²</span>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => alert(`Downloaded ${activeComponentName.replace(/\s+/g, '_')}_tapeout.gds (Checksum: 0x8F92A1B4)`)}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <Download size={13} />
                  <span>Download GDS-II Stream File</span>
                </button>

                {onNavigateToCats && (
                  <button
                    onClick={onNavigateToCats}
                    className="px-3.5 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  >
                    <Layers3 size={13} />
                    <span>Open in CATS (MDP) ➔</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mask Layers Table */}
            <div className="p-4 rounded-2xl bg-[#18191D] border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-[11px]">
                    <th className="pb-2.5">GDS Layer #</th>
                    <th className="pb-2.5">Mask Description</th>
                    <th className="pb-2.5">Tone</th>
                    <th className="pb-2.5">Polygon Count</th>
                    <th className="pb-2.5">Min Critical Dim</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {maskLayers.map((layer) => (
                    <tr
                      key={layer.num}
                      onClick={() => setSelectedLayer(layer.num)}
                      className={`hover:bg-white/5 cursor-pointer transition-colors ${
                        selectedLayer === layer.num ? 'bg-cyan-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 font-bold text-cyan-400">Layer {layer.num}</td>
                      <td className="py-2.5 text-white flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: layer.color }}
                        ></span>
                        <span>{layer.name}</span>
                      </td>
                      <td className="py-2.5 text-gray-300">{layer.tone} Field</td>
                      <td className="py-2.5 text-amber-300 font-bold">{layer.polyCount.toLocaleString()}</td>
                      <td className="py-2.5 text-gray-300">{layer.minFeature}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          VERIFIED CLEAN
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Official Sign-off Certificate Modal */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18191D] border-2 border-amber-500/50 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-center relative">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-400 mx-auto">
              <Award size={34} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                ASIC Physical Design & Silicon Tapeout
              </span>
              <h3 className="text-xl font-bold text-white">
                Official Certificate of Silicon Sign-Off
              </h3>
              <p className="text-xs text-gray-400">
                Certified for Foundry Fabrication: <span className="text-emerald-400 font-bold">{activeComponentName}</span> (IC: {activeIcId})
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 text-left space-y-2 text-xs text-gray-300 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Target Tech PDK:</span>
                <span className="text-white font-bold">{techNode.toUpperCase()} Node</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Design Rule Check (DRC):</span>
                <span className="text-emerald-400 font-bold">0 Violations (PASSED)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Layout vs Schematic (LVS):</span>
                <span className="text-emerald-400 font-bold">100.0% Equivalent</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Worst Setup Slack:</span>
                <span className="text-emerald-400 font-bold">+{benchMetrics.setupSlackPs} ps (MET)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Wafer Sort Prober Yield:</span>
                <span className="text-emerald-400 font-bold">{waferStats.yieldPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GDS-II Stream Checksum:</span>
                <span className="text-cyan-300 font-bold">0x8F92A1B4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Est. Good Die Cost:</span>
                <span className="text-cyan-400 font-bold">
                  {currency === 'INR' 
                    ? `₹${((waferStats.totalPass > 0 ? (2850 / waferStats.totalPass) : 32.50) * USD_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (INR)`
                    : `$${waferStats.totalPass > 0 ? (2850 / waferStats.totalPass).toFixed(2) : '32.50'} (USD)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sign-Off Status:</span>
                <span className="text-amber-400 font-bold">CERTIFIED FOR TAPE-OUT</span>
              </div>
            </div>

            <button
              onClick={() => setShowCertificate(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Close Sign-Off Certificate
            </button>
          </div>
        </div>
      )}

      {/* Indian Rupee (₹ INR) & Global Foundry Cost Estimator Modal */}
      {showPriceEstimatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#18191D] border-2 border-emerald-500/50 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto relative text-left">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg font-sans">
                  ₹
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Foundry & Tapeout Price Estimator</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Indian Cost (₹ INR)
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Direct silicon fabrication, packaging & ATE test costs for <span className="text-emerald-400 font-semibold">{activeComponentName}</span>
                  </p>
                </div>
              </div>

              {/* Currency Toggle inside Modal */}
              <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-black/60 border border-white/10 text-xs">
                <button
                  onClick={() => setCurrency('INR')}
                  className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
                    currency === 'INR' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ₹ INR
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
                    currency === 'USD' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  $ USD
                </button>
              </div>
            </div>

            {/* Exchange Rate Badge */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-400">
              <span>Standard Baseline Exchange Rate:</span>
              <span className="text-amber-300 font-bold">1 USD ($) = 83.50 Indian Rupees (₹)</span>
            </div>

            {/* Core Unit Cost Breakdown Table */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs font-mono">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider pb-1 border-b border-white/10 flex justify-between">
                <span>Per-Chip Manufacturing Breakdown</span>
                <span>Calculated Cost</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <div>
                  <div className="font-bold text-white">1. Bare Silicon Good Die (Wafer Fab)</div>
                  <div className="text-[10px] text-gray-500">Based on 300mm wafer ($2,850 / ₹2,37,975 per wafer / 88 good dies)</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-cyan-400">
                    {currency === 'INR' ? `₹${(32.39 * USD_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '$32.39'}
                  </div>
                  <div className="text-[10px] text-gray-500">{currency === 'INR' ? '$32.39 USD' : `₹${(32.39 * USD_TO_INR).toFixed(0)} INR`}</div>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <div>
                  <div className="font-bold text-white">2. Package Assembly & Wirebonding</div>
                  <div className="text-[10px] text-gray-500">Plastic DIP-16 / QFN leadframe + gold wirebonding + mold compound</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">
                    {currency === 'INR' ? `₹${(0.45 * USD_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '$0.45'}
                  </div>
                  <div className="text-[10px] text-gray-500">{currency === 'INR' ? '$0.45 USD' : `₹${(0.45 * USD_TO_INR).toFixed(1)} INR`}</div>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <div>
                  <div className="font-bold text-white">3. Automated Test Equipment (ATE) Sort & Burn-In</div>
                  <div className="text-[10px] text-gray-500">3.5 sec Advantest V93000 test vector + scan-chain at-speed qualification</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-400">
                    {currency === 'INR' ? `₹${(0.18 * USD_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '$0.18'}
                  </div>
                  <div className="text-[10px] text-gray-500">{currency === 'INR' ? '$0.18 USD' : `₹${(0.18 * USD_TO_INR).toFixed(1)} INR`}</div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-500/30 text-sm">
                <div className="font-bold text-white">Total Packaged & Tested Chip (Single Unit)</div>
                <div className="text-right font-bold text-emerald-300 font-mono text-base">
                  {currency === 'INR' ? `₹${(33.02 * USD_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '$33.02'}
                </div>
              </div>
            </div>

            {/* Volume Production Scale (Indian Rupees - Lakhs & Crores) */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="text-[11px] font-bold text-amber-400 font-mono uppercase tracking-wider">
                Volume Production Scaling in Indian Rupees (₹)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-gray-400">1,000 Units (Proto)</div>
                  <div className="font-bold text-white mt-0.5">
                    {currency === 'INR' ? '₹27.57 Lakhs' : '$33,020'}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">₹2,757 / unit</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-gray-400">10,000 Units (Pilot)</div>
                  <div className="font-bold text-cyan-300 mt-0.5">
                    {currency === 'INR' ? '₹1.85 Crores' : '$221,500'}
                  </div>
                  <div className="text-[9px] text-cyan-400 mt-0.5">₹1,850 / unit (-33%)</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-gray-400">100k Units (Mass)</div>
                  <div className="font-bold text-emerald-300 mt-0.5">
                    {currency === 'INR' ? '₹9.20 Crores' : '$1.10 Million'}
                  </div>
                  <div className="text-[9px] text-emerald-400 mt-0.5">₹920 / unit (-66%)</div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-gray-400">1M Units (Consumer)</div>
                  <div className="font-bold text-purple-300 mt-0.5">
                    {currency === 'INR' ? '₹48.50 Crores' : '$5.80 Million'}
                  </div>
                  <div className="text-[9px] text-purple-400 mt-0.5">₹485 / unit (-82%)</div>
                </div>
              </div>
            </div>

            {/* India Semiconductor Mission (ISM) Incentive Note */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30 text-[11px] text-gray-300 space-y-1">
              <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                <span>🇮🇳 India Semiconductor Mission (ISM) 50% Capital Support:</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Under the central government ISM initiative (MeitY), qualifying academic & startup ASIC tapouts receive up to <span className="text-emerald-400 font-semibold">50% fiscal reimbursement</span> for MPW runs and packaging. Effective prototype batch cost reduces to <span className="text-white font-bold">₹13.78 Lakhs</span>.
              </p>
            </div>

            <button
              onClick={() => setShowPriceEstimatorModal(false)}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Close Price Estimator
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

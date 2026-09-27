import React from 'react';
import { TimingPath } from '../utils/staEngine';
import { Clock, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface STATimingWaveformProps {
  path: TimingPath;
  checkType: 'setup' | 'hold';
}

export function STATimingWaveform({ path, checkType }: STATimingWaveformProps) {
  const period = path.clockPeriodPs;
  const launchLatency = path.launchClockLatencyPs;
  const captureLatency = path.captureClockLatencyPs;
  const arrival = path.dataArrivalPs;
  const required = checkType === 'setup' ? path.dataRequiredSetupPs : path.dataRequiredHoldPs;
  const slack = checkType === 'setup' ? path.setupSlackPs : path.holdSlackPs;
  const isMet = slack >= 0;

  // Normalized time scale from 0 to T_period * 1.35
  const totalWindowPs = Math.max(period * 1.3, arrival * 1.15, required * 1.15);
  const scaleX = (valPs: number) => {
    return Math.max(10, Math.min(580, (valPs / totalWindowPs) * 560 + 20));
  };

  const xLaunchClk = scaleX(launchLatency);
  const xDataArrival = scaleX(arrival);
  const xCaptureClk = scaleX(period + captureLatency);
  const xSetupWindowStart = scaleX(period + captureLatency - path.tSetupPs - path.clockUncertaintyPs);
  const xHoldWindowEnd = scaleX(captureLatency + path.tHoldPs + path.clockUncertaintyPs);

  return (
    <div className="bg-[#14161C] p-4 rounded-2xl border border-white/10 space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-2">
          <Clock size={15} className="text-teal-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Temporal Waveform & Timing Window Analysis ({checkType.toUpperCase()})
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-gray-400">Clock Period: {period} ps ({path.targetClockFreqMhz} MHz)</span>
          <span className={`px-2 py-0.5 rounded font-bold border ${
            isMet ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            Slack: {slack > 0 ? `+${slack}` : slack} ps ({isMet ? 'PASS' : 'VIOLATION'})
          </span>
        </div>
      </div>

      {/* SVG Waveform Visualizer */}
      <div className="w-full overflow-x-auto bg-black/40 p-3 rounded-xl border border-white/5">
        <svg viewBox="0 0 620 230" className="w-full min-w-[580px] h-[210px]">
          <defs>
            {/* Grid Pattern */}
            <pattern id="waveformGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="30" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
              <line x1="0" y1="0" x2="0" y2="30" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
            </pattern>
            {/* Setup Violation Hatch */}
            <pattern id="violationHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.6" />
            </pattern>
          </defs>

          <rect x="0" y="0" width="620" height="230" fill="url(#waveformGrid)" />

          {/* 1. Launch Clock Waveform */}
          <text x="15" y="32" fill="#94A3B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
            LAUNCH CLK ({path.launchFlop})
          </text>
          <path
            d={`M 15 45 L ${xLaunchClk - 25} 45 L ${xLaunchClk - 20} 22 L ${xLaunchClk + 40} 22 L ${xLaunchClk + 45} 45 L 600 45`}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.2"
          />
          {/* Launch Clock Active Edge Marker */}
          <line x1={xLaunchClk - 20} y1="18" x2={xLaunchClk - 20} y2="190" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={xLaunchClk - 20} cy="22" r="3.5" fill="#38BDF8" />
          <text x={xLaunchClk - 16} y="16" fill="#38BDF8" fontSize="9" fontFamily="monospace">
            Launch Edge ({launchLatency}ps)
          </text>

          {/* 2. Data Propagation Signal (At Capture Flop D input) */}
          <text x="15" y="90" fill="#94A3B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
            DATA PATH (D PIN)
          </text>
          {/* Data transition bus */}
          <path
            d={`M 15 105 L ${xDataArrival - 30} 105 L ${xDataArrival} 85 L 600 85`}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
          />
          <path
            d={`M 15 85 L ${xDataArrival - 30} 85 L ${xDataArrival} 105 L 600 105`}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
          />
          {/* Data Arrival Marker */}
          <line x1={xDataArrival} y1="80" x2={xDataArrival} y2="190" stroke="#10B981" strokeWidth="1.5" />
          <circle cx={xDataArrival} cy="95" r="4" fill="#10B981" />
          <text x={xDataArrival + 5} y="78" fill="#10B981" fontSize="9" fontFamily="monospace" fontWeight="bold">
            Data Arrival ({arrival}ps)
          </text>

          {/* 3. Capture Clock Waveform */}
          <text x="15" y="150" fill="#94A3B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
            CAPTURE CLK ({path.captureFlop})
          </text>
          <path
            d={`M 15 165 L ${xCaptureClk - 25} 165 L ${xCaptureClk - 20} 142 L ${xCaptureClk + 40} 142 L ${xCaptureClk + 45} 165 L 600 165`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.2"
          />
          {/* Capture Clock Active Edge Marker */}
          <line x1={xCaptureClk - 20} y1="138" x2={xCaptureClk - 20} y2="200" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx={xCaptureClk - 20} cy="142" r="3.5" fill="#F59E0B" />
          <text x={xCaptureClk - 16} y="136" fill="#F59E0B" fontSize="9" fontFamily="monospace">
            Capture Edge ({period + captureLatency}ps)
          </text>

          {/* 4. Setup Window & Uncertainty Shading */}
          {checkType === 'setup' && (
            <g id="setup_window_zone">
              {/* Setup Window Zone */}
              <rect
                x={xSetupWindowStart}
                y="80"
                width={Math.max(2, xCaptureClk - 20 - xSetupWindowStart)}
                height="85"
                fill="#EF4444"
                fillOpacity="0.22"
                stroke="#EF4444"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <text x={xSetupWindowStart + 3} y="125" fill="#FCA5A5" fontSize="8" fontFamily="monospace">
                T_setup ({path.tSetupPs}ps)
              </text>

              {/* Slack Margin Bar */}
              {isMet ? (
                <g>
                  <line x1={xDataArrival} y1="205" x2={xSetupWindowStart} y2="205" stroke="#10B981" strokeWidth="3" />
                  <circle cx={xDataArrival} cy="205" r="2.5" fill="#10B981" />
                  <circle cx={xSetupWindowStart} cy="205" r="2.5" fill="#10B981" />
                  <text x={(xDataArrival + xSetupWindowStart) / 2} y="220" fill="#34D399" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    Slack Margin: +{slack} ps (MET)
                  </text>
                </g>
              ) : (
                <g>
                  <rect
                    x={xSetupWindowStart}
                    y="80"
                    width={Math.abs(xDataArrival - xSetupWindowStart)}
                    height="85"
                    fill="url(#violationHatch)"
                  />
                  <line x1={xSetupWindowStart} y1="205" x2={xDataArrival} y2="205" stroke="#F43F5E" strokeWidth="3" />
                  <text x={(xSetupWindowStart + xDataArrival) / 2} y="220" fill="#F43F5E" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    VIOLATION: {slack} ps (LATE DATA)
                  </text>
                </g>
              )}
            </g>
          )}

          {/* 5. Hold Window Shading */}
          {checkType === 'hold' && (
            <g id="hold_window_zone">
              <rect
                x={xLaunchClk - 20}
                y="80"
                width={Math.max(5, xHoldWindowEnd - (xLaunchClk - 20))}
                height="85"
                fill="#F59E0B"
                fillOpacity="0.25"
                stroke="#F59E0B"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <text x={xLaunchClk - 15} y="125" fill="#FDE68A" fontSize="8" fontFamily="monospace">
                T_hold ({path.tHoldPs}ps)
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Numerical Timing Math Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
          <div className="text-[10px] text-gray-400">Data Arrival Time</div>
          <div className="text-xs font-bold text-emerald-400">{arrival} ps</div>
        </div>
        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
          <div className="text-[10px] text-gray-400">Data Required Time</div>
          <div className="text-xs font-bold text-amber-400">{required} ps</div>
        </div>
        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
          <div className="text-[10px] text-gray-400">Clock Skew</div>
          <div className="text-xs font-bold text-cyan-400">{path.clockSkewPs > 0 ? `+${path.clockSkewPs}` : path.clockSkewPs} ps</div>
        </div>
        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
          <div className="text-[10px] text-gray-400">Clock Uncertainty</div>
          <div className="text-xs font-bold text-purple-400">{path.clockUncertaintyPs} ps</div>
        </div>
      </div>
    </div>
  );
}

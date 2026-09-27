import React from 'react';
import { LogicState } from '../services/simulatorService';

interface TimingHistoryEntry {
  inputs: Record<string, LogicState>;
  outputs: Record<string, LogicState>;
  time: number;
}

interface AdvancedTimingDiagramProps {
  history: TimingHistoryEntry[];
  signals: { name: string; isOutput: boolean; isBus?: boolean }[];
  width?: number;
  height?: number;
}

export function AdvancedTimingDiagram({ history, signals, width = 800, height = 400 }: AdvancedTimingDiagramProps) {
  const CYCLE_WIDTH = 40;
  const ROW_HEIGHT = 40;
  const SIGNAL_MARGIN = 20;
  const X_OFFSET = 80; // Space for signal names

  // Fallback if no history
  if (history.length === 0) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center text-gray-500">
        Waiting for simulation data...
      </div>
    );
  }

  // Ensure we have a minimum number of cycles to draw the grid
  const maxCycles = Math.max(10, history.length);
  const svgWidth = Math.max(width, X_OFFSET + maxCycles * CYCLE_WIDTH + 20);
  const svgHeight = Math.max(height, signals.length * ROW_HEIGHT + 40);

  const renderSingleSignal = (signalName: string, isOutput: boolean, rowIndex: number) => {
    const yBase = 30 + rowIndex * ROW_HEIGHT;
    const yHigh = yBase - 15;
    const yLow = yBase + 5;
    const yMid = yBase - 5;
    const strokeColor = isOutput ? '#A78BFA' : '#10B981'; // Purple for out, Emerald for in

    let pathD = `M ${X_OFFSET} `;
    
    // Initial state
    const firstVal = isOutput ? history[0]?.outputs[signalName] : history[0]?.inputs[signalName];
    let prevY = firstVal === 1 ? yHigh : firstVal === 'Z' ? yMid : yLow;
    pathD += `${prevY}`;

    // Cross-hatch patterns for Z state
    const zHatchPaths: React.ReactNode[] = [];

    history.forEach((h, i) => {
      const val = isOutput ? h.outputs[signalName] : h.inputs[signalName];
      const targetY = val === 1 ? yHigh : val === 'Z' ? yMid : yLow;
      
      const xStart = X_OFFSET + i * CYCLE_WIDTH;
      const xEnd = xStart + CYCLE_WIDTH;

      // Draw transition (slanted edge for realism)
      const TRANSITION_WIDTH = 4;
      
      if (val === 'Z' && firstVal !== undefined) {
        // Draw hatching block for Z
        zHatchPaths.push(
          <rect 
            key={`z-${signalName}-${i}`} 
            x={xStart} y={yHigh} width={CYCLE_WIDTH} height={yLow - yHigh} 
            fill="url(#hatch)" opacity={0.3} 
          />
        );
      }

      if (i > 0) {
        pathD += ` L ${xStart} ${prevY} L ${xStart + TRANSITION_WIDTH} ${targetY}`;
      }
      pathD += ` L ${xEnd} ${targetY}`;
      
      prevY = targetY;
    });

    return (
      <g key={signalName}>
        <text x={10} y={yBase} fill={strokeColor} fontSize="12" fontFamily="monospace" fontWeight="bold">
          {signalName.toUpperCase()}
        </text>
        {zHatchPaths}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
        <line x1={X_OFFSET} y1={yBase + 10} x2={svgWidth} y2={yBase + 10} stroke="#ffffff" strokeOpacity="0.05" />
      </g>
    );
  };

  const renderBusSignal = (signalName: string, isOutput: boolean, rowIndex: number) => {
    // A bus is drawn as a continuous polygon that pinches at transition boundaries
    const yBase = 30 + rowIndex * ROW_HEIGHT;
    const yHigh = yBase - 15;
    const yLow = yBase + 5;
    const strokeColor = isOutput ? '#A78BFA' : '#3B82F6'; // Blue for bus input
    const fillColor = isOutput ? 'rgba(167,139,250,0.1)' : 'rgba(59,130,246,0.1)';

    const polys: React.ReactNode[] = [];

    history.forEach((h, i) => {
      const val = isOutput ? h.outputs[signalName] : h.inputs[signalName];
      const xStart = X_OFFSET + i * CYCLE_WIDTH;
      const xEnd = xStart + CYCLE_WIDTH;
      const tW = 4; // transition width

      // If previous value is same, don't pinch. For simplicity, we pinch every cycle 
      // if it's a new cycle, but in a real viewer we'd only pinch on value change.
      // We will assume value changes every cycle for visual effect if val changes.
      const prevVal = i > 0 ? (isOutput ? history[i-1].outputs[signalName] : history[i-1].inputs[signalName]) : val;
      const pinchLeft = (val !== prevVal && i > 0);
      
      let pts = "";
      if (pinchLeft) {
        pts = `${xStart},${yBase - 5} ${xStart + tW},${yHigh} ${xEnd},${yHigh} ${xEnd},${yLow} ${xStart + tW},${yLow} ${xStart},${yBase - 5}`;
      } else {
        pts = `${xStart},${yHigh} ${xEnd},${yHigh} ${xEnd},${yLow} ${xStart},${yLow}`;
      }

      polys.push(
        <g key={`bus-${signalName}-${i}`}>
          <polygon points={pts} fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
          <text 
            x={xStart + CYCLE_WIDTH/2 + (pinchLeft ? tW/2 : 0)} 
            y={yBase - 1} 
            fill={strokeColor} 
            fontSize="10" 
            fontFamily="monospace" 
            textAnchor="middle"
          >
            {val === 'Z' ? 'Hi-Z' : `0x${Number(val).toString(16).toUpperCase()}`}
          </text>
        </g>
      );
    });

    return (
      <g key={`group-${signalName}`}>
        <text x={10} y={yBase} fill={strokeColor} fontSize="12" fontFamily="monospace" fontWeight="bold">
          {signalName.toUpperCase()} [BUS]
        </text>
        {polys}
        <line x1={X_OFFSET} y1={yBase + 10} x2={svgWidth} y2={yBase + 10} stroke="#ffffff" strokeOpacity="0.05" />
      </g>
    );
  };

  return (
    <div className="w-full h-full overflow-auto bg-[#0a0d14]">
      <svg width={svgWidth} height={svgHeight}>
        <defs>
          <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2" opacity="0.8" />
          </pattern>
        </defs>

        {/* Grid and Clock markers */}
        <g opacity="0.2">
          {Array.from({ length: maxCycles }).map((_, i) => (
            <line 
              key={`grid-${i}`} 
              x1={X_OFFSET + i * CYCLE_WIDTH} 
              y1={0} 
              x2={X_OFFSET + i * CYCLE_WIDTH} 
              y2={svgHeight} 
              stroke="#ffffff" 
              strokeDasharray="4 4" 
            />
          ))}
        </g>
        
        {/* Clock Ticks Header */}
        <g>
          {Array.from({ length: maxCycles }).map((_, i) => (
            <text 
              key={`tick-${i}`} 
              x={X_OFFSET + i * CYCLE_WIDTH + 2} 
              y={15} 
              fill="#6b7280" 
              fontSize="10" 
              fontFamily="monospace"
            >
              T{i}
            </text>
          ))}
        </g>

        {/* Render Signals */}
        {signals.map((sig, idx) => 
          sig.isBus 
            ? renderBusSignal(sig.name, sig.isOutput, idx)
            : renderSingleSignal(sig.name, sig.isOutput, idx)
        )}
      </svg>
    </div>
  );
}

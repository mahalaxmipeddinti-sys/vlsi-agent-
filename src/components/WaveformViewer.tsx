import React, { useRef } from 'react';
import { Download, Image as ImageIcon, FileCode2 } from 'lucide-react';

interface Signal {
  name: string;
  wave: string;
  data?: string[];
}

interface WaveformViewerProps {
  data: { signals: Signal[] } | null;
}

export function WaveformViewer({ data }: WaveformViewerProps) {
  if (!data || !data.signals || data.signals.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-[#1A1C20]">
        Generate a waveform to view simulation results.
      </div>
    );
  }

  const timeStep = 40;
  const rowHeight = 40;
  const signalSpacing = 20;
  const labelWidth = 150;
  const axisHeight = 30;
  
  const maxWaveLen = Math.max(...data.signals.map(s => s.wave.length));
  const width = labelWidth + maxWaveLen * timeStep + 20;
  const height = data.signals.length * (rowHeight + signalSpacing) + 40 + axisHeight;

  const svgRef = useRef<SVGSVGElement>(null);

  const exportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'waveform.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPNG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      canvas.width = width;
      canvas.height = height;
      if (ctx) {
        ctx.fillStyle = '#1A1C20';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'waveform.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const renderWave = (signal: Signal, yOffset: number) => {
    let elements = [];
    let dataIdx = 0;

    const y0 = yOffset + rowHeight - 5; // Low
    const y1 = yOffset + 5; // High
    const yM = yOffset + rowHeight / 2; // Mid

    const getState = (index: number) => {
      if (index < 0) return 'x';
      let s = signal.wave[index];
      let j = index;
      while (s === '.' && j > 0) {
        j--;
        s = signal.wave[j];
      }
      return s === '.' ? 'x' : s;
    };

    const getEndLevel = (st: string) => {
      if (st === '0' || st === 'p' || st === 'P') return '0';
      if (st === '1' || st === 'n' || st === 'N') return '1';
      return st;
    };

    const getStartLevel = (st: string) => {
      if (st === '0' || st === 'p' || st === 'P') return '0';
      if (st === '1' || st === 'n' || st === 'N') return '1';
      return st;
    };

    for (let i = 0; i < signal.wave.length; i++) {
      const char = signal.wave[i];
      const x = labelWidth + i * timeStep;
      const nextX = x + timeStep;
      
      const state = getState(i);
      const prevState = getState(i - 1);
      const isNewState = char !== '.';

      const endLevel = getEndLevel(prevState);
      const startLevel = getStartLevel(state);

      // Draw transition
      if (isNewState && i > 0) {
        if ((endLevel === '0' && startLevel === '1') || (endLevel === '1' && startLevel === '0')) {
          elements.push(<line key={`t-${i}`} x1={x} y1={endLevel === '0' ? y0 : y1} x2={x} y2={startLevel === '0' ? y0 : y1} stroke="#10b981" strokeWidth="2" />);
        } else if ((endLevel === '0' || endLevel === '1') && (startLevel === 'x' || startLevel === '=')) {
          const startY = endLevel === '0' ? y0 : y1;
          elements.push(<line key={`t-top-${i}`} x1={x} y1={startY} x2={x+4} y2={y1} stroke="#10b981" strokeWidth="2" />);
          elements.push(<line key={`t-bot-${i}`} x1={x} y1={startY} x2={x+4} y2={y0} stroke="#10b981" strokeWidth="2" />);
          if (startLevel === 'x') {
            elements.push(<polygon key={`t-poly-${i}`} points={`${x},${startY} ${x+4},${y1} ${x+4},${y0}`} fill="rgba(239,68,68,0.2)" />);
          }
        } else if ((endLevel === 'x' || endLevel === '=') && (startLevel === '0' || startLevel === '1')) {
          const endY = startLevel === '0' ? y0 : y1;
          elements.push(<line key={`t-top-${i}`} x1={x} y1={y1} x2={x+4} y2={endY} stroke="#10b981" strokeWidth="2" />);
          elements.push(<line key={`t-bot-${i}`} x1={x} y1={y0} x2={x+4} y2={endY} stroke="#10b981" strokeWidth="2" />);
          if (endLevel === 'x') {
            elements.push(<polygon key={`t-poly-${i}`} points={`${x},${y1} ${x+4},${endY} ${x},${y0}`} fill="rgba(239,68,68,0.2)" />);
          }
        } else if ((endLevel === 'x' || endLevel === '=') && (startLevel === 'x' || startLevel === '=')) {
          elements.push(<path key={`t-cross1-${i}`} d={`M ${x} ${y1} L ${x+4} ${yM} L ${x+8} ${y1}`} fill="none" stroke="#10b981" strokeWidth="2" />);
          elements.push(<path key={`t-cross2-${i}`} d={`M ${x} ${y0} L ${x+4} ${yM} L ${x+8} ${y0}`} fill="none" stroke="#10b981" strokeWidth="2" />);
          if (startLevel === 'x') {
            elements.push(<polygon key={`t-poly-${i}`} points={`${x},${y1} ${x+4},${yM} ${x+8},${y1} ${x+8},${y0} ${x+4},${yM} ${x},${y0}`} fill="rgba(239,68,68,0.2)" />);
          }
        }
      }

      // Draw body
      const startX = (isNewState && (startLevel === 'x' || startLevel === '=') && i > 0) ? x + (endLevel === 'x' || endLevel === '=' ? 8 : 4) : x;
      const endX = nextX;

      if (state === '0') {
        elements.push(<line key={`b-${i}`} x1={startX} y1={y0} x2={endX} y2={y0} stroke="#10b981" strokeWidth="2" />);
      } else if (state === '1') {
        elements.push(<line key={`b-${i}`} x1={startX} y1={y1} x2={endX} y2={y1} stroke="#10b981" strokeWidth="2" />);
      } else if (state === 'x' || state === '=') {
        elements.push(<line key={`b-top-${i}`} x1={startX} y1={y1} x2={endX} y2={y1} stroke="#10b981" strokeWidth="2" />);
        elements.push(<line key={`b-bot-${i}`} x1={startX} y1={y0} x2={endX} y2={y0} stroke="#10b981" strokeWidth="2" />);
        if (state === 'x') {
          elements.push(<polygon key={`b-poly-${i}`} points={`${startX},${y1} ${endX},${y1} ${endX},${y0} ${startX},${y0}`} fill="rgba(239,68,68,0.2)" />);
        }
        if (state === '=' && isNewState) {
          const text = signal.data && signal.data[dataIdx] ? signal.data[dataIdx] : '';
          dataIdx++;
          elements.push(
            <text key={`t-${i}`} x={startX + 4} y={yM + 4} fill="#fff" fontSize="12" fontFamily="monospace">
              {text}
            </text>
          );
        }
      } else if (state === 'p' || state === 'P') {
        elements.push(<path key={`clk-${i}`} d={`M ${x} ${y0} L ${x} ${y1} L ${x + timeStep/2} ${y1} L ${x + timeStep/2} ${y0} L ${nextX} ${y0}`} fill="none" stroke="#3b82f6" strokeWidth="2" />);
        if (state === 'p') {
          elements.push(<path key={`arr-up-${i}`} d={`M ${x-3} ${yM+2} L ${x} ${yM-3} L ${x+3} ${yM+2}`} fill="none" stroke="#3b82f6" strokeWidth="1.5" />);
        }
      } else if (state === 'n' || state === 'N') {
        elements.push(<path key={`clk-${i}`} d={`M ${x} ${y1} L ${x} ${y0} L ${x + timeStep/2} ${y0} L ${x + timeStep/2} ${y1} L ${nextX} ${y1}`} fill="none" stroke="#3b82f6" strokeWidth="2" />);
        if (state === 'n') {
          elements.push(<path key={`arr-dn-${i}`} d={`M ${x-3} ${yM-2} L ${x} ${yM+3} L ${x+3} ${yM-2}`} fill="none" stroke="#3b82f6" strokeWidth="1.5" />);
        }
      }
    }

    return (
      <g key={signal.name}>
        <text x={10} y={yOffset + rowHeight/2 + 5} fill="#10b981" fontSize="14" fontFamily="monospace" fontWeight="bold">
          {signal.name}
        </text>
        {elements}
      </g>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a]">
      <div className="flex items-center justify-end p-4 border-b border-white/5 space-x-2">
        <button
          onClick={exportSVG}
          className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-md border border-white/10 transition-colors"
        >
          <FileCode2 size={14} />
          <span>Export SVG</span>
        </button>
        <button
          onClick={exportPNG}
          className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-md border border-white/10 transition-colors"
        >
          <ImageIcon size={14} />
          <span>Export PNG</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <svg ref={svgRef} width={width} height={height} className="bg-[#1A1C20] rounded-lg border border-white/10" xmlns="http://www.w3.org/2000/svg">
          {/* Time Axis */}
          <g className="time-axis">
            {Array.from({ length: maxWaveLen + 1 }).map((_, i) => (
              <g key={`axis-${i}`}>
                <line 
                  x1={labelWidth + i * timeStep} 
                  y1={axisHeight - 5} 
                  x2={labelWidth + i * timeStep} 
                  y2={axisHeight} 
                  stroke="#666" 
                  strokeWidth="1" 
                />
                <text 
                  x={labelWidth + i * timeStep} 
                  y={axisHeight - 10} 
                  fill="#888" 
                  fontSize="10" 
                  fontFamily="monospace" 
                  textAnchor="middle"
                >
                  {i}
                </text>
              </g>
            ))}
            <line x1={labelWidth} y1={axisHeight} x2={width} y2={axisHeight} stroke="#666" strokeWidth="1" />
          </g>

          {/* Grid Lines */}
          {Array.from({ length: maxWaveLen + 1 }).map((_, i) => (
            <line 
              key={`grid-${i}`} 
              x1={labelWidth + i * timeStep} 
              y1={axisHeight} 
              x2={labelWidth + i * timeStep} 
              y2={height} 
              stroke="#333" 
              strokeWidth="1" 
              strokeDasharray="4 4" 
            />
          ))}
          
          {/* Waveforms */}
          {data.signals.map((signal, idx) => renderWave(signal, axisHeight + 20 + idx * (rowHeight + signalSpacing)))}
        </svg>
      </div>
    </div>
  );
}

import React from 'react';
import { 
  GitMerge, 
  Layers, 
  Activity, 
  Zap, 
  CheckCircle2, 
  X, 
  Cpu, 
  ShieldCheck, 
  Sliders, 
  Clock, 
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { RoutedSignalNet, RoutingVia, RoutingPin } from '../utils/routingEngine';

interface RoutingNetModalProps {
  element: {
    type: 'net' | 'via' | 'pin' | 'macro';
    data: any;
  } | null;
  onClose: () => void;
}

export function RoutingNetModal({ element, onClose }: RoutingNetModalProps) {
  if (!element) return null;

  const renderContent = () => {
    switch (element.type) {
      case 'net': {
        const net = element.data as RoutedSignalNet;
        return {
          title: `Net: ${net.name} (${net.busGroup})`,
          category: 'Detailed Routed Signal Net',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: <GitMerge className="text-emerald-400" size={24} />,
          summary: `An interconnected electrical wire connecting source pin "${net.sourcePin?.name || 'Driver'}" to destination register sinks across multiple orthogonal metal layers.`,
          specs: [
            { label: 'Total Wirelength', value: `${net.totalLengthUm} µm` },
            { label: 'Elmore RC Latency', value: `${net.totalDelayPs} ps` },
            { label: 'Lumped Capacitance', value: `${net.totalCapacitanceFf} fF` },
            { label: 'Total Wire Resistance', value: `${net.totalResistanceOhm} Ω` },
            { label: 'Via Count', value: `${net.vias.length} Contact Vias` },
            { label: 'Antenna Ratio', value: `${net.antennaRatio} / 400 (PASS)` },
            { label: 'DRC Status', value: '100% Clean (0 Shorts, 0 Opens)' }
          ],
          stages: [
            {
              step: '1. Pin Escape on Metal 1/2',
              desc: `Leaves the source macro pin on low-resistance metal, navigating around neighboring pin keepout boundaries.`
            },
            {
              step: '2. Track Assignment on Metal 3',
              desc: `Assigned to a dedicated vertical track in the routing channel to minimize crosstalk with parallel data lines.`
            },
            {
              step: '3. Layer Jumper via Contacts',
              desc: `Transitions between horizontal (M2) and vertical (M3) metallization via ${net.vias.length} low-resistance tungsten contact plugs.`
            },
            {
              step: '4. Register Sink Pin Landing',
              desc: `Lands on the destination core standard cell input gate, fulfilling timing slack requirements with ${net.totalDelayPs} ps arrival delay.`
            }
          ]
        };
      }

      case 'via': {
        const via = element.data as RoutingVia;
        return {
          title: `Via Contact Cut: ${via.fromLayer} ↔ ${via.toLayer}`,
          category: 'Inter-Metal Layer Via Plug',
          badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
          icon: <Layers className="text-pink-400" size={24} />,
          summary: `A vertical microscopic tungsten / copper contact cut connecting orthogonal metal layers (e.g. ${via.fromLayer} and ${via.toLayer}) at wire bends.`,
          specs: [
            { label: 'Contact Type', value: `${via.fromLayer}-${via.toLayer} Square Via` },
            { label: 'Coordinate (X, Y)', value: `(${Math.round(via.x)}, ${Math.round(via.y)}) µm` },
            { label: 'Via Resistance', value: `${via.resistanceOhm} Ω` },
            { label: 'Associated Net', value: via.netId },
            { label: 'Enclosure Rule', value: 'Exceeds 25nm Metal Enclosure' },
            { label: 'Redundancy', value: 'Double-cut DFM Compliant' }
          ],
          stages: [
            {
              step: '1. Orthogonal Direction Transition',
              desc: `Allows Manhattan routing to change from horizontal track orientation to vertical track orientation without shorts.`
            },
            {
              step: '2. Low-Resistance Interconnect',
              desc: `Precision chemical-mechanical planarization (CMP) ensures low contact resistance (${via.resistanceOhm} Ω) to maintain signal slew rate.`
            }
          ]
        };
      }

      case 'pin': {
        const pin = element.data as RoutingPin;
        return {
          title: `Pin Terminal: ${pin.name}`,
          category: 'Physical Component I/O Port',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <Activity className="text-amber-400" size={24} />,
          summary: `A physical landing pad on the perimeter of the macro or standard cell where signal nets enter or exit the active silicon diffusion layer.`,
          specs: [
            { label: 'Port Name', value: pin.name },
            { label: 'Port Direction', value: pin.type.toUpperCase() },
            { label: 'Owner Component', value: pin.ownerId },
            { label: 'Landing Layer', value: pin.layer },
            { label: 'Die Coordinates', value: `(${Math.round(pin.x)}, ${Math.round(pin.y)}) µm` }
          ],
          stages: [
            {
              step: '1. Signal Ingress / Egress',
              desc: `Provides the boundary connection between internal IP logic and the chip-level multi-layer routing network.`
            },
            {
              step: '2. ESD & Capacitive Loading',
              desc: `Engineered with precise input capacitance (< 15 fF) to preserve high-speed digital switching integrity.`
            }
          ]
        };
      }

      case 'macro':
      default: {
        const macro = element.data;
        return {
          title: `${macro.name} (${macro.type})`,
          category: 'Hard Intellectual Property (IP) Block',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: <Cpu className="text-purple-400" size={24} />,
          summary: `A dense pre-routed intellectual property block placed in the silicon floorplan. Lower metal layers (M1–M3) are blocked across its active area, forcing signal nets to route through perimeter corridors.`,
          specs: [
            { label: 'Dimensions', value: `${macro.width} × ${macro.height} µm` },
            { label: 'Routing Halos', value: '15 µm Keepout Corridor' },
            { label: 'Perimeter Pin Count', value: `${macro.pins?.length || 24} Dedicated Ports` },
            { label: 'Routing Metal Blockage', value: 'Layers M1, M2, M3 Blocked' },
            { label: 'Allowed Over-the-Cell Routing', value: 'M4, M5, M6 Allowed' }
          ],
          stages: [
            {
              step: '1. Pin Placement Density',
              desc: `Dense pin arrays along macro edges communicate directly with the central CORE AREA standard cells through dedicated routing channels.`
            },
            {
              step: '2. Power & Clock Access',
              desc: `Receives primary clock from the Stage 4 CTS spine and power rails from the top-level PDN grid.`
            }
          ]
        };
      }
    }
  };

  const content = renderContent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#17191E] border border-white/15 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
              {content.icon}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${content.badgeColor}`}>
                  {content.category}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Stage 5: Routing</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                {content.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary Description */}
        <p className="text-xs text-gray-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
          {content.summary}
        </p>

        {/* Specs Table */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Physical & Electrical Metrics:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {content.specs.map((spec, idx) => (
              <div key={idx} className="p-2 bg-black/40 rounded-lg border border-white/5 flex justify-between items-center">
                <span className="text-gray-400 text-[11px]">{spec.label}:</span>
                <span className="font-mono font-bold text-white text-[11px]">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Steps */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Routing Architecture & Signal Path:
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {content.stages.map((stage, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>{stage.step}</span>
                </div>
                <p className="text-[11px] text-gray-300 pl-5 leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-xs transition-all shadow-md"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

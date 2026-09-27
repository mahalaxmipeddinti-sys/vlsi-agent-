import React, { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, Position, useNodesState, useEdgesState, Handle } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CircuitGraph } from '../services/simulatorService';
import { LogicState } from '../services/simulatorService';
import { Maximize2, Minimize2 } from 'lucide-react';

interface InternalLogicViewerProps {
  graph: CircuitGraph;
  internalState: Record<string, LogicState>;
  faultMap: Record<string, 'SA0' | 'SA1'>;
  onInjectFault: (nodeId: string, fault: 'SA0' | 'SA1' | null) => void;
  onNavigateToTab?: (tabId: string, nodeId?: string) => void;
  highlightedNodeId?: string | null;
}

const GateNode = ({ data, selected }: any) => {
  const isHigh = data.state === 1;
  const isZ = data.state === 'Z';
  const hasFault = data.fault;
  
  let bgColor = '#1e293b';
  let borderColor = '#334155';
  
  if (hasFault === 'SA0') {
    bgColor = '#7f1d1d';
    borderColor = '#ef4444';
  } else if (hasFault === 'SA1') {
    bgColor = '#7f1d1d';
    borderColor = '#ef4444';
  } else if (isHigh) {
    bgColor = '#064e3b';
    borderColor = '#10b981';
  } else if (isZ) {
    bgColor = '#422006';
    borderColor = '#f59e0b';
  }

  return (
    <div 
      onClick={() => data.onNodeClick?.(data.id)}
      className={`px-4 py-2 shadow-md rounded-md border-2 cursor-pointer transition-all hover:brightness-125 ${selected ? 'ring-4 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-50 scale-110' : ''}`} 
      style={{ backgroundColor: bgColor, borderColor: borderColor, minWidth: '80px', textAlign: 'center' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#94a3b8' }} />
      <div className="font-bold text-xs text-white uppercase">{data.label || data.type}</div>
      <div className="text-[10px] text-gray-400">{data.id}</div>
      {hasFault && (
        <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[9px] font-bold px-1 rounded">
          {hasFault}
        </div>
      )}
      <div className="absolute -bottom-3 right-0 bg-black/50 text-white text-[9px] font-mono px-1 rounded border border-white/20">
        val: {data.state}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#94a3b8' }} />
    </div>
  );
};

const BlackBoxNode = ({ data }: any) => {
  return (
    <div 
      onClick={data.onExpand}
      className="px-8 py-10 shadow-2xl rounded-xl border-4 bg-[#0f172a] border-[#334155] flex flex-col items-center justify-center relative cursor-pointer hover:border-emerald-500 transition-all group min-w-[200px]"
    >
      <div className="text-emerald-400 font-bold mb-2 text-xl tracking-wider group-hover:scale-105 transition-transform uppercase">
        {data.label}
      </div>
      <div className="text-gray-400 text-xs flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
        <Maximize2 size={12} /> Tap to expand logic
      </div>
      
      {data.inputs.map((inp: string, idx: number) => (
        <Handle
          key={`in-${inp}`}
          type="target"
          position={Position.Left}
          id={inp}
          style={{ top: `${(idx + 1) * (100 / (data.inputs.length + 1))}%`, background: '#10b981', width: '8px', height: '8px', border: '2px solid #064e3b', left: '-6px' }}
        />
      ))}

      {data.outputs.map((out: string, idx: number) => (
        <Handle
          key={`out-${out}`}
          type="source"
          position={Position.Right}
          id={out}
          style={{ top: `${(idx + 1) * (100 / (data.outputs.length + 1))}%`, background: '#8b5cf6', width: '8px', height: '8px', border: '2px solid #4c1d95', right: '-6px' }}
        />
      ))}
    </div>
  );
};

const nodeTypes = {
  gate: GateNode,
  blackbox: BlackBoxNode
};

export function InternalLogicViewer({ graph, internalState, faultMap, onInjectFault, onNavigateToTab, highlightedNodeId }: InternalLogicViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    if (!isExpanded) {
      // 1. Black Box Mode
      const startY = 50;
      
      // Input nodes
      graph.inputs.forEach((inp, idx) => {
        const inNodeId = graph.nodes.find(n => n.id === inp || n.id === `in_${inp}`)?.id || inp;
        newNodes.push({
          id: `in_pin_${inp}`,
          type: 'gate',
          selected: highlightedNodeId === inp || highlightedNodeId === `in_${inp}`,
          position: { x: 0, y: idx * 80 + startY },
          data: { id: inp, type: 'INPUT', label: inp, state: internalState[inNodeId] ?? 0, fault: null, onNodeClick: (id: string) => onNavigateToTab?.('diagram', id) }
        });
        
        newEdges.push({
          id: `e-in-${inp}-bb`,
          source: `in_pin_${inp}`,
          target: 'blackbox',
          targetHandle: inp,
          animated: internalState[inNodeId] === 1,
          style: { stroke: internalState[inNodeId] === 1 ? '#10b981' : internalState[inNodeId] === 'Z' ? '#f59e0b' : '#64748b', strokeWidth: internalState[inNodeId] === 1 ? 3 : 1 }
        });
      });

      // Black box node
      // Center Y based on inputs/outputs
      const maxPins = Math.max(graph.inputs.length, graph.outputs.length);
      const bbY = startY + (maxPins * 80) / 2 - 80;
      
      newNodes.push({
        id: 'blackbox',
        type: 'blackbox',
        position: { x: 300, y: bbY > 0 ? bbY : 0 },
        data: {
          label: (graph as any).moduleName || 'DUT MODULE',
          inputs: graph.inputs,
          outputs: graph.outputs,
          onExpand: () => setIsExpanded(true)
        }
      });

      // Output nodes
      const outNodeX = 650;
      graph.outputs.forEach((out, idx) => {
        const outNodeId = graph.nodes.find(n => n.id === out || n.id === `out_${out}`)?.id || out;
        const outState = internalState[outNodeId] ?? 0;
        
        newNodes.push({
          id: `out_pin_${out}`,
          type: 'gate',
          selected: highlightedNodeId === out || highlightedNodeId === `out_${out}`,
          position: { x: outNodeX, y: idx * 80 + startY },
          data: { id: out, type: 'OUTPUT', label: out, state: outState, fault: null, onNodeClick: (id: string) => onNavigateToTab?.('diagram', id) }
        });

        newEdges.push({
          id: `e-bb-${out}-out`,
          source: 'blackbox',
          sourceHandle: out,
          target: `out_pin_${out}`,
          animated: outState === 1,
          style: { stroke: outState === 1 ? '#10b981' : outState === 'Z' ? '#f59e0b' : '#64748b', strokeWidth: outState === 1 ? 3 : 1 }
        });
      });

    } else {
      // 2. Expanded Mode (Gate Level)
      graph.edges.forEach(e => {
        newEdges.push({
          id: `e-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          animated: internalState[e.source] === 1,
          style: { 
            stroke: internalState[e.source] === 1 ? '#10b981' : internalState[e.source] === 'Z' ? '#f59e0b' : '#64748b', 
            strokeWidth: internalState[e.source] === 1 ? 3 : 1 
          }
        });
      });

      graph.nodes.forEach((n, i) => {
        newNodes.push({
          id: n.id,
          type: 'gate',
          selected: highlightedNodeId === n.id,
          position: { x: 150 * (i % 4), y: 80 * Math.floor(i / 4) }, // Rough grid layout
          data: {
            id: n.id,
            type: n.type,
            label: n.label,
            state: internalState[n.id] ?? 0,
            fault: faultMap[n.id],
            onNodeClick: (id: string) => onNavigateToTab?.('diagram', id)
          }
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graph, internalState, faultMap, isExpanded, highlightedNodeId, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background gap={12} size={1} color="#334155" />
        <Controls />
      </ReactFlow>
      
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded-lg text-xs font-semibold text-gray-200 shadow-lg flex items-center gap-1.5 backdrop-blur transition-all"
        >
          <Minimize2 size={14} />
          Collapse to Black Box
        </button>
      )}
    </div>
  );
}

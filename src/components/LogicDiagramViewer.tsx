import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, Position, useNodesState, useEdgesState, Handle } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Layers, RefreshCw, BookOpen } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { LogicDiagramLegend } from './LogicDiagramLegend';
import { TruthTableViewer } from './TruthTableViewer';

export interface LogicDiagramData {
  nodes: { id: string; type: string; label: string }[];
  edges: { source: string; target: string }[];
}

interface LogicDiagramViewerProps {
  data: LogicDiagramData | any | null;
  truthTableData?: any;
  onGenerate?: () => void;
  isGenerating?: boolean;
  highlightedNodeId?: string | null;
  onReturnTab?: () => void;
}

const nodeWidth = 120;
const nodeHeight = 80;

// Topological DAG Layout Engine
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  const rankSep = 250; // Increased even more for maximum spacing
  const nodeSep = 120; // Increased to prevent vertical overlapping

  // Build adjacency and compute in-degrees
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  
  nodes.forEach(n => {
    inDegree[n.id] = 0;
    adj[n.id] = [];
  });

  edges.forEach(e => {
    if (adj[e.source]) adj[e.source].push(e.target);
    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
  });

  // Assign ranks (layers)
  const rank: Record<string, number> = {};
  const queue: string[] = [];

  nodes.forEach(n => {
    if (inDegree[n.id] === 0) {
      rank[n.id] = 0;
      queue.push(n.id);
    }
  });

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currRank = rank[curr] || 0;
    (adj[curr] || []).forEach(next => {
      rank[next] = Math.max(rank[next] || 0, currRank + 1);
      inDegree[next]--;
      if (inDegree[next] <= 0 && !queue.includes(next)) {
        queue.push(next);
      }
    });
  }

  // Fallback for unvisited nodes (e.g. outputs or cycles)
  nodes.forEach(n => {
    if (rank[n.id] === undefined) {
      if (n.type === 'output') rank[n.id] = 3;
      else if (n.type === 'input') rank[n.id] = 0;
      else rank[n.id] = 1;
    }
  });

  // Group nodes by rank
  const layers: Record<number, Node[]> = {};
  nodes.forEach(n => {
    const r = rank[n.id] || 0;
    if (!layers[r]) layers[r] = [];
    layers[r].push(n);
  });

  // Compute (x, y) coordinates
  const newNodes = nodes.map(node => {
    const r = rank[node.id] || 0;
    const layerNodes = layers[r] || [node];
    const indexInLayer = layerNodes.findIndex(n => n.id === node.id);
    const totalInLayer = layerNodes.length;
    const offsetFromCenter = (indexInLayer - (totalInLayer - 1) / 2) * nodeSep;

    const x = isHorizontal ? r * rankSep + 60 : offsetFromCenter + 200;
    const y = isHorizontal ? offsetFromCenter + 180 : r * rankSep + 60;

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: { x, y }
    };
  });

  return { nodes: newNodes, edges };
};

// --- Logic Simulation Engine ---
const computeGateOutput = (type: string, inputs: boolean[]) => {
  const t = (type || '').toLowerCase();
  
  if (inputs.length === 0) return false;
  
  const a = inputs[0] || false;
  const b = inputs[1] || false;
  
  switch (t) {
    case 'and': return inputs.every(v => v);
    case 'or': return inputs.some(v => v);
    case 'not':
    case 'inv':
    case 'inverter': return !a;
    case 'nand': return !(inputs.every(v => v));
    case 'nor': return !(inputs.some(v => v));
    case 'xor': return inputs.filter(v => v).length % 2 === 1; // standard N-input XOR (parity)
    case 'xnor': return inputs.filter(v => v).length % 2 === 0;
    case 'dff': 
    case 'register':
    case 'flipflop': return a; // Simplification for static logical diagram (D passes through)
    case 'mux': return inputs[2] ? inputs[1] : inputs[0]; // simplistic mux: sel ? in1 : in0
    case 'alu':
    case 'block':
    case 'encoder':
    case 'decoder':
    case 'comparator':
      // For complex multi-bit/multi-output blocks in this simplified visualizer, 
      // we'll just OR the inputs to show activity if any input is active.
      return inputs.some(v => v);
    case 'tri_state':
    case 'buffer':
      return a && b; // A AND EN (simplification for visualization)
    default: return false;
  }
};


// --- Custom Nodes ---

const InputNode = ({ data, selected }: { data: any, selected?: boolean }) => (
  <div 
    className={`flex items-center justify-center px-3 py-1 border-2 rounded-full text-[10px] font-mono shadow-sm cursor-pointer transition-all select-none duration-300 ${data.value ? 'bg-[#064e3b] border-[#10b981] text-[#10b981]' : 'bg-[#7f1d1d] border-[#ef4444] text-[#ef4444]'} ${selected ? 'ring-4 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)] scale-110 z-50' : ''}`}
    style={{ minWidth: '40px' }}
  >
    <span className="opacity-80 mr-1 text-white">{data.label}:</span>
    <span className="font-bold">{data.value ? '1' : '0'}</span>
    <Handle type="source" position={Position.Right} className="w-1.5 h-1.5 !bg-gray-400 border-none opacity-0" />
  </div>
);

const OutputNode = ({ data, selected }: { data: any, selected?: boolean }) => (
  <div className="flex flex-col items-start justify-center">
    <div className={`flex items-center justify-center px-3 py-1 border-2 rounded-full text-[10px] font-mono shadow-sm transition-all duration-300 ${data.value ? 'bg-[#1e3a8a] border-[#3b82f6] text-[#3b82f6]' : 'bg-[#374151] border-[#6b7280] text-gray-400'} ${selected ? 'ring-4 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)] scale-110 z-50' : ''}`}
         style={{ minWidth: '40px' }}>
      <Handle type="target" position={Position.Left} className="w-1.5 h-1.5 !bg-gray-400 border-none opacity-0" />
      <span className="opacity-80 mr-1 text-white">{data.label}:</span>
      <span className="font-bold">{data.value ? '1' : '0'}</span>
    </div>
    {data.expr && (
      <div className="mt-1.5 text-[8px] text-blue-400/70 font-mono whitespace-nowrap max-w-[250px] overflow-hidden text-ellipsis px-1" title={data.expr}>
        {data.expr}
      </div>
    )}
  </div>
);

const GateNode = ({ data, selected }: { data: any, selected?: boolean }) => {
  const { type, label, value } = data;
  const t = (type || 'gate').toLowerCase();
  
  let svgContent = null;
  
  const isActive = value;
  // Glowing green stroke when active, blue when inactive
  const stroke = isActive ? "#10b981" : "#3b82f6";
  const fill = isActive ? "#064e3b" : "#1e3a8a";
  const strokeWidth = 2.5;

  if (t === 'and') {
    svgContent = <path d="M 10,5 L 25,5 A 15,15 0 0,1 25,35 L 10,35 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  } else if (t === 'or') {
    svgContent = <path d="M 10,5 Q 25,5 40,20 Q 25,35 10,35 Q 17,20 10,5 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  } else if (t === 'not' || t === 'inv' || t === 'inverter') {
    svgContent = (
      <>
        <path d="M 15,5 L 35,20 L 15,35 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <circle cx="39" cy="20" r="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  } else if (t === 'nand') {
    svgContent = (
      <>
        <path d="M 5,5 L 20,5 A 15,15 0 0,1 20,35 L 5,35 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <circle cx="39" cy="20" r="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  } else if (t === 'nor') {
    svgContent = (
      <>
        <path d="M 5,5 Q 20,5 35,20 Q 20,35 5,35 Q 12,20 5,5 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <circle cx="39" cy="20" r="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  } else if (t === 'xor') {
    svgContent = (
      <>
        <path d="M 12,5 Q 27,5 42,20 Q 27,35 12,35 Q 19,20 12,5 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <path d="M 7,5 Q 14,20 7,35" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  } else if (t === 'xnor') {
    svgContent = (
      <>
        <path d="M 10,5 Q 25,5 40,20 Q 25,35 10,35 Q 17,20 10,5 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <path d="M 5,5 Q 12,20 5,35" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        <circle cx="44" cy="20" r="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  } else if (t === 'dff' || t === 'register' || t === 'flipflop') {
    svgContent = (
      <>
        <rect x="5" y="5" width="40" height="30" fill={isActive ? "#1d4ed8" : "#7e22ce"} stroke={isActive ? "#3b82f6" : "#a855f7"} strokeWidth={strokeWidth} rx="4" />
        <path d="M 5,30 L 10,25 L 5,20" fill="none" stroke={isActive ? "#3b82f6" : "#a855f7"} strokeWidth={strokeWidth} />
        <text x="25" y="24" fill="#fff" fontSize="10" textAnchor="middle" fontFamily="monospace">DFF</text>
      </>
    );
  } else if (t === 'tri_state' || t === 'buffer') {
    svgContent = (
      <>
        <path d="M 15,5 L 35,20 L 15,35 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <path d="M 25,12.5 L 25,0" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  } else if (t === 'mux') {
    svgContent = (
      <>
        <path d="M 10,5 L 35,10 L 35,30 L 10,35 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <text x="22" y="24" fill="#fff" fontSize="9" textAnchor="middle" fontFamily="monospace">MUX</text>
      </>
    );
  } else if (['alu', 'block', 'encoder', 'decoder', 'comparator', 'adder'].includes(t)) {
    // Large hierarchical block
    svgContent = (
      <>
        <rect x="0" y="0" width="60" height="40" fill="#1f2937" stroke={isActive ? "#10b981" : "#d97706"} strokeWidth={strokeWidth} rx="4" />
        <text x="30" y="24" fill="#fff" fontSize="10" textAnchor="middle" fontFamily="monospace">{t.toUpperCase()}</text>
      </>
    );
  } else {
    // Fallback block
    svgContent = (
      <>
        <rect x="5" y="5" width="40" height="30" fill="#374151" stroke={isActive ? "#10b981" : "#9ca3af"} strokeWidth={strokeWidth} rx="4" />
        <text x="25" y="24" fill="#fff" fontSize="10" textAnchor="middle" fontFamily="monospace">{(t || 'GATE').substring(0, 4).toUpperCase()}</text>
      </>
    );
  }

  // Adjust SVG viewBox based on node type
  const isLargeBlock = ['alu', 'block', 'encoder', 'decoder', 'comparator', 'adder'].includes(t);
  const viewBoxStr = isLargeBlock ? "0 0 60 40" : "0 0 50 40";
  const svgWidth = isLargeBlock ? "60" : "50";

  return (
    <div className="relative flex flex-col items-center justify-center">
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-gray-400 border-none opacity-0" />
      
      <svg width={svgWidth} height="40" viewBox={viewBoxStr} className={`drop-shadow-md cursor-pointer transition-all duration-300 ${selected ? 'ring-4 ring-purple-500 rounded-lg drop-shadow-[0_0_25px_rgba(168,85,247,0.9)] scale-125 z-50' : isActive ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110' : 'hover:scale-105'}`}>
        {svgContent}
      </svg>
      
      <div className="absolute -bottom-6 text-[9px] text-gray-300 font-mono whitespace-nowrap bg-[#0a0a0a]/90 px-1.5 py-0.5 rounded border border-white/20 pointer-events-none">
        {label}
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-gray-400 border-none opacity-0" />
    </div>
  );
};

const nodeTypes = {
  gate: GateNode,
  input: InputNode,
  output: OutputNode,
};

// --- Main LogicDiagramViewer Component ---

export function LogicDiagramViewer({ data, truthTableData, onGenerate, isGenerating, highlightedNodeId, onReturnTab }: LogicDiagramViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [isTruthTableOpen, setIsTruthTableOpen] = useState<boolean>(false);
  
  // Keep raw un-styled layouted graph
  const [rawGraph, setRawGraph] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);

  // Live simulation states
  const [nodeValues, setNodeValues] = useState<Record<string, boolean>>({});

  const handleToggleInput = useCallback((nodeId: string) => {
    setNodeValues(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'input') {
      setSelectedNode(null); // Do not open side panel for input nodes
      handleToggleInput(node.id); // Toggle the value robustly using React Flow's event
      return;
    }
    setSelectedNode(node);
  }, [handleToggleInput]);

  useEffect(() => {
    if (highlightedNodeId && nodes.length > 0) {
      const found = nodes.find(n => n.id === highlightedNodeId || n.id === `in_${highlightedNodeId}` || n.id === `out_${highlightedNodeId}` || n.id.includes(highlightedNodeId));
      if (found) {
        if (found.type !== 'input') {
          setSelectedNode(found);
        }
        // Force ReactFlow to highlight the node
        setNodes(nds => nds.map(n => ({
          ...n,
          selected: n.id === found.id
        })));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedNodeId, nodes.length, setNodes]);

  // 1. Data Initialization & Layout
  useEffect(() => {
    // If no data provided yet, provide a sensible default circuit (AND gate)
    const activeData = data && (data.nodes?.length || data.moduleName) 
      ? data 
      : {
          nodes: [
            { id: 'in_a', type: 'input', label: 'A (Input)' },
            { id: 'in_b', type: 'input', label: 'B (Input)' },
            { id: 'gate_and', type: 'and', label: '2-Input AND Gate' },
            { id: 'out_y', type: 'output', label: 'Y (Output)' }
          ],
          edges: [
            { source: 'in_a', target: 'gate_and' },
            { source: 'in_b', target: 'gate_and' },
            { source: 'gate_and', target: 'out_y' }
          ]
        };

    // Support both { nodes, edges } and legacy { moduleName, inputs, outputs, submodules }
    let rawNodes: { id: string; type: string; label: string }[] = [];
    let rawEdges: { source: string; target: string }[] = [];

    if (Array.isArray(activeData.nodes) && activeData.nodes.length > 0) {
      rawNodes = activeData.nodes;
      rawEdges = activeData.edges || [];
    } else if (activeData.moduleName) {
      // Convert legacy block diagram data to gate-level nodes
      const d = (activeData.moduleName || '').toLowerCase();
      let gateType = 'and';
      if (d.includes('or_gate') || d.includes('or')) gateType = 'or';
      else if (d.includes('not') || d.includes('inv')) gateType = 'not';
      else if (d.includes('nand')) gateType = 'nand';
      else if (d.includes('nor')) gateType = 'nor';
      else if (d.includes('xnor')) gateType = 'xnor';
      else if (d.includes('xor')) gateType = 'xor';
      else if (d.includes('alu')) gateType = 'alu';
      else if (d.includes('adder')) gateType = 'adder';
      else if (d.includes('counter') || d.includes('dff') || d.includes('register')) gateType = 'dff';
      else if (d.includes('mux') || d.includes('multiplexer')) gateType = 'mux';
      else if (d.includes('decoder')) gateType = 'decoder';
      else if (d.includes('encoder')) gateType = 'encoder';
      else if (d.includes('comparator')) gateType = 'comparator';

      (activeData.inputs || ['a', 'b']).forEach((inName: string) => {
        rawNodes.push({ id: `in_${inName}`, type: 'input', label: inName });
        rawEdges.push({ source: `in_${inName}`, target: 'gate_main' });
      });

      rawNodes.push({ id: 'gate_main', type: gateType, label: `${activeData.moduleName || 'Logic Gate'}` });

      (activeData.outputs || ['y']).forEach((outName: string) => {
        rawNodes.push({ id: `out_${outName}`, type: 'output', label: outName });
        rawEdges.push({ source: 'gate_main', target: `out_${outName}` });
      });
    }

    const initialNodes: Node[] = rawNodes.map((n) => {
      let nodeType = 'gate';
      if (n.type === 'input') nodeType = 'input';
      if (n.type === 'output') nodeType = 'output';

      return {
        id: n.id,
        type: nodeType,
        position: { x: 0, y: 0 },
        data: { 
          label: n.label,
          type: n.type
        },
      };
    });

    const initialEdges: Edge[] = rawEdges.map((e, i) => ({
      id: `e-${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    // Initialize all input node values to False
    const initialValues: Record<string, boolean> = {};
    layoutedNodes.forEach(n => {
      if (n.type === 'input') initialValues[n.id] = false;
    });
    setNodeValues(initialValues);
    setRawGraph({ nodes: layoutedNodes, edges: layoutedEdges });

  }, [data]);


  // 2. Full Circuit Topological Logic Simulation
  useEffect(() => {
    if (!rawGraph) return;

    const { nodes: rNodes, edges: rEdges } = rawGraph;
    
    // Graph structs for topological traversal
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    const inputsMap: Record<string, string[]> = {}; 
    
    rNodes.forEach(n => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
      inputsMap[n.id] = [];
    });

    rEdges.forEach(e => {
      if (!adj[e.source]) adj[e.source] = [];
      if (inDegree[e.target] === undefined) inDegree[e.target] = 0;
      if (!inputsMap[e.target]) inputsMap[e.target] = [];

      adj[e.source].push(e.target);
      inDegree[e.target]++;
      inputsMap[e.target].push(e.source);
    });

    const queue: string[] = [];
    const computedValues = { ...nodeValues };
    const exprMap: Record<string, string> = {};

    // Initialize queue with all source nodes (Inputs)
    rNodes.forEach(n => {
      if (inDegree[n.id] === 0) {
        queue.push(n.id);
        if (computedValues[n.id] === undefined) computedValues[n.id] = false;
        exprMap[n.id] = n.data.label as string;
      }
    });

    // Simulate forward propagation
    while (queue.length > 0) {
      const curr = queue.shift()!;

      adj[curr].forEach(next => {
        inDegree[next]--;
        if (inDegree[next] === 0) {
          const nextNode = rNodes.find(n => n.id === next);
          if (nextNode) {
            if (nextNode.type === 'gate') {
               const gateInputs = inputsMap[next].map(srcId => computedValues[srcId]);
               const gateExprs = inputsMap[next].map(srcId => exprMap[srcId]);
               computedValues[next] = computeGateOutput(nextNode.data.type as string, gateInputs);
               
               // Build boolean expression string
               const t = (nextNode.data.type as string || '').toLowerCase();
               let expr = '';
               if (t === 'not' || t === 'inv') expr = `~${gateExprs[0]}`;
               else if (t === 'and') expr = `(${gateExprs.join(' & ')})`;
               else if (t === 'or') expr = `(${gateExprs.join(' | ')})`;
               else if (t === 'nand') expr = `~(${gateExprs.join(' & ')})`;
               else if (t === 'nor') expr = `~(${gateExprs.join(' | ')})`;
               else if (t === 'xor') expr = `(${gateExprs.join(' ^ ')})`;
               else if (t === 'xnor') expr = `~(${gateExprs.join(' ^ ')})`;
               else expr = nextNode.data.label as string;
               
               exprMap[next] = expr;
            } else if (nextNode.type === 'output') {
               // Output node assumes the value of its single driving input
               computedValues[next] = computedValues[inputsMap[next][0]] || false;
               exprMap[next] = exprMap[inputsMap[next][0]] || (nextNode.data.label as string);
            }
          }
          queue.push(next);
        }
      });
    }

    // Assign visual state to ReactFlow Nodes & Edges
    const finalNodes = rNodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        value: computedValues[n.id],
        expr: exprMap[n.id],
        onToggle: handleToggleInput 
      }
    }));

    const finalEdges = rEdges.map(e => {
      const sourceVal = computedValues[e.source];
      return {
        ...e,
        type: 'default', // Using Bezier curves so vertical lines don't perfectly overlap and hide connections
        style: { 
          stroke: sourceVal ? '#10b981' : '#ef4444', 
          strokeWidth: sourceVal ? 2.5 : 1.5,
          opacity: 0.85
        },
        animated: sourceVal // Wires with logic '1' animate to show data flow
      };
    });

    setNodes(finalNodes);
    setEdges(finalEdges);

  }, [rawGraph, nodeValues, setNodes, setEdges, handleToggleInput]);


  return (
    <ErrorBoundary>
      <div className="w-full h-full flex bg-[#0a0a0a] relative overflow-hidden select-none min-h-[500px]">
        <div className={`flex-1 relative w-full h-full min-h-[450px]`}>
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="text-emerald-400 font-mono text-xs bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Interactive Circuit Simulation</span>
            </div>
            
            {onReturnTab && (
              <button
                onClick={onReturnTab}
                className="self-start px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-full font-mono text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>&larr;</span> Back to Stage 3
              </button>
            )}
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
              <button
                onClick={() => setIsLegendOpen(true)}
                className="p-2.5 bg-[#151619]/90 hover:bg-[#1A1C20] text-emerald-400 border border-emerald-500/40 rounded-lg shadow-lg flex items-center space-x-1.5 text-xs font-mono transition-colors cursor-pointer"
                title="Open VLSI Gate Legend & Symbol Guide"
              >
                <BookOpen size={14} />
                <span>IEEE Gate Legend</span>
              </button>
              
              {truthTableData && (
                <button
                  onClick={() => setIsTruthTableOpen(true)}
                  className="p-2.5 bg-[#151619]/90 hover:bg-[#1A1C20] text-emerald-400 border border-emerald-500/40 rounded-lg shadow-lg flex items-center space-x-1.5 text-xs font-mono transition-colors cursor-pointer"
                  title="View Truth Table"
                >
                  <Layers size={14} />
                  <span>Truth Table</span>
                </button>
              )}

            {onGenerate && (
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="p-2.5 bg-[#151619]/90 hover:bg-[#1A1C20] text-gray-300 hover:text-emerald-400 border border-white/10 rounded-lg shadow-lg flex items-center space-x-1.5 text-xs font-mono transition-colors cursor-pointer"
                title="Re-synthesize Logic Diagram"
              >
                <RefreshCw size={13} className={isGenerating ? 'animate-spin text-emerald-400' : ''} />
                <span>{isGenerating ? 'Synthesizing...' : 'Re-synthesize'}</span>
              </button>
            )}
          </div>

          <div className="w-full h-full" style={{ width: '100%', height: '100%' }}>
            <ReactFlow 
              nodes={nodes} 
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              colorMode="dark"
            >
              <Background color="#1A1C20" gap={16} />
              <Controls className="bg-[#151619] border-white/10 fill-white" />
              <MiniMap nodeColor="#2A2C30" maskColor="rgba(0,0,0,0.7)" />
            </ReactFlow>
          </div>
        </div>

        {selectedNode && (
          <div className="absolute bottom-6 right-6 w-72 bg-[#151619]/95 backdrop-blur-md border border-white/20 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-20 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-black/40 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-emerald-400 font-mono uppercase">{(selectedNode.data.type as string) || 'Logic'} Node</h2>
                <p className="text-gray-400 text-[10px] font-mono">ID: {selectedNode.id}</p>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1.5 bg-white/5 text-gray-400 hover:text-white rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#0a0a0a] border-2 flex items-center justify-center transition-all duration-300 shrink-0"
                   style={{ borderColor: selectedNode.data.value ? '#10b981' : '#ef4444', boxShadow: selectedNode.data.value ? '0 0 15px rgba(16,185,129,0.3)' : '0 0 10px rgba(239,68,68,0.1)' }}>
                <span className="text-xl font-mono font-bold" style={{ color: selectedNode.data.value ? '#10b981' : '#ef4444' }}>
                   {selectedNode.data.value ? '1' : '0'}
                </span>
              </div>
              <div>
                <p className="font-mono text-xs text-white mb-0.5">Live Status</p>
                <p className="text-[10px] text-gray-400 leading-snug">
                  Value: <strong style={{ color: selectedNode.data.value ? '#10b981' : '#ef4444' }}>{selectedNode.data.value ? 'HIGH (1)' : 'LOW (0)'}</strong>
                </p>
              </div>
            </div>

            {selectedNode.type === 'output' && data?.params && (
              <div className="px-4 pb-4">
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/5 text-left">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 border-b border-white/10 pb-1.5">Logic Route</p>
                  {(() => {
                    const type = data.params.type;
                    if (type === 'mux' || type === 'multiplexer') {
                      const selWidth = data.params.selectWidth || 0;
                      let selVal = 0;
                      for(let i=0; i<selWidth; i++) {
                        if(nodeValues[`in_s${i}`]) selVal |= (1 << i);
                      }
                      return <p className="text-[10px] font-mono text-blue-300 leading-relaxed">Sel: <strong>{selVal}</strong><br/>Out routed to <strong className="text-emerald-400">D{selVal}</strong></p>;
                    }
                    if (type === 'demux') {
                      const selWidth = data.params.selectWidth || 0;
                      let selVal = 0;
                      for(let i=0; i<selWidth; i++) {
                        if(nodeValues[`in_s${i}`]) selVal |= (1 << i);
                      }
                      const isRouted = selectedNode.id === `out_y${selVal}`;
                      return <p className="text-[10px] font-mono text-blue-300 leading-relaxed">Sel: <strong>{selVal}</strong><br/>{isRouted ? <span className="text-emerald-400">Active channel!</span> : <span className="text-gray-500">Inactive</span>}</p>;
                    }
                    if (type === 'decoder') {
                      const selWidth = data.params.inputCount || 0;
                      let selVal = 0;
                      for(let i=0; i<selWidth; i++) {
                        if(nodeValues[`in_a${i}`]) selVal |= (1 << i);
                      }
                      const isActive = selectedNode.id === `out_y${selVal}`;
                      return <p className="text-[10px] font-mono text-blue-300 leading-relaxed">In: <strong>{selVal}</strong><br/>{isActive ? <span className="text-emerald-400">Active decoded channel!</span> : <span className="text-gray-500">Inactive</span>}</p>;
                    }
                    
                    return (
                      <>
                        <p className="text-[9px] text-gray-500 mb-0.5">Expression:</p>
                        <p className="font-mono text-[10px] text-emerald-400 break-all">{String(selectedNode.data.expr || selectedNode.data.label)}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Legend Overlay Modal */}
        <LogicDiagramLegend isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />

        {/* Truth Table Overlay Modal */}
        {isTruthTableOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-12 backdrop-blur-sm">
            <div className="relative w-full max-w-5xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
              <button 
                onClick={() => setIsTruthTableOpen(false)}
                className="absolute top-4 right-6 z-50 p-2 bg-black/50 text-gray-400 hover:text-white rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
              <TruthTableViewer data={truthTableData} />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

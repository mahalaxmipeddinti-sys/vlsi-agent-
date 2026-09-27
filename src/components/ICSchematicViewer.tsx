import React, { useMemo, useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, Edge, Node, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { getICData } from '../data/icDatabase';
import { ICDetails } from './ICDetails';
import { X } from 'lucide-react';

export interface NetlistData {
  inputs: string[];
  outputs: string[];
  chips: { id: string; ic: string; name: string }[];
  connections: { from: string; to: string }[];
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 75,
        y: nodeWithPosition.y - 30,
      },
    };
  });
};

export function ICSchematicViewer({ data }: { data: NetlistData }) {
  const [selectedIc, setSelectedIc] = useState<string | null>(null);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // Inputs
    data.inputs?.forEach((input) => {
      initialNodes.push({
        id: input,
        type: 'input',
        data: { label: input },
        position: { x: 0, y: 0 },
        style: { background: '#10b981', color: '#000', border: 'none', fontWeight: 'bold' }
      });
    });

    // Outputs
    data.outputs?.forEach((output) => {
      initialNodes.push({
        id: output,
        type: 'output',
        data: { label: output },
        position: { x: 0, y: 0 },
        style: { background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold' }
      });
    });

    // Chips
    data.chips?.forEach((chip) => {
      initialNodes.push({
        id: chip.id,
        data: { label: `${chip.id}\n(${chip.ic})`, ic: chip.ic },
        position: { x: 0, y: 0 },
        style: { background: '#151619', color: '#10b981', border: '2px solid #10b981', borderRadius: '8px', width: 120, textAlign: 'center', padding: '10px', cursor: 'pointer' }
      });
    });

    // Connections
    data.connections?.forEach((conn, index) => {
      const fromParts = conn.from.split('.');
      const toParts = conn.to.split('.');
      
      const sourceId = fromParts[0];
      const targetId = toParts[0];
      
      const sourcePin = fromParts[1] || '';
      const targetPin = toParts[1] || '';
      
      let label = '';
      if (sourcePin && targetPin) label = `${sourcePin} → ${targetPin}`;
      else if (sourcePin) label = `${sourcePin} →`;
      else if (targetPin) label = `→ ${targetPin}`;

      initialEdges.push({
        id: `e${index}`,
        source: sourceId,
        target: targetId,
        label,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
        labelStyle: { fill: '#9ca3af', fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: '#151619', fillOpacity: 0.8 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }
      });
    });

    const layoutedNodes = getLayoutedElements(initialNodes, initialEdges);
    return { nodes: layoutedNodes, edges: initialEdges };
  }, [data]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.data?.ic) {
      setSelectedIc(node.data.ic as string);
    }
  }, []);

  const selectedIcData = selectedIc ? getICData(selectedIc) : null;

  if (!data) return <div className="p-8 text-gray-400">No netlist data available.</div>;

  return (
    <div className="w-full h-full flex bg-[#0a0a0a] relative overflow-hidden">
      <div className={`flex-1 relative transition-all duration-300 ${selectedIc ? 'w-2/3 border-r border-white/10' : 'w-full'}`}>
        <div className="absolute top-4 left-4 z-10 text-emerald-400 font-mono text-sm bg-black/50 px-3 py-1 rounded-full border border-emerald-500/30">
          7400 Series IC Schematic (Click a chip to view details)
        </div>
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          onNodeClick={onNodeClick}
          fitView
          className="bg-[#0a0a0a]"
          colorMode="dark"
        >
          <Background color="#333" gap={16} />
          <Controls className="bg-[#151619] border-white/10 fill-white" />
        </ReactFlow>
      </div>
      
      {selectedIc && (
        <div className="w-1/3 min-w-[400px] h-full bg-[#0a0a0a] flex flex-col relative overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-20">
          <button 
            onClick={() => setSelectedIc(null)}
            className="absolute top-4 right-4 z-30 p-2 bg-black/50 text-gray-400 hover:text-white rounded-full border border-white/10 hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
          {selectedIcData ? (
            <ICDetails icData={selectedIcData} />
          ) : (
            <div className="p-8 text-gray-400 flex flex-col items-center justify-center h-full text-center">
              <p className="mb-2 text-xl text-emerald-400 font-mono">{selectedIc}</p>
              <p>Detailed IC information not found in the local database.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

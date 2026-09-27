import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface DiagramViewerProps {
  data: any;
}

export function DiagramViewer({ data }: DiagramViewerProps) {
  const { nodes, edges } = useMemo(() => {
    if (!data || !data.moduleName) return { nodes: [], edges: [] };

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Main Module Node
    newNodes.push({
      id: 'main',
      type: 'default',
      position: { x: 250, y: 100 },
      data: { 
        label: (
          <div className="p-2 text-center">
            <div className="font-bold text-sm">{data.moduleName}</div>
            <div className="text-xs text-gray-500">Main Module</div>
          </div>
        )
      },
      style: {
        background: '#1A1C20',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: '8px',
        width: 200,
      }
    });

    // Inputs
    data.inputs?.forEach((input: string, index: number) => {
      const id = `in-${index}`;
      newNodes.push({
        id,
        type: 'input',
        position: { x: 50, y: 50 + index * 60 },
        data: { label: input },
        sourcePosition: Position.Right,
        style: { background: '#064e3b', color: '#fff', border: 'none', borderRadius: '4px' }
      });
      newEdges.push({
        id: `e-${id}-main`,
        source: id,
        target: 'main',
        animated: true,
        style: { stroke: '#10b981' }
      });
    });

    // Outputs
    data.outputs?.forEach((output: string, index: number) => {
      const id = `out-${index}`;
      newNodes.push({
        id,
        type: 'output',
        position: { x: 550, y: 50 + index * 60 },
        data: { label: output },
        targetPosition: Position.Left,
        style: { background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: '4px' }
      });
      newEdges.push({
        id: `e-main-${id}`,
        source: 'main',
        target: id,
        animated: true,
        style: { stroke: '#ef4444' }
      });
    });

    // Submodules
    data.submodules?.forEach((sub: any, index: number) => {
      const id = `sub-${index}`;
      newNodes.push({
        id,
        type: 'default',
        position: { x: 250, y: 250 + index * 100 },
        data: { 
          label: (
            <div className="text-center">
              <div className="font-bold text-xs">{sub.instanceName}</div>
              <div className="text-[10px] text-gray-400">{sub.moduleName}</div>
            </div>
          )
        },
        style: { background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '4px' }
      });
      newEdges.push({
        id: `e-main-${id}`,
        source: 'main',
        target: id,
        style: { stroke: '#3b82f6', strokeDasharray: '5,5' }
      });
    });

    return { nodes: newNodes, edges: newEdges };
  }, [data]);

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        Generate a diagram to visualize the RTL structure.
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0a0a0a]">
      <ReactFlow 
        nodes={nodes} 
        edges={edges}
        fitView
        colorMode="dark"
      >
        <Background color="#333" gap={16} />
        <Controls />
        <MiniMap nodeColor="#1A1C20" maskColor="rgba(0,0,0,0.5)" />
      </ReactFlow>
    </div>
  );
}

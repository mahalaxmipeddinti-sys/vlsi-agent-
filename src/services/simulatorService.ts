export type LogicState = number | 'Z' | 'X';

export interface LogicNode {
  id: string;
  type: string; // 'input', 'output', 'and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor', 'buffer', 'alu', 'dff', 'tri'
  label?: string;
}

export interface LogicEdge {
  source: string;
  target: string;
}

export interface CircuitGraph {
  inputs: string[];
  outputs: string[];
  nodes: LogicNode[];
  edges: LogicEdge[];
  type?: string;
}

export interface EvalResult {
  outputs: Record<string, LogicState>;
  internalState: Record<string, LogicState>;
}

export class TopologicalSimulator {
  private graph: CircuitGraph;
  private state: Map<string, LogicState> = new Map();
  private prev_state: Map<string, LogicState> = new Map();
  private adjacencyList: Map<string, string[]> = new Map();
  private reverseAdjacencyList: Map<string, string[]> = new Map();
  private evaluationOrder: string[] = [];

  constructor(graph: CircuitGraph) {
    this.graph = graph;
    this.buildGraph();
  }

  private buildGraph() {
    this.graph.nodes.forEach(node => {
      this.adjacencyList.set(node.id, []);
      this.reverseAdjacencyList.set(node.id, []);
      this.state.set(node.id, 0);
      this.prev_state.set(node.id, 0);
    });

    this.graph.edges.forEach(edge => {
      this.adjacencyList.get(edge.source)?.push(edge.target);
      this.reverseAdjacencyList.get(edge.target)?.push(edge.source);
    });

    this.evaluationOrder = this.topologicalSort();
  }

  private topologicalSort(): string[] {
    const order: string[] = [];
    const visited: Set<string> = new Set();
    const temp: Set<string> = new Set();

    const visit = (nodeId: string) => {
      if (temp.has(nodeId)) return; // Break cycles
      if (!visited.has(nodeId)) {
        temp.add(nodeId);
        
        const node = this.graph.nodes.find(n => n.id === nodeId);
        if (node?.type !== 'dff') {
          const deps = this.reverseAdjacencyList.get(nodeId) || [];
          deps.forEach(visit);
        }

        temp.delete(nodeId);
        visited.add(nodeId);
        order.push(nodeId);
      }
    };

    this.graph.nodes.forEach(node => {
      if (!visited.has(node.id)) visit(node.id);
    });

    return order;
  }

  // Helper to treat Z/X as 0 for arithmetic/logic unless strictly handled
  private resolveVal(val: LogicState): number {
    return (val === 'Z' || val === 'X') ? 0 : val;
  }

  public evaluate(inputValues: Record<string, LogicState>, faultMap: Record<string, 'SA0' | 'SA1'> = {}): EvalResult {
    // 1. Advance sequential state
    this.graph.nodes.forEach(node => {
      this.prev_state.set(node.id, this.state.get(node.id) ?? 0);
    });

    // 2. Apply inputs
    this.graph.inputs.forEach(inputId => {
      const inNode = this.graph.nodes.find(n => n.id === inputId || n.id === `in_${inputId}`);
      if (inNode) this.state.set(inNode.id, inputValues[inputId] ?? 0);
    });

    // 3. Evaluate cloud
    for (const nodeId of this.evaluationOrder) {
      if (faultMap[nodeId] === 'SA0') {
        this.state.set(nodeId, 0);
        continue;
      } else if (faultMap[nodeId] === 'SA1') {
        this.state.set(nodeId, 1);
        continue;
      }

      const node = this.graph.nodes.find(n => n.id === nodeId);
      if (!node || node.type === 'input') continue;

      const inputs = (this.reverseAdjacencyList.get(nodeId) || []).map(src => {
        const srcNode = this.graph.nodes.find(n => n.id === src);
        return srcNode?.type === 'dff' ? (this.prev_state.get(src) ?? 0) : (this.state.get(src) ?? 0);
      });

      const numInputs = inputs.map(i => this.resolveVal(i));

      let out: LogicState = 0;
      switch (node.type) {
        case 'and': out = numInputs.reduce((a, b) => a & b, 1); break;
        case 'or': out = numInputs.reduce((a, b) => a | b, 0); break;
        case 'not': out = numInputs[0] ? 0 : 1; break;
        case 'nand': out = numInputs.reduce((a, b) => a & b, 1) ? 0 : 1; break;
        case 'nor': out = numInputs.reduce((a, b) => a | b, 0) ? 0 : 1; break;
        case 'xor': out = numInputs.reduce((a, b) => a ^ b, 0); break;
        case 'xnor': out = numInputs.reduce((a, b) => a ^ b, 0) ? 0 : 1; break;
        case 'buffer': out = numInputs[0] ?? 0; break;
        case 'tri':
          // Tri-state buffer: Input 0 is data, Input 1 is enable
          const en = numInputs[1] ?? 1;
          out = en ? (inputs[0] ?? 0) : 'Z';
          break;
        case 'dff': out = inputs[0] ?? 0; break;
        case 'alu': out = numInputs.reduce((a, b) => a ^ b, 0); break;
        default: out = inputs[0] ?? 0; break;
      }
      this.state.set(nodeId, out);
    }

    // 4. Collect Outputs
    const results: Record<string, LogicState> = {};
    const internal: Record<string, LogicState> = {};
    
    this.graph.outputs.forEach(outputId => {
      const outNode = this.graph.nodes.find(n => n.id === outputId || n.id === `out_${outputId}`);
      if (outNode) results[outputId] = this.state.get(outNode.id) ?? 0;
    });

    this.graph.nodes.forEach(node => {
      internal[node.id] = this.state.get(node.id) ?? 0;
    });

    return { outputs: results, internalState: internal };
  }
}

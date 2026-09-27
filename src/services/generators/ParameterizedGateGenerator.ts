import { ComponentParams } from '../../utils/parameterExtractor';

export function generateParameterizedGateDiagram(params: ComponentParams, modName: string) {
  const n = params.inputCount || 2;
  const type = params.type || 'and';

  const inputs: string[] = [];
  const nodes: any[] = [];
  const edges: any[] = [];

  for (let i = 0; i < n; i++) {
    inputs.push(`in${i}`);
    nodes.push({ id: `in${i}`, type: 'input', label: `In${i}` });
  }

  const outputs = ['out'];
  nodes.push({ id: 'out_node', type: 'output', label: 'Out' });
  
  // Base gate
  nodes.push({ id: `gate_1`, type: type, label: type.toUpperCase() });
  
  for (let i = 0; i < n; i++) {
    edges.push({ source: `in${i}`, target: `gate_1` });
  }
  edges.push({ source: `gate_1`, target: `out_node` });

  return {
    moduleName: modName,
    inputs,
    outputs,
    nodes,
    edges
  };
}

export function generateParameterizedGateTruthTable(params: ComponentParams) {
  const n = Math.min(params.inputCount || 2, 4); // Limit to 4 inputs (16 rows) for gates
  const type = params.type || 'and';

  const headers = [];
  for (let i = 0; i < n; i++) headers.push(`A${i}`);
  headers.push('Y');

  const rows = [];
  const maxRows = Math.pow(2, n);
  
  for (let i = 0; i < maxRows; i++) {
    const row = [];
    let out = type === 'and' || type === 'nand' ? 1 : 0;
    
    if (type === 'or' || type === 'nor') out = 0;
    if (type === 'xor' || type === 'xnor') out = 0;

    for (let bit = n - 1; bit >= 0; bit--) {
      const val = (i >> bit) & 1;
      row.push(val.toString());
      
      if (type === 'and' || type === 'nand') out = out & val;
      if (type === 'or' || type === 'nor') out = out | val;
      if (type === 'xor' || type === 'xnor') out = out ^ val;
    }

    if (type === 'nand' || type === 'nor' || type === 'xnor') {
      out = out === 1 ? 0 : 1;
    }

    row.push(out.toString());
    rows.push(row);
  }

  let equation = '';
  if (type === 'and') equation = 'Y = A0 • A1' + (n > 2 ? ' ...' : '');
  if (type === 'or') equation = 'Y = A0 + A1' + (n > 2 ? ' ...' : '');
  if (type === 'nand') equation = 'Y = ~(A0 • A1)';
  if (type === 'nor') equation = 'Y = ~(A0 + A1)';
  if (type === 'xor') equation = 'Y = A0 ⊕ A1';
  if (type === 'xnor') equation = 'Y = ~(A0 ⊕ A1)';

  return {
    description: `${n}-Input ${type.toUpperCase()} Gate Truth Table`,
    headers,
    equation,
    rows
  };
}

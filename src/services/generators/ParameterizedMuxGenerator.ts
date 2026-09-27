import { ComponentParams } from '../../utils/parameterExtractor';

export function generateParameterizedMuxDiagram(params: ComponentParams, modName: string) {
  const n = params.inputCount || 2;
  const s = params.selectWidth || Math.ceil(Math.log2(n));

  const inputs: string[] = [];
  const nodes: any[] = [];
  const edges: any[] = [];

  // Create Data Inputs
  for (let i = 0; i < n; i++) {
    inputs.push(`d${i}`);
    nodes.push({ id: `in_d${i}`, type: 'input', label: `D${i}` });
  }

  // Create Select Inputs
  for (let i = 0; i < s; i++) {
    inputs.push(`s${i}`);
    nodes.push({ id: `in_s${i}`, type: 'input', label: `S${i}` });
    nodes.push({ id: `not_s${i}`, type: 'not', label: 'NOT' });
    edges.push({ source: `in_s${i}`, target: `not_s${i}` });
  }

  const outputs = ['y'];
  nodes.push({ id: 'out_y', type: 'output', label: 'Y' });

  // AND gates for each data path
  for (let i = 0; i < n; i++) {
    nodes.push({ id: `and_${i}`, type: 'and', label: 'AND' });
    edges.push({ source: `in_d${i}`, target: `and_${i}` });
    
    // Connect appropriate select bits or their negations
    for (let bit = 0; bit < s; bit++) {
      const isSet = (i & (1 << bit)) !== 0;
      if (isSet) {
        edges.push({ source: `in_s${bit}`, target: `and_${i}` });
      } else {
        edges.push({ source: `not_s${bit}`, target: `and_${i}` });
      }
    }
  }

  // Final OR gate
  nodes.push({ id: `or_out`, type: 'or', label: 'OR' });
  for (let i = 0; i < n; i++) {
    edges.push({ source: `and_${i}`, target: `or_out` });
  }
  edges.push({ source: `or_out`, target: `out_y` });

  return {
    moduleName: modName,
    inputs,
    outputs,
    nodes,
    edges
  };
}

export function generateParameterizedMuxTruthTable(params: ComponentParams) {
  const n = params.inputCount || 2;
  const s = params.selectWidth || Math.ceil(Math.log2(n));

  const headers = [];
  for (let i = s - 1; i >= 0; i--) headers.push(`Sel[${i}]`);
  headers.push('Selected Input', 'Output Y');

  const rows = [];
  const maxRows = Math.min(n, 16); // Truncate at 16 rows to prevent UI freezing
  
  for (let i = 0; i < maxRows; i++) {
    const row = [];
    for (let bit = s - 1; bit >= 0; bit--) {
      row.push(((i >> bit) & 1).toString());
    }
    row.push(`D[${i}]`);
    row.push(`D[${i}]`);
    rows.push(row);
  }
  
  if (n > 16) {
    rows.push(['...', '...', '...', '...']);
  }

  return {
    description: `${n}-to-1 Multiplexer Truth Table`,
    headers,
    equation: `Y = D_{Sel[${s-1}:0]}`,
    rows
  };
}

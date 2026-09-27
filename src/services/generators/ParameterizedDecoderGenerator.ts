import { ComponentParams } from '../../utils/parameterExtractor';

export function generateParameterizedDecoderDiagram(params: ComponentParams, modName: string) {
  const type = params.type || 'decoder';
  const inputs: string[] = [];
  const outputs: string[] = [];
  const nodes: any[] = [];
  const edges: any[] = [];

  if (type === 'decoder') {
    const n = params.inputCount || 2;
    const m = params.outputCount || Math.pow(2, n);
    
    if (params.hasEnable) {
      inputs.push('en');
      nodes.push({ id: 'in_en', type: 'input', label: 'EN' });
    }

    for (let i = 0; i < n; i++) {
      inputs.push(`a${i}`);
      nodes.push({ id: `in_a${i}`, type: 'input', label: `A${i}` });
      nodes.push({ id: `not_a${i}`, type: 'not', label: 'NOT' });
      edges.push({ source: `in_a${i}`, target: `not_a${i}` });
    }

    for (let i = 0; i < m; i++) {
      outputs.push(`y${i}`);
      nodes.push({ id: `out_y${i}`, type: 'output', label: `Y${i}` });
      nodes.push({ id: `and_${i}`, type: 'and', label: 'AND' });
      
      edges.push({ source: `and_${i}`, target: `out_y${i}` });
      if (params.hasEnable) edges.push({ source: 'in_en', target: `and_${i}` });
      
      for (let bit = 0; bit < n; bit++) {
        if ((i & (1 << bit)) !== 0) {
          edges.push({ source: `in_a${bit}`, target: `and_${i}` });
        } else {
          edges.push({ source: `not_a${bit}`, target: `and_${i}` });
        }
      }
    }
  } else if (type === 'encoder') {
    const n = params.inputCount || 4;
    const m = params.outputCount || Math.ceil(Math.log2(n));

    for (let i = 0; i < n; i++) {
      inputs.push(`d${i}`);
      nodes.push({ id: `in_d${i}`, type: 'input', label: `D${i}` });
    }
    
    outputs.push('v');
    nodes.push({ id: 'out_v', type: 'output', label: 'V' });
    nodes.push({ id: 'or_v', type: 'or', label: 'OR' });
    edges.push({ source: 'or_v', target: 'out_v' });
    
    for (let i = 0; i < n; i++) {
      edges.push({ source: `in_d${i}`, target: 'or_v' });
    }

    for (let i = 0; i < m; i++) {
      outputs.push(`y${i}`);
      nodes.push({ id: `out_y${i}`, type: 'output', label: `Y${i}` });
      nodes.push({ id: `or_${i}`, type: 'or', label: 'OR' });
      edges.push({ source: `or_${i}`, target: `out_y${i}` });
      
      for (let j = 0; j < n; j++) {
        if ((j & (1 << i)) !== 0) {
          edges.push({ source: `in_d${j}`, target: `or_${i}` });
        }
      }
    }
  }

  return {
    moduleName: modName,
    inputs,
    outputs,
    nodes,
    edges
  };
}

export function generateParameterizedDecoderTruthTable(params: ComponentParams) {
  const type = params.type || 'decoder';
  
  if (type === 'decoder') {
    const n = params.inputCount || 2;
    const m = params.outputCount || Math.pow(2, n);
    
    const headers = [];
    if (params.hasEnable) headers.push('EN');
    for (let i = n - 1; i >= 0; i--) headers.push(`A${i}`);
    for (let i = m - 1; i >= 0; i--) headers.push(`Y${i}`);

    const rows = [];
    if (params.hasEnable) {
      const row = ['0'];
      for (let i = 0; i < n; i++) row.push('X');
      for (let i = 0; i < m; i++) row.push('0');
      rows.push(row);
    }
    
    const maxRows = Math.min(Math.pow(2, n), 16);
    for (let i = 0; i < maxRows; i++) {
      const row = [];
      if (params.hasEnable) row.push('1');
      for (let bit = n - 1; bit >= 0; bit--) row.push(((i >> bit) & 1).toString());
      for (let bit = m - 1; bit >= 0; bit--) row.push(bit === i ? '1' : '0');
      rows.push(row);
    }

    if (Math.pow(2, n) > 16) rows.push(Array(headers.length).fill('...'));

    return {
      description: `${n}-to-${m} Decoder Truth Table`,
      headers,
      equation: 'Y_i = (A == i)',
      rows
    };
  } else {
    // Encoder
    const n = params.inputCount || 4;
    const m = params.outputCount || Math.ceil(Math.log2(n));
    const isPriority = params.architecture === 'priority';
    
    const headers = [];
    for (let i = n - 1; i >= 0; i--) headers.push(`D${i}`);
    for (let i = m - 1; i >= 0; i--) headers.push(`Y${i}`);
    headers.push('V');

    const rows = [];
    const maxRows = Math.min(n, 16);
    
    const zeroRow = [];
    for (let i = 0; i < n; i++) zeroRow.push('0');
    for (let i = 0; i < m; i++) zeroRow.push('0');
    zeroRow.push('0');
    rows.push(zeroRow);

    for (let i = 0; i < maxRows; i++) {
      const row = [];
      for (let j = n - 1; j >= 0; j--) {
        if (j === i) row.push('1');
        else if (isPriority && j < i) row.push('X');
        else row.push('0');
      }
      for (let bit = m - 1; bit >= 0; bit--) {
        row.push(((i >> bit) & 1).toString());
      }
      row.push('1');
      rows.push(row);
    }
    
    if (n > 16) rows.push(Array(headers.length).fill('...'));

    return {
      description: `${n}-to-${m} ${isPriority ? 'Priority ' : ''}Encoder Truth Table`,
      headers,
      equation: isPriority ? 'Y = max(i) where D_i == 1' : 'Y = i where D_i == 1',
      rows
    };
  }
}

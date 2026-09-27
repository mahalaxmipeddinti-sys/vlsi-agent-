import { ComponentParams } from '../../utils/parameterExtractor';

export function generateParameterizedArithmeticDiagram(params: ComponentParams, modName: string) {
  const width = params.dataWidth || 4;
  const type = params.type || 'adder';
  
  const inputs: string[] = [];
  const outputs: string[] = [];
  const nodes: any[] = [];
  const edges: any[] = [];

  // Data buses
  for (let i = 0; i < width; i++) {
    inputs.push(`a${i}`);
    inputs.push(`b${i}`);
    nodes.push({ id: `in_a${i}`, type: 'input', label: `A${i}` });
    nodes.push({ id: `in_b${i}`, type: 'input', label: `B${i}` });
  }

  if (type === 'adder') {
    inputs.push('cin');
    nodes.push({ id: 'in_cin', type: 'input', label: 'Cin' });
    
    let lastCarry = 'in_cin';
    
    for (let i = 0; i < width; i++) {
      outputs.push(`sum${i}`);
      nodes.push({ id: `out_sum${i}`, type: 'output', label: `Sum${i}` });
      
      // Full adder block
      nodes.push({ id: `fa_${i}`, type: 'alu', label: 'FA' });
      
      edges.push({ source: `in_a${i}`, target: `fa_${i}` });
      edges.push({ source: `in_b${i}`, target: `fa_${i}` });
      edges.push({ source: lastCarry, target: `fa_${i}` });
      edges.push({ source: `fa_${i}`, target: `out_sum${i}` });
      
      if (i < width - 1) {
        lastCarry = `fa_cout_${i}`;
        nodes.push({ id: lastCarry, type: 'buffer', label: 'Carry' });
        edges.push({ source: `fa_${i}`, target: lastCarry });
      } else {
        outputs.push('cout');
        nodes.push({ id: 'out_cout', type: 'output', label: 'Cout' });
        edges.push({ source: `fa_${i}`, target: 'out_cout' });
      }
    }
  } else if (type === 'comparator') {
    outputs.push('eq');
    nodes.push({ id: 'out_eq', type: 'output', label: 'EQ' });
    nodes.push({ id: 'and_tree', type: 'and', label: 'AND Tree' });
    
    for (let i = 0; i < width; i++) {
      nodes.push({ id: `xnor_${i}`, type: 'xnor', label: 'XNOR' });
      edges.push({ source: `in_a${i}`, target: `xnor_${i}` });
      edges.push({ source: `in_b${i}`, target: `xnor_${i}` });
      edges.push({ source: `xnor_${i}`, target: 'and_tree' });
    }
    edges.push({ source: 'and_tree', target: 'out_eq' });
  } else {
    // Generic ALU / Multiplier fallback box
    nodes.push({ id: 'core', type: 'alu', label: type.toUpperCase() });
    for (let i = 0; i < width; i++) {
      edges.push({ source: `in_a${i}`, target: 'core' });
      edges.push({ source: `in_b${i}`, target: 'core' });
      
      outputs.push(`y${i}`);
      nodes.push({ id: `out_y${i}`, type: 'output', label: `Y${i}` });
      edges.push({ source: 'core', target: `out_y${i}` });
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

export function generateParameterizedArithmeticTruthTable(params: ComponentParams) {
  const type = params.type || 'adder';
  const width = params.dataWidth || 4;

  if (type === 'adder') {
    return {
      description: `${width}-Bit Adder (Truncated)`,
      headers: ['A', 'B', 'Cin', 'Sum', 'Cout'],
      equation: 'Sum = A + B + Cin',
      rows: [
        ['0', '0', '0', '0', '0'],
        ['0', '1', '0', '1', '0'],
        ['1', '1', '0', '2', '0'],
        ['Max', 'Max', '1', 'Max', '1'],
        ['...', '...', '...', '...', '...']
      ]
    };
  }
  
  if (type === 'comparator') {
    return {
      description: `${width}-Bit Comparator`,
      headers: ['A', 'B', 'EQ', 'GT', 'LT'],
      equation: 'EQ = (A == B), GT = (A > B)',
      rows: [
        ['0', '0', '1', '0', '0'],
        ['1', '0', '0', '1', '0'],
        ['0', '1', '0', '0', '1'],
        ['...', '...', '...', '...', '...']
      ]
    };
  }

  return {
    description: `${width}-Bit ${type.toUpperCase()}`,
    headers: ['A', 'B', 'Y'],
    equation: `Y = A op B`,
    rows: [['...', '...', '...']]
  };
}

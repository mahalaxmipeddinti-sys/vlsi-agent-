import { ComponentParams } from '../../utils/parameterExtractor';

export function generateParameterizedShifterDiagram(params: ComponentParams, modName: string) {
  const width = params.dataWidth || 8;
  const architecture = params.architecture || 'logical';
  
  const inputs: string[] = [];
  const outputs: string[] = [];
  const nodes: any[] = [];
  const edges: any[] = [];

  for (let i = 0; i < width; i++) {
    inputs.push(`d${i}`);
    nodes.push({ id: `in_d${i}`, type: 'input', label: `D${i}` });
  }

  const shiftBits = Math.ceil(Math.log2(width));
  for (let i = 0; i < shiftBits; i++) {
    inputs.push(`shamt${i}`);
    nodes.push({ id: `in_shamt${i}`, type: 'input', label: `SHAMT${i}` });
  }

  nodes.push({ id: 'core', type: 'alu', label: `${architecture.toUpperCase()} SHIFTER` });

  for (let i = 0; i < width; i++) {
    edges.push({ source: `in_d${i}`, target: 'core' });
  }
  for (let i = 0; i < shiftBits; i++) {
    edges.push({ source: `in_shamt${i}`, target: 'core' });
  }

  for (let i = 0; i < width; i++) {
    outputs.push(`q${i}`);
    nodes.push({ id: `out_q${i}`, type: 'output', label: `Q${i}` });
    edges.push({ source: 'core', target: `out_q${i}` });
  }

  return {
    moduleName: modName,
    inputs,
    outputs,
    nodes,
    edges
  };
}

export function generateParameterizedShifterTruthTable(params: ComponentParams) {
  const width = params.dataWidth || 8;
  const architecture = params.architecture || 'logical';
  const shiftBits = Math.ceil(Math.log2(width));

  const opMap: Record<string, string> = {
    'logical': '<<',
    'arithmetic': '<<<',
    'rotate': 'ROL',
    'barrel': 'SHIFT'
  };
  const op = opMap[architecture] || '<<';

  return {
    description: `${width}-Bit ${architecture.charAt(0).toUpperCase() + architecture.slice(1)} Shifter`,
    headers: ['Data', 'Shift Amount', 'Result'],
    equation: `Y = Data ${op} SHAMT`,
    rows: [
      ['D', '0', 'D'],
      ['D', '1', `D ${op} 1`],
      ['D', '2', `D ${op} 2`],
      ['...', '...', '...']
    ]
  };
}

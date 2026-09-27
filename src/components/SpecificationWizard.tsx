import React from 'react';
import { CMOS_GATE_TOPOLOGIES, GateTopology } from '../utils/vlsiReferenceData';
import { getComponentClassification } from '../utils/specFormatter';
import { BookOpen, AlertCircle } from 'lucide-react';
import { extractParameters } from '../utils/parameterExtractor';
import { generateParameterizedGateDiagram, generateParameterizedGateTruthTable } from '../services/generators/ParameterizedGateGenerator';
import { generateParameterizedMuxDiagram, generateParameterizedMuxTruthTable } from '../services/generators/ParameterizedMuxGenerator';
import { generateParameterizedArithmeticDiagram, generateParameterizedArithmeticTruthTable } from '../services/generators/ParameterizedArithmeticGenerator';
import { generateParameterizedDecoderDiagram, generateParameterizedDecoderTruthTable } from '../services/generators/ParameterizedDecoderGenerator';
import { generateParameterizedShifterDiagram, generateParameterizedShifterTruthTable } from '../services/generators/ParameterizedShifterGenerator';

interface SpecificationWizardProps {
  activeIcId?: string;
  onGenerateRtl?: (description: string) => void;
}

export function SpecificationWizard({ activeIcId }: SpecificationWizardProps) {
  const findStandardGate = (id: string): GateTopology | null => {
    if (CMOS_GATE_TOPOLOGIES[id]) return CMOS_GATE_TOPOLOGIES[id];
    
    const lowerId = id.toLowerCase();
    for (const key in CMOS_GATE_TOPOLOGIES) {
      const gate = CMOS_GATE_TOPOLOGIES[key];
      if (gate.id === lowerId || lowerId.includes(key) || lowerId.includes(gate.name.toLowerCase().split(' ')[0])) {
         return gate;
      }
    }
    
    if (lowerId.includes('not') || lowerId.includes('inv')) return CMOS_GATE_TOPOLOGIES['inverter'];
    if (lowerId.includes('nand')) return CMOS_GATE_TOPOLOGIES['nand2'];
    if (lowerId.includes('nor')) return CMOS_GATE_TOPOLOGIES['nor2'];
    if (lowerId.includes('and')) return CMOS_GATE_TOPOLOGIES['and2'];
    if (lowerId.includes('or')) return CMOS_GATE_TOPOLOGIES['or2'];
    if (lowerId.includes('xor')) return CMOS_GATE_TOPOLOGIES['xor2_tg'];
    if (lowerId.includes('flip') || lowerId.includes('dff') || lowerId.includes('latch')) return CMOS_GATE_TOPOLOGIES['dff_masterslave'];
    if (lowerId.includes('transmission')) return CMOS_GATE_TOPOLOGIES['transmission_gate'];
    if (lowerId.includes('aoi')) return CMOS_GATE_TOPOLOGIES['aoi21'];
    
    return null;
  };

  const standardGate = activeIcId ? findStandardGate(activeIcId) : null;
  let displayGate = standardGate;

  if (activeIcId && !standardGate) {
        const params = extractParameters(activeIcId);
    const classification = getComponentClassification(activeIcId);
    
    let genInputs: string[] = [];
    let genOutputs: string[] = [];
    let eq = '';
    let desc = '';
    let truthTableData: { in: string, out: string }[] = [];
    
    let genResult = null;
    let truthTable = null;
    
    const modName = 'mod';

    if (['and', 'or', 'nand', 'nor', 'xor', 'xnor', 'not', 'buffer'].includes(params.type)) {
      genResult = generateParameterizedGateDiagram(params, modName);
      truthTable = generateParameterizedGateTruthTable(params);
    } else if (['mux', 'demux'].includes(params.type)) {
      genResult = generateParameterizedMuxDiagram(params, modName);
      truthTable = generateParameterizedMuxTruthTable(params);
    } else if (['adder', 'subtractor', 'multiplier', 'divider', 'alu', 'comparator'].includes(params.type)) {
      genResult = generateParameterizedArithmeticDiagram(params, modName);
      truthTable = generateParameterizedArithmeticTruthTable(params);
    } else if (['decoder', 'encoder'].includes(params.type)) {
      genResult = generateParameterizedDecoderDiagram(params, modName);
      truthTable = generateParameterizedDecoderTruthTable(params);
    } else if (['shifter'].includes(params.type)) {
      genResult = generateParameterizedShifterDiagram(params, modName);
      truthTable = generateParameterizedShifterTruthTable(params);
    }
    
    if (genResult && truthTable) {
      genInputs = genResult.inputs.map((i: string) => i.toUpperCase());
      genOutputs = genResult.outputs.map((o: string) => o.toUpperCase());
      eq = truthTable.equation;
      desc = truthTable.description;
      
      const inCount = genResult.inputs.length;
      truthTableData = truthTable.rows.map((row: string[]) => {
         const outCount = row.length - truthTable.headers.length > 0 ? row.length - truthTable.headers.length : 1; // approximate
         const inStr = truthTable.headers.slice(0, -1).map((h: string, idx: number) => h + '=' + row[idx]).join(', ');
         const outStr = truthTable.headers[truthTable.headers.length - 1] + '=' + row[row.length - 1];
         return { in: inStr, out: outStr };
      });
    } else {
      // Fallback
      genInputs = ['A', 'B'];
      genOutputs = ['Y'];
      eq = 'Y = f(A, B)';
      desc = `A generic ${classification.logicClass} circuit of type ${classification.typeName}.`;
      truthTableData = [{ in: 'Varies', out: 'Depends on precise configuration' }];
    }

    displayGate = {
      id: classification.id,
      name: `${activeIcId?.toUpperCase()} (${classification.name})`,
      category: 'basic',
      inputs: genInputs,
      outputs: genOutputs,
      truthTable: truthTableData,
      booleanEq: eq,
      transistorCount: 0,
      punTopology: 'N/A',
      pdnTopology: 'N/A',
      delay65nm: 'Varies with specific standard cell library',
      logicalEffortG: 1,
      description: desc,
      stickDiagramRules: '',
      applications: []
    } as GateTopology;
  }

  if (!displayGate) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0B0F19] text-gray-400">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-gray-600" />
          <h2 className="text-xl font-medium text-gray-300">No Circuit Selected</h2>
          <p>Please select a circuit from the chat to view its specification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-[#0B0F19] text-gray-200">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="text-emerald-400" size={24} />
          <h1 className="text-2xl font-bold text-white">Circuit Specification</h1>
        </div>
        
        <div className="bg-[#151619] border border-white/10 rounded-xl p-6 shadow-xl space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">{displayGate.name}</h2>
            <p className="text-gray-300 text-base leading-relaxed">{displayGate.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-3">Inputs</h3>
                <div className="flex flex-wrap gap-2">
                  {displayGate.inputs.map(i => (
                    <span key={i} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-mono">{i}</span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-3">Outputs</h3>
                <div className="flex flex-wrap gap-2">
                  {displayGate.outputs.map(o => (
                    <span key={o} className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-sm font-mono">{o}</span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-3">Behavioral Description</h3>
                <div className="p-4 bg-[#0B0F19] border border-white/10 rounded-lg">
                  <code className="text-emerald-300 font-mono text-sm block">
                    {displayGate.booleanEq}
                  </code>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-3">Truth Table</h3>
              <div className="overflow-hidden border border-white/10 rounded-xl bg-[#0B0F19]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-300">Inputs</th>
                      <th className="px-4 py-3 font-medium text-gray-300">Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {displayGate.truthTable?.map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-gray-400">{row.in}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">{row.out}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

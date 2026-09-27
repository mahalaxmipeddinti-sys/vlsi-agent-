import React, { useState, useMemo } from 'react';
import { Table, CheckCircle2, Download, Copy, Check, Filter, Sparkles, Binary, Zap } from 'lucide-react';

export interface TruthTableData {
  description: string;
  headers: string[];
  rows: string[][];
  equation?: string;
  minterms?: string;
}

interface TruthTableViewerProps {
  data: TruthTableData | null;
}

export function TruthTableViewer({ data }: TruthTableViewerProps) {
  const [copied, setCopied] = useState(false);
  const [filterOutput, setFilterOutput] = useState<'ALL' | '1' | '0'>('ALL');
  const [interactiveInputs, setInteractiveInputs] = useState<Record<string, '0' | '1'>>({});

  const defaultData: TruthTableData = data || {
    description: '2-Input Logic Gate Truth Table',
    headers: ['A', 'B', 'Y (Output)'],
    rows: [
      ['0', '0', '0'],
      ['0', '1', '0'],
      ['1', '0', '0'],
      ['1', '1', '1']
    ],
    equation: 'Y = A · B',
    minterms: '∑m(3)'
  };

  // Separate input headers vs output headers
  const numCols = defaultData.headers.length;
  const inputCols = defaultData.headers.slice(0, numCols - 1);
  const outputCol = defaultData.headers[numCols - 1];

  // Initialize interactive inputs state
  const currentInputs = useMemo(() => {
    const res: Record<string, '0' | '1'> = {};
    inputCols.forEach((inp, idx) => {
      res[inp] = interactiveInputs[inp] || '0';
    });
    return res;
  }, [inputCols, interactiveInputs]);

  // Find matching row for interactive inputs
  const activeRowIndex = useMemo(() => {
    return defaultData.rows.findIndex(row => {
      return inputCols.every((inp, idx) => row[idx] === currentInputs[inp]);
    });
  }, [defaultData.rows, inputCols, currentInputs]);

  const activeOutput = activeRowIndex >= 0 ? defaultData.rows[activeRowIndex][numCols - 1] : '?';

  const filteredRows = useMemo(() => {
    if (filterOutput === 'ALL') return defaultData.rows;
    return defaultData.rows.filter(row => row[numCols - 1] === filterOutput);
  }, [defaultData.rows, filterOutput, numCols]);

  const copyToClipboard = () => {
    const text = [
      defaultData.headers.join('\t'),
      ...defaultData.rows.map(r => r.join('\t'))
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [
      defaultData.headers.join(','),
      ...defaultData.rows.map(r => r.join(','))
    ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${defaultData.description.replace(/[^a-zA-Z0-9]/g, '_')}_truth_table.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleInput = (name: string) => {
    setInteractiveInputs(prev => ({
      ...prev,
      [name]: (prev[name] === '1' ? '0' : '1')
    }));
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0d1117] p-6 text-gray-200 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Title & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#161b22] border border-white/10 rounded-xl shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Table size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100 flex items-center space-x-2">
                <span>{defaultData.description}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  {defaultData.rows.length} State Combinations
                </span>
              </h2>
              <p className="text-xs text-gray-400">Exhaustive boolean state mapping and interactive logic probing</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-md border border-white/10 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy Table'}</span>
            </button>
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium rounded-md border border-emerald-500/40 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Live Interactive Simulator Banner */}
        <div className="p-5 bg-gradient-to-r from-[#161b22] via-[#1a2332] to-[#161b22] border border-emerald-500/30 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Zap size={15} />
              <span>Live Logic Probe & Interactive Simulator</span>
            </div>
            <p className="text-xs text-gray-400">Click input bits to probe logic output in real-time:</p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Interactive Inputs */}
            <div className="flex items-center space-x-2 bg-black/40 p-2 rounded-lg border border-white/10">
              {inputCols.map((inp) => {
                const val = currentInputs[inp];
                return (
                  <button
                    key={inp}
                    onClick={() => toggleInput(inp)}
                    className={`flex flex-col items-center justify-center px-3 py-1.5 rounded font-mono text-xs transition-all cursor-pointer ${
                      val === '1'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-[9px] uppercase text-gray-300 opacity-75">{inp}</span>
                    <span className="text-sm font-bold">{val}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-gray-500 font-mono text-lg font-bold">➔</span>

            {/* Output Result */}
            <div className="flex flex-col items-center justify-center px-4 py-1.5 rounded-lg bg-black/50 border border-white/10 font-mono">
              <span className="text-[9px] uppercase text-gray-400">{outputCol}</span>
              <span className={`text-base font-bold ${
                activeOutput === '1' ? 'text-emerald-400' : 'text-blue-400'
              }`}>
                {activeOutput}
              </span>
            </div>
          </div>
        </div>

        {/* Boolean Algebra & Canonical Expression Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#161b22] border border-white/10 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Binary size={14} />
              <span>Boolean Logic Expression</span>
            </div>
            <p className="text-sm font-mono font-bold text-gray-100 bg-black/30 p-2.5 rounded-lg border border-white/5">
              {defaultData.equation || `Y = ${inputCols.join(' · ')}`}
            </p>
          </div>

          <div className="p-4 bg-[#161b22] border border-white/10 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Canonical Minterm Expansion</span>
            </div>
            <p className="text-sm font-mono font-bold text-gray-100 bg-black/30 p-2.5 rounded-lg border border-white/5">
              {defaultData.minterms || '∑m(All True States)'}
            </p>
          </div>
        </div>

        {/* Truth Table Grid */}
        <div className="bg-[#161b22] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-gray-400">
              <Filter size={13} />
              <span>Filter State:</span>
              <button 
                onClick={() => setFilterOutput('ALL')} 
                className={`px-2 py-0.5 rounded cursor-pointer ${filterOutput === 'ALL' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                All ({defaultData.rows.length})
              </button>
              <button 
                onClick={() => setFilterOutput('1')} 
                className={`px-2 py-0.5 rounded cursor-pointer ${filterOutput === '1' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                Output = 1
              </button>
              <button 
                onClick={() => setFilterOutput('0')} 
                className={`px-2 py-0.5 rounded cursor-pointer ${filterOutput === '0' ? 'bg-blue-500/20 text-blue-400 font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                Output = 0
              </button>
            </div>
            <span className="text-gray-500 font-mono text-[11px]">Active state highlighted</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="text-[11px] text-gray-400 uppercase bg-[#12161f] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-500 w-12 text-center border-r border-white/10">#</th>
                  {defaultData.headers.map((header, i) => (
                    <th 
                      key={i} 
                      className={`px-4 py-3 font-bold border-r border-white/10 last:border-r-0 ${
                        i === numCols - 1 ? 'text-emerald-400 bg-emerald-500/5' : 'text-gray-300'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredRows.map((row, i) => {
                  const isMatchActive = defaultData.rows.indexOf(row) === activeRowIndex;

                  return (
                    <tr 
                      key={i} 
                      className={`transition-colors ${
                        isMatchActive 
                          ? 'bg-emerald-500/15 border-l-4 border-emerald-400 text-white font-bold' 
                          : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center text-gray-500 text-[10px] border-r border-white/5">
                        m{i}
                      </td>
                      {row.map((cell, j) => {
                        const isOut = j === numCols - 1;

                        return (
                          <td 
                            key={j} 
                            className={`px-4 py-2.5 border-r border-white/5 last:border-r-0 ${
                              isOut ? 'bg-black/20' : ''
                            }`}
                          >
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold ${
                              cell === '1' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : cell === '0' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                : cell.toLowerCase() === 'x' 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                : 'bg-gray-500/20 text-gray-300'
                            }`}>
                              {cell}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

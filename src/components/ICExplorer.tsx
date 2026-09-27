import React, { useState } from 'react';
import { ICData, getICData, ICCategory } from '../data/icDatabase';
import { ICDetails } from './ICDetails';
import { Search, Cpu, AlertCircle, Filter, Activity } from 'lucide-react';

interface ICExplorerProps {
  onOpenInRtl?: (icName: string, rtlCode: string) => void;
  onOpenJKUI?: () => void;
  activeIcId?: string;
  onSelectIC?: (icId: string) => void;
  onOpenPrice?: () => void;
  activeQuestion?: string;
  activeComponentName?: string;
  activeComponentType?: string;
  onNavigateToStage?: (stageKey: string) => void;
  onUpdateQuestion?: (question: string) => void;
}

export function ICExplorer({ 
  onOpenInRtl, 
  onOpenJKUI, 
  activeIcId, 
  onSelectIC, 
  onOpenPrice,
  activeQuestion,
  activeComponentName,
  activeComponentType,
  onNavigateToStage,
  onUpdateQuestion
}: ICExplorerProps) {
  const [query, setQuery] = useState(activeIcId || '7476');
  const [icData, setIcData] = useState<ICData | null>(() => getICData(activeIcId || '7476'));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  React.useEffect(() => {
    if (activeIcId) {
      const data = getICData(activeIcId);
      if (data) {
        setIcData(data);
        setQuery(activeIcId);
      }
    }
  }, [activeIcId]);

  const allICs = [
    { id: '7400', category: 'Logic Gates' },
    { id: '7402', category: 'Logic Gates' },
    { id: '7404', category: 'Logic Gates' },
    { id: '7408', category: 'Logic Gates' },
    { id: '7432', category: 'Logic Gates' },
    { id: '7486', category: 'Logic Gates' },
    { id: '7476', category: 'Flip-Flops & Sequential' },
    { id: '7473', category: 'Flip-Flops & Sequential' },
    { id: '7474', category: 'Flip-Flops & Sequential' },
    { id: '74138', category: 'Multiplexers & Decoders' },
    { id: '74151', category: 'Multiplexers & Decoders' },
    { id: '7483', category: 'Arithmetic & Registers' }
  ];

  const categories = ['All', 'Flip-Flops & Sequential', 'Logic Gates', 'Multiplexers & Decoders', 'Arithmetic & Registers'];

  const filteredICs = selectedCategory === 'All' 
    ? allICs 
    : allICs.filter(item => item.category === selectedCategory);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const data = getICData(query);
    if (data) {
      setIcData(data);
      onSelectIC?.(data.IC);
    } else {
      setErrorMsg(`IC "${query}" not found in database. Try 7476 (Dual JK), 7473, 7474, 7400, 7404, 7408, 7432, 7486, 74138, 74151, or 7483.`);
    }
  };

  const handleSelectIC = (ic: string) => {
    setQuery(ic);
    setErrorMsg(null);
    const data = getICData(ic);
    if (data) {
      setIcData(data);
      onSelectIC?.(ic);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a]">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-white/10 bg-[#151619] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex space-x-2 w-full max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Search IC (e.g. 7476, 7473, 7400, 7483)"
                className="w-full bg-[#1A1C20] border border-white/10 rounded-md pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md hover:bg-emerald-500/30 transition-colors text-sm font-medium"
            >
              Search
            </button>
          </form>

          {/* Quick Launch JK UI Action */}
          {onOpenJKUI && (
            <button
              onClick={onOpenJKUI}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-md text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm"
            >
              <Activity size={15} />
              <span>Interactive JK Flip-Flop UI</span>
            </button>
          )}
        </div>

        {/* Category Pills & IC Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
          {/* Category Filter */}
          <div className="flex items-center space-x-1 overflow-x-auto text-xs py-1">
            <Filter size={13} className="text-gray-400 mr-1 shrink-0" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border text-[11px] font-medium ${
                  selectedCategory === cat 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-[#1A1C20] text-gray-400 border-white/5 hover:text-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* IC Badges */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto py-1">
            {filteredICs.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelectIC(item.id)}
                className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors border ${
                  icData?.IC === item.id 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold' 
                    : 'bg-[#1A1C20] text-gray-400 border-white/10 hover:text-gray-200 hover:border-white/20'
                }`}
              >
                {item.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs flex items-center space-x-2">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {icData ? (
        <ICDetails 
          icData={icData} 
          onOpenInRtl={onOpenInRtl} 
          onOpenJKUI={onOpenJKUI}
          onOpenPrice={onOpenPrice}
          activeQuestion={activeQuestion}
          activeComponentName={activeComponentName}
          activeComponentType={activeComponentType}
          onNavigateToStage={onNavigateToStage}
          onUpdateQuestion={onUpdateQuestion}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
          <Cpu size={64} className="mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">IC Explorer & Characterization</h3>
          <p className="max-w-md text-sm">
            Search standard 7400 series logic ICs to inspect physical pinouts, electrical & switching characteristics, 3D renders, and real-time logic simulations.
          </p>
        </div>
      )}
    </div>
  );
}

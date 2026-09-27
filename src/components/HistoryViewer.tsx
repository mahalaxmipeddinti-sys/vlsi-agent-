import React, { useState, useEffect } from 'react';
import { Clock, Trash2, Search, Cpu, Code2, Activity, ChevronRight } from 'lucide-react';
import { getHistoryItems, clearAllHistory, groupHistoryByDate, HistoryItem } from '../utils/historyStore';

interface HistoryViewerProps {
  onSelectHistoryPrompt: (prompt: string, icId?: string) => void;
  onNavigateToTab: (tabId: string) => void;
  onSelectComponent?: (id: string) => void;
}

export function HistoryViewer({ onSelectHistoryPrompt, onNavigateToTab, onSelectComponent }: HistoryViewerProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setItems(getHistoryItems());
  }, []);

  const handleClear = () => {
    clearAllHistory();
    setItems([]);
  };

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.query.toLowerCase().includes(search.toLowerCase()) ||
          i.componentName.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const groups = groupHistoryByDate(filtered);

  return (
    <div className="flex flex-col h-full bg-[#141518] text-gray-200">
      {/* Search + Clear */}
      <div className="p-3 space-y-2 border-b border-white/10">
        <div className="flex items-center gap-2 bg-[#1a1c20] border border-white/10 rounded-lg px-3 py-2">
          <Search size={14} className="text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none"
          />
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={12} /> Clear all history
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <Clock size={32} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 font-medium">No history yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Your prompts and component queries will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#111215] sticky top-0">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectHistoryPrompt(item.query, item.icId);
                      if (onSelectComponent) onSelectComponent(item.query);
                    }}
                    role="button"
                    tabIndex={0}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-b-0 cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                        <Cpu size={12} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200 font-medium truncate group-hover:text-white transition-colors">
                          {item.query}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                            {item.componentType}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {item.componentName}
                          </span>
                          <span className="text-[10px] text-gray-600 ml-auto">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); onNavigateToTab('rtl'); }}
                            className="text-[10px] text-purple-300 hover:text-purple-200 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1 cursor-pointer"
                          >
                            <Code2 size={9} /> RTL
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onNavigateToTab('diagram'); }}
                            className="text-[10px] text-blue-300 hover:text-blue-200 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 cursor-pointer"
                          >
                            <Activity size={9} /> Diagram
                          </button>
                          <ChevronRight size={10} className="text-gray-600 ml-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

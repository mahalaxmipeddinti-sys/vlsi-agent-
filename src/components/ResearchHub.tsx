import React, { useState } from 'react';
import { ExternalLink, Search, BookOpen, GraduationCap, PlayCircle, Cpu, Code2, Globe, Info } from 'lucide-react';
import { VLSI_AUTHORITATIVE_RESOURCES, ResourceLink } from '../data/vlsiResources';

export function ResearchHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(VLSI_AUTHORITATIVE_RESOURCES.map(r => r.category)))];

  const filteredResources = VLSI_AUTHORITATIVE_RESOURCES.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || r.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Tutorials': return <BookOpen size={16} />;
      case 'Courses': return <GraduationCap size={16} />;
      case 'Video Learning': return <PlayCircle size={16} />;
      case 'Tools': return <Cpu size={16} />;
      case 'Simulators': return <PlayCircle size={16} />;
      case 'Open Source EDA': return <Code2 size={16} />;
      case 'Communities': return <Globe size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0f1115] text-gray-200">
      <div className="p-6 border-b border-white/5 bg-[#14161b]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <GraduationCap className="text-emerald-400" />
            VLSI Research & Learning Hub
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            A curated directory of authoritative VLSI, digital design, and semiconductor engineering resources.
            Integrated with VLSI Studio AI for grounded research and theoretical validation.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search tutorials, courses, or tools..."
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
                    activeCategory === cat
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResources.map((resource, idx) => (
            <a
              key={idx}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#1a1c22] border border-white/5 rounded-2xl p-4 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-emerald-500/70 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                    {getCategoryIcon(resource.category)}
                    {resource.category}
                  </span>
                  <ExternalLink size={14} className="text-gray-600 group-hover:text-emerald-400 transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors mb-1">
                  {resource.name}
                </h3>
                {resource.description && (
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                    {resource.description}
                  </p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center text-[10px] text-gray-500 group-hover:text-gray-400">
                <Globe size={12} className="mr-1" />
                {new URL(resource.url).hostname}
              </div>
            </a>
          ))}
          {filteredResources.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                <Search size={32} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">No resources found</h3>
              <p className="text-gray-400 text-sm">Try adjusting your search or category filters.</p>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto mt-12 mb-8 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Info className="text-emerald-400" size={24} />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1 text-sm italic">AI-Driven Theoretical Validation</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                The VLSI Studio AI is programmed to cross-reference theoretical foundations from these authoritative sources. 
                When you ask for complex derivations or design optimizations, the engine verifies its models against industry-standard 
                academic curriculum and EDA guidelines from these institutions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

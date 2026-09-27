import React, { useState } from 'react';
import {
  Sparkles, X, ArrowRight, Zap, Code2, Activity, ShieldCheck,
  CheckCircle2, FileText, GitBranch, Box, Flame, LayoutGrid,
  Clock, Layers, Package, Plus, Trash2, Send, Cpu
} from 'lucide-react';

type AppTab =
  | 'rtl' | 'testbench' | 'truthtable' | 'pin' | 'cmos'
  | 'schematic' | 'threed' | 'floorplan' | 'powerplan'
  | 'waveform' | 'diagram' | 'verification' | 'architecture'
  | 'sta' | 'signoff';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFlow: (tab: AppTab) => void;
  activeTab: AppTab;
  onGenerateRtl: (description: string) => void;
  isGenerating: boolean;
  onDesignChip: (description: string) => void;
  isDesigning: boolean;
}

interface FlowItem {
  num: number;
  title: string;
  sub: string;
  tab: AppTab;
  icon: React.ElementType;
  color: string;
}

const frontEndFlows: FlowItem[] = [
  { num: 1, title: 'Specification',       sub: 'Basic info • I/O • Functional behaviour',               tab: 'architecture', icon: FileText,     color: '#06B6D4' },
  { num: 2, title: 'Logical Diagram',     sub: 'Schematic diagram',                                     tab: 'diagram',      icon: GitBranch,    color: '#8B5CF6' },
  { num: 3, title: 'Logical Verification',sub: 'Logical diagram • Truth tables • Wave forms • ...',     tab: 'verification', icon: Activity,     color: '#10B981' },
  { num: 4, title: 'RTL Design',          sub: 'VHDL • Verilog • SystemVerilog',                        tab: 'rtl',          icon: Code2,        color: '#F59E0B' },
  { num: 5, title: 'RTL Verification',    sub: 'Test benches',                                          tab: 'testbench',    icon: ShieldCheck,  color: '#EF4444' },
  { num: 6, title: 'Logic Synthesis',     sub: 'CMOS logic ckt',                                        tab: 'cmos',         icon: Zap,          color: '#FBBF24' },
  { num: 7, title: 'DFT Verification',    sub: 'Test patterns',                                         tab: 'truthtable',   icon: CheckCircle2, color: '#34D399' },
];

const backEndFlows: FlowItem[] = [
  { num: 1, title: 'Floorplan',                  sub: 'Die area • Core aspect ratio • I/O pad rings',    tab: 'floorplan',  icon: Box,           color: '#06B6D4' },
  { num: 2, title: 'Power Plan',                 sub: 'Power rings • Straps • VDD/VSS PDN mesh',         tab: 'powerplan',  icon: Flame,         color: '#F59E0B' },
  { num: 3, title: 'Placement',                  sub: 'Standard cell placement • Legalization • Density',tab: 'pin',        icon: LayoutGrid,    color: '#10B981' },
  { num: 4, title: 'Clock Tree Synthesis (CTS)', sub: 'CTS H-Tree mesh • Skew & latency minimization',   tab: 'waveform',   icon: GitBranch,     color: '#06B6D4' },
  { num: 5, title: 'Routing',                    sub: 'Global & detailed routing • Metal layers M1–M6',  tab: 'schematic',  icon: Layers,        color: '#8B5CF6' },
  { num: 6, title: 'Static Timing Analysis (STA)', sub: 'Setup & hold slack • Critical path • Timing signoff', tab: 'sta',     icon: Clock,         color: '#10B981' },
  { num: 7, title: 'Sign-off Stage',             sub: 'DRC • LVS • ERC • Antenna • GDSII stream-out',    tab: 'signoff',    icon: CheckCircle2,  color: '#3B82F6' },
];

/* ─── Section ─── */
function Section({
  title, flows, activeTab, onFlowClick,
}: {
  title: string;
  flows: FlowItem[];
  activeTab: AppTab;
  onFlowClick: (tab: AppTab) => void;
}) {
  return (
    <div
      style={{
        border: '1px solid rgba(16,185,129,0.22)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(16,185,129,0.02)',
      }}
    >
      {/* Section heading */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.55rem 1rem',
          borderBottom: '1px solid rgba(16,185,129,0.15)',
        }}
      >
        <span style={{ color: '#10B981', fontSize: '1.05rem', fontFamily: 'monospace', lineHeight: 1 }}>{'{'}</span>
        <span
          style={{
            color: '#10B981',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
          }}
        >
          {title}
        </span>
      </div>

      {/* Flow rows */}
      {flows.map((flow, idx) => {
        const Icon = flow.icon as any;
        const isActive = activeTab === flow.tab;
        return (
          <button
            key={idx}
            onClick={() => onFlowClick(flow.tab)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.7rem 1rem',
              background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
              border: 'none',
              borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <Icon size={17} color={flow.color} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: isActive ? '#F8FAFC' : '#CBD5E1',
                  fontSize: '0.83rem',
                  fontWeight: isActive ? 600 : 500,
                  marginBottom: 2,
                }}
              >
                {flow.num}. {flow.title}
              </div>
              <div
                style={{
                  color: '#475569',
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {flow.sub}
              </div>
            </div>
            <ArrowRight size={14} color={isActive ? '#10B981' : '#334155'} style={{ flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main Drawer ─── */
export function Sidebar({
  isOpen,
  onClose,
  onSelectFlow,
  activeTab,
  onGenerateRtl,
  isGenerating,
  onDesignChip,
  isDesigning,
}: SidebarProps) {
  const [prompt, setPrompt] = useState('');
  const [parameters, setParameters] = useState<{ name: string; value: string }[]>([]);

  const handleAddParameter = () => setParameters([...parameters, { name: '', value: '' }]);
  const handleUpdateParam = (i: number, field: 'name' | 'value', val: string) => {
    const p = [...parameters];
    p[i][field] = val;
    setParameters(p);
  };
  const handleRemoveParam = (i: number) => setParameters(parameters.filter((_, idx) => idx !== i));

  const buildPrompt = (custom?: string) => {
    let fp = custom !== undefined ? custom : prompt;
    const valid = parameters.filter((p) => p.name.trim());
    if (valid.length) {
      fp += '\n\nPlease include the following module parameters:\n';
      valid.forEach((p) => (fp += `- ${p.name}: ${p.value || 'default'}\n`));
    }
    return fp;
  };

  const handleSelectPreset = (item: string) => {
    setPrompt(item);
    onGenerateRtl(buildPrompt(item));
    onClose();
  };

  const handleFlowClick = (tab: AppTab) => {
    onSelectFlow(tab);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="anim-fade-in"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          width: 360,
          maxWidth: '90vw',
          background: '#0B0F19',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(.22,1,.36,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Drawer Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.125rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              className="pulse-glow"
              style={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg,#064E3B,#065F46)',
                borderRadius: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={19} color="#10B981" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.9rem' }}>
                Front End &amp; Back End Flow
              </div>
              <div style={{ color: '#475569', fontSize: '0.68rem', marginTop: 1 }}>
                VLSI EDA ASIC &amp; Physical Design Pipeline
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: '#64748B',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 0.875rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Front End section */}
          <Section
            title="FRONT END PART"
            flows={frontEndFlows}
            activeTab={activeTab}
            onFlowClick={handleFlowClick}
          />

          {/* Back End section */}
          <Section
            title="BACK END PART"
            flows={backEndFlows}
            activeTab={activeTab}
            onFlowClick={handleFlowClick}
          />

          {/* ── Quick Presets ── */}
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#10B981',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Zap size={12} />
              <span>Quick Generate</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                'AND Gate', 'OR Gate', 'NOT Gate', 'NAND Gate',
                'NOR Gate', 'XOR Gate', 'XNOR Gate', '4-bit Adder',
                '4-bit Counter', '4-to-1 MUX', 'FIFO Buffer', 'D Flip-Flop',
              ].map((g) => (
                <button
                  key={g}
                  onClick={() => handleSelectPreset(g)}
                  style={{
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    background: '#111827',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    padding: '0.45rem 0.75rem',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(16,185,129,0.08)';
                    el.style.borderColor = 'rgba(16,185,129,0.35)';
                    el.style.color = '#10B981';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = '#111827';
                    el.style.borderColor = 'rgba(255,255,255,0.06)';
                    el.style.color = '#94A3B8';
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* ── Module Parameters ── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.6rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Module Parameters
              </div>
              <button
                onClick={handleAddParameter}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.72rem',
                }}
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {parameters.length === 0 ? (
              <div style={{ color: '#334155', fontSize: '0.73rem', fontStyle: 'italic' }}>
                No parameters defined.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parameters.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="NAME (e.g. WIDTH)"
                      value={p.name}
                      onChange={(e) => handleUpdateParam(i, 'name', e.target.value)}
                      style={{
                        flex: 1,
                        background: '#111827',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 7,
                        padding: '5px 10px',
                        fontSize: '0.75rem',
                        color: '#F8FAFC',
                        outline: 'none',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={p.value}
                      onChange={(e) => handleUpdateParam(i, 'value', e.target.value)}
                      style={{
                        width: 70,
                        background: '#111827',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 7,
                        padding: '5px 10px',
                        fontSize: '0.75rem',
                        color: '#F8FAFC',
                        outline: 'none',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    />
                    <button
                      onClick={() => handleRemoveParam(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#475569',
                        cursor: 'pointer',
                        padding: 4,
                        borderRadius: 5,
                        display: 'flex',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Prompt footer ── */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '0.875rem',
            flexShrink: 0,
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (prompt.trim() && !isGenerating && !isDesigning) {
                  onGenerateRtl(buildPrompt());
                  onClose();
                }
              }
            }}
            placeholder="Describe your RTL module..."
            style={{
              width: '100%',
              height: 72,
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '0.6rem 0.875rem',
              fontSize: '0.8rem',
              color: '#F8FAFC',
              outline: 'none',
              resize: 'none',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.55,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => {
                if (prompt.trim() && !isGenerating && !isDesigning) {
                  onGenerateRtl(buildPrompt());
                  onClose();
                }
              }}
              disabled={!prompt.trim() || isGenerating || isDesigning}
              style={{
                flex: 1,
                padding: '0.55rem',
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 9,
                color: '#10B981',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: !prompt.trim() || isGenerating || isDesigning ? 'not-allowed' : 'pointer',
                opacity: !prompt.trim() || isGenerating ? 0.55 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Cpu size={14} />
              {isGenerating ? 'Synthesizing...' : 'Generate RTL'}
            </button>
            <button
              onClick={() => {
                if (prompt.trim() && !isGenerating && !isDesigning) {
                  onDesignChip(buildPrompt());
                  onClose();
                }
              }}
              disabled={!prompt.trim() || isGenerating || isDesigning}
              style={{
                flex: 1,
                padding: '0.55rem',
                background: 'rgba(6,182,212,0.12)',
                border: '1px solid rgba(6,182,212,0.25)',
                borderRadius: 9,
                color: '#06B6D4',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: !prompt.trim() || isGenerating || isDesigning ? 'not-allowed' : 'pointer',
                opacity: !prompt.trim() || isDesigning ? 0.55 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Send size={14} />
              {isDesigning ? 'Designing...' : 'Design Chip'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

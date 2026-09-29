import React, { useState, useEffect, useMemo } from 'react';
import { ChatInterface } from './components/chartinterface';
import { CodeEditor } from './components/CodeEditor';
import { LogicDiagramViewer } from './components/LogicDiagramViewer';
import { WaveformViewer } from './components/WaveformViewer';
import { TruthTableViewer } from './components/TruthTableViewer';
import { DFTVerificationViewer } from './components/DFTVerificationViewer';
import { SpecificationWizard } from './components/SpecificationWizard';
import { LogicalVerificationWorkbench } from './components/LogicalVerificationWorkbench';
import { RtlVerificationWorkbench } from './components/RtlVerificationWorkbench';
import { SchematicViewer, SchematicData } from './components/SchematicViewer';
import { FloorplanViewer } from './components/FloorplanViewer';
import { PowerPlanViewer } from './components/PowerPlanViewer';
import { FloorplanConfig, PowerPlanConfig } from './types/physicalDesign';
import { createDefaultFloorplan, createDefaultPowerPlan } from './utils/physicalDesignEngine';
import { CmosDesignViewer, CmosDesignData } from './components/CmosDesignViewer';
import { ThreeDCircuitViewer, ThreeDChipData } from './components/ThreeDCircuitViewer';
import { PinDiagramViewer, PinDiagramData } from './components/PinDiagramViewer';
import { STAViewer } from './components/STAViewer';
import { SignoffViewer } from './components/SignoffViewer';
import { PlacementViewer } from './components/PlacementViewer';
import { RoutingViewer } from './components/RoutingViewer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CTSViewer } from './components/CTSViewer';
import { SpiceSimulationViewer } from './components/SpiceSimulationViewer';

import {
  Sparkles, X, ArrowRight, Zap, Code2, Activity, ShieldCheck,
  CheckCircle2, FileText, GitBranch, Box, Flame, LayoutGrid,
  Clock, Layers, Package, Monitor, History, ChevronLeft, Menu, ChevronRight
} from 'lucide-react';
import {
  generateRtl, generateTestbench, verifyRtl, generateDiagram,
  designChip, generateWaveform, generateTruthTable, generateSchematicData,
  generateFloorplanData, generatePowerPlanData, generateCmosDesignData,
  generate3DChipData, generatePinDiagramData
} from './services/geminiService';

// â”€â”€â”€ Tab types â”€â”€â”€
type AppTab =
  | 'chat'
  | 'rtl' | 'testbench' | 'truthtable' | 'pin' | 'cmos'
  | 'schematic' | 'threed' | 'floorplan' | 'powerplan'
  | 'waveform' | 'diagram' | 'verification' | 'architecture'
  | 'sta' | 'signoff' | 'placement' | 'routing' | 'cts' | 'spice';

// â”€â”€â”€ Flow items â”€â”€â”€
interface FlowItem {
  num: number; title: string; sub: string;
  tab: AppTab; icon: React.ElementType; color: string;
}

const frontEndFlows: FlowItem[] = [
  { num: 1, title: 'Specification',        sub: 'Basic info â€¢ I/O â€¢ Functional behaviour',           tab: 'architecture', icon: FileText,     color: '#06B6D4' },
  { num: 2, title: 'Logical Diagram',      sub: 'Schematic diagram',                                tab: 'diagram',      icon: GitBranch,    color: '#8B5CF6' },
  { num: 3, title: 'Logical Verification', sub: 'Logical diagram â€¢ Truth tables â€¢ Wave forms â€¢ ...', tab: 'verification', icon: Activity,     color: '#10B981' },
  { num: 4, title: 'RTL Design',           sub: 'VHDL â€¢ Verilog â€¢ SystemVerilog',                   tab: 'rtl',          icon: Code2,        color: '#F59E0B' },
  { num: 5, title: 'RTL Verification',     sub: 'Test benches',                                     tab: 'testbench',    icon: ShieldCheck,  color: '#EF4444' },
  { num: 6, title: 'Logic Synthesis',      sub: 'CMOS logic ckt',                                   tab: 'cmos',         icon: Zap,          color: '#FBBF24' },
  { num: 7, title: 'DFT Verification',     sub: 'Test patterns',                                    tab: 'truthtable',   icon: CheckCircle2, color: '#34D399' },
  { num: 8, title: 'SPICE Simulation',     sub: 'LTspice netlist & execution',                      tab: 'spice',        icon: Activity,     color: '#EF4444' },
];

const backEndFlows: FlowItem[] = [
  { num: 1, title: 'Floorplan',                  sub: 'Die area â€¢ Core aspect ratio â€¢ I/O pad rings',     tab: 'floorplan',  icon: Box,           color: '#06B6D4' },
  { num: 2, title: 'Power Plan',                 sub: 'Power rings â€¢ Straps â€¢ VDD/VSS PDN mesh',          tab: 'powerplan',  icon: Flame,         color: '#F59E0B' },
  { num: 3, title: 'Placement',                  sub: 'Standard cell placement â€¢ Legalization â€¢ Density', tab: 'placement',  icon: LayoutGrid,    color: '#10B981' },
  { num: 4, title: 'Clock Tree Synthesis (CTS)', sub: 'CTS H-Tree mesh â€¢ Skew & latency minimization',   tab: 'cts',        icon: GitBranch,     color: '#06B6D4' },
  { num: 5, title: 'Routing',                    sub: 'Global & detailed routing â€¢ Metal layers M1â€“M6',  tab: 'routing',    icon: Layers,        color: '#8B5CF6' },
  { num: 6, title: 'Static Timing Analysis (STA)', sub: 'Setup & hold slack â€¢ Critical path â€¢ Timing signoff', tab: 'sta',     icon: Clock,         color: '#10B981' },
  { num: 7, title: 'Sign-off Stage',             sub: 'DRC â€¢ LVS â€¢ ERC â€¢ Antenna â€¢ GDSII stream-out',    tab: 'signoff',    icon: CheckCircle2,  color: '#3B82F6' },
];

// â”€â”€â”€ Sidebar Drawer â”€â”€â”€
function SidebarDrawer({
  isOpen, onClose, activeTab, onSelectTab,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}) {
  const handleClick = (tab: AppTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
          }}
        />
      )}

      <div
        style={{
          position: 'fixed', top: 0, left: 0,
          height: '100%', width: 224,
          background: '#111215',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(.22,1,.36,1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.875rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg,#064E3B,#065F46)',
              borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={16} color="#10B981" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.8rem' }}>Front End &amp; Back End Flow</div>
              <div style={{ color: '#475569', fontSize: '0.62rem' }}>VLSI EDA ASIC &amp; Physical Design Pipeline</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7, color: '#64748B', cursor: 'pointer', padding: 5,
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>

          {/* â”€â”€ Main Screen item â”€â”€ */}
          <NavItem
            icon={<Monitor size={15} color="#10B981" />}
            label="Main Screen (Design Board & Assistant)"
            sub="Interactive Pipeline & Prompt Bar"
            isActive={activeTab === 'chat'}
            badge={null}
            accentColor="#10B981"
            onClick={() => handleClick('chat')}
          />

          {/* â”€â”€ History item â”€â”€ */}
          <NavItem
            icon={<History size={15} color="#F59E0B" />}
            label="Usage & Prompt History"
            sub="Past prompts, components & queries"
            isActive={false}
            badge="Log"
            accentColor="#F59E0B"
            onClick={() => handleClick('chat')}
          />

          {/* â”€â”€ Divider â”€â”€ */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0.5rem 0' }} />

          {/* â”€â”€ Front End Part â”€â”€ */}
          <SectionHeader label="FRONT END PART" />
          <div style={{
            margin: '0 0.75rem 0.5rem',
            border: '1px solid rgba(16,185,129,0.22)',
            borderRadius: 10, overflow: 'hidden',
            background: 'rgba(16,185,129,0.02)',
          }}>
            {frontEndFlows.map((flow, idx) => (
              <FlowRow
                key={idx}
                flow={flow}
                isActive={activeTab === flow.tab}
                isFirst={idx === 0}
                onClick={() => handleClick(flow.tab)}
              />
            ))}
          </div>

          {/* â”€â”€ Back End Part â”€â”€ */}
          <SectionHeader label="BACK END PART" />
          <div style={{
            margin: '0 0.75rem 0.75rem',
            border: '1px solid rgba(16,185,129,0.22)',
            borderRadius: 10, overflow: 'hidden',
            background: 'rgba(16,185,129,0.02)',
          }}>
            {backEndFlows.map((flow, idx) => (
              <FlowRow
                key={idx}
                flow={flow}
                isActive={activeTab === flow.tab}
                isFirst={idx === 0}
                onClick={() => handleClick(flow.tab)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function NavItem({ icon, label, sub, isActive, badge, accentColor, onClick }: {
  icon: React.ReactNode; label: string; sub: string;
  isActive: boolean; badge: string | null; accentColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.65rem 1rem',
        background: isActive ? `${accentColor}14` : 'transparent',
        border: 'none',
        borderLeft: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: isActive ? '#F8FAFC' : '#CBD5E1', fontSize: '0.78rem',
          fontWeight: isActive ? 600 : 500,
          display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap',
        }}>
          <span style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>{label}</span>
          {badge && (
            <span style={{
              fontSize: '0.62rem', fontWeight: 700,
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#F59E0B', padding: '1px 6px', borderRadius: 10, flexShrink: 0,
            }}>{badge}</span>
          )}
        </div>
        <div style={{ color: '#475569', fontSize: '0.68rem', marginTop: 1, lineHeight: 1.3 }}>{sub}</div>
      </div>
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.4rem 1rem 0.3rem',
    }}>
      <span style={{ color: '#10B981', fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: 1 }}>{`{`}</span>
      <span style={{ color: '#10B981', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>{label}</span>
    </div>
  );
}

function FlowRow({ flow, isActive, isFirst, onClick }: {
  flow: FlowItem; isActive: boolean; isFirst: boolean; onClick: () => void;
}) {
  const Icon = flow.icon as any;
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.7rem',
        padding: '0.6rem 0.875rem',
        background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
        border: 'none',
        borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon size={14} color={flow.color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: isActive ? '#F8FAFC' : '#CBD5E1', fontSize: '0.78rem', fontWeight: isActive ? 600 : 400, marginBottom: 1 }}>
          {flow.num}. {flow.title}
        </div>
        <div style={{ color: '#475569', fontSize: '0.67rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {flow.sub}
        </div>
      </div>
      <ArrowRight size={12} color={isActive ? '#10B981' : '#334155'} style={{ flexShrink: 0 }} />
    </button>
  );
}

// â”€â”€â”€ Design View Tab bar â”€â”€â”€
const TAB_LABELS: Partial<Record<AppTab, string>> = {
  rtl: 'RTL Design', testbench: 'Testbench', truthtable: 'DFT Verification',
  pin: 'Placement', cmos: 'Logic Synthesis', schematic: 'Routing',
  threed: '3D Silicon Stack', floorplan: 'Floorplan', powerplan: 'Power Plan',
  waveform: 'CTS / Waveform', diagram: 'Logical Diagram', verification: 'Logical Verification',
  architecture: 'Specification', spice: 'SPICE Simulation',
};

// â”€â”€â”€ Main App â”€â”€â”€
export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeIcId, setActiveIcId] = useState<string | undefined>();
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [returnTab, setReturnTab] = useState<AppTab | null>(null);

  // Multi-Language RTL states
  const [selectedRtlLang, setSelectedRtlLang] = useState<'verilog' | 'systemverilog' | 'vhdl'>('verilog');
  const [rtlVerilog, setRtlVerilog] = useState(`// 4-bit Arithmetic Logic Unit (Verilog)
module alu_4bit (
    input  wire [3:0] A,
    input  wire [3:0] B,
    input  wire [1:0] ALU_Sel,
    output reg  [3:0] ALU_Out,
    output reg        CarryOut
);
    always @(*) begin
        case (ALU_Sel)
            2'b00: {CarryOut, ALU_Out} = A + B;
            2'b01: {CarryOut, ALU_Out} = A - B;
            2'b10: begin ALU_Out = A & B; CarryOut = 0; end
            2'b11: begin ALU_Out = A | B; CarryOut = 0; end
            default: begin ALU_Out = 4'b0000; CarryOut = 0; end
        endcase
    end
endmodule`);

  const [rtlSystemVerilog, setRtlSystemVerilog] = useState(`// 4-bit Arithmetic Logic Unit (SystemVerilog)
module alu_4bit (
    input  logic [3:0] A,
    input  logic [3:0] B,
    input  logic [1:0] ALU_Sel,
    output logic [3:0] ALU_Out,
    output logic       CarryOut
);
    always_comb begin
        case (ALU_Sel)
            2'b00: {CarryOut, ALU_Out} = A + B;
            2'b01: {CarryOut, ALU_Out} = A - B;
            2'b10: begin ALU_Out = A & B; CarryOut = 1'b0; end
            2'b11: begin ALU_Out = A | B; CarryOut = 1'b0; end
            default: begin ALU_Out = 4'b0000; CarryOut = 1'b0; end
        endcase
    end
endmodule`);

  const [rtlVhdl, setRtlVhdl] = useState(`-- 4-Bit Arithmetic Logic Unit (ALU) - VHDL
library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
use IEEE.STD_LOGIC_UNSIGNED.ALL;

entity alu_4bit is
    Port ( A        : in  STD_LOGIC_VECTOR (3 downto 0);
           B        : in  STD_LOGIC_VECTOR (3 downto 0);
           ALU_Sel  : in  STD_LOGIC_VECTOR (1 downto 0);
           ALU_Out  : out STD_LOGIC_VECTOR (3 downto 0);
           CarryOut : out STD_LOGIC);
end alu_4bit;

architecture Behavioral of alu_4bit is
    signal result : STD_LOGIC_VECTOR (4 downto 0);
begin
    process(A, B, ALU_Sel)
    begin
        case ALU_Sel is
            when "00" => result <= ('0' & A) + ('0' & B);
            when "01" => result <= ('0' & A) - ('0' & B);
            when "10" => result <= '0' & (A and B);
            when "11" => result <= '0' & (A or B);
            when others => result <= (others => '0');
        end case;
    end process;
    ALU_Out  <= result(3 downto 0);
    CarryOut <= result(4);
end Behavioral;`);

  // Active RTL code helper
  const activeRtlCode = selectedRtlLang === 'vhdl' ? rtlVhdl : selectedRtlLang === 'systemverilog' ? rtlSystemVerilog : rtlVerilog;
  const setRtlCode = (code: string) => {
    if (selectedRtlLang === 'vhdl') setRtlVhdl(code);
    else if (selectedRtlLang === 'systemverilog') setRtlSystemVerilog(code);
    else setRtlVerilog(code);
  };

  const [testbenchCode, setTestbenchCode] = useState('// Generate testbench from RTL');
  const [verificationReport, setVerificationReport] = useState('No report generated yet.');
  const [diagramData, setDiagramData] = useState<any>(null);
  const [waveformData, setWaveformData] = useState<any>(null);
  const [truthTableData, setTruthTableData] = useState<any>(null);
  const [architectureDoc, setArchitectureDoc] = useState('No architecture designed yet.');
  const [schematicData, setSchematicData] = useState<SchematicData | null>(null);
  const [floorplanData, setFloorplanData] = useState<FloorplanConfig | null>(null);
  const [powerPlanData, setPowerPlanData] = useState<PowerPlanConfig | null>(null);
  const [cmosData, setCmosData] = useState<CmosDesignData | null>(null);
  const [threeDData, setThreeDData] = useState<ThreeDChipData | null>(null);
  const [pinDiagramData, setPinDiagramData] = useState<PinDiagramData | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');

  // Loading flags
  const [isGeneratingRtl, setIsGeneratingRtl] = useState(false);
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [isGeneratingCmos, setIsGeneratingCmos] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // â”€â”€â”€ RTL generation â”€â”€â”€
  const handleGenerateRtl = async (description: string) => {
    setLastPrompt(description);
    setIsGeneratingRtl(true);
    setActiveTab('rtl');
    try {
      const vCode = await generateRtl(description, 'verilog');
      const svCode = await generateRtl(description, 'systemverilog');
      const vhdlCode = await generateRtl(description, 'vhdl');

      if (vCode) setRtlVerilog(vCode);
      if (svCode) setRtlSystemVerilog(svCode);
      if (vhdlCode) setRtlVhdl(vhdlCode);

      const code = vCode || svCode || vhdlCode;
      if (!code) return;
      generateTestbench(code).then(tb => { if (tb) { setTestbenchCode(tb); generateWaveform(code, tb).then(wf => wf && setWaveformData(wf)); } });
      generateDiagram(code, description).then(d => d && setDiagramData(d));
      generateTruthTable(code).then(tt => tt && setTruthTableData(tt));
      verifyRtl(code).then(r => r && setVerificationReport(r));
      designChip(description || code).then(doc => doc && setArchitectureDoc(doc));
      generateSchematicData(code).then(s => s && setSchematicData(s));
      generateFloorplanData(code).then(fp => fp && setFloorplanData(fp));
      generatePowerPlanData(code).then(pp => pp && setPowerPlanData(pp));
      setIsGeneratingCmos(true);
      generateCmosDesignData(code, description).then(cm => { cm && setCmosData(cm); setIsGeneratingCmos(false); });
      generate3DChipData(code).then(td => td && setThreeDData(td));
      generatePinDiagramData(code).then(pd => pd && setPinDiagramData(pd));
    } catch (e) { console.error(e); }
    finally { setIsGeneratingRtl(false); }
  };

  // â”€â”€â”€ Tab navigation â”€â”€â”€
  const handleNavigateToTab = (tabId: string, nodeId?: string) => {
    if (tabId === 'diagram' && nodeId && activeTab === 'verification') {
      setReturnTab('verification');
    } else {
      setReturnTab(null);
    }
    setActiveTab(tabId as AppTab);
    if (nodeId) {
      setHighlightedNodeId(nodeId);
    } else if (tabId !== 'diagram' && tabId !== 'verification') {
      setHighlightedNodeId(null);
    }
    if (tabId === 'chat') return;
    if (!activeRtlCode || activeRtlCode.trim() === '') return;
    if (tabId === 'diagram')     { 
      setIsGeneratingDiagram(true); 
      generateDiagram(activeRtlCode).then(d => { d && setDiagramData(d); setIsGeneratingDiagram(false); }); 
      generateTruthTable(activeRtlCode).then(tt => tt && setTruthTableData(tt));
    }
    if (tabId === 'truthtable')  generateTruthTable(activeRtlCode).then(tt => tt && setTruthTableData(tt));
    if (tabId === 'pin')         { setIsGeneratingPin(true); generatePinDiagramData(activeRtlCode).then(d => { d && setPinDiagramData(d); setIsGeneratingPin(false); }); }
    if (tabId === 'verification'){ setIsVerifying(true); verifyRtl(activeRtlCode).then(r => { r && setVerificationReport(r); setIsVerifying(false); }); }
    if (tabId === 'cmos')        { setIsGeneratingCmos(true); generateCmosDesignData(activeRtlCode, lastPrompt).then(cm => { cm && setCmosData(cm); setIsGeneratingCmos(false); }); }
    if (tabId === 'schematic')   generateSchematicData(activeRtlCode).then(s => s && setSchematicData(s));
    if (tabId === 'floorplan')   generateFloorplanData(activeRtlCode).then(fp => fp && setFloorplanData(fp));
    if (tabId === 'powerplan')   generatePowerPlanData(activeRtlCode).then(pp => pp && setPowerPlanData(pp));
    if (tabId === 'threed')      generate3DChipData(activeRtlCode).then(td => td && setThreeDData(td));
  };

  useEffect(() => {
    if (!activeRtlCode || activeRtlCode.trim() === '' || activeTab === 'chat') return;
    
    if (activeTab === 'diagram') {
      generateDiagram(activeRtlCode).then(d => d && setDiagramData(d));
      generateTruthTable(activeRtlCode).then(tt => tt && setTruthTableData(tt));
    }
    else if (activeTab === 'truthtable') generateTruthTable(activeRtlCode).then(tt => tt && setTruthTableData(tt));
    else if (activeTab === 'pin') generatePinDiagramData(activeRtlCode).then(d => d && setPinDiagramData(d));
    else if (activeTab === 'cmos') { setIsGeneratingCmos(true); generateCmosDesignData(activeRtlCode).then(cm => { cm && setCmosData(cm); setIsGeneratingCmos(false); }); }
    else if (activeTab === 'schematic') generateSchematicData(activeRtlCode).then(s => s && setSchematicData(s));
    else if (activeTab === 'floorplan') generateFloorplanData(activeRtlCode).then(fp => fp && setFloorplanData(fp));
    else if (activeTab === 'powerplan') generatePowerPlanData(activeRtlCode).then(pp => pp && setPowerPlanData(pp));
    else if (activeTab === 'threed') generate3DChipData(activeRtlCode).then(td => td && setThreeDData(td));
    // Testbench and verification tabs fetch their own data or have separate generation triggers
  }, [activeRtlCode, activeTab]);

  const isDesignTab = activeTab !== 'chat';

  const allFlows = [...frontEndFlows, ...backEndFlows];
  const currentFlowIndex = allFlows.findIndex(f => f.tab === activeTab);
  const prevFlow = currentFlowIndex > 0 ? allFlows[currentFlowIndex - 1] : null;
  const nextFlow = currentFlowIndex >= 0 && currentFlowIndex < allFlows.length - 1 ? allFlows[currentFlowIndex + 1] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0B0F19', color: '#F8FAFC', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>

      {/* â”€â”€ Slides & Tools Drawer â”€â”€ */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={handleNavigateToTab as any}
      />

      {activeTab === 'chat' && (
        <ChatInterface
          onToggleSidebar={() => setIsDrawerOpen(true)}
          onNavigateToTab={handleNavigateToTab}
          onOpenStudio={() => setActiveTab('rtl')}
          onLoadRtlCode={(code, originalPrompt) => { setRtlCode(code); if (originalPrompt) setLastPrompt(originalPrompt); }}
          currentRtlCode={activeRtlCode.startsWith('//') ? undefined : activeRtlCode}
          activeIcId={activeIcId}
          onSelectComponent={setActiveIcId}
        />
      )}

      {/* â”€â”€ DESIGN VIEW â”€â”€ */}
      {isDesignTab && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Design tab bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0 1rem', height: 48,
            background: '#0D1117',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0, overflowX: 'auto',
          }}>
            {/* Slides & Tools Drawer Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.75rem', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#F8FAFC', fontSize: '0.76rem', fontWeight: 500, cursor: 'pointer',
                flexShrink: 0, fontFamily: 'Inter, sans-serif',
              }}
              title="Open Navigation Menu (Slides & Tools)"
            >
              <Menu size={16} color="#10B981" />
              <span>Slides &amp; Tools</span>
            </button>

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

            {/* Flow tabs */}
            {[...frontEndFlows, ...backEndFlows].map((flow) => {
              const isActive = activeTab === flow.tab;
              if (!isActive) return null;
              return (
                <div key={flow.tab} style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.3rem 0.8rem', borderRadius: 7,
                  background: `${flow.color}18`,
                  border: `1px solid ${flow.color}35`,
                  color: flow.color, fontSize: '0.77rem', fontWeight: 600,
                }}>
                  {React.createElement(flow.icon as any, { size: 13 })}
                  <span>{flow.title}</span>
                </div>
              );
            })}


            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isGeneratingRtl && (
                <span style={{
                  fontSize: '0.72rem', color: '#10B981',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 20, padding: '2px 10px', flexShrink: 0,
                }}>
                  âŸ³ Synthesizing...
                </span>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  disabled={!prevFlow}
                  onClick={() => prevFlow && handleNavigateToTab(prevFlow.tab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.35rem 0.6rem', borderRadius: 6,
                    background: prevFlow ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: '1px solid',
                    borderColor: prevFlow ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: prevFlow ? '#F8FAFC' : '#475569',
                    cursor: prevFlow ? 'pointer' : 'default',
                    fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.2s'
                  }}
                  title={prevFlow ? `Previous: ${prevFlow.title}` : undefined}
                >
                  <ChevronLeft size={14} />
                  <span>Prev Stage</span>
                </button>

                <button
                  disabled={!nextFlow}
                  onClick={() => nextFlow && handleNavigateToTab(nextFlow.tab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.35rem 0.6rem', borderRadius: 6,
                    background: nextFlow ? '#10B981' : 'transparent',
                    border: '1px solid',
                    borderColor: nextFlow ? '#10B981' : 'transparent',
                    color: nextFlow ? '#022C22' : '#475569',
                    cursor: nextFlow ? 'pointer' : 'default',
                    fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s'
                  }}
                  title={nextFlow ? `Next: ${nextFlow.title}` : undefined}
                >
                  <span>Next Stage</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Viewer */}
          <div style={{ flex: 1, overflow: 'hidden', background: '#0B0F19' }}>
            <ErrorBoundary>
            {activeTab === 'rtl'          && (
              <CodeEditor 
                code={activeRtlCode} 
                onChange={setRtlCode} 
                language={selectedRtlLang}
                selectedLanguage={selectedRtlLang}
                onLanguageChange={setSelectedRtlLang}
                onGenerateRtl={handleGenerateRtl}
                isGenerating={isGeneratingRtl}
              />
            )}
            {activeTab === 'testbench'    && <RtlVerificationWorkbench rtlCode={activeRtlCode} onNavigateToTab={handleNavigateToTab} />}
            {activeTab === 'truthtable'   && <DFTVerificationViewer activeIcId={activeIcId} activeQuestion={lastPrompt} onUpdateActiveQuestion={setLastPrompt} />}
            {activeTab === 'pin'          && <PinDiagramViewer data={pinDiagramData} onGenerate={() => { setIsGeneratingPin(true); generatePinDiagramData(activeRtlCode).then(d => { d && setPinDiagramData(d); setIsGeneratingPin(false); }); }} isGenerating={isGeneratingPin} />}
            {activeTab === 'diagram'      && <LogicDiagramViewer data={diagramData} truthTableData={truthTableData} highlightedNodeId={highlightedNodeId} onReturnTab={returnTab ? () => handleNavigateToTab(returnTab) : undefined} onGenerate={() => { setIsGeneratingDiagram(true); generateDiagram(activeRtlCode, lastPrompt).then(d => { d && setDiagramData(d); setIsGeneratingDiagram(false); }); generateTruthTable(activeRtlCode).then(tt => tt && setTruthTableData(tt)); }} isGenerating={isGeneratingDiagram} />}
            {activeTab === 'waveform'     && <WaveformViewer data={waveformData} />}
            {activeTab === 'cts'          && <CTSViewer />}
            {activeTab === 'schematic'    && <SchematicViewer data={schematicData} />}
            {activeTab === 'cmos'         && <CmosDesignViewer data={cmosData} isGenerating={isGeneratingCmos} onGenerate={() => { setIsGeneratingCmos(true); generateCmosDesignData(activeRtlCode || '', lastPrompt).then(cm => { cm && setCmosData(cm); setIsGeneratingCmos(false); }); }} />}
            {activeTab === 'floorplan'    && <FloorplanViewer config={floorplanData ?? createDefaultFloorplan(activeRtlCode || '', activeIcId)} onChangeConfig={setFloorplanData} onResetToRtl={() => { if (activeRtlCode && !activeRtlCode.startsWith('//')) generateFloorplanData(activeRtlCode).then(fp => fp && setFloorplanData(fp)); }} />}
            {activeTab === 'powerplan'    && <PowerPlanViewer floorplan={floorplanData ?? createDefaultFloorplan(activeRtlCode || '', activeIcId)} powerPlan={powerPlanData ?? createDefaultPowerPlan()} onChangePowerPlan={setPowerPlanData} />}
            {activeTab === 'threed'       && <ThreeDCircuitViewer data={threeDData} />}
            {activeTab === 'verification' && <LogicalVerificationWorkbench activeIcId={activeIcId} highlightedNodeId={highlightedNodeId} onNavigateToTab={handleNavigateToTab} onSelectCircuit={setActiveIcId} />}
            {activeTab === 'architecture' && <SpecificationWizard activeIcId={activeIcId} onGenerateRtl={handleGenerateRtl} />}
            {activeTab === 'placement'    && <PlacementViewer activeIcId={activeIcId} activeComponentName="SN7476 Dual J-K Flip-Flop" onNavigateToNextStage={() => handleNavigateToTab('routing')} />}
            {activeTab === 'routing'      && <RoutingViewer />}
            {activeTab === 'sta'          && <STAViewer />}
            {activeTab === 'signoff'      && <SignoffViewer activeIcId={activeIcId} onNavigateToFirstStage={() => handleNavigateToTab('chat')} />}
            {activeTab === 'spice'        && <SpiceSimulationViewer />}
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
}

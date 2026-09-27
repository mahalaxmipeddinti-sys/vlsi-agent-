import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Menu, 
  Sparkles, 
  ArrowUp, 
  SquarePen, 
  Copy, 
  Check, 
  Cpu, 
  Code2, 
  ArrowRight,
  RefreshCw,
  Info,
  Edit3,
  X,
  History
} from 'lucide-react';
import { askVlsiAssistant, getLocalRtl } from '../services/geminiService';
import { findMatchingIC, getComponentClassification, ComponentClassification } from '../utils/specFormatter';
import { saveHistoryItem } from '../utils/historyStore';
import { HistoryViewer } from './HistoryViewer';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  componentMeta?: {
    id: string;
    name: string;
    typeName: string;
    pkg: string;
  };
  actionSuggestion?: {
    type: 'open_tab';
    tab: string;
    label: string;
  };
}

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  onNavigateToTab: (tabId: string) => void;
  onOpenStudio?: () => void;
  onLoadRtlCode?: (code: string, originalPrompt?: string) => void;
  currentRtlCode?: string;
  activeIcId?: string;
  activeComponentName?: string;
  activeComponentType?: string;
  onSelectComponent?: (componentId: string) => void;
}

export function getTimeGreeting(): { greeting: string; period: string; icon: string } {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) {
    return { greeting: 'Good morning', period: 'morning', icon: '🌅' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good afternoon', period: 'afternoon', icon: '☀️' };
  } else if (hour >= 17 && hour < 22) {
    return { greeting: 'Good evening', period: 'evening', icon: '🌆' };
  } else {
    return { greeting: 'Good evening', period: 'night', icon: '🌙' };
  }
}

export function ChatInterface({ 
  onToggleSidebar, 
  onNavigateToTab, 
  onOpenStudio,
  onLoadRtlCode, 
  currentRtlCode,
  activeIcId,
  activeComponentName,
  activeComponentType,
  onSelectComponent
}: ChatInterfaceProps) {
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('vlsi_user_name') || 'Sridher';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const timeInfo = getTimeGreeting();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveName = () => {
    const trimmed = tempName.trim() || 'Sridher';
    setUserName(trimmed);
    localStorage.setItem('vlsi_user_name', trimmed);
    setIsEditingName(false);
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('vlsi_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [inputValue, setInputValue] = useState<string>(() => {
    try {
      return localStorage.getItem('vlsi_input_draft') || '';
    } catch {
      return '';
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Persist messages so they are never lost on slide change or navigation
  useEffect(() => {
    try {
      localStorage.setItem('vlsi_chat_messages', JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages]);

  // Persist draft input so user text stays as per user need
  useEffect(() => {
    try {
      localStorage.setItem('vlsi_input_draft', inputValue);
    } catch (e) {
      console.error(e);
    }
  }, [inputValue]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real-time component detection as user types
  const detectedComponent = useMemo(() => {
    if (!inputValue || inputValue.trim().length < 2) return null;
    const match = findMatchingIC(inputValue);
    if (match) {
      return getComponentClassification(match.IC);
    }
    const classification = getComponentClassification(inputValue);
    if (classification.logicClass !== 'Custom Digital Logic' || /74\d+|jk|flip|adder|nand|nor|not|inv|alu|mux|decoder/i.test(inputValue)) {
      return classification;
    }
    return null;
  }, [inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputValue]);

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || inputValue.trim();
    if (!textToSend || isLoading) return;

    // Detect if this prompt asks about an IC or digital component
    const match = findMatchingIC(textToSend);
    const classification = match ? getComponentClassification(match.IC) : getComponentClassification(textToSend);
    const isComponentQuery = !!match || classification.logicClass !== 'Custom Digital Logic' || /74\d+|jk|flip|adder|nand|nor|not|inv|alu|mux|decoder/i.test(textToSend);

    // Synchronize across all 7 stages if component query detected
    if (isComponentQuery && onSelectComponent) {
      onSelectComponent(textToSend);
    }

    // Record in History store for tracking what is being used
    saveHistoryItem({
      query: textToSend,
      componentName: match ? `SN${match.IC} ${match.name}` : classification.name,
      componentType: classification.typeName,
      icId: classification.id,
      sourceStage: 'Main Screen'
    });

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        content: m.content
      }));

      const res = await askVlsiAssistant(textToSend, history, { 
        currentRtl: currentRtlCode,
        userName: userName,
        timeGreeting: timeInfo.greeting
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.text,
        timestamp: new Date(),
        actionSuggestion: res.actionSuggestion,
        componentMeta: isComponentQuery ? {
          id: classification.id,
          name: classification.name,
          typeName: classification.typeName,
          pkg: classification.pkg
        } : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-update the RTL code in the background so that if the user clicks 
      // "Logical Diagram" or other 7-stage buttons, they get the new circuit!
      if (onLoadRtlCode && isComponentQuery) {
        const extracted = extractCodeBlock(res.text);
        if (extracted) {
          onLoadRtlCode(extracted, textToSend);
        } else {
          // If no code block was generated, fallback to the local RTL synthesizer
          onLoadRtlCode(getLocalRtl(textToSend), textToSend);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Apologies ${userName}, I encountered an issue generating a response. Please try asking again or open a slide from the menu.`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue('');
    try {
      localStorage.removeItem('vlsi_chat_messages');
      localStorage.removeItem('vlsi_input_draft');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Extract Verilog blocks for quick editor loading
  const extractCodeBlock = (content: string) => {
    const match = content.match(/```(?:verilog|v)?\s*([\s\S]*?)```/i);
    return match ? match[1].trim() : null;
  };

  return (
    <div className="flex flex-col h-full bg-[#18191d] text-gray-100 relative">
      {/* Top Header */}
      <header className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-[#151619]/90 backdrop-blur z-20 shrink-0">
        <div className="flex items-center space-x-3">
          {/* The three-bar button requested by user */}
          <button
            onClick={onToggleSidebar}
            id="chat-top-menu-bar-btn"
            className="px-2.5 py-1.5 text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg transition-all flex items-center space-x-2 shadow-sm group"
            title="Open Menu (Tap to open all slides & tools)"
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} className="text-emerald-400 group-hover:text-emerald-300" />
            <span className="text-xs font-medium text-gray-300 group-hover:text-white hidden sm:inline">Slides & Tools</span>
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-gray-100 flex items-center space-x-2">
                <span>VLSI Studio</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  v2.5
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Greeting Pill */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 shadow-sm">
          <span className="text-sm">{timeInfo.icon}</span>
          <span className="text-gray-400">{timeInfo.greeting},</span>
          <span className="text-emerald-400 font-semibold">{userName}</span>
        </div>

        {/* Right Actions: VLSI Studio, History & New Chat */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (onOpenStudio) onOpenStudio();
              else onNavigateToTab('rtl');
            }}
            id="main-screen-vlsi-studio-btn"
            className="px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 rounded-lg transition-all flex items-center space-x-1.5 shadow-sm group"
            title="Open VLSI Studio (Hardware EDA Workspace)"
          >
            <Cpu size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>⚡ VLSI Studio</span>
          </button>

          {/* History Tab Button */}
          <button
            onClick={() => setIsHistoryDrawerOpen(true)}
            id="chat-history-btn"
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors flex items-center space-x-1.5"
            title="Open Usage & Prompt History"
          >
            <History size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors flex items-center space-x-1.5"
            title="Start New Conversation"
          >
            <SquarePen size={14} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-5xl mx-auto">
          {messages.length === 0 ? (
            /* Pristine ChatGPT-like center view: greeting + name + Front End Flow Board */
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-2 max-w-5xl mx-auto my-auto py-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-md">
                <Sparkles size={24} />
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight flex items-center justify-center gap-2 flex-wrap">
                <span>{timeInfo.greeting},</span>
                <span className="text-emerald-400 font-bold">{userName}</span>
                {!isEditingName ? (
                  <button
                    onClick={() => { setTempName(userName); setIsEditingName(true); }}
                    className="text-gray-500 hover:text-emerald-300 p-1 rounded-md transition-colors"
                    title="Click to edit display name"
                  >
                    <Edit3 size={18} />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm ml-1">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="bg-black/70 text-white text-sm px-2.5 py-1 rounded-lg border border-emerald-500 outline-none w-32 font-medium"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                    />
                    <button onClick={handleSaveName} className="text-emerald-400 hover:text-emerald-300 p-1" title="Save">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setIsEditingName(false)} className="text-gray-400 hover:text-gray-200 p-1" title="Cancel">
                      <X size={16} />
                    </button>
                  </span>
                )}
              </h1>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => {
            const isAssistant = message.role === 'assistant';
            const codeBlock = isAssistant ? extractCodeBlock(message.content) : null;

            return (
              <div
                key={message.id}
                className={`flex gap-3 text-sm ${isAssistant ? 'items-start' : 'items-start justify-end'}`}
              >
                {isAssistant && (
                  <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                )}

                <div
                  className={`relative group rounded-2xl px-4 py-3.5 max-w-[90%] sm:max-w-[85%] ${
                    isAssistant
                      ? 'bg-[#212226] border border-white/10 text-gray-200 shadow-md'
                      : 'bg-emerald-600 text-white shadow-md'
                  }`}
                >
                  <div className="markdown-body text-sm leading-relaxed overflow-x-auto space-y-2">
                    <ReactMarkdown
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 rounded-xl border border-white/10 bg-[#16171b] shadow-inner">
                            <table className="min-w-full text-xs text-left border-collapse" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="bg-white/5 border-b border-white/10 text-emerald-400 font-semibold tracking-wider text-[11px] uppercase" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th className="px-3 py-2.5 font-medium border-r border-white/5 last:border-r-0 whitespace-nowrap" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className="px-3 py-2 border-b border-white/5 border-r border-white/5 last:border-r-0 text-gray-300 font-normal" {...props} />
                        ),
                        code: ({ node, inline, className, children, ...props }: any) => {
                          if (inline) {
                            return (
                              <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-mono text-xs border border-white/10" {...props}>
                                {children}
                              </code>
                            );
                          }
                          return (
                            <pre className="p-3 my-2.5 rounded-xl bg-[#121316] border border-white/10 text-gray-200 font-mono text-xs overflow-x-auto">
                              <code {...props}>{children}</code>
                            </pre>
                          );
                        },
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-2 border-emerald-500/70 bg-emerald-500/10 px-3.5 py-2 rounded-r-lg text-xs text-emerald-200/90 my-2.5" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-sm font-semibold text-white mt-3.5 mb-2 flex items-center gap-2 border-b border-white/10 pb-1.5" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                          <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mt-3 mb-1" {...props} />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Interactive Slide Action Button (Tapping opens that slide only) */}
                  {isAssistant && message.actionSuggestion && (
                    <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-black/25 p-2.5 rounded-xl border border-white/5">
                      <div className="text-xs text-gray-300 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                        <span className="text-[11px] sm:text-xs">Interactive slide available for this specification</span>
                      </div>
                      <button
                        onClick={() => onNavigateToTab(message.actionSuggestion!.tab)}
                        className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all shadow-sm shrink-0 self-start sm:self-auto hover:scale-[1.02] active:scale-[0.98]"
                        title={`Open ${message.actionSuggestion.label}`}
                      >
                        <span>{message.actionSuggestion.label}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* 7-Stage Front-End Flow Navigation Bar (Sync in all) */}
                  {isAssistant && message.componentMeta && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-400">
                          <Sparkles size={13} />
                          <span>Synchronized Across All 7 Stages ({message.componentMeta.name}):</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Type: {message.componentMeta.typeName}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => onNavigateToTab('icExplorer')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
                        >
                          1. Specs
                        </button>
                        <button
                          onClick={() => onNavigateToTab('diagram')}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-medium transition-all"
                        >
                          2. Logical Diagram
                        </button>
                        <button
                          onClick={() => onNavigateToTab('logicalVerification')}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all"
                        >
                          3. Logic Verification
                        </button>
                        <button
                          onClick={() => onNavigateToTab('rtl')}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-medium transition-all"
                        >
                          4. RTL Design
                        </button>
                        <button
                          onClick={() => onNavigateToTab('testbench')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
                        >
                          5. RTL Verification
                        </button>
                        <button
                          onClick={() => onNavigateToTab('cmos')}
                          className="px-2.5 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-xs font-medium transition-all"
                        >
                          6. CMOS Synthesis
                        </button>
                        <button
                          onClick={() => onNavigateToTab('truthtable')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all"
                        >
                          7. Truth Table
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Load Code to Editor Button */}
                  {isAssistant && codeBlock && onLoadRtlCode && (
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        onClick={() => {
                          onLoadRtlCode(codeBlock);
                          onNavigateToTab('rtl');
                        }}
                        className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded text-xs flex items-center space-x-1.5 transition-all"
                      >
                        <Code2 size={13} />
                        <span>Open Code in RTL Editor</span>
                      </button>
                    </div>
                  )}

                  {/* Message Copy Action */}
                  <div className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${isAssistant ? 'text-gray-400 hover:text-gray-200' : 'text-emerald-200 hover:text-white'}`}>
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="p-1 rounded bg-black/20 hover:bg-black/40 text-xs"
                      title="Copy text"
                    >
                      {copiedId === message.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {!isAssistant && (
                  <div 
                    className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold shrink-0 mt-0.5 text-xs shadow-sm"
                    title={userName}
                  >
                    <span>{userName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Bubble */}
          {isLoading && (
            <div className="flex gap-3 text-sm items-start">
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <Sparkles size={16} className="animate-spin" />
              </div>
              <div className="bg-[#212226] border border-white/10 rounded-2xl px-4 py-3.5 text-gray-400 flex items-center space-x-2">
                <span className="text-xs">Analyzing circuit & generating response...</span>
                <span className="flex space-x-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                </span>
              </div>
            </div>
          )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Area: The Question Ask Bar */}
      <div className="p-4 pt-1 bg-gradient-to-t from-[#151619] via-[#151619]/95 to-transparent shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Live Component Type & Classification Card as user types */}
          {detectedComponent && (
            <div 
              onClick={() => handleSend(detectedComponent.name)}
              className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-[#181a1f] to-[#121316] border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-300 animate-fadeIn cursor-pointer hover:border-emerald-400 transition-colors"
              title="Click to sync and generate response"
            >
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white tracking-wide text-sm">{detectedComponent.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Type: {detectedComponent.typeName}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Class: <strong className="text-gray-200">{detectedComponent.logicClass}</strong> • Sub-type: <strong className="text-gray-200">{detectedComponent.subType}</strong> • Pkg: <strong className="text-gray-200">{detectedComponent.pkg}</strong>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <span className="text-[10px] text-emerald-400/90 font-mono bg-black/40 px-2 py-1 rounded border border-white/10">
                  Click or Enter to sync all 7 stages ↵
                </span>
              </div>
            </div>
          )}

          {/* ChatGPT-style Prompt Input Bar */}
          <div className="relative flex items-end bg-[#202125] border border-white/15 focus-within:border-emerald-500/50 rounded-2xl shadow-xl transition-all p-2 pl-4">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="type your prompt for design chip"
              className="flex-1 max-h-40 bg-transparent text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none py-1.5 pr-2"
              disabled={isLoading}
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              id="chat-send-arrow-btn"
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                inputValue.trim() && !isLoading
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer shadow-md'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }`}
              title="Send Prompt (Enter)"
              aria-label="Send Prompt"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-gray-500">
              Tap <span className="text-emerald-400 font-semibold">⚡ VLSI Studio</span> or the three-bar menu (<span className="text-gray-300 font-semibold">☰</span>) to access Front End & Back End Design Flows.
            </p>
          </div>
        </div>
      </div>

      {/* History Slide-over Drawer */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsHistoryDrawerOpen(false)} 
          />
          <div className="relative w-full max-w-xl h-full bg-[#141518] z-10 shadow-2xl flex flex-col border-l border-white/10">
            <div className="flex items-center justify-between p-3.5 px-4 bg-[#111215] border-b border-white/10">
              <div className="flex items-center space-x-2 text-white text-sm font-semibold">
                <History size={16} className="text-emerald-400" />
                <span>Usage & Prompt History</span>
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Close History Drawer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <HistoryViewer 
                onSelectHistoryPrompt={(prompt, icId) => {
                  setInputValue(prompt);
                  setIsHistoryDrawerOpen(false);
                  if (icId && onSelectComponent) {
                    onSelectComponent(icId);
                  }
                }}
                onNavigateToTab={(tabId) => {
                  setIsHistoryDrawerOpen(false);
                  onNavigateToTab(tabId);
                }}
                onSelectComponent={(id) => {
                  if (onSelectComponent) onSelectComponent(id);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

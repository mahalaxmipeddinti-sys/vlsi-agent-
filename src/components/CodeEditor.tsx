import React, { useRef, useState } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { Search, Replace, Sparkles, Code2, Zap } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  selectedLanguage?: 'verilog' | 'systemverilog' | 'vhdl';
  onLanguageChange?: (lang: 'verilog' | 'systemverilog' | 'vhdl') => void;
  onGenerateRtl?: (prompt: string) => void;
  isGenerating?: boolean;
}

const VERILOG_KEYWORDS = [
  'always', 'and', 'assign', 'automatic', 'begin', 'buf', 'bufif0', 'bufif1',
  'case', 'casex', 'casez', 'cell', 'cmos', 'config', 'deassign', 'default',
  'defparam', 'design', 'disable', 'edge', 'else', 'end', 'endcase', 'endconfig',
  'endfunction', 'endgenerate', 'endmodule', 'endprimitive', 'endspecify',
  'endtable', 'endtask', 'event', 'for', 'force', 'forever', 'fork', 'function',
  'generate', 'genvar', 'highz0', 'highz1', 'if', 'ifnone', 'incdir', 'include',
  'initial', 'inout', 'input', 'instance', 'integer', 'join', 'large', 'liblist',
  'library', 'localparam', 'macromodule', 'medium', 'module', 'nand', 'negedge',
  'nmos', 'nor', 'noshowcancelled', 'not', 'notif0', 'notif1', 'or', 'output',
  'parameter', 'pmos', 'posedge', 'primitive', 'pull0', 'pull1', 'pulldown',
  'pullup', 'rcmos', 'real', 'realtime', 'reg', 'release', 'repeat', 'rnmos',
  'rpmos', 'rtran', 'rtranif0', 'rtranif1', 'scalared', 'showcancelled',
  'signed', 'small', 'specify', 'specparam', 'strong0', 'strong1', 'supply0',
  'supply1', 'table', 'task', 'time', 'tran', 'tranif0', 'tranif1', 'tri',
  'tri0', 'tri1', 'triand', 'trior', 'trireg', 'unsigned', 'use', 'vectored',
  'wait', 'wand', 'weak0', 'weak1', 'while', 'wire', 'wor', 'xnor', 'xor'
];

const SV_KEYWORDS = [
  ...VERILOG_KEYWORDS,
  'alias', 'always_comb', 'always_ff', 'always_latch', 'assert', 'assume',
  'before', 'bind', 'bins', 'binsof', 'bit', 'break', 'build_coverage', 'byte',
  'chandle', 'checker', 'class', 'clocking', 'const', 'constraint', 'context',
  'continue', 'cover', 'covergroup', 'coverpoint', 'cross', 'dist', 'do',
  'endchecker', 'endclass', 'endclocking', 'endgroup', 'endinterface',
  'endpackage', 'endprogram', 'endproperty', 'endsequence', 'enum', 'expect',
  'export', 'extends', 'extern', 'final', 'first_match', 'foreach', 'forkjoin',
  'iff', 'ignore_bins', 'illegal_bins', 'implements', 'import', 'inside',
  'int', 'interface', 'intersect', 'join_any', 'join_none', 'local', 'logic',
  'longint', 'matches', 'modport', 'new', 'null', 'package', 'packed',
  'priority', 'program', 'property', 'protected', 'pure', 'rand', 'randc',
  'randcase', 'randsequence', 'ref', 'return', 'sequence', 'shortint',
  'shortreal', 'solve', 'static', 'string', 'struct', 'super', 'tagged',
  'this', 'throughout', 'timeprecision', 'timeunit', 'type', 'typedef',
  'union', 'unique', 'unique0', 'var', 'virtual', 'void', 'wait_order',
  'wildcard', 'with', 'within'
];

const SNIPPETS = [
  {
    label: 'module',
    insertText: 'module ${1:name} (\n\tinput wire ${2:clk},\n\toutput reg ${3:out}\n);\n\n\t${0}\n\nendmodule',
    documentation: 'Module declaration'
  },
  {
    label: 'always_ff',
    insertText: 'always_ff @(posedge ${1:clk} or negedge ${2:rst_n}) begin\n\tif (!${2:rst_n}) begin\n\t\t${3}\n\tend else begin\n\t\t${0}\n\tend\nend',
    documentation: 'Sequential logic block'
  },
  {
    label: 'always_comb',
    insertText: 'always_comb begin\n\t${0}\nend',
    documentation: 'Combinational logic block'
  },
  {
    label: 'initial',
    insertText: 'initial begin\n\t${0}\nend',
    documentation: 'Initial block'
  }
];

export function CodeEditor({ 
  code, 
  onChange, 
  language, 
  selectedLanguage = 'verilog',
  onLanguageChange,
  onGenerateRtl,
  isGenerating = false
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const validateCode = (currentCode: string, monacoInstance: Monaco, editorInstance: any) => {
    if (!monacoInstance || !editorInstance || !editorInstance.getModel()) return;

    const markers: any[] = [];
    const lines = currentCode.split('\n');

    // Check module / endmodule balance
    const moduleMatches = (currentCode.match(/\bmodule\b/g) || []).length;
    const endmoduleMatches = (currentCode.match(/\bendmodule\b/g) || []).length;
    if (moduleMatches > endmoduleMatches) {
        markers.push({
            severity: monacoInstance.MarkerSeverity.Error,
            message: "Syntax Error: Missing 'endmodule' keyword",
            startLineNumber: lines.length,
            startColumn: 1,
            endLineNumber: lines.length,
            endColumn: lines[lines.length - 1]?.length + 1 || 2
        });
    }

    // Check class / endclass balance
    const classMatches = (currentCode.match(/\bclass\b/g) || []).length;
    const endclassMatches = (currentCode.match(/\bendclass\b/g) || []).length;
    if (classMatches > endclassMatches) {
        markers.push({
            severity: monacoInstance.MarkerSeverity.Error,
            message: "Syntax Error: Missing 'endclass' keyword",
            startLineNumber: lines.length,
            startColumn: 1,
            endLineNumber: lines.length,
            endColumn: lines[lines.length - 1]?.length + 1 || 2
        });
    }
    
    // Check missing semicolons for common declarations
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if ((line.startsWith('input ') || line.startsWith('output ') || line.startsWith('wire ') || line.startsWith('reg ') || line.startsWith('logic ')) && 
            !line.endsWith(';') && !line.endsWith(',') && !line.includes('(') && !line.includes(')')) {
            // Check if it's the last item in a port list by checking if next line closes parenthesis
            let isPortList = false;
            for(let j=i+1; j<Math.min(i+3, lines.length); j++) {
                if (lines[j].trim().startsWith(')')) isPortList = true;
            }
            if (!isPortList) {
                markers.push({
                    severity: monacoInstance.MarkerSeverity.Error,
                    message: "Syntax Error: Missing semicolon ';'",
                    startLineNumber: i + 1,
                    startColumn: lines[i].length,
                    endLineNumber: i + 1,
                    endColumn: lines[i].length + 1
                });
            }
        }
    }

    monacoInstance.editor.setModelMarkers(editorInstance.getModel(), 'verilogLinter', markers);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    validateCode(code, monaco, editor);
  };

  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    onChange(val);
    if (monacoRef.current && editorRef.current) {
        validateCode(val, monacoRef.current, editorRef.current);
    }
  };

  const triggerFind = () => {
    if (editorRef.current) {
      editorRef.current.getAction('actions.find').run();
    }
  };

  const triggerReplace = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.startFindReplaceAction').run();
    }
  };

  const handleEditorWillMount = (monaco: Monaco) => {
    monaco.editor.defineTheme('verilog-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'identifier', foreground: '9cdcfe' },
        { token: 'custom-error', foreground: 'ff0000', fontStyle: 'bold' }
      ],
      colors: {
        'editor.background': '#1A1C20',
        'editor.lineHighlightBackground': '#ffffff0a',
        'editorLineNumber.foreground': '#858585',
        'editorIndentGuide.background': '#404040',
        'editorSuggestWidget.background': '#252526',
        'editorSuggestWidget.border': '#454545',
        'editorSuggestWidget.foreground': '#d4d4d4',
        'editorSuggestWidget.selectedBackground': '#062f4a',
        'editorSuggestWidget.highlightForeground': '#18a3ff'
      }
    });

    const provider = {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          ...SV_KEYWORDS.map(k => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k,
            range
          })),
          ...SNIPPETS.map(s => ({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: s.documentation,
            range
          }))
        ];

        return { suggestions };
      }
    };

    monaco.languages.registerCompletionItemProvider('verilog', provider);
    monaco.languages.registerCompletionItemProvider('systemverilog', provider);
  };

  const loadingFallback = (
    <div className="w-full h-full bg-[#1A1C20] text-gray-300 font-mono text-xs p-4 overflow-auto">
      <pre className="whitespace-pre-wrap">{code}</pre>
    </div>
  );

  const modelingTypes = {
    verilog: [
      { id: 'dataflow', label: 'Dataflow: assign' },
      { id: 'combinational', label: 'Combinational: always @(*)' },
      { id: 'sequential', label: 'Sequential: always @(posedge clk)' },
      { id: 'structural', label: 'Structural: module instance' },
      { id: 'gate', label: 'Gate level: and/or/not' },
      { id: 'switch', label: 'Switch level: nmos/pmos/tran' }
    ],
    systemverilog: [
      { id: 'dataflow', label: 'Dataflow: assign' },
      { id: 'combinational', label: 'Combinational: always_comb' },
      { id: 'sequential', label: 'Sequential: always_ff' },
      { id: 'latch', label: 'Latch: always_latch' },
      { id: 'fsm', label: 'FSM: enum + always' },
      { id: 'structural', label: 'Structural: modules, interfaces' },
      { id: 'gate', label: 'Gate level: primitives' },
      { id: 'switch', label: 'Switch level: nmos/pmos/tran' }
    ],
    vhdl: [
      { id: 'dataflow', label: 'Dataflow: concurrent <=' },
      { id: 'behavioral', label: 'Behavioral: process' },
      { id: 'combinational', label: 'Combinational: process(all)' },
      { id: 'sequential', label: 'Sequential: rising_edge(clk)' },
      { id: 'fsm', label: 'FSM: enum + process' },
      { id: 'structural', label: 'Structural: entity/component' },
      { id: 'gate', label: 'Gate level: library cells' }
    ]
  };

  const [promptInput, setPromptInput] = useState('');
  const [selectedModelingType, setSelectedModelingType] = useState('dataflow');

  React.useEffect(() => {
    setSelectedModelingType('dataflow');
  }, [selectedLanguage]);

  const handleSynthesizeClick = () => {
    if (!promptInput.trim() || isGenerating) return;
    const styleLabel = modelingTypes[selectedLanguage].find(m => m.id === selectedModelingType)?.label || '';
    const fullPrompt = `${promptInput.trim()}\n\nCRITICAL REQUIREMENT: Use strictly ${selectedLanguage} ${styleLabel} modeling style.`;
    onGenerateRtl?.(fullPrompt);
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-[#1A1C20]">
      {/* Header Toolbar: Language Selector + Prompt Generator Bar */}
      <div className="p-3 bg-[#14161a] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
        {/* Language Tabs */}
        <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <span className="text-[11px] font-mono text-gray-400 px-2 flex items-center gap-1 font-semibold">
            <Code2 size={13} className="text-emerald-400" />
            HDL:
          </span>
          {[
            { id: 'verilog', label: 'Verilog (.v)' },
            { id: 'systemverilog', label: 'SystemVerilog (.sv)' },
            { id: 'vhdl', label: 'VHDL (.vhd)' },
          ].map((lang) => {
            const isSelected = selectedLanguage === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => onLanguageChange?.(lang.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>

        {/* Circuit Prompt Synthesizer Bar */}
        {onGenerateRtl && (
          <div className="flex-1 max-w-xl flex items-center space-x-2">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSynthesizeClick()}
              placeholder="Enter gate or circuit e.g. 4-bit ALU, SN7476, NAND Gate, Priority Encoder..."
              className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 font-mono outline-none focus:border-emerald-500/60"
            />
            <button
              onClick={handleSynthesizeClick}
              disabled={isGenerating || !promptInput.trim()}
              className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shrink-0 disabled:opacity-50"
            >
              <Zap size={13} className={isGenerating ? 'animate-spin' : ''} />
              <span>{isGenerating ? 'Synthesizing...' : '⚡ Synthesize RTL'}</span>
            </button>
          </div>
        )}

        {/* Find & Replace Tools */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={triggerFind} 
            className="p-1.5 bg-[#1A1C20] hover:bg-white/10 text-gray-400 hover:text-gray-200 rounded-lg border border-white/10 shadow-sm transition-colors cursor-pointer" 
            title="Find (Ctrl+F)"
          >
            <Search size={16} />
          </button>
          <button 
            onClick={triggerReplace} 
            className="p-1.5 bg-[#1A1C20] hover:bg-white/10 text-gray-400 hover:text-gray-200 rounded-lg border border-white/10 shadow-sm transition-colors cursor-pointer" 
            title="Replace (Ctrl+H)"
          >
            <Replace size={16} />
          </button>
        </div>
      </div>

      {/* Sub-Header Toolbar: Modeling Types */}
      {onGenerateRtl && modelingTypes[selectedLanguage] && (
        <div className="p-2 bg-[#0B0F19] border-b border-white/10 flex flex-wrap items-center gap-2 z-10 shrink-0 overflow-x-auto hide-scrollbar">
          <span className="text-[10px] font-mono text-gray-500 px-2 uppercase tracking-wider font-bold">
            Modeling Style:
          </span>
          {modelingTypes[selectedLanguage].map(model => {
            const isSelected = selectedModelingType === model.id;
            return (
              <button
                key={model.id}
                onClick={() => setSelectedModelingType(model.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-mono whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-300 border border-transparent hover:bg-white/5'
                }`}
              >
                {model.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={selectedLanguage === 'vhdl' ? 'vhdl' : selectedLanguage === 'systemverilog' ? 'verilog' : language}
          theme="verilog-dark"
          value={code}
          loading={loadingFallback}
          onChange={handleEditorChange}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 24,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            formatOnPaste: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: 'never',
              seedSearchStringFromSelection: 'always'
            }
          }}
        />
      </div>
    </div>
  );
}


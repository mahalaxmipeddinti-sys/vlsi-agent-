const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');
const lines = code.split('\n');
const startIdx = lines.findIndex(l => l.includes("if (lower.includes('floorplan') || lower.includes('floor plan'))"));
if (startIdx >= 0) {
    const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("return { text: fallbackText };"));
    if (endIdx >= 0) {
        const replacement = [
            "  if (lower.includes('floorplan') || lower.includes('floor plan')) {",
            "    fallbackText = `## Floorplanning\\n\\nFloorplanning is the first step in physical design. It defines:\\n- **Die area** and core dimensions\\n- **Aspect ratio** of the chip\\n- **I/O pad ring** placement\\n- **Power delivery network** (PDN) topology\\n\\nOpen the Floorplan viewer to interactively design your chip layout.`;",
            "    return { text: fallbackText, actionSuggestion: { type: 'open_tab', tab: 'floorplan', label: 'Open Floorplan' } };",
            "  }",
            "",
            "  const localRtl = getLocalRtl(prompt);",
            "  if (localRtl && !localRtl.includes('Custom Digital Logic') && !localRtl.includes('custom_module')) {",
            "    fallbackText = `Here is the RTL code for your request:\\n\\n\\`\\`\\`verilog\\n${localRtl}\\n\\`\\`\\`\\n`;",
            "    return { text: fallbackText, actionSuggestion: { type: 'open_tab', tab: 'rtl', label: 'Open RTL Editor' } };",
            "  }",
            "",
            "  fallbackText += `\\n\\nYou can ask me about:\\n- **Logic gates** (AND, OR, NAND, XOR, etc.)\\n- **RTL design** in Verilog/VHDL\\n- **IC components** (74-series, flip-flops, counters)\\n- **Physical design** (floorplan, power plan, routing)\\n- **Verification** (testbenches, waveforms, truth tables)\\n\\nOr open the **VLSI Studio** tab to access all design flow tools!`;",
            "",
            "  return { text: fallbackText };"
        ];
        lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
        fs.writeFileSync('src/services/geminiService.ts', lines.join('\n'));
        console.log('SUCCESS');
    }
}

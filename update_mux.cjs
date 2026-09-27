const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const replacement = `  if (d.includes('multiplexer') || d.includes('mux')) {
    const ratioMatch = d.match(/(\\d+)\\s*(?::|-to-|_to_|to|x|_x_)\\s*1/);
    let n = 4;
    if (ratioMatch) {
        n = parseInt(ratioMatch[1], 10);
    }
    const s = Math.ceil(Math.log2(n));
    let cases = '';
    for(let i=0; i<n; i++) {
        const bin = i.toString(2).padStart(s, '0');
        cases += \`            \${s}'b\${bin}: y = d[\${i}];\\n\`;
    }

    return \`// \${n}-to-1 Multiplexer Module
module mux\${n}to1 (
    input  wire [\${n-1}:0] d,
    input  wire [\${s-1}:0] sel,
    output reg        y
);
    always @(*) begin
        case (sel)
\${cases}            default: y = 1'b0;
        endcase
    end
endmodule\`;
  }`;

const lines = code.split('\n');
const startIdx = lines.findIndex(l => l.includes("if (d.includes('multiplexer') || d.includes('mux')) {"));
if (startIdx >= 0) {
    const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("endcase"));
    if (endIdx >= 0) {
        const endModuleIdx = lines.findIndex((l, i) => i > endIdx && l.includes("}"));
        if (endModuleIdx >= 0) {
           lines.splice(startIdx, endModuleIdx - startIdx + 1, replacement);
           fs.writeFileSync('src/services/geminiService.ts', lines.join('\n'));
           console.log('SUCCESS');
        }
    }
}

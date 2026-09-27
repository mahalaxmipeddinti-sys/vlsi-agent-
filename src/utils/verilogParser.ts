export interface ParsedPort {
  name: string;
  width: string;
  direction: 'input' | 'output' | 'inout';
  pinNumber: number;
}

export interface BlockDiagramData {
  moduleName: string;
  inputs: string[];
  outputs: string[];
  internalSignals: string[];
  submodules: { instanceName: string; moduleName: string }[];
}

export interface PinDiagramData {
  moduleName: string;
  inputs: { name: string; width: string; pinNumber: number }[];
  outputs: { name: string; width: string; pinNumber: number }[];
  inouts: { name: string; width: string; pinNumber: number }[];
}

export interface LogicDiagramData {
  nodes: { id: string; type: string; label: string }[];
  edges: { source: string; target: string }[];
}

/**
 * Strips comments from Verilog / SystemVerilog code
 */
export function stripVerilogComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // multi-line comments
    .replace(/\/\/.*$/gm, ' ');         // single-line comments
}

/**
 * Robust client-side Verilog parser that extracts module definitions, ports,
 * submodules, and gate structures even if the code has formatting quirks.
 */
export function parseVerilog(code: string) {
  const clean = stripVerilogComments(code);

  // Extract module name
  const moduleMatch = clean.match(/\bmodule\s+([a-zA-Z_0-9]+)/);
  const moduleName = moduleMatch ? moduleMatch[1] : 'top_module';

  const inputs: { name: string; width: string }[] = [];
  const outputs: { name: string; width: string }[] = [];
  const inouts: { name: string; width: string }[] = [];
  const internalSignals: string[] = [];
  const submodules: { instanceName: string; moduleName: string }[] = [];

  // 1. ANSI-style port declarations in module header or body
  // e.g. input wire [3:0] a, b; or output reg [7:0] data_out
  const portRegex = /\b(input|output|inout)\s+(?:wire\s+|reg\s+|logic\s+)?(\[[^\]]+\])?\s*([^;,()]+)/g;
  let match;

  while ((match = portRegex.exec(clean)) !== null) {
    const dir = match[1];
    const width = (match[2] || '').trim();
    const rawNames = match[3];

    // Split multiple comma-separated names in the declaration: "a, b, c"
    const names = rawNames
      .split(',')
      .map(n => n.trim().replace(/=.*$/, '')) // strip default values if any
      .filter(n => n && /^[a-zA-Z_0-9]+$/.test(n));

    names.forEach(name => {
      if (dir === 'input') {
        if (!inputs.some(p => p.name === name)) inputs.push({ name, width });
      } else if (dir === 'output') {
        if (!outputs.some(p => p.name === name)) outputs.push({ name, width });
      } else if (dir === 'inout') {
        if (!inouts.some(p => p.name === name)) inouts.push({ name, width });
      }
    });
  }

  // 2. Fallback: Parse non-ANSI port lists if ANSI parser found few or no ports
  if (inputs.length === 0 && outputs.length === 0) {
    // Look for isolated input/output/inout statements:
    const stmtRegex = /\b(input|output|inout)\s+(\[[^\]]+\])?\s*([^;]+);/g;
    while ((match = stmtRegex.exec(clean)) !== null) {
      const dir = match[1];
      const width = (match[2] || '').trim();
      const rawNames = match[3];
      const names = rawNames
        .split(',')
        .map(n => n.trim().replace(/\b(wire|reg|logic)\b/g, '').trim())
        .filter(n => n && /^[a-zA-Z_0-9]+$/.test(n));

      names.forEach(name => {
        if (dir === 'input') {
          if (!inputs.some(p => p.name === name)) inputs.push({ name, width });
        } else if (dir === 'output') {
          if (!outputs.some(p => p.name === name)) outputs.push({ name, width });
        } else if (dir === 'inout') {
          if (!inouts.some(p => p.name === name)) inouts.push({ name, width });
        }
      });
    }
  }

  // Fallback defaults if code is empty or has non-standard ports
  if (inputs.length === 0 && outputs.length === 0) {
    inputs.push({ name: 'clk', width: '' });
    inputs.push({ name: 'rst_n', width: '' });
    inputs.push({ name: 'd_in', width: '[3:0]' });
    outputs.push({ name: 'd_out', width: '[3:0]' });
    outputs.push({ name: 'valid', width: '' });
  }

  // 3. Extract internal signals (wire, reg, logic)
  const sigRegex = /\b(wire|reg|logic)\s+(\[[^\]]+\])?\s*([^;]+);/g;
  while ((match = sigRegex.exec(clean)) !== null) {
    const rawNames = match[3];
    const names = rawNames
      .split(',')
      .map(n => n.trim().replace(/=.*$/, '').trim())
      .filter(n => n && /^[a-zA-Z_0-9]+$/.test(n));

    names.forEach(name => {
      // Don't duplicate if already listed in inputs/outputs
      const isPort = inputs.some(p => p.name === name) || outputs.some(p => p.name === name) || inouts.some(p => p.name === name);
      if (!isPort && !internalSignals.includes(name)) {
        internalSignals.push(name);
      }
    });
  }

  // 4. Extract submodule instantiations
  // e.g. full_adder u1 (.a(a[0]), .b(b[0]), ...);
  const instRegex = /\b([a-zA-Z_0-9]+)\s+(?:#\([^)]*\)\s+)?([a-zA-Z_0-9]+)\s*\(\s*\.[a-zA-Z_0-9]+/g;
  while ((match = instRegex.exec(clean)) !== null) {
    const modType = match[1];
    const instName = match[2];
    const keywords = ['module', 'begin', 'end', 'case', 'always', 'initial', 'assign', 'function', 'task', 'wire', 'reg', 'logic'];
    if (!keywords.includes(modType) && !keywords.includes(instName)) {
      if (!submodules.some(s => s.instanceName === instName)) {
        submodules.push({ instanceName: instName, moduleName: modType });
      }
    }
  }

  return {
    moduleName,
    inputs,
    outputs,
    inouts,
    internalSignals,
    submodules
  };
}

/**
 * Returns clean BlockDiagramData
 */
export function parseVerilogBlockDiagram(code: string): BlockDiagramData {
  const parsed = parseVerilog(code);
  return {
    moduleName: parsed.moduleName,
    inputs: parsed.inputs.map(p => p.width ? `${p.name} ${p.width}` : p.name),
    outputs: parsed.outputs.map(p => p.width ? `${p.name} ${p.width}` : p.name),
    internalSignals: parsed.internalSignals.slice(0, 12),
    submodules: parsed.submodules
  };
}

/**
 * Returns clean PinDiagramData with sequential pin numbering
 */
export function parseVerilogPinDiagram(code: string): PinDiagramData {
  const parsed = parseVerilog(code);
  let pinCounter = 1;

  const numberedInputs = parsed.inputs.map(p => ({
    name: p.name,
    width: p.width || '1',
    pinNumber: pinCounter++
  }));

  const numberedOutputs = parsed.outputs.map(p => ({
    name: p.name,
    width: p.width || '1',
    pinNumber: pinCounter++
  }));

  const numberedInouts = parsed.inouts.map(p => ({
    name: p.name,
    width: p.width || '1',
    pinNumber: pinCounter++
  }));

  return {
    moduleName: parsed.moduleName,
    inputs: numberedInputs,
    outputs: numberedOutputs,
    inouts: numberedInouts
  };
}

/**
 * Generates an RTL Verilog template for standard 7400 series logic ICs
 */
export function getVerilogForIC(icNumber: string): string {
  const ic = icNumber.toUpperCase().trim();
  if (ic.includes('7400') || ic.includes('NAND')) {
    return `// 7400 Quad 2-Input NAND Gate
module ic7400 (
    input wire [3:0] a,
    input wire [3:0] b,
    output wire [3:0] y
);
    // 4 Independent 2-input NAND gates
    assign y[0] = ~(a[0] & b[0]);
    assign y[1] = ~(a[1] & b[1]);
    assign y[2] = ~(a[2] & b[2]);
    assign y[3] = ~(a[3] & b[3]);
endmodule`;
  }

  if (ic.includes('7402') || ic.includes('NOR')) {
    return `// 7402 Quad 2-Input NOR Gate
module ic7402 (
    input wire [3:0] a,
    input wire [3:0] b,
    output wire [3:0] y
);
    // 4 Independent 2-input NOR gates
    assign y[0] = ~(a[0] | b[0]);
    assign y[1] = ~(a[1] | b[1]);
    assign y[2] = ~(a[2] | b[2]);
    assign y[3] = ~(a[3] | b[3]);
endmodule`;
  }

  if (ic.includes('74138') || ic.includes('DECODER')) {
    return `// 74138 3-to-8 Line Inverting Decoder / Demux
module ic74138 (
    input wire [2:0] a,       // Select inputs A, B, C
    input wire g1,            // Active-high enable
    input wire g2a_n,         // Active-low enable
    input wire g2b_n,         // Active-low enable
    output wire [7:0] y_n     // 8 Active-low outputs
);
    wire enable = g1 & ~g2a_n & ~g2b_n;
    assign y_n = enable ? ~(8'b00000001 << a) : 8'hFF;
endmodule`;
  }

  if (ic.includes('74151') || ic.includes('MUX')) {
    return `// 74151 8-to-1 Data Selector / Multiplexer
module ic74151 (
    input wire [7:0] d,       // Data inputs D0-D7
    input wire [2:0] s,       // Select inputs S0-S2
    input wire en_n,          // Active-low Strobe
    output wire y,            // True output
    output wire w             // Inverted output
);
    wire selected_data = d[s];
    assign y = ~en_n ? selected_data : 1'b0;
    assign w = ~y;
endmodule`;
  }

  if (ic.includes('HALF') && ic.includes('ADDER')) {
    return `// 1-Bit Half Adder
module half_adder (
    input wire a,
    input wire b,
    output wire sum,
    output wire carry
);
    assign sum = a ^ b;
    assign carry = a & b;
endmodule`;
  }

  if (ic.includes('FULL') && ic.includes('ADDER')) {
    return `// 1-Bit Full Adder
module full_adder (
    input wire a,
    input wire b,
    input wire cin,
    output wire sum,
    output wire cout
);
    wire p = a ^ b;
    wire g = a & b;
    assign sum = p ^ cin;
    assign cout = g | (p & cin);
endmodule`;
  }

  if (ic.includes('7404')) {
    return `// 7404 Hex Inverter (NOT Gate)
module ic7404 (
    input wire [5:0] a,
    output wire [5:0] y
);
    // 6 Independent Inverters
    assign y[0] = ~a[0];
    assign y[1] = ~a[1];
    assign y[2] = ~a[2];
    assign y[3] = ~a[3];
    assign y[4] = ~a[4];
    assign y[5] = ~a[5];
endmodule`;
  }

  if (ic.includes('7408')) {
    return `// 7408 Quad 2-Input AND Gate
module ic7408 (
    input wire [3:0] a,
    input wire [3:0] b,
    output wire [3:0] y
);
    assign y[0] = a[0] & b[0];
    assign y[1] = a[1] & b[1];
    assign y[2] = a[2] & b[2];
    assign y[3] = a[3] & b[3];
endmodule`;
  }

  if (ic.includes('7432')) {
    return `// 7432 Quad 2-Input OR Gate
module ic7432 (
    input wire [3:0] a,
    input wire [3:0] b,
    output wire [3:0] y
);
    assign y[0] = a[0] | b[0];
    assign y[1] = a[1] | b[1];
    assign y[2] = a[2] | b[2];
    assign y[3] = a[3] | b[3];
endmodule`;
  }

  if (ic.includes('7486')) {
    return `// 7486 Quad 2-Input XOR Gate
module ic7486 (
    input wire [3:0] a,
    input wire [3:0] b,
    output wire [3:0] y
);
    assign y[0] = a[0] ^ b[0];
    assign y[1] = a[1] ^ b[1];
    assign y[2] = a[2] ^ b[2];
    assign y[3] = a[3] ^ b[3];
endmodule`;
  }

  if (ic.includes('7476') || ic.toLowerCase().includes('jk')) {
    return `// 7476 Dual J-K Flip-Flop with Preset and Clear (Unit 1 Model)
module ic7476_jk_ff (
    input wire clk,      // Clock pulse
    input wire j,        // J Data Input
    input wire k,        // K Data Input
    input wire pre_n,    // Active-low Asynchronous Preset
    input wire clr_n,    // Active-low Asynchronous Clear
    output reg q,        // True Output
    output wire q_bar    // Complementary Output
);
    // Asynchronous Preset & Clear priority + Synchronous J-K behavior
    always @(posedge clk or negedge pre_n or negedge clr_n) begin
        if (!pre_n && !clr_n) begin
            q <= 1'b1;   // Unstable/forbidden condition
        end else if (!pre_n) begin
            q <= 1'b1;   // Direct Async Preset
        end else if (!clr_n) begin
            q <= 1'b0;   // Direct Async Clear
        end else begin
            case ({j, k})
                2'b00: q <= q;       // No change / Hold
                2'b01: q <= 1'b0;    // Reset
                2'b10: q <= 1'b1;    // Set
                2'b11: q <= ~q;      // Toggle
            endcase
        end
    end

    assign q_bar = ~q;

endmodule`;
  }

  if (ic.includes('7474')) {
    return `// 7474 Dual D-Type Positive-Edge-Triggered Flip-Flop
module ic7474_d_ff (
    input wire clk,
    input wire d,
    input wire pre_n,
    input wire clr_n,
    output reg q,
    output wire q_bar
);
    always @(posedge clk or negedge pre_n or negedge clr_n) begin
        if (!pre_n && !clr_n) begin
            q <= 1'b1;
        end else if (!pre_n) begin
            q <= 1'b1;
        end else if (!clr_n) begin
            q <= 1'b0;
        end else begin
            q <= d;
        end
    end

    assign q_bar = ~q;
endmodule`;
  }

  if (ic.includes('7483')) {
    return `// 7483 4-Bit Binary Full Adder with Fast Carry
module ic7483_adder (
    input wire [3:0] a,
    input wire [3:0] b,
    input wire c0,
    output wire [3:0] s,
    output wire c4
);
    assign {c4, s} = a + b + c0;
endmodule`;
  }

  // Default rich 4-bit ALU starter
  return `// 4-bit Arithmetic Logic Unit (ALU)
module alu_4bit (
    input wire clk,
    input wire rst_n,
    input wire [3:0] a,
    input wire [3:0] b,
    input wire [2:0] opcode,
    output reg [3:0] result,
    output reg carry_out,
    output wire zero
);
    reg [4:0] full_result;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            result    <= 4'b0000;
            carry_out <= 1'b0;
        end else begin
            case (opcode)
                3'b000: begin // ADD
                    full_result = a + b;
                    result      <= full_result[3:0];
                    carry_out   <= full_result[4];
                end
                3'b001: begin // SUB
                    full_result = a - b;
                    result      <= full_result[3:0];
                    carry_out   <= full_result[4];
                end
                3'b010: begin // AND
                    result      <= a & b;
                    carry_out   <= 1'b0;
                end
                3'b011: begin // OR
                    result      <= a | b;
                    carry_out   <= 1'b0;
                end
                3'b100: begin // XOR
                    result      <= a ^ b;
                    carry_out   <= 1'b0;
                end
                3'b101: begin // NOT A
                    result      <= ~a;
                    carry_out   <= 1'b0;
                end
                default: begin
                    result      <= 4'b0000;
                    carry_out   <= 1'b0;
                end
            endcase
        end
    end

    assign zero = (result == 4'b0000);

    // Architectural Submodules
    adder_sub_unit u_adder (
        .clk(clk),
        .a(a),
        .b(b),
        .sub(opcode[0]),
        .sum(result),
        .cout(carry_out)
    );

    boolean_logic_unit u_logic (
        .a(a),
        .b(b),
        .op(opcode[1:0]),
        .out(result)
    );

    barrel_shifter u_shifter (
        .data_in(a),
        .shamt(b[1:0]),
        .data_out(result)
    );

    register_bank u_reg (
        .clk(clk),
        .rst_n(rst_n),
        .w_data(result),
        .r_data(a)
    );

endmodule`;
}

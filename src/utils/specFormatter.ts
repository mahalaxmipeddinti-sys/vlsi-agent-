// Utility for classifying digital IC components and matching known ICs

export interface ComponentClassification {
  id: string;
  name: string;
  typeName: string;
  pkg: string;
  logicClass: string;
  subType: string;
}

interface ICEntry {
  IC: string;
  name: string;
  type: string;
  pkg: string;
  logicClass: string;
  subType: string;
}

// Common 74xx-series and digital IC database
const IC_DATABASE: ICEntry[] = [
  { IC: '7400', name: 'Quad 2-Input NAND Gate',         type: 'NAND Gate',        pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'NAND' },
  { IC: '7402', name: 'Quad 2-Input NOR Gate',          type: 'NOR Gate',         pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'NOR' },
  { IC: '7404', name: 'Hex Inverter (NOT Gate)',        type: 'NOT Gate',         pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'Inverter' },
  { IC: '7408', name: 'Quad 2-Input AND Gate',          type: 'AND Gate',         pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'AND' },
  { IC: '7410', name: 'Triple 3-Input NAND Gate',       type: 'NAND Gate',        pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'NAND-3' },
  { IC: '7411', name: 'Triple 3-Input AND Gate',        type: 'AND Gate',         pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'AND-3' },
  { IC: '7420', name: 'Dual 4-Input NAND Gate',         type: 'NAND Gate',        pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'NAND-4' },
  { IC: '7421', name: 'Dual 4-Input AND Gate',          type: 'AND Gate',         pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'AND-4' },
  { IC: '7427', name: 'Triple 3-Input NOR Gate',        type: 'NOR Gate',         pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'NOR-3' },
  { IC: '7432', name: 'Quad 2-Input OR Gate',           type: 'OR Gate',          pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'OR' },
  { IC: '7486', name: 'Quad 2-Input XOR Gate',          type: 'XOR Gate',         pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'XOR' },
  { IC: '7476', name: 'Dual JK Flip-Flop',              type: 'Flip-Flop',        pkg: 'DIP-16', logicClass: 'Sequential',     subType: 'JK FF' },
  { IC: '7474', name: 'Dual D Flip-Flop',               type: 'Flip-Flop',        pkg: 'DIP-14', logicClass: 'Sequential',     subType: 'D FF' },
  { IC: '7473', name: 'Dual JK Flip-Flop (Clear)',      type: 'Flip-Flop',        pkg: 'DIP-14', logicClass: 'Sequential',     subType: 'JK FF' },
  { IC: '7483', name: '4-Bit Binary Full Adder',        type: 'Adder',            pkg: 'DIP-16', logicClass: 'Arithmetic',     subType: 'Full Adder' },
  { IC: '7485', name: '4-Bit Magnitude Comparator',     type: 'Comparator',       pkg: 'DIP-16', logicClass: 'Arithmetic',     subType: 'Comparator' },
  { IC: '7490', name: 'Decade Counter (÷10)',           type: 'Counter',          pkg: 'DIP-14', logicClass: 'Sequential',     subType: 'Decade Counter' },
  { IC: '7491', name: '8-Bit Shift Register',           type: 'Shift Register',   pkg: 'DIP-14', logicClass: 'Sequential',     subType: 'SISO' },
  { IC: '7493', name: '4-Bit Binary Counter',           type: 'Counter',          pkg: 'DIP-14', logicClass: 'Sequential',     subType: 'Binary Counter' },
  { IC: '74138', name: '3-to-8 Line Decoder',           type: 'Decoder',          pkg: 'DIP-16', logicClass: 'Combinational', subType: 'Decoder 3:8' },
  { IC: '74139', name: 'Dual 2-to-4 Line Decoder',      type: 'Decoder',          pkg: 'DIP-16', logicClass: 'Combinational', subType: 'Decoder 2:4' },
  { IC: '74147', name: '10-Line to 4-Line Priority Encoder', type: 'Encoder',     pkg: 'DIP-16', logicClass: 'Combinational', subType: 'Priority Encoder' },
  { IC: '74148', name: '8-to-3 Priority Encoder',       type: 'Encoder',          pkg: 'DIP-16', logicClass: 'Combinational', subType: 'Encoder 8:3' },
  { IC: '74151', name: '8-to-1 Multiplexer',            type: 'Multiplexer',      pkg: 'DIP-16', logicClass: 'Combinational', subType: 'MUX 8:1' },
  { IC: '74153', name: 'Dual 4-to-1 Multiplexer',       type: 'Multiplexer',      pkg: 'DIP-16', logicClass: 'Combinational', subType: 'MUX 4:1' },
  { IC: '74157', name: 'Quad 2-to-1 Multiplexer',       type: 'Multiplexer',      pkg: 'DIP-16', logicClass: 'Combinational', subType: 'MUX 2:1' },
  { IC: '74164', name: '8-Bit Serial-in Parallel-out Shift Register', type: 'Shift Register', pkg: 'DIP-14', logicClass: 'Sequential', subType: 'SIPO' },
  { IC: '74165', name: '8-Bit Parallel-in Serial-out Shift Register', type: 'Shift Register', pkg: 'DIP-16', logicClass: 'Sequential', subType: 'PISO' },
  { IC: '74181', name: '4-Bit Arithmetic Logic Unit (ALU)', type: 'ALU',          pkg: 'DIP-24', logicClass: 'Arithmetic',     subType: 'ALU 4-bit' },
  { IC: '74191', name: '4-Bit Synchronous Up/Down Counter', type: 'Counter',      pkg: 'DIP-16', logicClass: 'Sequential',     subType: 'Up/Down Counter' },
  { IC: '74192', name: 'Synchronous BCD Up/Down Counter', type: 'Counter',        pkg: 'DIP-16', logicClass: 'Sequential',     subType: 'BCD Counter' },
  { IC: '74194', name: '4-Bit Universal Shift Register',  type: 'Shift Register', pkg: 'DIP-16', logicClass: 'Sequential',     subType: 'Universal SR' },
  { IC: '74245', name: 'Octal Bus Transceiver',          type: 'Buffer',           pkg: 'DIP-20', logicClass: 'Interface',      subType: 'Transceiver' },
  { IC: '74273', name: '8-Bit D Flip-Flop Register',    type: 'Register',         pkg: 'DIP-20', logicClass: 'Sequential',     subType: 'Octal DFF' },
  { IC: '74283', name: '4-Bit Binary Full Adder (Fast Carry)', type: 'Adder',     pkg: 'DIP-16', logicClass: 'Arithmetic',     subType: 'Full Adder' },
];

// Keyword-to-classification mapping for natural language descriptions
const KEYWORD_MAP: { pattern: RegExp; entry: Omit<ICEntry, 'IC'> }[] = [
  { pattern: /\bdemux\b|demultiplexer/i, entry: { name: 'Demultiplexer', type: 'Demultiplexer', pkg: 'DIP-16', logicClass: 'Combinational', subType: 'DEMUX' } },
  { pattern: /\bcomparator\b/i, entry: { name: 'Magnitude Comparator', type: 'Comparator', pkg: 'DIP-16', logicClass: 'Arithmetic', subType: 'Comparator' } },
  { pattern: /\bmultiplier\b/i, entry: { name: 'Binary Multiplier', type: 'Multiplier', pkg: 'DIP-24', logicClass: 'Arithmetic', subType: 'Multiplier' } },
  { pattern: /\bdivider\b/i, entry: { name: 'Binary Divider', type: 'Divider', pkg: 'DIP-24', logicClass: 'Arithmetic', subType: 'Divider' } },
  { pattern: /\bshifter\b/i, entry: { name: 'Shifter', type: 'Shifter', pkg: 'DIP-16', logicClass: 'Combinational', subType: 'Shifter' } },
  { pattern: /\bnand\b/i,          entry: { name: 'NAND Gate',        type: 'NAND Gate',       pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'NAND' } },
  { pattern: /\bnor\b/i,           entry: { name: 'NOR Gate',         type: 'NOR Gate',        pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'NOR' } },
  { pattern: /\bxnor\b/i,          entry: { name: 'XNOR Gate',        type: 'XNOR Gate',       pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'XNOR' } },
  { pattern: /\bxor\b/i,           entry: { name: 'XOR Gate',         type: 'XOR Gate',        pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'XOR' } },
  { pattern: /\band\s+gate\b/i,    entry: { name: 'AND Gate',         type: 'AND Gate',        pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'AND' } },
  { pattern: /\bor\s+gate\b/i,     entry: { name: 'OR Gate',          type: 'OR Gate',         pkg: 'DIP-14', logicClass: 'Logic Gates',    subType: 'OR' } },
  { pattern: /\bnot\s+gate\b|inverter\b/i, entry: { name: 'NOT Gate (Inverter)', type: 'NOT Gate', pkg: 'DIP-14', logicClass: 'Logic Gates', subType: 'Inverter' } },
  { pattern: /\bjk\s+flip.flop\b/i,entry: { name: 'JK Flip-Flop',    type: 'Flip-Flop',       pkg: 'DIP-16', logicClass: 'Sequential',     subType: 'JK FF' } },
  { pattern: /\bd\s+flip.flop\b/i, entry: { name: 'D Flip-Flop',     type: 'Flip-Flop',       pkg: 'DIP-14', logicClass: 'Sequential',     subType: 'D FF' } },
  { pattern: /flip.flop\b/i,       entry: { name: 'D Flip-Flop',     type: 'Flip-Flop',       pkg: 'DIP-14', logicClass: 'Sequential',     subType: 'D FF' } },
  { pattern: /full\s+adder/i,      entry: { name: '4-Bit Full Adder', type: 'Adder',           pkg: 'DIP-16', logicClass: 'Arithmetic',     subType: 'Full Adder' } },
  { pattern: /\badder\b/i,         entry: { name: 'Binary Adder',     type: 'Adder',           pkg: 'DIP-16', logicClass: 'Arithmetic',     subType: 'Adder' } },
  { pattern: /\bcounter\b/i,       entry: { name: 'Binary Counter',   type: 'Counter',         pkg: 'DIP-14', logicClass: 'Sequential',     subType: 'Counter' } },
  { pattern: /\balu\b/i,           entry: { name: 'ALU',              type: 'ALU',             pkg: 'DIP-24', logicClass: 'Arithmetic',     subType: 'ALU' } },
  { pattern: /\bmux\b|multiplexer/i,entry: { name: 'Multiplexer',     type: 'Multiplexer',     pkg: 'DIP-16', logicClass: 'Combinational', subType: 'MUX' } },
  { pattern: /\bdecoder\b/i,       entry: { name: 'Decoder',          type: 'Decoder',         pkg: 'DIP-16', logicClass: 'Combinational', subType: 'Decoder' } },
  { pattern: /\bencoder\b/i,       entry: { name: 'Encoder',          type: 'Encoder',         pkg: 'DIP-16', logicClass: 'Combinational', subType: 'Encoder' } },
  { pattern: /shift\s+register/i,  entry: { name: 'Shift Register',   type: 'Shift Register',  pkg: 'DIP-16', logicClass: 'Sequential',     subType: 'SIPO' } },
  { pattern: /\bfifo\b/i,          entry: { name: 'FIFO Buffer',      type: 'FIFO',            pkg: 'DIP-20', logicClass: 'Memory',        subType: 'FIFO' } },
  { pattern: /\bfsm\b|state\s+machine/i, entry: { name: 'Finite State Machine', type: 'FSM', pkg: 'FPGA', logicClass: 'Sequential', subType: 'FSM' } },
];

/**
 * Try to find a matching IC from the database given a user query.
 */
export function findMatchingIC(query: string): { IC: string; name: string } | null {
  const normalized = query.replace(/\s+/g, '').toLowerCase();
  // Try direct IC number match: e.g. "7400", "74138", "SN7400"
  const icNumMatch = query.match(/(?:sn|ic|74)?\s*(\d{4,5})/i);
  if (icNumMatch) {
    const icNum = icNumMatch[1];
    const found = IC_DATABASE.find((ic) => ic.IC === icNum || ic.IC === `74${icNum.slice(-3)}`);
    if (found) return { IC: found.IC, name: found.name };
  }
  return null;
}

/**
 * Classify a component/query into a ComponentClassification.
 */
export function getComponentClassification(query: string): ComponentClassification {
  // Check IC database first
  const icMatch = findMatchingIC(query);
  if (icMatch) {
    const entry = IC_DATABASE.find((ic) => ic.IC === icMatch.IC);
    if (entry) {
      return {
        id: `ic-${entry.IC}`,
        name: `SN${entry.IC} ${entry.name}`,
        typeName: entry.type,
        pkg: entry.pkg,
        logicClass: entry.logicClass,
        subType: entry.subType,
      };
    }
  }

  // Try keyword matching
  for (const { pattern, entry } of KEYWORD_MAP) {
    if (pattern.test(query)) {
      const id = entry.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return {
        id,
        name: entry.name,
        typeName: entry.type,
        pkg: entry.pkg,
        logicClass: entry.logicClass,
        subType: entry.subType,
      };
    }
  }

  // Default: custom digital logic
  return {
    id: 'custom-logic',
    name: query.substring(0, 40),
    typeName: 'Custom RTL Module',
    pkg: 'Custom',
    logicClass: 'Custom Digital Logic',
    subType: 'User-defined',
  };
}


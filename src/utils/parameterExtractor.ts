export interface ComponentParams {
  type: string;
  dataWidth?: number;
  selectWidth?: number;
  inputCount?: number;
  outputCount?: number;
  hasEnable?: boolean;
  architecture?: string;
  isSigned?: boolean;
}

export function extractParameters(query: string): ComponentParams {
  const d = query.toLowerCase();
  const params: ComponentParams = { type: 'unknown' };

  // Detect Enable
  if (d.includes('enable') || d.includes('en')) {
    params.hasEnable = true;
  }

  // Detect Signed
  if (d.includes('signed')) {
    params.isSigned = true;
  }

  // Width Extraction (e.g. "32-bit", "8 bit")
  const bitMatch = d.match(/(\d+)\s*-\s*bit|\b(\d+)\s*bit\b/);
  if (bitMatch) {
    params.dataWidth = parseInt(bitMatch[1] || bitMatch[2], 10);
  }

  // Input count (e.g. "8-input", "3 input")
  const inputMatch = d.match(/(\d+)\s*-\s*input|\b(\d+)\s*input\b/);
  if (inputMatch) {
    params.inputCount = parseInt(inputMatch[1] || inputMatch[2], 10);
  }

  // MUX/DEMUX ratios (e.g. "16:1", "8-to-1", "1 to 4")
  const d_clean = d.replace(/\[\s*\d+\s*:\s*\d+\s*\]/g, ''); // Strip vector bounds to prevent false ratio matches like [15:0]
  const ratioMatch = d_clean.match(/(\d+)\s*(?::|-to-|_to_|to|x|_x_)\s*(\d+)/);
  if (ratioMatch && (d.includes('mux') || d.includes('multiplexer') || d.includes('demux') || d.includes('decoder') || d.includes('encoder'))) {
    const left = parseInt(ratioMatch[1], 10);
    const right = parseInt(ratioMatch[2], 10);

    if (d.includes('mux') || d.includes('multiplexer')) {
      params.type = 'mux';
      params.inputCount = Math.max(left, right); // data inputs
      params.selectWidth = Math.ceil(Math.log2(params.inputCount));
    } else if (d.includes('demux')) {
      params.type = 'demux';
      params.outputCount = Math.max(left, right);
      params.selectWidth = Math.ceil(Math.log2(params.outputCount));
    } else if (d.includes('decoder')) {
      params.type = 'decoder';
      params.inputCount = Math.min(left, right);
      params.outputCount = Math.max(left, right);
    } else if (d.includes('encoder')) {
      params.type = 'encoder';
      params.inputCount = Math.max(left, right);
      params.outputCount = Math.min(left, right);
      if (d.includes('priority')) params.architecture = 'priority';
    }
  }

  // Base Types fallback if not caught by ratio
  if (params.type === 'unknown') {
    if (d.includes('mux') || d.includes('multiplexer')) {
      params.type = 'mux';
      
      const modNameMatch = d.match(/(?:mux|multiplexer)_?(\d+)/);
      const vectorMatch = query.match(/\[\s*(\d+)\s*:\s*0\s*\]/);
      
      if (modNameMatch) {
         params.inputCount = parseInt(modNameMatch[1], 10);
      } else if (vectorMatch) {
         params.inputCount = parseInt(vectorMatch[1], 10) + 1;
      } else {
         params.inputCount = 2; // lowest fallback
      }
      params.selectWidth = Math.ceil(Math.log2(params.inputCount));
    } else if (d.includes('adder')) {
      params.type = 'adder';
      if (d.includes('half')) params.architecture = 'half';
      else if (d.includes('full')) params.architecture = 'full';
      else if (d.includes('lookahead') || d.includes('cla')) params.architecture = 'cla';
      else if (d.includes('select')) params.architecture = 'csla';
      else if (d.includes('kogge')) params.architecture = 'kogge-stone';
      else params.architecture = 'rca'; // default ripple carry
    } else if (d.includes('subtractor')) {
      params.type = 'subtractor';
      if (d.includes('half')) params.architecture = 'half';
      else if (d.includes('full')) params.architecture = 'full';
      else params.architecture = 'ripple';
    } else if (d.includes('multiplier')) {
      params.type = 'multiplier';
      if (d.includes('wallace')) params.architecture = 'wallace';
      else if (d.includes('dadda')) params.architecture = 'dadda';
      else if (d.includes('booth')) params.architecture = 'booth';
      else params.architecture = 'array';
    } else if (d.includes('divider')) {
      params.type = 'divider';
    } else if (d.includes('alu')) {
      params.type = 'alu';
    } else if (d.includes('comparator')) {
      params.type = 'comparator';
    } else if (d.includes('shifter') || d.includes('rotate')) {
      params.type = 'shifter';
      if (d.includes('barrel')) params.architecture = 'barrel';
      else if (d.includes('arithmetic')) params.architecture = 'arithmetic';
      else if (d.includes('rotate')) params.architecture = 'rotate';
      else params.architecture = 'logical';
    } else if (d.includes('and gate') || (d.match(/\band\b/) && d.includes('gate'))) params.type = 'and';
    else if (d.includes('or gate') || (d.match(/\bor\b/) && d.includes('gate'))) params.type = 'or';
    else if (d.includes('nand gate') || (d.match(/\bnand\b/))) params.type = 'nand';
    else if (d.includes('nor gate') || (d.match(/\bnor\b/))) params.type = 'nor';
    else if (d.includes('xor gate') || (d.match(/\bxor\b/))) params.type = 'xor';
    else if (d.includes('xnor gate') || (d.match(/\bxnor\b/))) params.type = 'xnor';
    else if (d.includes('not gate') || d.includes('inverter')) params.type = 'not';
    else if (d.includes('buffer')) params.type = 'buffer';
  }

  // Set defaults for missing critical parameters
  if (params.dataWidth === undefined) params.dataWidth = 4; // default to 4-bit if not specified
  if (['and', 'or', 'nand', 'nor', 'xor', 'xnor'].includes(params.type) && params.inputCount === undefined) {
    params.inputCount = 2; // default 2-input gate
  }

  return params;
}

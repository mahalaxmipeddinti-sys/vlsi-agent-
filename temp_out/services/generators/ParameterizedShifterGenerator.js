"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateParameterizedShifterDiagram = generateParameterizedShifterDiagram;
exports.generateParameterizedShifterTruthTable = generateParameterizedShifterTruthTable;
function generateParameterizedShifterDiagram(params, modName) {
    var width = params.dataWidth || 8;
    var architecture = params.architecture || 'logical';
    var inputs = [];
    var outputs = [];
    var nodes = [];
    var edges = [];
    for (var i = 0; i < width; i++) {
        inputs.push("d".concat(i));
        nodes.push({ id: "in_d".concat(i), type: 'input', label: "D".concat(i) });
    }
    var shiftBits = Math.ceil(Math.log2(width));
    for (var i = 0; i < shiftBits; i++) {
        inputs.push("shamt".concat(i));
        nodes.push({ id: "in_shamt".concat(i), type: 'input', label: "SHAMT".concat(i) });
    }
    nodes.push({ id: 'core', type: 'alu', label: "".concat(architecture.toUpperCase(), " SHIFTER") });
    for (var i = 0; i < width; i++) {
        edges.push({ source: "in_d".concat(i), target: 'core' });
    }
    for (var i = 0; i < shiftBits; i++) {
        edges.push({ source: "in_shamt".concat(i), target: 'core' });
    }
    for (var i = 0; i < width; i++) {
        outputs.push("q".concat(i));
        nodes.push({ id: "out_q".concat(i), type: 'output', label: "Q".concat(i) });
        edges.push({ source: 'core', target: "out_q".concat(i) });
    }
    return {
        moduleName: modName,
        inputs: inputs,
        outputs: outputs,
        nodes: nodes,
        edges: edges
    };
}
function generateParameterizedShifterTruthTable(params) {
    var width = params.dataWidth || 8;
    var architecture = params.architecture || 'logical';
    var shiftBits = Math.ceil(Math.log2(width));
    var opMap = {
        'logical': '<<',
        'arithmetic': '<<<',
        'rotate': 'ROL',
        'barrel': 'SHIFT'
    };
    var op = opMap[architecture] || '<<';
    return {
        description: "".concat(width, "-Bit ").concat(architecture.charAt(0).toUpperCase() + architecture.slice(1), " Shifter"),
        headers: ['Data', 'Shift Amount', 'Result'],
        equation: "Y = Data ".concat(op, " SHAMT"),
        rows: [
            ['D', '0', 'D'],
            ['D', '1', "D ".concat(op, " 1")],
            ['D', '2', "D ".concat(op, " 2")],
            ['...', '...', '...']
        ]
    };
}

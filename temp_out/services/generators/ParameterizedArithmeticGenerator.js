"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateParameterizedArithmeticDiagram = generateParameterizedArithmeticDiagram;
exports.generateParameterizedArithmeticTruthTable = generateParameterizedArithmeticTruthTable;
function generateParameterizedArithmeticDiagram(params, modName) {
    var width = params.dataWidth || 4;
    var type = params.type || 'adder';
    var inputs = [];
    var outputs = [];
    var nodes = [];
    var edges = [];
    // Data buses
    for (var i = 0; i < width; i++) {
        inputs.push("a".concat(i));
        inputs.push("b".concat(i));
        nodes.push({ id: "in_a".concat(i), type: 'input', label: "A".concat(i) });
        nodes.push({ id: "in_b".concat(i), type: 'input', label: "B".concat(i) });
    }
    if (type === 'adder') {
        inputs.push('cin');
        nodes.push({ id: 'in_cin', type: 'input', label: 'Cin' });
        var lastCarry = 'in_cin';
        for (var i = 0; i < width; i++) {
            outputs.push("sum".concat(i));
            nodes.push({ id: "out_sum".concat(i), type: 'output', label: "Sum".concat(i) });
            // Full adder block
            nodes.push({ id: "fa_".concat(i), type: 'alu', label: 'FA' });
            edges.push({ source: "in_a".concat(i), target: "fa_".concat(i) });
            edges.push({ source: "in_b".concat(i), target: "fa_".concat(i) });
            edges.push({ source: lastCarry, target: "fa_".concat(i) });
            edges.push({ source: "fa_".concat(i), target: "out_sum".concat(i) });
            if (i < width - 1) {
                lastCarry = "fa_cout_".concat(i);
                nodes.push({ id: lastCarry, type: 'buffer', label: 'Carry' });
                edges.push({ source: "fa_".concat(i), target: lastCarry });
            }
            else {
                outputs.push('cout');
                nodes.push({ id: 'out_cout', type: 'output', label: 'Cout' });
                edges.push({ source: "fa_".concat(i), target: 'out_cout' });
            }
        }
    }
    else if (type === 'comparator') {
        outputs.push('eq');
        nodes.push({ id: 'out_eq', type: 'output', label: 'EQ' });
        nodes.push({ id: 'and_tree', type: 'and', label: 'AND Tree' });
        for (var i = 0; i < width; i++) {
            nodes.push({ id: "xnor_".concat(i), type: 'xnor', label: 'XNOR' });
            edges.push({ source: "in_a".concat(i), target: "xnor_".concat(i) });
            edges.push({ source: "in_b".concat(i), target: "xnor_".concat(i) });
            edges.push({ source: "xnor_".concat(i), target: 'and_tree' });
        }
        edges.push({ source: 'and_tree', target: 'out_eq' });
    }
    else {
        // Generic ALU / Multiplier fallback box
        nodes.push({ id: 'core', type: 'alu', label: type.toUpperCase() });
        for (var i = 0; i < width; i++) {
            edges.push({ source: "in_a".concat(i), target: 'core' });
            edges.push({ source: "in_b".concat(i), target: 'core' });
            outputs.push("y".concat(i));
            nodes.push({ id: "out_y".concat(i), type: 'output', label: "Y".concat(i) });
            edges.push({ source: 'core', target: "out_y".concat(i) });
        }
    }
    return {
        moduleName: modName,
        inputs: inputs,
        outputs: outputs,
        nodes: nodes,
        edges: edges
    };
}
function generateParameterizedArithmeticTruthTable(params) {
    var type = params.type || 'adder';
    var width = params.dataWidth || 4;
    if (type === 'adder') {
        return {
            description: "".concat(width, "-Bit Adder (Truncated)"),
            headers: ['A', 'B', 'Cin', 'Sum', 'Cout'],
            equation: 'Sum = A + B + Cin',
            rows: [
                ['0', '0', '0', '0', '0'],
                ['0', '1', '0', '1', '0'],
                ['1', '1', '0', '2', '0'],
                ['Max', 'Max', '1', 'Max', '1'],
                ['...', '...', '...', '...', '...']
            ]
        };
    }
    if (type === 'comparator') {
        return {
            description: "".concat(width, "-Bit Comparator"),
            headers: ['A', 'B', 'EQ', 'GT', 'LT'],
            equation: 'EQ = (A == B), GT = (A > B)',
            rows: [
                ['0', '0', '1', '0', '0'],
                ['1', '0', '0', '1', '0'],
                ['0', '1', '0', '0', '1'],
                ['...', '...', '...', '...', '...']
            ]
        };
    }
    return {
        description: "".concat(width, "-Bit ").concat(type.toUpperCase()),
        headers: ['A', 'B', 'Y'],
        equation: "Y = A op B",
        rows: [['...', '...', '...']]
    };
}

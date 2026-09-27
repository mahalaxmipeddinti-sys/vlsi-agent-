"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateParameterizedGateDiagram = generateParameterizedGateDiagram;
exports.generateParameterizedGateTruthTable = generateParameterizedGateTruthTable;
function generateParameterizedGateDiagram(params, modName) {
    var n = params.inputCount || 2;
    var type = params.type || 'and';
    var inputs = [];
    var nodes = [];
    var edges = [];
    for (var i = 0; i < n; i++) {
        inputs.push("in".concat(i));
        nodes.push({ id: "in".concat(i), type: 'input', label: "In".concat(i) });
    }
    var outputs = ['out'];
    nodes.push({ id: 'out_node', type: 'output', label: 'Out' });
    // Base gate
    nodes.push({ id: "gate_1", type: type, label: type.toUpperCase() });
    for (var i = 0; i < n; i++) {
        edges.push({ source: "in".concat(i), target: "gate_1" });
    }
    edges.push({ source: "gate_1", target: "out_node" });
    return {
        moduleName: modName,
        inputs: inputs,
        outputs: outputs,
        nodes: nodes,
        edges: edges
    };
}
function generateParameterizedGateTruthTable(params) {
    var n = Math.min(params.inputCount || 2, 4); // Limit to 4 inputs (16 rows) for gates
    var type = params.type || 'and';
    var headers = [];
    for (var i = 0; i < n; i++)
        headers.push("A".concat(i));
    headers.push('Y');
    var rows = [];
    var maxRows = Math.pow(2, n);
    for (var i = 0; i < maxRows; i++) {
        var row = [];
        var out = type === 'and' || type === 'nand' ? 1 : 0;
        if (type === 'or' || type === 'nor')
            out = 0;
        if (type === 'xor' || type === 'xnor')
            out = 0;
        for (var bit = n - 1; bit >= 0; bit--) {
            var val = (i >> bit) & 1;
            row.push(val.toString());
            if (type === 'and' || type === 'nand')
                out = out & val;
            if (type === 'or' || type === 'nor')
                out = out | val;
            if (type === 'xor' || type === 'xnor')
                out = out ^ val;
        }
        if (type === 'nand' || type === 'nor' || type === 'xnor') {
            out = out === 1 ? 0 : 1;
        }
        row.push(out.toString());
        rows.push(row);
    }
    var equation = '';
    if (type === 'and')
        equation = 'Y = A0 • A1' + (n > 2 ? ' ...' : '');
    if (type === 'or')
        equation = 'Y = A0 + A1' + (n > 2 ? ' ...' : '');
    if (type === 'nand')
        equation = 'Y = ~(A0 • A1)';
    if (type === 'nor')
        equation = 'Y = ~(A0 + A1)';
    if (type === 'xor')
        equation = 'Y = A0 ⊕ A1';
    if (type === 'xnor')
        equation = 'Y = ~(A0 ⊕ A1)';
    return {
        description: "".concat(n, "-Input ").concat(type.toUpperCase(), " Gate Truth Table"),
        headers: headers,
        equation: equation,
        rows: rows
    };
}

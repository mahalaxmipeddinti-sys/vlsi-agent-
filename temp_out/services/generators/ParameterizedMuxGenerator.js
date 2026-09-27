"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateParameterizedMuxDiagram = generateParameterizedMuxDiagram;
exports.generateParameterizedMuxTruthTable = generateParameterizedMuxTruthTable;
function generateParameterizedMuxDiagram(params, modName) {
    var n = params.inputCount || 2;
    var s = params.selectWidth || Math.ceil(Math.log2(n));
    var inputs = [];
    var nodes = [];
    var edges = [];
    // Create Data Inputs
    for (var i = 0; i < n; i++) {
        inputs.push("d".concat(i));
        nodes.push({ id: "in_d".concat(i), type: 'input', label: "D".concat(i) });
    }
    // Create Select Inputs
    for (var i = 0; i < s; i++) {
        inputs.push("s".concat(i));
        nodes.push({ id: "in_s".concat(i), type: 'input', label: "S".concat(i) });
        nodes.push({ id: "not_s".concat(i), type: 'not', label: 'NOT' });
        edges.push({ source: "in_s".concat(i), target: "not_s".concat(i) });
    }
    var outputs = ['y'];
    nodes.push({ id: 'out_y', type: 'output', label: 'Y' });
    // AND gates for each data path
    for (var i = 0; i < n; i++) {
        nodes.push({ id: "and_".concat(i), type: 'and', label: 'AND' });
        edges.push({ source: "in_d".concat(i), target: "and_".concat(i) });
        // Connect appropriate select bits or their negations
        for (var bit = 0; bit < s; bit++) {
            var isSet = (i & (1 << bit)) !== 0;
            if (isSet) {
                edges.push({ source: "in_s".concat(bit), target: "and_".concat(i) });
            }
            else {
                edges.push({ source: "not_s".concat(bit), target: "and_".concat(i) });
            }
        }
    }
    // Final OR gate
    nodes.push({ id: "or_out", type: 'or', label: 'OR' });
    for (var i = 0; i < n; i++) {
        edges.push({ source: "and_".concat(i), target: "or_out" });
    }
    edges.push({ source: "or_out", target: "out_y" });
    return {
        moduleName: modName,
        inputs: inputs,
        outputs: outputs,
        nodes: nodes,
        edges: edges
    };
}
function generateParameterizedMuxTruthTable(params) {
    var n = params.inputCount || 2;
    var s = params.selectWidth || Math.ceil(Math.log2(n));
    var headers = [];
    for (var i = s - 1; i >= 0; i--)
        headers.push("Sel[".concat(i, "]"));
    headers.push('Selected Input', 'Output Y');
    var rows = [];
    var maxRows = Math.min(n, 16); // Truncate at 16 rows to prevent UI freezing
    for (var i = 0; i < maxRows; i++) {
        var row = [];
        for (var bit = s - 1; bit >= 0; bit--) {
            row.push(((i >> bit) & 1).toString());
        }
        row.push("D[".concat(i, "]"));
        row.push("D[".concat(i, "]"));
        rows.push(row);
    }
    if (n > 16) {
        rows.push(['...', '...', '...', '...']);
    }
    return {
        description: "".concat(n, "-to-1 Multiplexer Truth Table"),
        headers: headers,
        equation: "Y = D_{Sel[".concat(s - 1, ":0]}"),
        rows: rows
    };
}

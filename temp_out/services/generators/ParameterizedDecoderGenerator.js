"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateParameterizedDecoderDiagram = generateParameterizedDecoderDiagram;
exports.generateParameterizedDecoderTruthTable = generateParameterizedDecoderTruthTable;
function generateParameterizedDecoderDiagram(params, modName) {
    var type = params.type || 'decoder';
    var inputs = [];
    var outputs = [];
    var nodes = [];
    var edges = [];
    if (type === 'decoder') {
        var n = params.inputCount || 2;
        var m = params.outputCount || Math.pow(2, n);
        if (params.hasEnable) {
            inputs.push('en');
            nodes.push({ id: 'in_en', type: 'input', label: 'EN' });
        }
        for (var i = 0; i < n; i++) {
            inputs.push("a".concat(i));
            nodes.push({ id: "in_a".concat(i), type: 'input', label: "A".concat(i) });
            nodes.push({ id: "not_a".concat(i), type: 'not', label: 'NOT' });
            edges.push({ source: "in_a".concat(i), target: "not_a".concat(i) });
        }
        for (var i = 0; i < m; i++) {
            outputs.push("y".concat(i));
            nodes.push({ id: "out_y".concat(i), type: 'output', label: "Y".concat(i) });
            nodes.push({ id: "and_".concat(i), type: 'and', label: 'AND' });
            edges.push({ source: "and_".concat(i), target: "out_y".concat(i) });
            if (params.hasEnable)
                edges.push({ source: 'in_en', target: "and_".concat(i) });
            for (var bit = 0; bit < n; bit++) {
                if ((i & (1 << bit)) !== 0) {
                    edges.push({ source: "in_a".concat(bit), target: "and_".concat(i) });
                }
                else {
                    edges.push({ source: "not_a".concat(bit), target: "and_".concat(i) });
                }
            }
        }
    }
    else if (type === 'encoder') {
        var n = params.inputCount || 4;
        var m = params.outputCount || Math.ceil(Math.log2(n));
        for (var i = 0; i < n; i++) {
            inputs.push("d".concat(i));
            nodes.push({ id: "in_d".concat(i), type: 'input', label: "D".concat(i) });
        }
        outputs.push('v');
        nodes.push({ id: 'out_v', type: 'output', label: 'V' });
        nodes.push({ id: 'or_v', type: 'or', label: 'OR' });
        edges.push({ source: 'or_v', target: 'out_v' });
        for (var i = 0; i < n; i++) {
            edges.push({ source: "in_d".concat(i), target: 'or_v' });
        }
        for (var i = 0; i < m; i++) {
            outputs.push("y".concat(i));
            nodes.push({ id: "out_y".concat(i), type: 'output', label: "Y".concat(i) });
            nodes.push({ id: "or_".concat(i), type: 'or', label: 'OR' });
            edges.push({ source: "or_".concat(i), target: "out_y".concat(i) });
            for (var j = 0; j < n; j++) {
                if ((j & (1 << i)) !== 0) {
                    edges.push({ source: "in_d".concat(j), target: "or_".concat(i) });
                }
            }
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
function generateParameterizedDecoderTruthTable(params) {
    var type = params.type || 'decoder';
    if (type === 'decoder') {
        var n = params.inputCount || 2;
        var m = params.outputCount || Math.pow(2, n);
        var headers = [];
        if (params.hasEnable)
            headers.push('EN');
        for (var i = n - 1; i >= 0; i--)
            headers.push("A".concat(i));
        for (var i = m - 1; i >= 0; i--)
            headers.push("Y".concat(i));
        var rows = [];
        if (params.hasEnable) {
            var row = ['0'];
            for (var i = 0; i < n; i++)
                row.push('X');
            for (var i = 0; i < m; i++)
                row.push('0');
            rows.push(row);
        }
        var maxRows = Math.min(Math.pow(2, n), 16);
        for (var i = 0; i < maxRows; i++) {
            var row = [];
            if (params.hasEnable)
                row.push('1');
            for (var bit = n - 1; bit >= 0; bit--)
                row.push(((i >> bit) & 1).toString());
            for (var bit = m - 1; bit >= 0; bit--)
                row.push(bit === i ? '1' : '0');
            rows.push(row);
        }
        if (Math.pow(2, n) > 16)
            rows.push(Array(headers.length).fill('...'));
        return {
            description: "".concat(n, "-to-").concat(m, " Decoder Truth Table"),
            headers: headers,
            equation: 'Y_i = (A == i)',
            rows: rows
        };
    }
    else {
        // Encoder
        var n = params.inputCount || 4;
        var m = params.outputCount || Math.ceil(Math.log2(n));
        var isPriority = params.architecture === 'priority';
        var headers = [];
        for (var i = n - 1; i >= 0; i--)
            headers.push("D".concat(i));
        for (var i = m - 1; i >= 0; i--)
            headers.push("Y".concat(i));
        headers.push('V');
        var rows = [];
        var maxRows = Math.min(n, 16);
        var zeroRow = [];
        for (var i = 0; i < n; i++)
            zeroRow.push('0');
        for (var i = 0; i < m; i++)
            zeroRow.push('0');
        zeroRow.push('0');
        rows.push(zeroRow);
        for (var i = 0; i < maxRows; i++) {
            var row = [];
            for (var j = n - 1; j >= 0; j--) {
                if (j === i)
                    row.push('1');
                else if (isPriority && j < i)
                    row.push('X');
                else
                    row.push('0');
            }
            for (var bit = m - 1; bit >= 0; bit--) {
                row.push(((i >> bit) & 1).toString());
            }
            row.push('1');
            rows.push(row);
        }
        if (n > 16)
            rows.push(Array(headers.length).fill('...'));
        return {
            description: "".concat(n, "-to-").concat(m, " ").concat(isPriority ? 'Priority ' : '', "Encoder Truth Table"),
            headers: headers,
            equation: isPriority ? 'Y = max(i) where D_i == 1' : 'Y = i where D_i == 1',
            rows: rows
        };
    }
}

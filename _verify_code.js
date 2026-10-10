const fs = require('fs');
const html = fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/focus-code.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const js = m[1];

// Mock DOM
function makeEl(tag) {
    return {
        tag, className: '', textContent: '', children: [],
        appendChild(c) { this.children.push(c); return c; },
    };
}
const stage = { children: [], innerHTML: '', appendChild(c) { this.children.push(c); } };
const document = { createElement: t => makeEl(t), createTextNode: t => ({ text: t }) };

// Stub out event listeners + getElementById
const listeners = {};
const captured = {};
const window = {
    addEventListener: (ev, fn) => { listeners[ev] = fn; },
};
const getElementById = (id) => {
    if (id === 'stage') return stage;
    return makeEl('div');
};

const wrapped = `
const getElementById = ${getElementById.toString()};
const window = { addEventListener: () => {} };
${js}
return { renderCode, appendCodeLine, isCommentLine };
`;

const fn = new Function(wrapped);
const { renderCode, appendCodeLine, isCommentLine } = fn();

renderCode(`@RestController
@RequestMapping("/export-jobs")
@Validated
public class ExportJobController {

    // @Min(1) 验证 page
    public ExportJobPageVO list() {
        selectByPage();
    }
}`);

function dump(node, indent) {
    const pad = '  '.repeat(indent);
    if (node.className) {
        console.log(`${pad}<${node.tag} class="${node.className}">${JSON.stringify(node.textContent)}`);
    } else if (node.text !== undefined) {
        if (node.text !== '\n') console.log(`${pad}TXT ${JSON.stringify(node.text)}`);
    } else if (node.children) {
        node.children.forEach(c => dump(c, indent));
    }
}
console.log('--- rendered code pane ---');
stage.children.forEach(c => dump(c, 0));

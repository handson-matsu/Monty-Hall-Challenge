// No browser or network: execute the real scripts with a minimal DOM adapter.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
class Element {
  constructor() { this.children = []; this.dataset = {}; this.style = {}; this.value = ''; this.attributes = {}; this.listeners = {}; this.classList = { toggle() {} }; }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  add(option) { this.children.push(option); if (this.children.length === 1) this.value = String(option.value); }
  append(...children) { this.children.push(...children); }
  replaceChildren() { this.children = []; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  focus() {}
  querySelector(selector) {
    if (!selector.startsWith('.')) return this.children[0];
    if (!this.innerHTML.includes(`class="${selector.slice(1)}"`)) return null;
    this.parts ||= {};
    return this.parts[selector] ||= new Element();
  }
  get firstElementChild() { return this.children[0]; }
}
const elements = Object.fromEntries([...read('index.html').matchAll(/id="([^"]+)"/g)].map(m => [m[1], new Element()]));
const tabs = ['experience', 'challenge', 'simulation'].map(mode => { const e = new Element(); e.dataset.mode = mode; return e; });
elements['challenge-count'].value = '100';
elements.strategy.value = 'switch';
elements['simulation-count'].value = '10000';
let requests = 0;
const sandbox = vm.createContext({
  document: { getElementById: id => elements[id] || null, createElement: () => new Element(), querySelectorAll: () => tabs, body: new Element() },
  Option: function(text, value) { this.value = value; },
  setTimeout, clearTimeout,
  fetch: () => { requests++; return Promise.resolve(); },
});
vm.runInContext(read('logic.js'), sandbox, { filename: 'logic.js' });
vm.runInContext(read('app.js'), sandbox, { filename: 'app.js' });
assert.equal(elements.doors.children.length, 3, 'initial rendering');
assert.equal(elements['doors-count'].children.length, 18);
for (let n = 3; n <= 20; n++) {
  elements['doors-count'].value = String(n);
  elements['doors-count'].onchange();
  for (let first = 0; first < n; first++) for (const strategy of ['switch', 'stay']) {
    assert.equal(elements.doors.children.length, n);
    assert(elements.doors.children.every(door => !door.disabled));
    elements.doors.children[first].listeners.click();
    assert.equal(elements.doors.children.filter(door => door.className.includes(' opened')).length, n - 2);
    assert(elements.doors.children.every(door => door.disabled));
    elements.actions.children[strategy === 'switch' ? 0 : 1].onclick();
    assert.equal(elements.doors.children.filter(door => door.className.includes(' winner')).length, 1);
    assert.equal(elements.doors.children.filter(door => door.className.includes(' final-choice')).length, 1);
    const state = vm.runInContext('({ final: round.final, prize: round.prize })', sandbox);
    const chosen = elements.doors.children[state.final];
    assert.equal(chosen.querySelector('.door-marker').textContent, 'あなたが選んだドア');
    assert.equal(elements.instruction.textContent, state.final === state.prize ? '★ 当たり！' : '× ハズレ！');
    if (state.final !== first) assert.equal(elements.doors.children[first].querySelector('.door-marker').textContent, '最初に選んだドア');
    assert(elements.doors.children.every(door => !door.innerHTML.includes('>DOOR<')));
    assert.equal(elements.actions.children[0].textContent, '次へ →');
    elements.actions.children[0].onclick();
  }
  const stats = vm.runInContext('record()', sandbox);
  assert.equal(stats.stay.total, n);
  assert.equal(stats.switch.total, n);
}
assert.equal(requests, 1);
console.log('PASS: initialization, 3–20 rendered/selectable doors, all first choices and both strategies, final result, next round, records, single access request (DOM adapter; no browser/network).');

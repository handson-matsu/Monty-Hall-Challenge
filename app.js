'use strict';
const $ = id => document.getElementById(id);
const empty = () => ({ stay: { total: 0, wins: 0 }, switch: { total: 0, wins: 0 } });
let mode = 'experience', phase = 'pick', round, timer, completed = 0, challengeWins = 0;
const records = new Map();
const n = () => Number($('doors-count').value);
const key = () => `${mode}-${n()}`;
const record = () => { if (!records.has(key())) records.set(key(), empty()); return records.get(key()); };
const percent = (wins, total) => total ? `${(wins / total * 100).toFixed(1)}%` : '—';
for (let i = 3; i <= 20; i++) $('doors-count').add(new Option(`${i}個`, i));
function announce(text) { $('announcement').textContent = text; }
function setHeading(step, title, description) { $('step').textContent = step; $('instruction').textContent = title; $('description').textContent = description; announce(`${title}。${description}`); }
function updateProgress() {
  const total = Number($('challenge-count').value);
  $('progress-count').textContent = `${completed} / ${total}`;
  $('progress-wins').textContent = challengeWins;
  $('progress-losses').textContent = completed - challengeWins;
  $('progress-rate').textContent = percent(challengeWins, completed);
  $('progress-fill').style.width = `${completed / total * 100}%`;
}
function startRound() {
  clearTimeout(timer); phase = 'pick'; round = Monty.createRound(n());
  setHeading(mode === 'challenge' ? 'CHALLENGE / 最初のドアを選択' : 'STEP 01 / 03', '最初のドアを選ぼう', mode === 'challenge' ? `選んだ後は「${$('strategy').value === 'switch' ? '変更する' : '変更しない'}」戦略で自動判定します。` : '当たりは1つ。気になるドアをタップしてください。');
  $('actions').innerHTML = '<span class="action-hint">ドアを選ぶと、司会者がハズレを開けます</span>';
  renderDoors(); updateProgress();
}
function renderDoors() {
  // Presentation state only; game rules and record updates are unchanged.
  $('play-panel').dataset.phase = phase;
  $('play-panel').dataset.outcome = phase === 'result' ? (round.final === round.prize ? 'win' : 'loss') : '';
  $('doors').classList.toggle('many', n() > 5);
  $('doors').classList.toggle('three', n() === 3);
  $('doors').replaceChildren();
  for (let i = 0; i < n(); i++) {
    const selected = i === round.first;
    const opened = phase !== 'pick' && i !== round.first && i !== round.remaining;
    const revealed = phase === 'result' || phase === 'complete';
    const door = document.createElement('button');
    door.className = `door${selected ? ' selected' : ''}${opened ? ' opened' : ''}${phase !== 'pick' && i === round.remaining ? ' remaining' : ''}${revealed && i === round.prize ? ' winner' : ''}${revealed && i === round.final ? ' final-choice' : ''}`;
    door.disabled = phase !== 'pick';
    let label = opened ? 'ハズレ' : revealed ? (i === round.prize ? '当たり！' : 'ハズレ') : 'DOOR';
    door.innerHTML = `<span class="door-marker">${selected ? '最初の選択' : phase !== 'pick' && i === round.remaining ? '残ったドア' : '&nbsp;'}</span><span class="door-face"><span class="door-number">${String(i + 1).padStart(2, '0')}</span><span class="door-symbol">${opened || revealed ? (i === round.prize ? '★' : '×') : ''}</span><span class="door-label">${label}</span><span class="knob"></span></span><span class="door-bottom">${revealed && i === round.final ? '✓ 最終選択' : '&nbsp;'}</span>`;
    door.setAttribute('aria-label', `ドア${i + 1}${selected ? '、最初の選択' : ''}${opened || revealed ? `、${label}` : ''}${revealed && i === round.final ? '、最終選択' : ''}`);
    door.addEventListener('click', () => pick(i)); $('doors').append(door);
  }
}
function button(text, className, action) { const b = document.createElement('button'); b.textContent = text; b.className = className; b.onclick = action; return b; }
function pick(i) {
  if (phase !== 'pick') return;
  Monty.choose(round, i); phase = 'decision'; renderDoors();
  setHeading('STEP 02 / 03', 'そのまま？ それとも変更？', `司会者が${n() - 2}個のハズレを開けました。閉じたドアはあと2つ。`);
  $('actions').replaceChildren();
  if (mode === 'challenge') { $('actions').textContent = '司会者がハズレを開けました…'; timer = setTimeout(() => resolve($('strategy').value), 650); }
  else { $('actions').append(button('変更する →', 'primary', () => resolve('switch')), button('変更しない', 'secondary', () => resolve('stay'))); $('actions').firstElementChild.focus({ preventScroll: true }); }
}
function resolve(strategy) {
  if (phase !== 'decision') return;
  const win = Monty.finish(round, strategy); phase = 'result';
  const stats = record()[strategy]; stats.total++; stats.wins += Number(win);
  if (mode === 'challenge') { completed++; challengeWins += Number(win); updateProgress(); }
  renderDoors(); renderResults();
  setHeading('STEP 03 / 03', win ? '当たり！ おめでとう。' : '今回はハズレ。', `ドア${round.prize + 1}が当たりでした。あなたは${strategy === 'switch' ? '変更する' : '変更しない'}戦略を選択しました。`);
  $('actions').replaceChildren();
  if (mode === 'challenge') {
    if (completed >= Number($('challenge-count').value)) { phase = 'complete'; setHeading('CHALLENGE COMPLETE', 'チャレンジ完了！', `${completed}回中${challengeWins}回当たり。勝率は${percent(challengeWins, completed)}でした。`); $('actions').append(button('もう一度チャレンジ ↺', 'primary', resetSession)); }
    else { $('actions').textContent = '次の試行へ…'; timer = setTimeout(() => { startRound(); $('doors').querySelector('button').focus({ preventScroll: true }); }, 1000); }
  } else { $('actions').append(button('次へ →', 'primary', () => { startRound(); $('doors').querySelector('button').focus({ preventScroll: true }); })); $('actions').firstElementChild.focus({ preventScroll: true }); }
}
function renderResults() {
  const data = record();
  $('record-context').textContent = `${n()}ドア · ${mode === 'simulation' ? '直近の一括シミュレーション' : mode === 'challenge' ? '連続チャレンジの累計' : '体験モードの累計'}（モード・ドア数ごとに集計）`;
  $('result-grid').innerHTML = ['stay', 'switch'].map(strategy => {
    const s = data[strategy], theory = (strategy === 'stay' ? 1 : n() - 1) / n() * 100, rate = s.total ? s.wins / s.total * 100 : 0;
    return `<article class="result-card ${strategy}"><div class="card-title"><h3>${strategy === 'stay' ? '変更しない' : '変更する'}</h3><span>${strategy === 'stay' ? 'STAY' : 'SWITCH'}</span></div><div class="rate"><strong>${percent(s.wins, s.total)}</strong><span>実験の勝率</span></div><div class="comparison" aria-label="実験値 ${percent(s.wins, s.total)}、理論値 ${theory.toFixed(1)}%"><div style="width:${rate}%"></div><i style="left:${theory}%"></i></div><div class="theory">理論値 <strong>${theory.toFixed(1)}%</strong><span>${strategy === 'stay' ? '1' : n() - 1} / ${n()}</span></div><div class="counts"><span>当たり <b>${s.wins.toLocaleString()}</b> 回</span><span>ハズレ <b>${(s.total - s.wins).toLocaleString()}</b> 回</span><span>計 ${s.total.toLocaleString()} 回</span></div></article>`;
  }).join('');
}
function resetSession() { clearTimeout(timer); completed = 0; challengeWins = 0; if (mode !== 'simulation') startRound(); renderResults(); }
function changeMode(next) {
  mode = next; clearTimeout(timer);
  document.body.dataset.mode = mode;
  document.querySelectorAll('.tab').forEach(t => { const active = t.dataset.mode === mode; t.classList.toggle('active', active); t.setAttribute('aria-pressed', active); });
  $('play-panel').hidden = mode === 'simulation'; $('simulation-panel').hidden = mode !== 'simulation'; $('challenge-settings').hidden = mode !== 'challenge'; $('simulation-settings').hidden = mode !== 'simulation'; $('challenge-progress').hidden = mode !== 'challenge';
  $('settings-hint').hidden = mode !== 'experience'; resetSession();
}
document.querySelectorAll('.tab').forEach(t => t.onclick = () => changeMode(t.dataset.mode));
$('doors-count').onchange = () => { resetSession(); $('simulation-status').textContent = '設定した条件で実行してください。'; };
$('strategy').onchange = resetSession; $('challenge-count').onchange = resetSession;
$('reset').onclick = () => { records.set(key(), empty()); resetSession(); announce('現在のモードとドア数の記録をリセットしました。'); };
$('run-simulation').onclick = () => { const count = Number($('simulation-count').value); records.set(key(), Monty.simulate(n(), count)); renderResults(); $('simulation-status').textContent = `${n()}ドアで各戦略 ${count.toLocaleString()}回の実験が完了しました。下の記録で比較できます。`; };
changeMode('experience');

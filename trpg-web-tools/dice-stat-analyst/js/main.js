const $ = id => document.getElementById(id);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const TAB = String.fromCharCode(9);

const state = {
  rolls: [],
  filteredLines: [],
  hiddenCharacters: new Set(),
  sort: { key: 'index', direction: 'asc' },
  showCharacterControls: false,
  inputPanelMode: 'auto',
  dark: false
};

const diceCommands = [
  'SRESB',
  'RESB',
  'SCCB',
  'SCBR',
  'SCC',
  'CCB',
  'CBR',
  'CC',
  'S1D100',
  '1D100',
  'SD100',
  'D100',
  'D％',
  'D%'
];

const includedTabs = ['main', 'メイン', 'ho'];
const excludedTabs = ['雑談', 'other', 'info', 'おはらい', 'お祓い', '運試し'];

bindEvents();
render();

function bindEvents() {
  $('themeToggleBtn').addEventListener('click', toggleTheme);
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchTab(button));
  });
  document.querySelectorAll('button[data-sort-key]').forEach(button => {
    button.addEventListener('click', () => toggleSort(button.dataset.sortKey));
  });

  $('fileInput').addEventListener('change', handleFileInput);
  $('inputToggleBtn').addEventListener('click', toggleInputPanel);
  $('characterControlToggleBtn').addEventListener('click', () => {
    state.showCharacterControls = !state.showCharacterControls;
    renderCharacterControls();
  });
  $('summaryShotBtn').addEventListener('click', enterScreenshotMode);
  $('screenshotExitBtn').addEventListener('click', exitScreenshotMode);
  document.addEventListener('keydown', handleGlobalKeydown);
  $('analyzeBtn').addEventListener('click', analyze);
  $('clearBtn').addEventListener('click', clearAll);
}

function switchTab(button) {
  document.querySelectorAll('.tab-button').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(item => item.classList.remove('active'));

  button.classList.add('active');
  $(button.dataset.tab).classList.add('active');
}

async function handleFileInput(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  $('rawInput').value = await file.text();
  state.inputPanelMode = 'auto';
  analyze();
}

function toggleInputPanel() {
  const collapsed = $('appLayout').classList.contains('input-collapsed');
  state.inputPanelMode = collapsed ? 'open' : 'collapsed';
  applyInputPanelLayout();
}

function clearAll() {
  $('fileInput').value = '';
  $('rawInput').value = '';
  state.rolls = [];
  state.filteredLines = [];
  state.hiddenCharacters = new Set();
  state.showCharacterControls = false;
  state.inputPanelMode = 'auto';
  render();
}

function toggleTheme() {
  state.dark = !state.dark;
  syncThemeSwitch();
}

function syncThemeSwitch() {
  document.body.classList.toggle('dark', state.dark);

  const button = $('themeToggleBtn');
  button.setAttribute('aria-pressed', state.dark ? 'true' : 'false');
  button.setAttribute('title', state.dark ? 'ライトモードに切替' : 'ナイトモードに切替');
  button.setAttribute('aria-label', state.dark ? 'ライトモードに切替' : 'ナイトモードに切替');
}

function analyze() {
  state.inputPanelMode = 'auto';

  const lines = normalizeNewlines(prepareText($('rawInput').value || ''))
    .split(LF)
    .map(cleanLine)
    .filter(Boolean);

  const filtered = filterLines(lines);
  const rolls = extractRollData(filtered);

  state.filteredLines = filtered;
  state.rolls = rolls;

  applyDefaultCharacterVisibility(rolls);
  render();
}

function prepareText(raw) {
  const source = String(raw || '');
  if (!looksLikeHtml(source)) return source;

  const doc = new DOMParser().parseFromString(source, 'text/html');
  if (!doc.body) return source;

  const lines = extractHtmlLogLines(doc);
  return lines.length
    ? lines.join(LF)
    : decodeHtml(doc.body.innerText || doc.body.textContent || source);
}

function extractHtmlLogLines(doc) {
  return Array.from(doc.body.querySelectorAll('p'))
    .map(extractHtmlLogLine)
    .filter(Boolean);
}

function extractHtmlLogLine(paragraph) {
  const spans = Array.from(paragraph.querySelectorAll('span'))
    .map(span => cleanLine(decodeHtml(span.textContent || '')))
    .filter(Boolean);

  return spans.length >= 3 && isTabLabel(spans[0])
    ? `${spans[0]} ${spans[1]}：${spans.slice(2).join(' ')}`
    : cleanLine(decodeHtml(paragraph.textContent || ''));
}

function filterLines(lines) {
  return lines.filter(line => {
    if (isRuleExplanationLine(line)) return false;
    if ($('dropTabs').checked && !shouldKeepTabLine(line)) return false;
    if ($('onlyD100').checked && !looksLikeD100Roll(line)) return false;
    return true;
  });
}

function shouldKeepTabLine(line) {
  const tab = extractLeadingTab(line);
  return !tab || isIncludedTab(tab);
}

function isIncludedTab(tab) {
  const normalized = normalizeTabName(tab);
  if (!normalized) return true;

  if (excludedTabs.some(word => normalized.includes(normalizeTabName(word)))) return false;
  if (normalized === 'ho' || normalized.startsWith('ho')) return true;

  return includedTabs.some(word => {
    const item = normalizeTabName(word);
    return normalized === item || normalized.startsWith(item) || normalized.includes(item);
  });
}

function extractRollData(lines) {
  const rolls = [];
  let currentCharacter = '';

  lines.forEach((line, index) => {
    const name = extractCharacterName(line);
    const usable = isUsableCharacterName(name);
    const values = extractRollsFromLine(line);

    if (usable) currentCharacter = name;

    values.forEach(value => {
      rolls.push({
        value,
        character: usable ? name : (currentCharacter || '不明'),
        line,
        lineNo: index + 1
      });
    });
  });

  return rolls;
}

function extractCharacterName(line) {
  const text = String(line || '').trim();
  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return '不明';

  let before = text.slice(0, diceIndex).trim();
  if (!before) return '不明';

  before = trimTrailingSeparators(trimTrailingRollPrefix(removeLeadingTab(before)));
  return cleanCharacterName(before);
}

function extractRollsFromLine(line) {
  const text = String(line || '');
  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return [];

  const afterCommand = text.slice(diceIndex);
  const numbers = extractNumbersAfterResultMarkers(afterCommand);
  if (numbers.length) return [numbers[0]];

  return extractNumbersAfterWords(afterCommand, ['出目']).slice(0, 1);
}

function findDiceCommandIndex(text) {
  const upper = String(text || '').toUpperCase();
  const indexes = [];

  diceCommands.forEach(command => {
    let from = 0;

    while (from < upper.length) {
      const index = upper.indexOf(command, from);
      if (index < 0) break;

      const prev = index > 0 ? upper[index - 1] : '';
      if (!prev || !isAsciiAlphaNumber(prev)) indexes.push(index);

      from = index + command.length;
    }
  });

  return indexes.length ? Math.min(...indexes) : -1;
}

function extractNumbersAfterResultMarkers(text) {
  const values = [];
  const markers = ['＞', '>', '→'];

  for (let i = 0; i < text.length; i++) {
    if (!markers.includes(text[i])) continue;

    const number = readRollResultNumberFrom(text, i + 1);
    if (number !== null && number >= 1 && number <= 100) {
      values.push(number);
    }
  }

  return values;
}

function readRollResultNumberFrom(text, start) {
  let i = start;

  while (i < text.length && isWhitespace(text[i])) i++;
  if (i >= text.length || text[i] < '0' || text[i] > '9') return null;

  let digits = '';

  while (i < text.length && text[i] >= '0' && text[i] <= '9') {
    digits += text[i++];
  }

  if (['d', 'D', 'Ｄ', 'ｄ'].includes(text[i] || '')) return null;

  return isValidRollResultTail(text.slice(i)) ? Number(digits) : null;
}

function isValidRollResultTail(tail) {
  const text = String(tail || '').trim();
  const lower = text.toLowerCase();

  return !text
    || ['＞', '>', '→', '#'].some(marker => text.startsWith(marker))
    || ['成功', '失敗', '決定的成功', '致命的失敗', 'クリティカル', 'ファンブル'].some(word => text.startsWith(word))
    || lower.startsWith('success')
    || lower.startsWith('fail');
}

function extractNumbersAfterWords(text, words) {
  const lower = String(text || '').toLowerCase();
  const values = [];

  words.forEach(word => {
    const index = lower.indexOf(String(word).toLowerCase());
    if (index < 0) return;

    const number = readNumberFrom(text, index + String(word).length);
    if (number !== null && number >= 1 && number <= 100) {
      values.push(number);
    }
  });

  return values;
}

function readNumberFrom(text, start) {
  let digits = '';

  for (let i = start; i < text.length; i++) {
    const character = text[i];

    if (character >= '0' && character <= '9') {
      digits += character;
    } else if (digits) {
      break;
    }
  }

  return digits ? Number(digits) : null;
}

function extractTargetNumber(line) {
  const text = String(line || '')
    .replaceAll('＜=', '<=')
    .replaceAll('≦', '<=')
    .replaceAll('＝', '=')
    .toUpperCase();

  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return null;

  const part = text.slice(diceIndex, diceIndex + 120);
  let operatorIndex = part.indexOf('<=');
  let offset = 2;

  if (operatorIndex < 0) {
    operatorIndex = part.indexOf('<');
    offset = 1;
  }

  if (operatorIndex < 0) return null;

  const value = readNumberFrom(part, operatorIndex + offset);
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
}

function classify(value) {
  const crit = clamp(Number($('critMax').value || 5), 1, 100);
  const fumble = clamp(Number($('fumbleMin').value || 96), 1, 100);

  if (value <= crit) return 'Critical';
  if (value >= fumble) return 'Fumble';
  return 'Normal';
}

function classifyRoll(roll) {
  const base = classify(roll.value);
  if (base === 'Critical' || base === 'Fumble') return base;

  const line = String(roll.line || '');
  const lower = line.toLowerCase();

  const fail = line.includes('失敗')
    || lower.includes('failure')
    || lower.includes('fail');

  const success = line.includes('成功')
    || line.includes('スペシャル')
    || line.includes('イクストリーム')
    || line.includes('ハード')
    || line.includes('レギュラー')
    || lower.includes('success');

  if (fail) return 'Fail';
  if (success) return 'Success';

  const target = extractTargetNumber(line);
  return target !== null
    ? roll.value <= target ? 'Success' : 'Fail'
    : 'Normal';
}

function getOutcomeCounts(rolls) {
  const counts = {
    critical: 0,
    fumble: 0,
    success: 0,
    fail: 0,
    normal: 0
  };

  rolls.forEach(roll => {
    const label = classifyRoll(roll);

    if (label === 'Critical') {
      counts.critical++;
      counts.success++;
    } else if (label === 'Fumble') {
      counts.fumble++;
      counts.fail++;
    } else if (label === 'Success') {
      counts.success++;
    } else if (label === 'Fail') {
      counts.fail++;
    } else {
      counts.normal++;
    }
  });

  return counts;
}

function classificationOrder(label) {
  return {
    Critical: 1,
    Success: 2,
    Normal: 3,
    Fail: 4,
    Fumble: 5
  }[label] || 99;
}

function applyDefaultCharacterVisibility(rolls) {
  const characters = getDetectedCharactersFromRolls(rolls);
  const grouped = groupRollsByCharacter(rolls);
  const threshold = clamp(Number($('autoHideMaxRolls').value || 15), 0, 999);
  const hidden = new Set();

  characters.forEach(name => {
    const count = grouped[name] ? grouped[name].length : 0;
    if (count <= threshold) hidden.add(name);
  });

  state.hiddenCharacters = hidden;
}

function getVisibleRolls() {
  return state.rolls.filter(roll => !state.hiddenCharacters.has(roll.character || '不明'));
}

function getDetectedCharacters() {
  return getDetectedCharactersFromRolls(state.rolls);
}

function getDetectedCharactersFromRolls(rolls) {
  return [...new Set(rolls.map(roll => roll.character || '不明'))]
    .sort(compareCharacterNames);
}

function groupRollsByCharacter(rolls) {
  return rolls.reduce((acc, roll) => {
    const name = roll.character || '不明';
    (acc[name] ||= []).push(roll);
    return acc;
  }, {});
}

function compareCharacterNames(a, b) {
  if (a === '不明') return 1;
  if (b === '不明') return -1;
  return String(a).localeCompare(String(b), 'ja');
}

function toggleSort(key) {
  if (state.sort.key === key) {
    state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort = { key, direction: 'asc' };
  }

  renderTable();
}

function getSortedVisibleRolls() {
  const direction = state.sort.direction === 'desc' ? -1 : 1;
  const rolls = getVisibleRolls().map((roll, index) => ({
    ...roll,
    originalIndex: index
  }));

  rolls.sort((a, b) => {
    let result = state.sort.key === 'character'
      ? compareCharacterNames(a.character || '不明', b.character || '不明')
      : state.sort.key === 'value'
        ? a.value - b.value
        : state.sort.key === 'classification'
          ? classificationOrder(classifyRoll(a)) - classificationOrder(classifyRoll(b))
          : a.originalIndex - b.originalIndex;

    if (result === 0) result = a.originalIndex - b.originalIndex;
    return result * direction;
  });

  return rolls;
}

function render() {
  renderCharacterControls();
  renderSummary();
  renderCharacterSummary();
  renderChart();
  renderTable();
  applyInputPanelLayout();
}

function renderSummary() {
  const rolls = getVisibleRolls();
  const total = rolls.length;
  const values = rolls.map(roll => roll.value);
  const outcome = getOutcomeCounts(rolls);
  const average = total
    ? values.reduce((a, b) => a + b, 0) / total
    : null;

  $('totalRolls').textContent = total;
  $('successFailCount').textContent = `${outcome.success} / ${outcome.fail}`;
  $('successFailRate').textContent = `${rate(outcome.success, total)}% / ${rate(outcome.fail, total)}%`;
  $('critFumbleCount').textContent = `${outcome.critical} / ${outcome.fumble}`;
  $('critFumbleRate').textContent = `${rate(outcome.critical, total)}% / ${rate(outcome.fumble, total)}%`;
  $('averageRoll').textContent = average === null ? '-' : average.toFixed(2);

  if (!total) {
    $('summaryMemo').textContent = state.rolls.length
      ? '表示対象のロールがありません。キャラクターのチェックを戻してください。'
      : 'ログデータを選択ください。';
    return;
  }

  const all = state.rolls.length;
  const hidden = all - total;
  const characters = getDetectedCharacters().length;

  $('summaryMemo').textContent =
    `検出した${all}件のd100ロールのうち、表示対象${total}件を集計しました。`
    + `検出キャラクター数は${characters}です。`
    + `非表示ロール数は${hidden}件です。`
    + `総ロール数${$('autoHideMaxRolls').value}以下のキャラクターは初期状態で非表示です。`
    + `クリティカル判定は${$('critMax').value}以下、ファンブル判定は${$('fumbleMin').value}以上です。`;
}

function renderCharacterControls() {
  const box = $('characterControls');
  const button = $('characterControlToggleBtn');
  const characters = getDetectedCharacters();

  if (!box) return;

  box.classList.toggle('visible', state.showCharacterControls);

  if (button) {
    button.textContent = state.showCharacterControls
      ? '表示キャラ設定を隠す'
      : '表示キャラ設定を開く';
  }

  if (!characters.length) {
    box.innerHTML = '';
    if (button) button.style.display = 'none';
    return;
  }

  if (button) button.style.display = 'inline-flex';

  box.innerHTML = characters.map(name => {
    const checked = state.hiddenCharacters.has(name) ? '' : 'checked';
    const count = state.rolls.filter(roll => (roll.character || '不明') === name).length;

    return `<label class="character-toggle"><input type="checkbox" data-character="${escapeAttribute(name)}" ${checked}>${escapeHtml(name)} (${count})</label>`;
  }).join('');

  box.querySelectorAll('input[data-character]').forEach(input => {
    input.addEventListener('change', () => {
      const name = input.getAttribute('data-character') || '不明';

      if (input.checked) {
        state.hiddenCharacters.delete(name);
      } else {
        state.hiddenCharacters.add(name);
      }

      state.inputPanelMode = state.inputPanelMode === 'open' ? 'open' : 'auto';
      render();
    });
  });
}

function renderCharacterSummary() {
  const box = $('characterSummary');
  if (!box) return;

  const grouped = groupRollsByCharacter(getVisibleRolls());
  const names = Object.keys(grouped).sort(compareCharacterNames);

  box.innerHTML = names.length
    ? names.map(name => renderCharacterCard(name, grouped[name])).join('')
    : '<div class="card"><p class="note">表示対象のキャラクターがありません。キャラクターのチェックを戻してください。</p></div>';
}

function renderCharacterCard(name, rolls) {
  const values = rolls.map(roll => roll.value);
  const total = values.length;
  const outcome = getOutcomeCounts(rolls);
  const average = total
    ? values.reduce((a, b) => a + b, 0) / total
    : 0;

  return `
    <div class="card character-card">
      <h3>${escapeHtml(name)}</h3>
      <div class="mini-stats">
        <div class="mini-stat">
          <div class="label">総ロール</div>
          <div class="value">${total}</div>
        </div>
        <div class="mini-stat">
          <div class="label">平均出目</div>
          <div class="value">${average.toFixed(2)}</div>
        </div>
        <div class="mini-stat">
          <div class="label">成功 / 失敗</div>
          <div class="value">${outcome.success} / ${outcome.fail}</div>
          <div class="label">${rate(outcome.success, total)}% / ${rate(outcome.fail, total)}%</div>
        </div>
        <div class="mini-stat">
          <div class="label">クリティカル / ファンブル</div>
          <div class="value">${outcome.critical} / ${outcome.fumble}</div>
          <div class="label">${rate(outcome.critical, total)}% / ${rate(outcome.fumble, total)}%</div>
        </div>
      </div>
      ${renderBins(values)}
    </div>
  `;
}

function renderChart() {
  const box = $('barChart');
  if (!box) return;

  const grouped = groupRollsByCharacter(getVisibleRolls());
  const names = Object.keys(grouped).sort(compareCharacterNames);

  box.innerHTML = names.length
    ? names.map(name => `
      <div class="card" style="margin-bottom:12px;">
        <h3>${escapeHtml(name)}</h3>
        ${renderBins(grouped[name].map(roll => roll.value))}
      </div>
    `).join('')
    : '<p class="note">表示対象のロールがありません。</p>';
}

function renderBins(values) {
  const bins = Array.from({ length: 10 }, (_, index) => ({
    label: `${index * 10 + 1}-${index * 10 + 10}`,
    count: 0
  }));

  values.forEach(value => {
    bins[Math.min(9, Math.floor((value - 1) / 10))].count++;
  });

  const max = Math.max(1, ...bins.map(bin => bin.count));
  const total = values.length;

  return bins.map(bin => `
    <div class="chart-row">
      <div>${bin.label}</div>
      <div class="bar-wrap">
        <div class="bar" style="width:${(bin.count / max) * 100}%"></div>
      </div>
      <div>${bin.count}件 / ${rate(bin.count, total)}%</div>
    </div>
  `).join('');
}

function renderTable() {
  $('rollTableBody').innerHTML = getSortedVisibleRolls().map((roll, index) => {
    const label = classifyRoll(roll);
    const pill = label === 'Critical'
      ? 'crit'
      : label === 'Fumble'
        ? 'fumble'
        : label === 'Success'
          ? 'success'
          : label === 'Fail'
            ? 'fail'
            : 'normal';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(roll.character || '不明')}</td>
        <td><strong>${roll.value}</strong></td>
        <td><span class="pill ${pill}">${label}</span></td>
        <td>${escapeHtml(roll.line)}</td>
      </tr>
    `;
  }).join('');
}

function applyInputPanelLayout() {
  const layout = $('appLayout');
  const button = $('inputToggleBtn');

  if (!layout || !button) return;

  const count = Object.keys(groupRollsByCharacter(getVisibleRolls()))
    .filter(name => name !== '不明')
    .length;

  const collapse = state.inputPanelMode === 'collapsed'
    || (state.inputPanelMode === 'auto' && count >= 4);

  layout.classList.toggle('input-collapsed', collapse);
  button.textContent = collapse ? '⇥' : '⇤';
  button.title = collapse ? '入力パネルを開く' : '入力パネルを畳む';
}

function enterScreenshotMode() {
  document.body.classList.add('screenshot-mode');
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

function exitScreenshotMode() {
  document.body.classList.remove('screenshot-mode');
}

/*
  Keyboard Shortcuts / ショートカット設定

  Alt + O / Ctrl + Shift + O / Cmd + Shift + O : Choose File
  Alt + T / Ctrl + Shift + T / Cmd + Shift + T : Theme Toggle
  Alt + S / Ctrl + Shift + S / Cmd + Shift + S : Screenshot View
  Esc                                         : Exit Screenshot View
*/
function handleGlobalKeydown(event) {
  const key = String(event.key || '').toLowerCase();
  const altOnly = event.altKey && !event.ctrlKey && !event.metaKey;
  const commandShift = (event.ctrlKey || event.metaKey) && event.shiftKey;
  const isScreenshotMode = document.body.classList.contains('screenshot-mode');

  if (event.key === 'Escape') {
    event.preventDefault();

    if (isScreenshotMode) {
      exitScreenshotMode();
    } else {
      clearAll();
    }

    return;
  }

  if ((altOnly || commandShift) && key === 'o') {
    event.preventDefault();
    $('fileInput').click();
    return;
  }

  if ((altOnly || commandShift) && key === 't') {
    event.preventDefault();
    toggleTheme();
    return;
  }

  if ((altOnly || commandShift) && key === 's') {
    event.preventDefault();

    if (isScreenshotMode) {
      exitScreenshotMode();
    } else {
      enterScreenshotMode();
    }
  }
}

function looksLikeHtml(value) {
  const source = String(value || '').toLowerCase();
  return ['<html', '<body', '<p', '<span', '<div', '<br', '&lt;', '&gt;']
    .some(token => source.includes(token));
}

function looksLikeD100Roll(line) {
  if (isRuleExplanationLine(line)) return false;
  if (findDiceCommandIndex(line) >= 0 && hasRollResultMarker(line)) return true;

  return hasAnyText(line, [
    '出目',
    '決定的成功',
    '致命的失敗',
    'ファンブル',
    'クリティカル'
  ]);
}

function hasRollResultMarker(line) {
  const text = String(line || '');
  const diceIndex = findDiceCommandIndex(text);

  if (diceIndex < 0) return false;

  return extractNumbersAfterResultMarkers(text.slice(diceIndex)).length > 0;
}

function isRuleExplanationLine(line) {
  const text = String(line || '').trim();
  const tab = normalizeTabName(extractLeadingTab(text));
  const body = removeLeadingTab(text).trim();
  const compact = normalizeTabName(body);

  if (tab === 'info' || tab.includes('info')) return true;
  if (tab.includes('ルール')) return true;
  if (body.startsWith('ルール説明：') || body.startsWith('ルール説明:')) return true;
  if (body.startsWith('【7版ルール】') || body.startsWith('[7版ルール]')) return true;
  if (compact.startsWith('7版ルール')) return true;

  return false;
}

function normalizeNewlines(value) {
  return String(value || '')
    .replaceAll(CR + LF, LF)
    .replaceAll(CR, LF);
}

function cleanLine(line) {
  let source = String(line || '');

  [
    String.fromCharCode(8203),
    String.fromCharCode(8204),
    String.fromCharCode(8205),
    String.fromCharCode(65279)
  ].forEach(character => {
    source = source.replaceAll(character, '');
  });

  source = source
    .replaceAll('&nbsp;', ' ')
    .replaceAll('│', '|')
    .replaceAll('┃', '|')
    .replaceAll('｜', '|')
    .replaceAll('　', ' ')
    .replaceAll(TAB, ' ');

  while (source.includes('  ')) {
    source = source.replaceAll('  ', ' ');
  }

  return source.trim();
}

function decodeHtml(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function isTabLabel(value) {
  const source = String(value || '').trim();
  return source.startsWith('[') && source.endsWith(']');
}

function extractLeadingTab(line) {
  const source = String(line || '').trim();

  if (!source.startsWith('[')) return '';

  const end = source.indexOf(']');
  return end >= 0 ? source.slice(1, end) : '';
}

function normalizeTabName(tab) {
  return String(tab || '')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '')
    .replaceAll('　', '')
    .replaceAll(TAB, '');
}

function removeLeadingTab(value) {
  const source = String(value || '').trim();

  if (!source.startsWith('[')) return source;

  const end = source.indexOf(']');
  return end >= 0 ? source.slice(end + 1).trim() : source;
}

function trimTrailingSeparators(value) {
  let source = String(value || '').trim();
  const separators = [':', '：', '-', '―', '＞', '>', '(', '（'];

  while (source && separators.includes(source[source.length - 1])) {
    source = source.slice(0, -1).trim();
  }

  return source;
}

function trimTrailingRollPrefix(value) {
  let source = String(value || '')
    .trim()
    .replaceAll('×', 'x')
    .replaceAll('Ｘ', 'x')
    .replaceAll('ｘ', 'x');

  const lower = source.toLowerCase();
  const index = lower.lastIndexOf('x');

  if (index < 0) return source;

  const tail = lower.slice(index + 1).trim();

  if (!tail || tail.split('').some(character => character < '0' || character > '9')) {
    return source;
  }

  return trimTrailingSeparators(source.slice(0, index).trim()) || source;
}

function cleanCharacterName(name) {
  let source = String(name || '');

  ['[', ']', '「', '」', '『', '』', '【', '】'].forEach(character => {
    source = source.replaceAll(character, '');
  });

  return source.trim() || '不明';
}

function isUsableCharacterName(name) {
  const source = String(name || '').trim();

  if (!source || source === '不明') return false;
  if (['(', ')', '（', '）'].includes(source)) return false;

  return source
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replaceAll('（', '')
    .replaceAll('）', '')
    .trim() !== '';
}

function isAsciiAlphaNumber(character) {
  return (character >= 'A' && character <= 'Z')
    || (character >= '0' && character <= '9');
}

function isWhitespace(character) {
  return character === ' '
    || character === '　'
    || character === TAB
    || character === LF
    || character === CR;
}

function hasAnyText(value, terms) {
  const source = String(value || '').toLowerCase();
  return terms.some(term => source.includes(String(term).toLowerCase()));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rate(count, total) {
  return total ? ((count / total) * 100).toFixed(2) : '0.00';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[match]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

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

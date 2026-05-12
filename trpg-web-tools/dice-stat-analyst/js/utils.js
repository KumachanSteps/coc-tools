const $ = id => document.getElementById(id);

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const TAB = String.fromCharCode(9);

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

function hasAnyText(value, terms) {
  const source = String(value || '').toLowerCase();
  return terms.some(term => source.includes(String(term).toLowerCase()));
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

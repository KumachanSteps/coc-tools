let gmCount = 0;
let playerCount = 0;
let lastRawGeneratedText = '';
let rawManualDecorations = '';
let isResetting = false;

const $ = id => document.getElementById(id);

const fontVariantMaps = {
  sansBoldItalic: { upper: 0x1D63C, lower: 0x1D656, digit: 0x1D7EC },
  sansBold: { upper: 0x1D5D4, lower: 0x1D5EE, digit: 0x1D7EC },
  sansItalic: { upper: 0x1D608, lower: 0x1D622, digit: null },
  serifBoldItalic: { upper: 0x1D468, lower: 0x1D482, digit: 0x1D7CE },
  serifBold: { upper: 0x1D400, lower: 0x1D41A, digit: 0x1D7CE },
  serifItalic: {
    upper: 0x1D434,
    lower: 0x1D44E,
    digit: null,
    lowerExceptions: { h: 'ℎ' }
  },
  smallCaps: {
    chars: {
      A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ꜰ', G: 'ɢ', H: 'ʜ', I: 'ɪ',
      J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ', N: 'ɴ', O: 'ᴏ', P: 'ᴘ', Q: 'ꞯ',
      R: 'ʀ', S: 'ꜱ', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x', Y: 'ʏ', Z: 'ᴢ',
      a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
      j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ꞯ',
      r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
    }
  },
  typewriter: { upper: 0x1D670, lower: 0x1D68A, digit: 0x1D7F6 },
  modernSans: { upper: 0x1D5A0, lower: 0x1D5BA, digit: 0x1D7E2 }
};

const systemMaps = {
  normal: {
    call_of_cthulhu: 'Call of Cthulhu',
    coc: 'CoC',
    coc6: 'CoC6',
    coc7: 'CoC7',
    new_coc: '新クトゥルフ神話TRPG',
    emoklore_en: 'emoklore-trpg',
    emoklore_ja: 'エモクロアTRPG',
    madamisu: 'マーダーミステリー'
  },
  short: {
    call_of_cthulhu: 'Call of Cthulhu',
    coc: 'CoC',
    coc6: 'CoC6',
    coc7: 'CoC7',
    new_coc: '新クトゥルフ神話TRPG',
    emoklore_en: 'emoklore-trpg',
    emoklore_ja: 'エモクロアTRPG',
    madamisu: 'マーダーミステリー'
  },
  lower: {
    call_of_cthulhu: 'ᴄᴀʟʟ ᴏꜰ ᴄᴛʜᴜʟʜᴜ',
    coc: 'ᴄᴏᴄ',
    coc6: 'ᴄᴏᴄ𝟨',
    coc7: 'ᴄᴏᴄ𝟩',
    new_coc: '新クトゥルフ神話TRPG',
    emoklore_en: 'emoklore-trpg',
    emoklore_ja: 'エモクロアTRPG',
    madamisu: 'マーダーミステリー'
  },
  bold: {
    call_of_cthulhu: '𝐂𝐚𝐥𝐥 𝐨𝐟 𝐂𝐭𝐡𝐮𝐥𝐡𝐮',
    coc: '𝐂𝐨𝐂',
    coc6: '𝐂𝐨𝐂𝟔',
    coc7: '𝐂𝐨𝐂𝟕',
    new_coc: '新クトゥルフ神話TRPG',
    emoklore_en: 'emoklore-trpg',
    emoklore_ja: 'エモクロアTRPG',
    madamisu: 'マーダーミステリー'
  }
};

const protectedTokens = [
  '探索者A',
  '探索者B',
  'PL名A',
  'PL名B',
  'KP名',
  'KPC名',
  '作者名',
  '新クトゥルフ神話TRPG',
  'エモクロアTRPG',
  'emoklore-trpg',
  'マーダーミステリー',
  '◤￣￣￣￣￣￣￣￣￣',
  '＿＿＿＿＿＿＿＿＿◢'
];

const templates = {
  classic: generateClassic,
  minimal: generateMinimal,
  frame: generateFrame,
  'asterisk-frame': generateAsteriskFrame,
  fancy: generateFancy,
  block: generateBlock,
  'ho-focus': generateHOFocus,
  'kpc-pair': generateKpcPair,
  emoklore: generateEmoklore,
  'wide-title': generateWideTitle,
  zigzag: generateZigzag,
  'corner-frame': generateCornerFrame,
  'triangle-heading': generateTriangleHeading
};

function cp(ch, start, base) {
  return base === null ? ch : String.fromCodePoint(base + ch.charCodeAt(0) - start);
}

function styleText(text, variant) {
  const map = fontVariantMaps[variant];
  if (!map || variant === 'plain') return text;

  return Array.from(text.normalize('NFKD')).map(ch => {
    if (map.chars) return map.chars[ch] || ch;
    if (/[A-Z]/.test(ch)) return cp(ch, 65, map.upper);
    if (/[a-z]/.test(ch)) return map.lowerExceptions?.[ch] || cp(ch, 97, map.lower);
    if (/[0-9]/.test(ch)) return cp(ch, 48, map.digit);
    return ch;
  }).join('');
}

function styleTextPreservingSamples(text, variant) {
  let t = text;
  const marks = [];

  protectedTokens.forEach((token, i) => {
    const marker = `__KEEP_${i}__`;
    marks.push([marker, token]);
    t = t.split(token).join(marker);
  });

  let styled = styleText(t, variant);

  marks.forEach(([marker, token]) => {
    styled = styled
      .split(styleText(marker, variant)).join(token)
      .split(marker).join(token);
  });

  return styled;
}

function suffixName(name, suffix) {
  const t = String(name).trim();
  return !t || suffix === 'none' || t.endsWith(suffix) ? t : `${t}${suffix}`;
}

function getSelectedSuffix() {
  return document.querySelector('input[name="suffixChoice"]:checked')?.value || 'none';
}

function selectSuffix(target) {
  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
    input.checked = input === target;
  });

  if (!target.checked) target.checked = true;
  previewSelectedStyle();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSystemText(mode = 'normal') {
  const key = $('systemSelect').value;
  return systemMaps[mode]?.[key] || systemMaps.normal[key] || key;
}

function lineJoin(lines) {
  return lines
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function addGM(value = '', role = 'KP') {
  const row = document.createElement('div');
  row.className = 'row';

  row.innerHTML = `
    <div>
      <label>役割</label>
      <select class="gm-role">
        <option value="KP">KP</option>
        <option value="DL">DL</option>
        <option value="GM">GM</option>
        <option value="KPC/KP">KPC/KP</option>
        <option value="SKP">SKP</option>
        <option value="作/KP">作/KP</option>
        <option value="進行">進行</option>
      </select>
    </div>
    <div>
      <label>名前</label>
      <input class="gm-name" value="${escapeHtml(value)}" placeholder="例：KPC名 / KP名">
    </div>
    <button class="icon-button add-inline" type="button" aria-label="進行役を追加" title="進行役を追加">＋</button>
    <button class="icon-button danger-inline" type="button" aria-label="削除" title="削除">×</button>
  `;

  $('gmContainer').appendChild(row);
  row.querySelector('.gm-role').value = role;
  row.querySelector('.add-inline').addEventListener('click', () => addGM());
  row.querySelector('.danger-inline').addEventListener('click', () => {
    row.remove();
    previewSelectedStyle();
  });

  gmCount++;
}

function getParticipantBaseSlot() {
  return document.querySelector('#playerContainer .participant-row .player-slot')?.value || 'PC1';
}

function getParticipantSlotForIndex(i) {
  const base = getParticipantBaseSlot();
  if (/^PC[0-9]+$/i.test(base)) return `PC${i}`;
  if (/^HO[0-9]+$/i.test(base)) return `HO${i}`;
  return base;
}

function buildSlotOptions(selected = 'PC1', isFirst = false) {
  const options = isFirst ? ['PC', 'PC1', 'HO1', 'PC/PL', 'PL/PC', '自由'] : [selected];

  return options
    .map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`)
    .join('');
}

function syncParticipantSlots() {
  [...document.querySelectorAll('#playerContainer .participant-row')].forEach((row, i) => {
    const sel = row.querySelector('.player-slot');
    if (!sel) return;

    if (i === 0) {
      sel.innerHTML = buildSlotOptions(sel.value || 'PC1', true);
      sel.disabled = false;
    } else {
      const slot = getParticipantSlotForIndex(i + 1);
      sel.innerHTML = buildSlotOptions(slot);
      sel.value = slot;
      sel.disabled = true;
    }
  });
}

function onFirstParticipantSlotChange() {
  syncParticipantSlots();
  previewSelectedStyle();
}

function addPlayer(pl = '', pc = '', slot = '', ho = '') {
  const container = $('playerContainer');
  const idx = container.querySelectorAll('.participant-row').length + 1;
  const isFirst = idx === 1;
  const selected = slot || getParticipantSlotForIndex(idx);
  const row = document.createElement('div');

  row.className = `participant-row name-order-${$('nameInputOrder')?.value || 'pcpl'}`;
  row.innerHTML = `
    <div class="slot-field">
      <label>枠</label>
      <select class="player-slot" ${isFirst ? '' : 'disabled'}>
        ${buildSlotOptions(selected, isFirst)}
      </select>
    </div>
    <div class="ho-field">
      <label>HO補足</label>
      <input class="ho-name" value="${escapeHtml(ho)}" placeholder="通常は空欄でOK">
    </div>
    <div class="pc-field">
      <label>PC名</label>
      <input class="pc-name" value="${escapeHtml(pc)}" placeholder="例：探索者名">
    </div>
    <div class="pl-field">
      <label>PL名</label>
      <input class="pl-name" value="${escapeHtml(pl)}" placeholder="例：佐藤">
    </div>
    <button class="danger delete-field" type="button">×</button>
  `;

  container.appendChild(row);
  row.querySelector('.player-slot').addEventListener('change', onFirstParticipantSlotChange);
  row.querySelector('.delete-field').addEventListener('click', () => {
    row.remove();
    syncParticipantSlots();
    previewSelectedStyle();
  });

  playerCount++;
  syncParticipantSlots();
  updateNameInputOrder();
}

function updateNameInputOrder() {
  const order = $('nameInputOrder')?.value || 'pcpl';

  document.querySelectorAll('.participant-row').forEach(row => {
    row.classList.toggle('name-order-plpc', order === 'plpc');
    row.classList.toggle('name-order-pcpl', order === 'pcpl');
  });
}

function samplePlayerName(index, type) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const letter = letters[index] || String(index + 1);
  return type === 'pc' ? `探索者${letter}` : `PL名${letter}`;
}

function getFieldValue(id, useSample, sampleValue) {
  const value = $(id).value.trim();
  return value || (useSample ? sampleValue : '');
}

function collectData(useSample = false) {
  const suffix = getSelectedSuffix();
  const gmDefault = 'KP';
  const gmRows = [...document.querySelectorAll('#gmContainer .row')];
  const playerRows = [...document.querySelectorAll('#playerContainer .participant-row')];

  let gms = gmRows.map((row, index) => {
    const rawName = row.querySelector('.gm-name').value.trim();

    return {
      role: row.querySelector('.gm-role').value || gmDefault,
      name: suffixName(rawName || (useSample && index === 0 ? 'KP名' : ''), suffix)
    };
  }).filter(x => x.name);

  let players = playerRows.map((row, index) => {
    const rawPc = row.querySelector('.pc-name').value.trim();
    const rawPl = row.querySelector('.pl-name').value.trim();
    const rawHo = row.querySelector('.ho-name').value.trim();

    return {
      slot: row.querySelector('.player-slot').value,
      ho: rawHo,
      pc: suffixName(rawPc || (useSample ? samplePlayerName(index, 'pc') : ''), suffix),
      pl: suffixName(rawPl || (useSample ? samplePlayerName(index, 'pl') : ''), suffix)
    };
  }).filter(x => x.pl || x.pc || x.ho);

  if (useSample) {
    if (!gms.length) gms = [{ role: gmDefault, name: 'KP名' }];
    if (!players.length) {
      players = [
        { slot: 'HO1', ho: '', pc: '探索者A', pl: 'PL名A' },
        { slot: 'HO2', ho: '', pc: '探索者B', pl: 'PL名B' }
      ];
    }
  }

  return {
    style: $('reportStyle').value,
    fontVariant: $('fontVariant').value,
    system: getSystemText(),
    systemShort: getSystemText('short'),
    systemLower: getSystemText('lower'),
    systemBold: getSystemText('bold'),
    scenario: getFieldValue('scenarioTitle', useSample, 'シナリオ名'),
    result: getFieldValue('resultText', useSample, 'END A 両生還'),
    author: getFieldValue('authorText', useSample, '作者名 様'),
    date: getFieldValue('dateText', useSample, $('dateText').placeholder || getTodayString()),
    quote: getFieldValue('quoteText', useSample, '「忘れられない卓でした」'),
    comment: $('freeComment').value.trim(),
    hashtags: $('hashtagText').value.trim(),
    gms,
    players
  };
}

function hasUserInput() {
  return ['scenarioTitle', 'resultText', 'authorText', 'dateText', 'quoteText', 'freeComment', 'hashtagText']
    .some(id => $(id).value.trim())
    || [...document.querySelectorAll('#gmContainer input,#playerContainer input')]
      .some(i => i.value.trim());
}

function gmLines(data, sep = '：') {
  return data.gms.map(x => `${x.role}${sep}${sep === ':' ? ' ' : ''}${x.name}`);
}

function playerLabel(x) {
  const slot = x.slot === '自由' ? '' : x.slot;
  return slot && x.ho ? `${slot} ${x.ho}` : slot;
}

function formatFancyLabel(label) {
  return String(label)
    .replace(/^HO([0-9])$/i, (_, n) => '𝐇𝐎' + String.fromCodePoint(0x1D7CE + Number(n)))
    .replace(/^PC([0-9])$/i, (_, n) => '𝐏𝐂' + String.fromCodePoint(0x1D7CE + Number(n)))
    .replace(/^HO$/i, '𝐇𝐎')
    .replace(/^PC$/i, '𝐏𝐂')
    .replace(/^PL\/PC$/i, '𝐏𝐋/𝐏𝐂')
    .replace(/^PC\/PL$/i, '𝐏𝐂/𝐏𝐋');
}

function playerLines(data, format = 'pcpl') {
  return data.players.map(x => {
    const label = playerLabel(x);
    const colon = label ? `${label}：` : '';
    const space = label ? `${label} ` : '';

    if (format === 'classic') return `${label ? `${label}: ` : ''}${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`;
    if (format === 'frame') return `${space}${x.pc || 'PC未入力'} | ${x.pl || 'PL未入力'}`;
    if (format === 'bar') return `${space}${x.pc || 'PC未入力'}｜${x.pl || 'PL未入力'}`;
    if (format === 'plain-pipe') return `${x.pc || 'PC未入力'} | ${x.pl || 'PL未入力'}`;
    if (format === 'no-label-bar') return `${x.pc || 'PC未入力'}｜${x.pl || 'PL未入力'}`;
    if (format === 'arrow') return `┗ ${space}${x.pc || 'PC未入力'}｜${x.pl || 'PL未入力'}`;
    if (format === 'emoklore-arrow') return `┗ ${space}${x.pc || 'PC未入力'} | ${x.pl || 'PL未入力'}`;
    if (format === 'ho-dash') return `${label || 'PC'}\n　　- ${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`;
    if (format === 'fancy-ho') return `${formatFancyLabel(label || 'PC')}\n　┗ ${x.pc || 'PC未入力'}｜${x.pl || 'PL未入力'}`;

    return `${colon}${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`;
  });
}

function withTail(lines, data, keys) {
  keys.forEach(k => {
    if (data[k]) lines.push('', data[k]);
  });

  return lineJoin(lines);
}

function generateClassic(d) {
  const l = [d.systemShort, `「${d.scenario || 'シナリオ名'}」`];

  l.push('', ...gmLines(d, ':'));

  if (d.players.length) {
    l.push('', 'PC/PL', ...playerLines(d, 'classic'));
  }

  return withTail(l, d, ['result', 'quote', 'comment', 'date', 'hashtags']);
}

function generateMinimal(d) {
  const l = [d.systemShort, `『${d.scenario || 'シナリオ名'}』`, '', ...gmLines(d)];

  if (d.players.length) l.push(...playerLines(d));

  return withTail(l, d, ['result', 'hashtags']);
}

function frameRoleLabel(role) {
  return {
    KP: 'ᴋᴘ',
    DL: 'ᴅʟ',
    GM: 'ɢᴍ',
    'KPC/KP': 'ᴋᴘᴄ/ᴋᴘ',
    SKP: 'ꜱᴋᴘ',
    '作/KP': '作/ᴋᴘ',
    進行: '進行'
  }[role] || role.toLowerCase();
}

function generateFrame(d) {
  const l = [
    '✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦',
    `      ${d.systemShort}`,
    `   　　${d.scenario || 'シナリオ名'}`,
    ''
  ];

  d.gms.forEach(x => l.push(`  　${frameRoleLabel(x.role)}┊${x.name}`));

  if (d.players.length) {
    l.push('  　ᴘᴄ┊ᴘʟ', ...playerLines(d, 'frame').map(x => `  　${x}`));
  }

  if (d.result) l.push(`  　── ${d.result} ──`);
  if (d.quote) l.push('', `　 ${d.quote}`);
  if (d.comment) l.push('', d.comment);

  l.push('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦');

  if (d.hashtags) l.push('', d.hashtags);

  return lineJoin(l);
}

function generateAsteriskFrame(d) {
  const border = '✼••┈┈••✼••┈┈••✼';
  const l = [
    border,
    `    ${d.systemShort}`,
    `　${d.scenario || 'シナリオ名'}`,
    border
  ];

  d.gms.forEach(x => l.push(`${x.role}: ${x.name}`));

  if (d.players.length) {
    l.push('', 'PC/PL', ...playerLines(d, 'classic'));
  }

  l.push('', d.result || 'END');

  return lineJoin(l);
}

function generateFancy(d) {
  const l = [
    '⟡.·*.····························⟡.·*.',
    ` ${d.systemBold}`,
    `　     ◤ ${d.scenario || 'シナリオ名'} ◢`,
    ''
  ];

  l.push(...d.gms.map(x => ` ${x.role} ${x.name}`));

  if (d.players.length) {
    d.players.forEach(x => {
      const label = formatFancyLabel(playerLabel(x) || 'PC');
      l.push(` ${label}`, ` ┗ ${x.pc || 'PC未入力'} | ${x.pl || 'PL未入力'}`);
    });
  }

  if (d.result) l.push('', ` ${d.result}`);
  if (d.quote) l.push('', d.quote);
  if (d.comment) l.push('', d.comment);
  if (d.hashtags) l.push('', d.hashtags);

  return lineJoin(l);
}

function generateBlock(d) {
  const l = [
    `▮     ${d.systemLower}     ▮`,
    '',
    `  『  ${d.scenario || 'シナリオ名'}  』`,
    ''
  ];

  d.gms.forEach(x => l.push(`${frameRoleLabel(x.role)} ${x.name}`));

  if (d.players.length) {
    l.push('ᴘʟᴘᴄ');
    playerLines(d, 'frame').forEach(x => l.push(`   ${x}`));
  }

  return withTail(l, d, ['quote', 'comment', 'hashtags']);
}

function generateHOFocus(d) {
  const l = [d.systemBold, `『 ${d.scenario || 'シナリオ名'} 』`];

  l.push('', ...gmLines(d, ' '), '𝐏𝐂/𝐏𝐋', ...playerLines(d, 'ho-dash'));

  if (d.result) l.push('', `-　${d.result}　-`);

  return withTail(l, d, ['quote', 'comment', 'date', 'hashtags']);
}

function normalizeKpcPairName(name) {
  const text = String(name || '').trim();

  if (!text || text === 'KP名') return 'KPC名 | KP名';

  const parts = text
    .replaceAll('｜', '/')
    .replaceAll('|', '/')
    .split('/')
    .map(x => x.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts.join(' | ') : text;
}

function generateKpcPair(d) {
  const l = [d.systemLower, `【 ${d.scenario || 'タイトル'} 】`, ''];

  if (d.gms.length) {
    l.push('| ᴋᴘᴄ・ᴋᴘ', `  ${normalizeKpcPairName(d.gms[0].name)}`);
  }

  if (d.players.length) {
    l.push('| ᴘᴄ・ᴘʟ', `  ${playerLines(d, 'plain-pipe')[0]}`);
  }

  return withTail(l, d, ['quote', 'comment', 'date', 'hashtags']);
}

function generateEmoklore(d) {
  const l = [
    '✧',
    `   ${d.systemShort}`,
    `     「 ${d.scenario || 'シナリオ名'} 」`
  ];

  if (d.date) l.push(` 　　    Date. ${d.date}`);

  l.push('');

  d.gms.forEach(x => l.push(`${x.role} ${x.name}`));

  if (d.players.length) {
    l.push('PcᐟPL', ...playerLines(d, 'emoklore-arrow'));
  }

  if (d.result) l.push('', `✧ ${d.result}`);

  return withTail(l, d, ['quote', 'comment', 'hashtags']);
}

function generateWideTitle(d) {
  const l = [d.systemShort, `◤　${d.scenario || 'シナリオ名'}　◢`];

  if (d.author) l.push(`作者：${d.author}`);

  l.push('', ...gmLines(d));

  if (d.players.length) {
    l.push('𝗣𝗟/𝗣𝗖', ...playerLines(d));
  }

  return withTail(l, d, ['result', 'quote', 'comment', 'date', 'hashtags']);
}

function generateZigzag(d) {
  const border = '◢◤◢◤◢◤◢◤◢◤◢';
  const l = [
    border,
    `　${d.systemShort}`,
    `　　　${d.scenario || 'タイトル'}`,
    '',
    border
  ];

  d.gms.forEach(x => l.push(`${x.role} ${x.name}`));

  if (d.players.length) {
    l.push('PC/PL');
    d.players.forEach(x => {
      const label = playerLabel(x) || 'PC';
      l.push(label, `  - ${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`);
    });
  }

  if (d.result) l.push('', `- ${d.result} -`);

  return withTail(l, d, ['quote', 'comment', 'date', 'hashtags']);
}

function generateCornerFrame(d) {
  const l = [
    '◤￣￣￣￣￣￣￣￣￣',
    ` ${d.systemShort}`,
    `        ${d.scenario || 'シナリオ名'}`,
    '',
    '＿＿＿＿＿＿＿＿＿◢'
  ];

  d.gms.forEach(x => l.push(`${x.role}: ${x.name}`));

  if (d.players.length) {
    l.push('', 'PC/PL', ...d.players.map(x => ` ${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`));
  }

  return withTail(l, d, ['result', 'quote', 'comment', 'date', 'hashtags']);
}

function generateTriangleHeading(d) {
  const l = [
    `▸ ${d.systemShort}`,
    '',
    `- ${d.scenario || 'シナリオ名'} -`,
    ''
  ];

  d.gms.forEach(x => l.push(`▸ ${x.role}: ${x.name}`));

  if (d.players.length) {
    const first = d.players[0];
    l.push(`▸ PC/PL: ${first.pc || 'PC未入力'} / ${first.pl || 'PL未入力'}`);

    d.players.slice(1).forEach(x => {
      l.push(`               ${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`);
    });
  }

  if (d.result) l.push('', `▸ ${d.result}`);

  return withTail(l, d, ['quote', 'comment', 'date', 'hashtags']);
}

function composeRawPreview() {
  return [lastRawGeneratedText, rawManualDecorations].filter(Boolean).join('\n\n');
}

function renderPreview() {
  const d = collectData(!hasUserInput());
  const variant = d.style === 'minimal' ? 'plain' : d.fontVariant;

  $('tweetPreview').value = styleTextPreservingSamples(composeRawPreview(), variant);
  updateCount();
  requestAnimationFrame(fitPreviewTextBox);
}

function generateTweet(options = {}) {
  const d = collectData(Boolean(options.useSampleFallback));
  lastRawGeneratedText = (templates[d.style] || generateClassic)(d);
  renderPreview();
}

function applyStyleInputDefaults() {
  if ($('reportStyle').value !== 'ho-focus') return;

  const first = document.querySelector('#playerContainer .participant-row .player-slot');

  if (first && first.value !== 'HO1') {
    first.value = 'HO1';
    syncParticipantSlots();
  }
}

function previewSelectedStyle() {
  if (isResetting) return;

  applyStyleInputDefaults();
  generateTweet({ useSampleFallback: true });
}

function addDecoration(text) {
  rawManualDecorations = [rawManualDecorations, text].filter(Boolean).join('\n');
  renderPreview();
  $('tweetPreview').focus();
}

function addEndDecoration() {
  const d = collectData(true);
  addDecoration(`❚  ${d.result || 'END A'}`);
}

function insertAtCursor(text) {
  const a = $('tweetPreview');
  const s = a.selectionStart;
  const e = a.selectionEnd;

  a.value = a.value.slice(0, s) + text + a.value.slice(e);
  a.focus();
  a.selectionStart = a.selectionEnd = s + text.length;

  updateCount();
}

function clearPreview() {
  lastRawGeneratedText = '';
  rawManualDecorations = '';
  $('tweetPreview').value = '';
  updateCount();
  $('tweetPreview').focus();
}

async function copyTweet() {
  try {
    await navigator.clipboard.writeText($('tweetPreview').value);
    alert('コピーしました。');
  } catch (e) {
    $('tweetPreview').select();
    document.execCommand('copy');
    alert('コピーしました。');
  }
}

function updateCount() {
  const n = Array.from($('tweetPreview').value).length;
  const s = $('limitStatus');

  $('charCount').textContent = `${n} / 280`;
  s.textContent = n <= 280 ? 'OK' : `${n - 280}字オーバー`;
  s.className = n <= 280 ? 'count-ok' : 'count-bad';
}

function fitPreviewTextBox() {
  const panel = document.querySelector('.preview-panel');
  const card = document.querySelector('.twitter-card');
  const text = $('tweetPreview');

  if (!panel || !card || !text || window.innerWidth <= 920) return;

  const h2 = panel.querySelector('h2');
  const head = card.querySelector('.tweet-head');
  const count = card.querySelector('.count-line');
  const buttons = card.querySelector('.btns');
  const outerGap = 22;
  const cardChrome = 32
    + (head?.offsetHeight || 0)
    + (count?.offsetHeight || 0)
    + (buttons?.offsetHeight || 0);

  const available = panel.clientHeight
    - (h2?.offsetHeight || 0)
    - cardChrome
    - outerGap;

  const minH = window.innerHeight < 760 ? 150 : 180;
  const defaultH = 360;

  text.style.height = `${Math.max(minH, Math.min(defaultH, available))}px`;
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function setTodayPlaceholder() {
  $('dateText').placeholder = getTodayString();
}

function resetFormState() {
  isResetting = true;

  document.querySelectorAll('.input-panel input:not([type="checkbox"]),.input-panel textarea').forEach(el => {
    el.value = '';
  });

  $('systemSelect').value = 'call_of_cthulhu';
  $('reportStyle').value = 'classic';
  $('fontVariant').value = 'sansBoldItalic';
  $('nameInputOrder').value = 'pcpl';

  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
    input.checked = input.value === 'none';
  });

  $('gmContainer').innerHTML = '';
  $('playerContainer').innerHTML = '';

  gmCount = 0;
  playerCount = 0;
  lastRawGeneratedText = '';
  rawManualDecorations = '';

  $('tweetPreview').value = '';
  updateCount();

  addGM();
  addPlayer();
  addPlayer();
  setTodayPlaceholder();

  isResetting = false;
}

function clearAll() {
  resetFormState();
}

window.clearAll = clearAll;

function runSelfTests() {
  console.assert(typeof addGM === 'function', 'addGM exists');
  console.assert(typeof addPlayer === 'function', 'addPlayer exists');
  console.assert(typeof generateAsteriskFrame === 'function', 'asterisk frame exists');
  console.assert(Object.prototype.hasOwnProperty.call(templates, 'asterisk-frame'), 'asterisk template registered');
  console.assert(document.querySelectorAll('#reportStyle option[value="asterisk-frame"]').length === 1, 'asterisk option is unique');
  console.assert(buildSlotOptions('HO1', true).includes('HO1'), 'HO1 option exists');
  console.assert(!buildSlotOptions('HO1', true).includes('HO2'), 'HO2 is not directly selectable');
  console.assert(!buildSlotOptions('HO1', true).includes('HO壱'), 'old kanji HO removed');
  console.assert(styleText('h', 'serifItalic') === 'ℎ', 'serif italic h fixed');
  console.assert(styleText('Call of Cthulhu', 'smallCaps') === 'ᴄᴀʟʟ ᴏꜰ ᴄᴛʜᴜʟʜᴜ', 'small caps works');
  console.assert(styleText('ABC123', 'typewriter') === '𝙰𝙱𝙲𝟷𝟸𝟹', 'typewriter works');
  console.assert(styleText('ABC123', 'modernSans') === '𝖠𝖡𝖢𝟣𝟤𝟥', 'modern sans works');
  console.assert(getSelectedSuffix() === 'none', 'default suffix is none');
}

function bindEvents() {
  window.addEventListener('resize', fitPreviewTextBox);

  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
    input.addEventListener('change', () => selectSuffix(input));
  });

  $('addPlayerButton').addEventListener('click', () => addPlayer());
  $('generateButton').addEventListener('click', () => generateTweet());
  $('copyButton').addEventListener('click', copyTweet);
  $('newlineButton').addEventListener('click', () => insertAtCursor('\n'));
  $('spaceButton').addEventListener('click', () => insertAtCursor(' '));
  $('clearPreviewButton').addEventListener('click', clearPreview);
  $('endDecorationButton').addEventListener('click', addEndDecoration);

  document.querySelectorAll('[data-decoration]').forEach(btn => {
    btn.addEventListener('click', () => addDecoration(btn.dataset.decoration));
  });

  $('reportStyle').addEventListener('change', previewSelectedStyle);
  $('fontVariant').addEventListener('change', renderPreview);
  $('nameInputOrder').addEventListener('change', () => {
    updateNameInputOrder();
    previewSelectedStyle();
  });

  $('tweetPreview').addEventListener('input', updateCount);

  document.querySelector('.input-panel').addEventListener('input', e => {
    if (!isResetting && e.target.id !== 'tweetPreview') previewSelectedStyle();
  });

  document.querySelector('.input-panel').addEventListener('change', e => {
    if (isResetting) return;
    if (!['reportStyle', 'fontVariant', 'nameInputOrder', 'systemSelect'].includes(e.target.id)) {
      previewSelectedStyle();
    }
  });

  $('systemSelect').addEventListener('change', () => {
    if (['emoklore_en', 'emoklore_ja'].includes($('systemSelect').value)) {
      document.querySelectorAll('#gmContainer .gm-role').forEach(role => {
        role.value = 'DL';
      });
    }

    previewSelectedStyle();
  });
}

bindEvents();
addGM();
addPlayer();
addPlayer();
setTodayPlaceholder();
runSelfTests();
previewSelectedStyle();
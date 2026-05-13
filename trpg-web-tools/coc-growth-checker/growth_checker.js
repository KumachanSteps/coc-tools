const DICE_STAT_ANALYST_URL = "../dice-stat-analyst/index.html";

const state = {
  rawInput: "",
  rolls: [],
  characters: new Map(),
  visibleCharacters: new Set(),
  lastTextOutput: ""
};

const el = {
  body: document.body,
  mainLayout: document.getElementById("mainLayout"),
  inputToggleBtn: document.getElementById("inputToggleBtn"),
  languageToggleBtn: document.getElementById("languageToggleBtn"),
  shortcutHelpBtn: document.getElementById("shortcutHelpBtn"),
  inputLog: document.getElementById("inputLog"),
  fileInput: document.getElementById("fileInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  clearBtn: document.getElementById("clearBtn"),
  themeBtn: document.getElementById("themeBtn"),
  jumpDiceStatBtn: document.getElementById("jumpDiceStatBtn"),
  copyTextBtn: document.getElementById("copyTextBtn"),
  selectAllCharsBtn: document.getElementById("selectAllCharsBtn"),
  thresholdCharsBtn: document.getElementById("thresholdCharsBtn"),
  summary: document.getElementById("summary"),
  characterFilter: document.getElementById("characterFilter"),
  results: document.getElementById("results"),
  minRolls: document.getElementById("minRolls"),
  excludeSan: document.getElementById("excludeSan"),
  excludeParams: document.getElementById("excludeParams")
};

const commandToken = "(?:s?CCB?|s?RESB|s?CBRB|CBRB|RESB|CCB|CC)";
const diceCommandRegex = new RegExp("\\b" + commandToken + "\\b", "i");
const rollNumberRegex = /(?:^|[^\d])(?:1D100|D100|d100|1d100)\s*(?:<=\s*\d+)?[^\d]*(\d{1,3})/i;
const simpleArrowNumberRegex = /[＞>]\s*(\d{1,3})\s*[＞>]/;

const paramSkillSet = new Set([
  "アイデア", "知識", "幸運", "STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU",
  "STR×5", "CON×5", "POW×5", "DEX×5", "APP×5", "SIZ×5", "INT×5", "EDU×5",
  "STR*5", "CON*5", "POW*5", "DEX*5", "APP*5", "SIZ*5", "INT*5", "EDU*5",
  "STR x 5", "CON x 5", "POW x 5", "DEX x 5", "APP x 5", "SIZ x 5", "INT x 5", "EDU x 5",
  "IDEA", "KNOW", "KNOWLEDGE", "LUCK"
]);

function stripHtml(input) {
  if (!input) return "";

  let text = input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");

  const parser = new DOMParser();
  text = parser.parseFromString(text, "text/html").documentElement.textContent || text;

  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
}

function normalizeLine(line) {
  return String(line || "")
    .replace(/[：]/g, ":")
    .replace(/[＜]/g, "<")
    .replace(/[＝]/g, "=")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPotentialRollLines(text) {
  const cleaned = stripHtml(text);
  const baseLines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const expanded = [];

  for (const line of baseLines) {
    const parts = line.split(/(?=\[(?:main|メイン|HO\d+|ルール|メモ|info|other|雑談)\]\s*[^\[]+?:)/i);

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) expanded.push(trimmed);
    }
  }

  return expanded;
}

function detectCharacter(line) {
  const normalized = normalizeLine(line);
  const cmdMatch = normalized.match(diceCommandRegex);

  if (!cmdMatch) return null;

  const beforeCmd = normalized.slice(0, cmdMatch.index).trim();
  const colonIndex = beforeCmd.lastIndexOf(":");

  if (colonIndex < 0) return null;

  let speaker = beforeCmd.slice(0, colonIndex).trim();
  speaker = speaker.replace(/^\[[^\]]+\]\s*/, "").trim();
  speaker = speaker.replace(/^[\s\-–—・]+/, "").trim();

  if (!speaker || speaker.length > 80) return null;
  if (/^(成功|失敗|クリティカル|ファンブル|ルール|メモ|system|info)$/i.test(speaker)) return null;

  return speaker;
}

function detectSkill(line) {
  const bracketMatches = [...line.matchAll(/【([^】]+)】/g)]
    .map(m => m[1].trim())
    .filter(Boolean);

  if (bracketMatches.length) {
    return cleanSkillName(bracketMatches[bracketMatches.length - 1]);
  }

  const normalized = normalizeLine(line);
  const cmdMatch = normalized.match(diceCommandRegex);

  if (!cmdMatch) return inferSkillFromText(line) || "未設定技能";

  const afterCmd = normalized.slice(cmdMatch.index + cmdMatch[0].length);

  const skillLike = afterCmd
    .replace(/^\s*(?:\([^)]*\)|<=\s*\d+|[\d+\-*/×x\s]+)*/, "")
    .split(/[＞>]/)[0]
    .replace(/#\d+.*$/, "")
    .trim();

  return cleanSkillName(skillLike || inferSkillFromText(line) || "未設定技能");
}

function cleanSkillName(skill) {
  return String(skill || "")
    .replace(/[:：].*$/, "")
    .replace(/\s+/g, " ")
    .replace(/^[\[\]【】\s]+|[\[\]【】\s]+$/g, "")
    .trim() || "未設定技能";
}

function inferSkillFromText(line) {
  if (/SAN|正気度|正気度ロール/i.test(line)) return "正気度ロール";
  if (/アイデア/i.test(line)) return "アイデア";
  if (/知識|KNOW/i.test(line)) return "知識";
  if (/幸運|LUCK/i.test(line)) return "幸運";
  return "";
}

function detectRollValue(line) {
  const m1 = line.match(rollNumberRegex);
  if (m1) return Number(m1[1]);

  const m2 = line.match(simpleArrowNumberRegex);
  if (m2) return Number(m2[1]);

  const numsAfterArrow = [...line.matchAll(/[＞>]\s*(\d{1,3})/g)]
    .map(m => Number(m[1]))
    .filter(n => n >= 1 && n <= 100);

  return numsAfterArrow.length ? numsAfterArrow[0] : null;
}

function detectResult(line, rollValue) {
  const upper = line.toUpperCase();

  if (/決定的成功|クリティカル|CRITICAL|C決定的/.test(line) || /\bC\b/.test(upper)) return "critical";
  if (/致命的失敗|ファンブル|FUMBLE/.test(line) || /\bF\b/.test(upper)) return "fumble";
  if (/スペシャル|SPECIAL/.test(line)) return "special";
  if (/成功|SUCCESS/.test(line)) return "success";
  if (/失敗|FAILURE|FAILED/.test(line)) return "failure";

  if (rollValue !== null) {
    if (rollValue <= 5) return "critical";
    if (rollValue >= 96) return "fumble";
  }

  return "unknown";
}

function isSanSkill(skill, line) {
  return /SAN|SANC|正気度|正気度ロール|SAN値|SANチェック/i.test(skill + " " + line);
}

function isParameterSkill(skill) {
  const normalized = String(skill || "").toUpperCase().replace(/\s+/g, " ").trim();
  const jp = String(skill || "").trim();

  if (paramSkillSet.has(jp) || paramSkillSet.has(normalized)) return true;
  if (/^(STR|CON|POW|DEX|APP|SIZ|INT|EDU)(?:\s*[×X*]\s*\d+)?$/i.test(normalized)) return true;
  if (/^(アイデア|知識|幸運)$/.test(jp)) return true;

  return false;
}

function parseRolls(rawInput) {
  const lines = splitPotentialRollLines(rawInput);
  const rolls = [];

  lines.forEach((line, idx) => {
    const normalized = normalizeLine(line);

    if (!diceCommandRegex.test(normalized) && !/1D100|D100|1d100|d100/.test(normalized)) return;

    const character = detectCharacter(normalized);
    if (!character) return;

    const skill = detectSkill(normalized);
    const rollValue = detectRollValue(normalized);
    const result = detectResult(normalized, rollValue);

    if (!["critical", "fumble", "special", "success", "failure"].includes(result)) return;

    rolls.push({
      id: `${idx}-${rolls.length}`,
      lineNo: idx + 1,
      character,
      skill,
      rollValue,
      result,
      raw: normalized,
      isSan: isSanSkill(skill, normalized),
      isParam: isParameterSkill(skill),
      isLuckCritical: result === "critical" && /幸運|LUCK/i.test(skill)
    });
  });

  return rolls;
}

function getCurrentRule() {
  return document.querySelector('input[name="growthRule"]:checked')?.value || "rulebook";
}

function getFilteredRolls() {
  const excludeSan = el.excludeSan.checked;
  const excludeParams = el.excludeParams.checked;

  return state.rolls.filter(roll => {
    if (excludeSan && roll.isSan) return false;
    if (excludeParams && roll.isParam && !roll.isLuckCritical) return false;
    return true;
  });
}

function groupCharacters(rolls) {
  const map = new Map();

  for (const roll of rolls) {
    if (!map.has(roll.character)) {
      map.set(roll.character, { name: roll.character, rolls: [], growth: [] });
    }

    map.get(roll.character).rolls.push(roll);
  }

  return map;
}

function buildGrowthCandidates(charRolls, rule) {
  const candidates = [];
  const regularSeen = new Set();

  for (const roll of charRolls) {
    const isRegularSuccess = roll.result === "success" || roll.result === "special";
    const isCritical = roll.result === "critical";
    const isFumble = roll.result === "fumble";

    if (roll.isLuckCritical) {
      candidates.push({ ...roll, note: "Chance to grow <POW>" });
      continue;
    }

    if (rule === "rulebook") {
      if ((isRegularSuccess || isCritical) && !regularSeen.has(roll.skill)) {
        candidates.push(roll);
        regularSeen.add(roll.skill);
      }
      continue;
    }

    if (rule === "critFumble") {
      if (isCritical || isFumble) candidates.push(roll);
      continue;
    }

    if (rule === "both") {
      if (isCritical || isFumble) {
        candidates.push(roll);
      } else if (isRegularSuccess && !regularSeen.has(roll.skill)) {
        candidates.push(roll);
        regularSeen.add(roll.skill);
      }
      continue;
    }

    if (rule === "bothPrime") {
      if (isCritical) {
        candidates.push(roll);
      } else if (isRegularSuccess && !regularSeen.has(roll.skill)) {
        candidates.push(roll);
        regularSeen.add(roll.skill);
      }
    }
  }

  return candidates;
}

function sortCharacters(chars, minRolls) {
  return [...chars.values()].sort((a, b) => {
    const aPass = a.rolls.length >= minRolls ? 0 : 1;
    const bPass = b.rolls.length >= minRolls ? 0 : 1;

    if (aPass !== bPass) return aPass - bPass;

    return a.name.localeCompare(b.name, "ja");
  });
}

function analyze() {
  state.rawInput = el.inputLog.value;
  state.rolls = parseRolls(state.rawInput);
  renderAll(true);
}

function renderAll(resetVisible = false) {
  const rule = getCurrentRule();
  const minRolls = Number(el.minRolls.value || 0);
  const filteredRolls = getFilteredRolls();

  state.characters = groupCharacters(filteredRolls);

  for (const char of state.characters.values()) {
    char.growth = buildGrowthCandidates(char.rolls, rule);
  }

  const sorted = sortCharacters(state.characters, minRolls);

  if (resetVisible) {
    state.visibleCharacters = new Set(sorted.filter(c => c.rolls.length >= minRolls).map(c => c.name));
  } else {
    const remainingVisible = [...state.visibleCharacters].filter(name => state.characters.has(name));
    state.visibleCharacters = new Set(remainingVisible);
  }

  renderSummary(sorted, filteredRolls);
  renderCharacterFilter(sorted, minRolls);
  renderResults(sorted, minRolls);
}

function renderSummary(chars, filteredRolls) {
  const totalCandidates = chars.reduce((sum, c) => sum + c.growth.length, 0);
  const shownChars = chars.filter(c => state.visibleCharacters.has(c.name)).length;
  const crits = filteredRolls.filter(r => r.result === "critical").length;
  const fumbles = filteredRolls.filter(r => r.result === "fumble").length;

  el.summary.innerHTML = `
    <div class="stat"><b>${chars.length}</b><span>検出キャラクター</span></div>
    <div class="stat"><b>${shownChars}</b><span>表示中キャラクター</span></div>
    <div class="stat"><b>${totalCandidates}</b><span>成長チェック候補</span></div>
    <div class="stat"><b>${crits} / ${fumbles}</b><span>Critical / Fumble</span></div>
  `;
}

function renderCharacterFilter(chars, minRolls) {
  if (!chars.length) {
    el.characterFilter.hidden = true;
    el.characterFilter.innerHTML = "";
    return;
  }

  el.characterFilter.hidden = false;

  el.characterFilter.innerHTML = chars.map(char => {
    const checked = state.visibleCharacters.has(char.name) ? "checked" : "";
    const cls = char.rolls.length < minRolls ? "below-threshold" : "";

    return `
      <label class="filter-row ${cls}">
        <input type="checkbox" data-char="${escapeAttr(char.name)}" ${checked}>
        <span>${escapeHtml(char.name)}</span>
        <span class="pill">${char.rolls.length} rolls / ${char.growth.length} checks</span>
      </label>
    `;
  }).join("");

  el.characterFilter.querySelectorAll("input[data-char]").forEach(box => {
    box.addEventListener("change", event => {
      const name = event.currentTarget.dataset.char;

      if (event.currentTarget.checked) state.visibleCharacters.add(name);
      else state.visibleCharacters.delete(name);

      const minRolls = Number(el.minRolls.value || 0);
      const sorted = sortCharacters(state.characters, minRolls);

      renderResults(sorted, minRolls);
      renderSummary(sorted, getFilteredRolls());
    });
  });
}

function renderResults(chars, minRolls) {
  if (!state.rolls.length) {
    el.results.className = "empty";
    el.results.innerHTML = "ダイスロールを検出できませんでした。CC / CCB / RESB / CBRB 形式、またはキャラクター名：コマンド形式のログか確認してください。";
    state.lastTextOutput = "";
    return;
  }

  if (!chars.length) {
    el.results.className = "empty";
    el.results.innerHTML = "除外ルール適用後に表示できるダイスロールがありません。";
    state.lastTextOutput = "";
    return;
  }

  const visible = chars.filter(c => state.visibleCharacters.has(c.name));

  if (!visible.length) {
    el.results.className = "empty";
    el.results.innerHTML = "表示対象のキャラクターがありません。キャラクター表示チェックをONにしてください。";
    state.lastTextOutput = "";
    return;
  }

  el.results.className = "";
  el.results.innerHTML = visible.map(char => renderCharacterCard(char, minRolls)).join("");
  state.lastTextOutput = buildTextOutput(visible);
}

function renderCharacterCard(char, minRolls) {
  const growthHtml = char.growth.length
    ? `<div class="growth-list">${char.growth.map(renderGrowthItem).join("")}</div>`
    : `<div class="empty">成長チェック候補はありません。</div>`;

  const logRows = char.rolls.map(roll => `
    <tr>
      <td>${escapeHtml(roll.skill)}</td>
      <td>${renderResultTag(roll.result)}</td>
      <td>${roll.rollValue ?? "-"}</td>
      <td class="raw-line">${escapeHtml(roll.raw)}</td>
    </tr>
  `).join("");

  const thresholdPill = char.rolls.length >= minRolls
    ? `<span class="pill">しきい値以上</span>`
    : `<span class="pill">しきい値未満</span>`;

  return `
    <article class="char-card">
      <div class="char-head">
        <h3>${escapeHtml(char.name)}</h3>
        <div class="char-meta">
          ${thresholdPill}
          <span class="pill">${char.rolls.length} rolls</span>
          <span class="pill">${char.growth.length} growth checks</span>
        </div>
      </div>
      <div class="char-body">
        ${growthHtml}
        <details>
          <summary>整理済みダイスログを表示</summary>
          <table class="log-table">
            <thead><tr><th>技能</th><th>結果</th><th>出目</th><th>元ログ</th></tr></thead>
            <tbody>${logRows}</tbody>
          </table>
        </details>
      </div>
    </article>
  `;
}

function renderGrowthItem(roll) {
  const note = roll.note ? `<span class="tag pow">${escapeHtml(roll.note)}</span>` : "";

  return `
    <div class="growth-item">
      <strong>${escapeHtml(roll.skill)}</strong>
      ${renderResultTag(roll.result)}
      ${roll.rollValue !== null ? `<span class="tag">出目 ${roll.rollValue}</span>` : ""}
      ${note}
      <div class="raw-line">${escapeHtml(roll.raw)}</div>
    </div>
  `;
}

function renderResultTag(result) {
  const label = {
    critical: "CRITICAL",
    fumble: "FUMBLE",
    special: "SPECIAL",
    success: "SUCCESS",
    failure: "FAILURE",
    unknown: "UNKNOWN"
  }[result] || result;

  const cls = ["critical", "fumble", "special", "success"].includes(result) ? result : "";

  return `<span class="tag ${cls}">${label}</span>`;
}

function buildTextOutput(chars) {
  const lines = [];

  lines.push("CoC Growth Check Candidates");
  lines.push("================================");
  lines.push("");

  for (const char of chars) {
    lines.push(`■ ${char.name}`);
    lines.push(`Rolls: ${char.rolls.length} / Growth Checks: ${char.growth.length}`);

    if (!char.growth.length) {
      lines.push("- No growth check candidates");
    } else {
      for (const roll of char.growth) {
        const note = roll.note ? ` / ${roll.note}` : "";
        const value = roll.rollValue !== null ? ` / ${roll.rollValue}` : "";
        lines.push(`- ${roll.skill} [${roll.result.toUpperCase()}${value}${note}]`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

async function copyToClipboard(text) {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand("copy");
    temp.remove();
    return ok;
  }
}

function sendToDiceStatAnalyst() {
  const log = el.inputLog.value || state.rawInput || "";

  localStorage.setItem("diceStatAnalystInput", log);
  localStorage.setItem("cocDiceLogSharedInput", log);
  localStorage.setItem("cocGrowthCheckerLastInput", log);

  window.open(DICE_STAT_ANALYST_URL, "_blank", "noopener,noreferrer");
}

el.fileInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];

  if (!file) return;

  const text = await file.text();

  el.inputLog.value = text;
  analyze();
});

el.analyzeBtn.addEventListener("click", analyze);

el.clearBtn.addEventListener("click", () => {
  el.inputLog.value = "";
  state.rawInput = "";
  state.rolls = [];
  state.characters = new Map();
  state.visibleCharacters = new Set();
  state.lastTextOutput = "";

  el.summary.innerHTML = "";
  el.characterFilter.hidden = true;
  el.characterFilter.innerHTML = "";
  el.results.className = "empty";
  el.results.innerHTML = "ログを入力して「成長チェックを抽出」を押してください。";
  el.fileInput.value = "";
});

el.themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem("cocGrowthCheckerTheme", isDark ? "dark" : "light");
});

el.inputToggleBtn.addEventListener("click", () => {
  el.mainLayout.classList.toggle("input-collapsed");

  const isCollapsed = el.mainLayout.classList.contains("input-collapsed");

  el.inputToggleBtn.textContent = isCollapsed ? "▶" : "◀";
  el.inputToggleBtn.title = isCollapsed ? "入力パネルを開く" : "入力パネルを折りたたむ";
});

el.shortcutHelpBtn.addEventListener("click", () => {
  alert([
    "ショートカット一覧",
    "",
    "Ctrl / Cmd + O：ファイルを開く",
    "Ctrl / Cmd + Enter：解析実行",
    "Ctrl / Cmd + Shift + M：ナイトモード切替",
    "Esc：入力パネルを折りたたむ / 開く"
  ].join("\n"));
});

el.copyTextBtn.addEventListener("click", async () => {
  const ok = await copyToClipboard(state.lastTextOutput);

  el.copyTextBtn.textContent = ok ? "Copied!" : "Copy Failed";

  setTimeout(() => {
    el.copyTextBtn.textContent = "Copy Text";
  }, 1200);
});

el.selectAllCharsBtn.addEventListener("click", () => {
  state.visibleCharacters = new Set([...state.characters.keys()]);
  renderAll(false);
});

el.thresholdCharsBtn.addEventListener("click", () => {
  const minRolls = Number(el.minRolls.value || 0);

  state.visibleCharacters = new Set(
    [...state.characters.values()]
      .filter(c => c.rolls.length >= minRolls)
      .map(c => c.name)
  );

  renderAll(false);
});

el.jumpDiceStatBtn.addEventListener("click", sendToDiceStatAnalyst);

document.querySelectorAll('input[name="growthRule"], #excludeSan, #excludeParams').forEach(control => {
  control.addEventListener("change", () => renderAll(false));
});

el.minRolls.addEventListener("change", () => {
  const minRolls = Number(el.minRolls.value || 0);

  state.visibleCharacters = new Set(
    [...state.characters.values()]
      .filter(c => c.rolls.length >= minRolls)
      .map(c => c.name)
  );

  renderAll(false);
});

document.addEventListener("keydown", event => {
  const mod = event.ctrlKey || event.metaKey;

  if (mod && event.key.toLowerCase() === "o") {
    event.preventDefault();
    el.fileInput.click();
  }

  if (mod && event.shiftKey && event.key.toLowerCase() === "m") {
    event.preventDefault();
    el.themeBtn.click();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    el.inputToggleBtn.click();
  }

  if (mod && event.key === "Enter") {
    event.preventDefault();
    analyze();
  }
});

const savedTheme = localStorage.getItem("cocGrowthCheckerTheme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

const sharedInput = localStorage.getItem("cocGrowthCheckerLastInput") || localStorage.getItem("cocDiceLogSharedInput") || "";

if (sharedInput) {
  el.inputLog.value = sharedInput;
}
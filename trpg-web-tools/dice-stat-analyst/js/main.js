const $ = id => document.getElementById(id);

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const TAB = String.fromCharCode(9);

const state = {
  rolls: [],
  filteredLines: [],
  hiddenCharacters: new Set(),
  sort: { key: "index", direction: "asc" },
  showCharacterControls: false,
  inputPanelMode: "auto",
  dark: false
};

const diceCommands = [
  "SRESB", "RESB", "SCCB", "SCBR", "SCC", "CCB", "CBR", "CC",
  "S1D100", "1D100", "SD100", "D100", "D％", "D%"
];

const includedTabs = ["main", "メイン", "ho"];
const excludedTabs = ["雑談", "other", "info", "おはらい", "お祓い", "運試し"];

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  bindEvents();
  render();
}

function bindEvents() {
  $("themeToggleBtn").addEventListener("click", toggleTheme);
  document.querySelectorAll(".tab-button").forEach(b => b.addEventListener("click", () => switchTab(b)));
  document.querySelectorAll("button[data-sort-key]").forEach(b => b.addEventListener("click", () => toggleSort(b.dataset.sortKey)));

  $("fileInput").addEventListener("change", handleFileInput);
  $("inputToggleBtn").addEventListener("click", toggleInputPanel);
  $("characterControlToggleBtn").addEventListener("click", () => {
    state.showCharacterControls = !state.showCharacterControls;
    renderCharacterControls();
  });

  $("summaryShotBtn").addEventListener("click", enterScreenshotMode);
  $("screenshotExitBtn").addEventListener("click", exitScreenshotMode);
  document.addEventListener("keydown", handleGlobalKeydown);

  $("analyzeBtn").addEventListener("click", analyze);
  $("clearBtn").addEventListener("click", clearAll);
}

function switchTab(b) {
  document.querySelectorAll(".tab-button").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  $(b.dataset.tab).classList.add("active");
}

async function handleFileInput(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  $("rawInput").value = await f.text();
  state.inputPanelMode = "auto";
  analyze();
}

function toggleInputPanel() {
  const collapsed = $("appLayout").classList.contains("input-collapsed");
  state.inputPanelMode = collapsed ? "open" : "collapsed";
  applyInputPanelLayout();
}

function clearAll() {
  $("fileInput").value = "";
  $("rawInput").value = "";
  state.rolls = [];
  state.filteredLines = [];
  state.hiddenCharacters = new Set();
  state.showCharacterControls = false;
  state.inputPanelMode = "auto";
  render();
}

function toggleTheme() {
  state.dark = !state.dark;
  syncThemeSwitch();
}

function syncThemeSwitch() {
  document.body.classList.toggle("dark", state.dark);
  const btn = $("themeToggleBtn");
  btn.setAttribute("aria-pressed", state.dark ? "true" : "false");
  btn.setAttribute("title", state.dark ? "ライトモードに切替" : "ナイトモードに切替");
  btn.setAttribute("aria-label", state.dark ? "ライトモードに切替" : "ナイトモードに切替");
}

function analyze() {
  state.inputPanelMode = "auto";

  const lines = normalizeNewlines(prepareText($("rawInput").value || ""))
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
  const s = String(raw || "");
  if (!looksLikeHtml(s)) return s;

  const doc = new DOMParser().parseFromString(s, "text/html");
  if (!doc.body) return s;

  const lines = extractHtmlLogLines(doc);
  return lines.length ? lines.join(LF) : decodeHtml(doc.body.innerText || doc.body.textContent || s);
}

function extractHtmlLogLines(doc) {
  return Array.from(doc.body.querySelectorAll("p"))
    .map(extractHtmlLogLine)
    .filter(Boolean);
}

function extractHtmlLogLine(p) {
  const spans = Array.from(p.querySelectorAll("span"))
    .map(s => cleanLine(decodeHtml(s.textContent || "")))
    .filter(Boolean);

  if (spans.length >= 3 && isTabLabel(spans[0])) {
    return `${spans[0]} ${spans[1]}：${spans.slice(2).join(" ")}`;
  }

  return cleanLine(decodeHtml(p.textContent || ""));
}

function filterLines(lines) {
  return lines.filter(line => {
    if (isRuleExplanationLine(line)) return false;
    if ($("dropTabs").checked && !shouldKeepTabLine(line)) return false;
    if ($("onlyD100").checked && !looksLikeD100Roll(line)) return false;
    return true;
  });
}

function shouldKeepTabLine(line) {
  const tab = extractLeadingTab(line);
  return !tab || isIncludedTab(tab);
}

function isIncludedTab(tab) {
  const n = normalizeTabName(tab);
  if (!n) return true;

  if (excludedTabs.some(w => n.includes(normalizeTabName(w)))) return false;
  if (n === "ho" || n.startsWith("ho")) return true;

  return includedTabs.some(w => {
    const x = normalizeTabName(w);
    return n === x || n.startsWith(x) || n.includes(x);
  });
}

function extractRollData(lines) {
  const rolls = [];
  let current = "";

  lines.forEach((line, i) => {
    const name = extractCharacterName(line);
    const usable = isUsableCharacterName(name);
    const values = extractRollsFromLine(line);

    if (usable) current = name;

    values.forEach(value => {
      rolls.push({
        value,
        character: usable ? name : (current || "不明"),
        line,
        lineNo: i + 1
      });
    });
  });

  return rolls;
}

function extractCharacterName(line) {
  const text = String(line || "").trim();
  const i = findDiceCommandIndex(text);

  if (i < 0) return "不明";

  let before = text.slice(0, i).trim();
  if (!before) return "不明";

  before = removeLeadingTab(before);
  before = trimTrailingRollPrefix(before);
  before = trimTrailingSeparators(before);

  return cleanCharacterName(before);
}

function extractRollsFromLine(line) {
  if (isRuleExplanationLine(line)) return [];

  const text = String(line || "");
  const i = findDiceCommandIndex(text);
  if (i < 0) return [];

  const afterCommand = text.slice(i);

  if (!isLikelyActualRollText(afterCommand)) return [];

  const nums = extractNumbersAfterResultMarkers(afterCommand);
  if (nums.length) return [nums[0]];

  return extractNumbersAfterWords(afterCommand, ["出目"]).slice(0, 1);
}

function findDiceCommandIndex(text) {
  const upper = String(text || "").toUpperCase();
  const idx = [];

  diceCommands.forEach(cmd => {
    let from = 0;

    while (from < upper.length) {
      const i = upper.indexOf(cmd, from);
      if (i < 0) break;

      const prev = i > 0 ? upper[i - 1] : "";
      const next = upper[i + cmd.length] || "";

      const validPrev = !prev || !isAsciiAlphaNumber(prev);
      const validNext = !next || !isAsciiAlphaNumber(next);

      if (validPrev && validNext) idx.push(i);

      from = i + cmd.length;
    }
  });

  return idx.length ? Math.min(...idx) : -1;
}

function isLikelyActualRollText(text) {
  const s = String(text || "");

  if (extractNumbersAfterResultMarkers(s).length > 0) return true;
  if (/出目\s*\d{1,3}/.test(s)) return true;

  return false;
}

function extractNumbersAfterResultMarkers(text) {
  const values = [];
  const markers = ["＞", ">", "→"];

  for (let i = 0; i < text.length; i++) {
    if (!markers.includes(text[i])) continue;

    const n = readRollResultNumberFrom(text, i + 1);

    if (n !== null && n >= 1 && n <= 100) {
      values.push(n);
    }
  }

  return values;
}

function readRollResultNumberFrom(text, start) {
  let i = start;

  while (i < text.length && isWhitespace(text[i])) i++;

  if (i >= text.length || text[i] < "0" || text[i] > "9") return null;

  let d = "";

  while (i < text.length && text[i] >= "0" && text[i] <= "9") {
    d += text[i++];
  }

  if (["d", "D", "Ｄ", "ｄ"].includes(text[i] || "")) return null;

  return isValidRollResultTail(text.slice(i)) ? Number(d) : null;
}

function isValidRollResultTail(tail) {
  const t = String(tail || "").trim();
  const l = t.toLowerCase();

  if (!t) return true;
  if (["＞", ">", "→", "#"].some(m => t.startsWith(m))) return true;

  return [
    "成功",
    "失敗",
    "決定的成功",
    "致命的失敗",
    "クリティカル",
    "ファンブル"
  ].some(w => t.startsWith(w)) || l.startsWith("success") || l.startsWith("fail");
}

function extractNumbersAfterWords(text, words) {
  const lower = String(text || "").toLowerCase();
  const values = [];

  words.forEach(w => {
    const i = lower.indexOf(String(w).toLowerCase());
    if (i < 0) return;

    const n = readNumberFrom(text, i + String(w).length);
    if (n !== null && n >= 1 && n <= 100) values.push(n);
  });

  return values;
}

function readNumberFrom(text, start) {
  let d = "";

  for (let i = start; i < text.length; i++) {
    const c = text[i];

    if (c >= "0" && c <= "9") d += c;
    else if (d) break;
  }

  return d ? Number(d) : null;
}

function extractTargetNumber(line) {
  const text = String(line || "")
    .replaceAll("＜=", "<=")
    .replaceAll("≦", "<=")
    .replaceAll("＝", "=")
    .toUpperCase();

  const i = findDiceCommandIndex(text);
  if (i < 0) return null;

  const part = text.slice(i, i + 120);

  let op = part.indexOf("<=");
  let offset = 2;

  if (op < 0) {
    op = part.indexOf("<");
    offset = 1;
  }

  if (op < 0) return null;

  const v = readNumberFrom(part, op + offset);
  return Number.isInteger(v) && v >= 1 && v <= 100 ? v : null;
}

function classify(value) {
  const crit = clamp(Number($("critMax").value || 5), 1, 100);
  const fum = clamp(Number($("fumbleMin").value || 96), 1, 100);

  if (value <= crit) return "Critical";
  if (value >= fum) return "Fumble";
  return "Normal";
}

function classifyRoll(roll) {
  const base = classify(roll.value);
  if (base === "Critical" || base === "Fumble") return base;

  const line = String(roll.line || "");
  const lower = line.toLowerCase();

  const fail = line.includes("失敗") || lower.includes("failure") || lower.includes("fail");
  const success =
    line.includes("成功") ||
    line.includes("スペシャル") ||
    line.includes("イクストリーム") ||
    line.includes("ハード") ||
    line.includes("レギュラー") ||
    lower.includes("success");

  if (fail) return "Fail";
  if (success) return "Success";

  const target = extractTargetNumber(line);
  return target !== null ? (roll.value <= target ? "Success" : "Fail") : "Normal";
}

function getOutcomeCounts(rolls) {
  const c = { critical: 0, fumble: 0, success: 0, fail: 0, normal: 0 };

  rolls.forEach(r => {
    const l = classifyRoll(r);

    if (l === "Critical") {
      c.critical++;
      c.success++;
    } else if (l === "Fumble") {
      c.fumble++;
      c.fail++;
    } else if (l === "Success") {
      c.success++;
    } else if (l === "Fail") {
      c.fail++;
    } else {
      c.normal++;
    }
  });

  return c;
}

function classificationOrder(label) {
  return { Critical: 1, Success: 2, Normal: 3, Fail: 4, Fumble: 5 }[label] || 99;
}

function applyDefaultCharacterVisibility(rolls) {
  const chars = getDetectedCharactersFromRolls(rolls);
  const grouped = groupRollsByCharacter(rolls);
  const threshold = clamp(Number($("autoHideMaxRolls").value || 15), 0, 999);
  const hidden = new Set();

  chars.forEach(n => {
    const count = grouped[n] ? grouped[n].length : 0;
    if (count <= threshold) hidden.add(n);
  });

  state.hiddenCharacters = hidden;
}

function getVisibleRolls() {
  return state.rolls.filter(r => !state.hiddenCharacters.has(r.character || "不明"));
}

function getDetectedCharacters() {
  return getDetectedCharactersFromRolls(state.rolls);
}

function getDetectedCharactersFromRolls(rolls) {
  return [...new Set(rolls.map(r => r.character || "不明"))].sort(compareCharacterNames);
}

function groupRollsByCharacter(rolls) {
  return rolls.reduce((acc, r) => {
    const n = r.character || "不明";
    (acc[n] ||= []).push(r);
    return acc;
  }, {});
}

function compareCharacterNames(a, b) {
  if (a === "不明") return 1;
  if (b === "不明") return -1;
  return String(a).localeCompare(String(b), "ja");
}

function toggleSort(key) {
  if (state.sort.key === key) {
    state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
  } else {
    state.sort = { key, direction: "asc" };
  }

  renderTable();
}

function getSortedVisibleRolls() {
  const dir = state.sort.direction === "desc" ? -1 : 1;
  const rolls = getVisibleRolls().map((r, i) => ({ ...r, originalIndex: i }));

  rolls.sort((a, b) => {
    let res =
      state.sort.key === "character" ? compareCharacterNames(a.character || "不明", b.character || "不明") :
      state.sort.key === "value" ? a.value - b.value :
      state.sort.key === "classification" ? classificationOrder(classifyRoll(a)) - classificationOrder(classifyRoll(b)) :
      a.originalIndex - b.originalIndex;

    if (res === 0) res = a.originalIndex - b.originalIndex;
    return res * dir;
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
  const values = rolls.map(r => r.value);
  const out = getOutcomeCounts(rolls);
  const avg = total ? values.reduce((a, b) => a + b, 0) / total : null;

  $("totalRolls").textContent = total;
  $("successFailCount").textContent = `${out.success} / ${out.fail}`;
  $("successFailRate").textContent = `${rate(out.success, total)}% / ${rate(out.fail, total)}%`;
  $("critFumbleCount").textContent = `${out.critical} / ${out.fumble}`;
  $("critFumbleRate").textContent = `${rate(out.critical, total)}% / ${rate(out.fumble, total)}%`;
  $("averageRoll").textContent = avg === null ? "-" : avg.toFixed(2);

  if (!total) {
    $("summaryMemo").textContent = state.rolls.length
      ? "表示対象のロールがありません。キャラクターのチェックを戻してください。"
      : "ログデータを選択ください。";
    return;
  }

  const all = state.rolls.length;
  const hidden = all - total;
  const chars = getDetectedCharacters().length;

  $("summaryMemo").textContent =
    `検出した${all}件のd100ロールのうち、表示対象${total}件を集計しました。` +
    `検出キャラクター数は${chars}です。非表示ロール数は${hidden}件です。` +
    `総ロール数${$("autoHideMaxRolls").value}以下のキャラクターは初期状態で非表示です。` +
    `クリティカル判定は${$("critMax").value}以下、ファンブル判定は${$("fumbleMin").value}以上です。`;
}

function renderCharacterControls() {
  const box = $("characterControls");
  const btn = $("characterControlToggleBtn");
  const chars = getDetectedCharacters();

  if (!box) return;

  box.classList.toggle("visible", state.showCharacterControls);

  if (btn) {
    btn.textContent = state.showCharacterControls ? "表示キャラ設定を隠す" : "表示キャラ設定を開く";
  }

  if (!chars.length) {
    box.innerHTML = "";
    if (btn) btn.style.display = "none";
    return;
  }

  if (btn) btn.style.display = "inline-flex";

  box.innerHTML = chars.map(name => {
    const checked = state.hiddenCharacters.has(name) ? "" : "checked";
    const count = state.rolls.filter(r => (r.character || "不明") === name).length;

    return `<label class="character-toggle"><input type="checkbox" data-character="${escapeAttribute(name)}" ${checked}>${escapeHtml(name)} (${count})</label>`;
  }).join("");

  box.querySelectorAll("input[data-character]").forEach(input => {
    input.addEventListener("change", () => {
      const name = input.getAttribute("data-character") || "不明";
      input.checked ? state.hiddenCharacters.delete(name) : state.hiddenCharacters.add(name);
      state.inputPanelMode = state.inputPanelMode === "open" ? "open" : "auto";
      render();
    });
  });
}

function renderCharacterSummary() {
  const box = $("characterSummary");
  if (!box) return;

  const grouped = groupRollsByCharacter(getVisibleRolls());
  const names = Object.keys(grouped).sort(compareCharacterNames);

  box.innerHTML = names.length
    ? names.map(n => renderCharacterCard(n, grouped[n])).join("")
    : `<div class="card"><p class="note">表示対象のキャラクターがありません。キャラクターのチェックを戻してください。</p></div>`;
}

function renderCharacterCard(name, rolls) {
  const values = rolls.map(r => r.value);
  const total = values.length;
  const out = getOutcomeCounts(rolls);
  const avg = total ? values.reduce((a, b) => a + b, 0) / total : 0;

  return `
    <div class="card character-card">
      <h3>${escapeHtml(name)}</h3>
      <div class="mini-stats">
        <div class="mini-stat"><div class="label">総ロール</div><div class="value">${total}</div></div>
        <div class="mini-stat"><div class="label">平均出目</div><div class="value">${avg.toFixed(2)}</div></div>
        <div class="mini-stat"><div class="label">成功 / 失敗</div><div class="value">${out.success} / ${out.fail}</div><div class="label">${rate(out.success, total)}% / ${rate(out.fail, total)}%</div></div>
        <div class="mini-stat"><div class="label">クリティカル / ファンブル</div><div class="value">${out.critical} / ${out.fumble}</div><div class="label">${rate(out.critical, total)}% / ${rate(out.fumble, total)}%</div></div>
      </div>
      ${renderBins(values)}
    </div>`;
}

function renderChart() {
  const box = $("barChart");
  if (!box) return;

  const grouped = groupRollsByCharacter(getVisibleRolls());
  const names = Object.keys(grouped).sort(compareCharacterNames);

  box.innerHTML = names.length
    ? names.map(n => `<div class="card" style="margin-bottom:12px;"><h3>${escapeHtml(n)}</h3>${renderBins(grouped[n].map(r => r.value))}</div>`).join("")
    : `<p class="note">表示対象のロールがありません。</p>`;
}

function renderBins(values) {
  const bins = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10 + 1}-${i * 10 + 10}`, count: 0 }));

  values.forEach(v => {
    bins[Math.min(9, Math.floor((v - 1) / 10))].count++;
  });

  const max = Math.max(1, ...bins.map(b => b.count));
  const total = values.length;

  return bins.map(b => `
    <div class="chart-row">
      <div>${b.label}</div>
      <div class="bar-wrap"><div class="bar" style="width:${(b.count / max) * 100}%"></div></div>
      <div>${b.count}件 / ${rate(b.count, total)}%</div>
    </div>
  `).join("");
}

function renderTable() {
  $("rollTableBody").innerHTML = getSortedVisibleRolls().map((r, i) => {
    const label = classifyRoll(r);
    const pill =
      label === "Critical" ? "crit" :
      label === "Fumble" ? "fumble" :
      label === "Success" ? "success" :
      label === "Fail" ? "fail" :
      "normal";

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.character || "不明")}</td>
        <td><strong>${r.value}</strong></td>
        <td><span class="pill ${pill}">${label}</span></td>
        <td>${escapeHtml(r.line)}</td>
      </tr>`;
  }).join("");
}

function applyInputPanelLayout() {
  const layout = $("appLayout");
  const btn = $("inputToggleBtn");

  if (!layout || !btn) return;

  const count = Object.keys(groupRollsByCharacter(getVisibleRolls())).filter(n => n !== "不明").length;
  const collapse = state.inputPanelMode === "collapsed" || (state.inputPanelMode === "auto" && count >= 4);

  layout.classList.toggle("input-collapsed", collapse);
  btn.textContent = collapse ? "⇥" : "⇤";
  btn.title = collapse ? "入力パネルを開く" : "入力パネルを畳む";
}

function enterScreenshotMode() {
  document.body.classList.add("screenshot-mode");
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

function exitScreenshotMode() {
  document.body.classList.remove("screenshot-mode");
}

function handleGlobalKeydown(event) {
  const key = String(event.key || "").toLowerCase();
  const altOnly = event.altKey && !event.ctrlKey && !event.metaKey;
  const commandShift = (event.ctrlKey || event.metaKey) && event.shiftKey;
  const isScreenshotMode = document.body.classList.contains("screenshot-mode");

  if (event.key === "Escape") {
    event.preventDefault();

    if (isScreenshotMode) {
      exitScreenshotMode();
    } else {
      clearAll();
    }

    return;
  }

  if ((altOnly || commandShift) && key === "o") {
    event.preventDefault();
    $("fileInput").click();
    return;
  }

  if ((altOnly || commandShift) && key === "t") {
    event.preventDefault();
    toggleTheme();
    return;
  }

  if ((altOnly || commandShift) && key === "s") {
    event.preventDefault();
    isScreenshotMode ? exitScreenshotMode() : enterScreenshotMode();
  }
}

function isRuleExplanationLine(line) {
  const text = String(line || "").trim();
  const tab = normalizeTabName(extractLeadingTab(text));
  const body = removeLeadingTab(text).trim();
  const compact = normalizeTabName(body);

  if (tab === "info" || tab.includes("info")) return true;
  if (tab.includes("ルール")) return true;
  if (body.startsWith("ルール説明：") || body.startsWith("ルール説明:")) return true;
  if (body.startsWith("【7版ルール】") || body.startsWith("[7版ルール]")) return true;
  if (compact.startsWith("ルール説明")) return true;
  if (compact.startsWith("7版ルール")) return true;
  if (compact.startsWith("◆7版ルール")) return true;

  return false;
}

function looksLikeHtml(v) {
  const s = String(v || "").toLowerCase();
  return ["<html", "<body", "<p", "<span", "<div", "<br", "&lt;", "&gt;"].some(t => s.includes(t));
}

function looksLikeD100Roll(line) {
  if (isRuleExplanationLine(line)) return false;

  const hasDiceCommand = findDiceCommandIndex(line) >= 0;
  const hasResult = hasRollResultMarker(line);

  if (hasDiceCommand && hasResult) return true;

  return hasAnyText(line, ["出目", "決定的成功", "致命的失敗", "ファンブル", "クリティカル"]);
}

function hasRollResultMarker(line) {
  const text = String(line || "");
  const i = findDiceCommandIndex(text);

  if (i < 0) return false;

  return extractNumbersAfterResultMarkers(text.slice(i)).length > 0;
}

function normalizeNewlines(v) {
  return String(v || "").replaceAll(CR + LF, LF).replaceAll(CR, LF);
}

function cleanLine(line) {
  let s = String(line || "");

  [
    String.fromCharCode(8203),
    String.fromCharCode(8204),
    String.fromCharCode(8205),
    String.fromCharCode(65279)
  ].forEach(ch => {
    s = s.replaceAll(ch, "");
  });

  s = s
    .replaceAll("&nbsp;", " ")
    .replaceAll("│", "|")
    .replaceAll("┃", "|")
    .replaceAll("｜", "|")
    .replaceAll("　", " ")
    .replaceAll(TAB, " ");

  while (s.includes("  ")) s = s.replaceAll("  ", " ");

  return s.trim();
}

function decodeHtml(text) {
  const t = document.createElement("textarea");
  t.innerHTML = text;
  return t.value;
}

function isTabLabel(v) {
  const s = String(v || "").trim();
  return s.startsWith("[") && s.endsWith("]");
}

function extractLeadingTab(line) {
  const s = String(line || "").trim();
  if (!s.startsWith("[")) return "";

  const end = s.indexOf("]");
  return end >= 0 ? s.slice(1, end) : "";
}

function normalizeTabName(tab) {
  return String(tab || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll("　", "")
    .replaceAll(TAB, "");
}

function removeLeadingTab(v) {
  const s = String(v || "").trim();
  if (!s.startsWith("[")) return s;

  const end = s.indexOf("]");
  return end >= 0 ? s.slice(end + 1).trim() : s;
}

function trimTrailingSeparators(v) {
  let s = String(v || "").trim();
  const sep = [":", "：", "-", "―", "＞", ">", "(", "（"];

  while (s && sep.includes(s[s.length - 1])) {
    s = s.slice(0, -1).trim();
  }

  return s;
}

function trimTrailingRollPrefix(v) {
  let s = String(v || "")
    .trim()
    .replaceAll("×", "x")
    .replaceAll("Ｘ", "x")
    .replaceAll("ｘ", "x");

  const lower = s.toLowerCase();
  const i = lower.lastIndexOf("x");

  if (i < 0) return s;

  const tail = lower.slice(i + 1).trim();
  if (!tail || tail.split("").some(c => c < "0" || c > "9")) return s;

  return trimTrailingSeparators(s.slice(0, i).trim()) || s;
}

function cleanCharacterName(name) {
  return String(name || "")
    .replace(/[「」『』【】]/g, "")
    .replace(/^\[|\]$/g, "")
    .trim() || "不明";
}

function isUsableCharacterName(name) {
  const s = String(name || "").trim();

  return !!s &&
    s !== "不明" &&
    !["(", ")", "（", "）"].includes(s) &&
    s.replace(/[()（）]/g, "").trim() !== "";
}

function isAsciiAlphaNumber(c) {
  return (c >= "A" && c <= "Z") || (c >= "0" && c <= "9");
}

function isWhitespace(c) {
  return c === " " || c === "　" || c === TAB || c === LF || c === CR;
}

function hasAnyText(v, terms) {
  const s = String(v || "").toLowerCase();
  return terms.some(t => s.includes(String(t).toLowerCase()));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rate(count, total) {
  return total ? ((count / total) * 100).toFixed(2) : "0.00";
}

function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[m]));
}

function escapeAttribute(v) {
  return escapeHtml(v).replaceAll("`", "&#096;");
}

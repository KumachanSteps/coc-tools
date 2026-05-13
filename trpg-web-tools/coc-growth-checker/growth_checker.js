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
      map.set(roll.character, {
        name: roll.character,
        rolls: [],
        growth: []
      });
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
      candidates.push({
        ...roll,
        note: "Chance to grow <POW>"
      });
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
      if (isCritical || isFumble) {
        candidates.push(roll);
      }
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
  state.rolls = CocDiceParser.parse(state.rawInput);
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
    state.visibleCharacters = new Set(
      sorted
        .filter(c => c.rolls.length >= minRolls)
        .map(c => c.name)
    );
  } else {
    const remainingVisible = [...state.visibleCharacters]
      .filter(name => state.characters.has(name));

    state.visibleCharacters = new Set(remainingVisible);
  }

  renderSummary(sorted, filteredRolls);
  renderCharacterFilter(sorted, minRolls);
  renderResults(sorted, minRolls);
}

function renderSummary(chars, filteredRolls) {
  const totalCandidates = chars.reduce((sum, char) => sum + char.growth.length, 0);
  const shownChars = chars.filter(char => state.visibleCharacters.has(char.name)).length;
  const crits = filteredRolls.filter(roll => roll.result === "critical").length;
  const fumbles = filteredRolls.filter(roll => roll.result === "fumble").length;

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

      if (event.currentTarget.checked) {
        state.visibleCharacters.add(name);
      } else {
        state.visibleCharacters.delete(name);
      }

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

  const visible = chars.filter(char => state.visibleCharacters.has(char.name));

  if (!visible.length) {
    el.results.className = "empty";
    el.results.innerHTML = "表示対象のキャラクターがありません。キャラクター表示チェックをONにしてください。";
    state.lastTextOutput = "";
    return;
  }

  el.results.className = "";
  el.results.innerHTML = visible
    .map(char => renderCharacterCard(char, minRolls))
    .join("");

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
            <thead>
              <tr>
                <th>技能</th>
                <th>結果</th>
                <th>出目</th>
                <th>元ログ</th>
              </tr>
            </thead>
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

  const cls = ["critical", "fumble", "special", "success"].includes(result)
    ? result
    : "";

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

  window.location.href = DICE_STAT_ANALYST_URL;
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
      .filter(char => char.rolls.length >= minRolls)
      .map(char => char.name)
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
      .filter(char => char.rolls.length >= minRolls)
      .map(char => char.name)
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
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

const INITIAL_6E = {
  "こぶし": 50, "キック": 25, "組み付き": 25, "頭突き": 10, "投擲": 25,
  "マーシャルアーツ": 1, "拳銃": 20, "サブマシンガン": 15, "ショットガン": 30, "マシンガン": 15, "ライフル": 25,
  "応急手当": 30, "鍵開け": 1, "隠す": 15, "隠れる": 10, "忍び歩き": 10, "写真術": 10,
  "精神分析": 1, "追跡": 10, "登攀": 40, "運転": 20, "機械修理": 20, "重機械操作": 1,
  "乗馬": 5, "水泳": 25, "製作": 5, "操縦": 1, "跳躍": 25, "電気修理": 10, "ナビゲート": 10, "変装": 1,
  "言いくるめ": 5, "信用": 15, "説得": 15, "値切り": 5,
  "医学": 5, "オカルト": 5, "化学": 1, "芸術": 5, "経理": 10, "考古学": 1, "コンピューター": 1,
  "心理学": 5, "人類学": 1, "生物学": 1, "地質学": 1, "電子工学": 1, "天文学": 1, "博物学": 10,
  "物理学": 1, "法律": 5, "薬学": 1, "歴史": 20,
  "目星": 25, "聞き耳": 25, "図書館": 25
};

const INITIAL_7E = {
  "目星": 25, "聞き耳": 20, "図書館": 20, "近接戦闘": 25, "投擲": 20,
  "射撃：拳銃": 20, "射撃：サブマシンガン": 15, "射撃：重火器": 10, "射撃：マシンガン": 10,
  "射撃：ライフル": 25, "射撃：ショットガン": 25, "射撃：弓": 15,
  "応急手当": 30, "鍵開け": 1, "手さばき": 10, "隠密": 20, "精神分析": 1, "追跡": 10, "登攀": 20,
  "鑑定": 5, "運転": 20, "機械修理": 10, "重機械操作": 1, "乗馬": 5, "水泳": 20, "製作": 5,
  "操縦": 1, "跳躍": 20, "電気修理": 10, "ナビゲート": 10, "変装": 5, "ダイビング": 1,
  "言いくるめ": 5, "説得": 10, "威圧": 15, "魅惑": 15,
  "医学": 1, "オカルト": 5, "芸術": 5, "経理": 5, "考古学": 1, "コンピューター": 5, "科学": 1,
  "心理学": 10, "人類学": 1, "電子工学": 1, "自然": 10, "法律": 5, "歴史": 5, "サバイバル": 10, "伝承": 1
};

const CATEGORY_6E = {
  dice: ["正気度ロール", "SAN", "アイデア", "幸運", "知識"],
  explore: ["目星", "聞き耳", "図書館"],
  combat: ["回避", "こぶし", "キック", "組み付き", "頭突き", "投擲", "マーシャルアーツ", "拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル"],
  action: ["応急手当", "鍵開け", "隠す", "隠れる", "忍び歩き", "写真術", "精神分析", "追跡", "登攀", "運転", "機械修理", "重機械操作", "乗馬", "水泳", "製作", "操縦", "跳躍", "電気修理", "ナビゲート", "変装"],
  social: ["言いくるめ", "信用", "説得", "値切り"],
  knowledge: ["医学", "オカルト", "化学", "芸術", "経理", "考古学", "コンピューター", "心理学", "人類学", "生物学", "地質学", "電子工学", "天文学", "博物学", "物理学", "法律", "薬学", "歴史", "母国語"]
};

const CATEGORY_7E = {
  dice: ["正気度ロール", "SAN", "アイデア", "幸運", "知識"],
  explore: ["目星", "聞き耳", "図書館"],
  combat: ["回避", "近接戦闘", "投擲", "射撃", "砲"],
  action: ["応急手当", "鍵開け", "手さばき", "隠密", "精神分析", "追跡", "登攀", "鑑定", "運転", "機械修理", "重機械操作", "乗馬", "水泳", "製作", "操縦", "跳躍", "電気修理", "ナビゲート", "変装", "ダイビング"],
  social: ["言いくるめ", "説得", "威圧", "魅惑", "信用"],
  knowledge: ["言語", "医学", "オカルト", "芸術", "経理", "考古学", "コンピューター", "科学", "心理学", "人類学", "電子工学", "自然", "法律", "歴史", "サバイバル", "伝承"]
};

const SECTION_LABELS = {
  dice: "◼️ダイス",
  explore: "🟦探索技能",
  combat: "🟥戦闘技能",
  action: "🟧行動技能",
  social: "🟪交渉・対人技能",
  knowledge: "⬜️知識技能",
  damage: "🩸ダメージ・武器",
  other: "========その他 / 未分類========",
  initial: "========初期値========",
  status: "========能力値========",
  params: "=====パラメータ化====="
};

let editionMode = "auto";
let detectedEdition = "";

function setEditionMode(mode) {
  editionMode = mode;

  document.querySelectorAll(".edition-toggle button").forEach(button => {
    button.classList.toggle("active", button.dataset.edition === mode);
  });

  if (mode === "auto") {
    handleInputChange();
  } else {
    const label = mode === "6e" ? "CoC 6版" : "CoC 7版";
    setStatus("版指定を" + label + "に切り替えました。自動判定よりもこの指定を優先します。");
  }
}

function handleInputChange() {
  if (editionMode !== "auto") return;

  const extracted = extractPaletteText(document.getElementById("input").value);

  if (!extracted.text) {
    detectedEdition = "";
    setStatus("元のチャットパレット、またはキャラクター駒JSONを貼り付けてください。形式とCoC 6版 / 7版は自動判定します。");
    return;
  }

  detectedEdition = detectEdition(extracted.text);

  setStatus(
    "入力内容から " +
    (detectedEdition === "6e" ? "CoC 6版" : "CoC 7版") +
    " と自動判定しています。必要に応じて版指定ボタンで上書きできます。"
  );
}

function getSelectedEdition(text) {
  if (editionMode === "6e" || editionMode === "7e") return editionMode;
  detectedEdition = detectEdition(text);
  return detectedEdition;
}

function setStatus(message, type) {
  const status = document.getElementById("statusMessage");
  status.textContent = message;

  if (type === "error") {
    status.style.color = "#9f3a3a";
    status.style.background = "rgba(255, 245, 245, 0.78)";
    status.style.borderColor = "rgba(190, 70, 70, 0.35)";
  } else {
    status.style.color = "#526b86";
    status.style.background = "rgba(255,255,255,0.68)";
    status.style.borderColor = "var(--border)";
  }
}

function normalizeText(text) {
  return String(text || "")
    .split(BS + "n").join(NL)
    .split(String.fromCharCode(13, 10)).join(NL)
    .split(String.fromCharCode(13)).join(NL);
}

function includesPaletteWords(text) {
  const words = ["CCB", "CC", "1D100", "1d100", "SAN", "正気度", "目星", "聞き耳", "図書館", "近接戦闘", "こぶし", "幸運"];
  return words.some(word => String(text || "").includes(word));
}

function findByKeys(obj, keys, requirePalette) {
  const visited = new Set();

  function search(value) {
    if (!value || typeof value !== "object" || visited.has(value)) return "";
    visited.add(value);

    for (const key of keys) {
      if (typeof value[key] === "string") {
        if (!requirePalette || includesPaletteWords(value[key])) return value[key];
      }
    }

    for (const child of Object.values(value)) {
      if (typeof child === "string" && requirePalette && includesPaletteWords(child)) return child;

      if (child && typeof child === "object") {
        const result = search(child);
        if (result) return result;
      }
    }

    return "";
  }

  return search(obj);
}

function extractPaletteText(rawInput) {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return { text: "", source: "empty", characterName: "" };
  }

  try {
    const json = JSON.parse(trimmed);

    return {
      text: normalizeText(findByKeys(json, ["commands", "chatPalette", "chat_palette", "palette", "memo", "command"], true)),
      source: "json",
      characterName: findByKeys(json, ["name", "characterName", "character_name"], false)
    };
  } catch (error) {
    return {
      text: normalizeText(trimmed),
      source: "text",
      characterName: ""
    };
  }
}

function cleanSkillName(skillName) {
  let skill = String(skillName || "").trim();
  const indexes = [skill.indexOf("（"), skill.indexOf("(")].filter(i => i >= 0);
  const parenIndex = indexes.length ? Math.min(...indexes) : -1;

  if (parenIndex >= 0) skill = skill.slice(0, parenIndex).trim();
  if (skill.startsWith("技能：")) skill = skill.slice(3).trim();
  if (skill.startsWith("技能:")) skill = skill.slice(3).trim();

  return skill;
}

function getSkillFromLine(line) {
  const start = line.indexOf("【");
  const end = line.indexOf("】", start + 1);

  if (start < 0 || end < 0) return "";
  return line.slice(start + 1, end).trim();
}

function getValueFromLine(line) {
  const markers = ["<=", "＜=", "<＝", "≦"];
  let pos = -1;
  let marker = "";

  for (const m of markers) {
    pos = line.indexOf(m);
    if (pos >= 0) {
      marker = m;
      break;
    }
  }

  if (pos < 0) return "";

  const after = line.slice(pos + marker.length).trim();
  let value = "";

  for (const ch of after) {
    if (
      (ch >= "0" && ch <= "9") ||
      ch === "{" ||
      ch === "}" ||
      ch === "_" ||
      ch === "英" ||
      ch === "幸" ||
      ch === "知" ||
      ch === "ア"
    ) {
      value += ch;
    } else {
      break;
    }
  }

  return value;
}

function detectEdition(text) {
  const names = text
    .split(NL)
    .map(getSkillFromLine)
    .map(cleanSkillName)
    .filter(Boolean);

  const seven = ["近接戦闘", "射撃", "手さばき", "隠密", "鑑定", "自然", "サバイバル", "伝承", "威圧", "魅惑", "ダイビング", "読唇術"];
  const six = ["こぶし", "キック", "組み付き", "頭突き", "マーシャルアーツ", "隠す", "隠れる", "忍び歩き", "写真術", "値切り", "博物学", "薬学", "物理学", "天文学", "生物学", "地質学"];

  let score7 = 0;
  let score6 = 0;

  for (const skill of names) {
    if (seven.some(word => skill.includes(word))) score7 += 2;
    if (six.some(word => skill.includes(word))) score6 += 2;
  }

  if (text.includes("CC<=")) score7 += 1;
  if (text.includes("CCB<=")) score6 += 1;
  if (text.includes("射撃：") || text.includes("射撃:")) score7 += 2;

  return score7 > score6 ? "7e" : "6e";
}

function commandForEdition(edition) {
  return edition === "6e" ? "CCB" : "CC";
}

function lineForSkill(edition, value, skill) {
  return commandForEdition(edition) + "<=" + value + " 【" + skill + "】";
}

function normalizeCommand(line, edition) {
  const trimmed = line.trim();
  const commands = ["sCCB", "sCC", "CCB", "CC"];

  for (const command of commands) {
    if (trimmed.startsWith(command + "<=")) {
      return commandForEdition(edition) + trimmed.slice(command.length);
    }
  }

  return trimmed;
}

function parseLine(line) {
  const skillFull = getSkillFromLine(line);
  const hasCommand =
    line.includes("CC<=") ||
    line.includes("CCB<=") ||
    line.includes("sCC<=") ||
    line.includes("sCCB<=") ||
    line.includes("1D100") ||
    line.includes("1d100");

  if (skillFull && hasCommand) {
    return {
      type: "skill",
      line,
      skillFull,
      skill: cleanSkillName(skillFull),
      value: getValueFromLine(line)
    };
  }

  const upper = line.toUpperCase();
  const stats = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "HP", "MP", "SAN"];

  if (stats.some(stat => upper.startsWith(stat + ":") || upper.startsWith(stat + "："))) {
    return { type: "status", line };
  }

  if (upper.includes("D") && hasNumber(line)) return { type: "damage", line };
  if (line.includes("ダメージ") || upper.includes("DB") || upper.includes("DAMAGE")) return { type: "damage", line };

  return { type: "other", line };
}

function hasNumber(text) {
  return String(text).split("").some(ch => ch >= "0" && ch <= "9");
}

function categorize(skill, skillFull, edition) {
  const table = edition === "6e" ? CATEGORY_6E : CATEGORY_7E;
  const target = skill + " " + skillFull;

  for (const category of ["dice", "explore", "combat", "action", "social", "knowledge"]) {
    if (table[category].some(word => target.includes(word))) return category;
  }

  return "other";
}

function addUnique(list, line, seen) {
  const key = line.trim();

  if (!key || seen.has(key)) return;

  list.push(key);
  seen.add(key);
}

function sortSection(lines, order) {
  return lines.sort((a, b) => {
    const aSkill = cleanSkillName(getSkillFromLine(a));
    const bSkill = cleanSkillName(getSkillFromLine(b));
    const ai = order.findIndex(word => aSkill.includes(word));
    const bi = order.findIndex(word => bSkill.includes(word));

    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
}

function injectCoreLines(buckets, present, edition, seen) {
  const initial = edition === "6e" ? INITIAL_6E : INITIAL_7E;
  const command = commandForEdition(edition);

  addUnique(buckets.dice, command + "<={SAN} 【正気度ロール】", seen);
  addUnique(buckets.dice, command + "<={幸運} 【幸運】", seen);

  for (const skill of ["目星", "聞き耳", "図書館"]) {
    if (!buckets.explore.some(line => line.includes("【" + skill + "】"))) {
      buckets.explore.unshift(lineForSkill(edition, present.get(skill) || initial[skill], skill));
    }
  }

  const combat = edition === "7e" ? ["回避", "近接戦闘"] : ["回避"];

  for (const skill of combat.reverse()) {
    if (!buckets.combat.some(line => line.includes("【" + skill + "】"))) {
      buckets.combat.unshift(lineForSkill(edition, present.get(skill) || initial[skill] || 0, skill));
    }
  }
}

function buildInitialLines(present, edition) {
  const initial = edition === "6e" ? INITIAL_6E : INITIAL_7E;
  const skip = new Set(["目星", "聞き耳", "図書館", "回避", "幸運", "正気度ロール", "SAN", "アイデア", "知識"]);

  if (edition === "7e") skip.add("近接戦闘");

  return Object.entries(initial)
    .filter(([skill]) => !skip.has(skill) && !present.has(skill))
    .map(([skill, value]) => lineForSkill(edition, value, skill));
}

function buildStatusLines(edition) {
  return ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"]
    .map(stat => lineForSkill(edition, "{" + stat + "}", stat));
}

function buildParamLines(present, edition) {
  const initial = edition === "6e" ? INITIAL_6E : INITIAL_7E;
  const skills = edition === "6e"
    ? ["アイデア", "知識", "目星", "聞き耳", "図書館", "回避", "こぶし"]
    : ["アイデア", "知識", "目星", "聞き耳", "図書館", "回避", "近接戦闘"];

  return skills.map(skill => "//" + skill + " = " + (present.get(skill) || initial[skill] || 0));
}

function pushSection(output, label, lines) {
  if (!lines || lines.length === 0) return;

  if (output.length) output.push("");

  output.push(label, ...lines);
}

function buildOutput(text, edition, characterName) {
  const buckets = {
    dice: [],
    explore: [],
    combat: [],
    action: [],
    social: [],
    knowledge: [],
    damage: [],
    other: []
  };

  const present = new Map();
  const seen = new Set();
  const lines = text.split(NL).map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    const parsed = parseLine(line);

    if (parsed.type === "skill") {
      if (parsed.value) present.set(parsed.skill, parsed.value);

      const category = categorize(parsed.skill, parsed.skillFull, edition);
      addUnique(buckets[category], normalizeCommand(parsed.line, edition), seen);
    } else if (parsed.type === "damage") {
      addUnique(buckets.damage, parsed.line, seen);
    } else {
      addUnique(buckets.other, parsed.line, seen);
    }
  }

  injectCoreLines(buckets, present, edition, seen);

  const orderTable = edition === "6e" ? CATEGORY_6E : CATEGORY_7E;

  for (const key of ["dice", "explore", "combat", "action", "social", "knowledge"]) {
    buckets[key] = sortSection(buckets[key], orderTable[key]);
  }

  const output = [];

  if (characterName) output.push("// キャラクター名：" + characterName, "");

  pushSection(output, SECTION_LABELS.dice, buckets.dice);
  pushSection(output, SECTION_LABELS.explore, buckets.explore);
  pushSection(output, SECTION_LABELS.combat, buckets.combat);
  pushSection(output, SECTION_LABELS.action, buckets.action);
  pushSection(output, SECTION_LABELS.social, buckets.social);
  pushSection(output, SECTION_LABELS.knowledge, buckets.knowledge);
  pushSection(output, SECTION_LABELS.damage, buckets.damage);
  pushSection(output, SECTION_LABELS.other, buckets.other);
  pushSection(output, SECTION_LABELS.initial, buildInitialLines(present, edition));
  pushSection(output, SECTION_LABELS.status, buildStatusLines(edition));
  pushSection(output, SECTION_LABELS.params, buildParamLines(present, edition));

  return output.join(NL).trim();
}

function formatPalette() {
  const input = document.getElementById("input").value;
  const output = document.getElementById("output");
  const extracted = extractPaletteText(input);

  if (!extracted.text) {
    output.value = "";
    setStatus("チャットパレットを抽出できませんでした。入力内容を確認してください。", "error");
    return;
  }

  const edition = getSelectedEdition(extracted.text);
  output.value = buildOutput(extracted.text, edition, extracted.characterName);

  const editionLabel = edition === "6e" ? "CoC 6版" : "CoC 7版";
  const sourceLabel = extracted.source === "json" ? "JSONデータ" : "テキスト入力";
  const modeLabel = editionMode === "auto" ? "自動判定" : "手動指定";

  setStatus(sourceLabel + "からチャットパレットを読み込み、" + editionLabel + "として整形しました。（" + modeLabel + "）");
}

function clearAll() {
  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
  detectedEdition = "";
  setEditionMode("auto");
  setStatus("入力欄と出力欄をクリアしました。");
}

function copyOutput() {
  const output = document.getElementById("output");

  if (!output.value) {
    setStatus("コピーする内容がありません。", "error");
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(output.value).then(() => {
      setStatus("整形済みチャットパレットをコピーしました。");
    }).catch(() => {
      fallbackCopy(output);
    });
  } else {
    fallbackCopy(output);
  }
}

function fallbackCopy(output) {
  output.focus();
  output.select();

  try {
    document.execCommand("copy");
    setStatus("整形済みチャットパレットをコピーしました。");
  } catch (error) {
    setStatus("コピーに失敗しました。手動で選択してコピーしてください。", "error");
  }
}
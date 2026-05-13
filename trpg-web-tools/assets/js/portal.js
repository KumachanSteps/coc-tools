const tools = [
  {
    name: "Dice Stat Analyst",
    icon: "📊",
    status: "Available",
    category: "Log Analysis",
    href: "./dice-stat-analyst/",
    description:
      "セッションログHTML / テキストから、探索者ごとの成功率・クリティカル・ファンブル・出目分布を解析します。",
  },
  {
    name: "CoC 6e/7e Growth Checker",
    icon: "🌱",
    status: "In Production",
    category: "Log Analysis",
    href: "./coc-growth-checker/",
    description:
      "セッションログから、CoC 6版・7版の成長チェック対象技能をハウスルール別に抽出・整理します。",
  },
  {
    name: "Session Report Generator",
    icon: "📝",
    status: "In Production",
    category: "Report Writing",
    href: "./session-report-generator/",
    description:
      "KP・PL・PC情報を入力し、X/Twitter向けの卓報告文を生成・編集・プレビューします。",
  },
  {
    name: "Scenario Info Snippetter",
    icon: "✂️",
    status: "In Production",
    category: "Scenario Prep",
    href: "./scenario-snippet-builder/",
    description:
      "シナリオ情報、探索箇所、資料、技能成功情報などをCCFOLIA / Discord向けに整形します。",
  },
  {
    name: "Chat Palette Formatter",
    icon: "💬",
    status: "In Production",
    category: "Character Utility",
    href: "./chat-palette-formatter/",
    description:
      "CoC 6版・7版のチャットパレットを判定し、読みやすい形式へ整形します。",
  },
  {
    name: "Charamemo Generator",
    icon: "📋",
    status: "In Production",
    category: "Character Utility",
    href: "./iachara-charamemo-creator/",
    description:
      "いあきゃらのキャラクター情報から、キャラメモやコマ用データを生成します。",
  },
  {
    name: "TRPG Haishin Observatory",
    icon: "🔭",
    status: "In Production",
    category: "Haishin Tracking",
    href: "./trpg-haishin-observatory/",
    description:
      "YouTubeのTRPG配信予定を整理し、シナリオ・チャンネル・GM/KP/PL・ハッシュタグから検索、Fav管理できる観測ツールです。",
  },
  {
    name: "TRPG Scenario Organizer",
    icon: "🗂️",
    status: "Idea",
    category: "Scenario Prep",
    href: "",
    description:
      "BOOTHやPixivなどで見つけたTRPGシナリオを、システム・人数・時間・秘匿有無・テーマ・お気に入り数などで整理、検索するデータベース構想です。",
  },
  {
    name: "GM Charashi Viewer",
    icon: "👥",
    status: "Idea",
    category: "GM Support",
    href: "",
    description:
      "KP / GM向けに、複数のキャラクターシートを一画面で確認・管理するビューア構想です。",
  },
];

const statusMeta = {
  Available: {
    label: "Available",
    icon: "✓",
    className: "status-available",
  },
  "In Production": {
    label: "In Production",
    icon: "⚗",
    className: "status-production",
  },
  Idea: {
    label: "Idea",
    icon: "✦",
    className: "status-idea",
  },
};

let currentCategory = "All";
let currentQuery = "";

const toolsGrid = document.getElementById("toolsGrid");
const searchInput = document.getElementById("searchInput");
const categoryButtons = document.getElementById("categoryButtons");
const availableCount = document.getElementById("availableCount");
const productionCount = document.getElementById("productionCount");
const ideaCount = document.getElementById("ideaCount");
const modeToggle = document.getElementById("modeToggle");
const modeIcon = document.getElementById("modeIcon");
const modeText = document.getElementById("modeText");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateStatusCounts() {
  const counts = tools.reduce((acc, tool) => {
    acc[tool.status] = (acc[tool.status] || 0) + 1;
    return acc;
  }, {});

  availableCount.textContent = counts.Available || 0;
  productionCount.textContent = counts["In Production"] || 0;
  ideaCount.textContent = counts.Idea || 0;
}

function getFilteredTools() {
  const normalizedQuery = currentQuery.trim().toLowerCase();

  return tools.filter((tool) => {
    const matchesCategory =
      currentCategory === "All" || tool.category === currentCategory;

    const searchableText = [
      tool.name,
      tool.description,
      tool.category,
      tool.status,
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery =
      !normalizedQuery || searchableText.includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}

function createToolCard(tool, index) {
  const meta = statusMeta[tool.status] || statusMeta.Idea;
  const isDisabled = tool.status === "Idea" || !tool.href;
  const tagName = isDisabled ? "article" : "a";

  const card = document.createElement(tagName);
  card.className = `tool-card${isDisabled ? " is-disabled" : ""}`;
  card.style.animationDelay = `${index * 0.045}s`;

  if (!isDisabled) {
    card.href = tool.href;
    card.setAttribute("aria-label", `Open ${tool.name}`);
  } else {
    card.setAttribute("aria-label", `${tool.name}, coming soon`);
  }

  card.innerHTML = `
    <div class="tool-card-top">
      <div class="tool-icon" aria-hidden="true">${escapeHtml(tool.icon)}</div>
      <span class="status-badge ${escapeHtml(meta.className)}">
        <span aria-hidden="true">${escapeHtml(meta.icon)}</span>
        ${escapeHtml(meta.label)}
      </span>
    </div>

    <p class="tool-category">${escapeHtml(tool.category)}</p>
    <h2>${escapeHtml(tool.name)}</h2>
    <p class="tool-description">${escapeHtml(tool.description)}</p>

    <div class="open-text">
      ${isDisabled ? "Coming Soon" : "Open Tool →"}
    </div>
  `;

  return card;
}

function renderTools() {
  const filteredTools = getFilteredTools();
  toolsGrid.innerHTML = "";

  if (filteredTools.length === 0) {
    toolsGrid.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">No tools found</p>
        <p class="empty-text">Search keyword or category filter did not match any tool.</p>
      </div>
    `;
    return;
  }

  filteredTools.forEach((tool, index) => {
    toolsGrid.appendChild(createToolCard(tool, index));
  });
}

function updateCategoryButtons() {
  const buttons = categoryButtons.querySelectorAll(".category-button");

  buttons.forEach((button) => {
    const isActive = button.dataset.category === currentCategory;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setMode(mode) {
  const isDawnMode = mode === "dawn";

  document.body.classList.toggle("theme-dawn", isDawnMode);

  modeIcon.textContent = isDawnMode ? "☾" : "☀";
  modeText.textContent = isDawnMode ? "Deep Space" : "Dawn";

  modeToggle.setAttribute(
    "aria-label",
    isDawnMode ? "Switch to deep space mode" : "Switch to dawn mode"
  );

  localStorage.setItem("trpgPortalMode", isDawnMode ? "dawn" : "deep-space");
}

function initMode() {
  const savedMode = localStorage.getItem("trpgPortalMode");

  if (savedMode === "deep-space") {
    setMode("deep-space");
    return;
  }

  setMode("dawn");
}

searchInput.addEventListener("input", (event) => {
  currentQuery = event.target.value;
  renderTools();
});

categoryButtons.addEventListener("click", (event) => {
  const button = event.target.closest(".category-button");

  if (!button) {
    return;
  }

  currentCategory = button.dataset.category || "All";
  updateCategoryButtons();
  renderTools();
});

modeToggle.addEventListener("click", () => {
  const isDawnMode = document.body.classList.contains("theme-dawn");
  setMode(isDawnMode ? "deep-space" : "dawn");
});

updateStatusCounts();
updateCategoryButtons();
initMode();
renderTools();
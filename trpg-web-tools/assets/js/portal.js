const portalI18n = window.TRPG_PORTAL_I18N;
const tools = portalI18n.tools;
const statusMeta = portalI18n.statuses;

let currentCategory = "all";
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

const themeStorageKey = "trpgPortalThemeV2";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLanguage() {
  if (window.TRPGLanguage && typeof window.TRPGLanguage.getLanguage === "function") {
    return window.TRPGLanguage.getLanguage();
  }

  return portalI18n.defaultLanguage || "ja";
}

function t(path) {
  if (window.TRPGLanguage && typeof window.TRPGLanguage.t === "function") {
    return window.TRPGLanguage.t(path);
  }

  return path;
}

function getLocalizedValue(value) {
  const language = getLanguage();

  if (window.TRPGLanguage && typeof window.TRPGLanguage.getLocalizedValue === "function") {
    return window.TRPGLanguage.getLocalizedValue(value, language);
  }

  if (value && typeof value === "object") {
    return value[language] || value.ja || value.en || "";
  }

  return value || "";
}

function updateStatusCounts() {
  const counts = tools.reduce((acc, tool) => {
    acc[tool.status] = (acc[tool.status] || 0) + 1;
    return acc;
  }, {});

  availableCount.textContent = counts.available || 0;
  productionCount.textContent = counts.production || 0;
  ideaCount.textContent = counts.idea || 0;
}

function getFilteredTools() {
  const normalizedQuery = currentQuery.trim().toLowerCase();

  return tools.filter((tool) => {
    const matchesCategory =
      currentCategory === "all" || tool.category === currentCategory;

    const searchableText = [
      getLocalizedValue(tool.name),
      getLocalizedValue(tool.description),
      t(`categories.${tool.category}`),
      t(`status.${tool.status}`),
      tool.id,
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
  const meta = statusMeta[tool.status] || statusMeta.idea;
  const isDisabled = tool.status === "idea" || !tool.href;
  const isDevelopment = tool.status === "production";
  const tagName = isDisabled ? "article" : "a";

  const toolName = getLocalizedValue(tool.name);
  const toolDescription = getLocalizedValue(tool.description);
  const toolCategory = t(`categories.${tool.category}`);
  const statusLabel = t(`status.${tool.status}`);
  const developmentPreviewText = t("toolAction.developmentPreview");

  const card = document.createElement(tagName);
  card.className = [
    "tool-card",
    `tool-card-status-${tool.status}`,
    isDisabled ? "is-disabled" : "",
    isDevelopment ? "is-development" : "",
  ]
    .filter(Boolean)
    .join(" ");

  card.style.animationDelay = `${index * 0.045}s`;

  if (isDevelopment) {
    card.setAttribute("data-hover-message", developmentPreviewText);
  }

  if (!isDisabled) {
    card.href = tool.href;
    card.setAttribute("aria-label", `${t("toolAction.open")} ${toolName}`);
  } else {
    card.setAttribute("aria-label", `${toolName}, ${t("toolAction.comingSoon")}`);
  }

  card.innerHTML = `
    <div class="tool-card-top">
      <div class="tool-icon" aria-hidden="true">${escapeHtml(tool.icon)}</div>
      <span class="status-badge ${escapeHtml(meta.className)}">
        <span aria-hidden="true">${escapeHtml(meta.icon)}</span>
        ${escapeHtml(statusLabel)}
      </span>
    </div>

    <p class="tool-category">${escapeHtml(toolCategory)}</p>
    <h2>${escapeHtml(toolName)}</h2>
    <p class="tool-description">${escapeHtml(toolDescription)}</p>

    <div class="open-text">
      ${isDisabled ? escapeHtml(t("toolAction.comingSoon")) : escapeHtml(t("toolAction.open"))}
    </div>

    ${
      isDevelopment
        ? `<div class="tool-hover-message">${escapeHtml(developmentPreviewText)}</div>`
        : ""
    }
  `;

  return card;
}

function renderTools() {
  const filteredTools = getFilteredTools();
  toolsGrid.innerHTML = "";

  if (filteredTools.length === 0) {
    toolsGrid.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">${escapeHtml(t("empty.title"))}</p>
        <p class="empty-text">${escapeHtml(t("empty.text"))}</p>
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
  modeText.textContent = isDawnMode
    ? t("mode.switchToDeepSpace")
    : t("mode.switchToDawn");

  modeToggle.setAttribute(
    "aria-label",
    isDawnMode ? t("mode.ariaToDeepSpace") : t("mode.ariaToDawn")
  );

  localStorage.setItem(themeStorageKey, isDawnMode ? "dawn" : "deep-space");
}

function getCurrentMode() {
  return document.body.classList.contains("theme-dawn") ? "dawn" : "deep-space";
}

function initMode() {
  const savedMode = localStorage.getItem(themeStorageKey);

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

  currentCategory = button.dataset.category || "all";
  updateCategoryButtons();
  renderTools();
});

modeToggle.addEventListener("click", () => {
  const currentMode = getCurrentMode();
  setMode(currentMode === "dawn" ? "deep-space" : "dawn");
});

if (window.TRPGLanguage && typeof window.TRPGLanguage.onChange === "function") {
  window.TRPGLanguage.onChange(() => {
    updateStatusCounts();
    updateCategoryButtons();
    setMode(getCurrentMode());
    renderTools();
  });
}

updateStatusCounts();
updateCategoryButtons();
initMode();
renderTools();
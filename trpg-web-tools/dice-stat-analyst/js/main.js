/*
  main.js
  初期化・イベント登録・メイン操作
*/

const THEME_STORAGE_KEY = 'diceStatAnalystTheme';

const state = {
  rolls: [],
  filteredLines: [],
  hiddenCharacters: new Set(),
  sort: { key: 'index', direction: 'asc' },
  showCharacterControls: false,
  inputPanelMode: 'auto',
  dark: localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
};

bindEvents();
initializeApp();

function initializeApp() {
  syncThemeSwitch();
  initializeLanguageUI();

  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }

  render();
}

function bindEvents() {
  const themeToggleBtn = $('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  const languageToggleBtn = $('languageToggleBtn');
  if (languageToggleBtn) {
    languageToggleBtn.addEventListener('click', toggleLanguage);
  }

  const shortcutHelpBtn = $('shortcutHelpBtn');
  const shortcutModalCloseBtn = $('shortcutModalCloseBtn');
  const shortcutModalBackdrop = $('shortcutModalBackdrop');

  if (shortcutHelpBtn) {
    shortcutHelpBtn.addEventListener('click', openShortcutModal);
  }

  if (shortcutModalCloseBtn) {
    shortcutModalCloseBtn.addEventListener('click', closeShortcutModal);
  }

  if (shortcutModalBackdrop) {
    shortcutModalBackdrop.addEventListener('click', closeShortcutModal);
  }

  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchTab(button));
  });

  document.querySelectorAll('button[data-sort-key]').forEach(button => {
    button.addEventListener('click', () => toggleSort(button.dataset.sortKey));
  });

  const fileInput = $('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileInput);
  }

  const inputToggleBtn = $('inputToggleBtn');
  if (inputToggleBtn) {
    inputToggleBtn.addEventListener('click', toggleInputPanel);
  }

  const characterControlToggleBtn = $('characterControlToggleBtn');
  if (characterControlToggleBtn) {
    characterControlToggleBtn.addEventListener('click', () => {
      state.showCharacterControls = !state.showCharacterControls;
      renderCharacterControls();
    });
  }

  const summaryShotBtn = $('summaryShotBtn');
  if (summaryShotBtn) {
    summaryShotBtn.addEventListener('click', enterScreenshotMode);
  }

  const screenshotExitBtn = $('screenshotExitBtn');
  if (screenshotExitBtn) {
    screenshotExitBtn.addEventListener('click', exitScreenshotMode);
  }

  document.addEventListener('keydown', handleGlobalKeydown);

  const analyzeBtn = $('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyze);
  }

  const clearBtn = $('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAll);
  }

  document.addEventListener('languagechange', () => {
    initializeLanguageUI();
    syncThemeSwitch();
    render();
  });
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
  localStorage.setItem(THEME_STORAGE_KEY, state.dark ? 'dark' : 'light');
  syncThemeSwitch();
}

function syncThemeSwitch() {
  document.body.classList.toggle('dark', state.dark);

  const button = $('themeToggleBtn');
  if (!button) return;

  const title = state.dark
    ? tr('theme.switchToLight', 'ライトモードに切替')
    : tr('theme.switchToDark', 'ナイトモードに切替');

  button.setAttribute('aria-pressed', state.dark ? 'true' : 'false');
  button.setAttribute('title', title);
  button.setAttribute('aria-label', title);
}

function analyze() {
  state.inputPanelMode = 'auto';

  const rawInput = $('rawInput');
  if (!rawInput) return;

  const lines = normalizeNewlines(prepareText(rawInput.value || ''))
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

/* =========================================================
   Language UI
   ========================================================= */

function initializeLanguageUI() {
  updateLanguageToggleLabel();
}

function toggleLanguage() {
  if (typeof getCurrentLanguage !== 'function' || typeof setLanguage !== 'function') {
    console.warn('Language functions are not loaded yet.');
    return;
  }

  const current = getCurrentLanguage();
  const next = current === 'ja' ? 'en' : 'ja';

  setLanguage(next);
  updateLanguageToggleLabel();

  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }

  render();
  syncThemeSwitch();
}

function updateLanguageToggleLabel() {
  const button = $('languageToggleBtn');
  if (!button) return;

  let current = 'ja';

  if (typeof getCurrentLanguage === 'function') {
    current = getCurrentLanguage();
  }

  button.textContent = current === 'ja' ? 'EN' : 'JP';

  const label = current === 'ja'
    ? tr('language.switchToEnglish', '英語表示に切替')
    : tr('language.switchToJapanese', '日本語表示に切替');

  button.setAttribute('title', label);
  button.setAttribute('aria-label', label);
}

/* =========================================================
   Shortcut Modal
   ========================================================= */

function openShortcutModal() {
  const modal = $('shortcutModal');
  if (!modal) return;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeShortcutModal() {
  const modal = $('shortcutModal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function isShortcutModalOpen() {
  const modal = $('shortcutModal');
  return !!modal && modal.classList.contains('open');
}

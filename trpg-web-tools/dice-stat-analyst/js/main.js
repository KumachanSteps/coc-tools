const state = {
  rolls: [],
  filteredLines: [],
  hiddenCharacters: new Set(),
  sort: { key: 'index', direction: 'asc' },
  showCharacterControls: false,
  inputPanelMode: 'auto',
  dark: false
};

bindEvents();
render();

function bindEvents() {
  $('themeToggleBtn').addEventListener('click', toggleTheme);

  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchTab(button));
  });

  document.querySelectorAll('button[data-sort-key]').forEach(button => {
    button.addEventListener('click', () => toggleSort(button.dataset.sortKey));
  });

  $('fileInput').addEventListener('change', handleFileInput);
  $('inputToggleBtn').addEventListener('click', toggleInputPanel);

  $('characterControlToggleBtn').addEventListener('click', () => {
    state.showCharacterControls = !state.showCharacterControls;
    renderCharacterControls();
  });

  $('summaryShotBtn').addEventListener('click', enterScreenshotMode);
  $('screenshotExitBtn').addEventListener('click', exitScreenshotMode);

  document.addEventListener('keydown', handleGlobalKeydown);

  $('analyzeBtn').addEventListener('click', analyze);
  $('clearBtn').addEventListener('click', clearAll);
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
  syncThemeSwitch();
}

function syncThemeSwitch() {
  document.body.classList.toggle('dark', state.dark);

  const button = $('themeToggleBtn');
  button.setAttribute('aria-pressed', state.dark ? 'true' : 'false');
  button.setAttribute('title', state.dark ? 'ライトモードに切替' : 'ナイトモードに切替');
  button.setAttribute('aria-label', state.dark ? 'ライトモードに切替' : 'ナイトモードに切替');
}

function analyze() {
  state.inputPanelMode = 'auto';

  const lines = normalizeNewlines(prepareText($('rawInput').value || ''))
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

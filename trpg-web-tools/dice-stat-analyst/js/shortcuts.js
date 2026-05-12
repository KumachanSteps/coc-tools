function enterScreenshotMode() {
  document.body.classList.add('screenshot-mode');
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

function exitScreenshotMode() {
  document.body.classList.remove('screenshot-mode');
}

/*
  Keyboard Shortcuts / ショートカット設定

  Ctrl / Cmd + O
    → ファイル選択

  Ctrl / Cmd + Enter
    → 分析する

  Ctrl / Cmd + L
    → 入力欄にフォーカス

  Ctrl / Cmd + Shift + I
    → 入力パネル開閉

  Ctrl / Cmd + 1
    → キャラクター別サマリー

  Ctrl / Cmd + 2
    → 分布チャート

  Ctrl / Cmd + 3
    → 抽出ロール

  Ctrl / Cmd + Shift + C
    → 表示キャラ設定の開閉

  Ctrl / Cmd + Shift + M
    → ナイトモード切替

  Ctrl / Cmd + Shift + V
    → スクショ表示 / 通常表示

  Ctrl / Cmd + Backspace
    → 確認後クリア

  Esc
    → スクショ表示中のみ通常表示に戻す
*/

function handleGlobalKeydown(event) {
  const key = String(event.key || '').toLowerCase();
  const isCommand = event.ctrlKey || event.metaKey;
  const isCommandShift = isCommand && event.shiftKey;
  const isScreenshotMode = document.body.classList.contains('screenshot-mode');

  // Esc: スクショ表示中のみ通常表示へ戻す。通常時は誤削除防止のため何もしない。
  if (event.key === 'Escape') {
    if (isScreenshotMode) {
      event.preventDefault();
      exitScreenshotMode();
    }
    return;
  }

  // Ctrl / Cmd + O: ファイル選択
  if (isCommand && !event.shiftKey && key === 'o') {
    event.preventDefault();
    $('fileInput').click();
    return;
  }

  // Ctrl / Cmd + Enter: 分析する
  if (isCommand && event.key === 'Enter') {
    event.preventDefault();
    analyze();
    return;
  }

  // Ctrl / Cmd + L: 入力欄にフォーカス
  if (isCommand && !event.shiftKey && key === 'l') {
    event.preventDefault();
    $('rawInput').focus();
    return;
  }

  // Ctrl / Cmd + Shift + I: 入力パネル開閉
  if (isCommandShift && key === 'i') {
    event.preventDefault();
    toggleInputPanel();
    return;
  }

  // Ctrl / Cmd + 1: キャラクター別サマリー
  if (isCommand && !event.shiftKey && key === '1') {
    event.preventDefault();
    activateTabByName('summary');
    return;
  }

  // Ctrl / Cmd + 2: 分布チャート
  if (isCommand && !event.shiftKey && key === '2') {
    event.preventDefault();
    activateTabByName('chart');
    return;
  }

  // Ctrl / Cmd + 3: 抽出ロール
  if (isCommand && !event.shiftKey && key === '3') {
    event.preventDefault();
    activateTabByName('rolls');
    return;
  }

  // Ctrl / Cmd + Shift + C: 表示キャラ設定の開閉
  if (isCommandShift && key === 'c') {
    event.preventDefault();
    state.showCharacterControls = !state.showCharacterControls;
    renderCharacterControls();
    return;
  }

  // Ctrl / Cmd + Shift + M: ナイトモード切替
  if (isCommandShift && key === 'm') {
    event.preventDefault();
    toggleTheme();
    return;
  }

  // Ctrl / Cmd + Shift + V: スクショ表示 / 通常表示
  if (isCommandShift && key === 'v') {
    event.preventDefault();

    if (isScreenshotMode) {
      exitScreenshotMode();
    } else {
      enterScreenshotMode();
    }

    return;
  }

  // Ctrl / Cmd + Backspace: 確認後クリア
  if (isCommand && event.key === 'Backspace') {
    event.preventDefault();

    const confirmed = window.confirm('入力内容と解析結果をクリアします。よろしいですか？');
    if (confirmed) {
      clearAll();
    }
  }
}

function activateTabByName(tabName) {
  const targetButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
  if (!targetButton) return;

  switchTab(targetButton);
}

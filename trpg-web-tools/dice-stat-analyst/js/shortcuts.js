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

  Alt + O / Ctrl + Shift + O / Cmd + Shift + O : Choose File
  Alt + T / Ctrl + Shift + T / Cmd + Shift + T : Theme Toggle
  Alt + S / Ctrl + Shift + S / Cmd + Shift + S : Screenshot View
  Esc                                         : Exit Screenshot View
*/
function handleGlobalKeydown(event) {
  const key = String(event.key || '').toLowerCase();
  const altOnly = event.altKey && !event.ctrlKey && !event.metaKey;
  const commandShift = (event.ctrlKey || event.metaKey) && event.shiftKey;
  const isScreenshotMode = document.body.classList.contains('screenshot-mode');

  if (event.key === 'Escape') {
    event.preventDefault();

    if (isScreenshotMode) {
      exitScreenshotMode();
    } else {
      clearAll();
    }

    return;
  }

  if ((altOnly || commandShift) && key === 'o') {
    event.preventDefault();
    $('fileInput').click();
    return;
  }

  if ((altOnly || commandShift) && key === 't') {
    event.preventDefault();
    toggleTheme();
    return;
  }

  if ((altOnly || commandShift) && key === 's') {
    event.preventDefault();

    if (isScreenshotMode) {
      exitScreenshotMode();
    } else {
      enterScreenshotMode();
    }
  }
}

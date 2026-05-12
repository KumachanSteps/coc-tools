document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const logInput = document.getElementById("logInput");
  const analyzeButton = document.getElementById("analyzeButton");
  const clearButton = document.getElementById("clearButton");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const resultsArea = document.getElementById("resultsArea");

  fileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    logInput.value = text;
  });

  analyzeButton?.addEventListener("click", () => {
    const text = logInput.value.trim();

    if (!text) {
      resultsArea.textContent = "ログが入力されていません。";
      return;
    }

    resultsArea.textContent = "解析処理はこれから実装します。";
  });

  clearButton?.addEventListener("click", () => {
    logInput.value = "";
    resultsArea.textContent = "解析結果がここに表示されます。";
    fileInput.value = "";
  });

  darkModeToggle?.addEventListener("change", () => {
    document.body.classList.toggle("night-mode", darkModeToggle.checked);
  });
});
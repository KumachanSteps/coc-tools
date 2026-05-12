const LANGUAGE_STORAGE_KEY = "diceStatAnalystLanguage";

let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "ja";

function getCurrentLanguage() {
  return currentLanguage;
}

function setLanguage(language) {
  if (!I18N[language]) return;

  currentLanguage = language;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

  applyTranslations();

  document.dispatchEvent(new CustomEvent("languagechange", {
    detail: { language }
  }));
}

function t(key, fallback = "", vars = {}) {
  const dictionary = I18N[currentLanguage] || I18N.ja || {};
  let text = dictionary[key] || fallback || key;

  return String(text).replace(/\{(\w+)\}/g, (_, name) => {
    return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{${name}}`;
  });
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.getAttribute("data-i18n");
    element.textContent = t(key, element.textContent);
  });

  document.querySelectorAll("[data-i18n-html]").forEach(element => {
    const key = element.getAttribute("data-i18n-html");
    element.innerHTML = t(key, element.innerHTML);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    const key = element.getAttribute("data-i18n-placeholder");
    element.setAttribute("placeholder", t(key, element.getAttribute("placeholder") || ""));
  });

  document.querySelectorAll("[data-i18n-title]").forEach(element => {
    const key = element.getAttribute("data-i18n-title");
    element.setAttribute("title", t(key, element.getAttribute("title") || ""));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    const key = element.getAttribute("data-i18n-aria-label");
    element.setAttribute("aria-label", t(key, element.getAttribute("aria-label") || ""));
  });
}
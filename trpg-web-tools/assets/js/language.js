(function () {
  const storageKey = "trpgPortalLanguage";
  const listeners = [];

  function getI18n() {
    return window.TRPG_PORTAL_I18N;
  }

  function getLanguage() {
    const i18n = getI18n();
    const savedLanguage = localStorage.getItem(storageKey);

    if (savedLanguage && i18n.ui[savedLanguage]) {
      return savedLanguage;
    }

    return i18n.defaultLanguage || "ja";
  }

  function getLocalizedValue(value, language = getLanguage()) {
    if (value && typeof value === "object") {
      return value[language] || value.ja || value.en || "";
    }

    return value || "";
  }

  function resolvePath(source, path) {
    return path.split(".").reduce((current, key) => {
      if (!current || typeof current !== "object") {
        return undefined;
      }

      return current[key];
    }, source);
  }

  function t(path) {
    const i18n = getI18n();
    const language = getLanguage();
    const currentValue = resolvePath(i18n.ui[language], path);
    const fallbackValue = resolvePath(i18n.ui[i18n.defaultLanguage], path);

    return currentValue || fallbackValue || path;
  }

  function applyLanguage() {
    const language = getLanguage();

    document.documentElement.lang = language;
    document.title = t("meta.title");

    const metaDescription = document.querySelector('meta[name="description"]');

    if (metaDescription) {
      metaDescription.setAttribute("content", t("meta.description"));
    }

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });

    document.querySelectorAll(".language-button[data-lang]").forEach((button) => {
      const isActive = button.dataset.lang === language;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setLanguage(language) {
    const i18n = getI18n();

    if (!i18n.ui[language]) {
      return;
    }

    localStorage.setItem(storageKey, language);
    applyLanguage();

    listeners.forEach((listener) => {
      listener(language);
    });
  }

  function onChange(listener) {
    listeners.push(listener);
  }

  window.TRPGLanguage = {
    getLanguage,
    setLanguage,
    getLocalizedValue,
    t,
    applyLanguage,
    onChange,
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".language-button[data-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        setLanguage(button.dataset.lang);
      });
    });

    applyLanguage();
  });
})();
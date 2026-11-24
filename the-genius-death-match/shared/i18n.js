/**
 * Lightweight Bilingual ZH/EN Internationalization Utility (The Genius: Death Match)
 * Defaults to Chinese ('zh') unless user explicitly selected 'en'.
 * Persists preference to localStorage (`tgm_lang`).
 */

const STORAGE_KEY = 'tgm_lang';
const listeners = new Set();

function detectDefaultLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch (_) {}
  return 'zh';
}

let currentLang = detectDefaultLang();

export const I18n = {
  getLang() {
    return currentLang;
  },

  setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    if (lang === currentLang) return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}
    try {
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    } catch (_) {}
    for (const cb of listeners) {
      try {
        cb(lang);
      } catch (err) {
        console.error('[I18n] listener error:', err);
      }
    }
  },

  toggle() {
    this.setLang(currentLang === 'zh' ? 'en' : 'zh');
    return currentLang;
  },

  /**
   * Resolve a bilingual object { zh, en, ko? } or plain string.
   */
  t(value, vars) {
    let text = '';
    if (value == null) return '';
    if (typeof value === 'string') {
      text = value;
    } else if (typeof value === 'object') {
      text = value[currentLang] ?? value.zh ?? value.en ?? '';
    } else {
      text = String(value);
    }
    if (vars && typeof vars === 'object') {
      text = text.replace(/\{(\w+)\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`
      );
    }
    return text;
  },

  onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

try {
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
} catch (_) {}

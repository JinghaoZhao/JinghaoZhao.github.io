/**
 * Lightweight Bilingual ZH/EN Internationalization Utility
 * Persists preference to localStorage (`dp3_lang`).
 */

const STORAGE_KEY = 'dp3_lang';
const listeners = new Set();

function detectDefaultLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch (_) {}
  const nav = (navigator.language || 'zh').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
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
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
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
   * Resolve a bilingual object { zh, en } or plain string.
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

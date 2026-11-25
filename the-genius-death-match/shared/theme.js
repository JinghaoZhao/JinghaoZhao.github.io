/**
 * Unified Dark (Obsidian Noir) & Light (Alabaster Broadcast Studio) Theme Controller
 * Persists explicit user choice in localStorage (`tgm_theme`); defaults to OS `prefers-color-scheme`.
 */

const STORAGE_KEY = 'tgm_theme';
const listeners = new Set();
let initialized = false;
let currentTheme = 'dark';
let transitionTimer = null;

function getSavedPreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch (_) {}
  return null;
}

function getSystemTheme() {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
  } catch (_) {}
  return 'dark';
}

function applyTheme(resolved, { animate = false } = {}) {
  const prev = currentTheme;
  currentTheme = resolved === 'light' ? 'light' : 'dark';

  if (typeof document !== 'undefined' && document.documentElement) {
    const html = document.documentElement;
    if (animate && prev !== currentTheme) {
      clearTimeout(transitionTimer);
      html.classList.add('tg-theme-transition');
      transitionTimer = setTimeout(() => {
        html.classList.remove('tg-theme-transition');
      }, 240);
    }
    html.dataset.theme = currentTheme;
  }

  if (prev !== currentTheme) {
    for (const cb of listeners) {
      try {
        cb(currentTheme);
      } catch (err) {
        console.error('[Theme] listener error:', err);
      }
    }
  }
  return currentTheme;
}

export const Theme = {
  init() {
    if (initialized) return currentTheme;
    initialized = true;
    const initial = getSavedPreference() || getSystemTheme();
    currentTheme = initial;
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset.theme = currentTheme;
    }
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const onOsChange = () => {
          if (!getSavedPreference()) {
            applyTheme(getSystemTheme(), { animate: true });
          }
        };
        mq.addEventListener?.('change', onOsChange);
      }
    } catch (_) {}
    return currentTheme;
  },

  get() {
    if (!initialized) this.init();
    return currentTheme;
  },

  set(mode) {
    if (!initialized) this.init();
    if (mode === 'system') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      return applyTheme(getSystemTheme(), { animate: true });
    }
    const target = mode === 'light' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, target);
    } catch (_) {}
    return applyTheme(target, { animate: true });
  },

  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    return this.set(next);
  },

  onChange(cb) {
    if (!initialized) this.init();
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

// Auto-initialize on module import
Theme.init();

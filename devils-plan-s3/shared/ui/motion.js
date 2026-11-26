/**
 * Apple-Grade Motion & Dual-Theme Primitives ("The Devil's Plan: Dead Again")
 * Zero external dependencies · GPU-composited · Interruptible · Reduced-motion safe
 */

const THEME_STORAGE_KEY = 'dp3_theme';
const SVG_NS = 'http://www.w3.org/2000/svg';

// ============================================================================
// 1. Theme Controller (Dark Obsidian Studio <-> Light Porcelain Studio)
// ============================================================================

const themeListeners = new Set();
let themeSwitchTimer = null;

function readInitialTheme() {
  try {
    const attr = document.documentElement?.dataset?.theme;
    if (attr === 'light' || attr === 'dark') return attr;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: light)')?.matches) return 'light';
  } catch (_) {}
  return 'dark';
}

let currentTheme = readInitialTheme();

function syncThemeColorMeta(theme) {
  try {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f4f0' : '#06070b');
  } catch (_) {}
}

export const Theme = {
  get() {
    return currentTheme;
  },

  set(next, { animate = true } = {}) {
    if (next !== 'light' && next !== 'dark') return currentTheme;
    const changed = next !== currentTheme;
    currentTheme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (_) {}

    const root = document.documentElement;
    if (animate && changed && !Motion.isReduced()) {
      clearTimeout(themeSwitchTimer);
      root.classList.add('dp-theme-switching');
      themeSwitchTimer = setTimeout(() => {
        root.classList.remove('dp-theme-switching');
      }, 220);
    }
    root.dataset.theme = next;
    syncThemeColorMeta(next);

    if (changed) {
      for (const cb of themeListeners) {
        try {
          cb(next);
        } catch (err) {
          console.error('[Theme] listener error:', err);
        }
      }
    }
    return currentTheme;
  },

  toggle() {
    return this.set(currentTheme === 'dark' ? 'light' : 'dark', { animate: true });
  },

  onChange(cb) {
    themeListeners.add(cb);
    return () => themeListeners.delete(cb);
  },

  /**
   * Crisp 18x18 inline SVG Sun <-> Moon icon morph driven by [data-theme].
   */
  renderToggleIcon() {
    const uid = 'dp-moon-mask-' + Math.random().toString(36).slice(2, 7);
    return `
      <svg class="dp-theme-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <mask id="${uid}">
            <rect x="0" y="0" width="24" height="24" fill="white" />
            <circle class="dp-moon-cut" cx="16.5" cy="7.5" r="6.2" fill="black" />
          </mask>
        </defs>
        <circle class="dp-sun-core" cx="12" cy="12" r="6.5" fill="currentColor" mask="url(#${uid})" />
        <g class="dp-sun-rays" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
          <line x1="12" y1="2.2" x2="12" y2="4.4" />
          <line x1="12" y1="19.6" x2="12" y2="21.8" />
          <line x1="2.2" y1="12" x2="4.4" y2="12" />
          <line x1="19.6" y1="12" x2="21.8" y2="12" />
          <line x1="5.07" y1="5.07" x2="6.63" y2="6.63" />
          <line x1="17.37" y1="17.37" x2="18.93" y2="18.93" />
          <line x1="18.93" y1="5.07" x2="17.37" y2="6.63" />
          <line x1="6.63" y1="17.37" x2="5.07" y2="18.93" />
        </g>
      </svg>
    `;
  },
};

// ============================================================================
// 2. Unified Motion Primitives (Interruptible WeakMap/Map Tracking)
// ============================================================================

const reducedMq =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

const exitTokens = new WeakMap();
const numberAnims = new WeakMap();
const flashTimers = new WeakMap();
const delegatedMap = new WeakMap();
const activeSprings = new Map();

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// --- Keyed DOM Patcher internals (HTML + SVG namespace-safe, <canvas>-safe) ---

function getNodeKey(node) {
  if (!node || node.nodeType !== 1) return null;
  const mk = node.getAttribute('data-motion-key');
  if (mk) return 'k:' + mk;
  const id = node.getAttribute('id');
  if (id) return 'i:' + id;
  return null;
}

function sameNodeShape(a, b) {
  if (!a || !b || a.nodeType !== b.nodeType) return false;
  if (a.nodeType !== 1) return true;
  return a.tagName === b.tagName && a.namespaceURI === b.namespaceURI;
}

function syncAttributes(cur, next, isCanvas) {
  // Remove obsolete attributes
  const curAttrs = cur.attributes;
  for (let i = curAttrs.length - 1; i >= 0; i--) {
    const name = curAttrs[i].name;
    if (isCanvas && (name === 'width' || name === 'height')) continue;
    if (!next.hasAttribute(name)) {
      cur.removeAttribute(name);
    }
  }
  // Apply added/changed attributes
  const nextAttrs = next.attributes;
  for (let i = 0; i < nextAttrs.length; i++) {
    const { name, value } = nextAttrs[i];
    if (isCanvas && (name === 'width' || name === 'height')) {
      if (cur.getAttribute(name) !== value && value) {
        cur.setAttribute(name, value);
      }
      continue;
    }
    if (cur.getAttribute(name) !== value) {
      cur.setAttribute(name, value);
    }
  }
}

function syncFormProps(cur, next) {
  const tag = cur.tagName;
  if (tag === 'INPUT') {
    const nextChecked = next.hasAttribute('checked');
    if (cur.type === 'checkbox' || cur.type === 'radio') {
      if (cur.checked !== nextChecked) cur.checked = nextChecked;
    } else if (document.activeElement !== cur) {
      const nextVal = next.getAttribute('value') ?? '';
      if (cur.value !== nextVal) cur.value = nextVal;
    }
  } else if (tag === 'TEXTAREA') {
    if (document.activeElement !== cur) {
      const nextVal = next.textContent ?? '';
      if (cur.value !== nextVal) cur.value = nextVal;
    }
  } else if (tag === 'SELECT') {
    if (document.activeElement !== cur) {
      const selOpt = next.querySelector('option[selected]');
      if (selOpt && cur.value !== selOpt.value) {
        cur.value = selOpt.value;
      }
    }
  }
}

function patchElement(cur, next, onMountNode) {
  const isCanvas = cur.tagName === 'CANVAS';
  syncAttributes(cur, next, isCanvas);
  if (isCanvas || cur.hasAttribute('data-motion-preserve')) {
    return;
  }
  syncFormProps(cur, next);
  if (cur.tagName === 'TEXTAREA') return;
  patchChildren(cur, next, onMountNode);
}

function patchChildren(parent, nextParent, onMountNode) {
  const nextNodes = Array.from(nextParent.childNodes);

  // Index existing keyed children for O(1) lookup
  const keyedExisting = new Map();
  for (const child of Array.from(parent.childNodes)) {
    const k = getNodeKey(child);
    if (k && !keyedExisting.has(k)) {
      keyedExisting.set(k, child);
    }
  }

  let cursor = parent.firstChild;

  for (let i = 0; i < nextNodes.length; i++) {
    const nextNode = nextNodes[i];
    const key = getNodeKey(nextNode);
    let match = null;

    if (key) {
      const candidate = keyedExisting.get(key);
      if (candidate && sameNodeShape(candidate, nextNode)) {
        match = candidate;
        keyedExisting.delete(key);
      }
    } else {
      // Find next compatible unkeyed sibling starting from cursor
      let probe = cursor;
      let steps = 0;
      while (probe && steps < 6) {
        if (!getNodeKey(probe) && sameNodeShape(probe, nextNode)) {
          match = probe;
          break;
        }
        probe = probe.nextSibling;
        steps++;
      }
    }

    if (match) {
      if (match !== cursor) {
        parent.insertBefore(match, cursor);
      } else {
        cursor = cursor.nextSibling;
      }
      if (match.nodeType === 1) {
        patchElement(match, nextNode, onMountNode);
      } else if (match.nodeValue !== nextNode.nodeValue) {
        match.nodeValue = nextNode.nodeValue;
      }
    } else {
      const imported =
        nextNode.nodeType === 1 && nextNode.namespaceURI === SVG_NS
          ? document.importNode(nextNode, true)
          : nextNode.cloneNode(true);
      parent.insertBefore(imported, cursor);
      if (imported.nodeType === 1 && onMountNode) {
        try {
          onMountNode(imported);
        } catch (_) {}
      }
    }
  }

  // Remove any remaining obsolete trailing nodes
  while (cursor) {
    const toRemove = cursor;
    cursor = cursor.nextSibling;
    parent.removeChild(toRemove);
  }
}

export const Motion = {
  isReduced() {
    return Boolean(reducedMq && reducedMq.matches);
  },

  /**
   * Interruptible Enter transition: cancels any pending exit on el, transitions to .is-open.
   */
  enter(el, { variant = 'modal' } = {}) {
    if (!el) return;
    const prevExit = exitTokens.get(el);
    if (prevExit) {
      prevExit.cancel();
      exitTokens.delete(el);
    }
    el.dataset.motionVariant = variant;
    el.classList.remove('is-leaving');
    el.classList.add('is-entering');
    // Double-rAF guarantees browser paints initial frame before transitioning to .is-open
    requestAnimationFrame(() => {
      if (!el.isConnected) return;
      el.classList.remove('is-entering');
      el.classList.add('is-open');
    });
  },

  /**
   * Interruptible Exit transition: swaps .is-open -> .is-leaving, removes after transitionend + safety timeout.
   */
  exit(el, { variant = 'modal', remove = true, timeoutMs = 260 } = {}) {
    if (!el) return Promise.resolve();
    const prev = exitTokens.get(el);
    if (prev) prev.cancel();

    return new Promise((resolve) => {
      let done = false;
      let cancelled = false;
      const waitMs = this.isReduced() ? Math.min(timeoutMs, 150) : timeoutMs;

      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        el.removeEventListener('transitionend', onEnd);
        exitTokens.delete(el);
        if (!cancelled && remove && el.parentNode) {
          el.remove();
        }
        resolve();
      };

      const onEnd = (e) => {
        if (e.target === el || e.target?.parentElement === el) {
          finish();
        }
      };

      const token = {
        cancel() {
          cancelled = true;
          clearTimeout(timer);
          el.removeEventListener('transitionend', onEnd);
          done = true;
          resolve();
        },
      };
      exitTokens.set(el, token);

      el.dataset.motionVariant = variant;
      el.classList.remove('is-entering', 'is-open');
      el.classList.add('is-leaving');
      el.addEventListener('transitionend', onEnd);
      const timer = setTimeout(finish, waitMs + 40);
    });
  },

  /**
   * Keyed DOM Patcher: updates container to match nextHtml in place so CSS transitions,
   * SVG transforms, <canvas> bitmaps, keyboard focus, and scroll positions survive!
   */
  patchDOM(container, nextHtml, { onMountNode } = {}) {
    if (!container) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = String(nextHtml ?? '');
    patchChildren(container, tpl.content, onMountNode);
  },

  /**
   * Idempotent Event Delegation: binds once per (root, key) to eliminate per-render listener churn.
   */
  delegate(root, eventType, selector, handler, key) {
    if (!root || !eventType || !handler) return () => {};
    let store = delegatedMap.get(root);
    if (!store) {
      store = new Map();
      delegatedMap.set(root, store);
    }
    const mapKey = key || `${eventType}::${selector}`;
    const prev = store.get(mapKey);
    if (prev) {
      prev.handler = handler;
      prev.selector = selector;
      return prev.off;
    }
    const entry = { handler, selector, off: null };
    const listener = (e) => {
      const target = entry.selector ? e.target?.closest?.(entry.selector) : e.target;
      if (!target || (entry.selector && !root.contains(target))) return;
      entry.handler(e, target);
    };
    root.addEventListener(eventType, listener);
    entry.off = () => {
      root.removeEventListener(eventType, listener);
      store.delete(mapKey);
    };
    store.set(mapKey, entry);
    return entry.off;
  },

  /**
   * Capture bounding rects for FLIP transitions before a DOM mutation.
   */
  captureFlip(container, itemSelector = '[data-motion-key]') {
    const rects = new Map();
    if (!container || this.isReduced()) return rects;
    const items = container.querySelectorAll(itemSelector);
    for (const el of items) {
      const k = el.getAttribute('data-motion-key') || el.id;
      if (k) rects.set(k, el.getBoundingClientRect());
    }
    return rects;
  },

  /**
   * Play FLIP GPU translate3d glide for surviving elements after DOM mutation.
   */
  playFlip(container, prevRects, { itemSelector = '[data-motion-key]', duration = 220 } = {}) {
    if (!container || !prevRects || prevRects.size === 0 || this.isReduced()) return;
    const items = container.querySelectorAll(itemSelector);
    const moved = [];

    for (const el of items) {
      const k = el.getAttribute('data-motion-key') || el.id;
      if (!k) continue;
      const oldRect = prevRects.get(k);
      if (!oldRect) continue;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      moved.push(el);
    }

    if (!moved.length) return;
    // Force layout once for all moved items
    void container.offsetHeight;

    requestAnimationFrame(() => {
      for (const el of moved) {
        el.style.transition = `transform ${duration}ms var(--dp-ease-out)`;
        el.style.transform = 'translate3d(0, 0, 0)';
        const cleanup = () => {
          el.style.transition = '';
          el.style.transform = '';
          el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup);
        setTimeout(cleanup, duration + 60);
      }
    });
  },

  /**
   * GPU-composited sliding segmented-control / filter pill indicator via clip-path inset.
   * Preserves crisp pill border-radius and works even on multi-row wrapped mobile bars!
   */
  slidingIndicator(trackEl, activeEl, { instant = false } = {}) {
    if (!trackEl) return;
    trackEl.classList.add('dp-sliding-track');
    let indicator = trackEl.querySelector(':scope > .dp-sliding-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'dp-sliding-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      trackEl.insertBefore(indicator, trackEl.firstChild);
    }
    if (!activeEl) {
      indicator.classList.remove('is-ready');
      return;
    }

    const apply = () => {
      const tr = trackEl.getBoundingClientRect();
      const ar = activeEl.getBoundingClientRect();
      if (tr.width <= 0 || tr.height <= 0 || ar.width <= 0) return;
      const top = Math.max(0, ar.top - tr.top);
      const left = Math.max(0, ar.left - tr.left);
      const right = Math.max(0, tr.right - ar.right);
      const bottom = Math.max(0, tr.bottom - ar.bottom);
      const rad = getComputedStyle(activeEl).borderRadius || '999px';
      const skipAnim = instant || this.isReduced() || !indicator.classList.contains('is-ready');
      if (skipAnim) indicator.classList.add('is-instant');
      else indicator.classList.remove('is-instant');
      indicator.style.clipPath = `inset(${top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px round ${rad})`;
      indicator.classList.add('is-ready');
      if (skipAnim) {
        requestAnimationFrame(() => indicator.classList.remove('is-instant'));
      }
    };

    apply();
  },

  /**
   * Interruptible tabular numeric counter animation with optional +/- directional tint flash.
   */
  animateNumber(el, from, to, { duration = 260, format = (v) => String(Math.round(v)), flash = false } = {}) {
    if (!el) return;
    const prev = numberAnims.get(el);
    if (prev) cancelAnimationFrame(prev);
    el.classList.add('dp-tabular');

    const startVal = Number(from);
    const endVal = Number(to);
    if (!Number.isFinite(startVal) || !Number.isFinite(endVal) || startVal === endVal || this.isReduced()) {
      el.textContent = format(endVal);
      numberAnims.delete(el);
      return;
    }

    if (flash) {
      el.classList.remove('is-delta-up', 'is-delta-down');
      el.classList.add(endVal > startVal ? 'is-delta-up' : 'is-delta-down');
      setTimeout(() => el.classList.remove('is-delta-up', 'is-delta-down'), 360);
    }

    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const val = startVal + (endVal - startVal) * easeOutCubic(p);
      el.textContent = format(p >= 1 ? endVal : val);
      if (p < 1) {
        numberAnims.set(el, requestAnimationFrame(tick));
      } else {
        numberAnims.delete(el);
      }
    };
    numberAnims.set(el, requestAnimationFrame(tick));
  },

  /**
   * Crisp 1-step vertical digit tick (e.g. Lobby player count +/-, round increment).
   */
  tickDigit(el, nextText, direction = 1) {
    if (!el) return;
    el.classList.add('dp-tabular');
    el.textContent = String(nextText);
    if (this.isReduced()) return;
    const cls = direction >= 0 ? 'dp-digit-tick-up' : 'dp-digit-tick-down';
    el.classList.remove('dp-digit-tick-up', 'dp-digit-tick-down');
    void el.offsetWidth;
    el.classList.add(cls);
  },

  /**
   * Restrained Apple horizontal micro-shake on invalid input / error / lockout.
   */
  shake(el) {
    if (!el || this.isReduced()) return;
    el.classList.remove('dp-shake');
    void el.offsetWidth;
    el.classList.add('dp-shake');
    const cleanup = () => {
      el.classList.remove('dp-shake');
      el.removeEventListener('animationend', cleanup);
    };
    el.addEventListener('animationend', cleanup);
    setTimeout(cleanup, 300);
  },

  /**
   * Inline icon morph (e.g. copy ⧉ -> ✓ for 1400ms), cleanly interruptible.
   */
  flashIcon(el, tempContent, durationMs = 1400) {
    if (!el) return;
    const prev = flashTimers.get(el);
    if (prev) {
      clearTimeout(prev.timer);
    } else {
      el.dataset.dpOrigIcon = el.innerHTML;
    }
    el.classList.add('dp-icon-swap', 'is-flashing');
    el.innerHTML = tempContent;
    const timer = setTimeout(() => {
      if (el.dataset.dpOrigIcon !== undefined) {
        el.innerHTML = el.dataset.dpOrigIcon;
        delete el.dataset.dpOrigIcon;
      }
      el.classList.remove('is-flashing');
      flashTimers.delete(el);
    }, durationMs);
    flashTimers.set(el, { timer });
  },

  /**
   * Interruptible rAF interpolator for Canvas / 3D Camera settle.
   */
  springTo(key, fromObj, toObj, { duration = 280, onUpdate, onComplete } = {}) {
    this.cancelSpring(key);
    const keys = Object.keys(toObj);

    if (this.isReduced() || duration <= 0) {
      onUpdate?.({ ...toObj });
      onComplete?.();
      return () => {};
    }

    const t0 = performance.now();
    let cancelled = false;
    let rafId = 0;

    const step = (now) => {
      if (cancelled) return;
      const p = Math.min(1, (now - t0) / duration);
      const e = easeOutCubic(p);
      const cur = {};
      for (const k of keys) {
        const a = Number(fromObj[k] ?? 0);
        const b = Number(toObj[k] ?? 0);
        cur[k] = p >= 1 ? b : a + (b - a) * e;
      }
      onUpdate?.(cur);
      if (p < 1) {
        rafId = requestAnimationFrame(step);
        activeSprings.set(key, cancel);
      } else {
        activeSprings.delete(key);
        onComplete?.();
      }
    };

    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      activeSprings.delete(key);
    };

    activeSprings.set(key, cancel);
    rafId = requestAnimationFrame(step);
    return cancel;
  },

  cancelSpring(key) {
    const cancel = activeSprings.get(key);
    if (cancel) cancel();
  },

  /**
   * GPU-composited progress bar update using scaleX(0..1) instead of layout-thrashing width.
   */
  setProgress(el, ratio) {
    if (!el) return;
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    el.style.transformOrigin = el.style.transformOrigin || 'left center';
    el.style.transform = `scaleX(${clamped.toFixed(4)})`;
  },
};

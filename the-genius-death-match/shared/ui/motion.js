/**
 * The Genius: Death Match Arena — Shared Motion Primitives
 * GPU-compositor-only, interruptible, reduced-motion-safe animation utilities.
 */

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_SPRING = 'cubic-bezier(0.34, 1.42, 0.64, 1)';

const reducedListeners = new Set();
let reducedMq = null;
let isReduced = false;

try {
  if (typeof window !== 'undefined' && window.matchMedia) {
    reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    isReduced = reducedMq.matches;
    reducedMq.addEventListener?.('change', (e) => {
      isReduced = e.matches;
      for (const cb of reducedListeners) {
        try {
          cb(isReduced);
        } catch (err) {
          console.error('[Motion] onReducedChange error:', err);
        }
      }
    });
  }
} catch (_) {}

// Per-element cancellation stores (GC-safe via WeakMap)
const numberCancelMap = new WeakMap();
const nudgeAnimMap = new WeakMap();
const pulseAnimMap = new WeakMap();
const morphStateMap = new WeakMap();
const crossfadeGenMap = new WeakMap();
const presenceGenMap = new WeakMap();
const presenceTimerMap = new WeakMap();

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function getKey(el, keyAttr) {
  return (
    el.getAttribute(keyAttr) ||
    el.getAttribute('data-flip-key') ||
    el.getAttribute('data-slug') ||
    el.id ||
    null
  );
}

function spawnDeltaPill(container, diff) {
  if (!container || !diff || Number.isNaN(diff)) return;
  const pill = document.createElement('span');
  pill.className = `tg-delta-pill ${diff > 0 ? 'is-pos' : 'is-neg'}`;
  pill.textContent = diff > 0 ? `+${Math.round(diff)}` : `${Math.round(diff)}`;
  container.appendChild(pill);
  if (isReduced) {
    setTimeout(() => pill.remove(), 550);
    return;
  }
  try {
    const anim = pill.animate(
      [
        { opacity: 0, transform: 'translate(-50%, 4px) scale(0.88)' },
        { opacity: 1, transform: 'translate(-50%, -6px) scale(1)', offset: 0.25 },
        { opacity: 0, transform: 'translate(-50%, -18px) scale(0.96)' },
      ],
      { duration: 650, easing: EASE_OUT, fill: 'forwards' }
    );
    anim.onfinish = () => pill.remove();
  } catch (_) {
    setTimeout(() => pill.remove(), 650);
  }
}

export const Motion = {
  reduced() {
    return isReduced;
  },

  onReducedChange(cb) {
    reducedListeners.add(cb);
    return () => reducedListeners.delete(cb);
  },

  /**
   * Smoothly animates a numeric readout with tabular-nums, canceling any in-flight tick on `el`.
   */
  animateNumber(el, from, to, opts = {}) {
    if (!el) return () => {};
    const prevCancel = numberCancelMap.get(el);
    if (prevCancel) prevCancel();

    const startVal = Number(from);
    const endVal = Number(to);
    const format = typeof opts.format === 'function' ? opts.format : (n) => String(Math.round(n));
    const duration = Math.max(80, Number(opts.duration ?? 300));
    el.style.fontVariantNumeric = 'tabular-nums';

    if (opts.deltaEl && Number.isFinite(startVal) && Number.isFinite(endVal) && endVal !== startVal) {
      spawnDeltaPill(opts.deltaEl, endVal - startVal);
    }

    if (opts.highlightClass) {
      el.classList.add(opts.highlightClass);
      setTimeout(() => el.classList.remove(opts.highlightClass), duration + 140);
    }

    if (isReduced || !Number.isFinite(startVal) || !Number.isFinite(endVal) || startVal === endVal) {
      el.textContent = format(Number.isFinite(endVal) ? endVal : 0);
      numberCancelMap.delete(el);
      return () => {};
    }

    let rafId = null;
    let cancelled = false;
    const t0 = performance.now();

    const step = (now) => {
      if (cancelled) return;
      const p = Math.min(1, (now - t0) / duration);
      const val = startVal + (endVal - startVal) * easeOutCubic(p);
      el.textContent = format(p >= 1 ? endVal : val);
      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        numberCancelMap.delete(el);
      }
    };

    rafId = requestAnimationFrame(step);
    const cancel = () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      numberCancelMap.delete(el);
    };
    numberCancelMap.set(el, cancel);
    return cancel;
  },

  /**
   * Glides a persistent `.tg-seg-indicator` pill behind `activeBtn` inside `container`.
   */
  slideIndicator(container, activeBtn, opts = {}) {
    if (!container || !activeBtn) return;
    const selector = opts.indicatorSelector || '.tg-seg-indicator';
    let indicator = container.querySelector(`:scope > ${selector}`);
    let freshlyCreated = false;
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = `tg-seg-indicator ${opts.className || ''}`.trim();
      indicator.setAttribute('aria-hidden', 'true');
      container.prepend(indicator);
      freshlyCreated = true;
    }

    const cRect = container.getBoundingClientRect();
    const bRect = activeBtn.getBoundingClientRect();
    if (!bRect.width || !bRect.height) return;

    const x = bRect.left - cRect.left + container.scrollLeft;
    const y = bRect.top - cRect.top + container.scrollTop;
    const immediate = Boolean(opts.immediate || freshlyCreated || isReduced || !indicator.dataset.ready);

    if (immediate) {
      indicator.style.transition = 'none';
    } else {
      indicator.style.transition = `transform 180ms ${EASE_OUT}, width 180ms ${EASE_OUT}, height 180ms ${EASE_OUT}, opacity 140ms ease`;
    }

    indicator.style.width = `${bRect.width}px`;
    indicator.style.height = `${bRect.height}px`;
    indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    indicator.style.opacity = '1';
    indicator.dataset.ready = '1';

    if (immediate) {
      // Force commit before future animated transitions
      void indicator.offsetWidth;
      indicator.style.transition = '';
    }
  },

  /**
   * Interruptible FLIP (First-Last-Invert-Play) for keyed lists, grids, tile swaps, piece moves.
   */
  flipList(container, itemSelector, opts = {}) {
    if (!container) return () => {};
    const keyAttr = opts.keyAttr || 'data-flip-key';
    const duration = Number(opts.duration ?? 240);
    const easing = opts.easing || EASE_OUT;
    const staggerMs = Math.min(18, Math.max(0, Number(opts.staggerMs ?? 0)));
    const enterScale = Number(opts.enterScale ?? 0.97);

    const firstRects = new Map();
    container.querySelectorAll(itemSelector).forEach((el) => {
      const k = getKey(el, keyAttr);
      if (k) firstRects.set(k, el.getBoundingClientRect());
    });

    return function play() {
      const items = Array.from(container.querySelectorAll(itemSelector));
      let enterIdx = 0;
      for (const el of items) {
        const k = getKey(el, keyAttr);
        const prev = k ? firstRects.get(k) : null;

        if (!prev) {
          // Newly entering item
          if (typeof el.animate === 'function') {
            const delay = isReduced ? 0 : Math.min(140, enterIdx * staggerMs);
            enterIdx++;
            const frames = isReduced
              ? [{ opacity: 0 }, { opacity: 1 }]
              : [
                  { opacity: 0, transform: `scale(${enterScale}) translateY(6px)` },
                  { opacity: 1, transform: 'none' },
                ];
            el.animate(frames, {
              duration: isReduced ? 120 : duration,
              delay,
              easing,
              fill: 'both',
            });
          }
          continue;
        }

        if (isReduced) continue;
        const next = el.getBoundingClientRect();
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

        if (typeof el.animate === 'function') {
          el.animate(
            [
              { transform: `translate3d(${dx}px, ${dy}px, 0)` },
              { transform: 'translate3d(0, 0, 0)' },
            ],
            { duration, easing }
          );
        }
      }
    };
  },

  /**
   * Restrained damped spring horizontal nudge for errors, penalties, illegal moves.
   */
  nudgeError(el, opts = {}) {
    if (!el) return;
    const prev = nudgeAnimMap.get(el);
    if (prev) {
      try { prev.cancel(); } catch (_) {}
    }

    const flashClass = opts.flashClass || 'is-nudge-error';
    const duration = Number(opts.duration ?? 280);
    el.classList.add(flashClass);
    setTimeout(() => el.classList.remove(flashClass), Math.max(duration + 140, 380));

    if (isReduced || typeof el.animate !== 'function') return;

    const amp = opts.intensity === 'impact' ? 8 : 5;
    const anim = el.animate(
      [
        { transform: 'translate3d(0, 0, 0)' },
        { transform: `translate3d(${-amp}px, 0, 0)`, offset: 0.2 },
        { transform: `translate3d(${Math.round(amp * 0.8)}px, 0, 0)`, offset: 0.45 },
        { transform: `translate3d(${Math.round(-amp * 0.5)}px, 0, 0)`, offset: 0.7 },
        { transform: `translate3d(${Math.round(amp * 0.2)}px, 0, 0)`, offset: 0.88 },
        { transform: 'translate3d(0, 0, 0)' },
      ],
      { duration, easing: 'ease-out' }
    );
    nudgeAnimMap.set(el, anim);
  },

  /**
   * Subtle tactile confirmation micro-pulse (copy success, bid lock, valid move).
   */
  pulseConfirm(el, opts = {}) {
    if (!el) return;
    const prev = pulseAnimMap.get(el);
    if (prev) {
      try { prev.cancel(); } catch (_) {}
    }

    const tone = opts.tone || 'gold';
    const duration = Number(opts.duration ?? 240);
    const cls = `is-pulse-confirm-${tone}`;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), duration + 160);

    if (typeof el.animate !== 'function') return;
    const frames = isReduced
      ? [{ opacity: 0.78 }, { opacity: 1 }]
      : [
          { transform: 'scale(1)' },
          { transform: 'scale(1.03)', offset: 0.45 },
          { transform: 'scale(1)' },
        ];
    const anim = el.animate(frames, {
      duration: isReduced ? 140 : duration,
      easing: EASE_SPRING,
    });
    pulseAnimMap.set(el, anim);
  },

  /**
   * Smoothly morphs an icon slot between two inline SVGs (Copy<->Check, Volume<->Mute, Sun<->Moon).
   */
  morphIcon(el, nextSvgHtml, opts = {}) {
    if (!el) return;
    const prev = morphStateMap.get(el);
    if (prev) {
      clearTimeout(prev.revertTimer);
      try { prev.anim?.cancel(); } catch (_) {}
    }

    const duration = Number(opts.duration ?? 140);
    const state = { revertTimer: null, anim: null };
    morphStateMap.set(el, state);

    el.innerHTML = nextSvgHtml;
    if (typeof el.animate === 'function') {
      const frames = isReduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: 'scale(0.72) rotate(-12deg)' },
            { opacity: 1, transform: 'scale(1) rotate(0deg)' },
          ];
      state.anim = el.animate(frames, {
        duration: isReduced ? 100 : duration,
        easing: EASE_SPRING,
      });
    }

    if (opts.revertAfterMs && opts.revertSvgHtml) {
      state.revertTimer = setTimeout(() => {
        if (morphStateMap.get(el) === state) {
          Motion.morphIcon(el, opts.revertSvgHtml, { duration });
        }
      }, opts.revertAfterMs);
    }
  },

  /**
   * Crisp opacity (+ subtle Y shift) crossfade when replacing content inside a region.
   */
  async crossfade(el, mutateFn, opts = {}) {
    if (!el) {
      mutateFn?.();
      return;
    }
    const gen = (crossfadeGenMap.get(el) || 0) + 1;
    crossfadeGenMap.set(el, gen);

    const dur = isReduced ? 100 : Number(opts.duration ?? 150);
    const shift = isReduced ? 0 : Number(opts.shiftPx ?? 4);

    if (typeof el.animate === 'function') {
      const outAnim = el.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: shift ? `translateY(${shift}px)` : 'none' },
        ],
        { duration: Math.round(dur * 0.45), easing: 'ease-in', fill: 'forwards' }
      );
      try {
        await outAnim.finished;
      } catch (_) {}
      if (crossfadeGenMap.get(el) !== gen) return;
      outAnim.cancel();
    }

    mutateFn?.();
    if (crossfadeGenMap.get(el) !== gen) return;

    if (typeof el.animate === 'function') {
      const inAnim = el.animate(
        [
          { opacity: 0, transform: shift ? `translateY(${-shift}px)` : 'none' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: Math.round(dur * 0.85), easing: EASE_OUT }
      );
      try {
        await inAnim.finished;
      } catch (_) {}
    }
  },

  /**
   * Interruptible Enter / Exit presence controller using per-element generation tokens.
   */
  transitionPresence(el, present, opts = {}) {
    if (!el) return Promise.resolve(false);
    const gen = (presenceGenMap.get(el) || 0) + 1;
    presenceGenMap.set(el, gen);

    const prevTimer = presenceTimerMap.get(el);
    if (prevTimer) {
      clearTimeout(prevTimer);
      presenceTimerMap.delete(el);
    }

    const preset = opts.preset || 'fade';
    const isEnter = Boolean(present);
    const defaultDur = isEnter
      ? preset === 'modal' || preset === 'drawer-right' || preset === 'sheet-up'
        ? 300
        : preset === 'pill'
        ? 160
        : 220
      : preset === 'drawer-right'
      ? 220
      : 160;
    const duration = isReduced ? 120 : Number(opts.duration ?? defaultDur);

    el.dataset.preset = preset;

    if (isEnter) {
      el.hidden = false;
      el.dataset.presence = 'entering';
      // Ensure starting frame is committed before transitioning to open
      void el.offsetWidth;
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          if (presenceGenMap.get(el) !== gen) {
            resolve(false);
            return;
          }
          el.dataset.presence = 'open';
          const t = setTimeout(() => {
            presenceTimerMap.delete(el);
            resolve(presenceGenMap.get(el) === gen);
          }, duration);
          presenceTimerMap.set(el, t);
        });
      });
    }

    // Exit
    if (el.hidden && el.dataset.presence !== 'open' && el.dataset.presence !== 'entering') {
      if (opts.removeOnExit) el.remove();
      opts.onAfterExit?.();
      return Promise.resolve(true);
    }

    el.dataset.presence = 'exiting';
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        presenceTimerMap.delete(el);
        if (presenceGenMap.get(el) !== gen) {
          resolve(false);
          return;
        }
        el.hidden = true;
        delete el.dataset.presence;
        if (opts.removeOnExit) el.remove();
        opts.onAfterExit?.();
        resolve(true);
      }, duration);
      presenceTimerMap.set(el, t);
    });
  },
};

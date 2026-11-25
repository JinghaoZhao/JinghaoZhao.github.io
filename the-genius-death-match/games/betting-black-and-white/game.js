/**
 * Betting! Black and White (下注黑与白 · 베팅! 흑과 백) — Interactive Partition Table
 * Persistent Phase Skeletons + FLIP Tile Swaps + In-Place Chip Stacks + Motion SDK
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import {
  GameRules,
  ALL_TILES,
  TOTAL_SLOTS,
  TOTAL_CHIPS,
  getTileColor,
  buildAutoBorrowPlan,
} from './rules.js';

let setupDraftOwner = null;
let draftTiles = [4, 2, 7, 0, 5, 9, 1, 6, 3, 8];
let draftChips = [3, 2, 4, 3, 3, 4, 2, 4, 2, 3]; // sum = 30
let swapSelectedIdx = null;
let prevAllocatedSum = TOTAL_CHIPS;

let borrowDraftKey = null;
let borrowFromReserve = 0;
let borrowFromSlots = {};
let showCustomBorrow = false;

let prevResMe = null;
let prevResOpp = null;
let lastEventTs = null;
let latestCtx = null;

function applyPreset(kind) {
  if (kind === 'balanced') {
    draftTiles = [4, 1, 6, 2, 7, 0, 5, 8, 3, 9];
    draftChips = [3, 2, 3, 2, 4, 3, 3, 4, 2, 4];
  } else if (kind === 'heavy_high') {
    draftTiles = [0, 2, 5, 7, 1, 8, 3, 6, 4, 9];
    draftChips = [1, 1, 3, 5, 1, 5, 2, 4, 2, 6];
  } else if (kind === 'bluff_trap') {
    draftTiles = [0, 9, 5, 2, 7, 1, 8, 4, 6, 3];
    draftChips = [5, 1, 3, 2, 4, 5, 1, 3, 4, 2];
  } else if (kind === 'random') {
    const t = ALL_TILES.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    const c = new Array(TOTAL_SLOTS).fill(1);
    let rem = TOTAL_CHIPS - TOTAL_SLOTS;
    while (rem > 0) {
      c[Math.floor(Math.random() * TOTAL_SLOTS)] += 1;
      rem -= 1;
    }
    draftTiles = t;
    draftChips = c;
  }
  swapSelectedIdx = null;
}

function colorShort(color, lang) {
  if (color === 'black') return lang === 'zh' ? '黑' : 'BLK';
  return lang === 'zh' ? '白' : 'WHT';
}

// =========================================================================
// PHASE 1: SETUP SKELETON & IN-PLACE FLIP PATCHING
// =========================================================================

function mountSetupSkeleton(container) {
  container.innerHTML = `
    <div class="bbw-arena" data-bbw-phase="setup">
      <section class="bbw-header-bar">
        <div class="bbw-bank-side">
          <strong data-el="me-name"></strong>
          <span class="tg-badge" data-el="me-lock-badge"></span>
        </div>
        <div style="text-align:center;">
          <span class="tg-badge tg-badge-garnet" data-el="setup-phase-pill"></span>
        </div>
        <div class="bbw-bank-side is-right">
          <span class="tg-badge" data-el="opp-lock-badge"></span>
          <strong data-el="opp-name"></strong>
        </div>
      </section>

      <section class="bbw-setup-panel">
        <div data-el="setup-wait-box" style="text-align:center;padding:30px 16px;" hidden>
          <div style="font-family:var(--tg-font-display);font-size:22px;color:var(--tg-gold-bright);margin-bottom:8px;" data-el="wait-title"></div>
          <p style="color:var(--tg-ink-muted);margin:0;" data-el="wait-sub"></p>
        </div>

        <div data-el="setup-editor">
          <div class="bbw-setup-top" style="margin-bottom:14px;">
            <div>
              <div style="font-family:var(--tg-font-display);font-size:18px;font-weight:800;color:var(--tg-gold-bright);" data-el="editor-title"></div>
              <div style="font-size:12.5px;color:var(--tg-ink-muted);margin-top:2px;" data-el="editor-sub"></div>
            </div>
            <div class="bbw-preset-bar">
              <button type="button" class="tg-btn tg-btn-sm" data-preset="balanced"></button>
              <button type="button" class="tg-btn tg-btn-sm" data-preset="heavy_high"></button>
              <button type="button" class="tg-btn tg-btn-sm tg-btn-cyan" data-preset="bluff_trap"></button>
              <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-preset="random"></button>
            </div>
          </div>

          <div class="bbw-setup-grid" data-el="setup-grid">
            ${Array.from({ length: TOTAL_SLOTS }, (_, idx) => {
              const tile = draftTiles[idx];
              const col = getTileColor(tile);
              return `
                <div class="bbw-setup-col" data-col-idx="${idx}">
                  <span class="bbw-slot-idx">#${idx + 1}</span>
                  <div class="bbw-tile-slot-mount" data-tile-mount="${idx}">
                    <button type="button" class="bbw-setup-tile is-${col}" data-flip-key="tile-${tile}" data-tile-val="${tile}">
                      <span class="bbw-setup-num">${tile}</span>
                      <span style="font-family:var(--tg-font-mono);font-size:9px;opacity:0.78;" data-tile-color-txt></span>
                    </button>
                  </div>
                  <div class="bbw-chip-ctrl">
                    <div class="bbw-chip-stack-vis" data-chip-vis="${idx}"></div>
                    <div class="bbw-chip-btns">
                      <button type="button" class="bbw-mini-btn" data-chip-dec="${idx}">−</button>
                      <span class="bbw-chip-count" data-chip-num="${idx}">3</span>
                      <button type="button" class="bbw-mini-btn" data-chip-inc="${idx}">+</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:12px;margin-top:14px;border-top:1px solid var(--tg-border-subtle);">
            <div style="display:flex;align-items:center;gap:10px;font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:13px;">
              <span class="bbw-bank-chip-pill is-gold" data-el="alloc-pill">
                <span data-el="alloc-label"></span> <span data-el="alloc-num">30</span> / ${TOTAL_CHIPS}
              </span>
              <span data-el="alloc-hint"></span>
            </div>
            <button type="button" class="tg-btn tg-btn-garnet" data-el="lock-setup" style="min-width:210px;min-height:44px;"></button>
          </div>
        </div>
      </section>
    </div>
  `;

  container.dataset.mountedPhase = 'setup';
  prevAllocatedSum = draftChips.reduce((a, b) => a + b, 0);

  // Bind stable listeners once!
  const grid = container.querySelector('[data-el="setup-grid"]');

  container.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!latestCtx) return;
      latestCtx.sfx.play('chipStack');
      const playFlip = Motion.flipList(grid, '.bbw-setup-tile', {
        keyAttr: 'data-flip-key',
        duration: 240,
        easing: 'cubic-bezier(0.34, 1.42, 0.64, 1)',
      });
      applyPreset(btn.dataset.preset);
      syncSetupDOM(container, latestCtx.lang, true);
      playFlip();
    });
  });

  grid.addEventListener('click', (e) => {
    if (!latestCtx) return;
    const tileBtn = e.target.closest('.bbw-setup-tile');
    if (tileBtn) {
      const colEl = tileBtn.closest('.bbw-setup-col');
      const idx = Number(colEl.dataset.colIdx);
      if (swapSelectedIdx === null) {
        latestCtx.sfx.play('click');
        swapSelectedIdx = idx;
        syncSetupSelection(container);
      } else if (swapSelectedIdx === idx) {
        latestCtx.sfx.play('click');
        swapSelectedIdx = null;
        syncSetupSelection(container);
      } else {
        latestCtx.sfx.play('tilePlace');
        const playFlip = Motion.flipList(grid, '.bbw-setup-tile', {
          keyAttr: 'data-flip-key',
          duration: 220,
          easing: 'cubic-bezier(0.34, 1.42, 0.64, 1)',
        });
        const tmp = draftTiles[swapSelectedIdx];
        draftTiles[swapSelectedIdx] = draftTiles[idx];
        draftTiles[idx] = tmp;
        swapSelectedIdx = null;
        syncSetupDOM(container, latestCtx.lang, false);
        playFlip();
      }
      return;
    }

    const decBtn = e.target.closest('[data-chip-dec]');
    if (decBtn && !decBtn.disabled) {
      const idx = Number(decBtn.dataset.chipDec);
      if (draftChips[idx] > 1) {
        latestCtx.sfx.play('click');
        draftChips[idx] -= 1;
        syncChipSlotInPlace(container, idx, false);
        syncAllocSummary(container, latestCtx.lang);
      }
      return;
    }

    const incBtn = e.target.closest('[data-chip-inc]');
    if (incBtn && !incBtn.disabled) {
      const idx = Number(incBtn.dataset.chipInc);
      const sum = draftChips.reduce((a, b) => a + b, 0);
      if (sum < TOTAL_CHIPS) {
        latestCtx.sfx.play('bid');
        draftChips[idx] += 1;
        syncChipSlotInPlace(container, idx, true);
        syncAllocSummary(container, latestCtx.lang);
      }
    }
  });

  container.querySelector('[data-el="lock-setup"]').addEventListener('click', () => {
    if (!latestCtx) return;
    const sum = draftChips.reduce((a, b) => a + b, 0);
    if (sum !== TOTAL_CHIPS || draftChips.some((c) => c < 1)) {
      latestCtx.sfx.play('error');
      Motion.nudgeError(container.querySelector('[data-el="alloc-pill"]'), { intensity: 'subtle' });
      return;
    }
    latestCtx.sfx.play('tilePlace');
    Motion.pulseConfirm(container.querySelector('[data-el="lock-setup"]'), { tone: 'gold' });
    latestCtx.dispatch({
      type: 'LOCK_SETUP',
      payload: { tiles: draftTiles.slice(), chips: draftChips.slice() },
    });
  });
}

function syncSetupSelection(container) {
  container.querySelectorAll('.bbw-setup-col').forEach((col) => {
    col.classList.toggle('is-swap-selected', swapSelectedIdx !== null && Number(col.dataset.colIdx) === swapSelectedIdx);
  });
}

function syncChipSlotInPlace(container, idx, added) {
  const c = draftChips[idx];
  const visEl = container.querySelector(`[data-chip-vis="${idx}"]`);
  const numEl = container.querySelector(`[data-chip-num="${idx}"]`);
  if (numEl) numEl.textContent = String(c);
  if (visEl) {
    const discs = Math.min(7, c);
    visEl.innerHTML = Array.from({ length: discs }, (_, i) => {
      const isTopNew = added && i === discs - 1 && !Motion.reduced();
      return `<span class="bbw-chip-disc ${c >= 5 ? 'is-gold' : ''} ${isTopNew ? 'is-pop' : ''}"></span>`;
    }).join('');
  }
}

function syncAllocSummary(container, lang) {
  const sum = draftChips.reduce((a, b) => a + b, 0);
  const rem = TOTAL_CHIPS - sum;
  const q = (k) => container.querySelector(`[data-el="${k}"]`);

  container.querySelectorAll('[data-chip-dec]').forEach((b) => {
    b.disabled = draftChips[Number(b.dataset.chipDec)] <= 1;
  });
  container.querySelectorAll('[data-chip-inc]').forEach((b) => {
    b.disabled = rem <= 0;
  });

  const allocPill = q('alloc-pill');
  allocPill.classList.toggle('is-gold', rem === 0);
  const numEl = q('alloc-num');
  if (sum !== prevAllocatedSum) {
    Motion.animateNumber(numEl, prevAllocatedSum, sum, { duration: 160 });
    prevAllocatedSum = sum;
  } else {
    numEl.textContent = String(sum);
  }
  q('alloc-label').textContent = lang === 'zh' ? '已分配' : 'ALLOCATED';

  const hint = q('alloc-hint');
  hint.style.color = rem === 0 ? 'var(--tg-emerald-ink)' : 'var(--tg-amber)';
  hint.textContent = rem === 0
    ? (lang === 'zh' ? '✓ 筹码就绪，可锁定阵型' : '✓ Ready to lock formation')
    : rem > 0
    ? (lang === 'zh' ? `还需分配 ${rem} 枚筹码` : `${rem} chip(s) left to place`)
    : (lang === 'zh' ? `超出 ${-rem} 枚筹码` : `${-rem} over budget`);

  const lockBtn = q('lock-setup');
  const meLocked = latestCtx?.state?.players[latestCtx?.activeSeatId || latestCtx?.mySeatId]?.setupLocked;
  lockBtn.disabled = Boolean(latestCtx?.isSpectator || meLocked || rem !== 0 || draftChips.some((c) => c < 1));
}

function syncSetupDOM(container, lang, popChips) {
  // Move actual keyed .bbw-setup-tile DOM nodes into their new slot mounts so FLIP glides them!
  const tileNodes = new Map();
  container.querySelectorAll('.bbw-setup-tile').forEach((el) => {
    tileNodes.set(Number(el.dataset.tileVal), el);
  });

  for (let idx = 0; idx < TOTAL_SLOTS; idx++) {
    const tile = draftTiles[idx];
    const mount = container.querySelector(`[data-tile-mount="${idx}"]`);
    const tileEl = tileNodes.get(tile);
    if (mount && tileEl) {
      if (tileEl.parentElement !== mount) mount.appendChild(tileEl);
      const colTxt = tileEl.querySelector('[data-tile-color-txt]');
      if (colTxt) colTxt.textContent = colorShort(getTileColor(tile), lang);
    }
    syncChipSlotInPlace(container, idx, popChips);
  }
  syncSetupSelection(container);
  syncAllocSummary(container, lang);
}

// =========================================================================
// PHASE 2: BATTLE SKELETON & IN-PLACE PATCHING (PARTITION DROPPED!)
// =========================================================================

function buildSkylineColsHtml(side) {
  return Array.from({ length: TOTAL_SLOTS }, (_, i) => `
    <div class="bbw-monolith-col" data-sky="${side}-${i}">
      <span class="bbw-slot-idx">#${i + 1}</span>
      <div class="bbw-pillar" data-sky-pillar="${side}-${i}">
        <span data-sky-num="${side}-${i}">?</span>
        <span style="font-family:var(--tg-font-mono);font-size:8.5px;opacity:0.74;" data-sky-col="${side}-${i}"></span>
      </div>
      <span class="bbw-pillar-chips" data-sky-chips="${side}-${i}">0</span>
    </div>
  `).join('');
}

function mountBattleSkeleton(container, fromSetup) {
  container.innerHTML = `
    <div class="bbw-arena ${fromSetup && !Motion.reduced() ? 'is-partition-dropping' : ''}" data-bbw-phase="battle">
      <section class="bbw-header-bar">
        <div class="bbw-bank-side">
          <strong data-el="b-me-name"></strong>
          <span class="bbw-bank-chip-pill is-gold" data-el="b-me-res-pill">
            <span data-el="b-res-lbl-1"></span>: <span data-el="b-me-res">0</span>
          </span>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--tg-font-display);font-variant-numeric:tabular-nums;font-size:17px;font-weight:800;color:var(--tg-gold-bright);" data-el="b-slot-title"></div>
          <span class="tg-badge tg-badge-garnet" data-el="b-phase-badge"></span>
        </div>
        <div class="bbw-bank-side is-right">
          <span class="bbw-bank-chip-pill" data-el="b-opp-res-pill">
            <span data-el="b-res-lbl-2"></span>: <span data-el="b-opp-res">0</span>
          </span>
          <strong data-el="b-opp-name"></strong>
        </div>
      </section>

      <section class="bbw-skyline-panel">
        <div class="bbw-skyline-head">
          <span data-el="sky-opp-head"></span>
          <span style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:11.5px;" data-el="sky-opp-meta"></span>
        </div>
        <div class="bbw-skyline-grid">${buildSkylineColsHtml('opp')}</div>
      </section>

      <section class="bbw-clash-stage" data-el="clash-stage">
        <div class="bbw-clash-duel">
          <div class="bbw-duel-card-wrap">
            <span style="font-size:12px;font-weight:700;color:var(--tg-gold-bright);" data-el="duel-me-lbl"></span>
            <div class="bbw-duel-tile" data-el="duel-me-tile">
              <span class="bbw-duel-num" data-el="duel-me-num">?</span>
              <span style="font-family:var(--tg-font-mono);font-size:10px;opacity:0.78;" data-el="duel-me-col"></span>
            </div>
            <span class="bbw-bank-chip-pill is-gold" data-el="duel-me-chips"></span>
          </div>

          <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;min-width:220px;" data-el="clash-center">
            <span class="tg-badge" data-el="clash-badge"></span>
            <div style="font-size:12.5px;color:var(--tg-ink-muted);" data-el="clash-desc"></div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;" data-el="clash-actions">
              <button type="button" class="tg-btn tg-btn-garnet" data-el="btn-reveal" style="min-width:170px;" hidden></button>
              <button type="button" class="tg-btn tg-btn-ghost" data-el="btn-fold" style="min-width:115px;" hidden></button>
              <button type="button" class="tg-btn tg-btn-gold" data-el="btn-call" style="min-width:145px;" hidden></button>
              <button type="button" class="tg-btn tg-btn-gold" data-el="btn-next" style="min-width:155px;" hidden></button>
            </div>
            <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-el="btn-toggle-borrow" hidden></button>
          </div>

          <div class="bbw-duel-card-wrap">
            <span style="font-size:12px;font-weight:700;color:var(--tg-garnet-ink);" data-el="duel-opp-lbl"></span>
            <div class="bbw-duel-tile" data-el="duel-opp-tile">
              <span class="bbw-duel-num" data-el="duel-opp-num">?</span>
              <span style="font-family:var(--tg-font-mono);font-size:10px;opacity:0.78;" data-el="duel-opp-col"></span>
            </div>
            <span class="bbw-bank-chip-pill" data-el="duel-opp-chips"></span>
          </div>
        </div>

        <div class="bbw-borrow-drawer" data-el="borrow-drawer" hidden>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
            <strong style="color:var(--tg-gold-bright);" data-el="borrow-head"></strong>
            <span style="font-family:var(--tg-font-mono);" data-el="borrow-status"></span>
          </div>
          <div class="bbw-borrow-sources" data-el="borrow-sources"></div>
        </div>
      </section>

      <section class="bbw-skyline-panel">
        <div class="bbw-skyline-head">
          <span data-el="sky-me-head"></span>
          <span style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:11.5px;" data-el="sky-me-meta"></span>
        </div>
        <div class="bbw-skyline-grid">${buildSkylineColsHtml('me')}</div>
      </section>
    </div>
  `;

  container.dataset.mountedPhase = 'battle';

  // Bind stable battle listeners once!
  const q = (k) => container.querySelector(`[data-el="${k}"]`);
  q('btn-reveal').addEventListener('click', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('cardFlip');
    latestCtx.dispatch({ type: 'REVEAL_SHOWDOWN' });
  });
  q('btn-fold').addEventListener('click', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    latestCtx.dispatch({ type: 'FOLD' });
  });
  q('btn-call').addEventListener('click', () => {
    if (!latestCtx) return;
    const clash = latestCtx.state?.currentClash;
    const sum = borrowFromReserve + Object.values(borrowFromSlots).reduce((a, b) => a + Number(b || 0), 0);
    if (!clash || sum !== clash.deficit) {
      latestCtx.sfx.play('error');
      Motion.nudgeError(q('borrow-drawer'), { intensity: 'subtle' });
      return;
    }
    latestCtx.sfx.play('chipStack');
    Motion.pulseConfirm(q('btn-call'), { tone: 'gold' });
    latestCtx.dispatch({
      type: 'CALL',
      payload: { fromReserve: borrowFromReserve, fromSlots: { ...borrowFromSlots } },
    });
  });
  q('btn-next').addEventListener('click', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    latestCtx.dispatch({ type: 'NEXT_ROUND' });
  });
  q('btn-toggle-borrow').addEventListener('click', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    showCustomBorrow = !showCustomBorrow;
    patchBorrowDrawerInPlace(container);
  });

  // Delegate custom borrow -/+ clicks in place (zero full re-render!)
  q('borrow-sources').addEventListener('click', (e) => {
    if (!latestCtx?.state) return;
    const { state, mySeatId, activeSeatId, isSpectator } = latestCtx;
    const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
    const me = state.players[viewerId];

    const resBtn = e.target.closest('[data-br-res]');
    if (resBtn && !resBtn.disabled) {
      const d = Number(resBtn.dataset.brRes);
      borrowFromReserve = Math.max(0, Math.min(me.reserve, borrowFromReserve + d));
      latestCtx.sfx.play('click');
      patchBorrowDrawerInPlace(container);
      return;
    }
    const slotBtn = e.target.closest('[data-br-slot]');
    if (slotBtn && !slotBtn.disabled) {
      const sIdx = Number(slotBtn.dataset.brSlot);
      const d = Number(slotBtn.dataset.delta);
      const maxTake = Math.max(0, me.slots[sIdx].chips - 1);
      const cur = Number(borrowFromSlots[sIdx] || 0);
      const nextVal = Math.max(0, Math.min(maxTake, cur + d));
      if (nextVal === 0) delete borrowFromSlots[sIdx];
      else borrowFromSlots[sIdx] = nextVal;
      latestCtx.sfx.play('click');
      patchBorrowDrawerInPlace(container);
    }
  });
}

function patchBorrowDrawerInPlace(container) {
  if (!latestCtx?.state) return;
  const { state, mySeatId, activeSeatId, isSpectator, lang } = latestCtx;
  const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
  const me = state.players[viewerId];
  const clash = state.currentClash || {};
  const slotIdx = Math.max(0, Math.min(TOTAL_SLOTS - 1, state.currentSlotIdx));
  const isMyDecision = !isSpectator && state.phase === 'clash_decision' && state.currentTurnSeatId === viewerId;
  const q = (k) => container.querySelector(`[data-el="${k}"]`);

  const myBorrowSum = borrowFromReserve + Object.values(borrowFromSlots).reduce((a, b) => a + Number(b || 0), 0);
  const borrowValid = isMyDecision && clash.canCall && myBorrowSum === clash.deficit;

  const callBtn = q('btn-call');
  if (callBtn) callBtn.disabled = !borrowValid;

  const toggleBtn = q('btn-toggle-borrow');
  if (toggleBtn) {
    toggleBtn.hidden = !(isMyDecision && clash.canCall);
    toggleBtn.textContent = showCustomBorrow
      ? (lang === 'zh' ? '收起借调方案 ▲' : 'Hide Borrow Plan ▲')
      : (lang === 'zh' ? '自定义从哪格借调筹码 ▼' : 'Customize Borrow Sources ▼');
  }

  const drawer = q('borrow-drawer');
  if (!drawer) return;
  drawer.hidden = !(isMyDecision && clash.canCall && showCustomBorrow);
  if (drawer.hidden) return;

  q('borrow-head').textContent = lang === 'zh'
    ? `借调分配器（已选 ${myBorrowSum} / 需补齐 ${clash.deficit} 枚）`
    : `BORROW PLANNER (${myBorrowSum} / ${clash.deficit} NEEDED)`;
  const statusEl = q('borrow-status');
  statusEl.style.color = borrowValid ? 'var(--tg-emerald-ink)' : 'var(--tg-amber)';
  statusEl.textContent = borrowValid
    ? '✓ OK'
    : (lang === 'zh' ? `差 ${clash.deficit - myBorrowSum}` : `Diff ${clash.deficit - myBorrowSum}`);

  q('borrow-sources').innerHTML = `
    <div class="bbw-borrow-item">
      <span>${lang === 'zh' ? '储备库' : 'Reserve'} (${me.reserve}):</span>
      <button type="button" class="bbw-mini-btn" data-br-res="-1" ${borrowFromReserve <= 0 ? 'disabled' : ''}>−</button>
      <strong style="color:var(--tg-gold-bright);min-width:18px;text-align:center;">${borrowFromReserve}</strong>
      <button type="button" class="bbw-mini-btn" data-br-res="1" ${borrowFromReserve >= me.reserve || myBorrowSum >= clash.deficit ? 'disabled' : ''}>+</button>
    </div>
    ${me.slots
      .filter((s) => s.slotIdx > slotIdx && s.chips > 1)
      .map((s) => {
        const used = Number(borrowFromSlots[s.slotIdx] || 0);
        const maxTake = s.chips - 1;
        return `
          <div class="bbw-borrow-item">
            <span>#${s.slotIdx + 1} [${s.tile}] (max ${maxTake}):</span>
            <button type="button" class="bbw-mini-btn" data-br-slot="${s.slotIdx}" data-delta="-1" ${used <= 0 ? 'disabled' : ''}>−</button>
            <strong style="color:var(--tg-gold-bright);min-width:18px;text-align:center;">${used}</strong>
            <button type="button" class="bbw-mini-btn" data-br-slot="${s.slotIdx}" data-delta="1" ${used >= maxTake || myBorrowSum >= clash.deficit ? 'disabled' : ''}>+</button>
          </div>
        `;
      })
      .join('')}
  `;
}

function renderStage(container, ctx) {
  latestCtx = ctx;
  const { state, mySeatId, activeSeatId, isSpectator, lang, lastEvent, sfx, log } = ctx;
  if (!state) return;

  const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
  const oppId = state.seatOrder.find((id) => id !== viewerId) || state.seatOrder[1];
  const me = state.players[viewerId];
  const opp = state.players[oppId];

  // Reset local setup draft when switching human seat in Pass-and-Play
  if (state.phase === 'setup' && setupDraftOwner !== viewerId) {
    setupDraftOwner = viewerId;
    applyPreset('balanced');
  }

  // Audio cues, Motion feedback & log on new events
  if (lastEvent && lastEvent.ts && lastEvent.ts !== lastEventTs) {
    lastEventTs = lastEvent.ts;
    if (lastEvent.type === 'SETUP_LOCKED') {
      sfx.play('tilePlace');
      const nm = state.players[lastEvent.seatId]?.name || '';
      log(lang === 'zh' ? `${nm} 已在屏风后锁定 10 轮阵型` : `${nm} locked their 10-slot formation`, 'system');
    } else if (lastEvent.type === 'PARTITION_DROPPED') {
      sfx.play('clash');
      log(lang === 'zh' ? '屏风降下！双方 10 轮黑白阵型与筹码分布公开！' : 'Partition dropped! All 10 Black/White columns & chips revealed!', 'alert');
    } else if (lastEvent.type === 'ROUND_FOLDED') {
      sfx.play('chipStack');
      const fNm = state.players[lastEvent.folderSeatId]?.name || '';
      const wNm = state.players[lastEvent.winnerSeatId]?.name || '';
      log(
        lang === 'zh'
          ? `第 ${lastEvent.round} 轮：${fNm} 弃牌（数字保密），${wNm} 收走 ${lastEvent.pot} 筹码`
          : `R${lastEvent.round}: ${fNm} folded — ${wNm} takes ${lastEvent.pot} chips`,
        'system'
      );
      if (lastEvent.folderSeatId === viewerId) {
        setTimeout(() => Motion.nudgeError(container.querySelector('[data-el="clash-stage"]'), { intensity: 'subtle' }), 60);
      }
    } else if (lastEvent.type === 'SHOWDOWN_RESOLVED' || lastEvent.type === 'CALL_SHOWDOWN') {
      sfx.play('cardFlip');
      setTimeout(() => {
        if (lastEvent.isDraw) sfx.play('reveal');
        else if (lastEvent.winnerSeatId === viewerId) {
          sfx.play('garnetClink');
          Motion.pulseConfirm(container.querySelector('[data-el="duel-me-tile"]'), { tone: 'gold' });
        } else {
          sfx.play('clash');
          Motion.nudgeError(container.querySelector('[data-el="clash-stage"]'), { intensity: 'subtle' });
        }
      }, 200);
      const wNm = lastEvent.winnerSeatId ? state.players[lastEvent.winnerSeatId]?.name : null;
      log(
        lastEvent.isDraw
          ? lang === 'zh' ? `第 ${lastEvent.round} 轮摊牌：平局，各自收回筹码` : `R${lastEvent.round} Showdown: Tie — chips split`
          : lang === 'zh' ? `第 ${lastEvent.round} 轮摊牌：${wNm} 胜，赢走 ${lastEvent.pot} 筹码` : `R${lastEvent.round} Showdown: ${wNm} wins ${lastEvent.pot} chips`,
        'alert'
      );
    }
  }

  // ---- PHASE 1: SETUP ----
  if (state.phase === 'setup') {
    if (container.dataset.mountedPhase !== 'setup' || !container.querySelector('[data-bbw-phase="setup"]')) {
      prevResMe = null;
      prevResOpp = null;
      mountSetupSkeleton(container);
    }
    const q = (k) => container.querySelector(`[data-el="${k}"]`);
    q('me-name').textContent = `${me.name}${!isSpectator ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}`;
    q('opp-name').textContent = opp.name;
    q('setup-phase-pill').textContent = lang === 'zh' ? '阶段一 · 屏风后秘密布阵' : 'PHASE 1 · SECRET PARTITION';

    const meBadge = q('me-lock-badge');
    meBadge.className = `tg-badge ${me.setupLocked ? 'tg-badge-emerald' : 'tg-badge-gold'}`;
    meBadge.textContent = me.setupLocked ? (lang === 'zh' ? '阵型已锁定' : 'LOCKED') : (lang === 'zh' ? '布阵中' : 'PLANNING');
    const oppBadge = q('opp-lock-badge');
    oppBadge.className = `tg-badge ${opp.setupLocked ? 'tg-badge-emerald' : 'tg-badge-cyan'}`;
    oppBadge.textContent = opp.setupLocked ? (lang === 'zh' ? '对手已锁定' : 'READY') : (lang === 'zh' ? '布阵中' : 'PLANNING');

    const waitBox = q('setup-wait-box');
    const editor = q('setup-editor');
    if (isSpectator || me.setupLocked) {
      waitBox.hidden = false;
      editor.hidden = true;
      q('wait-title').textContent = isSpectator
        ? (lang === 'zh' ? '屏风秘密布阵中' : 'Secret Setup In Progress')
        : (lang === 'zh' ? '你的 10 轮阵型已封存' : 'Your 10-Slot Formation is Locked');
      q('wait-sub').textContent = isSpectator
        ? (lang === 'zh' ? '双方正在屏风后秘密排布 10 张数字砖与 30 枚筹码...' : 'Contestants are secretly arranging 10 tiles & 30 chips...')
        : (lang === 'zh' ? `正在等待 ${opp.name} 完成布阵，随后降下屏风开战...` : `Waiting for ${opp.name} to lock in before dropping the partition...`);
    } else {
      waitBox.hidden = true;
      editor.hidden = false;
      q('editor-title').textContent = lang === 'zh' ? '排定 10 回合数字砖顺序 & 分配 30 枚筹码' : 'Arrange 10 Tiles (0–9) & Allocate 30 Chips';
      q('editor-sub').textContent = lang === 'zh'
        ? '点击任意两张砖即可平滑互换位置；调整下方 −/+ 分配全部 30 枚筹码（每槽至少 1 枚）'
        : 'Click any two tiles to glide-swap slots; use −/+ to allocate all 30 chips (min 1 per slot)';
      container.querySelector('[data-preset="balanced"]').textContent = lang === 'zh' ? '均衡阵型' : 'Balanced';
      container.querySelector('[data-preset="heavy_high"]').textContent = lang === 'zh' ? '高牌重注' : 'Heavy High';
      container.querySelector('[data-preset="bluff_trap"]').textContent = lang === 'zh' ? '吴贤旻诈唬阵' : 'Bluff Trap';
      container.querySelector('[data-preset="random"]').textContent = lang === 'zh' ? '随机洗牌' : 'Randomize';
      q('lock-setup').textContent = lang === 'zh' ? '锁定阵型 · 准备撤屏' : 'Lock Formation';
      syncSetupDOM(container, lang, false);
    }
    return;
  }

  // ---- PHASE 2: BATTLE (PARTITION DROPPED) ----
  const wasSetup = container.dataset.mountedPhase === 'setup';
  if (container.dataset.mountedPhase !== 'battle' || !container.querySelector('[data-bbw-phase="battle"]')) {
    prevResMe = null;
    prevResOpp = null;
    mountBattleSkeleton(container, wasSetup);
  }

  const slotIdx = Math.max(0, Math.min(TOTAL_SLOTS - 1, state.currentSlotIdx));
  const clash = state.currentClash || {};
  const mySlot = me.slots?.[slotIdx];
  const oppSlot = opp.slots?.[slotIdx];
  const isClashDecision = state.phase === 'clash_decision';
  const isEqualShowdown = state.phase === 'equal_showdown';
  const isRoundResult = state.phase === 'round_result';
  const isFinished = state.phase === 'finished';
  const isMyDecision = !isSpectator && isClashDecision && state.currentTurnSeatId === viewerId;

  const bKey = `${state.round}-${state.phase}-${viewerId}`;
  if (bKey !== borrowDraftKey) {
    borrowDraftKey = bKey;
    showCustomBorrow = false;
    if (isMyDecision && clash.canCall) {
      const auto = buildAutoBorrowPlan(me, slotIdx, clash.deficit, false);
      borrowFromReserve = auto.fromReserve;
      borrowFromSlots = { ...auto.fromSlots };
    } else {
      borrowFromReserve = 0;
      borrowFromSlots = {};
    }
  }

  const q = (k) => container.querySelector(`[data-el="${k}"]`);
  q('b-me-name').textContent = me.name;
  q('b-opp-name').textContent = opp.name;
  q('b-res-lbl-1').textContent = lang === 'zh' ? '储备库' : 'RESERVE';
  q('b-res-lbl-2').textContent = lang === 'zh' ? '储备库' : 'RESERVE';
  q('b-slot-title').textContent = lang === 'zh' ? `第 ${state.round} / ${TOTAL_SLOTS} 槽位对决` : `SLOT #${state.round} / ${TOTAL_SLOTS}`;
  q('b-phase-badge').textContent = I18n.t(state.phaseLabel);

  // Animate Reserve Banks
  const meResEl = q('b-me-res');
  const oppResEl = q('b-opp-res');
  if (prevResMe === null) {
    meResEl.textContent = String(me.reserve);
    oppResEl.textContent = String(opp.reserve);
  } else {
    if (me.reserve !== prevResMe) {
      Motion.animateNumber(meResEl, prevResMe, me.reserve, { duration: 320, deltaEl: q('b-me-res-pill') });
    }
    if (opp.reserve !== prevResOpp) {
      Motion.animateNumber(oppResEl, prevResOpp, opp.reserve, { duration: 320, deltaEl: q('b-opp-res-pill') });
    }
  }
  prevResMe = me.reserve;
  prevResOpp = opp.reserve;

  // Patch Skylines in place
  const totalOnBoard = (p) => (p.slots || []).reduce((acc, s) => acc + (s.status === 'pending' ? s.chips : 0), 0);
  q('sky-opp-head').innerHTML = `<strong style="color:var(--tg-garnet-ink);">${UI.escapeHtml(opp.name)}</strong> · ${lang === 'zh' ? '对手 10 轮阵型（仅公开颜色与筹码）' : 'RIVAL SKYLINE (COLORS & CHIPS PUBLIC)'}`;
  q('sky-opp-meta').textContent = `${lang === 'zh' ? '储备' : 'Reserve'}: ${opp.reserve} · ${lang === 'zh' ? '待赛' : 'Board'}: ${totalOnBoard(opp)}`;
  q('sky-me-head').innerHTML = `<strong style="color:var(--tg-gold-bright);">${UI.escapeHtml(me.name)}</strong> · ${!isSpectator ? (lang === 'zh' ? '你的 10 轮阵型（数字仅你可见）' : 'YOUR SKYLINE (PRIVATE NUMERALS)') : (lang === 'zh' ? '10 轮阵型' : 'SKYLINE')}`;
  q('sky-me-meta').textContent = `${lang === 'zh' ? '储备' : 'Reserve'}: ${me.reserve} · ${lang === 'zh' ? '待赛' : 'Board'}: ${totalOnBoard(me)}`;

  const patchSky = (side, player) => {
    (player.slots || []).forEach((sl) => {
      const colEl = container.querySelector(`[data-sky="${side}-${sl.slotIdx}"]`);
      const pilEl = container.querySelector(`[data-sky-pillar="${side}-${sl.slotIdx}"]`);
      const numEl = container.querySelector(`[data-sky-num="${side}-${sl.slotIdx}"]`);
      const txtEl = container.querySelector(`[data-sky-col="${side}-${sl.slotIdx}"]`);
      const chpEl = container.querySelector(`[data-sky-chips="${side}-${sl.slotIdx}"]`);
      if (!colEl) return;

      const isCurr = sl.slotIdx === slotIdx && !isFinished;
      const isRes = sl.status === 'resolved';
      colEl.className = `bbw-monolith-col ${isCurr ? 'is-active-slot' : ''} ${isRes ? 'is-resolved' : ''} ${sl.outcome === 'win' ? 'is-won' : (sl.outcome === 'loss' || sl.outcome === 'fold') ? 'is-lost' : ''}`;
      pilEl.className = `bbw-pillar is-${sl.color}`;
      numEl.textContent = sl.tile !== null && sl.tile !== undefined ? String(sl.tile) : '?';
      txtEl.textContent = colorShort(sl.color, lang);
      chpEl.className = `bbw-pillar-chips ${sl.chips < sl.initialChips ? 'is-borrowed' : ''}`;
      chpEl.textContent = String(sl.chips);
    });
  };
  patchSky('opp', opp);
  patchSky('me', me);

  // Patch Central Clash
  const res = clash.resolution;
  const myWonClash = Boolean(res && res.winnerSeatId === viewerId);
  const oppWonClash = Boolean(res && res.winnerSeatId === oppId);

  q('duel-me-lbl').textContent = `${me.name} · #${slotIdx + 1}`;
  q('duel-me-tile').className = `bbw-duel-tile is-${mySlot.color} ${myWonClash ? 'is-winner' : ''}`;
  q('duel-me-num').textContent = mySlot.tile !== null ? String(mySlot.tile) : '?';
  q('duel-me-col').textContent = colorShort(mySlot.color, lang);
  q('duel-me-chips').textContent = `${mySlot.chips} ${lang === 'zh' ? '筹码' : 'CHIPS'}`;

  q('duel-opp-lbl').textContent = `${opp.name} · #${slotIdx + 1}`;
  q('duel-opp-tile').className = `bbw-duel-tile is-${oppSlot.color} ${oppWonClash ? 'is-winner' : ''}`;
  q('duel-opp-num').textContent = oppSlot.tile !== null ? String(oppSlot.tile) : '?';
  q('duel-opp-col').textContent = colorShort(oppSlot.color, lang);
  q('duel-opp-chips').textContent = `${oppSlot.chips} ${lang === 'zh' ? '筹码' : 'CHIPS'}`;

  const cBadge = q('clash-badge');
  const cDesc = q('clash-desc');
  const btnReveal = q('btn-reveal');
  const btnFold = q('btn-fold');
  const btnCall = q('btn-call');
  const btnNext = q('btn-next');
  btnReveal.hidden = true;
  btnFold.hidden = true;
  btnCall.hidden = true;
  btnNext.hidden = true;

  if (isEqualShowdown) {
    cBadge.className = 'tg-badge tg-badge-gold';
    cBadge.textContent = lang === 'zh' ? '双方筹码相同 · 强制摊牌' : 'EQUAL CHIPS · SHOWDOWN';
    cDesc.textContent = lang === 'zh'
      ? `底池 ${clash.higherChips * 2} 枚筹码，双方立即亮出数字比大小`
      : `Pot ${clash.higherChips * 2} chips — reveal both numerals`;
    btnReveal.hidden = isSpectator;
    btnReveal.textContent = lang === 'zh' ? '开牌摊牌' : 'Reveal Showdown';
  } else if (isClashDecision) {
    if (isMyDecision) {
      cBadge.className = 'tg-badge tg-badge-garnet';
      cBadge.textContent = lang === 'zh' ? `筹码较少 · 需补齐 +${clash.deficit}` : `LOWER BET · NEED +${clash.deficit}`;
      cDesc.textContent = clash.canCall
        ? (lang === 'zh' ? `借调跟注争夺 ${clash.higherChips * 2} 筹码底池，或弃牌保密数字` : `Call for ${clash.higherChips * 2}-chip pot, or Fold to hide numeral`)
        : (lang === 'zh' ? '可借调筹码不足，只能选择弃牌' : 'Insufficient chips to borrow — must Fold');
      btnFold.hidden = false;
      btnFold.textContent = lang === 'zh' ? '弃牌' : 'Fold';
      btnCall.hidden = false;
      btnCall.textContent = lang === 'zh' ? `借调跟注 (+${clash.deficit})` : `Call (+${clash.deficit})`;
    } else {
      cBadge.className = 'tg-badge tg-badge-cyan';
      cBadge.textContent = lang === 'zh' ? '对手决策中' : 'RIVAL DECIDING';
      cDesc.textContent = lang === 'zh'
        ? `${opp.name} 筹码少 ${clash.deficit} 枚，正在决定跟注或弃牌...`
        : `${opp.name} is short by ${clash.deficit} — deciding Call or Fold...`;
    }
  } else if (isRoundResult && res) {
    cBadge.className = `tg-badge ${res.isDraw ? 'tg-badge-cyan' : myWonClash ? 'tg-badge-gold' : 'tg-badge-garnet'}`;
    cBadge.textContent = res.type === 'fold'
      ? (lang === 'zh' ? '弃牌结算 · 数字保密' : 'FOLDED · TILES HIDDEN')
      : res.isDraw
      ? (lang === 'zh' ? '摊牌平局 · 退还筹码' : 'SHOWDOWN DRAW')
      : myWonClash
      ? (lang === 'zh' ? `你赢下 +${res.pot} 枚筹码！` : `YOU WON +${res.pot} CHIPS!`)
      : (lang === 'zh' ? `${opp.name} 赢走 ${res.pot} 枚` : `${opp.name} WON ${res.pot}`);
    cDesc.textContent = '';
    btnNext.hidden = isSpectator;
    btnNext.textContent = lang === 'zh' ? `进入第 ${state.round + 1} 槽位 →` : `Next Slot #${state.round + 1} →`;
  } else {
    cBadge.className = 'tg-badge tg-badge-gold';
    cBadge.textContent = lang === 'zh' ? '10 轮终局' : 'ALL 10 SLOTS COMPLETE';
    cDesc.textContent = '';
  }

  patchBorrowDrawerInPlace(container);
}

mountGame({
  config: {
    id: 'betting-black-and-white',
    title: { zh: '下注黑与白', en: 'Betting! Black and White', ko: '베팅! 흑과 백' },
    seasons: ['S3', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'timedMode',
        label: { zh: '启用 35 秒决策计时', en: '35s Decision Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 对决目标
《黑与白》的终极筹码进化版（S3E11 吴贤旻 vs 崔连胜名局）！双方各有 **0–9 共 10 张数字砖**（黑=偶 \`0,2,4,6,8\`，白=奇 \`1,3,5,7,9\`）与 **30 枚筹码**，10 轮结束后拥有**更多筹码**者胜！

### 第一阶段：屏风后秘密布阵
- 将全部 10 张砖排入 **#1 至 #10 槽位**。
- 将全部 **30 枚筹码** 分配到 10 个槽位（每槽至少放 **1 枚**）。

### 第二阶段：撤下屏风 · 逐轮摊牌或借调跟注
- 双方布阵完成后撤下屏风：**10 个槽位的黑白颜色与筹码数全部公开**，但所有具体数字保持保密！
- 按 #1 → #10 逐轮对决：
  - **筹码相同**：立即开牌亮底！数字大者赢走双方筹码进入安全储备库；平局各自收回筹码。
  - **筹码不同**：筹码较少的一方必须二选一：
    1. **弃牌 (FOLD)**：不亮出双方数字，直接将本轮己方筹码让给对手！
    2. **跟注 (CALL)**：从**已赢储备库**或**后续未赛槽位（#k+1..#10，每槽须至少保留 1 枚）**借调差额补齐后，双方亮牌比大小，胜者通吃全部底池！`,
      en: `### Objective
The high-stakes S3E11 evolution of Black & White! Each contestant gets **10 tiles (0–9)** (Black=Even \`0,2,4,6,8\`, White=Odd \`1,3,5,7,9\`) and **30 chips**. Hold more total chips after 10 rounds to survive!

### Phase 1 — Behind the Partition
- Arrange all 10 tiles (0–9) into **Slots #1–#10**.
- Allocate all **30 chips** across the 10 slots (minimum **1 chip** per slot).

### Phase 2 — Partition Drop & 10 Clashes
- The screen lifts! All 10 **Black/White colors** and **chip stacks** are revealed publicly, while all numerals stay hidden!
- For each Slot #1 → #10:
  - **Equal Chips**: Instant Showdown! Both numerals flip publicly; higher numeral wins the pot into their Reserve Bank (tie splits).
  - **Unequal Chips**: The lower bettor chooses:
    1. **FOLD**: Surrender your slot's chips immediately — **neither numeral is revealed!**
    2. **CALL**: Borrow the chip difference from your **Reserve Bank** and/or **future slots** (every future slot must keep at least 1 chip!), then flip both numerals for the matched pot!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderStage,
});

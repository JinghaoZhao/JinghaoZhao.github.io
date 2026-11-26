import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import { GameRules, evaluateBoard } from './rules.js';

const GROOVE_META = {
  1: { nameZh: '圆弧', nameEn: 'Arc', color: '#f59e0b' },
  2: { nameZh: '方榫', nameEn: 'Square', color: '#38bdf8' },
  3: { nameZh: '双齿', nameEn: 'Twin', color: '#a78bfa' },
  4: { nameZh: '斜楔', nameEn: 'Chevron', color: '#34d399' },
  5: { nameZh: '阶锁', nameEn: 'Step', color: '#fb7185' },
};

/**
 * Build an edge path segment from (x0,y0) to (x1,y1) given signed groove val (-5..+5).
 */
function edgeSegmentPath(x0, y0, x1, y1, val) {
  if (!val) return `L ${x1} ${y1}`;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = dy / len;
  const ny = -dx / len;
  const s = val > 0 ? 1 : -1;
  const kind = Math.abs(val);
  const pt = (t, n) => `${(x0 + dx * t + nx * n * s).toFixed(1)} ${(y0 + dy * t + ny * n * s).toFixed(1)}`;

  if (kind === 1) return `L ${pt(0.32, 0)} Q ${pt(0.5, 16)} ${pt(0.68, 0)} L ${x1} ${y1}`;
  if (kind === 2) return `L ${pt(0.34, 0)} L ${pt(0.34, 13)} L ${pt(0.66, 13)} L ${pt(0.66, 0)} L ${x1} ${y1}`;
  if (kind === 3) {
    return `L ${pt(0.26, 0)} L ${pt(0.26, 11)} L ${pt(0.41, 11)} L ${pt(0.41, 3)} L ${pt(0.59, 3)} L ${pt(0.59, 11)} L ${pt(0.74, 11)} L ${pt(0.74, 0)} L ${x1} ${y1}`;
  }
  if (kind === 4) return `L ${pt(0.30, 0)} L ${pt(0.50, 14)} L ${pt(0.70, 0)} L ${x1} ${y1}`;
  return `L ${pt(0.26, 0)} L ${pt(0.26, 7)} L ${pt(0.38, 7)} L ${pt(0.38, 14)} L ${pt(0.62, 14)} L ${pt(0.62, 7)} L ${pt(0.74, 7)} L ${pt(0.74, 0)} L ${x1} ${y1}`;
}

/**
 * Render an intricately grooved metallic Devil's Piece SVG using its baseEdges (rot=0)
 * inside a keyed `.pp-piece-rotator` driven by monotonic cumulative CSS rotation (`rotDeg`).
 * Inner glyph/code counter-rotates so text stays upright while the brass piece spins smoothly!
 */
function renderPieceSvg(piece, cumDeg, opts = {}) {
  const edges = piece.baseEdges;
  const pad = 18;
  const x0 = pad, y0 = pad, x1 = 120 - pad, y1 = 120 - pad;
  const d = [
    `M ${x0} ${y0}`,
    edgeSegmentPath(x0, y0, x1, y0, edges[0]),
    edgeSegmentPath(x1, y0, x1, y1, edges[1]),
    edgeSegmentPath(x1, y1, x0, y1, edges[2]),
    edgeSegmentPath(x0, y1, x0, y0, edges[3]),
    'Z',
  ].join(' ');

  const gradId = `pp-g-${piece.id}-${opts.uid || 'm'}`;
  const isError = Boolean(opts.isError);
  const isLocked = Boolean(opts.isLocked);
  const key = opts.motionKey || `piece-${opts.uid || 'm'}-${piece.id}`;

  const pipCoords = [
    { x: 60, y: 24, v: edges[0] },
    { x: 96, y: 60, v: edges[1] },
    { x: 60, y: 96, v: edges[2] },
    { x: 24, y: 60, v: edges[3] },
  ];
  const pips = pipCoords
    .filter((p) => p.v !== 0)
    .map((p) => {
      const meta = GROOVE_META[Math.abs(p.v)];
      const fill = p.v > 0 ? meta.color : 'var(--pp-piece-hollow)';
      return `<circle cx="${p.x}" cy="${p.y}" r="3.4" fill="${fill}" stroke="${meta.color}" stroke-width="1.5" opacity="0.94"/>`;
    })
    .join('');

  const strokeColor = isError ? 'var(--dp-crimson-bright)' : isLocked ? 'var(--dp-emerald)' : 'var(--dp-brass)';

  return `
    <div class="pp-piece-rotator" data-motion-key="${key}" style="transform: rotate(${cumDeg}deg);">
      <svg class="pp-piece-svg" viewBox="0 0 120 120" aria-label="Piece ${piece.code}">
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${isLocked ? 'var(--pp-piece-grad-a-locked)' : 'var(--pp-piece-grad-a)'}" />
            <stop offset="52%" stop-color="var(--pp-piece-grad-b)" />
            <stop offset="100%" stop-color="var(--pp-piece-grad-c)" />
          </linearGradient>
        </defs>
        <path d="${d}" fill="url(#${gradId})" stroke="${strokeColor}" stroke-width="${isLocked ? 2.4 : 1.9}" stroke-linejoin="round" />
        <rect x="33" y="33" width="54" height="54" rx="7" fill="none" stroke="var(--dp-border)" stroke-width="1" />
        <g class="pp-piece-label-upright" style="transform: rotate(${-cumDeg}deg);">
          <text x="60" y="57" text-anchor="middle" dominant-baseline="central" fill="var(--pp-piece-ink)" font-family="Cinzel, serif" font-size="18" font-weight="700">${piece.glyph}</text>
          <text x="60" y="76" text-anchor="middle" fill="var(--pp-piece-sub)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${piece.code}</text>
        </g>
        ${pips}
      </svg>
    </div>
  `;
}

// Persistent local UI state (never wiped on AI ticks or state patches!)
let selected = null; // { source: 'tray', pieceId } | { source: 'slot', slotIndex }
let dragPayload = null;
let lockoutTickTimer = null;
let lastLockoutSeen = 0;
let lastSolvedCount = 0;
let currentMatchId = 0;
let latestCtx = null;

// Monotonic cumulative rotation degrees per pieceId (so 270 -> 0 spins smoothly to 360!)
const pieceCumDeg = new Map();
const pieceLastRot = new Map();

function syncPieceDeg(pieceId, rot) {
  const r = ((rot % 4) + 4) % 4;
  if (!pieceLastRot.has(pieceId)) {
    pieceLastRot.set(pieceId, r);
    pieceCumDeg.set(pieceId, r * 90);
    return r * 90;
  }
  const prevR = pieceLastRot.get(pieceId);
  if (prevR !== r) {
    const delta = (r - prevR + 4) % 4;
    const nextDeg = (pieceCumDeg.get(pieceId) || 0) + delta * 90;
    pieceLastRot.set(pieceId, r);
    pieceCumDeg.set(pieceId, nextDeg);
    return nextDeg;
  }
  return pieceCumDeg.get(pieceId) || 0;
}

function getCanAct(ctx) {
  if (!ctx) return false;
  const { state } = ctx;
  const board = state.myBoard;
  const ended = state.phase === 'ended';
  const lockoutRemMs = board ? Math.max(0, (board.lockoutUntilMs || 0) - Date.now()) : 0;
  return Boolean(board && !board.finished && !ended && lockoutRemMs <= 0);
}

function ensureDelegation(container) {
  const doRotateSelected = async () => {
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx) || !selected) return;
    ctx.sfx.play('click');
    if (selected.source === 'tray') {
      await ctx.dispatch({ type: 'ROTATE_TRAY', payload: { pieceId: selected.pieceId } });
    } else {
      await ctx.dispatch({ type: 'ROTATE_SLOT', payload: { slotIndex: selected.slotIndex } });
    }
  };

  Motion.delegate(container, 'click', '#pp-btn-rotate', () => {
    doRotateSelected();
  }, 'pp-rot');

  Motion.delegate(container, 'click', '#pp-btn-remove', async () => {
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx) || selected?.source !== 'slot') return;
    ctx.sfx.play('click');
    const idx = selected.slotIndex;
    selected = null;
    await ctx.dispatch({ type: 'REMOVE_PIECE', payload: { slotIndex: idx } });
  }, 'pp-rm');

  Motion.delegate(container, 'click', '#pp-btn-clear', async () => {
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx)) return;
    ctx.sfx.play('click');
    selected = null;
    await ctx.dispatch({ type: 'CLEAR_BOARD', payload: {} });
  }, 'pp-clr');

  Motion.delegate(container, 'click', '#pp-btn-verify', async () => {
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx)) return;
    ctx.sfx.play('bid');
    await ctx.dispatch({ type: 'VERIFY_LOCK', payload: {} });
  }, 'pp-verify');

  Motion.delegate(container, 'click', '#pp-btn-giveup', async () => {
    const ctx = latestCtx;
    if (!ctx) return;
    const isZh = ctx.lang === 'zh';
    const ok = await ctx.ui.confirm(
      isZh ? '确认放弃挑战？' : 'Surrender Challenge?',
      isZh ? '将结束当前挑战并揭晓正确拼法。' : 'This ends the match and reveals the solution.'
    );
    if (ok) await ctx.dispatch({ type: 'GIVE_UP', payload: {} });
  }, 'pp-giveup');

  Motion.delegate(container, 'click', '[data-tray-piece]', async (e, el) => {
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx)) return;
    const pid = Number(el.dataset.trayPiece);
    const activeSlots = ctx.state.myBoard?.slots || [];
    if (activeSlots.some((s) => s && s.pieceId === pid)) return;
    ctx.sfx.play('click');
    if (selected?.source === 'tray' && selected.pieceId === pid) {
      await ctx.dispatch({ type: 'ROTATE_TRAY', payload: { pieceId: pid } });
    } else {
      selected = { source: 'tray', pieceId: pid };
      renderPiecePuzzle(container, ctx);
    }
  }, 'pp-tray-click');

  Motion.delegate(container, 'contextmenu', '[data-tray-piece]', async (e, el) => {
    e.preventDefault();
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx)) return;
    const pid = Number(el.dataset.trayPiece);
    const activeSlots = ctx.state.myBoard?.slots || [];
    if (activeSlots.some((s) => s && s.pieceId === pid)) return;
    ctx.sfx.play('click');
    selected = { source: 'tray', pieceId: pid };
    await ctx.dispatch({ type: 'ROTATE_TRAY', payload: { pieceId: pid } });
  }, 'pp-tray-ctx');

  Motion.delegate(container, 'dragstart', '[data-tray-piece]', (e, el) => {
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx)) return;
    const pid = Number(el.dataset.trayPiece);
    const activeSlots = ctx.state.myBoard?.slots || [];
    if (activeSlots.some((s) => s && s.pieceId === pid)) return;
    dragPayload = { source: 'tray', pieceId: pid };
    selected = { source: 'tray', pieceId: pid };
  }, 'pp-tray-drag');

  Motion.delegate(container, 'click', '[data-slot]', async (e, el) => {
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx)) return;
    const slotIdx = Number(el.dataset.slot);
    const activeSlots = ctx.state.myBoard?.slots || [];
    const existing = activeSlots[slotIdx];

    if (!selected) {
      if (existing) {
        ctx.sfx.play('click');
        selected = { source: 'slot', slotIndex: slotIdx };
        renderPiecePuzzle(container, ctx);
      }
      return;
    }

    if (selected.source === 'tray') {
      const pid = selected.pieceId;
      selected = { source: 'slot', slotIndex: slotIdx };
      ctx.sfx.play('tilePlace');
      await ctx.dispatch({ type: 'PLACE_PIECE', payload: { pieceId: pid, slotIndex: slotIdx } });
    } else if (selected.source === 'slot') {
      if (selected.slotIndex === slotIdx) {
        ctx.sfx.play('click');
        await ctx.dispatch({ type: 'ROTATE_SLOT', payload: { slotIndex: slotIdx } });
      } else {
        const fromSlot = selected.slotIndex;
        selected = { source: 'slot', slotIndex: slotIdx };
        ctx.sfx.play('tilePlace');
        await ctx.dispatch({ type: 'SWAP_SLOTS', payload: { fromSlot, toSlot: slotIdx } });
      }
    }
  }, 'pp-slot-click');

  Motion.delegate(container, 'contextmenu', '[data-slot]', async (e, el) => {
    e.preventDefault();
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx)) return;
    const slotIdx = Number(el.dataset.slot);
    const activeSlots = ctx.state.myBoard?.slots || [];
    if (!activeSlots[slotIdx]) return;
    ctx.sfx.play('click');
    selected = { source: 'slot', slotIndex: slotIdx };
    await ctx.dispatch({ type: 'ROTATE_SLOT', payload: { slotIndex: slotIdx } });
  }, 'pp-slot-ctx');

  Motion.delegate(container, 'dragstart', '[data-slot]', (e, el) => {
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx)) return;
    const slotIdx = Number(el.dataset.slot);
    if (!ctx.state.myBoard?.slots?.[slotIdx]) return;
    dragPayload = { source: 'slot', slotIndex: slotIdx };
    selected = { source: 'slot', slotIndex: slotIdx };
  }, 'pp-slot-drag');

  Motion.delegate(container, 'dragover', '[data-slot]', (e, el) => {
    if (!latestCtx || !getCanAct(latestCtx) || !dragPayload) return;
    e.preventDefault();
    el.classList.add('is-drop-target');
  }, 'pp-slot-dragover');

  Motion.delegate(container, 'dragleave', '[data-slot]', (e, el) => {
    el.classList.remove('is-drop-target');
  }, 'pp-slot-dragleave');

  Motion.delegate(container, 'drop', '[data-slot]', async (e, el) => {
    e.preventDefault();
    el.classList.remove('is-drop-target');
    const ctx = latestCtx;
    if (!ctx || !getCanAct(ctx) || !dragPayload) return;
    const slotIdx = Number(el.dataset.slot);
    const dp = dragPayload;
    dragPayload = null;
    ctx.sfx.play('tilePlace');
    if (dp.source === 'tray') {
      selected = { source: 'slot', slotIndex: slotIdx };
      await ctx.dispatch({ type: 'PLACE_PIECE', payload: { pieceId: dp.pieceId, slotIndex: slotIdx } });
    } else if (dp.source === 'slot' && dp.slotIndex !== slotIdx) {
      selected = { source: 'slot', slotIndex: slotIdx };
      await ctx.dispatch({ type: 'SWAP_SLOTS', payload: { fromSlot: dp.slotIndex, toSlot: slotIdx } });
    }
  }, 'pp-slot-drop');

  if (!window._ppKeyHandlerBound) {
    window._ppKeyHandlerBound = true;
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        doRotateSelected();
      }
    });
  }
}

function renderPiecePuzzle(container, ctx) {
  latestCtx = ctx;
  ensureDelegation(container);

  const { state, mySeatId, lang, sfx, lastEvent } = ctx;
  const isZh = lang === 'zh';
  const board = state.myBoard;
  const puzzle = state.puzzle;
  const ended = state.phase === 'ended';

  if (state.startedAtMs && state.startedAtMs !== currentMatchId) {
    currentMatchId = state.startedAtMs;
    selected = null;
    dragPayload = null;
    pieceCumDeg.clear();
    pieceLastRot.clear();
  }

  let shouldShakeBoard = false;
  if (lastEvent?.type === 'LOCK_REJECTED' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastLockoutSeen) {
    lastLockoutSeen = lastEvent.ts || Date.now();
    sfx.play('error');
    shouldShakeBoard = true;
  }
  if (state.finishOrder.length > lastSolvedCount) {
    lastSolvedCount = state.finishOrder.length;
    if (state.finishOrder.includes(mySeatId)) sfx.play('victory');
    else sfx.play('reveal');
  }
  if (state.finishOrder.length === 0) lastSolvedCount = 0;

  const activeSlots = board ? board.slots : Array(8).fill(null);
  const ev = evaluateBoard(puzzle, activeSlots);
  const placedIds = new Set(activeSlots.filter(Boolean).map((s) => s.pieceId));
  const pieceMap = new Map(puzzle.pieces.map((p) => [p.id, p]));

  const now = Date.now();
  const lockoutRemMs = board ? Math.max(0, (board.lockoutUntilMs || 0) - now) : 0;
  const isLockedOut = lockoutRemMs > 0 && !ended && !(board && board.finished);

  clearInterval(lockoutTickTimer);
  if (isLockedOut) {
    lockoutTickTimer = setInterval(() => {
      const maskTimer = container.querySelector('#pp-lockout-sec');
      const rem = Math.max(0, (board.lockoutUntilMs || 0) - Date.now());
      if (rem <= 0) {
        clearInterval(lockoutTickTimer);
        const mask = container.querySelector('.pp-lockout-mask');
        if (mask) Motion.exit(mask, { variant: 'fade', remove: true, timeoutMs: 180 });
      } else if (maskTimer) {
        maskTimer.textContent = `${(rem / 1000).toFixed(1)}s`;
      }
    }, 120);
  }

  const totalRacers = state.racers.length;
  const survivalNote = totalRacers === 1
    ? (isZh ? '单人限时挑战 · 拼齐 8 枚互锁过关' : 'Solo Time-Attack · Interlock all 8 pieces')
    : (isZh ? `流放地生存线：前 ${totalRacers - 1} 名存活 · 末位淘汰` : `Exile Cutoff: Top ${totalRacers - 1} Survive · Last Eliminated`);

  const racersHtml = state.racers
    .map((r) => {
      const isMe = r.seatId === mySeatId;
      const cls = [
        'pp-racer-card',
        isMe ? 'is-me' : '',
        r.status === 'survived' ? 'is-survived' : '',
        r.status === 'eliminated' ? 'is-eliminated' : '',
      ].filter(Boolean).join(' ');
      const statText = r.finished && r.finishTimeMs != null
        ? `#${r.rank || '✓'} ${(r.finishTimeMs / 1000).toFixed(1)}s`
        : r.status === 'eliminated'
        ? (isZh ? '已淘汰' : 'ELIM')
        : `${r.progress}%`;
      const ratio = Math.max(0, Math.min(1, r.progress / 100));
      return `
        <div class="${cls}" data-motion-key="racer-${UI.escapeHtml(r.seatId)}">
          <div class="pp-racer-top">
            <span class="pp-racer-name">${UI.escapeHtml(r.avatar)} ${UI.escapeHtml(r.name)}${isMe ? (isZh ? ' (你)' : ' (You)') : ''}</span>
            <span class="pp-racer-stat dp-tabular">${UI.escapeHtml(statText)}</span>
          </div>
          <div class="pp-bar-track"><div class="pp-bar-fill" data-bar-seat="${UI.escapeHtml(r.seatId)}" data-ratio="${ratio.toFixed(4)}" style="transform-origin: left center; transform: scaleX(${ratio.toFixed(4)});"></div></div>
        </div>
      `;
    })
    .join('');

  const hMap = new Map(ev.hStatus.map((h) => [`${h.r}-${h.c}`, h.status]));
  const vMap = new Map(ev.vStatus.map((v) => [`${v.r}-${v.c}`, v.status]));

  const slotsHtml = activeSlots
    .map((entry, idx) => {
      const r = Math.floor(idx / 4);
      const c = idx % 4;
      const isSel = selected?.source === 'slot' && selected.slotIndex === idx;
      const hasPiece = Boolean(entry);
      const piece = hasPiece ? pieceMap.get(entry.pieceId) : null;
      const hasErr = ev.slotErrors[idx];

      const rightSeam = c < 3 ? hMap.get(`${r}-${c}`) : null;
      const bottomSeam = r === 0 ? vMap.get(`0-${c}`) : null;

      const rightBadge = rightSeam && rightSeam !== 'empty'
        ? `<span class="pp-seam-glow is-right ${rightSeam === 'ok' ? 'is-ok' : 'is-bad'}" data-motion-key="rh-${idx}"></span>`
        : '';
      const bottomBadge = bottomSeam && bottomSeam !== 'empty'
        ? `<span class="pp-seam-glow is-bottom ${bottomSeam === 'ok' ? 'is-ok' : 'is-bad'}" data-motion-key="vb-${idx}"></span>`
        : '';

      const frameMarker = (val, posStyle, mkKey) => {
        if (!val) return '';
        const meta = GROOVE_META[Math.abs(val)];
        const isTab = val > 0;
        return `<span data-motion-key="${mkKey}" title="${isZh ? '外框齿槽' : 'Frame groove'}" style="position:absolute;${posStyle}width:10px;height:10px;border-radius:50%;background:${isTab ? meta.color : 'var(--pp-piece-hollow)'};border:2px solid ${meta.color};pointer-events:none;z-index:5;"></span>`;
      };
      const outerMarkers = puzzle.carvedFrame
        ? [
            r === 0 ? frameMarker(puzzle.frame.top[c], 'top:-6px;left:50%;transform:translateX(-50%);', `ft-${c}`) : '',
            r === 1 ? frameMarker(puzzle.frame.bottom[c], 'bottom:-6px;left:50%;transform:translateX(-50%);', `fb-${c}`) : '',
            c === 0 ? frameMarker(puzzle.frame.left[r], 'left:-6px;top:50%;transform:translateY(-50%);', `fl-${r}`) : '',
            c === 3 ? frameMarker(puzzle.frame.right[r], 'right:-6px;top:50%;transform:translateY(-50%);', `fr-${r}`) : '',
          ].join('')
        : '';

      const cls = [
        'pp-slot',
        hasPiece ? 'has-piece' : '',
        isSel ? 'is-selected' : '',
        hasPiece && !hasErr && ev.isSolved ? 'is-all-matched' : '',
        hasPiece && hasErr ? 'has-mismatch' : '',
      ].filter(Boolean).join(' ');

      const pieceInner = hasPiece
        ? renderPieceSvg(piece, syncPieceDeg(piece.id, entry.rot), {
            uid: `s${piece.id}`,
            motionKey: `piece-slot-${piece.id}`,
            isError: hasErr,
            isLocked: ev.isSolved,
          })
        : `<span class="pp-slot-index" data-motion-key="sidx-${idx}">${r + 1}-${c + 1}</span>`;

      return `
        <div class="${cls}" data-motion-key="slot-${idx}" data-slot="${idx}" draggable="${hasPiece && !ended && !(board?.finished) ? 'true' : 'false'}">
          ${pieceInner}
          ${rightBadge}
          ${bottomBadge}
          ${outerMarkers}
        </div>
      `;
    })
    .join('');

  const trayHtml = puzzle.pieces
    .map((pc) => {
      const isPlaced = placedIds.has(pc.id);
      const isSel = selected?.source === 'tray' && selected.pieceId === pc.id;
      const rot = board ? board.trayRotations[pc.id] || 0 : 0;
      const deg = isPlaced ? (pieceCumDeg.get(pc.id) || 0) : syncPieceDeg(pc.id, rot);
      return `
        <div class="pp-tray-card ${isPlaced ? 'is-placed' : ''} ${isSel ? 'is-selected' : ''}"
             data-motion-key="tray-${pc.id}"
             data-tray-piece="${pc.id}"
             draggable="${!isPlaced && !ended && !(board?.finished) ? 'true' : 'false'}">
          ${renderPieceSvg(pc, deg, { uid: `t${pc.id}`, motionKey: `piece-tray-${pc.id}` })}
        </div>
      `;
    })
    .join('');

  const legendChips = Object.entries(GROOVE_META)
    .map(([, m]) => `
      <span class="pp-legend-chip">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${m.color};"></span>
        ${isZh ? m.nameZh : m.nameEn}
      </span>
    `)
    .join('');

  const frameTip = puzzle.carvedFrame
    ? (isZh ? '大师古雕外框：四周边框凹槽同样需要与石台咬合！' : 'Master Carved Frame: Outer edges must also interlock with the stone frame!')
    : (isZh ? '标准石槽：四条平直边朝向石槽外框，内部 10 条凹凸齿缝完全互补咬合。' : 'Standard Frame: Flat edges face the outer border; all 10 interior seams must interlock.');

  const canAct = Boolean(board && !board.finished && !ended && !isLockedOut);

  const html = `
    <div class="pp-root" data-motion-key="pp-root">
      <section class="pp-temple-banner" data-motion-key="pp-banner">
        <div class="pp-race-header">
          <div class="pp-race-title">
            <span class="pp-torch-dot"></span>
            <span>${isZh ? '流放地古殿 · 同步竞速' : 'EXILE TEMPLE · SYNCED SEED RACE'}</span>
          </div>
          <div class="pp-survival-note">${UI.escapeHtml(survivalNote)}</div>
        </div>
        <div class="pp-race-grid" data-motion-key="pp-race-grid">${racersHtml}</div>
      </section>

      ${board?.finished ? `
        <div class="pp-solved-banner dp-enter" data-motion-key="pp-solved">
          <strong>✦ ${isZh ? `机关已解锁！用时 ${(board.finishTimeMs / 1000).toFixed(1)} 秒` : `Mechanism Unlocked in ${(board.finishTimeMs / 1000).toFixed(1)}s!`}</strong>
          <span>${ended ? (isZh ? '对局已结束' : 'Match Complete') : (isZh ? '你已成功存活！正在观看其余流放者竞速...' : 'You survived! Watching remaining Exiles race...')}</span>
        </div>
      ` : ''}

      <div class="pp-main" data-motion-key="pp-main">
        <section class="pp-stone-chamber" id="pp-chamber" data-motion-key="pp-chamber">
          ${isLockedOut ? `
            <div class="pp-lockout-mask" data-motion-key="pp-lockout">
              <strong>${isZh ? '机关咬合失败 · 锁盘冷却' : 'MISMATCH RECOIL · LOCKED'}</strong>
              <div class="pp-lockout-timer dp-tabular" id="pp-lockout-sec">${(lockoutRemMs / 1000).toFixed(1)}s</div>
              <span style="font-size:12.5px;color:var(--pp-lockout-sub);">${isZh ? '检查红色标记齿缝后重新拼接' : 'Inspect crimson seams once cooldown clears'}</span>
            </div>
          ` : ''}

          <div class="pp-chamber-top">
            <span class="dp-badge">${isZh ? '4×2 古铜石槽锁阵' : '4×2 BRONZE STONE LOCK'}</span>
            <span class="pp-seam-meter dp-tabular ${ev.isSolved ? 'is-complete' : ''}">
              ${isZh ? '已放' : 'Placed'} ${ev.placedCount}/8 · ${isZh ? '咬合齿缝' : 'Locked'} ${ev.matchedSeams}/${ev.totalSeams}
            </span>
          </div>

          <div class="pp-board-wrap" id="pp-board-wrap">
            <div class="pp-board-grid" data-motion-key="pp-board-grid">${slotsHtml}</div>
          </div>
          <div class="pp-frame-hint">${UI.escapeHtml(frameTip)}</div>

          <div class="pp-controls">
            <div class="pp-control-group">
              <button type="button" class="dp-btn dp-btn-sm" id="pp-btn-rotate" ${canAct && selected ? '' : 'disabled'}>
                ↻ ${isZh ? '旋转 90° (R)' : 'Rotate 90° (R)'}
              </button>
              <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="pp-btn-remove" ${canAct && selected?.source === 'slot' ? '' : 'disabled'}>
                ↩ ${isZh ? '收回托盘' : 'Return'}
              </button>
              <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="pp-btn-clear" ${canAct && ev.placedCount > 0 ? '' : 'disabled'}>
                ${isZh ? '清空' : 'Clear'}
              </button>
            </div>
            <div class="pp-control-group">
              ${totalRacers === 1 && canAct ? `
                <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="pp-btn-giveup">${isZh ? '放弃' : 'Give Up'}</button>
              ` : ''}
              <button type="button" class="dp-btn dp-btn-primary" id="pp-btn-verify" ${canAct && ev.placedCount === 8 ? '' : 'disabled'}>
                ◆ ${isZh ? '验证咬合机关' : 'Verify Lock'}
              </button>
            </div>
          </div>
        </section>

        <aside class="pp-tray-panel" data-motion-key="pp-tray-panel">
          <div class="pp-tray-heading">
            <span>${isZh ? '8 枚魔鬼碎片' : '8 DEVIL\'S PIECES'}</span>
            <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:11px;color:var(--dp-ink-muted);">${8 - ev.placedCount} ${isZh ? '待放' : 'left'}</span>
          </div>
          <div class="pp-tray-grid" data-motion-key="pp-tray-grid">${trayHtml}</div>

          <div class="pp-legend">
            <div class="pp-legend-title">${isZh ? '齿槽图例（实心凸榫 ↔ 空心凹槽）' : 'Groove Legend (Solid Tab ↔ Hollow Socket)'}</div>
            <div class="pp-legend-row">${legendChips}</div>
            <div style="font-size:11.5px;color:var(--dp-ink-muted);margin-top:2px;">
              ${isZh
                ? '提示：点击碎片选中，点击石槽放入或互换；右键或按 R 顺时针旋转 90°。金色光缝代表咬合成功。'
                : 'Tip: Click or drag pieces into slots; right-click or press R to rotate 90°. Golden seams confirm interlock.'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;

  Motion.patchDOM(container, html);

  container.querySelectorAll('.pp-bar-fill').forEach((bar) => {
    Motion.setProgress(bar, Number(bar.dataset.ratio || 0));
  });

  if (shouldShakeBoard) {
    Motion.shake(container.querySelector('#pp-board-wrap'));
  }
}

mountGame({
  config: {
    id: 'piece-puzzle',
    title: { zh: '碎片拼图', en: 'Piece Puzzle', ko: '피스 퍼즐' },
    category: 'EXILE',
    episode: 'EP 4–5',
    minPlayers: 1,
    maxPlayers: 4,
    defaultPlayers: 4,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'difficulty',
        label: { zh: '石槽边框难度', en: 'Stone Frame' },
        type: 'select',
        default: 'standard',
        choices: [
          { value: 'standard', label: { zh: '标准（平边外框）', en: 'Standard (Flat Frame)' } },
          { value: 'master', label: { zh: '大师（古雕外框）', en: 'Master (Carved Frame)' } },
        ],
      },
      {
        key: 'fastMode',
        label: { zh: '快节奏竞速', en: 'Fast Race' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 流放地赛 01 · 碎片拼图
- 所有流放者获得**完全相同的 8 枚凹槽魔鬼碎片**，竞速将它们严丝合缝嵌合进 4×2 古代石槽。
- 每条边缘具有 5 种不同形状的**凸榫（实心色点）**与**凹槽（空心色环）**；相邻碎片必须形状一致且一凸一凹方能咬合。
- 点击选中碎片后可点击石槽放入/交换，按 **R 键** 或点击旋转按钮顺时针旋转 90°（也可直接拖拽放置）。
- 全部 8 枚拼齐并完美互锁即刻解锁存活；若主动点击「验证机关」但存在错位，将触发 **5 秒锁盘惩罚**！
- **流放存活**：多人局前 \`N-1\` 名存活，最末位永久淘汰。`,
      en: `### Exile Match 1 · Piece Puzzle
- Every Exile receives the **exact same 8 grooved Devil's Pieces** and races to interlock them into the 4×2 temple stone recess.
- Edges carry 5 distinct shapes as **protruding tongues (solid dot)** or **recessed grooves (hollow ring)** — touching edges lock in gold only when matching shapes complement each other.
- Click or drag pieces into slots; press **R** or click **Rotate** to turn 90° clockwise; right-click a placed piece to rotate in place.
- Completing all interlocking seams immediately unlocks survival! Pressing **Verify Mechanism** with any mismatch triggers a **5-second lockout**.
- **Survival Rule**: Top \`N-1\` survive; last place is permanently eliminated.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderPiecePuzzle,
});

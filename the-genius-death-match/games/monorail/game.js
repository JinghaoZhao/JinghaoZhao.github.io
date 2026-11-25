/**
 * Monorail (모노레일 / 单轨铁路) — Persistent-SVG Blueprint Renderer
 * Smooth 90° rail rotations, 220ms viewBox lerp, sliding brush indicator, reduced-motion-safe train.
 */

import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import {
  GameRules,
  INITIAL_SUPPLY,
  keyOf,
  parseKey,
  checkClosedLoop,
  getLegalNextCells,
  rotateShapeCW,
  flipShapeKind,
  suggestAutoShape,
} from './rules.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL = 74;
const HALF = CELL / 2;

let staged = []; // Array<{ x, y, shape, visualAngle, justPlaced? }>
let brushMode = 'auto'; // 'auto' | 'straight' | 'curve'
let lastEventSig = null;
let lastSupplyNum = INITIAL_SUPPLY;
let currentVb = null; // { x, y, w, h }
let vbRafId = null;
let latestCtx = null;
let latestState = null;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function shapeKind(shape) {
  return shape === 'H' || shape === 'V' ? 'straight' : 'curve';
}

function canonicalAngleForShape(shape) {
  switch (shape) {
    case 'H':  return 0;
    case 'V':  return 90;
    case 'NE': return 0;
    case 'SE': return 90;
    case 'SW': return 180;
    case 'NW': return 270;
    default:   return 0;
  }
}

function canonicalRailPath(kind) {
  // Centered at (0,0) inside a tile of size CELL
  const h = HALF - 3;
  if (kind === 'straight') {
    return `M ${-h} 0 L ${h} 0`;
  }
  // Canonical curve 'NE': from N (0, -h) to E (h, 0) via Q(0,0)
  return `M 0 ${-h} Q 0 0 ${h} 0`;
}

function buildClosedLoopMotionPath(path) {
  if (!path || path.length === 0) return '';
  const edgePt = (x, y, dir) => {
    const cx = x * CELL + HALF;
    const cy = y * CELL + HALF;
    if (dir === 'N') return `${cx} ${cy - HALF}`;
    if (dir === 'S') return `${cx} ${cy + HALF}`;
    if (dir === 'W') return `${cx - HALF} ${cy}`;
    return `${cx + HALF} ${cy}`;
  };

  let d = '';
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    const start = edgePt(seg.x, seg.y, seg.enterDir);
    const end = edgePt(seg.x, seg.y, seg.exitDir);
    const cx = seg.x * CELL + HALF;
    const cy = seg.y * CELL + HALF;
    if (i === 0) d += `M ${start} `;
    if (seg.shape === 'H' || seg.shape === 'V') {
      d += `L ${end} `;
    } else {
      d += `Q ${cx} ${cy} ${end} `;
    }
  }
  return d + 'Z';
}

function lerpViewBox(svg, target) {
  if (!svg) return;
  if (vbRafId != null) {
    cancelAnimationFrame(vbRafId);
    vbRafId = null;
  }
  if (!currentVb || Motion.reduced()) {
    currentVb = { ...target };
    svg.setAttribute('viewBox', `${target.x} ${target.y} ${target.w} ${target.h}`);
    return;
  }
  if (
    Math.abs(currentVb.x - target.x) < 0.5 &&
    Math.abs(currentVb.y - target.y) < 0.5 &&
    Math.abs(currentVb.w - target.w) < 0.5 &&
    Math.abs(currentVb.h - target.h) < 0.5
  ) {
    return;
  }
  const start = { ...currentVb };
  const t0 = performance.now();
  const dur = 220;

  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    currentVb = {
      x: start.x + (target.x - start.x) * e,
      y: start.y + (target.y - start.y) * e,
      w: start.w + (target.w - start.w) * e,
      h: start.h + (target.h - start.h) * e,
    };
    svg.setAttribute(
      'viewBox',
      `${currentVb.x.toFixed(1)} ${currentVb.y.toFixed(1)} ${currentVb.w.toFixed(1)} ${currentVb.h.toFixed(1)}`
    );
    if (p < 1) {
      vbRafId = requestAnimationFrame(tick);
    } else {
      vbRafId = null;
    }
  };
  vbRafId = requestAnimationFrame(tick);
}

function mountSkeleton(container) {
  container.dataset.mountedGame = 'monorail';
  container.innerHTML = `
    <div class="mr-arena">
      <div class="mr-proof-banner" id="mr-proof-banner" role="alert" hidden></div>
      <div class="mr-loop-banner" id="mr-loop-banner" hidden></div>

      <div class="mr-blueprint-wrap" id="mr-blueprint-wrap">
        <svg class="mr-svg" id="mr-svg" viewBox="-222 -222 592 444" role="img" aria-label="Monorail track grid">
          <defs>
            <filter id="mr-glow" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g id="mr-grid-layer"></g>
          <g id="mr-ghost-layer"></g>
          <g id="mr-tiles-layer"></g>
          <g id="mr-staged-layer"></g>
          <g id="mr-train-layer"></g>
        </svg>
      </div>

      <div class="mr-console">
        <div class="mr-card">
          <h4 class="mr-card-title">
            <span id="mr-title-supply"></span>
            <span class="tg-badge" id="mr-supply-badge"></span>
          </h4>
          <div class="mr-supply-bar">
            <span class="mr-supply-num" id="mr-supply-num">16</span>
            <span id="mr-supply-sub" style="font-size:12px;color:var(--tg-ink-muted);"></span>
          </div>
          <div class="mr-supply-pips" id="mr-supply-pips">
            ${Array.from({ length: INITIAL_SUPPLY }, (_, i) => `<span class="mr-supply-pip" data-pip="${i}"></span>`).join('')}
          </div>
        </div>

        <div class="mr-card" id="mr-controls-card">
          <h4 class="mr-card-title">
            <span id="mr-title-controls"></span>
            <span class="tg-badge tg-badge-emerald" id="mr-loop-ready-badge" hidden></span>
          </h4>

          <div id="mr-active-controls">
            <div class="mr-palette" id="mr-palette">
              <button type="button" class="mr-brush-btn" data-brush="auto">
                <span style="font-size:16px;">✦</span>
                <span data-brush-label="auto"></span>
              </button>
              <button type="button" class="mr-brush-btn" data-brush="straight">
                <span style="font-size:16px;">━</span>
                <span data-brush-label="straight"></span>
              </button>
              <button type="button" class="mr-brush-btn" data-brush="curve">
                <span style="font-size:16px;">┗</span>
                <span data-brush-label="curve"></span>
              </button>
            </div>

            <div class="mr-btn-stack">
              <div class="mr-btn-row" id="mr-staged-actions-1" hidden>
                <button type="button" class="tg-btn tg-btn-sm" id="mr-btn-rot"></button>
                <button type="button" class="tg-btn tg-btn-sm" id="mr-btn-flip"></button>
              </div>
              <div class="mr-btn-row" id="mr-staged-actions-2" hidden>
                <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="mr-btn-undo"></button>
                <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="mr-btn-clear"></button>
              </div>

              <div id="mr-play-buttons" class="mr-btn-stack">
                <button type="button" class="tg-btn tg-btn-cyan" id="mr-btn-commit"></button>
                <button type="button" class="tg-btn tg-btn-garnet mr-impossible-btn" id="mr-btn-impossible"></button>
              </div>

              <div id="mr-proof-buttons" class="mr-btn-stack" hidden>
                <button type="button" class="tg-btn tg-btn-gold" id="mr-btn-submit-proof"></button>
                <button type="button" class="tg-btn tg-btn-garnet" id="mr-btn-concede"></button>
              </div>
            </div>
          </div>

          <p id="mr-wait-text" style="margin:0;font-size:13px;color:var(--tg-ink-muted);" hidden></p>
        </div>

        <div class="mr-card">
          <h4 class="mr-card-title" id="mr-title-guide"></h4>
          <ul class="mr-hint-list" id="mr-hint-list"></ul>
        </div>
      </div>
    </div>
  `;

  // Bind brush buttons once
  container.querySelectorAll('#mr-palette .mr-brush-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      brushMode = btn.dataset.brush;
      patchControls(container, latestState, latestCtx);
    });
  });

  // Bind staged actions once
  container.querySelector('#mr-btn-rot').addEventListener('click', () => {
    if (staged.length === 0) return;
    SFX.play('click');
    const last = staged[staged.length - 1];
    last.shape = rotateShapeCW(last.shape);
    last.visualAngle += 90;
    patchInteractiveSvgAndControls(container, latestState, latestCtx);
  });

  container.querySelector('#mr-btn-flip').addEventListener('click', () => {
    if (staged.length === 0) return;
    SFX.play('cardFlip');
    const last = staged[staged.length - 1];
    last.shape = flipShapeKind(last.shape);
    last.visualAngle = canonicalAngleForShape(last.shape);
    patchInteractiveSvgAndControls(container, latestState, latestCtx);
  });

  container.querySelector('#mr-btn-undo').addEventListener('click', () => {
    if (staged.length === 0) return;
    SFX.play('click');
    staged.pop();
    patchInteractiveSvgAndControls(container, latestState, latestCtx);
  });

  container.querySelector('#mr-btn-clear').addEventListener('click', () => {
    SFX.play('click');
    staged = [];
    patchInteractiveSvgAndControls(container, latestState, latestCtx);
  });

  container.querySelector('#mr-btn-commit').addEventListener('click', async () => {
    const state = latestState;
    const ctx = latestCtx;
    if (!state || !ctx || staged.length === 0) return;
    const placements = staged.map((s) => ({ x: s.x, y: s.y, shape: s.shape }));
    const res = await ctx.dispatch({ type: 'PLACE_TILES', payload: { placements } });
    if (!res.ok) {
      SFX.play('error');
      Motion.nudgeError(container.querySelector('#mr-controls-card'), { intensity: 'subtle' });
      UI.toast(res.reason || 'Invalid tile placement', 'error');
    } else {
      Motion.pulseConfirm(container.querySelector('#mr-btn-commit'), { tone: 'gold' });
      staged = [];
    }
  });

  container.querySelector('#mr-btn-impossible').addEventListener('click', async () => {
    const state = latestState;
    const ctx = latestCtx;
    if (!state || !ctx) return;
    const lang = ctx.lang;
    const ok = await UI.confirm(
      lang === 'zh' ? '宣告「不可能!」？' : 'Declare "IMPOSSIBLE!"?',
      lang === 'zh'
        ? '宣告后对手将进入证明模式：若对手能用剩余轨砖拼出闭合环路则对手胜，否则你立即获胜！'
        : 'Opponent gets one unlimited turn to prove a closed loop exists. If they fail, you win!'
    );
    if (!ok) return;
    staged = [];
    const res = await ctx.dispatch({ type: 'DECLARE_IMPOSSIBLE' });
    if (!res.ok) {
      SFX.play('error');
      Motion.nudgeError(container.querySelector('#mr-btn-impossible'), { intensity: 'subtle' });
      UI.toast(res.reason || 'Cannot declare Impossible', 'error');
    }
  });

  container.querySelector('#mr-btn-submit-proof').addEventListener('click', async () => {
    const state = latestState;
    const ctx = latestCtx;
    if (!state || !ctx || staged.length === 0) return;
    const placements = staged.map((s) => ({ x: s.x, y: s.y, shape: s.shape }));
    const res = await ctx.dispatch({ type: 'SUBMIT_PROOF', payload: { placements } });
    if (!res.ok) {
      SFX.play('error');
      Motion.nudgeError(container.querySelector('#mr-controls-card'), { intensity: 'subtle' });
      UI.toast(res.reason || 'Proof loop is incomplete', 'error');
    } else {
      staged = [];
    }
  });

  container.querySelector('#mr-btn-concede').addEventListener('click', async () => {
    const state = latestState;
    const ctx = latestCtx;
    if (!state || !ctx) return;
    const lang = ctx.lang;
    const ok = await UI.confirm(
      lang === 'zh' ? '确认无法拼出闭合环路？' : 'Concede Proof Challenge?',
      lang === 'zh' ? '认输将判宣告「不可能!」的一方获胜。' : 'Conceding awards victory to the challenger.'
    );
    if (!ok) return;
    staged = [];
    await ctx.dispatch({ type: 'CONCEDE_PROOF' });
  });
}

function patchControls(container, state, ctx) {
  if (!state || !ctx) return;
  const lang = ctx.lang;
  const isProofMode = state.phase === 'PROOF_CHALLENGE';
  const isMyTurn = state.phase !== 'ended' && !ctx.isSpectator && state.currentTurnSeatId === ctx.activeSeatId;

  const previewTiles = { ...state.tiles };
  for (const s of staged) previewTiles[keyOf(s.x, s.y)] = { type: 'track', shape: s.shape };
  const stagedClosesLoop = staged.length > 0 && checkClosedLoop(previewTiles).isLoop;

  // Supply counter + pips
  const remLeft = state.remainingTiles - staged.length;
  const supplyNumEl = container.querySelector('#mr-supply-num');
  if (lastSupplyNum !== remLeft) {
    Motion.animateNumber(supplyNumEl, lastSupplyNum, remLeft, { duration: 220 });
    lastSupplyNum = remLeft;
  } else {
    supplyNumEl.textContent = String(remLeft);
  }
  const badge = container.querySelector('#mr-supply-badge');
  badge.className = `tg-badge ${isProofMode ? 'tg-badge-garnet' : 'tg-badge-gold'}`;
  badge.textContent = `${remLeft} / ${INITIAL_SUPPLY}`;

  const activeName = state.seats[state.turnOwner]?.name || '';
  container.querySelector('#mr-supply-sub').textContent =
    staged.length > 0
      ? lang === 'zh'
        ? `本回合暂放 ${staged.length} 块`
        : `${staged.length} staged`
      : lang === 'zh'
      ? `行动方：${activeName}`
      : `Turn: ${activeName}`;

  const used = INITIAL_SUPPLY - state.remainingTiles;
  container.querySelectorAll('#mr-supply-pips .mr-supply-pip').forEach((pip, i) => {
    pip.classList.toggle('is-used', i < used);
    pip.classList.toggle('is-staged', i >= used && i < used + staged.length);
  });

  // Loop-ready badge
  const loopReady = container.querySelector('#mr-loop-ready-badge');
  loopReady.hidden = !stagedClosesLoop;
  loopReady.textContent = lang === 'zh' ? '✓ 环路已闭合!' : '✓ LOOP CLOSED!';

  // Active controls vs wait text
  container.querySelector('#mr-active-controls').hidden = !isMyTurn;
  const waitEl = container.querySelector('#mr-wait-text');
  waitEl.hidden = isMyTurn;
  waitEl.textContent =
    state.phase === 'ended'
      ? lang === 'zh'
        ? '本场单轨铁路对决已结束。'
        : 'Monorail Death Match concluded.'
      : lang === 'zh'
      ? `等待 ${activeName} 铺设轨道…`
      : `Waiting for ${activeName}…`;

  if (isMyTurn) {
    const palette = container.querySelector('#mr-palette');
    const brushLabels = {
      auto: lang === 'zh' ? '智能吸附' : 'Auto Snap',
      straight: lang === 'zh' ? '直线轨' : 'Straight',
      curve: lang === 'zh' ? '90°弯道' : '90° Curve',
    };
    let activeBrushBtn = null;
    palette.querySelectorAll('.mr-brush-btn').forEach((b) => {
      const k = b.dataset.brush;
      const isAct = k === brushMode;
      b.classList.toggle('is-active', isAct);
      b.querySelector(`[data-brush-label="${k}"]`).textContent = brushLabels[k];
      if (isAct) activeBrushBtn = b;
    });
    if (activeBrushBtn) {
      requestAnimationFrame(() => Motion.slideIndicator(palette, activeBrushBtn));
    }

    container.querySelector('#mr-staged-actions-1').hidden = staged.length === 0;
    container.querySelector('#mr-staged-actions-2').hidden = staged.length === 0;
    container.querySelector('#mr-btn-rot').textContent = lang === 'zh' ? '↻ 旋转末砖' : '↻ Rotate Last';
    container.querySelector('#mr-btn-flip').textContent = lang === 'zh' ? '⇄ 直/弯翻转' : '⇄ Flip Track';
    container.querySelector('#mr-btn-undo').textContent = lang === 'zh' ? '↶ 撤销 1 块' : '↶ Undo';
    container.querySelector('#mr-btn-clear').textContent = lang === 'zh' ? '✕ 清空暂放' : '✕ Clear';

    container.querySelector('#mr-play-buttons').hidden = isProofMode;
    container.querySelector('#mr-proof-buttons').hidden = !isProofMode;

    const commitBtn = container.querySelector('#mr-btn-commit');
    commitBtn.disabled = staged.length === 0;
    commitBtn.className = `tg-btn ${stagedClosesLoop ? 'tg-btn-gold' : 'tg-btn-cyan'}`;
    commitBtn.textContent = stagedClosesLoop
      ? lang === 'zh'
        ? '🚆 确认闭合 · 绝杀获胜！'
        : '🚆 COMMIT & CLOSE LOOP!'
      : lang === 'zh'
      ? `确认铺设 (${staged.length}/3 块)`
      : `Commit Track (${staged.length}/3)`;

    const impBtn = container.querySelector('#mr-btn-impossible');
    impBtn.disabled = !(state.phase === 'PLAY' && state.remainingTiles < INITIAL_SUPPLY);
    impBtn.textContent = lang === 'zh' ? '⚡ 宣告「不可能!」' : '⚡ DECLARE "IMPOSSIBLE!"';

    const subProofBtn = container.querySelector('#mr-btn-submit-proof');
    subProofBtn.disabled = !stagedClosesLoop;
    subProofBtn.textContent = lang === 'zh' ? '✓ 提交闭合环路证明' : '✓ SUBMIT CLOSED LOOP PROOF';

    container.querySelector('#mr-btn-concede').textContent =
      lang === 'zh' ? '✕ 无法拼出 · 承认不可能' : '✕ CONCEDE (IMPOSSIBLE)';
  }
}

function patchSvgLayers(container, state, ctx) {
  const isProofMode = state.phase === 'PROOF_CHALLENGE';
  const isMyTurn = state.phase !== 'ended' && !ctx.isSpectator && state.currentTurnSeatId === ctx.activeSeatId;
  const lang = ctx.lang;

  const allCoords = [];
  for (const k of Object.keys(state.tiles)) allCoords.push(parseKey(k));
  for (const s of staged) allCoords.push({ x: s.x, y: s.y });

  const legalCells = isMyTurn
    ? getLegalNextCells(state.tiles, state.remainingTiles, staged, isProofMode)
    : new Set();
  for (const lk of legalCells) allCoords.push(parseKey(lk));

  let minX = -2;
  let maxX = 3;
  let minY = -2;
  let maxY = 2;
  for (const pt of allCoords) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  minX -= 1;
  maxX += 1;
  minY -= 1;
  maxY += 1;

  const targetVb = {
    x: minX * CELL,
    y: minY * CELL,
    w: (maxX - minX + 1) * CELL,
    h: (maxY - minY + 1) * CELL,
  };
  lerpViewBox(container.querySelector('#mr-svg'), targetVb);

  // 1. Grid lines
  const gridLayer = container.querySelector('#mr-grid-layer');
  gridLayer.textContent = '';
  for (let gx = minX; gx <= maxX + 1; gx++) {
    gridLayer.appendChild(
      svgEl('line', { class: 'mr-grid-line', x1: gx * CELL, y1: targetVb.y, x2: gx * CELL, y2: targetVb.y + targetVb.h })
    );
  }
  for (let gy = minY; gy <= maxY + 1; gy++) {
    gridLayer.appendChild(
      svgEl('line', { class: 'mr-grid-line', x1: targetVb.x, y1: gy * CELL, x2: targetVb.x + targetVb.w, y2: gy * CELL })
    );
  }

  // 2. Ghost legal placement cells
  const ghostLayer = container.querySelector('#mr-ghost-layer');
  ghostLayer.textContent = '';
  if (isMyTurn) {
    for (const lk of legalCells) {
      const { x, y } = parseKey(lk);
      const g = svgEl('g', { class: 'mr-ghost-cell' });
      g.appendChild(
        svgEl('rect', { class: 'mr-ghost-rect', x: x * CELL + 5, y: y * CELL + 5, width: CELL - 10, height: CELL - 10, rx: 10 })
      );
      const plus = svgEl('text', { class: 'mr-ghost-plus', x: x * CELL + HALF, y: y * CELL + HALF + 6, 'text-anchor': 'middle' });
      plus.textContent = '+';
      g.appendChild(plus);
      g.addEventListener('click', () => {
        const shape = suggestAutoShape(state.tiles, staged, x, y, brushMode === 'auto' ? null : brushMode);
        SFX.play('tilePlace');
        staged.push({ x, y, shape, visualAngle: canonicalAngleForShape(shape), justPlaced: true });
        patchInteractiveSvgAndControls(container, latestState, latestCtx);
      });
      ghostLayer.appendChild(g);
    }
  }

  // 3. Committed tiles (keyed by coord — never recreate existing stations/tracks unless needed!)
  const tilesLayer = container.querySelector('#mr-tiles-layer');
  const existingNodes = new Map();
  tilesLayer.querySelectorAll('[data-tile-key]').forEach((el) => {
    existingNodes.set(el.dataset.tileKey, el);
  });
  const lastSet = new Set(state.lastBatchKeys || []);

  // Remove stale tiles (e.g. on rematch)
  for (const [k, el] of existingNodes.entries()) {
    if (!state.tiles[k]) {
      el.remove();
      existingNodes.delete(k);
    }
  }

  for (const [k, tile] of Object.entries(state.tiles)) {
    const isStation = tile.type === 'station';
    const isLast = lastSet.has(k);
    let g = existingNodes.get(k);

    if (!g) {
      const { x, y } = parseKey(k);
      const cx = x * CELL + HALF;
      const cy = y * CELL + HALF;
      const kind = shapeKind(tile.shape);
      const angle = canonicalAngleForShape(tile.shape);
      const d = canonicalRailPath(kind);
      const bgCls = isStation ? 'mr-tile-station-bg' : tile.placedBy === 0 ? 'mr-tile-p0-bg' : 'mr-tile-p1-bg';
      const railCol = isStation ? '#d91b3a' : tile.placedBy === 0 ? '#d99124' : '#0284c7';

      g = svgEl('g', { 'data-tile-key': k, transform: `translate(${cx}, ${cy})` });
      g.appendChild(
        svgEl('rect', {
          class: `mr-tile-bg ${bgCls}`,
          x: -(HALF - 3), y: -(HALF - 3), width: CELL - 6, height: CELL - 6, rx: 10,
          'stroke-width': isStation || isLast ? 2.2 : 1.4,
        })
      );
      const railG = svgEl('g', { transform: `rotate(${angle})` });
      railG.appendChild(svgEl('path', { d, fill: 'none', stroke: 'rgba(0,0,0,0.45)', 'stroke-width': 16 }));
      railG.appendChild(svgEl('path', { d, fill: 'none', stroke: railCol, 'stroke-width': 9, 'stroke-dasharray': '4 6', opacity: 0.45 }));
      railG.appendChild(svgEl('path', { d, fill: 'none', stroke: railCol, 'stroke-width': 5.5, 'stroke-linecap': 'round', filter: 'url(#mr-glow)' }));
      railG.appendChild(svgEl('path', { d, fill: 'none', stroke: '#fff9e6', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.85 }));
      g.appendChild(railG);

      if (isStation) {
        g.appendChild(svgEl('rect', { class: 'mr-station-badge', x: -24, y: -10, width: 48, height: 20, rx: 6 }));
        const stTxt = svgEl('text', { class: 'mr-station-text', x: 0, y: 3.5, 'text-anchor': 'middle' });
        stTxt.textContent = lang === 'zh' ? '车站' : 'STN';
        g.appendChild(stTxt);
      }
      tilesLayer.appendChild(g);
    } else {
      const rect = g.querySelector('.mr-tile-bg');
      if (rect) rect.setAttribute('stroke-width', isStation || isLast ? '2.2' : '1.4');
      if (isStation) {
        const txt = g.querySelector('.mr-station-text');
        if (txt) txt.textContent = lang === 'zh' ? '车站' : 'STN';
      }
    }
  }

  // 4. Staged tiles — KEEP persistent `<g>` by coordinate so clicking smoothly rotates inner rail by 90°!
  const stagedLayer = container.querySelector('#mr-staged-layer');
  const existingStaged = new Map();
  stagedLayer.querySelectorAll('[data-staged-key]').forEach((el) => {
    existingStaged.set(el.dataset.stagedKey, el);
  });
  const activeStagedKeys = new Set(staged.map((s) => keyOf(s.x, s.y)));
  for (const [k, el] of existingStaged.entries()) {
    if (!activeStagedKeys.has(k)) {
      el.remove();
      existingStaged.delete(k);
    }
  }

  staged.forEach((st, idx) => {
    const k = keyOf(st.x, st.y);
    const kind = shapeKind(st.shape);
    const d = canonicalRailPath(kind);
    let g = existingStaged.get(k);

    if (!g) {
      const cx = st.x * CELL + HALF;
      const cy = st.y * CELL + HALF;
      g = svgEl('g', {
        class: 'mr-staged-tile',
        'data-staged-key': k,
        transform: `translate(${cx}, ${cy})`,
      });
      const popWrap = svgEl('g', { class: st.justPlaced ? 'mr-staged-pop' : '' });
      popWrap.appendChild(
        svgEl('rect', {
          class: 'mr-tile-staged-bg',
          x: -(HALF - 3), y: -(HALF - 3), width: CELL - 6, height: CELL - 6, rx: 10, 'stroke-width': 2.3,
        })
      );
      const railRot = svgEl('g', { class: 'mr-rail-rotator' });
      railRot.style.transform = `rotate(${st.visualAngle}deg)`;
      railRot.dataset.kind = kind;
      railRot.appendChild(svgEl('path', { class: 'mr-r-shadow', d, fill: 'none', stroke: 'rgba(0,0,0,0.45)', 'stroke-width': 15 }));
      railRot.appendChild(svgEl('path', { class: 'mr-r-main', d, fill: 'none', stroke: '#0ea5e9', 'stroke-width': 5.5, 'stroke-linecap': 'round', filter: 'url(#mr-glow)' }));
      railRot.appendChild(svgEl('path', { class: 'mr-r-core', d, fill: 'none', stroke: '#e0faff', 'stroke-width': 2, 'stroke-linecap': 'round' }));
      popWrap.appendChild(railRot);

      popWrap.appendChild(svgEl('circle', { class: 'mr-rot-badge-bg', cx: HALF - 13, cy: -(HALF - 13), r: 8 }));
      const rt = svgEl('text', { class: 'mr-rot-badge-txt', x: HALF - 13, y: -(HALF - 16.5), 'text-anchor': 'middle' });
      rt.textContent = '↻';
      popWrap.appendChild(rt);

      g.appendChild(popWrap);
      g.addEventListener('click', () => {
        const curIdx = staged.findIndex((item) => keyOf(item.x, item.y) === k);
        if (curIdx === -1) return;
        SFX.play('click');
        staged[curIdx].shape = rotateShapeCW(staged[curIdx].shape);
        staged[curIdx].visualAngle += 90;
        patchInteractiveSvgAndControls(container, latestState, latestCtx);
      });
      stagedLayer.appendChild(g);
      st.justPlaced = false;
    } else {
      const railRot = g.querySelector('.mr-rail-rotator');
      if (railRot) {
        if (railRot.dataset.kind !== kind) {
          railRot.dataset.kind = kind;
          railRot.querySelectorAll('path').forEach((p) => p.setAttribute('d', d));
        }
        railRot.style.transform = `rotate(${st.visualAngle}deg)`;
      }
    }
    void idx;
  });

  // 5. Completed Closed-Loop Train Layer (gates <animateMotion> cleanly off under Motion.reduced()!)
  const trainLayer = container.querySelector('#mr-train-layer');
  if (state.completedLoopPath && state.completedLoopPath.length >= 6) {
    const trainSig = `${state.completedLoopPath.length}-${Motion.reduced() ? 'red' : 'anim'}`;
    if (trainLayer.dataset.sig !== trainSig) {
      trainLayer.dataset.sig = trainSig;
      const loopD = buildClosedLoopMotionPath(state.completedLoopPath);
      const dur = Math.max(2.6, state.completedLoopPath.length * 0.28).toFixed(2);
      if (Motion.reduced()) {
        // Static high-contrast highlight marker on station exit when reduced-motion is enabled
        const s0 = state.completedLoopPath[0];
        const mx = s0.x * CELL + HALF;
        const my = s0.y * CELL + HALF;
        trainLayer.innerHTML = `
          <path d="${loopD}" fill="none" stroke="#e4b95b" stroke-width="4" opacity="0.7" />
          <circle cx="${mx}" cy="${my}" r="9" fill="#d91b3a" stroke="#fff6d9" stroke-width="2.5" />
        `;
      } else {
        trainLayer.innerHTML = `
          <path d="${loopD}" fill="none" stroke="#fff0c2" stroke-width="4" opacity="0.6" filter="url(#mr-glow)" />
          <g>
            <circle r="9" fill="#ff2e54" stroke="#fff6d9" stroke-width="2.5">
              <animateMotion dur="${dur}s" repeatCount="indefinite" path="${loopD}" />
            </circle>
            <circle r="5" fill="#fff6d9" opacity="0.9">
              <animateMotion dur="${dur}s" begin="-0.12s" repeatCount="indefinite" path="${loopD}" />
            </circle>
            <circle r="3.5" fill="#e4b95b" opacity="0.7">
              <animateMotion dur="${dur}s" begin="-0.24s" repeatCount="indefinite" path="${loopD}" />
            </circle>
          </g>
        `;
      }
    }
  } else {
    trainLayer.textContent = '';
    delete trainLayer.dataset.sig;
  }
}

function patchInteractiveSvgAndControls(container, state, ctx) {
  patchSvgLayers(container, state, ctx);
  patchControls(container, state, ctx);
}

mountGame({
  config: {
    id: 'monorail',
    title: { zh: '单轨铁路', en: 'Monorail', ko: '모노레일' },
    seasons: ['S3', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: false,
    rulesSummary: {
      zh: `### 单轨铁路（S3E10 · S4E6 · 改编自《威尼斯连线》）
开局中央放置 2 块相邻车站砖，双方共享 16 块双面轨道砖（正面直线 / 背面 90° 弯道，可任意旋转）。

### 回合行动（二选一）
1. **铺设 1–3 块轨道砖**：
   - 至少 1 块须紧邻已有砖块。
   - 若单回合放 2–3 块，**必须沿同一行或同一列连续排成一条直线**。
   - 放下最后一块，使场上**所有已放砖块（含车站，无任何多余废砖或断头）**连成一条单一闭合环路，立即获胜！
2. **宣告「不可能!」(IMPOSSIBLE!)**：
   - 若你判断用剩余砖块**绝无可能**拼出合法闭合环路，可放弃放砖直接点击「不可能!」。
   - 对手立即进入**证明模式**，可无限制放置剩余砖块试图闭合环路：对手拼出则对手胜；对手拼不出或认输，则宣告者获胜！`,
      en: `### Monorail (S3E10 · S4E6 · Venice Connection)
Start with 2 adjacent Station tiles and a shared supply of 16 double-sided Track Tiles (Straight / 90° Curve).

### Turn Action (Choose One)
1. **Lay 1–3 Track Tiles**:
   - At least one new tile must touch an existing tile orthogonally.
   - Placing 2 or 3 tiles in one turn must form a **contiguous straight row or column**.
   - If EVERY tile on the board forms **ONE single continuous closed loop** (no stray tiles, no open ends), YOU WIN IMMEDIATELY!
2. **Declare "IMPOSSIBLE!"**:
   - Assert that NO valid single closed loop incorporating all placed tiles can be completed with the remaining supply.
   - Your opponent enters **Proof Mode** with unlimited placements: if they complete a valid loop they win; otherwise YOU win!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, lang, lastEvent, setTelemetry } = ctx;
    if (!state) return;

    latestCtx = ctx;
    latestState = state;

    const firstMount = container.dataset.mountedGame !== 'monorail';
    if (firstMount) {
      mountSkeleton(container);
      currentVb = null;
      lastSupplyNum = state.remainingTiles;
    }

    if (lastEvent && lastEvent !== lastEventSig) {
      lastEventSig = lastEvent;
      if (lastEvent.type === 'LOOP_CLOSED' || lastEvent.type === 'PROOF_SUCCEEDED') {
        SFX.play('combo');
      } else if (lastEvent.type === 'IMPOSSIBLE_DECLARED') {
        SFX.play('clash');
      } else if (lastEvent.type === 'IMPOSSIBLE_WON') {
        SFX.play('garnetClink');
      } else if (lastEvent.type === 'TILES_PLACED') {
        SFX.play('tilePlace');
      }
      staged = [];
    }

    setTelemetry({
      round: state.round,
      phase: {
        zh: `${state.phaseLabel.zh} · 余 ${state.remainingTiles} 砖`,
        en: `${state.phaseLabel.en} · ${state.remainingTiles} Left`,
      },
    });

    const isProofMode = state.phase === 'PROOF_CHALLENGE';
    const isMyTurn = state.phase !== 'ended' && !ctx.isSpectator && state.currentTurnSeatId === ctx.activeSeatId;
    if (!isMyTurn) staged = [];

    // Banners via interruptible presence
    const proofBanner = container.querySelector('#mr-proof-banner');
    if (isProofMode) {
      const challenger = state.seats[state.challengerOwner]?.name || '';
      const prover = state.seats[state.turnOwner]?.name || '';
      proofBanner.textContent =
        lang === 'zh'
          ? `🚨 【不可能挑战！】${challenger} 宣告环路无解！请 ${prover} 用剩余 ${state.remainingTiles} 块砖拼出单一闭合环路以反证！`
          : `🚨 IMPOSSIBLE CHALLENGE! ${challenger} declared no valid loop exists! ${prover} must build a valid loop using the remaining ${state.remainingTiles} tiles!`;
    }
    Motion.transitionPresence(proofBanner, isProofMode, { preset: 'pill' });

    const loopBanner = container.querySelector('#mr-loop-banner');
    const showLoop = Boolean(state.completedLoopPath && !isProofMode);
    if (showLoop) {
      loopBanner.textContent =
        lang === 'zh'
          ? `🚆 单轨闭合环路已贯通！（共 ${state.completedLoopPath.length} 节轨道）`
          : `🚆 CLOSED MONORAIL LOOP COMPLETE! (${state.completedLoopPath.length} segments)`;
    }
    Motion.transitionPresence(loopBanner, showLoop, { preset: 'pill' });

    container.querySelector('#mr-blueprint-wrap').classList.toggle('is-proof', isProofMode);

    // Static localized headings
    container.querySelector('#mr-title-supply').textContent = lang === 'zh' ? '剩余轨砖储备' : 'Track Tile Supply';
    container.querySelector('#mr-title-controls').textContent = lang === 'zh' ? '工程控制台' : 'Track Controls';
    container.querySelector('#mr-title-guide').textContent = lang === 'zh' ? '操作提示' : 'Quick Guide';

    const hintList = container.querySelector('#mr-hint-list');
    if (hintList.dataset.lang !== lang) {
      hintList.dataset.lang = lang;
      hintList.innerHTML =
        lang === 'zh'
          ? `<li>点击青色虚线格放置暂放轨砖（最多 3 块且须连成直线）。</li>
             <li>再次点击已暂放的青色轨砖即可顺时针旋转 90°。</li>
             <li>发现死局或奇偶悖论时，按下「不可能!」逼对手证明。</li>`
          : `<li>Click cyan dashed cells to place 1–3 collinear track tiles.</li>
             <li>Click any staged cyan tile to rotate it 90° clockwise.</li>
             <li>Spot a dead-end or parity trap? Call "IMPOSSIBLE!" to force proof.</li>`;
    }

    patchInteractiveSvgAndControls(container, state, ctx);
  },
});

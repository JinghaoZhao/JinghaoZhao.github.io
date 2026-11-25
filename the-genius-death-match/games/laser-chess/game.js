/**
 * Laser Chess (레이저 장기 / 激光象棋) — Persistent-SVG Optical Arena
 * Smooth 180ms piece glides, 160ms shortest-path 90° rotations, 260ms SVG beam sweep + shatter burst,
 * in-place Sightline preview toggle, and full Dark & Light theme contrast!
 */

import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import {
  GameRules,
  PIECE_INFO,
  traceLaser,
  getLegalMovesForPiece,
  canRotatePiece,
} from './rules.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL = 68;
const PAD = 26;
const ICONS = { laser: '⚡', king: '王', splitter: '◇', scarab: '◈', triangle: '◢', square: '▀' };

let selected = null; // { r, c } | null
let showPreviewBeam = false;
let lastEventSig = null;
let lastBeamSeq = 0;
let lastAlive = [10, 10];
let lastHits = [0, 0];
let beamAnimGen = 0;
let pieceVisualAngles = new Map(); // pieceId -> cumulative visual angle in degrees
let latestCtx = null;
let latestState = null;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function targetLogicalAngle(piece) {
  if (piece.type === 'king') return 0;
  if (piece.type === 'splitter' || piece.type === 'scarab') {
    return piece.dir % 2 === 0 ? 0 : 90;
  }
  return piece.dir * 90;
}

/**
 * Shortest-path cumulative rotation angle so 270° -> 0° rotates +90° (to 360°) instead of spinning -270°!
 */
function nextVisualAngle(piece) {
  const targetMod = targetLogicalAngle(piece);
  const prev = pieceVisualAngles.get(piece.id);
  if (prev === undefined) {
    pieceVisualAngles.set(piece.id, targetMod);
    return targetMod;
  }
  const period = piece.type === 'splitter' || piece.type === 'scarab' ? 180 : 360;
  let diff = ((targetMod - prev) % period + period) % period;
  if (diff > period / 2) diff -= period;
  const next = prev + diff;
  pieceVisualAngles.set(piece.id, next);
  return next;
}

function pieceInnerMarkup(piece) {
  const isRed = piece.owner === 0;
  const bodyGrad = isRed ? 'url(#lc-body-red)' : 'url(#lc-body-cyan)';
  const rimCol = isRed ? '#ff4d6d' : '#0ea5e9';
  const mirrorGlow = isRed ? '#fff0c2' : '#e0faff';

  if (piece.type === 'laser') {
    return `
      <polygon points="0,-26 19,-10 19,21 -19,21 -19,-10" fill="${bodyGrad}" stroke="${rimCol}" stroke-width="2" />
      <rect x="-6" y="-27" width="12" height="16" rx="3" fill="#0b0e18" stroke="${rimCol}" stroke-width="1.6" />
      <circle cx="0" cy="-21" r="4" fill="${isRed ? '#ff2e54' : '#22d3ee'}" filter="url(#lc-glow)" />
      <circle cx="0" cy="4" r="9" fill="rgba(0,0,0,0.55)" stroke="${mirrorGlow}" stroke-width="1.4" />
      <circle cx="0" cy="4" r="4.5" fill="${isRed ? '#ff2e54' : '#22d3ee'}" />
    `;
  }
  if (piece.type === 'king') {
    return `
      <polygon points="0,-24 22,-7 14,22 -14,22 -22,-7" fill="${bodyGrad}" stroke="#fff0c2" stroke-width="2.2" />
      <polygon points="-13,8 -10,-9 -3,-1 0,-13 3,-1 10,-9 13,8" fill="url(#lc-gold)" stroke="#1b1204" stroke-width="1.2" />
      <rect x="-12" y="10" width="24" height="5" rx="2" fill="#fff0c2" />
      <text x="0" y="3" text-anchor="middle" fill="#180d03" font-size="9" font-weight="900">王</text>
    `;
  }
  if (piece.type === 'triangle') {
    return `
      <polygon points="-21,-21 -21,21 21,21" fill="${bodyGrad}" stroke="${rimCol}" stroke-width="1.8" stroke-linejoin="round" />
      <polygon points="-16,-8 -16,16 8,16" fill="rgba(0,0,0,0.35)" />
      <line x1="-21" y1="-21" x2="21" y2="21" stroke="${mirrorGlow}" stroke-width="5.5" stroke-linecap="round" filter="url(#lc-glow)" />
      <line x1="-20" y1="-20" x2="20" y2="20" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
    `;
  }
  if (piece.type === 'square') {
    return `
      <rect x="-20" y="-19" width="40" height="39" rx="6" fill="${bodyGrad}" stroke="${rimCol}" stroke-width="1.8" />
      <rect x="-11" y="-5" width="22" height="17" rx="3" fill="rgba(0,0,0,0.42)" stroke="rgba(255,255,255,0.16)" stroke-width="1" />
      <rect x="-21" y="-22" width="42" height="8" rx="3" fill="url(#lc-mirror-bar)" stroke="#ffffff" stroke-width="1.2" filter="url(#lc-glow)" />
    `;
  }
  if (piece.type === 'splitter') {
    return `
      <polygon points="0,-24 24,0 0,24 -24,0" fill="rgba(14,22,38,0.9)" stroke="${rimCol}" stroke-width="1.8" />
      <polygon points="0,-16 16,0 0,16 -16,0" fill="url(#lc-prism)" opacity="0.78" />
      <line x1="-20" y1="-20" x2="20" y2="20" stroke="#fff0c2" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 3" filter="url(#lc-glow)" />
      <line x1="-20" y1="-20" x2="20" y2="20" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="0" cy="0" r="4.5" fill="#fff0c2" />
    `;
  }
  if (piece.type === 'scarab') {
    return `
      <circle cx="0" cy="0" r="21" fill="${bodyGrad}" stroke="${rimCol}" stroke-width="1.8" />
      <line x1="-21" y1="-21" x2="21" y2="21" stroke="${mirrorGlow}" stroke-width="7" stroke-linecap="round" filter="url(#lc-glow)" />
      <line x1="-21" y1="-21" x2="21" y2="21" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="0" cy="0" r="5" fill="#090c14" stroke="#fff0c2" stroke-width="1.6" />
    `;
  }
  return '';
}

function mountSkeleton(container, rows, cols) {
  container.dataset.mountedGame = `laser-chess-${rows}x${cols}`;
  pieceVisualAngles = new Map();
  lastBeamSeq = 0;

  const W = PAD * 2 + cols * CELL;
  const H = PAD * 2 + rows * CELL;
  const colLabels = 'ABCDEFGHIJ'.slice(0, cols).split('');

  let coordsSvg = '';
  for (let c = 0; c < cols; c++) {
    const x = PAD + c * CELL + CELL / 2;
    coordsSvg += `<text class="lc-coord-text" x="${x}" y="16" text-anchor="middle">${colLabels[c]}</text>`;
    coordsSvg += `<text class="lc-coord-text" x="${x}" y="${H - 8}" text-anchor="middle">${colLabels[c]}</text>`;
  }
  for (let r = 0; r < rows; r++) {
    const y = PAD + r * CELL + CELL / 2 + 4;
    coordsSvg += `<text class="lc-coord-text" x="12" y="${y}" text-anchor="middle">${rows - r}</text>`;
    coordsSvg += `<text class="lc-coord-text" x="${W - 12}" y="${y}" text-anchor="middle">${rows - r}</text>`;
  }

  let cellsSvg = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      const alt = (r + c) % 2 === 0;
      const cornerCls =
        r === 0 && c === 0 ? 'is-corner-p1' : r === rows - 1 && c === cols - 1 ? 'is-corner-p0' : alt ? 'is-a' : 'is-b';
      cellsSvg += `
        <g class="lc-cell-hit" data-r="${r}" data-c="${c}">
          <rect class="lc-cell-rect ${cornerCls}" x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="7" />
        </g>
      `;
    }
  }

  container.innerHTML = `
    <div class="lc-arena">
      <div class="lc-table-shell" id="lc-table-shell">
        <svg class="lc-board-svg" id="lc-board-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Laser Chess Optical Arena">
          <defs>
            <linearGradient id="lc-body-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#9f1232" />
              <stop offset="55%" stop-color="#5d0a1d" />
              <stop offset="100%" stop-color="#2b040c" />
            </linearGradient>
            <linearGradient id="lc-body-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0e7490" />
              <stop offset="55%" stop-color="#0b3b54" />
              <stop offset="100%" stop-color="#061b2a" />
            </linearGradient>
            <linearGradient id="lc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff6d9" />
              <stop offset="50%" stop-color="#e4b95b" />
              <stop offset="100%" stop-color="#a67521" />
            </linearGradient>
            <linearGradient id="lc-mirror-bar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#cbd5e1" />
              <stop offset="50%" stop-color="#ffffff" />
              <stop offset="100%" stop-color="#94a3b8" />
            </linearGradient>
            <linearGradient id="lc-prism" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#67e8f9" />
              <stop offset="50%" stop-color="#fff0c2" />
              <stop offset="100%" stop-color="#ff6b8b" />
            </linearGradient>
            <filter id="lc-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="lc-beam-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect class="lc-outer-frame" x="${PAD - 4}" y="${PAD - 4}" width="${cols * CELL + 8}" height="${rows * CELL + 8}" rx="11" />
          <g id="lc-coords-layer">${coordsSvg}</g>
          <g id="lc-cells-layer">${cellsSvg}</g>
          <g id="lc-legal-layer" pointer-events="none"></g>
          <g id="lc-pieces-layer"></g>
          <g id="lc-preview-layer" pointer-events="none"></g>
          <g id="lc-beam-layer" pointer-events="none"></g>
        </svg>
      </div>

      <div class="lc-console">
        <div class="lc-card" id="lc-control-card">
          <h4 class="lc-card-title">
            <span id="lc-title-control"></span>
            <span class="tg-badge" id="lc-turn-badge"></span>
          </h4>
          <div class="lc-event-alert" id="lc-event-alert" hidden></div>

          <div class="lc-sel-box" id="lc-sel-box" hidden>
            <div class="lc-sel-name" id="lc-sel-name"></div>
            <p class="lc-sel-desc" id="lc-sel-desc"></p>
            <div id="lc-rot-toggle-wrap" style="margin-top:10px;" hidden>
              <button type="button" class="tg-btn tg-btn-gold" style="width:100%;" id="lc-btn-rot-toggle"></button>
            </div>
            <div class="lc-rotate-row" id="lc-rot-dual-wrap" hidden>
              <button type="button" class="tg-btn tg-btn-cyan" id="lc-btn-rot-ccw"></button>
              <button type="button" class="tg-btn tg-btn-gold" id="lc-btn-rot-cw"></button>
            </div>
          </div>

          <p id="lc-idle-hint" style="margin:0;font-size:13px;color:var(--tg-ink-muted);"></p>

          <div style="margin-top:11px;display:flex;gap:8px;">
            <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" style="width:100%;" id="lc-btn-sightline"></button>
          </div>
        </div>

        <div class="lc-card">
          <h4 class="lc-card-title" id="lc-title-stats"></h4>
          <div class="lc-kill-strip">
            <div class="lc-side-row is-p0">
              <span><strong id="lc-name-0"></strong></span>
              <span class="lc-stat-mono lc-stat-p0"><span id="lc-alive-0">10</span> <span data-lbl-alive></span> · <span id="lc-hits-0">0</span> <span data-lbl-hits></span></span>
            </div>
            <div class="lc-side-row is-p1">
              <span><strong id="lc-name-1"></strong></span>
              <span class="lc-stat-mono lc-stat-p1"><span id="lc-alive-1">10</span> <span data-lbl-alive></span> · <span id="lc-hits-1">0</span> <span data-lbl-hits></span></span>
            </div>
          </div>
        </div>

        <div class="lc-card">
          <h4 class="lc-card-title" id="lc-title-legend"></h4>
          <div class="lc-piece-legend" id="lc-piece-legend"></div>
        </div>
      </div>
    </div>
  `;

  // Bind permanent cell click handlers once
  container.querySelectorAll('#lc-cells-layer .lc-cell-hit').forEach((g) => {
    g.addEventListener('click', () => handleCellClick(container, Number(g.dataset.r), Number(g.dataset.c)));
  });

  // Bind rotate buttons once
  const doRotate = async (delta, btnEl) => {
    const state = latestState;
    const ctx = latestCtx;
    if (!state || !ctx || !selected) return;
    const { r, c } = selected;
    selected = null;
    patchSelectionAndInspector(container, state, ctx);
    const res = await ctx.dispatch({ type: 'ROTATE', payload: { r, c, delta } });
    if (!res.ok) {
      SFX.play('error');
      Motion.nudgeError(btnEl || container.querySelector('#lc-control-card'), { intensity: 'subtle' });
      UI.toast(res.reason || 'Cannot rotate', 'error');
    }
  };

  container.querySelector('#lc-btn-rot-toggle').addEventListener('click', (e) => doRotate(1, e.currentTarget));
  container.querySelector('#lc-btn-rot-cw').addEventListener('click', (e) => doRotate(1, e.currentTarget));
  container.querySelector('#lc-btn-rot-ccw').addEventListener('click', (e) => doRotate(-1, e.currentTarget));

  // Sightline preview button -> updates ONLY #lc-preview-layer (zero board rebuild!)
  container.querySelector('#lc-btn-sightline').addEventListener('click', () => {
    SFX.play('click');
    showPreviewBeam = !showPreviewBeam;
    patchPreviewLayer(container, latestState, latestCtx);
  });
}

function getIsMyTurn(state, ctx) {
  return state.phase === 'playing' && !ctx.isSpectator && state.currentTurnSeatId === ctx.activeSeatId;
}

function computeLegalMap(state, ctx) {
  const legalMap = new Map();
  if (!getIsMyTurn(state, ctx) || !selected) return legalMap;
  for (const m of getLegalMovesForPiece(state.board, state.rows, state.cols, selected.r, selected.c)) {
    legalMap.set(`${m.r},${m.c}`, m);
  }
  return legalMap;
}

/**
 * Updates ONLY the Sightline preview SVG layer & toggle button label.
 */
function patchPreviewLayer(container, state, ctx) {
  const previewLayer = container.querySelector('#lc-preview-layer');
  const btn = container.querySelector('#lc-btn-sightline');
  if (!previewLayer || !btn || !state || !ctx) return;

  const lang = ctx.lang;
  btn.className = `tg-btn tg-btn-sm ${showPreviewBeam ? 'tg-btn-cyan' : 'tg-btn-ghost'}`;
  btn.textContent = showPreviewBeam
    ? lang === 'zh'
      ? '◎ 隐藏当前光路预览'
      : '◎ Hide Beam Preview'
    : lang === 'zh'
    ? '◎ 显示当前光路预览'
    : '◎ Preview Current Beam';

  previewLayer.textContent = '';
  if (!showPreviewBeam || state.phase !== 'playing') return;

  const beam = traceLaser(state.board, state.rows, state.cols, state.turnOwner);
  const strokeCol = beam.owner === 0 ? '#e11d48' : '#0284c7';
  const strokeHi = beam.owner === 0 ? '#ff6b8b' : '#38bdf8';

  for (const seg of beam.segments) {
    const x1 = PAD + seg.c1 * CELL + CELL / 2;
    const y1 = PAD + seg.r1 * CELL + CELL / 2;
    const x2 = PAD + seg.c2 * CELL + CELL / 2;
    const y2 = PAD + seg.r2 * CELL + CELL / 2;
    // Dual-layer high-contrast dashed sightline legible on both Dark & Light cells
    previewLayer.appendChild(
      svgEl('line', { x1, y1, x2, y2, stroke: strokeCol, 'stroke-width': 4, 'stroke-dasharray': '7 5', opacity: 0.42 })
    );
    previewLayer.appendChild(
      svgEl('line', { x1, y1, x2, y2, stroke: strokeHi, 'stroke-width': 2, 'stroke-dasharray': '7 5', opacity: 0.9 })
    );
  }
}

/**
 * In-place selection, legal move markers, and inspector box patch (zero SVG piece rebuild!)
 */
function patchSelectionAndInspector(container, state, ctx) {
  const isMyTurn = getIsMyTurn(state, ctx);
  const legalMap = computeLegalMap(state, ctx);
  const lang = ctx.lang;

  container.querySelectorAll('#lc-cells-layer .lc-cell-hit').forEach((g) => {
    const r = Number(g.dataset.r);
    const c = Number(g.dataset.c);
    const rect = g.querySelector('.lc-cell-rect');
    const isSel = selected && selected.r === r && selected.c === c;
    const legal = legalMap.get(`${r},${c}`);
    const isLastTo = state.lastAction && state.lastAction.toR === r && state.lastAction.toC === c;
    g.style.cursor = isMyTurn ? 'pointer' : 'default';
    rect.classList.toggle('is-selected', Boolean(isSel));
    rect.classList.toggle('is-last-to', Boolean(isLastTo));
    rect.classList.toggle('is-legal', Boolean(legal && legal.kind !== 'swap'));
    rect.classList.toggle('is-legal-swap', Boolean(legal && legal.kind === 'swap'));
  });

  const legalLayer = container.querySelector('#lc-legal-layer');
  legalLayer.textContent = '';
  for (const m of legalMap.values()) {
    const x = PAD + m.c * CELL;
    const y = PAD + m.r * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    if (m.kind === 'swap') {
      legalLayer.appendChild(
        svgEl('rect', {
          x: x + 5, y: y + 5, width: CELL - 10, height: CELL - 10, rx: 6,
          fill: 'rgba(245,158,11,0.18)', stroke: '#f59e0b', 'stroke-width': 1.8, 'stroke-dasharray': '4 3',
        })
      );
    } else {
      legalLayer.appendChild(
        svgEl('circle', {
          cx, cy, r: 9, fill: 'rgba(2,132,199,0.38)', stroke: '#22d3ee', 'stroke-width': 2.2,
        })
      );
    }
  }

  const selPiece = selected ? state.board[selected.r]?.[selected.c] : null;
  const selBox = container.querySelector('#lc-sel-box');
  const idleHint = container.querySelector('#lc-idle-hint');
  const activeName = state.seats[state.turnOwner]?.name || '';

  if (selPiece) {
    selBox.hidden = false;
    idleHint.hidden = true;
    container.querySelector('#lc-sel-name').textContent = `${ICONS[selPiece.type]} ${PIECE_INFO[selPiece.type][lang]}`;
    container.querySelector('#lc-sel-desc').textContent =
      lang === 'zh' ? PIECE_INFO[selPiece.type].descZh : PIECE_INFO[selPiece.type].descEn;

    const rotatable = canRotatePiece(selPiece);
    const isToggle = selPiece.type === 'laser' || selPiece.type === 'splitter' || selPiece.type === 'scarab';
    const toggleWrap = container.querySelector('#lc-rot-toggle-wrap');
    const dualWrap = container.querySelector('#lc-rot-dual-wrap');
    toggleWrap.hidden = !(rotatable && isToggle);
    dualWrap.hidden = !(rotatable && !isToggle);

    container.querySelector('#lc-btn-rot-toggle').textContent =
      lang === 'zh' ? '↻ 切换角度 90° 并发射激光' : '↻ Toggle 90° & Fire Laser';
    container.querySelector('#lc-btn-rot-ccw').textContent = lang === 'zh' ? '↺ 逆时针 90°' : '↺ 90° CCW';
    container.querySelector('#lc-btn-rot-cw').textContent = lang === 'zh' ? '↻ 顺时针 90°' : '↻ 90° CW';
  } else {
    selBox.hidden = true;
    idleHint.hidden = false;
    idleHint.textContent =
      state.phase === 'ended'
        ? lang === 'zh'
          ? '本场激光象棋已分出胜负！'
          : 'Laser Chess match concluded!'
        : isMyTurn
        ? lang === 'zh'
          ? '点击任意己方棋子：高亮可移动格，并可原地旋转 90°（随后自动发射激光）。'
          : 'Select any of your pieces to move 1 square OR rotate 90° (laser fires automatically!).'
        : lang === 'zh'
        ? `等待 ${activeName} 调整镜阵…`
        : `Waiting for ${activeName}…`;
  }
}

async function handleCellClick(container, r, c) {
  const state = latestState;
  const ctx = latestCtx;
  if (!state || !ctx || !getIsMyTurn(state, ctx)) return;

  const legalMap = computeLegalMap(state, ctx);
  if (selected && legalMap.has(`${r},${c}`)) {
    const fromR = selected.r;
    const fromC = selected.c;
    selected = null;
    patchSelectionAndInspector(container, state, ctx);
    const res = await ctx.dispatch({ type: 'MOVE', payload: { fromR, fromC, toR: r, toC: c } });
    if (!res.ok) {
      SFX.play('error');
      Motion.nudgeError(container.querySelector('#lc-table-shell'), { intensity: 'subtle' });
      UI.toast(res.reason || 'Illegal move', 'error');
    }
    return;
  }

  const p = state.board[r]?.[c];
  if (p && p.owner === state.turnOwner) {
    SFX.play('click');
    if (selected && selected.r === r && selected.c === c) {
      selected = null;
    } else {
      selected = { r, c };
    }
    patchSelectionAndInspector(container, state, ctx);
  } else if (selected) {
    selected = null;
    patchSelectionAndInspector(container, state, ctx);
  }
}

/**
 * Reconciles persistent keyed SVG pieces so moves glide (180ms) and rotations turn smoothly (160ms)!
 */
function patchPiecesLayer(container, state) {
  const layer = container.querySelector('#lc-pieces-layer');
  const existing = new Map();
  layer.querySelectorAll('.lc-piece-node').forEach((el) => {
    existing.set(el.dataset.pieceId, el);
  });

  const liveIds = new Set();
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const pid = p.id || `p${p.owner}-${p.type}-${r}-${c}`;
      liveIds.add(pid);

      const cx = PAD + c * CELL + CELL / 2;
      const cy = PAD + r * CELL + CELL / 2;
      const angle = nextVisualAngle(p);

      let node = existing.get(pid);
      if (!node) {
        node = svgEl('g', { class: 'lc-piece-node', 'data-piece-id': pid });
        node.style.transform = `translate(${cx}px, ${cy}px)`;
        const rotG = svgEl('g', { class: 'lc-piece-rotator' });
        rotG.style.transform = `rotate(${angle}deg)`;
        rotG.innerHTML = pieceInnerMarkup(p);
        node.appendChild(rotG);
        layer.appendChild(node);
      } else {
        node.style.transform = `translate(${cx}px, ${cy}px)`;
        const rotG = node.querySelector('.lc-piece-rotator');
        if (rotG) rotG.style.transform = `rotate(${angle}deg)`;
      }
    }
  }

  // Remove vaporized pieces cleanly
  for (const [pid, node] of existing.entries()) {
    if (!liveIds.has(pid)) {
      node.remove();
      pieceVisualAngles.delete(pid);
    }
  }
}

/**
 * Renders fired laser beam with 260ms SVG stroke-dashoffset sweep followed by 240ms shatter bursts!
 */
function renderFiredBeam(container, beam, isFreshFire) {
  const beamLayer = container.querySelector('#lc-beam-layer');
  if (!beamLayer) return;
  beamLayer.textContent = '';
  if (!beam || !beam.segments || beam.segments.length === 0) return;

  const gen = ++beamAnimGen;
  const isRed = beam.owner === 0;
  const colOuter = isRed ? '#e11d48' : '#0284c7';
  const colMid = isRed ? '#ff5474' : '#22d3ee';
  const animateSweep = isFreshFire && !Motion.reduced();

  const linesGroup = svgEl('g');
  const sparksGroup = svgEl('g');
  beamLayer.appendChild(linesGroup);
  beamLayer.appendChild(sparksGroup);

  const sweepDur = 260;
  const totalSegs = beam.segments.length;

  beam.segments.forEach((seg, idx) => {
    const x1 = PAD + seg.c1 * CELL + CELL / 2;
    const y1 = PAD + seg.r1 * CELL + CELL / 2;
    const x2 = PAD + seg.c2 * CELL + CELL / 2;
    const y2 = PAD + seg.r2 * CELL + CELL / 2;
    const len = Math.max(1, Math.hypot(x2 - x1, y2 - y1));

    const outer = svgEl('line', {
      x1, y1, x2, y2, stroke: colOuter, 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.45, filter: 'url(#lc-beam-glow)',
    });
    const mid = svgEl('line', {
      x1, y1, x2, y2, stroke: colMid, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.96,
    });
    const core = svgEl('line', {
      class: 'lc-beam-flow', x1, y1, x2, y2, stroke: '#ffffff', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.95,
    });

    if (animateSweep) {
      const segDelay = Math.round((idx / Math.max(1, totalSegs)) * (sweepDur * 0.55));
      const segDur = Math.max(90, Math.round(sweepDur * 0.6));
      for (const lineEl of [outer, mid]) {
        lineEl.style.strokeDasharray = `${len}`;
        lineEl.style.strokeDashoffset = `${len}`;
        if (typeof lineEl.animate === 'function') {
          lineEl.animate(
            [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
            { duration: segDur, delay: segDelay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
          );
        } else {
          lineEl.style.strokeDashoffset = '0';
        }
      }
      core.style.opacity = '0';
      if (typeof core.animate === 'function') {
        core.animate([{ opacity: 0 }, { opacity: 0.95 }], { duration: 100, delay: segDelay + segDur * 0.5, fill: 'forwards' });
      } else {
        core.style.opacity = '0.95';
      }
    }

    linesGroup.appendChild(outer);
    linesGroup.appendChild(mid);
    linesGroup.appendChild(core);
  });

  const mountSparks = () => {
    if (beamAnimGen !== gen) return;
    for (const sp of beam.sparks || []) {
      const cx = PAD + sp.c * CELL + CELL / 2;
      const cy = PAD + sp.r * CELL + CELL / 2;
      // Outer <g> holds SVG translate(cx,cy); inner <g> runs CSS scale/rotate keyframes so translate is never overridden!
      const posWrap = svgEl('g', { transform: `translate(${cx},${cy})` });
      if (sp.kind === 'reflect' || sp.kind === 'split') {
        const sparkCol = sp.kind === 'split' ? '#fff0c2' : colMid;
        const inner = svgEl('g', { class: 'lc-spark-ring' });
        inner.appendChild(svgEl('circle', { r: sp.kind === 'split' ? 11 : 7, fill: sparkCol, opacity: 0.38, filter: 'url(#lc-beam-glow)' }));
        inner.appendChild(svgEl('circle', { r: 3.5, fill: '#ffffff' }));
        posWrap.appendChild(inner);
      } else if (sp.kind === 'shield') {
        const inner = svgEl('g', { class: 'lc-spark-ring' });
        inner.appendChild(
          svgEl('circle', { cx: 0, cy: 0, r: 10, fill: 'none', stroke: '#e4b95b', 'stroke-width': 2.4, opacity: 0.9 })
        );
        posWrap.appendChild(inner);
      } else if (sp.kind === 'destroy') {
        const inner = svgEl('g', { class: 'lc-shatter-burst' });
        inner.appendChild(svgEl('circle', { r: 24, fill: 'rgba(217,27,58,0.42)', stroke: '#fff0c2', 'stroke-width': 2.5 }));
        inner.appendChild(
          svgEl('path', {
            d: 'M-18,-18 L18,18 M18,-18 L-18,18 M0,-24 L0,24 M-24,0 L24,0',
            stroke: '#fff6d9', 'stroke-width': 2.4, 'stroke-linecap': 'round',
          })
        );
        posWrap.appendChild(inner);
      }
      sparksGroup.appendChild(posWrap);
    }
  };

  if (animateSweep) {
    setTimeout(mountSparks, sweepDur);
  } else {
    mountSparks();
  }
}

mountGame({
  config: {
    id: 'laser-chess',
    title: { zh: '激光象棋', en: 'Laser Chess', ko: '레이저 장기' },
    seasons: ['S2'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 3,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'arenaPreset',
        label: { zh: '战场格局', en: 'Optical Arena' },
        type: 'select',
        default: 's2_broadcast',
        options: [
          { value: 's2_broadcast', label: { zh: 'S2E5 官方 8×8（含分光镜）', en: 'S2E5 Official 8×8 (Beam Splitter)' } },
          { value: 'grand_8x10',   label: { zh: '经典 8×10 镜像殿堂（圣甲虫互换）', en: 'Grand Mirror 8×10 (Scarab Swap)' } },
        ],
      },
    ],
    rulesSummary: {
      zh: `### 激光象棋（S2E5 · 林遥焕 vs 林允善）
在反射光学棋盘上指挥镜面骑士、分光棱镜与角落激光炮，**摧毁敌方「王」即刻获胜！**

### 每回合行动（二选一，随后自动发射激光）
1. **移动 1 格**：将己方任意可移动棋子向周围 8 个方向移动 1 格至空格（8×10 模式下圣甲虫可与相邻三棱镜/四棱盾互换位置）。
2. **原地旋转 90°**：将己方任意棋子（含角落激光炮）顺时针或逆时针旋转 90°。
- 行动结束后，**己方角落激光炮自动开火**！

### 光学镜面法则
- **三棱镜 (Pyramid)**：斜镜面 90° 反射激光；击中背面两条直角边即汽化销毁。
- **四棱盾 (Anubis)**：正面厚镜安全阻挡激光；击中其余三侧即销毁。
- **分光镜 (Splitter)**：不可摧毁！让激光**同时直穿并 90° 反射分裂成两道光束**！
- **王 (Pharaoh)**：无任何镜面防护，被敌我任意激光击中立即淘汰（切勿误伤己方王棋！）。`,
      en: `### Laser Chess (S2E5 · Lim Yo-hwan vs Lim Yoon-sun)
Command reflective mirrors, half-silvered beam splitters, and your corner laser cannon—**vaporize the enemy King to win!**

### Turn Structure (Pick One, Then Auto-Fire Laser)
1. **Move 1 Square** in any of the 8 directions into an empty square (in 8×10 Grand Arena, Scarabs can also swap with an adjacent Pyramid or Anubis).
2. **Rotate 90°** CW or CCW on any of your pieces (including your corner Laser Cannon between its 2 inward axes).
- Immediately after your move, **your corner Laser fires automatically!**

### Optical Physics
- **Triangle Mirror (Pyramid)**: 45° mirrored face reflects laser 90°; hitting either back face destroys it.
- **Square Shield (Anubis)**: Front armored mirror blocks laser; hitting the other 3 sides destroys it.
- **Beam Splitter**: Indestructible! Lets laser pass straight AND reflects a 90° fork simultaneously!
- **King (Pharaoh)**: Unshielded—hit from any side (even friendly fire!) and it is vaporized immediately.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, lang, lastEvent, setTelemetry } = ctx;
    if (!state) return;

    latestCtx = ctx;
    latestState = state;

    const mountKey = `laser-chess-${state.rows}x${state.cols}`;
    if (container.dataset.mountedGame !== mountKey) {
      mountSkeleton(container, state.rows, state.cols);
      lastAlive = [0, 0];
      lastHits = [0, 0];
    }

    if (lastEvent && lastEvent !== lastEventSig) {
      lastEventSig = lastEvent;
      if (lastEvent.type === 'KING_VAPORIZED') {
        SFX.play('laserZap');
        setTimeout(() => SFX.play('clash'), 180);
      } else if (lastEvent.type === 'LASER_DESTROY') {
        SFX.play('laserZap');
        setTimeout(() => SFX.play('garnetClink'), 160);
      } else if (lastEvent.type === 'LASER_FIRE') {
        SFX.play('laserZap');
      }
      selected = null;
    }

    setTelemetry({
      round: state.round,
      phase: {
        zh: `${state.rows}×${state.cols} · 第 ${state.ply} 步`,
        en: `${state.rows}×${state.cols} · Ply ${state.ply}`,
      },
    });

    if (!getIsMyTurn(state, ctx)) selected = null;
    if (selected) {
      const sp = state.board[selected.r]?.[selected.c];
      if (!sp || sp.owner !== state.turnOwner) selected = null;
    }

    // Reconcile pieces smoothly (180ms glide + 160ms shortest-path rotate!)
    patchPiecesLayer(container, state);

    // Fire beam animation when beamSeq increments
    if (state.lastBeam) {
      const isFresh = state.lastBeam.seq !== lastBeamSeq;
      if (isFresh) {
        lastBeamSeq = state.lastBeam.seq;
        renderFiredBeam(container, state.lastBeam, true);
      }
    } else {
      container.querySelector('#lc-beam-layer').textContent = '';
      lastBeamSeq = 0;
    }

    patchPreviewLayer(container, state, ctx);
    patchSelectionAndInspector(container, state, ctx);

    // Patch telemetry & headings
    container.querySelector('#lc-title-control').textContent = lang === 'zh' ? '光学火控台' : 'Optical Control';
    const turnBadge = container.querySelector('#lc-turn-badge');
    turnBadge.className = `tg-badge ${state.turnOwner === 0 ? 'tg-badge-garnet' : 'tg-badge-cyan'}`;
    turnBadge.textContent =
      state.turnOwner === 0
        ? lang === 'zh'
          ? '绯红激光'
          : 'CRIMSON'
        : lang === 'zh'
        ? '电光青激光'
        : 'CYAN';

    const alertEl = container.querySelector('#lc-event-alert');
    const hasDestroyed = Boolean(state.lastBeam?.destroyed?.length > 0);
    if (hasDestroyed) {
      alertEl.textContent =
        lang === 'zh'
          ? `💥 上一道激光汽化摧毁了 ${state.lastBeam.destroyed.map((d) => PIECE_INFO[d.piece.type].zh).join('、')}！`
          : `💥 Last beam vaporized: ${state.lastBeam.destroyed.map((d) => PIECE_INFO[d.piece.type].en).join(', ')}!`;
    }
    Motion.transitionPresence(alertEl, hasDestroyed, { preset: 'pill' });

    container.querySelector('#lc-title-stats').textContent = lang === 'zh' ? '阵列存活统计' : 'Array Status';
    container.querySelector('#lc-title-legend').textContent = lang === 'zh' ? '光学棋子图鉴' : 'Optical Units';
    container.querySelectorAll('[data-lbl-alive]').forEach((el) => {
      el.textContent = lang === 'zh' ? '存' : 'alive';
    });
    container.querySelectorAll('[data-lbl-hits]').forEach((el) => {
      el.textContent = lang === 'zh' ? '击毁' : 'hits';
    });

    const countAlive = (o) => {
      let n = 0;
      for (const row of state.board) for (const cell of row) if (cell && cell.owner === o) n++;
      return n;
    };

    for (let o = 0; o < 2; o++) {
      container.querySelector(`#lc-name-${o}`).textContent = state.seats[o].name;
      const alive = countAlive(o);
      const hits = state.capturedBy[o].length;
      const aEl = container.querySelector(`#lc-alive-${o}`);
      const hEl = container.querySelector(`#lc-hits-${o}`);
      if (lastAlive[o] !== alive) {
        Motion.animateNumber(aEl, lastAlive[o], alive, { duration: 240 });
        lastAlive[o] = alive;
      } else {
        aEl.textContent = String(alive);
      }
      if (lastHits[o] !== hits) {
        Motion.animateNumber(hEl, lastHits[o], hits, { duration: 240 });
        lastHits[o] = hits;
      } else {
        hEl.textContent = String(hits);
      }
    }

    const legendEl = container.querySelector('#lc-piece-legend');
    const legendKey = `${state.arenaMode}-${lang}`;
    if (legendEl.dataset.key !== legendKey) {
      legendEl.dataset.key = legendKey;
      const types =
        state.arenaMode === 'grand_8x10'
          ? ['laser', 'king', 'scarab', 'triangle', 'square']
          : ['laser', 'king', 'splitter', 'triangle', 'square'];
      legendEl.innerHTML = types
        .map(
          (t) => `<div class="lc-legend-item"><span class="lc-legend-badge">${ICONS[t]}</span><span><strong>${UI.escapeHtml(PIECE_INFO[t][lang])}</strong></span></div>`
        )
        .join('');
    }
  },
});

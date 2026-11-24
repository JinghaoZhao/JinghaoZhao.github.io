/**
 * Monorail (모노레일 / 单轨铁路) — Illuminated Blueprint Renderer + Animated Closed-Loop Train
 */

import { mountGame, SFX, UI } from '../../shared/sdk.js';
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

let staged = []; // Array<{ x, y, shape }>
let brushMode = 'auto'; // 'auto' | 'straight' | 'curve'
let lastEventSig = null;

const CELL = 74;

function trackPathD(shape, cx, cy, half) {
  const N = `${cx} ${cy - half}`;
  const S = `${cx} ${cy + half}`;
  const W = `${cx - half} ${cy}`;
  const E = `${cx + half} ${cy}`;
  const C = `${cx} ${cy}`;
  switch (shape) {
    case 'H':  return `M ${W} L ${E}`;
    case 'V':  return `M ${N} L ${S}`;
    case 'NE': return `M ${N} Q ${C} ${E}`;
    case 'NW': return `M ${N} Q ${C} ${W}`;
    case 'SE': return `M ${S} Q ${C} ${E}`;
    case 'SW': return `M ${S} Q ${C} ${W}`;
    default:   return `M ${W} L ${E}`;
  }
}

function buildClosedLoopMotionPath(path) {
  if (!path || path.length === 0) return '';
  const half = CELL / 2;
  const edgePt = (x, y, dir) => {
    const cx = x * CELL + half;
    const cy = y * CELL + half;
    if (dir === 'N') return `${cx} ${cy - half}`;
    if (dir === 'S') return `${cx} ${cy + half}`;
    if (dir === 'W') return `${cx - half} ${cy}`;
    return `${cx + half} ${cy}`;
  };

  let d = '';
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    const start = edgePt(seg.x, seg.y, seg.enterDir);
    const end = edgePt(seg.x, seg.y, seg.exitDir);
    const cx = seg.x * CELL + half;
    const cy = seg.y * CELL + half;
    if (i === 0) d += `M ${start} `;
    if (seg.shape === 'H' || seg.shape === 'V') {
      d += `L ${end} `;
    } else {
      d += `Q ${cx} ${cy} ${end} `;
    }
  }
  return d + 'Z';
}

function renderBlueprintSvg(state, canInteract, isProofMode, lang) {
  const allCoords = [];
  for (const k of Object.keys(state.tiles)) allCoords.push(parseKey(k));
  for (const s of staged) allCoords.push({ x: s.x, y: s.y });

  const legalCells = canInteract
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

  const vbX = minX * CELL;
  const vbY = minY * CELL;
  const vbW = (maxX - minX + 1) * CELL;
  const vbH = (maxY - minY + 1) * CELL;
  const half = CELL / 2;

  // Blueprint subtle grid lines
  let gridSvg = '';
  for (let gx = minX; gx <= maxX + 1; gx++) {
    gridSvg += `<line x1="${gx * CELL}" y1="${vbY}" x2="${gx * CELL}" y2="${vbY + vbH}" stroke="rgba(228,185,91,0.08)" stroke-width="1" />`;
  }
  for (let gy = minY; gy <= maxY + 1; gy++) {
    gridSvg += `<line x1="${vbX}" y1="${gy * CELL}" x2="${vbX + vbW}" y2="${gy * CELL}" stroke="rgba(228,185,91,0.08)" stroke-width="1" />`;
  }

  // Ghost legal placement cells
  let ghostsSvg = '';
  if (canInteract) {
    for (const lk of legalCells) {
      const { x, y } = parseKey(lk);
      const px = x * CELL + 5;
      const py = y * CELL + 5;
      const sz = CELL - 10;
      ghostsSvg += `
        <g class="mr-ghost-cell" data-place-x="${x}" data-place-y="${y}">
          <rect x="${px}" y="${py}" width="${sz}" height="${sz}" rx="10"
            fill="rgba(34,211,238,0.06)" stroke="rgba(34,211,238,0.42)" stroke-width="1.5" stroke-dasharray="5 4" />
          <text x="${x * CELL + half}" y="${y * CELL + half + 5}" text-anchor="middle" fill="rgba(103,232,249,0.55)" font-size="18" font-weight="700">+</text>
        </g>
      `;
    }
  }

  // Committed tiles
  let tilesSvg = '';
  const lastSet = new Set(state.lastBatchKeys || []);
  for (const [k, tile] of Object.entries(state.tiles)) {
    const { x, y } = parseKey(k);
    const px = x * CELL + 3;
    const py = y * CELL + 3;
    const sz = CELL - 6;
    const cx = x * CELL + half;
    const cy = y * CELL + half;
    const d = trackPathD(tile.shape, cx, cy, half - 3);
    const isStation = tile.type === 'station';
    const isLast = lastSet.has(k);

    const tileFill = isStation
      ? 'url(#mr-station-bg)'
      : tile.placedBy === 0
      ? 'url(#mr-p0-bg)'
      : 'url(#mr-p1-bg)';
    const tileStroke = isStation
      ? '#ff4d6d'
      : isLast
      ? '#fff0c2'
      : 'rgba(228,185,91,0.45)';
    const railStroke = isStation ? '#ff5474' : tile.placedBy === 0 ? '#f5b041' : '#38bdf8';

    tilesSvg += `
      <g>
        <rect x="${px}" y="${py}" width="${sz}" height="${sz}" rx="10"
          fill="${tileFill}" stroke="${tileStroke}" stroke-width="${isStation || isLast ? 2.2 : 1.3}" />
        <!-- Track sleepers / outer rail glow -->
        <path d="${d}" fill="none" stroke="rgba(0,0,0,0.65)" stroke-width="18" stroke-linecap="butt" />
        <path d="${d}" fill="none" stroke="${railStroke}" stroke-width="10" stroke-dasharray="4 6" opacity="0.45" />
        <path d="${d}" fill="none" stroke="${railStroke}" stroke-width="5.5" stroke-linecap="round" filter="url(#mr-glow)" />
        <path d="${d}" fill="none" stroke="#fff9e6" stroke-width="1.8" stroke-linecap="round" opacity="0.85" />
        ${
          isStation
            ? `<rect x="${cx - 24}" y="${cy - 10}" width="48" height="20" rx="6" fill="rgba(12,10,18,0.9)" stroke="#ff4d6d" stroke-width="1.2" />
               <text x="${cx}" y="${cy + 3.5}" text-anchor="middle" fill="#ffd4dc" font-size="8.5" font-weight="800" font-family="var(--tg-font-mono)">${lang === 'zh' ? '车站' : 'STN'}</text>`
            : ''
        }
      </g>
    `;
  }

  // Staged tiles (click to rotate 90°!)
  let stagedSvg = '';
  staged.forEach((st, idx) => {
    const px = st.x * CELL + 3;
    const py = st.y * CELL + 3;
    const sz = CELL - 6;
    const cx = st.x * CELL + half;
    const cy = st.y * CELL + half;
    const d = trackPathD(st.shape, cx, cy, half - 3);
    stagedSvg += `
      <g class="mr-staged-tile" data-staged-idx="${idx}">
        <rect class="mr-tile-bg" x="${px}" y="${py}" width="${sz}" height="${sz}" rx="10"
          fill="rgba(16, 48, 66, 0.92)" stroke="#22d3ee" stroke-width="2.4" />
        <path d="${d}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="17" />
        <path d="${d}" fill="none" stroke="#22d3ee" stroke-width="5.5" stroke-linecap="round" filter="url(#mr-glow)" />
        <path d="${d}" fill="none" stroke="#e0faff" stroke-width="2" stroke-linecap="round" />
        <circle cx="${px + sz - 10}" cy="${py + 10}" r="8" fill="#08131d" stroke="#22d3ee" stroke-width="1.2" />
        <text x="${px + sz - 10}" y="${py + 13.5}" text-anchor="middle" fill="#a5f3fc" font-size="10" font-weight="800">↻</text>
      </g>
    `;
  });

  // Animated glowing bullet train pulsing around completed closed loop!
  let trainSvg = '';
  if (state.completedLoopPath && state.completedLoopPath.length >= 6) {
    const loopD = buildClosedLoopMotionPath(state.completedLoopPath);
    const dur = Math.max(2.6, state.completedLoopPath.length * 0.28).toFixed(2);
    trainSvg = `
      <path id="mr-completed-loop" d="${loopD}" fill="none" stroke="#fff0c2" stroke-width="4" opacity="0.6" filter="url(#mr-glow)" />
      <g class="mr-train-glow">
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

  return `
    <svg class="mr-svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" role="img" aria-label="Monorail track grid">
      <defs>
        <linearGradient id="mr-station-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3c1120" />
          <stop offset="100%" stop-color="#17070d" />
        </linearGradient>
        <linearGradient id="mr-p0-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#272017" />
          <stop offset="100%" stop-color="#13100d" />
        </linearGradient>
        <linearGradient id="mr-p1-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#142333" />
          <stop offset="100%" stop-color="#0b121c" />
        </linearGradient>
        <filter id="mr-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      ${gridSvg}
      ${ghostsSvg}
      ${tilesSvg}
      ${stagedSvg}
      ${trainSvg}
    </svg>
  `;
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

  render: function renderMonorailGame(container, ctx) {
    const { state, activeSeatId, lang, lastEvent, dispatch, setTelemetry } = ctx;
    if (!state) return;

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
    const isMyTurn =
      state.phase !== 'ended' &&
      !ctx.isSpectator &&
      state.currentTurnSeatId === activeSeatId;

    if (!isMyTurn) staged = [];

    // Preview whether staged tiles currently complete a closed loop!
    const previewTiles = { ...state.tiles };
    for (const s of staged) previewTiles[keyOf(s.x, s.y)] = { type: 'track', shape: s.shape };
    const stagedClosesLoop = staged.length > 0 && checkClosedLoop(previewTiles).isLoop;

    const supplyPipsHtml = Array.from({ length: INITIAL_SUPPLY }, (_, i) => {
      const used = INITIAL_SUPPLY - state.remainingTiles;
      const cls =
        i < used ? 'is-used' : i < used + staged.length ? 'is-staged' : '';
      return `<span class="mr-supply-pip ${cls}"></span>`;
    }).join('');

    const canDeclareImpossible =
      isMyTurn && state.phase === 'PLAY' && state.remainingTiles < INITIAL_SUPPLY;

    let topBannerHtml = '';
    if (isProofMode) {
      const challenger = state.seats[state.challengerOwner]?.name || '';
      const prover = state.seats[state.turnOwner]?.name || '';
      topBannerHtml = `
        <div class="mr-proof-banner" role="alert">
          🚨 ${
            lang === 'zh'
              ? `【不可能挑战！】${UI.escapeHtml(challenger)} 宣告环路无解！请 ${UI.escapeHtml(prover)} 用剩余 ${state.remainingTiles} 块砖拼出单一闭合环路以反证，否则判负！`
              : `IMPOSSIBLE CHALLENGE! ${UI.escapeHtml(challenger)} declared no valid loop exists! ${UI.escapeHtml(prover)} must build a valid loop using the remaining ${state.remainingTiles} tiles — or concede!`
          }
        </div>
      `;
    } else if (state.completedLoopPath) {
      topBannerHtml = `
        <div class="mr-loop-banner">
          🚆 ${
            lang === 'zh'
              ? `单轨闭合环路已贯通！（共 ${state.completedLoopPath.length} 节轨道 · 列车全速运行中）`
              : `CLOSED MONORAIL LOOP COMPLETE! (${state.completedLoopPath.length} segments — Express Train active!)`
          }
        </div>
      `;
    }

    const activeName = state.seats[state.turnOwner]?.name || '';

    container.innerHTML = `
      <div class="mr-arena">
        ${topBannerHtml}

        <div class="mr-blueprint-wrap ${isProofMode ? 'is-proof' : ''}">
          ${renderBlueprintSvg(state, isMyTurn, isProofMode, lang)}
        </div>

        <div class="mr-console">
          <div class="mr-card">
            <h4 class="mr-card-title">
              <span>${lang === 'zh' ? '剩余轨砖储备' : 'Track Tile Supply'}</span>
              <span class="tg-badge ${isProofMode ? 'tg-badge-garnet' : 'tg-badge-gold'}">${state.remainingTiles - staged.length} / ${INITIAL_SUPPLY}</span>
            </h4>
            <div class="mr-supply-bar">
              <span class="mr-supply-num">${state.remainingTiles - staged.length}</span>
              <span style="font-size:12px;color:var(--tg-ink-muted);">${
                staged.length > 0
                  ? lang === 'zh'
                    ? `本回合已暂放 ${staged.length} 块`
                    : `${staged.length} staged`
                  : lang === 'zh'
                  ? `行动方：${UI.escapeHtml(activeName)}`
                  : `Turn: ${UI.escapeHtml(activeName)}`
              }</span>
            </div>
            <div class="mr-supply-pips">${supplyPipsHtml}</div>
          </div>

          <div class="mr-card">
            <h4 class="mr-card-title">
              <span>${lang === 'zh' ? '工程控制台' : 'Track Controls'}</span>
              ${stagedClosesLoop ? `<span class="tg-badge tg-badge-emerald">${lang === 'zh' ? '✓ 环路已闭合!' : '✓ LOOP CLOSED!'}</span>` : ''}
            </h4>

            ${
              isMyTurn
                ? `
                  <div class="mr-palette">
                    <button type="button" class="mr-brush-btn ${brushMode === 'auto' ? 'is-active' : ''}" data-brush="auto">
                      <span style="font-size:16px;">✦</span>
                      <span>${lang === 'zh' ? '智能吸附' : 'Auto Snap'}</span>
                    </button>
                    <button type="button" class="mr-brush-btn ${brushMode === 'straight' ? 'is-active' : ''}" data-brush="straight">
                      <span style="font-size:16px;">━</span>
                      <span>${lang === 'zh' ? '直线轨' : 'Straight'}</span>
                    </button>
                    <button type="button" class="mr-brush-btn ${brushMode === 'curve' ? 'is-active' : ''}" data-brush="curve">
                      <span style="font-size:16px;">┗</span>
                      <span>${lang === 'zh' ? '90°弯道' : '90° Curve'}</span>
                    </button>
                  </div>

                  <div class="mr-btn-stack">
                    ${
                      staged.length > 0
                        ? `
                          <div class="mr-btn-row">
                            <button type="button" class="tg-btn tg-btn-sm" id="mr-btn-rot">↻ ${lang === 'zh' ? '旋转末砖' : 'Rotate Last'}</button>
                            <button type="button" class="tg-btn tg-btn-sm" id="mr-btn-flip">⇄ ${lang === 'zh' ? '直/弯翻转' : 'Flip Track'}</button>
                          </div>
                          <div class="mr-btn-row">
                            <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="mr-btn-undo">↶ ${lang === 'zh' ? '撤销 1 块' : 'Undo'}</button>
                            <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="mr-btn-clear">✕ ${lang === 'zh' ? '清空暂放' : 'Clear'}</button>
                          </div>
                        `
                        : ''
                    }

                    ${
                      isProofMode
                        ? `
                          <button type="button" class="tg-btn tg-btn-gold" id="mr-btn-submit-proof" ${stagedClosesLoop ? '' : 'disabled'}>
                            ✓ ${lang === 'zh' ? '提交闭合环路证明' : 'SUBMIT CLOSED LOOP PROOF'}
                          </button>
                          <button type="button" class="tg-btn tg-btn-garnet" id="mr-btn-concede">
                            ✕ ${lang === 'zh' ? '无法拼出 · 承认不可能' : 'CONCEDE (IMPOSSIBLE)'}
                          </button>
                        `
                        : `
                          <button type="button" class="tg-btn ${stagedClosesLoop ? 'tg-btn-gold' : 'tg-btn-cyan'}" id="mr-btn-commit" ${staged.length > 0 ? '' : 'disabled'}>
                            ${
                              stagedClosesLoop
                                ? lang === 'zh'
                                  ? '🚆 确认闭合 · 绝杀获胜！'
                                  : '🚆 COMMIT & CLOSE LOOP!'
                                : lang === 'zh'
                                ? `确认铺设 (${staged.length}/3 块)`
                                : `Commit Track (${staged.length}/3)`
                            }
                          </button>
                          <button type="button" class="tg-btn tg-btn-garnet mr-impossible-btn" id="mr-btn-impossible" ${canDeclareImpossible ? '' : 'disabled'}>
                            ⚡ ${lang === 'zh' ? '宣告「不可能!」' : 'DECLARE "IMPOSSIBLE!"'}
                          </button>
                        `
                    }
                  </div>
                `
                : `<p style="margin:0;font-size:13px;color:var(--tg-ink-muted);">${
                    state.phase === 'ended'
                      ? lang === 'zh'
                        ? '本场单轨铁路对决已结束。'
                        : 'Monorail Death Match concluded.'
                      : lang === 'zh'
                      ? `等待 ${UI.escapeHtml(activeName)} 铺设轨道…`
                      : `Waiting for ${UI.escapeHtml(activeName)}…`
                  }</p>`
            }
          </div>

          <div class="mr-card">
            <h4 class="mr-card-title">${lang === 'zh' ? '操作提示' : 'Quick Guide'}</h4>
            <ul class="mr-hint-list">
              <li>${lang === 'zh' ? '点击青色虚线格放置暂放轨砖（最多 3 块且须连成直线）。' : 'Click cyan dashed cells to place 1–3 collinear track tiles.'}</li>
              <li>${lang === 'zh' ? '再次点击已暂放的青色轨砖即可顺时针旋转 90°。' : 'Click any staged cyan tile to rotate it 90° clockwise.'}</li>
              <li>${lang === 'zh' ? '发现死局/奇偶悖论时，果断按下「不可能!」逼对手证明！' : 'Spot a dead-end or parity trap? Slam "IMPOSSIBLE!" to force proof.'}</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Bind ghost cell placement
    container.querySelectorAll('.mr-ghost-cell').forEach((g) => {
      g.addEventListener('click', () => {
        if (!isMyTurn) return;
        const x = Number(g.dataset.placeX);
        const y = Number(g.dataset.placeY);
        const shape = suggestAutoShape(
          state.tiles,
          staged,
          x,
          y,
          brushMode === 'auto' ? null : brushMode
        );
        SFX.play('tilePlace');
        staged.push({ x, y, shape });
        renderMonorailGame(container, ctx);
      });
    });

    // Bind staged tile click -> rotate 90° CW
    container.querySelectorAll('.mr-staged-tile').forEach((g) => {
      g.addEventListener('click', () => {
        if (!isMyTurn) return;
        const idx = Number(g.dataset.stagedIdx);
        if (!staged[idx]) return;
        SFX.play('click');
        staged[idx].shape = rotateShapeCW(staged[idx].shape);
        renderMonorailGame(container, ctx);
      });
    });

    // Bind brush buttons
    container.querySelectorAll('[data-brush]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SFX.play('click');
        brushMode = btn.dataset.brush;
        renderMonorailGame(container, ctx);
      });
    });

    // Rotate / Flip / Undo / Clear
    container.querySelector('#mr-btn-rot')?.addEventListener('click', () => {
      if (staged.length === 0) return;
      SFX.play('click');
      const last = staged[staged.length - 1];
      last.shape = rotateShapeCW(last.shape);
      renderMonorailGame(container, ctx);
    });

    container.querySelector('#mr-btn-flip')?.addEventListener('click', () => {
      if (staged.length === 0) return;
      SFX.play('cardFlip');
      const last = staged[staged.length - 1];
      last.shape = flipShapeKind(last.shape);
      renderMonorailGame(container, ctx);
    });

    container.querySelector('#mr-btn-undo')?.addEventListener('click', () => {
      if (staged.length === 0) return;
      SFX.play('click');
      staged.pop();
      renderMonorailGame(container, ctx);
    });

    container.querySelector('#mr-btn-clear')?.addEventListener('click', () => {
      SFX.play('click');
      staged = [];
      renderMonorailGame(container, ctx);
    });

    // Commit turn
    container.querySelector('#mr-btn-commit')?.addEventListener('click', async () => {
      if (!isMyTurn || staged.length === 0) return;
      const placements = staged.map((s) => ({ x: s.x, y: s.y, shape: s.shape }));
      const res = await dispatch({ type: 'PLACE_TILES', payload: { placements } });
      if (!res.ok) {
        SFX.play('error');
        UI.toast(res.reason || 'Invalid tile placement', 'error');
      } else {
        staged = [];
      }
    });

    // Declare IMPOSSIBLE!
    container.querySelector('#mr-btn-impossible')?.addEventListener('click', async () => {
      if (!canDeclareImpossible) return;
      const ok = await UI.confirm(
        lang === 'zh' ? '宣告「不可能!」？' : 'Declare "IMPOSSIBLE!"?',
        lang === 'zh'
          ? '宣告后对手将进入证明模式：若对手能用剩余轨砖拼出合法闭合环路则对手获胜，否则你立即获胜！'
          : 'Your opponent will get one unlimited turn to prove a closed loop exists. If they succeed, they win; otherwise you win!'
      );
      if (!ok) return;
      staged = [];
      const res = await dispatch({ type: 'DECLARE_IMPOSSIBLE' });
      if (!res.ok) {
        SFX.play('error');
        UI.toast(res.reason || 'Cannot declare Impossible', 'error');
      }
    });

    // Proof mode submit / concede
    container.querySelector('#mr-btn-submit-proof')?.addEventListener('click', async () => {
      if (!isMyTurn || !isProofMode) return;
      const placements = staged.map((s) => ({ x: s.x, y: s.y, shape: s.shape }));
      const res = await dispatch({ type: 'SUBMIT_PROOF', payload: { placements } });
      if (!res.ok) {
        SFX.play('error');
        UI.toast(res.reason || 'Proof loop is incomplete', 'error');
      } else {
        staged = [];
      }
    });

    container.querySelector('#mr-btn-concede')?.addEventListener('click', async () => {
      if (!isMyTurn || !isProofMode) return;
      const ok = await UI.confirm(
        lang === 'zh' ? '确认无法拼出闭合环路？' : 'Concede Proof Challenge?',
        lang === 'zh' ? '认输将判宣告「不可能!」的一方获胜。' : 'Conceding awards victory to the player who declared IMPOSSIBLE!'
      );
      if (!ok) return;
      staged = [];
      await dispatch({ type: 'CONCEDE_PROOF' });
    });
  },
});

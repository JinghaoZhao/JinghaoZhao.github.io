/**
 * Tactical Yutnori (전략 윷놀이 / 战略掷柶) — Persistent-SVG Node-Hopping Renderer
 * Zero innerHTML nukes on clicks; step-by-step 110ms Mal hops; staggered 4-stick reveal; Dual Theme.
 */

import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import {
  GameRules,
  BOARD_NODES,
  FINISH_POS,
  getLegalMoveOptions,
} from './rules.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let selectedThrowIdx = 0;
let selectedSource = null; // { sourceKind: 'board', fromPos } | { sourceKind: 'entry', entryRole }
let lastEventSig = null;
let lastRevealSeq = 0;
let lastMoveSeq = 0;
let lastGoalCounts = [0, 0];
let hopGen = 0;
let latestCtx = null;
let latestState = null;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function mountSkeleton(container) {
  container.dataset.mountedGame = 'tactical-yutnori';
  const outerCoords = [20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    .map((id) => `${BOARD_NODES[id].x},${BOARD_NODES[id].y}`)
    .join(' ');
  const diagA = [5, 21, 22, 23, 24, 25, 15]
    .map((id) => `${BOARD_NODES[id].x},${BOARD_NODES[id].y}`)
    .join(' ');
  const diagB = [10, 26, 27, 23, 28, 29, 20]
    .map((id) => `${BOARD_NODES[id].x},${BOARD_NODES[id].y}`)
    .join(' ');

  let staticNodesSvg = '';
  for (const [idStr, node] of Object.entries(BOARD_NODES)) {
    const id = Number(idStr);
    const isCornerOrCenter = node.kind === 'corner' || node.kind === 'center' || node.kind === 'home';
    const r = node.kind === 'center' || node.kind === 'home' ? 22 : isCornerOrCenter ? 19 : 14;
    const circleCls = [
      'ty-node-circle',
      node.kind === 'home' ? 'is-home' : '',
      node.kind === 'center' ? 'is-center' : '',
      node.shortcut && node.kind !== 'center' ? 'is-shortcut' : '',
    ].filter(Boolean).join(' ');

    staticNodesSvg += `<g class="ty-node-ring" data-node-id="${id}">`;
    staticNodesSvg += `<circle class="${circleCls}" cx="${node.x}" cy="${node.y}" r="${r}" stroke-width="${isCornerOrCenter ? 2.4 : 1.7}" />`;
    if (node.kind === 'home') {
      staticNodesSvg += `<text id="ty-home-label" class="ty-node-text-home" x="${node.x}" y="${node.y + 4}" text-anchor="middle">GOAL</text>`;
    } else if (node.kind === 'center') {
      staticNodesSvg += `<text class="ty-node-text-center" x="${node.x}" y="${node.y + 5}" text-anchor="middle">★</text>`;
    } else if (id === 1) {
      staticNodesSvg += `<text class="ty-node-text-n1" x="${node.x + 25}" y="${node.y + 4}" text-anchor="start">1</text>`;
    }
    staticNodesSvg += `</g>`;
  }

  container.innerHTML = `
    <div class="ty-arena">
      <div class="ty-banner">
        <div class="ty-team-scores">
          <div class="ty-team-pill is-p0" id="ty-pill-0">
            <span class="ty-swatch"></span>
            <span id="ty-name-0"></span>
            <span class="ty-goal-badge">♛ <span id="ty-goal-0">0</span>/2</span>
          </div>
          <div class="ty-team-pill is-p1" id="ty-pill-1">
            <span class="ty-swatch"></span>
            <span id="ty-name-1"></span>
            <span class="ty-goal-badge">♛ <span id="ty-goal-1">0</span>/2</span>
          </div>
        </div>
        <span class="tg-badge tg-badge-gold" id="ty-turn-badge"></span>
      </div>

      <div class="ty-flash-banner" id="ty-flash-banner" hidden></div>

      <div class="ty-board-shell" id="ty-board-shell">
        <svg class="ty-board-svg" id="ty-board-svg" viewBox="0 0 500 500" role="img" aria-label="Tactical Yutnori 29-node board">
          <defs>
            <linearGradient id="ty-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff0c2" />
              <stop offset="100%" stop-color="#d49b35" />
            </linearGradient>
            <radialGradient id="ty-mal-p0" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stop-color="#ff5a7a" />
              <stop offset="55%" stop-color="#c61131" />
              <stop offset="100%" stop-color="#6b0618" />
            </radialGradient>
            <radialGradient id="ty-mal-p1" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="55%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#083344" />
            </radialGradient>
            <filter id="ty-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.45" />
            </filter>
            <marker id="ty-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path class="ty-arrow-head" d="M 0 1 L 7 4 L 0 7 Z" />
            </marker>
          </defs>
          <path class="ty-arrow-line" d="M 462 396 L 462 325" stroke-width="2" marker-end="url(#ty-arrow)" />
          <polyline class="ty-track-outer" points="${outerCoords}" />
          <polyline class="ty-track-diag" points="${diagA}" />
          <polyline class="ty-track-diag" points="${diagB}" />
          <g id="ty-nodes-layer">${staticNodesSvg}</g>
          <g id="ty-dest-layer"></g>
          <g id="ty-mals-layer"></g>
          <g id="ty-finish-layer"></g>
        </svg>
      </div>

      <div class="ty-console">
        <div class="ty-card" id="ty-reveal-card">
          <h4 class="ty-card-title">
            <span id="ty-title-reveal"></span>
            <span id="ty-sub-reveal" style="font-family:var(--tg-font-mono);font-size:11px;color:var(--tg-ink-muted);"></span>
          </h4>
          <div class="ty-sticks-stage" id="ty-sticks-stage"></div>
          <div class="ty-reveal-summary" id="ty-reveal-summary" hidden>
            <span class="ty-reveal-result" id="ty-reveal-result"></span>
            <span class="tg-badge" id="ty-reveal-badge"></span>
          </div>
          <div class="ty-matrix-hint" id="ty-matrix-hint" style="margin-top:10px;"></div>
        </div>

        <div class="ty-card" id="ty-stick-card">
          <h4 class="ty-card-title">
            <span id="ty-title-pick"></span>
            <span class="tg-badge" id="ty-role-badge"></span>
          </h4>
          <p id="ty-pick-prompt" style="margin:0 0 11px;font-size:12.5px;color:var(--tg-ink-muted);"></p>
          <div class="ty-stick-picker" id="ty-stick-picker">
            ${[
              { flats: 0, s: [0, 0] },
              { flats: 1, s: [1, 0] },
              { flats: 2, s: [1, 1] },
            ]
              .map(
                (ch) => `
              <button type="button" class="ty-pick-card" data-flats="${ch.flats}">
                <div class="ty-mini-sticks">
                  <span class="ty-mini-stick ${ch.s[0] ? 'is-flat' : 'is-round'}"></span>
                  <span class="ty-mini-stick ${ch.s[1] ? 'is-flat' : 'is-round'}"></span>
                </div>
                <span class="ty-pick-label" data-pick-label="${ch.flats}"></span>
                <span class="ty-pick-sub" data-pick-sub="${ch.flats}"></span>
              </button>
            `
              )
              .join('')}
          </div>
          <p id="ty-opp-locked" style="margin:10px 0 0;font-size:11.5px;color:var(--tg-cyan-ink);font-family:var(--tg-font-mono);" hidden></p>
        </div>

        <div class="ty-card" id="ty-move-card" hidden>
          <h4 class="ty-card-title">
            <span id="ty-title-throws"></span>
            <span class="tg-badge tg-badge-gold" id="ty-mover-badge"></span>
          </h4>
          <div class="ty-throws-row" id="ty-throws-row"></div>
          <p id="ty-move-prompt" style="margin:0 0 10px;font-size:12.5px;color:var(--tg-ink-muted);"></p>
          <div id="ty-entry-row" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <div class="ty-card">
          <h4 class="ty-card-title" id="ty-title-roster"></h4>
          <div class="ty-roster-docks">
            <div class="ty-dock-box">
              <div class="ty-dock-box-head"><span id="ty-dock-name-0"></span><span id="ty-dock-col-0"></span></div>
              <div class="ty-mal-pills" id="ty-dock-pills-0"></div>
            </div>
            <div class="ty-dock-box">
              <div class="ty-dock-box-head"><span id="ty-dock-name-1"></span><span id="ty-dock-col-1"></span></div>
              <div class="ty-mal-pills" id="ty-dock-pills-1"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind permanent 3-card stick picker buttons once
  container.querySelectorAll('.ty-pick-card').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const state = latestState;
      const ctx = latestCtx;
      if (!state || !ctx || state.phase !== 'STICK_SELECT' || ctx.isSpectator) return;
      const mySeat = state.seats.find((s) => s.seatId === ctx.activeSeatId);
      if (!mySeat || state.stickChoices[mySeat.owner] !== null) return;
      const flats = Number(btn.dataset.flats);
      SFX.play('click');
      Motion.pulseConfirm(btn, { tone: 'cyan', duration: 220 });
      const res = await ctx.dispatch({ type: 'SELECT_STICKS', payload: { flats } });
      if (!res.ok) {
        SFX.play('error');
        Motion.nudgeError(btn, { intensity: 'subtle' });
        UI.toast(res.reason || 'Cannot select sticks', 'error');
      }
    });
  });
}

function getMoveContext(state, ctx) {
  const mySeat = state.seats.find((s) => s.seatId === ctx.activeSeatId);
  const myOwner = mySeat ? mySeat.owner : -1;
  const isMovePhase = state.phase === 'MOVE';
  const isMyMoveTurn = isMovePhase && !ctx.isSpectator && myOwner === state.turnOwner;
  const legalOptions = isMyMoveTurn ? getLegalMoveOptions(state, myOwner, selectedThrowIdx) : [];
  return { myOwner, isMovePhase, isMyMoveTurn, legalOptions };
}

/**
 * Animates an SVG Mal group step-by-step along `pathNodes` (110ms per node hop).
 * Skips immediately when Motion.reduced() is true, and is 100% interruptible via hopGen.
 */
function animateMalHop(malGroupEl, pathNodes) {
  if (!malGroupEl || !Array.isArray(pathNodes) || pathNodes.length < 2) return;
  const validCoords = pathNodes
    .map((id) => BOARD_NODES[id])
    .filter(Boolean);
  if (validCoords.length < 2) return;

  const finalPt = validCoords[validCoords.length - 1];
  if (Motion.reduced() || typeof malGroupEl.animate !== 'function') {
    malGroupEl.setAttribute('transform', `translate(${finalPt.x}, ${finalPt.y})`);
    return;
  }

  const gen = ++hopGen;
  const stepMs = 110;
  let stepIdx = 0;

  const runNextHop = () => {
    if (hopGen !== gen || stepIdx >= validCoords.length - 1) {
      malGroupEl.setAttribute('transform', `translate(${finalPt.x}, ${finalPt.y})`);
      return;
    }
    const a = validCoords[stepIdx];
    const b = validCoords[stepIdx + 1];
    stepIdx++;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2 - 12;

    const anim = malGroupEl.animate(
      [
        { transform: `translate(${a.x}px, ${a.y}px) scale(1)` },
        { transform: `translate(${midX}px, ${midY}px) scale(1.12)`, offset: 0.5 },
        { transform: `translate(${b.x}px, ${b.y}px) scale(1)` },
      ],
      { duration: stepMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    );
    anim.onfinish = () => {
      if (hopGen !== gen) return;
      malGroupEl.setAttribute('transform', `translate(${b.x}, ${b.y})`);
      anim.cancel();
      runNextHop();
    };
  };

  malGroupEl.setAttribute('transform', `translate(${validCoords[0].x}, ${validCoords[0].y})`);
  runNextHop();
}

/**
 * In-place interactive board & throw-chip patcher (zero DOM rebuild on clicks!)
 */
function patchBoardInteractivity(container, state, ctx, animateMoveInfo = null) {
  const { isMyMoveTurn, legalOptions } = getMoveContext(state, ctx);
  const lang = ctx.lang;

  // Validate current selection
  if (selectedSource) {
    const stillValid = legalOptions.some((o) =>
      selectedSource.sourceKind === 'entry'
        ? o.sourceKind === 'entry' && o.entryRole === selectedSource.entryRole
        : o.sourceKind === 'board' && o.fromPos === selectedSource.fromPos
    );
    if (!stillValid) selectedSource = null;
  }

  const stacksByPos = new Map();
  for (let o = 0; o < 2; o++) {
    for (const m of state.mals[o]) {
      if (m.pos >= 1 && m.pos <= 29) {
        if (!stacksByPos.has(m.pos)) stacksByPos.set(m.pos, { owner: o, mals: [] });
        stacksByPos.get(m.pos).mals.push(m);
      }
    }
  }

  const activeDests = new Map();
  if (isMyMoveTurn && selectedSource) {
    for (const opt of legalOptions) {
      const match =
        selectedSource.sourceKind === 'entry'
          ? opt.sourceKind === 'entry' && opt.entryRole === selectedSource.entryRole
          : opt.sourceKind === 'board' && opt.fromPos === selectedSource.fromPos;
      if (match) activeDests.set(opt.toPos, opt);
    }
  }

  const movablePositions = new Set(
    isMyMoveTurn ? legalOptions.filter((o) => o.sourceKind === 'board').map((o) => o.fromPos) : []
  );

  // Patch Destination Highlight Rings layer
  const destLayer = container.querySelector('#ty-dest-layer');
  destLayer.textContent = '';
  for (const [id] of activeDests.entries()) {
    if (id === FINISH_POS) continue;
    const node = BOARD_NODES[id];
    if (!node) continue;
    const isCornerOrCenter = node.kind === 'corner' || node.kind === 'center' || node.kind === 'home';
    const r = node.kind === 'center' || node.kind === 'home' ? 22 : isCornerOrCenter ? 19 : 14;
    const destStack = stacksByPos.get(id);
    const isCaptureDest = Boolean(destStack && destStack.owner !== state.turnOwner);
    const ring = svgEl('circle', {
      cx: node.x,
      cy: node.y,
      r: r + 9,
      class: `ty-dest-pulse ${isCaptureDest ? 'is-capture' : ''}`,
    });
    ring.addEventListener('click', () => executeMove(container));
    destLayer.appendChild(ring);
  }

  // Patch Finish Goal button layer
  const finishLayer = container.querySelector('#ty-finish-layer');
  finishLayer.textContent = '';
  if (activeDests.has(FINISH_POS)) {
    const g = svgEl('g', { class: 'ty-node-interactive' });
    g.appendChild(
      svgEl('rect', {
        x: 366, y: 458, width: 124, height: 32, rx: 16,
        fill: 'url(#ty-grad-gold)', stroke: '#fff6d9', 'stroke-width': 2,
      })
    );
    const txt = svgEl('text', {
      x: 428, y: 478, 'text-anchor': 'middle',
      fill: '#120c04', 'font-size': 12, 'font-weight': 900,
    });
    txt.textContent = lang === 'zh' ? '★ 冲线得分！' : '★ SCORE GOAL!';
    g.appendChild(txt);
    g.addEventListener('click', () => executeMove(container));
    finishLayer.appendChild(g);
  }

  // Patch Mals layer (centered at 0,0 inside translate(x,y) so step-by-step hop animates cleanly!)
  const malsLayer = container.querySelector('#ty-mals-layer');
  malsLayer.textContent = '';
  let hopTargetEl = null;

  for (const [pos, group] of stacksByPos.entries()) {
    const node = BOARD_NODES[pos];
    const hasCand = group.mals.some((m) => m.role === 'candidate');
    const count = group.mals.length;
    const isSel = selectedSource?.sourceKind === 'board' && selectedSource.fromPos === pos;
    const isMovable = movablePositions.has(pos);
    const isDest = activeDests.has(pos);

    const g = svgEl('g', {
      class: 'ty-mal-group',
      transform: `translate(${node.x}, ${node.y})`,
      style: isDest || isMovable ? 'cursor:pointer;' : '',
    });

    const fill = group.owner === 0 ? 'url(#ty-mal-p0)' : 'url(#ty-mal-p1)';
    const rim = hasCand ? '#fff0c2' : '#cbd5e1';

    if (isSel) {
      g.appendChild(
        svgEl('circle', {
          cx: 0, cy: 0, r: 23, fill: 'none', stroke: 'var(--tg-gold-bright)',
          'stroke-width': 3, 'stroke-dasharray': '5 3',
        })
      );
    }
    if (count > 1) {
      g.appendChild(
        svgEl('circle', {
          cx: 3, cy: -4, r: 15, fill, stroke: rim, 'stroke-width': 1.6, opacity: 0.72,
        })
      );
    }
    g.appendChild(
      svgEl('circle', {
        cx: 0, cy: 0, r: 16, fill, stroke: rim, 'stroke-width': hasCand ? 2.8 : 1.8, filter: 'url(#ty-shadow)',
      })
    );
    const glyph = svgEl('text', {
      x: 0, y: 4.5, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 12, 'font-weight': 900,
    });
    glyph.textContent = hasCand ? '♛' : '●';
    g.appendChild(glyph);

    if (count > 1) {
      g.appendChild(svgEl('rect', { class: 'ty-stack-badge-bg', x: 8, y: -21, width: 24, height: 16, rx: 8 }));
      const bTxt = svgEl('text', { class: 'ty-stack-badge-text', x: 20, y: -10, 'text-anchor': 'middle' });
      bTxt.textContent = `×${count}`;
      g.appendChild(bTxt);
    }

    if (isDest) {
      g.addEventListener('click', () => executeMove(container));
    } else if (isMovable) {
      g.addEventListener('click', () => {
        SFX.play('click');
        if (selectedSource?.sourceKind === 'board' && selectedSource.fromPos === pos) {
          selectedSource = null;
        } else {
          selectedSource = { sourceKind: 'board', fromPos: pos };
        }
        patchBoardInteractivity(container, latestState, latestCtx);
      });
    }

    if (animateMoveInfo && animateMoveInfo.toPos === pos && animateMoveInfo.owner === group.owner) {
      hopTargetEl = g;
    }

    malsLayer.appendChild(g);
  }

  if (hopTargetEl && animateMoveInfo?.pathNodes) {
    animateMalHop(hopTargetEl, animateMoveInfo.pathNodes);
  }

  // Patch throw chips & entry buttons active highlights in place
  container.querySelectorAll('#ty-throws-row .ty-throw-chip').forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.throwIdx) === selectedThrowIdx);
  });

  const entryRow = container.querySelector('#ty-entry-row');
  if (entryRow) {
    entryRow.textContent = '';
    if (isMyMoveTurn) {
      const canEnterCand = legalOptions.some((o) => o.sourceKind === 'entry' && o.entryRole === 'candidate');
      const canEnterPart = legalOptions.some((o) => o.sourceKind === 'entry' && o.entryRole === 'partner');
      const addEntryBtn = (role, label) => {
        const isSel = selectedSource?.sourceKind === 'entry' && selectedSource.entryRole === role;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `tg-btn tg-btn-sm ${isSel ? 'tg-btn-gold' : role === 'candidate' ? 'tg-btn-cyan' : ''}`;
        b.textContent = label;
        b.addEventListener('click', () => {
          SFX.play('click');
          if (selectedSource?.sourceKind === 'entry' && selectedSource.entryRole === role) {
            selectedSource = null;
          } else {
            selectedSource = { sourceKind: 'entry', entryRole: role };
          }
          patchBoardInteractivity(container, latestState, latestCtx);
        });
        entryRow.appendChild(b);
      };
      if (canEnterCand) addEntryBtn('candidate', lang === 'zh' ? '♛ 派出主将棋入场' : '♛ Enter Candidate Mal');
      if (canEnterPart) addEntryBtn('partner', lang === 'zh' ? '● 派出搭档棋入场' : '● Enter Partner Mal');
    }
  }

  const movePrompt = container.querySelector('#ty-move-prompt');
  if (movePrompt) {
    const activeName = state.seats[state.turnOwner]?.name || '';
    movePrompt.textContent = isMyMoveTurn
      ? selectedSource
        ? lang === 'zh'
          ? '请点击棋盘上青色/绯红高亮的目标格完成移动！'
          : 'Tap the glowing destination node on the board to move!'
        : lang === 'zh'
        ? '选择下方新入场棋子，或点击棋盘上已有己方棋子：'
        : 'Enter a waiting Mal below, or click one of your Mals on the board:'
      : lang === 'zh'
      ? `等待 ${activeName} 走棋…`
      : `Waiting for ${activeName} to move…`;
  }
}

async function executeMove(container) {
  const state = latestState;
  const ctx = latestCtx;
  if (!state || !ctx || !selectedSource) return;
  const payload =
    selectedSource.sourceKind === 'entry'
      ? { throwIdx: selectedThrowIdx, sourceKind: 'entry', entryRole: selectedSource.entryRole }
      : { throwIdx: selectedThrowIdx, sourceKind: 'board', fromPos: selectedSource.fromPos };
  selectedSource = null;
  const res = await ctx.dispatch({ type: 'MOVE_MAL', payload });
  if (!res.ok) {
    SFX.play('error');
    Motion.nudgeError(container.querySelector('#ty-board-shell'), { intensity: 'subtle' });
    UI.toast(res.reason || 'Illegal move', 'error');
  }
}

mountGame({
  config: {
    id: 'tactical-yutnori',
    title: { zh: '战略掷柶', en: 'Tactical Yutnori', ko: '전략 윷놀이' },
    seasons: ['S1', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    rulesSummary: {
      zh: `### 战略掷柶（S1E3 · S1E4 · S1E10 · S4E2）
零运气的心理博弈版韩国掷柶！双方各率领**主将（♛ 金边 ×2）**与**搭档（● 银边 ×2）**。

### 同时秘密择柶（4根合成步数）
- 每轮掷柶时，攻守双方**同时秘密选择 0 / 1 / 2 根平面柶木**，相加总数决定结果：
  - **1 平（倒退猪）**：后退 1 格（全盘所有“猪”均为倒退猪！从 1 号格退回起点即算绕完一圈，下一次前进直接冲线！）
  - **2 平（狗）**：前进 2 格
  - **3 平（羊）**：前进 3 格
  - **4 平（牛）**：前进 4 格 + **连掷奖励**
  - **0 平（马）**：前进 5 格 + **连掷奖励**

### 叠棋、吃子与胜负
- 落在己方棋子上可**叠棋 (×2/×3)** 并肩移动；落在敌方棋子上可将其**击回起点**并获 1 次奖励掷柶（以牛/马吃子时不额外叠加）。
- **率先将己方 2 枚主将棋子（♛）送过终点线者立即获胜！**（搭档棋子仅作掩护/叠棋/抓捕之用，不计入胜利条件。）`,
      en: `### Tactical Yutnori (S1E3 · S1E4 · S1E10 · S4E2)
Zero-luck psychological Korean Yutnori! Each side commands **2 Candidate Mals (♛ Gold)** and **2 Partner Support Mals (● Silver)**.

### Simultaneous 4-Stick Throw
- Before every move, BOTH teams secretly choose **0, 1, or 2 Flat sticks**. Total Flats (0–4) determine the throw:
  - **1 Flat → Back-Do (-1)**: Move 1 step backward! (Stepping back from Node 1 onto Goal completes a full lap!)
  - **2 Flats → Gae (+2)** | **3 Flats → Geol (+3)**
  - **4 Flats → Yut (+4 + Bonus Throw)** | **0 Flats → Mo (+5 + Bonus Throw)**

### Stacking, Captures & Victory
- Landing on your own Mal stacks them (**×2, ×3**) to move together; landing on an enemy stack sends all of them off-board and grants 1 Bonus Throw (does not stack with Yut/Mo bonus).
- **First side to finish BOTH Candidate Mals (♛) wins immediately!**`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, activeSeatId, lang, lastEvent, setTelemetry } = ctx;
    if (!state) return;

    latestCtx = ctx;
    latestState = state;

    const firstMount = container.dataset.mountedGame !== 'tactical-yutnori';
    if (firstMount) {
      mountSkeleton(container);
      lastRevealSeq = 0;
      lastMoveSeq = 0;
      lastGoalCounts = [0, 0];
    }

    if (lastEvent && lastEvent !== lastEventSig) {
      lastEventSig = lastEvent;
      if (lastEvent.type === 'YUT_MO_BONUS' || lastEvent.type === 'CAPTURE_BONUS_TURN') {
        SFX.play('combo');
      } else if (lastEvent.type === 'CAPTURE') {
        SFX.play('clash');
      } else if (lastEvent.type === 'MAL_SCORED' || lastEvent.type === 'MAL_FINISH_WIN') {
        SFX.play('garnetClink');
      } else if (lastEvent.type === 'STICKS_REVEALED') {
        SFX.play('cardFlip');
      } else if (lastEvent.type === 'BACK_DO_WASTED') {
        SFX.play('error');
        Motion.nudgeError(container.querySelector('#ty-reveal-card'), { intensity: 'subtle' });
      } else if (lastEvent.type === 'MAL_MOVE') {
        SFX.play('tilePlace');
      }
      selectedSource = null;
      selectedThrowIdx = 0;
    }

    if (selectedThrowIdx >= state.pendingThrows.length) {
      selectedThrowIdx = 0;
    }

    setTelemetry({ round: state.round, phase: state.phaseLabel });

    // Patch header scores with Motion.animateNumber
    const goals = [
      state.mals[0].filter((m) => m.role === 'candidate' && m.pos === FINISH_POS).length,
      state.mals[1].filter((m) => m.role === 'candidate' && m.pos === FINISH_POS).length,
    ];
    for (let o = 0; o < 2; o++) {
      container.querySelector(`#ty-name-${o}`).textContent = state.seats[o].name;
      container.querySelector(`#ty-pill-${o}`).classList.toggle('is-active', state.turnOwner === o);
      const gEl = container.querySelector(`#ty-goal-${o}`);
      if (lastGoalCounts[o] !== goals[o]) {
        Motion.animateNumber(gEl, lastGoalCounts[o], goals[o], { duration: 280 });
        Motion.pulseConfirm(container.querySelector(`#ty-pill-${o}`), { tone: 'gold' });
        lastGoalCounts[o] = goals[o];
      } else {
        gEl.textContent = String(goals[o]);
      }
    }

    container.querySelector('#ty-turn-badge').textContent =
      lang === 'zh'
        ? `第 ${state.round} 轮 · ${state.phaseLabel.zh}`
        : `TURN ${state.round} · ${state.phaseLabel.en}`;

    const homeLabel = container.querySelector('#ty-home-label');
    if (homeLabel) homeLabel.textContent = lang === 'zh' ? '起点' : 'GOAL';

    // Capture / Bonus Flash Banner
    const flashEl = container.querySelector('#ty-flash-banner');
    let flashMsg = '';
    if (state.lastMoveInfo?.capturedCount > 0 && state.phase !== 'ended') {
      flashMsg =
        lang === 'zh'
          ? `⚡ ${state.seats[state.lastMoveInfo.owner].name} 击飞敌方 ${state.lastMoveInfo.capturedCount} 枚棋子！${state.lastMoveInfo.earnedCaptureBonus ? '获得额外奖励回合！' : ''}`
          : `⚡ ${state.seats[state.lastMoveInfo.owner].name} CAPTURED ${state.lastMoveInfo.capturedCount} enemy Mal(s)!${state.lastMoveInfo.earnedCaptureBonus ? ' BONUS THROW GRANTED!' : ''}`;
    } else if (state.lastReveal?.bonusTriggered && state.phase === 'STICK_SELECT') {
      flashMsg =
        lang === 'zh'
          ? `🔥 ${state.seats[state.turnOwner].name} 掷出 ${state.lastReveal.spec.zh}！触发连掷奖励！`
          : `🔥 ${state.seats[state.turnOwner].name} rolled ${state.lastReveal.spec.en}! BONUS THROW!`;
    }
    if (flashMsg) flashEl.textContent = flashMsg;
    Motion.transitionPresence(flashEl, Boolean(flashMsg), { preset: 'pill' });

    // Staggered 4-stick reveal display (only re-animate when throwSeq advances!)
    container.querySelector('#ty-title-reveal').textContent = lang === 'zh' ? '柶木合投结果' : '4-Stick Reveal';
    container.querySelector('#ty-sub-reveal').textContent = lang === 'zh' ? '总平面数决定步数' : 'Total Flats = Throw';

    const sticksStage = container.querySelector('#ty-sticks-stage');
    const revSummary = container.querySelector('#ty-reveal-summary');
    const rev = state.lastReveal;
    if (!rev) {
      sticksStage.innerHTML = `<span style="color:var(--tg-ink-muted);font-size:13px;">${
        lang === 'zh' ? '等待双方同时秘密选择 2 根柶木…' : 'Awaiting simultaneous 2-stick lock from both teams…'
      }</span>`;
      revSummary.hidden = true;
    } else {
      const isFreshReveal = rev.seq !== lastRevealSeq;
      if (isFreshReveal || sticksStage.dataset.lang !== lang) {
        lastRevealSeq = rev.seq;
        sticksStage.dataset.lang = lang;
        const sticks = [
          { flat: 0 < rev.activeFlats, tag: lang === 'zh' ? '攻' : 'ATK' },
          { flat: 1 < rev.activeFlats, tag: lang === 'zh' ? '攻' : 'ATK' },
          { flat: 0 < rev.defFlats, tag: lang === 'zh' ? '守' : 'DEF' },
          { flat: 1 < rev.defFlats, tag: lang === 'zh' ? '守' : 'DEF' },
        ];
        sticksStage.innerHTML = sticks
          .map(
            (st, idx) => `
            <div class="ty-stick-wrap">
              <div class="ty-stick ${st.flat ? 'is-flat' : 'is-round'} ${isFreshReveal ? 'is-flipping' : ''}" style="${isFreshReveal ? `animation-delay:${idx * 60}ms;` : ''}">
                ${st.flat ? '<span class="ty-stick-x">✕</span><span class="ty-stick-x">✕</span><span class="ty-stick-x">✕</span>' : ''}
              </div>
              <span class="ty-stick-owner">${st.tag}·${st.flat ? (lang === 'zh' ? '平' : 'F') : (lang === 'zh' ? '弧' : 'R')}</span>
            </div>
          `
          )
          .join('');
      }
      revSummary.hidden = false;
      container.querySelector('#ty-reveal-result').textContent = lang === 'zh' ? rev.spec.zh : rev.spec.en;
      const badge = container.querySelector('#ty-reveal-badge');
      badge.className = `tg-badge ${rev.wasted ? 'tg-badge-garnet' : rev.bonusTriggered ? 'tg-badge-gold' : 'tg-badge-cyan'}`;
      badge.textContent = rev.wasted
        ? lang === 'zh'
          ? '场上无棋 · 倒退猪作废'
          : 'NO MAL · WASTED'
        : rev.bonusTriggered
        ? lang === 'zh'
          ? '连掷奖励 +1！'
          : 'BONUS THROW +1!'
        : `${rev.totalFlats} ${lang === 'zh' ? '平' : 'Flat'} / ${4 - rev.totalFlats} ${lang === 'zh' ? '弧' : 'Round'}`;
    }

    // Matrix hint strip (update only on lang change)
    const matHint = container.querySelector('#ty-matrix-hint');
    if (matHint.dataset.lang !== lang) {
      matHint.dataset.lang = lang;
      matHint.innerHTML = `
        <div class="ty-matrix-cell"><strong>0 ${lang === 'zh' ? '平' : 'F'}</strong>${lang === 'zh' ? '马 +5★' : 'Mo +5★'}</div>
        <div class="ty-matrix-cell"><strong>1 ${lang === 'zh' ? '平' : 'F'}</strong>${lang === 'zh' ? '倒猪 -1' : 'Back -1'}</div>
        <div class="ty-matrix-cell"><strong>2 ${lang === 'zh' ? '平' : 'F'}</strong>${lang === 'zh' ? '狗 +2' : 'Gae +2'}</div>
        <div class="ty-matrix-cell"><strong>3 ${lang === 'zh' ? '平' : 'F'}</strong>${lang === 'zh' ? '羊 +3' : 'Geol +3'}</div>
        <div class="ty-matrix-cell"><strong>4 ${lang === 'zh' ? '平' : 'F'}</strong>${lang === 'zh' ? '牛 +4★' : 'Yut +4★'}</div>
      `;
    }

    // Toggle Stick Picker vs Move Card cleanly without destroying elements
    const mySeat = state.seats.find((s) => s.seatId === activeSeatId);
    const myOwner = mySeat ? mySeat.owner : -1;
    const isStickPhase = state.phase === 'STICK_SELECT';
    const isMovePhase = state.phase === 'MOVE';
    const canPickSticks = isStickPhase && !ctx.isSpectator && myOwner !== -1 && state.stickChoices[myOwner] === null;
    const activeName = state.seats[state.turnOwner]?.name || '';

    const stickCard = container.querySelector('#ty-stick-card');
    const moveCard = container.querySelector('#ty-move-card');
    stickCard.hidden = !isStickPhase;
    moveCard.hidden = !isMovePhase;

    if (isStickPhase) {
      container.querySelector('#ty-title-pick').textContent = lang === 'zh' ? '秘密择柶（2 根）' : 'Secret Stick Pick (2)';
      const roleBadge = container.querySelector('#ty-role-badge');
      roleBadge.className = `tg-badge ${myOwner === state.turnOwner ? 'tg-badge-gold' : 'tg-badge-cyan'}`;
      roleBadge.textContent =
        myOwner === state.turnOwner
          ? lang === 'zh'
            ? '本轮进攻方'
            : 'ACTIVE MOVER'
          : myOwner !== -1
          ? lang === 'zh'
            ? '本轮防守方'
            : 'DEFENDING'
          : lang === 'zh'
          ? '观战'
          : 'SPECTATING';

      const myChoice = myOwner !== -1 ? state.stickChoices[myOwner] : null;
      const oppChoice = myOwner !== -1 ? state.stickChoices[1 - myOwner] : null;

      container.querySelector('#ty-pick-prompt').textContent = canPickSticks
        ? lang === 'zh'
          ? `本轮由 ${activeName} 走棋。秘密锁定你的 2 根柶木：`
          : `${activeName} will move. Lock your 2 sticks secretly:`
        : myChoice !== null
        ? lang === 'zh'
          ? '已锁定你的柶木，等待对手锁定…'
          : 'Your sticks are locked. Waiting for opponent…'
        : lang === 'zh'
        ? '等待双方秘密锁定柶木…'
        : 'Waiting for both teams to lock sticks…';

      const labels = [
        { zh: '0 平 · 2 弧', en: '0 Flat (R+R)', subZh: '可凑 马/猪/狗', subEn: 'Mo / Back / Gae' },
        { zh: '1 平 · 1 弧', en: '1 Flat (F+R)', subZh: '防牛防马 · 稳健', subEn: 'Blocks Yut & Mo' },
        { zh: '2 平 · 0 弧', en: '2 Flat (F+F)', subZh: '可凑 狗/羊/牛', subEn: 'Gae / Geol / Yut' },
      ];
      container.querySelectorAll('.ty-pick-card').forEach((btn) => {
        const f = Number(btn.dataset.flats);
        btn.disabled = !canPickSticks;
        btn.classList.toggle('is-chosen', myChoice === f);
        btn.querySelector(`[data-pick-label="${f}"]`).textContent = lang === 'zh' ? labels[f].zh : labels[f].en;
        btn.querySelector(`[data-pick-sub="${f}"]`).textContent = lang === 'zh' ? labels[f].subZh : labels[f].subEn;
      });

      const oppLockedEl = container.querySelector('#ty-opp-locked');
      oppLockedEl.hidden = oppChoice !== 'LOCKED';
      oppLockedEl.textContent = lang === 'zh' ? '✓ 对手已锁定柶木！' : '✓ Opponent has locked their sticks!';
    }

    if (isMovePhase) {
      container.querySelector('#ty-title-throws').textContent = lang === 'zh' ? '待执行步数' : 'Available Throws';
      container.querySelector('#ty-mover-badge').textContent = activeName;
      const isMyMoveTurn = !ctx.isSpectator && myOwner === state.turnOwner;

      const throwsRow = container.querySelector('#ty-throws-row');
      throwsRow.textContent = '';
      state.pendingThrows.forEach((th, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `ty-throw-chip ${idx === selectedThrowIdx ? 'is-active' : ''} ${th.steps < 0 ? 'is-backdo' : ''}`;
        b.dataset.throwIdx = String(idx);
        b.disabled = !isMyMoveTurn;
        b.textContent = lang === 'zh' ? th.zh : th.en;
        b.addEventListener('click', () => {
          if (!isMyMoveTurn) return;
          SFX.play('click');
          selectedThrowIdx = idx;
          selectedSource = null;
          patchBoardInteractivity(container, latestState, latestCtx);
        });
        throwsRow.appendChild(b);
      });
    }

    // Patch Roster Docks
    container.querySelector('#ty-title-roster').textContent =
      lang === 'zh' ? '双方棋子状态（仅 ♛ 主将计胜）' : 'Mal Roster (Only ♛ Candidates Score)';
    for (let o = 0; o < 2; o++) {
      container.querySelector(`#ty-dock-name-${o}`).textContent = state.seats[o].name;
      container.querySelector(`#ty-dock-col-${o}`).textContent =
        o === 0 ? (lang === 'zh' ? '绯红' : 'RED') : lang === 'zh' ? '电光青' : 'CYAN';
      const pillsEl = container.querySelector(`#ty-dock-pills-${o}`);
      pillsEl.innerHTML = state.mals[o]
        .map((m) => {
          const st =
            m.pos === FINISH_POS
              ? lang === 'zh'
                ? '已冲线'
                : 'GOAL'
              : m.pos === -1
              ? lang === 'zh'
                ? '待命'
                : 'READY'
              : `#${m.pos}`;
          return `<span class="ty-mal-pill ${m.role === 'candidate' ? 'is-cand' : ''} ${m.pos === FINISH_POS ? 'is-done' : ''}">${m.role === 'candidate' ? '♛' : '●'} ${st}</span>`;
        })
        .join('');
    }

    // Check if a new Mal move just occurred to trigger step-by-step node hop!
    let animateMoveInfo = null;
    if (state.lastMoveInfo && state.lastMoveInfo.seq !== lastMoveSeq) {
      lastMoveSeq = state.lastMoveInfo.seq;
      animateMoveInfo = state.lastMoveInfo;
    }

    patchBoardInteractivity(container, state, ctx, animateMoveInfo);
  },
});

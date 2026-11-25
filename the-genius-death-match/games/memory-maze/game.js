/**
 * Memory Maze (记忆迷宫) — Persistent 7×7 Broadcast Matrix + GPU Token Glides
 * Zero innerHTML nukes on moves; Motion.nudgeError / pulseConfirm / animateNumber / transitionPresence.
 */

import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import { GameRules, GRID_SIZE, parseEdgeKey, DIRS } from './rules.js';

let lastPlayedEventKey = null;
let keyHandlerBound = false;
let latestCtx = null;

// Persistent DOM refs & numeric caches for incremental patching
let refs = null;
let prevMetrics = { discovered: 0, dist: {}, hits: {} };

function edgeToSvgCoords(edgeKey) {
  const { r1, c1, r2, c2 } = parseEdgeKey(edgeKey);
  if (r1 === r2) {
    const x = Math.max(c1, c2) * 100;
    const y1 = r1 * 100 + 8;
    const y2 = (r1 + 1) * 100 - 8;
    return { x1: x, y1, x2: x, y2 };
  }
  const y = Math.max(r1, r2) * 100;
  const x1 = c1 * 100 + 8;
  const x2 = (c1 + 1) * 100 - 8;
  return { x1, y1: y, x2, y2: y };
}

function bindKeyboardOnce() {
  if (keyHandlerBound) return;
  keyHandlerBound = true;
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!latestCtx || !latestCtx.state) return;
    const { state, activeSeatId, isSpectator, dispatch } = latestCtx;
    if (isSpectator || state.phase !== 'MOVING' || state.currentTurnSeatId !== activeSeatId) return;

    const map = {
      ArrowUp: 'UP',
      KeyW: 'UP',
      ArrowDown: 'DOWN',
      KeyS: 'DOWN',
      ArrowLeft: 'LEFT',
      KeyA: 'LEFT',
      ArrowRight: 'RIGHT',
      KeyD: 'RIGHT',
    };
    const dir = map[e.code];
    if (dir) {
      e.preventDefault();
      dispatch({ type: 'STEP', payload: { dir } });
    } else if (e.code === 'Space' && state.stepsTakenThisTurn === 0 && !state.usedDoubleThisTurn) {
      e.preventDefault();
      dispatch({ type: 'ACTIVATE_DOUBLE' });
    }
  });
}

function mountSkeleton(container) {
  let cellsHtml = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const alt = (r + c) % 2 === 1 ? ' is-alt' : '';
      const coord = `${String.fromCharCode(65 + c)}${7 - r}`;
      cellsHtml += `
        <div class="mm-cell${alt}" data-r="${r}" data-c="${c}">
          <span class="mm-cell-coord">${coord}</span>
          <span class="mm-step-hint" aria-hidden="true"></span>
          <span class="mm-corner-tag" hidden></span>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div class="mm-arena">
      <div class="mm-stage-card" id="mm-stage-card">
        <div class="mm-top-banner">
          <div class="mm-status-pill" id="mm-status-pill"></div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span class="tg-badge tg-badge-cyan">
              <span id="mm-walls-label"></span>
              <span id="mm-walls-count">0</span>/32
            </span>
            <div class="mm-step-pips" id="mm-step-pips">
              ${Array.from({ length: 6 }, (_, i) => `<span class="mm-step-pip" data-pip="${i}"></span>`).join('')}
            </div>
          </div>
        </div>

        <div class="mm-board-wrap">
          <div class="mm-grid" id="mm-grid">${cellsHtml}</div>
          <div class="mm-token-layer" id="mm-token-layer">
            <div class="mm-token-anchor" id="mm-anchor-0">
              <div class="mm-token is-cyan" id="mm-token-0"></div>
            </div>
            <div class="mm-token-anchor" id="mm-anchor-1">
              <div class="mm-token is-garnet" id="mm-token-1"></div>
            </div>
          </div>
          <svg class="mm-wall-overlay" id="mm-wall-svg" viewBox="0 0 700 700" preserveAspectRatio="none" aria-hidden="true"></svg>
        </div>

        <div class="mm-siren-banner" id="mm-siren-banner" hidden>
          <span id="mm-siren-text"></span>
          <button type="button" class="tg-btn tg-btn-sm tg-btn-garnet" id="mm-dismiss-flash"></button>
        </div>
      </div>

      <div class="mm-controls">
        <div class="mm-panel">
          <div class="mm-section-label">
            <span id="mm-runners-heading"></span>
            <span id="mm-opt-path"></span>
          </div>
          ${[0, 1]
            .map(
              (i) => `
              <div class="mm-player-stat" id="mm-pstat-${i}">
                <div class="mm-stat-head">
                  <span id="mm-pname-${i}"></span>
                  <span class="tg-badge ${i === 0 ? 'tg-badge-cyan' : 'tg-badge-garnet'}">${i === 0 ? 'A1→G7' : 'G1→A7'}</span>
                </div>
                <div class="mm-stat-row">
                  <span id="mm-dc-lbl-${i}"></span>
                  <span id="mm-dc-val-${i}" style="color:var(--tg-gold-bright);"></span>
                </div>
                <div class="mm-stat-row">
                  <span id="mm-dh-lbl-${i}"></span>
                  <span><span id="mm-dist-${i}">0</span> · <span id="mm-hits-${i}">0</span>💥</span>
                </div>
              </div>
            `
            )
            .join('')}
        </div>

        <div class="mm-panel">
          <div class="mm-section-label">
            <span id="mm-console-heading"></span>
            <span id="mm-budget-tag"></span>
          </div>
          <div class="mm-dpad">
            <div></div>
            <button type="button" class="mm-dpad-btn" data-dir="UP" aria-label="Up">▲</button>
            <div></div>
            <button type="button" class="mm-dpad-btn" data-dir="LEFT" aria-label="Left">◀</button>
            <div class="mm-dpad-center" id="mm-dpad-center">3/3</div>
            <button type="button" class="mm-dpad-btn" data-dir="RIGHT" aria-label="Right">▶</button>
            <div></div>
            <button type="button" class="mm-dpad-btn" data-dir="DOWN" aria-label="Down">▼</button>
            <div></div>
          </div>

          <div class="mm-action-stack">
            <button type="button" class="tg-btn tg-btn-gold" id="mm-double-btn"></button>
            <button type="button" class="tg-btn tg-btn-ghost" id="mm-end-turn-btn"></button>
          </div>
          <div class="mm-kbd-hint" id="mm-kbd-hint"></div>
        </div>
      </div>
    </div>
  `;

  const gridEl = container.querySelector('#mm-grid');
  const cellMap = new Map();
  gridEl.querySelectorAll('.mm-cell').forEach((cell) => {
    cellMap.set(`${cell.dataset.r},${cell.dataset.c}`, cell);
  });

  // Event delegation on persistent grid
  gridEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.mm-cell');
    if (!cell || !cell.dataset.stepDir || !latestCtx) return;
    latestCtx.dispatch({ type: 'STEP', payload: { dir: cell.dataset.stepDir } });
  });

  container.querySelectorAll('[data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!latestCtx) return;
      latestCtx.dispatch({ type: 'STEP', payload: { dir: btn.dataset.dir } });
    });
  });

  container.querySelector('#mm-double-btn').addEventListener('click', () => {
    latestCtx?.dispatch({ type: 'ACTIVATE_DOUBLE' });
  });

  container.querySelector('#mm-end-turn-btn').addEventListener('click', () => {
    SFX.play('click');
    latestCtx?.dispatch({ type: 'END_TURN' });
  });

  container.querySelector('#mm-dismiss-flash').addEventListener('click', () => {
    SFX.play('click');
    latestCtx?.dispatch({ type: 'DISMISS_FLASH' });
  });

  container.dataset.mounted = 'mm';
  refs = {
    stageCard: container.querySelector('#mm-stage-card'),
    statusPill: container.querySelector('#mm-status-pill'),
    wallsLabel: container.querySelector('#mm-walls-label'),
    wallsCount: container.querySelector('#mm-walls-count'),
    pips: Array.from(container.querySelectorAll('.mm-step-pip')),
    cells: cellMap,
    anchors: [container.querySelector('#mm-anchor-0'), container.querySelector('#mm-anchor-1')],
    tokens: [container.querySelector('#mm-token-0'), container.querySelector('#mm-token-1')],
    wallSvg: container.querySelector('#mm-wall-svg'),
    sirenBanner: container.querySelector('#mm-siren-banner'),
    sirenText: container.querySelector('#mm-siren-text'),
    dismissBtn: container.querySelector('#mm-dismiss-flash'),
    runnersHeading: container.querySelector('#mm-runners-heading'),
    optPath: container.querySelector('#mm-opt-path'),
    pstats: [0, 1].map((i) => ({
      card: container.querySelector(`#mm-pstat-${i}`),
      name: container.querySelector(`#mm-pname-${i}`),
      dcLbl: container.querySelector(`#mm-dc-lbl-${i}`),
      dcVal: container.querySelector(`#mm-dc-val-${i}`),
      dhLbl: container.querySelector(`#mm-dh-lbl-${i}`),
      dist: container.querySelector(`#mm-dist-${i}`),
      hits: container.querySelector(`#mm-hits-${i}`),
    })),
    consoleHeading: container.querySelector('#mm-console-heading'),
    budgetTag: container.querySelector('#mm-budget-tag'),
    dpadBtns: Array.from(container.querySelectorAll('[data-dir]')),
    dpadCenter: container.querySelector('#mm-dpad-center'),
    doubleBtn: container.querySelector('#mm-double-btn'),
    endTurnBtn: container.querySelector('#mm-end-turn-btn'),
    kbdHint: container.querySelector('#mm-kbd-hint'),
    lastSvgKey: '',
    sirenShown: false,
  };
  prevMetrics = { discovered: 0, dist: {}, hits: {} };
}

mountGame({
  config: {
    id: 'memory-maze',
    title: { zh: '记忆迷宫', en: 'Memory Maze', ko: '기억의 미로' },
    seasons: ['S3E8', 'S3E9'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: false,
    rulesSummary: {
      zh: `### 死亡对决目标
在暗藏 **32 堵隐形激光墙** 的 7×7 迷宫中，两位选手从底部相邻两角出发，率先抵达**对角终点**者立即获胜！

### 移动与双倍机会
- 每回合可沿上下左右移动 **最多 3 步**（不可斜走），至少走 1 步后也可提前结束回合。
- 每位选手全场拥有 **2 次「双倍机会」**，回合开始前激活即可将该回合步数提升至 **6 步**！
- 支持点击相邻格子、右侧方向键，或键盘 **方向键 / WASD** 极速操控。

### 撞墙警报与空间记忆
- 一旦试图穿过隐形墙，**红色警报激光立即闪烁 1.6 秒**，随后再次隐身！
- 撞墙选手将**立即被传送回起点**并结束当前回合。双方共享视觉线索，必须靠大脑记下所有墙体与安全通道！`,
      en: `### Objective
Race across a 7×7 labyrinth hiding **32 invisible laser walls**. Both runners start at bottom corners and race diagonally—first to step onto their **opposing Goal square** wins immediately!

### Movement & Double Chance
- Move up to **3 orthogonal steps** per turn (Up/Down/Left/Right—no diagonals). You may end your turn early after at least 1 step.
- Each player starts with **2 Double Chances**: activate before your first step of a turn to boost your budget to **6 steps**!
- Control by clicking adjacent tiles, using the D-Pad, or pressing **Arrow keys / WASD**.

### Invisible Wall Siren
- Attempting to cross an invisible wall triggers a **crimson laser shockwave** for 1.6 seconds before vanishing again!
- The runner is immediately **teleported back to Start** and loses any remaining steps that turn. Memorize every discovered barrier and safe corridor!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    latestCtx = ctx;
    bindKeyboardOnce();

    const { state, activeSeatId, isSpectator, lang, lastEvent, log } = ctx;
    if (!state) return;

    if (container.dataset.mounted !== 'mm' || !refs || !container.contains(refs.stageCard)) {
      mountSkeleton(container);
    }

    const activePlayer = state.players[state.currentTurnSeatId];
    const isMyTurn =
      !isSpectator && state.phase === 'MOVING' && state.currentTurnSeatId === activeSeatId;
    const stepsLeft = Math.max(0, state.stepsBudget - state.stepsTakenThisTurn);
    const isSiren = state.phase === 'COLLISION_FLASH';

    const p0 = state.players[state.seatOrder[0]];
    const p1 = state.players[state.seatOrder[1]];
    const pair = [p0, p1];

    // Event cues (audio, log, Motion.nudgeError / pulseConfirm)
    const evtKey = `${state.turnNumber}-${state.stepsTakenThisTurn}-${state.phase}-${lastEvent?.type || ''}-${state.lastMove?.edgeKey || ''}`;
    let wallHitSeatId = null;
    if (evtKey !== lastPlayedEventKey && lastEvent) {
      lastPlayedEventKey = evtKey;
      if (lastEvent.type === 'WALL_HIT') {
        wallHitSeatId = lastEvent.seatId;
        SFX.play('laserZap');
        SFX.play('eliminate');
        Motion.nudgeError(refs.stageCard, { intensity: 'impact' });
        const hitName = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `🚨 ${hitName} 撞上隐形激光墙，被传送回起点。`
            : `🚨 ${hitName} struck an invisible laser wall and reset to Start.`,
          'alert'
        );
      } else if (lastEvent.type === 'DOUBLE_CHANCE') {
        SFX.play('combo');
        Motion.pulseConfirm(refs.stageCard, { tone: 'gold' });
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `⚡ ${nm} 激活「双倍机会」，本回合可移动 6 步。`
            : `⚡ ${nm} activated Double Chance (6 steps).`,
          'alert'
        );
      } else if (lastEvent.type === 'STEP' || lastEvent.type === 'STEP_COMPLETE') {
        SFX.play('tilePlace');
      } else if (lastEvent.type === 'GOAL_REACHED') {
        SFX.play('victory');
        Motion.pulseConfirm(refs.stageCard, { tone: 'emerald' });
      }
    }

    // 1. Stage card siren state & top banner
    refs.stageCard.classList.toggle('is-siren', isSiren);
    refs.statusPill.className = isSiren
      ? 'mm-status-pill is-siren'
      : `mm-status-pill is-${activePlayer.color}`;
    refs.statusPill.textContent = isSiren
      ? lang === 'zh'
        ? `🚨 激光警报 · ${state.players[state.collisionFlash.seatId]?.name || ''} 退回起点`
        : `🚨 LASER SIREN · ${state.players[state.collisionFlash.seatId]?.name || ''} reset`
      : state.phase === 'ENDED'
      ? lang === 'zh'
        ? `🏆 ${state.players[state.winnerSeatId]?.name || ''} 抵达终点 · 全盘 32 墙已揭示`
        : `🏆 ${state.players[state.winnerSeatId]?.name || ''} reached Goal · All 32 walls revealed`
      : isMyTurn
      ? lang === 'zh'
        ? `你的回合 · 剩余 ${stepsLeft} 步`
        : `Your Turn · ${stepsLeft} step${stepsLeft === 1 ? '' : 's'} left`
      : lang === 'zh'
      ? `等待 ${activePlayer.name} 移动`
      : `Waiting for ${activePlayer.name}`;

    refs.wallsLabel.textContent = lang === 'zh' ? '已触暗墙 ' : 'Walls Hit ';
    if (prevMetrics.discovered !== state.discoveredWallCount) {
      Motion.animateNumber(refs.wallsCount, prevMetrics.discovered, state.discoveredWallCount, {
        duration: 240,
      });
      prevMetrics.discovered = state.discoveredWallCount;
    } else {
      refs.wallsCount.textContent = String(state.discoveredWallCount);
    }

    // Step pips (persistent 6 pips, show budget count)
    refs.pips.forEach((pip, idx) => {
      const visible = idx < state.stepsBudget;
      pip.hidden = !visible;
      if (!visible) return;
      const used = idx < state.stepsTakenThisTurn;
      pip.classList.toggle('is-used', used);
      pip.classList.toggle('is-available', !used);
      pip.classList.toggle('is-double', !used && state.usedDoubleThisTurn);
    });

    // 2. Patch 7x7 Grid Cells in place (ZERO innerHTML rebuild!)
    const trailSet = new Set((state.turnTrail || []).map((pt) => `${pt.r},${pt.c}`));
    const reachableMap = new Map();
    if (isMyTurn && stepsLeft > 0) {
      for (const [dir, { dr, dc }] of Object.entries(DIRS)) {
        const nr = activePlayer.pos.r + dr;
        const nc = activePlayer.pos.c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          reachableMap.set(`${nr},${nc}`, dir);
        }
      }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const key = `${r},${c}`;
        const cell = refs.cells.get(key);
        const reachDir = reachableMap.get(key) || '';
        const isStart0 = r === p0.start.r && c === p0.start.c;
        const isStart1 = r === p1.start.r && c === p1.start.c;
        const isGoal0 = r === p0.goal.r && c === p0.goal.c;
        const isGoal1 = r === p1.goal.r && c === p1.goal.c;
        const onTrail = trailSet.has(key);

        cell.classList.toggle('is-start-cyan', isStart0);
        cell.classList.toggle('is-start-garnet', isStart1);
        cell.classList.toggle('is-goal-cyan', isGoal0);
        cell.classList.toggle('is-goal-garnet', isGoal1);
        cell.classList.toggle('is-trail-cyan', onTrail && activePlayer.color === 'cyan');
        cell.classList.toggle('is-trail-garnet', onTrail && activePlayer.color === 'garnet');
        cell.classList.toggle('is-reachable', Boolean(reachDir));

        if (reachDir) {
          cell.dataset.stepDir = reachDir;
          cell.setAttribute('role', 'button');
          cell.setAttribute('tabindex', '0');
        } else {
          delete cell.dataset.stepDir;
          cell.removeAttribute('role');
          cell.removeAttribute('tabindex');
        }

        const tag = cell.querySelector('.mm-corner-tag');
        if (isGoal0) {
          tag.hidden = false;
          tag.className = 'mm-corner-tag is-cyan';
          tag.textContent = lang === 'zh' ? 'P1终点' : 'P1 GOAL';
        } else if (isGoal1) {
          tag.hidden = false;
          tag.className = 'mm-corner-tag is-garnet';
          tag.textContent = lang === 'zh' ? 'P2终点' : 'P2 GOAL';
        } else if (isStart0) {
          tag.hidden = false;
          tag.className = 'mm-corner-tag is-cyan';
          tag.textContent = lang === 'zh' ? 'P1起点' : 'START';
        } else if (isStart1) {
          tag.hidden = false;
          tag.className = 'mm-corner-tag is-garnet';
          tag.textContent = lang === 'zh' ? 'P2起点' : 'START';
        } else {
          tag.hidden = true;
        }
      }
    }

    // 3. GPU-glide Player Tokens in persistent overlay layer
    const sameCell = p0.pos.r === p1.pos.r && p0.pos.c === p1.pos.c;
    pair.forEach((p, idx) => {
      const anchor = refs.anchors[idx];
      const token = refs.tokens[idx];
      const isTurnRunner = p.seatId === state.currentTurnSeatId && state.phase === 'MOVING';
      anchor.classList.toggle('is-shared-0', sameCell && idx === 0);
      anchor.classList.toggle('is-shared-1', sameCell && idx === 1);
      anchor.classList.toggle('is-reset-glide', wallHitSeatId === p.seatId || isSiren);
      anchor.style.transform = `translate3d(${p.pos.c * 100}%, ${p.pos.r * 100}%, 0)`;
      token.textContent = p.avatar || (idx === 0 ? '◆' : '♛');
      token.title = p.name;
      token.classList.toggle('is-active', isTurnRunner);
    });

    // 4. SVG Laser Overlay (only mutate when edge/reveal state changes)
    const svgKey = state.collisionFlash?.edgeKey
      ? `hit:${state.collisionFlash.edgeKey}:${state.collisionFlash.turnNumber}`
      : Array.isArray(state.revealedAllWalls)
      ? `all:${state.revealedAllWalls.length}`
      : 'empty';
    if (svgKey !== refs.lastSvgKey) {
      refs.lastSvgKey = svgKey;
      if (state.collisionFlash?.edgeKey) {
        const { x1, y1, x2, y2 } = edgeToSvgCoords(state.collisionFlash.edgeKey);
        refs.wallSvg.innerHTML = `
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mm-laser-hit" />
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mm-laser-core" />
        `;
      } else if (Array.isArray(state.revealedAllWalls)) {
        refs.wallSvg.innerHTML = state.revealedAllWalls
          .map((ek) => {
            const { x1, y1, x2, y2 } = edgeToSvgCoords(ek);
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mm-wall-revealed" />`;
          })
          .join('');
      } else {
        refs.wallSvg.innerHTML = '';
      }
    }

    // 5. Siren Banner presence
    refs.sirenText.textContent =
      lang === 'zh'
        ? '⚡ 记住这堵红色激光墙的位置，警报结束后墙体将重新隐身。'
        : '⚡ Memorize this crimson barrier before it vanishes back into darkness.';
    refs.dismissBtn.textContent = lang === 'zh' ? '继续' : 'Continue';
    refs.dismissBtn.hidden = isSpectator;
    if (isSiren !== refs.sirenShown) {
      refs.sirenShown = isSiren;
      Motion.transitionPresence(refs.sirenBanner, isSiren, { preset: 'pill' });
    }

    // 6. Right Telemetry & D-Pad Console
    refs.runnersHeading.textContent = lang === 'zh' ? '选手追踪' : 'RUNNERS TELEMETRY';
    refs.optPath.textContent =
      lang === 'zh' ? `最短路径 ${state.shortestPath} 步` : `OPT ${state.shortestPath} STEPS`;

    pair.forEach((p, idx) => {
      const st = refs.pstats[idx];
      const isAct = p.seatId === state.currentTurnSeatId && state.phase === 'MOVING';
      const goalDist = Math.abs(p.pos.r - p.goal.r) + Math.abs(p.pos.c - p.goal.c);

      st.card.classList.toggle('is-active-cyan', isAct && p.color === 'cyan');
      st.card.classList.toggle('is-active-garnet', isAct && p.color === 'garnet');
      st.name.textContent = `${p.avatar || '◆'} ${p.name}`;
      st.name.style.color = p.color === 'cyan' ? 'var(--tg-cyan-ink)' : 'var(--tg-garnet-ink)';
      st.dcLbl.textContent = lang === 'zh' ? '双倍机会' : 'Double Chance';
      st.dcVal.textContent = `${'⚡'.repeat(p.doubleChances)}${'○'.repeat(2 - p.doubleChances)} (${p.doubleChances}/2)`;
      st.dhLbl.textContent = lang === 'zh' ? '距终点 / 撞墙' : 'Dist / Hits';

      const prevD = prevMetrics.dist[p.seatId];
      if (prevD !== undefined && prevD !== goalDist) {
        Motion.animateNumber(st.dist, prevD, goalDist, { duration: 220 });
      } else {
        st.dist.textContent = String(goalDist);
      }
      prevMetrics.dist[p.seatId] = goalDist;

      const prevH = prevMetrics.hits[p.seatId];
      if (prevH !== undefined && prevH !== p.collisions) {
        Motion.animateNumber(st.hits, prevH, p.collisions, { duration: 220 });
      } else {
        st.hits.textContent = String(p.collisions);
      }
      prevMetrics.hits[p.seatId] = p.collisions;
    });

    refs.consoleHeading.textContent = lang === 'zh' ? '方向操纵台' : 'NAVIGATION CONSOLE';
    refs.budgetTag.textContent = state.usedDoubleThisTurn ? '⚡ 6-STEP' : '3-STEP';
    refs.dpadCenter.textContent = `${stepsLeft}/${state.stepsBudget}`;

    refs.dpadBtns.forEach((btn) => {
      const dir = btn.dataset.dir;
      let can = false;
      if (isMyTurn && stepsLeft > 0) {
        const { dr, dc } = DIRS[dir];
        const nr = activePlayer.pos.r + dr;
        const nc = activePlayer.pos.c + dc;
        can = nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE;
      }
      btn.disabled = !can;
    });

    const canDouble =
      isMyTurn &&
      state.stepsTakenThisTurn === 0 &&
      !state.usedDoubleThisTurn &&
      activePlayer.doubleChances > 0;
    const canEndEarly = isMyTurn && state.stepsTakenThisTurn >= 1;

    refs.doubleBtn.disabled = !canDouble;
    refs.doubleBtn.textContent =
      lang === 'zh'
        ? `⚡ 激活双倍机会 · 6步 (${activePlayer.doubleChances})`
        : `⚡ Double Chance · 6 Steps (${activePlayer.doubleChances})`;
    refs.endTurnBtn.disabled = !canEndEarly;
    refs.endTurnBtn.textContent = lang === 'zh' ? '提前结束回合' : 'End Turn Early';
    refs.kbdHint.textContent =
      lang === 'zh'
        ? '方向键 / WASD 移动 · Space 双倍机会'
        : 'Arrows / WASD to move · Space for Double Chance';
  },
});

/**
 * Memory Maze (记忆迷宫) — Interactive Broadcast Board & Keyboard/D-Pad Controls
 */

import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, GRID_SIZE, parseEdgeKey, DIRS } from './rules.js';

let lastPlayedEventKey = null;
let keyHandlerBound = false;
let latestCtx = null;

function edgeToSvgCoords(edgeKey) {
  const { r1, c1, r2, c2 } = parseEdgeKey(edgeKey);
  // ViewBox is 0..700 x 0..700 (100 units per cell)
  if (r1 === r2) {
    // Vertical wall separating (r1, c1) and (r1, c2)
    const x = Math.max(c1, c2) * 100;
    const y1 = r1 * 100 + 8;
    const y2 = (r1 + 1) * 100 - 8;
    return { x1: x, y1, x2: x, y2 };
  }
  // Horizontal wall separating (r1, c1) and (r2, c1)
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
在暗藏 **32 堵隐形激光墙** 的 7×7 黑曜石迷宫中，两位选手从底部相邻两角出发，率先抵达**对角终点**者立即获胜！

### 移动与双倍机会
- 每回合可沿上下左右移动 **最多 3 步**（不可斜走），至少走 1 步后也可提前结束回合。
- 每位选手全场拥有 **2 次「双倍机会」**，回合开始前激活即可将该回合步数提升至 **6 步**！
- 支持点击相邻格子、右侧方向键，或键盘 **方向键 / WASD** 极速操控。

### 撞墙警报与空间记忆
- 一旦试图穿过隐形墙，**红色警报激光立即闪烁 1.6 秒**，随后再次隐身！
- 撞墙选手将**立即被传送回起点**并结束当前回合。双方共享视觉线索，必须靠大脑记下所有墙体与安全通道！`,
      en: `### Objective
Race across a 7×7 obsidian labyrinth hiding **32 invisible laser walls**. Both runners start at bottom corners and race diagonally—first to step onto their **opposing Goal square** wins immediately!

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

    const { state, activeSeatId, isSpectator, lang, lastEvent, dispatch, log } = ctx;
    if (!state) return;

    // Audio & live log feedback for new events
    const evtKey = `${state.turnNumber}-${state.stepsTakenThisTurn}-${state.phase}-${lastEvent?.type || ''}-${state.lastMove?.edgeKey || ''}`;
    if (evtKey !== lastPlayedEventKey && lastEvent) {
      lastPlayedEventKey = evtKey;
      if (lastEvent.type === 'WALL_HIT') {
        SFX.play('laserZap');
        SFX.play('eliminate');
        const hitName = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `🚨 ${hitName} 撞上隐形激光墙！被传送回起点。`
            : `🚨 ${hitName} struck an invisible laser wall and was reset to Start!`,
          'alert'
        );
      } else if (lastEvent.type === 'DOUBLE_CHANCE') {
        SFX.play('combo');
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `⚡ ${nm} 激活「双倍机会」！本回合可移动 6 步。`
            : `⚡ ${nm} activated Double Chance (6 steps this turn)!`,
          'alert'
        );
      } else if (lastEvent.type === 'STEP' || lastEvent.type === 'STEP_COMPLETE') {
        SFX.play('tilePlace');
      } else if (lastEvent.type === 'GOAL_REACHED') {
        SFX.play('victory');
      }
    }

    const activePlayer = state.players[state.currentTurnSeatId];
    const isMyTurn = !isSpectator && state.phase === 'MOVING' && state.currentTurnSeatId === activeSeatId;
    const stepsLeft = Math.max(0, state.stepsBudget - state.stepsTakenThisTurn);
    const isSiren = state.phase === 'COLLISION_FLASH';

    const p0 = state.players[state.seatOrder[0]];
    const p1 = state.players[state.seatOrder[1]];

    const trailSet = new Set((state.turnTrail || []).map((pt) => `${pt.r},${pt.c}`));

    // Build reachable adjacent cells map
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

    // Build 7x7 cells HTML
    let cellsHtml = '';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const key = `${r},${c}`;
        const classes = ['mm-cell'];
        if ((r + c) % 2 === 1) classes.push('is-alt');

        if (r === p0.start.r && c === p0.start.c) classes.push('is-start-cyan');
        if (r === p1.start.r && c === p1.start.c) classes.push('is-start-garnet');
        if (r === p0.goal.r && c === p0.goal.c) classes.push('is-goal-cyan');
        if (r === p1.goal.r && c === p1.goal.c) classes.push('is-goal-garnet');

        if (trailSet.has(key)) {
          classes.push(activePlayer.color === 'cyan' ? 'is-trail-cyan' : 'is-trail-garnet');
        }

        const reachDir = reachableMap.get(key);
        if (reachDir) classes.push('is-reachable');

        const herePlayers = [p0, p1].filter((p) => p.pos.r === r && p.pos.c === c);
        let cornerTag = '';
        if (r === p0.goal.r && c === p0.goal.c) {
          cornerTag = `<span class="mm-corner-tag is-cyan">${lang === 'zh' ? 'P1终点' : 'P1 GOAL'}</span>`;
        } else if (r === p1.goal.r && c === p1.goal.c) {
          cornerTag = `<span class="mm-corner-tag is-garnet">${lang === 'zh' ? 'P2终点' : 'P2 GOAL'}</span>`;
        } else if (r === p0.start.r && c === p0.start.c) {
          cornerTag = `<span class="mm-corner-tag is-cyan">${lang === 'zh' ? 'P1起点' : 'START'}</span>`;
        } else if (r === p1.start.r && c === p1.start.c) {
          cornerTag = `<span class="mm-corner-tag is-garnet">${lang === 'zh' ? 'P2起点' : 'START'}</span>`;
        }

        const tokensHtml = herePlayers.length
          ? `<div class="mm-tokens ${herePlayers.length > 1 ? 'is-shared' : ''}">
              ${herePlayers
                .map((p) => {
                  const isTurnRunner = p.seatId === state.currentTurnSeatId && state.phase === 'MOVING';
                  return `<div class="mm-token is-${p.color} ${isTurnRunner ? 'is-active' : ''}" title="${UI.escapeHtml(p.name)}">${UI.escapeHtml(p.avatar || (p.color === 'cyan' ? '◆' : '♛'))}</div>`;
                })
                .join('')}
            </div>`
          : reachDir
          ? `<span class="mm-step-hint" aria-hidden="true"></span>`
          : '';

        const coordLabel = `${String.fromCharCode(65 + c)}${7 - r}`;
        cellsHtml += `
          <div class="${classes.join(' ')}" ${reachDir ? `data-step-dir="${reachDir}" role="button" tabindex="0"` : ''}>
            <span class="mm-cell-coord">${coordLabel}</span>
            ${tokensHtml}
            ${cornerTag}
          </div>
        `;
      }
    }

    // Build SVG laser overlay (either single struck wall during siren OR all 32 walls post-game)
    let svgWalls = '';
    if (state.collisionFlash?.edgeKey) {
      const { x1, y1, x2, y2 } = edgeToSvgCoords(state.collisionFlash.edgeKey);
      svgWalls += `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mm-laser-hit" />
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mm-laser-core" />
      `;
    } else if (Array.isArray(state.revealedAllWalls)) {
      svgWalls = state.revealedAllWalls
        .map((edgeKey) => {
          const { x1, y1, x2, y2 } = edgeToSvgCoords(edgeKey);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mm-wall-revealed" />`;
        })
        .join('');
    }

    // Step pips
    const pipsHtml = Array.from({ length: state.stepsBudget }, (_, idx) => {
      const used = idx < state.stepsTakenThisTurn;
      const cls = used
        ? 'mm-step-pip is-used'
        : `mm-step-pip is-available ${state.usedDoubleThisTurn ? 'is-double' : ''}`;
      return `<span class="${cls}"></span>`;
    }).join('');

    const statusText = isSiren
      ? lang === 'zh'
        ? `🚨 激光警报！${UI.escapeHtml(state.players[state.collisionFlash.seatId]?.name || '')} 撞墙退回起点`
        : `🚨 LASER SIREN! ${UI.escapeHtml(state.players[state.collisionFlash.seatId]?.name || '')} reset to Start`
      : state.phase === 'ENDED'
      ? lang === 'zh'
        ? `🏆 ${UI.escapeHtml(state.players[state.winnerSeatId]?.name || '')} 抵达终点！32 堵暗墙已全盘揭示`
        : `🏆 ${UI.escapeHtml(state.players[state.winnerSeatId]?.name || '')} reached Goal! All 32 walls revealed`
      : isMyTurn
      ? lang === 'zh'
        ? `你的回合 · 剩余 ${stepsLeft} 步`
        : `Your Turn · ${stepsLeft} step${stepsLeft === 1 ? '' : 's'} left`
      : lang === 'zh'
      ? `等待 ${UI.escapeHtml(activePlayer.name)} 移动...`
      : `Waiting for ${UI.escapeHtml(activePlayer.name)}...`;

    const statusCls = isSiren
      ? 'mm-status-pill is-siren'
      : `mm-status-pill is-${activePlayer.color}`;

    const canDouble =
      isMyTurn && state.stepsTakenThisTurn === 0 && !state.usedDoubleThisTurn && activePlayer.doubleChances > 0;
    const canEndEarly = isMyTurn && state.stepsTakenThisTurn >= 1;

    const dirCanMove = (dir) => {
      if (!isMyTurn || stepsLeft <= 0) return false;
      const { dr, dc } = DIRS[dir];
      const nr = activePlayer.pos.r + dr;
      const nc = activePlayer.pos.c + dc;
      return nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE;
    };

    container.innerHTML = `
      <div class="mm-arena">
        <div class="mm-stage-card ${isSiren ? 'is-siren' : ''}">
          <div class="mm-top-banner">
            <div class="${statusCls}">${statusText}</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? `已触发暗墙 ${state.discoveredWallCount}/32` : `Walls Hit ${state.discoveredWallCount}/32`}</span>
              <div class="mm-step-pips" title="${lang === 'zh' ? '本回合剩余步数' : 'Remaining steps'}">${pipsHtml}</div>
            </div>
          </div>

          <div class="mm-board-wrap">
            <div class="mm-grid" id="mm-grid">
              ${cellsHtml}
            </div>
            <svg class="mm-wall-overlay" viewBox="0 0 700 700" preserveAspectRatio="none" aria-hidden="true">
              ${svgWalls}
            </svg>
          </div>

          ${
            isSiren
              ? `<div class="mm-siren-banner">
                  <span>${
                    lang === 'zh'
                      ? '⚡ 记住这堵红色激光墙的位置！警报结束后墙体将重新隐身。'
                      : '⚡ Memorize this crimson barrier! It vanishes back into darkness shortly.'
                  }</span>
                  ${
                    !isSpectator
                      ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-garnet" id="mm-dismiss-flash">${lang === 'zh' ? '继续' : 'Continue'}</button>`
                      : ''
                  }
                </div>`
              : ''
          }
        </div>

        <div class="mm-controls">
          <div class="mm-panel">
            <div class="mm-section-label">
              <span>${lang === 'zh' ? '选手追踪' : 'RUNNERS TELEMETRY'}</span>
              <span>${lang === 'zh' ? `最短路径 ${state.shortestPath} 步` : `OPT ${state.shortestPath} STEPS`}</span>
            </div>
            ${[p0, p1]
              .map((p, i) => {
                const isAct = p.seatId === state.currentTurnSeatId && state.phase === 'MOVING';
                const goalDist = Math.abs(p.pos.r - p.goal.r) + Math.abs(p.pos.c - p.goal.c);
                return `
                  <div class="mm-player-stat ${isAct ? `is-active-${p.color}` : ''}">
                    <div class="mm-stat-head">
                      <span style="color:${p.color === 'cyan' ? '#67e8f9' : '#ff8ba0'};">
                        ${UI.escapeHtml(p.avatar || '◆')} ${UI.escapeHtml(p.name)}
                      </span>
                      <span class="tg-badge ${p.color === 'cyan' ? 'tg-badge-cyan' : 'tg-badge-garnet'}">
                        ${i === 0 ? 'A1→G7' : 'G1→A7'}
                      </span>
                    </div>
                    <div class="mm-stat-row">
                      <span>${lang === 'zh' ? '双倍机会' : 'Double Chance'}</span>
                      <span style="color:var(--tg-gold-bright);">${'⚡'.repeat(p.doubleChances)}${'○'.repeat(2 - p.doubleChances)} (${p.doubleChances}/2)</span>
                    </div>
                    <div class="mm-stat-row">
                      <span>${lang === 'zh' ? '距终点 / 撞墙' : 'Dist / Hits'}</span>
                      <span>${goalDist} · ${p.collisions}💥</span>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>

          <div class="mm-panel">
            <div class="mm-section-label">
              <span>${lang === 'zh' ? '方向操纵台' : 'NAVIGATION CONSOLE'}</span>
              <span>${state.usedDoubleThisTurn ? '⚡ 6-STEP' : '3-STEP'}</span>
            </div>
            <div class="mm-dpad">
              <div></div>
              <button type="button" class="mm-dpad-btn" data-dir="UP" ${dirCanMove('UP') ? '' : 'disabled'} aria-label="Up">▲</button>
              <div></div>
              <button type="button" class="mm-dpad-btn" data-dir="LEFT" ${dirCanMove('LEFT') ? '' : 'disabled'} aria-label="Left">◀</button>
              <div class="mm-dpad-center">${stepsLeft}/${state.stepsBudget}</div>
              <button type="button" class="mm-dpad-btn" data-dir="RIGHT" ${dirCanMove('RIGHT') ? '' : 'disabled'} aria-label="Right">▶</button>
              <div></div>
              <button type="button" class="mm-dpad-btn" data-dir="DOWN" ${dirCanMove('DOWN') ? '' : 'disabled'} aria-label="Down">▼</button>
              <div></div>
            </div>

            <div class="mm-action-stack">
              <button type="button" class="tg-btn tg-btn-gold" id="mm-double-btn" ${canDouble ? '' : 'disabled'}>
                ⚡ ${lang === 'zh' ? `激活双倍机会 · 6步 (${activePlayer.doubleChances})` : `Activate Double Chance · 6 Steps (${activePlayer.doubleChances})`}
              </button>
              <button type="button" class="tg-btn tg-btn-ghost" id="mm-end-turn-btn" ${canEndEarly ? '' : 'disabled'}>
                ${lang === 'zh' ? '提前结束本回合' : 'End Turn Early'}
              </button>
            </div>
            <div class="mm-kbd-hint">${lang === 'zh' ? '支持方向键 / WASD 移动 · Space 双倍机会' : 'Arrows / WASD to move · Space for Double Chance'}</div>
          </div>
        </div>
      </div>
    `;

    // Bind interactive cells & buttons
    container.querySelectorAll('[data-step-dir]').forEach((el) => {
      el.addEventListener('click', () => {
        dispatch({ type: 'STEP', payload: { dir: el.dataset.stepDir } });
      });
    });

    container.querySelectorAll('[data-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dispatch({ type: 'STEP', payload: { dir: btn.dataset.dir } });
      });
    });

    container.querySelector('#mm-double-btn')?.addEventListener('click', () => {
      dispatch({ type: 'ACTIVATE_DOUBLE' });
    });

    container.querySelector('#mm-end-turn-btn')?.addEventListener('click', () => {
      SFX.play('click');
      dispatch({ type: 'END_TURN' });
    });

    container.querySelector('#mm-dismiss-flash')?.addEventListener('click', () => {
      SFX.play('click');
      dispatch({ type: 'DISMISS_FLASH' });
    });
  },
});

/**
 * Twelve Janggi (십이장기 / 十二将棋) — Persistent-DOM FLIP Renderer
 * Zero innerHTML nukes on clicks/moves; genuine FLIP piece glides across board & prisoner docks.
 */

import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import {
  GameRules,
  ROWS,
  COLS,
  PIECE_META,
  getPieceDirs,
  getLegalMovesForPiece,
  getLegalDrops,
} from './rules.js';

let selected = null; // { kind: 'board', r, c } | { kind: 'hand', pieceType, idx }
let lastEventSig = null;
let lastScores = [0, 0];
let latestCtx = null;
let latestState = null;

const COL_LETTERS = ['A', 'B', 'C'];

function buildPieceEl(pieceId, type, owner, flippedView, { clickable = false, compact = false, isSelected = false, justPromoted = false } = {}) {
  const dirs = getPieceDirs(type, owner);
  const visualDirs = flippedView ? dirs.map(([dr, dc]) => [-dr, -dc]) : dirs;
  const meta = PIECE_META[type];

  const div = document.createElement('div');
  div.className = [
    'tj-piece',
    `is-owner-${owner}`,
    type === 'H' ? 'is-promoted' : '',
    justPromoted ? 'is-just-promoted' : '',
    clickable ? 'is-clickable' : '',
    compact ? 'tj-dock-tile' : '',
    isSelected ? 'is-selected' : '',
  ].filter(Boolean).join(' ');
  div.dataset.pieceId = pieceId;
  div.dataset.flipKey = pieceId;

  let dots = '';
  for (const [dr, dc] of visualDirs) {
    dots += `<span class="tj-dir-dot" data-dir="${dr},${dc}" aria-hidden="true"></span>`;
  }
  div.innerHTML = `${dots}<span class="tj-piece-hanja">${meta.hanja}</span><span class="tj-piece-sub">${meta.en.slice(0, 4)}</span>`;
  return div;
}

function mountSkeleton(container) {
  container.dataset.mountedGame = 'twelve-janggi';
  container.innerHTML = `
    <div class="tj-arena">
      <div class="tj-top-strip">
        <div class="tj-score-pips">
          <div class="tj-side-score">
            <span class="tj-side-dot is-p0"></span>
            <span id="tj-name-0"></span>
            <span class="tj-score-num" id="tj-score-0">0</span>
            <span class="tj-pip-row" id="tj-pips-0"></span>
          </div>
          <span style="color:var(--tg-ink-faint);font-family:var(--tg-font-mono);font-weight:800;">VS</span>
          <div class="tj-side-score">
            <span class="tj-pip-row" id="tj-pips-1"></span>
            <span class="tj-score-num" id="tj-score-1">0</span>
            <span id="tj-name-1"></span>
            <span class="tj-side-dot is-p1"></span>
          </div>
        </div>
        <span class="tg-badge tg-badge-gold" id="tj-match-badge"></span>
      </div>

      <div class="tj-try-banner" id="tj-try-banner" role="alert" hidden>
        <span aria-hidden="true">⚠️</span>
        <span id="tj-try-text"></span>
      </div>

      <div class="tj-round-toast" id="tj-round-toast" hidden></div>

      <div class="tj-board-column" id="tj-board-column">
        <div class="tj-dock" id="tj-dock-top" data-pos="top">
          <div class="tj-dock-label">
            <span class="tj-dock-name" id="tj-dock-top-name"></span>
            <span class="tj-dock-sub" id="tj-dock-top-sub"></span>
          </div>
          <div class="tj-dock-pieces" id="tj-dock-top-pieces"></div>
        </div>

        <div class="tj-board-frame" id="tj-board-frame">
          <div class="tj-board-grid" id="tj-board-grid"></div>
        </div>

        <div class="tj-dock" id="tj-dock-bot" data-pos="bottom">
          <div class="tj-dock-label">
            <span class="tj-dock-name" id="tj-dock-bot-name"></span>
            <span class="tj-dock-sub" id="tj-dock-bot-sub"></span>
          </div>
          <div class="tj-dock-pieces" id="tj-dock-bot-pieces"></div>
        </div>
      </div>

      <div class="tj-side-panel">
        <div class="tj-card">
          <h4 class="tj-card-title" id="tj-title-status"></h4>
          <p class="tj-status-text" id="tj-status-text"></p>
        </div>
        <div class="tj-card">
          <h4 class="tj-card-title" id="tj-title-legend"></h4>
          <div class="tj-legend-grid" id="tj-legend-grid"></div>
        </div>
        <div class="tj-card">
          <h4 class="tj-card-title" id="tj-title-log"></h4>
          <div class="tj-log-list" id="tj-log-list"></div>
        </div>
      </div>
    </div>
  `;

  // Create the 12 permanent board cell buttons once
  const grid = container.querySelector('#tj-board-grid');
  for (let i = 0; i < ROWS * COLS; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tj-cell';
    btn.dataset.slotIdx = String(i);
    btn.innerHTML = `<span class="tj-cell-coord"></span><span class="tj-cell-slot" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"></span>`;
    btn.addEventListener('click', () => handleCellClick(container, btn));
    grid.appendChild(btn);
  }
}

function getIsMyTurn(state, ctx) {
  return state.phase === 'playing' && !ctx.isSpectator && state.currentTurnSeatId === ctx.activeSeatId;
}

function computeLegalMap(state, ctx) {
  const legalMap = new Map();
  if (!getIsMyTurn(state, ctx) || !selected) return legalMap;
  if (selected.kind === 'board') {
    for (const m of getLegalMovesForPiece(state.board, selected.r, selected.c)) {
      legalMap.set(`${m.r},${m.c}`, { capture: m.capture });
    }
  } else if (selected.kind === 'hand') {
    for (const sq of getLegalDrops(state.board, state.hands, state.currentTurnOwner, selected.pieceType)) {
      legalMap.set(`${sq.r},${sq.c}`, { capture: false });
    }
  }
  return legalMap;
}

/**
 * In-place highlight patch for clicks — 120ms snappy cadence, zero DOM rebuild!
 */
function patchHighlights(container, state, ctx) {
  const isMyTurn = getIsMyTurn(state, ctx);
  const legalMap = computeLegalMap(state, ctx);
  const lang = ctx.lang;

  container.querySelectorAll('#tj-board-grid .tj-cell').forEach((cellEl) => {
    const r = Number(cellEl.dataset.r);
    const c = Number(cellEl.dataset.c);
    const legal = legalMap.get(`${r},${c}`);
    const isSel = selected?.kind === 'board' && selected.r === r && selected.c === c;
    cellEl.classList.toggle('is-selected', Boolean(isSel));
    cellEl.classList.toggle('is-legal', Boolean(legal));
    cellEl.classList.toggle('is-capture', Boolean(legal?.capture));
  });

  container.querySelectorAll('.tj-dock-btn').forEach((btn) => {
    const owner = Number(btn.dataset.dropOwner);
    const pt = btn.dataset.dropType;
    const idx = Number(btn.dataset.dropIdx);
    const isSel =
      isMyTurn &&
      owner === state.currentTurnOwner &&
      selected?.kind === 'hand' &&
      selected.pieceType === pt &&
      selected.idx === idx;
    btn.querySelector('.tj-piece')?.classList.toggle('is-selected', Boolean(isSel));
  });

  // Update status hint text in place
  const statusEl = container.querySelector('#tj-status-text');
  if (statusEl) {
    const activeName = state.currentTurnOwner != null ? state.seats[state.currentTurnOwner]?.name : '';
    statusEl.textContent =
      state.phase === 'ended'
        ? lang === 'zh'
          ? '本场死亡对决已分出胜负。'
          : 'Death Match concluded.'
        : isMyTurn
        ? selected?.kind === 'hand'
          ? lang === 'zh'
            ? `已选中俘虏「${PIECE_META[selected.pieceType].hanja}」，点击高亮空格空降（不可落入敌阵）。`
            : `Prisoner ${PIECE_META[selected.pieceType].hanja} selected — tap a highlighted square to drop.`
          : selected?.kind === 'board'
          ? lang === 'zh'
            ? '点击青色/绯红高亮格完成移动，或点击其他己方棋子切换。'
            : 'Tap a highlighted square to move or capture, or choose another piece.'
          : lang === 'zh'
          ? '轮到你行动：点击己方棋子移动，或点击俘虏区棋子空降。'
          : 'Your turn: select one of your pieces to move, or a prisoner to drop.'
        : lang === 'zh'
        ? `等待 ${activeName} 落子…`
        : `Waiting for ${activeName}…`;
  }
}

async function handleCellClick(container, cellEl) {
  const state = latestState;
  const ctx = latestCtx;
  if (!state || !ctx || !getIsMyTurn(state, ctx)) return;

  const r = Number(cellEl.dataset.r);
  const c = Number(cellEl.dataset.c);
  const legalMap = computeLegalMap(state, ctx);

  if (selected && legalMap.has(`${r},${c}`)) {
    const action =
      selected.kind === 'board'
        ? { type: 'MOVE', payload: { fromR: selected.r, fromC: selected.c, toR: r, toC: c } }
        : { type: 'DROP', payload: { pieceType: selected.pieceType, toR: r, toC: c } };
    selected = null;
    patchHighlights(container, state, ctx);
    const res = await ctx.dispatch(action);
    if (!res.ok) {
      SFX.play('error');
      Motion.nudgeError(cellEl, { intensity: 'subtle' });
      UI.toast(res.reason || 'Illegal move', 'error');
    }
    return;
  }

  const piece = state.board[r]?.[c];
  if (piece && piece.owner === state.currentTurnOwner) {
    SFX.play('click');
    if (selected?.kind === 'board' && selected.r === r && selected.c === c) {
      selected = null;
    } else {
      selected = { kind: 'board', r, c };
    }
    patchHighlights(container, state, ctx);
  } else if (selected) {
    // Clicked non-legal square while holding a piece -> subtle nudge if attempting enemy territory drop
    if (selected.kind === 'hand') {
      SFX.play('error');
      Motion.nudgeError(cellEl, { intensity: 'subtle' });
    }
    selected = null;
    patchHighlights(container, state, ctx);
  }
}

mountGame({
  config: {
    id: 'twelve-janggi',
    title: { zh: '十二将棋', en: 'Twelve Janggi', ko: '십이장기' },
    seasons: ['S3', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'matchFormat',
        label: { zh: '赛制', en: 'Match Format' },
        type: 'select',
        default: 'bo3',
        options: [
          { value: 'bo3', label: { zh: '三局两胜（官方赛制）', en: 'Best of 3 (Official)' } },
          { value: 'bo1', label: { zh: '一局定胜负', en: 'Single Game' } },
        ],
      },
      {
        key: 'turnClock',
        label: { zh: '回合限时', en: 'Turn Clock' },
        type: 'select',
        default: '30s',
        options: [
          { value: '30s', label: { zh: '30 秒（S4E11 赛制）', en: '30s (S4E11 Official)' } },
          { value: 'off', label: { zh: '不限时', en: 'Unlimited' } },
        ],
      },
    ],
    rulesSummary: {
      zh: `### 十二将棋（S3E7 · S3E12 · S4E11）
在 3×4 共 12 格棋盘上展开的极致策略死亡对决，采用三局两胜制。

### 棋子移动（每枚棋子边缘均刻有方向点）
- **王 (王)**：八个方向移动 1 格。
- **將 (将)**：前后左右 4 个正方向移动 1 格。
- **相 (相)**：四个斜方向移动 1 格。
- **子 (子)**：仅向前移动 1 格；进入敌方底线 3 格（敌阵）立即升变为**侯 (侯)**（除后斜两格外的六向移动）。

### 俘虏空降与获胜条件
- 吃掉敌方棋子可将其收入己方俘虏区（升变的“侯”被吃后退化为“子”），并在己方回合消耗 1 次行动空降到任意空格——**但绝不可空降到敌方底线 3 格内**。
- **击杀胜**：吃掉对方“王”立即获胜。
- **闯阵胜（Try Rule）**：己方“王”进入敌方底线 3 格并挺过对手接下来的 1 个回合未被吃掉，立即获胜！`,
      en: `### Twelve Janggi (S3E7 · S3E12 · S4E11)
Deceptively deep 3×4 micro-chess from *The Genius*, played as a Best-of-3 match.

### Piece Movement (Directional Dots Etched on Every Tile)
- **King (王)**: 1 square in all 8 directions.
- **General (將)**: 1 square orthogonally (up, down, left, right).
- **Minister (相)**: 1 square diagonally.
- **Man (子)**: 1 square straight forward; promotes immediately to **Feudal Lord (侯)** upon entering the opponent's 3-square back rank (moves 1 square in 6 directions—all except backward diagonals).

### Captures, Drops & Victory
- Captured pieces join your Prisoner Tray (captured **侯** reverts to **子**). On your turn, either move a board piece OR drop a prisoner onto any empty square—**EXCEPT never inside the opponent's 3-square territory**.
- **Capture Win**: Capture the enemy King (王).
- **Try Rule Win**: Move your King into the enemy's 3-square territory and survive 1 opponent turn!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, activeSeatId, mode, lang, lastEvent, setTelemetry } = ctx;
    if (!state) return;

    latestCtx = ctx;
    latestState = state;

    const firstMount = container.dataset.mountedGame !== 'twelve-janggi';
    if (firstMount) {
      mountSkeleton(container);
      lastScores = state.scores.slice();
    }

    let promotedThisTurn = false;
    if (lastEvent && lastEvent !== lastEventSig) {
      lastEventSig = lastEvent;
      if (lastEvent.type === 'KING_CAPTURE' || lastEvent.type === 'TRY_WIN') {
        SFX.play('clash');
      } else if (lastEvent.type === 'PROMOTE') {
        SFX.play('combo');
        promotedThisTurn = true;
      } else if (lastEvent.type === 'CAPTURE') {
        SFX.play('garnetClink');
      } else if (lastEvent.type === 'MOVE' || lastEvent.type === 'DROP') {
        SFX.play('tilePlace');
      }
      if (lastEvent.tryWarning) SFX.play('heartbeat');
      selected = null;
    }

    setTelemetry({
      round: state.gameNumber,
      phase:
        state.bestOf === 3
          ? { zh: `第 ${state.gameNumber} 局 · 比分 ${state.scores[0]}:${state.scores[1]}`, en: `Game ${state.gameNumber} · ${state.scores[0]}–${state.scores[1]}` }
          : { zh: '单局决胜', en: 'Single Game' },
    });

    const mySeat = state.seats.find((s) => s.seatId === activeSeatId);
    const myOwner = mySeat ? mySeat.owner : 0;
    const isMyTurn = getIsMyTurn(state, ctx);
    const flipped = mode === 'online' && myOwner === 1;

    if (!isMyTurn) selected = null;
    if (selected?.kind === 'board') {
      const p = state.board[selected.r]?.[selected.c];
      if (!p || p.owner !== state.currentTurnOwner) selected = null;
    } else if (selected?.kind === 'hand') {
      if (!state.hands[state.currentTurnOwner].includes(selected.pieceType)) selected = null;
    }

    // Patch scoreboard names, animated numeric scores, and pips
    container.querySelector('#tj-name-0').textContent = state.seats[0].name;
    container.querySelector('#tj-name-1').textContent = state.seats[1].name;
    for (let o = 0; o < 2; o++) {
      const scoreEl = container.querySelector(`#tj-score-${o}`);
      if (lastScores[o] !== state.scores[o]) {
        Motion.animateNumber(scoreEl, lastScores[o], state.scores[o], { duration: 280 });
        lastScores[o] = state.scores[o];
      } else {
        scoreEl.textContent = String(state.scores[o]);
      }
      const pipRow = container.querySelector(`#tj-pips-${o}`);
      let pipsHtml = '';
      for (let i = 0; i < state.winsToMatch; i++) {
        pipsHtml += `<span class="tj-pip is-p${o} ${i < state.scores[o] ? 'is-won' : ''}"></span>`;
      }
      pipRow.innerHTML = pipsHtml;
    }

    container.querySelector('#tj-match-badge').textContent =
      state.bestOf === 3
        ? lang === 'zh'
          ? `三局两胜 · 第 ${state.gameNumber} 局`
          : `BEST OF 3 · GAME ${state.gameNumber}`
        : lang === 'zh'
        ? '单局决胜'
        : 'SINGLE GAME';

    // Try Rule Banner (interruptible presence)
    const tryBanner = container.querySelector('#tj-try-banner');
    const showTry = state.tryWarningOwner !== null && state.phase === 'playing';
    if (showTry) {
      container.querySelector('#tj-try-text').textContent =
        lang === 'zh'
          ? `【闯阵警报】${state.seats[state.tryWarningOwner].name} 的「王」已杀入敌阵！若本回合未能击杀将直接判负！`
          : `TRY RULE ALERT: ${state.seats[state.tryWarningOwner].name}'s King is inside enemy territory! Capture it now or lose!`;
    }
    Motion.transitionPresence(tryBanner, showTry, { preset: 'pill' });

    // Round Banner
    const roundToast = container.querySelector('#tj-round-toast');
    const showRound = Boolean(state.lastGameBanner && state.phase === 'playing');
    if (showRound) {
      roundToast.textContent =
        state.lastGameBanner.reason === 'repetition'
          ? lang === 'zh'
            ? `第 ${state.lastGameBanner.gameNumber} 局三次重复局面和棋，重新开局！`
            : `Game ${state.lastGameBanner.gameNumber} drew by repetition — replaying!`
          : lang === 'zh'
          ? `第 ${state.lastGameBanner.gameNumber} 局由 ${state.seats[state.lastGameBanner.winnerOwner].name} 胜出（当前大比分 ${state.scores[0]}:${state.scores[1]}），已开启第 ${state.gameNumber} 局！`
          : `${state.seats[state.lastGameBanner.winnerOwner].name} won Game ${state.lastGameBanner.gameNumber} (${state.scores[0]}–${state.scores[1]}). Game ${state.gameNumber} underway!`;
    }
    Motion.transitionPresence(roundToast, showRound, { preset: 'pill' });

    // Capture FLIP snapshot of all pieces across board + both prisoner docks BEFORE DOM mutation!
    const boardCol = container.querySelector('#tj-board-column');
    const playFlip = firstMount
      ? null
      : Motion.flipList(boardCol, '.tj-piece', { keyAttr: 'data-piece-id', duration: 240, enterScale: 0.94 });

    // Patch 12 board cells in place
    const rowOrder = flipped ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const colOrder = flipped ? [2, 1, 0] : [0, 1, 2];
    const cellEls = container.querySelectorAll('#tj-board-grid .tj-cell');
    let idx = 0;

    for (const r of rowOrder) {
      for (const c of colOrder) {
        const cellEl = cellEls[idx++];
        const piece = state.board[r][c];
        const isLastFrom = state.lastMove && state.lastMove.fromR === r && state.lastMove.fromC === c;
        const isLastTo = state.lastMove && state.lastMove.toR === r && state.lastMove.toC === c;
        const canSelectPiece = isMyTurn && piece && piece.owner === state.currentTurnOwner;

        cellEl.dataset.r = String(r);
        cellEl.dataset.c = String(c);
        cellEl.setAttribute('aria-label', `${COL_LETTERS[c]}${r + 1}`);
        cellEl.classList.toggle('is-terr-p1', r === 0);
        cellEl.classList.toggle('is-terr-p0', r === 3);
        cellEl.classList.toggle('is-last-from', Boolean(isLastFrom));
        cellEl.classList.toggle('is-last-to', Boolean(isLastTo));
        cellEl.querySelector('.tj-cell-coord').textContent = `${COL_LETTERS[c]}${r + 1}`;

        const slot = cellEl.querySelector('.tj-cell-slot');
        slot.textContent = '';
        if (piece) {
          const pid = piece.id || `b-${piece.owner}-${piece.type}-${r}-${c}`;
          const justProm = Boolean(promotedThisTurn && isLastTo && piece.type === 'H');
          const el = buildPieceEl(pid, piece.type, piece.owner, flipped, {
            clickable: canSelectPiece,
            justPromoted: justProm,
          });
          slot.appendChild(el);
        }
      }
    }

    // Patch Top & Bottom Prisoner Docks in place
    const topOwner = flipped ? 0 : 1;
    const botOwner = flipped ? 1 : 0;

    const patchDock = (dockPrefix, owner) => {
      const dockEl = container.querySelector(`#tj-dock-${dockPrefix}`);
      const seat = state.seats[owner];
      const hand = state.hands[owner];
      const handIds = state.handIds?.[owner] || [];
      const canDropHere = isMyTurn && owner === state.currentTurnOwner;
      const isTurnOwner = state.phase === 'playing' && state.currentTurnOwner === owner;

      dockEl.classList.toggle('is-active-turn', isTurnOwner);
      container.querySelector(`#tj-dock-${dockPrefix}-name`).textContent = seat.name;
      container.querySelector(`#tj-dock-${dockPrefix}-sub`).textContent =
        owner === 0
          ? lang === 'zh'
            ? '绯红 · 南阵'
            : 'CRIMSON'
          : lang === 'zh'
          ? '曜金 · 北阵'
          : 'OBSIDIAN';

      const tray = container.querySelector(`#tj-dock-${dockPrefix}-pieces`);
      tray.textContent = '';
      if (hand.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'tj-dock-empty';
        empty.textContent = lang === 'zh' ? '暂无俘虏' : 'No prisoners';
        tray.appendChild(empty);
      } else {
        hand.forEach((pt, i) => {
          const pid = handIds[i] || `h-${owner}-${pt}-${i}`;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tj-dock-btn';
          btn.dataset.dropOwner = String(owner);
          btn.dataset.dropType = pt;
          btn.dataset.dropIdx = String(i);
          btn.disabled = !canDropHere;
          btn.title = PIECE_META[pt][lang];
          btn.appendChild(buildPieceEl(pid, pt, owner, flipped, { clickable: canDropHere, compact: true }));
          btn.addEventListener('click', () => {
            if (!getIsMyTurn(latestState, latestCtx)) return;
            if (owner !== latestState.currentTurnOwner) return;
            SFX.play('click');
            if (selected?.kind === 'hand' && selected.pieceType === pt && selected.idx === i) {
              selected = null;
            } else {
              selected = { kind: 'hand', pieceType: pt, idx: i };
            }
            patchHighlights(container, latestState, latestCtx);
          });
          tray.appendChild(btn);
        });
      }
    };

    patchDock('top', topOwner);
    patchDock('bot', botOwner);

    // Execute FLIP glide for moved/captured/dropped pieces!
    playFlip?.();

    if (promotedThisTurn && state.lastMove) {
      const promEl = container.querySelector(
        `#tj-board-grid .tj-cell[data-r="${state.lastMove.toR}"][data-c="${state.lastMove.toC}"] .tj-piece`
      );
      if (promEl) Motion.pulseConfirm(promEl, { tone: 'gold', duration: 320 });
    }

    // Patch highlights & status text
    patchHighlights(container, state, ctx);

    // Patch static titles, legend, and move ledger
    container.querySelector('#tj-title-status').textContent = lang === 'zh' ? '战况指示' : 'Tactical Status';
    container.querySelector('#tj-title-legend').textContent = lang === 'zh' ? '棋子图鉴' : 'Piece Guide';
    container.querySelector('#tj-title-log').textContent = lang === 'zh' ? '棋谱记录' : 'Move Ledger';

    const legendGrid = container.querySelector('#tj-legend-grid');
    if (legendGrid.dataset.lang !== lang) {
      legendGrid.dataset.lang = lang;
      legendGrid.innerHTML = ['K', 'G', 'M', 'P', 'H']
        .map((k) => {
          const m = PIECE_META[k];
          return `<div class="tj-legend-row"><span class="tj-legend-chip">${m.hanja}</span><span><strong>${lang === 'zh' ? m.zh : m.en}</strong> · ${lang === 'zh' ? m.descZh : m.descEn}</span></div>`;
        })
        .join('');
    }

    const logList = container.querySelector('#tj-log-list');
    if (state.moveLog.length === 0) {
      logList.innerHTML = `<span class="tj-dock-empty">${lang === 'zh' ? '尚未落子' : 'No moves yet'}</span>`;
    } else {
      logList.innerHTML = state.moveLog
        .slice()
        .reverse()
        .map((m) => `<span class="tj-log-chip is-p${m.owner}">#${m.ply} ${UI.escapeHtml(m.notation)}</span>`)
        .join('');
    }
  },
});

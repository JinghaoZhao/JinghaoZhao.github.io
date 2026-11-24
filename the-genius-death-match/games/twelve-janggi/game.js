/**
 * Twelve Janggi (십이장기 / 十二将棋) — Interactive Broadcast Renderer
 */

import { mountGame, SFX, UI } from '../../shared/sdk.js';
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

function renderPieceHtml(type, owner, flippedView, { clickable = false, compact = false, isSelected = false } = {}) {
  const dirs = getPieceDirs(type, owner);
  // If view is flipped (owner 1 playing at bottom), visually rotate directions 180°
  const visualDirs = flippedView ? dirs.map(([dr, dc]) => [-dr, -dc]) : dirs;
  const meta = PIECE_META[type];
  const dotsHtml = visualDirs
    .map(([dr, dc]) => `<span class="tj-dir-dot" data-dir="${dr},${dc}" aria-hidden="true"></span>`)
    .join('');

  const cls = [
    'tj-piece',
    `is-owner-${owner}`,
    type === 'H' ? 'is-promoted' : '',
    clickable ? 'is-clickable' : '',
    compact ? 'tj-dock-tile' : '',
    isSelected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <div class="${cls}">
      ${dotsHtml}
      <span class="tj-piece-hanja">${meta.hanja}</span>
      <span class="tj-piece-sub">${meta.en.slice(0, 4)}</span>
    </div>
  `;
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

  render: function renderGame(container, ctx) {
    const { state, activeSeatId, mode, lang, lastEvent, dispatch, setTelemetry } = ctx;
    if (!state) return;

    // Audio cues for latest event
    if (lastEvent && lastEvent !== lastEventSig) {
      lastEventSig = lastEvent;
      if (lastEvent.type === 'KING_CAPTURE' || lastEvent.type === 'TRY_WIN') {
        SFX.play('clash');
      } else if (lastEvent.type === 'PROMOTE') {
        SFX.play('combo');
      } else if (lastEvent.type === 'CAPTURE') {
        SFX.play('garnetClink');
      } else if (lastEvent.type === 'MOVE' || lastEvent.type === 'DROP') {
        SFX.play('tilePlace');
      }
      if (lastEvent.tryWarning) {
        SFX.play('heartbeat');
      }
      // Clear selection when state advances
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
    const isMyTurn = state.phase === 'playing' && !ctx.isSpectator && state.currentTurnSeatId === activeSeatId;
    // Flip board only in online mode when viewer is owner 1 so their pieces stay at the bottom
    const flipped = mode === 'online' && myOwner === 1;

    // Validate current selection
    if (!isMyTurn) selected = null;
    if (selected?.kind === 'board') {
      const p = state.board[selected.r]?.[selected.c];
      if (!p || p.owner !== state.currentTurnOwner) selected = null;
    } else if (selected?.kind === 'hand') {
      if (!state.hands[state.currentTurnOwner].includes(selected.pieceType)) selected = null;
    }

    // Compute legal highlight map
    const legalMap = new Map(); // "r,c" -> { capture }
    if (isMyTurn && selected) {
      if (selected.kind === 'board') {
        for (const m of getLegalMovesForPiece(state.board, selected.r, selected.c)) {
          legalMap.set(`${m.r},${m.c}`, { capture: m.capture });
        }
      } else if (selected.kind === 'hand') {
        for (const sq of getLegalDrops(state.board, state.hands, state.currentTurnOwner, selected.pieceType)) {
          legalMap.set(`${sq.r},${sq.c}`, { capture: false });
        }
      }
    }

    const topOwner = flipped ? 0 : 1;
    const botOwner = flipped ? 1 : 0;
    const rowOrder = flipped ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const colOrder = flipped ? [2, 1, 0] : [0, 1, 2];
    const colLetters = ['A', 'B', 'C'];

    const renderDock = (owner, position) => {
      const seat = state.seats[owner];
      const hand = state.hands[owner];
      const canDropHere = isMyTurn && owner === state.currentTurnOwner;
      const isTurnOwner = state.phase === 'playing' && state.currentTurnOwner === owner;
      const piecesHtml =
        hand.length === 0
          ? `<span class="tj-dock-empty">${lang === 'zh' ? '暂无俘虏' : 'No prisoners'}</span>`
          : hand
              .map((pt, idx) => {
                const isSel = selected?.kind === 'hand' && selected.pieceType === pt && selected.idx === idx && canDropHere;
                return `<button type="button" class="tj-dock-btn" data-drop-owner="${owner}" data-drop-type="${pt}" data-drop-idx="${idx}" ${canDropHere ? '' : 'disabled'} title="${UI.escapeHtml(PIECE_META[pt][lang])}">${renderPieceHtml(pt, owner, flipped, { clickable: canDropHere, compact: true, isSelected: isSel })}</button>`;
              })
              .join('');

      return `
        <div class="tj-dock ${isTurnOwner ? 'is-active-turn' : ''}" data-pos="${position}">
          <div class="tj-dock-label">
            <span class="tj-dock-name">${UI.escapeHtml(seat.name)}</span>
            <span class="tj-dock-sub">${owner === 0 ? (lang === 'zh' ? '绯红·先阵' : 'CRIMSON') : (lang === 'zh' ? '曜金·北阵' : 'OBSIDIAN')}</span>
          </div>
          <div class="tj-dock-pieces">${piecesHtml}</div>
        </div>
      `;
    };

    const renderPips = (owner) => {
      const won = state.scores[owner];
      let html = '';
      for (let i = 0; i < state.winsToMatch; i++) {
        html += `<span class="tj-pip is-p${owner} ${i < won ? 'is-won' : ''}"></span>`;
      }
      return html;
    };

    const tryBannerHtml =
      state.tryWarningOwner !== null && state.phase === 'playing'
        ? `<div class="tj-try-banner" role="alert">
            <span>⚠️</span>
            <span>${
              lang === 'zh'
                ? `【闯阵警报】${UI.escapeHtml(state.seats[state.tryWarningOwner].name)} 的「王」已杀入敌阵！若本回合未能将其击杀，将直接判负！`
                : `TRY RULE ALERT: ${UI.escapeHtml(state.seats[state.tryWarningOwner].name)}'s King is inside enemy territory! Capture it NOW or lose immediately!`
            }</span>
          </div>`
        : '';

    const roundBannerHtml =
      state.lastGameBanner && state.phase === 'playing'
        ? `<div class="tj-round-toast">${
            state.lastGameBanner.reason === 'repetition'
              ? lang === 'zh'
                ? `第 ${state.lastGameBanner.gameNumber} 局三次重复局面和棋，重新开局！`
                : `Game ${state.lastGameBanner.gameNumber} ended in threefold repetition — replaying!`
              : lang === 'zh'
              ? `第 ${state.lastGameBanner.gameNumber} 局由 ${UI.escapeHtml(state.seats[state.lastGameBanner.winnerOwner].name)} 胜出（当前大比分 ${state.scores[0]}:${state.scores[1]}），已开启第 ${state.gameNumber} 局！`
              : `${UI.escapeHtml(state.seats[state.lastGameBanner.winnerOwner].name)} won Game ${state.lastGameBanner.gameNumber} (Match ${state.scores[0]}–${state.scores[1]}). Game ${state.gameNumber} underway!`
          }</div>`
        : '';

    let cellsHtml = '';
    for (const r of rowOrder) {
      for (const c of colOrder) {
        const piece = state.board[r][c];
        const legal = legalMap.get(`${r},${c}`);
        const isSel = selected?.kind === 'board' && selected.r === r && selected.c === c;
        const isLastFrom = state.lastMove && state.lastMove.fromR === r && state.lastMove.fromC === c;
        const isLastTo = state.lastMove && state.lastMove.toR === r && state.lastMove.toC === c;
        const terrCls = r === 0 ? 'is-terr-p1' : r === 3 ? 'is-terr-p0' : '';
        const canSelectPiece = isMyTurn && piece && piece.owner === state.currentTurnOwner;

        cellsHtml += `
          <button type="button"
            class="tj-cell ${terrCls} ${isSel ? 'is-selected' : ''} ${legal ? 'is-legal' : ''} ${legal?.capture ? 'is-capture' : ''} ${isLastFrom ? 'is-last-from' : ''} ${isLastTo ? 'is-last-to' : ''}"
            data-r="${r}" data-c="${c}"
            aria-label="${colLetters[c]}${r + 1}">
            <span class="tj-cell-coord">${colLetters[c]}${r + 1}</span>
            ${piece ? renderPieceHtml(piece.type, piece.owner, flipped, { clickable: canSelectPiece }) : ''}
          </button>
        `;
      }
    }

    const activeName = state.currentTurnOwner != null ? state.seats[state.currentTurnOwner]?.name : '';
    const turnHint =
      state.phase === 'ended'
        ? lang === 'zh'
          ? '本场死亡对决已分出胜负。'
          : 'Death Match concluded.'
        : isMyTurn
        ? selected?.kind === 'hand'
          ? lang === 'zh'
            ? `已选中俘虏「${PIECE_META[selected.pieceType].hanja}」，点击高亮空格空降（不可落入敌阵）。`
            : `Prisoner ${PIECE_META[selected.pieceType].hanja} selected — tap a glowing square to drop (not in enemy territory).`
          : selected?.kind === 'board'
          ? lang === 'zh'
            ? '点击青色/绯红高亮格完成移动，或点击其他己方棋子切换。'
            : 'Tap a highlighted square to move/capture, or choose another piece.'
          : lang === 'zh'
          ? '轮到你行动：点击己方棋子移动，或点击俘虏区棋子空降。'
          : 'Your turn: select one of your pieces to move, or a prisoner to drop.'
        : lang === 'zh'
        ? `等待 ${UI.escapeHtml(activeName)} 思考落子…`
        : `Waiting for ${UI.escapeHtml(activeName)}…`;

    const legendRows = ['K', 'G', 'M', 'P', 'H']
      .map((k) => {
        const m = PIECE_META[k];
        return `<div class="tj-legend-row"><span class="tj-legend-chip">${m.hanja}</span><span><strong>${lang === 'zh' ? m.zh : m.en}</strong> · ${lang === 'zh' ? m.descZh : m.descEn}</span></div>`;
      })
      .join('');

    const logHtml =
      state.moveLog.length === 0
        ? `<span class="tj-dock-empty">${lang === 'zh' ? '尚未落子' : 'No moves yet'}</span>`
        : state.moveLog
            .slice()
            .reverse()
            .map(
              (m) =>
                `<span class="tj-log-chip is-p${m.owner}">#${m.ply} ${UI.escapeHtml(m.notation)}</span>`
            )
            .join('');

    container.innerHTML = `
      <div class="tj-arena">
        <div class="tj-top-strip">
          <div class="tj-score-pips">
            <div class="tj-side-score">
              <span class="tj-side-dot is-p0"></span>
              <span>${UI.escapeHtml(state.seats[0].name)}</span>
              <span class="tj-pip-row">${renderPips(0)}</span>
            </div>
            <span style="color:var(--tg-ink-faint);font-family:var(--tg-font-mono);font-weight:800;">VS</span>
            <div class="tj-side-score">
              <span class="tj-pip-row">${renderPips(1)}</span>
              <span>${UI.escapeHtml(state.seats[1].name)}</span>
              <span class="tj-side-dot is-p1"></span>
            </div>
          </div>
          <span class="tg-badge tg-badge-gold">${
            state.bestOf === 3
              ? lang === 'zh'
                ? `三局两胜 · 第 ${state.gameNumber} 局`
                : `BEST OF 3 · GAME ${state.gameNumber}`
              : lang === 'zh'
              ? '单局决胜'
              : 'SINGLE GAME'
          }</span>
        </div>

        ${tryBannerHtml}
        ${roundBannerHtml}

        <div class="tj-board-column">
          ${renderDock(topOwner, 'top')}
          <div class="tj-board-frame">
            <div class="tj-board-grid" id="tj-board-grid">${cellsHtml}</div>
          </div>
          ${renderDock(botOwner, 'bottom')}
        </div>

        <div class="tj-side-panel">
          <div class="tj-card">
            <h4 class="tj-card-title">${lang === 'zh' ? '战况指示' : 'Tactical Status'}</h4>
            <p class="tj-status-text">${turnHint}</p>
          </div>

          <div class="tj-card">
            <h4 class="tj-card-title">${lang === 'zh' ? '棋子图鉴' : 'Piece Guide'}</h4>
            <div class="tj-legend-grid">${legendRows}</div>
          </div>

          <div class="tj-card">
            <h4 class="tj-card-title">${lang === 'zh' ? '棋谱记录' : 'Move Ledger'}</h4>
            <div class="tj-log-list">${logHtml}</div>
          </div>
        </div>
      </div>
    `;

    // Bind board cell clicks
    container.querySelectorAll('.tj-cell').forEach((cellEl) => {
      cellEl.addEventListener('click', async () => {
        if (!isMyTurn) return;
        const r = Number(cellEl.dataset.r);
        const c = Number(cellEl.dataset.c);

        // If clicking a legal target for current selection -> dispatch move/drop
        if (selected && legalMap.has(`${r},${c}`)) {
          const action =
            selected.kind === 'board'
              ? { type: 'MOVE', payload: { fromR: selected.r, fromC: selected.c, toR: r, toC: c } }
              : { type: 'DROP', payload: { pieceType: selected.pieceType, toR: r, toC: c } };
          selected = null;
          const res = await dispatch(action);
          if (!res.ok) {
            SFX.play('error');
            UI.toast(res.reason || 'Illegal move', 'error');
          }
          return;
        }

        // Otherwise select/deselect own piece
        const piece = state.board[r]?.[c];
        if (piece && piece.owner === state.currentTurnOwner) {
          SFX.play('click');
          if (selected?.kind === 'board' && selected.r === r && selected.c === c) {
            selected = null;
          } else {
            selected = { kind: 'board', r, c };
          }
          // Re-render locally with updated selection
          renderGame(container, ctx);
        } else if (selected) {
          selected = null;
          renderGame(container, ctx);
        }
      });
    });

    // Bind prisoner drop tray buttons
    container.querySelectorAll('.tj-dock-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isMyTurn) return;
        const owner = Number(btn.dataset.dropOwner);
        if (owner !== state.currentTurnOwner) return;
        const pieceType = btn.dataset.dropType;
        const idx = Number(btn.dataset.dropIdx);
        SFX.play('click');
        if (selected?.kind === 'hand' && selected.pieceType === pieceType && selected.idx === idx) {
          selected = null;
        } else {
          selected = { kind: 'hand', pieceType, idx };
        }
        renderGame(container, ctx);
      });
    });
  },
});

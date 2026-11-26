/**
 * The Devil's Plan Season 3: Dead Again — Day 4 Main Match 4
 * 拍卖宾果 (Auction Bingo / 경매 빙고) — Broadcast Auction House Renderer
 * Upgraded with Motion.patchDOM, Motion.delegate, slidingIndicator, animateNumber & shake
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import { GameRules, SHAPES, BINGO_LINES } from './rules.js';

const SHAPE_META = {
  O: { symbol: '○', zh: '圆形', en: 'Circle' },
  T: { symbol: '△', zh: '三角形', en: 'Triangle' },
  S: { symbol: '☆', zh: '星形', en: 'Star' },
};

// SVG line endpoints (in a 300×300 coordinate space matching a 3×3 grid with centers at 50, 150, 250)
const LINE_COORDS = [
  [22, 50, 278, 50],   // Row 0
  [22, 150, 278, 150], // Row 1
  [22, 250, 278, 250], // Row 2
  [50, 22, 50, 278],   // Col 0
  [150, 22, 150, 278], // Col 1
  [250, 22, 250, 278], // Col 2
  [26, 26, 274, 274],  // Main Diag
  [274, 26, 26, 274],  // Anti Diag
];

// Local interactive UI draft & motion numeric tracking state
const uiDraft = {
  key: '',
  selectedCoinIds: new Set(),
  usePiece: false,
  lastEventSig: '',
  prevDraftTotal: 0,
  prevWallet: null,
  prevBingoCount: null,
  prevFilledCount: null,
  latestCtx: null,
  latestContainer: null,
};

function syncDraftKey(state, mySeatId) {
  const k = `${state.round}-${state.phase}-${mySeatId || 'spec'}`;
  if (uiDraft.key !== k) {
    uiDraft.key = k;
    uiDraft.selectedCoinIds = new Set();
    uiDraft.usePiece = false;
    uiDraft.prevDraftTotal = 0;
  }
}

function renderLaserOverlay(completedLines) {
  if (!completedLines || !completedLines.length) {
    return `<svg class="ab-laser-svg" data-motion-key="ab-laser-svg" viewBox="0 0 300 300" aria-hidden="true"></svg>`;
  }
  return `
    <svg class="ab-laser-svg" data-motion-key="ab-laser-svg" viewBox="0 0 300 300" aria-hidden="true">
      ${completedLines
        .map((li) => {
          const [x1, y1, x2, y2] = LINE_COORDS[li];
          return `<line class="ab-laser-line" data-motion-key="ab-laser-${li}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
        })
        .join('')}
    </svg>
  `;
}

function buildBingoCellSet(completedLines) {
  const s = new Set();
  for (const li of completedLines || []) {
    for (const idx of BINGO_LINES[li]) s.add(idx);
  }
  return s;
}

function playEventSfx(lastEvent, sfx, log, lang) {
  if (!lastEvent) return;
  const sig = `${lastEvent.type}-${lastEvent.round || ''}-${lastEvent.seatId || ''}-${lastEvent.ts || ''}`;
  if (sig === uiDraft.lastEventSig) return;
  uiDraft.lastEventSig = sig;

  if (lastEvent.type === 'POOLS_REVEALED') {
    sfx.play('reveal');
    const p = lastEvent.pools || {};
    log(
      lang === 'zh'
        ? `第 ${lastEvent.round} 轮站队揭晓：○×${p.O || 0}、△×${p.T || 0}、☆×${p.S || 0}！密室暗标开启！`
        : `Round ${lastEvent.round} Pools Revealed: ○×${p.O || 0}, △×${p.T || 0}, ☆×${p.S || 0}! Sealed bidding open!`,
      'system'
    );
  } else if (lastEvent.type === 'GAVEL_DROP') {
    sfx.play('bid');
    log(
      lang === 'zh'
        ? `第 ${lastEvent.round} 轮落槌！${lastEvent.blindMode ? '中标结果已封印入保险库。' : '个人中标结果已私密送达。'}`
        : `Round ${lastEvent.round} Gavel Dropped! ${lastEvent.blindMode ? 'Results sealed in vault.' : 'Private outcomes delivered.'}`,
      'alert'
    );
  } else if (lastEvent.type === 'GRAND_REVEAL_OPEN') {
    sfx.play('reveal');
    log(
      lang === 'zh'
        ? '7 轮盲拍全部结束！保险库总启封，请将赢得的图形砖填入 3×3 宾果盘！'
        : 'All 7 auctions complete! Vault unsealed — place your earned tiles onto the 3×3 Bingo board!',
      'alert'
    );
  } else if (lastEvent.type === 'BOARD_LOCKED') {
    sfx.play('pieceGain');
  }
}

function bindDelegatedEvents(container) {
  // Phase 1: Shape Selection (click & keyboard)
  Motion.delegate(
    container,
    'click',
    '[data-pick-shape]',
    async (e, box) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      const sh = box.dataset.pickShape;
      ctx.sfx.play('cardFlip');
      const res = await ctx.dispatch({ type: 'SELECT_SHAPE', payload: { shape: sh } });
      if (!res.ok) {
        Motion.shake(box);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'ab-pick-shape-click'
  );

  Motion.delegate(
    container,
    'keydown',
    '[data-pick-shape]',
    async (e, box) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      box.click();
    },
    'ab-pick-shape-key'
  );

  // Phase 2: Coin Click Toggle
  Motion.delegate(
    container,
    'click',
    '[data-toggle-coin]',
    (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx || btn.disabled) return;
      const cid = btn.dataset.toggleCoin;
      ctx.sfx.play('click');
      if (uiDraft.selectedCoinIds.has(cid)) {
        uiDraft.selectedCoinIds.delete(cid);
      } else {
        uiDraft.selectedCoinIds.add(cid);
      }
      renderAuctionBingo(uiDraft.latestContainer, ctx);
    },
    'ab-coin-toggle'
  );

  // Phase 2: Coin Drag & Drop into Sealed Envelope
  Motion.delegate(
    container,
    'dragstart',
    '[data-toggle-coin]',
    (e, btn) => {
      const cid = btn.dataset.toggleCoin;
      if (cid) e.dataTransfer?.setData('text/plain', cid);
    },
    'ab-coin-dragstart'
  );

  Motion.delegate(
    container,
    'dragover',
    '#ab-envelope-drop',
    (e, zone) => {
      e.preventDefault();
      zone.classList.add('is-drag-over');
    },
    'ab-env-dragover'
  );

  Motion.delegate(
    container,
    'dragleave',
    '#ab-envelope-drop',
    (e, zone) => {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('is-drag-over');
      }
    },
    'ab-env-dragleave'
  );

  Motion.delegate(
    container,
    'drop',
    '#ab-envelope-drop',
    (e, zone) => {
      e.preventDefault();
      zone.classList.remove('is-drag-over');
      const ctx = uiDraft.latestCtx;
      const cid = e.dataTransfer?.getData('text/plain');
      if (ctx && cid && !uiDraft.selectedCoinIds.has(cid)) {
        ctx.sfx.play('bid');
        uiDraft.selectedCoinIds.add(cid);
        renderAuctionBingo(uiDraft.latestContainer, ctx);
      }
    },
    'ab-env-drop'
  );

  // Piece Boost Toggle & Clear Bid
  Motion.delegate(
    container,
    'click',
    '#ab-toggle-piece',
    () => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      ctx.sfx.play('pieceGain');
      uiDraft.usePiece = !uiDraft.usePiece;
      renderAuctionBingo(uiDraft.latestContainer, ctx);
    },
    'ab-piece-toggle'
  );

  Motion.delegate(
    container,
    'click',
    '#ab-remove-piece',
    () => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      ctx.sfx.play('click');
      uiDraft.usePiece = false;
      renderAuctionBingo(uiDraft.latestContainer, ctx);
    },
    'ab-piece-remove'
  );

  Motion.delegate(
    container,
    'click',
    '#ab-clear-bid',
    () => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      ctx.sfx.play('click');
      uiDraft.selectedCoinIds.clear();
      uiDraft.usePiece = false;
      renderAuctionBingo(uiDraft.latestContainer, ctx);
    },
    'ab-clear-bid'
  );

  // Submit Sealed Bid (with Motion.shake on invalid/0 bid!)
  Motion.delegate(
    container,
    'click',
    '#ab-submit-bid',
    async () => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      const res = await ctx.dispatch({
        type: 'SUBMIT_BID',
        payload: {
          coinIds: [...uiDraft.selectedCoinIds],
          usePieces: uiDraft.usePiece ? 1 : 0,
        },
      });
      if (!res.ok) {
        ctx.sfx.play('error');
        Motion.shake(container.querySelector('#ab-envelope-drop'));
        ctx.ui.toast(res.reason, 'error');
      } else {
        ctx.sfx.play('bid');
      }
    },
    'ab-submit-bid'
  );

  // Phase 3: Advance Round
  Motion.delegate(
    container,
    'click',
    '#ab-next-round',
    async (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      ctx.sfx.play('click');
      const res = await ctx.dispatch({ type: 'ADVANCE_ROUND' });
      if (!res.ok) {
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'ab-next-round'
  );

  // Phase 4: Interactive 3×3 Board Placement
  Motion.delegate(
    container,
    'click',
    '[data-board-cell]',
    async (e, cell) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx || cell.disabled) return;
      const idx = Number(cell.dataset.boardCell);
      ctx.sfx.play('tilePlace');
      const res = await ctx.dispatch({ type: 'TOGGLE_CELL', payload: { cellIdx: idx } });
      if (!res.ok) {
        Motion.shake(cell);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'ab-board-cell'
  );

  Motion.delegate(
    container,
    'click',
    '#ab-btn-optimize',
    async (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      ctx.sfx.play('pieceGain');
      const res = await ctx.dispatch({ type: 'AUTO_OPTIMIZE_BOARD' });
      if (!res.ok) {
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'ab-optimize'
  );

  Motion.delegate(
    container,
    'click',
    '#ab-btn-lock-board',
    async (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      const res = await ctx.dispatch({ type: 'LOCK_BOARD' });
      if (!res.ok) {
        ctx.sfx.play('error');
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      } else {
        ctx.sfx.play('victory');
      }
    },
    'ab-lock-board'
  );
}

mountGame({
  config: {
    id: 'auction-bingo',
    title: { zh: '拍卖宾果', en: 'Auction Bingo', ko: '경매 빙고' },
    category: 'MAIN MATCH',
    episode: 'EP 9–10 · DAY 4',
    minPlayers: 4,
    maxPlayers: 8,
    defaultPlayers: 7,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'blindMode',
        label: { zh: '剧集硬核全盲模式（终局统一开箱）', en: 'Show Blind Mode (Vault Sealed Until R7)' },
        type: 'boolean',
        default: true,
      },
      {
        key: 'includeOrbit',
        label: { zh: '特邀嘉宾「轨道 Orbit」AI 搅局', en: 'Special Guest "Orbit" AI Disruptor' },
        type: 'boolean',
        default: true,
      },
      {
        key: 'fastTimers',
        label: { zh: '快节奏计时', en: 'Fast Timers' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 游戏目标
共进行 **7 轮** 公开站队 + 密室暗标拍卖，收集 **圆形 ○、三角形 △、星形 ☆** 砖块填满全场相同的 **3×3 宾果盘**。连成最多条宾果线者获胜！

### 初始资产
- **7 张名牌票**：每轮投入 1 张到 ○ / △ / ☆ 图形箱。
- **10 枚不可拆分硬币**：面额严格为 \`1×3, 2×3, 3×2, 5×1, 10×1\`（总计 **30 元**）。
- **1 枚恶魔碎片**：竞拍时可作为 \`+1 元\` 追加出价（不可退还）。
- **沉没成本（All-Pay）**：无论是否中标，凡投入竞拍的硬币与碎片一律没收！

### 每轮三阶段
1. **图形选择**：秘密将 1 张名牌票投入 ○、△ 或 ☆。截止后全员公开站队，**某图形被 N 人选择，则该图形本轮奖池 = N 枚砖块**！
2. **密室暗标**：在所选图形池内，使用现存硬币精确组合提交 \`≥ 1 元\` 暗标（若破产无法出价 ≥1 元，将被判最末位惩罚）。
3. **落槌结算**：每个图形池出价最高者独得 \`N\` 枚砖块；若 \`k\` 人并列最高价，则共同中标并各得 \`floor(N / k)\` 枚，余数作废！
- **剧集全盲模式**：每轮到底谁中标、拿了几枚全程保密（连本人都不知情），直到第 7 轮结束后总开箱揭晓！

### 终局计分与破平
- 7 轮结束后启封全部中标记录，将赢得的砖块填入 3×3 对应图形格（超出 3 枚作废，未满 3 枚可自选格位最大化连线）。
- 排名优先：**更多宾果线** → **更多已填格** → **剩余硬币总面值更高** → **剩余碎片更多**。
- 特邀嘉宾「轨道 Orbit」携 1 碎片全程参与搅局，不占正式淘汰/胜出名次。`,
      en: `### Objective
Across **7 rounds** of public pool building and sealed-bid all-pay auctions, win **Circle ○, Triangle △, and Star ☆** tiles to complete lines on the shared **3×3 Bingo Board**. Most Bingo lines wins!

### Starting Assets
- **7 Name Tickets**: Drop 1 ticket per round into ○, △, or ☆.
- **10 Non-Splittable Coins**: Exact denominations \`1×3, 2×3, 3×2, 5×1, 10×1\` (total **30**).
- **1 Devil's Piece**: Optional \`+1\` bid boost in any auction (non-refundable).
- **All-Pay Rule**: Every coin & piece submitted in a sealed bid is permanently consumed whether you win or lose!

### Round Flow
1. **Shape Selection**: Secretly drop 1 ticket into ○, △, or ☆. All choices reveal publicly — **the prize pool for each shape equals N (the exact count of players who picked it)**!
2. **Sealed-Bid Auction**: Bid \`≥ 1\` using any exact subset of your unspent coins (+ optional Piece). Players unable to bid ≥ 1 incur a last-place forfeit penalty.
3. **Gavel Resolution**: Highest bidder in each shape pool wins \`N\` tiles. On a \`k\`-way tie for highest bid, tied bidders each receive \`floor(N / k)\` tiles and the remainder is destroyed!
- **Show Blind Mode**: Winners and bids stay completely sealed until Round 7 ends — even the winner doesn't know if they won!

### Final Placement & Tie-Breakers
- After Round 7, the Vault unseals all 7 rounds! Place your earned tiles onto matching cells on your 3×3 board to maximize Bingo lines.
- Ranking order: **Bingo Lines** → **Filled Cells** → **Remaining Coin Value** → **Remaining Pieces**.
- Special Guest **Orbit** competes in all 7 rounds with 1 Piece to disrupt pools, without occupying an official contestant rank.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderAuctionBingo,
});

function renderAuctionBingo(container, ctx) {
  const { state, mySeatId, lang, lastEvent, sfx, log } = ctx;
  if (!state) return;

  uiDraft.latestCtx = ctx;
  uiDraft.latestContainer = container;

  syncDraftKey(state, mySeatId);
  playEventSfx(lastEvent, sfx, log, lang);
  bindDelegatedEvents(container);

  const me = mySeatId ? state.players[mySeatId] : null;
  const isGrand = state.phase === 'GRAND_REVEAL' || state.phase === 'FINISHED';
  const blind = Boolean(state.options?.blindMode);

  const t = (zh, en) => (lang === 'zh' ? zh : en);
  const shapeName = (sh) => `${SHAPE_META[sh].symbol} ${lang === 'zh' ? SHAPE_META[sh].zh : SHAPE_META[sh].en}`;

  // Calculate current draft bid total
  let draftCoinTotal = 0;
  const myUnspentCoins = me && me.coins ? me.coins.filter((c) => !c.spent) : [];
  const selectedCoinsList = [];
  for (const c of myUnspentCoins) {
    if (uiDraft.selectedCoinIds.has(c.id)) {
      draftCoinTotal += c.value;
      selectedCoinsList.push(c);
    }
  }
  const draftPieces = uiDraft.usePiece && me && me.pieces > 0 ? 1 : 0;
  const draftTotal = draftCoinTotal + draftPieces;
  const maxAssets = (me?.remainingCoinValue || 0) + (me?.pieces || 0);

  const stepIdx =
    state.phase === 'SHAPE_SELECT'
      ? 1
      : state.phase === 'BIDDING'
      ? 2
      : state.phase === 'ROUND_SUMMARY'
      ? 3
      : 4;

  const renderMainBoard = () => {
    const filledSet = new Set(me?.placedCells || []);
    const completedLines = me?.completedLines || [];
    const bingoCells = buildBingoCellSet(completedLines);
    const canEditBoard = state.phase === 'GRAND_REVEAL' && me && !me.boardLocked;

    const previewSet = new Set();
    if (!isGrand && me?.earnedTiles) {
      for (const sh of SHAPES) {
        let cnt = Math.min(3, me.earnedTiles[sh] || 0);
        state.boardLayout.forEach((cellSh, idx) => {
          if (cellSh === sh && cnt > 0) {
            previewSet.add(idx);
            cnt -= 1;
          }
        });
      }
    }

    return `
      <div class="ab-panel" data-motion-key="ab-board-panel">
        <div class="ab-panel-head">
          <h3 class="ab-panel-title">${t('3×3 宾果矩阵', '3×3 BINGO MATRIX')}</h3>
          <span class="ab-panel-sub dp-tabular">
            ${
              isGrand && me
                ? `<strong style="color:var(--dp-brass-bright);"><span id="ab-bingo-count-num" data-dp-num>${me.bingoCount}</span> Bingo · <span id="ab-filled-count-num" data-dp-num>${me.filledCount}</span>/9</strong>`
                : t('全场同款盘面', 'Identical Board')
            }
          </span>
        </div>

        <div class="ab-board-wrap" data-motion-key="ab-board-wrap">
          <div class="ab-board-grid" data-motion-key="ab-board-grid">
            ${state.boardLayout
              .map((sh, idx) => {
                const filled = isGrand ? filledSet.has(idx) : previewSet.has(idx);
                const inBingo = isGrand && bingoCells.has(idx);
                const allowed = me?.earnedTiles ? Math.min(3, me.earnedTiles[sh] || 0) : 0;
                const clickable = canEditBoard && allowed > 0 && allowed < 3;
                return `
                  <button
                    type="button"
                    class="ab-cell ab-shape-${sh} ${filled ? 'is-filled' : ''} ${inBingo ? 'is-bingo-cell' : ''} ${clickable ? 'is-clickable' : ''}"
                    data-motion-key="ab-cell-${idx}"
                    data-board-cell="${idx}"
                    ${clickable ? '' : 'disabled'}
                    title="${shapeName(sh)}"
                  >
                    <span>${SHAPE_META[sh].symbol}</span>
                    ${filled ? `<span class="ab-cell-check">✦</span>` : ''}
                  </button>
                `;
              })
              .join('')}
          </div>
          ${isGrand ? renderLaserOverlay(completedLines) : ''}
        </div>

        <div class="ab-inv-row" data-motion-key="ab-inv-row">
          ${SHAPES.map((sh) => {
            const known = me?.earnedTiles != null;
            const earned = known ? me.earnedTiles[sh] || 0 : null;
            const placed =
              isGrand && me?.placedCells
                ? me.placedCells.filter((idx) => state.boardLayout[idx] === sh).length
                : null;
            const valText = !known
              ? '🔒 ?'
              : isGrand
              ? `${placed}/${Math.min(3, earned)}${earned > 3 ? ` (+${earned - 3})` : ''}`
              : `${earned}/3`;
            return `
              <div class="ab-inv-pill ab-shape-${sh}" data-motion-key="ab-inv-${sh}">
                <strong class="dp-tabular">${SHAPE_META[sh].symbol} ${valText}</strong>
                <span>${lang === 'zh' ? SHAPE_META[sh].zh : SHAPE_META[sh].en}</span>
              </div>
            `;
          }).join('')}
        </div>

        ${
          canEditBoard
            ? `
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;" data-motion-key="ab-board-actions">
                <div style="font-size:12px;color:var(--dp-ink-muted);text-align:center;">
                  ${t(
                    '已预填最优解；对于 1–2 枚未满的图形，可点击对应格子调整排布。',
                    'Pre-filled with optimal layout. Click cells of partial (1–2 tile) shapes to customize.'
                  )}
                </div>
                <div style="display:flex;gap:8px;">
                  <button type="button" class="dp-btn dp-btn-sm" id="ab-btn-optimize" style="flex:1;">
                    ✨ ${t('一键最优', 'Optimize')}
                  </button>
                  <button type="button" class="dp-btn dp-btn-primary" id="ab-btn-lock-board" style="flex:1.4;">
                    ♛ ${t('锁定宾果盘', 'Lock Board')}
                  </button>
                </div>
              </div>
            `
            : state.phase === 'GRAND_REVEAL' && me?.boardLocked
            ? `<div style="margin-top:10px;text-align:center;font-size:12.5px;color:var(--dp-emerald);font-weight:700;" data-motion-key="ab-board-locked-note">✓ ${t('已锁定终局宾果盘，等待其余玩家...', 'Board locked — waiting for other players...')}</div>`
            : ''
        }
      </div>
    `;
  };

  const renderBidConsole = () => {
    if (!me) {
      return `<div style="margin-top:14px;text-align:center;color:var(--dp-ink-muted);font-size:13px;" data-motion-key="ab-spec-bid">${t('观战模式：选手正在密室暗标出价...', 'Spectating: Players are sealing their secret bids...')}</div>`;
    }
    const cr = state.currentRound;
    const myShape = cr.myShapeChoice;
    const myPoolQty = cr.pools?.[myShape] || 0;

    if (cr.myBid) {
      return `
        <div class="ab-bid-console" data-motion-key="ab-bid-console" style="text-align:center;">
          <div style="font-size:12px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
            ✉ ${t('密室暗标已火漆封印', 'SEALED BID ENVELOPE LOCKED')}
          </div>
          <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:26px;font-weight:800;color:var(--dp-brass-bright);">
            ${cr.myBid.total} ${t('元', 'COINS')}
            ${cr.myBid.usePieces ? ` <span style="font-size:14px;color:var(--dp-amber);">(+${cr.myBid.usePieces} ◆)</span>` : ''}
          </div>
          <div style="font-size:12.5px;color:var(--dp-ink-muted);">
            ${t(
              `目标：${shapeName(myShape)} 奖池（×${myPoolQty} 枚）· 等待其余 ${state.pendingSeatIds.length} 人封标...`,
              `Target: ${shapeName(myShape)} Pool (×${myPoolQty} tiles) · Waiting for ${state.pendingSeatIds.length} bidder(s)...`
            )}
          </div>
        </div>
      `;
    }

    const bankrupt = maxAssets <= 0;

    return `
      <div class="ab-bid-console" data-motion-key="ab-bid-console">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>
            <strong style="color:var(--dp-ink);font-size:14px;">
              ${t(`你已站队 ${shapeName(myShape)}（奖池 ×${myPoolQty} 枚）`, `You entered ${shapeName(myShape)} (Pool ×${myPoolQty} tiles)`)}
            </strong>
            <div style="font-size:12px;color:var(--dp-ink-muted);">
              ${
                myPoolQty === 1
                  ? t('你是唯一站队者！只需出 1 元硬币即可稳拿 1 枚！', 'You are solo in this pool! Bid a single 1-coin to win cleanly!')
                  : t('点击或拖拽下方硬币装入信封（沉没成本，胜负均不退还）', 'Click or drag brass coins into the envelope (All-Pay: non-refundable)')
              }
            </div>
          </div>
          <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:12px;color:var(--dp-brass-bright);font-weight:700;">
            ${t('剩余币值：', 'Wallet: ')}<span id="ab-wallet-num" data-dp-num>${me.remainingCoinValue}</span>${t(' 元', '')}
          </div>
        </div>

        <div class="ab-envelope-zone" id="ab-envelope-drop" data-motion-key="ab-envelope-drop">
          <div class="ab-envelope-left">
            <span class="ab-envelope-label">✉ ${t('暗标信封出价', 'SEALED BID TOTAL')}</span>
            <span class="ab-envelope-total dp-tabular">
              <span id="ab-envelope-total-num" data-dp-num>${draftTotal}</span>
              <small style="font-size:13px;font-weight:600;color:var(--dp-ink-muted);">${t('元', 'VAL')}</small>
            </span>
          </div>

          <div class="ab-envelope-coins" data-motion-key="ab-envelope-coins">
            ${
              selectedCoinsList.length === 0 && !draftPieces
                ? `<span data-motion-key="ab-env-hint" style="font-size:12px;color:var(--dp-ink-faint);">${t('拖入或点击硬币组合出价（≥ 1 元）', 'Drop or click coins to compose bid (≥ 1)')}</span>`
                : selectedCoinsList
                    .map(
                      (c) =>
                        `<button type="button" class="ab-coin ab-coin-mini" data-motion-key="ab-env-coin-${c.id}" data-toggle-coin="${c.id}" title="${t('点击移出', 'Click to remove')}">${c.value}</button>`
                    )
                    .join('') +
                  (draftPieces
                    ? `<span class="dp-piece" data-motion-key="ab-env-piece" style="cursor:pointer;" id="ab-remove-piece"><span class="dp-piece-icon"></span>+1</span>`
                    : '')
            }
          </div>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            ${
              selectedCoinsList.length || draftPieces
                ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="ab-clear-bid">${t('清空', 'Clear')}</button>`
                : ''
            }
            <button type="button" class="dp-btn dp-btn-primary" id="ab-submit-bid">
              🔨 ${bankrupt ? t('确认破产弃权 (0)', 'Confirm Forfeit (0)') : t(`封印出价 (${draftTotal} 元)`, `Seal Bid (${draftTotal})`)}
            </button>
          </div>
        </div>

        <div data-motion-key="ab-coin-tray-wrap">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <span style="font-size:11.5px;letter-spacing:0.08em;color:var(--dp-ink-muted);text-transform:uppercase;">
              ${t('你的 10 枚不可拆分硬币', 'YOUR 10 NON-SPLITTABLE COINS')}
            </span>
            ${
              (me.pieces || 0) > 0
                ? `
                  <button type="button" class="ab-piece-toggle ${uiDraft.usePiece ? 'is-active' : ''}" id="ab-toggle-piece" data-motion-key="ab-piece-toggle">
                    <span class="dp-piece-icon"></span>
                    ${t(`追加恶魔碎片 (+1 元 · 余 ${me.pieces})`, `Add Devil's Piece (+1 · ${me.pieces} left)`)}
                  </button>
                `
                : `<span style="font-size:11.5px;color:var(--dp-ink-faint);">${t('恶魔碎片已用尽', 'No Pieces left')}</span>`
            }
          </div>
          <div class="ab-coin-tray" data-motion-key="ab-coin-tray">
            ${(me.coins || [])
              .map((c) => {
                const sel = uiDraft.selectedCoinIds.has(c.id);
                return `
                  <button
                    type="button"
                    class="ab-coin ${sel ? 'is-selected' : ''} ${c.spent ? 'is-spent' : ''}"
                    data-motion-key="ab-coin-${c.id}"
                    data-val="${c.value}"
                    data-toggle-coin="${c.id}"
                    draggable="${c.spent ? 'false' : 'true'}"
                    ${c.spent ? 'disabled' : ''}
                    title="${c.spent ? t(`第 ${c.spentRound} 轮已消耗`, `Spent in R${c.spentRound}`) : t(`面额 ${c.value} 元（点击或拖入信封）`, `Value ${c.value} (click or drag to envelope)`)}"
                  >
                    <span>${c.value}</span>
                    ${c.spent ? `<span class="ab-coin-round">R${c.spentRound}</span>` : ''}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;
  };

  const renderRoundSummaryCard = () => {
    const latest = state.roundHistory[state.roundHistory.length - 1];
    if (!latest) return '';
    const myBid = latest.myBid;
    const myOut = latest.myOutcome;

    let badgeHtml = '';
    if (blind) {
      badgeHtml = `
        <div class="ab-outcome-badge is-sealed">
          🔒 ${t('剧集全盲封印 · 本轮中标者与最高价已锁入终局保险库', 'BLIND VAULT SEALED · Winners & top bids stay hidden until Round 7')}
        </div>
      `;
    } else if (myOut) {
      if (myOut.won) {
        badgeHtml = `
          <div class="ab-outcome-badge is-win">
            ✦ ${t(
              `恭喜中标！赢得 ${myOut.awarded} 枚 ${shapeName(myOut.shape)}${myOut.tiedCount > 1 ? `（${myOut.tiedCount} 人平价平分）` : ''}`,
              `AUCTION WON! +${myOut.awarded} ${shapeName(myOut.shape)}${myOut.tiedCount > 1 ? ` (${myOut.tiedCount}-way tie split)` : ''}`
            )}
          </div>
        `;
      } else {
        badgeHtml = `
          <div class="ab-outcome-badge is-loss">
            ✕ ${t(
              `未中标 · 你的 ${myBid?.total || 0} 元沉没硬币已没收`,
              `OUTBID · Your ${myBid?.total || 0} all-pay bid was consumed`
            )}
          </div>
        `;
      }
    }

    return `
      <div class="ab-gavel-card" data-motion-key="ab-gavel-${latest.round}" style="margin-top:14px;">
        <div style="font-size:12px;letter-spacing:0.14em;color:var(--dp-brass);">🔨 GAVEL DROPPED</div>
        <div class="ab-gavel-title">
          ${t(`第 ${latest.round} 轮拍卖落槌`, `ROUND ${latest.round} AUCTION COMPLETE`)}
        </div>
        ${
          myBid
            ? `<div style="font-size:13px;color:var(--dp-ink-muted);">${t(`你本轮投入 ${shapeName(myBid.shape)} 池，出价 ${myBid.total} 元`, `You bid ${myBid.total} in the ${shapeName(myBid.shape)} pool`)}</div>`
            : ''
        }
        ${badgeHtml}
        <div style="margin-top:10px;">
          <button type="button" class="dp-btn dp-btn-primary" id="ab-next-round">
            ${
              state.round >= state.totalRounds
                ? `🔓 ${t('开启第 7 轮总开箱清算秀 →', 'UNSEAL THE 7-ROUND VAULT →')}`
                : `${t(`进入第 ${state.round + 1} 轮 →`, `Proceed to Round ${state.round + 1} →`)}`
            }
          </button>
        </div>
      </div>
    `;
  };

  const renderAuctionBoxes = () => {
    const cr = state.currentRound;
    const canSelectShape = state.phase === 'SHAPE_SELECT' && me && !cr.myShapeChoice;

    return `
      <div class="ab-panel" data-motion-key="ab-auction-panel">
        <div class="ab-panel-head">
          <h3 class="ab-panel-title">
            ${
              state.phase === 'SHAPE_SELECT'
                ? t('阶段一 · 投入名牌票选图形', 'PHASE 1 · DROP NAME TICKET INTO SHAPE BOX')
                : state.phase === 'BIDDING'
                ? t('阶段二 · 公开站队奖池 & 密室暗标', 'PHASE 2 · PUBLIC POOLS & SEALED BIDDING')
                : t(`第 ${state.round} 轮 · 落槌结算`, `ROUND ${state.round} · GAVEL DROP`)
            }
          </h3>
          <span class="ab-panel-sub dp-tabular">
            ${
              state.phase === 'SHAPE_SELECT'
                ? t(`待选：${state.pendingSeatIds.length} 人`, `Pending: ${state.pendingSeatIds.length}`)
                : state.phase === 'BIDDING'
                ? t(`待出价：${state.pendingSeatIds.length} 人`, `Pending Bids: ${state.pendingSeatIds.length}`)
                : ''
            }
          </span>
        </div>

        <div class="ab-boxes-grid" data-motion-key="ab-boxes-grid">
          ${SHAPES.map((sh) => {
            const isMine = cr.myShapeChoice === sh;
            const qty = cr.pools ? cr.pools[sh] || 0 : null;
            const entrants = cr.entrantsByShape ? cr.entrantsByShape[sh] || [] : [];
            const dimmed = state.phase === 'BIDDING' && cr.myShapeChoice && !isMine;

            return `
              <div
                class="ab-box ab-shape-${sh} ${canSelectShape ? 'is-selectable' : ''} ${isMine ? 'is-my-box' : ''} ${dimmed ? 'is-dimmed' : ''}"
                data-motion-key="ab-box-${sh}"
                ${canSelectShape ? `data-pick-shape="${sh}" role="button" tabindex="0"` : ''}
              >
                <div class="ab-box-glyph">${SHAPE_META[sh].symbol}</div>
                <div class="ab-box-label">${lang === 'zh' ? SHAPE_META[sh].zh : SHAPE_META[sh].en}</div>
                <div class="ab-box-qty dp-tabular">
                  ${
                    qty == null
                      ? isMine
                        ? t('✓ 已投名牌', '✓ TICKET DROPPED')
                        : canSelectShape
                        ? t('点击投入名牌', 'DROP TICKET')
                        : t('等待揭晓...', 'LOCKED...')
                      : t(`奖池 ×${qty} 枚`, `PRIZE ×${qty} TILES`)
                  }
                </div>
                <div class="ab-box-entrants">
                  ${
                    entrants.length
                      ? entrants
                          .map((sid) => {
                            const p = state.players[sid];
                            const hasBid = cr.bidSubmittedSeatIds.includes(sid);
                            const cls = [
                              'ab-entrant-chip',
                              sid === mySeatId ? 'is-me' : '',
                              p?.isGuest ? 'is-guest' : '',
                              state.phase === 'BIDDING' && hasBid ? 'is-sealed' : '',
                            ]
                              .filter(Boolean)
                              .join(' ');
                            return `<span class="${cls}" data-motion-key="ab-ent-${sh}-${sid}">${UI.escapeHtml(p?.name || sid)}${state.phase === 'BIDDING' && hasBid ? ' ✉' : ''}</span>`;
                          })
                          .join('')
                      : qty === 0
                      ? `<span style="font-size:11px;color:var(--dp-ink-faint);">${t('无人选择', 'Empty Pool')}</span>`
                      : ''
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${
          state.phase === 'SHAPE_SELECT' && me && cr.myShapeChoice
            ? `
              <div class="ab-status-note" data-motion-key="ab-shape-wait">
                ${t(
                  `你的名牌票已秘密投入 ${shapeName(cr.myShapeChoice)} 箱，等待其余 ${state.pendingSeatIds.length} 名选手站队...`,
                  `Your Name Ticket is secretly dropped in ${shapeName(cr.myShapeChoice)}. Waiting for ${state.pendingSeatIds.length} player(s)...`
                )}
              </div>
            `
            : ''
        }

        ${state.phase === 'BIDDING' ? renderBidConsole() : ''}
        ${state.phase === 'ROUND_SUMMARY' ? renderRoundSummaryCard() : ''}
      </div>
    `;
  };

  const renderGrandRevealPanel = () => {
    const nameOf = (sid) => state.players[sid]?.name || sid;
    const sortedAll = [...state.seatOrder]
      .map((sid) => state.players[sid])
      .sort((a, b) => {
        if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
        if ((b.bingoCount || 0) !== (a.bingoCount || 0)) return (b.bingoCount || 0) - (a.bingoCount || 0);
        if ((b.filledCount || 0) !== (a.filledCount || 0)) return (b.filledCount || 0) - (a.filledCount || 0);
        return (b.remainingCoinValue || 0) - (a.remainingCoinValue || 0);
      });

    const topContestant = sortedAll.find((p) => !p.isGuest);

    return `
      <div class="ab-panel" data-motion-key="ab-grand-panel">
        <div class="ab-panel-head">
          <h3 class="ab-panel-title">🔓 ${t('7 轮密室暗标总开箱实录', 'GRAND VAULT UNSEALING — ALL 7 ROUNDS')}</h3>
          <span class="ab-panel-sub">${t('含平价折损与所有出价明细', 'Full Bids, Winners & Tie Splits')}</span>
        </div>

        <div class="ab-audit-table-wrap">
          <table class="ab-audit-table">
            <thead>
              <tr>
                <th>${t('轮次', 'Rd')}</th>
                <th>○ ${t('圆形池', 'Circle')}</th>
                <th>△ ${t('三角池', 'Triangle')}</th>
                <th>☆ ${t('星形池', 'Star')}</th>
              </tr>
            </thead>
            <tbody>
              ${state.roundHistory
                .map((h) => {
                  const cells = SHAPES.map((sh) => {
                    const sr = h.shapeResults?.[sh];
                    if (!sr || sr.poolQty === 0) {
                      return `<td style="color:var(--dp-ink-faint);">—</td>`;
                    }
                    const winNames = sr.winnerSeatIds.map((w) => UI.escapeHtml(nameOf(w))).join(', ');
                    const tieTag =
                      sr.winnerSeatIds.length > 1
                        ? `<span style="color:var(--dp-amber);font-size:11px;"> (${t(`平价各得${sr.awardEach}`, `tie ×${sr.awardEach}`)})</span>`
                        : '';
                    const allBids = sr.entrants
                      .map((sid) => `${UI.escapeHtml(nameOf(sid))}:${h.bidsBySeat[sid]?.total ?? 0}`)
                      .join(' · ');
                    return `
                      <td>
                        <div style="font-weight:700;color:var(--dp-brass-bright);">
                          ${winNames || '—'} <span class="dp-tabular" style="font-family:var(--dp-font-mono);">+${sr.awardEach}</span>${tieTag}
                        </div>
                        <div class="dp-tabular" style="font-size:11px;color:var(--dp-ink-muted);">
                          ${t(`池×${sr.poolQty} · 最高 ${sr.maxBid}`, `Pool×${sr.poolQty} · Top ${sr.maxBid}`)}
                        </div>
                        <div style="font-size:10.5px;color:var(--dp-ink-faint);margin-top:2px;">${allBids}</div>
                      </td>
                    `;
                  }).join('');
                  return `<tr data-motion-key="ab-audit-r${h.round}"><td><strong>R${h.round}</strong></td>${cells}</tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="ab-panel-head" style="margin-top:16px;">
          <h3 class="ab-panel-title">${t('全员 3×3 宾果盘总览', 'ALL CONTESTANTS BINGO BOARDS')}</h3>
          <span class="ab-panel-sub">${t('嘉宾「轨道」不占正式排名', 'Orbit is unranked Guest')}</span>
        </div>

        <div class="ab-mini-boards-grid" data-motion-key="ab-mini-boards">
          ${sortedAll
            .map((p) => {
              const isWinner =
                state.phase === 'FINISHED' &&
                !p.isGuest &&
                topContestant &&
                p.bingoCount === topContestant.bingoCount &&
                p.filledCount === topContestant.filledCount &&
                p.remainingCoinValue === topContestant.remainingCoinValue;
              const pFilled = new Set(p.placedCells || []);
              const pBingoCells = buildBingoCellSet(p.completedLines);

              return `
                <div class="ab-mini-card ${isWinner ? 'is-winner' : ''} ${p.isGuest ? 'is-guest' : ''}" data-motion-key="ab-mini-${p.seatId}">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                    <strong style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                      ${UI.escapeHtml(p.name)}
                    </strong>
                    <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:11.5px;color:var(--dp-brass-bright);">
                      ${p.bingoCount != null ? `${p.bingoCount}B` : '...'}
                    </span>
                  </div>
                  <div class="ab-mini-grid">
                    ${state.boardLayout
                      .map((sh, idx) => {
                        const fl = pFilled.has(idx);
                        const bg = pBingoCells.has(idx);
                        return `<div class="ab-mini-cell ab-shape-${sh} ${fl ? 'is-filled' : ''} ${bg ? 'is-bingo-cell' : ''}">${SHAPE_META[sh].symbol}</div>`;
                      })
                      .join('')}
                  </div>
                  <div class="dp-tabular" style="display:flex;justify-content:space-between;font-size:11px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                    <span>${p.filledCount != null ? `${p.filledCount}/9` : '⏳'}</span>
                    <span>💰${p.remainingCoinValue ?? '?'}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  };

  const renderPlayersAndHistory = () => {
    const cr = state.currentRound;
    return `
      <div class="ab-panel" data-motion-key="ab-players-panel">
        <div class="ab-panel-head">
          <h3 class="ab-panel-title">${t('席位状态', 'AUCTION HALL SEATS')}</h3>
          <span class="ab-panel-sub dp-tabular">${t(`共 ${state.seatOrder.length} 位竞拍者`, `${state.seatOrder.length} Bidders`)}</span>
        </div>
        <div class="ab-players-strip" data-motion-key="ab-players-strip">
          ${state.seatOrder
            .map((sid) => {
              const p = state.players[sid];
              const isMe = sid === mySeatId;
              const statusBadge =
                state.phase === 'SHAPE_SELECT'
                  ? cr.shapeSubmittedSeatIds.includes(sid)
                    ? `<span style="color:var(--dp-emerald);">✓ ${t('已选', 'Pick')}</span>`
                    : `<span style="color:var(--dp-amber);">…</span>`
                  : state.phase === 'BIDDING'
                  ? cr.bidSubmittedSeatIds.includes(sid)
                    ? `<span style="color:var(--dp-emerald);">✉ ${t('封标', 'Bid')}</span>`
                    : `<span style="color:var(--dp-amber);">…</span>`
                  : state.phase === 'GRAND_REVEAL'
                  ? p.boardLocked
                    ? `<span style="color:var(--dp-emerald);">✓ ${p.bingoCount}B</span>`
                    : `<span style="color:var(--dp-amber);">${t('布盘中', 'Placing')}</span>`
                  : `<span>${p.bingoCount ?? 0}B</span>`;

              return `
                <div class="ab-pcard ${isMe ? 'is-me' : ''} ${p.isGuest ? 'is-guest' : ''}" data-motion-key="ab-pcard-${sid}">
                  <div class="ab-pcard-top">
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                      ${UI.escapeHtml(p.avatar)} ${UI.escapeHtml(p.name)}
                    </span>
                    ${statusBadge}
                  </div>
                  <div class="ab-pcard-meta dp-tabular">
                    <span>🎫 ${p.ticketsLeft}</span>
                    <span>🪙 ${p.coinsLeftCount}/10</span>
                    <span>${p.hasPiece ? '◆1' : '◆0'}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        ${
          state.roundHistory.length > 0 && !isGrand
            ? `
              <div class="ab-panel-head" style="margin-top:14px;">
                <h3 class="ab-panel-title">${t('历史竞拍记录', 'PAST ROUNDS LOG')}</h3>
              </div>
              <div class="ab-history-list" data-motion-key="ab-history-list">
                ${[...state.roundHistory]
                  .reverse()
                  .map((h) => {
                    const outStr = h.sealed
                      ? `🔒 ${t('已封印', 'Sealed')}`
                      : h.myOutcome
                      ? h.myOutcome.won
                        ? `<span style="color:var(--dp-emerald);font-weight:700;">+${h.myOutcome.awarded} ${SHAPE_META[h.myOutcome.shape].symbol}</span>`
                        : `<span style="color:var(--dp-crimson-bright);">${t('未中标', 'Outbid')}</span>`
                      : '—';
                    return `
                      <div class="ab-history-row" data-motion-key="ab-hist-r${h.round}">
                        <strong>R${h.round}</strong>
                        <span class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-ink-muted);">
                          ○×${h.pools.O} · △×${h.pools.T} · ☆×${h.pools.S}
                        </span>
                        <span>
                          ${h.myBid ? `${SHAPE_META[h.myBid.shape].symbol} (${h.myBid.total})` : ''} ${outStr}
                        </span>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `
            : ''
        }
      </div>
    `;
  };

  const html = `
    <div class="ab-stage" data-motion-key="ab-stage">
      <div class="ab-header-bar" data-motion-key="ab-header">
        <div class="ab-round-cluster">
          <span class="ab-round-pill dp-tabular" data-motion-key="ab-round-pill">
            ${isGrand ? t('终局开箱', 'GRAND REVEAL') : `ROUND ${state.round} / ${state.totalRounds}`}
          </span>
          <div class="ab-phase-steps" id="ab-phase-track" data-motion-key="ab-phase-steps" data-motion-preserve>
            <span class="ab-phase-step ${stepIdx === 1 ? 'is-active' : ''}" data-step="1">1. ${t('选图形', 'Shape')}</span>
            <span class="ab-phase-step ${stepIdx === 2 ? 'is-active' : ''}" data-step="2">2. ${t('暗标', 'Bid')}</span>
            <span class="ab-phase-step ${stepIdx === 3 ? 'is-active' : ''}" data-step="3">3. ${t('落槌', 'Gavel')}</span>
            <span class="ab-phase-step ${stepIdx === 4 ? 'is-active' : ''}" data-step="4">4. ${t('宾果', 'Bingo')}</span>
          </div>
        </div>
        <div class="ab-mode-tags">
          <span class="ab-tag ${blind ? 'is-blind' : ''}">
            ${blind ? `🔒 ${t('全盲模式', 'BLIND VAULT')}` : `👁 ${t('个人透明模式', 'PRIVATE RESULT')}`}
          </span>
          ${
            state.hasOrbit
              ? `<span class="ab-tag is-orbit">☄ ${t('特邀嘉宾：轨道 Orbit', 'Guest: Orbit AI')}</span>`
              : ''
          }
        </div>
      </div>

      <div class="ab-arena" data-motion-key="ab-arena">
        <div style="display:flex;flex-direction:column;gap:16px;" data-motion-key="ab-col-left">
          ${isGrand ? renderGrandRevealPanel() : renderAuctionBoxes()}
          ${renderPlayersAndHistory()}
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;" data-motion-key="ab-col-right">
          ${renderMainBoard()}
        </div>
      </div>
    </div>
  `;

  Motion.patchDOM(container, html);

  // Post-patch Apple Motion Choreography:
  // 1. Update preserved phase steps & glide the sliding pill indicator
  const phaseTrack = container.querySelector('#ab-phase-track');
  if (phaseTrack) {
    const stepLabels = [
      `1. ${t('选图形', 'Shape')}`,
      `2. ${t('暗标', 'Bid')}`,
      `3. ${t('落槌', 'Gavel')}`,
      `4. ${t('宾果', 'Bingo')}`,
    ];
    let activeStep = null;
    phaseTrack.querySelectorAll('.ab-phase-step').forEach((el, i) => {
      if (el.textContent !== stepLabels[i]) el.textContent = stepLabels[i];
      const on = i + 1 === stepIdx;
      el.classList.toggle('is-active', on);
      if (on) activeStep = el;
    });
    if (activeStep) Motion.slidingIndicator(phaseTrack, activeStep);
  }

  // 2. Smooth tabular numeric animations on bid total, wallet & Grand Reveal bingo scores
  const totalEl = container.querySelector('#ab-envelope-total-num');
  if (totalEl && uiDraft.prevDraftTotal !== draftTotal) {
    Motion.animateNumber(totalEl, uiDraft.prevDraftTotal, draftTotal, { duration: 180, flash: true });
    uiDraft.prevDraftTotal = draftTotal;
  }

  const walletEl = container.querySelector('#ab-wallet-num');
  if (walletEl && me && me.remainingCoinValue != null) {
    if (uiDraft.prevWallet !== null && uiDraft.prevWallet !== me.remainingCoinValue) {
      Motion.animateNumber(walletEl, uiDraft.prevWallet, me.remainingCoinValue, { duration: 240, flash: true });
    }
    uiDraft.prevWallet = me.remainingCoinValue;
  }

  const bingoEl = container.querySelector('#ab-bingo-count-num');
  if (bingoEl && isGrand && me && me.bingoCount != null) {
    if (uiDraft.prevBingoCount !== null && uiDraft.prevBingoCount !== me.bingoCount) {
      Motion.animateNumber(bingoEl, uiDraft.prevBingoCount, me.bingoCount, { duration: 220, flash: true });
    }
    uiDraft.prevBingoCount = me.bingoCount;
  }

  const filledEl = container.querySelector('#ab-filled-count-num');
  if (filledEl && isGrand && me && me.filledCount != null) {
    if (uiDraft.prevFilledCount !== null && uiDraft.prevFilledCount !== me.filledCount) {
      Motion.animateNumber(filledEl, uiDraft.prevFilledCount, me.filledCount, { duration: 220 });
    }
    uiDraft.prevFilledCount = me.filledCount;
  }
}

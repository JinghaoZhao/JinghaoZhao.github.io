/**
 * The Devil's Plan Season 3: Dead Again — Day 4 Main Match 4
 * 拍卖宾果 (Auction Bingo / 경매 빙고) — Broadcast Auction House Renderer
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import { GameRules, SHAPES, BINGO_LINES, ORBIT_SEAT_ID } from './rules.js';

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

// Local interactive UI draft state (cleared automatically when round/phase/seat changes)
const uiDraft = {
  key: '',
  selectedCoinIds: new Set(),
  usePiece: false,
  lastEventSig: '',
};

function syncDraftKey(state, mySeatId) {
  const k = `${state.round}-${state.phase}-${mySeatId || 'spec'}`;
  if (uiDraft.key !== k) {
    uiDraft.key = k;
    uiDraft.selectedCoinIds = new Set();
    uiDraft.usePiece = false;
  }
}

function renderLaserOverlay(completedLines) {
  if (!completedLines || !completedLines.length) return '';
  return `
    <svg class="ab-laser-svg" viewBox="0 0 300 300" aria-hidden="true">
      ${completedLines
        .map((li) => {
          const [x1, y1, x2, y2] = LINE_COORDS[li];
          return `<line class="ab-laser-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
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
    const { state, mySeatId, lang, lastEvent, dispatch, sfx, ui, log } = ctx;
    if (!state) return;

    syncDraftKey(state, mySeatId);
    playEventSfx(lastEvent, sfx, log, lang);

    const me = mySeatId ? state.players[mySeatId] : null;
    const isGrand = state.phase === 'GRAND_REVEAL' || state.phase === 'FINISHED';
    const blind = Boolean(state.options?.blindMode);

    // Helper: bilingual label
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

    // Phase step indicator
    const stepIdx =
      state.phase === 'SHAPE_SELECT'
        ? 1
        : state.phase === 'BIDDING'
        ? 2
        : state.phase === 'ROUND_SUMMARY'
        ? 3
        : 4;

    // Render 3×3 Board (interactive during GRAND_REVEAL for un-locked human, reference/live during play)
    const renderMainBoard = () => {
      const filledSet = new Set(me?.placedCells || []);
      const completedLines = me?.completedLines || [];
      const bingoCells = buildBingoCellSet(completedLines);
      const canEditBoard = state.phase === 'GRAND_REVEAL' && me && !me.boardLocked;

      // In Transparent Mode during play, highlight cells up to earnedTiles count as a helpful preview
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
        <div class="ab-panel">
          <div class="ab-panel-head">
            <h3 class="ab-panel-title">${t('3×3 宾果矩阵', '3×3 BINGO MATRIX')}</h3>
            <span class="ab-panel-sub">
              ${
                isGrand && me
                  ? `<strong style="color:var(--dp-brass-bright);">${me.bingoCount} Bingo · ${me.filledCount}/9</strong>`
                  : t('全场同款盘面', 'Identical Board')
              }
            </span>
          </div>

          <div class="ab-board-wrap">
            <div class="ab-board-grid">
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

          <div class="ab-inv-row">
            ${SHAPES.map((sh) => {
              const known = me?.earnedTiles != null;
              const earned = known ? me.earnedTiles[sh] || 0 : null;
              const placed = isGrand && me?.placedCells
                ? me.placedCells.filter((idx) => state.boardLayout[idx] === sh).length
                : null;
              const valText = !known
                ? '🔒 ?'
                : isGrand
                ? `${placed}/${Math.min(3, earned)}${earned > 3 ? ` (+${earned - 3})` : ''}`
                : `${earned}/3`;
              return `
                <div class="ab-inv-pill ab-shape-${sh}">
                  <strong>${SHAPE_META[sh].symbol} ${valText}</strong>
                  <span>${lang === 'zh' ? SHAPE_META[sh].zh : SHAPE_META[sh].en}</span>
                </div>
              `;
            }).join('')}
          </div>

          ${
            canEditBoard
              ? `
                <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                  <div style="font-size:12px;color:var(--dp-ink-muted);text-align:center;">
                    ${t(
                      '系统已预填最优解；对于 1–2 枚未满的图形，可点击对应格子自由切换位置！',
                      'Pre-filled with optimal layout. Click cells of partial (1–2 tile) shapes to customize!'
                    )}
                  </div>
                  <div style="display:flex;gap:8px;">
                    <button type="button" class="dp-btn dp-btn-sm" id="ab-btn-optimize" style="flex:1;">
                      ✨ ${t('一键最优排布', 'Auto-Optimize')}
                    </button>
                    <button type="button" class="dp-btn dp-btn-primary" id="ab-btn-lock-board" style="flex:1.4;">
                      ♛ ${t('锁定终局宾果盘', 'Lock Final Board')}
                    </button>
                  </div>
                </div>
              `
              : state.phase === 'GRAND_REVEAL' && me?.boardLocked
              ? `<div style="margin-top:10px;text-align:center;font-size:12.5px;color:var(--dp-emerald);font-weight:700;">✓ ${t('已锁定终局宾果盘，等待其余玩家...', 'Board locked — waiting for other players...')}</div>`
              : ''
          }
        </div>
      `;
    };

    // Render Auction Boxes (Phases 1–3)
    const renderAuctionBoxes = () => {
      const cr = state.currentRound;
      const canSelectShape = state.phase === 'SHAPE_SELECT' && me && !cr.myShapeChoice;

      return `
        <div class="ab-panel">
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
            <span class="ab-panel-sub">
              ${
                state.phase === 'SHAPE_SELECT'
                  ? t(`待选：${state.pendingSeatIds.length} 人`, `Pending: ${state.pendingSeatIds.length}`)
                  : state.phase === 'BIDDING'
                  ? t(`待出价：${state.pendingSeatIds.length} 人`, `Pending Bids: ${state.pendingSeatIds.length}`)
                  : ''
              }
            </span>
          </div>

          <div class="ab-boxes-grid">
            ${SHAPES.map((sh) => {
              const isMine = cr.myShapeChoice === sh;
              const qty = cr.pools ? cr.pools[sh] || 0 : null;
              const entrants = cr.entrantsByShape ? cr.entrantsByShape[sh] || [] : [];
              const dimmed = state.phase === 'BIDDING' && cr.myShapeChoice && !isMine;

              return `
                <div
                  class="ab-box ab-shape-${sh} ${canSelectShape ? 'is-selectable' : ''} ${isMine ? 'is-my-box' : ''} ${dimmed ? 'is-dimmed' : ''}"
                  ${canSelectShape ? `data-pick-shape="${sh}" role="button" tabindex="0"` : ''}
                >
                  <div class="ab-box-glyph">${SHAPE_META[sh].symbol}</div>
                  <div class="ab-box-label">${lang === 'zh' ? SHAPE_META[sh].zh : SHAPE_META[sh].en}</div>
                  <div class="ab-box-qty">
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
                              return `<span class="${cls}">${UI.escapeHtml(p?.name || sid)}${state.phase === 'BIDDING' && hasBid ? ' ✉' : ''}</span>`;
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
                <div style="margin-top:12px;padding:10px 14px;border-radius:10px;background:rgba(212,175,106,0.09);border:1px solid var(--dp-border-strong);text-align:center;font-size:13px;">
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

    const renderBidConsole = () => {
      if (!me) {
        return `<div style="margin-top:14px;text-align:center;color:var(--dp-ink-muted);font-size:13px;">${t('观战模式：选手们正在密室中暗标出价...', 'Spectating: Players are sealing their secret bids...')}</div>`;
      }
      const cr = state.currentRound;
      const myShape = cr.myShapeChoice;
      const myPoolQty = cr.pools?.[myShape] || 0;

      if (cr.myBid) {
        return `
          <div class="ab-bid-console" style="text-align:center;">
            <div style="font-size:12px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ✉ ${t('密室暗标已火漆封印', 'SEALED BID ENVELOPE LOCKED')}
            </div>
            <div style="font-family:var(--dp-font-mono);font-size:26px;font-weight:800;color:var(--dp-brass-bright);">
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
      const canSubmit = bankrupt || draftTotal >= 1;

      return `
        <div class="ab-bid-console">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div>
              <strong style="color:var(--dp-ink);font-size:14px;">
                ${t(`你已站队 ${shapeName(myShape)}（奖池 ×${myPoolQty} 枚）`, `You entered ${shapeName(myShape)} (Pool ×${myPoolQty} tiles)`)}
              </strong>
              <div style="font-size:12px;color:var(--dp-ink-muted);">
                ${
                  myPoolQty === 1
                    ? t('你是唯一站队者！只需出 1 元硬币即可稳拿 1 枚！', 'You are solo in this pool! Bid a single 1-coin to win cleanly!')
                    : t('点击或拖拽下方硬币装入信封（无论胜负硬币均不退还）', 'Click or drag brass coins into the envelope (All-Pay: non-refundable)')
                }
              </div>
            </div>
            <div style="font-family:var(--dp-font-mono);font-size:12px;color:var(--dp-brass);">
              ${t(`剩余总币值：${me.remainingCoinValue} 元`, `Wallet: ${me.remainingCoinValue}`)}
            </div>
          </div>

          <div class="ab-envelope-zone" id="ab-envelope-drop">
            <div class="ab-envelope-left">
              <span class="ab-envelope-label">✉ ${t('暗标信封出价', 'SEALED BID TOTAL')}</span>
              <span class="ab-envelope-total">${draftTotal} <small style="font-size:13px;font-weight:600;color:var(--dp-ink-muted);">${t('元', 'VAL')}</small></span>
            </div>

            <div class="ab-envelope-coins">
              ${
                selectedCoinsList.length === 0 && !draftPieces
                  ? `<span style="font-size:12px;color:var(--dp-ink-faint);">${t('拖入或点击硬币组合出价（≥ 1 元）', 'Drop or click coins to compose bid (≥ 1)')}</span>`
                  : selectedCoinsList
                      .map(
                        (c) =>
                          `<button type="button" class="ab-coin ab-coin-mini" data-toggle-coin="${c.id}" title="${t('点击移出', 'Click to remove')}">${c.value}</button>`
                      )
                      .join('') +
                    (draftPieces
                      ? `<span class="dp-piece" style="cursor:pointer;" id="ab-remove-piece"><span class="dp-piece-icon"></span>+1</span>`
                      : '')
              }
            </div>

            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              ${
                selectedCoinsList.length || draftPieces
                  ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="ab-clear-bid">${t('清空', 'Clear')}</button>`
                  : ''
              }
              <button type="button" class="dp-btn dp-btn-primary" id="ab-submit-bid" ${canSubmit ? '' : 'disabled'}>
                🔨 ${bankrupt ? t('确认破产弃权 (0)', 'Confirm Forfeit (0)') : t(`封印出价 (${draftTotal} 元)`, `Seal Bid (${draftTotal})`)}
              </button>
            </div>
          </div>

          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
              <span style="font-size:11.5px;letter-spacing:0.08em;color:var(--dp-ink-muted);text-transform:uppercase;">
                ${t('你的 10 枚不可拆分硬币', 'YOUR 10 NON-SPLITTABLE COINS')}
              </span>
              ${
                (me.pieces || 0) > 0
                  ? `
                    <button type="button" class="ab-piece-toggle ${uiDraft.usePiece ? 'is-active' : ''}" id="ab-toggle-piece">
                      <span class="dp-piece-icon"></span>
                      ${t(`追加恶魔碎片 (+1 元 · 余 ${me.pieces})`, `Add Devil's Piece (+1 · ${me.pieces} left)`)}
                    </button>
                  `
                  : `<span style="font-size:11.5px;color:var(--dp-ink-faint);">${t('恶魔碎片已用尽', 'No Pieces left')}</span>`
              }
            </div>
            <div class="ab-coin-tray">
              ${(me.coins || [])
                .map((c) => {
                  const sel = uiDraft.selectedCoinIds.has(c.id);
                  return `
                    <button
                      type="button"
                      class="ab-coin ${sel ? 'is-selected' : ''} ${c.spent ? 'is-spent' : ''}"
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
            🔒 ${t('剧集全盲封印 · 本轮中标者与最高价已锁入终局保险库！', 'BLIND VAULT SEALED · Winners & top bids stay hidden until Round 7!')}
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
        <div class="ab-gavel-card" style="margin-top:14px;">
          <div style="font-size:12px;letter-spacing:0.14em;color:var(--dp-brass);">🔨 GAVEL DROPPED</div>
          <div class="ab-gavel-title">
            ${t(`第 ${latest.round} 轮拍卖落槌！`, `ROUND ${latest.round} AUCTION COMPLETE`)}
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
        <div class="ab-panel">
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
                            ${winNames || '—'} <span style="font-family:var(--dp-font-mono);">+${sr.awardEach}</span>${tieTag}
                          </div>
                          <div style="font-size:11px;color:var(--dp-ink-muted);">
                            ${t(`池×${sr.poolQty} · 最高 ${sr.maxBid}`, `Pool×${sr.poolQty} · Top ${sr.maxBid}`)}
                          </div>
                          <div style="font-size:10.5px;color:var(--dp-ink-faint);margin-top:2px;">${allBids}</div>
                        </td>
                      `;
                    }).join('');
                    return `<tr><td><strong>R${h.round}</strong></td>${cells}</tr>`;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="ab-panel-head" style="margin-top:16px;">
            <h3 class="ab-panel-title">${t('全员 3×3 宾果盘总览', 'ALL CONTESTANTS BINGO BOARDS')}</h3>
            <span class="ab-panel-sub">${t('嘉宾「轨道」不占正式排名', 'Orbit is unranked Guest')}</span>
          </div>

          <div class="ab-mini-boards-grid">
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
                  <div class="ab-mini-card ${isWinner ? 'is-winner' : ''} ${p.isGuest ? 'is-guest' : ''}">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                      <strong style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${UI.escapeHtml(p.name)}
                      </strong>
                      <span style="font-family:var(--dp-font-mono);font-size:11.5px;color:var(--dp-brass-bright);">
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
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
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
        <div class="ab-panel">
          <div class="ab-panel-head">
            <h3 class="ab-panel-title">${t('席位状态', 'AUCTION HALL SEATS')}</h3>
            <span class="ab-panel-sub">${t(`共 ${state.seatOrder.length} 位竞拍者`, `${state.seatOrder.length} Bidders`)}</span>
          </div>
          <div class="ab-players-strip">
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
                  <div class="ab-pcard ${isMe ? 'is-me' : ''} ${p.isGuest ? 'is-guest' : ''}">
                    <div class="ab-pcard-top">
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${UI.escapeHtml(p.avatar)} ${UI.escapeHtml(p.name)}
                      </span>
                      ${statusBadge}
                    </div>
                    <div class="ab-pcard-meta">
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
                <div class="ab-history-list">
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
                        <div class="ab-history-row">
                          <strong>R${h.round}</strong>
                          <span style="font-family:var(--dp-font-mono);color:var(--dp-ink-muted);">
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

    // Assemble full stage HTML
    container.innerHTML = `
      <div class="ab-stage">
        <div class="ab-header-bar">
          <div class="ab-round-cluster">
            <span class="ab-round-pill">
              ${isGrand ? t('终局开箱', 'GRAND REVEAL') : `ROUND ${state.round} / ${state.totalRounds}`}
            </span>
            <div class="ab-phase-steps">
              <span class="ab-phase-step ${stepIdx === 1 ? 'is-active' : ''}">1. ${t('选图形', 'Shape')}</span>
              <span>›</span>
              <span class="ab-phase-step ${stepIdx === 2 ? 'is-active' : ''}">2. ${t('密室暗标', 'Sealed Bid')}</span>
              <span>›</span>
              <span class="ab-phase-step ${stepIdx === 3 ? 'is-active' : ''}">3. ${t('落槌', 'Gavel')}</span>
              <span>›</span>
              <span class="ab-phase-step ${stepIdx === 4 ? 'is-active' : ''}">4. ${t('开箱宾果', 'Bingo')}</span>
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

        <div class="ab-arena">
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${isGrand ? renderGrandRevealPanel() : renderAuctionBoxes()}
            ${renderPlayersAndHistory()}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${renderMainBoard()}
          </div>
        </div>
      </div>
    `;

    // Bind Phase 1: Shape Selection
    container.querySelectorAll('[data-pick-shape]').forEach((box) => {
      const submitShape = async () => {
        const sh = box.dataset.pickShape;
        sfx.play('cardFlip');
        const res = await dispatch({ type: 'SELECT_SHAPE', payload: { shape: sh } });
        if (!res.ok) ui.toast(res.reason, 'error');
      };
      box.addEventListener('click', submitShape);
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          submitShape();
        }
      });
    });

    // Bind Phase 2: Coin Click + Drag & Drop + Piece Boost + Submit
    const toggleCoin = (cid) => {
      sfx.play('click');
      if (uiDraft.selectedCoinIds.has(cid)) {
        uiDraft.selectedCoinIds.delete(cid);
      } else {
        uiDraft.selectedCoinIds.add(cid);
      }
      renderAuctionBingo(container, ctx);
    };

    container.querySelectorAll('[data-toggle-coin]').forEach((btn) => {
      const cid = btn.dataset.toggleCoin;
      btn.addEventListener('click', () => toggleCoin(cid));
      btn.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', cid);
      });
    });

    const dropZone = container.querySelector('#ab-envelope-drop');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('is-drag-over');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('is-drag-over');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('is-drag-over');
        const cid = e.dataTransfer?.getData('text/plain');
        if (cid && !uiDraft.selectedCoinIds.has(cid)) {
          sfx.play('bid');
          uiDraft.selectedCoinIds.add(cid);
          renderAuctionBingo(container, ctx);
        }
      });
    }

    container.querySelector('#ab-toggle-piece')?.addEventListener('click', () => {
      sfx.play('pieceGain');
      uiDraft.usePiece = !uiDraft.usePiece;
      renderAuctionBingo(container, ctx);
    });

    container.querySelector('#ab-remove-piece')?.addEventListener('click', () => {
      sfx.play('click');
      uiDraft.usePiece = false;
      renderAuctionBingo(container, ctx);
    });

    container.querySelector('#ab-clear-bid')?.addEventListener('click', () => {
      sfx.play('click');
      uiDraft.selectedCoinIds.clear();
      uiDraft.usePiece = false;
      renderAuctionBingo(container, ctx);
    });

    container.querySelector('#ab-submit-bid')?.addEventListener('click', async () => {
      sfx.play('bid');
      const res = await dispatch({
        type: 'SUBMIT_BID',
        payload: {
          coinIds: [...uiDraft.selectedCoinIds],
          usePieces: uiDraft.usePiece ? 1 : 0,
        },
      });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    // Bind Phase 3: Advance Round
    container.querySelector('#ab-next-round')?.addEventListener('click', async () => {
      sfx.play('click');
      const res = await dispatch({ type: 'ADVANCE_ROUND' });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    // Bind Phase 4: Grand Reveal Interactive Board Placement
    container.querySelectorAll('[data-board-cell]').forEach((cell) => {
      cell.addEventListener('click', async () => {
        const idx = Number(cell.dataset.boardCell);
        sfx.play('tilePlace');
        const res = await dispatch({ type: 'TOGGLE_CELL', payload: { cellIdx: idx } });
        if (!res.ok) ui.toast(res.reason, 'error');
      });
    });

    container.querySelector('#ab-btn-optimize')?.addEventListener('click', async () => {
      sfx.play('pieceGain');
      const res = await dispatch({ type: 'AUTO_OPTIMIZE_BOARD' });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    container.querySelector('#ab-btn-lock-board')?.addEventListener('click', async () => {
      sfx.play('victory');
      const res = await dispatch({ type: 'LOCK_BOARD' });
      if (!res.ok) ui.toast(res.reason, 'error');
    });
}

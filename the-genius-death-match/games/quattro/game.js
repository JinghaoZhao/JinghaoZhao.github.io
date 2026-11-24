/**
 * Quattro (四色牌) — Radiant Crystal Card Salon & 6 Holographic VP Pods UI
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import { GameRules, evaluateQuattroHand } from './rules.js';

let selectedCardIdx = null;
let lastHandledEventKey = null;

const SUIT_LABEL = {
  R: { zh: '红 RUBY', en: 'RED' },
  B: { zh: '蓝 SAPPHIRE', en: 'BLUE' },
  G: { zh: '绿 EMERALD', en: 'GREEN' },
  Y: { zh: '黄 AMBER', en: 'YELLOW' },
  K: { zh: '黑 0', en: 'ZERO' },
};

function renderCrystalCard(card, idx, { isMine, isSelectable, isSelected, isConflict, draggable, lang }) {
  if (!card || card.hidden) {
    return `
      <div class="qt-card suit-hidden">
        <div class="qt-card-num" style="color:var(--tg-gold);font-size:34px;">?</div>
        <div class="qt-card-suit-tag" style="color:var(--tg-ink-faint);">${lang === 'zh' ? '暗牌' : 'HIDDEN'}</div>
      </div>
    `;
  }

  const suitCls = `suit-${card.color}`;
  const stateBadge = card.revealed
    ? lang === 'zh'
      ? '已亮牌'
      : 'OPEN'
    : isMine
    ? lang === 'zh'
      ? '暗牌'
      : 'HIDDEN'
    : '';

  return `
    <div
      class="qt-card ${suitCls} ${card.revealed ? 'is-revealed' : isMine ? 'is-hidden-own' : ''} ${isSelectable ? 'is-clickable' : ''} ${isSelected ? 'is-selected' : ''} ${isConflict ? 'is-conflict' : ''}"
      ${isSelectable ? `data-card-idx="${idx}"` : ''}
      ${draggable ? 'draggable="true"' : ''}
    >
      ${stateBadge ? `<span class="qt-card-state-badge">${stateBadge}</span>` : ''}
      <div class="qt-card-num">${card.value}</div>
      <div class="qt-card-suit-tag">${UI.escapeHtml(I18n.t(SUIT_LABEL[card.color] || { zh: card.color, en: card.color }))}</div>
    </div>
  `;
}

function handleSfxForEvent(lastEvent, sfx) {
  if (!lastEvent) return;
  const key = `${lastEvent.type}-${lastEvent.seatId || ''}-${lastEvent.vpIndex ?? ''}-${lastEvent.stage ?? ''}-${lastEvent.ts || ''}`;
  if (key === lastHandledEventKey) return;
  lastHandledEventKey = key;

  switch (lastEvent.type) {
    case 'MULLIGAN':
    case 'REVEAL_CARD':
      sfx.play('cardFlip');
      break;
    case 'TRADE':
      sfx.play('garnetClink');
      break;
    case 'KEEP_HAND':
    case 'PASS_TRADE':
      sfx.play('click');
      break;
    case 'START_REVEAL':
    case 'START_TRADE':
      sfx.play('reveal');
      break;
    default:
      break;
  }
}

mountGame({
  config: {
    id: 'quattro',
    title: { zh: '四色牌', en: 'Quattro', ko: '콰트로' },
    seasons: ['S2', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'zeroInstantLoss',
        label: { zh: 'S2 经典毒零规则（持有 0 直接判负）', en: 'S2 Classic Rule (Holding 0 = Instant Loss)' },
        type: 'boolean',
        default: false,
      },
      {
        key: 'fastTimers',
        label: { zh: '极速 25 秒计时', en: 'Fast 25s Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 核心规则（S4E9 官方 26 张 + 6 位虚拟玩家）
- **牌库**：红、蓝、黄、绿 1–6 各 1 张（共 24 张）+ **2 张黑色 0 牌**（共 26 张）。
- **目标**：凑齐 **Quattro**（4 张牌**颜色各不相同且数字各不相同**）并使 4 张牌总和最大！（S4 官方规则中，黑色 0 算作第 5 种独立颜色与数字 0，可合法凑成 Quattro，但贡献 0 分；可开启 S2 经典模式改为持有 0 必败。）
- **起手调度 (Mulligan)**：双方初始抽 4 张，各有最多 **2 次重抽机会**。确定手牌后，剩余 18 张均分给 6 位虚拟玩家（VP1–VP6，每人 3 张）。
- **亮牌与交易循环**：
  - 每次轮流翻开 1 张暗牌（翻开的牌永久固定不可再交换）。
  - 在第 1、2、3 次亮牌之后进入交易轮：可选择 **1 张暗牌** 与未交易过的虚拟玩家 **1换1**，或选择 **过牌**。
  - **强制指标**：在亮出第 4 张（最后一张）牌之前，双方必须与 **全部 6 位虚拟玩家各交易 1 次**！
- **虚拟玩家确定性给牌算法（100% 公开可算）**：
  1. 若该 VP 手中有 **0 牌**，必然把 0 牌给你！
  2. 否则，结合你**已经亮出的明牌**，给出能帮你凑成 Quattro（不与明牌撞色撞数）的**最大点数牌**。
  3. 若没有能帮你的牌，给出其手中**最大点数牌**。
  4. 同数字优先级：**红 > 蓝 > 黄 > 绿**。
  - 你交给 VP 的牌会**正面朝上公开**，双方均可据此精准算牌与下套！`,
      en: `### Core Rules (S4E9 Official 26-Card + 6 Virtual Players)
- **Deck**: Red, Blue, Yellow, Green numbered 1–6 (24 cards) + **2 Black Zero (0)** cards = 26 total.
- **Objective**: Form a legal **Quattro** (4 cards with **4 distinct colors AND 4 distinct numbers**) with the highest total sum! (Under default S4 rules, Black 0 acts as a 5th distinct color/value so 1 Black 0 can legally complete a Quattro with 0 sum; toggle S2 Classic mode to make holding 0 an instant loss.)
- **Mulligan**: Each player starts with 4 cards and up to **2 Mulligans**. Remaining 18 cards go 3 each to 6 Virtual Players (VP1–VP6).
- **Reveal & Trade Loop**: Reveal 1 hidden card per stage (face-up cards can never be traded). Between reveals, trade any **hidden** card with an unused VP, or Pass.
- **Mandatory Quota**: Before flipping your 4th (final) card, you MUST complete trades with **ALL 6 Virtual Players**!
- **Deterministic VP Priority**:
  1. If VP holds a **0**, it ALWAYS gives you the 0!
  2. Otherwise, given your **face-up** cards, it gives the highest-value card that helps form a legal Quattro.
  3. Otherwise, it gives its highest-value card overall.
  4. Tie-breaker: **Red > Blue > Yellow > Green**.
  - Cards you hand TO a VP are placed **face-up** publicly — deduce & trap!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderGame,
});

function renderGame(container, ctx) {
  const { state, activeSeatId, mySeatId, isSpectator, lang, lastEvent, dispatch, sfx } = ctx;
  if (!state) return;

  handleSfxForEvent(lastEvent, sfx);

  const viewerId = isSpectator ? state.seatIds[0] : activeSeatId || mySeatId || state.seatIds[0];
  const oppId = state.seatIds[0] === viewerId ? state.seatIds[1] : state.seatIds[0];

  const meInfo = state.seatsById[viewerId] || { name: 'P1', avatar: '♦' };
  const oppInfo = state.seatsById[oppId] || { name: 'P2', avatar: '♛' };

  const myHand = state.hands[viewerId] || [];
  const oppHand = state.hands[oppId] || [];
  const isMyTurn = !isSpectator && state.phase !== 'ended' && state.currentTurnSeatId === viewerId;

  // Validate selectedCardIdx
  if (
    selectedCardIdx != null &&
    (!myHand[selectedCardIdx] || myHand[selectedCardIdx].revealed || state.phase !== 'trade')
  ) {
    selectedCardIdx = null;
  }
  // Auto-select the only hidden card in Stage 3 during trade!
  if (isMyTurn && state.phase === 'trade' && selectedCardIdx == null) {
    const hiddenIdxs = myHand.map((c, i) => (c && !c.revealed ? i : -1)).filter((i) => i !== -1);
    if (hiddenIdxs.length === 1) selectedCardIdx = hiddenIdxs[0];
  }

  const zeroLoss = Boolean(state.options?.zeroInstantLoss);
  const myEval = isSpectator && state.phase !== 'ended' ? null : evaluateQuattroHand(myHand, zeroLoss);
  const oppEval = state.phase === 'ended' ? evaluateQuattroHand(oppHand, zeroLoss) : null;

  const myTradesDone = (state.vps || []).filter((vp) => vp.tradedBy.includes(viewerId)).length;
  const oppTradesDone = (state.vps || []).filter((vp) => vp.tradedBy.includes(oppId)).length;
  const mustFinishQuota = state.phase === 'trade' && state.revealStage === 3 && myTradesDone < 6;

  // Determine instruction text
  let instruction = '';
  if (state.phase === 'ended') {
    instruction = I18n.t(state.result?.summary || { zh: '终局已定！', en: 'Match complete!' });
  } else if (!isMyTurn) {
    const actorName = state.seatsById[state.currentTurnSeatId]?.name || '';
    instruction =
      lang === 'zh' ? `等待 ${actorName} 行动...` : `Waiting for ${actorName}...`;
  } else if (state.phase === 'mulligan') {
    instruction =
      lang === 'zh'
        ? `起手调度：检查你的 4 张牌，决定保留或重抽（剩余 ${state.mulligansLeft[viewerId]} 次）`
        : `Mulligan: Keep your 4 cards or redraw (${state.mulligansLeft[viewerId]} left)`;
  } else if (state.phase === 'reveal') {
    instruction =
      lang === 'zh'
        ? `请点击 1 张【暗牌】将其永久翻开（第 ${state.revealStage}/4 张）`
        : `Click 1 HIDDEN card to reveal it permanently (Card ${state.revealStage}/4)`;
  } else if (state.phase === 'trade') {
    if (mustFinishQuota) {
      instruction =
        lang === 'zh'
          ? `第 3 轮强制指标：点击或拖拽暗牌至剩余虚拟玩家完成全部 6 次交易（已完成 ${myTradesDone}/6）`
          : `Mandatory Quota: Click or drag your hidden card onto remaining VPs (${myTradesDone}/6 done)`;
    } else if (selectedCardIdx != null) {
      instruction =
        lang === 'zh'
          ? `已选中【${I18n.t(SUIT_LABEL[myHand[selectedCardIdx].color])} ${myHand[selectedCardIdx].value}】，点击任意高亮的虚拟玩家完成 1换1 交易！`
          : `Selected [${myHand[selectedCardIdx].color}${myHand[selectedCardIdx].value}] — click a lit Virtual Player to trade!`;
    } else {
      instruction =
        lang === 'zh'
          ? `点击选中 1 张【暗牌】（或直接拖拽至虚拟玩家舱）进行交易，或选择过牌进入下一轮亮牌`
          : `Select (or drag) 1 HIDDEN card onto a Virtual Player to trade, or Pass to reveal next card`;
    }
  }

  const renderMeter = (ev) => {
    if (!ev) return '';
    const presentColors = new Set(myHand.filter((c) => c && !c.hidden).map((c) => c.color));
    const pct = Math.min(100, Math.round((ev.sum / 18) * 100));
    const statusBadge = ev.isZeroBust
      ? `<span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '⚠ 毒零必败！快换掉 0' : '⚠ ZERO BUST! TRADE 0'}</span>`
      : ev.isQuattro
      ? `<span class="tg-badge tg-badge-emerald">✦ ${lang === 'zh' ? '合法 QUATTRO 达成！' : 'VALID QUATTRO!'}</span>`
      : `<span class="tg-badge" style="border-color:rgba(245,158,11,0.55);color:#fde68a;">${
          ev.colorConflicts.length && ev.valueConflicts.length
            ? lang === 'zh'
              ? '颜色 & 数字均有重复'
              : 'Color & Number duplicates'
            : ev.colorConflicts.length
            ? lang === 'zh'
              ? '存在重复颜色'
              : 'Duplicate colors'
            : lang === 'zh'
            ? '存在重复数字'
            : 'Duplicate numbers'
        }</span>`;

    return `
      <div class="qt-meter-row">
        <div class="qt-color-dots">
          ${['R', 'B', 'G', 'Y']
            .map(
              (col) =>
                `<span class="qt-color-dot c-${col} ${presentColors.has(col) ? 'is-lit' : ''}">${col}</span>`
            )
            .join('')}
          ${
            presentColors.has('K')
              ? `<span class="qt-color-dot c-K is-lit">0</span>`
              : ''
          }
        </div>
        <div class="qt-power-meter">
          <div style="display:flex;justify-content:space-between;font-size:11.5px;">
            <span style="color:var(--tg-ink-muted);">${lang === 'zh' ? '四牌总和强度' : 'Total Sum Power'}</span>
            <strong style="font-family:var(--tg-font-mono);color:var(--tg-gold-bright);">${ev.sum} / 18</strong>
          </div>
          <div class="qt-meter-track">
            <div class="qt-meter-fill ${ev.isQuattro ? 'is-quattro' : ''}" style="width:${pct}%;"></div>
          </div>
        </div>
        ${statusBadge}
      </div>
    `;
  };

  container.innerHTML = `
    <div class="qt-arena">
      <div class="qt-status-bar">
        <div class="qt-phase-banner">
          <span class="tg-badge tg-badge-emerald">${UI.escapeHtml(I18n.t(state.phaseLabel))}</span>
          <span>${UI.escapeHtml(instruction)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="qt-quota-pill">${lang === 'zh' ? `你的交易 ${myTradesDone}/6` : `Trades ${myTradesDone}/6`}</span>
          <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? `对手 ${oppTradesDone}/6` : `Opp ${oppTradesDone}/6`}</span>
        </div>
      </div>

      <section class="qt-salon">
        <!-- Opponent Hand Tray -->
        <div class="qt-tray ${state.currentTurnSeatId === oppId && state.phase !== 'ended' ? 'is-my-turn' : ''} ${oppEval?.isQuattro ? 'is-valid-quattro' : ''}">
          <div class="qt-tray-header">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;">
              <span style="color:var(--tg-garnet-bright);">${UI.escapeHtml(oppInfo.avatar || '♛')}</span>
              <span>${UI.escapeHtml(oppInfo.name)}</span>
              ${
                state.phase === 'mulligan'
                  ? `<span class="tg-badge">${lang === 'zh' ? `余 ${state.mulligansLeft[oppId]} 次调度` : `${state.mulligansLeft[oppId]} mulligans`}</span>`
                  : ''
              }
            </div>
            ${
              oppEval
                ? `<span class="tg-badge ${oppEval.isQuattro ? 'tg-badge-emerald' : 'tg-badge-garnet'}">${
                    oppEval.isQuattro ? 'QUATTRO' : lang === 'zh' ? '非四色' : 'NO QUATTRO'
                  } · ${lang === 'zh' ? '总和' : 'SUM'} ${oppEval.sum}</span>`
                : `<span style="font-size:12px;color:var(--tg-ink-muted);">${lang === 'zh' ? `已亮 ${oppHand.filter((c) => c.revealed).length}/4 张` : `Revealed ${oppHand.filter((c) => c.revealed).length}/4`}</span>`
            }
          </div>
          <div class="qt-cards-row">
            ${oppHand
              .map((c, i) =>
                renderCrystalCard(c, i, {
                  isMine: false,
                  isSelectable: false,
                  isSelected: false,
                  isConflict: false,
                  draggable: false,
                  lang,
                })
              )
              .join('')}
          </div>
        </div>

        <!-- 6 Holographic Virtual Player Pods -->
        ${
          state.vps.length > 0
            ? `
              <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 4px;">
                  <span style="font-size:11.5px;font-weight:800;letter-spacing:0.12em;color:#67e8f9;text-transform:uppercase;">
                    ${lang === 'zh' ? '6 位虚拟玩家交易舱（算法：有0必给0 → 助凑Quattro最大 → 全场最大 · 红>蓝>黄>绿）' : '6 VIRTUAL PLAYER PODS (Rule: 0 First → Best Quattro Helper → Highest · R>B>Y>G)'}
                  </span>
                </div>
                <div class="qt-vp-grid">
                  ${state.vps
                    .map((vp) => {
                      const usedByMe = vp.tradedBy.includes(viewerId);
                      const usedByOpp = vp.tradedBy.includes(oppId);
                      const canTradeHere = isMyTurn && state.phase === 'trade' && !usedByMe;
                      return `
                        <div class="qt-vp-pod ${canTradeHere ? 'is-tradeable' : ''} ${usedByMe ? 'is-used-by-me' : ''}" data-vp-idx="${vp.index}">
                          <div class="qt-vp-head">
                            <strong style="font-size:13px;color:${canTradeHere ? 'var(--tg-gold-bright)' : 'var(--tg-ink)'};">${UI.escapeHtml(I18n.t(vp.name))}</strong>
                            <div style="display:flex;gap:4px;">
                              ${usedByMe ? `<span class="tg-badge tg-badge-emerald" style="font-size:9.5px;padding:1px 6px;">${lang === 'zh' ? '我已换' : 'YOU ✓'}</span>` : ''}
                              ${usedByOpp ? `<span class="tg-badge tg-badge-garnet" style="font-size:9.5px;padding:1px 6px;">${lang === 'zh' ? '敌已换' : 'OPP ✓'}</span>` : ''}
                            </div>
                          </div>
                          <div style="font-size:11px;color:var(--tg-ink-faint);">
                            ${lang === 'zh' ? '公开放入记录：' : 'Public deposits:'}
                          </div>
                          <div class="qt-vp-deposits">
                            ${
                              vp.publicDeposits.length
                                ? vp.publicDeposits
                                    .map((dep) => {
                                      const who = dep.seatId === viewerId ? (lang === 'zh' ? '我' : 'Me') : lang === 'zh' ? '敌' : 'Opp';
                                      return `<span class="qt-mini-card suit-${dep.card.color}">${who}: ${dep.card.color}${dep.card.value}</span>`;
                                    })
                                    .join('')
                                : `<span style="font-size:11px;color:var(--tg-ink-faint);">${lang === 'zh' ? '3 张未公开初始牌' : '3 initial hidden cards'}</span>`
                            }
                          </div>
                          ${
                            state.phase === 'ended' && Array.isArray(vp.cards)
                              ? `<div class="qt-vp-deposits" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:5px;">
                                  <span style="font-size:10px;color:var(--tg-ink-faint);">${lang === 'zh' ? '残余：' : 'Left:'}</span>
                                  ${vp.cards.map((c) => `<span class="qt-mini-card suit-${c.color}">${c.color}${c.value}</span>`).join('')}
                                </div>`
                              : ''
                          }
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            `
            : `<div style="text-align:center;padding:18px;border-radius:14px;background:rgba(12,16,28,0.6);border:1px dashed var(--tg-border);color:var(--tg-ink-muted);font-size:13px;">
                ${lang === 'zh' ? '起手调度完成后，剩余 18 张牌将发给 6 位虚拟玩家（每人 3 张）开启交易博弈！' : 'Once both players finish Mulligan, the remaining 18 cards will be dealt to 6 Virtual Players!'}
              </div>`
        }

        <!-- My Hand Tray -->
        <div class="qt-tray ${isMyTurn ? 'is-my-turn' : ''} ${myEval?.isQuattro ? 'is-valid-quattro' : ''}">
          <div class="qt-tray-header">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;">
              <span style="color:var(--tg-gold);">${UI.escapeHtml(meInfo.avatar || '♦')}</span>
              <span>${UI.escapeHtml(meInfo.name)} ${isSpectator ? '' : lang === 'zh' ? '(你)' : '(You)'}</span>
              ${
                state.phase === 'mulligan'
                  ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? `剩余 ${state.mulligansLeft[viewerId]} 次重抽` : `${state.mulligansLeft[viewerId]} Mulligans Left`}</span>`
                  : ''
              }
            </div>
            <span style="font-size:12px;color:var(--tg-ink-muted);">
              ${lang === 'zh' ? `已亮 ${myHand.filter((c) => c.revealed).length}/4 张 · 暗牌可交易` : `Revealed ${myHand.filter((c) => c.revealed).length}/4 · Hidden cards tradeable`}
            </span>
          </div>

          <div class="qt-cards-row">
            ${myHand
              .map((c, i) => {
                const canClick = isMyTurn && !c.revealed && (state.phase === 'reveal' || state.phase === 'trade');
                const canDrag = isMyTurn && !c.revealed && state.phase === 'trade';
                const isConflict =
                  myEval && !c.hidden && (myEval.colorConflicts.includes(c.color) || myEval.valueConflicts.includes(c.value));
                return renderCrystalCard(c, i, {
                  isMine: !isSpectator,
                  isSelectable: canClick,
                  isSelected: selectedCardIdx === i,
                  isConflict: Boolean(isConflict),
                  draggable: canDrag,
                  lang,
                });
              })
              .join('')}
          </div>

          ${renderMeter(myEval)}
        </div>
      </section>

      <!-- Action Controls -->
      <section class="qt-controls">
        ${
          isMyTurn && state.phase === 'mulligan'
            ? `
              <div style="font-size:13px;color:var(--tg-ink-muted);">
                ${lang === 'zh' ? '满意这手牌可直接锁定，或点击重抽换 4 张新牌。' : 'Lock this opening hand or redraw 4 fresh cards.'}
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button type="button" class="tg-btn tg-btn-cyan" id="qt-btn-mulligan" ${state.mulligansLeft[viewerId] > 0 ? '' : 'disabled'}>
                  ↻ ${lang === 'zh' ? `重抽 Mulligan (${state.mulligansLeft[viewerId]})` : `Mulligan (${state.mulligansLeft[viewerId]})`}
                </button>
                <button type="button" class="tg-btn tg-btn-gold" id="qt-btn-keep">
                  ✓ ${lang === 'zh' ? '保留此手牌 Keep' : 'Keep Hand'}
                </button>
              </div>
            `
            : isMyTurn && state.phase === 'trade'
            ? `
              <div style="font-size:12.5px;color:var(--tg-ink-muted);">
                ${
                  mustFinishQuota
                    ? lang === 'zh'
                      ? `⚠ 亮出第 4 张牌前必须完成全部 6 位虚拟玩家交易（还差 ${6 - myTradesDone} 位）`
                      : `⚠ Must complete ${6 - myTradesDone} more VP trade(s) before final reveal`
                    : lang === 'zh'
                    ? '选中（或拖拽）暗牌到虚拟玩家交易，或点击过牌进入下一张亮牌。'
                    : 'Select or drag a hidden card onto a VP pod, or Pass to advance.'
                }
              </div>
              <button type="button" class="tg-btn tg-btn-ghost" id="qt-btn-pass" ${mustFinishQuota ? 'disabled' : ''}>
                ${lang === 'zh' ? '本轮结束交易 (过牌 PASS)' : 'Pass Trade Round'}
              </button>
            `
            : `<div style="width:100%;text-align:center;font-size:13px;color:var(--tg-ink-muted);">${UI.escapeHtml(instruction)}</div>`
        }
      </section>
    </div>
  `;

  // Bind Mulligan buttons
  container.querySelector('#qt-btn-mulligan')?.addEventListener('click', () => {
    dispatch({ type: 'MULLIGAN' });
  });
  container.querySelector('#qt-btn-keep')?.addEventListener('click', () => {
    dispatch({ type: 'KEEP' });
  });
  container.querySelector('#qt-btn-pass')?.addEventListener('click', () => {
    selectedCardIdx = null;
    dispatch({ type: 'PASS' });
  });

  // Bind Card clicks & Drag-and-Drop
  container.querySelectorAll('[data-card-idx]').forEach((cardEl) => {
    const idx = Number(cardEl.dataset.cardIdx);
    cardEl.addEventListener('click', () => {
      if (state.phase === 'reveal') {
        selectedCardIdx = null;
        dispatch({ type: 'REVEAL_CARD', payload: { cardIndex: idx } });
      } else if (state.phase === 'trade') {
        sfx.play('click');
        selectedCardIdx = selectedCardIdx === idx ? null : idx;
        renderGame(container, ctx);
      }
    });

    cardEl.addEventListener('dragstart', (e) => {
      selectedCardIdx = idx;
      cardEl.classList.add('is-dragging');
      e.dataTransfer?.setData('text/plain', String(idx));
    });
    cardEl.addEventListener('dragend', () => {
      cardEl.classList.remove('is-dragging');
    });
  });

  // Bind VP pod clicks & drop targets
  container.querySelectorAll('[data-vp-idx]').forEach((podEl) => {
    const vpIndex = Number(podEl.dataset.vpIdx);
    const canDrop = podEl.classList.contains('is-tradeable');
    if (!canDrop) return;

    podEl.addEventListener('click', () => {
      if (selectedCardIdx == null) {
        sfx.play('error');
        UI.toast(
          lang === 'zh' ? '请先点击选中你的一张暗牌！' : 'Select one of your hidden cards first!',
          'error'
        );
        return;
      }
      const cIdx = selectedCardIdx;
      selectedCardIdx = null;
      dispatch({ type: 'TRADE', payload: { cardIndex: cIdx, vpIndex } });
    });

    podEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      podEl.classList.add('is-drag-over');
    });
    podEl.addEventListener('dragleave', () => {
      podEl.classList.remove('is-drag-over');
    });
    podEl.addEventListener('drop', (e) => {
      e.preventDefault();
      podEl.classList.remove('is-drag-over');
      const raw = e.dataTransfer?.getData('text/plain');
      const cIdx = raw !== '' && raw != null ? Number(raw) : selectedCardIdx;
      if (Number.isInteger(cIdx) && cIdx >= 0) {
        selectedCardIdx = null;
        dispatch({ type: 'TRADE', payload: { cardIndex: cIdx, vpIndex } });
      }
    });
  });
}

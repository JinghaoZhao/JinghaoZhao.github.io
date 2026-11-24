/**
 * Indian Poker (印第安扑克) — Interactive Broadcast Arena UI
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import { GameRules, computeBettingBounds } from './rules.js';

let selectedRaiseBy = 1;
let lastHandledEventKey = null;

function renderChipTower(chips) {
  const count = Math.min(7, Math.max(0, Math.ceil(chips / 5)));
  let html = '<span class="ip-mini-chip-tower" aria-hidden="true">';
  for (let i = 0; i < count; i++) {
    html += '<span class="ip-mini-disc"></span>';
  }
  html += '</span>';
  return html;
}

function renderCard3D({ value, hidden, label, isShowdown }) {
  const isTen = value === 10;
  const numText = value != null ? String(value) : '?';
  return `
    <div class="ip-card-stage">
      <div class="ip-card-caption">${UI.escapeHtml(label)}</div>
      <div class="tg-card-3d ip-card-3d ${hidden ? 'is-flipped' : ''}">
        <div class="tg-card-3d-inner">
          <div class="tg-card-face ip-card-face-front ${isTen ? 'is-card-ten' : ''}">
            <span class="ip-card-corner is-tl">${UI.escapeHtml(numText)}</span>
            <div class="ip-card-big-num">${UI.escapeHtml(numText)}</div>
            <div class="ip-card-sub">${isTen ? 'PENALTY X' : isShowdown ? 'REVEALED' : 'GENIUS'}</div>
            <span class="ip-card-corner is-br">${UI.escapeHtml(numText)}</span>
          </div>
          <div class="tg-card-face ip-card-mirror-back">
            <div class="ip-mirror-q">?</div>
            <div class="ip-mirror-tag">${I18n.t({ zh: '额头暗牌', en: 'FOREHEAD' })}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCardTracker(revealedHistory, oppVisibleCard) {
  const spentCounts = Array(11).fill(0);
  for (const c of revealedHistory || []) {
    if (c >= 1 && c <= 10) spentCounts[c] += 1;
  }
  let html = '<div class="ip-tracker-grid">';
  for (let n = 1; n <= 10; n++) {
    const spent = spentCounts[n];
    const oppHasOne = oppVisibleCard === n;
    const exhausted = spent >= 2;
    let pips = '';
    for (let k = 0; k < 2; k++) {
      let cls = 'ip-pip';
      if (k < spent) cls += ' is-spent';
      else if (oppHasOne && k === spent) cls += ' is-live-opp';
      pips += `<span class="${cls}"></span>`;
    }
    html += `
      <div class="ip-tracker-cell ${n === 10 ? 'is-ten' : ''} ${exhausted ? 'is-exhausted' : ''}" title="${n}">
        <span>${n}</span>
        <span class="ip-tracker-pips">${pips}</span>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

function handleSfxForEvent(lastEvent, sfx) {
  if (!lastEvent) return;
  const key = `${lastEvent.type}-${lastEvent.round || ''}-${lastEvent.seatId || ''}-${lastEvent.amount || ''}-${lastEvent.ts || ''}-${lastEvent.potAmount || ''}`;
  if (key === lastHandledEventKey) return;
  lastHandledEventKey = key;

  switch (lastEvent.type) {
    case 'DEAL':
      sfx.play('cardFlip');
      break;
    case 'BET':
    case 'RAISE':
    case 'CALL':
      sfx.play('chipStack');
      break;
    case 'ALL_IN':
      sfx.play('clash');
      break;
    case 'CHECK':
      sfx.play('click');
      break;
    case 'SHOWDOWN':
      sfx.play('reveal');
      break;
    case 'FOLD':
      sfx.play('cardFlip');
      break;
    case 'FOLD_PENALTY_10':
      sfx.play('eliminate');
      break;
    default:
      break;
  }
}

mountGame({
  config: {
    id: 'indian-poker',
    title: { zh: '印第安扑克', en: 'Indian Poker', ko: '인디언 포커' },
    seasons: ['S1', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'startingChips',
        label: { zh: '初始筹码', en: 'Starting Chips' },
        type: 'select',
        default: '30',
        choices: [
          { value: '30', label: { zh: '30 筹码（第4季标准）', en: '30 Chips (S4 Standard)' } },
          { value: '20', label: { zh: '20 筹码（第1季总决赛）', en: '20 Chips (S1 Final)' } },
        ],
      },
      {
        key: 'judgeMode',
        label: { zh: 'S1E9 观战嘉宾提示', en: 'S1E9 Judge Hints' },
        type: 'boolean',
        default: false,
      },
      {
        key: 'fastTimers',
        label: { zh: '极速 20 秒计时', en: 'Fast 20s Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 核心规则（S1 / S4 官方标准）
- **牌库**：共 20 张牌（数字 1–10 各 2 张），每局不洗回牌库，用尽后重新洗牌，**支持精准记牌**。
- **盲区对决**：每局双方各投入 1 枚底注后发牌。你**可以看到对手额头的牌**，但**看不到自己的牌**。
- **无限注加注**：先手可过牌（Check）或下注（Bet），面对加注可跟注（Call）、反加（Raise）、全下（All-In）或弃牌（Fold）。加注上限受双方有效筹码限制。
- **10 牌弃牌重罚**：若你拿着 **10** 选择弃牌，必须额外直接赔给对手 **10 枚筹码**！
- **平局滚存**：若摊牌数字相同，底池全部保留并滚存至下一局。
- **胜负条件**：将对手筹码清零即赢得死亡对决！`,
      en: `### Core Rules (S1 / S4 Official Standard)
- **20-Card Shoe**: Two copies each of numbers 1–10. Cards are NOT reshuffled until the shoe runs out — track the remaining cards!
- **Forehead Blindspot**: Both post a 1-chip ante. You **see your opponent's card**, but **NOT your own**.
- **No-Limit Betting**: Check, Bet, Call, Raise, All-In (capped to effective stack), or Fold.
- **10-Card Fold Penalty**: If you **FOLD while holding a 10**, you must pay an extra **10 chips** directly to your opponent!
- **Draw Carryover**: Identical numbers tie — the entire pot stays on the table and carries over into the next hand.
- **Victory**: Reduce your opponent's chip stack to 0.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, activeSeatId, mySeatId, isSpectator, lang, lastEvent, dispatch, sfx } = ctx;
    if (!state) return;

    handleSfxForEvent(lastEvent, sfx);

    const viewerId = isSpectator ? state.seatIds[0] : activeSeatId || mySeatId || state.seatIds[0];
    const oppId = state.seatIds[0] === viewerId ? state.seatIds[1] : state.seatIds[0];

    const meInfo = state.seatsById[viewerId] || { name: 'P1', avatar: '♦' };
    const oppInfo = state.seatsById[oppId] || { name: 'P2', avatar: '♛' };

    const myCard = state.hands[viewerId];
    const oppCard = state.hands[oppId];
    const isShowdown = state.phase === 'showdown' || state.phase === 'ended';
    const isMyTurn = !isSpectator && state.phase === 'betting' && state.currentTurnSeatId === viewerId;

    const bounds = computeBettingBounds(state, viewerId);
    if (selectedRaiseBy > bounds.maxRaiseBy) selectedRaiseBy = Math.max(1, bounds.maxRaiseBy);
    if (selectedRaiseBy < 1) selectedRaiseBy = 1;

    const res = state.lastResolution;
    const isPenaltyFlash = Boolean(res && res.penaltyAmount > 0);
    const liveOppForTracker = !isShowdown && !isSpectator ? oppCard : null;

    const actionTapeHtml = (state.actionLog || [])
      .slice(-6)
      .map((entry) => {
        const who = state.seatsById[entry.seatId]?.name || entry.seatId;
        const map = {
          CHECK: lang === 'zh' ? '过牌' : 'CHECK',
          CALL: lang === 'zh' ? `跟注 +${entry.amount}` : `CALL +${entry.amount}`,
          BET: lang === 'zh' ? `下注 +${entry.amount}` : `BET +${entry.amount}`,
          RAISE: lang === 'zh' ? `加注 +${entry.amount}` : `RAISE +${entry.amount}`,
          ALL_IN: lang === 'zh' ? `全下 +${entry.amount}` : `ALL-IN +${entry.amount}`,
          FOLD: lang === 'zh' ? '弃牌' : 'FOLD',
        };
        return `<span class="ip-tape-pill">${UI.escapeHtml(who)}: ${map[entry.type] || entry.type}</span>`;
      })
      .join('');

    let resolutionHtml = '';
    if (res) {
      const winnerName = res.winnerSeatId ? state.seatsById[res.winnerSeatId]?.name : '';
      let title = '';
      let sub = '';
      if (res.kind === 'fold') {
        const folderName = state.seatsById[res.foldedSeatId]?.name || '';
        if (res.penaltyAmount > 0) {
          title =
            lang === 'zh'
              ? `⚠ 10 牌弃牌重罚！-${res.penaltyAmount} 筹码`
              : `⚠ 10-CARD FOLD PENALTY! -${res.penaltyAmount} CHIPS`;
          sub =
            lang === 'zh'
              ? `${folderName} 握有 10 弃牌！${winnerName} 赢得底池 ${res.potAmount} + 罚金 ${res.penaltyAmount} 筹码`
              : `${folderName} folded a 10! ${winnerName} wins ${res.potAmount} pot + ${res.penaltyAmount} penalty`;
        } else {
          title =
            lang === 'zh'
              ? `${folderName} 弃牌 · ${winnerName} 收下 ${res.potAmount} 筹码`
              : `${folderName} Folded · ${winnerName} Wins ${res.potAmount}`;
          sub =
            lang === 'zh'
              ? `双方底牌揭晓：${meInfo.name} [${res.cards[viewerId]}] vs ${oppInfo.name} [${res.cards[oppId]}]`
              : `Cards revealed: ${meInfo.name} [${res.cards[viewerId]}] vs ${oppInfo.name} [${res.cards[oppId]}]`;
        }
      } else if (res.isTie) {
        title = res.splitOnAllInTie
          ? lang === 'zh'
            ? `平局分池 · 双方均为 ${res.cards[viewerId]}`
            : `All-In Tie Split · Both held ${res.cards[viewerId]}`
          : lang === 'zh'
          ? `平局！底池 ${res.potAmount} 筹码滚存至下一局`
          : `TIE! ${res.potAmount} Chips Carry Over`;
        sub =
          lang === 'zh'
            ? `双方均为 ${res.cards[viewerId]}，下一局仍须各下 1 枚底注`
            : `Both players held ${res.cards[viewerId]}. Next hand posts fresh 1-chip antes.`;
      } else {
        title =
          lang === 'zh'
            ? `${winnerName} 摊牌获胜！赢得 ${res.potAmount} 筹码`
            : `${winnerName} Wins Showdown (+${res.potAmount})`;
        sub =
          lang === 'zh'
            ? `${meInfo.name} [${res.cards[viewerId]}] vs ${oppInfo.name} [${res.cards[oppId]}]`
            : `${meInfo.name} [${res.cards[viewerId]}] vs ${oppInfo.name} [${res.cards[oppId]}]`;
      }

      resolutionHtml = `
        <div class="ip-resolution-banner ${isPenaltyFlash ? 'is-penalty' : ''}">
          <div class="ip-resolution-title">${UI.escapeHtml(title)}</div>
          <div class="ip-resolution-sub">${UI.escapeHtml(sub)}</div>
          ${
            state.phase === 'showdown' && !isSpectator
              ? `<button type="button" class="tg-btn tg-btn-gold" id="ip-btn-next-hand" style="margin-top:4px;">${
                  lang === 'zh' ? '进入下一局 →' : 'Deal Next Hand →'
                }</button>`
              : ''
          }
        </div>
      `;
    }

    const judgeHtml =
      state.judgeAdvice && state.phase === 'betting'
        ? `
          <div class="ip-judge-strip">
            <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? '嘉宾密报' : 'JUDGES'}</span>
            ${state.judgeAdvice
              .map(
                (j) => `
                <span class="ip-judge-chip ${j.signal === 'GO' ? 'is-go' : 'is-fold'}">
                  ${UI.escapeHtml(I18n.t(j.name))}: <strong>${j.signal === 'GO' ? (lang === 'zh' ? '冲 GO' : 'GO') : (lang === 'zh' ? '弃 FOLD' : 'FOLD')}</strong>
                </span>
              `
              )
              .join('')}
          </div>
        `
        : '';

    const canRaise = isMyTurn && bounds.maxRaiseBy >= 1;
    const raiseTotalAdd = bounds.toCall + selectedRaiseBy;
    const isAllInSelected = canRaise && selectedRaiseBy === bounds.maxRaiseBy;

    container.innerHTML = `
      <div class="ip-arena">
        <div class="ip-shoe-bar">
          <div class="ip-shoe-meta">
            <span>${lang === 'zh' ? `第 ${state.shoeNumber} 副牌` : `Shoe #${state.shoeNumber}`}</span>
            <span class="ip-shoe-count">${lang === 'zh' ? `余 ${state.deckRemaining}/20 张` : `${state.deckRemaining}/20 Left`}</span>
            ${
              state.reshuffledThisHand && state.phase === 'betting' && state.actionLog.length === 0
                ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '全新洗牌' : 'FRESH DECK'}</span>`
                : ''
            }
          </div>
          ${renderCardTracker(state.revealedHistory, liveOppForTracker)}
        </div>

        <section class="ip-table ${isPenaltyFlash ? 'is-penalty-flash' : ''}">
          <!-- Opponent Zone -->
          <div class="ip-seat-zone">
            <div class="ip-player-plate ${state.currentTurnSeatId === oppId && state.phase === 'betting' ? 'is-active-turn' : ''} ${res?.winnerSeatId === oppId ? 'is-winner' : ''}">
              <div class="ip-plate-top">
                <span class="ip-plate-name">
                  <span style="color:var(--tg-garnet-bright);">${UI.escapeHtml(oppInfo.avatar || '♛')}</span>
                  ${UI.escapeHtml(oppInfo.name)}
                </span>
                ${
                  state.nextFirstActorSeatId === oppId
                    ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '先手' : 'FIRST'}</span>`
                    : ''
                }
              </div>
              <div class="ip-chip-stack">
                <div class="ip-chip-visual">
                  ${renderChipTower(state.chips[oppId])}
                  <span class="ip-chip-num">${state.chips[oppId]}</span>
                </div>
                ${
                  state.streetBet[oppId] > 0
                    ? `<span class="ip-bet-pill">${lang === 'zh' ? `已下 +${state.streetBet[oppId]}` : `BET +${state.streetBet[oppId]}`}</span>`
                    : ''
                }
              </div>
            </div>

            ${renderCard3D({
              value: oppCard,
              hidden: oppCard == null,
              label: lang === 'zh' ? '对手额头牌（可见）' : 'OPPONENT FOREHEAD',
              isShowdown,
            })}
          </div>

          <!-- Center Pot & Showdown Banner -->
          <div class="ip-center-stage">
            <div class="ip-pot-orb">
              <div>
                <div class="ip-pot-label">${lang === 'zh' ? '当前底池 POT' : 'TOTAL POT'}</div>
                ${
                  state.carryoverPot > 0
                    ? `<div style="font-size:10.5px;color:var(--tg-cyan);">${lang === 'zh' ? '含平局滚存' : 'Carryover active'}</div>`
                    : ''
                }
              </div>
              <div class="ip-pot-value">${state.pot}</div>
            </div>
            ${judgeHtml}
            ${actionTapeHtml ? `<div class="ip-action-tape">${actionTapeHtml}</div>` : ''}
            ${resolutionHtml}
          </div>

          <!-- My Zone -->
          <div class="ip-seat-zone">
            ${renderCard3D({
              value: myCard,
              hidden: myCard == null,
              label: isShowdown
                ? lang === 'zh'
                  ? '你的底牌（已揭晓）'
                  : 'YOUR CARD (REVEALED)'
                : lang === 'zh'
                ? '你的额头牌（保密）'
                : 'YOUR FOREHEAD (HIDDEN)',
              isShowdown,
            })}

            <div class="ip-player-plate ${isMyTurn ? 'is-active-turn' : ''} ${res?.winnerSeatId === viewerId ? 'is-winner' : ''}">
              <div class="ip-plate-top">
                <span class="ip-plate-name">
                  <span style="color:var(--tg-gold);">${UI.escapeHtml(meInfo.avatar || '♦')}</span>
                  ${UI.escapeHtml(meInfo.name)} ${isSpectator ? '' : lang === 'zh' ? '(你)' : '(You)'}
                </span>
                ${
                  state.nextFirstActorSeatId === viewerId
                    ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '先手' : 'FIRST'}</span>`
                    : ''
                }
              </div>
              <div class="ip-chip-stack">
                <div class="ip-chip-visual">
                  ${renderChipTower(state.chips[viewerId])}
                  <span class="ip-chip-num">${state.chips[viewerId]}</span>
                </div>
                ${
                  state.streetBet[viewerId] > 0
                    ? `<span class="ip-bet-pill">${lang === 'zh' ? `已下 +${state.streetBet[viewerId]}` : `BET +${state.streetBet[viewerId]}`}</span>`
                    : ''
                }
              </div>
            </div>
          </div>
        </section>

        <!-- Betting Controls -->
        <section class="ip-controls">
          ${
            isMyTurn
              ? `
                <div class="ip-penalty-warn">
                  <span>⚠</span>
                  <span>${
                    lang === 'zh'
                      ? '警告：若你的额头暗牌是 10 而选择弃牌，将立即额外罚给对手 10 枚筹码！'
                      : 'WARNING: Folding while holding a 10 triggers an immediate -10 chip penalty to your opponent!'
                  }</span>
                </div>

                ${
                  canRaise
                    ? `
                      <div class="ip-controls-row">
                        <div class="ip-raise-bar">
                          <span style="font-size:12px;color:var(--tg-ink-muted);white-space:nowrap;">
                            ${bounds.canCheck ? (lang === 'zh' ? '下注额' : 'Bet') : (lang === 'zh' ? '加注额' : 'Raise +')}
                          </span>
                          <input
                            type="range"
                            class="ip-slider"
                            id="ip-raise-slider"
                            min="1"
                            max="${bounds.maxRaiseBy}"
                            value="${selectedRaiseBy}"
                          />
                          <span class="tg-dial-value" id="ip-raise-readout" style="font-size:18px;min-width:44px;">+${selectedRaiseBy}</span>
                        </div>
                        <div class="ip-quick-chips">
                          ${[1, 3, 5]
                            .filter((v) => v <= bounds.maxRaiseBy)
                            .map(
                              (v) =>
                                `<button type="button" class="tg-btn tg-btn-sm" data-preset="${v}">+${v}</button>`
                            )
                            .join('')}
                          ${
                            Math.min(bounds.maxRaiseBy, Math.max(1, Math.round(state.pot / 2))) > 1
                              ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-cyan" data-preset="${Math.min(bounds.maxRaiseBy, Math.max(1, Math.round(state.pot / 2)))}">${lang === 'zh' ? '半池' : '½ Pot'}</button>`
                              : ''
                          }
                          <button type="button" class="tg-btn tg-btn-sm tg-btn-garnet" data-preset="${bounds.maxRaiseBy}">${lang === 'zh' ? '全下' : 'MAX'}</button>
                        </div>
                      </div>
                    `
                    : ''
                }

                <div class="ip-action-buttons">
                  ${
                    bounds.canCheck
                      ? `<button type="button" class="tg-btn tg-btn-cyan ip-action-btn" id="ip-btn-check">
                          <span>${lang === 'zh' ? '过牌 CHECK' : 'CHECK'}</span>
                          <small>${lang === 'zh' ? '0 筹码' : '0 chips'}</small>
                        </button>`
                      : `<button type="button" class="tg-btn tg-btn-cyan ip-action-btn" id="ip-btn-call">
                          <span>${lang === 'zh' ? '跟注 CALL' : 'CALL'}</span>
                          <small>+${bounds.toCall} ${lang === 'zh' ? '筹码摊牌' : 'to showdown'}</small>
                        </button>`
                  }
                  <button type="button" class="tg-btn tg-btn-gold ip-action-btn" id="ip-btn-raise" ${canRaise ? '' : 'disabled'}>
                    <span id="ip-btn-raise-title">${
                      isAllInSelected
                        ? lang === 'zh'
                          ? '全下 ALL-IN'
                          : 'ALL-IN'
                        : bounds.canCheck
                        ? lang === 'zh'
                          ? '下注 BET'
                          : 'BET'
                        : lang === 'zh'
                        ? '加注 RAISE'
                        : 'RAISE'
                    }</span>
                    <small id="ip-btn-raise-sub">${
                      canRaise
                        ? lang === 'zh'
                          ? `共投入 ${raiseTotalAdd} 筹码`
                          : `Total +${raiseTotalAdd} chips`
                        : lang === 'zh'
                        ? '已达上限'
                        : 'At cap'
                    }</small>
                  </button>
                  <button type="button" class="tg-btn tg-btn-garnet ip-action-btn" id="ip-btn-allin" ${canRaise ? '' : 'disabled'}>
                    <span>${lang === 'zh' ? '全下 ALL-IN' : 'ALL-IN'}</span>
                    <small>${canRaise ? `+${bounds.maxAdd}` : '--'}</small>
                  </button>
                  <button type="button" class="tg-btn tg-btn-ghost ip-action-btn" id="ip-btn-fold" style="border-color:rgba(255,46,84,0.45);color:#ff99ab;">
                    <span>${lang === 'zh' ? '弃牌 FOLD' : 'FOLD'}</span>
                    <small>${lang === 'zh' ? '10牌罚-10' : '10 = -10 pen'}</small>
                  </button>
                </div>
              `
              : `<div class="ip-waiting-bar">${
                  state.phase === 'showdown'
                    ? lang === 'zh'
                      ? '本局已结算，点击上方按钮进入下一局。'
                      : 'Hand settled. Click above to deal the next hand.'
                    : state.phase === 'ended'
                    ? lang === 'zh'
                      ? '死亡对决已分出胜负！'
                      : 'Death Match concluded!'
                    : lang === 'zh'
                    ? `等待 ${UI.escapeHtml(state.seatsById[state.currentTurnSeatId]?.name || '')} 思考决策...`
                    : `Waiting for ${UI.escapeHtml(state.seatsById[state.currentTurnSeatId]?.name || '')} to act...`
                }</div>`
          }
        </section>
      </div>
    `;

    // Bind events
    container.querySelector('#ip-btn-next-hand')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_HAND' });
    });

    const slider = container.querySelector('#ip-raise-slider');
    const readout = container.querySelector('#ip-raise-readout');
    const raiseTitle = container.querySelector('#ip-btn-raise-title');
    const raiseSub = container.querySelector('#ip-btn-raise-sub');

    const updateRaiseUi = (val) => {
      selectedRaiseBy = Math.max(1, Math.min(bounds.maxRaiseBy, Math.floor(Number(val) || 1)));
      if (slider) slider.value = String(selectedRaiseBy);
      if (readout) readout.textContent = `+${selectedRaiseBy}`;
      const isMax = selectedRaiseBy === bounds.maxRaiseBy;
      if (raiseTitle) {
        raiseTitle.textContent = isMax
          ? lang === 'zh'
            ? '全下 ALL-IN'
            : 'ALL-IN'
          : bounds.canCheck
          ? lang === 'zh'
            ? '下注 BET'
            : 'BET'
          : lang === 'zh'
          ? '加注 RAISE'
          : 'RAISE';
      }
      if (raiseSub) {
        const tot = bounds.toCall + selectedRaiseBy;
        raiseSub.textContent =
          lang === 'zh' ? `共投入 ${tot} 筹码` : `Total +${tot} chips`;
      }
    };

    slider?.addEventListener('input', (e) => updateRaiseUi(e.target.value));
    container.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        updateRaiseUi(btn.dataset.preset);
      });
    });

    container.querySelector('#ip-btn-check')?.addEventListener('click', () => {
      dispatch({ type: 'CHECK' });
    });
    container.querySelector('#ip-btn-call')?.addEventListener('click', () => {
      dispatch({ type: 'CALL' });
    });
    container.querySelector('#ip-btn-raise')?.addEventListener('click', () => {
      dispatch({ type: 'RAISE', payload: { raiseBy: selectedRaiseBy } });
    });
    container.querySelector('#ip-btn-allin')?.addEventListener('click', () => {
      if (bounds.maxRaiseBy >= 1) {
        dispatch({ type: 'RAISE', payload: { raiseBy: bounds.maxRaiseBy } });
      }
    });
    container.querySelector('#ip-btn-fold')?.addEventListener('click', () => {
      dispatch({ type: 'FOLD' });
    });
  },
});

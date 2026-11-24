/**
 * Indian Hold'em (印第安德州扑克) — Interactive Broadcast Arena UI
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import {
  GameRules,
  evaluateHoldemHand,
  computeBoardOuts,
  computeBettingBounds,
} from './rules.js';

let selectedRaiseBy = 1;
let lastHandledEventKey = null;

function renderShoeTracker(revealedHistory, community, oppVisibleCard) {
  const spent = Array(11).fill(0);
  for (const c of revealedHistory || []) {
    if (c >= 1 && c <= 10) spent[c] += 1;
  }
  const boardCounts = Array(11).fill(0);
  for (const c of community || []) {
    if (c >= 1 && c <= 10) boardCounts[c] += 1;
  }

  let html = '<div class="ih-tracker-grid">';
  for (let n = 1; n <= 10; n++) {
    const s = spent[n];
    const b = boardCounts[n];
    const o = oppVisibleCard === n ? 1 : 0;
    const exhausted = s + b + o >= 4;
    let pips = '';
    for (let k = 0; k < 4; k++) {
      let cls = 'ih-pip';
      if (k < s) cls += ' is-spent';
      else if (k < s + b) cls += ' is-live-board';
      else if (k < s + b + o) cls += ' is-live-opp';
      pips += `<span class="${cls}"></span>`;
    }
    html += `
      <div class="ih-tracker-cell ${exhausted ? 'is-exhausted' : ''}">
        <span>${n}</span>
        <span class="ih-tracker-pips">${pips}</span>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

function renderCard({ value, hidden, isCommunity, caption, tag }) {
  const txt = value != null ? String(value) : '?';
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
      ${caption ? `<span style="font-size:10px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;color:var(--tg-ink-muted);">${UI.escapeHtml(caption)}</span>` : ''}
      <div class="tg-card-3d ih-card-3d ${isCommunity ? 'is-community' : ''} ${hidden ? 'is-flipped' : ''}">
        <div class="tg-card-3d-inner">
          <div class="tg-card-face ih-card-front ${isCommunity ? 'is-comm-card' : ''}">
            <span class="ih-card-corner tl">${UI.escapeHtml(txt)}</span>
            <div class="ih-card-num">${UI.escapeHtml(txt)}</div>
            <div class="ih-card-tag">${UI.escapeHtml(tag || (isCommunity ? 'BOARD' : 'FOREHEAD'))}</div>
            <span class="ih-card-corner br">${UI.escapeHtml(txt)}</span>
          </div>
          <div class="tg-card-face ih-card-back">
            <div class="ih-back-q">?</div>
            <div style="font-size:9px;letter-spacing:0.16em;color:rgba(255,200,210,0.75);">${I18n.t({ zh: '额头暗牌', en: 'HIDDEN' })}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHandRankBadge(ev, lang) {
  if (!ev) return '';
  return `<span class="ih-rank-pill tier-${ev.tier}">${UI.escapeHtml(I18n.t(ev.label))}</span>`;
}

function handleSfxForEvent(lastEvent, sfx) {
  if (!lastEvent) return;
  const key = `${lastEvent.type}-${lastEvent.round || ''}-${lastEvent.seatId || ''}-${lastEvent.amount || ''}-${lastEvent.potAmount || ''}-${lastEvent.ts || ''}`;
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
    case 'FOLD_PENALTY':
      sfx.play('eliminate');
      break;
    default:
      break;
  }
}

mountGame({
  config: {
    id: 'indian-holdem',
    title: { zh: '印第安德州扑克', en: "Indian Hold'em", ko: '인디언 홀덤' },
    seasons: ['S2'],
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
          { value: '30', label: { zh: '30 筹码（标准）', en: '30 Chips (Standard)' } },
          { value: '20', label: { zh: '20 筹码（S2 总决赛）', en: '20 Chips (S2 Finals)' } },
        ],
      },
      {
        key: 'pairPenalty',
        label: { zh: 'S2总决赛规则：对子弃牌罚5筹码', en: 'S2 Final: Pair Fold -5 Penalty' },
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
      zh: `### 核心规则（S2E7 / S2E10 / S2E12 官方规则）
- **40 张牌库**：数字 1–10 各 4 张，用至不足 4 张时重新洗牌。
- **公共牌 + 额头牌**：每局双方下 1 筹码底注，桌面亮出 **2 张公共牌**，每人额头贴 1 张牌（仅对手可见、本人保密）。
- **三张牌型大小（由大到小）**：
  - **三条 (Triple)**：3 张相同数字（如 7-7-7）。
  - **顺子 (Straight)**：3 张连续数字，**10 与 1 可首尾相连**！官方大小：\`9-10-1\` > \`8-9-10\` > ... > \`1-2-3\` > \`10-1-2\`。
  - **对子 (Pair)**：2 张相同，先比对子大小，相同再比第 3 张踢脚牌。
  - **散牌 (High Card)**：比最大数字。
- **强牌弃牌重罚**：若你的暗牌与公共牌组成 **顺子** 或 **三条** 却选择弃牌，须额外直接赔给对手 **10 枚筹码**！（开启 S2 总决赛模式后，对子弃牌另罚 5 筹码。）
- **平局滚存**：牌型完全相同时，底池全额滚存至下一局。`,
      en: `### Core Rules (S2E7 / S2E10 / S2E12 Official)
- **40-Card Shoe**: Four copies each of 1–10. Reshuffles when fewer than 4 cards remain.
- **2 Community Cards + Forehead Card**: Both post 1-chip ante. Combine your hidden forehead card with the 2 face-up community cards.
- **3-Card Hand Rankings (High → Low)**:
  - **Three of a Kind (Triple)**: All 3 identical (e.g. 7-7-7).
  - **Straight**: 3 consecutive numbers — **wrap-around allowed!** Official order: \`9-10-1\` > \`8-9-10\` > ... > \`1-2-3\` > \`10-1-2\`.
  - **Pair**: 2 identical cards; compare pair rank first, then kicker.
  - **High Card**: Highest card wins.
- **Fold Penalty**: Folding while holding a **Straight** or **Triple** incurs an immediate **-10 chip penalty** paid directly to your opponent! (Optional S2 Finals toggle adds -5 for folding a Pair.)
- **Tie Carryover**: Exact ties carry the entire pot into the next hand.`,
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

    const [comm0, comm1] = state.community;
    const myCard = state.hands[viewerId];
    const oppCard = state.hands[oppId];
    const isShowdown = state.phase === 'showdown' || state.phase === 'ended';
    const isMyTurn = !isSpectator && state.phase === 'betting' && state.currentTurnSeatId === viewerId;

    const oppEval = oppCard != null && comm0 != null ? evaluateHoldemHand(oppCard, comm0, comm1) : null;
    const myEval = myCard != null && comm0 != null ? evaluateHoldemHand(myCard, comm0, comm1) : null;
    const outs = comm0 != null && comm1 != null ? computeBoardOuts(comm0, comm1) : { triples: [], straights: [], pairs: [] };

    const bounds = computeBettingBounds(state, viewerId);
    if (selectedRaiseBy > bounds.maxRaiseBy) selectedRaiseBy = Math.max(1, bounds.maxRaiseBy);
    if (selectedRaiseBy < 1) selectedRaiseBy = 1;

    const res = state.lastResolution;
    const isPenaltyFlash = Boolean(res && res.penaltyAmount > 0);
    const liveOppForTracker = !isShowdown && !isSpectator ? oppCard : null;

    let bannerHtml = '';
    if (res) {
      const wName = res.winnerSeatId ? state.seatsById[res.winnerSeatId]?.name : '';
      let title = '';
      let sub = '';
      if (res.kind === 'fold') {
        const fName = state.seatsById[res.foldedSeatId]?.name || '';
        const fEval = res.evals?.[res.foldedSeatId];
        if (res.penaltyAmount > 0) {
          title =
            lang === 'zh'
              ? `⚠ 强牌弃牌重罚！-${res.penaltyAmount} 筹码`
              : `⚠ STRONG-HAND FOLD PENALTY! -${res.penaltyAmount} CHIPS`;
          sub =
            lang === 'zh'
              ? `${fName} 握有【${I18n.t(fEval?.label)}】弃牌！${wName} 赢得底池 ${res.potAmount} + 罚金 ${res.penaltyAmount}`
              : `${fName} folded ${I18n.t(fEval?.label)}! ${wName} wins ${res.potAmount} pot + ${res.penaltyAmount} penalty`;
        } else {
          title =
            lang === 'zh'
              ? `${fName} 弃牌 · ${wName} 收下 ${res.potAmount} 筹码`
              : `${fName} Folded · ${wName} Wins ${res.potAmount}`;
          sub =
            lang === 'zh'
              ? `揭牌：${meInfo.name} [${res.cards[viewerId]} · ${I18n.t(res.evals?.[viewerId]?.label)}] vs ${oppInfo.name} [${res.cards[oppId]} · ${I18n.t(res.evals?.[oppId]?.label)}]`
              : `Reveal: ${meInfo.name} [${res.cards[viewerId]} · ${I18n.t(res.evals?.[viewerId]?.label)}] vs ${oppInfo.name} [${res.cards[oppId]} · ${I18n.t(res.evals?.[oppId]?.label)}]`;
        }
      } else if (res.isTie) {
        title = res.splitOnAllInTie
          ? lang === 'zh'
            ? `平局分池 · ${I18n.t(res.evals?.[viewerId]?.label)}`
            : `All-In Tie Split · ${I18n.t(res.evals?.[viewerId]?.label)}`
          : lang === 'zh'
          ? `牌型相同！底池 ${res.potAmount} 筹码滚存下一局`
          : `TIE HAND! ${res.potAmount} Chips Carry Over`;
        sub =
          lang === 'zh'
            ? `双方均为【${I18n.t(res.evals?.[viewerId]?.label)}】`
            : `Both held ${I18n.t(res.evals?.[viewerId]?.label)}`;
      } else {
        title =
          lang === 'zh'
            ? `${wName} 摊牌获胜！赢得 ${res.potAmount} 筹码`
            : `${wName} Wins Showdown (+${res.potAmount})`;
        sub =
          lang === 'zh'
            ? `${meInfo.name} [${I18n.t(res.evals?.[viewerId]?.label)}] vs ${oppInfo.name} [${I18n.t(res.evals?.[oppId]?.label)}]`
            : `${meInfo.name} [${I18n.t(res.evals?.[viewerId]?.label)}] vs ${oppInfo.name} [${I18n.t(res.evals?.[oppId]?.label)}]`;
      }

      bannerHtml = `
        <div class="ih-banner ${isPenaltyFlash ? 'is-penalty' : ''}">
          <div style="font-family:var(--tg-font-display);font-size:17.5px;font-weight:800;color:${isPenaltyFlash ? '#ffc2ce' : 'var(--tg-gold-bright)'};">${UI.escapeHtml(title)}</div>
          <div style="font-size:12.5px;color:var(--tg-ink-muted);">${UI.escapeHtml(sub)}</div>
          ${
            state.phase === 'showdown' && !isSpectator
              ? `<button type="button" class="tg-btn tg-btn-gold" id="ih-btn-next" style="margin-top:4px;">${lang === 'zh' ? '进入下一局 →' : 'Deal Next Hand →'}</button>`
              : ''
          }
        </div>
      `;
    }

    const canRaise = isMyTurn && bounds.maxRaiseBy >= 1;
    const raiseTotalAdd = bounds.toCall + selectedRaiseBy;

    container.innerHTML = `
      <div class="ih-arena">
        <div class="ih-shoe-bar">
          <div class="ih-shoe-meta">
            <span>${lang === 'zh' ? `第 ${state.shoeNumber} 副牌靴` : `Shoe #${state.shoeNumber}`}</span>
            <span class="ih-shoe-count">${lang === 'zh' ? `余 ${state.deckRemaining}/40 张` : `${state.deckRemaining}/40 Left`}</span>
            ${
              state.reshuffledThisHand && state.phase === 'betting' && state.actionLog.length === 0
                ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '重新洗牌' : 'RESHUFFLED'}</span>`
                : ''
            }
          </div>
          ${renderShoeTracker(state.revealedHistory, isShowdown ? [] : state.community, liveOppForTracker)}
        </div>

        <section class="ih-table ${isPenaltyFlash ? 'is-penalty-flash' : ''}">
          <!-- Opponent Seat -->
          <div class="ih-seat-row">
            <div class="ih-plate ${state.currentTurnSeatId === oppId && state.phase === 'betting' ? 'is-active' : ''} ${res?.winnerSeatId === oppId ? 'is-winner' : ''}">
              <div class="ih-plate-head">
                <span><span style="color:var(--tg-garnet-bright);margin-right:5px;">${UI.escapeHtml(oppInfo.avatar || '♛')}</span>${UI.escapeHtml(oppInfo.name)}</span>
                ${state.nextFirstActorSeatId === oppId ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '先手' : 'FIRST'}</span>` : ''}
              </div>
              <div class="ih-chip-row">
                <span class="ih-chip-num">${state.chips[oppId]} <small style="font-size:11px;color:var(--tg-ink-muted);">${lang === 'zh' ? '筹码' : 'CHIPS'}</small></span>
                ${state.streetBet[oppId] > 0 ? `<span class="ih-bet-tag">+${state.streetBet[oppId]}</span>` : ''}
              </div>
              <div>${oppEval ? renderHandRankBadge(oppEval, lang) : `<span class="ih-rank-pill">${lang === 'zh' ? '牌型保密' : 'HIDDEN'}</span>`}</div>
            </div>

            ${renderCard({
              value: oppCard,
              hidden: oppCard == null,
              isCommunity: false,
              caption: lang === 'zh' ? '对手额头牌' : 'OPPONENT CARD',
              tag: oppEval ? I18n.t(oppEval.tierName) : 'FOREHEAD',
            })}
          </div>

          <!-- Center Community Pedestal + Pot + Outs Helper -->
          <div class="ih-center-arena">
            <div class="ih-community-stage">
              <div class="ih-community-pedestal">
                ${renderCard({
                  value: comm0,
                  hidden: comm0 == null,
                  isCommunity: true,
                  caption: lang === 'zh' ? '公共牌 I' : 'BOARD I',
                  tag: 'COMMUNITY',
                })}
                ${renderCard({
                  value: comm1,
                  hidden: comm1 == null,
                  isCommunity: true,
                  caption: lang === 'zh' ? '公共牌 II' : 'BOARD II',
                  tag: 'COMMUNITY',
                })}
              </div>

              <div class="ih-pot-box">
                <span style="font-size:10px;font-weight:700;letter-spacing:0.16em;color:var(--tg-ink-muted);">${lang === 'zh' ? '总底池 POT' : 'TOTAL POT'}</span>
                <span class="ih-pot-val">${state.pot}</span>
                ${state.carryoverPot > 0 ? `<span style="font-size:10px;color:var(--tg-cyan);">${lang === 'zh' ? '含滚存' : 'Carryover'}</span>` : ''}
              </div>
            </div>

            <div class="ih-outs-strip">
              <span style="font-weight:700;color:#d8b4fe;">${lang === 'zh' ? '成牌听张参考：' : 'Board Outs:'}</span>
              ${
                outs.triples.length
                  ? `<span class="ih-out-group">${lang === 'zh' ? '三条' : 'Triple'}: ${outs.triples.map((x) => `<span class="ih-out-num is-triple">${x}</span>`).join('')}</span>`
                  : ''
              }
              ${
                outs.straights.length
                  ? `<span class="ih-out-group">${lang === 'zh' ? '顺子' : 'Straight'}: ${outs.straights.map((x) => `<span class="ih-out-num is-straight">${x}</span>`).join('')}</span>`
                  : ''
              }
              ${
                outs.pairs.length
                  ? `<span class="ih-out-group">${lang === 'zh' ? '对子' : 'Pair'}: ${outs.pairs.slice(0, 4).map((x) => `<span class="ih-out-num is-pair">${x}</span>`).join('')}</span>`
                  : ''
              }
            </div>

            ${bannerHtml}
          </div>

          <!-- My Seat -->
          <div class="ih-seat-row">
            ${renderCard({
              value: myCard,
              hidden: myCard == null,
              isCommunity: false,
              caption: isShowdown
                ? lang === 'zh'
                  ? '你的额头牌（已揭晓）'
                  : 'YOUR CARD (REVEALED)'
                : lang === 'zh'
                ? '你的额头牌（保密）'
                : 'YOUR FOREHEAD (HIDDEN)',
              tag: myEval ? I18n.t(myEval.tierName) : 'MYSTERY',
            })}

            <div class="ih-plate ${isMyTurn ? 'is-active' : ''} ${res?.winnerSeatId === viewerId ? 'is-winner' : ''}">
              <div class="ih-plate-head">
                <span><span style="color:var(--tg-gold);margin-right:5px;">${UI.escapeHtml(meInfo.avatar || '♦')}</span>${UI.escapeHtml(meInfo.name)} ${isSpectator ? '' : lang === 'zh' ? '(你)' : '(You)'}</span>
                ${state.nextFirstActorSeatId === viewerId ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '先手' : 'FIRST'}</span>` : ''}
              </div>
              <div class="ih-chip-row">
                <span class="ih-chip-num">${state.chips[viewerId]} <small style="font-size:11px;color:var(--tg-ink-muted);">${lang === 'zh' ? '筹码' : 'CHIPS'}</small></span>
                ${state.streetBet[viewerId] > 0 ? `<span class="ih-bet-tag">+${state.streetBet[viewerId]}</span>` : ''}
              </div>
              <div>${
                myEval
                  ? renderHandRankBadge(myEval, lang)
                  : `<span class="ih-rank-pill">${lang === 'zh' ? '摊牌后揭晓你的牌型' : 'Revealed at Showdown'}</span>`
              }</div>
            </div>
          </div>
        </section>

        <!-- Controls -->
        <section class="ih-controls">
          <div class="ih-rank-legend">
            <span>${lang === 'zh' ? '牌型阶梯：三条 > 顺子 (9-10-1 最大 · 10-1-2 最小) > 对子 > 散牌' : 'Ranks: Triple > Straight (9-10-1 Top · 10-1-2 Low) > Pair > High Card'}</span>
          </div>

          ${
            isMyTurn
              ? `
                <div class="ih-warn-bar">
                  <span>⚠</span>
                  <span>${
                    state.options.pairPenalty
                      ? lang === 'zh'
                        ? '弃牌惩罚：握有【顺子/三条】弃牌罚 10 筹码，握有【对子】弃牌罚 5 筹码！'
                        : 'FOLD PENALTY: Straight/Triple = -10 chips · Pair = -5 chips!'
                      : lang === 'zh'
                      ? '弃牌惩罚：若你的暗牌与公共牌组成【顺子】或【三条】却弃牌，将立即额外罚给对手 10 枚筹码！'
                      : 'FOLD PENALTY: Folding with a Straight or Triple pays an immediate -10 chip penalty!'
                  }</span>
                </div>

                ${
                  canRaise
                    ? `
                      <div class="ih-slider-row">
                        <span style="font-size:12px;color:var(--tg-ink-muted);">${bounds.canCheck ? (lang === 'zh' ? '下注额' : 'Bet') : (lang === 'zh' ? '加注额' : 'Raise +')}</span>
                        <input type="range" class="ih-slider" id="ih-raise-slider" min="1" max="${bounds.maxRaiseBy}" value="${selectedRaiseBy}" />
                        <span class="tg-dial-value" id="ih-raise-val" style="font-size:18px;min-width:44px;">+${selectedRaiseBy}</span>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          ${[1, 3, 5]
                            .filter((v) => v <= bounds.maxRaiseBy)
                            .map((v) => `<button type="button" class="tg-btn tg-btn-sm" data-preset="${v}">+${v}</button>`)
                            .join('')}
                          <button type="button" class="tg-btn tg-btn-sm tg-btn-garnet" data-preset="${bounds.maxRaiseBy}">${lang === 'zh' ? '全下' : 'MAX'}</button>
                        </div>
                      </div>
                    `
                    : ''
                }

                <div class="ih-action-grid">
                  ${
                    bounds.canCheck
                      ? `<button type="button" class="tg-btn tg-btn-cyan ih-act-btn" id="ih-btn-check">
                          <span>${lang === 'zh' ? '过牌 CHECK' : 'CHECK'}</span>
                          <small>0</small>
                        </button>`
                      : `<button type="button" class="tg-btn tg-btn-cyan ih-act-btn" id="ih-btn-call">
                          <span>${lang === 'zh' ? '跟注 CALL' : 'CALL'}</span>
                          <small>+${bounds.toCall}</small>
                        </button>`
                  }
                  <button type="button" class="tg-btn tg-btn-gold ih-act-btn" id="ih-btn-raise" ${canRaise ? '' : 'disabled'}>
                    <span id="ih-raise-label">${bounds.canCheck ? (lang === 'zh' ? '下注 BET' : 'BET') : (lang === 'zh' ? '加注 RAISE' : 'RAISE')}</span>
                    <small id="ih-raise-sub">${canRaise ? `+${raiseTotalAdd}` : '--'}</small>
                  </button>
                  <button type="button" class="tg-btn tg-btn-garnet ih-act-btn" id="ih-btn-allin" ${canRaise ? '' : 'disabled'}>
                    <span>${lang === 'zh' ? '全下 ALL-IN' : 'ALL-IN'}</span>
                    <small>${canRaise ? `+${bounds.maxAdd}` : '--'}</small>
                  </button>
                  <button type="button" class="tg-btn tg-btn-ghost ih-act-btn" id="ih-btn-fold" style="border-color:rgba(255,46,84,0.45);color:#ff99ab;">
                    <span>${lang === 'zh' ? '弃牌 FOLD' : 'FOLD'}</span>
                    <small>${lang === 'zh' ? '顺/三罚-10' : 'Str/Trp -10'}</small>
                  </button>
                </div>
              `
              : `<div style="text-align:center;padding:12px;font-size:13.5px;color:var(--tg-ink-muted);">${
                  state.phase === 'showdown'
                    ? lang === 'zh'
                      ? '本局已结算，点击上方按钮进入下一局。'
                      : 'Hand settled. Click above to deal the next hand.'
                    : state.phase === 'ended'
                    ? lang === 'zh'
                      ? '死亡对决已分出胜负！'
                      : 'Death Match concluded!'
                    : lang === 'zh'
                    ? `等待 ${UI.escapeHtml(state.seatsById[state.currentTurnSeatId]?.name || '')} 决策...`
                    : `Waiting for ${UI.escapeHtml(state.seatsById[state.currentTurnSeatId]?.name || '')}...`
                }</div>`
          }
        </section>
      </div>
    `;

    container.querySelector('#ih-btn-next')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_HAND' });
    });

    const slider = container.querySelector('#ih-raise-slider');
    const valEl = container.querySelector('#ih-raise-val');
    const subEl = container.querySelector('#ih-raise-sub');

    const syncRaise = (v) => {
      selectedRaiseBy = Math.max(1, Math.min(bounds.maxRaiseBy, Math.floor(Number(v) || 1)));
      if (slider) slider.value = String(selectedRaiseBy);
      if (valEl) valEl.textContent = `+${selectedRaiseBy}`;
      if (subEl) subEl.textContent = `+${bounds.toCall + selectedRaiseBy}`;
    };

    slider?.addEventListener('input', (e) => syncRaise(e.target.value));
    container.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        syncRaise(btn.dataset.preset);
      });
    });

    container.querySelector('#ih-btn-check')?.addEventListener('click', () => dispatch({ type: 'CHECK' }));
    container.querySelector('#ih-btn-call')?.addEventListener('click', () => dispatch({ type: 'CALL' }));
    container.querySelector('#ih-btn-raise')?.addEventListener('click', () =>
      dispatch({ type: 'RAISE', payload: { raiseBy: selectedRaiseBy } })
    );
    container.querySelector('#ih-btn-allin')?.addEventListener('click', () => {
      if (bounds.maxRaiseBy >= 1) dispatch({ type: 'RAISE', payload: { raiseBy: bounds.maxRaiseBy } });
    });
    container.querySelector('#ih-btn-fold')?.addEventListener('click', () => dispatch({ type: 'FOLD' }));
  },
});

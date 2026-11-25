/**
 * Indian Hold'em (印第安德州扑克) — Persistent 3D Cards & Motion-Polished Broadcast UI
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import {
  GameRules,
  evaluateHoldemHand,
  computeBoardOuts,
  computeBettingBounds,
} from './rules.js';

let selectedRaiseBy = 1;
let lastHandledEventKey = null;
let prevNums = { pot: null, myChips: null, oppChips: null, round: null };

function patchCard(cardRefs, { value, hidden, caption, tag, backTag }) {
  if (caption != null) cardRefs.caption.textContent = caption;
  cardRefs.backTag.textContent = backTag;
  if (value != null) {
    const txt = String(value);
    cardRefs.tl.textContent = txt;
    cardRefs.br.textContent = txt;
    cardRefs.num.textContent = txt;
    cardRefs.tag.textContent = tag || '';
  }
  cardRefs.root.classList.toggle('is-flipped', Boolean(hidden));
}

function mountSkeleton(container) {
  let trackerHtml = '';
  for (let n = 1; n <= 10; n++) {
    trackerHtml += `
      <div class="ih-tracker-cell" data-track-n="${n}">
        <span>${n}</span>
        <span class="ih-tracker-pips">
          <span class="ih-pip"></span><span class="ih-pip"></span>
          <span class="ih-pip"></span><span class="ih-pip"></span>
        </span>
      </div>
    `;
  }

  const cardTpl = (prefix, isComm) => `
    <div class="ih-card-wrap">
      <span class="ih-card-caption" data-ref="${prefix}-caption"></span>
      <div class="tg-card-3d ih-card-3d ${isComm ? 'is-community' : ''} is-flipped" data-ref="${prefix}-card">
        <div class="tg-card-3d-inner">
          <div class="tg-card-face ih-card-front ${isComm ? 'is-comm-card' : ''}">
            <span class="ih-card-corner tl" data-ref="${prefix}-tl">?</span>
            <div class="ih-card-num" data-ref="${prefix}-num">?</div>
            <div class="ih-card-tag" data-ref="${prefix}-tag"></div>
            <span class="ih-card-corner br" data-ref="${prefix}-br">?</span>
          </div>
          <div class="tg-card-face ih-card-back">
            <div class="ih-back-q">?</div>
            <div style="font-size:9px;letter-spacing:0.16em;color:rgba(255,210,220,0.82);" data-ref="${prefix}-back-tag"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="ih-arena">
      <div class="ih-shoe-bar">
        <div class="ih-shoe-meta">
          <span data-ref="shoe-num"></span>
          <span class="ih-shoe-count" data-ref="shoe-count"></span>
          <span class="tg-badge tg-badge-gold" data-ref="fresh-badge" hidden></span>
        </div>
        <div class="ih-tracker-grid">${trackerHtml}</div>
      </div>

      <section class="ih-table" data-ref="table">
        <!-- Opponent Seat -->
        <div class="ih-seat-row">
          <div class="ih-plate" data-ref="opp-plate">
            <div class="ih-plate-head">
              <span><span style="color:var(--tg-garnet-bright);margin-right:5px;" data-ref="opp-avatar"></span><span data-ref="opp-name"></span></span>
              <span class="tg-badge tg-badge-gold" data-ref="opp-first" hidden></span>
            </div>
            <div class="ih-chip-row">
              <span class="ih-delta-anchor" data-ref="opp-delta">
                <span class="ih-chip-num" data-ref="opp-chips">0</span>
                <small style="font-size:11px;color:var(--tg-ink-muted);" data-ref="opp-chips-unit"></small>
              </span>
              <span class="ih-bet-tag" data-ref="opp-bet" hidden></span>
            </div>
            <div><span class="ih-rank-pill" data-ref="opp-rank"></span></div>
          </div>
          ${cardTpl('opp', false)}
        </div>

        <!-- Center Community Pedestal + Pot + Outs Helper -->
        <div class="ih-center-arena">
          <div class="ih-community-stage">
            <div class="ih-community-pedestal">
              ${cardTpl('c0', true)}
              ${cardTpl('c1', true)}
            </div>
            <div class="ih-pot-box" data-ref="pot-box">
              <span style="font-size:10px;font-weight:700;letter-spacing:0.14em;color:var(--tg-ink-muted);" data-ref="pot-label"></span>
              <span class="ih-delta-anchor" data-ref="pot-delta">
                <span class="ih-pot-val" data-ref="pot-val">0</span>
              </span>
              <span style="font-size:10px;color:var(--tg-cyan-ink);" data-ref="carry-label" hidden></span>
            </div>
          </div>

          <div class="ih-outs-strip" data-ref="outs-strip"></div>

          <div class="ih-banner" data-ref="banner" hidden>
            <div style="font-family:var(--tg-font-display);font-size:17.5px;font-weight:800;" data-ref="banner-title"></div>
            <div style="font-size:12.5px;color:var(--tg-ink-muted);" data-ref="banner-sub"></div>
            <button type="button" class="tg-btn tg-btn-gold" data-ref="btn-next" style="margin-top:4px;" hidden></button>
          </div>
        </div>

        <!-- My Seat -->
        <div class="ih-seat-row">
          ${cardTpl('my', false)}
          <div class="ih-plate" data-ref="my-plate">
            <div class="ih-plate-head">
              <span><span style="color:var(--tg-gold);margin-right:5px;" data-ref="my-avatar"></span><span data-ref="my-name"></span></span>
              <span class="tg-badge tg-badge-gold" data-ref="my-first" hidden></span>
            </div>
            <div class="ih-chip-row">
              <span class="ih-delta-anchor" data-ref="my-delta">
                <span class="ih-chip-num" data-ref="my-chips">0</span>
                <small style="font-size:11px;color:var(--tg-ink-muted);" data-ref="my-chips-unit"></small>
              </span>
              <span class="ih-bet-tag" data-ref="my-bet" hidden></span>
            </div>
            <div><span class="ih-rank-pill" data-ref="my-rank"></span></div>
          </div>
        </div>
      </section>

      <!-- Controls -->
      <section class="ih-controls">
        <div class="ih-rank-legend" data-ref="legend"></div>

        <div data-ref="turn-controls" hidden>
          <div class="ih-warn-bar" data-ref="warn-bar"></div>
          <div class="ih-slider-row" data-ref="slider-row" style="margin-top:10px;">
            <span style="font-size:12px;color:var(--tg-ink-muted);" data-ref="slider-label"></span>
            <input type="range" class="ih-slider" data-ref="raise-slider" min="1" max="10" value="1" />
            <span class="tg-dial-value" data-ref="raise-val" style="font-size:18px;min-width:44px;">+1</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;" data-ref="quick-presets"></div>
          </div>
          <div class="ih-action-grid" style="margin-top:10px;">
            <button type="button" class="tg-btn tg-btn-cyan ih-act-btn" data-ref="btn-pc">
              <span data-ref="btn-pc-title"></span>
              <small data-ref="btn-pc-sub"></small>
            </button>
            <button type="button" class="tg-btn tg-btn-gold ih-act-btn" data-ref="btn-raise">
              <span data-ref="btn-raise-title"></span>
              <small data-ref="btn-raise-sub"></small>
            </button>
            <button type="button" class="tg-btn tg-btn-garnet ih-act-btn" data-ref="btn-allin">
              <span data-ref="btn-allin-title"></span>
              <small data-ref="btn-allin-sub"></small>
            </button>
            <button type="button" class="tg-btn tg-btn-ghost ih-act-btn ih-btn-fold-outline" data-ref="btn-fold">
              <span data-ref="btn-fold-title"></span>
              <small data-ref="btn-fold-sub"></small>
            </button>
          </div>
        </div>

        <div style="text-align:center;padding:12px;font-size:13.5px;color:var(--tg-ink-muted);" data-ref="waiting" hidden></div>
      </section>
    </div>
  `;

  const q = (n) => container.querySelector(`[data-ref="${n}"]`);
  const cardRefs = (p) => ({
    caption: q(`${p}-caption`),
    root: q(`${p}-card`),
    tl: q(`${p}-tl`),
    br: q(`${p}-br`),
    num: q(`${p}-num`),
    tag: q(`${p}-tag`),
    backTag: q(`${p}-back-tag`),
  });

  const refs = {
    table: q('table'),
    shoeNum: q('shoe-num'),
    shoeCount: q('shoe-count'),
    freshBadge: q('fresh-badge'),
    trackerCells: Array.from(container.querySelectorAll('[data-track-n]')),
    oppPlate: q('opp-plate'),
    oppAvatar: q('opp-avatar'),
    oppName: q('opp-name'),
    oppFirst: q('opp-first'),
    oppChips: q('opp-chips'),
    oppChipsUnit: q('opp-chips-unit'),
    oppDelta: q('opp-delta'),
    oppBet: q('opp-bet'),
    oppRank: q('opp-rank'),
    oppCard: cardRefs('opp'),
    c0Card: cardRefs('c0'),
    c1Card: cardRefs('c1'),
    myCard: cardRefs('my'),
    potBox: q('pot-box'),
    potLabel: q('pot-label'),
    potVal: q('pot-val'),
    potDelta: q('pot-delta'),
    carryLabel: q('carry-label'),
    outsStrip: q('outs-strip'),
    banner: q('banner'),
    bannerTitle: q('banner-title'),
    bannerSub: q('banner-sub'),
    btnNext: q('btn-next'),
    myPlate: q('my-plate'),
    myAvatar: q('my-avatar'),
    myName: q('my-name'),
    myFirst: q('my-first'),
    myChips: q('my-chips'),
    myChipsUnit: q('my-chips-unit'),
    myDelta: q('my-delta'),
    myBet: q('my-bet'),
    myRank: q('my-rank'),
    legend: q('legend'),
    turnControls: q('turn-controls'),
    waiting: q('waiting'),
    warnBar: q('warn-bar'),
    sliderRow: q('slider-row'),
    sliderLabel: q('slider-label'),
    raiseSlider: q('raise-slider'),
    raiseVal: q('raise-val'),
    quickPresets: q('quick-presets'),
    btnPc: q('btn-pc'),
    btnPcTitle: q('btn-pc-title'),
    btnPcSub: q('btn-pc-sub'),
    btnRaise: q('btn-raise'),
    btnRaiseTitle: q('btn-raise-title'),
    btnRaiseSub: q('btn-raise-sub'),
    btnAllIn: q('btn-allin'),
    btnAllInTitle: q('btn-allin-title'),
    btnAllInSub: q('btn-allin-sub'),
    btnFold: q('btn-fold'),
    btnFoldTitle: q('btn-fold-title'),
    btnFoldSub: q('btn-fold-sub'),
    latestCtx: null,
    latestBounds: null,
    bannerOpen: false,
    flopTimers: [],
  };

  const syncRaise = (v) => {
    const b = refs.latestBounds;
    if (!b) return;
    selectedRaiseBy = Math.max(1, Math.min(Math.max(1, b.maxRaiseBy), Math.floor(Number(v) || 1)));
    refs.raiseSlider.value = String(selectedRaiseBy);
    refs.raiseVal.textContent = `+${selectedRaiseBy}`;
    refs.btnRaiseSub.textContent = b.maxRaiseBy >= 1 ? `+${b.toCall + selectedRaiseBy}` : '--';
  };
  refs.syncRaise = syncRaise;

  refs.raiseSlider.addEventListener('input', (e) => syncRaise(e.target.value));
  refs.quickPresets.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    SFX.play('click');
    syncRaise(btn.dataset.preset);
  });

  refs.btnNext.addEventListener('click', () => {
    SFX.play('click');
    refs.latestCtx?.dispatch({ type: 'NEXT_HAND' });
  });
  refs.btnPc.addEventListener('click', () => {
    const b = refs.latestBounds;
    if (!b) return;
    Motion.pulseConfirm(refs.potBox, { tone: 'cyan' });
    refs.latestCtx?.dispatch({ type: b.canCheck ? 'CHECK' : 'CALL' });
  });
  refs.btnRaise.addEventListener('click', () => {
    Motion.pulseConfirm(refs.potBox, { tone: 'gold' });
    refs.latestCtx?.dispatch({ type: 'RAISE', payload: { raiseBy: selectedRaiseBy } });
  });
  refs.btnAllIn.addEventListener('click', () => {
    const b = refs.latestBounds;
    if (b && b.maxRaiseBy >= 1) {
      Motion.pulseConfirm(refs.potBox, { tone: 'gold' });
      refs.latestCtx?.dispatch({ type: 'RAISE', payload: { raiseBy: b.maxRaiseBy } });
    }
  });
  refs.btnFold.addEventListener('click', () => {
    refs.latestCtx?.dispatch({ type: 'FOLD' });
  });

  container._ihRefs = refs;
  return refs;
}

function handleEventFeedback(lastEvent, sfx, refs) {
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
      Motion.pulseConfirm(refs.potBox, { tone: 'gold' });
      break;
    case 'ALL_IN':
      sfx.play('clash');
      Motion.pulseConfirm(refs.potBox, { tone: 'gold' });
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
      Motion.nudgeError(refs.table, { intensity: 'impact' });
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
    const { state, activeSeatId, mySeatId, isSpectator, lang, lastEvent, sfx } = ctx;
    if (!state) return;

    const refs = container._ihRefs && container.contains(container._ihRefs.table)
      ? container._ihRefs
      : mountSkeleton(container);

    const viewerId = isSpectator ? state.seatIds[0] : activeSeatId || mySeatId || state.seatIds[0];
    const oppId = state.seatIds[0] === viewerId ? state.seatIds[1] : state.seatIds[0];
    const meInfo = state.seatsById[viewerId] || { name: 'P1', avatar: '♦' };
    const oppInfo = state.seatsById[oppId] || { name: 'P2', avatar: '♛' };

    const [comm0, comm1] = state.community;
    const myCard = state.hands[viewerId];
    const oppCard = state.hands[oppId];
    const isShowdown = state.phase === 'showdown' || state.phase === 'ended';
    const isMyTurn = !isSpectator && state.phase === 'betting' && state.currentTurnSeatId === viewerId;
    const isNewRound = prevNums.round !== state.round;

    const bounds = computeBettingBounds(state, viewerId);
    refs.latestCtx = ctx;
    refs.latestBounds = bounds;
    if (isNewRound) selectedRaiseBy = 1;
    if (selectedRaiseBy > bounds.maxRaiseBy) selectedRaiseBy = Math.max(1, bounds.maxRaiseBy);
    if (selectedRaiseBy < 1) selectedRaiseBy = 1;

    handleEventFeedback(lastEvent, sfx, refs);

    // 1. Shoe tracker patched in place
    refs.shoeNum.textContent = lang === 'zh' ? `第 ${state.shoeNumber} 副牌靴` : `Shoe #${state.shoeNumber}`;
    refs.shoeCount.textContent = lang === 'zh' ? `余 ${state.deckRemaining}/40 张` : `${state.deckRemaining}/40 Left`;
    const showFresh = state.reshuffledThisHand && state.phase === 'betting' && state.actionLog.length === 0;
    refs.freshBadge.hidden = !showFresh;
    refs.freshBadge.textContent = lang === 'zh' ? '重新洗牌' : 'Reshuffled';

    const spent = Array(11).fill(0);
    for (const c of state.revealedHistory || []) if (c >= 1 && c <= 10) spent[c] += 1;
    const boardCounts = Array(11).fill(0);
    if (!isShowdown) for (const c of state.community || []) if (c >= 1 && c <= 10) boardCounts[c] += 1;
    const liveOpp = !isShowdown && !isSpectator ? oppCard : null;

    for (const cell of refs.trackerCells) {
      const n = Number(cell.dataset.trackN);
      const s = spent[n];
      const b = boardCounts[n];
      const o = liveOpp === n ? 1 : 0;
      cell.classList.toggle('is-exhausted', s + b + o >= 4);
      cell.querySelectorAll('.ih-pip').forEach((pip, k) => {
        pip.classList.toggle('is-spent', k < s);
        pip.classList.toggle('is-live-board', !(k < s) && k < s + b);
        pip.classList.toggle('is-live-opp', !(k < s + b) && k < s + b + o);
      });
    }

    // 2. Plates, hand ranks & animated numbers
    const oppEval = oppCard != null && comm0 != null ? evaluateHoldemHand(oppCard, comm0, comm1) : null;
    const myEval = myCard != null && comm0 != null ? evaluateHoldemHand(myCard, comm0, comm1) : null;
    const res = state.lastResolution;

    refs.table.classList.toggle('is-penalty-rim', Boolean(res && res.penaltyAmount > 0));

    refs.oppPlate.classList.toggle('is-active', state.currentTurnSeatId === oppId && state.phase === 'betting');
    refs.oppPlate.classList.toggle('is-winner', res?.winnerSeatId === oppId);
    refs.oppAvatar.textContent = oppInfo.avatar || '♛';
    refs.oppName.textContent = oppInfo.name;
    refs.oppFirst.hidden = state.nextFirstActorSeatId !== oppId;
    refs.oppFirst.textContent = lang === 'zh' ? '先手' : 'First';
    refs.oppChipsUnit.textContent = lang === 'zh' ? '筹码' : 'chips';
    refs.oppBet.hidden = state.streetBet[oppId] <= 0;
    refs.oppBet.textContent = `+${state.streetBet[oppId]}`;
    refs.oppRank.className = `ih-rank-pill ${oppEval ? `tier-${oppEval.tier}` : ''}`.trim();
    refs.oppRank.textContent = oppEval ? I18n.t(oppEval.label) : lang === 'zh' ? '牌型保密' : 'Hidden';

    refs.myPlate.classList.toggle('is-active', isMyTurn);
    refs.myPlate.classList.toggle('is-winner', res?.winnerSeatId === viewerId);
    refs.myAvatar.textContent = meInfo.avatar || '♦';
    refs.myName.textContent = `${meInfo.name}${isSpectator ? '' : lang === 'zh' ? ' (你)' : ' (You)'}`;
    refs.myFirst.hidden = state.nextFirstActorSeatId !== viewerId;
    refs.myFirst.textContent = lang === 'zh' ? '先手' : 'First';
    refs.myChipsUnit.textContent = lang === 'zh' ? '筹码' : 'chips';
    refs.myBet.hidden = state.streetBet[viewerId] <= 0;
    refs.myBet.textContent = `+${state.streetBet[viewerId]}`;
    refs.myRank.className = `ih-rank-pill ${myEval ? `tier-${myEval.tier}` : ''}`.trim();
    refs.myRank.textContent = myEval ? I18n.t(myEval.label) : lang === 'zh' ? '摊牌后揭晓你的牌型' : 'Revealed at showdown';

    refs.potLabel.textContent = lang === 'zh' ? '总底池' : 'Total Pot';
    refs.carryLabel.hidden = state.carryoverPot <= 0;
    refs.carryLabel.textContent = lang === 'zh' ? '含滚存' : 'Carryover';

    const curPot = state.pot;
    const curMy = state.chips[viewerId];
    const curOpp = state.chips[oppId];
    if (prevNums.pot === null || (prevNums.round !== null && state.round < prevNums.round)) {
      refs.potVal.textContent = String(curPot);
      refs.myChips.textContent = String(curMy);
      refs.oppChips.textContent = String(curOpp);
    } else {
      if (curPot !== prevNums.pot) Motion.animateNumber(refs.potVal, prevNums.pot, curPot, { duration: 300, deltaEl: refs.potDelta });
      if (curMy !== prevNums.myChips) Motion.animateNumber(refs.myChips, prevNums.myChips, curMy, { duration: 320, deltaEl: refs.myDelta });
      if (curOpp !== prevNums.oppChips) Motion.animateNumber(refs.oppChips, prevNums.oppChips, curOpp, { duration: 320, deltaEl: refs.oppDelta });
    }
    prevNums = { pot: curPot, myChips: curMy, oppChips: curOpp, round: state.round };

    // 3. 3D Flippable Cards (with 70ms staggered flop reveal on new hand!)
    const backTag = lang === 'zh' ? '额头暗牌' : 'Hidden';
    if (isNewRound && !Motion.reduced() && comm0 != null && comm1 != null) {
      refs.flopTimers.forEach(clearTimeout);
      refs.flopTimers = [];
      refs.c0Card.root.classList.add('is-flipped');
      refs.c1Card.root.classList.add('is-flipped');
      patchCard(refs.c0Card, { value: comm0, hidden: true, caption: lang === 'zh' ? '公共牌 I' : 'Board I', tag: 'COMMUNITY', backTag });
      patchCard(refs.c1Card, { value: comm1, hidden: true, caption: lang === 'zh' ? '公共牌 II' : 'Board II', tag: 'COMMUNITY', backTag });
      refs.flopTimers.push(
        setTimeout(() => refs.c0Card.root.classList.remove('is-flipped'), 40),
        setTimeout(() => refs.c1Card.root.classList.remove('is-flipped'), 110)
      );
    } else {
      patchCard(refs.c0Card, { value: comm0, hidden: comm0 == null, caption: lang === 'zh' ? '公共牌 I' : 'Board I', tag: 'COMMUNITY', backTag });
      patchCard(refs.c1Card, { value: comm1, hidden: comm1 == null, caption: lang === 'zh' ? '公共牌 II' : 'Board II', tag: 'COMMUNITY', backTag });
    }

    patchCard(refs.oppCard, {
      value: oppCard,
      hidden: oppCard == null,
      caption: lang === 'zh' ? '对手额头牌' : 'Opponent Card',
      tag: oppEval ? I18n.t(oppEval.tierName) : 'FOREHEAD',
      backTag,
    });

    patchCard(refs.myCard, {
      value: myCard,
      hidden: myCard == null,
      caption: isShowdown
        ? lang === 'zh' ? '你的额头牌（已揭晓）' : 'Your Card (Revealed)'
        : lang === 'zh' ? '你的额头牌（保密）' : 'Your Forehead (Hidden)',
      tag: myEval ? I18n.t(myEval.tierName) : 'MYSTERY',
      backTag,
    });

    // 4. Board outs helper
    const outs = comm0 != null && comm1 != null ? computeBoardOuts(comm0, comm1) : { triples: [], straights: [], pairs: [] };
    refs.outsStrip.innerHTML =
      `<span style="font-weight:700;color:var(--tg-violet);">${lang === 'zh' ? '成牌听张参考：' : 'Board Outs:'}</span>` +
      (outs.triples.length
        ? `<span class="ih-out-group">${lang === 'zh' ? '三条' : 'Triple'}: ${outs.triples.map((x) => `<span class="ih-out-num is-triple">${x}</span>`).join('')}</span>`
        : '') +
      (outs.straights.length
        ? `<span class="ih-out-group">${lang === 'zh' ? '顺子' : 'Straight'}: ${outs.straights.map((x) => `<span class="ih-out-num is-straight">${x}</span>`).join('')}</span>`
        : '') +
      (outs.pairs.length
        ? `<span class="ih-out-group">${lang === 'zh' ? '对子' : 'Pair'}: ${outs.pairs.slice(0, 4).map((x) => `<span class="ih-out-num is-pair">${x}</span>`).join('')}</span>`
        : '');

    // 5. Resolution Banner
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
              ? `强牌弃牌重罚 · -${res.penaltyAmount} 筹码`
              : `Strong-Hand Fold Penalty · -${res.penaltyAmount} Chips`;
          sub =
            lang === 'zh'
              ? `${fName} 握有【${I18n.t(fEval?.label)}】弃牌，${wName} 赢得底池 ${res.potAmount} + 罚金 ${res.penaltyAmount}`
              : `${fName} folded ${I18n.t(fEval?.label)} — ${wName} wins ${res.potAmount} + ${res.penaltyAmount} penalty`;
        } else {
          title =
            lang === 'zh'
              ? `${fName} 弃牌 · ${wName} 收下 ${res.potAmount} 筹码`
              : `${fName} Folded · ${wName} Wins ${res.potAmount}`;
          sub = `${meInfo.name} [${res.cards[viewerId]} · ${I18n.t(res.evals?.[viewerId]?.label)}] vs ${oppInfo.name} [${res.cards[oppId]} · ${I18n.t(res.evals?.[oppId]?.label)}]`;
        }
      } else if (res.isTie) {
        title = res.splitOnAllInTie
          ? lang === 'zh' ? `平局分池 · ${I18n.t(res.evals?.[viewerId]?.label)}` : `All-In Tie Split · ${I18n.t(res.evals?.[viewerId]?.label)}`
          : lang === 'zh' ? `牌型相同 · 底池 ${res.potAmount} 筹码滚存` : `Tie Hand · ${res.potAmount} Chips Carry Over`;
        sub = lang === 'zh' ? `双方均为【${I18n.t(res.evals?.[viewerId]?.label)}】` : `Both held ${I18n.t(res.evals?.[viewerId]?.label)}`;
      } else {
        title =
          lang === 'zh'
            ? `${wName} 摊牌获胜 · +${res.potAmount} 筹码`
            : `${wName} Wins Showdown (+${res.potAmount})`;
        sub = `${meInfo.name} [${I18n.t(res.evals?.[viewerId]?.label)}] vs ${oppInfo.name} [${I18n.t(res.evals?.[oppId]?.label)}]`;
      }

      const isPen = Boolean(res.penaltyAmount > 0);
      refs.banner.classList.toggle('is-penalty', isPen);
      refs.bannerTitle.style.color = isPen ? 'var(--tg-garnet-ink)' : 'var(--tg-gold-bright)';
      refs.bannerTitle.textContent = title;
      refs.bannerSub.textContent = sub;
      refs.btnNext.hidden = !(state.phase === 'showdown' && !isSpectator);
      refs.btnNext.textContent = lang === 'zh' ? '进入下一局' : 'Deal Next Hand';

      if (!refs.bannerOpen) {
        refs.bannerOpen = true;
        Motion.transitionPresence(refs.banner, true, { preset: 'pill' });
      }
    } else if (refs.bannerOpen) {
      refs.bannerOpen = false;
      Motion.transitionPresence(refs.banner, false, { preset: 'pill' });
    }

    // 6. Controls patched in place
    refs.legend.textContent =
      lang === 'zh'
        ? '牌型阶梯：三条 > 顺子 (9-10-1 最大 · 10-1-2 最小) > 对子 > 散牌'
        : 'Ranks: Triple > Straight (9-10-1 Top · 10-1-2 Low) > Pair > High Card';

    if (isMyTurn) {
      refs.turnControls.hidden = false;
      refs.waiting.hidden = true;
      refs.warnBar.textContent = state.options.pairPenalty
        ? lang === 'zh'
          ? '弃牌惩罚：握有顺子/三条弃牌罚 10 筹码，握有对子弃牌罚 5 筹码。'
          : 'Fold Penalty: Straight/Triple = -10 chips · Pair = -5 chips.'
        : lang === 'zh'
        ? '弃牌惩罚：若暗牌与公共牌组成顺子或三条却弃牌，立即额外罚给对手 10 枚筹码。'
        : 'Fold Penalty: Folding with a Straight or Triple pays an immediate -10 chip penalty.';

      const canRaise = bounds.maxRaiseBy >= 1;
      refs.sliderRow.hidden = !canRaise;
      if (canRaise) {
        refs.sliderLabel.textContent = bounds.canCheck
          ? lang === 'zh' ? '下注额' : 'Bet'
          : lang === 'zh' ? '加注额' : 'Raise +';
        refs.raiseSlider.max = String(bounds.maxRaiseBy);
        const presets = [1, 3, 5].filter((v) => v <= bounds.maxRaiseBy);
        refs.quickPresets.innerHTML =
          presets.map((v) => `<button type="button" class="tg-btn tg-btn-sm" data-preset="${v}">+${v}</button>`).join('') +
          `<button type="button" class="tg-btn tg-btn-sm tg-btn-garnet" data-preset="${bounds.maxRaiseBy}">${lang === 'zh' ? '全下' : 'Max'}</button>`;
      }

      refs.btnPcTitle.textContent = bounds.canCheck
        ? lang === 'zh' ? '过牌' : 'Check'
        : lang === 'zh' ? '跟注' : 'Call';
      refs.btnPcSub.textContent = bounds.canCheck ? '0' : `+${bounds.toCall}`;
      refs.btnRaise.disabled = !canRaise;
      refs.btnRaiseTitle.textContent = bounds.canCheck
        ? lang === 'zh' ? '下注' : 'Bet'
        : lang === 'zh' ? '加注' : 'Raise';
      refs.btnAllIn.disabled = !canRaise;
      refs.btnAllInTitle.textContent = lang === 'zh' ? '全下' : 'All-In';
      refs.btnAllInSub.textContent = canRaise ? `+${bounds.maxAdd}` : '--';
      refs.btnFoldTitle.textContent = lang === 'zh' ? '弃牌' : 'Fold';
      refs.btnFoldSub.textContent = lang === 'zh' ? '顺/三罚 -10' : 'Str/Trp -10';
      refs.syncRaise(selectedRaiseBy);
    } else {
      refs.turnControls.hidden = true;
      refs.waiting.hidden = false;
      refs.waiting.textContent =
        state.phase === 'showdown'
          ? lang === 'zh' ? '本局已结算，点击上方按钮进入下一局。' : 'Hand settled. Click above for the next hand.'
          : state.phase === 'ended'
          ? lang === 'zh' ? '死亡对决已分出胜负。' : 'Death Match concluded.'
          : lang === 'zh'
          ? `等待 ${state.seatsById[state.currentTurnSeatId]?.name || ''} 决策…`
          : `Waiting for ${state.seatsById[state.currentTurnSeatId]?.name || ''}…`;
    }
  },
});

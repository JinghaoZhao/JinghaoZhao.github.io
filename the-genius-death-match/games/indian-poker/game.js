/**
 * Indian Poker (印第安扑克) — Persistent DOM, 3D Flip & Motion-Polished Broadcast UI
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import { GameRules, computeBettingBounds } from './rules.js';

let selectedRaiseBy = 1;
let lastHandledEventKey = null;
let prevNums = { pot: null, myChips: null, oppChips: null, round: null };

function updateChipTower(el, chips) {
  if (!el) return;
  const target = Math.min(7, Math.max(0, Math.ceil(chips / 5)));
  while (el.children.length < target) {
    const d = document.createElement('span');
    d.className = 'ip-mini-disc';
    el.appendChild(d);
  }
  while (el.children.length > target) {
    el.lastChild.remove();
  }
}

function patchCard3D(cardRefs, { value, hidden, label, isShowdown, mirrorTag }) {
  cardRefs.caption.textContent = label;
  cardRefs.mirrorTag.textContent = mirrorTag;
  const isTen = value === 10;
  if (value != null) {
    const txt = String(value);
    cardRefs.cornerTl.textContent = txt;
    cardRefs.cornerBr.textContent = txt;
    cardRefs.bigNum.textContent = txt;
    cardRefs.sub.textContent = isTen ? 'PENALTY X' : isShowdown ? 'REVEALED' : 'GENIUS';
    cardRefs.front.classList.toggle('is-card-ten', isTen);
  }
  // Toggle .is-flipped in place so the CSS 3D rotateY(180deg -> 0deg) actually plays!
  cardRefs.root.classList.toggle('is-flipped', Boolean(hidden));
}

function mountSkeleton(container) {
  let trackerCellsHtml = '';
  for (let n = 1; n <= 10; n++) {
    trackerCellsHtml += `
      <div class="ip-tracker-cell ${n === 10 ? 'is-ten' : ''}" data-track-n="${n}" title="${n}">
        <span>${n}</span>
        <span class="ip-tracker-pips">
          <span class="ip-pip" data-pip="0"></span>
          <span class="ip-pip" data-pip="1"></span>
        </span>
      </div>
    `;
  }

  const cardTemplate = (prefix) => `
    <div class="ip-card-stage">
      <div class="ip-card-caption" data-ref="${prefix}-caption"></div>
      <div class="tg-card-3d ip-card-3d is-flipped" data-ref="${prefix}-card">
        <div class="tg-card-3d-inner">
          <div class="tg-card-face ip-card-face-front" data-ref="${prefix}-front">
            <span class="ip-card-corner is-tl" data-ref="${prefix}-tl">?</span>
            <div class="ip-card-big-num" data-ref="${prefix}-num">?</div>
            <div class="ip-card-sub" data-ref="${prefix}-sub">GENIUS</div>
            <span class="ip-card-corner is-br" data-ref="${prefix}-br">?</span>
          </div>
          <div class="tg-card-face ip-card-mirror-back">
            <div class="ip-mirror-q">?</div>
            <div class="ip-mirror-tag" data-ref="${prefix}-mirror"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="ip-arena">
      <div class="ip-shoe-bar">
        <div class="ip-shoe-meta">
          <span data-ref="shoe-num"></span>
          <span class="ip-shoe-count" data-ref="shoe-count"></span>
          <span class="tg-badge tg-badge-gold" data-ref="fresh-badge" hidden></span>
        </div>
        <div class="ip-tracker-grid" data-ref="tracker">${trackerCellsHtml}</div>
      </div>

      <section class="ip-table" data-ref="table">
        <!-- Opponent Zone -->
        <div class="ip-seat-zone">
          <div class="ip-player-plate" data-ref="opp-plate">
            <div class="ip-plate-top">
              <span class="ip-plate-name">
                <span style="color:var(--tg-garnet-bright);" data-ref="opp-avatar"></span>
                <span data-ref="opp-name"></span>
              </span>
              <span class="tg-badge tg-badge-gold" data-ref="opp-first" hidden></span>
            </div>
            <div class="ip-chip-stack">
              <div class="ip-chip-visual">
                <span class="ip-mini-chip-tower" data-ref="opp-tower" aria-hidden="true"></span>
                <span class="ip-delta-anchor" data-ref="opp-delta">
                  <span class="ip-chip-num" data-ref="opp-chips">0</span>
                </span>
              </div>
              <span class="ip-bet-pill" data-ref="opp-bet" hidden></span>
            </div>
          </div>
          ${cardTemplate('opp')}
        </div>

        <!-- Center Pot & Showdown Banner -->
        <div class="ip-center-stage">
          <div class="ip-pot-orb" data-ref="pot-orb">
            <div>
              <div class="ip-pot-label" data-ref="pot-label"></div>
              <div style="font-size:10.5px;color:var(--tg-cyan-ink);" data-ref="carry-label" hidden></div>
            </div>
            <span class="ip-delta-anchor" data-ref="pot-delta">
              <span class="ip-pot-value" data-ref="pot-val">0</span>
            </span>
          </div>
          <div class="ip-judge-strip" data-ref="judge-strip" hidden></div>
          <div class="ip-action-tape" data-ref="action-tape"></div>
          <div class="ip-resolution-banner" data-ref="res-banner" hidden>
            <div class="ip-resolution-title" data-ref="res-title"></div>
            <div class="ip-resolution-sub" data-ref="res-sub"></div>
            <button type="button" class="tg-btn tg-btn-gold" data-ref="btn-next" style="margin-top:4px;" hidden></button>
          </div>
        </div>

        <!-- My Zone -->
        <div class="ip-seat-zone">
          ${cardTemplate('my')}
          <div class="ip-player-plate" data-ref="my-plate">
            <div class="ip-plate-top">
              <span class="ip-plate-name">
                <span style="color:var(--tg-gold);" data-ref="my-avatar"></span>
                <span data-ref="my-name"></span>
              </span>
              <span class="tg-badge tg-badge-gold" data-ref="my-first" hidden></span>
            </div>
            <div class="ip-chip-stack">
              <div class="ip-chip-visual">
                <span class="ip-mini-chip-tower" data-ref="my-tower" aria-hidden="true"></span>
                <span class="ip-delta-anchor" data-ref="my-delta">
                  <span class="ip-chip-num" data-ref="my-chips">0</span>
                </span>
              </div>
              <span class="ip-bet-pill" data-ref="my-bet" hidden></span>
            </div>
          </div>
        </div>
      </section>

      <!-- Persistent Controls Console -->
      <section class="ip-controls" data-ref="controls">
        <div data-ref="turn-controls" hidden>
          <div class="ip-penalty-warn" data-ref="warn-bar"></div>

          <div class="ip-controls-row" data-ref="raise-row" style="margin-top:10px;">
            <div class="ip-raise-bar">
              <span style="font-size:12px;color:var(--tg-ink-muted);white-space:nowrap;" data-ref="slider-label"></span>
              <input type="range" class="ip-slider" data-ref="raise-slider" min="1" max="10" value="1" />
              <span class="tg-dial-value" data-ref="raise-readout" style="font-size:18px;min-width:44px;">+1</span>
            </div>
            <div class="ip-quick-chips" data-ref="quick-chips"></div>
          </div>

          <div class="ip-action-buttons" style="margin-top:10px;">
            <button type="button" class="tg-btn tg-btn-cyan ip-action-btn" data-ref="btn-pass-call">
              <span data-ref="btn-pc-title"></span>
              <small data-ref="btn-pc-sub"></small>
            </button>
            <button type="button" class="tg-btn tg-btn-gold ip-action-btn" data-ref="btn-raise">
              <span data-ref="btn-raise-title"></span>
              <small data-ref="btn-raise-sub"></small>
            </button>
            <button type="button" class="tg-btn tg-btn-garnet ip-action-btn" data-ref="btn-allin">
              <span data-ref="btn-allin-title"></span>
              <small data-ref="btn-allin-sub"></small>
            </button>
            <button type="button" class="tg-btn tg-btn-ghost ip-action-btn ip-btn-fold-outline" data-ref="btn-fold">
              <span data-ref="btn-fold-title"></span>
              <small data-ref="btn-fold-sub"></small>
            </button>
          </div>
        </div>
        <div class="ip-waiting-bar" data-ref="waiting-bar" hidden></div>
      </section>
    </div>
  `;

  const q = (name) => container.querySelector(`[data-ref="${name}"]`);
  const cardRefs = (prefix) => ({
    caption: q(`${prefix}-caption`),
    root: q(`${prefix}-card`),
    front: q(`${prefix}-front`),
    cornerTl: q(`${prefix}-tl`),
    cornerBr: q(`${prefix}-br`),
    bigNum: q(`${prefix}-num`),
    sub: q(`${prefix}-sub`),
    mirrorTag: q(`${prefix}-mirror`),
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
    oppTower: q('opp-tower'),
    oppChips: q('opp-chips'),
    oppDelta: q('opp-delta'),
    oppBet: q('opp-bet'),
    oppCard: cardRefs('opp'),
    myPlate: q('my-plate'),
    myAvatar: q('my-avatar'),
    myName: q('my-name'),
    myFirst: q('my-first'),
    myTower: q('my-tower'),
    myChips: q('my-chips'),
    myDelta: q('my-delta'),
    myBet: q('my-bet'),
    myCard: cardRefs('my'),
    potOrb: q('pot-orb'),
    potLabel: q('pot-label'),
    carryLabel: q('carry-label'),
    potVal: q('pot-val'),
    potDelta: q('pot-delta'),
    judgeStrip: q('judge-strip'),
    actionTape: q('action-tape'),
    resBanner: q('res-banner'),
    resTitle: q('res-title'),
    resSub: q('res-sub'),
    btnNext: q('btn-next'),
    turnControls: q('turn-controls'),
    waitingBar: q('waiting-bar'),
    warnBar: q('warn-bar'),
    raiseRow: q('raise-row'),
    sliderLabel: q('slider-label'),
    raiseSlider: q('raise-slider'),
    raiseReadout: q('raise-readout'),
    quickChips: q('quick-chips'),
    btnPassCall: q('btn-pass-call'),
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
  };

  // Persistent event bindings (zero re-bind churn!)
  const syncRaiseUi = (val) => {
    const b = refs.latestBounds;
    const lang = refs.latestCtx?.lang || 'zh';
    if (!b) return;
    selectedRaiseBy = Math.max(1, Math.min(Math.max(1, b.maxRaiseBy), Math.floor(Number(val) || 1)));
    refs.raiseSlider.value = String(selectedRaiseBy);
    refs.raiseReadout.textContent = `+${selectedRaiseBy}`;
    const isMax = b.maxRaiseBy >= 1 && selectedRaiseBy === b.maxRaiseBy;
    refs.btnRaiseTitle.textContent = isMax
      ? lang === 'zh' ? '全下' : 'All-In'
      : b.canCheck
      ? lang === 'zh' ? '下注' : 'Bet'
      : lang === 'zh' ? '加注' : 'Raise';
    const tot = b.toCall + selectedRaiseBy;
    refs.btnRaiseSub.textContent =
      b.maxRaiseBy >= 1
        ? lang === 'zh' ? `投入 ${tot} 筹码` : `+${tot} chips`
        : lang === 'zh' ? '已达上限' : 'At cap';
  };

  refs.syncRaiseUi = syncRaiseUi;
  refs.raiseSlider.addEventListener('input', (e) => syncRaiseUi(e.target.value));

  refs.quickChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    SFX.play('click');
    syncRaiseUi(btn.dataset.preset);
  });

  refs.btnNext.addEventListener('click', () => {
    SFX.play('click');
    refs.latestCtx?.dispatch({ type: 'NEXT_HAND' });
  });

  refs.btnPassCall.addEventListener('click', () => {
    const b = refs.latestBounds;
    if (!b) return;
    Motion.pulseConfirm(refs.potOrb, { tone: 'cyan' });
    refs.latestCtx?.dispatch({ type: b.canCheck ? 'CHECK' : 'CALL' });
  });

  refs.btnRaise.addEventListener('click', () => {
    Motion.pulseConfirm(refs.potOrb, { tone: 'gold' });
    refs.latestCtx?.dispatch({ type: 'RAISE', payload: { raiseBy: selectedRaiseBy } });
  });

  refs.btnAllIn.addEventListener('click', () => {
    const b = refs.latestBounds;
    if (b && b.maxRaiseBy >= 1) {
      Motion.pulseConfirm(refs.potOrb, { tone: 'gold' });
      refs.latestCtx?.dispatch({ type: 'RAISE', payload: { raiseBy: b.maxRaiseBy } });
    }
  });

  refs.btnFold.addEventListener('click', () => {
    refs.latestCtx?.dispatch({ type: 'FOLD' });
  });

  container._ipRefs = refs;
  return refs;
}

function handleEventFeedback(lastEvent, sfx, refs) {
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
      Motion.pulseConfirm(refs.potOrb, { tone: 'gold' });
      break;
    case 'ALL_IN':
      sfx.play('clash');
      Motion.pulseConfirm(refs.potOrb, { tone: 'gold' });
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
      Motion.nudgeError(refs.table, { intensity: 'impact' });
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
- **无限注加注**：先手可过牌或下注，面对加注可跟注、反加、全下或弃牌。加注上限受双方有效筹码限制。
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
    const { state, activeSeatId, mySeatId, isSpectator, lang, lastEvent, sfx } = ctx;
    if (!state) return;

    const refs = container._ipRefs && container.contains(container._ipRefs.table)
      ? container._ipRefs
      : mountSkeleton(container);

    const viewerId = isSpectator ? state.seatIds[0] : activeSeatId || mySeatId || state.seatIds[0];
    const oppId = state.seatIds[0] === viewerId ? state.seatIds[1] : state.seatIds[0];

    const meInfo = state.seatsById[viewerId] || { name: 'P1', avatar: '♦' };
    const oppInfo = state.seatsById[oppId] || { name: 'P2', avatar: '♛' };

    const myCard = state.hands[viewerId];
    const oppCard = state.hands[oppId];
    const isShowdown = state.phase === 'showdown' || state.phase === 'ended';
    const isMyTurn = !isSpectator && state.phase === 'betting' && state.currentTurnSeatId === viewerId;

    const bounds = computeBettingBounds(state, viewerId);
    refs.latestCtx = ctx;
    refs.latestBounds = bounds;

    if (prevNums.round !== state.round) {
      selectedRaiseBy = 1;
    }
    if (selectedRaiseBy > bounds.maxRaiseBy) selectedRaiseBy = Math.max(1, bounds.maxRaiseBy);
    if (selectedRaiseBy < 1) selectedRaiseBy = 1;

    handleEventFeedback(lastEvent, sfx, refs);

    // 1. Shoe bar & live 10-number card-counting pips (patched in place!)
    refs.shoeNum.textContent = lang === 'zh' ? `第 ${state.shoeNumber} 副牌` : `Shoe #${state.shoeNumber}`;
    refs.shoeCount.textContent = lang === 'zh' ? `余 ${state.deckRemaining}/20 张` : `${state.deckRemaining}/20 Left`;
    const showFresh = state.reshuffledThisHand && state.phase === 'betting' && state.actionLog.length === 0;
    refs.freshBadge.hidden = !showFresh;
    refs.freshBadge.textContent = lang === 'zh' ? '全新洗牌' : 'Fresh Deck';

    const spentCounts = Array(11).fill(0);
    for (const c of state.revealedHistory || []) {
      if (c >= 1 && c <= 10) spentCounts[c] += 1;
    }
    const liveOppForTracker = !isShowdown && !isSpectator ? oppCard : null;
    for (const cell of refs.trackerCells) {
      const n = Number(cell.dataset.trackN);
      const spent = spentCounts[n];
      const oppHasOne = liveOppForTracker === n;
      cell.classList.toggle('is-exhausted', spent >= 2);
      const pips = cell.querySelectorAll('.ip-pip');
      pips.forEach((pip, k) => {
        pip.classList.toggle('is-spent', k < spent);
        pip.classList.toggle('is-live-opp', !(k < spent) && oppHasOne && k === spent);
      });
    }

    // 2. Player plates & animated chip/pot counters
    const res = state.lastResolution;
    refs.table.classList.toggle('is-penalty-rim', Boolean(res && res.penaltyAmount > 0));

    refs.oppPlate.classList.toggle('is-active-turn', state.currentTurnSeatId === oppId && state.phase === 'betting');
    refs.oppPlate.classList.toggle('is-winner', res?.winnerSeatId === oppId);
    refs.oppAvatar.textContent = oppInfo.avatar || '♛';
    refs.oppName.textContent = oppInfo.name;
    refs.oppFirst.hidden = state.nextFirstActorSeatId !== oppId;
    refs.oppFirst.textContent = lang === 'zh' ? '先手' : 'First';
    updateChipTower(refs.oppTower, state.chips[oppId]);
    refs.oppBet.hidden = state.streetBet[oppId] <= 0;
    refs.oppBet.textContent = lang === 'zh' ? `已下 +${state.streetBet[oppId]}` : `Bet +${state.streetBet[oppId]}`;

    refs.myPlate.classList.toggle('is-active-turn', isMyTurn);
    refs.myPlate.classList.toggle('is-winner', res?.winnerSeatId === viewerId);
    refs.myAvatar.textContent = meInfo.avatar || '♦';
    refs.myName.textContent = `${meInfo.name}${isSpectator ? '' : lang === 'zh' ? ' (你)' : ' (You)'}`;
    refs.myFirst.hidden = state.nextFirstActorSeatId !== viewerId;
    refs.myFirst.textContent = lang === 'zh' ? '先手' : 'First';
    updateChipTower(refs.myTower, state.chips[viewerId]);
    refs.myBet.hidden = state.streetBet[viewerId] <= 0;
    refs.myBet.textContent = lang === 'zh' ? `已下 +${state.streetBet[viewerId]}` : `Bet +${state.streetBet[viewerId]}`;

    refs.potLabel.textContent = lang === 'zh' ? '当前底池' : 'Total Pot';
    refs.carryLabel.hidden = state.carryoverPot <= 0;
    refs.carryLabel.textContent = lang === 'zh' ? '含平局滚存' : 'Carryover active';

    const curPot = state.pot;
    const curMy = state.chips[viewerId];
    const curOpp = state.chips[oppId];
    const isFreshMount = prevNums.pot === null || (prevNums.round !== null && state.round < prevNums.round);

    if (isFreshMount) {
      refs.potVal.textContent = String(curPot);
      refs.myChips.textContent = String(curMy);
      refs.oppChips.textContent = String(curOpp);
    } else {
      if (curPot !== prevNums.pot) {
        Motion.animateNumber(refs.potVal, prevNums.pot, curPot, { duration: 300, deltaEl: refs.potDelta });
      }
      if (curMy !== prevNums.myChips) {
        Motion.animateNumber(refs.myChips, prevNums.myChips, curMy, { duration: 320, deltaEl: refs.myDelta });
      }
      if (curOpp !== prevNums.oppChips) {
        Motion.animateNumber(refs.oppChips, prevNums.oppChips, curOpp, { duration: 320, deltaEl: refs.oppDelta });
      }
    }
    prevNums = { pot: curPot, myChips: curMy, oppChips: curOpp, round: state.round };

    // 3. 3D Flippable Forehead Cards (in-place toggle so 3D showdown flip plays!)
    patchCard3D(refs.oppCard, {
      value: oppCard,
      hidden: oppCard == null,
      label: lang === 'zh' ? '对手额头牌（可见）' : 'Opponent Forehead',
      isShowdown,
      mirrorTag: lang === 'zh' ? '额头暗牌' : 'Forehead',
    });

    patchCard3D(refs.myCard, {
      value: myCard,
      hidden: myCard == null,
      label: isShowdown
        ? lang === 'zh' ? '你的底牌（已揭晓）' : 'Your Card (Revealed)'
        : lang === 'zh' ? '你的额头牌（保密）' : 'Your Forehead (Hidden)',
      isShowdown,
      mirrorTag: lang === 'zh' ? '额头暗牌' : 'Forehead',
    });

    // 4. Judge Mode strip
    if (state.judgeAdvice && state.phase === 'betting') {
      refs.judgeStrip.hidden = false;
      refs.judgeStrip.innerHTML =
        `<span class="tg-badge tg-badge-cyan">${lang === 'zh' ? '嘉宾密报' : 'Judges'}</span>` +
        state.judgeAdvice
          .map(
            (j) =>
              `<span class="ip-judge-chip ${j.signal === 'GO' ? 'is-go' : 'is-fold'}">${UI.escapeHtml(I18n.t(j.name))}: <strong>${
                j.signal === 'GO' ? (lang === 'zh' ? '跟进' : 'Go') : lang === 'zh' ? '弃牌' : 'Fold'
              }</strong></span>`
          )
          .join('');
    } else {
      refs.judgeStrip.hidden = true;
    }

    // 5. Action tape
    const tapeItems = (state.actionLog || []).slice(-6);
    refs.actionTape.innerHTML = tapeItems
      .map((entry) => {
        const who = state.seatsById[entry.seatId]?.name || entry.seatId;
        const map = {
          CHECK: lang === 'zh' ? '过牌' : 'Check',
          CALL: lang === 'zh' ? `跟注 +${entry.amount}` : `Call +${entry.amount}`,
          BET: lang === 'zh' ? `下注 +${entry.amount}` : `Bet +${entry.amount}`,
          RAISE: lang === 'zh' ? `加注 +${entry.amount}` : `Raise +${entry.amount}`,
          ALL_IN: lang === 'zh' ? `全下 +${entry.amount}` : `All-In +${entry.amount}`,
          FOLD: lang === 'zh' ? '弃牌' : 'Fold',
        };
        return `<span class="ip-tape-pill">${UI.escapeHtml(who)}: ${map[entry.type] || entry.type}</span>`;
      })
      .join('');

    // 6. Resolution Banner (animated presence!)
    if (res) {
      const winnerName = res.winnerSeatId ? state.seatsById[res.winnerSeatId]?.name : '';
      let title = '';
      let sub = '';
      if (res.kind === 'fold') {
        const folderName = state.seatsById[res.foldedSeatId]?.name || '';
        if (res.penaltyAmount > 0) {
          title =
            lang === 'zh'
              ? `10 牌弃牌重罚 · -${res.penaltyAmount} 筹码`
              : `10-Card Fold Penalty · -${res.penaltyAmount} Chips`;
          sub =
            lang === 'zh'
              ? `${folderName} 握有 10 弃牌，${winnerName} 赢得底池 ${res.potAmount} + 罚金 ${res.penaltyAmount}`
              : `${folderName} folded a 10 — ${winnerName} wins ${res.potAmount} pot + ${res.penaltyAmount} penalty`;
        } else {
          title =
            lang === 'zh'
              ? `${folderName} 弃牌 · ${winnerName} 收下 ${res.potAmount} 筹码`
              : `${folderName} Folded · ${winnerName} Wins ${res.potAmount}`;
          sub =
            lang === 'zh'
              ? `底牌揭晓：${meInfo.name} [${res.cards[viewerId]}] vs ${oppInfo.name} [${res.cards[oppId]}]`
              : `Cards revealed: ${meInfo.name} [${res.cards[viewerId]}] vs ${oppInfo.name} [${res.cards[oppId]}]`;
        }
      } else if (res.isTie) {
        title = res.splitOnAllInTie
          ? lang === 'zh'
            ? `平局分池 · 双方均为 ${res.cards[viewerId]}`
            : `All-In Tie Split · Both held ${res.cards[viewerId]}`
          : lang === 'zh'
          ? `平局 · 底池 ${res.potAmount} 筹码滚存至下一局`
          : `Tie · ${res.potAmount} Chips Carry Over`;
        sub =
          lang === 'zh'
            ? `双方均为 ${res.cards[viewerId]}，下局继续各下 1 枚底注`
            : `Both held ${res.cards[viewerId]}. Fresh 1-chip antes next hand.`;
      } else {
        title =
          lang === 'zh'
            ? `${winnerName} 摊牌获胜 · +${res.potAmount} 筹码`
            : `${winnerName} Wins Showdown (+${res.potAmount})`;
        sub = `${meInfo.name} [${res.cards[viewerId]}] vs ${oppInfo.name} [${res.cards[oppId]}]`;
      }

      refs.resBanner.classList.toggle('is-penalty', Boolean(res.penaltyAmount > 0));
      refs.resTitle.textContent = title;
      refs.resSub.textContent = sub;
      const showNextBtn = state.phase === 'showdown' && !isSpectator;
      refs.btnNext.hidden = !showNextBtn;
      refs.btnNext.textContent = lang === 'zh' ? '进入下一局' : 'Deal Next Hand';

      if (!refs.bannerOpen) {
        refs.bannerOpen = true;
        Motion.transitionPresence(refs.resBanner, true, { preset: 'pill' });
      }
    } else if (refs.bannerOpen) {
      refs.bannerOpen = false;
      Motion.transitionPresence(refs.resBanner, false, { preset: 'pill' });
    }

    // 7. Controls Console (patched in place so slider dragging never resets!)
    if (isMyTurn) {
      refs.turnControls.hidden = false;
      refs.waitingBar.hidden = true;
      refs.warnBar.textContent =
        lang === 'zh'
          ? '提示：若你的额头暗牌是 10 而选择弃牌，将立即额外罚给对手 10 枚筹码。'
          : 'Notice: Folding while holding a 10 pays an immediate -10 chip penalty to your rival.';

      const canRaise = bounds.maxRaiseBy >= 1;
      refs.raiseRow.hidden = !canRaise;
      if (canRaise) {
        refs.sliderLabel.textContent = bounds.canCheck
          ? lang === 'zh' ? '下注额' : 'Bet'
          : lang === 'zh' ? '加注额' : 'Raise +';
        refs.raiseSlider.max = String(bounds.maxRaiseBy);
        const halfPot = Math.min(bounds.maxRaiseBy, Math.max(1, Math.round(state.pot / 2)));
        const presets = [1, 3, 5].filter((v) => v <= bounds.maxRaiseBy);
        let qHtml = presets
          .map((v) => `<button type="button" class="tg-btn tg-btn-sm" data-preset="${v}">+${v}</button>`)
          .join('');
        if (halfPot > 1 && !presets.includes(halfPot)) {
          qHtml += `<button type="button" class="tg-btn tg-btn-sm tg-btn-cyan" data-preset="${halfPot}">${lang === 'zh' ? '半池' : '½ Pot'}</button>`;
        }
        qHtml += `<button type="button" class="tg-btn tg-btn-sm tg-btn-garnet" data-preset="${bounds.maxRaiseBy}">${lang === 'zh' ? '全下' : 'Max'}</button>`;
        refs.quickChips.innerHTML = qHtml;
      }

      refs.btnPcTitle.textContent = bounds.canCheck
        ? lang === 'zh' ? '过牌' : 'Check'
        : lang === 'zh' ? '跟注' : 'Call';
      refs.btnPcSub.textContent = bounds.canCheck
        ? lang === 'zh' ? '0 筹码' : '0 chips'
        : lang === 'zh' ? `+${bounds.toCall} 筹码摊牌` : `+${bounds.toCall} to showdown`;

      refs.btnRaise.disabled = !canRaise;
      refs.btnAllIn.disabled = !canRaise;
      refs.btnAllInTitle.textContent = lang === 'zh' ? '全下' : 'All-In';
      refs.btnAllInSub.textContent = canRaise ? `+${bounds.maxAdd}` : '--';

      refs.btnFoldTitle.textContent = lang === 'zh' ? '弃牌' : 'Fold';
      refs.btnFoldSub.textContent = lang === 'zh' ? '10牌罚 -10' : '10 = -10 pen';
      refs.syncRaiseUi(selectedRaiseBy);
    } else {
      refs.turnControls.hidden = true;
      refs.waitingBar.hidden = false;
      refs.waitingBar.textContent =
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

/**
 * Quattro (四色牌) — Persistent Crystal Salon, 1:1 Pointer Drag & Motion-Polished UI
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import { GameRules, evaluateQuattroHand } from './rules.js';

let selectedCardIdx = null;
let lastHandledEventKey = null;
let prevSum = null;
let prevWasQuattro = false;
let prevHandSig = '';

const SUIT_LABEL = {
  R: { zh: '红', en: 'RED' },
  B: { zh: '蓝', en: 'BLUE' },
  G: { zh: '绿', en: 'GREEN' },
  Y: { zh: '黄', en: 'YELLOW' },
  K: { zh: '黑 0', en: 'ZERO' },
};

function patchCardEl(el, card, { isMine, isSelectable, isDraggable, isSelected, isConflict, lang }) {
  const badgeEl = el.querySelector('[data-c="badge"]');
  const numEl = el.querySelector('[data-c="num"]');
  const suitEl = el.querySelector('[data-c="suit"]');

  el.classList.remove('suit-R', 'suit-B', 'suit-G', 'suit-Y', 'suit-K', 'suit-hidden');
  el.classList.toggle('is-clickable', Boolean(isSelectable));
  el.classList.toggle('is-draggable', Boolean(isDraggable));
  el.classList.toggle('is-selected', Boolean(isSelected));
  el.classList.toggle('is-conflict', Boolean(isConflict));

  if (!card || card.hidden) {
    el.classList.add('suit-hidden');
    el.classList.remove('is-revealed', 'is-hidden-own');
    badgeEl.hidden = true;
    numEl.textContent = '?';
    suitEl.textContent = lang === 'zh' ? '暗牌' : 'Hidden';
    return;
  }

  el.classList.add(`suit-${card.color}`);
  el.classList.toggle('is-revealed', Boolean(card.revealed));
  el.classList.toggle('is-hidden-own', !card.revealed && Boolean(isMine));
  const badgeText = card.revealed
    ? lang === 'zh' ? '明牌' : 'Open'
    : isMine
    ? lang === 'zh' ? '暗牌' : 'Hidden'
    : '';
  badgeEl.hidden = !badgeText;
  badgeEl.textContent = badgeText;
  numEl.textContent = String(card.value);
  suitEl.textContent = I18n.t(SUIT_LABEL[card.color] || { zh: card.color, en: card.color });
}

function mountSkeleton(container) {
  const cardSlotTpl = (side, i) => `
    <div class="qt-card suit-hidden" data-side="${side}" data-idx="${i}">
      <span class="qt-card-state-badge" data-c="badge" hidden></span>
      <div class="qt-card-num" data-c="num">?</div>
      <div class="qt-card-suit-tag" data-c="suit"></div>
    </div>
  `;

  let vpPodsHtml = '';
  for (let i = 0; i < 6; i++) {
    vpPodsHtml += `
      <div class="qt-vp-pod" data-vp-idx="${i}">
        <div class="qt-vp-head">
          <strong style="font-size:13px;" data-vp="name"></strong>
          <div style="display:flex;gap:4px;">
            <span class="tg-badge tg-badge-emerald" style="font-size:9.5px;padding:1px 6px;" data-vp="me-used" hidden></span>
            <span class="tg-badge tg-badge-garnet" style="font-size:9.5px;padding:1px 6px;" data-vp="opp-used" hidden></span>
          </div>
        </div>
        <div style="font-size:11px;color:var(--tg-ink-faint);" data-vp="dep-label"></div>
        <div class="qt-vp-deposits" data-vp="deposits"></div>
        <div class="qt-vp-deposits" data-vp="leftover" style="border-top:1px solid var(--tg-border-subtle);padding-top:5px;" hidden></div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="qt-arena">
      <div class="qt-status-bar">
        <div class="qt-phase-banner">
          <span class="tg-badge tg-badge-emerald" data-ref="phase-badge"></span>
          <span data-ref="instruction"></span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="qt-quota-pill" data-ref="my-quota"></span>
          <span class="tg-badge tg-badge-cyan" data-ref="opp-quota"></span>
        </div>
      </div>

      <section class="qt-salon" data-ref="salon">
        <!-- Opponent Hand Tray -->
        <div class="qt-tray" data-ref="opp-tray">
          <div class="qt-tray-header">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;">
              <span style="color:var(--tg-garnet-bright);" data-ref="opp-avatar"></span>
              <span data-ref="opp-name"></span>
              <span class="tg-badge" data-ref="opp-mulligan" hidden></span>
            </div>
            <span data-ref="opp-summary" style="font-size:12px;color:var(--tg-ink-muted);"></span>
          </div>
          <div class="qt-cards-row" data-ref="opp-cards">
            ${[0, 1, 2, 3].map((i) => cardSlotTpl('opp', i)).join('')}
          </div>
        </div>

        <!-- 6 Holographic Virtual Player Pods -->
        <div data-ref="vp-section" hidden>
          <div class="qt-vp-hint" data-ref="vp-hint"></div>
          <div class="qt-vp-grid" data-ref="vp-grid">${vpPodsHtml}</div>
        </div>
        <div data-ref="vp-placeholder" style="text-align:center;padding:18px;border-radius:14px;background:var(--tg-glass-strong);border:1px dashed var(--tg-border);color:var(--tg-ink-muted);font-size:13px;"></div>

        <!-- My Hand Tray -->
        <div class="qt-tray" data-ref="my-tray">
          <div class="qt-tray-header">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;">
              <span style="color:var(--tg-gold);" data-ref="my-avatar"></span>
              <span data-ref="my-name"></span>
              <span class="tg-badge tg-badge-gold" data-ref="my-mulligan" hidden></span>
            </div>
            <span style="font-size:12px;color:var(--tg-ink-muted);" data-ref="my-rev-count"></span>
          </div>

          <div class="qt-cards-row" data-ref="my-cards">
            ${[0, 1, 2, 3].map((i) => cardSlotTpl('my', i)).join('')}
          </div>

          <div class="qt-meter-row" data-ref="meter-row">
            <div class="qt-color-dots">
              <span class="qt-color-dot c-R" data-dot="R">R</span>
              <span class="qt-color-dot c-B" data-dot="B">B</span>
              <span class="qt-color-dot c-G" data-dot="G">G</span>
              <span class="qt-color-dot c-Y" data-dot="Y">Y</span>
              <span class="qt-color-dot c-K" data-dot="K" hidden>0</span>
            </div>
            <div class="qt-power-meter">
              <div style="display:flex;justify-content:space-between;font-size:11.5px;">
                <span style="color:var(--tg-ink-muted);" data-ref="meter-label"></span>
                <strong style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;color:var(--tg-gold-bright);" data-ref="meter-sum">0 / 18</strong>
              </div>
              <div class="qt-meter-track">
                <div class="qt-meter-fill" data-ref="meter-fill"></div>
              </div>
            </div>
            <span class="tg-badge" data-ref="quattro-badge"></span>
          </div>
        </div>
      </section>

      <!-- Action Dock -->
      <section class="qt-controls">
        <div data-ref="mulligan-bar" style="width:100%;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;" hidden>
          <div style="font-size:13px;color:var(--tg-ink-muted);" data-ref="mulligan-hint"></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="tg-btn tg-btn-cyan" data-ref="btn-mulligan"></button>
            <button type="button" class="tg-btn tg-btn-gold" data-ref="btn-keep"></button>
          </div>
        </div>

        <div data-ref="trade-bar" style="width:100%;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;" hidden>
          <div style="font-size:12.5px;color:var(--tg-ink-muted);" data-ref="trade-hint"></div>
          <button type="button" class="tg-btn tg-btn-ghost" data-ref="btn-pass"></button>
        </div>

        <div data-ref="idle-bar" style="width:100%;text-align:center;font-size:13px;color:var(--tg-ink-muted);" hidden></div>
      </section>
    </div>
  `;

  const q = (n) => container.querySelector(`[data-ref="${n}"]`);
  const refs = {
    salon: q('salon'),
    phaseBadge: q('phase-badge'),
    instruction: q('instruction'),
    myQuota: q('my-quota'),
    oppQuota: q('opp-quota'),
    oppTray: q('opp-tray'),
    oppAvatar: q('opp-avatar'),
    oppName: q('opp-name'),
    oppMulligan: q('opp-mulligan'),
    oppSummary: q('opp-summary'),
    oppCards: Array.from(q('opp-cards').querySelectorAll('.qt-card')),
    vpSection: q('vp-section'),
    vpHint: q('vp-hint'),
    vpPlaceholder: q('vp-placeholder'),
    vpPods: Array.from(q('vp-grid').querySelectorAll('.qt-vp-pod')),
    myTray: q('my-tray'),
    myAvatar: q('my-avatar'),
    myName: q('my-name'),
    myMulligan: q('my-mulligan'),
    myRevCount: q('my-rev-count'),
    myCardsRow: q('my-cards'),
    myCards: Array.from(q('my-cards').querySelectorAll('.qt-card')),
    meterRow: q('meter-row'),
    colorDots: Array.from(q('meter-row').querySelectorAll('[data-dot]')),
    meterLabel: q('meter-label'),
    meterSum: q('meter-sum'),
    meterFill: q('meter-fill'),
    quattroBadge: q('quattro-badge'),
    mulliganBar: q('mulligan-bar'),
    mulliganHint: q('mulligan-hint'),
    btnMulligan: q('btn-mulligan'),
    btnKeep: q('btn-keep'),
    tradeBar: q('trade-bar'),
    tradeHint: q('trade-hint'),
    btnPass: q('btn-pass'),
    idleBar: q('idle-bar'),
    latestCtx: null,
    latestState: null,
    latestViewerId: null,
    dragState: null,
  };

  // In-place selection toggle (ZERO innerHTML nuke!)
  const updateSelectionClasses = () => {
    refs.myCards.forEach((el, idx) => {
      el.classList.toggle('is-selected', selectedCardIdx === idx);
    });
    const st = refs.latestState;
    const lang = refs.latestCtx?.lang || 'zh';
    if (st && st.phase === 'trade' && selectedCardIdx != null) {
      const hand = st.hands[refs.latestViewerId] || [];
      const c = hand[selectedCardIdx];
      if (c && !c.hidden) {
        refs.instruction.textContent =
          lang === 'zh'
            ? `已选中【${I18n.t(SUIT_LABEL[c.color])} ${c.value}】，点击或拖到任意高亮虚拟玩家完成交换`
            : `Selected [${c.color}${c.value}] — click or drag onto a highlighted Virtual Player to trade`;
      }
    }
  };
  refs.updateSelectionClasses = updateSelectionClasses;

  // Hit-test tradeable VP pod under (clientX, clientY)
  const findTradeablePodAt = (x, y) => {
    for (const pod of refs.vpPods) {
      if (!pod.classList.contains('is-tradeable')) continue;
      const r = pod.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return pod;
      }
    }
    return null;
  };

  const clearPodHighlights = () => {
    refs.vpPods.forEach((p) => p.classList.remove('is-drag-over'));
  };

  // 1:1 Pointer Events Direct Drag + Tap-to-Select / Tap-to-Reveal!
  refs.myCards.forEach((cardEl, idx) => {
    cardEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const st = refs.latestState;
      const ctx = refs.latestCtx;
      if (!st || !ctx || ctx.isSpectator) return;
      if (st.currentTurnSeatId !== refs.latestViewerId) return;
      const card = (st.hands[refs.latestViewerId] || [])[idx];
      if (!card || card.revealed) return;

      if (st.phase === 'reveal') {
        selectedCardIdx = null;
        Motion.pulseConfirm(cardEl, { tone: 'gold' });
        ctx.dispatch({ type: 'REVEAL_CARD', payload: { cardIndex: idx } });
        return;
      }

      if (st.phase !== 'trade') return;

      cardEl.setPointerCapture?.(e.pointerId);
      refs.dragState = {
        idx,
        cardEl,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        hoveredPod: null,
      };
    });

    cardEl.addEventListener('pointermove', (e) => {
      const ds = refs.dragState;
      if (!ds || ds.cardEl !== cardEl || ds.pointerId !== e.pointerId) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (!ds.moved && Math.hypot(dx, dy) >= 6) {
        ds.moved = true;
        selectedCardIdx = idx;
        updateSelectionClasses();
        cardEl.classList.add('is-dragging');
      }
      if (!ds.moved) return;

      const rot = Math.max(-9, Math.min(9, dx * 0.035));
      cardEl.style.transform = Motion.reduced()
        ? `translate3d(${dx}px, ${dy}px, 0)`
        : `translate3d(${dx}px, ${dy}px, 0) scale(1.05) rotate(${rot}deg)`;

      const pod = findTradeablePodAt(e.clientX, e.clientY);
      if (ds.hoveredPod !== pod) {
        clearPodHighlights();
        if (pod) pod.classList.add('is-drag-over');
        ds.hoveredPod = pod;
      }
    });

    const finishPointer = (e, cancelled) => {
      const ds = refs.dragState;
      if (!ds || ds.cardEl !== cardEl || ds.pointerId !== e.pointerId) return;
      refs.dragState = null;
      cardEl.releasePointerCapture?.(e.pointerId);
      clearPodHighlights();

      if (!ds.moved) {
        // Crisp tap-to-select (zero innerHTML nuke!)
        if (!cancelled) {
          SFX.play('click');
          selectedCardIdx = selectedCardIdx === idx ? null : idx;
          updateSelectionClasses();
        }
        return;
      }

      // Dropped after drag
      const targetPod = !cancelled ? findTradeablePodAt(e.clientX, e.clientY) : null;
      cardEl.classList.remove('is-dragging');
      cardEl.style.transform = '';

      if (targetPod) {
        const vpIndex = Number(targetPod.dataset.vpIdx);
        selectedCardIdx = null;
        updateSelectionClasses();
        Motion.pulseConfirm(targetPod, { tone: 'emerald' });
        refs.latestCtx?.dispatch({ type: 'TRADE', payload: { cardIndex: idx, vpIndex } });
      }
    };

    cardEl.addEventListener('pointerup', (e) => finishPointer(e, false));
    cardEl.addEventListener('pointercancel', (e) => finishPointer(e, true));
  });

  // VP Pod click-to-trade
  refs.vpPods.forEach((podEl) => {
    podEl.addEventListener('click', () => {
      if (!podEl.classList.contains('is-tradeable')) return;
      if (selectedCardIdx == null) {
        SFX.play('error');
        Motion.nudgeError(refs.myCardsRow, { intensity: 'subtle' });
        const lang = refs.latestCtx?.lang || 'zh';
        UI.toast(
          lang === 'zh' ? '请先点选或拖拽一张暗牌' : 'Select or drag a hidden card first',
          'error'
        );
        return;
      }
      const cIdx = selectedCardIdx;
      const vpIndex = Number(podEl.dataset.vpIdx);
      selectedCardIdx = null;
      updateSelectionClasses();
      Motion.pulseConfirm(podEl, { tone: 'emerald' });
      refs.latestCtx?.dispatch({ type: 'TRADE', payload: { cardIndex: cIdx, vpIndex } });
    });
  });

  // Mulligan & Pass buttons
  refs.btnMulligan.addEventListener('click', () => refs.latestCtx?.dispatch({ type: 'MULLIGAN' }));
  refs.btnKeep.addEventListener('click', () => {
    Motion.pulseConfirm(refs.myTray, { tone: 'gold' });
    refs.latestCtx?.dispatch({ type: 'KEEP' });
  });
  refs.btnPass.addEventListener('click', () => {
    selectedCardIdx = null;
    updateSelectionClasses();
    refs.latestCtx?.dispatch({ type: 'PASS' });
  });

  container._qtRefs = refs;
  return refs;
}

function handleEventFeedback(lastEvent, sfx, refs) {
  if (!lastEvent) return;
  const key = `${lastEvent.type}-${lastEvent.seatId || ''}-${lastEvent.vpIndex ?? ''}-${lastEvent.stage ?? ''}-${lastEvent.ts || ''}`;
  if (key === lastHandledEventKey) return;
  lastHandledEventKey = key;

  switch (lastEvent.type) {
    case 'MULLIGAN':
      sfx.play('cardFlip');
      Motion.crossfade(refs.myCardsRow, () => {}, { duration: 150, shiftPx: 5 });
      break;
    case 'REVEAL_CARD':
      sfx.play('cardFlip');
      break;
    case 'TRADE':
      sfx.play('garnetClink');
      if (typeof lastEvent.vpIndex === 'number' && refs.vpPods[lastEvent.vpIndex]) {
        Motion.pulseConfirm(refs.vpPods[lastEvent.vpIndex], { tone: 'emerald' });
      }
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
  - 在第 1、2、3 次亮牌之后进入交易轮：可点击或直接拖拽 **1 张暗牌** 至未交易过的虚拟玩家完成 **1换1**，或选择过牌。
  - **强制指标**：在亮出第 4 张（最后一张）牌之前，双方必须与 **全部 6 位虚拟玩家各交易 1 次**！
- **虚拟玩家确定性给牌算法（100% 公开可算）**：
  1. 若该 VP 手中有 **0 牌**，必然把 0 牌给你！
  2. 否则，结合你**已经亮出的明牌**，给出能帮你凑成 Quattro（不与明牌撞色撞数）的**最大点数牌**。
  3. 若没有能帮你的牌，给出其手中**最大点数牌**。
  4. 同数字优先级：**红 > 蓝 > 黄 > 绿**。`,
      en: `### Core Rules (S4E9 Official 26-Card + 6 Virtual Players)
- **Deck**: Red, Blue, Yellow, Green numbered 1–6 (24 cards) + **2 Black Zero (0)** cards = 26 total.
- **Objective**: Form a legal **Quattro** (4 cards with **4 distinct colors AND 4 distinct numbers**) with the highest total sum! (Under default S4 rules, Black 0 acts as a 5th distinct color/value so 1 Black 0 can legally complete a Quattro with 0 sum; toggle S2 Classic mode to make holding 0 an instant loss.)
- **Mulligan**: Each player starts with 4 cards and up to **2 Mulligans**. Remaining 18 cards go 3 each to 6 Virtual Players (VP1–VP6).
- **Reveal & Trade Loop**: Reveal 1 hidden card per stage (face-up cards can never be traded). Between reveals, click or drag any **hidden** card onto an unused VP to trade 1-for-1, or Pass.
- **Mandatory Quota**: Before flipping your 4th (final) card, you MUST complete trades with **ALL 6 Virtual Players**!
- **Deterministic VP Priority**:
  1. If VP holds a **0**, it ALWAYS gives you the 0!
  2. Otherwise, given your **face-up** cards, it gives the highest-value card that helps form a legal Quattro.
  3. Otherwise, it gives its highest-value card overall.
  4. Tie-breaker: **Red > Blue > Yellow > Green**.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, activeSeatId, mySeatId, isSpectator, lang, lastEvent, sfx } = ctx;
    if (!state) return;

    const refs = container._qtRefs && container.contains(container._qtRefs.salon)
      ? container._qtRefs
      : mountSkeleton(container);

    const viewerId = isSpectator ? state.seatIds[0] : activeSeatId || mySeatId || state.seatIds[0];
    const oppId = state.seatIds[0] === viewerId ? state.seatIds[1] : state.seatIds[0];
    const meInfo = state.seatsById[viewerId] || { name: 'P1', avatar: '♦' };
    const oppInfo = state.seatsById[oppId] || { name: 'P2', avatar: '♛' };

    refs.latestCtx = ctx;
    refs.latestState = state;
    refs.latestViewerId = viewerId;

    const myHand = state.hands[viewerId] || [];
    const oppHand = state.hands[oppId] || [];
    const isMyTurn = !isSpectator && state.phase !== 'ended' && state.currentTurnSeatId === viewerId;

    if (
      selectedCardIdx != null &&
      (!myHand[selectedCardIdx] || myHand[selectedCardIdx].revealed || state.phase !== 'trade')
    ) {
      selectedCardIdx = null;
    }
    if (isMyTurn && state.phase === 'trade' && selectedCardIdx == null) {
      const hiddenIdxs = myHand.map((c, i) => (c && !c.revealed ? i : -1)).filter((i) => i !== -1);
      if (hiddenIdxs.length === 1) selectedCardIdx = hiddenIdxs[0];
    }

    handleEventFeedback(lastEvent, sfx, refs);

    const zeroLoss = Boolean(state.options?.zeroInstantLoss);
    const myEval = isSpectator && state.phase !== 'ended' ? null : evaluateQuattroHand(myHand, zeroLoss);
    const oppEval = state.phase === 'ended' ? evaluateQuattroHand(oppHand, zeroLoss) : null;

    const myTradesDone = (state.vps || []).filter((vp) => vp.tradedBy.includes(viewerId)).length;
    const oppTradesDone = (state.vps || []).filter((vp) => vp.tradedBy.includes(oppId)).length;
    const mustFinishQuota = state.phase === 'trade' && state.revealStage === 3 && myTradesDone < 6;

    // 1. Top status bar
    let instruction = '';
    if (state.phase === 'ended') {
      instruction = I18n.t(state.result?.summary || { zh: '终局已定！', en: 'Match complete!' });
    } else if (!isMyTurn) {
      const actorName = state.seatsById[state.currentTurnSeatId]?.name || '';
      instruction = lang === 'zh' ? `等待 ${actorName} 行动…` : `Waiting for ${actorName}…`;
    } else if (state.phase === 'mulligan') {
      instruction =
        lang === 'zh'
          ? `起手调度：检查 4 张牌，决定保留或重抽（余 ${state.mulligansLeft[viewerId]} 次）`
          : `Mulligan: Keep your hand or redraw (${state.mulligansLeft[viewerId]} left)`;
    } else if (state.phase === 'reveal') {
      instruction =
        lang === 'zh'
          ? `点击 1 张暗牌永久翻开（第 ${state.revealStage}/4 张）`
          : `Click 1 hidden card to reveal permanently (Card ${state.revealStage}/4)`;
    } else if (state.phase === 'trade') {
      if (mustFinishQuota) {
        instruction =
          lang === 'zh'
            ? `第 3 轮强制指标：拖拽或点击交换完成全部 6 次交易（${myTradesDone}/6）`
            : `Mandatory Quota: Drag or click to finish all 6 VP trades (${myTradesDone}/6)`;
      } else if (selectedCardIdx != null && myHand[selectedCardIdx]) {
        const c = myHand[selectedCardIdx];
        instruction =
          lang === 'zh'
            ? `已选中【${I18n.t(SUIT_LABEL[c.color])} ${c.value}】，点击或拖到高亮虚拟玩家完成交换`
            : `Selected [${c.color}${c.value}] — click or drag onto a lit Virtual Player`;
      } else {
        instruction =
          lang === 'zh'
            ? '点击或直接拖拽 1 张暗牌到虚拟玩家舱交换，或选择过牌'
            : 'Click or drag 1 hidden card onto a VP pod to trade, or Pass';
      }
    }

    refs.phaseBadge.textContent = I18n.t(state.phaseLabel);
    refs.instruction.textContent = instruction;
    refs.myQuota.textContent = lang === 'zh' ? `你的交易 ${myTradesDone}/6` : `Trades ${myTradesDone}/6`;
    refs.oppQuota.textContent = lang === 'zh' ? `对手 ${oppTradesDone}/6` : `Opp ${oppTradesDone}/6`;

    // 2. Opponent tray & cards
    refs.oppTray.classList.toggle('is-my-turn', state.currentTurnSeatId === oppId && state.phase !== 'ended');
    refs.oppTray.classList.toggle('is-valid-quattro', Boolean(oppEval?.isQuattro));
    refs.oppAvatar.textContent = oppInfo.avatar || '♛';
    refs.oppName.textContent = oppInfo.name;
    refs.oppMulligan.hidden = state.phase !== 'mulligan';
    refs.oppMulligan.textContent = lang === 'zh' ? `余 ${state.mulligansLeft[oppId]} 次调度` : `${state.mulligansLeft[oppId]} mulligans`;
    refs.oppSummary.textContent = oppEval
      ? `${oppEval.isQuattro ? 'QUATTRO' : lang === 'zh' ? '非四色' : 'No Quattro'} · ${lang === 'zh' ? '总和' : 'Sum'} ${oppEval.sum}`
      : lang === 'zh'
      ? `已亮 ${oppHand.filter((c) => c.revealed).length}/4 张`
      : `Revealed ${oppHand.filter((c) => c.revealed).length}/4`;

    refs.oppCards.forEach((el, i) => {
      patchCardEl(el, oppHand[i], {
        isMine: false,
        isSelectable: false,
        isDraggable: false,
        isSelected: false,
        isConflict: false,
        lang,
      });
    });

    // 3. 6 Virtual Player Pods
    const hasVps = state.vps.length > 0;
    refs.vpSection.hidden = !hasVps;
    refs.vpPlaceholder.hidden = hasVps;
    refs.vpPlaceholder.textContent =
      lang === 'zh'
        ? '起手调度完成后，剩余 18 张牌将发给 6 位虚拟玩家（每人 3 张）开启交易博弈。'
        : 'Once both players finish Mulligan, the remaining 18 cards go to 6 Virtual Players.';

    if (hasVps) {
      refs.vpHint.textContent =
        lang === 'zh'
          ? '6 位虚拟玩家交易舱（算法：有0必给0 → 助凑Quattro最大 → 全场最大 · 红>蓝>黄>绿）'
          : '6 Virtual Player Pods (Rule: 0 First → Best Quattro Helper → Highest · R>B>Y>G)';

      state.vps.forEach((vp, i) => {
        const pod = refs.vpPods[i];
        if (!pod) return;
        const usedByMe = vp.tradedBy.includes(viewerId);
        const usedByOpp = vp.tradedBy.includes(oppId);
        const canTradeHere = isMyTurn && state.phase === 'trade' && !usedByMe;

        pod.classList.toggle('is-tradeable', canTradeHere);
        pod.classList.toggle('is-used-by-me', usedByMe);

        const nameEl = pod.querySelector('[data-vp="name"]');
        nameEl.textContent = I18n.t(vp.name);
        nameEl.style.color = canTradeHere ? 'var(--tg-gold-bright)' : 'var(--tg-ink)';

        const meTag = pod.querySelector('[data-vp="me-used"]');
        meTag.hidden = !usedByMe;
        meTag.textContent = lang === 'zh' ? '我已换' : 'You ✓';

        const oppTag = pod.querySelector('[data-vp="opp-used"]');
        oppTag.hidden = !usedByOpp;
        oppTag.textContent = lang === 'zh' ? '敌已换' : 'Opp ✓';

        pod.querySelector('[data-vp="dep-label"]').textContent =
          lang === 'zh' ? '公开放入记录：' : 'Public deposits:';

        const depBox = pod.querySelector('[data-vp="deposits"]');
        depBox.innerHTML = vp.publicDeposits.length
          ? vp.publicDeposits
              .map((dep) => {
                const who = dep.seatId === viewerId ? (lang === 'zh' ? '我' : 'Me') : lang === 'zh' ? '敌' : 'Opp';
                return `<span class="qt-mini-card suit-${dep.card.color}">${who}: ${dep.card.color}${dep.card.value}</span>`;
              })
              .join('')
          : `<span style="font-size:11px;color:var(--tg-ink-faint);">${lang === 'zh' ? '3 张未公开初始牌' : '3 initial hidden cards'}</span>`;

        const leftBox = pod.querySelector('[data-vp="leftover"]');
        if (state.phase === 'ended' && Array.isArray(vp.cards)) {
          leftBox.hidden = false;
          leftBox.innerHTML =
            `<span style="font-size:10px;color:var(--tg-ink-faint);">${lang === 'zh' ? '残余：' : 'Left:'}</span>` +
            vp.cards.map((c) => `<span class="qt-mini-card suit-${c.color}">${c.color}${c.value}</span>`).join('');
        } else {
          leftBox.hidden = true;
        }
      });
    }

    // 4. My tray, cards (with micro pulse on replaced card!), and GPU scaleX power meter
    refs.myTray.classList.toggle('is-my-turn', isMyTurn);
    refs.myTray.classList.toggle('is-valid-quattro', Boolean(myEval?.isQuattro));
    refs.myAvatar.textContent = meInfo.avatar || '♦';
    refs.myName.textContent = `${meInfo.name}${isSpectator ? '' : lang === 'zh' ? ' (你)' : ' (You)'}`;
    refs.myMulligan.hidden = state.phase !== 'mulligan';
    refs.myMulligan.textContent =
      lang === 'zh' ? `余 ${state.mulligansLeft[viewerId]} 次重抽` : `${state.mulligansLeft[viewerId]} Mulligans Left`;
    refs.myRevCount.textContent =
      lang === 'zh'
        ? `已亮 ${myHand.filter((c) => c.revealed).length}/4 张 · 暗牌可点击或拖拽交换`
        : `Revealed ${myHand.filter((c) => c.revealed).length}/4 · Tap or drag hidden cards`;

    const handSig = myHand.map((c) => (c && !c.hidden ? `${c.color}${c.value}${c.revealed ? 'R' : 'H'}` : 'X')).join('|');
    const prevParts = prevHandSig ? prevHandSig.split('|') : [];
    const nextParts = handSig.split('|');

    refs.myCards.forEach((el, i) => {
      const c = myHand[i];
      const canClick = isMyTurn && c && !c.revealed && (state.phase === 'reveal' || state.phase === 'trade');
      const canDrag = isMyTurn && c && !c.revealed && state.phase === 'trade';
      const isConflict =
        myEval && c && !c.hidden && (myEval.colorConflicts.includes(c.color) || myEval.valueConflicts.includes(c.value));
      patchCardEl(el, c, {
        isMine: !isSpectator,
        isSelectable: canClick,
        isDraggable: canDrag,
        isSelected: selectedCardIdx === i,
        isConflict: Boolean(isConflict),
        lang,
      });
      // Animate newly traded/drawn card cleanly without nuking siblings
      if (prevParts[i] && nextParts[i] && prevParts[i] !== nextParts[i] && !Motion.reduced()) {
        Motion.pulseConfirm(el, { tone: 'gold', duration: 220 });
      }
    });
    prevHandSig = handSig;

    // Power meter (GPU scaleX + Motion.animateNumber!)
    refs.meterRow.hidden = !myEval;
    if (myEval) {
      const presentColors = new Set(myHand.filter((c) => c && !c.hidden).map((c) => c.color));
      refs.colorDots.forEach((dot) => {
        const col = dot.dataset.dot;
        if (col === 'K') {
          dot.hidden = !presentColors.has('K');
          dot.classList.toggle('is-lit', presentColors.has('K'));
        } else {
          dot.classList.toggle('is-lit', presentColors.has(col));
        }
      });

      refs.meterLabel.textContent = lang === 'zh' ? '四牌总和强度' : 'Total Sum Power';
      const ratio = Math.max(0, Math.min(1, myEval.sum / 18));
      refs.meterFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
      refs.meterFill.classList.toggle('is-quattro', myEval.isQuattro);

      if (prevSum === null) {
        refs.meterSum.textContent = `${myEval.sum} / 18`;
      } else if (prevSum !== myEval.sum) {
        Motion.animateNumber(refs.meterSum, prevSum, myEval.sum, {
          duration: 280,
          format: (n) => `${Math.round(n)} / 18`,
        });
      }
      prevSum = myEval.sum;

      if (myEval.isQuattro && !prevWasQuattro) {
        Motion.pulseConfirm(refs.myTray, { tone: 'emerald' });
      }
      prevWasQuattro = myEval.isQuattro;

      refs.quattroBadge.className = 'tg-badge';
      refs.quattroBadge.style.borderColor = '';
      refs.quattroBadge.style.color = '';
      if (myEval.isZeroBust) {
        refs.quattroBadge.classList.add('tg-badge-garnet');
        refs.quattroBadge.textContent = lang === 'zh' ? '毒零必败 · 快换掉 0' : 'Zero Bust · Trade 0';
      } else if (myEval.isQuattro) {
        refs.quattroBadge.classList.add('tg-badge-emerald');
        refs.quattroBadge.textContent = lang === 'zh' ? '✦ 合法 Quattro 达成' : '✦ Valid Quattro';
      } else {
        refs.quattroBadge.style.borderColor = 'var(--tg-amber)';
        refs.quattroBadge.style.color = 'var(--tg-amber)';
        refs.quattroBadge.textContent =
          myEval.colorConflicts.length && myEval.valueConflicts.length
            ? lang === 'zh' ? '颜色与数字均有重复' : 'Color & Number duplicates'
            : myEval.colorConflicts.length
            ? lang === 'zh' ? '存在重复颜色' : 'Duplicate colors'
            : lang === 'zh' ? '存在重复数字' : 'Duplicate numbers';
      }
    }

    // 5. Action Dock
    const showMulligan = isMyTurn && state.phase === 'mulligan';
    const showTrade = isMyTurn && state.phase === 'trade';
    refs.mulliganBar.hidden = !showMulligan;
    refs.tradeBar.hidden = !showTrade;
    refs.idleBar.hidden = showMulligan || showTrade;

    if (showMulligan) {
      refs.mulliganHint.textContent =
        lang === 'zh'
          ? '满意这手牌可直接锁定，或重抽换 4 张新牌。'
          : 'Lock this opening hand or redraw 4 fresh cards.';
      refs.btnMulligan.disabled = (state.mulligansLeft[viewerId] || 0) <= 0;
      refs.btnMulligan.textContent =
        lang === 'zh'
          ? `↻ 重抽 (${state.mulligansLeft[viewerId]})`
          : `↻ Mulligan (${state.mulligansLeft[viewerId]})`;
      refs.btnKeep.textContent = lang === 'zh' ? '✓ 保留此手牌' : '✓ Keep Hand';
    } else if (showTrade) {
      refs.tradeHint.textContent = mustFinishQuota
        ? lang === 'zh'
          ? `亮出第 4 张牌前必须完成全部 6 位虚拟玩家交易（还差 ${6 - myTradesDone} 位）`
          : `Must complete ${6 - myTradesDone} more VP trade(s) before final reveal`
        : lang === 'zh'
        ? '点击或拖拽暗牌至虚拟玩家舱交换，或过牌进入下一张亮牌。'
        : 'Click or drag a hidden card onto a VP pod, or Pass to advance.';
      refs.btnPass.disabled = mustFinishQuota;
      refs.btnPass.textContent = lang === 'zh' ? '结束本轮交易（过牌）' : 'Pass Trade Round';
    } else {
      refs.idleBar.textContent = instruction;
    }
  },
});

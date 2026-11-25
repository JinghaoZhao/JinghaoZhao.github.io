/**
 * Black and White II (黑与白II · 흑과 백 II) — Interactive Reactor Bidding Stage
 * Persistent DOM Skeleton + 60fps In-Place Lamp Patching + ScaleX Pool Bar + Motion SDK
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import { GameRules, INITIAL_POINTS, getLampCount, getBidColor } from './rules.js';

const LAMP_TIERS = ['1+', '20+', '40+', '60+', '80+'];

let draftBid = 10;
let lastPhaseKey = null;
let lastEventTs = null;
let prevScoreMe = null;
let prevScoreOpp = null;
let prevMyRem = null;
let prevOppLamps = null;
let prevMyLamps = null;
let prevMyPlayKey = null;
let prevOppPlayKey = null;
let latestCtx = null;

function colorText(color, lang) {
  if (color === 'black') return lang === 'zh' ? '黑牌 (0–9)' : 'BLACK (0–9)';
  return lang === 'zh' ? '白牌 (10+)' : 'WHITE (10+)';
}

function mountSkeleton(container) {
  const lampMarkup = LAMP_TIERS.map(
    (tier, idx) => `<div class="bw2-lamp" data-lamp-idx="${idx}" data-tier="${tier}"></div>`
  ).join('');

  container.innerHTML = `
    <div class="bw2-arena" data-bw2-root>
      <section class="bw2-top-grid">
        <div class="bw2-reactor-card" data-el="card-me">
          <div class="bw2-reactor-head">
            <div style="display:flex;align-items:center;gap:7px;">
              <span class="bw2-pname" data-el="me-name"></span>
              <span class="tg-badge tg-badge-gold" data-el="me-first" hidden></span>
            </div>
            <div class="bw2-pips" data-el="me-pips">
              ${Array.from({ length: 5 }, (_, i) => `<span class="bw2-pip" data-pip="${i}"></span>`).join('')}
            </div>
          </div>
          <div class="bw2-lamps-wrap">
            <div class="bw2-lamps-row" data-el="my-lamps">${lampMarkup}</div>
            <div class="bw2-lamp-meta">
              <span><span data-el="pool-label"></span>: <strong style="color:var(--tg-gold-bright);" data-el="me-rem-val">99</strong> / ${INITIAL_POINTS}</span>
              <span data-el="me-lamp-text">5 / 5</span>
            </div>
          </div>
        </div>

        <div class="bw2-center-score">
          <div class="bw2-score-digits">
            <span class="bw2-score-val" style="color:var(--tg-gold-bright);" data-el="score-me">0</span>
            <span style="opacity:0.35;font-size:20px;">:</span>
            <span class="bw2-score-val" style="color:var(--tg-garnet-ink);" data-el="score-opp">0</span>
          </div>
          <span style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:11px;color:var(--tg-ink-muted);" data-el="round-label"></span>
          <span class="tg-badge tg-badge-garnet" data-el="target-badge"></span>
        </div>

        <div class="bw2-reactor-card" data-el="card-opp">
          <div class="bw2-reactor-head">
            <div style="display:flex;align-items:center;gap:7px;">
              <span class="bw2-pname" data-el="opp-name"></span>
              <span class="tg-badge tg-badge-gold" data-el="opp-first" hidden></span>
            </div>
            <div class="bw2-pips" data-el="opp-pips">
              ${Array.from({ length: 5 }, (_, i) => `<span class="bw2-pip" data-pip="${i}"></span>`).join('')}
            </div>
          </div>
          <div class="bw2-lamps-wrap">
            <div class="bw2-lamps-row" data-el="opp-lamps">${lampMarkup}</div>
            <div class="bw2-lamp-meta">
              <span><span data-el="range-label"></span>: <strong style="color:var(--tg-garnet-ink);" data-el="opp-range-val">80–99 pts</strong></span>
              <span data-el="opp-lamp-status">5 / 5</span>
            </div>
          </div>
        </div>
      </section>

      <section class="bw2-stage-chamber" data-el="chamber">
        <div class="bw2-stage-top">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13.5px;font-weight:600;">
            <span class="tg-badge" data-el="phase-badge"></span>
            <span data-el="status-msg"></span>
          </div>
          <span style="font-family:var(--tg-font-mono);font-size:11px;color:var(--tg-ink-faint);" data-el="rule-note"></span>
        </div>

        <div class="bw2-clash-row">
          <div class="bw2-bid-slot">
            <span style="font-size:11.5px;font-weight:700;letter-spacing:0.08em;color:var(--tg-ink-muted);" data-el="slot-me-name"></span>
            <div class="bw2-plaque is-empty" data-el="plaque-me"></div>
          </div>

          <div style="display:flex;flex-direction:column;align-items:center;gap:10px;min-width:144px;text-align:center;">
            <div style="font-family:var(--tg-font-display);font-size:26px;font-weight:900;" data-el="verdict-title">VS</div>
            <button type="button" class="tg-btn tg-btn-gold" data-el="next-round" style="min-width:144px;" hidden></button>
            <span style="font-size:11.5px;color:var(--tg-ink-muted);" data-el="verdict-sub"></span>
          </div>

          <div class="bw2-bid-slot">
            <span style="font-size:11.5px;font-weight:700;letter-spacing:0.08em;color:var(--tg-ink-muted);" data-el="slot-opp-name"></span>
            <div class="bw2-plaque is-empty" data-el="plaque-opp"></div>
          </div>
        </div>
      </section>

      <section class="bw2-vault" data-el="vault">
        <div class="bw2-vault-main">
          <div class="bw2-halo-dial is-white" data-el="halo">
            <span class="bw2-halo-num" data-el="halo-num">10</span>
            <span class="bw2-halo-tier" data-el="halo-tier">WHITE</span>
          </div>

          <div class="bw2-controls-col">
            <div class="bw2-slider-row">
              <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-ink-muted);">0</span>
              <input type="range" class="bw2-range" data-el="slider" min="0" max="99" value="10" />
              <span style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:12px;color:var(--tg-gold-bright);" data-el="slider-max">99</span>
            </div>

            <div class="bw2-stepper-row">
              ${[-10, -5, -1, 1, 5, 10]
                .map((d) => `<button type="button" class="tg-btn tg-btn-sm" data-step="${d}">${d > 0 ? `+${d}` : d}</button>`)
                .join('')}
            </div>

            <div class="bw2-preset-row" data-el="preset-row"></div>
          </div>

          <div style="display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:176px;">
            <button type="button" class="tg-btn tg-btn-garnet" data-el="lock-bid" style="min-height:48px;font-size:14.5px;"></button>
            <div data-el="post-preview" style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:11px;text-align:center;color:var(--tg-ink-muted);"></div>
          </div>
        </div>

        <div class="bw2-rem-bar-wrap">
          <div class="bw2-rem-track">
            <div class="bw2-rem-fill" data-el="rem-fill"></div>
          </div>
          <div class="bw2-rem-ticks" data-el="rem-ticks">
            <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>99</span>
          </div>
        </div>
      </section>

      <section class="bw2-history">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;letter-spacing:0.08em;color:var(--tg-ink-muted);text-transform:uppercase;">
          <span data-el="hist-title"></span>
          <span data-el="hist-sub"></span>
        </div>
        <div class="bw2-history-grid" data-el="hist-grid">
          ${Array.from({ length: 9 }, (_, i) => `
            <div class="bw2-hcell" data-hround="${i + 1}">
              <span style="color:var(--tg-ink-faint);font-size:10px;">R${i + 1}</span>
              <div style="display:flex;gap:4px;align-items:center;" data-htokens="${i + 1}">—</div>
              <span style="font-size:10px;font-weight:800;" data-hverdict="${i + 1}"></span>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  container.dataset.mountedPhase = 'arena';

  // Bind stable listeners ONCE — zero innerHTML rebuilds on drag/click!
  container.querySelector('[data-el="slider"]').addEventListener('input', (e) => {
    if (!latestCtx) return;
    syncDraftInPlace(container, Number(e.target.value));
  });

  container.querySelectorAll('[data-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!latestCtx) return;
      latestCtx.sfx.play('click');
      syncDraftInPlace(container, draftBid + Number(btn.dataset.step));
    });
  });

  container.querySelector('[data-el="preset-row"]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn || btn.disabled || !latestCtx) return;
    latestCtx.sfx.play('click');
    syncDraftInPlace(container, Number(btn.dataset.preset));
  });

  container.querySelector('[data-el="lock-bid"]').addEventListener('click', () => {
    if (!latestCtx) return;
    const lockBtn = container.querySelector('[data-el="lock-bid"]');
    if (lockBtn.disabled) return;
    latestCtx.sfx.play('bid');
    Motion.pulseConfirm(container.querySelector('[data-el="halo"]'), { tone: 'gold', duration: 220 });
    latestCtx.dispatch({ type: 'SUBMIT_BID', payload: { bid: draftBid } });
  });

  container.querySelector('[data-el="next-round"]').addEventListener('click', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    latestCtx.dispatch({ type: 'NEXT_ROUND' });
  });
}

function patchLampRowInPlace(rowEl, litCount, previewLitCount, staggerDropFrom) {
  if (!rowEl) return;
  const lamps = rowEl.querySelectorAll('.bw2-lamp');
  const isDanger = litCount <= 2;

  lamps.forEach((lamp, idx) => {
    const isLit = idx < litCount;
    const willDrop = previewLitCount != null && isLit && idx >= previewLitCount;
    lamp.classList.toggle('is-lit', isLit);
    lamp.classList.toggle('is-danger', isLit && isDanger);
    lamp.classList.toggle('is-preview-off', willDrop);
  });

  // Sequential 60ms staggered lamp extinguish effect when lamps actually drop!
  if (staggerDropFrom != null && staggerDropFrom > litCount && !Motion.reduced()) {
    let step = 0;
    for (let idx = staggerDropFrom - 1; idx >= litCount; idx--) {
      const lamp = lamps[idx];
      if (!lamp) continue;
      const delay = step * 60;
      step++;
      setTimeout(() => {
        lamp.classList.remove('is-just-dropped');
        void lamp.offsetWidth;
        lamp.classList.add('is-just-dropped');
      }, delay);
    }
  }
}

function syncDraftInPlace(container, nextVal) {
  if (!latestCtx?.state) return;
  const { state, mySeatId, activeSeatId, isSpectator, lang } = latestCtx;
  const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
  const me = state.players[viewerId];
  const myRem = me?.remaining ?? 0;

  const prevColor = getBidColor(draftBid);
  draftBid = Math.max(0, Math.min(myRem, Math.round(nextVal)));
  const col = getBidColor(draftBid);
  const after = Math.max(0, myRem - draftBid);
  const afterLamps = getLampCount(after);
  const q = (k) => container.querySelector(`[data-el="${k}"]`);

  const slider = q('slider');
  if (slider) slider.value = String(draftBid);

  const halo = q('halo');
  if (halo) {
    halo.classList.toggle('is-black', col === 'black');
    halo.classList.toggle('is-white', col === 'white');
    if (col !== prevColor && !Motion.reduced()) {
      Motion.pulseConfirm(halo, { tone: col === 'white' ? 'gold' : 'cyan', duration: 160 });
    }
  }
  q('halo-num').textContent = String(draftBid);
  q('halo-tier').textContent = col === 'black'
    ? (lang === 'zh' ? '黑 · 0–9' : 'BLACK')
    : (lang === 'zh' ? '白 · 10+' : 'WHITE');

  q('lock-bid').textContent = lang === 'zh' ? `锁定投入 ${draftBid} 点` : `Lock Bid ${draftBid}`;
  q('post-preview').textContent = lang === 'zh'
    ? `出价后剩 ${after} 点 (${afterLamps} 灯)`
    : `After: ${after} pts (${afterLamps} lamps)`;

  // GPU-composited scaleX bar (zero layout width thrash!)
  const fillEl = q('rem-fill');
  if (fillEl) {
    fillEl.style.transform = `scaleX(${Math.max(0, Math.min(1, after / INITIAL_POINTS))})`;
  }

  // In-place lamp preview toggle (ZERO innerHTML nuke on drag!)
  const isMyTurn = !isSpectator && (state.phase === 'first_bid' || state.phase === 'second_bid') && state.currentTurnSeatId === viewerId;
  patchLampRowInPlace(q('my-lamps'), me.lamps, isMyTurn ? afterLamps : null, null);
}

function patchPlaque(el, play, isWin, awaiting, lang, triggerEnter) {
  el.className = 'bw2-plaque';
  if (!play) {
    el.classList.add('is-empty');
    el.innerHTML = `
      <span style="font-size:22px;opacity:0.45;">${awaiting ? '◈' : '—'}</span>
      <span class="bw2-plaque-sub">${awaiting ? (lang === 'zh' ? '等待出价' : 'BIDDING') : (lang === 'zh' ? '待出价' : 'EMPTY')}</span>
    `;
    return;
  }
  el.classList.add(`is-${play.color}`);
  if (isWin) el.classList.add('is-winner');
  if (triggerEnter && !Motion.reduced()) {
    el.classList.add('is-entering');
    setTimeout(() => el.classList.remove('is-entering'), 280);
  }
  const showVal = play.bid !== null && play.bid !== undefined;
  el.innerHTML = `
    <span class="bw2-plaque-val">${showVal ? play.bid : '?'}</span>
    <span class="bw2-plaque-sub">${colorText(play.color, lang)}</span>
    ${
      play.lampDrop > 0
        ? `<span class="bw2-drop-badge">−${play.lampDrop} ${lang === 'zh' ? '灯' : 'LAMP'}</span>`
        : `<span style="font-size:10px;opacity:0.7;font-family:var(--tg-font-mono);">${lang === 'zh' ? '灯数不变' : '0 LAMP DROP'}</span>`
    }
  `;
}

function renderStage(container, ctx) {
  latestCtx = ctx;
  const { state, mySeatId, activeSeatId, isSpectator, lang, lastEvent, sfx, log } = ctx;
  if (!state) return;

  if (container.dataset.mountedPhase !== 'arena' || !container.querySelector('[data-bw2-root]')) {
    prevScoreMe = null;
    prevScoreOpp = null;
    prevMyRem = null;
    prevOppLamps = null;
    prevMyLamps = null;
    prevMyPlayKey = null;
    prevOppPlayKey = null;
    mountSkeleton(container);
  }

  const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
  const oppId = state.seatOrder.find((id) => id !== viewerId) || state.seatOrder[1];
  const me = state.players[viewerId];
  const opp = state.players[oppId];

  const myRem = me.remaining ?? 0;
  const pKey = `${state.round}-${state.phase}-${viewerId}`;
  if (pKey !== lastPhaseKey) {
    lastPhaseKey = pKey;
    draftBid = Math.min(myRem, myRem >= 10 ? 11 : myRem);
  }
  draftBid = Math.max(0, Math.min(myRem, draftBid));

  const q = (k) => container.querySelector(`[data-el="${k}"]`);

  // Events SFX, Motion & Log
  if (lastEvent && lastEvent.ts && lastEvent.ts !== lastEventTs) {
    lastEventTs = lastEvent.ts;
    if (lastEvent.type === 'FIRST_BID_LOCKED') {
      sfx.play(lastEvent.lampDrop > 0 ? 'laserZap' : 'bid');
      const actorName = state.players[lastEvent.seatId]?.name || '';
      const dropMsgZh = lastEvent.lampDrop > 0 ? `，熄灭 ${lastEvent.lampDrop} 格灯` : '，灯数不变';
      const dropMsgEn = lastEvent.lampDrop > 0 ? `, −${lastEvent.lampDrop} lamp(s)` : ', 0 lamp drop';
      log(
        lang === 'zh'
          ? `第 ${lastEvent.round} 回合：${actorName} 锁定【${colorText(lastEvent.color, 'zh')}】${dropMsgZh}`
          : `R${lastEvent.round}: ${actorName} locked [${colorText(lastEvent.color, 'en')}]${dropMsgEn}`,
        'system'
      );
    } else if (lastEvent.type === 'ROUND_RESOLVED') {
      sfx.play('heartbeat');
      setTimeout(() => {
        if (lastEvent.isDraw) sfx.play('reveal');
        else if (lastEvent.winnerSeatId === viewerId) {
          sfx.play('garnetClink');
          Motion.pulseConfirm(q('plaque-me'), { tone: 'gold' });
        } else {
          sfx.play('clash');
          Motion.nudgeError(q('chamber'), { intensity: 'subtle' });
        }
      }, 240);
      const wName = lastEvent.winnerSeatId ? state.players[lastEvent.winnerSeatId]?.name : null;
      log(
        lastEvent.isDraw
          ? lang === 'zh' ? `第 ${lastEvent.round} 回合暗注裁决：平局` : `R${lastEvent.round}: Draw`
          : lang === 'zh' ? `第 ${lastEvent.round} 回合暗注裁决：${wName} 胜 (+1)` : `R${lastEvent.round}: ${wName} wins (+1)`,
        'alert'
      );
    }
  }

  const isMyTurn = !isSpectator && (state.phase === 'first_bid' || state.phase === 'second_bid') && state.currentTurnSeatId === viewerId;
  const isRoundResult = state.phase === 'round_result';
  const isFinished = state.phase === 'finished';

  // Patch Reactor Cards
  q('card-me').classList.toggle('is-active', state.currentTurnSeatId === viewerId && !isRoundResult);
  q('card-opp').classList.toggle('is-active', state.currentTurnSeatId === oppId && !isRoundResult);

  q('me-name').textContent = `${me.name}${!isSpectator ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}`;
  q('opp-name').textContent = opp.name;
  q('me-first').hidden = state.firstSeatId !== viewerId;
  q('me-first').textContent = lang === 'zh' ? '先手' : '1ST';
  q('opp-first').hidden = state.firstSeatId !== oppId;
  q('opp-first').textContent = lang === 'zh' ? '先手' : '1ST';

  q('me-pips').querySelectorAll('.bw2-pip').forEach((p, i) => p.classList.toggle('is-me', i < me.score));
  q('opp-pips').querySelectorAll('.bw2-pip').forEach((p, i) => p.classList.toggle('is-opp', i < opp.score));

  const postLamps = getLampCount(Math.max(0, myRem - draftBid));
  patchLampRowInPlace(q('my-lamps'), me.lamps, isMyTurn ? postLamps : null, prevMyLamps);
  patchLampRowInPlace(q('opp-lamps'), opp.lamps, null, prevOppLamps);
  prevMyLamps = me.lamps;
  prevOppLamps = opp.lamps;

  q('pool-label').textContent = lang === 'zh' ? '剩余点数' : 'YOUR POOL';
  const remValEl = q('me-rem-val');
  if (me.remaining != null) {
    if (prevMyRem === null) remValEl.textContent = String(me.remaining);
    else if (prevMyRem !== me.remaining) Motion.animateNumber(remValEl, prevMyRem, me.remaining, { duration: 320 });
    prevMyRem = me.remaining;
  } else {
    remValEl.textContent = '?';
  }
  q('me-lamp-text').textContent = `${me.lamps} / 5 ${lang === 'zh' ? '灯' : 'LAMPS'}`;

  q('range-label').textContent = lang === 'zh' ? '推算区间' : 'GAUGE RANGE';
  q('opp-range-val').textContent = opp.remaining != null
    ? `${opp.remaining} pts`
    : `${opp.lampBracket[0]}–${opp.lampBracket[1]} pts`;
  q('opp-lamp-status').innerHTML = opp.lastLampDrop > 0
    ? `<span class="bw2-drop-badge">−${opp.lastLampDrop}</span>`
    : `${opp.lamps} / 5 ${lang === 'zh' ? '灯' : 'LAMPS'}`;

  // Animate Scores
  const sMeEl = q('score-me');
  const sOppEl = q('score-opp');
  if (prevScoreMe === null) {
    sMeEl.textContent = String(me.score);
    sOppEl.textContent = String(opp.score);
  } else {
    if (me.score !== prevScoreMe) Motion.animateNumber(sMeEl, prevScoreMe, me.score, { duration: 280, deltaEl: sMeEl });
    if (opp.score !== prevScoreOpp) Motion.animateNumber(sOppEl, prevScoreOpp, opp.score, { duration: 280, deltaEl: sOppEl });
  }
  prevScoreMe = me.score;
  prevScoreOpp = opp.score;

  q('round-label').textContent = lang === 'zh' ? `第 ${state.round} / ${state.totalRounds} 回合` : `ROUND ${state.round} / ${state.totalRounds}`;
  q('target-badge').textContent = lang === 'zh' ? '先得 5 分胜' : 'FIRST TO 5';

  // Patch Central Auction Chamber
  const cr = state.currentRound || {};
  const myPlay = cr.firstPlay?.seatId === viewerId ? cr.firstPlay : cr.secondPlay?.seatId === viewerId ? cr.secondPlay : null;
  const oppPlay = cr.firstPlay?.seatId === oppId ? cr.firstPlay : cr.secondPlay?.seatId === oppId ? cr.secondPlay : null;
  const myWon = isRoundResult && cr.winnerSeatId === viewerId;
  const oppWon = isRoundResult && cr.winnerSeatId === oppId;
  const isDraw = isRoundResult && cr.isDraw;

  const badge = q('phase-badge');
  badge.className = `tg-badge ${isMyTurn ? 'tg-badge-gold' : isRoundResult ? 'tg-badge-garnet' : 'tg-badge-cyan'}`;
  badge.textContent = I18n.t(state.phaseLabel);

  let statusMsg = '';
  if (isFinished) {
    statusMsg = lang === 'zh' ? '终局复盘：双方 99 点投入记录已解封' : 'Final Review: All 99-point bids unsealed';
  } else if (isRoundResult) {
    statusMsg = isDraw
      ? (lang === 'zh' ? '平局！双方投入点数一致，先手权不变' : 'Exact Tie! First bidder unchanged')
      : myWon
      ? (lang === 'zh' ? `你赢下第 ${state.round} 回合 (+1)，下轮由你先手` : `You won R${state.round} (+1) — you lead next`)
      : (lang === 'zh' ? `${opp.name} 赢下第 ${state.round} 回合（对手点数保密）` : `${opp.name} won R${state.round} (bid hidden)`);
  } else if (isMyTurn) {
    if (state.phase === 'first_bid') {
      statusMsg = lang === 'zh' ? '轮到你先手盲注：确认瞬间对手将看到黑白牌与能量灯变化' : 'Your turn [FIRST]: Lock bid (Black/White & Lamp drop update live)';
    } else {
      const dropInfo = oppPlay?.lampDrop
        ? (lang === 'zh' ? `且熄灭 ${oppPlay.lampDrop} 格灯！` : `& dropped ${oppPlay.lampDrop} lamp(s)!`)
        : (lang === 'zh' ? '且能量灯未掉格' : '& 0 lamps dropped');
      statusMsg = lang === 'zh'
        ? `对手锁定【${colorText(oppPlay?.color, 'zh')}】${dropInfo} 轮到你后手应战`
        : `Rival locked [${colorText(oppPlay?.color, 'en')}] ${dropInfo} Your counter`;
    }
  } else {
    statusMsg = lang === 'zh'
      ? `等待 ${state.players[state.currentTurnSeatId]?.name || ''} 锁定出价...`
      : `Waiting for ${state.players[state.currentTurnSeatId]?.name || ''} to lock bid...`;
  }
  q('status-msg').textContent = statusMsg;
  q('rule-note').textContent = lang === 'zh' ? '0–9 黑牌 · 10+ 白牌 · 每 20 点一盏灯' : '0–9 BLACK · 10+ WHITE · 20 PTS/LAMP';

  q('slot-me-name').textContent = me.name;
  q('slot-opp-name').textContent = opp.name;

  const myPKey = myPlay ? `${state.round}-${myPlay.color}-${myPlay.lampDrop}-${myPlay.bid}` : null;
  const oppPKey = oppPlay ? `${state.round}-${oppPlay.color}-${oppPlay.lampDrop}-${oppPlay.bid}` : null;
  patchPlaque(q('plaque-me'), myPlay, myWon, !myPlay && state.currentTurnSeatId === viewerId, lang, Boolean(myPKey && myPKey !== prevMyPlayKey));
  patchPlaque(q('plaque-opp'), oppPlay, oppWon, !oppPlay && state.currentTurnSeatId === oppId, lang, Boolean(oppPKey && oppPKey !== prevOppPlayKey));
  prevMyPlayKey = myPKey;
  prevOppPlayKey = oppPKey;

  const vTitle = q('verdict-title');
  vTitle.style.color = isRoundResult
    ? (isDraw ? 'var(--tg-cyan-ink)' : myWon ? 'var(--tg-gold-bright)' : 'var(--tg-garnet-ink)')
    : 'var(--tg-gold-bright)';
  vTitle.textContent = isRoundResult
    ? (isDraw ? (lang === 'zh' ? '平局' : 'DRAW') : myWon ? (lang === 'zh' ? '你胜 +1' : 'WIN +1') : (lang === 'zh' ? '对手 +1' : 'LOSS'))
    : 'VS';

  const nextBtn = q('next-round');
  nextBtn.hidden = !(isRoundResult && !isSpectator);
  nextBtn.textContent = lang === 'zh' ? '下一回合 →' : 'Next Round →';
  q('verdict-sub').textContent = isRoundResult
    ? ''
    : state.phase === 'first_bid'
    ? (lang === 'zh' ? '先手亮色与灯数' : 'First reveals color & lamps')
    : state.phase === 'second_bid'
    ? (lang === 'zh' ? '后手反制盲注' : 'Second responds blind')
    : '';

  // Patch 99-Point Vault Controls
  const vaultEl = q('vault');
  vaultEl.hidden = isSpectator;
  if (!isSpectator) {
    const slider = q('slider');
    slider.max = String(myRem);
    slider.disabled = !isMyTurn;
    q('slider-max').textContent = String(myRem);
    container.querySelectorAll('[data-step]').forEach((b) => { b.disabled = !isMyTurn; });
    q('lock-bid').disabled = !isMyTurn;

    // Presets
    const currentFloor = (me.lamps - 1) * 20;
    const stealthMax = Math.max(0, myRem - currentFloor);
    const presets = [
      { label: lang === 'zh' ? '0 弃轮' : '0 Dump', val: 0 },
      { label: lang === 'zh' ? '9 黑顶' : '9 Max-Blk', val: Math.min(9, myRem) },
      { label: lang === 'zh' ? '10 白底' : '10 Min-Wht', val: Math.min(10, myRem) },
      ...(stealthMax >= 11 && stealthMax < myRem
        ? [{ label: lang === 'zh' ? `${stealthMax} 控灯` : `${stealthMax} Stealth`, val: stealthMax }]
        : []),
      { label: `ALL (${myRem})`, val: myRem },
    ];
    q('preset-row').innerHTML = presets
      .map((pr) => `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-preset="${pr.val}" ${!isMyTurn ? 'disabled' : ''}>${UI.escapeHtml(pr.label)}</button>`)
      .join('');

    q('rem-ticks').innerHTML = lang === 'zh'
      ? `<span>0</span><span>20 (2灯)</span><span>40 (3灯)</span><span>60 (4灯)</span><span>80 (5灯)</span><span>99</span>`
      : `<span>0</span><span>20 (2L)</span><span>40 (3L)</span><span>60 (4L)</span><span>80 (5L)</span><span>99</span>`;

    syncDraftInPlace(container, draftBid);
  }

  // Patch 9-Round Ledger
  q('hist-title').textContent = lang === 'zh' ? '9 回合盲注与熄灯记录（左=你 · 右=对手）' : '9-ROUND AUCTION & LAMP LOG (L=YOU · R=RIVAL)';
  q('hist-sub').textContent = isFinished
    ? (lang === 'zh' ? '全部出价已揭晓' : 'ALL BIDS UNSEALED')
    : (lang === 'zh' ? '对手出价全程保密' : 'RIVAL BIDS HIDDEN');

  for (let rNum = 1; rNum <= state.totalRounds; rNum++) {
    const cell = container.querySelector(`[data-hround="${rNum}"]`);
    const tokEl = container.querySelector(`[data-htokens="${rNum}"]`);
    const verdEl = container.querySelector(`[data-hverdict="${rNum}"]`);
    const rec = state.history.find((h) => h.round === rNum);
    if (!cell || !tokEl || !verdEl) continue;

    cell.className = 'bw2-hcell';
    if (!rec) {
      tokEl.innerHTML = `<span style="opacity:0.25;">—</span>`;
      verdEl.textContent = '';
    } else {
      const pMe = rec.plays[viewerId];
      const pOpp = rec.plays[oppId];
      cell.classList.add(rec.isDraw ? 'is-draw' : rec.winnerSeatId === viewerId ? 'is-win-me' : 'is-win-opp');
      tokEl.innerHTML = `
        <span class="bw2-hmini is-${pMe.color}">${pMe.bid != null ? pMe.bid : '?'}</span>
        <span class="bw2-hmini is-${pOpp.color}">${pOpp.bid != null ? pOpp.bid : (pOpp.lampDrop > 0 ? `−${pOpp.lampDrop}⚡` : '?')}</span>
      `;
      verdEl.textContent = rec.isDraw ? (lang === 'zh' ? '平' : 'TIE') : rec.winnerSeatId === viewerId ? (lang === 'zh' ? '胜' : 'WIN') : (lang === 'zh' ? '负' : 'LOSS');
      verdEl.style.color = rec.isDraw ? 'var(--tg-cyan-ink)' : rec.winnerSeatId === viewerId ? 'var(--tg-gold-bright)' : 'var(--tg-garnet-ink)';
    }
  }
}

mountGame({
  config: {
    id: 'black-and-white-2',
    title: { zh: '黑与白II', en: 'Black and White II', ko: '흑과 백 II' },
    seasons: ['S3'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'timedMode',
        label: { zh: '启用 35 秒倒计时', en: '35s Turn Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 对决目标
双方各持 **99 点能量**，分 9 回合进行盲注拍卖！先赢得 **5 局**（或领先对手无法追平）者获胜。

### 两大核心情报线索（点数本身全程保密）
- **黑白双色牌**：投入 \`0–9\`（个位数）亮**黑牌**；投入 \`10–99\`（两位数）亮**白牌**。
- **5 格剩余能量灯（实时熄灭！）**：确认出价瞬间立即按新剩余点数更新——
  - \`80–99\` 点 = 5 盏灯
  - \`60–79\` 点 = 4 盏灯
  - \`40–59\` 点 = 3 盏灯
  - \`20–39\` 点 = 2 盏灯
  - \`1–19\` 点 = 1 盏灯
  - \`0\` 点 = 0 盏灯

### 心理与算术博弈
- 先手确认出价后，后手**立刻**能看到对手的黑白颜色与**熄灭了几盏能量灯**（例如连灭 2 盏代表至少砸了 21 点，此时可果断出 \`0\` 弃轮省点！）。
- 出价高者得 +1 分并成为下轮先手；相同点数为平局（0 分，先手不变）。已投入点数永久消耗。`,
      en: `### Objective
Budget **99 points** across 9 blind rounds! First to **5 Win Points** (or an insurmountable lead) survives.

### Two Live Public Clues (Exact Bids Stay Hidden)
- **Black / White Plaque**: \`0–9\` (single digit) flashes **BLACK**; \`10–99\` (double digit) flashes **WHITE**.
- **5-Lamp Energy Gauge (Updates Instantly!)**: The moment a player locks a bid, their lamps update to reflect remaining points:
  - \`80–99\` = 5 lamps · \`60–79\` = 4 · \`40–59\` = 3 · \`20–39\` = 2 · \`1–19\` = 1 · \`0\` = 0.

### Strategy
- When First Player locks a bid, Second Player immediately sees both the Black/White plaque AND how many lamps just went dark!
- Higher bid wins **+1 Win Point** and leads next round. Equal bids = Draw (0 pts, First Player stays). Spent points are gone forever.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderStage,
});

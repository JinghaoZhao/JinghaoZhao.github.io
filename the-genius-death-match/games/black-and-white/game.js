/**
 * Black and White (黑与白 · 흑과 백) — Interactive Broadcast Stage
 * Persistent DOM Skeleton + In-Place Patching + Motion SDK Telemetry
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import { GameRules, getTileColor } from './rules.js';

const ALL_TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

let selectedTile = null;
let lastHandledEventTs = null;
let lastRoundKey = null;
let prevScoreMe = null;
let prevScoreOpp = null;
let prevMyPlayKey = null;
let prevOppPlayKey = null;
let latestCtx = null;

function colorLabel(color, lang) {
  if (color === 'black') return lang === 'zh' ? '黑 · 偶数' : 'BLACK · EVEN';
  return lang === 'zh' ? '白 · 奇数' : 'WHITE · ODD';
}

function colorShort(color, lang) {
  if (color === 'black') return lang === 'zh' ? '黑' : 'BLK';
  return lang === 'zh' ? '白' : 'WHT';
}

function mountSkeleton(container) {
  container.innerHTML = `
    <div class="bw-arena" data-bw-root>
      <section class="bw-scoreboard">
        <div class="bw-score-side">
          <div class="bw-player-header">
            <span class="bw-player-name" data-el="me-name"></span>
            <span class="bw-first-tag" data-el="me-first" hidden></span>
          </div>
          <div class="bw-pips" data-el="me-pips" aria-label="Your win points">
            ${Array.from({ length: 5 }, (_, i) => `<span class="bw-pip" data-pip="${i}"></span>`).join('')}
          </div>
          <div class="bw-rem-counts">
            <span data-el="rem-label-me"></span>
            <span class="bw-color-pill is-black" data-el="me-rem-b">■ 5</span>
            <span class="bw-color-pill is-white" data-el="me-rem-w">□ 4</span>
          </div>
        </div>

        <div class="bw-score-center">
          <div class="bw-big-score">
            <span class="bw-score-num is-gold" data-el="score-me">0</span>
            <span style="font-size:18px;opacity:0.4;">:</span>
            <span class="bw-score-num is-garnet" data-el="score-opp">0</span>
          </div>
          <div class="bw-round-sub" data-el="round-sub"></div>
        </div>

        <div class="bw-score-side is-right">
          <div class="bw-player-header">
            <span class="bw-first-tag" data-el="opp-first" hidden></span>
            <span class="bw-player-name" data-el="opp-name"></span>
          </div>
          <div class="bw-pips" data-el="opp-pips" aria-label="Opponent win points">
            ${Array.from({ length: 5 }, (_, i) => `<span class="bw-pip" data-pip="${i}"></span>`).join('')}
          </div>
          <div class="bw-rem-counts">
            <span data-el="rem-label-opp"></span>
            <span class="bw-color-pill is-black" data-el="opp-rem-b">■ 5</span>
            <span class="bw-color-pill is-white" data-el="opp-rem-w">□ 4</span>
          </div>
        </div>
      </section>

      <section class="bw-chamber" data-el="chamber">
        <div class="bw-laser-sweep"></div>
        <div class="bw-chamber-header">
          <div class="bw-chamber-status">
            <span class="tg-badge" data-el="phase-badge"></span>
            <span data-el="status-text"></span>
          </div>
          <span style="font-family:var(--tg-font-mono);font-size:11px;color:var(--tg-ink-faint);" data-el="blind-note"></span>
        </div>

        <div class="bw-chamber-stage">
          <div class="bw-pedestal">
            <span class="bw-pedestal-label" data-el="ped-me-label"></span>
            <div class="bw-monolith is-empty" data-el="monolith-me"></div>
          </div>

          <div class="bw-vs-core">
            <div class="bw-judge-orb" data-el="judge-orb">VS</div>
            <div class="bw-verdict-banner" data-el="verdict-banner" hidden></div>
            <div class="bw-verdict-sub" data-el="verdict-sub"></div>
            <button type="button" class="tg-btn tg-btn-gold" data-el="next-round" style="margin-top:4px;min-width:140px;" hidden></button>
          </div>

          <div class="bw-pedestal">
            <span class="bw-pedestal-label" data-el="ped-opp-label"></span>
            <div class="bw-monolith is-empty" data-el="monolith-opp"></div>
          </div>
        </div>
      </section>

      <section class="bw-rack-panel" data-el="rack-panel">
        <div class="bw-rack-top">
          <span class="bw-rack-title" data-el="rack-title"></span>
          <span style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:12px;color:var(--tg-ink-muted);" data-el="rack-count"></span>
        </div>

        <div class="bw-tile-grid" data-el="tile-grid">
          ${ALL_TILES.map((n) => {
            const color = getTileColor(n);
            return `
              <button
                type="button"
                class="bw-tile-btn is-${color}"
                data-tile="${n}"
                aria-label="Tile ${n} (${color})"
              >
                <span class="bw-tile-num">${n}</span>
                <span class="bw-tile-sub" data-tile-sub="${n}"></span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="bw-action-bar">
          <span class="bw-hint-text" data-el="hint-text"></span>
          <button type="button" class="tg-btn tg-btn-garnet" data-el="confirm-tile" style="min-width:170px;" disabled></button>
        </div>
      </section>

      <section class="bw-history-panel">
        <div class="bw-history-head">
          <span data-el="hist-title"></span>
          <span data-el="hist-sub"></span>
        </div>
        <div class="bw-history-strip" data-el="hist-strip">
          ${Array.from({ length: 9 }, (_, idx) => `
            <div class="bw-hist-cell" data-hist-round="${idx + 1}">
              <span class="bw-hist-round">R${idx + 1}</span>
              <div class="bw-hist-tokens" data-hist-tokens="${idx + 1}"></div>
              <span class="bw-hist-verdict" data-hist-verdict="${idx + 1}">—</span>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  container.dataset.mountedPhase = 'arena';

  // Bind stable event listeners once!
  container.querySelectorAll('.bw-tile-btn[data-tile]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!latestCtx) return;
      const { state, isSpectator, activeSeatId, mySeatId, lang, dispatch, sfx } = latestCtx;
      const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
      const isMyTurn = !isSpectator && (state.phase === 'first_pick' || state.phase === 'second_pick') && state.currentTurnSeatId === viewerId;
      if (!isMyTurn) return;

      const n = Number(btn.dataset.tile);
      if (selectedTile === n) {
        sfx.play('tilePlace');
        Motion.pulseConfirm(btn, { tone: 'gold', duration: 180 });
        selectedTile = null;
        dispatch({ type: 'PLAY_TILE', payload: { tile: n } });
        return;
      }
      sfx.play('click');
      selectedTile = n;
      syncSelectionUI(container, lang);
    });
  });

  container.querySelector('[data-el="confirm-tile"]').addEventListener('click', () => {
    if (!latestCtx || selectedTile === null) return;
    const { state, isSpectator, activeSeatId, mySeatId, dispatch, sfx } = latestCtx;
    const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
    const isMyTurn = !isSpectator && (state.phase === 'first_pick' || state.phase === 'second_pick') && state.currentTurnSeatId === viewerId;
    if (!isMyTurn) return;
    const tileToPlay = selectedTile;
    selectedTile = null;
    sfx.play('tilePlace');
    dispatch({ type: 'PLAY_TILE', payload: { tile: tileToPlay } });
  });

  container.querySelector('[data-el="next-round"]').addEventListener('click', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    latestCtx.dispatch({ type: 'NEXT_ROUND' });
  });
}

function syncSelectionUI(container, lang) {
  container.querySelectorAll('.bw-tile-btn[data-tile]').forEach((b) => {
    b.classList.toggle('is-selected', selectedTile !== null && Number(b.dataset.tile) === selectedTile && !b.classList.contains('is-used'));
  });
  const confirmBtn = container.querySelector('[data-el="confirm-tile"]');
  if (confirmBtn) confirmBtn.disabled = selectedTile === null;
  const hintEl = container.querySelector('[data-el="hint-text"]');
  if (hintEl && selectedTile !== null) {
    hintEl.textContent =
      lang === 'zh'
        ? `已选【${selectedTile}】（${colorLabel(getTileColor(selectedTile), 'zh')}），再次点击或确认出牌`
        : `Selected [${selectedTile}] (${colorLabel(getTileColor(selectedTile), 'en')}) — click again or Lock Tile`;
  }
}

function patchMonolith(el, play, isWinner, isLoser, isAwaiting, lang, triggerEnter) {
  el.className = 'bw-monolith';
  if (!play) {
    el.classList.add('is-empty');
    if (isAwaiting) el.classList.add('is-awaiting');
    el.innerHTML = `
      <span style="font-size:24px;opacity:0.45;">${isAwaiting ? '◈' : '—'}</span>
      <span class="bw-monolith-tag">${
        isAwaiting
          ? (lang === 'zh' ? '等待落砖' : 'AWAITING')
          : (lang === 'zh' ? '未出牌' : 'EMPTY')
      }</span>
    `;
    return;
  }
  el.classList.add(`is-${play.color}`);
  if (isWinner) el.classList.add('is-winner');
  if (isLoser) el.classList.add('is-loser');
  if (triggerEnter && !Motion.reduced()) {
    el.classList.add('is-entering');
    setTimeout(() => el.classList.remove('is-entering'), 280);
  }
  const showNum = play.num !== null && play.num !== undefined;
  el.innerHTML = `
    ${showNum ? `<span class="bw-monolith-num">${play.num}</span>` : `<span class="bw-monolith-mystery">?</span>`}
    <span class="bw-monolith-tag">${colorLabel(play.color, lang)}</span>
  `;
}

function renderStage(container, ctx) {
  latestCtx = ctx;
  const { state, mySeatId, activeSeatId, isSpectator, lang, lastEvent, sfx, log } = ctx;
  if (!state) return;

  if (container.dataset.mountedPhase !== 'arena' || !container.querySelector('[data-bw-root]')) {
    prevScoreMe = null;
    prevScoreOpp = null;
    prevMyPlayKey = null;
    prevOppPlayKey = null;
    mountSkeleton(container);
  }

  const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
  const oppId = state.seatOrder.find((id) => id !== viewerId) || state.seatOrder[1];
  const me = state.players[viewerId];
  const opp = state.players[oppId];

  const roundKey = `${state.round}-${state.phase}-${viewerId}`;
  if (roundKey !== lastRoundKey) {
    lastRoundKey = roundKey;
    selectedTile = null;
  }

  const chamberEl = container.querySelector('[data-el="chamber"]');

  // Audio cues, Motion feedback & log on new events
  if (lastEvent && lastEvent.ts && lastEvent.ts !== lastHandledEventTs) {
    lastHandledEventTs = lastEvent.ts;
    if (lastEvent.type === 'FIRST_TILE_PLACED') {
      sfx.play('tilePlace');
      const actorName = state.players[lastEvent.seatId]?.name || '';
      log(
        lang === 'zh'
          ? `第 ${lastEvent.round} 回合：${actorName} 打出【${colorShort(lastEvent.color, 'zh')}砖】`
          : `R${lastEvent.round}: ${actorName} placed [${colorShort(lastEvent.color, 'en')}] tile`,
        'system'
      );
    } else if (lastEvent.type === 'ROUND_RESOLVED') {
      sfx.play('heartbeat');
      if (chamberEl && !Motion.reduced()) {
        chamberEl.classList.remove('is-judging');
        void chamberEl.offsetWidth;
        chamberEl.classList.add('is-judging');
      }
      setTimeout(() => {
        if (lastEvent.isDraw) {
          sfx.play('reveal');
        } else if (lastEvent.winnerSeatId === viewerId) {
          sfx.play('garnetClink');
          Motion.pulseConfirm(container.querySelector('[data-el="judge-orb"]'), { tone: 'gold' });
        } else {
          sfx.play('clash');
          Motion.nudgeError(chamberEl, { intensity: 'subtle' });
        }
      }, 240);
      const wName = lastEvent.winnerSeatId ? state.players[lastEvent.winnerSeatId]?.name : null;
      log(
        lastEvent.isDraw
          ? lang === 'zh'
            ? `第 ${lastEvent.round} 回合暗牌裁决：平局`
            : `R${lastEvent.round} Verdict: Draw`
          : lang === 'zh'
          ? `第 ${lastEvent.round} 回合暗牌裁决：${wName} 胜 (+1)`
          : `R${lastEvent.round} Verdict: ${wName} wins (+1)`,
        'alert'
      );
    } else if (lastEvent.type === 'ROUND_STARTED') {
      sfx.play('click');
      chamberEl?.classList.remove('is-judging');
    }
  }

  const isMyTurn = !isSpectator && (state.phase === 'first_pick' || state.phase === 'second_pick') && state.currentTurnSeatId === viewerId;
  const isRoundResult = state.phase === 'round_result';
  const isFinished = state.phase === 'finished';

  // Patch Scoreboard
  const q = (k) => container.querySelector(`[data-el="${k}"]`);
  q('me-name').textContent = `${me.name}${!isSpectator ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}`;
  q('opp-name').textContent = opp.name;

  const meFirst = q('me-first');
  meFirst.hidden = state.firstSeatId !== viewerId;
  meFirst.textContent = lang === 'zh' ? '先手' : '1ST';
  const oppFirst = q('opp-first');
  oppFirst.hidden = state.firstSeatId !== oppId;
  oppFirst.textContent = lang === 'zh' ? '先手' : '1ST';

  q('me-pips').querySelectorAll('.bw-pip').forEach((p, idx) => {
    const won = idx < me.score;
    const wasWon = p.classList.contains('is-won-me');
    p.classList.toggle('is-won-me', won);
    if (won && !wasWon && prevScoreMe !== null) {
      Motion.pulseConfirm(p, { tone: 'gold', duration: 240 });
    }
  });
  q('opp-pips').querySelectorAll('.bw-pip').forEach((p, idx) => {
    p.classList.toggle('is-won-opp', idx < opp.score);
  });

  q('rem-label-me').textContent = lang === 'zh' ? '剩余:' : 'Left:';
  q('rem-label-opp').textContent = lang === 'zh' ? '剩余:' : 'Left:';
  q('me-rem-b').textContent = `■ ${me.remainingCounts.black}`;
  q('me-rem-w').textContent = `□ ${me.remainingCounts.white}`;
  q('opp-rem-b').textContent = `■ ${opp.remainingCounts.black}`;
  q('opp-rem-w').textContent = `□ ${opp.remainingCounts.white}`;

  const scoreMeEl = q('score-me');
  const scoreOppEl = q('score-opp');
  if (prevScoreMe === null) {
    scoreMeEl.textContent = String(me.score);
    scoreOppEl.textContent = String(opp.score);
  } else {
    if (me.score !== prevScoreMe) {
      Motion.animateNumber(scoreMeEl, prevScoreMe, me.score, { duration: 280, deltaEl: scoreMeEl });
    }
    if (opp.score !== prevScoreOpp) {
      Motion.animateNumber(scoreOppEl, prevScoreOpp, opp.score, { duration: 280, deltaEl: scoreOppEl });
    }
  }
  prevScoreMe = me.score;
  prevScoreOpp = opp.score;

  q('round-sub').textContent = lang === 'zh'
    ? `第 ${state.round} / ${state.totalRounds} 回合 · 先得 ${state.winTarget} 分胜`
    : `ROUND ${state.round} / ${state.totalRounds} · FIRST TO ${state.winTarget}`;

  // Patch Judge Chamber
  const cr = state.currentRound || {};
  const myPlay = cr.firstPlay?.seatId === viewerId ? cr.firstPlay : cr.secondPlay?.seatId === viewerId ? cr.secondPlay : null;
  const oppPlay = cr.firstPlay?.seatId === oppId ? cr.firstPlay : cr.secondPlay?.seatId === oppId ? cr.secondPlay : null;
  const myWonRound = isRoundResult && cr.winnerSeatId === viewerId;
  const oppWonRound = isRoundResult && cr.winnerSeatId === oppId;
  const drawRound = isRoundResult && cr.isDraw;

  const phaseBadge = q('phase-badge');
  phaseBadge.className = `tg-badge ${isMyTurn ? 'tg-badge-gold' : isRoundResult ? 'tg-badge-garnet' : 'tg-badge-cyan'}`;
  phaseBadge.textContent = I18n.t(state.phaseLabel);

  let statusText = '';
  if (isFinished) {
    statusText = lang === 'zh' ? '终局复盘：所有暗牌数字已解封' : 'Final Review: All secret numerals unsealed';
  } else if (isRoundResult) {
    if (drawRound) {
      statusText = lang === 'zh' ? '暗牌平局！数字相同，先手权不变' : 'Blind Draw! Equal numerals — first player unchanged';
    } else if (myWonRound) {
      statusText = lang === 'zh' ? `你赢下第 ${state.round} 回合！获得 +1 胜分与下轮先手权` : `You won Round ${state.round}! +1 pt & lead next round`;
    } else {
      statusText = lang === 'zh' ? `${opp.name} 赢下第 ${state.round} 回合（对方数字保持保密）` : `${opp.name} won Round ${state.round} (numeral hidden)`;
    }
  } else if (isMyTurn) {
    statusText = state.phase === 'first_pick'
      ? (lang === 'zh' ? '轮到你先手出牌：选择 1 张砖扣入裁决台（对手仅见黑白）' : 'Your turn [FIRST]: Lock 1 tile face-down (color only visible)')
      : (lang === 'zh' ? `对手已出【${colorLabel(oppPlay?.color, 'zh')}】！轮到你后手应战` : `Rival played [${colorLabel(oppPlay?.color, 'en')}]! Lock your counter`);
  } else {
    const actor = state.players[state.currentTurnSeatId];
    statusText = lang === 'zh' ? `等待 ${actor?.name || ''} 秘密选牌...` : `Waiting for ${actor?.name || ''} to lock a tile...`;
  }
  q('status-text').textContent = statusText;
  q('blind-note').textContent = lang === 'zh' ? '盲比规则 · 数字全程保密' : 'BLIND COMPARE · NUMERALS HIDDEN';

  q('ped-me-label').textContent = me.name;
  q('ped-opp-label').textContent = opp.name;

  const myPlayKey = myPlay ? `${state.round}-${myPlay.color}-${myPlay.num}` : null;
  const oppPlayKey = oppPlay ? `${state.round}-${oppPlay.color}-${oppPlay.num}` : null;
  patchMonolith(q('monolith-me'), myPlay, myWonRound, oppWonRound, !myPlay && state.currentTurnSeatId === viewerId, lang, Boolean(myPlayKey && myPlayKey !== prevMyPlayKey));
  patchMonolith(q('monolith-opp'), oppPlay, oppWonRound, myWonRound, !oppPlay && state.currentTurnSeatId === oppId, lang, Boolean(oppPlayKey && oppPlayKey !== prevOppPlayKey));
  prevMyPlayKey = myPlayKey;
  prevOppPlayKey = oppPlayKey;

  const orbEl = q('judge-orb');
  orbEl.className = `bw-judge-orb ${isRoundResult ? (drawRound ? 'is-draw' : myWonRound ? 'is-win' : 'is-loss') : ''}`;
  orbEl.textContent = isRoundResult
    ? (drawRound ? (lang === 'zh' ? '平' : 'TIE') : myWonRound ? (lang === 'zh' ? '胜' : 'WIN') : (lang === 'zh' ? '负' : 'LOSE'))
    : 'VS';

  const vBanner = q('verdict-banner');
  const vSub = q('verdict-sub');
  const nextBtn = q('next-round');
  if (isRoundResult) {
    vBanner.hidden = false;
    vBanner.textContent = drawRound
      ? (lang === 'zh' ? '平局 · 0 分' : 'DRAW · 0 PTS')
      : myWonRound
      ? (lang === 'zh' ? '+1 胜分！' : '+1 WIN PT!')
      : (lang === 'zh' ? '对手 +1 胜分' : 'RIVAL +1 PT');
    vSub.textContent = drawRound
      ? (lang === 'zh' ? '先手权保持不变' : 'First player unchanged')
      : myWonRound
      ? (lang === 'zh' ? '下回合由你先手' : 'You lead next round')
      : (lang === 'zh' ? `下回合由 ${opp.name} 先手` : `${opp.name} leads next`);
    nextBtn.hidden = isSpectator;
    nextBtn.textContent = lang === 'zh' ? '下一回合 →' : 'Next Round →';
  } else {
    vBanner.hidden = true;
    vSub.textContent = state.phase === 'first_pick'
      ? (lang === 'zh' ? '先手盲出' : 'First Lead')
      : state.phase === 'second_pick'
      ? (lang === 'zh' ? '等待后手应战' : 'Awaiting Counter')
      : (lang === 'zh' ? '对决结束' : 'Match Complete');
    nextBtn.hidden = true;
  }

  // Patch Tile Rack
  const rackPanel = q('rack-panel');
  rackPanel.hidden = isSpectator;
  if (!isSpectator) {
    q('rack-title').textContent = lang === 'zh'
      ? '你的数字砖架（黑=偶 0,2,4,6,8 · 白=奇 1,3,5,7）'
      : 'YOUR TILE RACK (BLACK=EVEN 0,2,4,6,8 · WHITE=ODD 1,3,5,7)';
    q('rack-count').textContent = lang === 'zh'
      ? `剩余 ${me.remainingCounts.total} / 9 张`
      : `${me.remainingCounts.total} / 9 LEFT`;

    const myHandSet = new Set(me.hand || []);
    container.querySelectorAll('.bw-tile-btn[data-tile]').forEach((btn) => {
      const n = Number(btn.dataset.tile);
      const available = myHandSet.has(n);
      btn.classList.toggle('is-used', !available);
      btn.classList.toggle('is-selected', selectedTile === n && available);
      btn.disabled = !available || !isMyTurn;
      const sub = btn.querySelector(`[data-tile-sub="${n}"]`);
      if (sub) sub.textContent = colorShort(getTileColor(n), lang);
    });

    const confirmBtn = q('confirm-tile');
    confirmBtn.textContent = lang === 'zh' ? '锁定出牌' : 'Lock Tile';
    confirmBtn.disabled = !isMyTurn || selectedTile === null;

    q('hint-text').textContent = isMyTurn
      ? selectedTile !== null
        ? (lang === 'zh' ? `已选【${selectedTile}】（${colorLabel(getTileColor(selectedTile), 'zh')}），再次点击或确认出牌` : `Selected [${selectedTile}] — click again or Lock Tile`)
        : (lang === 'zh' ? '点击任意未用数字砖选择，双击直接出牌' : 'Click any tile to select, or double-click to play')
      : isRoundResult
      ? (lang === 'zh' ? '请查看裁决并点击「下一回合」继续' : 'Review the verdict and press Next Round')
      : (lang === 'zh' ? '等待对手行动...' : 'Waiting for rival...');
  }

  // Patch 9-Round Deduction Ledger
  q('hist-title').textContent = lang === 'zh'
    ? '9 回合黑白推理记录（左=你 · 右=对手）'
    : '9-ROUND DEDUCTION LEDGER (L=YOU · R=RIVAL)';
  q('hist-sub').textContent = isFinished
    ? (lang === 'zh' ? '终局已揭晓全部数字' : 'ALL NUMERALS UNSEALED')
    : (lang === 'zh' ? '对手数字全程隐藏' : 'RIVAL NUMERALS HIDDEN');

  for (let rNum = 1; rNum <= state.totalRounds; rNum++) {
    const cell = container.querySelector(`[data-hist-round="${rNum}"]`);
    const tokWrap = container.querySelector(`[data-hist-tokens="${rNum}"]`);
    const verdEl = container.querySelector(`[data-hist-verdict="${rNum}"]`);
    const rec = state.history.find((h) => h.round === rNum);
    if (!cell || !tokWrap || !verdEl) continue;

    cell.className = 'bw-hist-cell';
    if (!rec) {
      const isCurr = rNum === state.round && !isFinished;
      if (isCurr) cell.classList.add('is-current');
      tokWrap.innerHTML = `<span style="opacity:0.25;font-size:14px;">· ·</span>`;
      verdEl.textContent = isCurr ? 'LIVE' : '—';
      verdEl.style.color = 'var(--tg-ink-faint)';
    } else {
      const pMe = rec.plays[viewerId];
      const pOpp = rec.plays[oppId];
      cell.classList.add(rec.isDraw ? 'is-draw' : rec.winnerSeatId === viewerId ? 'is-win-me' : 'is-win-opp');
      tokWrap.innerHTML = `
        <span class="bw-mini-tile is-${pMe.color}">${pMe.num !== null ? pMe.num : '?'}</span>
        <span class="bw-mini-tile is-${pOpp.color}">${pOpp.num !== null ? pOpp.num : '?'}</span>
      `;
      verdEl.textContent = rec.isDraw
        ? (lang === 'zh' ? '平' : 'TIE')
        : rec.winnerSeatId === viewerId
        ? (lang === 'zh' ? '胜' : 'WIN')
        : (lang === 'zh' ? '负' : 'LOSS');
      verdEl.style.color = rec.isDraw
        ? 'var(--tg-cyan-ink)'
        : rec.winnerSeatId === viewerId
        ? 'var(--tg-gold-bright)'
        : 'var(--tg-garnet-ink)';
    }
  }
}

mountGame({
  config: {
    id: 'black-and-white',
    title: { zh: '黑与白', en: 'Black and White', ko: '흑과 백' },
    seasons: ['S2', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'timedMode',
        label: { zh: '启用 30 秒倒计时', en: '30s Turn Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 对决目标
双方各持 **0–8 共 9 张数字砖**，进行 9 回合心理暗战，先获得 **5 分**（或对手数学上无法追平）者获胜！

### 黑白颜色法则
- **黑砖（偶数）**：\`0, 2, 4, 6, 8\`（共 5 张）
- **白砖（奇数）**：\`1, 3, 5, 7\`（共 4 张）

### 回合流程
- **先手出牌**：由当轮先手秘密选择 1 张未用过的砖扣在裁决台。对手**仅能看到黑白颜色**，看不到具体数字！
- **后手应战**：后手根据对手的颜色线索，选择 1 张砖扣上裁决台。
- **暗牌裁决**：系统秘密比较大小——数字较大者得 **+1 胜分**，并成为**下一回合的先手**；数字相同为平局（0 分，先手不变）。
- **绝对保密**：整场对局中，双方**永远不会看到对手打出的具体数字**，只能靠黑白颜色、剩余黑白数量与胜负结果推理对手残牌！`,
      en: `### Objective
Each player holds tiles **0 through 8** across 9 blind rounds. First to **5 Win Points** (or an insurmountable lead) survives the Death Match!

### Black & White Color Code
- **BLACK (Even)**: \`0, 2, 4, 6, 8\` (5 tiles)
- **WHITE (Odd)**: \`1, 3, 5, 7\` (4 tiles)

### Round Flow
- **First Player**: Places 1 unused tile face-down into the Judge Chamber. The rival sees **ONLY Black or White** — never the numeral!
- **Second Player**: Reads the color clue and responds with 1 unused tile face-down.
- **Blind Verdict**: Higher number wins **+1 Win Point** and becomes **First Player next round**. Equal numbers = Draw (0 pts, First Player unchanged).
- **Zero Number Reveal**: Opponent's played numbers are **NEVER revealed** during the match! Deduce their remaining tiles solely from colors and outcomes.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderStage,
});

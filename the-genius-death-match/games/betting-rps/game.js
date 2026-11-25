/**
 * Betting! Rock, Paper, Scissors (下注猜拳 · 베팅! 가위바위보)
 * Interactive Neon Velvet Broadcast Sportsbook Stage
 * Persistent DOM Skeleton + In-Place Ticket/Wager Patching + Motion SDK Telemetry
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import {
  GameRules,
  SIGNS,
  resolveRpsOutcome,
  computeGuestPosterior,
} from './rules.js';

const SIGN_META = {
  rock: { glyph: '✊', zh: '石头', en: 'ROCK' },
  paper: { glyph: '✋', zh: '布', en: 'PAPER' },
  scissors: { glyph: '✌️', zh: '剪刀', en: 'SCISSORS' },
};

let draftPred = 'win';
let draftWager = 1;
let lastBetKey = null;
let lastEventTs = null;
let prevChipsMe = null;
let prevChipsOpp = null;
let prevRailCount = 0;
let prevDuelCardKey = null;
let latestCtx = null;

function signText(sign, lang) {
  if (!sign || !SIGN_META[sign]) return '?';
  return `${SIGN_META[sign].glyph} ${SIGN_META[sign][lang]}`;
}

function predText(pred, lang) {
  if (pred === 'win') return lang === 'zh' ? '押胜 (2×)' : 'WIN (2×)';
  if (pred === 'lose') return lang === 'zh' ? '押负 (2×)' : 'LOSE (2×)';
  if (pred === 'draw') return lang === 'zh' ? '押平 (3×)' : 'DRAW (3×)';
  return '—';
}

function outcomeText(out, lang) {
  if (out === 'win') return lang === 'zh' ? '决斗者胜' : 'DUELIST WINS';
  if (out === 'lose') return lang === 'zh' ? '决斗者负' : 'DUELIST LOSES';
  if (out === 'draw') return lang === 'zh' ? '平局' : 'DRAW';
  return '—';
}

function mountSkeleton(container) {
  container.innerHTML = `
    <div class="brps-arena" data-brps-root>
      <section class="brps-score-bar">
        <div class="brps-player-box">
          <div>
            <div style="font-weight:700;font-size:14.5px;" data-el="me-name"></div>
            <div style="font-size:11px;color:var(--tg-ink-muted);" data-el="me-role"></div>
          </div>
          <span class="brps-chip-vault" data-el="me-vault">◈ <span data-el="me-chips">1</span></span>
        </div>

        <div style="text-align:center;">
          <div style="font-family:var(--tg-font-display);font-variant-numeric:tabular-nums;font-size:18px;font-weight:800;color:var(--tg-gold-bright);" data-el="round-title"></div>
          <span class="tg-badge" data-el="phase-badge"></span>
        </div>

        <div class="brps-player-box is-right">
          <span class="brps-chip-vault is-opp" data-el="opp-vault">◈ <span data-el="opp-chips">1</span></span>
          <div>
            <div style="font-weight:700;font-size:14.5px;" data-el="opp-name"></div>
            <div style="font-size:11px;color:var(--tg-ink-muted);" data-el="opp-role"></div>
          </div>
        </div>
      </section>

      <section class="brps-rail-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;letter-spacing:0.08em;color:var(--tg-ink-muted);text-transform:uppercase;">
          <span data-el="rail-title"></span>
          <span data-el="rail-note"></span>
        </div>
        <div class="brps-rail-grid" data-el="rail-grid"></div>
      </section>

      <section class="brps-stage" data-el="clash-stage">
        <div class="brps-duel-grid">
          <div class="brps-emblem-pedestal">
            <span class="tg-badge tg-badge-gold" data-el="duelist-badge"></span>
            <div class="brps-emblem-card" data-el="duelist-card">
              <span class="brps-emblem-glyph" data-el="duelist-glyph">?</span>
              <span class="brps-emblem-name" data-el="duelist-sign-name"></span>
            </div>
            <span style="font-size:11.5px;color:var(--tg-ink-muted);font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;" data-el="reward-note"></span>
          </div>

          <div class="brps-center-col">
            <div data-el="result-center" style="display:flex;flex-direction:column;align-items:center;gap:8px;" hidden>
              <div style="font-family:var(--tg-font-display);font-size:24px;font-weight:900;" data-el="res-outcome"></div>
              <div style="font-size:12.5px;color:var(--tg-ink-muted);display:flex;flex-direction:column;gap:4px;" data-el="res-breakdown"></div>
              <button type="button" class="tg-btn tg-btn-gold" data-el="next-round" style="min-width:154px;margin-top:4px;" hidden></button>
            </div>

            <div data-el="live-center" style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;">
              <span style="font-family:var(--tg-font-display);font-size:24px;font-weight:900;color:var(--tg-gold-bright);">VS</span>
              <div class="brps-odds-box">
                <div style="font-size:10.5px;font-weight:700;color:var(--tg-gold-bright);letter-spacing:0.08em;" data-el="odds-label"></div>
                <div class="brps-odds-row">
                  <span data-el="pct-rock">✊ 33%</span>
                  <span data-el="pct-paper">✋ 33%</span>
                  <span data-el="pct-scissors">✌️ 33%</span>
                </div>
                <div class="brps-odds-bars">
                  <div class="brps-odds-track"><span class="brps-odds-fill is-rock" data-el="bar-rock"></span></div>
                  <div class="brps-odds-track"><span class="brps-odds-fill is-paper" data-el="bar-paper"></span></div>
                  <div class="brps-odds-track"><span class="brps-odds-fill is-scissors" data-el="bar-scissors"></span></div>
                </div>
              </div>
              <div class="brps-whisper-pill" data-el="whisper-pill" hidden></div>
              <div style="font-size:12px;color:var(--tg-cyan-ink);" data-el="vp-tip" hidden></div>
            </div>
          </div>

          <div class="brps-emblem-pedestal">
            <span class="tg-badge" data-el="guest-badge"></span>
            <div class="brps-emblem-card" data-el="guest-card">
              <span class="brps-emblem-glyph" data-el="guest-glyph">🎭</span>
              <span class="brps-emblem-name" data-el="guest-sign-name"></span>
            </div>
            <span style="font-size:11.5px;color:var(--tg-ink-muted);" data-el="guest-trait"></span>
          </div>
        </div>
      </section>

      <section class="brps-console" data-el="console">
        <div data-panel="wait" style="text-align:center;color:var(--tg-ink-muted);padding:10px;" hidden></div>

        <div data-panel="role" style="display:flex;flex-direction:column;gap:12px;" hidden>
          <div style="font-size:13px;font-weight:700;color:var(--tg-gold-bright);" data-el="role-heading"></div>
          <div class="brps-role-grid">
            <button type="button" class="brps-role-card" data-role="duel">
              <span class="tg-badge tg-badge-gold" data-el="role-a-tag"></span>
              <strong style="font-size:16px;" data-el="role-a-title"></strong>
              <span style="font-size:12px;color:var(--tg-ink-muted);" data-el="role-a-desc"></span>
            </button>
            <button type="button" class="brps-role-card" data-role="bet">
              <span class="tg-badge tg-badge-garnet" data-el="role-b-tag"></span>
              <strong style="font-size:16px;" data-el="role-b-title"></strong>
              <span style="font-size:12px;color:var(--tg-ink-muted);" data-el="role-b-desc"></span>
            </button>
          </div>
        </div>

        <div data-panel="duel" style="display:flex;flex-direction:column;gap:12px;" hidden>
          <div style="font-size:13px;font-weight:700;color:var(--tg-gold-bright);" data-el="duel-heading"></div>
          <div class="brps-rps-grid">
            ${SIGNS.map((s) => `
              <button type="button" class="brps-rps-btn" data-sign="${s}">
                <span style="font-size:40px;line-height:1;">${SIGN_META[s].glyph}</span>
                <strong style="font-size:15px;" data-sign-label="${s}"></strong>
                <span style="font-family:var(--tg-font-mono);font-size:10.5px;color:var(--tg-gold-bright);" data-sign-hint="${s}" hidden></span>
              </button>
            `).join('')}
          </div>
        </div>

        <div data-panel="bet-zero" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;" hidden>
          <span style="color:var(--tg-ink-muted);font-size:13px;" data-el="zero-bet-msg"></span>
          <button type="button" class="tg-btn tg-btn-garnet" data-el="confirm-bet-zero"></button>
        </div>

        <div data-panel="bet" style="display:flex;flex-direction:column;gap:12px;" hidden>
          <div style="font-size:13px;font-weight:700;color:var(--tg-gold-bright);" data-el="bet-heading"></div>
          <div class="brps-ticket-grid" data-el="ticket-grid">
            <button type="button" class="brps-ticket" data-pred="win">
              <span class="tg-badge tg-badge-emerald" data-el="t-win-tag"></span>
              <strong style="font-size:15px;" data-el="t-win-title"></strong>
              <span style="font-size:11px;color:var(--tg-ink-muted);" data-el="t-win-sub"></span>
            </button>
            <button type="button" class="brps-ticket is-draw" data-pred="draw">
              <span class="tg-badge tg-badge-cyan" data-el="t-draw-tag"></span>
              <strong style="font-size:15px;" data-el="t-draw-title"></strong>
              <span style="font-size:11px;color:var(--tg-ink-muted);" data-el="t-draw-sub"></span>
            </button>
            <button type="button" class="brps-ticket" data-pred="lose">
              <span class="tg-badge tg-badge-garnet" data-el="t-lose-tag"></span>
              <strong style="font-size:15px;" data-el="t-lose-title"></strong>
              <span style="font-size:11px;color:var(--tg-ink-muted);" data-el="t-lose-sub"></span>
            </button>
          </div>

          <div class="brps-wager-row">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:12px;color:var(--tg-ink-muted);" data-el="wager-lbl"></span>
              <div class="tg-dial">
                <button type="button" class="tg-btn tg-btn-icon tg-btn-sm" data-el="w-dec">−</button>
                <span class="tg-dial-value" data-el="w-val">1</span>
                <button type="button" class="tg-btn tg-btn-icon tg-btn-sm" data-el="w-inc">+</button>
              </div>
              <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-wfrac="min">1</button>
              <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-wfrac="half">50%</button>
              <button type="button" class="tg-btn tg-btn-sm tg-btn-gold" data-wfrac="all" data-el="w-all">ALL-IN</button>
            </div>

            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:12px;color:var(--tg-emerald-ink);" data-el="proj-win"></span>
              <button type="button" class="tg-btn tg-btn-garnet" data-el="confirm-bet" style="min-width:170px;"></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  container.dataset.mountedPhase = 'arena';

  // Bind stable listeners ONCE — zero innerHTML nukes on ticket/wager clicks!
  container.querySelectorAll('[data-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!latestCtx) return;
      latestCtx.sfx.play('click');
      Motion.pulseConfirm(btn, { tone: 'gold', duration: 160 });
      latestCtx.dispatch({ type: 'CHOOSE_ROLE', payload: { role: btn.dataset.role } });
    });
  });

  container.querySelectorAll('[data-sign]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!latestCtx) return;
      latestCtx.sfx.play('cardFlip');
      Motion.pulseConfirm(btn, { tone: 'gold', duration: 160 });
      latestCtx.dispatch({ type: 'PLAY_RPS', payload: { sign: btn.dataset.sign } });
    });
  });

  container.querySelectorAll('[data-pred]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!latestCtx) return;
      latestCtx.sfx.play('click');
      draftPred = btn.dataset.pred;
      patchBetTicketInPlace(container);
    });
  });

  const q = (k) => container.querySelector(`[data-el="${k}"]`);
  q('w-dec').addEventListener('click', () => {
    if (!latestCtx || draftWager <= 1) return;
    latestCtx.sfx.play('click');
    draftWager -= 1;
    patchBetTicketInPlace(container);
  });

  q('w-inc').addEventListener('click', () => {
    if (!latestCtx?.state) return;
    const viewerId = latestCtx.isSpectator ? latestCtx.state.seatOrder[0] : (latestCtx.activeSeatId || latestCtx.mySeatId);
    const maxChips = latestCtx.state.players[viewerId]?.chips ?? 1;
    if (draftWager >= maxChips) return;
    latestCtx.sfx.play('bid');
    draftWager += 1;
    patchBetTicketInPlace(container);
  });

  container.querySelectorAll('[data-wfrac]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!latestCtx?.state) return;
      const viewerId = latestCtx.isSpectator ? latestCtx.state.seatOrder[0] : (latestCtx.activeSeatId || latestCtx.mySeatId);
      const maxChips = latestCtx.state.players[viewerId]?.chips ?? 1;
      latestCtx.sfx.play('chipStack');
      const f = btn.dataset.wfrac;
      if (f === 'min') draftWager = 1;
      else if (f === 'half') draftWager = Math.max(1, Math.ceil(maxChips * 0.5));
      else draftWager = maxChips;
      patchBetTicketInPlace(container);
    });
  });

  const submitBet = () => {
    if (!latestCtx?.state) return;
    const viewerId = latestCtx.isSpectator ? latestCtx.state.seatOrder[0] : (latestCtx.activeSeatId || latestCtx.mySeatId);
    const chips = latestCtx.state.players[viewerId]?.chips ?? 0;
    latestCtx.sfx.play('chipStack');
    latestCtx.dispatch({
      type: 'PLACE_BET',
      payload: { prediction: draftPred, wager: chips === 0 ? 0 : draftWager },
    });
  };
  q('confirm-bet').addEventListener('click', submitBet);
  q('confirm-bet-zero').addEventListener('click', submitBet);

  q('next-round').addEventListener('click', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    latestCtx.dispatch({ type: 'NEXT_ROUND' });
  });
}

function patchBetTicketInPlace(container) {
  if (!latestCtx?.state) return;
  const { state, mySeatId, activeSeatId, isSpectator, lang } = latestCtx;
  const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
  const me = state.players[viewerId];
  const maxChips = me?.chips ?? 0;
  draftWager = maxChips === 0 ? 0 : Math.max(1, Math.min(maxChips, draftWager));

  const q = (k) => container.querySelector(`[data-el="${k}"]`);
  container.querySelectorAll('[data-pred]').forEach((btn) => {
    btn.classList.toggle('is-selected', btn.dataset.pred === draftPred);
  });

  q('w-val').textContent = String(draftWager);
  q('w-dec').disabled = draftWager <= 1;
  q('w-inc').disabled = draftWager >= maxChips;
  q('w-all').textContent = `ALL-IN (${maxChips})`;

  const projectedNetWin = draftWager === 0 ? 0 : draftPred === 'draw' ? draftWager * 2 : draftWager;
  q('proj-win').textContent = lang === 'zh' ? `猜中净赚 +${projectedNetWin}` : `Win Net +${projectedNetWin}`;
  q('confirm-bet').textContent = lang === 'zh' ? `锁定下注 ${draftWager} 枚` : `Lock Bet ${draftWager}`;
}

function renderStage(container, ctx) {
  latestCtx = ctx;
  const { state, mySeatId, activeSeatId, isSpectator, lang, lastEvent, sfx, log } = ctx;
  if (!state) return;

  if (container.dataset.mountedPhase !== 'arena' || !container.querySelector('[data-brps-root]')) {
    prevChipsMe = null;
    prevChipsOpp = null;
    prevRailCount = 0;
    prevDuelCardKey = null;
    mountSkeleton(container);
  }

  const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
  const oppId = state.seatOrder.find((id) => id !== viewerId) || state.seatOrder[1];
  const me = state.players[viewerId];
  const opp = state.players[oppId];
  const entry = state.schedule[state.round - 1];
  const cr = state.currentRound || {};

  const bKey = `${state.round}-${state.phase}-${viewerId}`;
  if (bKey !== lastBetKey) {
    lastBetKey = bKey;
    draftPred = 'win';
    draftWager = Math.min(me.chips, Math.max(1, Math.ceil(me.chips * 0.5)));
  }
  draftWager = me.chips === 0 ? 0 : Math.max(1, Math.min(me.chips, draftWager));

  const q = (k) => container.querySelector(`[data-el="${k}"]`);

  // Audio cues, Motion feedback & log on new events
  if (lastEvent && lastEvent.ts && lastEvent.ts !== lastEventTs) {
    lastEventTs = lastEvent.ts;
    if (lastEvent.type === 'ROLE_CHOSEN') {
      sfx.play('click');
      const dNm = state.players[lastEvent.duelistSeatId]?.name || '';
      const bNm = state.players[lastEvent.bettorSeatId]?.name || '';
      log(lang === 'zh' ? `第 ${lastEvent.round} 轮：${dNm} 猜拳 · ${bNm} 下注` : `R${lastEvent.round}: ${dNm} DUELS · ${bNm} BETS`, 'system');
    } else if (lastEvent.type === 'DUEL_LOCKED') {
      sfx.play('cardFlip');
      const dNm = state.players[lastEvent.duelistSeatId]?.name || '';
      log(lang === 'zh' ? `第 ${lastEvent.round} 轮：${dNm} 已暗锁猜拳手势` : `R${lastEvent.round}: ${dNm} locked their RPS card`, 'system');
    } else if (lastEvent.type === 'CLASH_RESOLVED') {
      sfx.play('clash');
      setTimeout(() => {
        const myDelta =
          (lastEvent.duelistSeatId === viewerId ? lastEvent.duelistDelta : 0) +
          (lastEvent.bettorSeatId === viewerId ? lastEvent.bettorDelta : 0);
        if (myDelta > 0) {
          sfx.play(myDelta >= 3 ? 'combo' : 'garnetClink');
          Motion.pulseConfirm(q('duelist-card'), { tone: 'emerald' });
        } else if (myDelta < 0) {
          sfx.play('heartbeat');
          Motion.nudgeError(q('clash-stage'), { intensity: 'subtle' });
        } else {
          sfx.play('reveal');
        }
      }, 220);
      const dNm = state.players[lastEvent.duelistSeatId]?.name || '';
      const bNm = state.players[lastEvent.bettorSeatId]?.name || '';
      log(
        lang === 'zh'
          ? `第 ${lastEvent.round} 轮开牌：${dNm} ${signText(lastEvent.duelistSign, 'zh')} vs ${signText(lastEvent.opponentSign, 'zh')} → ${outcomeText(lastEvent.outcome, 'zh')} (${dNm} ${lastEvent.duelistDelta >= 0 ? '+' : ''}${lastEvent.duelistDelta}，${bNm} ${lastEvent.bettorDelta >= 0 ? '+' : ''}${lastEvent.bettorDelta})`
          : `R${lastEvent.round}: ${dNm} ${signText(lastEvent.duelistSign, 'en')} vs ${signText(lastEvent.opponentSign, 'en')} → ${outcomeText(lastEvent.outcome, 'en')}`,
        'alert'
      );
    } else if (lastEvent.type === 'ROUND_STARTED' && lastEvent.isOvertime) {
      sfx.play('reveal');
      log(lang === 'zh' ? '筹码打平！触发 2 回合公开虚拟玩家加时赛' : 'Tied! 2-Round Public VP Overtime triggered', 'alert');
    }
  }

  const isMyTurn = !isSpectator && state.currentTurnSeatId === viewerId;
  const isRoleSelect = state.phase === 'role_select';
  const isDuelPick = state.phase === 'duel_pick';
  const isBetPick = state.phase === 'bet_pick';
  const isRoundResult = state.phase === 'round_result';
  const isFinished = state.phase === 'finished';

  const duelist = cr.duelistSeatId ? state.players[cr.duelistSeatId] : null;
  const bettor = cr.bettorSeatId ? state.players[cr.bettorSeatId] : null;

  // Patch Scoreboard & Animate Chip Vaults
  q('me-name').textContent = `${me.name}${!isSpectator ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}`;
  q('opp-name').textContent = opp.name;
  q('me-role').textContent = cr.duelistSeatId === viewerId
    ? (lang === 'zh' ? '本轮：决斗者' : 'Role: DUELIST')
    : cr.bettorSeatId === viewerId
    ? (lang === 'zh' ? '本轮：下注者' : 'Role: BETTOR')
    : state.firstChoiceSeatId === viewerId
    ? (lang === 'zh' ? '本轮先手选职' : 'First Role Choice')
    : (lang === 'zh' ? '等待对手选职' : 'Awaiting Choice');
  q('opp-role').textContent = cr.duelistSeatId === oppId
    ? (lang === 'zh' ? '本轮：决斗者' : 'Role: DUELIST')
    : cr.bettorSeatId === oppId
    ? (lang === 'zh' ? '本轮：下注者' : 'Role: BETTOR')
    : state.firstChoiceSeatId === oppId
    ? (lang === 'zh' ? '本轮先手选职' : 'First Role Choice')
    : '';

  const meChipEl = q('me-chips');
  const oppChipEl = q('opp-chips');
  if (prevChipsMe === null) {
    meChipEl.textContent = String(me.chips);
    oppChipEl.textContent = String(opp.chips);
  } else {
    if (me.chips !== prevChipsMe) Motion.animateNumber(meChipEl, prevChipsMe, me.chips, { duration: 300, deltaEl: q('me-vault') });
    if (opp.chips !== prevChipsOpp) Motion.animateNumber(oppChipEl, prevChipsOpp, opp.chips, { duration: 300, deltaEl: q('opp-vault') });
  }
  prevChipsMe = me.chips;
  prevChipsOpp = opp.chips;

  q('round-title').textContent = lang === 'zh' ? `第 ${state.round} / ${state.totalRounds} 回合` : `ROUND ${state.round} / ${state.totalRounds}`;
  const pBadge = q('phase-badge');
  pBadge.className = `tg-badge ${entry?.isVirtual ? 'tg-badge-cyan' : 'tg-badge-garnet'}`;
  pBadge.textContent = `${entry?.isOvertime ? (lang === 'zh' ? '加时决胜' : 'OVERTIME') : I18n.t(state.phaseLabel)} · +${entry?.reward ?? 1} ${lang === 'zh' ? '筹码' : 'CHIPS'}`;

  // Patch 11-Round Rail (rebuild only when schedule length changes e.g. overtime added)
  q('rail-title').textContent = lang === 'zh' ? '11 回合递增赛道 & 公开虚拟玩家卡池' : '11-ROUND ESCALATOR RAIL & PUBLIC VP POOL';
  q('rail-note').textContent = lang === 'zh' ? '蓝框 = 全公开虚拟玩家' : 'CYAN = PUBLIC VIRTUAL PLAYER';
  const railGrid = q('rail-grid');
  if (prevRailCount !== state.schedule.length) {
    prevRailCount = state.schedule.length;
    railGrid.innerHTML = state.schedule
      .map((sc) => `
        <div class="brps-rail-card" data-rail-r="${sc.round}">
          <span style="color:var(--tg-ink-faint);font-size:9.5px;">R${sc.round}${sc.isVirtual ? '·VP' : ''}</span>
          <span class="brps-rail-icon" data-rail-icon="${sc.round}">🎭</span>
          <span class="brps-rail-reward">+${sc.reward}</span>
        </div>
      `)
      .join('');
  }
  state.schedule.forEach((sc) => {
    const card = railGrid.querySelector(`[data-rail-r="${sc.round}"]`);
    const icon = railGrid.querySelector(`[data-rail-icon="${sc.round}"]`);
    if (!card || !icon) return;
    const isCurr = sc.round === state.round && !isFinished;
    const done = state.history.some((h) => h.round === sc.round);
    card.className = `brps-rail-card ${sc.isVirtual ? 'is-vp' : ''} ${isCurr ? 'is-active' : ''} ${done ? 'is-done' : ''}`;
    icon.textContent = sc.sign ? SIGN_META[sc.sign].glyph : '🎭';
  });

  // Patch Central Clash Stage
  q('duelist-badge').textContent = duelist
    ? `${lang === 'zh' ? '决斗者' : 'DUELIST'} · ${duelist.name}`
    : (lang === 'zh' ? '决斗席位' : 'DUELIST SEAT');
  q('reward-note').textContent = lang === 'zh' ? `胜出奖励 +${entry.reward} 筹码` : `WIN PAYS +${entry.reward} CHIPS`;

  const duelCardEl = q('duelist-card');
  const duelCardKey = `${state.round}-${cr.duelistLocked}-${cr.duelistSign}-${cr.outcome}`;
  const duelStateCls = (isRoundResult || isFinished)
    ? (cr.outcome === 'win' ? 'is-win' : cr.outcome === 'lose' ? 'is-lose' : 'is-draw')
    : cr.duelistLocked ? 'is-locked' : '';
  duelCardEl.className = `brps-emblem-card ${duelStateCls}`;
  if (duelCardKey !== prevDuelCardKey && (cr.duelistLocked || cr.duelistSign) && !Motion.reduced()) {
    duelCardEl.classList.add('is-entering');
    setTimeout(() => duelCardEl.classList.remove('is-entering'), 300);
  }
  prevDuelCardKey = duelCardKey;

  const dGlyph = q('duelist-glyph');
  const dName = q('duelist-sign-name');
  if (cr.duelistSign) {
    dGlyph.textContent = SIGN_META[cr.duelistSign].glyph;
    dGlyph.style.fontSize = '56px';
    dGlyph.style.opacity = '1';
    dName.textContent = SIGN_META[cr.duelistSign][lang];
    dName.style.opacity = '1';
  } else if (cr.duelistLocked) {
    dGlyph.textContent = '🔒';
    dGlyph.style.fontSize = '40px';
    dGlyph.style.opacity = '1';
    dName.textContent = lang === 'zh' ? '已暗锁手势' : 'LOCKED';
    dName.style.opacity = '1';
  } else {
    dGlyph.textContent = '?';
    dGlyph.style.fontSize = '56px';
    dGlyph.style.opacity = '0.25';
    dName.textContent = lang === 'zh' ? '待出拳' : 'PENDING';
    dName.style.opacity = '0.5';
  }

  // Guest / VP Pedestal
  const gBadge = q('guest-badge');
  gBadge.className = `tg-badge ${entry.isVirtual ? 'tg-badge-cyan' : 'tg-badge-garnet'}`;
  gBadge.textContent = I18n.t(entry.name);
  q('guest-card').className = `brps-emblem-card ${entry.isVirtual ? 'is-vp' : ''}`;
  const gGlyph = q('guest-glyph');
  const gName = q('guest-sign-name');
  if (entry.sign) {
    gGlyph.textContent = SIGN_META[entry.sign].glyph;
    gGlyph.style.fontSize = '56px';
    gName.textContent = SIGN_META[entry.sign][lang];
  } else {
    gGlyph.textContent = '🎭';
    gGlyph.style.fontSize = '44px';
    gName.textContent = lang === 'zh' ? '暗牌嘉宾' : 'HIDDEN SIGN';
  }
  q('guest-trait').textContent = I18n.t(entry.badge);

  // Center Odds Telemetry vs Verdict
  const resCenter = q('result-center');
  const liveCenter = q('live-center');
  if (isRoundResult || isFinished) {
    resCenter.hidden = false;
    liveCenter.hidden = true;
    const rOut = q('res-outcome');
    rOut.textContent = outcomeText(cr.outcome, lang);
    rOut.style.color = cr.outcome === 'win' ? 'var(--tg-emerald-ink)' : cr.outcome === 'lose' ? 'var(--tg-garnet-ink)' : 'var(--tg-cyan-ink)';
    q('res-breakdown').innerHTML = `
      <span>${UI.escapeHtml(duelist?.name || '')}: <strong style="color:var(--tg-gold-bright);">${cr.duelistDelta >= 0 ? `+${cr.duelistDelta}` : cr.duelistDelta}</strong></span>
      <span>
        ${UI.escapeHtml(bettor?.name || '')} (${cr.betWager > 0 ? `${predText(cr.betPrediction, lang)} · ${cr.betWager}` : (lang === 'zh' ? '0 筹码观战' : '0 wager')}):
        <strong style="color:${cr.bettorDelta > 0 ? 'var(--tg-emerald-ink)' : cr.bettorDelta < 0 ? 'var(--tg-garnet-ink)' : 'var(--tg-cyan-ink)'};">
          ${cr.betStatus === 'refund' ? (lang === 'zh' ? '平局退回 (±0)' : 'REFUND (±0)') : cr.bettorDelta >= 0 ? `+${cr.bettorDelta}` : cr.bettorDelta}
        </strong>
      </span>
    `;
    const nextBtn = q('next-round');
    nextBtn.hidden = !(isRoundResult && !isSpectator);
    nextBtn.textContent = state.round >= state.schedule.length
      ? (lang === 'zh' ? '进入加时赛 →' : 'Start Overtime →')
      : (lang === 'zh' ? `下一回合 R${state.round + 1} →` : `Next Round R${state.round + 1} →`);
  } else {
    resCenter.hidden = true;
    liveCenter.hidden = false;
    const post = computeGuestPosterior(entry, entry?.myWhisper);
    const rockPct = Math.round(post.rock * 100);
    const paperPct = Math.round(post.paper * 100);
    const scisPct = Math.max(0, 100 - rockPct - paperPct);
    q('odds-label').textContent = entry.isVirtual
      ? (lang === 'zh' ? '公开明牌 · 100% 确定' : 'PUBLIC CARD · 100% KNOWN')
      : (lang === 'zh' ? '对手手势概率遥测' : 'OPPONENT SIGN ODDS');
    q('pct-rock').textContent = `✊ ${rockPct}%`;
    q('pct-paper').textContent = `✋ ${paperPct}%`;
    q('pct-scissors').textContent = `✌️ ${scisPct}%`;
    // GPU-composited scaleX odds bars!
    q('bar-rock').style.transform = `scaleX(${post.rock})`;
    q('bar-paper').style.transform = `scaleX(${post.paper})`;
    q('bar-scissors').style.transform = `scaleX(${post.scissors})`;

    const wPill = q('whisper-pill');
    const vpTip = q('vp-tip');
    if (entry.myWhisper) {
      wPill.hidden = false;
      vpTip.hidden = true;
      wPill.textContent = lang === 'zh'
        ? `🤫 私密耳语（可信度 ${entry.myWhisper.reliability}%）：「本轮大概率不出 ${signText(entry.myWhisper.eliminatedSign, 'zh')}」`
        : `🤫 Whisper (${entry.myWhisper.reliability}% trust): "Likely NOT ${signText(entry.myWhisper.eliminatedSign, 'en')}"`;
    } else if (entry.isVirtual) {
      wPill.hidden = true;
      vpTip.hidden = false;
      vpTip.textContent = lang === 'zh'
        ? '提示：决斗者可故意输或故意平局反杀下注者！'
        : 'Tip: Duelist can intentionally LOSE or DRAW to trap the Bettor!';
    } else {
      wPill.hidden = true;
      vpTip.hidden = true;
    }
  }

  // Patch Interactive Action Console panels without nuking DOM!
  const consoleEl = q('console');
  const showConsole = !isSpectator && !isRoundResult && !isFinished;
  consoleEl.hidden = !showConsole;
  if (!showConsole) return;

  const pWait = consoleEl.querySelector('[data-panel="wait"]');
  const pRole = consoleEl.querySelector('[data-panel="role"]');
  const pDuel = consoleEl.querySelector('[data-panel="duel"]');
  const pBetZero = consoleEl.querySelector('[data-panel="bet-zero"]');
  const pBet = consoleEl.querySelector('[data-panel="bet"]');
  pWait.hidden = true;
  pRole.hidden = true;
  pDuel.hidden = true;
  pBetZero.hidden = true;
  pBet.hidden = true;

  if (isRoleSelect) {
    if (isMyTurn) {
      pRole.hidden = false;
      q('role-heading').textContent = lang === 'zh' ? '轮到你先手选择本轮身份：' : 'Your First Choice — Pick Your Role:';
      q('role-a-tag').textContent = lang === 'zh' ? '选项 A · 亲自猜拳' : 'OPTION A · DUEL';
      q('role-a-title').textContent = lang === 'zh' ? `✊✋✌️ 出战赢取 +${entry.reward} 筹码` : `✊✋✌️ Duel for +${entry.reward} Chips`;
      q('role-a-desc').textContent = entry.isVirtual
        ? (lang === 'zh' ? '明牌对决：可稳拿奖励，或故意输/平反杀对手重注。' : 'Known VP sign: take guaranteed reward or trap rival bets.')
        : (lang === 'zh' ? '零风险赚筹码：赢 +奖励，平/负均不扣筹码。' : 'Zero-downside gain: win +reward, lose 0 on draw/loss.');
      q('role-b-tag').textContent = lang === 'zh' ? '选项 B · 押注对手' : 'OPTION B · BET';
      q('role-b-title').textContent = lang === 'zh' ? '◈ 押胜/负 2× · 押平 3×' : '◈ Bet Win/Lose 2× · Draw 3×';
      q('role-b-desc').textContent = me.chips === 0
        ? (lang === 'zh' ? '警告：你目前仅有 0 筹码，选押注无法下注。' : 'Warning: You have 0 chips and cannot wager.')
        : (lang === 'zh' ? `你持有 ${me.chips} 枚筹码，押中即可翻倍或 3 倍暴击。` : `You hold ${me.chips} chip(s) — multiply your stack on a sharp read.`);
    } else {
      pWait.hidden = false;
      pWait.textContent = lang === 'zh' ? `等待 ${opp.name} 选择亲自猜拳或押注...` : `Waiting for ${opp.name} to choose Duel or Bet...`;
    }
  } else if (isDuelPick) {
    if (isMyTurn) {
      pDuel.hidden = false;
      q('duel-heading').textContent = entry.isVirtual
        ? (lang === 'zh'
          ? `你是决斗者！虚拟玩家明牌【${signText(entry.sign, 'zh')}】，秘密锁定手势：`
          : `You are DUELIST! Virtual Player shows [${signText(entry.sign, 'en')}] — lock your throw:`)
        : (lang === 'zh'
          ? '你是决斗者！结合倾向与耳语，秘密锁定猜拳手势（下注者不可见）：'
          : 'You are DUELIST! Secretly lock your Rock, Paper, or Scissors card:');
      SIGNS.forEach((s) => {
        const btn = consoleEl.querySelector(`[data-sign="${s}"]`);
        const lbl = consoleEl.querySelector(`[data-sign-label="${s}"]`);
        const hnt = consoleEl.querySelector(`[data-sign-hint="${s}"]`);
        lbl.textContent = SIGN_META[s][lang];
        btn.classList.remove('is-win-hint', 'is-lose-hint', 'is-draw-hint');
        if (entry.isVirtual && entry.sign) {
          const out = resolveRpsOutcome(s, entry.sign);
          btn.classList.add(out === 'win' ? 'is-win-hint' : out === 'draw' ? 'is-draw-hint' : 'is-lose-hint');
          hnt.hidden = false;
          hnt.textContent = out === 'win'
            ? (lang === 'zh' ? `必胜 (+${entry.reward})` : `WIN (+${entry.reward})`)
            : out === 'draw'
            ? (lang === 'zh' ? '故意平局' : 'FORCE DRAW')
            : (lang === 'zh' ? '故意输(杀多)' : 'FORCE LOSE');
        } else {
          hnt.hidden = true;
        }
      });
    } else {
      pWait.hidden = false;
      pWait.textContent = lang === 'zh' ? `等待决斗者 ${duelist?.name || ''} 暗锁手势...` : `Waiting for Duelist ${duelist?.name || ''} to lock RPS sign...`;
    }
  } else if (isBetPick) {
    if (isMyTurn) {
      if (me.chips === 0) {
        pBetZero.hidden = false;
        q('zero-bet-msg').textContent = lang === 'zh' ? '你目前持有 0 枚筹码，本轮免押直接开牌！' : 'You have 0 chips — reveal the duel with 0 wager!';
        q('confirm-bet-zero').textContent = lang === 'zh' ? '0 筹码开牌' : 'Reveal Duel';
      } else {
        pBet.hidden = false;
        q('bet-heading').textContent = lang === 'zh'
          ? `你是下注者！${duelist?.name || ''} 已扣牌，请预测胜负并投入筹码：`
          : `You are BETTOR! ${duelist?.name || ''} locked their card — place your odds ticket:`;
        q('t-win-tag').textContent = lang === 'zh' ? '2× 赔率' : '2× PAYS';
        q('t-win-title').textContent = lang === 'zh' ? '押决斗者 胜' : 'BET WIN';
        q('t-win-sub').textContent = lang === 'zh' ? '平局全额退还' : 'Refund on Draw';
        q('t-draw-tag').textContent = lang === 'zh' ? '3× 暴击' : '3× PAYS';
        q('t-draw-title').textContent = lang === 'zh' ? '押双方 平局' : 'BET DRAW';
        q('t-draw-sub').textContent = lang === 'zh' ? '净赚 2 倍筹码' : '+2× Net Profit';
        q('t-lose-tag').textContent = lang === 'zh' ? '2× 赔率' : '2× PAYS';
        q('t-lose-title').textContent = lang === 'zh' ? '押决斗者 负' : 'BET LOSE';
        q('t-lose-sub').textContent = lang === 'zh' ? '平局全额退还' : 'Refund on Draw';
        q('wager-lbl').textContent = lang === 'zh' ? '下注额:' : 'Wager:';
        patchBetTicketInPlace(container);
      }
    } else {
      pWait.hidden = false;
      pWait.textContent = lang === 'zh' ? `等待下注者 ${bettor?.name || ''} 选择赔率与筹码...` : `Waiting for Bettor ${bettor?.name || ''} to lock wager...`;
    }
  }
}

mountGame({
  config: {
    id: 'betting-rps',
    title: { zh: '下注猜拳', en: 'Betting! Rock, Paper, Scissors', ko: '베팅! 가위바위보' },
    seasons: ['S3', 'S4'],
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
采用《The Genius》第 4 季官方 **11 回合**赛制（金京勋 vs 李相敏传奇名局）！双方开局仅各持 **1 枚筹码**，11 回合后拥有更多筹码者胜（平局则进入 2 回合公开虚拟玩家加时赛）。

### 11 回合对手构成与递增奖励
- **8 名演播室嘉宾**：各有可见倾向，且每轮会向双方发送私密耳语线索。
- **3 名全公开虚拟玩家（第 3、7、10 轮）**：其石头/剪刀/布手势**双方全程明牌可见**！决斗者可以故意输或故意平局来击溃下注者的重注！
- **决斗胜出奖励**：第 1–3 轮 **+1 筹码**，第 4–6 轮 **+2**，第 7–9 轮 **+3**，第 10–11 轮 **+4**（平/负不扣筹码）。

### 回合流程与 2× / 3× 赔率
1. **先手选职（每轮交替）**：决定本轮**亲自猜拳 (DUEL)** 或**押注对手 (BET)**。
2. **决斗者暗锁手势**：决斗者秘密扣下石头/剪刀/布。
3. **下注者下注**：预测决斗者本轮胜/负/平并投入 1～全部筹码（0 筹码则免押观战）：
   - **押胜 / 押负**：猜中获 **2 倍返还（净赚 1 倍）**；若猜拳**平局则筹码全额退还**；猜反则全失！
   - **押平局**：猜中暴击 **3 倍返还（净赚 2 倍）**；未平局则全失！`,
      en: `### Objective
Official Season 4 Episode 3 **11-Round** ruleset! Both contestants start with just **1 chip**. Finish Round 11 with more chips to survive (ties go to 2-round Public Virtual Player sudden-death overtime!).

### 11-Round Escalator & Public Virtual Players
- **8 AI Studio Guests**: Each shows a public tendency badge and sends a private whisper tell.
- **3 Public Virtual Players (Rounds 3, 7, 10)**: Their exact Rock/Paper/Scissors sign is **100% PUBLIC** — letting the Duelist intentionally throw a Loss or Draw to wipe out the Bettor's wager!
- **Escalating Duelist Win Payout**: R1–3: **+1 chip**, R4–6: **+2**, R7–9: **+3**, R10–11: **+4** (0 on Draw/Loss).

### Round Flow & 2× / 3× Sportsbook Odds
1. **Role Selection (Alternates)**: First-choice player chooses **DUEL** or **BET**.
2. **Duelist Lock**: Duelist secretly locks Rock / Paper / Scissors face-down.
3. **Bettor Wager**: Predict Duelist **WIN**, **LOSE**, or **DRAW** and wager 1..all chips:
   - **WIN / LOSE**: Correct = **2× return** (+1× profit); RPS **Draw = full refund**; Opposite = lose wager.
   - **DRAW**: Correct = **3× return** (+2× profit); Otherwise = lose wager.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderStage,
});

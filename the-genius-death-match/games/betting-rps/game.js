/**
 * Betting! Rock, Paper, Scissors (下注猜拳 · 베팅! 가위바위보)
 * Interactive Neon Velvet Broadcast Sportsbook Stage
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
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
  if (out === 'draw') return lang === 'zh' ? '平局 DRAW' : 'DRAW';
  return '—';
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

function renderStage(container, ctx) {
  const { state, mySeatId, activeSeatId, isSpectator, lang, lastEvent, dispatch, sfx, log } = ctx;
  if (!state) return;

  const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
  const oppId = state.seatOrder.find((id) => id !== viewerId) || state.seatOrder[1];
  const me = state.players[viewerId];
  const opp = state.players[oppId];

  const entry = state.schedule[state.round - 1];
  const cr = state.currentRound || {};

  // Reset bet defaults on new bet_pick turn
  const bKey = `${state.round}-${state.phase}-${viewerId}`;
  if (bKey !== lastBetKey) {
    lastBetKey = bKey;
    draftPred = 'win';
    draftWager = Math.min(me.chips, Math.max(1, Math.ceil(me.chips * 0.5)));
  }
  draftWager = me.chips === 0 ? 0 : Math.max(1, Math.min(me.chips, draftWager));

  // Audio cues & Broadcast log
  if (lastEvent && lastEvent.ts && lastEvent.ts !== lastEventTs) {
    lastEventTs = lastEvent.ts;
    if (lastEvent.type === 'ROLE_CHOSEN') {
      sfx.play('click');
      const dNm = state.players[lastEvent.duelistSeatId]?.name || '';
      const bNm = state.players[lastEvent.bettorSeatId]?.name || '';
      log(
        lang === 'zh'
          ? `第 ${lastEvent.round} 轮：${dNm} 亲自猜拳，${bNm} 负责押注！`
          : `R${lastEvent.round}: ${dNm} DUELS · ${bNm} BETS!`,
        'system'
      );
    } else if (lastEvent.type === 'DUEL_LOCKED') {
      sfx.play('cardFlip');
      const dNm = state.players[lastEvent.duelistSeatId]?.name || '';
      log(
        lang === 'zh'
          ? `第 ${lastEvent.round} 轮：${dNm} 已暗锁猜拳手势，等待下注者锁定赔率...`
          : `R${lastEvent.round}: ${dNm} locked their RPS card face-down.`,
        'system'
      );
    } else if (lastEvent.type === 'CLASH_RESOLVED') {
      sfx.play('clash');
      setTimeout(() => {
        const myDelta =
          (lastEvent.duelistSeatId === viewerId ? lastEvent.duelistDelta : 0) +
          (lastEvent.bettorSeatId === viewerId ? lastEvent.bettorDelta : 0);
        if (myDelta > 0) sfx.play(myDelta >= 3 ? 'combo' : 'garnetClink');
        else if (myDelta < 0) sfx.play('heartbeat');
        else sfx.play('reveal');
      }, 240);
      const dNm = state.players[lastEvent.duelistSeatId]?.name || '';
      const bNm = state.players[lastEvent.bettorSeatId]?.name || '';
      log(
        lang === 'zh'
          ? `第 ${lastEvent.round} 轮开牌：${dNm} ${signText(lastEvent.duelistSign, 'zh')} vs ${signText(lastEvent.opponentSign, 'zh')} → ${outcomeText(lastEvent.outcome, 'zh')}！(${dNm} ${lastEvent.duelistDelta >= 0 ? '+' : ''}${lastEvent.duelistDelta}，${bNm} ${lastEvent.bettorDelta >= 0 ? '+' : ''}${lastEvent.bettorDelta})`
          : `R${lastEvent.round} Clash: ${dNm} ${signText(lastEvent.duelistSign, 'en')} vs ${signText(lastEvent.opponentSign, 'en')} → ${outcomeText(lastEvent.outcome, 'en')}! (${dNm} ${lastEvent.duelistDelta >= 0 ? '+' : ''}${lastEvent.duelistDelta}, ${bNm} ${lastEvent.bettorDelta >= 0 ? '+' : ''}${lastEvent.bettorDelta})`,
        'alert'
      );
    } else if (lastEvent.type === 'ROUND_STARTED' && lastEvent.isOvertime) {
      sfx.play('reveal');
      log(
        lang === 'zh' ? '筹码打平！触发第 4 季官方加时赛：2 回合公开虚拟玩家决胜！' : 'Chips tied! S4 Official 2-Round Public VP Overtime triggered!',
        'alert'
      );
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

  // Dynamic Win/Draw/Lose odds telemetry for current round (using public archetype + viewer's own whisper if any)
  const post = computeGuestPosterior(entry, entry?.myWhisper);
  const rockPct = Math.round(post.rock * 100);
  const paperPct = Math.round(post.paper * 100);
  const scisPct = Math.max(0, 100 - rockPct - paperPct);

  const duelistCardState = isRoundResult || isFinished
    ? cr.outcome === 'win' ? 'is-win' : cr.outcome === 'lose' ? 'is-lose' : 'is-draw'
    : cr.duelistLocked ? 'is-locked' : '';

  const projectedNetWin =
    draftWager === 0 ? 0 : draftPred === 'draw' ? draftWager * 2 : draftWager;

  container.innerHTML = `
    <div class="brps-arena">
      <!-- 1. Top Broadcast Chip Vault Bar -->
      <section class="brps-score-bar">
        <div class="brps-player-box">
          <div>
            <div style="font-weight:700;font-size:14.5px;">${UI.escapeHtml(me.name)}${!isSpectator ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}</div>
            <div style="font-size:11px;color:var(--tg-ink-muted);">
              ${
                cr.duelistSeatId === viewerId
                  ? (lang === 'zh' ? '本轮：决斗者' : 'Role: DUELIST')
                  : cr.bettorSeatId === viewerId
                  ? (lang === 'zh' ? '本轮：下注者' : 'Role: BETTOR')
                  : state.firstChoiceSeatId === viewerId
                  ? (lang === 'zh' ? '本轮先手选职' : 'First Role Choice')
                  : (lang === 'zh' ? '等待对手选职' : 'Awaiting Role Choice')
              }
            </div>
          </div>
          <span class="brps-chip-vault">◈ ${me.chips}</span>
        </div>

        <div style="text-align:center;">
          <div style="font-family:var(--tg-font-display);font-size:18px;font-weight:800;color:var(--tg-gold-bright);">
            ${lang === 'zh' ? `第 ${state.round} / ${state.totalRounds} 回合` : `ROUND ${state.round} / ${state.totalRounds}`}
          </div>
          <span class="tg-badge ${entry?.isVirtual ? 'tg-badge-cyan' : 'tg-badge-garnet'}">
            ${entry?.isOvertime ? (lang === 'zh' ? '加时决胜' : 'OVERTIME') : UI.escapeHtml(I18n.t(state.phaseLabel))} · +${entry?.reward ?? 1} ${lang === 'zh' ? '筹码' : 'CHIPS'}
          </span>
        </div>

        <div class="brps-player-box is-right">
          <span class="brps-chip-vault is-opp">◈ ${opp.chips}</span>
          <div>
            <div style="font-weight:700;font-size:14.5px;">${UI.escapeHtml(opp.name)}</div>
            <div style="font-size:11px;color:var(--tg-ink-muted);">
              ${
                cr.duelistSeatId === oppId
                  ? (lang === 'zh' ? '本轮：决斗者' : 'Role: DUELIST')
                  : cr.bettorSeatId === oppId
                  ? (lang === 'zh' ? '本轮：下注者' : 'Role: BETTOR')
                  : state.firstChoiceSeatId === oppId
                  ? (lang === 'zh' ? '本轮先手选职' : 'First Role Choice')
                  : ''
              }
            </div>
          </div>
        </div>
      </section>

      <!-- 2. 11-Round Escalator Rail (Showing Public Virtual Player Pool & Rewards!) -->
      <section class="brps-rail-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;letter-spacing:0.08em;color:var(--tg-ink-muted);text-transform:uppercase;">
          <span>${lang === 'zh' ? '11 回合递增赛道 & 公开虚拟玩家卡池' : '11-ROUND ESCALATOR RAIL & PUBLIC VP POOL'}</span>
          <span>${lang === 'zh' ? '蓝框 = 全公开虚拟玩家' : 'CYAN = PUBLIC VIRTUAL PLAYER'}</span>
        </div>
        <div class="brps-rail-grid">
          ${state.schedule
            .map((sc) => {
              const isCurr = sc.round === state.round && !isFinished;
              const hist = state.history.find((h) => h.round === sc.round);
              const icon = sc.sign ? SIGN_META[sc.sign].glyph : '🎭';
              return `
                <div class="brps-rail-card ${sc.isVirtual ? 'is-vp' : ''} ${isCurr ? 'is-active' : ''} ${hist ? 'is-done' : ''}">
                  <span style="color:var(--tg-ink-faint);font-size:9.5px;">R${sc.round}${sc.isVirtual ? '·VP' : ''}</span>
                  <span class="brps-rail-icon">${icon}</span>
                  <span class="brps-rail-reward">+${sc.reward}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      </section>

      <!-- 3. Central Holographic RPS Clash Stage -->
      <section class="brps-stage">
        <div class="brps-duel-grid">
          <!-- Left: Duelist Card -->
          <div class="brps-emblem-pedestal">
            <span class="tg-badge tg-badge-gold">
              ${duelist ? `${lang === 'zh' ? '决斗者' : 'DUELIST'} · ${UI.escapeHtml(duelist.name)}` : (lang === 'zh' ? '决斗席位' : 'DUELIST SEAT')}
            </span>
            <div class="brps-emblem-card ${duelistCardState}">
              ${
                cr.duelistSign
                  ? `
                    <span class="brps-emblem-glyph">${SIGN_META[cr.duelistSign].glyph}</span>
                    <span class="brps-emblem-name">${SIGN_META[cr.duelistSign][lang]}</span>
                  `
                  : cr.duelistLocked
                  ? `
                    <span class="brps-emblem-glyph" style="font-size:40px;">🔒</span>
                    <span class="brps-emblem-name">${lang === 'zh' ? '已暗锁手势' : 'LOCKED'}</span>
                  `
                  : `
                    <span class="brps-emblem-glyph" style="opacity:0.25;">?</span>
                    <span class="brps-emblem-name" style="opacity:0.5;">${lang === 'zh' ? '待出拳' : 'PENDING'}</span>
                  `
              }
            </div>
            <span style="font-size:11.5px;color:var(--tg-ink-muted);font-family:var(--tg-font-mono);">
              ${lang === 'zh' ? `胜出奖励 +${entry.reward} 筹码` : `WIN PAYS +${entry.reward} CHIPS`}
            </span>
          </div>

          <!-- Center: Odds Telemetry & Clash Verdict -->
          <div class="brps-center-col">
            ${
              isRoundResult || isFinished
                ? `
                  <div style="font-family:var(--tg-font-display);font-size:24px;font-weight:900;color:${
                    cr.outcome === 'win' ? 'var(--tg-emerald)' : cr.outcome === 'lose' ? '#ff6c87' : '#67e8f9'
                  };">
                    ${outcomeText(cr.outcome, lang)}
                  </div>
                  <div style="font-size:12.5px;color:var(--tg-ink-muted);display:flex;flex-direction:column;gap:4px;">
                    <span>${UI.escapeHtml(duelist?.name || '')}: <strong style="color:var(--tg-gold-bright);">${cr.duelistDelta >= 0 ? `+${cr.duelistDelta}` : cr.duelistDelta}</strong></span>
                    <span>
                      ${UI.escapeHtml(bettor?.name || '')} (${cr.betWager > 0 ? `${predText(cr.betPrediction, lang)} · ${cr.betWager}` : (lang === 'zh' ? '0 筹码观战' : '0 wager')}):
                      <strong style="color:${cr.bettorDelta > 0 ? 'var(--tg-emerald)' : cr.bettorDelta < 0 ? '#ff6c87' : '#67e8f9'};">
                        ${cr.betStatus === 'refund' ? (lang === 'zh' ? '平局退回 (±0)' : 'REFUND (±0)') : cr.bettorDelta >= 0 ? `+${cr.bettorDelta}` : cr.bettorDelta}
                      </strong>
                    </span>
                  </div>
                  ${
                    isRoundResult && !isSpectator
                      ? `<button type="button" class="tg-btn tg-btn-gold" id="brps-next-round" style="min-width:154px;margin-top:4px;">
                          ${
                            state.round >= state.schedule.length
                              ? (lang === 'zh' ? '进入加时赛 →' : 'Start Overtime →')
                              : (lang === 'zh' ? `下一回合 R${state.round + 1} →` : `Next Round R${state.round + 1} →`)
                          }
                        </button>`
                      : ''
                  }
                `
                : `
                  <span style="font-family:var(--tg-font-display);font-size:24px;font-weight:900;color:var(--tg-gold-bright);">VS</span>
                  <div class="brps-odds-box">
                    <div style="font-size:10.5px;font-weight:700;color:var(--tg-gold);letter-spacing:0.08em;">
                      ${entry.isVirtual ? (lang === 'zh' ? '公开明牌 · 100% 确定' : 'PUBLIC CARD · 100% KNOWN') : (lang === 'zh' ? '对手手势概率遥测' : 'OPPONENT SIGN ODDS')}
                    </div>
                    <div class="brps-odds-row">
                      <span>✊ ${rockPct}%</span>
                      <span>✋ ${paperPct}%</span>
                      <span>✌️ ${scisPct}%</span>
                    </div>
                    <div class="brps-odds-bar">
                      <span style="width:${rockPct}%;background:#f59e0b;"></span>
                      <span style="width:${paperPct}%;background:#22d3ee;"></span>
                      <span style="width:${scisPct}%;background:#ff2e54;"></span>
                    </div>
                  </div>
                  ${
                    entry.myWhisper
                      ? `<div class="brps-whisper-pill">
                          🤫 ${
                            lang === 'zh'
                              ? `私密耳语（可信度 ${entry.myWhisper.reliability}%）：「本轮大概率不出 ${signText(entry.myWhisper.eliminatedSign, 'zh')}」`
                              : `Private Whisper (${entry.myWhisper.reliability}% trust): "Likely NOT ${signText(entry.myWhisper.eliminatedSign, 'en')}"`
                          }
                        </div>`
                      : entry.isVirtual
                      ? `<div style="font-size:12px;color:#67e8f9;">
                          ${lang === 'zh' ? '提示：决斗者可故意输或故意平局反杀下注者！' : 'Tip: Duelist can intentionally LOSE or DRAW to trap the Bettor!'}
                        </div>`
                      : ''
                  }
                `
            }
          </div>

          <!-- Right: Studio Guest / Virtual Player Card -->
          <div class="brps-emblem-pedestal">
            <span class="tg-badge ${entry.isVirtual ? 'tg-badge-cyan' : 'tg-badge-garnet'}">
              ${UI.escapeHtml(I18n.t(entry.name))}
            </span>
            <div class="brps-emblem-card ${entry.isVirtual ? 'is-vp' : ''}">
              ${
                entry.sign
                  ? `
                    <span class="brps-emblem-glyph">${SIGN_META[entry.sign].glyph}</span>
                    <span class="brps-emblem-name">${SIGN_META[entry.sign][lang]}</span>
                  `
                  : `
                    <span class="brps-emblem-glyph" style="font-size:44px;">🎭</span>
                    <span class="brps-emblem-name">${lang === 'zh' ? '暗牌嘉宾' : 'HIDDEN SIGN'}</span>
                  `
              }
            </div>
            <span style="font-size:11.5px;color:var(--tg-ink-muted);">
              ${UI.escapeHtml(I18n.t(entry.badge))}
            </span>
          </div>
        </div>
      </section>

      <!-- 4. Interactive Command Console -->
      ${
        !isSpectator && !isRoundResult && !isFinished
          ? `
            <section class="brps-console">
              ${
                isRoleSelect
                  ? isMyTurn
                    ? `
                      <div style="font-size:13px;font-weight:700;color:var(--tg-gold-bright);">
                        ${lang === 'zh' ? '轮到你先手选择本轮身份：' : 'Your First Choice — Pick Your Role This Round:'}
                      </div>
                      <div class="brps-role-grid">
                        <button type="button" class="brps-role-card" data-role="duel">
                          <span class="tg-badge tg-badge-gold">${lang === 'zh' ? '选项 A · 亲自猜拳' : 'OPTION A · DUEL'}</span>
                          <strong style="font-size:16px;">✊✋✌️ ${lang === 'zh' ? `出战赢取 +${entry.reward} 筹码` : `Duel for +${entry.reward} Chips`}</strong>
                          <span style="font-size:12px;color:var(--tg-ink-muted);">
                            ${
                              entry.isVirtual
                                ? (lang === 'zh' ? '明牌对决：可稳拿奖励，或故意输/平反杀对手重注！' : 'Known VP sign: take guaranteed reward OR trap rival bets!')
                                : (lang === 'zh' ? '零风险赚筹码：赢 +奖励，平/负均不扣筹码。' : 'Zero-downside chip gain: win +reward, lose 0 on draw/loss.')
                            }
                          </span>
                        </button>
                        <button type="button" class="brps-role-card" data-role="bet">
                          <span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '选项 B · 押注对手' : 'OPTION B · BET'}</span>
                          <strong style="font-size:16px;">◈ ${lang === 'zh' ? '押胜/负 2× · 押平 3×' : 'Bet Win/Lose 2× · Draw 3×'}</strong>
                          <span style="font-size:12px;color:var(--tg-ink-muted);">
                            ${
                              me.chips === 0
                                ? (lang === 'zh' ? '警告：你目前仅有 0 筹码，选押注无法下注！' : 'Warning: You have 0 chips and cannot wager!')
                                : (lang === 'zh' ? `你当前持有 ${me.chips} 枚筹码，押中即可翻倍或 3 倍暴击！` : `You hold ${me.chips} chip(s) — multiply your stack on a sharp read!`)
                            }
                          </span>
                        </button>
                      </div>
                    `
                    : `<div style="text-align:center;color:var(--tg-ink-muted);padding:10px;">
                        ${lang === 'zh' ? `等待 ${UI.escapeHtml(opp.name)} 选择亲自猜拳或押注...` : `Waiting for ${UI.escapeHtml(opp.name)} to choose Duel or Bet...`}
                      </div>`
                  : isDuelPick
                  ? isMyTurn
                    ? `
                      <div style="font-size:13px;font-weight:700;color:var(--tg-gold-bright);">
                        ${
                          entry.isVirtual
                            ? (lang === 'zh'
                              ? `你是决斗者！虚拟玩家明牌【${signText(entry.sign, 'zh')}】，秘密锁定你的手势：`
                              : `You are DUELIST! Virtual Player shows [${signText(entry.sign, 'en')}] — lock your throw:`)
                            : (lang === 'zh'
                              ? '你是决斗者！结合倾向与耳语，秘密锁定你的猜拳手势（下注者不可见）：'
                              : 'You are DUELIST! Secretly lock your Rock, Paper, or Scissors card:')
                        }
                      </div>
                      <div class="brps-rps-grid">
                        ${SIGNS.map((s) => {
                          let hint = '';
                          let hintCls = '';
                          if (entry.isVirtual && entry.sign) {
                            const out = resolveRpsOutcome(s, entry.sign);
                            hint =
                              out === 'win'
                                ? (lang === 'zh' ? `必胜 (+${entry.reward})` : `WIN (+${entry.reward})`)
                                : out === 'draw'
                                ? (lang === 'zh' ? '故意平局' : 'FORCE DRAW')
                                : (lang === 'zh' ? '故意输(杀多)' : 'FORCE LOSE');
                            hintCls = out === 'win' ? 'is-win-hint' : out === 'draw' ? 'is-draw-hint' : 'is-lose-hint';
                          }
                          return `
                            <button type="button" class="brps-rps-btn ${hintCls}" data-sign="${s}">
                              <span style="font-size:40px;line-height:1;">${SIGN_META[s].glyph}</span>
                              <strong style="font-size:15px;">${SIGN_META[s][lang]}</strong>
                              ${hint ? `<span style="font-family:var(--tg-font-mono);font-size:10.5px;color:var(--tg-gold-bright);">${hint}</span>` : ''}
                            </button>
                          `;
                        }).join('')}
                      </div>
                    `
                    : `<div style="text-align:center;color:var(--tg-ink-muted);padding:10px;">
                        ${lang === 'zh' ? `等待决斗者 ${UI.escapeHtml(duelist?.name || '')} 秘密锁定猜拳手势...` : `Waiting for Duelist ${UI.escapeHtml(duelist?.name || '')} to lock their RPS sign...`}
                      </div>`
                  : isBetPick
                  ? isMyTurn
                    ? me.chips === 0
                      ? `
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                          <span style="color:var(--tg-ink-muted);font-size:13px;">
                            ${lang === 'zh' ? '你目前持有 0 枚筹码，本轮免押直接开牌！' : 'You have 0 chips — reveal the duel with 0 wager!'}
                          </span>
                          <button type="button" class="tg-btn tg-btn-garnet" id="brps-confirm-bet">
                            ${lang === 'zh' ? '0 筹码开牌 →' : 'Reveal Duel →'}
                          </button>
                        </div>
                      `
                      : `
                        <div style="font-size:13px;font-weight:700;color:var(--tg-gold-bright);">
                          ${lang === 'zh'
                            ? `你是下注者！${UI.escapeHtml(duelist?.name || '')} 已扣牌，请预测其胜负并投入筹码：`
                            : `You are BETTOR! ${UI.escapeHtml(duelist?.name || '')} locked their card — place your odds ticket:`}
                        </div>
                        <div class="brps-ticket-grid">
                          <button type="button" class="brps-ticket ${draftPred === 'win' ? 'is-selected' : ''}" data-pred="win">
                            <span class="tg-badge tg-badge-emerald">2× ${lang === 'zh' ? '赔率' : 'PAYS'}</span>
                            <strong style="font-size:15px;">${lang === 'zh' ? '押决斗者 胜' : 'BET WIN'}</strong>
                            <span style="font-size:11px;color:var(--tg-ink-muted);">${lang === 'zh' ? '平局全额退还' : 'Refund on Draw'}</span>
                          </button>
                          <button type="button" class="brps-ticket is-draw ${draftPred === 'draw' ? 'is-selected' : ''}" data-pred="draw">
                            <span class="tg-badge tg-badge-cyan">3× ${lang === 'zh' ? '暴击' : 'PAYS'}</span>
                            <strong style="font-size:15px;">${lang === 'zh' ? '押双方 平局' : 'BET DRAW'}</strong>
                            <span style="font-size:11px;color:var(--tg-ink-muted);">${lang === 'zh' ? '净赚 2 倍筹码！' : '+2× Net Profit!'}</span>
                          </button>
                          <button type="button" class="brps-ticket ${draftPred === 'lose' ? 'is-selected' : ''}" data-pred="lose">
                            <span class="tg-badge tg-badge-garnet">2× ${lang === 'zh' ? '赔率' : 'PAYS'}</span>
                            <strong style="font-size:15px;">${lang === 'zh' ? '押决斗者 负' : 'BET LOSE'}</strong>
                            <span style="font-size:11px;color:var(--tg-ink-muted);">${lang === 'zh' ? '平局全额退还' : 'Refund on Draw'}</span>
                          </button>
                        </div>

                        <div class="brps-wager-row">
                          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="font-size:12px;color:var(--tg-ink-muted);">${lang === 'zh' ? '下注额' : 'Wager'}:</span>
                            <div class="tg-dial">
                              <button type="button" class="tg-btn tg-btn-icon tg-btn-sm" id="brps-w-dec" ${draftWager <= 1 ? 'disabled' : ''}>−</button>
                              <span class="tg-dial-value" id="brps-w-val">${draftWager}</span>
                              <button type="button" class="tg-btn tg-btn-icon tg-btn-sm" id="brps-w-inc" ${draftWager >= me.chips ? 'disabled' : ''}>+</button>
                            </div>
                            <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-wfrac="min">1</button>
                            <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-wfrac="half">50%</button>
                            <button type="button" class="tg-btn tg-btn-sm tg-btn-gold" data-wfrac="all">ALL-IN (${me.chips})</button>
                          </div>

                          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                            <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-emerald);" id="brps-proj-win">
                              ${lang === 'zh' ? `猜中净赚 +${projectedNetWin}` : `Win Net +${projectedNetWin}`}
                            </span>
                            <button type="button" class="tg-btn tg-btn-garnet" id="brps-confirm-bet" style="min-width:170px;">
                              ${lang === 'zh' ? `锁定下注 ${draftWager} 枚 →` : `Lock Bet ${draftWager} →`}
                            </button>
                          </div>
                        </div>
                      `
                    : `<div style="text-align:center;color:var(--tg-ink-muted);padding:10px;">
                        ${lang === 'zh' ? `等待下注者 ${UI.escapeHtml(bettor?.name || '')} 选择赔率与筹码...` : `Waiting for Bettor ${UI.escapeHtml(bettor?.name || '')} to lock their wager...`}
                      </div>`
                  : ''
              }
            </section>
          `
          : ''
      }
    </div>
  `;

  // Bind controls
  container.querySelectorAll('[data-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'CHOOSE_ROLE', payload: { role: btn.dataset.role } });
    });
  });

  container.querySelectorAll('[data-sign]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.play('cardFlip');
      dispatch({ type: 'PLAY_RPS', payload: { sign: btn.dataset.sign } });
    });
  });

  container.querySelectorAll('[data-pred]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.play('click');
      draftPred = btn.dataset.pred;
      renderStage(container, ctx);
    });
  });

  container.querySelector('#brps-w-dec')?.addEventListener('click', () => {
    if (draftWager > 1) {
      sfx.play('click');
      draftWager -= 1;
      renderStage(container, ctx);
    }
  });

  container.querySelector('#brps-w-inc')?.addEventListener('click', () => {
    if (draftWager < me.chips) {
      sfx.play('bid');
      draftWager += 1;
      renderStage(container, ctx);
    }
  });

  container.querySelectorAll('[data-wfrac]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.play('chipStack');
      const f = btn.dataset.wfrac;
      if (f === 'min') draftWager = 1;
      else if (f === 'half') draftWager = Math.max(1, Math.ceil(me.chips * 0.5));
      else draftWager = me.chips;
      renderStage(container, ctx);
    });
  });

  container.querySelector('#brps-confirm-bet')?.addEventListener('click', () => {
    sfx.play('chipStack');
    dispatch({
      type: 'PLACE_BET',
      payload: { prediction: draftPred, wager: me.chips === 0 ? 0 : draftWager },
    });
  });

  container.querySelector('#brps-next-round')?.addEventListener('click', () => {
    sfx.play('click');
    dispatch({ type: 'NEXT_ROUND' });
  });
}

import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

const ARCH_LABEL = {
  loyal: { zh: '忠实盟友', en: 'Loyal' },
  mercenary: { zh: '利益佣兵', en: 'Mercenary' },
  contrarian: { zh: '反骨谋士', en: 'Contrarian' },
  patterned: { zh: '规律学者', en: 'Patterned' },
};

const HAND_LABEL = {
  rock: { zh: '石头', en: 'ROCK', beatsZh: '克制 剪刀', beatsEn: 'Beats Scissors' },
  paper: { zh: '布', en: 'PAPER', beatsZh: '克制 石头', beatsEn: 'Beats Rock' },
  scissors: { zh: '剪刀', en: 'SCISSORS', beatsZh: '克制 布', beatsEn: 'Beats Paper' },
};

function renderRpsSigilSvg(hand, size = 68) {
  if (hand === 'rock') {
    return `
      <svg class="ws-rps-sigil" style="width:${size}px;height:${size}px;" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="ws-rock-g" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stop-color="#ff7a93" />
            <stop offset="50%" stop-color="#e11d48" />
            <stop offset="100%" stop-color="#7a091e" />
          </linearGradient>
        </defs>
        <polygon points="50,8 88,28 84,74 50,92 16,74 12,28" fill="url(#ws-rock-g)" stroke="#ffd5dd" stroke-width="2.5" />
        <polygon points="50,20 74,34 71,66 50,79 29,66 26,34" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2" />
        <circle cx="50" cy="50" r="14" fill="#fff0c2" opacity="0.9" />
      </svg>
    `;
  }
  if (hand === 'paper') {
    return `
      <svg class="ws-rps-sigil" style="width:${size}px;height:${size}px;" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="ws-paper-g" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stop-color="#a5f3fc" />
            <stop offset="52%" stop-color="#0ea5e9" />
            <stop offset="100%" stop-color="#0c4a6e" />
          </linearGradient>
        </defs>
        <rect x="18" y="12" width="64" height="76" rx="11" fill="url(#ws-paper-g)" stroke="#e0f2fe" stroke-width="2.5" />
        <line x1="31" y1="34" x2="69" y2="34" stroke="rgba(255,255,255,0.75)" stroke-width="4" stroke-linecap="round" />
        <line x1="31" y1="50" x2="69" y2="50" stroke="rgba(255,255,255,0.75)" stroke-width="4" stroke-linecap="round" />
        <line x1="31" y1="66" x2="56" y2="66" stroke="rgba(255,255,255,0.75)" stroke-width="4" stroke-linecap="round" />
      </svg>
    `;
  }
  return `
    <svg class="ws-rps-sigil" style="width:${size}px;height:${size}px;" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="ws-scis-g" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stop-color="#fff0c2" />
          <stop offset="50%" stop-color="#e4b95b" />
          <stop offset="100%" stop-color="#9a7428" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="rgba(228,185,91,0.12)" stroke="url(#ws-scis-g)" stroke-width="2.5" />
      <path d="M32 20 L66 78 M68 20 L34 78" stroke="url(#ws-scis-g)" stroke-width="9" stroke-linecap="round" />
      <circle cx="33" cy="76" r="10" fill="#121522" stroke="#fff0c2" stroke-width="3" />
      <circle cx="67" cy="76" r="10" fill="#121522" stroke="#fff0c2" stroke-width="3" />
    </svg>
  `;
}

// Local lobby draft per activeSeatId (cleared on new match or submit)
let draftAlloc = new Array(9).fill(0);
let draftOwnerSeat = null;
let lastPhaseKey = '';

mountGame({
  config: {
    id: 'winning-streak',
    title: { zh: '连胜游戏', en: 'Winning Streak', ko: '연승게임' },
    seasons: ['S1E1', 'S1E2', 'S1E5'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    rulesSummary: {
      zh: `### 核心目标
依次与 **9 位观战嘉宾** 展开猜拳车轮战，争夺 **最长连续胜场纪录**！

### 两阶段博弈流程
1. **赛前秘密游说（3 枚情报令牌）**：将你的 3 枚令牌秘密分配给 9 位嘉宾。若你对某嘉宾的投入**高于对手**，忠实/佣兵/规律嘉宾将私下向你透露其**确切手势**（反骨嘉宾投入 1 枚排除 1 个错误选项，投入 2 枚获确切手势）；若双方投入相同则触发冲突，仅排除 1 个错误选项。
2. **9 轮车轮战**：依次迎战 1–9 号嘉宾，双方秘密锁定石头/剪刀/布。
   - **赢**：当前连胜 +1（刷新最高连胜纪录）。
   - **平局或输**：当前连胜归零！但仍须打完 9 轮全程，随时可重新发起连胜冲刺！

### 胜负与平局判定
9 轮结束后比较 **最高连胜数** → 总胜场数 → 更少败场 → 加时突然死亡猜拳。`,
      en: `### Objective
Face a shared gauntlet of **9 Studio Guests** in Rock-Paper-Scissors to build the **longest unbroken winning streak**!

### Two-Phase Mind Game
1. **Pre-Match Secret Lobbying (3 Intel Tokens)**: Secretly distribute 3 tokens across the 9 guests. Out-lobbying your rival on a Loyal, Mercenary, or Patterned guest reveals their **EXACT throw** against you! (Contrarians require 2 tokens for exact reveal, or 1 token to eliminate 1 wrong hand; tied bids yield a partial elimination tell.)
2. **9-Guest Gauntlet**: Against each guest in order, both players secretly lock Rock, Paper, or Scissors.
   - **WIN**: Current streak +1 (updates Best Streak).
   - **DRAW or LOSS**: Current streak resets to 0! You must finish all 9 guests—a late 4-streak can still steal the match!

### Tiebreakers
Highest Best Streak → Total Wins → Fewest Losses → Sudden-Death Overtime against Neutral Dealer.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, activeSeatId, seats, isSpectator, lang, dispatch, log } = ctx;
    if (!state) return;

    const pKey = `${state.phase}-${state.round}-${state.history.length}`;
    if (pKey !== lastPhaseKey) {
      lastPhaseKey = pKey;
      if (state.phase === 'reveal' && state.lastClash) {
        SFX.play('clash');
        const myOut = activeSeatId ? state.lastClash.outcomes[activeSeatId] : null;
        if (myOut === 'win') setTimeout(() => SFX.play('combo'), 180);
        else if (myOut === 'loss') setTimeout(() => SFX.play('error'), 180);
        const g = state.gauntlet[state.lastClash.guestIdx];
        log(
          lang === 'zh'
            ? `第 ${state.lastClash.round} 轮（${g.name.zh}）交锋揭晓`
            : `Round ${state.lastClash.round} vs ${g.name.en} resolved`,
          'system'
        );
      }
    }

    if (state.phase === 'lobby' && draftOwnerSeat !== activeSeatId) {
      draftOwnerSeat = activeSeatId;
      draftAlloc = new Array(9).fill(0);
    }

    const draw = () => {
      const [s0, s1] = state.seatOrder;
      const p0 = state.players[s0];
      const p1 = state.players[s1];
      const name0 = seats.find((s) => s.seatId === s0)?.name || p0.name;
      const name1 = seats.find((s) => s.seatId === s1)?.name || p1.name;

      const myPending = !isSpectator && activeSeatId && state.pendingSeatIds.includes(activeSeatId);
      const spentTokens = draftAlloc.reduce((a, b) => a + b, 0);
      const remainingTokens = state.lobbyBudget - spentTokens;

      const currentGuestIdx = Math.max(0, state.round - 1);
      const currentGuest = state.gauntlet[currentGuestIdx] || state.gauntlet[0];
      const myIntel = activeSeatId ? state.myIntel?.[currentGuestIdx] : null;

      const formatIntelText = (intel) => {
        if (!intel) {
          return lang === 'zh'
            ? '未游说此嘉宾 · 仅能依据公开性格线索推理'
            : 'No private intel on this guest — read their archetype hint';
        }
        if (intel.kind === 'exact') {
          const h = HAND_LABEL[intel.hand];
          return lang === 'zh'
            ? `✦ 密报确认：此嘉宾将对你出「${h.zh}」！（稳赢机会）`
            : `✦ CONFIRMED INTEL: Guest throws ${h.en} against you!`;
        }
        if (intel.kind === 'eliminate') {
          const h = HAND_LABEL[intel.notHand];
          return lang === 'zh'
            ? `◈ 游说情报${intel.contested ? '（双方撞票）' : ''}：此嘉宾绝不会出「${h.zh}」`
            : `◈ INTEL TELL${intel.contested ? ' (Contested)' : ''}: Guest will NOT throw ${h.en}`;
        }
        return lang === 'zh'
          ? '⚠ 游说被对手反超 — 该嘉宾拒绝透露情报'
          : '⚠ Outbid by rival — guest withheld their tell';
      };

      const renderPlayerGauge = (p, name, isRight) => {
        const opp = p.seatId === s0 ? p1 : p0;
        const isLeading = p.maxStreak > opp.maxStreak;
        const isMe = p.seatId === activeSeatId;
        return `
          <div class="ws-player-gauge ${isRight ? 'is-right' : ''} ${isMe ? 'is-me' : ''} ${isLeading ? 'is-leading' : ''}">
            <div class="ws-p-info">
              <span class="ws-p-name">${UI.escapeHtml(name)}</span>
              <span class="ws-p-sub">${p.wins}W · ${p.draws}D · ${p.losses}L</span>
            </div>
            <div class="ws-streak-pair">
              <div class="ws-metric-box is-flame">
                <span class="ws-metric-val">🔥${p.currentStreak}</span>
                <span class="ws-metric-lbl">${lang === 'zh' ? '当前连胜' : 'STREAK'}</span>
              </div>
              <div class="ws-metric-box is-best">
                <span class="ws-metric-val">★${p.maxStreak}</span>
                <span class="ws-metric-lbl">${lang === 'zh' ? '最高纪录' : 'BEST'}</span>
              </div>
            </div>
          </div>
        `;
      };

      const renderGuestRunway = () => {
        const list = state.gauntlet.slice(0, 9);
        const myCommittedLobby = state.myLobby || draftAlloc;
        return `
          <div class="ws-runway-wrap">
            <div class="ws-runway-head">
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '9 人嘉宾车轮战队列' : '9-GUEST GAUNTLET'}</span>
                <span style="font-size:12px;color:var(--tg-ink-muted);">
                  ${
                    state.phase === 'lobby'
                      ? lang === 'zh'
                        ? '点击嘉宾分配游说令牌（右键或再点满额可清零；建议集中连续 3 位冲刺连胜！）'
                        : 'Click guests to allocate Lobby tokens (cluster consecutive guests to chain streaks!)'
                      : lang === 'zh'
                      ? '绿色 W=胜 · 黄色 D=平(断连胜) · 红色 L=负'
                      : 'W = Win (+1 streak) · D/L = Streak Reset'
                  }
                </span>
              </div>
              ${
                state.phase === 'lobby' && myPending
                  ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? `剩余令牌: ${remainingTokens} / ${state.lobbyBudget}` : `Tokens Left: ${remainingTokens} / ${state.lobbyBudget}`}</span>`
                  : ''
              }
            </div>
            <div class="ws-runway-grid">
              ${list
                .map((g, idx) => {
                  const hist = state.history[idx];
                  const isCurr = (state.phase === 'duel' || state.phase === 'reveal') && !state.isOvertime && state.round - 1 === idx;
                  const tokensHere = myCommittedLobby[idx] || 0;
                  const canClick = state.phase === 'lobby' && myPending;
                  return `
                    <div
                      class="ws-guest-card ${canClick ? 'is-clickable' : ''} ${isCurr ? 'is-current' : ''} ${hist && !isCurr ? 'is-done' : ''} ${tokensHere > 0 ? 'is-lobbied' : ''}"
                      data-guest-idx="${idx}"
                      title="${UI.escapeHtml(g.publicHint[lang] || g.publicHint.en)}"
                    >
                      <span class="ws-guest-num">#${idx + 1}</span>
                      <div class="ws-guest-avatar">${g.avatar}</div>
                      <div class="ws-guest-name">${UI.escapeHtml(g.name[lang] || g.name.en)}</div>
                      <span class="ws-arch-tag ws-arch-${g.archetype}">${UI.escapeHtml(ARCH_LABEL[g.archetype][lang])}</span>
                      ${
                        tokensHere > 0
                          ? `<div class="ws-lobby-gems">${'<span class="tg-garnet-gem" style="width:9px;height:11px;"></span>'.repeat(tokensHere)}</div>`
                          : ''
                      }
                      ${
                        hist
                          ? `
                            <div class="ws-res-row">
                              <span class="ws-res-dot is-${hist.outcomes[s0]}" title="${UI.escapeHtml(name0)}">${hist.outcomes[s0][0].toUpperCase()}</span>
                              <span class="ws-res-dot is-${hist.outcomes[s1]}" title="${UI.escapeHtml(name1)}">${hist.outcomes[s1][0].toUpperCase()}</span>
                            </div>
                          `
                          : ''
                      }
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      };

      let centerStageHtml = '';

      if (state.phase === 'lobby') {
        centerStageHtml = `
          <div class="ws-stage-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div>
                <span class="tg-badge tg-badge-gold">${lang === 'zh' ? '第一阶段 · 赛前外交游说' : 'PHASE 1 · PRE-MATCH LOBBY'}</span>
                <h3 style="margin:6px 0 4px;font-family:var(--tg-font-display);font-size:20px;color:var(--tg-gold-bright);">
                  ${lang === 'zh' ? '秘密部署 3 枚游说令牌' : 'Secretly Deploy 3 Lobby Tokens'}
                </h3>
                <p style="margin:0;font-size:13px;color:var(--tg-ink-muted);">
                  ${
                    lang === 'zh'
                      ? '提示：只比拼「最长连续胜场」！把 3 枚令牌集中在连续 3 位嘉宾身上，可保底打造核心连胜段。点击上方嘉宾卡片增减令牌。'
                      : 'Tip: Only your LONGEST CONSECUTIVE STREAK counts! Cluster tokens on adjacent guests to lock in a guaranteed streak backbone.'
                  }
                </p>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                ${UI.renderGarnetBadge(remainingTokens)}
              </div>
            </div>

            ${
              myPending
                ? `
                  <div class="ws-lobby-footer">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                      <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="ws-lobby-clear">${lang === 'zh' ? '重置分配' : 'Clear'}</button>
                      <button type="button" class="tg-btn tg-btn-sm tg-btn-cyan" id="ws-lobby-cluster">${lang === 'zh' ? '推荐：集中中段 #4-#6' : 'Preset: Mid Cluster #4–#6'}</button>
                    </div>
                    <button type="button" class="tg-btn tg-btn-garnet" id="ws-lobby-confirm" ${remainingTokens === 0 ? '' : 'disabled'}>
                      ${lang === 'zh' ? '锁定游说方案 → 进入车轮战' : 'Lock Lobby Plan → Start Gauntlet'}
                    </button>
                  </div>
                `
                : `
                  <div class="ws-intel-box">
                    <span>⏳ ${lang === 'zh' ? '你的游说方案已秘密锁定，等待对手完成部署...' : 'Your Lobby tokens are locked. Waiting for rival...'}</span>
                  </div>
                `
            }
          </div>
        `;
      } else if (state.phase === 'duel') {
        const remainingGuests = state.isOvertime ? 1 : 9 - state.round + 1;
        centerStageHtml = `
          <div class="ws-stage-card">
            <div class="ws-guest-spotlight">
              <div class="ws-spotlight-left">
                <div class="ws-spotlight-orb">${currentGuest.avatar}</div>
                <div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="tg-badge tg-badge-garnet">
                      ${state.isOvertime ? (lang === 'zh' ? '加时突然死亡' : 'SUDDEN DEATH OT') : `GUEST #${state.round} / 9`}
                    </span>
                    <span class="ws-arch-tag ws-arch-${currentGuest.archetype}">${UI.escapeHtml(ARCH_LABEL[currentGuest.archetype][lang])}</span>
                  </div>
                  <div style="font-size:20px;font-weight:800;margin-top:4px;color:var(--tg-ink);">
                    ${UI.escapeHtml(currentGuest.name[lang] || currentGuest.name.en)}
                  </div>
                  <div style="font-size:12.5px;color:var(--tg-ink-muted);">
                    ${lang === 'zh' ? '公开情报：' : 'Public Hint: '}
                    <strong style="color:var(--tg-ink);">${UI.escapeHtml(currentGuest.publicHint[lang] || currentGuest.publicHint.en)}</strong>
                  </div>
                </div>
              </div>
              <div style="text-align:right;font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-ink-muted);">
                ${lang === 'zh' ? `剩余场次：${remainingGuests} 场` : `${remainingGuests} match(es) left`}
              </div>
            </div>

            <div class="ws-intel-box ${myIntel ? '' : 'is-none'}">
              <span>${UI.escapeHtml(formatIntelText(myIntel))}</span>
            </div>

            ${
              myPending
                ? `
                  <div class="ws-rps-grid">
                    ${['rock', 'paper', 'scissors']
                      .map(
                        (h) => `
                        <button type="button" class="ws-rps-card is-${h}" data-hand="${h}">
                          ${renderRpsSigilSvg(h, 74)}
                          <span class="ws-rps-title">${HAND_LABEL[h][lang]}</span>
                          <span class="ws-rps-beats">${lang === 'zh' ? HAND_LABEL[h].beatsZh : HAND_LABEL[h].beatsEn}</span>
                        </button>
                      `
                      )
                      .join('')}
                  </div>
                `
                : `
                  <div class="ws-intel-box" style="justify-content:center;padding:18px;">
                    <span>
                      ${
                        state.myLockedHand
                          ? lang === 'zh'
                            ? `✦ 你已锁定「${HAND_LABEL[state.myLockedHand].zh}」· 等待对手出拳...`
                            : `✦ Locked ${HAND_LABEL[state.myLockedHand].en} · Waiting for rival...`
                          : lang === 'zh'
                          ? '双方正在秘密选择手势...'
                          : 'Contestants locking throws...'
                      }
                    </span>
                  </div>
                `
            }
          </div>
        `;
      } else if (state.phase === 'reveal' && state.lastClash) {
        const c = state.lastClash;
        const g = state.gauntlet[c.guestIdx];
        const renderLane = (sid, name) => {
          const out = c.outcomes[sid];
          const pHand = c.playerThrows[sid];
          const gHand = c.guestThrows[sid];
          const badge =
            out === 'win'
              ? lang === 'zh' ? '✦ 胜 · 连胜 +1' : '✦ WIN · STREAK +1'
              : out === 'draw'
              ? lang === 'zh' ? '平局 · 连胜中断' : 'DRAW · STREAK RESET'
              : lang === 'zh' ? '败 · 连胜中断' : 'LOSS · STREAK RESET';
          return `
            <div class="ws-clash-lane is-${out}">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <strong style="font-size:14px;">${UI.escapeHtml(name)}</strong>
                <span class="tg-badge ${out === 'win' ? 'tg-badge-emerald' : out === 'draw' ? 'tg-badge-gold' : 'tg-badge-garnet'}">${badge}</span>
              </div>
              <div class="ws-clash-versus">
                <div class="ws-clash-hand">
                  ${renderRpsSigilSvg(pHand, 58)}
                  <span style="font-size:12px;font-weight:700;">${HAND_LABEL[pHand][lang]}</span>
                </div>
                <span class="ws-spark-vs">VS</span>
                <div class="ws-clash-hand">
                  ${renderRpsSigilSvg(gHand, 58)}
                  <span style="font-size:12px;color:var(--tg-ink-muted);">${UI.escapeHtml(g.name[lang])} · ${HAND_LABEL[gHand][lang]}</span>
                </div>
              </div>
            </div>
          `;
        };

        centerStageHtml = `
          <div class="ws-stage-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div>
                <span class="tg-badge tg-badge-gold">${lang === 'zh' ? `第 ${c.round} 轮交锋揭晓` : `ROUND ${c.round} REVEAL`}</span>
                <span style="margin-left:8px;font-weight:700;color:var(--tg-ink);">${UI.escapeHtml(g.name[lang])}</span>
              </div>
              ${
                !isSpectator
                  ? `<button type="button" class="tg-btn tg-btn-garnet" id="ws-next-guest">
                      ${
                        !state.isOvertime && state.round < 9
                          ? lang === 'zh' ? `迎战第 ${state.round + 1} 位嘉宾 →` : `Next Guest (#${state.round + 1}) →`
                          : lang === 'zh' ? '查看最终裁决 →' : 'Final Verdict →'
                      }
                    </button>`
                  : ''
              }
            </div>
            <div class="ws-clash-grid">
              ${renderLane(s0, name0)}
              ${renderLane(s1, name1)}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="ws-arena">
          <div class="ws-scoreboard">
            ${renderPlayerGauge(p0, name0, false)}
            <div class="ws-center-badge">
              <span class="tg-badge tg-badge-garnet">${state.phase === 'lobby' ? 'LOBBY' : state.isOvertime ? `OT #${state.round - 9}` : `R ${state.round} / 9`}</span>
              <span style="font-size:11px;color:var(--tg-ink-muted);">${lang === 'zh' ? '连胜高者胜' : 'Longest Streak Wins'}</span>
            </div>
            ${renderPlayerGauge(p1, name1, true)}
          </div>

          ${renderGuestRunway()}
          ${centerStageHtml}
        </div>
      `;

      // Bind lobby card clicks
      if (state.phase === 'lobby' && myPending) {
        container.querySelectorAll('[data-guest-idx]').forEach((card) => {
          card.addEventListener('click', () => {
            const idx = Number(card.dataset.guestIdx);
            const cur = draftAlloc[idx];
            if (remainingTokens > 0 && cur < 2) {
              draftAlloc[idx] = cur + 1;
              SFX.play('garnetClink');
            } else if (cur > 0) {
              draftAlloc[idx] = 0;
              SFX.play('click');
            } else {
              SFX.play('error');
            }
            draw();
          });
          card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const idx = Number(card.dataset.guestIdx);
            if (draftAlloc[idx] > 0) {
              draftAlloc[idx] -= 1;
              SFX.play('click');
              draw();
            }
          });
        });

        container.querySelector('#ws-lobby-clear')?.addEventListener('click', () => {
          SFX.play('click');
          draftAlloc = new Array(9).fill(0);
          draw();
        });

        container.querySelector('#ws-lobby-cluster')?.addEventListener('click', () => {
          SFX.play('chipStack');
          draftAlloc = [0, 0, 0, 1, 1, 1, 0, 0, 0];
          draw();
        });

        container.querySelector('#ws-lobby-confirm')?.addEventListener('click', () => {
          if (remainingTokens !== 0) return;
          SFX.play('bid');
          const allocation = draftAlloc.slice();
          draftAlloc = new Array(9).fill(0);
          dispatch({ type: 'SUBMIT_LOBBY', payload: { allocation } });
        });
      }

      // Bind RPS hand buttons
      container.querySelectorAll('[data-hand]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('cardFlip');
          dispatch({ type: 'LOCK_THROW', payload: { hand: btn.dataset.hand } });
        });
      });

      // Bind next guest button
      container.querySelector('#ws-next-guest')?.addEventListener('click', () => {
        SFX.play('click');
        dispatch({ type: 'NEXT_GUEST' });
      });
    };

    draw();
  },
});

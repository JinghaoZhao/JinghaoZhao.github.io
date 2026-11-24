import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, getFirstBetBounds, getSecondBetBounds } from './rules.js';

const SYM_META = {
  sun: { zh: '太阳 · SUN', en: 'SUN', shortZh: '日', glyph: '☀' },
  moon: { zh: '月亮 · MOON', en: 'MOON', shortZh: '月', glyph: '☾' },
  star: { zh: '星辰 · STAR', en: 'STAR', shortZh: '星', glyph: '★' },
};

const TRUST_META = {
  reliable: { zh: '可靠线人 (~85%可信)', en: 'Reliable (~85% True)' },
  neutral: { zh: '中立嘉宾 (~65%可信)', en: 'Neutral (~65% True)' },
  trickster: { zh: '诡辩谜客 (~35%可信)', en: 'Trickster (~35% True)' },
};

function renderTarotArtSvg(sym, size = 78) {
  if (sym === 'sun') {
    return `
      <svg style="width:${size}px;height:${size}px;" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <radialGradient id="sms-sun-g" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#fff8d6" />
            <stop offset="52%" stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#b45309" />
          </radialGradient>
        </defs>
        <g stroke="#fde68a" stroke-width="3.2" stroke-linecap="round">
          <line x1="60" y1="6" x2="60" y2="22" />
          <line x1="60" y1="98" x2="60" y2="114" />
          <line x1="6" y1="60" x2="22" y2="60" />
          <line x1="98" y1="60" x2="114" y2="60" />
          <line x1="22" y1="22" x2="33" y2="33" />
          <line x1="87" y1="87" x2="98" y2="98" />
          <line x1="98" y1="22" x2="87" y2="33" />
          <line x1="33" y1="87" x2="22" y2="98" />
        </g>
        <circle cx="60" cy="60" r="28" fill="url(#sms-sun-g)" stroke="#fff0c2" stroke-width="2.5" />
        <circle cx="60" cy="60" r="18" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1.8" />
      </svg>
    `;
  }
  if (sym === 'moon') {
    return `
      <svg style="width:${size}px;height:${size}px;" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="sms-moon-g" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stop-color="#f0f9ff" />
            <stop offset="50%" stop-color="#93c5fd" />
            <stop offset="100%" stop-color="#1d4ed8" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(147,197,253,0.3)" stroke-width="1.5" stroke-dasharray="4 4" />
        <path d="M74 20 A38 38 0 1 0 94 86 A29 29 0 1 1 74 20 Z" fill="url(#sms-moon-g)" stroke="#e0f2fe" stroke-width="2.2" />
        <circle cx="84" cy="36" r="3.5" fill="#e0f2fe" />
        <circle cx="94" cy="52" r="2.2" fill="#93c5fd" />
      </svg>
    `;
  }
  return `
    <svg style="width:${size}px;height:${size}px;" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="sms-star-g" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stop-color="#ffe4e6" />
          <stop offset="48%" stop-color="#ff2e54" />
          <stop offset="100%" stop-color="#881337" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,93,143,0.32)" stroke-width="1.5" />
      <polygon points="60,10 71,44 106,44 77,65 88,100 60,78 32,100 43,65 14,44 49,44" fill="url(#sms-star-g)" stroke="#fecdd3" stroke-width="2.2" stroke-linejoin="round" />
      <circle cx="60" cy="58" r="8" fill="#fff0c2" />
    </svg>
  `;
}

function renderOrreryRingsSvg() {
  return `
    <svg class="sms-orrery-rings" viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="190" fill="none" stroke="#e4b95b" stroke-width="1.2" stroke-dasharray="6 8" />
      <circle cx="200" cy="200" r="145" fill="none" stroke="#e4b95b" stroke-width="1" />
      <circle cx="200" cy="200" r="95" fill="none" stroke="#ff2e54" stroke-width="1" stroke-dasharray="3 6" />
      <line x1="10" y1="200" x2="390" y2="200" stroke="rgba(228,185,91,0.45)" stroke-width="0.8" />
      <line x1="200" y1="10" x2="200" y2="390" stroke="rgba(228,185,91,0.45)" stroke-width="0.8" />
    </svg>
  `;
}

// Local UI draft state for symbol & wager selection
let draftSymbol = 'sun';
let draftAmount = 1;
let lastTurnKey = '';
let lastRevealKey = '';

mountGame({
  config: {
    id: 'sun-moon-star',
    title: { zh: '日月星', en: 'Sun, Moon, Star', ko: '해, 달, 별' },
    seasons: ['S2E2', 'S2E4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    rulesSummary: {
      zh: `### 核心目标
面对 **10 个神秘圣杯**（各藏有太阳☀、月亮☾或星辰★之一），双方初始各持 **4 枚筹码**。利用嘉宾密语与不对称双倍下注规则，令对手筹码归零或 10 轮后筹码领先者胜！

### 经典第2季强制 2× 下注规则
1. **嘉宾密语**：每轮开杯前，由该杯嘉宾向双方私下发送一条线报（注意嘉宾的 **可信度评级**：可靠线人约 85%、中立约 65%、诡辩谜客仅 35% 极易反话误导！）。
2. **先手下注**：选定日/月/星之一并押注 **B₁**（最少 1 枚，最多不超过**对手当前筹码的一半**向下取整；若对手仅剩 1 枚则先手押 1）。
3. **后手强制 2× 响应**：看到先手所选图案与押注额后，后手可任选日/月/星（可与先手相同或不同），但**必须至少下注 2 × B₁**（若筹码不足则强制全下 All-In！）。
4. **开杯结算（2:1 净赔率）**：
   - **猜中**：获得 **3 倍返还**（净赚 **+2× 押注额**）！
   - **猜错**：失去押注筹码（净亏 **-1× 押注额**）。
   - 任意一方筹码跌至 **0** 即刻淘汰！10 轮战平则进入加时圣杯。`,
      en: `### Objective
10 gilded chalices each hide **Sun (☀)**, **Moon (☾)**, or **Star (★)**. Both start with **4 chips**. Use Guest Whispers and the lethal Forced-2× betting rule to bankrupt your rival or lead in chips after Round 10!

### Official S2E2 / S2E4 Asymmetric Betting Rules
1. **Private Guest Whisper**: Each cup's host whispers a private clue to each player alongside their displayed **Trust Rating** (Reliable ~85%, Neutral ~65%, Trickster ~35%!).
2. **First Bettor**: Picks Sun, Moon, or Star and wagers **B₁** (min 1, max **floor(Rival's Chips / 2)**; if rival has 1 chip, B₁ = 1).
3. **Second Bettor (Forced 2×)**: Sees the First Bettor's symbol & B₁, picks ANY symbol, and **MUST wager at least 2 × B₁** (capped at All-In if shorter).
4. **Chalice Reveal (2:1 Profit)**:
   - **Correct**: Paid **3× total return** (net **+2× wager**)!
   - **Wrong**: Lose your wagered chips.
   - Dropping to **0 chips** = instant elimination!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, activeSeatId, seats, isSpectator, lang, dispatch, log } = ctx;
    if (!state) return;

    const myTurn = !isSpectator && activeSeatId && state.currentTurnSeatId === activeSeatId;
    const firstChips = state.players[state.firstSeatId].chips;
    const secondChips = state.players[state.secondSeatId].chips;

    let minBet = 1;
    let maxBet = 1;
    if (state.phase === 'bet_first') {
      ({ minBet, maxBet } = getFirstBetBounds(firstChips, secondChips));
    } else if (state.phase === 'bet_second') {
      const b1 = state.currentBets[state.firstSeatId]?.amount || 1;
      ({ minBet, maxBet } = getSecondBetBounds(secondChips, b1));
    }

    const turnKey = `${state.round}-${state.phase}-${activeSeatId}`;
    if (turnKey !== lastTurnKey) {
      lastTurnKey = turnKey;
      draftAmount = minBet;
      // Default select a sensible symbol when turn begins
      if (state.myWhisper?.kind === 'claim') {
        draftSymbol = state.myWhisper.symbol;
      } else {
        draftSymbol = 'sun';
      }
    }
    draftAmount = Math.max(minBet, Math.min(maxBet, draftAmount));

    const revKey = state.phase === 'reveal' && state.lastReveal ? `rev-${state.lastReveal.round}` : '';
    if (revKey && revKey !== lastRevealKey) {
      lastRevealKey = revKey;
      SFX.play('cardFlip');
      setTimeout(() => SFX.play('reveal'), 220);
      const rev = state.lastReveal;
      if (activeSeatId && rev.hits[activeSeatId]) {
        setTimeout(() => SFX.play('garnetClink'), 460);
      }
      log(
        lang === 'zh'
          ? `第 ${rev.round} 杯揭晓：${SYM_META[rev.secretSymbol].zh}`
          : `Cup #${rev.round} revealed: ${SYM_META[rev.secretSymbol].en}`,
        'alert'
      );
    }

    const draw = () => {
      const [s0, s1] = state.seatOrder;
      const p0 = state.players[s0];
      const p1 = state.players[s1];
      const name0 = seats.find((s) => s.seatId === s0)?.name || p0.name;
      const name1 = seats.find((s) => s.seatId === s1)?.name || p1.name;

      const curCup = state.currentCupMeta;
      const isReveal = state.phase === 'reveal' || state.phase === 'ended';
      const revealedSym = curCup?.secretSymbol || state.lastReveal?.secretSymbol || null;

      const formatWhisper = (w) => {
        if (!w) return lang === 'zh' ? '观战视角（密语已保密）' : 'Spectator view (whispers hidden)';
        const sm = SYM_META[w.symbol];
        if (w.kind === 'claim') {
          return lang === 'zh'
            ? `密语线报：「杯中藏着 ${sm.glyph} ${sm.zh}」`
            : `Private Whisper: "Inside the chalice is ${sm.glyph} ${sm.en}."`;
        }
        return lang === 'zh'
          ? `密语线报：「杯中绝不是 ${sm.glyph} ${sm.zh}」`
          : `Private Whisper: "It is NOT ${sm.glyph} ${sm.en}."`;
      };

      const renderVault = (p, name, isRight) => {
        const isFirst = p.seatId === state.firstSeatId;
        const isTurn = p.seatId === state.currentTurnSeatId;
        const roleTag = isFirst
          ? lang === 'zh' ? '先手 · 1× 定调' : '1ST · SETS PACE'
          : lang === 'zh' ? '后手 · 强制 2×' : '2ND · FORCED 2×';
        return `
          <div class="sms-vault-card ${isRight ? 'is-right' : ''} ${isTurn ? 'is-turn' : ''}">
            <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
              <strong style="font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.escapeHtml(name)}</strong>
              <span class="tg-badge ${isFirst ? 'tg-badge-gold' : 'tg-badge-garnet'}" style="width:fit-content;${isRight ? 'align-self:flex-end;' : ''}">${roleTag}</span>
            </div>
            <div class="sms-chip-stack">
              <span class="sms-chip-count ${p.chips <= 1 ? 'is-danger' : ''}">${p.chips}</span>
              <span style="font-size:11px;color:var(--tg-ink-muted);text-transform:uppercase;">${lang === 'zh' ? '筹码' : 'CHIPS'}</span>
            </div>
          </div>
        `;
      };

      const renderBetPillar = (sid, name) => {
        const bet = isReveal ? state.lastReveal?.bets?.[sid] : state.currentBets?.[sid];
        const hit = isReveal ? state.lastReveal?.hits?.[sid] : null;
        const delta = isReveal ? state.lastReveal?.deltas?.[sid] : null;
        const cls = hit === true ? 'is-won' : hit === false ? 'is-lost' : '';
        return `
          <div class="sms-bet-pillar ${cls}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span style="font-size:12.5px;font-weight:700;color:var(--tg-ink);">${UI.escapeHtml(name)}</span>
              <span style="font-size:10.5px;color:var(--tg-ink-faint);">${sid === state.firstSeatId ? '1ST' : '2ND (2×)'}</span>
            </div>
            ${
              bet
                ? `
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">
                    <span style="font-family:var(--tg-font-display);font-size:16px;font-weight:800;color:var(--tg-gold-bright);">
                      ${SYM_META[bet.symbol].glyph} ${SYM_META[bet.symbol][lang]}
                    </span>
                    <span class="tg-badge tg-badge-gold">${bet.amount} ${lang === 'zh' ? '枚' : 'chips'}</span>
                  </div>
                  ${
                    delta != null
                      ? `<div style="font-family:var(--tg-font-mono);font-size:13px;font-weight:800;color:${delta > 0 ? '#86efac' : '#ff8ba0'};">
                          ${delta > 0 ? `+${delta} (${lang === 'zh' ? '命中 3× 返还!' : 'HIT 3× RETURN!'})` : `${delta} (${lang === 'zh' ? '未中' : 'MISS'})`}
                        </div>`
                      : ''
                  }
                `
                : `<div style="font-size:12.5px;color:var(--tg-ink-faint);">${
                    state.currentTurnSeatId === sid
                      ? lang === 'zh' ? '正在权衡押注...' : 'Weighing wager...'
                      : lang === 'zh' ? '等待轮次...' : 'Waiting...'
                  }</div>`
            }
          </div>
        `;
      };

      const cupsTrackHtml = state.cups
        .slice(0, Math.max(10, state.round))
        .map((c, i) => {
          const isCur = c.cupNumber === state.round;
          const sym = c.secretSymbol;
          return `
            <div class="sms-cup-pip ${isCur ? 'is-current' : sym ? 'is-done' : ''}">
              <span>#${c.cupNumber}</span>
              <span class="sms-pip-sym ${sym ? `is-${sym}` : ''}">${sym ? SYM_META[sym].glyph : '◈'}</span>
            </div>
          `;
        })
        .join('');

      const firstBet = state.currentBets[state.firstSeatId];

      container.innerHTML = `
        <div class="sms-arena">
          <div class="sms-top-bar">
            ${renderVault(p0, name0, false)}
            <div style="text-align:center;">
              <div class="tg-badge tg-badge-gold">${state.isOvertime ? `OT CUP #${state.round}` : `CUP ${state.round} / ${state.totalRounds}`}</div>
              <div style="font-size:11px;color:var(--tg-ink-muted);margin-top:4px;">${lang === 'zh' ? '命中净赚 2× · 0 筹即淘汰' : 'Hit = +2× Net · 0 = Bust'}</div>
            </div>
            ${renderVault(p1, name1, true)}
          </div>

          <div class="sms-cup-track">${cupsTrackHtml}</div>

          <div class="sms-orrery-stage">
            ${renderOrreryRingsSvg()}
            <div class="sms-stage-inner">
              ${
                curCup
                  ? `
                    <div class="sms-whisper-card">
                      <div style="display:flex;flex-direction:column;gap:3px;">
                        <div style="font-size:12px;color:var(--tg-ink-muted);">
                          ${lang === 'zh' ? `第 ${curCup.cupNumber} 号圣杯嘉宾：` : `Cup #${curCup.cupNumber} Host: `}
                          <strong style="color:var(--tg-ink);">${UI.escapeHtml(curCup.hostName[lang])}</strong>
                        </div>
                        <div style="font-size:14.5px;font-weight:700;color:var(--tg-gold-bright);">
                          ${UI.escapeHtml(formatWhisper(state.myWhisper))}
                        </div>
                      </div>
                      <span class="sms-trust-pill sms-trust-${curCup.trust}">${UI.escapeHtml(TRUST_META[curCup.trust][lang])}</span>
                    </div>
                  `
                  : ''
              }

              <div class="sms-chalice-row">
                ${renderBetPillar(s0, name0)}

                <div class="tg-card-3d sms-tarot-center ${isReveal ? '' : 'is-flipped'}">
                  <div class="tg-card-3d-inner">
                    <div class="tg-card-face tg-card-front sms-tarot-front ${revealedSym ? `is-${revealedSym}` : ''}">
                      ${
                        revealedSym
                          ? `
                            ${renderTarotArtSvg(revealedSym, 92)}
                            <div style="font-family:var(--tg-font-display);font-size:16px;font-weight:900;letter-spacing:0.1em;color:var(--tg-gold-bright);">
                              ${SYM_META[revealedSym][lang]}
                            </div>
                          `
                          : ''
                      }
                    </div>
                    <div class="tg-card-face tg-card-back sms-tarot-back">
                      <div style="font-size:34px;color:var(--tg-gold-bright);text-shadow:0 0 18px var(--tg-gold-glow);">☀ ☾ ★</div>
                      <div style="font-family:var(--tg-font-display);font-size:13px;font-weight:800;letter-spacing:0.14em;color:var(--tg-gold);">
                        CUP #${state.round}
                      </div>
                      <div style="font-size:11px;color:var(--tg-ink-muted);">
                        ${lang === 'zh' ? '封印中 · 等待揭晓' : 'SEALED CHALICE'}
                      </div>
                    </div>
                  </div>
                </div>

                ${renderBetPillar(s1, name1)}
              </div>

              ${
                state.phase === 'bet_second' && firstBet
                  ? `
                    <div class="sms-forced-alert">
                      ${
                        lang === 'zh'
                          ? `⚡ 先手已押注「${SYM_META[firstBet.symbol].zh}」${firstBet.amount} 枚 — 后手强制至少下注 ${minBet} 枚（2× 规则${minBet === secondChips ? ' · 已触发全下!' : ''}）！`
                          : `⚡ First Bettor wagered ${firstBet.amount} on ${SYM_META[firstBet.symbol].en} — Second Bettor MUST wager at least ${minBet} chips (2× Rule${minBet === secondChips ? ' · ALL-IN!' : ''})!`
                      }
                    </div>
                  `
                  : ''
              }

              ${
                state.phase === 'reveal'
                  ? `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
                      ${
                        state.lastReveal?.doubleBustReset
                          ? `<div class="tg-badge tg-badge-garnet">${lang === 'zh' ? '双方同时归零！各获救济 1 筹继续突然死亡！' : 'Double Bust! Both restored to 1 chip for Sudden Death!'}</div>`
                          : ''
                      }
                      ${
                        !isSpectator
                          ? `<button type="button" class="tg-btn tg-btn-garnet" id="sms-next-cup" style="min-width:220px;">
                              ${
                                p0.chips === 0 || p1.chips === 0 || (state.round >= state.totalRounds && p0.chips !== p1.chips)
                                  ? lang === 'zh' ? '宣读最终裁决 →' : 'Reveal Final Verdict →'
                                  : lang === 'zh' ? `开启第 ${state.round + 1} 号圣杯 →` : `Next Chalice (#${state.round + 1}) →`
                              }
                            </button>`
                          : ''
                      }
                    </div>
                  `
                  : myTurn
                  ? `
                    <div class="sms-picker-grid">
                      ${['sun', 'moon', 'star']
                        .map(
                          (sym) => `
                          <button type="button" class="sms-foil-card is-${sym} ${draftSymbol === sym ? 'is-selected' : ''}" data-sym="${sym}">
                            ${renderTarotArtSvg(sym, 70)}
                            <span class="sms-foil-name">${SYM_META[sym][lang]}</span>
                          </button>
                        `
                        )
                        .join('')}
                    </div>

                    <div class="sms-wager-console">
                      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                        <div>
                          <div style="font-size:11px;color:var(--tg-ink-muted);text-transform:uppercase;">
                            ${lang === 'zh' ? `押注范围 (${minBet}–${maxBet} 枚)` : `Wager Range (${minBet}–${maxBet})`}
                          </div>
                          <div style="font-size:12px;color:var(--tg-gold);">
                            ${lang === 'zh' ? `若命中净赚 +${draftAmount * 2} 枚` : `Hit profit: +${draftAmount * 2} chips`}
                          </div>
                        </div>
                        <div class="tg-dial">
                          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="sms-wager-dec" ${draftAmount <= minBet ? 'disabled' : ''}>−</button>
                          <span class="tg-dial-value">${draftAmount}</span>
                          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="sms-wager-inc" ${draftAmount >= maxBet ? 'disabled' : ''}>+</button>
                        </div>
                        <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="sms-wager-max" ${draftAmount === maxBet ? 'disabled' : ''}>
                          ${lang === 'zh' ? `最大 (${maxBet})` : `MAX (${maxBet})`}
                        </button>
                      </div>
                      <button type="button" class="tg-btn tg-btn-garnet" id="sms-lock-bet" style="min-width:190px;min-height:44px;">
                        ${lang === 'zh' ? `锁定 ${SYM_META[draftSymbol].shortZh} · ${draftAmount} 枚 →` : `Lock ${SYM_META[draftSymbol].en} · ${draftAmount} →`}
                      </button>
                    </div>
                  `
                  : `
                    <div class="tg-badge tg-badge-cyan" style="padding:8px 16px;font-size:12.5px;">
                      ⏳ ${lang === 'zh' ? '等待对手完成星象下注...' : 'Waiting for rival to lock celestial wager...'}
                    </div>
                  `
              }
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('[data-sym]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('cardFlip');
          draftSymbol = btn.dataset.sym;
          draw();
        });
      });

      container.querySelector('#sms-wager-dec')?.addEventListener('click', () => {
        if (draftAmount > minBet) {
          SFX.play('chipStack');
          draftAmount -= 1;
          draw();
        }
      });

      container.querySelector('#sms-wager-inc')?.addEventListener('click', () => {
        if (draftAmount < maxBet) {
          SFX.play('chipStack');
          draftAmount += 1;
          draw();
        }
      });

      container.querySelector('#sms-wager-max')?.addEventListener('click', () => {
        SFX.play('chipStack');
        draftAmount = maxBet;
        draw();
      });

      container.querySelector('#sms-lock-bet')?.addEventListener('click', () => {
        SFX.play('bid');
        dispatch({
          type: 'PLACE_BET',
          payload: { symbol: draftSymbol, amount: draftAmount },
        });
      });

      container.querySelector('#sms-next-cup')?.addEventListener('click', () => {
        SFX.play('click');
        dispatch({ type: 'NEXT_CUP' });
      });
    };

    draw();
  },
});

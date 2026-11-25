import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
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
          <radialGradient id="sms-sun-g-${size}" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#fff8d6" />
            <stop offset="52%" stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#b45309" />
          </radialGradient>
        </defs>
        <g stroke="#d97706" stroke-width="3.2" stroke-linecap="round">
          <line x1="60" y1="6" x2="60" y2="22" />
          <line x1="60" y1="98" x2="60" y2="114" />
          <line x1="6" y1="60" x2="22" y2="60" />
          <line x1="98" y1="60" x2="114" y2="60" />
          <line x1="22" y1="22" x2="33" y2="33" />
          <line x1="87" y1="87" x2="98" y2="98" />
          <line x1="98" y1="22" x2="87" y2="33" />
          <line x1="33" y1="87" x2="22" y2="98" />
        </g>
        <circle cx="60" cy="60" r="28" fill="url(#sms-sun-g-${size})" stroke="#f59e0b" stroke-width="2.5" />
        <circle cx="60" cy="60" r="18" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1.8" />
      </svg>
    `;
  }
  if (sym === 'moon') {
    return `
      <svg style="width:${size}px;height:${size}px;" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="sms-moon-g-${size}" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stop-color="#e0f2fe" />
            <stop offset="50%" stop-color="#60a5fa" />
            <stop offset="100%" stop-color="#1d4ed8" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(56,189,248,0.36)" stroke-width="1.5" stroke-dasharray="4 4" />
        <path d="M74 20 A38 38 0 1 0 94 86 A29 29 0 1 1 74 20 Z" fill="url(#sms-moon-g-${size})" stroke="#38bdf8" stroke-width="2.2" />
        <circle cx="84" cy="36" r="3.5" fill="#38bdf8" />
        <circle cx="94" cy="52" r="2.2" fill="#60a5fa" />
      </svg>
    `;
  }
  return `
    <svg style="width:${size}px;height:${size}px;" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="sms-star-g-${size}" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stop-color="#ffe4e6" />
          <stop offset="48%" stop-color="#e11d48" />
          <stop offset="100%" stop-color="#881337" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(225,29,72,0.34)" stroke-width="1.5" />
      <polygon points="60,10 71,44 106,44 77,65 88,100 60,78 32,100 43,65 14,44 49,44" fill="url(#sms-star-g-${size})" stroke="#fb7185" stroke-width="2.2" stroke-linejoin="round" />
      <circle cx="60" cy="58" r="8" fill="#fff0c2" />
    </svg>
  `;
}

function renderOrreryRingsSvg() {
  return `
    <svg class="sms-orrery-rings" viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 8" />
      <circle cx="200" cy="200" r="145" fill="none" stroke="currentColor" stroke-width="1" />
      <circle cx="200" cy="200" r="95" fill="none" stroke="#d91b3a" stroke-width="1" stroke-dasharray="3 6" />
      <line x1="10" y1="200" x2="390" y2="200" stroke="currentColor" stroke-width="0.8" opacity="0.45" />
      <line x1="200" y1="10" x2="200" y2="390" stroke="currentColor" stroke-width="0.8" opacity="0.45" />
    </svg>
  `;
}

// Persistent local interaction state
let draftSymbol = 'sun';
let draftAmount = 1;
let curBounds = { minBet: 1, maxBet: 1 };
let lastTurnKey = '';
let lastRevealKey = '';
let prevChips = {};
let latestCtx = null;
let refs = null;

function patchBettingDraftInPlace(animateDial = false) {
  if (!refs || !latestCtx?.state) return;
  const { lang } = latestCtx;
  const { minBet, maxBet } = curBounds;
  draftAmount = Math.max(minBet, Math.min(maxBet, draftAmount));

  // Patch 3 foil cards in place (140ms spring lift, zero DOM rebuild!)
  refs.foilCards.forEach((btn) => {
    btn.classList.toggle('is-selected', btn.dataset.sym === draftSymbol);
  });

  // Patch wager dial in place
  const prevDial = Number(refs.dialVal.textContent) || minBet;
  if (animateDial && prevDial !== draftAmount) {
    Motion.animateNumber(refs.dialVal, prevDial, draftAmount, { duration: 150 });
  } else {
    refs.dialVal.textContent = String(draftAmount);
  }

  refs.btnDec.disabled = draftAmount <= minBet;
  refs.btnInc.disabled = draftAmount >= maxBet;
  refs.btnMax.disabled = draftAmount === maxBet;
  refs.btnMax.textContent = lang === 'zh' ? `最大 (${maxBet})` : `MAX (${maxBet})`;
  refs.wagerRange.textContent = lang === 'zh' ? `押注范围 (${minBet}–${maxBet} 枚)` : `Wager Range (${minBet}–${maxBet})`;
  refs.wagerProfit.textContent = lang === 'zh' ? `若命中净赚 +${draftAmount * 2} 枚` : `Hit profit: +${draftAmount * 2} chips`;
  refs.btnLockBet.textContent =
    lang === 'zh'
      ? `锁定 ${SYM_META[draftSymbol].shortZh} · ${draftAmount} 枚 →`
      : `Lock ${SYM_META[draftSymbol].en} · ${draftAmount} →`;
}

function mountSkeleton(container) {
  container.innerHTML = `
    <div class="sms-arena">
      <div class="sms-top-bar">
        <div class="sms-vault-card" id="sms-vault-0">
          <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <strong id="sms-name-0" style="font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></strong>
            <span class="tg-badge" id="sms-role-0" style="width:fit-content;"></span>
          </div>
          <div class="sms-chip-stack">
            <span class="sms-chip-count" id="sms-chips-0">4</span>
            <span class="sms-chip-lbl" style="font-size:11px;color:var(--tg-ink-muted);text-transform:uppercase;"></span>
          </div>
        </div>

        <div style="text-align:center;">
          <div class="tg-badge tg-badge-gold" id="sms-round-badge">CUP 1 / 10</div>
          <div id="sms-round-sub" style="font-size:11px;color:var(--tg-ink-muted);margin-top:4px;"></div>
        </div>

        <div class="sms-vault-card is-right" id="sms-vault-1">
          <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <strong id="sms-name-1" style="font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></strong>
            <span class="tg-badge" id="sms-role-1" style="width:fit-content;align-self:flex-end;"></span>
          </div>
          <div class="sms-chip-stack">
            <span class="sms-chip-count" id="sms-chips-1">4</span>
            <span class="sms-chip-lbl" style="font-size:11px;color:var(--tg-ink-muted);text-transform:uppercase;"></span>
          </div>
        </div>
      </div>

      <div class="sms-cup-track" id="sms-cup-track"></div>

      <div class="sms-orrery-stage" style="color:var(--tg-gold);">
        ${renderOrreryRingsSvg()}
        <div class="sms-stage-inner">
          <div class="sms-whisper-card" id="sms-whisper-card">
            <div style="display:flex;flex-direction:column;gap:3px;">
              <div style="font-size:12px;color:var(--tg-ink-muted);">
                <span id="sms-host-prefix"></span>
                <strong id="sms-host-name" style="color:var(--tg-ink);"></strong>
              </div>
              <div id="sms-whisper-text" style="font-size:14.5px;font-weight:700;color:var(--tg-gold-bright);"></div>
            </div>
            <span class="sms-trust-pill" id="sms-trust-pill"></span>
          </div>

          <div class="sms-chalice-row">
            <div class="sms-bet-pillar" id="sms-pillar-0"></div>

            <!-- Persistent 3D Tarot Chalice Card: never nuked across phases so rotateY flip plays smoothly! -->
            <div class="tg-card-3d sms-tarot-center is-flipped" id="sms-tarot-card">
              <div class="tg-card-3d-inner">
                <div class="tg-card-face tg-card-front sms-tarot-front" id="sms-tarot-front">
                  <div id="sms-tarot-art"></div>
                  <div id="sms-tarot-label" style="font-family:var(--tg-font-display);font-size:16px;font-weight:900;letter-spacing:0.1em;"></div>
                </div>
                <div class="tg-card-face tg-card-back sms-tarot-back">
                  <div style="font-size:32px;color:#fff0c2;">☀ ☾ ★</div>
                  <div id="sms-tarot-cup-num" style="font-family:var(--tg-font-display);font-size:13px;font-weight:800;letter-spacing:0.14em;color:#e4b95b;">CUP #1</div>
                  <div id="sms-tarot-back-sub" style="font-size:11px;color:#a2a8bc;"></div>
                </div>
              </div>
            </div>

            <div class="sms-bet-pillar" id="sms-pillar-1"></div>
          </div>

          <div class="sms-forced-alert" id="sms-forced-alert" hidden></div>

          <div id="sms-reveal-actions" style="display:flex;flex-direction:column;align-items:center;gap:10px;" hidden>
            <div class="tg-badge tg-badge-garnet" id="sms-double-bust" hidden></div>
            <button type="button" class="tg-btn tg-btn-garnet" id="sms-next-cup" style="min-width:220px;"></button>
          </div>

          <!-- Persistent Foil Picker + Wager Console -->
          <div id="sms-bet-controls" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;">
            <div class="sms-picker-grid">
              ${['sun', 'moon', 'star']
                .map(
                  (sym) => `
                  <button type="button" class="sms-foil-card is-${sym}" data-sym="${sym}">
                    ${renderTarotArtSvg(sym, 70)}
                    <span class="sms-foil-name" data-sym-label="${sym}"></span>
                  </button>
                `
                )
                .join('')}
            </div>

            <div class="sms-wager-console">
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <div>
                  <div id="sms-wager-range" style="font-size:11px;color:var(--tg-ink-muted);text-transform:uppercase;"></div>
                  <div id="sms-wager-profit" style="font-size:12px;color:var(--tg-gold-bright);font-weight:600;"></div>
                </div>
                <div class="tg-dial">
                  <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="sms-wager-dec">−</button>
                  <span class="tg-dial-value" id="sms-dial-val">1</span>
                  <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="sms-wager-inc">+</button>
                </div>
                <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="sms-wager-max"></button>
              </div>
              <button type="button" class="tg-btn tg-btn-garnet" id="sms-lock-bet" style="min-width:190px;min-height:44px;"></button>
            </div>
          </div>

          <div class="tg-badge tg-badge-cyan" id="sms-wait-pill" style="padding:8px 16px;font-size:12.5px;" hidden></div>
        </div>
      </div>
    </div>
  `;

  container.dataset.mountedGame = 'sun-moon-star';

  refs = {
    vault0: container.querySelector('#sms-vault-0'),
    name0: container.querySelector('#sms-name-0'),
    role0: container.querySelector('#sms-role-0'),
    chips0: container.querySelector('#sms-chips-0'),
    vault1: container.querySelector('#sms-vault-1'),
    name1: container.querySelector('#sms-name-1'),
    role1: container.querySelector('#sms-role-1'),
    chips1: container.querySelector('#sms-chips-1'),
    chipLbls: Array.from(container.querySelectorAll('.sms-chip-lbl')),
    roundBadge: container.querySelector('#sms-round-badge'),
    roundSub: container.querySelector('#sms-round-sub'),
    cupTrack: container.querySelector('#sms-cup-track'),
    whisperCard: container.querySelector('#sms-whisper-card'),
    hostPrefix: container.querySelector('#sms-host-prefix'),
    hostName: container.querySelector('#sms-host-name'),
    whisperText: container.querySelector('#sms-whisper-text'),
    trustPill: container.querySelector('#sms-trust-pill'),
    pillar0: container.querySelector('#sms-pillar-0'),
    pillar1: container.querySelector('#sms-pillar-1'),
    tarotCard: container.querySelector('#sms-tarot-card'),
    tarotFront: container.querySelector('#sms-tarot-front'),
    tarotArt: container.querySelector('#sms-tarot-art'),
    tarotLabel: container.querySelector('#sms-tarot-label'),
    tarotCupNum: container.querySelector('#sms-tarot-cup-num'),
    tarotBackSub: container.querySelector('#sms-tarot-back-sub'),
    forcedAlert: container.querySelector('#sms-forced-alert'),
    revealActions: container.querySelector('#sms-reveal-actions'),
    doubleBust: container.querySelector('#sms-double-bust'),
    btnNextCup: container.querySelector('#sms-next-cup'),
    betControls: container.querySelector('#sms-bet-controls'),
    foilCards: Array.from(container.querySelectorAll('.sms-foil-card')),
    symLabels: Array.from(container.querySelectorAll('[data-sym-label]')),
    wagerRange: container.querySelector('#sms-wager-range'),
    wagerProfit: container.querySelector('#sms-wager-profit'),
    btnDec: container.querySelector('#sms-wager-dec'),
    btnInc: container.querySelector('#sms-wager-inc'),
    btnMax: container.querySelector('#sms-wager-max'),
    dialVal: container.querySelector('#sms-dial-val'),
    btnLockBet: container.querySelector('#sms-lock-bet'),
    waitPill: container.querySelector('#sms-wait-pill'),
  };

  refs.foilCards.forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('cardFlip');
      draftSymbol = btn.dataset.sym;
      patchBettingDraftInPlace(false);
    });
  });

  refs.btnDec.addEventListener('click', () => {
    if (draftAmount > curBounds.minBet) {
      SFX.play('chipStack');
      draftAmount -= 1;
      patchBettingDraftInPlace(true);
    }
  });

  refs.btnInc.addEventListener('click', () => {
    if (draftAmount < curBounds.maxBet) {
      SFX.play('chipStack');
      draftAmount += 1;
      patchBettingDraftInPlace(true);
    }
  });

  refs.btnMax.addEventListener('click', () => {
    SFX.play('chipStack');
    draftAmount = curBounds.maxBet;
    patchBettingDraftInPlace(true);
  });

  refs.btnLockBet.addEventListener('click', () => {
    if (!latestCtx) return;
    SFX.play('bid');
    Motion.pulseConfirm(refs.btnLockBet, { tone: 'gold', duration: 180 });
    latestCtx.dispatch({
      type: 'PLACE_BET',
      payload: { symbol: draftSymbol, amount: draftAmount },
    });
  });

  refs.btnNextCup.addEventListener('click', () => {
    SFX.play('click');
    latestCtx?.dispatch({ type: 'NEXT_CUP' });
  });
}

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
    latestCtx = ctx;
    const { state, activeSeatId, seats, isSpectator, lang, log } = ctx;
    if (!state) return;

    if (container.dataset.mountedGame !== 'sun-moon-star') {
      mountSkeleton(container);
      prevChips = {};
      lastTurnKey = '';
      lastRevealKey = '';
    }

    const [s0, s1] = state.seatOrder;
    const p0 = state.players[s0];
    const p1 = state.players[s1];
    const name0 = seats.find((s) => s.seatId === s0)?.name || p0.name;
    const name1 = seats.find((s) => s.seatId === s1)?.name || p1.name;

    const myTurn = !isSpectator && activeSeatId && state.currentTurnSeatId === activeSeatId;
    const firstChips = state.players[state.firstSeatId].chips;
    const secondChips = state.players[state.secondSeatId].chips;

    if (state.phase === 'bet_first') {
      curBounds = getFirstBetBounds(firstChips, secondChips);
    } else if (state.phase === 'bet_second') {
      const b1 = state.currentBets[state.firstSeatId]?.amount || 1;
      curBounds = getSecondBetBounds(secondChips, b1);
    }

    const turnKey = `${state.round}-${state.phase}-${activeSeatId}`;
    if (turnKey !== lastTurnKey) {
      lastTurnKey = turnKey;
      draftAmount = curBounds.minBet;
      draftSymbol = state.myWhisper?.kind === 'claim' ? state.myWhisper.symbol : 'sun';
    }

    const isReveal = state.phase === 'reveal' || state.phase === 'ended';
    const revKey = state.phase === 'reveal' && state.lastReveal ? `rev-${state.lastReveal.round}` : '';
    let justRevealed = false;
    if (revKey && revKey !== lastRevealKey) {
      lastRevealKey = revKey;
      justRevealed = true;
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

    // Patch dual chip vaults with Motion.animateNumber + delta pills!
    const patchVault = (p, name, idx) => {
      const vaultEl = idx === 0 ? refs.vault0 : refs.vault1;
      const nameEl = idx === 0 ? refs.name0 : refs.name1;
      const roleEl = idx === 0 ? refs.role0 : refs.role1;
      const chipsEl = idx === 0 ? refs.chips0 : refs.chips1;

      const isFirst = p.seatId === state.firstSeatId;
      nameEl.textContent = name;
      roleEl.className = `tg-badge ${isFirst ? 'tg-badge-gold' : 'tg-badge-garnet'}`;
      roleEl.textContent = isFirst
        ? lang === 'zh' ? '先手 · 1× 定调' : '1ST · SETS PACE'
        : lang === 'zh' ? '后手 · 强制 2×' : '2ND · FORCED 2×';

      vaultEl.classList.toggle('is-turn', p.seatId === state.currentTurnSeatId);
      chipsEl.classList.toggle('is-danger', p.chips <= 1);

      const prev = prevChips[p.seatId];
      if (prev != null && prev !== p.chips) {
        Motion.animateNumber(chipsEl, prev, p.chips, { duration: 320, deltaEl: vaultEl });
        if (p.chips > prev) Motion.pulseConfirm(vaultEl, { tone: 'gold' });
        else Motion.nudgeError(vaultEl, { intensity: 'subtle' });
      } else {
        chipsEl.textContent = String(p.chips);
      }
      prevChips[p.seatId] = p.chips;
    };

    patchVault(p0, name0, 0);
    patchVault(p1, name1, 1);
    refs.chipLbls.forEach((el) => { el.textContent = lang === 'zh' ? '筹码' : 'CHIPS'; });

    refs.roundBadge.textContent = state.isOvertime
      ? `OT CUP #${state.round}`
      : `CUP ${state.round} / ${state.totalRounds}`;
    refs.roundSub.textContent = lang === 'zh' ? '命中净赚 2× · 0 筹即淘汰' : 'Hit = +2× Net · 0 = Bust';

    // Patch 10-cup constellation track
    const cupCount = Math.max(10, state.round);
    refs.cupTrack.innerHTML = state.cups
      .slice(0, cupCount)
      .map((c) => {
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

    // Patch Guest Whisper card
    const curCup = state.currentCupMeta;
    refs.whisperCard.hidden = !curCup;
    if (curCup) {
      refs.hostPrefix.textContent = lang === 'zh' ? `第 ${curCup.cupNumber} 号圣杯嘉宾：` : `Cup #${curCup.cupNumber} Host: `;
      refs.hostName.textContent = curCup.hostName[lang];
      const w = state.myWhisper;
      if (!w) {
        refs.whisperText.textContent = lang === 'zh' ? '观战视角（密语已保密）' : 'Spectator view (whispers hidden)';
      } else {
        const sm = SYM_META[w.symbol];
        refs.whisperText.textContent =
          w.kind === 'claim'
            ? lang === 'zh'
              ? `密语线报：「杯中藏着 ${sm.glyph} ${sm.zh}」`
              : `Private Whisper: "Inside the chalice is ${sm.glyph} ${sm.en}."`
            : lang === 'zh'
            ? `密语线报：「杯中绝不是 ${sm.glyph} ${sm.zh}」`
            : `Private Whisper: "It is NOT ${sm.glyph} ${sm.en}."`;
      }
      refs.trustPill.className = `sms-trust-pill sms-trust-${curCup.trust}`;
      refs.trustPill.textContent = TRUST_META[curCup.trust][lang];
    }

    // Patch Left & Right Bet Pillars
    const patchPillar = (el, sid, name) => {
      const bet = isReveal ? state.lastReveal?.bets?.[sid] : state.currentBets?.[sid];
      const hit = isReveal ? state.lastReveal?.hits?.[sid] : null;
      const delta = isReveal ? state.lastReveal?.deltas?.[sid] : null;
      el.classList.toggle('is-won', hit === true);
      el.classList.toggle('is-lost', hit === false);
      if (justRevealed && hit === true) Motion.pulseConfirm(el, { tone: 'emerald' });
      if (justRevealed && hit === false) Motion.nudgeError(el, { intensity: 'subtle' });

      el.innerHTML = `
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
                  ? `<div style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:13px;font-weight:800;color:${delta > 0 ? 'var(--tg-emerald-ink)' : 'var(--tg-garnet-ink)'};">
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
      `;
    };

    patchPillar(refs.pillar0, s0, name0);
    patchPillar(refs.pillar1, s1, name1);

    // Patch Persistent Center 3D Tarot Card (real smooth 3D flip via .is-flipped toggle!)
    const revealedSym = curCup?.secretSymbol || state.lastReveal?.secretSymbol || null;
    refs.tarotCupNum.textContent = `CUP #${state.round}`;
    refs.tarotBackSub.textContent = lang === 'zh' ? '封印中 · 等待揭晓' : 'SEALED CHALICE';

    if (revealedSym) {
      refs.tarotFront.classList.remove('is-sun', 'is-moon', 'is-star');
      refs.tarotFront.classList.add(`is-${revealedSym}`);
      refs.tarotArt.innerHTML = renderTarotArtSvg(revealedSym, 92);
      refs.tarotLabel.textContent = SYM_META[revealedSym][lang];
    }
    refs.tarotCard.classList.toggle('is-flipped', !isReveal);

    // Forced 2x alert banner
    const firstBet = state.currentBets[state.firstSeatId];
    if (state.phase === 'bet_second' && firstBet) {
      refs.forcedAlert.hidden = false;
      refs.forcedAlert.textContent =
        lang === 'zh'
          ? `⚡ 先手已押注「${SYM_META[firstBet.symbol].zh}」${firstBet.amount} 枚 — 后手强制至少下注 ${curBounds.minBet} 枚（2× 规则${curBounds.minBet === secondChips ? ' · 已触发全下!' : ''}）！`
          : `⚡ First Bettor wagered ${firstBet.amount} on ${SYM_META[firstBet.symbol].en} — Second Bettor MUST wager at least ${curBounds.minBet} chips (2× Rule${curBounds.minBet === secondChips ? ' · ALL-IN!' : ''})!`;
    } else {
      refs.forcedAlert.hidden = true;
    }

    // Reveal controls vs Betting controls vs Wait pill
    refs.revealActions.hidden = state.phase !== 'reveal';
    if (state.phase === 'reveal') {
      refs.doubleBust.hidden = !state.lastReveal?.doubleBustReset;
      refs.doubleBust.textContent = lang === 'zh'
        ? '双方同时归零！各获救济 1 筹继续突然死亡！'
        : 'Double Bust! Both restored to 1 chip for Sudden Death!';
      refs.btnNextCup.hidden = Boolean(isSpectator);
      refs.btnNextCup.textContent =
        p0.chips === 0 || p1.chips === 0 || (state.round >= state.totalRounds && p0.chips !== p1.chips)
          ? lang === 'zh' ? '宣读最终裁决 →' : 'Reveal Final Verdict →'
          : lang === 'zh' ? `开启第 ${state.round + 1} 号圣杯 →` : `Next Chalice (#${state.round + 1}) →`;
    }

    refs.betControls.hidden = !(myTurn && !isReveal);
    refs.waitPill.hidden = !(!myTurn && !isReveal);
    refs.waitPill.textContent = lang === 'zh' ? '⏳ 等待对手完成星象下注...' : '⏳ Waiting for rival to lock celestial wager...';

    refs.symLabels.forEach((lbl) => {
      lbl.textContent = SYM_META[lbl.dataset.symLabel][lang];
    });

    patchBettingDraftInPlace(false);
  },
});

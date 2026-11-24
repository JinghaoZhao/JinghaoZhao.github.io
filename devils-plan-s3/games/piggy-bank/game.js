import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

// Bespoke Web Audio SFX for ceramic piggy banks, coin drops, buzzer slam, and smash verification
let audioCtx = null;
function getAudio() {
  if (SFX.isMuted() || typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playCoinDrops(count = 3) {
  const ac = getAudio();
  if (!ac) return;
  for (let i = 0; i < Math.min(5, count); i++) {
    const t = ac.currentTime + i * 0.085;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    const base = 1880 + i * 165;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.18, t + 0.055);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }
}

function playBuzzerSlam() {
  const ac = getAudio();
  if (!ac) return;
  const now = ac.currentTime;
  [185, 277.18].forEach((f) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, now);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(g).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  });
}

function playCeramicSmash() {
  const ac = getAudio();
  if (!ac) return;
  const now = ac.currentTime;
  const len = Math.floor(ac.sampleRate * 0.25);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'highpass';
  bp.frequency.setValueAtTime(1400, now);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.28, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(now);
}

// Local UI draft controls
const uiState = {
  actualBlack: 1,
  actualWhite: 1,
  bluffOn: false,
  claimedBlack: 1,
  claimedWhite: 1,
  targetSeatId: null,
  answerCount: 2,
  lastEventKey: '',
  animatingBankId: null,
  animatingCoins: [],
  animTimer: null,
};

const BANK_ACCENTS = ['#d4af6a', '#38bdf8', '#f472b6', '#34d399', '#fb923c'];

function renderPiggyBankSvg(bankId, isSmashed = false, isHot = false) {
  const accent = BANK_ACCENTS[(bankId - 1) % BANK_ACCENTS.length];
  return `
    <svg class="pb-bank-svg" viewBox="0 0 110 82" aria-label="Piggy Bank #${bankId}">
      <defs>
        <radialGradient id="pbBody${bankId}" cx="36%" cy="28%" r="72%">
          <stop offset="0%" stop-color="${isSmashed ? '#1e3a5f' : '#31394d'}" />
          <stop offset="55%" stop-color="${isSmashed ? '#0f2137' : '#181d2b'}" />
          <stop offset="100%" stop-color="#07090f" />
        </radialGradient>
      </defs>
      <!-- Tail -->
      <path d="M 16 42 C 7 38, 8 28, 15 30" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity="0.8" />
      <!-- Feet -->
      <rect x="30" y="61" width="11" height="14" rx="4" fill="#10141f" stroke="${accent}" stroke-width="1.2" />
      <rect x="65" y="61" width="11" height="14" rx="4" fill="#10141f" stroke="${accent}" stroke-width="1.2" />
      <!-- Ears -->
      <path d="M 68 20 L 76 7 L 84 23 Z" fill="#1c2233" stroke="${accent}" stroke-width="1.6" />
      <!-- Sculptural Ceramic Body -->
      <ellipse cx="53" cy="43" rx="35" ry="26" fill="url(#pbBody${bankId})" stroke="${isHot ? '#38bdf8' : accent}" stroke-width="${isHot ? 2.5 : 1.8}" />
      <!-- Snout -->
      <ellipse cx="90" cy="44" rx="9" ry="12" fill="#1c2233" stroke="${accent}" stroke-width="1.6" />
      <circle cx="88" cy="41" r="1.8" fill="${accent}" />
      <circle cx="92" cy="41" r="1.8" fill="${accent}" />
      <!-- Eye -->
      <circle cx="75" cy="34" r="2.6" fill="#f8fafc" />
      <!-- Coin Slot on Back -->
      <rect x="40" y="21" width="22" height="4.5" rx="2.2" fill="#040508" stroke="${accent}" stroke-width="1" />
      <!-- Number Emblem -->
      <circle cx="51" cy="45" r="13" fill="rgba(5,7,12,0.78)" stroke="${accent}" stroke-width="1.5" />
      <text x="51" y="50" text-anchor="middle" fill="${accent}" font-family="var(--dp-font-mono)" font-size="13.5" font-weight="800">#${bankId}</text>
      ${
        isSmashed
          ? `<path d="M 38 22 L 47 37 L 42 48 L 54 66" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-dasharray="4 2" />`
          : ''
      }
    </svg>
  `;
}

mountGame({
  config: {
    id: 'piggy-bank',
    title: { zh: '存钱罐', en: 'Piggy Bank', ko: '돼지 저금통' },
    category: 'PRISON MATCH',
    episode: 'EP 7–8 · DAY 3 PM3',
    minPlayers: 3,
    maxPlayers: 4,
    defaultPlayers: 4,
    hasHiddenInfo: true,
    optionsSchema: [
      { key: 'allowBluffClaim', label: { zh: '允许虚报黑白配比 (吹牛)', en: 'Allow Bluff Claims' }, type: 'boolean', default: true },
      {
        key: 'targetScore',
        label: { zh: '胜利目标分', en: 'Target Score' },
        type: 'select',
        default: '5',
        choices: [
          { value: '3', label: { zh: '3 分 (快局)', en: '3 pts (Quick)' } },
          { value: '5', label: { zh: '5 分 (原剧标准)', en: '5 pts (Show Standard)' } },
        ],
      },
    ],
    rulesSummary: {
      zh: `### 游戏目标
在 **5 只不透明编号存钱罐（#1–#5）** 之间持续追踪黑币与白币累计数量，率先拿到 **5 分** 获胜！

### 初始状态
- 每只存钱罐初始装有 **1 枚黑币 + 1 枚白币**。
- 每位玩家面前有**上槽**与**下槽**；先手玩家同时持有两只存钱罐。

### 回合循环
1. **投币与传递**：双罐玩家秘密挑选总共 **1–5 枚**黑/白币投入自己**下槽**存钱罐，公开宣称投入配比（可如实或虚报），随后把该罐传给任意一名对手的**上槽**（并将自己上槽移至下槽）。
2. **20 秒限时作答**：接收者必须在 **20 秒**内报出这只存钱罐内当前指定颜色的累计总数——考核颜色每轮严格按 **黑 → 白 → 黑 → 白** 交替！
3. **10 秒全员质疑**：其余任意玩家可拍下猩红 **DOUBT 抢答铃** 开罐验币：
   - **答错了**：质疑者 **+1 分**，答错者 **-1 分**！
   - **答对了（冤枉）**：质疑者 **-1 分**！
   - 被打开清点的存钱罐随即重置为 **1 黑 + 1 白**；若无人质疑则保持密封继续累加！`,
      en: `### Objective
Track the hidden Black & White coins circulating across **5 opaque numbered piggy banks (#1–#5)**. First player to **5 points** wins!

### Setup
- Every piggy bank starts with **1 Black + 1 White** coin.
- Each player has a **Top Slot** and **Bottom Slot**; the starting player holds two banks.

### Turn Loop
1. **Deposit & Pass**: The active player drops **1–5 coins** (hidden mix) into their **Bottom Bank**, announces a Black/White mix (truthful or bluff), passes it to any opponent's **Top Slot**, and shifts their own Top Bank to Bottom.
2. **20s Count Announcement**: The receiver has **20 seconds** to announce the cumulative total of the target color — alternating strictly **BLACK → WHITE → BLACK → WHITE** every turn!
3. **10s Doubt Buzzer**: Any other player can slam **DOUBT!** to X-ray / smash-open the bank:
   - **Wrong answer**: Challenger **+1**, Receiver **-1**!
   - **Correct answer (False Doubt)**: Challenger **-1**!
   - Opened banks reset to **1 Black + 1 White**; if no one doubts, the bank stays sealed and coins keep accumulating!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render: function renderGame(container, ctx) {
    const { state, mySeatId, lang, mode, lastEvent, dispatch, sfx, ui } = ctx;
    const isZh = lang === 'zh';

    // SFX & Coin Drop Animation Triggers
    const evKey = `${state.turnNumber}-${state.phase}-${state.revealSeq}-${state.announcedCount}`;
    if (evKey !== uiState.lastEventKey) {
      uiState.lastEventKey = evKey;
      if (lastEvent?.type === 'DEPOSIT_AND_PASS') {
        playCoinDrops(lastEvent.totalDropped || 2);
        uiState.animatingBankId = lastEvent.bankId;
        const ld = state.lastDrop;
        const coins = [];
        const b = ld?.claimedBlack ?? 1;
        const w = ld?.claimedWhite ?? 1;
        for (let i = 0; i < b; i++) coins.push('black');
        for (let i = 0; i < w; i++) coins.push('white');
        uiState.animatingCoins = coins.slice(0, 5);
        clearTimeout(uiState.animTimer);
        uiState.animTimer = setTimeout(() => {
          uiState.animatingBankId = null;
        }, 900);
      } else if (lastEvent?.type === 'ANNOUNCE_COUNT') {
        sfx.play('bid');
      } else if (lastEvent?.type === 'DOUBT_TRIGGERED') {
        playBuzzerSlam();
        setTimeout(() => playCeramicSmash(), 180);
      } else if (lastEvent?.type === 'ANSWER_TIMEOUT') {
        sfx.play('eliminate');
        playCeramicSmash();
      } else if (lastEvent?.type === 'DOUBT_PASSED_ALL') {
        sfx.play('click');
      }
    }

    const passer = state.players.find((p) => p.seatId === state.passerSeatId);
    const receiver = state.players.find((p) => p.seatId === state.receiverSeatId);
    const isMyDeposit = state.phase === 'deposit' && mySeatId && state.passerSeatId === mySeatId;
    const isMyAnswer = state.phase === 'answer' && mySeatId && state.receiverSeatId === mySeatId;
    const canIDoubt =
      state.phase === 'doubt' &&
      mySeatId &&
      mySeatId !== state.receiverSeatId &&
      !state.doubtPassedSeatIds.includes(mySeatId);

    // Ensure valid default target seat for deposit
    const otherPlayers = state.players.filter((p) => p.seatId !== mySeatId);
    if (!uiState.targetSeatId || !otherPlayers.some((p) => p.seatId === uiState.targetSeatId)) {
      uiState.targetSeatId = otherPlayers[0]?.seatId || null;
    }

    const colorLabel =
      state.targetColor === 'black'
        ? isZh
          ? '本轮考核：黑币 (BLACK)'
          : 'TARGET: BLACK COINS'
        : isZh
        ? '本轮考核：白币 (WHITE)'
        : 'TARGET: WHITE COINS';

    let headline = '';
    if (state.phase === 'deposit') {
      headline = isMyDeposit
        ? isZh
          ? `🪙 你的回合：向下槽存钱罐 #${passer?.bottomBankId} 投 1–5 枚币并传递`
          : `🪙 YOUR TURN: Drop 1–5 coins into Bottom Bank #${passer?.bottomBankId} & pass`
        : isZh
        ? `⏳ 等待 ${passer?.name || ''} 投币并传递存钱罐...`
        : `⏳ Waiting for ${passer?.name || ''} to drop & pass...`;
    } else if (state.phase === 'answer') {
      headline = isMyAnswer
        ? isZh
          ? `⏱ 20 秒作答！请报出 #${receiver?.topBankId} 中的累计【${state.targetColor === 'black' ? '黑币' : '白币'}】数`
          : `⏱ 20s TO ANSWER! Announce total ${state.targetColor.toUpperCase()} coins in Bank #${receiver?.topBankId}`
        : isZh
        ? `⏱ ${receiver?.name || ''} 正在 20 秒内作答 #${receiver?.topBankId}...`
        : `⏱ ${receiver?.name || ''} has 20s to answer Bank #${receiver?.topBankId}...`;
    } else if (state.phase === 'doubt') {
      headline = isZh
        ? `🚨 10 秒质疑窗口！${receiver?.name || ''} 宣称 #${receiver?.topBankId} 有 ${state.announcedCount} 枚${state.targetColor === 'black' ? '黑币' : '白币'}`
        : `🚨 10s DOUBT WINDOW! ${receiver?.name || ''} claims ${state.announcedCount} ${state.targetColor.toUpperCase()} in #${receiver?.topBankId}`;
    } else if (state.phase === 'reveal') {
      headline = isZh ? '🔎 存钱罐透视开罐核验！' : '🔎 X-RAY / SMASH-OPEN VERIFICATION!';
    } else {
      headline = isZh ? '🏆 对局已分胜负！' : '🏆 Match Concluded!';
    }

    const totalActual = uiState.actualBlack + uiState.actualWhite;
    const totalClaimed = uiState.claimedBlack + uiState.claimedWhite;

    // Build poured coins visual for reveal stage
    let revealStageHtml = '';
    if (state.phase === 'reveal' && state.revealData) {
      const rv = state.revealData;
      const poured = [];
      for (let i = 0; i < rv.actualBlack; i++) poured.push({ color: 'black', idx: i + 1 });
      for (let i = 0; i < rv.actualWhite; i++) poured.push({ color: 'white', idx: i + 1 });

      const verdictText = rv.timedOut
        ? isZh
          ? `⏱ ${rv.receiverName} 超时未答！${rv.receiverName} -1 分`
          : `⏱ ${rv.receiverName} TIMED OUT! ${rv.receiverName} -1 pt`
        : rv.wasCorrect
        ? isZh
          ? `✅ 回答完全正确！${rv.challengerName} 质疑失误 (-1 分)`
          : `✅ EXACT MATCH! ${rv.challengerName} False Doubt (-1 pt)`
        : isZh
        ? `💥 质疑命中！${rv.challengerName} +1 分 · ${rv.receiverName} -1 分`
        : `💥 CAUGHT BLUFFING/MISCOUNT! ${rv.challengerName} +1 pt · ${rv.receiverName} -1 pt`;

      revealStageHtml = `
        <div class="pb-xray-stage ${!rv.wasCorrect ? 'is-caught' : ''}">
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;">
            ${renderPiggyBankSvg(rv.bankId, true, true)}
            <div style="text-align:left;">
              <div class="dp-badge ${rv.wasCorrect ? '' : 'dp-badge-crimson'}">${isZh ? `存钱罐 #${rv.bankId} 透视清点` : `BANK #${rv.bankId} X-RAY COUNT`}</div>
              <div style="font-size:16px;font-weight:800;margin-top:6px;color:${rv.wasCorrect ? 'var(--dp-emerald)' : '#ff6b7a'};">
                ${UI.escapeHtml(verdictText)}
              </div>
              <div style="font-size:13px;color:var(--dp-ink-muted);margin-top:3px;font-family:var(--dp-font-mono);">
                ${
                  isZh
                    ? `宣称: ${rv.announcedCount ?? '超时'} · 真实${rv.targetColor === 'black' ? '黑币' : '白币'}: ${rv.actualTargetCount} (${rv.actualBlack}黑 / ${rv.actualWhite}白)`
                    : `Claimed: ${rv.announcedCount ?? 'TIMEOUT'} · Actual ${rv.targetColor.toUpperCase()}: ${rv.actualTargetCount} (${rv.actualBlack}B / ${rv.actualWhite}W)`
                }
              </div>
            </div>
          </div>
          <div class="pb-poured-coins">
            ${poured
              .map(
                (c, i) => `
                <span class="pb-poured-coin is-${c.color} ${c.color === rv.targetColor ? 'is-target' : ''}" style="animation-delay:${(i * 0.065).toFixed(2)}s;">
                  ${c.idx}
                </span>
              `
              )
              .join('')}
          </div>
          <div style="font-size:12px;color:var(--dp-cyan);margin-bottom:10px;">
            ${isZh ? `♻️ 存钱罐 #${rv.bankId} 核验后将重置为 1 黑 + 1 白` : `♻️ Bank #${rv.bankId} resets to 1 Black + 1 White`}
          </div>
          <button type="button" class="dp-btn dp-btn-primary dp-btn-sm" id="pb-continue-reveal">
            ${isZh ? '继续下一轮 →' : 'Continue Next Turn →'}
          </button>
        </div>
      `;
    }

    // Center table stage when in doubt or answer phase
    let centerCalloutHtml = '';
    if (state.phase === 'doubt') {
      const targetWord = state.targetColor === 'black' ? (isZh ? '黑币' : 'BLACK') : isZh ? '白币' : 'WHITE';
      const hotseatChallengers =
        mode === 'hotseat'
          ? state.players.filter((p) => !p.isBot && p.seatId !== state.receiverSeatId)
          : [];

      centerCalloutHtml = `
        <div class="pb-center-stage">
          <div style="font-size:12px;color:var(--dp-ink-muted);text-transform:uppercase;letter-spacing:0.08em;">
            ${UI.escapeHtml(receiver?.name || '')} ${isZh ? `对存钱罐 #${receiver?.topBankId} 宣告` : `DECLARES FOR BANK #${receiver?.topBankId}`}
          </div>
          <div class="pb-announcement-big">
            ${state.announcedCount} ${targetWord}
          </div>
          ${
            state.lastDrop
              ? `<div style="font-size:12px;color:var(--dp-ink-muted);margin-bottom:14px;">
                  ${
                    isZh
                      ? `本轮由 ${UI.escapeHtml(state.lastDrop.passerName)} 投入 ${state.lastDrop.totalDropped} 枚币（宣称 +${state.lastDrop.claimedBlack}黑 +${state.lastDrop.claimedWhite}白）`
                      : `Dropped by ${UI.escapeHtml(state.lastDrop.passerName)}: ${state.lastDrop.totalDropped} coin(s) (claimed +${state.lastDrop.claimedBlack}B +${state.lastDrop.claimedWhite}W)`
                  }
                </div>`
              : ''
          }
          ${
            mode === 'hotseat' && hotseatChallengers.length > 0
              ? `
                <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-bottom:10px;">
                  ${hotseatChallengers
                    .map(
                      (ch) => `
                      <button type="button" class="dp-btn dp-btn-crimson" data-hotseat-doubt="${UI.escapeHtml(ch.seatId)}">
                        🚨 ${UI.escapeHtml(ch.name)}: ${isZh ? '质疑!' : 'DOUBT!'}
                      </button>
                    `
                    )
                    .join('')}
                </div>
                <button type="button" class="dp-btn dp-btn-ghost dp-btn-sm" id="pb-pass-doubt">
                  ${isZh ? '无人质疑，继续 →' : 'No Doubt, Continue →'}
                </button>
              `
              : canIDoubt
              ? `
                <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
                  <button type="button" class="pb-doubt-buzzer" id="pb-slam-doubt">
                    <span>🚨 ${isZh ? '质疑 · DOUBT!' : 'DOUBT!'}</span>
                    <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;opacity:0.9;">
                      ${isZh ? '猜错 +1 分 · 冤枉 -1 分' : 'Right +1 pt · Wrong -1 pt'}
                    </span>
                  </button>
                  <button type="button" class="dp-btn dp-btn-ghost dp-btn-sm" id="pb-pass-doubt">
                    ${isZh ? '跳过质疑（认可该数字）' : 'Accept Count (No Doubt)'}
                  </button>
                </div>
              `
              : `
                <div style="font-size:13px;color:var(--dp-amber);font-weight:600;">
                  ${
                    mySeatId === state.receiverSeatId
                      ? isZh
                        ? '屏息等待对手是否拍铃质疑你的数字...'
                        : 'Hold your breath — waiting to see if anyone slams DOUBT...'
                      : isZh
                      ? '你已选择不质疑，等待其余玩家...'
                      : 'You accepted — waiting for other players...'
                  }
                </div>
              `
          }
        </div>
      `;
    } else if (state.phase === 'answer' && state.lastDrop) {
      centerCalloutHtml = `
        <div class="pb-center-stage">
          <div style="font-size:12px;color:var(--dp-cyan);font-weight:700;letter-spacing:0.06em;">
            ${
              isZh
                ? `📦 ${UI.escapeHtml(state.lastDrop.passerName)} 将 #${state.lastDrop.bankId} 传给了 ${UI.escapeHtml(state.lastDrop.receiverName)}`
                : `📦 ${UI.escapeHtml(state.lastDrop.passerName)} passed Bank #${state.lastDrop.bankId} → ${UI.escapeHtml(state.lastDrop.receiverName)}`
            }
          </div>
          <div style="font-size:16px;font-weight:700;margin-top:6px;">
            ${
              isZh
                ? `投入 ${state.lastDrop.totalDropped} 枚币 · 宣称：+${state.lastDrop.claimedBlack} 黑币 / +${state.lastDrop.claimedWhite} 白币`
                : `Dropped ${state.lastDrop.totalDropped} coin(s) · Claimed: +${state.lastDrop.claimedBlack} Black / +${state.lastDrop.claimedWhite} White`
            }
          </div>
          ${
            state.lastDrop.actualBlack !== null &&
            (state.lastDrop.actualBlack !== state.lastDrop.claimedBlack || state.lastDrop.actualWhite !== state.lastDrop.claimedWhite)
              ? `<div style="font-size:12px;color:#fbbf24;margin-top:5px;">
                  ${
                    isZh
                      ? `🕶️ 你的真实秘密投入：+${state.lastDrop.actualBlack} 黑 / +${state.lastDrop.actualWhite} 白（仅你可见）`
                      : `🕶️ Your true hidden drop: +${state.lastDrop.actualBlack}B / +${state.lastDrop.actualWhite}W (private)`
                  }
                </div>`
              : ''
          }
        </div>
      `;
    }

    container.innerHTML = `
      <div class="pb-arena">
        <!-- Top Broadcast Strip -->
        <div class="pb-banner ${state.phase === 'doubt' ? 'is-doubt' : ''}">
          <div style="font-weight:700;font-size:14.5px;">${UI.escapeHtml(headline)}</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span class="pb-color-beacon is-${state.targetColor}">
              <span class="pb-coin-dot ${state.targetColor}"></span>
              ${UI.escapeHtml(colorLabel)}
            </span>
            <span class="dp-badge">${isZh ? `目标 ${state.targetScore} 分` : `GOAL: ${state.targetScore} PTS`}</span>
          </div>
        </div>

        <!-- Spotlighted Prison Table with Sculptural Piggy Banks -->
        <section class="pb-table">
          <div class="pb-seats-grid">
            ${state.players
              .map((p) => {
                const isPasser = state.phase === 'deposit' && p.seatId === state.passerSeatId;
                const isRec = (state.phase === 'answer' || state.phase === 'doubt') && p.seatId === state.receiverSeatId;
                const isTargetable = isMyDeposit && p.seatId !== mySeatId;
                const isTargetSelected = isTargetable && uiState.targetSeatId === p.seatId;
                const topBank = p.topBankId ? state.banks[p.topBankId] : null;
                const bottomBank = p.bottomBankId ? state.banks[p.bottomBankId] : null;

                const renderSlot = (bank, label, isHotSlot) => {
                  if (!bank) {
                    return `
                      <div class="pb-slot is-empty">
                        <span class="pb-slot-label">${label}</span>
                        <span style="font-size:11px;color:var(--dp-ink-faint);">${isZh ? '空槽位' : 'EMPTY'}</span>
                      </div>
                    `;
                  }
                  const isAnim = uiState.animatingBankId === bank.id;
                  const metaText =
                    bank.black !== null
                      ? `${bank.black}● ${bank.white}○`
                      : bank.totalDrops === 0
                      ? isZh
                        ? '初始 1● 1○'
                        : 'INIT 1● 1○'
                      : isZh
                      ? `已投 ${bank.totalDrops} 次`
                      : `${bank.totalDrops} drop(s)`;

                  return `
                    <div class="pb-slot ${isHotSlot ? 'is-hot' : ''}">
                      <span class="pb-slot-label">${label}</span>
                      <div class="pb-bank-wrap ${isAnim ? 'is-dropping' : ''}">
                        ${
                          isAnim
                            ? `<div class="pb-falling-coins">
                                ${uiState.animatingCoins
                                  .map(
                                    (c, idx) =>
                                      `<span class="pb-falling-coin pb-coin-dot ${c}" style="animation-delay:${(idx * 0.08).toFixed(2)}s;"></span>`
                                  )
                                  .join('')}
                              </div>`
                            : ''
                        }
                        ${renderPiggyBankSvg(bank.id, false, isHotSlot)}
                        <span class="pb-bank-meta">${metaText}</span>
                      </div>
                    </div>
                  `;
                };

                return `
                  <div
                    class="pb-seat-zone ${isPasser ? 'is-active' : ''} ${isRec ? 'is-receiver' : ''} ${isTargetable ? 'is-targetable' : ''} ${isTargetSelected ? 'is-target-selected' : ''}"
                    ${isTargetable ? `data-pick-target="${UI.escapeHtml(p.seatId)}"` : ''}
                  >
                    <div class="pb-seat-head">
                      <span class="pb-seat-name">
                        <span style="color:var(--dp-brass);">${UI.escapeHtml(p.avatar)}</span>
                        <span>${UI.escapeHtml(p.name)}${p.seatId === mySeatId ? (isZh ? ' (你)' : ' (You)') : ''}</span>
                      </span>
                      <span class="pb-score-badge ${p.score < 0 ? 'is-neg' : ''}">
                        ${p.score >= 0 ? '+' : ''}${p.score} / ${state.targetScore}
                      </span>
                    </div>
                    <div class="pb-slots-pair">
                      ${renderSlot(topBank, isZh ? '上槽 TOP' : 'TOP SLOT', isRec)}
                      ${renderSlot(bottomBank, isZh ? '下槽 BTM' : 'BTM SLOT', isPasser)}
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>

          ${revealStageHtml || centerCalloutHtml}
        </section>

        <!-- Right Control Column -->
        <aside class="pb-controls-col">
          <div class="pb-card">
            <div class="pb-card-title">
              <span>${isZh ? '操作控制台' : 'ACTION CONSOLE'}</span>
              <span style="font-family:var(--dp-font-mono);color:var(--dp-ink-muted);">#${state.turnNumber}</span>
            </div>

            ${
              isMyDeposit
                ? `
                  <div style="font-size:12.5px;color:var(--dp-ink-muted);margin-bottom:10px;">
                    ${isZh ? `向下槽存钱罐 <strong style="color:var(--dp-brass-bright);">#${passer.bottomBankId}</strong> 投入总计 1–5 枚硬币：` : `Drop 1–5 coins into your Bottom Bank <strong style="color:var(--dp-brass-bright);">#${passer.bottomBankId}</strong>:`}
                  </div>

                  <div class="pb-stepper-row">
                    <span style="display:flex;align-items:center;gap:8px;font-weight:600;">
                      <span class="pb-coin-dot black"></span>
                      ${isZh ? '实际投入黑币' : 'Actual Black'}
                    </span>
                    <div class="pb-stepper-controls">
                      <button type="button" class="dp-btn dp-btn-icon dp-btn-sm" data-step="ab:-1" ${uiState.actualBlack <= 0 ? 'disabled' : ''}>−</button>
                      <span class="pb-stepper-val">${uiState.actualBlack}</span>
                      <button type="button" class="dp-btn dp-btn-icon dp-btn-sm" data-step="ab:1" ${totalActual >= 5 ? 'disabled' : ''}>+</button>
                    </div>
                  </div>

                  <div class="pb-stepper-row">
                    <span style="display:flex;align-items:center;gap:8px;font-weight:600;">
                      <span class="pb-coin-dot white"></span>
                      ${isZh ? '实际投入白币' : 'Actual White'}
                    </span>
                    <div class="pb-stepper-controls">
                      <button type="button" class="dp-btn dp-btn-icon dp-btn-sm" data-step="aw:-1" ${uiState.actualWhite <= 0 ? 'disabled' : ''}>−</button>
                      <span class="pb-stepper-val">${uiState.actualWhite}</span>
                      <button type="button" class="dp-btn dp-btn-icon dp-btn-sm" data-step="aw:1" ${totalActual >= 5 ? 'disabled' : ''}>+</button>
                    </div>
                  </div>

                  <div style="font-size:12px;color:${totalActual >= 1 ? 'var(--dp-brass)' : '#fca5a5'};margin-bottom:10px;font-family:var(--dp-font-mono);">
                    ${isZh ? `合计投入：${totalActual} / 5 枚（必须 1–5 枚）` : `Total Dropped: ${totalActual} / 5 (must be 1–5)`}
                  </div>

                  ${
                    state.allowBluffClaim
                      ? `
                        <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:8px;cursor:pointer;color:var(--dp-amber);">
                          <input type="checkbox" id="pb-bluff-toggle" ${uiState.bluffOn ? 'checked' : ''} />
                          <span>🎭 ${isZh ? '虚报公开配比（心理吹牛陷阱）' : 'Bluff Public Declaration (Mind Game)'}</span>
                        </label>
                        ${
                          uiState.bluffOn
                            ? `
                              <div class="pb-stepper-row" style="border-color:rgba(245,158,11,0.45);">
                                <span style="font-size:12.5px;">${isZh ? '公开宣称黑币' : 'Claim Black'}</span>
                                <div class="pb-stepper-controls">
                                  <button type="button" class="dp-btn dp-btn-icon dp-btn-sm" data-step="cb:-1" ${uiState.claimedBlack <= 0 ? 'disabled' : ''}>−</button>
                                  <span class="pb-stepper-val">${uiState.claimedBlack}</span>
                                  <button type="button" class="dp-btn dp-btn-icon dp-btn-sm" data-step="cb:1" ${totalClaimed >= 5 ? 'disabled' : ''}>+</button>
                                </div>
                              </div>
                              <div class="pb-stepper-row" style="border-color:rgba(245,158,11,0.45);">
                                <span style="font-size:12.5px;">${isZh ? '公开宣称白币' : 'Claim White'}</span>
                                <div class="pb-stepper-controls">
                                  <button type="button" class="dp-btn dp-btn-icon dp-btn-sm" data-step="cw:-1" ${uiState.claimedWhite <= 0 ? 'disabled' : ''}>−</button>
                                  <span class="pb-stepper-val">${uiState.claimedWhite}</span>
                                  <button type="button" class="dp-btn dp-btn-icon dp-btn-sm" data-step="cw:1" ${totalClaimed >= 5 ? 'disabled' : ''}>+</button>
                                </div>
                              </div>
                            `
                            : ''
                        }
                      `
                      : ''
                  }

                  <div style="font-size:12px;color:var(--dp-ink-muted);margin-top:8px;">
                    ${isZh ? '选择传递目标（也可直接点击左侧玩家桌位）：' : 'Pass Bank to Player (or click their seat):'}
                  </div>
                  <div class="pb-target-chips">
                    ${otherPlayers
                      .map(
                        (op) => `
                        <button type="button" class="pb-target-chip ${uiState.targetSeatId === op.seatId ? 'is-selected' : ''}" data-pick-target="${UI.escapeHtml(op.seatId)}">
                          ${UI.escapeHtml(op.name)}
                        </button>
                      `
                      )
                      .join('')}
                  </div>

                  <button type="button" class="dp-btn dp-btn-primary" id="pb-submit-pass" style="width:100%;" ${totalActual < 1 || totalActual > 5 || (uiState.bluffOn && (totalClaimed < 1 || totalClaimed > 5)) ? 'disabled' : ''}>
                    ${isZh ? `投币并将 #${passer.bottomBankId} 传出 →` : `Drop & Pass Bank #${passer.bottomBankId} →`}
                  </button>
                `
                : isMyAnswer
                ? `
                  <div style="font-size:13px;color:var(--dp-cyan);font-weight:700;margin-bottom:8px;">
                    ${
                      isZh
                        ? `请报出存钱罐 #${receiver.topBankId} 内累计【${state.targetColor === 'black' ? '黑币' : '白币'}】总数：`
                        : `Announce total ${state.targetColor.toUpperCase()} coins inside Bank #${receiver.topBankId}:`
                    }
                  </div>
                  <div class="pb-stepper-row">
                    <span style="display:flex;align-items:center;gap:8px;font-weight:700;">
                      <span class="pb-coin-dot ${state.targetColor}"></span>
                      ${isZh ? '宣告数量' : 'Your Count'}
                    </span>
                    <div class="pb-stepper-controls">
                      <button type="button" class="dp-btn dp-btn-icon" data-ans-delta="-1" ${uiState.answerCount <= 0 ? 'disabled' : ''}>−</button>
                      <span class="pb-stepper-val" style="font-size:24px;min-width:34px;">${uiState.answerCount}</span>
                      <button type="button" class="dp-btn dp-btn-icon" data-ans-delta="1">+</button>
                    </div>
                  </div>
                  <div class="pb-numpad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                      .map(
                        (n) => `
                        <button type="button" class="pb-num-btn ${uiState.answerCount === n ? 'is-selected' : ''}" data-ans-set="${n}">${n}</button>
                      `
                      )
                      .join('')}
                  </div>
                  <button type="button" class="dp-btn dp-btn-primary" id="pb-submit-answer" style="width:100%;min-height:44px;">
                    ${
                      isZh
                        ? `大声宣告：${uiState.answerCount} 枚${state.targetColor === 'black' ? '黑币' : '白币'}！`
                        : `ANNOUNCE: ${uiState.answerCount} ${state.targetColor.toUpperCase()}!`
                    }
                  </button>
                `
                : `
                  <div style="font-size:13px;color:var(--dp-ink-muted);line-height:1.6;">
                    ${
                      state.phase === 'doubt'
                        ? isZh
                          ? '质疑窗口已开启！如果怀疑对方报数有误，立即拍下左侧猩红 DOUBT 按钮！'
                          : 'Doubt window live! Slam the crimson DOUBT buzzer on the table if you suspect a miscount!'
                        : state.phase === 'reveal'
                        ? isZh
                          ? '正在透视核验存钱罐真实硬币数...'
                          : 'Verifying true coin count inside the opened bank...'
                        : isZh
                        ? '紧盯每只存钱罐的传递与投币记录，记住它们的黑/白币数量！'
                        : 'Track every pass and drop carefully — remember the Black & White count of each bank!'
                    }
                  </div>
                `
            }
          </div>

          <div class="pb-card">
            <div class="pb-card-title">
              <span>${isZh ? '投币与质疑记录' : 'MEMORY & DOUBT FEED'}</span>
            </div>
            <div class="pb-log-list">
              ${state.history
                .slice()
                .reverse()
                .map(
                  (h) => `
                  <div class="pb-log-row ${h.tone === 'alert' ? 'is-alert' : h.tone === 'good' ? 'is-good' : ''}">
                    ${UI.escapeHtml(isZh ? h.zh : h.en)}
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        </aside>
      </div>
    `;

    // Bind Deposit steppers
    container.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        const [field, deltaStr] = btn.dataset.step.split(':');
        const delta = Number(deltaStr);
        if (field === 'ab') uiState.actualBlack = Math.max(0, Math.min(5 - uiState.actualWhite, uiState.actualBlack + delta));
        if (field === 'aw') uiState.actualWhite = Math.max(0, Math.min(5 - uiState.actualBlack, uiState.actualWhite + delta));
        if (field === 'cb') uiState.claimedBlack = Math.max(0, Math.min(5 - uiState.claimedWhite, uiState.claimedBlack + delta));
        if (field === 'cw') uiState.claimedWhite = Math.max(0, Math.min(5 - uiState.claimedBlack, uiState.claimedWhite + delta));
        if (!uiState.bluffOn) {
          uiState.claimedBlack = uiState.actualBlack;
          uiState.claimedWhite = uiState.actualWhite;
        }
        renderGame(container, ctx);
      });
    });

    container.querySelector('#pb-bluff-toggle')?.addEventListener('change', (e) => {
      sfx.play('click');
      uiState.bluffOn = e.target.checked;
      if (!uiState.bluffOn) {
        uiState.claimedBlack = uiState.actualBlack;
        uiState.claimedWhite = uiState.actualWhite;
      }
      renderGame(container, ctx);
    });

    container.querySelectorAll('[data-pick-target]').forEach((el) => {
      el.addEventListener('click', () => {
        sfx.play('click');
        uiState.targetSeatId = el.dataset.pickTarget;
        renderGame(container, ctx);
      });
    });

    container.querySelector('#pb-submit-pass')?.addEventListener('click', async () => {
      const payload = {
        actualBlack: uiState.actualBlack,
        actualWhite: uiState.actualWhite,
        claimedBlack: uiState.bluffOn ? uiState.claimedBlack : uiState.actualBlack,
        claimedWhite: uiState.bluffOn ? uiState.claimedWhite : uiState.actualWhite,
        targetSeatId: uiState.targetSeatId,
      };
      const res = await dispatch({ type: 'DEPOSIT_AND_PASS', payload });
      if (!res.ok) ui.toast(res.reason, 'error');
      else {
        uiState.bluffOn = false;
      }
    });

    // Bind Answer controls
    container.querySelectorAll('[data-ans-delta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        uiState.answerCount = Math.max(0, Math.min(60, uiState.answerCount + Number(btn.dataset.ansDelta)));
        renderGame(container, ctx);
      });
    });

    container.querySelectorAll('[data-ans-set]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        uiState.answerCount = Number(btn.dataset.ansSet);
        renderGame(container, ctx);
      });
    });

    container.querySelector('#pb-submit-answer')?.addEventListener('click', async () => {
      const res = await dispatch({ type: 'ANNOUNCE_COUNT', payload: { count: uiState.answerCount } });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    // Bind Doubt Buzzer & Pass
    container.querySelector('#pb-slam-doubt')?.addEventListener('click', async () => {
      const res = await dispatch({ type: 'DOUBT' });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    container.querySelectorAll('[data-hotseat-doubt]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const res = await dispatch({
          type: 'DOUBT',
          payload: { challengerSeatId: btn.dataset.hotseatDoubt },
        });
        if (!res.ok) ui.toast(res.reason, 'error');
      });
    });

    container.querySelector('#pb-pass-doubt')?.addEventListener('click', async () => {
      const res = await dispatch({ type: 'PASS_DOUBT' });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    // Continue after reveal
    container.querySelector('#pb-continue-reveal')?.addEventListener('click', () => {
      dispatch({ type: 'CONTINUE_REVEAL' });
    });
  },
});

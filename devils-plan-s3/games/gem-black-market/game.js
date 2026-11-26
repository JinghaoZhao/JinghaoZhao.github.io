/**
 * Gem Black Market (宝石黑市 / 보석 암시장) — Interactive Underground Vault UI
 * Day 3 Main Match · The Devil's Plan Season 3: Dead Again
 * Wave 2: Motion.patchDOM + Motion.delegate + Real 380ms 3D Card Flips + animateNumber + Dual-Theme
 */

import { mountGame, SFX, I18n, UI, Motion, Theme } from '../../shared/sdk.js';
import { GameRules, GEM_META, BOMB_BAIT_BONUS } from './rules.js';

const RULES_SUMMARY = {
  zh: `### 游戏目标
在 **3 回合** 黑市交易中，通过强制换牌、心理诱骗与暗中配合，使你的最终决胜分成为全场第 1 名！

### 终极核心扭转：秘密伙伴（Manito）闭环乘法
- 开局抽签形成一条覆盖全员的**单向闭环链**（\`A → B → C → ... → A\`）。
- 你**只知道自己的秘密伙伴（Manito）是谁**，不知道谁把你当作 Manito！
- 3 回合累计个人总分 \`S\` 后，最终排名的决定公式为：
  **\`最终得分 = 你的个人总分 × 你 Manito 的个人总分\`**
- **负负得正极限翻盘**：如果你与你的 Manito **双双拿到负分**（例如 \`-10 × -12 = +120\`），将直接逆天夺冠！反之若一人正分一人负分，分数瞬间崩盘！

### 13 张牌组（9人标准局，人数减少自动微调铜/银牌）
- **💎 钻石 (Diamond)**：\`5, 6\`（得分时额外奖励 **+1 恶魔碎片**！）
- **🥇 黄金 (Gold)**：\`4, 5\`
- **🥈 白银 (Silver)**：\`2, 3, 4\`
- **🥉 青铜 (Bronze)**：\`1, 1, 2, 2\`
- **💣 炸弹 (Bomb)**：\`-6\`, \`-4\`

### 每回合流程
1. **发牌与初看**：每人暗发 1 张，桌面放入 **3 张买家槽 + 1 张垃圾桶**。仅开局及**轮到你行动时**可查看自己当前手牌（被别人换走后在轮到你前未知！）。
2. **两轮强制换牌**：先**正序**（从先手顺时针）每人换 1 次，再**逆序**每人换 1 次。必须将手牌与另一名玩家、任一买家槽或垃圾桶 1 对 1 暗换。
3. **💣 炸弹铁律**：手里拿着炸弹时，**严禁**与买家槽或垃圾桶交换——**必须**换给另一名玩家！
4. **💣 甩锅诱杀奖励**：若在别人的回合里，对方主动来偷走你手里的炸弹，你立即在回合结算时获得 **+3 个人分**！
5. **◆ 碎片密查（全场限 1 次）**：轮到自己时可花 **1 碎片** 私密偷看任意 1 个买家槽或垃圾桶。
6. **回合结算**：手牌为宝石时，得分 = **牌面数字 × 买家槽中同种宝石张数**；手牌为炸弹时扣 **-6 / -4**。持 \`-6\`（次之 \`-4\`）者成下轮先手。`,
  en: `### Objective
Outwit rival traders across **3 underground rounds** of forced blind swaps, bomb traps, and secret alliances to claim #1 after the **Secret Manito Multiplication**!

### The Ultimate Twist: Secret Circular Manito Multiplication
- At match start, all players are secretly linked in a single **closed circular chain** (\`A → B → C → ... → A\`).
- You ONLY know **who YOUR Manito is** — never who has you!
- After 3 rounds of personal scoring (\`S\`), everyone's Final Score is:
  **\`Final Score = Your Personal Score × Your Manito's Personal Score\`**
- **NEGATIVE × NEGATIVE REVERSAL**: If BOTH you and your Manito deliberately sink into negative scores (e.g. \`-10 × -12 = +120\`), you skyrocket to victory! But positive × negative means total collapse!

### The 13-Card Deck (9p Standard; Scaled for 4–8p)
- **💎 Diamond**: \`5, 6\` (scoring > 0 grants **+1 Devil's Piece**!)
- **🥇 Gold**: \`4, 5\`
- **🥈 Silver**: \`2, 3, 4\`
- **🥉 Bronze**: \`1, 1, 2, 2\`
- **💣 Bombs**: \`-6\`, \`-4\`

### Round Flow
1. **Deal & Peek**: 1 hidden card per player + **3 Buyer Slots** + **1 Trash Slot**. If someone swaps with you, your new card stays UNKNOWN until your own turn!
2. **2 Forced Swap Passes**: Pass 1 goes **Forward** clockwise from First Player; Pass 2 goes **Reverse**! You MUST swap 1-for-1 with another player, a Buyer, or Trash.
3. **💣 Mandatory Bomb Rule**: Holding a Bomb forbids swapping with Buyers or Trash — you **MUST** swap it with another player!
4. **💣 Bomb Bait Bonus (+3 pts)**: If another player chooses YOU on their turn and steals a Bomb from your hand, you secretly earn **+3 personal points** revealed at showdown!
5. **◆ Piece Peek (Once per match)**: On your turn, spend **1 Piece** to privately inspect any Buyer or Trash card.
6. **Round Showdown**: Gem score = **Card Value × Matching Gem Count in the 3 Buyer Slots**. Bombs deduct \`-6\` or \`-4\`. Holder of \`-6\` (else \`-4\`) becomes next round's First Player.`,
};

const uiState = {
  peekMode: false,
  manitoRevealed: true,
  lastSwapSeqSeen: 0,
  lastPhaseSeen: '',
  lastRoundSeen: 0,
  finaleAnimated: false,
  prevScores: {},
  prevMyScore: null,
  lastContainer: null,
  lastCtx: null,
  delegatedRoot: null,
};

const LIGHT_GEM_INK = {
  diamond: '#0369a1',
  gold: '#925b00',
  silver: '#475569',
  bronze: '#9a3412',
  bomb: '#b91c2c',
};

function fmtSigned(v) {
  const n = Math.round(v);
  return `${n >= 0 ? '+' : ''}${n}`;
}

/**
 * Render faceted SVG gemstone or pulsing Obsidian Bomb artwork.
 */
function renderGemArtwork(type) {
  if (type === 'diamond') {
    return `
      <svg class="gbm-gem-svg" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="gbmDiaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f0f9ff"/>
            <stop offset="45%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        <polygon points="18,10 46,10 58,24 32,56 6,24" fill="url(#gbmDiaGrad)" stroke="#e0f2fe" stroke-width="1.6"/>
        <polygon points="18,10 32,24 6,24" fill="rgba(255,255,255,0.45)"/>
        <polygon points="46,10 58,24 32,24" fill="rgba(186,230,253,0.32)"/>
        <polygon points="18,10 46,10 32,24" fill="rgba(255,255,255,0.68)"/>
        <polygon points="6,24 32,24 32,56" fill="rgba(2,132,199,0.45)"/>
        <polygon points="58,24 32,24 32,56" fill="rgba(14,165,233,0.22)"/>
        <line x1="18" y1="10" x2="32" y2="56" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
        <line x1="46" y1="10" x2="32" y2="56" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
      </svg>
    `;
  }
  if (type === 'gold') {
    return `
      <svg class="gbm-gem-svg" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="gbmGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef3c7"/>
            <stop offset="45%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#92400e"/>
          </linearGradient>
        </defs>
        <polygon points="20,8 44,8 56,20 56,44 44,56 20,56 8,44 8,20" fill="url(#gbmGoldGrad)" stroke="#fde68a" stroke-width="1.6"/>
        <polygon points="23,16 41,16 48,23 48,41 41,48 23,48 16,41 16,23" fill="rgba(254,243,199,0.28)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
        <polygon points="20,8 44,8 41,16 23,16" fill="rgba(255,255,255,0.55)"/>
        <polygon points="8,20 20,8 23,16 16,23" fill="rgba(255,255,255,0.35)"/>
      </svg>
    `;
  }
  if (type === 'silver') {
    return `
      <svg class="gbm-gem-svg" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="gbmSilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="48%" stop-color="#94a3b8"/>
            <stop offset="100%" stop-color="#334155"/>
          </linearGradient>
        </defs>
        <polygon points="32,6 54,22 46,56 18,56 10,22" fill="url(#gbmSilGrad)" stroke="#f1f5f9" stroke-width="1.5"/>
        <polygon points="32,6 44,24 20,24" fill="rgba(255,255,255,0.65)"/>
        <polygon points="20,24 44,24 38,46 26,46" fill="rgba(226,232,240,0.35)" stroke="rgba(255,255,255,0.4)" stroke-width="0.9"/>
        <polygon points="10,22 20,24 18,56" fill="rgba(15,23,42,0.35)"/>
      </svg>
    `;
  }
  if (type === 'bronze') {
    return `
      <svg class="gbm-gem-svg" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="gbmBrzGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fed7aa"/>
            <stop offset="48%" stop-color="#ea580c"/>
            <stop offset="100%" stop-color="#7c2d12"/>
          </linearGradient>
        </defs>
        <polygon points="32,7 55,32 32,57 9,32" fill="url(#gbmBrzGrad)" stroke="#fdba74" stroke-width="1.6"/>
        <polygon points="32,16 46,32 32,48 18,32" fill="rgba(255,237,213,0.28)" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
        <polygon points="32,7 55,32 46,32 32,16" fill="rgba(255,255,255,0.35)"/>
      </svg>
    `;
  }
  return `
    <svg class="gbm-gem-svg" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="gbmBombGrad" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="55%" stop-color="#18181b"/>
          <stop offset="100%" stop-color="#050507"/>
        </radialGradient>
      </defs>
      <path d="M36,19 Q42,10 50,11" fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round"/>
      <g class="gbm-fuse-spark">
        <circle cx="51" cy="11" r="6" fill="rgba(239,68,68,0.45)"/>
        <polygon points="51,4 53,9 58,11 53,13 51,18 49,13 44,11 49,9" fill="#ff4d5a"/>
        <circle cx="51" cy="11" r="2.2" fill="#fef08a"/>
      </g>
      <rect x="27" y="16" width="10" height="6" rx="2" fill="#52525b" stroke="#a1a1aa" stroke-width="1"/>
      <circle cx="32" cy="38" r="19" fill="url(#gbmBombGrad)" stroke="#ef4444" stroke-width="2"/>
      <ellipse cx="25" cy="31" rx="5" ry="3.2" transform="rotate(-30 25 31)" fill="rgba(255,255,255,0.24)"/>
      <path d="M25,38 L39,38 M32,31 L32,45" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>
    </svg>
  `;
}

/**
 * Render a keyed 3D flippable Gem/Bomb card.
 * Keeping data-motion-key on both .gbm-card and .gbm-card-inner enables live 380ms 3D flips!
 */
function renderCardHtml(
  card,
  { motionKey, faceUp = false, size = 'normal', lang = 'zh', privateBadge = false, dirty = false } = {}
) {
  const sizeCls = size === 'large' ? 'is-large' : size === 'compact' ? 'is-compact' : '';
  const meta = card ? GEM_META[card.type] : null;
  const frontCls = meta ? `is-${meta.id}` : '';
  const valStr = card ? (card.value > 0 ? `+${card.value}` : String(card.value)) : '?';
  const typeLabel = meta ? (lang === 'en' ? meta.name.en : meta.name.zh) : '';
  const keyAttr = motionKey ? `data-motion-key="${UI.escapeHtml(motionKey)}"` : '';
  const innerKeyAttr = motionKey ? `data-motion-key="inner-${UI.escapeHtml(motionKey)}"` : '';

  return `
    <div class="gbm-card ${sizeCls} ${faceUp && card ? '' : 'is-face-down'}" ${keyAttr}>
      ${privateBadge ? `<span class="gbm-private-tag">${lang === 'zh' ? '密查' : 'PEEK'}</span>` : ''}
      <div class="gbm-card-inner" ${innerKeyAttr}>
        <div class="gbm-card-face gbm-card-front ${frontCls}">
          ${
            card
              ? `
                <div class="gbm-card-val dp-tabular" style="color:${meta.accent};">${valStr}</div>
                ${renderGemArtwork(card.type)}
                <div class="gbm-card-type" style="color:${meta.accent};">
                  ${UI.escapeHtml(typeLabel)}${card.type === 'diamond' ? ' ◆' : ''}
                </div>
              `
              : ''
          }
        </div>
        <div class="gbm-card-face gbm-card-back">
          <div class="gbm-card-back-emblem">${dirty ? '⇄' : '◆'}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Compute circular seat coordinates (% of table container, 0..100).
 */
function computeSeatPositions(players, mySeatId) {
  const n = players.length;
  const myIdx = Math.max(0, players.findIndex((p) => p.seatId === mySeatId));
  const map = {};
  const rx = 39.0;
  const ry = 35.5;
  for (let i = 0; i < n; i++) {
    const rel = (i - myIdx + n) % n;
    const angle = Math.PI / 2 + (rel / n) * Math.PI * 2;
    const x = 50 + rx * Math.cos(angle);
    const y = 50 + ry * Math.sin(angle);
    map[players[i].seatId] = { x, y };
  }
  return map;
}

function slotCoordsPct(kind, index) {
  if (kind === 'trash') return { x: 61, y: 50 };
  if (kind === 'buyer') {
    const xs = [39, 46.5, 54];
    return { x: xs[index] ?? 46.5, y: 50 };
  }
  return { x: 50, y: 50 };
}

function curvedArcPath(p1, p2, bend = 0.16) {
  const x1 = p1.x * 10;
  const y1 = p1.y * 6.6;
  const x2 = p2.x * 10;
  const y2 = p2.y * 6.6;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function bindDelegatedEvents(container) {
  if (uiState.delegatedRoot === container) return;
  uiState.delegatedRoot = container;

  const getCtx = () => uiState.lastCtx;
  const rerender = () => {
    if (uiState.lastContainer && uiState.lastCtx) {
      renderVault(uiState.lastContainer, uiState.lastCtx);
    }
  };

  // Toggle Secret Manito dossier privacy shield
  Motion.delegate(
    container,
    'click',
    '#gbm-toggle-manito',
    () => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('click');
      uiState.manitoRevealed = !uiState.manitoRevealed;
      rerender();
    },
    'gbm-toggle-manito'
  );

  // Confirm initial deal peek
  Motion.delegate(
    container,
    'click',
    '#gbm-confirm-peek',
    async (_e, btn) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('click');
      const res = await ctx.dispatch({ type: 'CONFIRM_PEEK', payload: {} });
      if (!res.ok) {
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'gbm-confirm-peek'
  );

  // Toggle Piece Peek mode
  Motion.delegate(
    container,
    'click',
    '#gbm-toggle-peek',
    () => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('click');
      uiState.peekMode = !uiState.peekMode;
      rerender();
    },
    'gbm-toggle-peek'
  );

  // Tactile rejection feedback when clicking a Bomb-forbidden Buyer/Trash slot
  Motion.delegate(
    container,
    'click',
    '.gbm-slot.is-forbidden',
    (_e, el) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('error');
      Motion.shake(el);
      ctx.ui.toast(
        ctx.lang === 'zh'
          ? '💣 炸弹铁律：不能放入买家或垃圾桶，必须换给另一名玩家！'
          : '💣 BOMB RULE: Must swap a Bomb with another player, never Buyer or Trash!',
        'error'
      );
    },
    'gbm-forbidden-slot'
  );

  // Swap with another player
  Motion.delegate(
    container,
    'click',
    '[data-swap-player]',
    async (_e, el) => {
      const ctx = getCtx();
      if (!ctx) return;
      const targetId = el.dataset.swapPlayer;
      ctx.sfx.play('cardFlip');
      const res = await ctx.dispatch({ type: 'SWAP', payload: { kind: 'player', seatId: targetId } });
      if (!res.ok) {
        Motion.shake(el);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'gbm-swap-player'
  );

  // Swap with Buyer slot
  Motion.delegate(
    container,
    'click',
    '[data-swap-buyer]',
    async (_e, el) => {
      const ctx = getCtx();
      if (!ctx) return;
      const index = Number(el.dataset.swapBuyer);
      ctx.sfx.play('cardFlip');
      const res = await ctx.dispatch({ type: 'SWAP', payload: { kind: 'buyer', index } });
      if (!res.ok) {
        Motion.shake(el);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'gbm-swap-buyer'
  );

  // Swap with Trash slot
  Motion.delegate(
    container,
    'click',
    '[data-swap-trash]',
    async (_e, el) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('cardFlip');
      const res = await ctx.dispatch({ type: 'SWAP', payload: { kind: 'trash' } });
      if (!res.ok) {
        Motion.shake(el);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'gbm-swap-trash'
  );

  // Piece Peek Buyer slot
  Motion.delegate(
    container,
    'click',
    '[data-peek-buyer]',
    async (_e, el) => {
      const ctx = getCtx();
      if (!ctx) return;
      const index = Number(el.dataset.peekBuyer);
      const res = await ctx.dispatch({ type: 'PEEK_SLOT', payload: { kind: 'buyer', index } });
      if (res.ok) {
        uiState.peekMode = false;
        ctx.sfx.play('pieceGain');
        ctx.ui.toast(
          ctx.lang === 'zh'
            ? `◆1 密查成功！仅你可见【买家 ${index + 1}】底牌！`
            : `◆1 Intel Peek! Buyer ${index + 1} privately revealed to you!`,
          'success'
        );
      } else {
        Motion.shake(el);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'gbm-peek-buyer'
  );

  // Piece Peek Trash slot
  Motion.delegate(
    container,
    'click',
    '[data-peek-trash]',
    async (_e, el) => {
      const ctx = getCtx();
      if (!ctx) return;
      const res = await ctx.dispatch({ type: 'PEEK_SLOT', payload: { kind: 'trash' } });
      if (res.ok) {
        uiState.peekMode = false;
        ctx.sfx.play('pieceGain');
        ctx.ui.toast(
          ctx.lang === 'zh'
            ? '◆1 密查成功！仅你可见【垃圾桶】底牌！'
            : '◆1 Intel Peek! Trash card privately revealed to you!',
          'success'
        );
      } else {
        Motion.shake(el);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'gbm-peek-trash'
  );

  // Advance after Round Showdown
  Motion.delegate(
    container,
    'click',
    '#gbm-advance-round',
    async (_e, btn) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('bid');
      const res = await ctx.dispatch({ type: 'ADVANCE_ROUND', payload: {} });
      if (!res.ok) {
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'gbm-advance-round'
  );

  // Conclude Match from Finale
  Motion.delegate(
    container,
    'click',
    '#gbm-conclude-btn',
    async (_e, btn) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('victory');
      const res = await ctx.dispatch({ type: 'CONCLUDE_MATCH', payload: {} });
      if (!res.ok) {
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'gbm-conclude'
  );
}

function renderVault(container, ctx) {
  const { state, mySeatId, lang, sfx, log } = ctx;
  uiState.lastContainer = container;
  uiState.lastCtx = ctx;
  bindDelegatedEvents(container);

  // Reset UI trackers on fresh rematch
  if (state.round === 1 && state.phase === 'deal_peek' && uiState.lastRoundSeen > 1) {
    uiState.lastSwapSeqSeen = 0;
    uiState.lastPhaseSeen = '';
    uiState.peekMode = false;
    uiState.finaleAnimated = false;
    uiState.prevScores = {};
    uiState.prevMyScore = null;
  }
  uiState.lastRoundSeen = state.round;

  // Contextual SFX on swap & phase transitions
  if (state.lastSwap && state.lastSwap.seq > uiState.lastSwapSeqSeen) {
    uiState.lastSwapSeqSeen = state.lastSwap.seq;
    sfx.play('cardFlip');
  }
  const phaseSig = `${state.round}:${state.phase}`;
  if (phaseSig !== uiState.lastPhaseSeen) {
    uiState.lastPhaseSeen = phaseSig;
    uiState.peekMode = false;
    if (state.phase === 'round_reveal') {
      sfx.play('reveal');
      log(
        lang === 'zh'
          ? `💎 第 ${state.round} 回合亮牌结算！`
          : `💎 Round ${state.round} showdown revealed!`,
        'system'
      );
    } else if (state.phase === 'finale') {
      sfx.play('victory');
      log(
        lang === 'zh'
          ? '⚡ 秘密伙伴 (Manito) 闭环全面揭晓！正在执行乘法终局结算！'
          : '⚡ Secret Manito circular chain revealed — executing multiplier finale!',
        'alert'
      );
    }
  }

  const me = state.players.find((p) => p.seatId === mySeatId) || null;
  const myManito = state.players.find((p) => p.seatId === state.myManitoSeatId) || null;
  const isSwapPhase = state.phase === 'swap_forward' || state.phase === 'swap_reverse';
  const isMyTurn = Boolean(mySeatId && isSwapPhase && state.currentTurnSeatId === mySeatId);
  const mustSwapPlayer = Boolean(isMyTurn && state.mustSwapWithPlayer);
  const canPiecePeek = Boolean(isMyTurn && me && !me.usedPiecePeek && me.pieces >= 1);
  const isFinale = state.phase === 'finale' || state.phase === 'ended';
  const isLight = Theme.get() === 'light';

  if (!isMyTurn) uiState.peekMode = false;

  const nameOf = (sid) => state.players.find((p) => p.seatId === sid)?.name || sid;
  const seatPos = computeSeatPositions(state.players, mySeatId);

  // Phase headline & instruction
  let phaseTitle = '';
  let phaseSub = '';
  if (state.phase === 'deal_peek') {
    phaseTitle = lang === 'zh' ? `第 ${state.round}/${state.totalRounds} 回合 · 初看暗牌` : `Round ${state.round}/${state.totalRounds} · Initial Deal`;
    phaseSub = lang === 'zh'
      ? '请秘密查看你的初始手牌与右侧 Manito 机密档案，确认后进入强制换牌。'
      : 'Inspect your dealt card & Secret Manito dossier, then confirm ready to begin swaps.';
  } else if (isSwapPhase) {
    const passLabel = state.passIndex === 0
      ? lang === 'zh' ? '第一轮 · 正序换牌 ↻' : 'Pass 1 · Forward Swap ↻'
      : lang === 'zh' ? '第二轮 · 逆序换牌 ↺' : 'Pass 2 · Reverse Swap ↺';
    phaseTitle = `R${state.round}/${state.totalRounds} · ${passLabel}`;
    if (isMyTurn) {
      if (uiState.peekMode) {
        phaseSub = lang === 'zh'
          ? '🔍 密查模式：点击中央任意 1 个【买家槽】或【垃圾桶】，消耗 1 碎片私密偷看！'
          : '🔍 PEEK MODE: Click any Buyer or Trash slot to spend 1 Piece & privately inspect it!';
      } else if (mustSwapPlayer) {
        phaseSub = lang === 'zh'
          ? '💣 炸弹强制令！你手持炸弹，严禁换入买家/垃圾桶 — 必须点击另一名玩家强制交换！'
          : '💣 MANDATORY BOMB RULE! You hold a Bomb — you MUST click another player to swap!';
      } else {
        phaseSub = lang === 'zh'
          ? '轮到你换牌！点击任意【其他玩家】、【买家槽】或【垃圾桶】进行 1 对 1 暗换。'
          : 'YOUR TURN! Click any rival player, Buyer pedestal, or Trash slot to blind-swap.';
      }
    } else {
      const actorName = nameOf(state.currentTurnSeatId);
      phaseSub = lang === 'zh'
        ? `等待【${actorName}】选择换牌目标...`
        : `Waiting for ${actorName} to choose a swap target...`;
    }
  } else if (state.phase === 'round_reveal') {
    phaseTitle = lang === 'zh' ? `第 ${state.round} 回合 · 黑市亮牌结算` : `Round ${state.round} · Black Market Showdown`;
    phaseSub = lang === 'zh'
      ? '全部手牌与 3 个买家展台已翻开！核对宝石倍率、钻石碎片与炸弹甩锅奖励。'
      : 'All hands & 3 Buyer pedestals revealed! Review gem multipliers, Diamond Pieces & Bomb Baits.';
  } else {
    phaseTitle = lang === 'zh' ? '终局时刻 · 秘密伙伴 (MANITO) 闭环乘法揭晓' : 'GRAND FINALE · SECRET MANITO MULTIPLICATION';
    phaseSub = lang === 'zh'
      ? '最终得分 = 己分 × Manito分！见证「负负得正」与「正负崩盘」的命运审判！'
      : 'Final Score = Own Score × Manito Score! Witness Negative × Negative reversals!';
  }

  const projectedFinal = me && myManito ? me.score * myManito.score : 0;
  const negPactAlert = Boolean(me && myManito && myManito.score < 0);

  // SVG Overlay (directional swap arc during play, or full circular Manito laser beams during finale!)
  let svgOverlayInner = '';
  if (isFinale && state.manitoCycle && state.manitoOf) {
    svgOverlayInner = state.manitoCycle
      .map((fromId, idx) => {
        const toId = state.manitoOf[fromId];
        const p1 = seatPos[fromId];
        const p2 = seatPos[toId];
        if (!p1 || !p2) return '';
        const entry = state.finaleEntries?.find((e) => e.seatId === fromId);
        const color = entry?.isNegNegReversal
          ? isLight ? '#047857' : '#34d399'
          : entry?.isBetrayalCrash
          ? isLight ? '#be123c' : '#f43f5e'
          : isLight ? '#9a6e1f' : '#f2d591';
        const d = curvedArcPath(p1, p2, 0.22);
        return `<path class="gbm-manito-beam" data-motion-key="beam-${fromId}" d="${d}" stroke="${color}" marker-end="url(#gbmArrowGold)" style="animation-delay:${idx * 100}ms;" />`;
      })
      .join('');
  } else if (state.lastSwap && isSwapPhase) {
    const sw = state.lastSwap;
    const p1 = seatPos[sw.actorSeatId];
    const p2 =
      sw.targetKind === 'player'
        ? seatPos[sw.targetSeatId]
        : slotCoordsPct(sw.targetKind, sw.targetSlotKey ? Number(sw.targetSlotKey.split('-')[1]) : 0);
    if (p1 && p2) {
      const d = curvedArcPath(p1, p2, 0.18);
      const arcColor =
        sw.targetKind === 'player'
          ? isLight ? '#b45309' : '#f59e0b'
          : isLight ? '#0284c7' : '#38bdf8';
      svgOverlayInner = `<path class="gbm-swap-arc" data-motion-key="swap-arc-${sw.seq}" d="${d}" stroke="${arcColor}" marker-end="url(#gbmArrowSwap)" />`;
    }
  }

  // Player Nodes around circular ring (keyed for live 3D flips & score animations)
  const seatsHtml = state.players
    .map((p) => {
      const pos = seatPos[p.seatId] || { x: 50, y: 50 };
      const isMe = p.seatId === mySeatId;
      const canSwapTarget = Boolean(isMyTurn && !uiState.peekMode && !isMe);
      const showFaceUp = Boolean(p.card);
      const isManitoHighlight = Boolean(uiState.manitoRevealed && p.isMyManito);

      const cls = [
        'gbm-seat-node',
        isMe ? 'is-me' : '',
        p.isCurrentTurn ? 'is-turn' : '',
        isManitoHighlight ? 'is-manito-glow' : '',
        canSwapTarget ? (mustSwapPlayer ? 'is-bomb-target is-targetable' : 'is-targetable') : '',
      ]
        .filter(Boolean)
        .join(' ');

      const scoreCls = p.score > 0 ? 'is-pos' : p.score < 0 ? 'is-neg' : '';

      return `
        <div class="${cls}" data-motion-key="seat-${UI.escapeHtml(p.seatId)}" style="left:${pos.x.toFixed(1)}%;top:${pos.y.toFixed(1)}%;" ${
          canSwapTarget ? `data-swap-player="${UI.escapeHtml(p.seatId)}"` : ''
        }>
          <div class="gbm-seat-top">
            <span class="gbm-seat-name">
              <span style="color:var(--dp-brass);">${UI.escapeHtml(p.avatar)}</span>
              ${UI.escapeHtml(p.name)}
            </span>
            <span class="gbm-seat-score ${scoreCls}" id="gbm-score-${UI.escapeHtml(p.seatId)}">${fmtSigned(p.score)}</span>
          </div>
          ${renderCardHtml(p.card, {
            motionKey: `card-seat-${p.seatId}`,
            faceUp: showFaceUp,
            size: 'compact',
            lang,
            dirty: p.cardDirty,
          })}
          <div class="gbm-seat-badges">
            ${p.isFirstPlayer ? `<span class="gbm-mini-pill is-first">★ ${lang === 'zh' ? '先手' : '1ST'}</span>` : ''}
            ${isManitoHighlight ? `<span class="gbm-mini-pill is-manito">♥ MANITO</span>` : ''}
            ${p.cardDirty && !showFaceUp ? `<span class="gbm-mini-pill is-swapped">⇄</span>` : ''}
            <span class="gbm-mini-pill">◆${p.pieces}</span>
          </div>
        </div>
      `;
    })
    .join('');

  // Center Pedestals (3 Buyers + 1 Trash) — keyed for real 380ms 3D flips!
  const buyersHtml = state.buyers
    .map((b) => {
      const canSwapSlot = Boolean(isMyTurn && !uiState.peekMode && !mustSwapPlayer);
      const canPeekSlot = Boolean(isMyTurn && uiState.peekMode && !b.revealed);
      const forbidden = Boolean(isMyTurn && !uiState.peekMode && mustSwapPlayer);
      const slotCls = [
        'gbm-slot',
        canPeekSlot ? 'is-peek-target' : canSwapSlot ? 'is-clickable' : '',
        forbidden ? 'is-forbidden' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const attr = canPeekSlot
        ? `data-peek-buyer="${b.index}"`
        : canSwapSlot
        ? `data-swap-buyer="${b.index}"`
        : '';

      return `
        <div class="${slotCls}" data-motion-key="slot-buyer-${b.index}" ${attr}>
          <span class="gbm-slot-tag">${lang === 'zh' ? `买家 ${b.index + 1}` : `BUYER ${b.index + 1}`}</span>
          ${renderCardHtml(b.card, {
            motionKey: `card-buyer-${b.index}`,
            faceUp: b.revealed,
            size: 'normal',
            lang,
            privateBadge: b.source === 'private',
          })}
        </div>
      `;
    })
    .join('');

  const trashCanSwap = Boolean(isMyTurn && !uiState.peekMode && !mustSwapPlayer);
  const trashCanPeek = Boolean(isMyTurn && uiState.peekMode && !state.trash.revealed);
  const trashForbidden = Boolean(isMyTurn && !uiState.peekMode && mustSwapPlayer);
  const trashCls = [
    'gbm-slot is-trash',
    trashCanPeek ? 'is-peek-target' : trashCanSwap ? 'is-clickable' : '',
    trashForbidden ? 'is-forbidden' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const trashAttr = trashCanPeek ? 'data-peek-trash="1"' : trashCanSwap ? 'data-swap-trash="1"' : '';

  const trashHtml = `
    <div class="${trashCls}" data-motion-key="slot-trash" ${trashAttr}>
      <span class="gbm-slot-tag">🗑 ${lang === 'zh' ? '垃圾桶' : 'TRASH'}</span>
      ${renderCardHtml(state.trash.card, {
        motionKey: 'card-trash',
        faceUp: state.trash.revealed,
        size: 'normal',
        lang,
        privateBadge: state.trash.source === 'private',
      })}
    </div>
  `;

  // Round Showdown Breakdown Panel
  let showdownPanelHtml = '';
  if (state.phase === 'round_reveal' && state.roundSummary) {
    const sum = state.roundSummary;
    const myPendingAdvance = Boolean(mySeatId && state.pendingSeatIds.includes(mySeatId));
    showdownPanelHtml = `
      <section class="gbm-showdown-panel" data-motion-key="gbm-showdown-r${sum.round}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <span class="dp-badge">${lang === 'zh' ? `第 ${sum.round} 回合亮牌清单` : `ROUND ${sum.round} SHOWDOWN`}</span>
            <h3 style="margin:6px 0 2px;font-family:var(--dp-font-display);font-size:20px;color:var(--dp-brass-bright);">
              ${lang === 'zh' ? '黑市成交与炸弹诱杀结算' : 'Black Market Valuation & Bomb Traps'}
            </h3>
            <div style="font-size:12.5px;color:var(--dp-ink-muted);">
              ${lang === 'zh' ? '下回合先手' : 'Next Round First Player'}: <strong style="color:var(--dp-brass-bright);">★ ${UI.escapeHtml(nameOf(sum.nextFirstSeatId))}</strong>
              ${
                sum.traps.length
                  ? ` · <span style="color:var(--gbm-neg);">💣 ${sum.traps.length} ${lang === 'zh' ? '次成功甩锅诱杀 (+3分)!' : 'Bomb Bait traps triggered (+3 pts)!'}</span>`
                  : ''
              }
            </div>
          </div>
          ${
            myPendingAdvance
              ? `<button type="button" class="dp-btn dp-btn-primary" id="gbm-advance-round" style="min-height:44px;padding:0 20px;">
                  ${
                    state.round >= state.totalRounds
                      ? lang === 'zh'
                        ? '揭晓秘密伙伴终局 →'
                        : 'Reveal Secret Manito Finale →'
                      : lang === 'zh'
                      ? `进入第 ${state.round + 1} 回合 →`
                      : `Proceed to Round ${state.round + 1} →`
                  }
                </button>`
              : `<span class="dp-badge dp-badge-emerald">${
                  lang === 'zh' ? '已确认 · 等待其他玩家...' : 'Ready · Waiting for others...'
                }</span>`
          }
        </div>

        <div class="gbm-breakdown-grid">
          ${state.players
            .map((p) => {
              const bd = sum.breakdown[p.seatId];
              if (!bd) return '';
              const meta = GEM_META[bd.card.type];
              const formula =
                bd.card.type === 'bomb'
                  ? `💣 ${bd.card.value}`
                  : `${lang === 'en' ? meta.name.en : meta.name.zh} ${bd.card.value} × ${bd.matchCount} = +${bd.cardScore}`;
              return `
                <div class="gbm-score-row" data-motion-key="bd-${UI.escapeHtml(p.seatId)}">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong>${UI.escapeHtml(p.name)}</strong>
                    <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-weight:800;color:${
                      bd.roundTotal > 0 ? 'var(--gbm-pos)' : bd.roundTotal < 0 ? 'var(--gbm-neg)' : 'var(--dp-ink-muted)'
                    };">
                      ${fmtSigned(bd.roundTotal)}
                    </span>
                  </div>
                  <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:11.5px;font-weight:600;color:${isLight ? (LIGHT_GEM_INK[bd.card.type] || '#334155') : meta.accent};">${formula}</div>
                  ${
                    bd.baitPoints > 0
                      ? `<div style="font-size:11px;color:var(--gbm-warn-ink);">⚡ ${lang === 'zh' ? '炸弹甩锅奖励' : 'Bomb Bait'}: +${bd.baitPoints}</div>`
                      : ''
                  }
                  ${
                    bd.pieceGained > 0
                      ? `<div style="font-size:11px;color:var(--gbm-info-ink);">💎 ${lang === 'zh' ? '钻石特权' : 'Diamond Bonus'}: +1 ◆</div>`
                      : ''
                  }
                  <div class="dp-tabular" style="font-size:11px;color:var(--dp-ink-faint);">
                    ${lang === 'zh' ? '累计个人分' : 'Cumulative'}: <strong style="color:var(--dp-ink);">${bd.cumulativeScore}</strong>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  // Finale Multiplier Reveal Panel
  let finalePanelHtml = '';
  if (isFinale && state.finaleEntries) {
    finalePanelHtml = `
      <section class="gbm-showdown-panel" data-motion-key="gbm-finale-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <span class="dp-badge">${lang === 'zh' ? '闭环链已点亮 · 乘法终局审判' : 'MANITO LOOP IGNITED · MULTIPLIER FINALE'}</span>
            <h2 style="margin:6px 0 2px;font-family:var(--dp-font-display);font-size:23px;color:var(--dp-brass-bright);">
              ${lang === 'zh' ? '最终得分 = 己分 × 秘密伙伴 (Manito) 分' : 'FINAL SCORE = OWN SCORE × MANITO SCORE'}
            </h2>
            <p style="margin:0;font-size:13px;color:var(--dp-ink-muted);">
              ${lang === 'zh' ? '查看下方圆桌激光闭环连线与每位选手的命运乘法反转！' : 'Trace the glowing circular Manito beams below and witness every dramatic reversal!'}
            </p>
          </div>
          ${
            state.phase === 'finale'
              ? `<button type="button" class="dp-btn dp-btn-primary" id="gbm-conclude-btn" style="min-height:44px;padding:0 22px;">
                  ${lang === 'zh' ? '公布最终裁决 →' : 'Seal Final Verdict →'}
                </button>`
              : ''
          }
        </div>

        <div class="gbm-finale-grid">
          ${state.finaleEntries
            .map((e, idx) => {
              const cardCls = [
                'gbm-mult-card',
                idx === 0 ? 'is-winner' : '',
                e.isNegNegReversal ? 'is-reversal' : e.isBetrayalCrash ? 'is-crash' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const finalColor =
                e.finalScore > 0 ? 'var(--gbm-pos)' : e.finalScore < 0 ? 'var(--gbm-neg)' : 'var(--dp-ink-muted)';
              return `
                <div class="${cardCls}" data-motion-key="finale-${UI.escapeHtml(e.seatId)}" style="animation-delay:${idx * 90}ms;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                    <span style="font-weight:700;font-size:14.5px;">
                      <span style="color:var(--dp-brass);margin-right:6px;">#${idx + 1}</span>
                      ${UI.escapeHtml(e.name)}
                    </span>
                    ${
                      e.isNegNegReversal
                        ? `<span class="dp-badge dp-badge-emerald">⚡ ${lang === 'zh' ? '负负得正大翻盘!' : 'NEG × NEG REVERSAL!'}</span>`
                        : e.isBetrayalCrash
                        ? `<span class="dp-badge dp-badge-crimson">💀 ${lang === 'zh' ? '正负崩盘' : 'COLLAPSE'}</span>`
                        : idx === 0
                        ? `<span class="dp-badge">♛ ${lang === 'zh' ? '冠军' : 'WINNER'}</span>`
                        : ''
                    }
                  </div>
                  <div style="font-size:12px;color:var(--dp-ink-muted);">
                    ♥ Manito: <strong style="color:var(--gbm-manito-ink);">${UI.escapeHtml(e.manitoName)}</strong>
                  </div>
                  <div class="gbm-equation">
                    <span>
                      <strong style="color:${e.ownScore < 0 ? 'var(--gbm-neg)' : 'var(--gbm-pos)'};">(${e.ownScore})</strong>
                      ×
                      <strong style="color:${e.manitoScore < 0 ? 'var(--gbm-neg)' : 'var(--gbm-pos)'};">(${e.manitoScore})</strong>
                    </span>
                    <span class="gbm-eq-final dp-tabular" id="gbm-finale-val-${UI.escapeHtml(e.seatId)}" style="color:${finalColor};">
                      = ${fmtSigned(e.finalScore)}
                    </span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  // Turn Order Strip
  const orderHtml = state.turnQueue
    .map((sid, idx) => {
      const done = isSwapPhase && idx < state.turnCursor;
      const now = isSwapPhase && idx === state.turnCursor;
      return `<span class="gbm-order-chip ${done ? 'is-done' : ''} ${now ? 'is-now' : ''}" data-motion-key="ord-${idx}-${UI.escapeHtml(sid)}">
        ${idx + 1}. ${UI.escapeHtml(nameOf(sid))}
      </span>`;
    })
    .join('');

  // Swap Log
  const swapLogHtml = state.swapLog.length
    ? state.swapLog
        .slice()
        .reverse()
        .map((sw) => {
          const actor = nameOf(sw.actorSeatId);
          const target =
            sw.targetKind === 'player'
              ? nameOf(sw.targetSeatId)
              : sw.targetKind === 'buyer'
              ? lang === 'zh'
                ? `买家 ${Number(sw.targetSlotKey.split('-')[1]) + 1}`
                : `Buyer ${Number(sw.targetSlotKey.split('-')[1]) + 1}`
              : lang === 'zh'
              ? '垃圾桶'
              : 'Trash';
          return `<div class="gbm-swap-item" data-motion-key="log-${sw.seq}">
            <strong style="color:var(--dp-ink);">${UI.escapeHtml(actor)}</strong>
            ⇄
            <strong style="color:${sw.targetKind === 'player' ? 'var(--dp-brass-bright)' : 'var(--gbm-info-ink)'};">${UI.escapeHtml(target)}</strong>
            <span class="dp-tabular" style="float:right;font-size:10px;opacity:0.65;">P${sw.pass + 1}</span>
          </div>`;
        })
        .join('')
    : `<div style="font-size:12px;color:var(--dp-ink-faint);">${
        lang === 'zh' ? '尚无换牌记录。' : 'No swaps yet this round.'
      }</div>`;

  const html = `
    <div class="gbm-vault" data-motion-key="gbm-root">
      <div class="gbm-header-bar" data-motion-key="gbm-header">
        <div class="gbm-banner-card ${mustSwapPlayer ? 'is-bomb-alert' : ''}" data-motion-key="gbm-phase-card">
          <div class="gbm-phase-title">${UI.escapeHtml(phaseTitle)}</div>
          <div class="gbm-phase-sub">${UI.escapeHtml(phaseSub)}</div>
        </div>

        <div class="gbm-banner-card" data-motion-key="gbm-standing-card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span class="gbm-dossier-seal">${lang === 'zh' ? '我的黑市资产' : 'MY VAULT STANDING'}</span>
            ${me ? UI.renderPieceBadge(me.pieces) : ''}
          </div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;">
            <span class="gbm-my-score ${me && me.score < 0 ? 'is-neg' : 'is-pos'}" id="gbm-my-score">
              ${me ? `${fmtSigned(me.score)} ${lang === 'zh' ? '分' : 'pts'}` : '—'}
            </span>
            <span style="font-size:11.5px;color:var(--dp-ink-muted);">
              ${
                me
                  ? me.usedPiecePeek
                    ? lang === 'zh'
                      ? '碎片密查已使用'
                      : 'Piece Peek used'
                    : lang === 'zh'
                    ? '剩余 1 次碎片密查'
                    : '1 Piece Peek ready'
                  : lang === 'zh'
                  ? '观战模式'
                  : 'Spectator'
              }
            </span>
          </div>
        </div>

        <div class="gbm-manito-dossier ${negPactAlert && uiState.manitoRevealed ? 'is-neg-pact' : ''}" id="gbm-toggle-manito" data-motion-key="gbm-manito-card" title="${
          lang === 'zh' ? '点击切换显示/隐藏你的秘密伙伴档案' : 'Click to toggle Secret Manito visibility'
        }">
          <div>
            <div class="gbm-dossier-seal">♥ ${lang === 'zh' ? '机密伙伴档案 (MY MANITO)' : 'CLASSIFIED MANITO DOSSIER'}</div>
            ${
              !myManito
                ? `<div class="gbm-dossier-hidden">${lang === 'zh' ? '观战保密中' : 'CLASSIFIED'}</div>`
                : uiState.manitoRevealed
                ? `<div class="gbm-dossier-name">${UI.escapeHtml(myManito.name)}
                    <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:13px;margin-left:6px;color:${
                      myManito.score < 0 ? 'var(--gbm-neg)' : 'var(--gbm-pos)'
                    };">(${fmtSigned(myManito.score)})</span>
                  </div>
                  <div class="dp-tabular" style="font-size:11px;color:${negPactAlert ? 'var(--gbm-manito-ink)' : 'var(--dp-ink-muted)'};">
                    ${
                      negPactAlert
                        ? lang === 'zh'
                          ? `⚡ Manito 为负分！可考虑吃炸弹「负负得正」 (当前乘积 ${projectedFinal})`
                          : `⚡ Manito is NEGATIVE! Consider Neg × Neg reversal (proj: ${projectedFinal})`
                        : lang === 'zh'
                        ? `当前预估乘积: ${me.score} × ${myManito.score} = ${projectedFinal}`
                        : `Projected: ${me.score} × ${myManito.score} = ${projectedFinal}`
                    }
                  </div>`
                : `<div class="gbm-dossier-hidden">👁 ${lang === 'zh' ? '点击偷看秘密伙伴' : 'CLICK TO PEEK MANITO'}</div>`
            }
          </div>
          <span style="font-size:18px;opacity:0.75;">${uiState.manitoRevealed ? '👁' : '🔒'}</span>
        </div>
      </div>

      ${finalePanelHtml}
      ${showdownPanelHtml}

      <div class="gbm-stage-grid" data-motion-key="gbm-stage-grid">
        <div class="gbm-table-wrap" data-motion-key="gbm-table">
          <div class="gbm-table-ring" data-motion-key="gbm-ring"></div>

          <svg class="gbm-arc-svg" data-motion-key="gbm-arc-svg" viewBox="0 0 1000 660" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="gbmArrowSwap" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="${isLight ? '#b45309' : '#f59e0b'}" />
              </marker>
              <marker id="gbmArrowGold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="${isLight ? '#9a6e1f' : '#f2d591'}" />
              </marker>
            </defs>
            ${svgOverlayInner}
          </svg>

          <div class="gbm-center-vault" data-motion-key="gbm-center-vault">
            <div class="gbm-vault-label">
              <span>◆ ${lang === 'zh' ? '地下黑市展台' : 'BLACK MARKET PEDESTALS'} ◆</span>
              ${
                mustSwapPlayer
                  ? `<span style="color:var(--gbm-neg);">(${lang === 'zh' ? '炸弹禁换' : 'BOMB LOCKED'})</span>`
                  : ''
              }
            </div>
            <div class="gbm-pedestals-row" data-motion-key="gbm-pedestals">
              ${buyersHtml}
              ${trashHtml}
            </div>
          </div>

          <div class="gbm-seats-layer" data-motion-key="gbm-seats-layer">${seatsHtml}</div>
        </div>

        <aside class="gbm-side-panel" data-motion-key="gbm-side-panel">
          <section class="gbm-hand-panel" data-motion-key="gbm-hand-panel">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:12px;font-weight:700;letter-spacing:0.1em;color:var(--dp-brass);text-transform:uppercase;">
                ${lang === 'zh' ? '我的当前手牌' : 'YOUR CURRENT HAND'}
              </span>
              ${
                state.myCardDirty && !state.myCardKnown
                  ? `<span class="dp-badge dp-badge-crimson">${lang === 'zh' ? '已被交换·未知' : 'SWAPPED · UNKNOWN'}</span>`
                  : state.myCard?.type === 'bomb'
                  ? `<span class="dp-badge dp-badge-crimson">💣 ${lang === 'zh' ? '手持炸弹' : 'BOMB HELD'}</span>`
                  : ''
              }
            </div>

            <div class="gbm-hand-stage">
              ${renderCardHtml(state.myCard, {
                motionKey: 'card-my-hand',
                faceUp: Boolean(state.myCard && state.myCardKnown),
                size: 'large',
                lang,
                dirty: state.myCardDirty,
              })}

              <div class="gbm-hand-info">
                ${
                  !me
                    ? `<p style="font-size:12.5px;color:var(--dp-ink-muted);margin:0;">${
                        lang === 'zh' ? '观战视角无法查看暗牌。' : 'Hidden cards are concealed for spectators.'
                      }</p>`
                    : state.phase === 'deal_peek'
                    ? `
                      <div style="font-size:12.5px;color:var(--dp-ink-muted);">
                        ${lang === 'zh' ? '记住你的起手底牌，准备开始两轮强制换牌。' : 'Memorize your opening card before forced swaps begin.'}
                      </div>
                      ${
                        state.pendingSeatIds.includes(mySeatId)
                          ? `<button type="button" class="dp-btn dp-btn-primary" id="gbm-confirm-peek" style="width:100%;">
                              ${lang === 'zh' ? '确认底牌并就绪 →' : 'Confirm Hand & Ready →'}
                            </button>`
                          : `<span class="dp-badge dp-badge-emerald">✓ ${lang === 'zh' ? '已就绪，等待其余玩家' : 'Ready — awaiting others'}</span>`
                      }
                    `
                    : isMyTurn
                    ? `
                      <div style="font-size:12.5px;color:${mustSwapPlayer ? 'var(--gbm-neg)' : 'var(--dp-ink-muted)'};">
                        ${
                          mustSwapPlayer
                            ? lang === 'zh'
                              ? '你手持炸弹！请直接点击圆桌上的【另一名玩家】进行强制交换。'
                              : 'Holding a Bomb! Click any OTHER PLAYER on the vault ring to swap.'
                            : lang === 'zh'
                            ? '轮到你行动：直接点击圆桌上的玩家、买家或垃圾桶完成 1 对 1 换牌！'
                            : 'Your turn: click any Player, Buyer pedestal, or Trash slot on the table to swap!'
                        }
                      </div>
                      ${
                        canPiecePeek
                          ? `<button type="button" class="dp-btn ${uiState.peekMode ? 'dp-btn-crimson' : ''}" id="gbm-toggle-peek" style="width:100%;">
                              ${
                                uiState.peekMode
                                  ? lang === 'zh'
                                    ? '✕ 取消碎片密查'
                                    : '✕ Cancel Peek Mode'
                                  : lang === 'zh'
                                  ? '◆1 偷看 1 个买家 / 垃圾桶'
                                  : '◆1 Peek 1 Buyer / Trash'
                              }
                            </button>`
                          : ''
                      }
                    `
                    : state.myCardDirty && !state.myCardKnown
                    ? `<div style="font-size:12.5px;color:var(--gbm-warn-ink);">
                        ${lang === 'zh' ? '刚才有玩家与你换了牌！按剧集规则，轮到你的回合时才能揭开查看新牌。' : 'Someone swapped with you! Per show rules, your new card remains hidden until your turn.'}
                      </div>`
                    : `<div style="font-size:12.5px;color:var(--dp-ink-muted);">
                        ${
                          state.myCard?.type === 'bomb'
                            ? lang === 'zh'
                              ? `若对手主动来偷走你的炸弹，你将在结算时获得 +${BOMB_BAIT_BONUS} 甩锅分！`
                              : `If a rival steals your Bomb on their turn, you secretly score +${BOMB_BAIT_BONUS} Bomb Bait pts!`
                            : lang === 'zh'
                            ? '观察圆桌上的换牌轨迹，推理买家槽里的宝石种类与炸弹流向！'
                            : 'Track the glowing swap arcs to deduce Buyer gems & locate the two Bombs!'
                        }
                      </div>`
                }
              </div>
            </div>
          </section>

          <section class="gbm-order-panel" data-motion-key="gbm-order-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11.5px;font-weight:700;letter-spacing:0.09em;color:var(--dp-brass);text-transform:uppercase;">
                ${
                  state.passIndex === 1
                    ? lang === 'zh'
                      ? '本轮逆序队列 (PASS 2 ↺)'
                      : 'REVERSE ORDER (PASS 2 ↺)'
                    : lang === 'zh'
                    ? '本轮正序队列 (PASS 1 ↻)'
                    : 'FORWARD ORDER (PASS 1 ↻)'
                }
              </span>
              <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:11px;color:var(--dp-ink-faint);">
                R${state.round}/${state.totalRounds}
              </span>
            </div>
            <div class="gbm-order-strip">${orderHtml}</div>
          </section>

          <section class="gbm-log-panel" data-motion-key="gbm-log-panel">
            <div style="font-size:11.5px;font-weight:700;letter-spacing:0.09em;color:var(--dp-brass);text-transform:uppercase;">
              ${lang === 'zh' ? '本轮黑市换牌轨迹' : 'ROUND SWAP TRAIL'}
            </div>
            <div class="gbm-swap-log">${swapLogHtml}</div>
          </section>
        </aside>
      </div>
    </div>
  `;

  // Keyed DOM Patch — preserves .gbm-card-inner so 3D card flips animate cleanly at 380ms!
  Motion.patchDOM(container, html);

  // Animate seat scores & player standing with directional emerald/crimson delta tint
  if (me) {
    if (uiState.prevMyScore !== null && uiState.prevMyScore !== me.score) {
      const unit = lang === 'zh' ? '分' : 'pts';
      Motion.animateNumber(container.querySelector('#gbm-my-score'), uiState.prevMyScore, me.score, {
        duration: 280,
        format: (v) => `${fmtSigned(v)} ${unit}`,
        flash: true,
      });
    }
    uiState.prevMyScore = me.score;
  }

  for (const p of state.players) {
    const prevS = uiState.prevScores[p.seatId];
    if (prevS !== undefined && prevS !== p.score) {
      Motion.animateNumber(container.querySelector(`#gbm-score-${CSS.escape(p.seatId)}`), prevS, p.score, {
        duration: 280,
        format: fmtSigned,
        flash: true,
      });
    }
    uiState.prevScores[p.seatId] = p.score;
  }

  // Animate Finale Manito multiplication reveals (0 -> Own x Manito = Final)
  if (isFinale && state.finaleEntries && !uiState.finaleAnimated) {
    uiState.finaleAnimated = true;
    state.finaleEntries.forEach((e, idx) => {
      const el = container.querySelector(`#gbm-finale-val-${CSS.escape(e.seatId)}`);
      if (!el) return;
      setTimeout(() => {
        if (!el.isConnected) return;
        Motion.animateNumber(el, 0, e.finalScore, {
          duration: 380,
          format: (v) => `= ${fmtSigned(v)}`,
          flash: true,
        });
      }, idx * 75);
    });
  }
}

// Re-render SVG beam palette cleanly on live Dark <-> Light Theme toggle
Theme.onChange(() => {
  if (uiState.lastContainer && uiState.lastCtx) {
    renderVault(uiState.lastContainer, uiState.lastCtx);
  }
});

mountGame({
  config: {
    id: 'gem-black-market',
    title: { zh: '宝石黑市', en: 'Gem Black Market', ko: '보석 암시장' },
    category: 'MAIN MATCH',
    episode: 'EP 6–7',
    minPlayers: 4,
    maxPlayers: 9,
    defaultPlayers: 7,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'turnTimer',
        label: { zh: '换牌限时', en: 'Swap Timer' },
        type: 'select',
        default: '45',
        choices: [
          { value: '45', label: { zh: '45 秒', en: '45s' } },
          { value: '30', label: { zh: '30 秒（快节奏）', en: '30s (Fast)' } },
          { value: '0', label: { zh: '不限时', en: 'Untimed' } },
        ],
      },
    ],
    rulesSummary: RULES_SUMMARY,
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderVault,
});

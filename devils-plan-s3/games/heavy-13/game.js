/**
 * The Devil's Plan Season 3: Dead Again — Day 1 Prison Match 1
 * 沉重13 (Heavy 13 / 무거운 13) — Prison Dungeon Stone Pedestal Renderer
 * Upgraded with Motion.patchDOM, Motion.delegate, progressive SVG cracks, animateNumber & shake
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import { GameRules, COLORS, CHIP_TYPES, ROCK_VALUES, BUST_LIMIT } from './rules.js';

const COLOR_META = {
  red: { zh: '绯红底座', en: 'Crimson Ruby', shortZh: '红', shortEn: 'RED' },
  green: { zh: '翡翠底座', en: 'Emerald Jade', shortZh: '绿', shortEn: 'GRN' },
  blue: { zh: '钴蓝底座', en: 'Cobalt Sapphire', shortZh: '蓝', shortEn: 'BLU' },
  rainbow: { zh: '彩虹筹码', en: 'Rainbow Chip', shortZh: '彩', shortEn: 'RAINBOW' },
};

const uiDraft = {
  key: '',
  selectedRock: null,
  selectedChip: null,
  lastEventSig: '',
  bustShakeUntil: 0,
  bustedColor: null,
  prevWeights: { red: null, green: null, blue: null },
  prevPenalties: new Map(),
  latestCtx: null,
  latestContainer: null,
};

function syncDraftKey(state, mySeatId) {
  const k = `${state.round}-${state.phase}-${mySeatId || 'spec'}`;
  if (uiDraft.key !== k) {
    uiDraft.key = k;
    uiDraft.selectedRock = null;
    uiDraft.selectedChip = null;
  }
}

function handleEventFeedback(lastEvent, sfx, log, lang) {
  if (!lastEvent) return;
  const sig = `${lastEvent.type}-${lastEvent.round || ''}-${lastEvent.seatId || ''}-${lastEvent.color || ''}-${lastEvent.rock ?? ''}-${lastEvent.penalty ?? ''}-${lastEvent.ts || ''}`;
  if (sig === uiDraft.lastEventSig) return;
  uiDraft.lastEventSig = sig;

  const cname = (c) => (lang === 'zh' ? COLOR_META[c]?.zh : COLOR_META[c]?.en) || c;

  if (lastEvent.type === 'STAND_BUST') {
    sfx.play('eliminate');
    uiDraft.bustShakeUntil = Date.now() + 450;
    uiDraft.bustedColor = lastEvent.color;
    log(
      lang === 'zh'
        ? `💥 爆仓崩塌！${lastEvent.seatName} 放入 ${lastEvent.rock} 令【${cname(lastEvent.color)}】达到 ${lastEvent.weight} ≥ 13，吃下 +${lastEvent.penalty} 罚分！`
        : `💥 PEDESTAL BUST! ${lastEvent.seatName} dropped ${lastEvent.rock} on ${cname(lastEvent.color)} (${lastEvent.weight} ≥ 13) for +${lastEvent.penalty} PENALTY!`,
      'alert'
    );
  } else if (lastEvent.type === 'ROCK_PLACED') {
    sfx.play('tilePlace');
  } else if (lastEvent.type === 'PLAYER_PASSED') {
    sfx.play('cardFlip');
    log(
      lang === 'zh'
        ? `⏳ ${lastEvent.seatName} 发动战略延迟（Pass），顺延至本回合最末位放置！`
        : `⏳ ${lastEvent.seatName} activated Strategic Pass — delayed to end of round!`,
      'system'
    );
  } else if (lastEvent.type === 'CYCLE_REFRESH') {
    sfx.play('pieceGain');
    log(
      lang === 'zh'
        ? '♻ 第 8 回合开启！全员回收 0–6 岩石卡、7 枚颜色筹码与战略延迟次数！'
        : '♻ Cycle 2 Begins (Round 8)! All 7 rock cards, 7 chips, and Strategic Pass refreshed!',
      'alert'
    );
  } else if (lastEvent.type === 'CARDS_REVEALED') {
    sfx.play('reveal');
  }
}

function renderStressCracksSvg(color) {
  return `
    <svg class="h13-cracks-svg" data-motion-key="h13-cracks-${color}" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M 38 298 L 62 246 L 44 212 L 88 168 L 76 124 L 118 82" fill="none" stroke="var(--dp-crimson-bright)" stroke-width="2.4" stroke-linecap="round" opacity="0.88" />
      <path d="M 88 168 L 130 152 L 154 128" fill="none" stroke="var(--dp-amber)" stroke-width="1.6" stroke-linecap="round" opacity="0.82" />
      <path d="M 262 298 L 228 242 L 246 196 L 204 156 L 220 108 L 182 68" fill="none" stroke="var(--dp-crimson-bright)" stroke-width="2.2" stroke-linecap="round" opacity="0.85" />
      <path d="M 204 156 L 166 172" fill="none" stroke="var(--dp-amber)" stroke-width="1.5" stroke-linecap="round" opacity="0.78" />
    </svg>
  `;
}

function bindDelegatedEvents(container) {
  // Hand Rock Selection
  Motion.delegate(
    container,
    'click',
    '[data-pick-rock]',
    (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx || btn.disabled) return;
      ctx.sfx.play('click');
      uiDraft.selectedRock = Number(btn.dataset.pickRock);
      renderHeavy13(uiDraft.latestContainer, ctx);
    },
    'h13-pick-rock'
  );

  // Hand Chip Selection
  Motion.delegate(
    container,
    'click',
    '[data-pick-chip]',
    (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx || btn.disabled) return;
      ctx.sfx.play('click');
      uiDraft.selectedChip = btn.dataset.pickChip;
      renderHeavy13(uiDraft.latestContainer, ctx);
    },
    'h13-pick-chip'
  );

  // Submit Play (with Motion.shake if incomplete or invalid!)
  Motion.delegate(
    container,
    'click',
    '#h13-btn-submit',
    async (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      if (uiDraft.selectedRock === null || uiDraft.selectedChip === null) {
        ctx.sfx.play('error');
        const target =
          uiDraft.selectedRock === null
            ? container.querySelector('[data-motion-key="h13-rock-cards"]')
            : container.querySelector('[data-motion-key="h13-chips-grid"]');
        Motion.shake(target || btn);
        ctx.ui.toast(
          ctx.lang === 'zh' ? '请先选择 1 张岩石卡和 1 枚颜色筹码' : 'Select both 1 Rock Card and 1 Color Chip first',
          'error'
        );
        return;
      }
      const res = await ctx.dispatch({
        type: 'SUBMIT_PLAY',
        payload: { rock: uiDraft.selectedRock, chip: uiDraft.selectedChip },
      });
      if (!res.ok) {
        ctx.sfx.play('error');
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      } else {
        ctx.sfx.play('cardFlip');
      }
    },
    'h13-submit'
  );

  // Rainbow Stand Choice (pedestal click or quick button)
  Motion.delegate(
    container,
    'click',
    '[data-choose-stand]',
    async (e, el) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      const color = el.dataset.chooseStand;
      const res = await ctx.dispatch({ type: 'CHOOSE_STAND', payload: { color } });
      if (!res.ok) {
        ctx.sfx.play('error');
        Motion.shake(el);
        ctx.ui.toast(res.reason, 'error');
      } else {
        ctx.sfx.play('tilePlace');
      }
    },
    'h13-choose-stand-click'
  );

  Motion.delegate(
    container,
    'keydown',
    '[data-choose-stand][role="button"]',
    (e, el) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      el.click();
    },
    'h13-choose-stand-key'
  );

  // Confirm Place Now
  Motion.delegate(
    container,
    'click',
    '#h13-btn-confirm-place',
    async (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      const res = await ctx.dispatch({ type: 'CONFIRM_PLACE' });
      if (!res.ok) {
        ctx.sfx.play('error');
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      } else {
        ctx.sfx.play('tilePlace');
      }
    },
    'h13-confirm-place'
  );

  // Strategic Pass
  Motion.delegate(
    container,
    'click',
    '#h13-btn-pass',
    async (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      const res = await ctx.dispatch({ type: 'USE_PASS' });
      if (!res.ok) {
        ctx.sfx.play('error');
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      } else {
        ctx.sfx.play('cardFlip');
      }
    },
    'h13-pass'
  );

  // Next Round
  Motion.delegate(
    container,
    'click',
    '#h13-btn-next-round',
    async (e, btn) => {
      const ctx = uiDraft.latestCtx;
      if (!ctx) return;
      ctx.sfx.play('click');
      const res = await ctx.dispatch({ type: 'NEXT_ROUND' });
      if (!res.ok) {
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'h13-next-round'
  );
}

mountGame({
  config: {
    id: 'heavy-13',
    title: { zh: '沉重13', en: 'Heavy 13', ko: '무거운 13' },
    category: 'PRISON MATCH',
    episode: 'EP 2–3 · DAY 1',
    minPlayers: 3,
    maxPlayers: 8,
    defaultPlayers: 6,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'allowPass',
        label: { zh: '战略延迟 Pass（每 7 轮周期限 1 次）', en: 'Strategic Pass (1 per 7-round cycle)' },
        type: 'boolean',
        default: true,
      },
      {
        key: 'fastTimers',
        label: { zh: '快节奏计时', en: 'Fast Timers' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 游戏目标
共进行 **14 回合**（两轮 7 张牌循环），避免触发红、绿、蓝三座石底座的 **临界点 13 爆仓**。14 回合结束后，**累计罚分最少者获胜**，罚分最多者面临淘汰！

### 手牌与筹码（第 8 回合全员回收重发）
- **7 张岩石卡**：\`0, 1, 2, 3, 4, 5, 6\`（代表放置岩石的重量）。
- **7 枚颜色筹码**：红 ×2、绿 ×2、蓝 ×2、**彩虹筹码 ×1**。
- **战略延迟（Pass）**：每 7 轮周期限用 1 次，轮到自己放置时可顺延至本回合最末位再放。

### 每回合结算顺序
1. **同时暗出**：秘密选出 \`1 张岩石卡 + 1 枚颜色筹码\`，随后全场同时翻牌。
2. **第 1 优先级 — 彩虹筹码**：最先放置，可**自由任选红/绿/蓝三座底座之一**（多人同出彩虹时，按数字从大到小、再按基准顺位顺时针）。
3. **第 2 优先级 — 常规颜色**：按打出的**岩石数字从大到小**依次放入对应颜色底座；同数字按**基准顺位（★）顺时针**优先。
4. **临界点 13 爆仓**：
   - 若放上岩石后该底座总重量 **\`≥ 13\`**，底座立即崩塌！
   - 触发者承受罚分：**\`罚分 = 该底座此刻堆叠的岩石总块数\`**（含自己刚放的这块，也含所有 0 号岩石！）。
   - 崩塌底座清空归 \`0\`，后续同回合岩石从 \`0\` 重新堆叠。
5. **0 号岩石陷阱**：\`0\` 不增加重量、永不主动爆仓，但会令底座岩石块数 \`+1\`，大幅抬高后续爆仓者的罚分！
6. **下回合基准顺位**：本回合**最后一位吃到罚分的玩家**成为下回合基准顺位（★）。`,
      en: `### Objective
Survive **14 rounds** (two 7-round card cycles) across 3 shared stone pedestals (Crimson Ruby, Emerald Jade, Cobalt Sapphire). Avoid pushing any pedestal to **13 or more**. After Round 14, the **LOWEST total penalty wins**!

### Hand & Chips (Refreshed at Round 8)
- **7 Rock Cards**: \`0, 1, 2, 3, 4, 5, 6\` (stone weight).
- **7 Color Chips**: Red ×2, Green ×2, Blue ×2, **Rainbow ×1**.
- **Strategic Pass**: Once per 7-round cycle, delay your placement to the very end of the current round's queue.

### Round Resolution Order
1. **Simultaneous Hidden Play**: Secretly choose 1 Rock Card + 1 Color Chip, then reveal all together.
2. **Priority 1 — Rainbow Chips**: Act FIRST and freely choose **any** of the 3 pedestals (ties broken by highest rock, then clockwise from First Player ★).
3. **Priority 2 — Regular Color Chips**: Placed from **highest rock down to lowest**; ties broken clockwise from First Player (★).
4. **Threshold 13 Bust**:
   - The moment a pedestal's cumulative weight reaches **\`≥ 13\`**, it **SHATTERS (BUST)**!
   - The triggering player takes **Penalty = total number of rock blocks on that pedestal** (including their own rock AND any 0-weight rocks!).
   - The pedestal resets to \`0\` immediately for remaining players in the queue.
5. **The Poison \`0\` Rock**: Adds \`0\` weight (never busts) but adds \`+1\` rock block to the pedestal — poisoning it for whoever busts next!
6. **First Player Update**: The **last player who busted** in a round becomes next round's First Player (★).`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderHeavy13,
});

function renderHeavy13(container, ctx) {
  const { state, mySeatId, lang, lastEvent, sfx, log } = ctx;
  if (!state) return;

  uiDraft.latestCtx = ctx;
  uiDraft.latestContainer = container;

  syncDraftKey(state, mySeatId);
  handleEventFeedback(lastEvent, sfx, log, lang);
  bindDelegatedEvents(container);

  const t = (zh, en) => (lang === 'zh' ? zh : en);
  const me = mySeatId ? state.players[mySeatId] : null;
  const firstPlayer = state.players[state.firstPlayerSeatId];
  const isMyDecision = state.phase === 'PLACE_DECISION' && state.decision?.seatId === mySeatId;
  const isMyRainbow = isMyDecision && state.decision.type === 'RAINBOW';
  const isMyPassChoice = isMyDecision && state.decision.type === 'PASS_OR_PLACE';
  const isShaking = Date.now() < uiDraft.bustShakeUntil;

  const cname = (c) => (lang === 'zh' ? COLOR_META[c]?.zh : COLOR_META[c]?.en) || c;
  const cshort = (c) => (lang === 'zh' ? COLOR_META[c]?.shortZh : COLOR_META[c]?.shortEn) || c;

  const renderPedestals = () => {
    return `
      <div class="h13-pedestals-grid" data-motion-key="h13-pedestals-grid">
        ${COLORS.map((color) => {
          const stand = state.stands[color];
          const w = stand.weight;
          const cnt = stand.rocks.length;
          const isWarn = w >= 9 && w <= 10;
          const isCritical = w >= 11;
          const isJustBusted = isShaking && uiDraft.bustedColor === color;

          let projHtml = '';
          if (isMyRainbow) {
            const rock = state.decision.rock;
            const proj = w + rock;
            const busts = proj >= BUST_LIMIT;
            projHtml = `
              <div class="h13-rainbow-proj dp-tabular ${busts ? 'is-bust' : ''}" data-motion-key="h13-proj-${color}">
                ${
                  busts
                    ? `💥 ${w} + ${rock} = ${proj} · ${t(`爆仓 +${cnt + 1} 罚分`, `BUST +${cnt + 1} PEN`)}`
                    : `✦ ${w} + ${rock} = ${proj}/13 · ${t('点击放入', 'CLICK TO PLACE')}`
                }
              </div>
            `;
          }

          const segments = Array.from({ length: BUST_LIMIT }, (_, i) => {
            const on = i < w;
            const hot = i >= 8 && i <= 10;
            const danger = i >= 11;
            return `<span class="h13-pressure-seg ${on ? 'is-on' : ''} ${hot ? 'is-hot' : ''} ${danger ? 'is-danger' : ''}" data-motion-key="h13-seg-${color}-${i}"></span>`;
          }).join('');

          return `
            <div
              class="h13-pedestal h13-c-${color} ${isWarn ? 'is-warn' : ''} ${isCritical ? 'is-critical' : ''} ${isMyRainbow ? 'is-rainbow-target' : ''} ${isJustBusted ? 'is-just-busted' : ''}"
              data-motion-key="h13-ped-${color}"
              ${isMyRainbow ? `data-choose-stand="${color}" role="button" tabindex="0"` : ''}
            >
              ${renderStressCracksSvg(color)}
              <div class="h13-danger-ring" data-motion-key="h13-danger-ring-${color}" aria-hidden="true"></div>
              <div class="h13-bust-overlay" data-motion-key="h13-bust-overlay-${color}" aria-hidden="true"></div>
              <div style="position:relative;z-index:3;">
                <div class="h13-ped-head">
                  <div class="h13-ped-title">
                    <span class="h13-ped-gem"></span>
                    <span>${cname(color)}</span>
                  </div>
                  <div class="h13-ped-weight-led dp-tabular">
                    <span id="h13-weight-${color}" data-dp-num>${String(w).padStart(2, '0')}</span><span style="font-size:12px;opacity:0.55;">/13</span>
                  </div>
                </div>
                <div class="h13-pressure-wrap">
                  <div class="h13-pressure-track" data-motion-key="h13-track-${color}">${segments}</div>
                  <div class="h13-pressure-labels dp-tabular">
                    <span>${t(`已叠 ${cnt} 块岩石`, `${cnt} rock${cnt === 1 ? '' : 's'} stacked`)}</span>
                    <span>${
                      isCritical
                        ? `⚠ ${t('极度危险！', 'CRITICAL!')}`
                        : t(`爆仓罚分：+${cnt + 1}`, `Bust Pen: +${cnt + 1}`)
                    }</span>
                  </div>
                </div>
              </div>

              <div class="h13-rock-stack-arena">
                <div class="h13-rock-pile" data-motion-key="h13-pile-${color}">
                  ${
                    cnt === 0
                      ? `<span data-motion-key="h13-empty-${color}" style="font-size:11.5px;color:var(--dp-ink-faint);opacity:0.78;">${t('空底座 · 重量 0', 'Empty Pedestal · Weight 0')}</span>`
                      : stand.rocks
                          .map(
                            (r, rIdx) => `
                              <div class="h13-stone-block ${r.value === 0 ? 'is-zero' : ''} ${r.isRainbow ? 'is-rainbow' : ''}" data-motion-key="h13-rock-${color}-${rIdx}-${r.round}-${r.seatId}" title="${UI.escapeHtml(r.seatName)} · R${r.round}">
                                <span class="h13-stone-val dp-tabular">${r.value}</span>
                                <span class="h13-stone-owner">${r.isRainbow ? '🌈 ' : ''}${UI.escapeHtml(r.seatName)}</span>
                              </div>
                            `
                          )
                          .join('')
                  }
                </div>
                <div class="h13-pedestal-slab"></div>
              </div>

              ${projHtml}
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  const renderActionBanner = () => {
    const parts = [];

    if (state.lastBust && (state.phase === 'PLACE_DECISION' || state.phase === 'ROUND_END')) {
      const b = state.lastBust;
      parts.push(`
        <div class="h13-bust-banner" data-motion-key="h13-bust-${b.round}-${b.color}-${b.victimSeatId}">
          <div>
            <div class="dp-tabular" style="font-size:11.5px;letter-spacing:0.12em;color:var(--dp-crimson-bright);font-weight:800;">💥 PEDESTAL SHATTERED · WEIGHT ${b.weight} ≥ 13</div>
            <div style="font-size:15px;font-weight:700;color:var(--dp-ink);margin-top:2px;">
              ${t(
                `${UI.escapeHtml(b.victimName)} 击碎【${cname(b.color)}】（落岩 ${b.triggerRock}），吃下 +${b.penalty} 罚分！`,
                `${UI.escapeHtml(b.victimName)} shattered ${cname(b.color)} (rock ${b.triggerRock}) and took +${b.penalty} PENALTY!`
              )}
            </div>
          </div>
          <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:22px;font-weight:900;color:var(--dp-crimson-bright);">
            +${b.penalty} PEN
          </div>
        </div>
      `);
    }

    if (isMyRainbow) {
      const dec = state.decision;
      parts.push(`
        <div class="h13-decision-bar" data-motion-key="h13-dec-rainbow-${state.round}">
          <div>
            <div style="font-size:11.5px;letter-spacing:0.1em;color:var(--dp-brass-bright);font-weight:800;">
              🌈 ${t('彩虹筹码特权 · 优先指定底座', 'RAINBOW CHIP PRIORITY · CHOOSE PEDESTAL')}
            </div>
            <div style="font-size:14px;color:var(--dp-ink);margin-top:2px;">
              ${t(
                `点击上方【红 / 绿 / 蓝】任意一座底座，放下你的岩石卡 [${dec.rock}]`,
                `Click Crimson, Emerald, or Cobalt pedestal above to drop Rock [${dec.rock}]`
              )}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${COLORS.map(
              (c) =>
                `<button type="button" class="dp-btn dp-btn-sm" data-choose-stand="${c}" style="border-color:var(--dp-border-strong);">${cshort(c)}</button>`
            ).join('')}
            ${
              dec.canPass
                ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-danger" id="h13-btn-pass">⏳ ${t('使用战略延迟 Pass', 'Use Strategic Pass')}</button>`
                : ''
            }
          </div>
        </div>
      `);
    } else if (isMyPassChoice) {
      const dec = state.decision;
      parts.push(`
        <div class="h13-decision-bar" data-motion-key="h13-dec-pass-${state.round}">
          <div>
            <div style="font-size:11.5px;letter-spacing:0.1em;color:${dec.wouldBust ? 'var(--dp-crimson-bright)' : 'var(--dp-brass-bright)'};font-weight:800;">
              ${dec.wouldBust ? `⚠ ${t('爆仓预警！是否发动战略延迟？', 'BUST WARNING! USE STRATEGIC PASS?')}` : t('轮到你放置岩石 · 可发动本周期战略延迟', 'YOUR PLACEMENT TURN · STRATEGIC PASS AVAILABLE')}
            </div>
            <div class="dp-tabular" style="font-size:14px;color:var(--dp-ink);margin-top:2px;">
              ${t(
                `你的 [${cshort(dec.targetColor)} · ${dec.rock}] 放入【${cname(dec.targetColor)}】后总重将变为 ${dec.projectedWeight}${dec.wouldBust ? `（爆仓吃 +${dec.projectedPenalty} 罚分！）` : '（安全）'}`,
                `Dropping [${cshort(dec.targetColor)} · ${dec.rock}] onto ${cname(dec.targetColor)} makes weight ${dec.projectedWeight}${dec.wouldBust ? ` (BUST +${dec.projectedPenalty} PEN!)` : ' (SAFE)'}`
              )}
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="dp-btn dp-btn-primary" id="h13-btn-confirm-place">
              🪨 ${t('立即放入底座', 'Place Rock Now')}
            </button>
            <button type="button" class="dp-btn dp-btn-danger" id="h13-btn-pass">
              ⏳ ${t('发动 Pass 延迟至末位', 'Delay / Pass to Last')}
            </button>
          </div>
        </div>
      `);
    } else if (state.phase === 'PLACE_DECISION' && state.decision) {
      const actor = state.players[state.decision.seatId];
      parts.push(`
        <div class="h13-decision-bar" data-motion-key="h13-dec-wait" style="border-color:var(--dp-border);">
          <div style="font-size:13.5px;color:var(--dp-ink-muted);">
            ⏳ ${t(
              `等待 ${UI.escapeHtml(actor?.name || '')} 做出${state.decision.type === 'RAINBOW' ? '彩虹底座选择' : '放置/延迟决策'}（岩石 [${state.decision.rock}]）...`,
              `Waiting for ${UI.escapeHtml(actor?.name || '')}'s ${state.decision.type === 'RAINBOW' ? 'Rainbow pedestal choice' : 'Pass/Place decision'} (Rock [${state.decision.rock}])...`
            )}
          </div>
        </div>
      `);
    } else if (state.phase === 'ROUND_END') {
      const cycleRefreshNext = state.round === 7;
      parts.push(`
        <div class="h13-decision-bar" data-motion-key="h13-round-end-${state.round}">
          <div>
            <div style="font-size:12px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ${t(`第 ${state.round} 回合结算完毕`, `ROUND ${state.round} COMPLETE`)}
            </div>
            <div style="font-size:13.5px;color:var(--dp-ink-muted);margin-top:2px;">
              ${
                cycleRefreshNext
                  ? `♻ ${t('下一回合进入下半场（第 8–14 轮），全员回收全部 7 张岩石卡与 7 枚筹码；底座重量保留。', 'Next round begins Cycle 2 (R8–14): all 7 rock cards & 7 chips refresh while pedestal weights remain.')}`
                  : t(
                      `本回合爆仓 ${state.roundBusts.length} 次 · 下回合基准顺位：★ ${UI.escapeHtml(firstPlayer?.name || '')}`,
                      `${state.roundBusts.length} bust(s) this round · Next First Player: ★ ${UI.escapeHtml(firstPlayer?.name || '')}`
                    )
              }
            </div>
          </div>
          <button type="button" class="dp-btn dp-btn-primary" id="h13-btn-next-round">
            ${t(`进入第 ${state.round + 1} 回合 →`, `Next Round (${state.round + 1}/14) →`)}
          </button>
        </div>
      `);
    }

    return `<div data-motion-key="h13-banners" style="display:flex;flex-direction:column;gap:12px;">${parts.join('')}</div>`;
  };

  const renderHandConsole = () => {
    if (!me || state.phase === 'FINISHED') return '';

    const canSubmit = state.phase === 'SUBMIT' && !state.mySubmission;
    const readyToLock = canSubmit && uiDraft.selectedRock !== null && uiDraft.selectedChip !== null;
    const rocksAvail = new Set(me.rocksLeft || []);

    return `
      <div class="h13-hand-panel" data-motion-key="h13-hand-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>
            <strong style="font-family:var(--dp-font-display);font-size:14px;letter-spacing:0.08em;color:var(--dp-brass-bright);">
              ${t('你的秘密手牌控制台', 'YOUR SECRET HAND CONSOLE')}
            </strong>
            <span style="font-size:12px;color:var(--dp-ink-muted);margin-left:8px;">
              ${
                state.phase === 'SUBMIT'
                  ? state.mySubmission
                    ? t(`✓ 已暗出 [${cshort(state.mySubmission.chip)} · ${state.mySubmission.rock}]，等待其余 ${state.pendingSeatIds.length} 人...`, `✓ Locked [${cshort(state.mySubmission.chip)} · ${state.mySubmission.rock}] · Waiting for ${state.pendingSeatIds.length}...`)
                    : t('选择 1 张岩石卡 + 1 枚颜色筹码，同时亮牌结算', 'Pick 1 Rock Card + 1 Color Chip for simultaneous reveal')
                  : t('本周期剩余手牌（第 8 轮回收刷新）', 'Remaining hand for this 7-round cycle')
              }
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            ${
              state.options.allowPass
                ? `<span class="dp-tabular" style="font-size:12px;color:${me.passLeft > 0 ? 'var(--dp-brass-bright)' : 'var(--dp-ink-faint)'};">⏳ Pass: ${me.passLeft}/1</span>`
                : ''
            }
            ${
              canSubmit
                ? `
                  <button type="button" class="dp-btn dp-btn-primary" id="h13-btn-submit">
                    🔒 ${
                      readyToLock
                        ? t(`暗牌锁定 [${cshort(uiDraft.selectedChip)} · ${uiDraft.selectedRock}]`, `Lock Play [${cshort(uiDraft.selectedChip)} · ${uiDraft.selectedRock}]`)
                        : t('锁定出牌', 'Lock Play')
                    }
                  </button>
                `
                : ''
            }
          </div>
        </div>

        <div class="h13-hand-row">
          <div>
            <div class="h13-sublabel">
              <span>${t('岩石数字卡 (0–6)', 'ROCK CARDS (0–6)')}</span>
              <span>${t('数字越大越先放 · 0 为埋雷卡', 'Higher goes first · 0 = poison')}</span>
            </div>
            <div class="h13-rock-cards" data-motion-key="h13-rock-cards">
              ${ROCK_VALUES.map((val) => {
                const avail = rocksAvail.has(val);
                const sel = canSubmit && uiDraft.selectedRock === val;
                const lockedVal = state.mySubmission && state.mySubmission.rock === val;
                return `
                  <button
                    type="button"
                    class="h13-rock-card ${sel || lockedVal ? 'is-selected' : ''} ${!avail ? 'is-used' : ''}"
                    data-motion-key="h13-card-${val}"
                    data-rock="${val}"
                    data-pick-rock="${val}"
                    ${canSubmit && avail ? '' : 'disabled'}
                  >
                    <span class="h13-rock-card-num dp-tabular">${val}</span>
                    <span class="h13-rock-card-tag">${val === 0 ? t('埋雷', 'TRAP') : t('重量', 'WT')}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div>
            <div class="h13-sublabel">
              <span>${t('颜色筹码 (共7枚)', 'COLOR CHIPS (7)')}</span>
              <span>${t('彩虹优先且任选底座', 'Rainbow = 1st + Any Stand')}</span>
            </div>
            <div class="h13-chips-grid" data-motion-key="h13-chips-grid">
              ${CHIP_TYPES.map((chip) => {
                const count = me.chipsLeft?.[chip] || 0;
                const sel = canSubmit && uiDraft.selectedChip === chip;
                const lockedChip = state.mySubmission && state.mySubmission.chip === chip;
                const colorClass = chip === 'rainbow' ? 'is-rainbow' : `h13-c-${chip}`;
                return `
                  <button
                    type="button"
                    class="h13-chip-btn ${colorClass} ${sel || lockedChip ? 'is-selected' : ''} ${count <= 0 ? 'is-used' : ''}"
                    data-motion-key="h13-chip-${chip}"
                    data-pick-chip="${chip}"
                    ${canSubmit && count > 0 ? '' : 'disabled'}
                  >
                    <span style="display:flex;align-items:center;gap:8px;">
                      <span class="h13-chip-disc"></span>
                      <span style="font-weight:700;font-size:13px;">${cname(chip)}</span>
                    </span>
                    <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-weight:800;font-size:13px;color:var(--dp-brass-bright);">×${count}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderLowerSection = () => {
    return `
      <div class="h13-lower-grid" data-motion-key="h13-lower-grid">
        <div class="h13-box-panel" data-motion-key="h13-standings-panel">
          <div class="h13-sublabel" style="margin-bottom:10px;">
            <span>${t('监狱馆罚分榜 & 已出牌追踪（低分存活）', 'PRISON PENALTY STANDINGS & PLAYED CARD TRACKER')}</span>
            <span>${t('★ = 同数顺位基准', '★ = Tie-Break Lead')}</span>
          </div>
          <div class="h13-standings-grid" data-motion-key="h13-standings-grid">
            ${state.seatOrder
              .map((sid) => {
                const p = state.players[sid];
                const isMe = sid === mySeatId;
                const isFirst = sid === state.firstPlayerSeatId;
                const isActive = state.currentTurnSeatId === sid;
                const hasSubmitted = state.submittedSeatIds.includes(sid);
                const rev = state.revealedSubmissions?.[sid];
                const usedSet = new Set(p.usedRocks || []);

                const statusText =
                  state.phase === 'SUBMIT'
                    ? hasSubmitted
                      ? `<span style="color:var(--dp-emerald);">✓ ${t('已锁', 'Locked')}</span>`
                      : `<span style="color:var(--dp-amber);">…</span>`
                    : rev
                    ? `<span class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">${cshort(rev.chip)}·${rev.rock}</span>`
                    : '';

                return `
                  <div class="h13-pcard ${isMe ? 'is-me' : ''} ${isFirst ? 'is-first' : ''} ${isActive ? 'is-active' : ''}" data-motion-key="h13-pcard-${sid}">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                      <span style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${isFirst ? '<span style="color:var(--dp-brass-bright);">★</span> ' : ''}${UI.escapeHtml(p.name)}
                      </span>
                      ${statusText}
                    </div>
                    <div style="display:flex;align-items:baseline;justify-content:space-between;">
                      <span class="h13-penalty-num dp-tabular ${p.penalty === 0 ? 'is-clean' : ''}">
                        <span data-penalty-seat="${UI.escapeHtml(sid)}" data-dp-num>${p.penalty}</span>
                        <small style="font-size:10px;font-weight:600;color:var(--dp-ink-muted);">${t('罚分', 'PEN')}</small>
                      </span>
                      <span class="dp-tabular" style="font-size:11px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                        💥${p.bustCount}${state.options.allowPass ? ` · ⏳${p.passLeft}` : ''}
                      </span>
                    </div>
                    <div class="h13-used-dots" title="${t('本周期已打出的岩石卡', 'Used rock cards this cycle')}">
                      ${ROCK_VALUES.map(
                        (v) => `<span class="h13-used-dot ${usedSet.has(v) ? 'is-spent' : ''}">${v}</span>`
                      ).join('')}
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="h13-box-panel" data-motion-key="h13-queue-panel">
          <div class="h13-sublabel" style="margin-bottom:10px;">
            <span>${t('本回合放置队列与实况', 'ROUND PLACEMENT QUEUE & LOG')}</span>
            <span class="dp-tabular">R${state.round}</span>
          </div>
          <div class="h13-queue-list" data-motion-key="h13-queue-list">
            ${
              state.roundLog.length === 0 && state.queue.length === 0
                ? `<div data-motion-key="h13-q-empty" style="font-size:12px;color:var(--dp-ink-faint);text-align:center;padding:18px 8px;">${t('全员提交暗牌后，将按「彩虹优先 → 数字从大到小 → 顺时针」依次落岩。', 'Once all players lock in, rocks drop in order: Rainbow first → Highest rock → Clockwise.')}</div>`
                : ''
            }
            ${state.roundLog
              .map((entry, idx) => {
                if (entry.type === 'BUST') {
                  return `
                    <div class="h13-queue-item is-bust" data-motion-key="h13-log-${state.round}-${idx}">
                      <span>💥 <strong>${UI.escapeHtml(entry.seatName)}</strong> → ${cshort(entry.color)} [${entry.rock}]</span>
                      <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-weight:800;">${entry.weightAfter}≥13 · +${entry.penalty}P</span>
                    </div>
                  `;
                }
                if (entry.type === 'PASS') {
                  return `
                    <div class="h13-queue-item is-pass" data-motion-key="h13-log-${state.round}-${idx}">
                      <span>⏳ <strong>${UI.escapeHtml(entry.seatName)}</strong> (${cshort(entry.chip)} ${entry.rock})</span>
                      <span>PASS → ${t('顺延末位', 'Delayed')}</span>
                    </div>
                  `;
                }
                return `
                  <div class="h13-queue-item" data-motion-key="h13-log-${state.round}-${idx}">
                    <span>🪨 <strong>${UI.escapeHtml(entry.seatName)}</strong> → ${cshort(entry.color)} [${entry.rock}]</span>
                    <span class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-ink-muted);">${entry.weightAfter}/13 (${entry.rockCount}${t('块', 'r')})</span>
                  </div>
                `;
              })
              .join('')}
            ${state.queue
              .map(
                (q, idx) => `
                  <div class="h13-queue-item ${idx === 0 ? 'is-next' : ''}" data-motion-key="h13-q-${q.seatId}-${q.hasPassed ? 'p' : 'n'}">
                    <span>${idx === 0 ? '▶ ' : '• '}<strong>${UI.escapeHtml(state.players[q.seatId]?.name || q.seatId)}</strong></span>
                    <span class="dp-tabular" style="font-family:var(--dp-font-mono);">${cshort(q.chip)} · [${q.rock}]${q.hasPassed ? ' (PASS)' : ''}</span>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  };

  const html = `
    <div class="h13-stage ${isShaking ? 'is-bust-shake' : ''}" data-motion-key="h13-stage">
      <div class="h13-header" data-motion-key="h13-header">
        <div class="h13-round-meta">
          <span class="h13-round-badge dp-tabular">ROUND ${state.round} / ${state.totalRounds}</span>
          <span class="h13-cycle-pill dp-tabular">
            ${t(`第 ${state.cycle} 周期（${state.cycle === 1 ? 'R1–7' : 'R8–14'}）`, `CYCLE ${state.cycle} (${state.cycle === 1 ? 'R1–7' : 'R8–14'})`)}
          </span>
          <span class="h13-first-pill">
            ★ ${t('基准顺位', 'First')}: ${UI.escapeHtml(firstPlayer?.name || '')}
          </span>
        </div>
        <div class="dp-tabular" style="font-size:12.5px;color:var(--dp-ink-muted);">
          ${
            state.phase === 'SUBMIT'
              ? t(`暗牌提交中 · 待提交 ${state.pendingSeatIds.length} 人`, `Hidden Submission · ${state.pendingSeatIds.length} pending`)
              : state.phase === 'PLACE_DECISION'
              ? t('放置结算中', 'Resolving Placements')
              : state.phase === 'ROUND_END'
              ? t('回合结束', 'Round Complete')
              : t('试炼结束', 'Match Finished')
          }
        </div>
      </div>

      ${renderActionBanner()}
      ${renderPedestals()}
      ${renderHandConsole()}
      ${renderLowerSection()}
    </div>
  `;

  Motion.patchDOM(container, html);

  // Post-patch Apple Motion Choreography:
  // 1. Animate pedestal weight LED counters smoothly with tabular-nums
  for (const color of COLORS) {
    const w = state.stands[color].weight;
    const prev = uiDraft.prevWeights[color];
    const el = container.querySelector(`#h13-weight-${color}`);
    if (el && prev !== null && prev !== w) {
      Motion.animateNumber(el, prev, w, {
        duration: 240,
        format: (v) => String(Math.round(v)).padStart(2, '0'),
        flash: false,
      });
    }
    uiDraft.prevWeights[color] = w;
  }

  // 2. Animate player penalty scores on Bust!
  for (const sid of state.seatOrder) {
    const p = state.players[sid];
    const prev = uiDraft.prevPenalties.get(sid);
    const el = container.querySelector(`[data-penalty-seat="${CSS.escape ? CSS.escape(sid) : sid}"]`);
    if (el && prev !== undefined && prev !== p.penalty) {
      Motion.animateNumber(el, prev, p.penalty, {
        duration: 280,
        flash: true,
      });
    }
    uiDraft.prevPenalties.set(sid, p.penalty);
  }
}

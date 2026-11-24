/**
 * Betting! Black and White (下注黑与白 · 베팅! 흑과 백) — Interactive Partition Table
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import {
  GameRules,
  ALL_TILES,
  TOTAL_SLOTS,
  TOTAL_CHIPS,
  getTileColor,
  getBorrowCapacity,
  buildAutoBorrowPlan,
} from './rules.js';

// Per-viewer setup draft state (reset cleanly when viewer changes in hotseat!)
let setupDraftOwner = null;
let draftTiles = [4, 2, 7, 0, 5, 9, 1, 6, 3, 8];
let draftChips = [3, 2, 4, 3, 3, 4, 2, 4, 2, 3]; // sum = 30
let swapSelectedIdx = null;

// Per-clash borrow plan draft
let borrowDraftKey = null;
let borrowFromReserve = 0;
let borrowFromSlots = {};
let showCustomBorrow = false;

let lastEventTs = null;

function applyPreset(kind) {
  if (kind === 'balanced') {
    draftTiles = [4, 1, 6, 2, 7, 0, 5, 8, 3, 9];
    draftChips = [3, 2, 3, 2, 4, 3, 3, 4, 2, 4];
  } else if (kind === 'heavy_high') {
    draftTiles = [0, 2, 5, 7, 1, 8, 3, 6, 4, 9];
    draftChips = [1, 1, 3, 5, 1, 5, 2, 4, 2, 6];
  } else if (kind === 'bluff_trap') {
    // Classic S3E11 Oh Hyun-min style: big stacks on 0/1 to force folds, 1-chip trap on 9/8 to call!
    draftTiles = [0, 9, 5, 2, 7, 1, 8, 4, 6, 3];
    draftChips = [5, 1, 3, 2, 4, 5, 1, 3, 4, 2];
  } else if (kind === 'random') {
    const t = ALL_TILES.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    const c = new Array(TOTAL_SLOTS).fill(1);
    let rem = TOTAL_CHIPS - TOTAL_SLOTS;
    while (rem > 0) {
      c[Math.floor(Math.random() * TOTAL_SLOTS)] += 1;
      rem -= 1;
    }
    draftTiles = t;
    draftChips = c;
  }
  swapSelectedIdx = null;
}

function colorShort(color, lang) {
  if (color === 'black') return lang === 'zh' ? '黑' : 'BLK';
  return lang === 'zh' ? '白' : 'WHT';
}

mountGame({
  config: {
    id: 'betting-black-and-white',
    title: { zh: '下注黑与白', en: 'Betting! Black and White', ko: '베팅! 흑과 백' },
    seasons: ['S3', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'timedMode',
        label: { zh: '启用 35 秒决策计时', en: '35s Decision Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 对决目标
《黑与白》的终极筹码进化版（S3E11 吴贤旻 vs 崔连胜名局）！双方各有 **0–9 共 10 张数字砖**（黑=偶 \`0,2,4,6,8\`，白=奇 \`1,3,5,7,9\`）与 **30 枚筹码**，10 轮结束后拥有**更多筹码**者胜！

### 第一阶段：屏风后秘密布阵
- 将全部 10 张砖排入 **#1 至 #10 槽位**。
- 将全部 **30 枚筹码** 分配到 10 个槽位（每槽至少放 **1 枚**）。

### 第二阶段：撤下屏风 · 逐轮摊牌或借调跟注
- 双方布阵完成后撤下屏风：**10 个槽位的黑白颜色与筹码数全部公开**，但所有具体数字保持保密！
- 按 #1 → #10 逐轮对决：
  - **筹码相同**：立即开牌亮底！数字大者赢走双方筹码进入安全储备库；平局各自收回筹码。
  - **筹码不同**：筹码较少的一方必须二选一：
    1. **弃牌 (FOLD)**：不亮出双方数字，直接将本轮己方筹码让给对手！
    2. **跟注 (CALL)**：从**已赢储备库**或**后续未赛槽位（#k+1..#10，每槽须至少保留 1 枚）**借调差额补齐后，双方亮牌比大小，胜者通吃全部底池！`,
      en: `### Objective
The high-stakes S3E11 evolution of Black & White! Each contestant gets **10 tiles (0–9)** (Black=Even \`0,2,4,6,8\`, White=Odd \`1,3,5,7,9\`) and **30 chips**. Hold more total chips after 10 rounds to survive!

### Phase 1 — Behind the Partition
- Arrange all 10 tiles (0–9) into **Slots #1–#10**.
- Allocate all **30 chips** across the 10 slots (minimum **1 chip** per slot).

### Phase 2 — Partition Drop & 10 Clashes
- The screen lifts! All 10 **Black/White colors** and **chip stacks** are revealed publicly, while all numerals stay hidden!
- For each Slot #1 → #10:
  - **Equal Chips**: Instant Showdown! Both numerals flip publicly; higher numeral wins the pot into their Reserve Bank (tie splits).
  - **Unequal Chips**: The lower bettor chooses:
    1. **FOLD**: Surrender your slot's chips immediately — **neither numeral is revealed!**
    2. **CALL**: Borrow the chip difference from your **Reserve Bank** and/or **future slots** (every future slot must keep at least 1 chip!), then flip both numerals for the matched pot!`,
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

    // Reset local setup draft when switching human seat in Pass-and-Play
    if (state.phase === 'setup' && setupDraftOwner !== viewerId) {
      setupDraftOwner = viewerId;
      applyPreset('balanced');
    }

    // Play SFX & log on events
    if (lastEvent && lastEvent.ts && lastEvent.ts !== lastEventTs) {
      lastEventTs = lastEvent.ts;
      if (lastEvent.type === 'SETUP_LOCKED') {
        sfx.play('tilePlace');
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh' ? `${nm} 已在屏风后锁定 10 轮阵型！` : `${nm} locked their 10-slot formation!`,
          'system'
        );
      } else if (lastEvent.type === 'PARTITION_DROPPED') {
        sfx.play('clash');
        log(
          lang === 'zh' ? '屏风降下！双方 10 轮黑白阵型与筹码分布全面公开！' : 'Partition dropped! All 10 Black/White columns & chip stacks revealed!',
          'alert'
        );
      } else if (lastEvent.type === 'ROUND_FOLDED') {
        sfx.play('chipStack');
        const fNm = state.players[lastEvent.folderSeatId]?.name || '';
        const wNm = state.players[lastEvent.winnerSeatId]?.name || '';
        log(
          lang === 'zh'
            ? `第 ${lastEvent.round} 轮：${fNm} 选择弃牌（数字保密），${wNm} 收走 ${lastEvent.pot} 枚筹码！`
            : `R${lastEvent.round}: ${fNm} folded (tiles hidden) — ${wNm} takes ${lastEvent.pot} chips!`,
          'system'
        );
      } else if (lastEvent.type === 'SHOWDOWN_RESOLVED' || lastEvent.type === 'CALL_SHOWDOWN') {
        sfx.play('cardFlip');
        setTimeout(() => {
          if (lastEvent.isDraw) sfx.play('reveal');
          else if (lastEvent.winnerSeatId === viewerId) sfx.play('garnetClink');
          else sfx.play('clash');
        }, 220);
        const wNm = lastEvent.winnerSeatId ? state.players[lastEvent.winnerSeatId]?.name : null;
        log(
          lastEvent.isDraw
            ? lang === 'zh'
              ? `第 ${lastEvent.round} 轮摊牌：数字相同平局，各自收回筹码！`
              : `R${lastEvent.round} Showdown: Tie — chips split!`
            : lang === 'zh'
            ? `第 ${lastEvent.round} 轮摊牌：${wNm} 胜出，赢走 ${lastEvent.pot} 枚筹码！`
            : `R${lastEvent.round} Showdown: ${wNm} wins ${lastEvent.pot} chips!`,
          'alert'
        );
      }
    }

    // ---- RENDER SETUP PHASE (BEHIND PARTITION) ----
    if (state.phase === 'setup') {
      const chipSum = draftChips.reduce((a, b) => a + b, 0);
      const chipRem = TOTAL_CHIPS - chipSum;
      const canLock = !isSpectator && !me.setupLocked && chipSum === TOTAL_CHIPS && draftChips.every((c) => c >= 1);

      container.innerHTML = `
        <div class="bbw-arena">
          <section class="bbw-header-bar">
            <div class="bbw-bank-side">
              <strong>${UI.escapeHtml(me.name)}${!isSpectator ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}</strong>
              <span class="tg-badge ${me.setupLocked ? 'tg-badge-emerald' : 'tg-badge-gold'}">
                ${me.setupLocked ? (lang === 'zh' ? '阵型已锁定' : 'LOCKED') : (lang === 'zh' ? '布阵中' : 'PLANNING')}
              </span>
            </div>
            <div style="text-align:center;">
              <span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '阶段一 · 屏风后秘密布阵' : 'PHASE 1 · SECRET PARTITION'}</span>
            </div>
            <div class="bbw-bank-side is-right">
              <span class="tg-badge ${opp.setupLocked ? 'tg-badge-emerald' : 'tg-badge-cyan'}">
                ${opp.setupLocked ? (lang === 'zh' ? '对手已锁定' : 'READY') : (lang === 'zh' ? '布阵中...' : 'PLANNING...')}
              </span>
              <strong>${UI.escapeHtml(opp.name)}</strong>
            </div>
          </section>

          <section class="bbw-setup-panel">
            ${
              isSpectator
                ? `<div style="text-align:center;padding:36px;color:var(--tg-ink-muted);">${lang === 'zh' ? '双方正在屏风后秘密排布 10 张数字砖与 30 枚筹码...' : 'Contestants are secretly arranging their 10 tiles & 30 chips...'}</div>`
                : me.setupLocked
                ? `
                  <div style="text-align:center;padding:30px 16px;">
                    <div style="font-family:var(--tg-font-display);font-size:22px;color:var(--tg-gold-bright);margin-bottom:8px;">
                      ${lang === 'zh' ? '你的 10 轮阵型已封存！' : 'Your 10-Slot Formation is Locked!'}
                    </div>
                    <p style="color:var(--tg-ink-muted);margin:0;">
                      ${lang === 'zh' ? `正在等待 ${UI.escapeHtml(opp.name)} 完成布阵，随后降下屏风开战...` : `Waiting for ${UI.escapeHtml(opp.name)} to lock in before dropping the partition...`}
                    </p>
                  </div>
                `
                : `
                  <div class="bbw-setup-top">
                    <div>
                      <div style="font-family:var(--tg-font-display);font-size:18px;font-weight:800;color:var(--tg-gold-bright);">
                        ${lang === 'zh' ? '排定 10 回合数字砖顺序 & 分配 30 枚筹码' : 'Arrange 10 Tiles (0–9) & Allocate 30 Chips'}
                      </div>
                      <div style="font-size:12.5px;color:var(--tg-ink-muted);margin-top:2px;">
                        ${lang === 'zh' ? '点击任意两张砖即可互换位置；调整下方 +/- 分配筹码（每槽至少 1 枚，总计 30 枚）' : 'Click any two tiles to swap slots; use -/+ to distribute all 30 chips (min 1 per slot)'}
                      </div>
                    </div>
                    <div class="bbw-preset-bar">
                      <button type="button" class="tg-btn tg-btn-sm" data-preset="balanced">${lang === 'zh' ? '均衡阵型' : 'Balanced'}</button>
                      <button type="button" class="tg-btn tg-btn-sm" data-preset="heavy_high">${lang === 'zh' ? '高牌重注' : 'Heavy High'}</button>
                      <button type="button" class="tg-btn tg-btn-sm tg-btn-cyan" data-preset="bluff_trap">${lang === 'zh' ? '吴贤旻诈唬阵' : 'Bluff Trap'}</button>
                      <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-preset="random">${lang === 'zh' ? '随机洗牌' : 'Randomize'}</button>
                    </div>
                  </div>

                  <div class="bbw-setup-grid">
                    ${draftTiles
                      .map((tile, idx) => {
                        const col = getTileColor(tile);
                        const c = draftChips[idx];
                        const isSel = swapSelectedIdx === idx;
                        const discs = Math.min(7, c);
                        return `
                          <div class="bbw-setup-col ${isSel ? 'is-swap-selected' : ''}">
                            <span class="bbw-slot-idx">#${idx + 1}</span>
                            <button type="button" class="bbw-setup-tile is-${col}" data-swap-idx="${idx}" title="${lang === 'zh' ? '点击互换位置' : 'Click to swap'}">
                              <span class="bbw-setup-num">${tile}</span>
                              <span style="font-family:var(--tg-font-mono);font-size:9px;opacity:0.75;">${colorShort(col, lang)}</span>
                            </button>
                            <div class="bbw-chip-ctrl">
                              <div class="bbw-chip-stack-vis">
                                ${Array.from({ length: discs }, () => `<span class="bbw-chip-disc ${c >= 5 ? 'is-gold' : ''}"></span>`).join('')}
                              </div>
                              <div class="bbw-chip-btns">
                                <button type="button" class="bbw-mini-btn" data-chip-dec="${idx}" ${c <= 1 ? 'disabled' : ''}>−</button>
                                <span class="bbw-chip-count">${c}</span>
                                <button type="button" class="bbw-mini-btn" data-chip-inc="${idx}" ${chipRem <= 0 ? 'disabled' : ''}>+</button>
                              </div>
                            </div>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>

                  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--tg-border-subtle);">
                    <div style="display:flex;align-items:center;gap:10px;font-family:var(--tg-font-mono);font-size:13px;">
                      <span class="bbw-bank-chip-pill ${chipRem === 0 ? 'is-gold' : ''}">
                        ${lang === 'zh' ? `已分配 ${chipSum} / ${TOTAL_CHIPS}` : `ALLOCATED ${chipSum} / ${TOTAL_CHIPS}`}
                      </span>
                      <span style="color:${chipRem === 0 ? 'var(--tg-emerald)' : 'var(--tg-amber)'};">
                        ${
                          chipRem === 0
                            ? (lang === 'zh' ? '✓ 筹码就绪，可锁定阵型' : '✓ Ready to lock formation')
                            : chipRem > 0
                            ? (lang === 'zh' ? `还需分配 ${chipRem} 枚筹码` : `${chipRem} chip(s) left to place`)
                            : (lang === 'zh' ? `超出 ${-chipRem} 枚筹码` : `${-chipRem} over budget`)
                        }
                      </span>
                    </div>
                    <button type="button" class="tg-btn tg-btn-garnet" id="bbw-lock-setup" style="min-width:210px;min-height:44px;" ${!canLock ? 'disabled' : ''}>
                      ${lang === 'zh' ? '锁定阵型 · 准备撤屏 →' : 'Lock Formation →'}
                    </button>
                  </div>
                `
            }
          </section>
        </div>
      `;

      // Bind setup interactions
      container.querySelectorAll('[data-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          sfx.play('chipStack');
          applyPreset(btn.dataset.preset);
          renderStage(container, ctx);
        });
      });

      container.querySelectorAll('[data-swap-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.swapIdx);
          if (swapSelectedIdx === null) {
            sfx.play('click');
            swapSelectedIdx = idx;
          } else if (swapSelectedIdx === idx) {
            sfx.play('click');
            swapSelectedIdx = null;
          } else {
            sfx.play('tilePlace');
            const tmp = draftTiles[swapSelectedIdx];
            draftTiles[swapSelectedIdx] = draftTiles[idx];
            draftTiles[idx] = tmp;
            swapSelectedIdx = null;
          }
          renderStage(container, ctx);
        });
      });

      container.querySelectorAll('[data-chip-dec]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.chipDec);
          if (draftChips[idx] > 1) {
            sfx.play('click');
            draftChips[idx] -= 1;
            renderStage(container, ctx);
          }
        });
      });

      container.querySelectorAll('[data-chip-inc]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.chipInc);
          const sum = draftChips.reduce((a, b) => a + b, 0);
          if (sum < TOTAL_CHIPS) {
            sfx.play('bid');
            draftChips[idx] += 1;
            renderStage(container, ctx);
          }
        });
      });

      container.querySelector('#bbw-lock-setup')?.addEventListener('click', () => {
        if (!canLock) return;
        sfx.play('tilePlace');
        dispatch({
          type: 'LOCK_SETUP',
          payload: { tiles: draftTiles.slice(), chips: draftChips.slice() },
        });
      });
      return;
    }

    // ---- RENDER BATTLE PHASE (PARTITION DROPPED: 10-COLUMN SKYLINES + CLASH) ----
    const slotIdx = Math.max(0, Math.min(TOTAL_SLOTS - 1, state.currentSlotIdx));
    const clash = state.currentClash || {};
    const mySlot = me.slots?.[slotIdx];
    const oppSlot = opp.slots?.[slotIdx];

    const isClashDecision = state.phase === 'clash_decision';
    const isEqualShowdown = state.phase === 'equal_showdown';
    const isRoundResult = state.phase === 'round_result';
    const isFinished = state.phase === 'finished';

    const isMyDecision = !isSpectator && isClashDecision && state.currentTurnSeatId === viewerId;

    // Initialize default borrow draft when entering a new decision for me
    const bKey = `${state.round}-${state.phase}-${viewerId}`;
    if (bKey !== borrowDraftKey) {
      borrowDraftKey = bKey;
      showCustomBorrow = false;
      if (isMyDecision && clash.canCall) {
        const auto = buildAutoBorrowPlan(me, slotIdx, clash.deficit, false);
        borrowFromReserve = auto.fromReserve;
        borrowFromSlots = { ...auto.fromSlots };
      } else {
        borrowFromReserve = 0;
        borrowFromSlots = {};
      }
    }

    const totalRemainingOnTable = (p) =>
      (p.slots || []).reduce((acc, s) => acc + (s.status === 'pending' ? s.chips : 0), 0);

    const renderSkyline = (player, isMine) => `
      <section class="bbw-skyline-panel">
        <div class="bbw-skyline-head">
          <span>
            <strong style="color:${isMine ? 'var(--tg-gold-bright)' : '#ff8598'};">${UI.escapeHtml(player.name)}</strong>
            ${isMine && !isSpectator ? (lang === 'zh' ? ' · 你的 10 轮阵型（数字仅你可见）' : ' · YOUR 10-SLOT SKYLINE (PRIVATE NUMERALS)') : (lang === 'zh' ? ' · 对手 10 轮阵型（仅公开颜色与筹码）' : ' · RIVAL SKYLINE (COLORS & CHIPS PUBLIC)')}
          </span>
          <span style="font-family:var(--tg-font-mono);font-size:11.5px;">
            ${lang === 'zh' ? '储备库' : 'Reserve'}: <strong style="color:var(--tg-gold-bright);">${player.reserve}</strong> ·
            ${lang === 'zh' ? '待赛筹码' : 'On Board'}: ${totalRemainingOnTable(player)}
          </span>
        </div>
        <div class="bbw-skyline-grid">
          ${(player.slots || [])
            .map((sl) => {
              const isCurr = sl.slotIdx === slotIdx && !isFinished;
              const isRes = sl.status === 'resolved';
              const winCls = sl.outcome === 'win' ? 'is-won' : (sl.outcome === 'loss' || sl.outcome === 'fold') ? 'is-lost' : '';
              const showNum = sl.tile !== null && sl.tile !== undefined;
              const wasBorrowed = sl.chips < sl.initialChips;
              return `
                <div class="bbw-monolith-col ${isCurr ? 'is-active-slot' : ''} ${isRes ? 'is-resolved' : ''} ${winCls}">
                  <span class="bbw-slot-idx">#${sl.slotIdx + 1}</span>
                  <div class="bbw-pillar is-${sl.color}">
                    <span>${showNum ? sl.tile : '?'}</span>
                    <span style="font-family:var(--tg-font-mono);font-size:8.5px;opacity:0.7;">${colorShort(sl.color, lang)}</span>
                  </div>
                  <span class="bbw-pillar-chips ${wasBorrowed ? 'is-borrowed' : ''}" title="${wasBorrowed ? `Init ${sl.initialChips} -> ${sl.chips}` : ''}">
                    ${sl.chips}
                  </span>
                </div>
              `;
            })
            .join('')}
        </div>
      </section>
    `;

    const res = clash.resolution;
    const myWonClash = res && res.winnerSeatId === viewerId;
    const oppWonClash = res && res.winnerSeatId === oppId;

    const myBorrowSum =
      borrowFromReserve + Object.values(borrowFromSlots).reduce((a, b) => a + Number(b || 0), 0);
    const borrowValid = isMyDecision && clash.canCall && myBorrowSum === clash.deficit;

    container.innerHTML = `
      <div class="bbw-arena">
        <!-- 1. Reserve Bank Score Header -->
        <section class="bbw-header-bar">
          <div class="bbw-bank-side">
            <strong>${UI.escapeHtml(me.name)}</strong>
            <span class="bbw-bank-chip-pill is-gold">
              ${lang === 'zh' ? '储备库' : 'RESERVE'}: ${me.reserve}
            </span>
          </div>
          <div style="text-align:center;">
            <div style="font-family:var(--tg-font-display);font-size:17px;font-weight:800;color:var(--tg-gold-bright);">
              ${lang === 'zh' ? `第 ${state.round} / ${TOTAL_SLOTS} 槽位对决` : `SLOT #${state.round} / ${TOTAL_SLOTS}`}
            </div>
            <span class="tg-badge tg-badge-garnet">${UI.escapeHtml(I18n.t(state.phaseLabel))}</span>
          </div>
          <div class="bbw-bank-side is-right">
            <span class="bbw-bank-chip-pill">
              ${lang === 'zh' ? '储备库' : 'RESERVE'}: ${opp.reserve}
            </span>
            <strong>${UI.escapeHtml(opp.name)}</strong>
          </div>
        </section>

        <!-- 2. Opponent's 10-Column Skyline -->
        ${renderSkyline(opp, false)}

        <!-- 3. Central Clash Arena -->
        <section class="bbw-clash-stage">
          <div class="bbw-clash-duel">
            <div class="bbw-duel-card-wrap">
              <span style="font-size:12px;font-weight:700;color:var(--tg-gold-bright);">${UI.escapeHtml(me.name)} · #${slotIdx + 1}</span>
              <div class="bbw-duel-tile is-${mySlot.color} ${myWonClash ? 'is-winner' : ''}">
                <span class="bbw-duel-num">${mySlot.tile !== null ? mySlot.tile : '?'}</span>
                <span style="font-family:var(--tg-font-mono);font-size:10px;opacity:0.78;">${colorShort(mySlot.color, lang)}</span>
              </div>
              <span class="bbw-bank-chip-pill is-gold">${mySlot.chips} ${lang === 'zh' ? '筹码' : 'CHIPS'}</span>
            </div>

            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;min-width:210px;">
              ${
                isEqualShowdown
                  ? `
                    <span class="tg-badge tg-badge-gold">${lang === 'zh' ? '双方筹码相同 · 强制摊牌' : 'EQUAL CHIPS · SHOWDOWN'}</span>
                    <div style="font-size:13px;color:var(--tg-ink-muted);">
                      ${lang === 'zh' ? `底池 ${clash.higherChips * 2} 枚筹码，双方立即亮出数字比大小！` : `Pot ${clash.higherChips * 2} chips — flip both numerals!`}
                    </div>
                    ${
                      !isSpectator
                        ? `<button type="button" class="tg-btn tg-btn-garnet" id="bbw-reveal-equal" style="min-width:170px;">
                            ${lang === 'zh' ? '开牌摊牌 →' : 'Reveal Showdown →'}
                          </button>`
                        : ''
                    }
                  `
                  : isClashDecision
                  ? isMyDecision
                    ? `
                      <span class="tg-badge tg-badge-garnet">
                        ${lang === 'zh' ? `你的筹码较少 · 需补齐 +${clash.deficit} 枚` : `LOWER BET · NEED +${clash.deficit} TO CALL`}
                      </span>
                      <div style="font-size:12.5px;color:var(--tg-ink-muted);">
                        ${
                          clash.canCall
                            ? lang === 'zh'
                              ? `跟注争夺 ${clash.higherChips * 2} 筹码底池，或弃牌隐藏己方数字`
                              : `Call for ${clash.higherChips * 2}-chip pot, or Fold to keep your numeral secret`
                            : lang === 'zh'
                            ? '可借调筹码不足以补齐差额，只能选择弃牌'
                            : 'Insufficient reserve/future surplus to call — must Fold'
                        }
                      </div>
                      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
                        <button type="button" class="tg-btn tg-btn-ghost" id="bbw-fold" style="min-width:115px;">
                          ${lang === 'zh' ? '弃牌 FOLD' : 'FOLD'}
                        </button>
                        <button type="button" class="tg-btn tg-btn-gold" id="bbw-call" style="min-width:145px;" ${!borrowValid ? 'disabled' : ''}>
                          ${lang === 'zh' ? `借调跟注 (+${clash.deficit})` : `CALL (+${clash.deficit})`}
                        </button>
                      </div>
                      ${
                        clash.canCall
                          ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="bbw-toggle-borrow">
                              ${showCustomBorrow ? (lang === 'zh' ? '收起借调方案 ▲' : 'Hide Borrow Plan ▲') : (lang === 'zh' ? '自定义从哪格借调筹码 ▼' : 'Customize Borrow Sources ▼')}
                            </button>`
                          : ''
                      }
                    `
                    : `
                      <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? '对手决策中' : 'RIVAL DECIDING'}</span>
                      <div style="font-size:13px;color:var(--tg-ink-muted);">
                        ${lang === 'zh' ? `${UI.escapeHtml(opp.name)} 筹码少 ${clash.deficit} 枚，正在决定是否借调跟注或弃牌...` : `${UI.escapeHtml(opp.name)} is short by ${clash.deficit} — deciding to Call or Fold...`}
                      </div>
                    `
                  : isRoundResult && res
                  ? `
                    <span class="tg-badge ${res.isDraw ? 'tg-badge-cyan' : myWonClash ? 'tg-badge-gold' : 'tg-badge-garnet'}">
                      ${
                        res.type === 'fold'
                          ? (lang === 'zh' ? '弃牌结算 · 数字保密' : 'FOLDED · TILES HIDDEN')
                          : res.isDraw
                          ? (lang === 'zh' ? '摊牌平局 · 退还筹码' : 'SHOWDOWN DRAW')
                          : myWonClash
                          ? (lang === 'zh' ? `你赢下 +${res.pot} 枚筹码！` : `YOU WON +${res.pot} CHIPS!`)
                          : (lang === 'zh' ? `${UI.escapeHtml(opp.name)} 赢走 ${res.pot} 枚` : `${UI.escapeHtml(opp.name)} WON ${res.pot}`)
                      }
                    </span>
                    ${
                      !isSpectator
                        ? `<button type="button" class="tg-btn tg-btn-gold" id="bbw-next-round" style="min-width:150px;">
                            ${lang === 'zh' ? `进入第 ${state.round + 1} 槽位 →` : `Next Slot #${state.round + 1} →`}
                          </button>`
                        : ''
                    }
                  `
                  : `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '10 轮终局' : 'ALL 10 SLOTS COMPLETE'}</span>`
              }
            </div>

            <div class="bbw-duel-card-wrap">
              <span style="font-size:12px;font-weight:700;color:#ff8598;">${UI.escapeHtml(opp.name)} · #${slotIdx + 1}</span>
              <div class="bbw-duel-tile is-${oppSlot.color} ${oppWonClash ? 'is-winner' : ''}">
                <span class="bbw-duel-num">${oppSlot.tile !== null ? oppSlot.tile : '?'}</span>
                <span style="font-family:var(--tg-font-mono);font-size:10px;opacity:0.78;">${colorShort(oppSlot.color, lang)}</span>
              </div>
              <span class="bbw-bank-chip-pill">${oppSlot.chips} ${lang === 'zh' ? '筹码' : 'CHIPS'}</span>
            </div>
          </div>

          ${
            isMyDecision && clash.canCall && showCustomBorrow
              ? `
                <div class="bbw-borrow-drawer">
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
                    <strong style="color:var(--tg-gold-bright);">
                      ${lang === 'zh' ? `借调分配器（已选 ${myBorrowSum} / 需补齐 ${clash.deficit} 枚）` : `BORROW PLANNER (${myBorrowSum} / ${clash.deficit} NEEDED)`}
                    </strong>
                    <span style="color:${borrowValid ? 'var(--tg-emerald)' : 'var(--tg-amber)'};font-family:var(--tg-font-mono);">
                      ${borrowValid ? '✓ OK' : (lang === 'zh' ? `差 ${clash.deficit - myBorrowSum}` : `Diff ${clash.deficit - myBorrowSum}`)}
                    </span>
                  </div>
                  <div class="bbw-borrow-sources">
                    <div class="bbw-borrow-item">
                      <span>${lang === 'zh' ? '储备库' : 'Reserve'} (${me.reserve}):</span>
                      <button type="button" class="bbw-mini-btn" data-br-res="-1" ${borrowFromReserve <= 0 ? 'disabled' : ''}>−</button>
                      <strong style="color:var(--tg-gold-bright);min-width:18px;text-align:center;">${borrowFromReserve}</strong>
                      <button type="button" class="bbw-mini-btn" data-br-res="1" ${borrowFromReserve >= me.reserve || myBorrowSum >= clash.deficit ? 'disabled' : ''}>+</button>
                    </div>
                    ${me.slots
                      .filter((s) => s.slotIdx > slotIdx && s.chips > 1)
                      .map((s) => {
                        const used = Number(borrowFromSlots[s.slotIdx] || 0);
                        const maxTake = s.chips - 1;
                        return `
                          <div class="bbw-borrow-item">
                            <span>#${s.slotIdx + 1} [${s.tile}] (max ${maxTake}):</span>
                            <button type="button" class="bbw-mini-btn" data-br-slot="${s.slotIdx}" data-delta="-1" ${used <= 0 ? 'disabled' : ''}>−</button>
                            <strong style="color:var(--tg-gold-bright);min-width:18px;text-align:center;">${used}</strong>
                            <button type="button" class="bbw-mini-btn" data-br-slot="${s.slotIdx}" data-delta="1" ${used >= maxTake || myBorrowSum >= clash.deficit ? 'disabled' : ''}>+</button>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                </div>
              `
              : ''
          }
        </section>

        <!-- 4. Your 10-Column Skyline -->
        ${renderSkyline(me, true)}
      </div>
    `;

    // Bind Battle Phase actions
    container.querySelector('#bbw-reveal-equal')?.addEventListener('click', () => {
      sfx.play('cardFlip');
      dispatch({ type: 'REVEAL_SHOWDOWN' });
    });

    container.querySelector('#bbw-fold')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'FOLD' });
    });

    container.querySelector('#bbw-call')?.addEventListener('click', () => {
      if (!borrowValid) return;
      sfx.play('chipStack');
      dispatch({
        type: 'CALL',
        payload: { fromReserve: borrowFromReserve, fromSlots: { ...borrowFromSlots } },
      });
    });

    container.querySelector('#bbw-toggle-borrow')?.addEventListener('click', () => {
      sfx.play('click');
      showCustomBorrow = !showCustomBorrow;
      renderStage(container, ctx);
    });

    container.querySelectorAll('[data-br-res]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = Number(btn.dataset.brRes);
        borrowFromReserve = Math.max(0, Math.min(me.reserve, borrowFromReserve + d));
        sfx.play('click');
        renderStage(container, ctx);
      });
    });

    container.querySelectorAll('[data-br-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.dataset.brSlot);
        const d = Number(btn.dataset.delta);
        const maxTake = Math.max(0, me.slots[sIdx].chips - 1);
        const cur = Number(borrowFromSlots[sIdx] || 0);
        const nextVal = Math.max(0, Math.min(maxTake, cur + d));
        if (nextVal === 0) delete borrowFromSlots[sIdx];
        else borrowFromSlots[sIdx] = nextVal;
        sfx.play('click');
        renderStage(container, ctx);
      });
    });

    container.querySelector('#bbw-next-round')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_ROUND' });
    });
}

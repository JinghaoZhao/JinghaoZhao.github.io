/**
 * Same Picture Hunt (寻找相同图片) — Persistent 4×4 3D Flip-Wall & FLIP Conveyor Belts
 * Zero innerHTML nukes: genuine 3D card flips, GPU runner glide, FLIP belt queue shift.
 */

import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import { GameRules, EMBLEMS, BELT_LENGTH, LETTERS } from './rules.js';

const EMBLEM_MAP = Object.fromEntries(EMBLEMS.map((e) => [e.id, e]));

/** 16 high-contrast iconic SVG emblems (legible in both Dark & Light studio themes) */
function renderEmblemSvg(iconId, className = 'sph-emblem-svg') {
  const emb = EMBLEM_MAP[iconId];
  const c = emb?.color || '#b88218';
  const strokeMain = 'rgba(20,22,31,0.38)';
  const paths = {
    crown: `<path d="M10 46h44l4-26-14 11-12-17-12 17-14-11 4 26z" fill="${c}" stroke="${strokeMain}" stroke-width="2.2" stroke-linejoin="round"/><rect x="12" y="49" width="40" height="6" rx="2" fill="#e4b95b"/>`,
    garnet: `<polygon points="32,6 54,22 45,56 19,56 10,22" fill="${c}" stroke="#ff9eb0" stroke-width="2.2" stroke-linejoin="round"/><polygon points="32,14 44,24 38,48 26,48 20,24" fill="rgba(255,255,255,0.28)"/>`,
    hourglass: `<path d="M16 10h32v6c0 9-10 14-16 16 6 2 16 7 16 16v6H16v-6c0-9 10-14 16-16-6-2-16-7-16-16v-6z" fill="none" stroke="${c}" stroke-width="4.2" stroke-linejoin="round"/><path d="M22 16h20l-10 11zM22 49h20l-10-11z" fill="${c}"/>`,
    scales: `<line x1="32" y1="10" x2="32" y2="54" stroke="${c}" stroke-width="3.6"/><line x1="12" y1="20" x2="52" y2="20" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M12 20l-6 16h12zM52 20l-6 16h12z" fill="${c}" stroke="${strokeMain}" stroke-width="1.6"/><rect x="20" y="51" width="24" height="5" rx="2" fill="${c}"/>`,
    raven: `<path d="M12 46c6-18 14-28 28-32l12 4-7 6c1 10-5 20-16 26l-17 4z" fill="${c}" stroke="${strokeMain}" stroke-width="2" stroke-linejoin="round"/><circle cx="38" cy="22" r="3" fill="#0c0e16"/><path d="M18 42l14-14" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
    diamond: `<polygon points="32,8 56,26 32,56 8,26" fill="${c}" stroke="${strokeMain}" stroke-width="2.2" stroke-linejoin="round"/><polyline points="8,26 56,26" stroke="#fff" stroke-width="2"/><polyline points="22,8 32,26 42,8" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>`,
    key: `<circle cx="22" cy="24" r="11" fill="none" stroke="${c}" stroke-width="5"/><circle cx="22" cy="24" r="4" fill="${c}" opacity="0.55"/><path d="M31 31l21 21m-8-8l7-7m-2 12l6-6" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
    lotus: `<path d="M32 10c7 10 9 20 0 32-9-12-7-22 0-32z" fill="${c}" stroke="${strokeMain}" stroke-width="1.8"/><path d="M32 42c-12-2-20-10-22-22 10 3 18 10 22 22zM32 42c12-2 20-10 22-22-10 3-18 10-22 22z" fill="${c}" opacity="0.82" stroke="${strokeMain}" stroke-width="1.8"/><rect x="16" y="46" width="32" height="5" rx="2.5" fill="${c}"/>`,
    sun: `<circle cx="32" cy="32" r="13" fill="${c}" stroke="${strokeMain}" stroke-width="2"/><g stroke="${c}" stroke-width="4" stroke-linecap="round"><line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/><line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/><line x1="13" y1="13" x2="19" y2="19"/><line x1="45" y1="45" x2="51" y2="51"/><line x1="51" y1="13" x2="45" y2="19"/><line x1="19" y1="45" x2="13" y2="51"/></g>`,
    moon: `<path d="M44 12a22 22 0 1 0 8 36 17 17 0 1 1-8-36z" fill="${c}" stroke="${strokeMain}" stroke-width="2" stroke-linejoin="round"/><circle cx="44" cy="24" r="3.5" fill="#e4b95b"/>`,
    compass: `<circle cx="32" cy="32" r="22" fill="none" stroke="${c}" stroke-width="3.6"/><polygon points="32,12 39,32 32,37 25,32" fill="#d91b3a"/><polygon points="32,52 39,32 32,27 25,32" fill="${c}"/><circle cx="32" cy="32" r="3.5" fill="#fff"/>`,
    shield: `<path d="M32 8l20 8v16c0 13-9 21-20 25-11-4-20-12-20-25V16l20-8z" fill="${c}" stroke="${strokeMain}" stroke-width="2.2" stroke-linejoin="round"/><path d="M32 16v32M20 26h24" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    flame: `<path d="M34 8c8 10 16 18 16 30a18 18 0 0 1-36 0c0-8 5-15 10-20 0 6 3 9 6 10-1-7 1-14 4-20z" fill="${c}" stroke="${strokeMain}" stroke-width="2" stroke-linejoin="round"/><path d="M32 30c5 5 7 9 7 14a7 7 0 0 1-14 0c0-5 3-9 7-14z" fill="#fef08a"/>`,
    eye: `<path d="M6 32c7-12 16-18 26-18s19 6 26 18c-7 12-16 18-26 18S13 44 6 32z" fill="rgba(167,139,250,0.22)" stroke="${c}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="32" cy="32" r="10" fill="${c}"/><circle cx="32" cy="32" r="4.5" fill="#090b12"/><circle cx="35" cy="29" r="2" fill="#fff"/>`,
    bolt: `<polygon points="36,6 14,35 30,35 25,58 50,27 34,27" fill="${c}" stroke="${strokeMain}" stroke-width="2.2" stroke-linejoin="round"/>`,
    anchor: `<circle cx="32" cy="14" r="6" fill="none" stroke="${c}" stroke-width="3.5"/><line x1="32" y1="20" x2="32" y2="54" stroke="${c}" stroke-width="4"/><line x1="20" y1="28" x2="44" y2="28" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><path d="M14 38c0 10 8 16 18 16s18-6 18-16" fill="none" stroke="${c}" stroke-width="4.2" stroke-linecap="round"/>`,
  };
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">${paths[iconId] || ''}</svg>`;
}

let lastEventSig = null;
let latestCtx = null;
let refs = null;
let prevMetrics = { discovered: 0, pos: {}, bestStreak: {} };
let tileClearTimers = new Map();

function mountSkeleton(container) {
  const tilesHtml = LETTERS.map(
    (letter, idx) => `
      <button type="button" class="sph-tile-slot" data-flip-idx="${idx}" aria-label="Tile ${letter}">
        <div class="sph-tile-inner">
          <div class="sph-tile-face sph-tile-front">
            <span class="sph-tile-letter">${letter}</span>
            <span class="sph-tile-sub">PANEL</span>
          </div>
          <div class="sph-tile-face sph-tile-back">
            <span class="sph-tile-badge-corner">${letter}</span>
            <div class="sph-tile-svg-slot" style="width:100%;display:flex;justify-content:center;"></div>
            <span class="sph-tile-emblem-name"></span>
          </div>
        </div>
      </button>
    `
  ).join('');

  const beltSkeleton = (i) => `
    <div class="sph-belt-card" id="sph-belt-card-${i}">
      <div class="sph-belt-header">
        <div class="sph-belt-name" id="sph-bname-${i}">
          <span id="sph-bavatar-${i}"></span>
          <span id="sph-btext-${i}"></span>
          <span class="tg-badge tg-badge-gold" id="sph-bstreak-${i}" hidden></span>
        </div>
        <div class="sph-belt-metrics">
          <span class="tg-badge" id="sph-bpos-badge-${i}">
            <span id="sph-bpos-lbl-${i}"></span>
            <span id="sph-bpos-num-${i}">10</span>/20
          </span>
          <span style="color:var(--tg-ink-faint);">
            <span id="sph-bmax-lbl-${i}"></span>
            <span id="sph-bmax-num-${i}">0</span>
          </span>
        </div>
      </div>

      <div class="sph-track-wrap">
        <div class="sph-track-ends">
          <span style="color:var(--tg-garnet-ink);" id="sph-abyss-lbl-${i}"></span>
          <span style="color:var(--tg-gold-bright);" id="sph-finish-lbl-${i}"></span>
        </div>
        <div class="sph-track-stage">
          <div class="sph-track-slots" id="sph-slots-${i}">
            ${Array.from({ length: BELT_LENGTH }, (_, idx) => {
              const slotNum = idx + 1;
              const cls = ['sph-track-cell'];
              if (slotNum <= 3) cls.push('is-danger');
              if (slotNum === BELT_LENGTH) cls.push('is-finish');
              return `<div class="${cls.join(' ')}" data-slot="${slotNum}" title="Slot ${slotNum}">${
                slotNum === BELT_LENGTH ? '★' : ''
              }</div>`;
            }).join('')}
          </div>
          <div class="sph-runner-marker ${i === 0 ? 'is-cyan' : 'is-garnet'}" id="sph-runner-${i}">▶</div>
        </div>
      </div>

      <div class="sph-upcoming-label" id="sph-up-lbl-${i}"></div>
      <div class="sph-upcoming-strip" id="sph-up-strip-${i}"></div>
    </div>
  `;

  container.innerHTML = `
    <div class="sph-arena">
      <div class="sph-spotlight" id="sph-spotlight">
        <div class="sph-target-box">
          <div class="sph-target-frame" id="sph-target-frame"></div>
          <div class="sph-target-meta">
            <span class="sph-target-kicker" id="sph-target-kicker"></span>
            <span class="sph-target-name" id="sph-target-name"></span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span class="sph-combo-pill" id="sph-combo-pill" hidden></span>
          <span class="tg-badge tg-badge-cyan">
            <span id="sph-mapped-lbl"></span>
            <span id="sph-mapped-num">0</span>/16
          </span>
        </div>
      </div>

      <div class="sph-main">
        <div class="sph-wall-panel" id="sph-wall-panel">
          <div class="sph-wall-grid" id="sph-wall-grid">${tilesHtml}</div>
          <div class="sph-reveal-bar" id="sph-reveal-bar" hidden>
            <span id="sph-reveal-msg"></span>
            <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="sph-continue-btn"></button>
          </div>
        </div>

        <div class="sph-belts-col">
          ${beltSkeleton(0)}
          ${beltSkeleton(1)}
        </div>
      </div>
    </div>
  `;

  const wallGrid = container.querySelector('#sph-wall-grid');
  wallGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-flip-idx]');
    if (!btn || btn.disabled || !latestCtx) return;
    latestCtx.dispatch({ type: 'FLIP_TILE', payload: { tileIdx: Number(btn.dataset.flipIdx) } });
  });

  container.querySelector('#sph-continue-btn').addEventListener('click', () => {
    SFX.play('click');
    latestCtx?.dispatch({ type: 'CONTINUE_REVEAL' });
  });

  container.dataset.mounted = 'sph';
  refs = {
    spotlight: container.querySelector('#sph-spotlight'),
    targetFrame: container.querySelector('#sph-target-frame'),
    targetKicker: container.querySelector('#sph-target-kicker'),
    targetName: container.querySelector('#sph-target-name'),
    comboPill: container.querySelector('#sph-combo-pill'),
    mappedLbl: container.querySelector('#sph-mapped-lbl'),
    mappedNum: container.querySelector('#sph-mapped-num'),
    wallPanel: container.querySelector('#sph-wall-panel'),
    tiles: Array.from(wallGrid.querySelectorAll('.sph-tile-slot')).map((btn) => ({
      btn,
      svgSlot: btn.querySelector('.sph-tile-svg-slot'),
      nameEl: btn.querySelector('.sph-tile-emblem-name'),
      lastIconId: null,
      wasRevealed: false,
    })),
    revealBar: container.querySelector('#sph-reveal-bar'),
    revealMsg: container.querySelector('#sph-reveal-msg'),
    continueBtn: container.querySelector('#sph-continue-btn'),
    belts: [0, 1].map((i) => ({
      card: container.querySelector(`#sph-belt-card-${i}`),
      nameWrap: container.querySelector(`#sph-bname-${i}`),
      avatar: container.querySelector(`#sph-bavatar-${i}`),
      nameText: container.querySelector(`#sph-btext-${i}`),
      streakBadge: container.querySelector(`#sph-bstreak-${i}`),
      posBadge: container.querySelector(`#sph-bpos-badge-${i}`),
      posLbl: container.querySelector(`#sph-bpos-lbl-${i}`),
      posNum: container.querySelector(`#sph-bpos-num-${i}`),
      maxLbl: container.querySelector(`#sph-bmax-lbl-${i}`),
      maxNum: container.querySelector(`#sph-bmax-num-${i}`),
      abyssLbl: container.querySelector(`#sph-abyss-lbl-${i}`),
      finishLbl: container.querySelector(`#sph-finish-lbl-${i}`),
      slots: Array.from(container.querySelectorAll(`#sph-slots-${i} .sph-track-cell`)),
      runner: container.querySelector(`#sph-runner-${i}`),
      upLbl: container.querySelector(`#sph-up-lbl-${i}`),
      upStrip: container.querySelector(`#sph-up-strip-${i}`),
      lastQueueKey: '',
    })),
    lastTargetIcon: null,
    revealShown: false,
  };
  prevMetrics = { discovered: 0, pos: {}, bestStreak: {} };
  tileClearTimers.forEach((t) => clearTimeout(t));
  tileClearTimers.clear();
}

mountGame({
  config: {
    id: 'same-picture-hunt',
    title: { zh: '寻找相同图片', en: 'Same Picture Hunt', ko: '같은 그림 찾기' },
    seasons: ['S1E11', 'S2E8', 'S4E7'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'handicapMode',
        label: { zh: 'S1/S2 让格模式 (10 vs 8)', en: 'S1/S2 Handicap (10 vs 8)' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 死亡对决目标
面对共享的 **4×4 (A–P) 16 块翻转板** 与各自脚下的 **20 格机械传送带**，匹配眼前图案以冲向终点！

### 规则与连击机制
- 双方默认从 **第 10 格** 出发（距离终点 10 步，距离深渊悬崖 10 步）。
- 轮到你时，查看你传送带**下一格的目标图案**，点击共享翻板上的任意字母 **A–P** 翻开（公开展示 2 秒后合上）。
- **猜中（MATCH）**：前进 **+1 格**，并立刻获得**连翻机会**（无限连击！）率先踏上 **第 20 格终点线** 立即获胜！
- **猜错（MISS）**：传送带**倒退 1 格**，连击清零并换对方行动。一旦退至 **第 0 格跌落深渊** 立即淘汰！`,
      en: `### Objective
Race to **Finish Slot 20** on your 20-slot conveyor belt by locating matching icons behind a shared **4×4 (A–P)** hidden flip wall!

### Turns & Combo Streaks
- Both players start at **Slot 10** (10 steps to Finish 20; 10 misses to fall off behind Slot 1).
- On your turn, inspect the **NEXT emblem** ahead of your runner on your conveyor belt, then flip any panel **A–P** (publicly visible to both players for 2 seconds).
- **MATCH**: Advance **+1 slot**, ignite your **Combo Multiplier**, and immediately **KEEP YOUR TURN**! Reach Slot 20 to WIN!
- **MISS**: Your belt slides **-1 slot** toward the rear abyss and your turn ends. Falling to Slot 0 = instant elimination!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    latestCtx = ctx;
    const { state, activeSeatId, isSpectator, lang, lastEvent, log } = ctx;
    if (!state) return;

    if (container.dataset.mounted !== 'sph' || !refs || !container.contains(refs.wallPanel)) {
      mountSkeleton(container);
    }

    const activePlayer = state.players[state.currentTurnSeatId];
    const targetEmb = EMBLEM_MAP[activePlayer.targetIconId];
    const isMyTurn =
      !isSpectator && state.phase === 'PICK_TILE' && state.currentTurnSeatId === activeSeatId;
    const rev = state.activeReveal;

    // Event cues & Motion feedback
    const sig = `${state.flipCount}-${state.phase}-${lastEvent?.type || ''}`;
    if (sig !== lastEventSig && lastEvent) {
      lastEventSig = sig;
      if (lastEvent.type === 'TILE_MATCH') {
        SFX.play('cardFlip');
        if (lastEvent.streak >= 2) SFX.play('combo');
        else SFX.play('garnetClink');
        Motion.pulseConfirm(refs.targetFrame, { tone: 'emerald' });
        const hitTile = refs.tiles[lastEvent.tileIdx]?.btn;
        if (hitTile) Motion.pulseConfirm(hitTile, { tone: 'emerald' });
        const pName = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `✨ ${pName} 翻开 [${lastEvent.letter}] 配对成功（${lastEvent.streak} 连击）`
            : `✨ ${pName} flipped [${lastEvent.letter}] — MATCH (${lastEvent.streak}x streak)`,
          'system'
        );
      } else if (lastEvent.type === 'TILE_MISS') {
        SFX.play('cardFlip');
        SFX.play('error');
        Motion.nudgeError(refs.wallPanel, { intensity: 'subtle' });
        const pName = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `✖ ${pName} 翻开 [${lastEvent.letter}] 未配对，传送带后退 1 格。`
            : `✖ ${pName} flipped [${lastEvent.letter}] — MISS, belt slides back 1 slot.`,
          'alert'
        );
      } else if (lastEvent.type === 'FINISH_WIN') {
        SFX.play('victory');
        Motion.pulseConfirm(refs.spotlight, { tone: 'gold' });
      } else if (lastEvent.type === 'ABYSS_LOSS') {
        SFX.play('eliminate');
        Motion.nudgeError(refs.wallPanel, { intensity: 'impact' });
      }
    }

    // 1. Spotlight Header (crossfade target icon only when target changes)
    if (refs.lastTargetIcon !== activePlayer.targetIconId) {
      refs.lastTargetIcon = activePlayer.targetIconId;
      Motion.crossfade(
        refs.targetFrame,
        () => {
          refs.targetFrame.innerHTML = renderEmblemSvg(activePlayer.targetIconId, 'sph-emblem-svg');
        },
        { duration: 150, shiftPx: 3 }
      );
    }

    refs.targetKicker.textContent = isMyTurn
      ? lang === 'zh'
        ? `你的目标图案 · 传送带第 ${Math.min(20, activePlayer.pos + 1)} 格`
        : `YOUR TARGET · CONVEYOR SLOT #${Math.min(20, activePlayer.pos + 1)}`
      : lang === 'zh'
      ? `${activePlayer.name} 正在寻找目标`
      : `${activePlayer.name} IS HUNTING`;

    refs.targetName.textContent = targetEmb
      ? lang === 'zh'
        ? `${targetEmb.zh} (${targetEmb.en})`
        : targetEmb.en
      : '';

    if (activePlayer.streak >= 1) {
      refs.comboPill.hidden = false;
      refs.comboPill.textContent = `🔥 ${activePlayer.streak}x ${lang === 'zh' ? '连击中' : 'STREAK'}`;
    } else {
      refs.comboPill.hidden = true;
    }

    refs.mappedLbl.textContent = lang === 'zh' ? '已翻面板 ' : 'MAPPED ';
    if (prevMetrics.discovered !== state.discoveredCount) {
      Motion.animateNumber(refs.mappedNum, prevMetrics.discovered, state.discoveredCount, {
        duration: 240,
      });
      prevMetrics.discovered = state.discoveredCount;
    } else {
      refs.mappedNum.textContent = String(state.discoveredCount);
    }

    // 2. Patch 4x4 3D Flip Tiles IN PLACE (genuine rotateY(0 <-> 180deg) transitions!)
    state.tiles.forEach((t, idx) => {
      const slot = refs.tiles[idx];
      const isCurrentRev = rev && rev.tileIdx === t.idx;
      const clickable = isMyTurn && !t.revealed;

      slot.btn.disabled = !clickable;
      slot.btn.classList.toggle('is-clickable', clickable);
      slot.btn.classList.toggle('is-match', Boolean(isCurrentRev && rev.matched));
      slot.btn.classList.toggle('is-miss', Boolean(isCurrentRev && !rev.matched));

      if (t.revealed && t.iconId) {
        if (tileClearTimers.has(idx)) {
          clearTimeout(tileClearTimers.get(idx));
          tileClearTimers.delete(idx);
        }
        const emb = EMBLEM_MAP[t.iconId];
        if (slot.lastIconId !== t.iconId) {
          slot.lastIconId = t.iconId;
          slot.svgSlot.innerHTML = renderEmblemSvg(t.iconId);
        }
        slot.nameEl.textContent = emb ? (lang === 'zh' ? emb.zh : emb.en) : '';
        slot.btn.classList.add('is-flipped');
        slot.wasRevealed = true;
      } else {
        slot.btn.classList.remove('is-flipped');
        // Clear secret SVG after midpoint of closing 3D flip (220ms) so close rotation never blanks prematurely!
        if (slot.wasRevealed) {
          slot.wasRevealed = false;
          const timer = setTimeout(() => {
            if (!slot.btn.classList.contains('is-flipped')) {
              slot.svgSlot.innerHTML = '';
              slot.nameEl.textContent = '';
              slot.lastIconId = null;
            }
            tileClearTimers.delete(idx);
          }, Motion.reduced() ? 10 : 220);
          tileClearTimers.set(idx, timer);
        }
      }
    });

    // 3. Reveal Outcome Bar presence
    const showRev = Boolean(rev);
    if (rev) {
      refs.revealBar.classList.toggle('is-match', rev.matched);
      refs.revealBar.classList.toggle('is-miss', !rev.matched);
      refs.revealMsg.textContent = rev.matched
        ? lang === 'zh'
          ? `✨ [${rev.letter}] ${EMBLEM_MAP[rev.iconId]?.zh} 配对成功！前进 +1 格并继续连击`
          : `✨ [${rev.letter}] ${EMBLEM_MAP[rev.iconId]?.en} — MATCH! +1 Slot & Bonus Turn`
        : lang === 'zh'
        ? `✖ [${rev.letter}] 为 ${EMBLEM_MAP[rev.iconId]?.zh}（目标：${EMBLEM_MAP[rev.targetIconId]?.zh}）· 传送带后退 1 格`
        : `✖ [${rev.letter}] is ${EMBLEM_MAP[rev.iconId]?.en} (Needed ${EMBLEM_MAP[rev.targetIconId]?.en}) · Belt -1`;
      refs.continueBtn.textContent = lang === 'zh' ? '立即继续' : 'Next';
      refs.continueBtn.hidden = isSpectator;
    }
    if (showRev !== refs.revealShown) {
      refs.revealShown = showRev;
      Motion.transitionPresence(refs.revealBar, showRev, { preset: 'pill' });
    }

    // 4. Patch Dual 20-Slot Conveyor Belts + GPU Runner Glide + FLIP 5-Card Queue
    const pair = [state.players[state.seatOrder[0]], state.players[state.seatOrder[1]]];
    pair.forEach((p, idx) => {
      const b = refs.belts[idx];
      const isAct = p.seatId === state.currentTurnSeatId && state.phase !== 'ENDED';

      b.card.classList.toggle('is-active-cyan', isAct && p.color === 'cyan');
      b.card.classList.toggle('is-active-garnet', isAct && p.color === 'garnet');
      b.nameWrap.style.color = p.color === 'cyan' ? 'var(--tg-cyan-ink)' : 'var(--tg-garnet-ink)';
      b.avatar.textContent = p.avatar || '♦';
      b.nameText.textContent = p.name;

      if (p.streak >= 2) {
        b.streakBadge.hidden = false;
        b.streakBadge.textContent = `🔥 ${p.streak}x`;
      } else {
        b.streakBadge.hidden = true;
      }

      b.posBadge.className = `tg-badge ${
        p.pos <= 3 ? 'tg-badge-garnet' : p.color === 'cyan' ? 'tg-badge-cyan' : 'tg-badge-gold'
      }`;
      b.posLbl.textContent = lang === 'zh' ? '位置 ' : 'SLOT ';
      const prevPos = prevMetrics.pos[p.seatId];
      if (prevPos !== undefined && prevPos !== p.pos) {
        Motion.animateNumber(b.posNum, prevPos, p.pos, { duration: 240 });
      } else {
        b.posNum.textContent = String(p.pos);
      }
      prevMetrics.pos[p.seatId] = p.pos;

      b.maxLbl.textContent = lang === 'zh' ? '最高连击 ' : 'MAX ';
      const prevBest = prevMetrics.bestStreak[p.seatId];
      if (prevBest !== undefined && prevBest !== p.bestStreak) {
        Motion.animateNumber(b.maxNum, prevBest, p.bestStreak, {
          duration: 240,
          format: (n) => `${Math.round(n)}x`,
        });
      } else {
        b.maxNum.textContent = `${p.bestStreak}x`;
      }
      prevMetrics.bestStreak[p.seatId] = p.bestStreak;

      b.abyssLbl.textContent = lang === 'zh' ? '⚠ 0 深渊淘汰' : '⚠ 0 ABYSS';
      b.finishLbl.textContent = lang === 'zh' ? '20 终点线 ★' : 'FINISH 20 ★';
      b.upLbl.textContent =
        lang === 'zh'
          ? '前方传送带图案队列（首张为当前目标）'
          : 'UPCOMING CONVEYOR QUEUE (FIRST = TARGET)';

      // Patch 20 track cells passed status
      b.slots.forEach((cell, cIdx) => {
        const slotNum = cIdx + 1;
        cell.classList.toggle('is-passed-cyan', p.color === 'cyan' && slotNum < p.pos);
        cell.classList.toggle('is-passed-garnet', p.color === 'garnet' && slotNum < p.pos);
      });

      // GPU-glide runner marker along the 20-slot track!
      const clampedPos = Math.max(0, Math.min(BELT_LENGTH, p.pos));
      b.runner.style.opacity = clampedPos <= 0 ? '0.25' : '1';
      b.runner.style.transform = `translate3d(${Math.max(0, clampedPos - 1) * 100}%, 0, 0)`;

      // FLIP-shift upcoming 5 conveyor cards when runner moves or language changes!
      const startIdx = Math.max(0, Math.min(BELT_LENGTH - 1, p.pos));
      const queueKey = `${startIdx}-${lang}-${p.belt[startIdx]}`;
      if (queueKey !== b.lastQueueKey) {
        const playFlip = b.lastQueueKey
          ? Motion.flipList(b.upStrip, '.sph-belt-item', {
              keyAttr: 'data-flip-key',
              duration: 220,
            })
          : null;
        b.lastQueueKey = queueKey;

        const existingMap = new Map();
        b.upStrip.querySelectorAll('.sph-belt-item').forEach((el) => {
          existingMap.set(el.dataset.flipKey, el);
        });

        const nextNodes = [];
        for (let offset = 0; offset < 5; offset++) {
          const bIdx = startIdx + offset;
          if (bIdx >= BELT_LENGTH) break;
          const iconId = p.belt[bIdx];
          const emb = EMBLEM_MAP[iconId];
          const flipKey = `belt-${idx}-slot-${bIdx}-${iconId}`;
          let node = existingMap.get(flipKey);
          if (!node) {
            node = document.createElement('div');
            node.className = 'sph-belt-item';
            node.dataset.flipKey = flipKey;
            node.innerHTML = `
              <span class="sph-belt-item-slot">${bIdx === BELT_LENGTH - 1 ? '★20' : `#${bIdx + 1}`}</span>
              ${renderEmblemSvg(iconId, 'sph-mini-svg')}
              <span class="sph-belt-item-lbl" style="font-size:10px;color:var(--tg-ink-muted);white-space:nowrap;"></span>
            `;
          }
          node.classList.toggle('is-next', offset === 0);
          const lbl = node.querySelector('.sph-belt-item-lbl');
          if (lbl) lbl.textContent = lang === 'zh' ? emb.zh : emb.en;
          nextNodes.push(node);
        }

        b.upStrip.replaceChildren(...nextNodes);
        if (playFlip) playFlip();
      }
    });
  },
});

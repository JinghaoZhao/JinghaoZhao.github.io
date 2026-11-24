/**
 * Same Picture Hunt (寻找相同图片) — 16 Bespoke SVG Emblems + 3D Flip-Wall + Conveyor Belts
 */

import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, EMBLEMS, BELT_LENGTH } from './rules.js';

const EMBLEM_MAP = Object.fromEntries(EMBLEMS.map((e) => [e.id, e]));

/** 16 ultra-crisp, high-contrast iconic SVG emblems */
function renderEmblemSvg(iconId, className = 'sph-emblem-svg') {
  const emb = EMBLEM_MAP[iconId];
  const c = emb?.color || '#e4b95b';
  const paths = {
    crown: `<path d="M10 46h44l4-26-14 11-12-17-12 17-14-11 4 26z" fill="${c}" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><rect x="12" y="49" width="40" height="6" rx="2" fill="#fff0c2"/>`,
    garnet: `<polygon points="32,6 54,22 45,56 19,56 10,22" fill="${c}" stroke="#ffd1db" stroke-width="2.5" stroke-linejoin="round"/><polygon points="32,14 44,24 38,48 26,48 20,24" fill="rgba(255,255,255,0.28)"/>`,
    hourglass: `<path d="M16 10h32v6c0 9-10 14-16 16 6 2 16 7 16 16v6H16v-6c0-9 10-14 16-16-6-2-16-7-16-16v-6z" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/><path d="M22 16h20l-10 11zM22 49h20l-10-11z" fill="${c}"/>`,
    scales: `<line x1="32" y1="10" x2="32" y2="54" stroke="#fff" stroke-width="3.5"/><line x1="12" y1="20" x2="52" y2="20" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M12 20l-6 16h12zM52 20l-6 16h12z" fill="${c}" stroke="#fff" stroke-width="1.8"/><rect x="20" y="51" width="24" height="5" rx="2" fill="${c}"/>`,
    raven: `<path d="M12 46c6-18 14-28 28-32l12 4-7 6c1 10-5 20-16 26l-17 4z" fill="${c}" stroke="#f3e8ff" stroke-width="2.2" stroke-linejoin="round"/><circle cx="38" cy="22" r="3" fill="#0c0e16"/><path d="M18 42l14-14" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
    diamond: `<polygon points="32,8 56,26 32,56 8,26" fill="${c}" stroke="#ecfeff" stroke-width="2.4" stroke-linejoin="round"/><polyline points="8,26 56,26" stroke="#fff" stroke-width="2"/><polyline points="22,8 32,26 42,8" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>`,
    key: `<circle cx="22" cy="24" r="11" fill="none" stroke="${c}" stroke-width="5"/><circle cx="22" cy="24" r="4" fill="#fff0c2"/><path d="M31 31l21 21m-8-8l7-7m-2 12l6-6" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
    lotus: `<path d="M32 10c7 10 9 20 0 32-9-12-7-22 0-32z" fill="${c}" stroke="#fff" stroke-width="2"/><path d="M32 42c-12-2-20-10-22-22 10 3 18 10 22 22zM32 42c12-2 20-10 22-22-10 3-18 10-22 22z" fill="${c}" opacity="0.82" stroke="#fff" stroke-width="2"/><rect x="16" y="46" width="32" height="5" rx="2.5" fill="#fbcfe8"/>`,
    sun: `<circle cx="32" cy="32" r="13" fill="${c}" stroke="#fff7ed" stroke-width="2.5"/><g stroke="${c}" stroke-width="4" stroke-linecap="round"><line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/><line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/><line x1="13" y1="13" x2="19" y2="19"/><line x1="45" y1="45" x2="51" y2="51"/><line x1="51" y1="13" x2="45" y2="19"/><line x1="19" y1="45" x2="13" y2="51"/></g>`,
    moon: `<path d="M44 12a22 22 0 1 0 8 36 17 17 0 1 1-8-36z" fill="${c}" stroke="#eff6ff" stroke-width="2.4" stroke-linejoin="round"/><circle cx="44" cy="24" r="3.5" fill="#fff0c2"/>`,
    compass: `<circle cx="32" cy="32" r="22" fill="none" stroke="${c}" stroke-width="3.5"/><polygon points="32,12 39,32 32,37 25,32" fill="#ff2e54"/><polygon points="32,52 39,32 32,27 25,32" fill="${c}"/><circle cx="32" cy="32" r="3.5" fill="#fff"/>`,
    shield: `<path d="M32 8l20 8v16c0 13-9 21-20 25-11-4-20-12-20-25V16l20-8z" fill="${c}" stroke="#eff6ff" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 16v32M20 26h24" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    flame: `<path d="M34 8c8 10 16 18 16 30a18 18 0 0 1-36 0c0-8 5-15 10-20 0 6 3 9 6 10-1-7 1-14 4-20z" fill="${c}" stroke="#ffedd5" stroke-width="2.2" stroke-linejoin="round"/><path d="M32 30c5 5 7 9 7 14a7 7 0 0 1-14 0c0-5 3-9 7-14z" fill="#fef08a"/>`,
    eye: `<path d="M6 32c7-12 16-18 26-18s19 6 26 18c-7 12-16 18-26 18S13 44 6 32z" fill="rgba(192,132,252,0.22)" stroke="${c}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="32" cy="32" r="10" fill="${c}"/><circle cx="32" cy="32" r="4.5" fill="#090b12"/><circle cx="35" cy="29" r="2" fill="#fff"/>`,
    bolt: `<polygon points="36,6 14,35 30,35 25,58 50,27 34,27" fill="${c}" stroke="#fef9c3" stroke-width="2.4" stroke-linejoin="round"/>`,
    anchor: `<circle cx="32" cy="14" r="6" fill="none" stroke="${c}" stroke-width="3.5"/><line x1="32" y1="20" x2="32" y2="54" stroke="${c}" stroke-width="4"/><line x1="20" y1="28" x2="44" y2="28" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M14 38c0 10 8 16 18 16s18-6 18-16" fill="none" stroke="${c}" stroke-width="4.2" stroke-linecap="round"/>`,
  };
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">${paths[iconId] || ''}</svg>`;
}

let lastEventSig = null;

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
    const { state, activeSeatId, isSpectator, lang, lastEvent, dispatch, log } = ctx;
    if (!state) return;

    const sig = `${state.flipCount}-${state.phase}-${lastEvent?.type || ''}`;
    if (sig !== lastEventSig && lastEvent) {
      lastEventSig = sig;
      if (lastEvent.type === 'TILE_MATCH') {
        SFX.play('cardFlip');
        if (lastEvent.streak >= 2) SFX.play('combo');
        else SFX.play('garnetClink');
        const pName = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `✨ ${pName} 翻开 [${lastEvent.letter}] 配对成功！(${lastEvent.streak} 连击)`
            : `✨ ${pName} flipped [${lastEvent.letter}] — MATCH! (${lastEvent.streak}x streak)`,
          'system'
        );
      } else if (lastEvent.type === 'TILE_MISS') {
        SFX.play('cardFlip');
        SFX.play('error');
        const pName = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `✖ ${pName} 翻开 [${lastEvent.letter}] 未配对，传送带后退 1 格。`
            : `✖ ${pName} flipped [${lastEvent.letter}] — MISS! Belt slides back 1 slot.`,
          'alert'
        );
      } else if (lastEvent.type === 'FINISH_WIN') {
        SFX.play('victory');
      } else if (lastEvent.type === 'ABYSS_LOSS') {
        SFX.play('eliminate');
      }
    }

    const activePlayer = state.players[state.currentTurnSeatId];
    const targetEmb = EMBLEM_MAP[activePlayer.targetIconId];
    const isMyTurn = !isSpectator && state.phase === 'PICK_TILE' && state.currentTurnSeatId === activeSeatId;
    const rev = state.activeReveal;

    const p0 = state.players[state.seatOrder[0]];
    const p1 = state.players[state.seatOrder[1]];

    const tilesHtml = state.tiles
      .map((t) => {
        const isCurrentRev = rev && rev.tileIdx === t.idx;
        const classes = ['sph-tile-slot'];
        if (t.revealed) classes.push('is-flipped');
        if (isMyTurn && !t.revealed) classes.push('is-clickable');
        if (isCurrentRev) classes.push(rev.matched ? 'is-match' : 'is-miss');

        const emb = t.iconId ? EMBLEM_MAP[t.iconId] : null;
        return `
          <button
            type="button"
            class="${classes.join(' ')}"
            data-flip-idx="${t.idx}"
            ${isMyTurn && !t.revealed ? '' : 'disabled'}
            aria-label="Tile ${t.letter}"
          >
            <div class="sph-tile-inner">
              <div class="sph-tile-face sph-tile-front">
                <span class="sph-tile-letter">${t.letter}</span>
                <span class="sph-tile-sub">PANEL</span>
              </div>
              <div class="sph-tile-face sph-tile-back">
                <span class="sph-tile-badge-corner">${t.letter}</span>
                ${t.iconId ? renderEmblemSvg(t.iconId) : ''}
                <span class="sph-tile-emblem-name">${emb ? (lang === 'zh' ? emb.zh : emb.en) : ''}</span>
              </div>
            </div>
          </button>
        `;
      })
      .join('');

    const renderBeltCard = (p) => {
      const isAct = p.seatId === state.currentTurnSeatId && state.phase !== 'ENDED';
      const slotsHtml = Array.from({ length: BELT_LENGTH }, (_, idx) => {
        const slotNum = idx + 1;
        const cls = ['sph-track-cell'];
        if (slotNum <= 3) cls.push('is-danger');
        if (slotNum === BELT_LENGTH) cls.push('is-finish');
        if (slotNum < p.pos) cls.push(`is-passed-${p.color}`);
        if (slotNum === p.pos) cls.push(`is-runner-${p.color}`);
        return `<div class="${cls.join(' ')}" title="Slot ${slotNum}">${
          slotNum === p.pos ? '▶' : slotNum === BELT_LENGTH ? '★' : ''
        }</div>`;
      }).join('');

      // Next 5 upcoming icons starting from Slot (pos + 1) => 0-indexed p.pos
      const startIdx = Math.max(0, Math.min(BELT_LENGTH - 1, p.pos));
      const upcoming = [];
      for (let offset = 0; offset < 5; offset++) {
        const bIdx = startIdx + offset;
        if (bIdx >= BELT_LENGTH) break;
        const iconId = p.belt[bIdx];
        const emb = EMBLEM_MAP[iconId];
        upcoming.push(`
          <div class="sph-belt-item ${offset === 0 ? 'is-next' : ''}">
            <span class="sph-belt-item-slot">${bIdx === BELT_LENGTH - 1 ? '★20' : `#${bIdx + 1}`}</span>
            ${renderEmblemSvg(iconId, 'sph-mini-svg')}
            <span style="font-size:10px;color:var(--tg-ink-muted);white-space:nowrap;">${lang === 'zh' ? emb.zh : emb.en}</span>
          </div>
        `);
      }

      return `
        <div class="sph-belt-card ${isAct ? `is-active-${p.color}` : ''}">
          <div class="sph-belt-header">
            <div class="sph-belt-name" style="color:${p.color === 'cyan' ? '#67e8f9' : '#ff8ba0'};">
              <span>${UI.escapeHtml(p.avatar || '♦')}</span>
              <span>${UI.escapeHtml(p.name)}</span>
              ${p.streak >= 2 ? `<span class="tg-badge tg-badge-gold">🔥 ${p.streak}x</span>` : ''}
            </div>
            <div class="sph-belt-metrics">
              <span class="tg-badge ${p.pos <= 3 ? 'tg-badge-garnet' : p.color === 'cyan' ? 'tg-badge-cyan' : 'tg-badge-gold'}">
                ${lang === 'zh' ? `位置 ${p.pos}/20` : `SLOT ${p.pos}/20`}
              </span>
              <span style="color:var(--tg-ink-faint);">${lang === 'zh' ? `最高连击 ${p.bestStreak}` : `MAX ${p.bestStreak}x`}</span>
            </div>
          </div>

          <div class="sph-track-wrap">
            <div class="sph-track-ends">
              <span style="color:var(--tg-garnet-bright);">⚠ ${lang === 'zh' ? '0 深渊淘汰' : '0 ABYSS'}</span>
              <span style="color:var(--tg-gold-bright);">${lang === 'zh' ? '20 终点线 ★' : 'FINISH 20 ★'}</span>
            </div>
            <div class="sph-track-slots">${slotsHtml}</div>
          </div>

          <div class="sph-upcoming-label">${lang === 'zh' ? '前方传送带图案队列（首张为当前目标）' : 'UPCOMING CONVEYOR QUEUE (FIRST = TARGET)'}</div>
          <div class="sph-upcoming-strip">${upcoming.join('')}</div>
        </div>
      `;
    };

    const revealBarHtml = rev
      ? `<div class="sph-reveal-bar ${rev.matched ? 'is-match' : 'is-miss'}">
          <span>
            ${
              rev.matched
                ? lang === 'zh'
                  ? `✨ [${rev.letter}] ${EMBLEM_MAP[rev.iconId]?.zh} 配对成功！前进 +1 格，获得连击回合！`
                  : `✨ [${rev.letter}] ${EMBLEM_MAP[rev.iconId]?.en} — MATCH! +1 Slot & Bonus Turn!`
                : lang === 'zh'
                ? `✖ [${rev.letter}] 是 ${EMBLEM_MAP[rev.iconId]?.zh}（目标：${EMBLEM_MAP[rev.targetIconId]?.zh}）· 传送带倒退 1 格！`
                : `✖ [${rev.letter}] is ${EMBLEM_MAP[rev.iconId]?.en} (Needed ${EMBLEM_MAP[rev.targetIconId]?.en}) · Belt -1!`
            }
          </span>
          ${
            !isSpectator
              ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="sph-continue-btn">${lang === 'zh' ? '立即继续' : 'Next'}</button>`
              : ''
          }
        </div>`
      : '';

    container.innerHTML = `
      <div class="sph-arena">
        <div class="sph-spotlight">
          <div class="sph-target-box">
            <div class="sph-target-frame">
              ${renderEmblemSvg(activePlayer.targetIconId, 'sph-emblem-svg')}
            </div>
            <div class="sph-target-meta">
              <span class="sph-target-kicker">
                ${
                  isMyTurn
                    ? lang === 'zh'
                      ? `你的目标图案 · 传送带第 ${Math.min(20, activePlayer.pos + 1)} 格`
                      : `YOUR TARGET · CONVEYOR SLOT #${Math.min(20, activePlayer.pos + 1)}`
                    : lang === 'zh'
                    ? `${UI.escapeHtml(activePlayer.name)} 正在寻找目标`
                    : `${UI.escapeHtml(activePlayer.name)} IS HUNTING`
                }
              </span>
              <span class="sph-target-name">
                ${targetEmb ? (lang === 'zh' ? `${targetEmb.zh} (${targetEmb.en})` : targetEmb.en) : ''}
              </span>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            ${
              activePlayer.streak >= 1
                ? `<span class="sph-combo-pill">🔥 ${activePlayer.streak}x ${lang === 'zh' ? '连击中' : 'STREAK'}</span>`
                : ''
            }
            <span class="tg-badge tg-badge-cyan">
              ${lang === 'zh' ? `已翻开面板 ${state.discoveredCount}/16` : `MAPPED ${state.discoveredCount}/16`}
            </span>
          </div>
        </div>

        <div class="sph-main">
          <div class="sph-wall-panel">
            <div class="sph-wall-grid">${tilesHtml}</div>
            ${revealBarHtml}
          </div>

          <div class="sph-belts-col">
            ${renderBeltCard(p0)}
            ${renderBeltCard(p1)}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-flip-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tileIdx = Number(btn.dataset.flipIdx);
        dispatch({ type: 'FLIP_TILE', payload: { tileIdx } });
      });
    });

    container.querySelector('#sph-continue-btn')?.addEventListener('click', () => {
      SFX.play('click');
      dispatch({ type: 'CONTINUE_REVEAL' });
    });
  },
});

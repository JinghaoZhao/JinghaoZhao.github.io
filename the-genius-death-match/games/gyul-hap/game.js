import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

const COLOR_HEX = {
  red: { main: '#ff2e54', light: '#ff7a93', dark: '#a60d2a' },
  yellow: { main: '#f5bd38', light: '#ffe89a', dark: '#b37b0e' },
  blue: { main: '#25a8ff', light: '#99ddff', dark: '#0b5fa8' },
};

function renderShapeSvg(tile, idx) {
  const palette = COLOR_HEX[tile.color] || COLOR_HEX.red;
  const gid = `gh-grad-${idx}-${tile.shape}-${tile.color}`;
  const stroke = tile.bg === 'white' ? 'rgba(12,16,28,0.28)' : 'rgba(255,255,255,0.28)';

  let body = '';
  if (tile.shape === 'circle') {
    body = `
      <circle cx="50" cy="50" r="36" fill="url(#${gid})" stroke="${stroke}" stroke-width="2.5" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="2" />
    `;
  } else if (tile.shape === 'triangle') {
    body = `
      <polygon points="50,12 88,82 12,82" fill="url(#${gid})" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="50,27 74,73 26,73" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2" stroke-linejoin="round" />
    `;
  } else {
    body = `
      <rect x="15" y="15" width="70" height="70" rx="10" fill="url(#${gid})" stroke="${stroke}" stroke-width="2.5" />
      <rect x="25" y="25" width="50" height="50" rx="5" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2" />
    `;
  }

  return `
    <svg class="gh-tile-svg" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="${gid}" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stop-color="${palette.light}" />
          <stop offset="48%" stop-color="${palette.main}" />
          <stop offset="100%" stop-color="${palette.dark}" />
        </linearGradient>
      </defs>
      ${body}
    </svg>
  `;
}

// Compute center coordinates in a 300x300 SVG overlay for tile 1..9
function tileCenter(tileNum) {
  const idx = tileNum - 1;
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  return { x: col * 100 + 50, y: row * 100 + 50 };
}

function renderTriadOverlay(tiles, toneClass = '') {
  if (!Array.isArray(tiles) || tiles.length !== 3) return '';
  const [p1, p2, p3] = tiles.map(tileCenter);
  return `
    <svg class="gh-triad-svg" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">
      <polygon class="gh-triad-line ${toneClass}" points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" />
      <circle cx="${p1.x}" cy="${p1.y}" r="5.5" fill="#fff" />
      <circle cx="${p2.x}" cy="${p2.y}" r="5.5" fill="#fff" />
      <circle cx="${p3.x}" cy="${p3.y}" r="5.5" fill="#fff" />
    </svg>
  `;
}

// Local UI interaction state (selected tiles, hover preview, feedback FX deduplication)
let selectedTiles = [];
let hoverTriad = null;
let lastRenderedRound = null;
let lastFeedbackId = null;
let activeBurst = null;
let burstTimeout = null;
let latestCtx = null;

function handleKeyDown(e) {
  if (!latestCtx || !latestCtx.state) return;
  if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  const { state, activeSeatId, isSpectator, dispatch } = latestCtx;
  if (isSpectator || state.phase === 'ended') return;
  const myTurn = state.currentTurnSeatId === activeSeatId;

  if (state.phase === 'turn' && myTurn) {
    if (e.key >= '1' && e.key <= '9') {
      const n = Number(e.key);
      toggleTile(n);
      return;
    }
    if ((e.key === 'Enter' || e.key.toLowerCase() === 'h') && selectedTiles.length === 3) {
      e.preventDefault();
      const tiles = selectedTiles.slice();
      selectedTiles = [];
      dispatch({ type: 'CALL_HAP', payload: { tiles } });
      return;
    }
    if (e.key.toLowerCase() === 'g') {
      e.preventDefault();
      selectedTiles = [];
      dispatch({ type: 'CALL_GYUL' });
      return;
    }
    if (e.key === ' ' || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      selectedTiles = [];
      dispatch({ type: 'PASS' });
      return;
    }
  } else if (state.phase === 'gyul_bonus' && myTurn) {
    if (e.key.toLowerCase() === 'g') {
      e.preventDefault();
      dispatch({ type: 'CALL_GYUL' });
    } else if (e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      dispatch({ type: 'SKIP_BONUS' });
    }
  }
}

document.addEventListener('keydown', handleKeyDown);

let rerenderFn = null;
function toggleTile(num) {
  SFX.play('tilePlace');
  const idx = selectedTiles.indexOf(num);
  if (idx >= 0) {
    selectedTiles.splice(idx, 1);
  } else if (selectedTiles.length < 3) {
    selectedTiles.push(num);
  } else {
    selectedTiles = [selectedTiles[1], selectedTiles[2], num];
  }
  rerenderFn?.();
}

mountGame({
  config: {
    id: 'gyul-hap',
    title: { zh: '结!合!', en: 'Gyul! Hap!', ko: '결! 합!' },
    seasons: ['S1 Final', 'S2E3', 'S4E8'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'totalRounds',
        label: { zh: '总回合数', en: 'Total Rounds' },
        type: 'select',
        default: '10',
        choices: [
          { value: '10', label: { zh: '10 回合（节目标准）', en: '10 Rounds (TV Standard)' } },
          { value: '6', label: { zh: '6 回合（极速场）', en: '6 Rounds (Fast)' } },
        ],
      },
      {
        key: 'turnSeconds',
        label: { zh: '单回合限时', en: 'Turn Clock' },
        type: 'select',
        default: '10',
        choices: [
          { value: '10', label: { zh: '10 秒（节目极限）', en: '10s (Broadcast)' } },
          { value: '15', label: { zh: '15 秒（标准）', en: '15s (Standard)' } },
          { value: '25', label: { zh: '25 秒（休闲）', en: '25s (Relaxed)' } },
        ],
      },
    ],
    rulesSummary: {
      zh: `### 核心目标
在 **3×3 共 9 张几何图块** 中寻找所有合法的 **合 (HAP!)** 并在场上再无“合”时抢先喊出 **结 (GYUL!)**，历经 10 回合累计最高分者晋级！

### 什么是“合 (HAP!)”？
每张图块有 3 个属性：**图形**（圆 / 三角 / 方）、**图形颜色**（红 / 金 / 蓝）、**底板颜色**（黑 / 灰 / 白）。
任意 3 张图块若在这 3 个属性上**各自满足“完全相同”或“完全不同”**，即构成一组“合”！

### 计分与第4季官方规则
- **喊「合! HAP!」成功**：**+1 分**，并立即获得 **5 秒追喊「结!」奖励窗口**（可顺势锁定 +3 分！）。
- **喊「结! GYUL!」成功**（场上已无任何未找出的合）：**+3 分**，本回合立即结束！
- **喊错合 / 重复合 / 喊错结**：**-1 分**，回合权移交对手。
- **跳过 (PASS) 或超时**：**0 分**，回合权移交对手。连续 5 次无得分操作则本回合自动结束（S2E3+ 规则）。
- **快捷键**：数字键 \`1–9\` 选牌，\`Enter/H\` 喊合，\`G\` 喊结，\`Space\` 跳过。`,
      en: `### Objective
Scan a **3×3 grid of 9 geometric tiles** to spot every valid **HAP!** set (+1 pt) and shout **GYUL!** (+3 pts) the instant zero unfound Haps remain. Highest cumulative score after 10 rounds wins!

### What Is a Valid "HAP!"?
Every tile has 3 attributes: **Shape** (Circle / Triangle / Square), **Shape Color** (Crimson / Gold / Blue), and **Background** (Obsidian / Slate / Ivory).
Three tiles form a **HAP!** iff for **EACH attribute independently**, all 3 are **ALL THE SAME** or **ALL DIFFERENT**.

### Official S2/S4 Broadcast Rules
- **Valid HAP!**: **+1 pt** + a **5-second Bonus GYUL! window** before your turn passes.
- **Valid GYUL!** (0 unfound Haps left): **+3 pts** and the round ends immediately!
- **Wrong / Duplicate HAP! or Wrong GYUL!**: **−1 pt** and turn passes.
- **PASS / Timeout**: **0 pts**. Five consecutive scoreless turns automatically end the round.
- **Hotkeys**: Keys \`1–9\` toggle tiles, \`Enter/H\` calls HAP!, \`G\` calls GYUL!, \`Space\` passes.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    latestCtx = ctx;
    const { state, activeSeatId, seats, isSpectator, lang, dispatch, log } = ctx;
    if (!state) return;

    if (lastRenderedRound !== state.round) {
      lastRenderedRound = state.round;
      selectedTiles = [];
      hoverTriad = null;
    }

    // Trigger SFX & floating burst once per unique feedback id
    const fb = state.lastFeedback;
    if (fb && fb.id !== lastFeedbackId) {
      lastFeedbackId = fb.id;
      selectedTiles = [];
      const actorName = seats.find((s) => s.seatId === fb.seatId)?.name || state.names?.[fb.seatId] || '';

      if (fb.kind === 'hap_ok') {
        SFX.play('combo');
        SFX.play('garnetClink');
        activeBurst = {
          cls: 'is-hap',
          text: lang === 'zh' ? '合! HAP! +1' : 'HAP! +1',
          tiles: fb.tiles,
          triadTone: 'is-ok',
        };
        log(
          lang === 'zh'
            ? `${actorName} 喊出「合!」[${fb.tiles.join('·')}] (+1)`
            : `${actorName} scored HAP! [${fb.tiles.join('·')}] (+1)`,
          'system'
        );
      } else if (fb.kind === 'gyul_ok') {
        SFX.play('clash');
        SFX.play('reveal');
        activeBurst = {
          cls: 'is-gyul',
          text: lang === 'zh' ? '结! GYUL! +3' : 'GYUL! +3',
          tiles: null,
          triadTone: '',
        };
        log(
          lang === 'zh' ? `${actorName} 完美喊出「结!」(GYUL! +3)` : `${actorName} nailed GYUL! (+3)`,
          'alert'
        );
      } else if (fb.kind === 'hap_fail' || fb.kind === 'hap_dup' || fb.kind === 'gyul_fail') {
        SFX.play('error');
        const msg =
          fb.kind === 'hap_dup'
            ? lang === 'zh' ? '重复合 −1' : 'DUPLICATE −1'
            : fb.kind === 'gyul_fail'
            ? lang === 'zh' ? '尚有合! −1' : 'HAPS LEFT! −1'
            : lang === 'zh' ? '非合法合 −1' : 'INVALID −1';
        activeBurst = {
          cls: 'is-penalty',
          text: msg,
          tiles: fb.tiles || null,
          triadTone: 'is-fail',
        };
        log(`${actorName}: ${msg}`, 'alert');
      } else if (fb.kind === 'pass') {
        SFX.play('click');
        activeBurst = null;
      }

      clearTimeout(burstTimeout);
      if (activeBurst) {
        burstTimeout = setTimeout(() => {
          activeBurst = null;
          draw();
        }, 1150);
      }
    }

    const draw = () => {
      const [s0, s1] = state.seatOrder;
      const name0 = seats.find((s) => s.seatId === s0)?.name || state.names?.[s0] || 'P1';
      const name1 = seats.find((s) => s.seatId === s1)?.name || state.names?.[s1] || 'P2';
      const sc0 = state.scores[s0] ?? 0;
      const sc1 = state.scores[s1] ?? 0;
      const myTurn = !isSpectator && state.currentTurnSeatId === activeSeatId && state.phase !== 'ended';
      const turnName = seats.find((s) => s.seatId === state.currentTurnSeatId)?.name || '';

      const canPickTiles = myTurn && state.phase === 'turn';
      const canCallHap = canPickTiles && selectedTiles.length === 3;
      const canCallGyul = myTurn && (state.phase === 'turn' || state.phase === 'gyul_bonus');

      // Determine triad overlay to display
      let triadTiles = null;
      let triadTone = '';
      if (hoverTriad) {
        triadTiles = hoverTriad;
        triadTone = 'is-ok';
      } else if (selectedTiles.length === 3) {
        triadTiles = selectedTiles;
        triadTone = '';
      } else if (activeBurst?.tiles) {
        triadTiles = activeBurst.tiles;
        triadTone = activeBurst.triadTone;
      }

      // Status banner text
      let bannerCls = '';
      let bannerText = '';
      let bannerSub = '';
      if (state.phase === 'gyul_bonus') {
        bannerCls = 'is-bonus';
        bannerText = myTurn
          ? lang === 'zh'
            ? '✦ 合! 得分成功 — 5 秒内可立即追喊「结! (+3)」！'
            : '✦ HAP SCORED! 5s Window to chain GYUL! (+3)!'
          : lang === 'zh'
          ? `${turnName} 正在决定是否追喊「结!」...`
          : `${turnName} deciding on bonus GYUL!...`;
      } else if (state.phase === 'round_end') {
        bannerCls = state.roundEndReason === 'gyul' ? 'is-gyul-win' : '';
        bannerText =
          state.roundEndReason === 'gyul'
            ? lang === 'zh'
              ? `✦ 结! 回合结束 — 本局共找出全部 ${state.totalHapsInRound} 组合`
              : `✦ GYUL! Round Complete — All ${state.totalHapsInRound} Haps cleared`
            : lang === 'zh'
            ? `连续 5 次未得分 — 本局结束（共 ${state.totalHapsInRound} 组合，遗漏 ${state.missedHaps.length} 组）`
            : `5 scoreless turns — Round Over (${state.missedHaps.length} missed of ${state.totalHapsInRound})`;
      } else if (state.phase === 'ended') {
        bannerText = lang === 'zh' ? '死亡对决终局！' : 'Death Match Complete!';
      } else {
        bannerText = myTurn
          ? lang === 'zh'
            ? '轮到你行动 — 选 3 张喊「合!」，或无合时喊「结!」'
            : 'YOUR TURN — Pick 3 tiles for HAP! or call GYUL!'
          : lang === 'zh'
          ? `等待 ${turnName} 扫描几何矩阵...`
          : `${turnName} is scanning the 3×3 matrix...`;
        bannerSub = lang === 'zh' ? '键盘 1–9 / H / G / Space' : 'Keys 1–9 · H · G · Space';
      }

      const roundDots = Array.from({ length: state.totalRounds }, (_, i) => {
        const r = i + 1;
        const cls = r < state.round ? 'is-done' : r === state.round ? 'is-current' : '';
        return `<span class="gh-round-dot ${cls}"></span>`;
      }).join('');

      const stalePips = Array.from({ length: 5 }, (_, i) =>
        `<span class="gh-stale-pip ${i < state.staleTurns ? 'is-lit' : ''}"></span>`
      ).join('');

      container.innerHTML = `
        <div class="gh-arena">
          <div class="gh-header-bar">
            <div class="gh-score-card ${state.currentTurnSeatId === s0 && state.phase !== 'round_end' ? 'is-active' : ''}">
              <div class="gh-score-meta">
                <span class="gh-score-name">${UI.escapeHtml(name0)}</span>
                <span class="gh-score-tag">${s0 === activeSeatId ? (lang === 'zh' ? '你 · CHALLENGER' : 'YOU') : 'PLAYER 1'}</span>
              </div>
              <div class="gh-score-num ${sc0 < 0 ? 'is-negative' : ''}">${sc0}</div>
            </div>

            <div class="gh-round-center">
              <div class="gh-round-pill">
                ${state.isOvertime
                  ? (lang === 'zh' ? `加时 R${state.round}` : `OT R${state.round}`)
                  : `ROUND ${state.round} / ${state.totalRounds}`}
              </div>
              <div class="gh-round-dots">${roundDots}</div>
              <div class="gh-stale-bar" title="${lang === 'zh' ? '连续无得分回合（满5自动结束本局）' : 'Scoreless turns (5 ends round)'}">
                <span>${lang === 'zh' ? '无得分' : 'PASS'} ${state.staleTurns}/5</span>
                ${stalePips}
              </div>
            </div>

            <div class="gh-score-card is-right ${state.currentTurnSeatId === s1 && state.phase !== 'round_end' ? 'is-active' : ''}">
              <div class="gh-score-meta">
                <span class="gh-score-name">${UI.escapeHtml(name1)}</span>
                <span class="gh-score-tag">${s1 === activeSeatId ? (lang === 'zh' ? '你 · CHALLENGER' : 'YOU') : 'PLAYER 2'}</span>
              </div>
              <div class="gh-score-num ${sc1 < 0 ? 'is-negative' : ''}">${sc1}</div>
            </div>
          </div>

          <div class="gh-stage-col">
            <div class="gh-status-banner ${bannerCls}">
              <span>${UI.escapeHtml(bannerText)}</span>
              ${bannerSub ? `<span style="font-size:11px;font-family:var(--tg-font-mono);color:var(--tg-ink-faint);white-space:nowrap;">${UI.escapeHtml(bannerSub)}</span>` : ''}
            </div>

            <div class="gh-board-shell ${activeBurst?.cls === 'is-gyul' ? 'is-gyul-burst' : ''}">
              <div class="gh-board-grid">
                ${state.board
                  .map((tile, idx) => {
                    const num = idx + 1;
                    const isSel = selectedTiles.includes(num);
                    const isFlashOk = activeBurst?.triadTone === 'is-ok' && activeBurst.tiles?.includes(num);
                    const isFlashFail = activeBurst?.triadTone === 'is-fail' && activeBurst.tiles?.includes(num);
                    const isHover = hoverTriad?.includes(num);
                    return `
                      <button
                        type="button"
                        class="gh-tile bg-${tile.bg} ${isSel ? 'is-selected' : ''} ${isFlashOk || isHover ? 'is-flash-ok' : ''} ${isFlashFail ? 'is-flash-fail' : ''}"
                        data-tile="${num}"
                        ${canPickTiles ? '' : 'disabled'}
                        aria-label="Tile ${num}: ${tile.bg} ${tile.color} ${tile.shape}"
                      >
                        <span class="gh-tile-num">${num}</span>
                        ${renderShapeSvg(tile, idx)}
                      </button>
                    `;
                  })
                  .join('')}
                ${renderTriadOverlay(triadTiles, triadTone)}
              </div>
              ${
                activeBurst
                  ? `<div class="gh-burst ${activeBurst.cls}">${UI.escapeHtml(activeBurst.text)}</div>`
                  : ''
              }
            </div>

            ${
              state.phase === 'round_end'
                ? `
                  <div class="gh-round-recap">
                    <div>
                      <div style="font-weight:700;color:var(--tg-gold-bright);">
                        ${lang === 'zh' ? `第 ${state.round} 回合结算完成` : `Round ${state.round} Concluded`}
                      </div>
                      <div style="font-size:12.5px;color:var(--tg-ink-muted);">
                        ${lang === 'zh' ? '右侧可悬停查看已找出与遗漏的「合」' : 'Hover triples on the ledger to inspect on the board'}
                      </div>
                    </div>
                    ${
                      !isSpectator
                        ? `<button type="button" class="tg-btn tg-btn-gold" id="gh-next-round">
                            ${lang === 'zh' ? '下一回合 →' : 'Next Round →'}
                          </button>`
                        : ''
                    }
                  </div>
                `
                : state.phase === 'gyul_bonus'
                ? `
                  <div class="gh-controls">
                    <div class="gh-btn-row" style="grid-template-columns: 1.4fr 1fr;">
                      <button type="button" class="tg-btn tg-btn-garnet gh-gyul-btn is-pulsing" id="gh-call-gyul" ${canCallGyul ? '' : 'disabled'}>
                        ✦ ${lang === 'zh' ? '追喊 结! GYUL! (+3)' : 'CHAIN GYUL! (+3)'}
                      </button>
                      <button type="button" class="tg-btn tg-btn-ghost gh-pass-btn" id="gh-skip-bonus" ${myTurn ? '' : 'disabled'}>
                        ${lang === 'zh' ? '结束回合 (不喊结)' : 'End Turn (No Gyul)'}
                      </button>
                    </div>
                  </div>
                `
                : `
                  <div class="gh-controls">
                    <div class="gh-selected-strip">
                      <span>${lang === 'zh' ? '已选三张图块' : 'Selected Triad'}</span>
                      <div class="gh-sel-slots">
                        ${[0, 1, 2]
                          .map((i) => {
                            const v = selectedTiles[i];
                            return `<span class="gh-sel-slot ${v ? 'is-filled' : ''}">${v ? `#${v}` : '·'}</span>`;
                          })
                          .join('')}
                        ${
                          selectedTiles.length > 0 && canPickTiles
                            ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="gh-clear-sel">${lang === 'zh' ? '清空' : 'Clear'}</button>`
                            : ''
                        }
                      </div>
                    </div>
                    <div class="gh-btn-row">
                      <button type="button" class="tg-btn ${canCallHap ? 'tg-btn-gold' : 'tg-btn-cyan'} gh-hap-btn" id="gh-call-hap" ${canCallHap ? '' : 'disabled'}>
                        ◆ ${lang === 'zh' ? '合! HAP! (+1)' : 'HAP! (+1)'}
                      </button>
                      <button type="button" class="tg-btn tg-btn-garnet gh-gyul-btn ${canCallGyul && state.foundHaps.length >= 2 ? 'is-pulsing' : ''}" id="gh-call-gyul" ${canCallGyul ? '' : 'disabled'}>
                        ✦ ${lang === 'zh' ? '结! GYUL! (+3)' : 'GYUL! (+3)'}
                      </button>
                      <button type="button" class="tg-btn tg-btn-ghost gh-pass-btn" id="gh-pass" ${canPickTiles ? '' : 'disabled'}>
                        ${lang === 'zh' ? '跳过' : 'PASS'}
                      </button>
                    </div>
                  </div>
                `
            }
          </div>

          <aside class="tg-panel gh-ledger-panel">
            <div class="gh-ledger-head">
              <span>${lang === 'zh' ? '本局已找到的「合」' : 'Discovered Haps'}</span>
              <span class="tg-badge tg-badge-gold">${state.foundHaps.length}</span>
            </div>

            <div class="gh-hap-chips">
              ${
                state.foundHaps.length === 0
                  ? `<div style="font-size:12.5px;color:var(--tg-ink-faint);text-align:center;padding:18px 8px;">
                      ${lang === 'zh' ? '尚未发现任何「合」<br/>若全场无合，可直接喊「结!」+3 分' : 'No Haps called yet.<br/>If 0 exist, call GYUL! for +3 pts.'}
                    </div>`
                  : state.foundHaps
                      .map((h, i) => {
                        const owner = seats.find((s) => s.seatId === h.bySeatId)?.name || state.names?.[h.bySeatId] || '';
                        return `
                          <div class="gh-hap-chip" data-preview="${h.tiles.join(',')}">
                            <span class="gh-hap-triple">#${i + 1} · [${h.tiles.join(' · ')}]</span>
                            <span class="gh-hap-owner">${UI.escapeHtml(owner)}</span>
                          </div>
                        `;
                      })
                      .join('')
              }
              ${
                state.missedHaps && state.missedHaps.length > 0
                  ? `
                    <div style="font-size:11px;font-weight:700;color:#ff8ba0;margin-top:8px;letter-spacing:0.08em;">
                      ${lang === 'zh' ? '本局遗漏的「合」' : 'MISSED HAPS'}
                    </div>
                    ${state.missedHaps
                      .map(
                        (t) => `
                        <div class="gh-hap-chip is-missed" data-preview="${t.join(',')}">
                          <span class="gh-hap-triple">[${t.join(' · ')}]</span>
                          <span class="gh-hap-owner">${lang === 'zh' ? '悬停高亮' : 'Hover'}</span>
                        </div>
                      `
                      )
                      .join('')}
                  `
                  : ''
              }
            </div>

            <div class="gh-legend-box">
              <div style="font-weight:700;color:var(--tg-ink);margin-bottom:2px;">
                ${lang === 'zh' ? '三属性判定速查（各自全同或全异）' : '3-Attribute Rule (All Same or All Diff)'}
              </div>
              <div class="gh-legend-row">
                <span>${lang === 'zh' ? '图形' : 'Shape'}</span>
                <span style="color:var(--tg-ink);">● ▲ ■</span>
              </div>
              <div class="gh-legend-row">
                <span>${lang === 'zh' ? '图形色' : 'Color'}</span>
                <span>
                  <span style="color:#ff2e54;">●</span>
                  <span style="color:#f5bd38;">●</span>
                  <span style="color:#25a8ff;">●</span>
                </span>
              </div>
              <div class="gh-legend-row">
                <span>${lang === 'zh' ? '底板' : 'Bg'}</span>
                <span style="color:var(--tg-ink);">${lang === 'zh' ? '黑 · 灰 · 白' : 'Black · Gray · Ivory'}</span>
              </div>
            </div>
          </aside>
        </div>
      `;

      container.querySelectorAll('[data-tile]').forEach((btn) => {
        btn.addEventListener('click', () => {
          toggleTile(Number(btn.dataset.tile));
        });
      });

      container.querySelector('#gh-clear-sel')?.addEventListener('click', () => {
        SFX.play('click');
        selectedTiles = [];
        draw();
      });

      container.querySelector('#gh-call-hap')?.addEventListener('click', () => {
        if (selectedTiles.length !== 3) return;
        const tiles = selectedTiles.slice();
        selectedTiles = [];
        dispatch({ type: 'CALL_HAP', payload: { tiles } });
      });

      container.querySelector('#gh-call-gyul')?.addEventListener('click', () => {
        selectedTiles = [];
        dispatch({ type: 'CALL_GYUL' });
      });

      container.querySelector('#gh-pass')?.addEventListener('click', () => {
        selectedTiles = [];
        dispatch({ type: 'PASS' });
      });

      container.querySelector('#gh-skip-bonus')?.addEventListener('click', () => {
        dispatch({ type: 'SKIP_BONUS' });
      });

      container.querySelector('#gh-next-round')?.addEventListener('click', () => {
        SFX.play('click');
        dispatch({ type: 'NEXT_ROUND' });
      });

      container.querySelectorAll('[data-preview]').forEach((chip) => {
        chip.addEventListener('mouseenter', () => {
          hoverTriad = chip.dataset.preview.split(',').map(Number);
          const grid = container.querySelector('.gh-board-grid');
          if (grid) {
            grid.querySelector('.gh-triad-svg')?.remove();
            grid.insertAdjacentHTML('beforeend', renderTriadOverlay(hoverTriad, 'is-ok'));
            grid.querySelectorAll('[data-tile]').forEach((t) => {
              t.classList.toggle('is-flash-ok', hoverTriad.includes(Number(t.dataset.tile)));
            });
          }
        });
        chip.addEventListener('mouseleave', () => {
          hoverTriad = null;
          draw();
        });
      });
    };

    rerenderFn = draw;
    draw();
  },
});

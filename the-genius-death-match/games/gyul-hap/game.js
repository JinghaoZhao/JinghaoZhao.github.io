import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
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

function tileCenter(tileNum) {
  const idx = tileNum - 1;
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  return { x: col * 100 + 50, y: row * 100 + 50 };
}

// Persistent local interaction & animation state
let selectedTiles = [];
let hoverTriad = null;
let lastBoardSig = '';
let lastFeedbackId = null;
let prevScores = {};
let activeFlash = null; // { tiles: number[], tone: 'is-ok'|'is-fail' }
let flashTimeout = null;
let latestCtx = null;
let refs = null;

function patchTriadAndSelection() {
  if (!refs || !latestCtx?.state) return;
  const { state, activeSeatId, isSpectator } = latestCtx;
  const myTurn = !isSpectator && state.currentTurnSeatId === activeSeatId && state.phase !== 'ended';
  const canPickTiles = myTurn && state.phase === 'turn';

  // Patch the 9 tiles in-place (120ms tactile cadence, zero innerHTML rebuild!)
  refs.tiles.forEach((btn, idx) => {
    const num = idx + 1;
    const isSel = selectedTiles.includes(num);
    const isHover = Boolean(hoverTriad?.includes(num));
    const isFlashOk = Boolean(activeFlash?.tone === 'is-ok' && activeFlash.tiles?.includes(num));
    const isFlashFail = Boolean(activeFlash?.tone === 'is-fail' && activeFlash.tiles?.includes(num));

    btn.disabled = !canPickTiles;
    btn.classList.toggle('is-selected', isSel);
    btn.classList.toggle('is-flash-ok', isHover || isFlashOk);
    btn.classList.toggle('is-flash-fail', isFlashFail);
  });

  // Patch 3 selected slots in-place
  refs.selSlots.forEach((slotEl, i) => {
    const v = selectedTiles[i];
    slotEl.textContent = v ? `#${v}` : '·';
    slotEl.classList.toggle('is-filled', Boolean(v));
  });
  refs.btnClearSel.hidden = !(selectedTiles.length > 0 && canPickTiles);

  // Patch action buttons in-place
  const canCallHap = canPickTiles && selectedTiles.length === 3;
  const canCallGyul = myTurn && (state.phase === 'turn' || state.phase === 'gyul_bonus');
  refs.btnHap.disabled = !canCallHap;
  refs.btnHap.classList.toggle('tg-btn-gold', canCallHap);
  refs.btnHap.classList.toggle('tg-btn-cyan', !canCallHap);

  refs.btnGyul.disabled = !canCallGyul;
  refs.btnGyul.classList.toggle('is-pulsing', canCallGyul && state.foundHaps.length >= 2);
  refs.btnPass.disabled = !canPickTiles;

  refs.btnBonusGyul.disabled = !canCallGyul;
  refs.btnBonusSkip.disabled = !myTurn;

  // Patch Triad SVG overlay in-place
  let triadTiles = null;
  let tone = '';
  if (hoverTriad && hoverTriad.length === 3) {
    triadTiles = hoverTriad;
    tone = 'is-ok';
  } else if (selectedTiles.length === 3) {
    triadTiles = selectedTiles;
    tone = '';
  } else if (activeFlash?.tiles?.length === 3) {
    triadTiles = activeFlash.tiles;
    tone = activeFlash.tone;
  }

  if (triadTiles) {
    const pts = triadTiles.map(tileCenter);
    refs.triadPoly.setAttribute('points', pts.map((p) => `${p.x},${p.y}`).join(' '));
    refs.triadPoly.setAttribute('class', `gh-triad-line ${tone}`.trim());
    pts.forEach((p, i) => {
      refs.triadDots[i].setAttribute('cx', String(p.x));
      refs.triadDots[i].setAttribute('cy', String(p.y));
    });
    refs.triadSvg.classList.add('is-visible');
  } else {
    refs.triadSvg.classList.remove('is-visible');
  }
}

function toggleTile(num) {
  if (!latestCtx?.state) return;
  const { state, activeSeatId, isSpectator } = latestCtx;
  if (isSpectator || state.phase !== 'turn' || state.currentTurnSeatId !== activeSeatId) return;

  SFX.play('tilePlace');
  const idx = selectedTiles.indexOf(num);
  if (idx >= 0) {
    selectedTiles.splice(idx, 1);
  } else if (selectedTiles.length < 3) {
    selectedTiles.push(num);
  } else {
    selectedTiles = [selectedTiles[1], selectedTiles[2], num];
  }
  patchTriadAndSelection();
}

function spawnBurst(cls, text) {
  if (!refs?.burstHost) return;
  refs.burstHost.innerHTML = '';
  const el = document.createElement('div');
  el.className = `gh-burst ${cls}`;
  el.textContent = text;
  refs.burstHost.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.remove();
  }, 1150);
}

function handleKeyDown(e) {
  if (!latestCtx || !latestCtx.state) return;
  if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  const { state, activeSeatId, isSpectator, dispatch } = latestCtx;
  if (isSpectator || state.phase === 'ended') return;
  const myTurn = state.currentTurnSeatId === activeSeatId;

  if (state.phase === 'turn' && myTurn) {
    if (e.key >= '1' && e.key <= '9') {
      toggleTile(Number(e.key));
      return;
    }
    if ((e.key === 'Enter' || e.key.toLowerCase() === 'h') && selectedTiles.length === 3) {
      e.preventDefault();
      const tiles = selectedTiles.slice();
      selectedTiles = [];
      patchTriadAndSelection();
      dispatch({ type: 'CALL_HAP', payload: { tiles } });
      return;
    }
    if (e.key.toLowerCase() === 'g') {
      e.preventDefault();
      selectedTiles = [];
      patchTriadAndSelection();
      dispatch({ type: 'CALL_GYUL' });
      return;
    }
    if (e.key === ' ' || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      selectedTiles = [];
      patchTriadAndSelection();
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

function mountSkeleton(container) {
  container.innerHTML = `
    <div class="gh-arena">
      <div class="gh-header-bar">
        <div class="gh-score-card" id="gh-sc-card-0">
          <div class="gh-score-meta">
            <span class="gh-score-name" id="gh-sc-name-0"></span>
            <span class="gh-score-tag" id="gh-sc-tag-0"></span>
          </div>
          <div class="gh-score-num" id="gh-sc-num-0">0</div>
        </div>

        <div class="gh-round-center">
          <div class="gh-round-pill" id="gh-round-pill">ROUND 1 / 10</div>
          <div class="gh-round-dots" id="gh-round-dots"></div>
          <div class="gh-stale-bar" id="gh-stale-bar">
            <span id="gh-stale-text">PASS 0/5</span>
            <span class="gh-stale-pip"></span>
            <span class="gh-stale-pip"></span>
            <span class="gh-stale-pip"></span>
            <span class="gh-stale-pip"></span>
            <span class="gh-stale-pip"></span>
          </div>
        </div>

        <div class="gh-score-card is-right" id="gh-sc-card-1">
          <div class="gh-score-meta">
            <span class="gh-score-name" id="gh-sc-name-1"></span>
            <span class="gh-score-tag" id="gh-sc-tag-1"></span>
          </div>
          <div class="gh-score-num" id="gh-sc-num-1">0</div>
        </div>
      </div>

      <div class="gh-stage-col">
        <div class="gh-status-banner" id="gh-status-banner">
          <span id="gh-banner-text"></span>
          <span id="gh-banner-sub" style="font-size:11px;font-family:var(--tg-font-mono);color:var(--tg-ink-faint);white-space:nowrap;"></span>
        </div>

        <div class="gh-board-shell" id="gh-board-shell">
          <div class="gh-board-grid" id="gh-board-grid">
            ${Array.from({ length: 9 }, (_, i) => `
              <button type="button" class="gh-tile" data-tile="${i + 1}">
                <span class="gh-tile-num">${i + 1}</span>
                <span class="gh-tile-art"></span>
              </button>
            `).join('')}
            <svg class="gh-triad-svg" id="gh-triad-svg" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">
              <polygon class="gh-triad-line" id="gh-triad-poly" points="50,50 150,150 250,250" />
              <circle class="gh-triad-dot" cx="50" cy="50" r="5.5" fill="#fff" />
              <circle class="gh-triad-dot" cx="150" cy="150" r="5.5" fill="#fff" />
              <circle class="gh-triad-dot" cx="250" cy="250" r="5.5" fill="#fff" />
            </svg>
          </div>
          <div class="gh-burst-host" id="gh-burst-host"></div>
        </div>

        <div class="gh-controls" id="gh-ctrl-turn">
          <div class="gh-selected-strip">
            <span id="gh-sel-label"></span>
            <div class="gh-sel-slots">
              <span class="gh-sel-slot">·</span>
              <span class="gh-sel-slot">·</span>
              <span class="gh-sel-slot">·</span>
              <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="gh-clear-sel" hidden></button>
            </div>
          </div>
          <div class="gh-btn-row">
            <button type="button" class="tg-btn tg-btn-cyan gh-hap-btn" id="gh-call-hap" disabled></button>
            <button type="button" class="tg-btn tg-btn-garnet gh-gyul-btn" id="gh-call-gyul" disabled></button>
            <button type="button" class="tg-btn tg-btn-ghost gh-pass-btn" id="gh-pass" disabled></button>
          </div>
        </div>

        <div class="gh-controls" id="gh-ctrl-bonus" hidden>
          <div class="gh-btn-row" style="grid-template-columns: 1.4fr 1fr;">
            <button type="button" class="tg-btn tg-btn-garnet gh-gyul-btn is-pulsing" id="gh-bonus-gyul"></button>
            <button type="button" class="tg-btn tg-btn-ghost gh-pass-btn" id="gh-bonus-skip"></button>
          </div>
        </div>

        <div class="gh-round-recap" id="gh-ctrl-recap" hidden>
          <div>
            <div id="gh-recap-title" style="font-weight:700;color:var(--tg-gold-bright);"></div>
            <div id="gh-recap-sub" style="font-size:12.5px;color:var(--tg-ink-muted);"></div>
          </div>
          <button type="button" class="tg-btn tg-btn-gold" id="gh-next-round"></button>
        </div>
      </div>

      <aside class="tg-panel gh-ledger-panel">
        <div class="gh-ledger-head">
          <span id="gh-ledger-title"></span>
          <span class="tg-badge tg-badge-gold" id="gh-ledger-count">0</span>
        </div>
        <div class="gh-hap-chips" id="gh-hap-chips"></div>
        <div class="gh-legend-box">
          <div id="gh-leg-head" style="font-weight:700;color:var(--tg-ink);margin-bottom:2px;"></div>
          <div class="gh-legend-row">
            <span id="gh-leg-shape"></span>
            <span style="color:var(--tg-ink);">● ▲ ■</span>
          </div>
          <div class="gh-legend-row">
            <span id="gh-leg-color"></span>
            <span>
              <span style="color:#ff2e54;">●</span>
              <span style="color:#f5bd38;">●</span>
              <span style="color:#25a8ff;">●</span>
            </span>
          </div>
          <div class="gh-legend-row">
            <span id="gh-leg-bg"></span>
            <span id="gh-leg-bg-vals" style="color:var(--tg-ink);"></span>
          </div>
        </div>
      </aside>
    </div>
  `;

  container.dataset.mountedGame = 'gyul-hap';

  refs = {
    scCard0: container.querySelector('#gh-sc-card-0'),
    scName0: container.querySelector('#gh-sc-name-0'),
    scTag0: container.querySelector('#gh-sc-tag-0'),
    scNum0: container.querySelector('#gh-sc-num-0'),
    scCard1: container.querySelector('#gh-sc-card-1'),
    scName1: container.querySelector('#gh-sc-name-1'),
    scTag1: container.querySelector('#gh-sc-tag-1'),
    scNum1: container.querySelector('#gh-sc-num-1'),
    roundPill: container.querySelector('#gh-round-pill'),
    roundDots: container.querySelector('#gh-round-dots'),
    staleText: container.querySelector('#gh-stale-text'),
    stalePips: Array.from(container.querySelectorAll('.gh-stale-pip')),
    statusBanner: container.querySelector('#gh-status-banner'),
    bannerText: container.querySelector('#gh-banner-text'),
    bannerSub: container.querySelector('#gh-banner-sub'),
    boardShell: container.querySelector('#gh-board-shell'),
    tiles: Array.from(container.querySelectorAll('.gh-tile')),
    triadSvg: container.querySelector('#gh-triad-svg'),
    triadPoly: container.querySelector('#gh-triad-poly'),
    triadDots: Array.from(container.querySelectorAll('.gh-triad-dot')),
    burstHost: container.querySelector('#gh-burst-host'),
    ctrlTurn: container.querySelector('#gh-ctrl-turn'),
    ctrlBonus: container.querySelector('#gh-ctrl-bonus'),
    ctrlRecap: container.querySelector('#gh-ctrl-recap'),
    selLabel: container.querySelector('#gh-sel-label'),
    selSlots: Array.from(container.querySelectorAll('.gh-sel-slot')),
    btnClearSel: container.querySelector('#gh-clear-sel'),
    btnHap: container.querySelector('#gh-call-hap'),
    btnGyul: container.querySelector('#gh-call-gyul'),
    btnPass: container.querySelector('#gh-pass'),
    btnBonusGyul: container.querySelector('#gh-bonus-gyul'),
    btnBonusSkip: container.querySelector('#gh-bonus-skip'),
    recapTitle: container.querySelector('#gh-recap-title'),
    recapSub: container.querySelector('#gh-recap-sub'),
    btnNextRound: container.querySelector('#gh-next-round'),
    ledgerTitle: container.querySelector('#gh-ledger-title'),
    ledgerCount: container.querySelector('#gh-ledger-count'),
    hapChips: container.querySelector('#gh-hap-chips'),
    legHead: container.querySelector('#gh-leg-head'),
    legShape: container.querySelector('#gh-leg-shape'),
    legColor: container.querySelector('#gh-leg-color'),
    legBg: container.querySelector('#gh-leg-bg'),
    legBgVals: container.querySelector('#gh-leg-bg-vals'),
  };

  refs.tiles.forEach((btn, idx) => {
    btn.addEventListener('click', () => toggleTile(idx + 1));
  });

  refs.btnClearSel.addEventListener('click', () => {
    SFX.play('click');
    selectedTiles = [];
    patchTriadAndSelection();
  });

  refs.btnHap.addEventListener('click', () => {
    if (selectedTiles.length !== 3 || !latestCtx) return;
    const tiles = selectedTiles.slice();
    selectedTiles = [];
    patchTriadAndSelection();
    latestCtx.dispatch({ type: 'CALL_HAP', payload: { tiles } });
  });

  refs.btnGyul.addEventListener('click', () => {
    if (!latestCtx) return;
    selectedTiles = [];
    patchTriadAndSelection();
    latestCtx.dispatch({ type: 'CALL_GYUL' });
  });

  refs.btnPass.addEventListener('click', () => {
    if (!latestCtx) return;
    selectedTiles = [];
    patchTriadAndSelection();
    latestCtx.dispatch({ type: 'PASS' });
  });

  refs.btnBonusGyul.addEventListener('click', () => {
    latestCtx?.dispatch({ type: 'CALL_GYUL' });
  });

  refs.btnBonusSkip.addEventListener('click', () => {
    latestCtx?.dispatch({ type: 'SKIP_BONUS' });
  });

  refs.btnNextRound.addEventListener('click', () => {
    SFX.play('click');
    latestCtx?.dispatch({ type: 'NEXT_ROUND' });
  });

  // Event delegation on ledger chips — zero DOM rebuild on mouseenter / mouseleave!
  refs.hapChips.addEventListener('mouseover', (e) => {
    const chip = e.target.closest('[data-preview]');
    if (!chip) return;
    const next = chip.dataset.preview.split(',').map(Number);
    if (hoverTriad && hoverTriad.join(',') === next.join(',')) return;
    hoverTriad = next;
    patchTriadAndSelection();
  });

  refs.hapChips.addEventListener('mouseleave', () => {
    if (!hoverTriad) return;
    hoverTriad = null;
    patchTriadAndSelection();
  });
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
    const { state, activeSeatId, seats, isSpectator, lang, log } = ctx;
    if (!state) return;

    if (container.dataset.mountedGame !== 'gyul-hap') {
      mountSkeleton(container);
      lastBoardSig = '';
      lastFeedbackId = null;
      prevScores = {};
      selectedTiles = [];
      hoverTriad = null;
    }

    const [s0, s1] = state.seatOrder;
    const name0 = seats.find((s) => s.seatId === s0)?.name || state.names?.[s0] || 'P1';
    const name1 = seats.find((s) => s.seatId === s1)?.name || state.names?.[s1] || 'P2';
    const sc0 = state.scores[s0] ?? 0;
    const sc1 = state.scores[s1] ?? 0;

    // Patch scoreboard in place with Motion.animateNumber + delta pills
    refs.scName0.textContent = name0;
    refs.scTag0.textContent = s0 === activeSeatId ? (lang === 'zh' ? '你 · CHALLENGER' : 'YOU') : 'PLAYER 1';
    refs.scCard0.classList.toggle('is-active', state.currentTurnSeatId === s0 && state.phase !== 'round_end');
    refs.scNum0.classList.toggle('is-negative', sc0 < 0);
    if (prevScores[s0] !== sc0) {
      const from = prevScores[s0] ?? sc0;
      prevScores[s0] = sc0;
      Motion.animateNumber(refs.scNum0, from, sc0, { duration: 280, deltaEl: refs.scCard0 });
    }

    refs.scName1.textContent = name1;
    refs.scTag1.textContent = s1 === activeSeatId ? (lang === 'zh' ? '你 · CHALLENGER' : 'YOU') : 'PLAYER 2';
    refs.scCard1.classList.toggle('is-active', state.currentTurnSeatId === s1 && state.phase !== 'round_end');
    refs.scNum1.classList.toggle('is-negative', sc1 < 0);
    if (prevScores[s1] !== sc1) {
      const from = prevScores[s1] ?? sc1;
      prevScores[s1] = sc1;
      Motion.animateNumber(refs.scNum1, from, sc1, { duration: 280, deltaEl: refs.scCard1 });
    }

    // Patch round pill, dots, stale pips
    refs.roundPill.textContent = state.isOvertime
      ? lang === 'zh' ? `加时 R${state.round}` : `OT R${state.round}`
      : `ROUND ${state.round} / ${state.totalRounds}`;

    if (refs.roundDots.children.length !== state.totalRounds) {
      refs.roundDots.innerHTML = Array.from({ length: state.totalRounds }, () => '<span class="gh-round-dot"></span>').join('');
    }
    Array.from(refs.roundDots.children).forEach((dot, i) => {
      const r = i + 1;
      dot.classList.toggle('is-done', r < state.round);
      dot.classList.toggle('is-current', r === state.round);
    });

    refs.staleText.textContent = `${lang === 'zh' ? '无得分' : 'PASS'} ${state.staleTurns}/5`;
    refs.stalePips.forEach((pip, i) => pip.classList.toggle('is-lit', i < state.staleTurns));

    // Only rebuild the 9 tile SVGs when a new round's board is dealt!
    const boardSig = `${state.round}:${state.board.map((t) => t.id).join(',')}`;
    if (boardSig !== lastBoardSig) {
      lastBoardSig = boardSig;
      selectedTiles = [];
      hoverTriad = null;
      refs.tiles.forEach((btn, idx) => {
        const tile = state.board[idx];
        btn.classList.remove('bg-black', 'bg-gray', 'bg-white');
        btn.classList.add(`bg-${tile.bg}`);
        btn.setAttribute('aria-label', `Tile ${idx + 1}: ${tile.bg} ${tile.color} ${tile.shape}`);
        const art = btn.querySelector('.gh-tile-art');
        if (art) art.innerHTML = renderShapeSvg(tile, idx);
      });
    }

    // Handle unique feedback SFX, bursts, pulseConfirm, and nudgeError
    const fb = state.lastFeedback;
    if (fb && fb.id !== lastFeedbackId) {
      lastFeedbackId = fb.id;
      selectedTiles = [];
      const actorName = seats.find((s) => s.seatId === fb.seatId)?.name || state.names?.[fb.seatId] || '';

      clearTimeout(flashTimeout);
      activeFlash = null;

      if (fb.kind === 'hap_ok') {
        SFX.play('combo');
        SFX.play('garnetClink');
        activeFlash = { tiles: fb.tiles, tone: 'is-ok' };
        spawnBurst('is-hap', lang === 'zh' ? '合! HAP! +1' : 'HAP! +1');
        Motion.pulseConfirm(refs.boardShell, { tone: 'gold' });
        log(
          lang === 'zh'
            ? `${actorName} 喊出「合!」[${fb.tiles.join('·')}] (+1)`
            : `${actorName} scored HAP! [${fb.tiles.join('·')}] (+1)`,
          'system'
        );
      } else if (fb.kind === 'gyul_ok') {
        SFX.play('clash');
        SFX.play('reveal');
        spawnBurst('is-gyul', lang === 'zh' ? '结! GYUL! +3' : 'GYUL! +3');
        refs.boardShell.classList.remove('is-gyul-burst');
        void refs.boardShell.offsetWidth;
        refs.boardShell.classList.add('is-gyul-burst');
        Motion.pulseConfirm(refs.boardShell, { tone: 'gold' });
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
        activeFlash = fb.tiles ? { tiles: fb.tiles, tone: 'is-fail' } : null;
        spawnBurst('is-penalty', msg);
        Motion.nudgeError(refs.boardShell, { intensity: 'impact' });
        log(`${actorName}: ${msg}`, 'alert');
      } else if (fb.kind === 'pass') {
        SFX.play('click');
      }

      if (activeFlash) {
        flashTimeout = setTimeout(() => {
          activeFlash = null;
          patchTriadAndSelection();
        }, 1050);
      }
    }

    // Status banner patch
    const myTurn = !isSpectator && state.currentTurnSeatId === activeSeatId && state.phase !== 'ended';
    const turnName = seats.find((s) => s.seatId === state.currentTurnSeatId)?.name || '';
    refs.statusBanner.classList.toggle('is-bonus', state.phase === 'gyul_bonus');
    refs.statusBanner.classList.toggle('is-gyul-win', state.phase === 'round_end' && state.roundEndReason === 'gyul');

    if (state.phase === 'gyul_bonus') {
      refs.bannerText.textContent = myTurn
        ? lang === 'zh'
          ? '✦ 合! 得分成功 — 5 秒内可立即追喊「结! (+3)」！'
          : '✦ HAP SCORED! 5s Window to chain GYUL! (+3)!'
        : lang === 'zh'
        ? `${turnName} 正在决定是否追喊「结!」...`
        : `${turnName} deciding on bonus GYUL!...`;
      refs.bannerSub.textContent = '';
    } else if (state.phase === 'round_end') {
      refs.bannerText.textContent =
        state.roundEndReason === 'gyul'
          ? lang === 'zh'
            ? `✦ 结! 回合结束 — 本局共找出全部 ${state.totalHapsInRound} 组合`
            : `✦ GYUL! Round Complete — All ${state.totalHapsInRound} Haps cleared`
          : lang === 'zh'
          ? `连续 5 次未得分 — 本局结束（共 ${state.totalHapsInRound} 组合，遗漏 ${state.missedHaps.length} 组）`
          : `5 scoreless turns — Round Over (${state.missedHaps.length} missed of ${state.totalHapsInRound})`;
      refs.bannerSub.textContent = '';
    } else if (state.phase === 'ended') {
      refs.bannerText.textContent = lang === 'zh' ? '死亡对决终局！' : 'Death Match Complete!';
      refs.bannerSub.textContent = '';
    } else {
      refs.bannerText.textContent = myTurn
        ? lang === 'zh'
          ? '轮到你行动 — 选 3 张喊「合!」，或无合时喊「结!」'
          : 'YOUR TURN — Pick 3 tiles for HAP! or call GYUL!'
        : lang === 'zh'
        ? `等待 ${turnName} 扫描几何矩阵...`
        : `${turnName} is scanning the 3×3 matrix...`;
      refs.bannerSub.textContent = lang === 'zh' ? '键盘 1–9 / H / G / Space' : 'Keys 1–9 · H · G · Space';
    }

    // Toggle control sub-views cleanly without touching the 3x3 board
    refs.ctrlTurn.hidden = state.phase === 'gyul_bonus' || state.phase === 'round_end';
    refs.ctrlBonus.hidden = state.phase !== 'gyul_bonus';
    refs.ctrlRecap.hidden = state.phase !== 'round_end';

    refs.selLabel.textContent = lang === 'zh' ? '已选三张图块' : 'Selected Triad';
    refs.btnClearSel.textContent = lang === 'zh' ? '清空' : 'Clear';
    refs.btnHap.textContent = `◆ ${lang === 'zh' ? '合! HAP! (+1)' : 'HAP! (+1)'}`;
    refs.btnGyul.textContent = `✦ ${lang === 'zh' ? '结! GYUL! (+3)' : 'GYUL! (+3)'}`;
    refs.btnPass.textContent = lang === 'zh' ? '跳过' : 'PASS';
    refs.btnBonusGyul.textContent = `✦ ${lang === 'zh' ? '追喊 结! GYUL! (+3)' : 'CHAIN GYUL! (+3)'}`;
    refs.btnBonusSkip.textContent = lang === 'zh' ? '结束回合 (不喊结)' : 'End Turn (No Gyul)';

    refs.recapTitle.textContent = lang === 'zh' ? `第 ${state.round} 回合结算完成` : `Round ${state.round} Concluded`;
    refs.recapSub.textContent = lang === 'zh' ? '右侧可悬停查看已找出与遗漏的「合」' : 'Hover triples on the ledger to inspect on the board';
    refs.btnNextRound.textContent = lang === 'zh' ? '下一回合 →' : 'Next Round →';
    refs.btnNextRound.hidden = Boolean(isSpectator);

    // Patch Ledger panel
    refs.ledgerTitle.textContent = lang === 'zh' ? '本局已找到的「合」' : 'Discovered Haps';
    refs.ledgerCount.textContent = String(state.foundHaps.length);

    let ledgerHtml = '';
    if (state.foundHaps.length === 0 && (!state.missedHaps || state.missedHaps.length === 0)) {
      ledgerHtml = `<div style="font-size:12.5px;color:var(--tg-ink-faint);text-align:center;padding:18px 8px;">
        ${lang === 'zh' ? '尚未发现任何「合」<br/>若全场无合，可直接喊「结!」+3 分' : 'No Haps called yet.<br/>If 0 exist, call GYUL! for +3 pts.'}
      </div>`;
    } else {
      ledgerHtml += state.foundHaps
        .map((h, i) => {
          const owner = seats.find((s) => s.seatId === h.bySeatId)?.name || state.names?.[h.bySeatId] || '';
          return `
            <div class="gh-hap-chip" data-preview="${h.tiles.join(',')}">
              <span class="gh-hap-triple">#${i + 1} · [${h.tiles.join(' · ')}]</span>
              <span class="gh-hap-owner">${UI.escapeHtml(owner)}</span>
            </div>
          `;
        })
        .join('');
      if (state.missedHaps && state.missedHaps.length > 0) {
        ledgerHtml += `
          <div style="font-size:11px;font-weight:700;color:var(--tg-garnet-ink);margin-top:8px;letter-spacing:0.08em;">
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
        `;
      }
    }
    refs.hapChips.innerHTML = ledgerHtml;

    // Legend labels
    refs.legHead.textContent = lang === 'zh' ? '三属性判定速查（各自全同或全异）' : '3-Attribute Rule (All Same or All Diff)';
    refs.legShape.textContent = lang === 'zh' ? '图形' : 'Shape';
    refs.legColor.textContent = lang === 'zh' ? '图形色' : 'Color';
    refs.legBg.textContent = lang === 'zh' ? '底板' : 'Bg';
    refs.legBgVals.textContent = lang === 'zh' ? '黑 · 灰 · 白' : 'Black · Gray · Ivory';

    patchTriadAndSelection();
  },
});

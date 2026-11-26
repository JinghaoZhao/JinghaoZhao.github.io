/**
 * God's Test: 7×7 Magic Square (神之考验：49魔方阵) — Interactive Broadcast Renderer
 * Wave 2 Apple-Grade Motion & Dual-Theme Edition:
 *  - Motion.patchDOM + Motion.delegate (zero innerHTML wipes, preserved focus & CSS transitions)
 *  - data-motion-key on 49 basalt cells, 16 sum rim counters, 15 cipher zones, palette & racers
 *  - Live Motion.animateNumber + tabular-nums on 175 row/column/diagonal sums
 *  - GPU-only scaleX/scaleY progress & sandglass ticks (zero grid re-render on timer ticks)
 *  - Motion.shake on invalid moves / locked keystone / over-sum lines
 *  - Full Dark Obsidian Studio & Light Porcelain Studio support
 */

import { mountGame, SFX, I18n, UI, Motion, Theme } from '../../shared/sdk.js';
import {
  GRID_SIZE,
  LOCKED_CELL,
  SIAMESE_STEPS,
  EXILE_CIPHER_ZONES,
  analyzeBoard,
  GameRules,
} from './rules.js';

const uiState = {
  selectedCell: { r: 6, c: 4 },
  typingBuffer: '',
  typingTimer: null,
  blindModeOverride: null,
  cipherOpen: false,
  activeZoneId: 7,
  blueDoorConfirm: false,
  dragSource: null,
  replayActive: false,
  replayPlaying: false,
  replayStep: 1,
  replaySpeed: 1,
  replayTimer: null,
  lastPlayedEventKey: null,
  prevSums: null,
  delegatedRoot: null,
};

let latestCtx = null;
let latestStageEl = null;

function isLocked(r, c) {
  return r === LOCKED_CELL.r && c === LOCKED_CELL.c;
}

function stopReplayTimer() {
  if (uiState.replayTimer) {
    clearInterval(uiState.replayTimer);
    uiState.replayTimer = null;
  }
  uiState.replayPlaying = false;
}

function buildReplayGrid(stepCount) {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  const limit = Math.max(1, Math.min(49, stepCount));
  for (let i = 0; i < limit; i++) {
    const s = SIAMESE_STEPS[i];
    grid[s.r][s.c] = s.num;
  }
  return grid;
}

function getMoveExplanation(step, lang) {
  if (!step) return '';
  if (step.moveType === 'start') {
    return lang === 'zh'
      ? '第 1 步：基石「1」永久铸于首行正中 (R1, C4)。一切规律由此展开。'
      : 'Step 1: Keystone "1" is locked at top-center (R1, C4). The Siamese ritual begins here.';
  }
  if (step.moveType === 'up-right') {
    return lang === 'zh'
      ? `第 ${step.num} 步：自 ${step.num - 1} 向右上方斜行一格 ↗ 落于 (R${step.r + 1}, C${step.c + 1})。`
      : `Step ${step.num}: From ${step.num - 1}, step diagonally UP-RIGHT ↗ to (R${step.r + 1}, C${step.c + 1}).`;
  }
  if (step.moveType === 'wrap-top') {
    return lang === 'zh'
      ? `第 ${step.num} 步：向右上越出顶边！按折返律绕回底行 ↻ 落于 (R${step.r + 1}, C${step.c + 1})。`
      : `Step ${step.num}: Stepping up-right crosses the top rim! Wrap around to the bottom row ↻ at (R${step.r + 1}, C${step.c + 1}).`;
  }
  if (step.moveType === 'wrap-right') {
    return lang === 'zh'
      ? `第 ${step.num} 步：向右上越出右边！按折返律绕回左列 ↻ 落于 (R${step.r + 1}, C${step.c + 1})。`
      : `Step ${step.num}: Stepping up-right crosses the right rim! Wrap around to the left column ↻ at (R${step.r + 1}, C${step.c + 1}).`;
  }
  if (step.moveType === 'wrap-both') {
    return lang === 'zh'
      ? `第 ${step.num} 步：右上角双越界折返落于 (R${step.r + 1}, C${step.c + 1})。`
      : `Step ${step.num}: Corner wrap-around lands at (R${step.r + 1}, C${step.c + 1}).`;
  }
  return lang === 'zh'
    ? `第 ${step.num} 步（逢七折落）：右上方格已被占据！按碰撞律退至 ${step.num - 1} 正下方一格 ↓ (R${step.r + 1}, C${step.c + 1})。`
    : `Step ${step.num} (Collision Drop): Target cell is occupied! Drop one cell directly BELOW ${step.num - 1} ↓ to (R${step.r + 1}, C${step.c + 1}).`;
}

function getEffectiveBlindMode(state) {
  if (uiState.blindModeOverride !== null) return uiState.blindModeOverride;
  return Boolean(state?.blindModeDefault);
}

function getViewSeatId(ctx) {
  const { state, mySeatId } = ctx;
  if (mySeatId && state.players[mySeatId]) return mySeatId;
  return state.seatOrder[0];
}

function buildArrowOverlaySvg(stepsToDraw, highlightLatest = true) {
  if (!stepsToDraw || !stepsToDraw.length) return '';
  const isLight = Theme.get() === 'light';
  const goldStroke = isLight ? '#b45309' : '#fde68a';
  const cyanStroke = isLight ? '#0369a1' : '#38bdf8';

  const cellCenter = (r, c) => {
    const x = ((c + 0.5) / 7.86) * 100;
    const y = ((r + 0.5) / 7.78) * 100;
    return { x, y };
  };

  const parts = [
    `<defs>
      <marker id="gt-arrow-gold" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
        <path d="M0,0.5 L5,3 L0,5.5 Z" fill="${goldStroke}" />
      </marker>
      <marker id="gt-arrow-cyan" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
        <path d="M0,0.5 L5,3 L0,5.5 Z" fill="${cyanStroke}" />
      </marker>
    </defs>`,
  ];

  stepsToDraw.forEach((step, idx) => {
    if (step.fromR == null || step.fromC == null) return;
    const p1 = cellCenter(step.fromR, step.fromC);
    const p2 = cellCenter(step.r, step.c);
    const isLatest = highlightLatest && idx === stepsToDraw.length - 1;
    const isDrop = step.moveType === 'drop-down';
    const isWrap = step.moveType === 'wrap-top' || step.moveType === 'wrap-right' || step.moveType === 'wrap-both';
    const stroke = isDrop ? cyanStroke : goldStroke;
    const marker = isDrop ? 'url(#gt-arrow-cyan)' : 'url(#gt-arrow-gold)';
    const opacity = isLatest ? 0.95 : 0.34;
    const strokeWidth = isLatest ? 0.85 : 0.45;
    const dash = isWrap ? 'stroke-dasharray="1.6 1.1"' : '';

    parts.push(
      `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${dash} marker-end="${marker}" stroke-linecap="round" />`
    );
  });

  return `<svg class="gt-vector-overlay" data-motion-key="gt-vectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${parts.join('')}</svg>`;
}

function renderSandglassSvg(fractionRemaining) {
  const frac = Math.max(0, Math.min(1, fractionRemaining));
  const isLight = Theme.get() === 'light';
  const frameStroke = isLight ? '#9a6e1f' : '#8a6e3b';
  const capFill = isLight ? '#b0883e' : '#d4af6a';
  const bulbStroke = isLight ? 'rgba(148,108,36,0.55)' : 'rgba(242,213,145,0.45)';
  const topHeight = frac * 28;
  const topY = 48 - topHeight;
  const botHeight = (1 - frac) * 28;
  const botY = 84 - botHeight;

  return `
    <svg class="gt-sandglass-svg" data-motion-key="gt-sandglass" viewBox="0 0 64 96" aria-hidden="true">
      <defs>
        <linearGradient id="gt-gold-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#b45309" />
        </linearGradient>
        <clipPath id="gt-top-bulb">
          <path d="M14 14 L50 14 L50 28 C50 40 36 46 32 48 C28 46 14 40 14 28 Z" />
        </clipPath>
        <clipPath id="gt-bot-bulb">
          <path d="M32 48 C36 50 50 56 50 68 L50 84 L14 84 L14 68 C14 56 28 50 32 48 Z" />
        </clipPath>
      </defs>
      <rect x="8" y="6" width="48" height="6" rx="3" fill="${capFill}" />
      <rect x="8" y="84" width="48" height="6" rx="3" fill="${capFill}" />
      <line x1="12" y1="12" x2="12" y2="84" stroke="${frameStroke}" stroke-width="2" />
      <line x1="52" y1="12" x2="52" y2="84" stroke="${frameStroke}" stroke-width="2" />
      <path d="M14 14 L50 14 L50 28 C50 40 36 46 32 48 C28 46 14 40 14 28 Z" fill="rgba(180,134,48,0.06)" stroke="${bulbStroke}" stroke-width="1.5" />
      <path d="M32 48 C36 50 50 56 50 68 L50 84 L14 84 L14 68 C14 56 28 50 32 48 Z" fill="rgba(180,134,48,0.06)" stroke="${bulbStroke}" stroke-width="1.5" />
      <rect id="gt-sand-top" x="12" y="${topY.toFixed(1)}" width="40" height="${(topHeight + 2).toFixed(1)}" fill="url(#gt-gold-sand)" clip-path="url(#gt-top-bulb)" />
      ${frac > 0.005 ? `<line id="gt-sand-stream" x1="32" y1="48" x2="32" y2="${botY.toFixed(1)}" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="3 2" />` : ''}
      <rect id="gt-sand-bot" x="12" y="${botY.toFixed(1)}" width="40" height="${(botHeight + 2).toFixed(1)}" fill="url(#gt-gold-sand)" clip-path="url(#gt-bot-bulb)" />
    </svg>
  `;
}

function renderChoiceRoom(ctx) {
  const { lang, state, isSpectator } = ctx;
  const me = state.players[getViewSeatId(ctx)];
  const decodedCount = me?.decodedZones?.length || 0;
  const isMultiplayer = state.seatOrder.length > 1;

  return `
    <div class="gt-root" data-motion-key="gt-root">
      <section class="gt-choice-room gt-scene-enter" data-motion-key="gt-scene-choice">
        <div class="gt-choice-header">
          <span class="gt-choice-eyebrow">✦ ${lang === 'zh' ? '选择之房 · CHOICE ROOM' : 'THE CHOICE ROOM · DEAD AGAIN'}</span>
          <h1 class="gt-choice-title">
            ${lang === 'zh' ? '死亡重启：你的下一道门' : 'DEAD AGAIN: CHOOSE YOUR DOOR'}
          </h1>
          <p class="gt-choice-sub">
            ${
              lang === 'zh'
                ? '淘汰并非终点。踏入蓝门彻底告别第三季赛场；推开红门，则步入暗石流放地神殿，直面一小时限时复活考验——「神之考验：49魔方阵」。'
                : 'Elimination is not the end. Step through the Blue Door to depart Season 3 forever — or push open the Red Door into the Exile Temple to face the 1-hour resurrection trial: God\'s Test (7×7 Magic Square).'
            }
          </p>
        </div>

        <div class="gt-doors-stage">
          <button type="button" class="gt-door-card is-blue" id="gt-btn-blue-door" data-motion-key="gt-door-blue" ${isSpectator ? 'disabled' : ''}>
            <div class="gt-door-portal">
              <div class="gt-door-glyph">EXIT</div>
              <div class="gt-door-handle"></div>
            </div>
            <div class="gt-door-name is-blue">
              ${lang === 'zh' ? '蓝门 · 告别赛场' : 'BLUE DOOR · RETURN HOME'}
            </div>
            <p class="gt-door-desc">
              ${
                uiState.blueDoorConfirm
                  ? lang === 'zh'
                    ? '⚠ 再次点击将确认退赛结束挑战；若想继续复活试炼，请转身选择红门！'
                    : '⚠ Click again to confirm permanent withdrawal — or turn back and choose the Red Door!'
                  : lang === 'zh'
                  ? '放下执念，体面离开演播室。不再承受流放地与神之考验的煎熬。'
                  : 'Leave the studio with dignity and end your Season 3 journey permanently.'
              }
            </p>
            <span class="dp-btn dp-btn-sm ${uiState.blueDoorConfirm ? 'dp-btn-danger' : 'dp-btn-ghost'}">
              ${
                uiState.blueDoorConfirm
                  ? lang === 'zh'
                    ? '确认推开蓝门离场'
                    : 'Confirm Departure'
                  : lang === 'zh'
                  ? '走向蓝门'
                  : 'Approach Blue Door'
              }
            </span>
          </button>

          <button type="button" class="gt-door-card is-red" id="gt-btn-red-door" data-motion-key="gt-door-red" ${isSpectator ? 'disabled' : ''}>
            <div class="gt-door-portal">
              <div class="gt-door-glyph">𓋹 175</div>
              <div class="gt-door-handle"></div>
            </div>
            <div class="gt-door-name is-red">
              ${lang === 'zh' ? '红门 · 踏入流放神殿' : 'RED DOOR · ENTER EXILE TEMPLE'}
            </div>
            <p class="gt-door-desc">
              ${
                isMultiplayer
                  ? lang === 'zh'
                    ? `开启 ${state.seatOrder.length} 人「神之考验」极速复活竞速！首位完成 7×7 魔方阵（每线之和 175）者独享复活资格。`
                    : `Launch the ${state.seatOrder.length}-player God's Test Speed-Run! First to complete the 7×7 Magic Square (all 16 lines = 175) wins resurrection.`
                  : lang === 'zh'
                  ? '推开猩红石门，在倒计时内将 1–49 填入 7×7 石坛（顶中 1 已锁定），点亮 16 条 175 金纹实现绝地复活！'
                  : 'Push open the crimson gate. Fill 1–49 into the 7×7 basalt tablet (1 locked top-center) so all 16 lines sum to 175!'
              }
            </p>
            <span class="dp-btn dp-btn-sm dp-btn-primary">
              ${lang === 'zh' ? '推开红门 · 开启神之考验 →' : 'Open Red Door · Begin Trial →'}
            </span>
          </button>
        </div>

        <div class="gt-choice-footer">
          <button type="button" class="dp-btn" id="gt-open-cipher">
            🏛 ${lang === 'zh' ? `查验流放地 15 区象形古语墙 (${decodedCount}/15)` : `Inspect 15-Zone Exile Cipher Wall (${decodedCount}/15)`}
          </button>
        </div>
      </section>
      ${uiState.cipherOpen ? renderCipherModal(ctx) : ''}
    </div>
  `;
}

function renderCipherModal(ctx) {
  const { lang, state } = ctx;
  const me = state.players[getViewSeatId(ctx)];
  const decodedSet = new Set(me?.decodedZones || []);
  const activeZone = EXILE_CIPHER_ZONES.find((z) => z.id === uiState.activeZoneId) || EXILE_CIPHER_ZONES[6];
  const isActiveDecoded = decodedSet.has(activeZone.id);

  return `
    <div class="gt-cipher-backdrop" id="gt-cipher-backdrop" data-motion-key="gt-cipher-modal">
      <div class="gt-cipher-modal" role="dialog" aria-modal="true">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div>
            <span class="dp-badge">${lang === 'zh' ? '流放地壁画档案 · EP 4–10' : 'EXILE WALL ARCHIVE · EP 4–10'}</span>
            <h2 style="font-family:var(--dp-font-display);font-size:22px;margin:8px 0 4px;color:var(--dp-brass-bright);">
              ${lang === 'zh' ? '流放地 15 区象形古语墙' : '15-Zone Exile Hieroglyphic Cipher Wall'}
            </h2>
            <p style="margin:0;font-size:13px;color:var(--dp-ink-muted);">
              ${
                lang === 'zh'
                  ? `点击任意石壁区域破译古语铭文（已破译 ${decodedSet.size}/15）。第 VII、XI、XV 区刻有破解神之考验的终极圣典密文！`
                  : `Click stone zones to decode the Exile Wall (Decoded ${decodedSet.size}/15). Zones VII, XI, and XV hold the sacred clues to God's Test!`
              }
            </p>
          </div>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="gt-close-cipher">✕</button>
        </div>

        <div class="gt-cipher-grid">
          ${EXILE_CIPHER_ZONES.map((z) => {
            const dec = decodedSet.has(z.id);
            const act = z.id === activeZone.id;
            return `
              <button
                type="button"
                class="gt-zone-tile ${dec ? 'is-decoded' : ''} ${z.isKeyClue ? 'is-key' : ''} ${act ? 'is-active' : ''}"
                data-zone-id="${z.id}"
                data-motion-key="gt-zone-${z.id}"
              >
                <span class="gt-zone-glyph">${UI.escapeHtml(z.glyph)}</span>
                <span class="gt-zone-code">${UI.escapeHtml(z.code)}</span>
                <span style="font-size:10px;color:${dec ? 'var(--dp-brass-bright)' : 'var(--dp-ink-faint)'};">
                  ${dec ? UI.escapeHtml(z.title[lang]) : lang === 'zh' ? '点击破译' : 'Decode'}
                </span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="gt-cipher-reader" data-motion-key="gt-cipher-reader">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <strong style="color:var(--dp-brass-bright);font-size:14px;">
              ${UI.escapeHtml(activeZone.code)} · ${UI.escapeHtml(activeZone.title[lang])}
            </strong>
            <span style="font-family:var(--dp-font-mono);font-size:12px;color:var(--dp-brass);">
              ${UI.escapeHtml(activeZone.glyph)}
            </span>
          </div>
          <p style="margin:0;font-size:13.5px;color:${isActiveDecoded ? 'var(--dp-ink)' : 'var(--dp-ink-muted)'};line-height:1.65;">
            ${
              isActiveDecoded
                ? UI.escapeHtml(activeZone.decoded[lang])
                : lang === 'zh'
                ? '点击上方对应象形石碑即可破译此区圣言。'
                : 'Click the stone tablet above to decode this zone.'
            }
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderTrialView(ctx) {
  const { state, lang, mySeatId, isSpectator } = ctx;
  const viewSeatId = getViewSeatId(ctx);
  const player = state.players[viewSeatId];
  const isEnded = state.phase === 'ended';
  const canEdit = !isSpectator && !isEnded && player?.status === 'solving' && !uiState.replayActive;
  const blindMode = !uiState.replayActive && getEffectiveBlindMode(state);

  const displayGrid = uiState.replayActive
    ? buildReplayGrid(uiState.replayStep)
    : player?.grid || buildReplayGrid(1);
  const stats = analyzeBoard(displayGrid);

  const elapsed = state.trialStartedAt ? Math.max(0, Date.now() - state.trialStartedAt) : 0;
  const remMs = isEnded
    ? Math.max(0, state.timeLimitMs - (player?.elapsedMs || elapsed))
    : Math.max(0, state.timeLimitMs - elapsed);
  const fracRemaining = state.timeLimitMs > 0 ? Math.max(0, Math.min(1, remMs / state.timeLimitMs)) : 0;
  const remSec = Math.ceil(remMs / 1000);
  const timerCls = remSec <= 60 ? 'is-urgent' : remSec <= 300 ? 'is-warn' : '';

  let overlaySteps = [];
  if (uiState.replayActive) {
    const startIdx = Math.max(1, uiState.replayStep - 4);
    overlaySteps = SIAMESE_STEPS.slice(startIdx, uiState.replayStep);
  } else if (player?.unlockedHintTier >= 2) {
    overlaySteps = SIAMESE_STEPS.slice(1, 8);
  }

  const activeReplayStepObj = uiState.replayActive ? SIAMESE_STEPS[uiState.replayStep - 1] : null;
  const isMultiplayer = state.seatOrder.length > 1;
  const decodedCount = player?.decodedZones?.length || 0;

  const placedSet = new Set();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (displayGrid[r][c] > 0) placedSet.add(displayGrid[r][c]);
    }
  }

  let nextSiameseNum = null;
  if (player?.unlockedHintTier >= 2 && !uiState.replayActive) {
    for (const s of SIAMESE_STEPS) {
      if (!placedSet.has(s.num)) {
        nextSiameseNum = s.num;
        break;
      }
    }
  }

  const sealDots = Array.from({ length: 16 }, (_, i) => {
    return `<span class="gt-sealed-dot ${i < stats.validLinesCount ? 'is-lit' : ''}" data-motion-key="gt-dot-${i}"></span>`;
  }).join('');

  const matrixItems = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = displayGrid[r][c];
      const locked = isLocked(r, c);
      const selected =
        canEdit && uiState.selectedCell && uiState.selectedCell.r === r && uiState.selectedCell.c === c;
      const onGoldLine =
        stats.rowStatus[r] === 'valid' ||
        stats.colStatus[c] === 'valid' ||
        (r === c && stats.diagMainStatus === 'valid') ||
        (r + c === GRID_SIZE - 1 && stats.diagAntiStatus === 'valid');
      const isDup = stats.duplicateCells.has(`${r},${c}`);
      const isCenterHint = !uiState.replayActive && player?.unlockedHintTier >= 1 && r === 3 && c === 3 && val !== 25;
      const isReplayHead =
        activeReplayStepObj && activeReplayStepObj.r === r && activeReplayStepObj.c === c;
      const isReplayDrop = isReplayHead && activeReplayStepObj.moveType === 'drop-down';

      const classes = [
        'gt-cell',
        val > 0 ? 'is-filled' : 'is-empty',
        locked ? 'is-locked' : '',
        selected ? 'is-selected' : '',
        !blindMode && onGoldLine ? 'is-line-gold' : '',
        isDup ? 'is-error' : '',
        isCenterHint ? 'is-center-hint' : '',
        isReplayHead ? 'is-replay-active' : '',
        isReplayDrop ? 'is-replay-drop' : '',
      ]
        .filter(Boolean)
        .join(' ');

      const draggableAttr = canEdit && val > 0 && !locked ? 'draggable="true"' : '';
      matrixItems.push(`
        <button
          type="button"
          class="${classes}"
          data-cell="${r},${c}"
          data-motion-key="gt-cell-${r}-${c}"
          ${draggableAttr}
          aria-label="Row ${r + 1} Col ${c + 1}: ${val || 'empty'}"
        >
          <span class="gt-cell-coord">${r + 1},${c + 1}</span>
          <span class="gt-cell-val">${val > 0 ? val : '·'}</span>
        </button>
      `);
    }

    const rs = stats.rowSums[r];
    const rSt = stats.rowStatus[r];
    matrixItems.push(`
      <div
        class="gt-sum ${blindMode ? 'is-blind' : rSt === 'valid' ? 'is-valid' : rSt === 'error' ? 'is-error' : ''}"
        data-motion-key="gt-rsum-${r}"
        title="Row ${r + 1} Sum"
      >
        <span class="gt-sum-tag">R${r + 1}</span>
        <span data-sum-val="r-${r}">${blindMode ? '···' : rSt === 'valid' ? '175✦' : rs}</span>
      </div>
    `);
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    const cs = stats.colSums[c];
    const cSt = stats.colStatus[c];
    matrixItems.push(`
      <div
        class="gt-sum ${blindMode ? 'is-blind' : cSt === 'valid' ? 'is-valid' : cSt === 'error' ? 'is-error' : ''}"
        data-motion-key="gt-csum-${c}"
        title="Column ${c + 1} Sum"
      >
        <span class="gt-sum-tag">C${c + 1}</span>
        <span data-sum-val="c-${c}">${blindMode ? '···' : cSt === 'valid' ? '175✦' : cs}</span>
      </div>
    `);
  }

  matrixItems.push(`
    <div
      class="gt-sum ${blindMode ? 'is-blind' : stats.diagMainStatus === 'valid' ? 'is-valid' : stats.diagMainStatus === 'error' ? 'is-error' : ''}"
      data-motion-key="gt-dsum-main"
      title="Main Diagonal Sum"
    >
      <span class="gt-sum-tag">↘</span>
      <span data-sum-val="d-main">${blindMode ? '···' : stats.diagMainStatus === 'valid' ? '175✦' : stats.diagMain}</span>
    </div>
  `);

  return {
    stats,
    blindMode,
    html: `
      <div class="gt-root" data-motion-key="gt-root">
        <div class="gt-scene-enter" data-motion-key="gt-scene-trial" style="display:flex;flex-direction:column;gap:16px;">
          <div class="gt-temple-header" data-motion-key="gt-header">
            <div class="gt-temple-brand">
              <div class="gt-seal-ring ${stats.isMagicSquare ? 'is-complete' : ''}">
                ${stats.isMagicSquare ? '175✦' : `${stats.validLinesCount}/16`}
              </div>
              <div class="gt-temple-meta">
                <h2>${lang === 'zh' ? '神之考验 · 49魔方阵圣坛' : "GOD'S TEST · 7×7 BASALT TABLET"}</h2>
                <p>
                  ${
                    lang === 'zh'
                      ? `首行正中「1」永固 · 每行/列/对角线和须为 175 · 已填入 ${stats.filledCount}/49`
                      : `Keystone "1" locked at (1,4) · Every row, column & diagonal = 175 · Placed ${stats.filledCount}/49`
                  }
                </p>
              </div>
            </div>
            <div class="gt-header-actions">
              <button type="button" class="dp-btn dp-btn-sm" id="gt-open-cipher">
                🏛 ${lang === 'zh' ? `15区古语墙 (${decodedCount}/15)` : `15-Zone Cipher (${decodedCount}/15)`}
              </button>
              <button type="button" class="dp-btn dp-btn-sm ${blindMode ? 'dp-btn-primary' : ''}" id="gt-toggle-blind">
                ${
                  blindMode
                    ? lang === 'zh'
                      ? '👁 原剧盲算：开'
                      : '👁 Blind Mode: ON'
                    : lang === 'zh'
                    ? '👁 辅助和值：开'
                    : '👁 Sum Rim: ON'
                }
              </button>
              ${
                isEnded
                  ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="gt-toggle-replay">
                      ${
                        uiState.replayActive
                          ? lang === 'zh'
                            ? '返回我的终局盘'
                            : 'My Final Tablet'
                          : lang === 'zh'
                          ? '▶ 暹罗法 49 步回放'
                          : '▶ Siamese 49-Step Replay'
                      }
                    </button>`
                  : ''
              }
            </div>
          </div>

          ${
            isMultiplayer
              ? `
                <div class="gt-duel-bar" data-motion-key="gt-duel-bar">
                  ${state.seatOrder
                    .map((sid) => {
                      const p = state.players[sid];
                      const isMe = sid === mySeatId;
                      const ratio = Math.max(0, Math.min(1, (p.filledCount - 1) / 48));
                      const statusLabel =
                        p.status === 'resurrected'
                          ? lang === 'zh'
                            ? '✦ 复活通关'
                            : '✦ RESURRECTED'
                          : p.status === 'surrendered'
                          ? lang === 'zh'
                            ? '已放弃'
                            : 'FORFEIT'
                          : p.status === 'eliminated'
                          ? lang === 'zh'
                            ? '已淘汰'
                            : 'ELIMINATED'
                          : `${p.validLinesCount}/16 · ${p.filledCount}/49`;
                      return `
                        <div class="gt-racer-card ${isMe ? 'is-me' : ''} ${p.status === 'resurrected' ? 'is-winner' : ''}" data-motion-key="gt-racer-${UI.escapeHtml(sid)}">
                          <div class="gt-racer-top">
                            <span>${UI.escapeHtml(p.avatar)} ${UI.escapeHtml(p.name)}${isMe ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}</span>
                            <span class="gt-racer-status ${p.status === 'resurrected' ? 'is-win' : ''}">${UI.escapeHtml(statusLabel)}</span>
                          </div>
                          <div class="gt-racer-bar"><div class="gt-racer-fill" style="transform:scaleX(${ratio.toFixed(4)});"></div></div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              `
              : ''
          }

          ${
            uiState.replayActive
              ? `
                <div class="gt-replay-banner" data-motion-key="gt-replay-banner">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                    <strong class="gt-replay-title">
                      ✦ ${lang === 'zh' ? '德拉卢贝尔 / 暹罗法 49 步圣阵演算回放' : 'DE LA LOUBÈRE · SIAMESE METHOD 49-STEP REPLAY'}
                    </strong>
                    <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:13px;color:var(--dp-brass-bright);">
                      STEP ${uiState.replayStep} / 49
                    </span>
                  </div>
                  <div class="gt-replay-controls">
                    <button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="gt-replay-play">
                      ${uiState.replayPlaying ? (lang === 'zh' ? '⏸ 暂停' : '⏸ Pause') : lang === 'zh' ? '▶ 自动演算' : '▶ Play'}
                    </button>
                    <button type="button" class="dp-btn dp-btn-sm" id="gt-replay-prev" ${uiState.replayStep <= 1 ? 'disabled' : ''}>◀ -1</button>
                    <button type="button" class="dp-btn dp-btn-sm" id="gt-replay-next" ${uiState.replayStep >= 49 ? 'disabled' : ''}>+1 ▶</button>
                    <button type="button" class="dp-btn dp-btn-sm" id="gt-replay-speed">${uiState.replaySpeed}×</button>
                    <input type="range" class="gt-replay-slider" id="gt-replay-slider" min="1" max="49" value="${uiState.replayStep}" />
                  </div>
                  <div class="gt-replay-narration">
                    ${UI.escapeHtml(getMoveExplanation(activeReplayStepObj, lang))}
                  </div>
                </div>
              `
              : ''
          }

          <div class="gt-arena">
            <div class="gt-tablet-shell ${stats.isMagicSquare ? 'is-resurrected' : ''}" data-motion-key="gt-tablet-shell">
              <div class="gt-tablet-toprow">
                <div class="gt-sealed-progress">
                  <span>${lang === 'zh' ? '圣线点燃进度' : '175 Seals Ignited'}</span>
                  <span class="gt-sealed-dots">${sealDots}</span>
                  <strong class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">${stats.validLinesCount}/16</strong>
                </div>
                <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:11.5px;color:var(--dp-ink-muted);">
                  ${
                    stats.isMagicSquare
                      ? lang === 'zh'
                        ? '✦ 魔方阵圆满达成 · DEAD AGAIN ✦'
                        : '✦ MAGIC SQUARE COMPLETE · DEAD AGAIN ✦'
                      : canEdit && uiState.selectedCell
                      ? lang === 'zh'
                        ? `当前选中：(R${uiState.selectedCell.r + 1}, C${uiState.selectedCell.c + 1})${uiState.typingBuffer ? ` · 输入中: ${uiState.typingBuffer}_` : ''}`
                        : `Selected: (R${uiState.selectedCell.r + 1}, C${uiState.selectedCell.c + 1})${uiState.typingBuffer ? ` · Typing: ${uiState.typingBuffer}_` : ''}`
                      : ''
                  }
                </div>
              </div>

              <div class="gt-board-wrap">
                <div class="gt-matrix" id="gt-matrix" data-motion-key="gt-matrix">
                  ${matrixItems.join('')}
                </div>
                ${buildArrowOverlaySvg(overlaySteps, true)}
              </div>

              <div class="gt-diag-bar">
                <span class="gt-diag-pill ${blindMode ? '' : stats.diagMainStatus === 'valid' ? 'is-valid' : stats.diagMainStatus === 'error' ? 'is-error' : ''}" data-motion-key="gt-diag-pill-main">
                  <span>↘ ${lang === 'zh' ? '主对角线' : 'Main Diag'}</span>
                  <strong data-sum-val="pill-main">${blindMode ? '···' : `${stats.diagMain} / 175`}</strong>
                </span>
                <span class="gt-diag-pill ${blindMode ? '' : stats.diagAntiStatus === 'valid' ? 'is-valid' : stats.diagAntiStatus === 'error' ? 'is-error' : ''}" data-motion-key="gt-diag-pill-anti">
                  <span>↙ ${lang === 'zh' ? '副对角线' : 'Anti Diag'}</span>
                  <strong data-sum-val="pill-anti">${blindMode ? '···' : `${stats.diagAnti} / 175`}</strong>
                </span>
                <span style="font-size:11.5px;color:var(--dp-ink-faint);">
                  ${
                    lang === 'zh'
                      ? '拖拽石砖可互换位置 · 右键清空单格'
                      : 'Drag tiles to swap · Right-click to clear'
                  }
                </span>
              </div>
            </div>

            <div class="gt-side-dock">
              <div class="gt-card" data-motion-key="gt-timer-card">
                <div class="gt-card-title">
                  <span>⏳ ${lang === 'zh' ? '神殿金沙计时' : 'TEMPLE GOLDEN SANDGLASS'}</span>
                  <span>${UI.escapeHtml(state.timeLimitKey.toUpperCase())}</span>
                </div>
                <div class="gt-sandglass-box">
                  ${renderSandglassSvg(fracRemaining)}
                  <div style="flex:1;min-width:0;">
                    <div class="gt-timer-readout ${timerCls}" id="gt-sandglass-time">${UI.formatTime(remMs)}</div>
                    <div class="gt-timer-sub">
                      ${
                        isEnded
                          ? state.endReason === 'resurrected'
                            ? lang === 'zh'
                              ? '神殿大门已开启 · 成功复活！'
                              : 'Temple gates opened · RESURRECTED!'
                            : lang === 'zh'
                            ? '试炼已终止 · 可启动暹罗法回放'
                            : 'Trial ended · Watch Siamese replay'
                          : lang === 'zh'
                          ? '超时未完成全部 16 条 175 线将永久淘汰'
                          : 'Complete all 16 lines to 175 before sand runs out'
                      }
                    </div>
                    <div class="gt-sand-bar-track">
                      <div class="gt-sand-bar-fill" id="gt-sand-bar-fill" style="transform:scaleX(${fracRemaining.toFixed(4)});"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="gt-card" data-motion-key="gt-palette-card">
                <div class="gt-card-title">
                  <span>🪨 ${lang === 'zh' ? '数字石砖库 (2–49)' : 'STONE TILE PALETTE (2–49)'}</span>
                  <span>${49 - stats.filledCount} ${lang === 'zh' ? '剩余' : 'left'}</span>
                </div>
                <div class="gt-palette-grid" id="gt-palette">
                  ${Array.from({ length: 48 }, (_, idx) => {
                    const n = idx + 2;
                    const placed = placedSet.has(n);
                    const isNext = nextSiameseNum === n;
                    return `
                      <button
                        type="button"
                        class="gt-pal-btn ${placed ? 'is-placed' : ''} ${isNext ? 'is-next-siamese' : ''}"
                        data-pal-num="${n}"
                        data-motion-key="gt-pal-${n}"
                        ${canEdit ? 'draggable="true"' : 'disabled'}
                        title="${placed ? (lang === 'zh' ? '已放置（点击移动至选中格）' : 'Placed (click to move to selected cell)') : ''}"
                      >${n}</button>
                    `;
                  }).join('')}
                </div>

                <div class="gt-toolbar">
                  <button type="button" class="dp-btn dp-btn-sm" id="gt-btn-undo" ${!canEdit || !player?.canUndo ? 'disabled' : ''}>
                    ↶ ${lang === 'zh' ? '撤销' : 'Undo'}
                  </button>
                  <button type="button" class="dp-btn dp-btn-sm" id="gt-btn-clear-cell" ${!canEdit ? 'disabled' : ''}>
                    ⌫ ${lang === 'zh' ? '清空选中' : 'Clear Cell'}
                  </button>
                  <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="gt-btn-clear-all" ${!canEdit ? 'disabled' : ''}>
                    ✕ ${lang === 'zh' ? '重置盘面' : 'Reset'}
                  </button>
                  ${
                    canEdit
                      ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-danger" id="gt-btn-surrender" style="margin-left:auto;">
                          ${lang === 'zh' ? '放弃并看解法' : 'Surrender & Replay'}
                        </button>`
                      : ''
                  }
                </div>
                <div class="gt-kbd-hint">
                  ${
                    lang === 'zh'
                      ? '⌨ 快捷键：点选石格后直接输入数字（如 25）、方向键移动、Backspace 清空；或直接拖拽石砖互换。'
                      : '⌨ Keyboard: click a cell & type 2–49, Arrow keys to move, Backspace to clear, or drag tiles to swap.'
                  }
                </div>
              </div>

              <div class="gt-card" data-motion-key="gt-hint-card">
                <div class="gt-card-title">
                  <span>🔮 ${lang === 'zh' ? '神殿神谕提示（阶梯式）' : 'TIERED HINT ORACLE'}</span>
                  <span>${player?.hintsUsed || 0} ${lang === 'zh' ? '次' : 'used'}</span>
                </div>
                <div class="gt-hint-tiers">
                  <button type="button" class="dp-btn dp-btn-sm gt-hint-btn" data-hint-tier="1" ${!canEdit ? 'disabled' : ''}>
                    <span>I · ${lang === 'zh' ? '常数 175 与天枢对称律' : 'Constant 175 & Center Symmetry'}</span>
                    <span style="color:var(--dp-brass);">${player?.unlockedHintTier >= 1 ? '✓' : lang === 'zh' ? '揭示' : 'Reveal'}</span>
                  </button>
                  <button type="button" class="dp-btn dp-btn-sm gt-hint-btn" data-hint-tier="2" ${!canEdit ? 'disabled' : ''}>
                    <span>II · ${lang === 'zh' ? '暹罗法右上斜行箭头图' : 'Siamese Diagonal Vector Overlay'}</span>
                    <span style="color:var(--dp-brass);">${player?.unlockedHintTier >= 2 ? '✓' : lang === 'zh' ? '揭示' : 'Reveal'}</span>
                  </button>
                  <button type="button" class="dp-btn dp-btn-sm gt-hint-btn" data-hint-tier="3" ${!canEdit ? 'disabled' : ''}>
                    <span>III · ${lang === 'zh' ? '神谕落子（自动推演下一步）' : 'Oracle Step (Place Next Tile)'}</span>
                    <span style="color:var(--dp-amber);">✦</span>
                  </button>
                </div>
                ${
                  player?.unlockedHintTier >= 1
                    ? `
                      <div class="gt-hint-scroll">
                        ${
                          player.unlockedHintTier >= 2
                            ? lang === 'zh'
                              ? '<strong>【二级神谕 · 暹罗法】</strong>从顶中 <code>1</code> 出发，不断向<b>右上斜行一格</b>（越顶折底行，越右折左列）；若目标格已被占（逢 7 的倍数后），改放到<b>当前数正下方一格</b>！图中虚线箭头已绘出前 8 步轨迹。'
                              : '<strong>[Tier II · Siamese Method]</strong> Starting from <code>1</code> at top-center, repeatedly step <b>UP-RIGHT</b> (wrap top→bottom, right→left). If occupied (after every multiple of 7), drop <b>1 cell BELOW</b>! Vectors on the tablet show the opening 8 steps.'
                            : lang === 'zh'
                            ? '<strong>【一级神谕 · 天枢居中】</strong>1~49 总和为 1225，平分 7 行故每线 = <code>175</code>。中位数 <code>25</code> 必镇最中心格 <code>(R4, C4)</code>（已蓝框标出），且关于中心对称的两格之和恒为 <code>50</code>！'
                            : '<strong>[Tier I · Center Keystone]</strong> Sum(1..49) = 1225, so each of 7 lines = <code>175</code>. Median <code>25</code> always sits at dead-center <code>(R4, C4)</code> (outlined in cyan), and opposite cells always sum to <code>50</code>!'
                        }
                      </div>
                    `
                    : ''
                }
              </div>
            </div>
          </div>
        </div>

        ${uiState.cipherOpen ? renderCipherModal(ctx) : ''}
      </div>
    `,
  };
}

function animateSumDeltas(container, stats, blindMode) {
  if (blindMode || !stats) {
    uiState.prevSums = null;
    return;
  }
  const prev = uiState.prevSums;
  if (prev) {
    for (let r = 0; r < GRID_SIZE; r++) {
      if (prev.rows[r] !== stats.rowSums[r]) {
        const el = container.querySelector(`[data-sum-val="r-${r}"]`);
        const isValid = stats.rowStatus[r] === 'valid';
        Motion.animateNumber(el, prev.rows[r], stats.rowSums[r], {
          duration: 240,
          format: (v) => (isValid && Math.round(v) === 175 ? '175✦' : String(Math.round(v))),
        });
        if (stats.rowStatus[r] === 'error') {
          Motion.shake(container.querySelector(`[data-motion-key="gt-rsum-${r}"]`));
        }
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      if (prev.cols[c] !== stats.colSums[c]) {
        const el = container.querySelector(`[data-sum-val="c-${c}"]`);
        const isValid = stats.colStatus[c] === 'valid';
        Motion.animateNumber(el, prev.cols[c], stats.colSums[c], {
          duration: 240,
          format: (v) => (isValid && Math.round(v) === 175 ? '175✦' : String(Math.round(v))),
        });
        if (stats.colStatus[c] === 'error') {
          Motion.shake(container.querySelector(`[data-motion-key="gt-csum-${c}"]`));
        }
      }
    }
    if (prev.main !== stats.diagMain) {
      const el = container.querySelector('[data-sum-val="d-main"]');
      const isValid = stats.diagMainStatus === 'valid';
      Motion.animateNumber(el, prev.main, stats.diagMain, {
        duration: 240,
        format: (v) => (isValid && Math.round(v) === 175 ? '175✦' : String(Math.round(v))),
      });
    }
  }
  uiState.prevSums = {
    rows: stats.rowSums.slice(),
    cols: stats.colSums.slice(),
    main: stats.diagMain,
    anti: stats.diagAnti,
  };
}

function setupDelegatedHandlers(container) {
  if (uiState.delegatedRoot === container) return;
  uiState.delegatedRoot = container;

  // Click delegation for all buttons & cells
  Motion.delegate(
    container,
    'click',
    'button, #gt-cipher-backdrop',
    async (e, target) => {
      if (!latestCtx) return;
      const { state, dispatch, lang, sfx, ui, isSpectator } = latestCtx;

      // Backdrop click closes cipher modal
      if (target.id === 'gt-cipher-backdrop') {
        if (e.target === target) {
          uiState.cipherOpen = false;
          renderStage(container, latestCtx);
        }
        return;
      }

      if (target.id === 'gt-btn-red-door') {
        if (isSpectator) return;
        sfx.play('reveal');
        uiState.blueDoorConfirm = false;
        dispatch({ type: 'ENTER_RED_DOOR' });
        return;
      }

      if (target.id === 'gt-btn-blue-door') {
        if (isSpectator) return;
        if (!uiState.blueDoorConfirm) {
          sfx.play('click');
          uiState.blueDoorConfirm = true;
          renderStage(container, latestCtx);
        } else {
          sfx.play('eliminate');
          dispatch({ type: 'CHOOSE_BLUE_DOOR' });
        }
        return;
      }

      if (target.id === 'gt-open-cipher') {
        sfx.play('cardFlip');
        uiState.cipherOpen = true;
        renderStage(container, latestCtx);
        return;
      }

      if (target.id === 'gt-close-cipher') {
        sfx.play('click');
        uiState.cipherOpen = false;
        renderStage(container, latestCtx);
        return;
      }

      if (target.dataset.zoneId) {
        const zoneId = Number(target.dataset.zoneId);
        uiState.activeZoneId = zoneId;
        sfx.play('pieceGain');
        if (!isSpectator && state.phase !== 'ended') {
          dispatch({ type: 'DECODE_ZONE', payload: { zoneId } });
        } else {
          renderStage(container, latestCtx);
        }
        return;
      }

      if (target.id === 'gt-toggle-blind') {
        sfx.play('click');
        uiState.blindModeOverride = !getEffectiveBlindMode(state);
        renderStage(container, latestCtx);
        return;
      }

      if (target.id === 'gt-toggle-replay') {
        sfx.play('reveal');
        uiState.replayActive = !uiState.replayActive;
        if (uiState.replayActive) {
          uiState.replayStep = 1;
          startReplayPlayback();
        } else {
          stopReplayTimer();
        }
        renderStage(container, latestCtx);
        return;
      }

      if (target.id === 'gt-replay-play') {
        sfx.play('click');
        if (uiState.replayPlaying) {
          stopReplayTimer();
          renderStage(container, latestCtx);
        } else {
          if (uiState.replayStep >= 49) uiState.replayStep = 1;
          startReplayPlayback();
        }
        return;
      }

      if (target.id === 'gt-replay-prev') {
        stopReplayTimer();
        sfx.play('click');
        uiState.replayStep = Math.max(1, uiState.replayStep - 1);
        renderStage(container, latestCtx);
        return;
      }

      if (target.id === 'gt-replay-next') {
        stopReplayTimer();
        sfx.play('tilePlace');
        uiState.replayStep = Math.min(49, uiState.replayStep + 1);
        renderStage(container, latestCtx);
        return;
      }

      if (target.id === 'gt-replay-speed') {
        sfx.play('click');
        uiState.replaySpeed = uiState.replaySpeed === 1 ? 2 : uiState.replaySpeed === 2 ? 4 : 1;
        if (uiState.replayPlaying) {
          stopReplayTimer();
          startReplayPlayback();
        } else {
          renderStage(container, latestCtx);
        }
        return;
      }

      if (target.dataset.cell) {
        if (uiState.replayActive || state.phase !== 'trial' || isSpectator) return;
        const [r, c] = target.dataset.cell.split(',').map(Number);
        if (isLocked(r, c)) {
          sfx.play('bid');
          Motion.shake(target);
          ui.toast(
            lang === 'zh'
              ? '首行正中「1」为神殿永固基石，不可移动。'
              : 'Keystone "1" at top-center is permanently locked.'
          );
          return;
        }
        sfx.play('click');
        uiState.selectedCell = { r, c };
        uiState.typingBuffer = '';
        renderStage(container, latestCtx);
        return;
      }

      if (target.dataset.palNum) {
        if (uiState.replayActive || state.phase !== 'trial' || isSpectator) return;
        const num = Number(target.dataset.palNum);
        const sel = uiState.selectedCell;
        if (!sel || isLocked(sel.r, sel.c)) {
          Motion.shake(target);
          ui.toast(lang === 'zh' ? '请先在石坛上选择一个空格。' : 'Select a cell on the tablet first.');
          return;
        }
        sfx.play('tilePlace');
        dispatch({ type: 'PLACE_NUMBER', payload: { r: sel.r, c: sel.c, num } });
        return;
      }

      if (target.id === 'gt-btn-undo') {
        sfx.play('click');
        dispatch({ type: 'UNDO' });
        return;
      }

      if (target.id === 'gt-btn-clear-cell') {
        const sel = uiState.selectedCell;
        if (!sel || isLocked(sel.r, sel.c)) return;
        sfx.play('click');
        dispatch({ type: 'CLEAR_CELL', payload: { r: sel.r, c: sel.c } });
        return;
      }

      if (target.id === 'gt-btn-clear-all') {
        const ok = await ui.confirm(
          lang === 'zh' ? '重置整个石坛？' : 'Clear Entire Tablet?',
          lang === 'zh' ? '将清空除基石「1」以外的所有数字砖块。' : 'Removes all placed tiles except locked keystone 1.'
        );
        if (ok) {
          sfx.play('cardFlip');
          dispatch({ type: 'CLEAR_BOARD' });
        }
        return;
      }

      if (target.id === 'gt-btn-surrender') {
        const ok = await ui.confirm(
          lang === 'zh' ? '放弃试炼并观看 49 步暹罗法解法？' : 'Surrender & Watch 49-Step Siamese Solution?',
          lang === 'zh'
            ? '本次挑战将判为失败，但你可以立刻在石坛上观看完整的 49 步动态演算回放。'
            : 'This ends your trial as a forfeit and unlocks the interactive 49-step animated Siamese replay.'
        );
        if (ok) {
          sfx.play('eliminate');
          uiState.replayActive = true;
          uiState.replayStep = 1;
          dispatch({ type: 'SURRENDER' });
        }
        return;
      }

      if (target.dataset.hintTier) {
        const tier = Number(target.dataset.hintTier);
        sfx.play(tier === 3 ? 'pieceGain' : 'reveal');
        dispatch({ type: 'USE_HINT', payload: { tier } });
      }
    },
    'gt-click'
  );

  // Right-click clear cell
  Motion.delegate(
    container,
    'contextmenu',
    '[data-cell]',
    (e, cellEl) => {
      e.preventDefault();
      if (!latestCtx) return;
      const { state, dispatch, sfx, isSpectator } = latestCtx;
      if (uiState.replayActive || state.phase !== 'trial' || isSpectator) return;
      const [r, c] = cellEl.dataset.cell.split(',').map(Number);
      if (isLocked(r, c)) {
        Motion.shake(cellEl);
        return;
      }
      const player = state.players[getViewSeatId(latestCtx)];
      if (player?.grid?.[r]?.[c] > 0) {
        sfx.play('click');
        dispatch({ type: 'CLEAR_CELL', payload: { r, c } });
      }
    },
    'gt-ctxmenu'
  );

  // Replay slider input
  Motion.delegate(
    container,
    'input',
    '#gt-replay-slider',
    (e, slider) => {
      stopReplayTimer();
      uiState.replayStep = Number(slider.value) || 1;
      if (latestCtx) renderStage(container, latestCtx);
    },
    'gt-replay-input'
  );

  // Drag-and-drop swap delegation
  Motion.delegate(
    container,
    'dragstart',
    '[data-cell], [data-pal-num]',
    (e, el) => {
      if (!latestCtx || uiState.replayActive || latestCtx.state.phase !== 'trial') {
        e.preventDefault();
        return;
      }
      if (el.dataset.cell) {
        const [r, c] = el.dataset.cell.split(',').map(Number);
        if (isLocked(r, c)) {
          e.preventDefault();
          return;
        }
        uiState.dragSource = { type: 'cell', r, c };
        e.dataTransfer?.setData('text/plain', `cell:${r},${c}`);
      } else if (el.dataset.palNum) {
        const num = Number(el.dataset.palNum);
        uiState.dragSource = { type: 'palette', num };
        e.dataTransfer?.setData('text/plain', `pal:${num}`);
      }
    },
    'gt-dragstart'
  );

  Motion.delegate(
    container,
    'dragover',
    '[data-cell]',
    (e, cellEl) => {
      if (!latestCtx || uiState.replayActive || latestCtx.state.phase !== 'trial') return;
      const [r, c] = cellEl.dataset.cell.split(',').map(Number);
      if (isLocked(r, c)) return;
      e.preventDefault();
      cellEl.classList.add('is-drag-over');
    },
    'gt-dragover'
  );

  Motion.delegate(
    container,
    'dragleave',
    '[data-cell]',
    (_e, cellEl) => {
      cellEl.classList.remove('is-drag-over');
    },
    'gt-dragleave'
  );

  Motion.delegate(
    container,
    'drop',
    '[data-cell]',
    (e, cellEl) => {
      e.preventDefault();
      cellEl.classList.remove('is-drag-over');
      if (!latestCtx || uiState.replayActive || latestCtx.state.phase !== 'trial' || !uiState.dragSource) return;
      const [r, c] = cellEl.dataset.cell.split(',').map(Number);
      if (isLocked(r, c)) {
        Motion.shake(cellEl);
        return;
      }
      const src = uiState.dragSource;
      uiState.dragSource = null;
      uiState.selectedCell = { r, c };
      if (src.type === 'cell') {
        if (src.r !== r || src.c !== c) {
          latestCtx.sfx.play('tilePlace');
          latestCtx.dispatch({ type: 'SWAP_CELLS', payload: { r1: src.r, c1: src.c, r2: r, c2: c } });
        }
      } else if (src.type === 'palette') {
        latestCtx.sfx.play('tilePlace');
        latestCtx.dispatch({ type: 'PLACE_NUMBER', payload: { r, c, num: src.num } });
      }
    },
    'gt-drop'
  );
}

function startReplayPlayback() {
  stopReplayTimer();
  uiState.replayPlaying = true;
  const intervalMs = Math.round(620 / uiState.replaySpeed);
  uiState.replayTimer = setInterval(() => {
    if (!uiState.replayActive || !latestStageEl || !latestCtx) {
      stopReplayTimer();
      return;
    }
    if (uiState.replayStep >= 49) {
      stopReplayTimer();
      SFX.play('victory');
      renderStage(latestStageEl, latestCtx);
      return;
    }
    uiState.replayStep += 1;
    SFX.play(uiState.replayStep % 7 === 1 ? 'pieceGain' : 'tilePlace');
    renderStage(latestStageEl, latestCtx);
  }, intervalMs);
}

function renderStage(container, ctx) {
  latestStageEl = container;
  latestCtx = ctx;
  setupDelegatedHandlers(container);

  if (ctx.state.phase === 'prelude') {
    uiState.prevSums = null;
    Motion.patchDOM(container, renderChoiceRoom(ctx));
  } else {
    const view = renderTrialView(ctx);
    Motion.patchDOM(container, view.html);
    animateSumDeltas(container, view.stats, view.blindMode);
  }
}

// Re-render SVG arrows & sandglass palette smoothly on Dark <-> Light toggle
Theme.onChange(() => {
  if (latestStageEl && latestCtx) {
    renderStage(latestStageEl, latestCtx);
  }
});

// Global keyboard handler
window.addEventListener('keydown', (e) => {
  if (!latestCtx || !latestStageEl) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const { state, dispatch, isSpectator } = latestCtx;

  if (e.key === 'Escape' && uiState.cipherOpen) {
    uiState.cipherOpen = false;
    renderStage(latestStageEl, latestCtx);
    return;
  }

  if (state.phase !== 'trial' || isSpectator || uiState.replayActive) return;
  const sel = uiState.selectedCell;
  if (!sel) return;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    let { r, c } = sel;
    if (e.key === 'ArrowUp') r = (r + GRID_SIZE - 1) % GRID_SIZE;
    if (e.key === 'ArrowDown') r = (r + 1) % GRID_SIZE;
    if (e.key === 'ArrowLeft') c = (c + GRID_SIZE - 1) % GRID_SIZE;
    if (e.key === 'ArrowRight') c = (c + 1) % GRID_SIZE;
    uiState.selectedCell = { r, c };
    uiState.typingBuffer = '';
    SFX.play('click');
    renderStage(latestStageEl, latestCtx);
    return;
  }

  if (e.key === 'Backspace' || e.key === 'Delete') {
    if (isLocked(sel.r, sel.c)) {
      Motion.shake(latestStageEl.querySelector(`[data-motion-key="gt-cell-${sel.r}-${sel.c}"]`));
      return;
    }
    e.preventDefault();
    uiState.typingBuffer = '';
    SFX.play('click');
    dispatch({ type: 'CLEAR_CELL', payload: { r: sel.r, c: sel.c } });
    return;
  }

  if (/^[0-9]$/.test(e.key)) {
    if (isLocked(sel.r, sel.c)) {
      Motion.shake(latestStageEl.querySelector(`[data-motion-key="gt-cell-${sel.r}-${sel.c}"]`));
      return;
    }
    e.preventDefault();
    clearTimeout(uiState.typingTimer);

    const candidate = uiState.typingBuffer + e.key;
    const candNum = Number(candidate);
    if (candidate.length === 1) {
      if (candNum >= 5 && candNum <= 9) {
        uiState.typingBuffer = '';
        SFX.play('tilePlace');
        dispatch({ type: 'PLACE_NUMBER', payload: { r: sel.r, c: sel.c, num: candNum } });
      } else if (candNum >= 1 && candNum <= 4) {
        uiState.typingBuffer = candidate;
        renderStage(latestStageEl, latestCtx);
        uiState.typingTimer = setTimeout(() => {
          const n = Number(uiState.typingBuffer);
          uiState.typingBuffer = '';
          if (n >= 2 && n <= 49) {
            SFX.play('tilePlace');
            dispatch({ type: 'PLACE_NUMBER', payload: { r: sel.r, c: sel.c, num: n } });
          } else {
            SFX.play('error');
            Motion.shake(latestStageEl?.querySelector(`[data-motion-key="gt-cell-${sel.r}-${sel.c}"]`));
            if (latestStageEl && latestCtx) renderStage(latestStageEl, latestCtx);
          }
        }, 650);
      } else {
        SFX.play('error');
        Motion.shake(latestStageEl.querySelector(`[data-motion-key="gt-cell-${sel.r}-${sel.c}"]`));
      }
    } else if (candidate.length === 2) {
      uiState.typingBuffer = '';
      if (candNum >= 2 && candNum <= 49) {
        SFX.play('tilePlace');
        dispatch({ type: 'PLACE_NUMBER', payload: { r: sel.r, c: sel.c, num: candNum } });
      } else {
        SFX.play('error');
        Motion.shake(latestStageEl.querySelector(`[data-motion-key="gt-cell-${sel.r}-${sel.c}"]`));
        renderStage(latestStageEl, latestCtx);
      }
    }
  }
});

// Live 1-second sandglass & GPU progress bar ticker (strictly patches timer/bar — NEVER re-renders 7×7 grid!)
setInterval(() => {
  if (!latestCtx || !latestStageEl || latestCtx.state.phase !== 'trial') return;
  const { trialStartedAt, timeLimitMs } = latestCtx.state;
  if (!trialStartedAt || !timeLimitMs) return;
  const remMs = Math.max(0, timeLimitMs - (Date.now() - trialStartedAt));
  const frac = Math.max(0, Math.min(1, remMs / timeLimitMs));
  const remSec = Math.ceil(remMs / 1000);

  const el = latestStageEl.querySelector('#gt-sandglass-time');
  if (el) {
    el.textContent = UI.formatTime(remMs);
    el.classList.toggle('is-warn', remSec <= 300 && remSec > 60);
    el.classList.toggle('is-urgent', remSec <= 60);
  }
  const fill = latestStageEl.querySelector('#gt-sand-bar-fill');
  if (fill) Motion.setProgress(fill, frac);
}, 1000);

mountGame({
  config: {
    id: 'gods-test',
    title: { zh: '神之考验：49魔方阵', en: "God's Test: 7×7 Magic Square", ko: '신의 시험 (7×7 마방진)' },
    category: 'EXILE',
    episode: 'EP 7–10',
    minPlayers: 1,
    maxPlayers: 4,
    defaultPlayers: 1,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'timeLimit',
        label: { zh: '限时挑战', en: 'Trial Timer' },
        type: 'select',
        default: '60m',
        choices: [
          { value: '60m', label: { zh: '60 分钟（原剧标准）', en: '60 Min (Original)' } },
          { value: '30m', label: { zh: '30 分钟（进阶）', en: '30 Min (Standard)' } },
          { value: '15m', label: { zh: '15 分钟（极速竞速）', en: '15 Min (Blitz)' } },
        ],
      },
      {
        key: 'blindMode',
        label: { zh: '原剧盲算模式（默认隐藏行/列和）', en: 'Original Blind Mode (Hide Rim Sums)' },
        type: 'boolean',
        default: false,
      },
      {
        key: 'skipPrelude',
        label: { zh: '跳过「选择之房」红蓝门序幕', en: 'Skip Choice Room Prelude' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 流放地隐藏复活关：神之考验（EP 7–10）
- **背景序幕**：被淘汰的选手进入「选择之房」，推开**红门**即踏入古神殿流放地，可查验墙壁上 15 个区域的象形古语铭文。
- **核心任务**：在倒计时（原剧为 **60 分钟**）内，将数字 **1 至 49**（不重复）全部填入 **7×7** 石刻方阵中。
- **永固基石**：首行正中 **(第 1 行第 4 列)** 已永久锁定熔金数字 **\`1\`**，不可移动。
- **复活通关条件**：全部 **7 条横行、7 条竖列、2 条主对角线**（共 16 条圣线）各自之和**全部恰好等于 \`175\`**。
- **数学解法（德拉卢贝尔法 / 暹罗法）**：从 \`1\` 出发不断向右上方斜行一格（越顶折底、越右折左）；若目标格已有数字，则改落于当前数字的正下方一格。
- **多人极速竞速（2–4人）**：所有选手各自独立破阵，实时追踪对手点燃 175 圣线的进度，首位通关者独享「DEAD AGAIN」复活资格！`,
      en: `### Exile Zone Resurrection Stage: God's Test (EP 7–10)
- **The Choice Room**: Eliminated challengers face the Blue Door (depart permanently) and the Red Door (enter the Exile Temple). Inspect the 15-Zone Hieroglyphic Wall for sacred clues.
- **Core Trial**: Within the countdown (**60 minutes** in the original broadcast), fill numbers **1 through 49** (no repeats) into the **7×7** basalt tablet.
- **Locked Keystone**: Molten gold **\`1\`** is permanently sealed at top-center **(Row 1, Col 4)**.
- **Victory Condition**: All **7 rows, 7 columns, and 2 main diagonals** (16 lines total) must each sum to **\`175\`**.
- **Siamese Method (De la Loubère)**: From \`1\`, step diagonally UP-RIGHT (wrapping top→bottom and right→left). Whenever a target cell is occupied, drop 1 cell directly BELOW your current tile instead.
- **Multiplayer Speed-Run (2–4p)**: Race simultaneously on isolated tablets; first challenger to ignite all 16 lines to 175 wins resurrection (**DEAD AGAIN**)!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render(container, ctx) {
    const ev = ctx.lastEvent;
    const evKey = ev ? `${ev.type}-${ev.ts || ''}-${ev.r ?? ''}-${ev.c ?? ''}-${ev.num ?? ''}` : null;
    if (ev && evKey !== uiState.lastPlayedEventKey) {
      uiState.lastPlayedEventKey = evKey;
      if (ev.type === 'LINE_IGNITED' && ev.seatId === ctx.mySeatId) {
        ctx.sfx.play('pieceGain');
        ctx.log(
          ctx.lang === 'zh'
            ? `✦ 点燃一条 175 圣线！（当前 ${ev.validLinesCount}/16）`
            : `✦ Ignited a 175 sacred line! (${ev.validLinesCount}/16)`,
          'system'
        );
      } else if (ev.type === 'RESURRECTED') {
        ctx.sfx.play('victory');
      } else if (ev.type === 'USE_HINT' && ev.tier === 3 && ev.oracleStep && ev.seatId === ctx.mySeatId) {
        uiState.selectedCell = { r: ev.oracleStep.r, c: ev.oracleStep.c };
      } else if (ev.type === 'MATCH_START') {
        stopReplayTimer();
        uiState.replayActive = false;
        uiState.replayStep = 1;
        uiState.blueDoorConfirm = false;
        uiState.cipherOpen = false;
        uiState.blindModeOverride = null;
        uiState.prevSums = null;
        uiState.selectedCell = { r: 6, c: 4 };
      }
    }

    renderStage(container, ctx);
  },
});

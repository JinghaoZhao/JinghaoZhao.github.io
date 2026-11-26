import { mountGame, SFX, UI, Motion, Theme } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

const ISO_YAW = Math.PI / 4;
const ISO_PITCH = Math.atan(1 / Math.sqrt(2)); // ~35.264° true isometric

const localUi = {
  inputVal: '',
  yaw: ISO_YAW,
  pitch: ISO_PITCH,
  sliceLayer: 99,
  xray: false,
  dragging: false,
  lastX: 0,
  lastY: 0,
  lastRoundSeen: 0,
  lastPhaseSeen: '',
  lastEventSig: '',
  tickerHandle: null,
  canvasEl: null,
  lastCtx: null,
  delegated: false,
  themeSubscribed: false,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function projectPoint(x, y, z, yaw, pitch, scale, cx, cy) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  const rx = x * cosY - y * sinY;
  const ry = x * sinY + y * cosY;
  const rz = z;

  const sx = cx + rx * scale;
  const sy = cy + (ry * sinP - rz * cosP) * scale;
  const depth = ry * cosP + rz * sinP;
  return { sx, sy, depth };
}

function getCubePalette() {
  const isLight = Theme.get() === 'light';
  if (isLight) {
    return {
      gridEdge: 'rgba(148, 108, 36, 0.48)',
      gridInner: 'rgba(148, 108, 36, 0.20)',
      topA: '#ffffff',
      topB: '#eae5da',
      topHiA: '#f2dca4',
      topHiB: '#d6b66f',
      side1A: '#d4cdc0',
      side1B: '#bfb6a6',
      side2A: '#b2a896',
      side2B: '#998e7c',
      strokeTop: 'rgba(138, 102, 34, 0.80)',
      strokeSide: 'rgba(110, 82, 32, 0.45)',
      halo: 'rgba(180, 134, 48, 0.08)',
    };
  }
  return {
    gridEdge: 'rgba(212, 175, 106, 0.38)',
    gridInner: 'rgba(212, 175, 106, 0.14)',
    topA: '#363d52',
    topB: '#23283a',
    topHiA: '#5a4a2a',
    topHiB: '#312819',
    side1A: '#1d2232',
    side1B: '#121622',
    side2A: '#141824',
    side2B: '#0b0e17',
    strokeTop: 'rgba(232, 200, 128, 0.72)',
    strokeSide: 'rgba(212, 175, 106, 0.34)',
    halo: 'rgba(242, 213, 145, 0.08)',
  };
}

function drawObsidianCube(ctx2d, x, y, z, yaw, pitch, scale, cx, cy, isHidden, xrayMode, highlightTop, pal) {
  const p = (dx, dy, dz) => projectPoint(x + dx, y + dy, z + dz, yaw, pitch, scale, cx, cy);

  const v000 = p(0, 0, 0);
  const v100 = p(1, 0, 0);
  const v110 = p(1, 1, 0);
  const v010 = p(0, 1, 0);
  const v001 = p(0, 0, 1);
  const v101 = p(1, 0, 1);
  const v111 = p(1, 1, 1);
  const v011 = p(0, 1, 1);

  const faces = [
    { pts: [v001, v101, v111, v011], normal: [0, 0, 1], kind: 'top' },
    { pts: [v100, v110, v111, v101], normal: [1, 0, 0], kind: 'px' },
    { pts: [v010, v110, v111, v011], normal: [0, 1, 0], kind: 'py' },
    { pts: [v000, v010, v011, v001], normal: [-1, 0, 0], kind: 'nx' },
    { pts: [v000, v100, v101, v001], normal: [0, -1, 0], kind: 'ny' },
  ];

  const camX = Math.sin(yaw) * Math.cos(pitch);
  const camY = Math.cos(yaw) * Math.cos(pitch);
  const camZ = Math.sin(pitch);
  const alpha = xrayMode ? (isHidden ? 0.94 : 0.24) : 1.0;

  for (const face of faces) {
    const dot = face.normal[0] * camX + face.normal[1] * camY + face.normal[2] * camZ;
    if (dot <= 0.01) continue;

    ctx2d.save();
    ctx2d.globalAlpha = alpha;
    ctx2d.beginPath();
    ctx2d.moveTo(face.pts[0].sx, face.pts[0].sy);
    for (let i = 1; i < 4; i++) ctx2d.lineTo(face.pts[i].sx, face.pts[i].sy);
    ctx2d.closePath();

    if (isHidden && xrayMode) {
      if (face.kind === 'top') ctx2d.fillStyle = '#f59e0b';
      else if (face.kind === 'px' || face.kind === 'nx') ctx2d.fillStyle = '#b45309';
      else ctx2d.fillStyle = '#78350f';
    } else if (face.kind === 'top') {
      const grad = ctx2d.createLinearGradient(face.pts[0].sx, face.pts[0].sy, face.pts[2].sx, face.pts[2].sy);
      grad.addColorStop(0, highlightTop ? pal.topHiA : pal.topA);
      grad.addColorStop(1, highlightTop ? pal.topHiB : pal.topB);
      ctx2d.fillStyle = grad;
    } else if (face.kind === 'px' || face.kind === 'nx') {
      const grad = ctx2d.createLinearGradient(face.pts[0].sx, face.pts[0].sy, face.pts[2].sx, face.pts[2].sy);
      grad.addColorStop(0, pal.side1A);
      grad.addColorStop(1, pal.side1B);
      ctx2d.fillStyle = grad;
    } else {
      const grad = ctx2d.createLinearGradient(face.pts[0].sx, face.pts[0].sy, face.pts[2].sx, face.pts[2].sy);
      grad.addColorStop(0, pal.side2A);
      grad.addColorStop(1, pal.side2B);
      ctx2d.fillStyle = grad;
    }
    ctx2d.fill();

    ctx2d.lineWidth = face.kind === 'top' ? 1.45 : 1.05;
    ctx2d.strokeStyle =
      isHidden && xrayMode
        ? 'rgba(255, 232, 165, 0.95)'
        : face.kind === 'top'
        ? pal.strokeTop
        : pal.strokeSide;
    ctx2d.stroke();
    ctx2d.restore();
  }
}

function renderCubeCanvas(canvas, puzzle, opts) {
  if (!canvas || !puzzle) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(300, Math.round(rect.width));
  const h = Math.max(260, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx2d = canvas.getContext('2d');
  const pal = getCubePalette();
  ctx2d.save();
  ctx2d.scale(dpr, dpr);
  ctx2d.clearRect(0, 0, w, h);

  const G = puzzle.gridSize;
  const maxH = Math.max(1, puzzle.maxHeight);
  const scale = Math.min(w / (G * 1.95), h / (G * 1.45 + maxH * 0.72));
  const cx = w * 0.5;
  const cy = h * 0.56 + (maxH - 2) * scale * 0.24;
  const half = G / 2;

  ctx2d.save();
  for (let gx = 0; gx <= G; gx++) {
    const a = projectPoint(gx - half, -half, 0, opts.yaw, opts.pitch, scale, cx, cy);
    const b = projectPoint(gx - half, half, 0, opts.yaw, opts.pitch, scale, cx, cy);
    ctx2d.beginPath();
    ctx2d.moveTo(a.sx, a.sy);
    ctx2d.lineTo(b.sx, b.sy);
    ctx2d.strokeStyle = gx === 0 || gx === G ? pal.gridEdge : pal.gridInner;
    ctx2d.lineWidth = gx === 0 || gx === G ? 1.5 : 1;
    ctx2d.stroke();
  }
  for (let gy = 0; gy <= G; gy++) {
    const a = projectPoint(-half, gy - half, 0, opts.yaw, opts.pitch, scale, cx, cy);
    const b = projectPoint(half, gy - half, 0, opts.yaw, opts.pitch, scale, cx, cy);
    ctx2d.beginPath();
    ctx2d.moveTo(a.sx, a.sy);
    ctx2d.lineTo(b.sx, b.sy);
    ctx2d.strokeStyle = gy === 0 || gy === G ? pal.gridEdge : pal.gridInner;
    ctx2d.lineWidth = gy === 0 || gy === G ? 1.5 : 1;
    ctx2d.stroke();
  }
  ctx2d.restore();

  const cubes = [];
  const layerLimit = opts.isReveal ? opts.sliceLayer : 99;
  for (let x = 0; x < G; x++) {
    for (let y = 0; y < G; y++) {
      const colH = puzzle.heights[x][y];
      const shownH = Math.min(colH, layerLimit);
      for (let z = 0; z < shownH; z++) {
        const covTop = z + 1 < colH;
        const covX = x + 1 < G && puzzle.heights[x + 1][y] > z;
        const covY = y + 1 < G && puzzle.heights[x][y + 1] > z;
        const isHidden = covTop && covX && covY;
        const wx = x - half;
        const wy = y - half;
        const center = projectPoint(wx + 0.5, wy + 0.5, z + 0.5, opts.yaw, opts.pitch, scale, cx, cy);
        cubes.push({
          wx,
          wy,
          z,
          depth: center.depth,
          isHidden,
          highlightTop: opts.isReveal && z === layerLimit - 1,
        });
      }
    }
  }

  cubes.sort((a, b) => a.depth - b.depth);

  for (const c of cubes) {
    drawObsidianCube(
      ctx2d, c.wx, c.wy, c.z, opts.yaw, opts.pitch, scale, cx, cy,
      c.isHidden, opts.isReveal && opts.xray, c.highlightTop, pal
    );
  }

  const halo = ctx2d.createRadialGradient(cx, h * 0.14, 10, cx, h * 0.4, w * 0.55);
  halo.addColorStop(0, pal.halo);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx2d.fillStyle = halo;
  ctx2d.fillRect(0, 0, w, h);

  ctx2d.restore();
}

function redrawFromState() {
  const c = localUi.lastCtx;
  if (!c || !localUi.canvasEl || !localUi.canvasEl.isConnected) return;
  const isReveal = c.state.phase === 'reveal' || c.state.phase === 'finished';
  renderCubeCanvas(localUi.canvasEl, c.state.puzzle, {
    yaw: localUi.yaw,
    pitch: localUi.pitch,
    sliceLayer: localUi.sliceLayer,
    xray: localUi.xray,
    isReveal,
  });
}

function formatSec(ms) {
  return (Math.max(0, ms) / 1000).toFixed(1) + 's';
}

mountGame({
  config: {
    id: 'count-the-cubes',
    title: { zh: '数方块', en: 'Count the Cubes', ko: '큐브 세기' },
    category: 'MAIN MATCH · MINI-GAME',
    episode: 'EP 1',
    minPlayers: 1,
    maxPlayers: 16,
    defaultPlayers: 4,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'rounds',
        label: { zh: '题数', en: 'Rounds' },
        type: 'select',
        default: '3',
        choices: [
          { value: '1', label: { zh: '1 题速决', en: '1 Round Blitz' } },
          { value: '3', label: { zh: '3 题递进 (初/中/高)', en: '3 Progressive Rounds' } },
        ],
      },
      {
        key: 'timeLimit',
        label: { zh: '每题限时', en: 'Round Timer' },
        type: 'select',
        default: '90',
        choices: [
          { value: '60', label: { zh: '60 秒', en: '60s' } },
          { value: '90', label: { zh: '90 秒 (标准)', en: '90s (Standard)' } },
          { value: '120', label: { zh: '120 秒', en: '120s' } },
        ],
      },
      {
        key: 'allowOrbit',
        label: { zh: '答题时允许自由 360° 旋转 (练习模式)', en: 'Free 360° Orbit While Guessing (Practice)' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 游戏目标
观察中央 3D 立体堆叠方块塔，在限时内准确心算出**方块总个数**（包含被前方高柱遮挡、遵守重力支撑原理的底层隐藏方块）。

### 核心规则
- **重力无悬空公理**：每一个悬浮在空中的顶层方块下方都必定有实心支撑方块。
- **20 秒红激光锁定**：若提交错误答案，个人终端立即进入 **20 秒红色锁定冷却**，期间无法再次作答！
- **竞速计分**：按答对先后排名发放胜点（前 25% +4 分，前 50% +3 分，前 75% +2 分，其余答对 +1 分）。
- **透视验证**：每轮揭晓阶段解锁 **360° 自由旋转**、**分层切片** 与 **X-Ray 透视**，直观验算每一层与所有隐藏支撑块！`,
      en: `### Objective
Inspect the 3D isometric cube tower and calculate the **exact total number of unit cubes** — including hidden support cubes underneath tall columns!

### Core Rules
- **Gravity Axiom**: No floating cubes exist. Every visible top cube is supported all the way down to the floor grid.
- **20-Second Lockout**: Submitting an incorrect total triggers a **20.0s Crimson Laser Lockout** on your terminal!
- **Speed Scoring**: Ranked by earliest accurate submission (+4 / +3 / +2 / +1 pts).
- **Post-Round Verification**: Reveal phase unlocks **full 360° 3D orbit**, **Z-Layer Slicing**, and **X-Ray Hidden Cube Vision** to prove the exact count!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx, lastEvent } = ctx;
    localUi.lastCtx = ctx;

    if (!localUi.themeSubscribed) {
      localUi.themeSubscribed = true;
      Theme.onChange(() => redrawFromState());
    }

    if (state.round !== localUi.lastRoundSeen || state.phase !== localUi.lastPhaseSeen) {
      if (state.round !== localUi.lastRoundSeen) {
        Motion.cancelSpring('ctc-cam');
        localUi.inputVal = '';
        localUi.yaw = ISO_YAW;
        localUi.pitch = ISO_PITCH;
        localUi.sliceLayer = state.puzzle.maxHeight;
        localUi.xray = false;
      } else if (state.phase === 'reveal') {
        localUi.sliceLayer = state.puzzle.maxHeight;
        sfx.play('reveal');
      }
      localUi.lastRoundSeen = state.round;
      localUi.lastPhaseSeen = state.phase;
    }

    const evSig = lastEvent ? JSON.stringify(lastEvent) : '';
    let shouldShakeTerminal = false;
    if (evSig && evSig !== localUi.lastEventSig) {
      localUi.lastEventSig = evSig;
      if (lastEvent.type === 'SOLVED' && lastEvent.seatId === mySeatId) sfx.play('pieceGain');
      else if (lastEvent.type === 'LOCKOUT' && lastEvent.seatId === mySeatId) {
        sfx.play('eliminate');
        shouldShakeTerminal = true;
      }
    }

    const me = mySeatId ? state.roundPlayers[mySeatId] : null;
    const now = Date.now();
    const lockRem = me && me.lockedUntil > now ? me.lockedUntil - now : 0;
    const isReveal = state.phase === 'reveal' || state.phase === 'finished';
    const canOrbitFull = isReveal || state.options.allowOrbit;

    const shownCubesUpToSlice = isReveal && state.puzzle.layerCounts
      ? state.puzzle.layerCounts.slice(0, localUi.sliceLayer).reduce((a, b) => a + b, 0)
      : null;

    const sortedSeats = [...state.seats].sort((a, b) => {
      const sa = state.scores[a.seatId] || 0;
      const sb = state.scores[b.seatId] || 0;
      if (sb !== sa) return sb - sa;
      const ra = state.solveOrder.indexOf(a.seatId);
      const rb = state.solveOrder.indexOf(b.seatId);
      if (ra !== -1 && rb !== -1) return ra - rb;
      if (ra !== -1) return -1;
      if (rb !== -1) return 1;
      return 0;
    });

    const html = `
      <div class="ctc-layout" data-motion-key="ctc-layout">
        <section class="ctc-viewport-card" data-motion-key="ctc-viewport">
          <div class="ctc-viewport-header">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="ctc-tier-pill ${state.puzzle.tier === 'hard' ? 'is-hard' : ''}">
                ${lang === 'zh' ? `第 ${state.round}/${state.totalRounds} 题` : `ROUND ${state.round}/${state.totalRounds}`}
                · ${UI.escapeHtml(state.puzzle.tierLabel[lang] || state.puzzle.tierLabel.en)}
              </span>
            </div>
            <span class="dp-tabular" style="font-size:12px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
              ${state.puzzle.gridSize}×${state.puzzle.gridSize} · H≤${state.puzzle.maxHeight}
            </span>
          </div>

          <div class="ctc-canvas-wrap" id="ctc-canvas-wrap" data-motion-key="ctc-canvas-wrap">
            <canvas class="ctc-canvas" id="ctc-canvas" data-motion-key="ctc-canvas"></canvas>
            ${
              isReveal
                ? `<div class="ctc-reveal-banner dp-enter" data-motion-key="ctc-rev-banner">
                    ${lang === 'zh' ? '精确总数' : 'EXACT TOTAL'}: ${state.puzzle.totalCubes}
                    · ${lang === 'zh' ? '隐藏支撑块' : 'HIDDEN'}: ${state.puzzle.hiddenCount}
                   </div>`
                : ''
            }
          </div>

          <div class="ctc-viewport-footer">
            <div class="ctc-viewport-hint">
              ${
                canOrbitFull
                  ? (lang === 'zh' ? '拖拽可 360° 旋转检视立体结构' : 'Drag to orbit 360° around structure')
                  : (lang === 'zh' ? '标准单视角（可微幅拖拽感受立体层次 · 揭晓后解锁 360° 透视）' : 'Authentic single-view (subtle tilt · 360° unlocks on reveal)')
              }
            </div>
            <div class="ctc-orbit-controls">
              <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="ctc-reset-cam">
                ${lang === 'zh' ? '重置视角' : 'Reset View'}
              </button>
            </div>
          </div>

          ${
            isReveal
              ? `
                <div class="ctc-layer-bar" data-motion-key="ctc-layer-bar">
                  <span id="ctc-layer-label" style="font-size:12px;color:var(--dp-brass-bright);font-weight:700;white-space:nowrap;">
                    ${lang === 'zh' ? `层数切片 (1–${localUi.sliceLayer}层)` : `LAYER SLICE (1–${localUi.sliceLayer})`}
                  </span>
                  <input type="range" id="ctc-layer-slider" min="1" max="${state.puzzle.maxHeight}" value="${Math.min(localUi.sliceLayer, state.puzzle.maxHeight)}" />
                  <span id="ctc-layer-count" class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:12.5px;color:var(--dp-ink);">
                    ${shownCubesUpToSlice} / ${state.puzzle.totalCubes}
                  </span>
                  <button type="button" class="dp-btn dp-btn-sm ${localUi.xray ? 'dp-btn-primary' : ''}" id="ctc-xray-btn">
                    ${lang === 'zh' ? (localUi.xray ? 'X-Ray 透视: 开' : '透视隐藏块') : (localUi.xray ? 'X-Ray: ON' : 'X-Ray Hidden')}
                  </button>
                </div>
              `
              : ''
          }
        </section>

        <aside class="ctc-side-stack" data-motion-key="ctc-side">
          <div class="ctc-terminal" id="ctc-terminal" data-motion-key="ctc-terminal">
            <div class="ctc-terminal-label">
              <span>${lang === 'zh' ? '参赛者答题终端' : 'CONTESTANT TERMINAL'}</span>
              <span class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-ink-muted);">
                ${me ? (lang === 'zh' ? `错误 ${me.wrongAttempts} 次` : `Misses: ${me.wrongAttempts}`) : (lang === 'zh' ? '观战中' : 'SPECTATING')}
              </span>
            </div>

            ${
              isReveal
                ? `
                  <div class="ctc-solved-overlay is-reveal" data-motion-key="ctc-term-reveal">
                    <div style="font-size:12px;letter-spacing:0.12em;color:var(--dp-brass);font-weight:700;margin-bottom:4px;">
                      ${lang === 'zh' ? '本题答案揭晓' : 'ROUND ANSWER REVEALED'}
                    </div>
                    <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:42px;font-weight:800;color:var(--dp-brass-bright);line-height:1.1;">
                      ${state.puzzle.totalCubes}
                    </div>
                    <div class="dp-tabular" style="font-size:12.5px;color:var(--dp-ink-muted);margin-top:6px;">
                      ${lang === 'zh'
                        ? `各层数量：${(state.puzzle.layerCounts || []).map((c, i) => `L${i + 1}:${c}`).join(' · ')}`
                        : `By layer: ${(state.puzzle.layerCounts || []).map((c, i) => `L${i + 1}:${c}`).join(' · ')}`}
                    </div>
                    ${
                      state.phase === 'reveal'
                        ? `<button type="button" class="dp-btn dp-btn-primary ctc-submit-btn" id="ctc-next-btn" style="margin-top:14px;">
                            ${state.round >= state.totalRounds
                              ? (lang === 'zh' ? '查看最终排名 →' : 'Final Verdict →')
                              : (lang === 'zh' ? `进入第 ${state.round + 1} 题 →` : `Next Round (${state.round + 1}/${state.totalRounds}) →`)}
                           </button>`
                        : ''
                    }
                  </div>
                `
                : !me
                ? `<p style="color:var(--dp-ink-muted);font-size:13px;text-align:center;margin:20px 0;">
                    ${lang === 'zh' ? '正在观战本轮速算竞速...' : 'Spectating live cube speed-count...'}
                   </p>`
                : me.solvedAt
                ? `
                  <div class="ctc-solved-overlay" data-motion-key="ctc-term-solved">
                    <div style="font-size:12px;letter-spacing:0.12em;color:var(--dp-emerald);font-weight:700;">
                      ✓ ${lang === 'zh' ? '精确命中！' : 'EXACT MATCH!'}
                    </div>
                    <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:32px;font-weight:800;color:var(--dp-ink);margin:6px 0;">
                      #${state.solveOrder.indexOf(mySeatId) + 1} · ${formatSec(me.solveTimeMs)}
                    </div>
                    <div style="font-size:12.5px;color:var(--dp-ink-muted);">
                      ${lang === 'zh' ? '等待其他选手完成本轮或倒计时结束...' : 'Waiting for remaining players or timer...'}
                    </div>
                  </div>
                `
                : `
                  <div data-motion-key="ctc-term-input">
                    <div class="ctc-display">
                      <span style="font-size:11px;color:var(--dp-ink-faint);letter-spacing:0.08em;">CUBES</span>
                      <span class="ctc-display-num ${localUi.inputVal ? '' : 'is-placeholder'}" id="ctc-display-num">
                        ${localUi.inputVal || (lang === 'zh' ? '输入总数' : 'ENTER')}
                      </span>
                    </div>
                    <div class="ctc-keypad">
                      ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫']
                        .map(
                          (k) => `<button type="button" class="ctc-key ${k === 'CLR' || k === '⌫' ? 'ctc-key-fn' : ''}" data-key="${k}" ${lockRem > 0 ? 'disabled' : ''}>${k}</button>`
                        )
                        .join('')}
                    </div>
                    <button type="button" class="dp-btn dp-btn-primary ctc-submit-btn" id="ctc-submit" ${lockRem > 0 || !localUi.inputVal ? 'disabled' : ''}>
                      ${lang === 'zh' ? '提交精确总数' : 'LOCK IN ANSWER'}
                    </button>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                      <span style="font-size:11.5px;color:var(--dp-ink-faint);">
                        ${lang === 'zh' ? '支持键盘直接输入 + Enter' : 'Keyboard digits + Enter supported'}
                      </span>
                      <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="ctc-giveup" style="font-size:11px;">
                        ${lang === 'zh' ? '放弃并揭晓' : 'Reveal'}
                      </button>
                    </div>
                  </div>
                `
            }

            ${
              lockRem > 0 && !isReveal && me && !me.solvedAt
                ? `
                  <div class="ctc-lockout-overlay" id="ctc-lockout-overlay" data-motion-key="ctc-lockout">
                    <div class="ctc-lockout-laser" aria-hidden="true"></div>
                    <div class="ctc-lockout-badge">⚠ ${lang === 'zh' ? '回答错误 · 终端锁定' : 'WRONG GUESS · PENALTY LOCKOUT'}</div>
                    <div class="ctc-lockout-time" id="ctc-lockout-time">${formatSec(lockRem)}</div>
                    <div style="font-size:12.5px;color:#ffd0d5;margin-top:10px;">
                      ${lang === 'zh' ? `上次提交 ${me.lastGuess} 不正确，请重新核对隐藏支撑块` : `Last guess (${me.lastGuess}) was wrong — re-verify hidden columns!`}
                    </div>
                  </div>
                `
                : ''
            }
          </div>

          <div class="ctc-board-card" data-motion-key="ctc-board-card">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:11.5px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
                ${lang === 'zh' ? '实时竞速榜单' : 'LIVE SPEED RANKING'}
              </span>
              <span class="dp-tabular" style="font-size:11.5px;color:var(--dp-ink-muted);">
                ${state.solveOrder.length}/${state.seats.length} ${lang === 'zh' ? '已解出' : 'solved'}
              </span>
            </div>
            <div class="ctc-rank-list" id="ctc-rank-list">
              ${sortedSeats
                .map((s) => {
                  const rp = state.roundPlayers[s.seatId];
                  const isMe = s.seatId === mySeatId;
                  const isLocked = rp.lockedUntil > now && !rp.solvedAt;
                  const statusHtml = rp.solvedAt
                    ? `<span class="ctc-status-chip is-ok">#${state.solveOrder.indexOf(s.seatId) + 1} · ${formatSec(rp.solveTimeMs)}</span>`
                    : isLocked
                    ? `<span class="ctc-status-chip is-lock">LOCK ${Math.ceil((rp.lockedUntil - now) / 1000)}s</span>`
                    : rp.gaveUp
                    ? `<span class="ctc-status-chip is-wait">PASS</span>`
                    : `<span class="ctc-status-chip is-wait">${lang === 'zh' ? '计算中...' : 'COUNTING'}</span>`;
                  return `
                    <div class="ctc-rank-row ${isMe ? 'is-me' : ''} ${rp.solvedAt ? 'is-solved' : isLocked ? 'is-locked' : ''}" data-motion-key="ctc-rank-${UI.escapeHtml(s.seatId)}">
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        <strong style="color:var(--dp-brass);margin-right:5px;">${UI.escapeHtml(s.avatar || '◆')}</strong>
                        ${UI.escapeHtml(s.name)}
                      </span>
                      <span style="display:flex;align-items:center;gap:8px;">
                        ${statusHtml}
                        <strong class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);min-width:44px;text-align:right;">
                          ${state.scores[s.seatId] || 0}pt
                        </strong>
                      </span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </aside>
      </div>
    `;

    const rankElBefore = container.querySelector('#ctc-rank-list');
    const prevRankRects = rankElBefore ? Motion.captureFlip(rankElBefore) : null;

    Motion.patchDOM(container, html);

    const rankElAfter = container.querySelector('#ctc-rank-list');
    if (rankElAfter && prevRankRects && prevRankRects.size > 0) {
      Motion.playFlip(rankElAfter, prevRankRects);
    }

    if (shouldShakeTerminal) {
      Motion.shake(container.querySelector('#ctc-terminal'));
    }

    localUi.canvasEl = container.querySelector('#ctc-canvas');
    redrawFromState();

    // Idempotent Event Delegation (binds once on container!)
    if (!localUi.delegated) {
      localUi.delegated = true;

      const updateInputDisplay = () => {
        const c = localUi.lastCtx;
        if (!c) return;
        const myRp = c.mySeatId ? c.state.roundPlayers[c.mySeatId] : null;
        const numEl = container.querySelector('#ctc-display-num');
        const subBtn = container.querySelector('#ctc-submit');
        if (numEl) {
          numEl.textContent = localUi.inputVal || (c.lang === 'zh' ? '输入总数' : 'ENTER');
          numEl.classList.toggle('is-placeholder', !localUi.inputVal);
        }
        if (subBtn) subBtn.disabled = !localUi.inputVal || (myRp && myRp.lockedUntil > Date.now());
      };

      const submitGuess = async () => {
        const c = localUi.lastCtx;
        if (!c || !localUi.inputVal) return;
        const val = Number(localUi.inputVal);
        localUi.inputVal = '';
        updateInputDisplay();
        c.sfx.play('bid');
        const res = await c.dispatch({ type: 'SUBMIT_GUESS', payload: { guess: val } });
        if (!res.ok) {
          Motion.shake(container.querySelector('#ctc-terminal'));
          if (res.reason) UI.toast(res.reason, 'error');
        }
      };

      // Pointer drag-orbit on persistent canvas wrapper (cancels active spring!)
      Motion.delegate(container, 'pointerdown', '#ctc-canvas-wrap', (e, wrap) => {
        if (e.target.closest('button')) return;
        Motion.cancelSpring('ctc-cam');
        localUi.dragging = true;
        localUi.lastX = e.clientX;
        localUi.lastY = e.clientY;
        wrap.setPointerCapture?.(e.pointerId);
      }, 'ctc-pd');

      Motion.delegate(container, 'pointermove', '#ctc-canvas-wrap', (e) => {
        if (!localUi.dragging || !localUi.lastCtx) return;
        const c = localUi.lastCtx;
        const isRev = c.state.phase === 'reveal' || c.state.phase === 'finished';
        const full = isRev || c.state.options.allowOrbit;
        const dx = e.clientX - localUi.lastX;
        const dy = e.clientY - localUi.lastY;
        localUi.lastX = e.clientX;
        localUi.lastY = e.clientY;
        if (full) {
          localUi.yaw += dx * 0.01;
          localUi.pitch = clamp(localUi.pitch + dy * 0.008, 0.25, 1.32);
        } else {
          localUi.yaw = clamp(localUi.yaw + dx * 0.006, ISO_YAW - 0.18, ISO_YAW + 0.18);
          localUi.pitch = clamp(localUi.pitch + dy * 0.005, ISO_PITCH - 0.12, ISO_PITCH + 0.14);
        }
        redrawFromState();
      }, 'ctc-pm');

      Motion.delegate(container, 'pointerup', '#ctc-canvas-wrap', () => {
        localUi.dragging = false;
      }, 'ctc-pu');

      Motion.delegate(container, 'pointercancel', '#ctc-canvas-wrap', () => {
        localUi.dragging = false;
      }, 'ctc-pc');

      // Interruptible spring camera reset
      Motion.delegate(container, 'click', '#ctc-reset-cam', () => {
        localUi.lastCtx?.sfx.play('click');
        Motion.springTo(
          'ctc-cam',
          { yaw: localUi.yaw, pitch: localUi.pitch },
          { yaw: ISO_YAW, pitch: ISO_PITCH },
          {
            duration: 280,
            onUpdate: (v) => {
              localUi.yaw = v.yaw;
              localUi.pitch = v.pitch;
              redrawFromState();
            },
          }
        );
      }, 'ctc-reset');

      Motion.delegate(container, 'input', '#ctc-layer-slider', (e, slider) => {
        const c = localUi.lastCtx;
        if (!c) return;
        localUi.sliceLayer = Number(slider.value);
        c.sfx.play('click');
        const lbl = container.querySelector('#ctc-layer-label');
        const cnt = container.querySelector('#ctc-layer-count');
        if (lbl) lbl.textContent = c.lang === 'zh' ? `层数切片 (1–${localUi.sliceLayer}层)` : `LAYER SLICE (1–${localUi.sliceLayer})`;
        if (cnt && c.state.puzzle.layerCounts) {
          const shown = c.state.puzzle.layerCounts.slice(0, localUi.sliceLayer).reduce((a, b) => a + b, 0);
          cnt.textContent = `${shown} / ${c.state.puzzle.totalCubes}`;
        }
        redrawFromState();
      }, 'ctc-slice');

      Motion.delegate(container, 'click', '#ctc-xray-btn', (e, xbtn) => {
        const c = localUi.lastCtx;
        if (!c) return;
        localUi.xray = !localUi.xray;
        c.sfx.play('click');
        xbtn.classList.toggle('dp-btn-primary', localUi.xray);
        xbtn.textContent = c.lang === 'zh' ? (localUi.xray ? 'X-Ray 透视: 开' : '透视隐藏块') : (localUi.xray ? 'X-Ray: ON' : 'X-Ray Hidden');
        redrawFromState();
      }, 'ctc-xray');

      Motion.delegate(container, 'click', '[data-key]', (e, btn) => {
        const c = localUi.lastCtx;
        if (!c) return;
        c.sfx.play('click');
        const k = btn.dataset.key;
        if (k === 'CLR') localUi.inputVal = '';
        else if (k === '⌫') localUi.inputVal = localUi.inputVal.slice(0, -1);
        else if (localUi.inputVal.length < 3) localUi.inputVal += k;
        updateInputDisplay();
      }, 'ctc-key');

      Motion.delegate(container, 'click', '#ctc-submit', () => submitGuess(), 'ctc-sub');
      Motion.delegate(container, 'click', '#ctc-giveup', () => {
        localUi.lastCtx?.sfx.play('click');
        localUi.lastCtx?.dispatch({ type: 'GIVE_UP' });
      }, 'ctc-giveup');
      Motion.delegate(container, 'click', '#ctc-next-btn', () => {
        localUi.lastCtx?.sfx.play('click');
        localUi.lastCtx?.dispatch({ type: 'NEXT_ROUND' });
      }, 'ctc-next');

      if (window._ctcKeyHandler) window.removeEventListener('keydown', window._ctcKeyHandler);
      window._ctcKeyHandler = (e) => {
        const c = localUi.lastCtx;
        if (!c) return;
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        const myRp = c.mySeatId ? c.state.roundPlayers[c.mySeatId] : null;
        if (c.state.phase !== 'playing' || !myRp || myRp.solvedAt || myRp.lockedUntil > Date.now()) return;
        if (e.key >= '0' && e.key <= '9' && localUi.inputVal.length < 3) {
          localUi.inputVal += e.key;
          c.sfx.play('click');
          updateInputDisplay();
        } else if (e.key === 'Backspace') {
          localUi.inputVal = localUi.inputVal.slice(0, -1);
          updateInputDisplay();
        } else if (e.key === 'Enter' && localUi.inputVal) {
          submitGuess();
        }
      };
      window.addEventListener('keydown', window._ctcKeyHandler);
    }

    // Live 250ms ticker updates ONLY lockout text + Host bot pulse (never wipes DOM or canvas!)
    clearInterval(localUi.tickerHandle);
    let botPulseCounter = 0;
    localUi.tickerHandle = setInterval(() => {
      const curCtx = localUi.lastCtx;
      if (!curCtx || curCtx.state.phase !== 'playing') return;
      const nowMs = Date.now();
      const myRp = curCtx.mySeatId ? curCtx.state.roundPlayers[curCtx.mySeatId] : null;
      const lockEl = document.getElementById('ctc-lockout-time');
      if (myRp && myRp.lockedUntil > 0) {
        const rem = myRp.lockedUntil - nowMs;
        if (rem > 0 && lockEl) {
          lockEl.textContent = formatSec(rem);
        } else if (rem <= 0 && document.getElementById('ctc-lockout-overlay')) {
          Motion.exit(document.getElementById('ctc-lockout-overlay'), { variant: 'fade', remove: true, timeoutMs: 160 });
          container.querySelectorAll('.ctc-key').forEach((b) => (b.disabled = false));
          const sub = document.getElementById('ctc-submit');
          if (sub) sub.disabled = !localUi.inputVal;
        }
      }
      botPulseCounter += 1;
      if (curCtx.isHost && botPulseCounter % 4 === 0) {
        const hasBots = curCtx.state.seats.some((s) => s.isBot && !curCtx.state.roundPlayers[s.seatId].solvedAt);
        if (hasBots) curCtx.dispatch({ type: 'PROCESS_BOTS' });
      }
    }, 250);
  },
});

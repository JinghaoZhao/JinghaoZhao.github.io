import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import { GameRules, evaluateSlitherlink } from './rules.js';

let drawTool = 'fence'; // 'fence' | 'cross'
let showSolutionToggle = false;
let lastSolvedTs = 0;
let prevBranchErrors = 0;
let latestCtx = null;

function renderBoardSvg(N, clues, h, v, ev, interactive) {
  const pad = 34;
  const cell = 64;
  const vb = pad * 2 + N * cell;

  let cellsSvg = '';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const val = clues[r][c];
      const cx = pad + c * cell + cell / 2;
      const cy = pad + r * cell + cell / 2;
      const st = ev.cellStatus[r][c];
      const bg = st === 'ok'
        ? 'var(--lf-cell-ok-bg)'
        : st === 'over'
        ? 'var(--lf-cell-over-bg)'
        : 'var(--lf-cell-bg)';
      const fill = st === 'ok'
        ? 'var(--lf-clue-ok)'
        : st === 'over'
        ? 'var(--lf-clue-over)'
        : 'var(--lf-clue-neutral)';
      cellsSvg += `
        <g data-motion-key="lf-cell-${r}-${c}">
          <rect x="${pad + c * cell + 3}" y="${pad + r * cell + 3}" width="${cell - 6}" height="${cell - 6}" rx="6" fill="${bg}"/>
          ${val !== null && val !== undefined
            ? `<text class="lf-clue-text" x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="central" fill="${fill}" font-size="${N === 7 ? 24 : 27}">${val}</text>`
            : ''}
        </g>
      `;
    }
  }

  let edgesSvg = '';
  const drawEdge = (orient, r, c, x1, y1, x2, y2, stateVal) => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const hitAttrs = interactive
      ? `class="lf-edge-hit" data-orient="${orient}" data-r="${r}" data-c="${c}"`
      : `fill="none" stroke="none"`;

    let visual = '';
    if (stateVal === 1) {
      visual = `<line class="lf-edge-fence" data-motion-key="lf-f-${orient}-${r}-${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    } else if (stateVal === -1) {
      visual = `
        <g data-motion-key="lf-x-${orient}-${r}-${c}" pointer-events="none">
          <line x1="${mx - 6}" y1="${my - 6}" x2="${mx + 6}" y2="${my + 6}" stroke="var(--dp-crimson-bright)" stroke-width="2.6" stroke-linecap="round"/>
          <line x1="${mx + 6}" y1="${my - 6}" x2="${mx - 6}" y2="${my + 6}" stroke="var(--dp-crimson-bright)" stroke-width="2.6" stroke-linecap="round"/>
        </g>
      `;
    }

    edgesSvg += `
      <g data-motion-key="lf-e-${orient}-${r}-${c}">
        <line ${hitAttrs} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
        <line class="lf-edge-guide" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
        ${visual}
      </g>
    `;
  };

  for (let r = 0; r <= N; r++) {
    for (let c = 0; c < N; c++) {
      drawEdge('h', r, c, pad + c * cell, pad + r * cell, pad + (c + 1) * cell, pad + r * cell, h[r][c]);
    }
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= N; c++) {
      drawEdge('v', r, c, pad + c * cell, pad + r * cell, pad + c * cell, pad + (r + 1) * cell, v[r][c]);
    }
  }

  let dotsSvg = '';
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c <= N; c++) {
      const cx = pad + c * cell;
      const cy = pad + r * cell;
      const deg = ev.vertexDeg[r][c];
      const errHalo = deg > 2
        ? `<circle cx="${cx}" cy="${cy}" r="12" fill="rgba(239,68,68,0.24)" stroke="var(--dp-crimson-bright)" stroke-width="2"/>`
        : '';
      const dotFill = deg > 2
        ? 'var(--dp-crimson-bright)'
        : deg === 2
        ? 'var(--lf-dot-active)'
        : 'var(--lf-dot-idle)';
      dotsSvg += `<g data-motion-key="lf-dot-${r}-${c}" pointer-events="none">${errHalo}<circle cx="${cx}" cy="${cy}" r="${deg === 2 ? 5.2 : 4.2}" fill="${dotFill}" stroke="var(--lf-dot-ring)" stroke-width="1.4"/></g>`;
    }
  }

  return `
    <svg data-motion-key="lf-svg-${N}" viewBox="0 0 ${vb} ${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Loop Fence Slitherlink Grid">
      <rect x="4" y="4" width="${vb - 8}" height="${vb - 8}" rx="12" fill="var(--lf-svg-bg)" stroke="var(--dp-border-strong)" stroke-width="2"/>
      <g data-motion-key="lf-cells">${cellsSvg}</g>
      <g data-motion-key="lf-edges">${edgesSvg}</g>
      <g data-motion-key="lf-dots">${dotsSvg}</g>
    </svg>
  `;
}

function ensureDelegation(container) {
  const applyEdgeToggle = (lineEl, wantCross) => {
    const ctx = latestCtx;
    if (!ctx) return;
    const { state, sfx, dispatch } = ctx;
    const board = state.myBoard;
    if (!board || board.finished || state.phase === 'ended') return;
    const orient = lineEl.dataset.orient;
    const r = Number(lineEl.dataset.r);
    const c = Number(lineEl.dataset.c);
    const cur = orient === 'h' ? board.h[r][c] : board.v[r][c];
    let next;
    if (wantCross) {
      next = cur === -1 ? 0 : -1;
      sfx.play('click');
    } else {
      next = cur === 1 ? 0 : 1;
      sfx.play(next === 1 ? 'tilePlace' : 'click');
    }
    dispatch({ type: 'SET_EDGE', payload: { orient, r, c, value: next } });
  };

  Motion.delegate(container, 'click', '.lf-edge-hit', (e, el) => {
    e.preventDefault();
    applyEdgeToggle(el, drawTool === 'cross');
  }, 'lf-edge-click');

  Motion.delegate(container, 'contextmenu', '.lf-edge-hit', (e, el) => {
    e.preventDefault();
    applyEdgeToggle(el, true);
  }, 'lf-edge-ctx');

  Motion.delegate(container, 'click', '#lf-tool-fence', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    drawTool = 'fence';
    renderLoopFence(container, latestCtx);
  }, 'lf-tool-fence');

  Motion.delegate(container, 'click', '#lf-tool-cross', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    drawTool = 'cross';
    renderLoopFence(container, latestCtx);
  }, 'lf-tool-cross');

  Motion.delegate(container, 'click', '#lf-btn-undo', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    latestCtx.dispatch({ type: 'UNDO', payload: {} });
  }, 'lf-undo');

  Motion.delegate(container, 'click', '#lf-btn-clear', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    latestCtx.dispatch({ type: 'CLEAR_BOARD', payload: {} });
  }, 'lf-clear');

  Motion.delegate(container, 'click', '#lf-btn-giveup', async () => {
    const ctx = latestCtx;
    if (!ctx) return;
    const isZh = ctx.lang === 'zh';
    const ok = await ctx.ui.confirm(
      isZh ? '确认放弃并查看答案？' : 'Surrender & Reveal Solution?',
      isZh ? '结束本局后可切换查看该题的标准闭合环路。' : 'Ends the match so you can inspect the verified solution.'
    );
    if (ok) ctx.dispatch({ type: 'GIVE_UP', payload: {} });
  }, 'lf-giveup');

  Motion.delegate(container, 'click', '#lf-btn-toggle-sol', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    showSolutionToggle = !showSolutionToggle;
    renderLoopFence(container, latestCtx);
  }, 'lf-sol');
}

function renderLoopFence(container, ctx) {
  latestCtx = ctx;
  ensureDelegation(container);

  const { state, mySeatId, lang, sfx, lastEvent } = ctx;
  const isZh = lang === 'zh';
  const N = state.gridSize;
  const board = state.myBoard;
  const ended = state.phase === 'ended';

  if (lastEvent?.type === 'LOOP_SOLVED' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastSolvedTs) {
    lastSolvedTs = lastEvent.ts;
    sfx.play('victory');
  }

  if (!ended) showSolutionToggle = false;

  const emptyH = Array.from({ length: N + 1 }, () => Array(N).fill(0));
  const emptyV = Array.from({ length: N }, () => Array(N + 1).fill(0));

  const displayH = ended && showSolutionToggle && state.solution ? state.solution.h : board ? board.h : emptyH;
  const displayV = ended && showSolutionToggle && state.solution ? state.solution.v : board ? board.v : emptyV;

  const ev = evaluateSlitherlink(N, state.clues, displayH, displayV);
  const canEdit = Boolean(board && !board.finished && !ended);
  const totalRacers = state.racers.length;

  const newBranchError = ev.branchErrors > prevBranchErrors;
  prevBranchErrors = ev.branchErrors;

  const racersHtml = state.racers
    .map((r) => {
      const isMe = r.seatId === mySeatId;
      const cls = [
        'lf-racer-card',
        isMe ? 'is-me' : '',
        r.status === 'survived' ? 'is-survived' : '',
        r.status === 'eliminated' ? 'is-eliminated' : '',
      ].filter(Boolean).join(' ');
      const stat = r.finished && r.finishTimeMs != null
        ? `#${r.rank || '✓'} ${(r.finishTimeMs / 1000).toFixed(1)}s`
        : `${r.progress}%`;
      const ratio = Math.max(0, Math.min(1, r.progress / 100));
      return `
        <div class="${cls}" data-motion-key="racer-${UI.escapeHtml(r.seatId)}">
          <div class="lf-racer-top">
            <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(r.avatar)} ${UI.escapeHtml(r.name)}${isMe ? (isZh ? ' (你)' : ' (You)') : ''}</span>
            <span class="lf-racer-stat dp-tabular">${UI.escapeHtml(stat)}</span>
          </div>
          <div class="lf-bar-track"><div class="lf-bar-fill" data-ratio="${ratio.toFixed(4)}" style="transform-origin: left center; transform: scaleX(${ratio.toFixed(4)});"></div></div>
        </div>
      `;
    })
    .join('');

  const html = `
    <div class="lf-root" data-motion-key="lf-root">
      <section class="lf-temple-banner" data-motion-key="lf-banner">
        <div class="lf-race-header">
          <div class="lf-race-title">
            <span class="lf-torch-dot"></span>
            <span>${isZh ? `流放地数回 · ${N}×${N} 围栏环路` : `EXILE SLITHERLINK · ${N}×${N} LOOP FENCE`}</span>
          </div>
          <div style="font-size:12px;color:var(--dp-ink-muted);">
            ${totalRacers === 1
              ? (isZh ? '单人解谜 · 唯一闭合单环' : 'Solo Puzzle · Single Closed Loop')
              : (isZh ? `前 ${totalRacers - 1} 名闭合存活 · 末位淘汰` : `Top ${totalRacers - 1} Survive · Last Eliminated`)}
          </div>
        </div>
        <div class="lf-race-grid" data-motion-key="lf-race-grid">${racersHtml}</div>
      </section>

      ${board?.finished && !ended ? `
        <div class="lf-solved-banner dp-enter" data-motion-key="lf-solved">
          <strong>✦ ${isZh ? `围栏闭环贯通！用时 ${(board.finishTimeMs / 1000).toFixed(1)} 秒` : `Loop Closed in ${(board.finishTimeMs / 1000).toFixed(1)}s!`}</strong>
          <span>${isZh ? '你已成功存活！正在观看其余流放者完赛...' : 'You survived! Watching remaining Exiles race...'}</span>
        </div>
      ` : ''}

      <div class="lf-workspace" data-motion-key="lf-workspace">
        <section class="lf-tablet ${ev.isSolved ? 'is-solved' : ''}" id="lf-tablet" data-motion-key="lf-tablet">
          <div class="lf-svg-container" data-motion-key="lf-svg-wrap">
            ${renderBoardSvg(N, state.clues, displayH, displayV, ev, canEdit)}
          </div>
        </section>

        <aside class="lf-panel" data-motion-key="lf-panel">
          <div style="font-family:var(--dp-font-display);font-size:13px;font-weight:700;letter-spacing:0.1em;color:var(--dp-brass-bright);text-transform:uppercase;">
            ◆ ${isZh ? '绘图工具与校验' : 'TOOLS & TOPOLOGY'}
          </div>

          <div class="lf-tool-toggle">
            <button type="button" class="dp-btn dp-btn-sm ${drawTool === 'fence' ? 'dp-btn-primary' : ''}" id="lf-tool-fence" ${canEdit ? '' : 'disabled'}>
              ━ ${isZh ? '金线围栏' : 'Fence'}
            </button>
            <button type="button" class="dp-btn dp-btn-sm ${drawTool === 'cross' ? 'dp-btn-crimson' : ''}" id="lf-tool-cross" ${canEdit ? '' : 'disabled'}>
              ✕ ${isZh ? '排除标记' : 'Mark ×'}
            </button>
          </div>

          <div class="lf-status-grid">
            <div class="lf-stat-box">
              <div class="lf-stat-val dp-tabular">${ev.satisfiedClues}/${ev.totalClues}</div>
              <div class="lf-stat-lbl">${isZh ? '数字满足' : 'Clues Met'}</div>
            </div>
            <div class="lf-stat-box">
              <div class="lf-stat-val dp-tabular">${ev.fenceCount}</div>
              <div class="lf-stat-lbl">${isZh ? '已连边数' : 'Fences'}</div>
            </div>
          </div>

          <div class="lf-check-pill ${ev.allCluesOk ? 'is-ok' : ev.overflowClues > 0 ? 'is-warn' : ''}">
            <span>${isZh ? '数字约束' : 'Number Clues'}</span>
            <strong class="dp-tabular">${ev.allCluesOk ? '✓ OK' : ev.overflowClues > 0 ? `${ev.overflowClues} !` : `${ev.satisfiedClues}/${ev.totalClues}`}</strong>
          </div>

          <div class="lf-check-pill ${ev.branchErrors > 0 ? 'is-warn' : ev.isSingleClosedLoop ? 'is-ok' : ''}">
            <span>${isZh ? '单一闭环拓扑' : 'Single Closed Loop'}</span>
            <strong>${ev.branchErrors > 0 ? (isZh ? '存在分叉!' : 'BRANCH!') : ev.isSingleClosedLoop ? '✓ CLOSED' : (isZh ? '未闭合' : 'OPEN')}</strong>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="dp-btn dp-btn-sm" id="lf-btn-undo" style="flex:1;" ${canEdit && board?.canUndo ? '' : 'disabled'}>
              ↩ ${isZh ? '撤销' : 'Undo'}
            </button>
            <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="lf-btn-clear" style="flex:1;" ${canEdit && ev.fenceCount > 0 ? '' : 'disabled'}>
              ${isZh ? '清空' : 'Clear'}
            </button>
          </div>

          ${totalRacers === 1 && canEdit ? `
            <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="lf-btn-giveup">${isZh ? '放弃并查看答案' : 'Surrender & Show Solution'}</button>
          ` : ''}

          ${ended && state.solution ? `
            <button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="lf-btn-toggle-sol">
              ${showSolutionToggle ? (isZh ? '查看我的连线' : 'Show My Board') : (isZh ? '查看参考标准闭环' : 'Show Verified Solution')}
            </button>
          ` : ''}

          <div style="font-size:11.5px;color:var(--dp-ink-muted);line-height:1.5;padding-top:4px;border-top:1px solid var(--dp-border-subtle);">
            ${isZh
              ? '技巧：左键连线/取消，右键直接标红 ×（手机端可切换上方工具）。从 0 周围标 ×、角落 3 或相邻 3-3 入手最快。'
              : 'Tip: Left-click toggles golden fence; right-click toggles red × (or switch tools above). Start from 0s, corner 3s, and adjacent 3s.'}
          </div>
        </aside>
      </div>
    </div>
  `;

  Motion.patchDOM(container, html);

  container.querySelectorAll('.lf-bar-fill').forEach((bar) => {
    Motion.setProgress(bar, Number(bar.dataset.ratio || 0));
  });

  if (newBranchError) {
    Motion.shake(container.querySelector('#lf-tablet'));
  }
}

mountGame({
  config: {
    id: 'loop-fence-puzzle',
    title: { zh: '围栏环路', en: 'Loop Fence Puzzle', ko: '울타리 치기' },
    category: 'EXILE',
    episode: 'EP 8',
    minPlayers: 1,
    maxPlayers: 4,
    defaultPlayers: 4,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'gridSize',
        label: { zh: '点阵规格', en: 'Grid Size' },
        type: 'select',
        default: '6',
        choices: [
          { value: '5', label: { zh: '5×5 速战局', en: '5×5 Quick' } },
          { value: '6', label: { zh: '6×6 标准局', en: '6×6 Standard' } },
          { value: '7', label: { zh: '7×7 流放地大师', en: '7×7 Exile Master' } },
        ],
      },
      {
        key: 'fastMode',
        label: { zh: '快节奏竞速', en: 'Fast Race' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 流放地赛 04 · 围栏环路（Slitherlink）
- 沿点阵相邻格点画线，构造出**恰好 1 条连续、无分叉、无交叉的闭合单环**。
- 每个带数字（\`0–3\`）的格子，其上下左右 4 条边中必须**恰好有等于该数字条边**被画上金色围栏线；空白格无边数限制。
- **左键点击**画金色激光围栏，**右键点击**（或切换 \`×\` 标记工具）标红叉排除不可能的边。
- 数字满足时自动亮翡翠绿，超出或出现分叉节点时亮猩红预警；闭环贯通瞬间自动通关存活！`,
      en: `### Exile Match 4 · Loop Fence Puzzle (Slitherlink)
- Connect adjacent dots horizontally or vertically to form **one single continuous closed loop** with no branches or crossings.
- Every numbered cell (\`0–3\`) must be bordered by **exactly that many** golden fence segments; blank cells have no edge limit.
- **Left-click** toggles a golden fence; **Right-click** (or switch to \`×\` tool) places a red exclusion mark.
- Satisfied clues glow emerald, violations pulse crimson, and closing the valid single loop wins automatically!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderLoopFence,
});

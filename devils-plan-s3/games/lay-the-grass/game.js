import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import {
  GameRules,
  BOARD_ROWS,
  BOARD_COLS,
  TILE_IDS,
  rotateTileCells,
  canPlaceTile,
} from './rules.js';

const ui = {
  rotDeg: 0, // Monotonic cumulative rotation angle (never wraps 270 -> 0 backwards!)
  hoverR: -1,
  hoverC: -1,
  lastTurnSig: '',
  lastEvSig: '',
  lastCtx: null,
  delegated: false,
};

function currentRotStep() {
  return ((Math.round(ui.rotDeg / 90) % 4) + 4) % 4;
}

function renderMiniPolyHtml(tileId, rot = 0) {
  const cells = rotateTileCells(tileId, rot);
  const maxR = Math.max(...cells.map(([r]) => r));
  const maxC = Math.max(...cells.map(([, c]) => c));
  const set = new Set(cells.map(([r, c]) => `${r},${c}`));
  let html = `<div class="ltg-mini-poly" style="grid-template-columns:repeat(${maxC + 1},10px);">`;
  for (let r = 0; r <= maxR; r++) {
    for (let c = 0; c <= maxC; c++) {
      html += `<span class="ltg-mini-sq ${set.has(`${r},${c}`) ? '' : 'is-empty'}"></span>`;
    }
  }
  html += '</div>';
  return html;
}

mountGame({
  config: {
    id: 'lay-the-grass',
    title: { zh: '铺草坪', en: 'Lay the Grass', ko: '잔디 깔기' },
    category: 'MAIN MATCH · MINI-GAME',
    episode: 'EP 2',
    minPlayers: 2,
    maxPlayers: 16,
    defaultPlayers: 6,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'rounds',
        label: { zh: '总轮数', en: 'Rounds' },
        type: 'select',
        default: '2',
        choices: [
          { value: '1', label: { zh: '1 轮速决', en: '1 Round' } },
          { value: '2', label: { zh: '2 轮完整博弈 (体现低分先选)', en: '2 Rounds (Low-Score-First Draft)' } },
        ],
      },
      {
        key: 'boardMap',
        label: { zh: '114格公园地图', en: '114-Cell Park Map' },
        type: 'select',
        default: 'classic',
        choices: [
          { value: 'classic', label: { zh: '经典雕塑公园 (114格)', en: 'Classic Sculpture Park (114)' } },
          { value: 'courtyard', label: { zh: '双泉庭院公园 (114格)', en: 'Twin-Fountain Courtyard (114)' } },
        ],
      },
    ],
    rulesSummary: {
      zh: `### 剧集核心规则（完整还原 Ep 2）
- **114 格公园沙盘**：12×10 棋盘扣除 6 座古铜雕塑障碍，正好 **114 个可铺格**。
- **7 种多联骨牌**：面积与编号分别为 **3、4、6、7、9、11、13**；成功放下即得对应格数胜点！
- **阶段 1 · 低分先选砖**：按当前总分**从低到高**（同分按优先权高者先）公开挑选 1 块草坪砖，**允许重复选择**。
- **阶段 2 · 小砖先铺设**：按所选砖块**从小到大（3 → 13）**依次放置。
- **旋转限制（关键！）**：仅允许 **90°/180°/270° 旋转**，**严禁镜像翻面**！若空间被小砖切碎导致放不下，直接得 **0 分**！`,
      en: `### Show-Exact Rules (Ep 2)
- **114-Cell Park Board**: 12×10 obsidian grid with 6 brass sculpture obstacles = **exactly 114 turf cells**.
- **7 Polyomino Tiles**: Sizes **{3, 4, 6, 7, 9, 11, 13}** — placing a tile earns points equal to its cell count!
- **Phase 1 · Open Draft (Low-Score-First)**: Lowest-scoring players pick first (ties by Priority Rank #1). **Duplicate picks are allowed!**
- **Phase 2 · Placement (Smallest-to-Largest)**: Tiles are laid in ascending order (**3 → 13**).
- **Rotation ONLY (No Flip!)**: Press **R**, Right-Click, or click Rotate for 90° turns. Mirror flipping is forbidden. If blocked with no valid fit, you score **0 pts**!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx, lastEvent } = ctx;
    ui.lastCtx = ctx;

    const turnSig = `${state.round}-${state.phase}-${state.currentTurnSeatId}`;
    if (turnSig !== ui.lastTurnSig) {
      ui.rotDeg = 0;
      ui.hoverR = -1;
      ui.hoverC = -1;
      ui.lastTurnSig = turnSig;
    }

    const evSig = lastEvent ? JSON.stringify(lastEvent) : '';
    if (evSig && evSig !== ui.lastEvSig) {
      ui.lastEvSig = evSig;
      if (lastEvent.type === 'TILE_PLACED') sfx.play('tilePlace');
      else if (lastEvent.type === 'TILE_BLOCKED') sfx.play('eliminate');
      else if (lastEvent.type === 'PLACE_PHASE_START') sfx.play('reveal');
    }

    const nameOf = (sid) => state.seats.find((s) => s.seatId === sid)?.name || sid;
    const isMyTurn = Boolean(mySeatId && state.currentTurnSeatId === mySeatId);
    const totalClaimed = Object.values(state.chosenTiles).reduce((a, b) => a + b, 0);
    const capRatio = Math.min(1, totalClaimed / 114);
    const overbooked = totalClaimed > 114;

    const myChosenTile = mySeatId ? state.chosenTiles[mySeatId] : null;
    const activeTile = state.phase === 'place' && state.currentTurnSeatId ? state.chosenTiles[state.currentTurnSeatId] : null;

    let filledCells = 0;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (state.board[r][c] && state.board[r][c] !== 'OBSTACLE') filledCells += 1;
      }
    }

    const initials = {};
    state.seats.forEach((s, idx) => {
      initials[s.seatId] = `P${idx + 1}`;
    });

    const orderList = state.phase === 'draft' ? state.draftOrder : state.placeOrder;

    const html = `
      <div class="ltg-layout" data-motion-key="ltg-layout">
        <section class="ltg-park-card" data-motion-key="ltg-park-card">
          <div class="ltg-park-header">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="dp-badge ltg-phase-badge dp-tabular">
                ${lang === 'zh' ? `第 ${state.round}/${state.totalRounds} 轮` : `ROUND ${state.round}/${state.totalRounds}`}
                · ${
                  state.phase === 'draft'
                    ? (lang === 'zh' ? '公开选砖 (低分先选)' : 'OPEN DRAFT (LOWEST FIRST)')
                    : state.phase === 'place'
                    ? (lang === 'zh' ? '公园铺设 (小砖先放)' : 'PLACEMENT (SMALLEST FIRST)')
                    : (lang === 'zh' ? '本轮结算' : 'ROUND COMPLETE')
                }
              </span>
              ${
                state.currentTurnSeatId
                  ? `<span style="font-size:13px;color:var(--dp-ink);">
                      ${lang === 'zh' ? '当前行动：' : 'Turn: '}
                      <strong style="color:var(--dp-emerald);">${UI.escapeHtml(nameOf(state.currentTurnSeatId))}</strong>
                      ${isMyTurn ? (lang === 'zh' ? ' (轮到你！)' : ' (YOUR TURN!)') : ''}
                     </span>`
                  : ''
              }
            </div>
            <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:12px;color:var(--dp-ink-muted);">
              ${filledCells}/114 ${lang === 'zh' ? '已铺' : 'FILLED'}
            </span>
          </div>

          <div class="ltg-capacity-bar">
            <span style="color:var(--dp-ink-muted);white-space:nowrap;">
              ${lang === 'zh' ? '总选砖面积 / 114格' : 'Claimed / 114 Cells'}
            </span>
            <div class="ltg-cap-track">
              <div class="ltg-cap-fill ${overbooked ? 'is-over' : ''}" id="ltg-cap-fill" data-motion-key="ltg-cap-fill"></div>
            </div>
            <strong class="dp-tabular" style="font-family:var(--dp-font-mono);color:${overbooked ? 'var(--dp-crimson-bright)' : 'var(--dp-emerald)'};white-space:nowrap;">
              ${totalClaimed} / 114 ${overbooked ? (lang === 'zh' ? '⚠ 超载!' : '⚠ OVERBOOKED!') : ''}
            </strong>
          </div>

          <div class="ltg-board-wrap">
            <div class="ltg-board" id="ltg-board" data-motion-key="ltg-board">
              ${Array.from({ length: BOARD_ROWS }, (_, r) =>
                Array.from({ length: BOARD_COLS }, (_, c) => {
                  const val = state.board[r][c];
                  if (val === 'OBSTACLE') {
                    return `<div class="ltg-cell is-obstacle" data-motion-key="ltg-c-${r}-${c}" data-r="${r}" data-c="${c}" title="Sculpture">❖</div>`;
                  }
                  if (val) {
                    const col = state.colorMap[val] || '#10b981';
                    return `<div class="ltg-cell is-placed" data-motion-key="ltg-c-${r}-${c}" data-r="${r}" data-c="${c}" style="background:${col};">${UI.escapeHtml(initials[val] || '■')}</div>`;
                  }
                  return `<div class="ltg-cell" data-motion-key="ltg-c-${r}-${c}" data-r="${r}" data-c="${c}"></div>`;
                }).join('')
              ).join('')}
            </div>

            ${
              state.phase === 'place' && isMyTurn && activeTile != null
                ? `
                  <div class="ltg-place-toolbar" data-motion-key="ltg-place-toolbar">
                    <div style="display:flex;align-items:center;gap:12px;">
                      <div class="ltg-rot-stage">
                        <div class="ltg-rot-spinner" id="ltg-active-preview" data-motion-key="ltg-prev-${activeTile}" style="transform:rotate(${ui.rotDeg}deg);">
                          ${renderMiniPolyHtml(activeTile, 0)}
                        </div>
                      </div>
                      <div>
                        <div class="dp-tabular" style="font-size:14px;font-weight:700;color:var(--dp-emerald);">
                          ${lang === 'zh' ? `正在铺设 ${activeTile} 号草坪砖 (+${activeTile} 分)` : `Placing Tile #${activeTile} (+${activeTile} pts)`}
                        </div>
                        <div style="font-size:11.5px;color:var(--dp-ink-muted);">
                          ${lang === 'zh' ? '仅可 90° 旋转（不可翻面）· 按 R 或右键旋转 · 点击棋盘落下' : '90° Rotate ONLY (no flip) · Press R / Right-Click · Click board to place'}
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">
                      ${
                        state.currentCanPlace
                          ? `
                            <button type="button" class="dp-btn dp-btn-sm" id="ltg-rot-btn">↻ ${lang === 'zh' ? '旋转 90° (R)' : 'Rotate 90° (R)'}</button>
                            <button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="ltg-confirm-tap" style="display:none;">
                              ${lang === 'zh' ? '确认放置' : 'Place Here'}
                            </button>
                          `
                          : `
                            <button type="button" class="dp-btn dp-btn-crimson" id="ltg-forfeit-btn">
                              ✕ ${lang === 'zh' ? '无合法空间 · 弃权 (0分)' : 'BLOCKED · Forfeit (0 pts)'}
                            </button>
                          `
                      }
                    </div>
                  </div>
                `
                : state.phase === 'draft'
                ? `
                  <div style="width:min(100%,660px);display:flex;align-items:center;justify-content:space-between;" data-motion-key="ltg-draft-head">
                    <span style="font-size:12px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
                      ${isMyTurn
                        ? (lang === 'zh' ? '✦ 轮到你选砖！点击下方任意一块草坪砖（允许重选）' : '✦ YOUR PICK! Select 1 Polyomino Tile (Duplicates Allowed)')
                        : (lang === 'zh' ? `等待 ${UI.escapeHtml(nameOf(state.currentTurnSeatId))} 选择草坪砖...` : `Waiting for ${UI.escapeHtml(nameOf(state.currentTurnSeatId))} to draft...`)}
                    </span>
                  </div>
                  <div class="ltg-catalog" data-motion-key="ltg-catalog">
                    ${TILE_IDS.map((tid) => {
                      const pickedBy = Object.entries(state.chosenTiles)
                        .filter(([, v]) => v === tid)
                        .map(([sid]) => initials[sid]);
                      return `
                        <button type="button" class="ltg-tile-btn ${myChosenTile === tid ? 'is-picked-by-me' : ''}" data-motion-key="ltg-tile-${tid}" data-draft="${tid}" ${isMyTurn ? '' : 'disabled'}>
                          <div style="width:100%;display:flex;justify-content:space-between;align-items:center;">
                            <strong class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:18px;color:var(--dp-brass-bright);">#${tid}</strong>
                            <span class="dp-tabular" style="font-size:11px;color:var(--dp-emerald);font-family:var(--dp-font-mono);">+${tid}pt</span>
                          </div>
                          ${renderMiniPolyHtml(tid, 0)}
                          <span style="font-size:10.5px;color:var(--dp-ink-muted);min-height:14px;">
                            ${pickedBy.length ? `${lang === 'zh' ? '已选:' : 'Picked:'} ${pickedBy.join(',')}` : (lang === 'zh' ? '无人选择' : 'Open')}
                          </span>
                        </button>
                      `;
                    }).join('')}
                  </div>
                `
                : state.phase === 'round_end'
                ? `
                  <button type="button" class="dp-btn dp-btn-primary" id="ltg-next-round" style="min-width:240px;min-height:46px;">
                    ${lang === 'zh' ? `进入第 ${state.round + 1} 轮（按最新低分先选！）→` : `Start Round ${state.round + 1} (Lowest Score Picks First!) →`}
                  </button>
                `
                : ''
            }
          </div>
        </section>

        <aside class="ltg-side" data-motion-key="ltg-side">
          <div class="ltg-panel">
            <div style="font-size:11.5px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ${state.phase === 'draft'
                ? (lang === 'zh' ? '选砖顺位（低分优先）' : 'DRAFT ORDER (LOWEST FIRST)')
                : (lang === 'zh' ? '铺设顺位（小砖优先）' : 'PLACEMENT ORDER (SMALLEST FIRST)')}
            </div>
            <div class="ltg-order-list" id="ltg-order-list">
              ${orderList
                .map((sid, idx) => {
                  const s = state.seats.find((x) => x.seatId === sid);
                  const chosen = state.chosenTiles[sid];
                  const st = state.placementStatus[sid];
                  const isAct = state.currentTurnSeatId === sid;
                  const statusLabel =
                    state.phase === 'draft'
                      ? chosen
                        ? `#${chosen}`
                        : isAct
                        ? (lang === 'zh' ? '选砖中' : 'PICKING')
                        : '—'
                      : st === 'placed'
                      ? `✓ +${chosen}`
                      : st === 'blocked'
                      ? `✕ 0pt`
                      : isAct
                      ? (lang === 'zh' ? `铺 #${chosen}` : `LAY #${chosen}`)
                      : `#${chosen}`;
                  return `
                    <div class="ltg-order-row ${isAct ? 'is-active' : ''} ${st === 'blocked' ? 'is-blocked' : ''}" data-motion-key="ltg-ord-${UI.escapeHtml(sid)}">
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        <span class="ltg-swatch" style="background:${state.colorMap[sid]};"></span>
                        <strong style="color:var(--dp-ink-muted);margin-right:4px;">${idx + 1}.</strong>
                        ${UI.escapeHtml(s?.name || sid)}
                        <small style="color:var(--dp-ink-faint);">(P#${state.priorityRank[sid]})</small>
                      </span>
                      <span style="display:flex;align-items:center;gap:8px;font-family:var(--dp-font-mono);">
                        <span style="font-size:11.5px;color:${st === 'placed' ? 'var(--dp-emerald)' : st === 'blocked' ? 'var(--dp-crimson-bright)' : 'var(--dp-brass-bright)'};">${statusLabel}</span>
                        <strong style="min-width:38px;text-align:right;">${state.scores[sid] || 0}pt</strong>
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

    const ordBefore = container.querySelector('#ltg-order-list');
    const prevOrdRects = ordBefore ? Motion.captureFlip(ordBefore) : null;

    Motion.patchDOM(container, html);

    const ordAfter = container.querySelector('#ltg-order-list');
    if (ordAfter && prevOrdRects && prevOrdRects.size > 0) {
      Motion.playFlip(ordAfter, prevOrdRects);
    }

    // Pure GPU scaleX capacity bar
    const capEl = container.querySelector('#ltg-cap-fill');
    if (capEl) Motion.setProgress(capEl, capRatio);

    if (!ui.delegated) {
      ui.delegated = true;

      const updateGhostPreview = () => {
        const c = ui.lastCtx;
        const boardEl = container.querySelector('#ltg-board');
        if (!c || !boardEl) return;
        boardEl.querySelectorAll('.is-ghost-ok, .is-ghost-bad').forEach((el) => {
          el.classList.remove('is-ghost-ok', 'is-ghost-bad');
        });
        const myTurn = Boolean(c.mySeatId && c.state.currentTurnSeatId === c.mySeatId);
        const aTile = c.state.phase === 'place' && myTurn ? c.state.chosenTiles[c.mySeatId] : null;
        if (!aTile || ui.hoverR < 0 || ui.hoverC < 0) return;

        const rot = currentRotStep();
        const cells = rotateTileCells(aTile, rot);
        const valid = canPlaceTile(c.state.board, aTile, ui.hoverR, ui.hoverC, rot);
        const cls = valid ? 'is-ghost-ok' : 'is-ghost-bad';
        for (const [dr, dc] of cells) {
          const rr = ui.hoverR + dr;
          const cc = ui.hoverC + dc;
          if (rr >= 0 && rr < BOARD_ROWS && cc >= 0 && cc < BOARD_COLS) {
            boardEl.querySelector(`[data-r="${rr}"][data-c="${cc}"]`)?.classList.add(cls);
          }
        }
        const confirmTapBtn = container.querySelector('#ltg-confirm-tap');
        if (confirmTapBtn && window.matchMedia('(pointer: coarse)').matches) {
          confirmTapBtn.style.display = valid ? 'inline-flex' : 'none';
        }
      };

      const doRotate = () => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'place' || c.state.currentTurnSeatId !== c.mySeatId) return;
        ui.rotDeg += 90; // Monotonic cumulative angle -> smooth clockwise spin!
        c.sfx.play('click');
        const prevEl = container.querySelector('#ltg-active-preview');
        if (prevEl) prevEl.style.transform = `rotate(${ui.rotDeg}deg)`;
        updateGhostPreview();
      };

      const tryPlaceAt = async (r, col) => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'place' || c.state.currentTurnSeatId !== c.mySeatId) return;
        const aTile = c.state.chosenTiles[c.mySeatId];
        const rot = currentRotStep();
        if (!canPlaceTile(c.state.board, aTile, r, col, rot)) {
          c.sfx.play('error');
          Motion.shake(container.querySelector('#ltg-board'));
          UI.toast(c.lang === 'zh' ? '此处无法放置（越界或重叠）' : 'Invalid placement (overlap or out of bounds)', 'error');
          return;
        }
        const res = await c.dispatch({ type: 'PLACE_TILE', payload: { r, c: col, rot } });
        if (!res.ok) {
          Motion.shake(container.querySelector('#ltg-board'));
          if (res.reason) UI.toast(res.reason, 'error');
        }
      };

      Motion.delegate(container, 'click', '[data-draft]', (e, btn) => {
        ui.lastCtx?.sfx.play('bid');
        ui.lastCtx?.dispatch({ type: 'DRAFT_TILE', payload: { tileId: Number(btn.dataset.draft) } });
      }, 'ltg-draft');

      Motion.delegate(container, 'click', '#ltg-next-round', () => {
        ui.lastCtx?.sfx.play('click');
        ui.lastCtx?.dispatch({ type: 'NEXT_ROUND' });
      }, 'ltg-next');

      Motion.delegate(container, 'click', '#ltg-forfeit-btn', () => {
        ui.lastCtx?.sfx.play('eliminate');
        ui.lastCtx?.dispatch({ type: 'FORFEIT_PLACE' });
      }, 'ltg-forfeit');

      Motion.delegate(container, 'click', '#ltg-rot-btn', () => doRotate(), 'ltg-rot');
      Motion.delegate(container, 'click', '#ltg-confirm-tap', () => {
        if (ui.hoverR >= 0 && ui.hoverC >= 0) tryPlaceAt(ui.hoverR, ui.hoverC);
      }, 'ltg-tap');

      Motion.delegate(container, 'pointermove', '#ltg-board', (e) => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'place' || c.state.currentTurnSeatId !== c.mySeatId || !c.state.currentCanPlace) return;
        const cell = e.target.closest?.('.ltg-cell');
        if (!cell) return;
        const r = Number(cell.dataset.r);
        const col = Number(cell.dataset.c);
        if (r !== ui.hoverR || col !== ui.hoverC) {
          ui.hoverR = r;
          ui.hoverC = col;
          updateGhostPreview();
        }
      }, 'ltg-pm');

      Motion.delegate(container, 'pointerleave', '#ltg-board', () => {
        if (!window.matchMedia('(pointer: coarse)').matches) {
          ui.hoverR = -1;
          ui.hoverC = -1;
          updateGhostPreview();
        }
      }, 'ltg-pl');

      Motion.delegate(container, 'click', '#ltg-board', (e) => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'place' || c.state.currentTurnSeatId !== c.mySeatId || !c.state.currentCanPlace) return;
        const cell = e.target.closest?.('.ltg-cell');
        if (!cell) return;
        const r = Number(cell.dataset.r);
        const col = Number(cell.dataset.c);
        if (window.matchMedia('(pointer: coarse)').matches && (r !== ui.hoverR || col !== ui.hoverC)) {
          ui.hoverR = r;
          ui.hoverC = col;
          updateGhostPreview();
          return;
        }
        tryPlaceAt(r, col);
      }, 'ltg-click');

      Motion.delegate(container, 'contextmenu', '#ltg-board', (e) => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'place' || c.state.currentTurnSeatId !== c.mySeatId) return;
        e.preventDefault();
        doRotate();
      }, 'ltg-ctx');

      if (window._ltgKeyHandler) window.removeEventListener('keydown', window._ltgKeyHandler);
      window._ltgKeyHandler = (e) => {
        const c = ui.lastCtx;
        if (!c) return;
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
          if (c.state.phase === 'place' && c.state.currentTurnSeatId === c.mySeatId) {
            e.preventDefault();
            doRotate();
          }
        }
      };
      window.addEventListener('keydown', window._ltgKeyHandler);
    }
  },
});

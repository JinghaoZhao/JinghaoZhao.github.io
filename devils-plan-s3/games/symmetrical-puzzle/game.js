import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, ZONES, transformCells, evaluateZone } from './rules.js';

const GRID = 8;

// Local interactive editor state (persisted across AI bot updates!)
let activeZone = 0;
let selectedPieceId = null;
let pieceRot = 0;
let pieceFlipped = false;
let hoverCell = null; // { r, c }
let showSolPreview = false;
let lastSymTs = 0;
let lastSolvedTs = 0;

function renderMiniPolyominoSvg(baseCells, colorHex, rot = 0, flipped = false) {
  const cells = transformCells(baseCells, rot, flipped);
  let maxR = 0, maxC = 0;
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  const unit = 18;
  const pad = 6;
  const w = (maxC + 1) * unit + pad * 2;
  const h = (maxR + 1) * unit + pad * 2;
  const rects = cells
    .map(
      ([r, c]) => `
      <rect x="${pad + c * unit + 1}" y="${pad + r * unit + 1}" width="${unit - 2}" height="${unit - 2}" rx="3.5"
        fill="${colorHex}" stroke="rgba(255,255,255,0.65)" stroke-width="1.2"/>
    `
    )
    .join('');
  return `<svg width="${Math.min(110, w)}" height="${Math.min(76, h)}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${rects}</svg>`;
}

function renderSymmetryAxisSvg(ev) {
  if (!ev.isValidSymmetry || !ev.bbox) return '';
  const { minR, maxR, minC, maxC } = ev.bbox;
  const cell = 100 / GRID;
  const lines = [];
  if (ev.axes.includes('vertical')) {
    const x = ((minC + maxC + 1) / 2) * cell;
    lines.push(`<line class="sp-axis-line" x1="${x}" y1="${Math.max(1, minR * cell - 3)}" x2="${x}" y2="${Math.min(99, (maxR + 1) * cell + 3)}"/>`);
  }
  if (ev.axes.includes('horizontal')) {
    const y = ((minR + maxR + 1) / 2) * cell;
    lines.push(`<line class="sp-axis-line" x1="${Math.max(1, minC * cell - 3)}" y1="${y}" x2="${Math.min(99, (maxC + 1) * cell + 3)}" y2="${y}"/>`);
  }
  if (ev.axes.includes('diag-main')) {
    lines.push(`<line class="sp-axis-line" x1="${minC * cell}" y1="${minR * cell}" x2="${(maxC + 1) * cell}" y2="${(maxR + 1) * cell}"/>`);
  }
  if (ev.axes.includes('diag-anti')) {
    lines.push(`<line class="sp-axis-line" x1="${(maxC + 1) * cell}" y1="${minR * cell}" x2="${minC * cell}" y2="${(maxR + 1) * cell}"/>`);
  }
  return `<svg class="sp-axis-svg" viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}</svg>`;
}

function renderSymmetricalGame(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx, ui, lastEvent } = ctx;
    const isZh = lang === 'zh';
    const board = state.myBoard;
    const ended = state.phase === 'ended';

    if (!ended) showSolPreview = false;

    if (lastEvent?.type === 'ZONE_SYMMETRICAL' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastSymTs) {
      lastSymTs = lastEvent.ts;
      sfx.play('pieceGain');
      ui.toast(
        isZh ? `✦ 对称圣阵达成 (${lastEvent.completedZones}/3)！` : `✦ Symmetrical Altar Lit (${lastEvent.completedZones}/3)!`,
        'success'
      );
    }
    if (lastEvent?.type === 'ALL_SYMMETRICAL' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastSolvedTs) {
      lastSolvedTs = lastEvent.ts;
      sfx.play('victory');
    }

    const canEdit = Boolean(board && !board.finished && !ended);
    const totalRacers = state.racers.length;

    // Build effective placements (either player's own or revealed solution if toggled at end)
    const getZonePlacements = (zIdx) => {
      if (ended && showSolPreview) {
        const out = {};
        for (const pc of state.zones[zIdx].pieces) {
          if (pc.solution) out[pc.id] = pc.solution;
        }
        return out;
      }
      return board ? board.placements[zIdx] : {};
    };

    const zoneEvals = state.zones.map((z, idx) => evaluateZone(z, getZonePlacements(idx)));
    const curZoneDef = state.zones[activeZone];
    const curZoneMeta = ZONES[activeZone];
    const curPlacements = getZonePlacements(activeZone);
    const curEv = zoneEvals[activeZone];

    // Auto-select first unplaced piece in current zone if nothing selected
    if (canEdit && selectedPieceId != null && curPlacements[selectedPieceId]) {
      selectedPieceId = null;
    }

    const activePieceDef = selectedPieceId != null
      ? curZoneDef.pieces.find((p) => p.id === selectedPieceId)
      : null;

    const getGhostPreview = (anchor) => {
      if (!canEdit || !activePieceDef || !anchor) return null;
      const cells = transformCells(activePieceDef.baseCells, pieceRot, pieceFlipped);
      // Center piece slightly around hovered cell so placement feels natural
      let maxR = 0, maxC = 0;
      for (const [dr, dc] of cells) {
        if (dr > maxR) maxR = dr;
        if (dc > maxC) maxC = dc;
      }
      const baseR = anchor.r - Math.floor(maxR / 2);
      const baseC = anchor.c - Math.floor(maxC / 2);
      let valid = true;
      const absCells = [];
      for (const [dr, dc] of cells) {
        const r = baseR + dr;
        const c = baseC + dc;
        if (r < 0 || r >= GRID || c < 0 || c >= GRID || curEv.occupied.has(`${r},${c}`)) {
          valid = false;
        }
        if (r >= 0 && r < GRID && c >= 0 && c < GRID) {
          absCells.push(`${r},${c}`);
        }
      }
      return { baseR, baseC, valid, cellSet: new Set(absCells) };
    };

    const updateGhostClasses = () => {
      const ghost = getGhostPreview(hoverCell);
      container.querySelectorAll('.sp-cell').forEach((cellEl) => {
        cellEl.classList.remove('is-ghost-ok', 'is-ghost-bad');
        if (ghost && ghost.cellSet.has(cellEl.dataset.coord)) {
          cellEl.classList.add(ghost.valid ? 'is-ghost-ok' : 'is-ghost-bad');
        }
      });
    };

    const racersHtml = state.racers
      .map((r) => {
        const isMe = r.seatId === mySeatId;
        const cls = [
          'sp-racer-card',
          isMe ? 'is-me' : '',
          r.status === 'survived' ? 'is-survived' : '',
          r.status === 'eliminated' ? 'is-eliminated' : '',
        ].join(' ');
        const stat = r.finished && r.finishTimeMs != null
          ? `#${r.rank || '✓'} ${(r.finishTimeMs / 1000).toFixed(1)}s`
          : `${r.completedZones}/3`;
        return `
          <div class="${cls}">
            <div class="sp-racer-top">
              <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(r.avatar)} ${UI.escapeHtml(r.name)}${isMe ? (isZh ? ' (你)' : ' (You)') : ''}</span>
              <span class="sp-racer-stat">${UI.escapeHtml(stat)}</span>
            </div>
            <div class="sp-bar-track"><div class="sp-bar-fill" style="width:${r.progress}%"></div></div>
          </div>
        `;
      })
      .join('');

    const zoneTabsHtml = ZONES.map((z, idx) => {
      const zev = zoneEvals[idx];
      const isAct = activeZone === idx;
      return `
        <button type="button" class="sp-zone-tab ${isAct ? 'is-active' : ''} ${zev.isValidSymmetry ? 'is-complete' : ''}" data-zone-tab="${idx}">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <span class="sp-zone-gem" style="background:${z.hex};color:${z.hex};"></span>
            <div class="sp-zone-meta">
              <span class="sp-zone-name">${isZh ? z.zh : z.en}</span>
              <span class="sp-zone-sub">${zev.placedCount}/${zev.totalPieces} ${isZh ? '块' : 'pcs'}</span>
            </div>
          </div>
          <span class="dp-badge ${zev.isValidSymmetry ? 'dp-badge-emerald' : ''}">
            ${zev.isValidSymmetry ? '✓ SYM' : isZh ? '待拼' : 'OPEN'}
          </span>
        </button>
      `;
    }).join('');

    // Build 8x8 Grid HTML
    const colorClass = `is-${curZoneMeta.color}`;
    let gridHtml = '';
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const coord = `${r},${c}`;
        const occPid = curEv.occupied.get(coord);
        const hasPiece = occPid !== undefined;
        gridHtml += `
          <div class="sp-cell ${hasPiece ? colorClass : ''}" data-r="${r}" data-c="${c}" data-coord="${coord}" data-occ="${hasPiece ? occPid : ''}">
            ${hasPiece ? `<span class="sp-cell-tag">${occPid + 1}</span>` : ''}
          </div>
        `;
      }
    }

    // Build Tray HTML
    const trayHtml = curZoneDef.pieces
      .map((pc) => {
        const isPlaced = Boolean(curPlacements[pc.id]);
        const isSel = selectedPieceId === pc.id;
        const rot = isSel ? pieceRot : 0;
        const flip = isSel ? pieceFlipped : false;
        return `
          <div class="sp-piece-card ${isPlaced ? 'is-placed' : ''} ${isSel ? 'is-selected' : ''}" data-piece-id="${pc.id}">
            ${renderMiniPolyominoSvg(pc.baseCells, curZoneMeta.hex, rot, flip)}
            <span class="sp-piece-label">#${pc.label} · ${pc.baseCells.length} ${isZh ? '格' : 'sq'}${isPlaced ? (isZh ? ' (已放)' : ' (Placed)') : ''}</span>
          </div>
        `;
      })
      .join('');

    // Live diagnostic text for current zone
    let symStatusText = '';
    if (curEv.isValidSymmetry) {
      symStatusText = `✦ ${isZh ? curEv.symmetryLabel.zh : curEv.symmetryLabel.en}`;
    } else if (!curEv.allPlaced) {
      symStatusText = isZh
        ? `还需放入 ${curEv.totalPieces - curEv.placedCount} 块晶体`
        : `Place ${curEv.totalPieces - curEv.placedCount} more piece(s)`;
    } else if (!curEv.connected) {
      symStatusText = isZh ? '图形未连通（需拼为整体）' : 'Must form 1 connected shape';
    } else if (!curEv.holeFree) {
      symStatusText = isZh ? '存在内部空洞（需实心无孔）' : 'No interior holes allowed';
    } else {
      symStatusText = isZh ? '尚未构成轴对称图形' : 'Not yet symmetrical';
    }

    container.innerHTML = `
      <div class="sp-root">
        <section class="sp-temple-banner">
          <div class="sp-race-header">
            <div class="sp-race-title">
              <span class="sp-torch-dot"></span>
              <span>${isZh ? '流放地最终战 · 三色对称拼图' : 'EXILE MATCH 5 · SYMMETRICAL PUZZLE'}</span>
            </div>
            <div style="font-size:12px;color:var(--dp-ink-muted);">
              ${totalRacers === 1
                ? (isZh ? '单人挑战 · 点亮全部 3 座对称圣台' : 'Solo · Complete all 3 symmetrical altars')
                : (isZh ? `前 ${totalRacers - 1} 名存活 · 末位永久淘汰` : `Top ${totalRacers - 1} Survive · Last Eliminated`)}
            </div>
          </div>
          <div class="sp-race-grid">${racersHtml}</div>
        </section>

        ${board?.finished ? `
          <div class="sp-celebration-banner">
            <strong>✦ ${isZh ? `三色对称圣阵全破！用时 ${(board.finishTimeMs / 1000).toFixed(1)} 秒` : `All 3 Symmetrical Altars Complete in ${(board.finishTimeMs / 1000).toFixed(1)}s!`}</strong>
            <span>${ended ? (isZh ? '对局已结算' : 'Match Complete') : (isZh ? '你已成功存活！正在观看其余流放者完赛...' : 'You survived! Watching remaining Exiles...')}</span>
          </div>
        ` : ''}

        <div class="sp-zone-tabs">${zoneTabsHtml}</div>

        <div class="sp-workspace">
          <section class="sp-altar ${curEv.isValidSymmetry ? 'is-symmetrical' : ''}">
            <div class="sp-altar-top">
              <span class="dp-badge" style="border-color:${curZoneMeta.hex};color:${curZoneMeta.hex};">
                ◆ ${isZh ? curZoneMeta.zh : curZoneMeta.en}
              </span>
              <span class="sp-sym-pill ${curEv.isValidSymmetry ? 'is-ok' : ''}">${UI.escapeHtml(symStatusText)}</span>
            </div>

            <div class="sp-grid-wrap" id="sp-grid-wrap">
              <div class="sp-grid" id="sp-grid">${gridHtml}</div>
              ${renderSymmetryAxisSvg(curEv)}
            </div>

            <div style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:11.5px;color:var(--dp-ink-muted);">
                ${isZh ? '点击托盘晶体→悬停网格点击放置；点击已放晶体可拾起调整' : 'Pick crystal from tray → click grid to place; click placed crystal to move'}
              </span>
              <div style="display:flex;gap:8px;">
                <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sp-clear-zone" ${canEdit && curEv.placedCount > 0 ? '' : 'disabled'}>
                  ${isZh ? '清空本台' : 'Clear Altar'}
                </button>
                ${totalRacers === 1 && canEdit ? `
                  <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sp-give-up">${isZh ? '放弃' : 'Give Up'}</button>
                ` : ''}
                ${ended ? `
                  <button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="sp-toggle-sol">
                    ${showSolPreview ? (isZh ? '看我的拼图' : 'My Board') : (isZh ? '查看参考对称解' : 'Show Solution')}
                  </button>
                ` : ''}
              </div>
            </div>
          </section>

          <aside class="sp-tray-panel">
            <div style="font-family:var(--dp-font-display);font-size:13px;font-weight:700;letter-spacing:0.1em;color:var(--dp-brass-bright);text-transform:uppercase;display:flex;justify-content:space-between;">
              <span>${isZh ? '当前圣台晶体块' : 'CRYSTAL PIECES'}</span>
              <span style="font-family:var(--dp-font-mono);color:var(--dp-ink-muted);">${curEv.placedCount}/${curEv.totalPieces}</span>
            </div>

            <div class="sp-piece-list">${trayHtml}</div>

            <div class="sp-transform-row">
              <button type="button" class="dp-btn dp-btn-sm" id="sp-btn-rot" ${canEdit && selectedPieceId != null ? '' : 'disabled'}>
                ↻ ${isZh ? '旋转 90° (R)' : 'Rotate (R)'}
              </button>
              <button type="button" class="dp-btn dp-btn-sm" id="sp-btn-flip" ${canEdit && selectedPieceId != null && state.allowFlip ? '' : 'disabled'}>
                ⇄ ${isZh ? '镜像翻转 (F)' : 'Flip (F)'}
              </button>
            </div>

            <div style="font-size:11.5px;color:var(--dp-ink-muted);line-height:1.5;padding-top:6px;border-top:1px solid rgba(212,175,106,0.16);">
              ${isZh
                ? '规则要点：任意方向轴对称（垂直、水平、四向或对角线）均自动判定通过！无需局限于某一种固定摆法。'
                : 'Any valid connected, hole-free symmetrical figure (Vertical, Horizontal, 4-Way, or Diagonal) is automatically accepted!'}
            </div>
          </aside>
        </div>
      </div>
    `;

    // Zone tab switching
    container.querySelectorAll('[data-zone-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        activeZone = Number(btn.dataset.zoneTab);
        selectedPieceId = null;
        pieceRot = 0;
        pieceFlipped = false;
        hoverCell = null;
        // Re-run render locally using current ctx
        mountTriggerRerender();
      });
    });

    const mountTriggerRerender = () => {
      renderSymmetricalGame(container, ctx);
    };

    // Tray piece click
    container.querySelectorAll('[data-piece-id]').forEach((el) => {
      const pid = Number(el.dataset.pieceId);
      el.addEventListener('click', async () => {
        if (!canEdit) return;
        sfx.play('click');
        if (curPlacements[pid]) {
          // Pick up already-placed piece back to hand!
          const prev = curPlacements[pid];
          selectedPieceId = pid;
          pieceRot = prev.rot;
          pieceFlipped = prev.flipped;
          await dispatch({ type: 'REMOVE_PIECE', payload: { zoneId: activeZone, pieceId: pid } });
        } else if (selectedPieceId === pid) {
          pieceRot = (pieceRot + 1) % 4;
          mountTriggerRerender();
        } else {
          selectedPieceId = pid;
          pieceRot = 0;
          pieceFlipped = false;
          mountTriggerRerender();
        }
      });
    });

    // Transform buttons
    const doRotate = () => {
      if (!canEdit || selectedPieceId == null) return;
      sfx.play('click');
      pieceRot = (pieceRot + 1) % 4;
      mountTriggerRerender();
    };
    const doFlip = () => {
      if (!canEdit || selectedPieceId == null || !state.allowFlip) return;
      sfx.play('click');
      pieceFlipped = !pieceFlipped;
      mountTriggerRerender();
    };

    container.querySelector('#sp-btn-rot')?.addEventListener('click', doRotate);
    container.querySelector('#sp-btn-flip')?.addEventListener('click', doFlip);

    container.querySelector('#sp-clear-zone')?.addEventListener('click', async () => {
      if (!canEdit) return;
      sfx.play('click');
      selectedPieceId = null;
      await dispatch({ type: 'CLEAR_ZONE', payload: { zoneId: activeZone } });
    });

    container.querySelector('#sp-give-up')?.addEventListener('click', async () => {
      const ok = await ui.confirm(
        isZh ? '确认放弃并查看答案？' : 'Surrender & Reveal Solution?',
        isZh ? '结束本局后可查看全部 3 座圣台的参考对称解法。' : 'Ends the match so you can inspect all 3 reference solutions.'
      );
      if (ok) await dispatch({ type: 'GIVE_UP', payload: {} });
    });

    container.querySelector('#sp-toggle-sol')?.addEventListener('click', () => {
      sfx.play('click');
      showSolPreview = !showSolPreview;
      mountTriggerRerender();
    });

    // 8x8 Grid hover & click
    const gridEl = container.querySelector('#sp-grid');
    if (gridEl && canEdit) {
      gridEl.addEventListener('mouseleave', () => {
        hoverCell = null;
        updateGhostClasses();
      });

      gridEl.querySelectorAll('.sp-cell').forEach((cellEl) => {
        const r = Number(cellEl.dataset.r);
        const c = Number(cellEl.dataset.c);

        cellEl.addEventListener('mouseenter', () => {
          hoverCell = { r, c };
          updateGhostClasses();
        });

        cellEl.addEventListener('click', async () => {
          if (selectedPieceId != null) {
            const ghost = getGhostPreview({ r, c });
            if (ghost && ghost.valid) {
              const pid = selectedPieceId;
              const rot = pieceRot;
              const flip = pieceFlipped;
              selectedPieceId = null;
              hoverCell = null;
              sfx.play('tilePlace');
              await dispatch({
                type: 'PLACE_PIECE',
                payload: {
                  zoneId: activeZone,
                  pieceId: pid,
                  anchorR: ghost.baseR,
                  anchorC: ghost.baseC,
                  rot,
                  flipped: flip,
                },
              });
            } else {
              sfx.play('error');
            }
          } else if (cellEl.dataset.occ !== '') {
            // Pick up placed piece from grid!
            const pid = Number(cellEl.dataset.occ);
            const prev = curPlacements[pid];
            if (prev) {
              sfx.play('click');
              selectedPieceId = pid;
              pieceRot = prev.rot;
              pieceFlipped = prev.flipped;
              await dispatch({ type: 'REMOVE_PIECE', payload: { zoneId: activeZone, pieceId: pid } });
            }
          }
        });

        cellEl.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          if (selectedPieceId != null) {
            doRotate();
          } else if (cellEl.dataset.occ !== '') {
            const pid = Number(cellEl.dataset.occ);
            sfx.play('click');
            await dispatch({ type: 'REMOVE_PIECE', payload: { zoneId: activeZone, pieceId: pid } });
          }
        });
      });
    }

    if (hoverCell) updateGhostClasses();

    // Keyboard shortcuts
    if (window._spKeyHandler) {
      window.removeEventListener('keydown', window._spKeyHandler);
    }
    window._spKeyHandler = (e) => {
      if (!canEdit) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') doRotate();
      else if (e.key === 'f' || e.key === 'F') doFlip();
      else if (e.key === 'Escape' && selectedPieceId != null) {
        selectedPieceId = null;
        hoverCell = null;
        mountTriggerRerender();
      }
    };
    window.addEventListener('keydown', window._spKeyHandler);
}

mountGame({
  config: {
    id: 'symmetrical-puzzle',
    title: { zh: '对称拼图', en: 'Symmetrical Puzzle', ko: '대칭 퍼즐' },
    category: 'EXILE',
    episode: 'EP 10',
    minPlayers: 1,
    maxPlayers: 4,
    defaultPlayers: 3,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'allowFlip',
        label: { zh: '允许镜像翻转块', en: 'Allow Piece Flip' },
        type: 'boolean',
        default: true,
      },
      {
        key: 'fastMode',
        label: { zh: '快节奏竞速', en: 'Fast Race' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 流放地赛 05 · 对称拼图
- 使用手中的**蓝、红、绿三色晶体几何多联块**，在 3 座独立的 8×8 神殿圣台上分别拼出 **3 个连通、无内部空洞的对称图形**（垂直对称、水平对称、四向对称或对角对称均可！）。
- **必须用完每座圣台的全部碎片**；一旦某圣台拼成合法对称图形，台面将自动绽放**金色对称轴激光**！
- 点击托盘碎片选中 → 在 8×8 网格悬停预览并点击落位；按 **R 键**旋转 90°、**F 键**镜像翻转；点击已放置碎片可拾起调整。
- **流放存活**：剧集 3 人局前 2 名存活，末位永久淘汰（支持 1–4 人）。`,
      en: `### Exile Match 5 · Symmetrical Puzzle
- Assemble all **Blue, Red, and Green crystalline polyominoes** on their 3 temple altars into **3 connected, hole-free symmetrical figures** (vertical, horizontal, 4-way, or diagonal symmetry!).
- **Every piece in a zone must be used**; the instant a zone achieves valid symmetry, a **golden symmetry axis beam** ignites automatically!
- Click a piece to pick it up, hover over the 8×8 altar to preview, and click to snap into place. Press **R** to rotate 90°, **F** to flip, or click a placed piece to reposition it.
- **Survival Rule**: Top \`N-1\` survive; last place is permanently eliminated.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderSymmetricalGame,
});

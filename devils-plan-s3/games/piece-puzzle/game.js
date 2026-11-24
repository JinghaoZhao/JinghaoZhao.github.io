import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, rotateEdges, evaluateBoard } from './rules.js';

const GROOVE_META = {
  1: { nameZh: '圆弧', nameEn: 'Arc', color: '#f59e0b' },
  2: { nameZh: '方榫', nameEn: 'Square', color: '#38bdf8' },
  3: { nameZh: '双齿', nameEn: 'Twin', color: '#a78bfa' },
  4: { nameZh: '斜楔', nameEn: 'Chevron', color: '#34d399' },
  5: { nameZh: '阶锁', nameEn: 'Step', color: '#fb7185' },
};

/**
 * Build an edge path segment from (x0,y0) to (x1,y1) given signed groove val (-5..+5).
 * Local coordinates along edge: t in [0, 1], normal n > 0 points OUTWARD from piece.
 */
function edgeSegmentPath(x0, y0, x1, y1, val) {
  if (!val) return `L ${x1} ${y1}`;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  // Outward unit normal for CW winding (top: +x -> normal is (0,-1))
  const nx = dy / len;
  const ny = -dx / len;
  const s = val > 0 ? 1 : -1;
  const kind = Math.abs(val);

  const pt = (t, n) => `${(x0 + dx * t + nx * n * s).toFixed(1)} ${(y0 + dy * t + ny * n * s).toFixed(1)}`;

  if (kind === 1) {
    // Shallow rounded tab / socket
    return `L ${pt(0.32, 0)} Q ${pt(0.5, 16)} ${pt(0.68, 0)} L ${x1} ${y1}`;
  }
  if (kind === 2) {
    // Deep crisp square key
    return `L ${pt(0.34, 0)} L ${pt(0.34, 13)} L ${pt(0.66, 13)} L ${pt(0.66, 0)} L ${x1} ${y1}`;
  }
  if (kind === 3) {
    // Twin-prong groove
    return `L ${pt(0.26, 0)} L ${pt(0.26, 11)} L ${pt(0.41, 11)} L ${pt(0.41, 3)} L ${pt(0.59, 3)} L ${pt(0.59, 11)} L ${pt(0.74, 11)} L ${pt(0.74, 0)} L ${x1} ${y1}`;
  }
  if (kind === 4) {
    // Sharp beveled chevron
    return `L ${pt(0.30, 0)} L ${pt(0.50, 14)} L ${pt(0.70, 0)} L ${x1} ${y1}`;
  }
  // kind === 5: Stepped temple key
  return `L ${pt(0.26, 0)} L ${pt(0.26, 7)} L ${pt(0.38, 7)} L ${pt(0.38, 14)} L ${pt(0.62, 14)} L ${pt(0.62, 7)} L ${pt(0.74, 7)} L ${pt(0.74, 0)} L ${x1} ${y1}`;
}

/**
 * Render an intricately grooved metallic Devil's Piece SVG (viewBox 0 0 120 120).
 */
function renderPieceSvg(piece, rot, opts = {}) {
  const edges = rotateEdges(piece.baseEdges, rot);
  const pad = 18;
  const x0 = pad, y0 = pad, x1 = 120 - pad, y1 = 120 - pad;
  const d = [
    `M ${x0} ${y0}`,
    edgeSegmentPath(x0, y0, x1, y0, edges[0]),
    edgeSegmentPath(x1, y0, x1, y1, edges[1]),
    edgeSegmentPath(x1, y1, x0, y1, edges[2]),
    edgeSegmentPath(x0, y1, x0, y0, edges[3]),
    'Z',
  ].join(' ');

  const gradId = `pp-g-${piece.id}-${opts.uid || 'm'}`;
  const isError = Boolean(opts.isError);
  const isLocked = Boolean(opts.isLocked);

  // Subtle colored edge pips so players can instantly verify notch type + polarity
  const pipCoords = [
    { x: 60, y: 24, v: edges[0] },
    { x: 96, y: 60, v: edges[1] },
    { x: 60, y: 96, v: edges[2] },
    { x: 24, y: 60, v: edges[3] },
  ];
  const pips = pipCoords
    .filter((p) => p.v !== 0)
    .map((p) => {
      const meta = GROOVE_META[Math.abs(p.v)];
      const fill = p.v > 0 ? meta.color : '#14110e';
      return `<circle cx="${p.x}" cy="${p.y}" r="3.4" fill="${fill}" stroke="${meta.color}" stroke-width="1.4" opacity="0.92"/>`;
    })
    .join('');

  const strokeColor = isError ? '#ff5868' : isLocked ? '#fde68a' : '#d4af6a';

  return `
    <svg class="pp-piece-svg" viewBox="0 0 120 120" aria-label="Piece ${piece.code}">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${isLocked ? '#4e3c1b' : '#3a2d1b'}" />
          <stop offset="52%" stop-color="#211912" />
          <stop offset="100%" stop-color="#130f0b" />
        </linearGradient>
      </defs>
      <path d="${d}" fill="url(#${gradId})" stroke="${strokeColor}" stroke-width="${isLocked ? 2.4 : 1.9}" stroke-linejoin="round" />
      <rect x="33" y="33" width="54" height="54" rx="7" fill="none" stroke="rgba(212,175,106,0.22)" stroke-width="1" />
      <text x="60" y="57" text-anchor="middle" dominant-baseline="central" fill="#f3d692" font-family="Cinzel, serif" font-size="18" font-weight="700">${piece.glyph}</text>
      <text x="60" y="76" text-anchor="middle" fill="rgba(212,175,106,0.78)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${piece.code}</text>
      ${pips}
    </svg>
  `;
}

// Local UI state persisted across state snapshots (so AI bot ticks never drop selection!)
let selected = null; // { source: 'tray', pieceId } | { source: 'slot', slotIndex }
let dragPayload = null;
let lockoutTickTimer = null;
let lastLockoutSeen = 0;
let lastSolvedCount = 0;

mountGame({
  config: {
    id: 'piece-puzzle',
    title: { zh: '碎片拼图', en: 'Piece Puzzle', ko: '피스 퍼즐' },
    category: 'EXILE',
    episode: 'EP 4–5',
    minPlayers: 1,
    maxPlayers: 4,
    defaultPlayers: 4,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'difficulty',
        label: { zh: '石槽边框难度', en: 'Stone Frame' },
        type: 'select',
        default: 'standard',
        choices: [
          { value: 'standard', label: { zh: '标准（平边外框）', en: 'Standard (Flat Frame)' } },
          { value: 'master', label: { zh: '大师（古雕外框）', en: 'Master (Carved Frame)' } },
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
      zh: `### 流放地赛 01 · 碎片拼图
- 所有流放者获得**完全相同的 8 枚凹槽魔鬼碎片**，竞速将它们严丝合缝嵌合进 4×2 古代石槽。
- 每条边缘具有 5 种不同形状的**凸榫（实心色点）**与**凹槽（空心色环）**；相邻碎片必须形状一致且一凸一凹方能咬合。
- 点击选中碎片后可点击石槽放入/交换，按 **R 键** 或点击旋转按钮顺时针旋转 90°（也可直接拖拽放置）。
- 全部 8 枚拼齐并完美互锁即刻解锁存活；若主动点击「验证机关」但存在错位，将触发 **5 秒锁盘惩罚**！
- **流放存活**：多人局前 \`N-1\` 名存活，最末位永久淘汰。`,
      en: `### Exile Match 1 · Piece Puzzle
- Every Exile receives the **exact same 8 grooved Devil's Pieces** and races to interlock them into the 4×2 temple stone recess.
- Edges carry 5 distinct shapes as **protruding tongues (solid dot)** or **recessed grooves (hollow ring)** — touching edges lock in gold only when matching shapes complement each other.
- Click or drag pieces into slots; press **R** or click **Rotate** to turn 90° clockwise; right-click a placed piece to rotate in place.
- Completing all interlocking seams immediately unlocks survival! Pressing **Verify Mechanism** with any mismatch triggers a **5-second lockout**.
- **Survival Rule**: Top \`N-1\` survive; last place is permanently eliminated.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx, ui, lastEvent } = ctx;
    const isZh = lang === 'zh';
    const board = state.myBoard;
    const puzzle = state.puzzle;
    const ended = state.phase === 'ended';

    // Handle audio reactions to notable events
    if (lastEvent?.type === 'LOCK_REJECTED' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastLockoutSeen) {
      lastLockoutSeen = lastEvent.ts || Date.now();
      sfx.play('error');
    }
    if (state.finishOrder.length > lastSolvedCount) {
      lastSolvedCount = state.finishOrder.length;
      if (state.finishOrder.includes(mySeatId)) sfx.play('victory');
      else sfx.play('reveal');
    }
    if (state.finishOrder.length === 0) lastSolvedCount = 0;

    // Evaluation of viewer's board (or solution preview for spectators)
    const activeSlots = board ? board.slots : Array(8).fill(null);
    const ev = evaluateBoard(puzzle, activeSlots);

    // Determine placed pieceIds
    const placedIds = new Set(activeSlots.filter(Boolean).map((s) => s.pieceId));
    const pieceMap = new Map(puzzle.pieces.map((p) => [p.id, p]));

    // Lockout countdown check
    const now = Date.now();
    const lockoutRemMs = board ? Math.max(0, (board.lockoutUntilMs || 0) - now) : 0;
    const isLockedOut = lockoutRemMs > 0 && !ended && !(board && board.finished);

    clearInterval(lockoutTickTimer);
    if (isLockedOut) {
      lockoutTickTimer = setInterval(() => {
        const maskTimer = container.querySelector('#pp-lockout-sec');
        const rem = Math.max(0, (board.lockoutUntilMs || 0) - Date.now());
        if (rem <= 0) {
          clearInterval(lockoutTickTimer);
          const mask = container.querySelector('.pp-lockout-mask');
          if (mask) mask.remove();
        } else if (maskTimer) {
          maskTimer.textContent = `${(rem / 1000).toFixed(1)}s`;
        }
      }, 120);
    }

    // Build Racer Progress Bar HTML
    const totalRacers = state.racers.length;
    const survivalNote = totalRacers === 1
      ? (isZh ? '单人限时挑战 · 拼齐 8 枚互锁过关' : 'Solo Time-Attack · Interlock all 8 pieces')
      : (isZh ? `流放地生存线：前 ${totalRacers - 1} 名存活 · 末位淘汰` : `Exile Cutoff: Top ${totalRacers - 1} Survive · Last Eliminated`);

    const racersHtml = state.racers
      .map((r) => {
        const isMe = r.seatId === mySeatId;
        const cls = [
          'pp-racer-card',
          isMe ? 'is-me' : '',
          r.status === 'survived' ? 'is-survived' : '',
          r.status === 'eliminated' ? 'is-eliminated' : '',
        ].join(' ');
        const statText = r.finished && r.finishTimeMs != null
          ? `#${r.rank || '✓'} ${(r.finishTimeMs / 1000).toFixed(1)}s`
          : r.status === 'eliminated'
          ? (isZh ? '已淘汰' : 'ELIM')
          : `${r.progress}%`;
        return `
          <div class="${cls}">
            <div class="pp-racer-top">
              <span class="pp-racer-name">${UI.escapeHtml(r.avatar)} ${UI.escapeHtml(r.name)}${isMe ? (isZh ? ' (你)' : ' (You)') : ''}</span>
              <span class="pp-racer-stat">${UI.escapeHtml(statText)}</span>
            </div>
            <div class="pp-bar-track"><div class="pp-bar-fill" style="width:${r.progress}%"></div></div>
          </div>
        `;
      })
      .join('');

    // Build 4x2 Stone Slots HTML
    const hMap = new Map(ev.hStatus.map((h) => [`${h.r}-${h.c}`, h.status]));
    const vMap = new Map(ev.vStatus.map((v) => [`${v.r}-${v.c}`, v.status]));

    const slotsHtml = activeSlots
      .map((entry, idx) => {
        const r = Math.floor(idx / 4);
        const c = idx % 4;
        const isSel = selected?.source === 'slot' && selected.slotIndex === idx;
        const hasPiece = Boolean(entry);
        const piece = hasPiece ? pieceMap.get(entry.pieceId) : null;
        const hasErr = ev.slotErrors[idx];

        const rightSeam = c < 3 ? hMap.get(`${r}-${c}`) : null;
        const bottomSeam = r === 0 ? vMap.get(`0-${c}`) : null;

        const rightBadge = rightSeam && rightSeam !== 'empty'
          ? `<span class="pp-seam-glow is-right ${rightSeam === 'ok' ? 'is-ok' : 'is-bad'}"></span>`
          : '';
        const bottomBadge = bottomSeam && bottomSeam !== 'empty'
          ? `<span class="pp-seam-glow is-bottom ${bottomSeam === 'ok' ? 'is-ok' : 'is-bad'}"></span>`
          : '';

        // If carvedFrame is active, show subtle frame-expectation pips on outer walls
        const frameMarker = (val, posStyle) => {
          if (!val) return '';
          const meta = GROOVE_META[Math.abs(val)];
          const isTab = val > 0;
          return `<span title="${isZh ? '外框齿槽' : 'Frame groove'}" style="position:absolute;${posStyle}width:10px;height:10px;border-radius:50%;background:${isTab ? meta.color : '#14110e'};border:2px solid ${meta.color};box-shadow:0 0 8px ${meta.color};pointer-events:none;z-index:5;"></span>`;
        };
        const outerMarkers = puzzle.carvedFrame
          ? [
              r === 0 ? frameMarker(puzzle.frame.top[c], 'top:-6px;left:50%;transform:translateX(-50%);') : '',
              r === 1 ? frameMarker(puzzle.frame.bottom[c], 'bottom:-6px;left:50%;transform:translateX(-50%);') : '',
              c === 0 ? frameMarker(puzzle.frame.left[r], 'left:-6px;top:50%;transform:translateY(-50%);') : '',
              c === 3 ? frameMarker(puzzle.frame.right[r], 'right:-6px;top:50%;transform:translateY(-50%);') : '',
            ].join('')
          : '';

        const cls = [
          'pp-slot',
          hasPiece ? 'has-piece' : '',
          isSel ? 'is-selected' : '',
          hasPiece && !hasErr && ev.isSolved ? 'is-all-matched' : '',
          hasPiece && hasErr ? 'has-mismatch' : '',
        ].join(' ');

        return `
          <div class="${cls}" data-slot="${idx}" draggable="${hasPiece && !ended && !(board?.finished) ? 'true' : 'false'}">
            ${hasPiece
              ? renderPieceSvg(piece, entry.rot, { uid: `s${idx}`, isError: hasErr, isLocked: ev.isSolved })
              : `<span class="pp-slot-index">${r + 1}-${c + 1}</span>`}
            ${rightBadge}
            ${bottomBadge}
            ${outerMarkers}
          </div>
        `;
      })
      .join('');

    // Build Piece Tray HTML
    const trayHtml = puzzle.pieces
      .map((pc) => {
        const isPlaced = placedIds.has(pc.id);
        const isSel = selected?.source === 'tray' && selected.pieceId === pc.id;
        const rot = board ? board.trayRotations[pc.id] || 0 : 0;
        return `
          <div class="pp-tray-card ${isPlaced ? 'is-placed' : ''} ${isSel ? 'is-selected' : ''}"
               data-tray-piece="${pc.id}"
               draggable="${!isPlaced && !ended && !(board?.finished) ? 'true' : 'false'}">
            ${renderPieceSvg(pc, rot, { uid: `t${pc.id}` })}
          </div>
        `;
      })
      .join('');

    const legendChips = Object.entries(GROOVE_META)
      .map(([k, m]) => `
        <span class="pp-legend-chip">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${m.color};"></span>
          ${isZh ? m.nameZh : m.nameEn}
        </span>
      `)
      .join('');

    const frameTip = puzzle.carvedFrame
      ? (isZh ? '大师古雕外框：四周边框凹槽同样需要与石台咬合！' : 'Master Carved Frame: Outer edges must also interlock with the stone frame!')
      : (isZh ? '标准石槽：四条平直边朝向石槽外框，内部 10 条凹凸齿缝完全互补咬合。' : 'Standard Frame: Flat edges face the outer border; all 10 interior seams must interlock.');

    const canAct = Boolean(board && !board.finished && !ended && !isLockedOut);

    container.innerHTML = `
      <div class="pp-root">
        <section class="pp-temple-banner">
          <div class="pp-race-header">
            <div class="pp-race-title">
              <span class="pp-torch-dot"></span>
              <span>${isZh ? '流放地古殿 · 同步竞速' : 'EXILE TEMPLE · SYNCED SEED RACE'}</span>
            </div>
            <div class="pp-survival-note">${UI.escapeHtml(survivalNote)}</div>
          </div>
          <div class="pp-race-grid">${racersHtml}</div>
        </section>

        ${board?.finished ? `
          <div class="pp-solved-banner">
            <strong>✦ ${isZh ? `机关已解锁！用时 ${(board.finishTimeMs / 1000).toFixed(1)} 秒` : `Mechanism Unlocked in ${(board.finishTimeMs / 1000).toFixed(1)}s!`}</strong>
            <span>${ended ? (isZh ? '对局已结束' : 'Match Complete') : (isZh ? '你已成功存活！正在观看其余流放者竞速...' : 'You survived! Watching remaining Exiles race...')}</span>
          </div>
        ` : ''}

        <div class="pp-main">
          <section class="pp-stone-chamber">
            ${isLockedOut ? `
              <div class="pp-lockout-mask">
                <strong>${isZh ? '机关咬合失败 · 锁盘冷却' : 'MISMATCH RECOIL · LOCKED'}</strong>
                <div class="pp-lockout-timer" id="pp-lockout-sec">${(lockoutRemMs / 1000).toFixed(1)}s</div>
                <span style="font-size:12.5px;color:#fecaca;">${isZh ? '检查红色标记齿缝后重新拼接' : 'Inspect crimson seams once cooldown clears'}</span>
              </div>
            ` : ''}

            <div class="pp-chamber-top">
              <span class="dp-badge">${isZh ? '4×2 古铜石槽锁阵' : '4×2 BRONZE STONE LOCK'}</span>
              <span class="pp-seam-meter ${ev.isSolved ? 'is-complete' : ''}">
                ${isZh ? '已放' : 'Placed'} ${ev.placedCount}/8 · ${isZh ? '咬合齿缝' : 'Locked'} ${ev.matchedSeams}/${ev.totalSeams}
              </span>
            </div>

            <div class="pp-board-wrap">
              <div class="pp-board-grid">${slotsHtml}</div>
            </div>
            <div class="pp-frame-hint">${UI.escapeHtml(frameTip)}</div>

            <div class="pp-controls">
              <div class="pp-control-group">
                <button type="button" class="dp-btn dp-btn-sm" id="pp-btn-rotate" ${canAct && selected ? '' : 'disabled'}>
                  ↻ ${isZh ? '旋转 90° (R)' : 'Rotate 90° (R)'}
                </button>
                <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="pp-btn-remove" ${canAct && selected?.source === 'slot' ? '' : 'disabled'}>
                  ↩ ${isZh ? '收回托盘' : 'Return'}
                </button>
                <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="pp-btn-clear" ${canAct && ev.placedCount > 0 ? '' : 'disabled'}>
                  ${isZh ? '清空' : 'Clear'}
                </button>
              </div>
              <div class="pp-control-group">
                ${totalRacers === 1 && canAct ? `
                  <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="pp-btn-giveup">${isZh ? '放弃' : 'Give Up'}</button>
                ` : ''}
                <button type="button" class="dp-btn dp-btn-primary" id="pp-btn-verify" ${canAct && ev.placedCount === 8 ? '' : 'disabled'}>
                  ◆ ${isZh ? '验证咬合机关' : 'Verify Lock'}
                </button>
              </div>
            </div>
          </section>

          <aside class="pp-tray-panel">
            <div class="pp-tray-heading">
              <span>${isZh ? '8 枚魔鬼碎片' : '8 DEVIL\'S PIECES'}</span>
              <span style="font-family:var(--dp-font-mono);font-size:11px;color:var(--dp-ink-muted);">${8 - ev.placedCount} ${isZh ? '待放' : 'left'}</span>
            </div>
            <div class="pp-tray-grid">${trayHtml}</div>

            <div class="pp-legend">
              <div class="pp-legend-title">${isZh ? '齿槽图例（实心凸榫 ↔ 空心凹槽）' : 'Groove Legend (Solid Tab ↔ Hollow Socket)'}</div>
              <div class="pp-legend-row">${legendChips}</div>
              <div style="font-size:11.5px;color:var(--dp-ink-muted);margin-top:2px;">
                ${isZh
                  ? '提示：点击碎片选中，点击石槽放入或互换；右键/双击碎片可快速旋转 90°。金色光缝代表相邻咬合成功！'
                  : 'Tip: Click or drag pieces into slots; right-click or press R to rotate 90°. Golden seams confirm perfect interlock!'}
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    // Wire interactions
    const doRotateSelected = async () => {
      if (!canAct || !selected) return;
      sfx.play('click');
      if (selected.source === 'tray') {
        await dispatch({ type: 'ROTATE_TRAY', payload: { pieceId: selected.pieceId } });
      } else {
        await dispatch({ type: 'ROTATE_SLOT', payload: { slotIndex: selected.slotIndex } });
      }
    };

    container.querySelector('#pp-btn-rotate')?.addEventListener('click', doRotateSelected);

    container.querySelector('#pp-btn-remove')?.addEventListener('click', async () => {
      if (!canAct || selected?.source !== 'slot') return;
      sfx.play('click');
      const idx = selected.slotIndex;
      selected = null;
      await dispatch({ type: 'REMOVE_PIECE', payload: { slotIndex: idx } });
    });

    container.querySelector('#pp-btn-clear')?.addEventListener('click', async () => {
      if (!canAct) return;
      sfx.play('click');
      selected = null;
      await dispatch({ type: 'CLEAR_BOARD', payload: {} });
    });

    container.querySelector('#pp-btn-verify')?.addEventListener('click', async () => {
      if (!canAct) return;
      sfx.play('bid');
      await dispatch({ type: 'VERIFY_LOCK', payload: {} });
    });

    container.querySelector('#pp-btn-giveup')?.addEventListener('click', async () => {
      const ok = await ui.confirm(
        isZh ? '确认放弃挑战？' : 'Surrender Challenge?',
        isZh ? '将结束当前挑战并揭晓正确拼法。' : 'This ends the match and reveals the solution.'
      );
      if (ok) await dispatch({ type: 'GIVE_UP', payload: {} });
    });

    // Tray click / right-click / drag
    container.querySelectorAll('[data-tray-piece]').forEach((el) => {
      const pid = Number(el.dataset.trayPiece);
      el.addEventListener('click', async () => {
        if (!canAct || placedIds.has(pid)) return;
        sfx.play('click');
        if (selected?.source === 'tray' && selected.pieceId === pid) {
          // Clicking already selected tray piece rotates it!
          await dispatch({ type: 'ROTATE_TRAY', payload: { pieceId: pid } });
        } else {
          selected = { source: 'tray', pieceId: pid };
          // Quick re-highlight without waiting for state roundtrip
          container.querySelectorAll('.is-selected').forEach((n) => n.classList.remove('is-selected'));
          el.classList.add('is-selected');
          const rotBtn = container.querySelector('#pp-btn-rotate');
          if (rotBtn) rotBtn.disabled = false;
          const rmBtn = container.querySelector('#pp-btn-remove');
          if (rmBtn) rmBtn.disabled = true;
        }
      });

      el.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        if (!canAct || placedIds.has(pid)) return;
        sfx.play('click');
        selected = { source: 'tray', pieceId: pid };
        await dispatch({ type: 'ROTATE_TRAY', payload: { pieceId: pid } });
      });

      el.addEventListener('dragstart', () => {
        if (!canAct || placedIds.has(pid)) return;
        dragPayload = { source: 'tray', pieceId: pid };
        selected = { source: 'tray', pieceId: pid };
      });
    });

    // Board slot click / right-click / drag-drop
    container.querySelectorAll('[data-slot]').forEach((el) => {
      const slotIdx = Number(el.dataset.slot);

      el.addEventListener('click', async () => {
        if (!canAct) return;
        const existing = activeSlots[slotIdx];
        if (!selected) {
          if (existing) {
            sfx.play('click');
            selected = { source: 'slot', slotIndex: slotIdx };
            container.querySelectorAll('.is-selected').forEach((n) => n.classList.remove('is-selected'));
            el.classList.add('is-selected');
            const rotBtn = container.querySelector('#pp-btn-rotate');
            if (rotBtn) rotBtn.disabled = false;
            const rmBtn = container.querySelector('#pp-btn-remove');
            if (rmBtn) rmBtn.disabled = false;
          }
          return;
        }

        if (selected.source === 'tray') {
          const pid = selected.pieceId;
          selected = { source: 'slot', slotIndex: slotIdx };
          sfx.play('tilePlace');
          await dispatch({ type: 'PLACE_PIECE', payload: { pieceId: pid, slotIndex: slotIdx } });
        } else if (selected.source === 'slot') {
          if (selected.slotIndex === slotIdx) {
            // Clicking same selected slot rotates it 90 deg
            sfx.play('click');
            await dispatch({ type: 'ROTATE_SLOT', payload: { slotIndex: slotIdx } });
          } else {
            const fromSlot = selected.slotIndex;
            selected = { source: 'slot', slotIndex: slotIdx };
            sfx.play('tilePlace');
            await dispatch({ type: 'SWAP_SLOTS', payload: { fromSlot, toSlot: slotIdx } });
          }
        }
      });

      el.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        if (!canAct || !activeSlots[slotIdx]) return;
        sfx.play('click');
        selected = { source: 'slot', slotIndex: slotIdx };
        await dispatch({ type: 'ROTATE_SLOT', payload: { slotIndex: slotIdx } });
      });

      el.addEventListener('dragstart', () => {
        if (!canAct || !activeSlots[slotIdx]) return;
        dragPayload = { source: 'slot', slotIndex: slotIdx };
        selected = { source: 'slot', slotIndex: slotIdx };
      });

      el.addEventListener('dragover', (e) => {
        if (!canAct || !dragPayload) return;
        e.preventDefault();
        el.classList.add('is-drop-target');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('is-drop-target');
      });

      el.addEventListener('drop', async (e) => {
        e.preventDefault();
        el.classList.remove('is-drop-target');
        if (!canAct || !dragPayload) return;
        const dp = dragPayload;
        dragPayload = null;
        sfx.play('tilePlace');
        if (dp.source === 'tray') {
          selected = { source: 'slot', slotIndex: slotIdx };
          await dispatch({ type: 'PLACE_PIECE', payload: { pieceId: dp.pieceId, slotIndex: slotIdx } });
        } else if (dp.source === 'slot' && dp.slotIndex !== slotIdx) {
          selected = { source: 'slot', slotIndex: slotIdx };
          await dispatch({ type: 'SWAP_SLOTS', payload: { fromSlot: dp.slotIndex, toSlot: slotIdx } });
        }
      });
    });

    // Global keyboard shortcut for Rotate (R)
    if (window._ppKeyHandler) {
      window.removeEventListener('keydown', window._ppKeyHandler);
    }
    window._ppKeyHandler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        doRotateSelected();
      }
    };
    window.addEventListener('keydown', window._ppKeyHandler);
  },
});

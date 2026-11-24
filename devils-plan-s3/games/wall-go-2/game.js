import { mountGame, SFX, UI } from '../../shared/sdk.js';
import {
  GameRules,
  BOARD_SIZE,
  getLegalMovesForPiece,
  getLegalWallsAround,
} from './rules.js';

// Bespoke magnetic wall click & laser wall shatter SFX
let audioCtx = null;
function getAudio() {
  if (SFX.isMuted() || typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playWallLock() {
  const ac = getAudio();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(680, now);
  osc.frequency.exponentialRampToValueAtTime(185, now + 0.085);
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
  osc.connect(g).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

function playWallShatter() {
  const ac = getAudio();
  if (!ac) return;
  const now = ac.currentTime;
  // Crisp glass/laser shatter noise burst + sub thump
  const len = Math.floor(ac.sampleRate * 0.36);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.setValueAtTime(2400, now);
  hp.frequency.exponentialRampToValueAtTime(600, now + 0.32);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.32, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  src.connect(hp).connect(ng).connect(ac.destination);
  src.start(now);

  const sub = ac.createOscillator();
  const sg = ac.createGain();
  sub.type = 'sawtooth';
  sub.frequency.setValueAtTime(150, now);
  sub.frequency.exponentialRampToValueAtTime(42, now + 0.28);
  sg.gain.setValueAtTime(0.24, now);
  sg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  sub.connect(sg).connect(ac.destination);
  sub.start(now);
  sub.stop(now + 0.31);
}

// Local UI selection state
const uiState = {
  selectedPieceId: null,
  wallBreakArmed: false,
  lastEventKey: '',
  shatterEdge: null,
  shatterTimer: null,
};

function renderBoardSvg(state, mySeatId, legalMoves, legalWallEdges, isMyTurn) {
  const PAD = 34;
  const CELL = 70;
  const GRID_PX = CELL * BOARD_SIZE; // 490
  const TOTAL = PAD * 2 + GRID_PX; // 558

  const playerMap = new Map(state.players.map((p) => [p.seatId, p]));
  const legalMoveMap = new Map(legalMoves.map((m) => [`${m.toR},${m.toC}`, m]));

  // Map sealed room ownership per cell for real-time translucent territory shading
  const cellSealedOwner = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  const roomBadges = [];
  for (const room of state.territories?.rooms || []) {
    if (!room.sealedOwner) continue;
    let sumR = 0;
    let sumC = 0;
    for (const [r, c] of room.cells) {
      cellSealedOwner[r][c] = room.sealedOwner;
      sumR += r;
      sumC += c;
    }
    // Find cell closest to centroid for floating area badge
    const avgR = sumR / room.cells.length;
    const avgC = sumC / room.cells.length;
    let bestCell = room.cells[0];
    let bestD = Infinity;
    for (const cell of room.cells) {
      const d = Math.hypot(cell[0] - avgR, cell[1] - avgC);
      if (d < bestD) {
        bestD = d;
        bestCell = cell;
      }
    }
    roomBadges.push({
      r: bestCell[0],
      c: bestCell[1],
      size: room.size,
      color: playerMap.get(room.sealedOwner)?.color || '#d4af6a',
    });
  }

  // Coordinate labels A-G and 1-7
  let labelsSvg = '';
  for (let i = 0; i < BOARD_SIZE; i++) {
    const colChar = String.fromCharCode(65 + i);
    const cx = PAD + i * CELL + CELL / 2;
    const cy = PAD + i * CELL + CELL / 2;
    labelsSvg += `
      <text x="${cx}" y="${PAD - 12}" text-anchor="middle" fill="#64748b" font-family="var(--dp-font-mono)" font-size="11" font-weight="700">${colChar}</text>
      <text x="${PAD - 14}" y="${cy + 4}" text-anchor="middle" fill="#64748b" font-family="var(--dp-font-mono)" font-size="11" font-weight="700">${i + 1}</text>
    `;
  }

  // 7x7 Obsidian Slate Cells
  let cellsSvg = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      const key = `${r},${c}`;
      const lm = legalMoveMap.get(key);
      const sealedSeat = cellSealedOwner[r][c];
      const occupied = state.pieces.some((pc) => pc.r === r && pc.c === c);
      const isSetupClickable = isMyTurn && state.phase === 'setup' && !occupied;

      let fill = (r + c) % 2 === 0 ? '#111622' : '#0d111b';
      if (sealedSeat) {
        fill = playerMap.get(sealedSeat)?.territoryBg || fill;
      }

      let stroke = 'rgba(255,255,255,0.06)';
      let strokeW = 1;
      let cls = 'wg-cell';
      let attrs = '';

      if (isSetupClickable) {
        cls += ' is-clickable';
        attrs = `data-setup-cell="${r},${c}"`;
      } else if (lm) {
        cls += ' is-legal-dest';
        attrs = `data-move-dest="${r},${c}"`;
        stroke = lm.breakEdge ? '#f59e0b' : '#38bdf8';
        strokeW = 2;
      }

      cellsSvg += `
        <rect x="${x + 3}" y="${y + 3}" width="${CELL - 6}" height="${CELL - 6}" rx="8"
          fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" class="${cls}" ${attrs} />
      `;

      if (lm) {
        const dotColor = lm.breakEdge ? '#fbbf24' : '#38bdf8';
        cellsSvg += `
          <circle cx="${x + CELL / 2}" cy="${y + CELL / 2}" r="${lm.breakEdge ? 11 : 9}"
            fill="${lm.breakEdge ? 'rgba(245,158,11,0.28)' : 'rgba(56,189,248,0.25)'}"
            stroke="${dotColor}" stroke-width="2" stroke-dasharray="${lm.breakEdge ? '4 2' : 'none'}"
            class="wg-dest-pulse" />
          ${
            lm.breakEdge
              ? `<text x="${x + CELL / 2}" y="${y + CELL / 2 + 4}" text-anchor="middle" fill="#fef08a" font-size="11" font-weight="900" style="pointer-events:none;">⚡</text>`
              : ''
          }
        `;
      }
    }
  }

  // Last move trace line
  let traceSvg = '';
  if (state.lastMoveTrace && state.phase === 'play') {
    const t = state.lastMoveTrace;
    const x1 = PAD + t.fromC * CELL + CELL / 2;
    const y1 = PAD + t.fromR * CELL + CELL / 2;
    const x2 = PAD + t.toC * CELL + CELL / 2;
    const y2 = PAD + t.toR * CELL + CELL / 2;
    traceSvg = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
        stroke="rgba(242,213,145,0.42)" stroke-width="3" stroke-dasharray="5 4" stroke-linecap="round" style="pointer-events:none;" />
    `;
  }

  // Outer perimeter permanent frame wall
  const borderWallSvg = `
    <rect x="${PAD - 2}" y="${PAD - 2}" width="${GRID_PX + 4}" height="${GRID_PX + 4}" rx="12"
      fill="none" stroke="rgba(212,175,106,0.48)" stroke-width="4" style="pointer-events:none;" />
  `;

  // Placed Internal Laser Walls
  let placedWallsSvg = '';
  for (let r = 0; r < BOARD_SIZE - 1; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const ownerId = state.hWalls[r][c];
      if (!ownerId) continue;
      const color = playerMap.get(ownerId)?.color || '#d4af6a';
      const x = PAD + c * CELL + 5;
      const y = PAD + (r + 1) * CELL - 4;
      placedWallsSvg += `
        <rect x="${x}" y="${y}" width="${CELL - 10}" height="8" rx="4"
          fill="${color}" stroke="#090b10" stroke-width="1"
          filter="drop-shadow(0 0 8px ${color})" class="wg-wall-placed" />
      `;
    }
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      const ownerId = state.vWalls[r][c];
      if (!ownerId) continue;
      const color = playerMap.get(ownerId)?.color || '#d4af6a';
      const x = PAD + (c + 1) * CELL - 4;
      const y = PAD + r * CELL + 5;
      placedWallsSvg += `
        <rect x="${x}" y="${y}" width="8" height="${CELL - 10}" rx="4"
          fill="${color}" stroke="#090b10" stroke-width="1"
          filter="drop-shadow(0 0 8px ${color})" class="wg-wall-placed" />
      `;
    }
  }

  // Hoverable Brass Wall Slots when placing a wall
  let wallSlotsSvg = '';
  if (isMyTurn && state.phase === 'play' && state.subphase === 'place_wall') {
    for (const edge of legalWallEdges) {
      if (edge.orientation === 'h') {
        const x = PAD + edge.c * CELL + 6;
        const y = PAD + (edge.r + 1) * CELL - 5;
        wallSlotsSvg += `
          <g class="wg-wall-slot" data-place-wall="h:${edge.r}:${edge.c}">
            <rect x="${x - 4}" y="${y - 9}" width="${CELL - 4}" height="28" fill="transparent" />
            <rect x="${x}" y="${y}" width="${CELL - 12}" height="10" rx="5" class="wg-wall-preview" />
          </g>
        `;
      } else {
        const x = PAD + (edge.c + 1) * CELL - 5;
        const y = PAD + edge.r * CELL + 6;
        wallSlotsSvg += `
          <g class="wg-wall-slot" data-place-wall="v:${edge.r}:${edge.c}">
            <rect x="${x - 9}" y="${y - 4}" width="28" height="${CELL - 4}" fill="transparent" />
            <rect x="${x}" y="${y}" width="10" height="${CELL - 12}" rx="5" class="wg-wall-preview" />
          </g>
        `;
      }
    }
  }

  // Wall Break Shatter Shockwave Animation
  let shatterSvg = '';
  if (uiState.shatterEdge) {
    const e = uiState.shatterEdge;
    const sx = e.orientation === 'h' ? PAD + e.c * CELL + CELL / 2 : PAD + (e.c + 1) * CELL;
    const sy = e.orientation === 'h' ? PAD + (e.r + 1) * CELL : PAD + e.r * CELL + CELL / 2;
    shatterSvg = `
      <circle cx="${sx}" cy="${sy}" r="10" class="wg-shatter-ring" />
      <circle cx="${sx}" cy="${sy}" r="10" class="wg-shatter-ring" style="animation-delay:0.12s;stroke:#fef08a;" />
    `;
  }

  // Floating Territory Area Badges on Sealed Rooms
  let badgesSvg = '';
  for (const b of roomBadges) {
    const bx = PAD + b.c * CELL + CELL - 15;
    const by = PAD + b.r * CELL + 15;
    badgesSvg += `
      <g style="pointer-events:none;">
        <rect x="${bx - 13}" y="${by - 10}" width="26" height="18" rx="9" fill="rgba(7,9,15,0.88)" stroke="${b.color}" stroke-width="1.3" />
        <text x="${bx}" y="${by + 3}" text-anchor="middle" fill="${b.color}" font-family="var(--dp-font-mono)" font-size="10.5" font-weight="800">+${b.size}</text>
      </g>
    `;
  }

  // Geometric Square & Circle Pieces
  let piecesSvg = '';
  for (const pc of state.pieces) {
    const owner = playerMap.get(pc.seatId);
    const color = owner?.color || '#f2d591';
    const cx = PAD + pc.c * CELL + CELL / 2;
    const cy = PAD + pc.r * CELL + CELL / 2;
    const isMine = pc.seatId === mySeatId;
    const isSelectable = isMyTurn && state.phase === 'play' && state.subphase === 'move' && isMine;
    const isSelected =
      (state.subphase === 'move' && uiState.selectedPieceId === pc.id) ||
      (state.subphase === 'place_wall' && state.movedPieceId === pc.id);

    const shapeGraphic =
      pc.shape === 'square'
        ? `
          <rect x="-18" y="-18" width="36" height="36" rx="6"
            fill="#0b0e17" stroke="${color}" stroke-width="3.2"
            filter="drop-shadow(0 4px 10px rgba(0,0,0,0.75))" />
          <rect x="-10" y="-10" width="20" height="20" rx="3"
            fill="${color}" opacity="0.88" />
          <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" fill="#0b0e17" />
        `
        : `
          <circle cx="0" cy="0" r="19"
            fill="#0b0e17" stroke="${color}" stroke-width="3.2"
            filter="drop-shadow(0 4px 10px rgba(0,0,0,0.75))" />
          <circle cx="0" cy="0" r="11" fill="${color}" opacity="0.88" />
          <circle cx="0" cy="0" r="5" fill="#0b0e17" />
        `;

    piecesSvg += `
      <g
        class="wg-piece-group ${isSelectable ? 'is-selectable' : ''}"
        transform="translate(${cx}, ${cy})"
        ${isSelectable ? `data-select-piece="${UI.escapeHtml(pc.id)}"` : ''}
      >
        ${
          isSelected
            ? `<circle cx="0" cy="0" r="25" fill="none" stroke="${uiState.wallBreakArmed ? '#f59e0b' : '#ffffff'}" stroke-width="2" stroke-dasharray="6 4" class="wg-piece-selected-halo" />`
            : ''
        }
        ${shapeGraphic}
      </g>
    `;
  }

  return `
    <svg class="wg-board-svg" viewBox="0 0 ${TOTAL} ${TOTAL}" role="img" aria-label="Wall Go II 7x7 Board">
      ${labelsSvg}
      ${cellsSvg}
      ${traceSvg}
      ${borderWallSvg}
      ${placedWallsSvg}
      ${wallSlotsSvg}
      ${shatterSvg}
      ${piecesSvg}
      ${badgesSvg}
    </svg>
  `;
}

mountGame({
  config: {
    id: 'wall-go-2',
    title: { zh: '墙壁围棋Ⅱ', en: 'Wall Go II', ko: '벽바둑 Ⅱ' },
    category: 'PRISON MATCH',
    episode: 'EP 10 · DAY 4 PM4',
    minPlayers: 2,
    maxPlayers: 3,
    defaultPlayers: 2,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'turnSeconds',
        label: { zh: '每回合限时', en: 'Turn Timer' },
        type: 'select',
        default: '90',
        choices: [
          { value: '90', label: { zh: '90 秒 (原剧标准)', en: '90s (Show Standard)' } },
          { value: '45', label: { zh: '45 秒 (快节奏)', en: '45s (Fast)' } },
        ],
      },
      {
        key: 'bonusWallBreak',
        label: { zh: '双人模式额外开启 1 次破墙', en: 'Enable 1 Wall Break in 2P' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 游戏目标
在 **7×7 棋盘** 上移动棋子并逐回合建造围墙，将自己与所有对手彻底隔离。所有阵营完全分离瞬间结束游戏，**己方封闭领地总格数最多者胜**（同分比**最大单一房间格数**）！

### 第三季核心升级：双形态棋子 + 严禁原地不动
- **■ 方形棋子（Square）**：必须沿单一正交方向（上/下/左/右）**直线移动 1 或 2 格**（不可拐弯）。
- **● 圆形棋子（Circle）**：必须**正交移动 1 格**，或**走 1 格后立即 90° L 形拐弯走第 2 格**（**严禁直线走 2 格！**）。
- **严禁 0 步原地建墙**：每回合必须移动至少 1 格，落定后**必须在该棋子新位置四周任选 1 条空边立起围墙**（每回合 90 秒）。

### 双赛制（自动按人数切换）
- **3 人 R1 混战**：每人 1 方 + 1 圆（蛇形布子），每人全场拥有 **1 次【破墙移动】** 技能，可击碎路径上 1 面内墙并穿过！
- **2 人 R2 死亡战**：每人 2 方 + 2 圆（圆棋对称预设，方棋蛇形布子），**无破墙技能**！`,
      en: `### Objective
Outmaneuver opponents on a **7×7 magnetic slate grid** by moving and building walls. The instant all rival pieces are completely separated into isolated rooms, the match ends — **largest total sealed territory wins** (tiebreaker: **largest single room**)!

### Season 3 Movement Rules (NO 0-Move Allowed!)
- **■ Square Piece**: Moves **1 or 2 steps orthogonally in a straight line** (no turns).
- **● Circle Piece**: Moves **1 orthogonal step** OR **2 steps with a mandatory 90° L-turn** (CANNOT move 2 straight!).
- **Mandatory Wall**: After every move, you MUST lock **1 wall** on an open edge around your moved piece (90s timer).

### Two Authentic Show Modes
- **3-Player R1**: 1 Square + 1 Circle each (snake draft) + **1-time Wall Break power** to shatter 1 wall along your path!
- **2-Player R2 Final**: 2 Square + 2 Circle each (symmetric pre-placed Circles + snake-drafted Squares), **0 Wall Breaks**!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render: function renderGame(container, ctx) {
    const { state, mySeatId, lang, lastEvent, dispatch, sfx, ui } = ctx;
    const isZh = lang === 'zh';

    // SFX & Wall Shatter triggers
    const evKey = `${state.phase}-${state.subphase}-${state.turnNumber}-${state.setupIndex}-${state.pieces.length}-${state.lastWallPlaced?.turn ?? ''}-${state.lastWallBroken?.turn ?? ''}`;
    if (evKey !== uiState.lastEventKey) {
      uiState.lastEventKey = evKey;
      if (lastEvent?.type === 'PLACE_SETUP_PIECE' || lastEvent?.type === 'MOVE_PIECE') {
        sfx.play('tilePlace');
      } else if (lastEvent?.type === 'PLACE_WALL') {
        playWallLock();
      } else if (lastEvent?.type === 'WALL_BREAK') {
        playWallShatter();
        uiState.shatterEdge = lastEvent.edge || state.lastWallBroken;
        clearTimeout(uiState.shatterTimer);
        uiState.shatterTimer = setTimeout(() => {
          uiState.shatterEdge = null;
        }, 800);
      }
    }

    const activePlayer = state.players.find((p) => p.seatId === state.currentTurnSeatId);
    const me = state.players.find((p) => p.seatId === mySeatId) || null;
    const isMyTurn = Boolean(mySeatId && state.currentTurnSeatId === mySeatId && state.phase !== 'ended');

    // Auto-select first movable own piece if none selected (or selection invalid)
    if (!isMyTurn || state.subphase !== 'move') {
      uiState.wallBreakArmed = false;
    }
    if (me && me.wallBreaksLeft <= 0) uiState.wallBreakArmed = false;

    let selectedPiece = null;
    let legalMoves = [];
    let legalWallEdges = [];

    if (isMyTurn && state.phase === 'play' && state.subphase === 'move') {
      const myPieces = state.pieces.filter((pc) => pc.seatId === mySeatId);
      selectedPiece = myPieces.find((pc) => pc.id === uiState.selectedPieceId) || null;
      if (!selectedPiece) {
        selectedPiece =
          myPieces.find((pc) => getLegalMovesForPiece(state, pc, uiState.wallBreakArmed).length > 0) ||
          myPieces[0] ||
          null;
        uiState.selectedPieceId = selectedPiece?.id || null;
      }
      if (selectedPiece) {
        legalMoves = getLegalMovesForPiece(state, selectedPiece, uiState.wallBreakArmed);
      }
    } else if (isMyTurn && state.phase === 'play' && state.subphase === 'place_wall') {
      const moved = state.pieces.find((pc) => pc.id === state.movedPieceId);
      if (moved) {
        legalWallEdges = getLegalWallsAround(state, moved.r, moved.c);
      }
    }

    // Headline
    let headline = '';
    if (state.phase === 'ended') {
      headline = isZh ? '🏁 领地全部隔离 · 最终面积结算完成' : '🏁 All Territories Sealed · Final Scoring';
    } else if (state.phase === 'setup') {
      const slot = state.setupQueue[state.setupIndex];
      const shapeTxt = slot?.shape === 'square' ? (isZh ? '方棋 ■' : 'Square ■') : isZh ? '圆棋 ●' : 'Circle ●';
      headline = isMyTurn
        ? isZh
          ? `📍 布子阶段：请点击棋盘空位摆放你的【${shapeTxt}】`
          : `📍 SETUP: Click any empty cell to place your ${shapeTxt}`
        : isZh
        ? `⏳ 等待 ${activePlayer?.name || ''} 摆放 ${shapeTxt}...`
        : `⏳ Waiting for ${activePlayer?.name || ''} to place ${shapeTxt}...`;
    } else if (state.subphase === 'move') {
      headline = isMyTurn
        ? uiState.wallBreakArmed
          ? isZh
            ? '⚡ 破墙已充能！点击棋子与带 ⚡ 的穿墙落点'
            : '⚡ WALL BREAK ARMED! Pick piece & ⚡ breach destination'
          : isZh
          ? '🎯 第一步：选择己方棋子并移动（方棋直走1–2 · 圆棋1格或90°L拐）'
          : '🎯 STEP 1: Select your piece & move (Square: 1–2 straight · Circle: 1 or L-turn)'
        : isZh
        ? `⏳ 等待 ${activePlayer?.name || ''} 移动棋子...`
        : `⏳ Waiting for ${activePlayer?.name || ''} to move...`;
    } else {
      headline = isMyTurn
        ? isZh
          ? '🧱 第二步：点击棋子四周闪烁的金色槽位立起 1 面围墙！'
          : '🧱 STEP 2: Click a glowing brass groove around your piece to lock 1 wall!'
        : isZh
        ? `🧱 ${activePlayer?.name || ''} 正在建造围墙...`
        : `🧱 ${activePlayer?.name || ''} is placing a wall...`;
    }

    const modeBadge =
      state.modeLabel === 'R1_3P'
        ? isZh
          ? 'R1 三人混战 · 含破墙'
          : 'R1 3-PLAYER · WALL BREAK'
        : isZh
        ? 'R2 双人死亡战'
        : 'R2 2-PLAYER FINAL';

    container.innerHTML = `
      <div class="wg-arena">
        <div class="wg-banner ${uiState.wallBreakArmed ? 'is-break-active' : ''}">
          <div style="font-weight:700;font-size:14.5px;">${UI.escapeHtml(headline)}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="dp-badge">${UI.escapeHtml(modeBadge)}</span>
            <span class="dp-badge" style="color:var(--dp-ink-muted);border-color:var(--dp-border-subtle);background:rgba(8,10,16,0.75);">
              ${isZh ? `回合 #${state.turnNumber}` : `TURN #${state.turnNumber}`}
            </span>
          </div>
        </div>

        <!-- Magnetic 7x7 Architectural Slate Board -->
        <section class="wg-board-stage">
          <div class="wg-svg-wrap">
            ${renderBoardSvg(state, mySeatId, legalMoves, legalWallEdges, isMyTurn)}
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--dp-ink-muted);text-align:center;">
            ${
              isMyTurn && state.phase === 'play' && state.subphase === 'move' && selectedPiece
                ? isZh
                  ? `当前选中：${selectedPiece.shape === 'square' ? '■ 方形棋子（直线 1–2 格）' : '● 圆形棋子（1 格 或 90° L 拐 2 格）'} · 可点击切换己方棋子`
                  : `Selected: ${selectedPiece.shape === 'square' ? '■ Square (1–2 straight)' : '● Circle (1 step or 90° L-turn)'} · Click your pieces to switch`
                : isZh
                ? '领地完全封闭后自动以半透明色块染色并浮现面积数字'
                : 'Sealed exclusive regions automatically illuminate with live area badges'
            }
          </div>
        </section>

        <!-- Right Telemetry & Controls -->
        <aside class="wg-side-col">
          <!-- Territory Scoreboard -->
          <div class="wg-card">
            <div class="wg-card-title">
              <span>${isZh ? '实时领地与破墙状态' : 'TERRITORY & WALL BREAKS'}</span>
              <span style="font-size:10.5px;color:var(--dp-ink-muted);">${isZh ? '平分比最大单间' : 'Tie: Max Room'}</span>
            </div>
            <div class="wg-faction-list">
              ${state.players
                .map((p) => {
                  const sc = state.territories?.scores?.[p.seatId] || 0;
                  const maxRm = state.territories?.largestRoom?.[p.seatId] || 0;
                  const isTurn = state.currentTurnSeatId === p.seatId && state.phase !== 'ended';
                  return `
                    <div class="wg-faction-row ${isTurn ? 'is-turn' : ''}">
                      <div style="display:flex;align-items:center;gap:9px;overflow:hidden;">
                        <span class="wg-faction-swatch" style="background:${p.color};box-shadow:0 0 8px ${p.color};"></span>
                        <div style="overflow:hidden;">
                          <div style="font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${UI.escapeHtml(p.name)}${p.seatId === mySeatId ? (isZh ? ' (你)' : ' (You)') : ''}
                          </div>
                          <div style="font-size:11px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                            ${isZh ? `最大单间: ${maxRm}` : `Max Room: ${maxRm}`}
                            ${p.wallBreaksLeft > 0 ? ` · ⚡×${p.wallBreaksLeft}` : ''}
                          </div>
                        </div>
                      </div>
                      <div style="text-align:right;flex-shrink:0;">
                        <div style="font-family:var(--dp-font-mono);font-size:20px;font-weight:800;color:${p.color};line-height:1;">${sc}</div>
                        <div style="font-size:10px;color:var(--dp-ink-faint);">${isZh ? '已封格' : 'SEALED'}</div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>

            ${
              me && (me.wallBreaksLeft > 0 || state.modeLabel === 'R1_3P')
                ? `
                  <div style="margin-top:12px;">
                    <button
                      type="button"
                      class="wg-break-btn ${uiState.wallBreakArmed ? 'is-armed' : ''}"
                      id="wg-toggle-break"
                      ${!isMyTurn || state.phase !== 'play' || state.subphase !== 'move' || me.wallBreaksLeft <= 0 ? 'disabled' : ''}
                    >
                      <span>⚡ ${uiState.wallBreakArmed ? (isZh ? '破墙模式已激活（点击取消）' : 'WALL BREAK ARMED (Cancel)') : isZh ? '发动破墙移动 (Wall Break)' : 'Arm Wall Break'}</span>
                      <span style="font-family:var(--dp-font-mono);font-size:12px;">${me.wallBreaksLeft} / 1</span>
                    </button>
                  </div>
                `
                : ''
            }
          </div>

          <!-- Movement Legend -->
          <div class="wg-card">
            <div class="wg-card-title">
              <span>${isZh ? '棋子步法速查（禁 0 步）' : 'PIECE RULES (NO 0-MOVE)'}</span>
            </div>
            <div class="wg-legend-grid">
              <div class="wg-legend-item">
                <strong style="color:var(--dp-brass-bright);">■ ${isZh ? '方形棋子' : 'Square Piece'}</strong>
                <span>${isZh ? '单方向直线 1 或 2 格（不可拐弯）' : '1 or 2 straight orthogonal steps only'}</span>
              </div>
              <div class="wg-legend-item">
                <strong style="color:var(--dp-cyan);">● ${isZh ? '圆形棋子' : 'Circle Piece'}</strong>
                <span>${isZh ? '1 格 或 90° L 拐 2 格（禁直走 2 格）' : '1 step OR 90° L-turn 2 steps (no 2 straight)'}</span>
              </div>
            </div>
          </div>

          <!-- Match Feed -->
          <div class="wg-card">
            <div class="wg-card-title">
              <span>${isZh ? '战局记录' : 'TACTICAL LOG'}</span>
            </div>
            <div class="wg-log">
              ${state.history
                .slice()
                .reverse()
                .map(
                  (h) => `
                  <div class="wg-log-row ${h.tone === 'break' ? 'is-break' : ''}">
                    ${UI.escapeHtml(isZh ? h.zh : h.en)}
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        </aside>
      </div>
    `;

    // Bind Setup placement clicks
    container.querySelectorAll('[data-setup-cell]').forEach((el) => {
      el.addEventListener('click', async () => {
        const [r, c] = el.dataset.setupCell.split(',').map(Number);
        const res = await dispatch({ type: 'PLACE_SETUP_PIECE', payload: { r, c } });
        if (!res.ok) ui.toast(res.reason, 'error');
      });
    });

    // Bind Piece selection
    container.querySelectorAll('[data-select-piece]').forEach((el) => {
      el.addEventListener('click', () => {
        sfx.play('click');
        uiState.selectedPieceId = el.dataset.selectPiece;
        renderGame(container, ctx);
      });
    });

    // Bind Destination cell click
    container.querySelectorAll('[data-move-dest]').forEach((el) => {
      el.addEventListener('click', async () => {
        const [toR, toC] = el.dataset.moveDest.split(',').map(Number);
        const res = await dispatch({
          type: 'MOVE_PIECE',
          payload: {
            pieceId: uiState.selectedPieceId,
            toR,
            toC,
            useWallBreak: uiState.wallBreakArmed,
          },
        });
        if (!res.ok) ui.toast(res.reason, 'error');
        else uiState.wallBreakArmed = false;
      });
    });

    // Bind Wall placement click
    container.querySelectorAll('[data-place-wall]').forEach((el) => {
      el.addEventListener('click', async () => {
        const [orientation, rStr, cStr] = el.dataset.placeWall.split(':');
        const res = await dispatch({
          type: 'PLACE_WALL',
          payload: { edge: { orientation, r: Number(rStr), c: Number(cStr) } },
        });
        if (!res.ok) ui.toast(res.reason, 'error');
      });
    });

    // Bind Wall Break toggle
    container.querySelector('#wg-toggle-break')?.addEventListener('click', () => {
      sfx.play('bid');
      uiState.wallBreakArmed = !uiState.wallBreakArmed;
      renderGame(container, ctx);
    });
  },
});

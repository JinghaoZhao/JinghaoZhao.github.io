/**
 * God's Test: 7×7 Magic Square (神之考验：49魔方阵 / 신의 시험)
 * Pure deterministic game rules + Siamese-method solver/replay + 15-Zone Exile Cipher lore.
 */

export const GRID_SIZE = 7;
export const MAGIC_CONSTANT = 175;
export const LOCKED_CELL = { r: 0, c: 3, value: 1 };

export const TIME_LIMIT_MS = {
  '60m': 60 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '15m': 15 * 60 * 1000,
};

/**
 * Generate the canonical De la Loubère / Siamese 7×7 Magic Square starting with 1 at (0, 3),
 * along with the exact 49-step construction trace for the Hint Oracle and Animated Solution Replay.
 */
function buildSiameseData() {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  const steps = [];
  let r = LOCKED_CELL.r;
  let c = LOCKED_CELL.c;
  grid[r][c] = 1;
  steps.push({
    num: 1,
    r,
    c,
    fromR: null,
    fromC: null,
    moveType: 'start',
  });

  for (let num = 2; num <= 49; num++) {
    const prevR = r;
    const prevC = c;
    const rawR = r - 1;
    const rawC = c + 1;
    const wrappedTop = rawR < 0;
    const wrappedRight = rawC >= GRID_SIZE;
    let nr = (rawR + GRID_SIZE) % GRID_SIZE;
    let nc = rawC % GRID_SIZE;
    let moveType = 'up-right';

    if (grid[nr][nc] !== 0) {
      nr = (prevR + 1) % GRID_SIZE;
      nc = prevC;
      moveType = 'drop-down';
    } else if (wrappedTop && wrappedRight) {
      moveType = 'wrap-both';
    } else if (wrappedTop) {
      moveType = 'wrap-top';
    } else if (wrappedRight) {
      moveType = 'wrap-right';
    }

    r = nr;
    c = nc;
    grid[r][c] = num;
    steps.push({
      num,
      r,
      c,
      fromR: prevR,
      fromC: prevC,
      moveType,
    });
  }

  return { grid, steps };
}

const _siamese = buildSiameseData();
export const SIAMESE_SOLUTION = _siamese.grid;
export const SIAMESE_STEPS = _siamese.steps;

/**
 * 15-Zone Exile Wall Hieroglyphic Cipher (流放地 15 区象形古语墙 — Ep 4–10 lore).
 * Zones 7, 11, and 15 contain direct sacred revelations for God's Test.
 */
export const EXILE_CIPHER_ZONES = [
  {
    id: 1,
    glyph: '𓉔 𓂋 𓇳',
    code: 'ZONE I',
    isKeyClue: false,
    title: { zh: '双门之誓', en: 'Oath of the Twin Doors' },
    decoded: {
      zh: '「踏入红门者，已死之躯仍留一息；蓝门通往归途，红门通往流放神殿。」',
      en: '"Who steps through the Red Door lingers between elimination and rebirth; the Blue Door ends the journey forever."',
    },
  },
  {
    id: 2,
    glyph: '𓆣 𓏤 𓏤 𓏤 𓏤',
    code: 'ZONE II',
    isKeyClue: false,
    title: { zh: '四魂满溢', en: 'Vessel of Four' },
    decoded: {
      zh: '「流放地至多容纳四名流放者。当四座火盆齐燃，血祭之试便随之开启。」',
      en: '"The Exile Temple holds at most four souls. When all four braziers ignite, the Exile Match begins."',
    },
  },
  {
    id: 3,
    glyph: '𓏟 ✕ 𓂝',
    code: 'ZONE III',
    isKeyClue: false,
    title: { zh: '无墨之戒', en: 'Vow Without Ink' },
    decoded: {
      zh: '「此殿禁绝纸笔与刻具。唯有双眼铭记、口耳相传，方能破译十五区圣言。」',
      en: '"Paper and quill are forbidden here. Only memory and whispered alliance may preserve the 15 zones."',
    },
  },
  {
    id: 4,
    glyph: '𓊹 𓍿 𓈖',
    code: 'ZONE IV',
    isKeyClue: false,
    title: { zh: '碎片失衡', en: 'Weight of Pieces' },
    decoded: {
      zh: '「在死亡重启的秩序中，碎片归零并非终结，唯有名次与试炼裁定生死。」',
      en: '"In Dead Again, zero Pieces is not death—standing and trial alone judge who returns."',
    },
  },
  {
    id: 5,
    glyph: '𓆸 𓇼 𓇼',
    code: 'ZONE V',
    isKeyClue: false,
    title: { zh: '孤勇者之路', en: 'Path of the Solitary' },
    decoded: {
      zh: '「除却流放地淘汰战的生还，神殿深处另藏一道仅容一人独闯的复活密门。」',
      en: '"Beyond survival in Exile Matches lies a solitary resurrection sanctuary for one bold challenger."',
    },
  },
  {
    id: 6,
    glyph: '𓇳 𓏲 𓈐',
    code: 'ZONE VI',
    isKeyClue: false,
    title: { zh: '一辰金沙', en: 'One Hour of Gold Sand' },
    decoded: {
      zh: '「神之考验限期一小时。沙漏坠尽而石阵未成者，将彻底湮灭，永别赛场。」',
      en: '"God\'s Test grants one single hour. Should the golden sand run dry before completion, elimination is permanent."',
    },
  },
  {
    id: 7,
    glyph: '◫ VII × VII = 175',
    code: 'ZONE VII ★',
    isKeyClue: true,
    title: { zh: '圣典密文·七乘七阵', en: 'Sacred Clue · The 7×7 Constant' },
    decoded: {
      zh: '【核心破译】「七横、七纵、双斜十六道圣线，填满一至四十九而不复。每线之和皆须恰好归于『一七五』：7 × (49 + 1) ÷ 2 = 175！」',
      en: '[KEY CIPHER] "Seven rows, seven columns, two diagonals—sixteen sacred lines filled with 1 to 49 without repeat. Every line must equal 175: 7 × (49 + 1) / 2 = 175!"',
    },
  },
  {
    id: 8,
    glyph: '𓊽 𓅓 𓂓',
    code: 'ZONE VIII',
    isKeyClue: false,
    title: { zh: '基石永固', en: 'The Immovable Keystone' },
    decoded: {
      zh: '「圣坛首行正中已铸熔金之『壹』（第1行第4列）。万物由此而生，不可撼动。」',
      en: '"Molten gold numeral ONE is sealed forever at top-center (Row 1, Col 4). From this keystone all order unfolds."',
    },
  },
  {
    id: 9,
    glyph: '𓍢 25 𓍢',
    code: 'ZONE IX',
    isKeyClue: false,
    title: { zh: '天枢居中', en: 'Heart of Balance' },
    decoded: {
      zh: '「天地对称，首尾合五十（1+49=50）。方阵正心（第4行第4列）当镇中位数『二十五』。」',
      en: '"Opposites mirror to fifty (1 + 49 = 50). At the exact heart of the tablet (Row 4, Col 4) rests the median: 25."',
    },
  },
  {
    id: 10,
    glyph: '𓊪 𓂋 𓏏',
    code: 'ZONE X',
    isKeyClue: false,
    title: { zh: '虚实幻象', en: 'Trial of Mental Fire' },
    decoded: {
      zh: '「原剧神殿不设算筹与和值刻度。唯有心怀规律而非蛮算，方能于一小时内破阵。」',
      en: '"The temple gives no calculator—brute force fails the clock. Only discovering the hidden geometric law prevails."',
    },
  },
  {
    id: 11,
    glyph: '↗ ↻ ↓ · VII',
    code: 'ZONE XI ★',
    isKeyClue: true,
    title: { zh: '圣典密文·右上折返律', en: 'Sacred Clue · Law of the Diagonal Step' },
    decoded: {
      zh: '【核心破译】「自『1』起，每步向右上斜行一格（↗）；越顶则折返至底行，越右则折返至左列（↻）；若前格已被石碑占据，则改退至当前格之正下方一格（↓）！」',
      en: '[KEY CIPHER] "From 1, step diagonally UP-RIGHT (↗); wrap past the top to the bottom row, past the right to the left column (↻). If blocked by a stone, drop one cell directly BELOW your current tile (↓)!"',
    },
  },
  {
    id: 12,
    glyph: '𓆼 7 · 14 · 21',
    code: 'ZONE XII',
    isKeyClue: false,
    title: { zh: '七步一折', en: 'Sevenfold Cadence' },
    decoded: {
      zh: '「每逢七之倍数（7、14、21、28、35、42），斜行必遇阻石，顺势下沉一格即开启新斜列。」',
      en: '"At every multiple of seven (7, 14, 21, 28, 35, 42), the diagonal meets stone—drop down one tile to open the next run."',
    },
  },
  {
    id: 13,
    glyph: '𓋹 𓍑 𓋴',
    code: 'ZONE XIII',
    isKeyClue: false,
    title: { zh: '终石归底', en: 'The Final Stone' },
    decoded: {
      zh: '「当第四十九石落于底行正中（第7行第4列），与首行之『1』遥相呼应，十六道金纹尽数点燃。」',
      en: '"When stone 49 lands at bottom-center (Row 7, Col 4), directly opposing 1, all sixteen golden seals blaze as one."',
    },
  },
  {
    id: 14,
    glyph: '𓊮 𓁹 𓊮',
    code: 'ZONE XIV',
    isKeyClue: false,
    title: { zh: '逆转生死', en: 'Dead Again' },
    decoded: {
      zh: '「破阵之刹那，流放石门轰然开启。试炼者携荣耀重返主赛场，震慑生活馆与监狱馆。」',
      en: '"At completion, the basalt gates thunder open. The challenger returns to the Main Match—DEAD AGAIN."',
    },
  },
  {
    id: 15,
    glyph: '𓋴 𓏏 𓇼 175',
    code: 'ZONE XV ★',
    isKeyClue: true,
    title: { zh: '圣典密文·暹罗法印', en: 'Sacred Clue · Seal of De la Loubère' },
    decoded: {
      zh: '【终极真名】「此阵即十七世纪『德拉卢贝尔法 / 暹罗法』奇数魔方阵。按 1(顶中) → 2(底五) → 3 → 4 → 5(四行一列) 循序铺陈，三分钟即可通关神之考验！」',
      en: '[ULTIMATE SEAL] "This ancient ritual is De la Loubère\'s Siamese Method for odd magic squares. Follow 1(R1,C4) → 2(R7,C5) → 3 → 4 → 5(R4,C1) to conquer God\'s Test in minutes!"',
    },
  },
];

export function createEmptyGrid() {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  grid[LOCKED_CELL.r][LOCKED_CELL.c] = LOCKED_CELL.value;
  return grid;
}

export function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

/**
 * Pure diagnostic analysis of a 7×7 grid.
 * Returns per-line sums, completion status, duplicates, and magic square validity.
 */
export function analyzeBoard(grid) {
  const rowSums = Array(GRID_SIZE).fill(0);
  const colSums = Array(GRID_SIZE).fill(0);
  const rowCounts = Array(GRID_SIZE).fill(0);
  const colCounts = Array(GRID_SIZE).fill(0);
  let diagMain = 0;
  let diagMainCount = 0;
  let diagAnti = 0;
  let diagAntiCount = 0;
  let filledCount = 0;

  const numPositions = new Map();
  const duplicateCells = new Set();

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = grid[r][c] | 0;
      if (v > 0) {
        filledCount += 1;
        rowSums[r] += v;
        colSums[c] += v;
        rowCounts[r] += 1;
        colCounts[c] += 1;
        if (r === c) {
          diagMain += v;
          diagMainCount += 1;
        }
        if (r + c === GRID_SIZE - 1) {
          diagAnti += v;
          diagAntiCount += 1;
        }
        if (!numPositions.has(v)) {
          numPositions.set(v, [{ r, c }]);
        } else {
          numPositions.get(v).push({ r, c });
        }
      }
    }
  }

  const duplicateNums = new Set();
  for (const [num, list] of numPositions.entries()) {
    if (list.length > 1 || num < 1 || num > 49) {
      duplicateNums.add(num);
      for (const pos of list) duplicateCells.add(`${pos.r},${pos.c}`);
    }
  }

  const lineHasDup = (cells) => cells.some(([r, c]) => duplicateCells.has(`${r},${c}`));

  const rowStatus = rowSums.map((sum, r) => {
    const cells = Array.from({ length: GRID_SIZE }, (_, c) => [r, c]);
    const dup = lineHasDup(cells);
    const full = rowCounts[r] === GRID_SIZE;
    if (dup || sum > MAGIC_CONSTANT || (full && sum !== MAGIC_CONSTANT)) return 'error';
    if (full && sum === MAGIC_CONSTANT) return 'valid';
    return 'pending';
  });

  const colStatus = colSums.map((sum, c) => {
    const cells = Array.from({ length: GRID_SIZE }, (_, r) => [r, c]);
    const dup = lineHasDup(cells);
    const full = colCounts[c] === GRID_SIZE;
    if (dup || sum > MAGIC_CONSTANT || (full && sum !== MAGIC_CONSTANT)) return 'error';
    if (full && sum === MAGIC_CONSTANT) return 'valid';
    return 'pending';
  });

  const mainCells = Array.from({ length: GRID_SIZE }, (_, i) => [i, i]);
  const mainDup = lineHasDup(mainCells);
  const diagMainStatus =
    mainDup || diagMain > MAGIC_CONSTANT || (diagMainCount === GRID_SIZE && diagMain !== MAGIC_CONSTANT)
      ? 'error'
      : diagMainCount === GRID_SIZE && diagMain === MAGIC_CONSTANT
      ? 'valid'
      : 'pending';

  const antiCells = Array.from({ length: GRID_SIZE }, (_, i) => [i, GRID_SIZE - 1 - i]);
  const antiDup = lineHasDup(antiCells);
  const diagAntiStatus =
    antiDup || diagAnti > MAGIC_CONSTANT || (diagAntiCount === GRID_SIZE && diagAnti !== MAGIC_CONSTANT)
      ? 'error'
      : diagAntiCount === GRID_SIZE && diagAnti === MAGIC_CONSTANT
      ? 'valid'
      : 'pending';

  let validLinesCount = 0;
  for (const s of rowStatus) if (s === 'valid') validLinesCount++;
  for (const s of colStatus) if (s === 'valid') validLinesCount++;
  if (diagMainStatus === 'valid') validLinesCount++;
  if (diagAntiStatus === 'valid') validLinesCount++;

  const keystoneOk = grid[LOCKED_CELL.r][LOCKED_CELL.c] === LOCKED_CELL.value;
  const isMagicSquare =
    keystoneOk &&
    filledCount === 49 &&
    duplicateNums.size === 0 &&
    numPositions.size === 49 &&
    validLinesCount === 16;

  return {
    rowSums,
    colSums,
    rowCounts,
    colCounts,
    rowStatus,
    colStatus,
    diagMain,
    diagMainCount,
    diagMainStatus,
    diagAnti,
    diagAntiCount,
    diagAntiStatus,
    filledCount,
    validLinesCount,
    duplicateNums,
    duplicateCells,
    isMagicSquare,
    placedNumbers: numPositions,
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function isLocked(r, c) {
  return r === LOCKED_CELL.r && c === LOCKED_CELL.c;
}

function inBounds(r, c) {
  return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

function pushUndo(player, prevGrid) {
  // Store compact diff only to keep serialized state lean for WebRTC/MQTT
  const diffs = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (prevGrid[r][c] !== player.grid[r][c]) {
        diffs.push([r, c, prevGrid[r][c]]);
      }
    }
  }
  if (diffs.length > 0) {
    player.undoStack.push(diffs);
    if (player.undoStack.length > 40) player.undoStack.shift();
  }
}

function finishIfSolved(next, seatId, now) {
  const player = next.players[seatId];
  const stats = analyzeBoard(player.grid);
  player.filledCount = stats.filledCount;
  player.validLinesCount = stats.validLinesCount;

  if (stats.isMagicSquare) {
    player.status = 'resurrected';
    player.finishedAt = now;
    player.elapsedMs = Math.max(1000, now - (next.trialStartedAt || now));
    next.phase = 'ended';
    next.winnerSeatId = seatId;
    next.endReason = 'resurrected';
    for (const [sid, p] of Object.entries(next.players)) {
      if (sid !== seatId && p.status === 'solving') {
        p.status = 'eliminated';
      }
    }
    return true;
  }
  return false;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const opts = ctx?.options || {};
    const limitKey = TIME_LIMIT_MS[opts.timeLimit] ? opts.timeLimit : '60m';
    const timeLimitMs = TIME_LIMIT_MS[limitKey];
    const skipPrelude = Boolean(opts.skipPrelude);
    const now = ctx?.now || Date.now();

    const players = {};
    for (const s of seats) {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '◆',
        isBot: Boolean(s.isBot),
        grid: createEmptyGrid(),
        undoStack: [],
        filledCount: 1,
        validLinesCount: 0,
        movesCount: 0,
        unlockedHintTier: 0,
        hintsUsed: 0,
        decodedZones: [],
        status: skipPrelude ? 'solving' : 'prelude',
        finishedAt: null,
        elapsedMs: null,
        botStepIdx: 1,
        botPonderTicks: 0,
      };
    }

    return {
      phase: skipPrelude ? 'trial' : 'prelude', // 'prelude' | 'trial' | 'ended'
      timeLimitKey: limitKey,
      timeLimitMs,
      blindModeDefault: Boolean(opts.blindMode),
      trialStartedAt: skipPrelude ? now : null,
      seatOrder: seats.map((s) => s.seatId),
      players,
      winnerSeatId: null,
      endReason: null, // 'resurrected' | 'timeout' | 'surrendered' | 'blue_door'
      lastHintCell: null,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || !action || !action.type) return { ok: false, reason: 'Invalid action' };
    const player = fullState.players?.[seatId];
    if (!player) return { ok: false, reason: 'Unknown seat' };

    if (fullState.phase === 'ended') {
      return { ok: false, reason: 'Trial has already concluded' };
    }

    const { type, payload = {} } = action;

    if (type === 'DECODE_ZONE') {
      const zid = Number(payload.zoneId);
      if (!Number.isInteger(zid) || zid < 1 || zid > 15) return { ok: false, reason: 'Invalid zone' };
      return { ok: true };
    }

    if (fullState.phase === 'prelude') {
      if (type === 'ENTER_RED_DOOR' || type === 'CHOOSE_BLUE_DOOR') return { ok: true };
      return { ok: false, reason: 'Choose a door in the Choice Room first' };
    }

    if (fullState.phase !== 'trial' || player.status !== 'solving') {
      return { ok: false, reason: 'Not currently solving' };
    }

    if (type === 'PLACE_NUMBER') {
      const { r, c, num } = payload;
      if (!inBounds(r, c)) return { ok: false, reason: 'Cell out of bounds' };
      if (isLocked(r, c)) return { ok: false, reason: 'Keystone 1 at top-center is locked' };
      const n = Number(num);
      if (!Number.isInteger(n) || n < 2 || n > 49) return { ok: false, reason: 'Number must be 2–49' };
      return { ok: true };
    }

    if (type === 'CLEAR_CELL') {
      const { r, c } = payload;
      if (!inBounds(r, c) || isLocked(r, c)) return { ok: false, reason: 'Cannot clear this cell' };
      return { ok: true };
    }

    if (type === 'SWAP_CELLS') {
      const { r1, c1, r2, c2 } = payload;
      if (!inBounds(r1, c1) || !inBounds(r2, c2)) return { ok: false, reason: 'Cell out of bounds' };
      if (isLocked(r1, c1) || isLocked(r2, c2)) return { ok: false, reason: 'Cannot move keystone 1' };
      return { ok: true };
    }

    if (type === 'UNDO') {
      if (!player.undoStack.length) return { ok: false, reason: 'Nothing to undo' };
      return { ok: true };
    }

    if (type === 'CLEAR_BOARD' || type === 'USE_HINT' || type === 'SURRENDER') {
      return { ok: true };
    }

    if (type === 'BOT_PONDER') {
      if (!player.isBot) return { ok: false, reason: 'Bot only' };
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${type}` };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const player = next.players[seatId];
    const now = ctx?.now || Date.now();
    const { type, payload = {} } = action;
    const events = [];

    if (type === 'DECODE_ZONE') {
      const zid = Number(payload.zoneId);
      if (!player.decodedZones.includes(zid)) {
        player.decodedZones.push(zid);
        player.decodedZones.sort((a, b) => a - b);
      }
      events.push({ type: 'DECODE_ZONE', seatId, zoneId: zid });
      return { state: next, events };
    }

    if (type === 'ENTER_RED_DOOR') {
      next.phase = 'trial';
      next.trialStartedAt = now;
      for (const p of Object.values(next.players)) {
        p.status = 'solving';
      }
      events.push({ type: 'ENTER_RED_DOOR', seatId });
      return { state: next, events };
    }

    if (type === 'CHOOSE_BLUE_DOOR') {
      player.status = 'withdrawn';
      const remainingHumans = Object.values(next.players).filter(
        (p) => !p.isBot && p.status !== 'withdrawn'
      );
      if (remainingHumans.length === 0) {
        next.phase = 'ended';
        next.endReason = 'blue_door';
      }
      events.push({ type: 'CHOOSE_BLUE_DOOR', seatId });
      return { state: next, events };
    }

    if (type === 'PLACE_NUMBER') {
      const { r, c } = payload;
      const n = Number(payload.num);
      const prevGrid = cloneGrid(player.grid);

      // Remove n if already placed elsewhere (ensures clean tile movement, zero accidental duplication)
      for (let rr = 0; rr < GRID_SIZE; rr++) {
        for (let cc = 0; cc < GRID_SIZE; cc++) {
          if (player.grid[rr][cc] === n) {
            player.grid[rr][cc] = 0;
          }
        }
      }

      player.grid[r][c] = n;
      pushUndo(player, prevGrid);
      player.movesCount += 1;

      const prevValid = player.validLinesCount;
      const solved = finishIfSolved(next, seatId, now);
      const newLineLit = player.validLinesCount > prevValid;
      events.push({
        type: solved ? 'RESURRECTED' : newLineLit ? 'LINE_IGNITED' : 'PLACE_NUMBER',
        seatId,
        r,
        c,
        num: n,
        validLinesCount: player.validLinesCount,
      });
      return { state: next, events };
    }

    if (type === 'CLEAR_CELL') {
      const { r, c } = payload;
      if (player.grid[r][c] !== 0) {
        const prevGrid = cloneGrid(player.grid);
        player.grid[r][c] = 0;
        pushUndo(player, prevGrid);
        const stats = analyzeBoard(player.grid);
        player.filledCount = stats.filledCount;
        player.validLinesCount = stats.validLinesCount;
      }
      events.push({ type: 'CLEAR_CELL', seatId, r, c });
      return { state: next, events };
    }

    if (type === 'SWAP_CELLS') {
      const { r1, c1, r2, c2 } = payload;
      if (r1 !== r2 || c1 !== c2) {
        const prevGrid = cloneGrid(player.grid);
        const tmp = player.grid[r1][c1];
        player.grid[r1][c1] = player.grid[r2][c2];
        player.grid[r2][c2] = tmp;
        pushUndo(player, prevGrid);
        player.movesCount += 1;
        const prevValid = player.validLinesCount;
        const solved = finishIfSolved(next, seatId, now);
        const newLineLit = player.validLinesCount > prevValid;
        events.push({
          type: solved ? 'RESURRECTED' : newLineLit ? 'LINE_IGNITED' : 'SWAP_CELLS',
          seatId,
          r1,
          c1,
          r2,
          c2,
        });
      }
      return { state: next, events };
    }

    if (type === 'UNDO') {
      const diffs = player.undoStack.pop();
      if (Array.isArray(diffs)) {
        for (const [r, c, val] of diffs) {
          if (!isLocked(r, c)) player.grid[r][c] = val;
        }
        const stats = analyzeBoard(player.grid);
        player.filledCount = stats.filledCount;
        player.validLinesCount = stats.validLinesCount;
      }
      events.push({ type: 'UNDO', seatId });
      return { state: next, events };
    }

    if (type === 'CLEAR_BOARD') {
      const prevGrid = cloneGrid(player.grid);
      player.grid = createEmptyGrid();
      pushUndo(player, prevGrid);
      player.filledCount = 1;
      player.validLinesCount = 0;
      events.push({ type: 'CLEAR_BOARD', seatId });
      return { state: next, events };
    }

    if (type === 'USE_HINT') {
      const requestedTier = Math.max(1, Math.min(3, Number(payload.tier) || player.unlockedHintTier + 1));
      player.unlockedHintTier = Math.max(player.unlockedHintTier, requestedTier);
      player.hintsUsed += 1;

      let oracleStep = null;
      if (requestedTier === 3) {
        // Find earliest Siamese step not yet accurately placed and place it
        const prevGrid = cloneGrid(player.grid);
        for (let i = 1; i < SIAMESE_STEPS.length; i++) {
          const step = SIAMESE_STEPS[i];
          if (player.grid[step.r][step.c] !== step.num) {
            // Clear existing placement of step.num if elsewhere
            for (let rr = 0; rr < GRID_SIZE; rr++) {
              for (let cc = 0; cc < GRID_SIZE; cc++) {
                if (player.grid[rr][cc] === step.num) player.grid[rr][cc] = 0;
              }
            }
            player.grid[step.r][step.c] = step.num;
            oracleStep = step;
            break;
          }
        }
        if (oracleStep) {
          pushUndo(player, prevGrid);
          player.movesCount += 1;
          next.lastHintCell = { seatId, ...oracleStep };
          const solved = finishIfSolved(next, seatId, now);
          if (solved) {
            events.push({ type: 'RESURRECTED', seatId, oracleStep });
            return { state: next, events };
          }
        }
      }

      events.push({ type: 'USE_HINT', seatId, tier: requestedTier, oracleStep });
      return { state: next, events };
    }

    if (type === 'SURRENDER') {
      player.status = 'surrendered';
      const activePlayers = Object.values(next.players).filter((p) => !p.isBot && p.status === 'solving');
      if (activePlayers.length === 0) {
        next.phase = 'ended';
        next.endReason = 'surrendered';
      }
      events.push({ type: 'SURRENDER', seatId });
      return { state: next, events };
    }

    if (type === 'BOT_PONDER') {
      player.botPonderTicks = (player.botPonderTicks || 0) + 1;
      // Place 1 Siamese tile every 9 ponder ticks (~6.3s per tile -> ~5 min full solve)
      if (player.botPonderTicks % 9 === 0 && player.botStepIdx < SIAMESE_STEPS.length) {
        const step = SIAMESE_STEPS[player.botStepIdx];
        player.grid[step.r][step.c] = step.num;
        player.botStepIdx += 1;
        player.movesCount += 1;
        const solved = finishIfSolved(next, seatId, now);
        events.push({
          type: solved ? 'RESURRECTED' : 'BOT_PROGRESS',
          seatId,
          filledCount: player.filledCount,
          validLinesCount: player.validLinesCount,
        });
      } else {
        events.push({ type: 'BOT_PONDER', seatId });
      }
      return { state: next, events };
    }

    return { state: next, events };
  },

  onPhaseTimeout(fullState) {
    if (!fullState || fullState.phase !== 'trial') return null;
    const next = cloneState(fullState);
    next.phase = 'ended';
    next.endReason = 'timeout';
    for (const p of Object.values(next.players)) {
      if (p.status === 'solving') p.status = 'eliminated';
    }
    return { state: next, events: [{ type: 'TIMEOUT' }] };
  },

  projectState(fullState, viewerSeatId) {
    if (!fullState) return null;
    const isSoloMatch = fullState.seatOrder.length === 1;
    const showAllBoards = fullState.phase === 'ended';

    const players = {};
    for (const sid of fullState.seatOrder) {
      const p = fullState.players[sid];
      // Expose full board to its owner, to everyone at match end, or to spectators watching a 1-player solo run
      const exposeBoard = showAllBoards || sid === viewerSeatId || (viewerSeatId === null && isSoloMatch);
      players[sid] = {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        filledCount: p.filledCount,
        validLinesCount: p.validLinesCount,
        movesCount: p.movesCount,
        unlockedHintTier: exposeBoard ? p.unlockedHintTier : 0,
        hintsUsed: p.hintsUsed,
        decodedZones: exposeBoard ? p.decodedZones : [],
        status: p.status,
        elapsedMs: p.elapsedMs,
        canUndo: exposeBoard ? p.undoStack.length > 0 : false,
        grid: exposeBoard ? p.grid : null,
      };
    }

    return {
      phase: fullState.phase,
      timeLimitKey: fullState.timeLimitKey,
      timeLimitMs: fullState.timeLimitMs,
      blindModeDefault: fullState.blindModeDefault,
      trialStartedAt: fullState.trialStartedAt,
      seatOrder: fullState.seatOrder,
      players,
      winnerSeatId: fullState.winnerSeatId,
      endReason: fullState.endReason,
      lastHintCell:
        fullState.lastHintCell && (fullState.lastHintCell.seatId === viewerSeatId || showAllBoards)
          ? fullState.lastHintCell
          : null,
    };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase !== 'trial') return null;
    return {
      phaseKey: `gods-test-trial-${fullState.trialStartedAt || 1}`,
      durationMs: fullState.timeLimitMs,
    };
  },

  computeBotAction(fullState, botSeatId) {
    if (!fullState || fullState.phase !== 'trial') return null;
    const bot = fullState.players?.[botSeatId];
    if (!bot || !bot.isBot || bot.status !== 'solving') return null;
    return { type: 'BOT_PONDER', payload: {} };
  },

  getResult(fullState) {
    if (!fullState || fullState.phase !== 'ended') return null;

    const sorted = fullState.seatOrder
      .map((sid) => fullState.players[sid])
      .sort((a, b) => {
        if (a.status === 'resurrected' && b.status !== 'resurrected') return -1;
        if (b.status === 'resurrected' && a.status !== 'resurrected') return 1;
        if (a.validLinesCount !== b.validLinesCount) return b.validLinesCount - a.validLinesCount;
        return b.filledCount - a.filledCount;
      });

    const winnerSeatIds = fullState.winnerSeatId ? [fullState.winnerSeatId] : [];
    const rankings = sorted.map((p) => {
      let label = `${p.validLinesCount}/16 · ${p.filledCount}/49`;
      if (p.status === 'resurrected') {
        const secs = Math.max(1, Math.round((p.elapsedMs || 0) / 1000));
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        label = `DEAD AGAIN ✦ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } else if (p.status === 'withdrawn') {
        label = 'BLUE DOOR · EXITED';
      } else if (p.status === 'surrendered') {
        label = `SURRENDERED (${p.validLinesCount}/16)`;
      } else if (p.status === 'eliminated') {
        label = `ELIMINATED (${p.validLinesCount}/16)`;
      }
      return {
        seatId: p.seatId,
        score: p.status === 'resurrected' ? 175 : p.validLinesCount,
        label,
      };
    });

    let summary;
    if (fullState.endReason === 'resurrected') {
      const w = fullState.players[fullState.winnerSeatId];
      summary = {
        zh: `石门轰然开启！${w?.name || '挑战者'} 集齐全部 16 条 175 神纹，成功通过神之考验，从流放地复活重返主赛场（DEAD AGAIN）！点击「查看终局棋盘」可观赏 49 步暹罗法动态演算回放。`,
        en: `The basalt temple gates thunder open! ${w?.name || 'Challenger'} ignited all 16 lines to 175 and conquered God's Test — DEAD AGAIN! Click "Inspect Board" to watch the animated 49-step Siamese Method replay.`,
      };
    } else if (fullState.endReason === 'blue_door') {
      summary = {
        zh: '你选择了蓝门，优雅地告别了第三季赛场。流放地神殿与 49 魔方阵的秘密继续沉睡于暗影之中。',
        en: 'You stepped through the Blue Door and departed the game with dignity. The secrets of the Exile Temple remain sealed.',
      };
    } else if (fullState.endReason === 'surrendered') {
      summary = {
        zh: '你放弃了本次试炼。点击「查看终局棋盘」，神殿将为你完整演示 49 步暹罗法（德拉卢贝尔法）破阵回放！',
        en: 'Trial forfeited. Click "Inspect Board" to unlock the full 49-step animated Siamese Method (De la Loubère) solution replay!',
      };
    } else {
      summary = {
        zh: '金沙坠尽，1 小时神之考验时间结束，挑战失败永久淘汰。点击「查看终局棋盘」观看 49 步暹罗法完整解法回放。',
        en: 'The golden sand has run dry. Time expired — permanently eliminated. Click "Inspect Board" to watch the full 49-step Siamese Method replay.',
      };
    }

    return { winnerSeatIds, rankings, summary };
  },
};

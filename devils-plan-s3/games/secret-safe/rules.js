/**
 * Living Quarters Secret Safe (生活馆秘密金库 / 생활동 비밀 금고)
 * Pure deterministic multi-act escape-room state machine (Ep 3–8)
 *
 * Act 1: Luxury Suite Exploration & Disguised Fake Electrical Outlet (insert 1 Piece)
 * Act 2: Concealed Circuit & Ultraviolet `?` Signal + Secret Wallpaper Peel
 * Act 3: 12-Piece Interlocking Mechanical Vault Lock (rotate & seat 12 grooved Devil's Pieces; returned on unlock)
 * Act 4: Secret Elevator Descent, Golden Talisman Seal & The Curse Barrier (+2 Prize Tokens vs Eternal Piece Curse)
 * Act 5: Ceremonial Aftermath (Particle Shattering / Curse Seal or Keeper of the Secret) -> Final Verdict
 */

export const GROOVE_PROFILES = [
  { id: 'crown', label: { zh: '王冠齿', en: 'Crown' }, code: 'I', teeth: [1, 0, 1, 1] },
  { id: 'twin', label: { zh: '双牙槽', en: 'Twin' }, code: 'II', teeth: [1, 1, 0, 0] },
  { id: 'chevron', label: { zh: '楔形纹', en: 'Chevron' }, code: 'III', teeth: [1, 0, 1, 0] },
  { id: 'trident', label: { zh: '三叉锁', en: 'Trident' }, code: 'IV', teeth: [1, 1, 1, 0] },
  { id: 'fang', label: { zh: '孤刃齿', en: 'Fang' }, code: 'V', teeth: [1, 0, 0, 0] },
  { id: 'helix', label: { zh: '错位键', en: 'Helix' }, code: 'VI', teeth: [0, 1, 1, 1] },
];

export const DEPTH_TYPES = [
  { id: 'shallow', mark: 'A', label: { zh: '浅槽', en: 'Shallow' } },
  { id: 'deep', mark: 'B', label: { zh: '深槽', en: 'Deep' } },
];

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function shuffleWithRng(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function buildVaultPuzzle(rng, relaxedMode) {
  // 12 unique groove+depth combinations (6 profiles × 2 depths)
  const combos = [];
  for (const prof of GROOVE_PROFILES) {
    for (const dep of DEPTH_TYPES) {
      combos.push({
        profileId: prof.id,
        depthId: dep.id,
        code: `${prof.code}-${dep.mark}`,
      });
    }
  }

  const orderedSockets = shuffleWithRng(combos, rng).map((c, slotIdx) => {
    const rotSteps = Math.floor(rng() * 4);
    const targetRotation = relaxedMode ? 0 : rotSteps * 90;
    return {
      slotIdx,
      profileId: c.profileId,
      depthId: c.depthId,
      code: c.code,
      targetRotation,
      lockedPieceId: null,
    };
  });

  const pieces = shuffleWithRng(combos, rng).map((c, idx) => {
    const matchSocket = orderedSockets.find(
      (s) => s.profileId === c.profileId && s.depthId === c.depthId
    );
    // Start rotated off-target in standard mode so rotation is tactile & meaningful
    let startRot = 0;
    if (!relaxedMode) {
      const offset = 1 + Math.floor(rng() * 3); // 90, 180, or 270 away
      startRot = (matchSocket.targetRotation + offset * 90) % 360;
    }
    return {
      pieceId: idx + 1,
      profileId: c.profileId,
      depthId: c.depthId,
      code: c.code,
      rotation: startRot,
      placedSlot: null,
    };
  });

  return { sockets: orderedSockets, pieces };
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx?.rng || Math.random;
    const opts = ctx?.options || {};
    const relaxedLock = Boolean(opts.relaxedLock);
    const startingPieces = Math.max(12, Number(opts.startingPieces) || 12);
    const vault = buildVaultPuzzle(rng, relaxedLock);

    return {
      act: 1, // 1: Suite & Outlet, 2: UV ? & Wallpaper, 3: 12-Piece Vault, 4: Elevator & Curse Barrier, 5: Epilogue
      archived: false,
      startedAt: ctx?.now || Date.now(),
      completedAt: null,
      seatOrder: seats.map((s) => s.seatId),
      seats: seats.map((s) => ({
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '◆',
        isBot: Boolean(s.isBot),
      })),
      // Shared escape-room inventory & status (collaborative in co-op)
      startingPieces,
      piecesHeld: startingPieces,
      piecesShattered: 0,
      prizeTokensClaimed: 0,
      cursed: false,
      ending: null, // 'cursed_hero' | 'keeper_of_secret'
      deciderSeatId: null,
      mistakes: 0,
      hintsUsed: 0,

      // Act 1 state
      suite: {
        paintingInspected: false,
        lampChecked: false,
        vanitySearched: false,
        hasPryTool: false,
        outletInspected: false,
        outletVoltageTested: false,
        screwTopRemoved: false,
        screwBottomRemoved: false,
        faceplateRemoved: false,
        relayPieceInserted: false,
      },

      // Act 2 state
      alcove: {
        uvDimmer: 18, // 0..100, >= 75 reveals UV `?` clearly
        uvRevealed: false,
        questionDotInspected: false,
        wallpaperPeel: 0, // 0..3 -> 3 reveals vault cavity
      },

      // Act 3 state
      vault: {
        relaxedLock,
        sockets: vault.sockets,
        pieces: vault.pieces,
        lockedCount: 0,
        gearAngle: 0,
        unlocked: false,
        hintedPair: null, // { pieceId, slotIdx, targetRotation }
      },

      // Act 4 state
      sanctum: {
        elevatorDescended: false,
        talismanTorn: false,
      },

      // Recent collaborative milestones
      discoveries: [],
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || !action || !action.type) return { ok: false, reason: 'Invalid action' };
    if (fullState.archived) return { ok: false, reason: 'Archive already sealed' };
    const seatExists = fullState.seats?.some((s) => s.seatId === seatId);
    if (!seatExists) return { ok: false, reason: 'Unknown seat' };

    const { type, payload = {} } = action;

    // Act 1 actions
    if (fullState.act === 1) {
      const allowed1 = [
        'INSPECT_PAINTING',
        'TOGGLE_LAMP',
        'SEARCH_VANITY',
        'INSPECT_OUTLET',
        'TEST_VOLTAGE',
        'REMOVE_SCREW',
        'INSERT_RELAY_PIECE',
        'ADVANCE_TO_ACT2',
      ];
      if (!allowed1.includes(type)) return { ok: false, reason: 'Not available in Act 1' };
      if (type === 'REMOVE_SCREW' && !fullState.suite.outletInspected) {
        return { ok: false, reason: 'Inspect the outlet first' };
      }
      if (type === 'INSERT_RELAY_PIECE' && !fullState.suite.faceplateRemoved) {
        return { ok: false, reason: 'Remove the fake outlet faceplate first' };
      }
      if (type === 'ADVANCE_TO_ACT2' && !fullState.suite.relayPieceInserted) {
        return { ok: false, reason: 'Insert 1 Devil\'s Piece into the hidden relay first' };
      }
      return { ok: true };
    }

    // Act 2 actions
    if (fullState.act === 2) {
      const allowed2 = ['SET_UV_DIMMER', 'INSPECT_QUESTION_DOT', 'PEEL_WALLPAPER', 'ADVANCE_TO_ACT3'];
      if (!allowed2.includes(type)) return { ok: false, reason: 'Not available in Act 2' };
      if (type === 'INSPECT_QUESTION_DOT' && !fullState.alcove.uvRevealed) {
        return { ok: false, reason: 'Dim the suite sconces to reveal the UV ? symbol first' };
      }
      if (type === 'PEEL_WALLPAPER' && !fullState.alcove.questionDotInspected) {
        return { ok: false, reason: 'Inspect the ? emblem dot to locate the wallpaper seam first' };
      }
      if (type === 'ADVANCE_TO_ACT3' && fullState.alcove.wallpaperPeel < 3) {
        return { ok: false, reason: 'Peel back the wallpaper panel completely first' };
      }
      return { ok: true };
    }

    // Act 3 actions
    if (fullState.act === 3) {
      const allowed3 = [
        'ROTATE_PIECE',
        'PLACE_VAULT_PIECE',
        'VAULT_HINT',
        'VAULT_AUTO_SEAT_ONE',
        'BOARD_ELEVATOR',
      ];
      if (!allowed3.includes(type)) return { ok: false, reason: 'Not available in Act 3' };
      if (type === 'ROTATE_PIECE') {
        const p = fullState.vault.pieces.find((x) => x.pieceId === Number(payload.pieceId));
        if (!p || p.placedSlot !== null) return { ok: false, reason: 'Piece cannot be rotated' };
      }
      if (type === 'PLACE_VAULT_PIECE') {
        const p = fullState.vault.pieces.find((x) => x.pieceId === Number(payload.pieceId));
        const sock = fullState.vault.sockets[Number(payload.slotIdx)];
        if (!p || p.placedSlot !== null) return { ok: false, reason: 'Piece already locked' };
        if (!sock || sock.lockedPieceId !== null) return { ok: false, reason: 'Socket already occupied' };
      }
      if (type === 'BOARD_ELEVATOR' && !fullState.vault.unlocked) {
        return { ok: false, reason: 'Interlock all 12 Pieces to unlock the secret elevator first' };
      }
      return { ok: true };
    }

    // Act 4 actions
    if (fullState.act === 4) {
      const allowed4 = ['DESCEND_ELEVATOR', 'TEAR_TALISMAN', 'BREACH_CURSE_BARRIER', 'WALK_AWAY'];
      if (!allowed4.includes(type)) return { ok: false, reason: 'Not available in Act 4' };
      if (type === 'TEAR_TALISMAN' && !fullState.sanctum.elevatorDescended) {
        return { ok: false, reason: 'Descend to B1 Secret Vault first' };
      }
      if ((type === 'BREACH_CURSE_BARRIER' || type === 'WALK_AWAY') && !fullState.sanctum.talismanTorn) {
        return { ok: false, reason: 'Tear the golden talisman seal to enter the Vault Sanctum first' };
      }
      return { ok: true };
    }

    // Act 5 ceremonial aftermath -> finalize verdict
    if (fullState.act === 5) {
      if (type === 'CONCLUDE_ARCHIVE') return { ok: true };
      return { ok: false, reason: 'Conclude the archive record' };
    }

    return { ok: false, reason: 'Invalid state' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const now = ctx?.now || Date.now();
    const actor = next.seats.find((s) => s.seatId === seatId)?.name || seatId;
    const { type, payload = {} } = action;
    const events = [];

    const addDiscovery = (zh, en) => {
      next.discoveries.push({ zh, en, actor, ts: now });
      if (next.discoveries.length > 16) next.discoveries.shift();
    };

    // --- ACT 1: Suite & Fake Outlet ---
    if (type === 'INSPECT_PAINTING') {
      next.suite.paintingInspected = true;
      addDiscovery(
        `${actor} 查验了胡桃木油画：画框后藏有通向梳妆台插座的暗线管道。`,
        `${actor} inspected the walnut painting: a concealed brass conduit runs toward the vanity outlet.`
      );
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'TOGGLE_LAMP') {
      next.suite.lampChecked = !next.suite.lampChecked;
      addDiscovery(
        `${actor} 切换了床头铜灯：主插座正常供电，但梳妆台旁的副插座毫无电流反应。`,
        `${actor} toggled the bedside lamp: main power works, yet the secondary vanity outlet seems dead.`
      );
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'SEARCH_VANITY') {
      next.suite.vanitySearched = true;
      next.suite.hasPryTool = true;
      addDiscovery(
        `${actor} 在梳妆台暗格发现了一枚「黄铜撬针」，刚好可拧开假插座面板螺丝！`,
        `${actor} found a Brass Inspection Pin in the vanity drawer — fits the outlet screws!`
      );
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'INSPECT_OUTLET') {
      next.suite.outletInspected = true;
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'TEST_VOLTAGE') {
      next.suite.outletVoltageTested = true;
      addDiscovery(
        `${actor} 测得梳妆台插座电压为 0.0V —— 这是一只伪装的假电源插座！`,
        `${actor} measured 0.0V at the vanity outlet — it is a disguised fake electrical outlet!`
      );
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'REMOVE_SCREW') {
      const which = payload.which === 'bottom' ? 'screwBottomRemoved' : 'screwTopRemoved';
      next.suite[which] = true;
      if (next.suite.screwTopRemoved && next.suite.screwBottomRemoved) {
        next.suite.faceplateRemoved = true;
        addDiscovery(
          `${actor} 拆下假插座面板，露出了暗藏墙内的「单碎片六角插槽」！`,
          `${actor} pried off the fake outlet faceplate, exposing a single hexagonal Devil's Piece slot!`
        );
      }
      events.push({ type, seatId, faceplateRemoved: next.suite.faceplateRemoved });
      return { state: next, events };
    }

    if (type === 'INSERT_RELAY_PIECE') {
      if (!next.suite.relayPieceInserted) {
        next.suite.relayPieceInserted = true;
        next.piecesHeld = Math.max(0, next.piecesHeld - 1);
        addDiscovery(
          `${actor} 将 1 枚恶魔碎片嵌入假插座插槽！暗藏电路瞬间通电，金光涌向衣帽间走廊。`,
          `${actor} inserted 1 Devil's Piece into the hidden slot! Concealed brass relays surge toward the dressing alcove.`
        );
      }
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'ADVANCE_TO_ACT2') {
      next.act = 2;
      events.push({ type, seatId });
      return { state: next, events };
    }

    // --- ACT 2: Ultraviolet `?` Signal & Secret Wallpaper ---
    if (type === 'SET_UV_DIMMER') {
      const val = Math.max(0, Math.min(100, Number(payload.value) || 0));
      next.alcove.uvDimmer = val;
      if (val >= 75 && !next.alcove.uvRevealed) {
        next.alcove.uvRevealed = true;
        addDiscovery(
          `${actor} 调暗壁灯并开启隐藏紫外射灯：丝绸壁纸上浮现出一枚炽热的发光「?」问号标志！`,
          `${actor} dimmed the sconces and focused the concealed UV spotlight: a radiant "?" emblem glows on the wallpaper!`
        );
      }
      events.push({ type, seatId, uvRevealed: next.alcove.uvRevealed });
      return { state: next, events };
    }

    if (type === 'INSPECT_QUESTION_DOT') {
      if (!next.alcove.questionDotInspected) {
        next.alcove.questionDotInspected = true;
        addDiscovery(
          `${actor} 顺着「?」底部圆点摸索，发现了暗藏在浮雕花纹中的可撕裂壁纸暗缝！`,
          `${actor} traced the base dot of the "?" and discovered a concealed pull-seam in the silk wallpaper!`
        );
      }
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'PEEL_WALLPAPER') {
      if (next.alcove.wallpaperPeel < 3) {
        next.alcove.wallpaperPeel += 1;
        if (next.alcove.wallpaperPeel === 3) {
          // Relay piece pops back via return chute so challenger holds full 12 pieces for the 12-Piece Vault Lock!
          next.piecesHeld = next.startingPieces;
          addDiscovery(
            `${actor} 彻底撕开秘密壁纸！墙内露出巨型「12 碎片互锁黄铜金库锁」，假插座中的 1 枚碎片自动弹出归还。`,
            `${actor} peeled back the secret wallpaper! A monumental 12-Piece Interlocking Brass Vault Lock is revealed (relay Piece returned).`
          );
        }
      }
      events.push({ type, seatId, peel: next.alcove.wallpaperPeel });
      return { state: next, events };
    }

    if (type === 'ADVANCE_TO_ACT3') {
      next.act = 3;
      events.push({ type, seatId });
      return { state: next, events };
    }

    // --- ACT 3: 12-Piece Interlocking Vault Lock ---
    if (type === 'ROTATE_PIECE') {
      const p = next.vault.pieces.find((x) => x.pieceId === Number(payload.pieceId));
      if (p && p.placedSlot === null) {
        p.rotation = (p.rotation + 90) % 360;
      }
      events.push({ type, seatId, pieceId: p?.pieceId, rotation: p?.rotation });
      return { state: next, events };
    }

    if (type === 'PLACE_VAULT_PIECE') {
      const pieceId = Number(payload.pieceId);
      const slotIdx = Number(payload.slotIdx);
      const p = next.vault.pieces.find((x) => x.pieceId === pieceId);
      const sock = next.vault.sockets[slotIdx];

      if (p.profileId !== sock.profileId || p.depthId !== sock.depthId) {
        next.mistakes += 1;
        events.push({ type: 'VAULT_MISMATCH', reason: 'shape', seatId, pieceId, slotIdx });
        return { state: next, events };
      }

      if (!next.vault.relaxedLock && p.rotation !== sock.targetRotation) {
        next.mistakes += 1;
        events.push({ type: 'VAULT_MISMATCH', reason: 'rotation', seatId, pieceId, slotIdx });
        return { state: next, events };
      }

      // Interlock success!
      p.placedSlot = slotIdx;
      sock.lockedPieceId = pieceId;
      next.vault.lockedCount += 1;
      next.vault.gearAngle += 30;
      next.piecesHeld = Math.max(0, next.startingPieces - next.vault.lockedCount);
      if (next.vault.hintedPair && next.vault.hintedPair.pieceId === pieceId) {
        next.vault.hintedPair = null;
      }

      if (next.vault.lockedCount === 12) {
        next.vault.unlocked = true;
        // Per Ep 8 canon: The 12 Pieces used as keys are NOT consumed — all 12 are returned cleanly!
        next.piecesHeld = next.startingPieces;
        addDiscovery(
          `${actor} 嵌入第 12 枚恶魔碎片！黄铜齿轮轰鸣咬合 360° 旋开，12 枚钥匙碎片悉数弹出归还，胡桃木暗门电梯缓缓开启！`,
          `${actor} interlocked the 12th Devil's Piece! Brass gears spin 360°, all 12 key Pieces return safely to your pouch, and the secret elevator doors slide open!`
        );
        events.push({ type: 'VAULT_UNLOCKED', seatId });
      } else {
        events.push({ type: 'VAULT_PIECE_LOCKED', seatId, pieceId, slotIdx, lockedCount: next.vault.lockedCount });
      }
      return { state: next, events };
    }

    if (type === 'VAULT_HINT') {
      const unplaced = next.vault.pieces.find((p) => p.placedSlot === null);
      if (unplaced) {
        const matchSock = next.vault.sockets.find(
          (s) => s.profileId === unplaced.profileId && s.depthId === unplaced.depthId
        );
        if (matchSock) {
          next.vault.hintedPair = {
            pieceId: unplaced.pieceId,
            slotIdx: matchSock.slotIdx,
            targetRotation: matchSock.targetRotation,
          };
          next.hintsUsed += 1;
        }
      }
      events.push({ type, seatId, hintedPair: next.vault.hintedPair });
      return { state: next, events };
    }

    if (type === 'VAULT_AUTO_SEAT_ONE') {
      const unplaced = next.vault.pieces.find((p) => p.placedSlot === null);
      if (unplaced) {
        const matchSock = next.vault.sockets.find(
          (s) => s.profileId === unplaced.profileId && s.depthId === unplaced.depthId
        );
        if (matchSock) {
          unplaced.rotation = matchSock.targetRotation;
          unplaced.placedSlot = matchSock.slotIdx;
          matchSock.lockedPieceId = unplaced.pieceId;
          next.vault.lockedCount += 1;
          next.vault.gearAngle += 30;
          next.hintsUsed += 1;
          next.vault.hintedPair = null;
          next.piecesHeld = Math.max(0, next.startingPieces - next.vault.lockedCount);
          if (next.vault.lockedCount === 12) {
            next.vault.unlocked = true;
            next.piecesHeld = next.startingPieces;
            events.push({ type: 'VAULT_UNLOCKED', seatId });
            return { state: next, events };
          }
        }
      }
      events.push({ type: 'VAULT_PIECE_LOCKED', seatId, lockedCount: next.vault.lockedCount });
      return { state: next, events };
    }

    if (type === 'BOARD_ELEVATOR') {
      next.act = 4;
      events.push({ type, seatId });
      return { state: next, events };
    }

    // --- ACT 4: Secret Elevator, Talisman Seal & Curse Barrier ---
    if (type === 'DESCEND_ELEVATOR') {
      next.sanctum.elevatorDescended = true;
      addDiscovery(
        `${actor} 乘秘密电梯潜入 B1 秘密金库前厅，金库门上贴着禁止多人入内的金色封印符箓。`,
        `${actor} descended via the hidden walnut elevator to B1 Vault Foyer. A Golden Talisman seals the sanctum door.`
      );
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'TEAR_TALISMAN') {
      next.sanctum.talismanTorn = true;
      addDiscovery(
        `${actor} 撕下金色符箓推开金库石门——猩红与熔金交织的「诅咒结界」正笼罩着 2 枚价值 2 亿韩元的奖金徽章！`,
        `${actor} tore the Golden Talisman and opened the Vault Sanctum — 2 Prize Tokens (+200M KRW) hover inside the crimson-gold Curse Barrier!`
      );
      events.push({ type, seatId });
      return { state: next, events };
    }

    if (type === 'BREACH_CURSE_BARRIER') {
      next.piecesShattered = next.piecesHeld;
      next.piecesHeld = 0;
      next.prizeTokensClaimed = 2;
      next.cursed = true;
      next.ending = 'cursed_hero';
      next.deciderSeatId = seatId;
      next.completedAt = now;
      next.act = 5;
      addDiscovery(
        `${actor} 毅然伸手破除「诅咒结界」！为全员奖金池注入 +2 亿韩元（2 枚奖金徽章），代价是自身全部 ${next.piecesShattered} 枚恶魔碎片当场粉碎，永受碎片诅咒！`,
        `${actor} breached the Curse Barrier! Claimed 2 Prize Tokens (+200M KRW) for the collective prize pool — at the eternal cost of shattering all ${next.piecesShattered} Devil's Pieces!`
      );
      events.push({ type: 'CURSE_BREACHED', seatId, shattered: next.piecesShattered });
      return { state: next, events };
    }

    if (type === 'WALK_AWAY') {
      next.piecesShattered = 0;
      next.prizeTokensClaimed = 0;
      next.cursed = false;
      next.ending = 'keeper_of_secret';
      next.deciderSeatId = seatId;
      next.completedAt = now;
      next.act = 5;
      addDiscovery(
        `${actor} 凝视结界后选择克制退场：保住了全部 ${next.piecesHeld} 枚恶魔碎片，将秘密金库与 2 亿韩元的诱惑封存于暗夜之中。`,
        `${actor} stepped back from the Curse Barrier: preserved all ${next.piecesHeld} Devil's Pieces and kept the Secret Safe's mystery intact.`
      );
      events.push({ type: 'WALKED_AWAY', seatId });
      return { state: next, events };
    }

    if (type === 'CONCLUDE_ARCHIVE') {
      next.archived = true;
      events.push({ type, seatId });
      return { state: next, events };
    }

    return { state: next, events };
  },

  projectState(fullState) {
    // Co-op / solo / spectator all view the same atmospheric escape room
    return fullState;
  },

  getPhaseTimer() {
    // Atmospheric escape room is untimed so players can savor clues & the moral dilemma
    return null;
  },

  computeBotAction() {
    // Keep bots as silent co-op companions so they never spoil human escape-room discoveries
    return null;
  },

  getResult(fullState) {
    if (!fullState || !fullState.archived) return null;

    const elapsedSec = Math.max(
      1,
      Math.round(((fullState.completedAt || Date.now()) - (fullState.startedAt || Date.now())) / 1000)
    );
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const ss = String(elapsedSec % 60).padStart(2, '0');

    const winnerSeatIds = fullState.seatOrder.slice();
    const rankings = fullState.seats.map((s) => ({
      seatId: s.seatId,
      score: fullState.ending === 'cursed_hero' ? 200 : fullState.piecesHeld,
      label:
        fullState.ending === 'cursed_hero'
          ? `+200M KRW · CURSED (0 ◆) · ${mm}:${ss}`
          : `KEPT ${fullState.piecesHeld} ◆ · UNCURSED · ${mm}:${ss}`,
    }));

    const summary =
      fullState.ending === 'cursed_hero'
        ? {
            zh: `【结局 A · 负咒英雄】你破除了生活馆秘密金库的「诅咒结界」，为总奖金池永久注入 2 枚奖金徽章（+2 亿韩元）！代价是你的 ${fullState.piecesShattered} 枚恶魔碎片彻底粉碎，余生赛程永受「碎片诅咒」不得再持任何碎片。（耗时 ${mm}:${ss}）`,
            en: `[ENDING A · THE CURSED MARTYR] You breached the Living Quarters Curse Barrier and secured 2 Prize Tokens (+200M KRW) for the Grand Prize Pool! In exchange, all ${fullState.piecesShattered} of your Devil's Pieces shattered forever under the Eternal Curse Seal. (Time ${mm}:${ss})`,
          }
        : {
            zh: `【结局 B · 暗夜守秘人】你识破假插座、显影「?」问号并完美互锁 12 枚碎片开启秘密电梯，却在「诅咒结界」前保持冷静转身离去——保住了全部 ${fullState.piecesHeld} 枚恶魔碎片与后续主赛的战略筹码。（耗时 ${mm}:${ss}）`,
            en: `[ENDING B · KEEPER OF THE SECRET] You cracked the fake outlet, unveiled the UV "?" seam, and interlocked all 12 Pieces to open the hidden elevator — yet chose to step back from the Curse Barrier, keeping all ${fullState.piecesHeld} Devil's Pieces intact. (Time ${mm}:${ss})`,
          };

    return { winnerSeatIds, rankings, summary };
  },
};

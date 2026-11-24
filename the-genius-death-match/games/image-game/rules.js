/**
 * Image Game (이미지 게임 / 图像联想游戏) — Pure Deterministic Rule Engine
 * Zero DOM access · Seeded RNG · Official S1E8 Dixit-Style 6-Seat Rules
 */

export const CONCEPTS = [
  { id: 'eclipse', zh: '蚀日之刻', en: 'Eclipse' },
  { id: 'time', zh: '静止的沙漏', en: 'Frozen Time' },
  { id: 'mirror', zh: '镜中倒影', en: 'Mirror Mirage' },
  { id: 'crown', zh: '孤王之冠', en: 'Hollow Crown' },
  { id: 'labyrinth', zh: '无尽迷宫', en: 'Labyrinth' },
  { id: 'flame', zh: '灰烬余火', en: 'Dying Ember' },
  { id: 'abyss', zh: '深渊凝视', en: 'Abyssal Gaze' },
  { id: 'voyage', zh: '星海孤舟', en: 'Midnight Voyage' },
  { id: 'balance', zh: '命运天平', en: 'Fragile Balance' },
  { id: 'secret', zh: '尘封密钥', en: 'Sealed Secret' },
  { id: 'storm', zh: '雷暴前夕', en: 'Eye of the Storm' },
  { id: 'dream', zh: '清醒之梦', en: 'Lucid Dream' },
  { id: 'betrayal', zh: '背后寒刃', en: 'Velvet Betrayal' },
  { id: 'rebirth', zh: '涅槃羽翼', en: 'Crimson Rebirth' },
  { id: 'cage', zh: '黄金牢笼', en: 'Gilded Cage' },
  { id: 'cosmos', zh: '星轨宿命', en: 'Orbital Destiny' },
  { id: 'shadow', zh: '影中棋手', en: 'Shadow Gambit' },
  { id: 'bloom', zh: '暗夜绽放', en: 'Nocturnal Bloom' },
];

export const CONCEPT_MAP = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

// 4 Sharp *The Genius* Studio AI Panelists
export const AI_PANELISTS = [
  { id: 'panel-1', name: { zh: '洪榛浩', en: 'Hong Jin-ho' }, avatar: '♠', bias: 'analytical', style: { zh: '逻辑直觉型', en: 'Analytical' } },
  { id: 'panel-2', name: { zh: '金京兰', en: 'Kim Kyung-ran' }, avatar: '♦', bias: 'poetic', style: { zh: '优雅联想型', en: 'Poetic' } },
  { id: 'panel-3', name: { zh: '李相敏', en: 'Lee Sang-min' }, avatar: '♛', bias: 'instinct', style: { zh: '反套路直觉', en: 'Instinctive' } },
  { id: 'panel-4', name: { zh: '金九拉', en: 'Kim Gu-ra' }, avatar: '⚡', bias: 'skeptic', style: { zh: '犀利怀疑论', en: 'Skeptical' } },
];

const MOTIFS = [
  'eclipse', 'hourglass', 'eye', 'crown', 'labyrinth', 'lighthouse',
  'prism', 'key', 'phoenix', 'chess', 'scale', 'cage',
  'moonboat', 'rose', 'dagger', 'portal',
];

const PALETTES = [
  ['#1a102b', '#ec4899', '#fbbf24'],
  ['#091826', '#22d3ee', '#e4b95b'],
  ['#240a14', '#ff2e54', '#fff0c2'],
  ['#0f1c18', '#10b981', '#fde68a'],
  ['#17132a', '#a78bfa', '#38bdf8'],
  ['#22140a', '#f59e0b', '#ff6b86'],
];

const CARD_TITLES = [
  ['黑日王座', 'Obsidian Eclipse'], ['逆流沙漏', 'Inverted Sands'], ['万象之瞳', 'All-Seeing Iris'],
  ['荆棘王冠', 'Crown of Thorns'], ['螺旋回廊', 'Spiral Corridor'], ['雾海灯塔', 'Fogbound Beacon'],
  ['折射棱镜', 'Shattered Prism'], ['遗忘之钥', 'Forgotten Key'], ['赤焰羽翼', 'Scarlet Wings'],
  ['末局孤王', 'Endgame King'], ['星尘天平', 'Stardust Scales'], ['玻璃鸟笼', 'Crystal Cage'],
  ['月下孤舟', 'Lunar Drifter'], ['午夜玫瑰', 'Midnight Rose'], ['天鹅绒刃', 'Velvet Blade'],
  ['虚空拱门', 'Void Archway'], ['双生月蚀', 'Twin Eclipse'], ['碎裂钟摆', 'Broken Pendulum'],
  ['镜花深渊', 'Mirrored Abyss'], ['失落权杖', 'Lost Scepter'], ['镜像迷宫', 'Hall of Mirrors'],
  ['暴雨孤岛', 'Storm Sentinel'], ['极光之冠', 'Aurora Prism'], ['黄金锁孔', 'Golden Keyhole'],
  ['灰烬凤凰', 'Ash Phoenix'], ['黑白对峙', 'Checkmate Dusk'], ['审判砝码', 'Verdict Weight'],
  ['囚禁星辰', 'Caged Nebula'], ['星河渡口', 'Astral Ferry'], ['暗金花苞', 'Gilded Blossom'],
  ['假面暗影', 'Masked Shadow'], ['时空裂隙', 'Rift Horizon'], ['血色日冕', 'Crimson Corona'],
  ['永恒齿轮', 'Clockwork Fate'], ['梦境之眼', 'Dreamer Eye'], ['空洞桂冠', 'Hollow Laurel'],
  ['深渊阶梯', 'Abyss Stairs'], ['极夜微光', 'Polar Spark'], ['棱镜迷影', 'Prism Mirage'],
  ['密室封印', 'Vault Seal'], ['重生余烬', 'Rebirth Spark'], ['孤注一掷', 'Final Gambit'],
  ['命运支点', 'Fulcrum of Fate'], ['羽化之笼', 'Broken Cage'], ['静海航标', 'Silent Compass'],
  ['月影繁花', 'Moonlit Bloom'], ['冷锋倒影', 'Blade Reflection'], ['星门彼岸', 'Beyond the Gate'],
];

// Build curated deterministic 48-card Surreal Gallery Deck
export const SURREAL_DECK = CARD_TITLES.map((pair, idx) => {
  const c1 = CONCEPTS[idx % CONCEPTS.length].id;
  const c2 = CONCEPTS[(idx * 5 + 3) % CONCEPTS.length].id;
  const c3 = CONCEPTS[(idx * 7 + 11) % CONCEPTS.length].id;
  const tags = Array.from(new Set([c1, c2, c3]));
  // Ensure exactly 3 distinct tags
  let extra = 0;
  while (tags.length < 3) {
    const cand = CONCEPTS[(idx + extra) % CONCEPTS.length].id;
    if (!tags.includes(cand)) tags.push(cand);
    extra++;
  }
  return {
    id: idx,
    title: { zh: pair[0], en: pair[1] },
    motif: MOTIFS[idx % MOTIFS.length],
    palette: PALETTES[idx % PALETTES.length],
    seed: (idx + 1) * 97,
    tags, // tags[0] = primary motif, tags[1] = secondary resonance, tags[2] = subtle metaphor
  };
});

export const CARD_BY_ID = Object.fromEntries(SURREAL_DECK.map((c) => [c.id, c]));

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function drawFromDeck(state, count, rng) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break;
      state.deck = shuffle(state.discard, rng);
      state.discard = [];
    }
    drawn.push(state.deck.pop());
  }
  return drawn;
}

// Semantic affinity between a surreal card and a clue concept id
export function cardConceptAffinity(cardId, conceptId) {
  const card = CARD_BY_ID[cardId];
  if (!card) return 0;
  if (card.tags[0] === conceptId) return 1.0;
  if (card.tags[1] === conceptId) return 0.72;
  if (card.tags[2] === conceptId) return 0.48;
  // Soft adjacency resonance so cards aren't purely binary
  const cIdx = CONCEPTS.findIndex((c) => c.id === conceptId);
  const t0Idx = CONCEPTS.findIndex((c) => c.id === card.tags[0]);
  const dist = Math.min(Math.abs(cIdx - t0Idx), CONCEPTS.length - Math.abs(cIdx - t0Idx));
  return dist === 1 ? 0.24 : dist === 2 ? 0.12 : 0.04;
}

function pickPanelistDecoys(state, rng) {
  const conceptId = state.currentClue.conceptId;
  const entries = [];
  for (const p of AI_PANELISTS) {
    const hand = state.hands[p.id] || [];
    let bestCard = hand[0];
    let bestScore = -1;
    for (const cid of hand) {
      const sc = cardConceptAffinity(cid, conceptId) + rng() * 0.22;
      if (sc > bestScore) {
        bestScore = sc;
        bestCard = cid;
      }
    }
    state.hands[p.id] = hand.filter((id) => id !== bestCard);
    entries.push({ ownerId: p.id, cardId: bestCard });
  }
  return entries;
}

function computePanelistVotes(gallery, conceptId, rng) {
  const votes = {};
  for (const p of AI_PANELISTS) {
    // Score each slot except own card
    const scored = gallery
      .map((slot, idx) => {
        if (slot.ownerId === p.id) return { idx, score: -999 };
        let aff = cardConceptAffinity(slot.cardId, conceptId);
        // Personality nuances
        if (p.bias === 'analytical') aff *= 1.15;
        else if (p.bias === 'poetic') aff = aff * 0.85 + 0.15 * (CARD_BY_ID[slot.cardId].tags[2] === conceptId ? 1 : 0.2);
        else if (p.bias === 'skeptic') aff = aff > 0.9 ? 0.78 : aff * 1.1; // suspicious of overly literal match
        else aff *= 1.0;
        const noise = rng() * 0.34;
        return { idx, score: aff + noise };
      })
      .sort((a, b) => b.score - a.score);
    votes[p.id] = scored[0].idx;
  }
  return votes;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const seatOrder = seats.slice(0, 2).map((s) => s.seatId);
    const starterIdx = ctx.rng() < 0.5 ? 0 : 1;
    const deck = shuffle(SURREAL_DECK.map((c) => c.id), ctx.rng);

    const players = {};
    for (const s of seats.slice(0, 2)) {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        garnets: 5,
        testerWins: 0,
        rivalFools: 0,
      };
    }

    const hands = {};
    const state = {
      phase: 'clue', // 'clue' | 'decoy' | 'vote' | 'reveal' | 'ended'
      round: 1,
      phaseLabel: { zh: '出题者联想阶段', en: 'Tester Clue Phase' },
      seatOrder,
      testerIdx: starterIdx,
      testerSeatId: seatOrder[starterIdx],
      rivalSeatId: seatOrder[1 - starterIdx],
      currentTurnSeatId: seatOrder[starterIdx],
      players,
      hands,
      deck,
      discard: [],
      currentClue: null, // { conceptId, customText }
      submissions: {}, // ownerId -> cardId (hidden until reveal)
      gallery: [], // Array<{ slotIndex, cardId, ownerId }>
      votes: {}, // voterId -> slotIndex
      lastRoundResult: null,
      history: [],
      winnerSeatIds: [],
    };

    for (const sid of seatOrder) {
      state.hands[sid] = drawFromDeck(state, 6, ctx.rng);
    }
    for (const p of AI_PANELISTS) {
      state.hands[p.id] = drawFromDeck(state, 6, ctx.rng);
    }

    return state;
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ended') {
      return { ok: false, reason: 'Match has ended' };
    }
    const { type, payload } = action || {};

    if (fullState.phase === 'reveal') {
      if (type !== 'NEXT_ROUND') return { ok: false, reason: 'Advance to next round' };
      return { ok: true };
    }

    if (seatId !== fullState.currentTurnSeatId) {
      return { ok: false, reason: 'Not your turn' };
    }

    if (fullState.phase === 'clue') {
      if (type !== 'SUBMIT_CLUE') return { ok: false, reason: 'Pick a card and clue' };
      const cardId = Number(payload?.cardId);
      const conceptId = payload?.conceptId;
      if (!fullState.hands[seatId]?.includes(cardId)) {
        return { ok: false, reason: 'Selected card is not in your hand' };
      }
      if (!CONCEPT_MAP[conceptId]) {
        return { ok: false, reason: 'Select a valid semantic clue prompt' };
      }
      return { ok: true };
    }

    if (fullState.phase === 'decoy') {
      if (type !== 'SUBMIT_DECOY') return { ok: false, reason: 'Submit a decoy art card' };
      const cardId = Number(payload?.cardId);
      if (!fullState.hands[seatId]?.includes(cardId)) {
        return { ok: false, reason: 'Selected decoy card is not in your hand' };
      }
      return { ok: true };
    }

    if (fullState.phase === 'vote') {
      if (type !== 'SUBMIT_VOTE') return { ok: false, reason: 'Vote for a gallery card' };
      const slotIndex = Number(payload?.slotIndex);
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= fullState.gallery.length) {
        return { ok: false, reason: 'Invalid gallery slot' };
      }
      if (fullState.gallery[slotIndex].ownerId === seatId) {
        return { ok: false, reason: 'You cannot vote for your own decoy card' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Invalid action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const { type, payload } = action;
    const events = [];

    if (next.phase === 'clue' && type === 'SUBMIT_CLUE') {
      const cardId = Number(payload.cardId);
      const customText = String(payload.customText || '').trim().slice(0, 36);
      next.hands[seatId] = next.hands[seatId].filter((id) => id !== cardId);
      next.submissions[seatId] = cardId;
      next.currentClue = {
        conceptId: payload.conceptId,
        customText: customText || null,
      };
      next.phase = 'decoy';
      next.currentTurnSeatId = next.rivalSeatId;
      next.phaseLabel = { zh: '对手挑选干扰画卡', en: 'Rival Selects Decoy Card' };
      events.push({ type: 'CLUE_SUBMITTED', seatId, conceptId: payload.conceptId });
      return { state: next, events };
    }

    if (next.phase === 'decoy' && type === 'SUBMIT_DECOY') {
      const cardId = Number(payload.cardId);
      next.hands[seatId] = next.hands[seatId].filter((id) => id !== cardId);
      next.submissions[seatId] = cardId;

      const panelSubs = pickPanelistDecoys(next, ctx.rng);
      const combined = [
        { ownerId: next.testerSeatId, cardId: next.submissions[next.testerSeatId] },
        { ownerId: next.rivalSeatId, cardId: next.submissions[next.rivalSeatId] },
        ...panelSubs,
      ];
      const shuffled = shuffle(combined, ctx.rng);
      next.gallery = shuffled.map((item, idx) => ({
        slotIndex: idx,
        cardId: item.cardId,
        ownerId: item.ownerId,
      }));
      next.phase = 'vote';
      next.currentTurnSeatId = next.rivalSeatId;
      next.phaseLabel = { zh: '艺廊投票推理', en: 'Gallery Voting Phase' };
      events.push({ type: 'GALLERY_OPENED', count: next.gallery.length });
      return { state: next, events };
    }

    if (next.phase === 'vote' && type === 'SUBMIT_VOTE') {
      const rivalSlot = Number(payload.slotIndex);
      const panelVotes = computePanelistVotes(next.gallery, next.currentClue.conceptId, ctx.rng);
      next.votes = {
        ...panelVotes,
        [next.rivalSeatId]: rivalSlot,
      };

      const testerSlot = next.gallery.find((g) => g.ownerId === next.testerSeatId).slotIndex;
      const allVoters = [next.rivalSeatId, ...AI_PANELISTS.map((p) => p.id)];
      const correctVoters = allVoters.filter((vid) => next.votes[vid] === testerSlot);
      const rivalCorrect = next.votes[next.rivalSeatId] === testerSlot;

      let penaltySeatId = null;
      let penaltyAmount = 0;
      let outcomeKind = '';

      if (correctVoters.length === 5) {
        penaltySeatId = next.testerSeatId;
        penaltyAmount = 2;
        outcomeKind = 'all_correct';
      } else if (correctVoters.length === 0) {
        penaltySeatId = next.testerSeatId;
        penaltyAmount = 2;
        outcomeKind = 'all_wrong';
      } else if (rivalCorrect) {
        penaltySeatId = next.testerSeatId;
        penaltyAmount = 1;
        outcomeKind = 'rival_correct';
      } else {
        penaltySeatId = next.rivalSeatId;
        penaltyAmount = 1;
        outcomeKind = 'rival_fooled';
        next.players[next.testerSeatId].rivalFools += 1;
      }

      next.players[penaltySeatId].garnets = Math.max(0, next.players[penaltySeatId].garnets - penaltyAmount);

      const roundRec = {
        round: next.round,
        testerSeatId: next.testerSeatId,
        rivalSeatId: next.rivalSeatId,
        clue: next.currentClue,
        testerSlot,
        rivalSlot,
        correctCount: correctVoters.length,
        rivalCorrect,
        penaltySeatId,
        penaltyAmount,
        outcomeKind,
        votes: { ...next.votes },
      };
      next.lastRoundResult = roundRec;
      next.history.push(roundRec);
      next.phase = 'reveal';
      next.currentTurnSeatId = null;
      next.phaseLabel = { zh: '投票揭晓与加内特扣除', en: 'Vote Tally & Garnet Penalty' };
      events.push({ type: 'VOTES_REVEALED', ...roundRec });
      return { state: next, events };
    }

    if (next.phase === 'reveal' && type === 'NEXT_ROUND') {
      const [s0, s1] = next.seatOrder;
      if (next.players[s0].garnets <= 0 || next.players[s1].garnets <= 0) {
        next.phase = 'ended';
        next.winnerSeatIds = next.players[s0].garnets > next.players[s1].garnets ? [s0] : [s1];
        next.phaseLabel = { zh: '淘汰终局', en: 'Elimination Verdict' };
        events.push({ type: 'MATCH_END', winnerSeatIds: next.winnerSeatIds });
        return { state: next, events };
      }

      // Discard used gallery cards and draw 1 replacement for all 6 seats
      for (const slot of next.gallery) {
        next.discard.push(slot.cardId);
      }
      for (const sid of next.seatOrder) {
        next.hands[sid].push(...drawFromDeck(next, 1, ctx.rng));
      }
      for (const p of AI_PANELISTS) {
        next.hands[p.id].push(...drawFromDeck(next, 1, ctx.rng));
      }

      next.round += 1;
      next.testerIdx = 1 - next.testerIdx;
      next.testerSeatId = next.seatOrder[next.testerIdx];
      next.rivalSeatId = next.seatOrder[1 - next.testerIdx];
      next.currentTurnSeatId = next.testerSeatId;
      next.currentClue = null;
      next.submissions = {};
      next.gallery = [];
      next.votes = {};
      next.phase = 'clue';
      next.phaseLabel = { zh: '出题者联想阶段', en: 'Tester Clue Phase' };
      events.push({ type: 'ROUND_START', round: next.round });
      return { state: next, events };
    }

    return { state: next, events };
  },

  projectState(fullState, viewerSeatId) {
    if (!fullState) return null;
    const isReveal = fullState.phase === 'reveal' || fullState.phase === 'ended';

    // Strictly hide rival hand, panelist hands, secret submissions, and gallery owners before reveal!
    const myHand = viewerSeatId ? fullState.hands[viewerSeatId] || [] : [];
    const safeGallery = fullState.gallery.map((slot) => ({
      slotIndex: slot.slotIndex,
      cardId: slot.cardId,
      isMine: Boolean(viewerSeatId && slot.ownerId === viewerSeatId),
      ownerId: isReveal ? slot.ownerId : null,
    }));

    return {
      phase: fullState.phase,
      round: fullState.round,
      phaseLabel: fullState.phaseLabel,
      seatOrder: fullState.seatOrder,
      testerSeatId: fullState.testerSeatId,
      rivalSeatId: fullState.rivalSeatId,
      currentTurnSeatId: fullState.currentTurnSeatId,
      players: fullState.players,
      myHand,
      currentClue: fullState.currentClue,
      gallery: safeGallery,
      votes: isReveal ? fullState.votes : null,
      lastRoundResult: isReveal ? fullState.lastRoundResult : null,
      history: fullState.history,
      winnerSeatIds: fullState.winnerSeatIds,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase === 'ended' || fullState.phase === 'reveal') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const diff = ctx.difficulty || 'genius';
    const rng = ctx.rng;
    const hand = fullState.hands[botSeatId] || [];

    if (fullState.phase === 'clue') {
      const cardId = hand[Math.floor(rng() * hand.length)];
      const card = CARD_BY_ID[cardId];
      let conceptId;

      if (diff === 'easy') {
        // Easy AI picks literal primary tag (risking all-5-correct sweeps!)
        conceptId = card.tags[0];
      } else if (diff === 'genius') {
        // Genius calibrates to secondary tag (tags[1]) for Goldilocks 2-3/5 ambiguity!
        conceptId = rng() < 0.72 ? card.tags[1] : card.tags[2];
      } else {
        // Grand Final evaluates across its hand to pick a card+tag with sweet-spot resonance (~0.55-0.75)
        let bestPair = { cardId, conceptId: card.tags[1] };
        let bestUtil = -999;
        for (const cid of hand) {
          const c = CARD_BY_ID[cid];
          for (const tag of [c.tags[1], c.tags[2], c.tags[0]]) {
            // Secondary tag usually yields 1-3 panelist hits while keeping rival guessing
            const base = tag === c.tags[1] ? 1.0 : tag === c.tags[2] ? 0.88 : 0.55;
            const util = base + rng() * 0.15;
            if (util > bestUtil) {
              bestUtil = util;
              bestPair = { cardId: cid, conceptId: tag };
            }
          }
        }
        return { type: 'SUBMIT_CLUE', payload: bestPair };
      }

      return { type: 'SUBMIT_CLUE', payload: { cardId, conceptId } };
    }

    if (fullState.phase === 'decoy') {
      const conceptId = fullState.currentClue.conceptId;
      if (diff === 'easy') {
        return { type: 'SUBMIT_DECOY', payload: { cardId: hand[Math.floor(rng() * hand.length)] } };
      }
      // Pick strongest semantic decoy from hand to lure panelists / blend in
      const sorted = hand.slice().sort((a, b) => cardConceptAffinity(b, conceptId) - cardConceptAffinity(a, conceptId));
      return { type: 'SUBMIT_DECOY', payload: { cardId: sorted[0] } };
    }

    if (fullState.phase === 'vote') {
      const conceptId = fullState.currentClue.conceptId;
      const validSlots = fullState.gallery.filter((s) => s.ownerId !== botSeatId);
      const scored = validSlots
        .map((s) => {
          const aff = cardConceptAffinity(s.cardId, conceptId);
          const noise = diff === 'grand_final' ? rng() * 0.12 : diff === 'genius' ? rng() * 0.25 : rng() * 0.55;
          return { slotIndex: s.slotIndex, score: aff + noise };
        })
        .sort((a, b) => b.score - a.score);
      return { type: 'SUBMIT_VOTE', payload: { slotIndex: scored[0].slotIndex } };
    }

    return null;
  },

  getResult(fullState) {
    if (!fullState || fullState.phase !== 'ended') return null;
    const [s0, s1] = fullState.seatOrder;
    const p0 = fullState.players[s0];
    const p1 = fullState.players[s1];
    const winnerSeatIds = fullState.winnerSeatIds || [];
    const rankings = [p0, p1]
      .slice()
      .sort((a, b) => b.garnets - a.garnets)
      .map((p) => ({
        seatId: p.seatId,
        score: p.garnets,
        label: `${p.garnets} Garnets (${p.rivalFools} baits)`,
      }));

    const winName = winnerSeatIds.length ? fullState.players[winnerSeatIds[0]]?.name : '';
    return {
      winnerSeatIds,
      rankings,
      summary: {
        zh: `历经 ${fullState.round} 轮艺廊心理战，${winName} 以精准的联想尺度耗尽对手加内特，赢得《图像联想游戏》！`,
        en: `After ${fullState.round} surreal gallery rounds, ${winName} depleted their rival's Garnets to win Image Game!`,
      },
    };
  },
};

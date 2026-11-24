import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, CARD_BY_ID, CONCEPTS, CONCEPT_MAP, AI_PANELISTS } from './rules.js';

function renderSurrealArtSvg(card) {
  const [bg, c1, c2] = card.palette;
  const gId = `ig-g-${card.id}`;
  const rId = `ig-r-${card.id}`;
  const rot = (card.seed % 45) - 22;

  let centerpiece = '';
  switch (card.motif) {
    case 'eclipse':
      centerpiece = `
        <circle cx="90" cy="108" r="44" fill="${c2}" opacity="0.92" />
        <circle cx="102" cy="102" r="38" fill="${bg}" />
        <circle cx="90" cy="108" r="56" fill="none" stroke="${c1}" stroke-width="1.6" stroke-dasharray="4 6" />
        <path d="M22 182 Q90 154 158 182" fill="none" stroke="${c2}" stroke-width="2" opacity="0.7" />
      `;
      break;
    case 'hourglass':
      centerpiece = `
        <polygon points="48,50 132,50 90,118" fill="${c1}" opacity="0.75" stroke="${c2}" stroke-width="2" />
        <polygon points="48,186 132,186 90,118" fill="${c2}" opacity="0.55" stroke="${c1}" stroke-width="2" />
        <line x1="90" y1="118" x2="90" y2="178" stroke="#fff0c2" stroke-width="2.5" stroke-dasharray="3 4" />
      `;
      break;
    case 'eye':
      centerpiece = `
        <path d="M24 118 Q90 56 156 118 Q90 180 24 118 Z" fill="rgba(255,255,255,0.06)" stroke="${c2}" stroke-width="2.4" />
        <circle cx="90" cy="118" r="28" fill="url(#${rId})" />
        <circle cx="90" cy="118" r="11" fill="${bg}" />
        <circle cx="96" cy="112" r="4" fill="#fff" />
      `;
      break;
    case 'crown':
      centerpiece = `
        <polygon points="34,154 44,82 72,118 90,64 108,118 136,82 146,154" fill="url(#${rId})" stroke="${c2}" stroke-width="2.2" stroke-linejoin="round" />
        <circle cx="90" cy="52" r="7" fill="${c2}" />
        <line x1="34" y1="166" x2="146" y2="166" stroke="${c1}" stroke-width="3" />
      `;
      break;
    case 'labyrinth':
      centerpiece = `
        <rect x="34" y="58" width="112" height="112" rx="8" fill="none" stroke="${c2}" stroke-width="2.4" />
        <rect x="52" y="76" width="76" height="76" rx="6" fill="none" stroke="${c1}" stroke-width="2.2" stroke-dasharray="14 6" />
        <rect x="70" y="94" width="40" height="40" rx="4" fill="none" stroke="${c2}" stroke-width="2" />
        <circle cx="90" cy="114" r="9" fill="${c1}" />
      `;
      break;
    case 'lighthouse':
      centerpiece = `
        <polygon points="90,64 168,36 168,94" fill="${c2}" opacity="0.22" />
        <polygon points="90,64 12,42 12,88" fill="${c1}" opacity="0.18" />
        <polygon points="78,74 102,74 114,186 66,186" fill="url(#${rId})" stroke="${c2}" stroke-width="2" />
        <circle cx="90" cy="64" r="10" fill="#fff0c2" />
      `;
      break;
    case 'prism':
      centerpiece = `
        <line x1="12" y1="128" x2="66" y2="112" stroke="#fff" stroke-width="3" />
        <line x1="112" y1="106" x2="172" y2="76" stroke="${c1}" stroke-width="3.5" />
        <line x1="114" y1="114" x2="172" y2="114" stroke="${c2}" stroke-width="3.5" />
        <line x1="112" y1="122" x2="172" y2="152" stroke="#38bdf8" stroke-width="3.5" />
        <polygon points="90,54 138,162 42,162" fill="rgba(255,255,255,0.08)" stroke="${c2}" stroke-width="2.5" />
      `;
      break;
    case 'key':
      centerpiece = `
        <circle cx="90" cy="82" r="28" fill="none" stroke="${c2}" stroke-width="5" />
        <circle cx="90" cy="82" r="14" fill="none" stroke="${c1}" stroke-width="2" />
        <line x1="90" y1="110" x2="90" y2="184" stroke="${c2}" stroke-width="6" stroke-linecap="round" />
        <line x1="90" y1="154" x2="114" y2="154" stroke="${c2}" stroke-width="5" stroke-linecap="round" />
        <line x1="90" y1="170" x2="108" y2="170" stroke="${c1}" stroke-width="5" stroke-linecap="round" />
      `;
      break;
    case 'phoenix':
      centerpiece = `
        <path d="M90 156 Q44 128 24 72 Q64 90 90 116 Q116 90 156 72 Q136 128 90 156 Z" fill="url(#${rId})" stroke="${c2}" stroke-width="2" />
        <circle cx="90" cy="82" r="14" fill="${c2}" />
        <polygon points="90,46 98,68 82,68" fill="#fff0c2" />
      `;
      break;
    case 'chess':
      centerpiece = `
        <path d="M64 176 L116 176 L108 144 L72 144 Z" fill="${c1}" stroke="${c2}" stroke-width="2" />
        <path d="M74 144 L80 92 L100 92 L106 144 Z" fill="url(#${rId})" />
        <circle cx="90" cy="76" r="16" fill="${c2}" />
        <path d="M90 46 L90 60 M83 53 L97 53" stroke="#fff0c2" stroke-width="3" />
      `;
      break;
    case 'scale':
      centerpiece = `
        <line x1="90" y1="54" x2="90" y2="180" stroke="${c2}" stroke-width="3" />
        <line x1="36" y1="86" x2="144" y2="74" stroke="${c2}" stroke-width="3" />
        <path d="M24 130 Q36 148 48 130 Z" fill="${c1}" />
        <path d="M132 118 Q144 136 156 118 Z" fill="${c2}" />
        <line x1="36" y1="86" x2="36" y2="130" stroke="${c1}" stroke-width="1.5" />
        <line x1="144" y1="74" x2="144" y2="118" stroke="${c2}" stroke-width="1.5" />
      `;
      break;
    case 'cage':
      centerpiece = `
        <path d="M46 176 L46 98 A44 44 0 0 1 134 98 L134 176 Z" fill="none" stroke="${c2}" stroke-width="2.5" />
        <line x1="68" y1="62" x2="68" y2="176" stroke="${c2}" stroke-width="1.6" />
        <line x1="90" y1="54" x2="90" y2="176" stroke="${c2}" stroke-width="1.6" />
        <line x1="112" y1="62" x2="112" y2="176" stroke="${c2}" stroke-width="1.6" />
        <circle cx="90" cy="118" r="14" fill="${c1}" opacity="0.9" />
      `;
      break;
    case 'moonboat':
      centerpiece = `
        <path d="M36 138 Q90 184 144 138 Q90 156 36 138 Z" fill="${c2}" />
        <polygon points="88,64 128,132 88,132" fill="${c1}" opacity="0.82" />
        <circle cx="58" cy="76" r="14" fill="#fff0c2" opacity="0.85" />
        <line x1="20" y1="184" x2="160" y2="184" stroke="${c1}" stroke-width="1.8" opacity="0.55" />
      `;
      break;
    case 'rose':
      centerpiece = `
        <circle cx="90" cy="96" r="32" fill="${c1}" opacity="0.85" />
        <circle cx="90" cy="96" r="22" fill="none" stroke="${c2}" stroke-width="2.2" stroke-dasharray="10 5" />
        <circle cx="90" cy="96" r="11" fill="${bg}" stroke="#fff0c2" stroke-width="2" />
        <path d="M90 128 Q94 160 86 190" stroke="${c2}" stroke-width="3" fill="none" />
      `;
      break;
    case 'dagger':
      centerpiece = `
        <polygon points="90,42 104,132 90,148 76,132" fill="url(#${rId})" stroke="#fff0c2" stroke-width="1.8" />
        <rect x="64" y="138" width="52" height="8" rx="4" fill="${c2}" />
        <rect x="85" y="146" width="10" height="34" rx="4" fill="${c1}" />
      `;
      break;
    default:
      centerpiece = `
        <path d="M44 186 L44 96 A46 46 0 0 1 136 96 L136 186" fill="none" stroke="${c2}" stroke-width="3" />
        <circle cx="90" cy="112" r="24" fill="url(#${rId})" />
        <circle cx="90" cy="112" r="38" fill="none" stroke="${c1}" stroke-width="1.5" stroke-dasharray="5 5" />
      `;
      break;
  }

  return `
    <svg class="ig-art-canvas" viewBox="0 0 180 240" aria-hidden="true">
      <defs>
        <linearGradient id="${gId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="#05060b" />
        </linearGradient>
        <radialGradient id="${rId}" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="${c2}" />
          <stop offset="55%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${bg}" />
        </radialGradient>
      </defs>
      <rect width="180" height="240" fill="url(#${gId})" />
      <circle cx="90" cy="116" r="74" fill="url(#${rId})" opacity="0.22" />
      <rect x="10" y="10" width="160" height="220" rx="8" fill="none" stroke="${c2}" stroke-width="1" opacity="0.32" />
      <g transform="rotate(${rot * 0.15} 90 120)">
        ${centerpiece}
      </g>
      <circle cx="28" cy="30" r="2" fill="${c2}" opacity="0.7" />
      <circle cx="152" cy="40" r="2.2" fill="#fff0c2" opacity="0.6" />
      <circle cx="144" cy="204" r="1.8" fill="${c1}" opacity="0.7" />
    </svg>
  `;
}

// Local UI draft state
let selectedCardId = null;
let selectedConceptId = null;
let customClueInput = '';
let selectedVoteSlot = null;
let lastPhaseKey = '';

mountGame({
  config: {
    id: 'image-game',
    title: { zh: '图像联想游戏', en: 'Image Game', ko: '이미지 게임' },
    seasons: ['S1E8'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    rulesSummary: {
      zh: `### 核心目标
第 1 季第 8 集经典心理博弈！两位淘汰候选人与 **4 位演播室嘉宾团**（共 6 人）共同进行抽象画卡联想投票，先令对手的 **5 颗加内特** 耗尽归零者胜！

### 致命“黄金尺度”规则
1. **出题阶段**：两位候选人轮流担任「出题者」，从 6 张超现实画卡中秘密选出 1 张，并给出一条意象提示（可附自定义短语）。
2. **混入干扰卡**：对手候选人与 4 位演播室嘉宾各秘密投入 1 张贴合提示的干扰画卡，6 张卡打乱编号 #1–#6 公开陈列于艺廊。
3. **投票与加内特扣罚**：除出题者外的 5 人（对手 + 4 位嘉宾）各自投票寻找出题者的真卡（不可投自己的卡）。
   - **全员猜中（5/5）或全员猜错（0/5）**：提示太白给或太晦涩，**出题者重罚 −2 颗加内特！**
   - **其余情况（1–4 人猜中）**：若**对手猜中**真卡 → **出题者 −1 颗**；若**对手猜错**（且至少 1 位嘉宾猜中）→ **对手 −1 颗！**`,
      en: `### Objective
The iconic S1E8 Dixit-inspired psychological duel! Two Death Match candidates join **4 AI Studio Panelists** (6 seats total). Deplete your rival's **5 Garnets** to 0 to survive!

### The Deadly "Goldilocks Clue" Rule
1. **Clue Phase**: Candidates alternate as **Tester**, secretly choosing 1 of their 6 surreal art cards and announcing a semantic clue (plus optional custom phrase).
2. **Decoy Phase**: The Rival Candidate and 4 AI Panelists each mix in 1 decoy card from their hands. All 6 cards are shuffled into Gallery Slots #1–#6.
3. **Vote & Garnet Penalty**: All 5 non-Testers vote on which card is the Tester's (cannot vote for your own card):
   - **Extremes Override (5/5 all correct OR 0/5 all wrong)**: **Tester loses −2 Garnets!**
   - **Otherwise (1–4 correct)**: If Rival guessed RIGHT → **Tester loses −1 Garnet**. If Rival guessed WRONG → **Rival loses −1 Garnet!**`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, activeSeatId, seats, isSpectator, lang, dispatch, log } = ctx;
    if (!state) return;

    const pKey = `${state.round}-${state.phase}-${activeSeatId}`;
    if (pKey !== lastPhaseKey) {
      lastPhaseKey = pKey;
      selectedCardId = null;
      selectedConceptId = null;
      customClueInput = '';
      selectedVoteSlot = null;

      if (state.phase === 'reveal' && state.lastRoundResult) {
        SFX.play('reveal');
        const rr = state.lastRoundResult;
        if (rr.penaltyAmount === 2) setTimeout(() => SFX.play('clash'), 220);
        else setTimeout(() => SFX.play('garnetClink'), 220);
        const penName = seats.find((s) => s.seatId === rr.penaltySeatId)?.name || state.players[rr.penaltySeatId]?.name || '';
        log(
          lang === 'zh'
            ? `第 ${rr.round} 轮投票揭晓：${rr.correctCount}/5 猜中，${penName} 扣除 ${rr.penaltyAmount} 颗加内特`
            : `Round ${rr.round}: ${rr.correctCount}/5 correct — ${penName} loses ${rr.penaltyAmount} Garnet(s)`,
          'alert'
        );
      }
    }

    const draw = () => {
      const [s0, s1] = state.seatOrder;
      const p0 = state.players[s0];
      const p1 = state.players[s1];
      const name0 = seats.find((s) => s.seatId === s0)?.name || p0.name;
      const name1 = seats.find((s) => s.seatId === s1)?.name || p1.name;
      const testerName = state.testerSeatId === s0 ? name0 : name1;
      const rivalName = state.rivalSeatId === s0 ? name0 : name1;

      const myTurn = !isSpectator && activeSeatId && state.currentTurnSeatId === activeSeatId;

      const ownerLabel = (ownerId) => {
        if (ownerId === state.testerSeatId) return lang === 'zh' ? `♛ 真卡 · ${testerName}` : `♛ TESTER · ${testerName}`;
        if (ownerId === state.rivalSeatId) return lang === 'zh' ? `⚔ 干扰 · ${rivalName}` : `⚔ RIVAL · ${rivalName}`;
        const pan = AI_PANELISTS.find((p) => p.id === ownerId);
        return pan ? `${pan.avatar} ${pan.name[lang]}` : ownerId;
      };

      const voterNameShort = (vid) => {
        if (vid === state.rivalSeatId) return rivalName;
        const pan = AI_PANELISTS.find((p) => p.id === vid);
        return pan ? pan.name[lang] : vid;
      };

      const renderCand = (p, name, isRight) => {
        const isTester = p.seatId === state.testerSeatId;
        const gems = Array.from({ length: 5 }, (_, i) =>
          `<span class="ig-gem-slot ${i < p.garnets ? 'is-lit' : ''}"></span>`
        ).join('');
        return `
          <div class="ig-cand-card ${isRight ? 'is-right' : ''} ${isTester ? 'is-tester' : ''}">
            <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
              <strong style="font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.escapeHtml(name)}</strong>
              <span class="tg-badge ${isTester ? 'tg-badge-garnet' : 'tg-badge-cyan'}" style="width:fit-content;${isRight ? 'align-self:flex-end;' : ''}">
                ${isTester ? (lang === 'zh' ? '本轮出题者' : 'TESTER') : (lang === 'zh' ? '本轮竞猜者' : 'RIVAL')}
              </span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:${isRight ? 'flex-start' : 'flex-end'};gap:4px;">
              <div class="ig-gems-row">${gems}</div>
              <span style="font-family:var(--tg-font-mono);font-size:11px;color:var(--tg-ink-muted);">${p.garnets} / 5 ${lang === 'zh' ? '加内特' : 'Garnets'}</span>
            </div>
          </div>
        `;
      };

      const renderClueText = (clue) => {
        if (!clue) return '';
        const c = CONCEPT_MAP[clue.conceptId];
        const base = c ? c[lang] : clue.conceptId;
        return clue.customText ? `“${clue.customText}” · [${base}]` : `“${base}”`;
      };

      // Build main stage section per phase
      let stageBodyHtml = '';

      if (state.phase === 'clue') {
        if (myTurn) {
          const pickedCard = selectedCardId != null ? CARD_BY_ID[selectedCardId] : null;
          // Build curated 9 prompt options: card's 3 tags + 6 contrasting semantic prompts
          let promptIds = [];
          if (pickedCard) {
            promptIds = [...pickedCard.tags];
            for (const c of CONCEPTS) {
              if (promptIds.length >= 9) break;
              if (!promptIds.includes(c.id)) promptIds.push(c.id);
            }
          }

          stageBodyHtml = `
            <div class="ig-clue-banner">
              <span class="tg-badge tg-badge-gold">${lang === 'zh' ? '你的出题回合 · 第 1 步' : 'YOUR CLUE TURN · STEP 1'}</span>
              <div style="font-size:15px;font-weight:700;color:var(--tg-ink);">
                ${lang === 'zh' ? '从下方 6 张超现实手牌中选出 1 张，并给出“恰到好处”的提示词' : 'Select 1 surreal art card from your hand & craft a Goldilocks clue'}
              </div>
              <div style="font-size:12px;color:var(--tg-ink-muted);">
                ${lang === 'zh' ? '⚠ 全中 (5/5) 或全错 (0/5) 你将重罚 −2 颗加内特！目标：让嘉宾猜中但误导对手！' : '⚠ All 5 right or all 5 wrong costs YOU −2 Garnets! Aim for 1–3 panelist hits while fooling your rival.'}
              </div>
            </div>

            <div class="ig-gallery-grid">
              ${state.myHand
                .map((cid) => {
                  const card = CARD_BY_ID[cid];
                  const isSel = selectedCardId === cid;
                  return `
                    <button type="button" class="ig-art-card is-clickable ${isSel ? 'is-selected' : ''}" data-pick-card="${cid}">
                      ${renderSurrealArtSvg(card)}
                      <div class="ig-art-meta">
                        <span class="ig-art-title">${UI.escapeHtml(card.title[lang])}</span>
                        <div class="ig-art-tags">
                          ${card.tags.map((t) => `<span class="ig-mini-tag">${UI.escapeHtml(CONCEPT_MAP[t]?.[lang] || t)}</span>`).join('')}
                        </div>
                      </div>
                    </button>
                  `;
                })
                .join('')}
            </div>

            ${
              pickedCard
                ? `
                  <div class="ig-composer">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                      <strong style="color:var(--tg-gold-bright);">
                        ${lang === 'zh' ? `为「${pickedCard.title.zh}」选择意象提示（建议选次级/隐喻标签避免 5/5 全中）：` : `Choose a semantic clue for "${pickedCard.title.en}" (secondary motifs avoid 5/5 sweeps):`}
                      </strong>
                    </div>
                    <div class="ig-prompt-grid">
                      ${promptIds
                        .map((cid, idx) => {
                          const c = CONCEPT_MAP[cid];
                          const tier =
                            idx === 0
                              ? lang === 'zh' ? '高契合（易被看穿）' : 'Direct (Risk 5/5)'
                              : idx === 1
                              ? lang === 'zh' ? '✦ 黄金尺度（推荐）' : '✦ Goldilocks (Ideal)'
                              : idx === 2
                              ? lang === 'zh' ? '微妙隐喻' : 'Subtle Metaphor'
                              : lang === 'zh' ? '高风险发散' : 'Wildcard';
                          return `
                            <button type="button" class="ig-prompt-pill ${selectedConceptId === cid ? 'is-selected' : ''}" data-concept="${cid}">
                              <strong style="font-size:13px;color:var(--tg-ink);">${UI.escapeHtml(c[lang])}</strong>
                              <span style="font-size:10.5px;color:${idx === 1 ? 'var(--tg-gold)' : 'var(--tg-ink-muted)'};">${tier}</span>
                            </button>
                          `;
                        })
                        .join('')}
                    </div>
                    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                      <input class="tg-input" id="ig-custom-clue" style="flex:1;min-width:200px;" maxlength="36" value="${UI.escapeHtml(customClueInput)}" placeholder="${lang === 'zh' ? '可选：附加一句给真人对手看的诗意提示短语...' : 'Optional poetic subtitle shown alongside the clue...'}" />
                      <button type="button" class="tg-btn tg-btn-garnet" id="ig-submit-clue" ${selectedConceptId ? '' : 'disabled'}>
                        ${lang === 'zh' ? '发布提示并盖牌 →' : 'Publish Clue & Seal Card →'}
                      </button>
                    </div>
                  </div>
                `
                : ''
            }
          `;
        } else {
          stageBodyHtml = `
            <div class="ig-clue-banner">
              <span class="tg-badge tg-badge-cyan">⏳ ${lang === 'zh' ? '等待出题者' : 'WAITING FOR TESTER'}</span>
              <div style="font-size:16px;font-weight:700;">
                ${lang === 'zh' ? `${testerName} 正在挑选暗牌与意象提示...` : `${testerName} is selecting a surreal card & clue...`}
              </div>
            </div>
          `;
        }
      } else if (state.phase === 'decoy') {
        stageBodyHtml = `
          <div class="ig-clue-banner">
            <span class="tg-badge tg-badge-gold">${lang === 'zh' ? `${testerName} 发布的提示词` : `${testerName}'S CLUE`}</span>
            <div class="ig-clue-quote">${UI.escapeHtml(renderClueText(state.currentClue))}</div>
            <div style="font-size:12.5px;color:var(--tg-ink-muted);">
              ${
                myTurn
                  ? lang === 'zh'
                    ? '挑选你手中 1 张最能混淆视听的「干扰画卡」投入艺廊！'
                    : 'Choose 1 DECOY card from your hand to blend into the gallery!'
                  : lang === 'zh'
                  ? `等待 ${rivalName} 与 4 位嘉宾投入干扰画卡...`
                  : `Waiting for ${rivalName} & panelists to submit decoys...`
              }
            </div>
          </div>
          ${
            myTurn
              ? `
                <div class="ig-gallery-grid">
                  ${state.myHand
                    .map((cid) => {
                      const card = CARD_BY_ID[cid];
                      const isSel = selectedCardId === cid;
                      return `
                        <button type="button" class="ig-art-card is-clickable ${isSel ? 'is-selected' : ''}" data-pick-card="${cid}">
                          ${renderSurrealArtSvg(card)}
                          <div class="ig-art-meta">
                            <span class="ig-art-title">${UI.escapeHtml(card.title[lang])}</span>
                            <div class="ig-art-tags">
                              ${card.tags.map((t) => `<span class="ig-mini-tag">${UI.escapeHtml(CONCEPT_MAP[t]?.[lang] || t)}</span>`).join('')}
                            </div>
                          </div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
                <div style="display:flex;justify-content:center;">
                  <button type="button" class="tg-btn tg-btn-garnet" id="ig-submit-decoy" style="min-width:220px;" ${selectedCardId != null ? '' : 'disabled'}>
                    ${lang === 'zh' ? '投入干扰画卡 → 开启艺廊投票' : 'Submit Decoy → Open Gallery Vote'}
                  </button>
                </div>
              `
              : ''
          }
        `;
      } else if (state.phase === 'vote') {
        stageBodyHtml = `
          <div class="ig-clue-banner">
            <span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '艺廊公开投票' : 'GALLERY VOTING STAGE'}</span>
            <div class="ig-clue-quote">${UI.escapeHtml(renderClueText(state.currentClue))}</div>
            <div style="font-size:12.5px;color:var(--tg-ink-muted);">
              ${
                myTurn
                  ? lang === 'zh'
                    ? '在 6 幅画作中找出出题者的真卡！（不能投你自己的干扰卡）'
                    : `Vote for which of the 6 artworks belongs to ${testerName}! (Cannot vote for your own card)`
                  : lang === 'zh'
                  ? `等待 ${rivalName} 锁定最终投票...`
                  : `Waiting for ${rivalName} to lock their vote...`
              }
            </div>
          </div>

          <div class="ig-gallery-grid">
            ${state.gallery
              .map((slot) => {
                const card = CARD_BY_ID[slot.cardId];
                const disabled = !myTurn || slot.isMine;
                const isSel = selectedVoteSlot === slot.slotIndex;
                return `
                  <button type="button" class="ig-art-card ${!disabled ? 'is-clickable' : ''} ${slot.isMine ? 'is-mine-locked' : ''} ${isSel ? 'is-selected' : ''}" data-vote-slot="${slot.slotIndex}" ${disabled ? 'disabled' : ''}>
                    <span class="ig-slot-badge">#${slot.slotIndex + 1}${slot.isMine ? (lang === 'zh' ? ' · 你的卡' : ' · YOURS') : ''}</span>
                    ${renderSurrealArtSvg(card)}
                    <div class="ig-art-meta">
                      <span class="ig-art-title">${UI.escapeHtml(card.title[lang])}</span>
                      <div class="ig-art-tags">
                        ${card.tags.map((t) => `<span class="ig-mini-tag">${UI.escapeHtml(CONCEPT_MAP[t]?.[lang] || t)}</span>`).join('')}
                      </div>
                    </div>
                  </button>
                `;
              })
              .join('')}
          </div>

          ${
            myTurn
              ? `
                <div style="display:flex;justify-content:center;">
                  <button type="button" class="tg-btn tg-btn-gold" id="ig-submit-vote" style="min-width:220px;" ${selectedVoteSlot != null ? '' : 'disabled'}>
                    ${selectedVoteSlot != null
                      ? (lang === 'zh' ? `锁定投票 #${selectedVoteSlot + 1} → 揭晓结果` : `Lock Vote #${selectedVoteSlot + 1} → Reveal`)
                      : (lang === 'zh' ? '请先点选一幅画卡' : 'Select a gallery card to vote')}
                  </button>
                </div>
              `
              : ''
          }
        `;
      } else if (state.phase === 'reveal' || state.phase === 'ended') {
        const rr = state.lastRoundResult;
        const penName = rr ? (rr.penaltySeatId === s0 ? name0 : name1) : '';
        let verdictMsg = '';
        if (rr) {
          if (rr.outcomeKind === 'all_correct') {
            verdictMsg = lang === 'zh'
              ? `⚡ 全员猜中 (5/5)！提示过于明显 — 出题者 ${penName} 重罚 −2 颗加内特！`
              : `⚡ ALL 5 CORRECT! Clue too obvious — Tester ${penName} loses −2 Garnets!`;
          } else if (rr.outcomeKind === 'all_wrong') {
            verdictMsg = lang === 'zh'
              ? `⚡ 全员猜错 (0/5)！提示过于晦涩 — 出题者 ${penName} 重罚 −2 颗加内特！`
              : `⚡ ALL 5 WRONG! Clue too obscure — Tester ${penName} loses −2 Garnets!`;
          } else if (rr.outcomeKind === 'rival_correct') {
            verdictMsg = lang === 'zh'
              ? `✦ ${rivalName} 识破真卡（${rr.correctCount}/5 猜中）— 出题者 ${penName} 扣除 −1 颗加内特！`
              : `✦ ${rivalName} found the true card (${rr.correctCount}/5 correct) — Tester ${penName} loses −1 Garnet!`;
          } else {
            verdictMsg = lang === 'zh'
              ? `✦ 完美诱导！${rr.correctCount}/5 嘉宾猜中而 ${rivalName} 落入陷阱 — ${penName} 扣除 −1 颗加内特！`
              : `✦ Masterful bait! ${rr.correctCount}/5 panelists guessed right while ${rivalName} missed — ${penName} loses −1 Garnet!`;
          }
        }

        // Count votes per slot
        const votersBySlot = Array.from({ length: state.gallery.length }, () => []);
        if (state.votes) {
          for (const [vid, sl] of Object.entries(state.votes)) {
            if (votersBySlot[sl]) votersBySlot[sl].push(vid);
          }
        }

        stageBodyHtml = `
          <div class="ig-verdict-box">
            <div>
              <div style="font-size:12px;color:var(--tg-gold);font-weight:700;letter-spacing:0.08em;">
                ${lang === 'zh' ? `第 ${state.round} 轮投票揭晓 · 提示 ${renderClueText(state.currentClue)}` : `ROUND ${state.round} TALLY · ${renderClueText(state.currentClue)}`}
              </div>
              <div style="font-size:15px;font-weight:800;color:var(--tg-ink);margin-top:4px;">
                ${UI.escapeHtml(verdictMsg)}
              </div>
            </div>
            ${
              state.phase === 'reveal' && !isSpectator
                ? `<button type="button" class="tg-btn tg-btn-garnet" id="ig-next-round">
                    ${p0.garnets <= 0 || p1.garnets <= 0
                      ? (lang === 'zh' ? '宣读最终裁决 →' : 'Final Verdict →')
                      : (lang === 'zh' ? '交换出题权 · 下一轮 →' : 'Swap Tester · Next Round →')}
                  </button>`
                : ''
            }
          </div>

          <div class="ig-gallery-grid">
            ${state.gallery
              .map((slot) => {
                const card = CARD_BY_ID[slot.cardId];
                const isTesterCard = slot.ownerId === state.testerSeatId;
                const slotVoters = votersBySlot[slot.slotIndex] || [];
                const pct = Math.round((slotVoters.length / 5) * 100);
                return `
                  <div class="ig-art-card ${isTesterCard ? 'is-tester-card' : ''}">
                    <span class="ig-slot-badge">#${slot.slotIndex + 1}</span>
                    ${renderSurrealArtSvg(card)}
                    <div class="ig-art-meta">
                      <span class="ig-art-title">${UI.escapeHtml(card.title[lang])}</span>
                      <div style="font-size:10.5px;font-weight:700;color:${isTesterCard ? 'var(--tg-gold-bright)' : 'var(--tg-ink-muted)'};">
                        ${UI.escapeHtml(ownerLabel(slot.ownerId))}
                      </div>
                      <div class="ig-vote-tally">
                        <div style="display:flex;justify-content:space-between;font-family:var(--tg-font-mono);font-size:10px;color:var(--tg-ink-muted);">
                          <span>${lang === 'zh' ? '得票' : 'VOTES'}</span>
                          <span>${slotVoters.length} / 5</span>
                        </div>
                        <div class="ig-tally-track">
                          <div class="ig-tally-fill" style="width:${pct}%;"></div>
                        </div>
                        <div class="ig-voter-chips">
                          ${slotVoters
                            .map(
                              (vid) =>
                                `<span class="ig-voter-chip ${vid === state.rivalSeatId ? 'is-rival' : ''}">${UI.escapeHtml(voterNameShort(vid))}</span>`
                            )
                            .join('')}
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      }

      container.innerHTML = `
        <div class="ig-arena">
          <div class="ig-life-bar">
            ${renderCand(p0, name0, false)}
            <div style="text-align:center;">
              <span class="tg-badge tg-badge-gold">ROUND ${state.round}</span>
              <div style="font-size:11px;color:var(--tg-ink-muted);margin-top:4px;">${lang === 'zh' ? '5/5 全中或 0/5 全错罚 −2' : '5/5 or 0/5 = −2 Penalty'}</div>
            </div>
            ${renderCand(p1, name1, true)}
          </div>

          <div class="ig-panelists-bar">
            ${AI_PANELISTS.map(
              (pan) => `
              <div class="ig-panelist-chip">
                <span class="ig-panelist-orb">${pan.avatar}</span>
                <div style="min-width:0;">
                  <div style="font-weight:700;color:var(--tg-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.escapeHtml(pan.name[lang])}</div>
                  <div style="font-size:10.5px;color:var(--tg-ink-muted);">${UI.escapeHtml(pan.style[lang])}</div>
                </div>
              </div>
            `
            ).join('')}
          </div>

          ${stageBodyHtml}
        </div>
      `;

      // Bind card selection (clue & decoy phases)
      container.querySelectorAll('[data-pick-card]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('cardFlip');
          selectedCardId = Number(btn.dataset.pickCard);
          if (state.phase === 'clue') {
            const c = CARD_BY_ID[selectedCardId];
            selectedConceptId = c?.tags?.[1] || c?.tags?.[0] || null;
          }
          draw();
        });
      });

      container.querySelectorAll('[data-concept]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          selectedConceptId = btn.dataset.concept;
          draw();
        });
      });

      container.querySelector('#ig-custom-clue')?.addEventListener('input', (e) => {
        customClueInput = e.target.value;
      });

      container.querySelector('#ig-submit-clue')?.addEventListener('click', () => {
        if (selectedCardId == null || !selectedConceptId) return;
        SFX.play('bid');
        dispatch({
          type: 'SUBMIT_CLUE',
          payload: {
            cardId: selectedCardId,
            conceptId: selectedConceptId,
            customText: customClueInput.trim(),
          },
        });
      });

      container.querySelector('#ig-submit-decoy')?.addEventListener('click', () => {
        if (selectedCardId == null) return;
        SFX.play('tilePlace');
        dispatch({
          type: 'SUBMIT_DECOY',
          payload: { cardId: selectedCardId },
        });
      });

      container.querySelectorAll('[data-vote-slot]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          selectedVoteSlot = Number(btn.dataset.voteSlot);
          draw();
        });
      });

      container.querySelector('#ig-submit-vote')?.addEventListener('click', () => {
        if (selectedVoteSlot == null) return;
        SFX.play('bid');
        dispatch({
          type: 'SUBMIT_VOTE',
          payload: { slotIndex: selectedVoteSlot },
        });
      });

      container.querySelector('#ig-next-round')?.addEventListener('click', () => {
        SFX.play('click');
        dispatch({ type: 'NEXT_ROUND' });
      });
    };

    draw();
  },
});

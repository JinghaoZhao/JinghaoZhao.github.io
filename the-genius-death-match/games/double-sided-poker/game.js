/**
 * Double-Sided Poker (双面扑克) — Interactive 3D Dual-Face Broadcast UI
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import { GameRules, computeBettingBounds, possibleOppBacks } from './rules.js';

let uiSelectedSide = 'front'; // 'front' | 'back' | 'both'
let uiRaiseVal = 1;
let uiMyCardFlipped = false;
let lastRoundSeen = 0;
let lastHandledEventKey = null;

function renderDualCard({ card, isMine, flipped, oppPlayedBack, lang }) {
  const fTxt = card?.front != null ? String(card.front) : '?';
  const bTxt = card?.back != null ? String(card.back) : '?';
  const backVisible = card?.back != null;
  const showBackNow = isMine ? flipped : Boolean(oppPlayedBack && backVisible);

  return `
    <div class="dsp-card-wrap">
      <div class="tg-card-3d dsp-card-3d ${showBackNow ? 'is-flipped' : ''}" ${isMine ? 'id="dsp-my-card" title="Click to flip Front / Back"' : ''}>
        <div class="tg-card-3d-inner">
          <div class="tg-card-face dsp-face-gold">
            <span class="dsp-card-corner tl" style="color:var(--tg-gold);">FRONT · ${UI.escapeHtml(fTxt)}</span>
            <div class="dsp-card-num">${UI.escapeHtml(fTxt)}</div>
            <div style="font-size:9.5px;letter-spacing:0.16em;color:rgba(228,185,91,0.8);margin-top:4px;">${lang === 'zh' ? '正面 · 公开' : 'FRONT · PUBLIC'}</div>
            <span class="dsp-card-corner br" style="color:${backVisible ? '#ff8ba0' : 'var(--tg-ink-faint)'};">${lang === 'zh' ? '背' : 'B'}: ${UI.escapeHtml(bTxt)}</span>
          </div>
          <div class="tg-card-face dsp-face-crimson">
            <span class="dsp-card-corner tl" style="color:#ff99ab;">BACK · ${UI.escapeHtml(bTxt)}</span>
            <div class="dsp-card-num">${UI.escapeHtml(bTxt)}</div>
            <div style="font-size:9.5px;letter-spacing:0.16em;color:rgba(255,190,205,0.82);margin-top:4px;">${lang === 'zh' ? '背面 · 暗牌' : 'BACK · SECRET'}</div>
            <span class="dsp-card-corner br" style="color:var(--tg-gold);">${lang === 'zh' ? '正' : 'F'}: ${UI.escapeHtml(fTxt)}</span>
          </div>
        </div>
      </div>

      <div class="dsp-dual-pip">
        <span style="color:var(--tg-gold-bright);">${lang === 'zh' ? '正' : 'F'} ${UI.escapeHtml(fTxt)}</span>
        <span style="color:var(--tg-ink-faint);">/</span>
        <span style="color:${backVisible ? '#ff8ba0' : 'var(--tg-ink-faint)'};">${lang === 'zh' ? '背' : 'B'} ${UI.escapeHtml(bTxt)}</span>
        ${
          isMine
            ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="dsp-btn-flip" style="min-height:22px;padding:1px 7px;font-size:10.5px;">↻ ${lang === 'zh' ? '翻面' : 'Flip'}</button>`
            : ''
        }
      </div>
    </div>
  `;
}

function renderBetWells(lockedSide, unitBet, lang) {
  const isFront = lockedSide === 'front';
  const isBack = lockedSide === 'back';
  const isBoth = lockedSide === 'both';

  return `
    <div class="dsp-bet-wells">
      <div class="dsp-well ${isBoth ? 'is-double-lit' : isFront ? 'is-front-lit' : ''}">
        <div class="dsp-well-title">${lang === 'zh' ? '正面下注区' : 'FRONT ZONE'}</div>
        <div class="dsp-well-val">${isBoth || isFront ? (unitBet > 0 ? `+${unitBet}` : lang === 'zh' ? '已锁定' : 'LOCKED') : '—'}</div>
      </div>
      <div class="dsp-well ${isBoth ? 'is-double-lit' : isBack ? 'is-back-lit' : ''}">
        <div class="dsp-well-title">${lang === 'zh' ? '背面下注区' : 'BACK ZONE'}</div>
        <div class="dsp-well-val">${isBoth || isBack ? (unitBet > 0 ? `+${unitBet}` : lang === 'zh' ? '已锁定' : 'LOCKED') : '—'}</div>
      </div>
    </div>
  `;
}

function handleSfxForEvent(lastEvent, sfx) {
  if (!lastEvent) return;
  const key = `${lastEvent.type}-${lastEvent.round || ''}-${lastEvent.seatId || ''}-${lastEvent.amount || ''}-${lastEvent.potAmount || ''}-${lastEvent.ts || ''}`;
  if (key === lastHandledEventKey) return;
  lastHandledEventKey = key;

  switch (lastEvent.type) {
    case 'DEAL':
      sfx.play('cardFlip');
      break;
    case 'BET':
    case 'RAISE':
    case 'CALL':
      sfx.play('chipStack');
      break;
    case 'DOUBLE_BET':
      sfx.play('clash');
      break;
    case 'DOUBLE_BET_JACKPOT':
    case 'DOUBLE_BET_FOLD_BONUS':
      sfx.play('combo');
      break;
    case 'SHOWDOWN':
      sfx.play('reveal');
      break;
    case 'CHECK':
      sfx.play('click');
      break;
    case 'FOLD':
      sfx.play('cardFlip');
      break;
    default:
      break;
  }
}

mountGame({
  config: {
    id: 'double-sided-poker',
    title: { zh: '双面扑克', en: 'Double-Sided Poker', ko: '양면포커' },
    seasons: ['S3', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'deckMode',
        label: { zh: '牌库规则', en: 'Deck Format' },
        type: 'select',
        default: 's4',
        choices: [
          { value: 's4', label: { zh: 'S4E10 奇偶双面牌（200张 · 40筹码）', en: 'S4E10 Odd/Even Deck (200 cards · 40 chips)' } },
          { value: 's3', label: { zh: 'S3 经典双面牌（90张 · 30筹码）', en: 'S3 Classic Deck (90 cards · 30 chips)' } },
        ],
      },
      {
        key: 'fastTimers',
        label: { zh: '极速 25 秒计时', en: 'Fast 25s Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 核心规则（S4E10 奇偶双面牌 / S3 经典）
- **双面结构**：每张牌都有 **正面（公开）** 与 **背面（仅自己可见）** 两个数字。
- **S4 奇偶定律**：默认使用第 4 季 200 张奇偶配对牌——正反面**必然一奇一偶**！看到对手正面是奇数，就能推算出对手背面必在 {2, 4, 6, 8, 10} 之中！
- **锁定单面**：每局首次行动须锁定押注 **正面 (FRONT)** 或 **背面 (BACK)**，锁定后本局不可在正反面间互换（仅可升级为双面下注）。
- **双面下注 (DOUBLE-BET · 2×)**：同时在正、反两面押入等额双倍筹码！
  - 若摊牌时你的 **正面与背面均严格大于** 对手所选面，或对手面对双面下注选择 **弃牌**，你不仅赢走底池，还额外直接从对手处抢走 **+10 枚奖励筹码**！
  - 若任一面 ≤ 对手所选面，则对手赢走底池（无额外扣分）。
- **平局滚存**：单面比牌平局时，底池滚存至下一局。`,
      en: `### Core Rules (S4E10 Odd/Even Deck / S3 Classic)
- **Dual-Faced Cards**: Every card has a **PUBLIC Front** and a **SECRET Back** (only you can peek at your Back).
- **S4 Odd/Even Law**: In the default 200-card S4 deck, Front and Back ALWAYS have opposite parity (odd ↔ even), narrowing your rival's Back to 5 possibilities!
- **Side Lock**: On your first action, lock **FRONT** or **BACK** (cannot swap between Front/Back later in the hand, only upgrade to Double-Bet).
- **DOUBLE-BET (2× +10 BONUS)**: Place matching bets on BOTH Front and Back simultaneously (2× total stake)!
  - If **BOTH** your Front AND Back are **strictly greater** than your rival's chosen side—OR if your rival **FOLDS** to your Double-Bet—you win the pot **PLUS steal +10 bonus chips** directly from your rival!
  - If either side is ≤ your rival's side, your rival wins the pot (no extra penalty).`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render: renderGame,
});

function renderGame(container, ctx) {
    const { state, activeSeatId, mySeatId, isSpectator, lang, lastEvent, dispatch, sfx } = ctx;
    if (!state) return;

    handleSfxForEvent(lastEvent, sfx);

    const viewerId = isSpectator ? state.seatIds[0] : activeSeatId || mySeatId || state.seatIds[0];
    const oppId = state.seatIds[0] === viewerId ? state.seatIds[1] : state.seatIds[0];

    const meInfo = state.seatsById[viewerId] || { name: 'P1', avatar: '♦' };
    const oppInfo = state.seatsById[oppId] || { name: 'P2', avatar: '♛' };

    if (state.round !== lastRoundSeen) {
      lastRoundSeen = state.round;
      uiMyCardFlipped = false;
      const myCard = state.hands[viewerId];
      if (myCard && myCard.back != null) {
        uiSelectedSide = myCard.back > myCard.front ? 'back' : 'front';
      } else {
        uiSelectedSide = 'front';
      }
      uiRaiseVal = 1;
    }

    const bounds = computeBettingBounds(state, viewerId);
    const isMyTurn = !isSpectator && state.phase === 'betting' && state.currentTurnSeatId === viewerId;
    const isShowdown = state.phase === 'showdown' || state.phase === 'ended';

    // Keep uiSelectedSide legal with lockedSide
    if (bounds.mySide === 'both') {
      uiSelectedSide = 'both';
    } else if (bounds.mySide === 'front' && uiSelectedSide === 'back') {
      uiSelectedSide = 'front';
    } else if (bounds.mySide === 'back' && uiSelectedSide === 'front') {
      uiSelectedSide = 'back';
    } else if (uiSelectedSide === 'both' && !bounds.canDoubleBet) {
      uiSelectedSide = bounds.mySide || 'front';
    }

    const isChoosingDoubleUpgrade = uiSelectedSide === 'both' && bounds.mySide !== 'both';
    const activeMaxRaise = isChoosingDoubleUpgrade ? bounds.maxDoubleRaiseBy : bounds.maxRaiseBy;
    if (uiRaiseVal > activeMaxRaise) uiRaiseVal = isChoosingDoubleUpgrade ? 0 : Math.max(1, activeMaxRaise);
    if (!isChoosingDoubleUpgrade && uiRaiseVal < 1) uiRaiseVal = 1;
    if (isChoosingDoubleUpgrade && uiRaiseVal < 0) uiRaiseVal = 0;

    const myCard = state.hands[viewerId];
    const oppCard = state.hands[oppId];
    const oppPossible = oppCard ? possibleOppBacks(oppCard.front, state.options.deckMode) : [];
    const anyDoubleActive = state.lockedSide[viewerId] === 'both' || state.lockedSide[oppId] === 'both';

    const res = state.lastResolution;
    const oppPlayedBack =
      isShowdown &&
      res?.kind === 'showdown' &&
      (state.lockedSide[oppId] === 'back' || state.lockedSide[oppId] === 'both');

    let bannerHtml = '';
    if (res) {
      const wName = res.winnerSeatId ? state.seatsById[res.winnerSeatId]?.name : '';
      let title = '';
      let sub = '';
      const isJackpot = Boolean(res.doubleBetSuccess && res.doubleBetBonus > 0);

      if (res.kind === 'fold') {
        const fName = state.seatsById[res.foldedSeatId]?.name || '';
        title = isJackpot
          ? lang === 'zh'
            ? `🔥 双面下注威慑成功！${wName} 赢底池 ${res.potAmount} + 抢走 ${res.doubleBetBonus} 筹码！`
            : `🔥 DOUBLE-BET FOLD STEAL! ${wName} Wins ${res.potAmount} + ${res.doubleBetBonus} Bonus!`
          : lang === 'zh'
          ? `${fName} 弃牌 · ${wName} 收下 ${res.potAmount} 筹码`
          : `${fName} Folded · ${wName} Wins ${res.potAmount}`;
        sub = lang === 'zh' ? '未参与摊牌的背面保持隐秘。' : 'Unplayed Back faces remain secret.';
      } else if (res.isTie) {
        title = res.splitOnAllInTie
          ? lang === 'zh'
            ? `全下平局分池 (${res.potAmount})`
            : `All-In Tie Split (${res.potAmount})`
          : lang === 'zh'
          ? `平局！底池 ${res.potAmount} 筹码滚存至下一局`
          : `TIE! ${res.potAmount} Chips Carry Over`;
        sub = lang === 'zh' ? '双方所选面数字相同。' : 'Both selected faces had the exact same number.';
      } else if (res.doubleBettorId) {
        const dName = state.seatsById[res.doubleBettorId]?.name || '';
        const dRev = res.revealedSides[res.doubleBettorId];
        const oId = res.doubleBettorId === viewerId ? oppId : viewerId;
        const oSide = res.sides[oId];
        const oVal = res.revealedSides[oId]?.[oSide];
        if (res.doubleBetSuccess) {
          title =
            lang === 'zh'
              ? `🔥 双面大满贯！${dName} 赢走 ${res.potAmount} + 额外抢走 ${res.doubleBetBonus} 筹码！`
              : `🔥 DOUBLE-BET JACKPOT! ${dName} Wins ${res.potAmount} + ${res.doubleBetBonus} Bonus!`;
          sub =
            lang === 'zh'
              ? `${dName} 正反双面 [${dRev.front} & ${dRev.back}] 全部压制对手 [${oVal}]！`
              : `${dName}'s BOTH faces [${dRev.front} & ${dRev.back}] crushed opponent's [${oVal}]!`;
        } else {
          title =
            lang === 'zh'
              ? `💥 双面下注反杀！${wName} 赢得底池 ${res.potAmount} 筹码`
              : `💥 DOUBLE-BET DEFUSED! ${wName} Wins ${res.potAmount} Pot`;
          sub =
            lang === 'zh'
              ? `${dName} [${dRev.front} & ${dRev.back}] 未能双面全部大于对手 [${oVal}]`
              : `${dName} [${dRev.front} & ${dRev.back}] failed to beat opponent [${oVal}] on both sides`;
        }
      } else {
        const sideLabel = (s) => (s === 'front' ? (lang === 'zh' ? '正面' : 'Front') : lang === 'zh' ? '背面' : 'Back');
        const myS = res.sides[viewerId];
        const opS = res.sides[oppId];
        title =
          lang === 'zh'
            ? `${wName} 摊牌获胜！赢得 ${res.potAmount} 筹码`
            : `${wName} Wins Showdown (+${res.potAmount})`;
        sub = `${meInfo.name} ${sideLabel(myS)} [${res.revealedSides[viewerId]?.[myS]}] vs ${oppInfo.name} ${sideLabel(opS)} [${res.revealedSides[oppId]?.[opS]}]`;
      }

      bannerHtml = `
        <div class="dsp-banner ${isJackpot ? 'is-jackpot' : ''}">
          <div style="font-family:var(--tg-font-display);font-size:17px;font-weight:800;color:${isJackpot ? '#ffd0da' : 'var(--tg-gold-bright)'};">${UI.escapeHtml(title)}</div>
          <div style="font-size:12.5px;color:var(--tg-ink-muted);">${UI.escapeHtml(sub)}</div>
          ${
            state.phase === 'showdown' && !isSpectator
              ? `<button type="button" class="tg-btn tg-btn-gold" id="dsp-btn-next" style="margin-top:4px;">${lang === 'zh' ? '进入下一局 →' : 'Deal Next Hand →'}</button>`
              : ''
          }
        </div>
      `;
    }

    container.innerHTML = `
      <div class="dsp-arena">
        <div class="dsp-topbar">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--tg-ink-muted);">
            <span class="tg-badge tg-badge-gold">${state.options.deckMode === 's3' ? 'S3 · 90 CARDS' : 'S4 · ODD/EVEN 200'}</span>
            <span>${lang === 'zh' ? `牌库余 ${state.deckRemaining} 张` : `${state.deckRemaining} left in deck`}</span>
          </div>
          ${
            oppCard
              ? `<span class="dsp-parity-hint">${
                  state.options.deckMode === 's4'
                    ? lang === 'zh'
                      ? `对手背面必为${oppCard.front % 2 === 1 ? '偶数' : '奇数'} {${oppPossible.join(',')}}`
                      : `Opp Back = ${oppCard.front % 2 === 1 ? 'EVEN' : 'ODD'} {${oppPossible.join(',')}}`
                    : lang === 'zh'
                    ? `对手背面 ≠ ${oppCard.front}`
                    : `Opp Back ≠ ${oppCard.front}`
                }</span>`
              : ''
          }
        </div>

        <section class="dsp-table ${anyDoubleActive ? 'is-double-active' : ''}">
          <!-- Opponent Row -->
          <div class="dsp-seat-row">
            <div class="dsp-zones-stack">
              <div class="dsp-plate ${state.currentTurnSeatId === oppId && state.phase === 'betting' ? 'is-active' : ''} ${res?.winnerSeatId === oppId ? 'is-winner' : ''}">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <strong><span style="color:var(--tg-garnet-bright);margin-right:5px;">${UI.escapeHtml(oppInfo.avatar || '♛')}</span>${UI.escapeHtml(oppInfo.name)}</strong>
                  <span style="font-family:var(--tg-font-mono);font-size:20px;font-weight:900;color:var(--tg-gold-bright);">${state.chips[oppId]}</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--tg-ink-muted);">
                  <span>${
                    state.lockedSide[oppId] === 'both'
                      ? lang === 'zh'
                        ? '🔥 已发动双面下注！'
                        : '🔥 DOUBLE-BET ACTIVE!'
                      : state.lockedSide[oppId] === 'front'
                      ? lang === 'zh'
                        ? '已锁定：正面'
                        : 'Locked: FRONT'
                      : state.lockedSide[oppId] === 'back'
                      ? lang === 'zh'
                        ? '已锁定：背面'
                        : 'Locked: BACK'
                      : lang === 'zh'
                      ? '尚未锁定正反面'
                      : 'Side unlocked'
                  }</span>
                  ${state.totalCommitted[oppId] > 0 ? `<span class="tg-badge tg-badge-garnet">${lang === 'zh' ? `本轮 +${state.totalCommitted[oppId]}` : `IN +${state.totalCommitted[oppId]}`}</span>` : ''}
                </div>
              </div>
              ${renderBetWells(state.lockedSide[oppId], state.unitBet[oppId], lang)}
            </div>

            ${renderDualCard({
              card: oppCard,
              isMine: false,
              flipped: false,
              oppPlayedBack,
              lang,
            })}
          </div>

          <!-- Center Pot & Double-Bet Jackpot -->
          <div class="dsp-center">
            <div class="dsp-pot-row">
              <div class="dsp-pot-pill">
                <span style="font-size:11px;font-weight:700;letter-spacing:0.15em;color:var(--tg-ink-muted);">${lang === 'zh' ? '底池 POT' : 'POT'}</span>
                <span style="font-family:var(--tg-font-mono);font-size:30px;font-weight:900;color:var(--tg-gold-bright);line-height:1;">${state.pot}</span>
              </div>
              ${
                anyDoubleActive
                  ? `<div class="dsp-jackpot-pill">🔥 ${lang === 'zh' ? '双面下注激活 · 胜或迫弃 +10 奖励筹码' : 'DOUBLE-BET LIVE · +10 BONUS ON WIN OR FOLD'}</div>`
                  : ''
              }
            </div>
            ${bannerHtml}
          </div>

          <!-- My Row -->
          <div class="dsp-seat-row">
            ${renderDualCard({
              card: myCard,
              isMine: !isSpectator,
              flipped: uiMyCardFlipped,
              oppPlayedBack: false,
              lang,
            })}

            <div class="dsp-zones-stack">
              ${renderBetWells(state.lockedSide[viewerId], state.unitBet[viewerId], lang)}
              <div class="dsp-plate ${isMyTurn ? 'is-active' : ''} ${res?.winnerSeatId === viewerId ? 'is-winner' : ''}">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <strong><span style="color:var(--tg-gold);margin-right:5px;">${UI.escapeHtml(meInfo.avatar || '♦')}</span>${UI.escapeHtml(meInfo.name)} ${isSpectator ? '' : lang === 'zh' ? '(你)' : '(You)'}</strong>
                  <span style="font-family:var(--tg-font-mono);font-size:20px;font-weight:900;color:var(--tg-gold-bright);">${state.chips[viewerId]}</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--tg-ink-muted);">
                  <span>${
                    state.lockedSide[viewerId] === 'both'
                      ? lang === 'zh'
                        ? '🔥 已发动双面下注！'
                        : '🔥 DOUBLE-BET ACTIVE!'
                      : state.lockedSide[viewerId] === 'front'
                      ? lang === 'zh'
                        ? '已锁定：正面'
                        : 'Locked: FRONT'
                      : state.lockedSide[viewerId] === 'back'
                      ? lang === 'zh'
                        ? '已锁定：背面'
                        : 'Locked: BACK'
                      : lang === 'zh'
                      ? '请选择押注面'
                      : 'Choose Front / Back / Both'
                  }</span>
                  ${state.totalCommitted[viewerId] > 0 ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? `本轮 +${state.totalCommitted[viewerId]}` : `IN +${state.totalCommitted[viewerId]}`}</span>` : ''}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Controls -->
        <section class="dsp-controls">
          ${
            isMyTurn
              ? `
                ${
                  bounds.mustRespondToDouble
                    ? `<div style="padding:7px 12px;border-radius:9px;background:rgba(217,27,58,0.18);border:1px solid var(--tg-garnet-bright);color:#ffb3c1;font-size:12px;font-weight:700;text-align:center;">
                        ⚠ ${lang === 'zh' ? '对手已发动双面下注！此时弃牌也将直接赔给对手 10 枚奖励筹码；跟注只要对手任一面 ≤ 你即反杀！' : 'Rival declared DOUBLE-BET! Folding ALSO pays them +10 bonus chips — calling wins if EITHER of their faces ≤ yours!'}
                      </div>`
                    : ''
                }

                <div class="dsp-side-selector">
                  <button type="button" class="dsp-side-btn is-front ${uiSelectedSide === 'front' ? 'is-selected' : ''}" data-pick-side="front" ${bounds.mySide === 'back' || bounds.mySide === 'both' ? 'disabled' : ''}>
                    <strong style="color:var(--tg-gold-bright);">${lang === 'zh' ? '押正面 FRONT' : 'PLAY FRONT'}</strong>
                    <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-ink-muted);">${lang === 'zh' ? '点数' : 'Val'}: ${myCard?.front ?? '?'}</span>
                  </button>
                  <button type="button" class="dsp-side-btn is-back ${uiSelectedSide === 'back' ? 'is-selected' : ''}" data-pick-side="back" ${bounds.mySide === 'front' || bounds.mySide === 'both' ? 'disabled' : ''}>
                    <strong style="color:#ff8ba0;">${lang === 'zh' ? '押背面 BACK' : 'PLAY BACK'}</strong>
                    <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-ink-muted);">${lang === 'zh' ? '点数' : 'Val'}: ${myCard?.back ?? '?'}</span>
                  </button>
                  <button type="button" class="dsp-side-btn is-both ${uiSelectedSide === 'both' ? 'is-selected' : ''}" data-pick-side="both" ${bounds.canDoubleBet || bounds.mySide === 'both' ? '' : 'disabled'}>
                    <strong style="color:#ffd0da;">🔥 ${lang === 'zh' ? '双面下注 2×' : 'DOUBLE-BET 2×'}</strong>
                    <span style="font-size:11px;color:var(--tg-gold-bright);">${lang === 'zh' ? '双面全胜/迫弃 +10' : 'Win Both / Fold +10'}</span>
                  </button>
                </div>

                ${
                  isChoosingDoubleUpgrade
                    ? `
                      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                        <span style="font-size:12px;color:var(--tg-ink-muted);">${lang === 'zh' ? '双面每侧下注额' : 'Per-side unit bet'}: <strong style="color:var(--tg-gold-bright);font-family:var(--tg-font-mono);" id="dsp-dbl-unit">${bounds.minDoubleUnit + uiRaiseVal}</strong> (${lang === 'zh' ? '需投入' : 'Cost'} <strong style="color:#ff8ba0;font-family:var(--tg-font-mono);" id="dsp-dbl-cost">${bounds.minDoubleCost + 2 * uiRaiseVal}</strong>)</span>
                        ${
                          bounds.maxDoubleRaiseBy > 0
                            ? `<input type="range" id="dsp-slider" style="flex:1;min-width:120px;accent-color:var(--tg-garnet-bright);" min="0" max="${bounds.maxDoubleRaiseBy}" value="${uiRaiseVal}" />`
                            : ''
                        }
                      </div>
                      <div class="dsp-action-grid">
                        <button type="button" class="tg-btn tg-btn-garnet dsp-act-btn" id="dsp-btn-double" style="grid-column:span 2;">
                          <span>🔥 ${lang === 'zh' ? '确认发动双面下注！' : 'DECLARE DOUBLE-BET!'}</span>
                          <small id="dsp-btn-double-sub">${lang === 'zh' ? `投入 ${bounds.minDoubleCost + 2 * uiRaiseVal} 筹码` : `Pay +${bounds.minDoubleCost + 2 * uiRaiseVal} chips`}</small>
                        </button>
                        <button type="button" class="tg-btn tg-btn-ghost dsp-act-btn" id="dsp-btn-fold" style="border-color:rgba(255,46,84,0.45);color:#ff99ab;">
                          <span>${lang === 'zh' ? '弃牌 FOLD' : 'FOLD'}</span>
                          <small>${lang === 'zh' ? '放弃底池' : 'Surrender'}</small>
                        </button>
                      </div>
                    `
                    : `
                      ${
                        bounds.maxRaiseBy >= 1
                          ? `
                            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                              <span style="font-size:12px;color:var(--tg-ink-muted);">${bounds.canCheck ? (lang === 'zh' ? '下注额' : 'Bet') : (lang === 'zh' ? '加注额' : 'Raise +')}</span>
                              <input type="range" id="dsp-slider" style="flex:1;min-width:120px;accent-color:var(--tg-gold);" min="1" max="${bounds.maxRaiseBy}" value="${uiRaiseVal}" />
                              <span class="tg-dial-value" id="dsp-raise-val" style="font-size:18px;min-width:42px;">+${uiRaiseVal}</span>
                              <div style="display:flex;gap:6px;">
                                ${[1, 3, 5]
                                  .filter((v) => v <= bounds.maxRaiseBy)
                                  .map((v) => `<button type="button" class="tg-btn tg-btn-sm" data-preset="${v}">+${v}</button>`)
                                  .join('')}
                                <button type="button" class="tg-btn tg-btn-sm tg-btn-garnet" data-preset="${bounds.maxRaiseBy}">MAX</button>
                              </div>
                            </div>
                          `
                          : ''
                      }
                      <div class="dsp-action-grid">
                        ${
                          bounds.canCheck
                            ? `<button type="button" class="tg-btn tg-btn-cyan dsp-act-btn" id="dsp-btn-check">
                                <span>${lang === 'zh' ? '过牌 CHECK' : 'CHECK'}</span>
                                <small>${uiSelectedSide === 'front' ? (lang === 'zh' ? '锁定正面' : 'Lock Front') : lang === 'zh' ? '锁定背面' : 'Lock Back'}</small>
                              </button>`
                            : `<button type="button" class="tg-btn tg-btn-cyan dsp-act-btn" id="dsp-btn-call">
                                <span>${lang === 'zh' ? '跟注摊牌 CALL' : 'CALL SHOWDOWN'}</span>
                                <small>+${bounds.toCall} ${lang === 'zh' ? '筹码' : 'chips'}</small>
                              </button>`
                        }
                        <button type="button" class="tg-btn tg-btn-gold dsp-act-btn" id="dsp-btn-raise" ${bounds.maxRaiseBy >= 1 ? '' : 'disabled'}>
                          <span>${bounds.canCheck ? (lang === 'zh' ? '下注 BET' : 'BET') : lang === 'zh' ? '加注 RAISE' : 'RAISE'}</span>
                          <small id="dsp-btn-raise-sub">${bounds.maxRaiseBy >= 1 ? `+${bounds.toCall + uiRaiseVal * bounds.myMult}` : '--'}</small>
                        </button>
                        <button type="button" class="tg-btn tg-btn-ghost dsp-act-btn" id="dsp-btn-fold" style="border-color:rgba(255,46,84,0.45);color:#ff99ab;">
                          <span>${lang === 'zh' ? '弃牌 FOLD' : 'FOLD'}</span>
                          <small>${bounds.mustRespondToDouble ? (lang === 'zh' ? '将赔 -10！' : 'Pays -10!') : lang === 'zh' ? '放弃底池' : 'Surrender'}</small>
                        </button>
                      </div>
                    `
                }
              `
              : `<div style="text-align:center;padding:12px;font-size:13.5px;color:var(--tg-ink-muted);">${
                  state.phase === 'showdown'
                    ? lang === 'zh'
                      ? '本局已结算，点击上方按钮进入下一局。'
                      : 'Hand settled. Click above to deal the next hand.'
                    : state.phase === 'ended'
                    ? lang === 'zh'
                      ? '死亡对决已分出胜负！'
                      : 'Death Match concluded!'
                    : lang === 'zh'
                    ? `等待 ${UI.escapeHtml(state.seatsById[state.currentTurnSeatId]?.name || '')} 下注决策...`
                    : `Waiting for ${UI.escapeHtml(state.seatsById[state.currentTurnSeatId]?.name || '')}...`
                }</div>`
          }
        </section>
      </div>
    `;

    const toggleMyFlip = () => {
      sfx.play('cardFlip');
      uiMyCardFlipped = !uiMyCardFlipped;
      const cardEl = container.querySelector('#dsp-my-card');
      cardEl?.classList.toggle('is-flipped', uiMyCardFlipped);
    };
    container.querySelector('#dsp-my-card')?.addEventListener('click', toggleMyFlip);
    container.querySelector('#dsp-btn-flip')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMyFlip();
    });

    container.querySelector('#dsp-btn-next')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_HAND' });
    });

    container.querySelectorAll('[data-pick-side]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        sfx.play('click');
        uiSelectedSide = btn.dataset.pickSide;
        uiRaiseVal = uiSelectedSide === 'both' && bounds.mySide !== 'both' ? 0 : 1;
        // Re-render smoothly by invoking render with same ctx
        renderGame(container, ctx);
      });
    });

    const slider = container.querySelector('#dsp-slider');
    const syncSlider = (v) => {
      const minV = isChoosingDoubleUpgrade ? 0 : 1;
      uiRaiseVal = Math.max(minV, Math.min(activeMaxRaise, Math.floor(Number(v) || 0)));
      if (slider) slider.value = String(uiRaiseVal);
      if (isChoosingDoubleUpgrade) {
        const uEl = container.querySelector('#dsp-dbl-unit');
        const cEl = container.querySelector('#dsp-dbl-cost');
        const sEl = container.querySelector('#dsp-btn-double-sub');
        const cost = bounds.minDoubleCost + 2 * uiRaiseVal;
        if (uEl) uEl.textContent = String(bounds.minDoubleUnit + uiRaiseVal);
        if (cEl) cEl.textContent = String(cost);
        if (sEl) sEl.textContent = lang === 'zh' ? `投入 ${cost} 筹码` : `Pay +${cost} chips`;
      } else {
        const vEl = container.querySelector('#dsp-raise-val');
        const sEl = container.querySelector('#dsp-btn-raise-sub');
        if (vEl) vEl.textContent = `+${uiRaiseVal}`;
        if (sEl) sEl.textContent = `+${bounds.toCall + uiRaiseVal * bounds.myMult}`;
      }
    };

    slider?.addEventListener('input', (e) => syncSlider(e.target.value));
    container.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        syncSlider(btn.dataset.preset);
      });
    });

    container.querySelector('#dsp-btn-check')?.addEventListener('click', () => {
      dispatch({ type: 'CHECK', payload: { side: uiSelectedSide } });
    });
    container.querySelector('#dsp-btn-call')?.addEventListener('click', () => {
      dispatch({ type: 'CALL', payload: { side: uiSelectedSide } });
    });
    container.querySelector('#dsp-btn-raise')?.addEventListener('click', () => {
      dispatch({ type: 'RAISE', payload: { side: uiSelectedSide, raiseBy: uiRaiseVal } });
    });
    container.querySelector('#dsp-btn-double')?.addEventListener('click', () => {
      dispatch({ type: 'DOUBLE_BET', payload: { extraUnits: uiRaiseVal } });
    });
    container.querySelector('#dsp-btn-fold')?.addEventListener('click', () => {
      dispatch({ type: 'FOLD' });
    });
}

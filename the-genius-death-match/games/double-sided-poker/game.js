/**
 * Double-Sided Poker (双面扑克) — Persistent 3D Dual-Face Cards & Sliding Side Selector
 */

import { mountGame, SFX, I18n, UI, Motion } from '../../shared/sdk.js';
import { GameRules, computeBettingBounds, possibleOppBacks } from './rules.js';

let uiSelectedSide = 'front';
let uiRaiseVal = 1;
let uiMyCardFlipped = false;
let lastRoundSeen = 0;
let lastHandledEventKey = null;
let prevNums = { pot: null, myChips: null, oppChips: null, myUnit: null, oppUnit: null };

function patchDualCard(cRefs, { card, isMine, flipped, oppPlayedBack, lang }) {
  const fTxt = card?.front != null ? String(card.front) : '?';
  const bTxt = card?.back != null ? String(card.back) : '?';
  const backVisible = card?.back != null;
  const showBackNow = isMine ? flipped : Boolean(oppPlayedBack && backVisible);

  cRefs.root.classList.toggle('is-mine', Boolean(isMine));
  cRefs.root.classList.toggle('is-flipped', showBackNow);
  cRefs.fTl.textContent = `FRONT · ${fTxt}`;
  cRefs.fNum.textContent = fTxt;
  cRefs.fSub.textContent = lang === 'zh' ? '正面 · 公开' : 'Front · Public';
  cRefs.fBr.textContent = `${lang === 'zh' ? '背' : 'B'}: ${bTxt}`;
  cRefs.fBr.style.color = backVisible ? 'var(--tg-garnet-ink)' : 'var(--tg-ink-faint)';

  cRefs.bTl.textContent = `BACK · ${bTxt}`;
  cRefs.bNum.textContent = bTxt;
  cRefs.bSub.textContent = lang === 'zh' ? '背面 · 暗牌' : 'Back · Secret';
  cRefs.bBr.textContent = `${lang === 'zh' ? '正' : 'F'}: ${fTxt}`;

  cRefs.pipF.textContent = `${lang === 'zh' ? '正' : 'F'} ${fTxt}`;
  cRefs.pipB.textContent = `${lang === 'zh' ? '背' : 'B'} ${bTxt}`;
  cRefs.pipB.style.color = backVisible ? 'var(--tg-garnet-ink)' : 'var(--tg-ink-faint)';
  if (cRefs.btnFlip) {
    cRefs.btnFlip.hidden = !isMine;
    cRefs.btnFlip.textContent = lang === 'zh' ? '↻ 翻面' : '↻ Flip';
  }
}

function patchBetWells(wRefs, lockedSide, unitBet, prevUnit, lang) {
  const isFront = lockedSide === 'front';
  const isBack = lockedSide === 'back';
  const isBoth = lockedSide === 'both';

  wRefs.frontTitle.textContent = lang === 'zh' ? '正面下注区' : 'Front Zone';
  wRefs.backTitle.textContent = lang === 'zh' ? '背面下注区' : 'Back Zone';
  wRefs.frontWell.classList.toggle('is-front-lit', isFront);
  wRefs.frontWell.classList.toggle('is-double-lit', isBoth);
  wRefs.backWell.classList.toggle('is-back-lit', isBack);
  wRefs.backWell.classList.toggle('is-double-lit', isBoth);

  const setWellText = (el, active) => {
    if (!active) {
      el.textContent = '—';
    } else if (unitBet > 0) {
      if (prevUnit !== null && prevUnit !== unitBet) {
        Motion.animateNumber(el, prevUnit, unitBet, { duration: 260, format: (n) => `+${Math.round(n)}` });
      } else {
        el.textContent = `+${unitBet}`;
      }
    } else {
      el.textContent = lang === 'zh' ? '已锁定' : 'Locked';
    }
  };
  setWellText(wRefs.frontVal, isBoth || isFront);
  setWellText(wRefs.backVal, isBoth || isBack);
}

function mountSkeleton(container) {
  const cardTpl = (p, withFlipBtn) => `
    <div class="dsp-card-wrap">
      <div class="tg-card-3d dsp-card-3d" data-ref="${p}-card">
        <div class="tg-card-3d-inner">
          <div class="tg-card-face dsp-face-gold">
            <span class="dsp-card-corner tl" style="color:var(--tg-gold);" data-ref="${p}-f-tl"></span>
            <div class="dsp-card-num" data-ref="${p}-f-num">?</div>
            <div style="font-size:9.5px;letter-spacing:0.14em;color:var(--tg-ink-muted);margin-top:4px;" data-ref="${p}-f-sub"></div>
            <span class="dsp-card-corner br" data-ref="${p}-f-br"></span>
          </div>
          <div class="tg-card-face dsp-face-crimson">
            <span class="dsp-card-corner tl" style="color:var(--tg-garnet-ink);" data-ref="${p}-b-tl"></span>
            <div class="dsp-card-num" data-ref="${p}-b-num">?</div>
            <div style="font-size:9.5px;letter-spacing:0.14em;color:var(--tg-ink-muted);margin-top:4px;" data-ref="${p}-b-sub"></div>
            <span class="dsp-card-corner br" style="color:var(--tg-gold);" data-ref="${p}-b-br"></span>
          </div>
        </div>
      </div>
      <div class="dsp-dual-pip">
        <span style="color:var(--tg-gold-bright);" data-ref="${p}-pip-f"></span>
        <span style="color:var(--tg-ink-faint);">/</span>
        <span data-ref="${p}-pip-b"></span>
        ${withFlipBtn ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-ref="${p}-btn-flip" style="min-height:22px;padding:1px 7px;font-size:10.5px;"></button>` : ''}
      </div>
    </div>
  `;

  const wellsTpl = (p) => `
    <div class="dsp-bet-wells">
      <div class="dsp-well" data-ref="${p}-w-front">
        <div class="dsp-well-title" data-ref="${p}-wt-front"></div>
        <div class="dsp-well-val" data-ref="${p}-wv-front">—</div>
      </div>
      <div class="dsp-well" data-ref="${p}-w-back">
        <div class="dsp-well-title" data-ref="${p}-wt-back"></div>
        <div class="dsp-well-val" data-ref="${p}-wv-back">—</div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="dsp-arena">
      <div class="dsp-topbar">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--tg-ink-muted);">
          <span class="tg-badge tg-badge-gold" data-ref="deck-badge"></span>
          <span data-ref="deck-rem"></span>
        </div>
        <span class="dsp-parity-hint" data-ref="parity-hint" hidden></span>
      </div>

      <section class="dsp-table" data-ref="table">
        <!-- Opponent Row -->
        <div class="dsp-seat-row">
          <div class="dsp-zones-stack">
            <div class="dsp-plate" data-ref="opp-plate">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <strong><span style="color:var(--tg-garnet-bright);margin-right:5px;" data-ref="opp-avatar"></span><span data-ref="opp-name"></span></strong>
                <span class="dsp-delta-anchor" data-ref="opp-delta"><span class="dsp-chip-num" data-ref="opp-chips">0</span></span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--tg-ink-muted);">
                <span data-ref="opp-status"></span>
                <span class="tg-badge tg-badge-garnet" data-ref="opp-comm" hidden></span>
              </div>
            </div>
            ${wellsTpl('opp')}
          </div>
          ${cardTpl('opp', false)}
        </div>

        <!-- Center Pot & Double-Bet Jackpot -->
        <div class="dsp-center">
          <div class="dsp-pot-row">
            <div class="dsp-pot-pill" data-ref="pot-pill">
              <span style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:var(--tg-ink-muted);" data-ref="pot-label"></span>
              <span class="dsp-delta-anchor" data-ref="pot-delta"><span class="dsp-pot-val" data-ref="pot-val">0</span></span>
            </div>
            <div class="dsp-jackpot-pill" data-ref="jackpot-pill" hidden></div>
          </div>

          <div class="dsp-banner" data-ref="banner" hidden>
            <div style="font-family:var(--tg-font-display);font-size:17px;font-weight:800;" data-ref="banner-title"></div>
            <div style="font-size:12.5px;color:var(--tg-ink-muted);" data-ref="banner-sub"></div>
            <button type="button" class="tg-btn tg-btn-gold" data-ref="btn-next" style="margin-top:4px;" hidden></button>
          </div>
        </div>

        <!-- My Row -->
        <div class="dsp-seat-row">
          ${cardTpl('my', true)}
          <div class="dsp-zones-stack">
            ${wellsTpl('my')}
            <div class="dsp-plate" data-ref="my-plate">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <strong><span style="color:var(--tg-gold);margin-right:5px;" data-ref="my-avatar"></span><span data-ref="my-name"></span></strong>
                <span class="dsp-delta-anchor" data-ref="my-delta"><span class="dsp-chip-num" data-ref="my-chips">0</span></span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--tg-ink-muted);">
                <span data-ref="my-status"></span>
                <span class="tg-badge tg-badge-gold" data-ref="my-comm" hidden></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Persistent Controls Console -->
      <section class="dsp-controls">
        <div data-ref="turn-controls" hidden>
          <div class="dsp-double-warn" data-ref="double-warn" hidden style="margin-bottom:10px;"></div>

          <div class="dsp-side-selector" data-ref="side-selector">
            <button type="button" class="dsp-side-btn is-front" data-pick-side="front">
              <strong style="color:var(--tg-gold-bright);" data-ref="pick-front-t"></strong>
              <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-ink-muted);" data-ref="pick-front-s"></span>
            </button>
            <button type="button" class="dsp-side-btn is-back" data-pick-side="back">
              <strong style="color:var(--tg-garnet-ink);" data-ref="pick-back-t"></strong>
              <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-ink-muted);" data-ref="pick-back-s"></span>
            </button>
            <button type="button" class="dsp-side-btn is-both" data-pick-side="both">
              <strong style="color:var(--tg-garnet-ink);" data-ref="pick-both-t"></strong>
              <span style="font-size:11px;color:var(--tg-gold-bright);" data-ref="pick-both-s"></span>
            </button>
          </div>

          <!-- Double-Bet Upgrade Panel -->
          <div data-ref="double-panel" hidden style="margin-top:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
              <span style="font-size:12px;color:var(--tg-ink-muted);" data-ref="dbl-readout"></span>
              <input type="range" data-ref="dbl-slider" style="flex:1;min-width:120px;accent-color:var(--tg-garnet);" min="0" max="10" value="0" />
            </div>
            <div class="dsp-action-grid">
              <button type="button" class="tg-btn tg-btn-garnet dsp-act-btn" data-ref="btn-double" style="grid-column:span 2;">
                <span data-ref="btn-double-t"></span>
                <small data-ref="btn-double-s"></small>
              </button>
              <button type="button" class="tg-btn tg-btn-ghost dsp-act-btn dsp-btn-fold-outline" data-ref="btn-fold-dbl">
                <span data-ref="btn-fold-dbl-t"></span>
                <small data-ref="btn-fold-dbl-s"></small>
              </button>
            </div>
          </div>

          <!-- Standard Single-Side Panel -->
          <div data-ref="single-panel" hidden style="margin-top:10px;">
            <div data-ref="single-slider-row" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
              <span style="font-size:12px;color:var(--tg-ink-muted);" data-ref="single-slider-label"></span>
              <input type="range" data-ref="single-slider" style="flex:1;min-width:120px;accent-color:var(--tg-gold);" min="1" max="10" value="1" />
              <span class="tg-dial-value" data-ref="single-raise-val" style="font-size:18px;min-width:42px;">+1</span>
              <div style="display:flex;gap:6px;" data-ref="single-presets"></div>
            </div>
            <div class="dsp-action-grid">
              <button type="button" class="tg-btn tg-btn-cyan dsp-act-btn" data-ref="btn-pc">
                <span data-ref="btn-pc-t"></span>
                <small data-ref="btn-pc-s"></small>
              </button>
              <button type="button" class="tg-btn tg-btn-gold dsp-act-btn" data-ref="btn-raise">
                <span data-ref="btn-raise-t"></span>
                <small data-ref="btn-raise-s"></small>
              </button>
              <button type="button" class="tg-btn tg-btn-ghost dsp-act-btn dsp-btn-fold-outline" data-ref="btn-fold">
                <span data-ref="btn-fold-t"></span>
                <small data-ref="btn-fold-s"></small>
              </button>
            </div>
          </div>
        </div>

        <div style="text-align:center;padding:12px;font-size:13.5px;color:var(--tg-ink-muted);" data-ref="waiting" hidden></div>
      </section>
    </div>
  `;

  const q = (n) => container.querySelector(`[data-ref="${n}"]`);
  const cRefs = (p) => ({
    root: q(`${p}-card`),
    fTl: q(`${p}-f-tl`),
    fNum: q(`${p}-f-num`),
    fSub: q(`${p}-f-sub`),
    fBr: q(`${p}-f-br`),
    bTl: q(`${p}-b-tl`),
    bNum: q(`${p}-b-num`),
    bSub: q(`${p}-b-sub`),
    bBr: q(`${p}-b-br`),
    pipF: q(`${p}-pip-f`),
    pipB: q(`${p}-pip-b`),
    btnFlip: q(`${p}-btn-flip`),
  });
  const wRefs = (p) => ({
    frontWell: q(`${p}-w-front`),
    frontTitle: q(`${p}-wt-front`),
    frontVal: q(`${p}-wv-front`),
    backWell: q(`${p}-w-back`),
    backTitle: q(`${p}-wt-back`),
    backVal: q(`${p}-wv-back`),
  });

  const refs = {
    table: q('table'),
    deckBadge: q('deck-badge'),
    deckRem: q('deck-rem'),
    parityHint: q('parity-hint'),
    oppPlate: q('opp-plate'),
    oppAvatar: q('opp-avatar'),
    oppName: q('opp-name'),
    oppChips: q('opp-chips'),
    oppDelta: q('opp-delta'),
    oppStatus: q('opp-status'),
    oppComm: q('opp-comm'),
    oppWells: wRefs('opp'),
    oppCard: cRefs('opp'),
    myPlate: q('my-plate'),
    myAvatar: q('my-avatar'),
    myName: q('my-name'),
    myChips: q('my-chips'),
    myDelta: q('my-delta'),
    myStatus: q('my-status'),
    myComm: q('my-comm'),
    myWells: wRefs('my'),
    myCard: cRefs('my'),
    potPill: q('pot-pill'),
    potLabel: q('pot-label'),
    potVal: q('pot-val'),
    potDelta: q('pot-delta'),
    jackpotPill: q('jackpot-pill'),
    banner: q('banner'),
    bannerTitle: q('banner-title'),
    bannerSub: q('banner-sub'),
    btnNext: q('btn-next'),
    turnControls: q('turn-controls'),
    waiting: q('waiting'),
    doubleWarn: q('double-warn'),
    sideSelector: q('side-selector'),
    pickFrontT: q('pick-front-t'),
    pickFrontS: q('pick-front-s'),
    pickBackT: q('pick-back-t'),
    pickBackS: q('pick-back-s'),
    pickBothT: q('pick-both-t'),
    pickBothS: q('pick-both-s'),
    doublePanel: q('double-panel'),
    dblReadout: q('dbl-readout'),
    dblSlider: q('dbl-slider'),
    btnDouble: q('btn-double'),
    btnDoubleT: q('btn-double-t'),
    btnDoubleS: q('btn-double-s'),
    btnFoldDbl: q('btn-fold-dbl'),
    btnFoldDblT: q('btn-fold-dbl-t'),
    btnFoldDblS: q('btn-fold-dbl-s'),
    singlePanel: q('single-panel'),
    singleSliderRow: q('single-slider-row'),
    singleSliderLabel: q('single-slider-label'),
    singleSlider: q('single-slider'),
    singleRaiseVal: q('single-raise-val'),
    singlePresets: q('single-presets'),
    btnPc: q('btn-pc'),
    btnPcT: q('btn-pc-t'),
    btnPcS: q('btn-pc-s'),
    btnRaise: q('btn-raise'),
    btnRaiseT: q('btn-raise-t'),
    btnRaiseS: q('btn-raise-s'),
    btnFold: q('btn-fold'),
    btnFoldT: q('btn-fold-t'),
    btnFoldS: q('btn-fold-s'),
    latestCtx: null,
    latestBounds: null,
    bannerOpen: false,
  };

  // Smooth local card flip toggle (never interrupted!)
  const toggleFlip = () => {
    if (refs.latestCtx?.isSpectator) return;
    SFX.play('cardFlip');
    uiMyCardFlipped = !uiMyCardFlipped;
    refs.myCard.root.classList.toggle('is-flipped', uiMyCardFlipped);
  };
  refs.myCard.root.addEventListener('click', toggleFlip);
  refs.myCard.btnFlip?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFlip();
  });

  // In-place side selector + sliding capsule indicator (ZERO innerHTML nuke!)
  const syncSidePanels = (immediate = false) => {
    const b = refs.latestBounds;
    const lang = refs.latestCtx?.lang || 'zh';
    if (!b) return;

    refs.sideSelector.classList.toggle('is-back-mode', uiSelectedSide === 'back');
    refs.sideSelector.classList.toggle('is-both-mode', uiSelectedSide === 'both');
    const activeBtn = refs.sideSelector.querySelector(`[data-pick-side="${uiSelectedSide}"]`);
    if (activeBtn) Motion.slideIndicator(refs.sideSelector, activeBtn, { immediate });

    const isUpgrade = uiSelectedSide === 'both' && b.mySide !== 'both';
    refs.doublePanel.hidden = !isUpgrade;
    refs.singlePanel.hidden = isUpgrade;

    if (isUpgrade) {
      uiRaiseVal = Math.max(0, Math.min(b.maxDoubleRaiseBy, Math.floor(uiRaiseVal)));
      refs.dblSlider.hidden = b.maxDoubleRaiseBy <= 0;
      refs.dblSlider.max = String(Math.max(0, b.maxDoubleRaiseBy));
      refs.dblSlider.value = String(uiRaiseVal);
      const unit = b.minDoubleUnit + uiRaiseVal;
      const cost = b.minDoubleCost + 2 * uiRaiseVal;
      refs.dblReadout.textContent =
        lang === 'zh'
          ? `双面每侧下注 ${unit}（共需投入 ${cost} 筹码）`
          : `Per-side bet ${unit} (Total cost +${cost} chips)`;
      refs.btnDoubleT.textContent = lang === 'zh' ? '确认发动双面下注' : 'Declare Double-Bet';
      refs.btnDoubleS.textContent = lang === 'zh' ? `投入 ${cost} 筹码` : `Pay +${cost} chips`;
      refs.btnFoldDblT.textContent = lang === 'zh' ? '弃牌' : 'Fold';
      refs.btnFoldDblS.textContent = lang === 'zh' ? '放弃底池' : 'Surrender';
    } else {
      uiRaiseVal = Math.max(1, Math.min(Math.max(1, b.maxRaiseBy), Math.floor(uiRaiseVal) || 1));
      const canRaise = b.maxRaiseBy >= 1;
      refs.singleSliderRow.hidden = !canRaise;
      if (canRaise) {
        refs.singleSliderLabel.textContent = b.canCheck
          ? lang === 'zh' ? '下注额' : 'Bet'
          : lang === 'zh' ? '加注额' : 'Raise +';
        refs.singleSlider.max = String(b.maxRaiseBy);
        refs.singleSlider.value = String(uiRaiseVal);
        refs.singleRaiseVal.textContent = `+${uiRaiseVal}`;
        const presets = [1, 3, 5].filter((v) => v <= b.maxRaiseBy);
        refs.singlePresets.innerHTML =
          presets.map((v) => `<button type="button" class="tg-btn tg-btn-sm" data-preset="${v}">+${v}</button>`).join('') +
          `<button type="button" class="tg-btn tg-btn-sm tg-btn-garnet" data-preset="${b.maxRaiseBy}">${lang === 'zh' ? '全下' : 'Max'}</button>`;
      }
      refs.btnPcT.textContent = b.canCheck
        ? lang === 'zh' ? '过牌' : 'Check'
        : lang === 'zh' ? '跟注摊牌' : 'Call Showdown';
      refs.btnPcS.textContent = b.canCheck
        ? uiSelectedSide === 'front'
          ? lang === 'zh' ? '锁定正面' : 'Lock Front'
          : lang === 'zh' ? '锁定背面' : 'Lock Back'
        : `+${b.toCall} ${lang === 'zh' ? '筹码' : 'chips'}`;
      refs.btnRaise.disabled = !canRaise;
      refs.btnRaiseT.textContent = b.canCheck
        ? lang === 'zh' ? '下注' : 'Bet'
        : lang === 'zh' ? '加注' : 'Raise';
      refs.btnRaiseS.textContent = canRaise ? `+${b.toCall + uiRaiseVal * b.myMult}` : '--';
      refs.btnFoldT.textContent = lang === 'zh' ? '弃牌' : 'Fold';
      refs.btnFoldS.textContent = b.mustRespondToDouble
        ? lang === 'zh' ? '将赔 -10' : 'Pays -10'
        : lang === 'zh' ? '放弃底池' : 'Surrender';
    }
  };
  refs.syncSidePanels = syncSidePanels;

  refs.sideSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick-side]');
    if (!btn || btn.disabled) return;
    SFX.play('click');
    uiSelectedSide = btn.dataset.pickSide;
    uiRaiseVal = uiSelectedSide === 'both' && refs.latestBounds?.mySide !== 'both' ? 0 : 1;
    syncSidePanels(false);
  });

  refs.dblSlider.addEventListener('input', (e) => {
    uiRaiseVal = Math.max(0, Number(e.target.value) || 0);
    syncSidePanels(true);
  });
  refs.singleSlider.addEventListener('input', (e) => {
    uiRaiseVal = Math.max(1, Number(e.target.value) || 1);
    syncSidePanels(true);
  });
  refs.singlePresets.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    SFX.play('click');
    uiRaiseVal = Number(btn.dataset.preset) || 1;
    syncSidePanels(true);
  });

  refs.btnNext.addEventListener('click', () => {
    SFX.play('click');
    refs.latestCtx?.dispatch({ type: 'NEXT_HAND' });
  });
  refs.btnPc.addEventListener('click', () => {
    const b = refs.latestBounds;
    if (!b) return;
    Motion.pulseConfirm(refs.potPill, { tone: 'cyan' });
    refs.latestCtx?.dispatch({ type: b.canCheck ? 'CHECK' : 'CALL', payload: { side: uiSelectedSide } });
  });
  refs.btnRaise.addEventListener('click', () => {
    Motion.pulseConfirm(refs.potPill, { tone: 'gold' });
    refs.latestCtx?.dispatch({ type: 'RAISE', payload: { side: uiSelectedSide, raiseBy: uiRaiseVal } });
  });
  refs.btnDouble.addEventListener('click', () => {
    Motion.pulseConfirm(refs.potPill, { tone: 'gold' });
    refs.latestCtx?.dispatch({ type: 'DOUBLE_BET', payload: { extraUnits: uiRaiseVal } });
  });
  refs.btnFold.addEventListener('click', () => refs.latestCtx?.dispatch({ type: 'FOLD' }));
  refs.btnFoldDbl.addEventListener('click', () => refs.latestCtx?.dispatch({ type: 'FOLD' }));

  container._dspRefs = refs;
  return refs;
}

function handleEventFeedback(lastEvent, sfx, refs) {
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
      Motion.pulseConfirm(refs.potPill, { tone: 'gold' });
      break;
    case 'DOUBLE_BET':
      sfx.play('clash');
      Motion.pulseConfirm(refs.potPill, { tone: 'gold' });
      break;
    case 'DOUBLE_BET_JACKPOT':
    case 'DOUBLE_BET_FOLD_BONUS':
      sfx.play('combo');
      Motion.pulseConfirm(refs.banner, { tone: 'emerald' });
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
- **锁定单面**：每局首次行动须锁定押注 **正面** 或 **背面**，锁定后本局不可在正反面间互换（仅可升级为双面下注）。
- **双面下注 (2×)**：同时在正、反两面押入等额双倍筹码！
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

  render(container, ctx) {
    const { state, activeSeatId, mySeatId, isSpectator, lang, lastEvent, sfx } = ctx;
    if (!state) return;

    const refs = container._dspRefs && container.contains(container._dspRefs.table)
      ? container._dspRefs
      : mountSkeleton(container);

    const viewerId = isSpectator ? state.seatIds[0] : activeSeatId || mySeatId || state.seatIds[0];
    const oppId = state.seatIds[0] === viewerId ? state.seatIds[1] : state.seatIds[0];
    const meInfo = state.seatsById[viewerId] || { name: 'P1', avatar: '♦' };
    const oppInfo = state.seatsById[oppId] || { name: 'P2', avatar: '♛' };

    if (state.round < lastRoundSeen) {
      prevNums = { pot: null, myChips: null, oppChips: null, myUnit: null, oppUnit: null };
    }
    if (state.round !== lastRoundSeen) {
      lastRoundSeen = state.round;
      uiMyCardFlipped = false;
      const myCardInit = state.hands[viewerId];
      uiSelectedSide = myCardInit && myCardInit.back != null && myCardInit.back > myCardInit.front ? 'back' : 'front';
      uiRaiseVal = 1;
    }

    const bounds = computeBettingBounds(state, viewerId);
    const isMyTurn = !isSpectator && state.phase === 'betting' && state.currentTurnSeatId === viewerId;
    const isShowdown = state.phase === 'showdown' || state.phase === 'ended';

    if (bounds.mySide === 'both') uiSelectedSide = 'both';
    else if (bounds.mySide === 'front' && uiSelectedSide === 'back') uiSelectedSide = 'front';
    else if (bounds.mySide === 'back' && uiSelectedSide === 'front') uiSelectedSide = 'back';
    else if (uiSelectedSide === 'both' && !bounds.canDoubleBet) uiSelectedSide = bounds.mySide || 'front';

    refs.latestCtx = ctx;
    refs.latestBounds = bounds;
    handleEventFeedback(lastEvent, sfx, refs);

    const myCard = state.hands[viewerId];
    const oppCard = state.hands[oppId];
    const oppPossible = oppCard ? possibleOppBacks(oppCard.front, state.options.deckMode) : [];
    const anyDoubleActive = state.lockedSide[viewerId] === 'both' || state.lockedSide[oppId] === 'both';

    // 1. Topbar
    refs.deckBadge.textContent = state.options.deckMode === 's3' ? 'S3 · 90 CARDS' : 'S4 · ODD/EVEN 200';
    refs.deckRem.textContent = lang === 'zh' ? `牌库余 ${state.deckRemaining} 张` : `${state.deckRemaining} left in deck`;
    refs.parityHint.hidden = !oppCard;
    if (oppCard) {
      refs.parityHint.textContent =
        state.options.deckMode === 's4'
          ? lang === 'zh'
            ? `对手背面必为${oppCard.front % 2 === 1 ? '偶数' : '奇数'} {${oppPossible.join(',')}}`
            : `Opp Back = ${oppCard.front % 2 === 1 ? 'Even' : 'Odd'} {${oppPossible.join(',')}}`
          : lang === 'zh'
          ? `对手背面 ≠ ${oppCard.front}`
          : `Opp Back ≠ ${oppCard.front}`;
    }

    // 2. Table, plates, wells & animated numbers
    const res = state.lastResolution;
    refs.table.classList.toggle('is-double-active', anyDoubleActive);

    const statusText = (side, isOpp) =>
      side === 'both'
        ? lang === 'zh' ? '已发动双面下注' : 'Double-Bet Active'
        : side === 'front'
        ? lang === 'zh' ? '已锁定：正面' : 'Locked: Front'
        : side === 'back'
        ? lang === 'zh' ? '已锁定：背面' : 'Locked: Back'
        : isOpp
        ? lang === 'zh' ? '尚未锁定正反面' : 'Side unlocked'
        : lang === 'zh' ? '请选择押注面' : 'Choose Front / Back / Both';

    refs.oppPlate.classList.toggle('is-active', state.currentTurnSeatId === oppId && state.phase === 'betting');
    refs.oppPlate.classList.toggle('is-winner', res?.winnerSeatId === oppId);
    refs.oppAvatar.textContent = oppInfo.avatar || '♛';
    refs.oppName.textContent = oppInfo.name;
    refs.oppStatus.textContent = statusText(state.lockedSide[oppId], true);
    refs.oppComm.hidden = state.totalCommitted[oppId] <= 0;
    refs.oppComm.textContent = lang === 'zh' ? `本轮 +${state.totalCommitted[oppId]}` : `In +${state.totalCommitted[oppId]}`;

    refs.myPlate.classList.toggle('is-active', isMyTurn);
    refs.myPlate.classList.toggle('is-winner', res?.winnerSeatId === viewerId);
    refs.myAvatar.textContent = meInfo.avatar || '♦';
    refs.myName.textContent = `${meInfo.name}${isSpectator ? '' : lang === 'zh' ? ' (你)' : ' (You)'}`;
    refs.myStatus.textContent = statusText(state.lockedSide[viewerId], false);
    refs.myComm.hidden = state.totalCommitted[viewerId] <= 0;
    refs.myComm.textContent = lang === 'zh' ? `本轮 +${state.totalCommitted[viewerId]}` : `In +${state.totalCommitted[viewerId]}`;

    refs.potLabel.textContent = lang === 'zh' ? '底池' : 'Pot';
    refs.jackpotPill.hidden = !anyDoubleActive;
    refs.jackpotPill.textContent =
      lang === 'zh' ? '双面下注激活 · 胜或迫弃 +10 筹码' : 'Double-Bet Live · +10 Bonus on Win or Fold';

    const curPot = state.pot;
    const curMy = state.chips[viewerId];
    const curOpp = state.chips[oppId];
    if (prevNums.pot === null) {
      refs.potVal.textContent = String(curPot);
      refs.myChips.textContent = String(curMy);
      refs.oppChips.textContent = String(curOpp);
    } else {
      if (curPot !== prevNums.pot) Motion.animateNumber(refs.potVal, prevNums.pot, curPot, { duration: 300, deltaEl: refs.potDelta });
      if (curMy !== prevNums.myChips) Motion.animateNumber(refs.myChips, prevNums.myChips, curMy, { duration: 320, deltaEl: refs.myDelta });
      if (curOpp !== prevNums.oppChips) Motion.animateNumber(refs.oppChips, prevNums.oppChips, curOpp, { duration: 320, deltaEl: refs.oppDelta });
    }

    patchBetWells(refs.oppWells, state.lockedSide[oppId], state.unitBet[oppId], prevNums.oppUnit, lang);
    patchBetWells(refs.myWells, state.lockedSide[viewerId], state.unitBet[viewerId], prevNums.myUnit, lang);

    prevNums = {
      pot: curPot,
      myChips: curMy,
      oppChips: curOpp,
      myUnit: state.unitBet[viewerId],
      oppUnit: state.unitBet[oppId],
    };

    // 3. 3D Dual-Faced Cards (preserved so opponent's Back flips cleanly at showdown!)
    const oppPlayedBack =
      isShowdown &&
      res?.kind === 'showdown' &&
      (state.lockedSide[oppId] === 'back' || state.lockedSide[oppId] === 'both');

    patchDualCard(refs.oppCard, {
      card: oppCard,
      isMine: false,
      flipped: false,
      oppPlayedBack,
      lang,
    });
    patchDualCard(refs.myCard, {
      card: myCard,
      isMine: !isSpectator,
      flipped: uiMyCardFlipped,
      oppPlayedBack: false,
      lang,
    });

    // 4. Resolution Banner
    if (res) {
      const wName = res.winnerSeatId ? state.seatsById[res.winnerSeatId]?.name : '';
      let title = '';
      let sub = '';
      const isJackpot = Boolean(res.doubleBetSuccess && res.doubleBetBonus > 0);

      if (res.kind === 'fold') {
        const fName = state.seatsById[res.foldedSeatId]?.name || '';
        title = isJackpot
          ? lang === 'zh'
            ? `双面下注威慑成功 · ${wName} 赢得 ${res.potAmount} + ${res.doubleBetBonus} 筹码`
            : `Double-Bet Fold Steal · ${wName} Wins ${res.potAmount} + ${res.doubleBetBonus}`
          : lang === 'zh'
          ? `${fName} 弃牌 · ${wName} 收下 ${res.potAmount} 筹码`
          : `${fName} Folded · ${wName} Wins ${res.potAmount}`;
        sub = lang === 'zh' ? '未参与摊牌的背面保持隐秘。' : 'Unplayed Back faces remain secret.';
      } else if (res.isTie) {
        title = res.splitOnAllInTie
          ? lang === 'zh' ? `全下平局分池 (${res.potAmount})` : `All-In Tie Split (${res.potAmount})`
          : lang === 'zh' ? `平局 · 底池 ${res.potAmount} 筹码滚存` : `Tie · ${res.potAmount} Chips Carry Over`;
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
              ? `双面大满贯 · ${dName} 赢走 ${res.potAmount} + ${res.doubleBetBonus} 奖励`
              : `Double-Bet Jackpot · ${dName} Wins ${res.potAmount} + ${res.doubleBetBonus}`;
          sub =
            lang === 'zh'
              ? `${dName} 正反双面 [${dRev.front} & ${dRev.back}] 全部压制对手 [${oVal}]`
              : `${dName}'s both faces [${dRev.front} & ${dRev.back}] beat [${oVal}]`;
        } else {
          title =
            lang === 'zh'
              ? `双面下注反杀 · ${wName} 赢得底池 ${res.potAmount} 筹码`
              : `Double-Bet Defused · ${wName} Wins ${res.potAmount} Pot`;
          sub =
            lang === 'zh'
              ? `${dName} [${dRev.front} & ${dRev.back}] 未能双面全部大于对手 [${oVal}]`
              : `${dName} [${dRev.front} & ${dRev.back}] failed to beat [${oVal}] on both sides`;
        }
      } else {
        const sideLabel = (s) => (s === 'front' ? (lang === 'zh' ? '正面' : 'Front') : lang === 'zh' ? '背面' : 'Back');
        const myS = res.sides[viewerId];
        const opS = res.sides[oppId];
        title =
          lang === 'zh'
            ? `${wName} 摊牌获胜 · +${res.potAmount} 筹码`
            : `${wName} Wins Showdown (+${res.potAmount})`;
        sub = `${meInfo.name} ${sideLabel(myS)} [${res.revealedSides[viewerId]?.[myS]}] vs ${oppInfo.name} ${sideLabel(opS)} [${res.revealedSides[oppId]?.[opS]}]`;
      }

      refs.banner.classList.toggle('is-jackpot', isJackpot);
      refs.bannerTitle.style.color = isJackpot ? 'var(--tg-garnet-ink)' : 'var(--tg-gold-bright)';
      refs.bannerTitle.textContent = title;
      refs.bannerSub.textContent = sub;
      refs.btnNext.hidden = !(state.phase === 'showdown' && !isSpectator);
      refs.btnNext.textContent = lang === 'zh' ? '进入下一局' : 'Deal Next Hand';

      if (!refs.bannerOpen) {
        refs.bannerOpen = true;
        Motion.transitionPresence(refs.banner, true, { preset: 'pill' });
        if (res.doubleBettorId && !res.doubleBetSuccess) {
          Motion.nudgeError(refs.table, { intensity: 'subtle' });
        }
      }
    } else if (refs.bannerOpen) {
      refs.bannerOpen = false;
      Motion.transitionPresence(refs.banner, false, { preset: 'pill' });
    }

    // 5. Controls & Sliding Side Selector
    if (isMyTurn) {
      refs.turnControls.hidden = false;
      refs.waiting.hidden = true;
      refs.doubleWarn.hidden = !bounds.mustRespondToDouble;
      refs.doubleWarn.textContent =
        lang === 'zh'
          ? '对手已发动双面下注！此时弃牌也将赔给对手 10 枚奖励筹码；跟注只要对手任一面 ≤ 你即反杀。'
          : 'Rival declared Double-Bet! Folding also pays +10 bonus chips — calling wins if either of their faces ≤ yours.';

      const btnFront = refs.sideSelector.querySelector('[data-pick-side="front"]');
      const btnBack = refs.sideSelector.querySelector('[data-pick-side="back"]');
      const btnBoth = refs.sideSelector.querySelector('[data-pick-side="both"]');
      btnFront.disabled = bounds.mySide === 'back' || bounds.mySide === 'both';
      btnBack.disabled = bounds.mySide === 'front' || bounds.mySide === 'both';
      btnBoth.disabled = !(bounds.canDoubleBet || bounds.mySide === 'both');

      refs.pickFrontT.textContent = lang === 'zh' ? '押正面' : 'Play Front';
      refs.pickFrontS.textContent = `${lang === 'zh' ? '点数' : 'Val'}: ${myCard?.front ?? '?'}`;
      refs.pickBackT.textContent = lang === 'zh' ? '押背面' : 'Play Back';
      refs.pickBackS.textContent = `${lang === 'zh' ? '点数' : 'Val'}: ${myCard?.back ?? '?'}`;
      refs.pickBothT.textContent = lang === 'zh' ? '双面下注 2×' : 'Double-Bet 2×';
      refs.pickBothS.textContent = lang === 'zh' ? '双面全胜/迫弃 +10' : 'Win Both / Fold +10';

      refs.syncSidePanels(false);
    } else {
      refs.turnControls.hidden = true;
      refs.waiting.hidden = false;
      refs.waiting.textContent =
        state.phase === 'showdown'
          ? lang === 'zh' ? '本局已结算，点击上方按钮进入下一局。' : 'Hand settled. Click above for the next hand.'
          : state.phase === 'ended'
          ? lang === 'zh' ? '死亡对决已分出胜负。' : 'Death Match concluded.'
          : lang === 'zh'
          ? `等待 ${state.seatsById[state.currentTurnSeatId]?.name || ''} 下注决策…`
          : `Waiting for ${state.seatsById[state.currentTurnSeatId]?.name || ''}…`;
    }
  },
});

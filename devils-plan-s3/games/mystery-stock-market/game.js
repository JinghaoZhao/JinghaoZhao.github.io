/**
 * Mystery Stock Market (神秘交易所 / 미스터리 거래소) — Interactive Terminal UI
 * Day 2 Main Match · The Devil's Plan Season 3: Dead Again
 * Wave 2: Motion.patchDOM + Motion.delegate + animateNumber + setProgress + Dual-Theme Canvas
 */

import { mountGame, SFX, I18n, UI, Motion, Theme } from '../../shared/sdk.js';
import {
  GameRules,
  STOCKS,
  STOCK_IDS,
  STOCK_MAP,
  PRIZE_TARGET_KRW,
  PIECE_CASH_VALUE,
  START_PRICE,
  ALT_LOGO_PATH_24,
  ALT_LOGO_PATH_12,
} from './rules.js';

const RULES_SUMMARY = {
  zh: `### 游戏目标
在 **24 回合**（或 12 回合极速模式）内，用初始 **₩100,000** 现金自由买卖 **7 只神秘股票**，破译每只股票背后隐藏的涨跌公式，成为最终总资产第 1 名！若任意玩家总资产突破 **₩10,000,000（一千万）**，全场将立即解锁 **1 枚奖金徽章（+1亿韩元）**！

### 核心规则
- **起步与底价**：7 只股票初始股价均为 **₩10,000**，股价最低下限 **₩100**（永不归零），不可做空。
- **同轮资金周转**：同一回合内你可以先卖出旧持股，再用所得现金买入其他股票，点击**锁定本轮委托**后全场同步结算下一轮开盘价。
- **规则渐进解密**：每只股票的涨跌公式开局均被机密涂黑，在 **第 5 / 10 / 15 回合** 逐步揭示线索，**第 20 回合** 全部 100% 公开（12 回合模式对应 R3 / R6 / R8 / R10）。
- **Secret 隐匿功能**：每回合可对 **1 只股票** 挂上 \`🔒 SECRET\`，隐藏你对该股的交易去向并掩蔽该股当轮公开持股量——而且它会暗中触发某只神股的复利暴涨条件！
- **恶魔碎片商店**：每位玩家初始拥有 **3 枚恶魔碎片**：
  - 消耗 **1 碎片** → 提前私密解密指定股票的下一阶段公式线索；
  - 消耗 **1 碎片** → 立即兑换 **₩10,000** 现金。`,
  en: `### Objective
Trade **7 mysterious stocks** across **24 rounds** (or 12-round Fast Mode) starting with **₩100,000** cash. Decode the hidden price-movement algorithms behind each ticker to finish #1 in total net worth! If ANY trader reaches **₩10,000,000**, a **Prize Token (+₩100M)** is unlocked!

### Core Mechanics
- **Pricing & Floor**: All 7 stocks open at **₩10,000** with a hard floor of **₩100** (no short-selling).
- **Same-Round Capital Rotation**: Sell existing shares and immediately deploy the proceeds into other stocks within the same round's order slip, then click **Lock Orders** for simultaneous settlement.
- **Progressive Declassification**: Hidden formula dossiers start heavily redacted and automatically declassify at **R5 / R10 / R15**, reaching 100% full reveal at **R20** (R3/R6/R8/R10 in 12-round mode).
- **SECRET Trade Lock**: Arm \`🔒 SECRET\` on 1 stock per round to mask your trade & that stock's public market holdings — and secretly trigger a legendary compounding formula!
- **Devil's Piece Shop** (3 starting Pieces):
  - Spend **1 Piece** → Privately declassify the next formula tier for any stock;
  - Spend **1 Piece** → Convert into **+₩10,000** instant cash.`,
};

// High-contrast stock palette for Light Porcelain Studio
const LIGHT_STOCK_COLORS = {
  banger: '#0284c7',
  mucho: '#d97706',
  analog: '#7c3aed',
  coyo: '#059669',
  open: '#db2777',
  alt: '#b45309',
  notsogood: '#dc2626',
};

function stockAccentColor(stockId) {
  if (Theme.get() === 'light' && LIGHT_STOCK_COLORS[stockId]) {
    return LIGHT_STOCK_COLORS[stockId];
  }
  return STOCK_MAP[stockId]?.color || '#d4af6a';
}

// Local UI draft & animation tracking state
const uiState = {
  draftKey: '',
  deltas: Object.fromEntries(STOCK_IDS.map((id) => [id, 0])),
  secretStockId: null,
  focusStockId: null,
  selectedDossierId: 'banger',
  lastSettledRoundSeen: 0,
  hoverRoundIdx: null,
  lastRenderCtx: null,
  lastContainer: null,
  delegatedRoot: null,
  prevNums: {
    cash: null,
    stockVal: null,
    netWorth: null,
    prices: {},
  },
};

function resetDraft(key) {
  uiState.draftKey = key;
  uiState.deltas = Object.fromEntries(STOCK_IDS.map((id) => [id, 0]));
  uiState.secretStockId = null;
}

function fmtKRW(n) {
  if (n == null) return '—';
  return `₩${Math.round(n).toLocaleString('en-US')}`;
}

function fmtShortKRW(n) {
  if (n >= 1000000) return `₩${(n / 1000000).toFixed(2)}M`;
  if (n >= 10000) return `₩${(n / 1000).toFixed(1)}k`;
  return `₩${Math.round(n)}`;
}

function renderSparklineSvg(values, color) {
  const w = 56;
  const h = 26;
  if (!values || values.length < 2) {
    return `<svg class="msm-sparkline" viewBox="0 0 ${w} ${h}"><line x1="2" y1="${h / 2}" x2="${w - 2}" y2="${h / 2}" stroke="${color}" stroke-width="1.6" stroke-opacity="0.55"/></svg>`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(100, max - min);
  const pts = values
    .map((v, i) => {
      const x = 2 + (i / (values.length - 1)) * (w - 4);
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const lastX = w - 2;
  const lastY = h - 3 - ((values[values.length - 1] - min) / span) * (h - 6);
  return `
    <svg class="msm-sparkline" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <polyline fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.3" fill="${color}" />
    </svg>
  `;
}

function renderRedactedSegments(segments) {
  return segments
    .map((seg) => {
      if (seg.text !== null) {
        return `<span>${UI.escapeHtml(seg.text)}</span>`;
      }
      const px = Math.max(24, Math.min(115, (seg.len || 4) * 9));
      return `<span class="msm-redact" style="width:${px}px;" title="CLASSIFIED">&nbsp;</span>`;
    })
    .join('');
}

/**
 * Draw high-DPI multi-stock curve canvas chart — dual-theme aware (Dark Obsidian & Light Porcelain).
 */
function drawMultiStockChart(canvas, tooltipEl, state, lang) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 20) return;

  const isLight = Theme.get() === 'light';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = rect.width;
  const H = rect.height;
  const padL = 54;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const history = state.priceHistory || [];
  const totalSlots = state.totalRounds;
  const focus = uiState.focusStockId;

  const stocksToScale = focus ? [focus] : STOCK_IDS;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const h of history) {
    for (const sid of stocksToScale) {
      const v = h[sid] ?? START_PRICE;
      if (v < minY) minY = v;
      if (v > maxY) maxY = v;
    }
  }
  if (!Number.isFinite(minY)) {
    minY = 6000;
    maxY = 14000;
  }
  const margin = Math.max(1500, (maxY - minY) * 0.14);
  minY = Math.max(0, Math.floor((minY - margin) / 500) * 500);
  maxY = Math.ceil((maxY + margin) / 500) * 500;
  const ySpan = Math.max(1000, maxY - minY);

  const xOf = (idx) => padL + (idx / Math.max(1, totalSlots)) * plotW;
  const yOf = (val) => padT + plotH - ((val - minY) / ySpan) * plotH;

  ctx.clearRect(0, 0, W, H);

  // Dual-theme chart palette
  const gridStroke = isLight ? 'rgba(20, 23, 31, 0.085)' : 'rgba(255, 255, 255, 0.065)';
  const axisLabel = isLight ? '#52596b' : '#7b8498';
  const refLine = isLight ? 'rgba(154, 110, 31, 0.34)' : 'rgba(212, 175, 106, 0.26)';
  const milestoneLine = isLight ? 'rgba(154, 110, 31, 0.24)' : 'rgba(212, 175, 106, 0.20)';
  const milestoneText = isLight ? '#9a6e1f' : '#d4af6a';
  const xTickText = isLight ? '#646c80' : '#5e677d';
  const crosshairColor = isLight ? 'rgba(154, 110, 31, 0.65)' : 'rgba(242, 213, 145, 0.55)';
  const logoStroke = isLight ? 'rgba(180, 83, 9, 0.34)' : 'rgba(234, 179, 8, 0.30)';
  const logoLabel = isLight ? 'rgba(154, 83, 9, 0.80)' : 'rgba(234, 179, 8, 0.62)';

  // Horizontal grid lines + Y labels
  ctx.strokeStyle = gridStroke;
  ctx.lineWidth = 1;
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = axisLabel;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const gridRows = 4;
  for (let i = 0; i <= gridRows; i++) {
    const val = minY + (ySpan * i) / gridRows;
    const y = yOf(val);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.fillText(fmtShortKRW(val), padL - 7, y);
  }

  // Baseline 10,000 dashed reference line
  if (START_PRICE >= minY && START_PRICE <= maxY) {
    const y10k = yOf(START_PRICE);
    ctx.save();
    ctx.strokeStyle = refLine;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y10k);
    ctx.lineTo(W - padR, y10k);
    ctx.stroke();
    ctx.restore();
  }

  // Vertical clue unlock milestone markers
  const sched = state.unlockSchedule || [1, 5, 10, 15, 20];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let r = 0; r <= totalSlots; r++) {
    const isMilestone = sched.includes(r) && r > 1;
    const x = xOf(r);
    if (isMilestone) {
      ctx.save();
      ctx.strokeStyle = milestoneLine;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
      ctx.restore();
    }
    if (r === 0 || r === totalSlots || r % (totalSlots <= 12 ? 2 : 4) === 0 || isMilestone) {
      ctx.fillStyle = isMilestone ? milestoneText : xTickText;
      ctx.fillText(`R${r}`, x, padT + plotH + 7);
    }
  }

  // Alt Enter Logo Silhouette guide once revealed
  if (state.altLogoRevealed && (focus === 'alt' || state.phase !== 'trading')) {
    const baseLogo = totalSlots <= 12 ? ALT_LOGO_PATH_12 : ALT_LOGO_PATH_24;
    const logoPts = baseLogo.map((v, i) =>
      i === 0 ? START_PRICE : state.altLogoInverted ? Math.max(2400, Math.round((30000 - v) / 100) * 100) : v
    );
    ctx.save();
    ctx.strokeStyle = logoStroke;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    logoPts.forEach((val, idx) => {
      const x = xOf(idx);
      const y = yOf(val);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = logoLabel;
    ctx.font = '700 10px "Cinzel", serif';
    ctx.textAlign = 'right';
    ctx.fillText('◆ MYSTERY EXCHANGE LOGO SILHOUETTE (ALT)', W - padR - 4, padT + 6);
    ctx.restore();
  }

  // Draw stock price lines
  const drawOrder = focus
    ? [...STOCK_IDS.filter((id) => id !== focus), focus]
    : STOCK_IDS;

  for (const sid of drawOrder) {
    const color = stockAccentColor(sid);
    const isFocused = !focus || focus === sid;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = isFocused ? 0.96 : isLight ? 0.22 : 0.16;
    ctx.lineWidth = focus === sid ? 2.8 : isFocused ? 2.1 : 1.1;
    if (isFocused && !isLight) {
      ctx.shadowColor = color;
      ctx.shadowBlur = focus === sid ? 10 : 4;
    }
    ctx.beginPath();
    history.forEach((snap, idx) => {
      const x = xOf(idx);
      const y = yOf(snap[sid] ?? START_PRICE);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (history.length > 0 && isFocused) {
      const lastIdx = history.length - 1;
      const lx = xOf(lastIdx);
      const ly = yOf(history[lastIdx][sid] ?? START_PRICE);
      ctx.beginPath();
      ctx.arc(lx, ly, focus === sid ? 4.2 : 3.0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }

  // Interactive hover crosshair
  if (uiState.hoverRoundIdx != null && uiState.hoverRoundIdx < history.length) {
    const idx = uiState.hoverRoundIdx;
    const cx = xOf(idx);
    ctx.save();
    ctx.strokeStyle = crosshairColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, padT);
    ctx.lineTo(cx, padT + plotH);
    ctx.stroke();
    ctx.restore();

    if (tooltipEl) {
      const snap = history[idx];
      const rows = (focus ? [focus] : STOCK_IDS)
        .map((sid) => {
          const st = STOCK_MAP[sid];
          return `<div style="display:flex;justify-content:space-between;gap:12px;">
            <span style="color:${stockAccentColor(sid)};font-weight:700;">${st.ticker}</span>
            <span>${fmtKRW(snap[sid])}</span>
          </div>`;
        })
        .join('');
      tooltipEl.innerHTML = `<div style="color:var(--dp-brass-bright);font-weight:700;margin-bottom:4px;">${
        idx === 0 ? (lang === 'zh' ? '开盘 R0' : 'Open R0') : `R${idx}`
      }</div>${rows}`;
      tooltipEl.classList.add('is-visible');
    }
  } else if (tooltipEl) {
    tooltipEl.classList.remove('is-visible');
  }
}

function computeDraftMetrics(me, prices) {
  if (!me) return { netCost: 0, postCash: 0, buyCount: 0, sellCount: 0, lines: [] };
  let netCost = 0;
  let buyCount = 0;
  let sellCount = 0;
  const lines = [];
  for (const sid of STOCK_IDS) {
    const d = uiState.deltas[sid] || 0;
    if (d !== 0) {
      netCost += d * prices[sid];
      if (d > 0) buyCount += d;
      if (d < 0) sellCount += Math.abs(d);
      lines.push({ stockId: sid, delta: d, subtotal: d * prices[sid] });
    }
  }
  return {
    netCost,
    postCash: me.cash - netCost,
    buyCount,
    sellCount,
    lines,
  };
}

function bindDelegatedEvents(container) {
  if (uiState.delegatedRoot === container) return;
  uiState.delegatedRoot = container;

  const getCtx = () => uiState.lastRenderCtx;
  const rerender = () => {
    if (uiState.lastContainer && uiState.lastRenderCtx) {
      renderTerminal(uiState.lastContainer, uiState.lastRenderCtx);
    }
  };

  // Pointer hover crosshair on persistent <canvas>
  Motion.delegate(
    container,
    'pointermove',
    '#msm-chart-canvas',
    (e, canvas) => {
      const ctx = getCtx();
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const padL = 54;
      const padR = 16;
      const relX = (e.clientX - rect.left - padL) / Math.max(1, rect.width - padL - padR);
      const idx = Math.round(relX * ctx.state.totalRounds);
      const tooltipEl = container.querySelector('#msm-chart-tooltip');
      if (idx >= 0 && idx < ctx.state.priceHistory.length) {
        if (uiState.hoverRoundIdx !== idx) {
          uiState.hoverRoundIdx = idx;
          drawMultiStockChart(canvas, tooltipEl, ctx.state, ctx.lang);
        }
      } else if (uiState.hoverRoundIdx !== null) {
        uiState.hoverRoundIdx = null;
        drawMultiStockChart(canvas, tooltipEl, ctx.state, ctx.lang);
      }
    },
    'msm-canvas-move'
  );

  Motion.delegate(
    container,
    'pointerout',
    '#msm-chart-canvas',
    (_e, canvas) => {
      const ctx = getCtx();
      if (!ctx || uiState.hoverRoundIdx === null) return;
      uiState.hoverRoundIdx = null;
      const tooltipEl = container.querySelector('#msm-chart-tooltip');
      drawMultiStockChart(canvas, tooltipEl, ctx.state, ctx.lang);
    },
    'msm-canvas-leave'
  );

  // Chart Focus Pills
  Motion.delegate(
    container,
    'click',
    '[data-chart-focus]',
    (_e, btn) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('click');
      const target = btn.dataset.chartFocus;
      uiState.focusStockId = target === 'ALL' ? null : target;
      if (target !== 'ALL') uiState.selectedDossierId = target;
      rerender();
    },
    'msm-chart-focus'
  );

  // Piece Shop: Declassify inline dossier button (must run before card focus)
  const doBuyIntel = async (stockId, triggerEl) => {
    const ctx = getCtx();
    if (!ctx) return;
    const res = await ctx.dispatch({ type: 'BUY_INTEL', payload: { stockId } });
    if (res.ok) {
      ctx.sfx.play('reveal');
      uiState.selectedDossierId = stockId;
      ctx.ui.toast(
        ctx.lang === 'zh'
          ? `🔓 消耗 1 碎片 → 解密【${STOCK_MAP[stockId].name.zh}】下一阶公式！`
          : `🔓 Spent 1 Piece → Declassified next tier for ${STOCK_MAP[stockId].name.en}!`,
        'success'
      );
    } else {
      Motion.shake(triggerEl);
      ctx.ui.toast(res.reason, 'error');
    }
  };

  Motion.delegate(
    container,
    'click',
    '[data-buy-intel]',
    (e, btn) => {
      e.stopPropagation();
      doBuyIntel(btn.dataset.buyIntel, btn);
    },
    'msm-buy-intel-inline'
  );

  // Click stock name or dossier card to focus
  Motion.delegate(
    container,
    'click',
    '[data-focus-stock], [data-dossier]',
    (e, el) => {
      if (e.target.closest('button')) return;
      const ctx = getCtx();
      if (!ctx) return;
      const sid = el.dataset.focusStock || el.dataset.dossier;
      uiState.selectedDossierId = sid;
      uiState.focusStockId = uiState.focusStockId === sid ? null : sid;
      ctx.sfx.play('click');
      rerender();
    },
    'msm-focus-stock'
  );

  // Trade ± buttons
  Motion.delegate(
    container,
    'click',
    '[data-trade]',
    (_e, btn) => {
      const ctx = getCtx();
      if (!ctx) return;
      const { state, sfx } = ctx;
      const me = state.me;
      const canAct = Boolean(me && state.phase === 'trading' && !me.submitted);
      if (!canAct || !me) return;

      const sid = btn.dataset.trade;
      const step = btn.dataset.step;
      const price = state.prices[sid];
      const owned = me.holdings[sid] || 0;
      const curDelta = uiState.deltas[sid] || 0;
      const curMetrics = computeDraftMetrics(me, state.prices);

      let add = 0;
      if (step === 'max') {
        add = price > 0 ? Math.floor(curMetrics.postCash / price) : 0;
      } else {
        add = Number(step);
      }

      const nextDelta = curDelta + add;
      if (owned + nextDelta < 0 || curMetrics.postCash - add * price < 0) {
        Motion.shake(btn);
        return;
      }

      uiState.deltas[sid] = nextDelta;
      uiState.selectedDossierId = sid;
      sfx.play('click');
      rerender();
    },
    'msm-trade'
  );

  // Secret lock toggle
  Motion.delegate(
    container,
    'click',
    '[data-secret]',
    (_e, btn) => {
      const ctx = getCtx();
      if (!ctx) return;
      const me = ctx.state.me;
      if (!me || ctx.state.phase !== 'trading' || me.submitted) return;
      const sid = btn.dataset.secret;
      uiState.secretStockId = uiState.secretStockId === sid ? null : sid;
      ctx.sfx.play('bid');
      rerender();
    },
    'msm-secret'
  );

  // Clear order slip
  Motion.delegate(
    container,
    'click',
    '#msm-reset-slip',
    () => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('click');
      resetDraft(uiState.draftKey);
      rerender();
    },
    'msm-reset-slip'
  );

  // Submit / Lock Order
  Motion.delegate(
    container,
    'click',
    '#msm-submit-order',
    async (_e, btn) => {
      const ctx = getCtx();
      if (!ctx) return;
      const me = ctx.state.me;
      if (!me || ctx.state.phase !== 'trading' || me.submitted) return;
      ctx.sfx.play('bid');
      const res = await ctx.dispatch({
        type: 'SUBMIT_ORDER',
        payload: {
          deltas: { ...uiState.deltas },
          secretStockId: uiState.secretStockId,
        },
      });
      if (!res.ok) {
        Motion.shake(btn);
        ctx.ui.toast(res.reason || 'Order rejected', 'error');
      }
    },
    'msm-submit-order'
  );

  // Piece Shop: Buy +10,000 KRW Cash
  Motion.delegate(
    container,
    'click',
    '#msm-buy-cash',
    async (_e, btn) => {
      const ctx = getCtx();
      if (!ctx) return;
      const res = await ctx.dispatch({ type: 'BUY_CASH', payload: {} });
      if (res.ok) {
        ctx.sfx.play('pieceGain');
        ctx.ui.toast(
          ctx.lang === 'zh'
            ? `消耗 1 碎片 → 兑换 +${fmtKRW(PIECE_CASH_VALUE)} 现金`
            : `Spent 1 Piece → +${fmtKRW(PIECE_CASH_VALUE)} Cash`,
          'success'
        );
      } else {
        Motion.shake(btn);
        ctx.ui.toast(res.reason, 'error');
      }
    },
    'msm-buy-cash'
  );

  // Piece Shop: Declassify selected dossier (top button)
  Motion.delegate(
    container,
    'click',
    '#msm-buy-intel-top',
    (_e, btn) => {
      doBuyIntel(uiState.selectedDossierId, btn);
    },
    'msm-buy-intel-top'
  );

  // Conclude Match from Closing Bell
  Motion.delegate(
    container,
    'click',
    '#msm-conclude-btn',
    async () => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.sfx.play('victory');
      await ctx.dispatch({ type: 'CONCLUDE_MATCH', payload: {} });
    },
    'msm-conclude'
  );
}

function renderTerminal(container, ctx) {
  const { state, mySeatId, lang, sfx, log } = ctx;
  uiState.lastRenderCtx = ctx;
  uiState.lastContainer = container;
  bindDelegatedEvents(container);

  // Reset draft when round or active viewer changes
  const draftKey = `${state.round}:${mySeatId || 'spec'}:${state.phase}`;
  if (uiState.draftKey !== draftKey) {
    resetDraft(draftKey);
  }

  // Reset trackers on fresh rematch
  if (state.round === 1 && state.roundHistory.length === 0) {
    uiState.lastSettledRoundSeen = 0;
    uiState.prevNums = { cash: null, stockVal: null, netWorth: null, prices: {} };
  }

  // Dramatic SFX & feed log once per newly settled round
  const latestRoundRec = state.roundHistory[state.roundHistory.length - 1] || null;
  if (latestRoundRec && latestRoundRec.round > uiState.lastSettledRoundSeen) {
    uiState.lastSettledRoundSeen = latestRoundRec.round;
    if (state.justUnlockedTier) {
      sfx.play('reveal');
      log(
        lang === 'zh'
          ? `🔓 第 ${state.round} 回合机密档案解密升级！`
          : `🔓 Round ${state.round}: Classified formula dossier tier unlocked!`,
        'alert'
      );
    } else if (latestRoundRec.topLoser && latestRoundRec.topLoser.pct <= -18) {
      sfx.play('eliminate');
    } else {
      sfx.play('pieceGain');
    }
    if (state.prizeTokenUnlocked && latestRoundRec.round === state.round - 1) {
      log(
        lang === 'zh'
          ? '🏆 突破 ₩10,000,000！全场赢取 1 枚奖金徽章（+1亿韩元）！'
          : '🏆 ₩10,000,000 BREACHED! Prize Token (+₩100M) unlocked!',
        'alert'
      );
    }
  }

  const me = state.me;
  const isTrading = state.phase === 'trading';
  const isClosing = state.phase === 'closing_bell' || state.phase === 'ended';
  const canAct = Boolean(me && isTrading && !me.submitted);
  const metrics = computeDraftMetrics(me, state.prices);

  const prevSnap =
    state.priceHistory.length >= 2
      ? state.priceHistory[state.priceHistory.length - 2]
      : null;

  // Ticker tape items (duplicated for seamless marquee)
  const tickerCore = STOCKS.map((st) => {
    const price = state.prices[st.id];
    const prev = prevSnap ? prevSnap[st.id] : price;
    const pct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
    const cls = pct > 0.05 ? 'msm-tick-up' : pct < -0.05 ? 'msm-tick-down' : 'msm-tick-flat';
    const arrow = pct > 0.05 ? '▲' : pct < -0.05 ? '▼' : '▪';
    return `<span class="msm-tick-item">
      <span class="msm-tick-code" style="color:${stockAccentColor(st.id)};">${st.ticker}</span>
      <span>${fmtKRW(price)}</span>
      <span class="${cls}">${arrow}${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%</span>
    </span>`;
  }).join('');
  const prizeTag = `<span class="msm-tick-item"><span class="msm-tick-prize">${
    state.prizeTokenUnlocked
      ? lang === 'zh'
        ? '🏆 奖金徽章已解锁 (+1亿韩元)'
        : '🏆 PRIZE TOKEN UNLOCKED (+₩100M)'
      : lang === 'zh'
      ? '🎯 奖金徽章目标: ₩10,000,000'
      : '🎯 PRIZE TOKEN TARGET: ₩10,000,000'
  }</span></span>`;
  const tickerHtml = `${tickerCore}${prizeTag}${tickerCore}${prizeTag}`;

  const myWorth = me ? me.netWorth : 0;
  const stockVal = me ? myWorth - me.cash : 0;
  const prizeRatio = Math.max(0.02, Math.min(1, myWorth / PRIZE_TARGET_KRW));
  const prizePct = Math.min(100, (myWorth / PRIZE_TARGET_KRW) * 100);
  const sched = state.unlockSchedule || [1, 5, 10, 15, 20];

  // Closing Bell Market Summary Banner
  let bellBannerHtml = '';
  if (latestRoundRec) {
    const g = latestRoundRec.topGainer;
    const l = latestRoundRec.topLoser;
    const isCrash = l && l.pct <= -15;
    bellBannerHtml = `
      <div class="msm-bell-banner ${isCrash ? 'is-crash' : ''}" data-motion-key="msm-bell-r${latestRoundRec.round}">
        <div class="msm-bell-left">
          <span class="dp-badge ${state.justUnlockedTier ? '' : 'dp-badge-emerald'}">
            ${lang === 'zh' ? `第 ${latestRoundRec.round} 轮收盘铃` : `R${latestRoundRec.round} CLOSING BELL`}
          </span>
          <span>
            ${
              state.justUnlockedTier
                ? lang === 'zh'
                  ? '🔓 机密公式档案已自动撕开新一阶涂黑条！'
                  : '🔓 Classified formula dossiers declassified a new tier!'
                : lang === 'zh'
                ? '全市场撮合结算完成，最新开盘价已刷新。'
                : 'Simultaneous orders settled — live market prices updated.'
            }
          </span>
        </div>
        <div class="msm-bell-chips">
          ${
            g
              ? `<span class="msm-tick-up">▲ ${STOCK_MAP[g.stockId].ticker} ${g.pct >= 0 ? '+' : ''}${g.pct.toFixed(1)}%</span>`
              : ''
          }
          ${
            l
              ? `<span class="msm-tick-down">▼ ${STOCK_MAP[l.stockId].ticker} ${l.pct >= 0 ? '+' : ''}${l.pct.toFixed(1)}%</span>`
              : ''
          }
          ${
            latestRoundRec.secretUsedCount > 0
              ? `<span style="color:var(--msm-secret-ink);">🔒 SECRET ×${latestRoundRec.secretUsedCount}</span>`
              : ''
          }
        </div>
      </div>
    `;
  }

  // Closing Bell Full Leaderboard Panel
  let closingPanelHtml = '';
  if (isClosing) {
    const sorted = [...state.players].sort((a, b) => (b.netWorth ?? 0) - (a.netWorth ?? 0));
    closingPanelHtml = `
      <section class="msm-closing-panel" data-motion-key="msm-closing">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <span class="dp-badge">${lang === 'zh' ? '终盘结算 · 全部公式已公开' : 'FINAL BELL · ALL FORMULAS DECLASSIFIED'}</span>
            <h2 style="margin:6px 0 2px;font-family:var(--dp-font-display);font-size:22px;color:var(--dp-brass-bright);">
              ${lang === 'zh' ? '神秘交易所 · 最终资产清算榜' : 'Mystery Stock Market · Final Liquidation'}
            </h2>
            <p style="margin:0;font-size:13px;color:var(--dp-ink-muted);">
              ${
                state.prizeTokenUnlocked
                  ? lang === 'zh'
                    ? '🏆 达成 ₩10,000,000 奇迹！全体赢得 1 枚奖金徽章（+1亿韩元）！'
                    : '🏆 ₩10,000,000 milestone conquered! Prize Token (+₩100M) awarded!'
                  : lang === 'zh'
                  ? '查看下方完整走势与 7 条真实公式（注意 ALT 娱乐切换的交易所 Logo 轮廓！）'
                  : 'Inspect the complete 7-stock curve & decoded formulas below (check ALT Enter Logo contour!).'
              }
            </p>
          </div>
          ${
            state.phase === 'closing_bell'
              ? `<button type="button" class="dp-btn dp-btn-primary" id="msm-conclude-btn" style="min-height:44px;padding:0 22px;">
                  ${lang === 'zh' ? '公布最终裁决 →' : 'Reveal Final Verdict →'}
                </button>`
              : ''
          }
        </div>
        <div class="msm-closing-grid">
          ${sorted
            .map((p, idx) => {
              const isWin = idx === 0;
              const isElim = idx === sorted.length - 1 && sorted.length > 2;
              return `
                <div class="msm-rank-card ${isWin ? 'is-winner' : ''} ${isElim ? 'is-eliminated' : ''}" data-motion-key="rank-${UI.escapeHtml(p.seatId)}">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:700;">
                      <span style="color:var(--dp-brass);margin-right:6px;">#${idx + 1}</span>
                      ${UI.escapeHtml(p.name)}
                    </span>
                    <span style="font-size:11px;color:${isWin ? 'var(--dp-brass-bright)' : isElim ? 'var(--msm-down)' : 'var(--dp-ink-faint)'};">
                      ${
                        isWin
                          ? lang === 'zh'
                            ? '★ 联盟徽章'
                            : '★ ALLIANCE'
                          : isElim
                          ? lang === 'zh'
                            ? '✕ 淘汰线'
                            : '✕ ELIM'
                          : UI.renderPieceBadge(p.pieces)
                      }
                    </span>
                  </div>
                  <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:18px;font-weight:700;color:${
                    p.achievedPrizeTarget ? 'var(--msm-up)' : 'var(--dp-ink)'
                  };">
                    ${fmtKRW(p.netWorth)}
                  </div>
                  <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:11px;color:var(--dp-ink-muted);">
                    ${lang === 'zh' ? '现金' : 'Cash'} ${fmtKRW(p.cash)} · ${lang === 'zh' ? '股票' : 'Stocks'} ${fmtKRW((p.netWorth ?? 0) - (p.cash ?? 0))}
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  // Build 7 Stock Rows (all keyed via data-motion-key)
  const stockRowsHtml = STOCKS.map((st) => {
    const sid = st.id;
    const color = stockAccentColor(sid);
    const price = state.prices[sid];
    const prev = prevSnap ? prevSnap[sid] : price;
    const diff = price - prev;
    const pct = prev > 0 ? (diff / prev) * 100 : 0;
    const deltaClass = diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : 'is-flat';
    const flashClass =
      latestRoundRec && latestRoundRec.round === state.round - 1
        ? pct >= 10
          ? 'is-surge'
          : pct <= -10
          ? 'is-crash'
          : ''
        : '';
    const sparkVals = state.priceHistory.slice(-12).map((h) => h[sid] ?? START_PRICE);
    const owned = me ? me.holdings[sid] || 0 : 0;
    const draftDelta = uiState.deltas[sid] || 0;
    const postOwned = owned + draftDelta;
    const mktHoldings = state.lastTotalHoldingsPublic[sid];
    const wasSecret = state.lastSecretStocks.includes(sid);
    const isSecretArmed = uiState.secretStockId === sid;
    const isSelected = uiState.selectedDossierId === sid;

    const maxBuyable = canAct && price > 0 ? Math.floor(metrics.postCash / price) : 0;
    const canSell1 = canAct && postOwned >= 1;
    const canSell5 = canAct && postOwned >= 5;
    const canBuy1 = canAct && maxBuyable >= 1;
    const canBuy5 = canAct && maxBuyable >= 5;

    return `
      <div class="msm-stock-row ${isSelected ? 'is-selected' : ''} ${flashClass}" style="--stock-color:${color};" data-stock-row="${sid}" data-motion-key="stock-row-${sid}">
        <div class="msm-stock-id" data-focus-stock="${sid}">
          <div class="msm-stock-top">
            <span class="msm-ticker-tag">${st.ticker}</span>
            <span class="msm-stock-name">${UI.escapeHtml(I18n.t(st.name))}</span>
          </div>
          <div class="msm-stock-meta">
            <span>${UI.escapeHtml(st.name.ko)}</span>
            <span>·</span>
            <span>${UI.escapeHtml(I18n.t(st.sector))}</span>
          </div>
        </div>

        ${renderSparklineSvg(sparkVals, color)}

        <div class="msm-price-cell">
          <div class="msm-price-now dp-tabular" id="msm-price-${sid}">${fmtKRW(price)}</div>
          <div class="msm-price-delta ${deltaClass}">
            ${diff > 0 ? '▲' : diff < 0 ? '▼' : '—'} ${diff >= 0 ? '+' : ''}${diff.toLocaleString('en-US')} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)
          </div>
        </div>

        <div class="msm-pos-cell">
          <div>
            <span class="msm-pos-owned">${owned}</span>${lang === 'zh' ? '股' : ' sh'}
            ${
              draftDelta !== 0
                ? `<span class="msm-pos-delta ${draftDelta > 0 ? 'is-buy' : 'is-sell'}">${draftDelta > 0 ? '+' : ''}${draftDelta}</span>`
                : ''
            }
          </div>
          <div class="msm-mkt-badge ${wasSecret ? 'is-secret' : ''}">
            ${
              wasSecret || mktHoldings == null
                ? lang === 'zh'
                  ? '全市场 🔒 ???'
                  : 'Mkt 🔒 ???'
                : lang === 'zh'
                ? `全市场 ${mktHoldings}股`
                : `Mkt ${mktHoldings} sh`
            }
          </div>
        </div>

        <div class="msm-trade-ctrls">
          <button type="button" class="msm-qty-btn is-sell" data-trade="${sid}" data-step="-5" ${canSell5 ? '' : 'disabled'}>-5</button>
          <button type="button" class="msm-qty-btn is-sell" data-trade="${sid}" data-step="-1" ${canSell1 ? '' : 'disabled'}>-1</button>
          <button type="button" class="msm-qty-btn is-buy" data-trade="${sid}" data-step="1" ${canBuy1 ? '' : 'disabled'}>+1</button>
          <button type="button" class="msm-qty-btn is-buy" data-trade="${sid}" data-step="5" ${canBuy5 ? '' : 'disabled'}>+5</button>
          <button type="button" class="msm-qty-btn is-buy" data-trade="${sid}" data-step="max" ${canBuy1 ? '' : 'disabled'}>MAX</button>
          <button type="button" class="msm-secret-btn ${isSecretArmed ? 'is-armed' : ''}" data-secret="${sid}" ${canAct ? '' : 'disabled'} title="${
            lang === 'zh' ? '本轮对该股激活 Secret 隐匿交易' : 'Arm SECRET hidden trade lock on this stock'
          }">🔒${isSecretArmed ? ' ON' : ''}</button>
        </div>
      </div>
    `;
  }).join('');

  // Build Formula Dossier Cards
  const dossierHtml = STOCKS.map((st) => {
    const color = stockAccentColor(st.id);
    const clue = state.clues[st.id];
    const segs = lang === 'en' ? clue.en : clue.zh;
    const canDeclassify = Boolean(me && isTrading && me.pieces >= 1 && clue.tier < 4);
    const isSelected = uiState.selectedDossierId === st.id;
    return `
      <div class="msm-clue-card ${isSelected ? 'is-selected' : ''} ${clue.unlocked ? 'is-unlocked' : ''}" style="--stock-color:${color};" data-dossier="${st.id}" data-motion-key="clue-${st.id}">
        <div class="msm-clue-head">
          <span style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;">
            <span class="msm-dot" style="background:${color};"></span>
            <span>${st.ticker} · ${UI.escapeHtml(I18n.t(st.name))}</span>
          </span>
          <span style="display:flex;align-items:center;gap:6px;">
            <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:10.5px;color:${clue.unlocked ? 'var(--msm-up)' : 'var(--dp-ink-faint)'};">
              ${clue.unlocked ? (lang === 'zh' ? '100% 解密' : 'DECLASSIFIED') : `LV.${clue.tier}/4`}
            </span>
            ${
              clue.tier < 4 && me && isTrading
                ? `<button type="button" class="msm-intel-btn" data-buy-intel="${st.id}" ${canDeclassify ? '' : 'disabled'}>◆1 ${
                    lang === 'zh' ? '解密' : 'Decode'
                  }</button>`
                : ''
            }
          </span>
        </div>
        <div class="msm-clue-body">${renderRedactedSegments(segs)}</div>
      </div>
    `;
  }).join('');

  // Build Last Round Market Tape
  const tapeItems = latestRoundRec?.publicTrades || [];
  const nameOf = (sid) => state.players.find((p) => p.seatId === sid)?.name || sid;
  const tapeHtml = tapeItems.length
    ? tapeItems
        .map((tr) => {
          const st = STOCK_MAP[tr.stockId];
          if (tr.secret) {
            return `<span class="msm-tape-pill is-secret">🔒 [REDACTED] ${st.ticker} SECRET</span>`;
          }
          const isBuy = tr.delta > 0;
          return `<span class="msm-tape-pill ${isBuy ? 'is-buy' : 'is-sell'}">
            ${UI.escapeHtml(nameOf(tr.seatId))} ${isBuy ? '+' : ''}${tr.delta} ${st.ticker}
          </span>`;
        })
        .join('')
    : `<span style="font-size:12px;color:var(--dp-ink-faint);">${
        lang === 'zh' ? '第 1 回合开盘中，尚未产生成交记录。' : 'Market open — awaiting Round 1 trade tape.'
      }</span>`;

  const lockedCount = state.players.filter((p) => p.submitted).length;

  const html = `
    <div class="msm-terminal" data-motion-key="msm-root">
      <div class="msm-ticker-wrap" data-motion-key="msm-ticker" aria-label="Live Stock Ticker">
        <div class="msm-ticker-track" data-motion-key="msm-ticker-track">${tickerHtml}</div>
      </div>

      <div class="msm-kpi-strip" data-motion-key="msm-kpis">
        <div class="msm-kpi-card" data-motion-key="kpi-round">
          <div class="msm-kpi-label">
            <span>${lang === 'zh' ? '交易回合' : 'SESSION ROUND'}</span>
            <span style="color:var(--dp-brass);">${state.formulaMode === 'shuffle' ? 'SHUFFLE' : 'CLASSIC'}</span>
          </div>
          <div class="msm-kpi-val is-gold dp-tabular">R${String(state.round).padStart(2, '0')} <span style="font-size:13px;color:var(--dp-ink-muted);">/ ${state.totalRounds}</span></div>
          <div class="msm-tier-pills" title="${lang === 'zh' ? '公式自动解密节点' : 'Auto declassification rounds'}">
            ${sched
              .slice(1)
              .map(
                (r) =>
                  `<span class="msm-tier-pill ${state.round >= r || isClosing ? 'is-unlocked' : ''}">R${r}</span>`
              )
              .join('')}
          </div>
        </div>

        <div class="msm-kpi-card" data-motion-key="kpi-cash">
          <div class="msm-kpi-label"><span>${lang === 'zh' ? '可用现金' : 'LIQUID CASH'}</span></div>
          <div class="msm-kpi-val dp-tabular" id="msm-kpi-cash">${me ? fmtKRW(me.cash) : '—'}</div>
          <div class="msm-kpi-sub">
            ${
              me && metrics.netCost !== 0
                ? `${lang === 'zh' ? '委托后' : 'After slip'}: <strong style="color:${metrics.postCash >= 0 ? 'var(--dp-ink)' : 'var(--msm-down)'};">${fmtKRW(metrics.postCash)}</strong>`
                : lang === 'zh'
                ? '起始资金 ₩100,000'
                : 'Start capital ₩100,000'
            }
          </div>
        </div>

        <div class="msm-kpi-card" data-motion-key="kpi-stock">
          <div class="msm-kpi-label"><span>${lang === 'zh' ? '股票市值' : 'PORTFOLIO VALUE'}</span></div>
          <div class="msm-kpi-val dp-tabular" id="msm-kpi-stock">${me ? fmtKRW(stockVal) : '—'}</div>
          <div class="msm-kpi-sub">${
            me
              ? `${Object.values(me.holdings).reduce((a, b) => a + b, 0)} ${lang === 'zh' ? '总持股' : 'total shares'}`
              : lang === 'zh'
              ? '观战视角'
              : 'Spectator View'
          }</div>
        </div>

        <div class="msm-kpi-card ${myWorth >= PRIZE_TARGET_KRW || state.prizeTokenUnlocked ? 'is-prize-hit' : ''}" data-motion-key="kpi-worth">
          <div class="msm-kpi-label">
            <span>${lang === 'zh' ? '我的总资产' : 'TOTAL NET WORTH'}</span>
            <span class="dp-tabular" style="color:var(--msm-up);">${prizePct.toFixed(1)}%</span>
          </div>
          <div class="msm-kpi-val is-emerald dp-tabular" id="msm-kpi-worth">${me ? fmtKRW(myWorth) : '—'}</div>
          <div class="msm-milestone-bar"><div class="msm-milestone-fill" id="msm-milestone-fill" data-motion-key="msm-milestone-fill"></div></div>
        </div>

        <div class="msm-kpi-card" data-motion-key="kpi-pieces">
          <div class="msm-kpi-label">
            <span>${lang === 'zh' ? '恶魔碎片战术店' : 'PIECE TACTICS'}</span>
            ${me ? UI.renderPieceBadge(me.pieces) : ''}
          </div>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button type="button" class="dp-btn dp-btn-sm" id="msm-buy-cash" style="flex:1;" ${
              me && isTrading && me.pieces >= 1 ? '' : 'disabled'
            }>
              ◆1 → +₩10k
            </button>
            <button type="button" class="dp-btn dp-btn-sm" id="msm-buy-intel-top" style="flex:1;" ${
              me && isTrading && me.pieces >= 1 && (state.clues[uiState.selectedDossierId]?.tier ?? 4) < 4
                ? ''
                : 'disabled'
            }>
              ◆1 ${lang === 'zh' ? '解密' : 'Intel'}
            </button>
          </div>
          <div class="msm-kpi-sub">${
            lang === 'zh'
              ? `当前选中: ${STOCK_MAP[uiState.selectedDossierId]?.ticker}`
              : `Selected: ${STOCK_MAP[uiState.selectedDossierId]?.ticker}`
          }</div>
        </div>
      </div>

      ${bellBannerHtml}
      ${closingPanelHtml}

      <div class="msm-main-grid" data-motion-key="msm-grid">
        <div class="msm-col-left" data-motion-key="msm-col-left">
          <section class="msm-chart-panel" data-motion-key="msm-chart-panel">
            <div class="msm-chart-header">
              <div class="msm-chart-title">
                <span>◈ ${lang === 'zh' ? '实时多股行情终端' : 'LIVE EXCHANGE TERMINAL'}</span>
              </div>
              <div class="msm-legend" id="msm-legend-track" data-motion-key="msm-legend">
                <button type="button" class="msm-legend-pill ${uiState.focusStockId === null ? 'is-active' : ''}" data-chart-focus="ALL" data-motion-key="leg-ALL">
                  ${lang === 'zh' ? '全部 7 股' : 'ALL 7'}
                </button>
                ${STOCKS.map(
                  (st) => `
                  <button type="button" class="msm-legend-pill ${uiState.focusStockId === st.id ? 'is-active' : ''}" data-chart-focus="${st.id}" data-motion-key="leg-${st.id}">
                    <span class="msm-dot" style="background:${stockAccentColor(st.id)};"></span>${st.ticker}
                  </button>
                `
                ).join('')}
              </div>
            </div>
            <div class="msm-canvas-box" data-motion-key="msm-canvas-box">
              <canvas id="msm-chart-canvas" data-motion-key="msm-chart-canvas"></canvas>
              <div class="msm-chart-tooltip" id="msm-chart-tooltip" data-motion-key="msm-chart-tooltip"></div>
            </div>
          </section>

          <section class="msm-board-panel" data-motion-key="msm-board">
            <div class="msm-section-head">
              <span class="msm-section-title">${lang === 'zh' ? '7 只上市股票 · 委托盘口' : '7 LISTED EQUITIES · ORDER FLOOR'}</span>
              <span style="font-size:11.5px;color:var(--dp-ink-muted);">
                ${
                  lang === 'zh'
                    ? '点击股名聚焦K线与档案 · 每轮可挂 1 个 🔒SECRET'
                    : 'Click ticker to inspect · 1 🔒SECRET lock per round'
                }
              </span>
            </div>
            <div class="msm-stock-list" data-motion-key="msm-stock-list">${stockRowsHtml}</div>
          </section>
        </div>

        <div class="msm-col-right" data-motion-key="msm-col-right">
          <section class="msm-slip-panel" data-motion-key="msm-slip">
            <div class="msm-section-head">
              <span class="msm-section-title">${lang === 'zh' ? '本轮委托单 (ORDER SLIP)' : 'ROUND ORDER SLIP'}</span>
              <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:11.5px;color:var(--dp-brass-bright);">
                ${lockedCount}/${state.players.length} ${lang === 'zh' ? '已锁定' : 'LOCKED'}
              </span>
            </div>

            ${
              !me
                ? `<p style="font-size:13px;color:var(--dp-ink-muted);margin:4px 0 0;">${
                    lang === 'zh' ? '当前为观战模式，等待交易员提交委托...' : 'Spectator mode — watching traders lock orders...'
                  }</p>`
                : me.submitted && isTrading
                ? `<div style="padding:14px;border-radius:10px;background:var(--msm-up-soft);border:1px solid var(--msm-up-border);text-align:center;">
                    <div style="font-weight:700;color:var(--msm-up);margin-bottom:4px;">✓ ${
                      lang === 'zh' ? '本轮委托已加密锁定' : 'ORDERS ENCRYPTED & LOCKED'
                    }</div>
                    <div style="font-size:12px;color:var(--dp-ink-muted);">
                      ${lang === 'zh' ? '等待其余交易员完成委托后敲响收盘铃...' : 'Awaiting remaining traders for the closing bell...'}
                    </div>
                  </div>`
                : isTrading
                ? `
                  <div class="msm-slip-summary">
                    <div class="msm-slip-stat">
                      <span>${lang === 'zh' ? '净现金变动' : 'NET CASH IMPACT'}</span>
                      <strong style="color:${metrics.netCost > 0 ? 'var(--msm-down)' : metrics.netCost < 0 ? 'var(--msm-up)' : 'var(--dp-ink)'};">
                        ${metrics.netCost === 0 ? '₩0' : metrics.netCost > 0 ? `-${fmtKRW(metrics.netCost)}` : `+${fmtKRW(-metrics.netCost)}`}
                      </strong>
                    </div>
                    <div class="msm-slip-stat">
                      <span>${lang === 'zh' ? 'SECRET 隐匿锁定' : 'SECRET LOCK'}</span>
                      <strong style="color:${uiState.secretStockId ? 'var(--msm-secret-ink)' : 'var(--dp-ink-faint)'};">
                        ${uiState.secretStockId ? `🔒 ${STOCK_MAP[uiState.secretStockId].ticker}` : lang === 'zh' ? '未启用' : 'NONE'}
                      </strong>
                    </div>
                  </div>

                  <div class="msm-slip-lines">
                    ${
                      metrics.lines.length
                        ? metrics.lines
                            .map(
                              (ln) => `
                            <div class="msm-slip-line" data-motion-key="slip-${ln.stockId}">
                              <span style="color:${stockAccentColor(ln.stockId)};font-weight:700;">
                                ${STOCK_MAP[ln.stockId].ticker} ${ln.delta > 0 ? `BUY +${ln.delta}` : `SELL ${ln.delta}`}
                              </span>
                              <span>${ln.subtotal > 0 ? `-${fmtKRW(ln.subtotal)}` : `+${fmtKRW(-ln.subtotal)}`}</span>
                            </div>
                          `
                            )
                            .join('')
                        : `<div style="font-size:12px;color:var(--dp-ink-faint);text-align:center;padding:8px 0;">${
                            lang === 'zh'
                              ? '当前空单（观望持仓）· 点击左侧 ± 按钮下单'
                              : 'HOLD position — use ± buttons on stocks to trade'
                          }</div>`
                    }
                  </div>

                  <div class="msm-slip-actions">
                    <button type="button" class="dp-btn dp-btn-ghost" id="msm-reset-slip">${lang === 'zh' ? '清空' : 'Clear'}</button>
                    <button type="button" class="dp-btn dp-btn-primary msm-lock-btn" id="msm-submit-order">
                      ${
                        metrics.lines.length === 0 && !uiState.secretStockId
                          ? lang === 'zh'
                            ? '观望并锁定本轮 →'
                            : 'Hold & Lock Round →'
                          : lang === 'zh'
                          ? '提交并锁定本轮委托 →'
                          : 'Execute & Lock Orders →'
                      }
                    </button>
                  </div>
                `
                : `<p style="font-size:12.5px;color:var(--dp-ink-muted);margin:0;">${
                    lang === 'zh' ? '交易所已收盘。' : 'Market session closed.'
                  }</p>`
            }

            <div class="msm-traders-bar">
              ${state.players
                .map(
                  (p) => `
                  <span class="msm-trader-chip ${p.submitted ? 'is-done' : ''}" data-motion-key="chip-${UI.escapeHtml(p.seatId)}">
                    ${p.submitted ? '✓ ' : '◌ '}${UI.escapeHtml(p.name)}
                  </span>
                `
                )
                .join('')}
            </div>
          </section>

          <section class="msm-dossier-panel" data-motion-key="msm-dossier">
            <div class="msm-section-head">
              <span class="msm-section-title">${lang === 'zh' ? '机密公式档案 (CLASSIFIED)' : 'CLASSIFIED FORMULA DOSSIERS'}</span>
              <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:11px;color:var(--dp-brass);">
                LV.${state.globalTier}/4
              </span>
            </div>
            <div class="msm-clue-list" data-motion-key="msm-clue-list">${dossierHtml}</div>
          </section>

          <section class="msm-tape-panel" data-motion-key="msm-tape">
            <div class="msm-section-head">
              <span class="msm-section-title">${lang === 'zh' ? '上轮公开成交流水' : 'LAST ROUND PUBLIC TAPE'}</span>
              <span class="dp-tabular" style="font-size:11px;color:var(--dp-ink-faint);">${
                latestRoundRec ? `R${latestRoundRec.round}` : '—'
              }</span>
            </div>
            <div class="msm-tape-list">${tapeHtml}</div>
          </section>
        </div>
      </div>
    </div>
  `;

  // Patch DOM in place — preserves <canvas>, focus, hover state & transitions!
  Motion.patchDOM(container, html);

  // GPU scaleX milestone progress bar
  const fillEl = container.querySelector('#msm-milestone-fill');
  if (fillEl) Motion.setProgress(fillEl, prizeRatio);

  // Sliding indicator on chart legend pills
  const legendTrack = container.querySelector('#msm-legend-track');
  const activeLegend = legendTrack?.querySelector('.msm-legend-pill.is-active');
  if (legendTrack && activeLegend) {
    Motion.slidingIndicator(legendTrack, activeLegend);
  }

  // Animate numeric counters with directional emerald/crimson tint flash on changes
  if (me) {
    const pNums = uiState.prevNums;
    if (pNums.cash !== null && pNums.cash !== me.cash) {
      Motion.animateNumber(container.querySelector('#msm-kpi-cash'), pNums.cash, me.cash, {
        duration: 260,
        format: fmtKRW,
        flash: true,
      });
    }
    if (pNums.stockVal !== null && pNums.stockVal !== stockVal) {
      Motion.animateNumber(container.querySelector('#msm-kpi-stock'), pNums.stockVal, stockVal, {
        duration: 260,
        format: fmtKRW,
        flash: true,
      });
    }
    if (pNums.netWorth !== null && pNums.netWorth !== myWorth) {
      Motion.animateNumber(container.querySelector('#msm-kpi-worth'), pNums.netWorth, myWorth, {
        duration: 280,
        format: fmtKRW,
        flash: true,
      });
    }
    pNums.cash = me.cash;
    pNums.stockVal = stockVal;
    pNums.netWorth = myWorth;
  }

  for (const sid of STOCK_IDS) {
    const prevP = uiState.prevNums.prices[sid];
    const nextP = state.prices[sid];
    if (prevP !== undefined && prevP !== nextP) {
      Motion.animateNumber(container.querySelector(`#msm-price-${sid}`), prevP, nextP, {
        duration: 260,
        format: fmtKRW,
        flash: true,
      });
    }
    uiState.prevNums.prices[sid] = nextP;
  }

  // Draw persistent multi-stock canvas chart
  const canvas = container.querySelector('#msm-chart-canvas');
  const tooltipEl = container.querySelector('#msm-chart-tooltip');
  drawMultiStockChart(canvas, tooltipEl, state, lang);
}

// Subscribe chart & legend accents to live Light <-> Dark Theme switches
Theme.onChange(() => {
  if (uiState.lastContainer && uiState.lastRenderCtx) {
    renderTerminal(uiState.lastContainer, uiState.lastRenderCtx);
  }
});

let resizeRaf = 0;
window.addEventListener('resize', () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    if (!uiState.lastContainer || !uiState.lastRenderCtx) return;
    const canvas = uiState.lastContainer.querySelector('#msm-chart-canvas');
    const tooltip = uiState.lastContainer.querySelector('#msm-chart-tooltip');
    drawMultiStockChart(canvas, tooltip, uiState.lastRenderCtx.state, uiState.lastRenderCtx.lang);
    const legendTrack = uiState.lastContainer.querySelector('#msm-legend-track');
    const activeLegend = legendTrack?.querySelector('.msm-legend-pill.is-active');
    if (legendTrack && activeLegend) Motion.slidingIndicator(legendTrack, activeLegend, { instant: true });
  });
});

mountGame({
  config: {
    id: 'mystery-stock-market',
    title: { zh: '神秘交易所', en: 'Mystery Stock Market', ko: '미스터리 거래소' },
    category: 'MAIN MATCH',
    episode: 'EP 3–4',
    minPlayers: 2,
    maxPlayers: 12,
    defaultPlayers: 6,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'totalRounds',
        label: { zh: '交易回合数', en: 'Total Rounds' },
        type: 'select',
        default: '24',
        choices: [
          { value: '24', label: { zh: '24 回合（剧集原版）', en: '24 Rounds (Show Standard)' } },
          { value: '12', label: { zh: '12 回合（极速博弈）', en: '12 Rounds (Fast Mode)' } },
        ],
      },
      {
        key: 'formulaMode',
        label: { zh: '公式模式', en: 'Formula Mode' },
        type: 'select',
        default: 'classic',
        choices: [
          { value: 'classic', label: { zh: '原剧经典 7 公式', en: 'Classic Show Formulas' } },
          { value: 'shuffle', label: { zh: '随机重玩参数', en: 'Randomized Replay Params' } },
        ],
      },
      {
        key: 'turnTimer',
        label: { zh: '每轮限时', en: 'Round Timer' },
        type: 'select',
        default: '90',
        choices: [
          { value: '90', label: { zh: '90 秒', en: '90s' } },
          { value: '60', label: { zh: '60 秒', en: '60s' } },
          { value: '0', label: { zh: '不限时', en: 'Untimed' } },
        ],
      },
    ],
    rulesSummary: RULES_SUMMARY,
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderTerminal,
});

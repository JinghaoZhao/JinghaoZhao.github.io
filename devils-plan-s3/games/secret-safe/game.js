/**
 * Living Quarters Secret Safe (生活馆秘密金库) — Interactive Multi-Act Escape Room Renderer
 * Wave 2 Apple-Grade Motion & Dual-Theme Edition:
 *  - Motion.patchDOM + Motion.delegate (zero innerHTML wipes, preserved SVG gear & <canvas>)
 *  - Persistent <g data-motion-key="ss-vault-gear"> smoothly spins 30° over 420ms per locked Piece
 *  - Persistent <canvas data-motion-key="ss-shatter-canvas"> honors Theme.onChange() & Motion.isReduced()
 *  - Monotonic cumulative piece rotation angles for smooth clockwise 90° spins
 *  - Act I -> II -> III -> IV -> V smooth 180ms crossfades + Motion.shake on mismatch
 *  - Dual-Theme museum-grade Dark Walnut Studio & Light Porcelain Gallery SVGs
 */

import { mountGame, SFX, I18n, UI, Motion, Theme } from '../../shared/sdk.js';
import { GROOVE_PROFILES, DEPTH_TYPES, GameRules } from './rules.js';

const uiState = {
  selectedPieceId: null,
  armBreachConfirm: false,
  lastFeedback: null,
  lastEventKey: null,
  shatterPlayedForMatch: false,
  shatterAnimFrame: null,
  pieceVisualRot: {}, // pieceId -> monotonic visual deg for smooth clockwise rotation
  delegatedRoot: null,
};

let latestCtx = null;
let latestStageEl = null;

function stopShatterAnim() {
  if (uiState.shatterAnimFrame) {
    cancelAnimationFrame(uiState.shatterAnimFrame);
    uiState.shatterAnimFrame = null;
  }
}

function getProfile(profileId) {
  return GROOVE_PROFILES.find((p) => p.id === profileId) || GROOVE_PROFILES[0];
}

function getDepth(depthId) {
  return DEPTH_TYPES.find((d) => d.id === depthId) || DEPTH_TYPES[0];
}

function rotArrow(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (d === 0) return '↑';
  if (d === 90) return '→';
  if (d === 180) return '↓';
  return '←';
}

function getMonotonicRotation(pieceId, canonicalRot) {
  const targetMod = ((canonicalRot % 360) + 360) % 360;
  const prev = uiState.pieceVisualRot[pieceId];
  if (prev === undefined) {
    uiState.pieceVisualRot[pieceId] = targetMod;
    return targetMod;
  }
  const prevMod = ((prev % 360) + 360) % 360;
  const delta = (targetMod - prevMod + 360) % 360;
  const next = prev + delta;
  uiState.pieceVisualRot[pieceId] = next;
  return next;
}

function renderGrooveSvg(pieceId, profileId, depthId, rotation = 0, size = 46) {
  const prof = getProfile(profileId);
  const isDeep = depthId === 'deep';
  const isLight = Theme.get() === 'light';
  const visualDeg = getMonotonicRotation(pieceId, rotation);
  const teeth = prof.teeth;
  const toothBars = teeth
    .map((on, i) => {
      if (!on) return '';
      const x = 14 + i * 9;
      const h = isDeep ? 12 : 7;
      return `<rect x="${x}" y="6" width="6" height="${h}" rx="1.5" fill="${
        isLight ? (isDeep ? '#9a6e1f' : '#c4963b') : isDeep ? '#fef08a' : '#d4af6a'
      }" />`;
    })
    .join('');

  const bodyFill = isLight
    ? isDeep
      ? '#f3e5c3'
      : '#f7f4ec'
    : isDeep
    ? '#2a1d0d'
    : '#1f1c20';
  const strokeColor = isLight
    ? isDeep
      ? '#9a6e1f'
      : '#b0883e'
    : isDeep
    ? '#fde68a'
    : '#c5a059';
  const textFill = isLight ? '#2b1d08' : '#f6e7c5';
  const arrowFill = isLight ? '#0369a1' : '#38bdf8';

  return `
    <svg class="ss-piece-glyph" data-motion-key="ss-piece-svg-${pieceId}" width="${size}" height="${size}" viewBox="0 0 60 60" style="transform:rotate(${visualDeg}deg);" aria-hidden="true">
      <polygon points="30,3 54,16.5 54,43.5 30,57 6,43.5 6,16.5" fill="${bodyFill}" stroke="${strokeColor}" stroke-width="2.2" />
      <polygon points="30,10 47,20 47,40 30,50 13,40 13,20" fill="none" stroke="rgba(180,134,48,0.28)" stroke-width="1" />
      <polygon points="30,1 34,7 26,7" fill="${arrowFill}" />
      ${toothBars}
      <text x="30" y="36" text-anchor="middle" fill="${textFill}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">${prof.code}</text>
    </svg>
  `;
}

/* ==========================================================================
 * ACT 1: LUXURY LIVING QUARTERS SUITE & FAKE OUTLET
 * ========================================================================== */

function renderAct1(ctx) {
  const { state, lang, isSpectator } = ctx;
  const s = state.suite;
  const lampBright = !s.lampChecked;
  const isLight = Theme.get() === 'light';

  const wallTop = isLight ? '#efe7d6' : '#2b1b12';
  const wallBot = isLight ? '#e1d5be' : '#170f0a';
  const fluteStroke = isLight ? 'rgba(120,86,44,0.14)' : 'rgba(0,0,0,0.28)';
  const trimFill = isLight ? '#c7b28e' : '#3a2518';
  const floorFill = isLight ? '#d8ccb7' : '#110d0b';
  const labelInk = isLight ? '#5c4014' : '#d4af6a';
  const labelBright = isLight ? '#7a5410' : '#fde68a';

  const suiteSvg = `
    <svg class="ss-scene-svg" data-motion-key="ss-suite-svg" viewBox="0 0 860 460" role="img" aria-label="Living Quarters Suite">
      <defs>
        <linearGradient id="ss-walnut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${wallTop}" />
          <stop offset="100%" stop-color="${wallBot}" />
        </linearGradient>
        <radialGradient id="ss-sconce-glow" cx="50%" cy="20%" r="60%">
          <stop offset="0%" stop-color="rgba(245,195,95,${lampBright ? (isLight ? '0.26' : '0.32') : '0.08'})" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="ss-marble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${isLight ? '#fcfaf5' : '#2a2930'}" />
          <stop offset="100%" stop-color="${isLight ? '#e5dfd1' : '#141419'}" />
        </linearGradient>
      </defs>

      <rect width="860" height="460" fill="url(#ss-walnut)" />
      ${Array.from({ length: 28 }, (_, i) => `<line x1="${i * 32}" y1="0" x2="${i * 32}" y2="340" stroke="${fluteStroke}" stroke-width="2" />`).join('')}
      <rect x="0" y="330" width="860" height="10" fill="${trimFill}" />
      <rect x="0" y="340" width="860" height="120" fill="${floorFill}" />
      <rect width="860" height="460" fill="url(#ss-sconce-glow)" />

      <!-- Concealed Power Conduit -->
      <path
        d="M 594 278 L 594 218 L 760 218 L 860 218"
        fill="none"
        stroke="${s.relayPieceInserted ? (isLight ? '#b45309' : '#fde68a') : 'rgba(180,134,48,0.18)'}"
        stroke-width="${s.relayPieceInserted ? '4' : '1.5'}"
        stroke-dasharray="${s.relayPieceInserted ? '10 4' : '4 6'}"
      />
      ${
        s.paintingInspected && !s.relayPieceInserted
          ? `<path d="M 380 218 L 594 218 L 594 278" fill="none" stroke="${isLight ? 'rgba(3,105,161,0.55)' : 'rgba(56,189,248,0.45)'}" stroke-width="2" stroke-dasharray="5 5" />`
          : ''
      }

      <!-- Hotspot 1: Framed Geometric Painting -->
      <g class="ss-hotspot" data-act1="painting" data-motion-key="ss-hs-painting">
        <rect x="255" y="64" width="230" height="154" rx="4" fill="${isLight ? '#5c4328' : '#110d0a'}" stroke="${isLight ? '#9a6e1f' : '#d4af6a'}" stroke-width="5" />
        <rect x="267" y="76" width="206" height="130" fill="${isLight ? '#232026' : '#181922'}" />
        <polygon points="370,92 414,118 414,166 370,192 326,166 326,118" fill="none" stroke="#d4af6a" stroke-width="2.5" opacity="0.88" />
        <circle cx="370" cy="142" r="24" fill="rgba(220,38,38,0.32)" stroke="#f59e0b" stroke-width="1.5" />
        <line x1="286" y1="142" x2="454" y2="142" stroke="rgba(242,213,145,0.35)" stroke-width="1" />
        <text x="370" y="236" text-anchor="middle" fill="${labelInk}" font-size="12" font-weight="600" font-family="Space Grotesk, sans-serif">
          ${lang === 'zh' ? '🖼 胡桃木几何挂画' : '🖼 Framed Artwork'} ${s.paintingInspected ? '✓' : ''}
        </text>
      </g>

      <!-- Hotspot 2: Bedside Brass Lamp -->
      <g class="ss-hotspot" data-act1="lamp" data-motion-key="ss-hs-lamp">
        <rect x="82" y="254" width="136" height="130" rx="6" fill="${isLight ? '#b89f7d' : '#211610'}" stroke="${isLight ? '#8a6e3b' : '#4a3122'}" stroke-width="2" />
        <rect x="92" y="266" width="116" height="46" rx="3" fill="${isLight ? '#a68c69' : '#18100c'}" stroke="rgba(212,175,106,0.28)" />
        <circle cx="150" cy="289" r="4" fill="#d4af6a" />
        <rect x="136" y="244" width="28" height="10" rx="2" fill="#b0883e" />
        <rect x="147" y="182" width="6" height="62" fill="#b0883e" />
        <polygon points="116,184 184,184 170,132 130,132" fill="${lampBright ? '#f4d182' : '#5e503d'}" stroke="#9a6e1f" stroke-width="2" />
        ${lampBright ? `<ellipse cx="150" cy="196" rx="52" ry="18" fill="rgba(254,240,138,0.26)" />` : ''}
        <text x="150" y="120" text-anchor="middle" fill="${labelBright}" font-size="12" font-weight="600" font-family="Space Grotesk, sans-serif">
          ${lang === 'zh' ? '💡 床头铜灯' : '💡 Brass Lamp'} ${s.lampChecked ? '✓' : ''}
        </text>
      </g>

      <!-- Hotspot 3: Marble Vanity Dresser -->
      <g class="ss-hotspot" data-act1="vanity" data-motion-key="ss-hs-vanity">
        <rect x="635" y="250" width="175" height="138" rx="6" fill="url(#ss-marble)" stroke="#8a6e3b" stroke-width="2" />
        <rect x="647" y="266" width="151" height="44" rx="3" fill="${isLight ? '#f4efe4' : '#16151c'}" stroke="rgba(180,134,48,0.32)" />
        <rect x="708" y="285" width="28" height="5" rx="2" fill="#b0883e" />
        <rect x="647" y="320" width="151" height="52" rx="3" fill="${isLight ? '#eee7da' : '#131218'}" stroke="rgba(180,134,48,0.22)" />
        <ellipse cx="722" cy="154" rx="56" ry="74" fill="${isLight ? 'rgba(3,105,161,0.08)' : 'rgba(56,189,248,0.06)'}" stroke="#b0883e" stroke-width="4" />
        <line x1="696" y1="112" x2="736" y2="178" stroke="rgba(255,255,255,0.2)" stroke-width="6" />
        <text x="722" y="408" text-anchor="middle" fill="${labelInk}" font-size="12" font-weight="600" font-family="Space Grotesk, sans-serif">
          ${lang === 'zh' ? '🗄 梳妆台抽屉' : '🗄 Vanity Drawer'} ${s.vanitySearched ? '✓' : ''}
        </text>
      </g>

      <!-- Hotspot 4: THE DISGUISED FAKE ELECTRICAL OUTLET -->
      <g class="ss-hotspot" data-act1="outlet" data-motion-key="ss-hs-outlet">
        <rect x="564" y="268" width="60" height="60" rx="7" fill="${s.faceplateRemoved ? (isLight ? '#2a1f14' : '#100c09') : isLight ? '#f8f5ee' : '#26252c'}" stroke="${s.relayPieceInserted ? '#d97706' : s.outletInspected ? '#b45309' : '#9c8353'}" stroke-width="2.5" />
        ${
          s.relayPieceInserted
            ? `<polygon points="594,280 610,289 610,307 594,316 578,307 578,289" fill="#f59e0b" />`
            : s.faceplateRemoved
            ? `<polygon points="594,280 610,289 610,307 594,316 578,307 578,289" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="3 2" />`
            : `
              <circle cx="594" cy="298" r="16" fill="${isLight ? '#e4dfd3' : '#141418'}" stroke="#78716c" stroke-width="1.5" />
              <circle cx="587" cy="298" r="3" fill="#1c1917" />
              <circle cx="601" cy="298" r="3" fill="#1c1917" />
            `
        }
        <circle cx="594" cy="298" r="36" fill="none" stroke="${s.relayPieceInserted ? '#f59e0b' : 'rgba(180,83,9,0.5)'}" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="594" y="352" text-anchor="middle" fill="${labelBright}" font-size="12.5" font-weight="700" font-family="Space Grotesk, sans-serif">
          ${lang === 'zh' ? '⚡ 墙面插座' : '⚡ Wall Outlet'}
        </text>
      </g>

      <text x="844" y="206" text-anchor="end" fill="${s.relayPieceInserted ? labelBright : labelInk}" opacity="${s.relayPieceInserted ? '1' : '0.55'}" font-size="11" font-family="JetBrains Mono, monospace">
        ${lang === 'zh' ? '→ 通往衣帽间走廊' : '→ TO DRESSING ALCOVE'}
      </text>
    </svg>
  `;

  return `
    <div class="ss-scene-grid ss-act-stage" data-motion-key="ss-act-1">
      <div class="ss-scene-stage">
        ${suiteSvg}
      </div>

      <div class="ss-side-panel">
        <span class="dp-badge">${lang === 'zh' ? '第一幕 · 奢华生活馆' : 'ACT I · LIVING QUARTERS SUITE'}</span>
        <h2 class="ss-panel-heading">
          ${lang === 'zh' ? '寻觅暗藏于豪宅的机关' : 'Explore the Luxury Suite'}
        </h2>
        <p class="ss-panel-sub">
          ${
            lang === 'zh'
              ? '点击房间内的挂画、铜灯、梳妆台与墙面插座。生活馆深处传说藏有秘密金库——留意一切「不通电」的违和细节。'
              : 'Click objects across the suite — painting, lamp, vanity drawer, and wall outlet. Rumors speak of a secret safe hidden within Living Quarters.'
          }
        </p>

        ${
          s.outletInspected
            ? `
              <div class="ss-outlet-box" data-motion-key="ss-outlet-box">
                <div style="font-family:var(--dp-font-mono);font-size:11.5px;color:var(--dp-brass);">
                  ${lang === 'zh' ? '近距离查验 · 梳妆台旁墙面插座' : 'CLOSE-UP · VANITY WALL OUTLET'}
                </div>

                ${
                  !s.faceplateRemoved
                    ? `
                      <div class="ss-outlet-plate">
                        <button
                          type="button"
                          class="ss-screw-btn ${s.screwTopRemoved ? 'is-removed' : ''}"
                          id="ss-screw-top"
                          data-motion-key="ss-screw-top"
                          ${isSpectator || s.screwTopRemoved ? 'disabled' : ''}
                          title="${lang === 'zh' ? '拧开上方螺丝' : 'Unscrew top fastener'}"
                        >${s.screwTopRemoved ? '○' : '⊖'}</button>
                        <div style="width:68px;height:68px;border-radius:50%;background:var(--dp-bg-slate);border:2px solid var(--dp-border-strong);display:flex;align-items:center;justify-content:center;gap:14px;">
                          <span style="width:9px;height:9px;border-radius:50%;background:var(--dp-ink-faint);"></span>
                          <span style="width:9px;height:9px;border-radius:50%;background:var(--dp-ink-faint);"></span>
                        </div>
                        <button
                          type="button"
                          class="ss-screw-btn ${s.screwBottomRemoved ? 'is-removed' : ''}"
                          id="ss-screw-bot"
                          data-motion-key="ss-screw-bot"
                          ${isSpectator || s.screwBottomRemoved ? 'disabled' : ''}
                          title="${lang === 'zh' ? '拧开下方螺丝' : 'Unscrew bottom fastener'}"
                        >${s.screwBottomRemoved ? '○' : '⊖'}</button>
                      </div>
                      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
                        <button type="button" class="dp-btn dp-btn-sm dp-tabular" id="ss-test-voltage" ${isSpectator ? 'disabled' : ''}>
                          ${
                            s.outletVoltageTested
                              ? lang === 'zh'
                                ? '⚡ 电压读数：0.0V (假插座!)'
                                : '⚡ Reading: 0.0V (FAKE!)'
                              : lang === 'zh'
                              ? '检测通电状态'
                              : 'Test Voltage'
                          }
                        </button>
                      </div>
                      <p style="margin:0;font-size:12px;color:var(--dp-ink-muted);text-align:center;">
                        ${
                          lang === 'zh'
                            ? '点击面板上下两颗黄铜螺丝 ⊖ 拆开假插座外壳！'
                            : 'Click both top & bottom brass screws ⊖ to pry off the fake faceplate!'
                        }
                      </p>
                    `
                    : `
                      <div class="ss-outlet-plate is-cavity">
                        <div class="ss-hex-slot-wrap ${s.relayPieceInserted ? 'is-filled' : ''}">
                          <button
                            type="button"
                            class="ss-hex-slot ${s.relayPieceInserted ? 'is-filled' : ''}"
                            id="ss-insert-relay"
                            ${isSpectator || s.relayPieceInserted ? 'disabled' : ''}
                          >◆</button>
                        </div>
                        <span style="font-size:11.5px;font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">
                          ${
                            s.relayPieceInserted
                              ? lang === 'zh'
                                ? '电路已接通！'
                                : 'CIRCUIT ENERGIZED!'
                              : lang === 'zh'
                              ? '单碎片隐藏插槽'
                              : 'SINGLE PIECE SLOT'
                          }
                        </span>
                      </div>
                      ${
                        !s.relayPieceInserted
                          ? `<button type="button" class="dp-btn dp-btn-primary" id="ss-insert-relay-btn" ${isSpectator ? 'disabled' : ''}>
                              ◆ ${lang === 'zh' ? '插入 1 枚恶魔碎片' : 'Insert 1 Devil\'s Piece'}
                            </button>`
                          : `<button type="button" class="dp-btn dp-btn-primary" id="ss-to-act2" ${isSpectator ? 'disabled' : ''}>
                              ${lang === 'zh' ? '循着金光前往衣帽间走廊 →' : 'Follow Power Conduit to Alcove →'}
                            </button>`
                      }
                    `
                }
              </div>
            `
            : `
              <div style="padding:12px;border-radius:12px;border:1px dashed var(--dp-border-strong);font-size:12.5px;color:var(--dp-ink-muted);">
                ${
                  lang === 'zh'
                    ? '提示：点击房间中梳妆台旁的「⚡ 墙面插座」进行近距离查验。'
                    : 'Tip: Click the "⚡ Wall Outlet" beside the vanity dresser to inspect it up close.'
                }
              </div>
            `
        }
      </div>
    </div>
  `;
}

/* ==========================================================================
 * ACT 2: ULTRAVIOLET `?` SIGNAL & SECRET WALLPAPER PANEL
 * ========================================================================== */

function renderAct2(ctx) {
  const { state, lang, isSpectator } = ctx;
  const a = state.alcove;
  const isLight = Theme.get() === 'light';
  const uvStrength = Math.max(0, Math.min(1, (a.uvDimmer - 25) / 65));
  const peel = a.wallpaperPeel;
  const peelSize = peel === 0 ? 0 : peel === 1 ? 85 : peel === 2 ? 175 : 270;

  const wallA = isLight ? '#e8e2ee' : '#221b20';
  const wallB = isLight ? '#d8d0e3' : '#131016';
  const panelFill = isLight ? '#e2dbe8' : '#1d171c';
  const foldFill = isLight ? '#c8bda8' : '#362b23';
  const captionInk = isLight ? '#5b21b6' : '#c4b5fd';

  const alcoveSvg = `
    <svg class="ss-scene-svg" data-motion-key="ss-alcove-svg" viewBox="0 0 860 440" role="img" aria-label="Dressing Alcove UV Wall">
      <defs>
        <linearGradient id="ss-silk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${wallA}" />
          <stop offset="100%" stop-color="${wallB}" />
        </linearGradient>
        <radialGradient id="ss-uv-cone" cx="50%" cy="46%" r="48%">
          <stop offset="0%" stop-color="rgba(124,58,237,${(uvStrength * 0.42).toFixed(2)})" />
          <stop offset="55%" stop-color="rgba(217,119,6,${(uvStrength * 0.16).toFixed(2)})" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <rect width="860" height="440" fill="url(#ss-silk)" />
      <rect width="860" height="440" fill="rgba(255,220,165,${((1 - uvStrength) * 0.16).toFixed(2)})" />
      ${Array.from({ length: 14 }, (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="440" stroke="rgba(148,108,36,0.09)" stroke-width="1" />`).join('')}

      <rect x="370" y="12" width="120" height="18" rx="9" fill="${isLight ? '#8a6e3b' : '#2c221b'}" stroke="#d4af6a" stroke-width="2" />
      <polygon points="390,30 470,30 620,420 240,420" fill="url(#ss-uv-cone)" />

      <!-- Concealed Recessed Vault Cavity -->
      <rect x="295" y="88" width="270" height="270" rx="16" fill="${isLight ? '#231e19' : '#09090d'}" stroke="#d4af6a" stroke-width="3" />
      <circle cx="430" cy="223" r="96" fill="#141114" stroke="#d4af6a" stroke-width="4" stroke-dasharray="14 8" />
      <circle cx="430" cy="223" r="56" fill="#1e1710" stroke="#fbbf24" stroke-width="2.5" />
      <text x="430" y="218" text-anchor="middle" fill="#fde68a" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700">12-PIECE</text>
      <text x="430" y="238" text-anchor="middle" fill="#d4af6a" font-family="JetBrains Mono, monospace" font-size="11">VAULT LOCK</text>

      ${
        peel < 3
          ? `
            <g data-motion-key="ss-wallpaper-flap">
              <polygon
                points="${295 + peelSize},88 565,88 565,358 295,358 295,${88 + peelSize}"
                fill="${panelFill}"
                stroke="${a.questionDotInspected ? '#d97706' : 'rgba(148,108,36,0.28)'}"
                stroke-width="${a.questionDotInspected ? '2.5' : '1'}"
                stroke-dasharray="${a.questionDotInspected ? '6 4' : 'none'}"
              />
              ${
                peel > 0
                  ? `<polygon points="${295 + peelSize},88 295,${88 + peelSize} ${295 + peelSize * 0.82},${88 + peelSize * 0.82}" fill="${foldFill}" stroke="#b0883e" stroke-width="1.5" />`
                  : ''
              }
            </g>
          `
          : ''
      }

      <!-- Luminous Ultraviolet Question Mark Projection -->
      ${
        peel < 3
          ? `
            <g opacity="${(0.08 + uvStrength * 0.92).toFixed(2)}" data-motion-key="ss-uv-question">
              <path
                d="M 392 162 C 392 128 468 126 468 164 C 468 192 430 198 430 232"
                fill="none"
                stroke="${isLight ? '#7c3aed' : '#e9d5ff'}"
                stroke-width="14"
                stroke-linecap="round"
              />
              <path
                d="M 392 162 C 392 128 468 126 468 164 C 468 192 430 198 430 232"
                fill="none"
                stroke="${isLight ? '#f59e0b' : '#fde68a'}"
                stroke-width="5"
                stroke-linecap="round"
              />
              <g class="${a.uvRevealed ? 'ss-hotspot' : ''}" data-act2="dot">
                <circle cx="430" cy="272" r="22" fill="rgba(124,58,237,0.22)" />
                <circle cx="430" cy="272" r="10" fill="#f59e0b" stroke="#a78bfa" stroke-width="3" />
                ${
                  a.uvRevealed && !a.questionDotInspected
                    ? `<circle cx="430" cy="272" r="28" fill="none" stroke="#d97706" stroke-width="2" stroke-dasharray="5 4" />`
                    : ''
                }
              </g>
            </g>
          `
          : ''
      }

      <text x="430" y="405" text-anchor="middle" fill="${captionInk}" font-size="13" font-weight="600" font-family="Space Grotesk, sans-serif">
        ${
          peel >= 3
            ? lang === 'zh'
              ? '✦ 秘密壁纸已完全撕开！露出了墙内的 12 碎片黄铜金库锁！'
              : '✦ Secret wallpaper peeled back! The 12-Piece Brass Vault Lock stands exposed!'
            : a.questionDotInspected
            ? lang === 'zh'
              ? `已锁定壁纸暗缝！连续撕开壁纸 (${peel}/3)`
              : `Wallpaper seam located! Peel back the panel (${peel}/3)`
            : a.uvRevealed
            ? lang === 'zh'
              ? '发光「?」问号显影成功！点击问号底部的发光圆点寻找暗缝'
              : 'Radiant "?" emblem revealed! Click the glowing base dot to locate the seam'
            : lang === 'zh'
            ? '环境光过亮，无法看清紫外射灯投射的隐藏符号……'
            : 'Room sconces too bright to read the concealed UV projection...'
        }
      </text>
    </svg>
  `;

  return `
    <div class="ss-scene-grid ss-act-stage" data-motion-key="ss-act-2">
      <div class="ss-scene-stage">
        ${alcoveSvg}
      </div>

      <div class="ss-side-panel">
        <span class="dp-badge dp-badge-cyan">${lang === 'zh' ? '第二幕 · 幽灵问号显影' : 'ACT II · ULTRAVIOLET "?" SIGNAL'}</span>
        <h2 class="ss-panel-heading">
          ${lang === 'zh' ? '衣帽间暗墙与紫外符号' : 'The Concealed UV Projection'}
        </h2>
        <p class="ss-panel-sub">
          ${
            lang === 'zh'
              ? '假插座接通了隐蔽射灯电源。调暗壁灯聚焦紫外光束，让隐藏在丝绸壁纸上的「?」标志彻底显影并撕开暗缝！'
              : 'The fake outlet energized a hidden spotlight. Dim the room lights to bring the ultraviolet "?" symbol into focus, then peel open the secret wallpaper panel!'
          }
        </p>

        <div class="ss-uv-control">
          <div class="ss-uv-label">
            <span>${lang === 'zh' ? '紫外射灯聚焦 / 调暗室内光' : 'UV SCONCE DIMMER'}</span>
            <span>${a.uvDimmer}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value="${a.uvDimmer}"
            class="ss-uv-slider"
            id="ss-uv-range"
            ${isSpectator ? 'disabled' : ''}
          />
          ${
            !a.uvRevealed
              ? `<button type="button" class="dp-btn dp-btn-sm" id="ss-uv-max" ${isSpectator ? 'disabled' : ''}>
                  ✦ ${lang === 'zh' ? '一键调至紫外显影模式 (95%)' : 'Focus UV Spotlight (95%)'}
                </button>`
              : ''
          }
        </div>

        ${
          a.uvRevealed && !a.questionDotInspected
            ? `<button type="button" class="dp-btn dp-btn-primary" id="ss-inspect-dot-btn" ${isSpectator ? 'disabled' : ''}>
                🔍 ${lang === 'zh' ? '查验「?」底部发光圆点' : 'Inspect the "?" Base Dot Seam'}
              </button>`
            : ''
        }

        ${
          a.questionDotInspected && peel < 3
            ? `<button type="button" class="dp-btn dp-btn-primary dp-tabular" id="ss-peel-btn" ${isSpectator ? 'disabled' : ''}>
                ✋ ${lang === 'zh' ? `用力撕开壁纸暗板 (${peel}/3 → ${peel + 1}/3)` : `Peel Back Wallpaper Panel (${peel}/3 → ${peel + 1}/3)`}
              </button>`
            : ''
        }

        ${
          peel >= 3
            ? `<button type="button" class="dp-btn dp-btn-primary" id="ss-to-act3" ${isSpectator ? 'disabled' : ''}>
                ⚙ ${lang === 'zh' ? '靠近 12 碎片互锁金库锁 →' : 'Approach 12-Piece Vault Lock →'}
              </button>`
            : ''
        }
      </div>
    </div>
  `;
}

/* ==========================================================================
 * ACT 3: 12-PIECE INTERLOCKING MECHANICAL BRASS VAULT LOCK
 * ========================================================================== */

function renderAct3(ctx) {
  const { state, lang, isSpectator } = ctx;
  const v = state.vault;
  const isLight = Theme.get() === 'light';

  let selectedPiece = v.pieces.find((p) => p.pieceId === uiState.selectedPieceId && p.placedSlot === null);
  if (!selectedPiece) {
    selectedPiece = v.pieces.find((p) => p.placedSlot === null) || null;
    uiState.selectedPieceId = selectedPiece ? selectedPiece.pieceId : null;
  }

  const cx = 260;
  const cy = 260;
  const ringR = 186;

  const socketNodes = v.sockets
    .map((sock, idx) => {
      const angleRad = ((idx * 30 - 90) * Math.PI) / 180;
      const sx = cx + ringR * Math.cos(angleRad);
      const sy = cy + ringR * Math.sin(angleRad);
      const isLocked = sock.lockedPieceId !== null;
      const isHinted = v.hintedPair && v.hintedPair.slotIdx === idx;
      const isDeep = sock.depthId === 'deep';
      const arrow = v.relaxedLock ? '●' : rotArrow(sock.targetRotation);

      const hexPts = Array.from({ length: 6 }, (_, k) => {
        const a = ((k * 60 - 90) * Math.PI) / 180;
        return `${(sx + 33 * Math.cos(a)).toFixed(1)},${(sy + 33 * Math.sin(a)).toFixed(1)}`;
      }).join(' ');

      const polyFill = isLocked
        ? isLight
          ? '#d9a441'
          : '#d4af6a'
        : isLight
        ? isDeep
          ? '#efe3c6'
          : '#ffffff'
        : isDeep
        ? '#1b140d'
        : '#16161e';
      const polyStroke = isLocked
        ? isLight
          ? '#9a6e1f'
          : '#fef08a'
        : isHinted
        ? isLight
          ? '#0369a1'
          : '#38bdf8'
        : isDeep
        ? isLight
          ? '#9a6e1f'
          : '#e8b959'
        : isLight
        ? '#b8a586'
        : '#8a6e3b';
      const codeInk = isLocked ? '#1f1202' : isLight ? '#1c1914' : '#f4e5c3';
      const arrowInk = isLocked
        ? '#3b2406'
        : isHinted
        ? isLight
          ? '#0369a1'
          : '#7dd3fc'
        : isLight
        ? '#0369a1'
        : '#38bdf8';

      return `
        <g
          class="ss-socket-group"
          data-vault-slot="${idx}"
          data-motion-key="ss-slot-${idx}"
        >
          ${
            isHinted
              ? `<circle class="ss-hint-ring" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="38" fill="none" stroke="${isLight ? '#0369a1' : '#38bdf8'}" stroke-width="2.5" />`
              : ''
          }
          <polygon
            points="${hexPts}"
            fill="${polyFill}"
            stroke="${polyStroke}"
            stroke-width="${isLocked || isHinted ? '3' : '2'}"
          />
          <text x="${sx.toFixed(1)}" y="${(sy - 5).toFixed(1)}" text-anchor="middle" fill="${codeInk}" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="800">
            ${UI.escapeHtml(sock.code)}
          </text>
          <text x="${sx.toFixed(1)}" y="${(sy + 12).toFixed(1)}" text-anchor="middle" fill="${arrowInk}" font-family="JetBrains Mono, monospace" font-size="13" font-weight="800">
            ${isLocked ? '✦' : arrow}
          </text>
        </g>
      `;
    })
    .join('');

  const gearTeeth = Array.from({ length: 24 }, (_, i) => {
    const a = i * 15;
    return `<rect x="255" y="138" width="10" height="16" rx="2" fill="${isLight ? '#9a6e1f' : '#b48a41'}" transform="rotate(${a} 260 260)" />`;
  }).join('');

  const outerRingFill = isLight ? '#ede7d9' : '#100f14';
  const midRingFill = isLight ? '#e4dccb' : '#151214';
  const coreStop0 = v.unlocked ? '#fef08a' : isLight ? '#d8b774' : '#352614';
  const coreStop1 = v.unlocked ? '#b47c2b' : isLight ? '#a67f36' : '#120f12';
  const hubFill = isLight ? '#ffffff' : '#0d0c11';
  const hubText = isLight ? '#7a5410' : v.unlocked ? '#fef08a' : '#f2d591';

  const vaultSvg = `
    <svg class="ss-vault-svg" data-motion-key="ss-vault-svg" viewBox="0 0 520 520" role="img" aria-label="12-Piece Brass Vault Lock">
      <defs>
        <radialGradient id="ss-vault-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stop-color="${coreStop0}" />
          <stop offset="100%" stop-color="${coreStop1}" />
        </radialGradient>
      </defs>

      <circle cx="260" cy="260" r="244" fill="${outerRingFill}" stroke="rgba(180,134,48,0.38)" stroke-width="3" />
      <circle cx="260" cy="260" r="144" fill="${midRingFill}" stroke="rgba(180,134,48,0.26)" stroke-width="2" />

      <!-- Persistent Brass Interlock Gear Assembly: Smooth 420ms GPU Rotation via Motion.patchDOM! -->
      <g data-motion-key="ss-vault-gear" class="ss-vault-gear" style="transform:rotate(${v.gearAngle}deg);">
        ${gearTeeth}
        <circle cx="260" cy="260" r="112" fill="url(#ss-vault-core)" stroke="${isLight ? '#9a6e1f' : '#d4af6a'}" stroke-width="4" />
        <circle cx="260" cy="260" r="88" fill="none" stroke="rgba(254,240,138,0.34)" stroke-width="2" stroke-dasharray="12 8" />
        ${[0, 60, 120, 180, 240, 300]
          .map((deg) => `<line x1="260" y1="176" x2="260" y2="226" stroke="${isLight ? '#fff8e1' : '#e8c373'}" stroke-width="4" stroke-linecap="round" transform="rotate(${deg} 260 260)" />`)
          .join('')}
      </g>

      <circle cx="260" cy="260" r="46" fill="${hubFill}" stroke="${v.unlocked ? '#d97706' : '#b0883e'}" stroke-width="3" />
      <text x="260" y="256" text-anchor="middle" fill="${hubText}" font-family="JetBrains Mono, monospace" font-size="22" font-weight="800">
        ${v.lockedCount}/12
      </text>
      <text x="260" y="274" text-anchor="middle" fill="${isLight ? '#52596b' : '#9fa6b8'}" font-family="JetBrains Mono, monospace" font-size="9.5">
        ${v.unlocked ? 'UNLOCKED' : 'INTERLOCK'}
      </text>

      ${socketNodes}
    </svg>
  `;

  return `
    <div class="ss-vault-wrap ss-act-stage" data-motion-key="ss-act-3">
      <div class="ss-vault-wheel-card ${v.unlocked ? 'is-unlocked' : ''}">
        <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
          <span class="dp-badge">${lang === 'zh' ? '第三幕 · 12碎片互锁金库锁' : 'ACT III · 12-PIECE VAULT LOCK'}</span>
          <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:12px;color:var(--dp-brass);">
            ${v.unlocked ? (lang === 'zh' ? '✦ 齿轮已旋开 · 12碎片归还' : '✦ UNLOCKED · 12 PIECES RETURNED') : `${v.lockedCount} / 12`}
          </span>
        </div>

        ${vaultSvg}

        ${
          v.unlocked
            ? `
              <div style="margin-top:12px;text-align:center;">
                <p style="margin:0 0 12px;font-size:13.5px;color:var(--dp-brass-bright);">
                  ${
                    lang === 'zh'
                      ? '12 枚碎片齿轮严丝合缝咬合！所有钥匙碎片已无损弹出归还，胡桃木暗墙缓缓向两侧滑开，露出通往地下的秘密电梯！'
                      : 'All 12 grooved Devil\'s Pieces interlocked! Every key Piece popped safely back into your pouch as the hidden walnut elevator doors slide apart!'
                  }
                </p>
                <button type="button" class="dp-btn dp-btn-primary" id="ss-board-elevator" style="min-height:46px;padding:10px 24px;" ${isSpectator ? 'disabled' : ''}>
                  🛗 ${lang === 'zh' ? '步入秘密电梯，前往地下金库 →' : 'Board Secret Elevator to B1 Vault →'}
                </button>
              </div>
            `
            : `
              <p style="margin:6px 0 0;font-size:12px;color:var(--dp-ink-muted);text-align:center;">
                ${
                  v.relaxedLock
                    ? lang === 'zh'
                      ? '在右侧选中一枚碎片，点击转盘上相同齿码（如 I-A / IV-B）的凹槽嵌入。'
                      : 'Select a Piece on the right, then click the matching groove-code socket (e.g. I-A / IV-B) on the wheel.'
                    : lang === 'zh'
                    ? '选中一枚碎片 → 按「旋转 90° (R)」使蓝色箭头方向与目标槽一致 → 点击相同齿码槽位互锁嵌入！'
                    : 'Select a Piece → press Rotate +90° (R) until its cyan arrow matches the socket → click the matching groove-code socket!'
                }
              </p>
            `
        }
      </div>

      <div class="ss-side-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <h2 class="ss-panel-heading" style="font-size:16px;">
            ${lang === 'zh' ? '12 枚齿槽恶魔碎片' : '12 Grooved Devil\'s Pieces'}
          </h2>
          ${
            !v.unlocked
              ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="ss-rotate-btn" ${isSpectator || !selectedPiece ? 'disabled' : ''}>
                  ↻ ${lang === 'zh' ? '旋转 90° (R)' : 'Rotate +90° (R)'}
                </button>`
              : ''
          }
        </div>

        ${
          selectedPiece && !v.unlocked
            ? `
              <div class="ss-selected-bar" data-motion-key="ss-selected-bar">
                <span>
                  ${lang === 'zh' ? '当前手持' : 'Selected'}:
                  <strong style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">${UI.escapeHtml(selectedPiece.code)}</strong>
                  (${UI.escapeHtml(getProfile(selectedPiece.profileId).label[lang])} · ${UI.escapeHtml(getDepth(selectedPiece.depthId).label[lang])})
                </span>
                <span style="font-family:var(--dp-font-mono);color:var(--dp-cyan);font-weight:700;">
                  ${v.relaxedLock ? 'AUTO' : `${rotArrow(selectedPiece.rotation)} ${selectedPiece.rotation}°`}
                </span>
              </div>
            `
            : ''
        }

        ${
          uiState.lastFeedback
            ? `
              <div class="ss-feedback-banner is-${uiState.lastFeedback.tone}" id="ss-feedback-banner" data-motion-key="ss-feedback">
                ${UI.escapeHtml(uiState.lastFeedback[lang])}
              </div>
            `
            : ''
        }

        <div class="ss-piece-tray">
          ${v.pieces
            .map((p) => {
              const locked = p.placedSlot !== null;
              const selected = !locked && selectedPiece?.pieceId === p.pieceId;
              const hinted = v.hintedPair && v.hintedPair.pieceId === p.pieceId;
              return `
                <button
                  type="button"
                  class="ss-piece-card ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''} ${hinted ? 'is-hinted' : ''}"
                  data-pick-piece="${p.pieceId}"
                  data-motion-key="ss-piece-${p.pieceId}"
                  ${locked || isSpectator ? 'disabled' : ''}
                >
                  ${renderGrooveSvg(p.pieceId, p.profileId, p.depthId, p.rotation, 46)}
                  <span class="ss-piece-code">${UI.escapeHtml(p.code)}</span>
                  <span class="ss-piece-meta">${locked ? (lang === 'zh' ? '已咬合' : 'Locked') : `${rotArrow(p.rotation)} ${getDepth(p.depthId).label[lang]}`}</span>
                </button>
              `;
            })
            .join('')}
        </div>

        ${
          !v.unlocked
            ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
                <button type="button" class="dp-btn dp-btn-sm" id="ss-vault-hint" ${isSpectator ? 'disabled' : ''}>
                  💡 ${lang === 'zh' ? '高亮匹配槽位' : 'Highlight Match'}
                </button>
                <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="ss-vault-auto1" ${isSpectator ? 'disabled' : ''}>
                  ⚡ ${lang === 'zh' ? '协助咬合 1 枚' : 'Auto-Seat 1 Piece'}
                </button>
              </div>
            `
            : ''
        }
      </div>
    </div>
  `;
}

/* ==========================================================================
 * ACT 4: SECRET ELEVATOR, GOLDEN TALISMAN SEAL & CURSE BARRIER
 * ========================================================================== */

function renderAct4(ctx) {
  const { state, lang, isSpectator } = ctx;
  const sc = state.sanctum;

  if (!sc.elevatorDescended) {
    return `
      <section class="ss-sanctum-stage is-keeper ss-act-stage" data-motion-key="ss-act-4-elev">
        <span class="dp-badge">${lang === 'zh' ? '第四幕 · 暗门秘密电梯' : 'ACT IV · THE HIDDEN ELEVATOR'}</span>
        <h2 class="ss-sanctum-title">
          ${lang === 'zh' ? '胡桃木秘密电梯已就绪' : 'SECRET ELEVATOR ONLINE'}
        </h2>
        <p style="max-width:540px;margin:0 auto 20px;color:var(--dp-ink-muted);font-size:14px;">
          ${
            lang === 'zh'
              ? '墙内暗门滑开，一间仅有单人容身的胡桃木与黑钢电梯静候于眼前。控制面板上仅亮起一枚猩红与金色交织的按键：B1 · 秘密金库。'
              : 'Behind the walnut wall sits a solitary obsidian-and-walnut elevator. Only one illuminated brass button glows on the console: B1 · SECRET VAULT.'
          }
        </p>
        <div class="ss-talisman-door" style="max-width:320px;">
          <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:32px;color:var(--dp-brass-bright);letter-spacing:0.14em;margin-bottom:14px;">
            LQ ▾ B1
          </div>
          <button type="button" class="dp-btn dp-btn-primary" id="ss-descend-btn" style="min-height:48px;padding:12px 28px;" ${isSpectator ? 'disabled' : ''}>
            ⬇ ${lang === 'zh' ? '按下 B1 · 潜入地下秘密金库' : 'Press B1 · Descend to Secret Vault'}
          </button>
        </div>
      </section>
    `;
  }

  if (!sc.talismanTorn) {
    return `
      <section class="ss-sanctum-stage ss-act-stage" data-motion-key="ss-act-4-seal">
        <span class="dp-badge dp-badge-crimson">${lang === 'zh' ? '第四幕 · 金库封印符箓' : 'ACT IV · THE GOLDEN TALISMAN SEAL'}</span>
        <h2 class="ss-sanctum-title">
          ${lang === 'zh' ? '秘密金库圣殿入口' : 'SANCTUM OF THE SECRET SAFE'}
        </h2>
        <p style="max-width:560px;margin:0 auto 18px;color:var(--dp-ink-muted);font-size:14px;">
          ${
            lang === 'zh'
              ? '电梯门在地下室悄然开启。厚重的黑曜石金库大门上横贴着一道金色封印符箓——唯有亲手撕下符箓的挑战者，方能直面金库内部的终极赏赐与诅咒。'
              : 'The elevator doors part at B1. Across the obsidian sanctum doors stretches a crimson-gold Broadcast Talisman — tear the seal to confront what waits inside.'
          }
        </p>
        <div class="ss-talisman-door">
          <button type="button" class="ss-talisman-strip" id="ss-tear-talisman" ${isSpectator ? 'disabled' : ''}>
            <span style="font-size:34px;line-height:1;">封</span>
            <span style="font-size:12px;letter-spacing:0.16em;">
              ${lang === 'zh' ? '仅限一名挑战者入内' : 'ONE CHALLENGER ONLY'}
            </span>
            <span style="font-family:var(--dp-font-mono);font-size:11px;color:#fecaca;">
              ${lang === 'zh' ? '[ 点击撕下金色封印符箓 ]' : '[ CLICK TO TEAR THE SEAL ]'}
            </span>
          </button>
        </div>
      </section>
    `;
  }

  return `
    <section class="ss-sanctum-stage ss-act-stage" data-motion-key="ss-act-4-barrier">
      <span class="dp-badge dp-badge-crimson">⚠ ${lang === 'zh' ? '终极抉择 · 诅咒结界' : 'FINAL DILEMMA · THE CURSE BARRIER'}</span>
      <h2 class="ss-sanctum-title">
        ${lang === 'zh' ? '诅咒结界 · 2 亿韩元的恶魔契约' : 'THE CURSE BARRIER · THE DEVIL\'S COVENANT'}
      </h2>

      <div class="ss-pedestal-wrap">
        <div class="ss-barrier-dome">
          <div class="ss-prize-token">
            <span style="font-size:18px;">♛</span>
            <span style="font-size:11px;">+100M</span>
          </div>
          <div class="ss-prize-token">
            <span style="font-size:18px;">♛</span>
            <span style="font-size:11px;">+100M</span>
          </div>
        </div>
        <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:13px;color:var(--dp-brass-bright);letter-spacing:0.1em;">
          ${lang === 'zh' ? '2 枚奖金徽章 · 总奖金池 +200,000,000 韩元' : '2 PRIZE TOKENS · +200,000,000 KRW TO GRAND PRIZE POOL'}
        </div>
      </div>

      <div class="ss-covenant-grid">
        <div class="ss-covenant-box is-reward">
          <div style="font-size:11.5px;font-weight:700;letter-spacing:0.1em;color:var(--dp-emerald);margin-bottom:6px;">
            ✦ ${lang === 'zh' ? '圣殿赏赐（公利）' : 'VAULT REWARD (COLLECTIVE)'}
          </div>
          <p style="margin:0;font-size:13px;color:var(--dp-ink-muted);line-height:1.55;">
            ${
              lang === 'zh'
                ? '立即为全体选手的最终总奖金池注入 <strong>2 枚奖金徽章（+2 亿韩元）</strong>，改写整季奖金格局！'
                : 'Immediately add <strong>2 Prize Tokens (+200,000,000 KRW)</strong> to the season Grand Prize Pool for all players!'
            }
          </p>
        </div>

        <div class="ss-covenant-box is-curse">
          <div style="font-size:11.5px;font-weight:700;letter-spacing:0.1em;color:var(--dp-crimson-bright);margin-bottom:6px;">
            ☠ ${lang === 'zh' ? '诅咒代价（私损）' : 'THE CURSE COST (PERSONAL)'}
          </div>
          <p class="ss-covenant-curse-text">
            ${
              lang === 'zh'
                ? `伸手破除结界的瞬间，你持有的全部 <strong>${state.piecesHeld} 枚恶魔碎片将彻底粉碎归零</strong>，且此后直到节目结束<strong>永久无法获得或使用任何碎片</strong>！`
                : `The instant you breach the barrier, all <strong>${state.piecesHeld} of your Devil's Pieces shatter to 0</strong>, and you are <strong>permanently forbidden</strong> from ever holding or spending a Piece again!`
            }
          </p>
        </div>
      </div>

      <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;">
        <button
          type="button"
          class="dp-btn dp-btn-danger"
          id="ss-breach-btn"
          style="min-height:48px;padding:12px 24px;"
          ${isSpectator ? 'disabled' : ''}
        >
          ${
            uiState.armBreachConfirm
              ? lang === 'zh'
                ? `☠ 再次点击确认：粉碎 ${state.piecesHeld} 碎片，取走 2 亿奖金！`
                : `☠ CONFIRM BREACH: SHATTER ${state.piecesHeld} PIECES FOR +200M KRW!`
              : lang === 'zh'
              ? '🔥 破除诅咒结界 · 取走 2 枚奖金徽章'
              : '🔥 Breach Curse Barrier · Claim 2 Prize Tokens'
          }
        </button>

        <button
          type="button"
          class="dp-btn"
          id="ss-walk-btn"
          style="min-height:48px;padding:12px 24px;"
          ${isSpectator ? 'disabled' : ''}
        >
          ← ${lang === 'zh' ? `转身退场 · 保留全部 ${state.piecesHeld} 枚碎片` : `Step Back · Preserve All ${state.piecesHeld} Pieces`}
        </button>
      </div>
    </section>
  `;
}

/* ==========================================================================
 * ACT 5: CEREMONIAL EPILOGUE & CANVAS PARTICLE SHATTERING
 * ========================================================================== */

function renderAct5(ctx) {
  const { state, lang, isSpectator } = ctx;
  const cursed = state.ending === 'cursed_hero';

  return `
    <section class="ss-sanctum-stage ${cursed ? '' : 'is-keeper'} ss-act-stage" id="ss-epilogue-stage" data-motion-key="ss-act-5">
      <canvas class="ss-shatter-canvas" id="ss-shatter-canvas" data-motion-key="ss-shatter-canvas" aria-hidden="true"></canvas>

      <div style="position:relative;z-index:8;max-width:640px;margin:0 auto;">
        ${
          cursed
            ? `
              <div class="ss-curse-brand">☠ ${lang === 'zh' ? '诅咒封印已烙印 · ETERNAL PIECE CURSE' : 'CURSE SEAL BRANDED · 0 PIECES FOREVER'}</div>
              <h2 class="ss-sanctum-title dp-tabular">
                ${lang === 'zh' ? '+200,000,000 KRW 已入池' : '+200,000,000 KRW SECURED'}
              </h2>
              <p class="ss-covenant-curse-text" style="font-size:14.5px;line-height:1.65;margin:0 0 22px;">
                ${
                  lang === 'zh'
                    ? `伴随猩红雷鸣，你手中的 ${state.piecesShattered} 枚黄金恶魔碎片化作漫天余烬彻底粉碎！但 2 枚璀璨的奖金徽章已升入第三季总奖金池——你以无碎片之躯，铸就了生活馆最悲壮的传奇。`
                    : `With a crimson thunderclap, all ${state.piecesShattered} of your golden Devil's Pieces shattered into glowing embers! Yet 2 radiant Prize Tokens now shine in the Season 3 Grand Prize Pool — a legendary sacrifice.`
                }
              </p>
            `
            : `
              <span class="dp-badge">${lang === 'zh' ? '暗夜守秘人 · KEEPER OF THE SECRET' : 'KEEPER OF THE SECRET · UNCURSED'}</span>
              <h2 class="ss-sanctum-title dp-tabular">
                ${lang === 'zh' ? `全额保住 ${state.piecesHeld} 枚恶魔碎片` : `ALL ${state.piecesHeld} DEVIL'S PIECES PRESERVED`}
              </h2>
              <p style="color:var(--dp-ink-muted);font-size:14.5px;line-height:1.65;margin:0 0 22px;">
                ${
                  lang === 'zh'
                    ? '你克制住了 2 亿韩元的诱惑，悄然乘秘密电梯返回生活馆。12 枚恶魔碎片完好无损地躺在你的口袋中，而秘密金库的真相，只有你一人知晓。'
                    : 'You resisted the pull of 200M KRW and ascended quietly back into Living Quarters. All 12 Devil\'s Pieces remain safely in your pocket, and the vault\'s secret belongs to you alone.'
                }
              </p>
            `
        }

        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
          ${
            cursed
              ? `<button type="button" class="dp-btn" id="ss-replay-shatter">
                  ✦ ${lang === 'zh' ? '重播碎片粉碎特效' : 'Replay Shatter Ceremony'}
                </button>`
              : ''
          }
          ${
            !state.archived
              ? `<button type="button" class="dp-btn dp-btn-primary" id="ss-conclude-btn" style="min-height:46px;padding:10px 24px;" ${isSpectator ? 'disabled' : ''}>
                  ${lang === 'zh' ? '封存档案 · 查看最终裁决 →' : 'Seal Record · Final Verdict →'}
                </button>`
              : ''
          }
        </div>
      </div>
    </section>
  `;
}

function launchShatterParticles(stageEl) {
  stopShatterAnim();
  const canvas = stageEl?.querySelector('#ss-shatter-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(320, rect.width || 640);
  const h = Math.max(240, rect.height || 360);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx2d = canvas.getContext('2d');
  ctx2d.scale(dpr, dpr);

  const isLight = Theme.get() === 'light';
  const palette = isLight
    ? { crimson: '#b91c2c', goldA: '#b45309', goldB: '#9a6e1f', flash: '185, 28, 44' }
    : { crimson: '#ff4d5e', goldA: '#fde68a', goldB: '#d4af6a', flash: '255, 80, 90' };

  const cx = w * 0.5;
  const cy = h * 0.44;

  // Reduced-motion mode: draw a crisp, static ceremonial burst of shattered bronze/garnet facets (zero continuous rAF!)
  if (Motion.isReduced()) {
    ctx2d.clearRect(0, 0, w, h);
    for (let i = 0; i < 42; i++) {
      const a = (i / 42) * Math.PI * 2;
      const r = 70 + (i % 5) * 32;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r * 0.65;
      const sz = 4 + (i % 4) * 1.5;
      ctx2d.save();
      ctx2d.globalAlpha = 0.42;
      ctx2d.translate(sx, sy);
      ctx2d.rotate(a);
      ctx2d.fillStyle = i % 3 === 0 ? palette.crimson : palette.goldA;
      ctx2d.beginPath();
      ctx2d.moveTo(0, -sz);
      ctx2d.lineTo(sz * 0.85, sz * 0.55);
      ctx2d.lineTo(-sz * 0.7, sz * 0.7);
      ctx2d.closePath();
      ctx2d.fill();
      ctx2d.restore();
    }
    return;
  }

  const shards = [];
  for (let p = 0; p < 12; p++) {
    const a0 = (p / 12) * Math.PI * 2;
    const ox = cx + Math.cos(a0) * 65;
    const oy = cy + Math.sin(a0) * 42;
    for (let k = 0; k < 18; k++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.6 + Math.random() * 6.8;
      const isCrimson = Math.random() < 0.36;
      shards.push({
        x: ox,
        y: oy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2.2,
        size: 3 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.28,
        alpha: 1,
        decay: 0.008 + Math.random() * 0.011,
        color: isCrimson ? palette.crimson : Math.random() < 0.5 ? palette.goldA : palette.goldB,
      });
    }
  }

  let flashAlpha = isLight ? 0.28 : 0.68;

  function tick() {
    if (!canvas.isConnected) {
      uiState.shatterAnimFrame = null;
      return;
    }
    ctx2d.clearRect(0, 0, w, h);

    if (flashAlpha > 0.01) {
      ctx2d.fillStyle = `rgba(${palette.flash}, ${flashAlpha.toFixed(3)})`;
      ctx2d.fillRect(0, 0, w, h);
      flashAlpha *= 0.88;
    }

    let alive = 0;
    for (const s of shards) {
      if (s.alpha <= 0.01) continue;
      alive++;
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.14;
      s.vx *= 0.985;
      s.rot += s.vrot;
      s.alpha = Math.max(0, s.alpha - s.decay);

      ctx2d.save();
      ctx2d.globalAlpha = s.alpha;
      ctx2d.translate(s.x, s.y);
      ctx2d.rotate(s.rot);
      ctx2d.fillStyle = s.color;
      ctx2d.beginPath();
      ctx2d.moveTo(0, -s.size);
      ctx2d.lineTo(s.size * 0.85, s.size * 0.55);
      ctx2d.lineTo(-s.size * 0.7, s.size * 0.7);
      ctx2d.closePath();
      ctx2d.fill();
      ctx2d.restore();
    }

    if (alive > 0) {
      uiState.shatterAnimFrame = requestAnimationFrame(tick);
    } else {
      uiState.shatterAnimFrame = null;
    }
  }

  uiState.shatterAnimFrame = requestAnimationFrame(tick);
}

/* ==========================================================================
 * DELEGATED EVENTS (BOUND ONCE PER STAGE CONTAINER)
 * ========================================================================== */

function setupDelegatedHandlers(container) {
  if (uiState.delegatedRoot === container) return;
  uiState.delegatedRoot = container;

  Motion.delegate(
    container,
    'click',
    'button, [data-act1], [data-act2], [data-vault-slot]',
    (_e, el) => {
      if (!latestCtx) return;
      const { state, dispatch, sfx, isSpectator } = latestCtx;

      // Allow replay shatter even for spectators
      if (el.id === 'ss-replay-shatter') {
        sfx.play('eliminate');
        launchShatterParticles(container);
        return;
      }

      if (isSpectator) return;

      // Act 1 hotspots
      if (el.dataset.act1) {
        const target = el.dataset.act1;
        if (target === 'painting') {
          sfx.play('click');
          dispatch({ type: 'INSPECT_PAINTING' });
        } else if (target === 'lamp') {
          sfx.play('click');
          dispatch({ type: 'TOGGLE_LAMP' });
        } else if (target === 'vanity') {
          sfx.play('pieceGain');
          dispatch({ type: 'SEARCH_VANITY' });
        } else if (target === 'outlet') {
          sfx.play('bid');
          dispatch({ type: 'INSPECT_OUTLET' });
        }
        return;
      }

      if (el.id === 'ss-test-voltage') {
        sfx.play('error');
        Motion.shake(el);
        dispatch({ type: 'TEST_VOLTAGE' });
        return;
      }
      if (el.id === 'ss-screw-top') {
        sfx.play('bid');
        dispatch({ type: 'REMOVE_SCREW', payload: { which: 'top' } });
        return;
      }
      if (el.id === 'ss-screw-bot') {
        sfx.play('bid');
        dispatch({ type: 'REMOVE_SCREW', payload: { which: 'bottom' } });
        return;
      }
      if (el.id === 'ss-insert-relay' || el.id === 'ss-insert-relay-btn') {
        sfx.play('reveal');
        dispatch({ type: 'INSERT_RELAY_PIECE' });
        return;
      }
      if (el.id === 'ss-to-act2') {
        sfx.play('cardFlip');
        dispatch({ type: 'ADVANCE_TO_ACT2' });
        return;
      }

      // Act 2
      if (el.id === 'ss-uv-max') {
        sfx.play('reveal');
        dispatch({ type: 'SET_UV_DIMMER', payload: { value: 95 } });
        return;
      }
      if (el.dataset.act2 === 'dot' || el.id === 'ss-inspect-dot-btn') {
        if (state.alcove.uvRevealed) {
          sfx.play('pieceGain');
          dispatch({ type: 'INSPECT_QUESTION_DOT' });
        }
        return;
      }
      if (el.id === 'ss-peel-btn') {
        sfx.play('cardFlip');
        dispatch({ type: 'PEEL_WALLPAPER' });
        return;
      }
      if (el.id === 'ss-to-act3') {
        sfx.play('reveal');
        uiState.lastFeedback = null;
        dispatch({ type: 'ADVANCE_TO_ACT3' });
        return;
      }

      // Act 3
      if (el.dataset.pickPiece) {
        sfx.play('click');
        uiState.selectedPieceId = Number(el.dataset.pickPiece);
        uiState.lastFeedback = null;
        renderStage(container, latestCtx);
        return;
      }
      if (el.id === 'ss-rotate-btn') {
        if (!uiState.selectedPieceId) return;
        sfx.play('bid');
        dispatch({ type: 'ROTATE_PIECE', payload: { pieceId: uiState.selectedPieceId } });
        return;
      }
      if (el.dataset.vaultSlot !== undefined) {
        const slotIdx = Number(el.dataset.vaultSlot);
        if (state.vault.sockets[slotIdx]?.lockedPieceId !== null) return;
        if (!uiState.selectedPieceId) return;
        dispatch({
          type: 'PLACE_VAULT_PIECE',
          payload: { pieceId: uiState.selectedPieceId, slotIdx },
        });
        return;
      }
      if (el.id === 'ss-vault-hint') {
        sfx.play('reveal');
        dispatch({ type: 'VAULT_HINT' });
        return;
      }
      if (el.id === 'ss-vault-auto1') {
        sfx.play('pieceGain');
        dispatch({ type: 'VAULT_AUTO_SEAT_ONE' });
        return;
      }
      if (el.id === 'ss-board-elevator') {
        sfx.play('reveal');
        dispatch({ type: 'BOARD_ELEVATOR' });
        return;
      }

      // Act 4
      if (el.id === 'ss-descend-btn') {
        sfx.play('tilePlace');
        dispatch({ type: 'DESCEND_ELEVATOR' });
        return;
      }
      if (el.id === 'ss-tear-talisman') {
        sfx.play('cardFlip');
        setTimeout(() => sfx.play('reveal'), 140);
        dispatch({ type: 'TEAR_TALISMAN' });
        return;
      }
      if (el.id === 'ss-breach-btn') {
        if (!uiState.armBreachConfirm) {
          sfx.play('tickUrgent');
          Motion.shake(el);
          uiState.armBreachConfirm = true;
          renderStage(container, latestCtx);
          return;
        }
        uiState.armBreachConfirm = false;
        sfx.play('eliminate');
        setTimeout(() => sfx.play('pieceGain'), 260);
        dispatch({ type: 'BREACH_CURSE_BARRIER' });
        return;
      }
      if (el.id === 'ss-walk-btn') {
        uiState.armBreachConfirm = false;
        sfx.play('reveal');
        dispatch({ type: 'WALK_AWAY' });
        return;
      }

      // Act 5
      if (el.id === 'ss-conclude-btn') {
        sfx.play('victory');
        dispatch({ type: 'CONCLUDE_ARCHIVE' });
      }
    },
    'ss-click'
  );

  Motion.delegate(
    container,
    'change',
    '#ss-uv-range',
    (_e, slider) => {
      if (!latestCtx || latestCtx.isSpectator) return;
      latestCtx.sfx.play('click');
      latestCtx.dispatch({ type: 'SET_UV_DIMMER', payload: { value: Number(slider.value) } });
    },
    'ss-uv-change'
  );
}

/* ==========================================================================
 * MASTER RENDER
 * ========================================================================== */

function renderStage(container, ctx) {
  latestStageEl = container;
  latestCtx = ctx;
  setupDelegatedHandlers(container);
  const { state, lang } = ctx;

  const actLabels = [
    { num: 1, zh: 'I · 假插座', en: 'I · Fake Outlet' },
    { num: 2, zh: 'II · 紫外 ?', en: 'II · UV ?' },
    { num: 3, zh: 'III · 12碎片锁', en: 'III · 12-Piece Lock' },
    { num: 4, zh: 'IV · 诅咒结界', en: 'IV · Curse Barrier' },
  ];

  let bodyHtml = '';
  if (state.act === 1) bodyHtml = renderAct1(ctx);
  else if (state.act === 2) bodyHtml = renderAct2(ctx);
  else if (state.act === 3) bodyHtml = renderAct3(ctx);
  else if (state.act === 4) bodyHtml = renderAct4(ctx);
  else bodyHtml = renderAct5(ctx);

  const recentDiscoveries = (state.discoveries || []).slice(-4).reverse();

  const html = `
    <div class="ss-root" data-motion-key="ss-root">
      <div class="ss-top-bar" data-motion-key="ss-top-bar">
        <div class="ss-stepper">
          ${actLabels
            .map((a) => {
              const cls = state.act > a.num ? 'is-done' : state.act === a.num ? 'is-active' : '';
              return `<span class="ss-step-pill ${cls}" data-motion-key="ss-step-${a.num}">${state.act > a.num ? '✓' : '◆'} ${UI.escapeHtml(a[lang])}</span>`;
            })
            .join('')}
        </div>

        <div class="ss-pouch">
          <span class="ss-stat-chip ${state.cursed ? 'is-cursed' : ''}" data-motion-key="ss-pouch-pieces">
            <span>${state.cursed ? '☠' : '◆'}</span>
            <span>${
              state.cursed
                ? lang === 'zh'
                  ? '0 碎片 (永久诅咒)'
                  : '0 PIECES (CURSED)'
                : lang === 'zh'
                ? `持有碎片：${state.piecesHeld}`
                : `Pieces: ${state.piecesHeld}`
            }</span>
          </span>
          ${
            state.suite.hasPryTool && state.act === 1
              ? `<span class="ss-stat-chip is-tool" data-motion-key="ss-pouch-tool">🗝 ${lang === 'zh' ? '黄铜撬针' : 'Brass Pin'}</span>`
              : ''
          }
          ${
            state.prizeTokensClaimed > 0
              ? `<span class="ss-stat-chip is-prize" data-motion-key="ss-pouch-prize">♛ +200M KRW</span>`
              : ''
          }
        </div>
      </div>

      ${bodyHtml}

      ${
        recentDiscoveries.length
          ? `
            <div class="ss-discovery-log" data-motion-key="ss-discovery-log">
              <div style="font-size:11px;letter-spacing:0.12em;color:var(--dp-brass);font-weight:700;margin-bottom:4px;">
                ${lang === 'zh' ? '密室探索线索记录' : 'INVESTIGATION NOTES'}
              </div>
              ${recentDiscoveries
                .map((d) => `<div class="ss-discovery-item">• ${UI.escapeHtml(d[lang])}</div>`)
                .join('')}
            </div>
          `
          : ''
      }
    </div>
  `;

  Motion.patchDOM(container, html);

  if (state.act === 5 && state.ending === 'cursed_hero' && !uiState.shatterPlayedForMatch) {
    uiState.shatterPlayedForMatch = true;
    launchShatterParticles(container);
  }
}

// Live Dark <-> Light SVG & Canvas palette sync
Theme.onChange(() => {
  if (!latestStageEl || !latestCtx) return;
  renderStage(latestStageEl, latestCtx);
  if (latestCtx.state.act === 5 && latestCtx.state.ending === 'cursed_hero') {
    launchShatterParticles(latestStageEl);
  }
});

// Keyboard shortcut: Press R in Act 3 to rotate selected Devil's Piece +90°
window.addEventListener('keydown', (e) => {
  if (!latestCtx || latestCtx.isSpectator) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (latestCtx.state.act === 3 && !latestCtx.state.vault.unlocked && (e.key === 'r' || e.key === 'R')) {
    if (!uiState.selectedPieceId) return;
    e.preventDefault();
    SFX.play('bid');
    latestCtx.dispatch({ type: 'ROTATE_PIECE', payload: { pieceId: uiState.selectedPieceId } });
  }
});

mountGame({
  config: {
    id: 'secret-safe',
    title: { zh: '生活馆秘密金库', en: 'Living Quarters Secret Safe', ko: '생활동 비밀 금고' },
    category: 'HIDDEN STAGE',
    episode: 'EP 3–8',
    minPlayers: 1,
    maxPlayers: 4,
    defaultPlayers: 1,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'relaxedLock',
        label: { zh: '简化 12 碎片锁（免旋转角度对齐）', en: 'Relaxed 12-Piece Lock (Skip Rotation Alignment)' },
        type: 'boolean',
        default: false,
      },
      {
        key: 'startingPieces',
        label: { zh: '开局持有恶魔碎片数', en: 'Starting Devil\'s Pieces' },
        type: 'select',
        default: '12',
        choices: [
          { value: '12', label: { zh: '12 枚（原剧开启门槛）', en: '12 Pieces (Exact Threshold)' } },
          { value: '15', label: { zh: '15 枚（富裕玩家风险加倍）', en: '15 Pieces (Higher Sacrifice)' } },
          { value: '18', label: { zh: '18 枚（领跑者终极拷问）', en: '18 Pieces (Leader\'s Dilemma)' } },
        ],
      },
    ],
    rulesSummary: {
      zh: `### 生活馆隐藏密室关：秘密金库（EP 3–8）
- **第一幕 · 假插座机关**：在奢华生活馆中探索挂画、铜灯与梳妆台，拆开毫无电压反应的伪装假电源插座，嵌入 **1 枚恶魔碎片** 接通暗线电源。
- **第二幕 · 幽灵「?」显影**：调暗衣帽间壁灯聚焦隐藏紫外射灯，显影丝绸壁纸上的发光 **\`?\`** 符号，循底部圆点撕开秘密壁纸暗板。
- **第三幕 · 12 碎片互锁金库锁**：将 **12 枚带齿槽的恶魔碎片** 按齿码（\`I-A\`–\`VI-B\`）与方向箭头旋转对齐，逐一互锁嵌入黄铜转盘。**原剧设定：作为钥匙的 12 枚碎片不会消耗，开锁后悉数归还！**
- **第四幕 · 暗门电梯与「诅咒结界」**：乘胡桃木秘密电梯潜入 B1，撕下金色封印符箓直面 **2 枚奖金徽章（+2 亿韩元）**。
  - **破除结界**：立即为全员奖金池注入 +2 亿韩元，代价是**当前全部碎片当场粉碎归零，且永久受「碎片诅咒」不得再持有或使用任何碎片**！
  - **转身退场**：保留全部恶魔碎片，将秘密金库的真相封存于暗夜。
- **在线联机协同**：支持 1–4 人实时联机共同解谜，或观战好友探索！`,
      en: `### Living Quarters Hidden Escape Stage: Secret Safe (EP 3–8)
- **Act I · The Fake Outlet**: Search the luxury Living Quarters suite, discover the dead 0V fake electrical outlet beside the vanity, unscrew its faceplate, and insert **1 Devil's Piece** to energize the hidden relay.
- **Act II · Ultraviolet \`?\` Signal**: Dim the alcove sconces to focus the hidden UV spotlight, unveiling a luminous **\`?\`** emblem — trace its base dot and peel back the secret wallpaper seam.
- **Act III · 12-Piece Interlocking Vault Lock**: Rotate (\`R\` key) and match all **12 grooved Devil's Pieces** (\`I-A\`–\`VI-B\`) into the brass vault wheel. **Show canon: the 12 key Pieces are NOT consumed and return safely once unlocked!**
- **Act IV · Secret Elevator & Curse Barrier**: Descend to B1, tear off the Golden Talisman Seal, and face **2 Prize Tokens (+200M KRW)** sealed inside the **Curse Barrier**:
  - **Breach the Barrier**: Secure +200M KRW for the collective Grand Prize Pool at the eternal cost of shattering **all your Devil's Pieces to 0** and bearing the permanent Piece Curse.
  - **Step Back**: Keep all your Devil's Pieces intact and leave the vault sealed.
- **Online Co-op & Spectator**: Play solo (1p) or invite up to 4 friends to explore and solve together in real time!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render(container, ctx) {
    const ev = ctx.lastEvent;
    const evKey = ev ? `${ev.type}-${ev.ts || ''}-${ev.pieceId ?? ''}-${ev.slotIdx ?? ''}-${ev.lockedCount ?? ''}` : null;
    let shouldShakeMismatch = false;

    if (ev && evKey !== uiState.lastEventKey) {
      uiState.lastEventKey = evKey;

      if (ev.type === 'MATCH_START') {
        stopShatterAnim();
        uiState.selectedPieceId = null;
        uiState.armBreachConfirm = false;
        uiState.lastFeedback = null;
        uiState.shatterPlayedForMatch = false;
        uiState.pieceVisualRot = {};
      } else if (ev.type === 'VAULT_MISMATCH') {
        ctx.sfx.play('error');
        shouldShakeMismatch = true;
        uiState.lastFeedback =
          ev.reason === 'rotation'
            ? {
                tone: 'info',
                zh: '齿码完全吻合！请点击「旋转 90° (R)」将碎片蓝色箭头对准槽位方向后再嵌入。',
                en: 'Right groove profile! Press Rotate +90° (R) to match the socket\'s arrow direction before inserting.',
              }
            : {
                tone: 'error',
                zh: '齿槽不匹配！请核对碎片编号（如 I-A / IV-B）与金库凹槽刻码。',
                en: 'Groove mismatch! Match the Piece code (e.g. I-A / IV-B) to the recessed socket code.',
              };
      } else if (ev.type === 'VAULT_PIECE_LOCKED') {
        ctx.sfx.play('pieceGain');
        uiState.lastFeedback = {
          tone: 'success',
          zh: `咔嗒！碎片咬合成功，黄铜齿轮旋进 30°（${ev.lockedCount}/12）。`,
          en: `CLACK! Piece interlocked — brass gear advances 30° (${ev.lockedCount}/12).`,
        };
      } else if (ev.type === 'VAULT_UNLOCKED') {
        ctx.sfx.play('victory');
        uiState.lastFeedback = {
          tone: 'success',
          zh: '✦ 全部 12 枚碎片完美咬合！钥匙碎片已归还，秘密电梯门开启！',
          en: '✦ All 12 Pieces interlocked! Key Pieces returned — secret elevator open!',
        };
        ctx.log(
          ctx.lang === 'zh' ? '✦ 12 碎片互锁成功，秘密电梯开启！' : '✦ 12-Piece Vault Unlocked! Secret Elevator opened!',
          'system'
        );
      } else if (ev.type === 'VAULT_HINT' && ev.hintedPair) {
        uiState.selectedPieceId = ev.hintedPair.pieceId;
        uiState.lastFeedback = {
          tone: 'info',
          zh: `蓝图提示：已高亮碎片与槽位 #${ev.hintedPair.slotIdx + 1}（目标朝向 ${rotArrow(ev.hintedPair.targetRotation)}）。`,
          en: `Blueprint Hint: Highlighted matching Piece & Socket #${ev.hintedPair.slotIdx + 1} (target ${rotArrow(ev.hintedPair.targetRotation)}).`,
        };
      } else if (ev.type === 'CURSE_BREACHED') {
        ctx.log(
          ctx.lang === 'zh'
            ? `☠ 诅咒结界破除！总奖金池 +2 亿韩元，${ev.shattered} 枚恶魔碎片永久粉碎！`
            : `☠ Curse Barrier breached! +200M KRW to prize pool; ${ev.shattered} Pieces shattered forever!`,
          'alert'
        );
      }
    }

    renderStage(container, ctx);

    if (shouldShakeMismatch) {
      Motion.shake(container.querySelector('#ss-feedback-banner'));
      if (uiState.selectedPieceId) {
        Motion.shake(container.querySelector(`[data-motion-key="ss-piece-${uiState.selectedPieceId}"]`));
      }
    }
  },
});

/**
 * Broadcast Game Shell & Shared UI Toolkit ("The Genius: Death Match Arena")
 *
 * Exposes:
 *  - UI helpers: toast, escapeHtml, formatTime, renderGarnetBadge, renderPieceBadge, el, confirm
 *  - mountGame({ config, rules, root, render }): wires GameEngine + Broadcast HUD + Theme/Motion +
 *    VS Nameplate Strip + Death Match VS Clash + Survivor/Eliminated Verdict + Lobby + Rules + Chat
 */

import { I18n } from '../i18n.js';
import { SFX } from '../audio/sound-engine.js';
import { GarnetVault } from '../vault.js';
import { Theme } from '../theme.js';
import { Motion } from './motion.js';
import { GameEngine } from '../net/game-engine.js';
import {
  normalizeRoomCode,
  formatRoomCodeDisplay,
  sanitizePlayerName,
} from '../net/protocol.js';
import { showPrivacyCurtain, removePrivacyCurtain } from './privacy-curtain.js';

const NAME_STORAGE_KEY = 'tgm_player_name';

// Crisp 18x18 stroke SVG icon library for smooth Motion.morphIcon transitions
const ICONS = {
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  volOn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  volOff: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  waveOn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h3l2-6 4 12 3-8 2 2h6"/></svg>`,
  waveOff: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h4l2-3 4 6 2-3h8" opacity="0.55"/></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  menu: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
};

function getSavedName() {
  try {
    return sanitizePlayerName(localStorage.getItem(NAME_STORAGE_KEY) || '', '');
  } catch (_) {
    return '';
  }
}

function savePlayerName(name) {
  try {
    const clean = sanitizePlayerName(name, '');
    if (clean) localStorage.setItem(NAME_STORAGE_KEY, clean);
  } catch (_) {}
}

let toastStackEl = null;
function getToastStack() {
  if (!toastStackEl || !document.body.contains(toastStackEl)) {
    toastStackEl = document.createElement('div');
    toastStackEl.className = 'tg-toast-stack';
    toastStackEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastStackEl);
  }
  return toastStackEl;
}

function dismissToast(el) {
  if (!el || el.dataset.exiting === '1') return;
  el.dataset.exiting = '1';
  el.classList.add('is-exiting');
  setTimeout(() => el.remove(), 190);
}

export const UI = {
  escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  formatTime(ms) {
    if (ms == null || Number.isNaN(ms)) return '--:--';
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  renderGarnetBadge(count, { black = false } = {}) {
    return `<span class="tg-garnet ${black ? 'tg-black-garnet' : ''}" title="${black ? 'Black Garnet' : 'Garnets'}"><span class="tg-garnet-gem" aria-hidden="true"></span><span>${Number(count) || 0}</span></span>`;
  },

  renderPieceBadge(count) {
    return UI.renderGarnetBadge(count);
  },

  toast(message, tone = 'info', durationMs = 2600) {
    const stack = getToastStack();
    const active = Array.from(stack.querySelectorAll('.tg-toast:not([data-exiting="1"])'));
    if (active.length >= 3) {
      dismissToast(active[0]);
    }
    const playFlip = Motion.flipList(stack, '.tg-toast', { duration: 180 });
    const el = document.createElement('div');
    el.className = `tg-toast ${tone === 'error' ? 'is-error' : tone === 'success' ? 'is-success' : ''}`;
    el.dataset.flipKey = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    el.textContent = String(message);
    stack.appendChild(el);
    playFlip();
    setTimeout(() => dismissToast(el), durationMs);
  },

  el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class' || k === 'className') node.className = v;
      else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'dataset' && typeof v === 'object') {
        Object.assign(node.dataset, v);
      } else {
        node.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.appendChild(
        typeof child === 'string' || typeof child === 'number'
          ? document.createTextNode(String(child))
          : child
      );
    }
    return node;
  },

  confirm(title, body) {
    return new Promise((resolve) => {
      const prevFocus = document.activeElement;
      const backdrop = document.createElement('div');
      backdrop.className = 'tg-modal-backdrop';
      backdrop.style.zIndex = '106';
      backdrop.innerHTML = `
        <div class="tg-modal" style="width:min(420px,100%);" role="dialog" aria-modal="true">
          <h3 class="tg-modal-title" style="font-size:18px;margin-bottom:8px;">${UI.escapeHtml(title)}</h3>
          <p style="color:var(--tg-ink-muted);margin:0 0 18px;font-size:14px;">${UI.escapeHtml(body)}</p>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="tg-btn tg-btn-ghost" data-ans="no">${I18n.t({ zh: '取消', en: 'Cancel' })}</button>
            <button type="button" class="tg-btn tg-btn-garnet" data-ans="yes">${I18n.t({ zh: '确认', en: 'Confirm' })}</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      Motion.transitionPresence(backdrop, true, { preset: 'modal' });

      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKey);
        Motion.transitionPresence(backdrop, false, {
          preset: 'modal',
          removeOnExit: true,
          onAfterExit: () => {
            if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
            resolve(ok);
          },
        });
      };
      const onKey = (e) => {
        if (e.key === 'Escape') finish(false);
      };
      document.addEventListener('keydown', onKey);
      backdrop.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ans]');
        if (!btn && e.target !== backdrop) return;
        finish(btn?.dataset.ans === 'yes');
      });
      backdrop.querySelector('[data-ans="yes"]')?.focus();
    });
  },
};

function renderMiniMarkdown(md) {
  const safe = UI.escapeHtml(md || '');
  const lines = safe.split(/\r?\n/);
  let html = '';
  let inList = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h3>${formatInline(line.slice(4))}</h3>`;
    } else if (line.startsWith('## ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h3>${formatInline(line.slice(3))}</h3>`;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${formatInline(line.slice(2))}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<p>${formatInline(line)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function formatInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /`(.+?)`/g,
      '<code style="font-family:var(--tg-font-mono);color:var(--tg-gold-bright);">$1</code>'
    );
}

function difficultyLabel(diff, lang) {
  if (diff === 'easy') return lang === 'zh' ? '入门 AI' : 'Easy AI';
  if (diff === 'grand_final') return lang === 'zh' ? '总决赛 AI' : 'Grand Final AI';
  return lang === 'zh' ? '天才 AI' : 'Genius AI';
}

function launchVerdictParticles(canvas, isSurvivor) {
  if (!canvas || Motion.reduced()) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let rafId = null;
  let running = true;
  const startedAt = performance.now();
  const MAX_DURATION_MS = 6000;

  let w = 0;
  let h = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const count = isSurvivor ? 72 : 52;
  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: isSurvivor ? Math.random() * -h * 0.5 : h + Math.random() * 140,
    vx: (Math.random() - 0.5) * (isSurvivor ? 2.2 : 1.0),
    vy: isSurvivor ? 1.8 + Math.random() * 3.1 : -(1.1 + Math.random() * 2.4),
    size: 4 + Math.random() * 6,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.12,
    alpha: 0.72 + Math.random() * 0.24,
    color: isSurvivor
      ? ['#fff0c2', '#e4b95b', '#ff2e54', '#22d3ee'][Math.floor(Math.random() * 4)]
      : ['#ff2e54', '#d91b3a', '#7a091e', '#ff8598'][Math.floor(Math.random() * 4)],
  }));

  const tick = (now) => {
    if (!running) return;
    if (document.hidden) {
      rafId = null;
      return;
    }
    const elapsed = now - startedAt;
    if (elapsed > MAX_DURATION_MS) {
      ctx.clearRect(0, 0, w, h);
      running = false;
      return;
    }
    const fadeOut = elapsed > MAX_DURATION_MS - 1200 ? Math.max(0, (MAX_DURATION_MS - elapsed) / 1200) : 1;
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (isSurvivor && p.y > h + 20) {
        p.y = -16;
        p.x = Math.random() * w;
      } else if (!isSurvivor && p.y < -20) {
        p.y = h + 16;
        p.x = Math.random() * w;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha * fadeOut;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.68, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size * 0.68, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    rafId = requestAnimationFrame(tick);
  };

  const onVis = () => {
    if (!document.hidden && running && rafId == null) {
      rafId = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', onVis);
  rafId = requestAnimationFrame(tick);

  return () => {
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
  };
}

export function mountGame({ config, rules, root, render }) {
  Theme.init();
  const container = root || document.getElementById('game-root') || document.body;
  document.body.classList.add('tg-body');

  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomParam = normalizeRoomCode(urlParams.get('room') || '');
  const initialSpectate = urlParams.get('mode') === 'spectate';
  const initialQuickMode = urlParams.get('quick');
  const transportPref = urlParams.get('transport') || 'auto';

  let sidebarCollapsed = window.innerWidth < 960;
  let rulesOpen = false;
  let lobbyTab = initialRoomParam ? 'online' : 'solo';
  let lobbyOnlineJoined = false;
  let lobbyBusy = false;
  let lobbyError = '';
  let playerNameInput = urlParams.get('name') || getSavedName() || '';
  let roomCodeInput = initialRoomParam;
  let aiDifficulty = 'genius';
  let soloCount = config.defaultPlayers || config.minPlayers || 2;
  let hotseatNames = [
    playerNameInput || (I18n.getLang() === 'zh' ? '玩家 1' : 'Player 1'),
    I18n.getLang() === 'zh' ? '玩家 2' : 'Player 2',
  ];
  let hotseatBots = 0;
  let localOptions = {};
  for (const f of config.optionsSchema || []) localOptions[f.key] = f.default;

  const feedItems = [];
  let latestSnap = null;
  let lastPhase = null;
  let lastTickedSec = null;
  let customTelemetry = null;
  let lastRecordedMatchSeq = null;
  let lastVaultOutcome = null;
  let stopParticles = null;
  let clashTimerId = null;
  let roomCopyTimer = null;
  let currentOverlayKind = null; // 'lobby-entry' | 'lobby-room' | 'verdict' | null
  let vsRenderedSeatKey = '';
  let lastThemeIcon = null;
  let lastMuteIcon = null;
  let lastAmbIcon = null;

  const seasonsBadge = Array.isArray(config.seasons)
    ? config.seasons.join(' · ')
    : config.season || config.episode || 'DEATH MATCH';

  container.innerHTML = `
    <div class="tg-shell">
      <header class="tg-hud">
        <div class="tg-hud-left">
          <a class="tg-hud-back" href="../../" id="tg-back-hub">← <span data-i18n-hub>殿堂</span></a>
          <span class="tg-badge tg-badge-garnet tg-hud-season-pill">${UI.escapeHtml(seasonsBadge)}</span>
          <span class="tg-hud-title" id="tg-hud-title"></span>
        </div>
        <div class="tg-hud-center">
          <span class="tg-hud-telemetry" id="tg-hud-telemetry" hidden></span>
          <div class="tg-hud-timer" id="tg-hud-timer" hidden>
            <span aria-hidden="true">⏱</span>
            <span id="tg-hud-timer-text">00:00</span>
            <span class="tg-hud-timer-bar" id="tg-hud-timer-bar"></span>
          </div>
          <span id="tg-hud-stakes" hidden></span>
          <button type="button" class="tg-room-chip" id="tg-room-chip" hidden title="Copy Invite Link">
            <span id="tg-room-code-label"></span>
            <span class="tg-icon-slot" id="tg-room-copy-icon">${ICONS.copy}</span>
          </button>
          <span class="tg-conn-pill" id="tg-conn-pill">
            <span class="tg-conn-dot"></span>
            <span id="tg-conn-text">就绪</span>
          </span>
        </div>
        <div class="tg-hud-right">
          <button type="button" class="tg-profile-pill" id="tg-btn-profile" title="Edit Player Name">
            <span class="tg-garnet-gem" style="width:9px;height:11px;" aria-hidden="true"></span>
            <span class="tg-profile-pill-name" id="tg-profile-name"></span>
            <span style="color:var(--tg-gold-bright);font-size:11px;" aria-hidden="true">✎</span>
          </button>
          <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="tg-btn-lobby"></button>
          <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="tg-btn-rules">?</button>
          <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost tg-lang-pill" id="tg-btn-lang"></button>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-btn-theme"><span class="tg-icon-slot" id="tg-icon-theme"></span></button>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-btn-ambience"><span class="tg-icon-slot" id="tg-icon-ambience"></span></button>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-btn-mute"><span class="tg-icon-slot" id="tg-icon-mute"></span></button>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-btn-sidebar" title="Toggle Roster & Log">${ICONS.menu}</button>
        </div>
      </header>

      <div class="tg-vs-strip" id="tg-vs-strip" hidden></div>

      <div class="tg-workspace ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}" id="tg-workspace">
        <main class="tg-stage" id="tg-stage"></main>
        <div class="tg-sidebar-backdrop" id="tg-sidebar-backdrop" aria-hidden="true"></div>
        <aside class="tg-sidebar" id="tg-sidebar">
          <div class="tg-sidebar-section">
            <div class="tg-sidebar-label">
              <span id="tg-roster-heading"></span>
              <span style="display:inline-flex;align-items:center;gap:8px;">
                <span id="tg-roster-count">0</span>
                <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost tg-sidebar-close" id="tg-sidebar-close" aria-label="Close sidebar" style="width:28px;height:28px;min-height:28px;font-size:13px;">✕</button>
              </span>
            </div>
            <div class="tg-roster-list" id="tg-roster-list"></div>
          </div>
          <div class="tg-feed">
            <div class="tg-sidebar-label"><span id="tg-feed-heading"></span></div>
            <div class="tg-feed-list" id="tg-feed-list"></div>
            <form class="tg-chat-form" id="tg-chat-form">
              <input class="tg-input" id="tg-chat-input" type="text" maxlength="160" autocomplete="off" />
              <button class="tg-btn tg-btn-sm tg-btn-garnet" type="submit" id="tg-chat-send">→</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
    <div id="tg-clash-root"></div>
    <div id="tg-overlay-root"></div>
    <div id="tg-drawer-root"></div>
  `;

  const stageEl = container.querySelector('#tg-stage');
  const clashRoot = container.querySelector('#tg-clash-root');
  const overlayRoot = container.querySelector('#tg-overlay-root');
  const drawerRoot = container.querySelector('#tg-drawer-root');
  const workspaceEl = container.querySelector('#tg-workspace');
  const vsStripEl = container.querySelector('#tg-vs-strip');
  const hudTitleEl = container.querySelector('#tg-hud-title');
  const hudTelemetryEl = container.querySelector('#tg-hud-telemetry');
  const hudTimerEl = container.querySelector('#tg-hud-timer');
  const hudTimerTextEl = container.querySelector('#tg-hud-timer-text');
  const hudTimerBarEl = container.querySelector('#tg-hud-timer-bar');
  const hudStakesEl = container.querySelector('#tg-hud-stakes');
  const roomChipEl = container.querySelector('#tg-room-chip');
  const roomCodeLabelEl = container.querySelector('#tg-room-code-label');
  const roomCopyIconEl = container.querySelector('#tg-room-copy-icon');
  const connPillEl = container.querySelector('#tg-conn-pill');
  const connTextEl = container.querySelector('#tg-conn-text');
  const rosterListEl = container.querySelector('#tg-roster-list');
  const rosterCountEl = container.querySelector('#tg-roster-count');
  const feedListEl = container.querySelector('#tg-feed-list');
  const chatInputEl = container.querySelector('#tg-chat-input');

  const btnLang = container.querySelector('#tg-btn-lang');
  const btnTheme = container.querySelector('#tg-btn-theme');
  const iconTheme = container.querySelector('#tg-icon-theme');
  const btnMute = container.querySelector('#tg-btn-mute');
  const iconMute = container.querySelector('#tg-icon-mute');
  const btnAmb = container.querySelector('#tg-btn-ambience');
  const iconAmb = container.querySelector('#tg-icon-ambience');
  const btnProfile = container.querySelector('#tg-btn-profile');
  const profileNameEl = container.querySelector('#tg-profile-name');

  function pushFeed(text, kind = 'system', author = null) {
    feedItems.push({ text, kind, author, ts: Date.now() });
    if (feedItems.length > 80) feedItems.shift();
    renderFeed();
  }

  function renderFeed() {
    feedListEl.innerHTML = feedItems
      .map((item) => {
        const cls = item.kind === 'alert' ? 'is-alert' : item.kind === 'system' ? 'is-system' : '';
        const prefix = item.author
          ? `<strong style="color:var(--tg-gold-bright);">${UI.escapeHtml(item.author)}: </strong>`
          : '';
        return `<div class="tg-feed-item ${cls}">${prefix}${UI.escapeHtml(item.text)}</div>`;
      })
      .join('');
    feedListEl.scrollTop = feedListEl.scrollHeight;
  }

  function buildInviteUrl(code) {
    const base = new URL(window.location.href);
    base.search = '';
    base.hash = '';
    base.searchParams.set('room', code);
    return base.toString();
  }

  async function copyInviteUrl(code, triggerBtn = null, iconSlot = null, labelSlot = null) {
    const url = buildInviteUrl(code);
    const displayCode = formatRoomCodeDisplay(code);
    const isZh = I18n.getLang() === 'zh';
    try {
      await navigator.clipboard.writeText(url);
      SFX.play('garnetClink');
      if (triggerBtn) Motion.pulseConfirm(triggerBtn, { tone: 'emerald' });
      if (iconSlot) {
        Motion.morphIcon(iconSlot, ICONS.check, {
          revertAfterMs: 1800,
          revertSvgHtml: ICONS.copy,
        });
      }
      if (labelSlot) {
        clearTimeout(roomCopyTimer);
        labelSlot.textContent = isZh ? '已复制' : 'Copied';
        roomCopyTimer = setTimeout(() => {
          if (engine.roomCode) labelSlot.textContent = formatRoomCodeDisplay(engine.roomCode);
        }, 1800);
      }
      UI.toast(isZh ? '邀请链接已复制' : 'Invite link copied', 'success');
    } catch (_) {
      UI.toast(`${isZh ? '房间码：' : 'Room: '}${displayCode}`);
    }
  }

  function clearClashSplash(immediate = false) {
    clearTimeout(clashTimerId);
    clashTimerId = null;
    const el = clashRoot.querySelector('#tg-clash-overlay');
    if (!el) return;
    if (immediate) {
      clashRoot.innerHTML = '';
      return;
    }
    el.classList.add('is-exiting');
    setTimeout(() => {
      if (clashRoot.contains(el)) clashRoot.innerHTML = '';
    }, 170);
  }

  function showClashSplash(seats) {
    clearClashSplash(true);
    const lang = I18n.getLang();
    const p1 = seats[0]?.name || (lang === 'zh' ? '参赛者 1' : 'Player 1');
    const p2 = seats[1]?.name || (lang === 'zh' ? '参赛者 2' : 'Player 2');
    const extra = seats.length > 2 ? ` +${seats.length - 2}` : '';
    clashRoot.innerHTML = `
      <div class="tg-clash-overlay" id="tg-clash-overlay" role="status">
        <div class="tg-clash-kicker">THE GENIUS · DEATH MATCH</div>
        <h2 class="tg-clash-heading">${lang === 'zh' ? '死亡对决' : 'DEATH MATCH'}</h2>
        <div class="tg-clash-row">
          <div class="tg-clash-side is-left">
            <div style="font-size:11px;color:#e4b95b;letter-spacing:0.12em;margin-bottom:4px;">${lang === 'zh' ? '挑战者' : 'CONTESTANT'}</div>
            <div class="tg-clash-pname">${UI.escapeHtml(p1)}</div>
          </div>
          <div class="tg-clash-vs">VS</div>
          <div class="tg-clash-side is-right">
            <div style="font-size:11px;color:#ff8ba0;letter-spacing:0.12em;margin-bottom:4px;">${seats[1]?.isBot ? difficultyLabel(engine.lobby.aiDifficulty, lang) : (lang === 'zh' ? '对手' : 'OPPONENT')}</div>
            <div class="tg-clash-pname">${UI.escapeHtml(p2 + extra)}</div>
          </div>
        </div>
      </div>
    `;
    const el = clashRoot.querySelector('#tg-clash-overlay');
    el?.addEventListener('click', () => clearClashSplash(false));
    clashTimerId = setTimeout(() => clearClashSplash(false), 1650);
  }

  const engine = new GameEngine({
    config,
    rules,
    onToast: (msg, tone) => {
      if (tone === 'error') SFX.play('error');
      UI.toast(msg, tone);
    },
    onChat: (entry) => {
      SFX.play('click');
      pushFeed(entry.text, 'chat', entry.fromName);
    },
    onPrivacyNeeded: (nextSeat) => {
      showPrivacyCurtain(nextSeat, () => {
        renderAll();
      });
    },
    onUpdate: (snap) => {
      const prevPhase = lastPhase;
      const nextPhase = snap.lobby?.phase || null;
      latestSnap = snap;
      lastPhase = nextPhase;

      if (nextPhase === 'playing' && prevPhase !== 'playing') {
        lastVaultOutcome = null;
        lastRecordedMatchSeq = null;
        SFX.play('clash');
        pushFeed(I18n.t({ zh: '死亡对决正式开始', en: 'Death Match started' }), 'alert');
        showClashSplash(snap.lobby.seats || []);
      }

      if (nextPhase === 'ended' && prevPhase !== 'ended') {
        const res = snap.result;
        const myId = snap.mySeatId;
        const winners = res?.winnerSeatIds || [];
        const isWin = Boolean(myId && winners.includes(myId));
        const isDraw = winners.length === 0;

        if (
          !snap.isSpectator &&
          snap.mode !== 'hotseat' &&
          lastRecordedMatchSeq !== snap.roomCode + '_' + engine.seq
        ) {
          lastRecordedMatchSeq = snap.roomCode + '_' + engine.seq;
          const opp = (snap.lobby.seats || []).find((s) => s.seatId !== myId)?.name || 'AI';
          lastVaultOutcome = GarnetVault.recordMatch({
            slug: config.id,
            title: config.title,
            outcome: isDraw ? 'draw' : isWin ? 'win' : 'loss',
            opponent: opp,
            mode: snap.mode,
            difficulty: snap.aiDifficulty,
          });
        }

        if (isWin) SFX.play('victory');
        else if (isDraw) SFX.play('reveal');
        else SFX.play('eliminate');

        pushFeed(I18n.t({ zh: '对决结束，最终裁决已公布', en: 'Match concluded. Final verdict.' }), 'alert');
      }

      renderAll();
    },
  });

  // HUD Controls
  container.querySelector('#tg-btn-rules').addEventListener('click', () => {
    SFX.play('click');
    rulesOpen = !rulesOpen;
    renderDrawer();
  });

  btnLang.addEventListener('click', () => {
    SFX.play('click');
    I18n.toggle();
  });

  btnTheme.addEventListener('click', () => {
    SFX.play('click');
    Theme.toggle();
  });

  function syncThemeAndAudioIcons(animate = false) {
    const lang = I18n.getLang();
    const isZh = lang === 'zh';
    const theme = Theme.get();
    const nextThemeIcon = theme === 'dark' ? 'sun' : 'moon';
    btnTheme.setAttribute(
      'aria-label',
      theme === 'dark'
        ? isZh ? '切换浅色模式' : 'Switch to Light Mode'
        : isZh ? '切换深色模式' : 'Switch to Dark Mode'
    );
    btnTheme.title = btnTheme.getAttribute('aria-label');
    if (lastThemeIcon !== nextThemeIcon) {
      lastThemeIcon = nextThemeIcon;
      if (animate) Motion.morphIcon(iconTheme, ICONS[nextThemeIcon]);
      else iconTheme.innerHTML = ICONS[nextThemeIcon];
    }

    const muted = SFX.isMuted();
    const nextMuteIcon = muted ? 'volOff' : 'volOn';
    btnMute.setAttribute('aria-pressed', String(!muted));
    btnMute.title = muted
      ? isZh ? '取消静音' : 'Unmute sound'
      : isZh ? '静音' : 'Mute sound';
    if (lastMuteIcon !== nextMuteIcon) {
      lastMuteIcon = nextMuteIcon;
      if (animate) Motion.morphIcon(iconMute, ICONS[nextMuteIcon]);
      else iconMute.innerHTML = ICONS[nextMuteIcon];
    }

    const ambActive = SFX.isAmbienceOn() && !muted;
    const nextAmbIcon = ambActive ? 'waveOn' : 'waveOff';
    btnAmb.setAttribute('aria-pressed', String(ambActive));
    btnAmb.style.color = ambActive ? 'var(--tg-garnet-bright)' : '';
    btnAmb.style.borderColor = ambActive ? 'var(--tg-border-garnet)' : '';
    btnAmb.title = isZh ? '演播室氛围音' : 'Studio ambience';
    if (lastAmbIcon !== nextAmbIcon) {
      lastAmbIcon = nextAmbIcon;
      if (animate) Motion.morphIcon(iconAmb, ICONS[nextAmbIcon]);
      else iconAmb.innerHTML = ICONS[nextAmbIcon];
    }

    btnLang.innerHTML = isZh
      ? `<span class="is-active-lang">中</span><span class="is-inactive-lang">/</span><span class="is-inactive-lang">EN</span>`
      : `<span class="is-inactive-lang">中</span><span class="is-inactive-lang">/</span><span class="is-active-lang">EN</span>`;
  }

  btnMute.addEventListener('click', () => {
    SFX.toggleMute();
    syncThemeAndAudioIcons(true);
  });

  btnAmb.addEventListener('click', () => {
    const on = SFX.toggleAmbience();
    syncThemeAndAudioIcons(true);
    UI.toast(
      on
        ? I18n.t({ zh: '演播室氛围音已开启', en: 'Studio ambience on' })
        : I18n.t({ zh: '演播室氛围音已关闭', en: 'Studio ambience off' })
    );
  });

  function getCurrentDisplayName() {
    const lang = I18n.getLang();
    if (latestSnap) {
      const seatId = latestSnap.activeSeatId || latestSnap.mySeatId;
      const seat = latestSnap.lobby?.seats?.find((s) => s.seatId === seatId);
      if (seat?.name) return seat.name;
      const spec = latestSnap.lobby?.spectators?.find((sp) => sp.clientId === engine.clientId);
      if (spec?.name) return spec.name;
    }
    return playerNameInput.trim() || (lang === 'zh' ? '挑战者' : 'Challenger');
  }

  function openRenameModal() {
    document.getElementById('tg-rename-modal')?.remove();
    const prevFocus = document.activeElement;
    const lang = I18n.getLang();
    const current = getCurrentDisplayName();
    const backdrop = document.createElement('div');
    backdrop.className = 'tg-modal-backdrop';
    backdrop.id = 'tg-rename-modal';
    backdrop.style.zIndex = '105';
    backdrop.innerHTML = `
      <div class="tg-modal" style="width:min(420px,100%);" role="dialog" aria-modal="true">
        <div class="tg-modal-header" style="margin-bottom:12px;">
          <div>
            <span class="tg-badge tg-badge-gold">${lang === 'zh' ? '参赛身份' : 'CONTESTANT ID'}</span>
            <h3 class="tg-modal-title" style="font-size:19px;">${lang === 'zh' ? '修改参赛代号' : 'Edit Player Name'}</h3>
          </div>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-rename-close" aria-label="Close">✕</button>
        </div>
        <form id="tg-rename-form">
          <input class="tg-input" id="tg-rename-input" type="text" maxlength="20" value="${UI.escapeHtml(current)}" placeholder="${lang === 'zh' ? '输入你的代号（最多 20 字）' : 'Enter your name (max 20 chars)'}" autocomplete="nickname" />
          <p style="font-size:12px;color:var(--tg-ink-muted);margin:8px 0 16px;">
            ${
              latestSnap && engine.mode === 'online'
                ? lang === 'zh'
                  ? '修改后将实时同步给房间内所有参赛者。'
                  : 'Syncs immediately to everyone in the room.'
                : lang === 'zh'
                ? '将自动保存并在全四季死亡对决中通用。'
                : 'Saved automatically across all Death Match games.'
            }
          </p>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="tg-btn tg-btn-ghost" id="tg-rename-cancel">${lang === 'zh' ? '取消' : 'Cancel'}</button>
            <button type="submit" class="tg-btn tg-btn-garnet">${lang === 'zh' ? '保存' : 'Save'}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);
    Motion.transitionPresence(backdrop, true, { preset: 'modal' });

    const input = backdrop.querySelector('#tg-rename-input');
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      Motion.transitionPresence(backdrop, false, {
        preset: 'modal',
        removeOnExit: true,
        onAfterExit: () => {
          if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
        },
      });
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    backdrop.querySelector('#tg-rename-close')?.addEventListener('click', close);
    backdrop.querySelector('#tg-rename-cancel')?.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    backdrop.querySelector('#tg-rename-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = sanitizePlayerName(input.value, '');
      if (!next) {
        SFX.play('error');
        Motion.nudgeError(input, { intensity: 'subtle' });
        UI.toast(lang === 'zh' ? '代号不能为空' : 'Name cannot be empty', 'error');
        input.focus();
        return;
      }
      SFX.play('click');
      if (engine.mode !== 'hotseat' || !latestSnap) {
        playerNameInput = next;
        savePlayerName(next);
        if (hotseatNames.length > 0) hotseatNames[0] = next;
      }
      if (latestSnap) engine.renameSelf(next);
      else renderAll();
      close();
      UI.toast(lang === 'zh' ? `代号已更新为 ${next}` : `Name updated to ${next}`, 'success');
    });

    input?.focus();
    input?.select();
  }

  btnProfile?.addEventListener('click', () => {
    SFX.play('click');
    openRenameModal();
  });

  const setSidebarCollapsed = (collapsed) => {
    sidebarCollapsed = Boolean(collapsed);
    workspaceEl.classList.toggle('is-sidebar-collapsed', sidebarCollapsed);
  };

  container.querySelector('#tg-btn-sidebar').addEventListener('click', () => {
    SFX.play('click');
    setSidebarCollapsed(!sidebarCollapsed);
  });
  container.querySelector('#tg-sidebar-close')?.addEventListener('click', () => {
    SFX.play('click');
    setSidebarCollapsed(true);
  });
  container.querySelector('#tg-sidebar-backdrop')?.addEventListener('click', () => {
    setSidebarCollapsed(true);
  });

  const mobileMq = window.matchMedia?.('(max-width: 960px)');
  const onMqChange = (e) => {
    if (e.matches) setSidebarCollapsed(true);
  };
  mobileMq?.addEventListener?.('change', onMqChange);

  container.querySelector('#tg-btn-lobby').addEventListener('click', async () => {
    SFX.play('click');
    if (latestSnap?.lobby?.phase === 'playing' || latestSnap?.lobby?.phase === 'ended') {
      const ok = await UI.confirm(
        I18n.t({ zh: '离开当前对局？', en: 'Leave current match?' }),
        I18n.t({
          zh: '进度不会保留，将返回房间设置。',
          en: "Progress won't be saved. You'll return to the room lobby.",
        })
      );
      if (!ok) return;
      clearClashSplash(true);
      stopParticles?.();
      stopParticles = null;
      if (engine.isHost && engine.mode === 'online') {
        engine.returnToLobby();
      } else {
        engine.destroy();
        lobbyOnlineJoined = false;
        latestSnap = null;
        lastPhase = null;
        renderAll();
      }
    }
  });

  roomChipEl.addEventListener('click', () => {
    if (engine.roomCode && engine.mode === 'online') {
      copyInviteUrl(engine.roomCode, roomChipEl, roomCopyIconEl, roomCodeLabelEl);
    }
  });

  container.querySelector('#tg-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = chatInputEl.value.trim();
    if (!val) return;
    chatInputEl.value = '';
    engine.sendChat(val);
  });

  // 60fps requestAnimationFrame countdown bar drain (throttled text + SFX at 1s boundaries)
  let timerRafId = null;
  let timerVisible = false;
  const tickTimerRaf = () => {
    if (!latestSnap || latestSnap.lobby.phase !== 'playing') {
      if (timerVisible) {
        timerVisible = false;
        Motion.transitionPresence(hudTimerEl, false, { preset: 'pill' });
      }
      lastTickedSec = null;
    } else {
      const rem = engine.getRemainingTimerMs();
      if (rem == null) {
        if (timerVisible) {
          timerVisible = false;
          Motion.transitionPresence(hudTimerEl, false, { preset: 'pill' });
        }
        lastTickedSec = null;
      } else {
        if (!timerVisible) {
          timerVisible = true;
          Motion.transitionPresence(hudTimerEl, true, { preset: 'pill' });
        }
        const dur = Math.max(1000, latestSnap.timer?.durationMs || 30000);
        const ratio = Math.max(0, Math.min(1, rem / dur));
        if (hudTimerBarEl) hudTimerBarEl.style.transform = `scaleX(${ratio})`;

        const sec = Math.ceil(rem / 1000);
        if (sec !== lastTickedSec) {
          lastTickedSec = sec;
          hudTimerTextEl.textContent = UI.formatTime(rem);
          hudTimerEl.classList.toggle('is-warn', sec <= 10 && sec > 5);
          hudTimerEl.classList.toggle('is-urgent', sec <= 5 && sec > 0);
          if (sec > 0 && sec <= 5) SFX.play('tickUrgent');
          else if (sec > 5 && sec <= 10) SFX.play('tick');
        }
      }
    }
    timerRafId = requestAnimationFrame(tickTimerRaf);
  };
  timerRafId = requestAnimationFrame(tickTimerRaf);

  // In-place VS Strip patching (zero innerHTML nuke on every turn)
  function renderVsStrip() {
    if (!latestSnap || latestSnap.lobby.phase === 'lobby') {
      if (!vsStripEl.hidden) {
        Motion.transitionPresence(vsStripEl, false, { preset: 'fade', duration: 150 });
      }
      return;
    }
    const lang = I18n.getLang();
    const seats = latestSnap.lobby.seats || [];
    const st = latestSnap.state || {};
    const turnId = st.currentTurnSeatId || st.activeSeatId || st.turnSeatId || null;
    const myId = latestSnap.activeSeatId || latestSnap.mySeatId;

    if (vsStripEl.hidden) {
      Motion.transitionPresence(vsStripEl, true, { preset: 'fade', duration: 200 });
    }

    const seatKey = seats.map((s) => s.seatId).join('|');
    if (vsRenderedSeatKey !== seatKey) {
      vsRenderedSeatKey = seatKey;
      const buildCard = (s, compact) => `
        <div class="tg-vs-card" data-vs-seat="${UI.escapeHtml(s.seatId)}" ${compact ? 'style="min-width:128px;"' : ''}>
          <span class="tg-vs-avatar">${UI.escapeHtml(s.avatar || '♦')}</span>
          <div class="tg-vs-meta">
            <span class="tg-vs-name"></span>
            <span class="tg-vs-sub"></span>
          </div>
        </div>
      `;
      if (seats.length === 2) {
        vsStripEl.innerHTML = `${buildCard(seats[0], false)}<span class="tg-vs-emblem">VS</span>${buildCard(seats[1], false)}`;
      } else {
        vsStripEl.innerHTML = seats.map((s) => buildCard(s, true)).join('');
      }
    }

    for (const s of seats) {
      const card = vsStripEl.querySelector(`[data-vs-seat="${CSS.escape(s.seatId)}"]`);
      if (!card) continue;
      const isMe = s.seatId === myId;
      const isTurn = turnId === s.seatId && latestSnap.lobby.phase === 'playing';
      card.classList.toggle('is-me', isMe);
      card.classList.toggle('is-turn', isTurn);
      const nameEl = card.querySelector('.tg-vs-name');
      const subEl = card.querySelector('.tg-vs-sub');
      if (nameEl) nameEl.textContent = s.name;
      if (subEl) {
        if (seats.length === 2) {
          const base = s.isBot
            ? difficultyLabel(s.difficulty || latestSnap.aiDifficulty, lang)
            : !s.connected
            ? lang === 'zh' ? '已断开' : 'Offline'
            : isMe
            ? lang === 'zh' ? '你' : 'You'
            : lang === 'zh' ? '对手' : 'Rival';
          subEl.textContent = isTurn ? `${base} · ${lang === 'zh' ? '行动中' : 'Turn'}` : base;
        } else {
          subEl.textContent = s.isBot ? 'AI' : isMe ? (lang === 'zh' ? '你' : 'You') : 'Live';
        }
      }
    }
  }

  let prevTelemetryVisible = false;
  let prevStakesVisible = false;
  let prevRoomChipVisible = false;

  function renderHudAndSidebar() {
    const lang = I18n.getLang();
    const isZh = lang === 'zh';
    hudTitleEl.textContent = I18n.t(config.title);
    if (config.title?.ko) hudTitleEl.title = `${I18n.t(config.title)} (${config.title.ko})`;
    if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
    container.querySelector('[data-i18n-hub]').textContent = isZh ? '殿堂' : 'Arena';
    container.querySelector('#tg-btn-lobby').textContent = isZh ? '房间' : 'Room';
    container.querySelector('#tg-roster-heading').textContent = isZh ? '参赛者席位' : 'CONTESTANTS';
    container.querySelector('#tg-feed-heading').textContent = isZh ? '演播室实况 & 对话' : 'BROADCAST LOG & CHAT';
    chatInputEl.placeholder = isZh ? '发送战局消息...' : 'Send message...';
    syncThemeAndAudioIcons(false);

    // Telemetry pill
    const st = latestSnap?.state || {};
    const roundNum = customTelemetry?.round ?? st.round ?? st.turn ?? null;
    const phaseText = customTelemetry?.phase ?? st.phaseLabel ?? null;
    const showTel = Boolean(latestSnap?.lobby?.phase === 'playing' && (roundNum != null || phaseText));
    if (showTel) {
      const parts = [];
      if (roundNum != null) parts.push(isZh ? `第 ${roundNum} 回合` : `R${roundNum}`);
      if (phaseText) parts.push(typeof phaseText === 'object' ? I18n.t(phaseText) : String(phaseText));
      hudTelemetryEl.textContent = parts.join(' · ');
    }
    if (showTel !== prevTelemetryVisible) {
      prevTelemetryVisible = showTel;
      Motion.transitionPresence(hudTelemetryEl, showTel, { preset: 'pill' });
    }

    // Stakes pill
    const stakes = customTelemetry?.stakes ?? config.stakes ?? (latestSnap?.lobby?.phase === 'playing' ? 2 : null);
    const showStakes = Boolean(stakes != null && latestSnap?.lobby?.phase === 'playing');
    if (showStakes) hudStakesEl.innerHTML = UI.renderGarnetBadge(stakes);
    if (showStakes !== prevStakesVisible) {
      prevStakesVisible = showStakes;
      Motion.transitionPresence(hudStakesEl, showStakes, { preset: 'pill' });
    }

    // Room code chip
    const showChip = Boolean(latestSnap && engine.mode === 'online' && engine.roomCode);
    if (showChip && !roomCopyTimer) {
      roomCodeLabelEl.textContent = formatRoomCodeDisplay(engine.roomCode);
    }
    if (showChip !== prevRoomChipVisible) {
      prevRoomChipVisible = showChip;
      Motion.transitionPresence(roomChipEl, showChip, { preset: 'pill' });
    }

    // Refined Connection Pill copy (Section 5)
    const tr = latestSnap?.transportStatus || { state: 'idle', transport: 'none' };
    connPillEl.className = 'tg-conn-pill';
    if (!latestSnap) {
      connTextEl.textContent = isZh ? '就绪' : 'Ready';
    } else if (engine.mode === 'solo') {
      connPillEl.classList.add('is-live');
      connTextEl.textContent = difficultyLabel(latestSnap.aiDifficulty, lang);
    } else if (engine.mode === 'hotseat') {
      connPillEl.classList.add('is-live');
      connTextEl.textContent = isZh ? '本地同屏' : 'Hotseat';
    } else if (tr.state === 'connected') {
      if (tr.transport === 'peerjs') {
        connPillEl.classList.add('is-live');
        connTextEl.textContent = isZh ? '联机 · 直连' : 'Live · P2P';
      } else if (tr.transport === 'mqtt') {
        connPillEl.classList.add('is-relay');
        connTextEl.textContent = isZh ? '联机 · 中继' : 'Live · Relay';
      } else {
        connPillEl.classList.add('is-live');
        connTextEl.textContent = isZh ? '联机 · 同浏览器' : 'Live · Tab';
      }
    } else if (tr.state === 'connecting' || tr.state === 'reconnecting') {
      connPillEl.classList.add('is-warn');
      connTextEl.textContent = isZh ? '连接中' : 'Connecting';
    } else {
      connTextEl.textContent = isZh ? '已断开' : 'Offline';
    }

    // Roster
    const seats = latestSnap?.lobby?.seats || [];
    const specs = latestSnap?.lobby?.spectators || [];
    rosterCountEl.textContent = specs.length ? `${seats.length} (+${specs.length})` : String(seats.length);
    rosterListEl.innerHTML = seats
      .map((s) => {
        const isMe = s.seatId === (latestSnap?.activeSeatId || latestSnap?.mySeatId);
        const statusTag = s.isBot
          ? `<span style="color:var(--tg-cyan-ink);font-size:11px;">AI</span>`
          : !s.connected
          ? `<span style="color:var(--tg-amber);font-size:11px;">${isZh ? '离线' : 'Off'}</span>`
          : `<span style="color:var(--tg-emerald);font-size:11px;">●</span>`;
        const renameBtn =
          isMe && !s.isBot
            ? `<button type="button" class="tg-inline-edit-btn" data-rename-me title="${isZh ? '修改代号' : 'Rename'}">✎</button>`
            : '';
        const takeoverBtn =
          engine.isHost && !s.isBot && !s.connected && latestSnap?.lobby?.phase === 'playing'
            ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-takeover="${UI.escapeHtml(s.seatId)}" style="padding:2px 6px;min-height:22px;font-size:10px;">AI</button>`
            : '';
        return `
          <div class="tg-roster-row ${isMe ? 'is-me' : ''} ${!s.connected ? 'is-offline' : ''}">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <span style="color:var(--tg-gold);margin-right:5px;">${UI.escapeHtml(s.avatar || '♦')}</span>
              ${UI.escapeHtml(s.name)}${isMe ? (isZh ? ' (你)' : ' (You)') : ''}
            </span>
            <span style="display:flex;align-items:center;gap:6px;">${renameBtn}${takeoverBtn}${statusTag}</span>
          </div>
        `;
      })
      .join('');

    rosterListEl.querySelectorAll('[data-rename-me]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SFX.play('click');
        openRenameModal();
      });
    });
    rosterListEl.querySelectorAll('[data-takeover]').forEach((btn) => {
      btn.addEventListener('click', () => engine.removeSeat(btn.dataset.takeover));
    });

    renderVsStrip();
  }

  // Interruptible Slide-in Rules Drawer with Escape support
  let drawerEscapeBound = false;
  const onDrawerKey = (e) => {
    if (e.key === 'Escape' && rulesOpen) {
      rulesOpen = false;
      renderDrawer();
    }
  };

  function renderDrawer() {
    let backdrop = drawerRoot.querySelector('#tg-drawer-backdrop');
    if (!rulesOpen) {
      if (drawerEscapeBound) {
        document.removeEventListener('keydown', onDrawerKey);
        drawerEscapeBound = false;
      }
      if (backdrop) {
        Motion.transitionPresence(backdrop, false, {
          preset: 'drawer-right',
          removeOnExit: true,
        });
      }
      return;
    }

    const md =
      I18n.t(config.rulesSummary) ||
      I18n.t({ zh: '暂无规则说明。', en: 'No rules description provided.' });

    if (!backdrop) {
      drawerRoot.innerHTML = `
        <div class="tg-drawer-backdrop" id="tg-drawer-backdrop" hidden>
          <div class="tg-drawer" role="dialog" aria-modal="true">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
              <div>
                <span class="tg-badge tg-badge-garnet">${UI.escapeHtml(seasonsBadge)} · DEATH MATCH</span>
                <h2 class="tg-modal-title" id="tg-drawer-title" style="font-size:20px;"></h2>
                ${config.title?.ko ? `<div style="font-size:12px;color:var(--tg-ink-faint);">${UI.escapeHtml(config.title.ko)}</div>` : ''}
              </div>
              <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-drawer-close" aria-label="Close">✕</button>
            </div>
            <div class="tg-prose" id="tg-drawer-prose"></div>
          </div>
        </div>
      `;
      backdrop = drawerRoot.querySelector('#tg-drawer-backdrop');
      backdrop.querySelector('#tg-drawer-close')?.addEventListener('click', () => {
        rulesOpen = false;
        renderDrawer();
      });
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          rulesOpen = false;
          renderDrawer();
        }
      });
    }

    backdrop.querySelector('#tg-drawer-title').textContent = I18n.t(config.title);
    backdrop.querySelector('#tg-drawer-prose').innerHTML = renderMiniMarkdown(md);
    if (!drawerEscapeBound) {
      document.addEventListener('keydown', onDrawerKey);
      drawerEscapeBound = true;
    }
    Motion.transitionPresence(backdrop, true, { preset: 'drawer-right' });
  }

  function renderDifficultySelector(selected, lang) {
    const items = [
      { id: 'easy', zh: '入门 Easy', en: 'Easy', subZh: '轻松热身', subEn: 'Casual pace' },
      { id: 'genius', zh: '天才 Genius', en: 'Genius', subZh: '节目水准', subEn: 'Broadcast level' },
      { id: 'grand_final', zh: '总决赛 Grand Final', en: 'Grand Final', subZh: '冠军级博弈', subEn: 'Champion mind' },
    ];
    return `
      <div style="margin-bottom:12px;">
        <div style="font-size:12px;color:var(--tg-ink-muted);margin-bottom:6px;">
          ${lang === 'zh' ? 'AI 智能难度' : 'AI Difficulty'}
        </div>
        <div class="tg-diff-grid" id="tg-diff-grid">
          ${items
            .map(
              (it) => `
              <button type="button" class="tg-diff-pill ${selected === it.id ? 'is-active' : ''}" data-diff="${it.id}">
                <strong>${lang === 'zh' ? it.zh : it.en}</strong>
                <span>${lang === 'zh' ? it.subZh : it.subEn}</span>
              </button>
            `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  function renderOptionsFields(currentOpts) {
    const schema = config.optionsSchema || [];
    if (!schema.length) return '';
    return `
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--tg-border-subtle);display:flex;flex-wrap:wrap;gap:12px;">
        ${schema
          .map((field) => {
            const val = currentOpts[field.key] ?? field.default;
            if (field.type === 'boolean') {
              return `
                <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                  <input type="checkbox" data-opt-key="${UI.escapeHtml(field.key)}" ${val ? 'checked' : ''} />
                  <span>${UI.escapeHtml(I18n.t(field.label))}</span>
                </label>
              `;
            }
            if (field.type === 'select' && Array.isArray(field.choices)) {
              return `
                <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;">
                  <span style="color:var(--tg-ink-muted);">${UI.escapeHtml(I18n.t(field.label))}</span>
                  <select class="tg-input" style="width:auto;min-height:32px;padding:4px 10px;" data-opt-key="${UI.escapeHtml(field.key)}">
                    ${field.choices
                      .map(
                        (ch) =>
                          `<option value="${UI.escapeHtml(ch.value)}" ${String(val) === String(ch.value) ? 'selected' : ''}>${UI.escapeHtml(I18n.t(ch.label))}</option>`
                      )
                      .join('')}
                  </select>
                </label>
              `;
            }
            return '';
          })
          .join('')}
      </div>
    `;
  }

  function bindOptionsFields(rootEl, currentOpts, onChange) {
    rootEl.querySelectorAll('[data-opt-key]').forEach((el) => {
      el.addEventListener('change', () => {
        const k = el.dataset.optKey;
        const val = el.type === 'checkbox' ? el.checked : el.value;
        currentOpts[k] = val;
        onChange?.(k, val);
      });
    });
  }

  function closeOverlay() {
    currentOverlayKind = null;
    stopParticles?.();
    stopParticles = null;
    const backdrop = overlayRoot.querySelector('.tg-modal-backdrop');
    const canvas = overlayRoot.querySelector('.tg-verdict-canvas');
    if (canvas) canvas.remove();
    if (backdrop) {
      Motion.transitionPresence(backdrop, false, {
        preset: 'modal',
        removeOnExit: true,
      });
    } else {
      overlayRoot.innerHTML = '';
    }
  }

  function ensureModalShell(kind, extraModalClass = '') {
    let backdrop = overlayRoot.querySelector('.tg-modal-backdrop');
    let modal = overlayRoot.querySelector('.tg-modal');
    const freshlyMounted = !backdrop || !modal || currentOverlayKind !== kind;
    if (freshlyMounted) {
      overlayRoot.innerHTML = `
        <div class="tg-modal-backdrop" hidden>
          <div class="tg-modal ${extraModalClass}" role="dialog" aria-modal="true"></div>
        </div>
      `;
      backdrop = overlayRoot.querySelector('.tg-modal-backdrop');
      modal = overlayRoot.querySelector('.tg-modal');
      currentOverlayKind = kind;
    } else if (extraModalClass) {
      modal.className = `tg-modal ${extraModalClass}`;
    }
    return { backdrop, modal, freshlyMounted };
  }

  function renderLobbyOverlay() {
    const lang = I18n.getLang();
    const isZh = lang === 'zh';
    const minP = config.minPlayers || 2;
    const maxP = config.maxPlayers || 2;
    const inOnlineLobby =
      lobbyOnlineJoined && latestSnap && engine.mode === 'online' && latestSnap.lobby.phase === 'lobby';

    if (inOnlineLobby) {
      const { backdrop, modal, freshlyMounted } = ensureModalShell('lobby-room');
      const lobby = latestSnap.lobby;
      const mySeat = lobby.seats.find((s) => s.seatId === latestSnap.mySeatId);
      const canStart = engine.isHost && lobby.seats.length >= minP;

      modal.innerHTML = `
        <div class="tg-modal-header">
          <div>
            <span class="tg-badge tg-badge-garnet">${UI.escapeHtml(seasonsBadge)} · DEATH MATCH</span>
            <h2 class="tg-modal-title">${UI.escapeHtml(I18n.t(config.title))}</h2>
          </div>
          <button type="button" class="tg-room-chip" id="tg-lobby-copy-link" style="font-size:14px;padding:7px 14px;">
            <span id="tg-lobby-code-text">${UI.escapeHtml(formatRoomCodeDisplay(engine.roomCode))}</span>
            <span class="tg-icon-slot" id="tg-lobby-copy-icon">${ICONS.copy}</span>
          </button>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 12px;border-radius:10px;background:var(--tg-garnet-soft);border:1px solid var(--tg-border-garnet);margin-bottom:14px;">
          <span style="font-size:12.5px;color:var(--tg-ink-muted);">
            ${isZh ? '发送房间码或链接给好友即可即时开战' : 'Share the room code or link to invite a rival.'}
          </span>
          <button type="button" class="tg-btn tg-btn-sm tg-btn-gold" id="tg-lobby-share-btn">
            ${isZh ? '复制邀请链接' : 'Copy Invite Link'}
          </button>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;letter-spacing:0.08em;color:var(--tg-gold);font-weight:700;">
            ${isZh ? `参赛席位 (${lobby.seats.length}/${maxP})` : `SEATS (${lobby.seats.length}/${maxP})`}
          </span>
          ${
            engine.isHost && lobby.seats.length < maxP
              ? `<button type="button" class="tg-btn tg-btn-sm" id="tg-lobby-add-bot">+ ${isZh ? '添加 AI 对手' : 'Add AI Bot'}</button>`
              : ''
          }
        </div>

        <div class="tg-seat-grid">
          ${lobby.seats
            .map((s, idx) => {
              const isMine = s.seatId === latestSnap.mySeatId && !s.isBot;
              return `
                <div class="tg-seat-card ${s.ready ? 'is-ready' : ''} ${s.isBot ? 'is-bot' : ''}">
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    <strong style="color:var(--tg-gold);margin-right:4px;">${UI.escapeHtml(s.avatar || '♦')}</strong>
                    ${UI.escapeHtml(s.name)}
                    ${idx === 0 ? `<small style="color:var(--tg-gold);"> ★</small>` : ''}
                  </span>
                  <span style="display:flex;align-items:center;gap:6px;">
                    ${isMine ? `<button type="button" class="tg-inline-edit-btn" id="tg-lobby-rename-me">✎</button>` : ''}
                    <span style="font-size:11px;color:${s.ready ? 'var(--tg-emerald-ink)' : 'var(--tg-ink-faint)'};">
                      ${s.isBot ? 'AI' : s.ready ? (isZh ? '就绪' : 'Ready') : (isZh ? '等待' : 'Wait')}
                    </span>
                    ${
                      engine.isHost && idx > 0
                        ? `<button type="button" data-rm-seat="${UI.escapeHtml(s.seatId)}" style="color:var(--tg-ink-faint);font-size:12px;">✕</button>`
                        : ''
                    }
                  </span>
                </div>
              `;
            })
            .join('')}
        </div>

        ${
          lobby.spectators?.length
            ? `<div style="font-size:12px;color:var(--tg-ink-muted);margin-bottom:10px;">${isZh ? '观战席' : 'Spectators'}: ${lobby.spectators.map((x) => UI.escapeHtml(x.name)).join(', ')}</div>`
            : ''
        }

        ${engine.isHost ? renderDifficultySelector(lobby.aiDifficulty || 'genius', lang) : ''}
        ${engine.isHost ? renderOptionsFields(lobby.options) : ''}

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:20px;">
          <button type="button" class="tg-btn tg-btn-ghost" id="tg-lobby-leave">
            ← ${isZh ? '离开房间' : 'Leave Room'}
          </button>
          <div style="display:flex;gap:10px;">
            ${
              !engine.isHost && mySeat
                ? `<button type="button" class="tg-btn ${mySeat.ready ? '' : 'tg-btn-gold'}" id="tg-lobby-ready">${
                    mySeat.ready
                      ? isZh ? '取消准备' : 'Unready'
                      : isZh ? '准备就绪' : 'Ready Up'
                  }</button>`
                : ''
            }
            ${
              engine.isHost
                ? `<button type="button" class="tg-btn tg-btn-garnet" id="tg-lobby-start" ${canStart ? '' : 'disabled'}>${
                    canStart
                      ? isZh ? '开始对决' : 'Start Match'
                      : isZh ? `至少需要 ${minP} 名玩家` : `Need ${minP} players`
                  }</button>`
                : `<span style="font-size:12.5px;color:var(--tg-ink-muted);align-self:center;">${
                    latestSnap.isSpectator
                      ? isZh ? '观战中 · 等待房主开局' : 'Spectating · Waiting for host'
                      : isZh ? '等待房主开始对决' : 'Waiting for host to start'
                  }</span>`
            }
          </div>
        </div>
      `;

      if (freshlyMounted) Motion.transitionPresence(backdrop, true, { preset: 'modal' });

      const copyBtn = modal.querySelector('#tg-lobby-copy-link');
      const copyIcon = modal.querySelector('#tg-lobby-copy-icon');
      const copyText = modal.querySelector('#tg-lobby-code-text');
      copyBtn?.addEventListener('click', () => copyInviteUrl(engine.roomCode, copyBtn, copyIcon, copyText));
      modal.querySelector('#tg-lobby-share-btn')?.addEventListener('click', (e) =>
        copyInviteUrl(engine.roomCode, e.currentTarget, copyIcon, copyText)
      );
      modal.querySelector('#tg-lobby-rename-me')?.addEventListener('click', () => {
        SFX.play('click');
        openRenameModal();
      });
      modal.querySelector('#tg-lobby-add-bot')?.addEventListener('click', () => {
        SFX.play('click');
        engine.addBot(lang);
      });
      modal.querySelectorAll('[data-rm-seat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          engine.removeSeat(btn.dataset.rmSeat);
        });
      });
      modal.querySelectorAll('[data-diff]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          engine.setAiDifficulty(btn.dataset.diff);
        });
      });
      if (engine.isHost) bindOptionsFields(modal, lobby.options, (k, v) => engine.setOption(k, v));
      modal.querySelector('#tg-lobby-ready')?.addEventListener('click', () => {
        SFX.play('click');
        engine.setReady(!mySeat.ready);
      });
      modal.querySelector('#tg-lobby-start')?.addEventListener('click', () => {
        SFX.play('click');
        const res = engine.startMatch();
        if (!res.ok) UI.toast(res.reason, 'error');
      });
      modal.querySelector('#tg-lobby-leave')?.addEventListener('click', () => {
        SFX.play('click');
        engine.destroy();
        lobbyOnlineJoined = false;
        latestSnap = null;
        lastPhase = null;
        renderAll();
      });
      return;
    }

    // Entry Mode Selection Modal — preserves outer modal container while patching inner body!
    const { backdrop, modal, freshlyMounted } = ensureModalShell('lobby-entry');
    const defaultNick = playerNameInput || (isZh ? '挑战者' : 'Challenger');
    const vault = GarnetVault.get();

    const buildBodyHtml = () => {
      if (lobbyTab === 'solo') {
        return `
          ${renderDifficultySelector(aiDifficulty, lang)}
          ${
            maxP > minP
              ? `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
                  <label style="font-size:13.5px;color:var(--tg-ink-muted);">
                    ${isZh ? `总参赛人数 (${minP}–${maxP} 人)` : `Total Players (${minP}–${maxP})`}
                  </label>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <button type="button" class="tg-btn tg-btn-icon" id="tg-solo-dec">−</button>
                    <span style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:18px;font-weight:700;min-width:28px;text-align:center;color:var(--tg-gold-bright);">${soloCount}</span>
                    <button type="button" class="tg-btn tg-btn-icon" id="tg-solo-inc">+</button>
                  </div>
                </div>
              `
              : ''
          }
          ${renderOptionsFields(localOptions)}
          <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <a class="tg-btn tg-btn-ghost" href="../../">← ${isZh ? '返回殿堂' : 'Back to Arena'}</a>
            <button type="button" class="tg-btn tg-btn-garnet" id="tg-start-solo" style="min-width:184px;min-height:44px;">
              ${isZh ? '开始对决' : 'Start Match'}
            </button>
          </div>
        `;
      }
      if (lobbyTab === 'online') {
        return `
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
            <div style="padding:14px;border-radius:12px;border:1px solid var(--tg-border-garnet);background:var(--tg-garnet-soft);">
              <div style="font-weight:700;margin-bottom:6px;">${isZh ? '创建对决房间' : 'Create Room'}</div>
              <p style="font-size:12px;color:var(--tg-ink-muted);margin:0 0 12px;">
                ${isZh ? '生成房间码与邀请链接，好友扫码或点击即可加入。' : 'Generate a room code and invite link for instant play.'}
              </p>
              <button type="button" class="tg-btn tg-btn-garnet" id="tg-create-room" style="width:100%;" ${lobbyBusy ? 'disabled' : ''}>
                ${lobbyBusy ? `<span class="tg-spinner" aria-hidden="true"></span><span>${isZh ? '创建中' : 'Creating'}</span>` : (isZh ? '创建房间' : 'Create Room')}
              </button>
            </div>
            <div style="padding:14px;border-radius:12px;border:1px solid var(--tg-border);background:var(--tg-hover-fill);">
              <div style="font-weight:700;margin-bottom:6px;">${isZh ? '加入好友房间' : 'Join Room'}</div>
              <input class="tg-input tg-input-mono" id="tg-join-code" maxlength="10" value="${UI.escapeHtml(roomCodeInput)}" placeholder="TGM-K7M4P" style="margin-bottom:10px;" />
              <div style="display:flex;gap:8px;">
                <button type="button" class="tg-btn tg-btn-gold" id="tg-join-room" style="flex:1;" ${lobbyBusy ? 'disabled' : ''}>
                  ${lobbyBusy ? `<span class="tg-spinner" aria-hidden="true"></span>` : (isZh ? '加入' : 'Join')}
                </button>
                <button type="button" class="tg-btn tg-btn-ghost" id="tg-join-spec" ${lobbyBusy ? 'disabled' : ''}>
                  ${isZh ? '观战' : 'Watch'}
                </button>
              </div>
            </div>
          </div>
          ${
            lobbyError
              ? `<div style="margin-top:12px;padding:9px 12px;border-radius:8px;background:var(--tg-garnet-soft);border:1px solid var(--tg-border-garnet);color:var(--tg-garnet-ink);font-size:12.5px;">${UI.escapeHtml(lobbyError)}</div>`
              : ''
          }
        `;
      }
      return `
        <div style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12.5px;color:var(--tg-ink-muted);">${isZh ? '本地参赛者' : 'Local Players'}</span>
            <div style="display:flex;gap:6px;">
              <button type="button" class="tg-btn tg-btn-sm" id="tg-hs-add" ${hotseatNames.length + hotseatBots >= maxP ? 'disabled' : ''}>+ ${isZh ? '真人' : 'Human'}</button>
              <button type="button" class="tg-btn tg-btn-sm" id="tg-hs-add-bot" ${hotseatNames.length + hotseatBots >= maxP ? 'disabled' : ''}>+ AI (${hotseatBots})</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            ${hotseatNames
              .map(
                (nm, idx) => `
                <div style="display:flex;gap:6px;">
                  <input class="tg-input" data-hs-idx="${idx}" value="${UI.escapeHtml(nm)}" />
                  ${idx >= 2 ? `<button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" data-hs-rm="${idx}">✕</button>` : ''}
                </div>
              `
              )
              .join('')}
          </div>
        </div>
        ${renderOptionsFields(localOptions)}
        <div style="margin-top:18px;display:flex;justify-content:flex-end;">
          <button type="button" class="tg-btn tg-btn-garnet" id="tg-start-hotseat" style="min-width:190px;min-height:44px;">
            ${isZh ? '开始本地对战' : 'Start Pass & Play'}
          </button>
        </div>
      `;
    };

    const bindBodyEvents = (bodyEl) => {
      bodyEl.querySelectorAll('[data-diff]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          aiDifficulty = btn.dataset.diff;
          bodyEl.querySelectorAll('[data-diff]').forEach((b) =>
            b.classList.toggle('is-active', b.dataset.diff === aiDifficulty)
          );
        });
      });

      bindOptionsFields(bodyEl, localOptions, null);

      bodyEl.querySelector('#tg-solo-dec')?.addEventListener('click', () => {
        soloCount = Math.max(minP, soloCount - 1);
        patchTabBody();
      });
      bodyEl.querySelector('#tg-solo-inc')?.addEventListener('click', () => {
        soloCount = Math.min(maxP, soloCount + 1);
        patchTabBody();
      });
      bodyEl.querySelector('#tg-start-solo')?.addEventListener('click', () => {
        SFX.play('click');
        const nick = playerNameInput.trim() || defaultNick;
        savePlayerName(nick);
        engine.startSolo({
          playerName: nick,
          totalPlayers: soloCount,
          aiDifficulty,
          options: localOptions,
          lang,
        });
      });

      const codeEl = bodyEl.querySelector('#tg-join-code');
      codeEl?.addEventListener('input', () => {
        roomCodeInput = codeEl.value.toUpperCase();
      });

      bodyEl.querySelector('#tg-create-room')?.addEventListener('click', async () => {
        SFX.play('click');
        const nick = playerNameInput.trim() || defaultNick;
        savePlayerName(nick);
        lobbyBusy = true;
        lobbyError = '';
        patchTabBody();
        try {
          await engine.createOnlineRoom({ playerName: nick, aiDifficulty, transportPref });
          lobbyOnlineJoined = true;
        } catch (err) {
          lobbyError = err?.message || 'Failed to create room';
        } finally {
          lobbyBusy = false;
          renderAll();
        }
      });

      const doJoin = async (wantSpectator) => {
        const code = normalizeRoomCode(roomCodeInput);
        if (code.length < 4) {
          SFX.play('error');
          lobbyError = isZh ? '请输入 5 位房间码' : 'Enter a 5-character room code';
          patchTabBody();
          const inp = modal.querySelector('#tg-join-code');
          if (inp) {
            Motion.nudgeError(inp, { intensity: 'subtle' });
            inp.focus();
          }
          return;
        }
        SFX.play('click');
        const nick = playerNameInput.trim() || defaultNick;
        savePlayerName(nick);
        lobbyBusy = true;
        lobbyError = '';
        patchTabBody();
        try {
          await engine.joinOnlineRoom({ roomCode: code, playerName: nick, wantSpectator, transportPref });
          lobbyOnlineJoined = true;
        } catch (err) {
          lobbyError = err?.message || 'Failed to join room';
        } finally {
          lobbyBusy = false;
          renderAll();
        }
      };

      bodyEl.querySelector('#tg-join-room')?.addEventListener('click', () => doJoin(initialSpectate));
      bodyEl.querySelector('#tg-join-spec')?.addEventListener('click', () => doJoin(true));

      bodyEl.querySelectorAll('[data-hs-idx]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const idx = Number(inp.dataset.hsIdx);
          hotseatNames[idx] = inp.value;
          if (idx === 0 && inp.value.trim()) {
            playerNameInput = inp.value;
            savePlayerName(inp.value);
            if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
          }
        });
      });
      bodyEl.querySelectorAll('[data-hs-rm]').forEach((btn) => {
        btn.addEventListener('click', () => {
          hotseatNames.splice(Number(btn.dataset.hsRm), 1);
          patchTabBody();
        });
      });
      bodyEl.querySelector('#tg-hs-add')?.addEventListener('click', () => {
        if (hotseatNames.length + hotseatBots < maxP) {
          hotseatNames.push(isZh ? `玩家 ${hotseatNames.length + 1}` : `Player ${hotseatNames.length + 1}`);
          patchTabBody();
        }
      });
      bodyEl.querySelector('#tg-hs-add-bot')?.addEventListener('click', () => {
        if (hotseatNames.length + hotseatBots < maxP) {
          hotseatBots += 1;
          patchTabBody();
        }
      });
      bodyEl.querySelector('#tg-start-hotseat')?.addEventListener('click', () => {
        SFX.play('click');
        if (hotseatNames.length + hotseatBots < minP) {
          UI.toast(isZh ? `至少需要 ${minP} 名玩家` : `Need at least ${minP} players`, 'error');
          return;
        }
        engine.startHotseat({
          playerNames: hotseatNames,
          botCount: hotseatBots,
          aiDifficulty,
          options: localOptions,
          lang,
        });
      });
    };

    const patchTabBody = (animate = false) => {
      const bodyEl = modal.querySelector('#tg-lobby-tab-body');
      if (!bodyEl) return;
      const mutate = () => {
        bodyEl.innerHTML = buildBodyHtml();
        bindBodyEvents(bodyEl);
      };
      if (animate) Motion.crossfade(bodyEl, mutate, { duration: 150, shiftPx: 3 });
      else mutate();
    };

    if (freshlyMounted || modal.dataset.renderedLang !== lang) {
      modal.dataset.renderedLang = lang;
      modal.innerHTML = `
        <div class="tg-modal-header">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="tg-badge tg-badge-garnet">${UI.escapeHtml(seasonsBadge)} · DEATH MATCH</span>
              ${UI.renderGarnetBadge(vault.garnets)}
            </div>
            <h2 class="tg-modal-title">${UI.escapeHtml(I18n.t(config.title))}</h2>
            ${config.title?.ko ? `<div style="font-size:12px;color:var(--tg-ink-faint);margin-top:2px;">${UI.escapeHtml(config.title.ko)}</div>` : ''}
          </div>
          <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="tg-entry-rules">
            ${isZh ? '查看规则' : 'Rules'}
          </button>
        </div>

        <div class="tg-mode-tabs" id="tg-mode-tabs" role="tablist">
          <button type="button" class="tg-mode-tab ${lobbyTab === 'solo' ? 'is-active' : ''}" data-tab="solo">
            <strong>${isZh ? '单人 AI' : 'Solo vs AI'}</strong>
            <span>${isZh ? '三档天才对手' : '3 AI tiers'}</span>
          </button>
          <button type="button" class="tg-mode-tab ${lobbyTab === 'online' ? 'is-active' : ''}" data-tab="online">
            <strong>${isZh ? '好友联机' : 'Online Room'}</strong>
            <span>${isZh ? '房间码实时对战' : 'Live room sync'}</span>
          </button>
          <button type="button" class="tg-mode-tab ${lobbyTab === 'hotseat' ? 'is-active' : ''}" data-tab="hotseat">
            <strong>${isZh ? '本地同屏' : 'Pass & Play'}</strong>
            <span>${isZh ? '隐私护盾保护' : 'Shielded turns'}</span>
          </button>
        </div>

        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;color:var(--tg-ink-muted);margin-bottom:5px;">
            ${isZh ? '你的参赛代号' : 'Contestant Name'}
          </label>
          <input class="tg-input" id="tg-name-input" type="text" maxlength="20" value="${UI.escapeHtml(playerNameInput)}" placeholder="${UI.escapeHtml(defaultNick)}" />
        </div>

        <div id="tg-lobby-tab-body" style="min-height:210px;"></div>
      `;

      modal.querySelector('#tg-entry-rules')?.addEventListener('click', () => {
        rulesOpen = true;
        renderDrawer();
      });

      const tabsEl = modal.querySelector('#tg-mode-tabs');
      modal.querySelectorAll('[data-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (lobbyTab === btn.dataset.tab) return;
          SFX.play('click');
          lobbyTab = btn.dataset.tab;
          lobbyError = '';
          modal.querySelectorAll('[data-tab]').forEach((b) =>
            b.classList.toggle('is-active', b.dataset.tab === lobbyTab)
          );
          Motion.slideIndicator(tabsEl, btn, { className: 'is-rect' });
          patchTabBody(true);
        });
      });

      const nameEl = modal.querySelector('#tg-name-input');
      nameEl?.addEventListener('input', () => {
        playerNameInput = nameEl.value;
        savePlayerName(playerNameInput);
        if (hotseatNames.length > 0 && playerNameInput.trim()) {
          hotseatNames[0] = playerNameInput.trim().slice(0, 20);
        }
        if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
      });

      patchTabBody(false);

      if (freshlyMounted) {
        Motion.transitionPresence(backdrop, true, { preset: 'modal' });
      }
      requestAnimationFrame(() => {
        const activeTab = tabsEl?.querySelector('.tg-mode-tab.is-active');
        if (tabsEl && activeTab) {
          Motion.slideIndicator(tabsEl, activeTab, { immediate: true, className: 'is-rect' });
        }
      });
    } else {
      patchTabBody(false);
    }
  }

  function renderResultOverlay(result) {
    stopParticles?.();
    stopParticles = null;

    const lang = I18n.getLang();
    const isZh = lang === 'zh';
    const seats = latestSnap?.lobby?.seats || [];
    const nameOf = (sid) => seats.find((s) => s.seatId === sid)?.name || sid;
    const winners = (result.winnerSeatIds || []).map(nameOf);
    const myId = latestSnap?.mySeatId;
    const isHotseat = latestSnap?.mode === 'hotseat';
    const isDraw = (result.winnerSeatIds || []).length === 0;
    const isSurvivor = isHotseat ? !isDraw : Boolean(myId && (result.winnerSeatIds || []).includes(myId));

    const verdictClass = isDraw ? '' : isSurvivor ? 'is-survivor' : 'is-eliminated';
    const kickerText = isDraw
      ? 'DRAW'
      : isSurvivor
      ? 'SURVIVOR'
      : 'ELIMINATED';
    const stampText = isDraw
      ? isZh ? '平局' : 'DRAW'
      : isSurvivor
      ? isZh ? '幸存晋级' : 'SURVIVOR'
      : isZh ? '本局淘汰' : 'ELIMINATED';

    const transferHtml = lastVaultOutcome
      ? `
        <div class="tg-garnet-transfer ${lastVaultOutcome.delta > 0 ? 'is-gain' : ''}">
          <span class="tg-garnet-gem"></span>
          <span>
            ${
              lastVaultOutcome.delta > 0
                ? isZh
                  ? `加内特 +${lastVaultOutcome.delta}（金库 ${lastVaultOutcome.vault.garnets}）`
                  : `Garnets +${lastVaultOutcome.delta} (Vault: ${lastVaultOutcome.vault.garnets})`
                : lastVaultOutcome.delta < 0
                ? isZh
                  ? `加内特 ${lastVaultOutcome.delta}（金库 ${lastVaultOutcome.vault.garnets}）`
                  : `Garnets ${lastVaultOutcome.delta} (Vault: ${lastVaultOutcome.vault.garnets})`
                : isZh
                ? `加内特无变动（金库 ${lastVaultOutcome.vault.garnets}）`
                : `Garnets unchanged (Vault: ${lastVaultOutcome.vault.garnets})`
            }
            ${
              lastVaultOutcome.earnedBlackGarnet
                ? isZh ? ' · ✦ 解锁黑加内特' : ' · ✦ Black Garnet unlocked'
                : ''
            }
          </span>
        </div>
      `
      : '';

    const { backdrop, modal, freshlyMounted } = ensureModalShell('verdict', `tg-verdict-modal ${verdictClass}`);
    if (!overlayRoot.querySelector('#tg-verdict-canvas') && !isDraw && !Motion.reduced()) {
      const c = document.createElement('canvas');
      c.className = 'tg-verdict-canvas';
      c.id = 'tg-verdict-canvas';
      overlayRoot.prepend(c);
    }

    modal.innerHTML = `
      <span class="tg-badge ${isSurvivor ? 'tg-badge-gold' : 'tg-badge-garnet'}">${kickerText}</span>
      <div class="tg-verdict-stamp">${stampText}</div>
      <div style="font-size:18px;font-weight:700;color:var(--tg-ink);margin-bottom:4px;">
        ${winners.length ? `♛ ${UI.escapeHtml(winners.join(' & '))}` : ''}
      </div>
      ${transferHtml}
      ${
        result.summary
          ? `<p style="color:var(--tg-ink-muted);margin:6px 0 16px;">${UI.escapeHtml(I18n.t(result.summary))}</p>`
          : ''
      }
      ${
        Array.isArray(result.rankings) && result.rankings.length
          ? `
            <div style="display:flex;flex-direction:column;gap:7px;margin:14px 0 22px;text-align:left;">
              ${result.rankings
                .map(
                  (r, i) => `
                  <div class="tg-seat-card ${i === 0 ? 'is-ready' : ''}">
                    <span><strong style="color:var(--tg-gold);margin-right:8px;">#${i + 1}</strong>${UI.escapeHtml(nameOf(r.seatId))}</span>
                    <span style="font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;color:var(--tg-gold-bright);">${UI.escapeHtml(r.label ?? r.score ?? '')}</span>
                  </div>
                `
                )
                .join('')}
            </div>
          `
          : ''
      }
      <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
        ${
          engine.isHost
            ? `<button type="button" class="tg-btn tg-btn-garnet" id="tg-res-rematch">${isZh ? '再战一局' : 'Rematch'}</button>`
            : ''
        }
        <button type="button" class="tg-btn" id="tg-res-review">${isZh ? '复盘终局' : 'Inspect Board'}</button>
        <a class="tg-btn tg-btn-ghost" href="../../">${isZh ? '返回殿堂' : 'Back to Arena'}</a>
      </div>
    `;

    if (freshlyMounted) Motion.transitionPresence(backdrop, true, { preset: 'modal' });

    if (!isDraw) {
      stopParticles = launchVerdictParticles(
        overlayRoot.querySelector('#tg-verdict-canvas'),
        isSurvivor
      );
    }

    modal.querySelector('#tg-res-rematch')?.addEventListener('click', () => {
      SFX.play('click');
      stopParticles?.();
      stopParticles = null;
      engine.rematch();
    });
    modal.querySelector('#tg-res-review')?.addEventListener('click', () => {
      SFX.play('click');
      closeOverlay();
    });
  }

  function renderAll() {
    renderHudAndSidebar();
    if (rulesOpen) renderDrawer();

    if (!latestSnap || latestSnap.lobby.phase === 'lobby') {
      stopParticles?.();
      stopParticles = null;
      removePrivacyCurtain();
      renderLobbyOverlay();
      return;
    }

    if (latestSnap.lobby.phase === 'ended' && latestSnap.result) {
      renderResultOverlay(latestSnap.result);
    } else if (currentOverlayKind !== null) {
      closeOverlay();
    }

    if (latestSnap.state && typeof render === 'function') {
      try {
        render(stageEl, {
          state: latestSnap.state,
          mySeatId: latestSnap.mySeatId,
          activeSeatId: latestSnap.activeSeatId,
          seats: latestSnap.lobby.seats,
          isHost: latestSnap.isHost,
          isSpectator: latestSnap.isSpectator,
          mode: latestSnap.mode,
          roomCode: latestSnap.roomCode,
          aiDifficulty: latestSnap.aiDifficulty,
          lang: I18n.getLang(),
          lastEvent: latestSnap.lastEvent,
          dispatch: (action) => engine.dispatch(action),
          sfx: SFX,
          ui: UI,
          motion: Motion,
          theme: Theme,
          vault: GarnetVault,
          log: (text, kind = 'system') => pushFeed(text, kind),
          setTelemetry: (t) => {
            customTelemetry = t;
            renderHudAndSidebar();
          },
        });
      } catch (err) {
        console.error('[mountGame] render error:', err);
      }
    }
  }

  const unsubLang = I18n.onChange(() => renderAll());
  const unsubTheme = Theme.onChange(() => syncThemeAndAudioIcons(true));
  renderAll();

  if (initialQuickMode === 'solo' && !initialRoomParam) {
    const lang = I18n.getLang();
    const nick = playerNameInput.trim() || (lang === 'zh' ? '挑战者' : 'Challenger');
    engine.startSolo({
      playerName: nick,
      totalPlayers: soloCount,
      aiDifficulty,
      options: localOptions,
      lang,
    });
  }

  return {
    engine,
    destroy() {
      if (timerRafId != null) cancelAnimationFrame(timerRafId);
      clearClashSplash(true);
      clearTimeout(roomCopyTimer);
      stopParticles?.();
      unsubLang();
      unsubTheme();
      if (drawerEscapeBound) document.removeEventListener('keydown', onDrawerKey);
      mobileMq?.removeEventListener?.('change', onMqChange);
      removePrivacyCurtain(true);
      engine.destroy();
    },
  };
}

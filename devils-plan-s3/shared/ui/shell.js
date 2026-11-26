/**
 * Broadcast Game Shell & Shared UI Toolkit ("The Devil's Plan: Dead Again")
 *
 * Apple-Grade Motion & Dual-Theme Edition:
 *  - Sun/Moon Theme Toggle (#dp-btn-theme) with SVG morph
 *  - Crisp inline SVG audio/copy icons + Motion.flashIcon feedback
 *  - Interruptible Motion.enter / Motion.exit on ALL modals, drawer, confirm & rename dialogs
 *  - Persistent Lobby modal shell with Motion.slidingIndicator tabs & Motion.tickDigit counters
 *  - Incremental Broadcast Feed + Motion.patchDOM Roster + FLIP Toast stack
 */

import { I18n } from '../i18n.js';
import { SFX } from '../audio/sound-engine.js';
import { GameEngine } from '../net/game-engine.js';
import { normalizeRoomCode, sanitizePlayerName } from '../net/protocol.js';
import { Motion, Theme } from './motion.js';
import { showPrivacyCurtain, removePrivacyCurtain } from './privacy-curtain.js';

const NAME_STORAGE_KEY = 'dp3_player_name';

const SVG_ICONS = {
  soundOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  ambience: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0 2 2 2 0"/></svg>`,
  sidebar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="15" y1="4" x2="15" y2="20"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
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
let toastSeq = 0;

function getToastStack() {
  if (!toastStackEl || !document.body.contains(toastStackEl)) {
    toastStackEl = document.createElement('div');
    toastStackEl.className = 'dp-toast-stack';
    toastStackEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastStackEl);
  }
  return toastStackEl;
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

  renderPieceBadge(count) {
    return `<span class="dp-piece dp-tabular" title="Pieces"><span class="dp-piece-icon" aria-hidden="true"></span><span>${Number(count) || 0}</span></span>`;
  },

  toast(message, tone = 'info', durationMs = 2600) {
    const stack = getToastStack();
    const prevRects = Motion.captureFlip(stack, '.dp-toast');
    const el = document.createElement('div');
    el.dataset.motionKey = `toast-${++toastSeq}`;
    el.className = `dp-toast ${tone === 'error' ? 'is-error' : tone === 'success' ? 'is-success' : ''}`;
    el.textContent = String(message);
    stack.appendChild(el);
    Motion.playFlip(stack, prevRects, { itemSelector: '.dp-toast', duration: 180 });
    Motion.enter(el, { variant: 'toast' });

    setTimeout(() => {
      Motion.exit(el, { variant: 'toast', remove: false, timeoutMs: 180 }).then(() => {
        const beforeRemove = Motion.captureFlip(stack, '.dp-toast');
        el.remove();
        Motion.playFlip(stack, beforeRemove, { itemSelector: '.dp-toast', duration: 180 });
      });
    }, durationMs);
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

  confirm(title, body, { confirmLabel, cancelLabel, danger = false } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'dp-modal-backdrop';
      backdrop.style.zIndex = '110';
      const okText = confirmLabel || I18n.t({ zh: '确认', en: 'Confirm' });
      const noText = cancelLabel || I18n.t({ zh: '取消', en: 'Cancel' });
      backdrop.innerHTML = `
        <div class="dp-modal" style="width:min(400px,100%);" role="dialog" aria-modal="true">
          <h3 class="dp-modal-title" style="font-size:18px;margin-bottom:8px;">${UI.escapeHtml(title)}</h3>
          <p style="color:var(--dp-ink-muted);margin:0 0 18px;font-size:14px;">${UI.escapeHtml(body)}</p>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="dp-btn dp-btn-ghost" data-ans="no">${UI.escapeHtml(noText)}</button>
            <button type="button" class="dp-btn ${danger ? 'dp-btn-crimson' : 'dp-btn-primary'}" data-ans="yes">${UI.escapeHtml(okText)}</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      Motion.enter(backdrop, { variant: 'modal' });

      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKey);
        Motion.exit(backdrop, { variant: 'modal', remove: true, timeoutMs: 200 });
        resolve(ok);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') done(false);
      };
      document.addEventListener('keydown', onKey);
      backdrop.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ans]');
        if (!btn && e.target !== backdrop) return;
        done(btn?.dataset.ans === 'yes');
      });
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
      '<code style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">$1</code>'
    );
}

function categoryBadgeClass(category) {
  const c = String(category || '').toUpperCase();
  if (c.includes('PRISON') || c.includes('DEATH')) return 'dp-badge dp-badge-crimson';
  if (c.includes('EXILE')) return 'dp-badge dp-badge-amber';
  if (c.includes('MINI')) return 'dp-badge dp-badge-cyan';
  if (c.includes('HIDDEN') || c.includes('FINAL')) return 'dp-badge dp-badge-violet';
  return 'dp-badge';
}

export function mountGame({ config, rules, root, render }) {
  const container = root || document.getElementById('game-root') || document.body;
  document.body.classList.add('dp-body');

  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomParam = normalizeRoomCode(urlParams.get('room') || '');
  const initialSpectate = urlParams.get('mode') === 'spectate';
  const transportPref = urlParams.get('transport') || 'auto';

  let sidebarCollapsed = window.innerWidth < 960;
  let rulesOpen = false;
  let lobbyTab = initialRoomParam ? 'online' : 'solo';
  let lobbyOnlineJoined = false;
  let lobbyBusy = false;
  let lobbyError = '';
  let playerNameInput = urlParams.get('name') || getSavedName() || '';
  let roomCodeInput = initialRoomParam;
  let soloCount = config.defaultPlayers || Math.min(4, config.maxPlayers || 4);
  let hotseatNames = [
    playerNameInput || (I18n.getLang() === 'zh' ? '玩家 1' : 'Player 1'),
    I18n.getLang() === 'zh' ? '玩家 2' : 'Player 2',
  ];
  let hotseatBots = 0;
  let localOptions = {};
  for (const f of config.optionsSchema || []) localOptions[f.key] = f.default;

  const feedItems = [];
  let renderedFeedCount = 0;
  let latestSnap = null;
  let lastTickedSec = null;
  let activeOverlayKind = null; // null | 'entry' | 'online-lobby' | 'result'
  let activeLobbyTabRendered = null;
  let activeDrawerEl = null;

  container.innerHTML = `
    <div class="dp-shell">
      <header class="dp-hud">
        <div class="dp-hud-left">
          <a class="dp-hud-back" href="../../" id="dp-back-hub">← <span data-i18n-hub>Hub</span></a>
          <span class="${categoryBadgeClass(config.category)}">${UI.escapeHtml(config.category || 'MATCH')}</span>
          <span class="dp-hud-title" id="dp-hud-title"></span>
        </div>
        <div class="dp-hud-center">
          <div class="dp-hud-timer" id="dp-hud-timer" hidden>
            <span aria-hidden="true">⏱</span>
            <span id="dp-hud-timer-text">00:00</span>
          </div>
          <button type="button" class="dp-room-chip" id="dp-room-chip" hidden title="Copy Invite Link">
            <span id="dp-room-code-label"></span>
            <span class="dp-icon-swap" id="dp-room-copy-icon">${SVG_ICONS.copy}</span>
          </button>
          <span class="dp-conn-pill" id="dp-conn-pill">
            <span class="dp-conn-dot"></span>
            <span id="dp-conn-text">READY</span>
          </span>
        </div>
        <div class="dp-hud-right">
          <button type="button" class="dp-profile-pill" id="dp-btn-profile" title="Edit Player Name">
            <span style="color:var(--dp-brass);" aria-hidden="true">◆</span>
            <span class="dp-profile-pill-name" id="dp-profile-name"></span>
            <span class="dp-profile-pill-edit" aria-hidden="true">✎</span>
          </button>
          <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="dp-btn-lobby"></button>
          <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="dp-btn-rules">?</button>
          <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="dp-btn-lang">中/EN</button>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-btn-theme" aria-label="Toggle Theme">${Theme.renderToggleIcon()}</button>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-btn-ambience" aria-label="Ambience">${SVG_ICONS.ambience}</button>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-btn-mute" aria-label="Sound">${SVG_ICONS.soundOn}</button>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-btn-sidebar" aria-label="Toggle Roster & Log">${SVG_ICONS.sidebar}</button>
        </div>
      </header>

      <div class="dp-workspace ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}" id="dp-workspace">
        <main class="dp-stage" id="dp-stage"></main>
        <div class="dp-sidebar-backdrop" id="dp-sidebar-backdrop" aria-hidden="true"></div>
        <aside class="dp-sidebar" id="dp-sidebar">
          <div class="dp-sidebar-inner">
            <div class="dp-sidebar-section">
              <div class="dp-sidebar-label">
                <span id="dp-roster-heading"></span>
                <span style="display:inline-flex;align-items:center;gap:8px;">
                  <span id="dp-roster-count" class="dp-tabular">0</span>
                  <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost dp-sidebar-close" id="dp-sidebar-close" aria-label="Close sidebar" style="width:28px;height:28px;min-height:28px;font-size:13px;">✕</button>
                </span>
              </div>
              <div class="dp-roster-list" id="dp-roster-list"></div>
            </div>
            <div class="dp-feed">
              <div class="dp-sidebar-label"><span id="dp-feed-heading"></span></div>
              <div class="dp-feed-list" id="dp-feed-list"></div>
              <form class="dp-chat-form" id="dp-chat-form">
                <input class="dp-input" id="dp-chat-input" type="text" maxlength="160" autocomplete="off" />
                <button class="dp-btn dp-btn-sm dp-btn-primary" type="submit" id="dp-chat-send">→</button>
              </form>
            </div>
          </div>
        </aside>
      </div>
    </div>
    <div id="dp-overlay-root"></div>
    <div id="dp-drawer-root"></div>
  `;

  const stageEl = container.querySelector('#dp-stage');
  const overlayRoot = container.querySelector('#dp-overlay-root');
  const drawerRoot = container.querySelector('#dp-drawer-root');
  const workspaceEl = container.querySelector('#dp-workspace');
  const hudTitleEl = container.querySelector('#dp-hud-title');
  const hudTimerEl = container.querySelector('#dp-hud-timer');
  const hudTimerTextEl = container.querySelector('#dp-hud-timer-text');
  const roomChipEl = container.querySelector('#dp-room-chip');
  const roomCodeLabelEl = container.querySelector('#dp-room-code-label');
  const roomCopyIconEl = container.querySelector('#dp-room-copy-icon');
  const connPillEl = container.querySelector('#dp-conn-pill');
  const connTextEl = container.querySelector('#dp-conn-text');
  const rosterListEl = container.querySelector('#dp-roster-list');
  const rosterCountEl = container.querySelector('#dp-roster-count');
  const feedListEl = container.querySelector('#dp-feed-list');
  const chatInputEl = container.querySelector('#dp-chat-input');
  const btnMute = container.querySelector('#dp-btn-mute');
  const btnAmb = container.querySelector('#dp-btn-ambience');
  const btnTheme = container.querySelector('#dp-btn-theme');
  const btnProfile = container.querySelector('#dp-btn-profile');
  const profileNameEl = container.querySelector('#dp-profile-name');

  // Incremental feed rendering (never wipes existing items or jumps user scroll)
  function pushFeed(text, kind = 'system', author = null) {
    feedItems.push({ text, kind, author, ts: Date.now() });
    if (feedItems.length > 80) {
      feedItems.shift();
      if (feedListEl.firstElementChild) feedListEl.firstElementChild.remove();
      renderedFeedCount = Math.max(0, renderedFeedCount - 1);
    }
    flushFeed();
  }

  function flushFeed() {
    const nearBottom =
      feedListEl.scrollHeight - feedListEl.scrollTop - feedListEl.clientHeight < 48;
    while (renderedFeedCount < feedItems.length) {
      const item = feedItems[renderedFeedCount++];
      const div = document.createElement('div');
      div.className = `dp-feed-item ${item.kind === 'alert' ? 'is-alert' : item.kind === 'system' ? 'is-system' : ''}`;
      if (item.author) {
        const strong = document.createElement('strong');
        strong.style.color = 'var(--dp-brass-bright)';
        strong.textContent = `${item.author}: `;
        div.appendChild(strong);
      }
      div.appendChild(document.createTextNode(String(item.text)));
      feedListEl.appendChild(div);
    }
    if (nearBottom) {
      feedListEl.scrollTop = feedListEl.scrollHeight;
    }
  }

  function buildInviteUrl(code) {
    const base = new URL(window.location.href);
    base.search = '';
    base.hash = '';
    if (base.protocol === 'http:' && base.hostname === 'zhaojinghao.com') {
      base.protocol = 'https:';
    }
    base.searchParams.set('room', code);
    return base.toString();
  }

  async function copyInviteUrl(code, iconTargetEl = null) {
    const url = buildInviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      SFX.play('click');
      if (iconTargetEl) Motion.flashIcon(iconTargetEl, SVG_ICONS.check, 1400);
      UI.toast(I18n.t({ zh: '已复制邀请链接', en: 'Invite link copied' }), 'success');
    } catch (_) {
      window.prompt(I18n.t({ zh: '复制邀请链接：', en: 'Copy invite link:' }), url);
    }
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
      const prevPhase = latestSnap?.lobby?.phase;
      latestSnap = snap;
      if (snap.lobby?.phase === 'playing' && prevPhase !== 'playing') {
        SFX.play('reveal');
        pushFeed(I18n.t({ zh: '对局正式开始', en: 'Match started' }), 'system');
      }
      if (snap.lobby?.phase === 'ended' && prevPhase !== 'ended') {
        SFX.play('victory');
        pushFeed(I18n.t({ zh: '对局结束，公布结果', en: 'Match concluded' }), 'alert');
      }
      renderAll();
    },
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
    return playerNameInput.trim() || (lang === 'zh' ? '参赛者' : 'Player');
  }

  function openRenameModal() {
    document.getElementById('dp-rename-modal')?.remove();
    const lang = I18n.getLang();
    const current = getCurrentDisplayName();
    const backdrop = document.createElement('div');
    backdrop.className = 'dp-modal-backdrop';
    backdrop.id = 'dp-rename-modal';
    backdrop.style.zIndex = '105';
    backdrop.innerHTML = `
      <div class="dp-modal" style="width:min(420px,100%);" role="dialog" aria-modal="true">
        <div class="dp-modal-header" style="margin-bottom:12px;">
          <div>
            <span class="dp-badge">${lang === 'zh' ? '参赛身份' : 'PLAYER IDENTITY'}</span>
            <h3 class="dp-modal-title" style="font-size:19px;">${lang === 'zh' ? '修改参赛代号' : 'Edit Player Name'}</h3>
          </div>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-rename-close" aria-label="Close">✕</button>
        </div>
        <form id="dp-rename-form">
          <input class="dp-input" id="dp-rename-input" type="text" maxlength="20" value="${UI.escapeHtml(current)}" placeholder="${lang === 'zh' ? '输入代号（最多 20 字）' : 'Enter name (max 20 chars)'}" autocomplete="nickname" />
          <p style="font-size:12px;color:var(--dp-ink-muted);margin:8px 0 16px;">
            ${
              latestSnap && engine.mode === 'online'
                ? lang === 'zh'
                  ? '修改后将立即同步给房间内所有玩家。'
                  : 'Syncs instantaneously to everyone in the room.'
                : lang === 'zh'
                ? '保存后自动同步至所有第三季游戏。'
                : 'Saved automatically across all Season 3 games.'
            }
          </p>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="dp-btn dp-btn-ghost" id="dp-rename-cancel">${lang === 'zh' ? '取消' : 'Cancel'}</button>
            <button type="submit" class="dp-btn dp-btn-primary">${lang === 'zh' ? '保存代号' : 'Save Name'}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);
    Motion.enter(backdrop, { variant: 'modal' });

    const input = backdrop.querySelector('#dp-rename-input');
    const close = () => {
      document.removeEventListener('keydown', onKey);
      Motion.exit(backdrop, { variant: 'modal', remove: true, timeoutMs: 200 });
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    backdrop.querySelector('#dp-rename-close')?.addEventListener('click', close);
    backdrop.querySelector('#dp-rename-cancel')?.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    backdrop.querySelector('#dp-rename-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = sanitizePlayerName(input.value, '');
      if (!next) {
        SFX.play('error');
        Motion.shake(input);
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
      if (latestSnap) {
        engine.renameSelf(next);
      } else {
        renderAll();
      }
      close();
      UI.toast(lang === 'zh' ? `代号已更新为 ${next}` : `Name updated to ${next}`, 'success');
    });

    requestAnimationFrame(() => {
      input?.focus();
      input?.select();
    });
  }

  function syncAudioAndThemeButtons() {
    const lang = I18n.getLang();
    btnMute.innerHTML = SFX.isMuted() ? SVG_ICONS.soundOff : SVG_ICONS.soundOn;
    btnMute.title = SFX.isMuted()
      ? lang === 'zh'
        ? '取消静音'
        : 'Unmute SFX'
      : lang === 'zh'
      ? '静音'
      : 'Mute SFX';

    const ambActive = SFX.isAmbienceOn() && !SFX.isMuted();
    btnAmb.style.color = ambActive ? 'var(--dp-brass-bright)' : '';
    btnAmb.style.borderColor = ambActive ? 'var(--dp-border-strong)' : '';
    btnAmb.title = ambActive
      ? lang === 'zh'
        ? '关闭氛围音'
        : 'Ambience Off'
      : lang === 'zh'
      ? '开启氛围音'
      : 'Ambience On';

    const isDark = Theme.get() === 'dark';
    const themeLabel = isDark
      ? lang === 'zh'
        ? '切换浅色模式'
        : 'Switch to Light Mode'
      : lang === 'zh'
      ? '切换深色模式'
      : 'Switch to Dark Mode';
    btnTheme.title = themeLabel;
    btnTheme.setAttribute('aria-label', themeLabel);
  }

  // HUD Button Wiring
  btnProfile?.addEventListener('click', () => {
    SFX.play('click');
    openRenameModal();
  });

  container.querySelector('#dp-btn-rules').addEventListener('click', () => {
    SFX.play('click');
    rulesOpen = !rulesOpen;
    renderDrawer();
  });

  container.querySelector('#dp-btn-lang').addEventListener('click', () => {
    SFX.play('click');
    I18n.toggle();
  });

  btnTheme?.addEventListener('click', () => {
    SFX.play('click');
    Theme.toggle();
    syncAudioAndThemeButtons();
  });

  btnMute.addEventListener('click', () => {
    SFX.toggleMute();
    syncAudioAndThemeButtons();
  });

  btnAmb.addEventListener('click', () => {
    const on = SFX.toggleAmbience();
    syncAudioAndThemeButtons();
    UI.toast(
      on
        ? I18n.t({ zh: '氛围音已开启', en: 'Ambience On' })
        : I18n.t({ zh: '氛围音已关闭', en: 'Ambience Off' })
    );
  });

  const setSidebarCollapsed = (collapsed) => {
    sidebarCollapsed = Boolean(collapsed);
    workspaceEl.classList.toggle('is-sidebar-collapsed', sidebarCollapsed);
  };

  container.querySelector('#dp-btn-sidebar').addEventListener('click', () => {
    SFX.play('click');
    setSidebarCollapsed(!sidebarCollapsed);
  });

  container.querySelector('#dp-sidebar-close')?.addEventListener('click', () => {
    SFX.play('click');
    setSidebarCollapsed(true);
  });

  container.querySelector('#dp-sidebar-backdrop')?.addEventListener('click', () => {
    setSidebarCollapsed(true);
  });

  const mobileMq = window.matchMedia?.('(max-width: 960px)');
  const onMqChange = (e) => {
    document.documentElement.classList.add('dp-resizing');
    if (e.matches) setSidebarCollapsed(true);
    requestAnimationFrame(() => document.documentElement.classList.remove('dp-resizing'));
  };
  mobileMq?.addEventListener?.('change', onMqChange);

  // Idempotent delegated roster listeners (zero re-bind churn!)
  Motion.delegate(
    rosterListEl,
    'click',
    '[data-rename-me]',
    () => {
      SFX.play('click');
      openRenameModal();
    },
    'roster-rename'
  );
  Motion.delegate(
    rosterListEl,
    'click',
    '[data-takeover]',
    (_e, btn) => {
      engine.removeSeat(btn.dataset.takeover);
    },
    'roster-takeover'
  );

  container.querySelector('#dp-btn-lobby').addEventListener('click', async () => {
    SFX.play('click');
    if (latestSnap?.lobby?.phase === 'playing' || latestSnap?.lobby?.phase === 'ended') {
      const ok = await UI.confirm(
        I18n.t({ zh: '返回房间？', en: 'Leave Match?' }),
        I18n.t({ zh: '离开后将退出当前对局。', en: "You'll leave the current match." }),
        {
          confirmLabel: I18n.t({ zh: '返回房间', en: 'Leave Match' }),
          cancelLabel: I18n.t({ zh: '继续对局', en: 'Stay' }),
        }
      );
      if (!ok) return;
      if (engine.isHost && engine.mode === 'online') {
        engine.returnToLobby();
      } else {
        engine.destroy();
        lobbyOnlineJoined = false;
        latestSnap = null;
        renderAll();
      }
    }
  });

  roomChipEl.addEventListener('click', () => {
    if (engine.roomCode && engine.mode === 'online') {
      copyInviteUrl(engine.roomCode, roomCopyIconEl);
    }
  });

  container.querySelector('#dp-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = chatInputEl.value.trim();
    if (!val) return;
    chatInputEl.value = '';
    engine.sendChat(val);
  });

  const timerInterval = setInterval(() => {
    if (!latestSnap || latestSnap.lobby.phase !== 'playing') {
      hudTimerEl.hidden = true;
      lastTickedSec = null;
      return;
    }
    const rem = engine.getRemainingTimerMs();
    if (rem == null) {
      hudTimerEl.hidden = true;
      lastTickedSec = null;
      return;
    }
    hudTimerEl.hidden = false;
    hudTimerTextEl.textContent = UI.formatTime(rem);
    const sec = Math.ceil(rem / 1000);
    hudTimerEl.classList.toggle('is-warn', sec <= 10 && sec > 5);
    hudTimerEl.classList.toggle('is-urgent', sec <= 5 && sec > 0);
    if (sec !== lastTickedSec && sec > 0) {
      lastTickedSec = sec;
      if (sec <= 5) SFX.play('tickUrgent');
      else if (sec <= 10) SFX.play('tick');
    }
  }, 250);

  function renderHudAndSidebar() {
    const lang = I18n.getLang();
    hudTitleEl.textContent = I18n.t(config.title);
    if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
    if (btnProfile) btnProfile.title = lang === 'zh' ? '修改参赛代号' : 'Edit Player Name';
    container.querySelector('[data-i18n-hub]').textContent = lang === 'zh' ? '大厅' : 'Hub';
    container.querySelector('#dp-btn-lobby').textContent = lang === 'zh' ? '房间' : 'Room';
    container.querySelector('#dp-roster-heading').textContent = lang === 'zh' ? '参赛席位' : 'PLAYERS';
    container.querySelector('#dp-feed-heading').textContent =
      lang === 'zh' ? '演播室实况 & 聊天' : 'BROADCAST LOG & CHAT';
    chatInputEl.placeholder = lang === 'zh' ? '发送消息...' : 'Send message...';
    syncAudioAndThemeButtons();

    if (latestSnap && engine.mode === 'online' && engine.roomCode) {
      roomChipEl.hidden = false;
      roomCodeLabelEl.textContent = engine.roomCode;
    } else {
      roomChipEl.hidden = true;
    }

    const st = latestSnap?.transportStatus || { state: 'idle', transport: 'none' };
    connPillEl.className = 'dp-conn-pill';
    if (!latestSnap) {
      connTextEl.textContent = lang === 'zh' ? '就绪' : 'READY';
    } else if (engine.mode === 'solo') {
      connPillEl.classList.add('is-live');
      connTextEl.textContent = lang === 'zh' ? '单人 AI' : 'SOLO AI';
    } else if (engine.mode === 'hotseat') {
      connPillEl.classList.add('is-live');
      connTextEl.textContent = lang === 'zh' ? '同屏' : 'HOTSEAT';
    } else if (st.state === 'connected') {
      if (st.transport === 'peerjs') {
        connPillEl.classList.add('is-live');
        connTextEl.textContent = 'LIVE · P2P';
      } else if (st.transport === 'mqtt') {
        connPillEl.classList.add('is-relay');
        connTextEl.textContent = 'LIVE · RELAY';
      } else {
        connPillEl.classList.add('is-live');
        connTextEl.textContent = 'LIVE · TAB';
      }
    } else if (st.state === 'connecting' || st.state === 'reconnecting') {
      connPillEl.classList.add('is-warn');
      connTextEl.textContent = lang === 'zh' ? '同步中' : 'SYNCING';
    } else {
      connTextEl.textContent = lang === 'zh' ? '离线' : 'OFFLINE';
    }

    const seats = latestSnap?.lobby?.seats || [];
    const specs = latestSnap?.lobby?.spectators || [];
    rosterCountEl.textContent = specs.length ? `${seats.length} (+${specs.length})` : String(seats.length);

    const rosterHtml = seats
      .map((s) => {
        const isMe = s.seatId === (latestSnap?.activeSeatId || latestSnap?.mySeatId);
        const statusTag = s.isBot
          ? `<span style="color:var(--dp-cyan);font-size:11px;">BOT</span>`
          : !s.connected
          ? `<span style="color:var(--dp-amber);font-size:11px;">${lang === 'zh' ? '掉线' : 'OFF'}</span>`
          : `<span style="color:var(--dp-emerald);font-size:11px;">●</span>`;
        const renameBtn =
          isMe && !s.isBot
            ? `<button type="button" class="dp-inline-edit-btn" data-rename-me title="${lang === 'zh' ? '修改代号' : 'Rename'}" aria-label="${lang === 'zh' ? '修改代号' : 'Rename'}">✎</button>`
            : '';
        const takeoverBtn =
          engine.isHost && !s.isBot && !s.connected && latestSnap?.lobby?.phase === 'playing'
            ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" data-takeover="${UI.escapeHtml(s.seatId)}" style="padding:2px 6px;min-height:22px;font-size:10px;">AI</button>`
            : '';
        return `
          <div class="dp-roster-row ${isMe ? 'is-me' : ''} ${!s.connected ? 'is-offline' : ''}" data-motion-key="roster-${UI.escapeHtml(s.seatId)}">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <span style="color:var(--dp-brass);margin-right:5px;">${UI.escapeHtml(s.avatar || '◆')}</span>
              ${UI.escapeHtml(s.name)}${isMe ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}
            </span>
            <span style="display:flex;align-items:center;gap:6px;">${renameBtn}${takeoverBtn}${statusTag}</span>
          </div>
        `;
      })
      .join('');

    Motion.patchDOM(rosterListEl, rosterHtml);
  }

  function renderDrawer() {
    const lang = I18n.getLang();
    if (!rulesOpen) {
      if (activeDrawerEl) {
        const closing = activeDrawerEl;
        activeDrawerEl = null;
        Motion.exit(closing, { variant: 'drawer', remove: true, timeoutMs: 220 });
      }
      return;
    }

    const md =
      I18n.t(config.rulesSummary) ||
      I18n.t({ zh: '暂无规则说明。', en: 'No rules description provided.' });
    const innerHtml = `
      <div class="dp-drawer" role="dialog" aria-modal="true">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
          <div>
            <span class="${categoryBadgeClass(config.category)}">${UI.escapeHtml(config.episode || '')} · ${UI.escapeHtml(config.category || '')}</span>
            <h2 class="dp-modal-title" style="font-size:20px;">${UI.escapeHtml(I18n.t(config.title))}</h2>
          </div>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-drawer-close" aria-label="${lang === 'zh' ? '关闭规则' : 'Close Rules'}">✕</button>
        </div>
        <div class="dp-prose">${renderMiniMarkdown(md)}</div>
      </div>
    `;

    if (activeDrawerEl && activeDrawerEl.isConnected) {
      Motion.patchDOM(activeDrawerEl, innerHtml);
      Motion.enter(activeDrawerEl, { variant: 'drawer' });
    } else {
      const backdrop = document.createElement('div');
      backdrop.className = 'dp-drawer-backdrop';
      backdrop.id = 'dp-drawer-backdrop';
      backdrop.innerHTML = innerHtml;
      drawerRoot.appendChild(backdrop);
      activeDrawerEl = backdrop;
      Motion.enter(backdrop, { variant: 'drawer' });

      Motion.delegate(
        backdrop,
        'click',
        '#dp-drawer-close',
        () => {
          SFX.play('click');
          rulesOpen = false;
          renderDrawer();
        },
        'drawer-close'
      );
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          rulesOpen = false;
          renderDrawer();
        }
      });
    }
  }

  function renderOptionsFields(currentOpts) {
    const schema = config.optionsSchema || [];
    if (!schema.length) return '';
    return `
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--dp-border-subtle);display:flex;flex-wrap:wrap;gap:12px;">
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
                  <span style="color:var(--dp-ink-muted);">${UI.escapeHtml(I18n.t(field.label))}</span>
                  <select class="dp-input" style="width:auto;min-height:32px;padding:4px 10px;" data-opt-key="${UI.escapeHtml(field.key)}">
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

  function dismissOverlay() {
    activeOverlayKind = null;
    activeLobbyTabRendered = null;
    const existing = overlayRoot.querySelector('.dp-modal-backdrop');
    if (existing) {
      Motion.exit(existing, { variant: 'modal', remove: true, timeoutMs: 200 });
    }
  }

  function ensureOverlayBackdrop(kind) {
    let backdrop = overlayRoot.querySelector(':scope > .dp-modal-backdrop:not(.is-leaving)');
    const switchingKind = activeOverlayKind !== kind;
    if (!backdrop || switchingKind) {
      if (backdrop) backdrop.remove();
      backdrop = document.createElement('div');
      backdrop.className = 'dp-modal-backdrop';
      backdrop.dataset.overlayKind = kind;
      overlayRoot.appendChild(backdrop);
      Motion.enter(backdrop, { variant: 'modal' });
      activeOverlayKind = kind;
      activeLobbyTabRendered = null;
    }
    return backdrop;
  }

  function renderLobbyOverlay() {
    const lang = I18n.getLang();
    const minP = config.minPlayers || 2;
    const maxP = config.maxPlayers || 8;
    const inOnlineLobby =
      lobbyOnlineJoined &&
      latestSnap &&
      engine.mode === 'online' &&
      latestSnap.lobby.phase === 'lobby';

    if (inOnlineLobby) {
      const backdrop = ensureOverlayBackdrop('online-lobby');
      const lobby = latestSnap.lobby;
      const mySeat = lobby.seats.find((s) => s.seatId === latestSnap.mySeatId);
      const canStart = engine.isHost && lobby.seats.length >= minP;
      const html = `
        <div class="dp-modal" data-motion-key="online-lobby-modal">
          <div class="dp-modal-header">
            <div>
              <span class="${categoryBadgeClass(config.category)}">${UI.escapeHtml(config.episode || '')} · ${UI.escapeHtml(config.category || '')}</span>
              <h2 class="dp-modal-title">${UI.escapeHtml(I18n.t(config.title))}</h2>
            </div>
            <button type="button" class="dp-room-chip" id="dp-lobby-copy-link" style="font-size:15px;padding:7px 14px;">
              <span>${UI.escapeHtml(engine.roomCode)}</span>
              <span class="dp-icon-swap" id="dp-lobby-copy-icon">${SVG_ICONS.copy}</span>
            </button>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 12px;border-radius:10px;background:var(--dp-brass-glow);border:1px solid var(--dp-border);margin-bottom:14px;">
            <span style="font-size:12.5px;color:var(--dp-ink-muted);">
              ${lang === 'zh' ? '分享房间码或邀请链接，好友打开即入局' : 'Share the code or invite link to play together instantly'}
            </span>
            <button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="dp-lobby-share-btn">
              ${lang === 'zh' ? '复制邀请链接' : 'Copy Invite Link'}
            </button>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span class="dp-tabular" style="font-size:12px;letter-spacing:0.08em;color:var(--dp-brass);font-weight:700;">
              ${lang === 'zh' ? `参赛席位 (${lobby.seats.length}/${maxP})` : `SEATS (${lobby.seats.length}/${maxP})`}
            </span>
            ${
              engine.isHost && lobby.seats.length < maxP
                ? `<button type="button" class="dp-btn dp-btn-sm" id="dp-lobby-add-bot">+ ${lang === 'zh' ? '添加 AI 玩家' : 'Add AI Bot'}</button>`
                : ''
            }
          </div>

          <div class="dp-seat-grid" id="dp-lobby-seat-grid">
            ${lobby.seats
              .map((s, idx) => {
                const isMine = s.seatId === latestSnap.mySeatId && !s.isBot;
                return `
                  <div class="dp-seat-card ${s.ready ? 'is-ready' : ''} ${s.isBot ? 'is-bot' : ''}" data-motion-key="seat-${UI.escapeHtml(s.seatId)}">
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                      <strong style="color:var(--dp-brass);margin-right:4px;">${UI.escapeHtml(s.avatar || '◆')}</strong>
                      ${UI.escapeHtml(s.name)}
                      ${idx === 0 ? `<small style="color:var(--dp-brass);"> ★</small>` : ''}
                    </span>
                    <span style="display:flex;align-items:center;gap:6px;">
                      ${
                        isMine
                          ? `<button type="button" class="dp-inline-edit-btn" id="dp-lobby-rename-me" title="${lang === 'zh' ? '修改代号' : 'Rename'}">✎</button>`
                          : ''
                      }
                      <span style="font-size:11px;color:${s.ready ? 'var(--dp-emerald)' : 'var(--dp-ink-faint)'};">
                        ${s.isBot ? 'AI' : s.ready ? (lang === 'zh' ? '就绪' : 'READY') : lang === 'zh' ? '等待' : 'WAIT'}
                      </span>
                      ${
                        engine.isHost && idx > 0
                          ? `<button type="button" data-rm-seat="${UI.escapeHtml(s.seatId)}" style="color:var(--dp-ink-faint);font-size:12px;" title="Remove">✕</button>`
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
              ? `<div style="font-size:12px;color:var(--dp-ink-muted);margin-bottom:10px;">${lang === 'zh' ? '观战席' : 'Spectators'}: ${lobby.spectators.map((x) => UI.escapeHtml(x.name)).join(', ')}</div>`
              : ''
          }

          ${engine.isHost ? renderOptionsFields(lobby.options) : ''}

          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:20px;">
            <button type="button" class="dp-btn dp-btn-ghost" id="dp-lobby-leave">
              ← ${lang === 'zh' ? '离开房间' : 'Leave Room'}
            </button>
            <div style="display:flex;gap:10px;">
              ${
                !engine.isHost && mySeat
                  ? `<button type="button" class="dp-btn ${mySeat.ready ? '' : 'dp-btn-primary'}" id="dp-lobby-ready">${
                      mySeat.ready
                        ? lang === 'zh'
                          ? '取消准备'
                          : 'Unready'
                        : lang === 'zh'
                        ? '点击准备'
                        : 'Ready Up'
                    }</button>`
                  : ''
              }
              ${
                engine.isHost
                  ? `<button type="button" class="dp-btn dp-btn-primary" id="dp-lobby-start" ${canStart ? '' : 'disabled'}>${
                      canStart
                        ? lang === 'zh'
                          ? '开始对局 →'
                          : 'Start Match →'
                        : lang === 'zh'
                        ? `至少需要 ${minP} 名玩家`
                        : `Need at least ${minP} players`
                    }</button>`
                  : `<span style="font-size:12.5px;color:var(--dp-ink-muted);align-self:center;">${
                      latestSnap.isSpectator
                        ? lang === 'zh'
                          ? '观战模式 · 等待房主开始...'
                          : 'Spectating · Waiting for host...'
                        : lang === 'zh'
                        ? '等待房主开始对局...'
                        : 'Waiting for host to start...'
                    }</span>`
              }
            </div>
          </div>
        </div>
      `;

      Motion.patchDOM(backdrop, html);

      Motion.delegate(
        backdrop,
        'click',
        '#dp-lobby-copy-link',
        () => copyInviteUrl(engine.roomCode, backdrop.querySelector('#dp-lobby-copy-icon')),
        'ol-copy'
      );
      Motion.delegate(
        backdrop,
        'click',
        '#dp-lobby-share-btn',
        () => copyInviteUrl(engine.roomCode, backdrop.querySelector('#dp-lobby-copy-icon')),
        'ol-share'
      );
      Motion.delegate(
        backdrop,
        'click',
        '#dp-lobby-rename-me',
        () => {
          SFX.play('click');
          openRenameModal();
        },
        'ol-rename'
      );
      Motion.delegate(
        backdrop,
        'click',
        '#dp-lobby-add-bot',
        () => {
          SFX.play('click');
          engine.addBot(I18n.getLang());
        },
        'ol-add-bot'
      );
      Motion.delegate(
        backdrop,
        'click',
        '[data-rm-seat]',
        (_e, btn) => {
          SFX.play('click');
          engine.removeSeat(btn.dataset.rmSeat);
        },
        'ol-rm-seat'
      );
      Motion.delegate(
        backdrop,
        'click',
        '#dp-lobby-ready',
        () => {
          SFX.play('click');
          const curSeat = latestSnap?.lobby?.seats?.find((s) => s.seatId === latestSnap.mySeatId);
          if (curSeat) engine.setReady(!curSeat.ready);
        },
        'ol-ready'
      );
      Motion.delegate(
        backdrop,
        'click',
        '#dp-lobby-start',
        () => {
          SFX.play('click');
          const res = engine.startMatch();
          if (!res.ok) UI.toast(res.reason, 'error');
        },
        'ol-start'
      );
      Motion.delegate(
        backdrop,
        'click',
        '#dp-lobby-leave',
        () => {
          SFX.play('click');
          engine.destroy();
          lobbyOnlineJoined = false;
          latestSnap = null;
          renderAll();
        },
        'ol-leave'
      );
      if (engine.isHost) {
        bindOptionsFields(backdrop, lobby.options, (k, v) => engine.setOption(k, v));
      }
      return;
    }

    // Persistent Entry Mode Selection Modal (tabs & name input stay mounted across tab switches!)
    const backdrop = ensureOverlayBackdrop('entry');
    const defaultNick = playerNameInput || (lang === 'zh' ? '参赛者' : 'Challenger');
    const tabChanged = activeLobbyTabRendered !== lobbyTab;
    activeLobbyTabRendered = lobbyTab;

    const panelContent =
      lobbyTab === 'solo'
        ? `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
            <label style="font-size:13.5px;color:var(--dp-ink-muted);">
              ${lang === 'zh' ? `总参赛人数 (${minP}–${maxP} 人)` : `Total Players (${minP}–${maxP})`}
            </label>
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="dp-btn dp-btn-icon" id="dp-solo-dec" ${soloCount <= minP ? 'disabled' : ''}>−</button>
              <span id="dp-solo-count" class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:18px;font-weight:700;min-width:28px;text-align:center;color:var(--dp-brass-bright);">${soloCount}</span>
              <button type="button" class="dp-btn dp-btn-icon" id="dp-solo-inc" ${soloCount >= maxP ? 'disabled' : ''}>+</button>
            </div>
          </div>
          ${renderOptionsFields(localOptions)}
          <div style="margin-top:20px;display:flex;justify-content:flex-end;">
            <button type="button" class="dp-btn dp-btn-primary" id="dp-start-solo" style="min-width:184px;min-height:44px;">
              ${lang === 'zh' ? '进入对局 →' : 'Start Match →'}
            </button>
          </div>
        `
        : lobbyTab === 'online'
        ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="padding:14px;border-radius:12px;border:1px solid var(--dp-border);background:var(--dp-brass-glow);">
              <div style="font-weight:700;margin-bottom:6px;">${lang === 'zh' ? '创建新房间' : 'Create Room'}</div>
              <p style="font-size:12px;color:var(--dp-ink-muted);margin:0 0 12px;">
                ${lang === 'zh' ? '生成 5 位房间码与邀请链接，随时添加 AI 补位。' : 'Generate a 5-char code & invite URL. Add AI bots anytime.'}
              </p>
              <button type="button" class="dp-btn dp-btn-primary" id="dp-create-room" style="width:100%;" ${lobbyBusy ? 'disabled' : ''}>
                ${lobbyBusy ? `<span class="dp-spinner"></span><span>${lang === 'zh' ? '创建中' : 'Creating'}</span>` : lang === 'zh' ? '创建联机房间' : 'Create Room'}
              </button>
            </div>

            <div style="padding:14px;border-radius:12px;border:1px solid var(--dp-border);background:var(--dp-surface-row);">
              <div style="font-weight:700;margin-bottom:6px;">${lang === 'zh' ? '加入好友房间' : 'Join Room'}</div>
              <input class="dp-input dp-input-mono" id="dp-join-code" maxlength="6" value="${UI.escapeHtml(roomCodeInput)}" placeholder="K7M4P" style="margin-bottom:10px;" />
              <div style="display:flex;gap:8px;">
                <button type="button" class="dp-btn dp-btn-primary" id="dp-join-room" style="flex:1;" ${lobbyBusy ? 'disabled' : ''}>
                  ${lobbyBusy ? `<span class="dp-spinner"></span>` : lang === 'zh' ? '加入' : 'Join'}
                </button>
                <button type="button" class="dp-btn dp-btn-ghost" id="dp-join-spec" ${lobbyBusy ? 'disabled' : ''}>
                  ${lang === 'zh' ? '观战' : 'Watch'}
                </button>
              </div>
            </div>
          </div>
          ${
            lobbyError
              ? `<div style="margin-top:12px;padding:9px 12px;border-radius:8px;background:rgba(220,53,69,0.14);border:1px solid var(--dp-crimson);color:var(--dp-crimson-bright);font-size:12.5px;">${UI.escapeHtml(lobbyError)}</div>`
              : ''
          }
        `
        : `
          <div style="margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:12.5px;color:var(--dp-ink-muted);">${lang === 'zh' ? '本地真人玩家' : 'Local Human Players'}</span>
              <div style="display:flex;gap:6px;">
                <button type="button" class="dp-btn dp-btn-sm" id="dp-hs-add" ${hotseatNames.length + hotseatBots >= maxP ? 'disabled' : ''}>+ ${lang === 'zh' ? '真人' : 'Human'}</button>
                <button type="button" class="dp-btn dp-btn-sm" id="dp-hs-add-bot" ${hotseatNames.length + hotseatBots >= maxP ? 'disabled' : ''}>+ AI (${hotseatBots})</button>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              ${hotseatNames
                .map(
                  (nm, idx) => `
                  <div style="display:flex;gap:6px;" data-motion-key="hs-${idx}">
                    <input class="dp-input" data-hs-idx="${idx}" value="${UI.escapeHtml(nm)}" />
                    ${idx >= 2 ? `<button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" data-hs-rm="${idx}">✕</button>` : ''}
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
          ${renderOptionsFields(localOptions)}
          <div style="margin-top:18px;display:flex;justify-content:flex-end;">
            <button type="button" class="dp-btn dp-btn-primary" id="dp-start-hotseat" style="min-width:184px;min-height:44px;">
              ${lang === 'zh' ? '开始同屏对战 →' : 'Start Pass & Play →'}
            </button>
          </div>
        `;

    const shellHtml = `
      <div class="dp-modal" data-motion-key="entry-modal">
        <div class="dp-modal-header">
          <div>
            <span class="${categoryBadgeClass(config.category)}">${UI.escapeHtml(config.episode || 'SEASON 3')} · ${UI.escapeHtml(config.category || 'MATCH')}</span>
            <h2 class="dp-modal-title">${UI.escapeHtml(I18n.t(config.title))}</h2>
            ${config.title?.ko ? `<div style="font-size:12px;color:var(--dp-ink-faint);margin-top:2px;">${UI.escapeHtml(config.title.ko)}</div>` : ''}
          </div>
          <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="dp-entry-rules">
            ${lang === 'zh' ? '查看规则' : 'Rules'}
          </button>
        </div>

        <div class="dp-mode-tabs" id="dp-mode-tabs" role="tablist">
          <button type="button" class="dp-mode-tab ${lobbyTab === 'solo' ? 'is-active' : ''}" data-tab="solo" data-motion-key="tab-solo">
            <strong>${lang === 'zh' ? '单人 vs AI' : 'Solo vs AI'}</strong>
            <span>${lang === 'zh' ? '即刻开局 · 智能对手' : 'Instant start vs Bots'}</span>
          </button>
          <button type="button" class="dp-mode-tab ${lobbyTab === 'online' ? 'is-active' : ''}" data-tab="online" data-motion-key="tab-online">
            <strong>${lang === 'zh' ? '在线联机房间' : 'Online Room'}</strong>
            <span>${lang === 'zh' ? '房间码邀请 · 实时同步' : 'Room code · Live sync'}</span>
          </button>
          <button type="button" class="dp-mode-tab ${lobbyTab === 'hotseat' ? 'is-active' : ''}" data-tab="hotseat" data-motion-key="tab-hotseat">
            <strong>${lang === 'zh' ? '本地传屏对战' : 'Pass & Play'}</strong>
            <span>${lang === 'zh' ? '同设备多人 · 隐私护盾' : 'Same device · Shielded'}</span>
          </button>
        </div>

        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;color:var(--dp-ink-muted);margin-bottom:5px;">
            ${lang === 'zh' ? '你的参赛代号' : 'Your Player Name'}
          </label>
          <input class="dp-input" id="dp-name-input" type="text" maxlength="20" value="${UI.escapeHtml(playerNameInput)}" placeholder="${UI.escapeHtml(defaultNick)}" />
        </div>

        <div id="dp-lobby-panel" data-motion-key="panel-${lobbyTab}">${panelContent}</div>
      </div>
    `;

    Motion.patchDOM(backdrop, shellHtml);

    // Position sliding indicator cleanly over the active tab
    const tabsEl = backdrop.querySelector('#dp-mode-tabs');
    const activeTabBtn = tabsEl?.querySelector(`[data-tab="${lobbyTab}"]`);
    requestAnimationFrame(() => Motion.slidingIndicator(tabsEl, activeTabBtn));

    if (tabChanged) {
      const panel = backdrop.querySelector('#dp-lobby-panel');
      if (panel && !Motion.isReduced()) {
        panel.classList.remove('dp-panel-crossfade');
        void panel.offsetWidth;
        panel.classList.add('dp-panel-crossfade');
      }
    }

    // Bind delegated entry modal listeners once
    Motion.delegate(
      backdrop,
      'click',
      '#dp-entry-rules',
      () => {
        SFX.play('click');
        rulesOpen = true;
        renderDrawer();
      },
      'entry-rules'
    );

    Motion.delegate(
      backdrop,
      'click',
      '[data-tab]',
      (_e, btn) => {
        if (btn.dataset.tab === lobbyTab) return;
        SFX.play('click');
        lobbyTab = btn.dataset.tab;
        lobbyError = '';
        renderLobbyOverlay();
      },
      'entry-tab'
    );

    Motion.delegate(
      backdrop,
      'input',
      '#dp-name-input',
      (_e, inp) => {
        playerNameInput = inp.value;
        savePlayerName(playerNameInput);
        if (hotseatNames.length > 0 && playerNameInput.trim()) {
          hotseatNames[0] = playerNameInput.trim().slice(0, 20);
        }
        if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
      },
      'entry-name'
    );

    Motion.delegate(
      backdrop,
      'click',
      '#dp-solo-dec',
      () => {
        if (soloCount <= minP) return;
        SFX.play('click');
        soloCount = Math.max(minP, soloCount - 1);
        const countEl = backdrop.querySelector('#dp-solo-count');
        Motion.tickDigit(countEl, soloCount, -1);
        backdrop.querySelector('#dp-solo-dec').disabled = soloCount <= minP;
        backdrop.querySelector('#dp-solo-inc').disabled = soloCount >= maxP;
      },
      'entry-solo-dec'
    );

    Motion.delegate(
      backdrop,
      'click',
      '#dp-solo-inc',
      () => {
        if (soloCount >= maxP) return;
        SFX.play('click');
        soloCount = Math.min(maxP, soloCount + 1);
        const countEl = backdrop.querySelector('#dp-solo-count');
        Motion.tickDigit(countEl, soloCount, 1);
        backdrop.querySelector('#dp-solo-dec').disabled = soloCount <= minP;
        backdrop.querySelector('#dp-solo-inc').disabled = soloCount >= maxP;
      },
      'entry-solo-inc'
    );

    Motion.delegate(
      backdrop,
      'click',
      '#dp-start-solo',
      () => {
        SFX.play('click');
        const curLang = I18n.getLang();
        const nick = playerNameInput.trim() || (curLang === 'zh' ? '参赛者' : 'Challenger');
        savePlayerName(nick);
        engine.startSolo({ playerName: nick, totalPlayers: soloCount, options: localOptions, lang: curLang });
      },
      'entry-start-solo'
    );

    Motion.delegate(
      backdrop,
      'input',
      '#dp-join-code',
      (_e, inp) => {
        roomCodeInput = normalizeRoomCode(inp.value);
        inp.value = roomCodeInput;
      },
      'entry-join-code'
    );

    Motion.delegate(
      backdrop,
      'click',
      '#dp-create-room',
      async () => {
        SFX.play('click');
        const curLang = I18n.getLang();
        const nick = playerNameInput.trim() || (curLang === 'zh' ? '参赛者' : 'Challenger');
        savePlayerName(nick);
        lobbyBusy = true;
        lobbyError = '';
        renderLobbyOverlay();
        try {
          await engine.createOnlineRoom({ playerName: nick, transportPref });
          lobbyOnlineJoined = true;
        } catch (err) {
          lobbyError = err?.message || 'Failed to create room';
        } finally {
          lobbyBusy = false;
          renderAll();
        }
      },
      'entry-create-room'
    );

    const doJoin = async (wantSpectator) => {
      const curLang = I18n.getLang();
      const code = normalizeRoomCode(roomCodeInput);
      const codeEl = backdrop.querySelector('#dp-join-code');
      if (code.length < 4) {
        SFX.play('error');
        Motion.shake(codeEl);
        lobbyError = curLang === 'zh' ? '请输入 5 位房间码' : 'Enter a valid 5-char room code';
        renderLobbyOverlay();
        backdrop.querySelector('#dp-join-code')?.focus();
        return;
      }
      SFX.play('click');
      const nick = playerNameInput.trim() || (curLang === 'zh' ? '参赛者' : 'Challenger');
      savePlayerName(nick);
      lobbyBusy = true;
      lobbyError = '';
      renderLobbyOverlay();
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

    Motion.delegate(backdrop, 'click', '#dp-join-room', () => doJoin(initialSpectate), 'entry-join');
    Motion.delegate(backdrop, 'click', '#dp-join-spec', () => doJoin(true), 'entry-spec');

    Motion.delegate(
      backdrop,
      'input',
      '[data-hs-idx]',
      (_e, inp) => {
        const idx = Number(inp.dataset.hsIdx);
        hotseatNames[idx] = inp.value;
        if (idx === 0 && inp.value.trim()) {
          playerNameInput = inp.value;
          savePlayerName(inp.value);
          if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
        }
      },
      'entry-hs-inp'
    );
    Motion.delegate(
      backdrop,
      'click',
      '[data-hs-rm]',
      (_e, btn) => {
        hotseatNames.splice(Number(btn.dataset.hsRm), 1);
        renderLobbyOverlay();
      },
      'entry-hs-rm'
    );
    Motion.delegate(
      backdrop,
      'click',
      '#dp-hs-add',
      () => {
        const curLang = I18n.getLang();
        if (hotseatNames.length + hotseatBots < maxP) {
          hotseatNames.push(
            curLang === 'zh' ? `玩家 ${hotseatNames.length + 1}` : `Player ${hotseatNames.length + 1}`
          );
          renderLobbyOverlay();
        }
      },
      'entry-hs-add'
    );
    Motion.delegate(
      backdrop,
      'click',
      '#dp-hs-add-bot',
      () => {
        if (hotseatNames.length + hotseatBots < maxP) {
          hotseatBots += 1;
          renderLobbyOverlay();
        }
      },
      'entry-hs-bot'
    );
    Motion.delegate(
      backdrop,
      'click',
      '#dp-start-hotseat',
      () => {
        SFX.play('click');
        const curLang = I18n.getLang();
        if (hotseatNames.length + hotseatBots < minP) {
          UI.toast(curLang === 'zh' ? `至少需要 ${minP} 名玩家` : `Need at least ${minP} players`, 'error');
          return;
        }
        engine.startHotseat({ playerNames: hotseatNames, botCount: hotseatBots, options: localOptions, lang: curLang });
      },
      'entry-hs-start'
    );

    bindOptionsFields(backdrop, localOptions, null);
  }

  function renderResultOverlay(result) {
    const lang = I18n.getLang();
    const seats = latestSnap?.lobby?.seats || [];
    const nameOf = (sid) => seats.find((s) => s.seatId === sid)?.name || sid;
    const winners = (result.winnerSeatIds || []).map(nameOf);
    const backdrop = ensureOverlayBackdrop('result');

    const html = `
      <div class="dp-modal" style="text-align:center;" data-motion-key="result-modal">
        <span class="dp-badge">${lang === 'zh' ? '最终裁决' : 'FINAL VERDICT'}</span>
        <h2 class="dp-modal-title" style="font-size:28px;color:var(--dp-brass-bright);margin-top:10px;">
          ${winners.length ? `♛ ${UI.escapeHtml(winners.join(' & '))}` : lang === 'zh' ? '平局' : 'DRAW'}
        </h2>
        ${
          result.summary
            ? `<p style="color:var(--dp-ink-muted);margin:8px 0 18px;">${UI.escapeHtml(I18n.t(result.summary))}</p>`
            : ''
        }
        ${
          Array.isArray(result.rankings) && result.rankings.length
            ? `
              <div style="display:flex;flex-direction:column;gap:7px;margin:16px 0 22px;text-align:left;">
                ${result.rankings
                  .map(
                    (r, i) => `
                    <div class="dp-seat-card ${i === 0 ? 'is-ready' : ''}">
                      <span><strong class="dp-tabular" style="color:var(--dp-brass);margin-right:8px;">#${i + 1}</strong>${UI.escapeHtml(nameOf(r.seatId))}</span>
                      <span class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">${UI.escapeHtml(r.label ?? r.score ?? '')}</span>
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
              ? `<button type="button" class="dp-btn dp-btn-primary" id="dp-res-rematch">${lang === 'zh' ? '再来一局' : 'Rematch'}</button>`
              : ''
          }
          <button type="button" class="dp-btn" id="dp-res-review">${lang === 'zh' ? '查看终局棋盘' : 'Inspect Board'}</button>
          <a class="dp-btn dp-btn-ghost" href="../../">${lang === 'zh' ? '返回游戏大厅' : 'Back to Hub'}</a>
        </div>
      </div>
    `;
    Motion.patchDOM(backdrop, html);

    Motion.delegate(
      backdrop,
      'click',
      '#dp-res-rematch',
      () => {
        SFX.play('click');
        engine.rematch();
      },
      'res-rematch'
    );
    Motion.delegate(
      backdrop,
      'click',
      '#dp-res-review',
      () => {
        SFX.play('click');
        dismissOverlay();
      },
      'res-review'
    );
  }

  function renderAll() {
    renderHudAndSidebar();
    renderDrawer();

    if (!latestSnap || latestSnap.lobby.phase === 'lobby') {
      removePrivacyCurtain();
      renderLobbyOverlay();
      return;
    }

    if (latestSnap.lobby.phase === 'ended' && latestSnap.result) {
      renderResultOverlay(latestSnap.result);
    } else {
      dismissOverlay();
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
          lang: I18n.getLang(),
          lastEvent: latestSnap.lastEvent,
          dispatch: (action) => engine.dispatch(action),
          sfx: SFX,
          ui: UI,
          motion: Motion,
          theme: Theme,
          log: (text, kind = 'system') => pushFeed(text, kind),
        });
      } catch (err) {
        console.error('[mountGame] render error:', err);
      }
    }
  }

  const unsubLang = I18n.onChange(() => renderAll());
  const unsubTheme = Theme.onChange(() => syncAudioAndThemeButtons());
  renderAll();

  return {
    engine,
    destroy() {
      clearInterval(timerInterval);
      unsubLang();
      unsubTheme();
      mobileMq?.removeEventListener?.('change', onMqChange);
      removePrivacyCurtain();
      engine.destroy();
    },
  };
}

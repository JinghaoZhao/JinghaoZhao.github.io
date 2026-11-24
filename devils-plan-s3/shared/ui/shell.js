/**
 * Broadcast Game Shell & Shared UI Toolkit ("The Devil's Plan: Dead Again")
 *
 * Exposes:
 *  - UI helpers: toast, escapeHtml, formatTime, renderPieceBadge, el, confirm
 *  - mountGame({ config, rules, root, render }): wires GameEngine + HUD + Lobby + Rules + Chat + Results
 */

import { I18n } from '../i18n.js';
import { SFX } from '../audio/sound-engine.js';
import { GameEngine } from '../net/game-engine.js';
import { normalizeRoomCode, sanitizePlayerName } from '../net/protocol.js';
import { showPrivacyCurtain, removePrivacyCurtain } from './privacy-curtain.js';

const NAME_STORAGE_KEY = 'dp3_player_name';

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
    return `<span class="dp-piece" title="Pieces"><span class="dp-piece-icon" aria-hidden="true"></span><span>${Number(count) || 0}</span></span>`;
  },

  toast(message, tone = 'info', durationMs = 2800) {
    const stack = getToastStack();
    const el = document.createElement('div');
    el.className = `dp-toast ${tone === 'error' ? 'is-error' : tone === 'success' ? 'is-success' : ''}`;
    el.textContent = String(message);
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s';
      setTimeout(() => el.remove(), 260);
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
      node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
    }
    return node;
  },

  confirm(title, body) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'dp-modal-backdrop';
      backdrop.innerHTML = `
        <div class="dp-modal" style="width:min(420px,100%);">
          <h3 class="dp-modal-title" style="font-size:18px;margin-bottom:8px;">${UI.escapeHtml(title)}</h3>
          <p style="color:var(--dp-ink-muted);margin:0 0 18px;font-size:14px;">${UI.escapeHtml(body)}</p>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="dp-btn dp-btn-ghost" data-ans="no">${I18n.t({ zh: '取消', en: 'Cancel' })}</button>
            <button type="button" class="dp-btn dp-btn-primary" data-ans="yes">${I18n.t({ zh: '确认', en: 'Confirm' })}</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ans]');
        if (!btn && e.target !== backdrop) return;
        const ok = btn?.dataset.ans === 'yes';
        backdrop.remove();
        resolve(ok);
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
    .replace(/`(.+?)`/g, '<code style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">$1</code>');
}

function categoryBadgeClass(category) {
  const c = String(category || '').toUpperCase();
  if (c.includes('PRISON') || c.includes('DEATH') || c.includes('EXILE')) return 'dp-badge dp-badge-crimson';
  if (c.includes('HIDDEN') || c.includes('MINI')) return 'dp-badge dp-badge-cyan';
  return 'dp-badge';
}

export function mountGame({ config, rules, root, render }) {
  const container = root || document.getElementById('game-root') || document.body;
  document.body.classList.add('dp-body');

  // Parse URL params (?room=XXXXX&mode=spectate&transport=auto|peerjs|mqtt|local)
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomParam = normalizeRoomCode(urlParams.get('room') || '');
  const initialSpectate = urlParams.get('mode') === 'spectate';
  const transportPref = urlParams.get('transport') || 'auto';

  // Shell UI state
  let sidebarCollapsed = window.innerWidth < 960;
  let rulesOpen = false;
  let lobbyTab = initialRoomParam ? 'online' : 'solo'; // 'solo' | 'online' | 'hotseat'
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
  let latestSnap = null;
  let lastTickedSec = null;

  // Build static shell frame once
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
            <span aria-hidden="true">⧉</span>
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
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-btn-ambience" title="Studio Tension Drone">〰</button>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-btn-mute" title="Mute / Unmute SFX">🔊</button>
          <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-btn-sidebar" title="Toggle Roster & Log">☰</button>
        </div>
      </header>

      <div class="dp-workspace ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}" id="dp-workspace">
        <main class="dp-stage" id="dp-stage"></main>
        <div class="dp-sidebar-backdrop" id="dp-sidebar-backdrop" aria-hidden="true"></div>
        <aside class="dp-sidebar" id="dp-sidebar">
          <div class="dp-sidebar-section">
            <div class="dp-sidebar-label">
              <span id="dp-roster-heading"></span>
              <span style="display:inline-flex;align-items:center;gap:8px;">
                <span id="dp-roster-count">0</span>
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
  const connPillEl = container.querySelector('#dp-conn-pill');
  const connTextEl = container.querySelector('#dp-conn-text');
  const rosterListEl = container.querySelector('#dp-roster-list');
  const rosterCountEl = container.querySelector('#dp-roster-count');
  const feedListEl = container.querySelector('#dp-feed-list');
  const chatInputEl = container.querySelector('#dp-chat-input');

  function pushFeed(text, kind = 'system', author = null) {
    feedItems.push({ text, kind, author, ts: Date.now() });
    if (feedItems.length > 80) feedItems.shift();
    renderFeed();
  }

  function renderFeed() {
    feedListEl.innerHTML = feedItems
      .map((item) => {
        const cls = item.kind === 'alert' ? 'is-alert' : item.kind === 'system' ? 'is-system' : '';
        const prefix = item.author ? `<strong style="color:var(--dp-brass-bright);">${UI.escapeHtml(item.author)}: </strong>` : '';
        return `<div class="dp-feed-item ${cls}">${prefix}${UI.escapeHtml(item.text)}</div>`;
      })
      .join('');
    feedListEl.scrollTop = feedListEl.scrollHeight;
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

  async function copyInviteUrl(code) {
    const url = buildInviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      SFX.play('click');
      UI.toast(I18n.t({ zh: `已复制邀请链接（房间 ${code}）`, en: `Invite link copied (Room ${code})` }), 'success');
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
        pushFeed(I18n.t({ zh: '对局正式开始！', en: 'Match started!' }), 'system');
      }
      if (snap.lobby?.phase === 'ended' && prevPhase !== 'ended') {
        SFX.play('victory');
        pushFeed(I18n.t({ zh: '对局结束，公布最终结果。', en: 'Match concluded.' }), 'alert');
      }
      renderAll();
    },
  });

  // HUD Button Wiring
  container.querySelector('#dp-btn-rules').addEventListener('click', () => {
    SFX.play('click');
    rulesOpen = !rulesOpen;
    renderDrawer();
  });

  container.querySelector('#dp-btn-lang').addEventListener('click', () => {
    SFX.play('click');
    I18n.toggle();
  });

  const btnMute = container.querySelector('#dp-btn-mute');
  const btnAmb = container.querySelector('#dp-btn-ambience');
  const btnProfile = container.querySelector('#dp-btn-profile');
  const profileNameEl = container.querySelector('#dp-profile-name');

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
          <input class="dp-input" id="dp-rename-input" type="text" maxlength="20" value="${UI.escapeHtml(current)}" placeholder="${lang === 'zh' ? '输入你的代号（最多 20 字）' : 'Enter your name (max 20 chars)'}" autocomplete="nickname" />
          <p style="font-size:12px;color:var(--dp-ink-muted);margin:8px 0 16px;">
            ${
              latestSnap && engine.mode === 'online'
                ? lang === 'zh'
                  ? '修改后将立即实时同步给房间内所有玩家。'
                  : 'Syncs instantaneously to everyone in the room.'
                : lang === 'zh'
                ? '将自动记住并在所有第三季游戏中生效。'
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

    const input = backdrop.querySelector('#dp-rename-input');
    const close = () => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
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
      UI.toast(
        lang === 'zh' ? `代号已更新为：${next}` : `Name updated to: ${next}`,
        'success'
      );
    });

    input?.focus();
    input?.select();
  }

  btnProfile?.addEventListener('click', () => {
    SFX.play('click');
    openRenameModal();
  });

  function syncAudioButtons() {
    btnMute.textContent = SFX.isMuted() ? '🔇' : '🔊';
    btnAmb.style.color = SFX.isAmbienceOn() && !SFX.isMuted() ? 'var(--dp-brass-bright)' : '';
    btnAmb.style.borderColor = SFX.isAmbienceOn() && !SFX.isMuted() ? 'var(--dp-border-strong)' : '';
  }

  btnMute.addEventListener('click', () => {
    SFX.toggleMute();
    syncAudioButtons();
  });

  btnAmb.addEventListener('click', () => {
    const on = SFX.toggleAmbience();
    syncAudioButtons();
    UI.toast(
      on
        ? I18n.t({ zh: '已开启演播室悬疑氛围音', en: 'Studio tension ambience ON' })
        : I18n.t({ zh: '已关闭氛围音', en: 'Studio ambience OFF' })
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
    if (e.matches) setSidebarCollapsed(true);
  };
  mobileMq?.addEventListener?.('change', onMqChange);

  container.querySelector('#dp-btn-lobby').addEventListener('click', async () => {
    SFX.play('click');
    if (latestSnap?.lobby?.phase === 'playing' || latestSnap?.lobby?.phase === 'ended') {
      const ok = await UI.confirm(
        I18n.t({ zh: '返回大厅？', en: 'Return to Lobby?' }),
        I18n.t({ zh: '当前对局进度将会重置或断开连接。', en: 'Current match view will return to the room lobby.' })
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
      copyInviteUrl(engine.roomCode);
    }
  });

  container.querySelector('#dp-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = chatInputEl.value.trim();
    if (!val) return;
    chatInputEl.value = '';
    engine.sendChat(val);
  });

  // Countdown timer animation ticker (250ms)
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
    container.querySelector('#dp-feed-heading').textContent = lang === 'zh' ? '演播室实况 & 聊天' : 'BROADCAST LOG & CHAT';
    chatInputEl.placeholder = lang === 'zh' ? '发送消息...' : 'Send message...';
    syncAudioButtons();

    // Room Code Chip
    if (latestSnap && engine.mode === 'online' && engine.roomCode) {
      roomChipEl.hidden = false;
      roomCodeLabelEl.textContent = engine.roomCode;
    } else {
      roomChipEl.hidden = true;
    }

    // Connection Pill
    const st = latestSnap?.transportStatus || { state: 'idle', transport: 'none' };
    connPillEl.className = 'dp-conn-pill';
    if (!latestSnap) {
      connTextEl.textContent = lang === 'zh' ? '准备就绪' : 'READY';
    } else if (engine.mode === 'solo') {
      connPillEl.classList.add('is-live');
      connTextEl.textContent = lang === 'zh' ? '单人 AI' : 'SOLO AI';
    } else if (engine.mode === 'hotseat') {
      connPillEl.classList.add('is-live');
      connTextEl.textContent = lang === 'zh' ? '本地传屏' : 'HOTSEAT';
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
      connTextEl.textContent = lang === 'zh' ? '连接中...' : 'SYNCING...';
    } else {
      connTextEl.textContent = lang === 'zh' ? '已断开' : 'OFFLINE';
    }

    // Roster
    const seats = latestSnap?.lobby?.seats || [];
    const specs = latestSnap?.lobby?.spectators || [];
    rosterCountEl.textContent = specs.length ? `${seats.length} (+${specs.length})` : String(seats.length);
    rosterListEl.innerHTML = seats
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
          <div class="dp-roster-row ${isMe ? 'is-me' : ''} ${!s.connected ? 'is-offline' : ''}">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <span style="color:var(--dp-brass);margin-right:5px;">${UI.escapeHtml(s.avatar || '◆')}</span>
              ${UI.escapeHtml(s.name)}${isMe ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}
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
      btn.addEventListener('click', () => {
        engine.removeSeat(btn.dataset.takeover);
      });
    });
  }

  function renderDrawer() {
    if (!rulesOpen) {
      drawerRoot.innerHTML = '';
      return;
    }
    const lang = I18n.getLang();
    const md = I18n.t(config.rulesSummary) || I18n.t({ zh: '暂无规则说明。', en: 'No rules description provided.' });
    drawerRoot.innerHTML = `
      <div class="dp-drawer-backdrop" id="dp-drawer-backdrop">
        <div class="dp-drawer" role="dialog" aria-modal="true">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
            <div>
              <span class="${categoryBadgeClass(config.category)}">${UI.escapeHtml(config.episode || '')} · ${UI.escapeHtml(config.category || '')}</span>
              <h2 class="dp-modal-title" style="font-size:20px;">${UI.escapeHtml(I18n.t(config.title))}</h2>
            </div>
            <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="dp-drawer-close">✕</button>
          </div>
          <div class="dp-prose">${renderMiniMarkdown(md)}</div>
        </div>
      </div>
    `;
    drawerRoot.querySelector('#dp-drawer-close')?.addEventListener('click', () => {
      rulesOpen = false;
      renderDrawer();
    });
    drawerRoot.querySelector('#dp-drawer-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'dp-drawer-backdrop') {
        rulesOpen = false;
        renderDrawer();
      }
    });
  }

  function renderOptionsFields(currentOpts, onChange) {
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

  function renderLobbyOverlay() {
    const lang = I18n.getLang();
    const minP = config.minPlayers || 2;
    const maxP = config.maxPlayers || 8;
    const inOnlineLobby = lobbyOnlineJoined && latestSnap && engine.mode === 'online' && latestSnap.lobby.phase === 'lobby';

    if (inOnlineLobby) {
      const lobby = latestSnap.lobby;
      const mySeat = lobby.seats.find((s) => s.seatId === latestSnap.mySeatId);
      const canStart = engine.isHost && lobby.seats.length >= minP;
      overlayRoot.innerHTML = `
        <div class="dp-modal-backdrop">
          <div class="dp-modal">
            <div class="dp-modal-header">
              <div>
                <span class="${categoryBadgeClass(config.category)}">${UI.escapeHtml(config.episode || '')} · ${UI.escapeHtml(config.category || '')}</span>
                <h2 class="dp-modal-title">${UI.escapeHtml(I18n.t(config.title))}</h2>
              </div>
              <button type="button" class="dp-room-chip" id="dp-lobby-copy-link" style="font-size:15px;padding:7px 14px;">
                ${UI.escapeHtml(engine.roomCode)} ⧉
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(212,175,106,0.08);border:1px solid var(--dp-border);margin-bottom:14px;">
              <span style="font-size:12.5px;color:var(--dp-ink-muted);">
                ${lang === 'zh' ? '分享邀请链接或 5 位房间码，朋友无需安装即可实时联机' : 'Share invite URL or 5-char room code — instant zero-install multiplayer'}
              </span>
              <button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="dp-lobby-share-btn">
                ${lang === 'zh' ? '复制邀请链接' : 'Copy Invite Link'}
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:12px;letter-spacing:0.08em;color:var(--dp-brass);font-weight:700;">
                ${lang === 'zh' ? `参赛席位 (${lobby.seats.length}/${maxP})` : `SEATS (${lobby.seats.length}/${maxP})`}
              </span>
              ${
                engine.isHost && lobby.seats.length < maxP
                  ? `<button type="button" class="dp-btn dp-btn-sm" id="dp-lobby-add-bot">+ ${lang === 'zh' ? '添加 AI 玩家' : 'Add AI Bot'}</button>`
                  : ''
              }
            </div>

            <div class="dp-seat-grid">
              ${lobby.seats
                .map(
                  (s, idx) => {
                    const isMine = s.seatId === latestSnap.mySeatId && !s.isBot;
                    return `
                  <div class="dp-seat-card ${s.ready ? 'is-ready' : ''} ${s.isBot ? 'is-bot' : ''}">
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
                        ${s.isBot ? 'AI' : s.ready ? (lang === 'zh' ? '就绪' : 'READY') : (lang === 'zh' ? '等待' : 'WAIT')}
                      </span>
                      ${
                        engine.isHost && idx > 0
                          ? `<button type="button" data-rm-seat="${UI.escapeHtml(s.seatId)}" style="color:var(--dp-ink-faint);font-size:12px;" title="Remove">✕</button>`
                          : ''
                      }
                    </span>
                  </div>
                `;
                  }
                )
                .join('')}
            </div>

            ${
              lobby.spectators?.length
                ? `<div style="font-size:12px;color:var(--dp-ink-muted);margin-bottom:10px;">${lang === 'zh' ? '观战席' : 'Spectators'}: ${lobby.spectators.map((x) => UI.escapeHtml(x.name)).join(', ')}</div>`
                : ''
            }

            ${engine.isHost ? renderOptionsFields(lobby.options, null) : ''}

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
        </div>
      `;

      overlayRoot.querySelector('#dp-lobby-copy-link')?.addEventListener('click', () => copyInviteUrl(engine.roomCode));
      overlayRoot.querySelector('#dp-lobby-share-btn')?.addEventListener('click', () => copyInviteUrl(engine.roomCode));
      overlayRoot.querySelector('#dp-lobby-rename-me')?.addEventListener('click', () => {
        SFX.play('click');
        openRenameModal();
      });
      overlayRoot.querySelector('#dp-lobby-add-bot')?.addEventListener('click', () => {
        SFX.play('click');
        engine.addBot(lang);
      });
      overlayRoot.querySelectorAll('[data-rm-seat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          engine.removeSeat(btn.dataset.rmSeat);
        });
      });
      if (engine.isHost) {
        bindOptionsFields(overlayRoot, lobby.options, (k, v) => engine.setOption(k, v));
      }
      overlayRoot.querySelector('#dp-lobby-ready')?.addEventListener('click', () => {
        SFX.play('click');
        engine.setReady(!mySeat.ready);
      });
      overlayRoot.querySelector('#dp-lobby-start')?.addEventListener('click', () => {
        SFX.play('click');
        const res = engine.startMatch();
        if (!res.ok) UI.toast(res.reason, 'error');
      });
      overlayRoot.querySelector('#dp-lobby-leave')?.addEventListener('click', () => {
        SFX.play('click');
        engine.destroy();
        lobbyOnlineJoined = false;
        latestSnap = null;
        renderAll();
      });
      return;
    }

    // Entry Mode Selection Modal
    const defaultNick = playerNameInput || (lang === 'zh' ? '参赛者' : 'Challenger');
    overlayRoot.innerHTML = `
      <div class="dp-modal-backdrop">
        <div class="dp-modal">
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

          <div class="dp-mode-tabs" role="tablist">
            <button type="button" class="dp-mode-tab ${lobbyTab === 'solo' ? 'is-active' : ''}" data-tab="solo">
              <strong>${lang === 'zh' ? '单人 vs AI' : 'Solo vs AI'}</strong>
              <span>${lang === 'zh' ? '即刻开局 · 智能对手' : 'Instant start vs Bots'}</span>
            </button>
            <button type="button" class="dp-mode-tab ${lobbyTab === 'online' ? 'is-active' : ''}" data-tab="online">
              <strong>${lang === 'zh' ? '在线联机房间' : 'Online Room'}</strong>
              <span>${lang === 'zh' ? '房间码邀请 · 实时同步' : 'Room code · Live sync'}</span>
            </button>
            <button type="button" class="dp-mode-tab ${lobbyTab === 'hotseat' ? 'is-active' : ''}" data-tab="hotseat">
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

          ${
            lobbyTab === 'solo'
              ? `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
                  <label style="font-size:13.5px;color:var(--dp-ink-muted);">
                    ${lang === 'zh' ? `总参赛人数 (${minP}–${maxP} 人)` : `Total Players (${minP}–${maxP})`}
                  </label>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <button type="button" class="dp-btn dp-btn-icon" id="dp-solo-dec">−</button>
                    <span style="font-family:var(--dp-font-mono);font-size:18px;font-weight:700;min-width:28px;text-align:center;color:var(--dp-brass-bright);">${soloCount}</span>
                    <button type="button" class="dp-btn dp-btn-icon" id="dp-solo-inc">+</button>
                  </div>
                </div>
                ${renderOptionsFields(localOptions, null)}
                <div style="margin-top:20px;display:flex;justify-content:flex-end;">
                  <button type="button" class="dp-btn dp-btn-primary" id="dp-start-solo" style="min-width:190px;min-height:44px;">
                    ${lang === 'zh' ? '立即进入对局 →' : 'Enter Match →'}
                  </button>
                </div>
              `
              : lobbyTab === 'online'
              ? `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <div style="padding:14px;border-radius:12px;border:1px solid var(--dp-border);background:rgba(212,175,106,0.06);">
                    <div style="font-weight:700;margin-bottom:6px;">${lang === 'zh' ? '创建新房间' : 'Create Room'}</div>
                    <p style="font-size:12px;color:var(--dp-ink-muted);margin:0 0 12px;">
                      ${lang === 'zh' ? '生成 5 位房间码与邀请链接，可随时添加 AI 补位。' : 'Generate a 5-char code & invite URL. Add AI bots anytime.'}
                    </p>
                    <button type="button" class="dp-btn dp-btn-primary" id="dp-create-room" style="width:100%;" ${lobbyBusy ? 'disabled' : ''}>
                      ${lobbyBusy ? (lang === 'zh' ? '创建中...' : 'Creating...') : (lang === 'zh' ? '创建联机房间' : 'Create Online Room')}
                    </button>
                  </div>

                  <div style="padding:14px;border-radius:12px;border:1px solid var(--dp-border);background:rgba(255,255,255,0.025);">
                    <div style="font-weight:700;margin-bottom:6px;">${lang === 'zh' ? '加入好友房间' : 'Join Room'}</div>
                    <input class="dp-input dp-input-mono" id="dp-join-code" maxlength="6" value="${UI.escapeHtml(roomCodeInput)}" placeholder="K7M4P" style="margin-bottom:10px;" />
                    <div style="display:flex;gap:8px;">
                      <button type="button" class="dp-btn dp-btn-primary" id="dp-join-room" style="flex:1;" ${lobbyBusy ? 'disabled' : ''}>
                        ${lobbyBusy ? '...' : (lang === 'zh' ? '加入' : 'Join')}
                      </button>
                      <button type="button" class="dp-btn dp-btn-ghost" id="dp-join-spec" ${lobbyBusy ? 'disabled' : ''}>
                        ${lang === 'zh' ? '观战' : 'Watch'}
                      </button>
                    </div>
                  </div>
                </div>
                ${
                  lobbyError
                    ? `<div style="margin-top:12px;padding:9px 12px;border-radius:8px;background:rgba(220,53,69,0.16);border:1px solid rgba(220,53,69,0.5);color:#ffb3bc;font-size:12.5px;">${UI.escapeHtml(lobbyError)}</div>`
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
                        <div style="display:flex;gap:6px;">
                          <input class="dp-input" data-hs-idx="${idx}" value="${UI.escapeHtml(nm)}" />
                          ${idx >= 2 ? `<button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" data-hs-rm="${idx}">✕</button>` : ''}
                        </div>
                      `
                      )
                      .join('')}
                  </div>
                </div>
                ${renderOptionsFields(localOptions, null)}
                <div style="margin-top:18px;display:flex;justify-content:flex-end;">
                  <button type="button" class="dp-btn dp-btn-primary" id="dp-start-hotseat" style="min-width:190px;min-height:44px;">
                    ${lang === 'zh' ? '开始本地对战 →' : 'Start Pass & Play →'}
                  </button>
                </div>
              `
          }
        </div>
      </div>
    `;

    overlayRoot.querySelector('#dp-entry-rules')?.addEventListener('click', () => {
      rulesOpen = true;
      renderDrawer();
    });

    overlayRoot.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SFX.play('click');
        lobbyTab = btn.dataset.tab;
        lobbyError = '';
        renderLobbyOverlay();
      });
    });

    const nameEl = overlayRoot.querySelector('#dp-name-input');
    nameEl?.addEventListener('input', () => {
      playerNameInput = nameEl.value;
      savePlayerName(playerNameInput);
      if (hotseatNames.length > 0 && playerNameInput.trim()) {
        hotseatNames[0] = playerNameInput.trim().slice(0, 20);
      }
      if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
    });

    bindOptionsFields(overlayRoot, localOptions, null);

    // Solo handlers
    overlayRoot.querySelector('#dp-solo-dec')?.addEventListener('click', () => {
      soloCount = Math.max(minP, soloCount - 1);
      renderLobbyOverlay();
    });
    overlayRoot.querySelector('#dp-solo-inc')?.addEventListener('click', () => {
      soloCount = Math.min(maxP, soloCount + 1);
      renderLobbyOverlay();
    });
    overlayRoot.querySelector('#dp-start-solo')?.addEventListener('click', () => {
      SFX.play('click');
      const nick = playerNameInput.trim() || defaultNick;
      savePlayerName(nick);
      engine.startSolo({ playerName: nick, totalPlayers: soloCount, options: localOptions, lang });
    });

    // Online handlers
    const codeEl = overlayRoot.querySelector('#dp-join-code');
    codeEl?.addEventListener('input', () => {
      roomCodeInput = normalizeRoomCode(codeEl.value);
      codeEl.value = roomCodeInput;
    });

    overlayRoot.querySelector('#dp-create-room')?.addEventListener('click', async () => {
      SFX.play('click');
      const nick = playerNameInput.trim() || defaultNick;
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
    });

    const doJoin = async (wantSpectator) => {
      const code = normalizeRoomCode(roomCodeInput);
      if (code.length < 4) {
        lobbyError = lang === 'zh' ? '请输入 5 位房间码' : 'Please enter a valid room code';
        renderLobbyOverlay();
        return;
      }
      SFX.play('click');
      const nick = playerNameInput.trim() || defaultNick;
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

    overlayRoot.querySelector('#dp-join-room')?.addEventListener('click', () => doJoin(initialSpectate));
    overlayRoot.querySelector('#dp-join-spec')?.addEventListener('click', () => doJoin(true));

    // Hotseat handlers
    overlayRoot.querySelectorAll('[data-hs-idx]').forEach((inp) => {
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
    overlayRoot.querySelectorAll('[data-hs-rm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        hotseatNames.splice(Number(btn.dataset.hsRm), 1);
        renderLobbyOverlay();
      });
    });
    overlayRoot.querySelector('#dp-hs-add')?.addEventListener('click', () => {
      if (hotseatNames.length + hotseatBots < maxP) {
        hotseatNames.push(lang === 'zh' ? `玩家 ${hotseatNames.length + 1}` : `Player ${hotseatNames.length + 1}`);
        renderLobbyOverlay();
      }
    });
    overlayRoot.querySelector('#dp-hs-add-bot')?.addEventListener('click', () => {
      if (hotseatNames.length + hotseatBots < maxP) {
        hotseatBots += 1;
        renderLobbyOverlay();
      }
    });
    overlayRoot.querySelector('#dp-start-hotseat')?.addEventListener('click', () => {
      SFX.play('click');
      if (hotseatNames.length + hotseatBots < minP) {
        UI.toast(lang === 'zh' ? `至少需要 ${minP} 名玩家` : `Need at least ${minP} players`, 'error');
        return;
      }
      engine.startHotseat({ playerNames: hotseatNames, botCount: hotseatBots, options: localOptions, lang });
    });
  }

  function renderResultOverlay(result) {
    const lang = I18n.getLang();
    const seats = latestSnap?.lobby?.seats || [];
    const nameOf = (sid) => seats.find((s) => s.seatId === sid)?.name || sid;
    const winners = (result.winnerSeatIds || []).map(nameOf);

    overlayRoot.innerHTML = `
      <div class="dp-modal-backdrop">
        <div class="dp-modal" style="text-align:center;">
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
                        <span><strong style="color:var(--dp-brass);margin-right:8px;">#${i + 1}</strong>${UI.escapeHtml(nameOf(r.seatId))}</span>
                        <span style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">${UI.escapeHtml(r.label ?? r.score ?? '')}</span>
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
      </div>
    `;

    overlayRoot.querySelector('#dp-res-rematch')?.addEventListener('click', () => {
      SFX.play('click');
      engine.rematch();
    });
    overlayRoot.querySelector('#dp-res-review')?.addEventListener('click', () => {
      SFX.play('click');
      overlayRoot.innerHTML = '';
    });
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
      overlayRoot.innerHTML = '';
    }

    // Invoke game-specific renderer
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
          log: (text, kind = 'system') => pushFeed(text, kind),
        });
      } catch (err) {
        console.error('[mountGame] render error:', err);
      }
    }
  }

  const unsubLang = I18n.onChange(() => renderAll());
  renderAll();

  return {
    engine,
    destroy() {
      clearInterval(timerInterval);
      unsubLang();
      mobileMq?.removeEventListener?.('change', onMqChange);
      removePrivacyCurtain();
      engine.destroy();
    },
  };
}

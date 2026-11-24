/**
 * Broadcast Game Shell & Shared UI Toolkit ("The Genius: Death Match Arena")
 *
 * Exposes:
 *  - UI helpers: toast, escapeHtml, formatTime, renderGarnetBadge, renderPieceBadge, el, confirm
 *  - mountGame({ config, rules, root, render }): wires GameEngine + Broadcast HUD + VS Nameplate Strip +
 *    Death Match VS Clash Splash + Survivor/Eliminated Garnet Transfer Curtain + Lobby + Rules + Chat
 */

import { I18n } from '../i18n.js';
import { SFX } from '../audio/sound-engine.js';
import { GarnetVault } from '../vault.js';
import { GameEngine } from '../net/game-engine.js';
import {
  normalizeRoomCode,
  formatRoomCodeDisplay,
  sanitizePlayerName,
} from '../net/protocol.js';
import { showPrivacyCurtain, removePrivacyCurtain } from './privacy-curtain.js';

const NAME_STORAGE_KEY = 'tgm_player_name';

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

  // Compatibility alias
  renderPieceBadge(count) {
    return UI.renderGarnetBadge(count);
  },

  toast(message, tone = 'info', durationMs = 2800) {
    const stack = getToastStack();
    const el = document.createElement('div');
    el.className = `tg-toast ${tone === 'error' ? 'is-error' : tone === 'success' ? 'is-success' : ''}`;
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
      const backdrop = document.createElement('div');
      backdrop.className = 'tg-modal-backdrop';
      backdrop.style.zIndex = '106';
      backdrop.innerHTML = `
        <div class="tg-modal" style="width:min(420px,100%);">
          <h3 class="tg-modal-title" style="font-size:18px;margin-bottom:8px;">${UI.escapeHtml(title)}</h3>
          <p style="color:var(--tg-ink-muted);margin:0 0 18px;font-size:14px;">${UI.escapeHtml(body)}</p>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="tg-btn tg-btn-ghost" data-ans="no">${I18n.t({ zh: '取消', en: 'Cancel' })}</button>
            <button type="button" class="tg-btn tg-btn-garnet" data-ans="yes">${I18n.t({ zh: '确认', en: 'Confirm' })}</button>
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
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let rafId = null;
  let running = true;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const count = isSurvivor ? 90 : 65;
  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: isSurvivor ? Math.random() * -canvas.height * 0.6 : canvas.height + Math.random() * 140,
    vx: (Math.random() - 0.5) * (isSurvivor ? 2.4 : 1.1),
    vy: isSurvivor ? 1.8 + Math.random() * 3.4 : -(1.1 + Math.random() * 2.6),
    size: 4 + Math.random() * 7,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.14,
    alpha: 0.75 + Math.random() * 0.25,
    color: isSurvivor
      ? ['#fff0c2', '#e4b95b', '#ff2e54', '#22d3ee'][Math.floor(Math.random() * 4)]
      : ['#ff2e54', '#d91b3a', '#7a091e', '#ff8598'][Math.floor(Math.random() * 4)],
  }));

  const tick = () => {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (isSurvivor && p.y > canvas.height + 20) {
        p.y = -16;
        p.x = Math.random() * canvas.width;
      } else if (!isSurvivor && p.y < -20) {
        p.y = canvas.height + 16;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.7, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    rafId = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  };
}

export function mountGame({ config, rules, root, render }) {
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

  const seasonsBadge = Array.isArray(config.seasons)
    ? config.seasons.join(' · ')
    : config.season || config.episode || 'DEATH MATCH';

  container.innerHTML = `
    <div class="tg-shell">
      <header class="tg-hud">
        <div class="tg-hud-left">
          <a class="tg-hud-back" href="../../" id="tg-back-hub">← <span data-i18n-hub>殿堂</span></a>
          <span class="tg-badge tg-badge-garnet">${UI.escapeHtml(seasonsBadge)}</span>
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
            <span aria-hidden="true">⧉</span>
          </button>
          <span class="tg-conn-pill" id="tg-conn-pill">
            <span class="tg-conn-dot"></span>
            <span id="tg-conn-text">READY</span>
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
          <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="tg-btn-lang">中/EN</button>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-btn-ambience" title="Tension Heartbeat & Drone">〰</button>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-btn-mute" title="Mute / Unmute SFX">🔊</button>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-btn-sidebar" title="Toggle Roster & Log">☰</button>
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
  const connPillEl = container.querySelector('#tg-conn-pill');
  const connTextEl = container.querySelector('#tg-conn-text');
  const rosterListEl = container.querySelector('#tg-roster-list');
  const rosterCountEl = container.querySelector('#tg-roster-count');
  const feedListEl = container.querySelector('#tg-feed-list');
  const chatInputEl = container.querySelector('#tg-chat-input');

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

  async function copyInviteUrl(code) {
    const url = buildInviteUrl(code);
    const displayCode = formatRoomCodeDisplay(code);
    try {
      await navigator.clipboard.writeText(url);
      SFX.play('garnetClink');
      UI.toast(
        I18n.t({
          zh: `已复制邀请链接（房间 ${displayCode}）`,
          en: `Invite link copied (${displayCode})`,
        }),
        'success'
      );
    } catch (_) {
      window.prompt(I18n.t({ zh: '复制邀请链接：', en: 'Copy invite link:' }), url);
    }
  }

  function showClashSplash(seats) {
    const lang = I18n.getLang();
    const p1 = seats[0]?.name || (lang === 'zh' ? '参赛者 1' : 'Player 1');
    const p2 = seats[1]?.name || (lang === 'zh' ? '参赛者 2' : 'Player 2');
    const extra = seats.length > 2 ? ` +${seats.length - 2}` : '';
    clashRoot.innerHTML = `
      <div class="tg-clash-overlay" id="tg-clash-overlay" role="status">
        <div class="tg-clash-kicker">THE GENIUS · ${UI.escapeHtml(I18n.t(config.title))}</div>
        <h2 class="tg-clash-heading">${lang === 'zh' ? 'DEATH MATCH · 死亡对决' : 'DEATH MATCH'}</h2>
        <div class="tg-clash-row">
          <div class="tg-clash-side is-left">
            <div style="font-size:11px;color:var(--tg-gold);letter-spacing:0.12em;margin-bottom:4px;">${lang === 'zh' ? '挑战者' : 'CONTESTANT'}</div>
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
    const clear = () => {
      clashRoot.innerHTML = '';
    };
    el?.addEventListener('click', clear);
    setTimeout(clear, 1950);
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
        pushFeed(I18n.t({ zh: '死亡对决正式打响！', en: 'Death Match has begun!' }), 'alert');
        showClashSplash(snap.lobby.seats || []);
      }

      if (nextPhase === 'ended' && prevPhase !== 'ended') {
        const res = snap.result;
        const myId = snap.mySeatId;
        const winners = res?.winnerSeatIds || [];
        const isWin = Boolean(myId && winners.includes(myId));
        const isDraw = winners.length === 0;

        if (!snap.isSpectator && snap.mode !== 'hotseat' && lastRecordedMatchSeq !== snap.roomCode + '_' + engine.seq) {
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

        pushFeed(
          I18n.t({ zh: '死亡对决终局！正在宣读最终裁决。', en: 'Death Match concluded. Final verdict!' }),
          'alert'
        );
      }

      renderAll();
    },
  });

  // HUD controls
  container.querySelector('#tg-btn-rules').addEventListener('click', () => {
    SFX.play('click');
    rulesOpen = !rulesOpen;
    renderDrawer();
  });

  container.querySelector('#tg-btn-lang').addEventListener('click', () => {
    SFX.play('click');
    I18n.toggle();
  });

  const btnMute = container.querySelector('#tg-btn-mute');
  const btnAmb = container.querySelector('#tg-btn-ambience');
  const btnProfile = container.querySelector('#tg-btn-profile');
  const profileNameEl = container.querySelector('#tg-profile-name');

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
            <span class="tg-badge tg-badge-gold">${lang === 'zh' ? '参赛者身份' : 'CONTESTANT ID'}</span>
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
                  ? '修改后将立即同步给当前对决房间内所有玩家。'
                  : 'Syncs instantaneously to everyone in the room.'
                : lang === 'zh'
                ? '将自动保存并在所有《游戏的法则》死亡对决中通用。'
                : 'Saved automatically across all Death Match games.'
            }
          </p>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="tg-btn tg-btn-ghost" id="tg-rename-cancel">${lang === 'zh' ? '取消' : 'Cancel'}</button>
            <button type="submit" class="tg-btn tg-btn-garnet">${lang === 'zh' ? '保存代号' : 'Save Name'}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    const input = backdrop.querySelector('#tg-rename-input');
    const close = () => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
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
      UI.toast(lang === 'zh' ? `代号已更新：${next}` : `Name updated: ${next}`, 'success');
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
    const ambActive = SFX.isAmbienceOn() && !SFX.isMuted();
    btnAmb.style.color = ambActive ? 'var(--tg-garnet-bright)' : '';
    btnAmb.style.borderColor = ambActive ? 'var(--tg-border-garnet)' : '';
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
        ? I18n.t({ zh: '已开启死亡对决演播室心跳氛围音', en: 'Death Match studio heartbeat ON' })
        : I18n.t({ zh: '已关闭演播室氛围音', en: 'Studio ambience OFF' })
    );
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
        I18n.t({ zh: '返回对决大厅？', en: 'Return to Room Lobby?' }),
        I18n.t({ zh: '当前对局将返回模式选择或房间大厅。', en: 'Current match view will return to the room lobby.' })
      );
      if (!ok) return;
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
      copyInviteUrl(engine.roomCode);
    }
  });

  container.querySelector('#tg-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = chatInputEl.value.trim();
    if (!val) return;
    chatInputEl.value = '';
    engine.sendChat(val);
  });

  // Countdown ticker with progress bar
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
    const dur = Math.max(1000, latestSnap.timer?.durationMs || 30000);
    const ratio = Math.max(0, Math.min(1, rem / dur));
    if (hudTimerBarEl) hudTimerBarEl.style.transform = `scaleX(${ratio})`;

    const sec = Math.ceil(rem / 1000);
    hudTimerEl.classList.toggle('is-warn', sec <= 10 && sec > 5);
    hudTimerEl.classList.toggle('is-urgent', sec <= 5 && sec > 0);
    if (sec !== lastTickedSec && sec > 0) {
      lastTickedSec = sec;
      if (sec <= 5) SFX.play('tickUrgent');
      else if (sec <= 10) SFX.play('tick');
    }
  }, 200);

  function renderVsStrip() {
    if (!latestSnap || latestSnap.lobby.phase === 'lobby') {
      vsStripEl.hidden = true;
      return;
    }
    const lang = I18n.getLang();
    const seats = latestSnap.lobby.seats || [];
    const st = latestSnap.state || {};
    const turnId = st.currentTurnSeatId || st.activeSeatId || st.turnSeatId || null;
    const myId = latestSnap.activeSeatId || latestSnap.mySeatId;

    vsStripEl.hidden = false;
    if (seats.length === 2) {
      const [a, b] = seats;
      const renderSide = (s) => {
        const isMe = s.seatId === myId;
        const isTurn = turnId === s.seatId && latestSnap.lobby.phase === 'playing';
        const sub = s.isBot
          ? difficultyLabel(s.difficulty || latestSnap.aiDifficulty, lang)
          : !s.connected
          ? lang === 'zh'
            ? '离线'
            : 'OFFLINE'
          : isMe
          ? lang === 'zh'
            ? '你 · 在线'
            : 'YOU · LIVE'
          : lang === 'zh'
          ? '对手 · 在线'
          : 'OPPONENT · LIVE';
        return `
          <div class="tg-vs-card ${isMe ? 'is-me' : ''} ${isTurn ? 'is-turn' : ''}">
            <span class="tg-vs-avatar">${UI.escapeHtml(s.avatar || '♦')}</span>
            <div class="tg-vs-meta">
              <span class="tg-vs-name">${UI.escapeHtml(s.name)}</span>
              <span class="tg-vs-sub">${UI.escapeHtml(sub)}${isTurn ? (lang === 'zh' ? ' · 行动中' : ' · TURN') : ''}</span>
            </div>
          </div>
        `;
      };
      vsStripEl.innerHTML = `${renderSide(a)}<span class="tg-vs-emblem">VS</span>${renderSide(b)}`;
    } else {
      vsStripEl.innerHTML = seats
        .map((s) => {
          const isMe = s.seatId === myId;
          const isTurn = turnId === s.seatId && latestSnap.lobby.phase === 'playing';
          return `
            <div class="tg-vs-card ${isMe ? 'is-me' : ''} ${isTurn ? 'is-turn' : ''}" style="min-width:128px;">
              <span class="tg-vs-avatar">${UI.escapeHtml(s.avatar || '♦')}</span>
              <div class="tg-vs-meta">
                <span class="tg-vs-name">${UI.escapeHtml(s.name)}</span>
                <span class="tg-vs-sub">${s.isBot ? 'AI' : isMe ? (lang === 'zh' ? '你' : 'YOU') : 'LIVE'}</span>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  function renderHudAndSidebar() {
    const lang = I18n.getLang();
    hudTitleEl.textContent = I18n.t(config.title);
    if (config.title?.ko) hudTitleEl.title = `${I18n.t(config.title)} (${config.title.ko})`;
    if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
    container.querySelector('[data-i18n-hub]').textContent = lang === 'zh' ? '殿堂' : 'Arena';
    container.querySelector('#tg-btn-lobby').textContent = lang === 'zh' ? '房间' : 'Room';
    container.querySelector('#tg-roster-heading').textContent = lang === 'zh' ? '参赛者席位' : 'CONTESTANTS';
    container.querySelector('#tg-feed-heading').textContent = lang === 'zh' ? '演播室实况 & 对话' : 'BROADCAST LOG & CHAT';
    chatInputEl.placeholder = lang === 'zh' ? '发送战局消息...' : 'Send message...';
    syncAudioButtons();

    // Telemetry (Round / Phase) + Stakes
    const st = latestSnap?.state || {};
    const roundNum = customTelemetry?.round ?? st.round ?? st.turn ?? null;
    const phaseText = customTelemetry?.phase ?? st.phaseLabel ?? null;
    if (latestSnap?.lobby?.phase === 'playing' && (roundNum != null || phaseText)) {
      const parts = [];
      if (roundNum != null) parts.push(lang === 'zh' ? `第 ${roundNum} 回合` : `R${roundNum}`);
      if (phaseText) parts.push(typeof phaseText === 'object' ? I18n.t(phaseText) : String(phaseText));
      hudTelemetryEl.textContent = parts.join(' · ');
      hudTelemetryEl.hidden = false;
    } else {
      hudTelemetryEl.hidden = true;
    }

    const stakes = customTelemetry?.stakes ?? config.stakes ?? (latestSnap?.lobby?.phase === 'playing' ? 2 : null);
    if (stakes != null && latestSnap?.lobby?.phase === 'playing') {
      hudStakesEl.innerHTML = UI.renderGarnetBadge(stakes);
      hudStakesEl.hidden = false;
    } else {
      hudStakesEl.hidden = true;
    }

    // Room code chip
    if (latestSnap && engine.mode === 'online' && engine.roomCode) {
      roomChipEl.hidden = false;
      roomCodeLabelEl.textContent = formatRoomCodeDisplay(engine.roomCode);
    } else {
      roomChipEl.hidden = true;
    }

    // Connection pill
    const tr = latestSnap?.transportStatus || { state: 'idle', transport: 'none' };
    connPillEl.className = 'tg-conn-pill';
    if (!latestSnap) {
      connTextEl.textContent = lang === 'zh' ? '待命中' : 'STANDBY';
    } else if (engine.mode === 'solo') {
      connPillEl.classList.add('is-live');
      connTextEl.textContent = difficultyLabel(latestSnap.aiDifficulty, lang);
    } else if (engine.mode === 'hotseat') {
      connPillEl.classList.add('is-live');
      connTextEl.textContent = lang === 'zh' ? '本地传屏' : 'HOTSEAT';
    } else if (tr.state === 'connected') {
      if (tr.transport === 'peerjs') {
        connPillEl.classList.add('is-live');
        connTextEl.textContent = 'LIVE · P2P';
      } else if (tr.transport === 'mqtt') {
        connPillEl.classList.add('is-relay');
        connTextEl.textContent = 'LIVE · RELAY';
      } else {
        connPillEl.classList.add('is-live');
        connTextEl.textContent = 'LIVE · TAB';
      }
    } else if (tr.state === 'connecting' || tr.state === 'reconnecting') {
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
          ? `<span style="color:var(--tg-cyan);font-size:11px;">AI</span>`
          : !s.connected
          ? `<span style="color:var(--tg-amber);font-size:11px;">${lang === 'zh' ? '掉线' : 'OFF'}</span>`
          : `<span style="color:var(--tg-emerald);font-size:11px;">●</span>`;
        const renameBtn =
          isMe && !s.isBot
            ? `<button type="button" class="tg-inline-edit-btn" data-rename-me title="${lang === 'zh' ? '修改代号' : 'Rename'}">✎</button>`
            : '';
        const takeoverBtn =
          engine.isHost && !s.isBot && !s.connected && latestSnap?.lobby?.phase === 'playing'
            ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-takeover="${UI.escapeHtml(s.seatId)}" style="padding:2px 6px;min-height:22px;font-size:10px;">AI</button>`
            : '';
        return `
          <div class="tg-roster-row ${isMe ? 'is-me' : ''} ${!s.connected ? 'is-offline' : ''}">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <span style="color:var(--tg-gold);margin-right:5px;">${UI.escapeHtml(s.avatar || '♦')}</span>
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
      btn.addEventListener('click', () => engine.removeSeat(btn.dataset.takeover));
    });

    renderVsStrip();
  }

  function renderDrawer() {
    if (!rulesOpen) {
      drawerRoot.innerHTML = '';
      return;
    }
    const lang = I18n.getLang();
    const md =
      I18n.t(config.rulesSummary) ||
      I18n.t({ zh: '暂无规则说明。', en: 'No rules description provided.' });
    drawerRoot.innerHTML = `
      <div class="tg-drawer-backdrop" id="tg-drawer-backdrop">
        <div class="tg-drawer" role="dialog" aria-modal="true">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
            <div>
              <span class="tg-badge tg-badge-garnet">${UI.escapeHtml(seasonsBadge)} · DEATH MATCH</span>
              <h2 class="tg-modal-title" style="font-size:20px;">${UI.escapeHtml(I18n.t(config.title))}</h2>
              ${config.title?.ko ? `<div style="font-size:12px;color:var(--tg-ink-faint);">${UI.escapeHtml(config.title.ko)}</div>` : ''}
            </div>
            <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="tg-drawer-close">✕</button>
          </div>
          <div class="tg-prose">${renderMiniMarkdown(md)}</div>
        </div>
      </div>
    `;
    drawerRoot.querySelector('#tg-drawer-close')?.addEventListener('click', () => {
      rulesOpen = false;
      renderDrawer();
    });
    drawerRoot.querySelector('#tg-drawer-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'tg-drawer-backdrop') {
        rulesOpen = false;
        renderDrawer();
      }
    });
  }

  function renderDifficultySelector(selected, lang) {
    const items = [
      { id: 'easy', zh: '入门 Easy', en: 'Easy', subZh: '轻松热身', subEn: 'Casual pace' },
      { id: 'genius', zh: '天才 Genius', en: 'Genius', subZh: '节目水准', subEn: 'Broadcast level' },
      { id: 'grand_final', zh: '总决赛 Grand Final', en: 'Grand Final', subZh: '张东民/洪榛浩级', subEn: 'Champion mind' },
    ];
    return `
      <div style="margin-bottom:12px;">
        <div style="font-size:12px;color:var(--tg-ink-muted);margin-bottom:6px;">
          ${lang === 'zh' ? 'AI 智能难度' : 'AI Opponent Difficulty'}
        </div>
        <div class="tg-diff-grid">
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

  function renderLobbyOverlay() {
    const lang = I18n.getLang();
    const minP = config.minPlayers || 2;
    const maxP = config.maxPlayers || 2;
    const inOnlineLobby =
      lobbyOnlineJoined && latestSnap && engine.mode === 'online' && latestSnap.lobby.phase === 'lobby';

    if (inOnlineLobby) {
      const lobby = latestSnap.lobby;
      const mySeat = lobby.seats.find((s) => s.seatId === latestSnap.mySeatId);
      const canStart = engine.isHost && lobby.seats.length >= minP;
      overlayRoot.innerHTML = `
        <div class="tg-modal-backdrop">
          <div class="tg-modal">
            <div class="tg-modal-header">
              <div>
                <span class="tg-badge tg-badge-garnet">${UI.escapeHtml(seasonsBadge)} · DEATH MATCH</span>
                <h2 class="tg-modal-title">${UI.escapeHtml(I18n.t(config.title))}</h2>
              </div>
              <button type="button" class="tg-room-chip" id="tg-lobby-copy-link" style="font-size:14px;padding:7px 14px;">
                ${UI.escapeHtml(formatRoomCodeDisplay(engine.roomCode))} ⧉
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(217,27,58,0.1);border:1px solid var(--tg-border-garnet);margin-bottom:14px;">
              <span style="font-size:12.5px;color:var(--tg-ink-muted);">
                ${lang === 'zh' ? '分享邀请链接或房间码给好友，支持 WebRTC P2P 与自动中继联机' : 'Share invite link or room code — zero-install P2P + automatic WSS relay'}
              </span>
              <button type="button" class="tg-btn tg-btn-sm tg-btn-gold" id="tg-lobby-share-btn">
                ${lang === 'zh' ? '复制邀请链接' : 'Copy Invite Link'}
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:12px;letter-spacing:0.08em;color:var(--tg-gold);font-weight:700;">
                ${lang === 'zh' ? `参赛席位 (${lobby.seats.length}/${maxP})` : `SEATS (${lobby.seats.length}/${maxP})`}
              </span>
              ${
                engine.isHost && lobby.seats.length < maxP
                  ? `<button type="button" class="tg-btn tg-btn-sm" id="tg-lobby-add-bot">+ ${lang === 'zh' ? '添加 AI 对手' : 'Add AI Bot'}</button>`
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
                        <span style="font-size:11px;color:${s.ready ? 'var(--tg-emerald)' : 'var(--tg-ink-faint)'};">
                          ${s.isBot ? 'AI' : s.ready ? (lang === 'zh' ? '就绪' : 'READY') : (lang === 'zh' ? '等待' : 'WAIT')}
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
                ? `<div style="font-size:12px;color:var(--tg-ink-muted);margin-bottom:10px;">${lang === 'zh' ? '观战席' : 'Spectators'}: ${lobby.spectators.map((x) => UI.escapeHtml(x.name)).join(', ')}</div>`
                : ''
            }

            ${engine.isHost ? renderDifficultySelector(lobby.aiDifficulty || 'genius', lang) : ''}
            ${engine.isHost ? renderOptionsFields(lobby.options) : ''}

            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:20px;">
              <button type="button" class="tg-btn tg-btn-ghost" id="tg-lobby-leave">
                ← ${lang === 'zh' ? '离开房间' : 'Leave Room'}
              </button>
              <div style="display:flex;gap:10px;">
                ${
                  !engine.isHost && mySeat
                    ? `<button type="button" class="tg-btn ${mySeat.ready ? '' : 'tg-btn-gold'}" id="tg-lobby-ready">${
                        mySeat.ready
                          ? lang === 'zh' ? '取消准备' : 'Unready'
                          : lang === 'zh' ? '点击准备' : 'Ready Up'
                      }</button>`
                    : ''
                }
                ${
                  engine.isHost
                    ? `<button type="button" class="tg-btn tg-btn-garnet" id="tg-lobby-start" ${canStart ? '' : 'disabled'}>${
                        canStart
                          ? lang === 'zh' ? '开启死亡对决 →' : 'Start Death Match →'
                          : lang === 'zh' ? `至少需要 ${minP} 名玩家` : `Need at least ${minP} players`
                      }</button>`
                    : `<span style="font-size:12.5px;color:var(--tg-ink-muted);align-self:center;">${
                        latestSnap.isSpectator
                          ? lang === 'zh' ? '观战模式 · 等待房主开始...' : 'Spectating · Waiting...'
                          : lang === 'zh' ? '等待房主开启对决...' : 'Waiting for host...'
                      }</span>`
                }
              </div>
            </div>
          </div>
        </div>
      `;

      overlayRoot.querySelector('#tg-lobby-copy-link')?.addEventListener('click', () => copyInviteUrl(engine.roomCode));
      overlayRoot.querySelector('#tg-lobby-share-btn')?.addEventListener('click', () => copyInviteUrl(engine.roomCode));
      overlayRoot.querySelector('#tg-lobby-rename-me')?.addEventListener('click', () => {
        SFX.play('click');
        openRenameModal();
      });
      overlayRoot.querySelector('#tg-lobby-add-bot')?.addEventListener('click', () => {
        SFX.play('click');
        engine.addBot(lang);
      });
      overlayRoot.querySelectorAll('[data-rm-seat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          engine.removeSeat(btn.dataset.rmSeat);
        });
      });
      overlayRoot.querySelectorAll('[data-diff]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          engine.setAiDifficulty(btn.dataset.diff);
        });
      });
      if (engine.isHost) bindOptionsFields(overlayRoot, lobby.options, (k, v) => engine.setOption(k, v));
      overlayRoot.querySelector('#tg-lobby-ready')?.addEventListener('click', () => {
        SFX.play('click');
        engine.setReady(!mySeat.ready);
      });
      overlayRoot.querySelector('#tg-lobby-start')?.addEventListener('click', () => {
        SFX.play('click');
        const res = engine.startMatch();
        if (!res.ok) UI.toast(res.reason, 'error');
      });
      overlayRoot.querySelector('#tg-lobby-leave')?.addEventListener('click', () => {
        SFX.play('click');
        engine.destroy();
        lobbyOnlineJoined = false;
        latestSnap = null;
        lastPhase = null;
        renderAll();
      });
      return;
    }

    const defaultNick = playerNameInput || (lang === 'zh' ? '挑战者' : 'Challenger');
    const vault = GarnetVault.get();
    overlayRoot.innerHTML = `
      <div class="tg-modal-backdrop">
        <div class="tg-modal">
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
              ${lang === 'zh' ? '查看规则' : 'Rules'}
            </button>
          </div>

          <div class="tg-mode-tabs" role="tablist">
            <button type="button" class="tg-mode-tab ${lobbyTab === 'solo' ? 'is-active' : ''}" data-tab="solo">
              <strong>${lang === 'zh' ? '单人 vs 天才 AI' : 'Solo vs AI'}</strong>
              <span>${lang === 'zh' ? '即刻开局 · 三档智能' : 'Instant · 3 AI tiers'}</span>
            </button>
            <button type="button" class="tg-mode-tab ${lobbyTab === 'online' ? 'is-active' : ''}" data-tab="online">
              <strong>${lang === 'zh' ? '在线联机对决' : 'Online Room'}</strong>
              <span>${lang === 'zh' ? '房间码邀请 · 实时同步' : 'Room code · Live sync'}</span>
            </button>
            <button type="button" class="tg-mode-tab ${lobbyTab === 'hotseat' ? 'is-active' : ''}" data-tab="hotseat">
              <strong>${lang === 'zh' ? '本地传屏对战' : 'Pass & Play'}</strong>
              <span>${lang === 'zh' ? '同设备对战 · 加内特护盾' : 'Same device · Shielded'}</span>
            </button>
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;color:var(--tg-ink-muted);margin-bottom:5px;">
              ${lang === 'zh' ? '你的参赛代号' : 'Your Contestant Name'}
            </label>
            <input class="tg-input" id="tg-name-input" type="text" maxlength="20" value="${UI.escapeHtml(playerNameInput)}" placeholder="${UI.escapeHtml(defaultNick)}" />
          </div>

          ${
            lobbyTab === 'solo'
              ? `
                ${renderDifficultySelector(aiDifficulty, lang)}
                ${
                  maxP > minP
                    ? `
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
                        <label style="font-size:13.5px;color:var(--tg-ink-muted);">
                          ${lang === 'zh' ? `总参赛人数 (${minP}–${maxP} 人)` : `Total Players (${minP}–${maxP})`}
                        </label>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <button type="button" class="tg-btn tg-btn-icon" id="tg-solo-dec">−</button>
                          <span style="font-family:var(--tg-font-mono);font-size:18px;font-weight:700;min-width:28px;text-align:center;color:var(--tg-gold-bright);">${soloCount}</span>
                          <button type="button" class="tg-btn tg-btn-icon" id="tg-solo-inc">+</button>
                        </div>
                      </div>
                    `
                    : ''
                }
                ${renderOptionsFields(localOptions)}
                <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                  <a class="tg-btn tg-btn-ghost" href="../../">← ${lang === 'zh' ? '返回对决殿堂' : 'Back to Arena'}</a>
                  <button type="button" class="tg-btn tg-btn-garnet" id="tg-start-solo" style="min-width:200px;min-height:44px;">
                    ${lang === 'zh' ? '踏入死亡对决 →' : 'Enter Death Match →'}
                  </button>
                </div>
              `
              : lobbyTab === 'online'
              ? `
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
                  <div style="padding:14px;border-radius:12px;border:1px solid var(--tg-border-garnet);background:rgba(217,27,58,0.08);">
                    <div style="font-weight:700;margin-bottom:6px;">${lang === 'zh' ? '创建联机对决房' : 'Create Arena Room'}</div>
                    <p style="font-size:12px;color:var(--tg-ink-muted);margin:0 0 12px;">
                      ${lang === 'zh' ? '生成 TGM 房间码与邀请链接，支持好友实时对战或观战。' : 'Generate a TGM room code & invite link for live play or spectating.'}
                    </p>
                    <button type="button" class="tg-btn tg-btn-garnet" id="tg-create-room" style="width:100%;" ${lobbyBusy ? 'disabled' : ''}>
                      ${lobbyBusy ? (lang === 'zh' ? '开启中...' : 'Opening...') : (lang === 'zh' ? '创建对决房间' : 'Create Online Room')}
                    </button>
                  </div>
                  <div style="padding:14px;border-radius:12px;border:1px solid var(--tg-border);background:rgba(255,255,255,0.025);">
                    <div style="font-weight:700;margin-bottom:6px;">${lang === 'zh' ? '输入房间码加入' : 'Join Existing Room'}</div>
                    <input class="tg-input tg-input-mono" id="tg-join-code" maxlength="10" value="${UI.escapeHtml(roomCodeInput)}" placeholder="TGM-K7M4P" style="margin-bottom:10px;" />
                    <div style="display:flex;gap:8px;">
                      <button type="button" class="tg-btn tg-btn-gold" id="tg-join-room" style="flex:1;" ${lobbyBusy ? 'disabled' : ''}>
                        ${lobbyBusy ? '...' : (lang === 'zh' ? '加入对决' : 'Join')}
                      </button>
                      <button type="button" class="tg-btn tg-btn-ghost" id="tg-join-spec" ${lobbyBusy ? 'disabled' : ''}>
                        ${lang === 'zh' ? '观战' : 'Watch'}
                      </button>
                    </div>
                  </div>
                </div>
                ${
                  lobbyError
                    ? `<div style="margin-top:12px;padding:9px 12px;border-radius:8px;background:rgba(217,27,58,0.18);border:1px solid rgba(255,46,84,0.55);color:#ffb3c1;font-size:12.5px;">${UI.escapeHtml(lobbyError)}</div>`
                    : ''
                }
              `
              : `
                <div style="margin-bottom:10px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:12.5px;color:var(--tg-ink-muted);">${lang === 'zh' ? '本地真人参赛者' : 'Local Human Players'}</span>
                    <div style="display:flex;gap:6px;">
                      <button type="button" class="tg-btn tg-btn-sm" id="tg-hs-add" ${hotseatNames.length + hotseatBots >= maxP ? 'disabled' : ''}>+ ${lang === 'zh' ? '真人' : 'Human'}</button>
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
                  <button type="button" class="tg-btn tg-btn-garnet" id="tg-start-hotseat" style="min-width:200px;min-height:44px;">
                    ${lang === 'zh' ? '开始本地传屏对决 →' : 'Start Pass & Play →'}
                  </button>
                </div>
              `
          }
        </div>
      </div>
    `;

    overlayRoot.querySelector('#tg-entry-rules')?.addEventListener('click', () => {
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
    overlayRoot.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SFX.play('click');
        aiDifficulty = btn.dataset.diff;
        renderLobbyOverlay();
      });
    });

    const nameEl = overlayRoot.querySelector('#tg-name-input');
    nameEl?.addEventListener('input', () => {
      playerNameInput = nameEl.value;
      savePlayerName(playerNameInput);
      if (hotseatNames.length > 0 && playerNameInput.trim()) {
        hotseatNames[0] = playerNameInput.trim().slice(0, 20);
      }
      if (profileNameEl) profileNameEl.textContent = getCurrentDisplayName();
    });

    bindOptionsFields(overlayRoot, localOptions, null);

    overlayRoot.querySelector('#tg-solo-dec')?.addEventListener('click', () => {
      soloCount = Math.max(minP, soloCount - 1);
      renderLobbyOverlay();
    });
    overlayRoot.querySelector('#tg-solo-inc')?.addEventListener('click', () => {
      soloCount = Math.min(maxP, soloCount + 1);
      renderLobbyOverlay();
    });
    overlayRoot.querySelector('#tg-start-solo')?.addEventListener('click', () => {
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

    const codeEl = overlayRoot.querySelector('#tg-join-code');
    codeEl?.addEventListener('input', () => {
      roomCodeInput = codeEl.value.toUpperCase();
    });

    overlayRoot.querySelector('#tg-create-room')?.addEventListener('click', async () => {
      SFX.play('click');
      const nick = playerNameInput.trim() || defaultNick;
      savePlayerName(nick);
      lobbyBusy = true;
      lobbyError = '';
      renderLobbyOverlay();
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
        lobbyError = lang === 'zh' ? '请输入有效的房间码' : 'Please enter a valid room code';
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

    overlayRoot.querySelector('#tg-join-room')?.addEventListener('click', () => doJoin(initialSpectate));
    overlayRoot.querySelector('#tg-join-spec')?.addEventListener('click', () => doJoin(true));

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
    overlayRoot.querySelector('#tg-hs-add')?.addEventListener('click', () => {
      if (hotseatNames.length + hotseatBots < maxP) {
        hotseatNames.push(lang === 'zh' ? `玩家 ${hotseatNames.length + 1}` : `Player ${hotseatNames.length + 1}`);
        renderLobbyOverlay();
      }
    });
    overlayRoot.querySelector('#tg-hs-add-bot')?.addEventListener('click', () => {
      if (hotseatNames.length + hotseatBots < maxP) {
        hotseatBots += 1;
        renderLobbyOverlay();
      }
    });
    overlayRoot.querySelector('#tg-start-hotseat')?.addEventListener('click', () => {
      SFX.play('click');
      if (hotseatNames.length + hotseatBots < minP) {
        UI.toast(lang === 'zh' ? `至少需要 ${minP} 名玩家` : `Need at least ${minP} players`, 'error');
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
  }

  function renderResultOverlay(result) {
    stopParticles?.();
    stopParticles = null;

    const lang = I18n.getLang();
    const seats = latestSnap?.lobby?.seats || [];
    const nameOf = (sid) => seats.find((s) => s.seatId === sid)?.name || sid;
    const winners = (result.winnerSeatIds || []).map(nameOf);
    const myId = latestSnap?.mySeatId;
    const isHotseat = latestSnap?.mode === 'hotseat';
    const isDraw = (result.winnerSeatIds || []).length === 0;
    const isSurvivor = isHotseat ? !isDraw : Boolean(myId && (result.winnerSeatIds || []).includes(myId));

    const verdictClass = isDraw ? '' : isSurvivor ? 'is-survivor' : 'is-eliminated';
    const stampText = isDraw
      ? lang === 'zh' ? '平局 · DRAW' : 'DRAW'
      : isSurvivor
      ? lang === 'zh' ? '幸存者 · SURVIVOR' : 'SURVIVOR'
      : lang === 'zh' ? '淘汰 · ELIMINATED' : 'ELIMINATED';

    const transferHtml = lastVaultOutcome
      ? `
        <div class="tg-garnet-transfer ${lastVaultOutcome.delta > 0 ? 'is-gain' : ''}">
          <span class="tg-garnet-gem"></span>
          <span>
            ${
              lastVaultOutcome.delta > 0
                ? lang === 'zh'
                  ? `加内特交接：+${lastVaultOutcome.delta} 颗（金库总计 ${lastVaultOutcome.vault.garnets}）`
                  : `Garnet Transfer: +${lastVaultOutcome.delta} (Vault: ${lastVaultOutcome.vault.garnets})`
                : lastVaultOutcome.delta < 0
                ? lang === 'zh'
                  ? `加内特流失：${lastVaultOutcome.delta} 颗（金库剩余 ${lastVaultOutcome.vault.garnets}）`
                  : `Garnet Lost: ${lastVaultOutcome.delta} (Vault: ${lastVaultOutcome.vault.garnets})`
                : lang === 'zh'
                ? `加内特无变动（金库 ${lastVaultOutcome.vault.garnets}）`
                : `Garnets Unchanged (Vault: ${lastVaultOutcome.vault.garnets})`
            }
            ${
              lastVaultOutcome.earnedBlackGarnet
                ? lang === 'zh'
                  ? ' · ✦ 荣获黑加内特！'
                  : ' · ✦ BLACK GARNET EARNED!'
                : ''
            }
          </span>
        </div>
      `
      : '';

    overlayRoot.innerHTML = `
      <canvas class="tg-verdict-canvas" id="tg-verdict-canvas"></canvas>
      <div class="tg-modal-backdrop">
        <div class="tg-modal tg-verdict-modal ${verdictClass}">
          <span class="tg-badge ${isSurvivor ? 'tg-badge-gold' : 'tg-badge-garnet'}">
            ${lang === 'zh' ? '死亡对决最终裁决' : 'DEATH MATCH FINAL VERDICT'}
          </span>
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
                        <span style="font-family:var(--tg-font-mono);color:var(--tg-gold-bright);">${UI.escapeHtml(r.label ?? r.score ?? '')}</span>
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
                ? `<button type="button" class="tg-btn tg-btn-garnet" id="tg-res-rematch">${lang === 'zh' ? '再战一局' : 'Rematch'}</button>`
                : ''
            }
            <button type="button" class="tg-btn" id="tg-res-review">${lang === 'zh' ? '复盘终局' : 'Inspect Board'}</button>
            <a class="tg-btn tg-btn-ghost" href="../../">${lang === 'zh' ? '返回对决殿堂' : 'Back to Arena'}</a>
          </div>
        </div>
      </div>
    `;

    if (!isDraw) {
      stopParticles = launchVerdictParticles(
        overlayRoot.querySelector('#tg-verdict-canvas'),
        isSurvivor
      );
    }

    overlayRoot.querySelector('#tg-res-rematch')?.addEventListener('click', () => {
      SFX.play('click');
      stopParticles?.();
      stopParticles = null;
      engine.rematch();
    });
    overlayRoot.querySelector('#tg-res-review')?.addEventListener('click', () => {
      SFX.play('click');
      stopParticles?.();
      stopParticles = null;
      overlayRoot.innerHTML = '';
    });
  }

  function renderAll() {
    renderHudAndSidebar();
    renderDrawer();

    if (!latestSnap || latestSnap.lobby.phase === 'lobby') {
      stopParticles?.();
      stopParticles = null;
      removePrivacyCurtain();
      renderLobbyOverlay();
      return;
    }

    if (latestSnap.lobby.phase === 'ended' && latestSnap.result) {
      renderResultOverlay(latestSnap.result);
    } else {
      stopParticles?.();
      stopParticles = null;
      overlayRoot.innerHTML = '';
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
  renderAll();

  // Support quick-start URL param (?quick=solo) from Hub Quick Duel CTA
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
      clearInterval(timerInterval);
      stopParticles?.();
      unsubLang();
      mobileMq?.removeEventListener?.('change', onMqChange);
      removePrivacyCurtain();
      engine.destroy();
    },
  };
}

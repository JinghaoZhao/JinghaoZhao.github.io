/**
 * Host-Authoritative Game Engine Controller
 *
 * Manages:
 *  - Lobby seats, ready states, AI bot seats, Spectators, Disconnect grace & AI takeover
 *  - Canonical fullState on Host + seq++ + per-seat rules.projectState(fullState, seatId)
 *  - Idempotent Action dispatch (ring buffer of 256 actionIds)
 *  - Synchronized phase countdown timers + Host-only rules.onPhaseTimeout()
 *  - Natural human-paced AI Bot decision loop (rules.computeBotAction)
 *  - Host sessionStorage checkpointing for refresh recovery
 *  - Local Pass-and-Play (hotseat) active-human detection for PrivacyCurtain
 */

import {
  PROTOCOL_VERSION,
  MSG,
  generateRoomCode,
  normalizeRoomCode,
  sanitizePlayerName,
  getClientId,
  randomActionId,
  createSeededRng,
} from './protocol.js';
import { RoomClient } from './room-client.js';

/**
 * Recursively syncs any cached seat `.name` inside `fullState` (e.g. `state.players[seatId].name`,
 * `state.seats[i].name`, or nested mini-game state) so all 19 games reflect live renames immediately.
 */
function syncSeatNameInState(node, seatId, newName, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 4) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === 'object') {
        if (item.seatId === seatId && typeof item.name === 'string') {
          item.name = newName;
        } else if (depth < 4) {
          syncSeatNameInState(item, seatId, newName, depth + 1);
        }
      }
    }
    return;
  }
  if (node.seatId === seatId && typeof node.name === 'string') {
    node.name = newName;
  }
  const direct = node[seatId];
  if (direct && typeof direct === 'object' && !Array.isArray(direct) && typeof direct.name === 'string') {
    direct.name = newName;
  }
  for (const key of Object.keys(node)) {
    if (key === seatId) continue;
    const val = node[key];
    if (val && typeof val === 'object') {
      syncSeatNameInState(val, seatId, newName, depth + 1);
    }
  }
}

const BOT_NAMES_ZH = [
  'AI·河锡辰', 'AI·轨道', 'AI·金东载', 'AI·徐东珠', 'AI·郑贤奎',
  'AI·崔贤俊', 'AI·尹昭熙', 'AI·李世石', 'AI·姜智英', 'AI·孙恩宥',
  'AI·金河琳', 'AI·朴尚妍',
];
const BOT_NAMES_EN = [
  'AI·Obsidian', 'AI·Vanguard', 'AI·Cipher', 'AI·Oracle', 'AI·Mirage',
  'AI·Gambit', 'AI·Apex', 'AI·Helix', 'AI·Vortex', 'AI·Prism',
  'AI·Monolith', 'AI·Noir',
];

const AVATARS = ['◆', '▲', '●', '■', '✦', '⬡', '❖', '◉', '◈', '⟐', '⬟', '★'];

export class GameEngine {
  constructor({ config, rules, onUpdate, onToast, onChat, onPrivacyNeeded }) {
    this.config = config;
    this.rules = rules;
    this.onUpdate = onUpdate;
    this.onToast = onToast;
    this.onChat = onChat;
    this.onPrivacyNeeded = onPrivacyNeeded;

    this.clientId = getClientId();
    this.mode = 'solo'; // 'online' | 'solo' | 'hotseat'
    this.isHost = true;
    this.isSpectator = false;
    this.roomCode = '';
    this.transportStatus = { state: 'idle', transport: 'none', detail: '' };

    // Lobby state (synced)
    this.lobby = {
      phase: 'lobby', // 'lobby' | 'playing' | 'ended'
      hostClientId: this.clientId,
      seats: [], // [{ seatId, clientId, name, avatar, isBot, ready, connected }]
      spectators: [], // [{ clientId, name }]
      options: this._defaultOptions(),
    };

    // Host-only canonical state
    this.fullState = null;
    this.seq = 0;
    this.rng = createSeededRng(Date.now());
    this.seenActionIds = [];
    this.timer = null; // { phaseKey, endsAtMs, durationMs }
    this.timerTimeoutHandle = null;
    this.botTimeoutHandle = null;
    this.lastEvent = null;

    // Client-visible projected state
    this.projectedState = null;
    this.mySeatId = null;
    this.hotseatActiveSeatId = null;
    this.pendingActionResolvers = new Map();

    this.room = new RoomClient({
      gameId: config.id,
      onMessage: (msg, via) => this._handleNetworkMessage(msg, via),
      onStatusChange: (st) => {
        this.transportStatus = st;
        this._emit();
      },
      onClientDisconnect: (cid) => this._handleClientDisconnect(cid),
    });
  }

  _defaultOptions() {
    const opts = {};
    for (const field of this.config.optionsSchema || []) {
      opts[field.key] = field.default;
    }
    return opts;
  }

  _checkpointKey() {
    return `dp3_host_ckpt_${this.config.id}`;
  }

  _saveHostCheckpoint() {
    if (!this.isHost || this.mode !== 'online' || !this.roomCode) return;
    try {
      sessionStorage.setItem(
        this._checkpointKey(),
        JSON.stringify({
          roomCode: this.roomCode,
          lobby: this.lobby,
          fullState: this.fullState,
          seq: this.seq,
          timer: this.timer,
          savedAt: Date.now(),
        })
      );
    } catch (_) {}
  }

  getSavedCheckpoint(roomCode) {
    try {
      const raw = sessionStorage.getItem(this._checkpointKey());
      if (!raw) return null;
      const ckpt = JSON.parse(raw);
      if (Date.now() - ckpt.savedAt > 30 * 60 * 1000) return null;
      if (roomCode && ckpt.roomCode !== roomCode) return null;
      return ckpt;
    } catch (_) {
      return null;
    }
  }

  _makeSeatId(index) {
    return `seat-${index + 1}`;
  }

  _pickBotName(index, lang = 'zh') {
    const pool = lang === 'zh' ? BOT_NAMES_ZH : BOT_NAMES_EN;
    return pool[index % pool.length];
  }

  // =========================================================================
  // Session Setup: Solo, Hotseat, Online Host, Online Guest
  // =========================================================================

  startSolo({ playerName, totalPlayers, options = {}, lang = 'zh' }) {
    this._resetMatchTimers();
    this.mode = 'solo';
    this.isHost = true;
    this.isSpectator = false;
    this.roomCode = 'SOLO';
    this.room.startLocal('SOLO');

    const count = Math.max(
      this.config.minPlayers || 2,
      Math.min(this.config.maxPlayers || 8, totalPlayers || this.config.defaultPlayers || 4)
    );

    const seats = [
      {
        seatId: this._makeSeatId(0),
        clientId: this.clientId,
        name: playerName || (lang === 'zh' ? '玩家 1' : 'Player 1'),
        avatar: AVATARS[0],
        isBot: false,
        ready: true,
        connected: true,
      },
    ];

    for (let i = 1; i < count; i++) {
      seats.push({
        seatId: this._makeSeatId(i),
        clientId: null,
        name: this._pickBotName(i - 1, lang),
        avatar: AVATARS[i % AVATARS.length],
        isBot: true,
        ready: true,
        connected: true,
      });
    }

    this.lobby = {
      phase: 'lobby',
      hostClientId: this.clientId,
      seats,
      spectators: [],
      options: { ...this._defaultOptions(), ...options },
    };
    this.mySeatId = seats[0].seatId;
    this.startMatch();
  }

  startHotseat({ playerNames, botCount = 0, options = {}, lang = 'zh' }) {
    this._resetMatchTimers();
    this.mode = 'hotseat';
    this.isHost = true;
    this.isSpectator = false;
    this.roomCode = 'LOCAL';
    this.room.startLocal('LOCAL');

    const seats = [];
    playerNames.forEach((nm, idx) => {
      seats.push({
        seatId: this._makeSeatId(seats.length),
        clientId: `hotseat-${idx}`,
        name: nm.trim() || (lang === 'zh' ? `玩家 ${idx + 1}` : `Player ${idx + 1}`),
        avatar: AVATARS[seats.length % AVATARS.length],
        isBot: false,
        ready: true,
        connected: true,
      });
    });

    for (let b = 0; b < botCount; b++) {
      if (seats.length >= (this.config.maxPlayers || 12)) break;
      seats.push({
        seatId: this._makeSeatId(seats.length),
        clientId: null,
        name: this._pickBotName(b, lang),
        avatar: AVATARS[seats.length % AVATARS.length],
        isBot: true,
        ready: true,
        connected: true,
      });
    }

    this.lobby = {
      phase: 'lobby',
      hostClientId: this.clientId,
      seats,
      spectators: [],
      options: { ...this._defaultOptions(), ...options },
    };
    this.mySeatId = seats[0].seatId;
    this.hotseatActiveSeatId = seats[0].seatId;
    this.startMatch();
  }

  async createOnlineRoom({ playerName, transportPref = 'auto', roomCode = null }) {
    this._resetMatchTimers();
    this.mode = 'online';
    this.isHost = true;
    this.isSpectator = false;

    const code = roomCode ? normalizeRoomCode(roomCode) : generateRoomCode(5);
    this.roomCode = code;

    // Check if recovering our own host session after reload
    const ckpt = this.getSavedCheckpoint(code);
    if (ckpt && ckpt.lobby?.hostClientId === this.clientId) {
      this.lobby = ckpt.lobby;
      this.fullState = ckpt.fullState;
      this.seq = ckpt.seq || 0;
      this.timer = ckpt.timer || null;
      const mySeat = this.lobby.seats.find((s) => s.clientId === this.clientId);
      this.mySeatId = mySeat ? mySeat.seatId : this.lobby.seats[0]?.seatId || null;
    } else {
      this.lobby = {
        phase: 'lobby',
        hostClientId: this.clientId,
        seats: [
          {
            seatId: this._makeSeatId(0),
            clientId: this.clientId,
            name: playerName || 'Host',
            avatar: AVATARS[0],
            isBot: false,
            ready: true,
            connected: true,
          },
        ],
        spectators: [],
        options: this._defaultOptions(),
      };
      this.mySeatId = this.lobby.seats[0].seatId;
      this.fullState = null;
      this.projectedState = null;
      this.seq = 0;
    }

    await this.room.hostRoom(code, { transportPref });
    if (this.fullState) {
      this.projectedState = this._safeProject(this.fullState, this.mySeatId);
      this._syncPhaseTimer();
      this._scheduleBots();
    }
    this._saveHostCheckpoint();
    this._emit();
    return code;
  }

  async joinOnlineRoom({ roomCode, playerName, wantSpectator = false, transportPref = 'auto' }) {
    this._resetMatchTimers();
    this.mode = 'online';
    this.isHost = false;
    this.isSpectator = Boolean(wantSpectator);
    this.roomCode = normalizeRoomCode(roomCode);
    this.fullState = null;
    this.projectedState = null;

    await this.room.joinRoom(this.roomCode, { transportPref });

    // Send JOIN and wait for WELCOME (up to 6s)
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this._onWelcomeResolve = null;
          reject(new Error('Room host did not respond (room may be closed or code invalid)'));
        }
      }, 6000);

      this._onWelcomeResolve = (welcomeMsg) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          this._onWelcomeResolve = null;
          resolve(welcomeMsg);
        }
      };

      this.room.sendToHost({
        t: MSG.JOIN,
        clientId: this.clientId,
        name: playerName || 'Guest',
        wantSpectator: Boolean(wantSpectator),
        protocolVersion: PROTOCOL_VERSION,
      });
    });
  }

  // =========================================================================
  // Lobby Mutations (Host & Guest)
  // =========================================================================

  setReady(ready) {
    if (this.isHost) {
      const seat = this.lobby.seats.find((s) => s.clientId === this.clientId);
      if (seat) {
        seat.ready = Boolean(ready);
        this._broadcastLobby();
        this._emit();
      }
    } else {
      this.room.sendToHost({ t: MSG.READY, clientId: this.clientId, ready: Boolean(ready) });
    }
  }

  /**
   * Live rename for the local player (works in Lobby OR Mid-Match, Solo, Hotseat, and Online).
   */
  renameSelf(rawName) {
    const clean = sanitizePlayerName(rawName, '');
    if (!clean) return { ok: false, reason: 'Name cannot be empty' };

    if (this.isHost) {
      const targetSeat =
        this.mode === 'hotseat'
          ? this.lobby.seats.find((s) => s.seatId === (this.hotseatActiveSeatId || this.mySeatId))
          : this.lobby.seats.find((s) => s.clientId === this.clientId);
      if (targetSeat) {
        this._hostApplyRename(targetSeat, clean);
        return { ok: true, name: clean };
      }
      const spec = this.lobby.spectators.find((sp) => sp.clientId === this.clientId);
      if (spec) {
        spec.name = clean;
        this._broadcastLobby();
        this._saveHostCheckpoint();
        this._emit();
        return { ok: true, name: clean };
      }
      return { ok: false, reason: 'Seat not found' };
    }

    // Guest: send live RENAME to Host
    this.room.sendToHost({
      t: MSG.RENAME,
      clientId: this.clientId,
      name: clean,
    });
    return { ok: true, name: clean };
  }

  _hostApplyRename(seat, cleanName) {
    seat.name = cleanName;
    if (this.fullState) {
      syncSeatNameInState(this.fullState, seat.seatId, cleanName);
      this.seq += 1;
      this._broadcastLobby();
      this._pushStateToAll();
    } else {
      this._broadcastLobby();
      this._emit();
    }
    this._saveHostCheckpoint();
  }

  setOption(key, value) {
    if (!this.isHost || this.lobby.phase !== 'lobby') return;
    this.lobby.options[key] = value;
    this._broadcastLobby();
    this._emit();
  }

  addBot(lang = 'zh') {
    if (!this.isHost || this.lobby.phase !== 'lobby') return;
    const max = this.config.maxPlayers || 12;
    if (this.lobby.seats.length >= max) return;
    const botCount = this.lobby.seats.filter((s) => s.isBot).length;
    const idx = this.lobby.seats.length;
    this.lobby.seats.push({
      seatId: `seat-${Date.now().toString(36).slice(-3)}-${idx + 1}`,
      clientId: null,
      name: this._pickBotName(botCount, lang),
      avatar: AVATARS[idx % AVATARS.length],
      isBot: true,
      ready: true,
      connected: true,
    });
    this._broadcastLobby();
    this._emit();
  }

  removeSeat(seatId) {
    if (!this.isHost) return;
    const idx = this.lobby.seats.findIndex((s) => s.seatId === seatId);
    if (idx <= 0) return; // Cannot remove host seat 0
    if (this.lobby.phase === 'lobby') {
      this.lobby.seats.splice(idx, 1);
    } else {
      // Mid-match: convert disconnected human seat into an AI Bot so game never deadlocks!
      const seat = this.lobby.seats[idx];
      seat.isBot = true;
      seat.clientId = null;
      seat.connected = true;
      seat.name = `${seat.name} (AI)`;
      this._scheduleBots();
    }
    this._broadcastLobby();
    this._emit();
  }

  sendChat(text) {
    const clean = String(text || '').trim().slice(0, 160);
    if (!clean) return;
    if (this.isHost) {
      const seat = this.lobby.seats.find((s) => s.clientId === this.clientId);
      const entry = {
        t: MSG.CHAT,
        fromSeatId: seat?.seatId || null,
        fromName: seat?.name || 'Host',
        text: clean,
        ts: Date.now(),
      };
      this.room.broadcast(entry);
      this.onChat?.(entry);
    } else {
      this.room.sendToHost({ t: MSG.CHAT, clientId: this.clientId, text: clean });
    }
  }

  // =========================================================================
  // Match Lifecycle (Host-Authoritative)
  // =========================================================================

  startMatch() {
    if (!this.isHost) return { ok: false, reason: 'Only host can start' };
    const min = this.config.minPlayers || 2;
    if (this.lobby.seats.length < min) {
      return { ok: false, reason: `Need at least ${min} players` };
    }
    this._resetMatchTimers();
    this.rng = createSeededRng(`${this.config.id}-${this.roomCode}-${Date.now()}`);
    this.seenActionIds = [];
    this.seq = 1;
    this.lastEvent = { type: 'MATCH_START', ts: Date.now() };

    const seatSpecs = this.lobby.seats.map((s) => ({
      seatId: s.seatId,
      name: s.name,
      avatar: s.avatar,
      isBot: s.isBot,
    }));

    this.fullState = this.rules.createInitialState(seatSpecs, {
      rng: this.rng,
      options: { ...this.lobby.options },
    });
    this.lobby.phase = 'playing';

    if (this.mode === 'hotseat') {
      const firstHuman = this._inferHotseatActor(this.fullState) || seatSpecs[0].seatId;
      this.hotseatActiveSeatId = firstHuman;
      this.mySeatId = firstHuman;
    }

    this._broadcastLobby();
    this._pushStateToAll();
    this._syncPhaseTimer();
    this._scheduleBots();
    this._saveHostCheckpoint();
    return { ok: true };
  }

  rematch() {
    if (!this.isHost) return;
    this.startMatch();
  }

  returnToLobby() {
    if (!this.isHost) return;
    this._resetMatchTimers();
    this.lobby.phase = 'lobby';
    this.fullState = null;
    this.projectedState = null;
    this.timer = null;
    this._broadcastLobby();
    this._saveHostCheckpoint();
    this._emit();
  }

  /**
   * Dispatch a player action (Host applies directly; Guest sends over RoomClient).
   */
  dispatch(action) {
    if (!action || !action.type) {
      return Promise.resolve({ ok: false, reason: 'Invalid action' });
    }
    if (this.isSpectator) {
      return Promise.resolve({ ok: false, reason: 'Spectators cannot act' });
    }
    if (this.isHost) {
      const actingSeatId =
        this.mode === 'hotseat' ? this.hotseatActiveSeatId || this.mySeatId : this.mySeatId;
      return Promise.resolve(this._hostApplyAction(actingSeatId, action));
    }

    const actionId = randomActionId();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingActionResolvers.delete(actionId);
        resolve({ ok: true }); // optimistic resolve if state arrived without rejection
      }, 2500);
      this.pendingActionResolvers.set(actionId, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
      this.room.sendToHost({
        t: MSG.ACTION,
        clientId: this.clientId,
        actionId,
        seqSeen: this.seq,
        action,
      });
    });
  }

  _hostApplyAction(seatId, action, actionId = null) {
    if (!this.fullState || this.lobby.phase !== 'playing') {
      return { ok: false, reason: 'Match is not active' };
    }
    if (actionId) {
      if (this.seenActionIds.includes(actionId)) {
        return { ok: true, duplicate: true };
      }
      this.seenActionIds.push(actionId);
      if (this.seenActionIds.length > 256) this.seenActionIds.shift();
    }

    const check = this.rules.validateAction
      ? this.rules.validateAction(this.fullState, seatId, action)
      : { ok: true };
    if (!check || !check.ok) {
      return { ok: false, reason: check?.reason || 'Illegal move' };
    }

    const res = this.rules.applyAction(this.fullState, seatId, action, {
      rng: this.rng,
      options: this.lobby.options,
      now: Date.now(),
    });
    if (!res || !res.state) {
      return { ok: false, reason: 'Rule engine returned empty state' };
    }

    const prevHotseatSeat = this.hotseatActiveSeatId;
    this.fullState = res.state;
    this.seq += 1;
    this.lastEvent =
      (Array.isArray(res.events) && res.events[res.events.length - 1]) || {
        type: action.type,
        seatId,
        ts: Date.now(),
      };

    // Check win/end condition
    const result = this.rules.getResult ? this.rules.getResult(this.fullState) : null;
    if (result) {
      this.lobby.phase = 'ended';
      this._resetMatchTimers();
    } else {
      this._syncPhaseTimer();
    }

    // Handle Local Pass-and-Play privacy handover if active human seat switched
    if (this.mode === 'hotseat' && this.lobby.phase === 'playing') {
      const nextHuman = this._inferHotseatActor(this.fullState);
      if (nextHuman && nextHuman !== prevHotseatSeat) {
        this.hotseatActiveSeatId = nextHuman;
        this.mySeatId = nextHuman;
        if (this.config.hasHiddenInfo) {
          const nextSeat = this.lobby.seats.find((s) => s.seatId === nextHuman);
          this.onPrivacyNeeded?.(nextSeat);
        }
      }
    }

    this._pushStateToAll();
    if (result) this._broadcastLobby();
    else this._scheduleBots();
    this._saveHostCheckpoint();
    return { ok: true };
  }

  _inferHotseatActor(state) {
    if (!state) return null;
    const humanIds = new Set(this.lobby.seats.filter((s) => !s.isBot).map((s) => s.seatId));
    // Standard convention: check common active-turn fields if present
    const candidates = [
      state.currentTurnSeatId,
      state.activeSeatId,
      state.turnSeatId,
      Array.isArray(state.pendingSeatIds)
        ? state.pendingSeatIds.find((id) => humanIds.has(id))
        : null,
    ];
    for (const c of candidates) {
      if (c && humanIds.has(c)) return c;
    }
    return this.hotseatActiveSeatId || [...humanIds][0] || null;
  }

  _safeProject(fullState, viewerSeatId) {
    if (!fullState) return null;
    if (typeof this.rules.projectState === 'function') {
      return this.rules.projectState(fullState, viewerSeatId);
    }
    return fullState;
  }

  _pushStateToAll() {
    if (!this.fullState) return;
    // Update local host view
    this.projectedState = this._safeProject(
      this.fullState,
      this.isSpectator ? null : this.mySeatId
    );
    this._emit();

    if (this.mode !== 'online') return;

    const serverNow = Date.now();
    // Push per-seat projected views to connected human guests
    for (const seat of this.lobby.seats) {
      if (seat.isBot || !seat.clientId || seat.clientId === this.clientId) continue;
      const view = this._safeProject(this.fullState, seat.seatId);
      this.room.sendToClient(seat.clientId, {
        t: MSG.STATE,
        seq: this.seq,
        state: view,
        lastEvent: this.lastEvent,
        timer: this.timer,
        serverNow,
      });
    }
    // Push public-only view to spectators
    const publicView = this._safeProject(this.fullState, null);
    for (const spec of this.lobby.spectators) {
      this.room.sendToClient(spec.clientId, {
        t: MSG.STATE,
        seq: this.seq,
        state: publicView,
        lastEvent: this.lastEvent,
        timer: this.timer,
        serverNow,
      });
    }
  }

  _broadcastLobby() {
    if (this.mode === 'online' && this.isHost) {
      this.room.broadcast({
        t: MSG.LOBBY,
        lobby: this.lobby,
        serverNow: Date.now(),
      });
    }
  }

  // =========================================================================
  // Synchronized Phase Timers & AI Bot Loop (Host-Only)
  // =========================================================================

  _resetMatchTimers() {
    clearTimeout(this.timerTimeoutHandle);
    this.timerTimeoutHandle = null;
    clearTimeout(this.botTimeoutHandle);
    this.botTimeoutHandle = null;
    this.timer = null;
  }

  _syncPhaseTimer() {
    if (!this.isHost || !this.fullState || this.lobby.phase !== 'playing') return;
    const spec = this.rules.getPhaseTimer ? this.rules.getPhaseTimer(this.fullState) : null;
    if (!spec || !spec.durationMs) {
      clearTimeout(this.timerTimeoutHandle);
      this.timerTimeoutHandle = null;
      this.timer = null;
      return;
    }
    // Keep existing timer running if phaseKey hasn't changed
    if (this.timer && this.timer.phaseKey === spec.phaseKey) {
      return;
    }
    clearTimeout(this.timerTimeoutHandle);
    const durationMs = Math.max(1000, Number(spec.durationMs));
    this.timer = {
      phaseKey: spec.phaseKey,
      durationMs,
      endsAtMs: Date.now() + durationMs,
    };

    this.timerTimeoutHandle = setTimeout(() => {
      if (!this.isHost || !this.fullState || this.lobby.phase !== 'playing') return;
      if (typeof this.rules.onPhaseTimeout !== 'function') return;
      const res = this.rules.onPhaseTimeout(this.fullState, {
        rng: this.rng,
        options: this.lobby.options,
        now: Date.now(),
      });
      if (res && res.state) {
        this.fullState = res.state;
        this.seq += 1;
        this.lastEvent =
          (Array.isArray(res.events) && res.events[res.events.length - 1]) || {
            type: 'PHASE_TIMEOUT',
            ts: Date.now(),
          };
        const result = this.rules.getResult ? this.rules.getResult(this.fullState) : null;
        if (result) {
          this.lobby.phase = 'ended';
          this._resetMatchTimers();
        } else {
          this._syncPhaseTimer();
        }
        this._pushStateToAll();
        if (result) this._broadcastLobby();
        else this._scheduleBots();
        this._saveHostCheckpoint();
      }
    }, durationMs + 50);
  }

  _scheduleBots() {
    clearTimeout(this.botTimeoutHandle);
    this.botTimeoutHandle = null;
    if (!this.isHost || !this.fullState || this.lobby.phase !== 'playing') return;
    if (typeof this.rules.computeBotAction !== 'function') return;

    const bots = this.lobby.seats.filter((s) => s.isBot);
    if (bots.length === 0) return;

    // Human-like pacing (450ms–900ms) so animations & broadcast log remain readable
    const delay = 480 + Math.floor(Math.random() * 380);
    this.botTimeoutHandle = setTimeout(() => {
      if (!this.isHost || !this.fullState || this.lobby.phase !== 'playing') return;
      for (const bot of bots) {
        let act = null;
        try {
          act = this.rules.computeBotAction(this.fullState, bot.seatId, {
            rng: this.rng,
            options: this.lobby.options,
          });
        } catch (err) {
          console.error('[GameEngine] computeBotAction error:', err);
        }
        if (act && act.type) {
          const res = this._hostApplyAction(bot.seatId, act);
          if (res.ok) return; // _hostApplyAction will reschedule next bot tick
        }
      }
    }, delay);
  }

  // =========================================================================
  // Inbound Network Message Routing
  // =========================================================================

  _handleClientDisconnect(clientId) {
    if (!this.isHost) return;
    const seat = this.lobby.seats.find((s) => s.clientId === clientId);
    if (seat) {
      seat.connected = false;
      this._broadcastLobby();
      this._emit();
    }
  }

  _handleNetworkMessage(msg, via) {
    if (!msg || typeof msg !== 'object') return;
    if (this.isHost) {
      this._handleHostInbound(msg, via);
    } else {
      this._handleGuestInbound(msg);
    }
  }

  _handleHostInbound(msg, via) {
    const cid = msg.clientId;
    if (!cid) return;

    if (msg.t === MSG.JOIN) {
      const name = String(msg.name || 'Player').trim().slice(0, 20) || 'Player';
      let seat = this.lobby.seats.find((s) => s.clientId === cid);
      let isSpec = Boolean(msg.wantSpectator);

      if (seat) {
        // Reconnecting existing player!
        seat.connected = true;
        seat.name = name;
        isSpec = false;
      } else if (
        !isSpec &&
        this.lobby.phase === 'lobby' &&
        this.lobby.seats.length < (this.config.maxPlayers || 12)
      ) {
        const idx = this.lobby.seats.length;
        seat = {
          seatId: `seat-${Date.now().toString(36).slice(-3)}-${idx + 1}`,
          clientId: cid,
          name,
          avatar: AVATARS[idx % AVATARS.length],
          isBot: false,
          ready: false,
          connected: true,
        };
        this.lobby.seats.push(seat);
      } else {
        // Room full or match already in progress -> join as Spectator
        isSpec = true;
        if (!this.lobby.spectators.some((sp) => sp.clientId === cid)) {
          this.lobby.spectators.push({ clientId: cid, name });
        }
      }

      const projected = this.fullState
        ? this._safeProject(this.fullState, isSpec ? null : seat.seatId)
        : null;

      this.room.sendToClient(cid, {
        t: MSG.WELCOME,
        roomCode: this.roomCode,
        hostId: this.clientId,
        assignedSeatId: isSpec ? null : seat.seatId,
        isSpectator: isSpec,
        transport: via,
        lobby: this.lobby,
        state: projected,
        seq: this.seq,
        timer: this.timer,
        serverNow: Date.now(),
      });
      this._broadcastLobby();
      this._saveHostCheckpoint();
      this._emit();
      return;
    }

    if (msg.t === MSG.READY) {
      const seat = this.lobby.seats.find((s) => s.clientId === cid);
      if (seat && this.lobby.phase === 'lobby') {
        seat.ready = Boolean(msg.ready);
        this._broadcastLobby();
        this._emit();
      }
      return;
    }

    if (msg.t === MSG.RENAME) {
      const clean = sanitizePlayerName(msg.name, '');
      if (!clean) return;
      const seat = this.lobby.seats.find((s) => s.clientId === cid);
      if (seat) {
        this._hostApplyRename(seat, clean);
        return;
      }
      const spec = this.lobby.spectators.find((sp) => sp.clientId === cid);
      if (spec) {
        spec.name = clean;
        this._broadcastLobby();
        this._saveHostCheckpoint();
        this._emit();
      }
      return;
    }

    if (msg.t === MSG.ACTION) {
      const seat = this.lobby.seats.find((s) => s.clientId === cid);
      if (!seat) {
        this.room.sendToClient(cid, {
          t: MSG.ACTION_REJECTED,
          actionId: msg.actionId,
          reason: 'Not seated',
        });
        return;
      }
      const res = this._hostApplyAction(seat.seatId, msg.action, msg.actionId);
      if (!res.ok) {
        this.room.sendToClient(cid, {
          t: MSG.ACTION_REJECTED,
          actionId: msg.actionId,
          reason: res.reason,
        });
      }
      return;
    }

    if (msg.t === MSG.CHAT) {
      const seat = this.lobby.seats.find((s) => s.clientId === cid);
      const spec = this.lobby.spectators.find((s) => s.clientId === cid);
      const clean = String(msg.text || '').trim().slice(0, 160);
      if (!clean) return;
      const entry = {
        t: MSG.CHAT,
        fromSeatId: seat?.seatId || null,
        fromName: seat?.name || spec?.name || 'Guest',
        text: clean,
        ts: Date.now(),
      };
      this.room.broadcast(entry);
      this.onChat?.(entry);
      return;
    }

    if (msg.t === MSG.LEAVE) {
      this._handleClientDisconnect(cid);
    }
  }

  _handleGuestInbound(msg) {
    if (msg.t === MSG.WELCOME) {
      this.mySeatId = msg.assignedSeatId;
      this.isSpectator = Boolean(msg.isSpectator);
      this.lobby = msg.lobby || this.lobby;
      this.seq = msg.seq || 0;
      this.timer = msg.timer || null;
      if (msg.state) {
        this.projectedState = msg.state;
      }
      this._onWelcomeResolve?.(msg);
      this._emit();
      return;
    }

    if (msg.t === MSG.LOBBY) {
      this.lobby = msg.lobby || this.lobby;
      if (this.lobby.phase === 'lobby') {
        this.projectedState = null;
        this.timer = null;
      }
      this._emit();
      return;
    }

    if (msg.t === MSG.STATE) {
      if (typeof msg.seq === 'number' && msg.seq < this.seq) return;
      this.seq = msg.seq || this.seq;
      this.projectedState = msg.state;
      this.lastEvent = msg.lastEvent || null;
      this.timer = msg.timer || null;
      // Resolve any pending optimistic dispatches
      for (const [aid, resolve] of this.pendingActionResolvers.entries()) {
        this.pendingActionResolvers.delete(aid);
        resolve({ ok: true });
      }
      this._emit();
      return;
    }

    if (msg.t === MSG.ACTION_REJECTED) {
      const resolver = this.pendingActionResolvers.get(msg.actionId);
      if (resolver) {
        this.pendingActionResolvers.delete(msg.actionId);
        resolver({ ok: false, reason: msg.reason });
      }
      this.onToast?.(msg.reason || 'Action rejected', 'error');
      return;
    }

    if (msg.t === MSG.CHAT) {
      this.onChat?.(msg);
      return;
    }

    if (msg.t === MSG.HOST_CLOSING) {
      this.onToast?.('Host closed the room', 'error');
      this.transportStatus = { state: 'closed', transport: 'none', detail: 'Host disconnected' };
      this._emit();
    }
  }

  getRemainingTimerMs() {
    if (!this.timer || !this.timer.endsAtMs) return null;
    const now = this.isHost ? Date.now() : this.room.clock.now();
    return Math.max(0, this.timer.endsAtMs - now);
  }

  getResult() {
    const src = this.isHost ? this.fullState : this.projectedState;
    if (!src || typeof this.rules.getResult !== 'function') return null;
    try {
      return this.rules.getResult(src);
    } catch (_) {
      return null;
    }
  }

  _emit() {
    this.onUpdate?.({
      lobby: this.lobby,
      state: this.projectedState,
      mySeatId: this.mySeatId,
      activeSeatId: this.mode === 'hotseat' ? this.hotseatActiveSeatId : this.mySeatId,
      isHost: this.isHost,
      isSpectator: this.isSpectator,
      mode: this.mode,
      roomCode: this.roomCode,
      transportStatus: this.transportStatus,
      lastEvent: this.lastEvent,
      timer: this.timer,
      result: this.lobby.phase === 'ended' ? this.getResult() : null,
    });
  }

  destroy() {
    this._resetMatchTimers();
    this.room.destroy();
  }
}

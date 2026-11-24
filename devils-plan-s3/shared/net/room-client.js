/**
 * Unified 4-Tier Hybrid RoomClient
 *
 * Host Mode (`hostRoom`):
 *   Simultaneously opens:
 *     1. Tier 3 BroadcastChannel (instant same-browser multi-tab)
 *     2. Tier 1 PeerJS WebRTC Star (primary low-latency P2P)
 *     3. Tier 2 MQTT-over-WSS with AES-GCM room codec (transparent NAT/firewall fallback)
 *   Routes replies per-client over whichever transport that client connected on,
 *   so WebRTC P2P guests and strict-NAT MQTT guests play seamlessly in the same room!
 *
 * Guest Mode (`joinRoom`):
 *   In `transport='auto'` mode:
 *     1. Probes BroadcastChannel (260ms) -> instant <1ms local multi-tab if Host is on same browser
 *     2. Attempts PeerJS WebRTC DataChannel (4500ms)
 *     3. Automatically falls back to encrypted MQTT-over-WSS if signaling/ICE fails
 */

import {
  computeRoomNamespace,
  createRoomCodec,
  getClientId,
  ClockSync,
  MSG,
} from './protocol.js';
import { PeerJsHostTransport, PeerJsGuestTransport } from './peerjs-transport.js';
import { MqttWssClient } from './mqtt-transport.js';
import { BroadcastHostTransport, BroadcastGuestTransport } from './local-transport.js';

export class RoomClient {
  constructor({ gameId, onMessage, onStatusChange, onClientDisconnect }) {
    this.gameId = gameId;
    this.clientId = getClientId();
    this.onMessage = onMessage; // (msg, fromTransport) => void
    this.onStatusChange = onStatusChange; // ({ state, transport, detail }) => void
    this.onClientDisconnect = onClientDisconnect; // (clientId) => void

    this.role = null; // 'host' | 'guest' | 'local'
    this.roomCode = null;
    this.activeTransport = 'none'; // 'peerjs' | 'mqtt' | 'local-tab' | 'loopback'
    this.clock = new ClockSync();

    // Host transports
    this.bcHost = null;
    this.peerHost = null;
    this.mqttHost = null;
    this.mqttTopics = null;
    this.codec = null;
    this.clientTransportMap = new Map(); // clientId -> 'peerjs' | 'mqtt' | 'local-tab'

    // Guest transports
    this.bcGuest = null;
    this.peerGuest = null;
    this.mqttGuest = null;
    this.pingInterval = null;
    this.destroyed = false;
  }

  _emitStatus(state, transport, detail = '') {
    this.activeTransport = transport;
    this.onStatusChange?.({ state, transport, detail });
  }

  /**
   * Local-only in-memory mode (Solo vs AI / Local Pass-and-Play). Zero network traffic.
   */
  startLocal(roomCode = 'LOCAL') {
    this.destroy();
    this.destroyed = false;
    this.role = 'local';
    this.roomCode = roomCode;
    this._emitStatus('connected', 'loopback', 'Local');
    return { roomCode, transport: 'loopback' };
  }

  /**
   * Start hosting an online room (or local multi-tab if transportPref === 'local').
   */
  async hostRoom(roomCode, { transportPref = 'auto' } = {}) {
    this.destroy();
    this.destroyed = false;
    this.role = 'host';
    this.roomCode = roomCode;
    this._emitStatus('connecting', 'none', 'Opening room...');

    const handleClientMsg = (msg, via) => {
      if (this.destroyed || !msg || typeof msg !== 'object') return;
      if (msg.clientId) {
        this.clientTransportMap.set(msg.clientId, via);
      }
      if (msg.t === MSG.PING && msg.clientId) {
        this.sendToClient(msg.clientId, {
          t: MSG.PONG,
          ts: msg.ts,
          serverNow: Date.now(),
        });
        return;
      }
      this.onMessage?.(msg, via);
    };

    // Tier 3: BroadcastChannel (always helpful for multi-tab testing)
    this.bcHost = new BroadcastHostTransport({
      gameId: this.gameId,
      roomCode,
      onClientMessage: handleClientMsg,
    });
    this.bcHost.start();

    if (transportPref === 'local') {
      this._emitStatus('connected', 'local-tab', 'Local Multi-Tab');
      return { roomCode, transport: 'local-tab' };
    }

    const ns = await computeRoomNamespace(this.gameId, roomCode);
    this.codec = await createRoomCodec(this.gameId, roomCode);
    this.mqttTopics = {
      toHost: `dp3/v1/${ns}/to-host`,
      toPeer: (cid) => `dp3/v1/${ns}/to-peer/${cid}`,
      broadcast: `dp3/v1/${ns}/broadcast`,
    };

    const tasks = [];
    let peerReady = false;
    let mqttReady = false;

    // Tier 1: PeerJS WebRTC Star
    if (transportPref === 'auto' || transportPref === 'peerjs') {
      this.peerHost = new PeerJsHostTransport({
        gameId: this.gameId,
        roomCode,
        onClientMessage: handleClientMsg,
        onClientDisconnect: (cid) => {
          if (this.clientTransportMap.get(cid) === 'peerjs') {
            this.onClientDisconnect?.(cid);
          }
        },
      });
      tasks.push(
        this.peerHost
          .start(5500)
          .then(() => {
            peerReady = true;
          })
          .catch((err) => {
            console.warn('[RoomClient] PeerJS host unavailable, relying on MQTT:', err?.message);
          })
      );
    }

    // Tier 2: MQTT-over-WSS (always started in 'auto' or 'mqtt' so NAT-blocked guests can join!)
    if (transportPref === 'auto' || transportPref === 'mqtt') {
      this.mqttHost = new MqttWssClient({ clientIdPrefix: 'dp3h_' });
      this.mqttHost.onMessage = async (topic, payloadStr) => {
        if (topic !== this.mqttTopics.toHost) return;
        const msg = await this.codec.decode(payloadStr);
        if (msg) handleClientMsg(msg, 'mqtt');
      };
      this.mqttHost.subscribe(this.mqttTopics.toHost);
      tasks.push(
        this.mqttHost
          .connect(5500)
          .then(() => {
            mqttReady = true;
          })
          .catch((err) => {
            console.warn('[RoomClient] MQTT host unavailable:', err?.message);
          })
      );
    }

    await Promise.all(tasks);
    if (this.destroyed) return { roomCode, transport: 'none' };

    if (peerReady && mqttReady) {
      this._emitStatus('connected', 'peerjs', 'P2P + Relay Ready');
      return { roomCode, transport: 'peerjs' };
    }
    if (peerReady) {
      this._emitStatus('connected', 'peerjs', 'P2P Ready');
      return { roomCode, transport: 'peerjs' };
    }
    if (mqttReady) {
      this._emitStatus('connected', 'mqtt', 'Relay Ready');
      return { roomCode, transport: 'mqtt' };
    }

    // Offline fallback: local multi-tab still works!
    this._emitStatus('connected', 'local-tab', 'Offline (Local Tabs Only)');
    return { roomCode, transport: 'local-tab' };
  }

  /**
   * Join an existing room as Guest or Spectator with automatic transport fallback.
   */
  async joinRoom(roomCode, { transportPref = 'auto' } = {}) {
    this.destroy();
    this.destroyed = false;
    this.role = 'guest';
    this.roomCode = roomCode;
    this._emitStatus('connecting', 'none', 'Connecting...');

    const handleHostMsg = (msg) => {
      if (this.destroyed || !msg || typeof msg !== 'object') return;
      if (msg.t === MSG.PONG) {
        const rtt = Math.max(0, Date.now() - (msg.ts || Date.now()));
        this.clock.sample(msg.serverNow, rtt);
        return;
      }
      if (typeof msg.serverNow === 'number') {
        this.clock.sample(msg.serverNow, 40);
      }
      this.onMessage?.(msg, this.activeTransport);
    };

    // 1. Try local BroadcastChannel first (fast 260ms probe)
    if (transportPref === 'auto' || transportPref === 'local') {
      try {
        const bc = new BroadcastGuestTransport({
          gameId: this.gameId,
          roomCode,
          clientId: this.clientId,
          onHostMessage: handleHostMsg,
        });
        await bc.probe(260);
        this.bcGuest = bc;
        this._emitStatus('connected', 'local-tab', 'Local Tab');
        this._startGuestPing();
        return { roomCode, transport: 'local-tab' };
      } catch (_) {
        if (transportPref === 'local') {
          this._emitStatus('error', 'none', 'No local host tab found');
          throw new Error('No local host tab found for room ' + roomCode);
        }
      }
    }

    // 2. Try PeerJS WebRTC DataChannel
    if (transportPref === 'auto' || transportPref === 'peerjs') {
      try {
        const pg = new PeerJsGuestTransport({
          gameId: this.gameId,
          roomCode,
          onHostMessage: handleHostMsg,
          onDisconnect: () => {
            if (!this.destroyed) {
              this._emitStatus('reconnecting', 'peerjs', 'Connection lost');
            }
          },
        });
        await pg.connect(4500);
        this.peerGuest = pg;
        this._emitStatus('connected', 'peerjs', 'WebRTC P2P');
        this._startGuestPing();
        return { roomCode, transport: 'peerjs' };
      } catch (err) {
        console.warn('[RoomClient] PeerJS guest failed, falling back to MQTT-WSS:', err?.message);
        if (transportPref === 'peerjs') {
          this._emitStatus('error', 'none', 'PeerJS failed');
          throw err;
        }
      }
    }

    // 3. Automatic MQTT-over-WSS Fallback (NAT/Firewall proof)
    const ns = await computeRoomNamespace(this.gameId, roomCode);
    this.codec = await createRoomCodec(this.gameId, roomCode);
    this.mqttTopics = {
      toHost: `dp3/v1/${ns}/to-host`,
      myInbox: `dp3/v1/${ns}/to-peer/${this.clientId}`,
      broadcast: `dp3/v1/${ns}/broadcast`,
    };

    const mq = new MqttWssClient({ clientIdPrefix: 'dp3g_' });
    mq.onMessage = async (_topic, payloadStr) => {
      const msg = await this.codec.decode(payloadStr);
      if (msg) handleHostMsg(msg);
    };
    mq.onStatus = (st) => {
      if (this.destroyed) return;
      if (st === 'connected') this._emitStatus('connected', 'mqtt', 'WSS Relay');
      else if (st === 'reconnecting') this._emitStatus('reconnecting', 'mqtt', 'Reconnecting...');
    };
    mq.subscribe(this.mqttTopics.myInbox);
    mq.subscribe(this.mqttTopics.broadcast);

    await mq.connect(6000);
    this.mqttGuest = mq;
    this._emitStatus('connected', 'mqtt', 'WSS Relay');
    this._startGuestPing();
    return { roomCode, transport: 'mqtt' };
  }

  _startGuestPing() {
    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.role === 'guest' && !this.destroyed) {
        this.sendToHost({ t: MSG.PING, clientId: this.clientId, ts: Date.now() });
      }
    }, 5000);
  }

  /**
   * Guest -> Host send.
   */
  sendToHost(msg) {
    if (this.destroyed) return false;
    if (this.bcGuest?.open) return this.bcGuest.sendToHost(msg);
    if (this.peerGuest?.open) return this.peerGuest.sendToHost(msg);
    if (this.mqttGuest?.connected && this.codec && this.mqttTopics) {
      this.codec.encode(msg).then((encoded) => {
        this.mqttGuest?.publish(this.mqttTopics.toHost, encoded);
      });
      return true;
    }
    return false;
  }

  /**
   * Host -> Specific Client unicast (used for projected private state!).
   */
  sendToClient(clientId, msg) {
    if (this.destroyed || this.role !== 'host') return false;
    const via = this.clientTransportMap.get(clientId);
    if (via === 'local-tab' && this.bcHost) {
      return this.bcHost.sendToClient(clientId, msg);
    }
    if (via === 'peerjs' && this.peerHost?.sendToClient(clientId, msg)) {
      return true;
    }
    if (this.mqttHost?.connected && this.codec && this.mqttTopics) {
      this.codec.encode(msg).then((encoded) => {
        this.mqttHost?.publish(this.mqttTopics.toPeer(clientId), encoded);
      });
      return true;
    }
    if (this.bcHost) {
      return this.bcHost.sendToClient(clientId, msg);
    }
    return false;
  }

  /**
   * Host -> All Guests broadcast (lobby updates, public chat).
   */
  broadcast(msg) {
    if (this.destroyed || this.role !== 'host') return;
    this.bcHost?.broadcast(msg);
    this.peerHost?.broadcast(msg);
    if (this.mqttHost?.connected && this.codec && this.mqttTopics) {
      this.codec.encode(msg).then((encoded) => {
        this.mqttHost?.publish(this.mqttTopics.broadcast, encoded);
      });
    }
  }

  destroy() {
    this.destroyed = true;
    clearInterval(this.pingInterval);
    this.pingInterval = null;
    if (this.role === 'host') {
      try {
        this.broadcast({ t: MSG.HOST_CLOSING, reason: 'closed' });
      } catch (_) {}
    }
    this.bcHost?.destroy();
    this.bcHost = null;
    this.peerHost?.destroy();
    this.peerHost = null;
    this.mqttHost?.close();
    this.mqttHost = null;
    this.bcGuest?.destroy();
    this.bcGuest = null;
    this.peerGuest?.destroy();
    this.peerGuest = null;
    this.mqttGuest?.close();
    this.mqttGuest = null;
    this.clientTransportMap.clear();
  }
}

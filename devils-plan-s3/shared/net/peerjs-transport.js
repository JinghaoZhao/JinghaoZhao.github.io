/**
 * PeerJS WebRTC DataChannel Star Transport
 * Loads vendored shared/vendor/peerjs.min.js with CDN fallback.
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

let peerJsLoadPromise = null;

export function loadPeerJS() {
  if (typeof window !== 'undefined' && window.Peer) {
    return Promise.resolve(window.Peer);
  }
  if (peerJsLoadPromise) return peerJsLoadPromise;

  const vendorUrl = new URL('../vendor/peerjs.min.js', import.meta.url).href;
  const cdnUrl = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('Peer global missing')));
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });

  peerJsLoadPromise = loadScript(vendorUrl).catch(() => loadScript(cdnUrl));
  return peerJsLoadPromise;
}

export function makeHostPeerId(gameId, roomCode) {
  const safeGame = String(gameId).toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `dp3-${safeGame}-${roomCode}`;
}

export class PeerJsHostTransport {
  constructor({ gameId, roomCode, onClientMessage, onClientDisconnect }) {
    this.hostPeerId = makeHostPeerId(gameId, roomCode);
    this.onClientMessage = onClientMessage;
    this.onClientDisconnect = onClientDisconnect;
    this.peer = null;
    this.connsByPeerId = new Map();
    this.peerIdByClientId = new Map();
    this.ready = false;
  }

  async start(timeoutMs = 6000) {
    const PeerCtor = await loadPeerJS();
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('PeerJS host open timeout'));
      }, timeoutMs);

      const peer = new PeerCtor(this.hostPeerId, {
        debug: 0,
        config: { iceServers: ICE_SERVERS },
      });
      this.peer = peer;

      peer.on('open', (id) => {
        this.ready = true;
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(id);
        }
      });

      peer.on('connection', (conn) => {
        this.connsByPeerId.set(conn.peer, conn);
        conn.on('data', (data) => {
          if (data && typeof data === 'object' && data.clientId) {
            this.peerIdByClientId.set(data.clientId, conn.peer);
          }
          this.onClientMessage?.(data, 'peerjs');
        });
        conn.on('close', () => {
          this.connsByPeerId.delete(conn.peer);
          for (const [cid, pid] of this.peerIdByClientId.entries()) {
            if (pid === conn.peer) {
              this.peerIdByClientId.delete(cid);
              this.onClientDisconnect?.(cid, 'peerjs');
            }
          }
        });
      });

      peer.on('disconnected', () => {
        if (!peer.destroyed) {
          try {
            peer.reconnect();
          } catch (_) {}
        }
      });

      peer.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  sendToClient(clientId, msg) {
    const pid = this.peerIdByClientId.get(clientId);
    if (!pid) return false;
    const conn = this.connsByPeerId.get(pid);
    if (!conn || !conn.open) return false;
    try {
      conn.send(msg);
      return true;
    } catch (_) {
      return false;
    }
  }

  broadcast(msg) {
    let count = 0;
    for (const conn of this.connsByPeerId.values()) {
      if (conn.open) {
        try {
          conn.send(msg);
          count++;
        } catch (_) {}
      }
    }
    return count;
  }

  destroy() {
    for (const conn of this.connsByPeerId.values()) {
      try {
        conn.close();
      } catch (_) {}
    }
    this.connsByPeerId.clear();
    this.peerIdByClientId.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    this.ready = false;
  }
}

export class PeerJsGuestTransport {
  constructor({ gameId, roomCode, onHostMessage, onDisconnect }) {
    this.hostPeerId = makeHostPeerId(gameId, roomCode);
    this.onHostMessage = onHostMessage;
    this.onDisconnect = onDisconnect;
    this.peer = null;
    this.conn = null;
    this.open = false;
  }

  async connect(timeoutMs = 4500) {
    const PeerCtor = await loadPeerJS();
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.destroy();
        reject(err);
      };

      const timer = setTimeout(() => fail(new Error('PeerJS WebRTC connect timeout')), timeoutMs);

      const peer = new PeerCtor({
        debug: 0,
        config: { iceServers: ICE_SERVERS },
      });
      this.peer = peer;

      peer.on('open', () => {
        const conn = peer.connect(this.hostPeerId, {
          reliable: true,
          serialization: 'json',
        });
        this.conn = conn;

        conn.on('open', () => {
          this.open = true;
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
        });

        conn.on('data', (data) => {
          this.onHostMessage?.(data);
        });

        conn.on('close', () => {
          const wasOpen = this.open;
          this.open = false;
          if (!settled) {
            fail(new Error('PeerJS connection closed before open'));
          } else if (wasOpen) {
            this.onDisconnect?.();
          }
        });

        conn.on('error', (err) => fail(err));
      });

      peer.on('error', (err) => fail(err));
    });
  }

  sendToHost(msg) {
    if (!this.open || !this.conn || !this.conn.open) return false;
    try {
      this.conn.send(msg);
      return true;
    } catch (_) {
      return false;
    }
  }

  destroy() {
    this.open = false;
    if (this.conn) {
      try {
        this.conn.close();
      } catch (_) {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
  }
}

/**
 * Tier 3: BroadcastChannel Transport (Instant <1ms Same-Browser Multi-Tab Testing)
 * Tier 4: LocalLoopback Transport (Zero-Network Solo vs AI & Local Pass-and-Play)
 */

export class BroadcastHostTransport {
  constructor({ gameId, roomCode, onClientMessage }) {
    this.channelName = `dp3-bc-${gameId}-${roomCode}`;
    this.onClientMessage = onClientMessage;
    this.bc = null;
  }

  start() {
    if (typeof BroadcastChannel === 'undefined') return false;
    this.bc = new BroadcastChannel(this.channelName);
    this.bc.onmessage = (evt) => {
      const env = evt.data;
      if (!env || env.dir !== 'c2h') return;
      if (env.probe) {
        this.bc.postMessage({ dir: 'h2c', probeAck: true, targetClientId: env.clientId });
        return;
      }
      this.onClientMessage?.(env.msg, 'local-tab');
    };
    return true;
  }

  sendToClient(clientId, msg) {
    if (!this.bc) return false;
    this.bc.postMessage({ dir: 'h2c', targetClientId: clientId, msg });
    return true;
  }

  broadcast(msg) {
    if (!this.bc) return false;
    this.bc.postMessage({ dir: 'h2c', targetClientId: '*', msg });
    return true;
  }

  destroy() {
    if (this.bc) {
      try {
        this.bc.close();
      } catch (_) {}
      this.bc = null;
    }
  }
}

export class BroadcastGuestTransport {
  constructor({ gameId, roomCode, clientId, onHostMessage }) {
    this.channelName = `dp3-bc-${gameId}-${roomCode}`;
    this.clientId = clientId;
    this.onHostMessage = onHostMessage;
    this.bc = null;
    this.open = false;
  }

  /**
   * Probes whether a Host tab is already open in this browser (250ms timeout).
   */
  probe(timeoutMs = 260) {
    return new Promise((resolve, reject) => {
      if (typeof BroadcastChannel === 'undefined') {
        reject(new Error('BroadcastChannel unavailable'));
        return;
      }
      const bc = new BroadcastChannel(this.channelName);
      this.bc = bc;
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.destroy();
        reject(new Error('No local host tab found'));
      }, timeoutMs);

      bc.onmessage = (evt) => {
        const env = evt.data;
        if (!env || env.dir !== 'h2c') return;
        if (env.targetClientId !== '*' && env.targetClientId !== this.clientId) return;
        if (env.probeAck) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            this.open = true;
            resolve();
          }
          return;
        }
        if (env.msg) {
          this.onHostMessage?.(env.msg);
        }
      };

      bc.postMessage({ dir: 'c2h', probe: true, clientId: this.clientId });
    });
  }

  sendToHost(msg) {
    if (!this.bc || !this.open) return false;
    this.bc.postMessage({ dir: 'c2h', clientId: this.clientId, msg });
    return true;
  }

  destroy() {
    this.open = false;
    if (this.bc) {
      try {
        this.bc.close();
      } catch (_) {}
      this.bc = null;
    }
  }
}

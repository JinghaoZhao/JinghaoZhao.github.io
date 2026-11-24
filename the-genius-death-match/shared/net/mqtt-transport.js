/**
 * Zero-Dependency MQTT 3.1.1 over WebSocket (WSS) Client
 * Primary broker:   wss://broker.emqx.io:8084/mqtt
 * Secondary broker: wss://test.mosquitto.org:8081/
 *
 * Automatic NAT/firewall fallback when WebRTC ICE cannot establish direct P2P.
 */

const DEFAULT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/',
];

const enc = new TextEncoder();
const dec = new TextDecoder();

function encodeRemainingLength(len) {
  const bytes = [];
  let x = len;
  do {
    let digit = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) digit |= 0x80;
    bytes.push(digit);
  } while (x > 0);
  return bytes;
}

function encodeUtf8String(str) {
  const b = enc.encode(str);
  const out = new Uint8Array(2 + b.length);
  out[0] = (b.length >> 8) & 0xff;
  out[1] = b.length & 0xff;
  out.set(b, 2);
  return out;
}

function concatBytes(...arrays) {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function buildConnectPacket(clientId, keepAliveSec = 30) {
  const protoName = encodeUtf8String('MQTT');
  const varHeader = concatBytes(
    protoName,
    new Uint8Array([
      0x04, // Protocol Level 4 (MQTT 3.1.1)
      0x02, // Clean Session
      (keepAliveSec >> 8) & 0xff,
      keepAliveSec & 0xff,
    ])
  );
  const payload = encodeUtf8String(clientId);
  const body = concatBytes(varHeader, payload);
  const rem = new Uint8Array(encodeRemainingLength(body.length));
  return concatBytes(new Uint8Array([0x10]), rem, body);
}

function buildSubscribePacket(packetId, topic) {
  const varHeader = new Uint8Array([(packetId >> 8) & 0xff, packetId & 0xff]);
  const topicBytes = encodeUtf8String(topic);
  const payload = concatBytes(topicBytes, new Uint8Array([0x00])); // QoS 0
  const body = concatBytes(varHeader, payload);
  const rem = new Uint8Array(encodeRemainingLength(body.length));
  return concatBytes(new Uint8Array([0x82]), rem, body);
}

function buildPublishPacket(topic, messageStr) {
  const topicBytes = encodeUtf8String(topic);
  const payload = enc.encode(messageStr);
  const body = concatBytes(topicBytes, payload);
  const rem = new Uint8Array(encodeRemainingLength(body.length));
  return concatBytes(new Uint8Array([0x30]), rem, body); // QoS 0
}

const PINGREQ_PACKET = new Uint8Array([0xc0, 0x00]);
const DISCONNECT_PACKET = new Uint8Array([0xe0, 0x00]);

export class MqttWssClient {
  constructor({ brokers = DEFAULT_BROKERS, clientIdPrefix = 'tgm_' } = {}) {
    this.brokers = brokers;
    this.clientId = clientIdPrefix + Math.random().toString(36).slice(2, 10);
    this.ws = null;
    this.connected = false;
    this.closedByUser = false;
    this.brokerIndex = 0;
    this.packetId = 1;
    this.subscriptions = new Set();
    this.rxBuf = new Uint8Array(0);
    this.pingTimer = null;
    this.reconnectTimer = null;
    this.onMessage = null;
    this.onStatus = null;
  }

  connect(timeoutMs = 5500) {
    this.closedByUser = false;
    return this._tryBroker(this.brokerIndex, timeoutMs);
  }

  _tryBroker(idx, timeoutMs) {
    return new Promise((resolve, reject) => {
      if (idx >= this.brokers.length) {
        reject(new Error('All MQTT WSS brokers unreachable'));
        return;
      }
      const url = this.brokers[idx];
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch (_) {}
        this._tryBroker(idx + 1, timeoutMs).then(resolve, reject);
      }, timeoutMs);

      let ws;
      try {
        ws = new WebSocket(url, 'mqtt');
        ws.binaryType = 'arraybuffer';
      } catch (err) {
        clearTimeout(timer);
        this._tryBroker(idx + 1, timeoutMs).then(resolve, reject);
        return;
      }

      this.ws = ws;
      this.rxBuf = new Uint8Array(0);

      ws.onopen = () => {
        try {
          ws.send(buildConnectPacket(this.clientId, 30));
        } catch (_) {}
      };

      ws.onmessage = (evt) => {
        if (!(evt.data instanceof ArrayBuffer)) return;
        const chunk = new Uint8Array(evt.data);
        this.rxBuf = concatBytes(this.rxBuf, chunk);
        this._drainPackets((connackOk) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            if (connackOk) {
              this.brokerIndex = idx;
              this.connected = true;
              this._startKeepAlive();
              for (const topic of this.subscriptions) {
                this._sendSubscribe(topic);
              }
              this.onStatus?.('connected', url);
              resolve(url);
            } else {
              try {
                ws.close();
              } catch (_) {}
              this._tryBroker(idx + 1, timeoutMs).then(resolve, reject);
            }
          }
        });
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          try {
            ws.close();
          } catch (_) {}
          this._tryBroker(idx + 1, timeoutMs).then(resolve, reject);
        }
      };

      ws.onclose = () => {
        this._stopKeepAlive();
        const wasConnected = this.connected;
        this.connected = false;
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          this._tryBroker(idx + 1, timeoutMs).then(resolve, reject);
          return;
        }
        if (!this.closedByUser && wasConnected) {
          this.onStatus?.('reconnecting', url);
          this._scheduleReconnect();
        }
      };
    });
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.closedByUser) return;
      this._tryBroker(0, 5500).catch(() => {
        if (!this.closedByUser) this._scheduleReconnect();
      });
    }, 2200);
  }

  _startKeepAlive() {
    this._stopKeepAlive();
    this.pingTimer = setInterval(() => {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(PINGREQ_PACKET);
        } catch (_) {}
      }
    }, 20000);
  }

  _stopKeepAlive() {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  _drainPackets(onConnack) {
    while (this.rxBuf.length >= 2) {
      const header = this.rxBuf[0];
      const packetType = (header >> 4) & 0x0f;
      let multiplier = 1;
      let remLen = 0;
      let idx = 1;
      let completeHeader = false;
      while (idx < this.rxBuf.length && idx <= 4) {
        const encoded = this.rxBuf[idx++];
        remLen += (encoded & 127) * multiplier;
        multiplier *= 128;
        if ((encoded & 128) === 0) {
          completeHeader = true;
          break;
        }
      }
      if (!completeHeader) return;
      const totalLen = idx + remLen;
      if (this.rxBuf.length < totalLen) return;

      const body = this.rxBuf.slice(idx, totalLen);
      this.rxBuf = this.rxBuf.slice(totalLen);

      if (packetType === 2) {
        const returnCode = body.length >= 2 ? body[1] : 1;
        onConnack?.(returnCode === 0);
      } else if (packetType === 3) {
        const qos = (header >> 1) & 0x03;
        if (body.length < 2) continue;
        const topicLen = (body[0] << 8) | body[1];
        const topicEnd = 2 + topicLen;
        if (topicEnd > body.length) continue;
        const topic = dec.decode(body.slice(2, topicEnd));
        const payloadStart = qos > 0 ? topicEnd + 2 : topicEnd;
        const payloadStr = dec.decode(body.slice(payloadStart));
        try {
          this.onMessage?.(topic, payloadStr);
        } catch (err) {
          console.error('[MQTT] onMessage error:', err);
        }
      }
    }
  }

  _sendSubscribe(topic) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const pid = this.packetId;
    this.packetId = (this.packetId % 65534) + 1;
    try {
      this.ws.send(buildSubscribePacket(pid, topic));
    } catch (_) {}
  }

  subscribe(topic) {
    this.subscriptions.add(topic);
    if (this.connected) {
      this._sendSubscribe(topic);
    }
  }

  publish(topic, payloadStr) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(buildPublishPacket(topic, payloadStr));
      return true;
    } catch (_) {
      return false;
    }
  }

  close() {
    this.closedByUser = true;
    this._stopKeepAlive();
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(DISCONNECT_PACKET);
        }
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.connected = false;
    this.onStatus?.('closed', '');
  }
}

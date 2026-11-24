/**
 * Shared Multiplayer Protocol Constants, Utilities, Seeded PRNG & Room Codec
 * Namespaced for The Genius: Death Match (TGM) so rooms never collide with other apps.
 */

export const PROTOCOL_VERSION = 1;
export const ROOM_PREFIX = 'TGM-';

// Unambiguous 32-char Crockford-like alphabet (excludes 0, O, 1, I, L)
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(len = 5) {
  const bytes = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length];
  }
  return out;
}

export function formatRoomCodeDisplay(code) {
  const norm = normalizeRoomCode(code);
  return norm ? `${ROOM_PREFIX}${norm}` : '';
}

export function normalizeRoomCode(raw) {
  let str = String(raw || '').toUpperCase().trim();
  if (str.startsWith('TGM-')) str = str.slice(4);
  else if (str.startsWith('TGM') && str.length >= 8) str = str.slice(3);
  return str.replace(/[^A-Z2-9]/g, '').slice(0, 6);
}

export function sanitizePlayerName(raw, fallback = '') {
  const cleaned = String(raw ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 20);
  return cleaned || fallback;
}

/**
 * Per-tab persistent client ID (sessionStorage so 2 tabs on 1 device are 2 distinct players,
 * while refreshing a tab preserves identity for reconnection).
 */
export function getClientId() {
  const KEY = 'tgm_client_id';
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
  } catch (_) {}
  const id =
    'tg_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 9);
  try {
    sessionStorage.setItem(KEY, id);
  } catch (_) {}
  return id;
}

export function randomActionId() {
  return 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Deterministic Mulberry32 PRNG for reproducible shuffles and tests.
 */
export function createSeededRng(seedInput) {
  let seed = 0;
  if (typeof seedInput === 'number') {
    seed = seedInput >>> 0;
  } else {
    const str = String(seedInput ?? Date.now());
    for (let i = 0; i < str.length; i++) {
      seed = (Math.imul(31, seed) + str.charCodeAt(i)) >>> 0;
    }
  }
  return function next() {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic 16-hex-char namespace hash (SHA-256 when available, FNV-1a fallback).
 */
export async function computeRoomNamespace(gameId, roomCode) {
  const input = `the-genius-dm:v1:${gameId}:${roomCode}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(input)
      );
      return Array.from(new Uint8Array(digest).slice(0, 8))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (_) {}
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/**
 * Room-scoped AES-GCM-128 payload codec for public MQTT relay privacy.
 * Falls back cleanly to tagged JSON when crypto.subtle is unavailable (e.g. non-HTTPS localhost).
 */
export async function createRoomCodec(gameId, roomCode) {
  let aesKey = null;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const rawKey = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`tgm-aes-key:${gameId}:${roomCode}`)
      );
      aesKey = await crypto.subtle.importKey(
        'raw',
        rawKey.slice(0, 16),
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    }
  } catch (_) {
    aesKey = null;
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function toB64(u8) {
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin);
  }

  function fromB64(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  return {
    async encode(obj) {
      const plain = JSON.stringify(obj);
      if (!aesKey) return 'P:' + plain;
      try {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const cipher = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          aesKey,
          enc.encode(plain)
        );
        const combined = new Uint8Array(12 + cipher.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(cipher), 12);
        return 'E:' + toB64(combined);
      } catch (_) {
        return 'P:' + plain;
      }
    },

    async decode(str) {
      if (typeof str !== 'string' || str.length < 2) return null;
      if (str.startsWith('P:')) {
        try {
          return JSON.parse(str.slice(2));
        } catch (_) {
          return null;
        }
      }
      if (str.startsWith('E:') && aesKey) {
        try {
          const combined = fromB64(str.slice(2));
          const iv = combined.slice(0, 12);
          const data = combined.slice(12);
          const plainBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            data
          );
          return JSON.parse(dec.decode(plainBuf));
        } catch (_) {
          return null;
        }
      }
      try {
        return JSON.parse(str);
      } catch (_) {
        return null;
      }
    },
  };
}

/**
 * EWMA clock-skew tracker so Guest countdown timers stay synchronized to Host clock.
 */
export class ClockSync {
  constructor() {
    this.offsetMs = 0;
    this.initialized = false;
  }

  sample(serverNow, rttMs = 0) {
    if (typeof serverNow !== 'number') return;
    const estOffset = serverNow + rttMs / 2 - Date.now();
    if (!this.initialized) {
      this.offsetMs = estOffset;
      this.initialized = true;
    } else {
      this.offsetMs = this.offsetMs * 0.75 + estOffset * 0.25;
    }
  }

  now() {
    return Date.now() + this.offsetMs;
  }
}

export const MSG = {
  JOIN: 'JOIN',
  READY: 'READY',
  RENAME: 'RENAME',
  ACTION: 'ACTION',
  CHAT: 'CHAT',
  PING: 'PING',
  PONG: 'PONG',
  LEAVE: 'LEAVE',
  WELCOME: 'WELCOME',
  LOBBY: 'LOBBY',
  STATE: 'STATE',
  ACTION_REJECTED: 'ACTION_REJECTED',
  HOST_CLOSING: 'HOST_CLOSING',
};

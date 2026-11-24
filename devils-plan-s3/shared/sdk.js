/**
 * The Devil's Plan Season 3: Dead Again — Shared Game SDK Barrel
 *
 * Every game imports from this single module:
 *   import { mountGame, SFX, I18n, UI, createSeededRng } from '../../shared/sdk.js';
 */

export { mountGame, UI } from './ui/shell.js';
export { SFX } from './audio/sound-engine.js';
export { I18n } from './i18n.js';
export { RoomClient } from './net/room-client.js';
export { GameEngine } from './net/game-engine.js';
export {
  createSeededRng,
  generateRoomCode,
  normalizeRoomCode,
  sanitizePlayerName,
  getClientId,
} from './net/protocol.js';

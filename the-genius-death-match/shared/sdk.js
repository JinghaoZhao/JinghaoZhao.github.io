/**
 * The Genius: Death Match Arena — Shared Game SDK Barrel
 *
 * Every game imports from this single module:
 *   import { mountGame, SFX, I18n, UI, GarnetVault, createSeededRng } from '../../shared/sdk.js';
 */

export { mountGame, UI } from './ui/shell.js';
export { SFX } from './audio/sound-engine.js';
export { I18n } from './i18n.js';
export { GarnetVault } from './vault.js';
export { RoomClient } from './net/room-client.js';
export { GameEngine, AI_DIFFICULTIES } from './net/game-engine.js';
export {
  createSeededRng,
  generateRoomCode,
  formatRoomCodeDisplay,
  normalizeRoomCode,
  sanitizePlayerName,
  getClientId,
} from './net/protocol.js';

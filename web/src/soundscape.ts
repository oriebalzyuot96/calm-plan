// Meditation soundscapes reuse the Web Audio synthesis in public/js/sound.js (no audio files).
// Interface sounds (chimes, toggles, sends) come from Pelagic's sound engine instead.
// sound.js reads the Sound on/off and volume from public/js/prefs.js, so we mirror the
// Pelagic sound preferences there.
import { updatePrefs } from '../../public/js/prefs.js';
import {
  isAmbientPlaying,
  setAmbientLevel,
  startAmbient,
  stopAmbient,
  unlockAudio,
} from '../../public/js/sound.js';

export function syncSoundPrefs(enabled: boolean, volume01: number) {
  updatePrefs({ soundOn: enabled, volume: Math.round(volume01 * 100) });
  if (!enabled) stopAmbient(true);
}

export const soundscape = {
  unlock: () => unlockAudio(),
  start: (kind: string) => startAmbient(kind) as boolean,
  level: (v: number) => setAmbientLevel(v),
  playing: () => isAmbientPlaying() as boolean,
  stop: (immediate = false) => stopAmbient(immediate),
};

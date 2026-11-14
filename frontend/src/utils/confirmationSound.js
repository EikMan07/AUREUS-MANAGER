// Motor de audio sintético nativo (Web Audio API) para confirmaciones de Aureus Manager.
// Sintetiza una campanita cristalina de dos notas ascendentes sin archivos externos.

let sharedAudioCtx = null;
let lastChimePlayedAt = 0;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getAudioContext();
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
}

/**
 * Reproduce una campanita cristalina de confirmación estilo iPhone
 * mediante síntesis Web Audio API de dos notas en quinta justa (B5 -> F#6).
 */
export const playConfirmationChime = () => {
  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('aureus_sound_enabled') === 'false'
    ) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastChimePlayedAt < 120) return;
    lastChimePlayedAt = nowMs;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playBellStrike = (freq, startTime, duration, peakGain) => {
      const oscMain = ctx.createOscillator();
      const gainMain = ctx.createGain();
      oscMain.type = 'sine';
      oscMain.frequency.setValueAtTime(freq, startTime);

      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

      gainMain.gain.setValueAtTime(0.0001, startTime);
      gainMain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
      gainMain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      gainHarmonic.gain.setValueAtTime(0.0001, startTime);
      gainHarmonic.gain.linearRampToValueAtTime(peakGain * 0.22, startTime + 0.004);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.45);

      oscMain.connect(gainMain);
      gainMain.connect(ctx.destination);

      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(ctx.destination);

      oscMain.start(startTime);
      oscMain.stop(startTime + duration + 0.02);

      oscHarmonic.start(startTime);
      oscHarmonic.stop(startTime + duration * 0.5);
    };

    // Nota 1: Toque inicial cálido (B5 - 987.77 Hz)
    playBellStrike(987.77, now, 0.38, 0.18);

    // Nota 2: Resonancia cristalina ascendente (F#6 - 1479.98 Hz) a los 110ms
    playBellStrike(1479.98, now + 0.11, 0.72, 0.24);
  } catch {
    // Silencioso si el navegador restringe el audio
  }
};


// src/utils/soundAlerts.ts

export type SoundPreset = 
  | 'bell_classic' 
  | 'digital_chime' 
  | 'kitchen_buzzer' 
  | 'arcade_ping' 
  | 'two_tone_alert'
  | 'audio_file';

export interface SoundOption {
  id: SoundPreset;
  label: string;
  desc: string;
  icon: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'bell_classic', label: 'Classic Service Bell', desc: 'Resonant bronze counter bell ring', icon: '🛎️' },
  { id: 'digital_chime', label: 'Digital Order Chime', desc: 'Clean rising dual-frequency chime', icon: '✨' },
  { id: 'kitchen_buzzer', label: 'Grill Rush Buzzer', desc: 'Urgent square-wave alert for noisy kitchens', icon: '🚨' },
  { id: 'arcade_ping', label: 'Counter Cash Ping', desc: 'Crisp arcade-style high pickup tone', icon: '⚡' },
  { id: 'two_tone_alert', label: 'Double Pulse', desc: 'Punchy low-to-high double beep', icon: '🔔' },
  { id: 'audio_file', label: 'Custom File (/bell.wav)', desc: 'Static fallback audio file from public folder', icon: '📁' },
];

const STORAGE_KEY = 'pabee_sound_preset';

let audioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = []; // 👈 Tracks live nodes to prevent audio stacking

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// 🛑 Kill any sound currently vibrating the speaker
export function stopCurrentSound(): void {
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  });
  activeOscillators = [];
}

export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

export function getSavedSoundPreset(): SoundPreset {
  if (typeof window === 'undefined') return 'bell_classic';
  const saved = localStorage.getItem(STORAGE_KEY) as SoundPreset;
  return saved && SOUND_OPTIONS.some((o) => o.id === saved) ? saved : 'bell_classic';
}

export function saveSoundPreset(preset: SoundPreset): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, preset);
}

function registerOsc(osc: OscillatorNode): void {
  activeOscillators.push(osc);
  osc.onended = () => {
    activeOscillators = activeOscillators.filter((o) => o !== osc);
  };
}

function synthBell(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  registerOsc(osc1);
  registerOsc(osc2);

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(852, now);
  osc1.frequency.exponentialRampToValueAtTime(840, now + 0.8);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1704, now);
  osc2.frequency.exponentialRampToValueAtTime(1690, now + 0.5);

  gain.gain.setValueAtTime(0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.2);
  osc2.stop(now + 1.2);
}

function synthDigitalChime(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.08;

    registerOsc(osc);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.4);
  });
}

function synthKitchenBuzzer(ctx: AudioContext): void {
  const now = ctx.currentTime;
  [0, 0.18].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + offset;

    registerOsc(osc);

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, start);

    gain.gain.setValueAtTime(0.4, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.12);
  });
}

function synthArcadePing(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  registerOsc(osc);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(987.77, now);
  osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15);

  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.5);
}

function synthTwoTone(ctx: AudioContext): void {
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  registerOsc(osc1);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(600, now);
  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  registerOsc(osc2);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(900, now + 0.16);
  gain2.gain.setValueAtTime(0.4, now + 0.16);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.16);
  osc2.stop(now + 0.4);
}

export function playOrderAlert(customPreset?: SoundPreset): void {
  stopCurrentSound(); // 👈 Strictly ensures 1 sound at a time

  const preset = customPreset || getSavedSoundPreset();

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([150, 75, 150]);
  }

  if (preset === 'audio_file') {
    try {
      const audio = new Audio('/bell.wav');
      audio.play().catch(() => {
        const ctx = getAudioContext();
        if (ctx) synthBell(ctx);
      });
    } catch {
      const ctx = getAudioContext();
      if (ctx) synthBell(ctx);
    }
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  switch (preset) {
    case 'bell_classic':
      synthBell(ctx);
      break;
    case 'digital_chime':
      synthDigitalChime(ctx);
      break;
    case 'kitchen_buzzer':
      synthKitchenBuzzer(ctx);
      break;
    case 'arcade_ping':
      synthArcadePing(ctx);
      break;
    case 'two_tone_alert':
      synthTwoTone(ctx);
      break;
    default:
      synthBell(ctx);
  }
}
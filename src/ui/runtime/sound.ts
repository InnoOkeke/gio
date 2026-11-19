import { noteSchedule, type Tone } from './timeline';

const STORAGE_KEY = 'gio.sound';
const MASTER_GAIN = 0.25;

type AudioContextCtor = typeof AudioContext;

function contextClass(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Notes made on the device with Web Audio: no files, no downloads, no microphone.
 * Muting only silences the output. Timing and visuals never depend on it.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'off';
    } catch {
      this.muted = false;
    }
  }

  /** False when this browser has no Web Audio. The toggle is hidden then. */
  get available(): boolean {
    return contextClass() !== null;
  }

  get enabled(): boolean {
    return !this.muted;
  }

  set enabled(on: boolean) {
    this.muted = !on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      /* private mode: the setting lasts for this visit only */
    }
    if (!on) this.stop();
  }

  /** Create the audio context. Call from a pointer or key event so iOS allows it. */
  unlock(): void {
    const Ctor = contextClass();
    if (!Ctor) return;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.connect(this.ctx.destination);
      this.newMaster();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private newMaster(): void {
    if (!this.ctx || !this.compressor) return;
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(this.compressor);
  }

  /** Schedule the notes to start now. Rests and a muted engine make no sound. */
  play(tones: readonly Tone[]): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const base = ctx.currentTime + 0.02;
    for (const tone of noteSchedule(tones, base)) {
      if (tone.hz === null) continue;
      this.tone(ctx, master, tone.hz, tone.start, tone.audible);
    }
  }

  private tone(ctx: AudioContext, out: GainNode, hz: number, start: number, length: number): void {
    const attack = 0.008;
    const release = 0.06;
    const end = start + length;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(1, start + attack);
    env.gain.exponentialRampToValueAtTime(0.6, start + Math.max(attack * 2, Math.min(0.12, length * 0.4)));
    env.gain.setValueAtTime(0.6, Math.max(start + attack * 2, end - release));
    env.gain.linearRampToValueAtTime(0.0001, end);
    env.connect(out);

    const main = ctx.createOscillator();
    main.type = 'triangle';
    main.frequency.value = hz;
    main.connect(env);
    main.start(start);
    main.stop(end + 0.02);

    const upper = ctx.createOscillator();
    upper.type = 'sine';
    upper.frequency.value = hz * 2;
    const upperGain = ctx.createGain();
    upperGain.gain.value = 0.18;
    upper.connect(upperGain);
    upperGain.connect(env);
    upper.start(start);
    upper.stop(end + 0.02);
  }

  /** Hold the music with the paused turtle. */
  pause(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Fade out quickly and drop every note that has not played yet. */
  stop(): void {
    const ctx = this.ctx;
    const old = this.master;
    if (!ctx || !old) return;
    const now = ctx.currentTime;
    old.gain.cancelScheduledValues(now);
    old.gain.setValueAtTime(old.gain.value, now);
    old.gain.linearRampToValueAtTime(0, now + 0.03);
    window.setTimeout(() => old.disconnect(), 80);
    this.newMaster();
    if (ctx.state === 'suspended') void ctx.resume();
  }
}

export const sound = new SoundEngine();

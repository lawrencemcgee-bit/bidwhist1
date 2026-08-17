let ctx: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function playShuffle(volume: number): void {
  const ac = getCtx();
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);

  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 0.7);

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 1.2;

  const gain = ac.createGain();
  const now = ac.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.08);
  gain.gain.setValueAtTime(volume, now + 0.1);
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.65);

  src.connect(bp);
  bp.connect(gain);
  gain.connect(master);
  src.start(now);
}

export function playPlacement(volume: number): void {
  const ac = getCtx();
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(340, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.9, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.18);
}

export function playTrickWin(volume: number): void {
  const ac = getCtx();
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);

  const now = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  for (let i = 0; i < notes.length; i++) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = notes[i]!;
    const gain = ac.createGain();
    const start = now + i * 0.07;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.5, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.4);
  }
}

export function playBid(volume: number): void {
  const ac = getCtx();
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(440, now + 0.09);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function startAmbience(volume: number): () => void {
  const ac = getCtx();
  if (!ac) return () => undefined;

  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.linearRampToValueAtTime(volume * 0.12, ac.currentTime + 2);
  master.connect(ac.destination);

  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 2);
  src.loop = true;

  const lowpass = ac.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 320;

  src.connect(lowpass);
  lowpass.connect(master);
  src.start();

  return () => {
    const now = ac.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + 0.6);
    src.stop(now + 0.7);
  };
}

/**
 * 効果音と音声読み上げ
 * AudioContext は 1 つだけ作って使い回す（旧版は鳴らすたびに生成してリークしていた）。
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, durationMs: number, delayMs = 0, volume = 0.18, type: OscillatorType = 'sine'): void {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + delayMs / 1000;
  const end = start + durationMs / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(end);
}

export type SoundName = 'ready' | 'start' | 'stop' | 'alert' | 'record' | 'win' | 'lose' | 'select' | 'countdown';

export function playSound(name: SoundName): void {
  switch (name) {
    case 'ready':
      tone(660, 70);
      break;
    case 'start':
      tone(1000, 90);
      break;
    case 'stop':
      tone(800, 90);
      break;
    case 'alert':
      tone(1200, 140, 0, 0.22);
      break;
    case 'countdown':
      tone(880, 120, 0, 0.2, 'square');
      break;
    case 'select':
      tone(600, 120, 0, 0.12, 'square');
      break;
    case 'record':
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 140, i * 90, 0.16, 'triangle'));
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 180, i * 120, 0.16, 'triangle'));
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => tone(f, 220, i * 160, 0.14, 'sawtooth'));
      break;
  }
}

/** インスペクションの「8秒」「12秒」を読み上げる（非対応環境ではビープ） */
export function speak(text: string, lang: 'ja' | 'en'): boolean {
  if (typeof speechSynthesis === 'undefined') return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'ja' ? 'ja-JP' : 'en-US';
  u.rate = 1.2;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}

/** ユーザー操作を受けた最初のタイミングで呼び、自動再生制限を解除する */
export function unlockAudio(): void {
  audio();
}

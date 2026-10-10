/**
 * カメラ（ソルブの録画）
 * 映像は端末内の IndexedDB にのみ保存され、どこにも送信されない。
 */

let stream: MediaStream | null = null;
/** startCamera の世代。stopCamera で進め、取得中に止められた古い要求を無効にする */
let generation = 0;

interface Recording {
  recorder: MediaRecorder;
  chunks: Blob[];
}
/** 録画ごとにチャンクを分けて持つ（旧録画の停止処理が新録画のデータを消さないように） */
let current: Recording | null = null;

export function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export async function startCamera(): Promise<MediaStream> {
  if (stream) return stream;
  const myGeneration = ++generation;
  const acquired = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' },
    audio: false,
  });
  // 取得を待つ間に stopCamera（画面離脱など）が呼ばれていたら、遅れて得たカメラを即座に止める
  if (myGeneration !== generation) {
    acquired.getTracks().forEach((t) => t.stop());
    throw new DOMException('camera request was cancelled', 'AbortError');
  }
  stream = acquired;
  return stream;
}

export function stopCamera(): void {
  generation++;
  discardRecording();
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

export function currentStream(): MediaStream | null {
  return stream;
}

function pickMime(): string | undefined {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}

export function startRecording(): boolean {
  if (!stream || current) return false;
  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 600_000 });
  const rec: Recording = { recorder, chunks: [] };
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) rec.chunks.push(e.data);
  };
  recorder.start(500);
  current = rec;
  return true;
}

/**
 * 録画を止めて動画を返す（録画していなければ null）。
 * 呼び出した時点で current を外すため、停止処理の完了を待つ間に次の録画を始められる。
 */
export function stopRecording(): Promise<Blob | null> {
  const rec = current;
  current = null;
  if (!rec || rec.recorder.state === 'inactive') return Promise.resolve(null);
  return new Promise((resolve) => {
    rec.recorder.onstop = () => {
      resolve(rec.chunks.length ? new Blob(rec.chunks, { type: rec.recorder.mimeType || 'video/webm' }) : null);
    };
    rec.recorder.stop();
  });
}

/** 録画を破棄（試技の中断時） */
export function discardRecording(): void {
  const rec = current;
  current = null;
  if (rec && rec.recorder.state !== 'inactive') {
    rec.recorder.onstop = null;
    rec.recorder.stop();
  }
}

export function videoExtension(blob: Blob): string {
  return blob.type.includes('mp4') ? 'mp4' : 'webm';
}

/**
 * 設定（localStorage に保存。壊れた値は既定値で補う）
 */

import { signal, effect } from '@preact/signals';
import type { Precision } from './time';

export type Lang = 'ja' | 'en';
export type RunningDisplay = 'full' | 'tenths' | 'seconds' | 'hidden';
export type InspectionAlert = 'voice' | 'beep' | 'off';
export type InputMode = 'timer' | 'typing';
export type ScrambleView = '3D' | '2D' | 'off';

export interface Settings {
  lang: Lang;
  inspection: boolean;
  inspectionAlert: InspectionAlert;
  holdMs: number;
  sound: boolean;
  precision: Precision;
  runningDisplay: RunningDisplay;
  inputMode: InputMode;
  scrambleView: ScrambleView;
  /** 計測中は時計以外を隠す */
  focusMode: boolean;
  /** 新記録の演出 */
  celebrate: boolean;
}

const KEY = 'cct:settings';

export const DEFAULT_SETTINGS: Settings = {
  lang: typeof navigator !== 'undefined' && !navigator.language.startsWith('ja') ? 'en' : 'ja',
  inspection: true,
  inspectionAlert: 'voice',
  holdMs: 300,
  sound: true,
  precision: 2,
  runningDisplay: 'full',
  inputMode: 'timer',
  scrambleView: '3D',
  focusMode: true,
  celebrate: true,
};

const VALIDATORS: { [K in keyof Settings]: (v: unknown) => boolean } = {
  lang: (v) => v === 'ja' || v === 'en',
  inspection: (v) => typeof v === 'boolean',
  inspectionAlert: (v) => v === 'voice' || v === 'beep' || v === 'off',
  holdMs: (v) => typeof v === 'number' && v >= 0 && v <= 2000,
  sound: (v) => typeof v === 'boolean',
  precision: (v) => v === 2 || v === 3,
  runningDisplay: (v) => v === 'full' || v === 'tenths' || v === 'seconds' || v === 'hidden',
  inputMode: (v) => v === 'timer' || v === 'typing',
  scrambleView: (v) => v === '3D' || v === '2D' || v === 'off',
  focusMode: (v) => typeof v === 'boolean',
  celebrate: (v) => typeof v === 'boolean',
};

export function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(VALIDATORS) as (keyof Settings)[]) {
      const v = (raw as Record<string, unknown>)[key];
      if (VALIDATORS[key](v)) (out as unknown as Record<string, unknown>)[key] = v;
    }
  }
  return out;
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export const settings = signal<Settings>(load());

effect(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings.value));
  } catch {
    // プライベートモード等で保存できなくても動作は継続する
  }
});

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
}

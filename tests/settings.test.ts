import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/lib/settings';

describe('sanitizeSettings', () => {
  it('不正な値は既定値に戻す', () => {
    const s = sanitizeSettings({ holdMs: 99999, precision: 4, sound: 'yes', inspection: false, lang: 'en' });
    expect(s.holdMs).toBe(DEFAULT_SETTINGS.holdMs);
    expect(s.precision).toBe(DEFAULT_SETTINGS.precision);
    expect(s.sound).toBe(DEFAULT_SETTINGS.sound);
    expect(s.inspection).toBe(false);
    expect(s.lang).toBe('en');
  });

  it('null や文字列でも落ちない', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_SETTINGS);
  });
});

import type { ComponentChildren } from 'preact';
import { t } from '../i18n';
import { settings, updateSettings, type Settings } from '../lib/settings';
import { dialog } from '../state';
import { Dialog } from './Dialog';

function Row({ label, help, children }: { label: string; help?: string; children: ComponentChildren }) {
  return (
    <div class="setting">
      <div class="setting__text">
        <div class="setting__label">{label}</div>
        {help && <div class="setting__help">{help}</div>}
      </div>
      <div class="setting__control">{children}</div>
    </div>
  );
}

function Toggle({ k, label, help }: { k: keyof Settings; label: string; help?: string }) {
  const checked = settings.value[k] as boolean;
  return (
    <Row label={label} help={help}>
      <label class="switch">
        <input type="checkbox" checked={checked} onChange={(e) => updateSettings({ [k]: (e.target as HTMLInputElement).checked })} aria-label={label} />
        <span class="switch__track" aria-hidden="true" />
      </label>
    </Row>
  );
}

function Select<K extends keyof Settings>({ k, label, help, options }: { k: K; label: string; help?: string; options: [Settings[K], string][] }) {
  return (
    <Row label={label} help={help}>
      <select
        value={String(settings.value[k])}
        aria-label={label}
        onChange={(e) => {
          const raw = (e.target as HTMLSelectElement).value;
          const found = options.find(([v]) => String(v) === raw);
          if (found) updateSettings({ [k]: found[0] } as Partial<Settings>);
        }}
      >
        {options.map(([v, text]) => (
          <option key={String(v)} value={String(v)}>
            {text}
          </option>
        ))}
      </select>
    </Row>
  );
}

export function SettingsDialog() {
  const T = t.value;
  const S = T.settings;
  const s = settings.value;
  return (
    <Dialog open={dialog.value === 'settings'} title={`⚙ ${S.title}`} onClose={() => (dialog.value = null)}>
      <h3 class="dialog__section">{S.timer}</h3>
      <Toggle k="inspection" label={S.inspection} help={S.inspectionHelp} />
      <Select
        k="inspectionAlert"
        label={S.inspectionAlert}
        options={[
          ['voice', S.alertVoice],
          ['beep', S.alertBeep],
          ['off', S.alertOff],
        ]}
      />
      <Row label={`${S.holdMs}: ${(s.holdMs / 1000).toFixed(2)}s`} help={S.holdHelp}>
        <input
          type="range"
          min={0}
          max={1000}
          step={50}
          value={s.holdMs}
          aria-label={S.holdMs}
          onInput={(e) => updateSettings({ holdMs: Number((e.target as HTMLInputElement).value) })}
        />
      </Row>
      <Select
        k="inputMode"
        label={S.inputMode}
        options={[
          ['timer', S.inputTimer],
          ['typing', S.inputTyping],
        ]}
      />

      <h3 class="dialog__section">{S.display}</h3>
      <Select
        k="precision"
        label={S.precision}
        options={[
          [2, S.precision2],
          [3, S.precision3],
        ]}
      />
      <Select
        k="runningDisplay"
        label={S.runningDisplay}
        options={[
          ['full', S.runningFull],
          ['tenths', S.runningTenths],
          ['seconds', S.runningSeconds],
          ['hidden', S.runningHidden],
        ]}
      />
      <Toggle k="focusMode" label={S.focusMode} />
      <Select
        k="scrambleView"
        label={S.scrambleView}
        options={[
          ['3D', S.view3D],
          ['2D', S.view2D],
          ['off', S.viewOff],
        ]}
      />

      <h3 class="dialog__section">{S.other}</h3>
      <Toggle k="sound" label={S.sound} />
      <Toggle k="celebrate" label={S.celebrate} />
      <Select
        k="lang"
        label={S.language}
        options={[
          ['ja', '日本語'],
          ['en', 'English'],
        ]}
      />

      <h3 class="dialog__section">🔒 {S.privacy}</h3>
      <p class="dialog__note">{S.privacyText}</p>
    </Dialog>
  );
}

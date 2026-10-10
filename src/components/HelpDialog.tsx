import { t } from '../i18n';
import { dialog } from '../state';
import { Dialog } from './Dialog';

export function HelpDialog() {
  const H = t.value.help;
  return (
    <Dialog open={dialog.value === 'help'} title={`? ${H.title}`} onClose={() => (dialog.value = null)} wide>
      <h3 class="dialog__section">{H.usage}</h3>
      <ol class="help-list">
        {H.usageItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>

      <h3 class="dialog__section">{H.shortcuts}</h3>
      <dl class="kv">
        {H.shortcutItems.map(([k, v]) => (
          <div key={k}>
            <dt>
              <kbd>{k}</kbd>
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h3 class="dialog__section">{H.notation}</h3>
      <p class="dialog__note">{H.notationIntro}</p>
      <dl class="kv kv--notation">
        {H.notationItems.map(([k, v]) => (
          <div key={k}>
            <dt>
              <code>{k}</code>
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h3 class="dialog__section">{H.terms}</h3>
      <dl class="kv">
        {H.termItems.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h3 class="dialog__section">{H.facts}</h3>
      <ul class="help-list help-list--facts">
        {H.factItems.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <h3 class="dialog__section">{H.about}</h3>
      <p class="dialog__note">{H.aboutText}</p>
      <p class="dialog__note">
        <a href="https://github.com/cubing/cubing.js" target="_blank" rel="noopener noreferrer">
          cubing.js
        </a>{' '}
        (MPL-2.0) · v{__APP_VERSION__}
      </p>
    </Dialog>
  );
}

import { useEffect, useState } from 'preact/hooks';
import { t } from './i18n';
import { settings } from './lib/settings';
import { warmUp } from './lib/scramble';
import { currentEvent, dialog, ready, storageError, view } from './state';
import { Battle } from './components/Battle';
import { Confetti, Toasts } from './components/Celebration';
import { Header } from './components/Header';
import { HelpDialog } from './components/HelpDialog';
import { SessionsDialog } from './components/SessionsDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { SolveDialog } from './components/SolveDialog';
import { StatsDialog } from './components/StatsDialog';
import { TimeAttack } from './components/TimeAttack';
import { TitleScreen } from './components/TitleScreen';

export function App() {
  const T = t.value;
  const v = view.value;
  const [updateReady, setUpdateReady] = useState<null | (() => void)>(null);

  // 言語に合わせて <html lang> を切り替える
  useEffect(() => {
    document.documentElement.lang = settings.value.lang;
  }, [settings.value.lang]);

  // 起動直後から現在の種目のスクランブル生成器を温めておく
  useEffect(() => {
    if (ready.value) warmUp(currentEvent.value);
  }, [ready.value]);

  // PWA: 新しいバージョンが配信されたら更新を促す
  useEffect(() => {
    if (import.meta.env.DEV) return;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      const update = registerSW({
        onNeedRefresh: () => setUpdateReady(() => () => void update(true)),
      });
    });
  }, []);

  // ブラウザの「戻る」でタイトルに戻れるようにする
  useEffect(() => {
    const onPop = () => {
      if (view.value !== 'title') view.value = 'title';
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    if (v !== 'title' && history.state?.view !== v) history.pushState({ view: v }, '');
  }, [v]);

  return (
    <div class={`app view-${v}`}>
      <div class="bg" aria-hidden="true">
        <div class="bg__grid" />
        <div class="bg__orb bg__orb--1" />
        <div class="bg__orb bg__orb--2" />
      </div>

      {v === 'title' && <TitleScreen />}
      {v === 'timer' && ready.value && (
        <>
          <Header />
          <TimeAttack active={dialog.value === null} />
        </>
      )}
      {v === 'battle' && <Battle active={dialog.value === null} />}

      {storageError.value && <div class="banner banner--error">{T.toast.storageError}</div>}
      {updateReady && (
        <div class="banner">
          {T.toast.updateReady}{' '}
          <button type="button" class="btn btn--primary" onClick={updateReady}>
            {T.toast.update}
          </button>
        </div>
      )}

      <SettingsDialog />
      <HelpDialog />
      <SessionsDialog />
      <StatsDialog />
      <SolveDialog />
      <Toasts />
      <Confetti />
    </div>
  );
}

import { useEffect, useState } from 'preact/hooks';
import { eventName, t } from '../i18n';
import { settings } from '../lib/settings';
import { formatSolve, type Penalty } from '../lib/time';
import { getVideo } from '../lib/db';
import { videoExtension } from '../lib/camera';
import { currentEvent, deleteSolve, openSolveId, showToast, solves, updateSolve } from '../state';
import { CubePreview } from './CubePreview';
import { Dialog } from './Dialog';

/** 記録の詳細・編集 */
export function SolveDialog() {
  const T = t.value;
  const id = openSolveId.value;
  const index = solves.value.findIndex((s) => s.id === id);
  const solve = index >= 0 ? solves.value[index] : undefined;
  const p = settings.value.precision;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    setComment(solve?.comment ?? '');
    setVideoUrl(null);
    if (!solve?.hasVideo) return;
    let url: string | null = null;
    let cancelled = false;
    void getVideo(solve.id).then((blob) => {
      if (!blob || cancelled) return;
      url = URL.createObjectURL(blob);
      setVideoUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // 記録が切り替わったときだけ読み直す
  }, [solve?.id, solve?.hasVideo]);

  const close = () => {
    if (solve && comment !== (solve.comment ?? '')) void updateSolve(solve.id, { comment: comment.slice(0, 500) });
    openSolveId.value = null;
  };

  const downloadVideo = async () => {
    if (!solve) return;
    const blob = await getVideo(solve.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solve-${index + 1}-${new Date(solve.date).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${videoExtension(blob)}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyText = async () => {
    if (!solve) return;
    const text = `${formatSolve(solve.time, solve.penalty, p)}   ${solve.scramble}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('info', T.scramble.copied);
    } catch {
      // クリップボード非対応環境では何もしない
    }
  };

  return (
    <Dialog open={!!solve} title={solve ? `#${index + 1}  ${formatSolve(solve.time, solve.penalty, p)}` : ''} onClose={close} wide>
      {solve && (
        <div class="solve-detail">
          <div class="solve-detail__main">
            <dl class="kv">
              <div>
                <dt>{T.solve.date}</dt>
                <dd>{new Date(solve.date).toLocaleString(settings.value.lang === 'ja' ? 'ja-JP' : 'en-US')}</dd>
              </div>
              <div>
                <dt>{T.solve.scramble}</dt>
                <dd class="mono">{solve.scramble || '-'}</dd>
              </div>
            </dl>

            <div class="field-block">
              <span class="field__label">{T.solve.penalty}</span>
              <div class="seg" role="group" aria-label={T.solve.penalty}>
                {(['none', '+2', 'dnf'] as Penalty[]).map((pen) => (
                  <button
                    key={pen}
                    type="button"
                    class={`seg__btn${solve.penalty === pen ? ' is-active' : ''}`}
                    aria-pressed={solve.penalty === pen}
                    onClick={() => void updateSolve(solve.id, { penalty: pen })}
                  >
                    {pen === 'none' ? T.penalty.ok : pen === '+2' ? '+2' : 'DNF'}
                  </button>
                ))}
              </div>
            </div>

            <label class="field-block">
              <span class="field__label">{T.solve.comment}</span>
              <textarea rows={2} maxLength={500} value={comment} onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)} />
            </label>

            {solve.hasVideo && (
              <div class="field-block">
                <span class="field__label">{T.solve.video}</span>
                {videoUrl ? <video class="solve-video" src={videoUrl} controls playsInline /> : <p class="dialog__note">{T.common.loading}</p>}
                <button type="button" class="btn" onClick={() => void downloadVideo()}>
                  ⇩ {T.solve.downloadVideo}
                </button>
              </div>
            )}

            <div class="button-row">
              <button type="button" class="btn" onClick={() => void copyText()}>
                ⧉ {T.solve.copyText}
              </button>
              <button
                type="button"
                class="btn btn--danger"
                onClick={() => {
                  if (window.confirm(T.history.deleteConfirm)) void deleteSolve(solve.id);
                }}
              >
                🗑 {T.common.delete}
              </button>
            </div>
          </div>
          {solve.scramble && (
            <div class="solve-detail__preview">
              <CubePreview event={currentEvent.value} scramble={solve.scramble} visualization="3D" />
              <small>{eventName(currentEvent.value)}</small>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

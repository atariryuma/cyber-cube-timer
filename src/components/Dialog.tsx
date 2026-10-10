import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { t } from '../i18n';

interface Props {
  open: boolean;
  title: ComponentChildren;
  onClose(): void;
  wide?: boolean;
  children: ComponentChildren;
}

/**
 * ネイティブ <dialog> を使ったモーダル。
 * Esc・フォーカス管理・背面の操作無効化はブラウザ標準の挙動に任せる。
 */
export function Dialog({ open, title, onClose, wide, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      class={`dialog${wide ? ' dialog--wide' : ''}`}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // 背景（dialog 要素自身）のクリックで閉じる
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div class="dialog__inner">
          <header class="dialog__header">
            <h2>{title}</h2>
            <button type="button" class="icon-btn" onClick={onClose} aria-label={t.value.common.close}>
              ✕
            </button>
          </header>
          <div class="dialog__body">{children}</div>
        </div>
      )}
    </dialog>
  );
}

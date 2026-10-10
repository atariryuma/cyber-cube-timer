# Cyber Cube Timer — プロジェクト固有の指示

> 共通規約（日本語・コミット規約・PII 保護・配信 / 破壊操作のゲート）はグローバル `~/.claude/CLAUDE.md` に従う。
> ここにはこのリポジトリ固有の差分だけを書く。

## 概要

Vite + TypeScript + Preact の静的サイト。GitHub Pages（`https://atariryuma.github.io/cyber-cube-timer/`）で公開。
サーバーは持たない。記録は利用者のブラウザ（IndexedDB / localStorage）にのみ保存し、外部送信する機能を足さないこと。

## コマンド

- `npm run check` … lint + 型検査 + テスト（コミット前に必ずゼロエラー）
- `npm run build` … `dist/` に出力（`tsc --noEmit` も実行される）
- `npm run dev` / `npm run preview`

## 設計上の約束

- ロジックは `src/lib/`（DOM 非依存・テストあり）、画面は `src/components/`、状態は `src/state.ts` に集約する。
- 文言は `src/i18n.ts` に日英両方を書く（`en` は `ja` と同じ形であることを型で強制している）。
- タイムは内部では常にミリ秒の number。DNF は `Infinity`。表示は WCA に合わせ単発は切り捨て、平均は四捨五入。
- `base: './'`（相対パス）でビルドする。絶対パス `/xxx` で静的ファイルを参照しない（Pages のサブパスで壊れる）。

## ⚠ 既知の落とし穴

- **cubing.js の Web Worker と Vite のプリロード補助関数**: 補助関数がアプリ本体のチャンクに入ると、
  Worker がアプリ本体（`document` 参照）を読み込んで起動に失敗し、スクランブルが一切出なくなる。
  `vite.config.ts` の `modulePreload: false` と `manualChunks`（preload-helper の分離）を外さないこと。
  変更したら `npm run build && npm run preview` で実際にスクランブルが出るか確認する。
- Service Worker（PWA）が古いビルドを返すため、`preview` で確認するときは DevTools で SW を解除してから再読み込みする。
- 依存の更新は公開から 2 週間以上経ったバージョンを `--save-exact` で固定する。

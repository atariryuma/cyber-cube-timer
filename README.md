# CYBER CUBE TIMER v3

Eスポーツ風のスピードキューブタイマー。ブラウザだけで動き、インストール不要・オフライン対応。

**▶ 今すぐ使う: https://atariryuma.github.io/cyber-cube-timer/**

- WCA 公式スクランブラーと同じ方式の**ランダム状態スクランブル**（[cubing.js](https://github.com/cubing/cubing.js)）
- 全 13 種目に対応した **3D / 2D スクランブルプレビュー**（1 手ずつ再生可能）
- WCA 規則どおりの **インスペクション（+2 / DNF 自動判定）** と Ao5 / Ao12 / Mo3 / Ao50 / Ao100
- 1 手ずつ言葉・色・矢印・3D で案内する **スクランブル手順ガイド**（WCA 公式と同じく展開図で答え合わせ）
- 10 段階の CPU と競う **バトルモード**
- 記録・動画・設定は**すべて端末内（IndexedDB / localStorage）にのみ保存**。外部送信なし

## 主な機能

| 分類 | 内容 |
| --- | --- |
| 種目 | 2x2〜7x7、3x3 片手・目隠し、ピラミンクス、スキューブ、メガミンクス、スクエア1、クロック |
| タイマー | 長押しスタート（時間調整可）、インスペクション（8・12 秒の音声通知）、何かキーで停止、Esc で中断、手入力モード（スタックマット記録用） |
| 手順ガイド | 回転記号を「右の面（赤）を時計回りに 90°／手前の面の右の列が上へ」のように説明、3D アニメーション、WCA 規則に沿った種目別の持ち方、混ぜ終わりの展開図で答え合わせ。バトル開始時に自動表示（設定で切替可） |
| 統計 | ベスト / ワースト / 平均 / 標準偏差 / DNF 率、Mo3・Ao5・Ao12・Ao50・Ao100 の現在値と最良値、推移グラフ、分布ヒストグラム |
| 記録管理 | セッション（種目ごと）、+2 / DNF / コメント編集、新記録の演出、CSV 書き出し、JSON バックアップと復元、旧版 v2 の CSV 読み込み |
| バトル | 10 段階の CPU（種目ごとに難易度を自動調整）、勝利で次の相手を解放、勝敗・勝利時ベストを記録、CPU のソルブを 3D で再生 |
| その他 | カメラ録画（端末内保存）、PWA（ホーム画面に追加・オフライン動作）、日本語 / 英語、スマホ・タブレット対応、画面スリープ防止 |

## 操作方法

1. **スペースキー**（スマホは画面）を長押しし、数字が**緑**になったら離す → インスペクション開始
2. もう一度長押し → 離すと計測開始。**何かキー**を押すと停止
3. 停止後に表示される `OK / +2 / DNF` でペナルティを付ける。履歴の行をクリックすると詳細編集

| キー | 動作 |
| --- | --- |
| `Space` | タイマー操作 |
| `Esc` | インスペクション・計測の中断／ダイアログを閉じる |
| `N` | 次のスクランブル（待機中） |
| `Alt+2` / `Alt+D` / `Alt+O` | 直前の記録を +2 / DNF / OK に |
| `Alt+Z` | 直前の記録を削除 |
| `Enter` / `B` | タイトル画面でタイムアタック / バトル開始 |

## 開発

Node.js 22.3 以上が必要です。

```bash
npm install
npm run dev        # 開発サーバー http://localhost:5173
npm run check      # lint + 型検査 + テスト
npm run build      # dist/ に本番ビルド
npm run preview    # ビルド結果の確認
```

### 技術構成

- [Vite](https://vite.dev/) + TypeScript + [Preact](https://preactjs.com/)（Signals で状態管理）
- [cubing.js](https://github.com/cubing/cubing.js) — スクランブル生成（Web Worker）・3D 表示
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — Service Worker によるオフライン対応
- [Vitest](https://vitest.dev/) — 統計・タイマー状態機械・DB・CSV/バックアップ・バトル判定のテスト

```
src/
├── lib/            DOM に依存しないロジック（テスト対象）
│   ├── stats.ts         WCA 方式の平均計算・新記録判定
│   ├── timerMachine.ts  タイマーの状態機械（インスペクション・ペナルティ）
│   ├── time.ts          タイム整形・手入力の解析
│   ├── db.ts            IndexedDB（sessions / solves / videos）
│   ├── backup.ts        JSON バックアップ・CSV 入出力
│   ├── battle.ts        CPU 対戦（ティア・タイム生成・戦績）
│   ├── scramble.ts      cubing.js によるスクランブル生成と先読み
│   └── events.ts, settings.ts, sound.ts, camera.ts
├── components/     画面（Preact）
├── state.ts        アプリ状態とアクション
├── i18n.ts         日本語 / 英語の文言
└── styles/main.css
tests/              Vitest
```

### デプロイ

`main` ブランチへの push で GitHub Actions が lint・型検査・テスト・ビルドを行い、GitHub Pages に公開します（`.github/workflows/deploy.yml`）。
リポジトリの Settings → Pages → Source を **GitHub Actions** にしておく必要があります。

## v2 からの主な変更

- Flask サーバーを廃止し、完全な静的サイト化（GitHub Pages で公開可能に）
- スクランブルを「ランダムな手順」から **WCA 方式のランダム状態** に変更。全 13 種目に対応
- 3D 表示を 3x3 固定から全種目対応に（4x4 なのに 3x3 で表示される問題を解消）
- WCA 規則に沿った平均計算（DNF の扱い、Ao50/100 の 5% 除外、平均の四捨五入・単発の切り捨て）
- バトルモードの不具合を修正（読み込みのたびに戦績が消える、引き分けが負け扱い、ギブアップ後に二重判定、再戦時に前回のタイムが残る など）
- 動画を記録本体から分離し、履歴の読み込みを高速化
- セッション管理・バックアップ / 復元・手入力モード・英語対応・PWA を追加
- テスト（Vitest）と CI を追加

## ライセンス

[MIT](LICENSE)。スクランブル生成と 3D 表示には [cubing.js](https://github.com/cubing/cubing.js)（MPL-2.0 / GPL-3.0+）を利用しています。

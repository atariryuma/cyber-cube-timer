# CYBER CUBE TIMER

Eスポーツ風のルービックキューブタイマーWebアプリケーション

## 特徴

### コアメイン機能
- **高精度タイマー**: ミリ秒単位の正確な計測
- **WCA準拠スクランブル**: 2x2x2、3x3x3、4x4x4対応
- **インスペクション機能**: 15秒カウントダウン、+2/DNFペナルティ自動判定
- **統計機能**: Ao5、Ao12、ベストタイムの自動計算
- **記録管理**: IndexedDBによるオフライン対応データ永続化
- **グラフ表示**: タイムの推移をリアルタイムで可視化
- **CSVエクスポート**: データのバックアップと分析

### UI/UXデザイン
- **サイバーパンク風デザイン**: ネオンカラーとグロー効果
- **レスポンシブ対応**: デスクトップ、タブレット、モバイル
- **アニメーション**: スムーズなトランジションとエフェクト
- **アチーブメント通知**: 新記録達成時の演出
- **音声フィードバック**: スタート/ストップ時のビープ音

## スクリーンショット

```
┌─────────────────────────────────────────┐
│  CYBER CUBE  [SESSION] [CUBE] [SETTINGS]│
├─────────────────────────────────────────┤
│  🔀 SCRAMBLE                            │
│  R U R' U' F2 D' B2 L' F R2...         │
├─────────────────────────────────────────┤
│                                         │
│           ⏱️  12.345                   │
│                                         │
│      [ SPACE キーで START ]             │
├──────────────┬──────────────────────────┤
│ 📊 STATISTICS│  📜 TIME HISTORY         │
│ SINGLE 12.34 │  #001  13.45  [+2]      │
│ Ao5    14.56 │  #002  12.34  🏆        │
│ Ao12   15.23 │  #003  15.67            │
│              │  📈 TIME GRAPH          │
└──────────────┴──────────────────────────┘
```

## 技術スタック

### バックエンド
- **Python 3.10+**
- **Flask 3.0**: Webフレームワーク
- **Flask-CORS**: CORS対応

### フロントエンド
- **HTML5 / CSS3**: マークアップとスタイリング
- **JavaScript (Vanilla)**: ロジック実装
- **Chart.js 4.4**: グラフ描画
- **IndexedDB**: ブラウザ内データベース
- **Google Fonts**: Orbitron、Rajdhani、Inter、JetBrains Mono

### アーキテクチャ
- **MVC パターン**
- **RESTful API**
- **モジュール分離設計**

## インストール

### 必要要件
- Python 3.10以上
- 仮想環境（venv）

### セットアップ手順

1. **リポジトリのクローン**
```bash
cd cyber-cube-timer
```

2. **仮想環境の作成と有効化**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

3. **依存パッケージのインストール**
```bash
pip install -r requirements.txt
```

4. **アプリケーションの起動**
```bash
python run.py
```

5. **ブラウザでアクセス**
```
http://localhost:5000
```

## 使い方

### 基本操作

1. **タイマーの開始**
   - スペースキーを長押し（赤→緑に変化）
   - キーを離すとスタート
   - インスペクション有効時は15秒カウントダウンが開始

2. **タイマーの停止**
   - スペースキーを押す
   - タイムが自動保存される
   - 新しいスクランブルが生成される

3. **ペナルティの追加**
   - 記録の「+2」ボタン: +2秒ペナルティ
   - 記録の「DNF」ボタン: Did Not Finish

4. **統計の確認**
   - 左パネルで現在の統計を確認
   - グラフで推移を可視化

5. **データのエクスポート**
   - 「EXPORT CSV」ボタンでCSVダウンロード

### キーボードショートカット

- **Space**: タイマー開始/停止
- **Esc**: 設定モーダルを閉じる

### 設定項目

- **インスペクション有効**: 15秒の観察時間
- **音声アラート有効**: ビープ音の再生
- **長押しスタート**: 0.3秒長押しで準備完了
- **タイマートリガー**: スペースキー/タッチ/両方

## プロジェクト構造

```
cyber-cube-timer/
├── app/
│   ├── __init__.py          # Flaskアプリ初期化
│   ├── routes.py            # ルーティング定義
│   ├── scramble.py          # スクランブル生成ロジック
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css    # Eスポーツ風CSS
│   │   └── js/
│   │       ├── app.js       # メインアプリケーション
│   │       ├── timer.js     # タイマー機能
│   │       ├── database.js  # IndexedDB操作
│   │       ├── statistics.js # 統計計算
│   │       └── graph.js     # グラフ描画
│   └── templates/
│       └── index.html       # メインHTML
├── run.py                   # アプリケーションエントリーポイント
├── requirements.txt         # Python依存パッケージ
└── README.md               # このファイル
```

## API仕様

### GET /api/scramble

新しいスクランブルを生成

**クエリパラメータ:**
- `type`: キューブタイプ（`2x2x2`, `3x3x3`, `4x4x4`）デフォルト: `3x3x3`

**レスポンス:**
```json
{
  "success": true,
  "scramble": "R U R' U' F2 D' B2 L' F R2 U B' D L",
  "cube_type": "3x3x3"
}
```

### GET /api/health

ヘルスチェック

**レスポンス:**
```json
{
  "status": "healthy",
  "service": "Cyber Cube Timer API"
}
```

## データベース構造

### IndexedDB: `CyberCubeTimer`

**Object Store: `times`**

| フィールド | 型 | 説明 |
|----------|-----|------|
| id | number | 自動生成ID |
| time | number | タイム（ミリ秒） |
| penalty | number | ペナルティ（0 or 2000） |
| dnf | boolean | DNFフラグ |
| scramble | string | スクランブル文字列 |
| cubeType | string | キューブタイプ |
| session | string | セッション名 |
| timestamp | number | タイムスタンプ |

## カスタマイズ

### カラースキームの変更

`app/static/css/style.css`の`:root`セクションを編集:

```css
:root {
    --neon-cyan: #00f5ff;
    --neon-magenta: #ff00ff;
    --neon-yellow: #ffed4e;
    /* 他のカラー変数... */
}
```

### スクランブル長の調整

`app/scramble.py`の各生成関数のデフォルト値を変更:

```python
@staticmethod
def generate_3x3(length=20):  # 長さを変更
    # ...
```

## トラブルシューティング

### ポート5000が使用中
```bash
# run.pyで別のポートを指定
app.run(debug=True, host='0.0.0.0', port=8000)
```

### データが保存されない
- ブラウザのIndexedDBが有効か確認
- プライベートブラウジングモードでは動作しない場合があります
- ブラウザの開発者ツールでエラーを確認

### スクランブルが表示されない
- サーバーが起動しているか確認
- ブラウザのコンソールでエラーメッセージを確認
- `/api/health`にアクセスしてAPIが動作しているか確認

## 今後の拡張予定

- [ ] ユーザー認証機能
- [ ] オンラインランキング
- [ ] バーチャル3Dキューブ
- [ ] 複数キューブタイプ対応拡張（Pyraminx、Megaminx等）
- [ ] ソルブの手順記録（reconstruction）
- [ ] TPS（Turns Per Second）計算
- [ ] モバイルアプリ化（PWA）

## ライセンス

このプロジェクトはMITライセンスの元で公開されています。

## 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずIssueを開いて変更内容を議論してください。

## 作者

Cyber Cube Timer Development Team

## 謝辞

- スピードキューブコミュニティの皆様
- WCA（World Cube Association）
- Chart.jsチーム
- Flaskフレームワーク開発者

---

**楽しいスピードキューブライフを！**

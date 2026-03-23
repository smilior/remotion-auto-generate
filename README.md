# Remotion Auto Generate

Claude Codeに「動画作って」と話しかけるだけで、技術Tipsのショート動画を自動生成するパイプライン。

## デモ

ターミナル風の画面にコマンドがタイプされていき、ナレーションと字幕が同期するショート動画を生成します。

```
$ claude
> Git の時短コマンドについてのTips動画を作って

→ 約2分後、ナレーション + 字幕 + BGM付きの動画が完成
```

## パイプライン

```
テキスト指示
  ↓
① ナレーション原稿作成（Claude AI）
  ↓
② 音声生成（Gemini TTS 2.5 Flash）
  ↓
③ SRT字幕生成（ローカル Whisper）
  ↓
④ 動画レンダリング（Remotion）
  ↓
⑤ BGMミックス（ffmpeg）
  ↓
MP4出力
```

## 技術スタック

- **Remotion** — Reactで動画をコードとして記述・レンダリング
- **Gemini TTS 2.5 Flash** — 日本語ナレーション音声合成
- **Whisper** — ローカル音声認識でタイムスタンプ付きSRT字幕生成
- **ffmpeg** — ナレーション + BGMミックス
- **Claude Code** — パイプライン全体のオーケストレーション

## セットアップ

### 前提条件

- Node.js v18+
- ffmpeg (`brew install ffmpeg`)
- Python 3 + Whisper (`pip3 install openai-whisper`)
- Gemini API Key ([Google AI Studio](https://aistudio.google.com/)で取得)

### インストール

```bash
git clone https://github.com/smilior/remotion-auto-generate.git
cd remotion-auto-generate
npm install
```

### 環境変数

```bash
cp .env.example .env
# .env に GEMINI_API_KEY を設定
```

### プレビュー

```bash
npm run preview
```

`http://localhost:3000` でRemotionプレビューが開きます。

## 使い方

### 手動実行

```bash
# 1. TTS音声生成
npx tsx scripts/generate-tts.ts

# 2. SRT字幕生成
bash scripts/generate-srt.sh

# 3. 動画レンダリング
npm run render

# 4. BGMミックス
bash scripts/mix-bgm.sh

# 5. 完成動画を確認
open output/final.mp4
```

### Claude Codeで自動実行

Claude Codeのスキル（`.claude/skills/generate-video/`）が設定済みであれば、チャットで指示するだけで全ステップが自動実行されます。

```
> Docker の便利コマンドについてのTips動画を作って
```

## プロジェクト構成

```
remotion-auto-generate/
├── src/
│   ├── Video.tsx                # メインコンポジション
│   ├── constants.ts             # 動画設定・ブランドカラー
│   ├── srt-data.ts              # 字幕データ
│   ├── scenes/
│   │   ├── TitleScene.tsx       # タイトル画面
│   │   ├── TerminalScene.tsx    # ターミナル風本編
│   │   └── EndingScene.tsx      # エンディング
│   └── components/
│       ├── SmiliorLogo.tsx      # ブランドロゴ
│       ├── Typewriter.tsx       # タイプライター演出
│       └── Subtitle.tsx         # 字幕オーバーレイ
├── scripts/
│   ├── generate-tts.ts          # Gemini TTS音声生成
│   ├── generate-srt.sh          # Whisper字幕生成
│   └── mix-bgm.sh              # ffmpeg BGMミックス
├── bgm/                         # BGM素材
├── public/                      # Remotion静的ファイル
├── output/                      # 生成物（.gitignore）
├── docs/                        # 要件定義
├── mockup/                      # HTMLモックアップ
├── .claude/skills/generate-video/  # Claude Codeスキル
└── note.md                      # 開発記事
```

## 動画仕様

- 解像度: 1080×1920（9:16 縦型）
- コーデック: H.264 + AAC
- フレームレート: 30fps
- ブランドカラー: `#F2994A`（smilior orange）

## ライセンス

MIT

## Author

[smilior.com](https://smilior.com) — Share the smile of discovery

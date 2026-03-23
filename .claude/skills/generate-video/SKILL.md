---
name: generate-video
description: |
  smilior.comブランドのAI Driven Dev Tipsショート動画を自動生成する。
  Remotion + Gemini TTS + Whisper + ffmpegのパイプラインで、テキスト指示から
  ナレーション付き縦型動画（9:16）を生成する。

  トリガー: 「動画を作って」「Tips動画」「ショート動画」「generate video」
  「動画生成」「新しい動画」「別の動画」、またはremotionプロジェクトでの動画作成タスク。
---

# smilior Tips動画生成パイプライン

プロジェクト: `/Users/masa/dev/remotion-auto-generate`

## 自動パイプライン（推奨）

configファイルを作成して1コマンドで動画生成:

```bash
npx tsx scripts/pipeline.ts --config config/sample-git.json
```

pipeline.tsが以下を自動実行する:
1. TTS音声生成（Gemini API）
2. SRT字幕生成（Whisper）
3. SRT誤認識修正 + Tip表示フレーム自動計算
4. ソースファイル一括更新（constants.ts, TitleScene, TerminalScene, srt-data）
5. 型チェック + Remotionレンダリング
6. BGMミックス（尺自動検出）

### configファイルの形式

`config/` ディレクトリにJSONを作成:

```json
{
  "title": { "main": "Git", "sub": "時短コマンド 5選" },
  "command": "git --tips",
  "tips": [
    { "key": "git stash", "desc": "作業を一時退避" },
    { "key": "git log --oneline", "desc": "履歴を一行表示" },
    { "key": "git diff --staged", "desc": "ステージ済みの差分確認" },
    { "key": "git commit --amend", "desc": "直前のコミットを修正" },
    { "key": "git switch -", "desc": "前のブランチに戻る" }
  ],
  "narration": "Gitの時短コマンド、5つ紹介します。...",
  "bgm": "paulyudin-minimal-164833.mp3"
}
```

### Claude Codeでの使い方

ユーザーがトピックを指示したら:
1. configファイルを生成（title, command, tips, narration, bgmを設計）
2. `npx tsx scripts/pipeline.ts --config <path>` を実行
3. `output/final.mp4` を確認

---

## 手動パイプライン（参考）

自動パイプラインで問題が出た場合のステップバイステップ手順:

## Step 1: コンテンツ設計

ユーザーのトピック指示から以下を決定する:

- **タイトル**: 2行（メイン + サブ）。例: "Claude Code" + "ショートカットキー 5選"
- **ターミナルコマンド**: タイプライター演出用。例: "claude --shortcuts"
- **Tips 5項目**: `{ key, desc }` 形式。keyは短く、descは説明
- **ナレーション原稿**: 約20-40秒で読める分量。各Tipに言及する順序を意識

## Step 2: ソースファイル更新

以下の4ファイルを編集する:

### `src/constants.ts` — 動画の尺

ナレーション音声の長さに応じて調整:

```
DURATION_IN_SECONDS = タイトル3秒 + ナレーション秒数 + エンディング5秒
TERMINAL_END = VIDEO_FPS * (3 + ナレーション秒数)
```

### `src/scenes/TitleScene.tsx` — タイトル

3箇所を変更:
- メインタイトル（h1テキスト）
- サブタイトル（pテキスト）
- ターミナルプロンプト表示テキスト

### `src/scenes/TerminalScene.tsx` — 本編

3箇所を変更:
- `TIPS` 配列（5項目の `{ key, desc }`）
- `Typewriter` の `text` prop
- `tipStartFrames` 配列（Step 5で同期後に設定）

### `src/srt-data.ts` — 字幕データ

Step 4のSRT生成後に更新する（Step 5で実施）。

## Step 3: TTS音声生成

`scripts/generate-tts.ts` のナレーション原稿部分を差し替えて実行:

```bash
npx tsx scripts/generate-tts.ts
```

**API仕様:**
- エンドポイント: `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`
- APIキー: `.env` の `GEMINI_API_KEY`
- ボイス: `Kore`（落ち着いたプロフェッショナルトーン）
- プロンプト先頭に「落ち着いた、プロフェッショナルなトーンで読んでください:」を付与
- 出力: PCM 24kHz → ffmpegでWAV変換
- WAVを `output/narration.wav` と `public/narration.wav` の両方に配置

## Step 4: SRT字幕生成

```bash
bash scripts/generate-srt.sh
```

Whisper（smallモデル、日本語）で `output/narration.srt` を生成。

**注意**: TTS再生成のたびにタイムスタンプが変わるため、必ず同じ音声ファイルからSRTを生成すること。

## Step 5: SRTデータ更新 + Tip表示フレーム同期

**最も重要なステップ。** 音声・字幕・画面のTip表示を正確に同期させる。

### 5-1: `src/srt-data.ts` を更新

`output/narration.srt` の内容をコピーし、Whisper認識ミスを手動修正:
- 「いちつ」→「5つ」
- 「仮上書き」→「箇条書き」
- 「フューショット」→「Few-shot」
- 「チェーンオブソート」→「Chain of Thought」
- その他、専門用語の誤認識を目視確認

### 5-2: Tip表示フレームを計算

SRTから各Tipが**初めて言及される**セグメントの開始秒を特定し、フレーム番号を計算:

```
フレーム = Math.round(秒数 × 30)
```

`TerminalScene.tsx` で更新する箇所:
1. `tipStartFrames` 配列 — 5つのフレーム番号
2. カーソル表示の `frame >` 閾値 — 最後のTipフレーム + 約20

**例**: SRTで Tip1 が 5.18秒に言及 → `tipStartFrames[0] = 155`

## Step 6: Remotionレンダリング

```bash
npx remotion render src/index.ts SmiliorTips --output output/video.mp4
```

## Step 7: BGMミックス

```bash
bash scripts/mix-bgm.sh
```

BGM一覧（`bgm/` ディレクトリ）:
- `paulyudin-minimal-164833.mp3` — ミニマル、テック系向き
- `paulyudin-chill-silent-bloom-chill-481864.mp3` — チル系

BGM変更時は `scripts/mix-bgm.sh` の `BGM=` パスを変更。
動画の尺が30秒以外の場合は `atrim` と `afade` のパラメータも調整。

## 出力

`output/final.mp4` が最終動画。`open output/final.mp4` で確認。

## ブランド仕様

| 項目 | 値 |
|------|-----|
| ブランド名 | smilior（smile + similar） |
| カラー | `#F2994A`（オレンジ） |
| フォント | Inter + JetBrains Mono + Noto Sans JP |
| タグライン | Share the smile of discovery |
| 動画形式 | 1080×1920（9:16）、H.264 + AAC |

# Claude Codeに「動画作って」と言うだけで、技術Tipsのショート動画が自動生成される仕組みを作った

## はじめに

「技術Tipsのショート動画を量産したい。でも動画編集は面倒……」

そんな課題を、**Claude Codeに話しかけるだけ**で解決する仕組みを作りました。

```
自分: 「Gitの時短コマンドについてのTips動画を作って」

Claude Code: （ナレーション生成 → 音声合成 → 字幕生成 → 動画レンダリング → BGMミックス）

→ 約2分後、完成した動画が手元に。
```

この記事では、このパイプラインの全体像から、実装で工夫したこと、ハマったポイントまで、すべて公開します。同じことをやりたい方は、この記事を見ながら再現できるはずです。

---

## 完成した動画のイメージ

ターミナル風の画面にコマンドがタイプされていき、ナレーションと字幕が同期するスタイルです。

- 解像度: 1080×1920（9:16 縦型、X/TikTok向け）
- 尺: 30秒〜1分程度
- ナレーション + 字幕 + BGM付き
- ブランドロゴ・CTAも自動で入る

---

## 技術スタック

このプロジェクトでは、5つの技術を組み合わせています。

**Remotion（動画レンダリング）**
Reactで動画を作れるフレームワークです。「動画をコードで書く」という発想がポイントで、テンプレートを一度作れば、テキストを差し替えるだけで何本でも動画を量産できます。

**Gemini TTS 2.5 Flash（音声合成）**
Googleの最新TTSモデルです。日本語の自然さが他のTTSと比べて頭一つ抜けています。APIキーがあれば無料枠で使えます。

**Whisper（字幕生成）**
OpenAIの音声認識モデルをローカルで実行します。生成した音声からタイムスタンプ付きのSRT字幕を自動生成します。APIキー不要で、完全にローカルで動きます。

**ffmpeg（BGMミックス）**
ナレーション音声にBGMを重ねる工程で使います。フェードイン・フェードアウトも自動です。

**Claude Code（オーケストレーション）**
これが司令塔です。「動画作って」と言うだけで、上記すべてを順番に実行してくれます。Claude Codeのスキル機能を使って、パイプラインの手順を記憶させています。

---

## パイプラインの全体像

動画が完成するまでの流れは、7つのステップです。

```
Step 1: コンテンツ設計
    タイトル、Tips 5項目、ナレーション原稿を決める

Step 2: ソースコード更新
    Remotionのコンポーネントにコンテンツを反映

Step 3: TTS音声生成
    Gemini APIでナレーション音声を生成

Step 4: SRT字幕生成
    Whisperで音声からタイムスタンプ付き字幕を生成

Step 5: 同期調整 ← ここが一番大事
    音声・字幕・画面のTip表示タイミングを合わせる

Step 6: Remotionレンダリング
    MP4動画として書き出し

Step 7: BGMミックス
    ffmpegでBGMを重ねて完成
```

---

## 実装の詳細

### Remotionプロジェクトの構成

動画は3つのシーンで構成しています。

**TitleScene（0〜3秒）**
ブランドロゴ、カテゴリ表示、タイトルがフェードインします。ターミナル風のプロンプト表示もあって、開発者の目を引くデザインにしました。

**TerminalScene（3秒〜本編終了）**
メインパートです。黒背景のターミナルウィンドウに、コマンドがタイプライター演出で表示されます。ナレーションに合わせて、各Tipが順番にフェードインしていきます。

**EndingScene（最後の5秒）**
ブランドロゴ、ドメイン、フォローCTAを表示するエンディングです。

```
src/
├── Video.tsx           # 3シーンの構成 + 音声 + 字幕
├── constants.ts        # 動画の尺、シーン区切り、ブランドカラー
├── srt-data.ts         # 字幕データ（インライン）
├── scenes/
│   ├── TitleScene.tsx
│   ├── TerminalScene.tsx
│   └── EndingScene.tsx
└── components/
    ├── SmiliorLogo.tsx  # ブランドロゴ
    ├── Typewriter.tsx   # タイプライター演出
    └── Subtitle.tsx     # 字幕オーバーレイ
```

### Gemini TTS 2.5 Flashの使い方

Gemini TTSはREST APIで簡単に呼び出せます。ポイントは、テキストの先頭に読み上げスタイルの指示を付けること。

```typescript
const body = {
  contents: [{
    parts: [{
      text: `落ち着いた、プロフェッショナルなトーンで読んでください: ${narrationText}`,
    }],
  }],
  generationConfig: {
    responseModalities: ['AUDIO'],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Kore',  // 30種類のボイスから選べる
        },
      },
    },
  },
};
```

レスポンスはBase64エンコードされたPCMデータで返ってくるので、ffmpegでWAVに変換します。

```bash
ffmpeg -y -f s16le -ar 24000 -ac 1 -i narration.pcm narration.wav
```

### Whisperでの字幕生成

```bash
whisper narration.wav --model small --language ja --output_format srt
```

これだけで、タイムスタンプ付きのSRTファイルが生成されます。ただし、技術用語の認識精度には限界があります（後述のハマりポイント参照）。

### ffmpegでのBGMミックス

```bash
ffmpeg -y \
  -i video.mp4 \
  -i bgm.mp3 \
  -filter_complex " \
    [1:a]atrim=0:48,afade=t=in:st=0:d=2,afade=t=out:st=45:d=3,volume=0.15[bgm]; \
    [0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[out] \
  " \
  -map 0:v -map "[out]" \
  -c:v copy -c:a aac -b:a 192k \
  final.mp4
```

ポイントは `volume=0.15`。BGMの音量をナレーションの15%に抑えることで、聞き取りやすさを確保しています。

---

## 工夫したポイント

### 1. 音声・字幕・画面表示の3点同期

**これが一番こだわった部分です。**

動画には3つの時間軸があります。

- ナレーション音声（Gemini TTSが生成）
- 字幕テキスト（WhisperがSRTとして生成）
- 画面のTip表示アニメーション（Remotionのフレーム制御）

この3つがズレると、一気に素人感が出ます。

解決策として、**SRTのタイムスタンプを基準**にしました。具体的には、SRTファイルで各Tipが言及される開始秒を特定し、それをフレーム番号に変換して、Remotionのアニメーション開始タイミングに設定しています。

```
SRTで「git stash」が4.08秒に言及
  → 4.08 × 30fps = フレーム122
  → tipStartFrames[0] = 122
```

### 2. Subtitleコンポーネントの配置

最初、字幕コンポーネントをトップレベルに配置していたのですが、タイミングがズレました。原因は、Remotionの `useCurrentFrame()` がグローバルフレームを返すため、ナレーション開始位置とのオフセット計算が必要になること。

解決策は、**字幕コンポーネントをSequenceの中に入れる**こと。

```tsx
{/* こうすることで、useCurrentFrame()がナレーション開始を0として返す */}
<Sequence from={TERMINAL_START}>
  <Audio src={staticFile('narration.wav')} />
</Sequence>
<Sequence from={TERMINAL_START}>
  <Subtitle subtitles={subtitles} />
</Sequence>
```

### 3. Claude Codeのスキル化

パイプラインが安定したら、Claude Codeの「スキル」として手順を保存しました。スキルとは、Claude Codeに特定のワークフローを記憶させる機能です。

```
~/.claude/skills/generate-video/SKILL.md
```

このファイルに7ステップの手順を書いておくことで、次回から「動画作って」と言うだけで、Claude Codeが手順通りに実行してくれます。同じ作業を何度も説明する必要がなくなりました。

### 4. TTS再生成時のタイムスタンプ変動への対応

Gemini TTSは同じテキストでも、呼び出すたびに微妙に異なる音声を生成します。つまり、音声の長さもタイミングも毎回変わります。

これに対応するため、**TTS生成 → SRT生成 → フレーム同期を毎回セットで実行する**ルールにしました。古いSRTデータを使い回すと確実にズレます。

---

## ハマったポイント

### Whisperの技術用語認識

Whisperは日常会話には強いですが、技術用語の認識にクセがあります。実際に遭遇した誤認識をいくつか紹介します。

- 「箇条書き」→「仮上書き」
- 「Few-shot」→「フューショット」
- 「Chain of Thought」→「チェーンオブソート」や「ジェイン・ヨブソート」
- 「5つ」→「いちつ」

SRT生成後に必ず目視チェックして、手動修正が必要です。ここは今のところ自動化できていません。

### PythonのSSL証明書問題

macOSでWhisperをインストールした際、モデルのダウンロードで `SSL: CERTIFICATE_VERIFY_FAILED` エラーが出ました。Python 3.13特有の問題で、以下のコマンドで解決します。

```bash
bash "/Applications/Python 3.13/Install Certificates.command"
```

地味ですが、知らないとかなりハマります。

### 動画の尺の動的調整

最初は30秒固定で設計していましたが、ナレーションの長さはテーマによって変わります。結局、TTS生成後の音声の長さに合わせて、毎回 `constants.ts` の尺設定を調整する方式にしました。

```
動画の尺 = タイトル3秒 + ナレーション秒数 + エンディング5秒
```

---

## 開発の進め方

### 要件定義 → モックアップ → 実装の順番

最初にいきなりコードを書くのではなく、以下の順番で進めました。

1. **要件定義**: どんな動画を作りたいか、技術スタックは何かをドキュメント化
2. **HTMLモックアップ**: Tailwind CSSで動画の静止画イメージを作成
3. **Remotion実装**: モックアップをそのままReactコンポーネントに変換

この順番が良かった理由は、モックアップの段階でデザインの方向性を固められるから。Remotionのプレビューは起動に時間がかかりますが、HTMLならブラウザでリロードするだけなので、デザインの試行錯誤が圧倒的に速いです。

### GitHub Issuesでタスク管理

12個のIssueを作成し、マイルストーンで管理しました。

**Phase 1: MVP（Issue #1〜#8）**
手動パイプラインで1本の動画を完成させる。

**Phase 2: 自動化（Issue #9〜#12）**
Claude Codeスキル化まで。

1つずつIssueをクローズしていく進め方は、モチベーション維持にも効果的でした。

---

## 再現手順

同じ仕組みを作りたい方向けに、最低限の手順をまとめます。

### 前提条件

- Node.js（v18以上）
- ffmpeg（`brew install ffmpeg`）
- Python 3（Whisper用）
- Gemini APIキー（Google AI Studioで取得）

### Step 1: プロジェクト初期化

```bash
mkdir my-video-generator && cd my-video-generator
npm init -y
npm install remotion @remotion/cli @remotion/player react react-dom typescript dotenv tsx
```

### Step 2: Remotionの設定

`src/index.ts` でルートを登録し、`src/Root.tsx` でCompositionを定義します。

```typescript
// src/Root.tsx
import { Composition } from 'remotion';
import { MyVideo } from './Video';

export const RemotionRoot = () => (
  <Composition
    id="MyVideo"
    component={MyVideo}
    durationInFrames={900}  // 30秒 × 30fps
    fps={30}
    width={1080}
    height={1920}
  />
);
```

### Step 3: シーンコンポーネントを作る

Remotionの `useCurrentFrame()` と `interpolate()` を使って、フレーム単位でアニメーションを制御します。

```typescript
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: 'clamp',
});
```

### Step 4: TTS生成スクリプト

```typescript
// scripts/generate-tts.ts
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `プロフェッショナルなトーンで: ${narration}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    }),
  }
);
```

### Step 5: Whisperインストール & SRT生成

```bash
pip3 install openai-whisper
whisper output/narration.wav --model small --language ja --output_format srt --output_dir output/
```

### Step 6: レンダリング & BGMミックス

```bash
npx remotion render src/index.ts MyVideo --output output/video.mp4

ffmpeg -y -i output/video.mp4 -i bgm/music.mp3 \
  -filter_complex "[1:a]atrim=0:30,afade=t=in:d=2,afade=t=out:st=27:d=3,volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=first[out]" \
  -map 0:v -map "[out]" -c:v copy -c:a aac output/final.mp4
```

---

## 成果

このパイプラインで、実際に5本の動画を生成しました。

- Claude Code ショートカットキー 5選（30秒）
- AIに伝わるプロンプトの書き方 5選（48秒）
- Git 時短コマンド 5選（43秒）
- Docker 開発が捗るコマンド 5選（48秒）
- VS Code 隠れた便利機能 5選（46秒）
- ターミナル 生産性爆上げコマンド 5選（49秒）

1本あたりの生成時間は約2分。テーマを決めてClaude Codeに指示するだけです。

---

## 今後やりたいこと

- テンプレートのバリエーション追加（Before/After比較、ステップバイステップなど）
- ビジュアル素材の自動生成（AI画像生成との連携）
- X（Twitter）への自動投稿
- 他プラットフォーム対応（YouTube Shorts、TikTok）

---

## まとめ

「動画を作りたいけど、編集ツールを覚えるのは面倒」という開発者の方にこそ、この仕組みはおすすめです。

Remotionで動画を**コード化**し、Gemini TTSで音声を**API化**し、Claude Codeでパイプラインを**自然言語化**する。この3つの掛け合わせで、動画制作のハードルが一気に下がります。

コードはGitHubで公開しています。気になった方はぜひ触ってみてください。

**GitHub**: https://github.com/smilior/remotion-auto-generate

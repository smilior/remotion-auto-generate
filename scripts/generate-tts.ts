import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import 'dotenv/config';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY is not set in .env');
  process.exit(1);
}

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`;

// ナレーション本文（assets/narration.txt の本編部分）
const narrationText = `
Claude Codeを使いこなすなら、ショートカットキーは必須です。
まず、Ctrl+Cで応答をすぐ止められます。
Ctrl+Lで画面をスッキリ。
Escapeで入力をやり直し。
スラッシュを打てばコマンド一覧が出ます。
そしてTabで補完。これだけで操作が格段に速くなります。
`.trim();

async function generateTTS() {
  console.log('Generating TTS with Gemini 2.5 Flash...');
  console.log(`Text: ${narrationText.slice(0, 50)}...`);

  const body = {
    contents: [
      {
        parts: [
          {
            text: `落ち着いた、プロフェッショナルなトーンで読んでください: ${narrationText}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Kore',
          },
        },
      },
    },
  };

  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error (${response.status}):`, errorText);
    process.exit(1);
  }

  const data = await response.json();

  const audioPart = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!audioPart) {
    console.error('No audio data in response');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`Audio MIME type: ${audioPart.mimeType}`);

  // Decode base64 to PCM
  const outputDir = path.resolve(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const pcmPath = path.join(outputDir, 'narration.pcm');
  const wavPath = path.join(outputDir, 'narration.wav');

  const audioBuffer = Buffer.from(audioPart.data, 'base64');
  fs.writeFileSync(pcmPath, audioBuffer);
  console.log(`PCM written: ${pcmPath} (${audioBuffer.length} bytes)`);

  // Convert PCM to WAV using ffmpeg
  execSync(
    `ffmpeg -y -f s16le -ar 24000 -ac 1 -i "${pcmPath}" "${wavPath}"`,
    { stdio: 'inherit' },
  );

  // Clean up PCM
  fs.unlinkSync(pcmPath);

  console.log(`WAV written: ${wavPath}`);
  console.log('Done!');
}

generateTTS().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

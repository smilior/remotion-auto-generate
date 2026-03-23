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

const narrationText = `
AIに伝わるプロンプトの書き方、5つのコツを紹介します。

まず、AIに役割を与えましょう。シニアエンジニアとして答えて、と一言添えるだけで回答の質が上がります。
次に、具体的に指示すること。曖昧な表現は避けましょう。
出力形式も指定します。JSONで返して、箇条書きで、と伝えれば整った回答が得られます。
例を添えるのも効果的です。Few-shotプロンプトで精度がぐんと上がります。
最後に「段階的に考えて」と伝える。Chain of Thoughtで複雑な問題も解けるようになります。
`.trim();

async function generateTTS() {
  console.log('Generating TTS v2...');

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
    process.exit(1);
  }

  const outputDir = path.resolve(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const pcmPath = path.join(outputDir, 'narration.pcm');
  const wavPath = path.join(outputDir, 'narration.wav');

  const audioBuffer = Buffer.from(audioPart.data, 'base64');
  fs.writeFileSync(pcmPath, audioBuffer);
  console.log(`PCM: ${audioBuffer.length} bytes`);

  execSync(`ffmpeg -y -f s16le -ar 24000 -ac 1 -i "${pcmPath}" "${wavPath}"`, { stdio: 'inherit' });
  fs.unlinkSync(pcmPath);

  // Copy to public for Remotion
  const publicDir = path.resolve(__dirname, '..', 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(wavPath, path.join(publicDir, 'narration.wav'));

  console.log(`WAV: ${wavPath}`);
  console.log('Done!');
}

generateTTS().catch((err) => {
  console.error(err);
  process.exit(1);
});

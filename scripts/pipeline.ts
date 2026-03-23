import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import 'dotenv/config';

import { updateConstants, updateTitleScene, updateTerminalScene, updateSrtData } from './lib/update-sources';
import { parseSrt, correctSrt, calculateTipFrames } from './lib/sync-calculator';

const PROJECT_DIR = path.resolve(__dirname, '..');

// ─── Config ───

type VideoConfig = {
  title: { main: string; sub: string };
  command: string;
  tips: { key: string; desc: string }[];
  narration: string;
  bgm: string;
};

function loadConfig(): VideoConfig {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf('--config');

  if (configIdx === -1 || !args[configIdx + 1]) {
    console.error('Usage: npx tsx scripts/pipeline.ts --config <path>');
    process.exit(1);
  }

  const configPath = path.resolve(args[configIdx + 1]);
  if (!fs.existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    process.exit(1);
  }

  const config: VideoConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Validate
  if (!config.title?.main || !config.title?.sub) throw new Error('title.main and title.sub required');
  if (!config.command) throw new Error('command required');
  if (!config.tips || config.tips.length !== 5) throw new Error('Exactly 5 tips required');
  if (!config.narration) throw new Error('narration required');
  if (!config.bgm) throw new Error('bgm required');

  const bgmPath = path.join(PROJECT_DIR, 'bgm', config.bgm);
  if (!fs.existsSync(bgmPath)) throw new Error(`BGM not found: ${bgmPath}`);

  return config;
}

// ─── Step 1: TTS Generation ───

function generateTTS(narration: string): number {
  console.log('\n[Step 1/7] Generating TTS...');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  // Write narration to temp file for the TTS script
  const tmpScript = path.join(PROJECT_DIR, 'scripts', '_tts_tmp.ts');
  const ttsCode = `
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const API_KEY = '${apiKey}';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';
const narrationText = ${JSON.stringify(narration)};

async function main() {
  const body = {
    contents: [{ parts: [{ text: \`落ち着いた、プロフェッショナルなトーンで読んでください: \${narrationText}\` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  };
  const response = await fetch(\`\${ENDPOINT}?key=\${API_KEY}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) { console.error(await response.text()); process.exit(1); }
  const data = await response.json();
  const audioPart = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!audioPart) { console.error('No audio'); process.exit(1); }

  const outputDir = path.resolve(__dirname, '..', 'output');
  const publicDir = path.resolve(__dirname, '..', 'public');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  const pcmPath = path.join(outputDir, 'narration.pcm');
  const wavPath = path.join(outputDir, 'narration.wav');
  fs.writeFileSync(pcmPath, Buffer.from(audioPart.data, 'base64'));
  execSync(\`ffmpeg -y -f s16le -ar 24000 -ac 1 -i "\${pcmPath}" "\${wavPath}"\`, { stdio: 'pipe' });
  fs.unlinkSync(pcmPath);
  fs.copyFileSync(wavPath, path.join(publicDir, 'narration.wav'));
  console.log(\`  WAV: \${wavPath}\`);
}
main();
`;
  fs.writeFileSync(tmpScript, ttsCode);

  try {
    execSync(`npx tsx "${tmpScript}"`, { cwd: PROJECT_DIR, stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmpScript);
  }

  // Get duration
  const wavPath = path.join(PROJECT_DIR, 'output', 'narration.wav');
  const durationStr = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${wavPath}"`,
  ).toString().trim();
  const duration = Math.ceil(parseFloat(durationStr));
  console.log(`  Duration: ${duration}s`);
  return duration;
}

// ─── Step 2: SRT Generation ───

function generateSRT(): string {
  console.log('\n[Step 2/7] Generating SRT...');
  const wavPath = path.join(PROJECT_DIR, 'output', 'narration.wav');
  const outputDir = path.join(PROJECT_DIR, 'output');

  execSync(
    `whisper "${wavPath}" --model small --language ja --output_format srt --output_dir "${outputDir}" --word_timestamps True`,
    { cwd: PROJECT_DIR, stdio: 'pipe' },
  );

  const srtPath = path.join(outputDir, 'narration.srt');
  const raw = fs.readFileSync(srtPath, 'utf-8');
  const corrected = correctSrt(raw);
  console.log(`  SRT: ${srtPath} (${corrected.split('\n\n').length} segments)`);
  return corrected;
}

// ─── Step 3: Sync & Update Sources ───

function syncAndUpdate(config: VideoConfig, narrationDuration: number, srtContent: string) {
  console.log('\n[Step 3/7] Syncing and updating source files...');

  const totalDuration = 3 + narrationDuration + 5; // title + narration + ending
  const terminalEnd = 3 + narrationDuration;

  // Parse SRT and calculate tip frames
  const entries = parseSrt(srtContent);
  const tipKeys = config.tips.map((t) => t.key);
  const tipFrames = calculateTipFrames(entries, tipKeys, narrationDuration);

  // Update all source files
  updateConstants(totalDuration, terminalEnd);
  updateTitleScene(config);
  updateTerminalScene(config, tipFrames);
  updateSrtData(srtContent.trim());
}

// ─── Step 4: Render ───

function render() {
  console.log('\n[Step 4/7] Rendering with Remotion...');
  const outputPath = path.join(PROJECT_DIR, 'output', 'video.mp4');
  execSync(
    `npx remotion render src/index.ts SmiliorTips --output "${outputPath}"`,
    { cwd: PROJECT_DIR, stdio: 'inherit' },
  );
  console.log(`  Video: ${outputPath}`);
}

// ─── Step 5: BGM Mix ───

function mixBGM(config: VideoConfig) {
  console.log('\n[Step 5/7] Mixing BGM...');
  const videoPath = path.join(PROJECT_DIR, 'output', 'video.mp4');
  const bgmPath = path.join(PROJECT_DIR, 'bgm', config.bgm);
  const outputPath = path.join(PROJECT_DIR, 'output', 'final.mp4');

  // Get video duration for fade timing
  const durationStr = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`,
  ).toString().trim();
  const duration = Math.ceil(parseFloat(durationStr));
  const fadeOutStart = duration - 3;

  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${bgmPath}" -filter_complex ` +
    `"[1:a]atrim=0:${duration},afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3,volume=0.15[bgm];` +
    `[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[out]" ` +
    `-map 0:v -map "[out]" -c:v copy -c:a aac -b:a 192k "${outputPath}"`,
    { cwd: PROJECT_DIR, stdio: 'pipe' },
  );

  const size = fs.statSync(outputPath).size;
  console.log(`  Final: ${outputPath} (${(size / 1024 / 1024).toFixed(1)}MB, ${duration}s)`);
}

// ─── Main ───

async function main() {
  console.log('=== smilior Tips Video Pipeline ===\n');

  const config = loadConfig();
  console.log(`Topic: ${config.title.main} — ${config.title.sub}`);

  // Step 1: TTS
  const narrationDuration = generateTTS(config.narration);

  // Step 2: SRT
  const srtContent = generateSRT();

  // Step 3: Sync & Update
  syncAndUpdate(config, narrationDuration, srtContent);

  // Step 4: Type check
  console.log('\n[Step 4/7] Type checking...');
  execSync('npx tsc --noEmit', { cwd: PROJECT_DIR, stdio: 'inherit' });

  // Step 5: Render
  render();

  // Step 6: BGM Mix
  mixBGM(config);

  // Step 7: Done
  console.log('\n[Step 7/7] Done!');
  console.log(`\nopen ${path.join(PROJECT_DIR, 'output', 'final.mp4')}`);
}

main().catch((err) => {
  console.error('\nPipeline failed:', err.message);
  process.exit(1);
});

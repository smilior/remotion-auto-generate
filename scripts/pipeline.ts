import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import 'dotenv/config';

import { updateConstants, updateTitleScene, updateTerminalScene, updateSrtData } from './lib/update-sources';
import { parseSrt, correctSrt, calculateTipFrames } from './lib/sync-calculator';

const PROJECT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_DIR, 'output');
const WORKSPACE = path.join(OUTPUT_DIR, '_workspace');
const INDEX_FILE = path.join(OUTPUT_DIR, '.index');

// ─── Config ───

type VideoConfig = {
  title: { main: string; sub: string };
  command: string;
  tips: { key: string; desc: string }[];
  narration: string;
  bgm: string;
};

function loadConfig(): { config: VideoConfig; configPath: string } {
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

  return { config, configPath };
}

// ─── Output management ───

function getNextIndex(): number {
  if (fs.existsSync(INDEX_FILE)) {
    const current = parseInt(fs.readFileSync(INDEX_FILE, 'utf-8').trim(), 10);
    return isNaN(current) ? 1 : current + 1;
  }
  // Scan existing folders to find highest index
  if (!fs.existsSync(OUTPUT_DIR)) return 1;
  const dirs = fs.readdirSync(OUTPUT_DIR).filter((d) => /^\d{3}_/.test(d));
  if (dirs.length === 0) return 1;
  const maxIdx = Math.max(...dirs.map((d) => parseInt(d.slice(0, 3), 10)));
  return maxIdx + 1;
}

function ensureWorkspace() {
  fs.mkdirSync(WORKSPACE, { recursive: true });
}

function cleanupWorkspace() {
  if (fs.existsSync(WORKSPACE)) {
    fs.rmSync(WORKSPACE, { recursive: true, force: true });
  }
}

function organizeOutput(config: VideoConfig, configPath: string): string {
  const idx = getNextIndex();
  const topicSlug = config.title.main.toLowerCase().replace(/[^a-z0-9\u3040-\u9fff]/gi, '_').replace(/_+/g, '_');
  const folderName = `${String(idx).padStart(3, '0')}_${topicSlug}`;
  const destDir = path.join(OUTPUT_DIR, folderName);

  fs.mkdirSync(destDir, { recursive: true });

  // Move final.mp4
  const finalSrc = path.join(WORKSPACE, 'final.mp4');
  const finalDest = path.join(destDir, 'final.mp4');
  fs.copyFileSync(finalSrc, finalDest);

  // Copy config for reproducibility
  fs.copyFileSync(configPath, path.join(destDir, 'config.json'));

  // Update index
  fs.writeFileSync(INDEX_FILE, String(idx));

  // Cleanup workspace
  cleanupWorkspace();

  return destDir;
}

// ─── Step 1: TTS Generation ───

function generateTTS(narration: string): number {
  console.log('\n[Step 1/7] Generating TTS...');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  const tmpScript = path.join(PROJECT_DIR, 'scripts', '_tts_tmp.ts');
  const wavPath = path.join(WORKSPACE, 'narration.wav');
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

  const workspace = '${WORKSPACE.replace(/\\/g, '\\\\')}';
  const publicDir = path.resolve('${PROJECT_DIR.replace(/\\/g, '\\\\')}', 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const pcmPath = path.join(workspace, 'narration.pcm');
  const wavPath = path.join(workspace, 'narration.wav');
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
  const wavPath = path.join(WORKSPACE, 'narration.wav');

  execSync(
    `whisper "${wavPath}" --model small --language ja --output_format srt --output_dir "${WORKSPACE}" --word_timestamps True`,
    { cwd: PROJECT_DIR, stdio: 'pipe' },
  );

  const srtPath = path.join(WORKSPACE, 'narration.srt');
  const raw = fs.readFileSync(srtPath, 'utf-8');
  const corrected = correctSrt(raw);
  console.log(`  SRT: ${srtPath} (${corrected.split('\n\n').length} segments)`);
  return corrected;
}

// ─── Step 3: Sync & Update Sources ───

function syncAndUpdate(config: VideoConfig, narrationDuration: number, srtContent: string) {
  console.log('\n[Step 3/7] Syncing and updating source files...');

  const totalDuration = 3 + narrationDuration + 5;
  const terminalEnd = 3 + narrationDuration;

  const entries = parseSrt(srtContent);
  const tipKeys = config.tips.map((t) => t.key);
  const tipFrames = calculateTipFrames(entries, tipKeys, narrationDuration);

  updateConstants(totalDuration, terminalEnd);
  updateTitleScene(config);
  updateTerminalScene(config, tipFrames);
  updateSrtData(srtContent.trim());
}

// ─── Step 4: Render ───

function render() {
  console.log('\n[Step 5/7] Rendering with Remotion...');
  const outputPath = path.join(WORKSPACE, 'video.mp4');
  execSync(
    `npx remotion render src/index.ts SmiliorTips --output "${outputPath}"`,
    { cwd: PROJECT_DIR, stdio: 'inherit' },
  );
  console.log(`  Video: ${outputPath}`);
}

// ─── Step 5: BGM Mix ───

function mixBGM(config: VideoConfig) {
  console.log('\n[Step 6/7] Mixing BGM...');
  const videoPath = path.join(WORKSPACE, 'video.mp4');
  const bgmPath = path.join(PROJECT_DIR, 'bgm', config.bgm);
  const outputPath = path.join(WORKSPACE, 'final.mp4');

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

  const { config, configPath } = loadConfig();
  console.log(`Topic: ${config.title.main} — ${config.title.sub}`);

  // Prepare workspace
  cleanupWorkspace();
  ensureWorkspace();

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

  // Step 7: Organize output
  console.log('\n[Step 7/7] Organizing output...');
  const destDir = organizeOutput(config, configPath);
  const finalPath = path.join(destDir, 'final.mp4');
  console.log(`  Output: ${destDir}/`);
  console.log(`  Final:  ${finalPath}`);

  console.log('\nDone!');
  console.log(`\nopen "${finalPath}"`);
}

main().catch((err) => {
  console.error('\nPipeline failed:', err.message);
  process.exit(1);
});

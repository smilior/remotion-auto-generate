import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

type VideoConfig = {
  title: { main: string; sub: string };
  command: string;
  tips: { key: string; desc: string }[];
  narration: string;
  bgm: string;
};

function replaceMarker(
  content: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Marker not found: ${startMarker} / ${endMarker}`);
  }
  return (
    content.slice(0, startIdx + startMarker.length) +
    '\n' +
    replacement +
    '\n' +
    content.slice(endIdx)
  );
}

function replaceInlineMarker(
  content: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const regex = new RegExp(
    escapeRegex(startMarker) + '[\\s\\S]*?' + escapeRegex(endMarker),
  );
  const replaced = startMarker + replacement + endMarker;
  if (!regex.test(content)) {
    throw new Error(`Inline marker not found: ${startMarker}`);
  }
  return content.replace(regex, replaced);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function updateConstants(durationSec: number, terminalEndSec: number) {
  const filePath = path.join(SRC_DIR, 'constants.ts');
  let content = fs.readFileSync(filePath, 'utf-8');

  const replacement = `export const DURATION_IN_SECONDS = ${durationSec};
export const DURATION_IN_FRAMES = VIDEO_FPS * DURATION_IN_SECONDS;
export const TITLE_START = 0;
export const TITLE_END = VIDEO_FPS * 3;
export const TERMINAL_START = TITLE_END;
export const TERMINAL_END = VIDEO_FPS * ${terminalEndSec};
export const ENDING_START = TERMINAL_END;
export const ENDING_END = DURATION_IN_FRAMES;`;

  content = replaceMarker(content, '// @auto:timing-start', '// @auto:timing-end', replacement);
  fs.writeFileSync(filePath, content);
  console.log(`  Updated constants.ts (duration=${durationSec}s, terminalEnd=${terminalEndSec}s)`);
}

export function updateTitleScene(config: VideoConfig) {
  const filePath = path.join(SRC_DIR, 'scenes/TitleScene.tsx');
  let content = fs.readFileSync(filePath, 'utf-8');

  content = replaceInlineMarker(content, '{/* @auto:title-main */}', '{/* @auto:title-main-end */}', config.title.main);
  content = replaceInlineMarker(content, '{/* @auto:title-sub */}', '{/* @auto:title-sub-end */}', config.title.sub);
  content = replaceInlineMarker(content, '{/* @auto:command */}', '{/* @auto:command-end */}', config.command);

  fs.writeFileSync(filePath, content);
  console.log(`  Updated TitleScene.tsx (${config.title.main} / ${config.title.sub})`);
}

export function updateTerminalScene(
  config: VideoConfig,
  tipStartFrames: number[],
) {
  const filePath = path.join(SRC_DIR, 'scenes/TerminalScene.tsx');
  let content = fs.readFileSync(filePath, 'utf-8');

  // Tips array
  const tipsCode = `const TIPS = [\n${config.tips
    .map((t) => `  { key: '${t.key.replace(/'/g, "\\'")}', desc: '${t.desc.replace(/'/g, "\\'")}' },`)
    .join('\n')}\n];`;
  content = replaceMarker(content, '// @auto:tips-start', '// @auto:tips-end', tipsCode);

  // Typewriter
  content = replaceInlineMarker(
    content,
    '{/* @auto:typewriter */}',
    '{/* @auto:typewriter-end */}',
    `<Typewriter text="${config.command}" startFrame={10} speed={2} />`,
  );

  // tipStartFrames
  const framesCode = `            const tipStartFrames = [${tipStartFrames.join(', ')}];`;
  content = replaceMarker(content, '// @auto:tipframes-start', '// @auto:tipframes-end', framesCode);

  // Cursor threshold
  const cursorThreshold = tipStartFrames[tipStartFrames.length - 1] + 20;
  content = content.replace(
    /\{\/\* @auto:cursor-threshold \*\/\}\{frame > \d+ && \(/,
    `{/* @auto:cursor-threshold */}{frame > ${cursorThreshold} && (`,
  );

  fs.writeFileSync(filePath, content);
  console.log(`  Updated TerminalScene.tsx (frames=[${tipStartFrames.join(',')}])`);
}

export function updateSrtData(srtContent: string) {
  const filePath = path.join(SRC_DIR, 'srt-data.ts');
  const escaped = srtContent.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const replacement = `const srtContent = \`${escaped}\`;`;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = replaceMarker(content, '// @auto:srt-start', '// @auto:srt-end', replacement);
  fs.writeFileSync(filePath, content);
  console.log(`  Updated srt-data.ts (${srtContent.split('\n').length} lines)`);
}

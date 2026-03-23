const FPS = 30;

type SrtEntry = {
  index: number;
  startSec: number;
  endSec: number;
  text: string;
};

// Common Whisper misrecognitions → corrections
const CORRECTIONS: [RegExp, string][] = [
  [/いちつ/g, '5つ'],
  [/仮上書き/g, '箇条書き'],
  [/フューショット/g, 'Few-shot'],
  [/チェーンオブソート/g, 'Chain of Thought'],
  [/ジェイン・ヨブソート/g, 'Chain of Thought'],
  [/ビッグリマーク/g, 'ビックリマーク'],
  [/採実後/g, '再実行'],
  [/対比/g, '退避'],
  [/課長書き/g, '箇条書き'],
];

export function parseSrt(srtText: string): SrtEntry[] {
  const blocks = srtText.trim().split(/\n\n+/);
  return blocks.map((block) => {
    const lines = block.split('\n');
    const index = parseInt(lines[0], 10);
    const [startStr, endStr] = lines[1].split(' --> ');
    return {
      index,
      startSec: timeToSec(startStr),
      endSec: timeToSec(endStr),
      text: lines.slice(2).join('\n'),
    };
  });
}

function timeToSec(time: string): number {
  const [h, m, rest] = time.split(':');
  const [s, ms] = rest.split(',');
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
}

export function correctSrt(srtText: string): string {
  let corrected = srtText;
  for (const [pattern, replacement] of CORRECTIONS) {
    corrected = corrected.replace(pattern, replacement);
  }
  return corrected;
}

/** Convert katakana to hiragana for fuzzy matching */
function toHiragana(s: string): string {
  return s.replace(/[\u30A1-\u30F6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

/**
 * Find the frame at which each tip is first mentioned in the SRT.
 *
 * Strategy:
 * 1. Try text matching (exact + word-level + katakana normalization)
 * 2. If matching fails, use sequential ordering: the narration typically
 *    introduces tips in order, so assign tips to SRT segments sequentially
 *    by looking for "ordinal" patterns (まず, 次に, 最後に) or by position
 * 3. Final fallback: even distribution
 */
export function calculateTipFrames(
  entries: SrtEntry[],
  tipKeys: string[],
  totalDurationSec: number,
): number[] {
  // First pass: try text matching
  const matchedFrames: (number | null)[] = tipKeys.map(() => null);
  const usedEntries = new Set<number>();

  for (let i = 0; i < tipKeys.length; i++) {
    const key = tipKeys[i].toLowerCase();
    const keyHira = toHiragana(key);
    // Extract meaningful words (2+ chars) from the key
    const words = key.split(/[\s+\-\/\.]/).filter((w) => w.length >= 2);

    for (const entry of entries) {
      if (usedEntries.has(entry.index)) continue;
      // Skip intro segment (first segment is usually the overview)
      if (i === 0 && entry.index === 1 && entries.length > 5) continue;
      const text = entry.text.toLowerCase();
      const textHira = toHiragana(text);

      const match =
        text.includes(key) ||
        textHira.includes(keyHira) ||
        (words.length > 0 && words.some((w) => text.includes(w) || textHira.includes(toHiragana(w))));

      if (match) {
        matchedFrames[i] = Math.round(entry.startSec * FPS);
        usedEntries.add(entry.index);
        console.log(`  Tip ${i + 1} "${tipKeys[i]}" → matched SRT #${entry.index} at ${entry.startSec}s (frame ${matchedFrames[i]})`);
        break;
      }
    }
  }

  // Second pass: for unmatched tips, use sequential SRT ordering
  // The narration follows the tip order, so find intro patterns
  const unmatchedCount = matchedFrames.filter((f) => f === null).length;
  if (unmatchedCount > 0) {
    console.log(`  ${unmatchedCount} tips unmatched, using sequential SRT ordering...`);

    // Find segments that start new topics (skip the intro segment)
    const introPatterns = [/まず/, /次に/, /3つ目/, /4つ目/, /最後に/, /そして/];
    const topicEntries: SrtEntry[] = [];

    for (const entry of entries) {
      if (usedEntries.has(entry.index)) continue;
      // Check if this looks like a new topic introduction
      const isIntro = introPatterns.some((p) => p.test(entry.text));
      // Or if it mentions a number/ordinal
      const hasOrdinal = /[1-5１-５]|一つ目|二つ目|三つ目|四つ目|五つ目/.test(entry.text);

      if (isIntro || hasOrdinal) {
        topicEntries.push(entry);
      }
    }

    // Assign unmatched tips sequentially to topic entries
    let topicIdx = 0;
    for (let i = 0; i < tipKeys.length; i++) {
      if (matchedFrames[i] !== null) continue;

      if (topicIdx < topicEntries.length) {
        const entry = topicEntries[topicIdx];
        matchedFrames[i] = Math.round(entry.startSec * FPS);
        console.log(`  Tip ${i + 1} "${tipKeys[i]}" → sequential SRT #${entry.index} at ${entry.startSec}s (frame ${matchedFrames[i]})`);
        topicIdx++;
      }
    }
  }

  // Final fallback: even distribution for any still-unmatched
  const frames: number[] = matchedFrames.map((f, i) => {
    if (f !== null) return f;
    const interval = (totalDurationSec * FPS) / (tipKeys.length + 1);
    const fallback = Math.round(interval * (i + 1));
    console.warn(`  Tip ${i + 1} "${tipKeys[i]}" → fallback even distribution (frame ${fallback})`);
    return fallback;
  });

  // Ensure minimum frame is 90 (3s, after title scene)
  // and frames are monotonically increasing
  const MIN_FRAME = FPS * 3; // 90
  for (let i = 0; i < frames.length; i++) {
    if (frames[i] < MIN_FRAME) {
      frames[i] = MIN_FRAME + i * FPS * 2;
    }
    if (i > 0 && frames[i] <= frames[i - 1]) {
      frames[i] = frames[i - 1] + FPS * 2;
    }
  }

  return frames;
}

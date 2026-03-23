import { useCurrentFrame } from 'remotion';
import { FONTS, VIDEO_FPS } from '../constants';

export type SubtitleEntry = {
  index: number;
  startSec: number;
  endSec: number;
  text: string;
};

/** Parse SRT string into subtitle entries */
export function parseSrt(srt: string): SubtitleEntry[] {
  const blocks = srt.trim().split(/\n\n+/);
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
  return (
    parseInt(h, 10) * 3600 +
    parseInt(m, 10) * 60 +
    parseInt(s, 10) +
    parseInt(ms, 10) / 1000
  );
}

type Props = {
  subtitles: SubtitleEntry[];
  /** Frame offset: the global frame where this subtitle track starts */
  offsetFrames?: number;
};

export const Subtitle: React.FC<Props> = ({ subtitles, offsetFrames = 0 }) => {
  const globalFrame = useCurrentFrame();
  const currentSec = (globalFrame - offsetFrames) / VIDEO_FPS;

  const active = subtitles.find(
    (s) => currentSec >= s.startSec && currentSec < s.endSec,
  );

  if (!active) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 40,
        right: 40,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          borderRadius: 12,
          padding: '16px 28px',
          maxWidth: '90%',
        }}
      >
        <p
          style={{
            fontFamily: FONTS.sans,
            fontSize: 32,
            fontWeight: 500,
            color: '#FFFFFF',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {active.text}
        </p>
      </div>
    </div>
  );
};

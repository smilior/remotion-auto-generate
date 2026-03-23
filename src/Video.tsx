import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { TitleScene } from './scenes/TitleScene';
import { TerminalScene } from './scenes/TerminalScene';
import { EndingScene } from './scenes/EndingScene';
import { Subtitle, parseSrt } from './components/Subtitle';
import {
  TITLE_START,
  TITLE_END,
  TERMINAL_START,
  TERMINAL_END,
  ENDING_START,
  ENDING_END,
} from './constants';
import srtContent from './srt-data';

const subtitles = parseSrt(srtContent);

export const SmiliorTipsVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0A' }}>
      {/* Scenes */}
      <Sequence from={TITLE_START} durationInFrames={TITLE_END - TITLE_START}>
        <TitleScene />
      </Sequence>
      <Sequence
        from={TERMINAL_START}
        durationInFrames={TERMINAL_END - TERMINAL_START}
      >
        <TerminalScene />
      </Sequence>
      <Sequence
        from={ENDING_START}
        durationInFrames={ENDING_END - ENDING_START}
      >
        <EndingScene />
      </Sequence>

      {/* Narration audio — starts at TERMINAL_START (3 sec) */}
      <Sequence from={TERMINAL_START}>
        <Audio src={staticFile('narration.wav')} />
      </Sequence>

      {/* Subtitles — synced to narration start */}
      <Subtitle subtitles={subtitles} offsetFrames={TERMINAL_START} />
    </AbsoluteFill>
  );
};

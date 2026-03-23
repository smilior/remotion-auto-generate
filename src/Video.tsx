import { AbsoluteFill, Sequence } from 'remotion';
import { TitleScene } from './scenes/TitleScene';
import { TerminalScene } from './scenes/TerminalScene';
import { EndingScene } from './scenes/EndingScene';
import {
  TITLE_START,
  TITLE_END,
  TERMINAL_START,
  TERMINAL_END,
  ENDING_START,
  ENDING_END,
} from './constants';

export const SmiliorTipsVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0A' }}>
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
    </AbsoluteFill>
  );
};

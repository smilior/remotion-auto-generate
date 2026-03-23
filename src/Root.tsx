import { Composition } from 'remotion';
import { SmiliorTipsVideo } from './Video';
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  VIDEO_FPS,
  DURATION_IN_FRAMES,
} from './constants';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SmiliorTips"
      component={SmiliorTipsVideo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};

import { useCurrentFrame, interpolate } from 'remotion';
import { BRAND, FONTS } from '../constants';

type Props = {
  text: string;
  startFrame?: number;
  speed?: number;
};

export const Typewriter: React.FC<Props> = ({
  text,
  startFrame = 0,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsPerFrame = 0.5 * speed;
  const charsVisible = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  const isDone = charsVisible >= text.length;

  return (
    <span>
      <span style={{ color: BRAND.orange }}>$</span>
      <span
        style={{
          color: '#E5E5E5',
          marginLeft: 12,
          fontFamily: FONTS.mono,
        }}
      >
        {text.slice(0, charsVisible)}
      </span>
      {!isDone && (
        <span
          style={{
            color: BRAND.orange,
            opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
          }}
        >
          |
        </span>
      )}
    </span>
  );
};

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { BRAND, FONTS } from '../constants';

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const titleY = interpolate(frame, [5, 25], [30, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 80px',
        opacity,
      }}
    >
      {/* Accent line */}
      <div
        style={{
          width: 60,
          height: 4,
          backgroundColor: BRAND.orange,
          borderRadius: 2,
          marginBottom: 80,
        }}
      />

      {/* Category */}
      <p
        style={{
          fontFamily: FONTS.mono,
          fontSize: 22,
          color: BRAND.orange,
          letterSpacing: '0.25em',
          textTransform: 'uppercase' as const,
          marginBottom: 50,
        }}
      >
        AI Driven Dev Tips
      </p>

      {/* Title */}
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: FONTS.sans,
            fontSize: 72,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          Claude Code
        </h1>
        <p
          style={{
            fontFamily: FONTS.sans,
            fontSize: 48,
            fontWeight: 300,
            color: '#A3A3A3',
            marginTop: 10,
          }}
        >
          ショートカットキー 5選
        </p>
      </div>

      {/* Terminal prompt */}
      <div
        style={{
          marginTop: 100,
          fontFamily: FONTS.mono,
          fontSize: 28,
          display: 'flex',
          gap: 12,
        }}
      >
        <span style={{ color: BRAND.orange }}>~</span>
        <span style={{ color: '#525252' }}>$</span>
        <span style={{ color: '#A3A3A3' }}>claude tips</span>
        <span
          style={{
            color: BRAND.orange,
            opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0,
          }}
        >
          |
        </span>
      </div>
    </AbsoluteFill>
  );
};

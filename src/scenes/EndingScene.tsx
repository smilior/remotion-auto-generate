import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { BRAND, FONTS } from '../constants';

export const EndingScene: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const contentY = interpolate(frame, [0, 25], [20, 0], {
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
        transform: `translateY(${contentY}px)`,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 60,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.orangeDark})`,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 44,
            fontWeight: 600,
            background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.orangeLight})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          smilior
        </span>
      </div>

      {/* Tagline */}
      <p
        style={{
          fontFamily: FONTS.mono,
          fontSize: 20,
          color: '#525252',
          letterSpacing: '0.2em',
          textTransform: 'uppercase' as const,
          marginBottom: 80,
        }}
      >
        Share the smile of discovery
      </p>

      {/* Book title */}
      <h2
        style={{
          fontFamily: FONTS.sans,
          fontSize: 52,
          fontWeight: 700,
          color: '#FFFFFF',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        AI駆動開発
      </h2>
      <p
        style={{
          fontFamily: FONTS.sans,
          fontSize: 36,
          fontWeight: 300,
          color: '#A3A3A3',
          marginBottom: 60,
        }}
      >
        実践ガイド
      </p>

      {/* Domain link */}
      <div
        style={{
          border: '1px solid #262626',
          borderRadius: 16,
          padding: '20px 40px',
          marginBottom: 60,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 28,
            color: BRAND.orange,
          }}
        >
          smilior.com
        </span>
      </div>

      {/* Separator */}
      <div
        style={{
          width: 80,
          height: 1,
          backgroundColor: '#262626',
          marginBottom: 60,
        }}
      />

      {/* Follow button */}
      <div
        style={{
          border: '1px solid #404040',
          borderRadius: 100,
          padding: '16px 48px',
        }}
      >
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 26,
            fontWeight: 500,
            color: '#FFFFFF',
          }}
        >
          Follow for more tips
        </span>
      </div>
    </AbsoluteFill>
  );
};

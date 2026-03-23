import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { BRAND, FONTS, TERMINAL, TERMINAL_END, TERMINAL_START } from '../constants';
import { SmiliorLogo } from '../components/SmiliorLogo';
import { Typewriter } from '../components/Typewriter';

const SCENE_DURATION = TERMINAL_END - TERMINAL_START;

// @auto:tips-start
const TIPS = [
  { key: 'git stash', desc: '作業を一時退避' },
  { key: 'git log --oneline', desc: '履歴を一行表示' },
  { key: 'git diff --staged', desc: 'ステージ済みの差分確認' },
  { key: 'git commit --amend', desc: '直前のコミットを修正' },
  { key: 'git switch -', desc: '前のブランチに戻る' },
];
// @auto:tips-end

export const TerminalScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in / out
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(
    frame,
    [SCENE_DURATION - 15, SCENE_DURATION],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const opacity = fadeIn * fadeOut;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0A0A0A',
        padding: '40px 40px',
        opacity,
      }}
    >
      {/* Brand bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          padding: '0 10px',
        }}
      >
        <SmiliorLogo size="sm" />
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 20,
            color: BRAND.orange,
            opacity: 0.6,
          }}
        >
          AI DRIVEN DEV TIPS
        </span>
      </div>

      {/* Terminal window */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 24,
          border: `1px solid ${TERMINAL.border}`,
          backgroundColor: TERMINAL.bg,
          overflow: 'hidden',
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            padding: '20px 30px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: `1px solid ${TERMINAL.border}`,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: '#404040',
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 20,
              color: TERMINAL.dim,
              marginLeft: 12,
            }}
          >
            Terminal
          </span>
        </div>

        {/* Terminal body */}
        <div
          style={{
            flex: 1,
            padding: '30px 30px',
            fontFamily: FONTS.mono,
            fontSize: 26,
            lineHeight: 2,
          }}
        >
          {/* Command with typewriter */}
          <div style={{ marginBottom: 40 }}>
            {/* @auto:typewriter */}<Typewriter text="git --tips" startFrame={10} speed={2} />{/* @auto:typewriter-end */}
          </div>

          {/* Tips output */}
          {TIPS.map((tip, i) => {
            // @auto:tipframes-start
            const tipStartFrames = [0, 122, 287, 498, 662];
// @auto:tipframes-end
            const tipAppearFrame = tipStartFrames[i] ?? 45 + i * 20;
            const tipOpacity = interpolate(
              frame,
              [tipAppearFrame, tipAppearFrame + 12],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );
            const tipY = interpolate(
              frame,
              [tipAppearFrame, tipAppearFrame + 12],
              [15, 0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.out(Easing.ease),
              },
            );

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 20,
                  opacity: tipOpacity,
                  transform: `translateY(${tipY}px)`,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    color: BRAND.orange,
                    width: 30,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ color: '#FFFFFF', fontWeight: 500 }}>
                  {tip.key}
                </span>
                <span style={{ color: TERMINAL.dim }}>&mdash;</span>
                <span style={{ color: '#A3A3A3' }}>{tip.desc}</span>
              </div>
            );
          })}

          {/* Cursor at bottom */}
          {/* @auto:cursor-threshold */}{frame > 682 && (
            <div style={{ marginTop: 30 }}>
              <span style={{ color: BRAND.orange }}>$</span>
              <span
                style={{
                  color: BRAND.orange,
                  marginLeft: 12,
                  opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0,
                }}
              >
                |
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for subtitle overlay area */}
      <div style={{ height: 100 }} />
    </AbsoluteFill>
  );
};

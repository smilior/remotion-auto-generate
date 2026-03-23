import { BRAND, FONTS } from '../constants';

type Props = {
  size?: 'sm' | 'lg';
};

export const SmiliorLogo: React.FC<Props> = ({ size = 'sm' }) => {
  const iconSize = size === 'lg' ? 56 : 32;
  const fontSize = size === 'lg' ? 44 : 22;
  const gap = size === 'lg' ? 16 : 10;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.orangeDark})`,
        }}
      />
      {size === 'lg' ? (
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize,
            fontWeight: 600,
            background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.orangeLight})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          smilior
        </span>
      ) : (
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize,
            color: '#737373',
          }}
        >
          smilior
        </span>
      )}
    </div>
  );
};

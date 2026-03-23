// Video settings
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 30;
// @auto:timing-start
export const DURATION_IN_SECONDS = 43;
export const DURATION_IN_FRAMES = VIDEO_FPS * DURATION_IN_SECONDS;
export const TITLE_START = 0;
export const TITLE_END = VIDEO_FPS * 3;
export const TERMINAL_START = TITLE_END;
export const TERMINAL_END = VIDEO_FPS * 38;
export const ENDING_START = TERMINAL_END;
export const ENDING_END = DURATION_IN_FRAMES;
// @auto:timing-end

// Brand colors — smilior
export const BRAND = {
  orange: '#F2994A',
  orangeLight: '#F6B87E',
  orangeDark: '#DF631A',
} as const;

// Terminal theme
export const TERMINAL = {
  bg: '#0A0A0A',
  surface: '#141414',
  border: '#262626',
  text: '#E5E5E5',
  dim: '#737373',
  prompt: BRAND.orange,
} as const;

// Typography
export const FONTS = {
  sans: 'Inter, Noto Sans JP, sans-serif',
  mono: 'JetBrains Mono, monospace',
} as const;

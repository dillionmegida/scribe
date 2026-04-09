import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    bg: string;
    surface: string;
    surfaceHover: string;
    border: string;
    borderLight: string;
    text: string;
    textMuted: string;
    textDim: string;
    accent: string;
    accentDim: string;
    accentText: string;
    red: string;
    radius: string;
    radiusSm: string;
  }
}
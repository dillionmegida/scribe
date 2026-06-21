import { createGlobalStyle, DefaultTheme } from 'styled-components';

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

export const theme: DefaultTheme = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceHover: '#F9FAFB',
  border: '#E5E7EB',
  borderLight: '#D1D5DB',
  text: '#111827',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  accent: '#18181B',
  accentDim: 'rgba(24, 24, 27, 0.06)',
  accentText: '#FFFFFF',
  red: '#EF4444',
  radius: '12px',
  radiusSm: '8px',
};

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root {
    height: 100%;
    background: ${p => p.theme.bg};
    color: ${p => p.theme.text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }

  button { cursor: pointer; border: none; background: none; font-family: inherit; }
  input { font-family: inherit; }
`;
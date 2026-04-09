import { createGlobalStyle, DefaultTheme } from 'styled-components';

export const theme: DefaultTheme = {
  bg: '#0d0d0d',
  surface: '#161616',
  surfaceHover: '#1e1e1e',
  border: '#252525',
  borderLight: '#2e2e2e',
  text: '#e8e8e8',
  textMuted: '#666',
  textDim: '#444',
  accent: '#c8f060',
  accentDim: 'rgba(200, 240, 96, 0.12)',
  accentText: '#0d0d0d',
  red: '#ff5f5f',
  radius: '10px',
  radiusSm: '6px',
};

export const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root {
    height: 100%;
    background: ${p => p.theme.bg};
    color: ${p => p.theme.text};
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }

  button { cursor: pointer; border: none; background: none; font-family: inherit; }
  input { font-family: inherit; }
`;
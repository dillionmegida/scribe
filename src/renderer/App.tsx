import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import styled from 'styled-components';
import { theme, GlobalStyles } from './styles/theme';
import Home from './pages/Home';
import VideoPage from './pages/VideoPage';
import { TitleBarContext } from './titleContext';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${p => p.theme.bg};
`;

const TitleBar = styled.div`
  height: 52px;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding: 0 20px 0 80px;
  border-bottom: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.surface};
  flex-shrink: 0;
  gap: 12px;
`;

const AppName = styled.button`
  -webkit-app-region: no-drag;
  font-size: 13px;
  font-weight: 700;
  color: ${p => p.theme.accent};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex-shrink: 0;
  padding: 4px 2px;
  transition: opacity 0.15s;
  &:hover { opacity: 0.6; }
`;

function AppLayout() {
  const navigate = useNavigate();
  const [extras, setExtras] = useState<React.ReactNode>(null);

  return (
    <TitleBarContext.Provider value={{ setExtras }}>
      <Shell>
        <TitleBar>
          <AppName onClick={() => navigate('/')}>Scribe</AppName>
          {extras}
        </TitleBar>
        <Outlet />
      </Shell>
    </TitleBarContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/video/:videoId" element={<VideoPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
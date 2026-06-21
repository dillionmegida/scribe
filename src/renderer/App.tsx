import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme, GlobalStyles } from './styles/theme';
import Home from './pages/Home';

const VideoPage = lazy(() => import('./pages/VideoPage'));

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <HashRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/video/:videoId" element={<VideoPage />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
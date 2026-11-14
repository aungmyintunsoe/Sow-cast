import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DesignProvider, applyDesign, readInitialDesign } from './theme/ThemeProvider';
import { THEMES } from './theme/themes';
import './index.css';

// Apply the design before the first paint so there is no flash of unstyled colours.
const initial = readInitialDesign();
applyDesign(THEMES.find((t) => t.id === initial.themeId) ?? THEMES[0], initial.fontId);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignProvider>
      <App />
    </DesignProvider>
  </StrictMode>
);

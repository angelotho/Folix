import React from 'react';
import ReactDOM from 'react-dom/client';

// Bundled offline fonts (100% local)
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/400-italic.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

import './styles/globals.css';
import App from './App';
import { loadReaderSettings, resolveInitialTheme } from './utils/storage';

// Apply persisted or Windows system theme synchronously before first React paint
const initialSettings = loadReaderSettings();
const initialResolvedTheme = resolveInitialTheme(initialSettings.theme);
document.documentElement.setAttribute('data-theme', initialResolvedTheme);
document.documentElement.style.colorScheme = initialResolvedTheme;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


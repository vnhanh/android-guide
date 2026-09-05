import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppContent } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './context/I18nContext';
import { PlatformProvider } from './context/PlatformContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <PlatformProvider>
          <AppContent />
        </PlatformProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);

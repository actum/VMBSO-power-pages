import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { initializeTranslations } from './i18n';
import App from './App';
import { TranslationLoader } from './components/TranslationLoader';
import * as ReactGA from 'react-ga';

const MEASUREMENT_ID = import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID;

if (MEASUREMENT_ID) {
  ReactGA.initialize(MEASUREMENT_ID);
} else {
  console.warn('Google Analytics ID is not set.');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Show loading screen while translations are being fetched
root.render(
  <React.StrictMode>
    <TranslationLoader />
  </React.StrictMode>
);

// Initialize translations before rendering the main app
initializeTranslations().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch((error) => {
  console.error('[App] Failed to initialize translations:', error);
  // Render app anyway with fallback translations
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

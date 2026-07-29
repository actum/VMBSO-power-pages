import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { initializeTranslations } from './i18n';
import App from './App';
import { TranslationLoader } from './components/TranslationLoader';
import ReactGA from 'react-ga4';

const MEASUREMENT_ID = import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID;

if (MEASUREMENT_ID) {
  // Only initializes (and only sets GA cookies) when the env var is present.
  // gtagOptions.cookie_flags forces the _ga cookie to be Secure, fixing the
  // "Cookie Without Secure Flag" finding from the Power Pages security scan.
  ReactGA.initialize(MEASUREMENT_ID, {
    gtagOptions: {
      cookie_flags: 'SameSite=Strict;Secure',
    },
  });
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

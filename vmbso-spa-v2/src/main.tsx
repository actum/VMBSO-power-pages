import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { initializeTranslations } from './i18n';
import App from './App';
import { TranslationLoader } from './components/TranslationLoader';
import ReactGA from 'react-ga4';
import { config } from './config/powerPages.config';
import { loadPublicConfig } from './services/publicConfigService';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Show loading screen while public config / translations are being fetched
root.render(
  <React.StrictMode>
    <TranslationLoader />
  </React.StrictMode>
);

// Public config (Entra provider identifier, GA measurement ID, ...) must load
// before anything else — it's read at runtime instead of baked into the build,
// so translations/GA/App all wait on it.
loadPublicConfig().catch((error) => {
  console.error('[App] Failed to load public config:', error);
}).finally(() => {
  const measurementId = config.analytics.googleAnalyticsId;

  if (measurementId) {
    // Only initializes (and only sets GA cookies) when a measurement ID resolved.
    // gtagOptions.cookie_flags forces the _ga cookie to be Secure, fixing the
    // "Cookie Without Secure Flag" finding from the Power Pages security scan.
    ReactGA.initialize(measurementId, {
      gtagOptions: {
        cookie_flags: 'SameSite=Strict;Secure',
      },
    });
  } else {
    console.warn('Google Analytics ID is not set.');
  }

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
});

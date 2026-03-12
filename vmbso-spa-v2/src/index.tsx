import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import "./i18n";
import App from './App';
import * as ReactGA from "react-ga";

const MEASUREMENT_ID = process.env.REACT_APP_GOOGLE_ANALYTICS_ID;

if (MEASUREMENT_ID) {
  ReactGA.initialize(MEASUREMENT_ID);
} else {
  console.warn("Google Analytics ID is not set.");
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

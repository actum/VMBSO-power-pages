import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import * as ReactGA from "react-ga";
import { useCookiesStore } from "../stores/cookiesStore";

/**
 * Initializes Google Analytics (if configured) and sends a pageview
 * on every route change when analytics is enabled.
 */
export const AnalyticsTracker: React.FC = () => {
  const location = useLocation();
  const analyticsEnabled = useCookiesStore((s) => s.analyticsEnabled);

  if (!analyticsEnabled) return null;

  // Initialize GA once
  useEffect(() => {
    if (import.meta.env.VITE_GOOGLE_ANALYTICS_ID) {
      ReactGA.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS_ID);
    }
  }, []);

  // Send pageview on route change
  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname });
  }, [location]);

  return null;
};

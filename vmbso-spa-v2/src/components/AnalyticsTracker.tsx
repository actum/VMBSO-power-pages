import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";
import { useCookiesStore } from "../stores/cookiesStore";

export const AnalyticsTracker = () => {
  const location = useLocation();
  const analyticsEnabled = useCookiesStore((s) => s.analyticsEnabled);

  useEffect(() => {
    if (analyticsEnabled && import.meta.env.VITE_GOOGLE_ANALYTICS_ID) {
      ReactGA.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS_ID);
    }
  }, [analyticsEnabled]);

  useEffect(() => {
    if (analyticsEnabled) {
      ReactGA.send({ hitType: "pageview", page: location.pathname });
    }
  }, [location, analyticsEnabled]);

  return null;
};

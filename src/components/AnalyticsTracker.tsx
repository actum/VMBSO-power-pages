import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";
import { useCookiesStore } from "../stores/cookiesStore";

export const AnalyticsTracker = () => {
  const location = useLocation();
  const analyticsEnabled = useCookiesStore((s) => s.analyticsEnabled);
  const gaMeasurementId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
  const isGAInitialized = useRef(false);

  useEffect(() => {
    if (analyticsEnabled && gaMeasurementId && !isGAInitialized.current) {
      ReactGA.initialize(gaMeasurementId);
      isGAInitialized.current = true;
    }
  }, [analyticsEnabled, gaMeasurementId]);

  useEffect(() => {
    if (analyticsEnabled && gaMeasurementId && isGAInitialized.current) {
      ReactGA.send({ hitType: "pageview", page: location.pathname });
    }
  }, [location, analyticsEnabled, gaMeasurementId]);

  return null;
};

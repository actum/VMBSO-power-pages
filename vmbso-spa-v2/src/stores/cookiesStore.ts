import { create } from "zustand";
import Cookie from "js-cookie";

const COOKIE_CONSENT_KEY = "cookieConsent";

interface CookiesState {
  analyticsEnabled: boolean;
  dialogOpen: boolean;
  setAnalyticsEnabled: (enabled: boolean) => void;
  setDialogOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  acceptAll: () => void;
  savePreferences: () => void;
}

function saveConsent(analyticsEnabled: boolean) {
  Cookie.set(
    COOKIE_CONSENT_KEY,
    JSON.stringify({
      essentialAccepted: true,
      analyticsEnabled,
    }),
    {
      expires: 90,
      path: "/",
      sameSite: "strict",
      secure: location.protocol === "https:",
    }
  );

  if (!analyticsEnabled) {
    Cookie.remove("_ga");
    Cookie.remove("_gat");
    Cookie.remove("_gid");
  }
}

// Read initial state synchronously from cookie
function getInitialState(): { analyticsEnabled: boolean; dialogOpen: boolean } {
  const stored = Cookie.get(COOKIE_CONSENT_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        analyticsEnabled: Boolean(parsed.analyticsEnabled),
        dialogOpen: false,
      };
    } catch {
      Cookie.remove(COOKIE_CONSENT_KEY);
    }
  }

  // No stored consent — show dialog if GA is configured
  return {
    analyticsEnabled: false,
    dialogOpen: !!import.meta.env.VITE_GOOGLE_ANALYTICS_ID,
  };
}

const initial = getInitialState();

export const useCookiesStore = create<CookiesState>((set, get) => ({
  analyticsEnabled: initial.analyticsEnabled,
  dialogOpen: initial.dialogOpen,

  setAnalyticsEnabled: (enabled) => set({ analyticsEnabled: enabled }),

  setDialogOpen: (val) =>
    set((state) => ({
      dialogOpen: typeof val === "function" ? val(state.dialogOpen) : val,
    })),

  acceptAll: () => {
    saveConsent(true);
    set({ analyticsEnabled: true, dialogOpen: false });
  },

  savePreferences: () => {
    const { analyticsEnabled } = get();
    saveConsent(analyticsEnabled);
    set({ dialogOpen: false });
  },
}));

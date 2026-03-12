import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Cookie from "js-cookie";
import { colors } from '../theme/colors';
import { useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import * as ReactGA from "react-ga";

type CookiesContextType = {
  dialogOpen: boolean;
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (value: boolean) => void;
  acceptAll: () => void;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export const CookiesContext = React.createContext<CookiesContextType>({
  dialogOpen: false,
  analyticsEnabled: false,
  setAnalyticsEnabled: () => {},
  acceptAll: () => {},
  setDialogOpen: () => {},
});

const COOKIE_CONSENT_KEY = 'cookieConsent';

const formLabelSx = {
  "& .MuiFormControlLabel-label": {
    fontWeight: 500
  }
};

export function CookiesProvider({ children }: { children: React.ReactNode }) {
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation("cookies");
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const stored = Cookie.get(COOKIE_CONSENT_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        setAnalyticsEnabled(Boolean(parsed.analyticsEnabled));

        return;
      } catch {
        Cookie.remove(COOKIE_CONSENT_KEY);
      }
    }

    if (process.env.REACT_APP_GOOGLE_ANALYTICS_ID) {
      ReactGA.initialize(process.env.REACT_APP_GOOGLE_ANALYTICS_ID);
    }

    setOpen(true);
  }, []);

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname });
  }, [location]);

  const saveConsent = (options: { analyticsEnabled: boolean }) => {
    Cookie.set(COOKIE_CONSENT_KEY, JSON.stringify({
      essentialAccepted: true,
      analyticsEnabled: options.analyticsEnabled
    }), {
      expires: 90,
      path: "/",
      sameSite: "strict",
      secure: true
    });

    setAnalyticsEnabled(options.analyticsEnabled);

    if (!options.analyticsEnabled) {
      Cookie.remove("_ga");
      Cookie.remove("_gat");
      Cookie.remove("_gid");
    }

    setOpen(false);
  };

  const acceptAll = () => {
    saveConsent({ analyticsEnabled: true });
  };

  const handleSave = () => {
    saveConsent({ analyticsEnabled: analyticsEnabled });
  };

  const contextValue: CookiesContextType = {
    dialogOpen: open,
    analyticsEnabled,
    setAnalyticsEnabled,
    acceptAll,
    setDialogOpen: setOpen,
  };

  return (
    <CookiesContext.Provider value={contextValue}>
      {children}
      <Dialog
        open={open}
        disableEscapeKeyDown
        aria-labelledby="cookies-dialog-title"
        sx={{
          "& .MuiDialog-container": {
            alignItems: { xs: "flex-end", md: "center" }
          },
          "& .MuiDialog-paper": {
            margin: { xs: 0, sm: "auto" },
            borderRadius: { xs: 0, sm: "0.4rem" }
          }
        }}
      >
        <DialogTitle fontSize={"2rem"} id="cookies-dialog-title">{t("title")}</DialogTitle>
        <DialogContent>
          <Typography mb="1rem" variant="body2">
            {t("subtitle")}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked
                disabled
                color="primary"
              />
            }
            label={t("actions.essentialToggle")}
            sx={formLabelSx}
          />
          <Typography gutterBottom sx={{ color: colors.textLight }} variant="body2">
            {t("essential.description")}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                color="primary"
              />
            }
            label={t("actions.analyticsToggle")}
            sx={formLabelSx}
          />
          <Typography variant="body2">
            {t("analytics.description")}
          </Typography>
        </DialogContent>
        <DialogActions
          disableSpacing={isMobile}
          sx={{
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "initial" },
            gap: { xs: "1rem", sm: 0 },
          }}
        >
          <Button onClick={acceptAll} color="primary" variant="contained">
            {t("actions.acceptAll")}
          </Button>
          <Button onClick={handleSave} color="primary" variant="outlined">
            {t("actions.savePreferences")}
          </Button>
        </DialogActions>
      </Dialog>
    </CookiesContext.Provider>
  );
}

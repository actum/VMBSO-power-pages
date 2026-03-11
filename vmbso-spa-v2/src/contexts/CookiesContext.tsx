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

type CookiesContextType = {
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (value: boolean) => void;
  acceptAll: () => void;
};

export const CookiesContext = React.createContext<CookiesContextType>({
  analyticsEnabled: false,
  setAnalyticsEnabled: () => {},
  acceptAll: () => {},
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const stored = Cookie.get(COOKIE_CONSENT_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);

      setAnalyticsEnabled(Boolean(parsed.analyticsEnabled));

      return;
    }

    setOpen(true);
  }, []);

  const saveConsent = (options: { analyticsEnabled: boolean }) => {
    Cookie.set(COOKIE_CONSENT_KEY, JSON.stringify({
      essentialAccepted: true,
      analyticsEnabled: options.analyticsEnabled
    }), {
      expires: 90,
      path: "/",
      sameSite: "strict"
    });

    setAnalyticsEnabled(options.analyticsEnabled);
    setOpen(false);
  };

  const acceptAll = () => {
    saveConsent({ analyticsEnabled: true });
  };

  const handleSave = () => {
    saveConsent({ analyticsEnabled: analyticsEnabled });
  };

  const contextValue: CookiesContextType = {
    analyticsEnabled,
    setAnalyticsEnabled,
    acceptAll,
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
            margin: { xs: 0, md: "auto" },
            borderRadius: { xs: 0, md: "0.4rem" }
          }
        }}
      >
        <DialogTitle fontSize={"2rem"} id="cookies-dialog-title">{t("title")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
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
          <Typography sx={{ color: colors.textLight }} variant="body2">
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
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "initial" },
            gap: { xs: "1rem", md: 0 },
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

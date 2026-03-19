import React from "react";
import { useTranslation } from "react-i18next";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useMediaQuery, useTheme } from "@mui/material";
import { colors } from "../theme/colors";
import { useCookiesStore } from "../stores/cookiesStore";

const formLabelSx = {
  "& .MuiFormControlLabel-label": {
    fontWeight: 500,
  },
};

export const CookieConsentDialog: React.FC = () => {
  const { t } = useTranslation("cookies");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const dialogOpen = useCookiesStore((s) => s.dialogOpen);
  const analyticsEnabled = useCookiesStore((s) => s.analyticsEnabled);
  const setAnalyticsEnabled = useCookiesStore((s) => s.setAnalyticsEnabled);
  const acceptAll = useCookiesStore((s) => s.acceptAll);
  const savePreferences = useCookiesStore((s) => s.savePreferences);

  return (
    <Dialog
      open={dialogOpen}
      disableEscapeKeyDown
      aria-labelledby="cookies-dialog-title"
      sx={{
        "& .MuiDialog-container": {
          alignItems: { xs: "flex-end", md: "center" },
        },
        "& .MuiDialog-paper": {
          margin: { xs: 0, sm: "auto" },
          borderRadius: { xs: 0, sm: "0.4rem" },
        },
      }}
    >
      <DialogTitle fontSize={"2rem"} id="cookies-dialog-title">
        {t("title")}
      </DialogTitle>
      <DialogContent>
        <Typography mb="1rem" variant="body2">
          {t("subtitle")}
        </Typography>
        <FormControlLabel
          control={<Switch checked disabled color="primary" />}
          label={t("actions.essentialToggle")}
          sx={formLabelSx}
        />
        <Typography
          gutterBottom
          sx={{ color: colors.textLight }}
          variant="body2"
        >
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
        <Typography variant="body2">{t("analytics.description")}</Typography>
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
        <Button onClick={savePreferences} color="primary" variant="outlined">
          {t("actions.savePreferences")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  TextField,
  Grid,
  Button,
  Alert,
  MenuItem,
  IconButton,
  InputLabel,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { Contact } from "../types/contact";
import { authService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const UpdateProfile: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Partial<Contact>>(currentUser || {});
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { t } = useTranslation("updateProfile");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const languages = t("fields.language.options", { returnObjects: true }) as Record<string, string>;

  useEffect(() => {
    if (currentUser) {
      setValues({ ...currentUser });
    }
  }, [currentUser]);

  const handleChange = (field: keyof Contact) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const hasError = (field: keyof Contact) => {
    return touched[field] && !values[field];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setUpdating(true);

      await authService.updateProfile({
        contactid: currentUser?.contactid,
        ...values,
      });
      await refreshUser();

      navigate("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Updating profile information failed.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: "87.6rem" }} mx={{ xs: "1rem", md: "auto" }}>
        <Typography variant="h2" gutterBottom my={5}>
          {t("title.complete_profile")}
        </Typography>
        <Box component="form" mt={{ xs: "2rem", md: "8rem" }} noValidate={true} onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t("title.complete_details")}
          </Typography>
          <Grid container spacing={4} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <InputLabel error={hasError("actum_language")}>{t("fields.language.label")} *</InputLabel>
              <TextField
                select
                aria-label={t("fields.language.aria")}
                value={values.actum_language || ""}
                fullWidth
                required
                onChange={handleChange("actum_language")}
                onBlur={() => handleBlur("actum_language")}
                error={hasError("actum_language")}
                helperText={hasError("actum_language") ? t("fields.language.validation") : " "}
              >
                {Object.entries(languages).map(([key, value]) => <MenuItem value={key}>{value}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} />
            <Grid item xs={12} sm={6}>
              <InputLabel disabled>{t("fields.email.label")}</InputLabel>
              <TextField
                value={values.emailaddress1 || ""}
                onChange={handleChange("emailaddress1")}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabel error={hasError("actum_phone")}>{t("fields.phoneNumber.label")} *</InputLabel>
              <TextField
                value={values.actum_phone || ""}
                fullWidth
                required
                inputMode="tel"
                onChange={handleChange("actum_phone")}
                onBlur={() => handleBlur("actum_phone")}
                error={hasError("actum_phone")}
                helperText={hasError("actum_phone") ? t("fields.phoneNumber.validation") : " "}
              />
            </Grid>
          </Grid>

          <Typography mt={{ xs: "2rem", md: "8rem" }} variant="h6">
            {t("section.company_details")}
          </Typography>

          <Grid container spacing={4} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <InputLabel>{t("fields.companyName.label")} *</InputLabel>
              <TextField
                aria-label={t("fields.companyName.aria")}
                value={values.actum_companyname || ""}
                fullWidth
                required
                onChange={handleChange("actum_companyname")}
                onBlur={() => handleBlur("actum_companyname")}
                error={hasError("actum_companyname")}
                helperText={hasError("actum_companyname") ? t("fields.companyName.validation") : " "}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabel>{t("fields.vat.label")}</InputLabel>
              <TextField
                aria-label={t("fields.vat.aria")}
                value={values.actum_vat || ""}
                fullWidth
                required
                onChange={handleChange("actum_vat")}
                onBlur={() => handleBlur("actum_vat")}
                error={hasError("actum_vat")}
                helperText={hasError("actum_vat") ? t("fields.vat.validation") : " "}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabel>{t("fields.primaryCountry.label")} *</InputLabel>
              <TextField
                aria-label={t("fields.primaryCountry.aria")}
                value={values.actum_primarycountry || ""}
                fullWidth
                required
                onChange={handleChange("actum_primarycountry")}
                onBlur={() => handleBlur("actum_primarycountry")}
                error={hasError("actum_primarycountry")}
                helperText={hasError("actum_primarycountry") ? t("fields.primaryCountry.validation") : " "}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabel>{t("fields.companyPhone.label")} *</InputLabel>
              <TextField
                aria-label={t("fields.companyPhone.aria")}
                value={values.actum_companyphone || ""}
                fullWidth
                required
                inputMode="tel"
                onChange={handleChange("actum_companyphone")}
                onBlur={() => handleBlur("actum_companyphone")}
                error={hasError("actum_companyphone")}
                helperText={hasError("actum_companyphone") ? t("fields.companyPhone.validation") : " "}
              />
            </Grid>
            <Grid item xs={12}>
              <InputLabel>{t("fields.address.label")} *</InputLabel>
              <TextField
                aria-label={t("fields.address.aria")}
                value={values.actum_address || ""}
                fullWidth
                required
                onChange={handleChange("actum_address")}
                onBlur={() => handleBlur("actum_address")}
                error={hasError("actum_address")}
                helperText={hasError("actum_address") ? t("fields.address.validation") : " "}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabel>{t("fields.companyBrand.label")} *</InputLabel>
              <TextField
                select
                aria-label={t("fields.companyBrand.aria")}
                SelectProps={{ multiple: true }}
                value={values.actum_brand || [""]}
                fullWidth
                required
                onChange={handleChange("actum_brand")}
                onBlur={() => handleBlur("actum_brand")}
                error={hasError("actum_brand")}
                helperText={hasError("actum_brand") ? t("fields.companyBrand.validation") : " "}
              >
                {Object.entries(t("fields.companyBrand.options", { returnObjects: true }) as Record<string, string>).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabel>{t("fields.companyRole.label")} *</InputLabel>
              <TextField
                select
                aria-label={t("fields.companyRole.aria")}
                value={values.actum_role || ""}
                fullWidth
                required
                onChange={handleChange("actum_role")}
                onBlur={() => handleBlur("actum_role")}
                error={hasError("actum_role")}
                helperText={hasError("actum_role") ? t("fields.companyRole.validation") : " "}
              >
                <MenuItem value="Distributor">Distributor</MenuItem>
                <MenuItem value="Architect">Architect</MenuItem>
                <MenuItem value="Installer">Installer</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabel>{t("fields.companyEmail.label")}</InputLabel>
              <TextField
                aria-label={t("fields.companyEmail.aria")}
                type="email"
                value={values.actum_companyemail || ""}
                onChange={handleChange("actum_companyemail")}
                fullWidth
              />
            </Grid>
          </Grid>

          {error && (
            <Alert
              sx={{ marginTop: "2rem" }}
              action={<IconButton size="small" onClick={() => setError(null)}><CloseIcon /></IconButton>}
              severity="error"
            >
              {error}
            </Alert>
          )}

          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button fullWidth={isMobile} type="submit" variant="contained" disabled={updating}>
              {updating ? t("action.updating") : t("action.update")}
            </Button>
          </Box>

        </Box>
      </Box>
    </Layout>
  );
};

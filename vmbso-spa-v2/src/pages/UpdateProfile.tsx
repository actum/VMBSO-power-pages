import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  Button,
  Alert,
  MenuItem,
  IconButton,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { Contact } from "../types/contact";
import { authService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import InputLabelField from "../components/common/ui/InputLabelField";

const reqiredFields = [
  "actum_language",
  "actum_phone",
  "actum_companyname",
  "actum_primarycountry",
  "actum_companyphone",
  "actum_address",
  "actum_brand",
  "actum_vat",
  "actum_role"
] satisfies (keyof Contact)[];

export const UpdateProfile: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Partial<Contact>>(currentUser || {});
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(["updateProfile", "languages"]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const languages = t("languages:options", { returnObjects: true }) as Record<string, string>;

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

  const invalidFields = !reqiredFields.every(key => values[key]);

  return (
    <Layout>
      <Box sx={{ maxWidth: "87.6rem" }} mx={{ xs: "1rem", md: "auto" }}>
        <Typography
          variant="h2"
          gutterBottom
          margin={{ xs: "2rem 0 3rem 2rem", md: "2rem 0 3rem 3rem"}}
        >
          {t("title.completeProfile")}
        </Typography>
        <Paper component="form" sx={{ padding: { xs: "2rem", md: "3rem"} }} noValidate={true} onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t("title.completeDetails")}
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                select
                label={t("fields.language.label")}
                aria-label={t("fields.language.aria")}
                value={values.actum_language || ""}
                fullWidth
                required
                onChange={handleChange("actum_language")}
                error={t("validation.language")}
              >
                {Object.entries(languages).map(([key, value]) => <MenuItem key={key} value={key}>{t(`updateProfile:fields.language.options.${key}`)}</MenuItem>)}
              </InputLabelField>
            </Grid>
            <Grid item xs={12} sm={6} display={{ xs: "none", md: "initial" }} />
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.email.label")}
                value={values.emailaddress1 || ""}
                onChange={handleChange("emailaddress1")}
                fullWidth
                disabled
                helperText=" "
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.phoneNumber.label")}
                value={values.actum_phone || ""}
                fullWidth
                required
                inputMode="tel"
                onChange={handleChange("actum_phone")}
                error={t("validation.phoneNumber")}
              />
            </Grid>
          </Grid>

          <Typography margin="2rem 0" variant="h6">
            {t("section.company_details")}
          </Typography>

          <Grid container spacing={{ xs: 2, md: 4}} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.companyName.label")}
                aria-label={t("fields.companyName.aria")}
                value={values.actum_companyname || ""}
                fullWidth
                required
                onChange={handleChange("actum_companyname")}
                error={t("validation.companyName")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.vat.label")}
                aria-label={t("fields.vat.aria")}
                value={values.actum_vat || ""}
                fullWidth
                required
                onChange={handleChange("actum_vat")}
                error={t("validation.vat")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.primaryCountry.label")}
                aria-label={t("fields.primaryCountry.aria")}
                value={values.actum_primarycountry || ""}
                fullWidth
                required
                onChange={handleChange("actum_primarycountry")}
                error={t("validation.primaryCountry")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.companyPhone.label")}
                aria-label={t("fields.companyPhone.aria")}
                value={values.actum_companyphone || ""}
                fullWidth
                required
                inputMode="tel"
                onChange={handleChange("actum_companyphone")}
                error={t("validation.companyPhone")}
              />
            </Grid>
            <Grid item xs={12}>
              <InputLabelField
                label={t("fields.address.label")}
                value={values.actum_address || ""}
                fullWidth
                required
                error={t("validation.address")}
                aria-label={t("fields.address.aria")}
                onChange={handleChange("actum_address")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.companyBrand.label")}
                value={values.actum_brand || [""]}
                fullWidth
                required
                select
                error={t("validation.companyBrand")}
                aria-label={t("fields.companyBrand.aria")}
                onChange={handleChange("actum_brand")}
              >
                {Object.entries(t("fields.companyBrand.options", { returnObjects: true }) as Record<string, string>).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </InputLabelField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                select
                label={t("fields.companyRole.label")}
                aria-label={t("fields.companyRole.aria")}
                value={values.actum_role || ""}
                fullWidth
                required
                onChange={handleChange("actum_role")}
                error={t("validation.companyRole")}
              >
                {Object.entries(t("fields.companyRole.options", { returnObjects: true }) as Record<string, string>).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </InputLabelField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.companyEmail.label")}
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

          <Box display="flex" justifyContent="flex-end" mt="5rem">
            <Button fullWidth={isMobile} size={isMobile ? "large" : "medium"} type="submit" variant="contained" disabled={updating || invalidFields}>
              {!invalidFields && updating ? t("action.updating") : t("action.update")}
            </Button>
          </Box>

        </Paper>
      </Box>
    </Layout>
  );
};

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
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon, Search as SearchIcon } from "@mui/icons-material";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import type { Contact } from "../types/contact";
import type { Account } from "../types/account";
import type { Brand } from "../types/brand";
import type { Country } from "../types/country";
import type { Language } from "../types/language";
import { authService } from "../services/authService";
import { dataverseService } from "../services/dataverseService";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import InputLabelField from "../components/common/ui/InputLabelField";

type VatSearchState = "idle" | "searching" | "found" | "notFound";

export const UpdateProfile: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Partial<Contact>>(currentUser || {});
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(["updateProfile"]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // VAT search state
  const [vatInput, setVatInput] = useState("");
  const [vatSearchState, setVatSearchState] = useState<VatSearchState>("idle");
  const [foundAccount, setFoundAccount] = useState<Account | null>(null);

  // Dynamic lookup data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [languagesLoading, setLanguagesLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setValues({ ...currentUser });
      console.log("[UpdateProfile] user from Entra:", {
        firstName: currentUser.firstname,
        lastName: currentUser.lastname,
      });
    }
  }, [currentUser]);

  // Fetch brands and countries on mount
  useEffect(() => {
    dataverseService.brands.getAll().then(data => {
      setBrands(data);
      setBrandsLoading(false);
    }).catch(() => setBrandsLoading(false));

    dataverseService.countries.getAll().then(data => {
      setCountries(data);
      setCountriesLoading(false);
    }).catch(() => setCountriesLoading(false));

    dataverseService.languages.getAll().then(data => {
      setLanguages(data);
      setLanguagesLoading(false);
    }).catch(() => setLanguagesLoading(false));
  }, [currentUser]);

  const handleChange = (field: keyof Contact) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleVatSearch = async () => {
    if (!vatInput.trim()) return;
    setVatSearchState("searching");
    setError(null);
    try {
      const account = await dataverseService.accounts.searchByVAT(vatInput.trim());
      if (account) {
        setFoundAccount(account);
        setVatSearchState("found");
      } else {
        setFoundAccount(null);
        setVatSearchState("notFound");
      }
    } catch (err) {
      setFoundAccount(null);
      setVatSearchState("idle");
      setError(err instanceof Error ? err.message : "VAT search failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setUpdating(true);

      if (vatSearchState === "found" && foundAccount) {
        // Link contact to existing account
        await authService.updateProfile({
          contactid: currentUser?.contactid,
          ...values,
          _parentcustomerid_value: foundAccount.accountid,
        });
      } else if (vatSearchState === "notFound") {
        // 1. Create new Account
        const newAccount = await dataverseService.accounts.create({
          name: values.actum_companyname!,
          actum_vatregistrationnumber: vatInput.trim(),
          telephone1: values.actum_companyphone,
          address1_line1: values.address1_line1,
        });

        // 2. Set current contact as primary contact on the new Account
        await dataverseService.accounts.setPrimaryContact(
          newAccount.accountid,
          currentUser!.contactid!
        );

        // 3. Update contact and link to new Account
        await authService.updateProfile({
          contactid: currentUser?.contactid,
          ...values,
          _parentcustomerid_value: newAccount.accountid,
        });
      }

      await refreshUser();
      navigate("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Updating profile information failed.");
    } finally {
      setUpdating(false);
    }
  };

  // â”€â”€ Save button guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const contactFieldsValid =
    !!values.actum_language?.toString().trim() &&
    !!values.actum_phone?.toString().trim();

  const vatSearchDone = vatSearchState === "found" || vatSearchState === "notFound";

  const companyFieldsValid =
    vatSearchState === "found"
      ? true
      : vatSearchState === "notFound"
        ? !!values.actum_companyname?.toString().trim() &&
          !!values.actum_primarycountry?.toString().trim() &&
          !!values.actum_companyphone?.toString().trim() &&
          !!values.address1_line1?.toString().trim() &&
          !!values.actum_brand &&
          !!values.actum_role?.toString().trim()
        : false;

  const canSave = contactFieldsValid && vatSearchDone && companyFieldsValid;

  const companyFieldsVisible = vatSearchDone;

  return (
    <Layout>
      <Box sx={{ maxWidth: "87.6rem" }} mx={{ xs: "1rem", md: "auto" }}>
        <Typography
          variant="h2"
          gutterBottom
          margin={{ xs: "2rem 0 3rem 2rem", md: "2rem 0 3rem 3rem" }}
        >
          {t("title.completeProfile")}
        </Typography>

        <Paper
          component="form"
          sx={{ padding: { xs: "2rem", md: "3rem" } }}
          noValidate={true}
          onSubmit={handleSubmit}
        >
          {/* â”€â”€ Contact Details â”€â”€ */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t("title.completeDetails")}
          </Typography>

          <Grid container spacing={3} sx={{ mt: 1 }}>
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

          {/* â”€â”€ Company Section â”€â”€ */}
          <Typography margin="2rem 0" variant="h6">
            {t("section.company_details")}
          </Typography>

          <Grid container spacing={{ xs: 2, md: 4 }} sx={{ mt: 1 }}>
            {/* VAT + Search */}
            <Grid item xs={12} sm={6}>
              <Box display="flex" gap={1} alignItems="flex-start">
                <Box flex={1}>
                  <InputLabelField
                    label={t("fields.vat.label")}
                    ariaLabel={t("fields.vat.aria")}
                    value={vatInput}
                    fullWidth
                    required
                    onChange={e => {
                      setVatInput(e.target.value);
                      // Reset search state if user edits the VAT after searching
                      if (vatSearchState !== "idle") {
                        setVatSearchState("idle");
                        setFoundAccount(null);
                      }
                    }}
                    error={t("validation.vat")}
                    hideHelperText
                  />
                </Box>
                <Button
                  variant="outlined"
                  onClick={handleVatSearch}
                  disabled={!vatInput.trim() || vatSearchState === "searching"}
                  sx={{ mt: "1.75rem", minWidth: "3.5rem", height: "3.5rem", px: 1 }}
                  aria-label={t("fields.vat.searchButton")}
                >
                  {vatSearchState === "searching"
                    ? <CircularProgress size={20} />
                    : <SearchIcon />}
                </Button>
              </Box>
            </Grid>

            {/* Company Name â€” always visible, conditionally editable */}
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.companyName.label")}
                ariaLabel={t("fields.companyName.aria")}
                value={values.actum_companyname || ""}
                fullWidth
                required={vatSearchState === "notFound"}
                disabled={vatSearchState === "found"}
                onChange={handleChange("actum_companyname")}
                error={t("validation.companyName")}
              />
            </Grid>

            {/* VAT search result message */}
            {vatSearchState === "found" && foundAccount && (
              <Grid item xs={12}>
                <Alert severity="success" sx={{ py: 0.5 }}>
                  {t("fields.vat.found")}
                </Alert>
              </Grid>
            )}
            {vatSearchState === "notFound" && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  {t("fields.vat.notFound")}
                </Alert>
              </Grid>
            )}

            {/* Remaining company fields â€” visible only after search */}
            {companyFieldsVisible && (
              <>
                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    select
                    label={t("fields.primaryCountry.label")}
                    ariaLabel={t("fields.primaryCountry.aria")}
                    value={values.actum_primarycountry || ""}
                    fullWidth
                    required
                    onChange={handleChange("actum_primarycountry")}
                    error={t("validation.primaryCountry")}
                    disabled={countriesLoading}
                  >
                    {countriesLoading
                      ? <MenuItem value=""><CircularProgress size={16} /></MenuItem>
                      : countries.map(c => (
                          <MenuItem key={c.actum_countryid} value={c.actum_countryid}>
                            {c.actum_name}
                          </MenuItem>
                        ))}
                  </InputLabelField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    label={t("fields.companyPhone.label")}
                    ariaLabel={t("fields.companyPhone.aria")}
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
                    ariaLabel={t("fields.address.aria")}
                    value={values.address1_line1 || ""}
                    fullWidth
                    required
                    onChange={handleChange("address1_line1")}
                    error={t("validation.address")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    label={t("fields.companyEmail.label")}
                    ariaLabel={t("fields.companyEmail.aria")}
                    type="email"
                    value={values.actum_companyemail || ""}
                    onChange={handleChange("actum_companyemail")}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    select
                    label={t("fields.companyBrand.label")}
                    ariaLabel={t("fields.companyBrand.aria")}
                    value={values.actum_brand || ""}
                    fullWidth
                    required
                    onChange={handleChange("actum_brand")}
                    error={t("validation.companyBrand")}
                    disabled={brandsLoading}
                  >
                    {brandsLoading
                      ? <MenuItem value=""><CircularProgress size={16} /></MenuItem>
                      : brands.map(b => (
                          <MenuItem key={b.actum_brandid} value={b.actum_brandid}>
                            {b.actum_name}
                          </MenuItem>
                        ))}
                  </InputLabelField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    select
                    label={t("fields.companyRole.label")}
                    ariaLabel={t("fields.companyRole.aria")}
                    value={values.actum_role || ""}
                    fullWidth
                    required
                    onChange={handleChange("actum_role")}
                    error={t("validation.companyRole")}
                  >
                    {Object.entries(
                      t("fields.companyRole.options", { returnObjects: true }) as Record<string, string>
                    ).map(([key, label]) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))}
                  </InputLabelField>
                </Grid>
              </>
            )}

            {/* Language â€" always visible, filtered by country once country is selected */}
            <Grid item xs={12} sm={6}>
              <InputLabelField
                select
                label={t("fields.language.label")}
                ariaLabel={t("fields.language.aria")}
                value={values.actum_language || ""}
                fullWidth
                required
                onChange={handleChange("actum_language")}
                error={t("validation.language")}
                disabled={languagesLoading}
              >
                {languagesLoading
                  ? <MenuItem value=""><CircularProgress size={16} /></MenuItem>
                  : languages.map(lang => (
                      <MenuItem key={lang.actum_languageid} value={lang.actum_languageid}>
                        {lang.actum_name}
                      </MenuItem>
                    ))}
              </InputLabelField>
            </Grid>
          </Grid>

          {error && (
            <Alert
              sx={{ marginTop: "2rem" }}
              action={
                <IconButton size="small" onClick={() => setError(null)}>
                  <CloseIcon />
                </IconButton>
              }
              severity="error"
            >
              {error}
            </Alert>
          )}

          <Box display="flex" justifyContent="flex-end" mt="5rem">
            <Button
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
              type="submit"
              variant="contained"
              disabled={updating || !canSave}
            >
              {canSave && updating ? t("action.updating") : t("action.update")}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
};

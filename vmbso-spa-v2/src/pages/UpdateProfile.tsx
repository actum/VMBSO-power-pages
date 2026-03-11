import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  Button,
  Alert,
  MenuItem,
  IconButton,
  InputAdornment,
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
import type { Role } from "../types/role";
import { dataverseService } from "../services/dataverseService";
import { apiClient } from "../services/apiClient";
import { config } from "../config/powerPages.config";
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
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testRunning, setTestRunning] = useState(false);
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);

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

    dataverseService.roles.getAll().then(data => {
      setRoles(data);
      setRolesLoading(false);
    }).catch(() => setRolesLoading(false));
  }, [currentUser]);

  // Fetch languages filtered by selected country
  useEffect(() => {
    const countryId = values.actum_primarycountry;
    if (!countryId) {
      setLanguages([]);
      return;
    }
    setLanguagesLoading(true);
    dataverseService.languages.getByCountry(countryId).then(data => {
      setLanguages(data);
      // Clear language if it no longer belongs to the newly selected country
      setValues(prev => {
        const stillValid = data.some(l => l.actum_languageid === prev.actum_language);
        return stillValid ? prev : { ...prev, actum_language: undefined };
      });
      setLanguagesLoading(false);
    }).catch(() => setLanguagesLoading(false));
  }, [values.actum_primarycountry]);

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
        setValues(v => ({
          ...v,
          actum_companyname: account.name,
          // Pre-fill country from account so the language dropdown loads
          actum_primarycountry: account._actum_primarycountryid_value ?? v.actum_primarycountry,
        }));
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

      await apiClient.flow(config.flows.updateProfile, {
        hasAccount: vatSearchState === "found" ? "YES" : "NO",
        contactId: currentUser?.contactid,
        phone: values.telephone1,
        languageId: values.actum_language,
        // found-only
        accountId: foundAccount?.accountid,
        // notFound-only
        vatNumber: vatInput.trim(),
        companyName: values.actum_companyname,
        countryId: values.actum_primarycountry,
        companyPhone: values.actum_companyphone,
        address: values.address1_line1,
        city: values.address1_city,
        zipCode: values.address1_postalcode,
        companyEmail: values.actum_companyemail,
        brandIds: (values.actum_brand ?? []).join(","),
        roleId: values.actum_role,
      });

      await refreshUser();
      navigate("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Updating profile information failed.");
    } finally {
      setUpdating(false);
    }
  };

  const handleTestFlow = async () => {
    setTestResult(null);
    setTestRunning(true);
    try {
      const result = await apiClient.flow<unknown>(config.flows.test, {});
      setTestResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setTestResult(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTestRunning(false);
    }
  };

  // ── Save button guard ─────────────────────────────────────────────────────
  const contactFieldsValid =
    !!values.actum_language?.toString().trim() &&
    !!values.telephone1?.toString().trim();

  const vatSearchDone = vatSearchState === "found" || vatSearchState === "notFound";

  const companyFieldsValid =
    vatSearchState === "found"
      ? true
      : vatSearchState === "notFound"
        ? !!values.actum_companyname?.toString().trim() &&
          !!values.actum_primarycountry?.toString().trim() &&
          !!values.actum_companyphone?.toString().trim() &&
          !!values.address1_line1?.toString().trim() &&
          !!values.address1_city?.toString().trim() &&
          !!values.address1_postalcode?.toString().trim() &&
          (values.actum_brand?.length ?? 0) > 0 &&
          !!values.actum_role?.toString().trim()
        : false;

  const canSave = contactFieldsValid && vatSearchDone && companyFieldsValid;

  const companyFieldsVisible = vatSearchState === "notFound";

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
                value={values.telephone1 || ""}
                fullWidth
                required
                inputMode="tel"
                onChange={handleChange("telephone1")}
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
                onBlur={() => {
                  if (vatInput.trim() && vatSearchState === "idle") {
                    handleVatSearch();
                  }
                }}
                error={t("validation.vat")}
                hideHelperText
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={t("fields.vat.searchButton")}
                        onClick={handleVatSearch}
                        disabled={!vatInput.trim() || vatSearchState === "searching"}
                        edge="end"
                        size="medium"
                        sx={{ mr: 0.5 }}
                      >
                        {vatSearchState === "searching"
                          ? <CircularProgress size={22} />
                          : <SearchIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
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
              <Grid item xs={12} sx={{ display: "flex", alignItems: "center", py: 1 }}>
                <Alert severity="success" sx={{ py: 0.5, width: "100%" }}>
                  {t("fields.vat.found", { name: foundAccount.name })}
                </Alert>
              </Grid>
            )}
            {vatSearchState === "notFound" && (
              <Grid item xs={12} sx={{ display: "flex", alignItems: "center", py: 1 }}>
                <Alert severity="info" sx={{ py: 0.5, width: "100%" }}>
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
                    label={t("fields.city.label")}
                    ariaLabel={t("fields.city.aria")}
                    value={values.address1_city || ""}
                    fullWidth
                    required
                    onChange={handleChange("address1_city")}
                    error={t("validation.city")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    label={t("fields.zipCode.label")}
                    ariaLabel={t("fields.zipCode.aria")}
                    value={values.address1_postalcode || ""}
                    fullWidth
                    required
                    onChange={handleChange("address1_postalcode")}
                    error={t("validation.zipCode")}
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
                    value={values.actum_brand ?? []}
                    fullWidth
                    required
                    onChange={e => {
                      const val = e.target.value;
                      setValues(prev => ({
                        ...prev,
                        actum_brand: typeof val === "string" ? val.split(",") : val as string[],
                      }));
                    }}
                    error={t("validation.companyBrand")}
                    disabled={brandsLoading}
                    SelectProps={{
                      multiple: true,
                      renderValue: (selected) =>
                        (selected as string[])
                          .map(id => brands.find(b => b.actum_brandid === id)?.actum_name ?? id)
                          .join(", "),
                    }}
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
                    disabled={rolesLoading}
                  >
                    {rolesLoading
                      ? <MenuItem value=""><CircularProgress size={16} /></MenuItem>
                      : roles.map(r => (
                          <MenuItem key={r.actum_roleid} value={r.actum_roleid}>
                            {r.actum_name}
                          </MenuItem>
                        ))}
                  </InputLabelField>
                </Grid>
              </>
            )}

            {/* Language — filtered by selected country, saved on Contact */}
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
                disabled={!values.actum_primarycountry || languagesLoading}
              >
                {languagesLoading
                  ? <MenuItem value=""><CircularProgress size={16} /></MenuItem>
                  : languages.length === 0
                    ? <MenuItem value="" disabled>{t("fields.language.noOptions")}</MenuItem>
                    : languages.map(lang => (
                        <MenuItem key={lang.actum_languageid} value={lang.actum_languageid}>
                          {lang.actum_name}
                        </MenuItem>
                      ))}
              </InputLabelField>
            </Grid>
          </Grid>

          {testResult && (
            <Alert
              sx={{ marginTop: "1rem", whiteSpace: "pre-wrap", fontFamily: "monospace" }}
              severity={testResult.startsWith("ERROR") ? "error" : "success"}
              onClose={() => setTestResult(null)}
            >
              <strong>Test flow response:</strong>{"\n"}{testResult}
            </Alert>
          )}

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

          <Box display="flex" justifyContent="flex-end" gap={2} mt="5rem">
            <Button
              variant="outlined"
              size={isMobile ? "large" : "medium"}
              disabled={testRunning}
              onClick={handleTestFlow}
            >
              {testRunning ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              {testRunning ? "Testing…" : "Test Flow"}
            </Button>
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

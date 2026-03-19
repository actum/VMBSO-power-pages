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
import { useAuth } from "../hooks/useAuth";
import { type Contact } from "../types/contact";
import { type Account } from "../types/account";
import { useBrands, useCountries, useRoles, useLanguagesByCountry } from "../hooks/useProfileData";
import { useVatSearch } from "../hooks/useVatSearch";
import { useUpdateProfile } from "../hooks/useUpdateProfile";
import { dataverseService } from "../services/dataverseService";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import InputLabelField from "../components/common/ui/InputLabelField";

type VatSearchState = "idle" | "searching" | "found" | "notFound";

export const UpdateProfile: React.FC = () => {
  useEffect(() => { document.title = t('updateProfilePage:pageTitle'); }, [t]);

  const { currentUser, refreshUser, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Partial<Contact>>(currentUser || {});
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(["updateProfilePage"]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // VAT search state
  const [vatInput, setVatInput] = useState("");
  const [vatSearchState, setVatSearchState] = useState<VatSearchState>("idle");
  const [foundAccount, setFoundAccount] = useState<Account | null>(null);

  // Dynamic lookup data via TanStack Query
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const { data: countries = [], isLoading: countriesLoading } = useCountries();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: languages = [], isLoading: languagesLoading } =
    useLanguagesByCountry(values.actum_primarycountry);

  // VAT search mutation
  const vatSearch = useVatSearch();

  // Profile update mutation
  const updateProfile = useUpdateProfile();

  // Clear language if it no longer belongs to the newly selected country
  // This is local form logic, NOT data fetching — stays as useEffect
  useEffect(() => {
    if (!values.actum_primarycountry || languagesLoading) return;

    setValues(prev => {
      // If the country has no languages, clear the selection
      if (languages.length === 0) {
        return prev.actum_language ? { ...prev, actum_language: undefined } : prev;
      }
      const stillValid = languages.some(l => l.actum_languageid === prev.actum_language);
      return stillValid ? prev : { ...prev, actum_language: undefined };
    });
  }, [languages, languagesLoading, values.actum_primarycountry]);

  useEffect(() => {
    if (!currentUser) return;

    setValues({
      ...currentUser,
      // Map the standard OData lookup ID to the field the form uses
      actum_language: currentUser._actum_languageid_value ?? currentUser.actum_language,
    });

    if (currentUser._parentcustomerid_value) {
      setVatSearchState("found");

      // Fetch account to get VAT, company name, and country (needed for language filtering)
      dataverseService.accounts.getById(currentUser._parentcustomerid_value).then(account => {
        if (!account) return;
        setFoundAccount(account);
        setVatInput(account.actum_vatregistrationnumber ?? "");
        setValues(prev => ({
          ...prev,
          actum_companyname: account.name,
          actum_primarycountry: account._actum_primarycountryid_value,
        }));
      });
    }
  }, [currentUser]);

  const handleChange = (field: keyof Contact) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleVatSearch = () => {
    if (!vatInput.trim()) return;
    setVatSearchState("searching");
    setError(null);
    vatSearch.mutate(vatInput.trim(), {
      onSuccess: (account) => {
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
      },
      onError: (err) => {
        setFoundAccount(null);
        setVatSearchState("idle");
        setError(err instanceof Error ? err.message : t("updateProfilePage:messages.vatSearchError"));
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser?.contactid) {
      setError("User session not found. Please refresh and try again.");
      return;
    }

    updateProfile.mutate(
      {
        hasAccount: vatSearchState === "found" ? "YES" : "NO",
        contactId: currentUser.contactid,
        phone: values.telephone1,
        languageId: values.actum_language,
        // found-only
        accountId: foundAccount?.accountid,
        // notFound-only (empty string when account was found)
        vatNumber: vatInput.trim(),
        companyName: values.actum_companyname ?? "",
        countryId: values.actum_primarycountry ?? "",
        companyPhone: values.actum_companyphone ?? "",
        address: values.address1_line1 ?? "",
        city: values.address1_city ?? "",
        zipCode: values.address1_postalcode ?? "",
        companyEmail: values.actum_companyemail ?? "",
        brandIds: (values.actum_brand ?? []).join(","),
        roleId: values.actum_role ?? "",
      },
      {
        onSuccess: async (response) => {
          if (response?.status === "200") {
            toast.success(response.message || t("updateProfilePage:messages.updateSuccess"));

            // Wait a moment for Dataverse to commit the changes
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Refresh user data to get updated profile
            await refreshUser();

            // Redirect to documents
            setTimeout(() => {
              navigate("/documents");
            }, 1000);
          } else if (response?.status === "500") {
            setError(response.message || t("updateProfilePage:messages.updateError"));
          } else {
            setError(t("updateProfilePage:messages.unexpectedError"));
          }
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : t("updateProfilePage:messages.updateFailed"));
        },
      }
    );
  };

  // ── Save button guard ─────────────────────────────────────────────────────
  const updating = updateProfile.isPending;

  const contactFieldsValid =
    !!values.actum_language?.toString().trim() &&
    !!values.telephone1?.toString().trim();

  const vatSearchDone = vatSearchState === "found" || vatSearchState === "notFound";

  // Simplified: only require VAT search completion
  // The flow will handle creating/linking the account and validate required fields
  const companyFieldsValid = vatSearchDone;

  // When profile is complete, only validate language and phone
  const canSave = isProfileComplete
    ? contactFieldsValid
    : contactFieldsValid && companyFieldsValid;

  const companyFieldsVisible = vatSearchState === "notFound" && !isProfileComplete;

  return (
    <Layout>
      <Box sx={{ maxWidth: "87.6rem" }} mx={{ xs: "1rem", md: "auto" }}>
        <Typography
          variant="h2"
          textAlign={isMobile ? "center" : "start"}
          margin={{ xs: "1rem 1rem 2rem", md: "2rem 0 3rem 3rem" }}
        >
          {t("title.completeProfile")}
        </Typography>

        <Paper
          component="form"
          sx={{ padding: { xs: "2rem", md: "3rem" } }}
          noValidate={true}
          onSubmit={handleSubmit}
        >
          {/* ── Contact Details ── */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t("title.completeDetails")}
          </Typography>
          {isProfileComplete && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t("updateProfilePage:messages.profileLockedInfo")}
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InputLabelField
                label={t("fields.email.label")}
                placeholder={t("fields.email.placeholder")}
                value={values.emailaddress1 || ""}
                onChange={handleChange("emailaddress1")}
                fullWidth
                disabled
                helperText=" "
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <InputLabelField
                label={t("fields.phoneNumber.label")}
                placeholder={t("fields.phoneNumber.placeholder")}
                value={values.telephone1 || ""}
                fullWidth
                required
                inputMode="tel"
                onChange={handleChange("telephone1")}
                error={t("validation.phoneNumber")}
              />
            </Grid>
          </Grid>

          {/* ── Company Section ── */}
          <Typography margin="2rem 0" variant="h6">
            {t("section.company_details")}
          </Typography>

          <Grid container spacing={{ xs: 2, md: 4 }} sx={{ mt: 1 }}>
            {/* VAT + Search */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <InputLabelField
                label={t("fields.vat.label")}
                ariaLabel={t("fields.vat.aria")}
                value={vatInput}
                fullWidth
                required={!isProfileComplete}
                disabled={isProfileComplete}
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
                  endAdornment: !isProfileComplete ? (
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
                  ) : undefined,
                }}
              />
            </Grid>

            {/* Company Name — always visible, conditionally editable */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <InputLabelField
                label={t("fields.companyName.label")}
                placeholder={t("fields.companyName.placeholder")}
                ariaLabel={t("fields.companyName.aria")}
                value={values.actum_companyname || ""}
                fullWidth
                required={vatSearchState === "notFound" && !isProfileComplete}
                disabled={vatSearchState === "found" || isProfileComplete}
                onChange={handleChange("actum_companyname")}
                error={t("validation.companyName")}
              />
            </Grid>

            {/* VAT search result message */}
            {!isProfileComplete && vatSearchState === "found" && foundAccount && (
              <Grid size={{ xs: 12 }} sx={{ display: "flex", alignItems: "center", py: 1 }}>
                <Alert severity="success" sx={{ py: 0.5, width: "100%" }}>
                  {t("fields.vat.found", { name: foundAccount.name })}
                </Alert>
              </Grid>
            )}
            {!isProfileComplete && vatSearchState === "notFound" && (
              <Grid size={{ xs: 12 }} sx={{ display: "flex", alignItems: "center", py: 1 }}>
                <Alert severity="info" sx={{ py: 0.5, width: "100%" }}>
                  {t("fields.vat.notFound")}
                </Alert>
              </Grid>
            )}

            {/* Remaining company fields — visible only after search */}
            {companyFieldsVisible && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
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

                <Grid size={{ xs: 12, sm: 6 }}>
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

                <Grid size={{ xs: 12 }}>
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

                <Grid size={{ xs: 12, sm: 6 }}>
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

                <Grid size={{ xs: 12, sm: 6 }}>
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

                <Grid size={{ xs: 12, sm: 6 }}>
                  <InputLabelField
                    label={t("fields.companyEmail.label")}
                    ariaLabel={t("fields.companyEmail.aria")}
                    type="email"
                    value={values.actum_companyemail || ""}
                    onChange={handleChange("actum_companyemail")}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
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

                <Grid size={{ xs: 12, sm: 6 }}>
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
            <Grid size={{ xs: 12, sm: 6 }}>
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

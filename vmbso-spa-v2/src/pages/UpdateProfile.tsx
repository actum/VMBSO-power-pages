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
  Checkbox,
  ListItemText,
} from "@mui/material";
import { Close as CloseIcon, Search as SearchIcon } from "@mui/icons-material";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { type Contact } from "../types/contact";
import { type Account } from "../types/account";
import { type Brand } from "../types/brand";
import { type Country } from "../types/country";
import { type Role } from "../types/role";
import { dataverseService } from "../services/dataverseService";
import { apiClient } from "../services/apiClient";
import { config } from "../config/powerPages.config";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import InputLabelField from "../components/common/ui/InputLabelField";
import { isValidE164, autoFormatPhone } from "../utils/phoneUtils";

type VatSearchState = "idle" | "searching" | "found" | "notFound";

export const UpdateProfile: React.FC = () => {
  const { currentUser, refreshUser, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Partial<Contact>>(currentUser || {});
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [companyFieldsSubmitted, setCompanyFieldsSubmitted] = useState(false);
  const { t } = useTranslation(["updateProfilePage"]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Translation helpers for entity lookups
  const translateCountry = (countryName: string): string => {
    const key = `entities.countries.${countryName}`;
    const translated = t(key);
    return translated === key ? countryName : translated; // Fallback to original if not found
  };

  const translateRole = (roleName: string): string => {
    const normalizedRole = roleName.trim().toLowerCase();
    const roleKeyMap: Record<string, 'distributor' | 'architect' | 'installer'> = {
      distributor: 'distributor',
      distributeur: 'distributor',
      architect: 'architect',
      architecte: 'architect',
      installer: 'installer',
      installateur: 'installer',
    };

    const roleKey = roleKeyMap[normalizedRole];
    if (!roleKey) {
      return roleName;
    }

    const key = `fields.companyRole.options.${roleKey}`;
    const translated = t(key);
    return translated === key ? roleName : translated;
  };

  // Set page title from translation
  useEffect(() => { 
    document.title = t('updateProfilePage:pageTitle');
  }, [t]);

  // VAT search state
  const [vatInput, setVatInput] = useState("");
  const [vatSearchState, setVatSearchState] = useState<VatSearchState>("idle");
  const [foundAccount, setFoundAccount] = useState<Account | null>(null);

  // Dynamic lookup data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

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

  // Clear the selected language if it no longer belongs to the newly selected country
  useEffect(() => {
    const countryId = values.actum_primarycountry;
    if (!countryId) {
      return;
    }
    dataverseService.languages.getByCountry(countryId).then(data => {
      setValues(prev => {
        const stillValid = data.some(l => l.actum_languageid === prev.actum_language);
        return stillValid ? prev : { ...prev, actum_language: undefined };
      });
    });
  }, [values.actum_primarycountry]);

  const handleChange = (field: keyof Contact) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    
    // Reset submitted state when user makes changes
    if (submitted) {
      setSubmitted(false);
    }
    if (companyFieldsSubmitted) {
      setCompanyFieldsSubmitted(false);
    }
    
    // Auto-format phone numbers to E.164 format
    if (field === 'telephone1' || field === 'actum_companyphone') {
      const previousValue = (values[field] as string) || '';
      const formatted = autoFormatPhone(value, previousValue);
      setValues(prev => ({ ...prev, [field]: formatted }));
    } else {
      setValues(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleVatSearch = async () => {
    if (!vatInput.trim()) return;
    setVatSearchState("searching");
    setError(null);
    
    // Reset company fields submitted state when doing new VAT search
    setCompanyFieldsSubmitted(false);
    
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
      setError(err instanceof Error ? err.message : t("updateProfilePage:messages.vatSearchError"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitted(true);

    // Validate required fields
    const contactFieldsValid =
      !!values.telephone1?.toString().trim() &&
      isValidE164(values.telephone1 || '');

    const vatSearchDone = vatSearchState === "found" || vatSearchState === "notFound";
    
    // Company fields validation - includes phone E.164 validation when company fields are visible
    const companyFieldsVisible = vatSearchState === "notFound" && !isProfileComplete;
    
    // Mark company fields as submitted if they're currently visible
    if (companyFieldsVisible) {
      setCompanyFieldsSubmitted(true);
    }
    
    const companyPhoneValid = !companyFieldsVisible || 
      (!!values.actum_companyphone?.toString().trim() && isValidE164(values.actum_companyphone || ''));
    
    const companyFieldsValid = vatSearchDone && companyPhoneValid;

    const isValid = isProfileComplete 
      ? contactFieldsValid
      : contactFieldsValid && companyFieldsValid;

    if (!isValid) {
      setError(t("updateProfilePage:messages.fillRequiredFields"));
      return;
    }

    try {
      setUpdating(true);

      const response = await apiClient.flow<{ status: string; message: string }>(
        config.flows.updateProfile,
        {
          hasAccount: vatSearchState === "found" ? "YES" : "NO",
          contactId: currentUser?.contactid,
          phone: values.telephone1,
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
        }
      );

      // Handle flow response
      if (response?.status === "200") {
        // Success: show message and redirect after refreshing user data
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
        // Error: show error message
        setError(response.message || t("updateProfilePage:messages.updateError"));
      } else {
        // Unexpected response format
        setError(t("updateProfilePage:messages.unexpectedError"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("updateProfilePage:messages.updateFailed"));
    } finally {
      setUpdating(false);
    }
  };

  // Helper for phone field errors - shows E.164 validation errors
  const getPhoneError = (phone: string | undefined, fieldName: string, isCompanyField: boolean = false): string | undefined => {
    // Company fields should only show errors after company fields have been submitted
    if (isCompanyField && !companyFieldsSubmitted) return undefined;
    if (!submitted) return undefined;
    if (!phone || !phone.trim()) return t(`validation.${fieldName}`);
    if (!isValidE164(phone)) {
      return t(`validation.${fieldName}Format`) || 'Phone must be in E.164 format (e.g., +32123456789)';
    }
    return undefined;
  };

  // Helper for VAT field errors
  const getVatError = (): string | undefined => {
    if (!submitted || isProfileComplete) return undefined;
    if (!vatInput.trim()) return t("validation.vat");
    return undefined;
  };

  // Helper for company name field errors
  const getCompanyNameError = (): string | undefined => {
    if (!submitted) return undefined;
    if (isProfileComplete || vatSearchState === "found") return undefined;
    if (vatSearchState === "notFound" && !values.actum_companyname?.trim()) {
      return t("validation.companyName");
    }
    return undefined;
  };

  // Helper for company field errors (country, address, city, zipCode, brand, role)
  const getCompanyFieldError = (fieldValue: any, validationKey: string): string | undefined => {
    if (!companyFieldsSubmitted) return undefined;
    const isEmpty = Array.isArray(fieldValue) ? fieldValue.length === 0 : !fieldValue;
    if (isEmpty) return t(`validation.${validationKey}`);
    return undefined;
  };

  const companyFieldsVisible = vatSearchState === "notFound" && !isProfileComplete;

  return (
    <Layout>
      <Box sx={{ maxWidth: "87.6rem" }} mx={{ xs: "1rem", md: "auto" }}>
        <Typography
          variant="h2"
          textAlign={isMobile ? "center" : "start"}
          margin={{ xs: "1rem 1rem 2rem", md: "2rem 0 3rem 3rem"}}
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
          {isProfileComplete && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t("updateProfilePage:messages.profileLockedInfo")}
            </Alert>
          )}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.email.label")}
                placeholder={t("fields.email.placeholder")}
                value={values.emailaddress1 || ""}
                onChange={handleChange("emailaddress1")}
                fullWidth
                disabled
                disableInternalValidation={true}
                helperText=" "
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.phoneNumber.label")}
                placeholder="+32123456789"
                value={values.telephone1 || ""}
                fullWidth
                required
                inputMode="tel"
                onChange={handleChange("telephone1")}
                error={getPhoneError(values.telephone1, "phoneNumber")}
                disableInternalValidation={true}
              />
            </Grid>
          </Grid>

          {/* â”€â”€ Company Section â”€â”€ */}
          <Typography margin="2rem 0" variant="h6">
            {t("section.company_details")}
          </Typography>

          <Grid container spacing={{ xs: 2, md: 4 }} sx={{ mt: 1 }}>
            {/* VAT Field */}
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.vat.label")}
                ariaLabel={t("fields.vat.aria")}
                value={vatInput}
                fullWidth
                required={!isProfileComplete}
                disabled={isProfileComplete}
                disableInternalValidation={true}
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
                error={getVatError()}
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

            {/* Company Name â€” always visible, conditionally editable */}
            <Grid item xs={12} sm={6}>
              <InputLabelField
                label={t("fields.companyName.label")}
                placeholder={t("fields.companyName.placeholder")}
                ariaLabel={t("fields.companyName.aria")}
                value={values.actum_companyname || ""}
                fullWidth
                required={vatSearchState === "notFound" && !isProfileComplete}
                disabled={vatSearchState === "found" || isProfileComplete}
                disableInternalValidation={true}
                onChange={handleChange("actum_companyname")}
                error={getCompanyNameError()}
              />
            </Grid>

            {/* VAT search result message */}
            {!isProfileComplete && vatSearchState === "found" && foundAccount && (
              <Grid item xs={12} sx={{ display: "flex", alignItems: "center", py: 1 }}>
                <Alert severity="success" sx={{ py: 0.5, width: "100%" }}>
                  {t("fields.vat.found", { name: foundAccount.name })}
                </Alert>
              </Grid>
            )}
            {!isProfileComplete && vatSearchState === "notFound" && (
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
                    disableInternalValidation={true}
                    onChange={handleChange("actum_primarycountry")}
                    error={getCompanyFieldError(values.actum_primarycountry, "primaryCountry")}
                    disabled={countriesLoading}
                  >
                    {countriesLoading
                      ? <MenuItem value=""><CircularProgress size={16} /></MenuItem>
                      : countries.map(c => (
                          <MenuItem key={c.actum_countryid} value={c.actum_countryid}>
                            {translateCountry(c.actum_name)}
                          </MenuItem>
                        ))}
                  </InputLabelField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    label={t("fields.companyPhone.label")}
                    ariaLabel={t("fields.companyPhone.aria")}
                    placeholder="+32123456789"
                    value={values.actum_companyphone || ""}
                    fullWidth
                    required
                    inputMode="tel"
                    disableInternalValidation={true}
                    onChange={handleChange("actum_companyphone")}
                    error={getPhoneError(values.actum_companyphone, "companyPhone", true)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <InputLabelField
                    label={t("fields.address.label")}
                    ariaLabel={t("fields.address.aria")}
                    value={values.address1_line1 || ""}
                    fullWidth
                    required
                    disableInternalValidation={true}
                    onChange={handleChange("address1_line1")}
                    error={getCompanyFieldError(values.address1_line1, "address")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    label={t("fields.city.label")}
                    ariaLabel={t("fields.city.aria")}
                    value={values.address1_city || ""}
                    fullWidth
                    required
                    disableInternalValidation={true}
                    onChange={handleChange("address1_city")}
                    error={getCompanyFieldError(values.address1_city, "city")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    label={t("fields.zipCode.label")}
                    ariaLabel={t("fields.zipCode.aria")}
                    value={values.address1_postalcode || ""}
                    fullWidth
                    required
                    disableInternalValidation={true}
                    onChange={handleChange("address1_postalcode")}
                    error={getCompanyFieldError(values.address1_postalcode, "zipCode")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <InputLabelField
                    label={t("fields.companyEmail.label")}
                    ariaLabel={t("fields.companyEmail.aria")}
                    type="email"
                    value={values.actum_companyemail || ""}
                    disableInternalValidation={true}
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
                    disableInternalValidation={true}
                    onChange={e => {
                      const val = e.target.value;
                      // Reset submitted states when user makes changes
                      if (submitted) setSubmitted(false);
                      if (companyFieldsSubmitted) setCompanyFieldsSubmitted(false);
                      setValues(prev => ({
                        ...prev,
                        actum_brand: typeof val === "string" ? val.split(",") : val as string[],
                      }));
                    }}
                    error={getCompanyFieldError(values.actum_brand, "companyBrand")}
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
                            <Checkbox 
                              checked={(values.actum_brand ?? []).indexOf(b.actum_brandid) > -1} 
                              sx={{ mr: 1 }}
                            />
                            <ListItemText primary={b.actum_name} />
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
                    disableInternalValidation={true}
                    onChange={handleChange("actum_role")}
                    error={getCompanyFieldError(values.actum_role, "companyRole")}
                    disabled={rolesLoading}
                  >
                    {rolesLoading
                      ? <MenuItem value=""><CircularProgress size={16} /></MenuItem>
                      : roles.map(r => (
                          <MenuItem key={r.actum_roleid} value={r.actum_roleid}>
                            {translateRole(r.actum_name)}
                          </MenuItem>
                        ))}
                  </InputLabelField>
                </Grid>
              </>
            )}
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
              disabled={updating}
            >
              {updating ? t("action.updating") : t("action.update")}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
};
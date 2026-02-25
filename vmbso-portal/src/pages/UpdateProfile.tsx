import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  Box,
  TextField,
  Grid,
  Button,
  Alert,
  MenuItem,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { Contact } from "../types/contact";
import { authService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { ContactLanguage } from "../types/auth";

export const UpdateProfile: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Partial<Contact>>({});
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const languages = useMemo<Record<ContactLanguage, string>>(() => ({
    fr: "France = French only",
    be: "Belgium = French/Dutch",
  }), [currentUser]);

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

  return (
    <Layout>
      <Typography variant="h4" gutterBottom textAlign={"center"}>
        Complete your profile
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: "876px", margin: "auto" }}>
        {error && <Alert action={<IconButton size="small" onClick={() => setError(null)}><CloseIcon/></IconButton>} severity="error">{error}</Alert>}

        <Typography variant="h6" sx={{ mt: 2 }}>
          Contact details
        </Typography>
        <Grid container spacing={4} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Language"
              aria-label="Language"
              value={values.actum_language || ""}
              onChange={handleChange("actum_language")}
              fullWidth
              required
            >
              {Object.entries(languages).map(([key, value]) => <MenuItem aria-label={`Set ${value}`} value={key}>{value}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} />
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              value={values.emailaddress1 || ""}
              onChange={handleChange("emailaddress1")}
              fullWidth
              disabled
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              value={values.actum_phone || ""}
              onChange={handleChange("actum_phone")}
              fullWidth
              required
              inputMode="tel"
            />
          </Grid>
        </Grid>
        <Box
          sx={{
            mt: 4,
            borderTop: "1px solid #c0c0c0",
            pt: 2
          }}
          />
        <Typography variant="h6">
          Company details
        </Typography>
        <Grid container spacing={4} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Company Name"
              aria-label="Company Name"
              value={values.actum_companyname || ""}
              onChange={handleChange("actum_companyname")}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="VAT"
              aria-label="Company VAT"
              value={values.actum_vat || ""}
              onChange={handleChange("actum_vat")}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Primary Country"
              aria-label="Company primary Country"
              value={values.actum_primarycountry || ""}
              onChange={handleChange("actum_primarycountry")}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              aria-label="Company phone Number"
              value={values.actum_companyphone || ""}
              onChange={handleChange("actum_companyphone")}
              fullWidth
              required
              inputMode="tel"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address"
              aria-label="Company address"
              value={values.actum_address || ""}
              onChange={handleChange("actum_address")}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              SelectProps={{
                multiple: true,
              }}
              label="Brand"
              aria-label="Company brand"
              value={values.actum_brand || [""]}
              onChange={handleChange("actum_brand")}
              fullWidth
              required
            >
              <MenuItem value="Resitrix">Resitrix</MenuItem>
              <MenuItem value="VMZINC">VMZINC</MenuItem>
              <MenuItem value="Mastersystems">Mastersystems</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Role"
              aria-label="Company role"
              value={values.actum_role || ""}
              onChange={handleChange("actum_role")}
              fullWidth
              required
            >
              <MenuItem value="Distributor">Distributor</MenuItem>
              <MenuItem value="Architect">Architect</MenuItem>
              <MenuItem value="Installer">Installer</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Company Email"
              aria-label="Company email"
              type="email"
              value={values.actum_companyemail || ""}
              onChange={handleChange("actum_companyemail")}
              fullWidth
            />
          </Grid>
        </Grid>

        <Box display="flex" justifyContent={"flex-end"} sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={updating}>
            {updating ? "Updating…" : "Update"}
          </Button>
        </Box>
      </Box>
    </Layout>
  );
};

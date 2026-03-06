import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Link,
  Alert,
  CircularProgress,
  Grid,
  MenuItem,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const Register: React.FC = () => {
  const { register, loading } = useAuth();
  const { t } = useTranslation("register");
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    emailaddress1: '',
    password: '',
    confirmPassword: '',
    country: '',
    role: '',
  });
  const [error, setError] = useState('');

  const countries = [
    { value: 'DK', label: t("options.countries.DK") },
    { value: 'FR', label: t("options.countries.FR") },
    { value: 'DE', label: t("options.countries.DE") },
    { value: 'NL', label: t("options.countries.NL") },
    { value: 'BE', label: t("options.countries.BE") },
  ];

  const roles = [
    { value: 'architect', label: t("options.roles.architect") },
    { value: 'distributor', label: t("options.roles.distributor") },
    { value: 'installer', label: t("options.roles.installer") },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (
      !formData.firstname ||
      !formData.lastname ||
      !formData.emailaddress1 ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError(t("validation.allFieldsRequired"));
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.emailaddress1)) {
      setError(t("validation.invalidEmail"));
      return;
    }

    if (formData.password.length < 8) {
      setError(t("validation.passwordTooShort"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("validation.passwordMismatch"));
      return;
    }

    try {
      await register(formData);
    } catch (err) {
      // Error is already handled in AuthContext with toast
      setError(t("errors.registrationFailed"));
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="md" sx={{ my: 'auto', py: 4 }}>
        <Paper sx={{ p: 6 }}>
          {/* Logo */}
          <Box sx={{ mb: 4 }}>
            <img
              src="/images/logo-vmbso.svg"
              alt="VMBSO"
              style={{ height: 40 }}
            />
          </Box>

          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            {t("title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {t("subtitle")}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '0.05rem',
                  }}
                >
                  {t("fields.firstName.label")} *
                </Typography>
                <TextField
                  fullWidth
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '0.05rem',
                  }}
                >
                  {t("fields.lastName.label")} *
                </Typography>
                <TextField
                  fullWidth
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '0.05rem',
                  }}
                >
                  {t("fields.email.label")} *
                </Typography>
                <TextField
                  fullWidth
                  name="emailaddress1"
                  type="email"
                  value={formData.emailaddress1}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder={t("fields.email.placeholder")}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '0.05rem',
                  }}
                >
                  {t("fields.password.label")} *
                </Typography>
                <TextField
                  fullWidth
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  helperText={t("fields.password.helper")}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '0.05rem',
                  }}
                >
                  {t("fields.confirmPassword.label")} *
                </Typography>
                <TextField
                  fullWidth
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '0.05rem',
                  }}
                >
                  {t("fields.country.label")}
                </Typography>
                <TextField
                  fullWidth
                  select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                    },
                  }}
                >
                  {countries.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '0.05rem',
                  }}
                >
                  {t("fields.role.label")}
                </Typography>
                <TextField
                  fullWidth
                  select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                    },
                  }}
                >
                  {roles.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : t("actions.register")}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link
                component={RouterLink}
                to="/login"
                color="primary"
                sx={{
                  fontSize: '0.875rem',
                }}
              >
                {t("actions.alreadyRegistered")}
              </Link>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

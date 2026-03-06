import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Link,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import InputLabelField from '../components/common/ui/InputLabelField';

export const Login: React.FC = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { t } = useTranslation("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      // Error is already handled in AuthContext with toast
      setError('Login failed. Please check your credentials.');
    }
  };

  const invalidFields = !email || !password;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg" sx={{ my: 'auto' }}>
        <Grid container spacing={0} sx={{ minHeight: '60rem' }}>
          {/* Left side - Form */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: "3rem",
                borderRadius: { xs: '0.8rem', md: '0.8rem 0 0 0.8rem' },
              }}
            >
              {/* Logo */}
              <Box sx={{ mb: 4 }}>
                <img
                  src="/images/logo-vmbso.svg"
                  alt="VMBSO"
                  style={{ height: "2.6rem" }}
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
                <Box sx={{ mb: 5 }}>
                  <InputLabelField
                    label={t("fields.email.label")}
                    type="email"
                    aria-label={t("fields.email.aria")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                    placeholder={t("fields.email.placeholder")}
                    error={t("validation.email")}
                  />
                </Box>

                <Box sx={{ mb: 8 }}>
                  <InputLabelField
                    label={t("fields.password.label")}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    placeholder="******"
                    error={t("validation.password")}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || invalidFields}
                  size="large"
                  sx={{
                    textTransform: 'none',
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : t("actions.login")}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 5 }}>
                  <Link
                    href="#"
                    color="primary"
                  >
                    {t("actions.forgotPassword")}
                  </Link>
                </Box>
              </form>

              <Box sx={{ mt: "4rem", pt: "3rem", borderTop: '0.1rem solid #e0e0e0' }}>
                <Typography variant="h4" sx={{ mb: "2rem", fontWeight: 600 }}>
                  {t("firstVisit.title")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: "2rem" }}>
                  {t("firstVisit.subtitle")}
                </Typography>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="outlined"
                >
                  {t("actions.createAccount")}
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Right side - Image */}
          <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #5b9bd5 0%, #4a7fa8 100%)',
                borderRadius: '0 0.8rem 0.8rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: 'url(https://site-alfw4.powerappsportals.com/building-hero.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '0.4rem',
                  bgcolor: 'rgba(91, 155, 213, 0.3)',
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

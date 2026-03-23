import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  CircularProgress,
  Alert,
  // Tooltip,
  // IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/powerPages.config';
import { getCsrfToken } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguagePicker from '../components/common/LanguagePicker';
// import { Cookie as CookieIcon } from '@mui/icons-material'
// import { CookiesContext } from '../contexts/CookiesContext';

export const Login: React.FC = () => {
  const { isAuthenticated, loading, isProfileComplete, isRejected } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["loginPage", "cookies"]);
  //const { setDialogOpen } = useContext(CookiesContext);
  const [loginLoading, setLoginLoading] = React.useState(false);

  React.useEffect(() => { 
    document.title = t('loginPage:pageTitle');
  }, [t]);

  // Auto-redirect authenticated users (rejected users stay on login to see the error)
  React.useEffect(() => {
    if (!loading && isAuthenticated && !isRejected) {
      if (config.devMode) {
        console.log(
          '[LOGIN] User already authenticated, redirecting to',
          isProfileComplete === false ? '/update-profile' : '/'
        );
      }
      if (isProfileComplete === false) {
        navigate('/update-profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isProfileComplete, isRejected, loading, navigate]);

  /**
   * Initiate Entra External ID authentication via a hidden form POST to
   * /Account/Login/ExternalLogin. Power Pages then issues a 302 redirect
   * directly to Entra External ID — no intermediate sign-in page.
   */
  const submitExternalLogin = async (extraParams?: Record<string, string>) => {
    if (config.devMode) {
      console.log('[LOGIN DEBUG] DEV MODE: Redirecting to /');
      window.location.href = '/';
      return;
    }

    try {
      setLoginLoading(true);
      const token = await getCsrfToken();

      const form = document.createElement('form');
      form.method = 'POST';
      // Extra params (e.g. prompt=create) go in the query string of the action URL.
      // Power Pages reads these from the URL and forwards them to the Entra authorization request.
      form.action = extraParams
        ? `${config.auth.externalLoginUrl}?${new URLSearchParams(extraParams).toString()}`
        : config.auth.externalLoginUrl;

      const fields: Record<string, string> = {
        provider: config.auth.providerScheme,
        returnUrl: config.auth.returnUrl,
        __RequestVerificationToken: token,
      };

      for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error('[LOGIN DEBUG] ExternalLogin form POST failed:', err);
      setLoginLoading(false);
      // Fallback: redirect to /SignIn so the user is not stuck
      window.location.href = '/SignIn';
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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
          {/* Left side - Actions */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 6,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderRadius: { xs: '0.8rem', md: '0.8rem 0 0 0.8rem' },
              }}
            >
              {/* Language picker */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <LanguagePicker />
              </Box>

              {/* Logo */}
              <Box sx={{ mb: 4 }}>
                <img
                  src="/images/logo-vmbso.svg"
                  alt="VMBSO"
                  style={{ height: "2.6rem" }}
                />
              </Box>

              {/* Rejected account alert */}
              {isRejected && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {t("loginPage:rejected.message")}
                </Alert>
              )}

                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  {t("loginPage:title")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  {t("loginPage:subtitle")}
                </Typography>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => submitExternalLogin()}
                disabled={loginLoading}
                sx={{
                  textTransform: 'none',
                  minHeight: '5.6rem',
                }}
              >
                {loginLoading ? <CircularProgress size={24} color="inherit" /> : t("loginPage:actions.login")}
              </Button>

              <Box sx={{ mt: 4, pt: 4, borderTop: '0.1rem solid #e0e0e0' }}>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                  {t("loginPage:firstVisit.title")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ my: 4 }}>
                  {t("loginPage:firstVisit.subtitle")}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => submitExternalLogin({ prompt: 'create' })}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  {t("loginPage:actions.createAccount")}
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
                  backgroundImage: `url(${config.assets.loginHeroImage})`,
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

      {/* <Tooltip arrow title={t("cookies:actions.openCookiesTooltip")}>
        <IconButton
          onClick={() => setDialogOpen(prev => !prev)}
          sx={{
            position: "fixed",
            bottom: "1rem",
            left: "1rem",
            width: "4rem",
            height: "4rem"
          }}
        >
          <CookieIcon color="secondary" sx={{ width: "4rem", height: "4rem" }}/>
        </IconButton>
      </Tooltip> */}
    </Box>
  );
};


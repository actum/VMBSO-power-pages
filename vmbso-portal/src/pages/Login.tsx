import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/powerPages.config';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect authenticated users
  React.useEffect(() => {
    console.log('[LOGIN DEBUG] Auto-redirect effect:', { loading, isAuthenticated, isProfileComplete });
    
    if (loading) {
      console.log('[LOGIN DEBUG] Still loading, waiting...');
      return; // Wait for session check to complete
    }

    if (isAuthenticated) {
      console.log('[LOGIN DEBUG] User is authenticated, redirecting...');
      // User is already logged in, redirect appropriately
      if (!isProfileComplete) {
        console.log('[LOGIN DEBUG] Profile incomplete, redirecting to /update-profile');
        navigate('/update-profile', { replace: true });
      } else {
        console.log('[LOGIN DEBUG] Profile complete, redirecting to /documents');
        navigate('/documents', { replace: true });
      }
    } else {
      console.log('[LOGIN DEBUG] User NOT authenticated, staying on /login');
    }
  }, [isAuthenticated, isProfileComplete, loading, navigate]);

  /**
   * Initiate Entra External ID authentication.
   *
   * Since Power Pages /SignIn doesn't auto-redirect (even with LoginButtonAuthenticationType set),
   * we simply redirect to /SignIn where the user clicks the Entra External ID button.
   *
   * This is the simplest approach that works reliably without needing anti-forgery tokens
   * or complex form submissions.
   */
  const submitExternalLogin = () => {
    if (config.devMode) {
      console.log('[LOGIN DEBUG] DEV MODE: Redirecting to /documents');
      window.location.href = '/documents';
      return;
    }

    console.log('[LOGIN DEBUG] Redirecting to /SignIn');
    // Redirect to Power Pages /SignIn page
    // User will see the Entra External ID button and click it (one extra click)
    // After clicking, Power Pages handles the full OpenID Connect flow
    window.location.href = '/SignIn';
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
              {/* Logo */}
              <Box sx={{ mb: 4 }}>
                <img
                  src="/images/logo-vmbso.svg"
                  alt="VMBSO"
                  style={{ height: "2.6rem" }}
                />
              </Box>

              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Identifiez-vous
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Bienvenue ! Identifiez-vous pour consulter les documents qui vous sont dédiés.
              </Typography>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={submitExternalLogin}
                sx={{
                  textTransform: 'none',
                  minHeight: '5.6rem',
                }}
              >
                Identifiez-vous
              </Button>

              <Box sx={{ mt: 4, pt: 3, borderTop: '0.1rem solid #e0e0e0' }}>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                  Première visite ?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Cet espace est réservé aux distributeurs VMZINC. Faites une demande pour avoir accès à votre espace.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={submitExternalLogin}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Créer un compte
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
    </Box>
  );
};


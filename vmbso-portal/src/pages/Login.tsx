import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
} from '@mui/material';

export const Login: React.FC = () => {
  const handleSignIn = () => {
    window.location.href = '/signin';
  };

  const handleRegister = () => {
    window.location.href = '/register';
  };

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
                onClick={handleSignIn}
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
                  onClick={handleRegister}
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


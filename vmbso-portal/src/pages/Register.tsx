import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
} from '@mui/material';

export const Register: React.FC = () => {
  const handleRegister = () => {
    window.location.href = '/register';
  };

  const handleSignIn = () => {
    window.location.href = '/signin';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm" sx={{ my: 'auto', py: 4 }}>
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
            Première visite ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Cet espace est réservé aux distributeurs VMZINC. Faites une demande pour avoir accès à votre espace. Vous serez redirigé vers notre portail sécurisé pour créer votre compte.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleRegister}
            sx={{
              py: 2,
              fontSize: '1rem',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: '56px',
              mb: 2,
            }}
          >
            Créer un compte
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="text"
              onClick={handleSignIn}
              sx={{
                color: 'primary.main',
                textTransform: 'none',
                fontSize: '0.875rem',
              }}
            >
              Déjà inscrit ? Identifiez-vous
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

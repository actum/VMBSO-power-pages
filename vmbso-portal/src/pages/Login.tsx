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
  InputLabel,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Box sx={{ mb: 2 }}>
                  <InputLabel>EMAIL *</InputLabel>
                  <TextField
                    fullWidth
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                    placeholder="email@email.com"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f5f5f5',
                        '& fieldset': {
                          borderColor: '#e0e0e0',
                        },
                      },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <InputLabel>MOT DE PASSE *</InputLabel>
                  <TextField
                    fullWidth
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    placeholder="******"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f5f5f5',
                        '& fieldset': {
                          borderColor: '#e0e0e0',
                        },
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    mb: 1,
                    py: 2,
                    fontSize: '1rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    minHeight: '5.6rem',
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Identifiez-vous'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Link
                    href="#"
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Mot de passe oublié ?
                  </Link>
                </Box>
              </form>

              <Box sx={{ mt: 4, pt: 3, borderTop: '0.1rem solid #e0e0e0' }}>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                  Première visite ?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Cet espace est réservé aux distributeurs VMZINC. Faites une demande pour avoir accès à votre espace.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="outlined"
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

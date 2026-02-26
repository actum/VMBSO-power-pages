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

// Mock data - will be replaced with actual Dataverse data later
const countries = [
  { value: 'DK', label: 'Denmark' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
];

const roles = [
  { value: 'architect', label: 'Architect' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'installer', label: 'Installer' },
];

export const Register: React.FC = () => {
  const { register, loading } = useAuth();
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
      setError('Please fill in all required fields');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.emailaddress1)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await register(formData);
    } catch (err) {
      // Error is already handled in AuthContext with toast
      setError('Registration failed. Please try again.');
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
            Première visite ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Cet espace est réservé aux distributeurs VMZINC. Faites une demande pour avoir accès à votre espace.
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
                  PRÉNOM *
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
                  NOM *
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
                  EMAIL *
                </Typography>
                <TextField
                  fullWidth
                  name="emailaddress1"
                  type="email"
                  value={formData.emailaddress1}
                  onChange={handleChange}
                  required
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
                  MOT DE PASSE *
                </Typography>
                <TextField
                  fullWidth
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  helperText="Minimum 8 caractères"
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
                  CONFIRMER MOT DE PASSE *
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
                  PAYS
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
                  RÔLE
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
              size="large"
              disabled={loading}
              sx={{
                mt: 4,
                mb: 2,
                py: 2,
                fontSize: '1rem',
                fontWeight: 500,
                textTransform: 'none',
                minHeight: '5.6rem',
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "S'inscrire"}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link
                component={RouterLink}
                to="/login"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Déjà inscrit ? Identifiez-vous
              </Link>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};
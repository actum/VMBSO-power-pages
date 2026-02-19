import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  TextField,
  Grid,
  Button,
  Alert,
  MenuItem,
} from '@mui/material';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Contact } from '../types/contact';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // basic client-side validation for required fields
    const required: Array<keyof Contact> = [
      'actum_language',
      'actum_companyname',
      'actum_vat',
      'actum_primarycountry',
      'actum_companyphone',
      'actum_address',
      'actum_role',
      'actum_brand',
    ];

    for (const key of required) {
      if (!values[key] || values[key]?.toString().trim() === '') {
        setError('Please fill in all required fields.');
        return;
      }
    }

    try {
      setSaving(true);
      await authService.updateProfile({
        contactid: "currentUser?.contactid",
        ...values,
      });
      await refreshUser();
      navigate('/documents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Typography variant="h4" gutterBottom>
          Complete your profile
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}

        <Typography variant="h6" sx={{ mt: 2 }}>
          Contact details
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Language"
              value={values.actum_language || ''}
              onChange={handleChange('actum_language')}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              value={values.actum_phone || ''}
              onChange={handleChange('actum_phone')}
              fullWidth
              required
              type='number'
              inputMode='tel'
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              value={values.emailaddress1 || ''}
              onChange={handleChange('emailaddress1')}
              fullWidth
              disabled
            />
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 4 }}>
          Company details
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Company Name"
              value={values.actum_companyname || ''}
              onChange={handleChange('actum_companyname')}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="VAT"
              value={values.actum_vat || ''}
              onChange={handleChange('actum_vat')}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Primary Country"
              value={values.actum_primarycountry || ''}
              onChange={handleChange('actum_primarycountry')}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              value={values.actum_companyphone || ''}
              onChange={handleChange('actum_companyphone')}
              fullWidth
              required
              type='number'
              inputMode='decimal'
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address"
              aria-label='Company address'
              value={values.actum_address || ''}
              onChange={handleChange('actum_address')}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Company Email"
              aria-label='Company email'
              type="email"
              value={values.actum_companyemail || ''}
              onChange={handleChange('actum_companyemail')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Role"
              aria-label='Company role'
              value={values.actum_role || ''}
              onChange={handleChange('actum_role')}
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
              select
              SelectProps={{
                multiple: true,
              }}
              label="Brand"
              value={values.actum_brand || []}
              onChange={handleChange('actum_brand')}
              fullWidth
              required
            >
              <MenuItem value="VMZINC">VMZINC</MenuItem>
              <MenuItem value="Resitrix">Resitrix</MenuItem>
              <MenuItem value="Mastersystems">Mastersystems</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </Box>
    </Layout>
  );
};

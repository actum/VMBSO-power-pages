import React from 'react';
import { Typography, Box } from '@mui/material';
import { Layout } from '../components/Layout';

export const Profile: React.FC = () => {
  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Profile Page
        </Typography>
        <Typography variant="body1" color="text.secondary">
          User profile information will be implemented in Module 6
        </Typography>
      </Box>
    </Layout>
  );
};

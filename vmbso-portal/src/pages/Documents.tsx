import React from 'react';
import { Typography, Box } from '@mui/material';
import { Layout } from '../components/Layout';

export const Documents: React.FC = () => {
  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Documents Page
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Document list with MUI DataGrid will be implemented in Module 4
        </Typography>
      </Box>
    </Layout>
  );
};

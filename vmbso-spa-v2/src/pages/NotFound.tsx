import React from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  React.useEffect(() => { document.title = 'Page Not Found | VMBSO Customer Portal'; }, []);

  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h3" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          The page you are looking for doesn't exist or has been moved.
        </Typography>
        <Box>
          <Button variant="contained" onClick={() => navigate('/documents')}>
            Go to Documents
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)} sx={{ ml: 2 }}>
            Go Back
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

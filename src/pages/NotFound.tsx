import React, { useEffect } from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("notFoundPage");
  
  React.useEffect(() => { 
    document.title = t('pageTitle');
  }, [t]);

  useEffect(() => { document.title = t('pageTitle'); }, [t]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h3" gutterBottom>
          {t("code")}
        </Typography>
        <Typography variant="h5" gutterBottom>
          {t("title")}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t("description")}
        </Typography>
        <Box>
          <Button variant="contained" onClick={() => navigate('/documents')}>
            {t("actions.goToDocuments")}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)} sx={{ ml: 2 }}>
            {t("actions.back")}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

import React, { useState } from 'react';
import { Typography, Box, TextField, CircularProgress, Alert, Button } from '@mui/material';
import { Layout } from '../components/Layout';
import { useDocuments } from '../hooks/useDocuments';
import { type DocumentFilters } from '../types/document';
import { useTranslation } from 'react-i18next';

export const Documents: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<DocumentFilters>({});
  const { documents, loading, error, refetch } = useDocuments(filters);
  const { t } = useTranslation("documents");

  const handleSearch = () => {
    setFilters({ searchText });
  };

  const handleClearSearch = () => {
    setSearchText('');
    setFilters({});
  };

  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          {t("documentsSearch.label")}
        </Typography>

        {/* Search Controls */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            placeholder={t("documentsSearch.placeholder")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            size="small"
            fullWidth
          />
          <Button variant="contained" onClick={handleSearch} disabled={loading}>
            {t("actions.search")}
          </Button>
          <Button variant="outlined" onClick={handleClearSearch} disabled={loading}>
            {t("actions.clear")}
          </Button>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => refetch()}>
            {error}
          </Alert>
        )}

        {/* Documents List */}
        {!loading && !error && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("documentsList.results")}
            </Typography>

            {documents.length === 0 ? (
              <Alert severity="info">{t("validation.noDocumentsFound")}</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {documents.map((doc) => (
                  <Box
                    key={doc.actum_clientdocumentid}
                    sx={{
                      p: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <Typography variant="h6">{doc.actum_name}</Typography>
                    {doc.actum_account && (
                      <Typography variant="body2" color="text.secondary">
                        {t("account.name")}: {doc.actum_account.name}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {t("account.created")}: {new Date(doc.createdon).toLocaleDateString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Layout>
  );
};

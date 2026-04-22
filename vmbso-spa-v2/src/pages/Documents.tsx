import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
  Typography,
  Box,
  TextField,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Modal,
  Backdrop,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Drawer,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  DownloadOutlined,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  UploadFileOutlined,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../contexts/AuthContext';
import { dataverseService } from '../services/dataverseService';
import { useTranslation } from 'react-i18next';
import { type DocumentWithBrands } from '../types/document';
import { LoadingModal } from '../components/common/ui/LoadingModal';

const ClampedDescription = styled('div')(({ theme }) => ({
  ...theme.typography.body2,
  color: theme.palette.text.secondary,
  lineHeight: 1.5,
  marginBottom: '20px',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}));

// Rotating palette for brand chips (cycles if more than 4 distinct brands)
const BRAND_CHIP_COLORS = [
  { bg: '#eeedfe', color: '#534ab7' },
  { bg: '#e6f1fb', color: '#185fa5' },
  { bg: '#e1f5ee', color: '#0f6e56' },
  { bg: '#fef3e2', color: '#8a5c00' },
];

export const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedDocTypes, setSelectedDocTypes] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { documents, loading, error, refetch } = useDocuments();
  const { currentUser } = useAuth();
  const { t } = useTranslation('documentsPage');

  React.useEffect(() => {
    document.title = t('pageTitle');
  }, [t]);

  // Derive unique brands with stable color assignments
  const allBrands = useMemo(() => {
    const map = new Map<string, string>();
    documents.forEach(doc => {
      doc.brands.forEach(b => { if (b.id) map.set(b.id, b.name); });
    });
    return Array.from(map.entries()).map(([id, name], i) => ({
      id,
      name,
      colors: BRAND_CHIP_COLORS[i % BRAND_CHIP_COLORS.length],
    }));
  }, [documents]);

  // Derive unique document types
  const allDocTypes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    documents.forEach(doc => {
      doc.documentTypes.forEach(dt => { if (dt.id) map.set(dt.id, dt); });
    });
    return Array.from(map.values());
  }, [documents]);

  // Color lookup by brand ID
  const brandColorMap = useMemo(() => {
    const map = new Map<string, typeof BRAND_CHIP_COLORS[0]>();
    allBrands.forEach(b => map.set(b.id, b.colors));
    return map;
  }, [allBrands]);

  const isBrandChecked = (brandId: string) =>
    selectedBrands.size === 0 || selectedBrands.has(brandId);

  const isDocTypeChecked = (id: string) =>
    selectedDocTypes.size === 0 || selectedDocTypes.has(id);

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev => {
      if (prev.size === 0) {
        // Transition from "all" to "all except this one"
        const next = new Set(allBrands.map(b => b.id));
        next.delete(brandId);
        return next;
      }
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
        if (next.size === allBrands.length) return new Set(); // back to "all"
      }
      return next;
    });
  };

  const toggleDocType = (id: string) => {
    setSelectedDocTypes(prev => {
      if (prev.size === 0) {
        const next = new Set(allDocTypes.map(d => d.id));
        next.delete(id);
        return next;
      }
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (next.size === allDocTypes.length) return new Set();
      }
      return next;
    });
  };

  // Client-side filtering
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Brand filter
      if (selectedBrands.size > 0 && !doc.brands.some(b => selectedBrands.has(b.id))) return false;
      // Document type filter
      if (
        selectedDocTypes.size > 0 &&
        !doc.documentTypes.some(dt => selectedDocTypes.has(dt.id))
      ) return false;
      // Search
      if (searchText.trim()) {
        const s = searchText.toLowerCase();
        if (
          !doc.actum_name?.toLowerCase().includes(s) &&
          !doc.actum_filename?.toLowerCase().includes(s) &&
          !doc.actum_description?.toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [documents, selectedBrands, selectedDocTypes, searchText]);

  const formatDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  const handleDownload = async (doc: DocumentWithBrands) => {
    if (!currentUser?.contactid) {
      toast.error(t('errors.notAuthenticated'));
      return;
    }

    try {
      setDownloadingDocId(doc.actum_productdocumentationid);
      setIsPreparingDownload(true);

      console.log('[DOWNLOAD] Creating download log for document:', doc.actum_productdocumentationid);
      const downloadLog = await dataverseService.downloadLogs.create(
        currentUser.contactid,
        doc.actum_productdocumentationid,
      );
      console.log('[DOWNLOAD] Download log created - Full response:', downloadLog);
      console.log('[DOWNLOAD] Download log ID:', downloadLog.actum_downloadlogid);

      if (!downloadLog.actum_downloadlogid) {
        throw new Error('Download log created but no ID returned');
      }

      const startTime = Date.now();
      const pollInterval = 3000;
      const timeout = 60000;
      let pollAttempt = 0;

      const poll = (): void => {
        pollAttempt++;
        const elapsed = Date.now() - startTime;
        console.log(`[DOWNLOAD] Polling attempt ${pollAttempt} (elapsed: ${Math.round(elapsed / 1000)}s)`);

        if (elapsed > timeout) {
          console.error('[DOWNLOAD] Timeout reached after', pollAttempt, 'attempts');
          setDownloadingDocId(null);
          setIsPreparingDownload(false);
          toast.error(t('errors.timeout'));
          return;
        }

        dataverseService.downloadLogs.getById(downloadLog.actum_downloadlogid)
          .then(log => {
            console.log('[DOWNLOAD] Poll response:', {
              hasSasToken: !!log.actum_sastoken,
              tokenPreview: log.actum_sastoken ? log.actum_sastoken.substring(0, 50) + '...' : null,
            });

            if (log.actum_sastoken) {
              console.log('[DOWNLOAD] SAS token ready, triggering download');
              setDownloadingDocId(null);
              setIsPreparingDownload(false);

              const link = document.createElement('a');
              link.href = log.actum_sastoken;
              link.download = doc.actum_filename || 'download';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              console.log('[DOWNLOAD] Download triggered successfully');
            } else {
              console.log(`[DOWNLOAD] No SAS token yet, will poll again in ${pollInterval / 1000}s`);
              setTimeout(() => poll(), pollInterval);
            }
          })
          .catch(pollError => {
            console.error('[DOWNLOAD] Error during polling:', pollError);
            if (elapsed < timeout) {
              console.log('[DOWNLOAD] Will retry polling despite error');
              setTimeout(() => poll(), pollInterval);
            } else {
              setDownloadingDocId(null);
              setIsPreparingDownload(false);
              toast.error(t('errors.statusCheck'));
            }
          });
      };

      console.log('[DOWNLOAD] Starting polling...');
      poll();
    } catch (error) {
      setDownloadingDocId(null);
      setIsPreparingDownload(false);
      console.error('Download error:', error);
      toast.error(t('errors.downloadFailed'));
    }
  };

  // Shared filter panel JSX used in both sidebar and mobile drawer
  const renderFilterPanel = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', display: 'block', mb: 1, fontSize: '10px' }}
        >
          {t('filters.brand')}
        </Typography>
        <FormGroup>
          {allBrands.map(brand => (
            <FormControlLabel
              key={brand.id}
              sx={{ m: 0, py: '2px' }}
              control={
                <Checkbox
                  size="small"
                  checked={isBrandChecked(brand.id)}
                  onChange={() => toggleBrand(brand.id)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#444' }}>
                  {brand.name}
                </Typography>
              }
            />
          ))}
        </FormGroup>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', display: 'block', mb: 1, fontSize: '10px' }}
        >
          {t('filters.fileType')}
        </Typography>
        <FormGroup>
          {allDocTypes.map(dt => (
            <FormControlLabel
              key={dt.id}
              sx={{ m: 0, py: '2px' }}
              control={
                <Checkbox
                  size="small"
                  checked={isDocTypeChecked(dt.id)}
                  onChange={() => toggleDocType(dt.id)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#444' }}>
                  {dt.name}
                </Typography>
              }
            />
          ))}
        </FormGroup>
      </Box>
    </Box>
  );

  return (
    <Layout>
      {/* Full-screen download preparing overlay */}
      <LoadingModal 
        open={isPreparingDownload}
        title={t('download.preparing')}
        subtitle={t('download.preparingSubtext')}
      />

      {/* Page layout: sidebar + main */}
      <Box sx={{ display: 'flex', minHeight: '60vh', mx: -3 }}>

        {/* Desktop sidebar */}
        <Box
          sx={{
            width: 220,
            flexShrink: 0,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
            px: 3,
            py: 3,
          }}
        >
          {renderFilterPanel()}
        </Box>

        {/* Main content */}
        <Box sx={{ flex: 1, px: { xs: 6, md: 4 }, py: 1 }}>

          {/* Mobile: filters button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<FilterListIcon />}
              onClick={() => setDrawerOpen(true)}
              sx={{ fontSize: '14px', textTransform: 'none' }}
            >
              {t('filters.button')}
            </Button>
          </Box>

          {/* Mobile: filters drawer */}
          <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <Box sx={{ width: 280, p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('filters.button')}</Typography>
                <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
              {renderFilterPanel()}
            </Box>
          </Drawer>

          {/* Invoices redirect icon button TODO: When design is provided, change this */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
            }}
          >
            <Typography variant="h4" sx={{ mb: 0 }}>
              {t('documentsSearch.label')}
            </Typography>
            <Tooltip title={t('documentsSearch.tooltip')}>
              <IconButton
                color="primary"
                onClick={() => navigate('/invoice')}
                aria-label={t('actions.uploadPdf')}
              >
                <UploadFileOutlined />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Results bar: count + search */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('documentsList.results', { count: filteredDocuments.length })}
            </Typography>
            <TextField
              placeholder={t('documentsSearch.placeholder')}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 260 } }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} />,
                endAdornment: searchText ? (
                  <IconButton size="small" onClick={() => setSearchText('')} edge="end">
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                ) : null,
              }}
            />
          </Box>

          {/* Loading state */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error state */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => refetch()}>
              {error}
            </Alert>
          )}

          {/* Empty state */}
          {!loading && !error && filteredDocuments.length === 0 && (
            <Alert severity="info">{t('validation.noDocumentsFound')}</Alert>
          )}

          {/* Document cards */}
          {!loading && !error && filteredDocuments.length > 0 && (
            <Grid container spacing={2}>
              {filteredDocuments.map(doc => (
                <Grid item xs={12} sm={6} md={4} key={doc.actum_productdocumentationid}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 2px 12px rgba(0, 144, 178, 0.1)',
                      },
                    }}
                  >
                    <CardContent sx={{ flex: 1, pb: 0, px: 2.5, pt: 2.5 }}>
                      {/* Extension badge + brand chips */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 1,
                          flexWrap: 'wrap',
                          mb: 2,
                        }}
                      >
                        {doc.actum_fileextension && (
                          <Chip
                            label={doc.actum_fileextension.toUpperCase()}
                            variant="outlined"
                            size="small"
                            sx={{ fontSize: '10px', height: 22, borderRadius: '4px', flexShrink: 0 }}
                          />
                        )}
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {doc.brands.map(brand => {
                            const colors = brandColorMap.get(brand.id) ?? BRAND_CHIP_COLORS[0];
                            return (
                              <Chip
                                key={brand.id}
                                label={brand.name}
                                size="small"
                                sx={{
                                  fontSize: '10px',
                                  height: 22,
                                  borderRadius: '10px',
                                  fontWeight: 600,
                                  bgcolor: colors.bg,
                                  color: colors.color,
                                  border: 'none',
                                }}
                              />
                            );
                          })}
                        </Box>
                      </Box>

                      {/* Document name */}
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1.4,
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {doc.actum_name}
                      </Typography>

                      {/* Description */}
                      {doc.actum_description && (
                        <ClampedDescription
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(doc.actum_description ?? '', { FORBID_ATTR: ['style'] }),
                          }}
                        />
                      )}
                    </CardContent>

                    {/* Footer: language + date (left) | download (right) */}
                    <CardActions
                      sx={{
                        px: 2.5,
                        pb: 2.5,
                        pt: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {doc.actum_language && (
                          <Box
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: '3px',
                              px: 0.75,
                              py: 0.25,
                              lineHeight: 1,
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'text.secondary',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {doc.actum_language.toUpperCase()}
                          </Box>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                          {formatDate(doc.createdon)}
                        </Typography>
                      </Box>
                      <Button
                        size="medium"
                        variant="contained"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingDocId === doc.actum_productdocumentationid}
                        startIcon={
                          downloadingDocId === doc.actum_productdocumentationid
                            ? <CircularProgress size={16} color="inherit" />
                            : <DownloadOutlined />
                        }
                        aria-label={t('download.buttonAriaLabel', { documentName: doc.actum_name })}
                        sx={{ textTransform: 'none', flexShrink: 0 }}
                      >
                        {t('actions.download')}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>
    </Layout>
  );
};

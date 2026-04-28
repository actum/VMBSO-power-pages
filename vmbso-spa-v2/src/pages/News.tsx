import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { NewsArticle } from '../types/newsArticle';
import { useNews } from '../hooks/useNews';

const ClampedSummary = styled('div')(({ theme }) => ({
  ...theme.typography.body2,
  color: theme.palette.text.secondary,
  lineHeight: 1.6,
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}));

const ArticleSummary = styled('div')(({ theme }) => ({
  ...theme.typography.body2,
  color: theme.palette.text.secondary,
  lineHeight: 1.75,
}));

// Same palette as Documents page
const BRAND_CHIP_COLORS = [
  { bg: '#eeedfe', color: '#534ab7' },
  { bg: '#e6f1fb', color: '#185fa5' },
  { bg: '#e1f5ee', color: '#0f6e56' },
  { bg: '#fef3e2', color: '#8a5c00' },
];

export const News: React.FC = () => {
  const { t } = useTranslation('newsPage');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [openArticle, setOpenArticle] = useState<NewsArticle | null>(null);
  const { articles, userBrands, loading, error } = useNews();

  React.useEffect(() => {
    document.title = t('pageTitle');
  }, [t]);

  const allBrands = useMemo(() => {
    const brandsInArticles = new Set(articles.flatMap(a => a.brands.map(b => b.id)));
    return userBrands
      .filter(b => brandsInArticles.has(b.id))
      .map((b, i) => ({
        id: b.id,
        name: b.name,
        colors: BRAND_CHIP_COLORS[i % BRAND_CHIP_COLORS.length],
      }));
  }, [userBrands, articles]);

  const brandColorMap = useMemo(() => {
    const map = new Map<string, typeof BRAND_CHIP_COLORS[0]>();
    allBrands.forEach(b => map.set(b.id, b.colors));
    return map;
  }, [allBrands]);

  const filteredArticles = useMemo(() => {
    if (!selectedBrand) return articles;
    return articles.filter(a => a.brands.some(b => b.id === selectedBrand));
  }, [articles, selectedBrand]);

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const brandChipRow = (brands: NewsArticle['brands'], publishDate?: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: '15px', mt: '10px' }}>
      {brands.filter(b => brandColorMap.has(b.id)).map(brand => {
        const colors = brandColorMap.get(brand.id) ?? BRAND_CHIP_COLORS[0];
        return (
          <Chip
            key={brand.id}
            label={brand.name}
            size="small"
            sx={{
              fontSize: '10px',
              height: 20,
              borderRadius: '10px',
              fontWeight: 600,
              bgcolor: colors.bg,
              color: colors.color,
              border: 'none',
            }}
          />
        );
      })}
      {publishDate && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
          {formatDate(publishDate)}
        </Typography>
      )}
    </Box>
  );

  return (
    <Layout>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('subtitle')}
        </Typography>
      </Box>

      {/* Brand filter chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
        {/* All brands chip — same style as brand chips but uses primary theme color */}
        <Chip
          label={t('filters.allBrands')}
          clickable
          size="small"
          onClick={() => setSelectedBrand('')}
          sx={{
            fontSize: '10px',
            height: 24,
            borderRadius: '10px',
            fontWeight: 600,
            bgcolor: selectedBrand === '' ? 'primary.main' : 'transparent',
            color: selectedBrand === '' ? 'primary.contrastText' : 'primary.main',
            border: '1px solid',
            borderColor: 'primary.main',
            opacity: selectedBrand === '' ? 1 : 0.6,
            '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText', opacity: 1 },
          }}
        />
        {allBrands.map(brand => {
          const active = selectedBrand === brand.id;
          return (
            <Chip
              key={brand.id}
              label={brand.name}
              clickable
              size="small"
              onClick={() => setSelectedBrand(prev => prev === brand.id ? '' : brand.id)}
              sx={{
                fontSize: '10px',
                height: 24,
                borderRadius: '10px',
                fontWeight: 600,
                bgcolor: active ? brand.colors.bg : 'transparent',
                color: brand.colors.color,
                border: '1px solid',
                borderColor: brand.colors.color,
                opacity: active ? 1 : 0.6,
                '&:hover': { bgcolor: brand.colors.bg, opacity: 1 },
              }}
            />
          );
        })}
      </Box>

      {/* Loading / error states */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Article list */}
      {!loading && !error && filteredArticles.length === 0 && (
        <Alert severity="info">{t('validation.noArticlesFound')}</Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!loading && filteredArticles.map(article => (
          <Paper
            key={article.actum_newspagecontentid}
            elevation={1}
            onClick={() => setOpenArticle(article)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
              px: 5,
              py: 3,
              pb: 8,
              cursor: 'pointer',
              transition: 'box-shadow 0.15s',
              '&:hover': {
                boxShadow: 3,
                '& .article-title': { color: 'primary.main' },
              },
            }}
          >
            {/* Left: meta + title + excerpt */}
            <Box sx={{ flex: 1, minWidth: 0, px: 3 }}>
              {brandChipRow(article.brands, article.actum_publishdate || article.createdon)}

              <Typography
                className="article-title"
                variant="body1"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.4,
                  mb: 0.75,
                  transition: 'color 0.15s',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {article.actum_title}
              </Typography>

              {article.actum_summary && (
                <ClampedSummary
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(article.actum_summary, { FORBID_ATTR: ['style'] }),
                  }}
                />
              )}
            </Box>

            {/* Right: Read more button — outlined, transparent bg, icon */}
            <Box sx={{ flexShrink: 0, px: 3, display: { xs: 'none', sm: 'block' } }}>
              <Button
                variant="outlined"
                color="primary"
                endIcon={<ArrowForwardIcon />}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap', bgcolor: 'transparent' }}
                tabIndex={-1}
              >
                {t('actions.readMore')}
              </Button>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Article detail modal */}
      <Dialog
        open={Boolean(openArticle)}
        onClose={() => setOpenArticle(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        {openArticle && (
          <>
            <DialogTitle sx={{ px: 8, pt: 3, pb: 2, pr: 7 }}>
              {/* Brand chips + date row */}
              {brandChipRow(openArticle.brands, openArticle.actum_publishdate || openArticle.createdon)}
              {/* Title */}
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {openArticle.actum_title}
              </Typography>
              {/* X close button */}
              <IconButton
                onClick={() => setOpenArticle(null)}
                size="small"
                sx={{ position: 'absolute', top: 12, right: 12 }}
                aria-label={t('actions.close')}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ px: 8, py: 3 }}>
              {openArticle.actum_body ? (
                <Box
                  sx={{
                    '& h2, & h3': { fontWeight: 700, mt: 3, mb: 1, color: 'text.primary' },
                    '& h2': { fontSize: '1.15rem' },
                    '& h3': { fontSize: '1rem' },
                    '& p': { mb: 1.5, lineHeight: 1.75, color: 'text.secondary' },
                    '& ul, & ol': { pl: 3, mb: 1.5 },
                    '& li': { mb: 0.5, lineHeight: 1.75, color: 'text.secondary' },
                    '& strong': { color: 'text.primary', fontWeight: 600 },
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(openArticle.actum_body) }}
                />
              ) : (
                <ArticleSummary
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(openArticle.actum_summary ?? '', { FORBID_ATTR: ['style'] }),
                  }}
                />
              )}
            </DialogContent>

            {/* CTA buttons — only shown when article has linked CTAs */}
            {openArticle.ctas.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  px: 8,
                  py: 2.5,
                  bgcolor: 'grey.50',
                  borderTop: '1px solid',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {openArticle.ctas.map(cta => (
                  <Button
                    key={cta.id}
                    variant="contained"
                    color="primary"
                    href={cta.url}
                    target={cta.target === 182980001 ? '_blank' : '_self'}
                    rel={cta.target === 182980001 ? 'noopener noreferrer' : undefined}
                    sx={{ textTransform: 'none', flexShrink: 0 }}
                  >
                    {cta.text}
                  </Button>
                ))}
              </Box>
            )}

            <DialogActions sx={{ px: 8, py: 2.5, justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {t('modal.published')} {formatDate(openArticle.actum_publishdate || openArticle.createdon)}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setOpenArticle(null)}
                sx={{ textTransform: 'none' }}
              >
                {t('actions.close')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Layout>
  );
};

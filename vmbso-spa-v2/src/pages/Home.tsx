import React, { useEffect } from 'react';
import { Box, Typography, Button, Stack, CircularProgress, Alert } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { useHomePage } from '../hooks/useHomePage';
import type { CtaButton } from '../types/homePage';

export const Home: React.FC = () => {
    const { t } = useTranslation('homePage');
    const { homePageData, loading, error } = useHomePage();

    useEffect(() => { document.title = t('pageTitle'); }, [t]);

    return (
        <Layout>
            {/* Loading state */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Error state */}
            {error && (
                <Alert severity="error" sx={{ mb: 4 }}>
                    {error}
                </Alert>
            )}

            {/* Page content — only rendered once data is available */}
            {!loading && !error && homePageData && (
                <>
                    {/* ---------------------------------------------------------------- */}
                    {/* Greeting bar                                                      */}
                    {/* ---------------------------------------------------------------- */}
                    <Box sx={{ mb: { xs: 6, md: 8 } }}>
                        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {homePageData.heroSection.greetingsText}
                        </Typography>
                    </Box>

                    {/* ---------------------------------------------------------------- */}
                    {/* Hero section — 2-column layout                                    */}
                    {/* ---------------------------------------------------------------- */}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={{ xs: 6, md: 10 }}
                        alignItems="center"
                        sx={{ mb: { xs: 8, md: 12 } }}
                    >
                        {/* Left column — title, intro text, CTA buttons */}
                        <Box sx={{ width: '100%', flex: { md: '0 0 58.333333%' } }}>
                            <Typography
                                variant="h2"
                                component="h1"
                                sx={{ mb: { xs: 3, md: 4 }, lineHeight: 1.2 }}
                            >
                                {homePageData.heroSection.title}
                            </Typography>

                            <Box
                                sx={{
                                    mb: { xs: 4, md: 6 },
                                    color: 'text.secondary',
                                    lineHeight: 1.7,
                                    '& p': { mb: 1.5, lineHeight: 1.75, color: 'text.secondary' },
                                    '& h2, & h3': { fontWeight: 700, mt: 2, mb: 1, color: 'text.primary' },
                                    '& ul, & ol': { pl: 3, mb: 1.5 },
                                    '& li': { mb: 0.5, lineHeight: 1.75 },
                                    '& strong': { color: 'text.primary', fontWeight: 600 },
                                }}
                                dangerouslySetInnerHTML={{ __html: homePageData.heroSection.introText }}
                            />

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {homePageData.heroSection.ctas.map((cta: CtaButton, idx: number) => (
                                    <Button
                                        key={idx}
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        endIcon={<ArrowForwardIcon />}
                                        component="a"
                                        href={cta.url}
                                        target={cta.target}
                                        rel={cta.target === '_blank' ? 'noopener noreferrer' : undefined}
                                        sx={{ px: { xs: 4, md: 6 } }}
                                    >
                                        {cta.text}
                                    </Button>
                                ))}
                            </Box>
                        </Box>

                        {/* Right column — hero image */}
                        <Box sx={{ width: '100%', flex: { md: '0 0 41.666667%' } }}>
                            <Box
                                component="img"
                                src={homePageData.heroSection.heroImage.url}
                                alt={homePageData.heroSection.heroImage.alt}
                                sx={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: { md: '50rem' },
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    display: 'block',
                                }}
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.style.minHeight = '32rem';
                                    e.currentTarget.style.backgroundColor = '#e2e2e2';
                                }}
                            />
                        </Box>
                    </Stack>

                    {/* ---------------------------------------------------------------- */}
                    {/* Banner section — full-width, product image + teal panel          */}
                    {/* ---------------------------------------------------------------- */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            borderRadius: 1,
                            overflow: 'hidden',
                            minHeight: { xs: 'auto', md: '36rem' },
                        }}
                    >
                        {/* Left half — product image */}
                        <Box
                            sx={{
                                flex: { xs: 'none', md: '0 0 50%' },
                                minHeight: { xs: '22rem', md: 'auto' },
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                component="img"
                                src={homePageData.bannerSection.image.url}
                                alt={homePageData.bannerSection.image.alt}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.style.backgroundColor = '#dad9d9';
                                    e.currentTarget.style.minHeight = '22rem';
                                }}
                            />
                        </Box>

                        {/* Right half — teal background, title, CTAs */}
                        <Box
                            sx={{
                                flex: { xs: 'none', md: '0 0 50%' },
                                bgcolor: 'primary.main',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                px: { xs: 8, md: 12 },
                                py: { xs: 8, md: 10 },
                                gap: 5,
                            }}
                        >
                            <Typography
                                variant="h2"
                                sx={{ color: 'white', lineHeight: 1.2 }}
                            >
                                {homePageData.bannerSection.title}
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {homePageData.bannerSection.ctas.map((cta: CtaButton, idx: number) => (
                                    <Button
                                        key={idx}
                                        variant="outlined"
                                        size="large"
                                        endIcon={<ArrowForwardIcon />}
                                        component="a"
                                        href={cta.url}
                                        target={cta.target}
                                        rel={cta.target === '_blank' ? 'noopener noreferrer' : undefined}
                                        sx={{
                                            color: 'white',
                                            borderColor: 'white',
                                            '&:hover': {
                                                borderColor: 'white',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            },
                                        }}
                                    >
                                        {cta.text}
                                    </Button>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </>
            )}
        </Layout>
    );
};

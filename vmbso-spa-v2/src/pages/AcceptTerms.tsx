import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { Layout } from '../components/Layout';
import { TermsAcceptanceList } from '../components/terms/TermsAcceptanceList';
import { acceptTerms } from '../components/terms/acceptTerms';
import { useAuth } from '../contexts/AuthContext';
import { usePickedTermsTexts } from '../hooks/useTermsTexts';
import { config } from '../config/powerPages.config';
import { dataverseService } from '../services/dataverseService';
import type { TermsText } from '../types/terms';

/**
 * Terms & Conditions gate (VMPP-323). Users with a complete profile land here while any
 * applicable version is not accepted. No skip: the rest of the portal stays blocked.
 */
export const AcceptTerms: React.FC = () => {
  const { t } = useTranslation('terms');
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, missingTerms, termsLoading, refreshTerms } = useAuth();
  const from = (location.state as { from?: string } | null)?.from;
  const returnTo = from && !from.startsWith('/accept-terms') ? from : '/';

  const versionIds = useMemo(() => missingTerms.map((m) => m.version.actum_termsversionid), [missingTerms]);
  const { picked, loading: textsLoading } = usePickedTermsTexts(versionIds);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    document.title = `${t('gateTitle', 'Please review our terms')} | VMBSO Customer Portal`;
  }, [t]);

  const allChecked = missingTerms.length > 0 && missingTerms.every((m) => checked[m.version.actum_termsversionid]);

  const handleToggle = (versionId: string) => {
    setError(null);
    setChecked((prev) => ({ ...prev, [versionId]: !prev[versionId] }));
  };

  const handleAccept = async () => {
    if (!currentUser || !allChecked) return;
    setSubmitting(true);
    setError(null);
    try {
      const shown: Record<string, TermsText> = {};
      for (const id of versionIds) {
        if (picked[id]) shown[id] = picked[id].text;
      }
      // Re-read acceptances so a retry after a partial failure creates no duplicates.
      const alreadyAccepted = config.devMode
        ? new Set<string>()
        : new Set((await dataverseService.terms.getMyAcceptances()).map((a) => a._actum_termsversionid_value));
      await acceptTerms(missingTerms, currentUser.contactid, shown, alreadyAccepted);
      done.current = true;
      await refreshTerms();
      navigate(returnTo, { replace: true });
    } catch (e) {
      console.error('[TERMS] Accepting failed:', e);
      setError(t('saveError', 'Your acceptance could not be saved. Please try again.'));
      setSubmitting(false);
    }
  };

  if (termsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Nothing to accept (e.g. opened directly, or already accepted in another tab)
  if (missingTerms.length === 0 && !done.current) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <Layout hideNavigation>
      <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 0, sm: 2 } }}>
        <Paper sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            {t('gateTitle', 'Please review our terms')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('gateIntro', 'To continue using the portal, please accept the following terms.')}
          </Typography>

          <TermsAcceptanceList
            terms={missingTerms}
            picked={picked}
            textsLoading={textsLoading}
            checked={checked}
            onToggle={handleToggle}
            showKindBadge
            disabled={submitting}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleAccept}
              disabled={!allChecked || submitting || textsLoading}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {t('acceptAndContinue', 'Accept and continue')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
};

export default AcceptTerms;

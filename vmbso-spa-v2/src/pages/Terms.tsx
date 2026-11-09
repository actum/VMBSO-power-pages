import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Paper, Typography } from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Layout } from '../components/Layout';
import { TermsDialog } from '../components/terms/TermsDialog';
import { useAuth } from '../contexts/AuthContext';
import { usePickedTermsTexts } from '../hooks/useTermsTexts';
import { formatDateEU } from '../utils/dateUtils';

/**
 * Terms & Conditions overview (VMPP-323): the documents that currently apply to the user, with the
 * date they accepted each one, readable at any time. Linked from the footer and the profile page.
 */
export const Terms: React.FC = () => {
  const { t } = useTranslation('terms');
  const { requiredTerms } = useAuth();
  const versionIds = useMemo(() => requiredTerms.map((r) => r.version.actum_termsversionid), [requiredTerms]);
  const { picked, loading: textsLoading } = usePickedTermsTexts(versionIds);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t('pageTitle', 'Terms & Conditions')} | VMBSO Customer Portal`;
  }, [t]);

  const titleOf = (versionId: string, fallback: string) => picked[versionId]?.text.actum_name || fallback;
  const openTerm = requiredTerms.find((r) => r.version.actum_termsversionid === openId);

  return (
    <Layout>
      <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 0, sm: 2 } }}>
        <Paper sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h4" component="h1" sx={{ fontSize: '26px', fontWeight: 700, mb: 1 }}>
            {t('pageTitle', 'Terms & Conditions')}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '16px', mb: 3 }}>
            {t('pageIntro', 'The terms that apply to your account, and when you accepted them.')}
          </Typography>

          {requiredTerms.length === 0 ? (
            <Typography color="text.secondary" sx={{ fontSize: '16px' }}>
              {t('noTerms', 'There are no terms to show.')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {requiredTerms.map(({ version, accepted, acceptedOn }) => {
                const id = version.actum_termsversionid;
                return (
                  <Paper key={id} variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                      <ArticleOutlinedIcon color="action" sx={{ fontSize: 26, mt: '2px' }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography component="h2" sx={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {titleOf(id, version.actum_name)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
                          {accepted && <CheckCircleOutlineIcon color="success" sx={{ fontSize: 20 }} />}
                          <Typography color="text.secondary" sx={{ fontSize: '16px' }}>
                            {accepted
                              ? t('acceptedOn', 'Accepted on {{date}}', { date: formatDateEU(acceptedOn) })
                              : t('notAccepted', 'Not accepted yet')}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        onClick={() => setOpenId(id)}
                        sx={{ fontSize: '16px', fontWeight: 700, px: 3, py: 1, width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
                      >
                        {t('read', 'Read terms')}
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Paper>
      </Box>

      <TermsDialog
        open={!!openTerm}
        onClose={() => setOpenId(null)}
        title={openTerm ? titleOf(openTerm.version.actum_termsversionid, openTerm.version.actum_name) : ''}
        picked={openId ? picked[openId] : undefined}
        loading={textsLoading}
      />
    </Layout>
  );
};

export default Terms;

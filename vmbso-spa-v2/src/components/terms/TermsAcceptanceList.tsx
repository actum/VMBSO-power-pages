import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Checkbox, Chip, FormControlLabel, Paper, Typography } from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import type { PickedTermsText } from '../../hooks/useTermsTexts';
import type { RequiredTerm } from '../../types/terms';
import { TermsDialog } from './TermsDialog';

interface TermsAcceptanceListProps {
  terms: RequiredTerm[];
  /** Text per version id (see usePickedTermsTexts). */
  picked: Record<string, PickedTermsText>;
  textsLoading?: boolean;
  checked: Record<string, boolean>;
  onToggle: (versionId: string) => void;
  /** Show the NEW / UPDATED badge and the explanation line (the gate page). */
  showKindBadge?: boolean;
  /** Highlight unchecked boxes (after a submit attempt). */
  error?: boolean;
  disabled?: boolean;
}

/** One card per document: read the terms in a dialog, tick "I have read and accept". */
export const TermsAcceptanceList: React.FC<TermsAcceptanceListProps> = ({
  terms,
  picked,
  textsLoading,
  checked,
  onToggle,
  showKindBadge,
  error,
  disabled,
}) => {
  const { t } = useTranslation('terms');
  const [openId, setOpenId] = useState<string | null>(null);
  const openTerm = terms.find((term) => term.version.actum_termsversionid === openId);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {terms.map(({ version, kind }) => {
        const id = version.actum_termsversionid;
        const isChecked = !!checked[id];
        const showError = error && !isChecked;
        return (
          <Paper
            key={id}
            variant="outlined"
            sx={{ p: { xs: 2, sm: 3 }, borderColor: showError ? 'error.main' : undefined }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
              <ArticleOutlinedIcon color="action" sx={{ fontSize: 26, mt: '2px' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography component="h2" sx={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {showKindBadge && kind && (
                    <Chip
                      component="span"
                      label={kind === 'updated' ? t('badgeUpdated', 'UPDATED') : t('badgeNew', 'NEW')}
                      color={kind === 'updated' ? 'warning' : 'primary'}
                      size="small"
                      sx={{ fontSize: '10px', fontWeight: 700, height: 22, borderRadius: '4px', mr: 1.25, verticalAlign: 'text-bottom' }}
                    />
                  )}
                  {version.actum_name}
                </Typography>
                {showKindBadge && kind && (
                  <Typography color="text.secondary" sx={{ fontSize: '16px', mt: 1 }}>
                    {kind === 'updated'
                      ? t('explainUpdated', "We've updated these terms since you last accepted them.")
                      : t('explainNew', 'These terms apply to you and need your acceptance.')}
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                onClick={() => setOpenId(id)}
                sx={{ fontSize: '16px', fontWeight: 700, px: 3, py: 1, width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
              >
                {t('read', 'Read terms')}
              </Button>
            </Box>
            <FormControlLabel
              sx={{ mt: 2, ml: 0 }}
              control={
                <Checkbox
                  checked={isChecked}
                  onChange={() => onToggle(id)}
                  disabled={disabled}
                  color={showError ? 'error' : 'primary'}
                  sx={{ '& .MuiSvgIcon-root': { fontSize: 26 } }}
                />
              }
              label={
                <Typography color={showError ? 'error' : 'text.primary'} sx={{ fontSize: '16px' }}>
                  {t('acceptCheckbox', 'I have read and accept these terms')}
                </Typography>
              }
            />
          </Paper>
        );
      })}

      <TermsDialog
        open={!!openTerm}
        onClose={() => setOpenId(null)}
        title={openTerm?.version.actum_name ?? ''}
        picked={openId ? picked[openId] : undefined}
        loading={textsLoading}
      />
    </Box>
  );
};

export default TermsAcceptanceList;

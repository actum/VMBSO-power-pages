import React from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { PickedTermsText } from '../../hooks/useTermsTexts';

interface TermsDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The text to show; undefined while loading or when the version has no text. */
  picked?: PickedTermsText;
  loading?: boolean;
}

/** Read-only dialog with the sanitized T&C body. */
export const TermsDialog: React.FC<TermsDialogProps> = ({ open, onClose, title, picked, loading }) => {
  const { t } = useTranslation('terms');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 8, py: 3 }}>
        <Typography component="span" sx={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 16, right: 16 }}
          aria-label={t('close', 'Close')}
        >
          <CloseIcon sx={{ fontSize: 24 }} />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !picked ? (
          <Alert severity="error">{t('loadError', 'These terms could not be loaded. Please try again later.')}</Alert>
        ) : (
          <>
            {!picked.isUiLanguage && picked.languageName && (
              <Alert severity="info" sx={{ mb: 2, fontSize: '15px' }}>
                {t('onlyAvailableIn', 'These terms are only available in {{language}}.', {
                  language: picked.languageCode
                    ? t(`languageNames.${picked.languageCode}`, picked.languageName)
                    : picked.languageName,
                })}
              </Alert>
            )}
            <Box
              sx={{
                fontSize: '16px',
                '& h1, & h2, & h3, & h4': { fontWeight: 700, mt: 3, mb: 1, color: 'text.primary', lineHeight: 1.3 },
                '& h1': { fontSize: '22px' },
                '& h2': { fontSize: '20px' },
                '& h3': { fontSize: '18px' },
                '& h4': { fontSize: '16px' },
                '& > :first-of-type': { mt: 0 },
                '& p': { fontSize: '16px', mb: 1.5, lineHeight: 1.7, color: 'text.secondary' },
                '& ul, & ol': { pl: 3, mb: 1.5 },
                '& li': { fontSize: '16px', mb: 0.5, lineHeight: 1.7, color: 'text.secondary' },
                '& strong, & b': { color: 'text.primary', fontWeight: 600 },
                '& a': { color: 'primary.main' },
              }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(picked.text.actum_body) }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2.5 }}>
        <Button onClick={onClose} variant="contained" sx={{ fontSize: '16px', fontWeight: 700, px: 4, py: 1.25 }}>
          {t('close', 'Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsDialog;

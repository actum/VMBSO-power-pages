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
      <DialogTitle sx={{ pr: 7 }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12 }}
          aria-label={t('close', 'Close')}
        >
          <CloseIcon fontSize="small" />
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
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('onlyAvailableIn', 'These terms are only available in {{language}}.', { language: picked.languageName })}
              </Alert>
            )}
            <Box
              sx={{
                '& h1, & h2, & h3': { fontWeight: 700, mt: 3, mb: 1, color: 'text.primary' },
                '& h2': { fontSize: '1.15rem' },
                '& h3': { fontSize: '1rem' },
                '& p': { mb: 1.5, lineHeight: 1.75, color: 'text.secondary' },
                '& ul, & ol': { pl: 3, mb: 1.5 },
                '& li': { mb: 0.5, lineHeight: 1.75, color: 'text.secondary' },
                '& strong': { color: 'text.primary', fontWeight: 600 },
              }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(picked.text.actum_body) }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          {t('close', 'Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsDialog;

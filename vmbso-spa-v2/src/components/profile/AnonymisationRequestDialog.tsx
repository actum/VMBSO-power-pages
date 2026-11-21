import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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
import { useAuth } from '../../contexts/AuthContext';
import { dataverseService } from '../../services/dataverseService';

type Step = 'confirm' | 'submitting' | 'success' | 'error';

interface AnonymisationRequestDialogProps {
  open: boolean;
  onClose: () => void;
}

const buttonSx = { fontSize: '16px', fontWeight: 700, px: 4, py: 1.25 };

/**
 * Right to be forgotten (VMPP-395): confirm, create the request, then sign the user out.
 * The request is for the signed-in user's own contact only; Power Pages enforces this too.
 */
export const AnonymisationRequestDialog: React.FC<AnonymisationRequestDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation('updateProfilePage');
  const { currentUser, logout } = useAuth();
  const [step, setStep] = useState<Step>('confirm');
  const inFlight = useRef(false);

  useEffect(() => {
    if (open) setStep('confirm');
  }, [open]);

  const handleYes = async () => {
    if (inFlight.current || !currentUser?.contactid) return;
    inFlight.current = true;
    setStep('submitting');
    try {
      await dataverseService.anonymisation.createRequest(currentUser.contactid);
      setStep('success');
    } catch (err) {
      console.error('Anonymisation request failed', err);
      setStep('error');
    } finally {
      inFlight.current = false;
    }
  };

  // While submitting the dialog cannot be closed; after success, closing signs out.
  const handleClose = () => {
    if (step === 'submitting') return;
    if (step === 'success') {
      void logout();
      return;
    }
    onClose();
  };

  const submitting = step === 'submitting';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 8, py: 3 }}>
        <Typography component="span" sx={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3 }}>
          {t('anonymisation.title')}
        </Typography>
        {!submitting && (
          <IconButton
            onClick={handleClose}
            sx={{ position: 'absolute', top: 16, right: 16 }}
            aria-label={t('terms:close', 'Close')}
          >
            <CloseIcon sx={{ fontSize: 24 }} />
          </IconButton>
        )}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 3 }}>
        {step === 'success' ? (
          <Alert severity="success" sx={{ fontSize: '16px' }}>
            {t('anonymisation.success')}
          </Alert>
        ) : (
          <>
            {step === 'error' && (
              <Alert severity="error" sx={{ mb: 2, fontSize: '16px' }}>
                {t('anonymisation.error')}
              </Alert>
            )}
            <Typography sx={{ fontSize: '16px', lineHeight: 1.7 }}>{t('anonymisation.confirm')}</Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
        {step === 'success' ? (
          <Button onClick={() => void logout()} variant="contained" sx={buttonSx}>
            {t('anonymisation.signOut')}
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} variant="outlined" disabled={submitting} sx={buttonSx}>
              {t('anonymisation.no')}
            </Button>
            <Button
              onClick={handleYes}
              variant="contained"
              color="error"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={buttonSx}
            >
              {submitting ? t('anonymisation.submitting') : t('anonymisation.yes')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

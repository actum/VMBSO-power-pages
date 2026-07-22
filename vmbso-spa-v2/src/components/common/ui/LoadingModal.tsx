import React from 'react';
import { Modal, CircularProgress, Typography, Paper } from '@mui/material';

type LoadingModalProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
};

export const LoadingModal: React.FC<LoadingModalProps> = ({ open, title, subtitle }) => {
  return (
    <Modal
      open={open}
      closeAfterTransition
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          p: 4,
          borderRadius: 2,
          minWidth: 300,
        }}
      >
        <CircularProgress size={60} sx={{ color: 'primary.main', mb: 3 }} />
        {title && (
          <Typography variant="h5" sx={{ fontWeight: 500, color: 'primary.main' }}>
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
      </Paper>
    </Modal>
  );
};

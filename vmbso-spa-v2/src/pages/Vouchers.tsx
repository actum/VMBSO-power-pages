/**
 * Vouchers page component
 * Displays vouchers generated from reward claims with filtering and detail view
 * For distributors: includes redemption functionality
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  CardGiftcard as VoucherIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import ReactGA from 'react-ga4';
import { Layout } from '../components/Layout';
import { LoadingModal } from '../components/common/ui/LoadingModal';
import { useVouchers } from '../hooks/useVouchers';
import { getVoucherStatus, VoucherStatusCode } from '../types/voucher';
import type { Voucher } from '../types/voucher';
import { dataverseService } from '../services/dataverseService';
import { useAuth } from '../contexts/AuthContext';
import { formatDateEU } from '../utils/dateUtils';

type VoucherStatus = 'all' | 'issued' | 'redeemed' | 'expired' | 'canceled';
type VoucherFilterStatus = Exclude<VoucherStatus, 'all'>;

const INSTALLER_FILTER_STATUSES: VoucherFilterStatus[] = ['issued', 'redeemed', 'canceled', 'expired'];
const DISTRIBUTOR_FILTER_STATUSES: VoucherFilterStatus[] = ['redeemed', 'canceled', 'expired'];

export const Vouchers: React.FC = () => {
  const { t } = useTranslation('vouchersPage');
  const { vouchers, loading, error, refetch, isDistributorUser } = useVouchers();
  const { currentUser } = useAuth();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<VoucherStatus>('all');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Redemption state
  const [redemptionCode, setRedemptionCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [validatedVoucher, setValidatedVoucher] = useState<any>(null);
  const [validatedVoucherId, setValidatedVoucherId] = useState<string>('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    document.title = t('pageTitle');
  }, [t]);

  // Track page view when vouchers load
  useEffect(() => {
    if (!loading && !error && vouchers.length >= 0) {
      ReactGA.event({
        category: 'Vouchers',
        action: 'View Vouchers List',
        label: `${vouchers.length} vouchers`,
        value: vouchers.length,
      });
    }
  }, [loading, error, vouchers.length]);

  // Filter vouchers based on search and status
  const availableStatusFilters = useMemo<VoucherFilterStatus[]>(
    () => (isDistributorUser ? DISTRIBUTOR_FILTER_STATUSES : INSTALLER_FILTER_STATUSES),
    [isDistributorUser]
  );

  useEffect(() => {
    if (statusFilter !== 'all' && !availableStatusFilters.includes(statusFilter)) {
      setStatusFilter('all');
    }
  }, [statusFilter, availableStatusFilters]);

  const filteredVouchers = useMemo(() => {
    let filtered = vouchers;

    // Filter by search text
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((voucher) => {
        const code = voucher.actum_vouchercode?.toLowerCase() || '';
        const name = voucher.actum_name?.toLowerCase() || '';
        return code.includes(search) || name.includes(search);
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((voucher) => 
        getVoucherStatus(voucher.statuscode) === statusFilter
      );
    }

    return filtered;
  }, [vouchers, searchText, statusFilter]);

  const handleOpenDetail = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setDetailModalOpen(true);

    // Track detail view
    ReactGA.event({
      category: 'Vouchers',
      action: 'Open Voucher Detail',
      label: getVoucherStatus(voucher.statuscode),
    });
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedVoucher(null);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t('detail.copiedSuccess'));

      // Track copy action
      ReactGA.event({
        category: 'Vouchers',
        action: 'Copy Voucher Code',
        label: code,
      });
    } catch (err) {
      toast.error('Failed to copy code');
      console.error('Failed to copy:', err);
    }
  };

  const getStatusDotColor = (statuscode: number): string => {
    const status = getVoucherStatus(statuscode);
    switch (status) {
      case 'issued':
        return '#4caf50'; // Green
      case 'redeemed':
        return '#2196f3'; // Blue
      case 'expired':
        return '#ff9800'; // Orange
      case 'canceled':
        return '#9e9e9e'; // Gray
      default:
        return '#9e9e9e';
    }
  };

  const formatDate = (isoDate: string | null | undefined): string => formatDateEU(isoDate);

  const handleStatusFilterChange = (value: VoucherStatus) => {
    setStatusFilter(value);

    // Track filter action
    ReactGA.event({
      category: 'Vouchers',
      action: 'Filter Vouchers',
      label: `status: ${value}`,
    });
  };

  // Redemption handlers (distributor only)
  const handleValidateVoucher = async () => {
    if (!redemptionCode.trim()) {
      toast.error(t('redemption.errors.emptyCode'));
      return;
    }

    if (!currentUser?._parentcustomerid_value || !currentUser?.contactid) {
      toast.error(t('redemption.errors.unauthorized'));
      return;
    }

    try {
      setValidating(true);

      const result = await dataverseService.vouchers.validateVoucher(
        redemptionCode.trim(),
        currentUser._parentcustomerid_value,
        currentUser.contactid
      );

      if (result.valid) {
        console.log('Validation successful:', {
          voucherId: result.voucherId,
          voucher: result.voucher,
        });
        setValidatedVoucher(result.voucher);
        setValidatedVoucherId(result.voucherId || '');
        setConfirmModalOpen(true);
        toast.success(t('redemption.validVoucher'));

        ReactGA.event({
          category: 'Vouchers',
          action: 'Validate Voucher Success',
          label: redemptionCode,
        });
      } else {
        toast.error(result.message || t('redemption.errors.validationFailed'));

        ReactGA.event({
          category: 'Vouchers',
          action: 'Validate Voucher Failed',
          label: result.message || 'Unknown error',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('redemption.errors.validationFailed');
      toast.error(message);
      console.error('Error validating voucher:', err);

      ReactGA.event({
        category: 'Vouchers',
        action: 'Validate Voucher Error',
        label: message,
      });
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmRedemption = async () => {
    if (!currentUser?._parentcustomerid_value || !currentUser?.contactid) {
      toast.error(t('redemption.errors.unauthorized'));
      return;
    }

    if (!validatedVoucherId) {
      console.error('Redemption failed: validatedVoucherId is empty', {
        validatedVoucherId,
        validatedVoucher,
        redemptionCode,
      });
      toast.error(t('redemption.errors.validationFailed'));
      return;
    }

    try {
      setRedeeming(true);

      const result = await dataverseService.vouchers.redeemVoucher(
        validatedVoucherId,
        currentUser._parentcustomerid_value,
        currentUser.contactid
      );

      if (result.success) {
        toast.success(t('redemption.successMessage', { code: redemptionCode }));
        
        // Clear form and close modal
        setRedemptionCode('');
        setValidatedVoucher(null);
        setValidatedVoucherId('');
        setConfirmModalOpen(false);

        // Refresh voucher list
        await refetch();

        ReactGA.event({
          category: 'Vouchers',
          action: 'Redeem Voucher Success',
          label: redemptionCode,
        });
      } else {
        toast.error(result.message || t('redemption.errors.redemptionFailed'));

        ReactGA.event({
          category: 'Vouchers',
          action: 'Redeem Voucher Failed',
          label: result.message || 'Unknown error',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('redemption.errors.redemptionFailed');
      toast.error(message);
      console.error('Error redeeming voucher:', err);

      ReactGA.event({
        category: 'Vouchers',
        action: 'Redeem Voucher Error',
        label: message,
      });
    } finally {
      setRedeeming(false);
    }
  };

  const handleCancelRedemption = () => {
    setConfirmModalOpen(false);
    setValidatedVoucher(null);
    setValidatedVoucherId('');
  };

  return (
    <Layout>
      {/* Loading modal for redemption */}
      <LoadingModal
        open={redeeming}
        title={t('redemption.redeeming')}
        subtitle={t('redemption.redeemingSubtext')}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isDistributorUser ? t('subtitleDistributor') : t('subtitle')}
          </Typography>
        </Box>

        {/* Redemption Section (Distributors Only) */}
        {isDistributorUser && (
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.50' }}>
            <Typography variant="h6" gutterBottom>
              {t('redemption.title')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label={t('redemption.inputLabel')}
                placeholder={t('redemption.inputPlaceholder')}
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                disabled={validating || redeeming}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !validating && !redeeming) {
                    handleValidateVoucher();
                  }
                }}
                InputProps={{
                  sx: { bgcolor: 'background.paper' },
                }}
              />
              <Button
                variant="contained"
                onClick={handleValidateVoucher}
                disabled={validating || redeeming || !redemptionCode.trim()}
                sx={{ minWidth: 150, height: 56 }}
              >
                {validating ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    {t('redemption.validating')}
                  </>
                ) : (
                  t('redemption.redeemButton')
                )}
              </Button>
            </Box>
          </Paper>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder={t('filters.searchPlaceholder')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('list.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('list.status')}
                  onChange={(e) => handleStatusFilterChange(e.target.value as VoucherStatus)}
                >
                  <MenuItem value="all">{t('filters.statusAll')}</MenuItem>
                  {availableStatusFilters.map((status) => (
                    <MenuItem key={status} value={status}>
                      {t(`filters.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t('errorMessages.loadFailed')}: {error}
          </Alert>
        )}

        {/* Empty State */}
        {!loading && !error && filteredVouchers.length === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <VoucherIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {isDistributorUser ? t('list.noRedeemedVouchers') : t('list.noVouchers')}
            </Typography>
          </Paper>
        )}

        {/* Vouchers Grid */}
        {!loading && !error && filteredVouchers.length > 0 && (
          <Grid container spacing={3}>
            {filteredVouchers.map((voucher) => (
              <Grid item xs={12} key={voucher.actum_voucherid}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => handleOpenDetail(voucher)}
                >
                  <CardContent>
                    <Grid container spacing={2}>
                      {/* Voucher Name and Status */}
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {voucher.actum_name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: getStatusDotColor(voucher.statuscode),
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {t(`filters.status${getVoucherStatus(voucher.statuscode).charAt(0).toUpperCase() + getVoucherStatus(voucher.statuscode).slice(1)}`)}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Info Grid */}
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('list.claimedBy')}
                        </Typography>
                        <Typography variant="body2">
                          {isDistributorUser
                            ? (voucher['installerAccount.name'] || '-')
                            : (voucher['claimedBy.fullname'] || '-')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('list.redeemedBy')}
                        </Typography>
                        <Typography variant="body2">
                          {isDistributorUser
                            ? (voucher['redeemedBy.fullname'] || '-')
                            : (voucher['distributorAccount.name'] || '-')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('list.reward')}
                        </Typography>
                        <Typography variant="body2">
                          {voucher['reward.name'] || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('list.generatedDate')}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(voucher.createdon)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('list.expiryDate')}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(voucher.actum_expirationdate)}
                        </Typography>
                      </Grid>
                      {getVoucherStatus(voucher.statuscode) === 'redeemed' && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('list.redeemedDate')}
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(voucher.actum_redeemedon)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Detail Modal */}
        <Dialog
          open={detailModalOpen}
          onClose={handleCloseDetail}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{t('detail.title')}</Typography>
              <IconButton onClick={handleCloseDetail} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedVoucher && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                {/* Voucher Code */}
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {t('list.voucherCode')}
                  </Typography>
                  <Paper
                    sx={{
                      p: 3,
                      bgcolor: 'rgba(0, 0, 0, 0.02)',
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        letterSpacing: '0.1em',
                        color: 'text.primary',
                      }}
                    >
                      {selectedVoucher.actum_vouchercode}
                    </Typography>
                    <IconButton
                      onClick={() => handleCopyCode(selectedVoucher.actum_vouchercode)}
                      color="primary"
                      size="small"
                    >
                      <CopyIcon />
                    </IconButton>
                  </Paper>
                </Box>

                <Divider />

                {/* Status */}
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {t('list.status')}
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: getStatusDotColor(selectedVoucher.statuscode),
                      }}
                    />
                    <Typography variant="body1">
                      {t(`filters.status${getVoucherStatus(selectedVoucher.statuscode).charAt(0).toUpperCase() + getVoucherStatus(selectedVoucher.statuscode).slice(1)}`)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {t('list.claimedBy')}
                  </Typography>
                  <Typography variant="body1">
                    {isDistributorUser
                      ? (selectedVoucher['installerAccount.name'] || '-')
                      : (selectedVoucher['claimedBy.fullname'] || '-')}
                  </Typography>
                </Box>

                {(isDistributorUser ? selectedVoucher['redeemedBy.fullname'] : selectedVoucher['distributorAccount.name']) && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      {t('list.redeemedBy')}
                    </Typography>
                    <Typography variant="body1">
                      {isDistributorUser
                        ? selectedVoucher['redeemedBy.fullname']
                        : selectedVoucher['distributorAccount.name']}
                    </Typography>
                  </Box>
                )}

                {selectedVoucher['reward.name'] && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      {t('list.reward')}
                    </Typography>
                    <Typography variant="body1">
                      {selectedVoucher['reward.name']}
                      {selectedVoucher['reward.pointamount'] != null && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({selectedVoucher['reward.pointamount']} pts)
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                )}

                {/* Dates */}
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {t('list.generatedDate')}
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedVoucher.createdon)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {t('list.expiryDate')}
                  </Typography>
                  <Typography
                    variant="body1"
                    color={
                      selectedVoucher.statuscode === VoucherStatusCode.EXPIRED
                        ? 'error'
                        : 'text.primary'
                    }
                  >
                    {formatDate(selectedVoucher.actum_expirationdate)}
                  </Typography>
                </Box>

                {selectedVoucher.statuscode === VoucherStatusCode.REDEEMED && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      {t('list.redeemedDate')}
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedVoucher.actum_redeemedon)}
                    </Typography>
                  </Box>
                )}

                {/* Name */}
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {t('detail.voucherName')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedVoucher.actum_name}
                  </Typography>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetail}>{t('detail.close')}</Button>
            {selectedVoucher && (
              <Button
                variant="contained"
                startIcon={<CopyIcon />}
                onClick={() => handleCopyCode(selectedVoucher.actum_vouchercode)}
              >
                {t('detail.copyCode')}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Redemption Confirmation Modal (Distributors Only) */}
        <Dialog
          open={confirmModalOpen}
          onClose={handleCancelRedemption}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6">{t('redemption.confirmTitle')}</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body1">
                {t('redemption.confirmMessage')}
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  {t('list.voucherCode')}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    letterSpacing: '0.1em',
                  }}
                >
                  {redemptionCode}
                </Typography>
              </Paper>
              {validatedVoucher && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t('redemption.validVoucher')}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelRedemption} disabled={redeeming}>
              {t('redemption.cancelButton')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirmRedemption}
              disabled={redeeming}
              startIcon={
                redeeming ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />
              }
            >
              {redeeming ? t('redemption.redeeming') : t('redemption.confirmButton')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

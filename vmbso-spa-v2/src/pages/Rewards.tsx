/**
 * Rewards page component
 * Displays loyalty points balance, reward catalog, and claim functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Redeem as GiftIcon,
  CheckCircle as CheckIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ReactGA from 'react-ga4';
import { Layout } from '../components/Layout';
import { useRewards } from '../hooks/useRewards';
import { useAuth } from '../contexts/AuthContext';
import { dataverseService } from '../services/dataverseService';
import type { Reward } from '../types/reward';
import type { LoyaltyTransaction } from '../types/loyaltyTransaction';
import { TransactionType } from '../types/loyaltyTransaction';
import { formatDateEU } from '../utils/dateUtils';

export const Rewards: React.FC = () => {
  const { t } = useTranslation('rewardsPage');
  const { rewards, balance, loading, error, refetch } = useRewards();
  const { currentUser } = useAuth();

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [voucherInfo, setVoucherInfo] = useState<{
    voucherCodes: string[];
  } | null>(null);

  // Story 4: Transaction history state
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const getTransactionStatusLabel = (transaction: LoyaltyTransaction): string => {
    const formattedStatus = transaction['statuscode@OData.Community.Display.V1.FormattedValue'];
    if (!formattedStatus) {
      return String(transaction.statuscode);
    }

    const normalizedStatus = formattedStatus.trim().toLowerCase();
    const statusKeyMap: Record<string, string> = {
      active: 'active',
      freezed: 'freezed',
      cleared: 'cleared',
      inactive: 'inactive',
      canceled: 'canceled',
      expired: 'expired',
    };

    const statusKey = statusKeyMap[normalizedStatus];
    if (!statusKey) {
      return formattedStatus;
    }

    const translationKey = `transactionHistory.statuses.${statusKey}`;
    const translated = t(translationKey);
    return translated === translationKey ? formattedStatus : translated;
  };

  const handleOpenTransactionHistory = async () => {
    setTransactionModalOpen(true);
    setTransactionsError(null);

    if (transactions.length > 0) return; // Already loaded

    const accountId = currentUser?._parentcustomerid_value;
    if (!accountId) return;

    setTransactionsLoading(true);
    try {
      const data = await dataverseService.loyaltyTransactions.getByAccount(accountId);
      setTransactions(data);
    } catch (err) {
      setTransactionsError(t('transactionHistory.error'));
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    document.title = t('pageTitle');
  }, [t]);

  // Track when rewards catalog is viewed
  useEffect(() => {
    if (!loading && !error && rewards.length > 0) {
      ReactGA.event({
        category: 'Rewards',
        action: 'View Catalog',
        label: `${rewards.length} rewards available, ${balance} points`,
        value: balance,
      });
    }
  }, [loading, error, rewards.length, balance]);

  const handleOpenClaimModal = (reward: Reward) => {
    setSelectedReward(reward);
    setClaimError(null);
    setClaimModalOpen(true);

    // Track when user opens claim modal
    ReactGA.event({
      category: 'Rewards',
      action: 'Open Claim Modal',
      label: reward.actum_name,
      value: reward.actum_pointamount,
    });
  };

  const handleCloseClaimModal = () => {
    setClaimModalOpen(false);
    setSelectedReward(null);
    setClaimError(null);
  };

  const handleCloseSuccessModal = () => {
    setSuccessModalOpen(false);
    setVoucherInfo(null);
    setSelectedReward(null);
  };

  const handleConfirmClaim = async () => {
    if (!selectedReward || !currentUser) return;

    const accountId = currentUser._parentcustomerid_value;
    const contactId = currentUser.contactid;

    if (!accountId || !contactId) {
      setClaimError(t('errorMessages.invalidResponse'));
      return;
    }

    // Check if user has enough points
    if (balance < selectedReward.actum_pointamount) {
      setClaimError(t('errorMessages.insufficientPoints'));
      return;
    }

    setClaiming(true);
    setClaimError(null);

    try {
      const response = await dataverseService.rewards.claimRewards({
        accountId,
        contactId,
        pointAmount: selectedReward.actum_pointamount,
        rewards: [
          {
            rewardId: selectedReward.actum_rewardid,
            quantity: 1,
          },
        ],
      });

      // Check if claim was successful
      if (response.status === 'success' && response.items && response.items.length > 0) {
        // Extract voucher codes from the items array
        const voucherCodes = response.items.flat().map(item => item.voucherCode);
        
        // Refresh rewards data to update balance first
        await refetch();
        
        setVoucherInfo({
          voucherCodes,
        });

        // Track successful reward claim
        ReactGA.event({
          category: 'Rewards',
          action: 'Claim Success',
          label: selectedReward.actum_name,
          value: selectedReward.actum_pointamount,
        });

        // Close claim modal and open success modal
        setClaimModalOpen(false);
        setSuccessModalOpen(true);
      } else {
        // Track claim failure
        ReactGA.event({
          category: 'Rewards',
          action: 'Claim Failed',
          label: `${selectedReward.actum_name} - Unknown error`,
        });

        setClaimError(t('errorMessages.claimFailed'));
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
      const errorMessage = err instanceof Error ? err.message : t('errorMessages.networkError');
      
      // Track claim error
      ReactGA.event({
        category: 'Rewards',
        action: 'Claim Error',
        label: `${selectedReward.actum_name} - ${errorMessage}`,
      });

      setClaimError(errorMessage);
    } finally {
      setClaiming(false);
    }
  };

  const canAffordReward = (reward: Reward): boolean => {
    return balance >= reward.actum_pointamount;
  };


  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            {t('title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t('error')}
          </Alert>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Points Balance Card */}
            <Paper
              elevation={1}
              sx={{
                mb: 4,
                p: 4,
                bgcolor: 'white',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                  {t('pointsBalance.available')}
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {t('pointsBalance.points', { count: balance })}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('pointsBalance.earnMore')}
              </Typography>
              {/* Story 4: Transaction history button */}
              <Button
                variant="text"
                size="small"
                startIcon={<HistoryIcon />}
                onClick={handleOpenTransactionHistory}
                sx={{ mt: 2 }}
              >
                {t('transactionHistory.viewButton')}
              </Button>
            </Paper>

            {/* Reward Catalog */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                {t('catalog.title')}
              </Typography>

              {rewards.length === 0 ? (
                <Alert severity="info">{t('catalog.noRewards')}</Alert>
              ) : (
                <Grid container spacing={3}>
                  {rewards.map((reward) => {
                    const affordable = canAffordReward(reward);
                    return (
                      <Grid item xs={12} sm={6} md={4} key={reward.actum_rewardid}>
                        <Card
                          sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': affordable
                              ? {
                                  transform: 'translateY(-4px)',
                                  boxShadow: 6,
                                }
                              : {},
                            opacity: affordable ? 1 : 0.6,
                          }}
                        >
                          {/* Affordability Badge */}
                          {affordable ? (
                            <Chip
                              label={t('catalog.available')}
                              variant="outlined"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                zIndex: 1,
                                bgcolor: 'transparent',
                                color: 'text.secondary',
                                borderColor: 'text.secondary',
                                fontWeight: 500,
                              }}
                            />
                          ) : (
                            <Chip
                              label={t('catalog.insufficientPoints')}
                              variant="outlined"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                zIndex: 1,
                                bgcolor: 'transparent',
                                color: 'text.disabled',
                                borderColor: 'divider',
                                opacity: 0.6,
                              }}
                            />
                          )}

                          <CardContent sx={{ flexGrow: 1, pt: 5 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 2,
                              }}
                            >
                              <GiftIcon
                                sx={{ fontSize: 40, color: 'primary.main', mr: 1 }}
                              />
                            </Box>
                            <Typography
                              variant="h6"
                              gutterBottom
                              sx={{ fontWeight: 600 }}
                            >
                              {reward.actum_name}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 2, minHeight: '3em' }}
                            >
                              {reward.actum_description || ''}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Typography
                              variant="h6"
                              color="primary"
                              sx={{ fontWeight: 600 }}
                            >
                              {t('catalog.cost', { points: reward.actum_pointamount })}
                            </Typography>
                          </CardContent>

                          <CardActions sx={{ p: 2, pt: 0 }}>
                            <Button
                              variant="contained"
                              fullWidth
                              disabled={!affordable}
                              onClick={() => handleOpenClaimModal(reward)}
                              startIcon={<GiftIcon />}
                            >
                              {t('actions.claim')}
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </>
        )}

        {/* Claim Confirmation Modal */}
        <Dialog
          open={claimModalOpen}
          onClose={handleCloseClaimModal}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('claimModal.title')}</DialogTitle>
          <DialogContent>
            {claimError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {claimError}
              </Alert>
            )}

            <Typography variant="body1" sx={{ mb: 3 }}>
              {t('claimModal.confirmMessage')}
            </Typography>

            {selectedReward && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('claimModal.rewardName')}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedReward.actum_name}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('claimModal.cost')}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {t('claimModal.points', {
                      count: selectedReward.actum_pointamount,
                    })}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('claimModal.currentBalance')}
                  </Typography>
                  <Typography variant="body1">
                    {t('claimModal.points', { count: balance })}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('claimModal.newBalance')}
                  </Typography>
                  <Typography variant="body1" color="primary" sx={{ fontWeight: 600 }}>
                    {t('claimModal.points', {
                      count: balance - selectedReward.actum_pointamount,
                    })}
                  </Typography>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseClaimModal} disabled={claiming}>
              {t('claimModal.cancelButton')}
            </Button>
            <Button
              onClick={handleConfirmClaim}
              variant="contained"
              disabled={claiming}
              startIcon={claiming ? <CircularProgress size={20} /> : null}
            >
              {claiming ? t('actions.claiming') : t('claimModal.confirmButton')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Modal */}
        <Dialog
          open={successModalOpen}
          onClose={handleCloseSuccessModal}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckIcon color="success" />
              <Typography variant="h6">{t('success.title')}</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Alert severity="success" sx={{ mb: 3 }}>
              {t('success.message')}
            </Alert>

            {voucherInfo && currentUser && (
              <Stack spacing={3}>
                {voucherInfo.voucherCodes.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Voucher Code{voucherInfo.voucherCodes.length > 1 ? 's' : ''}
                    </Typography>
                    {voucherInfo.voucherCodes.map((code, index) => (
                      <Paper
                        key={index}
                        sx={{
                          p: 3,
                          bgcolor: 'rgba(0, 0, 0, 0.02)',
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          mb: voucherInfo.voucherCodes.length > 1 && index < voucherInfo.voucherCodes.length - 1 ? 2 : 0,
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
                          {code}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('success.emailSent')}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {currentUser.emailaddress1}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('success.newBalance')}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {t('success.points', { count: balance })}
                  </Typography>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseSuccessModal} variant="contained">
              {t('actions.close')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Story 4: Transaction History Modal */}
        <Dialog
          open={transactionModalOpen}
          onClose={() => setTransactionModalOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>{t('transactionHistory.title')}</DialogTitle>
          <DialogContent>
            {transactionsLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}
            {transactionsError && (
              <Alert severity="error" sx={{ mb: 2 }}>{transactionsError}</Alert>
            )}
            {!transactionsLoading && !transactionsError && transactions.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                {t('transactionHistory.empty')}
              </Typography>
            )}
            {!transactionsLoading && transactions.length > 0 && (
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('transactionHistory.columns.description')}</TableCell>
                      <TableCell>{t('transactionHistory.columns.date')}</TableCell>
                      <TableCell>{t('transactionHistory.columns.type')}</TableCell>
                      <TableCell>{t('transactionHistory.columns.status')}</TableCell>
                      <TableCell align="right">{t('transactionHistory.columns.points')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx, idx) => (
                      <TableRow
                        key={tx.actum_loyaltytransactionid}
                        sx={{ bgcolor: idx % 2 === 1 ? 'grey.50' : 'transparent' }}
                      >
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {tx.actum_portalmessage || '---'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateEU(tx.createdon)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {tx.actum_transactiontype === TransactionType.Addition ? (
                              <TrendingUpIcon fontSize="small" color="success" />
                            ) : (
                              <TrendingDownIcon fontSize="small" color="error" />
                            )}
                            <Typography variant="body2">
                              {tx.actum_transactiontype === TransactionType.Addition
                                ? t('transactionHistory.typeAddition')
                                : t('transactionHistory.typeDeletion')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {getTransactionStatusLabel(tx)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                            color={tx.actum_transactiontype === TransactionType.Addition ? 'success.main' : 'error.main'}
                          >
                            {tx.actum_transactiontype === TransactionType.Addition ? '+' : '-'}{tx.actum_loyaltypoints}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setTransactionModalOpen(false)} variant="contained">
              {t('actions.close')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

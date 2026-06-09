import React from "react";
import { Layout } from "../components/Layout";
import { UploadNewInvoice } from "../components/Invoices/UploadNewInvoice";
import { getInvoiceStatus, InvoiceStatusCode } from "../types/invoice";
import type { InvoiceItem } from "../types/invoice";
import { 
  Box, 
  Paper, 
  Stack, 
  Typography, 
  Tabs, 
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputAdornment,
  Alert,
  Collapse,
  CircularProgress,
  Divider,
} from "@mui/material";
import { 
  CheckCircle as CheckCircleIcon, 
  Cancel as CancelIcon, 
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useInvoices } from "../hooks/useInvoices";
import { useAuth } from "../contexts/AuthContext";
import { dataverseService } from "../services/dataverseService";
import { formatDateEU } from '../utils/dateUtils';

export const Invoices: React.FC = () => {

  const { t } = useTranslation("invoicesPage");
  const { invoices: fetchedInvoices, loading, error, refetch } = useInvoices();
  const { currentUser } = useAuth();

  React.useEffect(() => {
    document.title = t('pageTitle', 'Invoices | VMBSO Customer Portal');
  }, [t]);
  const [tabValue, setTabValue] = React.useState(0);
  const [searchText, setSearchText] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [showProcessingNotification, setShowProcessingNotification] = React.useState(false);

  // Story 2: Point-earning lines expandable section
  const [expandedInvoiceId, setExpandedInvoiceId] = React.useState<string | null>(null);
  const [invoiceItemsCache, setInvoiceItemsCache] = React.useState<Record<string, InvoiceItem[]>>({});
  const [invoiceItemsLoading, setInvoiceItemsLoading] = React.useState<string | null>(null);
  const [invoiceItemsError, setInvoiceItemsError] = React.useState<string | null>(null);

  const handleToggleExpand = async (invoiceId: string) => {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
      return;
    }

    setExpandedInvoiceId(invoiceId);
    setInvoiceItemsError(null);

    // If already cached, don't re-fetch
    if (invoiceItemsCache[invoiceId]) return;

    setInvoiceItemsLoading(invoiceId);
    try {
      const items = await dataverseService.invoices.getItemsByInvoice(
        invoiceId,
        currentUser?.contactid || ''
      );
      const validPointItems = items.filter(item => {
        const points = Number(item.actum_loaltypointsgranted);
        return Number.isFinite(points) && points > 0;
      });

      setInvoiceItemsCache(prev => ({ ...prev, [invoiceId]: validPointItems }));
    } catch (err) {
      setInvoiceItemsError(t('pointDetails.error'));
    } finally {
      setInvoiceItemsLoading(null);
    }
  };

  // Filter invoices based on search and status
  const filteredInvoices = React.useMemo(() => {
    let filtered = fetchedInvoices;

    // Filter by search text
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((invoice) => {
        const invoiceNumber = invoice.actum_invoicenumber?.toLowerCase() || '';
        const uploaderName = invoice['uploader.fullname']?.toLowerCase() || '';
        const uploaderEmail = invoice['uploader.emailaddress1']?.toLowerCase() || '';
        
        return (
          invoiceNumber.includes(search) ||
          uploaderName.includes(search) ||
          uploaderEmail.includes(search)
        );
      });
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice) => 
        getInvoiceStatus(invoice.statuscode) === statusFilter
      );
    }

    return filtered;
  }, [fetchedInvoices, searchText, statusFilter]);

  const handleInvoiceUploaded = () => {
    // Refresh the invoice list from server
    refetch();
    
    // Switch to "My Invoices" tab to show the newly uploaded invoice
    setTabValue(0);
    
    // Show processing notification
    setShowProcessingNotification(true);
  };

  const getStatusIcon = (status: ReturnType<typeof getInvoiceStatus>) => {
    switch (status) {
      case "draft":
        return <CheckCircleIcon color="disabled" fontSize="large" />;
      case "submitted":
        return <CheckCircleIcon color="info" fontSize="large" />;
      case "extracted":
        return <CheckCircleIcon color="disabled" fontSize="large" />;
      case "review":
        return <CheckCircleIcon color="warning" fontSize="large" />;
      case "credited":
        return <CheckCircleIcon color="success" fontSize="large" />;
      case "rejected":
        return <CancelIcon color="error" fontSize="large" />;
      case "canceled":
        return <CancelIcon color="disabled" fontSize="large" />;
      default:
        return <CheckCircleIcon color="disabled" fontSize="large" />;
    }
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: "52rem", mx: "auto", px: { xs: "1rem", sm: 0 } }}>
        <Typography variant="h3" sx={{ mb: 3 }}>
          {t("title")}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label={t("tabs.myInvoices")} />
            <Tab label={t("tabs.uploadNew")} />
          </Tabs>
        </Box>

        {/* Tab 0: My Invoices */}
        {tabValue === 0 && (
          <Box>
            {/* Processing notification */}
            {showProcessingNotification && (
              <Alert 
                severity="info" 
                sx={{ mb: 3 }} 
                onClose={() => setShowProcessingNotification(false)}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {t("uploadNewInvoice.processing.title")}
                </Typography>
                <Typography variant="body2">
                  {t("uploadNewInvoice.processing.message")}
                </Typography>
              </Alert>
            )}

            {/* Search and Filter Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <TextField
                placeholder={t("search.placeholder")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                size="small"
                sx={{ flexGrow: 1, minWidth: '200px' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: '150px' }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">{t("filter.all")}</MenuItem>
                  <MenuItem value="draft">{t("states.draft")}</MenuItem>
                  <MenuItem value="submitted">{t("states.submitted")}</MenuItem>
                  <MenuItem value="extracted">{t("states.extracted")}</MenuItem>
                  <MenuItem value="review">{t("states.review")}</MenuItem>
                  <MenuItem value="credited">{t("states.credited")}</MenuItem>
                  <MenuItem value="rejected">{t("states.rejected")}</MenuItem>
                  <MenuItem value="canceled">{t("states.canceled")}</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {loading && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t("loading")}
              </Typography>
            )}
            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}

            {/* Invoice Cards */}
            <Box display={"flex"} flexDirection={"column"} gap={"1rem"}>
              {filteredInvoices.length === 0 && !loading && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  {t("noInvoices")}
                </Typography>
              )}
              {filteredInvoices.map((invoice) => (
                <Paper sx={{ padding: "2rem" }} key={invoice.actum_invoiceid}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap="1rem">
                    <Stack spacing={0.5}>
                      <Typography variant="h6">
                        {invoice.actum_name?.replace(/^Portal\s+/i, '') || invoice.actum_invoicenumber || t('states.draft')}
                      </Typography>
                      {invoice.actum_invoicedate && (
                        <Typography variant="body2" color="text.secondary">
                          {t('invoiceDate')}: {formatDateEU(invoice.actum_invoicedate)}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {t('uploadedBy')}: {invoice['uploader.fullname'] || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice['uploader.emailaddress1']}
                      </Typography>
                      {invoice['account.name'] && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {t('company')}: {invoice['account.name']}
                        </Typography>
                      )}
                    </Stack>
                    <Box display="flex" flexDirection="column" alignItems="flex-end" alignSelf="flex-start" gap="0.5rem">
                      <Box display="flex" alignItems="center" gap="0.5rem">
                        <Typography textTransform="capitalize" variant="caption">
                          {t(`states.${getInvoiceStatus(invoice.statuscode)}`)}
                        </Typography>
                        {getStatusIcon(getInvoiceStatus(invoice.statuscode))}
                      </Box>
                      {getInvoiceStatus(invoice.statuscode) === 'credited' && invoice.actum_loaltypointsgranted !== undefined && (
                        <Typography variant="h5" color="primary.main" sx={{ fontWeight: 700 }}>
                          {invoice.actum_loaltypointsgranted} {t('loyaltyPoints')}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {t('uploaded')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateEU(invoice.createdon)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Story 2: Point-earning lines expandable section (credited invoices only) */}
                  {invoice.statuscode === InvoiceStatusCode.CREDITED && (
                    <>
                      <Box
                        sx={{ mt: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                        onClick={() => handleToggleExpand(invoice.actum_invoiceid)}
                      >
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                          {t('pointDetails.toggle')}
                        </Typography>
                        {expandedInvoiceId === invoice.actum_invoiceid ? (
                          <ExpandLessIcon fontSize="small" color="primary" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" color="primary" />
                        )}
                      </Box>
                      <Collapse in={expandedInvoiceId === invoice.actum_invoiceid}>
                        <Box sx={{ mt: 2, pl: 1 }}>
                          {invoiceItemsLoading === invoice.actum_invoiceid && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={16} />
                              <Typography variant="caption" color="text.secondary">
                                {t('pointDetails.loading')}
                              </Typography>
                            </Box>
                          )}
                          {invoiceItemsError && expandedInvoiceId === invoice.actum_invoiceid && (
                            <Typography variant="caption" color="error">
                              {invoiceItemsError}
                            </Typography>
                          )}
                          {invoiceItemsCache[invoice.actum_invoiceid] && (
                            invoiceItemsCache[invoice.actum_invoiceid].length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                {t('pointDetails.empty')}
                              </Typography>
                            ) : (
                              <Box>
                                {/* Header row */}
                                <Box
                                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
                                >
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    {t('pointDetails.columnItem')}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    {t('pointDetails.columnPoints')}
                                  </Typography>
                                </Box>
                                <Divider />
                                {invoiceItemsCache[invoice.actum_invoiceid].map((item, idx) => (
                                  <React.Fragment key={item.actum_invoiceitemid}>
                                    <Box
                                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 1 }}
                                    >
                                      <Typography variant="body2" sx={{ pr: 2 }}>
                                        {item.actum_name}
                                      </Typography>
                                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {item['actum_loaltypointsgranted@OData.Community.Display.V1.FormattedValue'] || item.actum_loaltypointsgranted} {t('loyaltyPoints')}
                                      </Typography>
                                    </Box>
                                    {idx < invoiceItemsCache[invoice.actum_invoiceid].length - 1 && (
                                      <Divider sx={{ borderColor: 'grey.200' }} />
                                    )}
                                  </React.Fragment>
                                ))}
                              </Box>
                            )
                          )}
                        </Box>
                      </Collapse>
                    </>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* Tab 1: Upload New Invoice */}
        {tabValue === 1 && (
          <Box>
            <UploadNewInvoice onUploaded={handleInvoiceUploaded} />
          </Box>
        )}
      </Box>
    </Layout>
  )
};

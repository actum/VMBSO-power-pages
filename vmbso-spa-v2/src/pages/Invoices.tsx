import React from "react";
import { Layout } from "../components/Layout";
import { UploadNewInvoice } from "../components/Invoices/UploadNewInvoice";
import { getInvoiceStatus } from "../types/invoice";
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
  Divider,
  IconButton
} from "@mui/material";
import { 
  CheckCircle as CheckCircleIcon, 
  Cancel as CancelIcon, 
  EuroSymbol as EuroSymbolIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useInvoices } from "../hooks/useInvoices";

// --- MOCK DATA (to be replaced by real flow data) ---
const MOCK_POINT_LINES: Record<string, { name: string; points: number }[]> = {
  // Keyed by actum_invoiceid — attach to whichever invoice is "Credited" in your test data
  '__MOCK_CREDITED__': [
    { name: 'RESITRIX SKW FULL BOND 1X10M', points: 12000 },
    { name: 'VM ZINK MEMBRAAN MET KLEEFSTROOK 75M²/ROL', points: 4800 },
    { name: 'ZETCA52R750', points: 600 },
  ],
};

export const Invoices: React.FC = () => {

  const { t } = useTranslation("invoicesPage");
  const { invoices: fetchedInvoices, loading, error, refetch } = useInvoices();

  React.useEffect(() => {
    document.title = t('pageTitle', 'Invoices | VMBSO Customer Portal');
  }, [t]);
  const [tabValue, setTabValue] = React.useState(0);
  const [searchText, setSearchText] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [showProcessingNotification, setShowProcessingNotification] = React.useState(false);
  const [expandedLines, setExpandedLines] = React.useState<Record<string, boolean>>({});

  const toggleLines = (invoiceId: string) => {
    setExpandedLines(prev => ({ ...prev, [invoiceId]: !prev[invoiceId] }));
  };

  // For mock: use the first credited invoice found to attach mock lines
  const mockCreditedId = React.useMemo(() => {
    return fetchedInvoices.find(i => getInvoiceStatus(i.statuscode) === 'credited')?.actum_invoiceid ?? null;
  }, [fetchedInvoices]);

  const getPointLines = (invoiceId: string) => {
    // Real implementation will look up lines by invoiceId from flow data
    if (invoiceId === mockCreditedId) return MOCK_POINT_LINES['__MOCK_CREDITED__'];
    return [];
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
        return <CheckCircleIcon color="primary" fontSize="large" />;
      case "review":
        return <CheckCircleIcon color="warning" fontSize="large" />;
      case "credited":
        return <EuroSymbolIcon color="primary" fontSize="large" />;
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
                          {t('invoiceDate')}: {invoice['actum_invoicedate@OData.Community.Display.V1.FormattedValue'] || 
                           new Date(invoice.actum_invoicedate).toLocaleDateString()}
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
                        {invoice['createdon@OData.Community.Display.V1.FormattedValue'] || 
                         new Date(invoice.createdon).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Point lines breakdown — credited invoices only */}
                  {getInvoiceStatus(invoice.statuscode) === 'credited' && (() => {
                    const lines = getPointLines(invoice.actum_invoiceid);
                    const isOpen = !!expandedLines[invoice.actum_invoiceid];
                    return (
                      <Box sx={{ mt: 2 }}>
                        <Divider sx={{ mb: 1.5 }} />
                        <Box
                          display="flex"
                          alignItems="center"
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => toggleLines(invoice.actum_invoiceid)}
                        >
                          <Typography variant="body2" color="primary" sx={{ fontWeight: 600, flexGrow: 1 }}>
                            Point details {lines.length > 0 ? `(${lines.length} lines)` : ''}
                          </Typography>
                          <IconButton size="small" color="primary">
                            {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                        <Collapse in={isOpen}>
                          <Box sx={{ mt: 1.5 }}>
                            {lines.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                No point-earning lines available.
                              </Typography>
                            ) : (
                              <Stack spacing={1}>
                                {lines.map((line, idx) => (
                                  <Box
                                    key={idx}
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    sx={{
                                      py: 0.75,
                                      px: 1.5,
                                      borderRadius: 1,
                                      bgcolor: 'grey.50',
                                    }}
                                  >
                                    <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                                      {line.name.toLowerCase()}
                                    </Typography>
                                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700, ml: 2, whiteSpace: 'nowrap' }}>
                                      {line.points.toLocaleString()} pts
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            )}
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })()}
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

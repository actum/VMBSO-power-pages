import React from "react";
import { Layout } from "../components/Layout";
import { UploadNewInvoice } from "../components/Invoices/UploadNewInvoice";
import type { Invoice } from "../types/invoice";
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
  InputLabel,
  InputAdornment
} from "@mui/material";
import { 
  CheckCircle as CheckCircleIcon, 
  Cancel as CancelIcon, 
  Paid as PaidIcon,
  Search as SearchIcon 
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useInvoices } from "../hooks/useInvoices";

export const Invoices: React.FC = () => {

  const { t } = useTranslation("invoicesPage");
  const { invoices: fetchedInvoices, loading, error } = useInvoices();
  const [localInvoices, setLocalInvoices] = React.useState<Invoice[]>([]);
  const [tabValue, setTabValue] = React.useState(0);
  const [searchText, setSearchText] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const invoices = React.useMemo(() => {
    const fetchedByNumber = new Set(fetchedInvoices.map((invoice) => invoice.actum_invoicenumber));
    const uniqueLocal = localInvoices.filter((invoice) => !fetchedByNumber.has(invoice.actum_invoicenumber));
    return [...fetchedInvoices, ...uniqueLocal];
  }, [fetchedInvoices, localInvoices]);

  // Filter invoices based on search and status
  const filteredInvoices = React.useMemo(() => {
    let filtered = invoices;

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
  }, [invoices, searchText, statusFilter]);

  const handleInvoiceUploaded = (newInvoice: Invoice) => {
    if (invoices.some(inv => inv.actum_invoicenumber === newInvoice.actum_invoicenumber)) {
      console.warn("Invoice with this number already exists:", newInvoice.actum_invoicenumber);
      return;
    }
    setLocalInvoices((prev) => [...prev, newInvoice]);
    // Switch to "My Invoices" tab to show the newly uploaded invoice
    setTabValue(0);
  };

  const getStatusIcon = (status: ReturnType<typeof getInvoiceStatus>) => {
    switch (status) {
      case "submitted":
        return <CheckCircleIcon color="info" fontSize="large" />;
      case "approved":
        return <CheckCircleIcon color="success" fontSize="large" />;
      case "credited":
        return <PaidIcon color="success" fontSize="large" />;
      case "rejected":
        return <CancelIcon color="error" fontSize="large" />;
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
                  <MenuItem value="submitted">{t("states.submitted")}</MenuItem>
                  <MenuItem value="approved">{t("states.approved")}</MenuItem>
                  <MenuItem value="credited">{t("states.credited")}</MenuItem>
                  <MenuItem value="rejected">{t("states.rejected")}</MenuItem>
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
                        {invoice.actum_name.replace(/^Portal\s+/i, '')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('invoiceDate')}: {invoice['actum_invoicedate@OData.Community.Display.V1.FormattedValue'] || 
                         new Date(invoice.actum_invoicedate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('uploadedBy')}: {invoice['uploader.fullname'] || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice['uploader.emailaddress1']}
                      </Typography>
                      {invoice.actum_rejectionreason && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          {t('rejectionReason')}: {invoice.actum_rejectionreason}
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
                      <Typography variant="h6">
                        {invoice['actum_totalamount@OData.Community.Display.V1.FormattedValue'] || 
                         `€${invoice.actum_totalamount.toFixed(2)}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('uploaded')}: {invoice['createdon@OData.Community.Display.V1.FormattedValue'] || 
                         new Date(invoice.createdon).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
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

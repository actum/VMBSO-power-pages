import React from "react";
import { Layout } from "../components/Layout";
import { UploadNewInvoice } from "../components/Invoices/UploadNewInvoice";
import type { Invoice } from "../types/invoice";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { CheckCircle as CheckCircleIcon, Cancel as CancelIcon, Paid as PaidIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useInvoices } from "../hooks/useInvoices";

export const Invoices: React.FC = () => {

  const { t } = useTranslation("invoicesPage");
  const { invoices: fetchedInvoices, loading, error } = useInvoices();
  const [localInvoices, setLocalInvoices] = React.useState<Invoice[]>([]);

  const invoices = React.useMemo(() => {
    const fetchedByNumber = new Set(fetchedInvoices.map((invoice) => invoice.actum_invoicenumber));
    const uniqueLocal = localInvoices.filter((invoice) => !fetchedByNumber.has(invoice.actum_invoicenumber));
    return [...fetchedInvoices, ...uniqueLocal];
  }, [fetchedInvoices, localInvoices]);

  const handleInvoiceUploaded = (newInvoice: Invoice) => {
    if (invoices.some(inv => inv.actum_invoicenumber === newInvoice.actum_invoicenumber)) {
      console.warn("Invoice with this number already exists:", newInvoice.actum_invoicenumber);
      return;
    }
    setLocalInvoices((prev) => [...prev, newInvoice]);
  };

  const getStatusIcon = (status: Invoice["actum_status"]) => {
    if (status === "submitted") {
      return <CheckCircleIcon color="info" fontSize="large" />;
    }

    if (status === "rejected") {
      return <CancelIcon color="error" fontSize="large" />;
    }

    return <PaidIcon color="success" fontSize="large" />;
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: "52rem", mx: "auto", px: { xs: "1rem", sm: 0 } }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          {t("title")}
        </Typography>
        {loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Loading invoices...
          </Typography>
        )}
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
        <Box my={"2rem"} display={"flex"} flexDirection={"column"} gap={"1rem"}>
          {invoices.map((invoice) => (
            <Paper sx={{ padding: "2rem" }} key={invoice.actum_invoicenumber}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap="1rem">
                <Stack spacing={0.5}>
                  <Typography>{invoice.actum_account}</Typography>
                  <Typography variant="body2">{invoice.actum_contact}</Typography>
                </Stack>
                <Box display="flex" alignItems="center" gap="0.5rem">
                  <Typography textTransform={"capitalize"} variant="caption">{t(`states.${invoice.actum_status}`)}</Typography>
                  {invoice.actum_status === "credited" && (
                    <Typography variant="caption" fontWeight={600}>
                      {invoice.actum_creditpoints}
                    </Typography>
                  )}
                  {getStatusIcon(invoice.actum_status)}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
        <UploadNewInvoice onUploaded={handleInvoiceUploaded} />
      </Box>
    </Layout>
  )
};

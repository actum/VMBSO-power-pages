import React from 'react';
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  Box,
  Button,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  CloudUploadOutlined,
  DeleteOutline,
  PictureAsPdfOutlined,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { dataverseService } from "../../services/dataverseService";
import type { Invoice } from '../../types/invoice';

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type UploadNewInvoiceProps = {
  onUploaded?: (invoice: Invoice) => void;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const UploadNewInvoice: React.FC<UploadNewInvoiceProps> = ({ onUploaded }: UploadNewInvoiceProps) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation("invoicesPage", {
    keyPrefix: "uploadNewInvoice"
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);

  React.useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const mapDropError = React.useCallback((rejection: FileRejection) => {
    const firstError = rejection.errors[0];
    if (!firstError) {
      return t("validation.invalidType");
    }

    if (firstError.code === "file-invalid-type") {
      return t("validation.invalidType");
    }

    if (firstError.code === "file-too-large") {
      return t("validation.fileTooLarge", { maxSizeMb: MAX_FILE_SIZE_MB });
    }

    if (firstError.code === "too-many-files") {
      return t("validation.tooManyFiles");
    }

    return firstError.message;
  }, [t]);

  const onDropAccepted = React.useCallback((acceptedFiles: File[]) => {
    setSelectedFile(acceptedFiles[0] ?? null);
    setErrorMessage(null);
  }, []);

  const onDropRejected = React.useCallback((rejections: FileRejection[]) => {
    const firstRejection = rejections[0];
    if (!firstRejection) {
      return;
    }

    setSelectedFile(null);
    setErrorMessage(mapDropError(firstRejection));
  }, [mapDropError]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    noClick: true,
    noDrag: isMobile,
    onDropAccepted,
    onDropRejected,
  });

  const handleUpload = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!selectedFile) {
      setErrorMessage(t("validation.required"));
      return;
    }

    if (!currentUser || !currentUser.contactid || !currentUser.fullname || !currentUser.emailaddress1) {
      setErrorMessage("Missing authenticated contact context.");
      return;
    }

    try {
      setErrorMessage(null);
      setIsUploading(true);

      const uploadedInvoice: Invoice = await dataverseService.invoices.uploadInvoice({
        contactId: currentUser.contactid,
        account: currentUser.fullname.trim(),
        contact: currentUser.emailaddress1.trim(),
        file: selectedFile,
      });

      onUploaded?.(uploadedInvoice);

      // Reset fields only after successful backend upload.
      setSelectedFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload invoice";
      setErrorMessage(message);
      console.error("Error uploading invoice:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorMessage(null);
  };

  return (
    <>
      <Typography variant="h4" sx={{ mb: 1 }}>
        {t("title")}
      </Typography>
      {!isMobile && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
          {t("subtitle")}
        </Typography>
      )}

      <Box component={"form"} onSubmit={handleUpload}>
        {selectedFile ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PictureAsPdfOutlined color="error" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t("selected.label")}
                </Typography>
                <Typography variant="body1">{selectedFile.name} ({formatFileSize(selectedFile.size)})</Typography>
              </Box>
            </Box>

            <Button
              color="inherit"
              onClick={handleRemoveFile}
              startIcon={<DeleteOutline />}
            >
              {t("actions.remove")}
            </Button>
          </Box>
        ) : (
          <Box my={"1.5rem"}>
            <Box
              {...getRootProps()}
              sx={{
                border: isMobile ? "1px solid" : "2px dashed",
                borderColor: errorMessage
                  ? "error.main"
                  : isDragActive
                    ? "primary.main"
                    : "divider",
                borderRadius: "0.75rem",
                p: { xs: "2rem 1rem", md: "2.5rem" },
                textAlign: "center",
                bgcolor: isDragActive ? "action.hover" : "background.paper",
                transition: "all 0.2s ease",
              }}
            >
              <input {...getInputProps()} aria-label={t("title")} />

              <Stack alignItems="center" spacing={1}>
                <CloudUploadOutlined color={isDragActive ? "primary" : "action"} />
                <Typography variant="h6">
                  {isMobile
                    ? t("dropzone.mobileTitle")
                    : isDragActive
                      ? t("dropzone.active")
                      : t("dropzone.idle")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("dropzone.hint", { maxSizeMb: MAX_FILE_SIZE_MB })}
                </Typography>
                <Button
                  onClick={open}
                  variant="outlined"
                  sx={{ mt: 1 }}
                  fullWidth={isMobile}
                >
                  {selectedFile ? t("actions.replace") : t("actions.browse")}
                </Button>
              </Stack>
            </Box>

            {errorMessage && (
              <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
                {errorMessage}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Button
        variant="contained"
        type="submit"
        sx={{ display: "flex", mt: 3, ml: "auto" }}
        fullWidth={isMobile}
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? "Uploading..." : t("actions.upload")}
      </Button>
    </>
  );
}
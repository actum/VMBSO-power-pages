import React, { useState, useMemo } from 'react';
import { Typography, Box, TextField, CircularProgress, Alert, Button, IconButton, Modal, Backdrop } from '@mui/material';
import { DownloadOutlined } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { Layout } from '../components/Layout';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../contexts/AuthContext';
import { dataverseService } from '../services/dataverseService';

export const Documents: React.FC = () => {
  React.useEffect(() => { document.title = 'Documents | VMBSO Customer Portal'; }, []);

  const [searchText, setSearchText] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const { documents, loading, error, refetch } = useDocuments();
  const { currentUser } = useAuth();

  // Client-side filtering
  const filteredDocuments = useMemo(() => {
    if (!searchText.trim()) return documents;
    const search = searchText.toLowerCase();
    return documents.filter(doc => 
      doc.actum_name?.toLowerCase().includes(search) ||
      doc.actum_filename?.toLowerCase().includes(search)
    );
  }, [documents, searchText]);

  const handleSearch = () => {
    // Search is now handled by filteredDocuments memo
  };

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleDownload = async (doc: typeof documents[0]) => {
    if (!currentUser?.contactid) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setDownloadingDocId(doc.actum_productdocumentationid);
      setIsPreparingDownload(true);

      // Create download log record
      console.log('[DOWNLOAD] Creating download log for document:', doc.actum_productdocumentationid);
      const downloadLog = await dataverseService.downloadLogs.create(
        currentUser.contactid,
        doc.actum_productdocumentationid
      );
      console.log('[DOWNLOAD] Download log created - Full response:', downloadLog);
      console.log('[DOWNLOAD] Download log ID:', downloadLog.actum_downloadlogid);

      if (!downloadLog.actum_downloadlogid) {
        throw new Error('Download log created but no ID returned');
      }

      // Poll for SAS token (check every 3 seconds, timeout after 60 seconds)
      const startTime = Date.now();
      const pollInterval = 3000; // 3 seconds
      const timeout = 60000; // 60 seconds
      let pollAttempt = 0;

      const poll = (): void => {
        pollAttempt++;
        const elapsed = Date.now() - startTime;
        
        console.log(`[DOWNLOAD] Polling attempt ${pollAttempt} (elapsed: ${Math.round(elapsed / 1000)}s)`);
        
        if (elapsed > timeout) {
          console.error('[DOWNLOAD] Timeout reached after', pollAttempt, 'attempts');
          setDownloadingDocId(null);
          setIsPreparingDownload(false);
          toast.error('Download preparation timed out. Please try again.');
          return;
        }

        dataverseService.downloadLogs.getById(downloadLog.actum_downloadlogid)
          .then((log) => {
            console.log('[DOWNLOAD] Poll response:', { 
              hasSasToken: !!log.actum_sastoken, 
              tokenPreview: log.actum_sastoken ? log.actum_sastoken.substring(0, 50) + '...' : null 
            });
            
            if (log.actum_sastoken) {
              // SAS token available - trigger download
              console.log('[DOWNLOAD] SAS token ready, triggering download');
              setDownloadingDocId(null);
              setIsPreparingDownload(false);
              
              // Force browser download
              const link = document.createElement('a');
              link.href = log.actum_sastoken;
              link.download = doc.actum_filename || 'download';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              console.log('[DOWNLOAD] Download triggered successfully');
            } else {
              // Not ready yet - poll again after interval
              console.log(`[DOWNLOAD] No SAS token yet, will poll again in ${pollInterval / 1000}s`);
              setTimeout(() => poll(), pollInterval);
            }
          })
          .catch((pollError) => {
            console.error('[DOWNLOAD] Error during polling:', pollError);
            // Continue polling even if there's an error (might be transient)
            if (elapsed < timeout) {
              console.log('[DOWNLOAD] Will retry polling despite error');
              setTimeout(() => poll(), pollInterval);
            } else {
              setDownloadingDocId(null);
              setIsPreparingDownload(false);
              toast.error('Failed to check download status. Please try again.');
            }
          });
      };

      // Start polling
      console.log('[DOWNLOAD] Starting polling...');
      poll();
    } catch (error) {
      setDownloadingDocId(null);
      setIsPreparingDownload(false);
      console.error('Download error:', error);
      toast.error('Failed to download document. Please try again.');
    }
  };

  return (
    <Layout>
      {/* Full-screen loading overlay */}
      <Modal
        open={isPreparingDownload}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <CircularProgress size={60} sx={{ color: 'primary.main', mb: 3 }} />
          <Typography variant="h5" sx={{ fontWeight: 500, color: 'primary.main' }}>
            We're preparing your download
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            This may take up to 60 seconds...
          </Typography>
        </Box>
      </Modal>

      <Box>
        <Typography variant="h4" gutterBottom>
          Documents
        </Typography>

        {/* Search Controls */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search documents..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            size="small"
            fullWidth
          />
          <Button variant="contained" onClick={handleSearch} disabled={loading}>
            Search
          </Button>
          <Button variant="outlined" onClick={handleClearSearch} disabled={loading}>
            Clear
          </Button>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => refetch()}>
            {error}
          </Alert>
        )}

        {/* Documents List */}
        {!loading && !error && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Found {filteredDocuments.length} document(s)
            </Typography>
            
            {filteredDocuments.length === 0 ? (
              <Alert severity="info">
                {searchText ? 'No documents match your search.' : 'No documents found.'}
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredDocuments.map((doc) => (
                  <Box
                    key={doc.actum_productdocumentationid}
                    sx={{
                      p: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{doc.actum_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        File: {doc.actum_filename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Visible: {doc.actum_visible ? 'Yes' : 'No'} | 
                        Unapproved Access: {doc.actum_unapprovedaccess ? 'Yes' : 'No'}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => handleDownload(doc)}
                      aria-label={`Download ${doc.actum_name}`}
                      disabled={downloadingDocId === doc.actum_productdocumentationid}
                      sx={{ 
                        ml: 2,
                        width: 56,
                        height: 56,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                        '&:disabled': {
                          backgroundColor: 'action.disabledBackground',
                        },
                      }}
                    >
                      {downloadingDocId === doc.actum_productdocumentationid ? (
                        <CircularProgress size={28} sx={{ color: 'white' }} />
                      ) : (
                        <DownloadOutlined sx={{ fontSize: 28 }} />
                      )}
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Layout>
  );
};

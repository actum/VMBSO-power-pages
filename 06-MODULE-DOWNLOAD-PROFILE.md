# Module 6: Download Integration & User Profile

## Goal
Implement document download from blob storage and create user profile page

## Estimated Time
1 day

## Dependencies
- Module 3 (Dataverse Integration) must be complete
- Module 4 (Document List) must be complete

## Overview

This module implements two key features:
1. **Document Download** - Enable users to download documents from blob storage
2. **User Profile Page** - Display user information and account details

## Tasks

### 6.1 Understand actum_ReferenceDocument Structure
- Examine what data is returned when expanding this lookup
- Determine if it contains direct blob URL or requires additional API calls

### 6.2 Implement Download Service

File: `src/services/downloadService.ts`

```typescript
export const downloadService = {
  downloadDocument: async (document: ClientDocument) => {
    // Get download URL from actum_referencedocument
    // Open URL or trigger download
  }
};
```

### 6.3 Update Download Button
- Call downloadService when clicked
- Show loading state
- Show success/error toast

### 6.4 Create Profile Page

File: `src/pages/Profile.tsx`

Display:
- User's name
- Email
- Country
- Role
- Member since date

## Claude Code Instructions

```markdown
MODULE 6: Download Integration & User Profile

CONTEXT:
- Documents have actum_referencedocument lookup that should contain blob storage URL
- Need to implement actual download functionality
- Create user profile page to display current user info

REQUIREMENTS:

1. Examine actum_ReferenceDocument Structure

First, log the expanded actum_referencedocument to understand its structure.
In the dataverseService.getDocuments(), already expanding this field.
Check console logs to see what data is returned.

Expected possibilities:
- Direct URL to blob storage
- SharePoint document location
- Another entity with URL field

2. Create Download Service (src/services/downloadService.ts)

```typescript
import { ClientDocument } from '../types/document';
import { toast } from 'react-toastify';

export const downloadService = {
  /**
   * Download document from blob storage
   * @param document - The document to download
   */
  downloadDocument: async (document: ClientDocument) => {
    try {
      // Extract download URL from actum_referencedocument
      // The structure depends on what's returned - adjust based on console logs
      
      // Possibility 1: Direct URL in actum_referencedocument
      const downloadUrl = document.actum_referencedocument?.url || 
                         document.actum_referencedocument?.downloadUrl;
      
      if (!downloadUrl) {
        throw new Error('Download URL not found');
      }
      
      // Option A: Open in new tab (simple)
      window.open(downloadUrl, '_blank');
      
      // Option B: Trigger download with specific filename (better)
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = document.actum_name || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please try again.');
      throw error;
    }
  }
};
```

3. Update DocumentList Component

Update the onDownload handler in Documents.tsx:

```typescript
import { downloadService } from '../services/downloadService';

// ... in Documents component

const handleDownload = async (document: ClientDocument) => {
  try {
    await downloadService.downloadDocument(document);
  } catch (error) {
    // Error already shown via toast
  }
};
```

4. Create Profile Page (src/pages/Profile.tsx)

```typescript
import { Container, Paper, Typography, Box, Grid, Divider, CircularProgress, Alert } from '@mui/material';
import { Person as PersonIcon, Email as EmailIcon, Public as CountryIcon, Work as RoleIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { formatDate } from '../utils/formatters';

export const Profile = () => {
  const { t, i18n } = useTranslation();
  const { user, loading, error } = useCurrentUser();

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Failed to load profile'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('profile.title')}
      </Typography>

      <Paper sx={{ p: 4, mt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('profile.personalInfo')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('profile.name')}
                </Typography>
                <Typography variant="body1">
                  {user.firstname} {user.lastname}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmailIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('profile.email')}
                </Typography>
                <Typography variant="body1">
                  {user.emailaddress1}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* TODO: Add custom fields when names confirmed */}
          {/* 
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CountryIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('profile.country')}
                </Typography>
                <Typography variant="body1">
                  {t(`countries.${user.actum_country}`)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RoleIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('profile.role')}
                </Typography>
                <Typography variant="body1">
                  {t(`roles.${user.actum_role}`)}
                </Typography>
              </Box>
            </Box>
          </Grid>
          */}
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('profile.accountInfo')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            {t('profile.createdOn')}
          </Typography>
          <Typography variant="body1">
            {formatDate(user.createdon || new Date().toISOString(), i18n.language)}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
```

5. Update Layout Component

Add logout functionality to user menu:

```typescript
import { useContext, useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { AccountCircle as AccountIcon } from '@mui/icons-material';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// In Layout component
const { currentUser, logout } = useContext(AuthContext);
const { t } = useTranslation();
const navigate = useNavigate();
const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
  setAnchorEl(event.currentTarget);
};

const handleClose = () => {
  setAnchorEl(null);
};

const handleProfile = () => {
  navigate('/profile');
  handleClose();
};

const handleLogout = () => {
  logout();
  handleClose();
};

// In JSX
<IconButton onClick={handleMenu} color="inherit">
  <AccountIcon />
</IconButton>
<Menu
  anchorEl={anchorEl}
  open={Boolean(anchorEl)}
  onClose={handleClose}
>
  <MenuItem onClick={handleProfile}>{t('navigation.profile')}</MenuItem>
  <MenuItem onClick={handleLogout}>{t('common.logout')}</MenuItem>
</Menu>
```

6. Add Toast Notifications Container

Update App.tsx to include ToastContainer:

```typescript
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// In App component JSX
<>
  <ToastContainer
    position="top-right"
    autoClose={3000}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    rtl={false}
    pauseOnFocusLoss
    draggable
    pauseOnHover
  />
  {/* Router and other components */}
</>
```

SUCCESS CRITERIA:
✅ Download button works and opens blob storage URL
✅ Download success/error messages shown
✅ Profile page displays user information
✅ User can navigate to profile from menu
✅ Logout works from user menu
✅ Toast notifications appear for download status

NOTES:
- The exact structure of actum_referencedocument is unknown
- Log it first and adjust downloadService accordingly
- May need to add custom fields to Contact type once names confirmed
- If blob URLs require authentication, may need SAS token generation

OUTPUT:
Working download functionality and user profile page
```

## Deliverables

- ✅ Working download functionality
- ✅ Profile page displaying user info
- ✅ User menu with profile and logout
- ✅ Toast notifications for feedback

## Success Criteria

- ✅ Download button works and opens blob storage URL
- ✅ Download success/error messages shown
- ✅ Profile page displays user information
- ✅ User can navigate to profile from menu
- ✅ Logout works from user menu
- ✅ Toast notifications appear for download status

## Testing Checklist

- [ ] Click download button on a document
- [ ] Verify download starts (file downloads or opens in new tab)
- [ ] Verify toast notification shows "Download started"
- [ ] Test download with missing URL (should show error)
- [ ] Navigate to Profile page
- [ ] Verify user name displays correctly
- [ ] Verify email displays correctly
- [ ] Verify "Member Since" date displays
- [ ] Click user avatar in header
- [ ] Select "Profile" from menu - should navigate
- [ ] Select "Logout" from menu - should logout and redirect
- [ ] Toast notifications appear and disappear correctly

## Next Steps

Once Module 6 is complete, proceed to Module 7 (Deployment & Polish).

## Troubleshooting

**Issue: Download URL not found**
- Check actum_referencedocument structure in console
- Verify field contains URL or path to document
- Check if URL needs authentication token

**Issue: Download fails**
- Check browser console for errors
- Verify blob storage URL is accessible
- Check CORS settings on blob storage
- Verify user has permission to access file

**Issue: Profile page shows "Failed to load"**
- Verify user is authenticated
- Check useCurrentUser hook is fetching correctly
- Verify Contact table permissions
- Check browser console for API errors

**Issue: Logout doesn't work**
- Verify logout function in AuthContext
- Check if session is being cleared
- Verify redirect to login page
- Check browser console for errors

**Issue: Toast notifications not showing**
- Verify react-toastify is installed
- Check ToastContainer is in App.tsx
- Verify CSS is imported: `import 'react-toastify/dist/ReactToastify.css'`
- Check toast calls: `toast.success()`, `toast.error()`

## Notes

- actum_referencedocument structure must be examined first
- Adjust downloadService based on actual structure
- Contact custom fields (role, country) can be added when names are confirmed
- Download may require SAS tokens if blob URLs are not public

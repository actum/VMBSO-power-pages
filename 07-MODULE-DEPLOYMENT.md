# Module 7: Deployment & Polish

## Goal
Deploy SPA to Power Pages and add final production-ready touches

## Estimated Time
1-2 days

## Dependencies
- All previous modules (1-6) must be complete

## Overview

This final module focuses on:
1. Building production bundle
2. Deploying to Power Pages via PAC CLI
3. Adding error boundaries
4. Adding loading skeletons
5. Final testing and polish
6. Creating documentation

## Tasks

### 7.1 Build Production Bundle
```bash
npm run build
```

### 7.2 Deploy to Power Pages

Using PAC CLI:
```bash
# Find your site ID
pac powerpages list

# Upload build to Power Pages
pac powerpages upload --path ./build
```

### 7.3 Configure SPA Routes in Power Pages
- Ensure `/app/*` routes work properly
- Configure web files and pages in Portal Management

### 7.4 Add Error Boundaries

File: `src/components/ErrorBoundary.tsx`

Catch React errors and show fallback UI.

### 7.5 Add Loading Skeletons

Replace simple spinners with MUI Skeleton components for better UX.

### 7.6 Final Testing
- Test all features in deployed environment
- Test all 5 languages
- Test authentication flow
- Test document list and download
- Test responsive design

### 7.7 Create Documentation

File: `README.md`

Include:
- Setup instructions
- Development workflow
- Deployment process
- Environment variables
- Troubleshooting

## Claude Code Instructions

```markdown
MODULE 7: Deployment & Polish

CONTEXT:
- Finalizing application for production deployment
- Deploying to Power Pages using PAC CLI
- Adding error handling and UX improvements
- Creating documentation

REQUIREMENTS:

1. Add Error Boundary (src/components/ErrorBoundary.tsx)

```typescript
import React, { Component, ReactNode } from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We're sorry, but something unexpected happened.
            </Typography>
            <Box>
              <Button variant="contained" onClick={this.handleReset}>
                Return to Home
              </Button>
            </Box>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}
```

2. Update App.tsx to Use Error Boundary

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

// Wrap entire app
<ErrorBoundary>
  <ToastContainer />
  <ThemeProvider theme={theme}>
    <AuthProvider>
      <Router>
        {/* Routes */}
      </Router>
    </AuthProvider>
  </ThemeProvider>
</ErrorBoundary>
```

3. Add Loading Skeletons

Create src/components/DocumentListSkeleton.tsx:

```typescript
import { Box, Skeleton } from '@mui/material';

export const DocumentListSkeleton = () => {
  return (
    <Box>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Skeleton variant="rectangular" height={60} />
        </Box>
      ))}
    </Box>
  );
};
```

Update Documents.tsx to use skeleton instead of just spinner:
```typescript
import { DocumentListSkeleton } from '../components/DocumentListSkeleton';

{loading ? (
  <DocumentListSkeleton />
) : (
  <DocumentList ... />
)}
```

4. Create Environment Configuration

Create .env.example file:
```
REACT_APP_DATAVERSE_URL=https://org06e85c00.crm4.dynamics.com
REACT_APP_PORTAL_URL=https://site-alfw4.powerappsportals.com
```

Create .env file (gitignored) with actual values.

Update services to use environment variables:
```typescript
const API_BASE = process.env.REACT_APP_PORTAL_URL || '';
```

5. Create Deployment Script

Add to package.json scripts:
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "deploy": "npm run build && pac powerpages upload --path ./build",
    "deploy:check": "pac powerpages list"
  }
}
```

6. Create README.md

```markdown
# VMBSO Customer Portal

Power Pages SPA for document management with multi-language support.

## Features
- User authentication (local Power Pages auth)
- Document browsing and download
- Multi-language support (EN, DA, DE, FR, NL)
- Responsive design
- Document filtering and search

## Tech Stack
- React 18 + TypeScript
- Material-UI (MUI)
- React Router
- react-i18next
- Dataverse Web API

## Setup

### Prerequisites
- Node.js 18+
- Power Platform CLI (pac)
- Access to Power Pages environment

### Installation

1. Clone repository
```bash
git clone [repo-url]
cd vmbso-portal
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your environment URLs
```

4. Authenticate PAC CLI
```bash
pac auth create --environment https://org06e85c00.crm4.dynamics.com
```

### Development

Run local dev server:
```bash
npm start
```

App will open at http://localhost:3000

API calls will proxy to Power Pages portal.

### Deployment

1. Build production bundle:
```bash
npm run build
```

2. Deploy to Power Pages:
```bash
npm run deploy
```

Or manually:
```bash
pac powerpages upload --path ./build
```

3. Find your site ID:
```bash
pac powerpages list
```

### Project Structure

```
src/
  components/    - Reusable UI components
  pages/         - Page components
  services/      - API services (auth, dataverse, download)
  contexts/      - React contexts (Auth)
  hooks/         - Custom React hooks
  types/         - TypeScript type definitions
  i18n/          - Translation files
  theme/         - MUI theme configuration
  utils/         - Helper functions
```

### Key Files

- `src/services/authService.ts` - Authentication logic
- `src/services/dataverseService.ts` - Dataverse API wrapper
- `src/services/downloadService.ts` - Document download logic
- `src/contexts/AuthContext.tsx` - Global auth state
- `src/i18n/config.ts` - i18n configuration

### Available Scripts

- `npm start` - Start dev server
- `npm run build` - Build for production
- `npm run deploy` - Build and deploy to Power Pages
- `npm test` - Run tests

### Environment Variables

- `REACT_APP_DATAVERSE_URL` - Dataverse environment URL
- `REACT_APP_PORTAL_URL` - Power Pages portal URL

### Troubleshooting

**Issue: API calls fail with 401**
- Check if user is authenticated
- Verify session cookie is present
- Try logging out and back in

**Issue: Documents not loading**
- Check Dataverse table permissions
- Verify actum_clientdocument table exists
- Check browser console for errors

**Issue: Download not working**
- Verify actum_referencedocument contains valid URL
- Check blob storage permissions
- Inspect network tab for failed requests

**Issue: Translations not showing**
- Verify language code in localStorage
- Check translation keys exist in JSON files
- Clear browser cache

**Issue: Deployment fails**
- Verify PAC CLI authentication: `pac auth list`
- Check site ID is correct: `pac powerpages list`
- Ensure build folder exists: `npm run build`

### Support

For issues or questions, contact [support email/team].

## License

[License information]
```

7. Create .gitignore

Ensure these are ignored:
```
node_modules/
build/
.env
.env.local
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

8. Build and Deploy

```bash
# Build
npm run build

# Verify build folder
ls -la build/

# Deploy
pac powerpages upload --path ./build

# If deployment fails, check:
pac auth list  # Verify auth
pac powerpages list  # Verify site ID
```

9. Configure Power Pages Routes (Manual Step in Portal)

After upload, in Portal Management app:
- Ensure web files are created for build assets
- Configure page templates if needed
- Set up routing for /app/* paths
- Test that SPA loads at portal URL

10. Final Testing Checklist

Create DEPLOYMENT_CHECKLIST.md:

```markdown
# Deployment Checklist

## Pre-Deployment

- [ ] All features tested locally
- [ ] All 5 languages tested
- [ ] No console errors
- [ ] Authentication flow works
- [ ] Document list loads
- [ ] Download works
- [ ] Profile page works
- [ ] Error handling tested
- [ ] Loading states work
- [ ] Logout works

## Build

- [ ] Run `npm run build` successfully
- [ ] No build warnings
- [ ] Build folder generated

## PAC CLI Setup

- [ ] PAC CLI installed
- [ ] Authenticated to environment: `pac auth list`
- [ ] Site ID confirmed: `pac powerpages list`

## Deployment

- [ ] Run `pac powerpages upload --path ./build`
- [ ] Deployment successful
- [ ] Verify files uploaded in Portal Management app

## Post-Deployment Testing

- [ ] Navigate to portal URL
- [ ] Test login
- [ ] Test registration
- [ ] Test document list
- [ ] Test filtering/search
- [ ] Test download
- [ ] Test language switching
- [ ] Test profile page
- [ ] Test logout
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari (if applicable)

## Rollback Plan

If deployment fails:
1. Note error message
2. Restore previous version if needed
3. Fix issues locally
4. Redeploy

## Post-Go-Live

- [ ] Monitor for errors (browser console)
- [ ] Check user feedback
- [ ] Monitor download success rate
- [ ] Verify all translations correct
- [ ] Check performance (load times)

## Known Issues

[Document any known issues or limitations]
```

SUCCESS CRITERIA:
✅ Production build created without errors
✅ Deployed to Power Pages successfully
✅ SPA accessible at portal URL
✅ All features work in deployed environment
✅ All languages work
✅ Error boundary catches errors gracefully
✅ Loading skeletons improve UX
✅ Documentation complete and accurate
✅ Deployment checklist followed
✅ No console errors in production

FINAL OUTPUT:
Production-ready SPA deployed to Power Pages with complete documentation
```

## Deliverables

- ✅ Production build
- ✅ Deployed to Power Pages
- ✅ Error boundaries implemented
- ✅ Loading skeletons added
- ✅ Complete documentation (README, deployment checklist)
- ✅ All features tested in production

## Success Criteria

- ✅ Production build created without errors
- ✅ Deployed to Power Pages successfully
- ✅ SPA accessible at portal URL
- ✅ All features work in deployed environment
- ✅ All languages work
- ✅ Error boundary catches errors gracefully
- ✅ Loading skeletons improve UX
- ✅ Documentation complete and accurate
- ✅ No console errors in production

## Final Testing Checklist

### Pre-Deployment
- [ ] All features tested locally
- [ ] All 5 languages tested
- [ ] No console errors
- [ ] Authentication flow works
- [ ] Document list loads
- [ ] Download works
- [ ] Profile page works
- [ ] Error handling tested
- [ ] Loading states work
- [ ] Logout works

### Build
- [ ] Run `npm run build` successfully
- [ ] No build warnings
- [ ] Build folder generated
- [ ] Verify build size is reasonable

### Deployment
- [ ] PAC CLI authenticated
- [ ] Site ID confirmed
- [ ] Deploy command succeeds
- [ ] Verify files in Portal Management

### Post-Deployment
- [ ] Portal URL accessible
- [ ] Login works
- [ ] Registration works
- [ ] Document list displays
- [ ] Filtering works
- [ ] Search works
- [ ] Download works
- [ ] Language switching works
- [ ] Profile page loads
- [ ] Logout works
- [ ] Test on multiple browsers
- [ ] No console errors

## Troubleshooting

**Issue: Build fails**
- Check for TypeScript errors: `npm run build`
- Verify all imports are correct
- Check for circular dependencies
- Ensure all environment variables are set

**Issue: PAC CLI authentication fails**
- Clear auth: `pac auth clear`
- Re-authenticate: `pac auth create`
- Verify environment URL is correct
- Check network connection

**Issue: Deployment fails**
- Verify build folder exists
- Check site ID: `pac powerpages list`
- Ensure sufficient permissions
- Check Portal Management app for errors

**Issue: SPA doesn't load after deployment**
- Verify web files were created
- Check routing configuration
- Inspect browser console for errors
- Verify proxy settings are correct

**Issue: API calls fail in production**
- Check CORS settings
- Verify Dataverse permissions
- Check authentication configuration
- Inspect network tab for errors

**Issue: Performance issues**
- Optimize images and assets
- Enable code splitting
- Check bundle size: `npm run build`
- Consider lazy loading components

## Next Steps After Deployment

1. **Monitor** - Watch for errors and user feedback
2. **Optimize** - Address performance issues
3. **Iterate** - Plan Phase 2 features
4. **Document** - Keep documentation updated
5. **Support** - Provide user training if needed

## Phase 2 Considerations

Features to consider for future phases:
- Mobile responsive design
- Role-based document visibility
- Multi-download (ZIP)
- Document preview
- Advanced filtering
- User profile editing
- Password reset
- Email notifications
- Analytics dashboard

## Notes

- Keep deployment checklist updated
- Document all known issues
- Create runbook for common operations
- Plan for maintenance windows
- Establish monitoring and alerting

---

## Congratulations! 🎉

You have successfully completed all 7 modules and deployed a production-ready Power Pages SPA!

**What you've built:**
- Complete authentication system
- Document management with search and filters
- Multi-language support (5 languages)
- User profile management
- Production-ready deployment

**Total Development Time:** 8-13 days

**Total Modules:** 7

Your application is now live and ready for users!

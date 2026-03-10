# Module 2: Authentication System (Entra External ID)

## Goal
Build custom React authentication UI that integrates with Microsoft Entra External ID for secure user authentication

## Estimated Time
2-3 days

## Dependencies
- Module 1 (Foundation) must be complete
- Entra External ID tenant must be configured (see Prerequisites)

## Overview

This module implements authentication using Microsoft Entra External ID (formerly Azure AD B2C), which is Microsoft's **recommended approach** for external user authentication in Power Pages SPAs.

**Why Entra External ID:**
- ✅ Officially supported by Microsoft
- ✅ OAuth 2.0 / OpenID Connect standard protocols
- ✅ Can build custom React UI
- ✅ Secure token-based authentication
- ✅ Supports self-service registration
- ✅ Better than deprecated local authentication

## Prerequisites

### Entra External ID Configuration Required

Before starting this module, the following must be configured in Azure:

1. **Entra External ID Tenant** created
2. **App Registration** for Power Pages site
3. **User Flow** configured (sign-up and sign-in)
4. **Reply URL** configured for your portal

**Reference:** https://readyxrm.blog/2025/02/26/power-pages-configure-entra-external-id/

**Note:** This is typically done by Azure/infrastructure team. You'll need these values:
- Authority URL
- Client ID
- Tenant ID
- User Flow Name

## Authentication Flow

```
User clicks "Login" in React app
    ↓
React redirects to Entra External ID login page
    ↓
User authenticates with Entra External ID
    ↓
Entra redirects back to Power Pages with authorization code
    ↓
Power Pages exchanges code for tokens and creates session
    ↓
User redirected back to React app (/documents)
    ↓
React app checks session via /_api/contacts
    ↓
User is authenticated and can access protected routes
```

## Authentication Approach

### Option A: Redirect to Power Pages Sign-In (Recommended for MVP)

**How it works:**
- Your React app redirects to Power Pages `/signin` page
- Power Pages shows Entra External ID login option
- After authentication, redirects back to your app
- Session cookie is automatically managed

**Pros:**
- Simplest to implement
- Fully managed by Power Pages
- Works immediately after Entra External ID configuration

**Cons:**
- Uses Power Pages default UI
- Not a pure SPA experience (full page redirect)

### Option B: Custom React Login UI with OAuth Flow (Advanced)

**How it works:**
- Build custom login button in React
- Use MSAL.js library to handle OAuth flow
- Redirect to Entra External ID for authentication
- Handle callback and session creation

**Pros:**
- Full control over UI
- True SPA experience
- Better user experience

**Cons:**
- More complex implementation
- Requires MSAL.js integration
- More to maintain

## Recommended Implementation (Option A - MVP)

For your MVP, we'll use **Option A** (redirect approach) which is simpler and fully supported.

## Tasks

### 2.1 Verify Entra External ID Configuration

**Checklist:**
- [ ] Entra External ID tenant created
- [ ] App registration exists in Power Pages
- [ ] User flow configured (email + password or one-time passcode)
- [ ] Reply URL configured: `https://site-alfw4.powerappsportals.com/signin-oidc`
- [ ] Identity provider configured in Power Pages portal

### 2.2 Create Auth Service (Redirect-based)

File: `src/services/authService.ts`

### 2.3 Create Auth Context

File: `src/contexts/AuthContext.tsx`

Provides global auth state:
- `currentUser: Contact | null`
- `isAuthenticated: boolean`
- `loading: boolean`
- `login()` - Redirects to Entra External ID
- `logout()`
- `checkSession()` - Verifies current session

### 2.4 Create Protected Route Component

File: `src/components/ProtectedRoute.tsx`

Checks if user is authenticated, redirects to `/login` if not.

### 2.5 Create Login Page

File: `src/pages/Login.tsx`

Simple page with "Sign In" button that redirects to Power Pages authentication.

### 2.6 Create Registration Page

File: `src/pages/Register.tsx`

Simple page with "Create Account" button that redirects to Power Pages registration.

## Claude Code Instructions

```markdown
MODULE 2: Authentication System (Entra External ID)

CONTEXT:
- Using Microsoft Entra External ID for authentication
- Power Pages manages the OAuth flow and session
- React app redirects to Power Pages for authentication
- Session managed via cookies (automatic)
- This is Microsoft's recommended approach for external users

IMPORTANT NOTES:
- Entra External ID configuration must be completed first (not part of this module)
- We're using the redirect approach (Option A) for simplicity
- Power Pages handles all OAuth complexity
- React app just needs to redirect and check session

REQUIREMENTS:

1. Create Auth Service (src/services/authService.ts)

```typescript
import { Contact } from '../types/contact';

export const authService = {
  /**
   * Redirect to Power Pages sign-in (which shows Entra External ID option)
   * Power Pages handles the OAuth flow with Entra External ID
   */
  login: () => {
    // Build return URL for after authentication
    const returnUrl = encodeURIComponent(window.location.origin + '/documents');
    
    // Redirect to Power Pages sign-in
    // Power Pages will show Entra External ID as login option
    window.location.href = `/signin?returnUrl=${returnUrl}`;
  },

  /**
   * Redirect to Power Pages registration
   */
  register: () => {
    const returnUrl = encodeURIComponent(window.location.origin + '/documents');
    window.location.href = `/register?returnUrl=${returnUrl}`;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    try {
      // Call Power Pages sign-out endpoint
      await fetch('/Account/Login/LogOff', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Always redirect to login after logout
    window.location.href = '/login';
  },

  /**
   * Check if user is authenticated by fetching current contact
   * Power Pages session cookie is automatically included
   */
  checkSession: async (): Promise<Contact | null> => {
    try {
      const response = await fetch('/_api/contacts', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      });

      if (response.status === 401) {
        // Not authenticated
        return null;
      }

      if (!response.ok) {
        throw new Error(`Session check failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Return first contact (current user)
      return data.value?.[0] || null;
    } catch (error) {
      console.error('Session check error:', error);
      return null;
    }
  },
};
```

2. Create AuthContext (src/contexts/AuthContext.tsx)

```typescript
import { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { Contact } from '../types/contact';

interface AuthContextType {
  currentUser: Contact | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  register: () => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    setLoading(true);
    try {
      const user = await authService.checkSession();
      setCurrentUser(user);
    } catch (error) {
      console.error('Auth check failed:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: currentUser !== null,
    loading,
    login: authService.login,
    register: authService.register,
    logout: authService.logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

3. Create ProtectedRoute (src/components/ProtectedRoute.tsx)

```typescript
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

4. Create Login Page (src/pages/Login.tsx)

```typescript
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to documents
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/documents');
    }
  }, [isAuthenticated, navigate]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          VMBSO Customer Portal
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sign in to access your documents
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<LoginIcon />}
          onClick={login}
          fullWidth
          sx={{ mb: 2 }}
        >
          Sign In with Microsoft
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Don't have an account?{' '}
          <Button onClick={() => navigate('/register')} color="primary">
            Register here
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
};
```

5. Create Register Page (src/pages/Register.tsx)

```typescript
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { PersonAdd as RegisterIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Create Account
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Register to access the VMBSO Customer Portal
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<RegisterIcon />}
          onClick={register}
          fullWidth
          sx={{ mb: 2 }}
        >
          Create Account with Microsoft
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Already have an account?{' '}
          <Button onClick={() => navigate('/login')} color="primary">
            Sign in here
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
};
```

6. Update App.tsx

Wrap routes in AuthProvider and use ProtectedRoute:

```typescript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { theme } from './theme/theme';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Documents } from './pages/Documents';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/documents" replace />} />
              <Route path="documents" element={<Documents />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

7. Update Layout Component

Add user menu with logout:

```typescript
import { AppBar, Toolbar, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Layout = () => {
  const { currentUser, logout } = useAuth();
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

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VMBSO Portal
          </Typography>

          <LanguageSwitcher />

          {currentUser && (
            <>
              <Typography variant="body2" sx={{ mx: 2 }}>
                {currentUser.firstname} {currentUser.lastname}
              </Typography>
              <IconButton
                size="large"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <main>
        <Outlet />
      </main>
    </>
  );
};
```

SUCCESS CRITERIA:
✅ User can click "Sign In with Microsoft"
✅ User redirected to Entra External ID login page
✅ After authentication, user redirected back to /documents
✅ Session persists on page refresh
✅ Protected routes redirect unauthenticated users
✅ Logout works and redirects to login
✅ User name displays in header when authenticated

IMPORTANT NOTES:
- Entra External ID configuration must be done by infrastructure team first
- The actual OAuth flow is handled by Power Pages + Entra External ID
- React app just redirects and checks session - simple!
- Session cookies are managed automatically by Power Pages
- No tokens to manage in React app

OUTPUT:
Complete authentication system using Entra External ID with redirect-based flow
```

## Deliverables

- ✅ Auth service with redirect-based login/register
- ✅ Auth context for global state
- ✅ Protected routes
- ✅ Login page with "Sign In with Microsoft" button
- ✅ Register page with "Create Account" button
- ✅ Session persistence via cookies
- ✅ Logout functionality

## Success Criteria

- ✅ User can click "Sign In with Microsoft" and be redirected to Entra External ID
- ✅ After authentication, user is redirected back to /documents
- ✅ Session persists on page refresh (via cookies)
- ✅ Protected routes redirect unauthenticated users to /login
- ✅ Logout works and redirects to /login
- ✅ User name displays in header when authenticated
- ✅ No console errors related to authentication

## Testing Checklist

### Prerequisites Testing
- [ ] Verify Entra External ID is configured in Power Pages
- [ ] Go to `https://site-alfw4.powerappsportals.com/signin` manually
- [ ] Verify you see "Microsoft Entra External ID" login option
- [ ] Test login works from Power Pages default UI first

### SPA Testing
- [ ] Click "Sign In with Microsoft" button
- [ ] Verify redirect to Entra External ID login page
- [ ] Complete authentication
- [ ] Verify redirect back to /documents
- [ ] Refresh page - should stay logged in
- [ ] Navigate to /profile
- [ ] Click logout
- [ ] Verify redirect to /login
- [ ] Try accessing /documents while logged out (should redirect to /login)

## Next Steps

Once Module 2 is complete, proceed to Module 3 (Dataverse Integration Layer).

## Troubleshooting

**Issue: "Sign In with Microsoft" redirects to /signin but doesn't show Entra External ID option**
- Verify Entra External ID is configured in Power Pages portal
- Check Power Pages → Security → Identity Providers
- Ensure Entra External ID provider is enabled

**Issue: After login, redirected to /signin instead of /documents**
- Check returnUrl parameter is being passed correctly
- Verify URL encoding of returnUrl
- Check browser console for errors

**Issue: Session not persisting after login**
- Verify cookies are enabled in browser
- Check if running on correct domain (not localhost mixed with portal domain)
- Verify session cookie is being set (check browser dev tools → Application → Cookies)

**Issue: /_api/contacts returns 401 even after login**
- Verify Entra External ID authentication completed successfully
- Check if contact record was created in Dataverse
- Verify Web API is enabled in Power Pages
- Check table permissions for contacts table

**Issue: Logout doesn't work**
- Try alternative logout endpoint: `/Account/Login/LogOff`
- Check browser network tab for 404 errors
- Verify Power Pages session is being cleared

## Important Notes

### Entra External ID Configuration (Done by Infrastructure Team)

This must be completed before starting development:

1. **Create Entra External ID Tenant**
2. **Configure User Flow** (sign-up and sign-in with email + password)
3. **Create App Registration** for Power Pages
4. **Configure Reply URL** in app registration
5. **Configure Identity Provider** in Power Pages portal

**Reference Documentation:**
- Microsoft Docs: https://learn.microsoft.com/en-us/power-pages/security/authentication/
- Community Guide: https://readyxrm.blog/2025/02/26/power-pages-configure-entra-external-id/

### Why This Approach is Better Than Local Auth

✅ **Officially Supported** - Microsoft's recommended approach  
✅ **Secure** - OAuth 2.0 / OpenID Connect standards  
✅ **Scalable** - Handles thousands of users  
✅ **Future-proof** - Not deprecated like local auth  
✅ **Better UX** - Users can use existing Microsoft accounts  
✅ **MFA Support** - Can enable multi-factor authentication  
✅ **Self-service** - Users can reset passwords, etc.  

### Future Enhancement: Custom OAuth Flow (Phase 2)

For Phase 2, you can enhance this by implementing custom OAuth flow with MSAL.js:
- Build fully custom login UI in React
- Handle OAuth flow directly in SPA
- No page redirects (true SPA experience)
- More complex but better UX

For MVP, the redirect approach is perfect - simple, reliable, and officially supported!

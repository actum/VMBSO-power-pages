import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import theme from './theme/theme';
import { CookieConsentDialog } from './components/CookieConsentDialog';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Documents } from './pages/Documents';
import { UpdateProfile } from './pages/UpdateProfile';
import { NotFound } from './pages/NotFound';
import LangHandler from './components/LangHandler';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {

  // Debug: Log when App mounts and current URL
  React.useEffect(() => {
    console.log('[APP DEBUG] App mounted');
    console.log('[APP DEBUG] Current URL:', window.location.href);
    console.log('[APP DEBUG] Search params:', window.location.search);
    console.log('[APP DEBUG] Hash:', window.location.hash);
    console.log('[APP DEBUG] Pathname:', window.location.pathname);

    // Check for any auth-related cookies
    console.log('[APP DEBUG] Document cookies:', document.cookie.split(';').map(c => c.trim().split('=')[0]).join(', '));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
        <Router future={{ v7_startTransition: true }}>
              <CookieConsentDialog />
              <AnalyticsTracker />
              <LangHandler />
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route
                  path="/documents"
                  element={
                    <ProtectedRoute>
                      <Documents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/update-profile"
                  element={
                    <ProtectedRoute>
                      <UpdateProfile />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect - protected to ensure auth and profile completion */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/documents" replace />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Not Found */}
                <Route path="*" element={<NotFound />} />
              </Routes>
        </Router>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

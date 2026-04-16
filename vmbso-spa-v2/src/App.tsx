import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import theme from './theme/theme';
import { AuthProvider } from './contexts/AuthContext';
// import { CookiesProvider } from './contexts/CookiesContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Documents } from './pages/Documents';
import { UpdateProfile } from './pages/UpdateProfile';
import { NotFound } from './pages/NotFound';
import { Home } from './pages/Home';
import { News } from './pages/News';
import LangHandler from './components/LangHandler';
import { Invoices } from './pages/Invoices';

/**
 * Catches Entra External ID cancel/error redirects (e.g. /signin-entraexternalid_2?error=...)
 * which vary per environment. Redirects silently to /login instead of showing a 404.
 * All other unknown paths show the normal NotFound page.
 */
const CatchAll: React.FC = () => {
  const location = useLocation();
  const isEntraCallback =
    location.pathname.startsWith('/signin-') ||
    new URLSearchParams(location.search).has('error');
  return isEntraCallback ? <Navigate to="/login" replace /> : <NotFound />;
};

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
      <Router>
        {/* <CookiesProvider> */}
          <AuthProvider>
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
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/update-profile"
                element={
                  <ProtectedRoute requireCompleteProfile={false}>
                    <UpdateProfile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/news"
                element={
                  <ProtectedRoute>
                    <News />
                  </ProtectedRoute>
                }
              />

              {/* Home (landing) — protected to ensure auth and profile completion */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              {/* 404 Not Found — also catches Entra cancel redirects */}
              <Route path="*" element={<CatchAll />} />
            </Routes>
          </AuthProvider>
        {/* </CookiesProvider> */}
      </Router>
    </ThemeProvider>
  );
}

export default App;

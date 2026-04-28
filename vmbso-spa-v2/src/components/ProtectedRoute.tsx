import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { config } from "../config/powerPages.config";
import { canAccessInvoices, canAccessVouchers } from "../utils/accessControl";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Whether the route requires a complete user profile.
   * - true (default): Redirects to /update-profile if profile is incomplete
   * - false: Allows access even with incomplete profile (e.g., /update-profile page itself)
   */
  requireCompleteProfile?: boolean;
}

/**
 * Central authentication and profile completion guard.
 * Handles all redirect logic in one place:
 * 1. Not authenticated → /login
 * 2. Authenticated but incomplete profile (if required) → /update-profile
 * 3. Otherwise → allow access
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireCompleteProfile = true 
}) => {
  const { currentUser, isAuthenticated, loading, isProfileComplete, isRejected } = useAuth();
  const location = useLocation();

  // In local dev mode, bypass all auth and profile checks
  if (config.devMode) {
    return <>{children}</>;
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Rule 1: Must be authenticated (and not rejected)
  if (!isAuthenticated || isRejected) {
    return <Navigate to="/login" replace />;
  }

  // Rule 2: If profile completion is required and profile is incomplete, redirect to complete it
  if (requireCompleteProfile && !isProfileComplete) {
    return <Navigate to="/update-profile" replace />;
  }

  // Rule 3: /invoices is only available to approved users whose Account has both:
  // - User approval status = Approved (182980001)
  // - Role with actum_uploadinvoicesallowed = true
  // - Country with actum_uploadinvoicesallowed = true
  if (location.pathname.startsWith("/invoices")) {
    if (!canAccessInvoices(currentUser)) {
      return <Navigate to="/documents" replace />;
    }
  }

  // Rule 4: /vouchers is available to approved installers and distributors
  // - Installers: must have invoice upload permissions
  // - Distributors: role name = "Distributor"
  if (location.pathname.startsWith("/vouchers")) {
    if (!canAccessVouchers(currentUser)) {
      return <Navigate to="/documents" replace />;
    }
  }

  // All checks passed - render the protected content
  return <>{children}</>;
};

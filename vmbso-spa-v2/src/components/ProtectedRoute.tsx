import React from "react";
import { Navigate } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

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
  const { isAuthenticated, loading, isProfileComplete } = useAuth();

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

  // Rule 1: Must be authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Rule 2: If profile completion is required and profile is incomplete, redirect to complete it
  if (requireCompleteProfile && !isProfileComplete) {
    return <Navigate to="/update-profile" replace />;
  }

  // All checks passed - render the protected content
  return <>{children}</>;
};

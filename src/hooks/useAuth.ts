import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Contact } from "../types/contact";
import { authService } from "../services/authService";
import { queryKeys } from "../queries/queryKeys";

// Required personal profile fields — the contact must be linked to an Account
// (_parentcustomerid_value) for the company portion to be considered complete.
// NOTE: Use the actual Dataverse column name (_actum_languageid_value) — NOT
// the convenience field (actum_language) which only exists locally in the form.
const requiredPersonalFields: Array<keyof Contact> = [
  "_actum_languageid_value",
  "telephone1",
];

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: currentUser = null, isLoading: loading } = useQuery({
    queryKey: queryKeys.session,
    queryFn: () => authService.checkSession(),
    staleTime: Infinity,
    retry: false,
  });

  const isAuthenticated = currentUser !== null;

  const isProfileComplete = useMemo(() => {
    if (!currentUser) return false;
    // Personal fields must be filled
    const personalComplete = requiredPersonalFields.every((key) => {
      const value = currentUser[key];
      return value && value.toString().trim().length > 0;
    });
    // Company is complete when the contact is linked to an Account
    const companyComplete = !!currentUser._parentcustomerid_value;
    const complete = personalComplete && companyComplete;
    if (import.meta.env.DEV) {
      console.log(
        "[AUTH HOOK DEBUG] Profile complete check:",
        complete,
        "| personal:",
        personalComplete,
        "| company (account linked):",
        companyComplete
      );
    }
    return complete;
  }, [currentUser]);

  // Logout: clears TQ cache then redirects — page navigates away so no async needed
  const logout = useCallback(() => {
    queryClient.clear();
    authService.logout();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.session });
  }, [queryClient]);

  return {
    currentUser,
    isAuthenticated,
    isProfileComplete,
    loading,
    logout,
    refreshUser,
  };
}

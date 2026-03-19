/**
 * Hook for fetching homepage content (hero + banner) from Dataverse.
 *
 * In dev mode (VITE_DEV_MODE=true) the dataverseService returns mock data
 * so the page renders locally without a Power Pages connection.
 *
 * In production the service will call the real Dataverse table once the
 * table name and field names are confirmed with the backend team (see the
 * TODO comments in dataverseService.homePage.get).
 */

import { useQuery } from '@tanstack/react-query';
import { dataverseService } from '../services/dataverseService';
import { queryKeys } from '../queries/queryKeys';
import type { HomePageData } from '../types/homePage';

export const useHomePage = () => {
  const {
    data: homePageData,
    isLoading: loading,
    error,
  } = useQuery<HomePageData>({
    queryKey: queryKeys.homePage,
    queryFn: () => dataverseService.homePage.get(),
    staleTime: 5 * 60 * 1000, // 5 min — content changes rarely
    retry: 1,
  });

  return {
    homePageData: homePageData ?? null,
    loading,
    error: error?.message ?? null,
  };
};

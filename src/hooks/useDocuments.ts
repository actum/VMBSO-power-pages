/**
 * Custom hook for fetching documents via Power Automate flow
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import { config } from "../config/powerPages.config";
import type { ProductDocument } from "../types/document";
import { useAuth } from "./useAuth";
import { queryKeys } from "../queries/queryKeys";

export const useDocuments = () => {
  const { currentUser } = useAuth();
  const contactId = currentUser?.contactid;

  const {
    data: documents = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.documents(contactId ?? ""),
    queryFn: async (): Promise<ProductDocument[]> => {
      const response = await apiClient.flow<{
        status: string;
        data: ProductDocument[] | string; // Can be array or JSON string
        message: string;
      }>(config.flows.fetchDocuments, {
        contactId: contactId!,
      });

      if (response?.status === "200") {
        // Parse data if it's a JSON string
        let parsed: ProductDocument[];
        if (typeof response.data === "string") {
          try {
            parsed = JSON.parse(response.data);
          } catch (parseError) {
            console.error("Failed to parse documents data:", parseError);
            throw new Error("Failed to parse documents data");
          }
        } else {
          parsed = response.data;
        }

        if (Array.isArray(parsed)) {
          return parsed;
        }
        throw new Error("Unexpected documents data format");
      } else if (response?.status === "500") {
        throw new Error(response.message || "Failed to fetch documents");
      }
      throw new Error("Unexpected response from server");
    },
    enabled: !!contactId,
  });

  return {
    documents,
    loading,
    error: error?.message ?? null,
    refetch,
  };
};

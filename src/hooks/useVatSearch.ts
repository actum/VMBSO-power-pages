import { useMutation } from "@tanstack/react-query";
import { dataverseService } from "../services/dataverseService";

export const useVatSearch = () =>
  useMutation({
    mutationFn: (vat: string) => dataverseService.accounts.searchByVAT(vat),
  });

import { useQuery } from "@tanstack/react-query";
import { dataverseService } from "../services/dataverseService";
import { queryKeys } from "../queries/queryKeys";

export const useBrands = () =>
  useQuery({
    queryKey: queryKeys.brands,
    queryFn: () => dataverseService.brands.getAll(),
  });

export const useCountries = () =>
  useQuery({
    queryKey: queryKeys.countries,
    queryFn: () => dataverseService.countries.getAll(),
  });

export const useRoles = () =>
  useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => dataverseService.roles.getAll(),
  });

export const useLanguagesByCountry = (countryId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.languages(countryId!),
    queryFn: () => dataverseService.languages.getByCountry(countryId!),
    enabled: !!countryId,
  });

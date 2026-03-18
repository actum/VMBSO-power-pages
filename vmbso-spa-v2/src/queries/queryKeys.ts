export const queryKeys = {
  session: ["session"] as const,
  documents: (contactId: string) => ["documents", contactId] as const,
  brands: ["brands"] as const,
  countries: ["countries"] as const,
  roles: ["roles"] as const,
  languages: (countryId: string) => ["languages", countryId] as const,
};

export interface ClientDocument {
  actum_clientdocumentid: string;
  actum_name: string;
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
  // Expanded lookups
  actum_account?: {
    accountid: string;
    name: string;
  };
  actum_referencedocument?: any; // Type unknown until we see response
  _actum_account_value?: string; // Lookup ID
  _actum_referencedocument_value?: string; // Lookup ID
}

export interface DocumentFilters {
  accountId?: string;
  status?: number;
  searchText?: string;
}

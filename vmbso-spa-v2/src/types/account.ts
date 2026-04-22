export interface Account {
  accountid: string;
  name: string;
  actum_vatregistrationnumber?: string;
  telephone1?: string;
  address1_line1?: string;
  
  // Lookup field IDs
  _actum_primarycountryid_value?: string;
  _actum_roleid_value?: string;
  primarycontactid?: string;
  
  // Expanded lookups (populated separately due to Power Pages nested expand limitation)
  actum_Role?: {
    actum_roleid: string;
    actum_name: string;
    actum_uploadinvoicesallowed?: boolean;
  };
  actum_Country?: {
    actum_countryid: string;
    actum_name: string;
    actum_uploadinvoicesallowed?: boolean;
  };
}

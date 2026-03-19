export interface Contact {
  contactid: string;
  firstname?: string;
  lastname?: string;
  emailaddress1: string;
  fullname?: string;
  createdon?: string;
  modifiedon?: string;
  
  // Standard contact fields
  mobilephone?: string;
  telephone1?: string;  // Phone field from screenshot
  jobtitle?: string;
  
  // Custom fields (actual fields from Contact table screenshot)
  actum_approvalstatus?: number;  // Approval (Choice) - Required
  
  // Lookups - store the ID values
  _actum_languageid_value?: string;  // Language (Lookup) - Required
  _parentcustomerid_value?: string;  // Company Name (Customer/Account lookup) - Required
  
  // Expanded lookups - populated when using $expand
  actum_languageid?: {
    actum_languageid: string;
    actum_name: string;
  };
  
  parentcustomerid?: {
    accountid: string;
    name: string;
  };
  
  // Portal/Multi-language fields
  mspp_userpreferredlcid?: number;  // Preferred Language (Choice)
  adx_identity_username?: string;
  adx_identity_emailaddress1confirmed?: boolean;
  
  // TODO: Fields used in UpdateProfile.tsx but NOT YET in Dataverse
  // These need to be added to Contact table before profile form will work
  actum_language?: string;
  actum_companyname?: string;
  actum_vat?: string;
  actum_primarycountry?: string;
  actum_companyphone?: string;
  address1_line1?: string;
  actum_role?: string;
  actum_brand?: string[];
  actum_companyemail?: string;
  address1_city?: string;
  address1_postalcode?: string;
}

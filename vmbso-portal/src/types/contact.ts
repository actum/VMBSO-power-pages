export interface Contact {
  contactid: string;
  firstname: string;
  lastname: string;
  emailaddress1: string;
  fullname?: string;
  createdon?: string;
  modifiedon?: string;
  // Placeholder for custom fields - will be updated when names confirmed
  // TODO: Add actum_role, actum_country, actum_language
}

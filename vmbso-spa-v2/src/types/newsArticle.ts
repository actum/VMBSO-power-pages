/**
 * News / content article from actum_newspagecontents table.
 * brands is aggregated after fetch (M2M relationship resolved separately).
 */
export interface NewsArticle {
  actum_newspagecontentid: string;
  actum_name: string;
  actum_title: string;
  actum_summary?: string;
  actum_body?: string;
  actum_publishdate?: string;
  createdon: string;
  statecode: number;
  _actum_languageid_value?: string;
  _actum_countryid_value?: string;
  _actum_roleid_value?: string;
  // Optional call-to-action shown in the modal footer area
  actum_ctahint?: string;
  actum_ctalabel?: string;
  actum_ctaurl?: string;
  brands: { id: string; name: string }[];
}

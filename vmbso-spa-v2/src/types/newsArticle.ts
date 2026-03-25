/**
 * News / content article from actum_newspagecontents table.
 * brands resolved via M2M intersect (actum_newspagecontent_actum_brandset).
 * ctas resolved via M2M intersect (actum_calltoactionbutton_actum_newspageset).
 */
export interface NewsArticleCta {
  id: string;
  text: string;
  url: string;
  /** 182980000 = _self, 182980001 = _blank */
  target: number;
}

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
  brands: { id: string; name: string }[];
  ctas: NewsArticleCta[];
}

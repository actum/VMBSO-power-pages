/**
 * Terms & Conditions (VMPP-323).
 * Dataverse tables: actum_termsversion (one row per version), actum_termstext (one row per language
 * of a version), actum_termsacceptance (one row per contact x version, created by the portal).
 */

export const TermsScope = { General: 182980000, InvoiceUpload: 182980001, Distributor: 182980002 } as const;
export type TermsScopeValue = (typeof TermsScope)[keyof typeof TermsScope];

export const TermsStatus = { Draft: 182980000, Published: 182980001, Retired: 182980002 } as const;
export type TermsStatusValue = (typeof TermsStatus)[keyof typeof TermsStatus];

export interface TermsVersion {
  actum_termsversionid: string;
  actum_name: string;
  actum_scope: TermsScopeValue;
  /** Empty = the default set, used for countries without their own terms. */
  _actum_countryid_value?: string | null;
  actum_version: number;
  actum_status?: TermsStatusValue;
  createdon: string;
}

export interface TermsText {
  actum_termstextid: string;
  /** Title of the document in this language (shown to users; falls back to the version name). */
  actum_name?: string;
  _actum_termsversionid_value: string;
  _actum_languageid_value: string;
  actum_body: string;
  createdon: string;
}

export interface TermsAcceptance {
  actum_termsacceptanceid: string;
  _actum_termsversionid_value: string;
  /** Language of the text the contact read; the text = the one for this version + language. */
  _actum_languageid_value: string;
  /** SHA-256 (hex) of the body the contact read, computed in the browser. */
  actum_texthash?: string;
  /** Accepted on. */
  createdon: string;
  /** Expanded from the version lookup; used to label missing terms NEW vs UPDATED. */
  version?: Pick<TermsVersion, 'actum_scope' | '_actum_countryid_value'>;
}

/** What decides which terms apply to a user: their country and the features their role/country enable. */
export interface FeatureContext {
  countryId?: string;
  role?: { actum_name?: string; actum_uploadinvoicesallowed?: boolean };
  country?: { actum_uploadinvoicesallowed?: boolean };
}

export type MissingKind = 'new' | 'updated';

export interface RequiredTerm {
  version: TermsVersion;
  accepted: boolean;
  acceptedOn?: string;
  /** Only set when not accepted. */
  kind?: MissingKind;
}

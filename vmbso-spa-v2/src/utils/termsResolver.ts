import {
  TermsScope,
  type FeatureContext,
  type RequiredTerm,
  type TermsAcceptance,
  type TermsScopeValue,
  type TermsText,
  type TermsVersion,
} from '../types/terms';
import { hasInvoiceUploadFeature, isDistributorRole } from './accessControl';

/** Does the user need the terms of this scope? General always; feature scopes follow the feature rules. */
export const qualifiesForScope = (scope: TermsScopeValue, ctx: FeatureContext): boolean => {
  switch (scope) {
    case TermsScope.General:
      return true;
    case TermsScope.InvoiceUpload:
      return hasInvoiceUploadFeature(ctx.role, ctx.country);
    case TermsScope.Distributor:
      return isDistributorRole(ctx.role);
    default:
      return false;
  }
};

const newestFirst = (a: TermsVersion, b: TermsVersion): number =>
  b.actum_version - a.actum_version || Date.parse(b.createdon) - Date.parse(a.createdon);

/**
 * The versions the user must have accepted.
 * `candidates` must already be filtered to Published (and active) versions with the user's
 * country or an empty country. Per scope: the user's country wins over the default set
 * (empty country); within that, the highest version number, then the newest createdon.
 */
export const resolveRequiredVersions = (candidates: TermsVersion[], ctx: FeatureContext): TermsVersion[] => {
  const required: TermsVersion[] = [];
  for (const scope of Object.values(TermsScope)) {
    if (!qualifiesForScope(scope, ctx)) continue;
    const inScope = candidates.filter((v) => v.actum_scope === scope);
    const own = ctx.countryId ? inScope.filter((v) => v._actum_countryid_value === ctx.countryId) : [];
    const pool = own.length ? own : inScope.filter((v) => !v._actum_countryid_value);
    if (!pool.length) {
      console.warn(`[terms] No published terms for scope ${scope} (country ${ctx.countryId ?? 'none'}, no default set either)`);
      continue;
    }
    required.push([...pool].sort(newestFirst)[0]);
  }
  return required;
};

/** Marks each required version as accepted or not; missing ones are labelled NEW or UPDATED. */
export const computeRequiredTerms = (required: TermsVersion[], acceptances: TermsAcceptance[]): RequiredTerm[] =>
  required.map((version) => {
    const own = acceptances
      .filter((a) => a._actum_termsversionid_value === version.actum_termsversionid)
      .sort((a, b) => Date.parse(b.createdon) - Date.parse(a.createdon));
    if (own.length) return { version, accepted: true, acceptedOn: own[0].createdon };
    const country = version._actum_countryid_value ?? null;
    const acceptedEarlier = acceptances.some(
      (a) => a.version?.actum_scope === version.actum_scope && (a.version?._actum_countryid_value ?? null) === country,
    );
    return { version, accepted: false, kind: acceptedEarlier ? 'updated' : 'new' };
  });

/**
 * The text to show for a version: UI language, else the only text, else English, else the oldest.
 * `isUiLanguage` false means the UI should say the terms are only available in another language.
 */
export const pickText = (
  texts: TermsText[],
  uiLanguageId: string | undefined,
  englishLanguageId: string | undefined,
): { text: TermsText; isUiLanguage: boolean } | undefined => {
  if (!texts.length) return undefined;
  const ui = uiLanguageId ? texts.find((t) => t._actum_languageid_value === uiLanguageId) : undefined;
  if (ui) return { text: ui, isUiLanguage: true };
  if (texts.length === 1) return { text: texts[0], isUiLanguage: false };
  const en = englishLanguageId ? texts.find((t) => t._actum_languageid_value === englishLanguageId) : undefined;
  if (en) return { text: en, isUiLanguage: false };
  const oldest = [...texts].sort((a, b) => Date.parse(a.createdon) - Date.parse(b.createdon))[0];
  return { text: oldest, isUiLanguage: false };
};

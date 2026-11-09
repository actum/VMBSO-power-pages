import { config } from '../../config/powerPages.config';
import { dataverseService } from '../../services/dataverseService';
import { markDevTermsAccepted } from '../../services/termsStatus';
import type { RequiredTerm, TermsText } from '../../types/terms';
import { sha256Hex } from '../../utils/textHash';

/**
 * Records acceptance of `terms` for the contact, one at a time, stopping at the first failure.
 * Versions in `alreadyAccepted` are skipped, so a retry after a partial failure (e.g. the profile
 * flow failed after acceptances were saved) never creates duplicates.
 * `shownTextByVersion` is the text the user was shown for each version (the dialog's text, or the
 * pickText result if the dialog was never opened); its language and SHA-256 are recorded.
 */
export const acceptTerms = async (
  terms: RequiredTerm[],
  contactId: string,
  shownTextByVersion: Record<string, TermsText>,
  alreadyAccepted: Set<string>,
): Promise<void> => {
  const todo = terms.filter((t) => !alreadyAccepted.has(t.version.actum_termsversionid));
  const missingText = todo.find((t) => !shownTextByVersion[t.version.actum_termsversionid]);
  if (missingText) {
    throw new Error(`No text available for "${missingText.version.actum_name}"`);
  }
  if (config.devMode) {
    markDevTermsAccepted();
    return;
  }
  for (const term of todo) {
    const text = shownTextByVersion[term.version.actum_termsversionid];
    await dataverseService.terms.createAcceptance({
      contactId,
      versionId: term.version.actum_termsversionid,
      languageId: text._actum_languageid_value,
      textHash: await sha256Hex(text.actum_body),
      name: term.version.actum_name,
    });
  }
};

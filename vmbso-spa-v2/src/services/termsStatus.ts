import type { Contact } from '../types/contact';
import { TermsScope, type FeatureContext, type RequiredTerm } from '../types/terms';
import { computeRequiredTerms, resolveRequiredVersions } from '../utils/termsResolver';
import { dataverseService } from './dataverseService';

/** Country + feature flags of the user's account (the Account's Role and Country). */
export const featureContextFromUser = (user: Contact): FeatureContext => {
  const account = user.parentcustomerid;
  return {
    countryId: account?.actum_Country?.actum_countryid,
    role: account?.actum_Role,
    country: account?.actum_Country,
  };
};

const DEV_ACCEPTED_KEY = 'dev-terms-accepted';

/**
 * Local dev (`npm run dev`): one General document, so the gate and pages render. Accepting it
 * is remembered for the browser session (sessionStorage), so the gate doesn't loop.
 */
export const devMockRequiredTerms = (): RequiredTerm[] => {
  let accepted = false;
  try {
    accepted = sessionStorage.getItem(DEV_ACCEPTED_KEY) === '1';
  } catch {
    // storage unavailable: treat as not accepted
  }
  const version = {
    actum_termsversionid: 'dev-terms-general',
    actum_name: 'General Terms & Conditions (dev mock)',
    actum_scope: TermsScope.General,
    _actum_countryid_value: null,
    actum_version: 1,
    createdon: '2026-01-01T00:00:00Z',
  };
  return [accepted ? { version, accepted: true, acceptedOn: new Date().toISOString() } : { version, accepted: false, kind: 'new' }];
};

export const markDevTermsAccepted = (): void => {
  try {
    sessionStorage.setItem(DEV_ACCEPTED_KEY, '1');
  } catch {
    // ignore
  }
};

/** All terms that apply to the user, each marked accepted or not (NEW / UPDATED when not). */
export const loadRequiredTerms = async (user: Contact): Promise<RequiredTerm[]> => {
  const ctx = featureContextFromUser(user);
  const [candidates, acceptances] = await Promise.all([
    dataverseService.terms.getPublishedCandidates(ctx.countryId),
    dataverseService.terms.getMyAcceptances(),
  ]);
  return computeRequiredTerms(resolveRequiredVersions(candidates, ctx), acceptances);
};

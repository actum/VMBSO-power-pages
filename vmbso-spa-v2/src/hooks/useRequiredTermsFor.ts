import { useEffect, useState } from 'react';
import { config } from '../config/powerPages.config';
import { dataverseService } from '../services/dataverseService';
import { devMockRequiredTerms } from '../services/termsStatus';
import type { FeatureContext, RequiredTerm } from '../types/terms';
import { resolveRequiredVersions } from '../utils/termsResolver';

/**
 * The T&C versions a user with this role + country must accept, for the first-time Update Profile
 * step (the user has no account yet, so AuthContext can't compute it). `null` = not known yet.
 * Every returned term is unaccepted and labelled NEW.
 */
export const useRequiredTermsFor = (ctx: FeatureContext | null): { terms: RequiredTerm[]; loading: boolean } => {
  const [terms, setTerms] = useState<RequiredTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const key = ctx
    ? JSON.stringify([ctx.countryId, ctx.role?.actum_name, ctx.role?.actum_uploadinvoicesallowed, ctx.country?.actum_uploadinvoicesallowed])
    : null;

  useEffect(() => {
    if (!ctx) {
      setTerms([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const required = config.devMode
          ? devMockRequiredTerms().map((t) => t.version)
          : resolveRequiredVersions(await dataverseService.terms.getPublishedCandidates(ctx.countryId), ctx);
        if (!cancelled) setTerms(required.map((version) => ({ version, accepted: false, kind: 'new' })));
      } catch (e) {
        // The gate after profile completion still catches anything missed here.
        console.error('[TERMS] Could not load terms for the profile step:', e);
        if (!cancelled) setTerms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // ctx content is captured by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { terms, loading };
};

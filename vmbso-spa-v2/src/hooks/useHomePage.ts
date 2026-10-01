/**
 * Custom hook for landing page content (Dataverse actum_landingpagecontent)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { dataverseService } from '../services/dataverseService';
import { useAuth } from '../contexts/AuthContext';
import { getLanguageIdFromCode } from '../utils/userLanguageService';
import type { HomePageData, LandingPageContent, LandingPageCta, CtaButton } from '../types/homePage';

function interpolateGreeting(template: string | undefined, displayName: string): string {
  const t = template?.trim() || '';
  if (!t) return displayName ? `Hello, ${displayName}!` : '';
  return t.replace(/\{\{name\}\}/g, displayName).replace(/\{name\}/g, displayName);
}

function ctaToButton(cta: LandingPageCta): CtaButton {
  return {
    text: cta.text,
    url: cta.url,
    target: cta.target === 182980001 ? '_blank' : '_self',
  };
}

function mapToHomePageData(
  row: LandingPageContent,
  firstName: string | undefined,
  fullName: string | undefined,
  ctas: LandingPageCta[],
  fallbackCtaLabel: string,
): HomePageData {
  const nameForGreeting = (firstName || fullName || '').trim() || 'there';
  const greetingsText = interpolateGreeting(row.actum_greetingstext, nameForGreeting);

  // const ctaButtons: CtaButton[] = ctas.length
  //   ? ctas.map(ctaToButton)
  //   : [{ text: fallbackCtaLabel, url: '/documents', target: '_self' }];
  const ctaButtons: CtaButton[] = ctas.map(ctaToButton);

  return {
    heroSection: {
      greetingsText,
      title: row.actum_title?.trim() || '',
      introText: row.actum_introductiontext || '',
      ctas: ctaButtons,
      heroImage: {
        url: row.actum_heroimageurl?.trim() || '',
        alt: '',
      },
    },
    bannerSection: {
      image: {
        url: row.actum_bannerimageurl?.trim() || '',
        alt: '',
      },
      bannerTitle: row.actum_bannertitle?.trim() || '',
      bannerImageText: row.actum_bannerimagetext?.trim() || '',
    },
  };
}

export const useHomePage = () => {
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation('homePage');
  const [homePageData, setHomePageData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Incremented on every fetch; only the latest fetch may update state. Prevents a
  // slower, stale response (e.g. for the initial detector language, before the user's
  // saved language is applied) from overwriting the correct content with an error.
  const latestRequestId = useRef(0);

  const fetchHomePage = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    const isStale = () => requestId !== latestRequestId.current;

    if (!currentUser?.contactid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const languageIdFromUi = await getLanguageIdFromCode(i18n.language);
      const languageId = languageIdFromUi ?? currentUser._actum_languageid_value?.replace(/[{}]/g, '');

      // Fetch account for country + role + brands
      let countryId: string | undefined;
      let roleId: string | undefined;

      let brandIds: string[] = [];

      if (currentUser._parentcustomerid_value) {
        const [account, accountBrands] = await Promise.all([
          dataverseService.accounts.getById(currentUser._parentcustomerid_value),
          dataverseService.accounts.getBrands(currentUser._parentcustomerid_value),
        ]);
        countryId = account?._actum_primarycountryid_value?.replace(/[{}]/g, '');
        roleId = account?._actum_roleid_value?.replace(/[{}]/g, '');
        brandIds = accountBrands.map(b => b.actum_brandid);
      }

      const row = await dataverseService.landingPageContent.getForUser(
        languageId,
        countryId,
        roleId,
        brandIds,
      );

      if (isStale()) return;

      if (!row) {
        setError(t('errors.noContent'));
        setHomePageData(null);
        return;
      }

      // Fetch CTAs in parallel once we have the page ID
      const ctas = await dataverseService.landingPageContent.getCtasForPage(
        row.actum_landingpagecontentid,
      );

      if (isStale()) return;

      const firstName = currentUser.firstname;
      const fullName = currentUser.fullname?.trim() || `${currentUser.firstname ?? ''} ${currentUser.lastname ?? ''}`.trim();

      setHomePageData(
        mapToHomePageData(row, firstName, fullName, ctas, t('actions.goToDocuments'))
      );
    } catch (err) {
      if (isStale()) return;
      const message = err instanceof Error ? err.message : t('errors.loadFailed');
      setError(message);
      setHomePageData(null);
      console.error('Error fetching home page content:', err);
    } finally {
      // A newer fetch owns the loading state
      if (!isStale()) setLoading(false);
    }
  }, [
    currentUser?.contactid,
    currentUser?._parentcustomerid_value,
    currentUser?._actum_languageid_value,
    currentUser?.firstname,
    currentUser?.lastname,
    currentUser?.fullname,
    i18n.language,
    t,
  ]);

  useEffect(() => {
    fetchHomePage();
  }, [fetchHomePage]);

  return { homePageData, loading, error, refetch: fetchHomePage };
};

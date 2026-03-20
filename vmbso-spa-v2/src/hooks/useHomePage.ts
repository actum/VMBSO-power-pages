/**
 * Custom hook for landing page content (Dataverse actum_landingpagecontent)
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataverseService } from '../services/dataverseService';
import { useAuth } from '../contexts/AuthContext';
import type { HomePageData, LandingPageContent } from '../types/homePage';

function stripHtmlRichText(raw: string | undefined): string {
  if (!raw) return '';
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function interpolateGreeting(template: string | undefined, displayName: string): string {
  const t = template?.trim() || '';
  if (!t) return displayName ? `Hello, ${displayName}!` : '';
  return t.replace(/\{\{name\}\}/g, displayName).replace(/\{name\}/g, displayName);
}

function mapToHomePageData(
  row: LandingPageContent,
  firstName: string | undefined,
  fullName: string | undefined,
  ctaLabel: string
): HomePageData {
  const nameForGreeting = (firstName || fullName || '').trim() || 'there';
  const greetingsText = interpolateGreeting(row.actum_greetingstext, nameForGreeting);

  const documentsCta = { text: ctaLabel, url: '/documents', target: '_self' };

  return {
    heroSection: {
      greetingsText,
      title: row.actum_title?.trim() || '',
      introText: stripHtmlRichText(row.actum_introductiontext),
      ctas: [documentsCta],
      heroImage: {
        url: row.actum_heroimageurl?.trim() || '',
        alt: row.actum_imagealt?.trim() || '',
      },
    },
    bannerSection: {
      image: {
        url: row.actum_bannerimageurl?.trim() || '',
        alt: row.actum_bannerimagetext?.trim() || '',
      },
      title: row.actum_bannertitle?.trim() || '',
      ctas: [documentsCta],
    },
  };
}

export const useHomePage = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation('homePage');
  const [homePageData, setHomePageData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomePage = useCallback(async () => {
    if (!currentUser?.contactid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const row = await dataverseService.landingPageContent.getByLanguage(
        currentUser._actum_languageid_value
      );

      if (!row) {
        setError(t('errors.noContent'));
        setHomePageData(null);
        return;
      }

      const firstName = currentUser.firstname;
      const fullName = currentUser.fullname?.trim() || `${currentUser.firstname ?? ''} ${currentUser.lastname ?? ''}`.trim();

      setHomePageData(
        mapToHomePageData(row, firstName, fullName, t('actions.goToDocuments'))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.loadFailed');
      setError(message);
      setHomePageData(null);
      console.error('Error fetching home page content:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.contactid, currentUser?._actum_languageid_value, currentUser?.firstname, currentUser?.lastname, currentUser?.fullname, t]);

  useEffect(() => {
    fetchHomePage();
  }, [fetchHomePage]);

  return { homePageData, loading, error, refetch: fetchHomePage };
};

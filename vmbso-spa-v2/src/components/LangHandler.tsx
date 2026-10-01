import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { config } from "../config/powerPages.config";
import { getUserLanguageCode, saveUserLanguage } from "../utils/userLanguageService";
import { getSupportedLanguages, getDefaultLanguage, isSupportedLanguage } from "../utils/languageMapper";

/**
 * LangHandler - Manages application language based on user preference and URL params
 * 
 * Priority:
 * 1. URL param (?lang=xx-XX) - manual override
 * 2. User's saved language preference (from profile)
 * 3. Browser language detection (via i18next-browser-languagedetector)
 * 4. Default language (en-GB)
 */
const LangHandler = () => {
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [userLanguageLoaded, setUserLanguageLoaded] = useState(false);
  const languageBackfilled = useRef(false);

  // Handle URL parameter language override
  useEffect(() => {
    const langParam = searchParams.get("lang");
    const supportedLanguages = getSupportedLanguages();

    if (langParam && supportedLanguages.includes(langParam)) {
      // URL param takes priority - switch to it if different
      if (i18n.language !== langParam) {
        console.log(`[LangHandler] Switching to URL param language: ${langParam}`);
        i18n.changeLanguage(langParam);
      }
    }
  }, [searchParams, i18n]);

  // Handle user's saved language preference
  useEffect(() => {
    const loadUserLanguage = async () => {
      // Wait until auth bootstrap is done; otherwise we may lock to browser EN
      // before currentUser (and preferred language) is available.
      if (loading) {
        return;
      }

      // Only load once and only if no URL param is set
      if (userLanguageLoaded || searchParams.get("lang")) {
        return;
      }

      if (currentUser?._actum_languageid_value) {
        try {
          const userLanguage = await getUserLanguageCode(currentUser._actum_languageid_value);
          
          // Only change if different from current language
          if (i18n.language !== userLanguage) {
            console.log(`[LangHandler] Setting user's preferred language: ${userLanguage}`);
            i18n.changeLanguage(userLanguage);
            
            // Update URL to reflect the language
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("lang", userLanguage);
            navigate(`${window.location.pathname}?${newSearchParams.toString()}`, { replace: true });
          }
        } catch (error) {
          console.error('[LangHandler] Failed to load user language:', error);
        }
      } else if (!searchParams.get("lang")) {
        // No user preference and no URL param - use default or browser language
        const browserLang = i18n.language || getDefaultLanguage();
        console.log(`[LangHandler] Using browser/default language: ${browserLang}`);
        
        // Update URL to reflect the language
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("lang", browserLang);
        navigate(`${window.location.pathname}?${newSearchParams.toString()}`, { replace: true });
      }

      setUserLanguageLoaded(true);
    };

    loadUserLanguage();
  }, [currentUser, loading, userLanguageLoaded, searchParams, i18n, navigate]);

  // Backfill: if the signed-in user has no saved language (never used the
  // LanguagePicker), persist the language they are currently viewing the site in.
  useEffect(() => {
    if (config.devMode || loading || languageBackfilled.current) {
      return;
    }
    if (!currentUser?.contactid || currentUser._actum_languageid_value) {
      return;
    }

    languageBackfilled.current = true;

    const langParam = searchParams.get("lang");
    const currentLanguage =
      langParam && isSupportedLanguage(langParam) ? langParam
      : isSupportedLanguage(i18n.language) ? i18n.language
      : getDefaultLanguage();

    // No refreshUser() here: it would reset in-progress forms (e.g. UpdateProfile)
    // that re-initialise from currentUser. The ref guard prevents a second save.
    saveUserLanguage(currentUser.contactid, currentLanguage)
      .then(saved => {
        if (saved) {
          console.log(`[LangHandler] Saved missing user language: ${currentLanguage}`);
        }
      })
      .catch(error => {
        console.error('[LangHandler] Failed to save missing user language:', error);
      });
  }, [currentUser, loading, searchParams, i18n]);

  return null;
};

export default LangHandler;

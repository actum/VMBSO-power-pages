import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

const SUPPORTED_LANGS = ["en-GB", "fr-FR", "be-NL"];

const LANG_DISPLAY_NAMES: Record<string, string> = {
  "en-GB": "English",
  "fr-FR": "French",
  "be-NL": "Dutch",
};

const LangHandler = () => {
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const langParam = searchParams.get("lang");
  const currentLang = i18n.language;

  useEffect(() => {
    if (langParam && SUPPORTED_LANGS.includes(langParam)) {
      if (langParam !== currentLang) {
        i18n.changeLanguage(langParam);
      }
      return;
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("lang", currentLang);
      return next;
    }, { replace: true });
  }, [langParam, currentLang, i18n, setSearchParams]);

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const displayName = LANG_DISPLAY_NAMES[currentLang] ?? currentLang;
        const response = await fetch(
          `/_api/actum_translations?$filter=actum_translationname eq '${displayName}'`
        );
        if (!response.ok) return;

        const data = await response.json();
        if (!data.value?.[0]?.actum_content) return;

        const translations = JSON.parse(data.value[0].actum_content);
        console.log(`translations for ${displayName}`, translations);

        i18n.addResourceBundle(currentLang, "translation", translations, true, true);
      } catch {
        // Bundled translations serve as fallback when Dataverse is unreachable
      }
    };

    fetchTranslations();
  }, [currentLang, i18n]);

  return null;
};

export default LangHandler;

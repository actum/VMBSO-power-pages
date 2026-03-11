import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

const LangHandler = () => {

  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fetchAndAddTranslations = async (langKey: string) => {

    const language = langKey === "en-GB" ? "English" : langKey === "fr-FR" ? "French" : "Dutch";

    const response = await fetch(
      `/_api/actum_translations?$filter=actum_translationname eq '${language}'`
    );
    const data = await response.json();
    const translations = JSON.parse(data.value[0].actum_content);
    console.log(`translations for ${langKey}`, translations);

    i18n.addResourceBundle(langKey, 'translation', translations, true, true);
  };

  useEffect(() => {
    const langParam = searchParams.get("lang");
    const language = langParam || i18n.language;

    if (!langParam || langParam !== i18n.language) {
      const newSearchParams = new URLSearchParams(searchParams);

      newSearchParams.set("lang", language);

      i18n.changeLanguage(language);

      navigate(`${window.location.pathname}?${newSearchParams.toString()}`, { replace: true });
    }

    fetchAndAddTranslations(language);

  }, [searchParams, i18n, navigate]);

  return null;
};

export default LangHandler;

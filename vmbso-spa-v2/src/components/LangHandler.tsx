import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

const LangHandler = () => {

  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const languages = t("languages:options", { returnObjects: true }) as Record<string, string>;

  const fetchAndAddTranslations = async (langKey: string) => {

    let lang = i18n.languages[0];

    i18n.languages.forEach(language => {
      if (languages[language]) {
        lang = languages[language];
        return;
      }
    });

    const response = await fetch(
      `/_api/actum_translations?$filter=actum_translationname eq '${lang}'`
    );
    const data = await response.json();
    const translations = JSON.parse(data.value[0].actum_content);
    console.log(`translations for ${lang}`, translations);

    i18n.addResourceBundle(langKey, 'translation', translations, true, true);
  };

  // set the language if langParam changes
  useEffect(() => {
    const langParam = searchParams.get("lang");

    // default en-GB
    let language = i18n.languages[0];

    if (langParam) {

      if (languages[langParam]) {
        language = langParam;
      }

    } else {
      language = i18n.language;
    }

    if (langParam !== i18n.language) {

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

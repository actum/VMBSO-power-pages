import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

const LangHandler = () => {

  const { i18n } = useTranslation("languages");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const langParam = searchParams.get("lang");
    const language = langParam || i18n.language;

    if (!langParam || langParam !== i18n.language) {
      const newSearchParams = new URLSearchParams(searchParams);

      newSearchParams.set("lang", language);

      i18n.changeLanguage(language);

      navigate(`${window.location.pathname}?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, i18n]);

  return null;
};

export default LangHandler;

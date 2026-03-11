import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

const LangHandler = () => {

  const { i18n } = useTranslation("languages");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const langParam = searchParams.get("lang");

    if (langParam && langParam !== i18n.language) {
      const newSearchParams = new URLSearchParams(searchParams);

      newSearchParams.set("lang", langParam);

      i18n.changeLanguage(langParam);

      navigate(`${window.location.pathname}?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams]);

  return null;
};

export default LangHandler;

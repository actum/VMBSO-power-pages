import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';
import engbTranslations from "./engb.json";
import frfrTranslations from "./frfr.json";
import benlTranslations from "./benl.json";

i18n
.use(initReactI18next)
.use(LanguageDetector)
.init({
  resources: {
    "en-GB": engbTranslations,
    "fr-FR": frfrTranslations,
    "be-NL": benlTranslations,
  },
  fallbackLng: "en-GB",
});

export default i18n;

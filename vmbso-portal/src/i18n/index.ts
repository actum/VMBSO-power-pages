import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import updateProfileEn from "./locales/updateProfile_en.json";
import updateProfileFr from "./locales/updateProfile_fr.json";
import updateProfilebeNl from "./locales/updateProfile_be-nl.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { updateProfile: updateProfileEn },
    fr: { updateProfile: updateProfileFr },
    be: { updateProfile: updateProfilebeNl },
  },
  lng: "en",
  fallbackLng: "en",
});

export default i18n;

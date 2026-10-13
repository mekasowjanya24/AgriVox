import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import teTranslation from './locales/te.json';

const savedLang = localStorage.getItem('agrivox_lang') || 'te';

if (typeof document !== 'undefined') {
  document.documentElement.lang = savedLang;
  document.title = savedLang === 'te' ? 'AgriVox - రైతు ఆదాయ వేదిక' : 'AgriVox - Farm Finance & Market Advisory';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      te: { translation: teTranslation },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (lang) => {
  localStorage.setItem('agrivox_lang', lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.title = lang === 'te' ? 'AgriVox - రైతు ఆదాయ వేదిక' : 'AgriVox - Farm Finance & Market Advisory';
  }
  return i18n.changeLanguage(lang);
};

export default i18n;

/**
 * src/services/i18n.ts
 *
 * SPRACH-KONFIGURATION
 * Update: Englisch aktiviert!
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import der Sprachdateien
import deJSON from '../locales/de.json';
import enJSON from '../locales/en.json'; // KOMMENTAR ENTFERNT

const resources = {
  de: {
    translation: deJSON,
  },
  en: { 
    translation: enJSON // KOMMENTAR ENTFERNT
  } 
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'de', // Standardsprache
    fallbackLng: 'de',
    
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
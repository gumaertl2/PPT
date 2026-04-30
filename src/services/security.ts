/**
 * src/services/security.ts
 *
 * SICHERHEITSDIENSTE
 * Nachbildung der Logik aus Papatours (utilities.js)
 * Features: Base64-Obfuskierung, Ablaufdatum.
 */

const STORAGE_KEY = 'openai_api_key'; // Wir nutzen den Key des neuen Projekts
const EXPIRATION_DAYS = 30;

export const SecurityService = {
  /**
   * Speichert den API-Key "verschlüsselt" (Base64) mit Ablaufdatum.
   */
  saveApiKey: (key: string) => {
    try {
      if (!key) return;
      
      // Base64 "Verschlüsselung" (Obfuskierung)
      const encrypted = btoa(key);
      const expirationTimestamp = new Date().getTime() + (EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
      
      const dataToStore = JSON.stringify({
        key: encrypted,
        expires: expirationTimestamp
      });
      
      localStorage.setItem(STORAGE_KEY, dataToStore);
    } catch (e) {
      console.error("Fehler beim Speichern des API-Keys:", e);
    }
  },

  /**
   * Lädt den API-Key und entschlüsselt ihn.
   */
  loadApiKey: (): string | null => {
    const storedData = localStorage.getItem(STORAGE_KEY);
    
    if (!storedData) return null;
    
    // Fallback 1: Ist es ein Legacy Klartext-Key? (sk-...)
    if (storedData.startsWith('sk-')) {
      return storedData;
    }

    try {
      // Versuch: JSON parsen (Neues Format)
      const parsed = JSON.parse(storedData);
      
      // Validierung
      if (!parsed.key || !parsed.expires) {
        return null; 
      }

      // Ablaufdatum prüfen
      if (new Date().getTime() > parsed.expires) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      // Entschlüsseln
      return atob(parsed.key);
    } catch (e) {
      return null;
    }
  },

  /**
   * Löscht den Key.
   */
  clearApiKey: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
// 23.01.2026 19:15 - FIX: Corrected interpolation syntax and UIState path (101 lines).
// src/services/ExportService.ts

import { useTripStore } from '../store/useTripStore';
import type { Place, PrintConfig } from '../core/types'; 

export const ExportService = {
  /**
   * Generiert einen TSV-String für den Import in Google My Maps.
   * Reduziert auf 7 relevante Spalten ohne Reasoning und Koordinaten.
   */
  generateGoogleMapsExport: (): string => {
    const { project } = useTripStore.getState();
    
    // Da places nun Record<string, Place> ist, liefert Object.values direkt das Array
    const allPlaces: Place[] = Object.values(project.data.places || {});

    if (allPlaces.length === 0) {
      return "";
    }

    // Header reduziert auf Wunsch des Users
    const headers = [
      "Name", 
      "Kategorie", 
      "Adresse", 
      "Beschreibung", 
      "Logistik", 
      "Google Link", 
      "Webseite"
    ];

    const rows = allPlaces.map(place => {
      // Datenbereinigung: Newlines und Tabs entfernen für TSV-Kompatibilität
      const clean = (text?: string) => text ? text.replace(/\r?\n|\r/g, " ").replace(/\t/g, " ") : "";

      // FIX: Added missing '$' for template literal interpolation
      const googleMapsLink = place.googlePlaceId 
        ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=$$${place.googlePlaceId}`
        : `https://www.google.com/maps/search/?api=1&query=$$${encodeURIComponent(place.name + " " + (place.address || ""))}`;

      return [
        place.name || "Unbekannter Ort",
        place.category || "Sight",
        clean(place.address || place.vicinity),
        clean(place.description || place.shortDesc),
        clean(place.logistics),
        googleMapsLink,
        place.website || ""
      ].join("\t");
    });

    return [headers.join("\t"), ...rows].join("\n");
  },

  /**
   * Kopiert den Export-String in die Zwischenablage.
   * Gibt true zurück, wenn erfolgreich.
   */
  copyExportToClipboard: async (): Promise<boolean> => {
    const tsvData = ExportService.generateGoogleMapsExport();
    
    if (!tsvData) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(tsvData);
      return true;
    } catch (err) {
      console.error("Clipboard Error:", err);
      // Fallback für Umgebungen ohne moderne Clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = tsvData;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (e) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  },

  /**
   * Startet den Druckprozess (WYSIWYG).
   * Setzt den globalen Druckzustand und triggert den Browser-Dialog.
   */
  triggerPrint: (config: PrintConfig) => {
    const { setUIState } = useTripStore.getState();
    
    // Setzt die gewählte Konfiguration in den globalen State (jetzt in uiState)
    setUIState({ 
      printConfig: config,
      isPrintMode: true 
    });

    // Erhöhter Timeout auf 800ms für stabilere DOM-Erfassung
    setTimeout(() => {
      window.print();
      setUIState({ isPrintMode: false });
    }, 800);
  }
};

// --- END OF FILE 101 Zeilen ---
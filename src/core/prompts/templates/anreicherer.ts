// 19.01.2026 18:40 - FIX: Migrated Output Schema to German V30 Keys & Added Strategic Briefing Context.
// src/core/prompts/templates/anreicherer.ts
// 15.01.2026 14:50 - UPDATE: Hardening (V30 Parity) - Whitelist Categories & Extra Fields.
// 17.01.2026 23:55 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests';

/**
 * Das Ziel-Schema für einen Ort in V30/V40 Hybrid-Modus.
 * UPDATE: Nutzt konsequent deutsche Keys für die UI-Kompatibilität.
 */
const SIGHT_SCHEMA = {
  "id": "String (MUSS exakt die ID aus der Eingabe-Liste sein!)",
  "name": "String (Offizieller Name)",
  "stadt": "String (Nur Ortsname, ohne PLZ)",
  "land": "String (Landesname)",
  "kategorie": "String (MUSS exakt einer der erlaubten Werte aus der Whitelist sein)",
  "beschreibung": "String (1-2 Sätze, inspirierend und auf den User zugeschnitten)",
  "geo_koordinaten": {
    "lat": "Number (Breitengrad)",
    "lng": "Number (Längengrad)"
  },
  "adresse": "String (Navigierbare Adresse, ohne Ortsname am Anfang)",
  "oeffnungszeiten": "String (Zusammenfassung für den Reisezeitraum)",
  "website": "String (Offizielle Webseite oder leer)",
  "bewertung": "Number (z.B. 4.7)",
  "google_ratings_count": "Number (Anzahl der Bewertungen)",
  "dauer_min": "Number (Empfohlene Besuchsdauer in Minuten)",
  "preis_tendenz": "String (Kostenlos, Günstig, Mittel, Teuer)",
  "logistics_info": "String (Parken, ÖPNV Anbindung)",
  "reasoning": "String (Kurze Begründung, warum dieser Ort zur Strategie passt)"
};

export const buildAnreichererPrompt = (project: TripProject): string => {
    const { userInputs, analysis } = project;

    // 1. STRATEGISCHES BRIEFING HOLEN (V30 Parity)
    // FIX: Nutzt jetzt den deutschen Key aus types.ts
    const strategischesBriefing = analysis.chefPlaner?.strategisches_briefing?.sammler_briefing || "Reichere die Orte mit hilfreichen Informationen an.";

    // 2. KATEGORIEN WHITELIST GENERIEREN
    const safeInterestData = INTEREST_DATA || {};
    const validCategories = Object.values(safeInterestData)
        .filter((cat: any) => !cat.isSystem) 
        .map((cat: any) => cat.id)
        .join(', ');

    // 3. DATEN-QUELLEN
    const rawCandidates = Object.values(project.data.places || {}).flat().map((p: any) => ({
        id: p.id,
        name: p.name || "Unbekannter Ort"
    }));

    const candidatesList = rawCandidates.length > 0 
        ? rawCandidates 
        : [{ id: "dummy-example-id", name: "Beispiel Sehenswürdigkeit" }];

    const dates = `${userInputs.dates.start} bis ${userInputs.dates.end}`;

    // 4. PROMPT CONSTRUCTION via Builder
    const role = `Du bist ein hochpräziser "Daten-Anreicherer" für Reiseführer. Deine Aufgabe ist es, eine Liste von Orten mit verifizierbaren Fakten und inspirierenden Beschreibungen zu ergänzen.`;

    const contextData = {
        reise_zeitraum: dates,
        strategische_vorgabe: strategischesBriefing,
        zu_bearbeitende_orte: candidatesList 
    };

    const instructions = `# ARBEITSANWEISUNG
- **Regel 1 (ID-Erhalt):** Nutze zwingend die exakte \`id\` aus der Eingabeliste für dein Ergebnis.
- **Regel 2 (Vollständigkeit):** Dein Ergebnis muss exakt so viele Objekte enthalten wie die Eingabeliste.
- **Regel 3 (Strategie-Fokus):** Schreibe die \`beschreibung\` unter Berücksichtigung der "strategischen_vorgabe".
- **Regel 4 (Struktur):** Trenne \`stadt\` und \`land\`.
- **Regel 5 (Koordinaten):** Finde die exakten Geo-Koordinaten (lat/lng).
- **Regel 6 (Adresse):** Das Feld \`adresse\` muss eine navigierbare Adresse ohne den Stadtnamen am Anfang enthalten.
- **Regel 7 (Google-Daten):** Recherchiere die aktuelle \`bewertung\` (Rating) und \`google_ratings_count\`.

# KATEGORIE-PROTOKOLL
Wähle für jeden Ort exakt EINE Kategorie aus dieser Liste:
**[${validCategories}]**
Erfinde keine neuen Kategorien.`;

    const outputSchema = [ SIGHT_SCHEMA ];

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withContext(contextData, "DATENBASIS & KONTEXT")
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        .build();
};
// --- END OF FILE 110 Zeilen ---
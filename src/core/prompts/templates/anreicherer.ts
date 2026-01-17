// src/core/prompts/templates/anreicherer.ts
// 15.01.2026 14:50 - UPDATE: Hardening (V30 Parity) - Whitelist Categories & Extra Fields.
// 17.01.2026 23:55 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests';

/**
 * Das Ziel-Schema für einen Ort in V40.
 * UPDATE: Enthält nun zwingend die 'id', Website & Google-Daten.
 */
const SIGHT_SCHEMA = {
  "id": "String (MUSS exakt die ID aus der Eingabe-Liste sein!)",
  "name": "String (Offizieller Name)",
  "stadt": "String (Nur Ortsname, ohne PLZ)",
  "land": "String (Landesname)",
  "kategorie": "String (MUSS exakt einer der erlaubten Werte aus der Whitelist sein)",
  "kurzbeschreibung": "String (1-2 Sätze, inspirierend)",
  "geo_koordinaten": {
    "lat": "Number (Breitengrad)",
    "lng": "Number (Längengrad)"
  },
  "adresse": "String (Navigierbare Adresse, ohne Ortsname am Anfang)",
  "oeffnungszeiten": "String (Zusammenfassung für den Reisezeitraum)",
  "website": "String (Offizielle Webseite oder leer)",
  "google_rating": "Number (z.B. 4.7)",
  "google_ratings_count": "Number (Anzahl der Bewertungen)",
  "dauer_min": "Number (Empfohlene Besuchsdauer in Minuten)",
  "preis_tendenz": "String (Kostenlos, Günstig, Mittel, Teuer)",
  "logistics_info": "String (Parken, ÖPNV Anbindung)"
};

export const buildAnreichererPrompt = (project: TripProject): string => {
    const { userInputs } = project;

    // 1. KATEGORIEN WHITELIST GENERIEREN (Logik 1:1 erhalten)
    // Wir nehmen nur Kategorien, die keine reinen System-Steuerungen sind
    // Safety Check: INTEREST_DATA kann undefined sein beim Hot-Reload
    const safeInterestData = INTEREST_DATA || {};
    const validCategories = Object.values(safeInterestData)
        .filter((cat: any) => !cat.isSystem) // Filtert 'Puffer', 'Reisetempo' etc.
        .map((cat: any) => cat.id)
        .join(', ');

    // 2. DATEN-QUELLEN
    // Wir holen uns alle Orte aus dem State.
    // WICHTIG: Wir übergeben ID und NAME, damit die KI die ID zurückgeben kann.
    const rawCandidates = Object.values(project.data.places || {}).map((p: any) => ({
        id: p.id,
        name: p.name || "Unbekannter Ort"
    }));

    // Fallback, falls leer (damit Prompt nicht crasht)
    const candidatesList = rawCandidates.length > 0 
        ? rawCandidates 
        : [{ id: "dummy-example-id", name: "Beispiel Sehenswürdigkeit" }];

    const dates = `${userInputs.dates.start} bis ${userInputs.dates.end}`;
    const fixedEvents = userInputs.dates.fixedEvents || [];

    // 3. PROMPT CONSTRUCTION via Builder

    const role = `You are a high-precision Data Enricher. Your **sole mission** is to enrich a given list of **CANDIDATES** (IDs & Names) with hard, verifiable facts.`;

    const contextData = {
        travel_period: dates,
        fixed_appointments: fixedEvents,
        candidates_to_enrich: candidatesList // Das ist die Arbeitsliste
    };

    const instructions = `# MANDATORY RULES & WORKFLOW
- **Rule 1 (Pass-Through ID):** The input list contains objects with \`id\` and \`name\`. You MUST return the EXACT \`id\` for each object in your output.
- **Rule 2 (Completeness):** Your final output MUST contain **exactly as many objects** as the input list.
- **Rule 3 (Live Research):** Research **live** for every name to find current data.
- **Rule 4 (Structure):** Fill \`stadt\` and \`land\` separately.
- **Rule 5 (Availability):** Check opening hours for: **${dates}**.
- **Rule 6 (Coordinates - PRIO A):** You MUST find exact Geo-Coordinates (lat/lng).
- **Rule 7 (Address):** The \`adresse\` field must be navigable.
- **Rule 8 (Google Data):** You MUST research the \`google_rating\` and \`google_ratings_count\`.

# CATEGORY PROTOCOL (STRICT)
You are NOT allowed to invent categories. You MUST assign exactly ONE category from this whitelist:
**[${validCategories}]**
If a place does not fit perfectly, choose the closest match.`;

    // Das Output Schema wird nun sauber als Array übergeben
    const outputSchema = [ SIGHT_SCHEMA ];

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withContext(contextData, "DATA BASIS (Tasks)")
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        .build();
};
// --- END OF FILE 105 Zeilen ---
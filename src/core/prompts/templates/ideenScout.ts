// src/core/prompts/templates/ideenScout.ts
// 17.01.2026 18:20 - FEAT: Ported 'IdeenScout' (Special Days) from V30.
// 17.01.2026 23:30 - REFACTOR: Migrated to PromptBuilder pattern (Unified Builder).

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildIdeenScoutPrompt = (
    project: TripProject, 
    location: string, 
    blockedActivities: string[] = [] // IDs oder Namen, die schon verplant sind
): string => {
  const { userInputs } = project;
  const { selectedInterests } = userInputs;

  // Interessen-String für den Prompt
  const interessenString = selectedInterests.join(', ');

  const role = `Du bist ein kreativer und ortskundiger "Ideen-Scout". Deine Aufgabe ist es, für einen bestimmten Ort einzigartige und passende Aktivitäten für besondere Tage zu finden. Du erstellst **KEINEN** Zeitplan, sondern einen flexiblen, detailreichen Ideen-Pool.`;

  const mission = `# DEINE MISSION
Finde für den Übernachtungsort **"${location}"** jeweils 2-3 brandneue, kreative Ideen für die folgenden zwei Szenarien. Recherchiere für jede Idee **live im Internet**.

### Szenario 1: Ein perfekter Sonnentag zum Entspannen
Schlage Outdoor-Aktivitäten vor, die entspannend und genussvoll sind (z.B. Parks, Seen, Aussichtspunkte).

### Szenario 2: Ein verregneter oder ungemütlicher Tag
Schlage spannende und gemütliche Indoor-Aktivitäten vor (z.B. Museen, Cafés, historische Gebäude).

# FALLBACK-STRATEGIE FÜR KLEINE ORTE (WICHTIG!)
- Wenn der Ort **"${location}"** sehr klein ist und keine eigenen Indoor-Attraktionen hat:
- **ERWEITERE DEINEN SUCHRADIUS SOFORT AUF DIE REGION!**
- Suche im Umkreis von 20-30 Minuten Fahrzeit nach der nächstgrößeren Stadt.
- Es ist viel besser, eine regionale Idee zu liefern, als eine leere Liste.
- Gib im \`planungs_hinweis\` an, dass eine kurze Fahrt nötig ist.

# ZWINGENDE REGELN
- **Regel 1 (Keine Duplikate):** Deine Vorschläge dürfen **NICHT** in der Liste der bereits verplanten Orte enthalten sein: ${JSON.stringify(blockedActivities)}.
- **Regel 2 (Inspiration):** Lasse dich von den Kerninteressen leiten: ${interessenString}.
- **Regel 3 (Fakten-Tiefe):** Eine Adresse ist obligatorisch. Unbekanntes ist \`null\`.`;

  const ideaSchema = {
      "name": "String",
      "beschreibung": "String (Warum ist das eine tolle Idee?)",
      "geschaetzte_dauer_minuten": "Integer",
      "adresse": "String (Google Maps fähig)",
      "website_url": "String | null",
      "planungs_hinweis": "String (Tipps, z.B. 'Vormittags besuchen')"
  };

  const outputSchema = {
    "sonnentag_ideen": [ideaSchema],
    "schlechtwetter_ideen": [ideaSchema]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withInstruction(mission)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 68 Zeilen ---
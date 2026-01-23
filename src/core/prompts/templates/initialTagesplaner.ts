// 23.01.2026 15:30 - FIX: Synchronized Schema with CoT Instruction (added _thought_process).
// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/initialTagesplaner.ts
// 19.01.2026 19:20 - FIX: Corrected PromptBuilder pattern for Strategic Briefing & Appointments.
// 19.01.2026 13:00 - FIX: Restored V30 Legacy Schema (tag_nr -> tagNummer) for SSOT compliance.
// 18.01.2026 12:40 - BUILD-FIX: Replaced .withConstraint with .withInstruction.

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject, Place, ChunkingContext } from '../../types';

/**
 * Helper: Prepares sights AND filters out visited ones.
 */
const formatSightsForPrompt = (project: TripProject, excludedIds: string[]): string => {
  const { data } = project;
  const allSights = Object.values(data.places || {}).flat() as Place[];
  
  const availableSights = allSights.filter((s: Place) => !excludedIds.includes(s.id));

  if (availableSights.length === 0) {
    return "No specific places available. Use general knowledge for suitable activities.";
  }

  return availableSights.map((s: Place) => {
    const prio = s.userPriority ? `[USER-PRIO: ${s.userPriority}] ` : '';
    const rating = s.rating ? ` (${s.rating}⭐)` : '';
    const address = s.address || s.vicinity || '';
    const locationInfo = address ? ` [Loc: ${address}]` : '';
    
    let openInfo = '';
    if (s.openingHours) {
        const openStr = Array.isArray(s.openingHours) ? s.openingHours.join(', ') : s.openingHours;
        if (openStr && typeof openStr === 'string' && openStr.length < 100) {
            openInfo = ` [Open: ${openStr}]`;
        }
    }

    return `- ${prio}${s.name}${rating}${locationInfo}: ${s.shortDesc || s.description || ''}${openInfo} (ID: ${s.id})`;
  }).join('\n');
};

/**
 * Builds the prompt for the Daily Planner.
 */
export const buildInitialTagesplanerPrompt = (
    project: TripProject, 
    chunkData?: ChunkingContext, 
    feedback?: string,
    visitedSightIds: string[] = []
): string => {
  
  const { userInputs, analysis } = project;
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'German';

  // 1. CHEF PLANER DATA (V40 English Keys)
  const chefPlaner = analysis.chefPlaner;
  const strategicBriefing = (chefPlaner as any)?.strategic_briefing?.itinerary_rules || 
                            (chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                            (chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                            "";
  
  const validierteTermine = (chefPlaner as any)?.validated_appointments || 
                            (chefPlaner as any)?.validierte_termine || 
                            [];

  // 2. Initialize Builder
  const builder = new PromptBuilder()
    .withRole('You are an ELITE TRAVEL PLANNER (AI). Create a detailed, logical daily itinerary.');

  // 3. Framework Conditions
  builder.withContext([
    `Pace: ${userInputs.pace}`,
    `Interests: ${userInputs.selectedInterests.join(', ')}`,
    `Group: ${userInputs.travelers.adults} Adults, ${userInputs.travelers.children} Children`,
    `Language: ${lang}`
  ], 'CONDITIONS');

  // 4. Injection of Strategy & Appointments
  if (strategicBriefing) {
    builder.withContext(strategicBriefing, "STRATEGIC GUIDELINE");
  }
  if (validierteTermine.length > 0) {
    builder.withContext(validierteTermine, "FIXED APPOINTMENTS (IMMUTABLE)");
  }

  // 5. Chunking Logic
  let dayOffset = 0;
  if (chunkData) {
      dayOffset = chunkData.dayOffset || 0;
      const startDay = dayOffset + 1;
      const endDay = dayOffset + chunkData.days;
      const currentStations = chunkData.stations || [];

      builder.withInstruction(`ATTENTION - PARTIAL PLANNING (CHUNKING):
      You are planning a section of the trip.
      - From Day: ${startDay}
      - To Day: ${endDay}
      - Focus Locations: ${currentStations.join(', ')}`);

      if (visitedSightIds.length > 0) {
          builder.withInstruction(
            `ALREADY PLANNED (AVOID DUPLICATES): ${visitedSightIds.length} places have been visited in previous days. Do NOT plan them again!`
          );
      }
  } else {
      const stations = userInputs.logistics.mode === 'stationaer' 
        ? [userInputs.logistics.stationary.destination] 
        : userInputs.logistics.roundtrip.stops.map(s => s.location);
        
      builder.withInstruction("Create the complete itinerary for the entire trip.");
      builder.withContext(stations.join(', '), "Stations");
  }

  // 6. Sights Context
  const sightsContext = formatSightsForPrompt(project, visitedSightIds);
  builder.withContext(sightsContext, 'AVAILABLE PLACES (RESPECT USER PRIO)');

  // 7. User Feedback
  if (feedback) {
      builder.withInstruction(`USER FEEDBACK (CHANGE REQUEST): "${feedback}"\nPlease adjust the plan considering this feedback.`);
  }

  // 8. Logic
  builder.withInstruction(`LOGIC RULES:
  1. **Priority:** Places with [USER-PRIO] MUST be scheduled (if geographically feasible).
  2. **Cluster:** Use [Loc] info to group places.
  3. **Timing:** Respect [Open] times.
  4. **Logistics:** Short distances between activities.`);

  // 9. Output Format (V40 English Keys)
  // FIX: Added _thought_process to string schema
  const outputFormat = `
  Answer EXCLUSIVELY with JSON.
  Structure must be exactly compatible with the V40 Frontend Renderer:

  {
    "_thought_process": "String (Strategic planning step: Check constraints, open times & routing)",
    "days": [
      {
        "day": ${dayOffset + 1},
        "date": "YYYY-MM-DD" (if known, else null),
        "title": "Day Motto",
        "location": "Main Location",
        "activities": [
          {
            "time": "09:00",
            "title": "Activity Name",
            "description": "Inspiring description (2-3 sentences).",
            "duration": "2h",
            "cost": "approx. 15€",
            "original_sight_id": "ID_FROM_LIST" (IMPORTANT for mapping!),
            "type": "sight" | "food" | "transfer" | "pause"
          }
        ]
      }
    ]
  }`;
  
  builder.withOutputSchema(outputFormat);

  return builder.build();
};
// --- END OF FILE 137 Zeilen ---
// 17.02.2026 19:50 - FIX: Renamed function to 'buildInitialTagesplanerPrompt' to match PayloadBuilder import.
// 17.02.2026 18:15 - REFACTOR: V40 Logistics Architect Implementation.
// Implements strict skeleton logic, hotel loops, transfer mandates, and fix-date adherence.
// src/core/prompts/templates/initialTagesplaner.ts

export interface TagesplanerPayload {
  travel_dates: {
    start: string;
    end: string;
    total_days: number;
    daily_start: string;
    daily_end: string;
  };
  hotel_base: {
    name: string;
    address: string;
    geo: string;
  };
  available_sights: string; // Pre-formatted list with tags [FIX], [PRIO], [GEO]
  constraints: string;
}

export const buildInitialTagesplanerPrompt = (payload: TagesplanerPayload): string => {
  return `
ROLE:
You are the "Senior Travel Logistics Architect".
Your ONLY goal is to build a geometrically optimized, time-feasible itinerary skeleton.
You DO NOT write descriptions for sights. You ONLY plan logistics, times, and routes.

INPUT DATA:
1. TRAVEL DATES:
   - Start: ${payload.travel_dates.start}
   - End: ${payload.travel_dates.end}
   - Total Days: ${payload.travel_dates.total_days}
   - Daily Active Hours: ${payload.travel_dates.daily_start} - ${payload.travel_dates.daily_end}

2. BASE:
   - Hotel: ${payload.hotel_base.name} (${payload.hotel_base.address})
   - Geo: ${payload.hotel_base.geo}
   - Logic: Every day MUST start and end at this Hotel.

3. CANDIDATE POOL (Sights & Activities):
${payload.available_sights}

4. CONSTRAINTS:
${payload.constraints}

STRICT PLANNING RULES (The "V40 Logistics Protocol"):
1. **Hard Constraints ([FIXED])**:
   - Sights tagged with [FIXED: Date Time] MUST be scheduled exactly at that slot.
   - You CANNOT move them. Plan the route *around* them.

2. **Priority Hierarchy**:
   - [PRIO: 1]: MUST be included if physically possible.
   - [PRIO: 2]: Should be included to fill gaps.
   - [PRIO: 0]: Use as filler if nearby.

3. **Geospatial Clustering**:
   - Group sights by proximity ([GEO] tags).
   - Do NOT zigzag across the city.
   - Assign one cluster per day/half-day.

4. **The Transfer Mandate (CRITICAL)**:
   - Between ANY two locations (Hotel -> Sight A -> Sight B -> Hotel), you MUST insert a 'transfer' object.
   - Transfer logic:
     - < 1.5km: mode='walk'
     - > 1.5km: mode='transit' or 'drive'
   - Estimate realistic duration (e.g., 2km walk = 25min).

5. **Skeleton-Only Content**:
   - Sights: 'description' MUST be empty string "".
   - Transfers: 'description' MUST contain short logistics (e.g., "Walk 500m" or "Metro U2 to Alexanderplatz").

OUTPUT FORMAT (JSON ONLY):
{
  "_thought_process": "Step-by-step reasoning on clustering, fix-date handling, and route optimization.",
  "itinerary": [
    {
      "day_id": "day-1",
      "date": "YYYY-MM-DD",
      "title": "Theme of the day",
      "activities": [
        {
           "type": "check-in", // Only on first day arrival
           "time": "HH:MM",
           "location": "${payload.hotel_base.name}",
           "duration": 30
        },
        {
           "type": "transfer",
           "mode": "walk/transit/drive",
           "duration": 15,
           "description": "Logistics note"
        },
        {
           "type": "sight",
           "id": "ID_FROM_INPUT",
           "name": "Name",
           "time": "HH:MM",
           "duration": 60, // From input [DURATION] tag
           "description": "" // LEAVE EMPTY
        }
        // ... more transfers and sights ...
      ]
    }
    // ... more days ...
  ],
  "unassigned": [
    {
      "id": "ID",
      "name": "Name",
      "reason": "Distance / Opening Hours / Time Budget"
    }
  ]
}

CRITICAL:
- Every day starts at Hotel.
- Every day ends at Hotel.
- Arrival day: Account for arrival time (start later).
- Departure day: Account for departure time (end earlier).
- If [FIXED] dates conflict, report the conflict in _thought_process but prioritize the earliest fixed constraint.
- Return ONLY valid JSON.
`;
};
// --- END OF FILE 98 Zeilen ---
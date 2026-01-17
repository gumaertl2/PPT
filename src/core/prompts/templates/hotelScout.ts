// src/core/prompts/templates/hotelScout.ts
// 17.01.2026 15:30 - UPDATE: Added 'Geo-Hub' Logic for strategic location search.
// 18.01.2026 00:15 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildHotelScoutPrompt = (
    project: TripProject,
    locationName: string,
    checkInDate: string,
    checkOutDate: string
): string => {
  const { userInputs } = project;
  const { travelers, budget, logistics } = userInputs;

  // Kontext für die KI
  const contextData = {
    destination: locationName,
    dates: { check_in: checkInDate, check_out: checkOutDate },
    travelers: {
        adults: travelers.adults,
        children: travelers.children,
        pets: travelers.pets // Wichtig für Filter!
    },
    budget_level: budget, // 'low', 'medium', 'high', 'luxury'
    transport_needs: (logistics as any).arrivalType === 'car' ? 'Parking required' : 'Public transport proximity'
  };

  const role = `Du bist der "Hotel Scout". Deine Aufgabe ist es, für eine gegebene Destination und Reisedaten die perfekte Unterkunft zu finden.
  Du suchst live nach **verfügbaren** Optionen, die zum Budget und Profil der Reisenden passen.`;

  const instructions = `# AUFGABE
Finde 3 konkrete Unterkunfts-Optionen in oder sehr nahe bei **"${locationName}"**.

# STRATEGIE & FILTER
1.  **Lage (Hub-Strategie):** Die Unterkunft muss strategisch gut liegen, um die Umgebung zu erkunden.
2.  **Budget:** Halte dich strikt an das Budget-Level: ${budget}.
3.  **Logistik:**
    * Falls Reisende mit Auto: Parkplatz ist PFLICHT.
    * Falls Haustiere dabei: "Haustiere erlaubt" ist PFLICHT.
4.  **Qualität:** Nur Unterkünfte mit Google Rating > 4.0.

# OPTIONEN-MIX
1.  **Option A (Der Preis-Leistungs-Sieger):** Beste Balance.
2.  **Option B (Die besondere Lage):** Beste Aussicht oder Zentrumsnähe.
3.  **Option C (Der Geheimtipp):** Kleines Boutique-Hotel oder charmantes Apartment.

# OUTPUT-SCHEMA
Fülle für jede Option das Schema exakt aus.
WICHTIG: Recherchiere eine echte, funktionierende Buchungs-URL (Booking.com, Airbnb oder Direkt).`;

  const outputSchema = {
    "accommodations": [
      {
        "name": "String (Offizieller Name)",
        "address": "String (Adresse)",
        "description": "String (Warum diese Wahl? 1-2 Sätze)",
        "price_approx": "String (Geschätzter Preis pro Nacht)",
        "booking_url": "String (URL zur Buchung oder Homepage)",
        "pros": ["String (Vorteil 1)", "String (Vorteil 2)"],
        "google_rating": "Number"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "BUCHUNGS-ANFRAGE")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 72 Zeilen ---
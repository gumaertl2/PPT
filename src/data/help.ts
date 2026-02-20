// 20.02.2026 23:35 - DOCS: Injected the [CATALOG_BUTTON] magic tag into the Interests Step to trigger the new parser.
// src/data/help.ts
/**
 * Enthält Hilfetexte für den Wizard und Barrierefreiheits-Optionen.
 */

import type { LocalizedContent } from '../core/types';

export const HELP_TEXTS: Record<string, { title: LocalizedContent; body: LocalizedContent }> = {
  'step1': {
    title: { de: "Hilfe zu: Das Reise-Cockpit", en: "Help: Travel Cockpit" },
    body: {
      de: "**Was ist hier zu tun?**\nDas Cockpit ist Ihre Kommandozentrale. Hier legen Sie das logistische Fundament Ihrer Reise fest, auf dem die KI später alle Routen aufbaut.\n\n**1. Der Reisetyp:**\nEntscheiden Sie sich für die grundsätzliche Art der Reise:\n- **Stationär:** Sie haben ein festes Basecamp (z.B. ein Hotel in Rom) und machen von dort aus Tagesausflüge.\n- **Rundreise:** Ein Roadtrip mit wechselnden Unterkünften. Die KI optimiert hierbei die Fahrstrecken zwischen den Orten.\n\n**2. Stationär (Base Camp):**\nGeben Sie das zentrale Ziel ein (z.B. 'Barcelona' oder 'Gardasee'). Wenn Sie schon ein konkretes Hotel gebucht haben, können Sie dieses direkt eintragen. Die KI nutzt es dann als exakten Startpunkt für alle Wegberechnungen.\n\n**3. Rundreise:**\nGeben Sie die grobe Region an. Darunter können Sie Ihre geplanten Stopps eintragen. \n*Tipp:* Wenn Sie den Schalter auf 'Fix' setzen, zwingen Sie die KI, exakt diese Route einzuhalten. Lassen Sie ihn aus, darf die KI eigene, logisch sinnvolle Zwischenstopps ergänzen.",
      en: "**What to do here?**\nThe cockpit is your command center. Here you lay the logistical foundation upon which the AI will build your routes.\n\n**1. Trip Type:**\nDecide on the fundamental nature of your trip:\n- **Stationary:** You have a fixed basecamp (e.g., a hotel in Rome) and make day trips from there.\n- **Round Trip:** A road trip with changing accommodations. The AI will optimize driving routes between locations.\n\n**2. Stationary (Base Camp):**\nEnter your main destination (e.g., 'Barcelona'). If you already booked a specific hotel, enter its name. The AI will use it as the exact starting point for all transit calculations.\n\n**3. Round Trip:**\nEnter the broad region and add your planned stops.\n*Tip:* Checking 'Fixed' forces the AI to strictly follow your route. Leaving it unchecked allows the AI to suggest logical intermediate stops."
    }
  },
  'step2': {
    title: { de: "Hilfe zu: Wer & Wie (Profil)", en: "Help: Who & How (Profile)" },
    body: {
      de: "**Was ist hier zu tun?**\nHier kalibrieren Sie das 'Gehirn' der KI. Diese Parameter beeinflussen stark, *welche* Art von Orten gesucht werden und *wie dicht* der finale Tagesplan gepackt wird.\n\n**1. Reisetempo (Pace):**\n- *Sportlich:* Die KI plant straffe Tage mit vielen Highlights und kurzen Pausen.\n- *Ausgewogen:* Der Standard. Eine gute Mischung aus Erlebnis und Erholung.\n- *Entspannt:* Die KI plant großzügige Pufferzeiten ein und belässt Freiräume zum Treibenlassen.\n\n**2. Preisniveau (Budget):**\nDies ist die wichtigste Vorgabe für den 'Food-Scout' und die Hotel-Suche. Wählen Sie 'Low Budget', sucht die KI nach exzellentem Streetfood; bei 'Luxus' durchkämmt sie Michelin-Guides nach Fine-Dining-Erlebnissen.\n\n**3. Vibe (Atmosphäre):**\nSoll die Reise eher romantisch, abenteuerlich oder kulturell geprägt sein? Dies gibt der KI eine kreative Brille auf.\n\n**4. Reisende & Nationalität:**\nDas Alter hilft der KI (besonders bei Kindern), altersgerechte Orte zu finden. Die Nationalität ermöglicht es dem 'Info-Autor', spezifische Visa- oder Maut-Regeln für Ihr Heimatland zu recherchieren.",
      en: "**What to do here?**\nHere you calibrate the AI's 'brain'. These parameters heavily influence *what* kind of places are suggested and *how dense* the daily schedule will be.\n\n**1. Travel Pace:**\n- *Fast:* The AI plans tight schedules with many highlights and short breaks.\n- *Balanced:* A good mix of experiences and relaxation.\n- *Relaxed:* The AI includes generous buffer times and leaves room to drift.\n\n**2. Budget Level:**\nThis is the prime directive for the 'Food Scout' and hotel searches. Choosing 'Low Budget' prompts a search for excellent street food; 'Luxury' triggers a scan of Michelin guides.\n\n**3. Vibe (Atmosphere):**\nShould the trip be romantic, adventurous, or cultural? This gives the AI a creative lens.\n\n**4. Travelers & Nationality:**\nAge helps the AI (especially with kids) find age-appropriate places. Nationality allows the 'Info Author' to provide specific visa or toll rules for your home country."
    }
  },
  'step3': {
    title: { de: "Hilfe zu: Interessen & Suchfilter", en: "Help: Interests & Filters" },
    body: {
      de: "**Was ist hier zu tun?**\nDas ist das Herzstück Ihrer Reiseplanung. Hier definieren Sie exakt, was Sie erleben möchten und worüber Sie mehr erfahren wollen.\n\n**1. Themen auswählen & anpassen (Ihre Superkraft):**\nWählen Sie aus den Kategorien Ihre Favoriten. **Der Clou:** Sie sind nicht an unsere Standard-Vorgaben gebunden! Wenn Sie eine Kachel ausgewählt haben, können Sie auf den hinterlegten Text klicken und die Anweisung an die KI *völlig frei mit eigenen Worten überschreiben*.\n\n[CATALOG_BUTTON]\n\n**2. Die Qualitäts-Filter (WICHTIG):**\nMit den Schiebereglern unten können Sie die Streuung der KI-Suche massiv steuern:\n- **Mindest-Bewertung:** Setzen Sie den Regler z.B. auf 4.5, zwingen Sie die KI, kleine oder mittelmäßige Orte zu ignorieren und nur absolute Top-Locations vorzuschlagen.\n- **Mindest-Aufenthaltsdauer:** Wenn Sie keine Lust auf 10-Minuten-Fotostopps haben, setzen Sie diesen Regler auf z.B. 60 Minuten. Die KI sucht dann nur nach 'echten' Ausflugszielen, die Ihre Zeit wert sind.",
      en: "**What to do here?**\nThis is the heart of your trip planning. Here you define exactly what you want to experience and what you want to learn more about.\n\n**1. Select & Customize Topics (Your Superpower):**\nSelect your favorites. **The best part:** You are not bound to our defaults! Click on the text of a selected tile to completely rewrite the instruction for the AI *in your own words*.\n\n[CATALOG_BUTTON]\n\n**2. Quality Filters (IMPORTANT):**\nUse the sliders at the bottom to drastically control the AI search:\n- **Minimum Rating:** Setting the slider to e.g. 4.5 forces the AI to ignore mediocre spots and only suggest absolute top-rated locations.\n- **Minimum Duration:** If you dislike 10-minute photo stops, set this to 60 minutes. The AI will only search for 'real' destinations worth your time."
    }
  },
  'step4': {
    title: { de: "Hilfe zu: Termine & Zeiten", en: "Help: Dates & Times" },
    body: {
      de: "**Was ist hier zu tun?**\nHier geben Sie der KI das zeitliche Grundgerüst für die Erstellung der Tagespläne.\n\n**1. Reisedatum:**\nWählen Sie das Start- und Enddatum. Die KI berechnet daraus die genaue Anzahl der Reisetage und weiß, an welchen Wochentagen Sie vor Ort sind (wichtig für Ruhetage von Museen oder Restaurants).\n\n**2. Aktivfenster (Tageszeiten):**\nWann verlassen Sie normalerweise morgens die Unterkunft und wann möchten Sie abends zurück sein? Die KI respektiert diese Grenzen strikt und wird keine Aktivitäten außerhalb dieses Fensters einplanen.\n\n**3. Feste Termine (Ihre Anker):**\nTragen Sie hier alle unverrückbaren Termine ein – wie gebuchte Hinflüge, ein reserviertes Konzert oder einen Tisch im Restaurant. \n*Der Vorteil:* Die KI behandelt diese Termine als feste Anker und rechnet clever die Wegezeiten dorthin aus. Das restliche Tagesprogramm wird dann organisch *um diese Termine herum* geplant.",
      en: "**What to do here?**\nHere you provide the AI with the temporal framework for creating your daily itineraries.\n\n**1. Travel Dates:**\nSelect the start and end date. The AI calculates the exact number of days and knows the weekdays (crucial for museum or restaurant closing days).\n\n**2. Active Window (Daily Hours):**\nWhen do you usually leave your accommodation and when do you want to return? The AI strictly respects these boundaries and won't schedule activities outside this window.\n\n**3. Fixed Appointments (Your Anchors):**\nEnter all unchangeable appointments here – like booked flights, a concert, or a dinner reservation. \n*The Advantage:* The AI treats these as solid anchors, calculates travel times to get there, and organically plans the rest of the day's program *around these slots*."
    }
  },
  'step5': {
    title: { de: "Hilfe zu: Sonstiges & No-Gos", en: "Help: Misc & No-Gos" },
    body: {
      de: "**Was ist hier zu tun?**\nHier geben Sie den KI-Agenten den allerletzten Feinschliff mit auf den Weg. Nutzen Sie diese Felder, um wie in einem Chatfenster mit einem menschlichen Reisebüro-Mitarbeiter zu sprechen.\n\n**1. Eigene Wünsche (Das Tüpfelchen auf dem i):**\nErzählen Sie der KI, was diesen Urlaub für Sie absolut perfekt machen würde.\n*Beispiele:* 'Wir sind leidenschaftliche Fotografen, bitte suche Orte mit tollen Lichtverhältnissen', 'Bitte plane jeden Nachmittag eine entspannte Kaffeepause in einem schönen Café ein' oder 'Wir suchen nach versteckten Orten abseits der klassischen Touristenpfade'.\n\n**2. No-Gos (Ihre roten Linien):**\nDefinieren Sie klare Ausschlüsse. Was darf auf gar keinen Fall auf dem Reiseplan stehen?\n*Beispiele:* 'Auf keinen Fall Kirchen oder religiöse Stätten besichtigen', 'Wir wollen am Stück nicht länger als 30 Minuten laufen' oder 'Bitte keine extrem überlaufenen Touristenfallen vorschlagen'. Die KI wird diese Orte rigoros ausfiltern.",
      en: "**What to do here?**\nGive the AI agents their final finishing touches. Use these fields to talk to the AI just like you would chat with a human travel agent.\n\n**1. Custom Wishes (The icing on the cake):**\nTell the AI what would make this vacation absolutely perfect for you.\n*Examples:* 'We are passionate photographers, please find places with great lighting', 'Please plan a relaxed coffee break in a nice cafe every afternoon', or 'We are looking for hidden gems off the beaten tourist paths'.\n\n**2. No-Gos (Your red lines):**\nDefine clear exclusions. What should absolutely never appear on the itinerary?\n*Examples:* 'No churches or religious sites', 'We don't want to walk for more than 30 minutes straight', or 'Please avoid extremely crowded tourist traps'. The AI will rigorously filter these out."
    }
  },
  'step6': {
    title: { de: "Hilfe zu: Übersicht & Start", en: "Help: Review & Start" },
    body: {
      de: "**Was ist hier zu tun?**\nDies ist Ihr letzter Checkpoint vor dem Start der sogenannten 'Magic Chain' (unserer KI-Workflow-Engine).\n\n**1. Die finale Kontrolle:**\nÜberprüfen Sie alle angezeigten Kacheln. Grüne Häkchen bestätigen, dass das System alle benötigten Daten hat. Rote Warnungen zeigen an, wo noch zwingend Informationen (wie z.B. das Reiseziel) fehlen.\n\n**2. Letzte Anpassungen:**\nFällt Ihnen noch ein Fehler auf? Kein Problem. Klicken Sie einfach auf den 'Bearbeiten'-Pfeil in einer Kachel, um blitzschnell zu diesem Schritt zurückzuspringen.\n\n**3. Der Startschuss:**\nWenn alle Ampeln auf Grün stehen, klicken Sie auf **'Reise generieren'**. \nLehnen Sie sich zurück. Im Hintergrund startet nun ein ganzes Team von digitalen Experten (Strategen, Orts-Sammler, Fakten-Prüfer und Texter), die nacheinander Ihre Daten verarbeiten. Dieser Prozess kann – je nach Länge der Reise – ein bis zwei Minuten dauern.",
      en: "**What to do here?**\nThis is your final checkpoint before launching the 'Magic Chain' (our AI workflow engine).\n\n**1. Final Review:**\nCheck all displayed tiles. Green checkmarks confirm the system has everything it needs. Red warnings indicate where critical info (like the destination) is still missing.\n\n**2. Last Adjustments:**\nSpotted an error? No problem. Just click the 'Edit' arrow on any tile to instantly jump back to that step.\n\n**3. Launch:**\nWhen all lights are green, click **'Generate Trip'**. \nLean back. In the background, a whole team of digital experts (strategists, place scouts, fact-checkers, and writers) will now sequentially process your data. Depending on the trip's length, this magical process can take a minute or two."
    }
  }
};

export const ACCESSIBILITY_OPTIONS = {
  mobility: {
    title: { de: "Allgemein / Mobilität", en: "General / Mobility" },
    options: [
      { id: 'wheelchair-friendly', label: { de: 'Rollstuhlgerechte Wege', en: 'Wheelchair accessible paths' } },
      { id: 'low-stairs', label: { de: 'Wenig Treppensteigen', en: 'Low stairs' } },
      { id: 'assistance-animals', label: { de: 'Assistenztiere willkommen', en: 'Assistance animals welcome' } }
    ]
  },
  accommodation: {
    title: { de: "Unterkunft", en: "Accommodation" },
    options: [
      { id: 'step-free-entry', label: { de: 'Stufenloser Hoteleingang', en: 'Step-free hotel entry' } },
      { id: 'accessible-room', label: { de: 'Rollstuhlgerechtes Zimmer', en: 'Wheelchair accessible room' } },
      { id: 'walk-in-shower', label: { de: 'Ebenerdige Dusche', en: 'Walk-in shower' } },
      { id: 'elevator', label: { de: 'Aufzug', en: 'Elevator' } }
    ]
  },
  communication: {
    title: { de: "Kommunikation", en: "Communication" },
    options: [
      { id: 'simple-language', label: { de: 'Einfache Sprache', en: 'Simple language' } },
      { id: 'quiet-environments', label: { de: 'Ruhige Umgebung', en: 'Quiet environment' } }
    ]
  }
};
// --- END OF FILE 109 Zeilen ---
/**
 * src/data/help.ts
 * Enthält Hilfetexte für den Wizard und Barrierefreiheits-Optionen.
 */

import type { LocalizedContent } from '../core/types';

export const HELP_TEXTS: Record<string, { title: LocalizedContent; body: LocalizedContent }> = {
  'step1': {
    title: { de: "Hilfe zu: Das Reise-Cockpit", en: "Help: Travel Cockpit" },
    body: {
      de: "**Was ist hier zu tun?**\nDas Cockpit ist Ihre Kommandozentrale. Hier legen Sie das Fundament Ihrer Reise fest.\n\n**1. Der Reisetyp (Weiche):**\nEntscheiden Sie zuerst: Bleiben Sie an einem festen Ort (**Stationär**) oder machen Sie einen Roadtrip (**Rundreise**)? Diese Wahl ändert die angezeigten Eingabefelder.\n\n**2. Für Rundreisen:**\nSie können eine Liste von Orten angeben und der KI sagen, ob diese Liste 'Fix' ist (exakter Fahrplan) oder nur zur 'Inspiration' dient (KI füllt Lücken).\n\n**3. Flexibilität:**\nWenn Sie bei Anreise oder Zeitraum unsicher sind, wählen Sie die 'KI-Vorschlag'-Optionen. Das System wird Ihnen dann Empfehlungen machen.",
      en: "**What to do here?**\nThe cockpit is your command center. Here you lay the foundation for your trip.\n\n**1. Trip Type:**\nDecide first: Staying at one fixed place (**Stationary**) or doing a road trip (**Round Trip**)? This choice changes the input fields.\n\n**2. For Road Trips:**\nYou can list places and tell the AI if this list is 'Fixed' (exact schedule) or just for 'Inspiration' (AI fills gaps).\n\n**3. Flexibility:**\nIf unsure about arrival or dates, choose 'AI Suggestion'. The system will make recommendations."
    }
  },
  'step2': {
    title: { de: "Hilfe zu: Wer & Wie", en: "Help: Who & How" },
    body: {
      de: "**Was ist hier zu tun?**\nBeschreiben Sie, wer reist und welche grundlegenden Erwartungen Sie haben. Diese drei Einstellungen sind **globale Regeln** für die KI in allen Phasen:\n- **Reisetempo**: Definiert die Taktung für den **Tagesplaner (Phase 2)**.\n- **Preisniveau**: Steuert den **Food-Scout (Phase 3)** und die Hotelauswahl.\n- **Emotionale Stimmung**: Gibt dem **Sammler (Phase 1)** eine kreative Richtung vor.\n\n**Neu:** Geben Sie hier auch Ihre **Nationalität** an, damit die KI Visum-Infos prüfen kann.",
      en: "**What to do here?**\nDescribe who is traveling and your basic expectations. These three settings are **global rules** for the AI:\n- **Travel Pace**: Defines the timing for the **Day Planner (Phase 2)**.\n- **Budget Level**: Controls the **Food Scout (Phase 3)** and hotel selection.\n- **Emotional Vibe**: Gives the **Collector (Phase 1)** a creative direction.\n\n**New:** Also specify your **nationality** for visa checks."
    }
  },
  'step3': {
    title: { de: "Hilfe zu: Interessen & Vorlieben", en: "Help: Interests & Preferences" },
    body: {
      de: "**Was ist hier zu tun?**\nDas Herzstück Ihrer Planung. Wählen Sie Interessen, um der KI Suchaufträge zu geben.\n- **Tagesplan-Interessen**: Dies sind **aktive Themen** (z.B. Museum, Architektur), für die der **Sammler (Phase 1)** konkrete Orte finden soll.\n- **Anhang-Interessen**: Diese Themen (z.B. StadtInfo, Budget) erzeugen **keine Aktivitäten**, sondern Informations-Kapitel.\n\n**Tipp:** Klicken Sie auf das 'Bearbeiten'-Symbol einer Kachel, um der KI detaillierte Anweisungen zu geben.",
      en: "**What to do here?**\nThe heart of your planning. Select interests to give search tasks to the AI.\n- **Day Plan Interests**: These are **active topics** (e.g. Museum, Architecture) for which the **Collector (Phase 1)** finds specific places.\n- **Appendix Interests**: These topics (e.g. City Info, Budget) produce **no activities** but information chapters.\n\n**Tip:** Click the 'Edit' icon on a tile to give detailed instructions to the AI."
    }
  },
  'step4': {
    title: { de: "Hilfe zu: Feste Termine", en: "Help: Fixed Appointments" },
    body: {
      de: "**Was ist hier zu tun?**\nTragen Sie hier alle Termine ein, die unverrückbar sind – wie gebuchte Flüge, Konzertkarten oder Restaurant-Reservierungen.\n\n**Funktionsweise:**\nDiese Termine werden als **Ankerpunkte** in den Tagesplan integriert. Die KI plant das restliche Programm *um diese Termine herum*.\nNutzen Sie die Tab-Taste, um schnell neue Zeilen hinzuzufügen.",
      en: "**What to do here?**\nEnter all appointments that are immovable – like booked flights, concert tickets, or restaurant reservations.\n\n**How it works:**\nThese appointments serve as **anchors** in the daily plan. The AI plans the rest of the program *around these slots*.\nUse the Tab key to quickly add new lines."
    }
  },
  'step5': {
    title: { de: "Hilfe zu: Sonstiges & No-Gos", en: "Help: Misc & No-Gos" },
    body: {
      de: "**Was ist hier zu tun?**\nHier geben Sie der KI den letzten Feinschliff mit auf den Weg.\n\n**1. Wünsche & Anmerkungen:**\nErzählen Sie der KI frei heraus, was Ihnen noch wichtig ist (z.B. 'Wir lieben Fotografie', 'Bitte jeden Tag eine Kaffeepause', 'Wir sind Frühaufsteher').\n\n**2. No-Gos (Ausschlüsse):**\nDefinieren Sie rote Linien. Was soll auf keinen Fall passieren? (z.B. 'Keine Kirchenbesichtigungen', 'Nicht zu viel Laufen', 'Keine Meeresfrüchte').",
      en: "**What to do here?**\nGive the AI the final touches.\n\n**1. Wishes & Notes:**\nTell the AI freely what else is important to you (e.g. 'We love photography', 'Daily coffee break please', 'We are early risers').\n\n**2. No-Gos:**\nDefine red lines. What should absolutely not happen? (e.g. 'No church visits', 'Not too much walking', 'No seafood')."
    }
  },
  'step6': {
    title: { de: "Hilfe zu: Übersicht & Start", en: "Help: Review & Start" },
    body: {
      de: "**Was ist hier zu tun?**\nDies ist der letzte Check vor dem Start der Generierung.\n\n**Kontrolle:**\nÜberprüfen Sie alle Kacheln. Grüne Häkchen zeigen an, dass die Pflichtfelder ausgefüllt sind. Orange Warnzeichen weisen auf fehlende Daten hin.\n\n**Änderungen:**\nWenn Sie noch etwas anpassen möchten, klicken Sie einfach auf die entsprechende Kachel, um direkt zu dem Schritt zu springen.\n\n**Start:**\nWenn alles passt, klicken Sie unten rechts auf **'Weiter'** (oder 'Reise erstellen'), um die KI zu beauftragen.",
      en: "**What to do here?**\nThis is the final check before generation starts.\n\n**Check:**\nReview all tiles. Green checks indicate required fields are filled. Orange warnings indicate missing data.\n\n**Changes:**\nIf you want to adjust something, simply click on the corresponding tile to jump directly to that step.\n\n**Start:**\nIf everything looks good, click **'Next'** (or 'Create Trip') at the bottom right to commission the AI."
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
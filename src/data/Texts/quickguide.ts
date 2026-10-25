// 25.10.2026 13:12 - DOCS: Synced Quick Guide navigation & actions with CockpitHeader and ActionsMenu.
// 12.04.2026 14:35 - UX: Updated terminology (AI Workflows -> Reiseführer / Guide Chapters) for consistency.
// 18.03.2026 11:15 - DOCS: Updated terminology (Plan -> Tagebuch/Diary) to reflect the new Live-Tracker feature.
// 24.02.2026 12:30 - FIX: Added 'Expenses' explanation with [Wallet] icon to section 3 of the Quick Guide.
// 24.02.2026 11:10 - FEAT: Initial creation of the Quick Guide with icon placeholders.
// src/data/Texts/quickguide.ts

export const quickGuide = {
  de: {
    title: "Papatours Schnellstart-Anleitung",
    content: `### 1. Die Haupt-Navigation (Kopfleiste)
Wechsle zwischen den Ansichten und Direkt-Werkzeugen oben in der Leiste:

* **[Home] Home:** Zurück zum Start. Hier kannst du speichern oder neu starten.
* **[Edit3] Tagebuch:** Dein Dashboard, Routenplan & Live-Reisetagebuch.
* **[BookOpen] Guide:** Der Katalog aller Orte. Hier organisierst du Sehenswürdigkeiten, stellst die **Detailtiefe** der Texte ein und nutzt den **Planungsmodus** für Prioritäten.
* **[Info] Info:** Das Reise-Lexikon mit Stadtführern und Regional-Infos *(Tipp: Doppelklick öffnet die Experten-Einstellungen)*.
* **[Map] Karte:** Visualisiere deine Route und finde deinen Standort per GPS.
* **[Filter] Suche & Filter:** Filtere Orte live nach Kategorien, Besuchsstatus oder Suchbegriff.
* **[Wallet] Kasse:** Direktzugriff auf die Reisekasse (Ausgaben erfassen & Kosten aufteilen).
* **[Printer] Drucken:** Druckt die aktuelle Ansicht oder öffnet die Kartendruck-Vorschau.

### 2. Werkzeuge & Aktionen
Hinter dem **[Menu] Aktionen-Menü** oben rechts findest du mächtige Helfer:

* **[Zap] / [HelpCircle] Hilfe & Handbuch:** Schnellstart-Guide und das komplette Handbuch.
* **[FileInput] Daten & [Layout] Briefing:** Zurück zu den Eingaben (Wizard) oder zur Machbarkeitsanalyse (Chef-Planer).
* **[Map] Route:** Routen-Optionen und Etappen anpassen (bei Rundreisen).
* **[Sparkles] Reiseführer-Kapitel:** Erstelle gezielt einzelne Kapitel des Reiseführers nach.
* **[Zap] Ad-Hoc Food:** Schnelle Restaurantsuche in deiner direkten Umgebung.
* **[Globe] Google Maps Export:** Kopiere alle Orte für Google My Maps.
* **[Printer] PDF Report:** Erstelle ein maßgeschneidertes PDF deiner Planung inkl. Tagebuch.
* **[Save] / [Upload] Datentransfer:** Sichere deinen Stand als JSON-Datei oder lade/verschmelze (Merge) ein Projekt.

### 3. Orte & Interaktion
Nutze die Steuerung direkt an den Orten (SightCards):

* **[MapPin] Check-in:** Dokumentiere deinen Besuch für das Tagebuch.
* **[PenLine] Notiz:** Halte Erlebnisse oder Tipps fest.
* **[Wallet] Ausgaben:** Erfasse direkt Kosten (z.B. Eintritt) für diesen Ort.
* **[Plus] / [Minus] Details:** Reguliere, wie tief du in die Infos eintauchen willst.
* **Prioritäten:** Nutze **Fix**, **Prio 1/2** oder **Ignore**, um den Tagesplaner zu steuern.`
  },
  en: {
    title: "Papatours Quick Start Guide",
    content: `### 1. Main Navigation (Header Bar)
Switch between views and direct tools in the top bar:

* **[Home] Home:** Back to start. Save your progress or start a new trip here.
* **[Edit3] Diary:** Your dashboard, itinerary & live travel diary.
* **[BookOpen] Guide:** Catalog of all places. Organize sights, adjust **text detail depth**, and use the **planning mode** for priorities.
* **[Info] Info:** The travel encyclopedia with city guides and regional info *(Tip: Double-click opens Expert Settings)*.
* **[Map] Map:** Visualize your route and find your location via GPS.
* **[Filter] Search & Filter:** Filter places live by category, visited status, or keyword.
* **[Wallet] Finance:** Direct access to Trip Finance (record expenses & split costs).
* **[Printer] Print:** Prints the current view or opens the map print preview.

### 2. Tools & Actions
Find powerful helpers behind the **[Menu] Actions Menu** in the top right:

* **[Zap] / [HelpCircle] Help & Manual:** Quick Start Guide and the complete manual.
* **[FileInput] Data & [Layout] Briefing:** Back to your inputs (Wizard) or the feasibility analysis (Chief Planner).
* **[Map] Route:** Adjust route options and stages (for road trips).
* **[Sparkles] Guide Chapters:** Specifically generate individual guide chapters.
* **[Zap] Ad-Hoc Food:** Quick restaurant search in your immediate vicinity.
* **[Globe] Google Maps Export:** Copy all places for Google My Maps.
* **[Printer] PDF Report:** Create a customized PDF of your plan incl. diary.
* **[Save] / [Upload] Data Transfer:** Backup your status as a JSON file or load/merge a project.

### 3. Places & Interaction
Use the controls directly on the places (SightCards):

* **[MapPin] Check-in:** Document your visit for the diary.
* **[PenLine] Note:** Record experiences or tips.
* **[Wallet] Expenses:** Record costs (e.g., entrance fees) directly for this place.
* **[Plus] / [Minus] Details:** Regulate how deep you want to dive into the info.
* **Planning:** Use **Fix**, **Prio 1/2**, or **Ignore** to control the itinerary planner.`
  }
};
// --- END OF FILE 80 Zeilen ---
// 22.02.2026 14:15 - DOCS: Added Trip Finance to the User Manual and provided full English translation.
// 20.02.2026 22:00 - DOCS: Added descriptions for the Actions Menu and the individual AI Workflows to the User Manual.
// src/data/Texts/description.ts
/**
 * Inhalt: Programm-Beschreibung / Info / Handbuch
 */

export const description = {
  de: {
    title: "Papatours Handbuch",
    content: `**Willkommen bei Papatours – Ihrem persönlichen KI-Reiseplaner und digitalen Tagebuch!**

Dieses Handbuch erklärt Ihnen, wie Sie die App optimal nutzen: Von der ersten Idee bis zu den Erinnerungen während der Reise.

---

### Phase 1: Die Planung (Der Assistent)

Wenn Sie eine neue Reise starten, führt Sie ein Assistent (Wizard) durch 5 einfache Schritte:
1. **Cockpit:** Wohin geht es? (Stationär im Hotel oder als Rundreise).
2. **Wer & Wie:** Wer reist mit und wie ist die allgemeine Stimmung (z.B. entspannt oder sportlich)?
3. **Interessen:** Was machen Sie gerne? (z.B. Museen, Wandern, Kulinarik).
4. **Termine:** Wann reisen Sie und gibt es schon feste Termine (z.B. ein gebuchter Flug)?
5. **Start:** Hier fassen wir alles zusammen. Ein Klick auf "Generieren" weckt die KI auf!

*Tipp: Die KI plant die Route, sucht passende Sehenswürdigkeiten, checkt Öffnungszeiten und schreibt einen kompletten Reiseführer für Sie.*

---

### Phase 2: Die 4 Hauptansichten (Ihr Reisebegleiter)

Sobald die KI fertig ist, verwandelt sich die App in Ihren interaktiven Reisebegleiter. Oben in der Menüleiste finden Sie die vier wichtigsten Schalter:

📝 **1. Plan (Das Dashboard & Tagebuch)**
Hier finden Sie die Zusammenfassung Ihrer Reise, Ihre Routenplanung und (ganz wichtig) Ihr **Live-Reisetagebuch**. 
* **Vor Ort:** Nutzen Sie den Button "Eigener Eintrag", um spontane Erlebnisse samt Ihrem aktuellen GPS-Standort festzuhalten. Orte, die Sie besuchen und einchecken, tauchen hier automatisch chronologisch auf.

📖 **2. Guide (Der Reiseführer & Katalog)**
Dies ist das Herzstück. Hier finden Sie alle von der KI gesammelten Orte (Sehenswürdigkeiten, Restaurants, Natur).
* **Organisieren:** Sortieren Sie die Liste nach Kategorien, Alphabet oder nach Touren.
* **Planen:** Nutzen Sie die Prioritäts-Buttons ("Fix", "Prio 1", "Prio 2"), um Orte in Ihren Kalender zu schieben oder unpassende Dinge auszublenden ("Ignore").
* **Notizen:** Klicken Sie auf einen Ort, um eine eigene Notiz für Ihr Tagebuch hinzuzufügen oder "einzuchecken".

🌍 **3. Karte (Die visuelle Übersicht)**
Sehen Sie alle Orte übersichtlich auf der Landkarte. Die Farben entsprechen den jeweiligen Kategorien (z.B. Grün für Natur, Rot für Kultur).
* **Wo bin ich?** Klicken Sie auf das kleine Fadenkreuz-Symbol oben rechts auf der Karte. Die App ortet Sie per GPS und zeigt Ihnen mit einem blauen Punkt, wo Sie gerade stehen.

ℹ️ **4. Info (Das Lexikon)**
Hier finden Sie alle allgemeinen Texte, die nicht an eine direkte Koordinate gebunden sind:
* A-Z Stadtführer für alle besuchten Orte.
* Wissenswertes zur Region, Einreise- und Mautbestimmungen.
* Eine Budget-Schätzung für Ihre Reise.

---

### Phase 3: Das Aktionen-Menü (Ihre Werkzeuge)

Unter dem Menü-Punkt **"Aktionen"** (oben rechts) finden Sie mächtige Helfer und Werkzeuge, um Ihre Reise nachträglich anzupassen:

* 💸 **Reisekasse:** Ihr smartes Finanz-Tool. Erfassen Sie Ausgaben direkt im Urlaub, splitten Sie Kosten exakt auf Mitreisende auf und lassen Sie Papatours mit tagesaktuellen Bankenkursen am Ende berechnen, wer wem wie viel schuldet.
* 🤖 **KI-Workflows:** Das Kontrollzentrum der App (siehe Phase 4). Hier können Sie einzelne KI-Agenten gezielt neu starten.
* 📋 **Daten:** Bringt Sie zurück zum Start-Assistenten, falls Sie grundlegende Dinge (z.B. Reisedatum oder Interessen) ändern möchten.
* 🏛️ **Fundament:** Zeigt Ihnen die strategische Machbarkeitsprüfung der KI (Chef-Planer).
* 🗺️ **Route:** Öffnet den Routenplaner (nur bei Rundreisen relevant), um Etappen anzupassen.
* 🍽️ **Ad-Hoc Food:** Sie haben spontan Hunger? Dieses Tool nutzt Ihren aktuellen GPS-Standort und sucht sofort nach den besten Restaurants in Gehweite.
* 🖨️ **Drucken / PDF:** Generiert ein wunderschönes, tintensparendes Dokument Ihrer Reise (inkl. Reisetagebuch).
* 📍 **Google Maps Export:** Kopiert alle Orte, um sie direkt in "Google My Maps" einzufügen.
* 💾 **Speichern & Laden:** Ihre Reise wird automatisch (Autosave) gesichert. Hier können Sie die Reise aber als Datei herunterladen, um sie als Backup am PC zu speichern oder an Mitreisende zu senden.

---

### Phase 4: Die KI-Spezialisten (Workflows)

Im Menüpunkt "KI-Workflows" können Sie unserem Team aus digitalen Spezialisten bei der Arbeit zusehen oder ihnen gezielt neue Aufträge geben. Das Team besteht aus folgenden Experten:

* 👨‍💼 **Chef-Planer:** Analysiert Ihre Grundidee auf Machbarkeit, Wetterbedingungen und Logistik.
* 🕵️ **Sammler (Orte & Sehenswürdigkeiten):** Durchkämmt die Region nach den besten Orten.
* 🔍 **Anreicherer (Fakten-Check):** Nimmt die gefundenen Orte und recherchiert die harten Fakten: Adressen, GPS-Koordinaten, offizielle Websites und Öffnungszeiten.
* 👨‍🍳 **Food-Scout & Enricher:** Der Feinschmecker. Sucht erstklassige Restaurants, Cafés und Bars.
* 🛣️ **Routen-Architekt:** (Nur bei Rundreisen). Berechnet die beste Reihenfolge der Stopps.
* 🗺️ **Tour-Guide (Clustering):** Sortiert alle Sehenswürdigkeiten in sinnvolle, geografisch zusammenhängende Tages-Touren.
* ✍️ **Chefredakteur:** Schreibt inspirierende, detaillierte Texte und Hintergründe für Ihre Highlights.
* 📚 **Info-Autor:** Verfasst die Texte für den "Info"-Tab (A-Z Stadtführer).
* 💡 **Ideen-Scout (Sondertage):** Der Joker. Er liefert kreative Alternativ-Pläne für Regentage.

**Papatours als App auf dem Smartphone (PWA):**
Sie müssen nichts aus dem App-Store herunterladen! Öffnen Sie Papatours einfach im Safari (iPhone) oder Chrome (Android) und tippen Sie auf "Zum Home-Bildschirm hinzufügen". Schon verhält sich Papatours wie eine echte App und funktioniert mit Ihren gespeicherten Daten sogar offline!

Viel Spaß beim Planen und Erleben Ihrer nächsten Traumreise!`
  },
  en: {
    title: "Papatours Manual",
    content: `**Welcome to Papatours – your personal AI travel planner and digital diary!**

This manual explains how to get the most out of the app: From your initial idea to capturing memories during your trip.

---

### Phase 1: Planning (The Wizard)

When you start a new trip, an assistant (Wizard) guides you through 5 simple steps:
1. **Cockpit:** Where are you going? (Stationary at a hotel or a road trip).
2. **Who & How:** Who is traveling and what is the general vibe (e.g., relaxed or active)?
3. **Interests:** What do you enjoy doing? (e.g., museums, hiking, culinary arts).
4. **Dates:** When are you traveling and are there fixed appointments (e.g., a booked flight)?
5. **Start:** Here we summarize everything. One click on "Generate" wakes up the AI!

*Tip: The AI will plan the route, find suitable sights, check opening hours, and write a complete travel guide for you.*

---

### Phase 2: The 4 Main Views (Your Travel Companion)

Once the AI is finished, the app transforms into your interactive travel companion. You'll find the four main tabs in the top menu bar:

📝 **1. Plan (Dashboard & Diary)**
Here you will find the summary of your trip, your route planning, and (importantly) your **Live Travel Diary**. 
* **On Location:** Use the "Custom Entry" button to capture spontaneous experiences along with your current GPS location. Places you visit and check into will automatically appear here chronologically.

📖 **2. Guide (Travel Guide & Catalog)**
This is the core. Here you will find all the places collected by the AI (sights, restaurants, nature).
* **Organize:** Sort the list by categories, alphabetically, or by tours.
* **Plan:** Use the priority buttons ("Fix", "Prio 1", "Prio 2") to move places into your calendar or hide unsuitable ones ("Ignore").
* **Notes:** Click on a place to add a personal note for your diary or to "check in".

🌍 **3. Map (Visual Overview)**
See all places clearly on the map. The colors correspond to their respective categories (e.g., green for nature, red for culture).
* **Where am I?** Click the small crosshair icon in the top right corner of the map. The app locates you via GPS and shows you exactly where you are with a blue dot.

ℹ️ **4. Info (The Encyclopedia)**
Here you will find all general texts that are not tied to a direct coordinate:
* A-Z City Guide for all visited locations.
* Useful facts about the region, entry, and toll regulations.
* A budget estimate for your trip.

---

### Phase 3: The Actions Menu (Your Tools)

Under the **"Actions"** menu (top right), you'll find powerful helpers and tools to adjust your trip later:

* 💸 **Trip Finance:** Your smart financial tool. Record expenses directly on vacation, split costs exactly among travelers, and let Papatours calculate who owes whom how much at the end of the trip using daily bank exchange rates.
* 🤖 **AI Workflows:** The control center of the app (see Phase 4). Here you can specifically restart individual AI agents.
* 📋 **Data:** Takes you back to the starting Wizard if you want to change basic things (e.g., travel dates or interests).
* 🏛️ **Foundation:** Shows you the AI's strategic feasibility check (Chief Planner).
* 🗺️ **Route:** Opens the route planner (only relevant for road trips) to adjust stages.
* 🍽️ **Ad-Hoc Food:** Suddenly hungry? This tool uses your current GPS location to immediately search for the best restaurants within walking distance.
* 🖨️ **Print / PDF:** Generates a beautiful, ink-saving document of your trip (incl. travel diary).
* 📍 **Google Maps Export:** Copies all places to paste directly into "Google My Maps".
* 💾 **Save & Load:** Your trip is automatically saved (autosave). However, you can download the trip as a file here to keep it as a backup on your PC or send it to fellow travelers.

---

### Phase 4: The AI Specialists (Workflows)

In the "AI Workflows" menu, you can watch our team of digital specialists at work or give them specific new assignments. The team consists of the following experts:

* 👨‍💼 **Chief Planner:** Analyzes your basic idea for feasibility, weather conditions, and logistics.
* 🕵️ **Collector (Places & Sights):** Combs the region for the best spots.
* 🔍 **Enricher (Fact-Check):** Takes the found places and researches hard facts: addresses, GPS coordinates, official websites, and opening hours.
* 👨‍🍳 **Food Scout & Enricher:** The gourmet. Searches for first-class restaurants, cafes, and bars.
* 🛣️ **Route Architect:** (For road trips only). Calculates the best order of stops.
* 🗺️ **Tour Guide (Clustering):** Sorts all sights into logical, geographically coherent daily tours.
* ✍️ **Editor-in-Chief:** Writes inspiring, detailed texts and backgrounds for your highlights.
* 📚 **Info Author:** Writes the texts for the "Info" tab (A-Z City Guides).
* 💡 **Idea Scout (Special Days):** The wildcard. Provides creative alternative plans for rainy days.

**Papatours as a Smartphone App (PWA):**
You don't need to download anything from the App Store! Just open Papatours in Safari (iPhone) or Chrome (Android) and tap "Add to Home Screen". Papatours will instantly behave like a real app and even works offline with your saved data!

Enjoy planning and experiencing your next dream trip!`
  }
};
// --- END OF FILE 137 Zeilen ---
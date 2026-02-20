// 20.02.2026 22:00 - DOCS: Added descriptions for the Actions Menu and the individual AI Workflows to the User Manual.
// 20.02.2026 21:40 - DOCS: Rewrote description to serve as a practical User Manual / Onboarding Guide.
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
* **Vor Ort:** Nutzen Sie den Button "Eigener Eintrag", um spontane Erlebnisse samt Ihrem aktuellen GPS-Standort festzuhalten. Orte, die Sie besuchen, tauchen hier automatisch chronologisch auf.

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

Im Menüpunkt "KI-Workflows" können Sie unserem Team aus digitalen Spezialisten bei der Arbeit zusehen oder ihnen gezielt neue Aufträge geben (z.B. wenn Sie nur nach neuen Restaurants suchen möchten, ohne den Rest zu verändern). 

Das Team besteht aus folgenden Experten:

* 👨‍💼 **Chef-Planer:** Analysiert Ihre Grundidee auf Machbarkeit, Wetterbedingungen und Logistik. Erstellt die Strategie für alle anderen.
* 🕵️ **Sammler (Orte & Sehenswürdigkeiten):** Durchkämmt die Region nach den besten Orten, die exakt zu Ihren gewählten Interessen passen.
* 🔍 **Anreicherer (Fakten-Check):** Nimmt die gefundenen Orte und recherchiert die harten Fakten: Adressen, GPS-Koordinaten, offizielle Websites und Öffnungszeiten.
* 👨‍🍳 **Food-Scout & Enricher:** Der Feinschmecker. Sucht erstklassige Restaurants, Cafés und Bars und gleicht diese mit bekannten Restaurant-Führern ab.
* 🛣️ **Routen-Architekt:** (Nur bei Rundreisen). Berechnet die beste Reihenfolge der Stopps und optimiert die Fahrzeiten.
* 🗺️ **Tour-Guide (Clustering):** Sortiert alle Sehenswürdigkeiten in sinnvolle, geografisch zusammenhängende Tages-Touren (z.B. "Altstadt-Spaziergang" oder "Natur-Ausflug").
* ✍️ **Chefredakteur:** Schreibt inspirierende, detaillierte Texte und Hintergründe für Ihre absoluten Top-Highlights.
* 📚 **Info-Autor:** Verfasst die Texte für den "Info"-Tab. Er schreibt maßgeschneiderte A-Z Stadtführer für jeden Ort, den Sie besuchen, sowie länderspezifische Hinweise (Maut, Regeln).
* 💡 **Ideen-Scout (Sondertage):** Der Joker. Er liefert kreative Alternativ-Pläne für Regentage oder spontane Planänderungen.

**Papatours als App auf dem Smartphone (PWA):**
Sie müssen nichts aus dem App-Store herunterladen! Öffnen Sie Papatours einfach im Safari (iPhone) oder Chrome (Android) und tippen Sie auf "Zum Home-Bildschirm hinzufügen". Schon verhält sich Papatours wie eine echte App und funktioniert mit Ihren gespeicherten Daten sogar offline!

Viel Spaß beim Planen und Erleben Ihrer nächsten Traumreise!`
  },
  en: {
    title: "Program Information",
    content: "Content available in German."
  }
};
// --- END OF FILE 108 Zeilen ---
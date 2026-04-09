// 09.04.2026 16:35 - LEGAL: Refined terms based on IT-Law audit (Added Vercel Hosting-Logs exception, Kardinalpflichten-Haftung, Google Privacy Links).
// 09.04.2026 16:20 - LEGAL: Updated terms to reflect "Privacy by Design", Serverless PWA Architecture.
/**
 * src/data/texts/terms.ts
 * Inhalt: Nutzungsbedingungen (Terms of Service)
 */

export const terms = {
  de: {
    title: "Nutzungsbedingungen",
    content: `### Allgemeine Nutzungsbedingungen für Papa-Tours

**I. Einleitung und Geltungsbereich**

Das Programm „Papa-Tours“ stellt eine innovative Softwareanwendung dar, die darauf abzielt, Nutzern bei der Erstellung individueller Reisepläne zu assistieren.
Es verarbeitet hierfür Nutzereingaben mittels künstlicher Intelligenz, insbesondere durch die Integration der Google Gemini Pro API.
Die Funktion des Programms ist es, als unterstützendes Werkzeug und Assistent für die Reiseplanung zu dienen, indem es auf Basis der bereitgestellten Informationen maßgeschneiderte Vorschläge generiert.
Diese Beschreibung des Vertragsgegenstandes bildet die Grundlage für das Verständnis der nachfolgenden Allgemeinen Nutzungsbedingungen (AGB).
Diese Allgemeinen Nutzungsbedingungen (im Folgenden „AGB“) regeln die Nutzung des von Max Ertl, max.ertl@web.de (im Folgenden „Anbieter“) angebotenen Programms „Papa-Tours“ (im Folgenden „Programm“).
Sie definieren die Rechte und Pflichten zwischen dem Nutzer und dem Anbieter für alle Interaktionen, die über das Programm erfolgen.

**II. Nutzung des Programms und des API-Keys**

**2.1. Akzeptanz der Google Gemini API-Bedingungen**
Die Nutzung des Programms setzt die Akzeptanz und Einhaltung der Nutzungsbedingungen (AGBs) der Google Gemini API voraus.
Diese sind unter https://ai.google.dev/gemini-api/terms einsehbar und vom Nutzer eigenverantwortlich zu beachten.
Der Anbieter hat keinen Einfluss auf die AGBs von Google und ist für deren Einhaltung durch den Nutzer nicht verantwortlich.

**2.2. Verantwortung für den API-Key**
Der Nutzer ist für die Beschaffung, Aktivierung und sichere Aufbewahrung seines persönlichen API-Keys für die Google Gemini API selbst verantwortlich.
Jegliche Nutzung des API-Keys, ob durch den Nutzer oder Dritte, liegt in der alleinigen Verantwortung des Nutzers.

**2.3. Zulässige Nutzung und Altersanforderungen**
Der Nutzer verpflichtet sich, das Programm nur im Rahmen der geltenden Gesetze und der Nutzungsbedingungen der Google Gemini API zu verwenden.
Gemäß den Vorgaben von Google müssen Nutzer in der Regel mindestens 18 Jahre alt sein, um die Google Gemini API über das Programm zu nutzen.
Die Nutzung für medizinische Beratung, klinische Praxis oder in irgendeiner Weise, die von einer Medizinprodukte-Regulierungsbehörde überwacht wird oder deren Genehmigung erfordert, ist ebenfalls untersagt.
Zudem ist die Nutzung der Dienste zur Entwicklung von Modellen, die mit den Google-Diensten konkurrieren, untersagt.

**III. Haftung**

**3.1. Allgemeine Haftungsbegrenzung des Anbieters**
Das Programm wird dem Nutzer „wie besehen“ (as is) zur Verfügung gestellt.
Der Anbieter übernimmt keine Gewährleistung für die ständige Verfügbarkeit, Richtigkeit, Vollständigkeit oder Aktualität der durch das Programm generierten Inhalte oder für die fehlerfreie Funktion des Programms.
Der Anbieter haftet nicht für Schäden jedweder Art, die aus der Nutzung oder Nichtnutzung des Programms entstehen, mit Ausnahme von Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, sowie Schäden, die auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung des Anbieters beruhen.
Bei der leicht fahrlässigen Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt. Im Übrigen ist die Haftung bei leichter Fahrlässigkeit ausgeschlossen.

**3.2. Haftung für KI-generierte Inhalte und Nutzerverantwortung**
Der Nutzer ist für die Überprüfung der von dem Programm generierten Inhalte auf Richtigkeit, Vollständigkeit und Angemessenheit selbst verantwortlich.
Eine Haftung für Schäden, die durch das Vertrauen auf solche Inhalte entstehen, ist ausgeschlossen.
Die generierten Inhalte sind experimenteller Natur, können unzutreffend sein und stellen keine professionelle Beratung dar.

**3.3. Haftung für Drittanbieter-API (Google Gemini API)**
Die Haftung des Anbieters ist ausgeschlossen für Probleme oder Schäden, die direkt oder indirekt auf die Funktionsweise, Verfügbarkeit oder Änderungen der Google Gemini API zurückzuführen sind.

**IV. Datenschutz**

**4.1. Privacy by Design & Lokale Datenverarbeitung (Client-Side PWA)**
Das Programm ist konsequent nach dem Prinzip „Privacy by Design“ als Progressive Web App (PWA) ohne eigene Server-Infrastruktur konzipiert. Der Anbieter selbst erhebt, speichert oder verarbeitet **keinerlei** personenbezogene Inhaltsdaten, API-Keys oder eingegebene Reiseinformationen des Nutzers. Sämtliche Eingaben, Konfigurationen und generierten Reisepläne verbleiben ausschließlich lokal auf dem Endgerät des Nutzers (im lokalen Speicher des Browsers). 
Ausgenommen hiervon sind rein technisch notwendige Verbindungsdaten (z. B. IP-Adressen), die beim Aufruf der Web-App zwangsläufig durch den Hosting-Provider (z. B. Vercel) zur Auslieferung der Applikation und zur Gewährleistung der Systemsicherheit temporär in Server-Logs erfasst werden.

**4.2. Datenverarbeitung durch Google Gemini API**
Das Programm übermittelt die vom Nutzer eingegebenen Daten (Prompts) direkt vom Endgerät an die Google Gemini API.
Google verarbeitet diese Daten gemäß seinen eigenen Datenschutzbestimmungen (einsehbar unter https://policies.google.com/privacy und den Gemini API Additional Terms of Service).
Nutzer sollten keine vertraulichen oder sensiblen personenbezogenen Informationen in das Programm eingeben.

**4.3. Betroffenenrechte**
Nutzer haben im Hinblick auf ihre personenbezogenen Daten die Rechte gemäß der DSGVO (Auskunft, Berichtigung, Löschung, etc.).
Da der Anbieter selbst keine Inhaltsdaten verarbeitet (siehe 4.1), können sich Auskunftsersuchen an den Anbieter nur auf die technische Bereitstellung beziehen. Die Löschung der Reisedaten obliegt der alleinigen Kontrolle des Nutzers (z. B. durch Löschen des Browser-Caches). Auskunfts- oder Löschbegehren bezüglich der durch die KI verarbeiteten Daten sind direkt an Google zu richten.

**V. Geistiges Eigentum und Nutzungsrechte**

**5.1. Urheberschaft an KI-generierten Inhalten**
Nach aktuellem deutschem Recht entsteht an rein maschinell (durch KI) erstellten Inhalten in der Regel kein Urheberrecht; sie gelten als gemeinfrei. Greift der Nutzer durch gezielte und kreative Eingaben (Prompts, Notizen) wesentlich in den Entstehungsprozess ein, kann er als Urheber der so geschaffenen Werke gelten.

**5.2. Verzicht auf Nutzungsrechte durch den Anbieter**
Konform mit dem „Privacy by Design“-Ansatz operiert die Software rein lokal. Da der Anbieter technisch keinen Zugriff auf die Inhaltsdaten hat, erhebt er **keinerlei Ansprüche, Eigentums- oder Nutzungsrechte** an den eingegebenen Daten oder den generierten Reiseplänen. Der Nutzer kann die mit Papa-Tours erstellten Reisepläne für private und kommerzielle Zwecke frei verwenden, sofern dies nicht gegen die AGB von Google verstößt.

**5.3. Haftung für Rechtsverletzungen durch Nutzer**
Der Nutzer ist allein dafür verantwortlich, dass die von ihm in die App eingegebenen Daten keine Urheberrechte oder sonstigen Rechte Dritter verletzen. Der Nutzer stellt den Anbieter von sämtlichen Ansprüchen Dritter frei, die auf einer vertragswidrigen oder rechtswidrigen Nutzung der App durch den Nutzer beruhen.

**VI. Änderungen der Nutzungsbedingungen**

Der Anbieter behält sich vor, diese AGB jederzeit mit Wirkung für die Zukunft zu ändern.

**VII. Vertragslaufzeit und Kündigung**

Der Nutzer kann die Nutzung des Programms jederzeit beenden (z.B. durch Löschen des Browser-Caches).
Der Anbieter kann die Bereitstellung des Programms ebenfalls jederzeit einstellen.

**VIII. Schlussbestimmungen**

Es gilt das Recht der Bundesrepublik Deutschland.
Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Gültigkeit der übrigen Bestimmungen unberührt.`
  },
  en: {
    title: "Terms of Service",
    content: "Content available in German."
  }
};
// --- END OF FILE ---
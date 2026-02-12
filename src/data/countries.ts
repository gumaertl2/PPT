// 12.02.2026 22:15 - FEAT: GUIDE SEARCH TERMS (DACH).
// - Added 'searchTerms' for precise Inverted Search.
// src/data/countries.ts

export const metadata = {
    lastUpdated: "2026-02-12T22:15:00.000Z"
};

export interface GuideDef {
    name: string;
    searchUrl: string;
    searchTerms?: string[]; // Keywords for site-search validation
}

// SINGLE SOURCE OF TRUTH - SORTED BY COUNTRY
export const countryGuideConfig: Record<string, GuideDef[]> = {
    // --- DACH & ZENTRALEUROPA ---
    "Deutschland": [
        { 
            name: "Michelin", 
            searchUrl: "https://guide.michelin.com/de/de/restaurants", 
            searchTerms: ["Bib Gourmand", "Stern", "MICHELIN Auswahl", "Grüner Stern"] 
        },
        { 
            name: "Gault&Millau", 
            searchUrl: "https://henris-edition.com/suche/",
            searchTerms: ["Haube", "Punkte", "Empfehlung"] 
        },
        { 
            name: "Feinschmecker", 
            searchUrl: "https://www.feinschmecker.de/restaurant-guide",
            searchTerms: ["Die besten Restaurants", "F", "FF", "FFF"] 
        },
        { 
            name: "Varta", 
            searchUrl: "https://www.varta-guide.de/restaurant-suche",
            searchTerms: ["Varta-Tipp", "Diamanten", "Varta-Führer"] 
        },
        { 
            name: "Slow Food", 
            searchUrl: "https://www.slowfood.de/genussfuehrer",
            searchTerms: ["Genussführer", "Schnecke"] 
        },
        { 
            name: "Gusto", 
            searchUrl: "https://www.gusto-online.de/",
            searchTerms: ["Pfannen", "Gusto"] 
        },
        {
            name: "Süddeutsche Zeitung",
            searchUrl: "https://sz-magazin.sueddeutsche.de/kostprobe",
            searchTerms: ["Kostprobe", "Tipp", "Empfehlung"]
        }
    ],
    "Österreich": [
        { 
            name: "Falstaff", 
            searchUrl: "https://www.falstaff.com/at/restaurants",
            searchTerms: ["Gabel", "Punkte", "Falstaff"] 
        },
        { 
            name: "Gault&Millau", 
            searchUrl: "https://www.gaultmillau.at/restaurantguide",
            searchTerms: ["Haube", "Punkte"] 
        },
        { 
            name: "A la Carte", 
            searchUrl: "https://www.alacarte.at/",
            searchTerms: ["Sterne", "Punkte", "A la Carte"] 
        },
        { 
            name: "Slow Food", 
            searchUrl: "https://www.slowfood.com",
            searchTerms: ["Slow Food", "Empfehlung"] 
        } 
    ],
    "Schweiz": [
        { 
            name: "Gault&Millau", 
            searchUrl: "https://www.gaultmillau.ch/restaurants",
            searchTerms: ["Haube", "Punkte"] 
        },
        { 
            name: "Michelin", 
            searchUrl: "https://guide.michelin.com/ch/de/restaurants",
            searchTerms: ["Bib Gourmand", "Stern", "Auswahl"] 
        },
        { 
            name: "Guide Bleu", 
            searchUrl: "https://www.guide-bleu.ch/",
            searchTerms: ["Guide Bleu", "Empfehlung"] 
        },
        { 
            name: "Falstaff", 
            searchUrl: "https://www.falstaff.com/ch/restaurants",
            searchTerms: ["Gabel", "Punkte"] 
        }
    ],
    
    // --- Rest remains with basic config (Name + URL) ---
    "Polen": [
        { name: "Gault&Millau", searchUrl: "https://www.gaultmillau.com" }, 
        { name: "Michelin", searchUrl: "https://guide.michelin.com/pl/en/restaurants" },
        { name: "Poland 100 Best", searchUrl: "https://poland100best.pl/" }
    ],
    "Tschechien": [
        { name: "Gastromapa Lukáše Hejlíka", searchUrl: "https://gastromapa.hejlik.cz/" },
        { name: "Maurer's Grand Restaurant Selection", searchUrl: "https://www.grand-restaurant.cz/" },
        { name: "Gault&Millau", searchUrl: "https://www.gaultmillau.com" },
        { name: "Michelin", searchUrl: "https://guide.michelin.com/cz/en/restaurants" }
    ],
    "Ungarn": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/hu/en/restaurants" },
        { name: "Dining Guide", searchUrl: "https://diningguide.hu/" }
    ],
    "Italien": [
        { name: "Gambero Rosso", searchUrl: "https://www.gamberorosso.it/ristoranti/" },
        { name: "Slow Food (Osterie d'Italia)", searchUrl: "https://www.slowfood.it/osteria-ditalia-subs/" },
        { name: "Michelin", searchUrl: "https://guide.michelin.com/it/it/ristoranti" },
        { name: "L'Espresso", searchUrl: "https://guide.espresso.repubblica.it/" }
    ],
    "Frankreich": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/fr/fr/restaurants" },
        { name: "Gault&Millau", searchUrl: "https://fr.gaultmillau.com/s" },
        { name: "Le Fooding", searchUrl: "https://lefooding.com/search/restaurant" },
        { name: "La Liste", searchUrl: "https://www.laliste.com/en/" }
    ],
    "Spanien": [
        { name: "Repsol (Soles)", searchUrl: "https://www.guiarepsol.com/es/comer/" },
        { name: "Michelin", searchUrl: "https://guide.michelin.com/es/es/restaurantes" },
        { name: "Macarfi", searchUrl: "https://www.macarfi.com/" }
    ],
    "Portugal": [
        { name: "Boa Cama Boa Mesa", searchUrl: "https://boacamaboamesa.expresso.pt/" },
        { name: "Michelin", searchUrl: "https://guide.michelin.com/pt/pt/restaurantes" }
    ],
    "Griechenland": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/gr/en/restaurants" },
        { name: "FNL Guide", searchUrl: "https://www.fnl-guide.com/" },
        { name: "Greek Cuisine Awards", searchUrl: "https://www.athinorama.gr/restaurant/awards/" }
    ],
    "Kroatien": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/hr/en/restaurants" },
        { name: "Gault&Millau", searchUrl: "https://hr.gaultmillau.com/" },
        { name: "Dobri restorani", searchUrl: "https://dobrahrana.jutarnji.hr/dobri-restorani/" }
    ],
    "Japan": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/jp/en/restaurants" },
        { name: "Tabelog", searchUrl: "https://tabelog.com/en/rst/rstlst/" },
        { name: "Asia's 50 Best", searchUrl: "https://www.theworlds50best.com/asia/en/list/1-50" }
    ],
    "Thailand": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/th/en/restaurants" },
        { name: "Wongnai Users' Choice", searchUrl: "https://www.wongnai.com/listings/users-choice" },
        { name: "BK Magazine Top Tables", searchUrl: "https://bk.asia-city.com/restaurants/top-tables" },
        { name: "Asia's 50 Best", searchUrl: "https://www.theworlds50best.com/asia/en/list/1-50" }
    ],
    "Singapur": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/sg/en/restaurants" },
        { name: "Burpple", searchUrl: "https://www.burpple.com/sg" },
        { name: "Asia's 50 Best", searchUrl: "https://www.theworlds50best.com/asia/en/list/1-50" }
    ],
    "Vietnam": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/vn/en/restaurants" },
        { name: "VietnamMM", searchUrl: "https://www.foody.vn/" },
        { name: "Asia's 50 Best", searchUrl: "https://www.theworlds50best.com/asia/en/list/1-50" }
    ],
    "Sri Lanka": [
        { name: "Yamu.lk", searchUrl: "https://www.yamu.lk/" },
        { name: "Pulse.lk", searchUrl: "https://www.pulse.lk/" },
        { name: "Asia's 50 Best", searchUrl: "https://www.theworlds50best.com/asia/en/list/1-50" }
    ],
    "USA": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/us/en/restaurants" },
        { name: "James Beard Foundation", searchUrl: "https://www.jamesbeard.org/awards" },
        { name: "Zagat", searchUrl: "https://www.zagat.com/" },
        { name: "The Infatuation", searchUrl: "https://www.theinfatuation.com/" },
        { name: "Eater", searchUrl: "https://www.eater.com/" }
    ],
    "Kanada": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/ca/en/restaurants" },
        { name: "Canada's 100 Best", searchUrl: "https://canadas100best.com/" },
        { name: "En Route", searchUrl: "https://enroute.aircanada.com/en/restaurants/" }
    ],
    "Australien": [
        { name: "Good Food Guide", searchUrl: "https://www.goodfood.com.au/eat-out/good-food-guide" },
        { name: "Gourmet Traveller", searchUrl: "https://www.gourmettraveller.com.au/dining-out/restaurant-guide" },
        { name: "Australian Good Food & Travel Guide", searchUrl: "https://www.agfg.com.au/" }
    ],
    "Neuseeland": [
        { name: "Cuisine Good Food Awards", searchUrl: "https://www.cuisine.co.nz/good-food-awards/" },
        { name: "Metro Top 50", searchUrl: "https://www.metro.co.nz/food/top-50-restaurants" }
    ],
    "Südafrika": [
        { name: "Eat Out Awards", searchUrl: "https://eatout.co.za/" },
        { name: "Rossouw’s Restaurants", searchUrl: "https://rossouwsrestaurants.com/" },
        { name: "JHP Gourmet Guide", searchUrl: "https://www.jhpgourmetguide.co.za/" }
    ]
};

export function getGuidesForCountry(countryName: string | undefined): GuideDef[] {
    if (!countryName) return [];
    
    // 1. Direkter Treffer
    if (countryGuideConfig[countryName]) return countryGuideConfig[countryName];
    
    const normalized = countryName.toLowerCase();
    
    // 2. Fuzzy Suche (Keys)
    const foundKey = Object.keys(countryGuideConfig).find(k => 
        k.toLowerCase() === normalized || 
        normalized.includes(k.toLowerCase()) || 
        k.toLowerCase().includes(normalized)
    );
    
    if (foundKey) return countryGuideConfig[foundKey];

    // 3. NO FALLBACK (Wie gefordert)
    return [];
}
// --- END OF FILE ---
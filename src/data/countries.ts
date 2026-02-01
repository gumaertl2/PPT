// 04.02.2026 16:15 - FIX: SYNC ERROR & TYPE DEFINITIONS.
// - Exports 'GuideDef' interface (REQUIRED by ResultProcessor).
// - Replaces 'globalGuideMatrix' with 'countryGuideConfig'.
// - Strict Cleanup: No TripAdvisor, No Fallbacks.
// src/data/countries.ts

export const metadata = {
    lastUpdated: "2026-02-04T16:15:00.000Z"
};

export interface GuideDef {
    name: string;
    searchUrl: string;
}

// SINGLE SOURCE OF TRUTH - SORTED BY COUNTRY
export const countryGuideConfig: Record<string, GuideDef[]> = {
    // --- DACH & ZENTRALEUROPA ---
    "Deutschland": [
        { name: "Michelin", searchUrl: "https://guide.michelin.com/de/de/restaurants" },
        { name: "Gault&Millau", searchUrl: "https://henris-edition.com/suche/" },
        { name: "Feinschmecker", searchUrl: "https://www.feinschmecker.de/restaurant-guide" },
        { name: "Varta", searchUrl: "https://www.varta-guide.de/restaurant-suche" },
        { name: "Slow Food", searchUrl: "https://www.slowfood.de/genussfuehrer" },
        { name: "Gusto", searchUrl: "https://www.gusto-online.de/" }
    ],
    "Österreich": [
        { name: "Falstaff", searchUrl: "https://www.falstaff.com/at/restaurants" },
        { name: "Gault&Millau", searchUrl: "https://www.gaultmillau.at/restaurantguide" },
        { name: "A la Carte", searchUrl: "https://www.alacarte.at/" },
        { name: "Slow Food", searchUrl: "https://www.slowfood.com" } 
    ],
    "Schweiz": [
        { name: "Gault&Millau", searchUrl: "https://www.gaultmillau.ch/restaurants" },
        { name: "Michelin", searchUrl: "https://guide.michelin.com/ch/de/restaurants" },
        { name: "Guide Bleu", searchUrl: "https://www.guide-bleu.ch/" },
        { name: "Falstaff", searchUrl: "https://www.falstaff.com/ch/restaurants" }
    ],
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

    // --- SÜDEUROPA ---
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

    // --- ASIEN ---
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

    // --- NORDAMERIKA ---
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

    // --- OZEANIEN ---
    "Australien": [
        { name: "Good Food Guide", searchUrl: "https://www.goodfood.com.au/eat-out/good-food-guide" },
        { name: "Gourmet Traveller", searchUrl: "https://www.gourmettraveller.com.au/dining-out/restaurant-guide" },
        { name: "Australian Good Food & Travel Guide", searchUrl: "https://www.agfg.com.au/" }
    ],
    "Neuseeland": [
        { name: "Cuisine Good Food Awards", searchUrl: "https://www.cuisine.co.nz/good-food-awards/" },
        { name: "Metro Top 50", searchUrl: "https://www.metro.co.nz/food/top-50-restaurants" }
    ],

    // --- AFRIKA ---
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
// --- END OF FILE 140 Zeilen ---
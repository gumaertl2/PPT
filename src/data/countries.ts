// src/data/countries.ts
// UPDATED AUTOMATICALLY BY FOODSCOUT HARVESTER
// 2026-02-23T18:17:51.701Z

export const metadata = {
    lastUpdated: "2026-02-23T18:17:51.701Z"
};

export interface GuideDef {
    name: string;
    searchUrl: string;
}

// SINGLE SOURCE OF TRUTH - SORTED BY COUNTRY
export const countryGuideConfig: Record<string, GuideDef[]> = {
    "Deutschland": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/de/de/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/de/de [CITY] Restaurant",
                "Michelin Guide [CITY] Stern"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Stern",
                "MICHELIN Auswahl",
                "Grüner Stern"
            ]
        },
        {
            "name": "Gault&Millau",
            "searchUrl": "https://henris-edition.com/suche/",
            "googleQueries": [
                "Gault&Millau Restaurant [CITY] Bewertung",
                "Gault Millau Deutschland [CITY]"
            ],
            "searchTerms": [
                "Haube",
                "Punkte",
                "Empfehlung"
            ]
        },
        {
            "name": "Feinschmecker",
            "searchUrl": "https://www.feinschmecker.de/restaurant-guide",
            "googleQueries": [
                "site:feinschmecker.de [CITY]",
                "Der Feinschmecker [CITY] Restaurant Empfehlung"
            ],
            "searchTerms": [
                "Die besten Restaurants",
                "F",
                "FF",
                "FFF"
            ]
        },
        {
            "name": "Varta",
            "searchUrl": "https://www.varta-guide.de/restaurant-suche",
            "googleQueries": [
                "site:varta-guide.de [CITY]",
                "Varta Führer [CITY] Restaurant Liste"
            ],
            "searchTerms": [
                "Varta-Tipp",
                "Diamanten",
                "Varta-Führer"
            ]
        },
        {
            "name": "Slow Food",
            "searchUrl": "https://www.slowfood.de/genussfuehrer",
            "googleQueries": [
                "site:slowfood.de [CITY]",
                "Slow Food Genussführer [CITY] Eintrag"
            ],
            "searchTerms": [
                "Genussführer",
                "Schnecke"
            ]
        },
        {
            "name": "Gusto",
            "searchUrl": "https://www.gusto-online.de/",
            "googleQueries": [
                "site:gusto-online.de [CITY]",
                "Gusto Führer [CITY]"
            ],
            "searchTerms": [
                "Pfannen",
                "Gusto"
            ]
        },
        {
            "name": "Süddeutsche Zeitung",
            "searchUrl": "https://sz-magazin.sueddeutsche.de/kostprobe",
            "googleQueries": [
                "site:sz-magazin.sueddeutsche.de/kostprobe [CITY]",
                "Süddeutsche Zeitung Kostprobe [CITY]"
            ],
            "searchTerms": [
                "Kostprobe",
                "Tipp",
                "Empfehlung"
            ]
        }
    ],
    "Österreich": [
        {
            "name": "Falstaff",
            "searchUrl": "https://www.falstaff.com/at/restaurants",
            "googleQueries": [
                "site:falstaff.com/at [CITY] Restaurant",
                "Falstaff Österreich [CITY] Bewertung"
            ],
            "searchTerms": [
                "Gabel",
                "Punkte",
                "Falstaff"
            ]
        },
        {
            "name": "Gault&Millau",
            "searchUrl": "https://www.gaultmillau.at/restaurantguide",
            "googleQueries": [
                "site:gaultmillau.at [CITY]",
                "Gault Millau Österreich [CITY]"
            ],
            "searchTerms": [
                "Haube",
                "Punkte"
            ]
        },
        {
            "name": "A la Carte",
            "searchUrl": "https://www.alacarte.at/",
            "googleQueries": [
                "site:alacarte.at [CITY]",
                "A la Carte Guide [CITY]"
            ],
            "searchTerms": [
                "Sterne",
                "Punkte",
                "A la Carte"
            ]
        },
        {
            "name": "Slow Food",
            "searchUrl": "https://www.slowfood.com",
            "googleQueries": [
                "Slow Food Österreich [CITY]",
                "Slow Food Travel Kärnten [CITY]"
            ],
            "searchTerms": [
                "Slow Food",
                "Empfehlung"
            ]
        }
    ],
    "Schweiz": [
        {
            "name": "Gault&Millau",
            "searchUrl": "https://www.gaultmillau.ch/restaurants",
            "googleQueries": [
                "site:gaultmillau.ch [CITY]",
                "Gault Millau Schweiz [CITY]"
            ],
            "searchTerms": [
                "Haube",
                "Punkte"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/ch/de/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/ch/de [CITY]",
                "Michelin Guide Schweiz [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Stern",
                "Auswahl"
            ]
        },
        {
            "name": "Guide Bleu",
            "searchUrl": "https://www.guide-bleu.ch/",
            "googleQueries": [
                "site:guide-bleu.ch [CITY]",
                "Guide Bleu [CITY] Restaurant"
            ],
            "searchTerms": [
                "Guide Bleu",
                "Empfehlung"
            ]
        },
        {
            "name": "Falstaff",
            "searchUrl": "https://www.falstaff.com/ch/restaurants",
            "googleQueries": [
                "site:falstaff.com/ch [CITY]",
                "Falstaff Schweiz [CITY]"
            ],
            "searchTerms": [
                "Gabel",
                "Punkte"
            ]
        }
    ],
    "Polen": [
        {
            "name": "Gault&Millau",
            "searchUrl": "https://www.gaultmillau.com",
            "googleQueries": [
                "Gault&Millau Poland [CITY]",
                "Zolty Przewodnik [CITY]"
            ],
            "searchTerms": [
                "Czapki",
                "Punkty"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/pl/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/pl/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Poland 100 Best",
            "searchUrl": "https://poland100best.pl/",
            "googleQueries": [
                "site:poland100best.pl [CITY]"
            ],
            "searchTerms": [
                "Award",
                "Best Restaurant"
            ]
        }
    ],
    "Tschechien": [
        {
            "name": "Gastromapa Lukáše Hejlíka",
            "searchUrl": "https://gastromapa.hejlik.cz/",
            "googleQueries": [
                "site:gastromapa.hejlik.cz [CITY]",
                "Gastromapa [CITY]"
            ],
            "searchTerms": [
                "Doporuceni",
                "Gastromapa"
            ]
        },
        {
            "name": "Maurer's Grand Restaurant Selection",
            "searchUrl": "https://www.grand-restaurant.cz/",
            "googleQueries": [
                "site:grand-restaurant.cz [CITY]"
            ],
            "searchTerms": [
                "Maurer",
                "Selection"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/cz/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/cz/en [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Plate"
            ]
        }
    ],
    "Ungarn": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/hu/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/hu/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Dining Guide",
            "searchUrl": "https://diningguide.hu/",
            "googleQueries": [
                "site:diningguide.hu [CITY]",
                "Dining Guide Top 100 [CITY]"
            ],
            "searchTerms": [
                "Top 100",
                "Award"
            ]
        }
    ],
    "Italien": [
        {
            "name": "Gambero Rosso",
            "searchUrl": "https://www.gamberorosso.it/ristoranti/",
            "googleQueries": [
                "site:gamberorosso.it [CITY] Ristorante",
                "Gambero Rosso [CITY]"
            ],
            "searchTerms": [
                "Forchette",
                "Gamberi",
                "Spicchi"
            ]
        },
        {
            "name": "Slow Food (Osterie d'Italia)",
            "searchUrl": "https://www.slowfood.it/osteria-ditalia-subs/",
            "googleQueries": [
                "site:slowfood.it [CITY]",
                "Osterie d'Italia [CITY]"
            ],
            "searchTerms": [
                "Chiocciola",
                "Osterie d'Italia"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/it/it/ristoranti",
            "googleQueries": [
                "site:guide.michelin.com/it/it [CITY]"
            ],
            "searchTerms": [
                "Stella",
                "Bib Gourmand"
            ]
        },
        {
            "name": "L'Espresso",
            "searchUrl": "https://guide.espresso.repubblica.it/",
            "googleQueries": [
                "Guida Espresso Ristoranti [CITY]",
                "I Ristoranti e i Vini d'Italia [CITY]"
            ],
            "searchTerms": [
                "Cappello",
                "Espresso"
            ]
        }
    ],
    "Frankreich": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/fr/fr/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/fr/fr [CITY]"
            ],
            "searchTerms": [
                "Etoile",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Gault&Millau",
            "searchUrl": "https://fr.gaultmillau.com/s",
            "googleQueries": [
                "site:fr.gaultmillau.com [CITY]",
                "Gault Millau France [CITY]"
            ],
            "searchTerms": [
                "Toques",
                "Points"
            ]
        },
        {
            "name": "Le Fooding",
            "searchUrl": "https://lefooding.com/search/restaurant",
            "googleQueries": [
                "site:lefooding.com [CITY]"
            ],
            "searchTerms": [
                "Fooding",
                "Cool"
            ]
        },
        {
            "name": "La Liste",
            "searchUrl": "https://www.laliste.com/en/",
            "googleQueries": [
                "site:laliste.com [CITY]"
            ],
            "searchTerms": [
                "La Liste",
                "Score"
            ]
        }
    ],
    "Spanien": [
        {
            "name": "Repsol (Soles)",
            "searchUrl": "https://www.guiarepsol.com/es/comer/",
            "googleQueries": [
                "site:guiarepsol.com [CITY]",
                "Guía Repsol [CITY] Soles"
            ],
            "searchTerms": [
                "Sol",
                "Soles"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/es/es/restaurantes",
            "googleQueries": [
                "site:guide.michelin.com/es/es [CITY]"
            ],
            "searchTerms": [
                "Estrella",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Macarfi",
            "searchUrl": "https://www.macarfi.com/",
            "googleQueries": [
                "site:macarfi.com [CITY]"
            ],
            "searchTerms": [
                "Top 10",
                "Recommended"
            ]
        }
    ],
    "Portugal": [
        {
            "name": "Boa Cama Boa Mesa",
            "searchUrl": "https://boacamaboamesa.expresso.pt/",
            "googleQueries": [
                "site:boacamaboamesa.expresso.pt [CITY]"
            ],
            "searchTerms": [
                "Chave",
                "Garfo"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/pt/pt/restaurantes",
            "googleQueries": [
                "site:guide.michelin.com/pt/pt [CITY]"
            ],
            "searchTerms": [
                "Estrela",
                "Bib Gourmand"
            ]
        }
    ],
    "Griechenland": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/gr/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/gr/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "FNL Guide",
            "searchUrl": "https://www.fnl-guide.com/",
            "googleQueries": [
                "site:fnl-guide.com [CITY]",
                "FNL Guide Awards [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Award"
            ]
        },
        {
            "name": "Greek Cuisine Awards",
            "searchUrl": "https://www.athinorama.gr/restaurant/awards/",
            "googleQueries": [
                "site:athinorama.gr [CITY] award"
            ],
            "searchTerms": [
                "Award",
                "Toque d'Or"
            ]
        }
    ],
    "Kroatien": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/hr/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/hr/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Gault&Millau",
            "searchUrl": "https://hr.gaultmillau.com/",
            "googleQueries": [
                "site:hr.gaultmillau.com [CITY]"
            ],
            "searchTerms": [
                "Toques",
                "Points"
            ]
        },
        {
            "name": "Dobri restorani",
            "searchUrl": "https://dobrahrana.jutarnji.hr/dobri-restorani/",
            "googleQueries": [
                "Dobri restorani [CITY]"
            ],
            "searchTerms": [
                "Best Restaurants"
            ]
        }
    ],
    "Japan": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/jp/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/jp/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Tabelog",
            "searchUrl": "https://tabelog.com/en/rst/rstlst/",
            "googleQueries": [
                "site:tabelog.com/en [CITY] Award",
                "Tabelog Bronze Silver Gold [CITY]"
            ],
            "searchTerms": [
                "Bronze",
                "Silver",
                "Gold",
                "100 Famous Stores"
            ]
        },
        {
            "name": "Asia's 50 Best",
            "searchUrl": "https://www.theworlds50best.com/asia/en/list/1-50",
            "googleQueries": [
                "site:theworlds50best.com/asia [CITY]"
            ],
            "searchTerms": [
                "50 Best"
            ]
        }
    ],
    "Thailand": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/th/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/th/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Wongnai Users' Choice",
            "searchUrl": "https://www.wongnai.com/listings/users-choice",
            "googleQueries": [
                "site:wongnai.com [CITY] Users' Choice"
            ],
            "searchTerms": [
                "Users' Choice"
            ]
        },
        {
            "name": "BK Magazine Top Tables",
            "searchUrl": "https://bk.asia-city.com/restaurants/top-tables",
            "googleQueries": [
                "BK Magazine Top Tables [CITY]"
            ],
            "searchTerms": [
                "Top Tables"
            ]
        },
        {
            "name": "Asia's 50 Best",
            "searchUrl": "https://www.theworlds50best.com/asia/en/list/1-50",
            "googleQueries": [
                "site:theworlds50best.com/asia [CITY]"
            ],
            "searchTerms": [
                "50 Best"
            ]
        }
    ],
    "Singapur": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/sg/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/sg/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Burpple",
            "searchUrl": "https://www.burpple.com/sg",
            "googleQueries": [
                "site:burpple.com/sg [CITY] Guide"
            ],
            "searchTerms": [
                "Burpple Guide"
            ]
        },
        {
            "name": "Asia's 50 Best",
            "searchUrl": "https://www.theworlds50best.com/asia/en/list/1-50",
            "googleQueries": [
                "site:theworlds50best.com/asia [CITY]"
            ],
            "searchTerms": [
                "50 Best"
            ]
        }
    ],
    "Vietnam": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/vn/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/vn/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "VietnamMM (Foody)",
            "searchUrl": "https://www.foody.vn/",
            "googleQueries": [
                "site:foody.vn [CITY]"
            ],
            "searchTerms": [
                "Best"
            ]
        },
        {
            "name": "Asia's 50 Best",
            "searchUrl": "https://www.theworlds50best.com/asia/en/list/1-50",
            "googleQueries": [
                "site:theworlds50best.com/asia [CITY]"
            ],
            "searchTerms": [
                "50 Best"
            ]
        }
    ],
    "Sri Lanka": [
        {
            "name": "Yamu.lk",
            "searchUrl": "https://www.yamu.lk/",
            "googleQueries": [
                "site:yamu.lk [CITY] Best"
            ],
            "searchTerms": [
                "Recommended"
            ]
        },
        {
            "name": "Pulse.lk",
            "searchUrl": "https://www.pulse.lk/",
            "googleQueries": [
                "site:pulse.lk [CITY] Dining"
            ],
            "searchTerms": [
                "Review"
            ]
        },
        {
            "name": "Asia's 50 Best",
            "searchUrl": "https://www.theworlds50best.com/asia/en/list/1-50",
            "googleQueries": [
                "site:theworlds50best.com/asia [CITY]"
            ],
            "searchTerms": [
                "50 Best"
            ]
        }
    ],
    "USA": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/us/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/us/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "James Beard Foundation",
            "searchUrl": "https://www.jamesbeard.org/awards",
            "googleQueries": [
                "James Beard Award [CITY] Restaurant"
            ],
            "searchTerms": [
                "James Beard",
                "Award"
            ]
        },
        {
            "name": "Zagat",
            "searchUrl": "https://www.zagat.com/",
            "googleQueries": [
                "Zagat [CITY] Best Restaurants"
            ],
            "searchTerms": [
                "Zagat Rated"
            ]
        },
        {
            "name": "The Infatuation",
            "searchUrl": "https://www.theinfatuation.com/",
            "googleQueries": [
                "site:theinfatuation.com [CITY]"
            ],
            "searchTerms": [
                "Review",
                "Approved"
            ]
        },
        {
            "name": "Eater",
            "searchUrl": "https://www.eater.com/",
            "googleQueries": [
                "site:eater.com [CITY] 38",
                "Eater [CITY] Heatmap"
            ],
            "searchTerms": [
                "Eater 38",
                "Heatmap"
            ]
        }
    ],
    "Kanada": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/ca/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/ca/en [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Bib Gourmand"
            ]
        },
        {
            "name": "Canada's 100 Best",
            "searchUrl": "https://canadas100best.com/",
            "googleQueries": [
                "site:canadas100best.com [CITY]"
            ],
            "searchTerms": [
                "100 Best"
            ]
        },
        {
            "name": "En Route",
            "searchUrl": "https://enroute.aircanada.com/en/restaurants/",
            "googleQueries": [
                "site:enroute.aircanada.com [CITY]"
            ],
            "searchTerms": [
                "Best New Restaurant"
            ]
        }
    ],
    "Australien": [
        {
            "name": "Good Food Guide",
            "searchUrl": "https://www.goodfood.com.au/eat-out/good-food-guide",
            "googleQueries": [
                "site:goodfood.com.au [CITY] Hat"
            ],
            "searchTerms": [
                "Hat",
                "Chef's Hat"
            ]
        },
        {
            "name": "Gourmet Traveller",
            "searchUrl": "https://www.gourmettraveller.com.au/dining-out/restaurant-guide",
            "googleQueries": [
                "site:gourmettraveller.com.au [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Review"
            ]
        },
        {
            "name": "Australian Good Food & Travel Guide",
            "searchUrl": "https://www.agfg.com.au/",
            "googleQueries": [
                "site:agfg.com.au [CITY] Chef Hat"
            ],
            "searchTerms": [
                "Chef Hat"
            ]
        }
    ],
    "Neuseeland": [
        {
            "name": "Cuisine Good Food Awards",
            "searchUrl": "https://www.cuisine.co.nz/good-food-awards/",
            "googleQueries": [
                "site:cuisine.co.nz [CITY] Hat"
            ],
            "searchTerms": [
                "Hat",
                "Award"
            ]
        },
        {
            "name": "Metro Top 50",
            "searchUrl": "https://www.metro.co.nz/food/top-50-restaurants",
            "googleQueries": [
                "site:metro.co.nz [CITY] Top 50"
            ],
            "searchTerms": [
                "Top 50"
            ]
        }
    ],
    "Südafrika": [
        {
            "name": "Eat Out Awards",
            "searchUrl": "https://eatout.co.za/",
            "googleQueries": [
                "site:eatout.co.za [CITY]"
            ],
            "searchTerms": [
                "Star",
                "Award"
            ]
        },
        {
            "name": "Rossouw’s Restaurants",
            "searchUrl": "https://rossouwsrestaurants.com/",
            "googleQueries": [
                "Rossouw's Restaurants [CITY]"
            ],
            "searchTerms": [
                "Star"
            ]
        },
        {
            "name": "JHP Gourmet Guide",
            "searchUrl": "https://www.jhpgourmetguide.co.za/",
            "googleQueries": [
                "JHP Gourmet Guide [CITY]"
            ],
            "searchTerms": [
                "Plate"
            ]
        }
    ],
    "Vereinigtes Königreich": [
        {
            "name": "1 Michelin-Stern",
            "searchUrl": "https://www.google.com/search?q=1%20Michelin-Stern%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "4 AA Rosettes",
            "searchUrl": "https://www.google.com/search?q=4%20AA%20Rosettes%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "5 AA Rosettes",
            "searchUrl": "https://www.google.com/search?q=5%20AA%20Rosettes%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "Scotland's Best Restaurant (World Culinary Awards 2022)",
            "searchUrl": "https://www.google.com/search?q=Scotland's%20Best%20Restaurant%20(World%20Culinary%20Awards%202022)%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "3 AA Rosettes",
            "searchUrl": "https://www.google.com/search?q=3%20AA%20Rosettes%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "AA Restaurant of the Year (Scotland)",
            "searchUrl": "https://www.google.com/search?q=AA%20Restaurant%20of%20the%20Year%20(Scotland)%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "Michelin-Empfehlung",
            "searchUrl": "https://www.google.com/search?q=Michelin-Empfehlung%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "Best Fine Dining Restaurant (Edinburgh Restaurant Awards)",
            "searchUrl": "https://www.google.com/search?q=Best%20Fine%20Dining%20Restaurant%20(Edinburgh%20Restaurant%20Awards)%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "National Restaurant Awards Top 100",
            "searchUrl": "https://www.google.com/search?q=National%20Restaurant%20Awards%20Top%20100%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "Restaurant of the Year (Edinburgh Restaurant Awards 2022)",
            "searchUrl": "https://www.google.com/search?q=Restaurant%20of%20the%20Year%20(Edinburgh%20Restaurant%20Awards%202022)%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "Michelin Guide",
            "searchUrl": "https://www.google.com/search?q=Michelin%20Guide%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        },
        {
            "name": "AA Rosette for Food",
            "searchUrl": "https://www.google.com/search?q=AA%20Rosette%20for%20Food%20restaurant%20Vereinigtes%20K%C3%B6nigreich",
            "searchTerms": []
        }
    ]
};

export function getGuidesForCountry(countryName: string | undefined): GuideDef[] {
    if (!countryName) return [];
    if (countryGuideConfig[countryName]) return countryGuideConfig[countryName];
    const normalized = countryName.toLowerCase();
    const foundKey = Object.keys(countryGuideConfig).find(k => 
        k.toLowerCase() === normalized || 
        normalized.includes(k.toLowerCase()) || 
        k.toLowerCase().includes(normalized)
    );
    if (foundKey) return countryGuideConfig[foundKey];
    return [];
}

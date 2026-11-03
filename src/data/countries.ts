// [2026-11-02] [22:47] - FEAT: Added Mesa Marcada (Portugal), Michelin (Austria), cleaned UK guides, expanded searchTerms, added European countries & EN/DE country aliases.
// src/data/countries.ts
// UPDATED AUTOMATICALLY BY FOODSCOUT HARVESTER
// 2026-02-23T18:17:51.701Z

export const metadata = {
    lastUpdated: "2026-11-02T22:47:00.000Z"
};

export interface GuideDef {
    name: string;
    searchUrl: string;
    googleQueries?: string[];
    searchTerms?: string[];
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
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/at/de/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/at/de [CITY] Restaurant",
                "Michelin Guide Österreich [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Auswahl",
                "Stern",
                "Grüner Stern"
            ]
        },
        {
            "name": "Slow Food",
            "searchUrl": "https://www.slowfood.com",
            "googleQueries": [
                "Slow Food Österreich [CITY]",
                "Slow Food Travel Österreich [CITY]"
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
                "Bib Gourmand",
                "Selezionato",
                "Stella"
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
                "Bib Gourmand",
                "Sélection",
                "Etoile"
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
                "Solete",
                "Sol",
                "Soles",
                "Recomendado"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/es/es/restaurantes",
            "googleQueries": [
                "site:guide.michelin.com/es/es [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Recomendado",
                "Estrella"
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
                "site:boacamaboamesa.expresso.pt [CITY]",
                "Boa Cama Boa Mesa [CITY] Restaurante"
            ],
            "searchTerms": [
                "Boa Mesa",
                "Garfo",
                "Garfo de Ouro",
                "Garfo de Prata",
                "Chave"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/pt/pt/restaurantes",
            "googleQueries": [
                "site:guide.michelin.com/pt/pt [CITY]",
                "Guia Michelin Portugal [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Recomendado",
                "Selecionado",
                "Estrela"
            ]
        },
        {
            "name": "Mesa Marcada",
            "searchUrl": "https://mesamarcada.blogs.sapo.pt/",
            "googleQueries": [
                "site:mesamarcada.blogs.sapo.pt [CITY]",
                "Prémios Mesa Marcada [CITY] Restaurante"
            ],
            "searchTerms": [
                "Prémios Mesa Marcada",
                "Preferidos",
                "Tasca",
                "Destaque"
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
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/gb/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/gb/en [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Selected",
                "Star"
            ]
        },
        {
            "name": "AA Guide (Rosettes)",
            "searchUrl": "https://www.ratedtrips.com/aa-rosette-restaurants",
            "googleQueries": [
                "site:ratedtrips.com [CITY] AA Rosette",
                "AA Rosette Restaurant [CITY]"
            ],
            "searchTerms": [
                "AA Rosette",
                "Rosettes"
            ]
        },
        {
            "name": "The Good Food Guide",
            "searchUrl": "https://www.thegoodfoodguide.co.uk/",
            "googleQueries": [
                "site:thegoodfoodguide.co.uk [CITY]",
                "The Good Food Guide [CITY] Restaurant"
            ],
            "searchTerms": [
                "Good Food Guide",
                "Local Gem"
            ]
        },
        {
            "name": "Harden's",
            "searchUrl": "https://www.hardens.com/",
            "googleQueries": [
                "site:hardens.com [CITY]",
                "Harden's Guide [CITY] Restaurant"
            ],
            "searchTerms": [
                "Harden's",
                "Top"
            ]
        }
    ],
    "Niederlande": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/nl/nl/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/nl/nl [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Geselecteerd",
                "Ster"
            ]
        },
        {
            "name": "Gault&Millau",
            "searchUrl": "https://www.gault-millau.nl/",
            "googleQueries": [
                "site:gault-millau.nl [CITY]",
                "Gault&Millau Nederland [CITY]"
            ],
            "searchTerms": [
                "Koksmutsen",
                "Punten"
            ]
        },
        {
            "name": "Lekker500",
            "searchUrl": "https://lekker.nl/",
            "googleQueries": [
                "site:lekker.nl [CITY]",
                "Lekker500 [CITY] Restaurant"
            ],
            "searchTerms": [
                "Lekker500",
                "Top 500"
            ]
        }
    ],
    "Belgien": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/be/nl/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/be [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Selected",
                "Star",
                "Ster"
            ]
        },
        {
            "name": "Gault&Millau",
            "searchUrl": "https://www.gaultmillau.be/",
            "googleQueries": [
                "site:gaultmillau.be [CITY]",
                "Gault&Millau Belgium [CITY]"
            ],
            "searchTerms": [
                "Toques",
                "Koksmutsen",
                "Points"
            ]
        }
    ],
    "Slowenien": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/si/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/si/en [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Selected",
                "Star",
                "Green Star"
            ]
        },
        {
            "name": "Gault&Millau",
            "searchUrl": "https://si.gaultmillau.com/",
            "googleQueries": [
                "site:si.gaultmillau.com [CITY]",
                "Gault&Millau Slovenija [CITY]"
            ],
            "searchTerms": [
                "Kape",
                "Toques",
                "POP"
            ]
        },
        {
            "name": "Falstaff",
            "searchUrl": "https://www.falstaff.com/at/restaurants",
            "googleQueries": [
                "Falstaff Slowenien [CITY] Restaurant"
            ],
            "searchTerms": [
                "Gabel",
                "Punkte"
            ]
        }
    ],
    "Irland": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/ie/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/ie/en [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Selected",
                "Star"
            ]
        },
        {
            "name": "Georgina Campbell's Ireland Guide",
            "searchUrl": "https://www.ireland-guide.com/",
            "googleQueries": [
                "site:ireland-guide.com [CITY]",
                "Georgina Campbell Guide [CITY]"
            ],
            "searchTerms": [
                "Georgina Campbell",
                "Recommended"
            ]
        },
        {
            "name": "McKenna's Guides",
            "searchUrl": "https://www.guides.ie/",
            "googleQueries": [
                "McKenna's Guides [CITY] Restaurant",
                "John and Sally McKenna Plaque [CITY]"
            ],
            "searchTerms": [
                "McKenna's",
                "Best in Ireland"
            ]
        }
    ],
    "Dänemark": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/dk/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/dk/en [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Selected",
                "Star"
            ]
        },
        {
            "name": "White Guide",
            "searchUrl": "https://whiteguide.com/",
            "googleQueries": [
                "site:whiteguide.com [CITY]",
                "White Guide Denmark [CITY]"
            ],
            "searchTerms": [
                "White Guide",
                "Master Class",
                "Very Fine Level"
            ]
        }
    ],
    "Schweden": [
        {
            "name": "White Guide",
            "searchUrl": "https://whiteguide.com/",
            "googleQueries": [
                "site:whiteguide.com [CITY]",
                "White Guide Sverige [CITY]"
            ],
            "searchTerms": [
                "White Guide",
                "Mästarklass",
                "God Klass"
            ]
        },
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/se/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/se/en [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Selected",
                "Star"
            ]
        }
    ],
    "Norwegen": [
        {
            "name": "Michelin",
            "searchUrl": "https://guide.michelin.com/no/en/restaurants",
            "googleQueries": [
                "site:guide.michelin.com/no/en [CITY]"
            ],
            "searchTerms": [
                "Bib Gourmand",
                "Selected",
                "Star"
            ]
        },
        {
            "name": "White Guide",
            "searchUrl": "https://whiteguide.com/",
            "googleQueries": [
                "site:whiteguide.com [CITY]",
                "White Guide Nordic [CITY]"
            ],
            "searchTerms": [
                "White Guide",
                "Recommended"
            ]
        }
    ]
};

const COUNTRY_ALIASES: Record<string, string> = {
    "germany": "Deutschland",
    "austria": "Österreich",
    "switzerland": "Schweiz",
    "poland": "Polen",
    "czech republic": "Tschechien",
    "czechia": "Tschechien",
    "hungary": "Ungarn",
    "italy": "Italien",
    "france": "Frankreich",
    "spain": "Spanien",
    "greece": "Griechenland",
    "croatia": "Kroatien",
    "slovenia": "Slowenien",
    "netherlands": "Niederlande",
    "holland": "Niederlande",
    "belgium": "Belgien",
    "ireland": "Irland",
    "denmark": "Dänemark",
    "sweden": "Schweden",
    "norway": "Norwegen",
    "uk": "Vereinigtes Königreich",
    "united kingdom": "Vereinigtes Königreich",
    "great britain": "Vereinigtes Königreich",
    "großbritannien": "Vereinigtes Königreich",
    "england": "Vereinigtes Königreich",
    "schottland": "Vereinigtes Königreich",
    "scotland": "Vereinigtes Königreich",
    "wales": "Vereinigtes Königreich",
    "nordirland": "Vereinigtes Königreich",
    "northern ireland": "Vereinigtes Königreich",
    "singapore": "Singapur",
    "united states": "USA",
    "united states of america": "USA",
    "canada": "Kanada",
    "australia": "Australien",
    "new zealand": "Neuseeland",
    "south africa": "Südafrika"
};

export function getGuidesForCountry(countryName: string | undefined): GuideDef[] {
    if (!countryName) return [];
    const trimmed = countryName.trim();
    if (countryGuideConfig[trimmed]) return countryGuideConfig[trimmed];
    const normalized = trimmed.toLowerCase();
    if (COUNTRY_ALIASES[normalized] && countryGuideConfig[COUNTRY_ALIASES[normalized]]) {
        return countryGuideConfig[COUNTRY_ALIASES[normalized]];
    }
    const foundKey = Object.keys(countryGuideConfig).find(k => 
        k.toLowerCase() === normalized || 
        normalized.includes(k.toLowerCase()) || 
        k.toLowerCase().includes(normalized)
    );
    if (foundKey) return countryGuideConfig[foundKey];
    return [];
}
// --- END OF FILE 1268 Zeilen ---

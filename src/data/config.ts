// 13.02.2026 13:30 - CONFIG: FoodScout forced to PRO.
// - Logic: Flash/Thinking failed (hallucinations/generic data).
// - Logic: We need the full reasoning capacity of PRO to verify real existence.

import type { TaskKey } from '../core/types';

export type ModelType = 'pro' | 'flash' | 'thinking';

export const CONFIG = {
  api: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
    
    models: {
      pro: 'gemini-2.5-pro:generateContent', // High Intelligence
      flash: 'gemini-2.5-flash:generateContent', // High Speed
      thinking: 'gemini-2.5-flash-thinking' // Experimental
    },
    
    defaultTimeout: 240000, 
    maxRetries: 3,
    
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ]
  },
  
  rateLimit: {
    maxCallsPerHour: {
      pro: 50,    
      flash: 1500,
      thinking: 1500
    },
    storageKey: 'papatours-api-history'
  },
  
  storage: {
    apiKeyStorageKey: 'papatours_api_key',
    defaultKeyExpirationDays: 30
  },

  taskRouting: {
    defaults: {
      // PRO TASKS (Critical Intelligence)
      chefPlaner: 'pro',
      routeArchitect: 'pro',
      tourGuide: 'pro',          
      initialTagesplaner: 'pro', 
      ideenScout: 'pro',         
      geoAnalyst: 'pro',
      infoAutor: 'pro',          
      chefredakteur: 'pro',
      
      // UPGRADE: FoodScout must be PRO to avoid hallucinations
      foodScout: 'pro', 

      // Enrichment & Bulk
      foodEnricher: 'thinking',     
      hotelScout: 'thinking',       
      transferPlanner: 'thinking',  
      countryScout: 'thinking',
      basis: 'thinking',      
      anreicherer: 'thinking' 
    } as Partial<Record<TaskKey, ModelType>>,

    chunkDefaults: {
        // High Volume
        chefPlaner: { auto: 60, manual: 60 },      
        basis: { auto: 60, manual: 60 },           
        
        foodScout: { auto: 15, manual: 30 }, // Reduced chunk size for PRO
        
        // Enrichment
        anreicherer: { auto: 15, manual: 25 },         
        foodEnricher: { auto: 10, manual: 20 },        
        hotelScout: { auto: 20, manual: 40 },          

        // Text Generation
        chefredakteur: { auto: 5, manual: 10 },               
        infoAutor: { auto: 5, manual: 10 },            
        tourGuide: { auto: 1, manual: 1 },                 

        // Planning
        initialTagesplaner: { auto: 14, manual: 14 }, 
        transferPlanner: { auto: 14, manual: 14 }
    } as Partial<Record<TaskKey, { auto: number; manual: number }>>,

    labels: {
      chefPlaner: "tasks.chefPlaner",
      routeArchitect: "tasks.routeArchitect",
      
      tourGuide: "tasks.reisefuehrer", 
      initialTagesplaner: "tasks.initialTagesplaner",
      
      infoAutor: "tasks.infoAutor",
      chefredakteur: "tasks.infoAutor",
      
      foodEnricher: "tasks.foodEnricher",
      geoAnalyst: "tasks.geoAnalyst",
      
      hotelScout: "tasks.hotelScout",
      transferPlanner: "tasks.transferPlanner",
      foodScout: "tasks.foodScout",
      
      ideenScout: "tasks.sondertage", 
      countryScout: "tasks.countryScout",

      basis: "tasks.sightCollector", 
      anreicherer: "tasks.intelligentEnricher"
    } as Partial<Record<TaskKey, string>>
  }
};
// --- END OF FILE 130 Zeilen ---
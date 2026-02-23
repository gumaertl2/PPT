// 23.02.2026 16:30 - FEAT: Added Fuzzy Matching (Sørensen-Dice) for robust duplicate detection (>80%).
// 23.02.2026 15:45 - FEAT: Smart Merge Utility to combine places from a donor project without duplicates.
// src/core/utils/projectMerger.ts

import type { TripProject, Place } from '../types';

export interface MergeStats {
  addedCount: number;
  skippedCount: number;
}

// --- FUZZY MATCHING (Sørensen-Dice Coefficient) ---
const getBigrams = (str: string): string[] => {
    const s = str.toLowerCase().replace(/\s+/g, '');
    const bigrams = [];
    for (let i = 0; i < s.length - 1; i++) {
        bigrams.push(s.substring(i, i + 2));
    }
    return bigrams;
};

const calculateSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const bg1 = getBigrams(str1);
    const bg2 = getBigrams(str2);
    
    if (bg1.length === 0 || bg2.length === 0) return 0;
    
    let intersectionSize = 0;
    const bg2Copy = [...bg2];
    
    for (const bg of bg1) {
        const idx = bg2Copy.indexOf(bg);
        if (idx !== -1) {
            intersectionSize++;
            bg2Copy.splice(idx, 1);
        }
    }
    return (2.0 * intersectionSize) / (bg1.length + bg2.length);
};

export const mergeProjects = (master: TripProject, donor: any): { updatedProject: TripProject; stats: MergeStats } => {
  let addedCount = 0;
  let skippedCount = 0;
  const SIMILARITY_THRESHOLD = 0.8; // 80% Match

  const updatedProject: TripProject = JSON.parse(JSON.stringify(master));
  
  if (!donor || !donor.data || !donor.data.places) {
      return { updatedProject, stats: { addedCount, skippedCount } };
  }

  const masterPlaces = Object.values(updatedProject.data.places);
  const donorPlaces = Object.values(donor.data.places) as Place[];

  donorPlaces.forEach((donorPlace) => {
    if (donorPlace.category === 'internal') return;

    const isDuplicate = masterPlaces.some(masterPlace => {
      // 1. Exact ID match
      if (masterPlace.id === donorPlace.id) return true;
      
      // 2. Fuzzy match on primary name
      const mName = masterPlace.name || '';
      const dName = donorPlace.name || '';
      if (calculateSimilarity(mName, dName) >= SIMILARITY_THRESHOLD) return true;

      // 3. Fuzzy match on official name
      const mOfficial = masterPlace.official_name || '';
      const dOfficial = donorPlace.official_name || '';
      if (mOfficial && dOfficial && calculateSimilarity(mOfficial, dOfficial) >= SIMILARITY_THRESHOLD) return true;

      return false;
    });

    if (!isDuplicate) {
      updatedProject.data.places[donorPlace.id] = donorPlace;
      masterPlaces.push(donorPlace); 
      addedCount++;
    } else {
      skippedCount++;
    }
  });

  return { updatedProject, stats: { addedCount, skippedCount } };
};
// --- END OF FILE 81 Zeilen ---
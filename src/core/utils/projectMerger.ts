// 16.03.2026 18:30 - HOTFIX: Resolved TS2339 'never' control-flow error by replacing .some() with .find() for robust type inference.
// 16.03.2026 16:30 - FEAT: Upgraded Merge Utility to safely inject/merge Diary entries.
// 23.02.2026 16:30 - FEAT: Added Fuzzy Matching (Sørensen-Dice) for robust duplicate detection (>80%).
// src/core/utils/projectMerger.ts

import type { TripProject, Place } from '../types';

export interface MergeStats {
  addedCount: number;
  skippedCount: number;
  updatedCount: number; 
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
  let updatedCount = 0;
  const SIMILARITY_THRESHOLD = 0.8; // 80% Match

  const updatedProject: TripProject = JSON.parse(JSON.stringify(master));
  
  if (!donor || !donor.data || !donor.data.places) {
      return { updatedProject, stats: { addedCount, skippedCount, updatedCount } };
  }

  const masterPlaces = Object.values(updatedProject.data.places);
  const donorPlaces = Object.values(donor.data.places) as Place[];

  donorPlaces.forEach((donorPlace) => {
    if (donorPlace.category === 'internal') return;

    // HOTFIX: Use .find() so TypeScript accurately infers the Place type instead of 'never'
    const matchedMasterPlace = masterPlaces.find(masterPlace => {
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

    if (!matchedMasterPlace) {
      // Völlig neuer Ort -> Einfach hinzufügen
      updatedProject.data.places[donorPlace.id] = donorPlace;
      masterPlaces.push(donorPlace); 
      addedCount++;
    } else {
      // Ist ein Duplikat -> Rette Tagebuch- und Besuchsdaten!
      let wasUpdated = false;

      // 1. Besucht-Status und Datum übernehmen
      if (donorPlace.visited && !matchedMasterPlace.visited) {
          matchedMasterPlace.visited = true;
          matchedMasterPlace.visitedAt = donorPlace.visitedAt;
          wasUpdated = true;
      } else if (donorPlace.visited && matchedMasterPlace.visited && donorPlace.visitedAt && matchedMasterPlace.visitedAt) {
          // Falls beide besucht sind, nimm das neuere Datum
          if (new Date(donorPlace.visitedAt).getTime() > new Date(matchedMasterPlace.visitedAt).getTime()) {
              matchedMasterPlace.visitedAt = donorPlace.visitedAt;
              wasUpdated = true;
          }
      }

      // 2. Tagebuch-Notiz übernehmen (falls Spender mehr Text hat)
      const donorNoteLen = donorPlace.userNote ? donorPlace.userNote.length : 0;
      const masterNoteLen = matchedMasterPlace.userNote ? matchedMasterPlace.userNote.length : 0;
      if (donorNoteLen > masterNoteLen) {
          matchedMasterPlace.userNote = donorPlace.userNote;
          wasUpdated = true;
      }

      // 3. Sterne-Bewertung übernehmen
      if (donorPlace.userRating && (!matchedMasterPlace.userRating || donorPlace.userRating > matchedMasterPlace.userRating)) {
          matchedMasterPlace.userRating = donorPlace.userRating;
          wasUpdated = true;
      }

      if (wasUpdated) {
          updatedProject.data.places[matchedMasterPlace.id] = matchedMasterPlace;
          updatedCount++;
      } else {
          skippedCount++;
      }
    }
  });

  return { updatedProject, stats: { addedCount, skippedCount, updatedCount } };
};
// --- END OF FILE 119 Zeilen ---
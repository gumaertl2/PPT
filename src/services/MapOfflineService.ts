// 24.02.2026 16:30 - FIX: Prefixed unused 'oldVersion' with underscore to resolve TS6133.
// 24.02.2026 15:55 - FEAT: Added Region Management and DB Version 2 for selective map deletion.
// 24.02.2026 15:30 - FIX: Changed IDBPDatabase import to 'import type' to resolve runtime SyntaxError.
// src/services/MapOfflineService.ts

import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

const DB_NAME = 'papatours-map-cache';
const TILES_STORE = 'tiles';
const REGIONS_STORE = 'regions';
const VERSION = 2; // Upgraded to support regions

export interface MapRegion {
  id: string;
  name: string;
  tileKeys: string[];
  sizeInMB: number;
  createdAt: string;
}

export class MapOfflineService {
  private static db: Promise<IDBPDatabase> | null = null;

  private static getDB(): Promise<IDBPDatabase> {
    if (!this.db) {
      this.db = openDB(DB_NAME, VERSION, {
        upgrade(db, _oldVersion) {
          // Store für die eigentlichen Bilddaten
          if (!db.objectStoreNames.contains(TILES_STORE)) {
            db.createObjectStore(TILES_STORE);
          }
          // Store für die benannten Regionen (Metadaten)
          if (!db.objectStoreNames.contains(REGIONS_STORE)) {
            db.createObjectStore(REGIONS_STORE, { keyPath: 'id' });
          }
        },
      });
    }
    return this.db;
  }

  /**
   * Speichert eine Kachel in der Datenbank
   */
  static async saveTile(key: string, data: Blob): Promise<void> {
    const db = await this.getDB();
    await db.put(TILES_STORE, data, key);
  }

  /**
   * Holt eine Kachel aus der Datenbank
   */
  static async getTile(key: string): Promise<Blob | undefined> {
    const db = await this.getDB();
    return db.get(TILES_STORE, key);
  }

  /**
   * Löscht den gesamten Cache (Tiles und Regionen)
   */
  static async clearCache(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction([TILES_STORE, REGIONS_STORE], 'readwrite');
    await tx.objectStore(TILES_STORE).clear();
    await tx.objectStore(REGIONS_STORE).clear();
    await tx.done;
  }

  /**
   * Ermittelt die Gesamtstatistik aller Kacheln
   */
  static async getStats(): Promise<{ count: number }> {
    const db = await this.getDB();
    const count = await db.count(TILES_STORE);
    return { count };
  }

  // --- REGION MANAGEMENT ---

  /**
   * Speichert eine neue Region-Metadaten
   */
  static async saveRegion(region: MapRegion): Promise<void> {
    const db = await this.getDB();
    await db.put(REGIONS_STORE, region);
  }

  /**
   * Gibt alle gespeicherten Regionen zurück
   */
  static async getRegions(): Promise<MapRegion[]> {
    const db = await this.getDB();
    return db.getAll(REGIONS_STORE);
  }

  /**
   * Löscht eine Region und alle zugehörigen Kacheln
   */
  static async deleteRegion(id: string): Promise<void> {
    const db = await this.getDB();
    const region = await db.get(REGIONS_STORE, id);
    
    if (region && region.tileKeys) {
      const tx = db.transaction([TILES_STORE, REGIONS_STORE], 'readwrite');
      const tilesStore = tx.objectStore(TILES_STORE);
      
      // Lösche jede Kachel dieser Region einzeln
      for (const key of region.tileKeys) {
        await tilesStore.delete(key);
      }
      
      // Lösche den Region-Eintrag
      await tx.objectStore(REGIONS_STORE).delete(id);
      await tx.done;
    }
  }
}

// --- END OF FILE 101 Zeilen ---
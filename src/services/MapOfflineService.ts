// 24.02.2026 14:10 - FEAT: Initial Offline Map Service using IndexedDB for tile storage.
// src/services/MapOfflineService.ts

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'papatours-map-cache';
const STORE_NAME = 'tiles';
const VERSION = 1;

export class MapOfflineService {
  private static db: Promise<IDBPDatabase>;

  private static getDB() {
    if (!this.db) {
      this.db = openDB(DB_NAME, VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    }
    return this.db;
  }

  /**
   * Speichert eine Kachel in der Datenbank
   * @param key Format: "z/x/y"
   * @param data Das Bild als Blob oder Base64
   */
  static async saveTile(key: string, data: Blob): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, data, key);
  }

  /**
   * Holt eine Kachel aus der Datenbank
   */
  static async getTile(key: string): Promise<Blob | undefined> {
    const db = await this.getDB();
    return db.get(STORE_NAME, key);
  }

  /**
   * Löscht alle Kacheln (Cache leeren)
   */
  static async clearCache(): Promise<void> {
    const db = await this.getDB();
    await db.clear(STORE_NAME);
  }

  /**
   * Ermittelt die Anzahl der gespeicherten Kacheln
   */
  static async getStats(): Promise<{ count: number }> {
    const db = await this.getDB();
    const count = await db.count(STORE_NAME);
    return { count };
  }
}
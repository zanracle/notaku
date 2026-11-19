import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from './schema';

let database: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;
  if (!initPromise) initPromise = openAndMigrate();
  database = await initPromise;
  return database;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('notaku.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let i = current; i < MIGRATIONS.length; i++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const statement of MIGRATIONS[i]) {
        await txn.execAsync(statement);
      }
      // PRAGMA tidak menerima parameter bind; nilainya berasal dari konstanta internal.
      await txn.execAsync(`PRAGMA user_version = ${i + 1};`);
    });
  }

  return db;
}

/** Hanya untuk test/teardown. */
export async function closeDb(): Promise<void> {
  if (database) {
    await database.closeAsync();
    database = null;
    initPromise = null;
  }
}

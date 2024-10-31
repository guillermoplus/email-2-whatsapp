import sqlite3 from 'sqlite3'
import {Database, open} from 'sqlite'

function config() {
  if (process.env.NODE_ENV === 'dev') {
    sqlite3.verbose()
  }
}

config();

/**
 * Data source configuration
 */
const dataSource = {
  filename: './src/database/database.db',
  driver: sqlite3.cached.Database
}

export type ConnectArgs = {
  onTraceCallback?: (data: any) => void
}

/**
 * Sqlite database type
 */
export type SqliteDatabase = Database<sqlite3.Database, sqlite3.Statement>

/**
 * Connect to the database.
 * If database does not exist, it will be created.
 */
export const connect = async (args: ConnectArgs = {}) => {
  const db = await open(dataSource);
  if (args.onTraceCallback) {
    db.on('trace', args.onTraceCallback);
  }
  // Ensure token table creation
  await db.exec(`CREATE TABLE IF NOT EXISTS tokens
                 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token_type TEXT,
                    access_token TEXT,
                    refresh_token TEXT,
                    expires_in INTEGER,
                    scope TEXT,
                    ext_expires_in INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                 )`);
  return db;
}

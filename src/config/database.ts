import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from './env';
import { logger } from './logger';

const dbDir = path.dirname(env.databasePath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new sqlite3.Database(env.databasePath, (err) => {
  if (err) {
    logger.error('Database connection error:', err);
    process.exit(1);
  }
  logger.info(`Connected to SQLite database at ${env.databasePath}`);
});

db.run('PRAGMA foreign_keys = ON');
db.run('PRAGMA journal_mode = WAL');

export const runQuery = <T = any>(sql: string, params: any[] = []): Promise<T> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T);
    });
  });
};

export const runMutation = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const getOne = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
};

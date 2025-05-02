import { Database } from "bun:sqlite";
import { resolve } from "path";

const DB_PATH = resolve(process.cwd(), "erpnext-auto-attach.db");

const db = new Database(DB_PATH, { create: true });

db.run(`CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  base_dir TEXT NOT NULL,
  doctype TEXT NOT NULL,
  name TEXT NOT NULL,
  success BOOLEAN DEFAULT FALSE,
  failed_count INTEGER DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE INDEX IF NOT EXISTS idx_uploads_path ON uploads(path)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_uploads_base_dir ON uploads(base_dir)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_uploads_success ON uploads(success)`);

export interface UploadRecord {
  path: string;
  base_dir: string;
  doctype: string;
  name: string;
  timestamp?: string;
}

export function registerSuccessfulUpload(path: string, baseDir: string, doctype: string, name: string): void {
  db.run(
    `INSERT INTO uploads (path, base_dir, doctype, name, failed_count, success) VALUES (?, ?, ?, ?, 0, TRUE)
     ON CONFLICT(path) DO UPDATE SET timestamp = CURRENT_TIMESTAMP, name = ?, success = TRUE`,
    [path, baseDir, doctype, name, name]
  );
}

export function registerFailedUpload(path: string, baseDir: string, doctype: string, name: string): void {
  db.run(
    `INSERT INTO uploads (path, base_dir, doctype, name, failed_count, success) VALUES (?, ?, ?, ?, 1, FALSE)
     ON CONFLICT(path) DO UPDATE SET failed_count = failed_count + 1, timestamp = CURRENT_TIMESTAMP, name = ?, success = FALSE`,
    [path, baseDir, doctype, name, name]
  );
}

export function getUploads(): UploadRecord[] {
  return db.query(`SELECT path, base_dir, doctype, name, timestamp FROM uploads ORDER BY timestamp DESC`).all() as UploadRecord[];
}

export function getSuccessfullyUploadedPathsForDir(baseDir: string): Set<string> {
  const rows = db.query(`SELECT path FROM uploads WHERE base_dir = ? AND success = TRUE`).all(baseDir) as { path: string }[];
  return new Set(rows.map(r => r.path));
}

export function getFailedCount(path: string): number {
  const row = db.query(`SELECT failed_count FROM uploads WHERE path = ?`).get(path) as { failed_count?: number };
  return row?.failed_count ?? 0;
}
import { Database } from "bun:sqlite";
import { resolve } from "path";

const DB_PATH = resolve(process.cwd(), "erpnext-auto-attach.db");

const db = new Database(DB_PATH, { create: true });

db.run(`CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  base_dir TEXT NOT NULL,
  doctype TEXT NOT NULL,
  name TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE INDEX IF NOT EXISTS idx_uploads_path ON uploads(path)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_uploads_base_dir ON uploads(base_dir)`);

export interface UploadRecord {
  path: string;
  base_dir: string;
  doctype: string;
  name: string;
  timestamp?: string;
}

export function registerUpload(path: string, baseDir: string, doctype: string, name: string): void {
  db.run(
    `INSERT INTO uploads (path, base_dir, doctype, name) VALUES (?, ?, ?, ?)`,
    [path, baseDir, doctype, name]
  );
}

export function getUploads(): UploadRecord[] {
  return db.query(`SELECT path, base_dir, doctype, name, timestamp FROM uploads ORDER BY timestamp DESC`).all() as UploadRecord[];
}

export function getUploadedPathsForDir(baseDir: string): Set<string> {
  const rows = db.query(`SELECT path FROM uploads WHERE base_dir = ?`).all(baseDir) as { path: string }[];
  return new Set(rows.map(r => r.path));
}
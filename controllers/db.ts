import { Database } from "bun:sqlite";
import { resolve } from "path";

const DB_PATH = resolve(process.cwd(), "erpnext-auto-attach.db");

const db = new Database(DB_PATH, { create: true });

db.run(`CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  parent_dir TEXT NOT NULL,
  doctype TEXT NOT NULL,
  name TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE INDEX IF NOT EXISTS idx_uploads_path ON uploads(path)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_uploads_parent_dir ON uploads(parent_dir)`);

export interface UploadRecord {
  path: string;
  parent_dir: string;
  doctype: string;
  name: string;
  timestamp?: string;
}

export function registerUpload(path: string, doctype: string, name: string): void {
  const parentDir = require('path').dirname(path);
  db.run(
    `INSERT INTO uploads (path, parent_dir, doctype, name) VALUES (?, ?, ?, ?)`,
    [path, parentDir, doctype, name]
  );
}

export function getUploads(): UploadRecord[] {
  return db.query(`SELECT path, parent_dir, doctype, name, timestamp FROM uploads ORDER BY timestamp DESC`).all() as UploadRecord[];
}

export function getUploadedPathsForDir(parentDir: string): Set<string> {
  const rows = db.query(`SELECT path FROM uploads WHERE parent_dir = ?`).all(parentDir) as { path: string }[];
  return new Set(rows.map(r => r.path));
}
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '..', 'database.db');
export const db = () => new Database(dbPath);
//export const db = () => new Database(dbPath, { verbose: console.log });

export default { get: db };

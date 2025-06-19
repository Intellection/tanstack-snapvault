import sqlite3 from "sqlite3";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "snapvault.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Promisified database interface
interface PromisifiedDatabase {
  run: (sql: string, params?: any[]) => Promise<any>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  close: () => void;
}

// Database interface types
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login?: string;
}

export interface File {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  upload_path: string;
  access_token: string;
  expires_at?: string;
  created_at: string;
  download_count: number;
  is_public: boolean;
  description?: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

class Database {
  private db: PromisifiedDatabase;
  private initialized = false;

  constructor() {
    const sqliteDb = new sqlite3.Database(DB_PATH);
    this.db = {
      run: promisify(sqliteDb.run.bind(sqliteDb)),
      get: promisify(sqliteDb.get.bind(sqliteDb)),
      all: promisify(sqliteDb.all.bind(sqliteDb)),
      close: () => sqliteDb.close(),
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Enable foreign keys
      await this.db.run("PRAGMA foreign_keys = ON");

      // Create users table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME
        )
      `);

      // Create files table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          upload_path TEXT NOT NULL,
          access_token TEXT UNIQUE NOT NULL,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          download_count INTEGER DEFAULT 0,
          is_public BOOLEAN DEFAULT FALSE,
          description TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Create sessions table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip_address TEXT,
          user_agent TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      await this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)",
      );
      await this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_files_access_token ON files(access_token)",
      );
      await this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at)",
      );
      await this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)",
      );
      await this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
      );
      await this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)",
      );

      this.initialized = true;
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  // User methods
  async createUser(
    user: Omit<User, "created_at" | "last_login">,
  ): Promise<void> {
    await this.initialize();
    await this.db.run(
      "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
      [user.id, user.username, user.email, user.password_hash],
    );
  }

  async getUserById(id: string): Promise<User | null> {
    await this.initialize();
    const user = await this.db.get("SELECT * FROM users WHERE id = ?", [id]);
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.initialize();
    const user = await this.db.get("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    await this.initialize();
    const user = await this.db.get("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    return user || null;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await this.initialize();
    await this.db.run(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [id],
    );
  }

  // File methods
  async createFile(
    file: Omit<File, "created_at" | "download_count">,
  ): Promise<void> {
    await this.initialize();
    await this.db.run(
      `INSERT INTO files (id, user_id, filename, original_name, mime_type, size,
       upload_path, access_token, expires_at, is_public, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.id,
        file.user_id,
        file.filename,
        file.original_name,
        file.mime_type,
        file.size,
        file.upload_path,
        file.access_token,
        file.expires_at,
        file.is_public,
        file.description,
      ],
    );
  }

  async getFileById(id: string): Promise<File | null> {
    await this.initialize();
    const file = await this.db.get("SELECT * FROM files WHERE id = ?", [id]);
    return file || null;
  }

  async getFileByAccessToken(token: string): Promise<File | null> {
    await this.initialize();
    const file = await this.db.get(
      "SELECT * FROM files WHERE access_token = ?",
      [token],
    );
    return file || null;
  }

  async getFilesByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<File[]> {
    await this.initialize();
    const files = await this.db.all(
      "SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [userId, limit, offset],
    );
    return files || [];
  }

  async incrementDownloadCount(id: string): Promise<void> {
    await this.initialize();
    await this.db.run(
      "UPDATE files SET download_count = download_count + 1 WHERE id = ?",
      [id],
    );
  }

  async deleteFile(id: string): Promise<void> {
    await this.initialize();
    await this.db.run("DELETE FROM files WHERE id = ?", [id]);
  }

  async deleteExpiredFiles(): Promise<void> {
    await this.initialize();
    await this.db.run(
      "DELETE FROM files WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP",
    );
  }

  // Session methods
  async createSession(session: Omit<Session, "created_at">): Promise<void> {
    await this.initialize();
    await this.db.run(
      "INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
      [
        session.id,
        session.user_id,
        session.token,
        session.expires_at,
        session.ip_address,
        session.user_agent,
      ],
    );
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    await this.initialize();
    const session = await this.db.get(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP",
      [token],
    );
    return session || null;
  }

  async deleteSession(token: string): Promise<void> {
    await this.initialize();
    await this.db.run("DELETE FROM sessions WHERE token = ?", [token]);
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.initialize();
    await this.db.run(
      "DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP",
    );
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.initialize();
    await this.db.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  }

  // Statistics methods
  async getUserFileCount(userId: string): Promise<number> {
    await this.initialize();
    const result = await this.db.get(
      "SELECT COUNT(*) as count FROM files WHERE user_id = ?",
      [userId],
    );
    return result?.count || 0;
  }

  async getUserStorageUsed(userId: string): Promise<number> {
    await this.initialize();
    const result = await this.db.get(
      "SELECT SUM(size) as total_size FROM files WHERE user_id = ?",
      [userId],
    );
    return result?.total_size || 0;
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    await this.deleteExpiredFiles();
    await this.deleteExpiredSessions();
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const database = new Database();

// Export the Database class for testing
export { Database };

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { database, User, Session } from "./database";

const JWT_SECRET =
  process.env.JWT_SECRET || "snapvault-dev-secret-change-in-production";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthSession {
  user: AuthUser;
  sessionId: string;
  token: string;
  expiresAt: Date;
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// JWT utilities
export function generateJWT(payload: object, expiresIn: string = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// User registration
export async function registerUser(
  credentials: RegisterCredentials,
): Promise<AuthUser> {
  const { username, email, password } = credentials;

  // Validate input
  if (!username || !email || !password) {
    throw new Error("All fields are required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (!isValidEmail(email)) {
    throw new Error("Invalid email format");
  }

  if (!isValidUsername(username)) {
    throw new Error(
      "Username must be 3-20 characters, alphanumeric and underscores only",
    );
  }

  // Check if user already exists
  const existingUserByEmail = await database.getUserByEmail(email);
  if (existingUserByEmail) {
    throw new Error("An account with this email already exists");
  }

  const existingUserByUsername = await database.getUserByUsername(username);
  if (existingUserByUsername) {
    throw new Error("Username is already taken");
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const userId = uuidv4();

  const newUser: Omit<User, "created_at" | "last_login"> = {
    id: userId,
    username,
    email,
    password_hash: passwordHash,
  };

  await database.createUser(newUser);

  return {
    id: userId,
    username,
    email,
  };
}

// User login
export async function loginUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const { email, password } = credentials;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Find user by email
  const user = await database.getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Update last login
  await database.updateUserLastLogin(user.id);

  // Create session
  const sessionId = uuidv4();
  const token = generateJWT({ userId: user.id, sessionId });
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  const session: Omit<Session, "created_at"> = {
    id: sessionId,
    user_id: user.id,
    token,
    expires_at: expiresAt.toISOString(),
  };

  await database.createSession(session);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    sessionId,
    token,
    expiresAt,
  };
}

// Verify session
export async function verifySession(token: string): Promise<AuthUser | null> {
  if (!token) {
    return null;
  }

  try {
    // Verify JWT
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId || !decoded.sessionId) {
      return null;
    }

    // Check session in database
    const session = await database.getSessionByToken(token);
    if (!session) {
      return null;
    }

    // Get user
    const user = await database.getUserById(session.user_id);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

// Logout user
export async function logoutUser(token: string): Promise<void> {
  if (!token) {
    return;
  }

  try {
    await database.deleteSession(token);
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Logout all sessions for a user
export async function logoutAllSessions(userId: string): Promise<void> {
  try {
    await database.deleteUserSessions(userId);
  } catch (error) {
    console.error("Logout all sessions error:", error);
  }
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// Generate secure random token
export function generateSecureToken(): string {
  return (
    uuidv4() +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substring(2)
  );
}

// Session cleanup (run periodically)
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await database.deleteExpiredSessions();
  } catch (error) {
    console.error("Session cleanup error:", error);
  }
}

// Middleware helper for API routes
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get("Authorization");
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  // If no Authorization header, try to get token from cookies
  if (!token) {
    const cookieHeader = request.headers.get("cookie");
    token = getTokenFromCookie(cookieHeader);
  }

  if (!token) {
    throw new Error("Authentication required");
  }

  const user = await verifySession(token);
  if (!user) {
    throw new Error("Invalid or expired session");
  }

  return user;
}

// Cookie utilities for web sessions
export function createSessionCookie(token: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION);
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "Secure; " : "";
  const sameSite = isProduction ? "SameSite=Strict" : "SameSite=Lax";
  return `snapvault_session=${token}; HttpOnly; ${secure}${sameSite}; Path=/; Expires=${expires.toUTCString()}`;
}

export function clearSessionCookie(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "Secure; " : "";
  const sameSite = isProduction ? "SameSite=Strict" : "SameSite=Lax";
  return `snapvault_session=; HttpOnly; ${secure}${sameSite}; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "snapvault_session") {
      return value;
    }
  }

  return null;
}

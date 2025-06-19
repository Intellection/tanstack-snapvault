import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize, parse } from 'cookie'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const COOKIE_NAME = 'auth-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface AuthSession {
  userId: string
  email: string
  name: string
}

// Simple in-memory user store (replace with database in production)
const users: Map<string, User & { password: string }> = new Map()

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: AuthSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthSession
  } catch {
    return null
  }
}

export function createAuthCookie(session: AuthSession): string {
  const token = generateToken(session)
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export function clearAuthCookie(): string {
  return serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export function getSessionFromCookies(cookieHeader?: string): AuthSession | null {
  if (!cookieHeader) return null

  const cookies = parse(cookieHeader)
  const token = cookies[COOKIE_NAME]

  if (!token) return null

  return verifyToken(token)
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
  const existingUser = Array.from(users.values()).find(u => u.email === email)
  if (existingUser) {
    throw new Error('User already exists')
  }

  const hashedPassword = await hashPassword(password)
  const user: User & { password: string } = {
    id: Math.random().toString(36).substr(2, 9),
    email,
    name,
    password: hashedPassword,
    createdAt: new Date(),
  }

  users.set(user.id, user)

  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = Array.from(users.values()).find(u => u.email === email)
  if (!user) return null

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) return null

  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export function getUserById(id: string): User | null {
  const user = users.get(id)
  if (!user) return null

  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' }
  }
  return { valid: true }
}

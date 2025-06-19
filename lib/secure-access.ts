import crypto from "crypto";
import jwt from "jsonwebtoken";
import { database } from "./database";
import { verifySession } from "./auth";

const SIGNED_URL_SECRET = process.env.SIGNED_URL_SECRET || "snapvault-signed-url-secret-change-in-production";
const DEFAULT_URL_EXPIRY = 15 * 60; // 15 minutes in seconds
const MAX_URL_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

export interface SignedUrlOptions {
  fileId: string;
  userId: string;
  expiresIn?: number; // seconds
  action?: 'download' | 'view' | 'info';
  ipAddress?: string;
  userAgent?: string;
}

export interface FileAccessLog {
  id: string;
  file_id: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  action: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface SecureFileAccess {
  canAccess: boolean;
  reason?: string;
  requiresAuth?: boolean;
  isOwner?: boolean;
  accessLog?: FileAccessLog;
}

/**
 * Generate a signed URL for secure file access
 */
export function generateSignedUrl(options: SignedUrlOptions): string {
  const {
    fileId,
    userId,
    expiresIn = DEFAULT_URL_EXPIRY,
    action = 'download',
    ipAddress,
    userAgent
  } = options;

  // Limit expiry time
  const actualExpiry = Math.min(expiresIn, MAX_URL_EXPIRY);
  const expiresAt = Math.floor(Date.now() / 1000) + actualExpiry;

  const payload = {
    fileId,
    userId,
    action,
    exp: expiresAt,
    iat: Math.floor(Date.now() / 1000),
    ...(ipAddress && { ip: crypto.createHash('sha256').update(ipAddress).digest('hex') }),
    ...(userAgent && { ua: crypto.createHash('sha256').update(userAgent).digest('hex') })
  };

  const token = jwt.sign(payload, SIGNED_URL_SECRET, { algorithm: 'HS256' });

  return `/api/files/secure/${fileId}?token=${token}&action=${action}`;
}

/**
 * Verify a signed URL and return access information
 */
export async function verifySignedUrl(
  fileId: string,
  token: string,
  action: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  valid: boolean;
  payload?: any;
  error?: string;
}> {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, SIGNED_URL_SECRET) as any;

    // Check if file ID matches
    if (decoded.fileId !== fileId) {
      return { valid: false, error: 'File ID mismatch' };
    }

    // Check action
    if (decoded.action !== action) {
      return { valid: false, error: 'Action mismatch' };
    }

    // Verify IP address if it was included in the token
    if (decoded.ip && ipAddress) {
      const currentIpHash = crypto.createHash('sha256').update(ipAddress).digest('hex');
      if (decoded.ip !== currentIpHash) {
        return { valid: false, error: 'IP address mismatch' };
      }
    }

    // Verify user agent if it was included in the token
    if (decoded.ua && userAgent) {
      const currentUaHash = crypto.createHash('sha256').update(userAgent).digest('hex');
      if (decoded.ua !== currentUaHash) {
        return { valid: false, error: 'User agent mismatch' };
      }
    }

    return { valid: true, payload: decoded };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Signed URL has expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid signed URL' };
    }
    return { valid: false, error: 'URL verification failed' };
  }
}

/**
 * Check if a user can access a file
 */
export async function checkFileAccess(
  fileId: string,
  sessionToken?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<SecureFileAccess> {
  try {
    // Get file information
    const file = await database.getFileById(fileId);
    if (!file) {
      return {
        canAccess: false,
        reason: 'File not found'
      };
    }

    // Check if file has expired
    if (file.expires_at) {
      const expiryDate = new Date(file.expires_at);
      if (expiryDate < new Date()) {
        return {
          canAccess: false,
          reason: 'File has expired'
        };
      }
    }

    // If file is public, allow access
    if (file.is_public) {
      await logFileAccess({
        file_id: fileId,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: 'access_check',
        success: true
      });

      return {
        canAccess: true,
        isOwner: false
      };
    }

    // For private files, require authentication
    if (!sessionToken) {
      return {
        canAccess: false,
        reason: 'Authentication required for private file',
        requiresAuth: true
      };
    }

    // Verify session
    const user = await verifySession(sessionToken);
    if (!user) {
      await logFileAccess({
        file_id: fileId,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: 'access_check',
        success: false,
        error_message: 'Invalid session'
      });

      return {
        canAccess: false,
        reason: 'Invalid or expired session',
        requiresAuth: true
      };
    }

    // Check if user is the file owner
    const isOwner = file.user_id === user.id;
    if (!isOwner) {
      await logFileAccess({
        file_id: fileId,
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: 'access_check',
        success: false,
        error_message: 'Access denied - not file owner'
      });

      return {
        canAccess: false,
        reason: 'Access denied - you are not the owner of this file'
      };
    }

    // Log successful access
    await logFileAccess({
      file_id: fileId,
      user_id: user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      action: 'access_check',
      success: true
    });

    return {
      canAccess: true,
      isOwner: true
    };

  } catch (error: any) {
    console.error('File access check error:', error);

    await logFileAccess({
      file_id: fileId,
      ip_address: ipAddress,
      user_agent: userAgent,
      action: 'access_check',
      success: false,
      error_message: error.message
    });

    return {
      canAccess: false,
      reason: 'Access check failed'
    };
  }
}

/**
 * Generate a secure download URL for a file
 */
export async function generateSecureDownloadUrl(
  fileId: string,
  sessionToken: string,
  options: {
    expiresIn?: number;
    action?: 'download' | 'view' | 'info';
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // Verify user can access the file
    const accessCheck = await checkFileAccess(
      fileId,
      sessionToken,
      options.ipAddress,
      options.userAgent
    );

    if (!accessCheck.canAccess) {
      return {
        success: false,
        error: accessCheck.reason || 'Access denied'
      };
    }

    // Get user from session
    const user = await verifySession(sessionToken);
    if (!user) {
      return {
        success: false,
        error: 'Invalid session'
      };
    }

    // Generate signed URL
    const signedUrl = generateSignedUrl({
      fileId,
      userId: user.id,
      expiresIn: options.expiresIn,
      action: options.action,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    // Log URL generation
    await logFileAccess({
      file_id: fileId,
      user_id: user.id,
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
      action: `generate_${options.action || 'download'}_url`,
      success: true
    });

    return {
      success: true,
      url: signedUrl
    };

  } catch (error: any) {
    console.error('Secure download URL generation error:', error);
    return {
      success: false,
      error: 'Failed to generate secure URL'
    };
  }
}

/**
 * Revoke access to a file by regenerating its access token
 */
export async function revokeFileAccess(
  fileId: string,
  userId: string
): Promise<{
  success: boolean;
  newAccessToken?: string;
  error?: string;
}> {
  try {
    // Verify user owns the file
    const file = await database.getFileById(fileId);
    if (!file) {
      return {
        success: false,
        error: 'File not found'
      };
    }

    if (file.user_id !== userId) {
      return {
        success: false,
        error: 'Access denied - you are not the owner of this file'
      };
    }

    // Generate new access token
    const newAccessToken = crypto.randomBytes(32).toString('hex');

    // Update file with new token
    await database.updateFileAccessToken(fileId, newAccessToken);

    // Log access revocation
    await logFileAccess({
      file_id: fileId,
      user_id: userId,
      action: 'revoke_access',
      success: true
    });

    return {
      success: true,
      newAccessToken
    };

  } catch (error: any) {
    console.error('Access revocation error:', error);
    return {
      success: false,
      error: 'Failed to revoke access'
    };
  }
}

/**
 * Log file access attempts
 */
export async function logFileAccess(logData: Omit<FileAccessLog, 'id' | 'created_at'>): Promise<void> {
  try {
    const logEntry: FileAccessLog = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...logData
    };

    await database.createFileAccessLog(logEntry);
  } catch (error) {
    console.error('Failed to log file access:', error);
    // Don't throw error as logging failure shouldn't break file access
  }
}

/**
 * Get file access logs for a user's files
 */
export async function getFileAccessLogs(
  userId: string,
  fileId?: string,
  limit = 50,
  offset = 0
): Promise<FileAccessLog[]> {
  try {
    return await database.getFileAccessLogs(userId, fileId, limit, offset);
  } catch (error) {
    console.error('Failed to get file access logs:', error);
    return [];
  }
}

/**
 * Check for suspicious access patterns
 */
export async function detectSuspiciousActivity(
  fileId: string,
  timeWindowHours = 24
): Promise<{
  isSuspicious: boolean;
  reasons: string[];
  accessCount: number;
  uniqueIPs: number;
}> {
  try {
    const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const logs = await database.getFileAccessLogsSince(fileId, since.toISOString());

    const reasons: string[] = [];
    const ipAddresses = new Set<string>();
    let failedAttempts = 0;

    for (const log of logs) {
      if (log.ip_address) {
        ipAddresses.add(log.ip_address);
      }
      if (!log.success) {
        failedAttempts++;
      }
    }

    // Check for suspicious patterns
    if (logs.length > 100) {
      reasons.push(`High access volume: ${logs.length} requests in ${timeWindowHours}h`);
    }

    if (ipAddresses.size > 20) {
      reasons.push(`Many unique IPs: ${ipAddresses.size} different addresses`);
    }

    if (failedAttempts > 20) {
      reasons.push(`Many failed attempts: ${failedAttempts} failures`);
    }

    const failureRate = logs.length > 0 ? failedAttempts / logs.length : 0;
    if (failureRate > 0.5 && logs.length > 10) {
      reasons.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
      accessCount: logs.length,
      uniqueIPs: ipAddresses.size
    };

  } catch (error) {
    console.error('Failed to detect suspicious activity:', error);
    return {
      isSuspicious: false,
      reasons: [],
      accessCount: 0,
      uniqueIPs: 0
    };
  }
}

/**
 * Rate limiting for file access
 */
const accessAttempts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, // IP address or user ID
  maxAttempts = 10,
  windowMinutes = 15
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  const current = accessAttempts.get(identifier);

  if (!current || now > current.resetTime) {
    // Reset window
    const resetTime = now + windowMs;
    accessAttempts.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime
    };
  }

  if (current.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }

  current.count++;
  accessAttempts.set(identifier, current);

  return {
    allowed: true,
    remaining: maxAttempts - current.count,
    resetTime: current.resetTime
  };
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimitData(): void {
  const now = Date.now();

  for (const [identifier, data] of accessAttempts.entries()) {
    if (now > data.resetTime) {
      accessAttempts.delete(identifier);
    }
  }
}

// Clean up rate limit data every hour
setInterval(cleanupRateLimitData, 60 * 60 * 1000);

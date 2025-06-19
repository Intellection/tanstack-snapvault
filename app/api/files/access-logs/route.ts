import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFileAccessLogs, detectSuspiciousActivity } from "@/lib/secure-access";
import { database } from "@/lib/database";

// Helper to get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfIP) {
    return cfIP;
  }

  return "unknown";
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Get query parameters
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");
    const timeRange = url.searchParams.get("timeRange") || "24h";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

    // Validate file access if fileId is provided
    if (fileId) {
      const file = await database.getFileById(fileId);
      if (!file) {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        );
      }

      // Check if user owns the file
      if (file.user_id !== user.id) {
        return NextResponse.json(
          { error: "Access denied - you are not the owner of this file" },
          { status: 403 }
        );
      }
    }

    // Calculate time range
    const now = new Date();
    let since: Date;

    switch (timeRange) {
      case "1h":
        since = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get access logs
    const logs = await getFileAccessLogs(user.id, fileId || undefined, limit, offset);

    // Filter logs by time range
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= since;
    });

    // Calculate statistics
    const totalAccesses = filteredLogs.length;
    const successfulAccesses = filteredLogs.filter(log => log.success).length;
    const failedAccesses = totalAccesses - successfulAccesses;
    const uniqueIPs = new Set(
      filteredLogs
        .map(log => log.ip_address)
        .filter(ip => ip && ip !== "unknown")
    ).size;

    // Check for suspicious activity if we have a specific file
    let suspiciousActivity = false;
    let suspiciousReasons: string[] = [];

    if (fileId) {
      const timeWindowHours = timeRange === "1h" ? 1 : timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 720;
      const suspiciousCheck = await detectSuspiciousActivity(fileId, timeWindowHours);
      suspiciousActivity = suspiciousCheck.isSuspicious;
      suspiciousReasons = suspiciousCheck.reasons;
    } else {
      // Basic suspicious activity detection for all files
      if (failedAccesses > 50) {
        suspiciousActivity = true;
        suspiciousReasons.push(`High number of failed access attempts: ${failedAccesses}`);
      }

      if (uniqueIPs > 50) {
        suspiciousActivity = true;
        suspiciousReasons.push(`Unusually high number of unique IP addresses: ${uniqueIPs}`);
      }

      const failureRate = totalAccesses > 0 ? failedAccesses / totalAccesses : 0;
      if (failureRate > 0.3 && totalAccesses > 10) {
        suspiciousActivity = true;
        suspiciousReasons.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
      }
    }

    const stats = {
      totalAccesses,
      successfulAccesses,
      failedAccesses,
      uniqueIPs,
      suspiciousActivity,
      suspiciousReasons,
    };

    // Sanitize logs for client (remove sensitive data)
    const sanitizedLogs = filteredLogs.map(log => ({
      ...log,
      // Hash or mask sensitive information
      ip_address: log.ip_address ? maskIPAddress(log.ip_address) : undefined,
      user_agent: log.user_agent ? truncateUserAgent(log.user_agent) : undefined,
    }));

    return NextResponse.json({
      success: true,
      logs: sanitizedLogs,
      stats,
      pagination: {
        total: filteredLogs.length,
        limit,
        offset,
        hasMore: filteredLogs.length === limit
      },
      timeRange: {
        since: since.toISOString(),
        until: now.toISOString(),
        range: timeRange
      }
    });

  } catch (error: any) {
    console.error("Access logs fetch error:", error);

    if (error.message === "Authentication required" || error.message === "Invalid or expired session") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch access logs" },
      { status: 500 }
    );
  }
}

// Helper function to mask IP addresses
function maskIPAddress(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";

  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.***`;
  }

  // For IPv6 or other formats
  if (ip.length > 8) {
    return ip.substring(0, 8) + "***";
  }

  return ip;
}

// Helper function to truncate user agent strings
function truncateUserAgent(userAgent: string): string {
  if (!userAgent) return "";

  const maxLength = 100;
  if (userAgent.length > maxLength) {
    return userAgent.substring(0, maxLength) + "...";
  }

  return userAgent;
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

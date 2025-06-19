import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateSecureDownloadUrl, checkRateLimit } from "@/lib/secure-access";
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

export async function POST(request: NextRequest) {
  try {
    // Get client information
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";

    // Rate limiting for URL generation
    const rateLimitKey = `url_generation:${ipAddress}`;
    const rateLimit = checkRateLimit(rateLimitKey, 20, 10); // 20 URLs per 10 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for URL generation",
          resetTime: new Date(rateLimit.resetTime).toISOString()
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.floor(rateLimit.resetTime / 1000).toString()
          }
        }
      );
    }

    // Authenticate user
    const user = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const {
      fileId,
      expiresIn = 900, // 15 minutes default
      action = "download", // download, view, or info
      restrictToIP = false,
      restrictToUserAgent = false
    } = body;

    // Validate input
    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    if (!["download", "view", "info"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'download', 'view', or 'info'" },
        { status: 400 }
      );
    }

    // Validate expiry time (max 24 hours)
    const maxExpiry = 24 * 60 * 60; // 24 hours
    const actualExpiry = Math.min(Math.max(expiresIn, 60), maxExpiry); // Min 1 minute, max 24 hours

    // Verify file exists and user has access
    const file = await database.getFileById(fileId);
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Check if user owns the file (for private files)
    if (!file.is_public && file.user_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied - you are not the owner of this file" },
        { status: 403 }
      );
    }

    // Check if file has expired
    if (file.expires_at) {
      const expiryDate = new Date(file.expires_at);
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { error: "File has expired" },
          { status: 410 }
        );
      }
    }

    // Generate secure URL
    const urlResult = await generateSecureDownloadUrl(
      fileId,
      request.headers.get("authorization")?.substring(7) ||
      getCookieValue(request.headers.get("cookie"), "snapvault_session") || "",
      {
        expiresIn: actualExpiry,
        action: action as "download" | "view" | "info",
        ipAddress: restrictToIP ? ipAddress : undefined,
        userAgent: restrictToUserAgent ? userAgent : undefined
      }
    );

    if (!urlResult.success) {
      return NextResponse.json(
        { error: urlResult.error || "Failed to generate secure URL" },
        { status: 500 }
      );
    }

    // Calculate expiry time
    const expiryTime = new Date(Date.now() + actualExpiry * 1000);

    return NextResponse.json({
      success: true,
      url: urlResult.url,
      fullUrl: `${request.nextUrl.origin}${urlResult.url}`,
      expiresAt: expiryTime.toISOString(),
      expiresIn: actualExpiry,
      action,
      restrictions: {
        ipRestricted: restrictToIP,
        userAgentRestricted: restrictToUserAgent
      },
      file: {
        id: file.id,
        originalName: file.original_name,
        size: file.size,
        mimeType: file.mime_type
      }
    }, {
      headers: {
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": Math.floor(rateLimit.resetTime / 1000).toString()
      }
    });

  } catch (error: any) {
    console.error("URL generation error:", error);

    if (error.message === "Authentication required" || error.message === "Invalid or expired session") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate secure URL" },
      { status: 500 }
    );
  }
}

// Get multiple URLs for batch operations
export async function PUT(request: NextRequest) {
  try {
    // Get client information
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";

    // Rate limiting for batch URL generation
    const rateLimitKey = `batch_url_generation:${ipAddress}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 10); // 5 batch requests per 10 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for batch URL generation",
          resetTime: new Date(rateLimit.resetTime).toISOString()
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.floor(rateLimit.resetTime / 1000).toString()
          }
        }
      );
    }

    // Authenticate user
    const user = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const {
      fileIds,
      expiresIn = 900,
      action = "download",
      restrictToIP = false,
      restrictToUserAgent = false
    } = body;

    // Validate input
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: "File IDs array is required" },
        { status: 400 }
      );
    }

    if (fileIds.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 files per batch request" },
        { status: 400 }
      );
    }

    const sessionToken = request.headers.get("authorization")?.substring(7) ||
                        getCookieValue(request.headers.get("cookie"), "snapvault_session") || "";

    const results = [];

    for (const fileId of fileIds) {
      try {
        // Verify file exists and user has access
        const file = await database.getFileById(fileId);
        if (!file) {
          results.push({
            fileId,
            success: false,
            error: "File not found"
          });
          continue;
        }

        // Check if user owns the file (for private files)
        if (!file.is_public && file.user_id !== user.id) {
          results.push({
            fileId,
            success: false,
            error: "Access denied"
          });
          continue;
        }

        // Generate secure URL
        const urlResult = await generateSecureDownloadUrl(
          fileId,
          sessionToken,
          {
            expiresIn,
            action: action as "download" | "view" | "info",
            ipAddress: restrictToIP ? ipAddress : undefined,
            userAgent: restrictToUserAgent ? userAgent : undefined
          }
        );

        if (urlResult.success) {
          const expiryTime = new Date(Date.now() + expiresIn * 1000);
          results.push({
            fileId,
            success: true,
            url: urlResult.url,
            fullUrl: `${request.nextUrl.origin}${urlResult.url}`,
            expiresAt: expiryTime.toISOString(),
            file: {
              id: file.id,
              originalName: file.original_name,
              size: file.size,
              mimeType: file.mime_type
            }
          });
        } else {
          results.push({
            fileId,
            success: false,
            error: urlResult.error || "Failed to generate URL"
          });
        }

      } catch (error: any) {
        results.push({
          fileId,
          success: false,
          error: "Internal error"
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      restrictions: {
        ipRestricted: restrictToIP,
        userAgentRestricted: restrictToUserAgent
      }
    }, {
      headers: {
        "X-RateLimit-Limit": "5",
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": Math.floor(rateLimit.resetTime / 1000).toString()
      }
    });

  } catch (error: any) {
    console.error("Batch URL generation error:", error);

    if (error.message === "Authentication required" || error.message === "Invalid or expired session") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate secure URLs" },
      { status: 500 }
    );
  }
}

// Helper function to extract cookie value
function getCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName) {
      return value;
    }
  }

  return null;
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

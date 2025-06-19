import { NextRequest, NextResponse } from "next/server";
import { verifySignedUrl, checkRateLimit, logFileAccess } from "@/lib/secure-access";
import { downloadFile, getFileInfo } from "@/lib/file-utils";
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

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const startTime = Date.now();
  const { fileId } = params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action") || "download";

  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "";

  try {
    // Basic validation
    if (!fileId || !token) {
      await logFileAccess({
        file_id: fileId || "unknown",
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "secure_access",
        success: false,
        error_message: "Missing file ID or token"
      });

      return NextResponse.json(
        { error: "File ID and access token are required" },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimitKey = `file_access:${ipAddress}`;
    const rateLimit = checkRateLimit(rateLimitKey, 30, 15); // 30 requests per 15 minutes

    if (!rateLimit.allowed) {
      await logFileAccess({
        file_id: fileId,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "secure_access",
        success: false,
        error_message: "Rate limit exceeded"
      });

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          resetTime: new Date(rateLimit.resetTime).toISOString()
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.floor(rateLimit.resetTime / 1000).toString()
          }
        }
      );
    }

    // Verify signed URL
    const verification = await verifySignedUrl(fileId, token, action, ipAddress, userAgent);

    if (!verification.valid) {
      await logFileAccess({
        file_id: fileId,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "secure_access",
        success: false,
        error_message: `Invalid signed URL: ${verification.error}`
      });

      return NextResponse.json(
        { error: verification.error || "Invalid access token" },
        { status: 403 }
      );
    }

    // Get file information
    const fileInfo = await getFileInfo(fileId);
    if (!fileInfo) {
      await logFileAccess({
        file_id: fileId,
        user_id: verification.payload.userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "secure_access",
        success: false,
        error_message: "File not found"
      });

      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Check if file has expired
    if (fileInfo.expires_at) {
      const expiryDate = new Date(fileInfo.expires_at);
      if (expiryDate < new Date()) {
        await logFileAccess({
          file_id: fileId,
          user_id: verification.payload.userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          action: "secure_access",
          success: false,
          error_message: "File has expired"
        });

        return NextResponse.json(
          { error: "File has expired" },
          { status: 410 }
        );
      }
    }

    // Verify user owns the file (for private files)
    if (!fileInfo.is_public && fileInfo.user_id !== verification.payload.userId) {
      await logFileAccess({
        file_id: fileId,
        user_id: verification.payload.userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "secure_access",
        success: false,
        error_message: "Access denied - not file owner"
      });

      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Handle different actions
    if (action === "info") {
      // Return file information only
      await logFileAccess({
        file_id: fileId,
        user_id: verification.payload.userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "info_access",
        success: true
      });

      return NextResponse.json({
        success: true,
        file: {
          id: fileInfo.id,
          originalName: fileInfo.original_name,
          mimeType: fileInfo.mime_type,
          size: fileInfo.size,
          createdAt: fileInfo.created_at,
          expiresAt: fileInfo.expires_at,
          downloadCount: fileInfo.download_count,
          isPublic: fileInfo.is_public,
          description: fileInfo.description,
        },
      });
    }

    // Download the file
    const fileData = await downloadFile(fileInfo.access_token);
    if (!fileData) {
      await logFileAccess({
        file_id: fileId,
        user_id: verification.payload.userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "secure_access",
        success: false,
        error_message: "File data not available"
      });

      return NextResponse.json(
        { error: "File not available" },
        { status: 404 }
      );
    }

    // Log successful access
    const processingTime = Date.now() - startTime;
    await logFileAccess({
      file_id: fileId,
      user_id: verification.payload.userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      action: action === "view" ? "view_access" : "download_access",
      success: true
    });

    // Create response with file content
    const response = new NextResponse(fileData.buffer);

    // Set appropriate headers based on action
    response.headers.set("Content-Type", fileData.mimeType);
    response.headers.set("Content-Length", fileData.size.toString());

    if (action === "download") {
      response.headers.set(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileData.filename)}"`
      );
    } else if (action === "view") {
      response.headers.set(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(fileData.filename)}"`
      );
    }

    // Security headers
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Download-Options", "noopen");
    response.headers.set("Referrer-Policy", "no-referrer");

    // Rate limit headers
    response.headers.set("X-RateLimit-Limit", "30");
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    response.headers.set("X-RateLimit-Reset", Math.floor(rateLimit.resetTime / 1000).toString());

    // Performance headers
    response.headers.set("X-Processing-Time", `${processingTime}ms`);

    return response;

  } catch (error: any) {
    console.error("Secure file access error:", error);

    await logFileAccess({
      file_id: fileId,
      ip_address: ipAddress,
      user_agent: userAgent,
      action: "secure_access",
      success: false,
      error_message: error.message
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS (restrictive)
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "https://snapvault.app", // Production domain
  ];

  const isAllowedOrigin = allowedOrigins.includes(origin || "");

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin! : "null",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
}

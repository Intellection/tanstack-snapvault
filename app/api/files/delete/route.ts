import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteFile } from "@/lib/file-utils";
import { logFileAccess, checkRateLimit } from "@/lib/secure-access";
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

// Delete single file
export async function DELETE(request: NextRequest) {
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "";

  try {
    // Rate limiting for file deletion
    const rateLimitKey = `file_deletion:${ipAddress}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 10); // 10 deletions per 10 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for file deletion",
          resetTime: new Date(rateLimit.resetTime).toISOString()
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "10",
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
    const { fileId } = body;

    // Validate input
    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Verify file exists and user has access
    const file = await database.getFileById(fileId);
    if (!file) {
      await logFileAccess({
        file_id: fileId,
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "delete_attempt",
        success: false,
        error_message: "File not found"
      });

      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Check if user owns the file
    if (file.user_id !== user.id) {
      await logFileAccess({
        file_id: fileId,
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "delete_attempt",
        success: false,
        error_message: "Access denied - not file owner"
      });

      return NextResponse.json(
        { error: "Access denied - you are not the owner of this file" },
        { status: 403 }
      );
    }

    // Delete the file
    const deleteSuccess = await deleteFile(fileId);

    if (!deleteSuccess) {
      await logFileAccess({
        file_id: fileId,
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: "delete_attempt",
        success: false,
        error_message: "Failed to delete file"
      });

      return NextResponse.json(
        { error: "Failed to delete file" },
        { status: 500 }
      );
    }

    // Log successful deletion
    await logFileAccess({
      file_id: fileId,
      user_id: user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      action: "file_deleted",
      success: true
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
      fileId: fileId
    }, {
      headers: {
        "X-RateLimit-Limit": "10",
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": Math.floor(rateLimit.resetTime / 1000).toString()
      }
    });

  } catch (error: any) {
    console.error("File deletion error:", error);

    if (error.message === "Authentication required" || error.message === "Invalid or expired session") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete multiple files (batch operation)
export async function POST(request: NextRequest) {
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "";

  try {
    // Rate limiting for batch file deletion
    const rateLimitKey = `batch_file_deletion:${ipAddress}`;
    const rateLimit = checkRateLimit(rateLimitKey, 3, 15); // 3 batch operations per 15 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for batch file deletion",
          resetTime: new Date(rateLimit.resetTime).toISOString()
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "3",
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
    const { fileIds } = body;

    // Validate input
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: "File IDs array is required" },
        { status: 400 }
      );
    }

    if (fileIds.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 files can be deleted at once" },
        { status: 400 }
      );
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

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
          failureCount++;
          continue;
        }

        // Check if user owns the file
        if (file.user_id !== user.id) {
          await logFileAccess({
            file_id: fileId,
            user_id: user.id,
            ip_address: ipAddress,
            user_agent: userAgent,
            action: "batch_delete_attempt",
            success: false,
            error_message: "Access denied - not file owner"
          });

          results.push({
            fileId,
            success: false,
            error: "Access denied"
          });
          failureCount++;
          continue;
        }

        // Delete the file
        const deleteSuccess = await deleteFile(fileId);

        if (deleteSuccess) {
          await logFileAccess({
            file_id: fileId,
            user_id: user.id,
            ip_address: ipAddress,
            user_agent: userAgent,
            action: "batch_file_deleted",
            success: true
          });

          results.push({
            fileId,
            success: true,
            fileName: file.original_name
          });
          successCount++;
        } else {
          await logFileAccess({
            file_id: fileId,
            user_id: user.id,
            ip_address: ipAddress,
            user_agent: userAgent,
            action: "batch_delete_attempt",
            success: false,
            error_message: "Failed to delete file"
          });

          results.push({
            fileId,
            success: false,
            error: "Failed to delete file"
          });
          failureCount++;
        }

      } catch (error: any) {
        console.error(`Error deleting file ${fileId}:`, error);
        results.push({
          fileId,
          success: false,
          error: "Internal error"
        });
        failureCount++;
      }
    }

    // Log batch operation summary
    await logFileAccess({
      file_id: "batch_operation",
      user_id: user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      action: "batch_delete_completed",
      success: successCount > 0,
      error_message: `${successCount} successful, ${failureCount} failed`
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: fileIds.length,
        successful: successCount,
        failed: failureCount
      }
    }, {
      headers: {
        "X-RateLimit-Limit": "3",
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": Math.floor(rateLimit.resetTime / 1000).toString()
      }
    });

  } catch (error: any) {
    console.error("Batch file deletion error:", error);

    if (error.message === "Authentication required" || error.message === "Invalid or expired session") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "Access-Control-Allow-Methods": "DELETE, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

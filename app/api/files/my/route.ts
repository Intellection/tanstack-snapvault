import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserFiles, formatFileSize, getFileTypeIcon } from "@/lib/file-utils";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

    // Get user files
    const files = await getUserFiles(user.id, limit, offset);

    // Format files for response
    const formattedFiles = files.map(file => ({
      id: file.id,
      originalName: file.original_name,
      filename: file.filename,
      mimeType: file.mime_type,
      size: file.size,
      formattedSize: formatFileSize(file.size),
      icon: getFileTypeIcon(file.mime_type),
      accessToken: file.access_token,
      url: `/api/files/${file.access_token}`,
      createdAt: file.created_at,
      expiresAt: file.expires_at,
      downloadCount: file.download_count,
      isPublic: file.is_public,
      description: file.description,
      isExpired: file.expires_at ? new Date(file.expires_at) < new Date() : false,
    }));

    return NextResponse.json(
      {
        success: true,
        files: formattedFiles,
        pagination: {
          limit,
          offset,
          hasMore: files.length === limit,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get user files error:", error);

    if (error.message === "Authentication required" || error.message === "Invalid or expired session") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to retrieve files" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

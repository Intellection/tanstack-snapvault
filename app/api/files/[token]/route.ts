import { NextRequest, NextResponse } from "next/server";
import { downloadFile, getFileInfo } from "@/lib/file-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    // Check if this is a request for file info only
    const url = new URL(request.url);
    const infoOnly = url.searchParams.get("info") === "true";

    if (infoOnly) {
      // Return file information without downloading
      const fileInfo = await getFileInfo(token);

      if (!fileInfo) {
        return NextResponse.json(
          { error: "File not found or access denied" },
          { status: 404 }
        );
      }

      // Check if file has expired
      if (fileInfo.expires_at) {
        const expiryDate = new Date(fileInfo.expires_at);
        if (expiryDate < new Date()) {
          return NextResponse.json(
            { error: "File has expired" },
            { status: 410 }
          );
        }
      }

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
    const fileData = await downloadFile(token);

    if (!fileData) {
      return NextResponse.json(
        { error: "File not found, expired, or access denied" },
        { status: 404 }
      );
    }

    // Create response with file content
    const response = new NextResponse(fileData.buffer);

    // Set appropriate headers
    response.headers.set("Content-Type", fileData.mimeType);
    response.headers.set("Content-Length", fileData.size.toString());
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileData.filename)}"`
    );
    response.headers.set("Cache-Control", "private, no-cache");

    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");

    return response;
  } catch (error: any) {
    console.error("File download error:", error);

    return NextResponse.json(
      { error: "Failed to download file" },
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

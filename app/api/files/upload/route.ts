import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/file-utils";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Parse form data using native FormData
    const formData = await request.formData();

    // Get uploaded files
    const files = formData.getAll("file") as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Get optional fields
    const description = (formData.get("description") as string) || undefined;
    const isPublic = formData.get("isPublic") === "true";
    const expiresIn = formData.get("expiresIn")
      ? parseInt(formData.get("expiresIn") as string)
      : undefined;

    // Process each uploaded file
    const uploadResults: Array<any> = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());

        const uploadOptions = {
          userId: user.id,
          originalName: file.name,
          buffer: buffer,
          mimeType: file.type,
          description,
          isPublic,
          expiresIn,
        };

        const result = await uploadFile(uploadOptions);
        uploadResults.push(result);
      } catch (fileError: any) {
        console.error(`Error uploading file ${file.name}:`, fileError);
        uploadResults.push({
          originalName: file.name,
          error: fileError.message,
        });
      }
    }

    // Check if any uploads were successful
    const successfulUploads = uploadResults.filter((result) => !result.error);
    const failedUploads = uploadResults.filter((result) => result.error);

    if (successfulUploads.length === 0) {
      return NextResponse.json(
        {
          error: "All file uploads failed",
          details: failedUploads,
        },
        { status: 400 },
      );
    }

    const response = {
      success: true,
      message: `${successfulUploads.length} file(s) uploaded successfully`,
      files: successfulUploads,
    };

    if (failedUploads.length > 0) {
      (response as any).warnings =
        `${failedUploads.length} file(s) failed to upload`;
      (response as any).failed = failedUploads;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("File upload error:", error);

    if (
      error.message === "Authentication required" ||
      error.message === "Invalid or expired session"
    ) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (error.message.includes("File size exceeds")) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }

    if (
      error.message.includes("File type") &&
      error.message.includes("not allowed")
    ) {
      return NextResponse.json({ error: error.message }, { status: 415 });
    }

    return NextResponse.json(
      { error: "File upload failed. Please try again." },
      { status: 500 },
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

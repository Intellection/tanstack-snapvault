import { NextRequest, NextResponse } from "next/server";
import { verifySession, getTokenFromCookie } from "@/lib/auth";
import { database } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const cookieHeader = request.headers.get("cookie");
    const authHeader = request.headers.get("Authorization");

    console.log("Auth check - Cookie header:", cookieHeader);
    console.log("Auth check - Auth header:", authHeader);

    const tokenFromCookie = getTokenFromCookie(cookieHeader);
    const tokenFromHeader = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    console.log(
      "Auth check - Token from cookie:",
      tokenFromCookie ? "present" : "missing",
    );
    console.log(
      "Auth check - Token from header:",
      tokenFromHeader ? "present" : "missing",
    );

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      console.log("Auth check - No token found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify session and get user
    const user = await verifySession(token);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    // Get additional user stats
    const fileCount = await database.getUserFileCount(user.id);
    const storageUsed = await database.getUserStorageUsed(user.id);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          stats: {
            fileCount,
            storageUsed,
          },
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Get current user error:", error);

    return NextResponse.json(
      { error: "Failed to get user information" },
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

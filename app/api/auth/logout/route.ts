import { NextRequest, NextResponse } from "next/server";
import { logoutUser, clearSessionCookie, getTokenFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const cookieHeader = request.headers.get("cookie");
    const authHeader = request.headers.get("Authorization");

    const tokenFromCookie = getTokenFromCookie(cookieHeader);
    const tokenFromHeader = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return NextResponse.json(
        { error: "No session found" },
        { status: 400 }
      );
    }

    // Logout user (invalidate session)
    await logoutUser(token);

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { status: 200 }
    );

    // Clear session cookie
    response.headers.set("Set-Cookie", clearSessionCookie());

    return response;
  } catch (error: any) {
    console.error("Logout error:", error);

    const response = NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );

    // Clear cookie anyway in case of error
    response.headers.set("Set-Cookie", clearSessionCookie());

    return response;
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

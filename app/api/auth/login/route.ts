import { NextRequest, NextResponse } from "next/server";
import { loginUser, createSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Attempt to log in the user
    const session = await loginUser({ email, password });

    // Create response with user data
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: session.user.id,
          username: session.user.username,
          email: session.user.email,
        },
      },
      { status: 200 },
    );

    // Set session cookie
    const cookieValue = createSessionCookie(session.token);
    console.log("Login - Setting cookie:", cookieValue);
    response.headers.set("Set-Cookie", cookieValue);

    return response;
  } catch (error: any) {
    console.error("Login error:", error);

    // Handle authentication errors
    if (error.message.includes("Invalid email or password")) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (error.message.includes("Email and password are required")) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Login failed. Please try again." },
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
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

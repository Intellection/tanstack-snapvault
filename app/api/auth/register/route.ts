import { NextRequest, NextResponse } from "next/server";
import { registerUser, loginUser, createSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 },
      );
    }

    // Register the user
    const user = await registerUser({ username, email, password });

    // Create a session for the new user
    const session = await loginUser({ email, password });

    // Create response with session cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 201 },
    );

    // Set session cookie
    response.headers.set("Set-Cookie", createSessionCookie(session.token));

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);

    // Handle specific error types
    if (error.message.includes("email already exists")) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    if (error.message.includes("username is already taken")) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 },
      );
    }

    if (error.message.includes("Password must be at least")) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    if (error.message.includes("Invalid email format")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    if (error.message.includes("Username must be")) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-20 characters, alphanumeric and underscores only",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
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

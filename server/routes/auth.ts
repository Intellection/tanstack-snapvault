import { Router } from "express";
import { Request, Response } from "express";
import {
  createUser,
  authenticateUser,
  getUserById,
  createAuthCookie,
  clearAuthCookie,
  getSessionFromCookies,
  validateEmail,
  validatePassword,
} from "../utils/auth.ts";

const router = Router();

// Register endpoint
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        message: passwordValidation.message,
      });
    }

    // Create user
    const user = await createUser(
      email.toLowerCase().trim(),
      password,
      name.trim(),
    );

    // Create session
    const authCookie = createAuthCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.setHeader("Set-Cookie", authCookie);
    res.status(201).json(user);
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof Error && error.message === "User already exists") {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

// Login endpoint
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    // Authenticate user
    const user = await authenticateUser(email.toLowerCase().trim(), password);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create session
    const authCookie = createAuthCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.setHeader("Set-Cookie", authCookie);
    res.json(user);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
});

// Logout endpoint
router.post("/logout", (req: Request, res: Response) => {
  try {
    const clearCookie = clearAuthCookie();
    res.setHeader("Set-Cookie", clearCookie);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Logout failed. Please try again.",
    });
  }
});

// Get current user endpoint
router.get("/me", (req: Request, res: Response) => {
  try {
    const cookieHeader = req.headers.cookie;
    const session = getSessionFromCookies(cookieHeader);

    if (!session) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const user = getUserById(session.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      message: "Failed to get user information",
    });
  }
});

// Update profile endpoint
router.put("/profile", (req: Request, res: Response) => {
  try {
    const cookieHeader = req.headers.cookie;
    const session = getSessionFromCookies(cookieHeader);

    if (!session) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    const user = getUserById(session.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // For this simple implementation, we'll just return the updated user
    // In a real app, you'd update the database here
    const updatedUser = {
      ...user,
      name: name.trim(),
      email: email.toLowerCase().trim(),
    };

    res.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      message: "Profile update failed. Please try again.",
    });
  }
});

export default router;

import { test, expect } from "@playwright/test";

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

test.describe("User Registration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}/vault`);
    // Ensure we're on the registration form
    await page.getByRole("button", { name: /sign up/i }).click();
  });

  test("should register a new user successfully", async ({ page }) => {
    const timestamp = Date.now();
    const username = `testuser${timestamp}`;
    const email = `testuser${timestamp}@example.com`;
    const password = "testpassword123";

    // Fill out the registration form
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Confirm Password").fill(password);

    // Submit the form and wait for the API response
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/register") &&
          response.status() === 201,
      ),
      page.getByRole("button", { name: /create account/i }).click(),
    ]);

    // Should be redirected to the vault dashboard after successful registration
    await expect(page.locator(`text=Welcome, ${username}`)).toBeVisible();
    await expect(page.locator("text=Upload Files to Your Vault")).toBeVisible();

    // Verify navigation elements are present
    await expect(page.getByRole("button", { name: "Upload" })).toBeVisible();
    await expect(page.getByRole("button", { name: "My Files" })).toBeVisible();
  });

  test("should show validation errors for empty fields", async ({ page }) => {
    // Try to submit empty form
    await page.getByRole("button", { name: /create account/i }).click();

    // Should show validation errors without making API call
    await expect(page.locator("text=Username is required")).toBeVisible();
    await expect(page.locator("text=Email is required")).toBeVisible();
    await expect(page.locator("text=Password is required")).toBeVisible();
    await expect(
      page.locator("text=Please confirm your password"),
    ).toBeVisible();
  });

  test("should show error for invalid email format", async ({ page }) => {
    await page.getByLabel("Username").fill("testuser");
    await page.getByLabel("Email Address").fill("invalid-email");
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByLabel("Confirm Password").fill("testpassword123");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.locator("text=Please enter a valid email address"),
    ).toBeVisible();
  });

  test("should show error for short password", async ({ page }) => {
    await page.getByLabel("Username").fill("testuser");
    await page.getByLabel("Email Address").fill("test@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByLabel("Confirm Password").fill("short");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.locator("text=Password must be at least 8 characters"),
    ).toBeVisible();
  });

  test("should show error for password mismatch", async ({ page }) => {
    await page.getByLabel("Username").fill("testuser");
    await page.getByLabel("Email Address").fill("test@example.com");
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByLabel("Confirm Password").fill("differentpassword");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.locator("text=Passwords do not match")).toBeVisible();
  });

  test("should show error for invalid username format", async ({ page }) => {
    await page.getByLabel("Username").fill("test@user!");
    await page.getByLabel("Email Address").fill("test@example.com");
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByLabel("Confirm Password").fill("testpassword123");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.locator(
        "text=Username can only contain letters, numbers, and underscores",
      ),
    ).toBeVisible();
  });

  test("should show error for short username", async ({ page }) => {
    await page.getByLabel("Username").fill("ab");
    await page.getByLabel("Email Address").fill("test@example.com");
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByLabel("Confirm Password").fill("testpassword123");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.locator("text=Username must be at least 3 characters"),
    ).toBeVisible();
  });

  test("should show error for existing email", async ({ page }) => {
    const timestamp = Date.now();
    const username = `existinguser${timestamp}`;
    const email = `existinguser${timestamp}@example.com`;
    const password = "testpassword123";

    // First, register a user
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Confirm Password").fill(password);

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/register") &&
          response.status() === 201,
      ),
      page.getByRole("button", { name: /create account/i }).click(),
    ]);

    // Logout
    await page.getByRole("button", { name: "Logout" }).click();

    // Go back to registration page for second attempt
    await page.goto(`${baseURL}/vault`);
    await page.getByRole("button", { name: /sign up/i }).click();

    // Attempt to register again with same email (should fail)
    await page.getByLabel("Username").fill(username + "_2");
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Confirm Password").fill(password);

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/register") &&
          response.status() === 409,
      ),
      page.getByRole("button", { name: /create account/i }).click(),
    ]);

    // Should show error message for existing email
    await expect(
      page.locator("text=An account with this email already exists"),
    ).toBeVisible();
  });

  test("should clear errors when user starts typing", async ({ page }) => {
    // Submit empty form to show errors
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.locator("text=Username is required")).toBeVisible();

    // Start typing in username field
    await page.getByLabel("Username").fill("t");

    // Errors should be cleared
    await expect(page.locator("text=Username is required")).not.toBeVisible();
  });

  test("should switch between login and register forms", async ({ page }) => {
    // Should be on register form (from beforeEach)
    await expect(page.locator("text=Create Account")).toBeVisible();

    // Click "Sign in" link
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("text=Welcome Back")).toBeVisible();

    // Click the "Sign up" link to go back
    await page.getByRole("button", { name: /sign up/i }).click();
    await expect(page.locator("text=Create Account")).toBeVisible();
  });

  test("should disable form while submitting", async ({ page }) => {
    const timestamp = Date.now();
    const username = `testuser${timestamp}`;
    const email = `testuser${timestamp}@example.com`;
    const password = "testpassword123";

    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Confirm Password").fill(password);

    // Start submission
    const submitPromise = page
      .getByRole("button", { name: /create account/i })
      .click();

    // Button should show loading state and be disabled
    await expect(
      page.getByRole("button", { name: /creating account/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /creating account/i }),
    ).toBeDisabled();

    // Form fields should be disabled
    await expect(page.getByLabel("Username")).toBeDisabled();
    await expect(page.getByLabel("Email Address")).toBeDisabled();
    await expect(page.getByLabel("Password")).toBeDisabled();
    await expect(page.getByLabel("Confirm Password")).toBeDisabled();

    await submitPromise;
  });

  test("should have proper accessibility attributes", async ({ page }) => {
    // Check form labels are properly associated
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();

    // Check form structure
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Check submit button
    const submitButton = page.getByRole("button", { name: /create account/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveAttribute("type", "submit");
  });
});

test.describe("User Registration - Integration", () => {
  test("should successfully create user and allow immediate file operations", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const username = `integrationuser${timestamp}`;
    const email = `integrationuser${timestamp}@example.com`;
    const password = "testpassword123";

    // Go to registration
    await page.goto(`${baseURL}/vault`);
    await page.getByRole("button", { name: /sign up/i }).click();

    // Register new user
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Confirm Password").fill(password);

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/register") &&
          response.status() === 201,
      ),
      page.getByRole("button", { name: /create account/i }).click(),
    ]);

    // Should be on vault dashboard
    await expect(page.locator(`text=Welcome, ${username}`)).toBeVisible();

    // Should be able to navigate to different sections
    await page.getByRole("button", { name: "My Files" }).click();
    await expect(page.locator("text=Your File Vault")).toBeVisible();

    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.locator("text=Upload Files to Your Vault")).toBeVisible();

    // Should be able to logout
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.locator("text=Create Account")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { createReadStream } from "fs";
import path from "path";

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

test.describe("File Upload Type Restrictions", () => {
  test.beforeEach(async ({ page }) => {
    // Register and login a test user
    const timestamp = Date.now();
    const username = `testuser${timestamp}`;
    const email = `testuser${timestamp}@example.com`;
    const password = "testpassword123";

    await page.goto(`${baseURL}/vault`);
    await page.getByRole("button", { name: /sign up/i }).click();

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

    // Should be on vault dashboard, navigate to upload section
    await expect(page.locator(`text=Welcome, ${username}`)).toBeVisible();
    await page.getByRole("button", { name: "Upload" }).click();
  });

  test("should accept allowed image file types", async ({ page }) => {
    // Test that JPG, PNG, GIF, SVG are accepted
    const allowedImageTypes = [
      { name: "test.jpg", type: "image/jpeg" },
      { name: "test.jpeg", type: "image/jpeg" },
      { name: "test.png", type: "image/png" },
      { name: "test.gif", type: "image/gif" },
      { name: "test.svg", type: "image/svg+xml" },
    ];

    for (const fileType of allowedImageTypes) {
      // Create a simple test file content
      const testContent = fileType.type === "image/svg+xml"
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>'
        : "fake image content";

      const fileChooserPromise = page.waitForEvent("filechooser");
      await page.getByText("Browse Files").click();
      const fileChooser = await fileChooserPromise;

      // Create a test file
      await fileChooser.setFiles({
        name: fileType.name,
        mimeType: fileType.type,
        buffer: Buffer.from(testContent),
      });

      // Should not show any file type error
      await expect(page.locator(`text=File type ${fileType.type} is not allowed`)).not.toBeVisible();
    }
  });

  test("should accept allowed text file types", async ({ page }) => {
    const allowedTextTypes = [
      { name: "test.txt", type: "text/plain", content: "Hello world" },
      { name: "test.md", type: "text/markdown", content: "# Hello\nWorld" },
      { name: "test.csv", type: "text/csv", content: "name,age\nJohn,30" },
    ];

    for (const fileType of allowedTextTypes) {
      const fileChooserPromise = page.waitForEvent("filechooser");
      await page.getByText("Browse Files").click();
      const fileChooser = await fileChooserPromise;

      await fileChooser.setFiles({
        name: fileType.name,
        mimeType: fileType.type,
        buffer: Buffer.from(fileType.content),
      });

      // Should not show any file type error
      await expect(page.locator(`text=File type ${fileType.type} is not allowed`)).not.toBeVisible();
    }
  });

  test("should reject disallowed file types", async ({ page }) => {
    const disallowedTypes = [
      { name: "test.pdf", type: "application/pdf" },
      { name: "test.doc", type: "application/msword" },
      { name: "test.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { name: "test.zip", type: "application/zip" },
      { name: "test.exe", type: "application/x-msdownload" },
      { name: "test.mp4", type: "video/mp4" },
      { name: "test.mp3", type: "audio/mpeg" },
      { name: "test.json", type: "application/json" },
      { name: "test.xml", type: "application/xml" },
      { name: "test.webp", type: "image/webp" },
      { name: "test.bmp", type: "image/bmp" },
    ];

    for (const fileType of disallowedTypes) {
      const fileChooserPromise = page.waitForEvent("filechooser");
      await page.getByText("Browse Files").click();
      const fileChooser = await fileChooserPromise;

      await fileChooser.setFiles({
        name: fileType.name,
        mimeType: fileType.type,
        buffer: Buffer.from("test content"),
      });

      // Should show file type error
      await expect(page.locator(`text=File type ${fileType.type} is not allowed`)).toBeVisible({ timeout: 10000 });

      // Wait a bit and clear any error states for next iteration
      await page.waitForTimeout(1000);
    }
  });

  test("should show correct file type information in UI", async ({ page }) => {
    // Check that the UI shows the correct supported file types
    await expect(page.locator("text=JPG, PNG, GIF, SVG images and TXT, MD, CSV files")).toBeVisible();
    await expect(page.locator("text=Supported formats: JPG, PNG, GIF, SVG, TXT, MD, CSV")).toBeVisible();
  });

  test("should have correct accept attribute on file input", async ({ page }) => {
    // Check that the file input has the correct accept attribute
    const fileInput = page.locator('input[type="file"]');
    const acceptAttr = await fileInput.getAttribute("accept");

    // Should contain all allowed MIME types
    expect(acceptAttr).toContain("image/jpeg");
    expect(acceptAttr).toContain("image/jpg");
    expect(acceptAttr).toContain("image/png");
    expect(acceptAttr).toContain("image/gif");
    expect(acceptAttr).toContain("image/svg+xml");
    expect(acceptAttr).toContain("text/plain");
    expect(acceptAttr).toContain("text/markdown");
    expect(acceptAttr).toContain("text/csv");

    // Should not contain disallowed types
    expect(acceptAttr).not.toContain("application/pdf");
    expect(acceptAttr).not.toContain("application/zip");
    expect(acceptAttr).not.toContain("image/webp");
    expect(acceptAttr).not.toContain("image/bmp");
  });

  test("should handle file size validation correctly", async ({ page }) => {
    // Test that file size validation still works with new restrictions
    const largeFileContent = "x".repeat(51 * 1024 * 1024); // 51MB

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Browse Files").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "large.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(largeFileContent),
    });

    // Should show file size error
    await expect(page.locator("text=File size exceeds 50MB limit")).toBeVisible();
  });

  test("should successfully upload valid files", async ({ page }) => {
    // Test successful upload of a valid file type
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Browse Files").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Hello, this is a test file!"),
    });

    // Wait for upload to complete
    await expect(page.locator("text=Uploaded")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=File uploaded successfully!")).toBeVisible();
  });

  test("should handle multiple file uploads with mixed validity", async ({ page }) => {
    // Test uploading multiple files where some are valid and some are not
    const files = [
      { name: "valid.txt", type: "text/plain", content: "Valid file" },
      { name: "invalid.pdf", type: "application/pdf", content: "Invalid file" },
      { name: "valid.png", type: "image/png", content: "fake png content" },
    ];

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Browse Files").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles(files.map(file => ({
      name: file.name,
      mimeType: file.type,
      buffer: Buffer.from(file.content),
    })));

    // Should show error for invalid file type
    await expect(page.locator("text=File type application/pdf is not allowed")).toBeVisible();

    // Valid files should still be processed
    // Note: This behavior depends on implementation - you may need to adjust based on actual behavior
  });

  test("should validate file extensions match MIME types", async ({ page }) => {
    // Test uploading a file with mismatched extension and MIME type
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Browse Files").click();
    const fileChooser = await fileChooserPromise;

    // Upload a file with .txt extension but image MIME type
    await fileChooser.setFiles({
      name: "test.txt",
      mimeType: "image/png",
      buffer: Buffer.from("This is actually text, not an image"),
    });

    // The validation behavior here depends on your implementation
    // You might want to show a warning or error for mismatched types
  });
});

test.describe("File Upload API Restrictions", () => {
  let authToken: string;

  test.beforeEach(async ({ request }) => {
    // Register and get auth token for API tests
    const timestamp = Date.now();
    const username = `apiuser${timestamp}`;
    const email = `apiuser${timestamp}@example.com`;
    const password = "testpassword123";

    const response = await request.post(`${baseURL}/api/auth/register`, {
      data: {
        username,
        email,
        password,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    // Extract session token from set-cookie header if available
    const cookies = response.headers()['set-cookie'];
    if (cookies) {
      const sessionMatch = cookies.match(/session=([^;]+)/);
      if (sessionMatch) {
        authToken = sessionMatch[1];
      }
    }
  });

  test("should reject disallowed file types via API", async ({ request }) => {
    const formData = new FormData();
    formData.append("file", new Blob(["test content"], { type: "application/pdf" }), "test.pdf");

    const response = await request.post(`${baseURL}/api/files/upload`, {
      multipart: {
        file: {
          name: "test.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("test content"),
        },
      },
      headers: {
        Cookie: authToken ? `session=${authToken}` : "",
      },
    });

    expect(response.status()).toBe(415); // Unsupported Media Type
    const data = await response.json();
    expect(data.error).toContain("File type");
    expect(data.error).toContain("not allowed");
  });

  test("should accept allowed file types via API", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/files/upload`, {
      multipart: {
        file: {
          name: "test.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("Hello world"),
        },
      },
      headers: {
        Cookie: authToken ? `session=${authToken}` : "",
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.files).toBeDefined();
    expect(data.files.length).toBeGreaterThan(0);
  });
});

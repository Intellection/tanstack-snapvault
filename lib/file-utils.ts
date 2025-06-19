import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import sharp from "sharp";
import { database, File } from "./database";
import { generateSecureToken } from "./auth";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/svg+xml",
  // Documents
  "text/plain",
  "text/markdown",
  "text/csv",
];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface FileUploadOptions {
  userId: string;
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  description?: string;
  isPublic?: boolean;
  expiresIn?: number; // hours
}

export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  accessToken: string;
  expiresAt?: Date;
  url: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// File validation
export function validateFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): FileValidationResult {
  const warnings: string[] = [];

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: `File type ${mimeType} is not allowed`,
    };
  }

  // Check file extension matches mime type
  const expectedExtension = mime.extension(mimeType);
  const actualExtension = path.extname(originalName).toLowerCase().substring(1);

  if (expectedExtension && actualExtension !== expectedExtension) {
    warnings.push(
      `File extension "${actualExtension}" doesn't match detected type "${mimeType}"`,
    );
  }

  // Check for potentially suspicious files
  const suspiciousExtensions = [
    "exe",
    "bat",
    "cmd",
    "com",
    "pif",
    "scr",
    "vbs",
    "js",
  ];
  if (suspiciousExtensions.includes(actualExtension)) {
    warnings.push("File has potentially executable extension");
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Generate unique filename
export function generateUniqueFilename(originalName: string): string {
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  const timestamp = Date.now();
  const uuid = uuidv4().split("-")[0]; // Use first part of UUID for brevity

  // Sanitize the base name
  const sanitizedBaseName = baseName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 50); // Limit length

  return `${timestamp}_${uuid}_${sanitizedBaseName}${extension}`;
}

// Process image files (generate thumbnails, optimize)
export async function processImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{
  processed: Buffer;
  thumbnail?: Buffer;
  metadata: any;
}> {
  if (!mimeType.startsWith("image/")) {
    return { processed: buffer, metadata: {} };
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Optimize image (reduce quality for large images)
    let processed = buffer;
    if (buffer.length > 2 * 1024 * 1024) {
      // 2MB threshold
      if (mimeType === "image/jpeg") {
        processed = await image
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
      } else if (mimeType === "image/png") {
        processed = await image.png({ compressionLevel: 8 }).toBuffer();
      }
    }

    // Generate thumbnail for images
    let thumbnail: Buffer | undefined;
    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > 300 || metadata.height > 300)
    ) {
      thumbnail = await image
        .resize(300, 300, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    return {
      processed,
      thumbnail,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
      },
    };
  } catch (error) {
    console.error("Image processing error:", error);
    return { processed: buffer, metadata: {} };
  }
}

// Upload file
export async function uploadFile(
  options: FileUploadOptions,
): Promise<FileUploadResult> {
  const {
    userId,
    originalName,
    buffer,
    mimeType,
    description,
    isPublic = false,
    expiresIn,
  } = options;

  // Validate file
  const validation = validateFile(buffer, mimeType, originalName);
  if (!validation.isValid) {
    throw new Error(validation.error || "File validation failed");
  }

  // Generate unique filename and paths
  const filename = generateUniqueFilename(originalName);
  const filePath = path.join(UPLOAD_DIR, filename);
  const fileId = uuidv4();
  const accessToken = generateSecureToken();

  // Process file if it's an image
  let processedBuffer = buffer;
  let thumbnailBuffer: Buffer | undefined;

  if (mimeType.startsWith("image/")) {
    const processed = await processImage(buffer, mimeType);
    processedBuffer = processed.processed;
    thumbnailBuffer = processed.thumbnail;
  }

  // Save main file
  await fs.promises.writeFile(filePath, processedBuffer);

  // Save thumbnail if generated
  let thumbnailPath: string | undefined;
  if (thumbnailBuffer) {
    const thumbnailFilename = `thumb_${filename}`;
    thumbnailPath = path.join(UPLOAD_DIR, thumbnailFilename);
    await fs.promises.writeFile(thumbnailPath, thumbnailBuffer);
  }

  // Calculate expiration date
  let expiresAt: string | undefined;
  if (expiresIn && expiresIn > 0) {
    const expiry = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
    expiresAt = expiry.toISOString();
  }

  // Create database record
  const fileRecord: Omit<File, "created_at" | "download_count"> = {
    id: fileId,
    user_id: userId,
    filename,
    original_name: originalName,
    mime_type: mimeType,
    size: processedBuffer.length,
    upload_path: filePath,
    access_token: accessToken,
    expires_at: expiresAt,
    is_public: isPublic,
    description,
  };

  await database.createFile(fileRecord);

  return {
    id: fileId,
    filename,
    originalName,
    size: processedBuffer.length,
    mimeType,
    accessToken,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    url: `/api/files/${accessToken}`,
  };
}

// Get file info
export async function getFileInfo(accessToken: string): Promise<File | null> {
  return await database.getFileByAccessToken(accessToken);
}

// Download file
export async function downloadFile(accessToken: string): Promise<{
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
} | null> {
  const fileRecord = await database.getFileByAccessToken(accessToken);

  if (!fileRecord) {
    return null;
  }

  // Check if file has expired
  if (fileRecord.expires_at) {
    const expiryDate = new Date(fileRecord.expires_at);
    if (expiryDate < new Date()) {
      // File has expired, delete it
      await deleteFile(fileRecord.id);
      return null;
    }
  }

  // Check if file exists on disk
  if (!fs.existsSync(fileRecord.upload_path)) {
    console.error(`File not found on disk: ${fileRecord.upload_path}`);
    return null;
  }

  // Read file
  const buffer = await fs.promises.readFile(fileRecord.upload_path);

  // Increment download count
  await database.incrementDownloadCount(fileRecord.id);

  return {
    buffer,
    filename: fileRecord.original_name,
    mimeType: fileRecord.mime_type,
    size: fileRecord.size,
  };
}

// Delete file
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const fileRecord = await database.getFileById(fileId);
    if (!fileRecord) {
      return false;
    }

    // Delete file from disk
    if (fs.existsSync(fileRecord.upload_path)) {
      await fs.promises.unlink(fileRecord.upload_path);
    }

    // Delete thumbnail if exists
    const thumbnailPath = path.join(
      path.dirname(fileRecord.upload_path),
      `thumb_${fileRecord.filename}`,
    );
    if (fs.existsSync(thumbnailPath)) {
      await fs.promises.unlink(thumbnailPath);
    }

    // Delete from database
    await database.deleteFile(fileId);

    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}

// Get user files
export async function getUserFiles(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<File[]> {
  return await database.getFilesByUserId(userId, limit, offset);
}

// Clean up expired files
export async function cleanupExpiredFiles(): Promise<void> {
  try {
    // Get expired files before deleting from database
    const expiredFiles = await database
      .getFilesByUserId("", 1000, 0)
      .then((files) =>
        files.filter(
          (file) => file.expires_at && new Date(file.expires_at) < new Date(),
        ),
      );

    // Delete files from disk
    for (const file of expiredFiles) {
      if (fs.existsSync(file.upload_path)) {
        await fs.promises.unlink(file.upload_path);
      }

      // Delete thumbnail if exists
      const thumbnailPath = path.join(
        path.dirname(file.upload_path),
        `thumb_${file.filename}`,
      );
      if (fs.existsSync(thumbnailPath)) {
        await fs.promises.unlink(thumbnailPath);
      }
    }

    // Delete from database
    await database.deleteExpiredFiles();

    console.log(`Cleaned up ${expiredFiles.length} expired files`);
  } catch (error) {
    console.error("Error cleaning up expired files:", error);
  }
}

// Utility functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "text/plain") return "📄";
  if (mimeType === "text/markdown") return "📝";
  if (mimeType === "text/csv") return "📊";
  return "📁";
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

export function isDocumentFile(mimeType: string): boolean {
  const documentTypes = ["text/plain", "text/markdown", "text/csv"];
  return documentTypes.includes(mimeType);
}

// File upload middleware for multipart/form-data
export interface ParsedFile {
  fieldName: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
}

export async function parseMultipartFormData(request: Request): Promise<{
  files: ParsedFile[];
  fields: Record<string, string>;
}> {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    throw new Error("Content-Type must be multipart/form-data");
  }

  const boundary = contentType.split("boundary=")[1];
  if (!boundary) {
    throw new Error("Missing boundary in Content-Type header");
  }

  const body = await request.arrayBuffer();
  const buffer = Buffer.from(body);

  const files: ParsedFile[] = [];
  const fields: Record<string, string> = {};

  // Simple multipart parser (for production, consider using a proper library)
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while (true) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    if (start !== 0) {
      parts.push(buffer.slice(start, boundaryIndex));
    }

    start = boundaryIndex + boundaryBuffer.length;
  }

  for (const part of parts) {
    const headerEndIndex = part.indexOf("\r\n\r\n");
    if (headerEndIndex === -1) continue;

    const headers = part.slice(0, headerEndIndex).toString();
    const content = part.slice(headerEndIndex + 4, part.length - 2); // Remove trailing \r\n

    const dispositionMatch = headers.match(
      /Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/,
    );
    if (!dispositionMatch) continue;

    const fieldName = dispositionMatch[1];
    const filename = dispositionMatch[2];

    if (filename) {
      // This is a file
      const contentTypeMatch = headers.match(/Content-Type: ([^\r\n]+)/);
      const mimeType = contentTypeMatch
        ? contentTypeMatch[1]
        : "application/octet-stream";

      files.push({
        fieldName,
        originalName: filename,
        mimeType,
        buffer: content,
        size: content.length,
      });
    } else {
      // This is a regular field
      fields[fieldName] = content.toString();
    }
  }

  return { files, fields };
}

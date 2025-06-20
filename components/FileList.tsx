"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface FileItem {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  formattedSize: string;
  icon: string;
  accessToken: string;
  url: string;
  createdAt: string;
  expiresAt?: string;
  downloadCount: number;
  isPublic: boolean;
  description?: string;
  isExpired: boolean;
}

interface FileListProps {
  refreshTrigger?: number;
}

export default function FileList({ refreshTrigger = 0 }: FileListProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showCopySuccess, setShowCopySuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user, refreshTrigger]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/files/my", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch files");
      }

      setFiles(data.files);
    } catch (error: any) {
      console.error("Error fetching files:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  const generateSecureUrl = async (
    fileId: string,
    action: "download" | "view" = "download",
  ) => {
    try {
      const response = await fetch("/api/files/generate-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fileId,
          action,
          expiresIn: 900, // 15 minutes
          restrictToIP: true,
          restrictToUserAgent: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate secure URL");
      }

      return data.fullUrl;
    } catch (error) {
      console.error("Failed to generate secure URL:", error);
      throw error;
    }
  };

  const copySecureLink = async (fileId: string) => {
    try {
      const secureUrl = await generateSecureUrl(fileId, "view");
      await navigator.clipboard.writeText(secureUrl);
      setShowCopySuccess(fileId);
      setTimeout(() => setShowCopySuccess(null), 2000);
    } catch (error) {
      console.error("Failed to copy secure link:", error);
      alert("Failed to generate secure link. Please try again.");
    }
  };

  const downloadFile = async (file: FileItem) => {
    try {
      const secureUrl = await generateSecureUrl(file.id, "download");
      const link = document.createElement("a");
      link.href = secureUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download file:", error);
      alert("Failed to generate download link. Please try again.");
    }
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;

    setDeleteLoading(true);
    try {
      const response = await fetch("/api/files/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete files");
      }

      // Show results
      const { summary } = data;
      if (summary.failed > 0) {
        alert(
          `Deleted ${summary.successful} files successfully. ${summary.failed} files failed to delete.`,
        );
      } else {
        alert(`Successfully deleted ${summary.successful} files.`);
      }

      // Clear selection and refresh
      setSelectedFiles(new Set());
      setShowDeleteConfirm(false);
      fetchFiles();
    } catch (error: any) {
      console.error("Failed to delete files:", error);
      alert(`Failed to delete files: ${error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteSingleFile = async (fileId: string, fileName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/files/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fileId: fileId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete file");
      }

      alert("File deleted successfully");
      fetchFiles();
    } catch (error: any) {
      console.error("Failed to delete file:", error);
      alert(`Failed to delete file: ${error.message}`);
    }
  };

  const downloadSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;

    try {
      // Generate URLs for all selected files
      const response = await fetch("/api/files/generate-url", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
          action: "download",
          expiresIn: 300, // 5 minutes for batch download
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate download URLs");
      }

      // Download each file
      for (const result of data.results) {
        if (result.success) {
          const link = document.createElement("a");
          link.href = result.fullUrl;
          link.download = result.file.originalName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Small delay between downloads
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.length - successCount;

      if (failCount > 0) {
        alert(
          `Downloaded ${successCount} files. ${failCount} files failed to download.`,
        );
      }
    } catch (error: any) {
      console.error("Failed to download files:", error);
      alert(`Failed to download files: ${error.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "text-blue-600 bg-blue-50";
    if (mimeType.startsWith("video/")) return "text-purple-600 bg-purple-50";
    if (mimeType.startsWith("audio/")) return "text-green-600 bg-green-50";
    if (mimeType === "application/pdf") return "text-red-600 bg-red-50";
    if (
      mimeType.includes("zip") ||
      mimeType.includes("rar") ||
      mimeType.includes("7z")
    )
      return "text-yellow-600 bg-yellow-50";
    if (mimeType.includes("word") || mimeType.includes("document"))
      return "text-indigo-600 bg-indigo-50";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
      return "text-emerald-600 bg-emerald-50";
    return "text-gray-600 bg-gray-50";
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="spinner mr-3"></div>
            <span className="text-gray-600">Loading your files...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
          <div className="text-center">
            <svg
              className="w-12 h-12 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Files
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchFiles}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Files Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Upload your first file to get started with SnapVault
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Files ({files.length})
              </h2>
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {selectedFiles.size === files.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>
            <button
              onClick={fetchFiles}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* File List */}
        <div className="divide-y divide-gray-200">
          {files.map((file) => (
            <div
              key={file.id}
              className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                file.isExpired ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center space-x-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => handleFileSelect(file.id)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />

                {/* File Icon */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${getFileTypeColor(file.mimeType)}`}
                >
                  {file.icon}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </h3>
                    {file.isPublic && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Public
                      </span>
                    )}
                    {!file.isPublic && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        🔒 Private
                      </span>
                    )}
                    {file.isExpired && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{file.formattedSize}</span>
                    <span>•</span>
                    <span>Uploaded {formatDate(file.createdAt)}</span>
                    {file.expiresAt && !file.isExpired && (
                      <>
                        <span>•</span>
                        <span>Expires {formatDate(file.expiresAt)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{file.downloadCount} downloads</span>
                  </div>
                  {file.description && (
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {file.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {/* Copy Secure Link */}
                  <button
                    onClick={() => copySecureLink(file.id)}
                    disabled={file.isExpired}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy secure link (15 min expiry)"
                  >
                    {showCopySuccess === file.id ? (
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Download */}
                  <button
                    onClick={() => downloadFile(file)}
                    disabled={file.isExpired}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Secure download"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </button>

                  {/* Delete File */}
                  <button
                    onClick={() => deleteSingleFile(file.id, file.originalName)}
                    disabled={file.isExpired}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete file"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {selectedFiles.size > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  {deleteLoading ? "Deleting..." : "Delete Selected"}
                </button>
                <button
                  onClick={downloadSelectedFiles}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Download Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-slide-up">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Files
                  </h3>
                </div>

                <div className="mb-6">
                  <p className="text-gray-600 mb-3">
                    You are about to permanently delete{" "}
                    <span className="font-semibold text-gray-900">
                      {selectedFiles.size} file
                      {selectedFiles.size !== 1 ? "s" : ""}
                    </span>
                    .
                  </p>
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    ⚠️ This action cannot be undone. The files will be
                    permanently removed from your vault and cannot be recovered.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteSelectedFiles}
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 transition-colors flex items-center"
                  >
                    {deleteLoading && <div className="spinner mr-2"></div>}
                    {deleteLoading ? "Deleting..." : "Delete Files"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

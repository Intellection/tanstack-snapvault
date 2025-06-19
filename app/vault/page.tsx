"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthForm from "@/components/AuthForm";
import FileUpload from "@/components/FileUpload";
import FileList from "@/components/FileList";

export default function VaultPage() {
  const { user, loading, logout } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [currentView, setCurrentView] = useState<"upload" | "files" | "debug">(
    "upload",
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Debug: Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        console.log("Debug - Auth check response:", response.status, data);
        setDebugInfo({ status: response.status, data });
      } catch (error: any) {
        console.error("Debug - Auth check error:", error);
        setDebugInfo({ error: error.message });
      }
    };

    if (user) {
      checkAuth();
    }
  }, [user]);

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
    setCurrentView("files");
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SnapVault...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">SnapVault</h1>
            <p className="text-gray-600">
              Your secure, private file storage vault
            </p>
          </div>

          <AuthForm mode={authMode} onModeChange={setAuthMode} />

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Secure • Private • Temporary</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">SnapVault</h1>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView("upload")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === "upload"
                    ? "bg-primary-100 text-primary-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => setCurrentView("files")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === "files"
                    ? "bg-primary-100 text-primary-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                My Files
              </button>
              <button
                onClick={() => setCurrentView("debug")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === "debug"
                    ? "bg-yellow-100 text-yellow-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Debug
              </button>
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user.username}</span>
              </div>
              <div className="flex items-center space-x-2">
                {user.stats && (
                  <div className="text-xs text-gray-500">
                    {user.stats.fileCount} files •{" "}
                    {Math.round(user.stats.storageUsed / 1024 / 1024)} MB
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Logout"
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "upload" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Files to Your Vault
              </h2>
              <p className="text-gray-600">
                Securely store and share your files with temporary access links
              </p>
            </div>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {currentView === "files" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your File Vault
              </h2>
              <p className="text-gray-600">
                Manage your uploaded files and access links
              </p>
            </div>
            <FileList refreshTrigger={refreshTrigger} />
          </div>
        )}

        {currentView === "debug" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Debug Information
              </h2>
              <p className="text-gray-600">Authentication and system status</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">User Status</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify({ user, loading }, null, 2)}
              </pre>

              <h3 className="text-lg font-semibold mb-4 mt-6">Auth Check</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>

              <h3 className="text-lg font-semibold mb-4 mt-6">Cookies</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {document.cookie || "No cookies found"}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              © 2024 SnapVault. Secure file storage made simple.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>Max file size: 50MB</span>
              <span>•</span>
              <span>Files auto-expire based on settings</span>
              <span>•</span>
              <span>Your data is secure and private</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

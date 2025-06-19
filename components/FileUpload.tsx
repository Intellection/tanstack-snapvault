'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface FileUploadProps {
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  result?: any;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadOptions, setUploadOptions] = useState({
    isPublic: false,
    expiresIn: 0,
    description: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`;
    }
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`;
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', uploadOptions.description);
    formData.append('isPublic', uploadOptions.isPublic.toString());
    if (uploadOptions.expiresIn > 0) {
      formData.append('expiresIn', uploadOptions.expiresIn.toString());
    }

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const validFiles: File[] = [];
    const invalidFiles: { file: File; error: string }[] = [];

    // Validate files
    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        invalidFiles.push({ file, error });
      } else {
        validFiles.push(file);
      }
    });

    // Show errors for invalid files
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, error }) => {
        console.error(`Invalid file ${file.name}: ${error}`);
      });
    }

    if (validFiles.length === 0) {
      return;
    }

    // Initialize uploading files state
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload files one by one
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const uploadingFileIndex = uploadingFiles.length + i;

      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => {
            const updated = [...prev];
            if (updated[uploadingFileIndex] && updated[uploadingFileIndex].progress < 90) {
              updated[uploadingFileIndex].progress += 10;
            }
            return updated;
          });
        }, 200);

        const result = await uploadFile(file);

        clearInterval(progressInterval);

        // Update status to success
        setUploadingFiles(prev => {
          const updated = [...prev];
          if (updated[uploadingFileIndex]) {
            updated[uploadingFileIndex].progress = 100;
            updated[uploadingFileIndex].status = 'success';
            updated[uploadingFileIndex].result = result;
          }
          return updated;
        });
      } catch (error: any) {
        // Update status to error
        setUploadingFiles(prev => {
          const updated = [...prev];
          if (updated[uploadingFileIndex]) {
            updated[uploadingFileIndex].status = 'error';
            updated[uploadingFileIndex].error = error.message;
          }
          return updated;
        });
      }
    }

    // Call completion callback
    onUploadComplete();

    // Clear uploading files after a delay
    setTimeout(() => {
      setUploadingFiles([]);
    }, 3000);
  }, [uploadingFiles.length, uploadOptions, onUploadComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!user) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Options */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={uploadOptions.isPublic}
                onChange={(e) => setUploadOptions(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Make files public</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires in (hours)
            </label>
            <select
              value={uploadOptions.expiresIn}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, expiresIn: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={0}>Never</option>
              <option value={1}>1 hour</option>
              <option value={24}>24 hours</option>
              <option value={168}>1 week</option>
              <option value={720}>1 month</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={uploadOptions.description}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Optional description"
            />
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M28 8H12a4 4 0 00-4 4v36l8-8 8 8 8-8 8 8V12a4 4 0 00-4-4h-4m-4 0V4a4 4 0 00-4-4h-4a4 4 0 00-4 4v4m8 0a4 4 0 004 4h4"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-600 mb-4">
              Upload images, documents, archives, and more
            </p>
            <button
              onClick={handleBrowseFiles}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse Files
            </button>
          </div>

          <div className="text-sm text-gray-500">
            <p>Maximum file size: 50MB</p>
            <p>Supported formats: Images, PDF, Text, Office documents, Archives</p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Uploading Files ({uploadingFiles.length})
          </h3>
          <div className="space-y-4">
            {uploadingFiles.map((uploadingFile, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {uploadingFile.status === 'success' ? (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : uploadingFile.status === 'error' ? (
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="spinner"></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadingFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadingFile.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {uploadingFile.status === 'success' && (
                      <span className="text-sm text-green-600 font-medium">Uploaded</span>
                    )}
                    {uploadingFile.status === 'error' && (
                      <span className="text-sm text-red-600 font-medium">Failed</span>
                    )}
                    {uploadingFile.status === 'uploading' && (
                      <span className="text-sm text-gray-600">{uploadingFile.progress}%</span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {uploadingFile.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadingFile.progress}%` }}
                    ></div>
                  </div>
                )}

                {/* Error Message */}
                {uploadingFile.status === 'error' && uploadingFile.error && (
                  <div className="mt-2 text-sm text-red-600">
                    {uploadingFile.error}
                  </div>
                )}

                {/* Success Info */}
                {uploadingFile.status === 'success' && uploadingFile.result && (
                  <div className="mt-2 text-sm text-green-600">
                    File uploaded successfully! Access at: {uploadingFile.result.url}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

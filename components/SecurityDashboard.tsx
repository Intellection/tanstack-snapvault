'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AccessLog {
  id: string;
  file_id: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  action: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

interface SecurityStats {
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  uniqueIPs: number;
  suspiciousActivity: boolean;
  suspiciousReasons: string[];
}

interface SecurityDashboardProps {
  fileId?: string;
}

export default function SecurityDashboard({ fileId }: SecurityDashboardProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedFile, setSelectedFile] = useState<string>(fileId || 'all');
  const [userFiles, setUserFiles] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (user) {
      fetchUserFiles();
      fetchAccessLogs();
    }
  }, [user, selectedTimeRange, selectedFile]);

  const fetchUserFiles = async () => {
    try {
      const response = await fetch('/api/files/my', {
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok) {
        setUserFiles(data.files.map((f: any) => ({
          id: f.id,
          name: f.originalName
        })));
      }
    } catch (error) {
      console.error('Failed to fetch user files:', error);
    }
  };

  const fetchAccessLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        timeRange: selectedTimeRange,
        ...(selectedFile !== 'all' && { fileId: selectedFile })
      });

      const response = await fetch(`/api/files/access-logs?${params}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch access logs');
      }

      setLogs(data.logs || []);
      setStats(data.stats || null);
    } catch (error: any) {
      console.error('Error fetching access logs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'download_access':
        return '⬇️';
      case 'view_access':
        return '👁️';
      case 'info_access':
        return 'ℹ️';
      case 'generate_download_url':
        return '🔗';
      case 'secure_access':
        return '🔒';
      case 'access_check':
        return '✅';
      case 'revoke_access':
        return '🚫';
      default:
        return '📝';
    }
  };

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'text-red-600 bg-red-50';

    switch (action) {
      case 'download_access':
        return 'text-blue-600 bg-blue-50';
      case 'view_access':
        return 'text-green-600 bg-green-50';
      case 'info_access':
        return 'text-gray-600 bg-gray-50';
      case 'generate_download_url':
      case 'generate_view_url':
        return 'text-purple-600 bg-purple-50';
      case 'secure_access':
        return 'text-indigo-600 bg-indigo-50';
      case 'revoke_access':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const maskIPAddress = (ip: string) => {
    if (!ip || ip === 'unknown') return 'Unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.***`;
    }
    return ip.substring(0, 8) + '***';
  };

  const maskUserAgent = (ua: string) => {
    if (!ua) return 'Unknown';
    const maxLength = 50;
    if (ua.length > maxLength) {
      return ua.substring(0, maxLength) + '...';
    }
    return ua;
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
            <span className="text-gray-600">Loading security dashboard...</span>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Security Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchAccessLogs}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Security Dashboard</h2>
          <div className="flex items-center space-x-4">
            {/* File Filter */}
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Files</option>
              {userFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>

            {/* Time Range Filter */}
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <button
              onClick={fetchAccessLogs}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-blue-600 text-sm font-medium">Total Accesses</div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalAccesses}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-green-600 text-sm font-medium">Successful</div>
              <div className="text-2xl font-bold text-green-900">{stats.successfulAccesses}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-red-600 text-sm font-medium">Failed</div>
              <div className="text-2xl font-bold text-red-900">{stats.failedAccesses}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-purple-600 text-sm font-medium">Unique IPs</div>
              <div className="text-2xl font-bold text-purple-900">{stats.uniqueIPs}</div>
            </div>
            <div className={`rounded-lg p-4 ${stats.suspiciousActivity ? 'bg-yellow-50' : 'bg-gray-50'}`}>
              <div className={`text-sm font-medium ${stats.suspiciousActivity ? 'text-yellow-600' : 'text-gray-600'}`}>
                Security Status
              </div>
              <div className={`text-lg font-bold ${stats.suspiciousActivity ? 'text-yellow-900' : 'text-gray-900'}`}>
                {stats.suspiciousActivity ? '⚠️ Alert' : '✅ Normal'}
              </div>
            </div>
          </div>
        )}

        {/* Suspicious Activity Alert */}
        {stats?.suspiciousActivity && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Suspicious Activity Detected</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {stats.suspiciousReasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Access Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Access Logs ({logs.length})
          </h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Access Logs</h3>
            <p className="text-gray-600">No file access activity found for the selected time range.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Action Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getActionColor(log.action, log.success)}`}>
                      {getActionIcon(log.action)}
                    </div>

                    {/* Log Details */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {!log.success && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Failed
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 mt-1">
                        <span className="mr-4">📍 {maskIPAddress(log.ip_address || 'unknown')}</span>
                        <span>{formatDate(log.created_at)}</span>
                      </div>

                      {log.user_agent && (
                        <div className="text-xs text-gray-500 mt-1">
                          🖥️ {maskUserAgent(log.user_agent)}
                        </div>
                      )}

                      {log.error_message && (
                        <div className="text-xs text-red-600 mt-1 bg-red-50 rounded px-2 py-1">
                          ❌ {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    {log.success ? (
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    ) : (
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🛡️ Security Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Secure URLs expire automatically (default: 15 minutes) to limit unauthorized access</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>IP restrictions are applied to prevent link sharing from different locations</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Failed access attempts are logged and monitored for suspicious patterns</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Private files require authentication even with valid links</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Rate limiting prevents brute force attacks and excessive requests</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { infoService } from '../services/infoService';
import { useAuth } from '../context/AuthContext';
import {
  FiServer,
  FiDatabase,
  FiCpu,
  FiHardDrive,
  FiRefreshCw,
  FiTrash2,
} from 'react-icons/fi';

const System = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const healthData = await infoService.healthCheck();
      setHealth(healthData);
    } catch (error) {
      console.error('Error fetching health:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Are you sure you want to cleanup old logs?')) {
      return;
    }

    try {
      setCleaning(true);
      await infoService.cleanupLogs();
      alert('Log cleanup completed successfully');
      fetchHealth();
    } catch (error) {
      alert('Error cleaning up logs');
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="System Information">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="System Information">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">System health and performance metrics</p>
          <div className="flex space-x-2">
            <button
              onClick={fetchHealth}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={handleCleanup}
                disabled={cleaning}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <FiTrash2 className="w-4 h-4" />
                <span>{cleaning ? 'Cleaning...' : 'Cleanup Logs'}</span>
              </button>
            )}
          </div>
        </div>

        {health && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">System Status</h3>
                  <FiServer className="w-5 h-5 text-primary-600" />
                </div>
                <p className="text-2xl font-bold text-green-600 capitalize">{health.status}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Uptime: {Math.floor(health.uptime / 3600)}h{' '}
                  {Math.floor((health.uptime % 3600) / 60)}m
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Database</h3>
                  <FiDatabase className="w-5 h-5 text-primary-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {health.database?.status || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {health.database?.readyState === 1 ? 'Connected' : 'Disconnected'}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">CPU</h3>
                  <FiCpu className="w-5 h-5 text-primary-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {health.system?.cpus || 'N/A'} cores
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Platform: {health.system?.platform}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Memory</h3>
                  <FiHardDrive className="w-5 h-5 text-primary-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {health.memory?.systemUsagePercent || 'N/A'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {health.memory?.systemUsed} / {health.memory?.systemTotal}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Memory Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">RSS</p>
                  <p className="text-lg font-medium text-gray-900">{health.memory?.rss}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Heap Total</p>
                  <p className="text-lg font-medium text-gray-900">
                    {health.memory?.heapTotal}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Heap Used</p>
                  <p className="text-lg font-medium text-gray-900">{health.memory?.heapUsed}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">External</p>
                  <p className="text-lg font-medium text-gray-900">
                    {health.memory?.external}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Platform</p>
                  <p className="text-lg font-medium text-gray-900">
                    {health.system?.platform || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Architecture</p>
                  <p className="text-lg font-medium text-gray-900">
                    {health.system?.arch || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CPU Cores</p>
                  <p className="text-lg font-medium text-gray-900">
                    {health.system?.cpus || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">File Descriptors</p>
                  <p className="text-lg font-medium text-gray-900">
                    {health.system?.fileDescriptors?.current || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default System;


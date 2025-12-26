import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { socketService } from '../services/socketService';
import { infoService } from '../services/infoService';
import { channelService } from '../services/channelService';
import { useAuth } from '../context/AuthContext';
import { FiActivity, FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import ChannelLogsModal from '../components/Monitoring/ChannelLogsModal';

const Monitoring = () => {
  const { user } = useAuth();
  const [streams, setStreams] = useState([]);
  const [logStates, setLogStates] = useState(new Map()); // channelId -> {status, freeze, dark}
  const [monitoringStats, setMonitoringStats] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const logIntervalsRef = useRef(new Map()); // Track log intervals per channel

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    // Fetch initial channels from API
    const fetchInitialChannels = async () => {
      try {
        const response = await channelService.getChannels(1, 1000);
        const channels = response.data || [];
        setStreams(channels);
        setLoading(false);
        
        // Setup log monitoring for each channel
        setupLogMonitoring(channels);
      } catch (error) {
        console.error('Error fetching channels:', error);
        setLoading(false);
      }
    };

    fetchInitialChannels();
    fetchMonitoringStats();

    // Setup socket connection for stream updates
    const socket = socketService.connect(token);

    socket.on('connect', () => {
      console.log('Socket connected for monitoring');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    const handleStreams = (data) => {
      console.log('Received streams event:', data);
      if (Array.isArray(data)) {
        setStreams((prev) => {
          // Merge with existing log states
          return data.map((channel) => {
            const existing = prev.find((s) => s._id?.toString() === channel._id?.toString());
            return {
              ...channel,
              status: existing?.status,
              freeze: existing?.freeze,
              dark: existing?.dark,
            };
          });
        });
      }
    };

    const handleStreamsDelta = (delta) => {
      console.log('Received streamsDelta event:', delta);
      if (delta.changed && Array.isArray(delta.changed)) {
        setStreams((prev) => {
          const updated = [...prev];
          delta.changed.forEach((changedChannel) => {
            const index = updated.findIndex(
              (s) => s._id?.toString() === changedChannel._id?.toString()
            );
            if (index !== -1) {
              const existing = updated[index];
              updated[index] = {
                ...changedChannel,
                status: existing?.status,
                freeze: existing?.freeze,
                dark: existing?.dark,
              };
            } else {
              updated.push(changedChannel);
              // Setup log monitoring for new channel
              setupLogMonitoring([changedChannel]);
            }
          });
          return updated;
        });
      }
    };

    const handleUserStreams = (data) => {
      console.log('Received userStreams event:', data);
      if (Array.isArray(data)) {
        setStreams((prev) => {
          return data.map((channel) => {
            const existing = prev.find((s) => s._id?.toString() === channel._id?.toString());
            return {
              ...channel,
              status: existing?.status,
              freeze: existing?.freeze,
              dark: existing?.dark,
            };
          });
        });
        // Setup log monitoring for user channels
        setupLogMonitoring(data);
      }
    };

    const handleUserStreamsDelta = (delta) => {
      console.log('Received userStreamsDelta event:', delta);
      if (delta.changed && Array.isArray(delta.changed)) {
        setStreams((prev) => {
          const updated = [...prev];
          delta.changed.forEach((changedChannel) => {
            const index = updated.findIndex(
              (s) => s._id?.toString() === changedChannel._id?.toString()
            );
            if (index !== -1) {
              const existing = updated[index];
              updated[index] = {
                ...changedChannel,
                status: existing?.status,
                freeze: existing?.freeze,
                dark: existing?.dark,
              };
            } else {
              updated.push(changedChannel);
              setupLogMonitoring([changedChannel]);
            }
          });
          return updated;
        });
      }
    };

    // Listen to all events (both admin and user)
    socket.on('streams', handleStreams);
    socket.on('streamsDelta', handleStreamsDelta);
    socket.on('userStreams', handleUserStreams);
    socket.on('userStreamsDelta', handleUserStreamsDelta);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off('streams', handleStreams);
      socket.off('streamsDelta', handleStreamsDelta);
      socket.off('userStreams', handleUserStreams);
      socket.off('userStreamsDelta', handleUserStreamsDelta);
      
      // Cleanup log intervals
      logIntervalsRef.current.forEach((interval) => clearInterval(interval));
      logIntervalsRef.current.clear();
    };
  }, [user]);

  // Setup log monitoring for channels
  const setupLogMonitoring = (channels) => {
    const socket = socketService.getSocket();
    if (!socket || !socket.connected) {
      // Wait for socket to connect
      setTimeout(() => setupLogMonitoring(channels), 1000);
      return;
    }

    channels.forEach((channel) => {
      const channelId = channel._id?.toString();
      if (!channelId) return;

      // Join logs room for this channel
      socket.emit('join_logs', { id: channelId });

      // Clear existing interval if any
      if (logIntervalsRef.current.has(channelId)) {
        clearInterval(logIntervalsRef.current.get(channelId));
      }

      // Listen for live logs for this channel
      const handleLiveLogs = (data) => {
        if (data.channelId === channelId && data.data) {
          const logData = data.data;
          
          // Update log states
          setLogStates((prev) => {
            const newMap = new Map(prev);
            newMap.set(channelId, {
              status: logData.status,
              freeze: logData.freeze,
              dark: logData.dark,
            });
            return newMap;
          });

          // Update streams with log state
          setStreams((prev) => {
            return prev.map((s) => {
              if (s._id?.toString() === channelId) {
                return {
                  ...s,
                  status: logData.status || s.status,
                  freeze: logData.freeze || s.freeze,
                  dark: logData.dark || s.dark,
                };
              }
              return s;
            });
          });
        }
      };

      socket.on('live_logs', handleLiveLogs);

      // Store cleanup function
      logIntervalsRef.current.set(channelId, () => {
        socket.off('live_logs', handleLiveLogs);
      });
    });
  };

  const fetchMonitoringStats = async () => {
    try {
      const stats = await infoService.getMonitoringStats();
      setMonitoringStats(stats);
    } catch (error) {
      console.error('Error fetching monitoring stats:', error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await channelService.getChannels(1, 1000);
      const channels = response.data || [];
      setStreams(channels);
      setupLogMonitoring(channels);
      await fetchMonitoringStats();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-100 text-green-800';
      case 'OFFLINE':
        return 'bg-red-100 text-red-800';
      case 'UNSTABLE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ONLINE':
        return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'OFFLINE':
        return <FiXCircle className="w-5 h-5 text-red-600" />;
      case 'UNSTABLE':
        return <FiAlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <FiActivity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <DashboardLayout title="Stream Monitoring">
      <div className="space-y-6">
        {monitoringStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Monitors</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringStats.monitoring?.total || monitoringStats.monitoring?.totalMonitors || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Active Monitors</p>
              <p className="text-2xl font-bold text-green-600">
                {monitoringStats.monitoring?.active || monitoringStats.monitoring?.activeMonitors || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringStats.memory?.heapUsed || 'N/A'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Log Files</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringStats.logs?.totalFiles || 0}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Channel Streams</h2>
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : streams.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">No streams found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Freeze
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dark Screen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {streams.map((stream) => {
                    const status = stream.status || 'UNKNOWN';
                    const freeze = stream.freeze || 'END';
                    const dark = stream.dark || 'END';
                    return (
                      <tr key={stream._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {stream.name || stream._id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(status)}
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              freeze === 'START'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {freeze === 'START' ? 'Active' : 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              dark === 'START'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {dark === 'START' ? 'Active' : 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {stream.author?.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedChannel(stream._id)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View Logs
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedChannel && (
        <ChannelLogsModal
          channelId={selectedChannel}
          onClose={() => setSelectedChannel(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default Monitoring;

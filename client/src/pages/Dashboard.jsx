import { useEffect, useState } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { channelService } from '../services/channelService';
import { epgService } from '../services/epgService';
import { infoService } from '../services/infoService';
import { FiTv, FiFileText, FiActivity, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const Dashboard = () => {
  const [stats, setStats] = useState({
    channels: 0,
    epgFiles: 0,
    onlineChannels: 0,
    offlineChannels: 0,
  });
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [channelsRes, epgRes, healthRes] = await Promise.all([
          channelService.getChannels(1, 1),
          epgService.getAllEpgFiles(),
          infoService.healthCheck(),
        ]);

        setStats({
          channels: channelsRes.pagination?.total || 0,
          epgFiles: epgRes.data?.length || 0,
          onlineChannels: 0, // Will be updated via socket
          offlineChannels: 0, // Will be updated via socket
        });

        setHealth(healthRes);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Channels',
      value: stats.channels,
      icon: FiTv,
      color: 'bg-blue-500',
    },
    {
      title: 'EPG Files',
      value: stats.epgFiles,
      icon: FiFileText,
      color: 'bg-green-500',
    },
    {
      title: 'Online Channels',
      value: stats.onlineChannels,
      icon: FiCheckCircle,
      color: 'bg-emerald-500',
    },
    {
      title: 'Offline Channels',
      value: stats.offlineChannels,
      icon: FiXCircle,
      color: 'bg-red-500',
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                    </div>
                    <div className={`${card.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {health && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-medium text-green-600 capitalize">
                    {health.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Database</p>
                  <p className="text-lg font-medium capitalize">
                    {health.database?.status || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-lg font-medium">
                    {Math.floor(health.uptime / 3600)}h{' '}
                    {Math.floor((health.uptime % 3600) / 60)}m
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;


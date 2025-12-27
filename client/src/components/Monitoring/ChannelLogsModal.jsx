import { useState, useEffect } from 'react';
import { socketService } from '../../services/socketService';
import { FiX, FiActivity } from 'react-icons/fi';

const ChannelLogsModal = ({ channelId, onClose }) => {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const channelIdStr = channelId?.toString();
    if (!channelIdStr) return;

    const socket = socketService.getSocket();
    
    const setupLogListener = (sock) => {
      if (!sock) return null;

      // Join logs room
      sock.emit('join_logs', { id: channelIdStr });

      const handleLiveLogs = (data) => {
        const dataChannelId = data.channelId?.toString();
        if (dataChannelId === channelIdStr) {
          console.log('Received live logs for channel:', channelIdStr, data);
          setLogs(data.data);
          setLoading(false);
        }
      };

      sock.on('live_logs', handleLiveLogs);

      // If already connected, join immediately
      if (sock.connected) {
        sock.emit('join_logs', { id: channelIdStr });
      } else {
        // Wait for connection
        sock.once('connect', () => {
          sock.emit('join_logs', { id: channelIdStr });
        });
      }

      return () => {
        sock.off('live_logs', handleLiveLogs);
      };
    };

    let cleanup = null;

    if (socket && socket.connected) {
      cleanup = setupLogListener(socket);
    } else {
      // Connect if not connected
      const token = localStorage.getItem('token');
      if (token) {
        const newSocket = socketService.connect(token);
        newSocket.once('connect', () => {
          cleanup = setupLogListener(newSocket);
        });
      }
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [channelId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Channel Logs</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : logs ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="text-lg font-semibold text-gray-900">{logs.status || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Freeze</p>
                  <p className="text-lg font-semibold text-gray-900">{logs.freeze || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Dark Screen</p>
                  <p className="text-lg font-semibold text-gray-900">{logs.dark || 'N/A'}</p>
                </div>
              </div>

              {logs.logs && logs.logs.length > 0 ? (
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 max-h-96 overflow-y-auto">
                  {logs.logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FiActivity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No logs available</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <FiActivity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No logs available for this channel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelLogsModal;


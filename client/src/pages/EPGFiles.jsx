import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { epgService } from '../services/epgService';
import { channelService } from '../services/channelService';
import { FiUpload, FiTrash2, FiDownload, FiFileText } from 'react-icons/fi';
import EPGUploadModal from '../components/EPG/EPGUploadModal';

const EPGFiles = () => {
  const [epgFiles, setEpgFiles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    fetchEPGFiles();
    fetchChannels();
  }, []);

  const fetchEPGFiles = async () => {
    try {
      setLoading(true);
      const response = await epgService.getAllEpgFiles();
      setEpgFiles(response.data || []);
    } catch (error) {
      console.error('Error fetching EPG files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await channelService.getChannels(1, 1000);
      setChannels(response.data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this EPG file?')) {
      try {
        await epgService.deleteEpgFile(id);
        fetchEPGFiles();
      } catch (error) {
        alert('Error deleting EPG file');
      }
    }
  };

  const getDownloadUrl = (channelName, filename) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3050';
    const username = channelName?.replace(/ /g, '_');
    return `${baseUrl}/public/output/${username}/${filename}`;
  };

  return (
    <DashboardLayout title="EPG Files">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage Electronic Program Guide files</p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiUpload className="w-5 h-5" />
            <span>Upload EPG File</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {epgFiles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No EPG files found
                    </td>
                  </tr>
                ) : (
                  epgFiles.map((file) => (
                    <tr key={file._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiFileText className="w-5 h-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {file.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {file.channel?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{file.author?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <div className="flex space-x-2">
                            <a
                              href={getDownloadUrl(file.channel?.name, 'SwiftTv.xlsx')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                              title="Download SwiftTv.xlsx"
                            >
                              <FiDownload className="w-5 h-5" />
                            </a>
                            <a
                              href={getDownloadUrl(file.channel?.name, 'YuppTv.xlsx')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-900"
                              title="Download YuppTv.xlsx"
                            >
                              <FiDownload className="w-5 h-5" />
                            </a>
                            <a
                              href={getDownloadUrl(file.channel?.name, 'DistroTv.xml')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-900"
                              title="Download DistroTv.xml"
                            >
                              <FiDownload className="w-5 h-5" />
                            </a>
                          </div>
                          <button
                            onClick={() => handleDelete(file._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isUploadModalOpen && (
        <EPGUploadModal
          channels={channels}
          onClose={() => {
            setIsUploadModalOpen(false);
            fetchEPGFiles();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default EPGFiles;


import api from './api';

export const infoService = {
  healthCheck: async () => {
    const response = await api.get('/info/health');
    return response.data;
  },

  getLanguages: async () => {
    const response = await api.get('/info/languages');
    return response.data;
  },

  getChannelCategories: async () => {
    const response = await api.get('/info/channel-categories');
    return response.data;
  },

  getMonitoringStats: async () => {
    const response = await api.get('/info/monitoring');
    return response.data;
  },

  cleanupLogs: async () => {
    const response = await api.post('/info/logs/cleanup');
    return response.data;
  },
};


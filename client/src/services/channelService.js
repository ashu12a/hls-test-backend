import api from './api';

export const channelService = {
  getChannels: async (page = 1, limit = 10) => {
    const response = await api.get('/channel', { params: { page, limit } });
    return response.data;
  },

  getChannel: async (id) => {
    const response = await api.get(`/channel/one/${id}`);
    return response.data;
  },

  createChannel: async (channelData) => {
    const response = await api.post('/channel/create', channelData);
    return response.data;
  },

  updateChannel: async (id, channelData) => {
    const response = await api.put(`/channel/update/${id}`, channelData);
    return response.data;
  },

  deleteChannel: async (id) => {
    const response = await api.delete(`/channel/delete/${id}`);
    return response.data;
  },
};


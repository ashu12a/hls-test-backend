import api from './api';

export const epgService = {
  getAllEpgFiles: async () => {
    const response = await api.get('/epg/all');
    return response.data;
  },

  uploadEpgFile: async (formData) => {
    const response = await api.post('/epg/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteEpgFile: async (id) => {
    const response = await api.delete(`/epg/delete/${id}`);
    return response.data;
  },
};


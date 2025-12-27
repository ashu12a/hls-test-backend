import api from './api';

export const userService = {
  getUsers: async (page = 1, limit = 10) => {
    const response = await api.get('/user/user-list', { params: { page, limit } });
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/user/update/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/user/${id}`);
    return response.data;
  },
};


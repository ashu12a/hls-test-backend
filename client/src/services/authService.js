import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/user/login', { email, password });
    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      return response.data;
    }
    throw new Error(response.data.error || 'Login failed');
  },

  getCurrentUser: async () => {
    const response = await api.get('/user/me');
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/user/register', userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};


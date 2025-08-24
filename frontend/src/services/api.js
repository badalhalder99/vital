import axios from 'axios';

const API_BASE_URL = 'http://localhost:3005';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Multi-tenant API functions
export const tenantAPI = {
  // Get all tenants
  getTenants: async () => {
    try {
      const response = await api.get('/api/users/tenants');
      return response.data;
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw error;
    }
  },

  // Create new tenant
  createTenant: async (tenantData) => {
    try {
      const response = await api.post('/api/users/tenants', tenantData);
      return response.data;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  },

  // Get users with tenant filtering
  getUsers: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.tenant_id) {
        params.append('tenant_id', options.tenant_id);
      }
      
      if (options.all_tenants) {
        params.append('all_tenants', 'true');
      }

      const url = `/api/users${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Create user with tenant assignment
  createUser: async (userData) => {
    try {
      const response = await api.post('/api/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update tenant
  updateTenant: async (tenantId, updateData) => {
    try {
      const response = await api.put(`/api/users/tenants/${tenantId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  },

  // Delete tenant
  deleteTenant: async (tenantId) => {
    try {
      const response = await api.delete(`/api/users/tenants/${tenantId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting tenant:', error);
      throw error;
    }
  }
};

export default api;
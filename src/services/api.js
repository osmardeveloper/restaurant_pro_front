// ============================================================
// src/services/api.js — Instancia de Axios configurada
// ============================================================
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (datos) => api.post('/auth/login', datos),
};

export const usuarioService = {
  getAll:  ()          => api.get('/usuarios'),
  getById: (id)        => api.get(`/usuarios/${id}`),
  create:  (datos)     => api.post('/usuarios', datos),
  update:  (id, datos) => api.put(`/usuarios/${id}`, datos),
  remove:  (id)        => api.delete(`/usuarios/${id}`),
};

export const productoService = {
  getAll:  (tipo)     => api.get('/productos', { params: { tipo } }),
  getById: (id)       => api.get(`/productos/${id}`),
  create:  (datos)    => api.post('/productos', datos),
  update:  (id, datos) => api.put(`/productos/${id}`, datos),
  remove:  (id)       => api.delete(`/productos/${id}`),
};

export const mesaService = {
  getAll:  ()          => api.get('/mesas'),
  getById: (id)        => api.get(`/mesas/${id}`),
  create:  (datos)     => api.post('/mesas', datos),
  update:  (id, datos) => api.put(`/mesas/${id}`, datos),
  remove:  (id)        => api.delete(`/mesas/${id}`),
};

export const clienteService = {
  getAll:  ()          => api.get('/clientes'),
  getById: (id)        => api.get(`/clientes/${id}`),
  create:  (datos)     => api.post('/clientes', datos),
  update:  (id, datos) => api.put(`/clientes/${id}`, datos),
  remove:  (id)        => api.delete(`/clientes/${id}`),
};

export const comandaService = {
  getAll:  ()      => api.get('/comandas'),
  getById: (id)    => api.get(`/comandas/${id}`),
  create:  (datos) => api.post('/comandas', datos),
  update:  (id, datos) => api.put(`/comandas/${id}`, datos),
};

export const facturacionService = {
  getAll:  ()      => api.get('/facturacion'),
  getById: (id)    => api.get(`/facturacion/${id}`),
  create:  (datos) => api.post('/facturacion', datos),
};

export const gastoService = {
  getAll: () => api.get('/gastos'),
  create: (datos) => api.post('/gastos', datos),
  update: (id, datos) => api.put(`/gastos/${id}`, datos),
  remove: (id) => api.delete(`/gastos/${id}`),
};

export default api;

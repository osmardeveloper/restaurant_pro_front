// ============================================================
// src/services/api.js — Instancia de Axios configurada
// ============================================================
import axios from 'axios';

// Detectar si estamos en desarrollo o producción
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const api = axios.create({
  baseURL: isDevelopment
    ? 'http://localhost:5000/api'
    : 'https://restaurant-pro-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  }
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
    // Solo redirigir a /login si es error 401 Y no estamos ya en la página de login/menu
    if (error.response?.status === 401 && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/menu')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Instancia pública para rutas sin autenticación (sin interceptor de redirect)
const publicApi = axios.create({
  baseURL: isDevelopment
    ? 'http://localhost:5000/api'
    : 'https://restaurant-pro-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

export const authService = {
  login: (datos) => api.post('/auth/login', datos),
};

export const usuarioService = {
  getAll:  ()          => api.get('/usuarios'),
  getById: (id)        => api.get(`/usuarios/${id}`),
  create:  (datos)     => api.post('/usuarios', datos),
  update:  (id, datos) => api.put(`/usuarios/${id}`, datos),
  remove:  (id, masterKey) => api.delete(`/usuarios/${id}`, { headers: { 'x-master-key': masterKey } }),
};

export const productoService = {
  getAll:  (tipo)     => api.get('/productos', { params: { tipo } }),
  getById: (id)       => api.get(`/productos/${id}`),
  create:  (datos)    => api.post('/productos', datos),
  update:  (id, datos) => api.put(`/productos/${id}`, datos),
  remove:  (id, masterKey) => api.delete(`/productos/${id}`, { headers: { 'x-master-key': masterKey } }),
};

export const categoriasProductosService = {
  getAll:  ()          => api.get('/categorias-productos'),
  getById: (id)        => api.get(`/categorias-productos/${id}`),
  create:  (datos)     => api.post('/categorias-productos', datos),
  update:  (id, datos) => api.put(`/categorias-productos/${id}`, datos),
  remove:  (id, masterKey) => api.delete(`/categorias-productos/${id}`, { headers: { 'x-master-key': masterKey } }),
};

export const mesaService = {
  getAll:  ()          => api.get('/mesas'),
  getById: (id)        => api.get(`/mesas/${id}`),
  create:  (datos)     => api.post('/mesas', datos),
  update:  (id, datos) => api.put(`/mesas/${id}`, datos),
  remove:  (id, masterKey) => api.delete(`/mesas/${id}`, { headers: { 'x-master-key': masterKey } }),
};

export const clienteService = {
  getAll:  ()          => api.get('/clientes'),
  getById: (id)        => api.get(`/clientes/${id}`),
  create:  (datos)     => api.post('/clientes', datos),
  update:  (id, datos) => api.put(`/clientes/${id}`, datos),
  remove:  (id, masterKey) => api.delete(`/clientes/${id}`, { headers: { 'x-master-key': masterKey } }),
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
  remove:  (id, masterKey) => api.delete(`/facturacion/${id}`, { headers: { 'x-master-key': masterKey } }),
};

export const gastoService = {
  getAll: () => api.get('/gastos'),
  create: (datos) => api.post('/gastos', datos),
  update: (id, datos) => api.put(`/gastos/${id}`, datos),
  remove: (id, masterKey) => api.delete(`/gastos/${id}`, { headers: { 'x-master-key': masterKey } }),
};

export const costoService = {
  getAll: () => api.get('/costos'),
  create: (datos) => api.post('/costos', datos),
  update: (id, datos) => api.put(`/costos/${id}`, datos),
  remove: (id, masterKey) => api.delete(`/costos/${id}`, { headers: { 'x-master-key': masterKey } }),
};

export const configuracionService = {
  getByUser: (id_usuario) => api.get(`/configuraciones/usuario/${id_usuario}`),
  save: (datos) => api.post('/configuraciones', datos),
};

export const movimientoService = {
  getAll: (params) => api.get('/inventario', { params }),
  create: (datos)  => api.post('/inventario', datos),
};

// ============================================================
// Servicios Públicos (para rutas sin autenticación)
// ============================================================
export const publicProductoService = {
  getAll: (tipo) => publicApi.get('/productos', { params: { tipo } }),
};

export const publicCategoriasService = {
  getAll: () => publicApi.get('/categorias-productos'),
};

export default api;

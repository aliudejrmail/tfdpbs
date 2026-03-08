import axios from 'axios';

// Determina a URL base da API
const getApiBaseUrl = (): string => {
    // Em produção, usa a variável de ambiente
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Em desenvolvimento, usa localhost:3333
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:3333/api';
    }
    // Fallback para outros casos (ex: IP da rede em desenvolvimento)
    return `http://${host}:3333/api`;
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('tfd_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('tfd_token');
            localStorage.removeItem('tfd_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default api;

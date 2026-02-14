import axios from 'axios';
import { Entorno } from '../Entorno/Entorno';

const api = axios.create({
    baseURL: Entorno.ApiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adicionar el token a todas las peticiones
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores globales (como el 401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Redirigir al login si el token ha expirado o es invalido
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

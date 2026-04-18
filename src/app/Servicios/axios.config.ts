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
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('usuario');
                    window.location.href = '/login';
                    return Promise.reject(new Error('Sesión expirada'));
                }
            } catch (e) {
                // Ignorar si el token no es JWT válido y dejar que el backend decida
            }
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
        if (error.response && [401, 403].includes(error.response.status)) {
            // Redirigir al login si el token ha expirado o es invalido
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

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

// Interceptor para manejar errores globales.
// Solo el 401 (no autenticado / token vencido) cierra la sesión. El 403 significa
// "autenticado pero sin permiso para esta acción" (p. ej. cerrar una caja no asignada):
// NO debe desloguear, se deja que el componente muestre el mensaje del error.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Redirigir al login si el token ha expirado o es inválido.
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

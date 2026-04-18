import { Injectable, signal, computed } from '@angular/core';
import api from './axios.config';
import { RespuestaLogin, UsuarioSesion } from '../Modelos/auth.modelo';

@Injectable({
    providedIn: 'root'
})
export class ServicioAutenticacion {
    // Signal para el usuario actual
    private _usuarioActual = signal<UsuarioSesion | null>(this.obtenerUsuarioDeLocalStorage());

    // Getter publico para el usuario
    usuarioActual = computed(() => this._usuarioActual());

    // Getter para saber si esta autenticado de manera real
    estaAutenticado = computed(() => {
        const token = localStorage.getItem('token');
        if (!this._usuarioActual() || !token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                return false; // Token expirado
            }
            return true;
        } catch {
            return false;
        }
    });

    constructor() { }

    async iniciarSesion(NombreUsuario: string, Clave: string): Promise<RespuestaLogin> {
        try {
            const respuesta = await api.post<RespuestaLogin>('login', {
                NombreUsuario,
                Clave,
            });

            if (respuesta.data.success) {
                const { Token, usuario } = respuesta.data.data;
                localStorage.setItem('token', Token);
                localStorage.setItem('usuario', JSON.stringify(usuario));
                this._usuarioActual.set(usuario);
            }

            return respuesta.data;
        } catch (error: any) {
            if (error.response && error.response.data) {
                return error.response.data;
            }
            return {
                success: false,
                tipo: 'Error',
                message: 'No se pudo conectar con el servidor',
                data: {} as any,
            };
        }
    }

    cerrarSesion(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        this._usuarioActual.set(null);
        window.location.href = '/login';
    }

    private obtenerUsuarioDeLocalStorage(): UsuarioSesion | null {
        const usuarioJson = localStorage.getItem('usuario');
        if (usuarioJson) {
            try {
                return JSON.parse(usuarioJson);
            } catch {
                return null;
            }
        }
        return null;
    }
}

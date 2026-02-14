import { Injectable } from '@angular/core';
import api from './axios.config';
import { Usuario } from '../Modelos/usuario.modelo';
import { Rol } from '../Modelos/rol.modelo';
import { RespuestaAPI } from '../Modelos/producto.modelo';

@Injectable({
    providedIn: 'root'
})
export class ServicioUsuario {

    constructor() { }

    // --- USUARIOS ---
    async obtenerUsuarios(): Promise<RespuestaAPI<Usuario[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<Usuario[]>>('usuario/listado');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearUsuario(usuario: Partial<Usuario>): Promise<RespuestaAPI<Usuario>> {
        try {
            const respuesta = await api.post<RespuestaAPI<Usuario>>('usuario/crear', usuario);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarUsuario(id: number, usuario: Partial<Usuario>): Promise<RespuestaAPI<Usuario>> {
        try {
            const respuesta = await api.put<RespuestaAPI<Usuario>>(`usuario/editar/${id}`, usuario);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarUsuario(id: number): Promise<RespuestaAPI<Usuario>> {
        try {
            const respuesta = await api.delete<RespuestaAPI<Usuario>>(`usuario/eliminar/${id}`);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // --- ROLES ---
    async obtenerRoles(): Promise<RespuestaAPI<Rol[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<Rol[]>>('rol/listado');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearRol(rol: Partial<Rol>): Promise<RespuestaAPI<Rol>> {
        try {
            const respuesta = await api.post<RespuestaAPI<Rol>>('rol/crear', rol);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarRol(id: number, rol: Partial<Rol>): Promise<RespuestaAPI<Rol>> {
        try {
            const respuesta = await api.put<RespuestaAPI<Rol>>(`rol/editar/${id}`, rol);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarRol(id: number): Promise<RespuestaAPI<Rol>> {
        try {
            const respuesta = await api.delete<RespuestaAPI<Rol>>(`rol/eliminar/${id}`);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    private manejarError(error: any): any {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return {
            success: false,
            message: 'Error de conexion con el servidor',
            tipo: 'Error',
            data: null
        };
    }
}

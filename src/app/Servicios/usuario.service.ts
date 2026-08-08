import { Injectable } from '@angular/core';
import api from './axios.config';
import { Usuario } from '../Modelos/usuario.modelo';
import { Rol, RolDetalleCompleto } from '../Modelos/rol.modelo';
import { RespuestaAPI } from '../Modelos/producto.modelo';

@Injectable({
    providedIn: 'root'
})
export class ServicioUsuario {

    constructor() { }

    // --- USUARIOS ---
    async obtenerUsuarios(): Promise<RespuestaAPI<Usuario[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<Usuario[]>>('administrativo/usuario-listado');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearUsuario(usuario: Partial<Usuario>): Promise<RespuestaAPI<Usuario>> {
        try {
            const respuesta = await api.post<RespuestaAPI<Usuario>>('administrativo/usuario-crear', usuario);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarUsuario(id: number, usuario: Partial<Usuario>): Promise<RespuestaAPI<Usuario>> {
        try {
            const respuesta = await api.put<RespuestaAPI<Usuario>>(`administrativo/usuario-editar/${id}`, usuario);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarUsuario(id: number): Promise<RespuestaAPI<Usuario>> {
        try {
            const respuesta = await api.delete<RespuestaAPI<Usuario>>(`administrativo/usuario-eliminar/${id}`);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // --- ROLES (endpoints "completo": rol + recursos/permisos en una sola llamada) ---
    // Listado con conteos (Usuarios/Recursos). Se mapea al modelo Rol de la tabla.
    async obtenerRoles(): Promise<RespuestaAPI<Rol[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<any[]>>('administrativo/rol-listado-completo');
            const cuerpo = respuesta.data;
            if (cuerpo?.success && Array.isArray(cuerpo.data)) {
                cuerpo.data = cuerpo.data.map((r: any) => ({
                    CodigoRol: r.CodigoRol,
                    NombreRol: r.NombreRol,
                    Estatus: r.Estatus,
                    CantidadUsuarios: r.Usuarios ?? 0,
                    CantidadPermisos: r.Recursos ?? 0
                }));
            }
            return cuerpo as RespuestaAPI<Rol[]>;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // Detalle de un rol con sus recursos asignados (para precargar los checks al editar)
    async obtenerRolCompleto(id: number): Promise<RespuestaAPI<RolDetalleCompleto>> {
        try {
            const respuesta = await api.get<RespuestaAPI<RolDetalleCompleto>>(`administrativo/rol-completo/${id}`);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // Crea el rol y asigna los recursos marcados. Body: { NombreRol, NombresRecurso: string[] }
    async crearRol(payload: { NombreRol: string; NombresRecurso: string[] }): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.post<RespuestaAPI<any>>('administrativo/rol-crear-completo', payload);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // Edita el rol y reemplaza sus recursos. Body: { CodigoRol, NombreRol, NombresRecurso: string[] }
    async editarRol(payload: { CodigoRol: number; NombreRol: string; NombresRecurso: string[] }): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.put<RespuestaAPI<any>>('administrativo/rol-editar-completo', payload);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // Elimina el rol junto con sus permisos asignados
    async eliminarRol(id: number): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.delete<RespuestaAPI<any>>(`administrativo/rol-eliminar-completo/${id}`);
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

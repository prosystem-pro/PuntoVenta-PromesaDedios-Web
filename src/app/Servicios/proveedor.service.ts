import { Injectable } from '@angular/core';
import api from './axios.config';
import { Proveedor, RespuestaProveedor } from '../Modelos/proveedor.modelo';

@Injectable({
    providedIn: 'root'
})
export class ServicioProveedor {

    constructor() { }

    async obtenerProveedores(): Promise<RespuestaProveedor> {
        try {
            const respuesta = await api.get<RespuestaProveedor>('proveedor/listado');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearProveedor(proveedor: Partial<Proveedor>): Promise<RespuestaProveedor> {
        try {
            const respuesta = await api.post<RespuestaProveedor>('proveedor/crear', proveedor);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarProveedor(id: number, proveedor: Partial<Proveedor>): Promise<RespuestaProveedor> {
        try {
            const respuesta = await api.put<RespuestaProveedor>(`proveedor/editar/${id}`, proveedor);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarProveedor(id: number): Promise<RespuestaProveedor> {
        try {
            const respuesta = await api.delete<RespuestaProveedor>(`proveedor/eliminar/${id}`);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    /**
     * Traduce errores conocidos del API (ej. SequelizeUniqueConstraintError → "NIT duplicado")
     * a mensajes en español listos para mostrar al usuario.
     */
    interpretarError(res: any): string {
        const tipo = res?.error?.type || '';
        const msgApi = res?.error?.message || res?.message || '';
        if (tipo === 'SequelizeUniqueConstraintError' || /validation error/i.test(msgApi)) {
            return 'Ya existe un proveedor registrado con este nombre.';
        }
        if (
            tipo === 'SequelizeForeignKeyConstraintError' ||
            /REFERENCE constraint|FOREIGN KEY|conflicted with the REFERENCE|foreign key constraint/i.test(msgApi)
        ) {
            return 'No es posible eliminar el proveedor porque tiene registros asociados.';
        }
        return msgApi || 'No se pudo procesar la solicitud del proveedor.';
    }

    private manejarError(error: any): RespuestaProveedor {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return {
            success: false,
            message: 'Error de conexion con el servidor',
            data: []
        };
    }
}

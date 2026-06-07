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
     * Interpreta errores del API. El API ya entrega mensajes claros en español
     * (duplicidad de nombre/NIT, validaciones de formato, etc.), así que se
     * muestran tal cual; solo se traduce lo que llega como error crudo.
     */
    interpretarError(res: any): string {
        const tipo = res?.error?.type || '';
        const msgApi = (res?.error?.message || res?.message || '').toString().trim();

        // Integridad referencial al eliminar (proveedor con compras asociadas)
        if (
            tipo === 'SequelizeForeignKeyConstraintError' ||
            /REFERENCE constraint|FOREIGN KEY|conflicted with the REFERENCE|foreign key constraint/i.test(msgApi)
        ) {
            return 'No es posible eliminar el proveedor porque tiene registros asociados.';
        }

        // Error crudo de Sequelize (poco descriptivo) -> texto legible.
        if (tipo === 'SequelizeUniqueConstraintError' || /^validation error\.?$/i.test(msgApi)) {
            return 'Ya existe un proveedor con datos duplicados (nombre o NIT).';
        }

        // Mensaje específico del API (ej. "Ya existe un proveedor con el nombre: X")
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

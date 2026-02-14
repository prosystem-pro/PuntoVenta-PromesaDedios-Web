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

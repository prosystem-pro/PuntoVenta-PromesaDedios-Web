import { Injectable } from '@angular/core';
import api from './axios.config';
import { Empresa } from '../Modelos/empresa.modelo';
import { Mesa } from '../Modelos/mesa.modelo';
import { ClasificacionMesa } from '../Modelos/clasificacion-mesa.modelo';
import { RespuestaAPI } from '../Modelos/producto.modelo';

@Injectable({
    providedIn: 'root'
})
export class ServicioConfiguracion {

    constructor() { }

    // --- EMPRESA ---
    async obtenerEmpresas(): Promise<RespuestaAPI<Empresa[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<Empresa[]>>('empresa/listado');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async actualizarEmpresa(id: number, empresa: Partial<Empresa>): Promise<RespuestaAPI<Empresa>> {
        try {
            const respuesta = await api.put<RespuestaAPI<Empresa>>(`empresa/editar/${id}`, empresa);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // --- MESAS ---
    async obtenerMesas(): Promise<RespuestaAPI<any[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<any[]>>('mesa/listado/porclasificacion');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearMesa(mesa: any): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.post<RespuestaAPI<any>>('mesa/crearcorrelativo', mesa);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarMesa(mesa: any): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.put<RespuestaAPI<any>>(`mesa/correlativos/editar`, mesa);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarMesa(datos: any): Promise<RespuestaAPI<any>> {
        try {
            // El API espera CodigoClasificacionMesa y Apodo en el body para eliminar correlativos
            const respuesta = await api.delete<RespuestaAPI<any>>(`mesa/correlativos/eliminar`, { data: datos });
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // --- CLASIFICACION MESAS ---
    async obtenerClasificaciones(): Promise<RespuestaAPI<ClasificacionMesa[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<ClasificacionMesa[]>>('clasificacionmesa/listado');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearClasificacion(clasificacion: Partial<ClasificacionMesa>): Promise<RespuestaAPI<ClasificacionMesa>> {
        try {
            const respuesta = await api.post<RespuestaAPI<ClasificacionMesa>>('clasificacionmesa/crear', clasificacion);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarClasificacion(id: number, clasificacion: Partial<ClasificacionMesa>): Promise<RespuestaAPI<ClasificacionMesa>> {
        try {
            const respuesta = await api.put<RespuestaAPI<ClasificacionMesa>>(`clasificacionmesa/editar/${id}`, clasificacion);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarClasificacion(id: number): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.delete<RespuestaAPI<any>>(`clasificacionmesa/eliminar/${id}`);
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

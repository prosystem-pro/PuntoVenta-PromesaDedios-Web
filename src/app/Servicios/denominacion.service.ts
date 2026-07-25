import { Injectable } from '@angular/core';
import api from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { Denominacion } from '../Modelos/denominacion.modelo';

@Injectable({
    providedIn: 'root'
})
export class DenominacionServicio {

    async listar(): Promise<RespuestaAPI<Denominacion[]>> {
        try {
            const res = await api.get<RespuestaAPI<Denominacion[]>>('denominacion/listado');
            return res.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crear(valor: number): Promise<RespuestaAPI<Denominacion>> {
        try {
            const res = await api.post<RespuestaAPI<Denominacion>>('denominacion/crear', { Valor: valor });
            return res.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editar(codigo: number, valor: number): Promise<RespuestaAPI<Denominacion>> {
        try {
            const res = await api.put<RespuestaAPI<Denominacion>>(`denominacion/editar/${codigo}`, { Valor: valor });
            return res.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminar(codigo: number): Promise<RespuestaAPI<any>> {
        try {
            const res = await api.delete<RespuestaAPI<any>>(`denominacion/eliminar/${codigo}`);
            return res.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    private manejarError(error: any): any {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return { success: false, message: 'Error de conexion con el servidor', tipo: 'Error', data: null };
    }
}

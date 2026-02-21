import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { Mesa } from '../Modelos/mesa.modelo';

@Injectable({
    providedIn: 'root'
})
export class MesaServicio {

    async listarEstado(clasificacionId?: number): Promise<RespuestaAPI<Mesa[]>> {
        const url = clasificacionId ? `/mesa/listado/estado?CodigoClasificacionMesa=${clasificacionId}` : '/mesa/listado/estado';
        const res = await axiosInstance.get(url);
        return res.data;
    }

    async obtenerComanda(codigoMesa: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get(`/mesa/comanda/${codigoMesa}`);
        return res.data;
    }

    async combinarMesas(datos: { CodigoMesaOrigen: number, MesasAgregar: number[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/mesa/combinarmesas', datos);
        return res.data;
    }

    async moverPedido(datos: { CodigoMesaOrigen: number, CodigoMesaDestino: number }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/mesa/moverpedido', datos);
        return res.data;
    }

    async eliminarPedido(codigoMesa: number): Promise<RespuestaAPI<any>> {
        // Enviar CodigoMesa en el body con delete
        const res = await axiosInstance.delete('/mesa/eliminar', { data: { CodigoMesa: codigoMesa } });
        return res.data;
    }

    async agregarCliente(datos: { CodigoMesa: number, CodigoCliente: number, Nota: string }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/mesa/agregarcliente', datos);
        return res.data;
    }
}

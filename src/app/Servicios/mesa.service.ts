import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { Mesa } from '../Modelos/mesa.modelo';

@Injectable({
    providedIn: 'root'
})
export class MesaServicio {

    async listarEstado(clasificacionId?: number): Promise<RespuestaAPI<Mesa[]>> {
        // El controlador del API lee el query param como CodigoClasificacion
        // Módulo Venta en Mesa (permisos): prefijo ventamesa/
        const url = clasificacionId ? `/ventamesa/mesa-listado/estado?CodigoClasificacion=${clasificacionId}` : '/ventamesa/mesa-listado/estado';
        const res = await axiosInstance.get(url);
        return res.data;
    }

    async obtenerComanda(codigoMesa: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get(`/ventamesa/mesa-comanda/${codigoMesa}`);
        return res.data;
    }

    async combinarMesas(datos: { CodigoMesaOrigen: number, MesasAgregar: number[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/ventamesa/mesa-combinarmesas', datos);
        return res.data;
    }

    async moverPedido(datos: { CodigoMesaOrigen: number, CodigoMesaDestino: number }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/ventamesa/mesa-moverpedido', datos);
        return res.data;
    }

    async eliminarPedido(codigoMesa: number): Promise<RespuestaAPI<any>> {
        // El API expone eliminar-mesa como POST (no DELETE)
        const res = await axiosInstance.post('/ventamesa/mesa-eliminar-mesa', { CodigoMesa: codigoMesa });
        return res.data;
    }

    async agregarCliente(datos: { CodigoMesa: number, CodigoCliente: number, Nota: string }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/ventamesa/mesa-agregarcliente', datos);
        return res.data;
    }
}

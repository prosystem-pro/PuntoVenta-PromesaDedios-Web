import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import {
    PedidoProduccion,
    PedidoProduccionDetalle,
    ProduccionInsumo,
    DetalleAbastecimiento,
    ConsumoInsumoRequest
} from '../Modelos/produccion.modelo';

@Injectable({
    providedIn: 'root'
})
export class ProduccionServicio {

    async listarPedidos(): Promise<RespuestaAPI<PedidoProduccion[]>> {
        const res = await axiosInstance.get('/produccion/listado');
        return res.data;
    }

    async crearPedido(datos: any): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/produccion/crearpedido', datos);
        return res.data;
    }

    async iniciarProduccion(id: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put(`/produccion/iniciarproduccion/${id}`);
        return res.data;
    }

    async iniciarProduccionMasiva(): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put('/produccion/iniciarproduccionmasiva');
        return res.data;
    }

    async obtenerDetallePedido(id: number): Promise<RespuestaAPI<PedidoProduccionDetalle[]>> {
        const res = await axiosInstance.get(`/produccion/listadopedidodetalle/${id}`);
        return res.data;
    }

    async abastecerPedido(datos: { CodigoPedidoProduccion: number, Detalle: DetalleAbastecimiento[], Estatus: boolean }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put('/produccion/abastecerpedido', datos);
        return res.data;
    }

    async listarInsumosProduccion(id: number): Promise<RespuestaAPI<ProduccionInsumo[]>> {
        const res = await axiosInstance.get(`/produccion/listadoinsumos/${id}`);
        return res.data;
    }

    async registrarConsumoInsumos(datos: { CodigoProduccion: number, Insumos: ConsumoInsumoRequest[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/produccion/registrarconsumoinsumos', datos);
        return res.data;
    }

    async listarProductosProduccion(): Promise<RespuestaAPI<any[]>> {
        const res = await axiosInstance.get('/produccion/listado/producto');
        return res.data;
    }
}

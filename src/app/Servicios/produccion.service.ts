import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import {
    PedidoProduccion,
    PedidoProduccionDetalle,
    DetalleAbastecimiento
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

    async listarProductosProduccion(): Promise<RespuestaAPI<any[]>> {
        const res = await axiosInstance.get('/produccion/listado/producto');
        return res.data;
    }

    async obtenerInsumosPedido(id: number): Promise<RespuestaAPI<any[]>> {
        const res = await axiosInstance.get(`/produccion/listadoinsumos/${id}`);
        return res.data;
    }

    async registrarConsumoInsumos(datos: { CodigoProduccion: number, Insumos: any[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/produccion/registrarconsumoinsumos', datos);
        return res.data;
    }

    // --- Endpoints Masivos ---

    async obtenerListadoPedidosTodos(): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get('/produccion/listado/pedidostodos');
        return res.data;
    }

    async obtenerListadoInsumosTodos(): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get('/produccion/listadoinsumostodasproducciones');
        return res.data;
    }

    async abastecerPedidoMasivo(datos: { Detalle: any[], Estatus: boolean }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/produccion/abastecerpedidomasivo', datos);
        return res.data;
    }

    async abastecerInsumosMasivo(datos: { Detalle: any[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/produccion/abastecerinsumosmasivo', datos);
        return res.data;
    }
}

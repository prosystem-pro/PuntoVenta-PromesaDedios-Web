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

    // TC-811: el rango (fecha de entrega) acota qué pedidos entran al masivo. Si no se
    // pasa, el API toma todos (comportamiento anterior). El filtro real lo aplica el API.
    async iniciarProduccionMasiva(fechaInicio?: string | null, fechaFin?: string | null): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put('/produccion/iniciarproduccionmasiva', { fechaInicio, fechaFin });
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
        const res = await axiosInstance.get('/produccion/listado/productostockminimo');
        return res.data;
    }

    async listarProductosProduccionGlobal(): Promise<RespuestaAPI<any[]>> {
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

    // TC-811: acota el listado masivo por rango de fecha de entrega (filtro en el API).
    async obtenerListadoPedidosTodos(fechaInicio?: string | null, fechaFin?: string | null): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get('/produccion/listado/pedidostodos', {
            params: { fechaInicio: fechaInicio || undefined, fechaFin: fechaFin || undefined }
        });
        return res.data;
    }

    async obtenerListadoInsumosTodos(): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get('/produccion/listadoinsumostodasproducciones');
        return res.data;
    }

    // TC-811: fechaInicio/fechaFin acotan qué pedidos reciben el abastecimiento masivo.
    async abastecerPedidoMasivo(datos: { Detalle: any[], Estatus: boolean, fechaInicio?: string | null, fechaFin?: string | null }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/produccion/abastecerpedidomasivo', datos);
        return res.data;
    }

    async abastecerInsumosMasivo(datos: { Detalle: any[], fechaInicio?: string | null, fechaFin?: string | null }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/produccion/abastecerinsumosmasivo', datos);
        return res.data;
    }
}

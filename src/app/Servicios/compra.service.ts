import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { Compra, CompraDetalleCompleto } from '../Modelos/compra.modelo';
import { RespuestaAPI } from '../Modelos/producto.modelo';

@Injectable({
    providedIn: 'root'
})
export class CompraServicio {

    constructor() { }

    async listarProveedores(): Promise<RespuestaAPI<any[]>> {
        const res = await axiosInstance.get('compra/proveedores');
        return res.data;
    }

    async listarProductosCompra(): Promise<RespuestaAPI<any[]>> {
        const res = await axiosInstance.get('compra/productos');
        return res.data;
    }

    async obtenerProductoCompra(id: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get(`compra/producto/${id}`);
        return res.data;
    }

    async listar(fechaInicio?: string, fechaFin?: string): Promise<RespuestaAPI<Compra[]>> {
        const body: { fechaInicio?: string; fechaFin?: string } = {};
        if (fechaInicio && fechaFin) {
            body.fechaInicio = fechaInicio;
            body.fechaFin = fechaFin;
        }
        const res = await axiosInstance.post('compra/listado', body);
        return res.data;
    }

    async obtenerDetalle(CodigoCompra: number): Promise<RespuestaAPI<CompraDetalleCompleto>> {
        const res = await axiosInstance.get(`compra/detalle/${CodigoCompra}`);
        return res.data;
    }

    async guardar(datos: any): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('compra', datos);
        return res.data;
    }

    async registrarAbono(datos: any): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('compra/abonar', datos);
        return res.data;
    }

    async eliminarPago(id: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.delete(`compra/eliminarpago/${id}`);
        return res.data;
    }

    async obtenerFacturaAbono(codigoPagoProveedor: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get(`compra/factura-abono/${codigoPagoProveedor}`);
        return res.data;
    }

    // Anula la compra completa (incluye sus pagos y ajusta inventario/caja/saldo).
    async anularCompra(CodigoCompra: number, MotivoAnulacion: string): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('compra/anular', { CodigoCompra, MotivoAnulacion });
        return res.data;
    }

    // Anula (soft-delete contable) un pago de proveedor: deja motivo, revierte caja y recalcula saldo.
    async anularPago(CodigoPagoProveedor: number, MotivoAnulacion: string): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('compra/anular-pago', { CodigoPagoProveedor, MotivoAnulacion });
        return res.data;
    }
}

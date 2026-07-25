import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { VentaHistorial } from '../Modelos/historial-venta.modelo';
import { ComprobanteVenta } from '../Modelos/venta.modelo';

@Injectable({
    providedIn: 'root'
})
export class HistorialVentaServicio {

    // Listado de ventas al contado (mesa/ventanilla) por rango de fechas.
    // El API exige ambas fechas (YYYY-MM-DD) y responde 404 cuando no hay ventas.
    async listar(fechaInicio: string, fechaFin: string): Promise<RespuestaAPI<VentaHistorial[]>> {
        const res = await axiosInstance.get('historialventa/listado-ventas-contado', {
            params: { fechaInicio, fechaFin }
        });
        return res.data;
    }

    // Comprobante de una venta (misma forma que el modal de comprobante de venta).
    async obtenerFactura(codigoVenta: number): Promise<RespuestaAPI<ComprobanteVenta>> {
        const res = await axiosInstance.get(`historialventa/factura/${codigoVenta}`);
        return res.data;
    }

    // Anula una venta al contado (contado o mesa) con motivo.
    async anularVenta(codigoVenta: number, motivoAnulacion: string): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('historialventa/anular-ventapedido-completa', {
            CodigoVenta: codigoVenta,
            MotivoAnulacion: motivoAnulacion
        });
        return res.data;
    }
}

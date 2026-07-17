import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { EstadoPedido, DetallePedido, PagoPedido, AbonoRequest, AbonoResponse, EstadoPagoCliente, ComprobantePago, DetalleProductoPedido } from '../Modelos/estado-pedido.modelo';

@Injectable({
    providedIn: 'root'
})
export class EstadoPedidoServicio {

    constructor() { }

    // El API filtra del lado del servidor por FechaCreacion del pedido y EXIGE el rango
    // (fechaInicio/fechaFin en formato YYYY-MM-DD). Si no hay pedidos responde 404,
    // lo maneja el componente como lista vacía.
    async listar(fechaInicio: string, fechaFin: string): Promise<RespuestaAPI<EstadoPedido[]>> {
        const res = await axiosInstance.get('estadopedido/listado', {
            params: { fechaInicio, fechaFin }
        });
        return res.data;
    }

    // Detalle del pedido (cabecera del modal de abono: cliente, teléfono, saldo, CodigoVenta).
    async obtenerDetalle(codigoPedidoProduccion: number): Promise<RespuestaAPI<DetallePedido>> {
        const res = await axiosInstance.get(`estadopedido/detallepedido/${codigoPedidoProduccion}`);
        return res.data;
    }

    // Abonos ya registrados del pedido. Responde 404 cuando no hay pagos (se trata como lista vacía).
    async listarPagos(codigoVenta: number): Promise<RespuestaAPI<PagoPedido[]>> {
        const res = await axiosInstance.get(`estadopedido/listar-pagos-por-ventas/${codigoVenta}`);
        return res.data;
    }

    // Registra un abono al pedido.
    async registrarAbono(datos: AbonoRequest): Promise<RespuestaAPI<AbonoResponse>> {
        const res = await axiosInstance.post('estadopedido/registrar-abono', datos);
        return res.data;
    }

    // Listado "Pagos de clientes". Filtra server-side por FechaCreacion; exige el rango
    // (YYYY-MM-DD). Responde 404 cuando no hay registros (se trata como lista vacía).
    async listarPagosCliente(fechaInicio: string, fechaFin: string): Promise<RespuestaAPI<EstadoPagoCliente[]>> {
        const res = await axiosInstance.get('estadopedido/listado-estado-pago-cliente', {
            params: { fechaInicio, fechaFin }
        });
        return res.data;
    }

    // Elimina un abono (solo super admin; el API valida el rol vía token).
    async eliminarPago(codigoPagoVenta: number): Promise<RespuestaAPI<null>> {
        const res = await axiosInstance.delete(`estadopedido/eliminar-pago/${codigoPagoVenta}`);
        return res.data;
    }

    // Marca el pedido como entregado/facturado (solo super admin; el API valida el rol).
    async entregarPedido(codigoPedidoProduccion: number): Promise<RespuestaAPI<null>> {
        const res = await axiosInstance.put(`estadopedido/entregar-pedido/${codigoPedidoProduccion}`, {});
        return res.data;
    }

    // Datos para imprimir el comprobante de un abono/pago.
    async impresionPago(codigoPagoVenta: number): Promise<RespuestaAPI<ComprobantePago>> {
        const res = await axiosInstance.get(`estadopedido/impresion-pago/${codigoPagoVenta}`);
        return res.data;
    }

    // Anula la venta/pedido completo de ventanilla (devuelve inventario, anula pagos y producción).
    async anularVentaPedido(CodigoVenta: number, MotivoAnulacion: string): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('venta/anular-ventapedido-completa', { CodigoVenta, MotivoAnulacion });
        return res.data;
    }

    // Elimina un pedido de producción sin venta (solo si está pendiente).
    async eliminarPedido(CodigoPedidoProduccion: number, MotivoEliminacion: string): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('venta/eliminar-pedido', { CodigoPedidoProduccion, MotivoEliminacion });
        return res.data;
    }

    // Anula (soft-delete contable) un pago del pedido: deja motivo, revierte caja y recalcula saldo.
    async anularPago(CodigoPagoVenta: number, MotivoAnulacion: string): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('venta/anular-pago', { CodigoPagoVenta, MotivoAnulacion });
        return res.data;
    }

    // Contenido de un pedido: productos con cantidad solicitada y stock actual/sugerido.
    async obtenerDetalleProductos(codigoPedidoProduccion: number): Promise<RespuestaAPI<DetalleProductoPedido[]>> {
        const res = await axiosInstance.get(`estadopedido/detalle-productos/${codigoPedidoProduccion}`);
        return res.data;
    }
}

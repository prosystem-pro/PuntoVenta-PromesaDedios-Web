import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { EstadoPedido, DetallePedido, PagoPedido, AbonoRequest, AbonoResponse } from '../Modelos/estado-pedido.modelo';

@Injectable({
    providedIn: 'root'
})
export class EstadoPedidoServicio {

    constructor() { }

    // El API no soporta filtros (fecha/búsqueda/paginación); devuelve todo el listado.
    // Si no hay pedidos responde 404, lo maneja el componente como lista vacía.
    async listar(): Promise<RespuestaAPI<EstadoPedido[]>> {
        const res = await axiosInstance.get('estadopedido/listado');
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
}

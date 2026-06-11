import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { EstadoPedido } from '../Modelos/estado-pedido.modelo';

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
}

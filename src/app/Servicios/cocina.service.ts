import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { CocinaPedido } from '../Modelos/cocina.modelo';

@Injectable({
    providedIn: 'root'
})
export class CocinaServicio {

    // Lista los pedidos de cocina pendientes. Responde 404 cuando no hay ninguno.
    async listar(): Promise<RespuestaAPI<CocinaPedido[]>> {
        const res = await axiosInstance.get('/venta/cocinalistado');
        return res.data;
    }

    // Marca un pedido de cocina como atendido (entregado).
    // NOTA: el descuento de insumos de receta del inventario debe hacerlo el API
    // dentro de este endpoint (hoy solo cambia el estatus).
    async entregar(codigoCocinaPedido: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/venta/cocinaentregar', { CodigoCocinaPedido: codigoCocinaPedido });
        return res.data;
    }
}

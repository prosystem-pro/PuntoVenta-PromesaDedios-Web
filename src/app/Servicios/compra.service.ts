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
        const res = await axiosInstance.get('/compra/proveedores');
        return res.data;
    }

    async listarProductosCompra(): Promise<RespuestaAPI<any[]>> {
        const res = await axiosInstance.get('/compra/productos');
        return res.data;
    }

    async obtenerProductoCompra(id: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get(`/compra/producto/${id}`);
        return res.data;
    }

    async listar(filtros?: any): Promise<RespuestaAPI<Compra[]>> {
        const res = await axiosInstance.get('/compra');
        return res.data;
    }

    async obtenerDetalle(id: number): Promise<RespuestaAPI<CompraDetalleCompleto>> {
        const res = await axiosInstance.get(`/compra/detalle/${id}`);
        return res.data;
    }

    async guardar(datos: any): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/compra', datos);
        return res.data;
    }

    async registrarAbono(datos: any): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/compra/abono', datos);
        return res.data;
    }
}

import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { GuardarProductosMesaRequest, FacturarMesaRequest, FacturarVentanillaRequest, CrearVentaPedidoRequest } from '../Modelos/venta.modelo';

@Injectable({
    providedIn: 'root'
})
export class VentaServicio {

    async guardarProductosMesa(datos: GuardarProductosMesaRequest): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/ventamesa/venta-guardarproductosmesa', datos);
        return res.data;
    }

    async facturarMesa(datos: FacturarMesaRequest): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/ventamesa/venta-mesa/facturar', datos);
        return res.data;
    }

    async facturarVentanilla(datos: FacturarVentanillaRequest): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/facturar/venta-ventanilla/facturar', datos);
        return res.data;
    }

    async crearVentaPedido(datos: CrearVentaPedidoRequest): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/facturar/venta-pedido/crear', datos);
        return res.data;
    }
}

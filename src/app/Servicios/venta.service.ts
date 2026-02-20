import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { GuardarProductosMesaRequest, FacturarMesaRequest } from '../Modelos/venta.modelo';

@Injectable({
    providedIn: 'root'
})
export class VentaServicio {

    async guardarProductosMesa(datos: GuardarProductosMesaRequest): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/venta/guardarproductosmesa', datos);
        return res.data;
    }

    async facturarMesa(datos: FacturarMesaRequest): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/venta/mesa/facturar', datos);
        return res.data;
    }
}

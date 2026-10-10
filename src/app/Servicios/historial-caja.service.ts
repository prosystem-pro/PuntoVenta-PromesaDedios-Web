import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { CierreCajaHistorial, DetalleCierreHistorial } from '../Modelos/historial-caja.modelo';

/**
 * Historial de cierre de caja (pantalla nueva, pedido de Walter).
 *
 * Endpoints del API (Roberto, ya en producción):
 *  - Listado:  GET  caja/historial-cierres?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
 *              -> RespuestaAPI<CierreCajaHistorial[]>  (orden DESC por fecha de cierre;
 *                 paginado del lado del cliente). Incluye FechaApertura y FechaCierre.
 *  - Detalle:  GET  caja/detalle-cierre/:CodigoAperturaCaja
 *              -> RespuestaAPI<DetalleCierreHistorial>
 *
 * Permisos backend requeridos: recurso 'Caja' con acciones 'HistorialCierres' y 'DetalleCierre'.
 */
@Injectable({ providedIn: 'root' })
export class HistorialCajaServicio {

    // GET caja/historial-cierres?fechaInicio=&fechaFin=
    async listar(fechaInicio: string, fechaFin: string): Promise<RespuestaAPI<CierreCajaHistorial[]>> {
        const res = await axiosInstance.get('caja/historial-cierres', { params: { fechaInicio, fechaFin } });
        return res.data;
    }

    // GET caja/detalle-cierre/:CodigoAperturaCaja
    async obtenerDetalle(codigoAperturaCaja: number): Promise<RespuestaAPI<DetalleCierreHistorial>> {
        const res = await axiosInstance.get(`caja/detalle-cierre/${codigoAperturaCaja}`);
        return res.data;
    }
}

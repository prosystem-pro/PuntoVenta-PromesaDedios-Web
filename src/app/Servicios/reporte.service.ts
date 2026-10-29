import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { ConsolidadoReporte, ConsolidadoDia, TipoReporte } from '../Modelos/reporte.modelo';

@Injectable({
    providedIn: 'root'
})
export class ReporteServicio {

    // Consolidado del mes (tarjetas, rankings y series mensual/anual) según el Tipo.
    // El API arma todo en una sola llamada.
    async obtenerConsolidado(tipo: TipoReporte, anio: number, mes: number, codigoApertura?: number | null): Promise<RespuestaAPI<ConsolidadoReporte>> {
        const params: any = { Tipo: tipo, Anio: anio, Mes: mes };
        if (codigoApertura) params.CodigoAperturaCaja = codigoApertura;
        const res = await axiosInstance.get('reporte/consolidado-mes', { params });
        return res.data;
    }

    // Consolidado del día (7 totales del día de hoy). No recibe parámetros.
    async obtenerConsolidadoDia(): Promise<RespuestaAPI<ConsolidadoDia>> {
        const res = await axiosInstance.get('reporte/consolidado-dia');
        return res.data;
    }
}

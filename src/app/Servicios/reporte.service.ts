import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { ConsolidadoReporte, ConsolidadoDia, TipoReporte, TurnoReporte } from '../Modelos/reporte.modelo';

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

    // Consolidado del día (7 totales del día de hoy). Acepta filtro por turno.
    async obtenerConsolidadoDia(codigoApertura?: number | null): Promise<RespuestaAPI<ConsolidadoDia>> {
        const params: any = {};
        if (codigoApertura) params.CodigoAperturaCaja = codigoApertura;
        const res = await axiosInstance.get('reporte/consolidado-dia', { params });
        return res.data;
    }

    // Turnos por fecha (día/mes/año) para poblar el selector de turnos.
    async listarTurnos(anio: number, mes: number, dia?: number): Promise<RespuestaAPI<TurnoReporte[]>> {
        const params: any = { Anio: anio, Mes: mes };
        if (dia) params.Dia = dia;
        const res = await axiosInstance.get('reporte/listar-turnos', { params });
        return res.data;
    }
}

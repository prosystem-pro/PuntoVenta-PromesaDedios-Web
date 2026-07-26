import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { ConsolidadoReporte, TipoReporte } from '../Modelos/reporte.modelo';

@Injectable({
    providedIn: 'root'
})
export class ReporteServicio {

    // Consolidado del mes (tarjetas, rankings y series mensual/anual) según el Tipo.
    // El API arma todo en una sola llamada.
    async obtenerConsolidado(tipo: TipoReporte, anio: number, mes: number): Promise<RespuestaAPI<ConsolidadoReporte>> {
        const res = await axiosInstance.get('reporte/consolidado-mes', {
            params: { Tipo: tipo, Anio: anio, Mes: mes }
        });
        return res.data;
    }
}

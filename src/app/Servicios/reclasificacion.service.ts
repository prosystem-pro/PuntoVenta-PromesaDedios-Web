import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { DatosReclasificacion, GuardarReclasificacionPayload } from '../Modelos/reclasificacion.modelo';

/**
 * Reclasificación de turno (API Roberto, commit b586beb).
 *  - GET  caja/reclasificacion/:CodigoAperturaCaja  -> Sistema + Declarado por método.
 *  - POST caja/guardar-reclasificacion              -> totales Declarados (CodigoUsuario lo pone el token).
 *
 * NOTA: el guardar exige EtapaCierre=2 en el API, y hoy no hay forma de llegar a esa
 * etapa (gap reportado a Roberto) -> la carga funciona, el guardar aún no punta a punta.
 */
@Injectable({ providedIn: 'root' })
export class ReclasificacionServicio {

    async obtenerDatos(codigoAperturaCaja: number): Promise<RespuestaAPI<DatosReclasificacion>> {
        const res = await axiosInstance.get(`caja/reclasificacion/${codigoAperturaCaja}`);
        return res.data;
    }

    async guardar(payload: GuardarReclasificacionPayload): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('caja/guardar-reclasificacion', payload);
        return res.data;
    }
}

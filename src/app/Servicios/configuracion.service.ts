import { Injectable } from '@angular/core';
import api from './axios.config';
import { Empresa } from '../Modelos/empresa.modelo';
import { Mesa } from '../Modelos/mesa.modelo';
import { ClasificacionMesa } from '../Modelos/clasificacion-mesa.modelo';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { EstadoCaja, AperturaCajaPayload, AperturaCajaResultado, DatosCaja, CierreCajaPayload, CierreCajaResultado } from '../Modelos/caja.modelo';

@Injectable({
    providedIn: 'root'
})
export class ServicioConfiguracion {

    constructor() { }

    // --- EMPRESA ---
    async obtenerEmpresas(): Promise<RespuestaAPI<Empresa[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<Empresa[]>>('empresa/listado');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async actualizarEmpresa(id: number, empresa: Partial<Empresa>): Promise<RespuestaAPI<Empresa>> {
        try {
            const respuesta = await api.put<RespuestaAPI<Empresa>>(`empresa/editar/${id}`, empresa);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // --- MESAS ---
    async obtenerMesas(): Promise<RespuestaAPI<any[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<any[]>>('mesa/listado/porclasificacion');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearMesa(mesa: any): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.post<RespuestaAPI<any>>('mesa/crearcorrelativo', mesa);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarMesa(mesa: any): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.put<RespuestaAPI<any>>(`mesa/correlativos/editar`, mesa);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarMesa(datos: any): Promise<RespuestaAPI<any>> {
        try {
            // El API espera CodigoClasificacionMesa y Apodo en el body para eliminar correlativos
            const respuesta = await api.delete<RespuestaAPI<any>>(`mesa/correlativos/eliminar`, { data: datos });
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // --- CLASIFICACION MESAS ---
    async obtenerClasificaciones(): Promise<RespuestaAPI<ClasificacionMesa[]>> {
        try {
            const respuesta = await api.get<RespuestaAPI<ClasificacionMesa[]>>('clasificacionmesa/listado');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearClasificacion(clasificacion: Partial<ClasificacionMesa>): Promise<RespuestaAPI<ClasificacionMesa>> {
        try {
            const respuesta = await api.post<RespuestaAPI<ClasificacionMesa>>('clasificacionmesa/crear', clasificacion);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarClasificacion(id: number, clasificacion: Partial<ClasificacionMesa>): Promise<RespuestaAPI<ClasificacionMesa>> {
        try {
            const respuesta = await api.put<RespuestaAPI<ClasificacionMesa>>(`clasificacionmesa/editar/${id}`, clasificacion);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarClasificacion(id: number): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.delete<RespuestaAPI<any>>(`clasificacionmesa/eliminar/${id}`);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // --- CAJA ---
    async obtenerCajaActual(): Promise<RespuestaAPI<EstadoCaja>> {
        try {
            const respuesta = await api.get<RespuestaAPI<EstadoCaja>>('caja/actual');
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // Datos de caja. Si NO hay caja abierta trae caja/turno/denominaciones (para la apertura);
    // si hay caja abierta trae la apertura + resúmenes + movimientos. El rango de fechas es
    // opcional: sin fechas filtra por la apertura activa; con fechas filtra por rango.
    async obtenerDatosInicialesCaja(fechaInicio?: string, fechaFin?: string): Promise<RespuestaAPI<DatosCaja>> {
        try {
            const params = (fechaInicio && fechaFin) ? { fechaInicio, fechaFin } : undefined;
            const respuesta = await api.get<RespuestaAPI<DatosCaja>>('caja/obtener-datos-iniciales', { params });
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async abrirCaja(payload: AperturaCajaPayload): Promise<RespuestaAPI<AperturaCajaResultado>> {
        try {
            const respuesta = await api.post<RespuestaAPI<AperturaCajaResultado>>('caja/abrir-caja', payload);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async cerrarCaja(payload: CierreCajaPayload): Promise<RespuestaAPI<CierreCajaResultado>> {
        try {
            const respuesta = await api.post<RespuestaAPI<CierreCajaResultado>>('caja/cerrar-caja', payload);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    // Documento de un movimiento de caja (para la lupa "ver documento").
    // El API resuelve el documento según el origen del movimiento y devuelve DISTINTAS formas:
    //   VENTA -> factura de venta (ComprobanteVenta) | COMPRA_CONTADO -> factura de compra (FacturaCompra)
    //   ABONO_COMPRA_CREDITO -> recibo de abono a proveedor | ABONO_PEDIDO -> recibo de pago (ComprobantePago)
    // Por eso el tipo es genérico; el componente ramifica por TipoOperacion y elige el modal.
    async obtenerDocumentoMovimiento(codigoMovimiento: number): Promise<RespuestaAPI<any>> {
        try {
            const respuesta = await api.get<RespuestaAPI<any>>(`caja/documento-movimiento/${codigoMovimiento}`);
            return respuesta.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    private manejarError(error: any): any {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return {
            success: false,
            message: 'Error de conexion con el servidor',
            tipo: 'Error',
            data: null
        };
    }
}
